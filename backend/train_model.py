import csv
import random
from pathlib import Path
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

from scanner.features import extract_features
from scanner.model import FEATURE_ORDER

DATASET_PATH = Path("PhiUSIIL_Phishing_URL_Dataset.csv")
if not DATASET_PATH.exists():
    DATASET_PATH = Path("backend") / "PhiUSIIL_Phishing_URL_Dataset.csv"

print(f"Reading dataset from {DATASET_PATH}...")
rows = []
with open(DATASET_PATH, "r", encoding="utf-8", errors="ignore") as f:
    reader = csv.reader(f)
    next(reader)  # skip header
    for r in reader:
        url = r[1]
        lbl = int(r[-1])
        y = 1 - lbl  # In dataset 1=legit, 0=phish. Target: 1=phish, 0=legit
        rows.append((url, y))

print(f"Loaded {len(rows)} samples. Shuffling and preparing balanced feature vectors...")
random.seed(42)
random.shuffle(rows)

# Use balanced training set
train_rows = rows[:120000]
test_rows = rows[120000:150000]

common_slugs = [
    "/about", "/contact-us", "/privacy-policy", "/terms-and-conditions",
    "/questions/12345/how-to-solve-issue", "/docs/v2/getting-started",
    "/products/category-item?ref=homepage", "/blog/2026/05/update-notes",
]

X_tr, y_tr = [], []
for url, label in train_rows:
    f = extract_features(url)
    X_tr.append([float(f[k]) for k in FEATURE_ORDER])
    y_tr.append(label)

    # Augment legit URLs with bare domain (without 'www.') & common safe paths
    if label == 0:
        if "://www." in url:
            bare_url = url.replace("://www.", "://", 1)
            f_bare = extract_features(bare_url)
            X_tr.append([float(f_bare[k]) for k in FEATURE_ORDER])
            y_tr.append(label)

            if random.random() < 0.35:
                p_url = bare_url.rstrip("/") + random.choice(common_slugs)
                f_p = extract_features(p_url)
                X_tr.append([float(f_p[k]) for k in FEATURE_ORDER])
                y_tr.append(label)
        elif random.random() < 0.35:
            p_url = url.rstrip("/") + random.choice(common_slugs)
            f_p = extract_features(p_url)
            X_tr.append([float(f_p[k]) for k in FEATURE_ORDER])
            y_tr.append(label)

X_tr = np.array(X_tr)
y_tr = np.array(y_tr)

X_te = np.array([[float(extract_features(u)[k]) for k in FEATURE_ORDER] for u, _ in test_rows])
y_te = np.array([lbl for _, lbl in test_rows])

print(f"Training RandomForestClassifier on {len(X_tr)} augmented samples (features={len(FEATURE_ORDER)})...")
m = RandomForestClassifier(n_estimators=180, max_depth=13, random_state=42, n_jobs=-1)
m.fit(X_tr, y_tr)

preds = m.predict(X_te)
print("\n=== Classification Report ===")
print(classification_report(y_te, preds, target_names=["legitimate", "phishing"], digits=3))
print("Confusion Matrix:\n", confusion_matrix(y_te, preds))

print("\n=== Feature Importances ===")
for k, v in sorted(zip(FEATURE_ORDER, m.feature_importances_), key=lambda t: -t[1]):
    print(f"{k:30s} {v:.3f}")

# Save model
output_path = Path("scanner/model.pkl")
output_path.parent.mkdir(parents=True, exist_ok=True)
joblib.dump(m, output_path)
print(f"\nSaved model to {output_path.resolve()}")

# Also save to backend/scanner/model.pkl if running outside
alt_path = Path("backend/scanner/model.pkl")
if alt_path.parent.exists() and alt_path.parent != output_path.parent:
    joblib.dump(m, alt_path)
    print(f"Also saved model to {alt_path.resolve()}")

print("\n=== Verification on Canonical Test URLs ===")
test_cases = [
    "https://www.google.com",
    "https://google.com",
    "https://github.com/anthropics",
    "https://github.com",
    "https://amazon.com/gp/product/B08N5WRWNW",
    "https://stackoverflow.com/questions/1234567/how-to-fix-bug",
    "http://secure-login-paypal.verify-account.tk/update?id=1",
    "http://www.teramill.com",
    "http://bankofamerica.com.security-check.xyz/login.php",
    "http://paypal-verification-account-security.servehttp.com/login",
    "http://192.168.1.1/admin",
]

for u in test_cases:
    feat = [[float(extract_features(u)[k]) for k in FEATURE_ORDER]]
    prob = m.predict_proba(feat)[0][1] * 100
    lbl = "high_risk" if prob >= 75 else "suspicious" if prob >= 40 else "legitimate"
    print(f"{u:60s} -> Risk: {prob:5.1f}% [{lbl}]")
