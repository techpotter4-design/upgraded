
/* =========================================
   LIFETRACK PREMIUM DASHBOARD
   Dashboard interactions
   ========================================= */

document.addEventListener("DOMContentLoaded", async function () {

    // =====================================
    // 1. ELEMENTS
    // =====================================

    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const pageTitle = document.getElementById("pageTitle");

    const sections = document.querySelectorAll(".dashboard-section");
    const navLinks = document.querySelectorAll(".nav-link");
    const navigationButtons = document.querySelectorAll("[data-section]");

    const welcomeName = document.getElementById("welcomeName");
    const sidebarUserName = document.getElementById("sidebarUserName");

    const currentDate = document.getElementById("currentDate");


    // =====================================
    // 2. SUPABASE CONNECTION
    // =====================================

    const supabaseClient = window.lifeTrackSupabase;

    if (!supabaseClient) {
        console.error("LifeTrack Supabase is not connected.");
    }

    // Require a logged-in user before showing the dashboard.
    if (!supabaseClient) {
        alert("Unable to connect to LifeTrack. Please try again.");
        return;
    }

    let currentUser = null;

    try {
        const { data, error } = await supabaseClient.auth.getUser();

        if (error || !data.user) {
            window.location.href = "auth.html";
            return;
        }

        currentUser = data.user;

    } catch (error) {
        console.error("Authentication error:", error);
        window.location.href = "auth.html";
        return;
    }


    // =====================================
    // 3. CUSTOMER INFORMATION
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

    document.querySelectorAll(".profile-avatar, .topbar-avatar")
        .forEach(element => {
            element.textContent = avatar;
        });


    // =====================================
    // 4. CURRENT DATE
    // =====================================

    if (currentDate) {
        currentDate.textContent = new Date().toLocaleDateString(
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
    // 5. SECTION NAVIGATION
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

        const targetSection = document.getElementById(sectionId);

        if (!targetSection) return;

        sections.forEach(section => {
            section.classList.remove("active");
        });

        targetSection.classList.add("active");

        navLinks.forEach(link => {
            link.classList.toggle(
                "active",
                link.dataset.section === sectionId
            );
        });

        document.querySelectorAll(".mobile-navigation button")
            .forEach(button => {
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

    navigationButtons.forEach(button => {

        button.addEventListener("click", function () {

            const sectionId = this.dataset.section;

            if (sectionId) {
                showSection(sectionId);
            }

        });

    });

    // Open the requested section when a dashboard link is used.
    const initialSection = window.location.hash.replace("#", "");

    if (sectionTitles[initialSection]) {
        showSection(initialSection);
    }


    // =====================================
    // 6. MOBILE SIDEBAR
    // =====================================

    menuToggle?.addEventListener("click", function () {
        sidebar?.classList.toggle("open");
    });

    document.addEventListener("click", function (event) {

        if (
            window.innerWidth <= 768 &&
            sidebar?.classList.contains("open") &&
            !sidebar.contains(event.target) &&
            !menuToggle.contains(event.target)
        ) {
            sidebar.classList.remove("open");
        }

    });


    // =====================================
    // 7. DAILY CHECK-IN
    // =====================================

    const dailyCheckIn = document.getElementById("dailyCheckIn");

    dailyCheckIn?.addEventListener("click", function () {
        showSection("mood");
    });


    // =====================================
    // 8. NOTIFICATION BUTTON
    // =====================================

    const notificationButton = document.querySelector(
        ".notification-button"
    );

    notificationButton?.addEventListener("click", function () {
        showSection("notifications");
    });


    // =====================================
    // 9. PROFILE BUTTON
    // =====================================

    document.getElementById("profileButton")
        ?.addEventListener("click", function () {
            showSection("settings");
        });


    // =====================================
    // 10. HABIT AND GOAL BUTTONS
    // =====================================

    document.getElementById("addHabitButton")
        ?.addEventListener("click", function () {

            const habitName = prompt("Enter your new habit:");

            if (habitName && habitName.trim()) {
                alert(
                    "Habit received: " + habitName +
                    ". Saving habits will be connected next."
                );
            }

        });


    document.getElementById("addGoalButton")
        ?.addEventListener("click", function () {

            const goalName = prompt("Enter your new goal:");

            if (goalName && goalName.trim()) {
                alert(
                    "Goal received: " + goalName +
                    ". Goal saving will be connected next."
                );
            }

        });


    // =====================================
    // 11. JOURNAL BUTTON
    // =====================================

    document.getElementById("saveJournal")
        ?.addEventListener("click", function () {

            const journalEntry =
                document.getElementById("journalEntry");

            if (!journalEntry.value.trim()) {
                alert("Please write something before saving.");
                return;
            }

            alert(
                "Your reflection has been entered. " +
                "Secure journal storage will be connected next."
            );

        });


    // =====================================
    // 12. AI COACH PLACEHOLDER
    // =====================================

    document.getElementById("aiChatForm")
        ?.addEventListener("submit", function (event) {

            event.preventDefault();

            const messageInput =
                document.getElementById("aiMessage");

            const message = messageInput.value.trim();

            if (!message) return;

            const messages =
                document.getElementById("aiChatMessages");

            const userMessage = document.createElement("p");

            userMessage.textContent = "You: " + message;

            messages.appendChild(userMessage);

            const reply = document.createElement("p");

            reply.textContent =
                "LifeTrack AI Coach will be connected to its secure AI service in a later step.";

            messages.appendChild(reply);

            messageInput.value = "";

        });


    // =====================================
    // 13. LOGOUT
    // =====================================

    const logoutButton = document.createElement("button");

    logoutButton.textContent = "Sign Out";
    logoutButton.className = "nav-link";
    logoutButton.style.border = "none";
    logoutButton.style.background = "transparent";
    logoutButton.style.width = "100%";
    logoutButton.style.textAlign = "left";
    logoutButton.style.cursor = "pointer";

    logoutButton.addEventListener("click", async function () {

        const confirmed = confirm(
            "Are you sure you want to sign out?"
        );

        if (!confirmed) return;

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            alert("Unable to sign out. Please try again.");
            console.error(error);
            return;
        }

        window.location.href = "auth.html";

    });

    sidebar?.appendChild(logoutButton);


    console.log("LifeTrack dashboard initialized successfully.");

});
