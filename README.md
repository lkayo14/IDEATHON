# ZapMarketplace AI 🛍️🤖

> **Marketplace operado integralmente pelo WhatsApp com Inteligência Artificial (Google Gemini API).**

Permite que qualquer lojista crie, configure e administre sua loja inteira conversando naturalmente pelo WhatsApp: envio de fotos de produtos, extração automática de preços e estoque, edição de anúncios, movimentação de inventário e catálogo web público em tempo real.

---

## 📑 Sumário

- [Visão Geral & Arquitetura](#visão-geral--arquitetura)
- [Estado das Integrações (Transparência de Credenciais)](#estado-das-integrações)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Como Executar Localmente](#como-executar-localmente)
- [Roteiro de Demonstração (Demoday - 3 a 5 min)](#roteiro-de-demonstração)
- [Deploy no Railway](#deploy-no-railway)
- [Configuração de Credenciais Reais](#configuração-de-credenciais-reais)
- [Testes Automatizados](#testes-automatizados)

---

## 🏛️ Visão Geral & Arquitetura

O sistema adota uma arquitetura modular desacoplada onde a **lógica de negócios é única e independente do canal de entrada**:

```
                  ┌────────────────────────┐
                  │ WhatsApp Cloud API     │
                  │ (Webhook Meta Oficial) │
                  └───────────┬────────────┘
                              │
  ┌────────────────────────┐  │
  │ Simulador Web Front    │  │  (Mesmo payload)
  │ (React + Vite)         ├──┴─────────────────────┐
  └────────────────────────┘                        │
                                                    ▼
                                   ┌─────────────────────────────────┐
                                   │ AI Orchestrator & State Machine │
                                   └────────────────┬────────────────┘
                                                    │
                   ┌────────────────────────────────┴────────────────────────────────┐
                   ▼                                                                 ▼
      ┌─────────────────────────┐                                       ┌─────────────────────────┐
      │ Google Gemini Service   │ (Com GEMINI_API_KEY)                  │ Intelligent Fallback    │ (Sem credencial)
      │ SDK @google/genai       │                                       │ Motor de Regras         │
      │ Visão + Function Calling│                                       │ Determinísticas         │
      └────────────┬────────────┘                                       └────────────┬────────────┘
                   │                                                                 │
                   └────────────────────────────────┬────────────────────────────────┘
                                                    ▼
                                   ┌─────────────────────────────────┐
                                   │ Regras de Negócio (Store/Prod)  │
                                   └────────────────┬────────────────┘
                                                    ▼
                                   ┌─────────────────────────────────┐
                                   │ Prisma ORM (SQLite / PostgreSQL)│
                                   └────────────────┬────────────────┘
                                                    ▼
                                   ┌─────────────────────────────────┐
                                   │ Vitrine Pública & Catálogo Web  │
                                   └─────────────────────────────────┘
```

---

## 🔍 Estado das Integrações

O projeto foi construído para **iniciar e operar 100% de ponta a ponta sem bloqueios**, mesmo quando nenhuma credencial externa estiver configurada:

| Componente | Status Atual | Modo de Execução | Como Conectar Modo Real |
| :--- | :--- | :--- | :--- |
| **Inteligência Artificial** | 🟡 **Modo Demonstração** *(Sem Chave)* | Motor de processamento determinístico com extração de preços, estoque e criação de rascunhos | Preencher `GEMINI_API_KEY` e `GEMINI_MODEL` no `.env` |
| **WhatsApp** | 🟣 **Simulador Web Ativo** | Interface interativa idêntica ao WhatsApp Web no painel com botões rápidos e upload de fotos | Preencher `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` e configurar Webhook |
| **Banco de Dados** | 🟢 **Conectado** | SQLite local (`file:./backend/prisma/dev.db`) sem dependências externas | Para Railway/Postgres, definir `DATABASE_URL=postgresql://...` |
| **Armazenamento de Fotos** | 🟢 **Conectado** | Uploads locais em `/uploads` servidos estaticamente via Fastify | Adaptável para Supabase Storage / S3 via `STORAGE_PROVIDER` |

---

## 🚀 Tecnologias Utilizadas

- **Backend:** Node.js v20+, TypeScript, Fastify HTTP Framework.
- **ORM & Banco:** Prisma ORM, SQLite (desenvolvimento local zero-config) e PostgreSQL (produção).
- **IA Generativa & Visão:** SDK oficial `@google/genai` (Google Gemini API) com Function Calling controlado.
- **Frontend:** React 18, Vite, TypeScript, Lucide Icons, Vanilla CSS com design tokens modernos e layout responsivo.
- **Testes:** Vitest (14 testes cobrindo criação de loja, validação de produtos, proteção contra estoque negativo e máquina de estados).

---

## 💻 Como Executar Localmente

### 1. Pré-requisitos
- Node.js 20+ instalado.
- Git.

### 2. Instalação das dependências
```bash
npm install
```

### 3. Configurar banco de dados e dados de demonstração
```bash
npm --prefix backend run prisma:push
npm --prefix backend run prisma:seed
```

### 4. Iniciar servidores de desenvolvimento
Em dois terminais separados (ou usando `npm run dev`):

**Terminal 1 — Backend (Porta 3001):**
```bash
npm --prefix backend run dev
```

**Terminal 2 — Frontend (Porta 5173):**
```bash
npm --prefix frontend run dev
```

Abra no navegador: **`http://localhost:5173/`**

---

## 🎬 Roteiro de Demonstração (Demoday - 3 a 5 min)

O aplicativo conta com uma visualização dividida (*Split View*): o simulador de WhatsApp à esquerda e o catálogo em tempo real à direita.

### Passo 1: Apresentação da Arquitetura (30s)
1. Mostre a barra superior de status com as indicações transparentes: IA Gemini, WhatsApp e Banco.
2. Explique que o WhatsApp é a **única interface necessária para o vendedor administrar sua empresa**.

### Passo 2: Alteração de Preço em Tempo Real (45s)
1. No WhatsApp Simulator, clique no atalho **`💰 Mudar Preço R$ 64,90`** (ou digite: *"Mude o preço da camiseta preta para R$ 64,90"*).
2. Clique em **Enviar**.
3. Veja o assistente responder com a confirmação da alteração.
4. **Observe o catálogo web atualizar instantaneamente o preço do produto para R$ 64,90.**

### Passo 3: Movimentação de Estoque Inteligente (45s)
1. Digite no WhatsApp: *"Chegaram mais 10 unidades do tênis"* e envie.
2. Veja o assistente registrar a entrada incremental de estoque.
3. Em seguida, digite: *"Vendi 3 unidades da camiseta"* e envie.
4. Veja o assistente debitar as unidades e alertar o novo saldo.

### Passo 4: Cadastro de Produto com Imagem e Confirmação (1 min)
1. No simulador, clique no atalho da **Camiseta Preta** ou **Vestido Primavera** (ou anexe uma imagem própria com o clipe/botão de câmera).
2. O assistente analisa a imagem e o texto, monta um resumo do anúncio e solicita a confirmação do lojista:
   - *Nome, Preço, Estoque, Categoria e Foto*.
3. Clique no botão verde **`Confirmar`** ou digite *"confirmar"*.
4. O anúncio é publicado e aparece no catálogo da loja imediatamente com badge de status.

### Passo 5: Consultas e Regras de Negócio (45s)
1. Digite: *"Quais produtos estão sem estoque?"*.
2. O assistente listará a Bolsa em Couro (0 un.) e orientará como repor.
3. Digite: *"Pause o anúncio do vestido"*.
4. Veja o status do produto mudar para "Pausado" (amarelo) no catálogo.
5. Clique em qualquer produto da vitrine para abrir o modal de detalhes com o botão *"Pedir pelo WhatsApp"*.

---

## ☁️ Deploy no Railway

O projeto inclui `Dockerfile` multi-stage otimizado e `railway.json`.

1. Crie um novo projeto no [Railway](https://railway.app).
2. Conecte este repositório do GitHub.
3. Adicione um plugin **PostgreSQL** no Railway.
4. Defina as variáveis de ambiente no painel do Railway:
   - `DATABASE_URL` (injetada automaticamente pelo PostgreSQL do Railway)
   - `GEMINI_API_KEY` (sua chave da Gemini API)
   - `GEMINI_MODEL` = `gemini-2.5-flash`
   - `WHATSAPP_TOKEN` (seu token da Meta)
   - `WHATSAPP_PHONE_NUMBER_ID` (seu Phone ID da Meta)
   - `WHATSAPP_VERIFY_TOKEN` = `seu_token_secreto`
5. O Railway executará o build automaticamente e subirá a aplicação.

---

## 🔑 Configuração de Credenciais Reais

### Google Gemini API (`@google/genai`)
1. Obtenha uma chave gratuita no [Google AI Studio](https://aistudio.google.com/).
2. Insira no seu arquivo `.env`:
   ```env
   GEMINI_API_KEY="AIzaSy..."
   GEMINI_MODEL="gemini-2.5-flash"
   ```
3. Reinicie o backend. O sistema detectará automaticamente a chave e o banner mudará para `Gemini (gemini-2.5-flash) Conectado`.

### Opção A: WhatsApp via Z-API (Recomendado para QR Code imediato)
1. Crie ou acerte uma instância no [Painel da Z-API](https://z-api.io/).
2. Conecte seu número lendo o QR Code no painel da Z-API.
3. Copie o **ID da Instância** e o **Token**.
4. No arquivo `backend/.env`, preencha:
   ```env
   ZAPI_INSTANCE_ID="SEU_ID_DE_INSTANCIA"
   ZAPI_INSTANCE_TOKEN="SEU_TOKEN_DA_INSTANCIA"
   ZAPI_CLIENT_TOKEN="" # Se configurou Client-Token de segurança
   ```
5. No painel da Z-API, na aba **Webhooks**, ative o webhook **"Ao receber mensagem" (on-message-received)** apontando para:
   - Localmente (usando túnel como ngrok/localtunnel): `https://seu-link-ngrok.app/api/whatsapp/zapi/webhook`
   - Em produção (Railway): `https://seu-app.railway.app/api/whatsapp/zapi/webhook`

### Opção B: WhatsApp Business Cloud API (Meta Oficial)
1. Crie um App no [Meta for Developers](https://developers.facebook.com/) do tipo Empresa.
2. Adicione o produto **WhatsApp**.
3. Copie o **Token de Acesso** e o **Identificador do número de telefone (Phone Number ID)**.
4. No arquivo `backend/.env`, preencha:
   ```env
   WHATSAPP_TOKEN="EAA..."
   WHATSAPP_PHONE_NUMBER_ID="123456789"
   WHATSAPP_VERIFY_TOKEN="ideathon_verify_token_123"
   ```
5. Configure a URL do Webhook no painel da Meta:
   - **URL de Retorno de Chamada:** `https://seu-dominio/api/whatsapp/webhook`
   - **Token de Verificação:** `ideathon_verify_token_123`
   - **Campos de Assinatura:** `messages`.

---

## 🧪 Testes Automatizados

O projeto conta com suíte de testes unitários e de integração validando todas as regras de negócio:

```bash
npm --prefix backend test
```

Testes inclusos:
- ✅ Geração correta e higienização de Slugs de loja.
- ✅ Criação e atualização de loja via WhatsApp.
- ✅ Formatação de resumos comerciais amigáveis.
- ✅ Validação estrita de preços e estoques negativos.
- ✅ Operações de estoque: absoluto (SET), incremental positivo (+), incremental negativo (-).
- ✅ Proteção e rejeição de movimentações que deixariam o estoque negativo.
- ✅ Pausa e republicação de anúncios.
- ✅ Processamento de linguagem natural: alteração de preços, novos anúncios e confirmação.
