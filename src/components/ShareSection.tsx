import { useEffect, useState } from 'react'
import { getUser } from '../services/auth'
import { getSettings } from '../db/index'
import { ensureShareToken, regenerateShareToken, setShareDisplayName, shareUrl } from '../services/share'

export default function ShareSection() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [googleName, setGoogleName] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    getUser().then((u) => {
      setLoggedIn(!!u)
      const meta = u?.user_metadata as Record<string, unknown> | undefined
      setGoogleName((meta?.full_name as string) ?? (meta?.name as string) ?? '')
    })
    getSettings().then((s) => {
      setToken(s.shareToken ?? null)
      setDisplayName(s.shareDisplayName ?? '')
    })
  }, [])

  function showStatus(msg: string) {
    setStatus(msg)
    setTimeout(() => setStatus(''), 3000)
  }

  async function handleCopy() {
    setBusy(true)
    try {
      const t = token ?? (await ensureShareToken())
      setToken(t)
      await navigator.clipboard.writeText(shareUrl(t))
      showStatus('링크가 복사되었습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRegenerate() {
    if (!window.confirm('기존 링크는 즉시 무효화됩니다. 새 링크를 발급할까요?')) return
    setBusy(true)
    try {
      const t = await regenerateShareToken()
      setToken(t)
      showStatus('새 링크가 발급되었습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveName() {
    setBusy(true)
    try {
      await setShareDisplayName(displayName)
      showStatus('표시 이름이 저장되었습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (loggedIn === null) return null
  if (!loggedIn) {
    return (
      <section className="settings__section">
        <h3 className="settings__section-title">공유</h3>
        <p className="settings__hint">로그인하면 내 근무 현황을 읽기 전용 링크로 공유할 수 있어요.</p>
      </section>
    )
  }

  return (
    <section className="settings__section">
      <h3 className="settings__section-title">공유</h3>
      <p className="settings__hint">
        이번 주 현황을 읽기 전용 링크로 공유합니다. 링크가 있으면 누구나 볼 수 있으니 신뢰하는 사람에게만 전달하세요.
      </p>
      <div className="settings__row">
        <input
          className="settings__input settings__input--text"
          type="text"
          placeholder={googleName || '표시 이름'}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <button className="btn btn--primary settings__save" onClick={handleSaveName} disabled={busy}>
          저장
        </button>
      </div>
      <div className="settings__row settings__row--data">
        <button className="settings__data-btn" onClick={handleCopy} disabled={busy}>
          링크 복사
        </button>
        <button className="settings__data-btn" onClick={handleRegenerate} disabled={busy}>
          재발급
        </button>
      </div>
      {status && <p className="settings__hint">{status}</p>}
    </section>
  )
}
