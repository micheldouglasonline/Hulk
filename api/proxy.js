// api/proxy.js
export default async function handler(req, res) {
  const API_KEY = process.env.GEMINI_API_KEY; // pega do Vercel
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key não encontrada no Vercel' });
  }

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      }
    );

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

