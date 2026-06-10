import yfinance as yf
import pandas as pd
import traceback

def test():
    symbol = "GC=F"
    print(f"Fetching raw history for {symbol}...")
    try:
        stock = yf.Ticker(symbol)
        df = stock.history(period="1y", interval="1d", auto_adjust=True)
        if df.empty:
            print("Error: DataFrame is empty")
            return
        print(f"Successfully fetched raw history: {len(df)} rows.")
        
        # Calculate indicators
        print("Calculating indicators...")
        df = df.copy()
        df["MA_20"] = df["Close"].rolling(window=20).mean()
        df["MA_50"] = df["Close"].rolling(window=50).mean()
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
        
        print("Latest row:\n", df.iloc[-1])
        
    except Exception as e:
        print("Exception occurred:")
        traceback.print_exc()

test()
