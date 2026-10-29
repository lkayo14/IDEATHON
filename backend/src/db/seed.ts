import { prisma } from './prisma.js';

async function seed() {
  console.log('[Seed] Inserindo dados do Marketplace Comunitário...');

  // =========================================================================
  // LOJA 1: Moda da Ana (Moda & Vestuário)
  // =========================================================================
  const phone1 = '5511999998888';
  const vendor1 = await prisma.vendor.upsert({
    where: { phone: phone1 },
    update: {},
    create: {
      phone: phone1,
      name: 'Ana Silva',
    },
  });

  const store1 = await prisma.store.upsert({
    where: { slug: 'moda-da-ana' },
    update: {
      status: 'ACTIVE',
    },
    create: {
      vendorId: vendor1.id,
      name: 'Moda da Ana',
      slug: 'moda-da-ana',
      description: 'Peças autorais e moda sustentável com estilo, elegância e conforto para o dia a dia.',
      segment: 'Moda & Vestuário',
      phone: '(11) 99999-8888',
      whatsapp: phone1,
      email: 'contato@modadaana.com.br',
      address: 'Rua Oscar Freire, 1024 - Jardins, São Paulo/SP',
      instagram: '@modadaana_oficial',
      businessHours: 'Segunda a Sábado, das 09:00 às 19:00',
      paymentMethods: 'Pix, Cartão de Crédito, Cartão de Débito, Dinheiro',
      paymentInstructions: 'Chave Pix CNPJ: 12.345.678/0001-90. Envie o comprovante pelo WhatsApp.',
      deliveryInfo: 'Entrega rápida para toda a região ou retirada gratuita no local.',
      logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
    },
  });

  await prisma.product.deleteMany({ where: { storeId: store1.id } });

  await prisma.product.createMany({
    data: [
      {
        storeId: store1.id,
        name: 'Camiseta Algodão Básica Preta',
        description: 'Camiseta 100% algodão penteado fio 30.1, toque macio e corte moderno.',
        price: 59.90,
        stock: 20,
        category: 'Roupas',
        mainImage: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store1.id,
        name: 'Vestido Floral Primavera',
        description: 'Vestido midi em viscose com estampa floral exclusiva e decote suave.',
        price: 129.90,
        stock: 8,
        category: 'Vestidos',
        mainImage: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store1.id,
        name: 'Tênis Casual Minimalista',
        description: 'Tênis unissex confortável com solado em borracha vulcanizada e palmilha anatômica.',
        price: 189.90,
        stock: 5,
        category: 'Calçados',
        mainImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store1.id,
        name: 'Bolsa Tiracolo em Couro',
        description: 'Bolsa compacta e elegante com fecho magnético e alça ajustável.',
        price: 99.00,
        stock: 0,
        category: 'Acessórios',
        mainImage: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
    ],
  });

  // =========================================================================
  // LOJA 2: Doces & Quitutes da Vovó (Confeitaria & Doces)
  // =========================================================================
  const phone2 = '5511988887777';
  const vendor2 = await prisma.vendor.upsert({
    where: { phone: phone2 },
    update: {},
    create: {
      phone: phone2,
      name: 'Dona Francisca',
    },
  });

  const store2 = await prisma.store.upsert({
    where: { slug: 'doces-da-vovo' },
    update: {
      status: 'ACTIVE',
    },
    create: {
      vendorId: vendor2.id,
      name: 'Doces & Quitutes da Vovó',
      slug: 'doces-da-vovo',
      description: 'Receitas caseiras tradicionais feitas com amor, ingredientes selecionados e muito sabor familiar.',
      segment: 'Confeitaria & Doces',
      phone: '(11) 98888-7777',
      whatsapp: phone2,
      email: 'quitutes@docesdavovo.com.br',
      address: 'Rua Bela Cintra, 890 - Consolação, São Paulo/SP',
      instagram: '@docesdavovo_oficial',
      businessHours: 'Terça a Domingo, das 10:00 às 19:30',
      paymentMethods: 'Pix, Dinheiro, Cartão de Débito, Cartão de Crédito',
      paymentInstructions: 'Chave Pix Celular: (11) 98888-7777. Aceitamos encomendas!',
      deliveryInfo: 'Entregas locais pelo motoboy do bairro ou retirada quentinha na loja.',
      logoUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
    },
  });

  await prisma.product.deleteMany({ where: { storeId: store2.id } });

  await prisma.product.createMany({
    data: [
      {
        storeId: store2.id,
        name: 'Bolo Caseiro de Cenoura com Chocolate',
        description: 'Massa fofinha com cenouras frescas e cobertura vulcão de brigadeiro belga.',
        price: 45.00,
        stock: 12,
        category: 'Bolos',
        mainImage: 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store2.id,
        name: 'Caixa com 12 Brigadeiros Gourmet',
        description: 'Sortido com brigadeiro tradicional 70%, ninho com nutella, pistache e churros.',
        price: 38.00,
        stock: 25,
        category: 'Doces Finos',
        mainImage: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store2.id,
        name: 'Pão de Mel com Doce de Leite',
        description: 'Pão de mel aromatizado com especiarias e banhado em chocolate meio amargo.',
        price: 8.50,
        stock: 35,
        category: 'Lanches',
        mainImage: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
    ],
  });

  // =========================================================================
  // LOJA 3: Café & Empório do Bairro (Cafés & Empório)
  // =========================================================================
  const phone3 = '5511977776666';
  const vendor3 = await prisma.vendor.upsert({
    where: { phone: phone3 },
    update: {},
    create: {
      phone: phone3,
      name: 'Carlos Eduardo',
    },
  });

  const store3 = await prisma.store.upsert({
    where: { slug: 'emporio-do-bairro' },
    update: {
      status: 'ACTIVE',
    },
    create: {
      vendorId: vendor3.id,
      name: 'Café & Empório do Bairro',
      slug: 'emporio-do-bairro',
      description: 'Cafés especiais de pequenos produtores mineiros, queijos artesanais e produtos coloniais.',
      segment: 'Cafés & Empório',
      phone: '(11) 97777-6666',
      whatsapp: phone3,
      email: 'contato@emporiodobairro.com.br',
      address: 'Rua dos Pinheiros, 450 - Pinheiros, São Paulo/SP',
      instagram: '@emporiodobairro_sp',
      businessHours: 'Segunda a Sábado, das 08:00 às 18:30',
      paymentMethods: 'Pix, Cartão, Dinheiro',
      paymentInstructions: 'Chave Pix CNPJ: 33.444.555/0001-22.',
      deliveryInfo: 'Pronta entrega para todo o bairro em até 45 minutos.',
      logoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
    },
  });

  await prisma.product.deleteMany({ where: { storeId: store3.id } });

  await prisma.product.createMany({
    data: [
      {
        storeId: store3.id,
        name: 'Café Especial Cerrado Mineiro 250g',
        description: 'Notas sensoriais de chocolate e caramelo, torra média, 100% Arábica.',
        price: 32.00,
        stock: 18,
        category: 'Cafés',
        mainImage: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store3.id,
        name: 'Queijo Canastra Meia Cura Artesanal',
        description: 'Queijo maturado 21 dias na Serra da Canastra, sabor suave e textura amanteigada (aprox. 500g).',
        price: 48.00,
        stock: 9,
        category: 'Queijos',
        mainImage: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store3.id,
        name: 'Geleia Artesanal de Frutas Vermelhas',
        description: 'Feita com amora, framboesa e morango, sem conservantes químicos (pote 240g).',
        price: 24.90,
        stock: 14,
        category: 'Conservas',
        mainImage: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store3.id,
        name: 'Pão de Queijo Mineiro Congelado 1kg',
        description: 'Receita tradicional com queijo curado, pronto para assar na airfryer ou forno.',
        price: 35.00,
        stock: 15,
        category: 'Congelados',
        mainImage: 'https://images.unsplash.com/photo-1598110759367-e92591605e54?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
    ],
  });

  console.log('[Seed] Sucesso! 3 Lojas comunitárias criadas com 11 produtos.');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
