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
    const glazeArray = Array.isArray(glazes) ? glazes : [];

    console.log('Supabase returned glazes:', glazeArray.length);

    const input = described_look.toLowerCase();

    const warmKeywords =    ['warm','orange','red','earthy','rustic','terracotta','cozy','autumn'];
    const coolKeywords =    ['cool','blue','grey','calm','ocean','minimal','stone'];
    const darkKeywords =    ['dark','moody','black','charcoal','dramatic','bold'];
    const freshKeywords =   ['fresh','botanical','green','nature','plant','forest','sage','olive'];
    const glossyKeywords =  ['glossy','elegant','shiny','pearl','white','clean','light'];
    const matteKeywords =   ['matte','earthy','rough','natural','rustic','mud'];

    const score = (glaze, targetWords) => {
      const kw = typeof glaze.keywords === 'string' ? JSON.parse(glaze.keywords) : (glaze.keywords || []);
      const searchable = `${glaze.name} ${glaze.description} ${glaze.finish} ${kw.join(' ')}`.toLowerCase();
      return targetWords.filter(w => searchable.includes(w)).length;
    };

    let targetWords = input.split(' ').filter(w => w.length > 2);
    if (input.includes('warmer'))                          targetWords = warmKeywords;
    else if (input.includes('cooler'))                     targetWords = coolKeywords;
    else if (input.includes('dark') || input.includes('moody'))    targetWords = darkKeywords;
    else if (input.includes('fresh') || input.includes('botanical')) targetWords = freshKeywords;
    else if (input.includes('glossy') || input.includes('elegant')) targetWords = glossyKeywords;
    else if (input.includes('matte') || input.includes('earthy'))   targetWords = matteKeywords;

    const scored = glazeArray
      .map(g => ({ g, s: score(g, targetWords) }))
      .sort((a, b) => b.s - a.s);

    const match = scored[0].s > 0 ? scored[0].g : glazeArray[0];

    console.log('Matched glaze:', match ? match.name : 'none');

    await fetch(`${SUPABASE_URL}/rest/v1/glaze_preferences`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        customer_name,
        customer_email,
        described_look,
        suggested_glaze: match ? match.name : 'unknown'
      })
    });

    res.json({
      glaze_name: match ? match.name : 'None found',
      description: match ? match.description : '',
      finish: match ? match.finish : ''
    });

  } catch (err) {
    console.error('Error in /find-glaze:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/log-faq', async (req, res) => {
  try {
    const { question_asked, category, bot_answer } = req.body;

    await fetch(`${SUPABASE_URL}/rest/v1/faq_logs`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ question_asked, category, bot_answer })
    });

    res.json({ success: true });

  } catch (err) {
    console.error('Error in /log-faq:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
