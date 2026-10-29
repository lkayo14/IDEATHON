import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';

export class StorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = env.UPLOAD_DIR;
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fsSync.existsSync(this.uploadDir)) {
      fsSync.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Salva um Buffer ou string base64 localmente e retorna o caminho público
   */
  async saveBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType: string = 'image/jpeg'
  ): Promise<{ url: string; filename: string; localPath: string }> {
    this.ensureUploadDir();

    let ext = path.extname(originalName) || '';
    if (!ext) {
      if (mimeType.includes('png')) ext = '.png';
      else if (mimeType.includes('webp')) ext = '.webp';
      else if (mimeType.includes('gif')) ext = '.gif';
      else ext = '.jpg';
    }

    const uniqueId = crypto.randomUUID();
    const filename = `${Date.now()}_${uniqueId}${ext}`;
    const localPath = path.join(this.uploadDir, filename);

    await fs.writeFile(localPath, buffer);

    const url = `/uploads/${filename}`;
    return { url, filename, localPath };
  }

  /**
   * Salva imagem a partir de base64 data URI
   */
  async saveBase64(base64Data: string, prefix = 'image'): Promise<{ url: string; filename: string; localPath: string }> {
    let cleanBase64 = base64Data;
    let mimeType = 'image/jpeg';

    if (base64Data.startsWith('data:')) {
      const parts = base64Data.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      cleanBase64 = parts[1];
    }

    const buffer = Buffer.from(cleanBase64, 'base64');
    return this.saveBuffer(buffer, `${prefix}.jpg`, mimeType);
  }

  /**
   * Baixa mídia de uma URL remota e armazena localmente
   */
  async downloadAndSave(remoteUrl: string, headers?: Record<string, string>): Promise<{ url: string; filename: string; localPath: string }> {
    const response = await fetch(remoteUrl, { headers });
    if (!response.ok) {
      throw new Error(`Falha ao baixar imagem remota: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return this.saveBuffer(buffer, 'downloaded_media', mimeType);
  }
}

export const storageService = new StorageService();
