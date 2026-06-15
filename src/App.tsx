import { useEffect, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import SettingsView from './components/SettingsView'
import WeekView from './components/WeekView'
import { onAuthStateChange } from './services/auth'
import { supabase } from './lib/supabase'
import { syncAll } from './services/sync'

export default function App() {
  const [view, setView] = useState<'week' | 'settings'>('week')

  useEffect(() => {
    // 로그인 상태 변경 시 동기화
    const unsub = onAuthStateChange((user) => {
      if (user) syncAll().catch(() => {})
    })
    // 앱 시작 시 동기화 시도
    syncAll().catch(() => {})

    // 네이티브 앱: Google OAuth 딥링크 콜백 처리
    // com.clokoo.app://#access_token=...&refresh_token=... 형태로 돌아옴
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

  return (
    <main className="app">
      {view === 'week' ? (
        <>
          <header className="app-header">
            <span className="app-header__title">timerge</span>
            <button
              className="app-header__settings"
              onClick={() => setView('settings')}
              aria-label="설정"
            >
              ⚙
            </button>
          </header>
          <WeekView />
        </>
      ) : (
        <SettingsView onClose={() => setView('week')} />
      )}
    </main>
  )
}
