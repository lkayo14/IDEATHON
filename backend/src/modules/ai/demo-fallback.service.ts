import { storeService } from '../store/store.service.js';
import { productService, StockOperationType } from '../product/product.service.js';
import { conversationService, PendingAction } from '../conversation/conversation.service.js';

export interface AIProcessResult {
  replyText: string;
  actionTaken?: string;
  pendingDraft?: any;
  mediaUrl?: string;
  mode: 'DEMO_FALLBACK' | 'GEMINI_API';
}

export class DemoFallbackService {
  /**
   * Processa a mensagem usando regras determinísticas inteligentes
   * Garantindo que 100% dos fluxos de teste e demonstração funcionem perfeitamente
   */
  async processMessage(params: {
    vendorPhone: string;
    messageText: string;
    mediaUrl?: string;
    mediaType?: string;
  }): Promise<AIProcessResult> {
    const { vendorPhone, messageText, mediaUrl } = params;
    const text = (messageText || '').trim();
    const lower = text.toLowerCase();

    const conversation = await conversationService.getOrCreateConversation(vendorPhone);
    const store = await storeService.getStoreByVendorPhone(vendorPhone);
    const pendingAction = conversationService.parsePendingAction(conversation.pendingAction);

    // =========================================================================
    // 1. TRATAMENTO DE CANCELAMENTO / RESPOSTA NEGATIVA
    // =========================================================================
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
      lower === 'cancelar cadastro' ||
      lower === 'pode cancelar';

    if (isCancelKeyword) {
      if (pendingAction) {
        await conversationService.clearPendingAction(conversation.id);

        if (pendingAction.type === 'CONFIRM_PRODUCT_DELETE') {
          const prodName = pendingAction.data?.productName || 'o produto';
          return {
            replyText: `❌ Exclusão cancelada. O produto *"${prodName}"* continuará ativo e disponível no catálogo da sua loja!`,
            actionTaken: 'CANCELLED_PRODUCT_DELETE',
            mode: 'DEMO_FALLBACK',
          };
        }

        if (pendingAction.type === 'CONFIRM_PRODUCT_CREATE') {
          return {
            replyText: '❌ Cadastro de produto cancelado. O rascunho foi descartado e nenhuma alteração foi salva no catálogo.',
            actionTaken: 'CANCELLED_PRODUCT_CREATE',
            mode: 'DEMO_FALLBACK',
          };
        }

        return {
          replyText: '❌ Operação cancelada. Nenhuma alteração foi realizada no catálogo.',
          actionTaken: 'CANCELLED_PENDING_ACTION',
          mode: 'DEMO_FALLBACK',
        };
      }
      return {
        replyText: 'Não há nenhuma operação pendente no momento. Como posso te ajudar na sua loja?',
        mode: 'DEMO_FALLBACK',
      };
    }

    // =========================================================================
    // 2. TRATAMENTO DE CONFIRMAÇÃO DE AÇÃO PENDENTE
    // =========================================================================
    const isConfirmation =
      lower === 'confirmar' ||
      lower === 'confirmo' ||
      lower === 'sim' ||
      lower === 'ok' ||
      lower.startsWith('sim') ||
      lower.startsWith('confirm') ||
      lower.includes('pode excluir') ||
      lower.includes('pode publicar') ||
      lower === 'exclui' ||
      lower === 'excluir' ||
      lower === 'publicar';

    if (pendingAction && isConfirmation) {
      if (pendingAction.type === 'CONFIRM_PRODUCT_CREATE') {
        const draft = pendingAction.data;
        if (!store) {
          return {
            replyText: '⚠️ Você ainda não possui uma loja criada. Digite *"Quero criar minha loja"* primeiro!',
            mode: 'DEMO_FALLBACK',
          };
        }

        const product = await productService.createProduct({
          storeId: store.id,
          name: draft.name,
          description: draft.description,
          price: draft.price,
          stock: draft.stock,
          category: draft.category,
          mainImage: draft.mainImage,
          status: 'PUBLISHED',
        });

        await conversationService.clearPendingAction(conversation.id);

        return {
          replyText: [
            `🎉 *Anúncio publicado com sucesso no catálogo!*`,
            productService.formatProductSummary(product),
            `\n🔗 *Link do produto:* /loja/${store.slug}/produto/${product.id}`,
            `\nVocê já pode conferir na sua loja online! Deseja cadastrar outro produto ou alterar algo?`,
          ].join('\n'),
          actionTaken: 'PRODUCT_CREATED',
          mode: 'DEMO_FALLBACK',
        };
      }

      if (pendingAction.type === 'CONFIRM_STORE_SETUP') {
        const draft = pendingAction.data;
        const createdStore = await storeService.upsertStore(vendorPhone, draft);
        await conversationService.clearPendingAction(conversation.id);

        return {
          replyText: [
            `🎉 *Sua loja está no ar com sucesso!*`,
            storeService.formatStoreSummary(createdStore),
            `\nAgora você já pode cadastrar seus produtos! Envie uma foto e diga algo como:`,
            `_"Essa é uma camiseta preta. Custa R$ 59,90 e tenho 20 unidades."_`,
          ].join('\n'),
          actionTaken: 'STORE_CREATED',
          mode: 'DEMO_FALLBACK',
        };
      }

      if (pendingAction.type === 'CONFIRM_PRODUCT_DELETE') {
        const { productName, productId, isAll } = pendingAction.data;
        if (!store) {
          return { replyText: 'Loja não encontrada.', mode: 'DEMO_FALLBACK' };
        }

        try {
          let deleted;
          if (productId && !isAll) {
            deleted = await productService.deleteProductById(store.id, productId);
          } else {
            deleted = await productService.deleteProduct(store.id, pendingAction.data.query || productName, Boolean(isAll));
          }

          await conversationService.clearPendingAction(conversation.id);

          let reply = '';
          if (deleted && typeof deleted === 'object' && 'count' in deleted && deleted.count > 1) {
            reply = `🗑️ Foram excluídos com sucesso *${deleted.count} produtos* do seu catálogo: ${deleted.names.join(', ')}!`;
          } else {
            reply = `🗑️ O produto *"${productName}"* foi excluído definitivamente do catálogo da sua loja!`;
          }

          return {
            replyText: reply,
            actionTaken: 'PRODUCT_DELETED',
            mode: 'DEMO_FALLBACK',
          };
        } catch (err: any) {
          await conversationService.clearPendingAction(conversation.id);
          return {
            replyText: `❌ Não foi possível excluir: ${err.message}`,
            mode: 'DEMO_FALLBACK',
          };
        }
      }
    }

    if (pendingAction && pendingAction.type === 'AWAITING_DELETE_SELECTION' && store) {
      const lowerMsg = text.toLowerCase().trim();
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
          const targetQuery = isAll ? origQuery : (selectedOption || text);
          const cleanQ = productService.cleanQuery(targetQuery);
          const found = await productService.findProductsByName(store.id, cleanQ || targetQuery);
          if (found.length === 0) {
            return {
              replyText: `Produto "${targetQuery}" não encontrado no catálogo.`,
              mode: 'DEMO_FALLBACK',
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
            mode: 'DEMO_FALLBACK',
          };
        } catch (err: any) {
          return {
            replyText: `❌ Não foi possível preparar a exclusão: ${err.message}`,
            mode: 'DEMO_FALLBACK',
          };
        }
      }
    }

