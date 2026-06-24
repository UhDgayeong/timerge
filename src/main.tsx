import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'
import App from './App'
import SharedWeekView from './components/SharedWeekView'
import '@fontsource/ibm-plex-sans-kr/400.css'
import '@fontsource/ibm-plex-sans-kr/500.css'
import '@fontsource/ibm-plex-sans-kr/600.css'
import '@fontsource/ibm-plex-sans-kr/700.css'
import './index.css'

// 미호출 시 appReadyTimeout(기본 10초) 후 직전 OTA 번들로 자동 롤백됨
if (Capacitor.isNativePlatform()) {
  CapacitorUpdater.notifyAppReady()
}

const shareMatch = window.location.pathname.match(/^\/share\/([\w-]+)\/?$/)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {shareMatch ? <SharedWeekView token={shareMatch[1]} /> : <App />}
  </React.StrictMode>,
)
