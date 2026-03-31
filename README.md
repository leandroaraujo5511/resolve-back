# Resolve + Backend

Backend inicial do Resolve + com `Node.js`, `NestJS`, `TypeScript` e `PostgreSQL`.

## Stack

- NestJS 11
- TypeORM
- PostgreSQL (`pg`)
- JWT + Passport
- `class-validator` / `class-transformer`

## Setup

```bash
npm install
cp .env.example .env
```

## Rodar em desenvolvimento

```bash
npm run start:dev
```

API disponível em `http://localhost:3000/api`.

## Swagger

- UI: `http://localhost:3000/api/docs`
- JSON: `http://localhost:3000/api/docs-json`

## Endpoints atuais + curl

### 1) Health check

- **Rota:** `GET /api`
- **curl:**

```bash
curl -X GET "http://localhost:3000/api"
```

### 2) Login do painel (e-mail e senha)

- **Rota:** `POST /api/auth/login`
- **curl:**

```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@resolve.local",
    "password": "Admin@123"
  }'
```

### 3) Usuário autenticado do painel

- **Rota:** `GET /api/auth/me`
- **curl:**

```bash
curl -X GET "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer <TOKEN>"
```

### 4) Empresa (tenant) do usuário logado

- **Rota:** `GET /api/companies/me`
- **curl:**

```bash
curl -X GET "http://localhost:3000/api/companies/me" \
  -H "Authorization: Bearer <TOKEN>"
```

### 5) Perfil do usuário logado

- **Rota:** `GET /api/users/me`
- **curl:**

```bash
curl -X GET "http://localhost:3000/api/users/me" \
  -H "Authorization: Bearer <TOKEN>"
```

### 6) Lista de departamentos (tenant do token)

- **Rota:** `GET /api/departments`
- **Query opcional:** `status=ativo` ou `status=inativo`
- **curl (todos):**

```bash
curl -X GET "http://localhost:3000/api/departments" \
  -H "Authorization: Bearer <TOKEN>"
```

- **curl (apenas ativos):**

```bash
curl -X GET "http://localhost:3000/api/departments?status=ativo" \
  -H "Authorization: Bearer <TOKEN>"
```

### 7) Lista de usuários do tenant (painel)

- **Rota:** `GET /api/users`
- **Permissão:** apenas **`ADMIN`** (usuários com papel `SECRETARIA` recebem 403).
- **Query opcional:** `departmentId=<uuid>`, `status=ativo` ou `status=inativo`
- **curl (todos da empresa):**

```bash
curl -X GET "http://localhost:3000/api/users" \
  -H "Authorization: Bearer <TOKEN>"
```

- **curl (por departamento e status):**

```bash
curl -G "http://localhost:3000/api/users" \
  -H "Authorization: Bearer <TOKEN>" \
  --data-urlencode "departmentId=<UUID_DEPARTAMENTO>" \
  --data-urlencode "status=ativo"
```

### 8) Lista de chamados (tickets) — painel

- **Rota:** `GET /api/tickets`
- **Query opcional:** `status`, `departmentId`, `priority`, `search`, `page`, `limit`
- **curl (primeira página, 10 itens):**

```bash
curl -X GET "http://localhost:3000/api/tickets?page=1&limit=10" \
  -H "Authorization: Bearer <TOKEN>"
```

- **curl (filtros + busca):**

```bash
curl -G "http://localhost:3000/api/tickets" \
  -H "Authorization: Bearer <TOKEN>" \
  --data-urlencode "status=ABERTO" \
  --data-urlencode "priority=ALTA" \
  --data-urlencode "search=buraco" \
  --data-urlencode "page=1" \
  --data-urlencode "limit=5"
```

### 9) Detalhe do chamado com histórico

- **Rota:** `GET /api/tickets/:id`
- **curl:**

```bash
curl -X GET "http://localhost:3000/api/tickets/<UUID_DO_TICKET>" \
  -H "Authorization: Bearer <TOKEN>"
```

> Use um `id` retornado em `GET /api/tickets` (campo `data[].id`).

### 10) Atualizar chamado (status e/ou departamento)

- **Rota:** `PATCH /api/tickets/:id`
- **Body (JSON):** ao menos um campo — `status` (enum) e/ou `departmentId` (UUID do mesmo tenant)
- **curl (só status):**

```bash
curl -X PATCH "http://localhost:3000/api/tickets/<UUID_DO_TICKET>" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"EM_ANDAMENTO"}'
```

