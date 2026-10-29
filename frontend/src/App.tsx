import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Smartphone,
  Store as StoreIcon,
  Columns,
  MessageCircle,
  Monitor,
} from 'lucide-react';
import { WhatsAppSimulator } from './components/WhatsAppSimulator.js';
import { Storefront } from './components/Storefront.js';
import { MarketplacePortal } from './components/MarketplacePortal.js';
import { SystemStatusBanner } from './components/SystemStatusBanner.js';
import { CommunityStore, VendorPreset } from './types/marketplace.js';

const INITIAL_PRESETS: VendorPreset[] = [
  {
    id: '1',
    name: 'Ana Silva',
    phone: '5585999998888',
    storeName: 'Moda da Ana',
    storeSlug: 'moda-da-ana',
    segment: 'Moda',
  },
  {
    id: '2',
    name: 'Dona Francisca',
    phone: '5585988887777',
    storeName: 'Doces da Vovó',
    storeSlug: 'doces-da-vovo',
    segment: 'Doces',
  },
  {
    id: '3',
    name: 'Carlos Eduardo',
    phone: '5585977776666',
    storeName: 'Empório do Bairro',
    storeSlug: 'emporio-do-bairro',
    segment: 'Empório',
  },
  {
    id: '4',
    name: 'Severino Gomes',
    phone: '5585966665555',
    storeName: 'Raízes da Comunidade',
    storeSlug: 'raizes-da-comunidade',
    segment: 'Artesanato',
  },
  {
    id: '5',
    name: 'Raimundo Nonato',
    phone: '5585955554444',
    storeName: 'Sabor da Aerolândia',
    storeSlug: 'sabor-da-aerolandia',
    segment: 'Gastronomia',
  },
  {
    id: '6',
    name: 'Maria das Graças',
    phone: '5585944443333',
    storeName: 'Artes do Pecém',
    storeSlug: 'artes-do-pecem',
    segment: 'Renda & Praia',
  },
];

