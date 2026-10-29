import React, { useEffect, useState } from 'react';
import { Bot, MessageSquare, Database, HardDrive, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface HealthData {
  status: string;
  integrations: {
    gemini: {
      configured: boolean;
      model: string;
      mode: string;
      notice: string;
    };
    whatsapp: {
      configured: boolean;
      mode: string;
      phoneNumberId: string | null;
      notice: string;
    };
    storage: {
      provider: string;
      status: string;
    };
  };
}

interface SystemStatusBannerProps {
  onResetDemo: () => void;
}

export const SystemStatusBanner: React.FC<SystemStatusBannerProps> = ({ onResetDemo }) => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (err) {
      console.warn('Falha ao checar status de saúde:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !health) return null;

  const { gemini, whatsapp } = health.integrations;

  return (
    <div className="system-status-bar" role="status" aria-label="Status dos serviços integrados">
      {/* Status IA Gemini */}
      <div
        className={`status-pill ${gemini.configured ? 'online' : 'demo'}`}
        title={gemini.notice}
      >
        <Bot size={13} />
        <span>
          <strong>IA:</strong> {gemini.configured ? `Gemini (${gemini.model})` : 'Modo Demonstração (Sem Chave)'}
        </span>
        {gemini.configured ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
      </div>

      {/* Status WhatsApp */}
      <div
        className={`status-pill ${whatsapp.configured ? 'online' : 'simulator'}`}
        title={whatsapp.notice}
      >
        <MessageSquare size={13} />
        <span>
          <strong>WhatsApp:</strong>{' '}
          {whatsapp.mode === 'ZAPI_GATEWAY'
            ? 'Z-API (Instância Ativa)'
            : whatsapp.configured
            ? 'Cloud API Oficial'
            : 'Simulador Web Ativo'}
        </span>
        <CheckCircle size={12} />
      </div>

      {/* Banco de Dados */}
      <div className="status-pill online">
        <Database size={13} />
        <span>
          <strong>Banco:</strong> Prisma (Pronto)
        </span>
      </div>

      {/* Armazenamento */}
      <div className="status-pill online">
        <HardDrive size={13} />
        <span>
          <strong>Mídia:</strong> Local /uploads
        </span>
      </div>

      {/* Acesso Mobile Wi-Fi para Demoday */}
      <div
        className="status-pill online"
        style={{
          background: 'rgba(56, 189, 248, 0.12)',
          borderColor: 'rgba(56, 189, 248, 0.35)',
          color: '#38bdf8',
        }}
        title="Abra este endereço no navegador do seu celular conectado ao mesmo Wi-Fi para simular em tempo real"
      >
        <span>📱 <strong>Acesso Celular (Wi-Fi):</strong> http://192.168.1.10:5173</span>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={onResetDemo}
          className="refresh-btn"
          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          title="Limpar mensagens e reiniciar conversa para uma nova demonstração"
          aria-label="Reiniciar conversa de demonstração"
        >
          <RefreshCw size={12} />
          <span>Reiniciar Demo</span>
        </button>
      </div>
    </div>
  );
};

export default SystemStatusBanner;
