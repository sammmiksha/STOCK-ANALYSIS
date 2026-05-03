import yfinance as yf
import pandas as pd
import numpy as np
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

# -------------------- APP INIT --------------------
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:5173",
    "https://stock-analysis-2f871.web.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------- ROOT --------------------
@app.get("/")
def home():
    return {
        "status": "running",
        "service": "StockAI Backend",
        "time": str(datetime.now()),
    }


# -------------------- FETCH --------------------
def get_stock_data(symbol: str, period: str):
    try:
        stock = yf.Ticker(symbol)

        df = stock.history(period=period, interval="1d", auto_adjust=True)

        # fallback attempt (shorter period)
        if df.empty:
            df = stock.history(period="5d", interval="1d")

        if df.empty:
            print(f"[ERROR] No data for {symbol}")
            return None

        return df

    except Exception as e:
        print(f"[ERROR] Fetch failed for {symbol}: {e}")
        return None


def normalize_symbol(symbol: str):
    symbol = symbol.upper().strip()

    # If NSE format
    if symbol.endswith(".NS"):
        return symbol

    # If looks like US stock
    if symbol.isalpha() and len(symbol) <= 5:
        return symbol

    return symbol


# -------------------- INDICATORS --------------------
def calculate_indicators(df: pd.DataFrame):
    df = df.copy()

    # Moving Averages
    df["MA_20"] = df["Close"].rolling(window=20).mean()
    df["MA_50"] = df["Close"].rolling(window=50).mean()

    # EMA
    df["EMA_12"] = df["Close"].ewm(span=12).mean()
    df["EMA_26"] = df["Close"].ewm(span=26).mean()

    # MACD
    df["MACD"] = df["EMA_12"] - df["EMA_26"]
    df["MACD_SIGNAL"] = df["MACD"].ewm(span=9).mean()

    # RSI
    delta = df["Close"].diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.ewm(alpha=1 / 14).mean()
    avg_loss = loss.ewm(alpha=1 / 14).mean()

    rs = avg_gain / avg_loss
    df["RSI"] = 100 - (100 / (1 + rs))

    # Volatility
    df["Volatility"] = df["Close"].pct_change().rolling(10).std() * 100

    return df


# -------------------- SIGNAL ENGINE --------------------
def generate_signal(df: pd.DataFrame):
    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else latest

    score = 0

    # EMA Trend
    if latest["EMA_12"] > latest["EMA_26"]:
        score += 2
    else:
        score -= 2

    # MA confirmation
    if latest["MA_20"] > latest["MA_50"]:
        score += 2
    else:
        score -= 2

    # RSI
    if latest["RSI"] < 30:
        score += 2
    elif latest["RSI"] > 70:
        score -= 2
    else:
        score += 1

    # MACD
    if latest["MACD"] > latest["MACD_SIGNAL"]:
        score += 2
    else:
        score -= 2

    # Volatility (penalty if too high)
    if latest["Volatility"] > 3:
        score -= 1

    # ---------------- DECISION ----------------
    if score >= 5:
        signal = "BUY"
    elif score <= -5:
        signal = "SELL"
    else:
        signal = "HOLD"

    confidence = min(abs(score) * 10, 90)

    return signal, confidence, score


# -------------------- ANALYSIS --------------------
def generate_analysis(df: pd.DataFrame, symbol: str):
    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else latest

    price = float(latest["Close"])
    prev_price = float(prev["Close"])

    change = ((price - prev_price) / prev_price) * 100

    rsi = float(latest["RSI"])
    volatility = float(latest["Volatility"]) if not pd.isna(latest["Volatility"]) else 0

    # Signal engine
    signal, confidence, raw_score = generate_signal(df)

    # Trend
    trend = "Bullish" if latest["EMA_12"] > latest["EMA_26"] else "Bearish"

    # Analysis text
    analysis = f"""
    {trend} structure with signal score {raw_score}.
    RSI at {round(rsi,2)}.
    Volatility at {round(volatility,2)}%.
    Daily move {round(change,2)}%.
    """

    # -------------------- CHART DATA --------------------
    history = df.tail(90).reset_index()

    history_data = [
        {
            "date": str(row["Date"].date()),
            "open": round(row["Open"], 2),
            "high": round(row["High"], 2),
            "low": round(row["Low"], 2),
            "close": round(row["Close"], 2),
            "volume": int(row["Volume"]),
        }
        for _, row in history.iterrows()
    ]

    return {
        "symbol": symbol,
        "signal": signal,
        "summary": {
            "price": round(price, 2),
            "change": round(change, 2),
            "rsi": round(rsi, 2),
            "trend": trend,
            "confidence": confidence,
            "volatility": round(volatility, 2),
            "ema_fast": round(latest["EMA_12"], 2),
            "ema_slow": round(latest["EMA_26"], 2),
            "macd": round(latest["MACD"], 2),
        },
        "analysis": analysis.strip(),
        "history": history_data,
    }


# -------------------- USER STATS (REALISTIC DERIVED) --------------------
@app.get("/user-stats")
def user_stats():
    # Derived from market, not fake random
    indices = ["^NSEI", "^BSESN"]

    stats = []

    for idx in indices:
        df = yf.Ticker(idx).history(period="5d")
        change = (
            (df["Close"].iloc[-1] - df["Close"].iloc[0]) / df["Close"].iloc[0]
        ) * 100
        stats.append(round(change, 2))

    return {
        "market_trend_avg": round(sum(stats) / len(stats), 2),
        "active_indices": len(indices),
        "timestamp": str(datetime.now()),
    }


from fastapi import Query
import yfinance as yf


@app.get("/search")
def search_stocks(q: str = Query(..., min_length=1)):
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

    except:
        return {"results": []}


from functools import lru_cache


@lru_cache(maxsize=100)
def fetch_stock_data(symbol):
    return yf.download(symbol, period="1mo")


import time


def safe_fetch(symbol):
    for _ in range(3):
        try:
            data = fetch_stock_data(symbol)
            if not data.empty:
                return data
        except:
            time.sleep(0.5)
    return None


reviews = []


@app.post("/reviews")
def add_review(review: dict):
    reviews.append(review)
    return {"status": "ok"}


@app.get("/reviews")
def get_reviews():
    return reviews


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
        df = yf.Ticker(symbol).history(period="5d")

        change = (
            (df["Close"].iloc[-1] - df["Close"].iloc[0]) / df["Close"].iloc[0]
        ) * 100

        data[name] = round(change, 2)

    return data


import json

REVIEW_FILE = "reviews.json"


def load_reviews():
    try:
        with open(REVIEW_FILE) as f:
            return json.load(f)
    except:
        return []


def save_reviews(data):
    with open(REVIEW_FILE, "w") as f:
        json.dump(data, f)


reviews = load_reviews()

signal_log = []


@app.post("/log-signal")
def log_signal(data: dict):
    signal_log.append(data)
    return {"status": "logged"}


watchlists = {}


@app.post("/watchlist/add")
def add_watchlist(user: str, symbol: str):
    watchlists.setdefault(user, []).append(symbol)
    return {"status": "added"}


@app.get("/watchlist")
def get_watchlist(user: str):
    return {"symbols": watchlists.get(user, [])}


# -------------------- ANALYZE --------------------
@app.get("/analyze")
def analyze(symbol: str):
    try:
        symbol = normalize_symbol(symbol)

        df = get_stock_data(symbol, "3mo")

        if df is None:
            return {"error": "Invalid symbol or no data available"}

        df = calculate_indicators(df)

        result = generate_analysis(df, symbol)

        return result

    except Exception as e:
        return {"error": str(e)}