- **curl (status + departamento):**

```bash
curl -X PATCH "http://localhost:3000/api/tickets/<UUID_DO_TICKET>" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "EM_ANALISE",
    "departmentId": "<UUID_DEPARTAMENTO>"
  }'
```

### 11) Adicionar comentário ao histórico

- **Rota:** `POST /api/tickets/:id/history`
- **Body:** `comment` (obrigatório), `isInternal` (opcional, default `false`), `status` (opcional — se enviado, atualiza o chamado)
- **curl:**

```bash
curl -X POST "http://localhost:3000/api/tickets/<UUID_DO_TICKET>/history" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Vistoria agendada para amanhã.",
    "isInternal": false,
    "status": "EM_ANDAMENTO"
  }'
```

### 12) Municípios (público — cadastro no app)

- **Rota:** `GET /api/public/cities` (sem token)
- **curl:**

```bash
curl -X GET "http://localhost:3000/api/public/cities"
```

> Copie um `id` de cidade para usar no cadastro (`cityId`).

### 13) Cadastro do cidadão

- **Rota:** `POST /api/auth/citizen/register`
- **Body:** `phone` (só dígitos, DDD), `name`, `password` (mín. 6), `cityId` (UUID de `GET /public/cities`)
- **curl:**

```bash
curl -X POST "http://localhost:3000/api/auth/citizen/register" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "11988887777",
    "name": "Cidadão Teste",
    "password": "senha123",
    "cityId": "<UUID_CIDADE>"
  }'
```

### 14) Solicitar código OTP (login no app)

- **Rota:** `POST /api/auth/citizen/otp/send`
- **Body:** `{ "phone": "11988887777" }`
- **MVP:** o código de 6 dígitos aparece no **log do servidor** (`OTP_LOG_CODE_IN_CONSOLE=true`).
- **curl:**

```bash
curl -X POST "http://localhost:3000/api/auth/citizen/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"phone":"11988887777"}'
```

### 15) Login cidadão (telefone + OTP)

- **Rota:** `POST /api/auth/citizen/login`
- **Body:** `phone`, `code` (6 dígitos)
- Retorno: `user` (`id`, `companyId`, `cityId`, `cityName`, …) e `token` (**JWT cidadão** — use só no app; não serve nas rotas do painel).
- **curl:**

```bash
curl -X POST "http://localhost:3000/api/auth/citizen/login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "11988887777",
    "code": "123456"
  }'
```

### 16) Perfil do cidadão autenticado

- **Rota:** `GET /api/auth/citizen/me`
- **Header:** `Authorization: Bearer <TOKEN_CIDADÃO>`
- **curl:**

```bash
curl -X GET "http://localhost:3000/api/auth/citizen/me" \
  -H "Authorization: Bearer <TOKEN_CIDADÃO>"
```

### 17) Enviar feedback (cidadão — só na sua cidade)

- **Rota:** `POST /api/feedbacks`
- **Header:** `Authorization: Bearer <TOKEN_CIDADÃO>`
- **Regra:** `companyId` e `cityId` do feedback vêm **apenas** do cadastro do cidadão no banco (não envie `cityId` no JSON).
- **Body:** `type` (`ELOGIO` | `SUGESTAO`), `description`, opcional `citizenName`, `attachments[]`
- **curl:**

```bash
curl -X POST "http://localhost:3000/api/feedbacks" \
  -H "Authorization: Bearer <TOKEN_CIDADÃO>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SUGESTAO",
    "description": "Sugiro mais iluminação na praça."
  }'
```

### 18) Listar feedbacks (painel)

- **Rota:** `GET /api/feedbacks`
- **Header:** `Authorization: Bearer <TOKEN_PAINEL>`
- **Query opcional:** `cityId`, `type`, `page`, `limit`
- **curl:**

```bash
curl -G "http://localhost:3000/api/feedbacks" \
  -H "Authorization: Bearer <TOKEN_PAINEL>" \
  --data-urlencode "page=1" \
  --data-urlencode "limit=20"
```

### 19) Catálogo — categorias de chamado (app cidadão)

- **Rota:** `GET /api/catalogs/ticket-categories`
- **Header:** `Authorization: Bearer <TOKEN_CIDADÃO>`
- **curl:**

```bash
curl -X GET "http://localhost:3000/api/catalogs/ticket-categories" \
  -H "Authorization: Bearer <TOKEN_CIDADÃO>"
```

