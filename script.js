document.addEventListener('DOMContentLoaded', function() {
    // 1. Seleção de Elementos DOM
    // Elementos de Navegação e Menu Mobile
    const mobileMenu = document.getElementById('mobile-menu');
    const hamburgerBtn = document.querySelector('.hamburger-menu');
    const closeMenuBtn = document.querySelector('.close-menu');
    const body = document.body;
    const navLinks = document.querySelectorAll('.navbar ul li a');

    // Elementos de Tema
    const themeToggleBtn = document.querySelector('.theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const html = document.documentElement; // Representa o elemento <html>

    // Elemento do Conteúdo Principal do Header (para mostrar/esconder)
    const mainHeaderContent = document.querySelector('.main-header-content');

    // Ícones SVG para o Toggle de Tema
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

    // Elementos do Formulário de Registro (seção "Teste")
    const registerButton = document.getElementById('registerButton');
    const registrationMessage = document.getElementById('registrationMessage');
    // Filtra inputs que possam não existir na seção atual, para evitar erros de null
    const requiredInputs = [
        document.getElementById('full-name'),
        document.getElementById('username'),
        document.getElementById('first-name'),
        document.getElementById('last-name'),
        document.getElementById('email'),
        document.getElementById('password')
    ].filter(input => input !== null);

    // Elementos do Modal de Configuração da Ação
    const actionConfigModal = document.getElementById('actionConfigModal');
    const editButtons = document.querySelectorAll('.action-icon-btn.edit-btn'); // Seleciona todos os botões de edição
    const cancelModalButton = document.querySelector('.btn-cancel-modal'); // Botão Cancelar do modal
    const saveModalButton = document.querySelector('.btn-save-modal'); // Botão Salvar do modal (funcionalidade dummy por enquanto)


    // 2. Funções de Manipulação da UI

    /**
     * Alterna a visibilidade das seções de conteúdo com base no hash da URL.
     * Esconde 'main-header-content' para seções específicas.
     * @param {string} hash - O hash da URL (ex: '#Inicio').
     */
    function showSection(hash) {
        const sections = document.querySelectorAll('.conteudo');
        sections.forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });

        let targetSectionId = hash.substring(1);
        if (!targetSectionId || targetSectionId === 'index.html' || targetSectionId === '') {
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

        // Lógica para mostrar/ocultar main-header-content
        if (mainHeaderContent) {
            if (['baixar', 'teste', 'politicas'].includes(targetSectionId)) {
                mainHeaderContent.style.display = 'none';
            } else {
                mainHeaderContent.style.display = 'block';
            }
        }

        // Fecha o menu mobile se estiver aberto
        if (mobileMenu && mobileMenu.classList.contains('open')) {
            toggleMobileMenu();
        }
    }

    /**
     * Alterna a abertura/fechamento do menu mobile.
     */
    function toggleMobileMenu() {
        if (mobileMenu) {
            mobileMenu.classList.toggle('open');
        }
        body.classList.toggle('menu-open'); // Para controlar o overflow do body
    }

    // --- Lógica de Tema Claro/Escuro ---
    const sizes = ['small', 'medium', 'large']; // Tamanhos para as estrelas cadentes

    let globalStarTimeout = null;
    const globalStarsContainer = document.querySelector('.global-star-background');

    /**
     * Cria e adiciona uma estrela cadente global ao DOM.
     */
    function createGlobalStar() {
        const star = document.createElement('div');
        star.classList.add('star');
        const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
        star.classList.add(randomSize);

        const titleElement = document.querySelector('.header-main-title-desktop');
        if (!titleElement) {
             // Se não encontrar o título, pode ser que a seção não seja a 'Inicio'
             // Ou o elemento não existe, então não criamos estrelas para evitar erros.
            return;
        }

        const titleRect = titleElement.getBoundingClientRect();
        const startX = titleRect.left + Math.random() * titleRect.width;
        const startY = titleRect.top - 20; // Começa um pouco acima do título
        const endX = startX - (20 + Math.random() * 30); // Move para a esquerda
        const endY = titleRect.top + titleRect.height + 20; // Desce abaixo do título

        star.style.setProperty('--start-x', `${startX}px`);
        star.style.setProperty('--end-x', `${endX}px`);
        star.style.setProperty('--start-y', `${startY}px`);
        star.style.setProperty('--end-y', `${endY}px`);

        const isStatic = Math.random() < 0.2; // 20% das estrelas ficam paradas

        if (isStatic) {
            star.style.left = `${startX}px`;
            star.style.top = `${startY + 30}px`; // Ajusta posição para ser visível
            star.style.position = 'absolute';
            star.style.animation = 'none'; // Garante que não há animação
        } else {
            const isFast = Math.random() < 0.3; // 30% serão mais rápidas
            const animationDuration = isFast ? (0.3 + Math.random() * 0.5) : (1 + Math.random() * 2);
            star.style.animationDuration = `${animationDuration}s`;
            star.style.animationName = 'fall-star'; // Certifique-se que você tem esta keyframe no seu CSS

            setTimeout(() => {
                star.remove(); // Remove a estrela após a animação
            }, animationDuration * 1000);
        }

        if (globalStarsContainer) {
            globalStarsContainer.appendChild(star);
        }
    }

    /**
     * Inicia a geração contínua de estrelas cadentes.
     */
    function startGlobalStars() {
        createGlobalStar();
        const nextStarDelay = 1000 + Math.random() * 2000; // 1-3 segundos entre estrelas
        globalStarTimeout = setTimeout(startGlobalStars, nextStarDelay);
    }

    /**
     * Para a geração de estrelas e remove as estrelas existentes.
     */
    function stopGlobalStars() {
        if (globalStarTimeout) {
            clearTimeout(globalStarTimeout);
            globalStarTimeout = null;
        }
        if (globalStarsContainer) {
            globalStarsContainer.querySelectorAll('.star').forEach(s => s.remove());
        }
    }

    /**
     * Define o tema (claro ou escuro) e atualiza a UI.
     * @param {string} theme - O tema a ser aplicado ('dark-theme' ou '').
     */
    function setTheme(theme) {
        html.className = theme;
        // Não usamos localStorage por enquanto, para manter localmente.
        localStorage.setItem('theme', theme); // Mantido o localStorage conforme o script original, mas pode ser removido para testes puramente locais
        updateThemeIcon();
        updateAllStars();
    }

    /**
     * Alterna entre o tema claro e escuro.
     */
    function toggleTheme() {
        const currentTheme = localStorage.getItem('theme');
        const newTheme = currentTheme === 'dark-theme' ? '' : 'dark-theme';
        setTheme(newTheme);
    }

    /**
     * Atualiza o ícone do botão de toggle de tema (sol ou lua).
     */
    function updateThemeIcon() {
        if (themeIcon) {
            themeIcon.innerHTML = html.classList.contains('dark-theme') ? sunIcon : moonIcon;
        }
    }

    /**
     * Atualiza todas as animações de estrelas com base no tema atual.
     */
    function updateAllStars() {
        if (html.classList.contains('dark-theme')) {
            if (globalStarsContainer) {
                globalStarsContainer.style.opacity = 1;
            }
            startGlobalStars();
        } else {
            if (globalStarsContainer) {
                globalStarsContainer.style.opacity = 0;
            }
            stopGlobalStars();
        }
    }

    /**
     * Abre o modal de configuração de ação.
     */
    function openActionConfigModal() {
        if (actionConfigModal) {
            actionConfigModal.style.display = 'flex'; // Usar 'flex' para centralizar via CSS flexbox
            // actionConfigModal.classList.add('show'); // Para animação de fade-in
            console.log("Modal de configuração aberto.");
        }
    }

    /**
     * Fecha o modal de configuração de ação.
     */
    function closeActionConfigModal() {
        if (actionConfigModal) {
            actionConfigModal.style.display = 'none';
            // actionConfigModal.classList.remove('show'); // Para animação de fade-out
            console.log("Modal de configuração fechado.");
        }
    }

    // 3. Configuração de Event Listeners

    // Menu Mobile
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', toggleMobileMenu);
    }
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', toggleMobileMenu);
    }

    // Navegação entre Seções
    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Impede o comportamento padrão do link
            const href = link.getAttribute('href');
            window.location.hash = href; // Atualiza o hash, que dispara o evento 'hashchange'
        });
    });

    // Listener para Mudanças no Hash da URL
    window.addEventListener('hashchange', function() {
        showSection(window.location.hash);
    });

    // Chama showSection na carga inicial da página
    showSection(window.location.hash);

    // Toggle de Tema
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
        setTheme(storedTheme);
    } else {
        setTheme('dark-theme'); // Default to light theme if no preference is stored.
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Inicializa o ícone do tema e as estrelas com base no tema carregado
    updateThemeIcon();
    updateAllStars();

    // Atualizar estrelas quando a janela for redimensionada
    window.addEventListener('resize', function() {
        if (html.classList.contains('dark-theme')) {
            stopGlobalStars(); // Para as estrelas existentes
            startGlobalStars(); // Reinicia para novas posições
        }
    });

    // Script do Formulário de Registro (seção "Teste")
    if (registerButton && registrationMessage && requiredInputs.length > 0) {
        registerButton.addEventListener('click', function() {
            let allFilled = true;
            requiredInputs.forEach(input => {
                if (input.value.trim() === '') {
                    allFilled = false;
                    input.style.borderColor = 'var(--button-red)'; // Feedback visual
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
                // Opcional: Limpar campos após registro (descomente para ativar)
                // requiredInputs.forEach(input => input.value = '');
            } else {
                registrationMessage.textContent = 'Por favor, preencha todos os campos obrigatórios.';
                registrationMessage.style.display = 'block';
                registrationMessage.style.color = 'var(--error-color)';
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
        console.warn("Elementos do formulário de registro (seção 'Teste') não encontrados. O script de registro pode não funcionar.");
    }

    // Abertura/Fechamento do Modal de Configuração da Ação
    if (editButtons.length > 0) {
        editButtons.forEach(button => {
            button.addEventListener('click', openActionConfigModal);
        });
    } else {
        console.warn("Nenhum botão de edição (.action-icon-btn.edit-btn) encontrado para o modal de configuração de ação.");
    }

    if (cancelModalButton) {
        cancelModalButton.addEventListener('click', closeActionConfigModal);
    }

    if (saveModalButton) {
        saveModalButton.addEventListener('click', function() {
            console.log("Botão Salvar do modal clicado. (Funcionalidade de salvar não implementada localmente)");
            // Aqui você adicionaria a lógica para pegar os valores dos inputs do modal e fazer algo com eles.
            // Por enquanto, apenas fecha o modal.
            closeActionConfigModal();
        });
    }

    // Opcional: Fechar o modal clicando fora dele
    if (actionConfigModal) {
        window.addEventListener('click', function(event) {
            if (event.target === actionConfigModal) {
                closeActionConfigModal();
            }
        });
    }
});