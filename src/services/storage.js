// ===================================================
// Storage Layer — Supabase PostgreSQL backend
// All operations are async and scoped to the logged-in user
// ===================================================

import { supabase } from './supabase'

// --- Helpers ---

async function getUserId() {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id
}

// --- Profile ---

export async function getProfile() {
    const userId = await getUserId()
    if (!userId) return null

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

    if (error && error.code !== 'PGRST116') console.error('getProfile:', error)
    if (!data) return null

    // Merge separate columns back into a unified profile object for the app
    return {
        ...data.parsed_profile, // existing JSON fields
        name: data.name,
        email: data.email,
        phone: data.phone,
        country: data.country,
        city: data.city,
        current_role: data.current_role,
        current_ctc: data.current_ctc,
        linkedin_url: data.linkedin_url,
        github_url: data.github_url,
        portfolio_url: data.portfolio_url,
    }
}

export async function saveProfile(profile) {
    const userId = await getUserId()
    if (!userId) return

    const { error } = await supabase
        .from('profiles')
        .upsert({
            user_id: userId,
            name: profile.name || '',
            email: profile.email || '',
            phone: profile.phone || '',
            country: profile.country || '',
            city: profile.city || '',
            current_role: profile.current_role || '',
            current_ctc: profile.current_ctc || '',
            linkedin_url: profile.linkedin_url || '',
            github_url: profile.github_url || '',
            portfolio_url: profile.portfolio_url || '',
            parsed_profile: profile, // Keep full JSON for skills/exp/achievements
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

    if (error) console.error('saveProfile:', error)
}

// --- Resume Text ---

export async function getResumeText() {
    const userId = await getUserId()
    if (!userId) return ''

    const { data, error } = await supabase
        .from('profiles')
        .select('resume_text')
        .eq('user_id', userId)
        .maybeSingle()

    if (error && error.code !== 'PGRST116') console.error('getResumeText:', error)
    return data?.resume_text || ''
}

export async function saveResumeText(text) {
    const userId = await getUserId()
    if (!userId) return

    const { error } = await supabase
        .from('profiles')
        .upsert({
            user_id: userId,
            resume_text: text,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

    if (error) console.error('saveResumeText:', error)
}

// --- Applications ---

export async function getApplications() {
    const userId = await getUserId()
    if (!userId) return []

    const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false })

    if (error) { console.error('getApplications:', error); return [] }
    return (data || []).map(normalizeApp)
}

export async function addApplication(app) {
    const userId = await getUserId()
    if (!userId) return []

    const { error } = await supabase
        .from('applications')
        .insert({
            user_id: userId,
            job_id: app.id,
            title: app.title,
            company: app.company,
            location: app.location,
            salary: app.salary || null,
            apply_link: app.applyLink || '',
            status: app.status || 'saved',
            match_score: app.matchScore || 0,
            notes: app.notes || '',
            saved_at: app.savedAt || new Date().toISOString(),
        })

    if (error) console.error('addApplication:', error)
    return await getApplications()
}

export async function updateApplication(jobId, updates) {
    const userId = await getUserId()
    if (!userId) return []

    const dbUpdates = {}
    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes

    const { error } = await supabase
        .from('applications')
        .update(dbUpdates)
        .eq('user_id', userId)
        .eq('job_id', jobId)

    if (error) console.error('updateApplication:', error)
    return await getApplications()
}

export async function removeApplication(jobId) {
    const userId = await getUserId()
    if (!userId) return []

    const { error } = await supabase
        .from('applications')
        .delete()
        .eq('user_id', userId)
        .eq('job_id', jobId)

    if (error) console.error('removeApplication:', error)
    return await getApplications()
}

// --- Settings (kept in localStorage — not sensitive) ---

export function getSettings() {
    try {
        return JSON.parse(localStorage.getItem('jobagent_settings')) || defaultSettings()
    } catch { return defaultSettings() }
}

export function saveSettings(settings) {
    localStorage.setItem('jobagent_settings', JSON.stringify(settings))
}

function defaultSettings() {
    return { remotePreference: 'any', salaryMin: 0, preferredLocations: [] }
}

// --- Normalize DB row to app format ---

function normalizeApp(row) {
    return {
        id: row.job_id,
        dbId: row.id,
        title: row.title,
        company: row.company,
        location: row.location,
        salary: row.salary,
        applyLink: row.apply_link,
        status: row.status,
        matchScore: row.match_score,
        notes: row.notes,
        savedAt: row.saved_at,
    }
}