### 20) Catálogo — bairros da cidade do cidadão

- **Rota:** `GET /api/catalogs/neighborhoods`
- **Header:** `Authorization: Bearer <TOKEN_CIDADÃO>`
- **curl:**

```bash
curl -X GET "http://localhost:3000/api/catalogs/neighborhoods" \
  -H "Authorization: Bearer <TOKEN_CIDADÃO>"
```

### 21) Upload — URL assinada (Cloudflare R2)

- **Rota:** `POST /api/upload/presign`
- **Header:** `Authorization: Bearer <TOKEN_PAINEL>` **ou** `<TOKEN_CIDADÃO>`
- **Body:** `filename`, `contentType` (`image/*` ou `application/pdf`)
- **Requer:** variáveis `R2_*` no `.env` (veja `.env.example`).
- **curl:**

```bash
curl -X POST "http://localhost:3000/api/upload/presign" \
  -H "Authorization: Bearer <TOKEN_CIDADÃO>" \
  -H "Content-Type: application/json" \
  -d '{"filename":"foto.jpg","contentType":"image/jpeg"}'
```

### 22) Chamados — criar / listar / detalhe (app cidadão)

- **Rotas:**
  - `POST /api/citizen/tickets` — abrir chamado (`cityId` vem do cadastro; valida departamento e bairro).
  - `GET /api/citizen/tickets` — meus chamados (paginação igual ao painel).
  - `GET /api/citizen/tickets/:id` — detalhe **sem** histórico interno.
- **Header:** `Authorization: Bearer <TOKEN_CIDADÃO>`
- **curl (criar):**

```bash
curl -X POST "http://localhost:3000/api/citizen/tickets" \
  -H "Authorization: Bearer <TOKEN_CIDADÃO>" \
  -H "Content-Type: application/json" \
  -d '{
    "departmentId": "<UUID_DEPARTAMENTO>",
    "title": "Buraco na via",
    "shortDescription": "Buraco na esquina",
    "detailedDescription": "Descrição completa com pelo menos dez caracteres.",
    "priority": "MEDIA"
  }'
```

## Roteiro de teste geral (smoke)

1. **Painel:** `POST /api/auth/login` → `GET /api/auth/me`, `GET /api/companies/me`, `GET /api/tickets`.
2. **Permissões:** com token **ADMIN**, `GET /api/users` retorna 200; com **SECRETARIA**, deve retornar **403**.
3. **Público:** `GET /api/public/cities?companySlug=default-company` (ajuste se o slug for outro).
4. **Cidadão:** registro → OTP (ver log se `OTP_LOG_CODE_IN_CONSOLE=true`) → login → `GET /api/auth/citizen/me`.
5. **Catálogos:** `GET /api/catalogs/ticket-categories` e `GET /api/catalogs/neighborhoods` com token cidadão.
6. **Chamado:** `POST /api/citizen/tickets` → `GET /api/citizen/tickets` → `GET /api/citizen/tickets/:id` (confira ausência de comentários `isInternal` no JSON).
7. **Painel no ticket:** `GET /api/tickets/:id` deve exibir histórico **com** nota interna (ex.: seed do segundo chamado).
8. **Upload (opcional):** com `R2_*` preenchido, `POST /api/upload/presign` e um `PUT` na URL retornada.
9. **Feedback:** `POST /api/feedbacks` (cidadão) e `GET /api/feedbacks` (painel).

## Seed automático

Ao subir a aplicação:

- Garante `Company` padrão (`default-company`), **cidades** e **departamentos** (SP, RJ, BH, etc.) vinculados a ela.
- Vincula o departamento **Meio Ambiente** à cidade **São Paulo** (`visibleOnlyInCityId`) para demo de categoria por município.
- Garante **bairros** de exemplo (Centro, Zona Norte, Zona Sul) em cada cidade, se ainda não existirem.
- Garante **usuário admin** (se ainda não existir).
- Se ainda não houver tickets na empresa, cria **2 chamados de exemplo** com histórico (protocolo `ANO-000001`, `ANO-000002`), um deles com **entrada de histórico interna** visível só no painel.

Credenciais padrão (alteráveis no `.env`):

- `SEED_ADMIN_EMAIL=admin@resolve.local`
- `SEED_ADMIN_PASSWORD=Admin@123`

## Variáveis de ambiente

Consulte `.env.example`.
