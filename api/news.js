export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const FINNHUB_KEY = process.env.VITE_FINNHUB_KEY;
  const NEWSAPI_KEY = process.env.VITE_NEWSAPI_KEY;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
  const raw = [];

  try {
    const r = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`);
    const d = await r.json();
    (Array.isArray(d) ? d : []).slice(0, 20).forEach(i =>
      raw.push({ title: i.headline, source: 'Finnhub', url: i.url, time: i.datetime })
    );
  } catch (_) {}

  try {
    const q = encodeURIComponent('stocks OR crypto OR bitcoin OR fed OR inflation OR SpaceX IPO');
    const r = await fetch(`https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWSAPI_KEY}`);
    const d = await r.json();
    (d.articles || []).forEach(a =>
      raw.push({ title: a.title, source: a.source?.name || 'NewsAPI', url: a.url, time: null })
    );
  } catch (_) {}

  const feeds = [
    { url: 'https://www.reddit.com/r/wallstreetbets/new.json?limit=8', label: 'WSB' },
    { url: 'https://www.reddit.com/r/CryptoCurrency/new.json?limit=8', label: 'r/Crypto' },
    { url: 'https://www.reddit.com/r/stocks/new.json?limit=6', label: 'r/Stocks' },
  ];
  for (const feed of feeds) {
    try {
      const r = await fetch(feed.url, { headers: { 'User-Agent': 'MarketIntel/1.0' } });
      const d = await r.json();
      (d?.data?.children || []).forEach(({ data: p }) =>
        raw.push({ title: p.title, source: `Reddit/${feed.label}`, url: `https://reddit.com${p.permalink}`, time: p.created_utc })
      );
    } catch (_) {}
  }

  if (!raw.length) return res.status(200).json({ news: [] });

  try {
    const list = raw.slice(0, 50).map((h, i) => `${i+1}. [${h.source}] ${h.title}`).join('\n');
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: `You are a financial market intelligence AI. A trader holds: Bitcoin (BTC), Ethereum (ETH), XRP, Solana (SOL), Cardano (ADA), Chainlink (LINK), Bittensor (TAO), Hedera (HBAR), Sui (SUI), NVIDIA (NVDA), Google (GOOGL), Applied Materials (AMAT), Rocket Lab (RKLB), Micron (MU), Palantir (PLTR), Rigetti (RGTI), Lumentum (LITE), Redwire (RDW), Gold (XAUUSD). They also watch the SpaceX IPO.

Pick the 8 most relevant headlines below. Always include SpaceX IPO news if present.

${list}

Reply ONLY with a JSON array, no markdown:
[{"headline":"...","summary":"2 sentences on portfolio impact","assets":["SYM"],"sentiment":"bullish|bearish|neutral","topic":"US Politics & Policy|Global Conflicts & Geopolitics|Fed Rates & Inflation|Crypto Regulation & Tech|Reddit Sentiment|Stock News|SpaceX IPO Watch","source":"...","idx":1}]` }]
      })
    });
    const aiData = await aiRes.json();
    console.log('AI Data:', JSON.stringify(aiData));
    const text = (aiData.content?.[0]?.text || '[]').replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    const news = parsed.map(item => ({
      ...item,
      url: raw[item.idx - 1]?.url,
      time: raw[item.idx - 1]?.time
    }));
    return res.status(200).json({ news, debug: { headlines: raw.length, aiRaw: aiData } });
  } catch (e) {
    return res.status(200).json({ news: [], error: e.message });
  }
}
