// app.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// GANTI DENGAN URL & ANON KEY DARI PROJECT SUPABASE ANDA
const supabaseUrl = 'https://nxeuvwogtweauijngqkb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54ZXV2d29ndHdlYXVpam5ncWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NDkyNDIsImV4cCI6MjA4NzQyNTI0Mn0.mwmNXy0ABj3z8Ip1EeDgcXoBgyDWID-YV5qKcU-II54'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Fungsi untuk mengecek sesi (apakah user sudah login)
export async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
}

// Fungsi untuk logout
export async function logout() {
    await supabase.auth.signOut()
    window.location.href = 'index.html'
}