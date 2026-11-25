
/* ============================================
   LIFETRACK AI COACH V2
   COMPLETE FRONTEND JAVASCRIPT
============================================ */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    // =========================================
    // 1. ELEMENTS
    // =========================================

    const $ = (id) => document.getElementById(id);

    const elements = {
        app: $("coachApp"),
        sidebar: $("coachSidebar"),
        overlay: $("sidebarOverlay"),
        menu: $("coachMenuToggle"),
        closeSidebar: $("sidebarCloseButton"),

        newChat: $("newChatButton"),
        history: $("chatHistoryList"),

        theme: $("themeToggle"),
        clear: $("clearChatButton"),

        messages: $("chatMessages"),
        typing: $("typingIndicator"),

        form: $("coachChatForm"),
        input: $("coachMessage"),
        send: $("coachSendButton"),

        suggestions: $("coachSuggestions"),

        plan: $("coachPlanName"),
        access: $("coachAccessStatus"),

        creditDescription: $("coachCreditDescription"),
        creditCount: $("coachCreditCount")
    };

    // =========================================
    // 2. STORAGE
    // =========================================

    const CHAT_STORAGE = "lifetrack_coach_v2_chats";
    const THEME_STORAGE = "lifetrack_coach_v2_theme";

    let conversations = [];
    let activeChatId = null;
    let activeMode = "general";

    const coachingModes = [
        "general",
        "habits",
        "mood",
        "goals",
        "routine"
    ];

    // =========================================
    // 3. HELPERS
    // =========================================

    function generateId() {
        return Date.now().toString(36) +
            Math.random().toString(36).slice(2, 9);
    }

    function getActiveChat() {
        return conversations.find(
            chat => chat.id === activeChatId
        );
    }

    function createNewChat() {
        return {
            id: generateId(),
            title: "New conversation",
            mode: activeMode,
            messages: [],
            updatedAt: Date.now()
        };
    }

    function saveChats() {
        try {
            localStorage.setItem(
                CHAT_STORAGE,
                JSON.stringify(conversations)
            );
        } catch (error) {
            console.error("Could not save chat history:", error);
        }
    }

    function loadChats() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(CHAT_STORAGE) || "[]"
            );

            conversations = Array.isArray(saved)
                ? saved.filter(chat =>
                    chat &&
                    typeof chat.id === "string" &&
                    Array.isArray(chat.messages)
                )
                : [];

        } catch (error) {
            conversations = [];
        }

        if (conversations.length === 0) {
            const chat = createNewChat();

            conversations.push(chat);
            activeChatId = chat.id;

        } else {
            activeChatId = conversations[0].id;
            activeMode = conversations[0].mode || "general";
        }

        saveChats();
    }

    function formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit"
        });
    }

    function refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // =========================================
    // 4. CHAT HISTORY
    // =========================================

    function renderHistory() {

        if (!elements.history) return;

        elements.history.replaceChildren();

        const sortedChats = [...conversations].sort(
            (a, b) => b.updatedAt - a.updatedAt
        );

        if (sortedChats.length === 0) {

            const empty = document.createElement("div");

            empty.className = "history-empty";
            empty.textContent =
                "Your conversations will appear here.";

            elements.history.appendChild(empty);

            return;
        }

        sortedChats.forEach(chat => {

            const item = document.createElement("div");

            item.className = "history-item";

            if (chat.id === activeChatId) {
                item.classList.add("active");
            }

            const openButton = document.createElement("button");

            openButton.type = "button";
            openButton.className = "history-open";
            openButton.textContent = chat.title || "New conversation";
            openButton.title = chat.title || "New conversation";

            openButton.addEventListener("click", () => {

                activeChatId = chat.id;
                activeMode = chat.mode || "general";

                renderEverything();
                closeSidebar();

            });

            const deleteButton = document.createElement("button");

            deleteButton.type = "button";
            deleteButton.className = "history-action";
            deleteButton.textContent = "×";
            deleteButton.setAttribute(
                "aria-label",
                "Delete conversation"
            );

            deleteButton.addEventListener("click", event => {

                event.stopPropagation();

                if (!confirm(
                    "Are you sure you want to delete this conversation?"
                )) return;

                conversations = conversations.filter(
                    item => item.id !== chat.id
                );

                if (activeChatId === chat.id) {

                    if (conversations.length === 0) {

                        const newChat = createNewChat();

                        conversations.push(newChat);
                        activeChatId = newChat.id;

                    } else {

                        activeChatId = conversations[0].id;
                        activeMode =
                            conversations[0].mode || "general";
                    }
                }

                saveChats();
                renderEverything();

            });

            item.append(openButton, deleteButton);

            elements.history.appendChild(item);

        });
    }

    // =========================================
    // 5. RENDER MESSAGES
    // =========================================

    function renderMessages() {

        if (!elements.messages) return;

        elements.messages.replaceChildren();

        const chat = getActiveChat();

        if (!chat) return;

        if (chat.messages.length === 0) {

            const welcome = document.createElement("div");

            welcome.className = "welcome-message";

            const heading = document.createElement("h2");

            heading.textContent = "Let's make progress.";

            const paragraph = document.createElement("p");

            paragraph.textContent =
                "Tell me what you would like to improve today. Your growth journey starts here.";

            welcome.append(heading, paragraph);

            elements.messages.appendChild(welcome);

            return;
        }

        chat.messages.forEach(message => {

            const wrapper = document.createElement("div");

            wrapper.className =
                "message " +
                (message.sender === "user"
                    ? "user-message"
                    : "assistant-message");

            const content = document.createElement("div");

            content.className = "message-content";

            content.textContent = message.text;

            const time = document.createElement("small");

            time.className = "message-time";

            time.textContent = formatTime(message.time);

            wrapper.append(content, time);

            elements.messages.appendChild(wrapper);

        });

        requestAnimationFrame(() => {

            elements.messages.scrollTop =
                elements.messages.scrollHeight;

        });
    }

    // =========================================
    // 6. COACHING MODES
    // =========================================

    function updateModes() {

        document.querySelectorAll("[data-coach-mode]")
            .forEach(button => {

                const selected =
                    button.dataset.coachMode === activeMode;

                button.classList.toggle("active", selected);

                button.setAttribute(
                    "aria-pressed",
                    String(selected)
                );

            });
    }

    function selectMode(mode) {

        if (!coachingModes.includes(mode)) return;

        activeMode = mode;

        const chat = getActiveChat();

        if (chat) {
            chat.mode = mode;
            chat.updatedAt = Date.now();
        }

        saveChats();
        updateModes();
        renderHistory();
    }

    // =========================================
    // 7. SUGGESTIONS VISIBILITY
    // =========================================

    function updateSuggestions() {

        if (!elements.suggestions || !elements.input) {
            return;
        }

        const inputHasText =
            elements.input.value.trim().length > 0;

        const inputIsFocused =
            document.activeElement === elements.input;

        const hide =
            inputHasText || inputIsFocused;

        elements.suggestions.classList.toggle(
            "suggestions-hidden",
            hide
        );
    }

    // =========================================
    // 8. MESSAGE INPUT
    // =========================================

    function resizeInput() {

        if (!elements.input) return;

        elements.input.style.height = "auto";

        elements.input.style.height =
            Math.min(elements.input.scrollHeight, 110) + "px";
    }

    function updateSendButton() {

        if (!elements.send || !elements.input) return;

        elements.send.disabled =
            !elements.input.value.trim();
    }

    elements.input?.addEventListener("focus", () => {
        updateSuggestions();
    });

    elements.input?.addEventListener("input", () => {

        updateSuggestions();
        resizeInput();
        updateSendButton();

    });

    elements.input?.addEventListener("blur", () => {

        updateSuggestions();

    });

    // =========================================
    // 9. ADD MESSAGE
    // =========================================

    function addMessage(sender, text) {

        const chat = getActiveChat();

        if (!chat) return;

        const message = {
            sender: sender,
            text: text,
            time: Date.now()
        };

        chat.messages.push(message);

        if (
            sender === "user" &&
            chat.title === "New conversation"
        ) {

            chat.title =
                text.length > 38
                    ? text.substring(0, 38) + "..."
                    : text;

        }

        chat.updatedAt = Date.now();

        saveChats();

        renderMessages();
        renderHistory();
    }

    // =========================================
    // 10. SEND MESSAGE
    // =========================================

    function sendMessage(text) {

        const message = text.trim();

        if (!message) return;

        if (message.length > 3000) {

            alert("Your message is too long.");

            return;
        }

        addMessage("user", message);

        elements.input.value = "";

        resizeInput();
        updateSendButton();
        updateSuggestions();

        /*
         * AI BACKEND NOT CONNECTED YET.
         *
         * This temporary notice prevents the interface
         * from pretending that an AI response was generated.
         * No reward credits are deducted.
         */

        if (elements.send) {
            elements.send.disabled = true;
        }

        window.setTimeout(() => {

            addMessage(
                "assistant",
                "Your message has been saved. The secure AI service is not connected yet. Once the AI backend is ready, I will be able to respond to your coaching questions. No AI credits have been used."
            );

            if (elements.send) {
                elements.send.disabled = false;
            }

            elements.input?.focus();

        }, 400);
    }

    elements.form?.addEventListener("submit", event => {

        event.preventDefault();

        sendMessage(elements.input.value);

    });

    // =========================================
    // 11. SUGGESTED PROMPTS
    // =========================================

    elements.suggestions?.addEventListener(
        "click",
        event => {

            const button = event.target.closest(
                "[data-coach-prompt]"
            );

            if (!button) return;

            const prompt = button.dataset.coachPrompt;

            if (!prompt || !elements.input) return;

            elements.input.value = prompt;

            resizeInput();
            updateSendButton();
            updateSuggestions();

            elements.input.focus();

        }
    );

    // =========================================
    // 12. NEW CONVERSATION
    // =========================================

    function startNewChat() {

        const chat = createNewChat();

        conversations.unshift(chat);

        activeChatId = chat.id;

        saveChats();

        renderEverything();

        closeSidebar();

        elements.input?.focus();
    }

    elements.newChat?.addEventListener(
        "click",
        startNewChat
    );

    // =========================================
    // 13. CLEAR CONVERSATION
    // =========================================

    elements.clear?.addEventListener("click", () => {

        const chat = getActiveChat();

        if (!chat || chat.messages.length === 0) return;

        if (!confirm(
            "Clear all messages in this conversation?"
        )) return;

        chat.messages = [];
        chat.title = "New conversation";
        chat.updatedAt = Date.now();

        saveChats();

        renderEverything();
    });

    // =========================================
    // 14. MOBILE SIDEBAR
    // =========================================

    function openSidebar() {

        elements.sidebar?.classList.add("open");

        elements.overlay?.classList.add("active");

    }

    function closeSidebar() {

        elements.sidebar?.classList.remove("open");

        elements.overlay?.classList.remove("active");

    }

    elements.menu?.addEventListener(
        "click",
        openSidebar
    );

    elements.closeSidebar?.addEventListener(
        "click",
        closeSidebar
    );

    elements.overlay?.addEventListener(
        "click",
        closeSidebar
    );

    // =========================================
    // 15. MODE BUTTONS
    // =========================================

    document.querySelectorAll("[data-coach-mode]")
        .forEach(button => {

            button.addEventListener("click", () => {

                selectMode(button.dataset.coachMode);

                closeSidebar();

            });

        });

    // =========================================
    // 16. LIGHT AND DARK THEMES
    // =========================================

    function applyTheme(theme) {

        const light = theme === "light";

        document.body.classList.toggle(
            "light-theme",
            light
        );

        localStorage.setItem(
            THEME_STORAGE,
            light ? "light" : "dark"
        );

        if (elements.theme) {

            const icon = light ? "moon" : "sun";

            elements.theme.innerHTML =
                `<i data-lucide="${icon}"></i>`;

            elements.theme.setAttribute(
                "aria-label",
                light
                    ? "Switch to dark theme"
                    : "Switch to light theme"
            );

            refreshIcons();
        }
    }

    elements.theme?.addEventListener("click", () => {

        const currentlyLight =
            document.body.classList.contains("light-theme");

        applyTheme(currentlyLight ? "dark" : "light");

    });

    // =========================================
    // 17. SUBSCRIPTION DISPLAY
    // =========================================

    function updateAccessNotice() {

        if (elements.plan) {
            elements.plan.textContent =
                "Subscription verification pending";
        }

        if (elements.access) {
            elements.access.textContent =
                "Secure AI connection not active";
        }

        if (elements.creditDescription) {
            elements.creditDescription.textContent =
                "AI credit information will appear when connected.";
        }

        if (elements.creditCount) {
            elements.creditCount.textContent = "--";
        }
    }

    // =========================================
    // 18. RENDER EVERYTHING
    // =========================================

    function renderEverything() {

        renderMessages();

        renderHistory();

        updateModes();

        updateSuggestions();

        updateSendButton();

    }

    // =========================================
    // 19. INITIALIZE
    // =========================================

    loadChats();

    const savedTheme =
        localStorage.getItem(THEME_STORAGE) || "dark";

    applyTheme(savedTheme);

    updateAccessNotice();

    renderEverything();

    resizeInput();

    refreshIcons();

    window.addEventListener("lifetrack:ready", () => {
        updateAccessNotice();
    });

});
               
