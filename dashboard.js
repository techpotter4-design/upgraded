
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
    .forEach(item => {
        item.classList.remove("active");
        item.hidden = true;
    });

target.hidden = false;
target.classList.add("active");

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

// =====================================
// SECTION 5: HABIT MANAGEMENT JS
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    const app = window.LifeTrack;
    if (!app) return;

    const $ = id => document.getElementById(id);

    const form = $("habitForm");
    const formCard = $("habitFormCard");
    const list = $("habitList");

    let habits = [];
    let logs = [];

    document.addEventListener("lifetrack:ready", loadHabits);

    // OPEN FORM
    $("addHabitButton").onclick = () => {
        form.reset();
        $("habitId").value = "";
        $("habitFormTitle").textContent = "Create a New Habit";
        formCard.hidden = false;
    };

    $("cancelHabitButton").onclick = () => {
        formCard.hidden = true;
        form.reset();
    };

    // SAVE HABIT
    form.addEventListener("submit", async event => {
        event.preventDefault();

        const id = $("habitId").value;
        const frequency = $("habitFrequency").value;

        const targetDays = frequency === "daily"
            ? [0,1,2,3,4,5,6]
            : [...form.querySelectorAll(
                '.habit-days input:checked'
              )].map(input => Number(input.value));

        if (!targetDays.length) {
            alert("Please select at least one day.");
            return;
        }

        const record = {
            user_id: app.user.id,
            title: $("habitName").value.trim(),
            description: $("habitDescription").value.trim(),
            frequency,
            target_days: targetDays,
            color: $("habitColor").value,
            is_active: true
        };

        if (!record.title) return;

        const result = id
            ? await app.db.from("habits")
                .update(record).eq("id", id)
                .eq("user_id", app.user.id)
            : await app.db.from("habits").insert(record);

        if (result.error) {
            alert("Could not save habit: " + result.error.message);
            return;
        }

        formCard.hidden = true;
        form.reset();
        await loadHabits();
    });

    // LOAD HABITS AND TODAY'S LOGS
    async function loadHabits() {
        const today = new Date().toISOString().split("T")[0];

        const [habitResult, logResult] = await Promise.all([
            app.db.from("habits").select("*")
                .eq("user_id", app.user.id)
                .eq("is_active", true)
                .order("created_at", { ascending: false }),

            app.db.from("habit_logs").select("*")
                .eq("user_id", app.user.id)
                .eq("completed_on", today)
        ]);

        if (habitResult.error || logResult.error) {
            console.error(habitResult.error || logResult.error);
            list.textContent = "Unable to load habits.";
            return;
        }

        habits = habitResult.data || [];
        logs = logResult.data || [];

        renderHabits();
    }

    // DISPLAY HABITS
    function renderHabits() {
        const today = new Date().getDay();

        const scheduled = habits.filter(h =>
            (h.target_days || []).includes(today)
        );

        const completed = logs.filter(l => l.completed).length;

        $("habitTotal").textContent = habits.length;
        $("habitCompleted").textContent = completed;
        $("habitRate").textContent = scheduled.length
            ? Math.round(completed / scheduled.length * 100) + "%"
            : "0%";

        list.textContent = "";

        if (!habits.length) {
            list.textContent = "No habits yet. Create your first habit!";
            return;
        }

        habits.forEach(habit => {
            const done = logs.some(
                l => l.habit_id === habit.id && l.completed
            );

            const item = document.createElement("div");
            item.className = "habit-item";

            const info = document.createElement("div");
            info.className = "habit-item-info";

            const name = document.createElement("strong");
            name.textContent = habit.title;
            name.style.color = habit.color || "inherit";

            const description = document.createElement("span");
            description.textContent = habit.description || habit.frequency;

            info.append(name, description);

            const actions = document.createElement("div");
            actions.className = "habit-item-actions";

            const check = document.createElement("button");
            check.className = "habit-check" + (done ? " completed" : "");
            check.textContent = done ? "✓" : "○";
            check.setAttribute("aria-label", "Toggle completion");
            check.onclick = () => toggleHabit(habit, done);

            const edit = document.createElement("button");
            edit.textContent = "Edit";
            edit.onclick = () => editHabit(habit);

            const remove = document.createElement("button");
            remove.textContent = "Delete";
            remove.onclick = () => deleteHabit(habit);

            actions.append(check, edit, remove);
            item.append(info, actions);
            list.appendChild(item);
        });
    }

    // COMPLETE OR UNCOMPLETE
    async function toggleHabit(habit, done) {
        const today = new Date().toISOString().split("T")[0];

        const existing = logs.find(l => l.habit_id === habit.id);

        let result;

        if (existing) {
            result = await app.db.from("habit_logs")
                .update({ completed: !done })
                .eq("id", existing.id)
                .eq("user_id", app.user.id);
        } else {
            result = await app.db.from("habit_logs").insert({
                habit_id: habit.id,
                user_id: app.user.id,
                completed_on: today,
                completed: true
            });
        }

        if (result.error) {
            alert("Could not update habit: " + result.error.message);
            return;
        }

        await loadHabits();
    }

    // EDIT HABIT
    function editHabit(habit) {
        $("habitId").value = habit.id;
        $("habitName").value = habit.title;
        $("habitDescription").value = habit.description || "";
        $("habitFrequency").value = habit.frequency;
        $("habitColor").value = habit.color || "#8b5cf6";

        form.querySelectorAll(".habit-days input")
            .forEach(input => {
                input.checked = (habit.target_days || [])
                    .includes(Number(input.value));
            });

        $("habitFormTitle").textContent = "Edit Habit";
        formCard.hidden = false;
    }

    // DELETE HABIT
    async function deleteHabit(habit) {
        if (!confirm("Delete this habit?")) return;

        const { error } = await app.db.from("habits")
            .delete()
            .eq("id", habit.id)
            .eq("user_id", app.user.id);

        if (error) {
            alert("Could not delete habit: " + error.message);
            return;
        }

        await loadHabits();
    }

});

