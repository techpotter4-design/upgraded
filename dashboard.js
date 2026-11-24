
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
    
// =====================================
// 9. HABIT MANAGEMENT SYSTEM
// =====================================

let habits = [];
let habitLogs = [];
let habitFilter = "all";

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

async function loadHabits() {
    const { data, error } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Habit loading failed:", error);
        return;
    }

    habits = data || [];

    const { data: logs, error: logError } = await supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("completed_on", { ascending: false });

    if (logError) {
        console.error("Habit history loading failed:", logError);
        return;
    }

    habitLogs = logs || [];
    renderHabits();
}

function isHabitCompleted(habitId, date = localDateString()) {
    return habitLogs.some(log =>
        log.habit_id === habitId &&
        log.completed_on === date &&
        log.completed
    );
}

function renderHabits() {
    const container = document.getElementById("habitList");
    if (!container) return;

    const today = localDateString();

    const filtered = habits.filter(habit => {
        const completed = isHabitCompleted(habit.id);

        if (habitFilter === "completed") return completed;
        if (habitFilter === "pending") return !completed;
        return true;
    });

    container.innerHTML = "";

    if (!filtered.length) {
        container.innerHTML =
            '<div class="empty-state">No habits found. Add your first habit!</div>';
    }

    filtered.forEach(habit => {
        const completed = isHabitCompleted(habit.id);
        const item = document.createElement("div");

        item.className = "habit-item";
        item.innerHTML = `
            <div>
                <h4>${escapeHTML(habit.title)}</h4>
                <p>${escapeHTML(habit.frequency || "daily")}</p>
            </div>
            <label>
                <input type="checkbox"
                    data-habit-id="${habit.id}"
                    ${completed ? "checked" : ""}>
                <span>${completed ? "Completed" : "Mark done"}</span>
            </label>
        `;

        container.appendChild(item);
    });

    const todayContainer = document.getElementById("todayHabits");

    if (todayContainer) {
        todayContainer.innerHTML = "";

        habits.forEach(habit => {
            const completed = isHabitCompleted(habit.id);
            const item = document.createElement("div");

            item.className = "habit-item";
            item.innerHTML = `
                <div>
                    <h4>${escapeHTML(habit.title)}</h4>
                    <p>${completed ? "Completed today" : "Still pending"}</p>
                </div>
                <span>${completed ? "Done" : "Pending"}</span>
            `;

            todayContainer.appendChild(item);
        });
    }

    updateHabitStatistics();
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

// ADD A NEW HABIT

const addHabitButton = document.getElementById("addHabitButton");

if (addHabitButton) {
    addHabitButton.addEventListener("click", async function () {
        const title = prompt("What habit would you like to build?");
        if (!title || !title.trim()) return;

        const description = prompt("Add a short description (optional):") || "";

        const { error } = await supabase.from("habits").insert({
            user_id: currentUser.id,
            title: title.trim(),
            description: description.trim(),
            frequency: "daily",
            target_days: [0, 1, 2, 3, 4, 5, 6],
            is_active: true
        });

        if (error) {
            console.error("Could not create habit:", error);
            alert("Your habit could not be saved.");
            return;
        }

        await loadHabits();
    });
}

// MARK A HABIT COMPLETE

document.addEventListener("change", async function (event) {
    const checkbox = event.target.closest("[data-habit-id]");
    if (!checkbox) return;

    const habitId = checkbox.dataset.habitId;
    const completed = checkbox.checked;

    const { error } = await supabase
        .from("habit_logs")
        .upsert({
            habit_id: habitId,
            user_id: currentUser.id,
            completed_on: localDateString(),
            completed: completed
        }, {
            onConflict: "habit_id,completed_on"
        });

    if (error) {
        console.error("Habit update failed:", error);
        alert("Could not update your habit.");
        checkbox.checked = !completed;
        return;
    }

    await loadHabits();
});

// HABIT FILTERS

document.querySelectorAll("[data-habit-filter]").forEach(button => {
    button.addEventListener("click", function () {
        habitFilter = button.dataset.habitFilter;
        renderHabits();
    });
});

// HABIT STATISTICS

function updateHabitStatistics() {
    const total = habits.length;
    const completed = habits.filter(h =>
        isHabitCompleted(h.id)
    ).length;

    const percentage = total
        ? Math.round((completed / total) * 100)
        : 0;

    setText("totalHabits", total);
    setText("completedHabitsToday", completed);
    setText("habitsCompleted", completed);

    setText("dailyProgressText", `${percentage}%`);

    const progress = document.getElementById("dailyProgress");

    if (progress) {
        progress.style.width = `${percentage}%`;
    }
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

// LOAD HABITS

await loadHabits();
    
// =====================================
// 10. MOOD TRACKING
// =====================================

let selectedMood = null;

const moodButtons = document.querySelectorAll("[data-mood]");

moodButtons.forEach(button => {
    button.addEventListener("click", function () {
        selectedMood = button.dataset.mood;

        moodButtons.forEach(item =>
            item.classList.remove("selected")
        );

        button.classList.add("selected");
    });
});

const saveMoodButton = document.getElementById("saveMoodButton");

if (saveMoodButton) {
    saveMoodButton.addEventListener("click", saveMood);
}

async function saveMood() {
    if (!selectedMood) {
        alert("Please select your mood first.");
        return;
    }

    const note = document.getElementById("moodNote")?.value || "";

    const { error } = await supabase.from("mood_entries").insert({
        user_id: currentUser.id,
        mood: selectedMood,
        notes: note.trim(),
        entry_date: localDateString()
    });

    if (error) {
        console.error("Mood saving failed:", error);
        alert("Your mood could not be saved.");
        return;
    }

    const message = document.getElementById("moodMessage");

    if (message) {
        message.textContent = "Your mood has been saved successfully.";
    }

    document.getElementById("moodNote").value = "";
    selectedMood = null;

    moodButtons.forEach(button =>
        button.classList.remove("selected")
    );

    await loadMoodHistory();
}

// LOAD MOOD HISTORY

async function loadMoodHistory() {
    const { data, error } = await supabase
        .from("mood_entries")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(30);

    if (error) {
        console.error("Mood history loading failed:", error);
        return;
    }

    const history = document.getElementById("moodHistory");

    if (history) {
        history.innerHTML = "";

        (data || []).forEach(entry => {
            const item = document.createElement("div");
            item.className = "journal-item";

            const mood = document.createElement("strong");
            mood.textContent = entry.mood;

            const note = document.createElement("p");
            note.textContent = entry.notes || "No additional note.";

            item.append(mood, note);
            history.appendChild(item);
        });

        if (!data?.length) {
            history.textContent = "No mood entries yet.";
        }
    }

    setText("moodEntryCount", data?.length || 0);
}

// =====================================
// 11. PERSONAL JOURNAL
// =====================================

const saveJournalButton = document.getElementById("saveJournal");

if (saveJournalButton) {
    saveJournalButton.addEventListener("click", saveJournalEntry);
}

async function saveJournalEntry() {
    const title = document.getElementById("journalTitle")?.value.trim();
    const content = document.getElementById("journalEntry")?.value.trim();

    const message = document.getElementById("journalMessage");

    if (!content) {
        if (message) message.textContent = "Write something before saving.";
        return;
    }

    const { error } = await supabase.from("journal_entries").insert({
        user_id: currentUser.id,
        title: title || "My journal",
        content: content,
        entry_date: localDateString()
    });

    if (error) {
        console.error("Journal saving failed:", error);

        if (message) {
            message.textContent = "Your entry could not be saved.";
        }

        return;
    }

    if (message) {
        message.textContent = "Your journal entry has been saved.";
    }

    document.getElementById("journalTitle").value = "";
    document.getElementById("journalEntry").value = "";

    await loadJournalHistory();
}

// LOAD JOURNAL HISTORY

async function loadJournalHistory() {
    const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Journal history loading failed:", error);
        return;
    }

    const container = document.getElementById("journalHistory");

    if (container) {
        container.innerHTML = "";

        (data || []).forEach(entry => {
            const item = document.createElement("div");
            item.className = "journal-item";

            const heading = document.createElement("h4");
            heading.textContent = entry.title || "My journal";

            const content = document.createElement("p");
            content.textContent = entry.content;

            const date = document.createElement("small");
            date.textContent = new Date(
                entry.created_at
            ).toLocaleDateString();

            item.append(heading, content, date);
            container.appendChild(item);
        });

        if (!data?.length) {
            container.textContent = "Your journal is waiting for its first entry.";
        }
    }

    setText("journalEntryCount", data?.length || 0);
}

// INITIAL DATA

await loadMoodHistory();
await loadJournalHistory();
    
   
});
