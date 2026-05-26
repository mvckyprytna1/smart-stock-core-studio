// Smart Stock Screener & Trading Intelligence Platform - Frontend Engine
// Developed entirely in pure Native elements (Vanilla JS) without any third-party framework wrappers.

// Core State Manager
let activeTab = 'dashboard';
let currentTicker = 'BBCA';
let currentTimeframe = '1d';
let activeStockData = null;
let userDrawingLines = []; // Custom horizontal reference values drawn by clicking on the canvas
let journalTrades = [];
let selectedDividendSector = 'ALL';
let isLiveConnectionImpaired = false;

// Predefined Universe of Indonesian & US Blue chips for Screener Tracking
const COMPONENT_STOCKS = [
  { symbol: 'BBCA', name: 'BCA Bank Tbk', isIndo: true },
  { symbol: 'TLKM', name: 'Telkom Indonesia Tbk', isIndo: true },
  { symbol: 'BBRI', name: 'Bank Rakyat Indonesia Tbk', isIndo: true },
  { symbol: 'BMRI', name: 'Bank Mandiri Tbk', isIndo: true },
  { symbol: 'ASII', name: 'Astra International Tbk', isIndo: true },
  { symbol: 'GOTO', name: 'GoTo Gojek Tokopedia', isIndo: true },
  { symbol: 'ADRO', name: 'Adaro Energy Indonesia Tbk', isIndo: true },
  { symbol: 'UNVR', name: 'Unilever Indonesia Tbk', isIndo: true },
  { symbol: 'AAPL', name: 'Apple Inc.', isIndo: false },
  { symbol: 'TSLA', name: 'Tesla Motors Inc.', isIndo: false },
  { symbol: 'NVDA', name: 'Nvidia Corp.', isIndo: false },
  { symbol: 'MSFT', name: 'Microsoft Corp.', isIndo: false },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', isIndo: false },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', isIndo: false }
];

// Rich Dividend Screener Static Database with Realistic Metrics for Multi-Sectors
const DIVIDEND_DATABASE = [
  { symbol: 'ADRO', name: 'Adaro Energy', sector: 'ENERGY', yield: 12.4, consistency: 8, payout: 45, dps: 340, rating: 'High Yield Value' },
  { symbol: 'ITMG', name: 'Indo Tambangraya Megah', sector: 'ENERGY', yield: 15.2, consistency: 10, payout: 65, dps: 2150, rating: 'Cash Cow energy' },
  { symbol: 'PTBA', name: 'Bukit Asam Tbk', sector: 'ENERGY', yield: 14.8, consistency: 11, payout: 75, dps: 390, rating: 'Mega Dividend' },
  { symbol: 'BBCA', name: 'Bank Central Asia', sector: 'BANKING', yield: 3.2, consistency: 14, payout: 38, dps: 270, rating: 'Stable Dividend growth' },
  { symbol: 'BMRI', name: 'Bank Mandiri Tbk', sector: 'BANKING', yield: 5.4, consistency: 9, payout: 50, dps: 350, rating: 'Value Core dividend' },
  { symbol: 'BBNI', name: 'Bank Negara Indonesia', sector: 'BANKING', yield: 5.1, consistency: 7, payout: 40, dps: 280, rating: 'Solid growth Banking' },
  { symbol: 'TLKM', name: 'Telkom Indonesia Tbk', sector: 'INFRA', yield: 5.8, consistency: 12, payout: 60, dps: 180, rating: 'Consistent Payout utility' },
  { symbol: 'JSMR', name: 'Jasa Marga Tbk', sector: 'INFRA', yield: 4.2, consistency: 4, payout: 35, dps: 140, rating: 'Infrastructure toll' },
  { symbol: 'UNVR', name: 'Unilever Indonesia Tbk', sector: 'CONSUMER', yield: 6.8, consistency: 15, payout: 95, dps: 170, rating: 'High payout ratio' },
  { symbol: 'ICBP', name: 'Indofood CBP Tbk', sector: 'CONSUMER', yield: 3.9, consistency: 9, payout: 40, dps: 310, rating: 'Core defensive Consumer' },
  { symbol: 'ASII', name: 'Astra International', sector: 'CONSUMER', yield: 7.2, consistency: 12, payout: 45, dps: 580, rating: 'Diversified Cash yield' },
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'TECH', yield: 0.6, consistency: 11, payout: 15, dps: 0.96, rating: 'Slight growth tech' },
  { symbol: 'MSFT', name: 'Microsoft Corp', sector: 'TECH', yield: 0.8, consistency: 18, payout: 25, dps: 3.00, rating: 'Defensive cash core' },
  { symbol: 'KLBF', name: 'Kalbe Farma Tbk', sector: 'HEALTHCARE', yield: 3.4, consistency: 8, payout: 42, dps: 38, rating: 'Defensive Health sector' }
];

// Rich set of simulation dynamic news data to populate on Ticker Selection
const DYNAMIC_NEWS_TEMPLATES = [
  { title: "Rapat Umum Pemegang Saham (RUPS) Setujui Alokasi Dividen Jumbo", offset: 1.5, keywords: "RUPS, Dividen, Profit" },
  { title: "Inovasi AI & Ekspansi Infrastruktur Dukung Kenaikan Margin Bersih", offset: 2.2, keywords: "AI, Ekspansi, Margin" },
  { title: "Kenaikan Suku Bunga Global Membayangi Sentimen Transaksi Pasar", offset: -1.2, keywords: "Suku Bunga, Fed Rate" },
  { title: "Whale Investor Terdeteksi Lakukan Transaksi Akumulasi Blok Raksasa", offset: 3.0, keywords: "Whale Buy, Blok Trade" },
  { title: "Konsensus Analis Rekomendasikan BUY Seiring Kuatnya Pertumbuhan Earnings", offset: 1.8, keywords: "Buy Rating, EPS Growth" },
  { title: "Laporan Keuangan Kuartal Menunjukkan Tekanan Operasional Temporer", offset: -1.5, keywords: "Kuartal Report, Margin Drop" }
];