// =====================================
// LIFETRACK MOOD TRACKER
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    const app = window.LifeTrack;

    if (!app) return;

    const moodForm = document.getElementById("moodForm");
    const moodHistory = document.getElementById("moodHistoryList");
    const moodMessage = document.getElementById("moodMessage");
    const saveButton = document.getElementById("saveMoodButton");

    if (!moodForm || !moodHistory) return;

    const moodScores = {
        very_bad: 1,
        bad: 2,
        neutral: 3,
        good: 4,
        excellent: 5
    };

    function getToday() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    document.addEventListener("lifetrack:ready", loadMoodHistory);

    moodForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const selectedMood = moodForm.querySelector(
            'input[name="mood"]:checked'
        );

        if (!selectedMood) {
            moodMessage.textContent = "Please select your mood.";
            return;
        }

        const mood = selectedMood.value;
        const note = document.getElementById("moodNote").value.trim();
        const today = getToday();

        const record = {
            user_id: app.user.id,
            mood: mood,
            mood_score: moodScores[mood],
            note: note,
            entry_date: today
        };

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {

            const existing = await app.db
                .from("mood_entries")
                .select("id")
                .eq("user_id", app.user.id)
                .eq("entry_date", today)
                .maybeSingle();

            if (existing.error) throw existing.error;

            let result;

            if (existing.data) {
                result = await app.db
                    .from("mood_entries")
                    .update(record)
                    .eq("id", existing.data.id)
                    .eq("user_id", app.user.id);
            } else {
                result = await app.db
                    .from("mood_entries")
                    .insert(record);
            }

            if (result.error) throw result.error;

            moodMessage.textContent = "Your mood was saved successfully!";
            moodForm.reset();

            await loadMoodHistory();

        } catch (error) {

            console.error("Mood saving error:", error);

            moodMessage.textContent =
                "Unable to save mood: " + error.message;

        } finally {

            saveButton.disabled = false;
            saveButton.textContent = "Save Mood Check-in";

        }

    });

    async function loadMoodHistory() {

        if (!app.user) return;

        moodHistory.textContent = "Loading mood history...";

        try {

            const { data, error } = await app.db
                .from("mood_entries")
                .select("id, mood, mood_score, note, entry_date")
                .eq("user_id", app.user.id)
                .order("entry_date", { ascending: false })
                .limit(30);

            if (error) throw error;

            moodHistory.textContent = "";

            if (!data || data.length === 0) {
                moodHistory.textContent =
                    "No mood entries yet. Record your first mood!";
                return;
            }

            data.forEach(entry => {

                const item = document.createElement("div");
                item.className = "mood-history-item";

                const details = document.createElement("div");

                const title = document.createElement("strong");
                title.textContent = entry.mood.replace("_", " ");

                const note = document.createElement("span");
                note.textContent = entry.note || "No notes added.";

                details.append(title, note);

                const date = document.createElement("span");
                date.textContent =
                    entry.entry_date + " · " +
                    entry.mood_score + "/5";

                item.append(details, date);
                moodHistory.appendChild(item);

            });

        } catch (error) {

            console.error("Mood history error:", error);

            moodHistory.textContent =
                "Unable to load mood history: " + error.message;

        }
    }

});

