document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.lifeTrackSupabase;
    const BASE_URL = "https://upgraded-seven.vercel.app";
    const $ = (id) => document.getElementById(id);

    if (!supabase) {
        alert("LifeTrack could not connect to Supabase.");
        return;
    }

    let paymentRequests = [];
    let customers = [];
    let subscriptions = [];

    // AUTHENTICATION
    async function verifyAdmin() {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
            window.location.href = `${BASE_URL}/auth.html`;
            return false;
        }

        const user = data.user;

        if (user.app_metadata?.role !== "admin") {
            alert("Administrator access required.");
            window.location.href = `${BASE_URL}/dashboard.html`;
            return false;
        }

        if ($("adminEmail")) {
            $("adminEmail").textContent = user.email || "Administrator";
        }

        if ($("profileName")) {
            $("profileName").textContent =
                user.user_metadata?.full_name || "Administrator";
        }

        return true;
    }

    // HELPERS
    function setText(id, value) {
        const element = $(id);
        if (element) element.textContent = value;
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function formatMoney(amount, currency = "KES") {
        return new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: currency || "KES",
            maximumFractionDigits: 2
        }).format(Number(amount || 0));
    }

    function formatDate(date) {
        if (!date) return "—";

        return new Date(date).toLocaleDateString("en-KE", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function notify(message) {
        console.log("[LifeTrack]", message);

        const box = $("adminMessage");

        if (box) {
            box.textContent = message;
            box.hidden = false;
        } else {
            alert(message);
        }
    }

    // NAVIGATION
    function initializeNavigation() {
        const links = document.querySelectorAll("[data-page]");

        links.forEach((link) => {
            link.addEventListener("click", () => {
                const page = link.dataset.page;
                if (!page) return;

                document.querySelectorAll(".page-section").forEach(
                    (section) => section.classList.remove("active")
                );

                const target = $(page);

                if (!target) {
                    console.error("Page not found:", page);
                    return;
                }

                target.classList.add("active");

                links.forEach((item) =>
                    item.classList.remove("active")
                );

                link.classList.add("active");

                setText(
                    "pageTitle",
                    link.dataset.title || link.textContent.trim() || page
                );

                $("sidebar")?.classList.remove("open");
            });
        });

        $("menuToggle")?.addEventListener("click", () => {
            $("sidebar")?.classList.toggle("open");
        });
    }

    // PAYMENT REQUESTS
    async function loadPaymentRequests() {
        const container = $("paymentRequests");

        if (container) {
            container.innerHTML = "<p>Loading payment requests...</p>";
        }

        const { data, error } = await supabase
            .from("payment_requests")
            .select(`
                id,
                user_id,
                subscription_id,
                plan_name,
                amount,
                currency,
                payment_method,
                transaction_reference,
                status,
                admin_notes,
                verified_at,
                created_at
            `)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Payment loading error:", error);

            if (container) {
                container.innerHTML =
                    "<p>Could not load payments. Check administrator permissions.</p>";
            }
            return;
        }

        paymentRequests = data || [];

        await attachCustomerDetails();

        renderPaymentRequests();
        updatePaymentStatistics();
    }

    async function attachCustomerDetails() {
        const userIds = [
            ...new Set(paymentRequests.map((payment) => payment.user_id))
        ].filter(Boolean);

        if (!userIds.length) return;

        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);

        if (error) {
            console.error("Customer details error:", error);
            return;
        }

        const profiles = new Map(
            (data || []).map((profile) => [profile.id, profile])
        );

        paymentRequests = paymentRequests.map((payment) => ({
            ...payment,
            customer: profiles.get(payment.user_id) || null
        }));
    }

    function renderPaymentRequests() {
        const container = $("paymentRequests");
        if (!container) return;

        const search =
            ($("paymentSearch")?.value || "").toLowerCase().trim();

        const status =
            $("paymentStatusFilter")?.value || "all";

        const method =
            $("paymentMethodFilter")?.value || "all";

        const filtered = paymentRequests.filter((payment) => {
            const searchText = [
                payment.customer?.full_name,
                payment.customer?.email,
                payment.transaction_reference,
                payment.plan_name,
                payment.payment_method
            ].join(" ").toLowerCase();

            const matchesSearch = searchText.includes(search);

            const matchesStatus =
                status === "all" || payment.status === status;

            let matchesMethod = true;

            if (method === "airtel") {
                matchesMethod =
                    payment.payment_method === "Airtel Money";
            }

            if (method === "binance") {
                matchesMethod =
                    payment.payment_method === "Binance Pay";
            }

            return matchesSearch && matchesStatus && matchesMethod;
        });

        if (!filtered.length) {
            container.innerHTML = "<p>No payment requests found.</p>";
            return;
        }

        container.innerHTML = filtered.map((payment) => {
            const pending = payment.status === "pending";

            return `
                <div class="payment-row">
                    <div>
                        <strong>${escapeHTML(
                            payment.customer?.full_name || "Customer"
                        )}</strong>
                        <small>${escapeHTML(
                            payment.customer?.email || payment.user_id
                        )}</small>
                    </div>

                    <div>
                        ${escapeHTML(payment.plan_name || "Plan")}
                        <small>${escapeHTML(payment.payment_method)}</small>
                    </div>

                    <div>
                        ${formatMoney(payment.amount, payment.currency)}
                        <small>${escapeHTML(
                            payment.transaction_reference || "No reference"
                        )}</small>
                    </div>

                    <div>
                        <span class="status-badge ${escapeHTML(payment.status)}">
                            ${escapeHTML(payment.status)}
                        </span>
                    </div>

                    <div>${formatDate(payment.created_at)}</div>

                    <div class="payment-actions">
                        <button
                            type="button"
                            class="view-payment"
                            data-id="${escapeHTML(payment.id)}">
                            View
                        </button>

                        ${pending ? `
                            <button
                                type="button"
                                class="approve-payment"
                                data-id="${escapeHTML(payment.id)}">
                                Approve
                            </button>

                            <button
                                type="button"
                                class="reject-payment"
                                data-id="${escapeHTML(payment.id)}">
                                Reject
                            </button>
                        ` : ""}
                    </div>
                </div>
            `;
        }).join("");

        container.querySelectorAll(".view-payment").forEach((button) => {
            button.addEventListener("click", () => {
                showPaymentDetails(button.dataset.id);
            });
        });

        container.querySelectorAll(".approve-payment").forEach((button) => {
            button.addEventListener("click", async () => {
                await processPayment(button.dataset.id, true, button);
            });
        });

        container.querySelectorAll(".reject-payment").forEach((button) => {
            button.addEventListener("click", async () => {
                await processPayment(button.dataset.id, false, button);
            });
        });
            }
        // SECURE APPROVAL / REJECTION
    async function processPayment(paymentId, approve, button) {
        const payment = paymentRequests.find(
            (item) => item.id === paymentId
        );

        if (!payment || payment.status !== "pending") {
            notify("This payment is no longer pending.");
            return;
        }

        const action = approve ? "approve" : "reject";

        const confirmed = confirm(
            `Are you sure you want to ${action} this payment?`
        );

        if (!confirmed) return;

        const notes = prompt(
            approve
                ? "Enter verification notes (optional):"
                : "Enter the reason for rejection:"
        );

        if (notes === null) return;

        if (!approve && !notes.trim()) {
            alert("Please enter a reason for rejecting this payment.");
            return;
        }

        button.disabled = true;
        button.textContent = "Processing...";

        const { data, error } = await supabase.rpc(
            "admin_verify_payment",
            {
                p_payment_id: paymentId,
                p_approve: approve,
                p_admin_notes: notes.trim() || null
            }
        );

        if (error) {
            console.error("Payment processing error:", error);
            alert("Payment processing failed: " + error.message);

            button.disabled = false;
            button.textContent = approve ? "Approve" : "Reject";
            return;
        }

        if (!data?.success) {
            alert("The payment could not be processed.");
            button.disabled = false;
            button.textContent = approve ? "Approve" : "Reject";
            return;
        }

        alert(
            approve
                ? "Payment verified. Subscription activated successfully."
                : "Payment rejected successfully."
        );

        await Promise.all([
            loadPaymentRequests(),
            loadSubscriptions()
        ]);
    }

    function showPaymentDetails(id) {
        const payment = paymentRequests.find(
            (item) => item.id === id
        );

        if (!payment) return;

        alert([
            `Customer: ${payment.customer?.full_name || "Customer"}`,
            `Email: ${payment.customer?.email || "Unavailable"}`,
            `Plan: ${payment.plan_name}`,
            `Amount: ${formatMoney(payment.amount, payment.currency)}`,
            `Method: ${payment.payment_method}`,
            `Reference: ${payment.transaction_reference || "None"}`,
            `Status: ${payment.status}`,
            `Submitted: ${formatDate(payment.created_at)}`,
            `Notes: ${payment.admin_notes || "None"}`
        ].join("\n"));
    }

    function updatePaymentStatistics() {
        const pending = paymentRequests.filter(
            (payment) => payment.status === "pending"
        ).length;

        const verified = paymentRequests.filter(
            (payment) => payment.status === "verified"
        );

        const rejected = paymentRequests.filter(
            (payment) => payment.status === "rejected"
        ).length;

        const revenue = verified.reduce(
            (sum, payment) => sum + Number(payment.amount || 0),
            0
        );

        setText("paymentTotal", paymentRequests.length);
        setText("paymentPending", pending);
        setText("paymentVerified", verified.length);
        setText("paymentRejected", rejected);

        setText("pendingPayments", pending);
        setText("verifiedPayments", verified.length);
        setText("rejectedPayments", rejected);
        setText("totalRevenue", formatMoney(revenue));
        setText("paymentBadge", pending);
    }

    // CUSTOMERS
    async function loadCustomers() {
        const container = $("customerRecords");

        if (container) {
            container.innerHTML = "<p>Loading customers...</p>";
        }

        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, email, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Customer loading error:", error);

            if (container) {
                container.innerHTML = "<p>Could not load customers.</p>";
            }
            return;
        }

        customers = data || [];

        setText("totalCustomers", customers.length);

        renderCustomers();
    }

    function renderCustomers() {
        const container = $("customerRecords");
        if (!container) return;

        const search =
            ($("customerSearch")?.value || "").toLowerCase().trim();

        const filtered = customers.filter((customer) => {
            return [
                customer.full_name,
                customer.email
            ].join(" ").toLowerCase().includes(search);
        });

        if (!filtered.length) {
            container.innerHTML = "<p>No matching customers found.</p>";
            return;
        }

        container.innerHTML = filtered.map((customer) => `
            <div class="customer-row">
                <strong>${escapeHTML(customer.full_name || "Customer")}</strong>
                <span>${escapeHTML(customer.email || "No email")}</span>
                <small>${formatDate(customer.created_at)}</small>
            </div>
        `).join("");
            }
        // SUBSCRIPTIONS
    async function loadSubscriptions() {
        const container = $("subscriptionRecords");

        if (container) {
            container.innerHTML = "<p>Loading subscriptions...</p>";
        }

        const { data, error } = await supabase
            .from("subscriptions")
            .select(`
                id,
                user_id,
                plan_name,
                plan,
                status,
                starts_at,
                expires_at,
                created_at
            `)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Subscription loading error:", error);

            if (container) {
                container.innerHTML = "<p>Could not load subscriptions.</p>";
            }
            return;
        }

        subscriptions = data || [];

        const active = subscriptions.filter((subscription) =>
            subscription.status === "active" &&
            (
                !subscription.expires_at ||
                new Date(subscription.expires_at) > new Date()
            )
        ).length;

        setText("activeSubscriptions", active);

        if (!container) return;

        if (!subscriptions.length) {
            container.innerHTML = "<p>No subscriptions found.</p>";
            return;
        }

        container.innerHTML = subscriptions.map((subscription) => `
            <div class="subscription-row">
                <strong>${escapeHTML(
                    subscription.plan_name || subscription.plan || "Plan"
                )}</strong>
                <span>${escapeHTML(subscription.status)}</span>
                <small>User: ${escapeHTML(subscription.user_id)}</small>
                <small>Expires: ${formatDate(subscription.expires_at)}</small>
            </div>
        `).join("");
    }

    // VOUCHERS
    let vouchers = [];

    async function loadVouchers() {
        const container = $("issuedVouchers");
        if (container) container.innerHTML = "<p>Loading vouchers...</p>";

        const { data, error } = await supabase.rpc("admin_list_vouchers");

        if (error) {
            console.error("Voucher loading error:", error);
            if (container) {
                container.innerHTML =
                    `<p>Could not load vouchers: ${escapeHTML(error.message)}</p>`;
            }
            return;
        }

        vouchers = Array.isArray(data) ? data : [];
        setText("vouchersIssued", vouchers.length);
        renderVouchers();
    }

    function renderVouchers() {
        const container = $("issuedVouchers");
        if (!container) return;

        if (!vouchers.length) {
            container.innerHTML = "<p>No vouchers have been issued yet.</p>";
            return;
        }

        container.innerHTML = `
            <div class="voucher-list">
                ${vouchers.map((voucher) => `
                    <div class="voucher-row">
                        <div>
                            <strong>${escapeHTML(voucher.code)}</strong>
                            <small>${escapeHTML(voucher.plan_name)} · ${Number(voucher.duration_days)} days</small>
                        </div>
                        <div>
                            <span class="status-badge ${escapeHTML(voucher.status)}">
                                ${escapeHTML(voucher.status)}
                            </span>
                            <small>Created: ${formatDate(voucher.created_at)}</small>
                            ${voucher.expires_at
                                ? `<small>Code expires: ${formatDate(voucher.expires_at)}</small>`
                                : ""}
                            ${voucher.redeemed_at
                                ? `<small>Redeemed: ${formatDate(voucher.redeemed_at)}</small>`
                                : ""}
                        </div>
                        <button type="button"
                            class="copy-voucher"
                            data-code="${escapeHTML(voucher.code)}">
                            Copy code
                        </button>
                    </div>
                `).join("")}
            </div>
        `;

        container.querySelectorAll(".copy-voucher").forEach((button) => {
            button.addEventListener("click", async () => {
                const code = button.dataset.code || "";
                try {
                    await navigator.clipboard.writeText(code);
                    notify(`Copied voucher code: ${code}`);
                } catch (error) {
                    console.error("Clipboard error:", error);
                    window.prompt("Copy this voucher code:", code);
                }
            });
        });
    }
        function initializeVouchers() {
        const form = $("voucherGeneratorForm");
        const message = $("voucherMessage");
        const submitButton = $("generateVoucher");

        $("refreshVouchers")?.addEventListener("click", loadVouchers);

        form?.addEventListener("submit", async (event) => {
            event.preventDefault();

            const planKey = $("voucherPlan")?.value;
            const quantity = Number($("voucherQuantity")?.value || 1);
            const expiryInput = $("voucherExpiry")?.value || "";
            const expiry = expiryInput
                ? new Date(expiryInput).toISOString()
                : null;

            if (!["trial", "standard", "advanced"].includes(planKey)) {
                if (message) message.textContent = "Please select a subscription plan.";
                return;
            }

            if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
                if (message) message.textContent = "Choose a quantity from 1 to 100.";
                return;
            }

            if (expiryInput && (!Number.isFinite(new Date(expiryInput).getTime()) ||
                new Date(expiryInput).getTime() <= Date.now())) {
                if (message) message.textContent = "Voucher expiry must be a future date and time.";
                return;
            }

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Generating...";
            }

            if (message) {
                message.textContent = "Generating secure voucher codes...";
            }

            const { data, error } = await supabase.rpc("generate_vouchers", {
                p_plan_key: planKey,
                p_quantity: quantity,
                p_expires_at: expiry
            });

            if (error) {
                console.error("Voucher generation error:", error);

                if (message) {
                    message.textContent =
                        `Could not generate vouchers: ${error.message}`;
                }

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML =
                        '<i data-lucide="ticket-plus"></i> Generate Vouchers';
                    window.lucide?.createIcons();
                }

                return;
            }

            const generated = Array.isArray(data) ? data : [];

            if (message) {
                message.textContent =
                    `Successfully generated ${generated.length} voucher${generated.length === 1 ? "" : "s"}. Copy the codes below and share them with your customers.`;
            }

            form.reset();

            if ($("voucherQuantity")) {
                $("voucherQuantity").value = "1";
            }

            await loadVouchers();

            if (generated.length) {
                const codes = generated
                    .map((item) => item.voucher_code)
                    .filter(Boolean);

                const output = $("newVoucherCodes");

                if (output) {
                    output.hidden = false;

                    output.innerHTML = `
                        <h4>Newly generated codes</h4>
                        <p>Copy and securely share these codes. They are redeemable once.</p>

                        ${codes.map((code) => `
                            <div class="new-voucher-code">
                                <code>${escapeHTML(code)}</code>

                                <button
                                    type="button"
                                    class="copy-new-voucher"
                                    data-code="${escapeHTML(code)}">
                                    Copy
                                </button>
                            </div>
                        `).join("")}
                    `;

                    output.querySelectorAll(".copy-new-voucher").forEach((button) => {
                        button.addEventListener("click", async () => {
                            const code = button.dataset.code || "";

                            try {
                                await navigator.clipboard.writeText(code);
                                notify(`Copied voucher code: ${code}`);
                            } catch (copyError) {
                                window.prompt("Copy this voucher code:", code);
                            }
                        });
                    });
                }
            }

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML =
                    '<i data-lucide="ticket-plus"></i> Generate Vouchers';
                window.lucide?.createIcons();
            }
        });

        loadVouchers();
    }

    // NOTIFICATIONS
    function initializeNotifications() {
        const form = $("notificationForm");

        form?.addEventListener("submit", (event) => {
            event.preventDefault();

            notify(
                "Email notifications require a secure server-side email service."
            );
        });
    }

    // FILTERS
    function initializeFilters() {
        $("paymentSearch")?.addEventListener(
            "input",
            renderPaymentRequests
        );

        $("paymentStatusFilter")?.addEventListener(
            "change",
            renderPaymentRequests
        );

        $("paymentMethodFilter")?.addEventListener(
            "change",
            renderPaymentRequests
        );

        $("refreshPayments")?.addEventListener(
            "click",
            loadPaymentRequests
        );

        $("customerSearch")?.addEventListener(
            "input",
            renderCustomers
        );
    }

    // LOGOUT
    async function logout() {
        if (!confirm("Are you sure you want to log out?")) return;

        const { error } = await supabase.auth.signOut();

        if (error) {
            alert(error.message);
            return;
        }

        window.location.href = `${BASE_URL}/auth.html`;
    }

    // START
    const authorized = await verifyAdmin();

    if (!authorized) return;

    initializeNavigation();
    initializeFilters();
    initializeVouchers();
    initializeNotifications();

    $("adminLogout")?.addEventListener("click", logout);

    await Promise.all([
        loadPaymentRequests(),
        loadCustomers(),
        loadSubscriptions()
    ]);

    console.log("LifeTrack admin dashboard is ready.");
});
