import React, { useState } from 'react'
import { useAppContext } from '../App'
import { updateApplication, removeApplication } from '../services/storage'
import Modal from '../components/Modal'
import { FolderKanban, Trash2, ExternalLink, MessageSquare, Save } from 'lucide-react'

const STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected']

export default function Applications() {
    const { applications, setApplications, showToast } = useAppContext()
    const [filterStatus, setFilterStatus] = useState('all')
    const [selectedApp, setSelectedApp] = useState(null)
    const [notes, setNotes] = useState('')
    const [busy, setBusy] = useState(false)

    const filtered = filterStatus === 'all'
        ? applications
        : applications.filter(a => a.status === filterStatus)

    const handleStatusChange = async (id, status) => {
        setBusy(true)
        const updated = await updateApplication(id, { status })
        setApplications(updated)
        if (selectedApp?.id === id) setSelectedApp({ ...selectedApp, status })
        showToast(`Status updated to "${status}"`, 'success')
        setBusy(false)
    }

    const handleDelete = async (id) => {
        setBusy(true)
        const updated = await removeApplication(id)
        setApplications(updated)
        setSelectedApp(null)
        showToast('Application removed', 'info')
        setBusy(false)
    }

    const handleSaveNotes = async () => {
        if (!selectedApp) return
        setBusy(true)
        const updated = await updateApplication(selectedApp.id, { notes })
        setApplications(updated)
        showToast('Notes saved', 'success')
        setBusy(false)
    }

    const openDetail = (app) => {
        setSelectedApp(app)
        setNotes(app.notes || '')
    }

    return (
        <div>
            <div className="page-header">
                <h1>Applications</h1>
                <p>Track your job applications and their progress</p>
            </div>

            {/* Status filters */}
            <div className="tabs" style={{ marginBottom: 24 }}>
                <button className={`tab ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>
                    All ({applications.length})
                </button>
                {STATUSES.map(s => {
                    const count = applications.filter(a => a.status === s).length
                    return (
                        <button key={s} className={`tab ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
                            {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
                        </button>
                    )
                })}
            </div>

            {/* Table */}
            {filtered.length > 0 ? (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Position</th>
                                <th>Company</th>
                                <th>Location</th>
                                <th>Score</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="animate-in">
                            {filtered.map(app => (
                                <tr key={app.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(app)}>
                                    <td style={{ fontWeight: 500 }}>{app.title}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{app.company}</td>
                                    <td style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>{app.location}</td>
                                    <td>
                                        {app.matchScore > 0 && (
                                            <span className={`badge ${app.matchScore >= 70 ? 'badge-green' : app.matchScore >= 40 ? 'badge-amber' : 'badge-red'}`}>
                                                {app.matchScore}%
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <select
                                            value={app.status}
                                            onClick={e => e.stopPropagation()}
                                            onChange={e => handleStatusChange(app.id, e.target.value)}
                                            disabled={busy}
                                            style={{ width: 'auto', padding: '4px 28px 4px 8px', fontSize: 'var(--font-size-xs)' }}
                                        >
                                            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                                        {new Date(app.savedAt).toLocaleDateString()}
                                    </td>
                                    <td onClick={e => e.stopPropagation()}>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {app.applyLink && (
                                                <a href={app.applyLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="Open">
                                                    <ExternalLink size={14} />
                                                </a>
                                            )}
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(app.id)} title="Remove" disabled={busy}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-state">
                    <FolderKanban />
                    <h3>No Applications Yet</h3>
                    <p>Save jobs from the search page to start tracking your applications here.</p>
                </div>
            )}

            {/* Detail modal */}
            <Modal
                isOpen={!!selectedApp}
                onClose={() => setSelectedApp(null)}
                title="Application Details"
                footer={
                    <>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selectedApp?.id)} disabled={busy}>
                            <Trash2 size={14} /> Remove
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={handleSaveNotes} disabled={busy}>
                            <Save size={14} /> Save Notes
                        </button>
                    </>
                }
            >
                {selectedApp && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div>
                            <h3 style={{ marginBottom: 4 }}>{selectedApp.title}</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>{selectedApp.company} • {selectedApp.location}</p>
                            {selectedApp.salary && <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>{selectedApp.salary}</p>}
                        </div>

                        <div className="profile-grid">
                            <div className="profile-field">
                                <label>Status</label>
                                <select value={selectedApp.status} onChange={e => handleStatusChange(selectedApp.id, e.target.value)} disabled={busy} style={{ width: 'auto' }}>
                                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                </select>
                            </div>
                            <div className="profile-field">
                                <label>Match Score</label>
                                <div className="value">
                                    {selectedApp.matchScore > 0 ? (
                                        <span className={`badge ${selectedApp.matchScore >= 70 ? 'badge-green' : selectedApp.matchScore >= 40 ? 'badge-amber' : 'badge-red'}`}>
                                            {selectedApp.matchScore}%
                                        </span>
                                    ) : '—'}
                                </div>
                            </div>
                            <div className="profile-field">
                                <label>Saved Date</label>
                                <div className="value">{new Date(selectedApp.savedAt).toLocaleDateString()}</div>
                            </div>
                        </div>

                        <div className="input-group">
                            <label><MessageSquare size={14} style={{ verticalAlign: -2 }} /> Notes & Feedback</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Add notes about this application... interview feedback, recruiter contacts, etc."
                                rows={5}
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
