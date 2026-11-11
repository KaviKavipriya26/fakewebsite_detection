"""Module 3: Feature Extraction

Extracts URL structural, lexical, domain, and network features.
Includes offline safety: if DNS/WHOIS/redirect lookups fail or the system
is offline, the value is treated as 'unknown' and never penalized.
"""
from datetime import datetime, timezone
import ipaddress
import re
import socket
from urllib.parse import urlparse
import requests

try:
    import whois
except ImportError:
    whois = None

SUSPICIOUS_KEYWORDS = [
    "login", "signin", "verify", "secure", "account", "update", "bank",
    "confirm", "password", "wallet", "free", "win", "bonus", "gift", "paypal",
]
SUSPICIOUS_TLDS = {"tk", "ml", "ga", "cf", "gq", "xyz", "top", "shop", "click", "work", "zip"}
SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "ow.ly", "cutt.ly"}
KNOWN_SECOND_LEVEL_DOMAINS = {"co", "com", "org", "gov", "edu", "net", "ac"}

FEATURE_ORDER = [
    "https",
    "domain_length",
    "url_length",
    "hyphens_in_domain",
    "digits_in_host",
    "has_ip_address",
    "has_at_symbol",
    "subdomain_count",
    "suspicious_keywords_in_host",
    "suspicious_keywords",
    "suspicious_tld",
    "is_shortener",
    "has_query",
    "special_chars",
]


def _is_ip(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def clean_host(host: str) -> str:
    """Strip common prefixes like 'www.' so bare and www domains behave identically."""
    return host[4:] if host.startswith("www.") else host


def get_subdomain_count(raw_host: str) -> int:
    """Compute number of subdomains excluding www and standard 2-part ccTLDs."""
    if _is_ip(raw_host):
        return 0
    h = clean_host(raw_host)
    parts = h.split(".")
    if len(parts) <= 2:
        return 0
    if len(parts) >= 3 and parts[-2] in KNOWN_SECOND_LEVEL_DOMAINS and len(parts[-1]) == 2:
        return max(len(parts) - 3, 0)
    return max(len(parts) - 2, 0)


def fetch_domain_info(url: str) -> dict:
    """Fetch WHOIS age, DNS resolution, and redirect chain.
    
    OFFLINE SAFETY:
    If network is disconnected, host lookup fails, or WHOIS times out,
    returns safe 'unknown' statuses without raising errors or penalizing the site.
    """
    p = urlparse(url)
    raw_host = (p.hostname or "").lower()
    host = clean_host(raw_host)

    info = {
        "domain_age_days": None,
        "dns_resolved": "unknown",
        "ip_addresses": [],
        "redirect_count": 0,
        "redirect_status": "unknown",
        "whois_status": "unknown",
        "registrar": "unknown",
        "network_available": False,
    }

    if not host or _is_ip(raw_host):
        return info

    # 1. DNS Lookup (safe timeout: 1.0s)
    default_timeout = socket.getdefaulttimeout()
    try:
        socket.setdefaulttimeout(1.0)
        addr_info = socket.getaddrinfo(host, 80, socket.AF_INET)
        ips = list({res[4][0] for res in addr_info if res and len(res) > 4 and res[4]})
        if ips:
            info["dns_resolved"] = True
            info["ip_addresses"] = ips
            info["network_available"] = True
    except Exception:
        info["dns_resolved"] = "unknown"
    finally:
        socket.setdefaulttimeout(default_timeout)

    # 2. WHOIS Domain Age (safe fallback)
    if whois is not None:
        try:
            socket.setdefaulttimeout(1.5)
            w = whois.whois(host)
            cdate = w.creation_date
            if isinstance(cdate, list) and cdate:
                cdate = cdate[0]
            if isinstance(cdate, datetime):
                if cdate.tzinfo is None:
                    cdate = cdate.replace(tzinfo=timezone.utc)
                now = datetime.now(timezone.utc)
                age_days = max(0, (now - cdate).days)
                info["domain_age_days"] = age_days
                info["whois_status"] = "verified"
                info["network_available"] = True
            if getattr(w, "registrar", None):
                info["registrar"] = str(w.registrar)
        except Exception:
            info["domain_age_days"] = None
            info["whois_status"] = "unknown"
        finally:
            socket.setdefaulttimeout(default_timeout)

    # 3. HTTP Redirect Check (timeout: 1.5s)
    try:
        resp = requests.head(url, timeout=1.5, allow_redirects=True)
        info["redirect_count"] = len(resp.history)
        info["redirect_status"] = f"status_{resp.status_code}"
        info["network_available"] = True
    except Exception:
        info["redirect_count"] = 0
        info["redirect_status"] = "unknown"

    return info


def extract_features(url: str, include_network: bool = False) -> dict:
    """Extract standard 14 URL features plus optional network/domain info."""
    p = urlparse(url)
    raw_host = (p.hostname or "").lower()
    host = clean_host(raw_host)
    full = url.lower()
    tld = host.rsplit(".", 1)[-1] if "." in host else ""
    is_ip = _is_ip(raw_host)

    features = {
        "https": p.scheme == "https",
        "domain_length": len(host),
        "url_length": len(url),
        "hyphens_in_domain": host.count("-"),
        "digits_in_host": sum(c.isdigit() for c in host),
        "has_ip_address": is_ip,
        "has_at_symbol": "@" in url,
        "subdomain_count": get_subdomain_count(raw_host),
        "suspicious_keywords_in_host": sum(k in host for k in SUSPICIOUS_KEYWORDS),
        "suspicious_keywords": sum(k in full for k in SUSPICIOUS_KEYWORDS),
        "suspicious_tld": tld in SUSPICIOUS_TLDS,
        "is_shortener": host in SHORTENERS,
        "has_query": bool(p.query),
        "special_chars": sum(url.count(c) for c in "@-_%=&?#"),
    }

    if include_network:
        domain_info = fetch_domain_info(url)
        features["domain_age_days"] = domain_info["domain_age_days"]
        features["redirects"] = domain_info["redirect_count"]
        features["dns_resolved"] = domain_info["dns_resolved"]

    return features
