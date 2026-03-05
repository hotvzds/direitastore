// Serverless function Vercel: GET /api/cep?cep=00000000
// Usa a biblioteca cep-promise para buscar endereço a partir do CEP.

const cepPromise = require('cep-promise');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' } }));
    return;
  }

  const cepRaw =
    (req.query && (req.query.cep || (Array.isArray(req.query.cep) ? req.query.cep[0] : ''))) || '';
  const cepDigits = String(cepRaw || '').replace(/\D/g, '');

  if (!cepDigits || cepDigits.length !== 8) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          code: 'INVALID_CEP',
          message: 'Informe um CEP válido com 8 dígitos.'
        }
      })
    );
    return;
  }

  try {
    const data = await cepPromise(cepDigits);
    // data: { cep, state, city, neighborhood, street }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: true,
        cep: data.cep,
        state: data.state,
        city: data.city,
        neighborhood: data.neighborhood,
        street: data.street
      })
    );
  } catch (e) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          code: 'CEP_NOT_FOUND',
          message: 'CEP não encontrado ou indisponível no momento.'
        }
      })
    );
  }
};

