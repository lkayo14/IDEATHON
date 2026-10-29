import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
const provider = isPostgres ? 'postgresql' : 'sqlite';

const templatePath = path.join(rootDir, 'backend', 'prisma', 'schema.template.prisma');
const schemaPath = path.join(rootDir, 'backend', 'prisma', 'schema.prisma');

if (fs.existsSync(templatePath)) {
  let content = fs.readFileSync(templatePath, 'utf-8');
  content = content.replace(/PROVIDER_PLACEHOLDER/g, provider);
  fs.writeFileSync(schemaPath, content, 'utf-8');
  console.log(`[prepare-prisma] Generated backend/prisma/schema.prisma using provider: ${provider}`);
} else {
  console.log('[prepare-prisma] schema.template.prisma not found.');
}
