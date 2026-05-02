# SpotifyCharts — Dependencies and Install Guide

This file lists recommended core dependencies, pinned versions and quick install commands for local development.

## Frontend (Node)
- Node: >= 20.19 (use `node:20-alpine` Docker base)
- Recommended packages (example versions):
  - `react@18.2.0`
  - `react-dom@18.2.0`
  - `vite@^8.0.0`
  - `tailwindcss@^3.4.0`
  - `axios@^1.4.0`
  - `@tanstack/react-query@^4.36.0`

Install (in `frontend/`):
```bash
npm install
# or to add dev deps
npm install -D vite@^8 tailwindcss
```

Notes:
- Ensure `package.json` contains `build: "vite build"`, `start: "vite"`.

## Backend (Python / Django)
- Python: 3.11+
- Core packages (example entries for `requirements.txt`):
  - Django>=4.2
  - djangorestframework
  - django-cors-headers
  - psycopg2-binary
  - python-dotenv
  - django-environ
  - requests
  - gunicorn (production)

Install (in project root):
```bash
python -m venv .venv
source .venv/bin/activate  # or .\.venv\Scripts\activate on Windows
pip install -r backend/requirements.txt
```

## Dev / Infra
- Docker & Docker Compose: build images with Node 20 base for frontend

Dockerfile note for frontend (recommended):
```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++ build-base
COPY package*.json ./
RUN npm install --silent
COPY . ./
RUN npm run build
RUN npm install -g serve --silent
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

## Optional tools
- `pre-commit`, `eslint`, `stylelint`, `pytest`, `black`, `isort`

## Tips
- Pin major versions in `package.json` and `requirements.txt` to avoid CI surprises.
- Use Dependabot or similar to track updates.
