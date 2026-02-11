
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY // Service Role preferred for background tasks
const RAPIDAPI_KEY = process.env.VITE_RAPIDAPI_KEY
const EMAIL_USER = process.env.EMAIL_USER
const EMAIL_PASS = process.env.EMAIL_PASS

if (!SUPABASE_URL || !SUPABASE_KEY || !RAPIDAPI_KEY || !EMAIL_USER || !EMAIL_PASS) {
    console.error('Missing required environment variables.')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
})

async function runJobAgent() {
    console.log('Starting Job Agent...')

    // 1. Fetch all profiles (or just the target user)
    // Using Service Role allows reading all profiles. If using Anon key, RLS might block unless we target specific user context.
    // For now, let's try to fetch the specific user by email if we can't list all.

    // Attempt to fetch all profiles
    let { data: profiles, error } = await supabase.from('profiles').select('*')

    if (error) {
        console.error('Error fetching profiles:', error)
        return
    }

    console.log(`Found ${profiles.length} profiles to process.`)

    for (const profile of profiles) {
        if (!profile.email) continue

        console.log(`Processing user: ${profile.email}`)

        // 2. Determine search query based on skills
        // Pick top 3 skills or use "Developer" as fallback
        const skills = profile.parsed_profile?.skills || []
        const query = skills.length > 0 ? `${skills.slice(0, 2).join(' ')} Developer` : 'Software Engineer'
        const location = profile.city || profile.country || 'Remote'

        console.log(`Searching for: "${query}" in "${location}"`)

        try {
            // 3. Search Jobs via JSearch
            const searchResponse = await axios.request({
                method: 'GET',
                url: 'https://jsearch.p.rapidapi.com/search',
                params: {
                    query: `${query} in ${location}`,
                    page: '1',
                    num_pages: '1',
                    date_posted: 'today' // Only new jobs
                },
                headers: {
                    'X-RapidAPI-Key': RAPIDAPI_KEY,
                    'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
                }
            })

            const jobs = searchResponse.data.data || []

            if (jobs.length === 0) {
                console.log('No new jobs found.')
                continue
            }

            // 4. Score & Filter Jobs (Simple version of our frontend logic)
            const scoredJobs = jobs.map(job => {
                let score = 0
                const desc = (job.job_description || '').toLowerCase()
                const title = (job.job_title || '').toLowerCase()

                // Skill match
                skills.forEach(skill => {
                    if (desc.includes(skill.toLowerCase()) || title.includes(skill.toLowerCase())) score += 10
                })

                return { ...job, score }
            }).sort((a, b) => b.score - a.score).slice(0, 5) // Top 5

            if (scoredJobs.length === 0) continue

            // 5. Send Email
            await sendEmailDigest(profile.email, profile.name || 'Job Seeker', scoredJobs)

        } catch (err) {
            console.error(`Error processing user ${profile.email}:`, err.message)
        }
    }

    console.log('Job Agent finished.')
}

async function sendEmailDigest(to, name, jobs) {
    const jobListHtml = jobs.map(job => `
        <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 8px;">
            <h3 style="margin: 0 0 5px 0; color: #333;">${job.job_title}</h3>
            <p style="margin: 0 0 5px 0; color: #666;"><strong>${job.employer_name}</strong> • ${job.job_city || 'Remote'}</p>
            <div style="margin-top: 10px;">
                <a href="${job.job_apply_link}" style="background-color: #2563eb; color: white; padding: 8px 12px; text-decoration: none; border-radius: 4px; font-size: 14px;">Apply Now</a>
            </div>
        </div>
    `).join('')

    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Running Your Twice-Daily Job Search 🕵️‍♂️</h2>
        <p>Hi ${name},</p>
        <p>Here are the top ${jobs.length} jobs I found for you today based on your skills:</p>
        ${jobListHtml}
        <p style="margin-top: 20px; font-size: 12px; color: #888;">
            You can view more details in your <a href="https://${process.env.VITE_SUPABASE_URL ? 'jobagent-app.com' : '#'}">Job Agent Dashboard</a>.
        </p>
    </div>
    `

    await transporter.sendMail({
        from: `"Job Agent" <${EMAIL_USER}>`,
        to: to,
        subject: `🎯 ${jobs.length} New Job Matches for You`,
        html: html
    })

    console.log(`Email sent to ${to}`)
}

runJobAgent()