/* =========================================
   LIFETRACK — PREMIUM GROWTH JOURNAL
========================================= */

.journal-hero {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 25px;
    min-height: 260px;
    padding: 38px;
    margin-bottom: 25px;
    border: 1px solid rgba(167,139,250,.2);
    border-radius: 20px;
    background:
        radial-gradient(circle at 85% 20%, rgba(139,92,246,.28), transparent 35%),
        linear-gradient(120deg, #17172f, #111b32 65%, #242044);
}

.journal-hero-content {
    position: relative;
    z-index: 2;
    max-width: 550px;
}

.journal-eyebrow,
.journal-inspiration span,
.journal-editor-heading span,
.journal-collection-heading span {
    display: block;
    color: #b9a2ff;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 2px;
    margin-bottom: 12px;
}

.journal-hero h2 {
    max-width: 500px;
    font-size: clamp(27px, 4vw, 39px);
    line-height: 1.2;
    margin-bottom: 13px;
}

.journal-hero-content > p {
    max-width: 450px;
    color: #c4c8dc;
    margin-bottom: 23px;
    font-size: 14px;
}

.journal-hero-art {
    width: 190px;
    min-width: 150px;
    height: 190px;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: rgba(167,139,250,.1);
    border: 1px solid rgba(196,181,253,.25);
    color: #c4b5fd;
}

.journal-hero-art i {
    width: 75px;
    height: 75px;
}

.journal-hero-art span {
    font-size: 8px;
    letter-spacing: 1.5px;
    font-weight: 800;
    text-align: center;
}

/* JOURNAL STATISTICS */

.journal-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 25px;
}

.journal-stat-card {
    display: grid;
    grid-template-columns: 42px 1fr;
    align-items: center;
    gap: 3px 12px;
    padding: 20px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 15px;
}

.journal-stat-card i {
    grid-row: span 2;
    width: 38px;
    height: 38px;
    padding: 9px;
    color: #b9a2ff;
    background: rgba(139,92,246,.14);
    border-radius: 11px;
}

.journal-stat-card span {
    color: var(--text-secondary);
    font-size: 12px;
}

.journal-stat-card strong {
    font-size: 23px;
}

/* DAILY INSPIRATION */

.journal-inspiration {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 24px;
    margin-bottom: 25px;
    border-radius: 16px;
    border: 1px solid rgba(167,139,250,.2);
    background: linear-gradient(110deg, rgba(139,92,246,.13), rgba(18,26,45,.9));
}

.journal-inspiration-icon {
    width: 48px;
    height: 48px;
    min-width: 48px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    background: rgba(139,92,246,.2);
    color: #c4b5fd;
}

.journal-inspiration-icon i {
    width: 24px;
    height: 24px;
}

.journal-inspiration > div:nth-child(2) {
    flex: 1;
}

.journal-inspiration h3 {
    font-size: 17px;
    margin-bottom: 5px;
}

.journal-inspiration p {
    color: var(--text-secondary);
    font-size: 12px;
}

#newJournalPrompt {
    width: 38px;
    height: 38px;
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--primary-light);
    background: var(--bg-card);
}

/* JOURNAL EDITOR */

.journal-editor-card,
.journal-collection {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 17px;
    padding: 25px;
    margin-bottom: 25px;
}

.journal-editor-heading,
.journal-collection-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
}

.journal-editor-heading h3,
.journal-collection-heading h3 {
    font-size: 20px;
    margin-bottom: 5px;
}

.journal-editor-heading p,
.journal-collection-heading p {
    color: var(--text-secondary);
    font-size: 13px;
}

#closeJournalButton {
    width: 35px;
    height: 35px;
    border: 1px solid var(--border);
    background: var(--bg-hover);
    color: var(--text-main);
    border-radius: 9px;
}

#journalForm label {
    display: block;
    margin: 17px 0 8px;
    font-weight: 600;
}

#journalTitle,
#journalContent {
    width: 100%;
    padding: 14px;
    color: var(--text-main);
    background: var(--bg-main);
    border: 1px solid var(--border);
    border-radius: 11px;
    outline: none;
}

#journalTitle:focus,
#journalContent:focus {
    border-color: var(--primary);
}

