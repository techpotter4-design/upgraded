
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.lifeTrackSupabase;

    const BASE_URL = "https://upgraded-seven.vercel.app";

    if (!supabase) {
        alert("LifeTrack could not connect to Supabase.");
        return;
    }

    const $ = (id) => document.getElementById(id);

    let currentAdmin = null;
    let paymentRequests = [];
    let customers = [];
    let subscriptions = [];

    // ----------------------------------
    // ADMIN AUTHENTICATION
    // ----------------------------------

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

        currentAdmin = user;

        if ($("adminEmail")) {
            $("adminEmail").textContent = user.email || "Administrator";
        }

        if ($("profileName")) {
            $("profileName").textContent =
                user.user_metadata?.full_name || "Administrator";
        }

        return true;
    }

    // ----------------------------------
    // NOTIFICATIONS
    // ----------------------------------

    function notify(message, type = "info") {
        console.log(`[LifeTrack ${type}] ${message}`);

        const messageBox = $("adminMessage");

        if (messageBox) {
            messageBox.textContent = message;
            messageBox.className = `admin-message ${type}`;
            messageBox.hidden = false;
        } else {
            alert(message);
        }
    }

    function formatMoney(amount, currency = "KES") {
        const value = Number(amount || 0);

        return new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: currency || "KES",
            maximumFractionDigits: 2
        }).format(value);
    }

    function formatDate(date) {
        if (!date) return "—";

        return new Date(date).toLocaleDateString("en-KE", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
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

    function setText(id, value) {
        const element = $(id);
        if (element) element.textContent = value;
    }

    // ----------------------------------
    // PAGE NAVIGATION
    // ----------------------------------

    function initializeNavigation() {
        const navigationLinks = document.querySelectorAll(
            "[data-page], .nav-link"
        );

        navigationLinks.forEach((link) => {
            link.addEventListener("click", () => {
                const page = link.dataset.page;

                if (!page) return;

                document.querySelectorAll(".admin-page").forEach((section) => {
                    section.classList.remove("active");
                });

                const target = $(`${page}Page`) ||
                    $(`${page}-page`) ||
                    $(page);

                if (target) {
                    target.classList.add("active");
                }

                navigationLinks.forEach((item) => {
                    item.classList.remove("active");
                });

                link.classList.add("active");

                if ($("pageTitle")) {
                    $("pageTitle").textContent =
                        link.dataset.title ||
                        link.textContent.trim() ||
                        page;
                }

                if (window.innerWidth <= 850) {
                    $("sidebar")?.classList.remove("open");
                }
            });
        });

        $("menuToggle")?.addEventListener("click", () => {
            $("sidebar")?.classList.toggle("open");
        });
    }

    // ----------------------------------
    // LOAD PAYMENT REQUESTS
    // ----------------------------------

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
                    "<p>Could not load payments. Check administrator database permissions.</p>";
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

        const profileMap = new Map(
            (data || []).map((profile) => [profile.id, profile])
        );

        paymentRequests = paymentRequests.map((payment) => ({
            ...payment,
            customer: profileMap.get(payment.user_id) || null
        }));
    }

    function renderPaymentRequests() {
        const container = $("paymentRequests");
        if (!container) return;

        const search = ($("paymentSearch")?.value || "").toLowerCase();
        const status = $("paymentStatusFilter")?.value || "";
        const method = $("paymentMethodFilter")?.value || "";

        const filtered = paymentRequests.filter((payment) => {
            const customerName = payment.customer?.full_name || "";
            const customerEmail = payment.customer?.email || "";

            const matchesSearch = [
                customerName,
                customerEmail,
                payment.transaction_reference,
                payment.plan_name
            ].join(" ").toLowerCase().includes(search);

            return matchesSearch &&
                (!status || payment.status === status) &&
                (!method || payment.payment_method === method);
        });

        if (!filtered.length) {
            container.innerHTML = "<p>No payment requests found.</p>";
            return;
        }

        container.innerHTML = filtered.map((payment) => `
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
                    ${escapeHTML(payment.plan_name)}
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

                <div>
                    ${formatDate(payment.created_at)}
                </div>

                <div>
                    <button
                        type="button"
                        class="view-payment"
                        data-id="${escapeHTML(payment.id)}">
                        View
                    </button>
                </div>
            </div>
        `).join("");

        container.querySelectorAll(".view-payment").forEach((button) => {
            button.addEventListener("click", () => {
                showPaymentDetails(button.dataset.id);
            });
        });
    }

    function updatePaymentStatistics() {
        const total = paymentRequests.length;

        const pending = paymentRequests.filter(
            (p) => p.status === "pending"
        ).length;

        const verified = paymentRequests.filter(
            (p) => p.status === "verified"
        );

        const rejected = paymentRequests.filter(
            (p) => p.status === "rejected"
        ).length;

        const revenue = verified.reduce(
            (sum, payment) => sum + Number(payment.amount || 0),
            0
        );

        setText("paymentTotal", total);
        setText("paymentPending", pending);
        setText("paymentVerified", verified.length);
        setText("paymentRejected", rejected);

        setText("pendingPayments", pending);
        setText("verifiedPayments", verified.length);
        setText("rejectedPayments", rejected);
        setText("totalRevenue", formatMoney(revenue));
        setText("paymentBadge", pending);
    }

    function showPaymentDetails(id) {
        const payment = paymentRequests.find((item) => item.id === id);

        if (!payment) return;

        const details = [
            `Customer: ${payment.customer?.full_name || "Customer"}`,
            `Email: ${payment.customer?.email || "Unavailable"}`,
            `Plan: ${payment.plan_name}`,
            `Amount: ${formatMoney(payment.amount, payment.currency)}`,
            `Method: ${payment.payment_method}`,
            `Reference: ${payment.transaction_reference || "None"}`,
            `Status: ${payment.status}`,
            `Submitted: ${formatDate(payment.created_at)}`
        ].join("\n");

        alert(details);
    }

    // ----------------------------------
    // LOAD CUSTOMERS
    // ----------------------------------

    async function loadCustomers() {
        const container = $("customerList") || $("customersList");

        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, email, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Customer loading error:", error);

            if (container) {
                container.innerHTML =
                    "<p>Could not load customers. Check database permissions.</p>";
            }
            return;
        }

        customers = data || [];

        setText("totalCustomers", customers.length);

        if (!container) return;

        if (!customers.length) {
            container.innerHTML = "<p>No customers registered yet.</p>";
            return;
        }

        container.innerHTML = customers.map((customer) => `
            <div class="customer-row">
                <strong>${escapeHTML(
                    customer.full_name || "Customer"
                )}</strong>
                <span>${escapeHTML(customer.email || "No email")}</span>
                <small>${formatDate(customer.created_at)}</small>
            </div>
        `).join("");
    }

    // ----------------------------------
    // LOAD SUBSCRIPTIONS
    // ----------------------------------

    async function loadSubscriptions() {
        const container = $("subscriptionList") ||
            $("subscriptionsList");

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
                container.innerHTML =
                    "<p>Could not load subscriptions. Check database permissions.</p>";
            }
            return;
        }

        subscriptions = data || [];

        const active = subscriptions.filter(
            (subscription) =>
                subscription.status === "active" &&
                (!subscription.expires_at ||
                    new Date(subscription.expires_at) > new Date())
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

    // ----------------------------------
    // VOUCHERS
    // ----------------------------------

    function initializeVouchers() {
        const form = $("voucherGeneratorForm");

        if (!form) return;

        form.addEventListener("submit", (event) => {
            event.preventDefault();

            notify(
                "Voucher generation is not connected yet. We need to create a secure vouchers table and backend function first.",
                "warning"
            );
        });

        setText("vouchersIssued", "Not configured");
    }

    // ----------------------------------
    // NOTIFICATIONS
    // ----------------------------------

    function initializeNotifications() {
        const form = $("notificationForm");

        if (!form) return;

        form.addEventListener("submit", (event) => {
            event.preventDefault();

            notify(
                "Email notifications require a secure server-side email service. This form is not connected yet.",
                "warning"
            );
        });
    }

    // ----------------------------------
    // SEARCH AND FILTERS
    // ----------------------------------

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

        const customerSearch = $("customerSearch");

        customerSearch?.addEventListener("input", () => {
            const query = customerSearch.value.toLowerCase();

            document.querySelectorAll(".customer-row").forEach((row) => {
                row.hidden = !row.textContent.toLowerCase().includes(query);
            });
        });
    }

    // ----------------------------------
    // LOGOUT
    // ----------------------------------

    async function logout() {
        const confirmed = confirm("Are you sure you want to log out?");

        if (!confirmed) return;

        const { error } = await supabase.auth.signOut();

        if (error) {
            notify(error.message, "error");
            return;
        }

        window.location.href = `${BASE_URL}/auth.html`;
    }

    // ----------------------------------
    // START ADMIN DASHBOARD
    // ----------------------------------

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

    console.log("LifeTrack administrator dashboard initialized.");
});
           
