import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { spawn } from "child_process";
import http from "http";

const app = express();
const PORT = 3000;

// Set up simple caching
const cache = new Map();
// Set up collapsed promise map to prevent parallel thread hammering
const activeFetches = new Map<string, Promise<any>>();

// Helper to spawn python backend
let pythonProcess: any = null;
try {
  console.log("Starting Python background service (backend.py)...");
  pythonProcess = spawn("python3", ["backend.py"]);
  
  pythonProcess.stdout.on("data", (data: any) => {
    console.log(`[Python Stdout]: ${data}`);
  });
  
  pythonProcess.stderr.on("data", (data: any) => {
    console.error(`[Python Stderr]: ${data}`);
  });

  pythonProcess.on("close", (code: any) => {
    console.log(`Python process exited with code ${code}`);
  });
} catch (error) {
  console.error("Failed to spawn python process:", error);
}

// Proxies or retrieves stock data.
// In Node.js, we also implement a full fallback calculation engine so that if Python fails,
// Node.js does the math directly and gracefully. This ensures the app is bullet-proof.
async function getStockFromYahoo(ticker: string) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'max-age=0',
      'Connection': 'keep-alive'
    }
  });
  if (!response.ok) {
    throw new Error(`Yahoo Finance query2 replied with status ${response.status}`);
  }
  return await response.json();
}

