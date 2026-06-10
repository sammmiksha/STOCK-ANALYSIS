import yfinance as yf
import pandas as pd
import numpy as np
from fastapi import FastAPI, Query, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import time
import os
import json
import html
import asyncio
import smtplib
from email.mime.text import MIMEText
from pydantic import BaseModel, Field
from typing import Optional, List

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://stock-analysis-2f871.web.app",
    "https://stock-analysis-2f871.firebaseapp.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("[OK] Stock Analysis backend initialized")


# -------------------- UTILITIES --------------------
def safe_float(val, default=0.0) -> float:
    if val is None or pd.isna(val):
        return default
    try:
        return float(val)
    except:
        return default


# -------------------- ROOT --------------------
@app.get("/")
def home():
    return {
        "status": "running",
        "service": "Stock Analysis Backend",
        "time": str(datetime.now()),
    }


# -------------------- RATE LIMITING --------------------
RATE_LIMIT_LIMIT = 45
RATE_LIMIT_WINDOW = 60
ip_requests = {}

def check_rate_limit(ip: str) -> bool:
    now = time.time()
    timestamps = ip_requests.get(ip, [])
    timestamps = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW]
    ip_requests[ip] = timestamps
    
    if len(timestamps) >= RATE_LIMIT_LIMIT:
        return False
    
    ip_requests[ip].append(now)
    return True


# -------------------- SYMBOL NORMALIZATION --------------------
def normalize_symbol(symbol: str) -> str:
    symbol = symbol.upper().strip()
    
    # 1. Indian stock quick-maps
    indian_stocks = ["RELIANCE", "TCS", "INFY", "WIPRO", "HDFCBANK", "BAJFINANCE"]
    if symbol in indian_stocks:
        return symbol + ".NS"
        
    # 2. Precious Metals spot to futures mapping
    metal_mappings = {
        "XAUUSD": "GC=F",
        "XAGUSD": "SI=F",
        "XPTUSD": "PL=F",
        "XPDUSD": "PA=F"
    }
    if symbol in metal_mappings:
        return metal_mappings[symbol]
        
    # 3. Crypto normalization (e.g. BTCUSD -> BTC-USD, BTCUSDT -> BTC-USD)
    cryptos = {"BTC", "ETH", "SOL", "DOGE", "ADA", "XRP", "LTC", "DOT", "LINK", "UNI", "AVAX", "MATIC", "SHIB", "TRX", "BCH", "XLM", "ETC", "ATOM", "ALGO"}
    if symbol.endswith("USD") and symbol[:-3] in cryptos:
        return f"{symbol[:-3]}-USD"
    if symbol.endswith("USDT") and symbol[:-4] in cryptos:
        return f"{symbol[:-4]}-USD"
        
    # 4. Forex normalization (e.g. EURUSD -> EURUSD=X)
    currencies = {"USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "CNY", "INR", "SGD", "HKD", "KRW", "SEK", "NOK", "DKK", "ZAR", "MXN", "BRL", "TRY", "RUB", "AED", "SAR"}
    if len(symbol) == 6 and symbol[:3] in currencies and symbol[3:] in currencies:
        return symbol + "=X"
        
    return symbol


# -------------------- RAW DATA FETCH --------------------
def get_stock_history_raw(symbol: str, period: str, interval: str) -> Optional[pd.DataFrame]:
    try:
        stock = yf.Ticker(symbol)
        df = stock.history(period=period, interval=interval, auto_adjust=True)
        if df.empty and "." not in symbol:
            stock = yf.Ticker(symbol + ".NS")
            df = stock.history(period=period, interval=interval, auto_adjust=True)
        if df.empty:
            return None
        return df
    except Exception as e:
        print(f"[ERROR] Fetch failed for {symbol} ({period}, {interval}): {e}")
        return None


# -------------------- INDICATORS ENGINE --------------------
def calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["MA_20"] = df["Close"].rolling(window=20).mean()
    df["MA_50"] = df["Close"].rolling(window=50).mean()
    
    if len(df) >= 200:
        df["MA_200"] = df["Close"].rolling(window=200).mean()
    else:
        df["MA_200"] = df["Close"].rolling(window=len(df)).mean()

    df["EMA_12"] = df["Close"].ewm(span=12).mean()
    df["EMA_26"] = df["Close"].ewm(span=26).mean()

    df["MACD"] = df["EMA_12"] - df["EMA_26"]
    df["MACD_SIGNAL"] = df["MACD"].ewm(span=9).mean()
    df["MACD_HIST"] = df["MACD"] - df["MACD_SIGNAL"]

    delta = df["Close"].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / 14).mean()
    avg_loss = loss.ewm(alpha=1 / 14).mean()
    rs = avg_gain / avg_loss
    df["RSI"] = 100 - (100 / (1 + rs))

    df["Volatility"] = df["Close"].pct_change().rolling(10).std() * 100

    df["BB_Middle"] = df["MA_20"]
    bb_std = df["Close"].rolling(window=20).std()
    df["BB_Upper"] = df["BB_Middle"] + 2 * bb_std
    df["BB_Lower"] = df["BB_Middle"] - 2 * bb_std

    # Kaufman's Efficiency Ratio (ER)
    df["ER_direction"] = (df["Close"] - df["Close"].shift(10)).abs()
    df["ER_volatility"] = df["Close"].diff().abs().rolling(10).sum()
    df["ER"] = df["ER_direction"] / df["ER_volatility"].replace(0, 1e-9)

    # Volume Moving Average
    if "Volume" in df.columns:
        df["Volume_MA_20"] = df["Volume"].rolling(window=20).mean()
    else:
        df["Volume_MA_20"] = 0

    return df


