import React, { createContext, useContext, useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { getProfile, getApplications, getSettings } from './services/storage'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Resume from './pages/Resume'
import JobSearch from './pages/JobSearch'
import Applications from './pages/Applications'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Signup from './pages/Signup'
import './index.css'

// App-level context
const AppContext = createContext(null)
export function useAppContext() {
    return useContext(AppContext)
}

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return <div className="loading-dots"><span /><span /><span /></div>
    if (!user) return <Navigate to="/login" replace />
    return children
}

function AppShell() {
    const { user, loading } = useAuth()
    const location = useLocation()
    const [profile, setProfile] = useState(null)
    const [applications, setApplications] = useState([])
    const [settings, setSettings] = useState(getSettings())
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [toast, setToast] = useState(null)
    const [dataLoading, setDataLoading] = useState(true)

    const showToast = (message, type = 'info') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    // Load user data from Supabase when logged in
    useEffect(() => {
        if (!user) { setDataLoading(false); return }
        let cancelled = false
        async function loadData() {
            setDataLoading(true)
            try {
                const [p, a] = await Promise.all([getProfile(), getApplications()])
                if (!cancelled) {
                    setProfile(p)
                    setApplications(a)
                }
            } catch (err) {
                console.error('Failed to load data:', err)
            } finally {
                if (!cancelled) setDataLoading(false)
            }
        }
        loadData()
        return () => { cancelled = true }
    }, [user])

    // Auth pages (no sidebar)
    const isAuthPage = ['/login', '/signup'].includes(location.pathname)

    if (loading) {
        return <div className="auth-page"><div className="loading-dots"><span /><span /><span /></div></div>
    }

    if (isAuthPage) {
        return (
            <Routes>
                <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
                <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
            </Routes>
        )
    }

    return (
        <AppContext.Provider value={{ profile, setProfile, applications, setApplications, settings, setSettings, showToast, dataLoading }}>
            <div className="app-layout">
                <Sidebar collapsed={!sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
                <main className="main-content">
                    {dataLoading ? (
                        <div className="loading-dots" style={{ marginTop: 80 }}><span /><span /><span /></div>
                    ) : (
                        <Routes>
                            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                            <Route path="/resume" element={<ProtectedRoute><Resume /></ProtectedRoute>} />
                            <Route path="/jobs" element={<ProtectedRoute><JobSearch /></ProtectedRoute>} />
                            <Route path="/applications" element={<ProtectedRoute><Applications /></ProtectedRoute>} />
                            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    )}
                </main>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`toast toast-${toast.type} animate-in`}>
                    {toast.message}
                </div>
            )}
        </AppContext.Provider>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <AppShell />
        </AuthProvider>
    )
}
