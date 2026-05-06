# Conexao com a API do Spotify (Status Atual)

Este documento descreve como a aplicacao se conecta a API do Spotify e o que esta implementado ate o momento.

## Visao Geral
- A autenticacao usa o fluxo OAuth Authorization Code (Spotify).
- O backend troca o code por tokens, salva refresh token encriptado e emite um JWT de sessao.
- O frontend pode consumir as rotas do backend para autenticar e buscar dados.

## Endpoints Implementados (Backend)
- GET /api/auth/login/
  - Inicia o fluxo OAuth (redireciona para Spotify).
- GET /api/auth/callback/
  - Recebe o code, troca por tokens, salva o usuario e define cookie de sessao.
- GET /api/auth/me/
  - Retorna o perfil do usuario autenticado.
- POST /api/auth/refresh/
  - Faz refresh manual do access_token usando o refresh_token armazenado.
- POST /api/auth/logout/
  - Limpa o cookie de sessao e opcionalmente remove o refresh_token.
- GET /api/auth/top-tracks/
  - Retorna lista minima de top tracks (id, name, artists, uri).
  - Params: period (short|medium|long), limit (1-50).

## Fluxo de Autenticacao (Resumo)
1. Usuario acessa /api/auth/login/.
2. Spotify redireciona para /api/auth/callback/ com code.
3. Backend troca code por tokens e busca /v1/me.
4. Backend salva UserProfile e emite cookie session (JWT).
5. Cliente usa o cookie ou Authorization Bearer para chamar rotas autenticadas.

## Tokens e Seguranca
- Refresh token e armazenado encriptado.
- JWT de sessao e HttpOnly e SameSite=Strict.
- Middleware tenta auto-refresh do access token quando necessario.

## Configuracao Necessaria
- SPOTIFY_CLIENT_ID
- SPOTIFY_CLIENT_SECRET
- SPOTIFY_REDIRECT_URI
- SPOTIFY_SCOPES (opcional)
- FRONTEND_URL (para redirect final do callback)
- JWT_SECRET (assinatura do JWT)
- TOKEN_ENC_KEY (recomendado para encriptar refresh token)

## Estado Atual
- Autenticacao Spotify completa no backend.
- Rota de top tracks implementada para validar consumo da API.
- Documentacao de testes disponivel em implementation-plans/spotify-api-testing.md.

## Limitacoes Atuais
- Frontend ainda esta com telas placeholder (sem integracao completa).
- Nao ha cache de dados Spotify.
- Nao ha rotas de top artists ou historico adicional.

## Proximos Passos (Sugeridos)
- Adicionar endpoint de top artists.
- Integrar frontend (login, estado do usuario, listagem de tracks).
- Adicionar tratamento de erros e loading no frontend.
- Considerar cache de respostas Spotify.
