# Debug & Fixes - Login OAuth Spotify

## 🔍 Problemas Encontrados

### 1. **Login.jsx Vazio** ❌
**Arquivo**: [frontend/src/components/login/Login.jsx](frontend/src/components/login/Login.jsx)

Seu colega removeu TODO o código de login! Estava retornando apenas `<h1>Login</h1>` sem:
- Botão de login
- Redirecionamento para OAuth do Spotify
- Nenhuma integração com o backend

**Impacto**: Usuários não conseguiam iniciar o fluxo de autenticação.

---

### 2. **PrivateRoute com Lógica Errada** ❌
**Arquivo**: [frontend/src/routes/PrivateRoute.jsx](frontend/src/routes/PrivateRoute.jsx)

**Problema**: Procurava token em `localStorage.getItem("token")`, mas:
- Backend **NÃO** salva token em localStorage
- Backend usa **HttpOnly cookie** (`session`) para segurança
- localStorage nunca teria nada, então PrivateRoute SEMPRE bloqueava

**Impacto**: Mesmo usuários autenticados não conseguiam acessar `/graficos`

---

### 3. **CORS Não Configurado** ❌
**Arquivo**: [backend/config/settings.py](backend/config/settings.py)

**Problema**:
- `django-cors-headers` estava em `requirements.txt` mas:
  - NÃO estava em `INSTALLED_APPS`
  - NÃO estava em `MIDDLEWARE`
  - Sem `CORS_ALLOWED_ORIGINS` configurado

**Impacto**: Requisições cross-origin falhavam em desenvolvimento/produção

---

## ✅ Correções Implementadas

### 1️⃣ Login.jsx - Restaurado
```jsx
// Agora tem:
- Botão "Conectar com Spotify"
- Redireciona para: window.location.href = "/api/auth/login/"
- Backend inicia OAuth flow automaticamente
```

### 2️⃣ PrivateRoute - Corrigido
```jsx
// Agora:
- Faz fetch para /api/auth/me/ com credentials: "include"
- Envia o cookie session automaticamente
- Verifica se a resposta é 200 OK
- Mostra "Carregando..." enquanto verifica autenticação
```

### 3️⃣ CORS - Configurado Corretamente
```python
# Adicionado em settings.py:
- 'corsheaders' em INSTALLED_APPS
- CorsMiddleware em MIDDLEWARE (após SessionMiddleware)
- CORS_ALLOWED_ORIGINS com localhost, 127.0.0.1, e ngrok URLs
- CORS_ALLOW_CREDENTIALS = True (para cookies HttpOnly)
```

---

## 🔄 Fluxo Correto Agora

```
1. User clica "Conectar com Spotify" em /login
   ↓
2. Frontend: window.location.href = "/api/auth/login/"
   ↓
3. Backend (LoginView): Redireciona para accounts.spotify.com/authorize
   ↓
4. Spotify: User autoriza e redireciona para SPOTIFY_REDIRECT_URI
   ↓
5. Backend (AuthCallbackView): 
   - Troca code por access_token
   - Cria/atualiza UserProfile
   - Gera JWT e SET cookie 'session' (HttpOnly)
   - Redireciona para FRONTEND_URL
   ↓
6. Frontend: PrivateRoute faz fetch a /api/auth/me/
   - Cookie 'session' é enviado automaticamente
   - Resposta 200 → Usuário autenticado ✅
   ↓
7. User acessa /graficos (protected route)
```

---

## 🧪 Teste Agora

1. **Limpe cookies/cache do navegador**
   ```
   DevTools → Application → Cookies → Delete All
   ```

2. **Acesse /login**
   - Deve ver botão verde "Conectar com Spotify"
   - Clique no botão

3. **Autorize no Spotify**
   - Se já estiver logado, aceita permissões
   - Se não, faz login primeiro

4. **Deve redirecionar para FRONTEND_URL**
   - Cookie `session` deve estar setado (HttpOnly)
   - PrivateRoute deve permitir acesso a `/graficos`

---

## 🛠️ Se Ainda Não Funcionar

**Checklist**:
- [ ] `.env` tem valores válidos (IDs, URIs, chaves)?
- [ ] `SPOTIFY_REDIRECT_URI` no `.env` está correto?
- [ ] Backend está rodando em porta esperada?
- [ ] Frontend pode fazer requests ao backend (sem CORS errors)?
- [ ] Cookies estão sendo salvos (DevTools → Application → Cookies)?

**Ver logs**:
```bash
# Backend
docker logs spotcharts-backend  # Ou seu container

# Nginx/Frontend
docker logs spotcharts-frontend

# Browser DevTools
F12 → Console → Network
```

---

## 📝 Resumo das Mudanças

| Arquivo | O Quê | Status |
|---------|-------|--------|
| `frontend/src/components/login/Login.jsx` | Restaurado componente com OAuth | ✅ |
| `frontend/src/routes/PrivateRoute.jsx` | Corrigida autenticação com /api/auth/me/ | ✅ |
| `backend/config/settings.py` | CORS + corsheaders configurado | ✅ |

---

**Próximos passos**: Teste o fluxo completo e verifique os logs de erro se houver problemas.