    // =========================================================================
    // 3. FLUXO CONVERSACIONAL DE CRIAÇÃO / EDIÇÃO DA LOJA
    // =========================================================================
    if (
      lower.includes('criar minha loja') ||
      lower.includes('criar loja') ||
      lower.includes('abrir loja') ||
      lower.includes('configurar loja') ||
      lower.includes('alterar dados da minha loja') ||
      lower.includes('quero alterar os dados')
    ) {
      if (!store) {
        await conversationService.setPendingAction(conversation.id, {
          type: 'CONFIRM_STORE_SETUP',
          data: { step: 'NAME' },
          createdAt: new Date().toISOString(),
        });
        return {
          replyText: 'Vamos começar! Qual é o nome da sua loja?',
          mode: 'DEMO_FALLBACK',
        };
      } else {
        return {
          replyText: [
            `🏪 Sua loja atual é *${store.name}*.`,
            `O que você gostaria de alterar? Você pode me dizer naturalmente, por exemplo:`,
            `• _"Mude o nome para Boutique Elegance"_`,
            `• _"Altere o horário para 09h às 19h"_`,
            `• _"Adicione o Instagram @sualoja"_`,
            `• Enviar uma foto da logo`,
            `• _"Formas de pagamento: Pix e Cartão de Crédito"_`,
          ].join('\n'),
          mode: 'DEMO_FALLBACK',
        };
      }
    }

    // Se estiver no passo a passo de criação de loja
    if (pendingAction && pendingAction.type === 'CONFIRM_STORE_SETUP' && pendingAction.data?.step) {
      const step = pendingAction.data.step;

      if (step === 'NAME') {
        const storeName = text.replace(/^(minha loja se chama|nome da loja é|o nome é|é)\s+/i, '').trim();
        const draft = { ...pendingAction.data, name: storeName, step: 'SEGMENT_AND_LOGO' };
        await conversationService.setPendingAction(conversation.id, {
          type: 'CONFIRM_STORE_SETUP',
          data: draft,
          createdAt: new Date().toISOString(),
        });

        return {
          replyText: `Ótimo! *${storeName}* é um excelente nome. Agora me envie a logo da loja (se tiver) e me conte um pouco sobre o segmento ou o que você vende.`,
          mode: 'DEMO_FALLBACK',
        };
      }

      if (step === 'SEGMENT_AND_LOGO') {
        const draft = {
          ...pendingAction.data,
          logoUrl: mediaUrl || pendingAction.data.logoUrl,
          description: text,
          segment: this.extractSegment(text),
          step: 'PAYMENT_AND_CONTACTS',
        };
        await conversationService.setPendingAction(conversation.id, {
          type: 'CONFIRM_STORE_SETUP',
          data: draft,
          createdAt: new Date().toISOString(),
        });

        return {
          replyText:
            'Perfeito! Agora, quais formas de pagamento você aceita (ex: Pix, Cartão, Dinheiro) e qual o horário de funcionamento?',
          mode: 'DEMO_FALLBACK',
        };
      }

      if (step === 'PAYMENT_AND_CONTACTS') {
        const draft = {
          ...pendingAction.data,
          paymentMethods: text.includes('pix') || text.includes('cart') ? text : 'Pix, Dinheiro, Cartão de Crédito',
          businessHours: this.extractHours(text) || 'Segunda a Sexta, das 09:00 às 18:00',
          step: 'READY_TO_CONFIRM',
        };

        const previewStore = {
          name: draft.name,
          segment: draft.segment,
          description: draft.description,
          paymentMethods: draft.paymentMethods,
          businessHours: draft.businessHours,
          logoUrl: draft.logoUrl,
          whatsapp: vendorPhone,
          slug: storeService.generateSlug(draft.name),
        };

        await conversationService.setPendingAction(conversation.id, {
          type: 'CONFIRM_STORE_SETUP',
          data: previewStore,
          createdAt: new Date().toISOString(),
        });

        return {
          replyText: [
            `📋 *Resumo da sua Loja antes de publicar:*`,
            storeService.formatStoreSummary(previewStore),
            `\nTudo certo? Digite *confirmar* para criar a loja ou diga o que deseja corrigir.`,
          ].join('\n'),
          mode: 'DEMO_FALLBACK',
        };
      }
    }

