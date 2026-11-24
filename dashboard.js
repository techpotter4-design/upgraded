
document.addEventListener("DOMContentLoaded", async function () {
    "use strict";

    // =====================================
    // 1. LIFETRACK CONFIGURATION
    // =====================================

    const supabase = window.lifeTrackSupabase;

    if (!supabase) {
        console.error("LifeTrack: Supabase is not initialized.");
        alert("Connection error. Please refresh the page.");
        return;
    }

    let currentUser = null;
    let currentSubscription = null;

    // =====================================
    // 2. AUTHENTICATION
    // =====================================

    async function authenticateUser() {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
            window.location.href = "auth.html";
            return false;
        }

        currentUser = data.user;
        return true;
    }

    // =====================================
    // 3. SUBSCRIPTION VERIFICATION
    // =====================================

async function verifySubscription() {
    const { data, error } = await supabase.rpc(
        "has_active_voucher_subscription"
    );

    if (error) {
        console.error("Subscription verification failed:", error);
        alert("We couldn't verify your subscription. Please try again.");
        return false;
    }

    if (data !== true) {
        window.location.href = "payment.html";
        return false;
    }

    return true;
}
   

    // =====================================
    // 4. LOAD USER IDENTITY
    // =====================================

    function displayUserInformation() {
        const displayName =
            currentUser.user_metadata?.full_name ||
            currentUser.user_metadata?.name ||
            currentUser.email?.split("@")[0] ||
            "LifeTrack Member";

        const nameElements = [
            document.getElementById("profileName"),
            document.getElementById("userName"),
            document.getElementById("welcomeName")
        ];

        nameElements.forEach(function (element) {
            if (element) element.textContent = displayName;
        });

        const emailElement = document.getElementById("profileEmail");

        if (emailElement) {
            emailElement.textContent = currentUser.email || "";
        }

        const planName =
            currentSubscription.plan_name || "Premium";

        const planElements = [
            document.getElementById("currentPlanName"),
            document.getElementById("planBadgeText")
        ];

        planElements.forEach(function (element) {
            if (element) element.textContent = planName;
        });

        const details = document.getElementById("subscriptionDetails");

        if (details) {
            details.textContent =
                "Your subscription expires " +
                new Date(currentSubscription.expires_at)
                    .toLocaleDateString();
        }
    }

    // =====================================
    // 5. INITIALIZE DASHBOARD
    // =====================================

    const authenticated = await authenticateUser();

    if (!authenticated) return;

    const subscriptionActive = await verifySubscription();

    if (!subscriptionActive) return;

    displayUserInformation();

    console.log("LifeTrack dashboard initialized.");

    // More dashboard functionality will be added below.

// =====================================
// 6. DASHBOARD NAVIGATION
// =====================================

const navLinks = document.querySelectorAll(".nav-link");
const dashboardSections = document.querySelectorAll(
    ".dashboard-section"
);

function openDashboardSection(sectionId) {
    const targetSection = document.getElementById(sectionId);

    if (!targetSection) {
        console.warn("Dashboard section not found:", sectionId);
        return;
    }

    dashboardSections.forEach(function (section) {
        section.classList.remove("active");
    });

    navLinks.forEach(function (link) {
        link.classList.remove("active");
    });

    targetSection.classList.add("active");

    const activeLink = document.querySelector(
        '.nav-link[data-section="' + sectionId + '"]'
    );

    if (activeLink) {
        activeLink.classList.add("active");
    }

    document.querySelector(".main-content")?.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
        const sectionId = link.dataset.section;

        if (sectionId === "coach") {
            window.location.href = "ai-coach.html";
            return;
        }

        if (sectionId) {
            openDashboardSection(sectionId);
        }
    });
});

// =====================================
// 7. THEME MANAGEMENT
// =====================================

const themeButtons = [
    document.getElementById("themeToggle"),
    document.getElementById("settingsThemeToggle")
].filter(Boolean);

function applyTheme(theme) {
    document.body.classList.toggle(
        "dark-mode",
        theme === "dark"
    );

    localStorage.setItem("lifetrack_theme", theme);
}

const savedTheme =
    localStorage.getItem("lifetrack_theme") || "light";

applyTheme(savedTheme);

themeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        const isDark =
            document.body.classList.contains("dark-mode");

        applyTheme(isDark ? "light" : "dark");
    });
});

// =====================================
// 8. LOGOUT
// =====================================

async function logoutUser() {
    const confirmed = window.confirm(
        "Are you sure you want to log out?"
    );

    if (!confirmed) return;

    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error("Logout failed:", error);
        alert("Unable to log out. Please try again.");
        return;
    }

    window.location.href = "auth.html";
}

document.querySelectorAll(
    "#logoutButton, #settingsLogoutButton"
).forEach(function (button) {
    button.addEventListener("click", logoutUser);
});
   
});
