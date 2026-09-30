#!/bin/sh
set -e

# Migrations run automatically so a fresh clone works without manual steps.
python manage.py migrate --noinput

# Create the initial admin account from environment variables when supplied
# (idempotent - errors are ignored if the user already exists).
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    python manage.py createsuperuser \
        --noinput \
        --username "$DJANGO_SUPERUSER_USERNAME" \
        --email "${DJANGO_SUPERUSER_EMAIL:-admin@example.com}" \
        || true
fi

exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120