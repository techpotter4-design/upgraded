
/* =========================================
   LIFETRACK PREMIUM DASHBOARD
   VOUCHER-ONLY ACCESS CONTROL
   AUTHENTICATION + DASHBOARD INTERACTIONS
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

    const navLinks = document.querySelectorAll(".nav-link");

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
        console.error("LifeTrack: Supabase unavailable.");

        alert("Unable to connect to LifeTrack. Please refresh.");

        return;
    }

    // =====================================
    // 3. AUTHENTICATION
    // =====================================

    let currentUser = null;

    try {
        const {
            data,
            error
        } = await supabaseClient.auth.getUser();

        if (error || !data?.user) {
            window.location.replace("auth.html");
            return;
        }

        currentUser = data.user;

    } catch (error) {
        console.error("Authentication error:", error);

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
                starts_at,
                expires_at,
                activation_source
            `)
            .eq("user_id", currentUser.id)
            .eq("status", "active")
            .eq("activation_source", "voucher")
            .order("expires_at", {
                ascending: false
            });

        if (error) {
            console.error(
                "Voucher subscription verification failed:",
                error
            );

            alert(
                "We couldn't verify your voucher access. Please try again."
            );

            return;
        }

        const now = Date.now();

        currentSubscription = (subscriptions || []).find(
            (subscription) => {
                const start = subscription.starts_at
                    ? new Date(subscription.starts_at).getTime()
                    : 0;

                const expiry = subscription.expires_at
                    ? new Date(subscription.expires_at).getTime()
                    : 0;

                return (
                    start <= now &&
                    expiry > now &&
                    Number.isFinite(start) &&
                    Number.isFinite(expiry)
                );
            }
        );

        if (!currentSubscription) {
            alert(
                "Dashboard access requires a valid voucher. Please redeem a voucher to continue."
            );

            window.location.replace("payment.html");
            return;
        }

        console.log(
            "Voucher access verified:",
            currentSubscription.plan_name
        );

    } catch (error) {
        console.error("Subscription verification error:", error);

        alert("Unable to verify your voucher. Please try again.");

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
    // 7. SUBSCRIPTION INFORMATION
    // =====================================

    function displaySubscription() {
        const existingBanner = $("subscriptionStatusBanner");

        if (existingBanner) {
            existingBanner.remove();
        }

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

        const title = document.createElement("strong");

        title.textContent =
            `${currentSubscription.plan_name} Plan`;

        const status = document.createElement("p");

        status.style.margin = "7px 0";

        status.textContent =
            "Subscription status: Active (Voucher Verified)";

        const expiry = document.createElement("p");

        expiry.style.margin = "7px 0 0";

        expiry.textContent =
            "Expires: " +
            new Date(
                currentSubscription.expires_at
            ).toLocaleDateString("en-KE", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });

        banner.append(title, status, expiry);

        const main = document.querySelector("main");

        if (main) {
            main.prepend(banner);
        } else if (sections.length) {
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
    // 10. DAILY CHECK-IN
    // =====================================

    $("dailyCheckIn")?.addEventListener("click", function () {
        showSection("mood");
    });

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

    $("profileButton")?.addEventListener("click", function () {
        showSection("settings");
    });

    // =====================================
    // 13. ADD HABIT
    // =====================================

    $("addHabitButton")?.addEventListener("click", function () {
        const habitName = prompt("Enter your new habit:");

        if (habitName && habitName.trim()) {
            alert(
                "Habit received: " +
                habitName.trim() +
                ". Habit database integration is our next step."
            );
        }
    });

    // =====================================
    // 14. ADD GOAL
    // =====================================

    $("addGoalButton")?.addEventListener("click", function () {
        const goalName = prompt("Enter your new goal:");

        if (goalName && goalName.trim()) {
            alert(
                "Goal received: " +
                goalName.trim() +
                ". Goal database integration is our next step."
            );
        }
    });

    // =====================================
    // 15. JOURNAL
    // =====================================

    $("saveJournal")?.addEventListener("click", function () {
        const journalEntry = $("journalEntry");

        if (!journalEntry?.value.trim()) {
            alert("Please write something before saving.");
            return;
        }

        alert(
            "Your reflection has been entered. Journal database integration is our next step."
        );
    });

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

    logoutButton.addEventListener("click", async function () {
        const confirmed = confirm(
            "Are you sure you want to sign out?"
        );

        if (!confirmed) return;

        logoutButton.disabled = true;

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error("Logout error:", error);

            alert("Unable to sign out. Please try again.");

            logoutButton.disabled = false;

            return;
        }

        window.location.replace("auth.html");
    });

    sidebar?.appendChild(logoutButton);

    // =====================================
    // 18. AUTOMATIC EXPIRY CHECK
    // =====================================

    const expiryTime = new Date(
        currentSubscription.expires_at
    ).getTime();

    const remainingTime = expiryTime - Date.now();

    if (remainingTime > 0) {
        setTimeout(() => {
            alert(
                "Your LifeTrack voucher subscription has expired. Please redeem a new voucher."
            );

            window.location.replace("payment.html");
        }, Math.min(remainingTime, 2147483647));
    }

    // =====================================
    // 19. INITIALIZATION COMPLETE
    // =====================================

    console.log(
        "LifeTrack dashboard initialized successfully."
    );

    console.log("Authenticated user:", currentUser.email);

    console.log(
        "Verified voucher plan:",
        currentSubscription.plan_name
    );
});
   
