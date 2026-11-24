
/* =========================================
   LIFETRACK PREMIUM DASHBOARD
   Authentication + Subscription Access
   Dashboard Interactions
========================================= */

document.addEventListener("DOMContentLoaded", async function () {

    "use strict";

    // =====================================
    // 1. ELEMENTS
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
        console.error("LifeTrack: Supabase connection unavailable.");

        alert(
            "Unable to connect to LifeTrack. Please refresh the page."
        );

        return;
    }

    // =====================================
    // 3. VERIFY AUTHENTICATION
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

        alert("Unable to verify your account. Please log in again.");

        window.location.replace("auth.html");
        return;
    }

    // =====================================
    // 4. VERIFY PREMIUM SUBSCRIPTION
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
                starts_at,
                expires_at
            `)
            .eq("user_id", currentUser.id)
            .eq("status", "active")
            .order("expires_at", {
                ascending: false
            });

        if (error) {
            console.error(
                "LifeTrack subscription verification error:",
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
                "Your LifeTrack subscription is inactive or expired. Please subscribe to continue."
            );

            window.location.replace("payment.html");
            return;
        }

        console.log(
            "LifeTrack subscription verified:",
            currentSubscription
        );

    } catch (error) {

        console.error(
            "LifeTrack subscription check failed:",
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
    // 7. SUBSCRIPTION INFORMATION
    // =====================================

    function displaySubscription() {

        const banner = document.createElement("div");

        banner.id = "subscriptionStatusBanner";

        banner.style.cssText = `
            background: #f0ebff;
            border: 1px solid #d9ccff;
            border-radius: 14px;
            padding: 16px 20px;
            margin: 16px 0;
            color: #392080;
            font-size: 14px;
        `;

        const planTitle = document.createElement("strong");

        planTitle.textContent =
            `${currentSubscription.plan_name} Plan`;

        const statusText = document.createElement("p");

        statusText.style.margin = "7px 0";

        statusText.textContent = "Subscription status: Active";

        const expiryText = document.createElement("p");

        expiryText.style.margin = "7px 0 0";

        expiryText.textContent =
            "Expires: " +
            new Date(
                currentSubscription.expires_at
            ).toLocaleDateString("en-KE", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });

        banner.append(
            planTitle,
            statusText,
            expiryText
        );

        const main = document.querySelector("main");

        if (main) {
            main.prepend(banner);
        } else if (sections.length > 0) {
            sections[0].prepend(banner);
        }
    }

    displaySubscription();

    // =====================================
    // 8. SECTION NAVIGATION
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
                "LifeTrack: Dashboard section not found:",
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
    // 10. DAILY CHECK-IN
    // =====================================

    $("dailyCheckIn")?.addEventListener(
        "click",
        function () {
            showSection("mood");
        }
    );

    // =====================================
    // 11. NOTIFICATIONS
    // =====================================

    document.querySelector(
        ".notification-button"
    )?.addEventListener("click", function () {

        showSection("notifications");
    });

    // =====================================
    // 12. PROFILE BUTTON
    // =====================================

    $("profileButton")?.addEventListener(
        "click",
        function () {
            showSection("settings");
        }
    );

    // =====================================
    // 13. ADD HABIT
    // =====================================

    $("addHabitButton")?.addEventListener(
        "click",
        function () {

            const habitName = prompt(
                "Enter your new habit:"
            );

            if (habitName && habitName.trim()) {

                alert(
                    "Habit received: " +
                    habitName.trim() +
                    ". Habit database integration is our next step."
                );
            }
        }
    );

    // =====================================
    // 14. ADD GOAL
    // =====================================

    $("addGoalButton")?.addEventListener(
        "click",
        function () {

            const goalName = prompt(
                "Enter your new goal:"
            );

            if (goalName && goalName.trim()) {

                alert(
                    "Goal received: " +
                    goalName.trim() +
                    ". Goal database integration is our next step."
                );
            }
        }
    );

    // =====================================
    // 15. JOURNAL
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
                "Your reflection has been entered. Journal database integration is our next step."
            );
        }
    );

    // =====================================
    // 16. AI COACH PLACEHOLDER
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
    // 17. LOGOUT
    // =====================================

    const logoutButton = document.createElement("button");

    logoutButton.type = "button";
    logoutButton.textContent = "Sign Out";
    logoutButton.className = "nav-link";

    logoutButton.style.cssText = `
        border: none;
        background: transparent;
        width: 100%;
        text-align: left;
        cursor: pointer;
    `;

    logoutButton.addEventListener(
        "click",
        async function () {

            const confirmed = confirm(
                "Are you sure you want to sign out?"
            );

            if (!confirmed) return;

            const { error } =
                await supabaseClient.auth.signOut();

            if (error) {

                console.error(
                    "LifeTrack logout error:",
                    error
                );

                alert(
                    "Unable to sign out. Please try again."
                );

                return;
            }

            window.location.replace("auth.html");
        }
    );

    sidebar?.appendChild(logoutButton);

    // =====================================
    // 18. INITIALIZATION COMPLETE
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

});
        
