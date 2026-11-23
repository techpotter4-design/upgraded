
/* =========================================
   LIFETRACK AI COACH
   FRONTEND INTERACTIONS
========================================= */

document.addEventListener("DOMContentLoaded", function () {

    // =====================================
    // ELEMENTS
    // =====================================

    const chatForm = document.getElementById("coachChatForm");
    const messageInput = document.getElementById("coachMessage");
    const chatMessages = document.getElementById("chatMessages");

    const sendButton = document.getElementById("coachSendButton");
    const newChatButton = document.getElementById("newChatButton");
    const clearChatButton = document.getElementById("clearChatButton");

    const menuToggle = document.getElementById("coachMenuToggle");
    const sidebar = document.getElementById("coachSidebar");

    const suggestionButtons = document.querySelectorAll("[data-coach-prompt]");
    const navigationLinks = document.querySelectorAll("[data-coach-mode]");

    // =====================================
    // COACH STATE
    // =====================================

    let currentMode = "general";
    let conversationStarted = false;

    // =====================================
    // ICON REFRESH
    // =====================================

    function refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // =====================================
    // TIME
    // =====================================

    function getCurrentTime() {
        return new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    // =====================================
    // CREATE MESSAGE
    // =====================================

    function addMessage(message, sender) {

        if (!chatMessages) return;

        const messageWrapper = document.createElement("div");

        messageWrapper.className =
            sender === "user"
                ? "coach-message user-message"
                : "coach-message assistant-message";

        const avatar = document.createElement("div");
        avatar.className = "message-avatar";

        const icon = document.createElement("i");

        icon.setAttribute(
            "data-lucide",
            sender === "user" ? "user" : "brain-circuit"
        );

        avatar.appendChild(icon);

        const content = document.createElement("div");
        content.className = "message-content";

        const paragraph = document.createElement("p");
        paragraph.textContent = message;

        const time = document.createElement("span");
        time.className = "message-time";

        time.textContent = getCurrentTime();

        content.appendChild(paragraph);
        content.appendChild(time);

        messageWrapper.appendChild(avatar);
        messageWrapper.appendChild(content);

        chatMessages.appendChild(messageWrapper);

        chatMessages.scrollTop = chatMessages.scrollHeight;

        refreshIcons();

    }

    // =====================================
    // WELCOME MESSAGE
    // =====================================

    function showWelcomeMessage() {

        if (!chatMessages) return;

        chatMessages.innerHTML = "";

        const welcome = document.createElement("div");

        welcome.className = "coach-message assistant-message";

        welcome.innerHTML = `
            <div class="message-avatar">
                <i data-lucide="brain-circuit"></i>
            </div>

            <div class="message-content">
                <p>
                    Welcome back to your LifeTrack AI Coach.
                    What would you like to work on today?
                    We can explore your habits, mood, goals
                    or daily routine together.
                </p>

                <span class="message-time">Your coach</span>
            </div>
        `;

        chatMessages.appendChild(welcome);

        conversationStarted = false;

        refreshIcons();

    }

    // =====================================
    // TEMPORARY AI CONNECTION NOTICE
    // =====================================

    function showConnectionNotice() {

        addMessage(
            "Your message has been added to this conversation. The secure AI service has not been connected yet. We will connect the AI backend in the next development stage.",
            "assistant"
        );

    }

    // =====================================
    // SEND MESSAGE
    // =====================================

    function sendMessage(message) {

        if (!message || !message.trim()) return;

        const cleanMessage = message.trim();

        if (cleanMessage.length > 3000) {
            alert("Please keep your message below 3,000 characters.");
            return;
        }

        addMessage(cleanMessage, "user");

        conversationStarted = true;

        if (messageInput) {
            messageInput.value = "";
            messageInput.focus();
        }

        if (sendButton) {
            sendButton.disabled = true;
        }

        showConnectionNotice();

        if (sendButton) {
            sendButton.disabled = false;
        }

    }

    // =====================================
    // CHAT FORM
    // =====================================

    if (chatForm) {

        chatForm.addEventListener("submit", function (event) {

            event.preventDefault();

            if (!messageInput) return;

            sendMessage(messageInput.value);

        });

    }

    // =====================================
    // ENTER TO SEND
    // SHIFT + ENTER FOR NEW LINE
    // =====================================

    if (messageInput) {

        messageInput.addEventListener("keydown", function (event) {

            if (event.key === "Enter" && !event.shiftKey) {

                event.preventDefault();

                if (chatForm) {
                    chatForm.requestSubmit();
                }

            }

        });

    }

    // =====================================
    // SUGGESTED PROMPTS
    // =====================================

    suggestionButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            const prompt = button.getAttribute("data-coach-prompt");

            if (prompt) {
                sendMessage(prompt);
            }

        });

    });

    // =====================================
    // NEW CONVERSATION
    // =====================================

    if (newChatButton) {

        newChatButton.addEventListener("click", function () {

            showWelcomeMessage();

            if (messageInput) {
                messageInput.value = "";
                messageInput.focus();
            }

            if (sidebar) {
                sidebar.classList.remove("open");
            }

        });

    }

    // =====================================
    // CLEAR CHAT
    // =====================================

    if (clearChatButton) {

        clearChatButton.addEventListener("click", function () {

            const confirmed = confirm(
                "Are you sure you want to clear this conversation?"
            );

            if (!confirmed) return;

            showWelcomeMessage();

        });

    }

    // =====================================
    // COACHING MODES
    // =====================================

    const modeMessages = {
        general: "You are now in general AI coaching mode. What would you like to discuss?",
        habits: "Let's focus on your habits. Which routine would you like to improve?",
        mood: "Let's take a moment to reflect. How have you been feeling recently?",
        goals: "Let's work on your goals. What would you like to achieve?",
        routine: "Let's organise your day. What does your current daily routine look like?"
    };

    navigationLinks.forEach(function (link) {

        link.addEventListener("click", function () {

            currentMode = link.getAttribute("data-coach-mode") || "general";

            navigationLinks.forEach(function (item) {
                item.classList.remove("active");
            });

            link.classList.add("active");

            if (sidebar) {
                sidebar.classList.remove("open");
            }

            if (messageInput) {
                messageInput.placeholder =
                    "Ask your " + currentMode + " coach...";
            }

            addMessage(modeMessages[currentMode], "assistant");

        });

    });

    // =====================================
    // MOBILE SIDEBAR
    // =====================================

    if (menuToggle && sidebar) {

        menuToggle.addEventListener("click", function () {

            sidebar.classList.toggle("open");

        });

    }

    // =====================================
    // CLOSE SIDEBAR WHEN CLICKING OUTSIDE
    // =====================================

    document.addEventListener("click", function (event) {

        if (!sidebar || !menuToggle) return;

        const clickedInsideSidebar = sidebar.contains(event.target);
        const clickedMenuButton = menuToggle.contains(event.target);

        if (
            window.innerWidth <= 760 &&
            !clickedInsideSidebar &&
            !clickedMenuButton
        ) {
            sidebar.classList.remove("open");
        }

    });

    // =====================================
    // INITIALISE
    // =====================================

    showWelcomeMessage();

    console.log("LifeTrack AI Coach interface initialized.");

});