def calculate_support_resistance(df: pd.DataFrame):
    recent = df.tail(30)
    if recent.empty:
        return 0.0, 0.0
    support = float(recent["Low"].min())
    resistance = float(recent["High"].max())
    return support, resistance


def generate_signal(latest: pd.Series):
    score = 0.0
    details = {}

    er = latest.get("ER", 0.5)
    if pd.isna(er):
        er = 0.5
    
    is_trending = er > 0.45
    details["market_state"] = "Trending" if is_trending else "Ranging"
    details["efficiency_ratio"] = float(er)

    # Trend Crossovers
    trend_score = 0.0
    if not pd.isna(latest.get("MACD")) and not pd.isna(latest.get("MACD_SIGNAL")):
        macd_val = 1.5 if latest["MACD"] > latest["MACD_SIGNAL"] else -1.5
        trend_score += macd_val
        details["macd_signal"] = "Bullish Crossover" if macd_val > 0 else "Bearish Crossover"

    if not pd.isna(latest.get("MA_20")) and not pd.isna(latest.get("MA_50")):
        ma_cross = 1.5 if latest["MA_20"] > latest["MA_50"] else -1.5
        trend_score += ma_cross
        details["ma_cross"] = "MA20 > MA50" if ma_cross > 0 else "MA20 < MA50"

    if not pd.isna(latest.get("MA_200")):
        ma_200_val = 1.0 if latest["Close"] > latest["MA_200"] else -1.0
        trend_score += ma_200_val
        details["long_term_trend"] = "Above MA200" if ma_200_val > 0 else "Below MA200"

    if is_trending:
        score += trend_score
        details["trend_contribution"] = float(trend_score)
    else:
        score += trend_score * 0.4
        details["trend_contribution"] = float(trend_score * 0.4)

    # Mean Reversion
    range_score = 0.0
    rsi = latest.get("RSI", 50.0)
    if not pd.isna(rsi):
        details["rsi"] = float(rsi)
        if rsi < 30.0:
            range_score += 2.5
            details["rsi_state"] = "Oversold"
        elif rsi > 70.0:
            range_score -= 2.5
            details["rsi_state"] = "Overbought"
        else:
            range_score += 0.5 if rsi > 50.0 else -0.5
            details["rsi_state"] = "Neutral"

    close = latest["Close"]
    if not pd.isna(latest.get("BB_Lower")) and not pd.isna(latest.get("BB_Upper")):
        if close <= latest["BB_Lower"]:
            range_score += 1.5
            details["bollinger_state"] = "Lower Band Touch"
        elif close >= latest["BB_Upper"]:
            range_score -= 1.5
            details["bollinger_state"] = "Upper Band Touch"
        else:
            details["bollinger_state"] = "Within Bands"

    if not is_trending:
        score += range_score
        details["range_contribution"] = float(range_score)
    else:
        score += range_score * 0.5
        details["range_contribution"] = float(range_score * 0.5)

    # Volume Confirmation
    vol = latest.get("Volume", 0)
    vol_ma = latest.get("Volume_MA_20", 0)
    vol_confirm = 1.0
    
    if not pd.isna(vol) and not pd.isna(vol_ma) and vol_ma > 0:
        vol_ratio = vol / vol_ma
        details["volume_ratio"] = float(vol_ratio)
        if vol_ratio > 1.5:
            vol_bonus = 1.5 if score >= 0 else -1.5
            score += vol_bonus
            details["volume_confirm"] = f"High Vol ({vol_ratio:.1f}x avg)"
        elif vol_ratio < 0.5:
            vol_confirm = 0.65
            details["volume_confirm"] = f"Low Vol ({vol_ratio:.1f}x avg)"
        else:
            details["volume_confirm"] = "Normal Vol"
    else:
        details["volume_ratio"] = 1.0
        details["volume_confirm"] = "No Volume"

    # Volatility Penalty
    volatility = latest.get("Volatility", 0.0)
    if not pd.isna(volatility) and volatility > 3.5:
        score -= 1.0
        details["volatility_warning"] = "High Volatility"
    else:
        details["volatility_warning"] = "Normal Volatility"

    if score >= 3.0:
        signal = "BUY"
    elif score <= -3.0:
        signal = "SELL"
    else:
        signal = "HOLD"

    confidence = min(abs(score) * 15.0 * vol_confirm, 98.0)
    details["final_score"] = float(score)

    return signal, int(confidence), score, details


