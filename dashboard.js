
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
   LIFETRACK — GROWTH JOURNAL
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    const form = $("journalForm");
    const formCard = $("journalFormCard");
    const journalList = $("journalList");
    const titleInput = $("journalTitle");
    const contentInput = $("journalContent");
    const message = $("journalMessage");

    if (!form || !journalList) return;

    let entries = [];
    let activeFilter = "all";
    let searchTerm = "";

    const prompts = [
        "What is one thing you're proud of yourself for today?",
        "What did you learn about yourself today?",
        "What challenge made you stronger?",
        "What are three things you're grateful for?",
        "What would you like to improve tomorrow?",
        "What is something you need to let go of?",
        "How have you grown compared to last month?"
    ];

    function localDate(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function showMessage(text, error = false) {
        if (!message) return;
        message.textContent = text;
        message.style.color = error ? "#ff7777" : "#8ee6b0";
    }

    function openEditor(entry = null) {
        form.reset();
        $("journalId").value = entry?.id || "";
        titleInput.value = entry?.title || "";
        contentInput.value = entry?.content || "";

        $("journalFormTitle").textContent = entry
            ? "Edit Your Reflection"
            : "Create a New Reflection";

        formCard.hidden = false;
        updateWordCount();
        formCard.scrollIntoView({ behavior: "smooth" });
    }

    function closeEditor() {
        formCard.hidden = true;
        form.reset();
        $("journalId").value = "";
        showMessage("");
    }

    function updateWordCount() {
        const words = contentInput.value.trim()
            ? contentInput.value.trim().split(/\s+/).length
            : 0;

        $("journalWordCount").textContent =
            `${words} ${words === 1 ? "word" : "words"}`;
    }

    function calculateStats() {
        $("journalEntryCount").textContent = entries.length;

        const today = new Date();
        const month = today.getMonth();
        const year = today.getFullYear();

        const thisMonth = entries.filter(entry => {
            const date = new Date(entry.entry_date + "T00:00:00");
            return date.getMonth() === month &&
                   date.getFullYear() === year;
        });

        $("journalMonthCount").textContent = thisMonth.length;

        const dates = [...new Set(
            entries.map(entry => entry.entry_date)
        )].sort().reverse();

        let streak = 0;
        const checkDate = new Date();

        if (dates[0] !== localDate(checkDate)) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        for (const date of dates) {
            if (date !== localDate(checkDate)) break;
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }

        $("journalStreak").textContent =
            `${streak} ${streak === 1 ? "day" : "days"}`;
    }

    function renderEntries() {
        journalList.replaceChildren();

        let visibleEntries = [...entries];

        if (activeFilter === "recent") {
            visibleEntries = visibleEntries.slice(0, 7);
        }

        if (searchTerm) {
            visibleEntries = visibleEntries.filter(entry =>
                `${entry.title} ${entry.content}`
                    .toLowerCase()
                    .includes(searchTerm)
            );
        }

        if (!visibleEntries.length) {
            const empty = document.createElement("p");
            empty.className = "empty-message";
            empty.textContent = entries.length
                ? "No reflections match your search."
                : "Your personal reflections will appear here.";
            journalList.appendChild(empty);
            return;
        }

        visibleEntries.forEach(entry => {
            const card = document.createElement("article");
            card.className = "journal-entry";

            const heading = document.createElement("h3");
            heading.textContent = entry.title;

            const date = document.createElement("span");
            date.className = "journal-entry-date";
            date.textContent = new Date(
                entry.entry_date + "T00:00:00"
            ).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric"
            });

            const content = document.createElement("p");
            content.className = "journal-entry-content";
            content.textContent = entry.content;

            const actions = document.createElement("div");
            actions.className = "journal-entry-actions";

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.textContent = "Edit";
            editButton.dataset.action = "edit";
            editButton.dataset.id = entry.id;

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Delete";
            deleteButton.dataset.action = "delete";
            deleteButton.dataset.id = entry.id;

            actions.append(editButton, deleteButton);
            card.append(heading, date, content, actions);
            journalList.appendChild(card);
        });
    }

    async function loadEntries() {
        const state = window.LifeTrack;
        if (!state?.db || !state.user) return;

        const { data, error } = await state.db
            .from("journal_entries")
            .select("*")
            .eq("user_id", state.user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Journal loading error:", error);
            showMessage("Unable to load your reflections.", true);
            return;
        }

        entries = data || [];
        calculateStats();
        renderEntries();
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const state = window.LifeTrack;
        if (!state?.db || !state.user) {
            showMessage("Please wait for your account to load.", true);
            return;
        }

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const id = $("journalId").value;

        if (!title || !content) {
            showMessage("Please complete both fields.", true);
            return;
        }

        const saveButton = $("saveJournalButton");
        saveButton.disabled = true;
        showMessage("Saving your reflection...");

        const record = {
            user_id: state.user.id,
            title,
            content,
            entry_date: localDate()
        };

        const result = id
            ? await state.db.from("journal_entries")
                .update(record)
                .eq("id", id)
                .eq("user_id", state.user.id)
            : await state.db.from("journal_entries")
                .insert(record);

        saveButton.disabled = false;

        if (result.error) {
            console.error("Journal save error:", result.error);
            showMessage("Could not save. Please try again.", true);
            return;
        }

        showMessage("Your reflection has been saved!");
        closeEditor();
        await loadEntries();
    });

    journalList.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const entry = entries.find(item =>
            String(item.id) === button.dataset.id
        );

        if (!entry) return;

        if (button.dataset.action === "edit") {
            openEditor(entry);
        }

        if (button.dataset.action === "delete") {
            if (!confirm("Delete this reflection permanently?")) return;

            const { error } = await window.LifeTrack.db
                .from("journal_entries")
                .delete()
                .eq("id", entry.id)
                .eq("user_id", window.LifeTrack.user.id);

            if (error) {
                console.error(error);
                showMessage("Unable to delete this reflection.", true);
                return;
            }

            await loadEntries();
        }
    });

    $("addJournalButton")?.addEventListener("click", () => openEditor());
    $("closeJournalButton")?.addEventListener("click", closeEditor);
    $("cancelJournalButton")?.addEventListener("click", closeEditor);

    contentInput.addEventListener("input", updateWordCount);

    $("journalSearch")?.addEventListener("input", event => {
        searchTerm = event.target.value.toLowerCase().trim();
        renderEntries();
    });

    document.querySelectorAll("[data-journal-filter]").forEach(button => {
        button.addEventListener("click", () => {
            activeFilter = button.dataset.journalFilter;

            document.querySelectorAll("[data-journal-filter]")
                .forEach(item => item.classList.remove("active"));

            button.classList.add("active");
            renderEntries();
        });
    });

    document.querySelectorAll("[data-journal-prompt]").forEach(button => {
        button.addEventListener("click", () => {
            contentInput.value +=
                (contentInput.value ? "\n\n" : "") +
                button.dataset.journalPrompt + "\n";
            updateWordCount();
            contentInput.focus();
        });
    });

    $("newJournalPrompt")?.addEventListener("click", () => {
        const prompt = prompts[
            Math.floor(Math.random() * prompts.length)
        ];
        $("journalDailyPrompt").textContent = prompt;
    });

    document.addEventListener("lifetrack:ready", loadEntries);

    if (window.LifeTrack?.user) {
        loadEntries();
    }
});

