import React from 'react'

export default function ScoreBadge({ score }) {
    const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'
    return (
        <div className={`score-badge ${level}`} title={`Match score: ${score}%`}>
            {score}%
        </div>
    )
}
