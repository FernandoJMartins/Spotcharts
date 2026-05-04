# Segurança — Checklist OAuth + Token Management

## 🔒 Implementação Validada

### Authorization Code Flow
- [x] **State Parameter**: Gerado em `LoginView`, validado em `AuthCallbackView` (CSRF protection)
- [x] **Code + Secret Exchange**: Realizado no servidor (não exposto ao cliente)
- [x] **Redirect URI Validation**: Registrado no Spotify, validado em callback
- [x] **Scopes Claramente Solicitados**: `user-top-read user-read-email user-read-private`

### Token Storage & Lifecycle
- [x] **Refresh Token Encrypted**: Armazenado em `UserProfile.refresh_token_encrypted` com Fernet (AES-128 + HMAC)
- [x] **Access Token Not Stored**: Apenas em cache com `token_expires_at`
- [x] **Encryption Key Management**: 
  - Primária: `TOKEN_ENC_KEY` (env var, recomendado em produção)
  - Fallback: Derivada de `DJANGO_SECRET_KEY` (via SHA256 + base64)
- [x] **Fail-Close Encryption**: Se encriptação falhar, retorna 500 (não armazena plaintext)

### Token Refresh
- [x] **Automatic Refresh**: Middleware `SpotifyTokenAutoRefreshMiddleware` checa expiração antes de cada request
- [x] **Graceful Degradation**: Se refresh falhar, middleware não trava (apenas retorna None)
- [x] **Manual Refresh Endpoint**: `POST /api/auth/refresh/` disponível para clientes explícitos

### Session Management (JWT)
- [x] **HttpOnly Cookies**: Previne XSS token theft
- [x] **Secure Flag**: Setado em produção (HTTPS only)
- [x] **SameSite=Strict**: Previne CSRF
- [x] **JWT Expiration**: Configurável via `JWT_EXP_DAYS` (padrão: 7 dias)
- [x] **JWT Signed**: Usa `JWT_SECRET` ou `DJANGO_SECRET_KEY` como key

### Authentication & Authorization
- [x] **JWT Authentication**: `JWTAuthentication` valida token via cookie ou Authorization header
- [x] **Request User Object**: `request.user` é `UserProfile` instance (DRF compatible)
- [x] **Permission Classes**: `IsAuthenticated` aplicado a endpoints protegidos
- [x] **No Hardcoded Users**: Qualquer `spotify_id` é aceito (sem whitelist)

### API Endpoints Security
- [x] `/api/auth/login/` — Public, GET only (safe)
- [x] `/api/auth/callback/` — Public, GET only (validates state + code)
- [x] `/api/me/` — Protected, GET only
- [x] `/api/auth/refresh/` — Protected, POST only
- [x] `/api/auth/logout/` — Protected, POST only

---

## 🛡️ Boas Práticas — Produção

### Environment Variables (✅ Implementadas)
```env
# OBRIGATÓRIO
SPOTIFY_CLIENT_ID=xxxxxxxx
SPOTIFY_CLIENT_SECRET=xxxxxxxx
SPOTIFY_REDIRECT_URI=https://yourdomain.com/api/auth/callback/
JWT_SECRET=<random-256-bit-key>
TOKEN_ENC_KEY=<fernet-key-generated-via-cryptography>
DJANGO_SECRET_KEY=<django-secret>

# RECOMENDADO
FRONTEND_URL=https://yourdomain.com/
SPOTIFY_SCOPES=user-top-read user-read-email user-read-private
JWT_EXP_DAYS=7

# BANCO DE DADOS
DATABASE_URL=postgresql://user:pass@host/db
```

### Deployment Checklist
- [ ] `DEBUG=False` em produção
- [ ] `ALLOWED_HOSTS` configurado com domínios específicos (não `['*']`)
- [ ] HTTPS habilitado (cookies com `Secure=True`)
- [ ] `TOKEN_ENC_KEY` gerado e armazenado com segurança (rotation de chaves?)
- [ ] Backup encriptado do banco (tokens estão encriptados, mas ainda assim...)
- [ ] Logs sem expor tokens (never log `refresh_token`, `access_token`, `JWT_SECRET`)
- [ ] Rate limiting no `/api/auth/login/` e `/api/auth/callback/`
- [ ] CORS configurado apenas para domínios permitidos
- [ ] CSP (Content-Security-Policy) headers
- [ ] HSTS ativado (HTTP Strict-Transport-Security)

