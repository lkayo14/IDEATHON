import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Camera,
  Paperclip,
  Smile,
  Mic,
  MoreVertical,
  Phone,
  Video,
  ArrowLeft,
  CheckCheck,
  Check,
  X,
  Lock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Users,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { VendorPreset } from '../types/marketplace.js';

interface Message {
  id: string;
  sender: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  mediaUrl?: string;
  createdAt: string;
}

interface WhatsAppSimulatorProps {
  vendorPhone: string;
  onCatalogUpdate: () => void;
  resetSignal: number;
  onSelectVendorPhone?: (phone: string, storeSlug?: string) => void;
  vendorPresets?: VendorPreset[];
  activeStoreName?: string;
  onBackToMarketplace?: () => void;
  isMobileView?: boolean;
}

// Exemplos de imagens rápidas para demonstração prática imediata
const SAMPLE_MEDIA = [
  {
    label: '👕 Camiseta Preta',
    url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
    prompt: 'Essa é uma camiseta preta de algodão. Custa R$ 59,90 e tenho 20 unidades.',
  },
  {
    label: '👗 Vestido Primavera',
    url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=80',
    prompt: 'Esse é um vestido floral primavera. Custa R$ 139,90 e tenho 8 unidades.',
  },
  {
    label: '🎂 Bolo Caseiro',
    url: 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=600&auto=format&fit=crop&q=80',
    prompt: 'Esse é nosso Bolo Caseiro de Cenoura com Chocolate. Custa R$ 45,00 e tenho 12 unidades.',
  },
  {
    label: '☕ Café Especial',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    prompt: 'Esse é o Café Especial Cerrado Mineiro 250g. Custa R$ 32,00 e temos 18 unidades.',
  },
  {
    label: '🏪 Foto da Logo',
    url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&auto=format&fit=crop&q=80',
    prompt: 'Essa é a logo da minha loja.',
  },
];

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  vendorPhone,
  onCatalogUpdate,
  resetSignal,
  onSelectVendorPhone,
  vendorPresets,
  activeStoreName,
  onBackToMarketplace,
  isMobileView = false,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<any>(null);
  const [showDemodayDrawer, setShowDemodayDrawer] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadHistory = async () => {
    try {
      const res = await fetch(`/api/simulator/history?phone=${encodeURIComponent(vendorPhone)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setPendingDraft(data.pendingAction);
      }
    } catch (err) {
      console.warn('Erro ao carregar histórico:', err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [vendorPhone, resetSignal]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string, mediaToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : inputText;
    const media = mediaToSend !== undefined ? mediaToSend : attachedImage;

    if (!text.trim() && !media) return;

    // Mensagem otimista no chat
    const tempUserMsg: Message = {
      id: `temp_${Date.now()}`,
      sender: 'USER',
      content: text,
      mediaUrl: media || undefined,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputText('');
    setAttachedImage(null);
    setIsTyping(true);

    try {
      const res = await fetch('/api/simulator/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorPhone,
          messageText: text,
          mediaUrl: media,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        const assistantMsg: Message = {
          id: `asst_${Date.now()}`,
          sender: 'ASSISTANT',
          content: data.reply,
          mediaUrl: data.mediaUrl,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setPendingDraft(data.pendingAction);

        // Notifica o componente da loja para atualizar em tempo real
        onCatalogUpdate();
      } else {
        const errData = await res.json();
        alert(`Erro do assistente: ${errData.error || 'Falha ao processar'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Falha na comunicação com o backend.');
    } finally {
      setIsTyping(false);
    }
  };

  // Upload de arquivo real pelo usuário
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/simulator/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAttachedImage(data.url);
      } else {
        alert('Falha ao enviar arquivo.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro no envio da imagem.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStartNewVendorSession = () => {
    const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);
    const newPhone = `55859${randomSuffix}`;
    onSelectVendorPhone?.(newPhone, undefined);
    setShowDemodayDrawer(false);
  };

  const handleResetCurrentChat = async () => {
    if (!window.confirm('Deseja reiniciar a conversa deste número?')) return;
    try {
      await fetch(`/api/simulator/reset?phone=${encodeURIComponent(vendorPhone)}`, {
        method: 'POST',
      });
      loadHistory();
      onCatalogUpdate();
      setShowDemodayDrawer(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Formatador de horário de mensagem estilo WhatsApp (ex: "10:42")
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <aside className="wa-native-container" aria-label="WhatsApp Business Nativo">
      {/* 1. NATIVE WHATSAPP MOBILE HEADER */}
      <header className="wa-header-bar" role="banner">
        <div className="wa-header-left">
          {/* Botão de retorno ao Marketplace (visível no celular e sempre que houver callback) */}
          {onBackToMarketplace && (
            <button
              type="button"
              className="wa-header-btn wa-back-btn"
              onClick={onBackToMarketplace}
              title="Voltar ao Marketplace Comunitário"
              aria-label="Voltar ao Marketplace"
            >
              <ArrowLeft size={22} />
            </button>
          )}

          {/* Avatar com status de verificação */}
          <div className="wa-header-avatar" aria-hidden="true">
            <span className="wa-avatar-text">
              {activeStoreName ? activeStoreName.charAt(0).toUpperCase() : 'Z'}
            </span>
            <span className="wa-avatar-status-badge" />
          </div>

          {/* Nome e Status */}
          <div className="wa-header-contact">
            <h2 className="wa-contact-name">
              {activeStoreName || 'ZapMarketplace AI'}
            </h2>
            <div className="wa-contact-status">
              <span className="wa-status-text">online • conta comercial</span>
            </div>
          </div>
        </div>

        {/* Botões de Ação à Direita */}
        <div className="wa-header-actions">
          <button
            type="button"
            className="wa-header-btn"
            title="Chamada de Vídeo"
            aria-label="Chamada de vídeo"
            onClick={() => alert('Recurso de chamada de vídeo demonstrativo.')}
          >
            <Video size={20} />
          </button>
          <button
            type="button"
            className="wa-header-btn"
            title="Chamada de Voz"
            aria-label="Chamada de voz"
            onClick={() => alert('Recurso de chamada de voz demonstrativo.')}
          >
            <Phone size={18} />
          </button>
          <button
            type="button"
            className={`wa-header-btn wa-demoday-trigger ${showDemodayDrawer ? 'active' : ''}`}
            title="Controles de Demonstração (Demoday)"
            aria-label="Abrir controles do Demoday"
            onClick={() => setShowDemodayDrawer((prev) => !prev)}
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      {/* 2. DEMODAY COMPACT DRAWER / ACCORDION (Não esmaga a tela) */}
      <div className={`wa-demoday-drawer ${showDemodayDrawer ? 'open' : ''}`}>
        <div className="wa-demoday-drawer-header">
          <div className="wa-drawer-title">
            <Users size={14} />
            <span>Controles de Apresentação (Demoday)</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="wa-drawer-reset-btn"
              onClick={handleResetCurrentChat}
              title="Limpar mensagens deste empreendedor"
            >
              <RotateCcw size={12} /> Reiniciar Chat
            </button>
            <button
              type="button"
              className="wa-drawer-close-btn"
              onClick={() => setShowDemodayDrawer(false)}
              aria-label="Fechar painel demoday"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Seleção de Empreendedor */}
        <div className="wa-drawer-section">
          <span className="wa-drawer-label">Selecionar Empreendedor:</span>
          <div className="wa-drawer-pills-row">
            {vendorPresets?.map((p) => {
              const isSelected = p.phone === vendorPhone;
              return (
                <button
                  key={p.phone}
                  type="button"
                  className={`wa-vendor-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    onSelectVendorPhone?.(p.phone, p.storeSlug);
                    setShowDemodayDrawer(false);
                  }}
                >
                  <span className="chip-name">{p.name}</span>
                  <span className="chip-segment">{p.segment}</span>
                </button>
              );
            })}
            <button
              type="button"
              className="wa-vendor-chip new-store"
              onClick={handleStartNewVendorSession}
            >
              <Plus size={12} />
              <span>Nova Loja (do zero)</span>
            </button>
          </div>
        </div>

        {/* Comandos Rápidos de 1 Clique */}
        <div className="wa-drawer-section">
          <span className="wa-drawer-label">Disparos Rápidos de IA:</span>
          <div className="wa-drawer-pills-row">
            <button
              type="button"
              className="wa-action-chip highlight"
              onClick={() => {
                handleSendMessage('Quero criar minha loja');
                setShowDemodayDrawer(false);
              }}
            >
              🏪 + Criar Loja do Zero
            </button>
            {SAMPLE_MEDIA.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="wa-action-chip"
                onClick={() => {
                  handleSendMessage(item.prompt, item.url);
                  setShowDemodayDrawer(false);
                }}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              className="wa-action-chip"
              onClick={() => {
                handleSendMessage('Mude o preço da camiseta preta para R$ 64,90');
                setShowDemodayDrawer(false);
              }}
            >
              💰 Ajustar Preço
            </button>
            <button
              type="button"
              className="wa-action-chip"
              onClick={() => {
                handleSendMessage('Remover o anúncio da camiseta preta');
                setShowDemodayDrawer(false);
              }}
            >
              🗑️ Remover Anúncio
            </button>
            <button
              type="button"
              className="wa-action-chip"
              onClick={() => {
                handleSendMessage('Quais produtos estão sem estoque?');
                setShowDemodayDrawer(false);
              }}
            >
              ⚠️ Ver Esgotados
            </button>
          </div>
        </div>
      </div>

      {/* Mini-Barra Discreta de Atalho Rápido para Demoday (Quando fechado) */}
      {!showDemodayDrawer && (
        <div
          className="wa-quick-trigger-bar"
          onClick={() => setShowDemodayDrawer(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setShowDemodayDrawer(true)}
          aria-label="Abrir atalhos rápidos do Demoday"
        >
          <div className="wa-quick-trigger-content">
            <span className="wa-quick-badge">DEMODAY</span>
            <span className="wa-quick-text">
              {activeStoreName ? `Loja: ${activeStoreName}` : 'Trocar empreendedor ou enviar comandos'}
            </span>
          </div>
          <ChevronDown size={14} className="wa-quick-chevron" />
        </div>
      )}

      {/* 3. NATIVE WHATSAPP CHAT STREAM */}
      <div className="wa-messages-viewport" role="log" aria-live="polite">
        {/* Aviso de Criptografia / IA Nativa do WhatsApp */}
        <div className="wa-security-banner">
          <Lock size={12} className="wa-lock-icon" />
          <span>
            As mensagens desta conversa são gerenciadas pela inteligência artificial do ZapMarketplace e atualizam o marketplace comunitário em tempo real.
          </span>
        </div>

        {/* Separador de Data Nativo */}
        <div className="wa-date-chip-container">
          <span className="wa-date-chip">HOJE</span>
        </div>

        {/* Estado Inicial sem mensagens */}
        {messages.length === 0 && (
          <div className="wa-empty-chat-hero">
            <div className="wa-empty-icon-circle">
              <Sparkles size={32} />
            </div>
            <h3 className="wa-empty-title">ZapMarketplace AI</h3>
            <p className="wa-empty-desc">
              Envie fotos ou mensagens para criar sua loja, cadastrar produtos, alterar preços e atualizar o estoque instantaneamente!
            </p>
            <button
              type="button"
              className="wa-empty-start-btn"
              onClick={() => handleSendMessage('Quero criar minha loja')}
            >
              🏪 Criar Minha Loja Agora
            </button>
          </div>
        )}

        {/* Balões de Mensagem */}
        {messages.map((msg) => {
          const isUser = msg.sender === 'USER';
          return (
            <div
              key={msg.id}
              className={`wa-bubble-row ${isUser ? 'user-row' : 'assistant-row'}`}
            >
              <div className={`wa-bubble ${isUser ? 'user' : 'assistant'}`}>
                {/* Imagem do Produto / Anexo */}
                {msg.mediaUrl && (
                  <div className="wa-bubble-media">
                    <img
                      src={msg.mediaUrl}
                      alt="Anexo enviado"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Conteúdo textual */}
                <div className="wa-bubble-content">{msg.content}</div>

                {/* Rodapé com Horário e Checkmarks duplos azuis */}
                <div className="wa-bubble-footer">
                  <span className="wa-time-text">{formatTime(msg.createdAt)}</span>
                  {isUser && (
                    <span className="wa-checkmarks" title="Entregue e lido">
                      <CheckCheck size={14} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Indicador de Digitação */}
        {isTyping && (
          <div className="wa-bubble-row assistant-row">
            <div className="wa-bubble assistant typing-bubble">
              <span className="wa-typing-dot dot-1" />
              <span className="wa-typing-dot dot-2" />
              <span className="wa-typing-dot dot-3" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. AÇÃO PENDENTE DE CONFIRMAÇÃO (Card embutido estilo WhatsApp) */}
      {pendingDraft && (
        <div className={`wa-pending-draft-bar ${pendingDraft.type === 'CONFIRM_PRODUCT_DELETE' ? 'delete-mode' : ''}`}>
          <div className="wa-pending-info">
            {(pendingDraft.data?.mainImage || pendingDraft.mainImage) && (
              <img
                src={pendingDraft.data?.mainImage || pendingDraft.mainImage}
                alt="Produto"
                className="wa-pending-thumb"
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className={`wa-pending-badge ${pendingDraft.type === 'CONFIRM_PRODUCT_DELETE' ? 'badge-delete' : ''}`}>
                {pendingDraft.type === 'CONFIRM_PRODUCT_DELETE' ? '⚠️ Exclusão de Produto' : 'Ação Pendente'}
              </span>
              <span className="wa-pending-text">
                {pendingDraft.type === 'CONFIRM_PRODUCT_DELETE'
                  ? `Confirma excluir "${pendingDraft.data?.productName || pendingDraft.productName}"?`
                  : 'Confirma a operação acima?'}
              </span>
            </div>
          </div>
          <div className="wa-pending-actions">
            <button
              type="button"
              className={`wa-btn-confirm ${pendingDraft.type === 'CONFIRM_PRODUCT_DELETE' ? 'btn-delete-confirm' : ''}`}
              onClick={() => handleSendMessage('confirmar')}
            >
              <Check size={14} /> {pendingDraft.type === 'CONFIRM_PRODUCT_DELETE' ? 'Sim, Excluir' : 'Sim, Confirmar'}
            </button>
            <button
              type="button"
              className="wa-btn-cancel"
              onClick={() => handleSendMessage('cancelar')}
            >
              <X size={14} /> Cancelar (Manter)
            </button>
          </div>
        </div>
      )}

      {/* 5. PREVIEW DE FOTO ANEXADA */}
      {attachedImage && (
        <div className="wa-attachment-preview-bar">
          <div className="wa-attachment-thumb">
            <img src={attachedImage} alt="Anexo pronto" />
          </div>
          <div className="wa-attachment-meta">
            <span className="wa-attachment-title">Foto selecionada</span>
            <span className="wa-attachment-sub">Pronta para envio com a mensagem</span>
          </div>
          <button
            type="button"
            className="wa-attachment-remove-btn"
            onClick={() => setAttachedImage(null)}
            aria-label="Remover imagem"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 6. NATIVE WHATSAPP BOTTOM INPUT BAR */}
      <form
        className="wa-bottom-bar"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handleFileUpload}
        />

        {/* Campo Pílula do WhatsApp */}
        <div className="wa-input-pill">
          <button
            type="button"
            className="wa-pill-btn"
            title="Inserir Emoji"
            aria-label="Emojis"
            onClick={() => setInputText((prev) => prev + ' 🛍️')}
          >
            <Smile size={22} />
          </button>

          <input
            type="text"
            className="wa-native-input"
            placeholder="Mensagem"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            aria-label="Mensagem WhatsApp"
          />

          <button
            type="button"
            className="wa-pill-btn"
            title="Anexar documento ou foto"
            aria-label="Anexar arquivo"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={20} />
          </button>

          <button
            type="button"
            className="wa-pill-btn"
            title="Tirar foto do produto"
            aria-label="Câmera do WhatsApp"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera size={21} />
          </button>
        </div>

        {/* Botão de Enviar Redondo / Microfone Flutuante */}
        {inputText.trim() || attachedImage ? (
          <button
            type="submit"
            className="wa-circle-btn send-mode"
            aria-label="Enviar mensagem"
            title="Enviar"
          >
            <Send size={19} />
          </button>
        ) : (
          <button
            type="button"
            className="wa-circle-btn mic-mode"
            aria-label="Gravar áudio"
            title="Dica: Digite ou escolha um atalho acima"
            onClick={() => handleSendMessage('Quero ver o resumo da minha loja')}
          >
            <Mic size={20} />
          </button>
        )}
      </form>
    </aside>
  );
};

export default WhatsAppSimulator;
