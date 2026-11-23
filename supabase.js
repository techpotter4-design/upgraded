
/* =========================================
   LIFETRACK — SUPABASE CONFIGURATION
   Version 3.0
========================================= */

(() => {
    "use strict";

    // =====================================
    // SUPABASE PROJECT CONFIGURATION
    // =====================================

    const SUPABASE_URL =
        "https://lqulzslsyyxvoatyjlch.supabase.co";

    const SUPABASE_PUBLISHABLE_KEY =
        "sb_publishable_8BthqYECrHbDfTi1De89lg_GquT4dkN";

    // =====================================
    // CHECK SUPABASE LIBRARY
    // =====================================

    if (!window.supabase) {
        console.error(
            "LifeTrack: Supabase library failed to load."
        );

        window.lifeTrackSupabase = null;
        return;
    }

    if (typeof window.supabase.createClient !== "function") {
        console.error(
            "LifeTrack: Supabase createClient function is unavailable."
        );

        window.lifeTrackSupabase = null;
        return;
    }

    // =====================================
    // VALIDATE CONFIGURATION
    // =====================================

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
        console.error(
            "LifeTrack: Supabase configuration is incomplete."
        );

        window.lifeTrackSupabase = null;
        return;
    }

    // =====================================
    // INITIALIZE SUPABASE CLIENT
    // =====================================

    try {
        window.lifeTrackSupabase =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY,
                {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: true
                    }
                }
            );

        console.log(
            "LifeTrack: Supabase connected successfully."
        );

    } catch (error) {
        console.error(
            "LifeTrack: Supabase initialization failed:",
            error
        );

        window.lifeTrackSupabase = null;
    }

})();
