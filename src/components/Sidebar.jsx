import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
    LayoutDashboard,
    FileText,
    Search,
    FolderKanban,
    Settings,
    PanelLeftClose,
    PanelLeft,
    Briefcase,
    LogOut,
} from 'lucide-react'

const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/resume', icon: FileText, label: 'Resume' },
    { to: '/jobs', icon: Search, label: 'Job Search' },
    { to: '/applications', icon: FolderKanban, label: 'Applications' },
    { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar({ collapsed, onToggle }) {
    const { user, signOut } = useAuth()

    const handleLogout = async () => {
        try {
            await signOut()
        } catch (err) {
            console.error('Logout error:', err)
        }
    }

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <Briefcase size={20} />
                </div>
                {!collapsed && <span className="sidebar-brand">JobAgent</span>}
                <button className="sidebar-toggle" onClick={onToggle}>
                    {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
                </button>
            </div>

            <nav className="sidebar-nav">
                {links.map(({ to, icon: Icon, label }) => (
                    <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                        <Icon size={18} />
                        {!collapsed && <span>{label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* User info + logout */}
            <div className="sidebar-footer">
                {user && (
                    <>
                        <div className="sidebar-user">
                            <div className="sidebar-avatar">
                                {(user.user_metadata?.name || user.email || '?')[0].toUpperCase()}
                            </div>
                            {!collapsed && (
                                <div className="sidebar-user-info">
                                    <span className="sidebar-user-name">
                                        {user.user_metadata?.name || 'User'}
                                    </span>
                                    <span className="sidebar-user-email">
                                        {user.email}
                                    </span>
                                </div>
                            )}
                        </div>
                        <button className="sidebar-link logout-btn" onClick={handleLogout} title="Sign Out">
                            <LogOut size={18} />
                            {!collapsed && <span>Sign Out</span>}
                        </button>
                    </>
                )}
            </div>
        </aside>
    )
}
