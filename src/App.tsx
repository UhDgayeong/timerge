import { useEffect, useState } from 'react'
import SettingsView from './components/SettingsView'
import WeekView from './components/WeekView'
import { onAuthStateChange } from './services/auth'
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
    return unsub
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