# -------------------- NARRATIVE ANALYSIS --------------------
def generate_narrative_analysis(latest: pd.Series, prev: pd.Series, symbol: str, score: float, signal: str) -> str:
    price = float(latest["Close"])
    rsi = float(latest["RSI"]) if not pd.isna(latest["RSI"]) else 50.0
    change = ((price - float(prev["Close"])) / float(prev["Close"])) * 100 if prev is not None else 0.0
    
    trend = "Bullish" if latest["EMA_12"] > latest["EMA_26"] else "Bearish"
    ma_alignment = "above" if price > latest["MA_50"] else "below"
    
    symbol_name = symbol.split(".")[0]
    narrative = f"Technical analysis for {symbol_name} indicates a {trend} momentum structure with a score of {score}. "
    narrative += f"The asset is currently trading at {round(price, 2)} ({round(change, 2)}% change today), "
    narrative += f"which is {ma_alignment} its 50-day moving average. "
    
    if rsi >= 70:
        narrative += f"The Relative Strength Index (RSI) stands at {round(rsi, 2)}, indicating overbought conditions; a short-term pullback may occur. "
    elif rsi <= 30:
        narrative += f"The Relative Strength Index (RSI) stands at {round(rsi, 2)}, signalling oversold territory and suggesting a potential buy-on-dip opportunity. "
    else:
        narrative += f"RSI momentum is stable and neutral at {round(rsi, 2)}. "
        
    if latest["MACD"] > latest["MACD_SIGNAL"]:
        narrative += "The MACD line is above the signal line, supporting bullish momentum. "
    else:
        narrative += "The MACD line is below the signal line, suggesting bearish pressure. "
        
    if price >= latest["BB_Upper"]:
        narrative += "Price has reached the upper Bollinger Band limits, showing potential volatility expansion. "
    elif price <= latest["BB_Lower"]:
        narrative += "Price has touched the lower Bollinger Band, indicating temporary oversold deviation. "
        
    narrative += f"Synthesizing these indicator signals yields a {signal} recommendation with a {int(min(abs(score) * 12.5, 95))}% confidence level."
    return narrative


