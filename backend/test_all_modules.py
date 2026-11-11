"""Comprehensive Test Suite for ML-Based Fake Website & Online Fraud Detection System.

Tests all non-Django pipeline modules:
- data_collection
- preprocessing
- feature_extraction (with offline safety check)
- model_building (on temporary synthetic data only, never touching production model.pkl)
- alerts
- reports
- transaction_fraud
- scanner.model (with production model.pkl)
- Django test client on all endpoints:
  - GET /
  - GET /scan/
  - POST /scan/
  - GET /transaction/
  - POST /transaction/
  - GET /dashboard/
  - GET /history/
  - GET /alerts/
  - GET /reports/
  - GET /reports/export-csv/
  - GET /reports/printable/
  - GET /api/health/
  - POST /api/scan/
"""
import os
import sys
import tempfile
from pathlib import Path
import django
import numpy as np
import pandas as pd

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from django.test import Client
from scanner.models import ScanRecord, Alert, TransactionCheck
from scanner.pipeline.data_collection import load_phishing_dataset, export_saved_scans, find_default_dataset
from scanner.pipeline.preprocessing import (
    clean_url,
    remove_duplicate_and_invalid_rows,
    encode_categorical_features,
    create_preprocessor,
)
from scanner.pipeline.feature_extraction import (
    FEATURE_ORDER,
    extract_features,
    fetch_domain_info,
)
from scanner.pipeline.model_building import (
    build_rf_pipeline,
    build_baseline_pipeline,
    evaluate_models,
)
from scanner.pipeline.alerts import generate_alerts, get_safe_browsing_tips
from scanner.pipeline.reports import (
    generate_csv_report_data,
    generate_summary_metrics,
    prepare_printable_report_context,
)
from scanner.transaction_fraud import evaluate_transaction
from scanner.model import predict, MODEL_PATH


def test_preprocessing():
    print("[1/9] Testing Preprocessing Module...")
    # Test clean_url
    assert clean_url("  google.com ") == "http://google.com"
    assert clean_url("https://secure.bank.com") == "https://secure.bank.com"

    # Test duplicate and invalid removal
    test_df = pd.DataFrame({
        "url": [
            "https://google.com",
            "https://google.com",  # duplicate
            "bad",  # too short
            "",  # empty
            None,  # null
            "http://phishing-site.xyz/login",
        ]
    })
    cleaned = remove_duplicate_and_invalid_rows(test_df)
    assert len(cleaned) == 2, f"Expected 2 rows, got {len(cleaned)}"

    # Test categorical encoding
    cat_df = pd.DataFrame({"flag": [True, False, True], "num": [10, 20, 30]})
    encoded = encode_categorical_features(cat_df)
    assert encoded["flag"].tolist() == [1, 0, 1]

    # Test preprocessor pipeline
    prep = create_preprocessor()
    sample_X = np.array([[1.0, 2.0], [np.nan, 4.0], [3.0, 6.0]])
    transformed = prep.fit_transform(sample_X)
    assert transformed.shape == (3, 2)
    assert not np.isnan(transformed).any()
    print("  ✓ Preprocessing module passed.")


def test_feature_extraction_and_offline_safety():
    print("[2/9] Testing Feature Extraction & Offline Safety...")
    # Core 14 features check
    url = "https://www.google.com/search?q=test"
    f = extract_features(url)
    for k in FEATURE_ORDER:
        assert k in f, f"Missing feature: {k}"

    assert f["https"] is True
    assert f["has_query"] is True
    assert f["has_ip_address"] is False
    assert f["domain_length"] > 0
    assert f["url_length"] == len(url)

    # Phishing URL features check
    phish_url = "http://192.168.1.100/secure-bank-login.xyz/verify?token=1@#&free=win"
    f_phish = extract_features(phish_url)
    assert f_phish["https"] is False
    assert f_phish["has_ip_address"] is True
    assert f_phish["has_at_symbol"] is True
    assert f_phish["suspicious_keywords"] > 0
    assert f_phish["special_chars"] > 0

    # Offline safety check: verify fetch_domain_info handles network disconnection safely
    domain_info = fetch_domain_info("https://definitely-nonexistent-domain-12345abc.xyz")
    # Must NOT raise exception; must return dict with safe unknown values
    assert isinstance(domain_info, dict)
    assert "domain_age_days" in domain_info
    assert "dns_resolved" in domain_info
    print("  ✓ Feature extraction & offline safety passed.")


