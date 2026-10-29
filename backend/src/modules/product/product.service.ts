import { prisma } from '../../db/prisma.js';

export interface CreateProductInput {
  storeId: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  mainImage?: string;
  status?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  category?: string;
  mainImage?: string;
  status?: string;
}

export type StockOperationType = 'SET' | 'INCREMENT' | 'DECREMENT';

export class ProductService {
  /**
   * Cria um novo produto com validações estritas
   */
  async createProduct(data: CreateProductInput) {
    if (data.price < 0) {
      throw new Error('O preço do produto não pode ser negativo.');
    }
    if (data.stock < 0) {
      throw new Error('A quantidade de estoque não pode ser negativa.');
    }
    if (!data.name || data.name.trim() === '') {
      throw new Error('O nome do produto é obrigatório.');
    }

    return prisma.product.create({
      data: {
        storeId: data.storeId,
        name: data.name.trim(),
        description: data.description?.trim(),
        price: Number(data.price),
        stock: Math.floor(Number(data.stock)),
        category: data.category?.trim() || 'Geral',
        mainImage: data.mainImage,
        status: data.status || 'PUBLISHED',
      },
    });
  }

  /**
   * Atualiza dados de um produto existente
   */
  async updateProduct(id: string, storeId: string, data: UpdateProductInput) {
    const product = await prisma.product.findFirst({
      where: { id, storeId },
    });

    if (!product) {
      throw new Error(`Produto não encontrado para a loja especificada.`);
    }

    if (data.price !== undefined && data.price < 0) {
      throw new Error('O preço não pode ser negativo.');
    }
    if (data.stock !== undefined && data.stock < 0) {
      throw new Error('O estoque não pode ser negativo.');
    }

    return prisma.product.update({
      where: { id },
      data: {
        ...data,
        price: data.price !== undefined ? Number(data.price) : undefined,
        stock: data.stock !== undefined ? Math.floor(Number(data.stock)) : undefined,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Atualiza estoque (absoluto ou incremental) com proteção contra valores negativos
   */
  async updateStock(
    storeId: string,
    productQuery: string,
    quantity: number,
    operation: StockOperationType = 'SET'
  ) {
    const products = await this.findProductsByName(storeId, productQuery);

    if (products.length === 0) {
      throw new Error(`Nenhum produto encontrado com o nome ou termo "${productQuery}".`);
    }

    if (products.length > 1) {
      const names = products.map((p) => `• ${p.name} (ID: ${p.id.slice(0, 8)})`).join('\n');
      throw new Error(
        `Encontrei mais de um produto correspondente:\n${names}\n\nPor favor, seja mais específico informando o nome exato.`
      );
    }

    const product = products[0];
    let newStock = product.stock;

    if (operation === 'SET') {
      newStock = quantity;
    } else if (operation === 'INCREMENT') {
      newStock = product.stock + quantity;
    } else if (operation === 'DECREMENT') {
      newStock = product.stock - quantity;
    }

    if (newStock < 0) {
      throw new Error(
        `Operação não permitida: o estoque ficaria negativo (${newStock}). Estoque atual: ${product.stock} un.`
      );
    }

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { stock: Math.floor(newStock) },
    });

    return {
      product: updated,
      previousStock: product.stock,
      newStock: updated.stock,
      operation,
    };
  }

  /**
   * Altera status do produto (PUBLISHED / PAUSED)
   */
  async setProductStatus(storeId: string, productQuery: string, status: 'PUBLISHED' | 'PAUSED') {
    const products = await this.findProductsByName(storeId, productQuery);
    if (products.length === 0) {
      throw new Error(`Produto "${productQuery}" não encontrado.`);
    }
    if (products.length > 1) {
      throw new Error(
        `Foram encontrados múltiplos produtos. Por favor informe o nome exato: ${products.map((p) => p.name).join(', ')}`
      );
    }

    return prisma.product.update({
      where: { id: products[0].id },
      data: { status },
    });
  }

  /**
   * Remove artigos e prefixos em português de consultas de produtos
   */
  cleanQuery(query: string): string {
    return query
      .replace(/^(tod[ao]s\s+(as\s+|os\s+)?|tudo)/i, '')
      .replace(/\s+tod[ao]s$/i, '')
      .replace(/^(o\s+an[uú]ncio\s+d[oa]\s+|o\s+an[uú]ncio\s+de\s+|o\s+an[uú]ncio\s+|o\s+produto\s+|a\s+|o\s+|as\s+|os\s+|d[oa]\s+|de\s+)/i, '')
      .replace(/\s+(do\s+cat[aá]logo|da\s+loja|da\s+vitrine|do\s+estoque|por\s+favor)$/i, '')
      .trim();
  }

  /**
   * Exclui produto com validação de loja
   * Suporta remoção individual, remoção em lote (deleteAll) e resolução de duplicatas com nomes idênticos
   */
  async deleteProduct(storeId: string, productQuery: string, deleteAll = false) {
    const rawLower = productQuery.toLowerCase().trim();
    const isAll =
      deleteAll ||
      /^(tod[ao]s\s+(as\s+|os\s+)?|tudo)/i.test(rawLower) ||
      /\s+tod[ao]s$/i.test(rawLower) ||
      /\btod[ao]s\b/i.test(rawLower);

    const cleanQ = this.cleanQuery(productQuery);

    if (!cleanQ && isAll) {
      const allStoreProducts = await prisma.product.findMany({ where: { storeId } });
      if (allStoreProducts.length === 0) {
        throw new Error('Nenhum produto cadastrado na sua loja para remoção.');
      }
      await prisma.product.deleteMany({ where: { storeId } });
      return {
        id: allStoreProducts[0].id,
        name: allStoreProducts[0].name,
        count: allStoreProducts.length,
        names: allStoreProducts.map((p) => p.name),
      };
    }

    const products = await this.findProductsByName(storeId, cleanQ || productQuery);
    if (products.length === 0) {
      throw new Error(`Produto "${productQuery}" não encontrado para exclusão.`);
    }

    // Se o usuário pediu para remover todos/todas correspondentes
    if (isAll) {
      const ids = products.map((p) => p.id);
      await prisma.product.deleteMany({
        where: { id: { in: ids } },
      });
      return {
        id: products[0].id,
        name: products[0].name,
        count: products.length,
        names: products.map((p) => p.name),
      };
    }

    // Se houver apenas 1 produto correspondente
    if (products.length === 1) {
      const deleted = await prisma.product.delete({
        where: { id: products[0].id },
      });
      return {
        id: deleted.id,
        name: deleted.name,
        count: 1,
        names: [deleted.name],
      };
    }

    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const normalizedQuery = normalize(cleanQ || productQuery);

    // 1. Procura match exato normalizado (resolve duplicatas com mesmo nome exato)
    const exactMatches = products.filter((p) => normalize(p.name) === normalizedQuery);
    if (exactMatches.length > 0) {
      const target = exactMatches[0];
      const deleted = await prisma.product.delete({
        where: { id: target.id },
      });
      return {
        id: deleted.id,
        name: deleted.name,
        count: 1,
        names: [deleted.name],
        remainingDuplicates: exactMatches.length - 1,
      };
    }

    // 2. Se todos os produtos encontrados são DUPLICATAS entre si (mesmo nome normalizado)
    const uniqueNormalized = Array.from(new Set(products.map((p) => normalize(p.name))));
    if (uniqueNormalized.length === 1) {
      const target = products[0];
      const deleted = await prisma.product.delete({
        where: { id: target.id },
      });
      return {
        id: deleted.id,
        name: deleted.name,
        count: 1,
        names: [deleted.name],
        remainingDuplicates: products.length - 1,
      };
    }

    // 3. Se os produtos encontrados forem nomes genuinamente diferentes (ex: "Camiseta Básica" vs "Camiseta Estampada")
    const distinctMap = new Map<string, string>();
    for (const p of products) {
      const key = normalize(p.name);
      if (!distinctMap.has(key)) {
        distinctMap.set(key, p.name);
      }
    }
    const distinctNames = Array.from(distinctMap.values());

    throw new Error(
      `Foram encontrados múltiplos produtos diferentes: ${distinctNames.join(', ')}. Especifique qual deles deseja remover ou diga *"Remover todas as ${cleanQ || productQuery}"* para excluir todos de uma vez.`
    );
  }

  /**
   * Exclui produto diretamente pelo ID validando a loja
   */
  async deleteProductById(storeId: string, id: string) {
    const product = await prisma.product.findFirst({
      where: { id, storeId },
    });
    if (!product) {
      throw new Error('Produto não encontrado para exclusão.');
    }
    const deleted = await prisma.product.delete({
      where: { id },
    });
    return {
      id: deleted.id,
      name: deleted.name,
      count: 1,
      names: [deleted.name],
    };
  }

  /**
   * Busca produto por ID
   */
  async getProductById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: { store: true },
    });
  }

  /**
   * Busca produtos pelo nome (case-insensitive, sem acentos, aproximação)
   */
  async findProductsByName(storeId: string, query: string) {
    const all = await prisma.product.findMany({
      where: { storeId },
    });

    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const normalizedRaw = normalize(query);
    const cleaned = this.cleanQuery(query);
    const normalizedClean = normalize(cleaned);

    if (!normalizedRaw && !normalizedClean) return [];

    // 1. Procura match exato (com ou sem artigo inicial)
    const exact = all.filter((p) => {
      const normName = normalize(p.name);
      return normName === normalizedRaw || (normalizedClean && normName === normalizedClean);
    });
    if (exact.length > 0) return exact;

    // 2. Procura match por inclusão bidirecional (ex: "camisa preta" em "camiseta preta de algodão" ou vice-versa)
    const effectiveQuery = normalizedClean || normalizedRaw;
    const partial = all.filter((p) => {
      const normName = normalize(p.name);
      return normName.includes(effectiveQuery) || effectiveQuery.includes(normName);
    });
    if (partial.length > 0) return partial;

    // 3. Procura por palavras-chave com suporte a radicais (ex: "camisa" e "camiseta", "preto" e "preta")
    const queryWords = effectiveQuery.split(/\s+/).filter((w) => w.length >= 3);
    if (queryWords.length > 0) {
      const scored = all.map((p) => {
        const prodNameNorm = normalize(p.name);
        const prodDescNorm = p.description ? normalize(p.description) : '';
        let score = 0;

        for (const qw of queryWords) {
          const stem = qw.length >= 4 ? qw.slice(0, 4) : qw;
          if (prodNameNorm.includes(qw)) score += 10;
          else if (prodNameNorm.includes(stem)) score += 6;
          else if (prodDescNorm.includes(qw)) score += 2;
        }

        return { product: p, score };
      });

      const matched = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
      if (matched.length > 0) {
        return matched.map((m) => m.product);
      }
    }

    return [];
  }

  /**
   * Lista todos os produtos de uma loja
   */
  async listProductsByStore(storeId: string, options?: { category?: string; status?: string; maxPrice?: number }) {
    return prisma.product.findMany({
      where: {
        storeId,
        ...(options?.category ? { category: options.category } : {}),
        ...(options?.status ? { status: options.status } : {}),
        ...(options?.maxPrice ? { price: { lte: options.maxPrice } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lista produtos esgotados (estoque 0)
   */
  async listOutOfStockProducts(storeId: string) {
    return prisma.product.findMany({
      where: {
        storeId,
        stock: { lte: 0 },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Formata resumo do produto para envio via WhatsApp
   */
  formatProductSummary(product: any): string {
    const statusEmoji = product.status === 'PUBLISHED' ? '🟢 Publicado' : product.status === 'PAUSED' ? '🟡 Pausado' : '⚪ Rascunho';
    const stockStatus = product.stock > 0 ? `📦 Estoque: ${product.stock} un.` : `⚠️ *ESGOTADO* (0 un.)`;

    return [
      `📦 *${product.name}*`,
      `💰 Preço: R$ ${product.price.toFixed(2).replace('.', ',')}`,
      stockStatus,
      `🏷️ Categoria: ${product.category || 'Geral'}`,
      product.description ? `📝 Descrição: ${product.description}` : null,
      `📊 Status: ${statusEmoji}`,
      product.mainImage ? `🖼️ Foto anexada ✅` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }
}

export const productService = new ProductService();
