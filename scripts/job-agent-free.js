
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import axios from 'axios'
import * as cheerio from 'cheerio'
import dotenv from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai' // Assuming we use Gemini

dotenv.config()

// Environment Variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const GOOGLE_SEARCH_KEY = process.env.GOOGLE_SEARCH_KEY // Standard API Key for CSE
const GOOGLE_CSE_CX = process.env.GOOGLE_CSE_CX
const GEMINI_API_KEY = process.env.GEMINI_API_KEY     // AI Studio Key
const EMAIL_USER = process.env.EMAIL_USER
const EMAIL_PASS = process.env.EMAIL_PASS

// Validation
if (!SUPABASE_URL || !SUPABASE_KEY || !GOOGLE_SEARCH_KEY || !GOOGLE_CSE_CX || !GEMINI_API_KEY || !EMAIL_USER || !EMAIL_PASS) {
    console.error('Missing required environment variables.')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
})

async function searchJobsGoogle(query, location) {
    const q = `${query} jobs in ${location} site:greenhouse.io OR site:lever.co OR site:workable.com` // Targeted search
    console.log(`Googling: ${q}`)

    try {
        const url = `https://customsearch.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_CX}&q=${encodeURIComponent(q)}&dateRestrict=d1` // d1 = past 24h
        const res = await axios.get(url)
        return res.data.items || [] // array of { title, link, snippet }
    } catch (err) {
        console.error('Google Search Error:', err.message)
        return []
    }
}

async function scrapeJobDetails(url) {
    try {
        const { data: html } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        })
        const $ = cheerio.load(html)

        // Remove scripts/styles
        $('script').remove()
        $('style').remove()

        // Simple extraction heuristic
        const title = $('h1').first().text().trim() || $('title').text().trim()
        const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 3000) // Limit context for LLM

        return { title, bodyText, url }
    } catch (err) {
        console.warn(`Scraping failed for ${url}:`, err.message)
        return null
    }
}

async function parseWithGemini(scrapedData) {
    if (!scrapedData) return null

    const prompt = `
    Extract job details from the following text into JSON format:
    { "job_title": "", "company": "", "location": "", "is_remote": boolean, "summary": "" }
    
    Text:
    Title: ${scrapedData.title}
    Body: ${scrapedData.bodyText}
    `

    try {
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        // Simple cleanup for JSON markdown
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()
        return JSON.parse(jsonStr)
    } catch (err) {
        console.warn('Gemini parsing failed:', err.message)
        return null
    }
}

async function runJobAgent() {
    console.log('Starting Free Job Agent...')

    let { data: profiles, error } = await supabase.from('profiles').select('*')
    if (error) { console.error(error); return }

    for (const profile of profiles) {
        if (!profile.email) continue
        console.log(`Processing ${profile.email}...`)

        const skills = profile.parsed_profile?.skills || []
        const query = skills.length > 0 ? skills[0] : 'Software Engineer' // Simple fallback
        const location = profile.city || 'Remote'

        // 1. Search
        const searchResults = await searchJobsGoogle(query, location)
        if (searchResults.length === 0) continue

        const validJobs = []

        // 2. Scrape & Parse (Limit to top 3 to avoid hitting limits/timeouts)
        for (const item of searchResults.slice(0, 3)) {
            const timeStart = Date.now()
            const scraped = await scrapeJobDetails(item.link)
            if (!scraped) continue

            // 3. LLM Parse
            const parsed = await parseWithGemini(scraped)
            if (parsed) {
                validJobs.push({ ...parsed, apply_link: item.link })
            }
            // Be nice to servers
            await new Promise(r => setTimeout(r, 1000))
        }

        if (validJobs.length > 0) {
            await sendEmailDigest(profile.email, profile.name, validJobs)
        }
    }
}

async function sendEmailDigest(to, name, jobs) {
    // reusing previous email logic...
    const jobListHtml = jobs.map(job => `
        <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 10px;">
            <h3>${job.job_title}</h3>
            <p><strong>${job.company}</strong> • ${job.location}</p>
            <p>${job.summary}</p>
            <a href="${job.apply_link}">Apply Now</a>
        </div>
    `).join('')

    await transporter.sendMail({
        from: `"Job Agent (Free)" <${EMAIL_USER}>`,
        to: to,
        subject: `🎯 ${jobs.length} New Jobs Found (Free Agent)`,
        html: `<h2>Job Matches</h2>${jobListHtml}`
    })
    console.log(`Email sent to ${to}`)
}

runJobAgent()
