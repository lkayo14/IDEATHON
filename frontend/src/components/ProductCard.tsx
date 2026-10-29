import React from 'react';
import { Package } from 'lucide-react';

export interface ProductItem {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  mainImage?: string;
  status: string; // PUBLISHED, PAUSED, DRAFT
  updatedAt: string;
}

interface ProductCardProps {
  product: ProductItem;
  onSelect: (product: ProductItem) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const isOutOfStock = product.stock <= 0;
  const isPaused = product.status === 'PAUSED';
  const isLowStock = !isOutOfStock && product.stock <= 3;

  let statusBadgeClass = 'published';
  let statusText = 'Em Estoque';

  if (isPaused) {
    statusBadgeClass = 'paused';
    statusText = 'Pausado';
  } else if (isOutOfStock) {
    statusBadgeClass = 'out';
    statusText = 'Esgotado';
  } else if (isLowStock) {
    statusBadgeClass = 'paused';
    statusText = `Restam ${product.stock} un.`;
  }

  const fallbackImage =
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
  const imageSrc = product.mainImage || fallbackImage;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(product);
    }
  };

  return (
    <article
      className="product-card"
      onClick={() => onSelect(product)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${product.name}, Preço R$ ${product.price.toFixed(2).replace('.', ',')}. Status: ${statusText}`}
    >
      <div className="product-img-box">
        <img
          src={imageSrc}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackImage;
          }}
        />
        <div className={`badge-status ${statusBadgeClass}`} aria-hidden="true">
          {statusText}
        </div>
      </div>

      <div className="product-body">
        <span className="product-category-tag">{product.category || 'Geral'}</span>
        <h3 className="product-title">{product.name}</h3>

        {product.description && (
          <p className="product-desc-snippet">
            {product.description}
          </p>
        )}

        <div className="product-price-row">
          <div className="product-price-col">
            <span className="product-price-label">Preço</span>
            <span className="product-price">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div className="product-stock-chip" title={`${product.stock} unidades em estoque`}>
            <Package size={13} aria-hidden="true" />
            <span>{product.stock} un.</span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