/* =========================================
   LIFETRACK — GOALS MANAGER
========================================= */

/* =========================================
   LIFETRACK — GOALS MANAGER V2
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const $ = id => document.getElementById(id);

    const form = $("goalForm");
    const goalList = $("goalList");
    const formCard = $("goalFormCard");

    if (!form || !goalList || !formCard) return;

    let goals = [];
    let activeFilter = "all";
    let searchTerm = "";
    let loading = false;

    const state = window.LifeTrack;

    function localDate(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function showMessage(text, error = false) {
        const element = $("goalMessage");
        if (!element) return;

        element.textContent = text;
        element.style.color = error ? "#ff7777" : "#8ee6b0";
    }

    function openForm(goal = null) {
        form.reset();

        $("goalId").value = goal?.id || "";
        $("goalTitle").value = goal?.title || "";
        $("goalDescription").value = goal?.description || "";
        $("goalDeadline").value = goal?.target_date || "";
        $("goalPriority").value = "medium";
        $("goalProgressInput").value = goal?.progress ?? 0;

        $("goalProgressField").hidden = !goal;

        $("goalFormTitle").textContent = goal
            ? "Edit Your Goal"
            : "Create a New Goal";

        formCard.hidden = false;
        showMessage("");

        formCard.scrollIntoView({ behavior: "smooth" });
    }

    function closeForm() {
        formCard.hidden = true;
        form.reset();
        $("goalId").value = "";
        $("goalProgressField").hidden = true;
        showMessage("");
    }

    function calculateStats() {
        const total = goals.length;

        const completed = goals.filter(
            goal => goal.status === "completed"
        ).length;

        const active = goals.filter(
            goal => goal.status !== "completed"
        ).length;

        const average = total
            ? Math.round(
                goals.reduce(
                    (sum, goal) => sum + Number(goal.progress || 0),
                    0
                ) / total
            )
            : 0;

        $("goalTotal").textContent = total;
        $("goalActive").textContent = active;
        $("goalCompleted").textContent = completed;
        $("goalAverage").textContent = `${average}%`;
    }

    function createGoalCard(goal) {
        const card = document.createElement("article");
        card.className = "goal-item";

        const heading = document.createElement("div");
        heading.className = "goal-item-heading";

        const title = document.createElement("h3");
        title.textContent = goal.title;

        const status = document.createElement("span");
        status.className = "goal-status";
        status.textContent = goal.status === "completed"
            ? "Completed"
            : "In Progress";

        heading.append(title, status);

        const description = document.createElement("p");
        description.className = "goal-description";
        description.textContent =
            goal.description || "No description added.";

        const progressArea = document.createElement("div");
        progressArea.className = "goal-progress-area";

        const progressHeading = document.createElement("div");
        progressHeading.className = "goal-progress-heading";

        const progressLabel = document.createElement("span");
        progressLabel.textContent = "Your progress";

        const progressValue = document.createElement("strong");

        const progress = Math.min(
            100,
            Math.max(0, Number(goal.progress) || 0)
        );

        progressValue.textContent = `${progress}%`;

        progressHeading.append(progressLabel, progressValue);

        const track = document.createElement("div");
        track.className = "goal-progress-track";

        const fill = document.createElement("div");
        fill.className = "goal-progress-fill";
        fill.style.width = `${progress}%`;

        track.appendChild(fill);
        progressArea.append(progressHeading, track);

        const meta = document.createElement("div");
        meta.className = "goal-meta";

        const deadline = document.createElement("span");

        deadline.textContent = goal.target_date
            ? `Target: ${new Date(
                goal.target_date + "T00:00:00"
            ).toLocaleDateString("en-US")}`
            : "No deadline";

        meta.appendChild(deadline);

        const actions = document.createElement("div");
        actions.className = "goal-actions";

        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = "Edit";
        edit.dataset.action = "edit";
        edit.dataset.id = goal.id;

        const complete = document.createElement("button");
        complete.type = "button";
        complete.textContent = goal.status === "completed"
            ? "Reopen"
            : "Complete";
        complete.dataset.action = "complete";
        complete.dataset.id = goal.id;

        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Delete";
        remove.dataset.action = "delete";
        remove.dataset.id = goal.id;

        actions.append(edit, complete, remove);

        card.append(
            heading,
            description,
            progressArea,
            meta,
            actions
        );

        return card;
    }

    function renderGoals() {
        goalList.replaceChildren();

        let visible = [...goals];

        if (activeFilter === "active") {
            visible = visible.filter(
                goal => goal.status !== "completed"
            );
        }

        if (activeFilter === "completed") {
            visible = visible.filter(
                goal => goal.status === "completed"
            );
        }

        if (searchTerm) {
            visible = visible.filter(goal =>
                `${goal.title} ${goal.description || ""}`
                    .toLowerCase()
                    .includes(searchTerm)
            );
        }

        if (!visible.length) {
            const empty = document.createElement("p");
            empty.className = "empty-message";

            empty.textContent = goals.length
                ? "No goals match your search."
                : "You haven't created any goals yet.";

            goalList.appendChild(empty);
            return;
        }

        visible.forEach(goal => {
            goalList.appendChild(createGoalCard(goal));
        });
    }

    async function loadGoals() {
        if (loading) return;

        if (!state?.db || !state.user) {
            console.warn("Goals: Waiting for LifeTrack account.");
            return;
        }

        loading = true;

        try {
            const { data, error } = await state.db
                .from("goals")
                .select("id,user_id,title,description,target_date,progress,status,created_at")
                .eq("user_id", state.user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            goals = data || [];

            calculateStats();
            renderGoals();

        } catch (error) {
            console.error("Goals loading error:", error);
            showMessage("Unable to load goals. Please try again.", true);

        } finally {
            loading = false;
        }
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (!state?.db || !state.user) {
            showMessage("Your account is not ready yet.", true);
            return;
        }

        const id = $("goalId").value;
        const title = $("goalTitle").value.trim();
        const description = $("goalDescription").value.trim();
        const targetDate = $("goalDeadline").value;

        const progress = id
            ? Math.min(100, Math.max(
                0,
                Number($("goalProgressInput").value) || 0
            ))
            : 0;

        if (!title) {
            showMessage("Please enter a goal title.", true);
            return;
        }

        const record = {
            user_id: state.user.id,
            title: title,
            description: description,
            target_date: targetDate || null,
            progress: progress,
            status: progress === 100 ? "completed" : "active"
        };

        const saveButton = $("saveGoalButton");
        saveButton.disabled = true;

        showMessage("Saving your goal...");

        try {
            let result;

            if (id) {
                result = await state.db
                    .from("goals")
                    .update(record)
                    .eq("id", id)
                    .eq("user_id", state.user.id);
            } else {
                result = await state.db
                    .from("goals")
                    .insert(record);
            }

            if (result.error) throw result.error;

            closeForm();
            await loadGoals();

        } catch (error) {
            console.error("Goal save error:", error);
            showMessage(
                error.message || "Unable to save your goal.",
                true
            );

        } finally {
            saveButton.disabled = false;
        }
    });

    goalList.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const goal = goals.find(item =>
            String(item.id) === button.dataset.id
        );

        if (!goal || !state?.db || !state.user) return;

        const action = button.dataset.action;

        if (action === "edit") {
            openForm(goal);
            return;
        }

        if (action === "delete") {
            if (!confirm("Permanently delete this goal?")) return;

            button.disabled = true;

            try {
                const { error } = await state.db
                    .from("goals")
                    .delete()
                    .eq("id", goal.id)
                    .eq("user_id", state.user.id);

                if (error) throw error;

                await loadGoals();

            } catch (error) {
                console.error("Goal delete error:", error);
                showMessage("Unable to delete this goal.", true);
                button.disabled = false;
            }

            return;
        }

        if (action === "complete") {
            button.disabled = true;

            const completed = goal.status !== "completed";

            try {
                const { error } = await state.db
                    .from("goals")
                    .update({
                        status: completed ? "completed" : "active",
                        progress: completed ? 100 : 0
                    })
                    .eq("id", goal.id)
                    .eq("user_id", state.user.id);

                if (error) throw error;

                await loadGoals();

            } catch (error) {
                console.error("Goal update error:", error);
                showMessage("Unable to update this goal.", true);
                button.disabled = false;
            }
        }
    });

    $("addGoalButton")?.addEventListener("click", () => openForm());

    $("closeGoalButton")?.addEventListener("click", closeForm);

    $("cancelGoalButton")?.addEventListener("click", closeForm);

    $("goalSearch")?.addEventListener("input", event => {
        searchTerm = event.target.value.toLowerCase().trim();
        renderGoals();
    });

    document.querySelectorAll("[data-goal-filter]").forEach(button => {
        button.addEventListener("click", () => {
            activeFilter = button.dataset.goalFilter;

            document.querySelectorAll("[data-goal-filter]")
                .forEach(item => item.classList.remove("active"));

            button.classList.add("active");
            renderGoals();
        });
    });

    document.addEventListener("lifetrack:ready", loadGoals);

    if (state?.user) {
        loadGoals();
    }

});

/* =========================================
   LIFETRACK CALENDAR - PART 1
   Data, summaries, calendar and daily events
========================================= */