def test_data_collection():
    print("[3/9] Testing Data Collection Module...")
    # Test export_saved_scans
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        exported_file = export_saved_scans(tmp_path)
        assert Path(exported_file).exists()
    finally:
        if Path(tmp_path).exists():
            os.remove(tmp_path)

    # Test loading dataset if present
    default_ds = find_default_dataset()
    if default_ds:
        df = load_phishing_dataset(default_ds, sample_size=50)
        assert len(df) == 50
        assert "url" in df.columns
        assert "label" in df.columns
        assert set(df["label"].unique()).issubset({0, 1})
    print("  ✓ Data collection module passed.")


def test_model_building_synthetic():
    print("[4/9] Testing Model Building Module (Synthetic /tmp Data)...")
    # Generate small synthetic dataset in /tmp only - NEVER touch model.pkl
    np.random.seed(42)
    n_samples = 60
    X_syn = np.random.randn(n_samples, 14)
    y_syn = np.random.choice([0, 1], size=n_samples)

    report = evaluate_models(X_syn[:40], y_syn[:40], X_syn[40:], y_syn[40:])
    assert "baseline_logistic_regression" in report
    assert "random_forest_pipeline" in report
    assert "accuracy" in report["baseline_logistic_regression"]
    assert "accuracy" in report["random_forest_pipeline"]
    assert "classification_report" in report["random_forest_pipeline"]

    # Verify existing model.pkl was NOT touched or overwritten
    assert MODEL_PATH.exists()
    assert MODEL_PATH.stat().st_size > 10_000_000, "Warning: model.pkl seems overwritten!"
    print("  ✓ Model building synthetic evaluation passed (model.pkl intact).")


def test_alerts_and_reports():
    print("[5/9] Testing Alerts & Reports Modules...")
    # Alerts test
    alerts_high = generate_alerts(
        url="http://fake-paypal-verify.tk",
        prediction="Fraudulent",
        risk_score=85,
        features={"https": False, "has_ip_address": True, "suspicious_tld": True},
        reasons=["No HTTPS", "Suspicious TLD", "Raw IP address"],
    )
    assert len(alerts_high) >= 1
    assert alerts_high[0]["severity"] == "high"

    tips = get_safe_browsing_tips({"https": False}, risk_score=80)
    assert len(tips) >= 3

    # Reports test
    class MockScan:
        id = 1
        url = "https://example.com"
        prediction = "Legitimate"
        risk_score = 15
        reasons = ["Uses HTTPS"]
        created_at = None

    csv_data = generate_csv_report_data([MockScan()])
    assert "Scan ID,Website URL" in csv_data
    assert "https://example.com" in csv_data

    metrics = generate_summary_metrics([MockScan()])
    assert metrics["total_scans"] == 1
    assert metrics["legitimate_count"] == 1

    report_context = prepare_printable_report_context([MockScan()])
    assert "report_generated_at" in report_context
    print("  ✓ Alerts & reports modules passed.")


def test_transaction_fraud():
    print("[6/9] Testing Online Transaction Fraud Detection Module...")
    # Safe transaction
    tx_safe = evaluate_transaction({
        "amount": 49.99,
        "payment_method": "Credit Card",
        "merchant_category": "E-Commerce Retail",
        "card_country": "US",
        "billing_country": "US",
        "is_first_time_merchant": False,
        "is_device_new": False,
    })
    assert tx_safe["risk_level"] == "Low Risk"
    assert tx_safe["risk_score"] < 35
    assert "Rule-Based" in tx_safe["evaluation_type"]

    # High risk transaction
    tx_risky = evaluate_transaction({
        "amount": 7500.00,
        "payment_method": "Cryptocurrency",
        "merchant_category": "Crypto Exchange",
        "card_country": "US",
        "billing_country": "RU",
        "is_first_time_merchant": True,
        "is_device_new": True,
    })
    assert tx_risky["risk_level"] == "High Risk"
    assert tx_risky["risk_score"] >= 70
    assert len(tx_risky["triggered_rules"]) >= 4
    print("  ✓ Transaction fraud evaluation passed.")


