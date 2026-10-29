import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

import { aiOrchestrator } from '../backend/src/modules/ai/ai.orchestrator.js';
import { prisma } from '../backend/src/db/prisma.js';

async function test() {
  console.log('--- Testando AI Orchestrator com a Chave Real do Gemini ---');
  
  const response = await aiOrchestrator.handleIncomingMessage({
    vendorPhone: '5511999998888',
    senderName: 'Ana Silva',
    messageText: 'Olá! Como você pode me ajudar a gerenciar minha loja?',
  });

  console.log('\n--- Resposta da IA ---');
  console.log('Modo de Execução:', response.mode);
  console.log('Modelo Utilizado:', response.modelUsed);
  console.log('Resposta Gerada:\n', response.reply);

  await prisma.$disconnect();
}

test().catch(console.error);
