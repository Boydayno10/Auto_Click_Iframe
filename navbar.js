(function () {
    'use strict';

    function initNavIndicator() {
        const navList = document.querySelector('.navbar ul');
        if (!navList) return;

        const links = Array.from(navList.querySelectorAll('a'));
        if (!links.length) return;

        let activeLink = null;

        function setIndicatorForLink(link) {
            if (!link) {
                navList.style.setProperty('--nav-indicator-visible', '0');
                return;
            }

            const navRect = navList.getBoundingClientRect();
            const linkRect = link.getBoundingClientRect();

            const x = Math.max(0, linkRect.left - navRect.left);
            const w = Math.max(0, linkRect.width);

            navList.style.setProperty('--nav-indicator-x', `${x}px`);
            navList.style.setProperty('--nav-indicator-w', `${w}px`);
            navList.style.setProperty('--nav-indicator-visible', w > 0 ? '1' : '0');
        }

        function pickActiveLinkFromLocation() {
            const path = (window.location.pathname || '').toLowerCase();
            const isOptionsPage = path.endsWith('/options.html') || path.endsWith('options.html');

            if (isOptionsPage) {
                return null;
            }

            const currentHash = window.location.hash || '';

            // When index opens without a hash, treat it as the implicit "Início" (no highlighted section).
            if (!currentHash) {
                return null;
            }

            // Back-compat: historically Docs used #Inicio. Now #Inicio means "Início" (no highlight).
            if (currentHash.toLowerCase() === '#inicio') {
                return null;
            }

            if (currentHash) {
                for (const link of links) {
                    try {
                        const url = new URL(link.getAttribute('href') || '', window.location.href);
                        if (url.hash === currentHash) {
                            return link;
                        }
                    } catch {
                        // ignore invalid hrefs
                    }
                }
            }

            return null;
        }

        function updateActiveLink() {
            activeLink = pickActiveLinkFromLocation();
            requestAnimationFrame(() => setIndicatorForLink(activeLink));
        }

        function onResize() {
            requestAnimationFrame(() => setIndicatorForLink(activeLink));
        }

        // Update on in-page navigation changes.
        window.addEventListener('hashchange', updateActiveLink);
        window.addEventListener('resize', onResize);

        // Update immediately on clicks.
        navList.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const link = target.closest('a');
            if (!link) return;

            // Give immediate visual feedback.
            setIndicatorForLink(link);

            // Let the browser update the hash first.
            window.setTimeout(updateActiveLink, 0);
        });

        updateActiveLink();
    }

    function initNavbarMenu() {
        const menuButton = document.querySelector('.topbar-menu-btn');
        const overlay = document.querySelector('.topbar-menu-overlay');
        const menu = document.querySelector('.topbar-menu');
        const closeButton = document.querySelector('.topbar-menu-close');

        if (!menuButton || !overlay || !menu || !closeButton) {
            return;
        }

        let closeTimerId = 0;

        function setExpanded(isExpanded) {
            menuButton.setAttribute('aria-expanded', String(isExpanded));
        }

        function openMenu() {
            if (closeTimerId) {
                window.clearTimeout(closeTimerId);
                closeTimerId = 0;
            }

            overlay.hidden = false;
            menu.hidden = false;

            // Start closed (for animation), then open on next frame.
            menu.dataset.open = 'false';
            overlay.dataset.open = 'false';
            requestAnimationFrame(() => {
                menu.dataset.open = 'true';
                overlay.dataset.open = 'true';
            });

            setExpanded(true);

            const firstFocusable = menu.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }

        function closeMenu() {
            menu.dataset.open = 'false';
            overlay.dataset.open = 'false';
            setExpanded(false);

            // Wait for the slide/fade animation before hiding.
            if (closeTimerId) {
                window.clearTimeout(closeTimerId);
            }

            closeTimerId = window.setTimeout(() => {
                if (menu.dataset.open === 'false') {
                    menu.hidden = true;
                }
                if (overlay.dataset.open === 'false') {
                    overlay.hidden = true;
                }
                closeTimerId = 0;
            }, 240);

            menuButton.focus();
        }

        function toggleMenu() {
            const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        }

        menuButton.addEventListener('click', toggleMenu);
        closeButton.addEventListener('click', closeMenu);
        overlay.addEventListener('click', closeMenu);

        menu.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;

            const link = target.closest('a');
            if (link) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
            if (isOpen) {
                event.preventDefault();
                closeMenu();
            }
        });
    }

    function initLanguageSwitcher() {
        const switchers = Array.from(document.querySelectorAll('.topbar-lang'));
        if (!switchers.length) return;

        const root = document.documentElement;
        const storage = (typeof chrome !== 'undefined' && chrome.storage && (chrome.storage.sync || chrome.storage.local))
            ? (chrome.storage.sync || chrome.storage.local)
            : null;

        const normalizeLang = (lang) => (lang === 'en' ? 'en' : 'pt-BR');
        const labelForLang = (lang) => (lang === 'en' ? 'EN' : 'PT');

        const topbarTranslations = {
            'pt-BR': {
                docs: 'Docs',
                teste: 'Teste',
                privacy: 'Políticas de privacidade',
                extension: 'Extensão'
            },
            en: {
                docs: 'Docs',
                teste: 'Test',
                privacy: 'Privacy policy',
                extension: 'Extension'
            }
        };

        function applyTopbarTranslations(lang) {
            const normalized = normalizeLang(lang);
            const labels = topbarTranslations[normalized] || topbarTranslations['pt-BR'];

            const linkMap = [
                { selector: '.navbar a[href*="#docs"]', text: labels.docs },
                { selector: '.navbar a[href*="#teste"]', text: labels.teste },
                { selector: '.navbar a[href*="#privacy"]', text: labels.privacy },
                { selector: '.navbar a[href$="options.html"], .navbar a[href*="options.html"]', text: labels.extension }
            ];

            linkMap.forEach(({ selector, text }) => {
                document.querySelectorAll(selector).forEach((el) => {
                    el.textContent = text;
                });
            });

            const menuMap = [
                { selector: '.topbar-menu-link[href*="#docs"]', text: labels.docs },
                { selector: '.topbar-menu-link[href*="#teste"]', text: labels.teste },
                { selector: '.topbar-menu-link[href*="#privacy"]', text: labels.privacy },
                { selector: '.topbar-menu-link[href$="options.html"], .topbar-menu-link[href*="options.html"]', text: labels.extension }
            ];

            menuMap.forEach(({ selector, text }) => {
                document.querySelectorAll(selector).forEach((el) => {
                    el.textContent = text;
                });
            });
        }

        function persistLanguage(lang) {
            if (storage && typeof storage.set === 'function') {
                try {
                    storage.set({ uiLanguage: lang });
                } catch {
                    // fallback below
                }
            }

            try {
                window.localStorage.setItem('uiLanguage', lang);
            } catch {
                // ignore
            }

            try {
                window.postMessage({
                    source: 'acfh-options-page',
                    type: 'acfh-storage-update',
                    items: { uiLanguage: lang }
                }, '*');
            } catch {
                // ignore
            }
        }

        function applyLanguage(lang, persist, emitEvent = true) {
            const normalized = normalizeLang(lang);
            root.setAttribute('lang', normalized);
            applyTopbarTranslations(normalized);

            switchers.forEach((switcher) => {
                const code = switcher.querySelector('.topbar-lang-code');
                if (code) {
                    code.textContent = labelForLang(normalized);
                }

                switcher.querySelectorAll('[data-lang]').forEach((btn) => {
                    btn.setAttribute('aria-pressed', String(btn.getAttribute('data-lang') === normalized));
                });

                closeMenu(switcher);
            });

            if (persist) {
                persistLanguage(normalized);
            }

            if (emitEvent) {
                try {
                    window.dispatchEvent(new CustomEvent('acfh-language-change', { detail: { lang: normalized } }));
                } catch {
                    // ignore
                }
            }
        }

        function loadStoredLanguage() {
            const fallbackLang = normalizeLang(root.getAttribute('lang') || 'pt-BR');

            let storedLocal = null;
            try {
                storedLocal = window.localStorage.getItem('uiLanguage');
            } catch {
                // ignore
            }

            if (storage && typeof storage.get === 'function') {
                try {
                    storage.get(['uiLanguage'], (data) => {
                        const stored = (data && data.uiLanguage) ? data.uiLanguage : (storedLocal || fallbackLang);
                        applyLanguage(stored, false);
                        try {
                            window.localStorage.setItem('uiLanguage', normalizeLang(stored));
                        } catch {
                            // ignore
                        }
                    });
                    return;
                } catch {
                    // fallback below
                }
            }

            applyLanguage(storedLocal || fallbackLang, false);
        }

        function closeMenu(switcher) {
            const button = switcher.querySelector('.topbar-lang-btn');
            const menu = switcher.querySelector('.topbar-lang-menu');
            if (!button || !menu) return;
            menu.hidden = true;
            button.setAttribute('aria-expanded', 'false');
        }

        function toggleMenu(switcher) {
            const button = switcher.querySelector('.topbar-lang-btn');
            const menu = switcher.querySelector('.topbar-lang-menu');
            if (!button || !menu) return;
            const isOpen = button.getAttribute('aria-expanded') === 'true';
            switchers.forEach((other) => {
                if (other !== switcher) {
                    closeMenu(other);
                }
            });
            menu.hidden = isOpen;
            button.setAttribute('aria-expanded', String(!isOpen));
        }

        switchers.forEach((switcher) => {
            const button = switcher.querySelector('.topbar-lang-btn');
            const menu = switcher.querySelector('.topbar-lang-menu');

            if (button && menu) {
                button.addEventListener('click', (event) => {
                    event.stopPropagation();
                    toggleMenu(switcher);
                });

                menu.addEventListener('click', (event) => {
                    const target = event.target;
                    if (!(target instanceof Element)) return;
                    const langBtn = target.closest('[data-lang]');
                    if (!langBtn) return;
                    const selected = langBtn.getAttribute('data-lang');
                    applyLanguage(selected, true, true);
                    closeMenu(switcher);
                });
            }
        });

        window.addEventListener('acfh-language-change', (event) => {
            const nextLang = event && event.detail ? event.detail.lang : null;
            if (!nextLang) return;
            applyLanguage(nextLang, false, false);
        });

        if (storage && chrome && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === 'local' && changes.uiLanguage && changes.uiLanguage.newValue) {
                    applyLanguage(changes.uiLanguage.newValue, false, false);
                }
            });
        }

        window.addEventListener('storage', (event) => {
            if (event.key === 'uiLanguage' && event.newValue) {
                applyLanguage(event.newValue, false, false);
            }
        });

        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'lang') {
                        const nextLang = root.getAttribute('lang');
                        if (nextLang) {
                            applyLanguage(nextLang, false, false);
                        }
                    }
                });
            });
            observer.observe(root, { attributes: true, attributeFilter: ['lang'] });
        }

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            switchers.forEach((switcher) => {
                if (!switcher.contains(target)) {
                    closeMenu(switcher);
                }
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            switchers.forEach((switcher) => closeMenu(switcher));
        });

        loadStoredLanguage();
    }

    function init() {
        initNavbarMenu();
        initNavIndicator();
        initLanguageSwitcher();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
