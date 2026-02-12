import React, { useState } from 'react'
import { useAppContext } from '../App'
import { searchJobs, JOB_CATEGORIES } from '../services/jobSearch'
import { rankJobs } from '../services/jobMatcher'
import { generateCoverLetter, generateEmailDraft, generateRecruiterMessage } from '../services/applicationGenerator'
import { addApplication } from '../services/storage'
import JobCard from '../components/JobCard'
import Modal from '../components/Modal'
import ScoreBadge from '../components/ScoreBadge'
import { Search, MapPin, Copy, Check, Wifi, Briefcase } from 'lucide-react'

export default function JobSearch() {
    const { profile, applications, setApplications, showToast } = useAppContext()

    // Load state from sessionStorage if available
    const savedState = JSON.parse(sessionStorage.getItem('job_search_state') || '{}')

    const [query, setQuery] = useState(savedState.query || '')
    const [location, setLocation] = useState(savedState.location || '')
    const [empType, setEmpType] = useState(savedState.empType || '')
    const [remoteOnly, setRemoteOnly] = useState(savedState.remoteOnly || false)
    const [category, setCategory] = useState(savedState.category || 'all')
    const [jobs, setJobs] = useState(savedState.jobs || [])

    const [loading, setLoading] = useState(false)
    const [selectedJob, setSelectedJob] = useState(null)
    const [activeTab, setActiveTab] = useState('details')
    const [copied, setCopied] = useState('')

    // Persist state changes
    React.useEffect(() => {
        const stateToSave = { query, location, empType, remoteOnly, category, jobs }
        sessionStorage.setItem('job_search_state', JSON.stringify(stateToSave))
    }, [query, location, empType, remoteOnly, category, jobs])

    const handleSearch = async () => {
        if (!query.trim()) { showToast('Enter a job title or keywords', 'error'); return }
        setLoading(true)
        try {
            const raw = await searchJobs({ query, location, employmentType: empType, remoteOnly, category })
            const ranked = profile
                ? rankJobs(raw, profile)
                : raw.map(j => ({ ...j, matchResult: { total: 0, factors: {}, explanation: '' } }))
            setJobs(ranked)
            if (ranked.length === 0) showToast('No jobs found. Try different keywords.', 'info')
            else showToast(`Found ${ranked.length} jobs!`, 'success')
        } catch (err) {
            showToast(err.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    const isSaved = (job) => applications.some(a => a.id === job.id)

    const handleSave = async (job) => {
        if (isSaved(job)) return
        const app = {
            id: job.id, title: job.title, company: job.company,
            location: job.location, salary: job.salary,
            applyLink: job.applyLink, status: 'saved',
            matchScore: job.matchResult?.total || 0,
            savedAt: new Date().toISOString(), notes: '',
        }
        const updated = await addApplication(app)
        setApplications(updated)
        showToast(`Saved "${job.title}" at ${job.company}`, 'success')
    }

    const handleCopy = (text, label) => {
        navigator.clipboard.writeText(text)
        setCopied(label)
        setTimeout(() => setCopied(''), 2000)
        showToast(`${label} copied to clipboard!`, 'success')
    }

    const coverLetter = selectedJob && profile ? generateCoverLetter(selectedJob, profile) : ''
    const emailDraft = selectedJob && profile ? generateEmailDraft(selectedJob, profile) : ''
    const recruiterMsg = selectedJob && profile ? generateRecruiterMessage(selectedJob, profile) : ''

    return (
        <div>
            <div className="page-header">
                <h1>Job Search</h1>
                <p>Search real jobs from Remotive & Arbeitnow — 100% free, no API key needed</p>
            </div>

            {/* Search bar */}
            <div className="search-bar" style={{ marginBottom: 16 }}>
                <Search size={20} />
                <input
                    value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Job title, keywords, or company..."
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
                    {loading ? 'Searching…' : 'Search'}
                </button>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text" value={location} onChange={e => setLocation(e.target.value)}
                        placeholder="Location" style={{ minWidth: 140 }}
                    />
                </div>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                    {JOB_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select value={empType} onChange={e => setEmpType(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="FULL">Full-time</option>
                    <option value="PART">Part-time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERN">Internship</option>
                </select>
                <button className={`filter-toggle ${remoteOnly ? 'active' : ''}`} onClick={() => setRemoteOnly(!remoteOnly)}>
                    <Wifi size={14} /> Remote Only
                </button>
                {!profile && (
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-amber)' }}>
                        ⚠ Add your resume for match scores
                    </span>
                )}
            </div>

            {/* Results */}
            {loading ? (
                <div className="loading-dots"><span /><span /><span /></div>
            ) : jobs.length > 0 ? (
                <>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 16 }}>
                        {jobs.length} results from Remotive & Arbeitnow
                    </p>
                    <div className="jobs-grid animate-in">
                        {jobs.map(job => (
                            <JobCard key={job.id} job={job} onView={setSelectedJob} onSave={handleSave} saved={isSaved(job)} />
                        ))}
                    </div>
                </>
            ) : (
                <div className="empty-state">
                    <Briefcase />
                    <h3>Search for Jobs</h3>
                    <p>Enter a job title or keywords above to discover opportunities. No API key needed — it's 100% free!</p>
                </div>
            )}

            {/* Detail modal */}
            <Modal
                isOpen={!!selectedJob}
                onClose={() => { setSelectedJob(null); setActiveTab('details') }}
                title={selectedJob?.title || ''}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => { setSelectedJob(null); setActiveTab('details') }}>Close</button>
                        {selectedJob?.applyLink && (
                            <a href={selectedJob.applyLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Apply Externally ↗</a>
                        )}
                    </>
                }
            >
                {selectedJob && (
                    <>
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{selectedJob.company}</div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>
                                    {selectedJob.location} • {selectedJob.salary || 'Salary not specified'} • via {selectedJob.source}
                                </div>
                            </div>
                            {selectedJob.matchResult && selectedJob.matchResult.total > 0 && <ScoreBadge score={selectedJob.matchResult.total} />}
                        </div>

                        {/* Score breakdown */}
                        {selectedJob.matchResult?.factors && Object.keys(selectedJob.matchResult.factors).length > 0 && (
                            <div className="score-breakdown" style={{ marginBottom: 20 }}>
                                {Object.entries(selectedJob.matchResult.factors).map(([key, f]) => (
                                    <div key={key} className="score-factor">
                                        <span className="score-factor-label">{f.label} ({f.weight}%)</span>
                                        <div className="score-bar-bg">
                                            <div className={`score-bar-fill ${key === 'skills' ? 'blue' : key === 'experience' ? 'purple' : key === 'role' ? 'cyan' : key === 'location' ? 'green' : 'amber'}`}
                                                style={{ width: `${f.score}%` }} />
                                        </div>
                                        <span className="score-factor-value">{f.score}%</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="tabs">
                            {['details', 'cover-letter', 'email', 'recruiter'].map(t => (
                                <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                                    {t === 'details' ? 'Description' : t === 'cover-letter' ? 'Cover Letter' : t === 'email' ? 'Email Draft' : 'Recruiter Msg'}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'details' && (
                            <div style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.7, color: 'var(--text-secondary)', maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                                {selectedJob.description || 'No description available.'}
                            </div>
                        )}

                        {activeTab === 'cover-letter' && (
                            <div className="generated-text">
                                {profile ? coverLetter : 'Add your resume to generate a cover letter.'}
                                {profile && (
                                    <button className="btn btn-sm btn-secondary copy-btn" onClick={() => handleCopy(coverLetter, 'Cover letter')} style={{ opacity: 1 }}>
                                        {copied === 'Cover letter' ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                )}
                            </div>
                        )}

                        {activeTab === 'email' && (
                            <div className="generated-text">
                                {profile ? emailDraft : 'Add your resume to generate an email draft.'}
                                {profile && (
                                    <button className="btn btn-sm btn-secondary copy-btn" onClick={() => handleCopy(emailDraft, 'Email draft')} style={{ opacity: 1 }}>
                                        {copied === 'Email draft' ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                )}
                            </div>
                        )}

                        {activeTab === 'recruiter' && (
                            <div className="generated-text">
                                {profile ? recruiterMsg : 'Add your resume to generate a recruiter message.'}
                                {profile && (
                                    <button className="btn btn-sm btn-secondary copy-btn" onClick={() => handleCopy(recruiterMsg, 'Recruiter message')} style={{ opacity: 1 }}>
                                        {copied === 'Recruiter message' ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </Modal>
        </div>
    )
}
