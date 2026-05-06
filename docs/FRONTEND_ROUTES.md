# Documentação das Rotas da Aplicação

## Objetivo
Descrever as rotas iniciais do frontend, indicando o caminho, o componente responsável e o papel de cada página dentro da navegação.

## Visão Geral
A navegação do SpotifyCharts foi organizada de forma simples, priorizando acesso direto às funcionalidades principais desde o início. Há rotas públicas e uma área protegida, respeitando o fluxo de autenticação.

| Rota         | Componente | Finalidade                                                                 | Tipo de acesso |
|--------------|------------|----------------------------------------------------------------------------|----------------|
| `/`          | HomePage   | Página inicial da aplicação, responsável pela apresentação do sistema e ponto de entrada do usuário. | Pública        |
| `/login`     | Login      | Tela de autenticação do usuário. Permite acesso à conta e início da sessão. | Pública        |
| `/registro`  | Register   | Tela de cadastro de novo usuário.                                          | Pública        |
| `/graficos`  | Charts     | Área principal da aplicação, com exibição dos gráficos e estatísticas musicais. | Protegida      |
| `*`          | NotFound   | Página de fallback para rotas inexistentes.                                | Pública        |

## Rotas

### `/`
**Componente:** `HomePage`

**Descrição:** Página inicial. Apresenta a proposta da aplicação, mostra as principais funcionalidades e direciona para login ou cadastro.

### `/login`
**Componente:** `Login`

**Descrição:** Página de autenticação. O usuário informa suas credenciais para entrar no sistema.

### `/registro`
**Componente:** `Register`

**Descrição:** Página de cadastro para novos usuários.

### `/graficos`
**Componente:** `Charts`

**Descrição:** Área principal após login. Exibe os gráficos e dados musicais do usuário. Acesso restrito a usuários autenticados.

## Regras de Navegação

- As rotas `/`, `/login` e `/registro` são **públicas**.
- A rota `/graficos` **exige autenticação**.
- Se o usuário tentar acessar `/graficos` sem estar logado, deve ser redirecionado para `/login`.
- Rotas inexistentes devem levar a uma página de erro (`NotFound`).
- Após login, o usuário é direcionado para `/graficos`.

## Critérios de Aceitação

- Todas as rotas iniciais da aplicação estiverem devidamente identificadas e documentadas, incluindo páginas públicas, protegidas e rota de fallback.
- Os caminhos (paths) de cada rota estiverem definidos de forma consistente, sem ambiguidades e alinhados com a implementação no código.
- Cada rota possuir uma descrição clara da sua finalidade, indicando o papel da página dentro do fluxo da aplicação.
- Para cada rota, estiver explicitado o componente associado e seu comportamento esperado.
- As regras de navegação estiverem bem definidas, incluindo:
  - distinção entre rotas públicas e protegidas;
  - comportamento em caso de usuário não autenticado;
  - redirecionamentos esperados (ex: acesso negado → login);
  - tratamento de rotas inexistentes (fallback/404).
- O fluxo geral de navegação da aplicação puder ser compreendido apenas pela leitura da documentação, sem necessidade de consultar o código.
- A documentação estiver organizada, padronizada e clara o suficiente para servir como referência para:
  - desenvolvimento de novas funcionalidades;
  - manutenção do sistema;
  - alinhamento entre os membros da equipe.