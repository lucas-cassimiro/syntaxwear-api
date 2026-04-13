# Copilot Instructions - Syntax Wear API

## Visão Geral do Projeto

API REST em **Node.js + Fastify + TypeScript** para o e-commerce Syntax Wear. Stack: Fastify, Prisma ORM, PostgreSQL (Supabase), JWT auth, Zod validation. Arquitetura em camadas: routes → controllers → services → Prisma.

## Arquitetura e Padrões

### Estrutura de Camadas (Obrigatória)
```
routes/       → Registro de rotas + schemas OpenAPI (Fastify schema)
controllers/  → Validação Zod + chamada de serviços + resposta HTTP
services/     → Lógica de negócio + acesso ao Prisma
```

**Exemplo de fluxo completo:**
- `auth.routes.ts` registra POST /auth/register com schema OpenAPI
- `auth.controller.ts` valida body com `registerSchema` (Zod), chama `registerUser`, retorna JWT
- `auth.service.ts` verifica email único, hash bcrypt, cria user no Prisma

### Validação com Zod
- **SEMPRE** use Zod schemas em `utils/validators.ts` nos controllers
- Parse com `.parse()` (lança ZodError capturado pelo error handler)
- Exemplo: `registerSchema.parse(request.body as RegisterRequest)`

### Convenções de Código

**Slugs automáticos:**
```typescript
body.slug = slugify(body.name, { lower: true, strict: true, locale: "pt" });
```

**Soft deletes:** Use `active: false` em vez de deletar registros (ver `products.service.ts:deleteProduct` e `categories.service.ts:deleteCategory`)

**Soft delete em cascata:** Ao deletar categoria, desativar todos os produtos relacionados automaticamente (ver `categories.service.ts:deleteCategory`)

**Erros em serviços:** Lance `throw new Error("Mensagem em português")` - error handler global captura

**Paginação padrão:** `page=1, limit=10` (ver `products.service.ts:getProducts`)

**Filtros Prisma:** Use `where.OR` para busca multi-campo, `mode: "insensitive"` para case-insensitive

**Transações Prisma:** Use `prisma.$transaction(async (tx) => { ... })` para operações atômicas que modificam múltiplas tabelas (ex: criar Order + OrderItems + decrementar stock)

## Configuração e Desenvolvimento

### Comandos Essenciais
```bash
npm run dev              # Dev server com tsx watch
npm run prisma:migrate   # Aplicar migrations (cria nova migration)
npm run prisma:studio    # UI visual do banco de dados
npm run prisma:seed      # Popular banco com dados iniciais
```

### Autenticação JWT
- Secret em `process.env.JWT_SECRET`
- Middleware `authenticate` em `middlewares/auth.middleware.ts` usa `request.jwtVerify()`
- Token gerado via `request.server.jwt.sign({ userId })`
- Aplicar com `fastify.addHook("onRequest", authenticate)` nas rotas protegidas

### Prisma Schema Atual
- **User**: Role enum (USER/ADMIN), cpf/phone opcionais, bcrypt password hash, relação orders[]
- **Category**: name, slug único, description opcional, soft delete via `active`, relação com Product
- **Product**: categoryId obrigatório (FK para Category), colors/sizes/images como Json, slug único, soft delete via `active`, relação orderItems[]
- **Order**: userId opcional (guest checkout), total calculado, status enum (PENDING/PAID/SHIPPED/DELIVERED/CANCELLED), shippingAddress Json, paymentMethod string, relações user e items[]
- **OrderItem**: orderId, productId, price snapshot, quantity, size opcional, relação order e product

**Tipos Json no Prisma:** Use `as Prisma.JsonObject` para campos Json (não `as any`)

## Integrações Planejadas

### Supabase (docs/PRD-backend.md)
- **Storage:** Upload de imagens de produto (gravar URLs em `Product.images`)
- **CEP:** Integrar viaCEP em POST /shipping/calc para calcular frete
- **Newsletter:** Criar model Subscription (email único)

### Pagamentos
- Criar Order com `status: "pending"`, integrar gateway (Stripe/Pagar.me), webhook atualiza para "paid"

## Testes (Planejado - Vitest)
- **Unit:** Validação CPF, cálculo de totais, filtros/paginação
- **Integration:** Auth endpoints, GET/POST products, POST orders (mock gateway)

## OpenAPI/Swagger
- Docs em `http://localhost:3000/api-docs` (Scalar UI)
- Schemas inline em routes com tags, description, body, response, security
- Exemplo em `products.routes.ts`, `categories.routes.ts` e `auth.routes.ts`

## Endpoints Implementados

### Autenticação (`/auth`)
- POST `/auth/register` - Criar conta
- POST `/auth/signin` - Login

### Produtos (`/products`)
- GET `/products` - Listar com filtros (page, limit, search, categoryId, minPrice, maxPrice, sortBy, sortOrder)
- GET `/products/:id` - Obter produto por ID (inclui categoria)
- POST `/products` - Criar produto (requer categoryId)
- PUT `/products/:id` - Atualizar produto (pode atualizar categoryId)
- DELETE `/products/:id` - Soft delete

### Categorias (`/categories`)
- GET `/categories` - Listar com filtros (page, limit, search) - apenas categorias ativas
- GET `/categories/:id` - Obter categoria por ID
- POST `/categories` - Criar categoria (slug gerado automaticamente)
- PUT `/categories/:id` - Atualizar categoria (slug atualizado se name mudar)
- DELETE `/categories/:id` - Soft delete em cascata (desativa categoria + produtos)

### Pedidos (`/orders`)
- GET `/orders` - Listar com filtros (page, limit, status, userId, startDate, endDate) com includes (user, items, product, category)
- GET `/orders/:id` - Obter pedido por ID com todos os relacionamentos
- POST `/orders` - Criar pedido com validação transacional (verifica estoque, decrementa stock, cria order + orderItems atomicamente)
- PUT `/orders/:id` - Atualizar status ou shippingAddress (não permite alterar items)
- DELETE `/orders/:id` - Cancelar pedido (altera status para CANCELLED sem reversão de estoque)

**Validações em createOrder:**
- Produtos existem e estão ativos
- Estoque suficiente disponível
- Size obrigatório se produto tiver sizes disponíveis
- Cálculo automático de total (snapshot de preços)
- Transação Prisma garante atomicidade (rollback automático em erro)

## Problemas Comuns

**"Token inválido ou expirado":** Verificar `JWT_SECRET` no `.env` e presença do header `Authorization: Bearer <token>`

**Slug duplicado:** Auto-gerado via slugify do `name`, mas pode conflitar - adicionar sufixo numérico se necessário

**Zod vs Fastify validation:** Preferir Zod em controllers; Fastify schema é só para documentação OpenAPI

**Decimal vs Number:** Prisma retorna `Decimal` para price/total - converter com `Number()` ou usar métodos do `decimal.js`

## Próximos Passos (Roadmap)
1. ✅ Implementar model Category e relacionamento Product.categoryId
2. ✅ CRUD completo de categorias com soft delete em cascata
3. ✅ CRUD completo de pedidos (Orders) com validação transacional de estoque
4. Admin endpoints para gerenciamento de usuários
5. Upload de imagens para Supabase Storage
6. Endpoint POST /shipping/calc (viaCEP integration)
7. Testes com Vitest
