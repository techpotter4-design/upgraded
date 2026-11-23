
(() => {
    "use strict";

    const SUPABASE_URL =
        "https://zfmwecpowwhdhxgdbtor.supabase.co";

    const SUPABASE_PUBLISHABLE_KEY =
        "sb_publishable_8BthqYECrHbDfTi1De89lg_GquT4dkN";

    if (!window.supabase ||
        typeof window.supabase.createClient !== "function") {
        console.error("LifeTrack: Supabase library not loaded.");
        window.lifeTrackSupabase = null;
        return;
    }

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
            "LifeTrack: Connected to the new Supabase project."
        );

    } catch (error) {
        console.error(
            "LifeTrack: Supabase initialization failed:",
            error
        );

        window.lifeTrackSupabase = null;
    }
})();
