#!/bin/sh
set -e
python manage.py migrate --noinput
exec gunicorn auth_service.wsgi:application --bind 0.0.0.0:8001
