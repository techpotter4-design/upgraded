
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

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);

    const form = $("goalForm");
    const goalList = $("goalList");
    const formCard = $("goalFormCard");

    if (!form || !goalList) return;

    let goals = [];
    let activeFilter = "all";
    let searchTerm = "";

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
        $("goalPriority").value = goal?.priority || "medium";
        $("goalProgressInput").value = goal?.progress ?? 0;

        $("goalProgressField").hidden = !goal;

        $("goalFormTitle").textContent = goal
            ? "Update Your Goal"
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

        const active = total - completed;

        const average = total
            ? Math.round(
                goals.reduce(
                    (sum, goal) => sum + Number(goal.progress || 0), 0
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
        description.textContent = goal.description || "No description added.";

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

        const priority = document.createElement("span");
        priority.textContent =
            `Priority: $("goalPriority").value = "medium";

        const deadline = document.createElement("span");
        deadline.textContent = goal.target_date
            ? `Target: ${new Date(
                goal.target_date + "T00:00:00"
            ).toLocaleDateString("en-US")}`
            : "No deadline";

        meta.append(priority, deadline);

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
                ? "No goals match your search or filter."
                : "Your goals will appear here. Create your first goal!";
            goalList.appendChild(empty);
            return;
        }

        visible.forEach(goal => {
            goalList.appendChild(createGoalCard(goal));
        });
    }

    async function loadGoals() {
        const state = window.LifeTrack;
        if (!state?.db || !state.user) return;

        const { data, error } = await state.db
            .from("goals")
            .select("*")
            .eq("user_id", state.user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Goals loading error:", error);
            showMessage("Unable to load your goals.", true);
            return;
        }

        goals = data || [];

        calculateStats();
        renderGoals();
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const state = window.LifeTrack;
        if (!state?.db || !state.user) {
            showMessage("Please wait for your account to load.", true);
            return;
        }

        const id = $("goalId").value;
        const title = $("goalTitle").value.trim();
        const description = $("goalDescription").value.trim();
        const targetDate = $("goalDeadline").value;
        const priority = $("goalPriority").value;

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
            title,
            description,
            target_date: targetDate || null,
            progress,
            status: progress === 100 ? "completed" : "active"
        };


        const saveButton = $("saveGoalButton");
        saveButton.disabled = true;
        showMessage("Saving your goal...");

        const result = id
            ? await state.db.from("goals")
                .update(record)
                .eq("id", id)
                .eq("user_id", state.user.id)
            : await state.db.from("goals").insert(record);

        saveButton.disabled = false;

        if (result.error) {
            console.error("Goal save error:", result.error);
            showMessage(
                "Could not save your goal. Check the database columns.",
                true
            );
            return;
        }

        closeForm();
        await loadGoals();
    });

    goalList.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const goal = goals.find(item =>
            String(item.id) === button.dataset.id
        );

        if (!goal) return;

        const state = window.LifeTrack;

        if (button.dataset.action === "edit") {
            openForm(goal);
            return;
        }

        if (button.dataset.action === "delete") {
            if (!confirm("Permanently delete this goal?")) return;

            const { error } = await state.db
                .from("goals")
                .delete()
                .eq("id", goal.id)
                .eq("user_id", state.user.id);

            if (error) {
                console.error(error);
                showMessage("Unable to delete this goal.", true);
                return;
            }

            await loadGoals();
        }

        if (button.dataset.action === "complete") {
            const completed = goal.status !== "completed";

            const { error } = await state.db
                .from("goals")
                .update({
                    status: completed ? "completed" : "active",
                    progress: completed ? 100 : 0
                })
                .eq("id", goal.id)
                .eq("user_id", state.user.id);

            if (error) {
                console.error(error);
                showMessage("Unable to update goal status.", true);
                return;
            }

            await loadGoals();
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

    if (window.LifeTrack?.user) {
        loadGoals();
    }
});
                          
