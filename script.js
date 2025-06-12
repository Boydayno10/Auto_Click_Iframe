document.addEventListener('DOMContentLoaded', function() {
    const mobileMenu = document.getElementById('mobile-menu');
    const hamburgerBtn = document.querySelector('.hamburger-menu');
    const closeMenuBtn = document.querySelector('.close-menu');
    const body = document.body;
    const navLinks = document.querySelectorAll('.navbar ul li a');

    const themeToggleBtn = document.querySelector('.theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const html = document.documentElement;

    // Adicione esta linha para pegar o elemento main-header-content
    const mainHeaderContent = document.querySelector('.main-header-content');

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

    function showSection(hash) {
        const sections = document.querySelectorAll('.conteudo');
        sections.forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });

        let targetSectionId = hash.substring(1);
        if (!targetSectionId || targetSectionId === 'index.html') {
            targetSectionId = 'Inicio'; // Define "Inicio" como a seção padrão
        }

        const targetSection = document.getElementById(targetSectionId);

        if (targetSection) {
            targetSection.style.display = 'block';
            targetSection.classList.add('active');
        } else {
            // Se a seção não for encontrada (hash inválido), voltar para "Inicio"
            document.getElementById('Inicio').style.display = 'block';
            document.getElementById('Inicio').classList.add('active');
            targetSectionId = 'Inicio'; // Garante que targetSectionId esteja correto para a lógica do header
        }

        // NOVO: Lógica para mostrar/ocultar main-header-content usando opacity/visibility
        if (mainHeaderContent) {
            if (targetSectionId === 'Inicio') {
                mainHeaderContent.style.opacity = '1';
                mainHeaderContent.style.visibility = 'visible';
                mainHeaderContent.style.pointerEvents = 'auto'; // Habilita interações
            } else {
                mainHeaderContent.style.opacity = '0';
                mainHeaderContent.style.visibility = 'hidden';
                mainHeaderContent.style.pointerEvents = 'none'; // Desabilita interações (cliques, etc.)
            }
        }


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
            event.preventDefault();
            const href = link.getAttribute('href');
            window.location.hash = href;
        });
    });

    window.addEventListener('hashchange', function() {
        showSection(window.location.hash);
    });

    // Chama showSection na carga inicial da página
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
        if (!titleElement) return;

        const titleRect = titleElement.getBoundingClientRect();
        const startX = titleRect.left + Math.random() * titleRect.width;
        const startY = titleRect.top - 20;
        const endX = startX - (20 + Math.random() * 30);
        const endY = titleRect.top + titleRect.height + 20;

        star.style.setProperty('--start-x', `${startX}px`);
        star.style.setProperty('--end-x', `${endX}px`);
        star.style.setProperty('--start-y', `${startY}px`);
        star.style.setProperty('--end-y', `${endY}px`);

        const isStatic = Math.random() < 0.2; // 20% das estrelas ficam paradas

        if (isStatic) {
            // Estrela parada: nenhuma animação, apenas posicionamento
            star.style.left = `${startX}px`;
            star.style.top = `${startY + 30}px`;
            star.style.position = 'absolute';
        } else {
            const isFast = Math.random() < 0.3; // 30% serão mais rápidas
            const animationDuration = isFast ? (0.3 + Math.random() * 0.5) : (1 + Math.random() * 2);
            star.style.animationDuration = `${animationDuration}s`;

            setTimeout(() => {
                star.remove();
            }, animationDuration * 1000);
        }

        globalStarsContainer.appendChild(star);
    }


    function startGlobalStars() {
        createGlobalStar();
        const nextStarDelay = 1000 + Math.random() * 2000; // 1-3 segundos entre estrelas
        globalStarTimeout = setTimeout(startGlobalStars, nextStarDelay);
    }

    function stopGlobalStars() {
        if (globalStarTimeout) {
            clearTimeout(globalStarTimeout);
            globalStarTimeout = null;
        }
        globalStarsContainer.querySelectorAll('.star').forEach(s => s.remove());
    }

    // --- Função Mestra para Atualizar Todos os Tipos de Estrelas ---
    function updateAllStars() {
        if (html.classList.contains('dark-theme')) {
            globalStarsContainer.style.opacity = 1;
            startGlobalStars();
        } else {
            globalStarsContainer.style.opacity = 0;
            stopGlobalStars();
        }
    }

    // Inicialização do tema
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

    // Atualizar estrelas quando a janela for redimensionada
    window.addEventListener('resize', function() {
        if (html.classList.contains('dark-theme')) {
            stopGlobalStars();
            startGlobalStars();
        }
    });

    // --- Início do Script de Registro ---
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

    if (registerButton && registrationMessage && requiredInputs.every(input => input !== null)) { // Verifica se todos os elementos existem
        registerButton.addEventListener('click', function() {
            let allFilled = true;
            requiredInputs.forEach(input => {
                if (input.value.trim() === '') {
                    allFilled = false;
                    input.style.borderColor = 'var(--button-red)'; // Adiciona feedback visual para campos vazios
                    input.style.boxShadow = '0 0 0 3px rgba(255, 0, 0, 0.2)';
                } else {
                    input.style.borderColor = 'var(--input-border-color)'; // Reseta a borda se preenchido
                    input.style.boxShadow = 'none';
                }
            });

            if (allFilled) {
                registrationMessage.textContent = 'Registado com sucesso!';
                registrationMessage.style.display = 'block';
                registrationMessage.style.color = 'var(--success-color)'; // Cor verde para sucesso
                registrationMessage.style.fontWeight = 'bold';
                // Opcional: Limpar campos após registro
                // requiredInputs.forEach(input => input.value = '');
            } else {
                registrationMessage.textContent = 'Por favor, preencha todos os campos obrigatórios.';
                registrationMessage.style.display = 'block';
                registrationMessage.style.color = 'var(--error-color)'; // Cor vermelha para erro
                registrationMessage.style.fontWeight = 'bold';
            }
        });

        // Resetar borda e sombra ao digitar novamente
        requiredInputs.forEach(input => {
            input.addEventListener('input', function() {
                if (this.value.trim() !== '') {
                    this.style.borderColor = 'var(--input-border-color)';
                    this.style.boxShadow = 'none';
                }
            });
        });
    } else {
        console.warn("Elementos do formulário de registro ou botão não encontrados. O script de registro pode não funcionar.");
    }
    // --- Fim do Script de Registro ---
});