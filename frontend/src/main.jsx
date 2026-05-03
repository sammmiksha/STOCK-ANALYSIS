import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'   // reset only — strips Vite boilerplate
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)