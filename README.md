# 🚀 StockAI — AI-Powered Stock Analysis Platform

StockAI is a full-stack stock analysis platform that delivers real-time market insights, intelligent trading signals, and interactive visualizations. It combines live financial data with technical indicators to generate actionable **BUY / SELL / HOLD** decisions.

---

## 🌐 Live Demo

👉 https://stock-analysis-2f871.web.app

---

## 📸 Preview

### Dashboard

![Dashboard](https://github.com/user-attachments/assets/319615cb-6b19-4e2e-9957-4b677bea8d73)

### Analysis View

![Analysis](https://github.com/user-attachments/assets/489483c2-10df-4bb8-bb2a-49bd7f7e765a)

### Profile / UI

![Profile](https://github.com/user-attachments/assets/43228c54-0020-4fb8-a3b0-079956508998)

---

## ⚡ Features

* 🔍 Smart stock search with real-time suggestions
* 📊 Interactive price charts (1D, 1W, 1M, 3M, 1Y)
* 🤖 AI-based BUY / SELL / HOLD signals
* 📉 Technical indicators (RSI, Trend, Volatility, MACD)
* 🌍 Supports NSE + US markets
* 🔐 Firebase Authentication (Email + Google)
* ⚡ FastAPI backend for high-performance APIs
* 🎨 Modern SaaS-style dark UI

---

## 🧠 How It Works

1. User searches for a stock (e.g., RELIANCE, AAPL)
2. Backend fetches live market data via **yfinance**
3. System computes:

   * RSI (Relative Strength Index)
   * Moving Averages (EMA, MA)
   * MACD
   * Volatility
4. Scoring logic generates a trading signal
5. Frontend renders insights with interactive charts

---

## 🛠 Tech Stack

### Frontend

* React.js (Vite)
* Tailwind CSS / Custom UI
* Axios

### Backend

* FastAPI (Python)
* yfinance

### Authentication

* Firebase Auth

### Deployment

* Frontend: Firebase Hosting
* Backend: Render

---

## 📌 API Endpoints

```bash
GET /analyze?symbol=RELIANCE.NS&period=1mo
GET /search?q=infy
GET /market-overview
GET /user-stats
```

---

## ⚙️ Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/your-username/stockai.git
cd stockai
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

---

## 🚀 Future Improvements

* 📌 Portfolio tracking
* 📈 Real-time WebSocket updates
* 🧠 ML-based prediction models
* 📊 Advanced charting (candlestick, indicators overlay)
* 🔔 Alerts & notifications

---

## 👨‍💻 Author

Sam — BSc IT Student
Focused on AI, ML, and Full-Stack Development

---

## ⭐ If you like this project

Give it a star ⭐ and share feedback!
