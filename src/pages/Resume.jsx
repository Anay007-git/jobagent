import React, { useState, useEffect } from 'react'
import { useAppContext } from '../App'
import { parseResume } from '../services/resumeParser'
import { saveProfile, saveResumeText, getResumeText } from '../services/storage'
import { FileText, Sparkles, Trash2, Plus, User, Briefcase, GraduationCap, Trophy, Upload, Phone, Globe, Linkedin, Github, DollarSign } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

// Set PDF.js worker (using unpkg for v5+ support and .mjs)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

export default function Resume() {
    const { profile, setProfile, showToast } = useAppContext()
    const [text, setText] = useState('')
    const [analyzing, setAnalyzing] = useState(false)
    const [newSkill, setNewSkill] = useState('')
    const [loaded, setLoaded] = useState(false)
    const [dragActive, setDragActive] = useState(false)

    // Load saved resume text
    useEffect(() => {
        async function load() {
            const saved = await getResumeText()
            if (saved) setText(saved)
            setLoaded(true)
        }
        load()
    }, [])

    const handleAnalyze = async () => {
        if (!text.trim()) { showToast('Please paste or upload a resume', 'error'); return }
        setAnalyzing(true)
        try {
            const parsed = parseResume(text)

            // Merge with existing profile if any manual edits were made? 
            // For now, overwrite but keep ID. 
            // Actually, best to merge: allow parser to fill blanks but not overwrite valid existing data?
            // User asked for "upload feature and fields should be editable".
            // We'll parse, set state, and let user edit.

            setProfile(parsed)
            await saveProfile(parsed)
            await saveResumeText(text)
            showToast('Resume analyzed & saved! Please review details below.', 'success')
        } catch (err) {
            showToast('Analysis failed: ' + err.message, 'error')
        } finally {
            setAnalyzing(false)
        }
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) { showToast('File too large (max 5MB)', 'error'); return }

        setAnalyzing(true)
        try {
            let extractedText = ''
            if (file.type === 'application/pdf') {
                extractedText = await extractPdfText(file)
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                extractedText = await extractDocxText(file)
            } else {
                throw new Error('Unsupported format. Use PDF or DOCX.')
            }

            setText(extractedText)
            const parsed = parseResume(extractedText)
            setProfile(parsed)
            await saveProfile(parsed)
            await saveResumeText(extractedText)
            showToast('File uploaded & parsed successfully!', 'success')
        } catch (err) {
            console.error(err)
            showToast('Upload failed: ' + err.message, 'error')
        } finally {
            setAnalyzing(false)
        }
    }

    // --- Helpers for File Parsing ---

    const extractPdfText = async (file) => {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let fullText = ''

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const content = await page.getTextContent()
            const strings = content.items.map(item => item.str)
            fullText += strings.join(' ') + '\n'
        }
        return fullText
    }

    const extractDocxText = async (file) => {
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        return result.value
    }

    // --- Drag & Drop ---
    const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true); else setDragActive(false); }
    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileUpload({ target: { files: e.dataTransfer.files } }); }

    // --- Editable Field Handler ---
    const updateField = async (field, value) => {
        const updated = { ...profile, [field]: value }
        setProfile(updated)
        // Debounce save? For now save on blur or specific action. 
        // We'll save immediately for simplicity in this MVP.
        await saveProfile(updated)
    }

    const removeSkill = async (skill) => {
        const updated = { ...profile, skills: profile.skills.filter(s => s !== skill) }
        setProfile(updated)
        await saveProfile(updated)
    }

    const addSkill = async () => {
        if (!newSkill.trim() || !profile) return
        if (profile.skills.includes(newSkill.trim())) return
        const updated = { ...profile, skills: [...profile.skills, newSkill.trim()] }
        setProfile(updated)
        setNewSkill('')
        await saveProfile(updated)
    }

    if (!loaded) return <div className="page-loading"><div className="loading-dots"><div></div><div></div><div></div></div></div>

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>Profile & Resume</h1>
                <p>Upload your resume to auto-fill your profile, or edit details manually.</p>
            </div>

            {/* Upload Section */}
            <div
                className={`card upload-zone ${dragActive ? 'active' : ''}`}
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                style={{ marginBottom: 24, padding: 40, textAlign: 'center', border: '2px dashed var(--border-color)', borderRadius: 12, transition: 'var(--transition)' }}
            >
                <input type="file" id="resume-upload" onChange={handleFileUpload} accept=".pdf,.docx" style={{ display: 'none' }} />
                <label htmlFor="resume-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div className="icon-circle" style={{ width: 64, height: 64, background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Upload size={32} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 4 }}>
                            {analyzing ? 'Analyzing...' : 'Click to Upload or Drag & Drop'}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            PDF or DOCX (Max 5MB)
                        </p>
                    </div>
                </label>
            </div>

            {/* Manual Text Fallback */}
            <details style={{ marginBottom: 24, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                <summary style={{ cursor: 'pointer' }}>Or paste text manually</summary>
                <div style={{ marginTop: 12 }}>
                    <textarea
                        className="input"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Paste resume text here..."
                        rows={6}
                        style={{ width: '100%', fontFamily: 'monospace' }}
                    />
                    <button className="btn btn-sm btn-secondary" onClick={handleAnalyze} style={{ marginTop: 8 }}>
                        Analyze Text
                    </button>
                </div>
            </details>

            {profile && (
                <div className="profile-grid-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>

                    {/* Personal Info */}
                    <div className="card">
                        <h3 className="card-title"><User size={18} /> Personal Details</h3>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input className="input" value={profile.name || ''} onChange={e => updateField('name', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input className="input" value={profile.email || ''} onChange={e => updateField('email', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Phone</label>
                            <input className="input" value={profile.phone || ''} onChange={e => updateField('phone', e.target.value)} placeholder="+1 234..." />
                        </div>
                        <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label>City</label>
                                <input className="input" value={profile.city || ''} onChange={e => updateField('city', e.target.value)} />
                            </div>
                            <div>
                                <label>Country</label>
                                <input className="input" value={profile.country || ''} onChange={e => updateField('country', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Professional Info */}
                    <div className="card">
                        <h3 className="card-title"><Briefcase size={18} /> Professional Info</h3>
                        <div className="form-group">
                            <label>Current Role</label>
                            <input className="input" value={profile.current_role || ''} onChange={e => updateField('current_role', e.target.value)} placeholder="e.g. Senior Developer" />
                        </div>
                        <div className="form-group">
                            <label>Current CTC / Salary</label>
                            <input className="input" value={profile.current_ctc || ''} onChange={e => updateField('current_ctc', e.target.value)} placeholder="e.g. $120k or 20 LPA" />
                        </div>
                        <div className="form-group">
                            <label>Experience (Years)</label>
                            <input type="number" className="input" value={profile.yearsOfExperience || 0} onChange={e => updateField('yearsOfExperience', parseInt(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label>Domains</label>
                            <input className="input" value={profile.domains?.join(', ') || ''} disabled placeholder="Auto-detected" />
                        </div>
                    </div>

                    {/* Links */}
                    <div className="card">
                        <h3 className="card-title"><Globe size={18} /> Social Links</h3>
                        <div className="form-group">
                            <label><Linkedin size={14} /> LinkedIn</label>
                            <input className="input" value={profile.linkedin_url || ''} onChange={e => updateField('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." />
                        </div>
                        <div className="form-group">
                            <label><Github size={14} /> GitHub</label>
                            <input className="input" value={profile.github_url || ''} onChange={e => updateField('github_url', e.target.value)} placeholder="https://github.com/..." />
                        </div>
                        <div className="form-group">
                            <label><Globe size={14} /> Portfolio / Website</label>
                            <input className="input" value={profile.portfolio_url || ''} onChange={e => updateField('portfolio_url', e.target.value)} placeholder="https://..." />
                        </div>
                    </div>

                    {/* Skills */}
                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <h3 className="card-title"><Sparkles size={18} /> Skills & Achievements</h3>
                        <div className="skill-chips" style={{ marginBottom: 24 }}>
                            {profile.skills?.map(skill => (
                                <span key={skill} className="skill-chip">
                                    {skill}
                                    <span className="remove" onClick={() => removeSkill(skill)}>×</span>
                                </span>
                            ))}
                            <div style={{ display: 'flex', gap: 4 }}>
                                <input
                                    value={newSkill}
                                    onChange={e => setNewSkill(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addSkill()}
                                    placeholder="Add skill..."
                                    style={{ width: 140, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                />
                                <button className="btn btn-ghost btn-sm" onClick={addSkill}><Plus size={16} /></button>
                            </div>
                        </div>

                        <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
                            <Trophy size={14} style={{ verticalAlign: -2 }} /> Key Achievements (Auto-extracted)
                        </label>
                        <ul style={{ paddingLeft: 20, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            {profile.achievements?.map((a, i) => <li key={i}>{a}</li>) || <li>No achievements detected</li>}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    )
}