async function fetchStockData(ticker: string, yahooSymbol: string) {
  // 1. Try fetching from custom Python yfinance backend first (this handles urllib/queries and fallback calculations)
  try {
    const pythonUrl = `http://127.0.0.1:5000/api/stock/${yahooSymbol}`;
    const pyResponse = await fetch(pythonUrl);
    if (pyResponse.ok) {
      const data = await pyResponse.json();
      console.log(`Success: Loaded real data from Python backend for ${ticker}`);
      return data;
    } else {
      console.warn(`Python service status ${pyResponse.status} for ${ticker}`);
    }
  } catch (err: any) {
    console.warn(`Python service not ready or failed for ${ticker}: ${err.message}. Trying direct Node fetch fallback...`);
  }

  // 2. Try fetching from Node query2 engine (fast direct request)
  try {
    const rawData = await getStockFromYahoo(yahooSymbol);
    if (rawData && rawData.chart && rawData.chart.result && rawData.chart.result.length > 0) {
      const result = rawData.chart.result[0];
      const indicators = result.indicators && result.indicators.quote && result.indicators.quote[0];
      
      if (indicators && indicators.close) {
        const validCloses = (indicators.close || []).filter((c: any) => c !== null && c !== undefined);
        const validOpens = (indicators.open || []).filter((o: any, i: number) => indicators.close && indicators.close[i] !== null && o !== null);
        const validHighs = (indicators.high || []).filter((h: any, i: number) => indicators.close && indicators.close[i] !== null && h !== null);
        const validLows = (indicators.low || []).filter((l: any, i: number) => indicators.close && indicators.close[i] !== null && l !== null);
        const validVolumes = (indicators.volume || []).filter((v: any, i: number) => indicators.close && indicators.close[i] !== null && v !== null);

        if (validCloses.length > 0) {
          const computed: any = calculateIndicators(validCloses, validOpens, validHighs, validLows, validVolumes);
          computed.history = validCloses.slice(-50);
          computed.source = "Yahoo Finance LIVE NodeEngine";
          return computed;
        }
      }
    }
  } catch (err: any) {
    console.error(`Yahoo Fetch query2 failed for ${ticker}: ${err.message}. Trying query1 fallback...`);
  }

  // 3. Try fallback to Yahoo query1 mirror server
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1y`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    });
    if (response.ok) {
      const rawData: any = await response.json();
      if (rawData && rawData.chart && rawData.chart.result && rawData.chart.result.length > 0) {
        const result = rawData.chart.result[0];
        const indicators = result.indicators && result.indicators.quote && result.indicators.quote[0];
        
        if (indicators && indicators.close) {
          const validCloses = (indicators.close || []).filter((c: any) => c !== null && c !== undefined);
          const validOpens = (indicators.open || []).filter((o: any, i: number) => indicators.close && indicators.close[i] !== null && o !== null);
          const validHighs = (indicators.high || []).filter((h: any, i: number) => indicators.close && indicators.close[i] !== null && h !== null);
          const validLows = (indicators.low || []).filter((l: any, i: number) => indicators.close && indicators.close[i] !== null && l !== null);
          const validVolumes = (indicators.volume || []).filter((v: any, i: number) => indicators.close && indicators.close[i] !== null && v !== null);

          if (validCloses.length > 0) {
            const computed: any = calculateIndicators(validCloses, validOpens, validHighs, validLows, validVolumes);
            computed.history = validCloses.slice(-50);
            computed.source = "Yahoo query1 mirror NodeEngine";
            return computed;
          }
        }
      }
    }
  } catch (err: any) {
    console.error(`Yahoo Fetch query1 mirror failed for ${ticker}: ${err.message}`);
  }

  return null;
}

function calculateIndicators(closes: number[], opens: number[], highs: number[], lows: number[], volumes: number[]) {
  const n = closes.length;
  if (n === 0) return {};

  const lastPrice = closes[n - 1];
  const lastVolume = volumes[n - 1] || 0;

  // Simple Moving Averages
  const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, n);
  const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, n);
  const ma200 = closes.slice(-200).reduce((a, b) => a + b, 0) / Math.min(200, n);

  // RSI
  let rsi = 50.0;
  if (n > 14) {
    const deltas = [];
    for (let i = 1; i < n; i++) deltas.push(closes[i] - closes[i - 1]);
    
    let gains = deltas.slice(0, 14).map(d => d > 0 ? d : 0);
    let losses = deltas.slice(0, 14).map(d => d < 0 ? -d : 0);
    
    let avgGain = gains.reduce((a, b) => a + b, 0) / 14;
    let avgLoss = losses.reduce((a, b) => a + b, 0) / 14;
    
    if (avgLoss > 0) {
      let rs = avgGain / avgLoss;
      rsi = 100 - (100 / (1 + rs));
    } else {
      rsi = avgGain > 0 ? 100 : 50;
    }
    
    for (let i = 14; i < deltas.length; i++) {
      const g = deltas[i] > 0 ? deltas[i] : 0;
      const l = deltas[i] < 0 ? -deltas[i] : 0;
      avgGain = (avgGain * 13 + g) / 14;
      avgLoss = (avgLoss * 13 + l) / 14;
      if (avgLoss > 0) {
        let rs = avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));
      } else {
        rsi = avgGain > 0 ? 100 : 50;
      }
    }
  }

  // ATR
  let atr = 0.0;
  if (n > 1) {
    const trs = [];
    for (let i = 1; i < n; i++) {
         const h = highs[i];
         const l = lows[i];
         const prevC = closes[i - 1];
         trs.push(Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC)));
    }
    atr = trs.slice(-14).reduce((a,b)=>a+b, 0) / Math.min(14, trs.length);
  }

  // Volatility
  let volatility = 0.0;
  if (n > 1) {
    const returns = [];
    for (let i = 1; i < n; i++) returns.push((closes[i] - closes[i-1]) / closes[i-1]);
    const avgReturn = returns.reduce((a,b)=>a+b,0) / returns.length;
    const variance = returns.reduce((sum, r)=> sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1);
    volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
  }

  // Pivot S/R
  let support = lastPrice * 0.95;
  let resistance = lastPrice * 1.05;
  const window = 15;
  if (n >= window * 2) {
    const pHighs: number[] = [];
    const pLows: number[] = [];
    for (let i = window; i < n - window; i++) {
      const currH = highs[i];
      const currL = lows[i];
      let isPeak = true;
      let isTrough = true;
      for (let j = i - window; j < i + window; j++) {
        if (j === i) continue;
        if (highs[j] > currH) isPeak = false;
        if (lows[j] < currL) isTrough = false;
      }
      if (isPeak) pHighs.push(currH);
      if (isTrough) pLows.push(currL);
    }
    if (pLows.length > 0) {
      const below = pLows.filter(l => l < lastPrice);
      support = below.length > 0 ? Math.max(...below) : Math.min(...pLows);
    }
    if (pHighs.length > 0) {
      const above = pHighs.filter(h => h > lastPrice);
      resistance = above.length > 0 ? Math.min(...above) : Math.max(...pHighs);
    }
  }

  // Gap Analysis
  let gapType = "No Gap";
  let gapPercent = 0.0;
  if (n > 1) {
    const prevC = closes[n - 2];
    const currO = opens[n - 1];
    const diff = currO - prevC;
    gapPercent = (diff / prevC) * 100;
    if (gapPercent > 0.1) {
      gapType = "Gap Up";
    } else if (gapPercent < -0.1) {
      gapType = "Gap Down";
      gapPercent = Math.abs(gapPercent);
    } else {
      gapPercent = 0.0;
    }
  }

  // Smart Money Flow
  let smartMoneyFlow = 50.0;
  let buyerRatio = 50.0;
  let sellerRatio = 50.0;
  if (n > 1) {
    const accumulationScores = [];
    const subCloses = closes.slice(-20);
    const subHighs = highs.slice(-20);
    const subLows = lows.slice(-20);
    const subVolumes = volumes.slice(-20);
    for (let i = 0; i < subCloses.length; i++) {
      const h = subHighs[i];
      const l = subLows[i];
      const c = subCloses[i];
      const v = subVolumes[i];
      if (h > l) {
        const mf = ((c - l) - (h - c)) / (h - l);
        accumulationScores.push(mf * v);
      }
    }
    const totalVol = subVolumes.reduce((a,b)=>a+b,0);
    if (totalVol > 0) {
      const netFlow = accumulationScores.reduce((a,b)=>a+b,0);
      const normalized = (netFlow / totalVol + 1) / 2 * 100;
      smartMoneyFlow = Math.max(0, Math.min(100, normalized));
      buyerRatio = Math.max(10, Math.min(90, smartMoneyFlow));
      sellerRatio = 100 - buyerRatio;
    }
  }

  const marketCondition = lastPrice > ma50 && ma50 > ma200 ? "Bullish" : (lastPrice < ma50 && ma50 < ma200 ? "Bearish" : "Sideways");
  const priceZone = lastPrice < ma200 * 0.95 ? "Undervalued" : (lastPrice > ma200 * 1.05 ? "Overvalued" : "Fair");

  return {
    price: lastPrice,
    open: opens[n-1],
    high: highs[n-1],
    low: lows[n-1],
    volume: lastVolume,
    ma20,
    ma50,
    ma200,
    rsi,
    atr,
    volatility,
    support,
    resistance,
    gapType,
    gapPercent,
    smartMoneyFlow,
    buyerRatio,
    sellerRatio,
    marketCondition,
    priceZone
  };
}

// REST API endpoint for retrieving stock with Node.js logic and fallback
app.get("/api/stock/:ticker", async (req, res) => {
  const ticker = req.params.ticker.trim().toUpperCase();
  console.log(`Serving API for ticker: ${ticker}`);

  // 1. Memory Cache check (30 minutes duration for superior responsive load + limit safety)
  if (cache.has(ticker)) {
    const cached = cache.get(ticker);
    if (Date.now() - cached.timestamp < 1000 * 60 * 30) {
      console.log(`Using cached entry for ${ticker}`);
      return res.json(cached.data);
    }
  }

  // Indonesian ticker automatic lookup mapping (.JK suffix required for Yahoo Finance)
  let yahooSymbol = ticker;
  const usTickers = [
    "AAPL", "MSFT", "TSLA", "NVDA", "AMZN", "META", "GOOG", "NFLX", "COIN", "INTC", 
    "PYPL", "SBUX", "QCOM", "AMAT", "MU", "TXN", "COST", "MRVL", "LRCX", "AVGO", "ADBE"
  ];
  const isFourLetters = /^[A-Z]{4}$/.test(ticker);
  const isIndo = (isFourLetters && !usTickers.includes(ticker)) || ticker === "GOTO";
  if (isIndo && !ticker.includes(".")) {
    yahooSymbol = `${ticker}.JK`;
  }

  // 2. Request Collapsing - merge concurrent parallel calls for same ticker under 1 single promise thread
  let fetchPromise = activeFetches.get(ticker);
  if (!fetchPromise) {
    console.log(`Initiating fresh live fetch promise thread for ${ticker} (symbol: ${yahooSymbol})...`);
    fetchPromise = fetchStockData(ticker, yahooSymbol);
    activeFetches.set(ticker, fetchPromise);
  } else {
    console.log(`Collapsing concurrent request for ${ticker} into existing active promise thread...`);
  }

  try {
    const data = await fetchPromise;
    activeFetches.delete(ticker); // clear lock

    if (data) {
      cache.set(ticker, { timestamp: Date.now(), data });
      return res.json(data);
    }
  } catch (err: any) {
    activeFetches.delete(ticker);
    console.error(`Collapsed fetch execution failed for ${ticker}: ${err.message}`);
  }

  // 3. Fallback only if all external servers failed (high fidelity simulated database backup)
  console.warn(`All external live pathways failed for ticker ${ticker}. Deploying simulated fallback layer...`);
  const defaultPrices: Record<string, number> = {
    "BBCA": 10500, "TLKM": 3200, "TLKM.JK": 3200, "BBRI": 4700, "BMRI": 6050, 
    "ASII": 5100, "GOTO": 65, "BBNI": 5300, "ADRO": 2800, "UNVR": 2600,
    "AAPL": 178.5, "TSLA": 176.2, "NVDA": 875.12, "MSFT": 421.9, "AMZN": 180.1,
    "GOOGL": 151.3
  };

  const basePrice = defaultPrices[ticker] || 1000 + (ticker.charCodeAt(0) * ticker.charCodeAt(ticker.length - 1)) % 5000;
  
  const closes: number[] = [];
  const opens: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  const volumes: number[] = [];
  
  let currentPrice = basePrice;
  for (let i = 0; i < 200; i++) {
    const change = (Math.random() - 0.49) * 0.03 * currentPrice;
    const prevC = currentPrice;
    currentPrice = Math.max(10, currentPrice + change);
    const o = prevC + (Math.random() - 0.5) * 0.005 * prevC;
    const h = Math.max(currentPrice, o) + Math.random() * 0.015 * currentPrice;
    const l = Math.min(currentPrice, o) - Math.random() * 0.015 * currentPrice;
    const v = Math.floor(100000 + Math.random() * 5000000);
    
    closes.push(currentPrice);
    opens.push(o);
    highs.push(h);
    lows.push(l);
    volumes.push(v);
  }

  const computed: any = calculateIndicators(closes, opens, highs, lows, volumes);
  computed.history = closes.slice(-50);
  computed.source = "Standard Technical Simulation Engine";
  
  return res.json(computed);
});

// Serve health & engine meta with proactive connection check
app.get("/api/health", async (req, res) => {
  let pythonLive = false;
  let nodeLive = false;

  // Let's test the python endpoint
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout
    const pyResponse = await fetch("http://127.0.0.1:5000/api/stock/AAPL", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (pyResponse.ok) {
      const data = await pyResponse.json();
      if (data && data.source && !data.source.includes("Simulation")) {
        pythonLive = true;
      }
    }
  } catch (e) {
    // python connection or fetch failed
  }

  // Let's test the node direct endpoint
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout
    const response = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=5d`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const raw = await response.json();
      if (raw && raw.chart && raw.chart.result) {
        nodeLive = true;
      }
    }
  } catch (e) {
    // node extraction failed
  }

  const liveHealthy = pythonLive || nodeLive;

  res.json({
    status: "ok",
    liveHealthy,
    engine: "Express Live Aggregator Proxy",
    sources: {
      pythonService: pythonLive,
      nodeDirect: nodeLive
    }
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Fullstack developer server running on http://localhost:${PORT}`);
  });
}

startServer();
