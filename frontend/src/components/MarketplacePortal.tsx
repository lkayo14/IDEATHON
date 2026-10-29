import React, { useState, useEffect, useMemo } from 'react';
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
  ShoppingBag,
  Coffee,
  Cake,
  Palette,
  Truck,
  MessageCircle,
  ShieldCheck,
  Zap,
  TrendingUp,
  Tag,
  ChevronRight,
} from 'lucide-react';
import { CommunityStore, FeaturedProduct } from '../types/marketplace.js';

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
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(false);

  // Carrega feed de produtos recentes em destaque de todas as lojas (estilo OLX)
  useEffect(() => {
    const fetchFeatured = async () => {
      setIsLoadingFeatured(true);
      try {
        const res = await fetch('/api/products/featured');
        if (res.ok) {
          const data = await res.json();
          setFeaturedProducts(data);
        }
      } catch (err) {
        console.warn('Erro ao buscar produtos recentes:', err);
      } finally {
        setIsLoadingFeatured(false);
      }
    };
    fetchFeatured();
  }, []);

  // Regiões / Comunidades disponíveis com contagem
  const regionsWithCount = useMemo(() => {
    const map = new Map<string, number>();
    stores.forEach((store) => {
      const reg =
        store.region?.trim() ||
        (store.address ? store.address.split('-')[1]?.split(',')[0]?.trim() : '') ||
        'Região Central';
      map.set(reg, (map.get(reg) || 0) + 1);
    });
    return Array.from(map.entries()).map(([region, count]) => ({
      region,
      count,
    }));
  }, [stores]);

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

  // Categorias fixas com ícones no estilo OLX
  const categoryShortcuts = [
    { id: 'all', label: 'Todas as Lojas', icon: StoreIcon, count: stores.length },
    { id: 'Moda & Vestuário', label: 'Moda & Roupas', icon: ShoppingBag },
    { id: 'Confeitaria & Doces', label: 'Doces & Bolos', icon: Cake },
    { id: 'Cafés & Empório', label: 'Cafés & Empório', icon: Coffee },
    { id: 'Artesanato & Decoração', label: 'Artesanato', icon: Palette },
  ];

  // Filtro inteligente por segmento, localidade/região e busca
  const filteredStores = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return stores.filter((store) => {
      const seg = store.segment?.trim() || 'Geral';
      const storeRegion =
        store.region?.trim() ||
        (store.address ? store.address.split('-')[1]?.split(',')[0]?.trim() : '') ||
        'Região Central';

      const matchSegment = selectedSegment === 'all' || seg === selectedSegment;
      const matchRegion =
        selectedRegion === 'all' ||
        storeRegion.toLowerCase() === selectedRegion.toLowerCase() ||
        (store.address && store.address.toLowerCase().includes(selectedRegion.toLowerCase()));

      if (!matchSegment || !matchRegion) return false;
      if (!q) return true;

      const nameMatch = store.name.toLowerCase().includes(q);
      const segMatch = seg.toLowerCase().includes(q);
      const regionMatch = (store.region || '').toLowerCase().includes(q);
      const descMatch = store.description ? store.description.toLowerCase().includes(q) : false;
      const addrMatch = store.address ? store.address.toLowerCase().includes(q) : false;

      return nameMatch || segMatch || regionMatch || descMatch || addrMatch;
    });
  }, [stores, selectedSegment, selectedRegion, searchQuery]);

  // Filtra produtos recentes de acordo com a região selecionada ou busca
  const filteredFeaturedProducts = useMemo(() => {
    return featuredProducts.filter((p) => {
      if (selectedRegion !== 'all') {
        const pRegion = p.store?.region || '';
        if (pRegion.toLowerCase() !== selectedRegion.toLowerCase()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = p.name.toLowerCase().includes(q);
        const storeMatch = p.store?.name.toLowerCase().includes(q);
        return nameMatch || storeMatch;
      }
      return true;
    });
  }, [featuredProducts, selectedRegion, searchQuery]);

  const hasActiveFilters =
    selectedSegment !== 'all' || selectedRegion !== 'all' || searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setSelectedSegment('all');
    setSelectedRegion('all');
    setSearchQuery('');
  };

  return (
    <div className="olx-marketplace" role="region" aria-label="Marketplace Comunitário">
      {/* 1. HERO SECTION & BUSCADOR ESTILO OLX */}
      <section className="olx-search-hero">
        <div className="olx-hero-container">
          <div className="olx-hero-badge">
            <Sparkles size={14} className="badge-icon-yellow" aria-hidden="true" />
            <span>Marketplace Comunitário • 100% WhatsApp AI</span>
          </div>

          <h1 className="olx-hero-title">
            O que você quer <span className="highlight-yellow">comprar ou pedir</span> hoje?
          </h1>

          <p className="olx-hero-subtitle">
            Encontre produtos de pequenos produtores, comércios e artesãos locais administrados em
            tempo real pelo WhatsApp.
          </p>

          {/* BARRA DE PESQUISA INTEGRADA (OLX STYLE) */}
          <div className="olx-search-bar" role="search">
            <div className="search-field text-field">
              <Search size={20} className="field-icon search-icon" aria-hidden="true" />
              <input
                type="search"
                className="search-input"
                placeholder="Buscar por produto, loja, bairro (Messejana, Benfica, Pecém)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Buscar produtos ou lojas no marketplace"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-input-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar pesquisa"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="search-divider" aria-hidden="true" />

            <div className="search-field region-select-field">
              <MapPin size={18} className="field-icon pin-icon" aria-hidden="true" />
              <select
                className="region-select"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                aria-label="Filtrar por região ou comunidade"
              >
                <option value="all">Todas as Regiões</option>
                {regionsWithCount.map(({ region, count }) => (
                  <option key={region} value={region}>
                    {region} ({count})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="olx-btn-search"
              onClick={() => {}}
              aria-label="Executar busca"
            >
              <Search size={18} />
              <span>Buscar</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="olx-quick-stats">
            <div className="stat-pill">
              <StoreIcon size={14} className="stat-icon-yellow" />
              <span>
                <strong>{stores.length}</strong> Lojas Ativas
              </span>
            </div>
            <div className="stat-pill">
              <MapPin size={14} className="stat-icon-yellow" />
              <span>
                <strong>{regionsWithCount.length}</strong> Comunidades
              </span>
            </div>
            <div className="stat-pill">
              <Package size={14} className="stat-icon-yellow" />
              <span>
                <strong>{totalProducts}</strong> Produtos Locais
              </span>
            </div>
            <div className="stat-pill">
              <Zap size={14} className="stat-icon-yellow" />
              <span>
                <strong>Zero</strong> Taxas Abusivas
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORIAS CIRCULARES EM DESTAQUE (ESTILO OLX) */}
      <section className="olx-categories-section" aria-label="Categorias em Destaque">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Categorias Populares</h2>
            <p className="section-subtitle">Navegue pelas principais especialidades dos comércios locais</p>
          </div>
        </div>

        <div className="olx-categories-grid">
          {categoryShortcuts.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedSegment === cat.id;
            const actualCount =
              cat.id === 'all'
                ? stores.length
                : segmentsWithCount.find((s) => s.segment === cat.id)?.count || 0;

            return (
              <button
                key={cat.id}
                type="button"
                className={`olx-category-circle-btn ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedSegment(cat.id)}
                aria-pressed={isSelected}
              >
                <div className="category-circle-icon">
                  <Icon size={24} />
                </div>
                <span className="category-circle-label">{cat.label}</span>
                <span className="category-circle-count">
                  {actualCount} {actualCount === 1 ? 'loja' : 'lojas'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. FILTRO DE LOCALIDADE / COMUNIDADE (BARRA DE CHIPS) */}
      <section className="olx-region-filter-section" aria-label="Filtro por Localidade">
        <div className="region-filter-container">
          <div className="region-filter-header">
            <div className="region-filter-title">
              <MapPin size={16} className="title-pin-icon" aria-hidden="true" />
              <span>Filtrar por Região / Comunidade:</span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                className="olx-clear-filters-link"
                onClick={clearAllFilters}
                aria-label="Limpar todos os filtros ativos"
              >
                <X size={14} />
                <span>Limpar filtros</span>
              </button>
            )}
          </div>

          <div className="region-chips-scroll" role="toolbar" aria-label="Chips de Regiões">
            <button
              type="button"
              className={`region-chip ${selectedRegion === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedRegion('all')}
              aria-pressed={selectedRegion === 'all'}
            >
              <span>Todas as Regiões</span>
              <span className="chip-badge">{stores.length}</span>
            </button>

            {regionsWithCount.map(({ region, count }) => (
              <button
                key={region}
                type="button"
                className={`region-chip ${selectedRegion === region ? 'active' : ''}`}
                onClick={() => setSelectedRegion(region)}
                aria-pressed={selectedRegion === region}
              >
                <MapPin size={12} className="chip-pin" aria-hidden="true" />
                <span>{region}</span>
                <span className="chip-badge">{count}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. BANNER PROMOCIONAL "ANUNCIE NO WHATSAPP" (ESTILO OLX DESAPEGA) */}
      {onOpenNewStoreDemo && (
        <section className="olx-cta-banner" aria-label="Criar loja pelo WhatsApp">
          <div className="cta-banner-content">
            <div className="cta-tag-yellow">
              <Zap size={14} />
              <span>100% Grátis para Pequenos Empreendedores</span>
            </div>
            <h3 className="cta-banner-title">
              Venda seus produtos pelo WhatsApp em 2 minutos!
            </h3>
            <p className="cta-banner-desc">
              Sem mensalidades nem taxas sobre suas vendas. Tire uma foto do produto, diga o valor e
              a inteligência artificial cuida de publicar e manter seu estoque na vitrine do bairro.
            </p>
          </div>
          <button
            type="button"
            className="cta-banner-button"
            onClick={onOpenNewStoreDemo}
            aria-label="Começar a vender pelo WhatsApp agora"
          >
            <MessageCircle size={18} />
            <span>Criar Minha Loja no WhatsApp</span>
          </button>
        </section>
      )}

      {/* 5. SEÇÃO PRINCIPAL: VITRINE DE LOJAS E EMPREENDEDORES LOCAIS */}
      <section className="olx-stores-section" aria-label="Lojas e Empreendedores do Bairro">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Lojas & Empreendedores Locais</h2>
            <p className="section-subtitle">
              Mostrando <strong>{filteredStores.length}</strong>{' '}
              {filteredStores.length === 1 ? 'estabelecimento ativo' : 'estabelecimentos ativos'}
              {selectedRegion !== 'all' && ` em ${selectedRegion}`}
              {selectedSegment !== 'all' && ` no segmento ${selectedSegment}`}
            </p>
          </div>
        </div>

        {isLoading && stores.length === 0 ? (
          <div className="olx-stores-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="olx-store-skeleton" aria-hidden="true">
                <div className="skeleton-cover" />
                <div className="skeleton-body">
                  <div className="skeleton-line-title" />
                  <div className="skeleton-line-desc" />
                  <div className="skeleton-line-meta" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="olx-empty-state" role="status">
            <div className="empty-state-icon-box">
              <StoreIcon size={40} />
            </div>
            <h3 className="empty-state-title">Nenhuma loja encontrada</h3>
            <p className="empty-state-text">
              Não encontramos nenhuma loja disponível com os filtros atuais
              {selectedRegion !== 'all' && ` na região "${selectedRegion}"`}
              {selectedSegment !== 'all' && ` na categoria "${selectedSegment}"`}
              {searchQuery && ` para a busca "${searchQuery}"`}.
            </p>
            <button type="button" className="olx-btn-clear-state" onClick={clearAllFilters}>
              Limpar filtros e ver todas as lojas
            </button>
          </div>
        ) : (
          <div className="olx-stores-grid">
            {filteredStores.map((store) => {
              const productCount = store._count?.products || 0;
              const storeRegion =
                store.region?.trim() ||
                (store.address ? store.address.split('-')[1]?.split(',')[0]?.trim() : '');

              return (
                <article
                  key={store.id}
                  className="olx-store-card"
                  onClick={() => onSelectStore(store.slug)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ver catálogo da loja ${store.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectStore(store.slug);
                    }
                  }}
                >
                  {/* Topo do Card com Imagem e Badges */}
                  <div className="store-card-header">
                    <div className="store-avatar-wrapper">
                      {store.logoUrl ? (
                        <img
                          src={store.logoUrl}
                          alt={`Logo ${store.name}`}
                          className="store-avatar-img"
                          loading="lazy"
                        />
                      ) : (
                        <div className="store-avatar-fallback">
                          {store.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="store-info-headline">
                      <div className="store-name-row">
                        <h3 className="store-title">{store.name}</h3>
                        <span title="Empreendedor Verificado" className="verified-badge">
                          <CheckCircle2 size={16} />
                        </span>
                      </div>

                      {/* Tags no estilo OLX: Categoria + Localidade */}
                      <div className="store-tags-row">
                        <span className="tag-segment">{store.segment || 'Geral'}</span>
                        {storeRegion && (
                          <span className="tag-region" title={`Localidade: ${storeRegion}`}>
                            <MapPin size={11} aria-hidden="true" />
                            <span>{storeRegion}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Descrição */}
                  <p className="store-desc-snippet">
                    {store.description || 'Produtos exclusivos com pronta entrega e atendimento pelo WhatsApp.'}
                  </p>

                  {/* Informações Práticas Divididas */}
                  <div className="store-details-box">
                    {store.address && (
                      <div className="detail-item" title={store.address}>
                        <MapPin size={13} className="detail-icon" aria-hidden="true" />
                        <span className="detail-text">{store.address}</span>
                      </div>
                    )}
                    {store.businessHours && (
                      <div className="detail-item" title={store.businessHours}>
                        <Clock size={13} className="detail-icon" aria-hidden="true" />
                        <span className="detail-text">{store.businessHours}</span>
                      </div>
                    )}
                    {store.paymentMethods && (
                      <div className="detail-item" title={`Pagamentos: ${store.paymentMethods}`}>
                        <CreditCard size={13} className="detail-icon" aria-hidden="true" />
                        <span className="detail-text">{store.paymentMethods}</span>
                      </div>
                    )}
                  </div>

                  {/* Rodapé com Total de Itens e Botão Amarelo */}
                  <div className="store-card-footer">
                    <div className="store-stock-count">
                      <Package size={14} className="count-icon" aria-hidden="true" />
                      <span>
                        <strong>{productCount}</strong> {productCount === 1 ? 'produto' : 'produtos'}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="olx-store-action-btn"
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      <span>Acessar Vitrine</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. VITRINE DE PRODUTOS / ANÚNCIOS RECENTES (ESTILO GRID DA OLX) */}
      {filteredFeaturedProducts.length > 0 && (
        <section className="olx-products-feed-section" aria-label="Produtos Recentes no Bairro">
          <div className="section-header-row">
            <div>
              <div className="section-eyebrow">
                <Tag size={14} className="eyebrow-icon-yellow" />
                <span>Achados no seu Bairro</span>
              </div>
              <h2 className="section-title">Anúncios em Destaque</h2>
              <p className="section-subtitle">
                Compre direto do artesão ou comércio com envio rápido pelo WhatsApp
              </p>
            </div>
          </div>

          <div className="olx-products-grid">
            {filteredFeaturedProducts.slice(0, 8).map((product) => {
              const fallbackImage =
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
              const imageSrc = product.mainImage || fallbackImage;

              return (
                <article
                  key={product.id}
                  className="olx-product-ad-card"
                  onClick={() => {
                    if (product.store?.slug) {
                      onSelectStore(product.store.slug);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (product.store?.slug) {
                        onSelectStore(product.store.slug);
                      }
                    }
                  }}
                  aria-label={`Ver ${product.name} na loja ${product.store?.name}`}
                >
                  <div className="product-ad-image-box">
                    <img
                      src={imageSrc}
                      alt={product.name}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = fallbackImage;
                      }}
                    />
                    <span className="ad-price-tag">
                      R$ {product.price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="product-ad-body">
                    <span className="product-ad-category">{product.category || 'Geral'}</span>
                    <h4 className="product-ad-title">{product.name}</h4>

                    <div className="product-ad-seller-info">
                      <span className="seller-name">{product.store?.name}</span>
                      {product.store?.region && (
                        <span className="seller-location">
                          <MapPin size={11} aria-hidden="true" />
                          <span>{product.store.region}</span>
                        </span>
                      )}
                    </div>

                    <div className="product-ad-footer">
                      <span className="ad-stock-info">{product.stock} un. disponíveis</span>
                      <button type="button" className="btn-quick-order" tabIndex={-1}>
                        <MessageCircle size={13} />
                        <span>Pedir</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. PILARES DE CONFIANÇA DO MARKETPLACE COMUNITÁRIO */}
      <section className="olx-trust-section" aria-label="Vantagens do Marketplace Comunitário">
        <div className="trust-grid">
          <div className="trust-card">
            <div className="trust-icon-box">
              <MessageCircle size={24} />
            </div>
            <h4 className="trust-title">Atendimento Direto no WhatsApp</h4>
            <p className="trust-desc">
              Tire dúvidas, combine horários de entrega e personalize seu pedido conversando direto com o empreendedor.
            </p>
          </div>

          <div className="trust-card">
            <div className="trust-icon-box">
              <Zap size={24} />
            </div>
            <h4 className="trust-title">Tecnologia com Inteligência Artificial</h4>
            <p className="trust-desc">
              Os estoques e valores são sincronizados na hora através de mensagens e comandos de voz naturais.
            </p>
          </div>

          <div className="trust-card">
            <div className="trust-icon-box">
              <ShieldCheck size={24} />
            </div>
            <h4 className="trust-title">Fortaleça a Economia do Bairro</h4>
            <p className="trust-desc">
              Seu dinheiro apoia empreendedores locais, gera renda na sua região e fomenta pequenos produtores.
            </p>
          </div>
        </div>
      </section>

      {/* 8. RODAPÉ INSTITUCIONAL ESTILO OLX */}
      <footer className="olx-footer" role="contentinfo">
        <div className="olx-footer-container">
          <div className="footer-col brand-col">
            <div className="footer-brand">
              <span className="brand-zap">ZAP</span>
              <span className="brand-marketplace">MARKETPLACE</span>
              <span className="brand-ai-tag">AI</span>
            </div>
            <p className="footer-slogan">
              A plataforma oficial do bairro para compras e vendas inteligentes operadas 100% pelo WhatsApp.
            </p>
            <div className="footer-region-badge">
              <MapPin size={13} />
              <span>Fortaleza & Caucaia / CE • Edição Demoday Ideathon</span>
            </div>
          </div>

          <div className="footer-col">
            <h5 className="footer-col-title">Regiões Atendidas</h5>
            <ul className="footer-links-list">
              <li>Messejana (Fortaleza)</li>
              <li>Benfica & Polo Cultural</li>
              <li>Jangurussu & Grande Messejana</li>
              <li>Conjunto Palmeiras & Economia Comunitária</li>
              <li>Aerolândia & Mercado dos Peixes</li>
              <li>Pecém (Caucaia / Litoral)</li>
            </ul>
          </div>

          <div className="footer-col">
            <h5 className="footer-col-title">Categorias</h5>
            <ul className="footer-links-list">
              <li>Moda & Vestuário Sustentável</li>
              <li>Confeitaria Artesanal & Quitutes</li>
              <li>Cafés Especiais & Empório</li>
              <li>Artesanato Popular & Decoração</li>
              <li>Queijos & Produtos Coloniais</li>
            </ul>
          </div>

          <div className="footer-col">
            <h5 className="footer-col-title">Como Funciona</h5>
            <ul className="footer-links-list">
              <li>Cadastro por Foto e Voz</li>
              <li>Simulador Integrado</li>
              <li>Catálogo Web em Tempo Real</li>
              <li>Google Gemini AI SDK</li>
              <li>Z-API & WhatsApp Cloud API</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <p>© 2026 ZapMarketplace AI — Projeto desenvolvido para o Ideathon. Todos os direitos reservados.</p>
          <div className="footer-bottom-tags">
            <span>Branca • Amarela • Preta</span>
            <span>Alta Performance</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
