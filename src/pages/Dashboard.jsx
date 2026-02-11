import React from 'react'
import { useAppContext } from '../App'
import JobAgentSettings from '../components/JobAgentSettings'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Send, Users, XCircle, TrendingUp, FileText, Search } from 'lucide-react'

export default function Dashboard() {
    const { profile, applications } = useAppContext()
    const navigate = useNavigate()

    const stats = {
        total: applications.length,
        applied: applications.filter(a => a.status === 'applied').length,
        interview: applications.filter(a => a.status === 'interview').length,
        offer: applications.filter(a => a.status === 'offer').length,
        rejected: applications.filter(a => a.status === 'rejected').length,
        saved: applications.filter(a => a.status === 'saved').length,
    }

    return (
        <div>
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Your job search at a glance</p>
            </div>

            {/* Stats */}
            <div className="stats-grid animate-in">
                <div className="stat-card">
                    <div className="stat-icon blue"><Briefcase size={22} /></div>
                    <div className="stat-info">
                        <h3>Total Tracked</h3>
                        <div className="stat-value">{stats.total}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple"><Send size={22} /></div>
                    <div className="stat-info">
                        <h3>Applied</h3>
                        <div className="stat-value">{stats.applied}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon amber"><Users size={22} /></div>
                    <div className="stat-info">
                        <h3>Interviews</h3>
                        <div className="stat-value">{stats.interview}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><TrendingUp size={22} /></div>
                    <div className="stat-info">
                        <h3>Offers</h3>
                        <div className="stat-value">{stats.offer}</div>
                    </div>
                </div>
            </div>

            {/* Quick actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
                {!profile ? (
                    <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>
                        <FileText size={40} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                        <h3 style={{ marginBottom: 8 }}>Get Started</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                            Upload your resume to unlock personalized job matching and application generation.
                        </p>
                        <button className="btn btn-primary btn-lg" onClick={() => navigate('/resume')}>
                            <FileText size={18} /> Add Your Resume
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="card">
                            <h3 style={{ marginBottom: 12, fontSize: 'var(--font-size-base)' }}>Your Profile</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>{profile.name || 'No name'}</strong>
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                    {profile.seniority} • {profile.yearsOfExperience || 0} years experience
                                </div>
                                <div className="skill-chips" style={{ marginTop: 4 }}>
                                    {(profile.skills || []).slice(0, 5).map(s => (
                                        <span key={s} className="skill-chip">{s}</span>
                                    ))}
                                    {(profile.skills || []).length > 5 && (
                                        <span className="skill-chip" style={{ opacity: 0.6 }}>
                                            +{profile.skills.length - 5} more
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate('/resume')}>
                                Edit Profile →
                            </button>
                        </div>
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            <Search size={32} style={{ color: 'var(--accent-blue)', marginBottom: 12 }} />
                            <h3 style={{ marginBottom: 8, fontSize: 'var(--font-size-base)' }}>Find Jobs</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 16 }}>
                                Search for jobs matched to your profile
                            </p>
                            <button className="btn btn-primary" onClick={() => navigate('/jobs')}>
                                <Search size={16} /> Search Jobs
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Job Agent Settings */}
            {profile && <JobAgentSettings profile={profile} />}

            {/* Recent applications */}
            {applications.length > 0 && (
                <div className="card">
                    <h3 style={{ marginBottom: 16, fontSize: 'var(--font-size-base)' }}>Recent Applications</h3>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Position</th>
                                    <th>Company</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applications.slice(0, 5).map(app => (
                                    <tr key={app.id}>
                                        <td style={{ fontWeight: 500 }}>{app.title}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{app.company}</td>
                                        <td>
                                            <div className="status-column">
                                                <span className={`status-dot ${app.status}`} />
                                                <span style={{ textTransform: 'capitalize' }}>{app.status}</span>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                                            {new Date(app.savedAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {applications.length > 5 && (
                        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => navigate('/applications')}>
                            View All ({applications.length}) →
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
