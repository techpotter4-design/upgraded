
// =====================================
// LIFETRACK 2.0
// SECTION 1: FOUNDATION JS
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    // SUPABASE CONNECTION
    const db = window.lifeTrackSupabase;

    if (!db) {
        console.error(
            "LifeTrack: Supabase connection unavailable."
        );
        return;
    }

    // GLOBAL APPLICATION STATE
    window.LifeTrack = {
        db: db,
        user: null,
        profile: null,
        subscription: null,

        currentSection: "overview",

        sidebarOpen: false,
        sidebarCollapsed: false,

        habits: [],
        moods: [],
        journalEntries: [],
        goals: []
    };

    // SHARED HELPERS
    window.LifeTrack.helpers = {

        get(selector) {
            return document.querySelector(selector);
        },

        getAll(selector) {
            return document.querySelectorAll(selector);
        },

        message(selector, text) {
            const element = document.querySelector(selector);

            if (element) {
                element.textContent = text;
            }
        }
    };

    // AUTHENTICATION CHECK
    async function initialize() {

        try {
            const {
                data,
                error
            } = await db.auth.getUser();

            if (error || !data.user) {
                window.location.replace("auth.html");
                return;
            }

            window.LifeTrack.user = data.user;

            console.log(
                "LifeTrack initialized successfully."
            );

            document.dispatchEvent(
                new CustomEvent("lifetrack:ready", {
                    detail: {
                        user: data.user
                    }
                })
            );

        } catch (error) {

            console.error(
                "LifeTrack initialization error:",
                error
            );

        }
    }

    // START APPLICATION
    initialize();

});
        
// =====================================
// SECTION 2: SIDEBAR JAVASCRIPT
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const closeButton = document.getElementById("sidebarCloseButton");
    const collapseButton = document.getElementById("sidebarCollapseButton");
    const navigation = document.getElementById("sidebarNavigation");
    const logoutButton = document.getElementById("logoutButton");

    if (!sidebar || !navigation) return;

    // OPEN SIDEBAR
    window.LifeTrack.openSidebar = () => {
        document.body.classList.add("sidebar-open");
        window.LifeTrack.sidebarOpen = true;
    };

    // CLOSE SIDEBAR
    window.LifeTrack.closeSidebar = () => {
        document.body.classList.remove("sidebar-open");
        window.LifeTrack.sidebarOpen = false;
    };

    // MOBILE CLOSE BUTTON
    closeButton?.addEventListener("click", () => {
        window.LifeTrack.closeSidebar();
    });

    // CLICK OUTSIDE SIDEBAR
    overlay?.addEventListener("click", () => {
        window.LifeTrack.closeSidebar();
    });

    // DESKTOP COLLAPSE
    collapseButton?.addEventListener("click", () => {
        document.body.classList.toggle("sidebar-collapsed");

        window.LifeTrack.sidebarCollapsed =
            document.body.classList.contains("sidebar-collapsed");
    });

    // ESCAPE KEY
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            window.LifeTrack.closeSidebar();
        }
    });

    // NAVIGATION
    navigation.addEventListener("click", (event) => {

        const link = event.target.closest(".nav-link");

        if (!link) return;

        const page = link.dataset.page;
        const section = link.dataset.section;

        if (page) {
            window.location.href = page;
            return;
        }

        if (!section) return;

        const target = document.getElementById(
            "section-" + section
        );

        if (!target) {
            console.warn("Section not ready:", section);
            return;
        }

        document.querySelectorAll(".dashboard-section")
            .forEach(item => item.hidden = true);

        target.hidden = false;

        navigation.querySelectorAll(".nav-link")
            .forEach(item => item.classList.remove("active"));

        link.classList.add("active");

        window.LifeTrack.currentSection = section;

        const title = document.getElementById("pageTitle");

        if (title) {
            title.textContent =
                link.querySelector("span")?.textContent || "Dashboard";
        }

        window.LifeTrack.closeSidebar();
    });

    // SIGN OUT
    logoutButton?.addEventListener("click", async () => {

        if (!confirm("Are you sure you want to sign out?")) {
            return;
        }

        const { error } =
            await window.LifeTrack.db.auth.signOut();

        if (error) {
            alert("Unable to sign out. Please try again.");
            console.error(error);
            return;
        }

        window.location.replace("auth.html");
    });

    // REFRESH SIDEBAR ICONS
    if (window.lucide) {
        window.lucide.createIcons();
    }

});


