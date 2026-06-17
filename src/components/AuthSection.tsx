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
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          Google로 로그인
        </button>
      </div>
    </div>
  )
}
