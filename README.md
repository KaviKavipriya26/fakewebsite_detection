# ML-Based Fake Website and Online Fraud Detection System

> **College Review Project Specification & Implementation Guide**  
> An end-to-end security platform combining a Scikit-Learn Machine Learning pipeline for real-time URL phishing detection with a rule-based online financial transaction fraud guard, persistent database auditing (MySQL with SQLite fallback), and a full Python (Django) template web interface.

---

## 📋 System Architecture & Overview

This project implements the architecture outlined in the college review specification:
- **Frontend (Primary)**: Python (Django) with server-rendered responsive templates.
  - **Pages**:
    - `Home` (`/`): System overview, architecture breakdown, KPI metrics, and instant test samples.
    - `Scan Website` (`/scan/`): Interactive URL analyzer with risk meters, 14-feature matrix, and safe-browsing guidance.
    - `Check Transaction` (`/transaction/`): Multi-factor online transaction fraud evaluation.
    - `Dashboard` (`/dashboard/`): High-level threat analytics, classification distributions, and active alert feeds.
    - `History` (`/history/`): Complete persistent database audit log with search, classification filtering, and re-scan capabilities.
    - `Alerts` (`/alerts/`): Automated threat alert center with severity categorization (Critical, Warning, Info).
    - `Reports` (`/reports/`): Summary analytics, RFC-compliant CSV audit export (`/reports/export-csv/`), and printable review reports (`/reports/printable/`).
- **Frontend (Legacy)**: The original React/Vite/TanStack application has been preserved in `legacy_react_frontend/`.
- **Backend API**: Django REST API (`POST /api/scan/`, `GET /api/health/`) remains 100% backward compatible.
- **Database**: **SQLite (`db.sqlite3`)** &mdash; default, built-in, and requires zero external database installation or setup. Every scan and transaction check is persisted automatically to the local database file.
- **Offline Safety**: If DNS resolution, WHOIS registration lookup, or HTTP redirect tracing fails due to network disconnection or timeout, values are safely treated as `unknown` with **zero penalty** applied to the target website.

---

## 📂 PDF Review Module Mapping Table

| PDF Review Module | Source File Path | Type | Functional Role & Methodology |
|---|---|---|---|
| **1. Data Collection** | `scanner/pipeline/data_collection.py` | Dataset I/O | Ingests phishing CSV datasets (`PhiUSIIL_Phishing_URL_Dataset.csv`) with automatic header detection; exports database scan records. |
| **2. Preprocessing** | `scanner/pipeline/preprocessing.py` | ETL Pipeline | Cleans URLs, drops duplicates and malformed records, applies `SimpleImputer(strategy='median')` and `StandardScaler()`. |
| **3. Feature Extraction** | `scanner/pipeline/feature_extraction.py` | Feature Engineering | Extracts 14 core lexical/structural URL features + offline-safe WHOIS age, DNS resolution, and HTTP redirect hops. |
| **4. Model Building** | `scanner/pipeline/model_building.py` | Machine Learning | Constructs Scikit-Learn `Pipeline(Imputer -> Scaler -> RandomForestClassifier)` and benchmarks against a `LogisticRegression` baseline. |
| **5. Prediction Engine** | `scanner/model.py` | ML Inference | Evaluates URLs against `model.pkl` (or heuristic fallback) into **Legitimate**, **Suspicious**, or **Fraudulent** with a 0–100 risk score. |
| **6a. Threat Alerts** | `scanner/pipeline/alerts.py` | Security Engine | Triggers automated alerts based on risk thresholds and outputs contextual safe-browsing recommendations. |
| **6b. Forensic Reports** | `scanner/pipeline/reports.py` | Analytics | Generates RFC-compliant CSV audit files and formats data for formal printable project review reports. |
| **Online Transaction Fraud** | `scanner/transaction_fraud.py` | Rule-Based | Multi-factor risk scorer evaluating transaction amounts, geolocation country mismatches, high-risk merchant categories, and device novelty. |
| **Web UI Views & Routes** | `scanner/views.py` & `backend/urls.py` | Web Presentation | Handles all 7 template pages, CSV streaming, print views, and JSON REST API endpoints. |

