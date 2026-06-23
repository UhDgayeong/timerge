import { useEffect, useRef, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import SettingsView from './components/SettingsView'
import WeekView from './components/WeekView'
import { onAuthStateChange } from './services/auth'
import { supabase } from './lib/supabase'
import { syncAll } from './services/sync'
import { consumeBackHandler } from './lib/backHandler'
import logoMark from './assets/logo-mark.svg'

function applySafeAreaBottom() {
  // CSS env(safe-area-inset-bottom) 실제 값을 probe해서 --sab 변수로 주입.
  // Android WebView에서 env()가 0을 반환하는 경우 56px fallback 적용.
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;bottom:0;left:0;width:1px;height:env(safe-area-inset-bottom,0px);' +
    'pointer-events:none;visibility:hidden;'
  document.documentElement.appendChild(probe)
  requestAnimationFrame(() => {
    const sab = probe.offsetHeight
    probe.remove()
    const final = Capacitor.getPlatform() === 'android' && sab < 20 ? 56 : sab
    document.documentElement.style.setProperty('--sab', `${final}px`)
  })
}

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  const saved = localStorage.getItem('theme')
  return saved === 'dark' ? 'dark' : 'light'
}

export default function App() {
  const [view, setView] = useState<'week' | 'settings'>('week')
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [showExitToast, setShowExitToast] = useState(false)
  const exitArmedRef = useRef(false)
  const exitToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleThemeChange(t: Theme) {
    setTheme(t)
    localStorage.setItem('theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  function goToSettings() {
    // iOS 엣지 스와이프 뒤로가기를 위해 히스토리 엔트리 추가
    history.pushState({ view: 'settings' }, '')
    setView('settings')
  }

  function goToWeek() {
    setView('week')
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (Capacitor.isNativePlatform()) applySafeAreaBottom()

    // 로그인 상태 변경 시 동기화
    const unsub = onAuthStateChange((user) => {
      if (user) syncAll().catch(() => {})
    })
    // 앱 시작 시 동기화 시도
    syncAll().catch(() => {})

    // 네이티브 앱: Google OAuth 딥링크 콜백 처리
    // com.timerge.app://#access_token=...&refresh_token=... 형태로 돌아옴
    let deepLinkHandle: { remove: () => void } | null = null
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appUrlOpen', ({ url }) => {
        const hash = url.split('#')[1]
        if (!hash) return
        const params = new URLSearchParams(hash)
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          supabase.auth.setSession({ access_token, refresh_token })
        }
      }).then(handle => { deepLinkHandle = handle })
    }

    return () => {
      unsub()
      deepLinkHandle?.remove()
    }
  }, [])

  useEffect(() => {
    // iOS: 왼쪽 엣지 스와이프 뒤로가기 (popstate)
    const handlePopState = () => {
      if (view === 'settings') setView('week')
    }
    window.addEventListener('popstate', handlePopState)

    // Android: 하드웨어/제스처 뒤로가기
    let backHandle: { remove: () => void } | null = null
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('backButton', () => {
        if (consumeBackHandler()) return
        if (view === 'settings') {
          setView('week')
          return
        }
        // 홈 화면: 뒤로가기 2회 클릭 시 종료 (1회는 안내 토스트만 표시)
        if (exitArmedRef.current) {
          CapApp.exitApp()
          return
        }
        exitArmedRef.current = true
        setShowExitToast(true)
        if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current)
        exitToastTimerRef.current = setTimeout(() => {
          exitArmedRef.current = false
          setShowExitToast(false)
        }, 2000)
      }).then(handle => { backHandle = handle })
    }

    return () => {
      window.removeEventListener('popstate', handlePopState)
      backHandle?.remove()
      if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current)
    }
  }, [view])

  return (
    <>
      <div className="app-blob app-blob--1" aria-hidden="true" />
      <div className="app-blob app-blob--2" aria-hidden="true" />
      <div className="app-blob app-blob--3" aria-hidden="true" />
      <main className="app">
        <div className="view-slide view-slide--home">
          <header className="app-header">
            <span className="app-header__brand">
              <img src={logoMark} alt="" className="app-header__logo" />
              <span className="app-header__title">Timerge</span>
            </span>
            <button
              className="app-header__settings"
              onClick={goToSettings}
              aria-label="설정"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </header>
          <div className="app__scroll">
            <WeekView />
          </div>
        </div>
        <div className={`view-slide view-slide--settings${view === 'settings' ? ' view-slide--active' : ''}`}>
          <SettingsView onClose={goToWeek} theme={theme} onThemeChange={handleThemeChange} />
        </div>
      </main>
      {showExitToast && (
        <div className="app__exit-toast">뒤로가기를 한 번 더 누르면 종료됩니다!</div>
      )}
    </>
  )
}