(() => {
    "use strict";

    const state = {
        db: null,
        user: null,
        habits: [],
        moods: [],
        journals: [],
        goals: [],
        logs: [],
        currentMonth: new Date(),
        selectedDate: new Date(),
        charts: {}
    };

    const $ = id => document.getElementById(id);

    const dateKey = date => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    const parseDate = value => {
        const [y, m, d] = value.split("-").map(Number);
        return new Date(y, m - 1, d);
    };

    const showMessage = (element, message) => {
        if (!element) return;
        element.textContent = message;
    };

    async function loadCalendarData() {
        state.db = window.LifeTrack?.db || window.lifeTrackSupabase;
        state.user = window.LifeTrack?.user;

        if (!state.db || !state.user) {
            console.error("Calendar: Supabase user not ready.");
            return;
        }

        try {
            const [logs, moods, journals, goals] = await Promise.all([
                state.db.from("habit_logs")
                    .select("id,habit_id,user_id,completed_on,completed")
                    .eq("user_id", state.user.id),

                state.db.from("mood_entries")
                    .select("id,mood,mood_score,note,entry_date")
                    .eq("user_id", state.user.id),

                state.db.from("journal_entries")
                    .select("id,title,entry_date")
                    .eq("user_id", state.user.id),

                state.db.from("goals")
                    .select("id,title,target_date,status,progress")
                    .eq("user_id", state.user.id)
            ]);

            const results = [logs, moods, journals, goals];

            for (const result of results) {
                if (result.error) throw result.error;
            }

            state.logs = logs.data || [];
            state.moods = moods.data || [];
            state.journals = journals.data || [];
            state.goals = goals.data || [];

            updateCalendarSummary();
            renderCalendar();
            renderSelectedDay();
            renderCalendarCharts();

        } catch (error) {
            console.error("Calendar loading error:", error);
            showMessage($("calendarGrid"),
                "Unable to load calendar data. Please refresh the page.");
        }
    }

    function updateCalendarSummary() {
        const month = state.currentMonth.getMonth();
        const year = state.currentMonth.getFullYear();

        const inMonth = value => {
            if (!value) return false;
            const date = parseDate(value);
            return date.getMonth() === month &&
                   date.getFullYear() === year;
        };

        const completed = state.logs.filter(log =>
            log.completed === true && inMonth(log.completed_on)
        ).length;

        const moods = state.moods.filter(item =>
            inMonth(item.entry_date)
        ).length;

        const journals = state.journals.filter(item =>
            inMonth(item.entry_date)
        ).length;

        const today = dateKey(new Date());

        const upcoming = state.goals.filter(goal =>
            goal.target_date &&
            goal.target_date >= today &&
            goal.status !== "completed"
        ).length;

        showMessage($("calendarHabitsCount"), completed);
        showMessage($("calendarMoodCount"), moods);
        showMessage($("calendarJournalCount"), journals);
        showMessage($("calendarGoalsCount"), upcoming);
    }

    function getEventsForDate(key) {
        return {
            habits: state.logs.filter(item =>
                item.completed === true && item.completed_on === key
            ),
            moods: state.moods.filter(item => item.entry_date === key),
            journals: state.journals.filter(item => item.entry_date === key),
            goals: state.goals.filter(item => item.target_date === key)
        };
    }

    function renderCalendar() {
        const grid = $("calendarGrid");
        if (!grid) return;

        grid.replaceChildren();

        const year = state.currentMonth.getFullYear();
        const month = state.currentMonth.getMonth();

        const title = new Date(year, month, 1).toLocaleDateString(
            "en-US", { month: "long", year: "numeric" }
        );

        showMessage($("calendarMonthTitle"), title);

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayKey = dateKey(new Date());

        for (let i = 0; i < firstDay; i++) {
            const blank = document.createElement("div");
            blank.className = "calendar-empty";
            grid.appendChild(blank);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const key = dateKey(date);
            const events = getEventsForDate(key);

            const button = document.createElement("button");
            button.type = "button";
            button.className = "calendar-day";
            button.dataset.date = key;

            if (key === todayKey) button.classList.add("today");
            if (key === dateKey(state.selectedDate)) {
                button.classList.add("selected");
            }

            const number = document.createElement("span");
            number.textContent = day;
            button.appendChild(number);

            const dots = document.createElement("div");
            dots.className = "calendar-day-dots";

            [
                [events.habits.length, "habit-dot"],
                [events.moods.length, "mood-dot"],
                [events.journals.length, "journal-dot"],
                [events.goals.length, "goal-dot"]
            ].forEach(([count, className]) => {
                if (count > 0) {
                    const dot = document.createElement("i");
                    dot.className = `legend-dot ${className}`;
                    dots.appendChild(dot);
                }
            });

            button.appendChild(dots);

            button.addEventListener("click", () => {
                state.selectedDate = date;
                renderCalendar();
                renderSelectedDay();
            });

            grid.appendChild(button);
        }
    }

    function addEvent(container, label, detail) {
        const item = document.createElement("div");
        item.className = "calendar-event";

        const heading = document.createElement("strong");
        heading.textContent = label;

        const description = document.createElement("p");
        description.textContent = detail;

        item.append(heading, description);
        container.appendChild(item);
    }

    function renderSelectedDay() {
        const container = $("calendarEvents");
        if (!container) return;

        const key = dateKey(state.selectedDate);
        const events = getEventsForDate(key);

        showMessage($("calendarSelectedDate"),
            state.selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
            })
        );

        container.replaceChildren();

        let total = 0;

        events.habits.forEach(() => {
            addEvent(container, "Habit completed",
                "You recorded a completed habit.");
            total++;
        });

        events.moods.forEach(item => {
            addEvent(container, `Mood: ${item.mood || "Recorded"}`,
                item.note || `Mood score: ${item.mood_score ?? "Not provided"}`);
            total++;
        });

        events.journals.forEach(item => {
            addEvent(container, "Journal entry",
                item.title || "You wrote a journal entry.");
            total++;
        });

        events.goals.forEach(item => {
            addEvent(container, "Goal deadline",
                item.title || "A goal is due today.");
            total++;
        });

        if (total === 0) {
            const empty = document.createElement("p");
            empty.className = "empty-message";
            empty.textContent = "No recorded activities for this date.";
            container.appendChild(empty);
        }
                                            }

    
    /* =========================================
       LIFETRACK CALENDAR - PART 2
       Analytics, graphs and navigation
    ========================================= */

    function getPeriodData(days) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const labels = [];
        const keys = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);

            keys.push(dateKey(date));
            labels.push(date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric"
            }));
        }

        const habitCounts = keys.map(key =>
            state.logs.filter(item =>
                item.completed === true && item.completed_on === key
            ).length
        );

        const moodScores = keys.map(key => {
            const entries = state.moods.filter(item =>
                item.entry_date === key &&
                Number(item.mood_score) > 0
            );

            if (!entries.length) return null;

            const average = entries.reduce(
                (sum, item) => sum + Number(item.mood_score), 0
            ) / entries.length;

            return Number(average.toFixed(1));
        });

        const moodCounts = keys.map(key =>
            state.moods.filter(item => item.entry_date === key).length
        );

        const journalCounts = keys.map(key =>
            state.journals.filter(item => item.entry_date === key).length
        );

        return {
            labels,
            habitCounts,
            moodScores,
            moodCounts,
            journalCounts
        };
    }

    function renderCalendarCharts() {
        if (typeof Chart === "undefined") {
            console.warn("Chart.js is unavailable. Analytics graphs cannot load.");
            return;
        }

        const period = Number($("analyticsPeriod")?.value || 30);
        const data = getPeriodData(period);

        Object.values(state.charts).forEach(chart => chart.destroy());
        state.charts = {};

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: "#aeb6ca",
                        usePointStyle: true
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: "#929bb0" },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: "#929bb0", precision: 0 },
                    grid: { color: "#ffffff12" }
                }
            }
        };

        const createChart = (id, config) => {
            const canvas = $(id);
            if (!canvas) return;
            state.charts[id] = new Chart(canvas, config);
        };

        // 1. HABIT COMPLETION TREND
        createChart("habitTrendChart", {
            type: "line",
            data: {
                labels: data.labels,
                datasets: [{
                    label: "Completed habits",
                    data: data.habitCounts,
                    borderColor: "#a78bfa",
                    backgroundColor: "#a78bfa25",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 2
                }]
            },
            options: commonOptions
        });

        // 2. MOOD TREND
        createChart("moodTrendChart", {
            type: "line",
            data: {
                labels: data.labels,
                datasets: [{
                    label: "Average mood score",
                    data: data.moodScores,
                    borderColor: "#f472b6",
                    backgroundColor: "#f472b625",
                    fill: true,
                    tension: 0.35,
                    spanGaps: false,
                    pointRadius: 3
                }]
            },
            options: {
                ...commonOptions,
                scales: {
                    ...commonOptions.scales,
                    y: {
                        min: 1,
                        max: 5,
                        ticks: {
                            stepSize: 1,
                            color: "#929bb0"
                        },
                        grid: { color: "#ffffff12" }
                    }
                }
            }
        });

        // 3. DAILY ACTIVITY
        createChart("dailyActivityChart", {
            type: "bar",
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: "Habits",
                        data: data.habitCounts,
                        backgroundColor: "#a78bfa"
                    },
                    {
                        label: "Mood entries",
                        data: data.moodCounts,
                        backgroundColor: "#f472b6"
                    },
                    {
                        label: "Journal entries",
                        data: data.journalCounts,
                        backgroundColor: "#38bdf8"
                    }
                ]
            },
            options: {
                ...commonOptions,
                scales: {
                    ...commonOptions.scales,
                    x: {
                        ...commonOptions.scales.x,
                        stacked: true
                    },
                    y: {
                        ...commonOptions.scales.y,
                        stacked: true
                    }
                }
            }
        });

        // 4. PRODUCTIVITY DISTRIBUTION
        const totals = [
            data.habitCounts.reduce((a, b) => a + b, 0),
            data.moodCounts.reduce((a, b) => a + b, 0),
            data.journalCounts.reduce((a, b) => a + b, 0)
        ];

        createChart("productivityChart", {
            type: "doughnut",
            data: {
                labels: ["Completed habits", "Mood entries", "Journal entries"],
                datasets: [{
                    data: totals,
                    backgroundColor: ["#a78bfa", "#f472b6", "#38bdf8"],
                    borderColor: "#111729",
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: "#aeb6ca",
                            padding: 18,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    /* MONTH NAVIGATION */

    $("calendarPrevMonth")?.addEventListener("click", () => {
        state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
        updateCalendarSummary();
        renderCalendar();
    });

    $("calendarNextMonth")?.addEventListener("click", () => {
        state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
        updateCalendarSummary();
        renderCalendar();
    });

    $("calendarTodayButton")?.addEventListener("click", () => {
        state.currentMonth = new Date();
        state.selectedDate = new Date();
        updateCalendarSummary();
        renderCalendar();
        renderSelectedDay();
    });

    $("analyticsPeriod")?.addEventListener("change", () => {
        renderCalendarCharts();
    });

    /* INITIALIZE AFTER AUTHENTICATION */

    document.addEventListener("lifetrack:ready", loadCalendarData);

    if (window.LifeTrack?.user) {
        loadCalendarData();
    }

})();

/* =========================================
   LIFETRACK INSIGHTS - PART 1
   Supabase data and performance calculations
========================================= */

(() => {
    "use strict";

    const insights = {
        db: null,
        user: null,
        logs: [],
        moods: [],
        journals: [],
        goals: [],
        charts: {}
    };

    const get = id => document.getElementById(id);

    function localDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function getDateRange(days) {
        const dates = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            dates.push(localDateKey(date));
        }

        return dates;
    }

    function updateText(id, value) {
        const element = get(id);
        if (element) element.textContent = value;
    }

    async function loadInsightsData() {
        insights.db = window.LifeTrack?.db || window.lifeTrackSupabase;
        insights.user = window.LifeTrack?.user;

        if (!insights.db || !insights.user) {
            console.error("Insights: User authentication is not ready.");
            return;
        }

        try {
            const [logs, moods, journals, goals] = await Promise.all([
                insights.db.from("habit_logs")
                    .select("id,user_id,completed_on,completed")
                    .eq("user_id", insights.user.id),

                insights.db.from("mood_entries")
                    .select("id,mood,mood_score,entry_date")
                    .eq("user_id", insights.user.id),

                insights.db.from("journal_entries")
                    .select("id,title,entry_date")
                    .eq("user_id", insights.user.id),

                insights.db.from("goals")
                    .select("id,title,status,progress,target_date")
                    .eq("user_id", insights.user.id)
            ]);

            for (const result of [logs, moods, journals, goals]) {
                if (result.error) throw result.error;
            }

            insights.logs = logs.data || [];
            insights.moods = moods.data || [];
            insights.journals = journals.data || [];
            insights.goals = goals.data || [];

            renderInsights();

        } catch (error) {
            console.error("Insights data loading error:", error);
            updateText("insightGrowthSummary",
                "We couldn't load your growth report. Please refresh and try again.");
        }
    }

    function getInsightsData(days) {
        const dates = getDateRange(days);

        const logs = insights.logs.filter(item =>
            item.completed === true &&
            dates.includes(item.completed_on)
        );

        const moods = insights.moods.filter(item =>
            dates.includes(item.entry_date)
        );

        const journals = insights.journals.filter(item =>
            dates.includes(item.entry_date)
        );

        const labels = dates.map(value => {
            const [year, month, day] = value.split("-").map(Number);
            return new Date(year, month - 1, day).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" }
            );
        });

        const habitCounts = dates.map(date =>
            logs.filter(item => item.completed_on === date).length
        );

        const moodScores = dates.map(date => {
            const entries = moods.filter(item =>
                item.entry_date === date &&
                Number(item.mood_score) > 0
            );

            if (!entries.length) return null;

            const average = entries.reduce(
                (sum, item) => sum + Number(item.mood_score), 0
            ) / entries.length;

            return Number(average.toFixed(1));
        });

        const moodCounts = dates.map(date =>
            moods.filter(item => item.entry_date === date).length
        );

        const journalCounts = dates.map(date =>
            journals.filter(item => item.entry_date === date).length
        );

        const activeGoals = insights.goals.filter(goal =>
            !["completed", "cancelled"].includes(
                String(goal.status || "").toLowerCase()
            )
        );

        return {
            dates,
            labels,
            logs,
            moods,
            journals,
            activeGoals,
            habitCounts,
            moodScores,
            moodCounts,
            journalCounts
        };
    }

    function renderInsights() {
        const days = Number(get("insightsPeriod")?.value || 30);
        const data = getInsightsData(days);

        updateText("insightHabitCount", data.logs.length);
        updateText("insightMoodCount", data.moods.length);
        updateText("insightJournalCount", data.journals.length);
        updateText("insightGoalCount", data.activeGoals.length);

        renderInsightsCharts(data);
        renderGrowthSummary(data);
                    }

    
    /* =========================================
       LIFETRACK INSIGHTS - PART 2
       Charts and personal growth report
    ========================================= */

    function renderInsightsCharts(data) {
        if (typeof Chart === "undefined") {
            console.error("Insights: Chart.js is not available.");
            return;
        }

        Object.values(insights.charts).forEach(chart => chart.destroy());
        insights.charts = {};

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                legend: {
                    labels: {
                        color: "#aeb6ca",
                        usePointStyle: true
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: "#929bb0",
                        maxTicksLimit: 10
                    },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: "#929bb0",
                        precision: 0
                    },
                    grid: { color: "#ffffff12" }
                }
            }
        };

        function createChart(id, config) {
            const canvas = get(id);
            if (!canvas) return;

            insights.charts[id] = new Chart(canvas, config);
        }

        // 1. HABIT PERFORMANCE
        createChart("insightHabitChart", {
            type: "line",
            data: {
                labels: data.labels,
                datasets: [{
                    label: "Completed habits",
                    data: data.habitCounts,
                    borderColor: "#a78bfa",
                    backgroundColor: "#a78bfa25",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 2
                }]
            },
            options: commonOptions
        });

        // 2. MOOD PATTERNS
        createChart("insightMoodChart", {
            type: "line",
            data: {
                labels: data.labels,
                datasets: [{
                    label: "Average mood score",
                    data: data.moodScores,
                    borderColor: "#f472b6",
                    backgroundColor: "#f472b625",
                    fill: true,
                    tension: 0.35,
                    spanGaps: false,
                    pointRadius: 3
                }]
            },
            options: {
                ...commonOptions,
                scales: {
                    ...commonOptions.scales,
                    y: {
                        min: 1,
                        max: 5,
                        ticks: {
                            stepSize: 1,
                            color: "#929bb0"
                        },
                        grid: { color: "#ffffff12" }
                    }
                }
            }
        });

        // 3. DAILY ACTIVITY COMPARISON
        createChart("insightActivityChart", {
            type: "bar",
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: "Completed habits",
                        data: data.habitCounts,
                        backgroundColor: "#a78bfa"
                    },
                    {
                        label: "Mood entries",
                        data: data.moodCounts,
                        backgroundColor: "#f472b6"
                    },
                    {
                        label: "Journal entries",
                        data: data.journalCounts,
                        backgroundColor: "#38bdf8"
                    }
                ]
            },
            options: {
                ...commonOptions,
                scales: {
                    ...commonOptions.scales,
                    x: {
                        ...commonOptions.scales.x,
                        stacked: true
                    },
                    y: {
                        ...commonOptions.scales.y,
                        stacked: true
                    }
                }
            }
        });
    }

    /* PERSONAL GROWTH REPORT */

    function renderGrowthSummary(data) {
        const totalHabits = data.logs.length;
        const totalMoods = data.moods.length;
        const totalJournals = data.journals.length;

        const moodScores = data.moods
            .map(item => Number(item.mood_score))
            .filter(score => Number.isFinite(score) && score >= 1 && score <= 5);

        const averageMood = moodScores.length
            ? moodScores.reduce((sum, score) => sum + score, 0) /
              moodScores.length
            : null;

        const activeDays = new Set([
            ...data.logs.map(item => item.completed_on),
            ...data.moods.map(item => item.entry_date),
            ...data.journals.map(item => item.entry_date)
        ]).size;

        let report = `During the last ${data.dates.length} days, you recorded ` +
            `${totalHabits} completed habits, ${totalMoods} mood entries, ` +
            `and ${totalJournals} journal entries. `;

        report += `You recorded activity on ${activeDays} ` +
            `${activeDays === 1 ? "day" : "days"}. `;

        if (averageMood !== null) {
            report += `Your average recorded mood score was ` +
                `${averageMood.toFixed(1)} out of 5. `;
        } else {
            report += "You don't have enough scored mood entries for an average yet. ";
        }

        if (activeDays === 0) {
            report = "Your report is ready. Start recording habits, moods, " +
                "and journal entries to discover your personal growth patterns.";
        } else if (activeDays >= 20) {
            report += "You've been recording your journey regularly. Keep building on that progress.";
        } else if (activeDays >= 7) {
            report += "You're building a record of your progress. Consistency can help reveal useful patterns.";
        } else {
            report += "Every entry gives you another opportunity to understand your progress.";
        }

        updateText("insightGrowthSummary", report);
    }

    /* PERIOD FILTER */

    get("insightsPeriod")?.addEventListener("change", renderInsights);

    /* INITIALIZATION */

    document.addEventListener("lifetrack:ready", loadInsightsData);

    if (window.LifeTrack?.user) {
        loadInsightsData();
    }

})();
    
