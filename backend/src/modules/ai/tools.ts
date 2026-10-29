/**
 * Definição das ferramentas controladas que o assistente de IA pode invocar.
 * Nenhuma ferramenta executa comandos diretos no banco ou SQL arbitrário.
 */

export const marketplaceTools = [
  {
    name: 'upsert_store_profile',
    description: 'Cria ou atualiza informações do perfil da loja do vendedor (nome, descrição, segmento, horários, instagram, contatos, formas de pagamento, entrega).',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Nome comercial da loja' },
        description: { type: 'STRING', description: 'Descrição da loja ou apresentação da marca' },
        segment: { type: 'STRING', description: 'Segmento comercial (ex: Moda, Alimentos, Artesanato, Eletrônicos)' },
        phone: { type: 'STRING', description: 'Telefone comercial' },
        whatsapp: { type: 'STRING', description: 'Número do WhatsApp comercial' },
        email: { type: 'STRING', description: 'E-mail para contato' },
        address: { type: 'STRING', description: 'Endereço físico ou cidade/área de atendimento' },
        instagram: { type: 'STRING', description: 'Perfil ou link do Instagram (ex: @modadaana)' },
        businessHours: { type: 'STRING', description: 'Horário de funcionamento (ex: Seg a Sex das 08h às 18h)' },
        paymentMethods: { type: 'STRING', description: 'Formas de pagamento aceitas (ex: Pix, Cartão, Dinheiro)' },
        paymentInstructions: { type: 'STRING', description: 'Instruções seguras para pagamento' },
        deliveryInfo: { type: 'STRING', description: 'Opções de frete, entrega ou retirada no local' }
      }
    }
  },
  {
    name: 'propose_product_draft',
    description: 'Propõe o rascunho de um novo produto (extraído de texto e/ou foto) para revisão e confirmação do vendedor antes de publicar no catálogo.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Nome do produto' },
        description: { type: 'STRING', description: 'Descrição detalhada do produto' },
        price: { type: 'NUMBER', description: 'Preço unitário em Reais (R$)' },
        stock: { type: 'INTEGER', description: 'Quantidade inicial em estoque' },
        category: { type: 'STRING', description: 'Categoria do produto (ex: Roupas, Calçados, Acessórios)' }
      },
      required: ['name', 'price', 'stock']
    }
  },
  {
    name: 'update_product_price',
    description: 'Atualiza o preço de um produto existente da loja pelo nome.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productName: { type: 'STRING', description: 'Nome ou termo de busca do produto' },
        newPrice: { type: 'NUMBER', description: 'Novo valor em Reais (R$)' }
      },
      required: ['productName', 'newPrice']
    }
  },
  {
    name: 'update_product_description',
    description: 'Atualiza a descrição de um produto existente da loja.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productName: { type: 'STRING', description: 'Nome do produto' },
        newDescription: { type: 'STRING', description: 'Nova descrição do produto' }
      },
      required: ['productName', 'newDescription']
    }
  },
  {
    name: 'update_product_stock',
    description: 'Atualiza o estoque de um produto existente. Diferencia quantidade final (SET) de movimentação incremental (+ INCREMENT, - DECREMENT).',
    parameters: {
      type: 'OBJECT',
      properties: {
        productName: { type: 'STRING', description: 'Nome do produto' },
        quantity: { type: 'INTEGER', description: 'Quantidade (positiva)' },
        operation: {
          type: 'STRING',
          enum: ['SET', 'INCREMENT', 'DECREMENT'],
          description: 'SET para definir estoque final; INCREMENT para novas unidades recebidas; DECREMENT para unidades vendidas/saídas.'
        }
      },
      required: ['productName', 'quantity', 'operation']
    }
  },
  {
    name: 'change_product_status',
    description: 'Pausa ou republica o anúncio de um produto.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productName: { type: 'STRING', description: 'Nome do produto' },
        status: {
          type: 'STRING',
          enum: ['PUBLISHED', 'PAUSED'],
          description: 'PUBLISHED para ativo/visível, PAUSED para pausado'
        }
      },
      required: ['productName', 'status']
    }
  },
  {
    name: 'request_delete_product',
    description: 'Exclui definitivamente um ou múltiplos produtos do catálogo da loja quando o vendedor pede para remover, tirar, apagar ou excluir.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productName: { type: 'STRING', description: 'Nome do produto a ser excluído' },
        deleteAll: {
          type: 'BOOLEAN',
          description: 'Defina como true se o usuário pediu para remover TODOS os produtos correspondentes ou todos da categoria (ex: "remova todas as camisetas", "apagar tudo", "excluir todas")'
        }
      },
      required: ['productName']
    }
  },
  {
    name: 'query_products',
    description: 'Consulta produtos da loja com filtros por categoria, status, faixa de preço ou produtos esgotados.',
    parameters: {
      type: 'OBJECT',
      properties: {
        category: { type: 'STRING', description: 'Filtrar por categoria' },
        status: { type: 'STRING', enum: ['PUBLISHED', 'PAUSED'], description: 'Filtrar por status' },
        maxPrice: { type: 'NUMBER', description: 'Filtrar produtos com preço até esse valor' },
        outOfStockOnly: { type: 'BOOLEAN', description: 'Ver apenas produtos sem estoque / esgotados' }
      }
    }
  },
  {
    name: 'get_store_overview',
    description: 'Obtém o resumo completo da loja, total de produtos e link público.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  }
];