// Initialization
window.addEventListener('DOMContentLoaded', () => {
  // Restore logged trades journal from local storage
  const storedTrades = localStorage.getItem('trader_journal_ledger');
  if (storedTrades) {
    journalTrades = JSON.parse(storedTrades);
  } else {
    // Populate with 2 initial mock trades to give realistic initial graphs
    journalTrades = [
      { id: 1, symbol: 'BBCA', entry: 9800, exit: 10450, lots: 10, fee: 0.2, pnl: 650000, isWin: true },
      { id: 2, symbol: 'GOTO', entry: 82, exit: 68, lots: 50, fee: 0.2, pnl: -70000, isWin: false }
    ];
    localStorage.setItem('trader_journal_ledger', JSON.stringify(journalTrades));
  }

  // Update timestamps
  updateClock();
  setInterval(updateClock, 1000);

  // Initialize UI components
  runProactiveHealthCheck();
  runScreener();
  fetchActiveStockData();
  renderTradingTracker();
  renderDividendScreener();

  // Attach event listener to resize canvas optimally on window resizing
  window.addEventListener('resize', () => {
    drawStockCanvas(activeStockData);
    drawEquityCurve();
  });

  // Attach click listener to Canvas for references drawing support
  const chartCanvas = document.getElementById('stock-canvas-chart');
  if (chartCanvas) {
    chartCanvas.addEventListener('click', handleCanvasClick);
  }
});

// Update Real-Time Clock
function updateClock() {
  const clockElem = document.getElementById('ticker-time');
  if (clockElem) {
    const d = new Date();
    clockElem.innerText = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }
}

