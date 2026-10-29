import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';
import { storeService } from '../store/store.service.js';
import { productService, StockOperationType } from '../product/product.service.js';
import { conversationService } from '../conversation/conversation.service.js';
import { marketplaceTools } from './tools.js';
import { demoFallbackService, AIProcessResult } from './demo-fallback.service.js';

export class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (env.isGeminiConfigured) {
      try {
        this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        console.log(`[GeminiService] Inicializado com sucesso usando o modelo: ${env.GEMINI_MODEL}`);
      } catch (err) {
        console.error('[GeminiService] Erro ao instanciar GoogleGenAI:', err);
      }
    } else {
      console.log('[GeminiService] GEMINI_API_KEY não configurada. Operando em modo de demonstração inteligente.');
    }
  }

  /**
   * Processa a mensagem via Gemini API oficial (@google/genai)
   * Suporta visão multimodal (fotos) e Function Calling controlado
   */
  async processMessage(params: {
    vendorPhone: string;
    messageText: string;
    mediaUrl?: string;
    mediaType?: string;
  }): Promise<AIProcessResult> {
    if (!this.ai || !env.isGeminiConfigured) {
      return demoFallbackService.processMessage(params);
    }

    const { vendorPhone, messageText, mediaUrl } = params;
    const conversation = await conversationService.getOrCreateConversation(vendorPhone);
    const store = await storeService.getStoreByVendorPhone(vendorPhone);
    const pendingAction = conversationService.parsePendingAction(conversation.pendingAction);

    // Se houver ação de confirmação ou cancelamento direto (ex: "confirmar" ou "cancelar"), processa no motor de negócios
    const lower = (messageText || '').trim().toLowerCase();
    const isCancelKeyword =
      lower === 'cancelar' ||
      lower === 'cancela' ||
      lower === 'não' ||
      lower === 'nao' ||
      lower === 'deixa' ||
      lower === 'não quero' ||
      lower === 'nao quero' ||
      lower === 'cancelar exclusão' ||
      lower === 'cancelar exclusao' ||
      lower === 'não excluir' ||
      lower === 'nao excluir' ||
      lower === 'pode cancelar';

    const isConfirmKeyword =
      lower === 'confirmar' ||
      lower === 'confirmo' ||
      lower === 'sim' ||
      lower === 'pode publicar' ||
      lower === 'pode excluir' ||
      lower === 'exclui' ||
      lower === 'excluir' ||
      lower === 'ok' ||
      lower === 'publicar';

    if (pendingAction && (isConfirmKeyword || isCancelKeyword)) {
      return demoFallbackService.processMessage(params);
    }

    // Se o usuário está respondendo a uma desambiguação de exclusão ('AWAITING_DELETE_SELECTION')
    if (pendingAction?.type === 'AWAITING_DELETE_SELECTION' && messageText && store) {
      const lowerMsg = messageText.toLowerCase().trim();
      const options: string[] = pendingAction.data?.options || [];
      const origQuery: string = pendingAction.data?.query || '';

      const isAll = /^(tod[ao]s|tudo)/i.test(lowerMsg) || /\btod[ao]s\b/i.test(lowerMsg);

      const normalize = (str: string) =>
        str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();

      const normMsg = normalize(lowerMsg);
      const matchedOption = options.find((opt) => {
        const normOpt = normalize(opt);
        return normOpt === normMsg || normOpt.includes(normMsg) || normMsg.includes(normOpt);
      });

      const numMatch = lowerMsg.match(/^(\d+)$/);
      let selectedOption = matchedOption;
      if (numMatch) {
        const idx = parseInt(numMatch[1], 10) - 1;
        if (idx >= 0 && idx < options.length) {
          selectedOption = options[idx];
        }
      }

      if (isAll || selectedOption || /^(exclua|remova|delete|apague|tirar)/i.test(lowerMsg)) {
        try {
          const targetQuery = isAll ? origQuery : (selectedOption || messageText);
          const cleanQ = productService.cleanQuery(targetQuery);
          const found = await productService.findProductsByName(store.id, cleanQ || targetQuery);
          if (found.length === 0) {
            return {
              replyText: `Produto "${targetQuery}" não encontrado no catálogo.`,
              mode: 'GEMINI_API',
            };
          }

          const target = found[0];
          const priceFormatted = `R$ ${target.price.toFixed(2).replace('.', ',')}`;
          const countText = (isAll && found.length > 1) ? ` (*${found.length} itens correspondentes*)` : '';

          await conversationService.setPendingAction(conversation.id, {
            type: 'CONFIRM_PRODUCT_DELETE',
            data: {
              productId: target.id,
              productName: target.name,
              price: target.price,
              stock: target.stock,
              category: target.category,
              mainImage: target.mainImage,
              isAll,
            },
            createdAt: new Date().toISOString(),
          });

          const reply = [
            `⚠️ *Confirmação de Exclusão de Produto:*`,
            `Você tem certeza de que deseja remover este produto do seu catálogo${countText}?`,
            ``,
            `• Produto: *${target.name}*`,
            `• Preço: *${priceFormatted}*`,
            `• Estoque atual: *${target.stock} un.*`,
            `• Categoria: *${target.category || 'Geral'}*`,
            target.mainImage ? `• Foto: Anexada para conferência 📷` : null,
            ``,
            `👉 Digite *confirmar* para excluir definitivamente ou *cancelar* para manter o produto no catálogo.`,
          ]
            .filter(Boolean)
            .join('\n');

          return {
            replyText: reply,
            mediaUrl: target.mainImage || undefined,
            pendingDraft: {
              type: 'CONFIRM_PRODUCT_DELETE',
              productName: target.name,
              price: target.price,
              stock: target.stock,
              mainImage: target.mainImage,
            },
            actionTaken: 'CONFIRM_PRODUCT_DELETE_PROPOSED',
            mode: 'GEMINI_API',
          };
        } catch (delErr: any) {
          // Continua para o Gemini se não conseguir resolver diretamente
        }
      }
    }

    try {
      const parts: any[] = [];

      // Se houver imagem enviada, converte para inlineData para análise visual da IA
      if (mediaUrl) {
        try {
          const filename = path.basename(mediaUrl);
          const localPath = path.join(env.UPLOAD_DIR, filename);
          const buffer = await fs.readFile(localPath);
          const base64Data = buffer.toString('base64');
          const mimeType = filename.endsWith('.png') ? 'image/png' : filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

          parts.push({
            inlineData: {
              data: base64Data,
              mimeType,
            },
          });
        } catch (imgErr) {
          console.warn('[GeminiService] Não foi possível carregar imagem para visão:', imgErr);
        }
      }

      // Adiciona o texto da mensagem do vendedor
      parts.push({
        text: messageText || (mediaUrl ? 'Enviei uma foto para você analisar.' : 'Olá'),
      });

      // Se enviou foto e é início ou continuação de cadastro, preserva a foto no rascunho
      if (mediaUrl) {
        const existingDraft = pendingAction?.type === 'CONFIRM_PRODUCT_CREATE' ? pendingAction.data : {};
        await conversationService.setPendingAction(conversation.id, {
          type: 'CONFIRM_PRODUCT_CREATE',
          data: {
            ...existingDraft,
            mainImage: mediaUrl,
          },
          createdAt: new Date().toISOString(),
        });
      }

      const systemInstruction = `
Você é o assistente inteligente oficial de marketplace no WhatsApp.
Seu objetivo é permitir que o vendedor crie sua loja, cadastre produtos e administre tudo por mensagens de WhatsApp.
Informações do vendedor:
- Telefone: ${vendorPhone}
- Loja Atual: ${store ? `Nome: "${store.name}", Slug: "${store.slug}", Status: ${store.status}` : 'Ainda não possui loja.'}
- Rascunho / Ação Pendente: ${pendingAction ? JSON.stringify(pendingAction) : 'Nenhuma'}

Diretrizes de Conversação e Memória:
1. Mantenha memória contextual de todas as mensagens anteriores. O vendedor frequentemente envia os dados do produto de forma quebrada/parcelada (ex: primeiro manda a foto, depois o nome, depois o preço, depois a quantidade em mensagens separadas). Você DEVE lembrar e combinar todos os dados já enviados ao longo do diálogo.
2. NUNCA invente preços, quantidades ou nomes não fornecidos pelo vendedor.
3. Se faltar algum dado para cadastrar o produto (nome, preço ou quantidade em estoque), confirme educadamente o que já foi recebido e pergunte apenas o que falta.
4. Quando tiver o Nome, Preço e Estoque completos (sejam da mensagem atual ou combinados com o histórico e rascunho anterior), use a ferramenta 'propose_product_draft' para formalizar o anúncio e pedir confirmação final com "confirmar".
5. Para atualizar estoque, identifique se é alteração final (SET), entrada de novas unidades (INCREMENT) ou vendas (DECREMENT).
6. Se o vendedor pedir para remover, excluir, tirar, apagar ou deletar um produto ou anúncio, use obrigatoriamente a ferramenta 'request_delete_product'. Se o usuário pedir para remover todos/todas correspondentes (ex: "remova todas as camisetas", "apagar tudo", "remover todos"), defina o parâmetro deleteAll: true. Se pedir apenas para pausar temporariamente, use 'change_product_status' com status 'PAUSED'.
7. Se a última ação foi uma pergunta sobre qual produto remover ou 'AWAITING_DELETE_SELECTION', e o usuário respondeu com o nome de um produto, número ou "todas", chame 'request_delete_product'. JAMAIS trate essa resposta como um novo produto a cadastrar!
8. Chame as ferramentas controladas sempre que o usuário quiser alterar algo real no sistema.
`;

      // Recupera mensagens recentes para passar o histórico completo ao Gemini
      const recentMessages = await conversationService.getRecentMessages(conversation.id, 10);
      const contents: any[] = [];

      // Converte mensagens anteriores (excluindo a última que é a mensagem atual que está em 'parts')
      const pastMessages = recentMessages.slice(0, -1);
      for (const m of pastMessages) {
        if (m.sender === 'USER') {
          contents.push({
            role: 'user',
            parts: [{ text: m.content || 'Enviei uma foto do produto.' }],
          });
        } else if (m.sender === 'ASSISTANT') {
          contents.push({
            role: 'model',
            parts: [{ text: m.content || 'Entendido!' }],
          });
        }
      }

      // Adiciona o turno atual do usuário com texto e imagem inlineData se houver
      contents.push({
        role: 'user',
        parts,
      });

      // Chamada oficial à API do Gemini com histórico contextual
      const response = await this.ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents,
        config: {
          systemInstruction,
          // Ferramentas controladas
          tools: [
            {
              functionDeclarations: marketplaceTools as any,
            },
          ],
        },
      });

      const candidate = response.candidates?.[0];
      const responseParts = candidate?.content?.parts || [];

      // Procura chamadas de função retornadas pelo Gemini
      const functionCalls = responseParts
        .map((p: any) => p.functionCall)
        .filter(Boolean);

      if (functionCalls.length > 0) {
        return await this.executeToolCalls(functionCalls, vendorPhone, store, conversation.id, mediaUrl);
      }

      // Se respondeu em texto direto
      const replyText =
        responseParts
          .map((p: any) => p.text)
          .filter(Boolean)
          .join('\n') || 'Entendi! Como posso te ajudar na sua loja?';

      return {
        replyText,
        mode: 'GEMINI_API',
      };
    } catch (err: any) {
      console.error('[GeminiService] Erro na chamada Gemini API:', err);
      // Fallback gracioso para manter o sistema 100% disponível no Demoday
      const fallback = await demoFallbackService.processMessage(params);
      return {
        ...fallback,
        replyText: `[Modo Assistido]\n${fallback.replyText}`,
      };
    }
  }

  /**
   * Executa as chamadas de ferramentas validadas pelo Gemini
   */
  private async executeToolCalls(
    functionCalls: any[],
    vendorPhone: string,
    store: any,
    conversationId: string,
    mediaUrl?: string
  ): Promise<AIProcessResult> {
    const call = functionCalls[0];
    const { name, args } = call;

    if (name === 'upsert_store_profile') {
      const updated = await storeService.upsertStore(vendorPhone, {
        ...args,
        logoUrl: mediaUrl || args.logoUrl,
      });
      return {
        replyText: [
          `🎉 *Perfil da loja atualizado com sucesso!*`,
          storeService.formatStoreSummary(updated),
        ].join('\n'),
        actionTaken: 'STORE_UPDATED',
        mode: 'GEMINI_API',
      };
    }

    if (name === 'propose_product_draft') {
      const conv = await conversationService.getOrCreateConversation(vendorPhone);
      const prevPending = conversationService.parsePendingAction(conv.pendingAction);
      const prevDraft = prevPending?.type === 'CONFIRM_PRODUCT_CREATE' ? prevPending.data : {};

      const draft = {
        name: args.name || prevDraft.name || 'Produto',
        description: args.description || prevDraft.description || '',
        price: Number(args.price !== undefined && args.price !== null ? args.price : prevDraft.price || 0),
        stock: Number(args.stock !== undefined && args.stock !== null ? args.stock : prevDraft.stock || 0),
        category: args.category || prevDraft.category || 'Geral',
        mainImage: mediaUrl || prevDraft.mainImage || null,
      };

      await conversationService.setPendingAction(conversationId, {
        type: 'CONFIRM_PRODUCT_CREATE',
        data: draft,
        createdAt: new Date().toISOString(),
      });

      return {
        replyText: [
          `📦 *Resumo do anúncio preparado pela IA:*`,
          `• Nome: *${draft.name}*`,
          `• Preço: *R$ ${draft.price.toFixed(2).replace('.', ',')}*`,
          `• Estoque: *${draft.stock} un.*`,
          `• Categoria: ${draft.category}`,
          draft.description ? `• Descrição: ${draft.description}` : null,
          draft.mainImage ? `• Foto: Anexada com sucesso ✅` : null,
          `\nDeseja publicar no catálogo? Digite *confirmar* para publicar ou diga o que deseja alterar.`,
        ]
          .filter(Boolean)
          .join('\n'),
        pendingDraft: draft,
        actionTaken: 'PRODUCT_DRAFT_PROPOSED',
        mode: 'GEMINI_API',
      };
    }

    if (name === 'update_product_price') {
      if (!store) {
        return { replyText: 'Você ainda não possui loja criada.', mode: 'GEMINI_API' };
      }
      const products = await productService.findProductsByName(store.id, args.productName);
      if (products.length === 0) {
        return { replyText: `Produto "${args.productName}" não encontrado.`, mode: 'GEMINI_API' };
      }
      const updated = await productService.updateProduct(products[0].id, store.id, { price: Number(args.newPrice) });
      return {
        replyText: `✅ Preço do produto *${updated.name}* alterado para *R$ ${updated.price.toFixed(2).replace('.', ',')}*!`,
        actionTaken: 'PRICE_UPDATED',
        mode: 'GEMINI_API',
      };
    }

    if (name === 'update_product_stock') {
      if (!store) {
        return { replyText: 'Você ainda não possui loja criada.', mode: 'GEMINI_API' };
      }
      try {
        const res = await productService.updateStock(
          store.id,
          args.productName,
          Number(args.quantity),
          args.operation as StockOperationType
        );
        return {
          replyText: `📦 Estoque de *${res.product.name}* atualizado para *${res.newStock} un.*!`,
          actionTaken: 'STOCK_UPDATED',
          mode: 'GEMINI_API',
        };
      } catch (err: any) {
        return { replyText: `❌ ${err.message}`, mode: 'GEMINI_API' };
      }
    }

    if (name === 'change_product_status') {
      if (!store) return { replyText: 'Você ainda não possui loja criada.', mode: 'GEMINI_API' };
      const updated = await productService.setProductStatus(store.id, args.productName, args.status);
      const isPublished = updated.status === 'PUBLISHED';
      return {
        replyText: `${isPublished ? '🟢' : '🟡'} O anúncio de *${updated.name}* agora está *${isPublished ? 'publicado' : 'pausado'}*!`,
        actionTaken: 'STATUS_UPDATED',
        mode: 'GEMINI_API',
      };
    }

    if (name === 'request_delete_product' || name === 'delete_product' || name === 'remove_product') {
      if (!store) return { replyText: 'Você ainda não possui loja criada.', mode: 'GEMINI_API' };
      const isDeleteAll = Boolean(args.deleteAll) || /tod[ao]s/i.test(args.productName || '');
      const cleanQ = productService.cleanQuery(args.productName || '');
      const products = await productService.findProductsByName(store.id, cleanQ || args.productName);

      if (products.length === 0) {
        return {
          replyText: `⚠️ Não encontrei nenhum produto correspondente a *"${args.productName}"* no catálogo da sua loja.`,
          mode: 'GEMINI_API',
        };
      }

      // Se múltiplos produtos diferentes
      const normalize = (str: string) =>
        str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const distinctMap = new Map<string, string>();
      for (const p of products) {
        const key = normalize(p.name);
        if (!distinctMap.has(key)) distinctMap.set(key, p.name);
      }
      const distinctNames = Array.from(distinctMap.values());

      if (distinctNames.length > 1 && !isDeleteAll) {
        await conversationService.setPendingAction(conversationId, {
          type: 'AWAITING_DELETE_SELECTION',
          data: { options: distinctNames, query: args.productName },
          createdAt: new Date().toISOString(),
        });
        return {
          replyText: `Encontrei mais de um produto correspondente:\n${distinctNames.map((n, i) => `${i + 1}. *${n}*`).join('\n')}\n\nQual deles você deseja excluir? (Ou diga *"remover todos"* para excluir todos)`,
          actionTaken: 'AWAITING_DELETE_SELECTION',
          mode: 'GEMINI_API',
        };
      }

      // Produto alvo identificado -> pede CONFIRMAÇÃO com detalhes e imagem!
      const target = products[0];
      const priceFormatted = `R$ ${target.price.toFixed(2).replace('.', ',')}`;
      const countText = (isDeleteAll && products.length > 1) ? ` (*${products.length} itens correspondentes*)` : '';

      await conversationService.setPendingAction(conversationId, {
        type: 'CONFIRM_PRODUCT_DELETE',
        data: {
          productId: target.id,
          productName: target.name,
          price: target.price,
          stock: target.stock,
          category: target.category,
          mainImage: target.mainImage,
          isAll: isDeleteAll,
        },
        createdAt: new Date().toISOString(),
      });

      const reply = [
        `⚠️ *Confirmação de Exclusão de Produto:*`,
        `Você tem certeza de que deseja remover este produto do seu catálogo${countText}?`,
        ``,
        `• Produto: *${target.name}*`,
        `• Preço: *${priceFormatted}*`,
        `• Estoque atual: *${target.stock} un.*`,
        `• Categoria: *${target.category || 'Geral'}*`,
        target.mainImage ? `• Foto: Anexada para conferência 📷` : null,
        ``,
        `👉 Digite *confirmar* para excluir definitivamente ou *cancelar* para manter o produto no catálogo.`,
      ]
        .filter(Boolean)
        .join('\n');

      return {
        replyText: reply,
        mediaUrl: target.mainImage || undefined,
        pendingDraft: {
          type: 'CONFIRM_PRODUCT_DELETE',
          productName: target.name,
          price: target.price,
          stock: target.stock,
          mainImage: target.mainImage,
        },
        actionTaken: 'CONFIRM_PRODUCT_DELETE_PROPOSED',
        mode: 'GEMINI_API',
      };
    }

    if (name === 'query_products') {
      if (!store) return { replyText: 'Você ainda não possui loja criada.', mode: 'GEMINI_API' };
      if (args.outOfStockOnly) {
        const outOfStock = await productService.listOutOfStockProducts(store.id);
        if (outOfStock.length === 0) {
          return { replyText: '🎉 Todos os seus produtos estão em estoque!', mode: 'GEMINI_API' };
        }
        const list = outOfStock.map((p) => `• ⚠️ *${p.name}* (0 un.)`).join('\n');
        return { replyText: `📦 *Produtos esgotados:*\n${list}`, mode: 'GEMINI_API' };
      }

      const products = await productService.listProductsByStore(store.id, {
        category: args.category,
        status: args.status,
        maxPrice: args.maxPrice ? Number(args.maxPrice) : undefined,
      });

      if (products.length === 0) {
        return { replyText: 'Nenhum produto encontrado com os filtros aplicados.', mode: 'GEMINI_API' };
      }

      const list = products.map((p) => `• *${p.name}* — R$ ${p.price.toFixed(2).replace('.', ',')} (${p.stock} un.)`).join('\n');
      return { replyText: `📋 *Produtos encontrados (${products.length}):*\n${list}`, mode: 'GEMINI_API' };
    }

    if (name === 'get_store_overview') {
      if (!store) return { replyText: 'Você ainda não possui loja criada. Crie dizendo *"Quero criar minha loja"*.', mode: 'GEMINI_API' };
      return {
        replyText: storeService.formatStoreSummary(store),
        mode: 'GEMINI_API',
      };
    }

    return {
      replyText: 'Ação processada com sucesso!',
      mode: 'GEMINI_API',
    };
  }
}

export const geminiService = new GeminiService();
