
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Serverless Function para consulta segura de CT-e no Meu Danfe.
 * Corrigida a URL para evitar o erro 404 Not Found.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers simples para permitir chamadas do próprio domínio
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { chave } = req.body;

  if (!chave || chave.length !== 44) {
    return res.status(400).json({ 
      error: 'Chave Inválida', 
      details: 'A chave de acesso deve conter exatamente 44 dígitos.' 
    });
  }

  const apiKey = process.env.MEU_DANFE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Erro de Configuração', 
      details: 'A chave MEU_DANFE_API_KEY não foi configurada nas variáveis de ambiente do Vercel.' 
    });
  }

  try {
    // URL Corrigida: Removido o "/api" extra que causava o 404
    const targetUrl = `https://api.meudanfe.com.br/v1/cte/xml/${chave}?api_key=${apiKey}`;
    
    console.log(`Consultando chave: ${chave}`);

    const response = await fetch(targetUrl);

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      
      if (status === 404) {
        return res.status(404).json({
          error: 'Documento não encontrado',
          details: 'A chave informada não foi encontrada na base de dados do Meu Danfe.'
        });
      }

      return res.status(status).json({ 
        error: `Erro na API (${status})`, 
        details: text || 'Erro desconhecido na resposta da API externa.' 
      });
    }

    const xml = await response.text();
    
    // Verificação básica de integridade do XML
    if (!xml.includes('<infCte')) {
      return res.status(422).json({
        error: 'XML Inválido',
        details: 'A API retornou dados, mas não parece ser um XML de CT-e válido.'
      });
    }

    // Retorna o XML bruto com o content-type correto
    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(xml);

  } catch (error: any) {
    console.error('Erro na execução da função:', error);
    return res.status(500).json({ 
      error: 'Falha de Conexão',
      details: error.message 
    });
  }
}
