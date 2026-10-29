import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/db/prisma.js';
import { storeService } from '../src/modules/store/store.service.js';
import { productService } from '../src/modules/product/product.service.js';
import { demoFallbackService } from '../src/modules/ai/demo-fallback.service.js';
import { conversationService } from '../src/modules/conversation/conversation.service.js';

describe('Regras de Negócio e Serviços do Marketplace', () => {
  const testPhone = '5511888887777';
  let createdStoreId = '';

  beforeAll(async () => {
    // Limpeza de teste
    const vendor = await prisma.vendor.findUnique({ where: { phone: testPhone } });
    if (vendor) {
      await prisma.store.deleteMany({ where: { vendorId: vendor.id } });
      await prisma.vendor.delete({ where: { id: vendor.id } });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('StoreService', () => {
    it('deve gerar slugs amigáveis com remoção de acentos', () => {
      const slug = storeService.generateSlug('Loja & Café do João — São Paulo');
      expect(slug).toBe('loja-cafe-do-joao-sao-paulo');
    });

    it('deve criar uma nova loja associada ao vendedor', async () => {
      const store = await storeService.upsertStore(testPhone, {
        name: 'Boutique Elegance Teste',
        segment: 'Moda Feminina',
        paymentMethods: 'Pix, Cartão',
      });

      expect(store).toBeDefined();
      expect(store.name).toBe('Boutique Elegance Teste');
      expect(store.slug).toBe('boutique-elegance-teste');
      createdStoreId = store.id;
    });

    it('deve formatar resumo legível da loja', async () => {
      const store = await storeService.getStoreByVendorPhone(testPhone);
      const summary = storeService.formatStoreSummary(store);
      expect(summary).toContain('Boutique Elegance Teste');
      expect(summary).toContain('Pix, Cartão');
    });
  });

  describe('ProductService', () => {
    let createdProductId = '';

    it('deve criar um produto com validações de preço e estoque', async () => {
      const product = await productService.createProduct({
        storeId: createdStoreId,
        name: 'Camisa Linho Branca',
        price: 89.90,
        stock: 12,
        category: 'Roupas',
      });

      expect(product.id).toBeDefined();
      expect(product.price).toBe(89.9);
      expect(product.stock).toBe(12);
      expect(product.status).toBe('PUBLISHED');
      createdProductId = product.id;
    });

    it('deve rejeitar produtos com preço ou estoque negativos', async () => {
      await expect(
        productService.createProduct({
          storeId: createdStoreId,
          name: 'Produto Inválido',
          price: -10,
          stock: 5,
        })
      ).rejects.toThrow('não pode ser negativo');

      await expect(
        productService.createProduct({
          storeId: createdStoreId,
          name: 'Produto Inválido 2',
          price: 10,
          stock: -5,
        })
      ).rejects.toThrow('não pode ser negativa');
    });

    it('deve atualizar estoque absoluto (SET)', async () => {
      const res = await productService.updateStock(createdStoreId, 'Camisa Linho', 25, 'SET');
      expect(res.newStock).toBe(25);
    });

    it('deve adicionar estoque incremental (INCREMENT)', async () => {
      const res = await productService.updateStock(createdStoreId, 'Camisa Linho', 5, 'INCREMENT');
      expect(res.newStock).toBe(30);
    });

    it('deve subtrair estoque incremental (DECREMENT)', async () => {
      const res = await productService.updateStock(createdStoreId, 'Camisa Linho', 10, 'DECREMENT');
      expect(res.newStock).toBe(20);
    });

    it('deve impedir que o estoque fique negativo no decremento', async () => {
      await expect(
        productService.updateStock(createdStoreId, 'Camisa Linho', 50, 'DECREMENT')
      ).rejects.toThrow('estoque ficaria negativo');
    });

    it('deve pausar e republicar anúncio', async () => {
      const paused = await productService.setProductStatus(createdStoreId, 'Camisa Linho', 'PAUSED');
      expect(paused.status).toBe('PAUSED');

      const published = await productService.setProductStatus(createdStoreId, 'Camisa Linho', 'PUBLISHED');
      expect(published.status).toBe('PUBLISHED');
    });
  });

  describe('DemoFallbackService (Processamento de Linguagem Natural)', () => {
    it('deve processar comando de alteração de preço', async () => {
      const res = await demoFallbackService.processMessage({
        vendorPhone: testPhone,
        messageText: 'Mude o preço da Camisa Linho Branca para R$ 94,90',
      });

      expect(res.replyText).toContain('94,90');
      expect(res.actionTaken).toBe('PRICE_UPDATED');
    });

    it('deve processar comando de atualização incremental de estoque', async () => {
      const res = await demoFallbackService.processMessage({
        vendorPhone: testPhone,
        messageText: 'Chegaram mais 15 unidades da Camisa Linho',
      });

      expect(res.replyText).toContain('+15 unidades');
      expect(res.actionTaken).toBe('STOCK_INCREMENTED');
    });

    it('deve extrair rascunho de novo anúncio e solicitar confirmação', async () => {
      const res = await demoFallbackService.processMessage({
        vendorPhone: testPhone,
        messageText: 'Essa é uma Jaqueta Jeans Vintage. Custa R$ 149,90 e tenho 8 unidades.',
      });

      expect(res.replyText).toContain('Resumo do anúncio para publicação');
      expect(res.replyText).toContain('149,90');
      expect(res.replyText).toContain('8 un');
      expect(res.replyText).toContain('confirmar');
    });

    it('deve publicar o anúncio quando o vendedor disser "confirmar"', async () => {
      const res = await demoFallbackService.processMessage({
        vendorPhone: testPhone,
        messageText: 'confirmar',
      });

      expect(res.replyText).toContain('publicado com sucesso');
      expect(res.actionTaken).toBe('PRODUCT_CREATED');

      const products = await productService.findProductsByName(createdStoreId, 'Jaqueta Jeans');
      expect(products.length).toBe(1);
      expect(products[0].price).toBe(149.9);
      expect(products[0].stock).toBe(8);
    });

    it('deve solicitar confirmação com dados do produto antes de excluir e cancelar se o usuário disser "não"', async () => {
      // 1. Pede para remover
      const askDelete = await demoFallbackService.processMessage({
        vendorPhone: testPhone,
        messageText: 'Quero tirar o anúncio da Jaqueta Jeans',
      });

      expect(askDelete.actionTaken).toBe('CONFIRM_PRODUCT_DELETE_PROPOSED');
      expect(askDelete.replyText).toContain('Confirmação de Exclusão de Produto');
      expect(askDelete.replyText).toContain('Jaqueta Jeans');
      expect(askDelete.replyText).toContain('Preço');
      expect(askDelete.replyText).toContain('Estoque atual');

      // 2. Responde negativamente "não"
      const cancelRes = await demoFallbackService.processMessage({
        vendorPhone: testPhone,
        messageText: 'não',
      });

      expect(cancelRes.actionTaken).toBe('CANCELLED_PRODUCT_DELETE');
      expect(cancelRes.replyText).toContain('Exclusão cancelada');
      expect(cancelRes.replyText).toContain('Jaqueta Jeans');

      // Produto deve continuar existindo no catálogo
      const remaining = await productService.findProductsByName(createdStoreId, 'Jaqueta Jeans');
      expect(remaining.length).toBe(1);
    });

    it('deve excluir produto após o vendedor confirmar explicitamente com "sim" ou "confirmar"', async () => {
      // 1. Pede para remover
      const askDelete = await demoFallbackService.processMessage({
        vendorPhone: testPhone,
        messageText: 'Remover Jaqueta Jeans',
      });
      expect(askDelete.actionTaken).toBe('CONFIRM_PRODUCT_DELETE_PROPOSED');

      // 2. Confirma a exclusão
      const confirmRes = await demoFallbackService.processMessage({
        vendorPhone: testPhone,
        messageText: 'sim, pode excluir',
      });

      expect(confirmRes.actionTaken).toBe('PRODUCT_DELETED');
      expect(confirmRes.replyText).toContain('excluído definitivamente');

      // Produto agora foi removido
      const remaining = await productService.findProductsByName(createdStoreId, 'Jaqueta Jeans');
      expect(remaining.length).toBe(0);
    });

    it('deve manter memória e preencher produto em etapas conversacionais quebradas', async () => {
      const multiPhone = '5511888887777';
      const conv = await conversationService.getOrCreateConversation(multiPhone, 'Lojista Teste');
      await storeService.upsertStore(multiPhone, { name: 'Loja Memoria' });

      // Etapa 1: Envia foto sem dados
      const turn1 = await demoFallbackService.processMessage({
        vendorPhone: multiPhone,
        messageText: '',
        mediaUrl: 'https://example.com/foto.jpg',
      });
      expect(turn1.replyText).toContain('Foto do produto recebida');

      // Etapa 2: Envia só o nome do produto
      const turn2 = await demoFallbackService.processMessage({
        vendorPhone: multiPhone,
        messageText: 'Camiseta Silk',
      });
      expect(turn2.replyText).toContain('Camiseta Silk');

      // Etapa 3: Envia só o preço
      const turn3 = await demoFallbackService.processMessage({
        vendorPhone: multiPhone,
        messageText: 'R$ 49,90',
      });
      expect(turn3.replyText).toContain('49,90');

      // Etapa 4: Envia só a quantidade
      const turn4 = await demoFallbackService.processMessage({
        vendorPhone: multiPhone,
        messageText: '25 unidades',
      });
      expect(turn4.replyText).toContain('Resumo do anúncio para publicação');
      expect(turn4.replyText).toContain('Camiseta Silk');
      expect(turn4.replyText).toContain('49,90');
      expect(turn4.replyText).toContain('25 un');
      expect(turn4.replyText).toContain('Foto: Anexada com sucesso');

      // Etapa 5: Confirma publicação
      const turn5 = await demoFallbackService.processMessage({
        vendorPhone: multiPhone,
        messageText: 'confirmar',
      });
      expect(turn5.replyText).toContain('publicado com sucesso');
      expect(turn5.actionTaken).toBe('PRODUCT_CREATED');

      const store = await storeService.getStoreByVendorPhone(multiPhone);
      const created = await productService.findProductsByName(store!.id, 'Camiseta Silk');
      expect(created.length).toBe(1);
      expect(created[0].price).toBe(49.9);
      expect(created[0].stock).toBe(25);
      expect(created[0].mainImage).toBe('https://example.com/foto.jpg');
    });

    it('deve remover produtos duplicados com nomes idênticos sem travar em erro de ambiguidade', async () => {
      const dupPhone = '5511777776666';
      await storeService.upsertStore(dupPhone, { name: 'Loja Duplicatas' });
      const store = await storeService.getStoreByVendorPhone(dupPhone);
      await prisma.product.deleteMany({ where: { storeId: store!.id } });

      // Cria 2 produtos com nomes quase idênticos (diferindo apenas em maiúsculas/minúsculas)
      await productService.createProduct({
        storeId: store!.id,
        name: 'Camiseta preta de algodão',
        price: 59.9,
        stock: 10,
        category: 'Roupas',
      });
      await productService.createProduct({
        storeId: store!.id,
        name: 'Camiseta Preta de Algodão',
        price: 59.9,
        stock: 5,
        category: 'Roupas',
      });

      // Usuário pede para remover "Remova a Camiseta Preta de Algodão"
      const ask = await demoFallbackService.processMessage({
        vendorPhone: dupPhone,
        messageText: 'Remova a Camiseta Preta de Algodão',
      });
      expect(ask.actionTaken).toBe('CONFIRM_PRODUCT_DELETE_PROPOSED');

      const res = await demoFallbackService.processMessage({
        vendorPhone: dupPhone,
        messageText: 'confirmar',
      });

      expect(res.replyText).toContain('excluído definitivamente');
      expect(res.actionTaken).toBe('PRODUCT_DELETED');

      // Verifica que uma das duplicatas foi removida e restou 1
      const remaining = await productService.findProductsByName(store!.id, 'Camiseta preta de algodão');
      expect(remaining.length).toBe(1);
    });

    it('deve remover todos os produtos correspondentes quando o vendedor disser "Remova todas as Camisetas"', async () => {
      const bulkPhone = '5511666665555';
      await storeService.upsertStore(bulkPhone, { name: 'Loja Em Lote' });
      const store = await storeService.getStoreByVendorPhone(bulkPhone);
      await prisma.product.deleteMany({ where: { storeId: store!.id } });

      await productService.createProduct({
        storeId: store!.id,
        name: 'Camiseta Algodão Básica Preta',
        price: 39.9,
        stock: 10,
        category: 'Roupas',
      });
      await productService.createProduct({
        storeId: store!.id,
        name: 'Camiseta preta de algodão',
        price: 49.9,
        stock: 5,
        category: 'Roupas',
      });
      await productService.createProduct({
        storeId: store!.id,
        name: 'Camiseta Preta de Algodão',
        price: 49.9,
        stock: 8,
        category: 'Roupas',
      });

      const ask = await demoFallbackService.processMessage({
        vendorPhone: bulkPhone,
        messageText: 'Remova todas as Camisetas',
      });
      expect(ask.actionTaken).toBe('CONFIRM_PRODUCT_DELETE_PROPOSED');

      const res = await demoFallbackService.processMessage({
        vendorPhone: bulkPhone,
        messageText: 'confirmar',
      });

      expect(res.replyText).toContain('Foram excluídos com sucesso *3 produtos*');
      expect(res.actionTaken).toBe('PRODUCT_DELETED');

      const remaining = await productService.findProductsByName(store!.id, 'Camiseta');
      expect(remaining.length).toBe(0);
    });

    it('deve desambiguar e excluir quando usuário responder apenas o nome do produto', async () => {
      const disPhone = '5511555554444';
      await storeService.upsertStore(disPhone, { name: 'Loja Desambiguar' });
      const store = await storeService.getStoreByVendorPhone(disPhone);
      await prisma.product.deleteMany({ where: { storeId: store!.id } });

      await productService.createProduct({
        storeId: store!.id,
        name: 'Camiseta Algodão Básica Preta',
        price: 39.9,
        stock: 10,
        category: 'Roupas',
      });
      await productService.createProduct({
        storeId: store!.id,
        name: 'Camiseta Polo Azul',
        price: 89.9,
        stock: 5,
        category: 'Roupas',
      });

      // Passo 1: Usuário pede para remover "Camiseta", que é ambíguo
      const step1 = await demoFallbackService.processMessage({
        vendorPhone: disPhone,
        messageText: 'remova a camiseta',
      });

      expect(step1.replyText).toContain('Foram encontrados múltiplos produtos diferentes');
      expect(step1.replyText).toContain('Camiseta Algodão Básica Preta');
      expect(step1.replyText).toContain('Camiseta Polo Azul');

      // Passo 2: Usuário responde especificando o nome -> recebe pedido de confirmação
      const step2 = await demoFallbackService.processMessage({
        vendorPhone: disPhone,
        messageText: 'Camiseta Algodão Básica Preta',
      });

      expect(step2.actionTaken).toBe('CONFIRM_PRODUCT_DELETE_PROPOSED');
      expect(step2.replyText).toContain('Confirmação de Exclusão de Produto');

      // Passo 3: Confirma exclusão
      const step3 = await demoFallbackService.processMessage({
        vendorPhone: disPhone,
        messageText: 'confirmar',
      });

      expect(step3.replyText).toContain('excluído definitivamente');
      expect(step3.actionTaken).toBe('PRODUCT_DELETED');

      const remaining = await productService.findProductsByName(store!.id, 'Camiseta');
      expect(remaining.length).toBe(1);
      expect(remaining[0].name).toBe('Camiseta Polo Azul');
    });
  });
});
