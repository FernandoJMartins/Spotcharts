import os
from pathlib import Path
from dotenv import load_dotenv


MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',

    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',

    'apps.accounts.middleware.SpotifyTokenAutoRefreshMiddleware',
]


# Minimal settings for local development
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file (root or backend directory)
root_env = BASE_DIR.parent / '.env'
backend_env = BASE_DIR / '.env'
if root_env.exists():
    load_dotenv(root_env)
elif backend_env.exists():
    load_dotenv(backend_env)

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'change-me')

DEBUG = os.environ.get('DJANGO_DEBUG', '1') == '1'

ALLOWED_HOSTS = ['localhost', 'vercel.app', 'ngrok-free.app', 'render.com', 'host.docker.internal', 'backend', 'spotcharts.onrender.com', '.ngrok-free.dev','spotcharts.vercel.app', 'ngrok-free.dev', '.ngrok-free.dev']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'apps.accounts',
]


ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_L10N = True
USE_TZ = True

STATIC_URL = '/static/'

# Local cache for recent Spotify queries (override with Redis in production)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'spotcharts-cache',
    }
}

# CORS configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]
CORS_ALLOW_ALL_ORIGINS = True

# Allow CORS for FRONTEND_URL (ngrok/vercel/custom)
frontend_url = os.environ.get('FRONTEND_URL', '').rstrip('/')
if frontend_url:
    CORS_ALLOWED_ORIGINS.append(frontend_url)

# Allow all Vercel preview domains when frontend is hosted on vercel.app
if "vercel.app" in frontend_url:
    CORS_ALLOWED_ORIGIN_REGEXES = [r"^https://.*\.vercel\.app$"]

# CSRF trusted origins for cross-site POSTs (e.g. logout)
CSRF_TRUSTED_ORIGINS = []
if frontend_url.startswith("https://"):
    CSRF_TRUSTED_ORIGINS.append(frontend_url)
if "vercel.app" in frontend_url:
    CSRF_TRUSTED_ORIGINS.append("https://*.vercel.app")

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    "ngrok-skip-browser-warning",
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

CORS_ALLOW_METHODS = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
]