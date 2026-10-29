import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Store as StoreIcon,
  ShoppingBag,
  Camera,
  Phone,
  MapPin,
  Clock,
  CreditCard,
  Truck,
  RefreshCw,
  Search,
  CheckCircle2,
  X,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { ProductCard, ProductItem } from './ProductCard.js';
import { ProductDetailModal } from './ProductDetailModal.js';

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  segment?: string;
  logoUrl?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  instagram?: string;
  businessHours?: string;
  paymentMethods?: string;
  deliveryInfo?: string;
  status: string;
}

interface StorefrontProps {
  storeSlug: string;
  refreshTrigger: number;
  onBackToMarketplace?: () => void;
}

export const Storefront: React.FC<StorefrontProps> = ({
  storeSlug,
  refreshTrigger,
  onBackToMarketplace,
}) => {
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'price-asc' | 'price-desc' | 'stock'>('recent');
  const [showPaused, setShowPaused] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [loading, setLoading] = useState(true);
  const lastLoadedSlug = useRef<string | null>(null);

  const fetchStoreData = async (silent = false) => {
    const isNewSlug = lastLoadedSlug.current !== storeSlug;
    if (!silent || isNewSlug || !store) {
      setLoading(true);
      if (isNewSlug) {
        setProducts([]);
        setStore(null);
      }
    }

    try {
      const resStore = await fetch(`/api/stores/${encodeURIComponent(storeSlug)}`);
      if (resStore.ok) {
        const storeData = await resStore.json();
        setStore(storeData);

        const resProducts = await fetch(`/api/stores/${encodeURIComponent(storeData.id)}/products`);
        if (resProducts.ok) {
          const prodData = await resProducts.json();
          const newProducts: ProductItem[] = prodData.products || [];
          
          // Evita substituir o estado se a lista for idêntica para poupar re-renders desnecessários
          setProducts((prev) => {
            if (prev.length === newProducts.length) {
              const hasChanged = newProducts.some((item, idx) => {
                const p = prev[idx];
                return (
                  !p ||
                  p.id !== item.id ||
                  p.name !== item.name ||
                  p.price !== item.price ||
                  p.stock !== item.stock ||
                  p.status !== item.status ||
                  p.mainImage !== item.mainImage
                );
              });
              if (!hasChanged) return prev;
            }
            return newProducts;
          });
        }
      } else {
        const resAll = await fetch('/api/stores');
        if (resAll.ok) {
          const allStores = await resAll.json();
          if (allStores.length > 0) {
            const firstStore = allStores[0];
            setStore(firstStore);
            const resProds = await fetch(`/api/stores/${encodeURIComponent(firstStore.id)}/products`);
            if (resProds.ok) {
              const pData = await resProds.json();
              setProducts(pData.products || []);
            }
          } else {
            setStore(null);
            setProducts([]);
          }
        }
      }
      lastLoadedSlug.current = storeSlug;
    } catch (err) {
      console.warn('Erro ao carregar dados da vitrine:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isNewSlug = lastLoadedSlug.current !== storeSlug;
    fetchStoreData(!isNewSlug);
  }, [storeSlug, refreshTrigger]);

  // Contagem por categoria
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: products.length };
    products.forEach((p) => {
      const cat = p.category || 'Geral';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const uniqueCats = ['Todos', ...Array.from(new Set(products.map((p) => p.category || 'Geral')))];
    return uniqueCats.map((cat) => ({
      name: cat,
      count: counts[cat] || 0,
    }));
  }, [products]);

  // Quantidade de anúncios pausados
  const pausedCount = useMemo(() => {
    return products.filter((p) => p.status === 'PAUSED').length;
  }, [products]);

  // Filtro e Ordenação
  const processedProducts = useMemo(() => {
    let result = products.filter((p) => {
      // Por padrão em vitrine pública, não exibe itens pausados a menos que o comerciante selecione
      if (!showPaused && p.status === 'PAUSED') return false;

      const matchesCategory = selectedCategory === 'Todos' || (p.category || 'Geral') === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });

    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'stock') {
      result.sort((a, b) => b.stock - a.stock);
    } else {
      // Recent / default
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return result;
  }, [products, selectedCategory, searchQuery, sortBy]);

  // Métricas rápidas
  const totalInStock = useMemo(() => {
    return products.reduce((acc, curr) => acc + (curr.stock > 0 ? curr.stock : 0), 0);
  }, [products]);

  return (
    <div className="storefront-panel">
      {/* Barra de Navegação de Retorno ao Marketplace Comunitário */}
      {onBackToMarketplace && (
        <nav className="storefront-nav-back" aria-label="Navegação do marketplace">
          <button
            type="button"
            className="btn-back-marketplace"
            onClick={onBackToMarketplace}
            title="Voltar para todas as lojas comunitárias"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>← Todas as Lojas do Bairro</span>
          </button>
          <div className="storefront-breadcrumb" aria-hidden="true">
            <span className="crumb-root">Marketplace Comunitário</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">{store?.name || 'Catálogo'}</span>
          </div>
        </nav>
      )}

      {/* Hero Header da Loja */}
      {store ? (
        <header className="store-hero-card">
          <div className="store-hero-top">
            <div className="store-logo-wrapper">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.name} />
              ) : (
                <StoreIcon size={36} style={{ color: 'var(--primary)' }} />
              )}
            </div>

            <div className="store-header-info">
              <div className="store-title-row">
                <h1>{store.name}</h1>
                <div className="badge-verified">
                  <CheckCircle2 size={13} />
                  <span>Loja Oficial</span>
                </div>
                <div className="badge-open-status">
                  <Clock size={12} />
                  <span>Atendimento Ativo</span>
                </div>
              </div>

              {store.segment && (
                <div style={{ fontSize: '0.82rem', color: 'var(--accent-purple)', fontWeight: 700, marginBottom: '6px' }}>
                  🏷️ {store.segment}
                </div>
              )}

              <p className="store-description-text">
                {store.description || 'Catálogo e pedidos gerenciados em tempo real via inteligência artificial.'}
              </p>

              <div className="store-meta-grid">
                {store.whatsapp && (
                  <div className="meta-chip">
                    <Phone size={13} style={{ color: 'var(--wa-green)' }} />
                    <span>{store.whatsapp}</span>
                  </div>
                )}
                {store.instagram && (
                  <div className="meta-chip">
                    <Camera size={13} style={{ color: '#e1306c' }} />
                    <span>{store.instagram}</span>
                  </div>
                )}
                {store.businessHours && (
                  <div className="meta-chip">
                    <Clock size={13} style={{ color: '#38bdf8' }} />
                    <span>{store.businessHours}</span>
                  </div>
                )}
                {store.address && (
                  <div className="meta-chip">
                    <MapPin size={13} style={{ color: '#f43f5e' }} />
                    <span>{store.address}</span>
                  </div>
                )}
                <div className="meta-chip">
                  <CreditCard size={13} style={{ color: 'var(--primary)' }} />
                  <span>{store.paymentMethods || 'Pix, Cartão, Dinheiro'}</span>
                </div>
                <div className="meta-chip">
                  <Truck size={13} style={{ color: '#fbbf24' }} />
                  <span>{store.deliveryInfo || 'Retirada ou entrega'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Métricas Rápidas */}
          <div className="store-metrics-bar">
            <div className="metric-item">
              <span className="metric-label">Produtos Ativos</span>
              <span className="metric-value">{products.length}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Itens em Estoque</span>
              <span className="metric-value">{totalInStock} un.</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Categorias</span>
              <span className="metric-value">{categoriesWithCounts.length - 1 || 1}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Canal Direto</span>
              <span className="metric-value" style={{ color: 'var(--wa-green)', fontSize: '0.95rem' }}>WhatsApp</span>
            </div>
          </div>
        </header>
      ) : (
        <div className="empty-state-box" style={{ marginBottom: '24px' }}>
          <div className="empty-state-icon">
            <StoreIcon size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', color: '#fff' }}>Nenhuma Loja Criada Ainda</h2>
          <p style={{ color: 'var(--slate-400)', fontSize: '0.88rem', maxWidth: '420px' }}>
            No simulador de WhatsApp ao lado, digite <em>"Quero criar minha loja Moda da Ana"</em> para dar início ao cadastro 100% via IA!
          </p>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <section className="catalog-toolbar" aria-label="Filtros do Catálogo">
        <div className="category-filter-list" role="tablist">
          {categoriesWithCounts.map((cat) => (
            <button
              key={cat.name}
              role="tab"
              aria-selected={selectedCategory === cat.name}
              className={`cat-pill-btn ${selectedCategory === cat.name ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.name)}
            >
              <span>{cat.name}</span>
              <span className="cat-count-badge">{cat.count}</span>
            </button>
          ))}
        </div>

        <div className="catalog-actions">
          {/* Campo de Busca */}
          <div className="search-input-wrapper">
            <Search size={15} style={{ color: 'var(--slate-400)' }} />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar produtos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar produtos pelo nome ou descrição"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', display: 'flex' }}
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Ordenação */}
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Ordenar produtos"
          >
            <option value="recent">Mais Recentes</option>
            <option value="price-asc">Menor Preço</option>
            <option value="price-desc">Maior Preço</option>
            <option value="stock">Maior Estoque</option>
          </select>

          {/* Botão Pausados (se houver) */}
          {pausedCount > 0 && (
            <button
              className={`refresh-btn ${showPaused ? 'active' : ''}`}
              onClick={() => setShowPaused(!showPaused)}
              title={showPaused ? 'Ocultar anúncios pausados' : 'Exibir anúncios pausados'}
              style={{
                fontSize: '0.8rem',
                color: showPaused ? '#fbbf24' : 'var(--slate-400)',
                borderColor: showPaused ? 'rgba(245, 158, 11, 0.4)' : undefined,
              }}
            >
              <span>{showPaused ? `Ocultar Pausados (${pausedCount})` : `Pausados (${pausedCount})`}</span>
            </button>
          )}

          {/* Botão Atualizar */}
          <button
            className="refresh-btn"
            onClick={() => fetchStoreData(false)}
            title="Atualizar vitrine"
            aria-label="Atualizar catálogo de produtos"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>
        </div>
      </section>

      {/* Grid de Produtos ou Skeleton Loaders */}
      {loading && products.length === 0 ? (
        <div className="products-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="product-card" style={{ cursor: 'default' }}>
              <div className="skeleton-box" style={{ width: '100%', aspectRatio: '1/1' }} />
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton-box" style={{ width: '40%', height: '12px' }} />
                <div className="skeleton-box" style={{ width: '80%', height: '18px' }} />
                <div className="skeleton-box" style={{ width: '100%', height: '12px', marginTop: '4px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <div className="skeleton-box" style={{ width: '40%', height: '22px' }} />
                  <div className="skeleton-box" style={{ width: '25%', height: '16px' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : processedProducts.length > 0 ? (
        <div className="products-grid">
          {processedProducts.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              onSelect={(p) => setSelectedProduct(p)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state-box">
          <div className="empty-state-icon">
            <ShoppingBag size={28} />
          </div>
          <h3 style={{ color: '#fff', fontSize: '1.15rem' }}>Nenhum produto encontrado</h3>
          <p style={{ color: 'var(--slate-400)', fontSize: '0.85rem', maxWidth: '380px' }}>
            {searchQuery
              ? `Não encontramos nenhum item correspondente a "${searchQuery}".`
              : 'Nenhum produto cadastrado nesta categoria no momento.'}
          </p>
          {(searchQuery || selectedCategory !== 'Todos') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Todos');
              }}
              className="cat-pill-btn active"
              style={{ marginTop: '8px' }}
            >
              Limpar Filtros
            </button>
          )}
        </div>
      )}

      {/* Modal de Detalhes do Produto */}
      <ProductDetailModal
        product={selectedProduct}
        storeName={store?.name}
        storeWhatsapp={store?.whatsapp}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
};

export default Storefront;
