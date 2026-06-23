import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import SharedWeekView from './components/SharedWeekView'
import '@fontsource/ibm-plex-sans-kr/400.css'
import '@fontsource/ibm-plex-sans-kr/500.css'
import '@fontsource/ibm-plex-sans-kr/600.css'
import '@fontsource/ibm-plex-sans-kr/700.css'
import './index.css'

const shareMatch = window.location.pathname.match(/^\/share\/([\w-]+)\/?$/)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {shareMatch ? <SharedWeekView token={shareMatch[1]} /> : <App />}
  </React.StrictMode>,
)