    // Alteração de logo da loja (quando usuário menciona explicitamente "logo")
    if (mediaUrl && (lower.includes('logo') || lower.includes('minha logo') || lower.includes('foto da loja') || lower.includes('foto de perfil'))) {
      if (store) {
        await storeService.upsertStore(vendorPhone, { logoUrl: mediaUrl });
        return {
          replyText: `🖼️ Logo da loja *${store.name}* atualizada com sucesso!`,
          actionTaken: 'LOGO_UPDATED',
          mode: 'DEMO_FALLBACK',
        };
      }
    }

    // =========================================================================
    // 4. CADASTRO DE PRODUTO (COMPLETO OU CONVERSACIONAL EM ETAPAS)
    // =========================================================================

    // A: Usuário já possui um rascunho de produto em andamento (fluxo conversacional)
    if (pendingAction && pendingAction.type === 'CONFIRM_PRODUCT_CREATE') {
      const prev = pendingAction.data || {};
      const newPrice = this.extractPrice(text);
      const newStock = this.extractStock(text);
      const newName = this.extractCleanName(text);

      const isPlaceholder = (n?: string) =>
        !n || /^(Novo Produto|Produto em Destaque|Produto)$/i.test(n.trim());

      const merged = {
        name: newName || (!isPlaceholder(prev.name) ? prev.name : null),
        description: prev.description || (newName ? `Produto anunciado via WhatsApp: ${newName}` : ''),
        price: newPrice !== null ? newPrice : (prev.price !== undefined && prev.price !== null ? prev.price : null),
        stock: newStock !== null ? newStock : (prev.stock !== undefined && prev.stock !== null ? prev.stock : null),
        category: prev.category || this.inferCategory(text || prev.name || '') || 'Geral',
        mainImage: mediaUrl || prev.mainImage || null,
      };

      // Se a mensagem continha apenas número puro e faltava preço ou estoque:
      if (newPrice === null && newStock === null && /^\s*\d+\s*$/.test(text.trim())) {
        const val = parseInt(text.trim(), 10);
        if (merged.price === null && merged.stock !== null) {
          merged.price = val;
        } else if (merged.stock === null) {
          merged.stock = val;
        }
      }

      // Persiste o estado atualizado imediatamente
      await conversationService.setPendingAction(conversation.id, {
        type: 'CONFIRM_PRODUCT_CREATE',
        data: merged,
        createdAt: new Date().toISOString(),
      });

      // Valida o que ainda está pendente
      const missing: string[] = [];
      if (!merged.name) missing.push('o *nome do produto*');
      if (merged.price === null) missing.push('o *preço unitário* (ex: R$ 59,90)');
      if (merged.stock === null) missing.push('a *quantidade em estoque* (ex: 20 unidades)');

      if (missing.length === 0) {
        return {
          replyText: [
            `📦 *Resumo do anúncio para publicação:*`,
            `• Nome: *${merged.name}*`,
            `• Preço: *R$ ${Number(merged.price).toFixed(2).replace('.', ',')}*`,
            `• Estoque: *${merged.stock} un.*`,
            `• Categoria: ${merged.category}`,
            merged.description ? `• Descrição: ${merged.description}` : null,
            merged.mainImage ? `• Foto: Anexada com sucesso ✅` : `• Foto: Nenhuma foto anexada`,
            `\nDeseja publicar este anúncio? Digite *confirmar* para colocar no catálogo ou me diga o que deseja alterar.`,
          ]
            .filter(Boolean)
            .join('\n'),
          pendingDraft: merged,
          mode: 'DEMO_FALLBACK',
        };
      }

      // Ainda faltam dados: confirma o que foi recebido e pergunta o próximo item
      const ackList: string[] = [];
      if (newName) ackList.push(`Nome: *${merged.name}*`);
      if (merged.price !== null && newPrice !== null) ackList.push(`Preço: *R$ ${Number(merged.price).toFixed(2).replace('.', ',')}*`);
      if (merged.stock !== null && newStock !== null) ackList.push(`Estoque: *${merged.stock} un.*`);
      if (mediaUrl) ackList.push('Foto anexada ✅');

      const ackMsg = ackList.length > 0 ? `✅ Anotado (${ackList.join(', ')})!\n` : '';
      return {
        replyText: `${ackMsg}Por favor, informe agora ${missing.join(' e ')} para continuarmos.`,
        pendingDraft: merged,
        mode: 'DEMO_FALLBACK',
      };
    }

