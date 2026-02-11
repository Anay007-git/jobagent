// ===================================================
// Resume Parser — Extracts profile from text
// Now supports: Phone, Links, Location, Role, CTC
// ===================================================

export function parseResume(text) {
    if (!text) throw new Error('No text provided')

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (text.length < 50) throw new Error('Text too short to analyze')

    // --- Extract Basic Info ---
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    const phoneMatch = text.match(/(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/)

    // Name heuristic: First non-empty line that isn't a label
    const name = lines.find(l => l.length > 2 && l.length < 50 && !l.includes('@') && !l.match(/resume|cv|curriculum/i)) || 'Unknown'

    // --- Extract Links ---
    const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i)
    const githubMatch = text.match(/github\.com\/[a-zA-Z0-9_-]+/i)
    const portfolioMatch = text.match(/(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[a-zA-Z0-9_-]+)*\/?/g)
        ?.find(url => !url.includes('linkedin') && !url.includes('github') && !url.includes('google') && !url.includes('facebook'))

    // --- Extract Location (Heuristic) ---
    // Look for "City, Country" or "City, State" patterns
    const locationMatch = text.match(/([A-Z][a-zA-Z\s]+),\s*([A-Z][a-zA-Z\s]+)/)

    // --- Extract Experience & Skills ---
    const experienceSection = text.match(/(?:experience|employment|work history)([\s\S]*?)(?:education|skills|projects|$)/i)?.[1] || ''
    const yearsMatch = experienceSection.match(/(\d+)\s+years?/i)
    const years = yearsMatch ? parseInt(yearsMatch[1]) : 0

    // Detect skills from keywords
    const detectedSkills = SKILL_KEYWORDS.filter(skill =>
        new RegExp(`\\b${skill}\\b`, 'i').test(text)
    )

    // Detect Domain
    const domains = DOMAIN_KEYWORDS.filter(d =>
        d.keywords.some(k => new RegExp(`\\b${k}\\b`, 'i').test(text))
    ).map(d => d.name)

    // Detect Seniority
    let seniority = 'Junior'
    if (years > 5 || text.match(/senior|lead|principal|architect|manager/i)) seniority = 'Senior'
    else if (years > 2) seniority = 'Mid-Level'

    // --- Extract Current Role & CTC (Heuristic) ---
    // Look for "Current Role: X" or just the first job title in experience
    const currentRoleMatch = text.match(/(?:current role|position|title):\s*([a-zA-Z\s]+)/i)
        || experienceSection.match(/^([a-zA-Z\s]+)(?:\s+at|\s+[-–]\s+)/m)

    // Look for CTC/Salary patterns like "CTC: 20LPA" or "$100k"
    const ctcMatch = text.match(/(?:ctc|salary|package):\s*([$€£]?\d+(?:,\d{3})*(?:\.\d+)?\s*[kK|LPA|L|M]?)/i)

    return {
        name: name.replace(/[^a-zA-Z\s]/g, '').trim(),
        email: emailMatch ? emailMatch[0] : '',
        phone: phoneMatch ? phoneMatch[0] : '',
        city: locationMatch ? locationMatch[1].trim() : '',
        country: locationMatch ? locationMatch[2].trim() : '',
        linkedin_url: linkedinMatch ? (linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`) : '',
        github_url: githubMatch ? (githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`) : '',
        portfolio_url: portfolioMatch ? (portfolioMatch.startsWith('http') ? portfolioMatch : `https://${portfolioMatch}`) : '',
        current_role: currentRoleMatch ? currentRoleMatch[1].trim() : '',
        current_ctc: ctcMatch ? ctcMatch[1].trim() : '',
        skills: [...new Set(detectedSkills)],
        yearsOfExperience: years,
        seniority,
        domains: [...new Set(domains)],
        achievements: extractAchievements(experienceSection),
        summary: text.slice(0, 300).replace(/\n/g, ' ') + '...'
    }
}

function extractAchievements(text) {
    return text
        .split('\n')
        .filter(l => l.match(/improved|increased|reduced|led|built|launched|managed/i))
        .map(l => l.replace(/^[•\-\*]\s*/, '').trim())
        .slice(0, 3)
}

// --- Keywords (same as before) ---
const SKILL_KEYWORDS = [
    'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java', 'C++', 'Go', 'Rust',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL',
    'Redis', 'GraphQL', 'REST', 'CI/CD', 'Git', 'Agile', 'Scrum', 'TDD', 'Machine Learning', 'AI',
    'Data Science', 'Big Data', 'UI/UX', 'Figma', 'System Design', 'Microservices'
]

const DOMAIN_KEYWORDS = [
    { name: 'Frontend', keywords: ['React', 'Vue', 'Angular', 'CSS', 'HTML', 'Frontend', 'UI'] },
    { name: 'Backend', keywords: ['Node.js', 'Python', 'Java', 'Go', 'Backend', 'API', 'Database'] },
    { name: 'Full Stack', keywords: ['Full Stack', 'MERN', 'MEAN'] },
    { name: 'DevOps', keywords: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'DevOps', 'Terraform'] },
    { name: 'Data', keywords: ['Data Science', 'Machine Learning', 'Big Data', 'SQL', 'Python', 'Analytics'] },
    { name: 'Mobile', keywords: ['React Native', 'Flutter', 'iOS', 'Android', 'Swift', 'Kotlin'] },
]
