import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, Eye, EyeOff, User, Briefcase } from 'lucide-react'

export default function Signup() {
    const { signUpWithEmail, signInWithGoogle } = useAuth()
    const navigate = useNavigate()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSignup = async (e) => {
        e.preventDefault()
        if (!email || !password) { setError('Please fill in all fields'); return }
        if (password.length < 6) { setError('Password must be at least 6 characters'); return }
        setLoading(true)
        setError('')
        try {
            await signUpWithEmail(email, password, name)
            setSuccess(true)
        } catch (err) {
            setError(err.message || 'Sign up failed')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogle = async () => {
        setError('')
        try {
            await signInWithGoogle()
        } catch (err) {
            const msg = err.message || ''
            if (msg.includes('provider') || msg.includes('not enabled')) {
                setError('Google sign-in is not enabled yet. Please use email/password, or enable Google in your Supabase dashboard → Authentication → Providers.')
            } else {
                setError(msg || 'Google sign-in failed')
            }
        }
    }

    if (success) {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div className="sidebar-logo" style={{ margin: '0 auto 16px', width: 48, height: 48 }}>
                        <Briefcase size={24} />
                    </div>
                    <h2 style={{ marginBottom: 12 }}>Check Your Email ✉️</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.6, marginBottom: 24 }}>
                        We've sent a confirmation link to <strong>{email}</strong>.<br />
                        Click the link to activate your account.
                    </p>
                    <Link to="/login" className="btn btn-primary">Go to Login</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div className="sidebar-logo" style={{ margin: '0 auto 12px', width: 48, height: 48 }}>
                        <Briefcase size={24} />
                    </div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 4 }}>Create Account</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        Start your AI-powered job search
                    </p>
                </div>

                {/* Google button */}
                <button className="btn-google" onClick={handleGoogle}>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </button>

                {/* Divider */}
                <div className="auth-divider">
                    <span>or sign up with email</span>
                </div>

                <form onSubmit={handleSignup}>
                    <div className="auth-field">
                        <User size={16} className="auth-field-icon" />
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Full name"
                            autoComplete="name"
                        />
                    </div>

                    <div className="auth-field">
                        <Mail size={16} className="auth-field-icon" />
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="Email address"
                            autoComplete="email"
                        />
                    </div>

                    <div className="auth-field">
                        <Lock size={16} className="auth-field-icon" />
                        <input
                            type={showPw ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Password (min. 6 characters)"
                            autoComplete="new-password"
                        />
                        <button type="button" className="auth-field-toggle" onClick={() => setShowPw(!showPw)}>
                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account? <Link to="/login">Sign In</Link>
                </p>
            </div>
        </div>
    )
}
