# Teste E2E — Fluxo OAuth Authorization Code

## ✅ Checklist de Requisitos Implementados

- [x] **Fluxo Authorization Code** — LoginView redireciona para Spotify authorization
- [x] **Qualquer usuário do Spotify pode fazer login** — Sem whitelist, `update_or_create` aceita qualquer `spotify_id`
- [x] **Callback e troca de code por token** — AuthCallbackView realiza troca segura
- [x] **Armazenamento seguro de tokens** — Refresh token encriptado com Fernet, access token com expiration
- [x] **Refresh token automático** — Middleware auto-refresh antes de chamadas protegidas
- [x] **Validação de segurança** — Fail-close para encriptação (não armazena se falhar)
- [x] **Sessão segura com JWT** — HttpOnly, Secure, SameSite=strict cookies

---

## Pré-requisitos

1. **Registrar aplicação no Spotify Developer**
   - Acesse [https://developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
   - Crie uma aplicação (ex.: "SpotCharts-Dev")
   - Anote **Client ID** e **Client Secret**
   - Configure Redirect URI (ex.: `http://localhost:8000/api/auth/callback/`)

2. **Ter Python 3.11+ e pip instalados**

3. **Ter um browser para testar o fluxo**

---

## Setup Local

### 1. Criar arquivo `.env` a partir de `.env.example`

```bash
cd backend
cp ../.env.example .env
```

Edite `.env` com seus valores Spotify:

```env
SPOTIFY_CLIENT_ID=xxxxxxxx
SPOTIFY_CLIENT_SECRET=xxxxxxxx
SPOTIFY_REDIRECT_URI=http://localhost:8000/api/auth/callback/
SPOTIFY_SCOPES=user-top-read user-read-email user-read-private
FRONTEND_URL=http://localhost:3000/
JWT_SECRET=9f1b2c3d4e5f60718293a4bf5d6e7c8a9b0c1d2e3f40516273849abcdef0123
TOKEN_ENC_KEY=
DJANGO_SECRET_KEY=test-secret-key-change-in-prod
DJANGO_DEBUG=1
```

**Importante**: Para gerar uma chave de encriptação segura (em produção):
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 2. Instalar dependências

```bash
cd backend
pip install -r requirements.txt
```

### 3. Executar migrações

```bash
python manage.py migrate
```

### 4. Iniciar servidor Django

```bash
python manage.py runserver 0.0.0.0:8000
```

---

## Teste 1: Fluxo de Login Completo

### 1.1 Iniciar fluxo de autorização

Abra no browser (sem estar logado):
```
http://localhost:8000/api/auth/login/
```

**Esperado**: Redireciona para Spotify authorization (login + consentimento)

### 1.2 Autorizar acesso

- Faça login no Spotify (se não estiver)
- Clique em "Concordar" para liberar os scopes
- Redireciona para `SPOTIFY_REDIRECT_URI` (callback)

**Esperado**: Redireciona para `FRONTEND_URL` (http://localhost:3000/) com cookie `session` setado

### 1.3 Verificar cookie de sessão

No DevTools (F12 → Application → Cookies):
- Cookie `session` deve estar presente, **HttpOnly** e **Secure** (em HTTPS)
- Contém um JWT válido

---

## Teste 2: Verificar dados do usuário

### 2.1 Fazer request autenticada

Use curl ou Postman para acessar `/api/me/`:

```bash
# Usando curl com cookie (ou Bearer token)
curl -H "Cookie: session=<JWT_TOKEN>" http://localhost:8000/api/me/

# Ou usando Authorization header
curl -H "Authorization: Bearer <JWT_TOKEN>" http://localhost:8000/api/me/
```

**Esperado**: Retorna JSON com perfil:
```json
{
  "spotify_id": "user123",
  "display_name": "João Silva",
  "email": "joao@example.com",
  "last_sync": "2026-05-04T10:30:00Z"
}
```

### 2.2 Verificar se refresh token foi armazenado

No shell Python ou ORM:
```bash
python manage.py shell
```

```python
from apps.accounts.models import UserProfile
user = UserProfile.objects.first()
print(f"spotify_id: {user.spotify_id}")
print(f"refresh_token_encrypted: {user.refresh_token_encrypted[:20]}...")  # primeiros 20 chars
print(f"token_expires_at: {user.token_expires_at}")
```

**Esperado**:
- `refresh_token_encrypted` não é vazio e começa com `gAAAAAB`... (Fernet format)
- `token_expires_at` é um datetime futuro

---

## Teste 3: Refresh token automático

### 3.1 Simular expiração do token

No shell Python:
```python
from django.utils import timezone
from datetime import timedelta
from apps.accounts.models import UserProfile

user = UserProfile.objects.first()
# Simula token expirado 30 segundos atrás
user.token_expires_at = timezone.now() - timedelta(seconds=30)
user.save()
```

### 3.2 Fazer request (deve auto-refresh)

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" http://localhost:8000/api/me/
```

**Esperado**:
- Request sucede com 200 OK (middleware fez auto-refresh transparente)
- Verificar no DB que `token_expires_at` foi atualizado para um tempo futuro

---

## Teste 4: Refresh token manual

### 4.1 Fazer request ao endpoint de refresh

```bash
curl -X POST \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  http://localhost:8000/api/auth/refresh/
```

**Esperado**: Retorna novo `access_token` e `expires_in`:
```json
{
  "access_token": "BQCxxxxxx...",
  "expires_in": 3600
}
```

---

## Teste 5: Logout

### 5.1 Fazer request de logout

```bash
curl -X POST \
  -H "Cookie: session=<JWT_TOKEN>" \
  http://localhost:8000/api/auth/logout/
```

**Esperado**:
- Retorna 200 OK com `{"detail": "logged_out"}`
- Cookie `session` é deletado (Set-Cookie com Max-Age=0)
- `refresh_token_encrypted` do usuário é limpo no DB

### 5.2 Tentar acessar `/api/me/` após logout

```bash
curl -H "Cookie: session=<JWT_TOKEN_ANTIGO>" http://localhost:8000/api/me/
```

**Esperado**: Retorna 401 Unauthorized (token inválido ou expirado)

---

## Teste 6: Validação de segurança

### 6.1 Teste fail-close para encriptação

Altere `TOKEN_ENC_KEY` em `.env` para um valor inválido:
```env
TOKEN_ENC_KEY=invalid-key
```

Reinicie o servidor e tente fazer login novamente.

**Esperado**: Retorna 500 INTERNAL_SERVER_ERROR com `{"detail": "token_encryption_failed"}`
(Não armazena token sem encriptação — fail-close ✓)

### 6.2 Teste CSRF protection (state validation)

No browser, você pode simular um ataque CSRF manualmente modificando o `state` cookie. O backend deve rejeitar:

```bash
# Manualmente, criar state inválido:
curl -b "spotify_auth_state=state123" \
  "http://localhost:8000/api/auth/callback/?code=code123&state=state456"
```

**Esperado**: Retorna 400 BAD_REQUEST com `{"detail": "invalid_state"}`

---

## Teste 7: Múltiplos usuários

### 7.1 Limpar cookies e fazer login com outro usuário Spotify

1. Limpe cookies do browser (ou use modo incógnito)
2. Acesse `http://localhost:8000/api/auth/login/`
3. Faça login com **outro usuário Spotify**

**Esperado**:
- Novo `UserProfile` criado no DB com diferente `spotify_id`
- Cada usuário tem seus próprios tokens encriptados
- Não há conflito entre sessões

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `SPOTIFY_CLIENT_ID not found` | Verifica se `.env` está no `backend/` e `.gitignore` exclui `.env` |
| `token_encryption_failed` | Verifica se `TOKEN_ENC_KEY` é uma chave Fernet válida ou se `DJANGO_SECRET_KEY` existe |
| CORS erro ao chamar backend do frontend | Configura `django-cors-headers` em settings.py |
| Cookie não é persistido | Verifica se `FRONTEND_URL` está no mesmo domínio ou configurar `domain` no cookie |
| `invalid_token` ao acessar `/api/me/` | Verifica se JWT_SECRET é igual no backend e se o cookie é passado corretamente |

---

## Comandos úteis

```bash
# Ver todos os usuários e tokens armazenados
python manage.py shell
>>> from apps.accounts.models import UserProfile
>>> UserProfile.objects.all().values('spotify_id', 'display_name', 'token_expires_at')

# Limpar todos os usuários (reset para teste)
>>> UserProfile.objects.all().delete()

# Descriptografar token de um usuário (teste)
>>> from utils.crypto import decrypt_str
>>> user = UserProfile.objects.first()
>>> decrypt_str(user.refresh_token_encrypted)  # Retorna o refresh token em plain

# Rodar migrations de novo
python manage.py migrate --plan
python manage.py migrate
```

---

## Resumo de Segurança

✅ **Implementado e validado:**
1. Refresh tokens armazenados **criptografados** (Fernet AES-128)
2. Access tokens com **expiration tracking**
3. JWT com **expiration**
4. Cookies **HttpOnly, Secure, SameSite=Strict**
5. **CSRF protection** via state validation
6. **Fail-close** para encriptação (erro ao invés de armazenar plaintext)
7. **Auto-refresh** antes de chamadas à Spotify API

✅ **Qualquer usuário Spotify pode fazer login** — Não há whitelist, `update_or_create` cria novo perfil automaticamente.

