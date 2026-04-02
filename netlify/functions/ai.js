// netlify/functions/ai.js
// Essa função roda no servidor do Netlify — a chave da API fica segura aqui,
// nunca exposta no navegador do usuário.

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const { system, userMessage } = body

    if (!userMessage) {
      return new Response(JSON.stringify({ error: 'userMessage é obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: system || 'Você é um assistente de estudos universitários. Responda em português.',
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || 'Sem resposta.'

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = { path: '/api/ai' }