export const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const [activeTab, setActiveTab] = useState<'split' | 'simulator' | 'storefront'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'simulator';
    }
    return 'split';
  });

  const [desktopDeviceMode, setDesktopDeviceMode] = useState<'phone' | 'full'>('phone');
  const [vendorPhone, setVendorPhone] = useState('5585999998888');
  const [selectedStoreSlug, setSelectedStoreSlug] = useState<string | null>(null);
  const [stores, setStores] = useState<CommunityStore[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [vendorPresets, setVendorPresets] = useState<VendorPreset[]>(INITIAL_PRESETS);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);

  // Monitora redimensionamento de janela
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && activeTab === 'split') {
        setActiveTab('simulator');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  // Carrega todas as lojas do marketplace comunitário de forma suave
  const fetchStores = async (silent = false) => {
    if (!silent && stores.length === 0) {
      setIsLoadingStores(true);
    }
    try {
      const res = await fetch('/api/stores');
      if (res.ok) {
        const data: CommunityStore[] = await res.json();
        
        // Atualiza estado somente se houver mudança real para evitar re-renderizações e flicker
        setStores((prev) => {
          if (prev.length === data.length) {
            const hasChanged = data.some((item, idx) => {
              const p = prev[idx];
              return (
                !p ||
                p.id !== item.id ||
                p.name !== item.name ||
                p._count?.products !== item._count?.products ||
                p.segment !== item.segment
              );
            });
            if (!hasChanged) return prev;
          }
          return data;
        });

        // Atualiza presets com lojas recém-criadas sem perder referências desnecessariamente
        setVendorPresets((prev) => {
          let modified = false;
          const map = new Map(prev.map((p) => [p.phone, p]));
          data.forEach((store) => {
            const phone = store.whatsapp || store.phone;
            if (phone && !map.has(phone)) {
              modified = true;
              map.set(phone, {
                id: store.id,
                name: store.name,
                phone: phone.replace(/\D/g, ''),
                storeName: store.name,
                storeSlug: store.slug,
                segment: store.segment || 'Geral',
              });
            }
          });
          return modified ? Array.from(map.values()) : prev;
        });
      }
    } catch (err) {
      console.warn('Erro ao carregar lojas do marketplace:', err);
    } finally {
      setIsLoadingStores(false);
    }
  };

  // Carga inicial
  useEffect(() => {
    fetchStores(false);
  }, []);

  // Polling em segundo plano silencioso para sincronização ao vivo multi-dispositivo sem flicker
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStores(true);
      setRefreshTrigger((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCatalogUpdate = () => {
    fetchStores(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSelectVendorPhone = (phone: string, storeSlug?: string) => {
    setVendorPhone(phone);
    if (storeSlug) {
      setSelectedStoreSlug(storeSlug);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Deseja reiniciar a conversa e o rascunho do empreendedor atual?')) return;
    try {
      await fetch(`/api/simulator/reset?phone=${encodeURIComponent(vendorPhone)}`, {
        method: 'POST',
      });
      setResetSignal((prev) => prev + 1);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error('Erro ao reiniciar conversa:', err);
    }
  };

  // Nome da loja associada ao telefone atual
  const activePreset = vendorPresets.find((p) => p.phone === vendorPhone);
  const activeStoreName = activePreset?.storeName;

  // Se o usuário estiver no celular e na aba do WhatsApp, ocultamos o cabeçalho e banner de status
  // para que o WhatsApp tenha 100% da proporção real e nativa de tela cheia.
  const isMobileWhatsAppFullscreen = isMobile && activeTab === 'simulator';

  return (
    <div className={`app-container ${isMobileWhatsAppFullscreen ? 'fullscreen-wa-mode' : ''}`}>
      {/* Top Navbar (Oculto no celular se estiver dentro do WhatsApp) */}
      {!isMobileWhatsAppFullscreen && (
        <header className="top-navbar" role="banner">
          <div
            className="brand-wrapper"
            onClick={() => setSelectedStoreSlug(null)}
            style={{ cursor: 'pointer' }}
            title="Voltar à página inicial do marketplace"
          >
            <div className="brand-icon" aria-hidden="true">
              <ShoppingCart size={20} />
            </div>
            <div className="brand-title">
              <span className="brand-zap-text">ZAP</span>
              <span className="brand-marketplace-text">MARKETPLACE</span>
              <span className="brand-ai-badge">AI</span>
            </div>
          </div>

          <div className="navbar-actions-group">
            {/* View Switcher Tabs */}
            <nav className="view-tabs" role="tablist" aria-label="Modo de visualização da área de trabalho">
              {!isMobile && (
                <button
                  role="tab"
                  aria-selected={activeTab === 'split'}
                  className={`tab-btn ${activeTab === 'split' ? 'active' : ''}`}
                  onClick={() => setActiveTab('split')}
                  title="Ver simulador e marketplace lado a lado"
                >
                  <Columns size={15} aria-hidden="true" />
                  <span>Dividida</span>
                </button>
              )}
              <button
                role="tab"
                aria-selected={activeTab === 'simulator'}
                className={`tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
                onClick={() => setActiveTab('simulator')}
                title="Apenas simulador de WhatsApp"
              >
                <Smartphone size={15} aria-hidden="true" />
                <span>WhatsApp</span>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'storefront'}
                className={`tab-btn ${activeTab === 'storefront' ? 'active' : ''}`}
                onClick={() => setActiveTab('storefront')}
                title="Apenas marketplace comunitário e vitrine"
              >
                <StoreIcon size={15} aria-hidden="true" />
                <span>Marketplace</span>
              </button>
            </nav>

            <button
              type="button"
              className="navbar-cta-announce-btn"
              onClick={() => {
                const newPhone = `55859${Math.floor(1000000 + Math.random() * 9000000)}`;
                handleSelectVendorPhone(newPhone);
                if (isMobile) {
                  setActiveTab('simulator');
                }
              }}
              title="Criar anúncio ou cadastrar loja pelo WhatsApp"
            >
              <MessageCircle size={16} />
              <span>Anunciar no WhatsApp</span>
            </button>
          </div>
        </header>
      )}

      {/* System Status Indicators Bar (Oculto no celular se estiver dentro do WhatsApp) */}
      {!isMobileWhatsAppFullscreen && (
        <SystemStatusBanner onResetDemo={handleResetDemo} />
      )}

      {/* Main Content Workspace */}
      <main
        className={`workspace-grid ${isMobileWhatsAppFullscreen ? 'mobile-wa-viewport' : ''}`}
        style={{
          gridTemplateColumns:
            !isMobile && activeTab === 'split'
              ? '460px 1fr'
              : '1fr',
        }}
      >
        {/* Painel do WhatsApp Simulator */}
        {(activeTab === 'split' || activeTab === 'simulator') && (
          <div
            className={`simulator-workspace-cell ${
              !isMobile && activeTab === 'simulator'
                ? desktopDeviceMode === 'phone'
                  ? 'desktop-phone-frame-container'
                  : 'desktop-full-wa-container'
                : ''
            }`}
          >
            {/* Se estiver no desktop em aba exclusiva do WhatsApp, oferecer switcher de proporção de tela */}
            {!isMobile && activeTab === 'simulator' && (
              <div className="desktop-device-mode-bar">
                <span className="mode-bar-label">Proporção da Visualização:</span>
                <div className="mode-btn-group">
                  <button
                    type="button"
                    className={`mode-btn ${desktopDeviceMode === 'phone' ? 'active' : ''}`}
                    onClick={() => setDesktopDeviceMode('phone')}
                    title="Visualizar em moldura de smartphone 100% proporcional"
                  >
                    <Smartphone size={14} />
                    <span>Celular (Nativo)</span>
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${desktopDeviceMode === 'full' ? 'active' : ''}`}
                    onClick={() => setDesktopDeviceMode('full')}
                    title="Expandir para largura total"
                  >
                    <Monitor size={14} />
                    <span>Tela Cheia</span>
                  </button>
                </div>
              </div>
            )}

            {/* Container do WhatsApp */}
            <div
              className={`simulator-frame-shell ${
                !isMobile && activeTab === 'simulator' && desktopDeviceMode === 'phone'
                  ? 'phone-mockup-shell'
                  : 'fluid-shell'
              }`}
            >
              <WhatsAppSimulator
                vendorPhone={vendorPhone}
                onCatalogUpdate={handleCatalogUpdate}
                resetSignal={resetSignal}
                onSelectVendorPhone={handleSelectVendorPhone}
                vendorPresets={vendorPresets}
                activeStoreName={activeStoreName}
                onBackToMarketplace={
                  isMobile || activeTab === 'simulator'
                    ? () => setActiveTab('storefront')
                    : undefined
                }
                isMobileView={isMobile}
              />
            </div>
          </div>
        )}

        {/* Painel do Marketplace Comunitário (Portal Geral ou Perfil da Loja) */}
        {(activeTab === 'split' || activeTab === 'storefront') && (
          <div className="marketplace-workspace" style={{ height: '100%', overflowY: 'auto' }}>
            {selectedStoreSlug ? (
              <Storefront
                storeSlug={selectedStoreSlug}
                refreshTrigger={refreshTrigger}
                onBackToMarketplace={() => setSelectedStoreSlug(null)}
              />
            ) : (
              <MarketplacePortal
                stores={stores}
                isLoading={isLoadingStores}
                onSelectStore={(slug) => setSelectedStoreSlug(slug)}
                onOpenNewStoreDemo={() => {
                  const newPhone = `55859${Math.floor(1000000 + Math.random() * 9000000)}`;
                  handleSelectVendorPhone(newPhone);
                  if (isMobile) {
                    setActiveTab('simulator');
                  }
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button do WhatsApp para celular (Quando estiver na aba da loja/marketplace) */}
      {isMobile && activeTab === 'storefront' && (
        <button
          type="button"
          className="wa-floating-fab"
          onClick={() => setActiveTab('simulator')}
          title="Abrir WhatsApp AI"
          aria-label="Abrir WhatsApp AI"
        >
          <MessageCircle size={28} />
          <span className="wa-fab-pulse" />
        </button>
      )}
    </div>
  );
};

export default App;
