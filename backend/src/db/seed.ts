import { prisma } from './prisma.js';

async function seed() {
  console.log('[Seed] Inserindo dados do Marketplace Comunitário (Fortaleza e Caucaia)...');

  const validSlugs = [
    'moda-da-ana',
    'doces-da-vovo',
    'emporio-do-bairro',
    'raizes-da-comunidade',
    'sabor-da-aerolandia',
    'artes-do-pecem',
  ];

  // Remove produtos e lojas antigas de teste ou órfãs
  const storesToDelete = await prisma.store.findMany({
    where: {
      slug: { notIn: validSlugs },
    },
    select: { id: true },
  });

  if (storesToDelete.length > 0) {
    const storeIds = storesToDelete.map((s) => s.id);
    await prisma.product.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
  }

  // Remove conversas e mensagens com números antigos de teste (DDD 11)
  const oldVendors = await prisma.vendor.findMany({
    where: {
      phone: { startsWith: '5511' },
    },
    select: { id: true, phone: true },
  });

  for (const ov of oldVendors) {
    const conv = await prisma.conversation.findFirst({ where: { vendorPhone: ov.phone } });
    if (conv) {
      await prisma.message.deleteMany({ where: { conversationId: conv.id } });
      await prisma.conversation.delete({ where: { id: conv.id } });
    }
    // Deleta o vendedor se não tiver lojas vinculadas
    const storeCount = await prisma.store.count({ where: { vendorId: ov.id } });
    if (storeCount === 0) {
      await prisma.vendor.delete({ where: { id: ov.id } });
    }
  }

  // =========================================================================
  // LOJA 1: Moda da Ana (Messejana, Fortaleza/CE)
  // =========================================================================
  const phone1 = '5585999998888';
  const vendor1 = await prisma.vendor.upsert({
    where: { phone: phone1 },
    update: { name: 'Ana Silva' },
    create: {
      phone: phone1,
      name: 'Ana Silva',
    },
  });

  const store1Data = {
    vendorId: vendor1.id,
    name: 'Moda da Ana',
    slug: 'moda-da-ana',
    description: 'Peças autorais e moda sustentável com estilo, elegância e frescor para o clima cearense.',
    segment: 'Moda & Vestuário',
    region: 'Messejana',
    phone: '(85) 99999-8888',
    whatsapp: phone1,
    email: 'contato@modadaana.com.br',
    address: 'Av. Washington Soares, 8500 - Messejana, Fortaleza/CE',
    instagram: '@modadaana_ce',
    businessHours: 'Segunda a Sábado, das 09:00 às 19:00',
    paymentMethods: 'Pix, Cartão de Crédito, Cartão de Débito, Dinheiro',
    paymentInstructions: 'Chave Pix Celular: (85) 99999-8888. Envie o comprovante pelo WhatsApp.',
    deliveryInfo: 'Entrega rápida para Messejana, Cambeba e Cidade dos Funcionários ou retirada gratuita.',
    logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&auto=format&fit=crop&q=80',
    status: 'ACTIVE' as const,
  };

  const store1 = await prisma.store.upsert({
    where: { slug: 'moda-da-ana' },
    update: store1Data,
    create: store1Data,
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
  // LOJA 2: Doces & Quitutes da Vovó (Benfica, Fortaleza/CE)
  // =========================================================================
  const phone2 = '5585988887777';
  const vendor2 = await prisma.vendor.upsert({
    where: { phone: phone2 },
    update: { name: 'Dona Francisca' },
    create: {
      phone: phone2,
      name: 'Dona Francisca',
    },
  });

  const store2Data = {
    vendorId: vendor2.id,
    name: 'Doces & Quitutes da Vovó',
    slug: 'doces-da-vovo',
    description: 'Receitas caseiras tradicionais feitas com amor, ingredientes selecionados e muito sabor familiar no coração cultural do Benfica.',
    segment: 'Confeitaria & Doces',
    region: 'Benfica',
    phone: '(85) 98888-7777',
    whatsapp: phone2,
    email: 'quitutes@docesdavovo.com.br',
    address: 'Rua Carapinima, 1420 - Benfica, Fortaleza/CE',
    instagram: '@docesdavovo_benfica',
    businessHours: 'Terça a Domingo, das 10:00 às 19:30',
    paymentMethods: 'Pix, Dinheiro, Cartão de Débito, Cartão de Crédito',
    paymentInstructions: 'Chave Pix Celular: (85) 98888-7777. Aceitamos encomendas!',
    deliveryInfo: 'Entregas no Benfica, Gentilândia, Fátima e proximidades da UFC ou retirada na loja.',
    logoUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&auto=format&fit=crop&q=80',
    status: 'ACTIVE' as const,
  };

  const store2 = await prisma.store.upsert({
    where: { slug: 'doces-da-vovo' },
    update: store2Data,
    create: store2Data,
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
        description: 'Sortido com brigadeiro tradicional 70%, ninho com nutella, pistache e castanha de caju.',
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
  // LOJA 3: Café & Empório do Bairro (Jangurussu, Fortaleza/CE)
  // =========================================================================
  const phone3 = '5585977776666';
  const vendor3 = await prisma.vendor.upsert({
    where: { phone: phone3 },
    update: { name: 'Carlos Eduardo' },
    create: {
      phone: phone3,
      name: 'Carlos Eduardo',
    },
  });

  const store3Data = {
    vendorId: vendor3.id,
    name: 'Café & Empório do Bairro',
    slug: 'emporio-do-bairro',
    description: 'Cafés especiais da Serra de Baturité, queijos artesanais do Sertão Central e produtos regionais cearenses.',
    segment: 'Cafés & Empório',
    region: 'Jangurussu',
    phone: '(85) 97777-6666',
    whatsapp: phone3,
    email: 'contato@emporiodobairro.com.br',
    address: 'Av. Castelo de Castro, 620 - Jangurussu, Fortaleza/CE',
    instagram: '@emporio_jangurussu',
    businessHours: 'Segunda a Sábado, das 08:00 às 18:30',
    paymentMethods: 'Pix, Cartão, Dinheiro',
    paymentInstructions: 'Chave Pix CNPJ: 33.444.555/0001-22.',
    deliveryInfo: 'Pronta entrega para Jangurussu, Santa Maria e Messejana em até 45 minutos.',
    logoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&auto=format&fit=crop&q=80',
    status: 'ACTIVE' as const,
  };

  const store3 = await prisma.store.upsert({
    where: { slug: 'emporio-do-bairro' },
    update: store3Data,
    create: store3Data,
  });

  await prisma.product.deleteMany({ where: { storeId: store3.id } });

  await prisma.product.createMany({
    data: [
      {
        storeId: store3.id,
        name: 'Café Especial Serra de Baturité 250g',
        description: 'Grãos 100% arábica cultivados na serra cearense, com notas marcantes de rapadura e chocolate.',
        price: 34.00,
        stock: 18,
        category: 'Cafés',
        mainImage: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store3.id,
        name: 'Queijo Coalho Tradicional do Sertão 500g',
        description: 'Autêntico queijo coalho de fazenda, textura macia e perfeito para assar na brasa ou frigideira.',
        price: 36.00,
        stock: 15,
        category: 'Queijos',
        mainImage: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store3.id,
        name: 'Doce de Caju em Calda Caseiro 350g',
        description: 'Feito artesanalmente com cajus frescos cearenses cozidos lentamente com canela e cravo.',
        price: 22.90,
        stock: 20,
        category: 'Doces Regionais',
        mainImage: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store3.id,
        name: 'Castanha de Caju Torrada Especial 250g',
        description: 'Castanhas inteiras selecionadas, crocantes e levemente salgadas no ponto perfeito.',
        price: 29.90,
        stock: 24,
        category: 'Snacks & Castanhas',
        mainImage: 'https://images.unsplash.com/photo-1598110759367-e92591605e54?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
    ],
  });

  // =========================================================================
  // LOJA 4: Raízes da Comunidade (Conjunto Palmeiras, Fortaleza/CE)
  // =========================================================================
  const phone4 = '5585966665555';
  const vendor4 = await prisma.vendor.upsert({
    where: { phone: phone4 },
    update: { name: 'Severino Gomes' },
    create: {
      phone: phone4,
      name: 'Severino Gomes',
    },
  });

  const store4Data = {
    vendorId: vendor4.id,
    name: 'Raízes da Comunidade',
    slug: 'raizes-da-comunidade',
    description: 'Arte popular autêntica, cerâmicas moldadas à mão e tapeçarias produzidas por artesãos do Conjunto Palmeiras.',
    segment: 'Artesanato & Decoração',
    region: 'Conjunto Palmeiras',
    phone: '(85) 96666-5555',
    whatsapp: phone4,
    email: 'contato@raizescomunitarias.com.br',
    address: 'Av. Valparaíso, 780 - Conjunto Palmeiras, Fortaleza/CE',
    instagram: '@raizes_palmeiras',
    businessHours: 'Segunda a Sábado, das 09:00 às 18:00',
    paymentMethods: 'Pix, Dinheiro, Cartão',
    paymentInstructions: 'Chave Pix CNPJ: 45.678.901/0001-33. Toda renda apoia artesãos locais da comunidade.',
    deliveryInfo: 'Retirada no ateliê comunitário do Conjunto Palmeiras ou entrega com motoboys do bairro.',
    logoUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&auto=format&fit=crop&q=80',
    status: 'ACTIVE' as const,
  };

  const store4 = await prisma.store.upsert({
    where: { slug: 'raizes-da-comunidade' },
    update: store4Data,
    create: store4Data,
  });

  await prisma.product.deleteMany({ where: { storeId: store4.id } });

  await prisma.product.createMany({
    data: [
      {
        storeId: store4.id,
        name: 'Vaso de Cerâmica Barro & Sol',
        description: 'Vaso decorativo moldado manualmente em argila natural com acabamento terracota rústico cearense.',
        price: 55.00,
        stock: 10,
        category: 'Cerâmicas',
        mainImage: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store4.id,
        name: 'Tapeçaria Tear Manual Cores Vivas',
        description: 'Painel decorativo em fios de algodão reciclado tecido em tear tradicional comunitário (60x90cm).',
        price: 110.00,
        stock: 6,
        category: 'Tapeçaria',
        mainImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store4.id,
        name: 'Luminária Pendente de Fibras Naturais',
        description: 'Luminária artesanal trançada em fibra de bananeira e carnaúba, design acolhedor e sustentável.',
        price: 85.00,
        stock: 8,
        category: 'Iluminação',
        mainImage: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
    ],
  });

  // =========================================================================
  // LOJA 5: Sabor & Tradição da Aerolândia (Aerolândia, Fortaleza/CE)
  // =========================================================================
  const phone5 = '5585955554444';
  const vendor5 = await prisma.vendor.upsert({
    where: { phone: phone5 },
    update: { name: 'Raimundo Nonato' },
    create: {
      phone: phone5,
      name: 'Raimundo Nonato',
    },
  });

  const store5Data = {
    vendorId: vendor5.id,
    name: 'Sabor & Tradição da Aerolândia',
    slug: 'sabor-da-aerolandia',
    description: 'Culinária tradicional inspirada no Mercado da Aerolândia: peixadas, carne de sol e o melhor sabor do Nordeste.',
    segment: 'Gastronomia Regional',
    region: 'Aerolândia',
    phone: '(85) 95555-4444',
    whatsapp: phone5,
    email: 'contato@saboraerolandia.com.br',
    address: 'Rua Capitão Aragão, 350 - Aerolândia, Fortaleza/CE',
    instagram: '@sabor_aerolandia',
    businessHours: 'Terça a Domingo, das 11:00 às 21:00',
    paymentMethods: 'Pix, Dinheiro, Cartão de Débito, Cartão de Crédito',
    paymentInstructions: 'Chave Pix Celular: (85) 95555-4444. Marmitas e porções quentinhas!',
    deliveryInfo: 'Entrega rápida na Aerolândia, Alto da Balança, Tauape e Montese.',
    logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80',
    status: 'ACTIVE' as const,
  };

  const store5 = await prisma.store.upsert({
    where: { slug: 'sabor-da-aerolandia' },
    update: store5Data,
    create: store5Data,
  });

  await prisma.product.deleteMany({ where: { storeId: store5.id } });

  await prisma.product.createMany({
    data: [
      {
        storeId: store5.id,
        name: 'Peixada Cearense Completa',
        description: 'Robalo fresco em posta cozido no leite de coco, legumes selecionados, ovos cozidos e pirão encorpado.',
        price: 68.00,
        stock: 14,
        category: 'Almoço & Jantar',
        mainImage: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store5.id,
        name: 'Carne de Sol Acebolada com Macaxeira',
        description: 'Carne de sol artesanal frita na manteiga da terra, servida com macaxeira cozida derretendo.',
        price: 49.90,
        stock: 20,
        category: 'Porções Regionais',
        mainImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store5.id,
        name: 'Cuscuz Nordestino com Queijo e Carne Seca',
        description: 'Cuscuz de milho fofinho no vapor, recheado com queijo coalho tostado e carne desfiada temperada.',
        price: 18.50,
        stock: 30,
        category: 'Lanches Regionais',
        mainImage: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
    ],
  });

  // =========================================================================
  // LOJA 6: Artes & Sabores do Pecém (Pecém, Caucaia/CE)
  // =========================================================================
  const phone6 = '5585944443333';
  const vendor6 = await prisma.vendor.upsert({
    where: { phone: phone6 },
    update: { name: 'Maria das Graças' },
    create: {
      phone: phone6,
      name: 'Maria das Graças',
    },
  });

  const store6Data = {
    vendorId: vendor6.id,
    name: 'Artes & Sabores do Pecém',
    slug: 'artes-do-pecem',
    description: 'Renda de bilro, artesanato em palha de carnaúba e lembranças praianas autênticas do litoral de Caucaia e Pecém.',
    segment: 'Artesanato & Moda Praia',
    region: 'Pecém',
    phone: '(85) 94444-3333',
    whatsapp: phone6,
    email: 'contato@artesdopecem.com.br',
    address: 'Av. Beatriz Braga, 120 - Pecém, Caucaia/CE',
    instagram: '@artes_pecem_caucaia',
    businessHours: 'Segunda a Sábado, das 08:30 às 18:00',
    paymentMethods: 'Pix, Cartão, Dinheiro',
    paymentInstructions: 'Chave Pix Celular: (85) 94444-3333. Aceitamos encomendas personalizadas!',
    deliveryInfo: 'Envio para todo o litoral de Caucaia, Pecém, São Gonçalo e Grande Fortaleza.',
    logoUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80',
    status: 'ACTIVE' as const,
  };

  const store6 = await prisma.store.upsert({
    where: { slug: 'artes-do-pecem' },
    update: store6Data,
    create: store6Data,
  });

  await prisma.product.deleteMany({ where: { storeId: store6.id } });

  await prisma.product.createMany({
    data: [
      {
        storeId: store6.id,
        name: 'Caminho de Mesa em Renda de Bilro',
        description: 'Peça nobre tecida à mão por rendeiras do litoral de Caucaia, riqueza de detalhes e acabamento fino (1,40m).',
        price: 89.90,
        stock: 7,
        category: 'Renda de Bilro',
        mainImage: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store6.id,
        name: 'Chapéu Praiano em Palha de Carnaúba',
        description: 'Chapéu artesanal confeccionado com palha virgem de carnaúba, proteção solar com estilo rústico elegante.',
        price: 42.00,
        stock: 16,
        category: 'Moda Praia',
        mainImage: 'https://images.unsplash.com/photo-1572307480813-ceb0e59d8325?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
      {
        storeId: store6.id,
        name: 'Cesta Trançada Multiuso Sustentável',
        description: 'Cesta decorativa trançada em fibras naturais e carnaúba, ideal para organização e decoração de ambientes.',
        price: 36.00,
        stock: 12,
        category: 'Decoração Rústica',
        mainImage: 'https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?w=600&auto=format&fit=crop&q=80',
        status: 'PUBLISHED',
      },
    ],
  });

  // Limpa conversas antigas de demonstracão para carregar dados limpos
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});

  console.log('[Seed] Sucesso! 6 Lojas comunitárias (Messejana, Benfica, Jangurussu, Conjunto Palmeiras, Aerolândia, Pecém) vinculadas aos vendedores DDD 85 e 20 produtos cadastrados.');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
