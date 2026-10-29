import { buildApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './db/prisma.js';

async function main() {
  try {
    await connectDatabase();

    const app = await buildApp();

    const host = '0.0.0.0';
    await app.listen({ port: env.PORT, host });

    console.log(`\n===========================================================`);
    console.log(`🚀 ZapMarketplace AI - Servidor Online!`);
    console.log(`📡 URL Local:      ${env.BASE_URL}`);
    console.log(`🏥 Health Check:   ${env.BASE_URL}/api/health`);
    console.log(`💬 Webhook Meta:   ${env.BASE_URL}/api/whatsapp/webhook`);
    console.log(`🤖 IA Provider:    ${env.isGeminiConfigured ? `Gemini (${env.GEMINI_MODEL})` : 'Modo Demonstração (Sem Chave)'}`);
    console.log(`📱 WhatsApp:       ${env.isWhatsAppConfigured ? 'Cloud API Oficial' : 'Simulador Web Ativo'}`);
    console.log(`📁 Armazenamento:  ${env.UPLOAD_DIR}`);
    console.log(`===========================================================\n`);
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

main();
