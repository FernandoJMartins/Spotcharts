# Diagramas do Fluxo OAuth + Token Management

## 1. Fluxo de Autorização (Authorization Code)

```mermaid
sequenceDiagram
    participant U as 👤 Usuário
    participant FE as 🌐 Frontend (React)
    participant BE as 🔧 Backend (Django)
    participant S as 🎵 Spotify Web API

    U->>FE: Clica em "Login com Spotify"
    FE->>BE: GET /api/auth/login/
    BE->>BE: Gera state aleátorio
    BE->>U: Set-Cookie: spotify_auth_state
    BE->>U: 302 Redirect Spotify authorize
    
    U->>S: Browser abre Spotify login
    S->>U: Solicita consentimento (scopes)
    U->>S: Clica "Concordar"
    
    S->>BE: Redirect /api/auth/callback/?code=xxx&state=yyy
    
    rect rgb(200, 200, 200)
    Note over BE: Validação (fail-close)
    BE->>BE: ✅ Valida state cookie
    BE->>S: POST /api/token (code + client_secret)
    S->>BE: ✅ Retorna access_token + refresh_token
    BE->>BE: 🔐 Encripta refresh_token (Fernet)
    BE->>BE: ❓ Falhou encriptação?
    BE->>U: ❌ 500 token_encryption_failed
    end
    
    BE->>BE: Cria/atualiza UserProfile
    BE->>BE: Armazena refresh_token_encrypted
    BE->>BE: Gera JWT token
    BE->>U: Set-Cookie: session (JWT, HttpOnly)
    BE->>U: 302 Redirect FRONTEND_URL
    
    FE->>U: ✅ Usuário logado com sucesso
```

---

## 2. Auto-Refresh de Access Token (Middleware)

```mermaid
sequenceDiagram
    participant FE as 🌐 Frontend
    participant MW as 🔧 Middleware
    participant DB as 💾 Database
    participant S as 🎵 Spotify

    FE->>MW: GET /api/me/ + Cookie: session
    
    MW->>MW: 1️⃣ Valida JWT token
    MW->>DB: 2️⃣ Busca UserProfile
    MW->>MW: 3️⃣ Verifica token_expires_at
    
    alt Token ainda válido (+ 30s buffer)
        MW->>MW: ✅ Pula refresh
    else Token expirado
        MW->>DB: 4️⃣ Busca refresh_token_encrypted
        MW->>MW: 5️⃣ Decripta (Fernet)
        MW->>S: 6️⃣ POST /api/token (grant_type=refresh_token)
        S->>MW: 7️⃣ Novo access_token + opcional novo refresh_token
        MW->>MW: 8️⃣ Encripta novo refresh_token
        MW->>DB: 9️⃣ Atualiza refresh_token_encrypted + token_expires_at
        MW->>MW: 🔟 Anexa access_token ao request
    end
    
    MW->>FE: Request continua (com token fresco)
    FE->>S: GET /v1/me (com access_token válido)
    S->>FE: ✅ Retorna dados
```

---

## 3. Estrutura de Dados & Encriptação

```mermaid
graph TB
    subgraph "🗄️ Database (SQLite/PostgreSQL)"
        UP["UserProfile<br/>─────────<br/>id (pk)<br/>spotify_id (unique)<br/>display_name<br/>email<br/>refresh_token_encrypted 🔐<br/>token_expires_at<br/>last_sync"]
    end
    
    subgraph "🌐 Frontend (Browser)"
        JS["JavaScript<br/>─────────<br/>Cookie: session<br/>(JWT, HttpOnly)<br/><br/>Nunca armazena<br/>refresh_token"]
    end
    
    subgraph "🔐 Encriptação (Fernet)"
        ENC["Refresh Token<br/>─────────<br/>Plain: <br/>AQICxxxxx...<br/><br/>Encrypted:<br/>gAAAAABxx..."]
    end
    
    subgraph "🎵 Spotify"
        SP["Spotify Web API<br/>─────────<br/>- Token endpoint<br/>- User API<br/>- Top tracks API"]
    end
    
    JS -->|Set-Cookie| UP
    UP -->|Armazena| ENC
    ENC -->|Decripta| UP
    UP -->|access_token| SP
    SP -->|refresh_token| UP
    
    style UP fill:#d4edda
    style JS fill:#cfe2ff
    style ENC fill:#fff3cd
    style SP fill:#f8d7da
```

---

## 4. Fluxo de Logout

```mermaid
sequenceDiagram
    participant U as 👤 Usuário
    participant FE as 🌐 Frontend
    participant BE as 🔧 Backend
    participant DB as 💾 Database

    U->>FE: Clica em "Logout"
    FE->>BE: POST /api/auth/logout/ + Cookie: session
    
    BE->>BE: Valida JWT
    BE->>DB: Busca UserProfile
    BE->>DB: ⚠️ Limpa refresh_token_encrypted
    BE->>DB: ⚠️ Limpa token_expires_at
    BE->>DB: ✅ Salva mudanças
    
    BE->>U: Delete-Cookie: session (Max-Age=0)
    BE->>U: 200 OK {"detail": "logged_out"}
    
    FE->>U: ✅ Usuário deslogado
    U->>U: Cookies limpos (DevTools)
```

