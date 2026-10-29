import { prisma } from '../../db/prisma.js';

export interface StoreInput {
  name: string;
  description?: string;
  segment?: string;
  logoUrl?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  instagram?: string;
  businessHours?: string;
  paymentMethods?: string;
  paymentInstructions?: string;
  deliveryInfo?: string;
  status?: string;
}

export class StoreService {
  /**
   * Converte nome da loja em slug amigável único
   */
  generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'minha-loja';
    return baseSlug;
  }

  /**
   * Obtém ou cria vendedor pelo telefone de WhatsApp
   */
  async getOrCreateVendor(phone: string, name: string = 'Vendedor') {
    const cleanPhone = phone.replace(/\D/g, '');
    let vendor = await prisma.vendor.findUnique({
      where: { phone: cleanPhone },
    });

    if (!vendor) {
      vendor = await prisma.vendor.create({
        data: {
          phone: cleanPhone,
          name,
        },
      });
    }

    return vendor;
  }

  /**
   * Busca a loja do vendedor pelo telefone do WhatsApp
   */
  async getStoreByVendorPhone(phone: string) {
    const cleanPhone = phone.replace(/\D/g, '');
    const vendor = await prisma.vendor.findUnique({
      where: { phone: cleanPhone },
      include: {
        stores: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return vendor?.stores[0] || null;
  }

  /**
   * Busca loja por slug ou ID
   */
  async getStoreByIdOrSlug(idOrSlug: string) {
    return prisma.store.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        vendor: true,
        products: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Cria uma nova loja ou atualiza loja existente do vendedor
   */
  async upsertStore(vendorPhone: string, data: Partial<StoreInput>) {
    const vendor = await this.getOrCreateVendor(vendorPhone);
    const existingStore = await this.getStoreByVendorPhone(vendorPhone);

    if (existingStore) {
      let slug = existingStore.slug;
      if (data.name && data.name !== existingStore.name) {
        slug = this.generateSlug(data.name);
      }

      return prisma.store.update({
        where: { id: existingStore.id },
        data: {
          ...data,
          slug,
          updatedAt: new Date(),
        },
      });
    }

    // Criar nova loja
    const storeName = data.name || `Loja de ${vendor.name}`;
    let slug = this.generateSlug(storeName);

    // Evita colisão de slugs
    const existingSlug = await prisma.store.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return prisma.store.create({
      data: {
        vendorId: vendor.id,
        name: storeName,
        slug,
        description: data.description,
        segment: data.segment,
        logoUrl: data.logoUrl,
        phone: data.phone || vendorPhone,
        whatsapp: data.whatsapp || vendorPhone,
        email: data.email,
        address: data.address,
        instagram: data.instagram,
        businessHours: data.businessHours,
        paymentMethods: data.paymentMethods || 'Pix, Dinheiro, Cartão de Débito, Cartão de Crédito',
        paymentInstructions: data.paymentInstructions,
        deliveryInfo: data.deliveryInfo || 'Retirada no local e entrega a combinar',
        status: data.status || 'ACTIVE',
      },
    });
  }

  /**
   * Formata resumo amigável da loja para validação no WhatsApp
   */
  formatStoreSummary(store: any): string {
    return [
      `🏪 *${store.name}*`,
      store.segment ? `🏷️ Segmento: ${store.segment}` : null,
      store.description ? `📝 Sobre: ${store.description}` : null,
      store.whatsapp ? `📱 WhatsApp: ${store.whatsapp}` : null,
      store.instagram ? `📸 Instagram: ${store.instagram}` : null,
      store.businessHours ? `⏰ Horário: ${store.businessHours}` : null,
      store.address ? `📍 Endereço: ${store.address}` : null,
      `💳 Pagamentos: ${store.paymentMethods || 'Pix, Dinheiro, Cartão'}`,
      `🚚 Entrega: ${store.deliveryInfo || 'Retirada ou combinar'}`,
      store.logoUrl ? `🖼️ Logo: configurada ✅` : `🖼️ Logo: pendente (você pode me enviar uma foto!)`,
      `\n🔗 *Link público da sua loja:* /loja/${store.slug}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Lista todas as lojas cadastradas (para visão geral do marketplace)
   */
  async listAllStores() {
    return prisma.store.findMany({
      where: { status: 'ACTIVE' },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lista os segmentos únicos de lojas ativas
   */
  async listSegments() {
    const stores = await prisma.store.findMany({
      where: { status: 'ACTIVE' },
      select: { segment: true },
    });
    const unique = Array.from(new Set(stores.map((s) => s.segment).filter(Boolean)));
    return unique;
  }
}

export const storeService = new StoreService();