    // B: Início de cadastro de produto (foto enviada, indicadores de preço/estoque ou comando explícito)
    const hasPrice = this.extractPrice(text) !== null;
    const hasStock = this.extractStock(text) !== null;
    const isNewProductIntent =
      Boolean(mediaUrl) ||
      (hasPrice && hasStock) ||
      lower.includes('cadastrar produto') ||
      lower.includes('novo produto') ||
      lower.includes('adicionar produto') ||
      lower.includes('anunciar produto') ||
      lower.includes('colocar produto') ||
      lower.includes('colocar na loja') ||
      lower.includes('essa é uma') ||
      lower.includes('esse é um');

    if (isNewProductIntent) {
      const extractedPrice = this.extractPrice(text);
      const extractedStock = this.extractStock(text);
      const extractedName = this.extractCleanName(text);

      const draftProduct = {
        name: extractedName,
        description: extractedName ? `Produto anunciado via WhatsApp: ${extractedName}` : '',
        price: extractedPrice,
        stock: extractedStock,
        category: this.inferCategory(text) || 'Geral',
        mainImage: mediaUrl || null,
      };

      await conversationService.setPendingAction(conversation.id, {
        type: 'CONFIRM_PRODUCT_CREATE',
        data: draftProduct,
        createdAt: new Date().toISOString(),
      });

      const missing: string[] = [];
      if (!draftProduct.name) missing.push('o *nome do produto*');
      if (draftProduct.price === null) missing.push('o *preço unitário* (ex: R$ 59,90)');
      if (draftProduct.stock === null) missing.push('a *quantidade em estoque* (ex: 20 unidades)');

      if (missing.length === 0) {
        return {
          replyText: [
            `📦 *Resumo do anúncio para publicação:*`,
            `• Nome: *${draftProduct.name}*`,
            `• Preço: *R$ ${Number(draftProduct.price).toFixed(2).replace('.', ',')}*`,
            `• Estoque: *${draftProduct.stock} un.*`,
            `• Categoria: ${draftProduct.category}`,
            draftProduct.description ? `• Descrição: ${draftProduct.description}` : null,
            draftProduct.mainImage ? `• Foto: Anexada com sucesso ✅` : `• Foto: Nenhuma foto anexada`,
            `\nDeseja publicar este anúncio? Digite *confirmar* para colocar no catálogo ou me diga o que deseja alterar.`,
          ]
            .filter(Boolean)
            .join('\n'),
          pendingDraft: draftProduct,
          mode: 'DEMO_FALLBACK',
        };
      }

      const photoAck = mediaUrl ? '📸 Foto do produto recebida com sucesso!\n' : '';
      const identifiedName = draftProduct.name ? `Identifiquei o produto *"${draftProduct.name}"*!\n` : '';
      return {
        replyText: `${photoAck}${identifiedName}Para cadastrá-lo, por favor informe ${missing.join(' e ')}.`,
        pendingDraft: draftProduct,
        mode: 'DEMO_FALLBACK',
      };
    }

    // =========================================================================
    // 5. ATUALIZAÇÃO DE PREÇO
    // =========================================================================
    // Ex: "Mude o preço da camiseta preta para R$ 64,90"
    const priceChangeMatch = text.match(
      /(?:mude|altere|mudar|trocar|colocar|ajuste)\s+(?:o\s+)?preço\s+(?:d[oa]\s+|de\s+)?(.+?)\s+para\s+R?\$?\s*([\d,.]+)/i
    );
    if (priceChangeMatch && store) {
      const productName = priceChangeMatch[1].trim();
      const rawPrice = priceChangeMatch[2].replace('.', '').replace(',', '.');
      const newPrice = parseFloat(rawPrice);

      try {
        const products = await productService.findProductsByName(store.id, productName);
        if (products.length === 0) {
          return {
            replyText: `Não encontrei nenhum produto correspondente a "${productName}". Use *"listar produtos"* para ver os cadastrados.`,
            mode: 'DEMO_FALLBACK',
          };
        }
        if (products.length > 1) {
          return {
            replyText: `Encontrei mais de um produto: ${products.map((p) => p.name).join(', ')}. Por favor indique o nome exato.`,
            mode: 'DEMO_FALLBACK',
          };
        }

        const target = products[0];
        const oldPrice = target.price;
        const updated = await productService.updateProduct(target.id, store.id, { price: newPrice });

        return {
          replyText: `✅ Preço do produto *${updated.name}* atualizado de R$ ${oldPrice.toFixed(2).replace('.', ',')} para *R$ ${updated.price.toFixed(2).replace('.', ',')}*!`,
          actionTaken: 'PRICE_UPDATED',
          mode: 'DEMO_FALLBACK',
        };
      } catch (err: any) {
        return { replyText: `❌ Erro ao atualizar preço: ${err.message}`, mode: 'DEMO_FALLBACK' };
      }
    }

