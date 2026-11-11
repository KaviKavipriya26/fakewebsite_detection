# Backend — ML-Based Fake Website and Online Fraud Detection System

Please refer to the comprehensive [Root README.md](../README.md) for complete project architecture, setup steps, MySQL configuration, training instructions, and the PDF module mapping table.

### Quick Start
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver 8000
```
Web UI: **http://localhost:8000**  
REST API: **http://localhost:8000/api/scan/**
