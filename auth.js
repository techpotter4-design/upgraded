
/* =========================================
   LIFETRACK AUTHENTICATION SYSTEM
   Version 2.0

   FEATURES:
   - User Registration
   - User Login
   - Password Visibility
   - Password Recovery
   - Resend Reset Link
   - Resend Countdown
   - Admin Authentication
   - Subscription Verification
   - Dashboard Redirection
   - Payment Redirection
   - Error Handling
========================================= */

(() => {
    "use strict";

    // =====================================
    // CONFIGURATION
    // =====================================

    const supabaseClient = window.lifeTrackSupabase;

    const BASE_URL = "https://upgraded-seven.vercel.app";

    const ROUTES = {
        home: `${BASE_URL}/index.html`,
        auth: `${BASE_URL}/auth.html`,
        admin: `${BASE_URL}/admin.html`,
        dashboard: `${BASE_URL}/dashboard.html`,
        payment: `${BASE_URL}/payment.html`,
        recovery: `${BASE_URL}/forgot-password.html`
    };

    // =====================================
    // DOM ELEMENTS
    // =====================================

    const $ = id => document.getElementById(id);

    const loginForm = $("loginForm");
    const registerForm = $("registerForm");
    const resetPasswordForm = $("resetPasswordForm");

    const loginEmail = $("loginEmail");
    const loginPassword = $("loginPassword");

    const fullName = $("fullName");
    const registerEmail = $("registerEmail");
    const registerPassword = $("registerPassword");
    const confirmPassword = $("confirmPassword");

    const acceptTerms = $("acceptTerms");

    const resetEmail = $("resetEmail");

    const authMessage = $("authMessage");
    const resetMessage = $("resetMessage");

    const formTitle = $("formTitle");
    const formDescription = $("formDescription");

    const switchText = $("switchText");
    const switchContainer = $("switchContainer");

    const forgotPasswordLink = $("forgotPasswordLink");
    const backToLogin = $("backToLogin");

    const sendResetButton = $("sendResetLink");
    const resendResetButton = $("resendResetLink");
    const resendCountdown = $("resendCountdown");

    // =====================================
    // APPLICATION STATE
    // =====================================

    let recoveryEmailSent = false;
    let resendTimer = null;
    let resendSeconds = 60;

    // =====================================
    // MESSAGE HANDLING
    // =====================================

    function showMessage(message, success = false) {

        if (!authMessage) return;

        authMessage.textContent = message;

        authMessage.style.color = success
            ? "#267548"
            : "#c0392b";
    }

    function showResetMessage(message, success = false) {

        if (!resetMessage) return;

        resetMessage.textContent = message;

        resetMessage.style.color = success
            ? "#267548"
            : "#c0392b";
    }

    function clearMessages() {

        if (authMessage) authMessage.textContent = "";
        if (resetMessage) resetMessage.textContent = "";
        if (resendCountdown) resendCountdown.textContent = "";
    }

    // =====================================
    // BUTTON LOADING
    // =====================================

    function setLoading(button, state, loadingText, normalText) {

        if (!button) return;

        button.disabled = state;

        button.textContent = state
            ? loadingText
            : normalText;
    }

    // =====================================
    // FORM SWITCHING
    // =====================================

    function displayForm(type = "login") {

        [loginForm, registerForm, resetPasswordForm].forEach(form => {

            if (form) {
                form.classList.add("hidden");
            }

        });

        clearMessages();

        if (type === "register") {

            registerForm.classList.remove("hidden");

            formTitle.textContent = "Create Account";

            formDescription.textContent =
                "Start building better habits with LifeTrack.";

            switchContainer.hidden = false;

            switchText.replaceChildren(
                document.createTextNode(
                    "Already have an account? "
                )
            );

            const button = document.createElement("button");

            button.type = "button";
            button.textContent = "Login";

            button.addEventListener("click", () => {
                displayForm("login");
            });

            switchText.appendChild(button);

            return;
        }

        if (type === "reset") {

            resetPasswordForm.classList.remove("hidden");

            formTitle.textContent = "Reset Password";

            formDescription.textContent =
                "Enter your email to receive a password reset link.";

            switchContainer.hidden = true;

            if (sendResetButton) {
                sendResetButton.hidden = recoveryEmailSent;
            }

            if (resendResetButton) {
                resendResetButton.hidden = !recoveryEmailSent;
                resendResetButton.disabled = recoveryEmailSent;
            }

            return;
        }

        loginForm.classList.remove("hidden");

        formTitle.textContent = "Welcome Back";

        formDescription.textContent =
            "Login to continue your personal growth journey.";

        switchContainer.hidden = false;

        switchText.replaceChildren(
            document.createTextNode(
                "Don't have an account? "
            )
        );

        const button = document.createElement("button");

        button.type = "button";
        button.textContent = "Create Account";

        button.addEventListener("click", () => {
            displayForm("register");
        });

        switchText.appendChild(button);
    }

    // =====================================
    // PASSWORD VISIBILITY
    // =====================================

    function initializePasswordVisibility() {

        document.querySelectorAll(".show-password").forEach(button => {

            button.addEventListener("click", () => {

                const input = $(button.dataset.target);

                if (!input) return;

                const isHidden = input.type === "password";

                input.type = isHidden ? "text" : "password";

                button.textContent = isHidden ? "Hide" : "Show";

                button.setAttribute(
                    "aria-pressed",
                    String(isHidden)
                );

            });

        });
    }

    // =====================================
    // PASSWORD RECOVERY COUNTDOWN
    // =====================================

    function startResendCountdown() {

        if (!resendResetButton || !resendCountdown) return;

        if (resendTimer) {
            clearInterval(resendTimer);
        }

        resendSeconds = 60;

        resendResetButton.hidden = false;
        resendResetButton.disabled = true;

        resendResetButton.textContent = "Resend Reset Link";

        resendCountdown.textContent =
            `You can request another link in ${resendSeconds} seconds.`;

        resendTimer = setInterval(() => {

            resendSeconds--;

            if (resendSeconds > 0) {

                resendCountdown.textContent =
                    `You can request another link in ${resendSeconds} seconds.`;

            } else {

                clearInterval(resendTimer);
                resendTimer = null;

                resendResetButton.disabled = false;

                resendCountdown.textContent =
                    "You can now request another reset link.";

            }

        }, 1000);
    }

    // =====================================
    // SEND PASSWORD RESET EMAIL
    // =====================================

    async function sendPasswordRecovery(isResend = false) {

        if (!supabaseClient) {
            showResetMessage("Database connection unavailable.");
            return;
        }

        const email = resetEmail.value.trim();

        if (!email) {

            showResetMessage("Please enter your email address.");

            resetEmail.focus();

            return;
        }

        const button = isResend
            ? resendResetButton
            : sendResetButton;

        if (!button) return;

        if (isResend && button.disabled) return;

        setLoading(
            button,
            true,
            isResend ? "Resending..." : "Sending...",
            isResend ? "Resend Reset Link" : "Send Reset Link"
        );

        try {

            const { error } =
                await supabaseClient.auth.resetPasswordForEmail(
                    email,
                    {
                        redirectTo: ROUTES.recovery
                    }
                );

            if (error) throw error;

            recoveryEmailSent = true;

            if (sendResetButton) {
                sendResetButton.hidden = true;
                sendResetButton.disabled = true;
            }

            showResetMessage(
                "If an account exists with this email, a password reset link has been sent. Please check your inbox and spam folder.",
                true
            );

            startResendCountdown();

        } catch (error) {

            showResetMessage(
                error.message || "Unable to send reset link."
            );

            setLoading(
                button,
                false,
                "Sending...",
                isResend ? "Resend Reset Link" : "Send Reset Link"
            );
        }
    }

    // =====================================
    // ADMINISTRATOR VERIFICATION
    // =====================================

    function isAdministrator(user) {

        return user?.app_metadata?.role === "admin";
    }

    // =====================================
    // SUBSCRIPTION VERIFICATION
    // =====================================

    async function checkSubscription(user) {

        const { data, error } = await supabaseClient
            .from("subscriptions")
            .select("id, plan, status, expires_at")
            .eq("user_id", user.id)
            .eq("status", "active")
            .gt("expires_at", new Date().toISOString())
            .order("expires_at", {
                ascending: false
            })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        return data;
    }

    // =====================================
    // LOGIN REDIRECTION
    // =====================================

    async function redirectAfterLogin(user) {

        // ADMIN CHECK FIRST

        if (isAdministrator(user)) {

            showMessage(
                "Administrator login successful! Opening admin dashboard...",
                true
            );

            setTimeout(() => {
                window.location.replace(ROUTES.admin);
            }, 1000);

            return;
        }

        // NORMAL USER SUBSCRIPTION CHECK

        const subscription = await checkSubscription(user);

        if (subscription) {

            showMessage(
                "Login successful! Opening your dashboard...",
                true
            );

            setTimeout(() => {
                window.location.replace(ROUTES.dashboard);
            }, 1000);

        } else {

            showMessage(
                "Login successful! Please choose or renew your subscription.",
                true
            );

            setTimeout(() => {
                window.location.replace(ROUTES.payment);
            }, 1000);
        }
    }

    // =====================================
    // USER REGISTRATION
    // =====================================

    async function handleRegistration(event) {

        event.preventDefault();

        const name = fullName.value.trim();
        const email = registerEmail.value.trim();

        const password = registerPassword.value;
        const confirmation = confirmPassword.value;

        const button = registerForm.querySelector(
            'button[type="submit"]'
        );

        if (!name) {

            showMessage("Please enter your full name.");

            fullName.focus();

            return;
        }

        if (!email) {

            showMessage("Please enter your email address.");

            registerEmail.focus();

            return;
        }

        if (password.length < 8) {

            showMessage(
                "Password must contain at least 8 characters."
            );

            registerPassword.focus();

            return;
        }

        if (password !== confirmation) {

            showMessage("Your passwords do not match.");

            confirmPassword.focus();

            return;
        }

        if (!acceptTerms.checked) {

            showMessage(
                "Please accept the Terms and Privacy Policy."
            );

            return;
        }

        setLoading(
            button,
            true,
            "Creating Account...",
            "Create My Account"
        );

        try {

            const { data, error } =
                await supabaseClient.auth.signUp({

                    email: email,

                    password: password,

                    options: {

                        data: {
                            full_name: name
                        },

                        emailRedirectTo: ROUTES.auth
                    }
                });

            if (error) throw error;

            if (data.session) {

                showMessage(
                    "Account created successfully! Redirecting to payment...",
                    true
                );

                setTimeout(() => {

                    window.location.replace(ROUTES.payment);

                }, 1500);

            } else {

                showMessage(
                    "Registration successful! Please check your email to confirm your account.",
                    true
                );

                registerForm.reset();
            }

        } catch (error) {

            showMessage(
                error.message || "Registration failed."
            );

        } finally {

            setLoading(
                button,
                false,
                "Creating Account...",
                "Create My Account"
            );
        }
    }

    // =====================================
    // USER LOGIN
    // =====================================

    async function handleLogin(event) {

        event.preventDefault();

        const button = loginForm.querySelector(
            'button[type="submit"]'
        );

        setLoading(
            button,
            true,
            "Logging in...",
            "Login to Account"
        );

        try {

            const { data, error } =
                await supabaseClient.auth.signInWithPassword({

                    email: loginEmail.value.trim(),

                    password: loginPassword.value
                });

            if (error) throw error;

            await redirectAfterLogin(data.user);

        } catch (error) {

            showMessage(
                error.message || "Login failed. Please try again."
            );

        } finally {

            setLoading(
                button,
                false,
                "Logging in...",
                "Login to Account"
            );
        }
    }

    // =====================================
    // PASSWORD RECOVERY FORM
    // =====================================

    async function handleRecovery(event) {

        event.preventDefault();

        if (recoveryEmailSent) {

            showResetMessage(
                "Use the Resend Reset Link button to request another email."
            );

            return;
        }

        await sendPasswordRecovery(false);
    }

    // =====================================
    // NAVIGATION EVENTS
    // =====================================

    function initializeNavigation() {

        forgotPasswordLink?.addEventListener("click", event => {

            event.preventDefault();

            displayForm("reset");
        });

        backToLogin?.addEventListener("click", event => {

            event.preventDefault();

            displayForm("login");
        });

        resendResetButton?.addEventListener("click", () => {

            sendPasswordRecovery(true);
        });
    }

    // =====================================
    // FORM VALIDATION
    // =====================================

    function validateElements() {

        const requiredElements = [
            loginForm,
            registerForm,
            resetPasswordForm,
            authMessage,
            resetMessage,
            formTitle,
            formDescription,
            switchText,
            switchContainer
        ];

        const missing = requiredElements.some(
            element => !element
        );

        if (missing) {

            console.error(
                "LifeTrack: Required HTML elements are missing. Check your auth.html IDs."
            );

            return false;
        }

        return true;
    }

    // =====================================
    // APPLICATION INITIALIZATION
    // =====================================

    function initialize() {

        if (!validateElements()) return;

        if (!supabaseClient) {

            showMessage(
                "Database connection failed. Check your supabase.js configuration."
            );

            console.error(
                "LifeTrack Supabase client was not initialized."
            );

            return;
        }

        // Initial page

        displayForm("login");

        // Navigation

        initializeNavigation();

        // Password controls

        initializePasswordVisibility();

        // Registration

        registerForm.addEventListener(
            "submit",
            handleRegistration
        );

        // Login

        loginForm.addEventListener(
            "submit",
            handleLogin
        );

        // Recovery

        resetPasswordForm.addEventListener(
            "submit",
            handleRecovery
        );

        console.log(
            "LifeTrack authentication system initialized successfully."
        );
    }

    // =====================================
    // START APPLICATION
    // =====================================

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();
    }

})();
