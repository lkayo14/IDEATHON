import { env } from '../../config/env.js';
import { aiOrchestrator } from '../ai/ai.orchestrator.js';
import { conversationService } from '../conversation/conversation.service.js';
import { storageService } from '../storage/storage.service.js';

export class WhatsAppService {
  /**
   * Validação de verificação do Webhook (Meta Cloud API)
   */
  verifyWebhook(mode: string | undefined, token: string | undefined, challenge: string | undefined): string | null {
    if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
      console.log('[WhatsApp Webhook] Verificado com sucesso pela Meta.');
      return challenge || '';
    }
    return null;
  }

  /**
   * Envia mensagem de texto via Z-API, Meta Cloud API ou Modo Simulado
   */
  async sendMessage(toPhone: string, text: string): Promise<{ success: boolean; simulated: boolean; messageId?: string }> {
    const cleanPhone = toPhone.replace(/\D/g, '');

    // 1. Prioridade para Z-API caso configurada
    if (env.isZApiConfigured) {
      return this.sendZApiMessage(cleanPhone, text);
    }

    // 2. Meta Cloud API caso configurada
    if (env.isMetaWhatsAppConfigured) {
      return this.sendMetaMessage(cleanPhone, text);
    }

    // 3. Fallback / Modo Simulado
    console.log(`[WhatsApp Simulado] Para: ${cleanPhone} | Mensagem:\n${text}`);
    return { success: true, simulated: true };
  }

  /**
   * Envio direto via Z-API (https://api.z-api.io)
   */
  async sendZApiMessage(cleanPhone: string, text: string): Promise<{ success: boolean; simulated: boolean; messageId?: string }> {
    try {
      const url = `https://api.z-api.io/instances/${env.ZAPI_INSTANCE_ID}/token/${env.ZAPI_INSTANCE_TOKEN}/send-text`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (env.ZAPI_CLIENT_TOKEN) {
        headers['Client-Token'] = env.ZAPI_CLIENT_TOKEN;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phone: cleanPhone,
          message: text,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('[Z-API] Erro ao enviar mensagem:', data);
        return { success: false, simulated: false };
      }

      console.log(`[Z-API] Mensagem enviada com sucesso para ${cleanPhone}`);
      return {
        success: true,
        simulated: false,
        messageId: data.zaapId || data.messageId,
      };
    } catch (err) {
      console.error('[Z-API] Falha na comunicação com a API Z-API:', err);
      return { success: false, simulated: false };
    }
  }

  /**
   * Envio via Meta Cloud API Oficial
   */
  async sendMetaMessage(cleanPhone: string, text: string): Promise<{ success: boolean; simulated: boolean; messageId?: string }> {
    try {
      const url = `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: text },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('[Meta WhatsApp] Erro ao enviar mensagem:', data);
        return { success: false, simulated: false };
      }

      return {
        success: true,
        simulated: false,
        messageId: data.messages?.[0]?.id,
      };
    } catch (err) {
      console.error('[Meta WhatsApp] Falha na requisição de envio:', err);
      return { success: false, simulated: false };
    }
  }

  /**
   * Baixa mídia recebida na Cloud API da Meta
   */
  async downloadWhatsAppMedia(mediaId: string): Promise<string | null> {
    if (!env.isMetaWhatsAppConfigured) return null;

    try {
      const metaUrl = `https://graph.facebook.com/v21.0/${mediaId}`;
      const metaRes = await fetch(metaUrl, {
        headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
      });
      if (!metaRes.ok) return null;
      const metaData = await metaRes.json();
      const directUrl = metaData.url;

      const saved = await storageService.downloadAndSave(directUrl, {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      });

      return saved.url;
    } catch (err) {
      console.error('[WhatsApp Media] Erro ao baixar imagem da Meta:', err);
      return null;
    }
  }

  /**
   * Processa webhook oficial da Z-API (on-message-received)
   */
  async processZApiWebhook(body: any): Promise<{ processed: boolean; reason?: string }> {
    // 1. Ignora mensagens enviadas pelo próprio bot para evitar loops infinitos
    if (body.fromMe === true || body.isGroup === true) {
      return { processed: false, reason: 'Mensagem do próprio bot ou grupo ignorada' };
    }

    const senderPhone = (body.phone || body.senderPhone || '').replace(/\D/g, '');
    if (!senderPhone) {
      return { processed: false, reason: 'Nenhum telefone remetente no payload da Z-API' };
    }

    const messageId = body.messageId || body.zaapId || body.id || `zapi_${Date.now()}`;

    // 2. Idempotência
    if (await conversationService.isEventProcessed(messageId)) {
      console.log(`[Z-API] Mensagem ${messageId} já processada. Ignorando.`);
      return { processed: true, reason: 'Evento duplicado já processado' };
    }

    const senderName = body.senderName || body.chatName || 'Vendedor';
    let messageText = '';
    let mediaUrl: string | undefined = undefined;
    let mediaType: string | undefined = undefined;

    // Extrai texto da mensagem da Z-API
    if (typeof body.text === 'string') {
      messageText = body.text;
    } else if (body.text?.message) {
      messageText = body.text.message;
    } else if (body.caption) {
      messageText = body.caption;
    }

    // Extrai imagem caso enviada
    const imageUrl = body.image?.imageUrl || body.photo?.imageUrl || body.imageUrl;
    if (imageUrl) {
      mediaType = 'image';
      try {
        const saved = await storageService.downloadAndSave(imageUrl);
        mediaUrl = saved.url;
      } catch (imgErr) {
        console.warn('[Z-API] Falha ao baixar imagem da Z-API:', imgErr);
        mediaUrl = imageUrl;
      }
    }

    // Processa pelo pipeline unificado de IA e regras de negócio
    const result = await aiOrchestrator.handleIncomingMessage({
      vendorPhone: senderPhone,
      senderName,
      messageText,
      mediaUrl,
      mediaType,
    });

    // Envia resposta de volta para o vendedor no WhatsApp via Z-API
    await this.sendMessage(senderPhone, result.reply);

    // Registra evento como processado
    await conversationService.markEventProcessed(messageId);

    return { processed: true };
  }

  /**
   * Processa evento de Webhook oficial da Meta
   */
  async processWebhookEvent(body: any): Promise<{ processed: boolean; reason?: string }> {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];

    if (!message) {
      return { processed: false, reason: 'Nenhuma mensagem relevante no payload' };
    }

    const messageId = message.id;

    if (await conversationService.isEventProcessed(messageId)) {
      console.log(`[WhatsApp Webhook] Mensagem ${messageId} já processada. Ignorando.`);
      return { processed: true, reason: 'Evento duplicado já processado' };
    }

    const senderPhone = message.from;
    const senderName = change?.contacts?.[0]?.profile?.name || 'Vendedor';

    let messageText = '';
    let mediaUrl: string | undefined = undefined;
    let mediaType: string | undefined = undefined;

    if (message.type === 'text') {
      messageText = message.text?.body || '';
    } else if (message.type === 'image') {
      mediaType = 'image';
      messageText = message.image?.caption || '';
      const mediaId = message.image?.id;
      if (mediaId) {
        const downloaded = await this.downloadWhatsAppMedia(mediaId);
        if (downloaded) mediaUrl = downloaded;
      }
    }

    const result = await aiOrchestrator.handleIncomingMessage({
      vendorPhone: senderPhone,
      senderName,
      messageText,
      mediaUrl,
      mediaType,
    });

    await this.sendMessage(senderPhone, result.reply);
    await conversationService.markEventProcessed(messageId);

    return { processed: true };
  }
}

export const whatsAppService = new WhatsAppService();
