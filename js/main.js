/* =========================================
   AHMAD KHALEL — MAIN JS
   UI interactions + brand motion
   ========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById("menu-toggle");
    const mainNav = document.getElementById("main-nav");
    const navLinks = document.querySelectorAll(".nav-link");
    const filterButtons = document.querySelectorAll(".filter-button");
    const projectCards = document.querySelectorAll(".project-card");
    const shareButton = document.getElementById("share-website");
    const siteHeader = document.querySelector(".site-header");
    const languageToggle = document.getElementById("language-toggle");

    /* =========================================
       MOBILE MENU
       ========================================= */

    const closeMenu = () => {
        if (!menuToggle || !mainNav) return;

        mainNav.classList.remove("open");
        menuToggle.classList.remove("active");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "فتح القائمة");
    };

    if (menuToggle && mainNav) {
        menuToggle.addEventListener("click", () => {
            const isOpen = mainNav.classList.toggle("open");

            menuToggle.classList.toggle("active", isOpen);
            menuToggle.setAttribute("aria-expanded", String(isOpen));
            menuToggle.setAttribute(
                "aria-label",
                isOpen ? "إغلاق القائمة" : "فتح القائمة"
            );
        });

        navLinks.forEach((link) => {
            link.addEventListener("click", closeMenu);
        });

        document.addEventListener("click", (event) => {
            if (!mainNav.classList.contains("open")) return;

            const target = event.target;

            if (
                target instanceof Node &&
                !mainNav.contains(target) &&
                !menuToggle.contains(target)
            ) {
                closeMenu();
            }
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 768) {
                closeMenu();
            }
        });
    }

    /* =========================================
       PORTFOLIO FILTER
       ========================================= */

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const selectedFilter = button.dataset.filter || "all";

            filterButtons.forEach((item) => {
                item.classList.remove("active");
                item.setAttribute("aria-selected", "false");
            });

            button.classList.add("active");
            button.setAttribute("aria-selected", "true");

            projectCards.forEach((project) => {
                const projectCategory = project.dataset.category || "";
                const shouldShow =
                    selectedFilter === "all" ||
                    selectedFilter === projectCategory;

                project.classList.toggle("is-hidden", !shouldShow);
            });
        });
    });

    /* =========================================
       WEBSITE SHARING
       ========================================= */

    if (shareButton) {
        shareButton.addEventListener("click", async () => {
            const shareData = {
                title: "Ahmad Khalel",
                text: "Ahmad Khalel — Visual Identity & Web",
                url: window.location.href
            };

            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                } catch (error) {
                    // Native share was dismissed or failed.
                }
                return;
            }

            try {
                await navigator.clipboard.writeText(window.location.href);

                const originalHTML = shareButton.innerHTML;
                shareButton.innerHTML = "✓";
                shareButton.setAttribute("aria-label", "تم نسخ الرابط");

                window.setTimeout(() => {
                    shareButton.innerHTML = originalHTML;
                    shareButton.setAttribute("aria-label", "مشاركة الموقع");
                }, 1800);
            } catch (error) {
                window.prompt("انسخ رابط الموقع:", window.location.href);
            }
        });
    }

    /* =========================================
       HEADER VISIBILITY + SCROLL STATE
       ========================================= */

    if (siteHeader) {
        let lastScrollY = Math.max(window.scrollY, 0);
        let ticking = false;

        const updateHeader = () => {
            const currentScrollY = Math.max(window.scrollY, 0);

            siteHeader.classList.toggle(
                "header-scrolled",
                currentScrollY > 12
            );

            if (currentScrollY <= 8) {
                siteHeader.classList.remove("header-hidden");
            } else if (currentScrollY > lastScrollY + 4) {
                siteHeader.classList.add("header-hidden");
            } else if (currentScrollY < lastScrollY - 4) {
                siteHeader.classList.remove("header-hidden");
            }

            lastScrollY = currentScrollY;
            ticking = false;
        };

        window.addEventListener(
            "scroll",
            () => {
                if (!ticking) {
                    window.requestAnimationFrame(updateHeader);
                    ticking = true;
                }
            },
            { passive: true }
        );

        updateHeader();
    }

    /* =========================================
       ACTIVE NAVIGATION
       ========================================= */

    const sections = document.querySelectorAll("main section[id]");

    if ("IntersectionObserver" in window && sections.length) {
        const sectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    const id = entry.target.id;

                    navLinks.forEach((link) => {
                        const isActive = link.getAttribute("href") === `#${id}`;
                        link.classList.toggle("active", isActive);
                    });
                });
            },
            {
                rootMargin: "-35% 0px -55% 0px",
                threshold: 0
            }
        );

        sections.forEach((section) => sectionObserver.observe(section));
    }

    /* =========================================
       LANGUAGE STATE
       Content translation remains separate.
       ========================================= */

    if (languageToggle) {
        languageToggle.addEventListener("click", () => {
            const isEnglish = document.documentElement.lang === "en";

            if (isEnglish) {
                document.documentElement.lang = "ar";
                document.documentElement.dir = "rtl";
                languageToggle.textContent = "EN";
                languageToggle.setAttribute(
                    "aria-label",
                    "تغيير لغة الموقع إلى الإنجليزية"
                );
                languageToggle.setAttribute("title", "English");
            } else {
                document.documentElement.lang = "en";
                document.documentElement.dir = "ltr";
                languageToggle.textContent = "AR";
                languageToggle.setAttribute(
                    "aria-label",
                    "Switch website language to Arabic"
                );
                languageToggle.setAttribute("title", "العربية");
            }
        });
    }
});

/* =========================================
   REVEAL ANIMATIONS
   ========================================= */

(() => {
    document.documentElement.classList.add("js-enabled");

    const revealElements = document.querySelectorAll(
        [
            ".section-label",
            ".section-title",
            ".hero-content",
            ".hero-brand-composition",
            ".about-detail",
            ".service-item",
            ".project-card",
            ".process-item",
            ".process-note",
            ".contact-method",
            ".social-link",
            ".contact-form-wrapper"
        ].join(", ")
    );

    if (!revealElements.length) return;

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion || !("IntersectionObserver" in window)) {
        revealElements.forEach((element) => {
            element.classList.add("is-visible");
        });
        return;
    }

    revealElements.forEach((element, index) => {
        element.classList.add("reveal");
        element.style.setProperty(
            "--reveal-delay",
            `${Math.min(index % 5, 4) * 55}ms`
        );
    });

    const observer = new IntersectionObserver(
        (entries, revealObserver) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                entry.target.classList.add("is-visible");
                revealObserver.unobserve(entry.target);
            });
        },
        {
            threshold: 0.08,
            rootMargin: "0px 0px -50px 0px"
        }
    );

    revealElements.forEach((element) => observer.observe(element));
})();

/* =========================================
   SAFE REVEAL STYLES
   ========================================= */

(() => {
    const style = document.createElement("style");

    style.textContent = `
        .js-enabled .reveal {
            opacity: 0;
            transform: translateY(24px);
            transition:
                opacity 700ms cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay, 0ms),
                transform 700ms cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay, 0ms);
        }

        .js-enabled .reveal.is-visible {
            opacity: 1;
            transform: translateY(0);
        }

        @media (prefers-reduced-motion: reduce) {
            .js-enabled .reveal,
            .js-enabled .reveal.is-visible {
                opacity: 1;
                transform: none;
                transition: none;
            }
        }
    `;

    document.head.appendChild(style);
})();
