# 🚀 Stock Analysis — Real-time Market Intelligence & Portfolio Safety Platform

Stock Analysis is a full-stack financial analysis platform that delivers real-time market data insights, technical indicator mapping, and automated portfolio crash alerts. It combines live stock exchange queries with structured indicators to generate trading signals and help manage risk boundaries.

---

## 🌐 Live Demo

👉 https://stock-analysis-2f871.web.app

---

## 📸 Preview

### Home
<img width="100%" alt="Home" src="https://github.com/user-attachments/assets/8d9b54fc-1b74-44bd-acce-36ec112ff00f" />

### Dashboard
<img width="100%" alt="Dashboard" src="https://github.com/user-attachments/assets/10baa78b-87ca-429f-b651-bf814ccaccef" />

### Profile / UI
<img width="100%" alt="Profile" src="https://github.com/user-attachments/assets/10f142ec-7e6a-4e17-b127-c502433dea81" />

---

## ⚡ Features

* 🔍 **Smart Stock Search**: Real-time ticker suggestion queries supporting NSE, BSE, and US markets (NYSE/NASDAQ).
* 🔔 **Portfolio Pin Alerts**: Pin your purchase entry price and warning thresholds (e.g. 5% drop) to automatically monitor positions and generate drop alerts.
* 🛡️ **Consent Manager**: GDPR/CCPA-compliant Consent Management Provider (CMP) banner with granular toggles (Essential, Analytics, Marketing) and data transparency logs.
* 📊 **Interactive Charting**: View historical price ranges across multiple time horizons (1D, 5D, 1M, 1Y, 5Y).
* 🤖 **Technical Signals**: Automated BUY / SELL / HOLD recommendations based on structured indicators.
* 📉 **Indicator Mapping**: Evaluates Relative Strength Index (RSI), Simple Moving Averages (SMA 20/50/200), daily support/resistance levels, and session volatility.
* 👤 **Tabbed Profile Center**: Manage active watchlisted stocks, view pending alerts, and track your Firebase user credentials with dynamic "Days Active" counters.
* 🔐 **Secure Authentication**: Firebase Auth integrations supporting Email + Password and Google Sign-In.
* ⚖️ **Unified Design System**: Sleek SaaS-style glassmorphic dark theme styled with premium `Inter` typography and technical `JetBrains Mono` text for chart data.

---

## 🧠 How It Works

1. **User Action**: User searches a stock symbol or clicks quick trending chips (TCS, INFY, NVDA).
2. **Data Ingestion**: Backend queries real-time market figures via **yfinance**.
3. **Signal Synthesis**: Technical routines compute:
   * RSI (Relative Strength Index)
   * Moving Average crossovers (20-day, 50-day, 200-day)
   * Daily Support & Resistance bands
   * Session volatility standard deviation
4. **Scoring Logic**: We synthesize these values to generate a signal score and confidence level.
5. **Background Monitoring**: Backend runs a persistent background checker loop every 5 minutes to evaluate active users' pinned stock buy levels against live prices, logging crash warnings when thresholds are violated.

---

## 🛠 Tech Stack

### Frontend
* React.js (Vite)
* Custom Glassmorphic CSS Styling
* Axios

### Backend
* FastAPI (Python)
* yfinance
* Persistent JSON storage (`alerts.json`, `watchlists.json`)

### Authentication
* Firebase Auth

### Deployment
* Frontend: Firebase Hosting
* Backend: Render

---

## 📌 API Endpoints

```bash
# Stock Analysis & Search
GET  /analyze?symbol=RELIANCE.NS&period=1mo
GET  /search?q=infy
GET  /market-overview

# User Profile Watchlists
GET  /watchlist
POST /watchlist/toggle

# Portfolio Pinned Alerts
GET  /alerts
POST /alerts/set
POST /alerts/remove
