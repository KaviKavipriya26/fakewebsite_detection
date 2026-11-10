#!/usr/bin/env bash
cd backend
[ -d venv ] || python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py runserver 8000
