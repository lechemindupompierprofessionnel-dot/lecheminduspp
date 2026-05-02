// ============================================================
// PROXY API CLAUDE — pour le simulateur d'oral SPP
// ============================================================
// À déployer sur Vercel ou Netlify Functions
//
// VERCEL :
//   1. Crée un dossier `api/` à la racine de ton repo GitHub
//   2. Place ce fichier dans `api/oral-jury.js`
//   3. Sur vercel.com : importe ton repo, déploie
//   4. Dans Settings > Environment Variables, ajoute :
//        - CLAUDE_API_KEY = ta clé Anthropic
//        - ALLOWED_ORIGIN = https://lecheminduspp.fr
//   5. Ton endpoint sera : https://ton-projet.vercel.app/api/oral-jury
//
// NETLIFY :
//   1. Crée un dossier `netlify/functions/` à la racine
//   2. Place ce fichier dans `netlify/functions/oral-jury.js`
//   3. Adapte la signature (voir bloc Netlify en bas du fichier)
//   4. Variables d'environnement dans Netlify > Site settings > Build & deploy
//
// COÛT : 0€ tant que tu restes sous 100 000 invocations/mois (largement suffisant)
// ============================================================

export default async function handler(req, res) {
  // -------- CORS : autoriser uniquement ton domaine --------
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://lecheminduspp.fr';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, system, max_tokens, enable_web_search } = req.body;

    // -------- Validation basique --------
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    if (!process.env.CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // -------- Construction du payload Anthropic --------
    const payload = {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: max_tokens || 1024,
      system: system || '',
      messages: messages
    };

    // Activation du web search si demandé (pour les actualités)
    if (enable_web_search) {
      payload.tools = [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 2
      }];
    }

    // -------- Appel à l'API Claude --------
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    if (!anthropicResponse.ok) {
      const errorBody = await anthropicResponse.text();
      console.error('Anthropic API error:', anthropicResponse.status, errorBody);
      return res.status(anthropicResponse.status).json({
        error: 'API call failed',
        details: errorBody
      });
    }

    const data = await anthropicResponse.json();

    // -------- Extraction du texte (gère le cas du web_search) --------
    const textBlocks = data.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    return res.status(200).json({
      text: textBlocks,
      usage: data.usage,
      stop_reason: data.stop_reason
    });

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

// ============================================================
// VERSION NETLIFY (à utiliser à la place du `export default` ci-dessus)
// ============================================================
/*
exports.handler = async (event) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://lecheminduspp.fr';
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { messages, system, max_tokens, enable_web_search } = JSON.parse(event.body);

    const payload = {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: max_tokens || 1024,
      system: system || '',
      messages: messages
    };

    if (enable_web_search) {
      payload.tools = [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 2
      }];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    const textBlocks = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: textBlocks, usage: data.usage })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
*/