# -------------------- USER STATS --------------------
@app.get("/user-stats")
def user_stats():
    indices = ["^NSEI", "^BSESN"]
    stats = []

    for idx in indices:
        try:
            df = yf.Ticker(idx).history(period="5d")
            if df.empty:
                continue
            change = (
                (df["Close"].iloc[-1] - df["Close"].iloc[0]) / df["Close"].iloc[0]
            ) * 100
            stats.append(round(change, 2))
        except:
            continue

    return {
        "market_trend_avg": round(sum(stats) / len(stats), 2) if stats else 0,
        "active_indices": len(indices),
        "timestamp": str(datetime.now()),
    }


# -------------------- SEARCH --------------------
@app.get("/search")
def search_stocks(q: str = Query(..., min_length=1), request: Request = None):
    if request:
        if not check_rate_limit(request.client.host):
            raise HTTPException(status_code=429, detail="Too many search requests. Please wait a minute.")
            
    try:
        results = yf.search(q)
        quotes = results.get("quotes", [])

        suggestions = []
        for item in quotes[:10]:
            symbol = item.get("symbol")
            name = item.get("shortname") or item.get("longname")
            exchange = item.get("exchange")

            if symbol:
                suggestions.append(
                    {"symbol": symbol, "name": name, "exchange": exchange}
                )

        return {"results": suggestions}

    except Exception as e:
        print("Search error:", e)
        return {"results": []}


# -------------------- REVIEWS --------------------
REVIEW_FILE = os.path.join(os.getcwd(), "reviews.json")