/* =========================================
   LIFETRACK ACHIEVEMENTS - PART 1
   Data loading and achievement definitions
========================================= */

(() => {
    "use strict";

    const achievementState = {
        db: null,
        user: null,
        logs: [],
        moods: [],
        journals: [],
        goals: [],
        achievements: []
    };

    const el = id => document.getElementById(id);

    function setText(id, value) {
        const element = el(id);
        if (element) element.textContent = value;
    }

    function calculateBestStreak() {
        const dates = [...new Set(
            achievementState.logs
                .filter(item => item.completed === true && item.completed_on)
                .map(item => item.completed_on)
        )].sort();

        if (!dates.length) return 0;

        let best = 1;
        let current = 1;

        for (let i = 1; i < dates.length; i++) {
            const previous = new Date(dates[i - 1] + "T12:00:00");
            const next = new Date(dates[i] + "T12:00:00");

            const difference = Math.round(
                (next - previous) / 86400000
            );

            if (difference === 1) {
                current++;
                best = Math.max(best, current);
            } else if (difference > 1) {
                current = 1;
            }
        }

        return best;
    }

    function defineAchievements() {
        const completedHabits = achievementState.logs.filter(
            item => item.completed === true
        ).length;

        const moodCount = achievementState.moods.length;
        const journalCount = achievementState.journals.length;

        const completedGoals = achievementState.goals.filter(
            goal => String(goal.status || "").toLowerCase() === "completed"
        ).length;

        const streak = calculateBestStreak();

        const definitions = [
            {
                id: "first-habit",
                title: "First Step",
                description: "Complete your first habit.",
                icon: "target",
                category: "Habits",
                current: completedHabits,
                target: 1,
                points: 10
            },
            {
                id: "habit-10",
                title: "Building Momentum",
                description: "Complete 10 habits.",
                icon: "trending-up",
                category: "Habits",
                current: completedHabits,
                target: 10,
                points: 25
            },
            {
                id: "habit-50",
                title: "Consistency Champion",
                description: "Complete 50 habits.",
                icon: "medal",
                category: "Habits",
                current: completedHabits,
                target: 50,
                points: 75
            },
            {
                id: "habit-100",
                title: "Century Club",
                description: "Complete 100 habits.",
                icon: "trophy",
                category: "Habits",
                current: completedHabits,
                target: 100,
                points: 150
            },
            {
                id: "streak-3",
                title: "Three-Day Streak",
                description: "Record completed habits on three consecutive days.",
                icon: "flame",
                category: "Consistency",
                current: streak,
                target: 3,
                points: 20
            },
            {
                id: "streak-7",
                title: "One-Week Warrior",
                description: "Build a seven-day habit completion streak.",
                icon: "zap",
                category: "Consistency",
                current: streak,
                target: 7,
                points: 50
            },
            {
                id: "streak-14",
                title: "Two-Week Discipline",
                description: "Build a fourteen-day habit completion streak.",
                icon: "shield-check",
                category: "Consistency",
                current: streak,
                target: 14,
                points: 100
            },
            {
                id: "streak-30",
                title: "Unstoppable",
                description: "Build a thirty-day habit completion streak.",
                icon: "crown",
                category: "Consistency",
                current: streak,
                target: 30,
                points: 250
            },
            {
                id: "first-mood",
                title: "Self-Awareness",
                description: "Record your first mood entry.",
                icon: "heart",
                category: "Wellness",
                current: moodCount,
                target: 1,
                points: 10
            },
            {
                id: "mood-7",
                title: "Emotional Explorer",
                description: "Record seven mood entries.",
                icon: "smile",
                category: "Wellness",
                current: moodCount,
                target: 7,
                points: 30
            },
            {
                id: "mood-30",
                title: "Mindful Month",
                description: "Record thirty mood entries.",
                icon: "brain",
                category: "Wellness",
                current: moodCount,
                target: 30,
                points: 100
            },
            {
                id: "first-journal",
                title: "Dear Journal",
                description: "Write your first journal entry.",
                icon: "book-open",
                category: "Reflection",
                current: journalCount,
                target: 1,
                points: 10
            },
            {
                id: "journal-10",
                title: "Reflective Mind",
                description: "Write ten journal entries.",
                icon: "notebook-pen",
                category: "Reflection",
                current: journalCount,
                target: 10,
                points: 40
            },
            {
                id: "first-goal",
                title: "Goal Getter",
                description: "Complete your first goal.",
                icon: "flag",
                category: "Goals",
                current: completedGoals,
                target: 1,
                points: 30
            },
            {
                id: "goals-5",
                title: "Goal Master",
                description: "Complete five goals.",
                icon: "award",
                category: "Goals",
                current: completedGoals,
                target: 5,
                points: 100
            }
        ];

        achievementState.achievements = definitions.map(item => ({
            ...item,
            unlocked: item.current >= item.target,
            progress: Math.min(
                100,
                Math.round((item.current / item.target) * 100)
            )
        }));
    }

    async function loadAchievements() {
        achievementState.db =
            window.LifeTrack?.db || window.lifeTrackSupabase;

        achievementState.user = window.LifeTrack?.user;

        if (!achievementState.db || !achievementState.user) {
            console.error("Achievements: User authentication is not ready.");
            return;
        }

        try {
            const [logs, moods, journals, goals] = await Promise.all([
                achievementState.db.from("habit_logs")
                    .select("id,completed_on,completed")
                    .eq("user_id", achievementState.user.id),

                achievementState.db.from("mood_entries")
                    .select("id,entry_date")
                    .eq("user_id", achievementState.user.id),

                achievementState.db.from("journal_entries")
                    .select("id,entry_date")
                    .eq("user_id", achievementState.user.id),

                achievementState.db.from("goals")
                    .select("id,status")
                    .eq("user_id", achievementState.user.id)
            ]);

            for (const result of [logs, moods, journals, goals]) {
                if (result.error) throw result.error;
            }

            achievementState.logs = logs.data || [];
            achievementState.moods = moods.data || [];
            achievementState.journals = journals.data || [];
            achievementState.goals = goals.data || [];

            defineAchievements();
            renderAchievements();

        } catch (error) {
            console.error("Achievements loading error:", error);

            const grid = el("achievementGrid");
            if (grid) {
                grid.textContent =
                    "Unable to load achievements. Please refresh and try again.";
            }
        }
                }
    
    /* =========================================
       LIFETRACK ACHIEVEMENTS - PART 2
       Display and interaction
    ========================================= */

    function renderAchievementSummary() {
        const all = achievementState.achievements;
        const unlocked = all.filter(item => item.unlocked);

        const points = unlocked.reduce(
            (total, item) => total + item.points, 0
        );

        const percentage = all.length
            ? Math.round((unlocked.length / all.length) * 100)
            : 0;

        setText("achievementUnlocked", unlocked.length);
        setText("achievementLocked", all.length - unlocked.length);
        setText("achievementPoints", points);
        setText("achievementCompletion", `${percentage}%`);
    }

    function createAchievementCard(item) {
        const card = document.createElement("article");
        card.className = `achievement-card ${
            item.unlocked ? "unlocked" : "locked"
        }`;

        const points = document.createElement("span");
        points.className = "achievement-points";
        points.textContent = `+${item.points} points`;

        const badge = document.createElement("div");
        badge.className = "achievement-badge";

        const icon = document.createElement("i");
        icon.setAttribute("data-lucide", item.icon);
        badge.appendChild(icon);

        const title = document.createElement("h4");
        title.textContent = item.title;

        const description = document.createElement("p");
        description.textContent = item.description;

        const category = document.createElement("small");
        category.textContent = item.category;
        category.style.color = "#a99aff";

        const status = document.createElement("span");
        status.className = "achievement-status";

        if (item.unlocked) {
            status.textContent = "✓ UNLOCKED";
        } else {
            status.textContent = "🔒 LOCKED";
        }

        card.append(points, badge, category, title, description);

        if (!item.unlocked) {
            const progressText = document.createElement("small");
            progressText.textContent =
                `${item.current} / ${item.target} completed`;

            progressText.style.display = "block";
            progressText.style.marginTop = "14px";
            progressText.style.color = "#929bb0";

            const progress = document.createElement("div");
            progress.className = "achievement-progress";

            const fill = document.createElement("div");
            fill.className = "achievement-progress-fill";
            fill.style.width = `${item.progress}%`;

            progress.appendChild(fill);
            card.append(progressText, progress);
        }

        card.appendChild(status);

        return card;
    }

    function renderAchievementGrid() {
        const grid = el("achievementGrid");
        if (!grid) return;

        const filter = el("achievementFilter")?.value || "all";

        let items = achievementState.achievements;

        if (filter === "unlocked") {
            items = items.filter(item => item.unlocked);
        } else if (filter === "locked") {
            items = items.filter(item => !item.unlocked);
        }

        grid.replaceChildren();

        if (!items.length) {
            const empty = document.createElement("div");
            empty.className = "achievements-empty";

            empty.textContent = filter === "unlocked"
                ? "No achievements unlocked yet. Your first milestone is waiting!"
                : "Congratulations! You've unlocked every achievement.";

            grid.appendChild(empty);
            return;
        }

        items.forEach(item => {
            grid.appendChild(createAchievementCard(item));
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function renderNextAchievement() {
        const next = achievementState.achievements
            .filter(item => !item.unlocked)
            .sort((a, b) => {
                const ratioA = a.current / a.target;
                const ratioB = b.current / b.target;
                return ratioB - ratioA;
            })[0];

        if (!next) {
            setText("nextAchievementTitle", "Achievement Master!");
            setText("nextAchievementDescription",
                "You've unlocked every available achievement. Keep growing!");
            return;
        }

        const remaining = Math.max(0, next.target - next.current);

        setText("nextAchievementTitle", next.title);

        setText("nextAchievementDescription",
            `${next.description} ${remaining} more ${
                remaining === 1 ? "record" : "records"
            } needed to unlock it.`
        );
    }

    function renderAchievements() {
        renderAchievementSummary();
        renderAchievementGrid();
        renderNextAchievement();
    }

    /* ACHIEVEMENT FILTER */

    el("achievementFilter")?.addEventListener("change", () => {
        renderAchievementGrid();
    });

    /* INITIALIZATION */

    document.addEventListener("lifetrack:ready", loadAchievements);

    if (window.LifeTrack?.user) {
        loadAchievements();
    }

})();

/* ==========================================
   LIFETRACK REWARDS CENTER
   Supabase Integration - Version 1
========================================== */

(() => {
    let rewardsInitialized = false;

    const startRewards = async () => {
        if (rewardsInitialized) return;

        const app = window.LifeTrack;
        if (!app || !app.db || !app.user) return;

        rewardsInitialized = true;

        const db = app.db;
        const user = app.user;

        const grid = document.getElementById("rewardGrid");
        const history = document.getElementById("rewardHistory");

        const pointsDisplay =
            document.getElementById("rewardAvailablePoints");

        const totalDisplay =
            document.getElementById("rewardTotalPoints");

        const creditsDisplay =
            document.getElementById("rewardAICredits");

        const redeemedDisplay =
            document.getElementById("rewardRedeemedCount");

        const planTitle =
            document.getElementById("rewardPlanTitle");

        const planDescription =
            document.getElementById("rewardPlanDescription");

        if (!grid || !history) return;

        // Create a message area.
        let message = document.getElementById("rewardMessage");

        if (!message) {
            message = document.createElement("div");
            message.id = "rewardMessage";
            message.style.margin = "12px 0";
            message.style.fontSize = "13px";
            message.style.fontWeight = "600";
            grid.parentNode.insertBefore(message, grid);
        }

        const showMessage = (text, success = false) => {
            message.textContent = text;
            message.style.color = success ? "#16834a" : "#d04444";
        };

        // Display subscription guidance.
        if (planTitle) {
            planTitle.textContent = "Standard plan rewards";
        }

        if (planDescription) {
            planDescription.textContent =
                "Standard users can exchange earned points for AI Coach questions. Advanced users receive AI Coach access through their subscription.";
        }

        // Load wallet information.
        const loadWallet = async () => {
            const { data, error } = await db
                .from("reward_wallets")
                .select("*")
                .eq("user_id", user.id)
                .maybeSingle();

            if (error) throw error;

            const wallet = data || {};

            if (pointsDisplay) {
                pointsDisplay.textContent =
                    wallet.points_balance || 0;
            }

            if (totalDisplay) {
                totalDisplay.textContent =
                    wallet.lifetime_points_earned || 0;
            }

            if (creditsDisplay) {
                creditsDisplay.textContent =
                    wallet.ai_question_credits || 0;
            }

            if (redeemedDisplay) {
                redeemedDisplay.textContent =
                    wallet.total_credits_redeemed || 0;
            }
        };

        // Load available packages.
        const loadPackages = async () => {
            const { data, error } = await db
                .from("reward_packages")
                .select("*")
                .eq("is_active", true)
                .order("points_cost", { ascending: true });

            if (error) throw error;

            grid.replaceChildren();

            if (!data || data.length === 0) {
                grid.textContent = "No reward packages available.";
                return;
            }

            data.forEach(pkg => {
                const card = document.createElement("div");
                card.className = "reward-card";

                const icon = document.createElement("div");
                icon.className = "reward-icon";
                icon.innerHTML = '<i data-lucide="brain-circuit"></i>';

                const label = document.createElement("span");
                label.className = "reward-package-label";
                label.textContent = "AI QUESTION PACKAGE";

                const title = document.createElement("h3");
                title.textContent =
                    `${pkg.ai_questions} AI Questions`;

                const cost = document.createElement("div");
                cost.className = "reward-cost";
                cost.textContent = `${pkg.points_cost} Points`;

                const button = document.createElement("button");
                button.className = "reward-redeem-btn";
                button.textContent = "Redeem Points";

                button.addEventListener("click", async () => {
                    const confirmed = window.confirm(
                        `Redeem ${pkg.points_cost} points for ${pkg.ai_questions} AI questions?`
                    );

                    if (!confirmed) return;

                    button.disabled = true;
                    button.textContent = "Processing...";

                    try {
                        const { data: result, error: redeemError } =
                            await db.rpc(
                                "redeem_ai_question_package",
                                { p_package_id: pkg.id }
                            );

                        if (redeemError) throw redeemError;

                        if (!result || !result.success) {
                            throw new Error("Redemption was not confirmed.");
                        }

                        showMessage(
                            `Success! ${result.questions_added} AI question credits added.`,
                            true
                        );

                        await loadWallet();
                        await loadHistory();

                    } catch (error) {
                        console.error("Rewards redemption:", error);
                        showMessage(
                            error.message || "Redemption failed."
                        );
                    } finally {
                        button.disabled = false;
                        button.textContent = "Redeem Points";
                    }
                });

                card.append(icon, label, title, cost, button);
                grid.appendChild(card);
            });

            if (window.lucide) {
                window.lucide.createIcons();
            }
        };

        // Load redemption history.
        const loadHistory = async () => {
            const { data, error } = await db
                .from("reward_redemptions")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(10);

            if (error) throw error;

            history.replaceChildren();

            if (!data || data.length === 0) {
                history.textContent = "No redemptions yet.";
                return;
            }

            data.forEach(item => {
                const entry = document.createElement("div");
                entry.style.padding = "12px 0";
                entry.style.borderBottom =
                    "1px solid var(--border-color, #eee)";

                const heading = document.createElement("strong");
                heading.textContent = item.package_name;

                const details = document.createElement("p");
                details.style.margin = "5px 0";
                details.textContent =
                    `${item.points_spent} points spent • ${item.questions_added} AI questions received`;

                const date = document.createElement("small");
                date.textContent = new Date(
                    item.created_at
                ).toLocaleString();

                entry.append(heading, details, date);
                history.appendChild(entry);
            });
        };

        // Load everything.
        try {
            grid.textContent = "Loading reward packages...";
            history.textContent = "Loading redemption history...";

            await Promise.all([
                loadWallet(),
                loadPackages(),
                loadHistory()
            ]);

            console.log("LifeTrack Rewards loaded successfully.");

        } catch (error) {
            console.error("Rewards loading error:", error);
            showMessage(
                "Unable to load Rewards Center. Please refresh the page."
            );
        }
    };

    // Wait for LifeTrack authentication.
    window.addEventListener("lifetrack:ready", startRewards);

    if (window.LifeTrack?.user) {
        startRewards();
    }
})();

        
            
                                                
