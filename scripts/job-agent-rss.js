
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import axios from 'axios'
import * as cheerio from 'cheerio'
import dotenv from 'dotenv'
import Parser from 'rss-parser'
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
const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml'
    }
})

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

const FEEDS = [
    'https://weworkremotely.com/rss.xml',
    'https://remotive.io/remote-jobs/feed',
    // 'https://remoteok.com/rss', // Often blocks scraping
    // 'https://www.workingnomads.com/jobs/rss' 
]

async function fetchRSSJobs(query) {
    console.log(`📡 Fetching RSS Feeds for query: "${query}"...`)
    let allJobs = []

    for (const feedUrl of FEEDS) {
        try {
            const feed = await parser.parseURL(feedUrl)
            console.log(`   ✅ Fetched ${feed.items.length} items from ${feed.title || feedUrl}`)

            // Basic Keyword Filter
            const filtered = feed.items.filter(item => {
                const text = (item.title + ' ' + (item.contentSnippet || '')).toLowerCase()
                const q = query.toLowerCase()
                return text.includes(q)
            })

            allJobs.push(...filtered.map(item => ({
                title: item.title,
                link: item.link,
                pubDate: item.pubDate,
                snippet: item.contentSnippet
            })))

        } catch (err) {
            console.error(`   ❌ Failed to fetch ${feedUrl}:`, err.message)
        }
    }

    // Sort by date (newest first)
    allJobs.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))

    // Take top 10 unique links
    const unique = []
    const seen = new Set()
    for (const job of allJobs) {
        if (!seen.has(job.link)) {
            seen.add(job.link)
            unique.push(job)
        }
    }

    return unique.slice(0, 10)
}

async function scrapeJobDetails(url) {
    // console.log(`spidering ${url}...`)
    try {
        const { data: html } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 10000
        })
        const $ = cheerio.load(html)
        $('script, style, nav, footer, iframe, svg').remove()
        const title = $('h1').first().text().trim() || $('title').text().trim()
        const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 5000)

        return { title, bodyText, url }
    } catch (err) {
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
                        Powered by Job Agent (Gemini + RSS)
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
    console.log('🚀 Starting Job Agent (RSS Edition)...')

    let { data: profiles, error } = await supabase.from('profiles').select('*')
    if (error) {
        console.error('Supabase Error:', error.message)
        return
    }

    for (const profile of profiles) {
        if (!profile.email) continue

        if (profile.agent_enabled === false) {
            console.log(`Skipping ${profile.email} (Disabled)`)
            continue
        }

        console.log(`\n👤 Processing ${profile.email}...`)

        const skills = profile.parsed_profile?.skills || []
        const query = skills.length > 0 ? skills[0] : 'Software Engineer' // fallback

        // 1. Search RSS
        const searchResults = await fetchRSSJobs(query)
        console.log(`   Found ${searchResults.length} relevant RSS items.`)

        if (searchResults.length === 0) continue

        const validJobs = []

        // 2. Process
        for (const item of searchResults) {
            const scraped = await scrapeJobDetails(item.link)
            if (!scraped) continue

            // 3. AI Analysis
            const parsed = await parseAndScoreWithGemini(scraped, skills)

            if (parsed && parsed.match_score > 60) {
                validJobs.push({ ...parsed, apply_link: item.link })
                console.log(`   Matched: ${parsed.job_title} (${parsed.match_score}%)`)
            }
            await new Promise(r => setTimeout(r, 1000))
        }

        // 4. Notify
        if (validJobs.length > 0) {
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
        console.log('🧪 Running in TEST MODE (RSS)...')
        const skills = ['React', 'Node.js']
        const query = 'React'

        console.log(`Test Query: "${query}"`)
        const results = await fetchRSSJobs(query)
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