class ReviewModel(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    role: Optional[str] = Field(None, max_length=50)
    text: str = Field(..., min_length=20, max_length=500)
    rating: int = Field(..., ge=1, le=5)
    tag: Optional[str] = Field(None, max_length=30)
    created_at: Optional[str] = None
    uid: Optional[str] = Field(None, max_length=128)

def load_reviews():
    if not os.path.exists(REVIEW_FILE):
        return []
    try:
        with open(REVIEW_FILE, "r") as f:
            return json.load(f)
    except:
        return []

def save_reviews(data):
    try:
        with open(REVIEW_FILE, "w") as f:
            json.dump(data, f)
    except:
        pass

reviews = load_reviews()

@app.post("/reviews")
def add_review(review: ReviewModel):
    sanitized_review = {
        "name": html.escape(review.name.strip()),
        "role": html.escape(review.role.strip()) if review.role else "",
        "text": html.escape(review.text.strip()),
        "rating": review.rating,
        "tag": html.escape(review.tag.strip()) if review.tag else "",
        "created_at": review.created_at or datetime.now().isoformat(),
        "uid": html.escape(review.uid.strip()) if review.uid else None
    }
    reviews.append(sanitized_review)
    save_reviews(reviews)
    return {"status": "ok"}

@app.get("/reviews")
def get_reviews():
    return reviews


# -------------------- MARKET OVERVIEW --------------------
@app.get("/market-overview")
def market_overview():
    indices = {
        "NIFTY50": "^NSEI",
        "SENSEX": "^BSESN",
        "NASDAQ": "^IXIC",
        "S&P500": "^GSPC",
    }

    data = {}

    for name, symbol in indices.items():
        try:
            df = yf.Ticker(symbol).history(period="5d")
            if df.empty:
                continue
            change = (
                (df["Close"].iloc[-1] - df["Close"].iloc[0]) / df["Close"].iloc[0]
            ) * 100
            data[name] = round(change, 2)
        except:
            data[name] = 0

    return data


# -------------------- PERSISTED WATCHLIST --------------------
WATCHLIST_FILE = os.path.join(os.getcwd(), "watchlists.json")

class WatchlistRequest(BaseModel):
    user: str = Field(..., min_length=1, max_length=128)
    symbol: str = Field(..., min_length=1, max_length=20)

def load_watchlists():
    if not os.path.exists(WATCHLIST_FILE):
        return {}
    try:
        with open(WATCHLIST_FILE, "r") as f:
            return json.load(f)
    except:
        return {}

def save_watchlists(data):
    try:
        with open(WATCHLIST_FILE, "w") as f:
            json.dump(data, f)
    except:
        pass

watchlists = load_watchlists()

@app.post("/watchlist/add")
def add_watchlist(req: WatchlistRequest):
    user_id = req.user.strip()
    sym = req.symbol.upper().strip()
    
    user_symbols = watchlists.setdefault(user_id, [])
    if sym not in user_symbols:
        user_symbols.append(sym)
        save_watchlists(watchlists)
    return {"status": "added", "symbols": user_symbols}

@app.post("/watchlist/remove")
def remove_watchlist(req: WatchlistRequest):
    user_id = req.user.strip()
    sym = req.symbol.upper().strip()
    
    user_symbols = watchlists.get(user_id, [])
    if sym in user_symbols:
        user_symbols.remove(sym)
        save_watchlists(watchlists)
    return {"status": "removed", "symbols": user_symbols}

@app.get("/watchlist")
def get_watchlist(user: str = Query(..., min_length=1)):
    user_id = user.strip()
    return {"symbols": watchlists.get(user_id, [])}


# -------------------- BUY TARGET ALERTS --------------------
ALERTS_FILE = os.path.join(os.getcwd(), "alerts.json")
SENT_ALERTS_LOG = os.path.join(os.getcwd(), "sent_alerts.log")

class AlertSetRequest(BaseModel):
    user: str = Field(..., min_length=1, max_length=128)
    symbol: str = Field(..., min_length=1, max_length=20)
    buy_price: float = Field(..., gt=0.0)
    threshold: float = Field(..., ge=0.1, le=99.9)
    email: str = Field(..., min_length=3, max_length=128)
    alert_type: Optional[str] = "drop"

class AlertRemoveRequest(BaseModel):
    user: str = Field(..., min_length=1, max_length=128)
    symbol: str = Field(..., min_length=1, max_length=20)

def load_alerts() -> dict:
    if not os.path.exists(ALERTS_FILE):
        return {}
    try:
        with open(ALERTS_FILE, "r") as f:
            return json.load(f)
    except:
        return {}

def save_alerts(data):
    try:
        with open(ALERTS_FILE, "w") as f:
            json.dump(data, f)
    except:
        pass

alerts = load_alerts()

@app.post("/alerts/set")
def set_alert(req: AlertSetRequest):
    user_id = req.user.strip()
    sym = req.symbol.upper().strip()
    atype = req.alert_type.lower().strip() if req.alert_type else "drop"
    if atype not in ["drop", "growth"]:
        atype = "drop"
    
    user_alerts = alerts.setdefault(user_id, [])
    user_alerts = [a for a in user_alerts if a["symbol"] != sym]
    user_alerts.append({
        "symbol": sym,
        "buy_price": req.buy_price,
        "threshold": req.threshold,
        "email": html.escape(req.email.strip()),
        "alert_type": atype,
        "triggered": False,
        "created_at": datetime.now().isoformat()
    })
    alerts[user_id] = user_alerts
    save_alerts(alerts)
    return {"status": "ok", "alerts": user_alerts}

@app.post("/alerts/remove")
def remove_alert(req: AlertRemoveRequest):
    user_id = req.user.strip()
    sym = req.symbol.upper().strip()
    user_alerts = alerts.get(user_id, [])
    user_alerts = [a for a in user_alerts if a["symbol"] != sym]
    alerts[user_id] = user_alerts
    save_alerts(alerts)
    return {"status": "ok", "alerts": user_alerts}

@app.get("/alerts")
def get_alerts(user: str = Query(..., min_length=1)):
    return {"alerts": alerts.get(user.strip(), [])}


# -------------------- ALERTS BACKGROUND CHECKER --------------------
def log_alert_notification(email, symbol, buy_price, current_price, pct, threshold, direction="crashed", action_text="below purchase price"):
    log_msg = f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ALERT: Email notification dispatched to {email}. "
    log_msg += f"Stock {symbol} has {direction} to {current_price:.2f}, representing a change of {pct:.2f}% {action_text} {buy_price:.2f} (Threshold: {threshold}%).\n"
    try:
        with open(SENT_ALERTS_LOG, "a") as f:
            f.write(log_msg)
    except Exception as e:
        print(f"Alert logging failed: {e}")

def send_actual_email(email_to, symbol, buy_price, current_price, pct, threshold, direction="crashed", action_text="below purchase price") -> bool:
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = os.environ.get("SMTP_PORT")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    if not all([smtp_host, smtp_port, smtp_user, smtp_password]):
        return False
    try:
        subject = f"PORTFOLIO ALERT: {symbol} is {direction} {pct:.1f}%"
        body = f"Hello,\n\nStock Analysis alert for pinned stock {symbol}.\n\n"
        body += f"The asset has moved beyond your warning threshold of {threshold}%.\n"
        body += f"- Pinned Buy Price: {buy_price}\n"
        body += f"- Current Market Price: {current_price:.2f}\n"
        body += f"- Observed Change: {pct:.1f}% ({direction})\n\n"
        body += "Check your portfolio dashboard to review signals.\n\nBest regards,\nStock Analysis Team"
        
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = email_to
        
        with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, [email_to], msg.as_string())
        return True
    except Exception as e:
        print(f"Failed to transmit email: {e}")
        return False