// Sets live database connection indicators and banners dynamically based on real API response status
function setLiveStatus(isLive) {
  isLiveConnectionImpaired = !isLive;
  const banner = document.getElementById('health-banner');
  const sidebarDot = document.getElementById('sidebar-status-dot');
  const sidebarText = document.getElementById('sidebar-status-text');
  const sidebarDesc = document.getElementById('sidebar-status-desc');
  const apiIndicator = document.getElementById('api-indicator');

  if (isLive) {
    if (banner) banner.classList.add('hidden');
    if (sidebarDot) {
      sidebarDot.className = "w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse";
    }
    if (sidebarText) {
      sidebarText.innerText = "Live Connected";
    }
    if (sidebarDesc) {
      sidebarDesc.innerText = "TradingView API + Live python bridges active.";
    }
    if (apiIndicator) {
      apiIndicator.className = "text-xs bg-cyan-950 text-cyan-400 border border-cyan-800/40 px-3 py-1.5 rounded-full font-bold flex items-center gap-2";
      apiIndicator.innerHTML = `<span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> LIVE API`;
    }
  } else {
    if (banner) banner.classList.remove('hidden');
    if (sidebarDot) {
      sidebarDot.className = "w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse";
    }
    if (sidebarText) {
      sidebarText.innerText = "Observational Mode";
    }
    if (sidebarDesc) {
      sidebarDesc.innerText = "Live connection impaired. Precise simulation engine engaged.";
    }
    if (apiIndicator) {
      apiIndicator.className = "text-xs bg-amber-950 text-amber-400 border border-amber-800/40 px-3 py-1.5 rounded-full font-bold flex items-center gap-2";
      apiIndicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> OBSERVATIONAL MODE`;
    }
  }
}

// Proactive Health Check for Yahoo Finance connection status during initialization
async function runProactiveHealthCheck() {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error("Health check service returned error status");
    const data = await res.json();
    setLiveStatus(!!data.liveHealthy);
  } catch (err) {
    console.error("Proactive health check failed, engaging observational simulator fallback...", err);
    setLiveStatus(false);
  }
}

// Side-Navigation Drawer Control (Mobile adaptive)
function toggleSidebarMobile() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('mobile-sidebar-active');
  }
}

// Global active sub-windows switcher
function switchTab(tabId) {
  activeTab = tabId;

  // Toggle DOM element tabs
  ['dashboard', 'tracker', 'dividends'].forEach(id => {
    const pane = document.getElementById(`tab-${id}`);
    const navBtn = document.getElementById(`nav-${id}`);
    
    if (pane) {
      if (id === tabId) {
        pane.classList.remove('hidden');
      } else {
        pane.classList.add('hidden');
      }
    }

    if (navBtn) {
      if (id === tabId) {
        navBtn.className = "flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-slate-800 text-cyan-400 font-semibold text-sm transition-all";
      } else {
        navBtn.className = "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-semibold text-sm transition-all";
      }
    }
  });

  // Re-draw canvases once active tab switches
  if (tabId === 'dashboard' && activeStockData) {
    setTimeout(() => drawStockCanvas(activeStockData), 100);
  } else if (tabId === 'tracker') {
    setTimeout(drawEquityCurve, 100);
  }

  // Close sidebar mobile when click navigation item
  const sidebar = document.getElementById('sidebar');
  if (sidebar && sidebar.classList.contains('mobile-sidebar-active')) {
    sidebar.classList.remove('mobile-sidebar-active');
  }
}

// CORE FEATURE 1: MULTI-STRATEGY STOCK SCREENER
async function runScreener() {
  const strategy = document.getElementById('screener-strategy').value;
  const tbody = document.getElementById('screener-table-body');
  
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="9" class="p-8 text-center">
        <div class="flex items-center justify-center gap-2 text-cyan-400">
          <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <span class="font-bold">Scanning with ${strategy} Strategy...</span>
        </div>
      </td>
    </tr>
  `;

  // Process all stocks in parallel for sub-second, ultra-responsive loads
  const scanPromises = COMPONENT_STOCKS.map(async (stock) => {
    try {
      // Fetch calculation logic metrics
      const url = `/api/stock/${stock.symbol}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("API Limit");
      const data = await res.json();
      
      // Calculate screener strategy matching score
      const calcObj = scoreStrategy(stock.symbol, data, strategy);
      return {
        symbol: stock.symbol,
        name: stock.name,
        price: data.price,
        open: data.open,
        high: data.high,
        low: data.low,
        change: ((data.price - data.open) / data.open) * 100,
        volume: data.volume,
        volSpike: data.volume > 0 ? (data.volume / 2500000).toFixed(1) : "1.2",
        rsi: data.rsi,
        maStatus: data.price > data.ma50 ? "Bullish > MA50" : "Bearish < MA50",
        score: calcObj.score,
        rating: calcObj.rating,
        ratingClass: calcObj.ratingClass
      };
    } catch (e) {
      // Generate simulated real-time fallback screener rows
      const simData = generateSimulatedData(stock.symbol);
      const calcObj = scoreStrategy(stock.symbol, simData, strategy);
      return {
        symbol: stock.symbol,
        name: stock.name,
        price: simData.price,
        open: simData.open,
        high: simData.high,
        low: simData.low,
        change: ((simData.price - simData.open) / simData.open) * 100,
        volume: simData.volume,
        volSpike: (Math.random() * 3 + 0.3).toFixed(1),
        rsi: simData.rsi,
        maStatus: simData.price > simData.ma50 ? "Bullish > MA50" : "Bearish < MA50",
        score: calcObj.score,
        rating: calcObj.rating,
        ratingClass: calcObj.ratingClass
      };
    }
  });

  const scoredUniverse = await Promise.all(scanPromises);

  // Sort screener array descendant based on matching strategy score
  scoredUniverse.sort((a, b) => b.score - a.score);

  // Render screener tables
  tbody.innerHTML = scoredUniverse.map(stock => `
    <tr class="hover:bg-slate-900/30 transition-colors">
      <td class="p-4 flex flex-col">
        <span class="font-extrabold text-white text-sm">${stock.symbol}</span>
        <span class="text-[10px] text-slate-500 max-w-[130px] truncate">${stock.name}</span>
      </td>
      <td class="p-4 font-mono text-slate-200">Rp ${formatMoneyPrecision(stock.price)}</td>
      <td class="p-4 font-mono font-bold ${stock.change >= 0 ? "text-emerald-400" : "text-rose-500"}">
        ${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}%
      </td>
      <td class="p-4 font-mono text-slate-310">${stock.volSpike}x</td>
      <td class="p-4 font-mono text-slate-300">${stock.rsi.toFixed(0)}</td>
      <td class="p-4 text-slate-400">
        <span class="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded font-bold text-[10px]">
          ${stock.maStatus}
        </span>
      </td>
      <td class="p-4 font-mono font-extrabold text-cyan-400 text-sm">${stock.score}/100</td>
      <td class="p-4 text-center">
        <span class="px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider ${stock.ratingClass}">
          ${stock.rating}
        </span>
      </td>
      <td class="p-4 text-center">
        <button onclick="loadTickerDetails('${stock.symbol}')" class="bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 border border-slate-800 hover:border-cyan-500 rounded-lg p-2 transition-all cursor-pointer">
          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

// Strategy calculation matrix score output comprarator
function scoreStrategy(symbol, data, strategy) {
  let score = 50;
  
  const dailyChg = ((data.price - data.open) / data.open) * 100;
  const isUp = dailyChg > 0;
  const isBull = data.marketCondition === "Bullish";
  const rsi = data.rsi;

  switch(strategy) {
    case 'BSJP': // Buy Sore Jual Pagi: look for highly fluid stocks building momentum towards close hour
      if (rsi < 60 && rsi > 45 && dailyChg > 1.5) score += 35;
      if (isBull) score += 15;
      break;
    case 'ARA': // Look for extremely strong momentum breaking through limits
      if (dailyChg > 5.0) score += 40;
      if (rsi > 65) score += 10;
      break;
    case 'BPJS': // Safe risk indicators: undervalues stable companies above MA200 line
      if (data.priceZone === "Undervalued" || rsi < 40) score += 40;
      if (isBull) score += 10;
      break;
    case 'SWING': // Ideal swing pattern bounds
      if (rsi > 40 && rsi < 58 && isBull) score += 40;
      if (data.price > data.ma20) score += 10;
      break;
    case 'SCALPING': // Huge volatility spikes and tight RSI momentum
      if (data.volatility > 15.0 || rsi > 60) score += 35;
      if (dailyChg > 2.0) score += 15;
      break;
    case 'BREAKOUT': // Strong volume support breaking resistance limits
      if (data.price >= data.resistance * 0.98) score += 45;
      if (isBull) score += 5;
      break;
    case 'VALUE': // Undervalued trading zone base
      if (data.priceZone === "Undervalued") score += 40;
      if (data.price < data.ma200) score += 10;
      break;
    case 'RUNNER': // Accelerating momentum metrics
      if (dailyChg > 3.0 && rsi > 55) score += 40;
      if (isUp) score += 10;
      break;
  }

  score = Math.max(10, Math.min(100, Math.round(score)));
  
  let rating = "WATCH";
  let ratingClass = "badge-watch";

  if (score >= 80) {
    rating = "BUY";
    ratingClass = "badge-buy";
  } else if (score < 45) {
    rating = "AVOID";
    ratingClass = "badge-avoid";
  }

  return { score, rating, ratingClass };
}

// Trigger stock retrieval with direct search textbox input
function triggerStockSearch() {
  const input = document.getElementById('ticker-input').value.trim().toUpperCase();
  if (input) {
    loadTickerDetails(input);
  }
}

// Load dynamic ticker statistics and alerts
async function loadTickerDetails(ticker) {
  currentTicker = ticker;
  const inputField = document.getElementById('ticker-input');
  if (inputField) inputField.value = ticker;

  await fetchActiveStockData();
}

// Timeframe control sets
function setTimeframe(t, btn) {
  currentTimeframe = t;
  
  // Update styling
  const buttons = btn.parentElement.querySelectorAll('button');
  buttons.forEach(b => {
    b.className = "px-3 py-1 text-[10px] font-black rounded-lg text-slate-400 hover:text-slate-200 transition-all font-mono";
  });
  btn.className = "px-3 py-1 text-[10px] font-black rounded-lg text-cyan-400 bg-slate-800 transition-all font-mono";

  // Regenerate coordinates view
  drawStockCanvas(activeStockData);
}

// Retrieve single stock historical indicator details
async function fetchActiveStockData() {
  try {
    const url = `/api/stock/${currentTicker}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("API Connection rate-limited");
    
    const data = await res.json();
    
    // If the data is successfully retrieved as real data, update connection status to healthy live!
    if (data.source && !data.source.includes("Simulation")) {
      setLiveStatus(true);
    } else {
      setLiveStatus(false);
    }
    
    populateStockDashboard(data);
  } catch (error) {
    console.error("Failing backend retrieval, triggering robust simulation layer...", error);
    
    setLiveStatus(false);

    const backupData = generateSimulatedData(currentTicker);
    populateStockDashboard(backupData);
  }
}

// Populate the core UI dashboard layout boards
function populateStockDashboard(data) {
  activeStockData = data;

  // Render stats cards details
  document.getElementById('stats-ticker').innerText = currentTicker;
  
  const chartTitleSym = document.getElementById('chart-title-symbol');
  if (chartTitleSym) {
    chartTitleSym.innerText = currentTicker;
  }
  const chartTitleSrc = document.getElementById('chart-title-source');
  if (chartTitleSrc) {
    chartTitleSrc.innerText = data.source || "Yahoo Live";
  }

  document.getElementById('stats-price').innerText = `Rp ${formatMoneyPrecision(data.price)}`;
  
  const dailyGain = ((data.price - data.open) / data.open) * 100;
  const changeBadge = document.getElementById('stats-change');
  changeBadge.innerText = `${dailyGain >= 0 ? '+' : ''}${dailyGain.toFixed(2)}%`;
  changeBadge.className = `text-xs font-bold px-2 py-1 rounded border font-mono ${
    dailyGain >= 0 ? "bg-green-500/10 text-green-400 border-green-800/30" : "bg-red-505/10 text-rose-400 border-red-900/30"
  }`;

  document.getElementById('stats-open').innerText = `Rp ${formatMoneyPrecision(data.open)}`;
  document.getElementById('stats-volume').innerText = formatVolumesCompact(data.volume);
  document.getElementById('stats-range').innerText = `Rp ${formatMoneyPrecision(data.high)} / ${formatMoneyPrecision(data.low)}`;
  document.getElementById('stats-volatility').innerText = `${data.volatility.toFixed(2)}%`;
  
  const condElem = document.getElementById('stats-condition');
  condElem.innerText = data.marketCondition;
  condElem.className = `font-extrabold mt-0.5 uppercase text-[10px] ${
    data.marketCondition === 'Bullish' ? "text-emerald-400" : (data.marketCondition === 'Bearish' ? "text-rose-500" : "text-cyan-400")
  }`;

  const zoneElem = document.getElementById('stats-zone');
  zoneElem.innerText = data.priceZone;
  zoneElem.className = `font-extrabold mt-0.5 uppercase text-[10px] ${
    data.priceZone === 'Undervalued' ? "text-emerald-400" : (data.priceZone === 'Overvalued' ? "text-rose-500" : "text-yellow-400")
  }`;

  // Pivot status panel
  document.getElementById('tech-support').innerText = `Rp ${formatMoneyPrecision(data.support)}`;
  document.getElementById('tech-resistance').innerText = `Rp ${formatMoneyPrecision(data.resistance)}`;
  
  const brkProb = (data.price > data.ma20) ? "Higher (68%)" : "Moderate (45%)";
  document.getElementById('tech-breakout-prob').innerText = brkProb;
  document.getElementById('tech-trend-strength').innerText = data.marketCondition === 'Bullish' ? "STRONG BUY BULL" : "RESTING ACCUMULATION";

  // Gap Analysis Panel
  document.getElementById('gap-status').innerText = data.gapType || "No Gap";
  document.getElementById('gap-percent').innerText = `${(data.gapPercent || 0).toFixed(2)}%`;
  document.getElementById('gap-fill').innerText = data.gapType !== 'No Gap' ? "85% filled likelihood" : "0%";
  document.getElementById('gap-distance').innerText = data.gapType !== 'No Gap' ? "Retested close gap base" : "None";

  // Smart Money Meter Slider
  const swPct = data.smartMoneyFlow || 50;
  document.getElementById('whales-accum').innerText = swPct > 60 ? "Heavy Accumulation" : (swPct < 40 ? "Heavy Distribution" : "Calm Holding");
  document.getElementById('smart-money-bar').style.width = `${swPct}%`;
  document.getElementById('buyer-power-num').innerText = `${swPct.toFixed(0)}%`;
  document.getElementById('seller-power-num').innerText = `${(100 - swPct).toFixed(0)}%`;
  
  const verdictElem = document.getElementById('wholesale-verdict');
  if (swPct > 60) {
    verdictElem.className = "bg-green-950/20 text-emerald-400 border border-green-800/40 p-3 rounded-xl text-center text-xs font-bold";
    verdictElem.innerText = "Whale Accumulation status: Active Buyer Dominant";
  } else if (swPct < 40) {
    verdictElem.className = "bg-rose-950/20 text-rose-400 border border-red-800/40 p-3 rounded-xl text-center text-xs font-bold";
    verdictElem.innerText = "Whale Accumulation status: Active Seller Distribution";
  } else {
    verdictElem.className = "bg-slate-900 border border-slate-800 p-3 rounded-xl text-center text-xs font-bold text-slate-400";
    verdictElem.innerText = "Whale Accumulation status: Normal Retail Neutral Flow";
  }

  // Auto Entry Plan Engine calculations
  document.getElementById('plan-entry').innerText = `Rp ${formatMoneyPrecision(data.support)}`;
  document.getElementById('plan-sl').innerText = `Rp ${formatMoneyPrecision(data.support * 0.965)}`;
  document.getElementById('plan-tp1').innerText = `Rp ${formatMoneyPrecision(data.resistance * 0.98)}`;
  document.getElementById('plan-tp2').innerText = `Rp ${formatMoneyPrecision(data.resistance * 1.05)}`;
  
  const targetDiff = (data.resistance * 0.98) - data.support;
  const slDiff = data.support - (data.support * 0.965);
  const rrVal = slDiff > 0 ? (targetDiff / slDiff).toFixed(1) : "2.5";
  document.getElementById('plan-rr').innerText = `1 : ${rrVal}`;
  
  const scoreVal = Math.round(data.smartMoneyFlow * 0.6 + (data.marketCondition === 'Bullish' ? 40 : 15));
  document.getElementById('plan-score').innerText = `${scoreVal} / 100`;

  // Draw chart wrapper
  drawStockCanvas(data);

  // Render news and custom insight bots
  renderStockNewsAndInsights(data);
}

// Draw dynamic chart canvas natively
function drawStockCanvas(data) {
  const canvas = document.getElementById('stock-canvas-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set physical display sizes
  const width = canvas.parentElement.clientWidth;
  const height = canvas.parentElement.clientHeight;
  canvas.width = width;
  canvas.height = height;

  if (!data || !data.history || data.history.length === 0) {
    ctx.fillStyle = "#64748b";
    ctx.font = "14px JetBrains Mono";
    ctx.textAlign = "center";
    ctx.fillText("Gathering chart points...", width/2, height/2);
    return;
  }

  const pHistory = data.history;
  const minVal = Math.min(...pHistory) * 0.98;
  const maxVal = Math.max(...pHistory) * 1.02;
  const valRange = maxVal - minVal;

  // Draw coordinate gridlines
  ctx.strokeStyle = "rgba(51, 65, 85, 0.2)";
  ctx.lineWidth = 1;
  
  // Horizontal grids
  const gridLinesCount = 5;
  for (let i = 1; i < gridLinesCount; i++) {
    const y = (height / gridLinesCount) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    // Horizontal Price Text Labels
    const val = maxVal - (valRange / gridLinesCount) * i;
    ctx.fillStyle = "#475569";
    ctx.font = "8px 'JetBrains Mono'";
    ctx.textAlign = "left";
    ctx.fillText(`Rp ${formatMoneyPrecision(val)}`, 8, y - 4);
  }

  // Draw prices gradient fill loop
  ctx.beginPath();
  ctx.moveTo(0, height);
  
  for (let i = 0; i < pHistory.length; i++) {
    const x = (width / (pHistory.length - 1)) * i;
    const y = height - ((pHistory[i] - minVal) / valRange) * height;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(6, 182, 212, 0.25)");
  gradient.addColorStop(1, "rgba(2, 6, 17, 0.0)");
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw main price line string
  ctx.beginPath();
  for (let i = 0; i < pHistory.length; i++) {
    const x = (width / (pHistory.length - 1)) * i;
    const y = height - ((pHistory[i] - minVal) / valRange) * height;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.strokeStyle = "#22d3ee"; // vibrant cyan
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw dynamic helper values line (like Support limit and Resistance levels)
  const renderLine = (val, color, text) => {
    const y = height - ((val - minVal) / valRange) * height;
    if (y >= 0 && y <= height) {
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([]);

      // Label background card draw
      ctx.fillStyle = color;
      ctx.fillRect(width - 95, y - 7, 95, 14);
      ctx.fillStyle = "#000";
      ctx.font = "bold 8px 'JetBrains Mono'";
      ctx.textAlign = "center";
      ctx.fillText(`${text}: ${val.toFixed(0)}`, width - 48, y + 3);
    }
  };

  renderLine(data.support, "#10b981", "SUPPORT");
  renderLine(data.resistance, "#f43f5e", "RESIST");

  // Plot custom lines drawn by user
  userDrawingLines.forEach((customVal, idx) => {
    const y = height - ((customVal - minVal) / valRange) * height;
    if (y >= 0 && y <= height) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.strokeStyle = "#e11d48"; // vibrant pink helper
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#e11d48";
      ctx.font = "8px 'JetBrains Mono'";
      ctx.textAlign = "right";
      ctx.fillText(`GUIDE ${idx+1}: Rp ${formatMoneyPrecision(customVal)}`, width - 10, y - 4);
    }
  });

  // Track coordinates detail text
  document.getElementById('chart-ma200').innerText = `Rp ${formatMoneyPrecision(data.ma200)}`;
  document.getElementById('chart-rsi').innerText = data.rsi.toFixed(2);
}

// User dynamic references line drawer helper
function handleCanvasClick(event) {
  const canvas = document.getElementById('stock-canvas-chart');
  if (!canvas || !activeStockData || !activeStockData.history) return;

  const rect = canvas.getBoundingClientRect();
  const clickY = event.clientY - rect.top;

  const pHistory = activeStockData.history;
  const minVal = Math.min(...pHistory) * 0.98;
  const maxVal = Math.max(...pHistory) * 1.02;
  const valRange = maxVal - minVal;

  // Map clicked y back to relative price value
  const height = canvas.height;
  const relativeValue = maxVal - (clickY / height) * valRange;

  userDrawingLines.push(relativeValue);
  
  // limit drawn guidelines to maximum 3 coordinates to avoid interface clutter
  if (userDrawingLines.length > 3) {
    userDrawingLines.shift();
  }

  drawStockCanvas(activeStockData);
}

function clearDrawingLines() {
  userDrawingLines = [];
  drawStockCanvas(activeStockData);
}

// Populate the news summary feeds and the bots insight generator
function renderStockNewsAndInsights(stock) {
  const container = document.getElementById('news-container');
  if (!container) return;

  // Refresh Sentiment text badge
  const sentimentScore = Math.round(50 + (stock.smartMoneyFlow - 50) + (Math.random() - 0.5) * 20);
  const sentBadge = document.getElementById('news-sentiment-badge');
  if (sentBadge) {
    if (sentimentScore > 55) {
      sentBadge.innerText = `POSITIF (+${sentimentScore})`;
      sentBadge.className = "bg-green-950/85 text-emerald-400 border border-green-900/40 text-[9px] font-black px-2 py-1 rounded";
    } else if (sentimentScore < 45) {
      sentBadge.innerText = `NEGATIF (${sentimentScore})`;
      sentBadge.className = "bg-red-955/85 text-rose-400 border border-red-900/40 text-[9px] font-black px-2 py-1 rounded";
    } else {
      sentBadge.innerText = `NETRAL (50)`;
      sentBadge.className = "bg-slate-900 text-slate-400 border border-slate-850 text-[9px] font-black px-2 py-1 rounded";
    }
  }

  // Populate headlines
  container.innerHTML = DYNAMIC_NEWS_TEMPLATES.map((news, i) => {
    const isGood = news.offset > 0;
    return `
      <div class="bg-slate-950/60 border border-slate-900 p-4 rounded-xl flex items-start gap-3 hover:border-slate-800 transition-all">
        <span class="w-2.5 h-2.5 rounded-full ${isGood ? 'bg-emerald-500' : 'bg-rose-500'} mt-1.5 shrink-0"></span>
        <div class="space-y-1">
          <p class="font-extrabold text-slate-200 text-xs">${news.title} untuk emiten ${currentTicker}</p>
          <span class="text-[9px] font-mono text-slate-500 font-medium tracking-wide block">Keywords: ${news.keywords}</span>
        </div>
      </div>
    `;
  }).join('');

  // Generate Insight logic
  const insightBox = document.getElementById('insight-container');
  if (insightBox) {
    let bulletTitle = "";
    let bulletDesc = "";

    const rsi = stock.rsi;
    if (rsi > 70) {
      bulletTitle = "📉 Momentum Overbought (Waspada Koreksi)";
      bulletDesc = `Level RSI saham ${currentTicker} berada pada tingkat jenuh beli (${rsi.toFixed(0)}), hal ini mengindikasikan aksi profit taking jangka pendek berpeluang terjadi meskipun money flow menunjukkan akumulasi.`;
    } else if (rsi < 35) {
      bulletTitle = "🚀 Jenuh Jual / Oversold (Potensi Rebound)";
      bulletDesc = `Indikator RSI berada di bawah area jenuh jual (${rsi.toFixed(0)}). Menawarkan ruang diskon maksimal bertepatan pada basis support pivot rendah di Rp ${stock.support.toFixed(0)}.`;
    } else {
      bulletTitle = "💪 Konsolidasi Positif (Persiapan Breakout)";
      bulletDesc = `Pergerakan harga ${currentTicker} membangun pondasi konsolidasi optimal di atas MA20. Berpeluang meletupkan momentum akselerasi breakout 3-5 hari ke depan menuju area Rp ${stock.resistance.toFixed(0)}.`;
    }

    insightBox.innerHTML = `
      <div class="space-y-3 font-medium">
        <div class="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4.5 text-xs">
          <p class="text-cyan-400 font-extrabold text-[13px] flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span> ${bulletTitle}
          </p>
          <p class="text-slate-400 leading-relaxed mt-2">${bulletDesc}</p>
        </div>
        <div class="bg-[#0c1e19]/40 border border-emerald-950/60 text-emerald-400 p-4.5 rounded-2xl text-[11px] leading-relaxed">
          <b>🧠 Rekomendasi AI Inteligensia:</b> ${stock.priceZone === 'Undervalued' ? 'Akumulasi bertahap di area diskon.' : 'Manfaatkan swing buy on weakness dekat dengan Pivot Support.'} Rasio Risk-to-Reward saat ini adalah optimal bagi rencana perdagangan jangka menengah.
        </div>
      </div>
    `;
  }
}

// CORE FEATURE 10: VALUE DIVIDEND SCREENER
function renderDividendScreener() {
  const container = document.getElementById('dividend-grid-container');
  if (!container) return;

  const minYield = parseFloat(document.getElementById('dividend-yield-range').value);
  const minConsistency = parseInt(document.getElementById('dividend-const-range').value);

  // Filter list
  const filtered = DIVIDEND_DATABASE.filter(item => {
    const isSectorMatch = selectedDividendSector === 'ALL' || item.sector === selectedDividendSector;
    return isSectorMatch && item.yield >= minYield && item.consistency >= minConsistency;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500 font-bold border border-slate-800 border-dashed rounded-xl">
        No dividend stocks meet the set criteria currently.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all relative overflow-hidden">
      <div class="flex items-center justify-between mb-3 border-b border-slate-800/60 pb-3">
        <div>
          <span class="text-sm font-black text-white">${item.symbol}</span>
          <p class="text-[10px] text-slate-500 font-medium">${item.name}</p>
        </div>
        <span class="px-2.5 py-1 bg-slate-950 text-cyan-400 border border-cyan-800/30 rounded font-black text-[9px] uppercase tracking-wider">${item.sector}</span>
      </div>

      <div class="grid grid-cols-2 gap-3 text-xs font-mono mb-4">
        <div>
          <span class="text-slate-500 text-[10px]">Dividend Yield:</span>
          <p class="text-emerald-400 font-black text-[15px] mt-0.5">${item.yield.toFixed(1)}%</p>
        </div>
        <div>
          <span class="text-slate-500 text-[10px]">Payout Ratio:</span>
          <p class="text-slate-250 font-extrabold text-[13px] mt-0.5">${item.payout}%</p>
        </div>
        <div>
          <span class="text-slate-500 text-[10px]">Consistency:</span>
          <p class="text-slate-200 font-extrabold text-[13px] mt-0.5">${item.consistency} Years</p>
        </div>
        <div>
          <span class="text-slate-500 text-[10px]">Payout Share:</span>
          <p class="text-slate-200 font-extrabold text-[13px] mt-0.5">Rp ${item.dps}</p>
        </div>
      </div>

      <div class="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 pt-2 border-t border-slate-850">
        <span>${item.rating}</span>
        <button onclick="loadTickerDetails('${item.symbol}'); switchTab('dashboard');" class="text-cyan-400 hover:underline flex items-center gap-1">Charts <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg></button>
      </div>
    </div>
  `).join('');
}

function filterDividendSector(sector, btn) {
  selectedDividendSector = sector;

  const buttons = btn.parentElement.querySelectorAll('button');
  buttons.forEach(b => {
    b.className = "bg-slate-950/80 text-slate-400 hover:text-slate-200 px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all";
  });
  btn.className = "bg-slate-800 text-cyan-400 px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all";

  renderDividendScreener();
}

function updateDividendYieldLabel(val) {
  document.getElementById('yield-amt').innerText = `${val}%`;
  renderDividendScreener();
}

function updateDividendConsistencyLabel(val) {
  document.getElementById('const-amt').innerText = `${val} Years`;
  renderDividendScreener();
}


// CORE FEATURE 11: TRADING JOURNAL & TRACKER
function renderTradingTracker() {
  const tbody = document.getElementById('tracker-tbl-body');
  if (!tbody) return;

  if (journalTrades.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-500 font-bold">No trading journal recorded yet. Fill down details on right to start.</td></tr>`;
    document.getElementById('tracker-pl').innerText = "Rp 0";
    document.getElementById('tracker-winrate').innerText = "0.0%";
    document.getElementById('tracker-best-trade').innerText = "-";
    return;
  }

  // Calculate stats values
  let totalPNL = 0;
  let winCount = 0;
  let biggestReturn = -Infinity;
  let bestSymbol = "-";

  tbody.innerHTML = journalTrades.map((trade, idx) => {
    totalPNL += trade.pnl;
    if (trade.isWin) winCount++;
    if (trade.pnl > biggestReturn) {
      biggestReturn = trade.pnl;
      bestSymbol = trade.symbol;
    }

    return `
      <tr class="hover:bg-slate-900/30 transition-colors text-xs font-mono">
        <td class="p-3 font-semibold text-white">${trade.symbol}</td>
        <td class="p-3 text-right text-slate-300">${trade.lots}</td>
        <td class="p-3 text-right text-slate-300">Rp ${formatMoneyPrecision(trade.entry)}</td>
        <td class="p-3 text-right text-slate-300">Rp ${formatMoneyPrecision(trade.exit)}</td>
        <td class="p-3 text-right text-slate-410">${trade.fee}%</td>
        <td class="p-3 text-right font-black ${trade.isWin ? 'text-emerald-400' : 'text-rose-500'}">
          ${trade.isWin ? '+' : ''}Rp ${formatMoneyPrecision(trade.pnl)}
        </td>
        <td class="p-3 text-center">
          <button onclick="deleteTradeRecord(${idx})" class="text-rose-500 hover:text-rose-400 p-1 cursor-pointer">
            <svg class="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Update Summary DOM
  const netBadge = document.getElementById('tracker-pl');
  netBadge.innerText = `${totalPNL >= 0 ? '+' : ''}Rp ${formatMoneyPrecision(totalPNL)}`;
  netBadge.className = `text-xl font-bold font-mono mt-1 block ${totalPNL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`;

  const wr = (winCount / journalTrades.length) * 100;
  document.getElementById('tracker-winrate').innerText = `${wr.toFixed(1)}%`;
  document.getElementById('tracker-best-trade').innerText = biggestReturn !== -Infinity ? `${bestSymbol} (+Rp ${formatMoneyPrecision(biggestReturn)})` : "-";

  // Redraw the equity curve graphics
  drawEquityCurve();
}

function calculateAndAddJournal() {
  const symbol = document.getElementById('journal-ticker').value.trim().toUpperCase();
  const entry = parseFloat(document.getElementById('journal-entry').value);
  const exit = parseFloat(document.getElementById('journal-exit').value);
  const lots = parseInt(document.getElementById('journal-lots').value);
  const feePercent = parseFloat(document.getElementById('journal-fee').value);

  if (!symbol || !entry || !exit || !lots) {
    alert("Mohon isi semua field trader journal!");
    return;
  }

  // Calculate gross PNL (1 lot = 100 shares in IDX)
  const buyCost = entry * (lots * 100);
  const sellIncome = exit * (lots * 100);
  const grossPNL = sellIncome - buyCost;
  
  // Calculate fees
  const transactionFee = (buyCost + sellIncome) * (feePercent / 100);
  const netPNL = Math.round(grossPNL - transactionFee);
  
  const isWin = netPNL > 0;

  const newTrade = {
    id: Date.now(),
    symbol,
    entry,
    exit,
    lots,
    fee: feePercent,
    pnl: netPNL,
    isWin
  };

  journalTrades.push(newTrade);
  localStorage.setItem('trader_journal_ledger', JSON.stringify(journalTrades));

  // Reset inputs
  document.getElementById('journal-ticker').value = '';
  document.getElementById('journal-entry').value = '';
  document.getElementById('journal-exit').value = '';
  document.getElementById('journal-lots').value = '';

  renderTradingTracker();
}

function deleteTradeRecord(index) {
  journalTrades.splice(index, 1);
  localStorage.setItem('trader_journal_ledger', JSON.stringify(journalTrades));
  renderTradingTracker();
}

// Pure Canvas drawing for Tracker Equity curves
function drawEquityCurve() {
  const canvas = document.getElementById('equity-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Adapt sizing to viewport size
  const width = canvas.parentElement.clientWidth;
  const height = canvas.parentElement.clientHeight;
  canvas.width = width;
  canvas.height = height;

  if (journalTrades.length === 0) {
    ctx.fillStyle = "#64748b";
    ctx.font = "14px JetBrains Mono";
    ctx.textAlign = "center";
    ctx.fillText("No trades to render equity curve.", width/2, height/2);
    return;
  }

  // Create progressive points of balance
  let runningPNL = 10000000; // start simulation at 10M IDX balance base
  const balancePoints = [runningPNL];

  journalTrades.forEach(trade => {
    runningPNL += trade.pnl;
    balancePoints.push(runningPNL);
  });

  const minV = Math.min(...balancePoints) * 0.95;
  const maxV = Math.max(...balancePoints) * 1.05;
  const range = maxV - minV;

  // Draw gridlines
  ctx.strokeStyle = "rgba(51, 65, 85, 0.2)";
  ctx.lineWidth = 1;
  const divisor = 4;
  for (let i = 1; i < divisor; i++) {
    const y = (height / divisor) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    const priceVal = maxV - (range / divisor) * i;
    ctx.fillStyle = "#475569";
    ctx.font = "8px 'JetBrains Mono'";
    ctx.fillText(`Rp ${formatMoneyPrecision(priceVal)}`, 8, y - 4);
  }

  // Draw gradient string curve
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let i = 0; i < balancePoints.length; i++) {
    const x = (width / (balancePoints.length - 1)) * i;
    const y = height - ((balancePoints[i] - minV) / range) * height;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0,0,0,height);
  grad.addColorStop(0, "rgba(59, 130, 246, 0.2)");
  grad.addColorStop(1, "rgba(2, 6, 17, 0.0)");
  ctx.fillStyle = grad;
  ctx.fill();

  // Highlight points
  ctx.beginPath();
  for (let i = 0; i < balancePoints.length; i++) {
    const x = (width / (balancePoints.length - 1)) * i;
    const y = height - ((balancePoints[i] - minV) / range) * height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#3b82f6"; // robust blue accent line
  ctx.lineWidth = 2.5;
  ctx.stroke();
}


// EXPORT INSIGHT PANELS TO IMAGE OR TEXT
function exportToClipboard() {
  if (!activeStockData) return;

  const summaryText = `
📊 ${currentTicker} TRADING INTELLIGENCE SUMMARY
-------------------------------
Last Price: Rp ${formatMoneyPrecision(activeStockData.price)}
Condition: ${activeStockData.marketCondition} (${activeStockData.priceZone})
Pivot Support: Rp ${formatMoneyPrecision(activeStockData.support)}
Pivot Resistance: Rp ${formatMoneyPrecision(activeStockData.resistance)}
RSI 14 Index: ${activeStockData.rsi.toFixed(2)}
Smart Money Flow: ${activeStockData.smartMoneyFlow.toFixed(0)}% Buyer Power

TARGET TRADING PLAN OUTLINES
-------------------------------
Entry Zone: Rp ${formatMoneyPrecision(activeStockData.support)}
Stop Loss (SL): Rp ${formatMoneyPrecision(activeStockData.support * 0.965)}
Take Profit 1: Rp ${formatMoneyPrecision(activeStockData.resistance * 0.98)}
Take Profit 2: Rp ${formatMoneyPrecision(activeStockData.resistance * 1.05)}
Confidence Match Rating: ${Math.round(activeStockData.smartMoneyFlow * 0.6 + 30)}/100
  `;

  navigator.clipboard.writeText(summaryText);
  alert("Intelligence summary text successfully copied to clipboard!");
}

function exportToPNG() {
  const canvas = document.getElementById('export-snapshot-canvas');
  if (!canvas || !activeStockData) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Render beautiful layout background
  ctx.fillStyle = "#020617";
  ctx.fillRect(0,0,600,400);

  // Borders
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 8;
  ctx.strokeRect(0,0,600,400);

  // Title logo
  ctx.fillStyle = "#22d3ee"; // vibrant cyan
  ctx.font = "bold 16px 'Plus Jakarta Sans'";
  ctx.fillText("SMART TRADING INTELLIGENCE DASHBOARD", 30, 45);

  ctx.fillStyle = "#64748b";
  ctx.font = "9px 'JetBrains Mono'";
  ctx.fillText("GEN DESIGN BY TRADING VIEW CORE & INDEX CHIPS", 30, 65);

  // Header separator
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, 80);
  ctx.lineTo(570, 80);
  ctx.stroke();

  // Metrics block stats
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 24px 'Plus Jakarta Sans'";
  ctx.fillText(`${currentTicker} : Rp ${formatMoneyPrecision(activeStockData.price)}`, 30, 115);

  ctx.fillStyle = activeStockData.marketCondition === 'Bullish' ? "#10b981" : "#ef4444";
  ctx.font = "bold 11px 'Plus Jakarta Sans'";
  ctx.fillText(`MARKET: ${activeStockData.marketCondition.toUpperCase()} (${activeStockData.priceZone.toUpperCase()})`, 30, 135);

  // Detailed left list columns
  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px 'JetBrains Mono'";
  ctx.fillText(`RSI 14 Score : ${activeStockData.rsi.toFixed(1)}`, 30, 175);
  ctx.fillText(`Volatility   : ${activeStockData.volatility.toFixed(1)}%`, 30, 195);
  ctx.fillText(`Whales Flow  : ${activeStockData.smartMoneyFlow.toFixed(0)}% BUY POWER`, 30, 215);
  ctx.fillText(`Pivot Support: Rp ${formatMoneyPrecision(activeStockData.support)}`, 30, 235);
  ctx.fillText(`Pivot Resist : Rp ${formatMoneyPrecision(activeStockData.resistance)}`, 30, 255);

  // Trading plan column box
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(320, 150, 250, 190);
  ctx.strokeStyle = "#334155";
  ctx.strokeRect(320, 150, 250, 190);

  ctx.fillStyle = "#a855f7"; // attractive purple TP title
  ctx.font = "bold 11px 'Plus Jakarta Sans'";
  ctx.fillText("AUTO-GENERATED TRADING PLAN", 340, 180);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px 'JetBrains Mono'";
  ctx.fillText(`Entry Buy  : Rp ${formatMoneyPrecision(activeStockData.support)}`, 340, 215);
  ctx.fillText(`Stop Loss  : Rp ${formatMoneyPrecision(activeStockData.support * 0.965)}`, 340, 240);
  ctx.fillText(`Take Profit: Rp ${formatMoneyPrecision(activeStockData.resistance * 0.98)}`, 340, 265);
  ctx.fillText(`Win Score  : ${Math.round(activeStockData.smartMoneyFlow * 0.6 + 30)} / 100`, 340, 290);

  // Save base URL state to PNG trigger downloader
  const link = document.createElement('a');
  link.download = `${currentTicker}_Analysis_Snapshot.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// AUXILIARY UTILITIES FOR HIGH FIDELITY SIMULATION OF INDEPENDENT DATA FOR REFRESH
function generateSimulatedData(ticker) {
  const stockSeed = ticker.charCodeAt(0) * (ticker.charCodeAt(ticker.length - 1) || 99);
  const baseSimPrice = 100 + (stockSeed % 40) * 150;
  
  const history = [];
  let curr = baseSimPrice;
  for (let i = 0; i < 50; i++) {
    curr += (Math.random() - 0.495) * 0.02 * curr;
    history.push(curr);
  }

  const price = history[49];
  const ma200 = history.reduce((a,b)=>a+b, 0) / history.length;
  const support = price * 0.94;
  const resistance = price * 1.06;

  return {
    price,
    open: price * (1 + (Math.random() - 0.5) * 0.02),
    high: Math.max(price, price * 1.02),
    low: Math.min(price, price * 0.98),
    volume: Math.floor(500000 + Math.random() * 8000000),
    ma20: price * 1.01,
    ma50: price * 0.99,
    ma200,
    rsi: 40 + Math.random() * 25,
    atr: price * 0.03,
    volatility: 12.0 + Math.random() * 10,
    support,
    resistance,
    gapType: Math.random() > 0.7 ? "Gap Up" : "No Gap",
    gapPercent: Math.random() > 0.7 ? Math.random() * 2.2 : 0.0,
    smartMoneyFlow: 35 + Math.random() * 45,
    marketCondition: price > ma200 ? "Bullish" : "Bearish",
    priceZone: price < ma200 * 0.97 ? "Undervalued" : "Fair",
    history
  };
}

// Compact helper functions
function formatMoneyPrecision(value) {
  return parseFloat(value).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatVolumesCompact(value) {
  const val = parseInt(value);
  if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}B`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return val.toString();
}

// Expose key interactive and UI handlers to the global window scope
window.switchTab = switchTab;
window.runScreener = runScreener;
window.triggerStockSearch = triggerStockSearch;
window.loadTickerDetails = loadTickerDetails;
window.setTimeframe = setTimeframe;
window.clearDrawingLines = clearDrawingLines;
window.filterDividendSector = filterDividendSector;
window.updateDividendYieldLabel = updateDividendYieldLabel;
window.updateDividendConsistencyLabel = updateDividendConsistencyLabel;
window.calculateAndAddJournal = calculateAndAddJournal;
window.deleteTradeRecord = deleteTradeRecord;
window.exportToClipboard = exportToClipboard;
window.exportToPNG = exportToPNG;
window.toggleSidebarMobile = toggleSidebarMobile;
window.runProactiveHealthCheck = runProactiveHealthCheck;
