
import axios from 'axios'
import * as cheerio from 'cheerio'
import dotenv from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'

dotenv.config()

const GOOGLE_SEARCH_KEY = process.env.GOOGLE_SEARCH_KEY
const GOOGLE_CSE_CX = process.env.GOOGLE_CSE_CX
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!GOOGLE_SEARCH_KEY || !GOOGLE_CSE_CX || !GEMINI_API_KEY) {
    console.error('Missing Google Keys in .env')
    process.exit(1)
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

async function searchJobsGoogle(query, location) {
    const q = `${query} jobs in ${location} site:greenhouse.io OR site:lever.co OR site:workable.com`
    console.log(`🔎 Googling: ${q}`)
    try {
        const url = `https://customsearch.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_KEY}&cx=${GOOGLE_CSE_CX}&q=${encodeURIComponent(q)}&dateRestrict=d1`
        const res = await axios.get(url)
        console.log(`✅ Found ${res.data.items?.length || 0} results.`)
        return res.data.items || []
    } catch (err) {
        console.error('❌ Google Search Error:', err.response?.data?.error?.message || err.message)
        return []
    }
}

async function scrapeJobDetails(url) {
    console.log(`🕷️ Scraping: ${url}`)
    try {
        const { data: html } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        const $ = cheerio.load(html)
        $('script, style, nav, footer').remove()
        const title = $('h1').first().text().trim() || $('title').text().trim()
        const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 3000)
        console.log(`✅ Scraped (${bodyText.length} chars). Title: ${title}`)
        return { title, bodyText, url }
    } catch (err) {
        console.error(`❌ Scraping failed: ${err.message}`)
        return null
    }
}

async function parseWithGemini(scrapedData) {
    console.log(`🤖 Parsing with Gemini...`)
    const prompt = `Extract job details to JSON: { "job_title": "", "company": "", "location": "", "summary": "" }. Text: Title: ${scrapedData.title} Body: ${scrapedData.bodyText}`
    try {
        const result = await model.generateContent(prompt)
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim()
        const json = JSON.parse(text)
        console.log('✅ Parsed JSON:', json)
        return json
    } catch (err) {
        console.error('❌ Gemini Error:', err.message)
        return null
    }
}

async function runTest() {
    const results = await searchJobsGoogle('React Developer', 'Remote')
    if (results.length > 0) {
        const first = results[0]
        const scraped = await scrapeJobDetails(first.link)
        if (scraped) {
            await parseWithGemini(scraped)
        }
    } else {
        console.log("No results found. Check if your CSE is set to 'Search the entire web' or has valid sites.")
    }
}

runTest()
