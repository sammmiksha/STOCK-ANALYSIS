# 🚀 StockAI — AI-Powered Stock Analysis Platform

StockAI is a full-stack SaaS-style stock analysis platform that provides real-time market insights, intelligent trading signals, and interactive visualizations. It combines live financial data with technical analysis to deliver actionable BUY / SELL / HOLD decisions.

---

## 🌐 Live Demo (Coming Soon)
> Deploying on Vercel + Render

---

## 📸 Preview

![Home])<img width="1920" height="1020" alt="image" src="https://github.com/user-attachments/assets/489483c2-10df-4bb8-bb2a-49bd7f7e765a" />
![Dashboard](<img width="1920" height="1020" alt="image" src="https://github.com/user-attachments/assets/319615cb-6b19-4e2e-9957-4b677bea8d73" />)
![Profile](<img width="1920" height="1020" alt="image" src="https://github.com/user-attachments/assets/43228c54-0020-4fb8-a3b0-079956508998" />
)

---

## ⚡ Features

- 🔍 Smart stock search with real-time suggestions  
- 📊 Interactive price charts (1D, 1W, 1M, 1Y)  
- 🤖 AI-based BUY / SELL / HOLD signals  
- 📉 Technical indicators (RSI, Trend, Volatility)  
- 🌍 Supports NSE + International markets  
- 🔐 Firebase Authentication (Email + Google)  
- ⚡ FastAPI backend for high-performance APIs  
- 🎨 Modern SaaS dark UI  

---

## 🧠 How It Works

1. User searches for a stock (e.g., RELIANCE, AAPL)  
2. Backend fetches real-time data using yfinance  
3. System calculates:
   - RSI (Relative Strength Index)
   - Trend (Bullish / Bearish)
   - Volatility  
4. AI logic generates trading signal  
5. Frontend visualizes data with charts & insights  

---

## 🛠 Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS / Custom Styling
- Axios

### Backend
- FastAPI (Python)
- yfinance (market data)

### Authentication
- Firebase Auth

---

## 📌 API Endpoints

```bash
GET /analyze?symbol=RELIANCE.NS&period=1mo
GET /search?q=rel