---

## ⚖️ Honest Notes: Machine Learning vs. Rule-Based Modules

To ensure complete academic transparency in your college review, the system clearly distinguishes between Machine Learning models and Rule-Based heuristics:

### 1. Machine Learning Components
- **URL Phishing & Fake Website Detection**:
  - Implemented as a **Scikit-Learn Random Forest Classifier** (`RandomForestClassifier`, 180 estimators, max depth 13).
  - Trained on the balanced **PhiUSIIL Phishing URL Dataset** across 14 extracted lexical, structural, and domain features.
  - Evaluated against a **Logistic Regression Baseline** (`LogisticRegression`) in `scanner/pipeline/model_building.py`, producing precision, recall, F1-score, and confusion matrix comparative reports.
  - The trained production model is stored as `backend/scanner/model.pkl` (~12.5MB).

### 2. Rule-Based Components
- **Online Transaction Fraud Detection (`/transaction/`)**:
  - **Why Rule-Based?** Public commercial banking datasets containing real customer credit card numbers, device fingerprints, and merchant transactions are proprietary and confidential. Therefore, transaction fraud detection is implemented via an industry-standard **deterministic multi-factor heuristic risk engine**.
  - **Rules Evaluated**:
    1. *Amount Velocity*: Flags unusually high transactions (> $1,500 = +20 pts; > $5,000 = +30 pts).
    2. *Cross-Border Inconsistency*: Flags geographic mismatches between card issuing country and billing/IP country (+25 pts).
    3. *High-Risk Merchant Categories*: Flags cash-equivalent or volatile merchants (Crypto Exchanges, Gambling/Casinos, Offshore Wire, Luxury Goods = +25 pts).
    4. *Hardware/Device Novelty*: Flags transactions originating from unverified or newly bound user hardware (+15 pts).
    5. *Payment Rail Irreversibility*: Flags irreversible payment methods (Cryptocurrency, Wire Transfers = +15 pts).
    6. *Merchant Relationship*: Flags first-time interactions with unknown merchants (+10 pts).
  - **Labeling**: Every transaction check is explicitly marked in the UI and database as:
    > *"Rule-Based Evaluation (College Project Prototype — No Public Transaction Dataset)"*.
- **Offline-Safe Domain Verification**:
  - WHOIS domain age, DNS host resolution, and HTTP redirect hops provide auxiliary safety signals. If the host is offline or the lookup times out, the system marks the attribute as `unknown` and adds **0 risk points**.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (Python 3.12 recommended)
- MySQL Server (optional; SQLite is used automatically if MySQL is unavailable)

### 1. Setup & Launch (Windows)
Double-click `start-backend.bat` or run:
```bat
start-backend.bat
```
This script automatically:
1. Creates a Python virtual environment (`venv`) if missing.
2. Installs dependencies from `requirements.txt`.
3. Runs `python manage.py makemigrations` and `python manage.py migrate`.
4. Starts the Django development server at **http://localhost:8000**.

### 2. Setup & Launch (Linux / macOS)
```bash
chmod +x start-backend.sh
./start-backend.sh
```

### 3. Manual Step-by-Step Setup
If you prefer running commands manually:
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py makemigrations
python manage.py migrate

# Launch Django server
python manage.py runserver 8000
```

Now open **http://localhost:8000** in your web browser:
- `http://localhost:8000/` &mdash; Home Overview
- `http://localhost:8000/scan/` &mdash; Scan Website
- `http://localhost:8000/transaction/` &mdash; Check Online Transaction
- `http://localhost:8000/dashboard/` &mdash; Analytics Dashboard
- `http://localhost:8000/history/` &mdash; Database History
- `http://localhost:8000/alerts/` &mdash; Security Alerts
- `http://localhost:8000/reports/` &mdash; Reports & Audit
- `http://localhost:8000/reports/export-csv/` &mdash; Download CSV Audit Log
- `http://localhost:8000/reports/printable/` &mdash; Printable Forensic Report

