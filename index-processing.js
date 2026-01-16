(function () {
    'use strict';

    const MIN_PENDING_MS = 220;

    function normalizeSectionId(hash) {
        if (!hash) return 'inicio';
        const cleaned = hash.replace('#', '').trim();
        return cleaned || 'inicio';
    }

    function updateSectionVisibility() {
        const sectionId = normalizeSectionId(window.location.hash);
        const sections = Array.from(document.querySelectorAll('.landing-section'));
        if (!sections.length) return;

        let didShow = false;
        sections.forEach((section) => {
            const isTarget = section.id === sectionId;
            section.hidden = !isTarget;
            if (isTarget) {
                didShow = true;
            }
        });

        if (!didShow) {
            const fallback = document.getElementById('inicio');
            if (fallback) {
                fallback.hidden = false;
            }
        }
    }

    function markReady() {
        const root = document.documentElement;
        if (root.classList.contains('acfh-lang-init-pending')) {
            root.classList.remove('acfh-lang-init-pending');
        }
        root.classList.add('acfh-lang-init-ready');
    }

    function initIndexProcessing() {
        const startTime = Date.now();
        let didReady = false;

        function safeReady() {
            if (didReady) return;
            didReady = true;

            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, MIN_PENDING_MS - elapsed);
            window.setTimeout(markReady, remaining);
        }

        const root = document.documentElement;
        const storage = (typeof chrome !== 'undefined' && chrome.storage && (chrome.storage.sync || chrome.storage.local))
            ? (chrome.storage.sync || chrome.storage.local)
            : null;

        if (storage && typeof storage.get === 'function') {
            try {
                storage.get(['uiLanguage'], (data) => {
                    const lang = (data && data.uiLanguage) ? data.uiLanguage : (root.getAttribute('lang') || 'pt-BR');
                    root.setAttribute('lang', lang);
                    safeReady();
                });
            } catch {
                safeReady();
            }

            // Fallback: never keep the page hidden too long.
            window.setTimeout(safeReady, 800);
            return;
        }

        try {
            const storedLang = window.localStorage ? window.localStorage.getItem('uiLanguage') : null;
            if (storedLang) {
                root.setAttribute('lang', storedLang);
            }
        } catch {
            // ignore
        }

        safeReady();
    }

    function initSectionRouting() {
        updateSectionVisibility();
        window.addEventListener('hashchange', updateSectionVisibility);
    }

    function initDocsTabs() {
        const articles = Array.from(document.querySelectorAll('.docs-article'));
        if (!articles.length) return;

        const topicButtons = Array.from(document.querySelectorAll('.docs-topic[data-doc-target]'));
        const inlineLinks = Array.from(document.querySelectorAll('.docs-inline-link[data-doc-target]'));
        const topicSelect = document.getElementById('docs-topic-select');

        const setActive = (targetId) => {
            if (!targetId) return;
            articles.forEach((article) => {
                article.hidden = article.id !== targetId;
            });

            topicButtons.forEach((btn) => {
                const isActive = btn.dataset.docTarget === targetId;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', String(isActive));
            });

            if (topicSelect) {
                topicSelect.value = targetId;
            }
        };

        const defaultTarget = topicButtons.find((btn) => btn.classList.contains('active'))?.dataset.docTarget
            || (topicSelect ? topicSelect.value : null)
            || articles[0].id;

        setActive(defaultTarget);

        topicButtons.forEach((btn) => {
            btn.addEventListener('click', () => setActive(btn.dataset.docTarget));
        });

        inlineLinks.forEach((btn) => {
            btn.addEventListener('click', () => setActive(btn.dataset.docTarget));
        });

        if (topicSelect) {
            topicSelect.addEventListener('change', () => setActive(topicSelect.value));
        }
    }

    function initTestTabs() {
        const articles = Array.from(document.querySelectorAll('.test-article'));
        if (!articles.length) return;

        const topicButtons = Array.from(document.querySelectorAll('.test-topic[data-test-target]'));
        const topicSelect = document.getElementById('test-topic-select');

        const setActive = (targetId) => {
            if (!targetId) return;
            articles.forEach((article) => {
                article.hidden = article.id !== targetId;
            });

            topicButtons.forEach((btn) => {
                const isActive = btn.dataset.testTarget === targetId;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', String(isActive));
            });

            if (topicSelect) {
                topicSelect.value = targetId;
            }
        };

        const defaultTarget = topicButtons.find((btn) => btn.classList.contains('active'))?.dataset.testTarget
            || (topicSelect ? topicSelect.value : null)
            || articles[0].id;

        setActive(defaultTarget);

        topicButtons.forEach((btn) => {
            btn.addEventListener('click', () => setActive(btn.dataset.testTarget));
        });

        if (topicSelect) {
            topicSelect.addEventListener('change', () => setActive(topicSelect.value));
        }
    }

    function initPrivacyTabs() {
        const articles = Array.from(document.querySelectorAll('.privacy-article'));
        if (!articles.length) return;

        const topicButtons = Array.from(document.querySelectorAll('.privacy-topic[data-privacy-target]'));
        const topicSelect = document.getElementById('privacy-topic-select');

        const setActive = (targetId) => {
            if (!targetId) return;
            articles.forEach((article) => {
                article.hidden = article.id !== targetId;
            });

            topicButtons.forEach((btn) => {
                const isActive = btn.dataset.privacyTarget === targetId;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', String(isActive));
            });

            if (topicSelect) {
                topicSelect.value = targetId;
            }
        };

        const defaultTarget = topicButtons.find((btn) => btn.classList.contains('active'))?.dataset.privacyTarget
            || (topicSelect ? topicSelect.value : null)
            || articles[0].id;

        setActive(defaultTarget);

        topicButtons.forEach((btn) => {
            btn.addEventListener('click', () => setActive(btn.dataset.privacyTarget));
        });

        if (topicSelect) {
            topicSelect.addEventListener('change', () => setActive(topicSelect.value));
        }
    }

    function initCopyButtons() {
        const buttons = Array.from(document.querySelectorAll('.copy-btn'));
        if (!buttons.length) return;

        const copyWithFallback = (text) => {
            try {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'absolute';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                return true;
            } catch {
                return false;
            }
        };

        const handleCopied = (btn) => {
            btn.classList.add('is-copied');
            window.setTimeout(() => btn.classList.remove('is-copied'), 1200);
        };

        buttons.forEach((btn) => {
            btn.addEventListener('click', async () => {
                const valueAttr = btn.getAttribute('data-copy-value');
                const targetSelector = btn.getAttribute('data-copy-target');
                let text = valueAttr || '';

                if (!text && targetSelector) {
                    const target = document.querySelector(targetSelector);
                    if (target) {
                        text = 'value' in target ? target.value : target.textContent || '';
                    }
                }

                if (!text) return;

                let copied = false;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    try {
                        await navigator.clipboard.writeText(text);
                        copied = true;
                    } catch {
                        copied = copyWithFallback(text);
                    }
                } else {
                    copied = copyWithFallback(text);
                }

                if (copied) {
                    handleCopied(btn);
                }
            });
        });
    }

    function initTestInteractions() {
        const testButtons = Array.from(document.querySelectorAll('[data-test-button]'));
        testButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const card = btn.closest('.test-card');
                if (!card) return;
                const countEl = card.querySelector('.test-count');
                const feedbackEl = card.querySelector('.test-feedback');

                if (countEl) {
                    const current = parseInt(countEl.textContent || '0', 10) || 0;
                    countEl.textContent = `${current + 1}x`;
                    countEl.classList.remove('test-pop');
                    void countEl.offsetWidth;
                    countEl.classList.add('test-pop');
                }

                if (feedbackEl) {
                    feedbackEl.textContent = '✅';
                    feedbackEl.classList.add('is-success');
                    window.setTimeout(() => {
                        feedbackEl.textContent = '';
                        feedbackEl.classList.remove('is-success');
                    }, 700);
                }
            });
        });

        const passwordInput = document.getElementById('test-password');
        const toggleBtn = document.querySelector('.test-toggle-password');
        if (passwordInput && toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const isHidden = passwordInput.type === 'password';
                passwordInput.type = isHidden ? 'text' : 'password';
                toggleBtn.textContent = isHidden ? 'Ocultar' : 'Mostrar';
                toggleBtn.setAttribute('aria-pressed', String(isHidden));
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initIndexProcessing();
            initSectionRouting();
            initDocsTabs();
            initTestTabs();
            initPrivacyTabs();
            initCopyButtons();
            initTestInteractions();
        });
    } else {
        initIndexProcessing();
        initSectionRouting();
        initDocsTabs();
        initTestTabs();
        initPrivacyTabs();
        initCopyButtons();
        initTestInteractions();
    }
})();
