document.addEventListener('DOMContentLoaded', function() {
    const mobileMenu = document.getElementById('mobile-menu');
    const hamburgerBtn = document.querySelector('.hamburger-menu');
    const closeMenuBtn = document.querySelector('.close-menu');
    const body = document.body;
    const navLinks = document.querySelectorAll('.navbar ul li a');

    const themeToggleBtn = document.querySelector('.theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const html = document.documentElement;

    const mainHeaderContent = document.querySelector('.main-header-content'); // Pode ser null em options.html
    const topHeaderBar = document.querySelector('.top-header-bar'); // Elemento fixo, deve existir em ambas

    const sunIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="5"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
    `;

    const moonIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
    `;

    // Função para mostrar/ocultar seções (útil principalmente em index.html)
    function showSection(hash) {
        // Verifica se estamos na index.html para aplicar a lógica de seções
        // ou se mainHeaderContent existe (sinal de index.html)
        if (document.location.pathname.endsWith('index.html') || document.location.pathname === '/' || mainHeaderContent) {
            const sections = document.querySelectorAll('.conteudo');
            sections.forEach(section => {
                section.style.display = 'none';
                section.classList.remove('active');
            });

            let targetSectionId = hash.substring(1);
            if (!targetSectionId || targetSectionId === '') {
                targetSectionId = 'Inicio'; // Define "Inicio" como a seção padrão para hash vazio
            }

            const targetSection = document.getElementById(targetSectionId);

            if (targetSection) {
                targetSection.style.display = 'block';
                targetSection.classList.add('active');
            } else {
                // Se a seção não for encontrada (hash inválido), voltar para "Inicio"
                document.getElementById('Inicio').style.display = 'block';
                document.getElementById('Inicio').classList.add('active');
                targetSectionId = 'Inicio';
            }

            // Lógica para mostrar/ocultar o main-header-content
            if (mainHeaderContent) {
                if (targetSectionId === 'Inicio') {
                    mainHeaderContent.classList.remove('hidden-header-content');
                } else {
                    mainHeaderContent.classList.add('hidden-header-content');
                }
            }
        }
        // Fecha o menu mobile se estiver aberto, independentemente da página
        if (mobileMenu.classList.contains('open')) {
            toggleMobileMenu();
        }
    }

    function toggleMobileMenu() {
        mobileMenu.classList.toggle('open');
        body.classList.toggle('menu-open');
    }

    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', toggleMobileMenu);
    }

    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', toggleMobileMenu);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            const href = link.getAttribute('href');
            
            // Verifica se o link contém um nome de arquivo (e.g., "index.html#")
            // Se sim, permite que o navegador lide com a navegação normalmente.
            if (href.includes('.html#')) {
                // Não prevenir o comportamento padrão, deixe o navegador ir para a URL completa
                // e o hash será rolado automaticamente.
                return; 
            } else {
                // Se o link é apenas um hash (e.g., "#teste"), significa que é uma navegação interna
                // na página atual.
                event.preventDefault(); 
                window.location.hash = href;
            }
        });
    });

    // Esta função será chamada quando o hash da URL mudar
    window.addEventListener('hashchange', function() {
        showSection(window.location.hash);
    });

    // Chama showSection na carga inicial da página
    // Isso garante que a seção correta é exibida quando a página carrega,
    // seja diretamente ou via um link com hash.
    showSection(window.location.hash);

    // --- Lógica de Tema Claro/Escuro ---
    function setTheme(theme) {
        html.className = theme;
        localStorage.setItem('theme', theme);
        updateThemeIcon();
        updateAllStars();
    }

    function toggleTheme() {
        const currentTheme = localStorage.getItem('theme');
        const newTheme = currentTheme === 'dark-theme' ? '' : 'dark-theme';
        setTheme(newTheme);
    }

    function updateThemeIcon() {
        if (themeIcon) {
            themeIcon.innerHTML = html.classList.contains('dark-theme') ? sunIcon : moonIcon;
        }
    }

    const sizes = ['small', 'medium', 'large'];

    // --- Funções para Estrelas Cadentes Globais ---
    let globalStarTimeout = null;
    const globalStarsContainer = document.querySelector('.global-star-background');
    
    function createGlobalStar() {
        const star = document.createElement('div');
        star.classList.add('star');
        const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
        star.classList.add(randomSize);

        const titleElement = document.querySelector('.header-main-title-desktop');
        const referenceElement = titleElement && getComputedStyle(titleElement).display !== 'none' ? titleElement : document.querySelector('.header-main-title-mobile');
        
        if (!referenceElement || getComputedStyle(referenceElement).opacity === '0') {
            star.remove();
            return;
        }

        const refRect = referenceElement.getBoundingClientRect();
        const startX = refRect.left + Math.random() * refRect.width;
        const startY = refRect.top - 20;

        const headerRect = document.querySelector('header').getBoundingClientRect();
        const endX = startX - (20 + Math.random() * 30);
        const endY = headerRect.bottom + (50 + Math.random() * 100);

        star.style.setProperty('--start-x', `${startX}px`);
        star.style.setProperty('--end-x', `${endX}px`);
        star.style.setProperty('--start-y', `${startY}px`);
        star.style.setProperty('--end-y', `${endY}px`);

        const isStatic = Math.random() < 0.2;

        if (isStatic) {
            star.style.left = `${startX}px`;
            star.style.top = `${startY + 30}px`;
            star.style.position = 'absolute';
            star.style.opacity = '1';
        } else {
            const isFast = Math.random() < 0.3;
            const animationDuration = isFast ? (0.3 + Math.random() * 0.5) : (1 + Math.random() * 2);
            star.style.animationDuration = `${animationDuration}s`;
            star.style.animationName = 'global-star-fall';

            setTimeout(() => {
                star.remove();
            }, animationDuration * 1000);
        }

        globalStarsContainer.appendChild(star);
    }

    function startGlobalStars() {
        if (globalStarTimeout) {
            clearTimeout(globalStarTimeout);
        }
        createGlobalStar();
        const nextStarDelay = 1000 + Math.random() * 2000;
        globalStarTimeout = setTimeout(startGlobalStars, nextStarDelay);
    }

    function stopGlobalStars() {
        if (globalStarTimeout) {
            clearTimeout(globalStarTimeout);
            globalStarTimeout = null;
        }
        globalStarsContainer.querySelectorAll('.star').forEach(s => s.remove());
    }

    function updateAllStars() {
        if (html.classList.contains('dark-theme')) {
            globalStarsContainer.style.opacity = 1;
            startGlobalStars();
        } else {
            globalStarsContainer.style.opacity = 0;
            stopGlobalStars();
        }
    }

    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
        setTheme(storedTheme);
    } else {
        setTheme('');
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    updateThemeIcon();
    updateAllStars();

    window.addEventListener('resize', function() {
        if (html.classList.contains('dark-theme')) {
            stopGlobalStars();
            startGlobalStars();
        }
    });

    // --- Início do Script de Registro (apenas para index.html) ---
    // Envolva esta lógica em uma verificação para garantir que só execute na index.html
    // onde esses elementos existem.
    if (document.location.pathname.endsWith('index.html') || document.location.pathname === '/') {
        const registerButton = document.getElementById('registerButton');
        const registrationMessage = document.getElementById('registrationMessage');
        const requiredInputs = [
            document.getElementById('full-name'),
            document.getElementById('username'),
            document.getElementById('first-name'),
            document.getElementById('last-name'),
            document.getElementById('email'),
            document.getElementById('password')
        ];

        if (registerButton && registrationMessage && requiredInputs.every(input => input !== null)) {
            registerButton.addEventListener('click', function() {
                let allFilled = true;
                requiredInputs.forEach(input => {
                    if (input.value.trim() === '') {
                        allFilled = false;
                        input.style.borderColor = 'var(--button-red)';
                        input.style.boxShadow = '0 0 0 3px rgba(255, 0, 0, 0.2)';
                    } else {
                        input.style.borderColor = 'var(--input-border-color)';
                        input.style.boxShadow = 'none';
                    }
                });

                if (allFilled) {
                    registrationMessage.textContent = 'Registado com sucesso!';
                    registrationMessage.style.display = 'block';
                    registrationMessage.style.color = 'var(--success-color)';
                    registrationMessage.style.fontWeight = 'bold';
                } else {
                    registrationMessage.textContent = 'Por favor, preencha todos os campos obrigatórios.';
                    registrationMessage.style.display = 'block';
                    registrationMessage.style.color = 'var(--error-color)';
                    registrationMessage.style.fontWeight = 'bold';
                }
            });

            requiredInputs.forEach(input => {
                input.addEventListener('input', function() {
                    if (this.value.trim() !== '') {
                        this.style.borderColor = 'var(--input-border-color)';
                        this.style.boxShadow = 'none';
                    }
                });
            });
        } else {
            // console.warn("Elementos do formulário de registro ou botão não encontrados na index.html.");
        }

        const testLink = document.getElementById('test-link');
        if (testLink) {
            testLink.addEventListener('click', function(event) {
                event.preventDefault();
                alert('Você clicou no link de teste! A extensão poderia automatizar este clique.');
            });
        } else {
            // console.warn("Elemento 'test-link' não encontrado na index.html.");
        }
    }
    // --- Fim do Script de Registro (e Test Link) ---

    // --- Lógica específica para options.html ---
    if (document.location.pathname.endsWith('options.html')) {
        const saveOptionsBtn = document.getElementById('save-options');
        const saveMessage = document.getElementById('save-message');
        const clickIntervalInput = document.getElementById('click-interval');
        const xpathInput = document.getElementById('xpath-input');

        if (saveOptionsBtn && clickIntervalInput && xpathInput) {
            // Carregar configurações salvas
            chrome.storage.local.get(['clickInterval', 'defaultXpath'], function(result) {
                if (result.clickInterval) {
                    clickIntervalInput.value = result.clickInterval;
                }
                if (result.defaultXpath) {
                    xpathInput.value = result.defaultXpath;
                }
            });

            // Salvar configurações
            saveOptionsBtn.addEventListener('click', function() {
                const clickInterval = parseInt(clickIntervalInput.value);
                const defaultXpath = xpathInput.value.trim();

                chrome.storage.local.set({
                    clickInterval: clickInterval,
                    defaultXpath: defaultXpath
                }, function() {
                    saveMessage.textContent = 'Configurações salvas!';
                    saveMessage.style.display = 'block';
                    setTimeout(() => {
                        saveMessage.style.display = 'none';
                    }, 3000); // Esconde a mensagem após 3 segundos
                });
            });
        }
    }

}); // Fim do DOMContentLoaded