async def check_alerts_job():
    current_alerts = load_alerts()
    updated = False
    
    for user_id, user_alerts in current_alerts.items():
        for alert in user_alerts:
            if alert.get("triggered", False):
                continue
            symbol = alert["symbol"]
            buy_price = float(alert["buy_price"])
            threshold = float(alert["threshold"])
            email = alert["email"]
            alert_type = alert.get("alert_type", "drop")
            
            df = get_stock_history_raw(symbol, period="5d", interval="1d")
            if df is None or df.empty:
                continue
            current_price = float(df["Close"].iloc[-1])
            change = ((current_price - buy_price) / buy_price) * 100
            
            should_trigger = False
            if alert_type == "growth":
                if change >= threshold:
                    should_trigger = True
            else: # "drop"
                if change <= -threshold:
                    should_trigger = True
                    
            if should_trigger:
                alert["triggered"] = True
                updated = True
                pct = abs(change)
                direction = "risen" if alert_type == "growth" else "crashed"
                action_text = "above target" if alert_type == "growth" else "below purchase price"
                log_alert_notification(email, symbol, buy_price, current_price, pct, threshold, direction, action_text)
                send_actual_email(email, symbol, buy_price, current_price, pct, threshold, direction, action_text)
                
    if updated:
        save_alerts(current_alerts)

async def alerts_checker_loop():
    while True:
        try:
            await check_alerts_job()
        except Exception as e:
            print(f"Alert loop execution error: {e}")
        await asyncio.sleep(300)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(alerts_checker_loop())


