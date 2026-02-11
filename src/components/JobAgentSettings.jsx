
import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { Briefcase, MapPin, Clock, Save, VolumeX, Volume2 } from 'lucide-react'

export default function JobAgentSettings({ profile, onUpdate }) {
    const [enabled, setEnabled] = useState(true)
    const [location, setLocation] = useState('')
    const [timezone, setTimezone] = useState('UTC')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        if (profile) {
            setEnabled(profile.agent_enabled ?? true)
            setLocation(profile.target_location || profile.city || '')
            setTimezone(profile.preferred_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
        }
    }, [profile])


    const handleSave = async () => {
        setLoading(true)
        setMessage('')

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    agent_enabled: enabled,
                    target_location: location,
                    preferred_timezone: timezone
                })
                .eq('user_id', (await supabase.auth.getUser()).data.user.id)

            if (error) throw error

            setMessage('Settings updated! The Job Agent will use these preferences.')
            if (onUpdate) onUpdate() // Refresh profile in parent
        } catch (err) {
            console.error(err)
            setMessage('Error saving settings.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="card mt-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Job Agent Settings
            </h2>

            <p className="text-gray-400 mb-6 text-sm">
                Control your automated daily job search assistant. It runs in the background and emails you matches.
            </p>

            <div className="space-y-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border/50">
                    <div className="flex items-center gap-3">
                        {enabled ? <Volume2 className="text-green-400" /> : <VolumeX className="text-gray-500" />}
                        <div>
                            <h3 className="font-medium">Active Status</h3>
                            <p className="text-xs text-gray-400">Master switch for email notifications</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>

                {/* Target Location */}
                <div className="grid gap-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Target Region / City
                    </label>
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. New York, Remote, India"
                        className="input"
                    />
                    <p className="text-xs text-gray-500">Leaving this blank uses your profile's City.</p>
                </div>

                {/* Timezone */}
                <div className="grid gap-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Preferred Timezone
                    </label>
                    <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="input bg-secondary"
                    >
                        <option value="UTC">UTC (Universal)</option>
                        <option value="Asia/Kolkata">India (IST)</option>
                        <option value="America/New_York">USA (EST)</option>
                        <option value="America/Los_Angeles">USA (PST)</option>
                        <option value="Europe/London">UK (GMT)</option>
                        <option value="Europe/Berlin">Europe (CET)</option>
                        {/* Add more common zones or use a library, keep simple for now */}
                    </select>
                    <p className="text-xs text-gray-500">Emails are sent daily. We'll try to match your morning/evening.</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="btn btn-primary w-full flex justify-center gap-2"
                >
                    {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Settings</>}
                </button>

                {message && (
                    <p className={`text-center text-sm ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    )
}
