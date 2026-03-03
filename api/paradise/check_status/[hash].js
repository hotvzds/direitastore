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

  const hash = (req.query && (req.query.hash || req.query.hash?.[0])) || '';
  if (!hash) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'MISSING_HASH', message: 'Hash obrigatório.' } }));
    return;
  }

  try {
    const url = `https://multi.paradisepags.com/api/v1/check_status.php?hash=${encodeURIComponent(
      hash
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
    const status = (json && (json.status || json.payment_status || json.state)) || 'pending';
    if (status === 'paid') {
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

