import React, { useState, useMemo } from 'react';
import {
  Store as StoreIcon,
  MapPin,
  Clock,
  CreditCard,
  Package,
  ArrowRight,
  Search,
  X,
  Sparkles,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { CommunityStore } from '../types/marketplace.js';

interface MarketplacePortalProps {
  stores: CommunityStore[];
  isLoading: boolean;
  onSelectStore: (slug: string) => void;
  onOpenNewStoreDemo?: () => void;
}

export const MarketplacePortal: React.FC<MarketplacePortalProps> = ({
  stores,
  isLoading,
  onSelectStore,
  onOpenNewStoreDemo,
}) => {
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Segmentos disponíveis com contagem
  const segmentsWithCount = useMemo(() => {
    const map = new Map<string, number>();
    stores.forEach((store) => {
      const seg = store.segment?.trim() || 'Geral';
      map.set(seg, (map.get(seg) || 0) + 1);
    });
    return Array.from(map.entries()).map(([segment, count]) => ({
      segment,
      count,
    }));
  }, [stores]);

  // Total de produtos somados em todo o marketplace
  const totalProducts = useMemo(() => {
    return stores.reduce((acc, s) => acc + (s._count?.products || 0), 0);
  }, [stores]);

  // Filtro inteligente por segmento e busca
  const filteredStores = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return stores.filter((store) => {
      const seg = store.segment?.trim() || 'Geral';
      const matchSegment = selectedSegment === 'all' || seg === selectedSegment;

      if (!matchSegment) return false;
      if (!q) return true;

      const nameMatch = store.name.toLowerCase().includes(q);
      const segMatch = seg.toLowerCase().includes(q);
      const descMatch = store.description ? store.description.toLowerCase().includes(q) : false;
      const addrMatch = store.address ? store.address.toLowerCase().includes(q) : false;

      return nameMatch || segMatch || descMatch || addrMatch;
    });
  }, [stores, selectedSegment, searchQuery]);

  return (
    <div className="marketplace-portal" role="region" aria-label="Portal de Lojas Comunitárias">
      {/* Hero do Marketplace Comunitário */}
      <section className="community-hero">
        <div className="community-hero-badge">
          <Sparkles size={14} aria-hidden="true" />
          <span>Marketplace Comunitário do Bairro</span>
        </div>

        <h1 className="community-hero-title">
          Compre de Quem Faz <br />
          <span className="community-hero-gradient">no Seu Bairro</span>
        </h1>

        <p className="community-hero-subtitle">
          Encontre produtos artesanais, moda autoral, cafés e delícias caseiras de empreendedores
          locais cadastrados e administrados 100% pelo WhatsApp.
        </p>

        {/* Métricas Rápidas do Marketplace */}
        <div className="community-metrics-bar" aria-label="Estatísticas da comunidade">
          <div className="community-metric-item">
            <span className="metric-val">{stores.length}</span>
            <span className="metric-lbl">Lojas Ativas</span>
          </div>
          <div className="community-metric-divider" aria-hidden="true" />
          <div className="community-metric-item">
            <span className="metric-val">{totalProducts}</span>
            <span className="metric-lbl">Produtos Disponíveis</span>
          </div>
          <div className="community-metric-divider" aria-hidden="true" />
          <div className="community-metric-item">
            <span className="metric-val">{segmentsWithCount.length}</span>
            <span className="metric-lbl">Segmentos</span>
          </div>
        </div>

        {/* Barra de Busca Global */}
        <div className="portal-search-wrapper">
          <Search size={18} className="portal-search-icon" aria-hidden="true" />
          <input
            type="search"
            className="portal-search-input"
            placeholder="Buscar loja por nome, segmento (ex: Confeitaria, Moda) ou endereço..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar lojas no marketplace comunitário"
          />
          {searchQuery && (
            <button
              type="button"
              className="portal-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Limpar pesquisa"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </section>

      {/* Barra de Filtros por Segmento */}
      <div className="portal-controls-bar">
        <div className="portal-controls-header">
          <div className="portal-filter-title">
            <Filter size={16} aria-hidden="true" />
            <span>Filtrar por Categoria:</span>
          </div>
          <span className="portal-results-count">
            Mostrando <strong>{filteredStores.length}</strong> {filteredStores.length === 1 ? 'loja' : 'lojas'}
          </span>
        </div>

        <nav className="segment-pills-bar" aria-label="Categorias de lojas do marketplace">
          <button
            type="button"
            className={`segment-pill ${selectedSegment === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedSegment('all')}
            aria-pressed={selectedSegment === 'all'}
          >
            <span>Todas as Lojas</span>
            <span className="pill-badge">{stores.length}</span>
          </button>

          {segmentsWithCount.map(({ segment, count }) => (
            <button
              key={segment}
              type="button"
              className={`segment-pill ${selectedSegment === segment ? 'active' : ''}`}
              onClick={() => setSelectedSegment(segment)}
              aria-pressed={selectedSegment === segment}
            >
              <span>{segment}</span>
              <span className="pill-badge">{count}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Grid de Cards de Lojas */}
      <section className="stores-grid-section" aria-label="Vitrine de Lojas Locais">
        {isLoading && stores.length === 0 ? (
          <div className="stores-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="store-card-skeleton" aria-hidden="true">
                <div className="skeleton-avatar" />
                <div className="skeleton-line title" />
                <div className="skeleton-line desc" />
                <div className="skeleton-line meta" />
              </div>
            ))}
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="portal-empty-state" role="status">
            <div className="empty-icon-box">
              <StoreIcon size={36} aria-hidden="true" />
            </div>
            <h3>Nenhuma loja encontrada</h3>
            <p>
              Não encontramos nenhuma loja correspondente a <strong>"{searchQuery || selectedSegment}"</strong>.
            </p>
            {searchQuery && (
              <button
                type="button"
                className="btn-outline-clear"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSegment('all');
                }}
              >
                Limpar filtros e ver todas
              </button>
            )}
            {onOpenNewStoreDemo && (
              <div className="empty-action-wrapper">
                <span>Quer colocar sua loja aqui?</span>
                <button type="button" className="btn-primary-demo" onClick={onOpenNewStoreDemo}>
                  Cadastrar Loja pelo WhatsApp
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="stores-grid">
            {filteredStores.map((store) => {
              const productCount = store._count?.products || 0;
              return (
                <article
                  key={store.id}
                  className="store-card"
                  onClick={() => onSelectStore(store.slug)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ver vitrine da loja ${store.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectStore(store.slug);
                    }
                  }}
                >
                  <div className="store-card-top">
                    {store.logoUrl ? (
                      <img
                        src={store.logoUrl}
                        alt={`Logo ${store.name}`}
                        className="store-card-logo"
                        loading="lazy"
                      />
                    ) : (
                      <div className="store-card-avatar-fallback">
                        {store.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="store-card-header-info">
                      <div className="store-card-name-wrapper">
                        <h2 className="store-card-name">{store.name}</h2>
                        <span title="Loja Verificada" style={{ display: 'inline-flex' }}>
                          <CheckCircle2 size={16} className="store-verified-icon" aria-hidden="true" />
                        </span>
                      </div>
                      <span className="store-card-segment">{store.segment || 'Comércio Local'}</span>
                    </div>
                  </div>

                  <p className="store-card-description">
                    {store.description || 'Conheça o catálogo completo com produtos exclusivos.'}
                  </p>

                  <div className="store-card-meta-list">
                    {store.address && (
                      <div className="store-meta-row" title={store.address}>
                        <MapPin size={14} className="meta-icon" aria-hidden="true" />
                        <span className="meta-text">{store.address}</span>
                      </div>
                    )}

                    {store.businessHours && (
                      <div className="store-meta-row" title={store.businessHours}>
                        <Clock size={14} className="meta-icon" aria-hidden="true" />
                        <span className="meta-text">{store.businessHours}</span>
                      </div>
                    )}

                    {store.paymentMethods && (
                      <div className="store-meta-row" title={`Pagamentos: ${store.paymentMethods}`}>
                        <CreditCard size={14} className="meta-icon" aria-hidden="true" />
                        <span className="meta-text">{store.paymentMethods}</span>
                      </div>
                    )}
                  </div>

                  <div className="store-card-footer">
                    <div className="store-products-badge">
                      <Package size={14} aria-hidden="true" />
                      <span>
                        <strong>{productCount}</strong> {productCount === 1 ? 'produto' : 'produtos'}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="store-explore-btn"
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      <span>Ver Catálogo</span>
                      <ArrowRight size={16} className="arrow-icon" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