---

## 🗄️ Database Configuration: SQLite (Default & Self-Contained)

The backend uses **SQLite (`backend/db.sqlite3`)** as its primary, zero-configuration database:
- **No external server setup required**: Django directly creates and manages `db.sqlite3`.
- **Zero friction**: Simply run `python manage.py migrate` and the database tables (`ScanRecord`, `Alert`, `TransactionCheck`) are ready immediately.
- **Portability**: All scan logs, risk indicators, and fraud reports stay in your project directory without needing MySQL services running.

---

## 🧠 How to Train or Retrain the Model

> **IMPORTANT**: The production model `backend/scanner/model.pkl` is pre-trained and verified. Do **not** overwrite it with synthetic data.

If you wish to retrain the model on the full PhiUSIIL dataset:
1. Ensure `PhiUSIIL_Phishing_URL_Dataset.csv` is located in `backend/` (~56MB, 235,000+ labeled samples).
2. Run the training script:
   ```bash
   cd backend
   python train_model.py
   ```
3. The script extracts features, generates a balanced augmentation set, fits the `RandomForestClassifier`, prints a complete classification report and confusion matrix, and saves `backend/scanner/model.pkl`.

To benchmark the Scikit-Learn Pipeline (`SimpleImputer` &rarr; `StandardScaler` &rarr; `RandomForestClassifier`) against the Logistic Regression baseline programmatically:
```python
from scanner.pipeline.data_collection import load_phishing_dataset
from scanner.pipeline.feature_extraction import extract_features, FEATURE_ORDER
from scanner.pipeline.model_building import evaluate_models
from sklearn.model_selection import train_test_split
import numpy as np

# Load dataset samples
df = load_phishing_dataset("PhiUSIIL_Phishing_URL_Dataset.csv", sample_size=5000)

# Extract feature matrix
X = np.array([[float(extract_features(u)[k]) for k in FEATURE_ORDER] for u in df["url"]])
y = df["label"].values

# Train & compare
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
report = evaluate_models(X_tr, y_tr, X_te, y_te)

print("Baseline Logistic Regression Accuracy:", report["baseline_logistic_regression"]["accuracy"])
print("Random Forest Pipeline Accuracy:", report["random_forest_pipeline"]["accuracy"])
print(report["random_forest_pipeline"]["classification_report"])
```

---

## ✅ Features at a Glance

| Area | Feature |
|---|---|
| Website scanner | 14 URL features → Random Forest risk score (0-100) → **Legitimate / Suspicious / Fraudulent** (thresholds: <40, 40-74, ≥75) |
| Explainability | Human-readable reasons (no HTTPS, many hyphens, risky TLD, shortener, keywords, IP address, `@` symbol ...) |
| Domain intelligence | WHOIS domain age, DNS resolution, redirect hops — offline-safe (`unknown` = zero penalty) |
| Transaction fraud | 6 rule-based checks → Low / Medium / High risk with recommended action |
| Alerts | Auto High/Medium alerts, raw-IP alert, context-aware safe-browsing tips |
| History | Every scan stored in SQLite; search by URL and filter by class |
| Dashboard | KPIs, class distribution, recent scans / alerts / transactions |
| Reports | CSV export + printable forensic report |
| REST API | `GET /api/health/`, `POST /api/scan/` |
| Pipeline | Data collection, preprocessing, feature extraction, model building (RF vs Logistic Regression), alerts, reports |
| Testing | `test_all_modules.py` – 9 stages (all passing) |

