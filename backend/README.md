# FraudGuard Backend (Django REST)

## Run
```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver      # http://localhost:8000
```

## Connect the frontend
In the React project, create `.env`:
```
VITE_API_BASE_URL=http://localhost:8000
VITE_API_SCAN_PATH=/api/scan/
```
Restart the frontend dev server.

## Endpoints
- `GET  /api/health/`
- `POST /api/scan/`  body `{ "url": "https://example.com" }`

## Use your own ML model
Put your trained `model.pkl` in `scanner/` and match `FEATURE_ORDER` in `scanner/model.py`.
Without it, a rule-based heuristic is used.

## CORS
If your frontend runs on another port, add it to `CORS_ALLOWED_ORIGINS` in `backend/settings.py`.
