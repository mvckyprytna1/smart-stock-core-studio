import json
import math
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, HTTPServer
import sys
import subprocess

# Smart Stock Screener & Trading Intelligence Python Backend
# Built using Python Standard Library list plus programmatic pip additions.
# Dynamically installs pandas and yfinance packages for real-time live Yahoo Finance API.

PORT = 5000

# Automated background setup for required libraries (pandas, yfinance, requests)
# To enable sub-second startup, we first check if these are already importable.
NEED_INSTALL = False
try:
    import pandas
    import yfinance
    import requests
except ImportError:
    NEED_INSTALL = True

# Check if pip is available before spawning a subprocess that would fail with stderr noise
has_pip = False
try:
    import pip
    has_pip = True
except ImportError:
    pass

if NEED_INSTALL and has_pip:
    for pkg in ["pandas", "yfinance", "requests"]:
        print(f"Guaranteeing latest version of '{pkg}' is installed...", flush=True)
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", pkg, "--quiet"])
            print(f"Successfully guaranteed latest {pkg}!", flush=True)
        except Exception as e:
            print(f"Failed to upgrade package {pkg} (non-blocking fallback): {e}", flush=True)
elif NEED_INSTALL and not has_pip:
    print("Python installer (pip) is not present on the system. Core fallback engine (urllib) will run.", flush=True)

# Main imports setup
try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    yf = None
    YFINANCE_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive'
    })
except ImportError:
    requests = None
    REQUESTS_AVAILABLE = False
    session = None

if YFINANCE_AVAILABLE:
    print("SUCCESS: yfinance package loaded and ready for production data telemetry!", flush=True)
else:
    # Silent standard loading
    pass

def fetch_data_with_yfinance(ticker):
    """
    Fetches real-time / historical ticker data safely using the official Python yfinance package.
    Robustly handles all cookies, headers, and crumb keys under the hood.
    """
    if not YFINANCE_AVAILABLE:
        return None
    try:
        print(f"Fetching real market history for '{ticker}' using yfinance...", flush=True)
        # We start with the default yf.Ticker() so yfinance's advanced crumb extraction runs on its own session first.
        ticker_obj = yf.Ticker(ticker)
        df = ticker_obj.history(period="1y")
        
        # If the default session failed or returned empty, we try our custom requests session session as a backup.
        if df.empty and 'session' in globals() and session is not None:
            print(f"yfinance returned empty, trying with custom session for: {ticker}", flush=True)
            ticker_obj = yf.Ticker(ticker, session=session)
            df = ticker_obj.history(period="1y")
            
        if df.empty:
            print(f"yfinance returned empty dataset for ticker: {ticker}", file=sys.stderr)
            return None
        
        # Convert pandas series/arrays to native python floats
        closes = df['Close'].tolist()
        opens = df['Open'].tolist()
        highs = df['High'].tolist()
        lows = df['Low'].tolist()
        volumes = df['Volume'].tolist()
        
        # Strip out potential NaN values
        filtered_indices = [i for i, c in enumerate(closes) if not math.isnan(c) and c is not None]
        if not filtered_indices:
            print(f"No valid non-NaN prices found for ticker: {ticker}", file=sys.stderr)
            return None
        
        final_closes = [closes[i] for i in filtered_indices]
        final_opens = [opens[i] if not math.isnan(opens[i]) else closes[i] for i in filtered_indices]
        final_highs = [highs[i] if not math.isnan(highs[i]) else closes[i] for i in filtered_indices]
        final_lows = [lows[i] if not math.isnan(lows[i]) else closes[i] for i in filtered_indices]
        final_volumes = [int(volumes[i]) if not math.isnan(volumes[i]) else 0 for i in filtered_indices]
        
        return {
            "close": final_closes,
            "open": final_opens,
            "high": final_highs,
            "low": final_lows,
            "volume": final_volumes
        }
    except Exception as e:
        print(f"Exception raised when calling yfinance for {ticker}: {e}", file=sys.stderr, flush=True)
        return None

def fetch_yahoo_data(ticker):
    """
    Fallback: Fetches daily chart data for the last 1 year from Yahoo Finance.
    Includes close, open, high, low, volume.
    We target query2 and use high performance requests/urllib fallbacks with elite browser headers.
    """
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1y"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=0'
    }
    
    # Try fetching using requests first if available
    if REQUESTS_AVAILABLE:
        try:
            r = requests.get(url, headers=headers, timeout=10)
            if r.status_code == 200:
                return r.json()
            else:
                print(f"requests direct fetch to query2 returned status {r.status_code} for {ticker}", flush=True)
        except Exception as e:
            print(f"requests direct fetch failed for {ticker}: {e}", flush=True)

    # Secondary fallback using traditional urllib.request (guaranteed stdlib)
    import urllib.request
    import json
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            return data
    except Exception as e:
        print(f"urllib direct fallback failed for {ticker}: {e}", flush=True)
        return None