### The 14 URL features
`https`, `domain_length`, `url_length`, `hyphens_in_domain`, `digits_in_host`, `has_ip_address`, `has_at_symbol`, `subdomain_count`, `suspicious_keywords_in_host`, `suspicious_keywords`, `suspicious_tld`, `is_shortener`, `has_query`, `special_chars`

---

## 🔮 Features That Can Be Added (Roadmap)

**Better detection**
- [ ] Page-content analysis (password fields, login form posting to another domain, hidden iframes, external-link ratio)
- [ ] SSL certificate check (issuer, expiry, self-signed)
- [ ] Typosquatting / brand impersonation (Levenshtein distance – `paypa1.com`, `g00gle.com`)
- [ ] Homograph / Punycode (`xn--`) detection
- [ ] More URL features: entropy, path depth, port number, digit ratio, `.exe`/`.apk` links
- [ ] Threat-intel APIs: Google Safe Browsing, VirusTotal, PhishTank, OpenPhish
- [ ] Whitelist / blacklist management

**Better ML**
- [ ] Compare XGBoost / LightGBM / Gradient Boosting with Random Forest
- [ ] SHAP / feature-importance explanations from the model itself
- [ ] "Model Performance" page (accuracy, precision, recall, F1, confusion matrix)
- [ ] Cross-validation, probability calibration, feedback-based retraining

**Transaction fraud**
- [ ] ML model using Kaggle Credit Card Fraud / IEEE-CIS dataset
- [ ] Velocity features (transactions per hour/day), IP geolocation, time-of-day rules
- [ ] `POST /api/transaction/` REST endpoint

**Platform & UI**
- [ ] User login with Admin / User roles
- [ ] Charts (Chart.js) on dashboard
- [ ] Bulk scan from CSV upload
- [ ] PDF / Excel report export
- [ ] Email / SMS / Telegram alerts
- [ ] Chrome browser extension
- [ ] Multi-language UI (Tamil / Hindi / English), dark mode
- [ ] Swagger / OpenAPI docs + API-key auth

**Engineering & security**
- [ ] `SECRET_KEY` from environment, `DEBUG=False`, restricted `ALLOWED_HOSTS` for deployment
- [ ] Background / cached WHOIS-DNS lookups (Celery), API rate limiting
- [ ] Docker + docker-compose, cloud deployment
- [ ] Remove unused `PyMySQL` dependency (or add a real MySQL/PostgreSQL option via env vars)

---

## ▶️ How to Run (Quick Summary)

| What | Command | URL |
|---|---|---|
| **Backend + main frontend** (Django, single server) | Windows: `start-backend.bat` · Linux/macOS: `./start-backend.sh` | http://localhost:8000 |
| **Legacy React frontend** (optional, backend must be running) | `cd legacy_react_frontend` → copy `.env.example` to `.env` → `npm install` → `npm run dev` | printed by Vite in terminal |
| **Tests** | `cd backend && python test_all_modules.py` | – |

> The main frontend is the Django template UI, so you do **not** need Node.js unless you want the legacy React app.

**Troubleshooting**
- `python` not found → use `py` / `python3`, or install Python with *Add to PATH*.
- Port 8000 busy → `python manage.py runserver 8001`.
- WHOIS/DNS shows `unknown` → you are offline; this is expected and not penalised.
- React cannot reach backend → make sure the backend is running and `.env` has `VITE_API_BASE_URL=http://localhost:8000`.

---

## 🧾 Sample Input & Output

### 1. Website scan (REST API)

**Input**
```bash
curl -X POST http://localhost:8000/api/scan/ \
  -H "Content-Type: application/json" \
  -d '{"url":"http://secure-login-paypal-verify.xyz/update?id=123"}'
```

