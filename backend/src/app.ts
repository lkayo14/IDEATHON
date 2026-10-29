import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { prisma } from './db/prisma.js';
import { aiOrchestrator } from './modules/ai/ai.orchestrator.js';
import { whatsAppService } from './modules/whatsapp/whatsapp.service.js';
import { storeService } from './modules/store/store.service.js';
import { productService } from './modules/product/product.service.js';
import { storageService } from './modules/storage/storage.service.js';
import { conversationService } from './modules/conversation/conversation.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildApp() {
  const app = Fastify({
    logger: false,
  });

  // CORS aberto para desenvolvimento
  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Multipart para upload de imagens
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // Servir arquivos de uploads estaticamente
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
  await app.register(fastifyStatic, {
    root: env.UPLOAD_DIR,
    prefix: '/uploads/',
  });

  // =========================================================================
  // 1. HEALTH CHECK & STATUS DAS INTEGRAÇÕES
  // =========================================================================
  app.get('/api/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      integrations: {
        gemini: {
          configured: env.isGeminiConfigured,
          model: env.GEMINI_MODEL,
          mode: env.isGeminiConfigured ? 'GEMINI_API' : 'DEMO_FALLBACK',
          notice: env.isGeminiConfigured
            ? `Conectado à Gemini API (${env.GEMINI_MODEL})`
            : 'Modo Demonstração Ativo (Regras Inteligentes determinísticas)',
        },
        whatsapp: {
          configured: env.isWhatsAppConfigured,
          provider: env.whatsAppProvider,
          mode:
            env.whatsAppProvider === 'ZAPI'
              ? 'ZAPI_GATEWAY'
              : env.whatsAppProvider === 'META_CLOUD'
              ? 'OFFICIAL_CLOUD_API'
              : 'WEB_SIMULATOR',
          notice:
            env.whatsAppProvider === 'ZAPI'
              ? `Z-API Conectada (Instância: ${env.ZAPI_INSTANCE_ID})`
              : env.whatsAppProvider === 'META_CLOUD'
              ? 'WhatsApp Cloud API Oficial Conectada'
              : 'Simulador Web Ativo (Mesmo fluxo de regras de negócio)',
        },
        storage: {
          provider: 'local',
          status: 'ready',
          uploadDir: env.UPLOAD_DIR,
        },
      },
    };
  });

  // =========================================================================
  // 2. WHATSAPP CLOUD API OFICIAL WEBHOOK
  // =========================================================================
  app.get('/api/whatsapp/webhook', async (req, reply) => {
    const query = req.query as {
      'hub.mode'?: string;
      'hub.verify_token'?: string;
      'hub.challenge'?: string;
    };

    const challenge = whatsAppService.verifyWebhook(
      query['hub.mode'],
      query['hub.verify_token'],
      query['hub.challenge']
    );

    if (challenge) {
      return reply.status(200).send(challenge);
    }
    return reply.status(403).send('Forbidden');
  });

  app.post('/api/whatsapp/webhook', async (req, reply) => {
    try {
      const body = req.body as any;
      // Detecção automática se o payload veio da Z-API ou da Meta Cloud API
      if (body?.phone || body?.isGroup !== undefined || body?.zaapId) {
        await whatsAppService.processZApiWebhook(body);
      } else {
        await whatsAppService.processWebhookEvent(body);
      }
      return reply.status(200).send({ status: 'EVENT_RECEIVED' });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: err.message });
    }
  });

  // Endpoint dedicado para webhook da Z-API (on-message-received)
  app.post('/api/whatsapp/zapi/webhook', async (req, reply) => {
    try {
      await whatsAppService.processZApiWebhook(req.body);
      return reply.status(200).send({ status: 'ZAPI_EVENT_RECEIVED' });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: err.message });
    }
  });

  // =========================================================================
  // 3. SIMULADOR WEB DE WHATSAPP (FRONTEND TEST & DEMODAY)
  // =========================================================================
  app.post('/api/simulator/chat', async (req, reply) => {
    const body = req.body as {
      vendorPhone: string;
      senderName?: string;
      messageText: string;
      mediaUrl?: string;
      mediaType?: string;
    };

    if (!body.vendorPhone) {
      return reply.status(400).send({ error: 'vendorPhone é obrigatório' });
    }

    try {
      const result = await aiOrchestrator.handleIncomingMessage({
        vendorPhone: body.vendorPhone,
        senderName: body.senderName || 'Vendedor Demo',
        messageText: body.messageText || '',
        mediaUrl: body.mediaUrl,
        mediaType: body.mediaType,
      });

      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Upload no simulador
  app.post('/api/simulator/upload', async (req, reply) => {
    try {
      const data = await req.file();
      if (!data) {
        return reply.status(400).send({ error: 'Nenhum arquivo enviado' });
      }

      const buffer = await data.toBuffer();
      const saved = await storageService.saveBuffer(buffer, data.filename, data.mimetype);

      return reply.send({
        url: saved.url,
        filename: saved.filename,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Upload em base64 (drag and drop ou colagem direta)
  app.post('/api/simulator/upload-base64', async (req, reply) => {
    const body = req.body as { base64Data: string; prefix?: string };
    if (!body?.base64Data) {
      return reply.status(400).send({ error: 'base64Data é obrigatório' });
    }

    try {
      const saved = await storageService.saveBase64(body.base64Data, body.prefix || 'upload');
      return reply.send(saved);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Histórico do chat do simulador
  app.get('/api/simulator/history', async (req, reply) => {
    const query = req.query as { phone?: string };
    const phone = query.phone || '5585999998888';
    const conversation = await conversationService.getOrCreateConversation(phone);
    const messages = await conversationService.getRecentMessages(conversation.id, 50);
    const store = await storeService.getStoreByVendorPhone(phone);
    const pendingAction = conversationService.parsePendingAction(conversation.pendingAction);

    return reply.send({
      conversationId: conversation.id,
      phone,
      store,
      pendingAction,
      messages,
    });
  });

  // Reset do simulador para nova apresentação
  app.post('/api/simulator/reset', async (req, reply) => {
    const query = req.query as { phone?: string };
    const phone = query.phone || '5585999998888';
    const cleanPhone = phone.replace(/\D/g, '');

    const conversation = await prisma.conversation.findFirst({
      where: { vendorPhone: cleanPhone },
    });

    if (conversation) {
      await prisma.message.deleteMany({ where: { conversationId: conversation.id } });
      await prisma.conversation.delete({ where: { id: conversation.id } });
    }

    return reply.send({ success: true, message: 'Conversa reiniciada com sucesso.' });
  });

  // =========================================================================
  // 4. ROTAS DO MARKETPLACE E CATÁLOGO PÚBLICO
  // =========================================================================
  // Listar todas as lojas
  app.get('/api/stores', async () => {
    return storeService.listAllStores();
  });

  // Listar segmentos únicos de lojas
  app.get('/api/stores/segments', async () => {
    return storeService.listSegments();
  });

  // Listar regiões / comunidades únicas de lojas
  app.get('/api/stores/regions', async () => {
    return storeService.listRegions();
  });

  // Obter loja por slug ou ID
  app.get('/api/stores/:idOrSlug', async (req, reply) => {
    const { idOrSlug } = req.params as { idOrSlug: string };
    const store = await storeService.getStoreByIdOrSlug(idOrSlug);
    if (!store) {
      return reply.status(404).send({ error: 'Loja não encontrada' });
    }
    return store;
  });

  // Obter catálogo de produtos de uma loja
  app.get('/api/stores/:idOrSlug/products', async (req, reply) => {
    const { idOrSlug } = req.params as { idOrSlug: string };
    const query = req.query as { category?: string; status?: string; maxPrice?: string };

    const store = await storeService.getStoreByIdOrSlug(idOrSlug);
    if (!store) {
      return reply.status(404).send({ error: 'Loja não encontrada' });
    }

    const products = await productService.listProductsByStore(store.id, {
      category: query.category,
      status: query.status,
      maxPrice: query.maxPrice ? parseFloat(query.maxPrice) : undefined,
    });

    return {
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        logoUrl: store.logoUrl,
        segment: store.segment,
        description: store.description,
        paymentMethods: store.paymentMethods,
        deliveryInfo: store.deliveryInfo,
      },
      products,
    };
  });

  // Produtos em destaque para o feed inicial do marketplace (estilo OLX)
  app.get('/api/products/featured', async () => {
    return productService.listFeaturedProducts();
  });

  // Detalhe de um produto individual
  app.get('/api/products/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const product = await productService.getProductById(id);
    if (!product) {
      return reply.status(404).send({ error: 'Produto não encontrado' });
    }
    return product;
  });

  return app;
}
