
/* =====================================
   LIFETRACK AUTHENTICATION
   SUPABASE LOGIN & REGISTRATION
   PASSWORD RECOVERY + RESEND
   ADMIN ROLE REDIRECT
===================================== */

const supabaseClient = window.lifeTrackSupabase;

// FORM ELEMENTS
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const resetPasswordForm = document.getElementById("resetPasswordForm");

// INPUT ELEMENTS
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const fullName = document.getElementById("fullName");
const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");
const confirmPassword = document.getElementById("confirmPassword");
const acceptTerms = document.getElementById("acceptTerms");

const resetEmail = document.getElementById("resetEmail");

// MESSAGES
const authMessage = document.getElementById("authMessage");
const resetMessage = document.getElementById("resetMessage");

// PAGE ELEMENTS
const formTitle = document.getElementById("formTitle");
const formDescription = document.getElementById("formDescription");
const switchText = document.getElementById("switchText");
const switchContainer = document.getElementById("switchContainer");

// RECOVERY ELEMENTS
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const sendResetButton = document.getElementById("sendResetLink");
const resendResetButton = document.getElementById("resendResetLink");
const resendCountdown = document.getElementById("resendCountdown");
const backToLogin = document.getElementById("backToLogin");

// =====================================
// MESSAGE FUNCTIONS
// =====================================

function showMessage(message, success = false) {
    if (!authMessage) return;

    authMessage.textContent = message;
    authMessage.style.color = success ? "#267548" : "#c0392b";
}

function showResetMessage(message, success = false) {
    if (!resetMessage) return;

    resetMessage.textContent = message;
    resetMessage.style.color = success ? "#267548" : "#c0392b";
}


// =====================================
// FORM SWITCHING
// =====================================

function displayForm(type) {
    loginForm.classList.add("hidden");
    registerForm.classList.add("hidden");
    resetPasswordForm.classList.add("hidden");

    authMessage.textContent = "";
    resetMessage.textContent = "";

    if (type === "register") {

        registerForm.classList.remove("hidden");

        formTitle.textContent = "Create Account";
        formDescription.textContent =
            "Start building better habits with LifeTrack.";

        switchContainer.hidden = false;

        switchText.innerHTML =
            'Already have an account? <button type="button" id="showLogin">Login</button>';

        document.getElementById("showLogin").addEventListener("click", () => {
            displayForm("login");
        });

    } else if (type === "reset") {

        resetPasswordForm.classList.remove("hidden");

        formTitle.textContent = "Reset Password";
        formDescription.textContent =
            "Enter your email to receive a password reset link.";

        switchContainer.hidden = true;

        if (resendResetButton) {
            resendResetButton.hidden = !recoveryEmailSent;
        }

    } else {

        loginForm.classList.remove("hidden");

        formTitle.textContent = "Welcome Back";
        formDescription.textContent =
            "Login to continue your personal growth journey.";

        switchContainer.hidden = false;

        switchText.innerHTML =
            'Don\'t have an account? <button type="button" id="showRegister">Create Account</button>';

        document.getElementById("showRegister").addEventListener("click", () => {
            displayForm("register");
        });
    }
}


// =====================================
// RESEND COUNTDOWN
// =====================================

function startResendCountdown() {
    if (!resendResetButton || !resendCountdown) return;

    clearInterval(resendTimer);

    resendSeconds = 60;

    resendResetButton.disabled = true;
    resendResetButton.hidden = false;
    resendResetButton.textContent = "Resend Reset Link";

    resendCountdown.textContent =
        "You can request another link in 60 seconds.";

    resendTimer = setInterval(() => {

        resendSeconds--;

        if (resendSeconds > 0) {

            resendCountdown.textContent =
                `You can request another link in ${resendSeconds} seconds.`;

        } else {

            clearInterval(resendTimer);

            resendResetButton.disabled = false;

            resendCountdown.textContent =
                "You can now request another reset link.";
        }

    }, 1000);
}


// =====================================
// PASSWORD RECOVERY
// =====================================

async function sendPasswordRecovery(isResend = false) {

    const email = resetEmail.value.trim();

    if (!email) {
        showResetMessage("Please enter your email address.");
        resetEmail.focus();
        return;
    }

    if (isResend && resendResetButton.disabled) {
        return;
    }

    const button = isResend ? resendResetButton : sendResetButton;

    button.disabled = true;
    button.textContent = isResend ? "Resending..." : "Sending...";

    try {

        const { error } =
            await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: `${https://upgraded-seven.vercel.app/}/forgot-password.html`
            });

        if (error) throw error;

        recoveryEmailSent = true;

        showResetMessage(
            "If an account exists with this email, a password reset link has been sent. Please check your inbox and spam folder.",
            true
        );

        startResendCountdown();

    } catch (error) {

        showResetMessage(error.message);

        button.disabled = false;

        button.textContent = isResend
            ? "Resend Reset Link"
            : "Send Reset Link";
    }
}