    // =========================================================================
    // 6. ATUALIZAÇÃO DE ESTOQUE (ABSOLUTA E INCREMENTAL)
    // =========================================================================
    // A: Absoluta: "A camiseta preta agora tem 15 unidades"
    const stockAbsoluteMatch = text.match(/(?:a|o)?\s*(.+?)\s+agora tem\s+(\d+)\s*(?:unidades|un|peças)?/i);
    if (stockAbsoluteMatch && store) {
      const productName = stockAbsoluteMatch[1].trim();
      const qty = parseInt(stockAbsoluteMatch[2], 10);
      try {
        const res = await productService.updateStock(store.id, productName, qty, 'SET');
        return {
          replyText: `📦 Estoque do produto *${res.product.name}* atualizado para *${res.newStock} unidades* (anteriormente: ${res.previousStock} un.).`,
          actionTaken: 'STOCK_UPDATED',
          mode: 'DEMO_FALLBACK',
        };
      } catch (err: any) {
        return { replyText: `❌ ${err.message}`, mode: 'DEMO_FALLBACK' };
      }
    }

    // B: Incremental positiva: "Chegaram mais 10 unidades do tênis" / "Adicione 5 unidades de X"
    const stockIncrementMatch = text.match(
      /(?:chegaram|chegou|adicionar|adicione|entraram|mais)\s+(\d+)\s*(?:unidades|un|peças)?\s+(?:d[oa]\s+|de\s+)?(.+)/i
    );
    if (stockIncrementMatch && store) {
      const qty = parseInt(stockIncrementMatch[1], 10);
      const productName = stockIncrementMatch[2].trim();
      try {
        const res = await productService.updateStock(store.id, productName, qty, 'INCREMENT');
        return {
          replyText: `📦 Adicionadas +${qty} unidades ao estoque de *${res.product.name}*! Novo estoque: *${res.newStock} un.*`,
          actionTaken: 'STOCK_INCREMENTED',
          mode: 'DEMO_FALLBACK',
        };
      } catch (err: any) {
        return { replyText: `❌ ${err.message}`, mode: 'DEMO_FALLBACK' };
      }
    }

    // C: Incremental negativa: "Vendi 3 unidades do vestido"
    const stockDecrementMatch = text.match(
      /(?:vendi|vendeu|saíram|retirar|baixar)\s+(\d+)\s*(?:unidades|un|peças)?\s+(?:d[oa]\s+|de\s+)?(.+)/i
    );
    if (stockDecrementMatch && store) {
      const qty = parseInt(stockDecrementMatch[1], 10);
      const productName = stockDecrementMatch[2].trim();
      try {
        const res = await productService.updateStock(store.id, productName, qty, 'DECREMENT');
        return {
          replyText: `📦 Registrada a saída de ${qty} unidades de *${res.product.name}*. Restam *${res.newStock} un.* em estoque.`,
          actionTaken: 'STOCK_DECREMENTED',
          mode: 'DEMO_FALLBACK',
        };
      } catch (err: any) {
        return { replyText: `❌ ${err.message}`, mode: 'DEMO_FALLBACK' };
      }
    }

    // =========================================================================
    // 7. PAUSAR / REPUBLICAR ANÚNCIO
    // =========================================================================
    if (lower.startsWith('pause') || lower.startsWith('pausar') || lower.includes('pause o anúncio')) {
      if (store) {
        const productName = text.replace(/^(pause|pausar|pause o anúncio da|pause o anúncio do|pause o anúncio de)\s+/i, '').trim();
        try {
          const res = await productService.setProductStatus(store.id, productName, 'PAUSED');
          return {
            replyText: `🟡 O anúncio de *${res.name}* foi *pausado*. Ele não aparecerá para os clientes até ser republicado.`,
            actionTaken: 'PRODUCT_PAUSED',
            mode: 'DEMO_FALLBACK',
          };
        } catch (err: any) {
          return { replyText: `❌ ${err.message}`, mode: 'DEMO_FALLBACK' };
        }
      }
    }

    if (lower.startsWith('publique') || lower.startsWith('publicar') || lower.includes('publique novamente')) {
      if (store) {
        const productName = text.replace(/^(publique|publicar|publique novamente|ative)\s+(o anúncio d[oa]\s+|o anúncio de\s+|o\s+)?/i, '').trim();
        try {
          const res = await productService.setProductStatus(store.id, productName, 'PUBLISHED');
          return {
            replyText: `🟢 O anúncio de *${res.name}* foi *republicado* com sucesso e já está visível no catálogo!`,
            actionTaken: 'PRODUCT_PUBLISHED',
            mode: 'DEMO_FALLBACK',
          };
        } catch (err: any) {
          return { replyText: `❌ ${err.message}`, mode: 'DEMO_FALLBACK' };
        }
      }
    }

