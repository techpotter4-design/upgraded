
/* =========================================
   LIFETRACK PAYMENT CENTRE
   PAYMENT SUBMISSION + VOUCHER REDEMPTION
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const supabaseClient = window.lifeTrackSupabase;
    const $ = (id) => document.getElementById(id);

    const plans = {
        trial: { name: "5-Day Trial", price: 200, duration: 5 },
        standard: { name: "Standard", price: 800, duration: 30 },
        advanced: { name: "Advanced", price: 1500, duration: 30 }
    };

    const paymentDetails = {
        airtel: { name: "Airtel Money", account: "+254 714 543 685" },
        binance: { name: "Binance Pay", account: "1194887816" }
    };

    const planInputs = document.querySelectorAll('input[name="plan"]');
    const methodInputs = document.querySelectorAll('input[name="method"]');

    const paymentInstructions = $("paymentInstructions");
    const paymentForm = $("paymentForm");
    const paymentMessage = $("paymentMessage");
    const voucherForm = $("voucherForm");
    const voucherMessage = $("voucherMessage");

    const screenshot = $("paymentScreenshot");
    const customerName = $("customerName");
    const customerEmail = $("customerEmail");
    const transactionReference = $("transactionReference");

    function showPaymentMessage(message, success = false) {
        if (!paymentMessage) return;
        paymentMessage.textContent = message;
        paymentMessage.style.color = success ? "#168653" : "#c0392b";
    }

    function showVoucherMessage(message, success = false) {
        if (!voucherMessage) return;
        voucherMessage.textContent = message;
        voucherMessage.style.color = success ? "#168653" : "#c0392b";
    }

    // PAYMENT INSTRUCTIONS

    function updatePaymentInstructions() {
        if (!paymentInstructions) return;

        const selectedPlan = document.querySelector(
            'input[name="plan"]:checked'
        )?.value;

        const selectedMethod = document.querySelector(
            'input[name="method"]:checked'
        )?.value;

        if (!selectedPlan || !selectedMethod) {
            paymentInstructions.innerHTML =
                "<p>Select a subscription and payment method to see instructions.</p>";
            return;
        }

        const plan = plans[selectedPlan];
        const method = paymentDetails[selectedMethod];

        if (!plan || !method) return;

        paymentInstructions.innerHTML = `
            <h3>Payment Instructions</h3>
            <p><strong>Subscription:</strong> ${plan.name}</p>
            <p><strong>Amount:</strong> KSh ${plan.price.toLocaleString()}</p>
            <p><strong>Duration:</strong> ${plan.duration} days</p>
            <p><strong>Payment Method:</strong> ${method.name}</p>
            <p><strong>Send Payment To:</strong></p>
            <h3>${method.account}</h3>
            <p>Complete payment and enter your transaction reference.
            Upload your payment screenshot below.</p>
            <p>Your subscription activates only after administrator verification.</p>
        `;
    }

    planInputs.forEach(input =>
        input.addEventListener("change", updatePaymentInstructions)
    );

    methodInputs.forEach(input =>
        input.addEventListener("change", updatePaymentInstructions)
    );

    updatePaymentInstructions();

    // PAYMENT SUBMISSION

    paymentForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!supabaseClient) {
            showPaymentMessage("Supabase connection failed.");
            return;
        }

        const button = paymentForm.querySelector('button[type="submit"]');
        let uploadedPath = null;

        if (button) button.disabled = true;

        try {
            showPaymentMessage("Checking your account...", true);

            const { data: { user }, error: authError } =
                await supabaseClient.auth.getUser();

            if (authError || !user) {
                throw new Error("Please log in before submitting payment.");
            }

            const selectedPlan = document.querySelector(
                'input[name="plan"]:checked'
            )?.value;

            const selectedMethod = document.querySelector(
                'input[name="method"]:checked'
            )?.value;

            const name = customerName?.value.trim();
            const email = customerEmail?.value.trim();
            const reference = transactionReference?.value.trim();

            if (!plans[selectedPlan]) {
                throw new Error("Please select a valid subscription.");
            }

            if (!paymentDetails[selectedMethod]) {
                throw new Error("Please select a payment method.");
            }

            if (!name || !email || !reference) {
                throw new Error("Please complete all payment details.");
            }

            if (email.toLowerCase() !== user.email?.toLowerCase()) {
                throw new Error("Please use your registered account email.");
            }

            if (!screenshot?.files?.length) {
                throw new Error("Please upload your payment screenshot.");
            }

            const file = screenshot.files[0];

            if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                throw new Error("Upload a JPG, PNG, or WebP image.");
            }

            if (file.size > 5 * 1024 * 1024) {
                throw new Error("Screenshot must be smaller than 5 MB.");
            }

            showPaymentMessage("Uploading screenshot...", true);

            const extension = file.type === "image/png"
                ? "png"
                : file.type === "image/webp" ? "webp" : "jpg";

            uploadedPath = `${user.id}/${crypto.randomUUID()}.${extension}`;

            const { error: uploadError } = await supabaseClient.storage
                .from("payment-screenshots")
                .upload(uploadedPath, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type
                });

            if (uploadError) throw uploadError;

            showPaymentMessage("Saving payment request...", true);

            const { data, error } = await supabaseClient.rpc(
                "submit_payment_request",
                {
                    p_plan_key: selectedPlan,
                    p_payment_method: paymentDetails[selectedMethod].name,
                    p_transaction_reference: reference,
                    p_screenshot_path: uploadedPath,
                    p_customer_name: name
                }
            );

            if (error) throw error;

            if (!data?.success) {
                throw new Error("Payment request could not be saved.");
            }

            uploadedPath = null;
            paymentForm.reset();
            updatePaymentInstructions();

            showPaymentMessage(
                `Payment submitted successfully! ${data.plan_name} is awaiting verification. Reference: ${reference}`,
                true
            );

        } catch (error) {
            console.error("Payment error:", error);

            if (uploadedPath && supabaseClient) {
                const { error: cleanupError } = await supabaseClient.storage
                    .from("payment-screenshots")
                    .remove([uploadedPath]);

                if (cleanupError) {
                    console.error("Screenshot cleanup error:", cleanupError);
                }
            }

            showPaymentMessage("Payment failed: " + error.message);

        } finally {
            if (button) button.disabled = false;
        }
    });

    // VOUCHER REDEMPTION

    voucherForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const button = voucherForm.querySelector('button[type="submit"]');

        if (button) button.disabled = true;

        try {
            if (!supabaseClient) {
                throw new Error("Supabase connection failed. Refresh and try again.");
            }

            const code = $("voucherCode")?.value.trim().toUpperCase();

            if (!code) {
                throw new Error("Please enter your voucher code.");
            }

            showVoucherMessage("Verifying your voucher...", true);

            const { data: { user }, error: authError } =
                await supabaseClient.auth.getUser();

            if (authError || !user) {
                throw new Error("Please log in before redeeming a voucher.");
            }

            const { data, error } = await supabaseClient.rpc(
                "redeem_voucher",
                { p_code: code }
            );

            if (error) throw error;

            if (!data || data.success !== true) {
                throw new Error(
                    data?.message || "Voucher redemption failed."
                );
            }

            showVoucherMessage(
                `Voucher activated successfully! Your ${data.plan_name} subscription is now active. Redirecting...`,
                true
            );

            $("voucherCode").value = "";

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1500);

        } catch (error) {
            console.error("Voucher redemption error:", error);
            showVoucherMessage(error.message || "Voucher redemption failed.");

        } finally {
            if (button) button.disabled = false;
        }
    });

    if (!voucherForm) {
        console.error("LifeTrack: Voucher form not found.");
    }

    if (!supabaseClient) {
        console.error("LifeTrack: Supabase client not initialized.");
    }

});
       