// =====================================
// ADMINISTRATOR CHECK
// =====================================

function isAdministrator(user) {

    if (!user || !user.app_metadata) {
        return false;
    }

    return user.app_metadata.role === "admin";
}


// =====================================
// LOGIN REDIRECTION
// =====================================

async function redirectAfterLogin(user) {

    // ADMIN CHECK MUST COME FIRST
    if (isAdministrator(user)) {

        showMessage(
            "Administrator login successful! Opening admin dashboard...",
            true
        );

        setTimeout(() => {
            window.location.href = `${https://upgraded-seven.vercel.app/}/admin.html`;
        }, 1000);

        return;
    }

    // ORDINARY USER SUBSCRIPTION CHECK
    const { data: subscription, error } = await supabaseClient
        .from("subscriptions")
        .select("id, plan, status, expires_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;

    if (subscription) {

        showMessage(
            "Login successful! Opening your dashboard...",
            true
        );

        setTimeout(() => {
            window.location.href = `${https://upgraded-seven.vercel.app/}/dashboard.html`;
        }, 1000);

    } else {

        showMessage(
            "Login successful! Please choose or renew your subscription.",
            true
        );

        setTimeout(() => {
            window.location.href = `${https://upgraded-seven.vercel.app/}/payment.html`;
        }, 1000);
    }
}


// =====================================
// INITIALIZE PAGE
// =====================================

if (!supabaseClient) {

    showMessage(
        "Database connection failed. Check your Supabase configuration."
    );

} else {

    displayForm("login");


    // FORGOT PASSWORD LINK
    forgotPasswordLink.addEventListener("click", event => {

        event.preventDefault();

        displayForm("reset");
    });


    // BACK TO LOGIN
    backToLogin.addEventListener("click", event => {

        event.preventDefault();

        displayForm("login");
    });


    // PASSWORD VISIBILITY
    document.querySelectorAll(".show-password").forEach(button => {

        button.addEventListener("click", () => {

            const target = document.getElementById(button.dataset.target);

            if (target) {

                target.type =
                    target.type === "password" ? "text" : "password";

                button.textContent =
                    target.type === "password" ? "Show" : "Hide";
            }
        });
    });


    // =================================
    // REGISTRATION
    // =================================

    registerForm.addEventListener("submit", async event => {

        event.preventDefault();

        const name = fullName.value.trim();
        const email = registerEmail.value.trim();
        const password = registerPassword.value;
        const confirmation = confirmPassword.value;

        if (password.length < 8) {

            showMessage("Password must contain at least 8 characters.");
            return;
        }

        if (password !== confirmation) {

            showMessage("Your passwords do not match.");
            return;
        }

        if (!acceptTerms.checked) {

            showMessage("Please accept the Terms and Privacy Policy.");
            return;
        }

        const button =
            registerForm.querySelector("button[type='submit']");

        button.disabled = true;
        button.textContent = "Creating Account...";

        try {

            const { data, error } =
                await supabaseClient.auth.signUp({

                    email: email,
                    password: password,

                    options: {

                        data: {
                            full_name: name
                        },

                        emailRedirectTo: `${https://upgraded-seven.vercel.app/}/auth.html`
                    }
                });

            if (error) throw error;

            if (data.session) {

                showMessage(
                    "Account created successfully! Redirecting to payment...",
                    true
                );

                setTimeout(() => {
                    window.location.href = `${https://upgraded-seven.vercel.app/}/payment.html`;
                }, 1500);

            } else {

                showMessage(
                    "Registration successful! Please check your email to confirm your account.",
                    true
                );

                registerForm.reset();
            }

        } catch (error) {

            showMessage(error.message);

        } finally {

            button.disabled = false;
            button.textContent = "Create My Account";
        }
    });


    // =================================
    // LOGIN
    // =================================

    loginForm.addEventListener("submit", async event => {

        event.preventDefault();

        const button =
            loginForm.querySelector("button[type='submit']");

        button.disabled = true;
        button.textContent = "Logging in...";

        try {

            const { data, error } =
                await supabaseClient.auth.signInWithPassword({

                    email: loginEmail.value.trim(),
                    password: loginPassword.value
                });

            if (error) throw error;

            // CHECK ROLE BEFORE CHECKING SUBSCRIPTION
            await redirectAfterLogin(data.user);

        } catch (error) {

            showMessage(error.message);

        } finally {

            button.disabled = false;
            button.textContent = "Login to Account";
        }
    });


    // =================================
    // FIRST RESET LINK REQUEST
    // =================================

    resetPasswordForm.addEventListener("submit", async event => {

        event.preventDefault();

        if (recoveryEmailSent) {

            showResetMessage(
                "Please use the Resend Reset Link button if you need another email."
            );

            return;
        }

        await sendPasswordRecovery(false);
    });


    // =================================
    // RESEND RESET LINK
    // =================================

    resendResetButton.addEventListener("click", async () => {

        await sendPasswordRecovery(true);
    });

}
