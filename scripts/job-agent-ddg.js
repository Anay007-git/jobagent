
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import axios from 'axios'
import * as cheerio from 'cheerio'
import dotenv from 'dotenv'
import { search, SafeSearchType } from 'duck-duck-scrape'
import { GoogleGenerativeAI } from '@google/generative-ai'

dotenv.config()

// Environment Variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const EMAIL_USER = process.env.EMAIL_USER
const EMAIL_PASS = process.env.EMAIL_PASS

// Validation
if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
    console.error('Missing required environment variables (Database or Gemini Key).')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

// Conditional Transporter for Dry Run
let transporter = null
if (EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    })
} else {
    console.warn('⚠️  Email credentials missing. Running in DRY RUN mode.')
}

async function searchJobsDDG(query, location) {
    // Simpler search query to avoid rate limits
    const q = `${query} jobs ${location}`
    console.log(`🔎 Searching DDG: ${q}`)

    try {
        const results = await search(q, { safeSearch: SafeSearchType.MODERATE })

        if (!results.results) return []

        // Filter out ads and irrelevant links if any
        return results.results.map(r => ({
            title: r.title,
            link: r.url,
            snippet: r.description
        })).slice(0, 10) // Take top 10
    } catch (err) {
        console.error('DDG Search Error:', err.message)
        return []
    }
}

async function scrapeJobDetails(url) {
    // console.log(`spidering ${url}...`)
    try {
        const { data: html } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
            timeout: 10000 // 10s timeout
        })
        const $ = cheerio.load(html)

        // Remove noise
        $('script, style, nav, footer, iframe, svg').remove()

        const title = $('h1').first().text().trim() || $('title').text().trim()
        // Get main content text
        const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 5000) // 5k chars limit

        return { title, bodyText, url }
    } catch (err) {
        // console.warn(`Scraping failed: ${err.message}`)
        return null
    }
}

async function parseAndScoreWithGemini(scrapedData, userSkills) {
    if (!scrapedData) return null

    const prompt = `
    Analyze this job posting and extract details.
    Also, score the relevance (0-100) based on the User Skills provided.
    
    User Skills: ${userSkills.join(', ')}
    
    Job Content:
    Title: ${scrapedData.title}
    Body: ${scrapedData.bodyText}
    
    Output JSON ONLY:
    {
        "job_title": "String",
        "company": "String",
        "location": "String",
        "summary": "Short summary",
        "match_score": Number,
        "match_reason": "Why it matches or not"
    }
    `

    try {
        const result = await model.generateContent(prompt)
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim()
        return JSON.parse(text)
    } catch (err) {
        console.warn('Gemini Parsing Error:', err.message)
        return null
    }
}

async function sendEmailDigest(to, name, jobs) {
    const jobListHtml = jobs.map(job => `
        <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0;">${job.job_title}</h3>
                <span style="background:${job.match_score > 80 ? '#d1fae5' : '#f3f4f6'}; color:${job.match_score > 80 ? '#065f46' : '#374151'}; padding: 4px 8px; border-radius: 4px; font-weight:bold;">
                    ${job.match_score}% Match
                </span>
            </div>
            <p style="margin: 5px 0;"><strong>${job.company}</strong> • ${job.location}</p>
            <p style="color: #555;">${job.summary}</p>
            <p style="font-size: 0.9em; color: #666;"><em>Example Reason: ${job.match_reason}</em></p>
            <a href="${job.apply_link}" style="display:inline-block; background:#2563eb; color:white; padding: 8px 16px; text-decoration:none; border-radius:4px; margin-top:10px;">Apply Now</a>
        </div>
    `).join('')

    if (transporter) {
        await transporter.sendMail({
            from: `"Job Agent" <${EMAIL_USER}>`,
            to: to,
            subject: `🚀 ${jobs.length} Job Matches Found (Daily Digest)`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Hi ${name}, here are your daily job matches!</h2>
                    ${jobListHtml}
                    <p style="text-align:center; color:#888; font-size:12px; margin-top:30px;">
                        Powered by Job Agent (Gemini + DuckDuckGo)
                    </p>
                </div>
            `
        })
        console.log(`✅ Email sent to ${to}`)
    } else {
        console.log(`\n[DRY RUN] WOULD SEND EMAIL TO ${to}:`)
        console.log(`Subject: 🚀 ${jobs.length} Job Matches Found`)
        console.log(jobListHtml.substring(0, 300) + '...')
    }
}


async function runJobAgent() {
    console.log('🚀 Starting Job Agent (DuckDuckGo Edition)...')

    // Fetch profiles
    let { data: profiles, error } = await supabase.from('profiles').select('*')
    if (error) {
        // fallback to dummy if no keys
        console.error('Supabase Error:', error.message)
        // If local test without Service Key, we can't iterate.
        return
    }

    for (const profile of profiles) {
        if (!profile.email) continue

        // Settings check
        if (profile.agent_enabled === false) {
            console.log(`Skipping ${profile.email} (Disabled)`)
            continue
        }

        console.log(`\n👤 Processing ${profile.email}...`)

        const skills = profile.parsed_profile?.skills || []
        const query = skills.length > 0 ? skills[0] : 'Software Engineer'
        const location = profile.target_location || profile.city || 'Remote'

        // 1. Search
        const searchResults = await searchJobsDDG(query, location)
        console.log(`   Found ${searchResults.length} links.`)

        if (searchResults.length === 0) continue

        const validJobs = []

        // 2. Process top 5
        let processed = 0
        for (const item of searchResults) {
            if (processed >= 5) break // limit

            // Skip pdfs or obviously bad links
            if (item.link.endsWith('.pdf')) continue

            const scraped = await scrapeJobDetails(item.link)
            if (!scraped) continue

            // 3. AI Analysis
            const parsed = await parseAndScoreWithGemini(scraped, skills)

            if (parsed && parsed.match_score > 60) { // Only good matches
                validJobs.push({ ...parsed, apply_link: item.link })
                console.log(`   Matched: ${parsed.job_title} (${parsed.match_score}%)`)
            } else {
                // console.log(`   Skipped: ${parsed?.job_title} (${parsed?.match_score}%)`)
            }

            processed++
            await new Promise(r => setTimeout(r, 1500)) // nice delay
        }

        // 4. Notify
        if (validJobs.length > 0) {
            // Sort by score
            validJobs.sort((a, b) => b.match_score - a.match_score)
            await sendEmailDigest(profile.email, profile.name || 'User', validJobs)
        } else {
            console.log('   No high-quality matches found today.')
        }
    }
}

// Test Mode
if (process.argv.includes('--test')) {
    (async () => {
        console.log('🧪 Running in TEST MODE (No DB)...')
        const skills = ['React', 'Node.js']
        const query = 'React Developer'
        const location = 'Remote'

        console.log(`Test Query: ${query} in ${location}`)

        const results = await searchJobsDDG(query, location)
        console.log(`Found ${results.length} results.`)

        for (const item of results.slice(0, 3)) {
            console.log(`Processing: ${item.title}`)
            const scraped = await scrapeJobDetails(item.link)
            if (scraped) {
                const parsed = await parseAndScoreWithGemini(scraped, skills)
                console.log('Parsed Result:', JSON.stringify(parsed, null, 2))
            }
        }
    })()
} else {
    runJobAgent()
}
