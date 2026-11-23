
/* =========================================
   LIFETRACK PAYMENT CENTRE
   SUPABASE PAYMENT SUBMISSION
========================================= */

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

const planInputs = document.querySelectorAll(
    'input[name="plan"]'
);

const methodInputs = document.querySelectorAll(
    'input[name="method"]'
);

const paymentInstructions =
    document.getElementById("paymentInstructions");

const paymentForm =
    document.getElementById("paymentForm");

const paymentMessage =
    document.getElementById("paymentMessage");

const voucherForm =
    document.getElementById("voucherForm");

const voucherMessage =
    document.getElementById("voucherMessage");

const screenshot =
    document.getElementById("paymentScreenshot");

const customerName =
    document.getElementById("customerName");

const customerEmail =
    document.getElementById("customerEmail");

const transactionReference =
    document.getElementById("transactionReference");


// =========================================
// UPDATE PAYMENT INSTRUCTIONS
// =========================================

function updatePaymentInstructions() {

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
        <p>Complete payment and upload your screenshot
        with your transaction reference below.</p>
        <p>Your subscription will only be activated
        after payment verification and voucher redemption.</p>
    `;
}

planInputs.forEach(input => {
    input.addEventListener("change", updatePaymentInstructions);
});

methodInputs.forEach(input => {
    input.addEventListener("change", updatePaymentInstructions);
});


// =========================================
// DISPLAY PAYMENT MESSAGE
// =========================================

function showPaymentMessage(message, success = false) {
    paymentMessage.textContent = message;
    paymentMessage.style.color = success ? "#168653" : "#c0392b";
}

function showVoucherMessage(message, success = false) {
    voucherMessage.textContent = message;
    voucherMessage.style.color = success ? "#168653" : "#c0392b";
}


// =========================================
// SUBMIT PAYMENT TO SUPABASE
// =========================================

paymentForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    if (!supabaseClient) {
        showPaymentMessage("Supabase connection failed. Please refresh the page.");
        return;
    }

    const {
        data: { user },
        error: authError
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
        showPaymentMessage("Please log in to your LifeTrack account before submitting payment.");
        return;
    }

    const selectedPlan = document.querySelector(
        'input[name="plan"]:checked'
    )?.value;

    const selectedMethod = document.querySelector(
        'input[name="method"]:checked'
    )?.value;

    const name = customerName.value.trim();
    const email = customerEmail.value.trim();
    const reference = transactionReference.value.trim();

    if (!selectedPlan || !plans[selectedPlan]) {
        showPaymentMessage("Please select a valid subscription.");
        return;
    }

    if (!selectedMethod || !paymentDetails[selectedMethod]) {
        showPaymentMessage("Please select a payment method.");
        return;
    }

    if (!name || !email || !reference) {
        showPaymentMessage("Please complete all payment details.");
        return;
    }

    if (email.toLowerCase() !== user.email.toLowerCase()) {
        showPaymentMessage("Please use the email address linked to your logged-in account.");
        return;
    }

    if (!screenshot.files.length) {
        showPaymentMessage("Please upload your payment screenshot.");
        return;
    }

    const file = screenshot.files[0];

    if (!file.type.startsWith("image/")) {
        showPaymentMessage("Please upload a valid image.");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showPaymentMessage("Screenshot must be smaller than 5 MB.");
        return;
    }

    const submitButton = paymentForm.querySelector(
        'button[type="submit"]'
    );

    if (submitButton) submitButton.disabled = true;

    showPaymentMessage("Submitting your payment request...", true);

    let uploadedPath = null;

    try {

        const extension = file.name.split(".").pop().toLowerCase();

        const safeExtension = /^[a-z0-9]+$/.test(extension)
            ? extension
            : "jpg";

        const filePath =
            `${user.id}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

        // Upload screenshot to private storage

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

        // Save payment request

        const { error: databaseError } =
            await supabaseClient
                .from("payment_requests")
                .insert({
                    user_id: user.id,
                    customer_name: name,
                    customer_email: user.email,
                    plan: selectedPlan,
                    payment_method: selectedMethod,
                    transaction_reference: reference,
                    screenshot_path: uploadedPath,
                    status: "pending"
                });

        if (databaseError) throw databaseError;

        paymentForm.reset();

        updatePaymentInstructions();

        showPaymentMessage(
            "Your payment request was submitted successfully! Your payment is now awaiting manual verification.",
            true
        );

    } catch (error) {

        console.error("LifeTrack payment error:", error);

        showPaymentMessage(
            "Payment submission failed: " + error.message
        );

    } finally {

        if (submitButton) submitButton.disabled = false;

    }
});


// =========================================
// VOUCHER INTERFACE
// Verification will be connected separately
// =========================================

voucherForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const code = document.getElementById("voucherCode").value.trim();

    if (!code) {
        showVoucherMessage("Please enter your voucher code.");
        return;
    }

    showVoucherMessage(
        "Voucher verification is not connected yet. We will connect it securely in a later step."
    );
});
