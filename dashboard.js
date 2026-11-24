
/* =========================================
   LIFETRACK PREMIUM DASHBOARD
   Authentication + Subscription + Navigation
========================================= */

document.addEventListener("DOMContentLoaded", async function () {

    "use strict";

    // =====================================
    // 1. ELEMENT SELECTOR
    // =====================================

    const $ = (id) => document.getElementById(id);

    const sidebar = $("sidebar");
    const menuToggle = $("menuToggle");
    const pageTitle = $("pageTitle");

    const sections = document.querySelectorAll(
        ".dashboard-section"
    );

    const navLinks = document.querySelectorAll(
        ".nav-link"
    );

    const navigationButtons = document.querySelectorAll(
        "[data-section]"
    );

    const welcomeName = $("welcomeName");
    const sidebarUserName = $("sidebarUserName");
    const currentDate = $("currentDate");

    // =====================================
    // 2. SUPABASE CONNECTION
    // =====================================

    const supabaseClient = window.lifeTrackSupabase;

    if (!supabaseClient) {

        console.error(
            "LifeTrack: Supabase connection unavailable."
        );

        alert(
            "Unable to connect to LifeTrack. Please refresh the page."
        );

        return;
    }

    // =====================================
    // 3. AUTHENTICATION VERIFICATION
    // =====================================

    let currentUser = null;

    try {

        const {
            data,
            error
        } = await supabaseClient.auth.getUser();

        if (error || !data.user) {

            window.location.replace("auth.html");

            return;
        }

        currentUser = data.user;

    } catch (error) {

        console.error(
            "LifeTrack authentication error:",
            error
        );

        alert(
            "Unable to verify your account. Please log in again."
        );

        window.location.replace("auth.html");

        return;
    }

    // =====================================
    // 4. VOUCHER SUBSCRIPTION VERIFICATION
    // =====================================

    let currentSubscription = null;

    try {

        const {
            data: subscriptions,
            error
        } = await supabaseClient
            .from("subscriptions")
            .select(`
                id,
                plan_name,
                status,
                activation_source,
                starts_at,
                expires_at
            `)
            .eq("user_id", currentUser.id)
            .eq("status", "active")
            .eq("activation_source", "voucher")
            .order("expires_at", {
                ascending: false
            });

        if (error) {

            console.error(
                "Subscription verification error:",
                error
            );

            alert(
                "We couldn't verify your subscription. Please try again."
            );

            return;
        }

        const now = new Date();

        currentSubscription = (subscriptions || []).find(
            (subscription) => {

                const startDate = subscription.starts_at
                    ? new Date(subscription.starts_at)
                    : null;

                const expiryDate = subscription.expires_at
                    ? new Date(subscription.expires_at)
                    : null;

                const hasStarted =
                    !startDate || startDate <= now;

                const hasNotExpired =
                    expiryDate && expiryDate > now;

                return hasStarted && hasNotExpired;
            }
        );

        if (!currentSubscription) {

            alert(
                "Your LifeTrack subscription is inactive or expired. Please activate a subscription to continue."
            );

            window.location.replace("payment.html");

            return;
        }

    } catch (error) {

        console.error(
            "Subscription verification failed:",
            error
        );

        alert(
            "Unable to verify your subscription. Please try again."
        );

        return;
    }

    // =====================================
    // 5. CUSTOMER INFORMATION
    // =====================================

    const fullName =
        currentUser.user_metadata?.full_name ||
        currentUser.email?.split("@")[0] ||
        "User";

    if (welcomeName) {
        welcomeName.textContent = fullName;
    }

    if (sidebarUserName) {
        sidebarUserName.textContent = fullName;
    }

    const avatar = fullName.charAt(0).toUpperCase();

    document.querySelectorAll(
        ".profile-avatar, .topbar-avatar"
    ).forEach((element) => {

        element.textContent = avatar;

    });

    // =====================================
    // 6. CURRENT DATE
    // =====================================

    if (currentDate) {

        currentDate.textContent =
            new Date().toLocaleDateString(
                "en-KE",
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            );
    }

    // =====================================
    // 7. SUBSCRIPTION DISPLAY
    // =====================================

    function displaySubscription() {

        const planName =
            currentSubscription.plan_name || "Premium";

        const expiryDate = new Date(
            currentSubscription.expires_at
        );

        const formattedExpiry =
            expiryDate.toLocaleDateString(
                "en-KE",
                {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            );

        // Update subscription page

        if ($("currentPlanName")) {
            $("currentPlanName").textContent = planName;
        }

        if ($("planBadgeText")) {
            $("planBadgeText").textContent = "Active";
        }

        if ($("planDescription")) {
            $("planDescription").textContent =
                "Your LifeTrack membership is currently active.";
        }

        if ($("subscriptionDetails")) {

            $("subscriptionDetails").textContent =
                "Your subscription expires on " +
                formattedExpiry + ".";
        }

        // Update sidebar plan label

        if ($("sidebarPlan")) {
            $("sidebarPlan").textContent = planName;
        }

        // Add a subscription status banner

        let banner = $("subscriptionStatusBanner");

        if (!banner) {

            banner = document.createElement("div");

            banner.id = "subscriptionStatusBanner";

            banner.style.cssText = `
                background: #f0ebff;
                border: 1px solid #d9ccff;
                border-radius: 14px;
                padding: 14px 18px;
                margin-bottom: 20px;
                color: #392080;
                font-size: 14px;
            `;

            const pageContent =
                document.querySelector(".page-content");

            if (pageContent) {
                pageContent.prepend(banner);
            }
        }

        if (banner) {

            banner.textContent =
                planName +
                " Plan · Active · Expires " +
                formattedExpiry;
        }
    }

    displaySubscription();

    // =====================================
    // 8. DASHBOARD NAVIGATION
    // =====================================

    const sectionTitles = {

        overview: "Overview",
        habits: "My Habits",
        mood: "Mood Tracker",
        journal: "My Journal",
        goals: "My Goals",
        calendar: "Growth Calendar",
        insights: "Growth Insights",
        coach: "LifeTrack AI Coach",
        notifications: "Notifications",
        subscription: "My Subscription",
        settings: "Account Settings"

    };

    function showSection(sectionId) {

        const targetSection = $(sectionId);

        if (!targetSection) {

            console.warn(
                "Dashboard section not found:",
                sectionId
            );

            return;
        }

        sections.forEach((section) => {

            section.classList.remove("active");

        });

        targetSection.classList.add("active");

        navLinks.forEach((link) => {

            link.classList.toggle(
                "active",
                link.dataset.section === sectionId
            );

        });

        document.querySelectorAll(
            ".mobile-navigation button"
        ).forEach((button) => {

            button.classList.toggle(
                "active",
                button.dataset.section === sectionId
            );

        });

        if (pageTitle) {

            pageTitle.textContent =
                sectionTitles[sectionId] || "LifeTrack";

        }

        sidebar?.classList.remove("open");

        window.location.hash = sectionId;

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    navigationButtons.forEach((button) => {

        button.addEventListener("click", function () {

            const sectionId = this.dataset.section;

            if (sectionId) {
                showSection(sectionId);
            }

        });

    });

    const initialSection =
        window.location.hash.replace("#", "");

    if (sectionTitles[initialSection]) {

        showSection(initialSection);

    }

    // =====================================
    // 9. MOBILE SIDEBAR
    // =====================================

    menuToggle?.addEventListener("click", function () {

        sidebar?.classList.toggle("open");

    });

    document.addEventListener("click", function (event) {

        if (
            window.innerWidth <= 768 &&
            sidebar?.classList.contains("open") &&
            !sidebar.contains(event.target) &&
            menuToggle &&
            !menuToggle.contains(event.target)
        ) {

            sidebar.classList.remove("open");

        }

    });


                          
    // =====================================
    // 10. LIGHT AND DARK MODE
    // =====================================

    const themeToggle = $("themeToggle");
    const settingsThemeToggle = $("settingsThemeToggle");
    const themeIcon = $("themeIcon");
    const themeToggleLabel = $("themeToggleLabel");

    function applyTheme(theme) {

        document.documentElement.setAttribute(
            "data-theme",
            theme
        );

        localStorage.setItem(
            "lifetrack-theme",
            theme
        );

        if (themeIcon) {

            themeIcon.setAttribute(
                "data-lucide",
                theme === "dark" ? "sun" : "moon"
            );
        }

        if (themeToggleLabel) {

            themeToggleLabel.textContent =
                theme === "dark" ? "Light Mode" : "Dark Mode";
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    const savedTheme =
        localStorage.getItem("lifetrack-theme") || "light";

    applyTheme(savedTheme);

    function toggleTheme() {

        const currentTheme =
            document.documentElement.getAttribute("data-theme");

        applyTheme(
            currentTheme === "dark" ? "light" : "dark"
        );
    }

    themeToggle?.addEventListener(
        "click",
        toggleTheme
    );

    settingsThemeToggle?.addEventListener(
        "click",
        toggleTheme
    );

    // =====================================
    // 11. DAILY CHECK-IN
    // =====================================

    $("dailyCheckIn")?.addEventListener(
        "click",
        function () {

            showSection("mood");

        }
    );

    // =====================================
    // 12. NOTIFICATIONS
    // =====================================

    document.querySelector(
        ".notification-button"
    )?.addEventListener(
        "click",
        function () {

            showSection("notifications");

        }
    );

    // =====================================
    // 13. PROFILE BUTTON
    // =====================================

    $("profileButton")?.addEventListener(
        "click",
        function () {

            showSection("settings");

        }
    );

    // =====================================
    // 14. ADD HABIT
    // =====================================

    $("addHabitButton")?.addEventListener(
        "click",
        function () {

            const habitName = prompt(
                "Enter your new habit:"
            );

            if (habitName && habitName.trim()) {

                alert(
                    "Your habit has been received. Database integration is the next step."
                );

            }

        }
    );

    // =====================================
    // 15. ADD GOAL
    // =====================================

    $("addGoalButton")?.addEventListener(
        "click",
        function () {

            const goalName = prompt(
                "Enter your new goal:"
            );

            if (goalName && goalName.trim()) {

                alert(
                    "Your goal has been received. Database integration is the next step."
                );

            }

        }
    );

    // =====================================
    // 16. JOURNAL
    // =====================================

    $("saveJournal")?.addEventListener(
        "click",
        function () {

            const journalEntry = $("journalEntry");

            if (!journalEntry?.value.trim()) {

                alert(
                    "Please write something before saving."
                );

                return;
            }

            alert(
                "Your journal entry is ready. Database integration is the next step."
            );

        }
    );

    // =====================================
    // 17. AI COACH PLACEHOLDER
    // =====================================

    $("aiChatForm")?.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            const messageInput = $("aiMessage");
            const messages = $("aiChatMessages");

            const message = messageInput?.value.trim();

            if (!message || !messages) return;

            const userMessage = document.createElement("p");

            userMessage.textContent = "You: " + message;

            messages.appendChild(userMessage);

            const reply = document.createElement("p");

            reply.textContent =
                "LifeTrack AI Coach will be connected to its secure AI service in a later development stage.";

            messages.appendChild(reply);

            messageInput.value = "";

        }
    );

    // =====================================
    // 18. LOGOUT
    // =====================================

    async function logout() {

        const confirmed = confirm(
            "Are you sure you want to sign out?"
        );

        if (!confirmed) return;

        const logoutButtons = [
            $("logoutButton"),
            $("settingsLogoutButton")
        ].filter(Boolean);

        logoutButtons.forEach((button) => {
            button.disabled = true;
        });

        try {

            const { error } =
                await supabaseClient.auth.signOut({
                    scope: "local"
                });

            if (error) {
                throw error;
            }

            window.location.replace("auth.html");

        } catch (error) {

            console.error(
                "LifeTrack logout error:",
                error
            );

            alert(
                "Unable to sign out. Please try again."
            );

            logoutButtons.forEach((button) => {
                button.disabled = false;
            });

        }
    }

    $("logoutButton")?.addEventListener(
        "click",
        logout
    );

    $("settingsLogoutButton")?.addEventListener(
        "click",
        logout
    );


                          
    // =====================================
    // 19. SUBSCRIPTION EXPIRY MONITOR
    // =====================================

    function checkSubscriptionExpiry() {

        const expiryDate = new Date(
            currentSubscription.expires_at
        );

        if (expiryDate <= new Date()) {

            alert(
                "Your LifeTrack subscription has expired. Please renew to continue."
            );

            window.location.replace("payment.html");

            return false;
        }

        return true;
    }

    if (!checkSubscriptionExpiry()) {
        return;
    }

    const expiryTimer = setInterval(function () {

        if (!checkSubscriptionExpiry()) {
            clearInterval(expiryTimer);
        }

    }, 60000);

    // =====================================
    // 20. INITIAL DASHBOARD DISPLAY
    // =====================================

    const overviewDate = $("overviewDate");

    if (overviewDate) {

        overviewDate.textContent =
            new Date().toLocaleDateString(
                "en-KE",
                {
                    weekday: "long",
                    month: "long",
                    day: "numeric"
                }
            );
    }

    // =====================================
    // 21. INITIALIZE LUCIDE ICONS
    // =====================================

    if (window.lucide) {
        window.lucide.createIcons();
    }

    // =====================================
    // 22. DASHBOARD READY
    // =====================================

    console.log(
        "LifeTrack premium dashboard initialized successfully."
    );

    console.log(
        "Authenticated customer:",
        currentUser.email
    );

    console.log(
        "Active subscription:",
        currentSubscription.plan_name
    );

    console.log(
        "Subscription expires:",
        currentSubscription.expires_at
    );
// =====================================
// LIFETRACK DASHBOARD CUSTOMIZATION
// =====================================

const dashboardPreferenceDefaults = {
    layout_name: "rich",
    widget_order: [
        "daily_progress",
        "habit_summary",
        "mood_summary",
        "weekly_analytics",
        "active_goals",
        "recent_activity"
    ],
    hidden_widgets: [],
    widget_sizes: {}
};

let dashboardPreferences = null;

// Load the user's dashboard preferences
async function loadDashboardPreferences() {

    const { data, error } = await window.lifeTrackSupabase
        .from("dashboard_preferences")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (error) {
        console.error(
            "Could not load dashboard preferences:",
            error
        );
        return;
    }

    if (data) {
        dashboardPreferences = data;
    } else {

        const { data: newPreferences, error: insertError } =
            await window.lifeTrackSupabase
                .from("dashboard_preferences")
                .insert({
                    user_id: currentUser.id,
                    ...dashboardPreferenceDefaults
                })
                .select()
                .single();

        if (insertError) {
            console.error(
                "Could not create dashboard preferences:",
                insertError
            );
            return;
        }

        dashboardPreferences = newPreferences;
    }

    console.log(
        "Dashboard preferences loaded:",
        dashboardPreferences
    );
                   }
   
// Save dashboard preferences to Supabase
async function saveDashboardPreferences(updates = {}) {

    if (!dashboardPreferences) {
        console.warn("Dashboard preferences are not loaded yet.");
        return;
    }

    const updatedPreferences = {
        ...dashboardPreferences,
        ...updates,
        user_id: currentUser.id,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await window.lifeTrackSupabase
        .from("dashboard_preferences")
        .upsert(updatedPreferences, {
            onConflict: "user_id"
        })
        .select()
        .single();

    if (error) {
        console.error(
            "Could not save dashboard preferences:",
            error
        );
        alert("Your dashboard settings could not be saved.");
        return;
    }

    dashboardPreferences = data;

    console.log("Dashboard preferences saved successfully.");
}
   
  
// Load dashboard customization after authentication
await loadDashboardPreferences();
   

});
