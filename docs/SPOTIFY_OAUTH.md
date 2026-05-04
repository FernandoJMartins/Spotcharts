# Spotify OAuth (Authorization Code) — Configuração e Uso

Este documento descreve como configurar e testar o fluxo OAuth Authorization Code com a Spotify Web API para este projeto (backend Django).

## Resumo
- Endpoints principais (backend):
  - `GET /api/auth/login/` — inicia o fluxo (redireciona para Spotify).
  - `GET /api/auth/callback/` — callback usado pelo Spotify; troca `code` por tokens, busca perfil e persiste `refresh_token` (encriptado).
  - `POST /api/auth/refresh/` — renova `access_token` usando `refresh_token` armazenado.
  - `GET /api/auth/me/` — retorna perfil do usuário autenticado (JWT).
  - `POST /api/auth/logout/` — limpa cookie de sessão e, opcionalmente, o refresh token armazenado.

## Onde está implementado
- Views e endpoints: `backend/apps/accounts/views.py`.
- Model: `backend/apps/accounts/models.py` (`UserProfile`).
- Serviço de integração com Spotify: `backend/services/spotify_client.py` (troca de código, refresh, chamadas básicas).
- Criptografia de tokens: `backend/utils/crypto.py` (Fernet + derivação de chave).
- Middleware de refresh automático: `backend/apps/accounts/middleware.py` (atualiza token antes de chamadas quando necessário).

## Variáveis de ambiente necessárias
- `SPOTIFY_CLIENT_ID` — Client ID da sua aplicação Spotify.
- `SPOTIFY_CLIENT_SECRET` — Client Secret.
- `SPOTIFY_REDIRECT_URI` — Callback registrado em Spotify (ex.: `http://localhost:8000/api/auth/callback/`).
- `SPOTIFY_SCOPES` — scopes necessários (padrão: `user-top-read user-read-email user-read-private`).
- `FRONTEND_URL` — URL para onde o backend redireciona após login (opcional).
- `JWT_SECRET` ou `DJANGO_SECRET_KEY` — usado para assinar JWTs.
- `TOKEN_ENC_KEY` — (recomendado) chave base64 urlsafe 32 bytes para encriptar `refresh_token` com Fernet. Se ausente, uma chave é derivada de `DJANGO_SECRET_KEY`.

Exemplo em `.env.example` (já presente no repositório):

```
SPOTIFY_CLIENT_ID=XXXX
SPOTIFY_CLIENT_SECRET=XXX
SPOTIFY_REDIRECT_URI=http://localhost:8000/api/auth/callback/
SPOTIFY_SCOPES=user-top-read user-read-email user-read-private
FRONTEND_URL=http://localhost:3000/
JWT_SECRET=...
TOKEN_ENC_KEY=
DATABASE_URL=...
```

Observação: configure `TOKEN_ENC_KEY` com uma chave Fernet segura quando for para produção. Para gerar rapidamente:

```
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Como o fluxo funciona (resumo técnico)
1. Usuário acessa `GET /api/auth/login/`.
2. Backend gera `state` e redireciona para `https://accounts.spotify.com/authorize?...` com `client_id`, `redirect_uri`, `scope`, `state`.
3. Spotify redireciona para `SPOTIFY_REDIRECT_URI?code=...&state=...`.
4. `AuthCallbackView` (`/api/auth/callback/`) troca `code` por tokens usando `SpotifyClient.exchange_code()`.
   - O `refresh_token` retornado é encriptado usando `utils.crypto.encrypt_str()` e salvo em `UserProfile.refresh_token_encrypted`.
   - `token_expires_at` registra quando o `access_token` expira.
5. Backend emite um JWT (`session` cookie HttpOnly) contendo `sub` = `spotify_id`.
6. Middleware `SpotifyTokenAutoRefreshMiddleware` tenta renovar `access_token` automaticamente (usando o refresh token armazenado) antes de chamadas que exigem acesso ao Spotify.

## Testes / Execução local
1. Ajuste variáveis de ambiente (ex.: criar `.env` a partir de `.env.example`).
2. Executar migrações e servidor Django:

```bash
# do diretório backend/
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

3. Iniciar fluxo de login abrindo no browser:

```
# abre o endpoint de login que redireciona para Spotify
http://localhost:8000/api/auth/login/
```

4. Após consentimento, Spotify redirecionará para `SPOTIFY_REDIRECT_URI` e o backend criará/atualizará `UserProfile` e irá emitir o cookie de sessão.

5. Para renovar manualmente (exemplo usando curl, inclua cookie JWT se necessário):

```bash
curl -X POST http://localhost:8000/api/auth/refresh/ -H "Authorization: Bearer <JWT_TOKEN>"
```

6. Verifique `UserProfile` na base (ex.: `db.sqlite3` ou Postgres) para conferir `refresh_token_encrypted` e `token_expires_at`.

## Segurança e boas práticas
- Nunca exponha `refresh_token` em cliente (frontend). Ele é armazenado apenas no backend, encriptado.
- Use `TOKEN_ENC_KEY` em produção, não dependa da derivação a partir da `DJANGO_SECRET_KEY` quando possível.
- Cookies de sessão são `HttpOnly` e `SameSite=Strict`; garanta `Secure` em produção (HTTPS).
- Controle de `state` é usado para mitigar CSRF entre login/callback.

## Observações sobre a implementação atual
- O código principal do fluxo já está implementado em `backend/apps/accounts/` e `backend/services/spotify_client.py`.
- Se quiser, posso:
  - adicionar testes automatizados para o fluxo (unit + integration),
  - adicionar uma rota que retorne a URL de autorização (JSON) em vez de redirecionar,
  - melhorar logs e tratamento de erros da troca de token.

---
Se quiser, prossigo gerando um arquivo `.env` de exemplo preenchido localmente (sem valores secretos), adiciono testes ou faço um PR com pequenas melhorias de logging.
