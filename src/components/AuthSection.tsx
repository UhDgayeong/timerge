import { useEffect, useState } from 'react'
import { getUser, onAuthStateChange, signInWithGoogle, signOut } from '../services/auth'
import type { User } from '../services/auth'

export default function AuthSection() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUser().then(u => { setUser(u); setLoading(false) })
    return onAuthStateChange(setUser)
  }, [])

  if (loading) return <div className="auth-section__loading">확인 중…</div>

  if (user) {
    return (
      <div className="auth-section">
        <div className="auth-section__info">
          <span className="auth-section__email">{user.email ?? user.id.slice(0, 8)}</span>
          <span className="auth-section__badge">동기화 연결됨</span>
        </div>
        <button className="auth-section__btn auth-section__btn--out" onClick={() => signOut()}>
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <div className="auth-section">
      <p className="auth-section__desc">로그인하면 기기 간 데이터가 자동으로 동기화됩니다.</p>
      <div className="auth-section__btns">
        <button className="auth-section__btn auth-section__btn--google" onClick={() => signInWithGoogle()}>
          Google로 로그인
        </button>
      </div>
    </div>
  )
}
