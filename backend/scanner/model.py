"""Prediction logic.

If a trained model file `model.pkl` exists next to this file, it is used.
Otherwise a simple rule-based heuristic runs, so the app works out of the box.
"""
from pathlib import Path

from .features import extract_features

MODEL_PATH = Path(__file__).with_name("model.pkl")
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

_model = None
if MODEL_PATH.exists():
    try:
        import joblib
        _model = joblib.load(MODEL_PATH)
    except Exception as exc:  # pragma: no cover
        print(f"[scanner] Could not load model.pkl: {exc}")


def _heuristic(f: dict) -> tuple[float, list[str]]:
    score, reasons = 0.0, []
    if not f["https"]:
        score += 25; reasons.append("No HTTPS")
    else:
        reasons.append("Uses HTTPS")
    if f["has_ip_address"]:
        score += 30; reasons.append("IP address used instead of domain")
    if f["has_at_symbol"]:
        score += 20; reasons.append("Contains '@' symbol")
    if f["url_length"] > 75:
        score += 10; reasons.append("Very long URL")
    if f.get("hyphens_in_domain", 0) >= 2:
        score += 15; reasons.append(f"Multiple hyphens in domain ({f['hyphens_in_domain']})")
    if f["subdomain_count"] >= 2:
        score += 15; reasons.append("Multiple subdomains")
    if f["digits_in_host"] >= 4:
        score += 10; reasons.append("Many digits in domain")
    if f.get("suspicious_keywords_in_host", 0) > 0:
        score += 20; reasons.append("Suspicious brand/action keyword in domain")
    elif f["suspicious_keywords"]:
        score += min(f["suspicious_keywords"] * 8, 20)
        reasons.append(f"Suspicious keywords found ({f['suspicious_keywords']})")
    if f["suspicious_tld"]:
        score += 15; reasons.append("Risky top-level domain")
    if f["is_shortener"]:
        score += 15; reasons.append("URL shortener")
    if f["special_chars"] >= 5:
        score += 8; reasons.append("Many special characters")
    return min(score, 100.0), reasons


def predict(url: str) -> dict:
    features = extract_features(url)

    if _model is not None:
        vector = [[float(features[k]) for k in FEATURE_ORDER]]
        score = float(_model.predict_proba(vector)[0][1]) * 100
        _, reasons = _heuristic(features)
    else:
        score, reasons = _heuristic(features)

    score = round(score)
    if score >= 75:
        label = "high_risk"
    elif score >= 40:
        label = "suspicious"
    else:
        label = "legitimate"

    return {
        "url": url,
        "prediction": label,
        "risk_score": score,
        "features": features,
        "reasons": reasons,
    }
