const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors({ origin: function(origin, callback) { callback(null, true); }, credentials: true }));
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

app.post('/find-glaze', async (req, res) => {
  try {
    const { described_look, customer_name, customer_email } = req.body;

    const glazeRes = await fetch(`${SUPABASE_URL}/rest/v1/glazes?select=*`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const glazes = await glazeRes.json();
    console.log('Supabase glazes response:', JSON.stringify(glazes).substring(0, 500));
    const glazeArray = Array.isArray(glazes) ? glazes : [];

    const input = described_look.toLowerCase();
const match = glazeArray.find(g => {
  const keywords = typeof g.keywords === 'string' ? JSON.parse(g.keywords) : (g.keywords || []);
  const searchable = `${g.name} ${g.description} ${g.finish} ${keywords.join(' ')}`.toLowerCase();
  return input.split(' ').some(word => word.length > 3 && searchable.includes(word));
}) || glazeArray[0];

    await fetch(`${SUPABASE_URL}/rest/v1/glaze_preferences`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ customer_name, customer_email, described_look, suggested_glaze: match ? match.name : 'unknown' })
    });

    res.json({ glaze_name: match ? match.name : 'None found', description: match ? match.description : '', finish: match ? match.finish : '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/log-faq', async (req, res) => {
  try {
    const { question_asked, category, bot_answer } = req.body;
    await fetch(`${SUPABASE_URL}/rest/v1/faq_logs`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ question_asked, category, bot_answer })
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
