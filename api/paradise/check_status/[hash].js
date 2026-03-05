// Serverless function Vercel: GET /api/paradise/check_status/:hash
// Consulta o status da transação Pix na Paradise.

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' } }));
    return;
  }

  const apiKey = process.env.PARADISE_API_KEY || '';
  const upsellUrl = process.env.PARADISE_UPSELL_URL || '';
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: { code: 'MISSING_CONFIG', message: 'PARADISE_API_KEY não configurada.' }
      })
    );
    return;
  }

  // id = transaction_id retornado na criação (doc: query.php?action=get_transaction&id={id})
  const transactionId = (req.query && (req.query.hash || req.query.hash?.[0])) || '';
  if (!transactionId) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'MISSING_ID', message: 'ID da transação (transaction_id) obrigatório.' } }));
    return;
  }

  try {
    const url = `https://multi.paradisepags.com/api/v1/query.php?action=get_transaction&id=${encodeURIComponent(
      transactionId
    )}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey
      }
    });
    const text = await resp.text();
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (e) {
      json = { raw: text };
    }
    // Doc: status da transação = approved (pago), pending, etc.
    const status = (json && json.status) || 'pending';
    if (status === 'approved') {
      const response = { status: 'paid' };
      if (upsellUrl) {
        response.redirect_url = upsellUrl;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(response));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'pending' }));
  } catch (e) {
    console.error('[Paradise] Erro ao consultar status (serverless):', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: { code: 'INTERNAL_ERROR', message: 'Falha ao consultar status na API Paradise.' }
      })
    );
  }
};

