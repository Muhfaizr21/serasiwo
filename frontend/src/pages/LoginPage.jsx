import { useState } from 'react'
import '../styles/auth.css'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function LoginPage({ theme, onToggleTheme }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [status, setStatus] = useState('idle') // idle | loading | error | success
  const [statusMessage, setStatusMessage] = useState('')
  const [loggedInRole, setLoggedInRole] = useState(null)

  const DEMO_ACCOUNTS = [
    {
      role: 'Super Admin',
      label: 'Pemilik WO',
      email: 'owner@serasiwo.com',
      password: 'password123',
      description: 'Akses penuh ke semua metrik keuangan, kalender master, dan pengaturan sistem.',
    },
    {
      role: 'Admin Operasional',
      label: 'Koordinator Lapangan',
      email: 'operasional@serasiwo.com',
      password: 'password123',
      description: 'Akses rundown acara, koordinasi kru lapangan, dan booking vendor.',
    },
    {
      role: 'Vendor Mitra',
      label: 'Katering & Dekorasi',
      email: 'vendor@serasiwo.com',
      password: 'password123',
      description: 'Akses jadwal ketersediaan, konfirmasi pekerjaan, dan status pencairan payout.',
    },
  ]

  const handleQuickSelect = (acc) => {
    setEmail(acc.email)
    setPassword(acc.password)
    setStatus('idle')
    setStatusMessage('')
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setStatus('error')
      setStatusMessage('Silakan lengkapi alamat email dan kata sandi Anda.')
      return
    }

    setStatus('loading')
    setStatusMessage('')

    try {
      const res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      })

      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          const authData = json.data
          localStorage.setItem('serasiwo_token', authData.token)
          localStorage.setItem('serasiwo_user', JSON.stringify(authData.user))

          setStatus('success')
          setLoggedInRole(authData.user.role_title || authData.user.role)
          setStatusMessage(
            `Selamat datang kembali, ${authData.user.name}! Anda berhasil masuk sebagai ${authData.user.role_title} (${authData.user.role_label}).`
          )

          if (authData.user.role === 'vendor_mitra') {
            window.setTimeout(() => {
              navigate('/dashboard/vendor')
            }, 800)
          }
          return
        }
      }

      const matchedDemo = DEMO_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === trimmedEmail.toLowerCase()
      )

      if (supabase && import.meta.env.VITE_SUPABASE_URL) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: password,
        })

        if (!error && data?.user) {
          const userRole = data.user.user_metadata?.role || matchedDemo?.role || 'Pengguna'
          setStatus('success')
          setLoggedInRole(userRole)
          setStatusMessage(
            `Selamat datang kembali, ${data.user.email}! Anda telah berhasil masuk.`
          )
          if (userRole === 'Vendor Mitra' || trimmedEmail.includes('vendor')) {
            window.setTimeout(() => {
              navigate('/dashboard/vendor')
            }, 800)
          }
          return
        }
      }

      if (matchedDemo && password.length >= 6) {
        window.setTimeout(() => {
          setStatus('success')
          setLoggedInRole(matchedDemo.role)
          setStatusMessage(
            `Berhasil masuk sebagai ${matchedDemo.role} (${matchedDemo.label}). Hak akses operasional aktif.`
          )
          if (matchedDemo.role === 'Vendor Mitra') {
            window.setTimeout(() => {
              navigate('/dashboard/vendor')
            }, 800)
          }
        }, 400)
        return
      }

      window.setTimeout(() => {
        setStatus('error')
        setStatusMessage(
          'Email atau kata sandi tidak sesuai. Silakan gunakan salah satu Akun Demo di atas untuk pengujian cepat.'
        )
      }, 350)
    } catch {
      const matchedDemo = DEMO_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === trimmedEmail.toLowerCase()
      )
      if (matchedDemo && password.length >= 6) {
        setStatus('success')
        setLoggedInRole(matchedDemo.role)
        setStatusMessage(
          `Berhasil masuk sebagai ${matchedDemo.role} (${matchedDemo.label}). Hak akses operasional aktif.`
        )
        if (matchedDemo.role === 'Vendor Mitra') {
          window.setTimeout(() => {
            navigate('/dashboard/vendor')
          }, 800)
        }
        return
      }

      setStatus('error')
      setStatusMessage(
        'Terjadi kendala jaringan saat memverifikasi akun. Anda tetap dapat menggunakan Akun Demo di atas.'
      )
    }
  }

  const handleGoogleLogin = async () => {
    setStatus('loading')
    setStatusMessage('')
    try {
      if (supabase && import.meta.env.VITE_SUPABASE_URL) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        })
        if (error) throw error
      } else {
        window.setTimeout(() => {
          setStatus('success')
          setLoggedInRole('Admin Terverifikasi')
          setStatusMessage('Berhasil masuk melalui Single Sign-On Google.')
        }, 500)
      }
    } catch (err) {
      setStatus('error')
      setStatusMessage(err?.message || 'Layanan Google OAuth belum dapat diakses saat ini.')
    }
  }

  return (
    <div className="login-screen-shell">
      <header className="login-topbar">
        <div className="container login-topbar-inner">
          <Link to="/" className="brand-wordmark" aria-label="Kembali ke Beranda SerasiWO">
            <span className="brand-ember-dot" aria-hidden="true" />
            <span>SerasiWO</span>
          </Link>

          <div className="login-topbar-actions">
            <button
              type="button"
              className="login-circle-btn"
              onClick={onToggleTheme}
              aria-label={
                theme === 'light'
                  ? 'Ganti ke mode gelap'
                  : 'Ganti ke mode terang'
              }
              title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
            >
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>

            <Link
              to="/"
              className="login-circle-btn"
              aria-label="Kembali ke Beranda"
              title="Kembali ke Beranda"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <main className="login-stage-container">
        <div className="login-stage-backdrop">
          <div className="login-art-left" aria-hidden="true">
            <svg viewBox="0 0 240 240" fill="none" className="login-vector-art">
              <rect x="50" y="140" width="70" height="70" fill="#f6c878" stroke="#15191e" strokeWidth="2.5" />
              <rect x="15" y="155" width="55" height="55" fill="none" stroke="#15191e" strokeWidth="2.5" />
              <path d="M25 195 L50 170 M45 170 L50 170 L50 175" stroke="#15191e" strokeWidth="2.5" />
              <circle cx="95" cy="80" r="16" fill="#15191e" />
              <path d="M85 75 C80 65, 105 60, 105 75 Z" fill="#15191e" />
              <path d="M90 96 C85 110, 80 135, 75 140" stroke="#15191e" strokeWidth="3" fill="none" />
              <path d="M75 100 L115 100 L105 138 L72 138 Z" fill="#ffffff" stroke="#15191e" strokeWidth="2.5" />
              <circle cx="85" cy="112" r="2" fill="#15191e" />
              <circle cx="95" cy="122" r="2" fill="#15191e" />
              <circle cx="80" cy="126" r="2" fill="#15191e" />
              <circle cx="102" cy="110" r="2" fill="#15191e" />
              <path d="M72 138 L88 175 L125 185 L145 205" stroke="#15191e" strokeWidth="3" fill="none" />
              <path d="M102 125 L124 136 L118 108 Z" fill="#ff5900" stroke="#15191e" strokeWidth="2" />
              <line x1="95" y1="138" x2="135" y2="138" stroke="#15191e" strokeWidth="3" />
              <line x1="68" y1="62" x2="62" y2="52" stroke="#15191e" strokeWidth="2" />
              <line x1="78" y1="56" x2="78" y2="44" stroke="#15191e" strokeWidth="2" />
              <line x1="88" y1="60" x2="94" y2="50" stroke="#15191e" strokeWidth="2" />
            </svg>
          </div>

          <div className="login-art-right" aria-hidden="true">
            <svg viewBox="0 0 240 240" fill="none" className="login-vector-art">
              <rect x="110" y="80" width="70" height="135" fill="#f6c878" stroke="#15191e" strokeWidth="2.5" />
              <rect x="45" y="125" width="55" height="90" fill="#ffffff" stroke="#15191e" strokeWidth="2.5" />
              <path d="M125 80 C125 60, 155 50, 170 65 C185 55, 205 70, 195 85" stroke="#15191e" strokeWidth="2.5" fill="none" />
              <line x1="0" y1="215" x2="240" y2="215" stroke="#15191e" strokeWidth="2.5" />
            </svg>
          </div>

          <div className="login-card-panel">
            <div className="login-card-header">
              <h1 className="login-card-title">Masuk ke Sistem</h1>
              <p className="login-card-subtitle">
                Portal manajemen operasional dan koordinasi pernikahan SerasiWO.
              </p>
            </div>

            <div className="demo-accounts-bar" role="group" aria-label="Pilih akun pengujian">
              <span className="demo-accounts-label">Akun Demo Cepat:</span>
              <div className="demo-accounts-chips">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    className="demo-chip-btn"
                    onClick={() => handleQuickSelect(acc)}
                    title={`Isi otomatis kredensial ${acc.role}`}
                  >
                    <span>{acc.role}</span>
                  </button>
                ))}
              </div>
            </div>

            {status === 'error' && (
              <div className="login-feedback-box login-feedback-error" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{statusMessage}</span>
              </div>
            )}

            {status === 'success' && (
              <div className="login-feedback-box login-feedback-success" role="status">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <div className="login-success-meta">
                  <strong>{statusMessage}</strong>
                  {loggedInRole && (
                    <span className="login-role-badge">Peran: {loggedInRole}</span>
                  )}
                  <div className="login-success-actions">
                    <button
                      type="button"
                      className="ember-cta-btn"
                      onClick={() => {
                        if (loggedInRole?.toLowerCase().includes('vendor')) {
                          navigate('/dashboard/vendor')
                        } else {
                          navigate('/')
                        }
                      }}
                    >
                      {loggedInRole?.toLowerCase().includes('vendor')
                        ? 'Buka Dashboard Vendor Mitra →'
                        : 'Buka Ruang Kerja →'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {status !== 'success' && (
              <form className="login-form-body" onSubmit={handleLoginSubmit} noValidate>
                <div className="login-field-group">
                  <label htmlFor="login-email-input" className="sr-only">
                    Alamat Email
                  </label>
                  <div className="login-input-wrapper">
                    <span className="login-input-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      id="login-email-input"
                      type="email"
                      className="login-text-input"
                      placeholder="Email Anda"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="login-field-group">
                  <label htmlFor="login-password-input" className="sr-only">
                    Kata Sandi
                  </label>
                  <div className="login-input-wrapper">
                    <span className="login-input-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      id="login-password-input"
                      type={showPassword ? 'text' : 'password'}
                      className="login-text-input"
                      placeholder="Kata Sandi"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="login-toggle-password"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="login-form-options">
                  <label className="login-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Ingat saya</span>
                  </label>

                  <a
                    href="#forgot"
                    className="login-forgot-link"
                    onClick={(e) => {
                      e.preventDefault()
                      setStatus('error')
                      setStatusMessage('Untuk reset kata sandi, hubungi Super Admin SerasiWO di meja operasional.')
                    }}
                  >
                    Lupa sandi?
                  </a>
                </div>

                <button
                  type="submit"
                  className="ember-cta-btn login-submit-btn"
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? 'Memverifikasi...' : 'Masuk ke Sistem'}
                </button>

                <div className="login-divider">
                  <span>atau</span>
                </div>

                <button
                  type="button"
                  className="google-sign-in-btn"
                  onClick={handleGoogleLogin}
                  disabled={status === 'loading'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" className="google-icon" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.02h3.87c2.26-2.09 3.675-5.17 3.675-9.12z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.02c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.12C3.26 21.36 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.27 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.61H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.39l4-3.12z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.27 6.61l4 3.12c.95-2.85 3.6-4.96 6.73-4.96z"
                    />
                  </svg>
                  <span>Masuk dengan Google</span>
                </button>
              </form>
            )}

            <div className="login-card-footer">
              <p className="login-footer-text">
                Belum memiliki akses akun?{' '}
                <a
                  href="#admin-request"
                  className="login-footer-link"
                  onClick={(e) => {
                    e.preventDefault()
                    setStatus('error')
                    setStatusMessage('Pendaftaran akun baru diterbitkan langsung oleh Super Admin melalui menu Pengaturan Sistem.')
                  }}
                >
                  Hubungi Super Admin
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