#journalContent {
    resize: vertical;
    line-height: 1.8;
}

.journal-writing-footer {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 9px;
    color: var(--text-muted);
    font-size: 11px;
}

.journal-reflection-prompts {
    margin-top: 25px;
    padding: 17px;
    border-radius: 12px;
    background: rgba(139,92,246,.07);
}

.journal-reflection-prompts > p {
    color: var(--primary-light);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.3px;
    margin-bottom: 12px;
}

.journal-reflection-prompts button {
    padding: 8px 12px;
    margin: 3px;
    border: 1px solid var(--border);
    border-radius: 20px;
    background: var(--bg-card);
    color: var(--text-secondary);
    font-size: 11px;
}

.journal-reflection-prompts button:hover {
    color: white;
    border-color: var(--primary);
}

.journal-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 22px;
}

.journal-form-actions button {
    padding: 11px 18px;
    border-radius: 9px;
    border: 1px solid var(--border);
}

/* JOURNAL COLLECTION */

.journal-search {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 220px;
    padding: 10px 13px;
    background: var(--bg-main);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text-muted);
}

.journal-search input {
    width: 100%;
    min-width: 0;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-main);
}

.journal-filter-bar {
    display: flex;
    gap: 9px;
    margin-bottom: 18px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 14px;
}

.journal-filter {
    padding: 8px 15px;
    border-radius: 20px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 12px;
}

.journal-filter.active {
    color: white;
    background: rgba(139,92,246,.2);
    border-color: var(--primary);
}

.journal-entry {
    padding: 19px;
    margin-bottom: 13px;
    border: 1px solid var(--border);
    border-radius: 13px;
    background: rgba(255,255,255,.015);
}

.journal-entry h4 {
    font-size: 16px;
    margin-bottom: 7px;
}

.journal-entry p {
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.8;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.journal-entry-meta {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 13px;
    color: var(--text-muted);
    font-size: 11px;
}

.journal-entry-actions {
    display: flex;
    gap: 9px;
    margin-top: 13px;
}

.journal-entry-actions button {
    padding: 6px 11px;
    border: 1px solid var(--border);
    background: var(--bg-hover);
    color: var(--text-secondary);
    border-radius: 7px;
    font-size: 11px;
}

/* JOURNAL FOOTER */

.journal-footer-quote {
    text-align: center;
    padding: 30px 20px;
    margin-bottom: 25px;
    border-radius: 16px;
    background: linear-gradient(120deg, #19172f, #101a2d);
    border: 1px solid rgba(167,139,250,.15);
}

.journal-footer-quote i {
    color: #b9a2ff;
    width: 28px;
    height: 28px;
    margin-bottom: 10px;
}

.journal-footer-quote p {
    font-size: 16px;
    font-style: italic;
    margin-bottom: 10px;
}

.journal-footer-quote span {
    color: var(--primary-light);
    font-size: 9px;
    letter-spacing: 2px;
    font-weight: 800;
}

/* MOBILE RESPONSIVENESS */

@media (max-width: 768px) {
    .journal-hero {
        padding: 25px;
        min-height: 230px;
    }

    .journal-hero-art {
        width: 110px;
        min-width: 110px;
        height: 110px;
    }

    .journal-hero-art i {
        width: 45px;
        height: 45px;
    }

    .journal-hero-art span {
        display: none;
    }

    .journal-stats {
        gap: 9px;
    }

    .journal-stat-card {
        padding: 12px;
        grid-template-columns: 1fr;
    }

    .journal-stat-card i {
        grid-row: auto;
    }

    .journal-stat-card strong {
        font-size: 19px;
    }

    .journal-collection-heading {
        flex-direction: column;
    }

    .journal-search {
        width: 100%;
    }
}

@media (max-width: 480px) {
    .journal-hero-art {
        display: none;
    }

    .journal-hero {
        padding: 23px;
    }

    .journal-stats {
        grid-template-columns: 1fr;
    }

    .journal-stat-card {
        grid-template-columns: 38px 1fr;
    }

    .journal-stat-card i {
        grid-row: span 2;
    }

    .journal-inspiration {
        padding: 16px;
        gap: 11px;
    }

    .journal-inspiration h3 {
        font-size: 14px;
    }

    .journal-editor-card,
    .journal-collection {
        padding: 17px;
    }

    .journal-writing-footer {
        flex-direction: column;
    }

    .journal-form-actions {
        flex-direction: column;
    }

    .journal-form-actions button {
        width: 100%;
    }
        }

        
        
                    
            
