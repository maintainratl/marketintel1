export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const FINNHUB_KEY = process.env.VITE_FINNHUB_KEY;
  const result = {};

  // Crypto via CoinGecko
  try {
    const cgIds = 'bitcoin,ethereum,ripple,solana,cardano,chainlink,bittensor,hedera-hashgraph,sui,pudgy-penguins';
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd&include_24hr_change=true`);
    const d = await r.json();
    const map = {
      bitcoin: 'BTC', ethereum: 'ETH', ripple: 'XRP', solana: 'SOL',
      cardano: 'ADA', chainlink: 'LINK', bittensor: 'TAO',
      'hedera-hashgraph': 'HBAR', sui: 'SUI', 'pudgy-penguins': 'PENGU'
    };
    for (const [cgId, sym] of Object.entries(map)) {
      const p = d[cgId];
      if (p) result[sym] = { cur: p.usd, prev: p.usd / (1 + (p.usd_24h_change || 0) / 100), pct24: p.usd_24h_change || 0 };
    }
  } catch (_) {}

  // Stocks via Finnhub
  const stocks = ['NVDA','GOOGL','AMAT','RKLB','MU','PLTR','NBIS','AMPX','RGTI','POET','LITE','RDW','XAUUSD','CRWV','DXYZ','INTC','USAR','CCJ','GLW','MRVL','BE'];
  await Promise.all(stocks.map(async sym => {
    try {
      const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${FINNHUB_KEY}`);
      const d = await r.json();
      if (d?.c) result[sym] = { cur: d.c, prev: d.pc || d.c, pct24: d.pc ? ((d.c - d.pc) / d.pc) * 100 : 0 };
    } catch (_) {}
  }));

  res.status(200).json({ prices: result });
}
