import { useState } from 'react'
import SettingsView from './components/SettingsView'
import WeekView from './components/WeekView'

export default function App() {
  const [view, setView] = useState<'week' | 'settings'>('week')

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
