"""Prediction logic for ML-Based Fake Website Detection System.

Module 5 in the PDF pipeline architecture.
Uses trained Random Forest pipeline (`model.pkl`) if present,
with intelligent heuristic fallback and offline-safe domain verification.
Outputs: Legitimate / Suspicious / Fraudulent + risk score (0-100).
"""
from pathlib import Path
from .pipeline.feature_extraction import (
    FEATURE_ORDER,
    extract_features,
    fetch_domain_info,
)
from .pipeline.alerts import generate_alerts, get_safe_browsing_tips

MODEL_PATH = Path(__file__).with_name("model.pkl")

_model = None
if MODEL_PATH.exists():
    try:
        import joblib
        _model = joblib.load(MODEL_PATH)
    except Exception as exc:
        print(f"[scanner] Could not load model.pkl: {exc}")


def _heuristic(f: dict, domain_info: dict | None = None) -> tuple[float, list[str]]:
    score, reasons = 0.0, []
    domain_info = domain_info or {}

    if not f.get("https"):
        score += 25
        reasons.append("Unencrypted connection (No HTTPS)")
    else:
        reasons.append("Uses secure encrypted HTTPS protocol")

    if f.get("has_ip_address"):
        score += 30
        reasons.append("Numerical IP address used in place of branded domain")

    if f.get("has_at_symbol"):
        score += 20
        reasons.append("Contains '@' symbol (often used for URL destination obfuscation)")

    if f.get("url_length", 0) > 75:
        score += 10
        reasons.append(f"Abnormally long URL length ({f['url_length']} characters)")

    if f.get("hyphens_in_domain", 0) >= 2:
        score += 15
        reasons.append(f"Multiple hyphens in domain name ({f['hyphens_in_domain']})")

    if f.get("subdomain_count", 0) >= 2:
        score += 15
        reasons.append("Multiple nested subdomains detected")

    if f.get("digits_in_host", 0) >= 4:
        score += 10
        reasons.append("High digit count in domain host name")

    if f.get("suspicious_keywords_in_host", 0) > 0:
        score += 20
        reasons.append("Brand impersonation or security keyword embedded in domain")
    elif f.get("suspicious_keywords", 0) > 0:
        score += min(f["suspicious_keywords"] * 8, 20)
        reasons.append(f"Suspicious phishing keywords found ({f['suspicious_keywords']})")

    if f.get("suspicious_tld"):
        score += 15
        reasons.append("High-abuse / risky Top-Level Domain (TLD)")

    if f.get("is_shortener"):
        score += 15
        reasons.append("Known URL shortener service concealing target destination")

    if f.get("special_chars", 0) >= 5:
        score += 8
        reasons.append("High count of URL special/encoded characters")

    # Offline safety rule for domain age:
    # Only penalize if confirmed newly registered (< 30 days). Never penalize if unknown/offline!
    age = domain_info.get("domain_age_days")
    if isinstance(age, (int, float)) and age is not None:
        if age < 30:
            score += 20
            reasons.append(f"Very newly registered domain ({age} days old)")
        elif age > 365:
            score = max(0.0, score - 10)
            reasons.append(f"Established domain age ({age} days)")

    # Offline safety for redirects:
    redirects = domain_info.get("redirect_count", 0)
    if isinstance(redirects, int) and redirects > 2:
        score += 15
        reasons.append(f"Multiple HTTP redirect hops detected ({redirects})")

    return min(score, 100.0), reasons


def predict(url: str, check_network: bool = True) -> dict:
    """Classify a website URL and compute risk score.
    
    Returns:
      url: target URL
      prediction: 'Legitimate', 'Suspicious', or 'Fraudulent'
      risk_score: 0 to 100
      features: 14 URL features plus extended domain attributes
      reasons: explanatory risk indicators
      domain_info: WHOIS/DNS/redirect metadata (offline safe)
      alerts: generated security alert objects
      safe_browsing_tips: mitigation advice
    """
    clean_u = url.strip()
    features = extract_features(clean_u)

    # Perform offline-safe network lookup
    domain_info = fetch_domain_info(clean_u) if check_network else {
        "domain_age_days": None,
        "dns_resolved": "unknown",
        "redirect_count": 0,
        "network_available": False,
    }

    # Extend features dictionary for frontend view
    features["domain_age_days"] = domain_info.get("domain_age_days")
    features["redirects"] = domain_info.get("redirect_count", 0)

    # ML Inference
    if _model is not None:
        vector = [[float(features[k]) for k in FEATURE_ORDER]]
        try:
            score = float(_model.predict_proba(vector)[0][1]) * 100
        except Exception:
            score = float(_model.predict(vector)[0]) * 100
        _, reasons = _heuristic(features, domain_info)
        model_name = "RandomForestClassifier (model.pkl)"
    else:
        score, reasons = _heuristic(features, domain_info)
        model_name = "Heuristic Rule-Based Engine (Out-of-the-box)"

    score = round(score)
    score = max(0, min(100, score))

    if score >= 75:
        prediction = "Fraudulent"
    elif score >= 40:
        prediction = "Suspicious"
    else:
        prediction = "Legitimate"

    alerts = generate_alerts(clean_u, prediction, score, features, reasons)
    tips = get_safe_browsing_tips(features, score)

    return {
        "url": clean_u,
        "prediction": prediction,
        "risk_score": score,
        "features": features,
        "reasons": reasons,
        "domain_info": domain_info,
        "alerts": alerts,
        "safe_browsing_tips": tips,
        "model_used": model_name,
    }
