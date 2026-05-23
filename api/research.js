export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { setting, tropes, type } = req.body;

  if (!setting || !tropes || !type) {
    return res.status(400).json({ error: 'Missing setting, tropes, or type' });
  }

  const context = `Setting: ${setting} | Tropes: ${tropes.join(', ')}`;

  const prompts = {
    organic: {
      system: `You are a creative research analyst for a vertical drama series platform. You have deep knowledge of viral TikTok/Instagram/YouTube content and what hooks audiences in short-form vertical drama. Return ONLY a raw JSON array with exactly 5 objects, each with keys: title, platform, hook, metric, emotion, why_it_works. No markdown, no backticks, no preamble.`,
      user: `Based on known trends for vertical drama content with: ${context} — generate top 5 organic/viral content examples. Be specific about hooks and emotions that drive virality in this niche.`
    },
    summary: {
      system: `You are a creative producer at a vertical drama platform. Return ONLY raw JSON (no markdown, no backticks) with keys: patterns (array of 3 strings), hooks (array of 4 strings — specific hook formulas), avoid (array of 3 strings), one_line_concept (string — one punchy concept direction sentence).`,
      user: `Market research context: ${context}. Generate a strategic creative summary for a new vertical drama series. Be specific and actionable, based on known patterns in the vertical drama market (ReelShort, DramaBox, MyDrama).`
    }
  };

  const p = prompts[type];
  if (!p) return res.status(400).json({ error: 'Invalid type' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: p.system,
        messages: [{ role: 'user', content: p.user }]
      })
    });

    const data = await response.json();
    if (!data.content) {
      console.error('[anthropic api error]', response.status, JSON.stringify(data));
      const msg = data.error?.message || `API error (HTTP ${response.status})`;
      throw new Error(msg);
    }

    const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json({ result: parsed });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