**Output (shortened)**
```json
{
  "url": "http://secure-login-paypal-verify.xyz/update?id=123",
  "prediction": "Fraudulent",
  "risk_score": 98,
  "features": {
    "https": false, "domain_length": 30, "url_length": 51,
    "hyphens_in_domain": 3, "has_ip_address": false,
    "suspicious_keywords_in_host": 4, "suspicious_tld": true,
    "is_shortener": false, "has_query": true, "special_chars": 5,
    "domain_age_days": null, "redirects": 0
  },
  "reasons": [
    "Unencrypted connection (No HTTPS)",
    "Multiple hyphens in domain name (3)",
    "Brand impersonation or security keyword embedded in domain",
    "High-abuse / risky Top-Level Domain (TLD)",
    "High count of URL special/encoded characters"
  ],
  "domain_info": { "dns_resolved": "unknown", "whois_status": "unknown", "network_available": false },
  "alerts": [{ "severity": "high", "title": "Critical Phishing Alert: Fraudulent Domain Detected" }]
}
```

### 2. More website samples

| Input URL | Prediction | Risk |
|---|---|---|
| `https://www.google.com` | Legitimate | 1 |
| `https://github.com/anthropics` | Legitimate | 7 |
| `http://bit.ly/free-gift` | Fraudulent | 99 |
| `http://192.168.1.10/bank/login@evil.com` | Fraudulent | 98 |
| `http://secure-login-paypal-verify.xyz/update?id=123` | Fraudulent | 98 |

### 3. API errors

| Input | Output |
|---|---|
| `{}` | `{"error": "url is required"}` |
| `{"url": "google.com"}` | `{"error": "url must start with http:// or https://"}` |

(The `/scan/` web page adds `http://` automatically.)

### 4. Transaction check (form at `/transaction/`)

| Input | Output |
|---|---|
| Amount 120, Credit Card, Amazon / E-Commerce, IN → IN, not new merchant, known device | **Risk 0 – Low Risk**, no rules triggered |
| Amount 6200, Cryptocurrency, CoinXYZ / Crypto Exchange, card IN, billing US, first-time merchant, new device | **Risk 100 – High Risk**; triggered: high value, country mismatch, high-risk category, new device, first-time merchant, irreversible payment. Action: 2FA step-up / manual review |

### 5. CSV export (`/reports/export-csv/`)
```csv
Scan ID,Website URL,Classification,Risk Score (%),Scan Timestamp (UTC),Key Threat Indicators
9,http://secure-login-paypal-verify.xyz/update?id=123,Fraudulent,98,2026-11-11 15:45:13,Unencrypted connection (No HTTPS); Multiple hyphens in domain name (3); ...
```

---

## 🌐 Legacy React Frontend (Optional)

The previous React/Vite frontend has been moved to `legacy_react_frontend/`. It remains fully functional and connects to the Django REST API:
- To start the legacy React frontend:
  ```bat
  start-frontend.bat
  ```
  or:
  ```bash
  cd legacy_react_frontend
  npm install
  npm run dev
  ```
- The backend continues serving `POST /api/scan/` with exact schema matching:
  ```json
  {
    "url": "https://example.com",
    "prediction": "Legitimate",
    "risk_score": 12,
    "features": { "https": true, "url_length": 19, ... },
    "reasons": ["Uses secure encrypted HTTPS protocol"],
    "domain_info": { "domain_age_days": null, "dns_resolved": "unknown" }
  }
  ```

---

## 🧪 Verification & Testing

A complete automated test suite is included in `backend/test_all_modules.py`. It runs 9 verification test stages:
```bash
cd backend
python test_all_modules.py
```
**Tests Covered**:
1. Preprocessing (cleaning, invalid URL removal, deduplication, imputer/scaler pipeline).
2. Feature extraction (14 features parity, offline safety handling).
3. Data collection (dataset ingestion, DB export).
4. Model building (synthetic dataset in `/tmp` only; production model preserved).
5. Threat alerts and forensic report generators.
6. Rule-based online transaction fraud scoring.
7. Prediction engine with production `model.pkl`.
8. Django Test Client execution on all 12 view/API endpoints.
9. Legacy React frontend API schema contract validation.