# -------------------- ANALYZE --------------------
@app.get("/analyze")
def analyze(symbol: str, period: str = "3mo", request: Request = None):
    if request:
        if not check_rate_limit(request.client.host):
            raise HTTPException(status_code=429, detail="Too many analysis requests. Please try again in a minute.")

    try:
        symbol = normalize_symbol(symbol)
        
        daily_df = get_stock_history_raw(symbol, period="1y", interval="1d")
        if daily_df is None or daily_df.empty:
            return {"error": "Invalid symbol or no data available"}

        daily_df = calculate_indicators(daily_df)
        latest = daily_df.iloc[-1]
        prev = daily_df.iloc[-2] if len(daily_df) > 1 else latest

        signal, confidence, raw_score, details = generate_signal(latest)
        analysis_text = generate_narrative_analysis(latest, prev, symbol, raw_score, signal)
        support, resistance = calculate_support_resistance(daily_df)

        chart_interval = "1d"
        chart_period = period
        if period == "1d":
            chart_period = "1d"
            chart_interval = "5m"
        elif period == "5d":
            chart_period = "5d"
            chart_interval = "15m"

        chart_df = get_stock_history_raw(symbol, period=chart_period, interval=chart_interval)
        if chart_df is None or chart_df.empty:
            chart_df = daily_df.tail(90)
            chart_interval = "1d"

        chart_df = chart_df.reset_index()
        chart_data = []

        date_col = "Date"
        for col in ["Datetime", "date", "index", "Date"]:
            if col in chart_df.columns:
                date_col = col
                break

        for _, row in chart_df.iterrows():
            d_val = row[date_col]
            if isinstance(d_val, datetime) or hasattr(d_val, "strftime"):
                if chart_interval in ["5m", "15m"]:
                    d_str = d_val.strftime("%Y-%m-%d %H:%M")
                else:
                    d_str = d_val.strftime("%Y-%m-%d")
            else:
                d_str = str(d_val)[:16]

            chart_data.append({
                "date": d_str,
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })

        fifty_two_week_high = float(daily_df["High"].max())
        fifty_two_week_low = float(daily_df["Low"].min())
        avg_volume = float(daily_df["Volume"].mean())

        price = float(latest["Close"])
        prev_price = float(prev["Close"])
        change = ((price - prev_price) / prev_price) * 100

        return {
            "symbol": symbol,
            "signal": signal,
            "summary": {
                "price": safe_float(price),
                "change": safe_float(change),
                "rsi": safe_float(latest["RSI"], 50.0),
                "trend": "Bullish" if latest["EMA_12"] > latest["EMA_26"] else "Bearish",
                "confidence": confidence,
                "volatility": safe_float(latest["Volatility"]),
                "ema_fast": safe_float(latest["EMA_12"]),
                "ema_slow": safe_float(latest["EMA_26"]),
                "macd": safe_float(latest["MACD"]),
                "macd_signal": safe_float(latest["MACD_SIGNAL"]),
                "macd_hist": safe_float(latest["MACD_HIST"]),
                "ma_20": safe_float(latest["MA_20"]),
                "ma_50": safe_float(latest["MA_50"]),
                "ma_200": safe_float(latest["MA_200"]),
                "bb_upper": safe_float(latest["BB_Upper"]),
                "bb_middle": safe_float(latest["BB_Middle"]),
                "bb_lower": safe_float(latest["BB_Lower"]),
                "support": safe_float(support),
                "resistance": safe_float(resistance),
                "open": safe_float(latest["Open"]),
                "high": safe_float(latest["High"]),
                "low": safe_float(latest["Low"]),
                "volume": int(latest["Volume"]),
                "avg_volume": safe_float(avg_volume),
                "fifty_two_week_high": safe_float(fifty_two_week_high),
                "fifty_two_week_low": safe_float(fifty_two_week_low)
            },
            "analysis": analysis_text,
            "engine_details": details,
            "history": chart_data,
        }

    except Exception as e:
        print("Analyze error:", e)
        return {"error": str(e)}


