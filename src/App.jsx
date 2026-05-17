import { useState, useEffect, useCallback, useRef } from "react";

const FINNHUB_KEY = "d84d6qpr01qutij8ne3gd84d6qpr01qutij8ne40";
const NEWSAPI_KEY = "fa750f8715e14d80988b83dd839dc8d8";

const CRYPTO = [
  { symbol: "BTC",   name: "Bitcoin",        cgId: "bitcoin",          color: "#F7931A", type: "crypto" },
  { symbol: "ETH",   name: "Ethereum",       cgId: "ethereum",         color: "#627EEA", type: "crypto" },
  { symbol: "XRP",   name: "XRP",            cgId: "ripple",           color: "#00AAE4", type: "crypto" },
  { symbol: "SOL",   name: "Solana",         cgId: "solana",           color: "#9945FF", type: "crypto" },
  { symbol: "ADA",   name: "Cardano",        cgId: "cardano",          color: "#0099CC", type: "crypto" },
  { symbol: "LINK",  name: "Chainlink",      cgId: "chainlink",        color: "#375BD2", type: "crypto" },
  { symbol: "TAO",   name: "Bittensor",      cgId: "bittensor",        color: "#00D4FF", type: "crypto" },
  { symbol: "HBAR",  name: "Hedera",         cgId: "hedera-hashgraph", color: "#00B0A0", type: "crypto" },
  { symbol: "SUI",   name: "Sui",            cgId: "sui",              color: "#6FBCF0", type: "crypto" },
  { symbol: "PENGU", name: "Pudgy Penguins", cgId: "pudgy-penguins",   color: "#A8D8FF", type: "crypto" },
];

const STOCKS = [
  { symbol: "NVDA",   name: "NVIDIA",            color: "#76B900", type: "stock" },
  { symbol: "GOOGL",  name: "Google",            color: "#4285F4", type: "stock" },
  { symbol: "AMAT",   name: "Applied Materials", color: "#00A8E0", type: "stock" },
  { symbol: "RKLB",   name: "Rocket Lab",        color: "#FF6B35", type: "stock" },
  { symbol: "MU",     name: "Micron",            color: "#009DDB", type: "stock" },
  { symbol: "PLTR",   name: "Palantir",          color: "#7B68EE", type: "stock" },
  { symbol: "NBIS",   name: "Nebius",            color: "#E040FB", type: "stock" },
  { symbol: "AMPX",   name: "Amprius Tech",      color: "#FF8F00", type: "stock" },
  { symbol: "RGTI",   name: "Rigetti",           color: "#00E5FF", type: "stock" },
  { symbol: "POET",   name: "POET Tech",         color: "#69F0AE", type: "stock" },
  { symbol: "LITE",   name: "Lumentum",          color: "#FF4081", type: "stock" },
  { symbol: "RDW",    name: "Redwire",           color: "#FF6E40", type: "stock" },
  { symbol: "XAUUSD", name: "Gold",              color: "#FFD700", type: "commodity" },
];

const INIT_WATCHLIST = [
  { symbol: "CRWV",   name: "CoreWeave",          color: "#00C8FF", type: "watch" },
  { symbol: "DXYZ",   name: "Destiny Tech100",    color: "#FF6FD8", type: "watch" },
  { symbol: "INTC",   name: "Intel",              color: "#0071C5", type: "watch" },
  { symbol: "USAR",   name: "US Air Force ETF",   color: "#BF8E3A", type: "watch" },
  { symbol: "CCJ",    name: "Cameco (Uranium)",   color: "#F5A623", type: "watch" },
  { symbol: "GLW",    name: "Corning",            color: "#7ED4C8", type: "watch" },
  { symbol: "MRVL",   name: "Marvell Technology", color: "#A855F7", type: "watch" },
  { symbol: "BE",     name: "Bloom Energy",       color: "#34D399", type: "watch" },
  { symbol: "SPACEX", name: "SpaceX — Pre-IPO",   color: "#E8E8E8", type: "watch", preIpo: true },
];

const ALL_PORTFOLIO = [...CRYPTO, ...STOCKS];
const ASSET_STR = ALL_PORTFOLIO.map(a => `${a.name} (${a.symbol})`).join(", ");

