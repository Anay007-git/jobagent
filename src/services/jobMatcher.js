// ===================================================
// Job Matcher — Weighted scoring algorithm
// ===================================================

export function scoreJob(job, profile) {
    if (!profile || !job) return { total: 0, factors: {} };

    const skillScore = calcSkillMatch(job, profile);
    const expScore = calcExperienceMatch(job, profile);
    const roleScore = calcRoleAlignment(job, profile);
    const locScore = calcLocationFit(job, profile);
    const compScore = calcCompanyPref(job, profile);

    const total = Math.round(
        skillScore * 0.4 +
        expScore * 0.2 +
        roleScore * 0.2 +
        locScore * 0.1 +
        compScore * 0.1
    );

    return {
        total: Math.min(100, Math.max(0, total)),
        factors: {
            skills: { score: skillScore, weight: 40, label: 'Skill Match' },
            experience: { score: expScore, weight: 20, label: 'Experience' },
            role: { score: roleScore, weight: 20, label: 'Role Alignment' },
            location: { score: locScore, weight: 10, label: 'Location Fit' },
            company: { score: compScore, weight: 10, label: 'Company Pref' },
        },
        explanation: buildExplanation(skillScore, expScore, roleScore, job, profile),
    };
}

export function rankJobs(jobs, profile) {
    return jobs
        .map(job => ({ ...job, matchResult: scoreJob(job, profile) }))
        .sort((a, b) => b.matchResult.total - a.matchResult.total);
}

// --- Scoring functions ---
function calcSkillMatch(job, profile) {
    if (!profile.skills?.length) return 50;
    const jobSkills = (job.skills || []).map(s => s.toLowerCase());
    const descLower = (job.description || '').toLowerCase();
    const userSkills = profile.skills.map(s => s.toLowerCase());

    let matched = 0;
    for (const s of userSkills) {
        if (jobSkills.some(js => js.includes(s) || s.includes(js))) { matched++; }
        else if (descLower.includes(s)) { matched++; }
    }
    const ratio = matched / Math.max(userSkills.length, 1);
    return Math.round(ratio * 100);
}

function calcExperienceMatch(job, profile) {
    if (!profile.yearsOfExperience) return 60;
    const desc = (job.description || '').toLowerCase();
    const m = desc.match(/(\d{1,2})\+?\s*(?:years?|yrs?)/);
    if (!m) return 70;
    const required = parseInt(m[1], 10);
    const diff = profile.yearsOfExperience - required;
    if (diff >= 0 && diff <= 3) return 100;
    if (diff > 3) return 80;
    if (diff >= -1) return 70;
    if (diff >= -3) return 40;
    return 20;
}

function calcRoleAlignment(job, profile) {
    const title = (job.title || '').toLowerCase();
    const domains = (profile.domains || []).map(d => d.toLowerCase());
    let score = 50;

    // Check seniority alignment
    const seniorityMap = {
        'Executive': ['director', 'vp', 'chief', 'head'],
        'Staff / Principal': ['staff', 'principal', 'distinguished'],
        'Senior': ['senior', 'sr', 'lead'],
        'Mid-Level': ['mid', 'intermediate', ''],
        'Junior / Entry-Level': ['junior', 'jr', 'associate', 'entry', 'intern'],
    };
    const expected = seniorityMap[profile.seniority] || [];
    if (expected.some(k => k && title.includes(k))) score += 30;
    else if (profile.seniority === 'Mid-Level' && !/(senior|junior|lead|intern|staff)/i.test(title)) score += 25;

    // Check domain
    for (const d of domains) {
        if (title.includes(d) || (job.description || '').toLowerCase().includes(d)) {
            score += 20;
            break;
        }
    }
    return Math.min(100, score);
}

function calcLocationFit(job, profile) {
    if (job.isRemote) return 90;
    if (!profile.preferredLocations?.length) return 70;
    const loc = (job.location || '').toLowerCase();
    for (const pl of profile.preferredLocations) {
        if (loc.includes(pl.toLowerCase())) return 100;
    }
    return 30;
}

function calcCompanyPref(job, profile) {
    if (!profile.companyPreferences?.length) return 70;
    const co = (job.company || '').toLowerCase();
    for (const pref of profile.companyPreferences) {
        if (co.includes(pref.toLowerCase())) return 100;
    }
    return 50;
}

function buildExplanation(skillScore, expScore, roleScore, job, profile) {
    const parts = [];
    if (skillScore >= 70) parts.push(`Strong skill overlap with your profile.`);
    else if (skillScore >= 40) parts.push(`Some matching skills found.`);
    else parts.push(`Limited skill overlap — consider upskilling.`);

    if (expScore >= 80) parts.push(`Your experience level is a great fit.`);
    else if (expScore < 50) parts.push(`Experience requirements may be challenging.`);

    if (roleScore >= 70) parts.push(`Role aligns well with your career trajectory.`);
    return parts.join(' ');
}
