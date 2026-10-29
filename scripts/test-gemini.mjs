import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('Chave encontrada no backend/.env:', apiKey ? `${apiKey.slice(0, 10)}... (Tamanho: ${apiKey.length})` : 'NÃO ENCONTRADA');

const ai = new GoogleGenAI({ apiKey });

async function run() {
  try {
    const testList = ['gemini-flash-lite-latest', 'gemini-pro-latest', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
    for (const chosen of testList) {
      try {
        console.log(`\nTestando geração com ${chosen}...`);
        const res = await ai.models.generateContent({
          model: chosen,
          contents: 'Olá! Diga apenas: IA Gemini conectada com sucesso!',
        });
        console.log(`🎉 SUCESSO com ${chosen}:`, res.text?.trim() || res.candidates?.[0]?.content?.parts?.[0]?.text);
        return;
      } catch (err) {
        console.log(`Falhou com ${chosen}:`, err.message || err);
      }
    }
  } catch (err) {
    console.error('Erro geral:', err);
  }
}

run();
