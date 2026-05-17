export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const FINNHUB_KEY = process.env.VITE_FINNHUB_KEY;
  const NEWSAPI_KEY = process.env.VITE_NEWSAPI_KEY;
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

  res.status(200).json({ headlines: raw });
}
