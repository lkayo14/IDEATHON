import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega .env do backend ou da raiz do projeto
dotenv.config({ path: path.resolve(__dirname, '../../../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  
  // Gemini AI (SDK oficial @google/genai)
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
  
  // WhatsApp Cloud API Oficial (Meta)
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN || '',
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || 'ideathon_verify_token_123',
  
  // Z-API (WhatsApp via QR Code / Instância)
  ZAPI_INSTANCE_ID: process.env.ZAPI_INSTANCE_ID || '',
  ZAPI_INSTANCE_TOKEN: process.env.ZAPI_INSTANCE_TOKEN || '',
  ZAPI_CLIENT_TOKEN: process.env.ZAPI_CLIENT_TOKEN || '',

  // URLs e Armazenamento
  BASE_URL: process.env.BASE_URL || 'http://localhost:3001',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  UPLOAD_DIR: path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),

  // Diagnóstico de status de credenciais
  get isGeminiConfigured(): boolean {
    return Boolean(this.GEMINI_API_KEY && this.GEMINI_API_KEY.trim() !== '');
  },

  get isMetaWhatsAppConfigured(): boolean {
    return Boolean(
      this.WHATSAPP_TOKEN &&
      this.WHATSAPP_TOKEN.trim() !== '' &&
      this.WHATSAPP_PHONE_NUMBER_ID &&
      this.WHATSAPP_PHONE_NUMBER_ID.trim() !== ''
    );
  },

  get isZApiConfigured(): boolean {
    return Boolean(
      this.ZAPI_INSTANCE_ID &&
      this.ZAPI_INSTANCE_ID.trim() !== '' &&
      this.ZAPI_INSTANCE_TOKEN &&
      this.ZAPI_INSTANCE_TOKEN.trim() !== ''
    );
  },

  get isWhatsAppConfigured(): boolean {
    return this.isMetaWhatsAppConfigured || this.isZApiConfigured;
  },

  get whatsAppProvider(): 'ZAPI' | 'META_CLOUD' | 'SIMULATOR' {
    if (this.isZApiConfigured) return 'ZAPI';
    if (this.isMetaWhatsAppConfigured) return 'META_CLOUD';
    return 'SIMULATOR';
  }
};
