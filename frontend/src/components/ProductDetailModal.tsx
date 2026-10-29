import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Package, ShieldCheck, Minus, Plus, Share2, Check } from 'lucide-react';
import { ProductItem } from './ProductCard.js';

interface ProductDetailModalProps {
  product: ProductItem | null;
  storeWhatsapp?: string;
  storeName?: string;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  storeWhatsapp,
  storeName,
  onClose,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    // Redefine quantidade para 1 ao abrir novo produto
    setQuantity(1);
    setCopiedLink(false);

    // Fechar ao pressionar tecla Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const isOutOfStock = product.stock <= 0;
  const maxAvailable = Math.max(1, product.stock);

  const handleIncrement = () => {
    if (quantity < maxAvailable) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const subtotal = product.price * quantity;
  const cleanWhatsapp = (storeWhatsapp || '5585999998888').replace(/\D/g, '');

  const buyMessage = encodeURIComponent(
    `Olá! Gostaria de fazer um pedido na loja "${storeName || 'Online'}":\n` +
    `• ${quantity}x ${product.name} (R$ ${product.price.toFixed(2).replace('.', ',')} un.)\n` +
    `• Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}\n\n` +
    `Como combinamos a entrega e o pagamento?`
  );

  const whatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${buyMessage}`;

  const handleCopySummary = async () => {
    const textToCopy = `${product.name} - R$ ${product.price.toFixed(2).replace('.', ',')} na loja ${storeName || 'Online'}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const fallbackImage =
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
  const imageSrc = product.mainImage || fallbackImage;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-product-title"
    >
      <div
        className="modal-content-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Fechar detalhes do produto"
          title="Fechar (Esc)"
        >
          <X size={18} />
        </button>

        <div className="modal-grid">
          {/* Coluna Visual */}
          <div className="modal-img-col">
            <img
              src={imageSrc}
              alt={product.name}
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackImage;
              }}
            />
          </div>

          {/* Coluna Transacional */}
          <div className="modal-info-col">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    color: 'var(--slate-400)',
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.04em',
                  }}
                >
                  {product.category || 'Geral'}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: product.status === 'PUBLISHED' ? 'var(--emerald-500)' : 'var(--amber-500)',
                  }}
                >
                  ● {product.status === 'PUBLISHED' ? 'Ativo no catálogo' : 'Pausado'}
                </span>
              </div>

              <h2 id="modal-product-title" style={{ fontSize: '1.45rem', marginBottom: '8px', color: '#fff' }}>
                {product.name}
              </h2>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}>
                  R$ {product.price.toFixed(2).replace('.', ',')}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>/ unidade</span>
              </div>

              <p style={{ color: 'var(--slate-400)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '16px' }}>
                {product.description || 'Produto oficial cadastrado e gerenciado pelo comerciante via WhatsApp.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--slate-400)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={16} style={{ color: 'var(--primary)' }} />
                  <span>
                    Estoque: <strong>{product.stock} unidades disponíveis</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--accent-blue)' }} />
                  <span>Atualização instantânea via Inteligência Artificial</span>
                </div>
              </div>
            </div>

            {/* Micro-Checkout: Seletor de Quantidade & Ação Transacional */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {!isOutOfStock ? (
                <div className="qty-control-box">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--slate-400)', fontWeight: 600 }}>
                      Quantidade
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                      Total: R$ {subtotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="qty-stepper" role="group" aria-label="Seletor de quantidade">
                    <button
                      className="qty-btn"
                      onClick={handleDecrement}
                      disabled={quantity <= 1}
                      aria-label="Diminuir quantidade"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="qty-display" aria-live="polite">
                      {quantity}
                    </span>
                    <button
                      className="qty-btn"
                      onClick={handleIncrement}
                      disabled={quantity >= maxAvailable}
                      aria-label="Aumentar quantidade"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#f87171',
                    fontSize: '0.85rem',
                    textAlign: 'center',
                    fontWeight: 600,
                  }}
                >
                  Este produto está temporariamente esgotado.
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={isOutOfStock ? undefined : whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-whatsapp-buy"
                  style={{
                    flex: 1,
                    opacity: isOutOfStock ? 0.4 : 1,
                    pointerEvents: isOutOfStock ? 'none' : 'auto',
                  }}
                  aria-disabled={isOutOfStock}
                >
                  <MessageCircle size={18} />
                  <span>Pedir no WhatsApp ({quantity}x)</span>
                </a>

                <button
                  onClick={handleCopySummary}
                  className="refresh-btn"
                  title="Copiar resumo do produto"
                  aria-label="Copiar link e resumo do produto"
                  style={{ padding: '0 12px' }}
                >
                  {copiedLink ? <Check size={16} style={{ color: 'var(--primary)' }} /> : <Share2 size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
