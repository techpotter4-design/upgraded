/* =====================================
   LIFETRACK FORGOT PASSWORD
   SUPABASE EMAIL RESET LINK
===================================== */

const supabaseClient = window.lifeTrackSupabase;

const emailForm = document.getElementById("emailForm");
const recoveryEmail = document.getElementById("recoveryEmail");
const recoveryMessage = document.getElementById("recoveryMessage");

function showMessage(message, success = false) {
    recoveryMessage.textContent = message;
    recoveryMessage.style.color = success ? "#267548" : "#c0392b";
}

if (!supabaseClient) {
    showMessage("Connection error. Please reload the page.");

} else if (emailForm && recoveryEmail) {

    emailForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const email = recoveryEmail.value.trim();

        if (!email) {
            showMessage("Please enter your email address.");
            return;
        }

        const button = emailForm.querySelector("button[type='submit']");

        if (button) {
            button.disabled = true;
            button.textContent = "Sending...";
        }

        try {
            const { error } =
                await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: "https://lifetracker-delta-eosin.vercel.app/reset-password.html"
                });

            if (error) throw error;

            showMessage(
                "If an account exists for this email, a password reset link will be sent. Check your inbox.",
                true
            );

        } catch (error) {
            showMessage(error.message);

        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "Send Reset Link";
            }
        }
    });
}