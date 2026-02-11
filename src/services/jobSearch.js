// ===================================================
// Job Search — Free APIs (no API key required!)
// Uses: Remotive (remote jobs) + Arbeitnow (global jobs)
// ===================================================

const REMOTIVE_URL = 'https://remotive.com/api/remote-jobs';
const ARBEITNOW_URL = 'https://www.arbeitnow.com/api/job-board-api';

// Map user-friendly categories to Remotive categories
const REMOTIVE_CATEGORIES = {
    'software-dev': 'software-dev',
    'data': 'data',
    'devops': 'devops-sysadmin',
    'design': 'design',
    'marketing': 'marketing',
    'product': 'product',
    'customer-support': 'customer-support',
    'finance': 'finance-legal',
    'hr': 'hr',
    'qa': 'qa',
    'writing': 'writing',
    'all': '',
};

export async function searchJobs({ query, location, employmentType, remoteOnly, category }) {
    const results = [];

    // Fetch from both APIs in parallel
    const [remotiveJobs, arbeitnowJobs] = await Promise.allSettled([
        fetchRemotive(query, category),
        fetchArbeitnow(query),
    ]);

    if (remotiveJobs.status === 'fulfilled') results.push(...remotiveJobs.value);
    if (arbeitnowJobs.status === 'fulfilled') results.push(...arbeitnowJobs.value);

    // Filter
    let filtered = results;

    if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter(job =>
            job.title.toLowerCase().includes(q) ||
            job.company.toLowerCase().includes(q) ||
            job.description.toLowerCase().includes(q) ||
            job.skills.some(s => s.toLowerCase().includes(q))
        );
    }

    if (location) {
        const loc = location.toLowerCase();
        filtered = filtered.filter(job => job.location.toLowerCase().includes(loc));
    }

    if (remoteOnly) {
        filtered = filtered.filter(job => job.isRemote);
    }

    if (employmentType) {
        filtered = filtered.filter(job => {
            const type = job.employmentType.toUpperCase();
            return type.includes(employmentType.toUpperCase());
        });
    }

    // Deduplicate by title+company
    const seen = new Set();
    filtered = filtered.filter(job => {
        const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return filtered;
}

// --- Remotive API ---
async function fetchRemotive(query, category) {
    try {
        const params = new URLSearchParams();
        if (query) params.set('search', query);
        if (category && category !== 'all') {
            const cat = REMOTIVE_CATEGORIES[category] || category;
            if (cat) params.set('category', cat);
        }
        params.set('limit', '50');

        const res = await fetch(`${REMOTIVE_URL}?${params}`);
        if (!res.ok) throw new Error(`Remotive API: ${res.status}`);

        const data = await res.json();
        return (data.jobs || []).map(normalizeRemotive);
    } catch (err) {
        console.warn('Remotive fetch failed:', err.message);
        return [];
    }
}

function normalizeRemotive(raw) {
    return {
        id: `remotive-${raw.id}`,
        title: raw.title || 'Untitled',
        company: raw.company_name || 'Unknown',
        companyLogo: raw.company_logo || null,
        location: raw.candidate_required_location || 'Worldwide',
        isRemote: true,
        employmentType: (raw.job_type || 'full_time').replace('_', ' '),
        description: stripHtml(raw.description || ''),
        salary: raw.salary || null,
        applyLink: raw.url || '',
        postedAt: raw.publication_date || '',
        skills: extractJobSkills(raw.description || '', raw.tags || []),
        source: 'Remotive',
        category: raw.category || '',
    };
}

// --- Arbeitnow API ---
async function fetchArbeitnow(query) {
    try {
        const res = await fetch(`${ARBEITNOW_URL}`);
        if (!res.ok) throw new Error(`Arbeitnow API: ${res.status}`);

        const data = await res.json();
        let jobs = data.data || [];

        // Client-side search filtering (Arbeitnow doesn't support query params well)
        if (query) {
            const q = query.toLowerCase();
            jobs = jobs.filter(j =>
                (j.title || '').toLowerCase().includes(q) ||
                (j.company_name || '').toLowerCase().includes(q) ||
                (j.description || '').toLowerCase().includes(q)
            );
        }

        return jobs.slice(0, 50).map(normalizeArbeitnow);
    } catch (err) {
        console.warn('Arbeitnow fetch failed:', err.message);
        return [];
    }
}

function normalizeArbeitnow(raw) {
    return {
        id: `arbeitnow-${raw.slug || raw.title?.replace(/\s+/g, '-')}`,
        title: raw.title || 'Untitled',
        company: raw.company_name || 'Unknown',
        companyLogo: null,
        location: raw.location || 'Not specified',
        isRemote: raw.remote || false,
        employmentType: 'Full-time',
        description: stripHtml(raw.description || ''),
        salary: null,
        applyLink: raw.url || '',
        postedAt: raw.created_at ? new Date(raw.created_at * 1000).toISOString() : '',
        skills: extractJobSkills(raw.description || '', raw.tags || []),
        source: 'Arbeitnow',
        category: '',
    };
}

// --- Helpers ---
function stripHtml(html) {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?(p|div|li|h[1-6])[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#\d+;/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function extractJobSkills(desc, tags) {
    const skills = new Set(tags.map(t => t.trim()).filter(Boolean));
    const lower = (desc + ' ' + tags.join(' ')).toLowerCase();
    const check = [
        ['python', 'Python'], ['javascript', 'JavaScript'], ['typescript', 'TypeScript'],
        ['react', 'React'], ['node.js', 'Node.js'], ['aws', 'AWS'], ['docker', 'Docker'],
        ['kubernetes', 'Kubernetes'], ['sql', 'SQL'], ['java ', 'Java'], ['golang', 'Go'],
        ['rust', 'Rust'], ['c++', 'C++'], ['angular', 'Angular'], ['vue', 'Vue.js'],
        ['postgresql', 'PostgreSQL'], ['mongodb', 'MongoDB'], ['redis', 'Redis'],
        ['tensorflow', 'TensorFlow'], ['pytorch', 'PyTorch'], ['kafka', 'Kafka'],
        ['terraform', 'Terraform'], ['linux', 'Linux'], ['azure', 'Azure'], ['gcp', 'GCP'],
        ['graphql', 'GraphQL'], ['rest api', 'REST API'], ['ci/cd', 'CI/CD'],
        ['machine learning', 'ML'], ['data engineer', 'Data Eng'],
        ['agile', 'Agile'], ['scrum', 'Scrum'], ['next.js', 'Next.js'],
        ['django', 'Django'], ['flask', 'Flask'], ['spring', 'Spring'],
    ];
    for (const [kw, label] of check) {
        if (lower.includes(kw)) skills.add(label);
    }
    return [...skills].slice(0, 8);
}

// Export categories for the UI filter
export const JOB_CATEGORIES = [
    { value: 'all', label: 'All Categories' },
    { value: 'software-dev', label: 'Software Development' },
    { value: 'data', label: 'Data' },
    { value: 'devops', label: 'DevOps / SysAdmin' },
    { value: 'design', label: 'Design' },
    { value: 'product', label: 'Product' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'customer-support', label: 'Customer Support' },
    { value: 'finance', label: 'Finance / Legal' },
    { value: 'qa', label: 'QA' },
    { value: 'writing', label: 'Writing' },
];
