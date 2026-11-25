
/* ==========================================
   LIFETRACK AI COACH V2
   Conversation and interface controller
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    // ======================================
    // ELEMENTS
    // ======================================

    const elements = {
        sidebar: document.getElementById("coachSidebar"),
        overlay: document.getElementById("sidebarOverlay"),
        menuButton: document.getElementById("coachMenuToggle"),
        closeSidebar: document.getElementById("sidebarCloseButton"),

        newChatButton: document.getElementById("newChatButton"),
        historyList: document.getElementById("chatHistoryList"),

        chatMessages: document.getElementById("chatMessages"),
        suggestions: document.getElementById("coachSuggestions"),

        form: document.getElementById("coachChatForm"),
        input: document.getElementById("coachMessage"),
        sendButton: document.getElementById("coachSendButton"),

        typing: document.getElementById("typingIndicator"),

        themeButton: document.getElementById("themeToggle"),
        clearButton: document.getElementById("clearChatButton"),

        planName: document.getElementById("coachPlanName"),
        accessStatus: document.getElementById("coachAccessStatus"),
        creditDescription: document.getElementById("coachCreditDescription"),
        creditCount: document.getElementById("coachCreditCount")
    };

    // ======================================
    // STORAGE
    // ======================================

    const CHAT_STORAGE = "lifetrack_coach_v2_chats";
    const THEME_STORAGE = "lifetrack_coach_v2_theme";

    let chats = [];
    let activeChatId = null;

    // ======================================
    // HELPERS
    // ======================================

    function createId() {
        return Date.now().toString(36) +
            Math.random().toString(36).slice(2, 8);
    }

    function saveChats() {
        try {
            localStorage.setItem(
                CHAT_STORAGE,
                JSON.stringify(chats)
            );
        } catch (error) {
            console.error("Could not save conversations:", error);
        }
    }

    function getActiveChat() {
        return chats.find(chat => chat.id === activeChatId);
    }

    function loadChats() {
        try {
            const saved = localStorage.getItem(CHAT_STORAGE);
            const parsed = saved ? JSON.parse(saved) : [];

            chats = Array.isArray(parsed)
                ? parsed.filter(chat =>
                    chat &&
                    typeof chat.id === "string" &&
                    Array.isArray(chat.messages)
                )
                : [];

            // Preserve compatibility with earlier saved chats.
            chats.forEach(chat => {
                if (typeof chat.showSuggestions !== "boolean") {
                    chat.showSuggestions = chat.messages.length === 0;
                }
            });

        } catch (error) {
            console.error("Could not load conversations:", error);
            chats = [];
        }
    }

    // ======================================
    // CONVERSATION CREATION
    // ======================================

    function createNewConversation() {

        const chat = {
            id: createId(),
            title: "New conversation",
            messages: [],
            mode: "general",
            showSuggestions: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        chats.unshift(chat);

        activeChatId = chat.id;

        saveChats();

        renderHistory();
        renderMessages();
        updateSuggestions();

        closeSidebar();

        if (elements.input) {
            elements.input.value = "";
            elements.input.style.height = "auto";
        }

        return chat;
    }

    // ======================================
    // CONVERSATION TITLES
    // ======================================

    function updateChatTitle(chat) {

        if (!chat || chat.messages.length === 0) {
            return;
        }

        const firstMessage = chat.messages.find(
            message => message.role === "user"
        );

        if (!firstMessage) return;

        const title = firstMessage.content
            .replace(/\s+/g, " ")
            .trim();

        chat.title = title.length > 42
            ? title.slice(0, 42) + "..."
            : title;
    }

    // ======================================
    // HISTORY
    // ======================================

    function renderHistory() {

        if (!elements.historyList) return;

        elements.historyList.innerHTML = "";

        if (chats.length === 0) {

            const empty = document.createElement("div");
            empty.className = "history-empty";
            empty.textContent =
                "Your conversations will appear here.";

            elements.historyList.appendChild(empty);
            return;
        }

        chats.forEach(chat => {

            const button = document.createElement("button");

            button.type = "button";
            button.className = "history-item";

            if (chat.id === activeChatId) {
                button.classList.add("active");
            }

            button.textContent = chat.title || "New conversation";
            button.title = chat.title || "New conversation";

            button.addEventListener("click", () => {
                openConversation(chat.id);
            });

            elements.historyList.appendChild(button);
        });
    }

    // ======================================
    // OPEN EXISTING CONVERSATION
    // ======================================

    function openConversation(id) {

        const chat = chats.find(item => item.id === id);

        if (!chat) return;

        activeChatId = id;

        saveChats();

        renderHistory();
        renderMessages();
        updateSuggestions();

        closeSidebar();

        if (elements.input) {
            elements.input.value = "";
            elements.input.style.height = "auto";
        }
    }

    // ======================================
    // RENDER MESSAGES
    // ======================================

    function renderMessages() {

        if (!elements.chatMessages) return;

        const chat = getActiveChat();

        elements.chatMessages.innerHTML = "";

        if (!chat) return;

        if (chat.messages.length === 0) {

            const welcome = document.createElement("div");

            welcome.className = "welcome-message";

            const heading = document.createElement("h2");
            heading.textContent = "Your growth starts here.";

            const paragraph = document.createElement("p");
            paragraph.textContent =
                "I'm here to help you build better habits, " +
                "understand your emotions, and make progress " +
                "toward your goals.";

            welcome.appendChild(heading);
            welcome.appendChild(paragraph);

            elements.chatMessages.appendChild(welcome);

        } else {

            chat.messages.forEach(message => {

                const messageRow = document.createElement("div");

                messageRow.className =
                    message.role === "user"
                        ? "message user"
                        : "message assistant";

                const content = document.createElement("div");

                content.className = "message-content";

                // Safe text rendering.
                content.textContent = message.content;

                messageRow.appendChild(content);

                elements.chatMessages.appendChild(messageRow);
            });
        }

        scrollToBottom();
    }

    function scrollToBottom() {

        if (!elements.chatMessages) return;

        requestAnimationFrame(() => {
            elements.chatMessages.scrollTop =
                elements.chatMessages.scrollHeight;
        });
    }

    // ======================================
    // SUGGESTION VISIBILITY
    // ======================================

    function updateSuggestions() {

        if (!elements.suggestions) return;

        const chat = getActiveChat();

        const shouldShow =
            chat &&
            chat.showSuggestions === true &&
            chat.messages.length === 0;

        elements.suggestions.classList.toggle(
            "suggestions-hidden",
            !shouldShow
        );
    }

    function hideSuggestions() {

        const chat = getActiveChat();

        if (!chat || !chat.showSuggestions) return;

        chat.showSuggestions = false;

        saveChats();

        updateSuggestions();
    }

    // ======================================
    // MESSAGE CREATION
    // ======================================

    function addMessage(role, content) {

        const chat = getActiveChat();

        if (!chat) return;

        chat.messages.push({
            role,
            content,
            createdAt: Date.now()
        });

        chat.updatedAt = Date.now();

        // Once a conversation has a message,
        // suggestions must remain hidden.
        chat.showSuggestions = false;

        updateChatTitle(chat);

        saveChats();

        renderMessages();
        renderHistory();
        updateSuggestions();
    }

    // ======================================
    // SEND MESSAGE
    // ======================================

    function sendMessage(content) {

        const message = content.trim();

        if (!message) return;

        const chat = getActiveChat();

        if (!chat) return;

        hideSuggestions();

        addMessage("user", message);

        elements.input.value = "";
        elements.input.style.height = "auto";

        elements.sendButton.disabled = true;

        // No real AI connection yet.
        // This notice does not consume credits.

        showTyping(true);

        setTimeout(() => {

            showTyping(false);

            addMessage(
                "assistant",
                "Your message has been saved in this conversation. " +
                "The secure AI service is not connected yet, so I " +
                "can't generate a real AI response at the moment. " +
                "No AI question credits have been used."
            );

            elements.sendButton.disabled = false;

            elements.input.focus();

        }, 700);
    }

    // ======================================
    // TYPING INDICATOR
    // ======================================

    function showTyping(show) {

        if (!elements.typing) return;

        elements.typing.hidden = !show;
    }

    // ======================================
    // SUGGESTION BUTTONS
    // ======================================

    document.querySelectorAll("[data-coach-prompt]")
        .forEach(button => {

            button.addEventListener("click", () => {

                const prompt = button.dataset.coachPrompt;

                if (!prompt || !elements.input) return;

                hideSuggestions();

                elements.input.value = prompt;

                resizeInput();

                sendMessage(prompt);
            });
        });

    // ======================================
    // INPUT BEHAVIOR
    // ======================================

    function resizeInput() {

        if (!elements.input) return;

        elements.input.style.height = "auto";

        elements.input.style.height =
            Math.min(elements.input.scrollHeight, 110) + "px";
    }

    if (elements.input) {

        // Hide suggestions immediately when the
        // user chooses to type independently.
        elements.input.addEventListener("focus", () => {
            hideSuggestions();
        });

        elements.input.addEventListener("click", () => {
            hideSuggestions();
        });

        elements.input.addEventListener("input", () => {

            hideSuggestions();

            resizeInput();
        });

        elements.input.addEventListener("keydown", event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {
                event.preventDefault();

                if (elements.form.requestSubmit) {
                    elements.form.requestSubmit();
                } else {
                    sendMessage(elements.input.value);
                }
            }
        });
    }

    // ======================================
    // FORM SUBMISSION
    // ======================================

    if (elements.form) {

        elements.form.addEventListener("submit", event => {

            event.preventDefault();

            if (elements.sendButton.disabled) return;

            sendMessage(elements.input.value);
        });
    }

    // ======================================
    // NEW CONVERSATION BUTTON
    // ======================================

    if (elements.newChatButton) {

        elements.newChatButton.addEventListener("click", () => {
            createNewConversation();
        });
    }

    // ======================================
    // COACHING MODES
    // ======================================

    document.querySelectorAll("[data-coach-mode]")
        .forEach(button => {

            button.addEventListener("click", () => {

                const chat = getActiveChat();

                if (!chat) return;

                const mode = button.dataset.coachMode;

                chat.mode = mode;

                saveChats();

                document.querySelectorAll("[data-coach-mode]")
                    .forEach(item => {
                        item.classList.toggle(
                            "active",
                            item === button
                        );
                    });

                // Selecting a mode is a conversation choice,
                // not a sent message. Suggestions remain visible
                // until the user focuses the message input.
            });
        });

    function restoreMode() {

        const chat = getActiveChat();

        if (!chat) return;

        document.querySelectorAll("[data-coach-mode]")
            .forEach(button => {

                button.classList.toggle(
                    "active",
                    button.dataset.coachMode === chat.mode
                );
            });
    }

    // ======================================
    // MOBILE SIDEBAR
    // ======================================

    function openSidebar() {

        elements.sidebar?.classList.add("sidebar-open");
        elements.overlay?.classList.add("active");
    }

    function closeSidebar() {

        elements.sidebar?.classList.remove("sidebar-open");
        elements.overlay?.classList.remove("active");
    }

    elements.menuButton?.addEventListener(
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

    // ======================================
    // CLEAR CURRENT CONVERSATION
    // ======================================

    if (elements.clearButton) {

        elements.clearButton.addEventListener("click", () => {

            const chat = getActiveChat();

            if (!chat) return;

            const confirmed = confirm(
                "Clear all messages in this conversation?"
            );

            if (!confirmed) return;

            chat.messages = [];

            // Clearing an existing conversation does not
            // count as starting a new one.
            chat.showSuggestions = false;
            chat.title = "Cleared conversation";

            saveChats();

            renderMessages();
            renderHistory();
            updateSuggestions();
        });
    }

    // ======================================
    // THEME
    // ======================================

    function applyTheme(theme) {

        document.body.classList.toggle(
            "light-theme",
            theme === "light"
        );

        try {
            localStorage.setItem(THEME_STORAGE, theme);
        } catch (error) {
            console.error("Could not save theme:", error);
        }

        if (elements.themeButton) {

            elements.themeButton.innerHTML =
                theme === "light"
                    ? '<i data-lucide="moon"></i>'
                    : '<i data-lucide="sun"></i>';

            refreshIcons();
        }
    }

    function refreshIcons() {

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    if (elements.themeButton) {

        elements.themeButton.addEventListener("click", () => {

            const isLight =
                document.body.classList.contains("light-theme");

            applyTheme(isLight ? "dark" : "light");
        });
    }

    // ======================================
    // ACCESS PLACEHOLDERS
    // ======================================

    function updateAccessNotice() {

        if (elements.planName) {
            elements.planName.textContent =
                "Subscription verification pending";
        }

        if (elements.accessStatus) {
            elements.accessStatus.textContent =
                "Secure AI connection not active";
        }

        if (elements.creditDescription) {
            elements.creditDescription.textContent =
                "Credit balance will appear after verification.";
        }

        if (elements.creditCount) {
            elements.creditCount.textContent = "--";
        }
    }

    // ======================================
    // INITIALIZE
    // ======================================

    loadChats();

    if (chats.length > 0) {

        // Restore the latest conversation.
        activeChatId = chats[0].id;

    } else {

        // First visit: create a new conversation.
        createNewConversation();
    }

    if (!activeChatId) {
        createNewConversation();
    }

    renderHistory();
    renderMessages();
    updateSuggestions();
    restoreMode();

    updateAccessNotice();

    const savedTheme = (() => {
        try {
            return localStorage.getItem(THEME_STORAGE);
        } catch (error) {
            return null;
        }
    })();

    applyTheme(savedTheme === "light" ? "light" : "dark");

    refreshIcons();

});
       
