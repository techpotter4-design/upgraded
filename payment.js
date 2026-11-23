
/* =========================================
   LIFETRACK PAYMENT CENTRE
   SECURE SUPABASE PAYMENT SUBMISSION
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const supabaseClient = window.lifeTrackSupabase;

    const plans = {
        trial: {
            name: "5-Day Trial",
            price: 200,
            duration: 5
        },
        standard: {
            name: "Standard",
            price: 800,
            duration: 30
        },
        advanced: {
            name: "Advanced",
            price: 1500,
            duration: 30
        }
    };

    const paymentDetails = {
        airtel: {
            name: "Airtel Money",
            account: "+254 714 543 685"
        },
        binance: {
            name: "Binance Pay",
            account: "1194887816"
        }
    };

    const $ = (id) => document.getElementById(id);

    const planInputs = document.querySelectorAll(
        'input[name="plan"]'
    );

    const methodInputs = document.querySelectorAll(
        'input[name="method"]'
    );

    const paymentInstructions = $("paymentInstructions");
    const paymentForm = $("paymentForm");
    const paymentMessage = $("paymentMessage");
    const voucherForm = $("voucherForm");
    const voucherMessage = $("voucherMessage");

    const screenshot = $("paymentScreenshot");
    const customerName = $("customerName");
    const customerEmail = $("customerEmail");
    const transactionReference = $("transactionReference");

    if (!paymentForm) {
        console.error("LifeTrack: Payment form not found.");
        return;
    }

    // ---------------------------------
    // MESSAGES
    // ---------------------------------

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

    // ---------------------------------
    // PAYMENT INSTRUCTIONS
    // ---------------------------------

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
            <p>Your subscription will activate only after
            administrator verification.</p>
        `;
    }

    planInputs.forEach((input) => {
        input.addEventListener("change", updatePaymentInstructions);
    });

    methodInputs.forEach((input) => {
        input.addEventListener("change", updatePaymentInstructions);
    });

    updatePaymentInstructions();

    // ---------------------------------
    // PAYMENT SUBMISSION
    // ---------------------------------

    paymentForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!supabaseClient) {
            showPaymentMessage(
                "Supabase connection failed. Please refresh the page."
            );
            return;
        }

        const submitButton = paymentForm.querySelector(
            'button[type="submit"]'
        );

        let uploadedPath = null;

        if (submitButton) submitButton.disabled = true;

        try {
            showPaymentMessage("Checking your account...", true);

            const {
                data: { user },
                error: authError
            } = await supabaseClient.auth.getUser();

            if (authError || !user) {
                throw new Error(
                    "Please log in before submitting payment."
                );
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
                throw new Error(
                    "Please use the email linked to your account."
                );
            }

            if (!screenshot?.files?.length) {
                throw new Error("Please upload your payment screenshot.");
            }

            const file = screenshot.files[0];

            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp"
            ];

            if (!allowedTypes.includes(file.type)) {
                throw new Error(
                    "Please upload a JPG, PNG, or WebP image."
                );
            }

            if (file.size > 5 * 1024 * 1024) {
                throw new Error(
                    "Your screenshot must be smaller than 5 MB."
                );
            }

            showPaymentMessage(
                "Uploading your payment screenshot...",
                true
            );

            const extension = file.type === "image/png"
                ? "png"
                : file.type === "image/webp"
                    ? "webp"
                    : "jpg";

            const filePath =
                `${user.id}/${crypto.randomUUID()}.${extension}`;

            // Upload screenshot to private bucket

            const { error: uploadError } =
                await supabaseClient.storage
                    .from("payment-screenshots")
                    .upload(filePath, file, {
                        cacheControl: "3600",
                        upsert: false,
                        contentType: file.type
                    });

            if (uploadError) throw uploadError;

            uploadedPath = filePath;

            showPaymentMessage(
                "Saving your payment request...",
                true
            );

            // Convert radio values into database values

            const methodName = paymentDetails[selectedMethod].name;

            // Secure database submission

            const { data, error: submissionError } =
                await supabaseClient.rpc(
                    "submit_payment_request",
                    {
                        p_plan_key: selectedPlan,
                        p_payment_method: methodName,
                        p_transaction_reference: reference,
                        p_screenshot_path: uploadedPath,
                        p_customer_name: name
                    }
                );

            if (submissionError) throw submissionError;

            if (!data?.success) {
                throw new Error(
                    "The payment request could not be saved."
                );
            }

            paymentForm.reset();

            updatePaymentInstructions();

            showPaymentMessage(
                `Payment request submitted successfully! ${data.plan_name} is awaiting verification. Reference: ${reference}`,
                true
            );

        } catch (error) {
            console.error("LifeTrack payment error:", error);

            // Remove uploaded screenshot if database submission failed

            if (uploadedPath && supabaseClient) {
                const { error: cleanupError } =
                    await supabaseClient.storage
                        .from("payment-screenshots")
                        .remove([uploadedPath]);

                if (cleanupError) {
                    console.error(
                        "Screenshot cleanup error:",
                        cleanupError
                    );
                }
            }

            showPaymentMessage(
                "Payment submission failed: " + error.message
            );

        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });

    // ---------------------------------
    // VOUCHER PLACEHOLDER
    // ---------------------------------

    voucherForm?.addEventListener("submit", (event) => {
        event.preventDefault();

        const code = $("voucherCode")?.value.trim();

        if (!code) {
            showVoucherMessage("Please enter your voucher code.");
            return;
        }

        showVoucherMessage(
            "Voucher verification is not connected yet."
        );
    });

    console.log("LifeTrack payment centre initialized.");
});
       