### Monitoring & Alertas
- [ ] Log todas as falhas de refresh token (possível compromisso)
- [ ] Alerta se `token_encryption_failed` ocorre (problema com chave?)
- [ ] Monitorar taxa de 401 Unauthorized (possível brute-force?)
- [ ] Limpar `UserProfile` antigos (inactive users) periodicamente

---

## ⚠️ Riscos Conhecidos e Mitigações

| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| Chave de encriptação comprometida | **CRÍTICO** | Rotacionar chave, invalidar todos os refresh tokens |
| DJANGO_SECRET_KEY exposto | **CRÍTICO** | Nunca committar em git; usar env vars |
| Acesso ao banco de dados | **CRÍTICO** | Usar SSL/TLS para conexão; DB backup encriptado |
| Man-in-the-middle (HTTPS) | **ALTO** | Forçar HTTPS; HSTS headers |
| Token armazenado em localStorage | **ALTO** | Frontend nunca armazena tokens (use cookies HttpOnly) |
| CORS misconfiguration | **MÉDIO** | Whitelist domínios específicos |
| Token brute-force | **MÉDIO** | JWT com TTL curto; rate limit na troca de token |
| Expired token não renovado | **BAIXO** | Middleware auto-refresh trata isso |

---

## 🔍 Auditoria & Verificação

### Verificar chave de encriptação
```bash
python -c "
from cryptography.fernet import Fernet
from backend.utils.crypto import get_fernet
try:
    f = get_fernet()
    print('✅ Chave de encriptação válida')
except Exception as e:
    print(f'❌ Erro: {e}')
"
```

### Verificar tokens armazenados
```bash
python manage.py shell
>>> from apps.accounts.models import UserProfile
>>> from utils.crypto import decrypt_str
>>> for user in UserProfile.objects.all():
...     try:
...         rt = decrypt_str(user.refresh_token_encrypted)
...         print(f"✅ {user.spotify_id}: token decriptado (primeiros 10 chars: {rt[:10]}...)")
...     except Exception as e:
...         print(f"❌ {user.spotify_id}: erro ao decriptar - {e}")
```

### Teste de falha de encriptação
```bash
# Altere TOKEN_ENC_KEY para inválido e tente fazer login
# Esperado: 500 INTERNAL_SERVER_ERROR com "token_encryption_failed"
```

---

## 📋 Checklist Pré-Deploy

- [ ] `.env` configurado com valores reais (não `.env.example`)
- [ ] `TOKEN_ENC_KEY` gerado e testado
- [ ] `JWT_SECRET` gerado e seguro
- [ ] ALLOWED_HOSTS restrito
- [ ] DEBUG = False
- [ ] HTTPS ativado (ou testado em staging)
- [ ] CORS domínios restritos
- [ ] Testes E2E passando (ver [TESTING_OAUTH_FLOW.md](TESTING_OAUTH_FLOW.md))
- [ ] Logs verificados (sem exposição de tokens)
- [ ] Rate limiting configurado (opcional)
- [ ] Backup do banco testado

---

## 🚀 Status Geral

✅ **IMPLEMENTAÇÃO COMPLETA E SEGURA**
- Fluxo OAuth Authorization Code totalmente implementado
- Qualquer usuário Spotify pode fazer login
- Tokens armazenados com segurança (criptografia + expiration)
- Auto-refresh transparente via middleware
- Sessão segura com JWT (HttpOnly, Secure, SameSite)
- Fail-close para erros de encriptação

**Próximas melhorias opcionais:**
- Rate limiting explícito
- Audit logging
- Token rotation policy
- Refresh token expiration (Spotify não fornece, mas podemos adicionar)

