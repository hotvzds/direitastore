// Serverless function Vercel: POST /api/paradise/create_pix
// Gera uma transação PIX na Paradise usando amountCents e description enviados pelo frontend.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } }));
    return;
  }

  const apiKey = process.env.PARADISE_API_KEY || '';
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'MISSING_CONFIG', message: 'PARADISE_API_KEY não configurada.' } }));
    return;
  }

  // Lê o corpo JSON (Vercel pode injetar req.body; senão lê o stream)
  let bodyReq = {};
  if (req.body && typeof req.body === 'object') {
    bodyReq = req.body;
  } else {
    const bodyText = await new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => resolve(data || '{}'));
    });
    try {
      bodyReq = bodyText ? JSON.parse(bodyText) : {};
    } catch (e) {
      bodyReq = {};
    }
  }

  const amountFromBody = Number(bodyReq.amountCents || 0);
  const amount = amountFromBody > 0 ? amountFromBody : 0;
  if (!amount || amount <= 0) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          code: 'MISSING_AMOUNT',
          message: 'Valor em centavos (amountCents) obrigatório.'
        }
      })
    );
    return;
  }

  const description =
    typeof bodyReq.description === 'string' && bodyReq.description.trim().length > 0
      ? bodyReq.description.trim()
      : 'Pedido DireitaStore';

  // Helpers locais (simplificados em relação ao server.js)
  function generateRandomCpf() {
    const rand = () => Math.floor(Math.random() * 9);
    const n = Array.from({ length: 9 }, rand);
    const calcDigit = (base) => {
      let sum = 0;
      for (let i = 0; i < base.length; i += 1) {
        sum += base[i] * (base.length + 1 - i);
      }
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };
    const d1 = calcDigit(n);
    const d2 = calcDigit([...n, d1]);
    return [...n, d1, d2].join('');
  }

  function randomEmail() {
    const ts = Date.now();
    const rnd = Math.floor(Math.random() * 100000);
    return `cliente_${ts}_${rnd}@email.com`;
  }

  function randomPhone() {
    const base = '1199';
    let rest = '';
    for (let i = 0; i < 7; i += 1) {
      rest += Math.floor(Math.random() * 10);
    }
    return base + rest;
  }

  function randomName() {
    const first = ['João', 'Maria', 'Carlos', 'Ana', 'Paulo', 'Fernanda'];
    const last = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Costa', 'Almeida'];
    return (
      first[Math.floor(Math.random() * first.length)] +
      ' ' +
      last[Math.floor(Math.random() * last.length)]
    );
  }

  function normalizeParadisePix(body) {
    if (!body || typeof body !== 'object') return body;
    const data = body.data || body;
    const externalId =
      data.external_id ||
      data.externalId ||
      data.hash ||
      data.id ||
      data.transaction_id ||
      data.transactionId;
    const pixBlock = data.pix || data.payment || data.pixPayment || data.pix_payment || {};
    const first = (arr) => (Array.isArray(arr) ? arr[0] : arr);
    const qrcode =
      pixBlock.qrcode ||
      pixBlock.qrCode ||
      pixBlock.qr_code ||
      pixBlock.qrcode_base64 ||
      pixBlock.image ||
      pixBlock.qrcodeImage ||
      (pixBlock.qr_code_image && first(pixBlock.qr_code_image)) ||
      data.qrcode ||
      data.qrCode ||
      data.qr_code ||
      null;
    const qrcodeText =
      pixBlock.qrcode_text ||
      pixBlock.qrcodeText ||
      pixBlock.copyPaste ||
      pixBlock.copy_paste ||
      pixBlock.brCode ||
      pixBlock.br_code ||
      pixBlock.emv ||
      pixBlock.pix_key ||
      data.qrcode_text ||
      data.qrcodeText ||
      data.copy_paste ||
      data.brCode ||
      null;
    return {
      externalId,
      pix: {
        qrcode: qrcode || null,
        qrcodeText: qrcodeText || null
      },
      raw: data
    };
  }

  const cpf = generateRandomCpf();
  const email = randomEmail();
  const name = randomName();
  const phone = randomPhone();

  const payload = {
    amount,
    description,
    customer: {
      name,
      email,
      document: cpf,
      phone
    }
  };

  try {
    const resp = await fetch('https://multi.paradisepags.com/api/v1/transaction.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(payload)
    });
    const text = await resp.text();
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (e) {
      json = { raw: text };
    }
    if (resp.status < 200 || resp.status >= 300) {
      res.statusCode = resp.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { code: 'PARADISE_ERROR', body: json } }));
      return;
    }
    const normalized = normalizeParadisePix(json);
    if (!normalized.externalId) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: { code: 'MISSING_EXTERNAL_ID', message: 'Resposta Paradise sem external_id/hash.' },
          body: json
        })
      );
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: true,
        externalId: normalized.externalId,
        pix: normalized.pix
      })
    );
  } catch (e) {
    console.error('[Paradise] Erro ao criar PIX (serverless):', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: { code: 'INTERNAL_ERROR', message: 'Falha ao comunicar com a API Paradise.' }
      })
    );
  }
};

