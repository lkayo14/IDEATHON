import { prisma } from '../../db/prisma.js';
import { storeService } from '../store/store.service.js';

export interface PendingAction {
  type: 'CONFIRM_PRODUCT_CREATE' | 'CONFIRM_STORE_SETUP' | 'CONFIRM_PRODUCT_DELETE' | 'AWAIT_MORE_INFO' | 'AWAITING_DELETE_SELECTION';
  data: any;
  createdAt: string;
}

export class ConversationService {
  /**
   * Obtém ou cria uma sessão de conversa para o telefone do vendedor
   */
  async getOrCreateConversation(vendorPhone: string, senderName?: string) {
    const cleanPhone = vendorPhone.replace(/\D/g, '');
    const vendor = await storeService.getOrCreateVendor(cleanPhone, senderName || 'Vendedor');
    const store = await storeService.getStoreByVendorPhone(cleanPhone);

    let conversation = await prisma.conversation.findFirst({
      where: { vendorPhone: cleanPhone },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          vendorPhone: cleanPhone,
          vendorId: vendor.id,
          storeId: store?.id || null,
          currentIntent: 'IDLE',
        },
      });
    } else if (store && conversation.storeId !== store.id) {
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: { storeId: store.id },
      });
    }

    return conversation;
  }

  /**
   * Salva mensagem no histórico
   */
  async appendMessage(
    conversationId: string,
    sender: 'USER' | 'ASSISTANT' | 'SYSTEM',
    content: string,
    mediaUrl?: string,
    mediaType?: string,
    rawPayload?: any
  ) {
    return prisma.message.create({
      data: {
        conversationId,
        sender,
        content,
        mediaUrl,
        mediaType,
        rawPayload: rawPayload ? JSON.stringify(rawPayload) : null,
      },
    });
  }

  /**
   * Recupera histórico recente de mensagens
   */
  async getRecentMessages(conversationId: string, limit = 15) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }).then((msgs) => msgs.reverse());
  }

  /**
   * Define ação pendente que necessita confirmação do usuário
   */
  async setPendingAction(conversationId: string, action: PendingAction | null) {
    return prisma.conversation.update({
      where: { id: conversationId },
      data: {
        pendingAction: action ? JSON.stringify(action) : null,
        currentIntent: action ? action.type : 'IDLE',
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Limpa qualquer ação pendente (cancelamento ou finalização)
   */
  async clearPendingAction(conversationId: string) {
    return this.setPendingAction(conversationId, null);
  }

  /**
   * Obtém a ação pendente parseada
   */
  parsePendingAction(pendingActionStr: string | null): PendingAction | null {
    if (!pendingActionStr) return null;
    try {
      return JSON.parse(pendingActionStr) as PendingAction;
    } catch {
      return null;
    }
  }

  /**
   * Validação de idempotência para evitar reprocessamento de webhooks do WhatsApp
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    const existing = await prisma.processedWebhookEvent.findUnique({
      where: { id: eventId },
    });
    return Boolean(existing);
  }

  /**
   * Marca evento como processado
   */
  async markEventProcessed(eventId: string): Promise<void> {
    try {
      await prisma.processedWebhookEvent.create({
        data: { id: eventId },
      });
    } catch {
      // Já gravado, ignorar
    }
  }
}

export const conversationService = new ConversationService();
