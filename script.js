// script.js - Lógica Global de UI/Navegação
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenu = document.getElementById('mobile-menu');
    const hamburgerBtn = document.querySelector('.hamburger-menu');
    const closeMenuBtn = document.querySelector('.close-menu');
    const body = document.body;
    const navLinks = document.querySelectorAll('.navbar ul li a, footer .footer-links a'); // Inclui links do rodapé

    const themeToggleBtn = document.querySelector('.theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const html = document.documentElement;

    const mainHeaderContent = document.querySelector('.main-header-content'); 
    const sections = document.querySelectorAll('.conteudo'); // Todas as seções no options.html

    const sunIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2"/>
        <path d="M12 20v2"/>
        <path d="M4.93 4.93l1.41 1.41"/>
        <path d="M17.66 17.66l1.41 1.41"/>
        <path d="M2 12h2"/>
        <path d="M20 12h2"/>
        <path d="M6.34 17.66l-1.41 1.41"/>
        <path d="M19.07 4.93l-1.41 1.41"/>
    </svg>`;
    const moonIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    </svg>`;

    // --- Animação de Estrelas de Fundo ---
    const starBackground = document.querySelector('.global-star-background');
    const fixedBarStars = document.querySelector('.fixed-bar-stars');

    function createStar(container) {
        const star = document.createElement('div');
        star.classList.add('star');
        const size = Math.random() < 0.7 ? 'small' : (Math.random() < 0.5 ? 'medium' : 'large');
        star.classList.add(size);

        const startX = `${Math.random() * 100}vw`;
        const startY = `${Math.random() * 100}vh`;
        const endX = `${(Math.random() - 0.5) * 200 + parseFloat(startX)}px`; // Pequeno desvio horizontal
        const endY = `100vh`; // Cair para baixo da tela

        star.style.setProperty('--start-x', startX);
        star.style.setProperty('--start-y', startY);
        star.style.setProperty('--end-x', endX);
        star.style.setProperty('--end-y', endY);

        star.style.left = startX;
        star.style.top = startY;

        container.appendChild(star);

        const animationDuration = `${3 + Math.random() * 5}s`; // 3 to 8 seconds
        star.style.animation = `global-star-fall ${animationDuration} linear forwards`;

        star.addEventListener('animationend', () => {
            star.remove();
        });
    }

    function createFixedStar(container) {
        const star = document.createElement('div');
        star.classList.add('star');
        const size = Math.random() < 0.7 ? 'small' : (Math.random() < 0.5 ? 'medium' : 'large');
        star.classList.add(size);

        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;

        container.appendChild(star);

        setTimeout(() => star.remove(), 2000 + Math.random() * 3000); // Remove after 2-5 seconds
    }

    let globalStarInterval;
    let fixedStarInterval;

    function startStarAnimation() {
        if (!globalStarInterval) {
            globalStarInterval = setInterval(() => createStar(starBackground), 500); // Crie uma estrela a cada 0.5s
        }
        if (!fixedStarInterval) {
            fixedStarInterval = setInterval(() => createFixedStar(fixedBarStars), 1000); // Crie uma estrela na barra fixa a cada 1s
        }
        starBackground.style.opacity = '1';
    }

    function stopStarAnimation() {
        clearInterval(globalStarInterval);
        globalStarInterval = null;
        clearInterval(fixedStarInterval);
        fixedStarInterval = null;
        starBackground.style.opacity = '0';
        // Remover estrelas existentes suavemente
        document.querySelectorAll('.star').forEach(star => {
            star.style.opacity = '0';
            star.addEventListener('transitionend', () => star.remove());
        });
    }
    // --- Fim da Animação de Estrelas de Fundo ---


    // --- Lógica do Tema Claro/Escuro ---
    function applyTheme(theme) {
        html.classList.remove('light-theme', 'dark-theme');
        html.classList.add(theme);
        themeIcon.innerHTML = theme === 'dark-theme' ? sunIcon : moonIcon;
        localStorage.setItem('theme', theme);

        if (theme === 'dark-theme') {
            startStarAnimation();
        } else {
            stopStarAnimation();
        }
    }

    // Carrega o tema salvo ou usa o tema do sistema
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyTheme('dark-theme');
    } else {
        applyTheme('light-theme');
    }

    themeToggleBtn.addEventListener('click', () => {
        if (html.classList.contains('dark-theme')) {
            applyTheme('light-theme');
        } else {
            applyTheme('dark-theme');
        }
    });

    // --- Lógica do Menu Mobile ---
    hamburgerBtn.addEventListener('click', () => {
        mobileMenu.classList.add('open');
        body.classList.add('menu-open');
    });

    closeMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        body.classList.remove('menu-open');
    });

    // Fechar menu ao clicar em um link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('open');
            body.classList.remove('menu-open');
        });
    });

    // --- Lógica de Exibição de Seções (Animação) ---
    function showSection(targetId) {
        sections.forEach(section => {
            const sectionId = section.id;
            // Se a seção é a alvo, remove active e max-height para recalcular
            if (sectionId === targetId) {
                section.style.maxHeight = null; // Reseta para calcular a altura real
                section.classList.remove('active'); // Remove para forçar re-render para transição
                
                // Força reflow para garantir que a transição seja aplicada corretamente
                void section.offsetWidth; 
                
                section.classList.add('active');
                section.style.maxHeight = section.scrollHeight + 'px'; // Define a altura real
            } else {
                section.style.maxHeight = '0'; // Fecha outras seções
                section.classList.remove('active');
            }
        });

        // Ocultar ou mostrar o main-header-content
        if (targetId === 'Inicio') {
            mainHeaderContent.classList.remove('hidden-header-content');
        } else {
            mainHeaderContent.classList.add('hidden-header-content');
        }
    }

    // Lógica para navegação hash
    function handleHashChange() {
        const hash = window.location.hash.substring(1); // Remove o '#'
        if (hash) {
            showSection(hash);
        } else {
            // Se não há hash, exibe a seção 'configuracoes' por padrão
            showSection('configuracoes'); 
        }
    }

    // Ouvir mudanças na hash da URL
    window.addEventListener('hashchange', handleHashChange);

    // Chamar no carregamento da página para exibir a seção correta
    handleHashChange();

    // Adiciona event listeners aos links de navegação para as seções
    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            const href = this.getAttribute('href');
            const targetId = href.substring(href.indexOf('#') + 1); // Pega o ID da seção
            
            // Atualiza a URL sem rolar imediatamente (controlado por showSection)
            history.pushState(null, '', `#${targetId}`);
            showSection(targetId);
            event.preventDefault(); // Impede o comportamento padrão de rolagem do navegador
        });
    });

    // Certifica que a seção de "Configurações" esteja ativa ao carregar a página inicialmente
    // se nenhum hash for especificado na URL.
    if (!window.location.hash) {
        showSection('configuracoes');
    }
});