const TOPIC_COLORS = {
  "US Politics & Policy":           "#7B68EE",
  "Global Conflicts & Geopolitics": "#FF6B35",
  "Fed Rates & Inflation":          "#FFD700",
  "Crypto Regulation & Tech":       "#00B4FF",
  "Reddit Sentiment":               "#FF4500",
  "Stock News":                     "#00E876",
  "SpaceX IPO Watch":               "#E8E8E8",
};

const SWATCH_COLORS = ["#00C8FF","#FF6FD8","#34D399","#F5A623","#A855F7","#FB923C","#60A5FA","#F472B6","#4ADE80","#FACC15"];

function fmt(v) {
  if (v == null || isNaN(v)) return "—";
  if (v >= 10000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 100)   return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 1)     return v.toFixed(3);
  return v.toFixed(5);
}

function timeAgo(ts) {
  if (!ts) return "";
  const s = (Date.now() - ts * 1000) / 1000;
  if (s < 60)   return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

// ── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ points, color }) {
  if (!points || points.length < 2) return (
    <div style={{ height: 32, display: "flex", alignItems: "center" }}>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
  try {
    const W = 100, H = 32, P = 1;
    const mn = Math.min(...points), mx = Math.max(...points);
    const rng = mx - mn || 1;
    const xs = points.map((_, i) => P + (i / (points.length - 1)) * (W - P * 2));
    const ys = points.map(v => H - P - ((v - mn) / rng) * (H - P * 2));
    const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    const fill = `${line} L${xs[xs.length-1].toFixed(1)},${H} L${xs[0].toFixed(1)},${H} Z`;
    const gId = `sg${color.replace(/[^a-z0-9]/gi,"")}`;
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block", marginTop: 4 }}>
        <defs>
          <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fill} fill={`url(#${gId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  } catch (e) {
    return null;
  }
}

// ── Asset Card ───────────────────────────────────────────────────────────────
function AssetCard({ asset, price, flash, chartPoints, isWatch, onRemove, theme: T, dragHandlers }) {
  const up = price ? price.pct24 >= 0 : true;
  const fl = flash || "";
  return (
    <div
      draggable
      {...dragHandlers}
      className={`card ${fl === "up" ? "fu" : fl === "dn" ? "fd" : ""}`}
      style={{
        background: T ? T.bgCard : "rgba(255,255,255,0.028)",
        border: `1px solid ${isWatch ? "rgba(168,85,247,0.15)" : (T ? T.borderCard : "rgba(255,255,255,0.06)")}`,
        borderLeft: `3px solid ${asset.color}`,
        borderRadius: 8, padding: "10px 10px 6px",
        position: "relative", cursor: "grab", userSelect: "none",
      }}
    >
      <div style={{ position: "absolute", top: 6, left: 5, fontSize: 7, color: T ? T.textMuted : "#2A3848", pointerEvents: "none" }}>⠿</div>
      {isWatch && !asset.preIpo && (
        <button onClick={() => onRemove(asset.symbol)} style={{
          position: "absolute", top: 3, right: 3, background: "transparent",
          border: "none", color: T ? T.textMuted : "#3A5070", cursor: "pointer", fontSize: 13, padding: "2px 5px",
        }}>×</button>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingLeft: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: asset.color, fontWeight: 600 }}>{asset.symbol}</div>
          <div style={{ fontSize: 7, color: T ? T.textMuted : "#3A5070", marginTop: 1 }}>{asset.name}</div>
        </div>
        {price && !asset.preIpo && (
          <div style={{
            fontSize: 7, padding: "2px 5px", borderRadius: 3,
            marginRight: isWatch && !asset.preIpo ? 14 : 0,
            background: up ? "rgba(0,232,118,0.1)" : "rgba(255,60,60,0.1)",
            color: up ? "#00E876" : "#FF4040",
          }}>
            {up ? "▲" : "▼"}{Math.abs(price.pct24 || 0).toFixed(2)}%
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 5, color: T ? T.text : "#D8E4F0", paddingLeft: 10 }}>
        {asset.preIpo
          ? <span style={{ fontSize: 9, color: T ? T.text : "#E8E8E8", letterSpacing: "0.05em" }}>🚀 AWAITING IPO</span>
          : price ? `$${fmt(price.cur)}` : <span style={{ color: T ? T.textMuted : "#3A5070", fontSize: 10 }}>—</span>}
      </div>
      {!asset.preIpo && price && (
        <div style={{ fontSize: 7, color: up ? "rgba(0,232,118,0.5)" : "rgba(255,60,60,0.5)", marginTop: 1, paddingLeft: 10 }}>
          {up ? "+" : ""}{fmt(price.cur - price.prev)} today
        </div>
      )}
      {!asset.preIpo && (
        <div style={{ paddingLeft: 2, paddingRight: 2 }}>
          <Sparkline points={chartPoints} color={asset.color} />
        </div>
      )}
    </div>
  );
}

// ── THEMES ───────────────────────────────────────────────────────────────────
const THEMES = {
  terminal: {
    name: "Terminal",
    bg:        "#06090F",
    bgHeader:  "linear-gradient(180deg,#0C1526 0%,#06090F 100%)",
    bgCard:    "rgba(255,255,255,0.028)",
    bgCardAlt: "rgba(255,255,255,0.022)",
    border:    "#121E30",
    borderCard:"rgba(255,255,255,0.06)",
    text:      "#D8E4F0",
    textMuted: "#3A5070",
    textSub:   "#8098B0",
    accent:    "#00B4FF",
    accentAlt: "#00E876",
    scrollBg:  "#0A0E17",
    scrollThumb:"#1A3050",
  },
  midnight: {
    name: "Midnight",
    bg:        "#0B1120",
    bgHeader:  "linear-gradient(180deg,#0D1835 0%,#0B1120 100%)",
    bgCard:    "rgba(99,130,202,0.07)",
    bgCardAlt: "rgba(99,130,202,0.05)",
    border:    "#1A2744",
    borderCard:"rgba(99,130,202,0.12)",
    text:      "#C8D8F0",
    textMuted: "#3E5888",
    textSub:   "#6080A8",
    accent:    "#5B8DEF",
    accentAlt: "#4FC8A0",
    scrollBg:  "#080E1A",
    scrollThumb:"#1E3060",
  },
  gold: {
    name: "Gold",
    bg:        "#0E0C09",
    bgHeader:  "linear-gradient(180deg,#1A1608 0%,#0E0C09 100%)",
    bgCard:    "rgba(212,170,80,0.06)",
    bgCardAlt: "rgba(212,170,80,0.04)",
    border:    "#2A2010",
    borderCard:"rgba(212,170,80,0.1)",
    text:      "#EDE0C4",
    textMuted: "#5A4A28",
    textSub:   "#8A7448",
    accent:    "#D4A840",
    accentAlt: "#C8965A",
    scrollBg:  "#080600",
    scrollThumb:"#3A2E14",
  },
  mono: {
    name: "Mono",
    bg:        "#000000",
    bgHeader:  "linear-gradient(180deg,#111111 0%,#000000 100%)",
    bgCard:    "rgba(255,255,255,0.04)",
    bgCardAlt: "rgba(255,255,255,0.03)",
    border:    "#1A1A1A",
    borderCard:"rgba(255,255,255,0.08)",
    text:      "#E8E8E8",
    textMuted: "#404040",
    textSub:   "#707070",
    accent:    "#FFFFFF",
    accentAlt: "#AAAAAA",
    scrollBg:  "#000000",
    scrollThumb:"#333333",
  },
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [theme, setTheme] = useState("midnight");
  const [portfolio, setPortfolio] = useState(ALL_PORTFOLIO);
  const [watchlist, setWatchlist] = useState(INIT_WATCHLIST);
  const [prices, setPrices]       = useState({});
  const [flash, setFlash]         = useState({});
  const [chartData, setChartData] = useState({});
  const [chartRange, setChartRange] = useState("1D");
  const [filter, setFilter]       = useState("ALL");
  const [news, setNews]           = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsTab, setNewsTab]     = useState("ALL");
  const [lastTick, setLastTick]   = useState(null);
  const [watchInput, setWatchInput] = useState("");
  const [watchAdding, setWatchAdding] = useState(false);
  const [watchErr, setWatchErr]   = useState("");
  const dragItem = useRef(null);
  const dragOver = useRef(null);
  const dragList = useRef(null);

  // ── Prices ──────────────────────────────────────────────────────────────
  const fetchPrices = useCallback(async () => {
    try {
      const r = await fetch('/api/prices');
      const d = await r.json();
      setPrices(prev => {
        const fl = {};
        for (const s of Object.keys(d.prices)) {
          if (prev[s]) fl[s] = d.prices[s].cur >= prev[s].cur ? "up" : "dn";
        }
        setFlash(fl);
        setTimeout(() => setFlash({}), 800);
        return { ...prev, ...d.prices };
      });
      setLastTick(new Date());
    } catch (_) {}
  }, []);

  useEffect(() => { fetchPrices(); const iv = setInterval(fetchPrices, 30000); return () => clearInterval(iv); }, [fetchPrices]);

  // ── Charts ───────────────────────────────────────────────────────────────
  const fetchChart = useCallback(async (symbol, range, cgId) => {
    const key = `${symbol}_${range}`;
    setChartData(prev => { if (prev[key]) return prev; return prev; });
    try {
      let points = [];
      if (cgId) {
        const days = range === "1D" ? 1 : range === "7D" ? 7 : 30;
        const r = await fetch(`https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=${days}`);
        const d = await r.json();
        points = (d.prices||[]).map(p => p[1]);
      } else {
        const now = Math.floor(Date.now()/1000);
        const from = range === "1D" ? now-86400 : range === "7D" ? now-604800 : now-2592000;
        const res = range === "1D" ? "60" : "D";
        const r = await fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${res}&from=${from}&to=${now}&token=${FINNHUB_KEY}`);
        const d = await r.json();
        if (d?.s === "ok") points = d.c || [];
      }
      if (points.length > 1) setChartData(prev => ({ ...prev, [key]: points }));
    } catch (_) {}
  }, []);

  useEffect(() => {
    const all = [...portfolio, ...watchlist].filter(a => !a.preIpo);
    all.forEach(a => {
      const cg = CRYPTO.find(c => c.symbol === a.symbol);
      fetchChart(a.symbol, chartRange, cg?.cgId || null);
    });
  }, [chartRange]);

  // ── News ─────────────────────────────────────────────────────────────────
  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const r = await fetch('/api/news');
      const d = await r.json();
      setNews(d.news || []);
    } catch (_) {}
    setNewsLoading(false);
  }, []);

  // ── Watchlist add/remove ─────────────────────────────────────────────────
  const addWatch = useCallback(async () => {
    const sym = watchInput.trim().toUpperCase();
    if (!sym) return;
    if (watchlist.find(a => a.symbol === sym)) { setWatchErr(`${sym} already in watchlist`); return; }
    setWatchAdding(true); setWatchErr("");
    try {
      const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${FINNHUB_KEY}`);
      const d = await r.json();
      if (!d?.c) { setWatchErr(`"${sym}" not found`); setWatchAdding(false); return; }
      let name = sym;
      try { const p = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${sym}&token=${FINNHUB_KEY}`); const pd = await p.json(); if (pd?.name) name = pd.name; } catch (_) {}
      const color = SWATCH_COLORS[watchlist.length % SWATCH_COLORS.length];
      setWatchlist(prev => [...prev, { symbol: sym, name, color, type: "watch" }]);
      setPrices(prev => ({ ...prev, [sym]: { cur: d.c, prev: d.pc||d.c, pct24: d.pc ? ((d.c-d.pc)/d.pc)*100 : 0 } }));
      setWatchInput("");
    } catch (_) { setWatchErr("Lookup failed — try again"); }
    setWatchAdding(false);
  }, [watchInput, watchlist]);

  const removeWatch = useCallback((sym) => setWatchlist(prev => prev.filter(a => a.symbol !== sym)), []);

  // ── Derived ──────────────────────────────────────────────────────────────
  const FILTERS = ["ALL","crypto","stock","commodity","watchlist"];
  const visible = filter === "watchlist" ? watchlist : filter === "ALL" ? portfolio : portfolio.filter(a => a.type === filter);
  const listName = filter === "watchlist" ? "watch" : "port";
  const topMovers = [...portfolio].filter(a => prices[a.symbol]).map(a => ({ ...a, pct: prices[a.symbol].pct24||0 })).sort((a,b) => Math.abs(b.pct)-Math.abs(a.pct)).slice(0,4);
  const NEWS_TABS = ["ALL","Finnhub","NewsAPI","Reddit"];
  const visNews = newsTab === "ALL" ? news : news.filter(n => {
    const s = (n.source||"").toLowerCase();
    if (newsTab === "Reddit")  return s.includes("reddit");
    if (newsTab === "Finnhub") return s.includes("finnhub");
    if (newsTab === "NewsAPI") return !s.includes("reddit") && !s.includes("finnhub");
    return true;
  });

  const T = THEMES[theme];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'IBM Plex Mono', monospace", paddingBottom: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Orbitron:wght@700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;height:3px;}::-webkit-scrollbar-track{background:${T.scrollBg};}::-webkit-scrollbar-thumb{background:${T.scrollThumb};border-radius:2px;}
        .fu{animation:fu 0.8s ease-out;}
        .fd{animation:fd 0.8s ease-out;}
        @keyframes fu{0%{background:rgba(0,232,118,0.22);}100%{background:transparent;}}
        @keyframes fd{0%{background:rgba(255,60,60,0.22);}100%{background:transparent;}}
        .card{transition:transform 0.12s;}
        .card:hover{transform:translateY(-1px);}
        .pill{cursor:pointer;transition:all 0.15s;user-select:none;}
        .pill:hover{opacity:0.75;}
        .blink{animation:bk 1.1s step-end infinite;}
        @keyframes bk{0%,100%{opacity:1}50%{opacity:0}}
        a{color:inherit;text-decoration:none;}a:hover{text-decoration:underline;}
        input:focus{outline:none;border-color:rgba(168,85,247,0.5)!important;}
      `}</style>

      {/* HEADER */}
      <div style={{ background: T.bgHeader, borderBottom: `1px solid ${T.border}`, padding: "14px 14px 10px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 17, fontWeight: 900, color: T.accent, letterSpacing: "0.04em" }}>MARKET<span style={{ color: T.accentAlt }}>INTEL</span></div>
            <div style={{ fontSize: 8, color: T.textMuted, letterSpacing: "0.18em", marginTop: 1 }}>LIVE PORTFOLIO INTELLIGENCE</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 5 }}>
              {Object.entries(THEMES).map(([key, t]) => (
                <div key={key} onClick={() => setTheme(key)} title={t.name} style={{
                  width: 14, height: 14, borderRadius: "50%", cursor: "pointer",
                  background: t.accent,
                  border: theme === key ? `2px solid ${T.text}` : "2px solid transparent",
                  transition: "border 0.15s",
                }} />
              ))}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 8, color: T.textMuted }}>LIVE</div>
              <div style={{ fontSize: 10, color: T.accentAlt }}>{lastTick ? lastTick.toLocaleTimeString() : "Loading…"} <span className="blink">▮</span></div>
            </div>
          </div>
        </div>
        {/* Mini ticker */}
        <div style={{ overflowX: "auto", marginTop: 10, paddingBottom: 2 }}>
          <div style={{ display: "flex", gap: 14, minWidth: "max-content" }}>
            {[...CRYPTO, ...STOCKS].slice(0, 12).map(a => {
              const p = prices[a.symbol];
              if (!p) return <span key={a.symbol} style={{ color: T.textMuted, fontSize: 9 }}>{a.symbol}…</span>;
              const up = p.pct24 >= 0;
              return (
                <div key={a.symbol} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ color: a.color, fontSize: 9, fontWeight: 600 }}>{a.symbol}</span>
                  <span style={{ color: T.textSub, fontSize: 9 }}>${fmt(p.cur)}</span>
                  <span style={{ color: up ? "#00E876" : "#FF4040", fontSize: 8 }}>{up?"▲":"▼"}{Math.abs(p.pct24).toFixed(2)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 12px" }}>

        {/* TOP MOVERS */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 8, color: T.textMuted, letterSpacing: "0.15em", marginBottom: 8 }}>⚡ TOP MOVERS (24H)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
            {topMovers.length > 0 ? topMovers.map(a => {
              const up = a.pct >= 0;
              return (
                <div key={a.symbol} style={{ background: T.bgCard, border: `1px solid ${up?"rgba(0,232,118,0.18)":"rgba(255,60,60,0.18)"}`, borderRadius: 7, padding: "8px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: a.color, fontWeight: 600 }}>{a.symbol}</div>
                  <div style={{ fontSize: 9, color: up?"#00E876":"#FF4040", marginTop: 3 }}>{up?"▲":"▼"}{Math.abs(a.pct).toFixed(2)}%</div>
                </div>
              );
            }) : Array.from({length:4}).map((_,i) => <div key={i} style={{ background: T.bgCard, borderRadius: 7, height: 46, border: `1px solid ${T.border}` }} />)}
          </div>
        </div>

        {/* FILTER TABS */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 10, paddingBottom: 2 }}>
          {FILTERS.map(f => {
            const isW = f === "watchlist", active = filter === f;
            return (
              <div key={f} className="pill" onClick={() => setFilter(f)} style={{
                padding: "4px 11px", borderRadius: 20, fontSize: 8, fontWeight: 600, letterSpacing: "0.1em", whiteSpace: "nowrap",
                background: active ? (isW ? "#A855F7" : T.accent) : T.bgCard,
                color: active ? "#000" : (isW ? "#A855F7" : T.textSub),
                border: `1px solid ${active ? (isW?"#A855F7":T.accent) : (isW?"rgba(168,85,247,0.3)":T.borderCard)}`,
              }}>{f === "watchlist" ? "👁 WATCHLIST" : f.toUpperCase()}</div>
            );
          })}
        </div>

        {/* CHART RANGE */}
        <div style={{ display: "flex", gap: 5, marginBottom: 10, justifyContent: "flex-end" }}>
          {["1D","7D","30D"].map(r => (
            <div key={r} className="pill" onClick={() => setChartRange(r)} style={{
              padding: "3px 10px", borderRadius: 20, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em",
              background: chartRange === r ? T.bgCard : "rgba(255,255,255,0.02)",
              color: chartRange === r ? T.text : T.textMuted,
              border: `1px solid ${chartRange === r ? T.borderCard : T.border}`,
            }}>{r}</div>
          ))}
        </div>

        {/* PRICE GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {visible.map((a, i) => (
            <AssetCard
              key={a.symbol}
              asset={a}
              price={prices[a.symbol]}
              flash={flash[a.symbol]}
              chartPoints={chartData[`${a.symbol}_${chartRange}`]}
              isWatch={a.type === "watch"}
              onRemove={removeWatch}
              theme={T}
              dragHandlers={{
                onDragStart: () => onDragStart(i, listName),
                onDragEnter: () => onDragEnter(i),
                onDragEnd,
                onDragOver: e => e.preventDefault(),
              }}
            />
          ))}
        </div>

        {/* WATCHLIST ADD */}
        {filter === "watchlist" && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 5 }}>
              <input value={watchInput} onChange={e => { setWatchInput(e.target.value.toUpperCase()); setWatchErr(""); }}
                onKeyDown={e => e.key === "Enter" && addWatch()}
                placeholder="Add ticker… e.g. TSLA" maxLength={10}
                style={{ flex: 1, background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: 7, padding: "8px 10px", color: T.text, fontSize: 11, fontFamily: "inherit", letterSpacing: "0.05em" }}
              />
              <button onClick={addWatch} disabled={watchAdding || !watchInput.trim()} style={{
                background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.35)", color: "#A855F7",
                borderRadius: 7, padding: "8px 14px", fontSize: 10, fontFamily: "inherit",
                cursor: watchAdding || !watchInput.trim() ? "not-allowed" : "pointer", fontWeight: 600,
              }}>{watchAdding ? "…" : "+ ADD"}</button>
            </div>
            {watchErr && <div style={{ fontSize: 9, color: "#FF6060" }}>⚠ {watchErr}</div>}
          </div>
        )}

        {/* NEWS */}
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 8, color: T.textMuted, letterSpacing: "0.15em" }}>◈ AI MARKET INTELLIGENCE</div>
              <div style={{ fontSize: 12, color: T.accent, marginTop: 3 }}>Live news · AI filtered for your portfolio</div>
            </div>
            <button onClick={fetchNews} disabled={newsLoading} style={{
              background: `${T.accent}18`, border: `1px solid ${T.accent}44`, color: T.accent,
              borderRadius: 6, padding: "6px 12px", fontSize: 8, cursor: newsLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit", letterSpacing: "0.1em", fontWeight: 600,
            }}>{newsLoading ? "SCANNING…" : "↻ REFRESH"}</button>
          </div>

          <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
            {NEWS_TABS.map(t => (
              <div key={t} className="pill" onClick={() => setNewsTab(t)} style={{
                padding: "3px 10px", borderRadius: 20, fontSize: 8, fontWeight: 600,
                background: newsTab===t ? `${T.accent}18` : T.bgCard,
                color: newsTab===t ? T.accent : T.textSub,
                border: `1px solid ${newsTab===t ? `${T.accent}44` : T.border}`,
              }}>{t}</div>
            ))}
          </div>

          {newsLoading && !news.length && (
            <div style={{ textAlign: "center", padding: "36px 0", color: T.textMuted, fontSize: 10 }}>
              <div style={{ color: T.accent, marginBottom: 6, letterSpacing: "0.1em" }}>◈ SCANNING LIVE SOURCES ◈</div>
              <div>Finnhub · NewsAPI · Reddit → AI filtering…</div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visNews.map((item, i) => {
              const sc = item.sentiment==="bullish" ? "#00E876" : item.sentiment==="bearish" ? "#FF4040" : "#FFB800";
              const tc = TOPIC_COLORS[item.topic] || T.textSub;
              return (
                <div key={i} style={{ background: T.bgCardAlt, border: `1px solid ${T.borderCard}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7, gap: 6, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 7, padding: "2px 7px", borderRadius: 3, fontWeight: 700, background: `${tc}18`, color: tc, border: `1px solid ${tc}33` }}>{(item.topic||"").toUpperCase().slice(0,24)}</span>
                      <span style={{ fontSize: 7, padding: "2px 7px", borderRadius: 3, fontWeight: 700, background: `${sc}14`, color: sc, border: `1px solid ${sc}33` }}>{(item.sentiment||"").toUpperCase()}</span>
                      {item.source && <span style={{ fontSize: 7, padding: "2px 7px", borderRadius: 3, background: T.bgCard, color: T.textSub, border: `1px solid ${T.border}` }}>{item.source}</span>}
                    </div>
                    {item.time && <span style={{ fontSize: 8, color: T.textMuted, whiteSpace: "nowrap" }}>{timeAgo(item.time)}</span>}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: T.text, lineHeight: 1.45, marginBottom: 7 }}>
                    {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.headline}</a> : item.headline}
                  </div>
                  <div style={{ fontSize: 10, color: T.textSub, lineHeight: 1.55, marginBottom: 9 }}>{item.summary}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {(item.assets||[]).slice(0,7).map(sym => {
                      const found = [...ALL_PORTFOLIO,...INIT_WATCHLIST].find(x => x.symbol===sym);
                      return <span key={sym} style={{ fontSize: 7, padding: "1px 6px", borderRadius: 3, fontWeight: 600, background: `${found?.color||T.accent}15`, color: found?.color||T.accent, border: `1px solid ${found?.color||T.accent}30` }}>{sym}</span>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20, padding: "10px 0", borderTop: `1px solid ${T.border}`, fontSize: 7, color: T.textMuted, textAlign: "center", letterSpacing: "0.1em" }}>
            PRICES: COINGECKO · FINNHUB &nbsp;|&nbsp; NEWS: FINNHUB · NEWSAPI · REDDIT &nbsp;|&nbsp; AI: CLAUDE SONNET
          </div>
        </div>
      </div>
    </div>
  );
}
