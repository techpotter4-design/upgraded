
/* =================================
   LIFETRACK SUPABASE CONFIGURATION
================================= */

const SUPABASE_URL = "https://lqulzslsyyxvoatyjlch.supabase.co";

const SUPABASE_KEY = "sb_publishable___G7CxED5jCxSluqYIOGFw_iZM1hDXy
   ";

if (!window.supabase) {
    console.error("Supabase library did not load.");
} else {
    window.lifeTrackSupabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    console.log("LifeTrack Supabase connected successfully.");
}
