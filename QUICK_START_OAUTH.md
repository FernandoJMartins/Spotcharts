# ⚡ Quick Start — OAuth Spotify (5 min)

## 1. Preparar Spotify App

- Acesse [https://developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
- Crie um app (ex.: SpotCharts-Dev)
- Anote **Client ID**, **Client Secret**
- Configure **Redirect URI**: `http://localhost:8000/api/auth/callback/`

## 2. Configurar Backend

```bash
cd backend
cp ../.env.example .env
```

Edite `.env` (substitua `XXXX` por seus valores):
```env
SPOTIFY_CLIENT_ID=XXXX
SPOTIFY_CLIENT_SECRET=XXXX
SPOTIFY_REDIRECT_URI=http://localhost:8000/api/auth/callback/
FRONTEND_URL=http://localhost:3000/
JWT_SECRET=9f1b2c3d4e5f60718293a4bf5d6e7c8a9b0c1d2e3f40516273849abcdef0123
DJANGO_DEBUG=1
```

## 3. Instalar & Rodar

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

## 4. Testar Login

Abra no browser:
```
http://localhost:8000/api/auth/login/
```

✅ Você será redirecionado para Spotify → authorize → redirecionado de volta

## 5. Verificar Autenticação

```bash
# Copie o JWT do cookie 'session' e faça:
curl -H "Cookie: session=<JWT_AQUI>" http://localhost:8000/api/me/
```

Esperado:
```json
{
  "spotify_id": "user123",
  "display_name": "João Silva",
  "email": "joao@example.com",
  "last_sync": "2026-05-04T10:30:00Z"
}
```

## 📖 Documentação Completa

- **Setup detalhado**: [docs/README_OAUTH_COMPLETE.md](../docs/README_OAUTH_COMPLETE.md)
- **Testes E2E**: [docs/TESTING_OAUTH_FLOW.md](../docs/TESTING_OAUTH_FLOW.md)
- **Segurança**: [docs/SECURITY_CHECKLIST.md](../docs/SECURITY_CHECKLIST.md)
- **Diagramas**: [docs/FLOW_DIAGRAMS.md](../docs/FLOW_DIAGRAMS.md)

## 🆘 Problemas?

```bash
# Validação rápida
python ../scripts/validate_oauth.py
```

Ver troubleshooting em [docs/README_OAUTH_COMPLETE.md#troubleshooting-rápido](../docs/README_OAUTH_COMPLETE.md#troubleshooting-rápido).

---

✅ **Pronto!** Qualquer usuário Spotify pode fazer login.

