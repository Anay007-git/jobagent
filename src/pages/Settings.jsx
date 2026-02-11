import React, { useState } from 'react'
import { useAppContext } from '../App'
import { saveSettings } from '../services/storage'
import { Settings as SettingsIcon, MapPin, Save, Globe, Info } from 'lucide-react'

export default function Settings() {
    const { settings, setSettings, showToast } = useAppContext()
    const [form, setForm] = useState({ ...settings })
    const [locationInput, setLocationInput] = useState('')

    const handleSave = () => {
        saveSettings(form)
        setSettings(form)
        showToast('Settings saved!', 'success')
    }

    const addLocation = () => {
        if (!locationInput.trim()) return
        if (form.preferredLocations.includes(locationInput.trim())) return
        setForm({ ...form, preferredLocations: [...form.preferredLocations, locationInput.trim()] })
        setLocationInput('')
    }

    const removeLocation = (loc) => {
        setForm({ ...form, preferredLocations: form.preferredLocations.filter(l => l !== loc) })
    }

    return (
        <div>
            <div className="page-header">
                <h1>Settings</h1>
                <p>Configure your job search preferences</p>
            </div>

            {/* Free API info */}
            <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--accent-green)' }}>
                    <Globe size={18} /> API Status — Free & Ready
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    JobAgent uses <strong>Remotive</strong> and <strong>Arbeitnow</strong> — completely free, open APIs that require <strong>no API key</strong>. You can start searching immediately!
                </p>
                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                    <a href="https://remotive.com" target="_blank" rel="noopener noreferrer" className="badge badge-green" style={{ textDecoration: 'none' }}>
                        Remotive ↗
                    </a>
                    <a href="https://www.arbeitnow.com" target="_blank" rel="noopener noreferrer" className="badge badge-blue" style={{ textDecoration: 'none' }}>
                        Arbeitnow ↗
                    </a>
                </div>
            </div>

            {/* Job Preferences */}
            <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <SettingsIcon size={18} /> Job Preferences
                </h3>

                <div className="profile-grid" style={{ marginBottom: 20 }}>
                    <div className="input-group">
                        <label>Remote Preference</label>
                        <select value={form.remotePreference} onChange={e => setForm({ ...form, remotePreference: e.target.value })}>
                            <option value="any">Any (Remote & On-site)</option>
                            <option value="remote">Remote Only</option>
                            <option value="onsite">On-site Only</option>
                            <option value="hybrid">Hybrid</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Min Salary ($)</label>
                        <input
                            type="number"
                            value={form.salaryMin || ''}
                            onChange={e => setForm({ ...form, salaryMin: Number(e.target.value) })}
                            placeholder="e.g. 80000"
                        />
                    </div>
                </div>

                {/* Preferred locations */}
                <div className="input-group" style={{ marginBottom: 12 }}>
                    <label><MapPin size={14} style={{ verticalAlign: -2 }} /> Preferred Locations</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            type="text"
                            value={locationInput}
                            onChange={e => setLocationInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addLocation()}
                            placeholder="Add a city or region…"
                            style={{ flex: 1 }}
                        />
                        <button className="btn btn-secondary btn-sm" onClick={addLocation}>Add</button>
                    </div>
                </div>
                {form.preferredLocations?.length > 0 && (
                    <div className="skill-chips">
                        {form.preferredLocations.map(loc => (
                            <span key={loc} className="skill-chip">
                                {loc}
                                <span className="remove" onClick={() => removeLocation(loc)}>×</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Company preferences */}
            <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Info size={18} /> About JobAgent
                </h3>
                <ul style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 20 }}>
                    <li><strong>Privacy First</strong> — All data stays in your browser (localStorage)</li>
                    <li><strong>No Auto-Apply</strong> — We generate materials; you choose when to apply</li>
                    <li><strong>Free Forever</strong> — Uses open APIs, no paid subscriptions</li>
                    <li><strong>Human in the Loop</strong> — You always approve before any action</li>
                </ul>
            </div>

            <button className="btn btn-primary btn-lg" onClick={handleSave}>
                <Save size={18} /> Save Settings
            </button>
        </div>
    )
}