    // =========================================================================
    // 8. EXCLUSÃO E REMOÇÃO DE PRODUTO
    // =========================================================================
    const isDeleteIntent =
      lower.startsWith('exclua') ||
      lower.startsWith('excluir') ||
      lower.startsWith('delete') ||
      lower.startsWith('deletar') ||
      lower.startsWith('remover') ||
      lower.startsWith('remova') ||
      lower.startsWith('remove') ||
      lower.startsWith('tirar') ||
      lower.startsWith('tira') ||
      lower.startsWith('apagar') ||
      lower.startsWith('apague') ||
      lower.includes('quero tirar') ||
      lower.includes('pode tirar') ||
      lower.includes('favor tirar') ||
      lower.includes('quero remover') ||
      lower.includes('pode remover') ||
      lower.includes('quero excluir') ||
      lower.includes('pode excluir') ||
      lower.includes('quero apagar') ||
      lower.includes('tirar o anúncio') ||
      lower.includes('tirar da loja') ||
      lower.includes('remover o anúncio') ||
      lower.includes('remover da loja') ||
      lower.includes('excluir o anúncio') ||
      lower.includes('exclua o anúncio') ||
      lower.includes('exclua o produto');

    if (isDeleteIntent && store) {
      const productName = text
        .replace(/^(quero tirar|pode tirar|favor tirar|por favor tirar|quero remover|pode remover|quero excluir|pode excluir|quero apagar|pode apagar)\s+/i, '')
        .replace(/^(exclua|excluir|delete|deletar|remover|remova|remove|tirar|tira|apagar|apague)\s+/i, '')
        .replace(/^(o anúncio d[oa]\s+|o anúncio de\s+|o anúncio\s+|o produto\s+|o\s+|a\s+|d[oa]\s+|de\s+)/i, '')
        .replace(/\s+(do catálogo|da loja|da vitrine|do anúncio|por favor)$/i, '')
        .trim();

      if (!productName) {
        return {
          replyText: 'Qual produto você gostaria de remover? Diga por exemplo: _"Remover a camiseta preta"_ ou digite _"listar produtos"_ para ver seu catálogo.',
          mode: 'DEMO_FALLBACK',
        };
      }

      const isAll = /^(tod[ao]s|tudo)/i.test(lower) || /\btod[ao]s\b/i.test(lower);
      const cleanQ = productService.cleanQuery(productName);
      const products = await productService.findProductsByName(store.id, cleanQ || productName);

      if (products.length === 0) {
        return {
          replyText: `⚠️ Não encontrei nenhum produto correspondente a *"${productName}"* no catálogo da sua loja.`,
          mode: 'DEMO_FALLBACK',
        };
      }

      // Se múltiplos produtos genuinamente diferentes
      const normalize = (str: string) =>
        str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const distinctMap = new Map<string, string>();
      for (const p of products) {
        const key = normalize(p.name);
        if (!distinctMap.has(key)) distinctMap.set(key, p.name);
      }
      const distinctNames = Array.from(distinctMap.values());

      if (distinctNames.length > 1 && !isAll) {
        await conversationService.setPendingAction(conversation.id, {
          type: 'AWAITING_DELETE_SELECTION',
          data: { options: distinctNames, query: productName },
          createdAt: new Date().toISOString(),
        });
        return {
          replyText: `Foram encontrados múltiplos produtos diferentes:\n${distinctNames.map((n, i) => `${i + 1}. *${n}*`).join('\n')}\n\nQual deles você deseja excluir? (Ou diga *"remover todos"* para excluir todos)`,
          actionTaken: 'AWAITING_DELETE_SELECTION',
          mode: 'DEMO_FALLBACK',
        };
      }

      // Produto alvo identificado -> pede CONFIRMAÇÃO com detalhes e imagem!
      const target = products[0];
      const priceFormatted = `R$ ${target.price.toFixed(2).replace('.', ',')}`;
      const countText = (isAll && products.length > 1) ? ` (*${products.length} itens correspondentes*)` : '';

      await conversationService.setPendingAction(conversation.id, {
        type: 'CONFIRM_PRODUCT_DELETE',
        data: {
          productId: target.id,
          productName: target.name,
          query: productName,
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
        `Você tem certeza de que deseja remover este produto da sua vitrine${countText}?`,
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
        mode: 'DEMO_FALLBACK',
      };
    }

    // =========================================================================
    // 9. CONSULTAS E LISTAGENS
    // =========================================================================
    if (lower.includes('sem estoque') || lower.includes('esgotados')) {
      if (!store) return { replyText: 'Você ainda não possui loja criada.', mode: 'DEMO_FALLBACK' };
      const outOfStock = await productService.listOutOfStockProducts(store.id);
      if (outOfStock.length === 0) {
        return { replyText: '🎉 Todos os seus produtos estão com estoque disponível!', mode: 'DEMO_FALLBACK' };
      }
      const list = outOfStock.map((p) => `• ⚠️ *${p.name}* - Estoque: 0 un. (R$ ${p.price.toFixed(2).replace('.', ',')})`).join('\n');
      return {
        replyText: `📦 *Produtos esgotados (${outOfStock.length}):*\n\n${list}\n\nPara repor, diga por exemplo: _"Chegaram mais 10 unidades de ${outOfStock[0].name}"_.`,
        mode: 'DEMO_FALLBACK',
      };
    }

    if (lower.includes('menos de') || lower.includes('abaixo de') || lower.includes('custam menos')) {
      if (!store) return { replyText: 'Você ainda não possui loja criada.', mode: 'DEMO_FALLBACK' };
      const priceMatch = text.match(/(?:menos de|abaixo de|custam menos de)\s*R?\$?\s*(\d+)/i);
      const maxPrice = priceMatch ? parseFloat(priceMatch[1]) : 100;
      const products = await productService.listProductsByStore(store.id, { maxPrice });
      if (products.length === 0) {
        return { replyText: `Nenhum produto cadastrado com valor abaixo de R$ ${maxPrice.toFixed(2)}.`, mode: 'DEMO_FALLBACK' };
      }
      const list = products.map((p) => `• *${p.name}* - R$ ${p.price.toFixed(2).replace('.', ',')} (${p.stock} un.)`).join('\n');
      return {
        replyText: `💰 *Produtos abaixo de R$ ${maxPrice.toFixed(2)} (${products.length}):*\n\n${list}`,
        mode: 'DEMO_FALLBACK',
      };
    }

    if (lower.includes('listar') || lower.includes('meus produtos') || lower.includes('todos os produtos')) {
      if (!store) return { replyText: 'Você ainda não possui loja criada. Crie uma dizendo *"Quero criar minha loja"*!', mode: 'DEMO_FALLBACK' };
      const all = await productService.listProductsByStore(store.id);
      if (all.length === 0) {
        return {
          replyText: 'Você ainda não tem nenhum produto cadastrado! Me envie uma foto e os dados para cadastrar o primeiro.',
          mode: 'DEMO_FALLBACK',
        };
      }
      const list = all
        .map(
          (p) =>
            `• ${p.status === 'PUBLISHED' ? '🟢' : '🟡'} *${p.name}* — R$ ${p.price.toFixed(2).replace('.', ',')} | Estoque: ${p.stock} un.`
        )
        .join('\n');
      return {
        replyText: `📋 *Seus Produtos Cadastrados (${all.length}):*\n\n${list}\n\nPara editar qualquer um, basta me dizer (ex: _"Mude o preço da camiseta"_ ou _"A camiseta agora tem 15 un."_).`,
        mode: 'DEMO_FALLBACK',
      };
    }

    if (lower.includes('como ficou minha loja') || lower.includes('minha loja') || lower.includes('mostrar loja') || lower.includes('resumo da loja')) {
      if (!store) return { replyText: 'Você ainda não possui loja cadastrada. Digite *"Quero criar minha loja"*.', mode: 'DEMO_FALLBACK' };
      return {
        replyText: storeService.formatStoreSummary(store),
        mode: 'DEMO_FALLBACK',
      };
    }

    // =========================================================================
    // 10. RESPOSTA DE AJUDA / ORIENTAÇÃO (FALLBACK)
    // =========================================================================
    return {
      replyText: [
        `👋 Olá! Sou o seu assistente comercial para gerenciar sua loja inteira por aqui.`,
        ``,
        `Você pode me enviar mensagens e comandos naturais, como:`,
        `• 📸 Enviar uma foto: _"Essa é uma camiseta preta. Custa R$ 59,90 e tenho 20 unidades."_`,
        `• 💰 Atualizar preço: _"Mude o preço da camiseta preta para R$ 64,90"_`,
        `• 📦 Atualizar estoque: _"Chegaram mais 10 unidades do tênis"_ ou _"Vendi 3 camisetas"_`,
        `• 🟡 Pausar anúncio: _"Pause o anúncio da camiseta preta"_`,
        `• 📋 Consultar catálogo: _"Liste todos os meus produtos"_ ou _"Quais produtos estão sem estoque?"_`,
        `• 🏪 Ver loja: _"Como ficou minha loja?"_`,
      ].join('\n'),
      mode: 'DEMO_FALLBACK',
    };
  }

  /**
   * Extrai preço de formatos comuns: R$ 59,90 | 59,90 | 59.90 | 60 reais | 50
   */
  public extractPrice(text: string): number | null {
    if (!text) return null;
    const clean = text.trim();

    // 1. Padrões explícitos com R$ ou "reais" ou "custa" ou "valor"
    const explicit =
      clean.match(/(?:r\$\s*|custa\s*r?\$?\s*|valor\s*(?:de\s*)?r?\$?\s*)([\d]+(?:[.,]\d{1,2})?)/i) ||
      clean.match(/([\d]+(?:[.,]\d{1,2}))\s*(?:reais|r\$)/i);
    if (explicit) {
      const num = parseFloat(explicit[1].replace(',', '.'));
      if (!isNaN(num) && num > 0) return num;
    }

    // 2. Se a mensagem for exclusivamente um valor monetário/decimal (ex: "59,90", "59.90", "R$ 50")
    const purePrice = clean.match(/^\s*r?\$?\s*(\d+(?:[.,]\d{1,2}))\s*$/i);
    if (purePrice) {
      const num = parseFloat(purePrice[1].replace(',', '.'));
      if (!isNaN(num) && num > 0) return num;
    }

    return null;
  }

  /**
   * Extrai quantidade de estoque: 20 unidades | 20 un | 20 peças | estoque 20 | tenho 20 | 20
   */
  public extractStock(text: string): number | null {
    if (!text) return null;
    const clean = text.trim();

    // 1. Padrões com indicador textual de estoque/unidades
    const explicit =
      clean.match(/(\d+)\s*(?:unidades|unidade|peças|peça|itens|item|un\b)/i) ||
      clean.match(/(?:estoque|tenho|temos|restam|são)\s*(?:de\s*)?(\d+)/i);
    if (explicit) {
      const num = parseInt(explicit[1], 10);
      if (!isNaN(num) && num >= 0) return num;
    }

    // 2. Se a mensagem for puramente um número inteiro e não tiver cara de preço decimal (ex: "20", "10", "5")
    const pureInt = clean.match(/^\s*(\d+)\s*$/);
    if (pureInt) {
      const num = parseInt(pureInt[1], 10);
      if (!isNaN(num) && num >= 0) return num;
    }

    return null;
  }

  /**
   * Extrai o nome limpo do produto descartando preços e números isolados
   */
  public extractCleanName(text: string): string | null {
    if (!text) return null;
    const clean = text.trim();

    // Se for pura menção a preço ou estoque, não é nome
    if (/^\s*r?\$?\s*\d+(?:[.,]\d+)?\s*(?:reais|unidades|un|peças)?\s*$/i.test(clean)) {
      return null;
    }

    // Padrão explícito: "Essa é uma...", "Nome é...", "Chama-se..."
    const prefixMatch = clean.match(
      /(?:o nome é|nome da peça é|nome do produto é|nome é|chama|chama-se|essa é uma|esse é um|este é um|esta é uma)\s+([^.,;]+)/i
    );
    if (prefixMatch) {
      const n = prefixMatch[1].trim();
      return n.charAt(0).toUpperCase() + n.slice(1);
    }

    // Remove referências a preço e estoque do texto
    let candidate = clean
      .replace(/(?:r\$\s*|custa\s*r?\$?\s*|valor\s*(?:de\s*)?r?\$?\s*)[\d]+(?:[.,]\d{1,2})?/gi, '')
      .replace(/[\d]+(?:[.,]\d{1,2})?\s*(?:reais|r\$)/gi, '')
      .replace(/\d+\s*(?:unidades|unidade|peças|itens|un\b)/gi, '')
      .replace(/(?:estoque|tenho|temos)\s*(?:de\s*)?\d+/gi, '')
      .split(/[.,;\n]/)[0]
      .trim();

    candidate = candidate.replace(/^(é\s+uma?|produto\s+é|é)\s+/i, '').trim();

    if (candidate.length >= 2 && !/^\d+$/.test(candidate) && !/^(confirmar|cancelar|sim|não|ok)$/i.test(candidate)) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
    return null;
  }

  /**
   * Infere categoria baseada em palavras-chave
   */
  public inferCategory(text: string): string {
    const lower = text.toLowerCase();
    if (
      lower.includes('camiseta') ||
      lower.includes('camisa') ||
      lower.includes('vestido') ||
      lower.includes('calça') ||
      lower.includes('roupa') ||
      lower.includes('jaqueta') ||
      lower.includes('saia') ||
      lower.includes('blusa')
    ) {
      return 'Roupas & Moda';
    } else if (
      lower.includes('tênis') ||
      lower.includes('tenis') ||
      lower.includes('sapato') ||
      lower.includes('sandália') ||
      lower.includes('chinelo') ||
      lower.includes('bota')
    ) {
      return 'Calçados';
    } else if (
      lower.includes('bolo') ||
      lower.includes('doce') ||
      lower.includes('lanche') ||
      lower.includes('comida') ||
      lower.includes('café') ||
      lower.includes('pizza')
    ) {
      return 'Alimentos';
    } else if (
      lower.includes('anel') ||
      lower.includes('colar') ||
      lower.includes('bolsa') ||
      lower.includes('brinco') ||
      lower.includes('relógio') ||
      lower.includes('pulseira')
    ) {
      return 'Acessórios';
    }
    return 'Geral';
  }

  /**
   * Mantido para compatibilidade retroativa
   */
  public extractProductInfo(text: string, mediaUrl?: string) {
    const price = this.extractPrice(text);
    const stock = this.extractStock(text);
    const name = this.extractCleanName(text) || 'Produto em Destaque';
    const category = this.inferCategory(text);
    const description = `Produto anunciado via WhatsApp. ${text.slice(0, 150)}`;

    return { name, description, price, stock, category, mainImage: mediaUrl };
  }

  private extractSegment(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('roupa') || lower.includes('moda') || lower.includes('vestuário')) return 'Moda & Vestuário';
    if (lower.includes('comida') || lower.includes('alimento') || lower.includes('lanche') || lower.includes('doces')) return 'Alimentos & Gastronomia';
    if (lower.includes('artesanato') || lower.includes('feito a mão')) return 'Artesanato';
    if (lower.includes('eletrônic') || lower.includes('celular') || lower.includes('informátic')) return 'Eletrônicos';
    return 'Comércio Geral';
  }

  private extractHours(text: string): string | null {
    const hoursMatch = text.match(/(\d{1,2}h?\s*(?:às|as|-)\s*\d{1,2}h?)/i);
    return hoursMatch ? `Segunda a Sexta, ${hoursMatch[1]}` : null;
  }
}

export const demoFallbackService = new DemoFallbackService();
