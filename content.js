// content.js - Lógica para formulário de teste e configurações da extensão
document.addEventListener('DOMContentLoaded', function() {

    // --- Lógica do Formulário de Teste ---
    const registerButton = document.getElementById('registerButton');
    const registrationMessage = document.getElementById('registrationMessage');
    const testLink = document.getElementById('test-link');

    if (registerButton) {
        registerButton.addEventListener('click', function() {
            // Aqui você adicionaria a lógica real de registro
            // Para este teste, apenas exibe uma mensagem
            registrationMessage.style.display = 'block';
            setTimeout(() => {
                registrationMessage.style.display = 'none';
            }, 3000); // Oculta a mensagem após 3 segundos
        });
    }

    if (testLink) {
        testLink.addEventListener('click', function() {
            alert('Link de teste clicado! Em uma extensão real, isso poderia disparar uma ação.');
        });
    }


    // --- Lógica de Salvar/Carregar Opções da Extensão ---
    const clickIntervalInput = document.getElementById('click-interval');
    const xpathInput = document.getElementById('xpath-input');
    const saveOptionsBtn = document.getElementById('save-options');
    const saveMessage = document.getElementById('save-message');

    // Carrega as opções salvas (usando chrome.storage.local para extensões)
    function loadOptions() {
        // Verifica se estamos em um ambiente de extensão do Chrome
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['clickInterval', 'defaultXPath'], function(result) {
                if (result.clickInterval) {
                    clickIntervalInput.value = result.clickInterval;
                }
                if (result.defaultXPath) {
                    xpathInput.value = result.defaultXPath;
                }
            });
        } else {
            // Fallback para ambiente de desenvolvimento (navegador normal)
            const storedInterval = localStorage.getItem('clickInterval');
            const storedXPath = localStorage.getItem('defaultXPath');
            if (storedInterval) {
                clickIntervalInput.value = storedInterval;
            }
            if (storedXPath) {
                xpathInput.value = storedXPath;
            }
            console.warn("Ambiente não é uma extensão Chrome. Usando localStorage para opções.");
        }
    }

    // Salva as opções
    function saveOptions() {
        const clickInterval = clickIntervalInput.value;
        const defaultXPath = xpathInput.value;

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({
                clickInterval: clickInterval,
                defaultXPath: defaultXPath
            }, function() {
                console.log('Opções salvas:', { clickInterval, defaultXPath });
                saveMessage.style.display = 'block';
                setTimeout(() => {
                    saveMessage.style.display = 'none';
                }, 2000); // Oculta a mensagem após 2 segundos
            });
        } else {
            // Fallback para ambiente de desenvolvimento (navegador normal)
            localStorage.setItem('clickInterval', clickInterval);
            localStorage.setItem('defaultXPath', defaultXPath);
            console.log('Opções salvas no localStorage:', { clickInterval, defaultXPath });
            saveMessage.style.display = 'block';
            setTimeout(() => {
                saveMessage.style.display = 'none';
            }, 2000); // Oculta a mensagem após 2 segundos
        }
    }

    // Adiciona event listener para o botão de salvar
    if (saveOptionsBtn) {
        saveOptionsBtn.addEventListener('click', saveOptions);
    }

    // Carrega as opções quando a página de configurações é carregada
    loadOptions();
});