// =====================================
// SECTION 3: TOPBAR JAVASCRIPT
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    // MOBILE MENU BUTTON
    const menuButton = document.getElementById(
        "mobileMenuButton"
    );

    menuButton?.addEventListener("click", () => {
        document.body.classList.add("sidebar-open");

        if (window.LifeTrack) {
            window.LifeTrack.sidebarOpen = true;
        }
    });

    // CURRENT DATE
    const dateElement = document.getElementById(
        "currentDate"
    );

    if (dateElement) {
        dateElement.textContent =
            new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
            });
    }

    // USER PROFILE
    const user = window.LifeTrack?.user;

    if (user) {

        const name =
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "User";

        const initial = name.charAt(0).toUpperCase();

        const nameElement = document.getElementById(
            "sidebarUserName"
        );

        const sidebarAvatar = document.getElementById(
            "sidebarAvatar"
        );

        const topbarAvatar = document.getElementById(
            "topbarAvatar"
        );

        if (nameElement) nameElement.textContent = name;
        if (sidebarAvatar) sidebarAvatar.textContent = initial;
        if (topbarAvatar) topbarAvatar.textContent = initial;
    }

    // NOTIFICATIONS BUTTON
    document.getElementById("notificationButton")
        ?.addEventListener("click", () => {

            const notificationLink =
                document.querySelector(
                    '[data-section="notifications"]'
                );

            notificationLink?.click();
        });

    // REFRESH ICONS
    if (window.lucide) {
        window.lucide.createIcons();
    }

});

// =====================================
// SECTION 4: OVERVIEW JAVASCRIPT
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    const app = window.LifeTrack;
    if (!app) return;

    // WAIT FOR AUTHENTICATION
    document.addEventListener("lifetrack:ready", loadOverview);

    async function loadOverview() {

        const db = app.db;
        const user = app.user;

        if (!user) return;

        const today = new Date().toISOString().split("T")[0];

        // USER GREETING
        const name =
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "there";

        document.getElementById("welcomeUserName")
            .textContent = name;

        document.getElementById("welcomeDate")
            .textContent = new Date().toLocaleDateString(
                "en-US",
                { month: "long", day: "numeric" }
            );

        try {

            // LOAD HABITS
            const habitsResult = await db
                .from("habits")
                .select("id, title, is_active")
                .eq("user_id", user.id)
                .eq("is_active", true);

            if (habitsResult.error) throw habitsResult.error;

            const habits = habitsResult.data || [];

            app.habits = habits;

            document.getElementById("activeHabitsCount")
                .textContent = habits.length;

            // LOAD HABIT LOGS
            const logsResult = await db
                .from("habit_logs")
                .select("habit_id, completed_on, completed")
                .eq("user_id", user.id)
                .eq("completed", true)
                .order("completed_on", { ascending: false });

            if (logsResult.error) throw logsResult.error;

            const logs = logsResult.data || [];

            const completedToday = logs.filter(
                log => log.completed_on === today
            );

            document.getElementById("completedHabitsCount")
                .textContent = completedToday.length;

            // LOAD TODAY'S MOOD
            const moodResult = await db
                .from("mood_entries")
                .select("mood, mood_score, note")
                .eq("user_id", user.id)
                .eq("entry_date", today)
                .limit(1);

            if (moodResult.error) throw moodResult.error;

            const mood = moodResult.data?.[0];

            if (mood) {
                document.getElementById("todayMoodSummary")
                    .textContent = mood.mood;
            }

            // LOAD GOALS
            const goalsResult = await db
                .from("goals")
                .select("id, title, progress, status")
                .eq("user_id", user.id);

            if (goalsResult.error) throw goalsResult.error;

            const goals = goalsResult.data || [];

            app.goals = goals;

            const activeGoals = goals.filter(
                goal => goal.status !== "completed"
            );

            const average = activeGoals.length
                ? Math.round(
                    activeGoals.reduce(
                        (sum, goal) => sum + (goal.progress || 0), 0
                    ) / activeGoals.length
                )
                : 0;

            document.getElementById("goalProgress")
                .textContent = average + "%";

            // TODAY'S HABIT LIST
            const habitList = document.getElementById(
                "todayHabitsList"
            );

            habitList.textContent = "";

            if (habits.length) {
                habits.forEach(habit => {
                    const item = document.createElement("p");
                    item.className = "empty-message";
                    item.textContent =
                        (completedToday.some(
                            log => log.habit_id === habit.id
                        ) ? "✓ " : "○ ") + habit.title;

                    habitList.appendChild(item);
                });
            }

            // GOAL PREVIEW
            const goalList = document.getElementById(
                "overviewGoalsList"
            );

            goalList.textContent = "";

            activeGoals.slice(0, 3).forEach(goal => {
                const item = document.createElement("p");
                item.className = "empty-message";
                item.textContent =
                    goal.title + " — " + (goal.progress || 0) + "%";

                goalList.appendChild(item);
            });

        } catch (error) {
            console.error("Overview loading error:", error);
        }
    }

    // QUICK ACTION NAVIGATION
    document.getElementById("pageContent")
        ?.addEventListener("click", event => {

            const button = event.target.closest(
                "[data-section]"
            );

            if (!button) return;

            const section = button.dataset.section;

            const navLink = document.querySelector(
                `.nav-link[data-section="${section}"]`
            );

            navLink?.click();
        });

});
                    
            