---

## 5. Validação de Segurança (Fail-Close)

```mermaid
graph LR
    subgraph "Cenário: Encriptação falha"
        A["Token recebido<br/>do Spotify"]
        B{"TOKEN_ENC_KEY<br/>válida?"}
        C["🔒 Encripta<br/>refresh_token"]
        D["❌ Erro na<br/>encriptação"]
        E["❌ Retorna 500<br/>token_encryption_failed<br/><br/>(Não armazena!)"]
        F["🛑 Não prossegue<br/>com login"]
    end
    
    A -->|Tenta encriptar| B
    B -->|Sim| C
    B -->|Não| D
    C -->|Ok| B
    D --> E
    E --> F
    
    style D fill:#f8d7da
    style E fill:#f8d7da
    style F fill:#f8d7da
```

---

## 6. Camadas de Segurança (Defense in Depth)

```mermaid
graph TB
    subgraph "🛡️ Camada 1: Transport (HTTPS)"
        H["TLS 1.3<br/>Encriptação de dados em trânsito"]
    end
    
    subgraph "🛡️ Camada 2: Session (JWT + Cookies)"
        S["HttpOnly Cookies<br/>Secure Flag<br/>SameSite=Strict<br/>CSRF token (state)"]
    end
    
    subgraph "🛡️ Camada 3: Token Storage"
        T["Refresh Token<br/>Encriptado (Fernet)<br/>Access Token<br/>Não armazenado"]
    end
    
    subgraph "🛡️ Camada 4: API Auth"
        A["JWTAuthentication<br/>Request.user validação<br/>IsAuthenticated permission"]
    end
    
    subgraph "🛡️ Camada 5: Error Handling"
        E["Fail-Close<br/>Não armazena sem encriptação<br/>Graceful degradation"]
    end
    
    H --> S
    S --> T
    T --> A
    A --> E
    
    style H fill:#90EE90
    style S fill:#87CEEB
    style T fill:#FFD700
    style A fill:#DDA0DD
    style E fill:#FF6347
```

---

## 7. Estados do Usuário (State Machine)

```mermaid
stateDiagram-v2
    [*] --> NotLogged
    
    NotLogged -->|GET /api/auth/login/| AuthorizingSpotify
    AuthorizingSpotify -->|Usuário concorda| SpotifyRedirectsBack
    SpotifyRedirectsBack -->|Code + State validado| ExchangingCode
    ExchangingCode -->|❌ Token encryption failed| ExchangingCode: Error 500
    ExchangingCode -->|✅ Encriptação ok| UserCreated
    ExchangingCode -->|❌ Spotify error| NotLogged: 502 Bad Gateway
    
    UserCreated -->|JWT gerado| LoggedIn
    LoggedIn -->|GET /api/me/| LoggedIn: OK
    LoggedIn -->|POST /api/auth/refresh/| TokenRefreshed
    TokenRefreshed -->|Novo token ok| LoggedIn
    TokenRefreshed -->|❌ Refresh failed| NotLogged: 401 Unauthorized
    
    LoggedIn -->|POST /api/auth/logout/| NotLogged
    LoggedIn -->|Token expirou| NotLogged: 401
    
    NotLogged -->|Old JWT| NotLogged: 401 Unauthorized
```

---

## 8. Fluxo de Teste E2E (Quick Reference)

```mermaid
graph LR
    T1["1️⃣ Login"]
    T2["2️⃣ Verificar<br/>/api/me/"]
    T3["3️⃣ Auto-refresh<br/>(simular expiração)"]
    T4["4️⃣ Refresh manual"]
    T5["5️⃣ Logout"]
    
    T1 -->|✅| T2
    T2 -->|✅| T3
    T3 -->|✅| T4
    T4 -->|✅| T5
    T5 -->|✅ FIM|
    
    T1 -.->|❌| FAIL["Troubleshoot:<br/>- Spotify credentials<br/>- .env vars<br/>- TOKEN_ENC_KEY"]
    
    style T1 fill:#d4edda
    style T2 fill:#d4edda
    style T3 fill:#d4edda
    style T4 fill:#d4edda
    style T5 fill:#d4edda
    style FAIL fill:#f8d7da
```

---

## Resumo Visual

| Aspecto | Status | Detalhes |
|---------|--------|----------|
| **Authorization Code** | ✅ | State param, code exchange no backend |
| **Qualquer usuário** | ✅ | `update_or_create` sem whitelist |
| **Token Storage** | ✅ | Refresh encriptado, access com TTL |
| **Auto-Refresh** | ✅ | Middleware + 30s buffer |
| **Segurança** | ✅ | HTTPS, HttpOnly cookies, fail-close |
| **Testes** | 📖 | Ver [TESTING_OAUTH_FLOW.md](TESTING_OAUTH_FLOW.md) |