def compute_indicators(close_prices, open_prices, high_prices, low_prices, volumes):
    """
    Computes professional indicators (MA20/50/200, RSI, ATR, Volatility, S/R, Gaps, Smart Money Flow).
    Returns dictionary of results.
    """
    n = len(close_prices)
    if n == 0:
        return {}

    last_price = close_prices[-1]
    last_volume = volumes[-1] if volumes else 0
    
    # MAs
    ma20 = sum(close_prices[-20:]) / min(20, n) if n >= 20 else last_price
    ma50 = sum(close_prices[-50:]) / min(50, n) if n >= 50 else last_price
    ma200 = sum(close_prices[-200:]) / min(200, n) if n >= 200 else last_price

    # RSI (14)
    rsi = 50.0
    if n > 14:
        deltas = [close_prices[i] - close_prices[i-1] for i in range(1, n)]
        gains = [d if d > 0 else 0 for d in deltas]
        losses = [-d if d < 0 else 0 for d in deltas]
        
        avg_gain = sum(gains[:14]) / 14
        avg_loss = sum(losses[:14]) / 14
        
        if avg_loss > 0:
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))
        else:
            rsi = 100.0 if avg_gain > 0 else 50.0
            
        # Wilders smoothing
        for i in range(14, len(deltas)):
            gain = deltas[i] if deltas[i] > 0 else 0
            loss = -deltas[i] if deltas[i] < 0 else 0
            avg_gain = (avg_gain * 13 + gain) / 14
            avg_loss = (avg_loss * 13 + loss) / 14
            if avg_loss > 0:
                rs = avg_gain / avg_loss
                rsi = 100 - (100 / (1 + rs))
            else:
                rsi = 100.0 if avg_gain > 0 else 50.0

    # ATR (14)
    atr = 0.0
    if n > 1:
        tr_list = []
        for i in range(1, n):
            h = high_prices[i]
            l = low_prices[i]
            prev_c = close_prices[i-1]
            tr = max(h - l, abs(h - prev_c), abs(l - prev_c))
            tr_list.append(tr)
        atr = sum(tr_list[-14:]) / min(14, len(tr_list))

    # Volatility (standard deviation of daily return)
    volatility = 0.0
    if n > 1:
        returns = [(close_prices[i] - close_prices[i-1]) / close_prices[i-1] for i in range(1, n)]
        avg_return = sum(returns) / len(returns)
        variance = sum((r - avg_return) ** 2 for r in returns) / (len(returns) - 1)
        # Annualized volatility (assuming 252 trading days)
        volatility = math.sqrt(variance) * math.sqrt(252) * 100

    # Pivot high/low for support and resistance (window of 15 days)
    support = last_price * 0.95
    resistance = last_price * 1.05
    window = 15
    if n >= window * 2:
        # Simple pivot finder
        p_highs = []
        p_lows = []
        for i in range(window, n - window):
            curr_h = high_prices[i]
            curr_l = low_prices[i]
            # Is peak?
            is_peak = True
            is_trough = True
            for j in range(i - window, i + window):
                if j == i: continue
                if high_prices[j] > curr_h: is_peak = False
                if low_prices[j] < curr_l: is_trough = False
            if is_peak: p_highs.append(curr_h)
            if is_trough: p_lows.append(curr_l)
        if p_lows:
            # find closest low below current price
            below = [l for l in p_lows if l < last_price]
            if below: support = max(below)
            else: support = min(p_lows)
        if p_highs:
            above = [h for h in p_highs if h > last_price]
            if above: resistance = min(above)
            else: resistance = max(p_highs)

    # Gap Analysis
    gap_type = "No Gap"
    gap_percent = 0.0
    if n > 1:
        prev_c = close_prices[-2]
        curr_o = open_prices[-1]
        gap_val = curr_o - prev_c
        gap_percent = (gap_val / prev_c) * 100
        if gap_percent > 0.1:
            gap_type = "Gap Up"
        elif gap_percent < -0.1:
            gap_type = "Gap Down"
            gap_percent = abs(gap_percent)
        else:
            gap_percent = 0.0

    # Smart Money Flow (%)
    # Proxy: (Close - Low) - (High - Close) / (High - Low) * Volume
    # normalized to 0-100% representation
    smart_money_flow_pct = 50.0
    buyer_ratio = 50.0
    seller_ratio = 50.0
    if n > 1:
        accumulation_scores = []
        for i in range(max(0, n - 20), n):
            h, l, c = high_prices[i], low_prices[i], close_prices[i]
            v = volumes[i]
            if h > l:
                mf_multiplier = ((c - l) - (h - c)) / (h - l)
                accumulation_scores.append(mf_multiplier * v)
        total_volume = sum(volumes[-20:])
        if total_volume > 0:
            net_flow = sum(accumulation_scores)
            # transform -1 to +1 range to 0 to 100%
            normalized_flow = (net_flow / total_volume + 1) / 2 * 100
            smart_money_flow_pct = max(0, min(100, normalized_flow))
            buyer_ratio = max(10, min(90, smart_money_flow_pct))
            seller_ratio = 100 - buyer_ratio

    # Market Condition Detection
    if last_price > ma50 > ma200:
        market_condition = "Bullish"
    elif last_price < ma50 < ma200:
        market_condition = "Bearish"
    else:
        market_condition = "Sideways"

    # Price Zone
    undervalued_threshold = ma200 * 0.95
    overvalued_threshold = ma200 * 1.05
    if last_price < undervalued_threshold:
        price_zone = "Undervalued"
    elif last_price > overvalued_threshold:
        price_zone = "Overvalued"
    else:
        price_zone = "Fair"

    return {
        "price": last_price,
        "open": open_prices[-1],
        "high": high_prices[-1],
        "low": low_prices[-1],
        "volume": last_volume,
        "ma20": ma20,
        "ma50": ma50,
        "ma200": ma200,
        "rsi": rsi,
        "atr": atr,
        "volatility": volatility,
        "support": support,
        "resistance": resistance,
        "gapType": gap_type,
        "gapPercent": gap_percent,
        "smartMoneyFlow": smart_money_flow_pct,
        "buyerRatio": buyer_ratio,
        "sellerRatio": seller_ratio,
        "marketCondition": market_condition,
        "priceZone": price_zone
    }

class StockAPIHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/stock/'):
            parts = self.path.split('/')
            if len(parts) >= 4:
                ticker = parts[3].upper()
                print(f"Stock request received for ticker: {ticker}", flush=True)
                
                # Append .JK if ticker is an Indonesian stock (4-letter symbols that are not US tech stocks and have no dot)
                yahoo_symbol = ticker
                us_tickers = [
                    "AAPL", "MSFT", "TSLA", "NVDA", "AMZN", "META", "GOOG", "NFLX", "COIN", "INTC", 
                    "PYPL", "SBUX", "QCOM", "AMAT", "MU", "TXN", "COST", "MRVL", "LRCX", "AVGO", "ADBE"
                ]
                import re
                is_four_letters = bool(re.match(r"^[A-Z]{4}$", ticker))
                is_indo = (is_four_letters and ticker not in us_tickers) or ticker == "GOTO"
                if is_indo and not "." in yahoo_symbol:
                    yahoo_symbol = f"{ticker}.JK"
                
                # First, try fetching with official yfinance library
                data_dict = fetch_data_with_yfinance(yahoo_symbol)
                
                if data_dict:
                    try:
                        closes = data_dict["close"]
                        opens = data_dict["open"]
                        highs = data_dict["high"]
                        lows = data_dict["low"]
                        volumes = data_dict["volume"]
                        
                        computed = compute_indicators(closes, opens, highs, lows, volumes)
                        computed['history'] = closes[-50:] if len(closes) >= 50 else closes
                        computed['source'] = "Yahoo Finance LIVE Python Engine (yfinance)"
                        
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps(computed).encode())
                        return
                    except Exception as ex:
                        print(f"Error compiling yfinance indicators: {ex}", file=sys.stderr, flush=True)

                # Fallback to direct chart endpoint fetch via urllib if yfinance is not available/failed
                raw_data = fetch_yahoo_data(yahoo_symbol)
                if raw_data and 'chart' in raw_data and 'result' in raw_data['chart'] and raw_data['chart']['result']:
                    try:
                        result = raw_data['chart']['result'][0]
                        indicators = result['indicators']['quote'][0]
                        
                        closes = [c for c in indicators.get('close', []) if c is not None]
                        opens = [o for o, c in zip(indicators.get('open', []), indicators.get('close', [])) if c is not None and o is not None]
                        highs = [h for h, c in zip(indicators.get('high', []), indicators.get('close', [])) if c is not None and h is not None]
                        lows = [l for l, c in zip(indicators.get('low', []), indicators.get('close', [])) if c is not None and l is not None]
                        volumes = [v for v, c in zip(indicators.get('volume', []), indicators.get('close', [])) if c is not None and v is not None]
                        
                        computed = compute_indicators(closes, opens, highs, lows, volumes)
                        computed['history'] = closes[-50:] if len(closes) >= 50 else closes
                        computed['source'] = "Yahoo Finance Direct Fallback API"
                        
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps(computed).encode())
                        return
                    except Exception as ex:
                        print(f"Error compiling direct fallback indicator: {ex}", file=sys.stderr, flush=True)

                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Failed to fetch stock {ticker} or ticker invalid."}).encode())
                return
            
        elif self.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "healthy", "engine": "Python StdLib Stock Engine"}).encode())
            return
            
        self.send_response(404)
        self.end_headers()

def run_server():
    server_address = ('0.0.0.0', PORT)
    httpd = HTTPServer(server_address, StockAPIHandler)
    print(f"Smart Stock Screener - Python Server running on port {PORT}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
