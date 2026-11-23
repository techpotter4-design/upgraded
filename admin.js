
/* ==========================================
   LIFETRACK ADMIN CONTROL CENTRE
   ADMIN DASHBOARD JAVASCRIPT
========================================== */

document.addEventListener("DOMContentLoaded", async () => {

    // ======================================
    // 1. SUPABASE CONNECTION
    // ======================================

    const supabaseClient = window.lifeTrackSupabase;

    if (!supabaseClient) {
        console.error("LifeTrack Supabase is not connected.");
        return;
    }


    // ======================================
    // 2. ELEMENTS
    // ======================================

    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const pageTitle = document.getElementById("pageTitle");
    const logoutButton = document.getElementById("adminLogout");

    const navLinks = document.querySelectorAll(".nav-link[data-page]");
    const pageSections = document.querySelectorAll(".page-section");

    const paymentRequests = document.getElementById("paymentRequests");
    const paymentSearch = document.getElementById("paymentSearch");
    const paymentStatusFilter = document.getElementById("paymentStatusFilter");
    const paymentMethodFilter = document.getElementById("paymentMethodFilter");
    const refreshPayments = document.getElementById("refreshPayments");


    // ======================================
    // 3. PAGE TITLES
    // ======================================

    const pageNames = {
        overview: "Overview",
        payments: "Payment Management",
        vouchers: "Voucher Centre",
        customers: "Customer Management",
        subscriptions: "Subscription Management",
        analytics: "Platform Analytics",
        activity: "Activity Logs",
        settings: "Platform Settings"
    };


    // ======================================
    // 4. ADMIN AUTHENTICATION
    // ======================================

    async function checkAdminAccess() {

        const {
            data: { user },
            error
        } = await supabaseClient.auth.getUser();

        if (error || !user) {
            window.location.replace("auth.html");
            return false;
        }

        const isAdmin = user.app_metadata?.role === "admin";

        if (!isAdmin) {
            alert("Access denied. Administrator privileges are required.");
            await supabaseClient.auth.signOut();
            window.location.replace("auth.html");
            return false;
        }

        const adminEmail = document.getElementById("adminEmail");

        if (adminEmail) {
            adminEmail.textContent = user.email || "Administrator";
        }

        return true;
    }


    const hasAdminAccess = await checkAdminAccess();

    if (!hasAdminAccess) return;


    // ======================================
    // 5. PAGE NAVIGATION
    // ======================================

    function openPage(pageName) {

        if (!pageNames[pageName]) return;

        navLinks.forEach(link => {
            link.classList.toggle(
                "active",
                link.dataset.page === pageName
            );
        });

        pageSections.forEach(section => {
            section.classList.toggle(
                "active",
                section.id === pageName
            );
        });

        if (pageTitle) {
            pageTitle.textContent = pageNames[pageName];
        }

        history.replaceState(null, "", `#${pageName}`);

        if (sidebar) {
            sidebar.classList.remove("open");
        }

        if (pageName === "payments") {
            loadPaymentRequests();
        }
    }


    navLinks.forEach(link => {

        link.addEventListener("click", () => {
            openPage(link.dataset.page);
        });

    });


    // Buttons that navigate to another page
    document.querySelectorAll("[data-page]").forEach(button => {

        if (button.classList.contains("nav-link")) return;

        button.addEventListener("click", () => {
            openPage(button.dataset.page);
        });

    });


    // Open page from URL hash
    const requestedPage = window.location.hash.replace("#", "");

    if (pageNames[requestedPage]) {
        openPage(requestedPage);
    }


    // ======================================
    // 6. MOBILE SIDEBAR
    // ======================================

    if (menuToggle && sidebar) {

        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });

        document.addEventListener("click", event => {

            const clickedInsideSidebar = sidebar.contains(event.target);
            const clickedMenuButton = menuToggle.contains(event.target);

            if (
                !clickedInsideSidebar &&
                !clickedMenuButton
            ) {
                sidebar.classList.remove("open");
            }

        });

    }


    // ======================================
    // 7. PAYMENT MANAGEMENT
    // ======================================

    let allPayments = [];


    function updatePaymentStatistics(payments) {

        const total = payments.length;

        const pending = payments.filter(
            payment => payment.status === "pending"
        ).length;

        const verified = payments.filter(
            payment => payment.status === "verified"
        ).length;

        const rejected = payments.filter(
            payment => payment.status === "rejected"
        ).length;

        document.getElementById("paymentTotal").textContent = total;
        document.getElementById("paymentPending").textContent = pending;
        document.getElementById("paymentVerified").textContent = verified;
        document.getElementById("paymentRejected").textContent = rejected;

        const badge = document.getElementById("paymentBadge");

        if (badge) {
            badge.textContent = pending;
        }

        const overviewPending = document.getElementById("pendingPayments");

        if (overviewPending) {
            overviewPending.textContent = pending;
        }
    }


    function formatDate(dateValue) {

        if (!dateValue) return "Not available";

        return new Date(dateValue).toLocaleString("en-KE", {
            dateStyle: "medium",
            timeStyle: "short"
        });

    }


    function escapeHTML(value) {

        return String(value ?? "").replace(/[&<>"']/g, character => {

            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];

        });

    }


    async function loadPaymentRequests() {

        if (!paymentRequests) return;

        paymentRequests.innerHTML = `
            <p>Loading payment records...</p>
        `;

        const {
            data,
            error
        } = await supabaseClient
            .from("payment_requests")
            .select(`
                id,
                customer_name,
                customer_email,
                plan,
                payment_method,
                transaction_reference,
                screenshot_path,
                status,
                created_at
            `)
            .order("created_at", { ascending: false });


        if (error) {

            console.error("Payment loading error:", error);

            paymentRequests.innerHTML = `
                <p>Unable to load payment records.
                Check your Supabase permissions and database setup.</p>
            `;

            return;
        }


        allPayments = data || [];

        updatePaymentStatistics(allPayments);

        renderPaymentRequests();

    }


    // ======================================
    // 8. PAYMENT FILTERING
    // ======================================

    function renderPaymentRequests() {

        if (!paymentRequests) return;

        const searchTerm = paymentSearch?.value
            .trim()
            .toLowerCase() || "";

        const selectedStatus = paymentStatusFilter?.value || "all";
        const selectedMethod = paymentMethodFilter?.value || "all";


        const filteredPayments = allPayments.filter(payment => {

            const matchesSearch = [
                payment.customer_name,
                payment.customer_email,
                payment.transaction_reference
            ].some(value =>
                String(value || "").toLowerCase().includes(searchTerm)
            );

            const matchesStatus =
                selectedStatus === "all" ||
                payment.status === selectedStatus;

            const matchesMethod =
                selectedMethod === "all" ||
                payment.payment_method === selectedMethod;

            return matchesSearch && matchesStatus && matchesMethod;

        });


        if (filteredPayments.length === 0) {

            paymentRequests.innerHTML = `
                <p>No payment records match your search.</p>
            `;

            return;
        }


        const tableRows = filteredPayments.map(payment => {

            const statusClass = escapeHTML(payment.status);

            return `
                <tr>

                    <td>
                        <strong>${escapeHTML(payment.customer_name)}</strong>
                        <br>
                        <small>${escapeHTML(payment.customer_email)}</small>
                    </td>

                    <td>
                        ${escapeHTML(payment.plan)}
                    </td>

                    <td>
                        ${escapeHTML(payment.payment_method)}
                    </td>

                    <td>
                        ${escapeHTML(payment.transaction_reference)}
                    </td>

                    <td>
                        <span class="status-badge ${statusClass}">
                            ${escapeHTML(payment.status)}
                        </span>
                    </td>

                    <td>
                        ${formatDate(payment.created_at)}
                    </td>

                    <td>
                        <button
                            type="button"
                            class="view-payment"
                            data-payment-id="${escapeHTML(payment.id)}"
                        >
                            View
                        </button>
                    </td>

                </tr>
            `;

        }).join("");


        paymentRequests.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>Plan</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;


        // Open payment details
        paymentRequests.querySelectorAll(".view-payment").forEach(button => {

            button.addEventListener("click", () => {

                const payment = allPayments.find(
                    item => item.id === button.dataset.paymentId
                );

                if (payment) {
                    showPaymentDetails(payment);
                }

            });

        });

    }


    // ======================================
    // 9. PAYMENT DETAILS
    // ======================================

    async function showPaymentDetails(payment) {

        const screenshotResult = await supabaseClient
            .storage
            .from("payment-screenshots")
            .createSignedUrl(payment.screenshot_path, 60);


        let screenshotHTML = `
            <p>Screenshot unavailable.</p>
        `;

        if (!screenshotResult.error && screenshotResult.data?.signedUrl) {

            screenshotHTML = `
                <a
                    href="${escapeHTML(screenshotResult.data.signedUrl)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Open payment screenshot
                </a>
            `;

        }


        const details = [
            `Customer: ${payment.customer_name}`,
            `Email: ${payment.customer_email}`,
            `Plan: ${payment.plan}`,
            `Method: ${payment.payment_method}`,
            `Transaction reference: ${payment.transaction_reference}`,
            `Status: ${payment.status}`,
            `Submitted: ${formatDate(payment.created_at)}`
        ].join("\n");


        alert(details + "\n\nPayment screenshot: " +
            (screenshotResult.error ? "Unavailable" : "Available"));

        // Screenshot link is also logged for now.
        // A dedicated secure payment review window will be built next.
        console.info("Payment screenshot:", screenshotHTML);

    }


    // Search
    if (paymentSearch) {
        paymentSearch.addEventListener("input", renderPaymentRequests);
    }

    // Status filter
    if (paymentStatusFilter) {
        paymentStatusFilter.addEventListener("change", renderPaymentRequests);
    }

    // Method filter
    if (paymentMethodFilter) {
        paymentMethodFilter.addEventListener("change", renderPaymentRequests);
    }

    // Refresh
    if (refreshPayments) {
        refreshPayments.addEventListener("click", loadPaymentRequests);
    }


    // ======================================
    // 10. VOUCHER FORM
    // ======================================

    const voucherForm = document.getElementById("voucherGeneratorForm");
    const voucherMessage = document.getElementById("voucherMessage");

    if (voucherForm) {

        voucherForm.addEventListener("submit", async event => {

            event.preventDefault();

            const email = document.getElementById("voucherEmail").value.trim();
            const plan = document.getElementById("voucherPlan").value;

            if (!email || !plan) {

                voucherMessage.textContent =
                    "Please complete all voucher fields.";

                return;
            }

            voucherMessage.textContent =
                "Voucher generation will be connected to the secure backend next.";

        });

    }


    // ======================================
    // 11. ADMIN LOGOUT
    // ======================================

    if (logoutButton) {

        logoutButton.addEventListener("click", async () => {

            const confirmLogout = confirm(
                "Are you sure you want to sign out?"
            );

            if (!confirmLogout) return;

            const { error } = await supabaseClient.auth.signOut();

            if (error) {

                alert("Unable to sign out. Please try again.");
                console.error(error);

                return;
            }

            window.location.replace("auth.html");

        });

    }


    // ======================================
    // 12. INITIAL ADMIN OVERVIEW
    // ======================================

    document.getElementById("totalCustomers").textContent = "—";
    document.getElementById("activeSubscriptions").textContent = "—";
    document.getElementById("vouchersIssued").textContent = "—";

    // Load payment statistics on startup
    await loadPaymentRequests();


    // ======================================
    // 13. ICONS
    // ======================================

    if (window.lucide) {
        window.lucide.createIcons();
    }

    console.log("LifeTrack Admin Control Centre initialized.");

});
