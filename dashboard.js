
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

