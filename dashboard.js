document.addEventListener("DOMContentLoaded", async function () {
    "use strict";

    const supabase = window.lifeTrackSupabase;
    if (!supabase) {
        alert("LifeTrack could not connect to the database.");
        return;
    }

    let currentUser = null;
    let currentSubscription = null;
    let habits = [];
    let habitLogs = [];
    let habitFilter = "all";
    let selectedMood = null;
    let moodEntries = [];
    let journalEntries = [];
    let goals = [];
    let calendarMonth = new Date();
    let checkins = [];

    const $ = selector => document.querySelector(selector);
    const $$ = selector => document.querySelectorAll(selector);

    function setText(selector, value) {
        const element = $(selector);
        if (element) element.textContent = value ?? "";
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;",
            '"': "&quot;", "'": "&#39;"
        })[char]);
    }

    function localDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function showMessage(selector, message) {
        setText(selector, message);
    }

    // AUTHENTICATION AND PREMIUM ACCESS
    async function authenticateUser() {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
            window.location.href = "auth.html";
            return false;
        }
        currentUser = data.session.user;
        return true;
    }

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

        const { data: rows, error: detailsError } = await supabase
            .from("subscriptions")
            .select("plan_name, plan, expires_at")
            .eq("user_id", currentUser.id)
            .eq("status", "active")
            .lte("starts_at", new Date().toISOString())
            .gt("expires_at", new Date().toISOString())
            .order("expires_at", { ascending: false })
            .limit(1);

        if (detailsError) {
            console.warn("Subscription details unavailable:", detailsError);
        } else {
            currentSubscription = rows?.[0] || null;
        }
        return true;
    }

    async function displayUserInformation() {
        const { data: profile, error } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", currentUser.id)
            .maybeSingle();

        if (error) console.warn("Profile details unavailable:", error);

        const name = profile?.full_name ||
            currentUser.user_metadata?.full_name ||
            currentUser.email?.split("@")[0] || "Member";

        setText("#profileName", name);
        setText("#userName", name);
        setText("#welcomeName", name);
        setText("#profileEmail", currentUser.email);

        const plan = currentSubscription?.plan_name ||
            currentSubscription?.plan || "Premium";
        setText("#currentPlanName", plan);
        setText("#planBadgeText", plan);

        setText("#subscriptionDetails", currentSubscription?.expires_at
            ? "Active until " + new Date(currentSubscription.expires_at).toLocaleDateString()
            : "Premium subscription active");
    }

    // NAVIGATION
    function openDashboardSection(sectionId) {
        $$(".dashboard-section").forEach(section => {
            section.classList.toggle("active", section.id === sectionId);
        });
        $$(".nav-link").forEach(link => {
            link.classList.toggle("active", link.dataset.section === sectionId);
        });
    }

    $$(".nav-link").forEach(link => {
        link.addEventListener("click", function () {
            if (this.dataset.section === "coach") {
                window.location.href = "ai-coach.html";
            } else if (this.dataset.section) {
                openDashboardSection(this.dataset.section);
            }
        });
    });

    // THEME AND LOGOUT
    function applyTheme(theme) {
        document.body.classList.toggle("dark-mode", theme === "dark");
        localStorage.setItem("lifetrack_theme", theme);
    }

    applyTheme(localStorage.getItem("lifetrack_theme") || "light");

    ["#themeToggle", "#settingsThemeToggle"].forEach(selector => {
        $(selector)?.addEventListener("click", () => {
            applyTheme(document.body.classList.contains("dark-mode")
                ? "light" : "dark");
        });
    });

    async function logoutUser() {
        if (!confirm("Are you sure you want to log out?")) return;
        const { error } = await supabase.auth.signOut();
        if (error) {
            alert("Unable to log out. Please try again.");
            return;
        }
        window.location.href = "auth.html";
    }

    ["#logoutButton", "#settingsLogoutButton"].forEach(selector => {
        $(selector)?.addEventListener("click", logoutUser);
    });

    // HABITS
    async function loadHabits() {
        const { data, error } = await supabase.from("habits")
            .select("*").eq("user_id", currentUser.id)
            .eq("is_active", true).order("created_at", { ascending: false });

        if (error) {
            console.error("Loading habits:", error);
            return;
        }
        habits = data || [];

        const { data: logs, error: logError } = await supabase
            .from("habit_logs").select("*")
            .eq("user_id", currentUser.id)
            .order("completed_on", { ascending: false });

        if (logError) {
            console.error("Loading habit logs:", logError);
            return;
        }
        habitLogs = logs || [];
        renderHabits();
        updateHabitStats();
        updateRewardsSummary();
    }

    function isHabitCompleted(habitId, date = localDateString()) {
        return habitLogs.some(log => log.habit_id === habitId &&
            log.completed_on === date && log.completed === true);
    }

    function renderHabits() {
        const list = $("#habitList");
        const todayList = $("#todayHabits");
        const filtered = habits.filter(habit => {
            const done = isHabitCompleted(habit.id);
            return habitFilter === "all" ||
                (habitFilter === "completed" && done) ||
                (habitFilter === "pending" && !done);
        });

        if (list) {
            list.innerHTML = filtered.length ? filtered.map(habit => {
                const done = isHabitCompleted(habit.id);
                return `<div class="habit-item">
                    <label><input type="checkbox" data-habit-id="${escapeHTML(habit.id)}"
                    ${done ? "checked" : ""}>
                    <span>${escapeHTML(habit.title)}</span></label>
                    <small>${done ? "Completed" : "Pending"}</small>
                </div>`;
            }).join("") : '<div class="empty-state">No habits found. Add your first habit!</div>';
        }

        if (todayList) {
            todayList.innerHTML = habits.length ? habits.map(habit => `
                <div class="habit-item">
                    <label><input type="checkbox" data-habit-id="${escapeHTML(habit.id)}"
                    ${isHabitCompleted(habit.id) ? "checked" : ""}>
                    <span>${escapeHTML(habit.title)}</span></label>
                </div>`).join("") :
                '<div class="empty-state">No habits scheduled today.</div>';
        }
    }

    function updateHabitStats() {
        const completed = habits.filter(h => isHabitCompleted(h.id)).length;
        const total = habits.length;
        const percent = total ? Math.round(completed / total * 100) : 0;
        setText("#totalHabits", total);
        setText("#completedHabitsToday", completed);
        setText("#habitsCompleted", completed);
        setText("#dailyProgressText", `${percent}% completed`);
        const bar = $("#dailyProgress");
        if (bar) bar.style.width = `${percent}%`;
    }

    $("#addHabitButton")?.addEventListener("click", async () => {
        const title = prompt("What habit would you like to build?");
        if (!title?.trim()) return;
        const description = prompt("Add a short description (optional):") || "";
        const { error } = await supabase.from("habits").insert({
            user_id: currentUser.id, title: title.trim(),
            description: description.trim(), frequency: "daily",
            target_days: [0, 1, 2, 3, 4, 5, 6], is_active: true
        });
        if (error) {
            console.error("Adding habit:", error);
            alert("Could not save your habit.");
            return;
        }
        await loadHabits();
    });

    $$("[data-habit-filter]").forEach(button => {
        button.addEventListener("click", function () {
            habitFilter = this.dataset.habitFilter;
            renderHabits();
        });
    });

    document.addEventListener("change", async event => {
        const checkbox = event.target.closest("[data-habit-id]");
        if (!checkbox) return;

        const habitId = checkbox.dataset.habitId;
        const completed = checkbox.checked;
        const { data: existing, error: findError } = await supabase
            .from("habit_logs").select("id")
            .eq("habit_id", habitId).eq("user_id", currentUser.id)
            .eq("completed_on", localDateString()).maybeSingle();

        if (findError) {
            console.error("Finding habit record:", findError);
            await loadHabits();
            return;
        }

        const result = existing
            ? await supabase.from("habit_logs").update({ completed })
                .eq("id", existing.id).eq("user_id", currentUser.id)
            : await supabase.from("habit_logs").insert({
                habit_id: habitId, user_id: currentUser.id,
                completed_on: localDateString(), completed
            });

        if (result.error) {
            console.error("Saving habit completion:", result.error);
            alert("Could not update this habit.");
        }
        await loadHabits();
    });

    // MOOD TRACKER
    async function loadMoodHistory() {
        const { data, error } = await supabase.from("mood_entries")
            .select("*").eq("user_id", currentUser.id)
            .order("created_at", { ascending: false }).limit(30);
        if (error) {
            console.error("Loading moods:", error);
            return;
        }
        moodEntries = data || [];
        const history = $("#moodHistory");
        if (history) {
            history.innerHTML = moodEntries.length ? moodEntries.map(entry => `
                <div class="journal-item">
                    <strong>${escapeHTML(entry.mood)}</strong>
                    <p>${escapeHTML(entry.note || "")}</p>
                    <small>${escapeHTML(entry.entry_date || "")}</small>
                </div>`).join("") :
                '<div class="empty-state">No mood records yet.</div>';
        }
        renderMoodPreview();
    }

    function renderMoodPreview() {
        const preview = $("#moodPreview");
        if (!preview) return;
        const latest = moodEntries[0];
        preview.textContent = latest
            ? `${latest.mood} — ${latest.entry_date}`
            : "No mood recorded yet.";
    }

    $$("[data-mood]").forEach(button => {
        button.addEventListener("click", function () {
            selectedMood = this.dataset.mood;
            $$("[data-mood]").forEach(item => item.classList.remove("selected"));
            this.classList.add("selected");
        });
    });

    $("#saveMoodButton")?.addEventListener("click", async () => {
        if (!selectedMood) {
            alert("Please select your mood first.");
            return;
        }
        const note = $("#moodNote")?.value || "";
        const { error } = await supabase.from("mood_entries").insert({
            user_id: currentUser.id, mood: selectedMood,
            note: note.trim(), entry_date: localDateString()
        });
        if (error) {
            console.error("Saving mood:", error);
            alert("Could not save your mood.");
            return;
        }
        if ($("#moodNote")) $("#moodNote").value = "";
        selectedMood = null;
        $$("[data-mood]").forEach(item => item.classList.remove("selected"));
        showMessage("#moodMessage", "Your mood has been saved.");
        await loadMoodHistory();
    });

    // JOURNAL
    async function loadJournalEntries() {
        const { data, error } = await supabase.from("journal_entries")
            .select("*").eq("user_id", currentUser.id)
            .order("created_at", { ascending: false }).limit(50);
        if (error) {
            console.error("Loading journal:", error);
            return;
        }
        journalEntries = data || [];
        setText("#journalEntryCount", journalEntries.length);
        const history = $("#journalHistory");
        if (history) {
            history.innerHTML = journalEntries.length ? journalEntries.map(entry => `
                <div class="journal-item">
                    <strong>${escapeHTML(entry.title)}</strong>
                    <p>${escapeHTML(entry.content)}</p>
                    <small>${escapeHTML(entry.entry_date || "")}</small>
                </div>`).join("") :
                '<div class="empty-state">Your journal is waiting for its first entry.</div>';
        }
    }

    $("#saveJournal")?.addEventListener("click", async () => {
        const title = $("#journalTitle")?.value.trim() || "My Journal";
        const content = $("#journalEntry")?.value.trim() || "";
        if (!content) {
            alert("Please write something before saving.");
            return;
        }
        const { error } = await supabase.from("journal_entries").insert({
            user_id: currentUser.id, title, content,
            entry_date: localDateString()
        });
        if (error) {
            console.error("Saving journal:", error);
            alert("Could not save your journal entry.");
            return;
        }
        if ($("#journalTitle")) $("#journalTitle").value = "";
        if ($("#journalEntry")) $("#journalEntry").value = "";
        showMessage("#journalMessage", "Your journal entry has been saved.");
        await loadJournalEntries();
    });

    // GOALS
    async function loadGoals() {
        const { data, error } = await supabase.from("goals")
            .select("*").eq("user_id", currentUser.id)
            .order("created_at", { ascending: false });
        if (error) {
            console.error("Loading goals:", error);
            return;
        }
        goals = data || [];
        renderGoals();
        updateGoalStats();
    }

    function renderGoals() {
        const active = goals.filter(goal => goal.status === "active");
        const list = $("#goalList");
        const milestones = $("#goalMilestoneList");
        const upcoming = $("#upcomingGoals");

        if (list) {
            list.innerHTML = goals.length ? goals.map(goal => `
                <div class="goal-item">
                    <strong>${escapeHTML(goal.title)}</strong>
                    <p>${escapeHTML(goal.description || "")}</p>
                    <small>Target: ${escapeHTML(goal.target_date || "No deadline")}</small>
                    <div class="progress-track"><div class="progress-fill"
                    style="width:${Number(goal.progress)}%"></div></div>
                    <p>${Number(goal.progress)}% complete</p>
                    <button class="btn btn-secondary" data-goal-progress="${escapeHTML(goal.id)}">
                    Update progress</button>
                </div>`).join("") :
                '<div class="empty-state">No goals yet. Create your first goal!</div>';
        }
        if (milestones) {
            milestones.innerHTML = active.length ? active.map(goal => `
                <div class="goal-item"><strong>${escapeHTML(goal.title)}</strong>
                <p>${Number(goal.progress)}% completed</p></div>`).join("") :
                '<div class="empty-state">No active milestones.</div>';
        }
        if (upcoming) {
            const next = active.filter(g => g.target_date)
                .sort((a, b) => a.target_date.localeCompare(b.target_date)).slice(0, 4);
            upcoming.innerHTML = next.length ? next.map(goal => `
                <div class="goal-item"><strong>${escapeHTML(goal.title)}</strong>
                <small>${escapeHTML(goal.target_date)}</small></div>`).join("") :
                '<div class="empty-state">No upcoming goals.</div>';
        }
    }

    function updateGoalStats() {
        setText("#goalTotal", goals.length);
        setText("#completedGoals", goals.filter(g => g.status === "completed").length);
        setText("#activeGoals", goals.filter(g => g.status === "active").length);
        setText("#goalMilestones", goals.filter(g =>
            g.status === "active" && Number(g.progress) >= 50).length);
    }

    $("#addGoalButton")?.addEventListener("click", async () => {
        const title = prompt("What goal would you like to achieve?");
        if (!title?.trim()) return;
        const description = prompt("Describe your goal (optional):") || "";
        const targetDate = prompt("Target date (YYYY-MM-DD), or leave blank:");
        if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
            alert("Please use YYYY-MM-DD for the date.");
            return;
        }
        const { error } = await supabase.from("goals").insert({
            user_id: currentUser.id, title: title.trim(),
            description: description.trim(), target_date: targetDate || null,
            progress: 0, status: "active"
        });
        if (error) {
            console.error("Creating goal:", error);
            alert("Could not create your goal.");
            return;
        }
        await loadGoals();
    });

    document.addEventListener("click", async event => {
        const button = event.target.closest("[data-goal-progress]");
        if (!button) return;
        const goal = goals.find(item => item.id === button.dataset.goalProgress);
        if (!goal) return;
        const answer = prompt("Enter progress from 0 to 100:", String(goal.progress));
        if (answer === null) return;
        const progress = Number(answer);
        if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
            alert("Enter a whole number from 0 to 100.");
            return;
        }
        const { error } = await supabase.from("goals").update({
            progress, status: progress === 100 ? "completed" : "active"
        }).eq("id", goal.id).eq("user_id", currentUser.id);
        if (error) {
            console.error("Updating goal:", error);
            alert("Could not update your goal.");
            return;
        }
        await loadGoals();
    });

    // DAILY CHECK-IN
    async function loadCheckin() {
        const { data, error } = await supabase.from("daily_checkins")
            .select("*").eq("user_id", currentUser.id)
            .order("checkin_date", { ascending: false }).limit(30);
        if (error) {
            console.error("Loading check-ins:", error);
            return;
        }
        checkins = data || [];
    }

    async function saveDailyCheckin() {
        const reflection = prompt("What is one thing you want to reflect on today?");
        if (reflection === null) return;
        const gratitude = prompt("What are you grateful for today?") || "";
        const energy = Number(prompt("Energy level from 1 to 10:", "5"));
        if (!Number.isInteger(energy) || energy < 1 || energy > 10) {
            alert("Energy level must be a number from 1 to 10.");
            return;
        }

        const today = localDateString();
        const { data: existing, error: findError } = await supabase
            .from("daily_checkins").select("id")
            .eq("user_id", currentUser.id)
            .eq("checkin_date", today).maybeSingle();

        if (findError) {
            console.error("Checking today's check-in:", findError);
            return;
        }

        const values = {
            user_id: currentUser.id, checkin_date: today,
            reflection, gratitude, energy_level: energy
        };

        const result = existing
            ? await supabase.from("daily_checkins").update(values).eq("id", existing.id)
            : await supabase.from("daily_checkins").insert(values);

        if (result.error) {
            console.error("Saving check-in:", result.error);
            alert("Could not save your daily check-in.");
            return;
        }
        await loadCheckin();
        renderCalendar();
        alert("Your daily check-in has been saved.");
    }

    // Attach to the existing daily check-in area if it has a button.
    const checkinButton = $("#saveCheckinButton") ||
        $("#dailyCheckinButton") || $('[data-action="save-checkin"]');
    checkinButton?.addEventListener("click", saveDailyCheckin);

    // CALENDAR: displays days with recorded habits, moods, goals or check-ins.
    function renderCalendar() {
        const grid = $("#growthCalendar");
        if (!grid) return;

        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        setText("#calendarMonth", calendarMonth.toLocaleDateString(undefined, {
            month: "long", year: "numeric"
        }));

        const activityDates = new Set([
            ...habitLogs.filter(log => log.completed).map(log => log.completed_on),
            ...moodEntries.map(entry => entry.entry_date),
            ...checkins.map(entry => entry.checkin_date)
        ]);

        let html = "";
        for (let i = 0; i < firstDay; i++) html += '<div class="calendar-day"></div>';

        for (let day = 1; day <= daysInMonth; day++) {
            const date = localDateString(new Date(year, month, day));
            const today = date === localDateString();
            const active = activityDates.has(date);
            html += `<div class="calendar-day ${today ? "today" : ""}"
                title="${active ? "Activity recorded" : "No activity recorded"}">
                <span>${day}</span>${active ? '<small>•</small>' : ""}
            </div>`;
        }
        grid.innerHTML = html;
    }

    $("#previousMonth")?.addEventListener("click", () => {
        calendarMonth.setMonth(calendarMonth.getMonth() - 1);
        renderCalendar();
    });
    $("#nextMonth")?.addEventListener("click", () => {
        calendarMonth.setMonth(calendarMonth.getMonth() + 1);
        renderCalendar();
    });

    // REWARDS AND STREAK SUMMARY: derived from saved habit activity.
    function calculateCurrentStreak() {
        const completedDates = new Set(habitLogs
            .filter(log => log.completed)
            .map(log => log.completed_on));

        let streak = 0;
        const date = new Date();
        if (!completedDates.has(localDateString(date))) {
            date.setDate(date.getDate() - 1);
        }
        while (completedDates.has(localDateString(date))) {
            streak++;
            date.setDate(date.getDate() - 1);
        }
        return streak;
    }

    function updateRewardsSummary() {
        const streak = calculateCurrentStreak();
        const completedCount = habitLogs.filter(log => log.completed).length;
        const points = completedCount * 10 + streak * 5;

        setText("#rewardCurrentStreak", streak);
        setText("#currentStreak", streak);
        setText("#longestStreak", streak);
        setText("#totalRewardPoints", points);
        setText("#achievementPoints", points);
        setText("#totalRewardsUnlocked", Math.floor(points / 100));
        setText("#unlockedBadges", Math.floor(points / 100));
        setText("#streakProgress", `${streak % 7}/7 days`);
        setText("#nextStreakMilestone", `${7 - (streak % 7)} days until next 7-day milestone`);
    }

    // BASIC CHALLENGE AND DAILY JOKE CONTENT
    const dailyJokes = [
        "Why did the developer go broke? Because they used up all their cache.",
        "Why do programmers prefer dark mode? Because light attracts bugs.",
        "A SQL query walks into a bar and asks: Can I join you?"
    ];

    const jokeIndex = new Date().getDate() % dailyJokes.length;
    setText("#dailyJoke", dailyJokes[jokeIndex]);
    $("#newJokeButton")?.addEventListener("click", () => {
        const next = Math.floor(Math.random() * dailyJokes.length);
        setText("#dailyJoke", dailyJokes[next]);
    });

    // REMINDERS: save preferences locally on this device.
    const reminderToggle = $("#remindersEnabled");
    const morningReminder = $("#morningReminder");
    const eveningReminder = $("#eveningReminder");

    if (reminderToggle) {
        reminderToggle.checked = localStorage.getItem("lifetrack_reminders") === "true";
    }
    if (morningReminder) {
        morningReminder.value = localStorage.getItem("lifetrack_morning") || "08:00";
    }
    if (eveningReminder) {
        eveningReminder.value = localStorage.getItem("lifetrack_evening") || "20:00";
    }

    $("#saveRemindersButton")?.addEventListener("click", () => {
        localStorage.setItem("lifetrack_reminders", String(!!reminderToggle?.checked));
        if (morningReminder) localStorage.setItem("lifetrack_morning", morningReminder.value);
        if (eveningReminder) localStorage.setItem("lifetrack_evening", eveningReminder.value);
        showMessage("#scheduleMessage", "Reminder preferences saved on this device.");
    });

    // INITIALIZE DASHBOARD DATA
    const authenticated = await authenticateUser();
    if (!authenticated) return;

    const subscriptionActive = await verifySubscription();
    if (!subscriptionActive) return;

    await displayUserInformation();

    await Promise.all([
        loadHabits(),
        loadMoodHistory(),
        loadJournalEntries(),
        loadGoals(),
        loadCheckin()
    ]);

    renderCalendar();
    updateRewardsSummary();

    console.log("LifeTrack dashboard initialized.");
});