def test_prediction_with_production_model():
    print("[7/9] Testing Prediction Engine with model.pkl...")
    # Safe site
    res_safe = predict("https://www.google.com")
    assert res_safe["prediction"] in ["Legitimate", "Suspicious"]
    assert res_safe["risk_score"] <= 40
    assert "features" in res_safe
    assert "reasons" in res_safe

    # Obvious phishing URL
    res_phish = predict("http://secure-login-paypal.verify-account.tk/update?id=1@admin")
    assert res_phish["prediction"] in ["Suspicious", "Fraudulent"]
    assert res_phish["risk_score"] >= 50
    assert len(res_phish["reasons"]) > 0
    print("  ✓ Prediction engine with model.pkl passed.")


def test_django_client_endpoints():
    print("[8/9] Testing Django Web UI & REST Endpoints via Test Client...")
    client = Client()

    # 1. Home
    resp = client.get("/")
    assert resp.status_code == 200, f"Home failed: {resp.status_code}"
    assert b"FraudGuard" in resp.content or b"Fake Website" in resp.content

    # 2. Scan Page GET
    resp = client.get("/scan/")
    assert resp.status_code == 200

    # 3. Scan Page POST
    initial_count = ScanRecord.objects.count()
    resp = client.post("/scan/", {"url": "https://www.wikipedia.org"})
    assert resp.status_code == 200
    assert ScanRecord.objects.count() == initial_count + 1
    assert b"wikipedia.org" in resp.content

    # 4. Check Transaction GET & POST
    resp = client.get("/transaction/")
    assert resp.status_code == 200

    tx_count = TransactionCheck.objects.count()
    resp = client.post("/transaction/", {
        "amount": "120.00",
        "payment_method": "Credit Card",
        "merchant_category": "E-Commerce Retail",
        "card_country": "US",
        "billing_country": "US",
    })
    assert resp.status_code == 200
    assert TransactionCheck.objects.count() == tx_count + 1
    assert b"Evaluation Assessment" in resp.content

    # 5. Dashboard
    resp = client.get("/dashboard/")
    assert resp.status_code == 200

    # 6. History
    resp = client.get("/history/")
    assert resp.status_code == 200

    # 7. Alerts
    resp = client.get("/alerts/")
    assert resp.status_code == 200

    # 8. Reports
    resp = client.get("/reports/")
    assert resp.status_code == 200

    # 9. Reports CSV export
    resp = client.get("/reports/export-csv/")
    assert resp.status_code == 200
    assert resp["Content-Type"] == "text/csv"

    # 10. Printable report
    resp = client.get("/reports/printable/")
    assert resp.status_code == 200
    assert b"Forensic Evaluation" in resp.content or b"Audit Summary" in resp.content

    # 11. REST API GET /api/health/
    resp = client.get("/api/health/")
    assert resp.status_code == 200
    assert resp.json().get("status") == "ok"

    # 12. REST API POST /api/scan/
    resp = client.post(
        "/api/scan/",
        data='{"url": "https://github.com"}',
        content_type="application/json",
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "prediction" in data
    assert "risk_score" in data
    assert "features" in data
    assert "reasons" in data
    print("  ✓ All Django views and REST API endpoints passed.")


def test_legacy_frontend_compatibility():
    print("[9/9] Verifying Legacy React Frontend API Compatibility...")
    client = Client()
    resp = client.post(
        "/api/scan/",
        data='{"url": "http://paypal-verification-account-security.servehttp.com/login"}',
        content_type="application/json",
    )
    assert resp.status_code == 200
    data = resp.json()
    # Confirm exact fields consumed by legacy_react_frontend/src/lib/api.ts
    assert "url" in data
    assert "prediction" in data
    assert "risk_score" in data
    assert "features" in data
    assert isinstance(data["features"], dict)
    assert "reasons" in data
    assert isinstance(data["reasons"], list)
    print("  ✓ Legacy React frontend API schema fully validated.")


if __name__ == "__main__":
    print("\n=======================================================")
    print("RUNNING COMPREHENSIVE VERIFICATION TEST SUITE")
    print("=======================================================\n")
    test_preprocessing()
    test_feature_extraction_and_offline_safety()
    test_data_collection()
    test_model_building_synthetic()
    test_alerts_and_reports()
    test_transaction_fraud()
    test_prediction_with_production_model()
    test_django_client_endpoints()
    test_legacy_frontend_compatibility()
    print("\n=======================================================")
    print("🎉 ALL TESTS COMPLETED AND PASSED WITH ZERO ERRORS!")
    print("=======================================================\n")
