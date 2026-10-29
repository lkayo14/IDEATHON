import { env } from '../../config/env.js';
import { conversationService } from '../conversation/conversation.service.js';
import { geminiService } from './gemini.service.js';
import { demoFallbackService, AIProcessResult } from './demo-fallback.service.js';
import { storeService } from '../store/store.service.js';

export interface ProcessMessagePayload {
  vendorPhone: string;
  senderName?: string;
  messageText: string;
  mediaUrl?: string;
  mediaType?: string;
}

export class AIOrchestrator {
  /**
   * Ponto único de entrada para todas as mensagens recebidas
   * (seja via WhatsApp Webhook real ou via Simulador Web)
   */
  async handleIncomingMessage(payload: ProcessMessagePayload): Promise<{
    reply: string;
    conversationId: string;
    mode: 'GEMINI_API' | 'DEMO_FALLBACK';
    modelUsed: string;
    store: any;
    pendingAction: any;
  }> {
    const { vendorPhone, senderName, messageText, mediaUrl, mediaType } = payload;

    // 1. Garante ou recupera a sessão da conversa
    const conversation = await conversationService.getOrCreateConversation(vendorPhone, senderName);

    // 2. Registra a mensagem do usuário no histórico
    await conversationService.appendMessage(
      conversation.id,
      'USER',
      messageText,
      mediaUrl,
      mediaType,
      { senderName }
    );

    // 3. Processa através da IA (Gemini oficial ou Demo Fallback)
    let result: AIProcessResult;
    let modelUsed: string;

    if (env.isGeminiConfigured) {
      result = await geminiService.processMessage({
        vendorPhone,
        messageText,
        mediaUrl,
        mediaType,
      });
      modelUsed = env.GEMINI_MODEL;
    } else {
      result = await demoFallbackService.processMessage({
        vendorPhone,
        messageText,
        mediaUrl,
        mediaType,
      });
      modelUsed = 'Modo Demonstração (Regras Determinísticas)';
    }

    // 4. Registra a resposta do assistente no histórico (incluindo foto do produto em confirmações de exclusão)
    await conversationService.appendMessage(
      conversation.id,
      'ASSISTANT',
      result.replyText,
      result.mediaUrl,
      result.mediaUrl ? 'image/jpeg' : undefined,
      { mode: result.mode, actionTaken: result.actionTaken }
    );

    // 5. Retorna dados atualizados para atualizar o frontend em tempo real
    const updatedStore = await storeService.getStoreByVendorPhone(vendorPhone);
    const updatedConv = await conversationService.getOrCreateConversation(vendorPhone);
    const pendingAction = conversationService.parsePendingAction(updatedConv.pendingAction);

    return {
      reply: result.replyText,
      mediaUrl: result.mediaUrl,
      conversationId: conversation.id,
      mode: result.mode,
      modelUsed,
      store: updatedStore,
      pendingAction,
    };
  }
}

export const aiOrchestrator = new AIOrchestrator();
