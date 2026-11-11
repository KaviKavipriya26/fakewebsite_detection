"""Module 5a: Security Alerts

Generates automatic warnings and contextual safe-browsing tips
for detected suspicious or fraudulent websites.
"""


def get_safe_browsing_tips(features: dict | None = None, risk_score: int = 0) -> list[str]:
    """Provide tailored security recommendations based on risk score and extracted features."""
    tips = [
        "Never enter banking credentials, passwords, or OTPs on unverified or flagged websites.",
        "Check the address bar closely for lookalike letters (e.g. '0' for 'o', 'rn' for 'm').",
        "Verify suspicious links via official customer service channels or standalone search.",
    ]

    if features:
        if not features.get("https"):
            tips.append("Avoid entering personal data on non-HTTPS sites—traffic is unencrypted.")
        if features.get("has_ip_address"):
            tips.append("Legitimate institutions use branded domain names, never raw IP addresses.")
        if features.get("is_shortener"):
            tips.append("URL shorteners hide the real destination; expand the link before navigating.")
        if features.get("suspicious_tld"):
            tips.append("Free or high-abuse TLDs are frequently used in automated phishing campaigns.")

    if risk_score >= 75:
        tips.insert(0, "DO NOT PROCEED: This domain exhibits strong phishing and fraud signatures.")

    return tips


def generate_alerts(
    url: str,
    prediction: str,
    risk_score: int,
    features: dict | None = None,
    reasons: list[str] | None = None,
) -> list[dict]:
    """Generate structured alerts for websites requiring user attention."""
    features = features or {}
    reasons = reasons or []
    alerts = []
    p_lower = str(prediction).lower()

    if risk_score >= 75 or p_lower in ["fraudulent", "high_risk"]:
        alerts.append({
            "severity": "high",
            "title": "Critical Phishing Alert: Fraudulent Domain Detected",
            "message": (
                f"The website '{url}' has been classified as FRAUDULENT with a risk score of {risk_score}%. "
                f"Immediate security hazard: {'; '.join(reasons[:3]) if reasons else 'High phishing probability'}."
            ),
            "recommendations": get_safe_browsing_tips(features, risk_score),
        })
    elif risk_score >= 40 or p_lower == "suspicious":
        alerts.append({
            "severity": "medium",
            "title": "Security Warning: Suspicious Website Characteristics",
            "message": (
                f"The website '{url}' demonstrates suspicious structural anomalies ({risk_score}% risk). "
                f"Caution advised: {'; '.join(reasons[:2]) if reasons else 'Multiple risk indicators triggered'}."
            ),
            "recommendations": get_safe_browsing_tips(features, risk_score),
        })

    # Specific alert for IP address usage
    if features.get("has_ip_address"):
        alerts.append({
            "severity": "high",
            "title": "Raw IP Address Access Warning",
            "message": f"Website '{url}' uses a bare numerical IP address instead of a domain name.",
            "recommendations": ["Do not log into banking or personal accounts via raw IP links."],
        })

    return alerts
