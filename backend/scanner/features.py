"""URL feature extraction. Domain-normalized and balanced for accurate phishing detection."""
import ipaddress
import re
from urllib.parse import urlparse

SUSPICIOUS_KEYWORDS = [
    "login", "signin", "verify", "secure", "account", "update", "bank",
    "confirm", "password", "wallet", "free", "win", "bonus", "gift", "paypal",
]
SUSPICIOUS_TLDS = {"tk", "ml", "ga", "cf", "gq", "xyz", "top", "shop", "click", "work", "zip"}
SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "ow.ly", "cutt.ly"}
KNOWN_SECOND_LEVEL_DOMAINS = {"co", "com", "org", "gov", "edu", "net", "ac"}


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


def extract_features(url: str) -> dict:
    p = urlparse(url)
    raw_host = (p.hostname or "").lower()
    host = clean_host(raw_host)
    full = url.lower()
    tld = host.rsplit(".", 1)[-1] if "." in host else ""
    is_ip = _is_ip(raw_host)

    return {
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
