
/* =====================================
   LIFETRACK PASSWORD RESET
   SUPABASE SECURE RECOVERY
===================================== */

const supabaseClient = window.lifeTrackSupabase;

const resetPasswordForm = document.getElementById("resetPasswordForm");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");
const resetMessage = document.getElementById("resetMessage");
const resetButton = document.getElementById("resetButton");

let recoverySessionReady = false;
let passwordUpdating = false;

function showMessage(message, success = false) {
    resetMessage.textContent = message;
    resetMessage.style.color = success ? "#267548" : "#c0392b";
}

function disableReset(message) {
    showMessage(message);
    resetButton.disabled = true;
}

if (
    !supabaseClient ||
    !resetPasswordForm ||
    !newPassword ||
    !confirmPassword ||
    !resetMessage ||
    !resetButton
) {
    console.error("LifeTrack password reset: Required elements are missing.");

    if (resetMessage) {
        showMessage("Unable to load password recovery. Please reload the page.");
    }

    if (resetButton) {
        resetButton.disabled = true;
    }

} else {

    // WAIT FOR A VALID RECOVERY SESSION

    async function checkRecoverySession() {
        try {
            const { data, error } = await supabaseClient.auth.getSession();

            if (error || !data.session) {
                disableReset(
                    "Your password reset link is invalid or expired. Please request a new one."
                );
                return;
            }

            recoverySessionReady = true;
            resetButton.disabled = false;

            showMessage("Verify your new password and submit.");

        } catch (error) {
            console.error("Recovery session error:", error);

            disableReset(
                "Unable to verify your reset link. Please request another one."
            );
        }
    }

    // KEEP SUBMISSION DISABLED UNTIL SESSION CHECK FINISHES

    resetButton.disabled = true;
    checkRecoverySession();

    // UPDATE PASSWORD

    resetPasswordForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        if (!recoverySessionReady) {
            showMessage("Please wait while we verify your reset link.");
            return;
        }

        if (passwordUpdating) return;

        const password = newPassword.value;
        const confirmation = confirmPassword.value;

        if (password.length < 8) {
            showMessage("Password must contain at least 8 characters.");
            return;
        }

        if (password !== confirmation) {
            showMessage("Passwords do not match.");
            return;
        }

        passwordUpdating = true;
        resetButton.disabled = true;
        resetButton.textContent = "Updating Password...";

        try {
            const { error } = await supabaseClient.auth.updateUser({
                password: password
            });

            if (error) throw error;

            showMessage(
                "Your password has been updated successfully.",
                true
            );

            resetPasswordForm.reset();

            await supabaseClient.auth.signOut();

            const link = document.createElement("a");
            link.href = "auth.html";
            link.textContent = "Return to Login";
            link.style.display = "block";
            link.style.textAlign = "center";
            link.style.marginTop = "20px";

            resetPasswordForm.appendChild(link);

            resetButton.style.display = "none";
            recoverySessionReady = false;

        } catch (error) {
            console.error("Password update error:", error);

            showMessage(
                error.message || "Password update failed. Please try again."
            );

            passwordUpdating = false;
            resetButton.disabled = false;
            resetButton.textContent = "Update Password";
        }
    });
}
