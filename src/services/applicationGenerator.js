// ===================================================
// Application Generator — Templates for cover letters,
// email drafts, and recruiter messages
// ===================================================

export function generateCoverLetter(job, profile) {
    const name = profile.name || 'Applicant';
    const skills = (profile.skills || []).slice(0, 6).join(', ');
    const years = profile.yearsOfExperience || 'several';
    const achievements = (profile.achievements || []).slice(0, 2);
    const jobSkills = (job.skills || []).slice(0, 4).join(', ');

    let letter = `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${job.company}. With ${years} years of experience and expertise in ${skills}, I am confident in my ability to make a meaningful contribution to your team.

`;

    if (jobSkills) {
        letter += `Your requirement for proficiency in ${jobSkills} aligns directly with my professional background. `;
    }

    if (achievements.length > 0) {
        letter += `In my career, I have:\n`;
        achievements.forEach(a => { letter += `• ${a}\n`; });
        letter += '\n';
    }

    if (profile.domains?.length > 0) {
        letter += `My experience in the ${profile.domains[0]} domain has given me deep understanding of the unique challenges and opportunities in this space. `;
    }

    letter += `\nI am particularly drawn to ${job.company} because of the opportunity to work on impactful challenges. I would welcome the chance to discuss how my skills and experience can contribute to your team's success.

Thank you for considering my application. I look forward to hearing from you.

Best regards,
${name}`;

    return letter;
}

export function generateEmailDraft(job, profile) {
    const name = profile.name || 'Applicant';
    const skills = (profile.skills || []).slice(0, 4).join(', ');
    const years = profile.yearsOfExperience || 'several';

    return `Subject: Application for ${job.title} Position — ${name}

Dear Hiring Team,

I am reaching out regarding the ${job.title} position at ${job.company}. With ${years} years of professional experience and strong skills in ${skills}, I believe I would be a great fit for this role.

I have attached my resume for your review. I would be happy to discuss my qualifications in more detail at your convenience.

Thank you for your time and consideration.

Best regards,
${name}${profile.email ? `\n${profile.email}` : ''}${profile.phone ? `\n${profile.phone}` : ''}`;
}

export function generateRecruiterMessage(job, profile) {
    const name = profile.name || 'there';
    const skills = (profile.skills || []).slice(0, 3).join(', ');

    return `Hi,

I came across the ${job.title} role at ${job.company} and I'm very interested. I have experience with ${skills} and I believe my background aligns well with what you're looking for.

Would you be open to a brief conversation to discuss this opportunity?

Thanks,
${name}`;
}
