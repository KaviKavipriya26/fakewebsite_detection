"""Online Transaction Fraud Detection Module.

NOTE: This evaluation uses a RULE-BASED HEURISTIC SCORER because public/college
banking transaction datasets are proprietary and unavailable. Every assessment
is clearly labeled as rule-based.
"""
import uuid


HIGH_RISK_CATEGORIES = {
    "crypto", "cryptocurrency", "gambling", "casino", "wire transfer",
    "gift cards", "prepaid cards", "luxury goods", "forex"
}

IRREVERSIBLE_PAYMENT_METHODS = {"crypto", "cryptocurrency", "wire transfer", "prepaid card"}


def evaluate_transaction(data: dict) -> dict:
    """Evaluate online transaction risk using deterministic heuristic security rules.
    
    Returns risk score (0-100), risk level (Low, Medium, High),
    list of triggered rules, and clear labeling that this is rule-based.
    """
    score = 0
    triggered_rules = []

    try:
        amount = float(data.get("amount", 0.0))
    except (ValueError, TypeError):
        amount = 0.0

    payment_method = str(data.get("payment_method", "")).strip().lower()
    merchant_category = str(data.get("merchant_category", "")).strip().lower()
    merchant_name = str(data.get("merchant_name", "")).strip()
    card_country = str(data.get("card_country", "")).strip().upper()
    billing_country = str(data.get("billing_country", "")).strip().upper()
    is_first_time = bool(data.get("is_first_time_merchant", False))
    is_device_new = bool(data.get("is_device_new", False))

    # Rule 1: High Transaction Value
    if amount >= 5000:
        score += 30
        triggered_rules.append("High-value transaction exceeds standard consumer velocity (> $5,000 / ₹4,00,000)")
    elif amount >= 1500:
        score += 20
        triggered_rules.append("Elevated transaction value requires additional verification (> $1,500 / ₹1,20,000)")

    # Rule 2: Country Mismatch
    if card_country and billing_country and card_country != billing_country:
        score += 25
        triggered_rules.append(f"Cross-border mismatch: Card country ({card_country}) != Billing country ({billing_country})")

    # Rule 3: High-Risk Merchant Category
    if any(h in merchant_category for h in HIGH_RISK_CATEGORIES):
        score += 25
        triggered_rules.append(f"High-risk merchant industry category: '{merchant_category.title()}'")

    # Rule 4: Device Anomaly
    if is_device_new:
        score += 15
        triggered_rules.append("Session initiated from an unverified or newly bound user hardware device")

    # Rule 5: First-Time Merchant Interaction
    if is_first_time:
        score += 10
        triggered_rules.append("No prior purchase history on record with this merchant")

    # Rule 6: Payment Method Risk
    if any(m in payment_method for m in IRREVERSIBLE_PAYMENT_METHODS):
        score += 15
        triggered_rules.append(f"Irreversible/cash-equivalent payment rail selected: '{payment_method.title()}'")

    risk_score = min(score, 100)

    if risk_score >= 70:
        risk_level = "High Risk"
        recommendation = "Action: Immediate 2FA step-up authentication or manual fraud analyst review."
    elif risk_score >= 35:
        risk_level = "Medium Risk"
        recommendation = "Action: Secondary OTP verification and email alert recommended."
    else:
        risk_level = "Low Risk"
        recommendation = "Action: Transaction within expected safe operational thresholds."

    tx_id = str(data.get("transaction_id", "")).strip() or f"TX-{uuid.uuid4().hex[:10].upper()}"

    return {
        "transaction_id": tx_id,
        "amount": amount,
        "payment_method": data.get("payment_method", ""),
        "merchant_name": merchant_name,
        "merchant_category": data.get("merchant_category", ""),
        "risk_score": risk_score,
        "risk_level": risk_level,
        "triggered_rules": triggered_rules,
        "recommendation": recommendation,
        "evaluation_type": "Rule-Based Heuristic Scorer",
        "methodology_note": (
            "Rule-Based Evaluation: Academic Prototype. Scored using deterministic fraud risk rules "
            "as no public transaction fraud dataset is included."
        ),
    }
