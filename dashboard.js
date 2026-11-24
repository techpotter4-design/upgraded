
document.addEventListener("DOMContentLoaded", async function () {
    "use strict";

    const supabase = window.lifeTrackSupabase;

    if (!supabase) {
        alert("LifeTrack could not connect to the database.");
        return;
    }

    let currentUser = null;
    let currentSubscription = null;

    // SHARED HELPERS
    const $ = (selector) => document.querySelector(selector);

    function setText(selector, value) {
        const element = $(selector);
        if (element) element.textContent = value ?? "";
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function localDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    // AUTHENTICATION
    async function authenticateUser() {
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
            window.location.href = "auth.html";
            return false;
        }

        currentUser = data.session.user;
        return true;
    }

    // PREMIUM SUBSCRIPTION VERIFICATION
    async function verifySubscription() {
        const { data, error } = await supabase.rpc(
            "has_active_voucher_subscription"
        );

        if (error) {
            console.error("Subscription verification:", error);
            alert("We couldn't verify your subscription. Please try again.");
            return false;
        }

        if (data !== true) {
            window.location.href = "payment.html";
            return false;
        }

        const { data: rows, error: detailsError } = await supabase
            .from("subscriptions")
            .select("plan_name, plan, expires_at")
            .eq("user_id", currentUser.id)
            .eq("status", "active")
            .lte("starts_at", new Date().toISOString())
            .gt("expires_at", new Date().toISOString())
            .order("expires_at", { ascending: false })
            .limit(1);

        if (detailsError) {
            console.warn("Subscription details unavailable:", detailsError);
        } else {
            currentSubscription = rows?.[0] || null;
        }

        return true;
    }

    // DISPLAY USER INFORMATION
    async function displayUserInformation() {
        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", currentUser.id)
            .maybeSingle();

        const name = profile?.full_name ||
            currentUser.user_metadata?.full_name ||
            currentUser.email?.split("@")[0] ||
            "Member";

        setText("#profileName", name);
        setText("#userName", name);
        setText("#welcomeName", name);
        setText("#profileEmail", currentUser.email);

        const plan = currentSubscription?.plan_name ||
            currentSubscription?.plan || "Premium";

        setText("#currentPlanName", plan);
        setText("#planBadgeText", plan);

        const expiry = currentSubscription?.expires_at;

        if (expiry) {
            setText("#subscriptionDetails",
                "Active until " + new Date(expiry).toLocaleDateString()
            );
        } else {
            setText("#subscriptionDetails", "Premium subscription active");
        }
    }

    // DASHBOARD NAVIGATION
    function openDashboardSection(sectionId) {
        document.querySelectorAll(".dashboard-section").forEach(section => {
            section.classList.toggle("active", section.id === sectionId);
        });

        document.querySelectorAll(".nav-link").forEach(link => {
            link.classList.toggle(
                "active",
                link.dataset.section === sectionId
            );
        });
    }

    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", function () {
            if (this.dataset.section === "coach") {
                window.location.href = "ai-coach.html";
                return;
            }

            if (this.dataset.section) {
                openDashboardSection(this.dataset.section);
            }
        });
    });

    // THEME SETTINGS
    function applyTheme(theme) {
        document.body.classList.toggle("dark-mode", theme === "dark");
        localStorage.setItem("lifetrack_theme", theme);
    }

    applyTheme(localStorage.getItem("lifetrack_theme") || "light");

    document.querySelectorAll(
        "#themeToggle, #settingsThemeToggle"
    ).forEach(button => {
        button.addEventListener("click", () => {
            const dark = document.body.classList.contains("dark-mode");
            applyTheme(dark ? "light" : "dark");
        });
    });

    // LOGOUT
    async function logoutUser() {
        if (!confirm("Are you sure you want to log out?")) return;

        const { error } = await supabase.auth.signOut();

        if (error) {
            alert("Unable to log out. Please try again.");
            return;
        }

        window.location.href = "auth.html";
    }

    document.querySelectorAll(
        "#logoutButton, #settingsLogoutButton"
    ).forEach(button => {
        button.addEventListener("click", logoutUser);
    });

    // START DASHBOARD
    const authenticated = await authenticateUser();
    if (!authenticated) return;

    const subscriptionActive = await verifySubscription();
    if (!subscriptionActive) return;

    await displayUserInformation();

    console.log("LifeTrack dashboard connected.");
    
    // NEXT SECTIONS WILL BE ADDED BELOW

            
