Backend (Django + DRF)

Quick start (local, without Docker):

1. Create virtualenv

```bash
python -m venv .venv
.venv\Scripts\activate    # Windows
pip install -r requirements.txt
```

2. Configure env (.env) with SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, DATABASE_URL
3. Run migrations:

```bash
python manage.py migrate
python manage.py runserver
```

Docker (compose):

```bash
docker-compose up --build backend
```
