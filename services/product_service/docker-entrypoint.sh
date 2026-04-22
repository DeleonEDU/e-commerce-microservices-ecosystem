#!/bin/sh
set -e
python manage.py migrate --noinput
exec gunicorn product_service.wsgi:application --bind 0.0.0.0:8003
