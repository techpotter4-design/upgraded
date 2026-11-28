
/* ==========================================
   LIFETRACK AI COACH V3
   Supabase + Gemini connection
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

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

    const CHAT_STORAGE = "lifetrack_coach_v2_chats";
    const THEME_STORAGE = "lifetrack_coach_v2_theme";

    let chats = [];
    let activeChatId = null;
    let sending = false;

    // ======================================
    // HELPERS
    // ======================================

    function createId() {
        return Date.now().toString(36) +
            Math.random().toString(36).slice(2, 8);
    }

    function createRequestId() {
        if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }

        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
            .replace(/[xy]/g, character => {
                const random = Math.random() * 16 | 0;
                const value = character === "x"
                    ? random
                    : (random & 3 | 8);

                return value.toString(16);
            });
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

    function getChatById(id) {
        return chats.find(chat => chat.id === id);
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

            chats.forEach(chat => {
                if (typeof chat.showSuggestions !== "boolean") {
                    chat.showSuggestions =
                        chat.messages.length === 0;
                }

                if (!chat.mode) {
                    chat.mode = "general";
                }
            });

        } catch (error) {
            console.error("Could not load conversations:", error);
            chats = [];
        }
    }

    // ======================================
    // CONVERSATIONS
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
        restoreMode();
        closeSidebar();

        if (elements.input) {
            elements.input.value = "";
            elements.input.style.height = "auto";
        }

        return chat;
    }

    function openConversation(id) {
        const chat = getChatById(id);
        if (!chat) return;

        activeChatId = id;

        saveChats();
        renderHistory();
        renderMessages();
        updateSuggestions();
        restoreMode();
        closeSidebar();

        if (elements.input) {
            elements.input.value = "";
            elements.input.style.height = "auto";
        }
    }

    function updateChatTitle(chat) {
        if (!chat || chat.messages.length === 0) return;

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

            button.textContent =
                chat.title || "New conversation";

            button.title = chat.title || "New conversation";

            button.addEventListener("click", () => {
                openConversation(chat.id);
            });

            elements.historyList.appendChild(button);
        });
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
                const row = document.createElement("div");

                row.className =
                    message.role === "user"
                        ? "message user"
                        : "message assistant";

                const content = document.createElement("div");
                content.className = "message-content";
                content.textContent = message.content;

                row.appendChild(content);
                elements.chatMessages.appendChild(row);
            });
        }

        scrollToBottom();
    }

    function addMessageToChat(chatId, role, content) {
        const chat = getChatById(chatId);
        if (!chat) return;

        chat.messages.push({
            role,
            content,
            createdAt: Date.now()
        });

        chat.updatedAt = Date.now();
        chat.showSuggestions = false;

        updateChatTitle(chat);
        saveChats();

        if (activeChatId === chatId) {
            renderMessages();
            updateSuggestions();
        }

        renderHistory();
    }

    function scrollToBottom() {
        if (!elements.chatMessages) return;

        requestAnimationFrame(() => {
            elements.chatMessages.scrollTop =
                elements.chatMessages.scrollHeight;
        });
    }

    // ======================================
    // SUGGESTIONS
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
    // GEMINI CONNECTION
    // ======================================

    async function requestAIResponse(chatId) {
        const client = window.lifeTrackSupabase;

        if (!client || !client.functions) {
            throw new Error(
                "LifeTrack could not connect to Supabase. " +
                "Please refresh the page and try again."
            );
        }

        const chat = getChatById(chatId);

        if (!chat) {
            throw new Error("Conversation not found.");
        }

        const messages = chat.messages
            .filter(message =>
                ["user", "assistant"].includes(message.role) &&
                typeof message.content === "string"
            )
            .slice(-12)
            .map(message => ({
                role: message.role,
                content: message.content
            }));

        const requestId = createRequestId();

        const { data, error } = await client.functions.invoke(
            "hyper-endpoint",
            {
                body: {
                    requestId,
                    mode: chat.mode || "general",
                    messages
                }
            }
        );

        if (error) {
            console.error("AI function error:", error);

            let message =
                "The AI service could not complete your request.";

            try {
                if (error.context &&
                    typeof error.context.json === "function") {
                    const details = await error.context.json();

                    if (details && details.error) {
                        message = details.error;
                    }
                }
            } catch (_) {
                // Keep the general error message.
            }

            throw new Error(message);
        }

        if (
    !data ||
    data.success !== true ||
    typeof data.reply !== "string" ||
    !data.reply.trim()
) {
    throw new Error(
        data && data.error
            ? data.error
            : "The AI Coach returned an invalid response."
    );
}

return data.reply.trim();

   
    // ======================================
    // CHAT SENDING
    // ======================================

    async function sendMessage(message) {
        const chat = getActiveChat();

        if (!chat || sending || !message.trim()) return;

        const userMessage = message.trim();

        if (userMessage.length > 2000) {
            alert("Please keep your message under 2,000 characters.");
            return;
        }

        sending = true;

        if (elements.sendButton) {
            elements.sendButton.disabled = true;
        }

        if (elements.input) {
            elements.input.disabled = true;
        }

        hideSuggestions();

        addMessageToChat(
            chat.id,
            "user",
            userMessage
        );

        if (elements.typing) {
            elements.typing.hidden = false;
        }

        scrollToBottom();

        try {
            const answer = await requestAIResponse(chat.id);

            addMessageToChat(
                chat.id,
                "assistant",
                answer
            );

        } catch (error) {
            console.error("LifeTrack AI Coach:", error);

            addMessageToChat(
                chat.id,
                "assistant",
                error.message ||
                "Something went wrong. Please try again."
            );

        } finally {
            sending = false;

            if (elements.sendButton) {
                elements.sendButton.disabled = false;
            }

            if (elements.input) {
                elements.input.disabled = false;
                elements.input.focus();
            }

            if (elements.typing) {
                elements.typing.hidden = true;
            }
        }
    }

    // ======================================
    // CHAT FORM
    // ======================================

    if (elements.form) {
        elements.form.addEventListener("submit", event => {
            event.preventDefault();

            if (!elements.input) return;

            const message = elements.input.value.trim();

            if (!message) return;

            elements.input.value = "";
            elements.input.style.height = "auto";

            sendMessage(message);
        });
    }

    // ======================================
    // SUGGESTION BUTTONS
    // ======================================

    if (elements.suggestions) {
        elements.suggestions.addEventListener("click", event => {
            const button = event.target.closest(
                "[data-prompt], button"
            );

            if (!button) return;

            const prompt =
                button.dataset.prompt ||
                button.textContent.trim();

            if (prompt) {
                if (!getActiveChat()) {
                    createNewConversation();
                }

                if (elements.input) {
                    elements.input.value = "";
                }

                sendMessage(prompt);
            }
        });
    }

    // ======================================
    // NEW CONVERSATION
    // ======================================

    if (elements.newChatButton) {
        elements.newChatButton.addEventListener(
            "click",
            () => {
                if (sending) return;
                createNewConversation();
            }
        );
    }

    // ======================================
    // SIDEBAR
    // ======================================

    function closeSidebar() {
        if (elements.sidebar) {
            elements.sidebar.classList.remove("active");
        }

        if (elements.overlay) {
            elements.overlay.classList.remove("active");
        }

        document.body.classList.remove("sidebar-open");
    }

    function openSidebar() {
        if (elements.sidebar) {
            elements.sidebar.classList.add("active");
        }

        if (elements.overlay) {
            elements.overlay.classList.add("active");
        }

        document.body.classList.add("sidebar-open");
    }

    if (elements.menuButton) {
        elements.menuButton.addEventListener(
            "click",
            openSidebar
        );
    }

    if (elements.closeSidebar) {
        elements.closeSidebar.addEventListener(
            "click",
            closeSidebar
        );
    }

    if (elements.overlay) {
        elements.overlay.addEventListener(
            "click",
            closeSidebar
        );
    }

    // ======================================
    // CLEAR CURRENT CONVERSATION
    // ======================================

    if (elements.clearButton) {
        elements.clearButton.addEventListener("click", () => {
            if (sending) return;

            const chat = getActiveChat();

            if (!chat) return;

            const confirmed = confirm(
                "Clear this conversation? This cannot be undone."
            );

            if (!confirmed) return;

            chat.messages = [];
            chat.title = "New conversation";
            chat.showSuggestions = true;
            chat.updatedAt = Date.now();

            saveChats();
            renderHistory();
            renderMessages();
            updateSuggestions();
        });
    }

    // ======================================
    // THEME
    // ======================================

    function applyTheme(theme) {
        const selectedTheme =
            theme === "light" ? "light" : "dark";

        document.documentElement.setAttribute(
            "data-theme",
            selectedTheme
        );

        localStorage.setItem(
            THEME_STORAGE,
            selectedTheme
        );
    }

    if (elements.themeButton) {
        elements.themeButton.addEventListener("click", () => {
            const currentTheme =
                document.documentElement.getAttribute(
                    "data-theme"
                ) || "dark";

            applyTheme(
                currentTheme === "dark" ? "light" : "dark"
            );
        });
    }

    // ======================================
    // MODE
    // ======================================

    function restoreMode() {
        const chat = getActiveChat();

        if (!chat) return;

        const modeButtons = document.querySelectorAll(
            "[data-coach-mode]"
        );

        modeButtons.forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.coachMode === chat.mode
            );
        });
    }

    document.addEventListener("click", event => {
        const button = event.target.closest(
            "[data-coach-mode]"
        );

        if (!button) return;

        const chat = getActiveChat();

        if (!chat || sending) return;

        const selectedMode = button.dataset.coachMode;

        const allowedModes = [
            "general",
            "habits",
            "mood",
            "goals",
           "routine"
        ];

        if (!allowedModes.includes(selectedMode)) return;

        chat.mode = selectedMode;

        saveChats();
        restoreMode();
    });

    // ======================================
    // INPUT BEHAVIOR
    // ======================================

    if (elements.input) {
        elements.input.addEventListener("input", () => {
            elements.input.style.height = "auto";

            elements.input.style.height =
                Math.min(elements.input.scrollHeight, 140) + "px";
        });

        elements.input.addEventListener("keydown", event => {
            if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.isComposing
            ) {
                event.preventDefault();

                if (elements.form) {
                    elements.form.requestSubmit();
                }
            }
        });
    }

    // ======================================
    // INITIALIZATION
    // ======================================

    function initializeCoach() {
        loadChats();

        if (chats.length === 0) {
            createNewConversation();
        } else {
            activeChatId = chats[0].id;

            renderHistory();
            renderMessages();
            updateSuggestions();
            restoreMode();
        }

        const savedTheme =
            localStorage.getItem(THEME_STORAGE) || "dark";

        applyTheme(savedTheme);

        if (elements.typing) {
            elements.typing.hidden = true;
        }

        console.log("LifeTrack AI Coach V3 initialized.");
    }
       initializeCoach();

    // Render Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    } else {
        console.error("LifeTrack: Lucide icons failed to load.");
    }

});
           
