
// =========================================
// LIFETRACK — LANDING PAGE INTERACTIONS
// js/script.js
// =========================================

document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // MOBILE NAVIGATION
    // =====================================

    const menuToggle = document.querySelector(".menu-toggle");
    const navLinks = document.querySelector(".nav-links");

    if (menuToggle && navLinks) {

        menuToggle.addEventListener("click", () => {

            const isOpen = navLinks.classList.toggle("active");

            menuToggle.setAttribute("aria-expanded", isOpen);

            menuToggle.innerHTML = isOpen
                ? '<i class="icon-x"></i>'
                : '<i class="icon-menu"></i>';

            if (window.lucide) {
                lucide.createIcons();
            }
        });

        // Close menu after clicking a navigation link
        navLinks.querySelectorAll("a").forEach(link => {

            link.addEventListener("click", () => {

                navLinks.classList.remove("active");

                menuToggle.setAttribute("aria-expanded", "false");

                menuToggle.innerHTML = '<i class="icon-menu"></i>';

                if (window.lucide) {
                    lucide.createIcons();
                }
            });

        });

        // Close menu when clicking outside
        document.addEventListener("click", event => {

            if (
                !menuToggle.contains(event.target) &&
                !navLinks.contains(event.target)
            ) {
                navLinks.classList.remove("active");

                menuToggle.setAttribute("aria-expanded", "false");

                menuToggle.innerHTML = '<i class="icon-menu"></i>';

                if (window.lucide) {
                    lucide.createIcons();
                }
            }

        });

    }

    // =====================================
    // SMOOTH SCROLLING
    // =====================================

    document.querySelectorAll('a[href^="#"]').forEach(link => {

        link.addEventListener("click", event => {

            const targetId = link.getAttribute("href");

            if (!targetId || targetId === "#") return;

            const target = document.querySelector(targetId);

            if (target) {

                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }

        });

    });

    // =====================================
    // ACTIVE NAVIGATION LINK
    // =====================================

    const sections = document.querySelectorAll("section[id]");
    const navigationLinks = document.querySelectorAll(".nav-links a[href^='#']");

    if ("IntersectionObserver" in window) {

        const sectionObserver = new IntersectionObserver(entries => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    navigationLinks.forEach(link => {

                        link.classList.remove("active");

                        if (
                            link.getAttribute("href") ===
                            "#" + entry.target.id
                        ) {
                            link.classList.add("active");
                        }

                    });

                }

            });

        }, {
            rootMargin: "-35% 0px -55% 0px"
        });

        sections.forEach(section => {
            sectionObserver.observe(section);
        });

    }

    // =====================================
    // FAQ INTERACTIONS
    // =====================================

    const faqItems = document.querySelectorAll(".faq-item");

    faqItems.forEach(item => {

        const question = item.querySelector("h3");

        const answer = item.querySelector("p");

        if (!question || !answer) return;

        question.style.cursor = "pointer";

        question.setAttribute("role", "button");
        question.setAttribute("tabindex", "0");
        question.setAttribute("aria-expanded", "false");

        answer.hidden = true;

        const toggleAnswer = () => {

            const isOpen = !answer.hidden;

            answer.hidden = isOpen;

            question.setAttribute(
                "aria-expanded",
                String(!isOpen)
            );

            item.classList.toggle("faq-open", !isOpen);

        };

        question.addEventListener("click", toggleAnswer);

        question.addEventListener("keydown", event => {

            if (event.key === "Enter" || event.key === " ") {

                event.preventDefault();

                toggleAnswer();

            }

        });

    });

    // =====================================
    // SCROLL REVEAL EFFECT
    // =====================================

    const revealElements = document.querySelectorAll(
        ".feature-card, .step-card, .pricing-card, .section-heading"
    );

    if ("IntersectionObserver" in window) {

        const revealObserver = new IntersectionObserver(entries => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("revealed");

                    revealObserver.unobserve(entry.target);

                }

            });

        }, {
            threshold: 0.12
        });

        revealElements.forEach(element => {

            element.style.opacity = "0";
            element.style.transform = "translateY(25px)";
            element.style.transition =
                "opacity 0.6s ease, transform 0.6s ease";

            revealObserver.observe(element);

        });

    } else {

        revealElements.forEach(element => {
            element.classList.add("revealed");
        });

    }

    // =====================================
    // PRICING BUTTON PROTECTION
    // =====================================

    document.querySelectorAll(".pricing-card .btn").forEach(button => {

        button.addEventListener("click", event => {

            const destination = button.getAttribute("href");

            if (!destination || destination === "#") {

                event.preventDefault();

                alert("Please visit the account page to continue.");

            }

        });

    });

    // =====================================
    // CURRENT YEAR
    // =====================================

    const yearElement = document.getElementById("currentYear");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    // =====================================
    // LUCIDE ICONS
    // =====================================

    if (window.lucide) {
        lucide.createIcons();
    }

    console.log("LifeTrack landing page initialized.");

});

// =========================================
// SCROLL REVEAL CLASS
// =========================================

document.addEventListener("DOMContentLoaded", () => {

    const style = document.createElement("style");

    style.textContent = `
        .revealed {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }

        .faq-item.faq-open {
            border-color: #7155e8;
            box-shadow: 0 8px 25px rgba(113, 85, 232, 0.07);
        }

        .nav-links a.active {
            color: #7155e8;
        }
    `;

    document.head.appendChild(style);

});
