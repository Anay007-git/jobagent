import React from 'react'
import { MapPin, Clock, Building2, DollarSign, ExternalLink, Bookmark } from 'lucide-react'
import ScoreBadge from './ScoreBadge'

export default function JobCard({ job, onView, onSave, saved }) {
    return (
        <div className="job-card" onClick={() => onView?.(job)}>
            <div className="job-card-header">
                <div>
                    <div className="job-card-title">{job.title}</div>
                    <div className="job-card-company">
                        <Building2 size={14} />
                        {job.company}
                    </div>
                </div>
                {job.matchResult && <ScoreBadge score={job.matchResult.total} />}
            </div>

            <div className="job-card-meta">
                <span><MapPin size={13} /> {job.location}</span>
                {job.salary && <span><DollarSign size={13} /> {job.salary}</span>}
                <span><Clock size={13} /> {job.employmentType?.replace('FULLTIME', 'Full-time').replace('PARTTIME', 'Part-time').replace('CONTRACTOR', 'Contract').replace('INTERN', 'Internship')}</span>
            </div>

            {job.skills?.length > 0 && (
                <div className="job-card-skills">
                    {job.skills.slice(0, 6).map(s => (
                        <span key={s} className="badge badge-blue">{s}</span>
                    ))}
                </div>
            )}

            {job.matchResult?.explanation && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 12, lineHeight: 1.5 }}>
                    {job.matchResult.explanation}
                </p>
            )}

            <div className="job-card-actions" onClick={e => e.stopPropagation()}>
                <button
                    className={`btn btn-sm ${saved ? 'btn-success' : 'btn-secondary'}`}
                    onClick={() => onSave?.(job)}
                >
                    <Bookmark size={14} />
                    {saved ? 'Saved' : 'Save'}
                </button>
                {job.applyLink && (
                    <a
                        href={job.applyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-primary"
                    >
                        <ExternalLink size={14} />
                        Apply
                    </a>
                )}
            </div>
        </div>
    )
}
