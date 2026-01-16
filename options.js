// options.js
document.addEventListener('DOMContentLoaded', function() {
    const langRoot = document.documentElement;
    window.setTimeout(() => {
        if (langRoot && langRoot.classList.contains('acfh-lang-init-pending')) {
            langRoot.classList.remove('acfh-lang-init-pending');
            langRoot.classList.add('acfh-lang-init-ready');
        }
    }, 1200);
    // Detecta se estamos em ambiente de extensão (chrome.* disponível)
    const isChromeExtensionEnv = (typeof chrome !== 'undefined' &&
        chrome && chrome.storage && chrome.storage.local);

    // Flag global para indicar se a extensão está realmente conectada
    // à página de opções (via handshake com o content script).
    let acfhExtensionConnected = isChromeExtensionEnv;

    // Fallback para ambiente web puro: implementa um chrome.storage.local simples usando localStorage
    // e envia mensagens via window.postMessage para que a extensão (via content script)
    // possa espelhar os dados em chrome.storage.local
    if (!isChromeExtensionEnv) {
        const BRIDGE_MESSAGE_TYPE = 'acfh-storage-update';

        window.chrome = window.chrome || {};
        chrome.storage = chrome.storage || {};
        if (!chrome.storage.local) {
            chrome.storage.local = {
                get(keys, callback) {
                    const normalizedKeys = Array.isArray(keys) ? keys : Object.keys(keys || {});
                    const result = {};
                    normalizedKeys.forEach((key) => {
                        const raw = localStorage.getItem(key);
                        if (raw !== null) {
                            try {
                                result[key] = JSON.parse(raw);
                            } catch (e) {
                                result[key] = raw;
                            }
                        }
                    });
                    if (typeof callback === 'function') callback(result);
                },
                set(items, callback) {
                    if (!acfhExtensionConnected) {
                        console.warn('[ACFH] Extensão não detectada - salvamento de configurações desativado.');
                        if (typeof callback === 'function') callback();
                        return;
                    }
                    const storedItems = {};
                    Object.entries(items || {}).forEach(([key, value]) => {
                        try {
                            localStorage.setItem(key, JSON.stringify(value));
                            storedItems[key] = value;
                        } catch (e) {
                            console.warn('Falha ao salvar em localStorage para a chave', key, e);
                        }
                    });

                    // Notifica a extensão (content script) sobre alterações
                    try {
                        window.postMessage({
                            source: 'acfh-options-page',
                            type: BRIDGE_MESSAGE_TYPE,
                            items: storedItems
                        }, '*');
                    } catch (e) {
                        console.warn('Falha ao enviar mensagem de sincronização de storage', e);
                    }

                    if (typeof callback === 'function') callback();
                },
                remove(keys, callback) {
                    if (!acfhExtensionConnected) {
                        console.warn('[ACFH] Extensão não detectada - remoção de configurações desativada.');
                        if (typeof callback === 'function') callback();
                        return;
                    }
                    const normalizedKeys = Array.isArray(keys) ? keys : [keys];
                    normalizedKeys.forEach((key) => localStorage.removeItem(key));

                    try {
                        window.postMessage({
                            source: 'acfh-options-page',
                            type: BRIDGE_MESSAGE_TYPE,
                            removedKeys: normalizedKeys
                        }, '*');
                    } catch (e) {
                        console.warn('Falha ao enviar mensagem de remoção de storage', e);
                    }

                    if (typeof callback === 'function') callback();
                }
            };
        }

        // Shims adicionais para evitar erros em ambiente web puro
        // chrome.storage.onChanged: usado apenas em contexto de extensão; aqui vira no-op
        chrome.storage.onChanged = chrome.storage.onChanged || {
            addListener: function () { /* no-op em página web */ }
        };

        // chrome.runtime: usado para sendMessage/onMessage; aqui vira no-op seguro
        chrome.runtime = chrome.runtime || {
            sendMessage: function () { /* no-op em página web */ },
            onMessage: {
                addListener: function () { /* no-op em página web */ }
            },
            lastError: null
        };

        // chrome.userScripts: apenas existe em contexto da extensão; aqui fornecemos stubs
        chrome.userScripts = chrome.userScripts || {
            getScripts: function (callback) {
                if (typeof callback === 'function') callback([]);
            },
            register: function (config, callback) {
                if (typeof callback === 'function') callback();
            },
            unregister: function (config, callback) {
                if (typeof callback === 'function') callback();
            }
        };
    }

    // Wrapper unificado de storage: usa chrome.storage.local quando disponível
    // (rodando dentro da extensão) e, caso contrário, usa o shim baseado em
    // localStorage configurado acima.
    const acfhStorage = isChromeExtensionEnv && chrome && chrome.storage && chrome.storage.local
        ? chrome.storage.local
        : (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local
            ? chrome.storage.local
            : {
                get(keys, cb) { console.warn('acfhStorage shim GET não inicializado corretamente'); cb && cb({}); },
                set(items, cb) { console.warn('acfhStorage shim SET não inicializado corretamente', items); cb && cb(); },
                remove(keys, cb) { console.warn('acfhStorage shim REMOVE não inicializado corretamente', keys); cb && cb(); }
            });
    // Exibe um aviso visual simples quando a extensão não é detectada
    function showExtensionWarningBanner() {
        if (document.getElementById('acfh-extension-warning')) return;

        const banner = document.createElement('div');
        banner.id = 'acfh-extension-warning';
        banner.innerHTML = '<strong>Auto Clicker - Form Helper</strong>: extensão não detectada. As configurações não serão salvas. '
            + '<a id="acfh-install-link" href="#" style="color:#ffe082;text-decoration:underline;margin-left:8px;">Instalar</a>';
        banner.style.position = 'fixed';
        banner.style.top = '0';
        banner.style.left = '0';
        banner.style.right = '0';
        banner.style.zIndex = '9999';
        banner.style.padding = '8px 12px';
        banner.style.background = 'rgba(220, 53, 69, 0.95)';
        banner.style.color = '#fff';
        banner.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        banner.style.fontSize = '13px';
        banner.style.textAlign = 'center';
        banner.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

        document.body.appendChild(banner);

        const installLink = document.getElementById('acfh-install-link');
        if (installLink) {
            installLink.addEventListener('click', (e) => {
                e.preventDefault();
                // Abra a página de instalação da extensão (ajuste esta URL para a
                // página oficial da Chrome Web Store quando disponível).
                window.open('https://chrome.google.com/webstore/category/extensions', '_blank', 'noopener');
            });
        }
    }

    // Remove quaisquer dados locais deixados pela extensão quando ela
    // não está mais instalada/ativa e desabilita a interface de configs.
    function handleExtensionNotDetected() {
        acfhExtensionConnected = false;

        try {
            const keysToClear = [
                'configurations',
                'activeConfigId',
                'uiLanguage',
                'configMode',
                'sandboxMode',
                'contentScriptApi',
                'blacklist',
                'blacklistSites',
                'feedbackMode',
                'autoClickConfig'
            ];
            keysToClear.forEach((k) => localStorage.removeItem(k));
        } catch (e) {
            console.warn('[ACFH] Falha ao limpar localStorage após detectar ausência da extensão:', e);
        }

        showExtensionWarningBanner();

        // Cria uma camada visual sobre a área de configurações indicando
        // que elas estão indisponíveis sem a extensão instalada.
        const configContent = document.querySelector('.config-content');
        if (configContent && !document.getElementById('acfh-disabled-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'acfh-disabled-overlay';
            overlay.style.position = 'absolute';
            overlay.style.inset = '0';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.background = 'rgba(15,15,20,0.85)';
            overlay.style.zIndex = '9000';
            overlay.style.backdropFilter = 'blur(2px)';
            overlay.style.color = '#e5e7eb';
            overlay.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            overlay.style.textAlign = 'center';
            overlay.innerHTML = '<div style="max-width:420px;padding:16px;">'
                + '<h3 style="margin:0 0 8px;font-size:16px;">Extensão necessária</h3>'
                + '<p style="margin:0;font-size:13px;line-height:1.5;">'
                + 'Instale e ative a extensão <strong>Auto Clicker - Form Helper</strong> no seu navegador '
                + 'para criar, salvar e aplicar configurações de automação.</p>'
                + '</div>';

            // Garante que o contêiner pai permita posicionamento absoluto
            const parent = configContent.parentElement || configContent;
            if (getComputedStyle(parent).position === 'static') {
                parent.style.position = 'relative';
            }
            parent.appendChild(overlay);
        }
    }

    // Inicia handshake com o content script para detectar se a extensão está ativa
    function initExtensionHandshake() {
        if (isChromeExtensionEnv) {
            // Já estamos dentro do contexto da extensão; não é necessário handshake
            return;
        }

        const isLocalDev = (() => {
            const host = window.location.hostname;
            return host === 'localhost' || host === '127.0.0.1' || host === '::1';
        })();

        const PING_MESSAGE_TYPE = 'acfh-ping';
        let pongReceived = false;

        function handlePong(event) {
            if (event.source !== window) return;
            const data = event.data || {};
            if (data.source === 'acfh-extension' && data.type === 'acfh-pong') {
                pongReceived = true;
                acfhExtensionConnected = true;
                window.removeEventListener('message', handlePong);
                console.log('[ACFH] Extensão conectada à página de opções.');
            }
        }

        window.addEventListener('message', handlePong);

        try {
            window.postMessage({
                source: 'acfh-options-page',
                type: PING_MESSAGE_TYPE,
                timestamp: Date.now()
            }, '*');
        } catch (e) {
            console.warn('[ACFH] Falha ao enviar ping para verificar extensão:', e);
        }

        // Se nenhum pong chegar em 1500ms, assume que a extensão não está conectada
        setTimeout(() => {
            if (!pongReceived) {
                console.warn('[ACFH] Extensão não detectada para a página de opções.');
                if (!isLocalDev) {
                    handleExtensionNotDetected();
                } else {
                    console.info('[ACFH] Modo local detectado: mantendo interface ativa para testes.');
                }
            }
        }, 1500);
    }

    // Dispara o handshake apenas quando estamos no modo página web
    if (!isChromeExtensionEnv) {
        initExtensionHandshake();
    }

    const actionConfigModal = document.getElementById('actionConfigModal');
    const cancelModalButton = document.querySelector('.btn-cancel-modal');
    const saveModalButton = document.querySelector('.btn-save-modal');
    const btnAddAction = document.querySelector('.btn-add-action');
    const xpathActionsContainer = document.getElementById('xpath-actions-container');
    const xpathActionTemplate = document.getElementById('xpath-action-template');
    const btnNewConfig = document.querySelector('.btn-new-config');
    const configNameInput = document.getElementById('configName');
    const configUrlInput = document.getElementById('configUrl');
    const configList = document.querySelector('.config-list-desktop');
    const configSelect = document.getElementById('configuration-list');
    const configListItemTemplate = document.getElementById('config-list-item-template');
    const initWaitInput = document.getElementById('initWait');
    const saveNotification = document.getElementById('saveNotification');
    const moreOptionsBtn = document.querySelector('.more-options-btn');
    const bulkActionsMenu = document.getElementById('bulkActionsMenu');
    const bulkExportBtn = document.getElementById('bulkExportBtn');
    const bulkImportBtn = document.getElementById('bulkImportBtn');
    const bulkRemoveActiveBtn = document.getElementById('bulkRemoveActiveBtn');
    const importConfigIconBtn = document.getElementById('importConfigIconBtn');
    const exportConfigIconBtn = document.getElementById('exportConfigIconBtn');

    let currentEditingActionRow = null;
    let saveTimeout;
    let configurations = [];
    let activeConfigId = null;
    let hasUnsavedChanges = false;
let currentZoom = 100;
let currentUiLanguage = (document.documentElement && document.documentElement.lang) ? document.documentElement.lang : 'pt-BR';



    const translationsPt = {
        initialWaitLabel: "Atraso inicial:",
        floatingBoxWaiting: "%time%",
        floatingBoxWaitingElements: "Aguardando elementos...",
        floatingBoxXpathClick: "Ações: %count%",
        floatingBoxXpathFinished: "Concluído",
        floatingBoxAllFinished: "Todas as tarefas foram concluídas!",
        reloadPageMessage: "A página será recarregada para reinjeção.",
        configSaved: "Configuração salva!",
        addXpathAlert: "Adicione uma configuração primeiro.",
        xpathLabel: "XP",
        clickLabel: "Ações",
        intervalLabel: "Intervalo:",
        elementsLabel: "Elementos",
        xpathWaitLabel: "Atraso do XP:",
        floatingBoxXPathInvalid: "XPath inválido",
        floatingBoxAllXpathsInvalid: "Todos os XPaths são inválidos",
        popupTitle: "Auto Clicker - Form Helper",
        appTitle: "Auto Clicker - Form Helper",
        deleteSettingsTitle: "Excluir configurações",
        importSettingsTitle: "Importar configurações",
        exportSettingsTitle: "Exportar configurações",
        iframeSelectorLabel: "Página principal (URL)",
        iframeSelectorPlaceholder: "ex.: http://www.exemplo.com",
        noElementsLabel: "Sem ações",
        xpathElementsLabel: "════════════════ Elemento XPath ════════════ Intervalo (ms) ════ Repetir ═══════",
        addXpathButton: "+ Adicionar XPath",
        saveButton: "Salvar",
        configImported: "✔ Configurações importadas com sucesso!",
        importError: "Erro ao importar o JSON.",
        configDeleted: "⚠ Configuração excluída.",
        modalYesButton: "Sim!",
        modalCancelButton: "Cancelar",
        modalDeleteConfirm: "Tem certeza de que deseja excluir a configuração ativa?",
        modalOneXpathActive: "Pelo menos um XPath deve estar ativo.",
        modalXpathLimit: "O número máximo de XPaths foi atingido.",
        xpathInputPlaceholder: "ex.: //button[@id='start']",
        emptyConfigExport: "Nenhuma configuração para exportar.",
        incompleteConfigExport: "Configurações incompletas! A URL ou seletor principal é obrigatório para exportar.",
        editFillButtonTitle: "Editar preenchimento",
        toggleModeButtonTitle: "Alternar modo",
        fillModeTitle: "Modo preencher",
        clickModeTitle: "Modo clique",
        fillModalTitle: "Configurar ação de preenchimento",
        fillSaveButton: "Salvar",
        fillCancelButton: "Cancelar",
        fillInputPlaceholder: "ex.: usuario",
        initialWaitInputLabel: "Atraso inicial (s):",
        clickOptionLabel: "Clique",
        typeOptionLabel: "Digitar",
        copyOptionLabel: "Copiar",
        disableAction: "Desativar",
        enableAction: "Ativar",
        invalidXPathInAction: "XPath inválido na ação:",
        invalidCSSSelectorInAction: "Seletor CSS inválido na ação:",
        editActionTitle: "#Editar ação",
        editActionDescription: "Configure os detalhes da ação aqui. Defina o valor a ser preenchido, o atraso inicial e o método de preenchimento.",
        editActionValueLabel: "Valor para preencher",
        editActionValuePlaceholder: "Ex: meu_usuario",
        editActionInitialDelayLabel: "Atraso inicial (s)",
        editActionInitialDelayTooltip: "Define o atraso inicial desta ação.",
        editActionPasteLabel: "Colar",
        editActionTypeLabel: "Digitar",
        modalSaveButtonLabel: "Salvar",
        modalCancelButtonLabel: "Cancelar",
        modeFillLabel: "Preencher",
        modeClickLabel: "Clique",
        headerElementFinderTooltip: "Localizador do elemento, pode ser XPath ou seletor CSS.",
        headerIntervalTooltip: "Intervalo em milissegundos entre repetições desta ação.",
        editMenuEdit: "Editar ação",
        editMenuDuplicate: "Duplicar",
        feedbackInfoTooltip: "Quando você habilita o modo FloatBox, uma caixa flutuante aparece no canto inferior direito da página mostrando as ações em tempo real.",
        statusEnabledLabel: "Ativada",
        statusDisabledLabel: "Desativada"
    };

    const translationsEn = {
        initialWaitLabel: "Initial Wait:",
        floatingBoxWaiting: "%time%",
        floatingBoxWaitingElements: "Waiting for elements...",
        floatingBoxXpathClick: "Actions: %count%",
        floatingBoxXpathFinished: "Completed",
        floatingBoxAllFinished: "All tasks completed!",
        reloadPageMessage: "Page will be reloaded for reinjection.",
        configSaved: "Configuration saved!",
        addXpathAlert: "Add a configuration first.",
        xpathLabel: "XP",
        clickLabel: "Actions",
        intervalLabel: "Interval:",
        elementsLabel: "Elements",
        xpathWaitLabel: "XP Delay:",
        floatingBoxXPathInvalid: "Invalid XPath",
        floatingBoxAllXpathsInvalid: "All XPaths are invalid",
        popupTitle: "Auto Clicker - Form Helper",
        appTitle: "Auto Clicker - Form Helper",
        deleteSettingsTitle: "Delete configurations",
        importSettingsTitle: "Import configurations",
        exportSettingsTitle: "Export configurations",
        iframeSelectorLabel: "Main page (URL)",
        iframeSelectorPlaceholder: "e.g., http://www.example.com",
        initialWaitPlaceholder: "Initial wait",
        noElementsLabel: "No actions",
        xpathElementsLabel: "════════════════ Element XPath ════════════ Interval (ms) ════ Repeat ═══════",
        addXpathButton: "+ Add XPath",
        saveButton: "Save",
        configImported: "✔ Configurations imported successfully!",
        importError: "Error importing JSON.",
        configDeleted: "⚠ Configuration deleted.",
        modalYesButton: "Yes!",
        modalCancelButton: "Cancel",
        modalDeleteConfirm: "Are you sure you want to delete the active configuration?",
        modalOneXpathActive: "At least one XPath must be active.",
        modalXpathLimit: "The maximum number of XPaths has been reached.",
        xpathInputPlaceholder: "e.g., //button[@id='start']",
        emptyConfigExport: "No configurations to export.",
        incompleteConfigExport: "Incomplete configurations! Main URL or selector is required to export.",
        editFillButtonTitle: "Edit fill",
        toggleModeButtonTitle: "Toggle mode",
        fillModeTitle: "Fill mode",
        clickModeTitle: "Click mode",
        fillModalTitle: "Configure fill action",
        fillSaveButton: "Save",
        fillCancelButton: "Cancel",
        fillInputPlaceholder: "e.g., username",
        initialWaitInputLabel: "Initial Wait (s):",
        clickOptionLabel: "Click",
        typeOptionLabel: "Type",
        copyOptionLabel: "Copy",
        disableAction: "Disable",
        enableAction: "Enable",
        invalidXPathInAction: "Invalid XPath in action:",
        invalidCSSSelectorInAction: "Invalid CSS Selector in action:",
        editActionTitle: "#Edit action",
        editActionDescription: "Configure the action details here. Set the value to fill, the initial delay and the fill method.",
        editActionValueLabel: "Value to fill",
        editActionValuePlaceholder: "E.g.: my_user",
        editActionInitialDelayLabel: "Initial delay (s)",
        editActionInitialDelayTooltip: "Defines this action's initial delay.",
        editActionPasteLabel: "Paste",
        editActionTypeLabel: "Type",
        modalSaveButtonLabel: "Save",
        modalCancelButtonLabel: "Cancel",
        modeFillLabel: "Fill",
        modeClickLabel: "Click",
        headerElementFinderTooltip: "Element locator, can be XPath or CSS selector.",
        headerIntervalTooltip: "Interval in milliseconds between repetitions of this action.",
        editMenuEdit: "Edit action",
        editMenuDuplicate: "Duplicate",
        feedbackInfoTooltip: "When you enable FloatBox mode, a floating box appears in the bottom-right corner of the page showing actions in real time.",
        statusEnabledLabel: "Enabled",
        statusDisabledLabel: "Disabled"
    };

    let translations = translationsEn;

    function setTranslationsByLanguage(lang) {
        const baseLang = (document.documentElement && document.documentElement.lang) ? document.documentElement.lang : 'pt-BR';
        currentUiLanguage = lang || baseLang || 'pt-BR';
        translations = currentUiLanguage === 'en' ? translationsEn : translationsPt;
    }

    function applyInterfaceLanguage(lang) {
        setTranslationsByLanguage(lang);

        if (document.documentElement) {
            document.documentElement.setAttribute('lang', currentUiLanguage);
        }

        const isEn = currentUiLanguage === 'en';

        const map = [
            { sel: '.status-label', pt: 'Configuração', en: 'Configuration' },
            { sel: '.btn-new-config', pt: 'Nova Config', en: 'New Config' },
            { sel: '#bulkExportBtn', pt: 'Exportar todas as configurações', en: 'Export all configurations' },
            { sel: '#bulkImportBtn', pt: 'Importar configurações', en: 'Import configurations' },
            { sel: '#bulkRemoveActiveBtn', pt: 'Remover configuração ativa', en: 'Remove active configuration' },
            { sel: '.config-title-bold', pt: 'Configurações', en: 'Settings' },
            { sel: '.action-title', pt: 'Ações', en: 'Action' },
            // Labels principais do formulário de configuração
            { sel: 'label[for="configName"]', pt: 'Nome', en: 'Name' },
            { sel: 'label[for="configUrl"]', pt: 'URL', en: 'URL' },
            { sel: 'label[for="initWait"]', pt: 'Atraso inicial (s)', en: 'Initial delay (s)' },
            // Cabeçalhos da tabela de ações
            { sel: '.header-item.header-name', pt: 'Nome', en: 'Name' },
            { sel: '.header-item.header-element-finder', pt: 'Localizador de elemento', en: 'Element Finder' },
            { sel: '.header-item.header-mode', pt: 'Modo', en: 'Mode' },
            { sel: '.header-item.header-interval-ms', pt: 'Intervalo (ms)', en: 'Inter. (ms)' },
            { sel: '.header-item.header-repeat', pt: 'Repet.', en: 'Repeat' },
            // Botão "Adicionar ação"
            { sel: '.btn-add-action', pt: 'Adicionar ação', en: 'Add action' },
            { sel: '#settingsPopup h3', pt: 'Configurações', en: 'Settings' },
            { sel: 'label[for="configMode"]', pt: 'Modo de configuração:', en: 'Configuration mode:' },
            { sel: '#securitySection h4', pt: 'Recursos', en: 'Resources' },
            { sel: '#blacklistTitle', pt: 'Lista de bloqueio', en: 'Blacklist' },
            { sel: 'label[for="sandboxMode"]', pt: 'Modo sandbox:', en: 'Sandbox mode:' },
            { sel: 'label[for="blacklistSites"]', pt: 'Sites bloqueados:', en: 'Blocked sites:' },
            { sel: '#settingsPopup h4.title-with-icon', pt: 'Feedback', en: 'Feedback' },
            { sel: 'label[for="feedbackNone"]', pt: 'Nenhum', en: 'None' },
            { sel: 'label[for="feedbackFloatbox"]', pt: 'FloatBox', en: 'FloatBox' },
            { sel: '.popup-footer .btn-save-popup', pt: 'Salvar', en: 'Save' },
            { sel: '.popup-footer .btn-cancel-popup', pt: 'Cancelar', en: 'Cancel' }
        ];

        map.forEach(item => {
            const el = document.querySelector(item.sel);
            if (!el) return;
            const text = isEn ? item.en : item.pt;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = text;
            } else {
                const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
                if (textNodes.length > 0) {
                    textNodes[0].textContent = text;
                    for (let i = 1; i < textNodes.length; i++) {
                        textNodes[i].textContent = textNodes[i].textContent.trim() ? ' ' : '';
                    }
                } else {
                    el.textContent = text;
                }
            }
        });

        const searchInput = document.getElementById('searchConfig');
        if (searchInput) {
            searchInput.placeholder = isEn ? 'Search configuration' : 'Buscar configuração';
        }

        // Ajustar opções dos selects de configuração de acordo com o idioma
        const configModeSelect = document.getElementById('configMode');
        if (configModeSelect) {
            Array.from(configModeSelect.options).forEach(opt => {
                if (opt.value === 'beginner') {
                    opt.textContent = isEn ? 'Beginner' : 'Iniciante';
                } else if (opt.value === 'advanced') {
                    opt.textContent = isEn ? 'Advanced' : 'Avançado';
                }
            });
        }

        const contentScriptSelect = document.getElementById('contentScriptApi');
        if (contentScriptSelect) {
            Array.from(contentScriptSelect.options).forEach(opt => {
                if (opt.value === 'dynamicUserScriptApi') {
                    opt.textContent = isEn ? 'None' : 'Nenhum';
                } else if (opt.value === 'userScriptApi') {
                    opt.textContent = 'UserScripts';
                }
            });
        }

        const sandboxModeSelect = document.getElementById('sandboxMode');
        if (sandboxModeSelect) {
            Array.from(sandboxModeSelect.options).forEach(opt => {
                if (opt.value === 'default') {
                    opt.textContent = isEn ? 'Default' : 'Padrão';
                } else if (opt.value === 'forceDOM') {
                    opt.textContent = isEn ? 'Force DOM' : 'Forçar DOM';
                }
            });
        }

        // Pill do popup de configurações (Settings / Configurações)
        const settingsPill = document.querySelector('#settingsPopup .settings-title-group .modal-pill');
        if (settingsPill) {
            settingsPill.textContent = isEn ? 'SETTINGS' : 'CONFIGURAÇÕES';
        }

        // -------- Modal "Editar ação" --------
        const editTitle = document.querySelector('#actionConfigModal .modal-header h3');
        if (editTitle) {
            editTitle.textContent = translations.editActionTitle;
        }

        const editDescription = document.querySelector('#actionConfigModal .modal-description');
        if (editDescription) {
            editDescription.textContent = translations.editActionDescription;
        }

        const valueLabel = document.querySelector('label[for="modalValueInput"]');
        if (valueLabel) {
            valueLabel.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) node.textContent = translations.editActionValueLabel;
            });
        }

        const valueInput = document.getElementById('modalValueInput');
        if (valueInput) {
            valueInput.placeholder = translations.editActionValuePlaceholder;
        }

        const delayLabel = document.querySelector('label[for="modalActionInitialWait"]');
        if (delayLabel) {
            const textNodes = Array.from(delayLabel.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
            if (textNodes.length > 0) {
                textNodes[0].textContent = translations.editActionInitialDelayLabel + ' ';
                for (let i = 1; i < textNodes.length; i++) {
                    textNodes[i].textContent = '';
                }
            }
        }
        const delayInfoIcon = delayLabel ? delayLabel.querySelector('.info-icon') : null;
        if (delayInfoIcon) {
            delayInfoIcon.title = translations.editActionInitialDelayTooltip;
        }

        const pasteLabel = document.querySelector('label[for="pasteOption"]');
        if (pasteLabel) {
            pasteLabel.textContent = translations.editActionPasteLabel;
        }
        const typeLabel = document.querySelector('label[for="typeOption"]');
        if (typeLabel) {
            typeLabel.textContent = translations.editActionTypeLabel;
        }

        const modalSaveBtn = document.querySelector('#actionConfigModal .btn-save-modal');
        if (modalSaveBtn) {
            modalSaveBtn.textContent = translations.modalSaveButtonLabel;
        }
        const modalCancelBtn = document.querySelector('#actionConfigModal .btn-cancel-modal');
        if (modalCancelBtn) {
            modalCancelBtn.textContent = translations.modalCancelButtonLabel;
        }

        // Tooltips dos cabeçalhos da tabela de ações
        const headerElementInfo = document.querySelector('.header-item.header-element-finder .info-icon');
        if (headerElementInfo) {
            headerElementInfo.title = translations.headerElementFinderTooltip || translations.headerElementFinderTooltip;
        }
        const headerIntervalInfo = document.querySelector('.header-item.header-interval-ms .info-icon');
        if (headerIntervalInfo) {
            headerIntervalInfo.title = translations.headerIntervalTooltip;
        }

        // Menu de edição da ação
        const editMenuEdit = document.querySelector('#edit-action-menu-template .edit-action-option');
        if (editMenuEdit) {
            const textNode = Array.from(editMenuEdit.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
            if (textNode) textNode.textContent = ' ' + translations.editMenuEdit;
        }
        const editMenuDuplicate = document.querySelector('#edit-action-menu-template .duplicate-action-option');
        if (editMenuDuplicate) {
            const textNode = Array.from(editMenuDuplicate.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
            if (textNode) textNode.textContent = ' ' + translations.editMenuDuplicate;
        }
        const editMenuDisableSpan = document.querySelector('#edit-action-menu-template .disable-action-option .action-text');
        if (editMenuDisableSpan) {
            editMenuDisableSpan.textContent = translations.disableAction;
        }

        // Tooltip da seção Feedback nas configurações
        const feedbackInfoIcon = document.querySelector('#settingsPopup h4.title-with-icon .info-icon');
        if (feedbackInfoIcon) {
            feedbackInfoIcon.title = translations.feedbackInfoTooltip;
        }

        // Atualizar labels do select de modo (Preencher/Clique ou Fill/Click)
        const modeSelects = document.querySelectorAll('.action-mode-select');
        modeSelects.forEach(select => {
            Array.from(select.options).forEach(opt => {
                if (opt.value === 'fill') {
                    opt.textContent = translations.modeFillLabel;
                } else if (opt.value === 'click') {
                    opt.textContent = translations.modeClickLabel;
                }
            });
        });

        // Atualiza o badge de status da extensão com o texto correto no idioma atual
        updateExtensionStatus();

        // Marca a página como inicializada para evitar o flash
        // do HTML no idioma padrão antes da tradução ser aplicada.
        const root = document.documentElement;
        if (root.classList.contains('acfh-lang-init-pending')) {
            root.classList.remove('acfh-lang-init-pending');
        }
        root.classList.add('acfh-lang-init-ready');
    }

    const svgs = {
        waitingTime: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8V12L15 15" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="9" stroke="#ABB2BF" stroke-width="2"/>
            </svg>
        `,
        waitingElements: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M21 21L16.65 16.65" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        xpathClick: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8" fill="#00FF00"/>
            </svg>
        `,
        xpathFinished: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        allFinished: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        invalidXpath: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13" stroke="#FF5722" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 17H12.01" stroke="#FF5722" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10.29 3.86L2.3 17.51C1.63 18.66 2.43 20 3.79 20H20.21C21.57 20 22.37 18.66 21.7 17.51L13.71 3.86C13.39 3.32 12.61 3.32 12.29 3.86Z" stroke="#FF5722" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        trashIcon: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H21" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M19 6V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V6M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 11V17" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M14 11V17" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        penIcon: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 20H20" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18.0001 2.00008C18.2653 1.73489 18.5835 1.52733 18.9381 1.38874C19.2927 1.25016 19.6766 1.18344 20.0631 1.19245C20.4496 1.20147 20.8291 1.28607 21.1824 1.44023C21.5356 1.59439 21.8596 1.81599 22.1462 2.1026C22.4328 2.38921 22.6544 2.71324 22.8086 3.06649C22.9627 3.41975 23.0473 3.79924 23.0564 4.18579C23.0654 4.57234 22.9987 4.95625 22.8601 5.31086C22.7215 5.66547 22.5140 5.98366 22.2488 6.24885L7.5 21L2 22L3 16.5L18.0001 2.00008Z" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        mouseClick: `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.686 2 6 4.686 6 8V16C6 19.314 8.686 22 12 22C15.314 22 18 19.314 18 16V8C18 4.686 15.314 2 12 2Z" stroke="#ABB2BF" stroke-width="2"/>
              <path d="M12 2V8" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `,
        ballIcon: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#007BFF"/>
            </svg>
        `,
        typeIcon: `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 4H8C5.79086 4 4 5.79086 4 8V16C4 18.2091 5.79086 20 8 20H16C18.2091 20 20 18.2091 20 16V8C20 5.79086 18.2091 4 16 4Z" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M9 10L15 10" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 10V14" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        copyIcon: `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `
    };

    toggleMutationObserveOption();

    function showFillModal(currentFillValue, currentWaitInitModal) {
        const fillModal = document.getElementById("actionConfigModal");
        const fillTextInput = document.getElementById("modalValueInput");
        const initialWaitInput = document.getElementById("modalActionInitialWait");
        const fillSaveButton = document.querySelector(".btn-save-modal");
        const fillCancelButton = document.querySelector(".btn-cancel-modal");

        if (!fillModal || !fillTextInput || !initialWaitInput || !fillSaveButton || !fillCancelButton) {
            console.error("Error: Fill modal elements not found.");
            return Promise.resolve(undefined);
        }

        fillTextInput.value = currentFillValue;
        initialWaitInput.value = currentWaitInitModal;
        fillModal.style.display = "block";

        return new Promise((resolve) => {
            const onSave = () => {
                const newValue = fillTextInput.value;
                const newWaitInitModal = parseFloat(initialWaitInput.value) || 0;
                fillModal.style.display = "none";
                fillSaveButton.removeEventListener("click", onSave);
                fillCancelButton.removeEventListener("click", onCancel);
                resolve({ newValue, newWaitInitModal });
            };

            const onCancel = () => {
                fillModal.style.display = "none";
                fillSaveButton.removeEventListener("click", onSave);
                fillCancelButton.removeEventListener("click", onCancel);
                resolve(undefined);
            };

            fillSaveButton.addEventListener("click", onSave);
            fillCancelButton.addEventListener("click", onCancel);
        });
    }
    

    // Função para carregar o Action name do localStorage
function loadActionNameFromLocalStorage(actionRow) {
    if (!actionRow || !activeConfigId) return;
    
    const actionIndex = Array.from(xpathActionsContainer.querySelectorAll('.xpath-action-row')).indexOf(actionRow);
    const actionNameInput = actionRow.querySelector('.col-name input');
    
    if (!actionNameInput) return;
    
    // Tenta carregar do localStorage
    const savedActionName = localStorage.getItem(`action_name_${activeConfigId}_${actionIndex}`);
    
    if (savedActionName) {
        actionNameInput.value = savedActionName;
        console.log(`Action name "${savedActionName}" carregado do localStorage para configuração ${activeConfigId}, ação ${actionIndex}`);
    }
}

// Função para limpar Action names do localStorage quando uma configuração é excluída
// Função para limpar Action names do localStorage quando uma configuração é excluída
// Função para limpar Action names do localStorage quando uma configuração é excluída
function clearActionNamesFromLocalStorage(configId) {
    if (!configId) return;
    
    console.log(`Iniciando limpeza do localStorage para config ${configId}`);
    
    // Remover todas as chaves relacionadas a esta configuração
    const keysToRemove = [];
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key) {
            // Verifica se a chave está relacionada à configuração
            if (key.startsWith(`action_name_${configId}_`) || 
                key === `scriptLastEdited_${configId}` ||
                key === `customScript_${configId}` ||
                key === `UserScript_${configId}`) {
                keysToRemove.push(key);
            }
        }

        try {
            window.dispatchEvent(new CustomEvent('acfh-language-change', { detail: { lang: currentUiLanguage } }));
        } catch {
            // ignore
        }
    }
    
    // Remover todas as chaves encontradas
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Removido do localStorage: ${key}`);
    });
    
    // Log se nada foi encontrado
    if (keysToRemove.length === 0) {
        console.log(`Nenhuma chave relacionada à config ${configId} encontrada no localStorage`);
    }
}
// Função para atualizar Action names ao carregar uma configuração
function loadAllActionNamesForConfig() {
    if (!activeConfigId) return;
    
    const actionRows = xpathActionsContainer.querySelectorAll('.xpath-action-row');
    actionRows.forEach((row, index) => {
        loadActionNameFromLocalStorage(row);
    });
}







    function saveActionNameToLocalStorage(actionRow) {
    if (!actionRow || !activeConfigId) return;
    
    const actionNameInput = actionRow.querySelector('.col-name input');
    if (!actionNameInput) return;
    
    const actionName = actionNameInput.value.trim();
    const actionIndex = Array.from(xpathActionsContainer.querySelectorAll('.xpath-action-row')).indexOf(actionRow);
    
    // Salva no localStorage usando a chave composta
    localStorage.setItem(`action_name_${activeConfigId}_${actionIndex}`, actionName);
    console.log(`Action name "${actionName}" salvo no localStorage para configuração ${activeConfigId}, ação ${actionIndex}`);
}

    function showModal(message, withCancel = false) {
        return new Promise((resolve) => {
            const existingModal = document.querySelector('.modal');
            if (existingModal) {
                existingModal.remove();
            }

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${translations.appTitle}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary modal-ok">${translations.modalYesButton}</button>
                        ${withCancel ? `<button class="btn btn-danger modal-cancel">${translations.modalCancelButton}</button>` : ''}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const okBtn = modal.querySelector('.modal-ok');
            const cancelBtn = modal.querySelector('.modal-cancel');

            const close = (result) => {
                modal.remove();
                okBtn.removeEventListener('click', okHandler);
                if (cancelBtn) {
                    cancelBtn.removeEventListener('click', cancelHandler);
                }
                resolve(result);
            };

            const okHandler = () => {
                console.log('Yes! clicked');
                close(true);
            };
            const cancelHandler = () => {
                console.log('Cancel clicked');
                close(false);
            };

            okBtn.addEventListener('click', okHandler);
            if (withCancel && cancelBtn) {
                cancelBtn.addEventListener('click', cancelHandler);
            } else {
                setTimeout(() => close(undefined), 3000);
            }
        });
    }

    function showTemporaryMessage(message, type = 'success', duration = 1500) {
        if (!saveNotification) {
            console.error("saveNotification element not found.");
            return;
        }

        clearTimeout(saveTimeout);
        saveNotification.classList.remove('show', 'save-error');

        const textElement = saveNotification.querySelector('.save-text');
        if (textElement) {
            textElement.textContent = message;
        } else {
            console.error(".save-text element not found in saveNotification.");
            return;
        }

        const progressBar = document.querySelector('.save-progress-bar');
        if (progressBar) {
            progressBar.style.transition = 'none';
            progressBar.style.width = '0';
            progressBar.offsetWidth;
            progressBar.style.transition = 'width 1.2s linear';
            progressBar.style.backgroundColor = type === 'error' ? 'var(--red-btn, #dc3545)' : 'var(--green-btn, #28a745)';
        }

        if (type === 'error') {
            saveNotification.classList.add('save-error');
        }

        saveNotification.classList.add('show');
        if (progressBar) {
            progressBar.style.width = '100%';
        }

        saveTimeout = setTimeout(() => {
            saveNotification.classList.remove('show', 'save-error');
            if (progressBar) {
                progressBar.style.width = '0';
            }
        }, duration);
    }

function deleteAllConfigurations() {
    showModal(translations.modalDeleteConfirm, true).then((confirmed) => {
        if (confirmed) {
            // Limpar todos os action names de todas as configurações
            configurations.forEach(config => {
                clearActionNamesFromLocalStorage(config.id);
            });
            
            configurations = [];
            activeConfigId = null;
            
            acfhStorage.set({ configurations, activeConfigId }, () => {
                updateConfigListAndDropdown();
                setActiveConfig(null);
                showTemporaryMessage(translations.configDeleted);
                
                // Limpar completamente o localStorage
                localStorage.clear();
                console.log('LocalStorage completamente limpo.');
            });
        }
    });
}


function cleanupOrphanedLocalStorageData() {
    const configIds = configurations.map(cfg => cfg.id);
    
    // Limpar action names de configurações que não existem mais
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('action_name_')) {
            const parts = key.split('_');
            if (parts.length >= 3) {
                const configId = parts[2]; // action_name_[configId]_[index]
                if (!configIds.includes(configId)) {
                    localStorage.removeItem(key);
                    console.log(`Removido dado órfão do localStorage: ${key}`);
                }
            }
        }
    }
}
// Adicionar limpeza de dados órfãos
    setTimeout(() => {
        cleanupOrphanedLocalStorageData();
    }, 1000);

    // Atualizar a função adicionarXPathInput para salvar automaticamente
function adicionarXPathInput(
    valor = "",
    isChecked = true,
    intervalo = 1000,
    repeticoes = 1,
    fillValue = "",
    waitInitModal = 0,
    mode = "click",
    fillMethod = "paste",
    isCSSSelector = false,
    actionMode = "default",
    actionName = "" // NOVO PARÂMETRO: nome específico da ação
) {
    if (!activeConfigId) {
        showTemporaryMessage(translations.addXpathAlert, 'error');
        return;
    }

    const actionRows = xpathActionsContainer.querySelectorAll('.xpath-action-row');
    if (actionRows.length >= 9999999) {
        showModal(translations.modalXpathLimit, false);
        return;
    }

    acfhStorage.get(['configMode', 'sandboxMode'], (data) => {
        const configMode = data.configMode || 'beginner';
        const sandboxMode = data.sandboxMode || 'default';
        const isMutationObserveAllowed = configMode === 'advanced' && sandboxMode === 'forceDOM';
        
        if (actionMode === 'mutationObserve' && !isMutationObserveAllowed) {
            actionMode = 'default';
            showTemporaryMessage('Mutation Observe mode is disabled. Using Default mode.', 'warning');
        }

        const newActionRow = xpathActionTemplate.content.cloneNode(true);
        const actionRowDiv = newActionRow.querySelector('.xpath-action-row');

        // MUDANÇA AQUI: Usar o nome fornecido ou o padrão
        const nameInput = actionRowDiv.querySelector('.col-name input');
        nameInput.value = actionName || `Action ${actionRows.length + 1}`;

        const elementFinderInput = actionRowDiv.querySelector('.col-element-finder input');
        elementFinderInput.value = valor;
        elementFinderInput.placeholder = isCSSSelector
            ? "e.g., button#start, .btn-primary"
            : "//button[@id='start']";

        elementFinderInput.addEventListener('input', function () {
            const value = this.value.trim();
            const isCurrentCSS = !isXPath(value);
            actionRowDiv.setAttribute('data-is-css-selector', isCurrentCSS);
            elementFinderInput.placeholder = isCurrentCSS
                ? "e.g., button#start, .btn-primary"
                : "//button[@id='start']";
            hasUnsavedChanges = true;
            saveCurrentConfiguration(false);
        });

        const modeSelect = actionRowDiv.querySelector('.action-mode-select');
        if (modeSelect) {
            // Garante que o texto das opções respeita o idioma atual (Fill/Click ou Preencher/Clique)
            Array.from(modeSelect.options).forEach(opt => {
                if (opt.value === 'fill') {
                    opt.textContent = translations.modeFillLabel;
                } else if (opt.value === 'click') {
                    opt.textContent = translations.modeClickLabel;
                }
            });
            modeSelect.value = mode;

            // Atualiza o placeholder da coluna Name para refletir o modo atual
            const colNameInput = actionRowDiv.querySelector('.col-name input');
            if (colNameInput) {
                if (mode === 'fill') {
                    colNameInput.placeholder = translations.fillModeTitle || translations.modeFillLabel;
                } else {
                    colNameInput.placeholder = translations.clickModeTitle || translations.modeClickLabel;
                }
            }
        }
        const intervalCol = actionRowDiv.querySelector('.col-interval-ms');
        const repeatCol = actionRowDiv.querySelector('.col-repeat');
        const intervalInput = intervalCol ? intervalCol.querySelector('input') : null;
        const repeatInput = repeatCol ? repeatCol.querySelector('input') : null;
        if (intervalInput) intervalInput.value = intervalo;
        if (repeatInput) repeatInput.value = repeticoes;
        actionRowDiv.setAttribute('data-fill-value', fillValue);
        actionRowDiv.setAttribute('data-fill-method', fillMethod);
        actionRowDiv.setAttribute('data-action-init-wait', waitInitModal);
        actionRowDiv.setAttribute('data-is-css-selector', isCSSSelector);
        actionRowDiv.setAttribute('data-action-mode', actionMode);

        const isMutationObserve = actionMode === 'mutationObserve';
        if (intervalCol) intervalCol.style.display = isMutationObserve ? 'none' : '';
        if (repeatCol) repeatCol.style.display = isMutationObserve ? 'none' : '';

        const colMode = actionRowDiv.querySelector('.col-mode');
        const modeDisplay = document.createElement('div');
        modeDisplay.classList.add('mode-display');
        modeDisplay.classList.add(mode === 'click' ? 'click-mode' : 'fill-mode');
        modeDisplay.innerHTML = mode === 'click' ? svgs.mouseClick : '';
        colMode.appendChild(modeDisplay);

    xpathActionsContainer.appendChild(actionRowDiv);
    updateActionNumbers();
    updateIntervalRepeatHeadersVisibility();
    updateIntervalRepeatHeadersVisibility();
        addEventListenersToActionRow(actionRowDiv);
        hasUnsavedChanges = true;
        saveCurrentConfiguration(false);
        console.log(`New action added (${isCSSSelector ? 'CSS Selector' : 'XPath'}, Mode: ${actionMode}).`);
    });
}

    function isXPath(selector) {
        return selector.startsWith('/') || selector.startsWith('./') || selector.startsWith('(');
    }

    const scriptEditorIconBtn = document.getElementById('scriptEditorIconBtn');

if (scriptEditorIconBtn) {
    scriptEditorIconBtn.addEventListener('click', async function() {
        const isAvailable = await isUserScriptsAvailable();
        if (!isAvailable) {
     showModal(
    '<b>Attention!</b><br>To use this feature, you need to enable <b>User Scripts</b> in the extension settings:<br>1. Open your extensions: chrome://extensions/<br>2. Find this extension and click <b>Details</b>.<br>3. Enable <b>Allow User Scripts</b>.<br>After that, everything should work normally!',
    false
);


            return;
        }

        if (!activeConfigId) {
            showTemporaryMessage('No active configuration. Create one first.', 'error');
            return;
        }

        // Salva qualquer mudança não salva na UI antes de abrir o editor
        if (hasUnsavedChanges) {
            saveCurrentConfiguration(false);
        }

        const config = configurations.find(cfg => cfg.id == activeConfigId);
        if (!config) {
            showTemporaryMessage('Active configuration not found.', 'error');
            return;
        }

        if (!config.name || !config.url) {
            showTemporaryMessage('Configuration name and URL are required.', 'error');
            return;
        }

        // Gera o script com base nos dados mais recentes da configuração
        const generatedScript = await generateDynamicUserScript(config, false);
        showScriptEditorModal(config, generatedScript);
    });
}

// Helper function to compare configurations
function areConfigsEquivalent(scriptConfig, uiConfig) {
    if (!scriptConfig || !uiConfig) return false;

    // Compare name, URL, and initWait
    if (scriptConfig.name !== uiConfig.name ||
        scriptConfig.url !== uiConfig.url ||
        scriptConfig.initWait !== uiConfig.initWait) {
        return false;
    }

    // Compare actions array
    if (!scriptConfig.actions || !uiConfig.actions ||
        scriptConfig.actions.length !== uiConfig.actions.length) {
        return false;
    }

    // Compare each action
    return scriptConfig.actions.every((scriptAction, index) => {
        const uiAction = uiConfig.actions[index];
        return scriptAction.name === uiAction.name &&
               scriptAction.selector === uiAction.elementFinder &&
               scriptAction.isCSS === uiAction.isCSSSelector &&
               scriptAction.mode === uiAction.mode &&
               scriptAction.value === uiAction.fillValue &&
               scriptAction.fillMethod === uiAction.fillMethod &&
               scriptAction.interval === uiAction.intervalMs &&
               scriptAction.repeat === uiAction.repeat &&
               scriptAction.waitBefore === uiAction.actionInitWait &&
               scriptAction.disabled === uiAction.disabled &&
               scriptAction.actionMode === uiAction.actionMode;
    });
}
    function isUserScriptsAvailable() {
        return new Promise(resolve => {
            if (!chrome.userScripts || !chrome.userScripts.getScripts || !chrome.userScripts.register) {
                resolve(false);
                return;
            }
            chrome.userScripts.getScripts(() => {
                if (chrome.runtime.lastError) {
                    console.error('User Scripts API not accessible:', chrome.runtime.lastError.message);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    function validateAndFormatUrl(url) {
        if (!url || url.trim() === '') {
            return '*://*/*';
        }

        let formattedUrl = url.trim();

        if (!formattedUrl.match(/^https?:\/\//)) {
            formattedUrl = 'https://' + formattedUrl;
        }

        if (!formattedUrl.endsWith('/*')) {
            formattedUrl = formattedUrl.replace(/\/*$/, '/*');
        }

        try {
            const testUrl = formattedUrl.replace('/*', '');
            new URL(testUrl);

            const validPatternRegex = /^(https?:\/\/[^\/]+\/.*|\*:\/\/\*\/\*)$/;
            if (!validPatternRegex.test(formattedUrl)) {
                console.warn(`Invalid URL pattern: ${formattedUrl}. Falling back to default '*://*/*'.`);
                return '*://*/*';
            }

            return formattedUrl;
        } catch (e) {
            console.warn(`Invalid URL detected: ${formattedUrl}. Using default pattern '*://*/*'. Error: ${e.message}`);
            return '*://*/*';
        }
    }

    function extractConfigFromScript(script) {
        const configMatch = script.match(/const config = \{[\s\S]*?\};/);
        if (!configMatch) {
            return null;
        }

        let configStr = configMatch[0];
        configStr = configStr.replace(/^const config =\s*/, '').replace(/;$/, '');
        configStr = configStr.replace(/Infinity/g, 'null');

        try {
            const configObj = JSON.parse(configStr);
            
            if (!configObj.name || !configObj.url) {
                console.warn('Invalid configuration: missing name or URL. Saving script as invalid.');
                return null;
            }

            const formattedActions = (configObj.actions || []).map((action, index) => {
                if (!action.selector) {
                    throw new Error(`Invalid action at index ${index}: missing selector.`);
                }
                const interval = action.actionMode === 'mutationObserve' ? null : String(action.interval || 1000);
                const repeat = action.actionMode === 'mutationObserve' ? null : (action.repeat === null ? -2 : action.repeat || 1);
                return {
                    name: action.name || `Action ${index + 1}`,
                    elementFinder: action.selector || '',
                    mode: action.mode || 'click',
                    intervalMs: interval,
                    repeat: repeat,
                    fillValue: action.value || '',
                    fillMethod: action.mode === 'fill' ? (action.fillMethod || 'paste') : 'paste',
                    actionInitWait: String(action.waitBefore / 1000 || 0),
                    disabled: action.disabled || false,
                    isCSSSelector: action.isCSS || false,
                    actionMode: action.actionMode || 'default'
                };
            });

            return {
                id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
                name: configObj.name || 'Unnamed Configuration',
                url: configObj.url || '*://*/*',
                initWait: String(configObj.initWait / 1000 || 0),
                actions: formattedActions
            };
        } catch (e) {
            console.warn('Error parsing config from script:', e);
            showTemporaryMessage('Invalid script configuration detected. Script saved to local storage.', 'error');
            return null;
        }
    }

function saveUserScript(script, configId = null) {
    // 1) Não considerar como "script salvo" quando o conteúdo é
    // apenas o template base (IIFE com console.log e comentários
    // padrão, sem código extra). Nesse caso, limpamos quaisquer
    // chaves e removemos o indicador visual.
    if (script && isBaseTemplateScript(script)) {
        console.log('Base template script detected (web options). Clearing saved script info.');

        if (configId) {
            const keysToRemove = [
                `customScript_${configId}`,
                `UserScript_${configId}`,
                `scriptLastEdited_${configId}`
            ];
            acfhStorage.remove(keysToRemove, () => {
                console.log('Removed base-template script keys for config', configId);
            });
        }

        if (scriptEditorIconBtn) {
            scriptEditorIconBtn.classList.remove('script-saved');
        }
        return;
    }

    // 2) Qualquer outro script (com conteúdo próprio) mantém o
    // comportamento anterior: salvar e mostrar o pontinho.
    const UserScriptKey = configId ? `UserScript_${configId}` : `UserScript_${Date.now()}`;
    const storageData = {
        [UserScriptKey]: {
            scriptContent: script,
            timestamp: new Date().toISOString(),
            reason: 'Invalid config extraction'
        }
    };

    acfhStorage.set(storageData, () => {
        console.log(`Invalid script saved with key: ${UserScriptKey}`);
        showTemporaryMessage(`Saved as ${UserScriptKey}`, 'warning');
        if (scriptEditorIconBtn) {
            scriptEditorIconBtn.classList.add('script-saved');
        }
    });
}


  function showScriptEditorModal(config, initialScriptContent = null) {
    const existingModal = document.querySelector('.script-editor-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const UserScriptKey = `UserScript_${config.id}`;
    acfhStorage.get([UserScriptKey], (data) => {
        let scriptContentPromise;

        const hasActions = Array.isArray(config.actions) && config.actions.length > 0;

        // Regra desejada:
        // - Se HÁ ações configuradas, o editor deve sempre começar
        //   com o script gerado a partir dessas ações (ignora inválidos antigos).
        // - Se NÃO há nenhuma ação, aí sim usamos o último script
        //   inválido/personalizado salvo como ponto de partida.
        if (data[UserScriptKey] && !hasActions) {
            scriptContentPromise = Promise.resolve(data[UserScriptKey].scriptContent);
            showTemporaryMessage(`Loaded invalid script: ${UserScriptKey}`, 'warning');
        } else {
            scriptContentPromise = initialScriptContent
                ? Promise.resolve(initialScriptContent)
                : generateDynamicUserScript(config, false);
        }

        scriptContentPromise.then(scriptContent => {
            const modal = document.createElement('div');
            modal.className = 'modal script-editor-modal';
            modal.innerHTML = `
                <div class="modal-content script-editor-content">
                    <div class="modal-header">
                        <h3>UserScript Editor</h3>
                        <div class="modal-actions">
                            <button class="btn-toggle-fullscreen" title="Toggle Fullscreen">⛶</button>
                            <span class="close-btn">&times;</span>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div class="script-info">
                            <p><strong>Namespace:</strong> ${config.name}</p>
                            <p><strong>URL Match:</strong> ${validateAndFormatUrl(config.url)}</p>
                        </div>
                        <div id="scriptEditor" class="script-editor"></div>
                        <div class="invalid-scripts-section">
                            <label for="UserScriptsSelect">Load Script:</label>
                            <select id="UserScriptsSelect">
                                <option value="">Select an script</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary btn-save-script">Save</button>
                        <button class="btn btn-secondary btn-load-saved-script">Load Saved Script</button>
                        <button class="btn btn-danger btn-cancel-script">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const editorElement = modal.querySelector('#scriptEditor');
            const createFallbackEditor = (container, value) => {
                const textarea = document.createElement('textarea');
                textarea.className = 'script-editor-fallback';
                textarea.value = value || '';
                textarea.spellcheck = false;
                textarea.style.width = '100%';
                textarea.style.minHeight = '240px';
                container.appendChild(textarea);

                return {
                    getValue: () => textarea.value,
                    setValue: (nextValue) => {
                        textarea.value = nextValue;
                    },
                    refresh: () => {},
                    setSize: (width, height) => {
                        if (width) {
                            textarea.style.width = typeof width === 'number' ? `${width}px` : width;
                        }
                        if (height) {
                            textarea.style.height = typeof height === 'number' ? `${height}px` : height;
                        }
                    },
                    getWrapperElement: () => textarea
                };
            };

            const editor = (typeof CodeMirror === 'function')
                ? CodeMirror(editorElement, {
                    value: scriptContent,
                    mode: 'javascript',
                    theme: 'monokai',
                    lineNumbers: true,
                    lineWrapping: true,
                    indentUnit: 4,
                    matchBrackets: true,
                    autoCloseBrackets: true
                })
                : createFallbackEditor(editorElement, scriptContent);

            // **SALVAR COM CTRL+S**
            const editorKeyTarget = typeof editor.getWrapperElement === 'function'
                ? editor.getWrapperElement()
                : editorElement;

            editorKeyTarget.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    saveBtn.click();
                }
            });

const resizeEditor = () => {
    const body = modal.querySelector('.modal-body');
    const header = modal.querySelector('.modal-header');
    const footer = modal.querySelector('.modal-footer');
    const scriptInfo = modal.querySelector('.script-info');
    const invalidScripts = modal.querySelector('.invalid-scripts-section');
    
    const availableHeight = body.clientHeight - 
                          header.offsetHeight - 
                          footer.offsetHeight - 
                          scriptInfo.offsetHeight - 
                          invalidScripts.offsetHeight - 40; // margens
    
    editor.setSize("100%", `${Math.max(availableHeight, 200)}px`);
    editor.refresh();
};

// Chame o resize quando o modal abrir e na mudança de tamanho da janela
setTimeout(() => {
    resizeEditor();
    editor.refresh();
}, 100);

window.addEventListener("resize", resizeEditor);

// Fullscreen toggle otimizado
const toggleFullscreenBtn = modal.querySelector('.btn-toggle-fullscreen');
toggleFullscreenBtn.addEventListener('click', () => {
    modal.classList.toggle('fullscreen');
    setTimeout(() => {
        resizeEditor();
        editor.refresh();
    }, 100);
});

// Dropdown scripts inválidos/salvos
const UserScriptsSelect = modal.querySelector('#UserScriptsSelect');
let defaultScriptKey = null;

acfhStorage.get(null, (data) => {
    const relevantKeys = Object.keys(data).filter(key =>
        (key.startsWith('UserScript_') || key.startsWith('customScript_')) &&
        key.includes(`_${config.id}`)
    );

    if (relevantKeys.length > 0) {
        const customScriptKey = relevantKeys.find(key => key.startsWith('customScript_'));
        defaultScriptKey = customScriptKey || relevantKeys[0];

        relevantKeys.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            const isInvalid = key.startsWith('UserScript_');
            option.textContent = `${key} (${data[key].timestamp}${isInvalid ? ': Injected' : ': Saved'})`;
            UserScriptsSelect.appendChild(option);
        });

        if (defaultScriptKey) {
            UserScriptsSelect.value = defaultScriptKey;
        }
    }
});


            UserScriptsSelect.addEventListener('change', () => {
                const selectedKey = UserScriptsSelect.value;
                if (selectedKey) {
                    acfhStorage.get([selectedKey], (data) => {
                        if (data[selectedKey]) {
                            editor.setValue(data[selectedKey].scriptContent || data[selectedKey]);
                            showTemporaryMessage(`Loaded: ${selectedKey}`, 'warning');
                        }
                    });
                }
            });

            // Botões
            const closeBtn = modal.querySelector('.close-btn');
            const saveBtn = modal.querySelector('.btn-save-script');
            const loadSavedScriptBtn = modal.querySelector('.btn-load-saved-script');
            const cancelBtn = modal.querySelector('.btn-cancel-script');

            closeBtn.addEventListener('click', () => modal.remove());
            cancelBtn.addEventListener('click', () => modal.remove());

            if (loadSavedScriptBtn) {
                loadSavedScriptBtn.addEventListener('click', () => {
                    acfhStorage.get([`customScript_${config.id}`], (data) => {
                        const savedScript = data[`customScript_${config.id}`];
                        if (savedScript) {
                            editor.setValue(savedScript);
                            showTemporaryMessage('Loaded saved script!');
                        } else {
                            generateDynamicUserScript(config, false).then(newScript => {
                                editor.setValue(newScript);
                                showTemporaryMessage('No saved script. Loaded template.', 'warning');
                            });
                        }
                    });
                });
            }

            saveBtn.addEventListener('click', () => {
                const updatedScript = editor.getValue();
                const validUrl = validateAndFormatUrl(config.url);

                if (!updatedScript.includes('==UserScript==') ||
                    !updatedScript.includes(config.name) ||
                    !updatedScript.includes(validUrl)) {
                    showTemporaryMessage('Script must include UserScript header with correct name and URL match.', 'error');
                    saveUserScript(updatedScript, config.id);
                    return;
                }

                const extractedConfig = extractConfigFromScript(updatedScript);
                if (extractedConfig) {
                    if (!extractedConfig.name || !extractedConfig.url) {
                        showTemporaryMessage('Invalid configuration: name and URL are required.', 'error');
                        saveUserScript(updatedScript, config.id);
                        return;
                    }

                    const configIndex = configurations.findIndex(cfg => cfg.id === config.id);
                    if (configIndex !== -1) {
                        configurations[configIndex] = {
                            id: config.id,
                            name: extractedConfig.name,
                            url: extractedConfig.url,
                            initWait: extractedConfig.initWait,
                            actions: extractedConfig.actions.map(action => ({
                                name: action.name,
                                elementFinder: action.elementFinder,
                                mode: action.mode,
                                intervalMs: action.intervalMs,
                                repeat: action.repeat,
                                fillValue: action.fillValue,
                                fillMethod: action.fillMethod,
                                actionInitWait: action.actionInitWait,
                                disabled: action.disabled,
                                isCSSSelector: action.isCSSSelector,
                                actionMode: action.actionMode
                            }))
                        };

                        acfhStorage.remove([`UserScript_${config.id}`], () => {
                            console.log(`Invalid script for config ${config.id} removed due to valid script save.`);
                        });

                        acfhStorage.set({
                            configurations,
                            [`customScript_${config.id}`]: updatedScript,
                            [`scriptLastEdited_${config.id}`]: new Date().toISOString()
                        }, () => {
                            if (activeConfigId === config.id) {
                                aplicarDadosConfiguracao(configurations[configIndex]);
                                updateActionNumbers();
                                configNameInput.value = configurations[configIndex].name;
                                configUrlInput.value = configurations[configIndex].url;
                                initWaitInput.value = configurations[configIndex].initWait;
                                scriptEditorIconBtn.classList.add('script-saved');
                            }

                            const hasActions = Array.isArray(extractedConfig.actions) && extractedConfig.actions.length > 0;

                            // Se houver ações, NÃO registrar o UserScript automático;
                            // em vez disso, garantir que qualquer script previamente
                            // registrado para esta configuração seja desregistrado.
                            if (hasActions) {
                                chrome.runtime.sendMessage({
                                    action: "unregisterUserScript",
                                    configId: config.id
                                });
                                showTemporaryMessage('Script saved and linked to actions. UserScript auto-injection disabled for this config.', 'success');
                            } else {
                                chrome.runtime.sendMessage({
                                    action: "registerUserScript",
                                    configId: config.id,
                                    configName: config.name,
                                    url: validUrl,
                                    scriptContent: updatedScript
                                }, (response) => {
                                    if (response && response.success) {
                                        showTemporaryMessage('Script saved and registered for injection.', 'success');
                                    } else {
                                        showTemporaryMessage('Error registering script.', 'error');
                                    }
                                });
                            }
                            modal.remove();
                        });
                    } else {
                        showTemporaryMessage('Configuration not found.', 'error');
                        modal.remove();
                    }
                } else {
                    saveUserScript(updatedScript, config.id);
                    modal.remove();
                }
            });

            modal.style.display = 'block';
            editor.refresh();
        });
    });
}



function generateDynamicUserScript(config, useCachedScript = false) {
    return new Promise((resolve) => {
        generateScriptContent(config, resolve);
    });
}

    function showScriptEditorModal(config, initialScriptContent = null) {
    const existingModal = document.querySelector('.script-editor-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const UserScriptKey = `UserScript_${config.id}`;
    acfhStorage.get([UserScriptKey], (data) => {
        let scriptContentPromise;

        const hasActions = Array.isArray(config.actions) && config.actions.length > 0;

        // Regra: se houver ações configuradas, o editor sempre parte
        // do script gerado pelas ações. O script personalizado salvo
        // (UserScriptKey) só é carregado quando NÃO há nenhuma ação.
        if (data[UserScriptKey] && !hasActions) {
            scriptContentPromise = Promise.resolve(data[UserScriptKey].scriptContent);
            showTemporaryMessage(`Loaded invalid script: ${UserScriptKey}`, 'warning');
        } else {
            scriptContentPromise = initialScriptContent
                ? Promise.resolve(initialScriptContent)
                : generateDynamicUserScript(config, false);
        }

        scriptContentPromise.then(scriptContent => {
            // Remover o cabeçalho do UserScript antes de exibir no editor
            const cleanScriptContent = removeUserScriptHeader(scriptContent);
            
            const modal = document.createElement('div');
            modal.className = 'modal script-editor-modal';
            modal.innerHTML = `
                <div class="modal-content script-editor-content">
                    <div class="modal-header">
                        <h3>UserScript Editor</h3>
                        <div class="modal-actions">
                            <button class="btn-toggle-fullscreen" title="Toggle Fullscreen">⛶</button>
                            <span class="close-btn">&times;</span>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div class="script-info">
                            <p><strong>Namespace:</strong> ${config.name}</p>
                            <p><strong>URL Match:</strong> ${validateAndFormatUrl(config.url)}</p>
                        </div>
                        <div id="scriptEditor" class="script-editor"></div>
                        <div class="invalid-scripts-section">
                            <label for="UserScriptsSelect">Load Script:</label>
                            <select id="UserScriptsSelect">
                                <option value="">Select an script</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary btn-save-script">Save</button>
                        <button class="btn btn-secondary btn-load-saved-script">Load Saved Script</button>
                        <button class="btn btn-danger btn-cancel-script">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const editorElement = modal.querySelector('#scriptEditor');
            const createFallbackEditor = (container, value) => {
                const textarea = document.createElement('textarea');
                textarea.className = 'script-editor-fallback';
                textarea.value = value || '';
                textarea.spellcheck = false;
                textarea.style.width = '100%';
                textarea.style.minHeight = '240px';
                container.appendChild(textarea);

                return {
                    getValue: () => textarea.value,
                    setValue: (nextValue) => {
                        textarea.value = nextValue;
                    },
                    refresh: () => {},
                    setSize: (width, height) => {
                        if (width) {
                            textarea.style.width = typeof width === 'number' ? `${width}px` : width;
                        }
                        if (height) {
                            textarea.style.height = typeof height === 'number' ? `${height}px` : height;
                        }
                    },
                    getWrapperElement: () => textarea
                };
            };

            const editor = (typeof CodeMirror === 'function')
                ? CodeMirror(editorElement, {
                    value: cleanScriptContent, // Usar o script sem cabeçalho
                    mode: 'javascript',
                    theme: 'monokai',
                    lineNumbers: true,
                    lineWrapping: true,
                    indentUnit: 4,
                    matchBrackets: true,
                    autoCloseBrackets: true
                })
                : createFallbackEditor(editorElement, cleanScriptContent);

            // **SALVAR COM CTRL+S**
            const editorKeyTarget = typeof editor.getWrapperElement === 'function'
                ? editor.getWrapperElement()
                : editorElement;

            editorKeyTarget.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    saveBtn.click();
                }
            });

            const resizeEditor = () => {
                const body = modal.querySelector('.modal-body');
                const header = modal.querySelector('.modal-header');
                const footer = modal.querySelector('.modal-footer');
                const scriptInfo = modal.querySelector('.script-info');
                const invalidScripts = modal.querySelector('.invalid-scripts-section');
                
                const availableHeight = body.clientHeight - 
                                  header.offsetHeight - 
                                  footer.offsetHeight - 
                                  scriptInfo.offsetHeight - 
                                  invalidScripts.offsetHeight - 40; // margens
                
                editor.setSize("100%", `${Math.max(availableHeight, 200)}px`);
                editor.refresh();
            };

            // Chame o resize quando o modal abrir e na mudança de tamanho da janela
            setTimeout(() => {
                resizeEditor();
                editor.refresh();
            }, 100);

            window.addEventListener("resize", resizeEditor);

            // Fullscreen toggle otimizado
            const toggleFullscreenBtn = modal.querySelector('.btn-toggle-fullscreen');
            toggleFullscreenBtn.addEventListener('click', () => {
                modal.classList.toggle('fullscreen');
                setTimeout(() => {
                    resizeEditor();
                    editor.refresh();
                }, 100);
            });

            // Dropdown scripts inválidos/salvos
            const UserScriptsSelect = modal.querySelector('#UserScriptsSelect');
            let defaultScriptKey = null;

            acfhStorage.get(null, (data) => {
                const relevantKeys = Object.keys(data).filter(key =>
                    (key.startsWith('UserScript_') || key.startsWith('customScript_')) &&
                    key.includes(`_${config.id}`)
                );

                if (relevantKeys.length > 0) {
                    const customScriptKey = relevantKeys.find(key => key.startsWith('customScript_'));
                    defaultScriptKey = customScriptKey || relevantKeys[0];

                    relevantKeys.forEach(key => {
                        const option = document.createElement('option');
                        option.value = key;
                        const isInvalid = key.startsWith('UserScript_');
                        option.textContent = `${key} (${data[key].timestamp}${isInvalid ? ': Injected' : ': Saved'})`;
                        UserScriptsSelect.appendChild(option);
                    });

                    if (defaultScriptKey) {
                        UserScriptsSelect.value = defaultScriptKey;
                    }
                }
            });

            UserScriptsSelect.addEventListener('change', () => {
                const selectedKey = UserScriptsSelect.value;
                if (selectedKey) {
                    acfhStorage.get([selectedKey], (data) => {
                        if (data[selectedKey]) {
                            // Remover cabeçalho também ao carregar scripts salvos
                            const loadedContent = data[selectedKey].scriptContent || data[selectedKey];
                            const cleanLoadedContent = removeUserScriptHeader(loadedContent);
                            editor.setValue(cleanLoadedContent);
                            showTemporaryMessage(`Loaded: ${selectedKey}`, 'warning');
                        }
                    });
                }
            });

            // Botões
            const closeBtn = modal.querySelector('.close-btn');
            const saveBtn = modal.querySelector('.btn-save-script');
            const loadSavedScriptBtn = modal.querySelector('.btn-load-saved-script');
            const cancelBtn = modal.querySelector('.btn-cancel-script');

            closeBtn.addEventListener('click', () => modal.remove());
            cancelBtn.addEventListener('click', () => modal.remove());

            if (loadSavedScriptBtn) {
                loadSavedScriptBtn.addEventListener('click', () => {
                    acfhStorage.get([`customScript_${config.id}`], (data) => {
                        const savedScript = data[`customScript_${config.id}`];
                        if (savedScript) {
                            // Remover cabeçalho ao carregar script salvo
                            const cleanSavedScript = removeUserScriptHeader(savedScript);
                            editor.setValue(cleanSavedScript);
                            showTemporaryMessage('Loaded saved script!');
                        } else {
                            generateDynamicUserScript(config, false).then(newScript => {
                                // Remover cabeçalho ao gerar novo script
                                const cleanNewScript = removeUserScriptHeader(newScript);
                                editor.setValue(cleanNewScript);
                                showTemporaryMessage('No saved script. Loaded template.', 'warning');
                            });
                        }
                    });
                });
            }

            saveBtn.addEventListener('click', () => {
                // Ao salvar, adicionar o cabeçalho de volta ao script
                const editorContent = editor.getValue();
                const fullScript = addUserScriptHeader(editorContent, config);
                
                const validUrl = validateAndFormatUrl(config.url);

                if (!fullScript.includes('==UserScript==') ||
                    !fullScript.includes(config.name) ||
                    !fullScript.includes(validUrl)) {
                    showTemporaryMessage('Script must include UserScript header with correct name and URL match.', 'error');
                    saveUserScript(fullScript, config.id);
                    return;
                }

                const extractedConfig = extractConfigFromScript(fullScript);
                if (extractedConfig) {
                    if (!extractedConfig.name || !extractedConfig.url) {
                        showTemporaryMessage('Invalid configuration: name and URL are required.', 'error');
                        saveUserScript(fullScript, config.id);
                        return;
                    }

                    const configIndex = configurations.findIndex(cfg => cfg.id === config.id);
                    if (configIndex !== -1) {
                        configurations[configIndex] = {
                            id: config.id,
                            name: extractedConfig.name,
                            url: extractedConfig.url,
                            initWait: extractedConfig.initWait,
                            actions: extractedConfig.actions.map(action => ({
                                name: action.name,
                                elementFinder: action.elementFinder,
                                mode: action.mode,
                                intervalMs: action.intervalMs,
                                repeat: action.repeat,
                                fillValue: action.fillValue,
                                fillMethod: action.fillMethod,
                                actionInitWait: action.actionInitWait,
                                disabled: action.disabled,
                                isCSSSelector: action.isCSSSelector,
                                actionMode: action.actionMode
                            }))
                        };

                        acfhStorage.remove([`UserScript_${config.id}`], () => {
                            console.log(`Invalid script for config ${config.id} removed due to valid script save.`);
                        });

                        acfhStorage.set({
                            configurations,
                            [`customScript_${config.id}`]: fullScript,
                            [`scriptLastEdited_${config.id}`]: new Date().toISOString()
                        }, () => {
                            if (activeConfigId === config.id) {
                                aplicarDadosConfiguracao(configurations[configIndex]);
                                updateActionNumbers();
                                configNameInput.value = configurations[configIndex].name;
                                configUrlInput.value = configurations[configIndex].url;
                                initWaitInput.value = configurations[configIndex].initWait;
                                scriptEditorIconBtn.classList.add('script-saved');
                            }

                            const hasActions = Array.isArray(extractedConfig.actions) && extractedConfig.actions.length > 0;

                            // Mensagens curtas e localizadas para a toast
                            const msgLinkedToActions = currentUiLanguage === 'en'
                                ? 'Script saved for this config.'
                                : 'Script salvo para esta configuração.';
                            const msgRegistered = currentUiLanguage === 'en'
                                ? 'Script saved for auto-injection.'
                                : 'Script salvo para auto-injeção.';
                            const msgRegisterError = currentUiLanguage === 'en'
                                ? 'Error registering script.'
                                : 'Erro ao registrar o script.';

                            // Se houver ações, desregistrar qualquer UserScript automático
                            // para esta configuração. O comportamento passa a ser guiado
                            // apenas pelas ações de clique/preenchimento.
                            if (hasActions) {
                                chrome.runtime.sendMessage({
                                    action: "unregisterUserScript",
                                    configId: config.id
                                });
                                showTemporaryMessage(msgLinkedToActions, 'success', 2000);
                            } else {
                                chrome.runtime.sendMessage({
                                    action: "registerUserScript",
                                    configId: config.id,
                                    configName: config.name,
                                    url: validUrl,
                                    scriptContent: fullScript
                                }, (response) => {
                                    if (response && response.success) {
                                        showTemporaryMessage(msgRegistered, 'success', 2000);
                                    } else {
                                        showTemporaryMessage(msgRegisterError, 'error', 2500);
                                    }
                                });
                            }
                            modal.remove();
                        });
                    } else {
                        showTemporaryMessage('Configuration not found.', 'error');
                        modal.remove();
                    }
                } else {
                    saveUserScript(fullScript, config.id);
                    modal.remove();
                }
            });

            modal.style.display = 'block';
            editor.refresh();
        });
    });
}

// Função para remover o cabeçalho do UserScript
function removeUserScriptHeader(scriptContent) {
    // Encontrar onde começa a IIFE (Immediately Invoked Function Expression)
    const iifeStart = scriptContent.indexOf('(function() {');
    
    if (iifeStart !== -1) {
        // Retornar apenas a parte a partir da IIFE
        return scriptContent.substring(iifeStart).trim();
    }
    
    // Se não encontrar a IIFE, retornar o conteúdo original
    return scriptContent;
}

// Detecta se o script é apenas o template básico gerado para uma
// configuração sem ações (somente IIFE com console.log e comentários
// padrão, sem código extra do usuário).
function isBaseTemplateScript(scriptContent) {
    if (!scriptContent || typeof scriptContent !== 'string') return false;

    const body = removeUserScriptHeader(scriptContent).trim();
    if (!body.startsWith('(function()')) return false;

    let normalized = body;

    // Remove abertura da IIFE
    normalized = normalized.replace(/^\(function\(\)\s*\{\s*/, '');

    // Remove 'use strict';
    normalized = normalized.replace(/'use strict';\s*/, '');

    // Remove linha de log, independente do nome da configuração
    normalized = normalized.replace(/console\.log\('Auto Clicker script loaded for:[^']*'\);\s*/, '');

    // Remove comentários padrão de template
    normalized = normalized.replace(/\/\/ No actions defined - add your custom automation code below[\s\S]*?\/\/ Example: document\.querySelector\('button'\)\.click\(\);\s*/, '');

    // Remove fechamento da IIFE
    normalized = normalized.replace(/\}\)\(\);?\s*$/, '');

    return normalized.trim().length === 0;
}

// Função para adicionar o cabeçalho do UserScript ao salvar
function addUserScriptHeader(scriptContent, config) {
    const validUrl = validateAndFormatUrl(config.url || '*://*/*');
    
    return `// ==UserScript==
// @name         Auto Clicker - Form Helper
// @namespace    ${config.name || 'Independent Script'}
// @version      1.0.3
// @description  ${config.actions && config.actions.length > 0 ? `Automated actions for ${config.url || '*://*/*'}` : 'Modelo vazio pronto para editar'}
// @author       Auto Clicker Extension
// @match        ${validUrl}
// @grant        none
// @run-at       document-idle
// ==/UserScript==

${scriptContent}`;
}

// As funções generateScriptContent e coletarDadosConfiguracao permanecem como estão
// Mas vamos ajustar generateScriptContent para não duplicar o cabeçalho

function generateDynamicUserScript(config, useCachedScript = false) {
    return new Promise((resolve) => {
        generateScriptContent(config, resolve);
    });
}

function generateScriptContent(config, resolve) {
    const validUrl = validateAndFormatUrl(config.url || '*://*/*');
    
    // Gerar apenas o código da IIFE, sem o cabeçalho
    let scriptContent = `(function() {
    'use strict';
    
    console.log('Auto Clicker script loaded for: ${config.name || 'Independent Script'}');
    
`;

    if (config.actions && config.actions.length > 0) {
        scriptContent += `    // Configuration from Auto Clicker
    const config = ${JSON.stringify({
        name: config.name || 'Unnamed Configuration',
        url: config.url || '*://*/*',
        initWait: parseFloat(config.initWait || 0) * 1000,
        actions: config.actions.map((action, index) => ({
            name: action.name || `Action ${index + 1}`,
            selector: action.elementFinder || '',
            isCSS: action.isCSSSelector || false,
            mode: action.mode || 'click',
            value: action.fillValue || '',
            fillMethod: action.fillMethod || 'paste',
            interval: action.actionMode === 'mutationObserve' ? null : (action.intervalMs || 1000),
            repeat: action.actionMode === 'mutationObserve' ? null : (action.repeat === -2 ? null : action.repeat || 1),
            waitBefore: parseFloat(action.actionInitWait || 0) * 1000,
            disabled: action.disabled || false,
            actionMode: action.actionMode || 'default'
        }))
    }, null, 4)};
    
    // Wait for initial delay
    setTimeout(executeActions, config.initWait);
    
    function executeActions() {
        config.actions.forEach((action, index) => {
            if (!action.disabled) {
                setTimeout(() => performAction(action), index * 100);
            }
        });
    }
    
    function performAction(action) {
        if (action.actionMode === 'mutationObserve') {
            const observer = new MutationObserver((mutations, obs) => {
                const element = action.isCSS ? 
                    document.querySelector(action.selector) :
                    document.evaluate(action.selector, document, null, 
                        XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (element) {
                    executeAction(element, action);
                    console.log('Mutation observed, action executed:', action.selector);
                }
            });
            observer.observe(document, { childList: true, subtree: true });
        } else {
            setTimeout(() => {
                const element = action.isCSS ? 
                    document.querySelector(action.selector) :
                    document.evaluate(action.selector, document, null, 
                        XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (element) {
                    executeAction(element, action);
                } else {
                    console.warn('Element not found:', action.selector);
                }
            }, action.waitBefore);
        }
    }
    
    function executeAction(element, action) {
        if (action.mode === 'click') {
            element.click();
            console.log('Clicked:', action.selector);
        } else if (action.mode === 'fill') {
            if (action.fillMethod === 'type') {
                element.value = '';
                const chars = action.value.split('');
                let i = 0;
                const typeChar = () => {
                    if (i < chars.length) {
                        element.value += chars[i];
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        i++;
                        setTimeout(typeChar, 50);
                    } else {
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log('Filled (type):', action.selector, 'with:', action.value);
                    }
                };
                typeChar();
            } else {
                element.value = action.value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('Filled (paste):', action.selector, 'with:', action.value);
            }
        }
    }
`;
    } else {
        scriptContent += `    // No actions defined - add your custom automation code below
    // Example: document.querySelector('button').click();
`;
    }

    scriptContent += `})();`;
    resolve(scriptContent);
}

function coletarDadosConfiguracao() {
    if (!activeConfigId) return null;
    const configToSave = configurations.find(cfg => cfg.id == activeConfigId);
    if (!configToSave) return null;

    const actionType = document.querySelector('input[name="fillMethod"]:checked')?.value || 'paste';
    return {
        iframe: configUrlInput.value,
        waitInit: initWaitInput.value,
        actionType: actionType === 'paste' ? 'copyOption' : 'typeOption',
        xpaths: Array.from(xpathActionsContainer.querySelectorAll('.xpath-action-row:not(.disabled)')).map(row => {
            let reps = parseInt(row.querySelector('.col-repeat input').value);
            if (reps !== -2 && (isNaN(reps) || reps < 1 || reps > 9999999)) reps = 1;
            return {
                value: row.querySelector('.col-element-finder input').value,
                checked: true,
                interval: row.getAttribute('data-action-mode') === 'mutationObserve' ? null : row.querySelector('.col-interval-ms input').value,
                repetitions: row.getAttribute('data-action-mode') === 'mutationObserve' ? null : reps,
                fillValue: row.getAttribute('data-fill-value') || '',
                waitInitModal: row.getAttribute('data-action-init-wait') || '0',
                isCSSSelector: row.getAttribute('data-is-css-selector') === 'true',
                actionMode: row.getAttribute('data-action-mode') || 'default'
            };
        })
    };
}
    const searchConfigInput = document.getElementById('searchConfig');
    const configSuggestions = document.getElementById('configSuggestions');

    function updateConfigSuggestions() {
        if (!configSuggestions) return;
        configSuggestions.innerHTML = '';
        configurations.forEach(config => {
            const option = document.createElement('option');
            option.value = config.name || 'No Name';
            option.dataset.configId = config.id;
            configSuggestions.appendChild(option);
        });
    }

    function handleSearchSelection() {
        if (!searchConfigInput) return;
        searchConfigInput.addEventListener('input', () => {
            const selectedName = searchConfigInput.value;
            const matchingConfig = configurations.find(cfg => cfg.name === selectedName);
            if (matchingConfig) {
                const configItem = configList.querySelector(`.config-list-item[data-config-id="${matchingConfig.id}"]`);
                if (configItem) {
                    setActiveConfig(configItem);
                    searchConfigInput.value = '';
                }
            }
        });

        // Permite buscar por parte do nome ou URL e confirmar com Enter
        searchConfigInput.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();

            const term = searchConfigInput.value.trim().toLowerCase();
            if (!term) return;

            let matchingConfig = configurations.find(cfg =>
                (cfg.name || '').toLowerCase() === term ||
                (cfg.url || '').toLowerCase() === term
            );

            if (!matchingConfig) {
                matchingConfig = configurations.find(cfg =>
                    (cfg.name || '').toLowerCase().includes(term) ||
                    (cfg.url || '').toLowerCase().includes(term)
                );
            }

            if (matchingConfig) {
                const configItem = configList.querySelector(`.config-list-item[data-config-id="${matchingConfig.id}"]`);
                if (configItem) {
                    setActiveConfig(configItem);
                    searchConfigInput.value = '';
                }
            }
        });
    }

function aplicarDadosConfiguracao(config) {
    if (!config || !activeConfigId) return;

    configNameInput.value = config.name || "";
    configUrlInput.value = config.url || "";
    initWaitInput.value = config.initWait || "0";

    xpathActionsContainer.innerHTML = "";
    (config.actions || []).forEach(action => {
        adicionarXPathInput(
            action.elementFinder || "",
            true,
            parseFloat(action.intervalMs) || 1000,
            action.repeat ?? 1,
            action.fillValue || "",
            action.actionInitWait || 0,
            action.mode || "click",
            action.fillMethod || "paste",
            action.isCSSSelector || false,
            action.actionMode || "default",
            action.name || "" // PASSAR O NOME ESPECÍFICO
        );
        const lastActionRow = xpathActionsContainer.querySelector('.xpath-action-row:last-child');
        if (lastActionRow && action.disabled) {
            lastActionRow.classList.add('disabled');
            lastActionRow.querySelectorAll('.input-inline, .action-mode-select').forEach(input => {
                input.disabled = true;
            });
        }
        
        // APÓS CRIAR A LINHA, TENTAR CARREGAR DO LOCALSTORAGE
        setTimeout(() => {
            loadActionNameFromLocalStorage(lastActionRow);
        }, 50);
    });
}

    function saveCurrentConfiguration(showMessage = true) {
        if (!activeConfigId) return;

        const configData = coletarDadosConfiguracao();
        if (!configData) return;

        const configIndex = configurations.findIndex(cfg => cfg.id == activeConfigId);
        if (configIndex !== -1) {
            configurations[configIndex] = configData;
        } else {
            configurations.push(configData);
        }

        acfhStorage.set({ configurations, activeConfigId }, () => {
            console.log(`Configuration saved: ${JSON.stringify(configData)}`);
            if (showMessage) {
                showTemporaryMessage(translations.configSaved);
            }
            hasUnsavedChanges = false;

            updateConfigListAndDropdown();
        });
    }

    function updateConfigListAndDropdown() {
        configList.innerHTML = '';
        configSelect.innerHTML = '<option value="" disabled selected>Select a Configuration</option>';

        configurations.forEach(config => {
            const newConfigItem = configListItemTemplate.content.cloneNode(true);
            const configItemDiv = newConfigItem.querySelector('.config-list-item');
            configItemDiv.querySelector('.item-name').textContent = config.name || 'No Name';
            configItemDiv.querySelector('.item-url').textContent = config.url || 'No URL';
            configItemDiv.dataset.configId = config.id;
            configItemDiv.dataset.initWait = config.initWait;
            if (config.id === activeConfigId) {
                configItemDiv.classList.add('active');
            }
            configList.appendChild(configItemDiv);
            addEventListenersToConfigItem(configItemDiv);

            const option = document.createElement('option');
            option.value = config.id;
            option.textContent = `(${config.name || 'No Name'}) ${config.url || 'No URL'}`;
            if (config.id === activeConfigId) {
                option.selected = true;
            }
            configSelect.appendChild(option);
        });

        updateConfigSuggestions();
    }

function loadConfigurationsFromStorage() {
    console.log("Iniciando carregamento de configurações do acfhStorage...");
    
    // Primeiro, limpar localStorage de dados órfãos
    cleanupOrphanedLocalStorageData();
    
    acfhStorage.get(['configurations', 'activeConfigId', 'autoClickerEnabled', 'xpathLoaded'], (data) => {
        if (!data.configurations || !Array.isArray(data.configurations)) {
            configurations = [];
            console.log("Nenhuma configuração válida encontrada. Inicializando com array vazio.");
        } else {
            configurations = data.configurations;
            console.log("Configurações carregadas:", configurations);
        }

        // Verificar e remover dados inconsistentes
        const validConfigurations = configurations.filter(config => {
            return config && config.id && config.name;
        });
        
        if (validConfigurations.length !== configurations.length) {
            console.log(`Removendo ${configurations.length - validConfigurations.length} configurações inválidas`);
            configurations = validConfigurations;
            
            // Atualizar storage com apenas configurações válidas
            acfhStorage.set({ configurations }, () => {
                console.log("Storage atualizado com configurações válidas");
            });
        }

        updateConfigListAndDropdown();

        try {
            if (data.activeConfigId) {
                console.log(`Tentando ativar configuração com ID: ${data.activeConfigId}`);
                const config = configurations.find(cfg => cfg.id == data.activeConfigId);
                if (config) {
                    const configItem = configList.querySelector(`.config-list-item[data-config-id="${data.activeConfigId}"]`);
                    if (configItem) {
                        setActiveConfig(configItem);
                    } else {
                        console.log("Item de configuração não encontrado no DOM, criando novo elemento DOM.");
                        const newConfigItem = configListItemTemplate.content.cloneNode(true);
                        const configItemDiv = newConfigItem.querySelector('.config-list-item');
                        configItemDiv.querySelector('.item-name').textContent = config.name || 'Sem Nome';
                        configItemDiv.querySelector('.item-url').textContent = config.url || 'Sem URL';
                        configItemDiv.dataset.configId = config.id;
                        configItemDiv.dataset.initWait = config.initWait || '0';
                        configList.appendChild(configItemDiv);
                        addEventListenersToConfigItem(configItemDiv);
                        setActiveConfig(configItemDiv);
                    }

                    if (data.xpathLoaded) {
                        console.log(`XPath carregado do storage: ${data.xpathLoaded}`);
                        acfhStorage.remove(['xpathLoaded'], () => {
                            console.log("xpathLoaded removido do storage após uso.");
                        });
                    }

                    if (data.autoClickerEnabled) {
                        const activeActions = config.actions.filter(action => !action.disabled);
                        const configToPropagate = {
                            iframe: config.url,
                            waitInit: config.initWait,
                            actionType: config.actions.some(action => action.fillMethod === 'type') ? 'typeOption' : 'copyOption',
                            xpaths: activeActions.map(action => ({
                                value: action.elementFinder,
                                checked: true,
                                interval: action.intervalMs,
                                repetitions: action.repeat,
                                fillValue: action.fillValue,
                                waitInitModal: action.actionInitWait,
                                isCSSSelector: action.isCSSSelector || false,
                                actionMode: action.actionMode || 'default'
                            }))
                        };
                        chrome.runtime.sendMessage({
                            action: "configUpdated",
                            activeConfigId: data.activeConfigId,
                            config: configToPropagate
                        }, () => {
                            console.log("Configuração ativa propagada ao carregar options.js.");
                        });
                    }
                } else {
                    console.warn(`Configuração com ID ${data.activeConfigId} não encontrada. Ativando primeira configuração.`);
                    
                    // Remover activeConfigId inválido
                    acfhStorage.set({ activeConfigId: null }, () => {
                        if (configurations.length > 0) {
                            setActiveConfig(configList.firstElementChild);
                        } else {
                            setActiveConfig(null);
                        }
                    });
                }
            } else if (configurations.length > 0) {
                console.log("Nenhum activeConfigId definido. Ativando primeira configuração.");
                setActiveConfig(configList.firstElementChild);
            } else {
                console.log("Nenhuma configuração encontrada. Definindo estado inicial vazio.");
                setActiveConfig(null);
                configNameInput.value = '';
                configUrlInput.value = '';
                initWaitInput.value = '0';
                xpathActionsContainer.innerHTML = '';
            }
        } catch (error) {
            console.error("Erro ao carregar configurações:", error);
            setActiveConfig(null);
            configNameInput.value = '';
            configUrlInput.value = '';
            initWaitInput.value = '0';
            xpathActionsContainer.innerHTML = '';
        }
    });
}

    function updateExtensionStatus() {
        const statusElement = document.getElementById('extensionStatus');
        if (!statusElement) {
            console.error("extensionStatus element not found.");
            return;
        }

        acfhStorage.get(['autoClickerEnabled'], (data) => {
            const isEnabled = !!data.autoClickerEnabled;
            const enabledText = translations.statusEnabledLabel || (currentUiLanguage === 'en' ? 'Enabled' : 'Ativada');
            const disabledText = translations.statusDisabledLabel || (currentUiLanguage === 'en' ? 'Disabled' : 'Desativada');

            statusElement.textContent = isEnabled ? enabledText : disabledText;
            statusElement.classList.toggle('status-enabled', isEnabled);
            statusElement.classList.toggle('status-disabled', !isEnabled);
        });
    }

        updateExtensionStatus();

        // Em ambiente web (options hospedada em 127.0.0.1 / Vercel), o evento
        // chrome.storage.onChanged não dispara diretamente aqui. Fazemos um
        // pequeno polling para manter o badge de status sempre alinhado com
        // o estado real do toggle da extensão (popup).
        try {
                setInterval(updateExtensionStatus, 3000);
        } catch (e) {
                console.warn('Falha ao iniciar polling de status da extensão:', e);
        }

    // Listener global para mudanças nas configs (adicione após as definições de funções)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if ('configMode' in changes || 'contentScriptApi' in changes || 'sandboxMode' in changes) {
            updateScriptEditorButtonVisibility();
        }
        if ('autoClickerEnabled' in changes) {
            updateExtensionStatus();
        }
    }
});

    document.getElementById('actionConfigModal').classList.add('active');

    function openActionConfigModal(actionRowElement) {
        currentEditingActionRow = actionRowElement;
        if (actionConfigModal) {
            const modeSelect = actionRowElement.querySelector('.action-mode-select');
            const valueInput = document.getElementById('modalValueInput');
            const fillMethodRadios = document.querySelectorAll('input[name="fillMethod"]');
            const modalActionInitialWaitInput = document.getElementById('modalActionInitialWait');
            const defaultModeRadio = document.getElementById('defaultMode');
            const mutationObserveModeRadio = document.getElementById('mutationObserveMode');
            const intervalCol = actionRowElement.querySelector('.col-interval-ms');
            const repeatCol = actionRowElement.querySelector('.col-repeat');

            valueInput.value = actionRowElement.getAttribute('data-fill-value') || '';

            if (modeSelect.value === 'fill') {
                valueInput.closest('.input-group-modal').style.display = 'block';
                valueInput.closest('.input-group-modal').querySelector('label').textContent = translations.fillInputPlaceholder;
                fillMethodRadios.forEach(radio => radio.closest('.radio-group').style.display = 'flex');
            } else {
                valueInput.closest('.input-group-modal').style.display = 'none';
                valueInput.value = '';
                fillMethodRadios.forEach(radio => radio.closest('.radio-group').style.display = 'none');
            }

            const actionInitWait = actionRowElement.getAttribute('data-action-init-wait') || '0';
            modalActionInitialWaitInput.value = actionInitWait;

            const fillMethod = actionRowElement.getAttribute('data-fill-method') || 'paste';
            document.getElementById(fillMethod + 'Option').checked = true;

            const actionMode = actionRowElement.getAttribute('data-action-mode') || 'default';
            defaultModeRadio.checked = actionMode === 'default';
            mutationObserveModeRadio.checked = actionMode === 'mutationObserve';

            toggleMutationObserveOption();

            const updateInputsState = () => {
                const isMutationObserve = mutationObserveModeRadio.checked && !mutationObserveModeRadio.disabled;
                if (intervalCol) intervalCol.style.display = isMutationObserve ? 'none' : '';
                if (repeatCol) repeatCol.style.display = isMutationObserve ? 'none' : '';
                updateIntervalRepeatHeadersVisibility();
            };
            updateInputsState();

            defaultModeRadio.addEventListener('change', updateInputsState);
            mutationObserveModeRadio.addEventListener('change', updateInputsState);

            actionConfigModal.style.display = 'block';
            console.log("Configuration modal opened for editing.");
        }
    }

    function closeActionConfigModal() {
        if (actionConfigModal) {
            actionConfigModal.style.display = 'none';
            currentEditingActionRow = null;
            console.log("Configuration modal closed.");
        }
    }

   function addNewActionRow() {
    const actionRows = xpathActionsContainer.querySelectorAll('.xpath-action-row');
    adicionarXPathInput(
        "", // valor vazio
        true, // isChecked
        1000, // intervalo
        1, // repeticoes
        "", // fillValue
        0, // waitInitModal
        "click", // mode
        "paste", // fillMethod
        false, // isCSSSelector
        "default", // actionMode
        `Action ${actionRows.length + 1}` // NOME PADRÃO SEMPRE
    );
}
    function updateActionNumbers() {
        const actionRows = xpathActionsContainer.querySelectorAll('.xpath-action-row');
        actionRows.forEach((row, index) => {
            row.querySelector('.col-num').textContent = index + 1;
        });
    }

    // Atualiza a visibilidade dos cabeçalhos "Intervalo (ms)" e "Repet." de acordo
    // com as colunas realmente visíveis nas linhas de ação. Se todas as ações
    // estiverem em modo MutationObserve (ou seja, sem coluna de intervalo
    // visível), escondemos também os cabeçalhos para evitar informação confusa.
    function updateIntervalRepeatHeadersVisibility() {
        const headerInterval = document.querySelector('.header-item.header-interval-ms');
        const headerRepeat = document.querySelector('.header-item.header-repeat');

        if (!headerInterval || !headerRepeat || !xpathActionsContainer) {
            return;
        }

        const headersContainer = headerInterval.closest('.action-list-headers');
        const actionsTable = xpathActionsContainer;
        const actionRows = xpathActionsContainer.querySelectorAll('.xpath-action-row');

        // Se não houver ações, mantemos os cabeçalhos visíveis por padrão
        // e removemos qualquer classe especial de layout.
        if (actionRows.length === 0) {
            headerInterval.style.display = '';
            headerRepeat.style.display = '';
            if (headersContainer) headersContainer.classList.remove('no-interval');
            if (actionsTable) actionsTable.classList.remove('no-interval');
            return;
        }

        let hasVisibleInterval = false;

        actionRows.forEach(row => {
            const intervalCol = row.querySelector('.col-interval-ms');
            if (intervalCol && intervalCol.style.display !== 'none') {
                hasVisibleInterval = true;
            }
        });

        if (hasVisibleInterval) {
            headerInterval.style.display = '';
            headerRepeat.style.display = '';
            if (headersContainer) headersContainer.classList.remove('no-interval');
            if (actionsTable) actionsTable.classList.remove('no-interval');
        } else {
            headerInterval.style.display = 'none';
            headerRepeat.style.display = 'none';
            if (headersContainer) headersContainer.classList.add('no-interval');
            if (actionsTable) actionsTable.classList.add('no-interval');
        }
    }

    function addEventListenersToActionRow(actionRow) {
        const editButton = actionRow.querySelector('.edit-btn');
        const deleteButton = actionRow.querySelector('.delete-btn');
        const modeSelect = actionRow.querySelector('.action-mode-select');
        const modeDisplay = actionRow.querySelector('.mode-display');
        const inputs = actionRow.querySelectorAll('.input-inline');



         const nameInput = actionRow.querySelector('.col-name input');
    if (nameInput) {
        nameInput.addEventListener('input', () => {
            hasUnsavedChanges = true;
            saveActionNameToLocalStorage(actionRow);
        });
        nameInput.addEventListener('blur', () => {
            saveActionNameToLocalStorage(actionRow);
        });
    }


        if (editButton) {
            editButton.addEventListener('click', function(event) {
                event.stopPropagation();
                const existingMenu = document.querySelector('.edit-action-menu');
                if (existingMenu) {
                    existingMenu.remove();
                }

                const menuTemplate = document.getElementById('edit-action-menu-template');
                if (!menuTemplate) {
                    console.error('edit-action-menu-template template not found');
                    return;
                }

                const menu = menuTemplate.content.cloneNode(true).querySelector('.edit-action-menu');
                actionRow.appendChild(menu);
                const menuElement = actionRow.querySelector('.edit-action-menu');

                const disableOption = menuElement.querySelector('.disable-action-option');
                if (disableOption) {
                    disableOption.querySelector('.action-text').textContent = actionRow.classList.contains('disabled')
                        ? translations.enableAction
                        : translations.disableAction;
                    disableOption.classList.toggle('enable', actionRow.classList.contains('disabled'));
                }

                menuElement.classList.add('active');

                const editOption = menuElement.querySelector('.edit-action-option');
                const duplicateOption = menuElement.querySelector('.duplicate-action-option');
                if (editOption) {
                    editOption.addEventListener('click', () => {
                        openActionConfigModal(actionRow);
                        menuElement.remove();
                    });
                }

                if (duplicateOption) {
                    duplicateOption.addEventListener('click', () => {
                        const name = actionRow.querySelector('.col-name input').value;
                        const elementFinder = actionRow.querySelector('.col-element-finder input').value;
                        const mode = actionRow.querySelector('.action-mode-select').value;
                        const intervalMs = actionRow.querySelector('.col-interval-ms input').value;
                        const repeat = actionRow.querySelector('.col-repeat input').value;
                        const fillValue = actionRow.getAttribute('data-fill-value') || '';
                        const fillMethod = actionRow.getAttribute('data-fill-method') || 'paste';
                        const actionInitWait = actionRow.getAttribute('data-action-init-wait') || '0';
                        const isDisabled = actionRow.classList.contains('disabled');

                        adicionarXPathInput(
                            elementFinder,
                            true,
                            parseFloat(intervalMs) || 1000,
                            parseInt(repeat) || 1,
                            fillValue,
                            parseFloat(actionInitWait) || 0,
                            mode,
                            fillMethod
                        );

                        const newActionRow = xpathActionsContainer.querySelector('.xpath-action-row:last-child');
                        if (isDisabled) {
                            newActionRow.classList.add('disabled');
                            newActionRow.querySelectorAll('.input-inline, .action-mode-select').forEach(input => {
                                input.disabled = true;
                            });
                        }

                        updateActionNumbers();
                        hasUnsavedChanges = true;
                        saveCurrentConfiguration(false);
                        menuElement.remove();
                    });
                }

                if (disableOption) {
                    disableOption.addEventListener('click', () => {
                        actionRow.classList.toggle('disabled');
                        const inputsToDisable = actionRow.querySelectorAll('.input-inline, .action-mode-select');
                        inputsToDisable.forEach(input => {
                            input.disabled = actionRow.classList.contains('disabled');
                        });
                        hasUnsavedChanges = true;
                        saveCurrentConfiguration(false);
                        menuElement.remove();
                    });
                }

                document.addEventListener('click', function closeMenu(ev) {
                    if (menuElement && !editButton.contains(ev.target) && !menuElement.contains(ev.target)) {
                        menuElement.remove();
                    }
                }, { once: true });
            });
        }

        if (deleteButton) {
            deleteButton.addEventListener('click', function() {
                actionRow.remove();
                updateActionNumbers();
                updateIntervalRepeatHeadersVisibility();
                hasUnsavedChanges = true;
                saveCurrentConfiguration(false);
                console.log("Action removed.");
            });
        }

        if (modeSelect) {
            modeSelect.addEventListener('change', function() {
                const colNameInput = actionRow.querySelector('.col-name input');
                if (this.value === 'fill') {
                    colNameInput.placeholder = translations.fillModeTitle || translations.modeFillLabel;
                    if (modeDisplay) {
                        modeDisplay.classList.remove('click-mode');
                        modeDisplay.classList.add('fill-mode');
                        modeDisplay.innerHTML = '';
                    }
                } else {
                    colNameInput.placeholder = translations.clickModeTitle || translations.modeClickLabel;
                    if (modeDisplay) {
                        modeDisplay.classList.remove('fill-mode');
                        modeDisplay.classList.add('click-mode');
                        modeDisplay.innerHTML = svgs.mouseClick;
                    }
                }
                hasUnsavedChanges = true;
                saveCurrentConfiguration(false);
                console.log(`Action mode changed to: ${this.value}`);
            });
        }

        if (modeDisplay) {
            modeDisplay.addEventListener('click', function() {
                const currentMode = modeSelect.value;
                const newMode = currentMode === 'click' ? 'fill' : 'click';
                modeSelect.value = newMode;
                modeSelect.dispatchEvent(new Event('change'));
            });
        }

        inputs.forEach(input => {
            input.addEventListener('input', () => hasUnsavedChanges = true);
            input.addEventListener('change', () => {
                const intervalInput = actionRow.querySelector('.col-interval-ms input');
                if (intervalInput) {
                    let intervalValue = intervalInput.value.trim();
                    console.log(`Input change detected. Raw interval value: ${intervalValue}`);
                    if (intervalValue === '' || isNaN(parseFloat(intervalValue))) {
                        intervalInput.value = '1000';
                    }
                    hasUnsavedChanges = true;
                }
            });
        });
    }

function setActiveConfig(clickedItem, forceReload = false) {
    const previousActiveId = activeConfigId;
    if (activeConfigId && hasUnsavedChanges && !forceReload) {
        saveCurrentConfiguration(false);
    }

    const allConfigItems = configList.querySelectorAll('.config-list-item');
    allConfigItems.forEach(item => item.classList.remove('active'));

    if (configSelect) {
        configSelect.value = clickedItem && clickedItem.dataset && clickedItem.dataset.configId ? clickedItem.dataset.configId : '';
    }

    if (clickedItem && clickedItem.dataset && clickedItem.dataset.configId) {
        const newActiveConfigId = clickedItem.dataset.configId;

        if (activeConfigId === newActiveConfigId && !forceReload) {
            console.log(`Configuração ${newActiveConfigId} já está ativa.`);
            return;
        }

        clickedItem.classList.add('active');
        activeConfigId = newActiveConfigId;

        const configData = configurations.find(cfg => cfg.id == activeConfigId);
        if (configData) {
            aplicarDadosConfiguracao(configData);
            console.log(`Configuração "${configData.name}" carregada.`);
            
            // Verificar scripts associados e atualizar classe script-saved
            acfhStorage.get([`customScript_${activeConfigId}`, `UserScript_${activeConfigId}`], (data) => {
                if (data[`customScript_${activeConfigId}`] || data[`UserScript_${activeConfigId}`]) {
                    scriptEditorIconBtn.classList.add('script-saved');
                } else {
                    scriptEditorIconBtn.classList.remove('script-saved');
                }
            });
        } else {
            configNameInput.value = '';
            configUrlInput.value = '';
            initWaitInput.value = '0';
            xpathActionsContainer.innerHTML = '';
            scriptEditorIconBtn.classList.remove('script-saved');
            console.log(`Configuração com ID ${activeConfigId} não encontrada. Inputs limpos.`);
        }
    } else {
        activeConfigId = null;
        configNameInput.value = '';
        configUrlInput.value = '';
        initWaitInput.value = '0';
        xpathActionsContainer.innerHTML = '';
        scriptEditorIconBtn.classList.remove('script-saved');
        console.log("Nenhuma configuração ativa. Inputs principais limpos.");
        
        // Limpar completamente quando não há configurações
        if (configurations.length === 0) {
            acfhStorage.set({ autoClickConfig: null }, () => {
                console.log('autoClickConfig limpo do storage.');
            });
        }
    }

    updateActionNumbers();

    acfhStorage.set({ activeConfigId }, () => {
        console.log(`Configuração ativa definida: ${activeConfigId}`);

        // Quando a configuração ativa muda, removemos o user script da configuração anterior,
        // para que apenas a configuração atual permaneça com script associado.
        if (previousActiveId && previousActiveId !== activeConfigId) {
            chrome.userScripts.unregister({ ids: [previousActiveId, `UserScript_${previousActiveId}`] }, () => {
                if (chrome.runtime.lastError) {
                    console.warn('Erro ao remover userScript da configuração anterior:', chrome.runtime.lastError.message);
                } else {
                    console.log('UserScript removido para configuração anterior:', previousActiveId);
                }
            });
        }
    });

    hasUnsavedChanges = false;
}



    function addEventListenersToConfigItem(configItem) {
        const deleteButton = configItem.querySelector('.item-delete');
        
        configItem.addEventListener('click', function(event) {
            if (!event.target.closest('.item-delete') && !configItem.classList.contains('active')) {
                setActiveConfig(this);
            }
        });

        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                const configId = configItem.dataset.configId;
                // Exclusão direta a partir do item: sem confirmação
                deleteConfiguration(configId, { skipConfirm: true });
            });
        }
    }

    function validateElementFinder(value) {
        if (!value) return false;
        if (isXPath(value)) {
            try {
                document.createExpression(value);
                return true;
            } catch (e) {
                return false;
            }
        } else {
            try {
                document.createDocumentFragment().querySelector(value);
                return true;
            } catch (e) {
                return false;
            }
        }
    }

function saveCurrentConfiguration(showMessage = true) {
    if (!activeConfigId) {
        console.log("No active configuration to save.");
        return;
    }
    
    // CORREÇÃO AQUI: Usar o parâmetro showMessage em vez de showNotification
    if (!hasUnsavedChanges && showMessage) {
        console.log("No changes to save in the active configuration.");
        return;
    }

    clearTimeout(saveTimeout);

    const configToSave = configurations.find(cfg => cfg.id == activeConfigId);

    if (configToSave) {
        configToSave.name = configNameInput.value;
        configToSave.url = configUrlInput.value;
        configToSave.initWait = initWaitInput.value;

        configToSave.actions = [];
        const actionRows = xpathActionsContainer.querySelectorAll('.xpath-action-row');
        let isValid = true;

        actionRows.forEach(row => {
            const elementFinder = row.querySelector('.col-element-finder input').value;
            if (!validateElementFinder(elementFinder)) {
                isValid = false;
                const isXPathSelector = isXPath(elementFinder);
                const baseMessage = isXPathSelector
                    ? translations.invalidXPathInAction
                    : translations.invalidCSSSelectorInAction;
                showTemporaryMessage(`${baseMessage} ${elementFinder}`, 'error');
                return;
            }

            let reps = parseInt(row.querySelector('.col-repeat input').value);
            if (reps !== -2 && (isNaN(reps) || reps <= 0 || reps > 9999999)) reps = 1;

            const intervalMsInput = row.querySelector('.col-interval-ms input');
            let intervalMs = intervalMsInput.value.trim();
            if (intervalMs === '' || isNaN(parseFloat(intervalMs))) {
                intervalMs = '1000';
            }

            const actionName = row.querySelector('.col-name input').value;
            
            configToSave.actions.push({
                name: actionName,
                elementFinder: elementFinder,
                mode: row.querySelector('.action-mode-select').value,
                intervalMs: row.getAttribute('data-action-mode') === 'mutationObserve' ? null : intervalMs,
                repeat: row.getAttribute('data-action-mode') === 'mutationObserve' ? null : reps,
                fillValue: row.getAttribute('data-fill-value') || '',
                fillMethod: row.getAttribute('data-fill-method') || 'paste',
                actionInitWait: row.getAttribute('data-action-init-wait') || '0',
                disabled: row.classList.contains('disabled'),
                isCSSSelector: row.getAttribute('data-is-css-selector') === 'true',
                actionMode: row.getAttribute('data-action-mode') || 'default'
            });
        });

        if (!isValid) return;

        // Salvar os action names no localStorage
        actionRows.forEach((row, index) => {
            saveActionNameToLocalStorage(row);
        });

        const sidebarItem = configList.querySelector(`.config-list-item[data-config-id="${activeConfigId}"]`);
        if (sidebarItem) {
            sidebarItem.querySelector('.item-name').textContent = configToSave.name;
            sidebarItem.querySelector('.item-url').textContent = configToSave.url;
        }

        const storageConfig = coletarDadosConfiguracao();
        const activeActions = configToSave.actions.filter(action => !action.disabled);

        // Se a configuração passar a ter ações, garantir que qualquer
        // UserScript automático desta configuração seja desregistrado,
        // para que apenas as ações de clique/preenchimento controlem
        // a automação. Se não houver ações, mantemos (ou permitimos)
        // o uso de scripts personalizados.
        if (configToSave.actions.length > 0) {
            chrome.runtime.sendMessage({
                action: "unregisterUserScript",
                configId: activeConfigId
            });
        }

        acfhStorage.get(["autoClickerEnabled"], (data) => {
            const isEnabled = data.autoClickerEnabled || false;
            // Mantemos chrome.storage.local (via acfhStorage) como fonte de verdade
            // apenas para configurations/activeConfigId. O background recalcula
            // autoClickConfig sempre que essas chaves mudam e o toggle geral
            // estiver habilitado, evitando inconsistências entre UI e injeção.
            acfhStorage.set({
                configurations: configurations,
                activeConfigId: activeConfigId
            }, () => {
                hasUnsavedChanges = false;
                if (showMessage) {  // CORREÇÃO AQUI: Usar showMessage em vez de showNotification
                    showTemporaryMessage(translations.configSaved, 'success');
                }
                console.log(`Configuration "${configToSave.name}" (ID: ${activeConfigId}) saved to storage. Data:`, configurations);

                if (isEnabled) {
                    chrome.runtime.sendMessage({
                        action: "configUpdated",
                        activeConfigId: activeConfigId,
                        config: {
                            ...storageConfig,
                            xpaths: activeActions.map(action => ({
                                value: action.elementFinder,
                                checked: true,
                                interval: action.intervalMs,
                                repetitions: action.repeat,
                                fillValue: action.fillValue,
                                waitInitModal: action.actionInitWait,
                                isCSSSelector: action.isCSSSelector,
                                actionMode: action.actionMode
                            }))
                        }
                    }, () => {
                        console.log("Updated configuration message sent to background.js.");
                    });
                } else {
                    console.log("Configuration saved, but not propagated: extension disabled.");
                }
            });
        });
    } else {
        console.warn(`Attempt to save a configuration with ID ${activeConfigId}, but not found in the array.`);
        if (showMessage) {  // CORREÇÃO AQUI TAMBÉM
            showTemporaryMessage("Error saving: Configuration not found!", 'error');
        }
    }
}
function deleteConfiguration(idToDelete, options = {}) {
    const skipConfirm = options.skipConfirm === true;

    const performDelete = (configId) => {
        const configIndex = configurations.findIndex(cfg => cfg.id == configId);
        if (configIndex > -1) {
            const removedConfigName = configurations[configIndex].name;
            configurations.splice(configIndex, 1);

            // Remover da lista da UI
            const configItemDiv = configList.querySelector(`.config-list-item[data-config-id="${configId}"]`);
            if (configItemDiv) {
                configItemDiv.remove();
            }

            // Limpar localStorage
            clearActionNamesFromLocalStorage(configId);

            // Limpar todos os scripts do storage
            acfhStorage.remove([
                `customScript_${configId}`, 
                `UserScript_${configId}`,
                `scriptLastEdited_${configId}`
            ], () => {
                console.log(`Scripts removidos do storage para config ${configId}`);
            });

            // Unregister user script
            chrome.userScripts.unregister({ ids: [`script-${configId}`] }, () => {
                if (chrome.runtime.lastError) {
                    // Ignora se o script não existir
                } else {
                    console.log(`User script com ID script-${configId} desregistrado.`);
                }
            });

            // Atualizar estado global
            const wasActive = activeConfigId == configId;
            
            if (wasActive) {
                activeConfigId = configurations.length > 0 ? configurations[0].id : null;
                
                // Limpar UI
                configNameInput.value = '';
                configUrlInput.value = '';
                initWaitInput.value = '0';
                xpathActionsContainer.innerHTML = '';
                scriptEditorIconBtn.classList.remove('script-saved');
            }

            // Atualizar storage
            acfhStorage.set({
                configurations: configurations,
                activeConfigId: activeConfigId,
                autoClickConfig: wasActive ? null : undefined // Remover se era a ativa
            }, () => {
                showTemporaryMessage(`Configuração "${removedConfigName}" removida!`, 'success');
                console.log(`Configuração "${removedConfigName}" (ID: ${configId}) removida.`);

                // Atualizar dropdown e lista
                updateConfigListAndDropdown();
                
                // Notificar content script para parar execução
                if (wasActive) {
                    chrome.runtime.sendMessage({
                        action: "stopAutomation"
                    }, () => {
                        console.log("Mensagem stopAutomation enviada para background.js");
                    });
                }
            });
        } else {
            console.warn(`Tentativa de remover configuração com ID ${configId}, mas não encontrada.`);
            showTemporaryMessage("Erro: Configuração não encontrada para remoção!", 'error');
        }
    };

    if (skipConfirm) {
        performDelete(idToDelete);
    } else {
        showModal(translations.modalDeleteConfirm, true).then(confirmacao => {
            if (!confirmacao) return;
            performDelete(idToDelete);
        });
    }
}


    function getNextConfigNumber() {
        const existingNumbers = configurations
            .map(cfg => {
                const match = cfg.name.match(/Default Configuration (\d+)/);
                return match ? parseInt(match[1], 10) : null;
            })
            .filter(num => num !== null)
            .sort((a, b) => a - b);

        let nextNum = 1;
        for (let i = 0; i < existingNumbers.length; i++) {
            if (existingNumbers[i] === nextNum) {
                nextNum++;
            } else if (existingNumbers[i] > nextNum) {
                return nextNum;
            }
        }
        return nextNum;
    }

    async function exportAllConfigurations() {
        if (configurations.length === 0) {
            showTemporaryMessage(translations.emptyConfigExport, 'error');
            return;
        }

        if (activeConfigId && hasUnsavedChanges) {
            saveCurrentConfiguration(false);
        }

        try {
            const jsonData = JSON.stringify(configurations, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });

            if ('showSaveFilePicker' in window) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'auto_clicker_configs.json',
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                showTemporaryMessage(translations.exportSettingsTitle + " - " + translations.configSaved, 'success');
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'auto_clicker_configs.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showTemporaryMessage(translations.exportSettingsTitle + " - " + translations.configSaved, 'success');
            }
            console.log("All configurations exported.");
        } catch (error) {
            console.error("Export error:", error);
        } finally {
            bulkActionsMenu.classList.remove('show');
        }
    }

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        sendResponse({ received: true });
        if (msg.action === "actionAdded" && msg.activeConfigId === activeConfigId) {
            console.log("actionAdded message received, updating UI with new action.");
            const config = configurations.find(cfg => cfg.id === activeConfigId);
            if (config) {
                const isCSSSelector = !isXPath(msg.newAction.elementFinder);
                adicionarXPathInput(
                    msg.newAction.elementFinder,
                    true,
                    parseFloat(msg.newAction.intervalMs) || 1000,
                    msg.newAction.repeat || 1,
                    msg.newAction.fillValue || "",
                    parseFloat(msg.newAction.actionInitWait) || 0,
                    msg.newAction.mode || "click",
                    msg.newAction.fillMethod || "paste",
                    isCSSSelector
                );
                updateActionNumbers();
                hasUnsavedChanges = false;
                showTemporaryMessage("New action added!", "success");
            } else {
                console.warn("Active configuration not found when processing actionAdded.");
            }
        }
    });

    document.querySelectorAll('input[name="feedbackMode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const feedbackMode = radio.value === 'none' ? 'none' : 'floatbox';
            acfhStorage.set({ feedbackMode }, () => {
                console.log(`Feedback mode updated to: ${feedbackMode}`);
                chrome.runtime.sendMessage({
                    action: "feedbackModeChanged",
                    feedbackMode: feedbackMode
                }, () => {
                    console.log("Feedback mode change propagated to content scripts.");
                });
                document.querySelectorAll('input[name="feedbackMode"]').forEach(r => {
                    const label = r.nextElementSibling;
                    label.classList.toggle('checked', r.checked);
                });
            });
        });
    });

    function toggleFeedback(selected) {
        const checkboxes = document.querySelectorAll('input[name="feedback"]');
        
        checkboxes.forEach(checkbox => {
            const label = checkbox.closest('.feedback-option').querySelector('label');
            if (checkbox === selected) {
                if (checkbox.checked) {
                    label.classList.add('checked');
                } else {
                    label.classList.remove('checked');
                }
            } else {
                checkbox.checked = false;
                label.classList.remove('checked');
            }
        });

        const feedbackValue = selected.checked ? selected.id : null;
        acfhStorage.set({ feedbackMode: feedbackValue }, () => {
            console.log(`Feedback mode set to: ${feedbackValue || 'none'}`);
        });
    }

    function toggleMutationObserveOption() {
        acfhStorage.get(['configMode', 'sandboxMode'], (data) => {
            const configMode = data.configMode || 'beginner';
            const sandboxMode = data.sandboxMode || 'default';
            const mutationObserveRadio = document.getElementById('mutationObserveMode');
            
            if (mutationObserveRadio) {
                const isEnabled = configMode === 'advanced' && sandboxMode === 'forceDOM';
                mutationObserveRadio.disabled = !isEnabled;
                if (!isEnabled && mutationObserveRadio.checked) {
                    document.getElementById('defaultMode').checked = true;
                    if (currentEditingActionRow) {
                        currentEditingActionRow.setAttribute('data-action-mode', 'default');
                        const intervalCol = currentEditingActionRow.querySelector('.col-interval-ms');
                        const repeatCol = currentEditingActionRow.querySelector('.col-repeat');
                        if (intervalCol) intervalCol.style.display = '';
                        if (repeatCol) repeatCol.style.display = '';
                        hasUnsavedChanges = true;
                        saveCurrentConfiguration(false);
                    }
                }
            }
        });
    }   


// Função para alternar a visibilidade do botão do editor de scripts
function toggleScriptEditorButton() {
    acfhStorage.get(['configMode', 'contentScriptApi', 'sandboxMode'], (data) => {
        const configMode = data.configMode || 'beginner';
        const contentScriptApi = data.contentScriptApi || 'dynamicUserScriptApi';
        const sandboxMode = data.sandboxMode || 'default';
        const scriptEditorIconBtn = document.getElementById('scriptEditorIconBtn');

        if (scriptEditorIconBtn) {
            const isVisible = configMode === 'advanced' &&
                              contentScriptApi === 'userScriptsApi' &&
                              sandboxMode === 'forceDOM';
            scriptEditorIconBtn.classList.toggle('visible', isVisible);
        }
    });
}

// Adiciona listener para mudanças nas configurações relevantes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && ('configMode' in changes || 'contentScriptApi' in changes || 'sandboxMode' in changes)) {
        toggleScriptEditorButton();
    }
});

    function exportActiveConfiguration() {
        if (!activeConfigId) {
            showTemporaryMessage(translations.incompleteConfigExport, 'error');
            return;
        }

        if (hasUnsavedChanges) {
            saveCurrentConfiguration(false);
        }

        const configToExport = configurations.find(cfg => cfg.id == activeConfigId);

        if (!configToExport) {
            showTemporaryMessage("Active configuration not found to export.", 'error');
            return;
        }

        try {
            const dataToExport = [configToExport];
            const jsonData = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const fileName = `${configToExport.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showTemporaryMessage(`${translations.exportSettingsTitle}: "${configToExport.name}"`, 'success');
            console.log(`Configuration "${configToExport.name}" exported for direct download.`);
        } catch (error) {
            console.error("Error exporting active configuration:", error);
            showTemporaryMessage(translations.exportSettingsTitle + " - Error", 'error');
        }
    }
    

    async function importConfigurations() {
        try {
            if ('showOpenFilePicker' in window) {
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }],
                    multiple: false
                });
                const file = await fileHandle.getFile();
                const content = await file.text();
                const importedConfigs = JSON.parse(content);

                if (!Array.isArray(importedConfigs)) {
                    throw new Error(translations.importError);
                }

                if (activeConfigId && hasUnsavedChanges) {
                    saveCurrentConfiguration(false);
                }

                const convertedConfigs = importedConfigs.map(config => {
                    return {
                        id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
                        name: config.name || `Imported Config ${configurations.length + 1}`,
                        url: config.url || '',
                        initWait: config.initWait || '0',
                        actions: (config.actions || []).map((action, index) => ({
                            name: action.name || `Action ${index + 1}`,
                            elementFinder: action.elementFinder || '',
                            mode: action.mode || 'click',
                            intervalMs: action.intervalMs || '1000',
                            repeat: action.repeat ?? 1,
                            fillValue: action.fillValue || '',
                            fillMethod: action.fillMethod || 'paste',
                            actionInitWait: action.actionInitWait || '0'
                        }))
                    };
                });

                configurations.push(...convertedConfigs);

                convertedConfigs.forEach(config => {
                    const newConfigItem = configListItemTemplate.content.cloneNode(true);
                    const configItemDiv = newConfigItem.querySelector('.config-list-item');
                    configItemDiv.querySelector('.item-name').textContent = config.name;
                    configItemDiv.querySelector('.item-url').textContent = config.url;
                    configItemDiv.dataset.configId = config.id;
                    configItemDiv.dataset.initWait = config.initWait;
                    configList.appendChild(configItemDiv);
                    addEventListenersToConfigItem(configItemDiv);
                });

                acfhStorage.set({
                    configurations: configurations,
                    activeConfigId: activeConfigId
                }, () => {
                    if (configurations.length > 0 && !activeConfigId) {
                        setActiveConfig(configList.firstElementChild, true);
                    }
                    showTemporaryMessage(translations.configImported, 'success');
                    console.log("Configurations imported and added:", convertedConfigs);
                });
            } else {
                // Fallback para navegadores sem showOpenFilePicker
                return new Promise((resolve, reject) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json,application/json';
                    input.style.display = 'none';
                    document.body.appendChild(input);

                    input.addEventListener('change', (event) => {
                        const file = event.target.files && event.target.files[0];
                        if (!file) {
                            document.body.removeChild(input);
                            resolve();
                            return;
                        }

                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const content = e.target.result;
                                const importedConfigs = JSON.parse(content);

                                if (!Array.isArray(importedConfigs)) {
                                    throw new Error(translations.importError);
                                }

                                if (activeConfigId && hasUnsavedChanges) {
                                    saveCurrentConfiguration(false);
                                }

                                const convertedConfigs = importedConfigs.map(config => {
                                    return {
                                        id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
                                        name: config.name || `Imported Config ${configurations.length + 1}`,
                                        url: config.url || '',
                                        initWait: config.initWait || '0',
                                        actions: (config.actions || []).map((action, index) => ({
                                            name: action.name || `Action ${index + 1}`,
                                            elementFinder: action.elementFinder || '',
                                            mode: action.mode || 'click',
                                            intervalMs: action.intervalMs || '1000',
                                            repeat: action.repeat ?? 1,
                                            fillValue: action.fillValue || '',
                                            fillMethod: action.fillMethod || 'paste',
                                            actionInitWait: action.actionInitWait || '0'
                                        }))
                                    };
                                });

                                configurations.push(...convertedConfigs);

                                convertedConfigs.forEach(config => {
                                    const newConfigItem = configListItemTemplate.content.cloneNode(true);
                                    const configItemDiv = newConfigItem.querySelector('.config-list-item');
                                    configItemDiv.querySelector('.item-name').textContent = config.name;
                                    configItemDiv.querySelector('.item-url').textContent = config.url;
                                    configItemDiv.dataset.configId = config.id;
                                    configItemDiv.dataset.initWait = config.initWait;
                                    configList.appendChild(configItemDiv);
                                    addEventListenersToConfigItem(configItemDiv);
                                });

                                acfhStorage.set({
                                    configurations: configurations,
                                    activeConfigId: activeConfigId
                                }, () => {
                                    if (configurations.length > 0 && !activeConfigId) {
                                        setActiveConfig(configList.firstElementChild, true);
                                    }
                                    showTemporaryMessage(translations.configImported, 'success');
                                    console.log("Configurations imported and added (fallback):", convertedConfigs);
                                    resolve();
                                });
                            } catch (parseError) {
                                console.error("Error reading or parsing JSON file:", parseError);
                                showTemporaryMessage(`${translations.importError}: ${parseError.message}`, 'error');
                                reject(parseError);
                            } finally {
                                document.body.removeChild(input);
                            }
                        };

                        reader.onerror = (err) => {
                            console.error("Error reading file:", err);
                            showTemporaryMessage(`${translations.importError}: ${err.message}`, 'error');
                            document.body.removeChild(input);
                            reject(err);
                        };

                        reader.readAsText(file);
                    });

                    input.click();
                });
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log("File import canceled by user.");
            } else {
                console.error("Error importing configurations:", error);
                showTemporaryMessage(`${translations.importError}: ${error.message}`, 'error');
            }
        } finally {
            bulkActionsMenu.classList.remove('show');
        }
    }

    // Event Listeners
    if (cancelModalButton) {
        cancelModalButton.addEventListener('click', closeActionConfigModal);
    }

    if (saveModalButton) {
        saveModalButton.addEventListener('click', function(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            console.log('[ACFH] Botão Salvar do modal de ação clicado');
            if (currentEditingActionRow) {
                const modalValue = document.getElementById('modalValueInput').value;
                const modalActionInitialWait = document.getElementById('modalActionInitialWait').value;
                const actionModeRadio = document.querySelector('input[name="actionMode"]:checked');
                const actionMode = actionModeRadio ? actionModeRadio.value : 'default';
                
                let fillMethod = 'paste';
                const modeSelectEl = currentEditingActionRow.querySelector('.action-mode-select');
                const currentMode = modeSelectEl ? modeSelectEl.value : 'fill';
                if (currentMode === 'fill') {
                    const checkedRadio = document.querySelector('input[name="fillMethod"]:checked');
                    if (checkedRadio) {
                        fillMethod = checkedRadio.value;
                    }
                }

                currentEditingActionRow.setAttribute('data-fill-value', modalValue);
                currentEditingActionRow.setAttribute('data-fill-method', fillMethod);
                currentEditingActionRow.setAttribute('data-action-init-wait', modalActionInitialWait);
                currentEditingActionRow.setAttribute('data-action-mode', actionMode);

                const intervalCol = currentEditingActionRow.querySelector('.col-interval-ms');
                const repeatCol = currentEditingActionRow.querySelector('.col-repeat');
                const isMutationObserve = actionMode === 'mutationObserve';
                if (intervalCol) intervalCol.style.display = isMutationObserve ? 'none' : '';
                if (repeatCol) repeatCol.style.display = isMutationObserve ? 'none' : '';
                updateIntervalRepeatHeadersVisibility();
            }
            closeActionConfigModal();
            hasUnsavedChanges = true;
            saveCurrentConfiguration(false);
        });
    }

    if (actionConfigModal) {
        window.addEventListener('click', function(event) {
            if (event.target === actionConfigModal) {
                closeActionConfigModal();
                hasUnsavedChanges = true;
                saveCurrentConfiguration(false);
            }
        });
    }

    if (btnAddAction) {
        btnAddAction.addEventListener('click', addNewActionRow);
    }

    if (btnNewConfig) {
        btnNewConfig.addEventListener('click', function() {
            if (activeConfigId && hasUnsavedChanges) {
                saveCurrentConfiguration(false);
            }

            const newConfigId = Date.now().toString();
            const nextAvailableNumber = getNextConfigNumber();
            const configName = `Default Configuration ${String(nextAvailableNumber).padStart(2, '0')}`;
            
            const newConfigData = {
                id: newConfigId,
                name: configName,
                url: '',
                initWait: '0',
                actions: []
            };
            configurations.push(newConfigData);

            const newConfigItem = configListItemTemplate.content.cloneNode(true);
            const configItemDiv = newConfigItem.querySelector('.config-list-item');
            
            configItemDiv.querySelector('.item-name').textContent = configName;
            configItemDiv.querySelector('.item-url').textContent = '';
            configItemDiv.dataset.configId = newConfigId;
            configItemDiv.dataset.initWait = '0';

            configList.appendChild(configItemDiv);
            addEventListenersToConfigItem(configItemDiv);

            setActiveConfig(configItemDiv);
            console.log(`New configuration "${configName}" created.`);
        });
    }

    if (moreOptionsBtn) {
        moreOptionsBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            bulkActionsMenu.classList.toggle('show');
        });
    }

    document.addEventListener('click', function(event) {
        if (bulkActionsMenu && !bulkActionsMenu.contains(event.target) && bulkActionsMenu.classList.contains('show')) {
            bulkActionsMenu.classList.remove('show');
        }
    });

    if (bulkExportBtn) {
        bulkExportBtn.addEventListener('click', exportAllConfigurations);
    }

    if (bulkImportBtn) {
        bulkImportBtn.addEventListener('click', importConfigurations);
    }

if (bulkRemoveActiveBtn) {
    let isProcessing = false;
    bulkRemoveActiveBtn.addEventListener('click', function() {
        if (isProcessing) return;
        isProcessing = true;

        if (!activeConfigId) {
            const msg = currentUiLanguage === 'en'
                ? 'No active configuration to remove.'
                : 'Nenhuma configuração ativa para remover.';
            showTemporaryMessage(msg, 'error');
            bulkActionsMenu.classList.remove('show');
            isProcessing = false;
            return;
        }

        // Apenas remove a configuração atualmente ativa na lista
        const activeConfigItem = configList.querySelector(`.config-list-item[data-config-id="${activeConfigId}"]`);
        if (activeConfigItem) {
            // Remoção via menu "More options": manter confirmação
            deleteConfiguration(activeConfigId, { skipConfirm: false });
        } else {
            const msgNotFound = currentUiLanguage === 'en'
                ? 'Active configuration item not found.'
                : 'Item de configuração ativo não encontrado.';
            showTemporaryMessage(msgNotFound, 'error');
        }

        bulkActionsMenu.classList.remove('show');
        setTimeout(() => { isProcessing = false; }, 1000);
    });
}

    if (importConfigIconBtn) {
        importConfigIconBtn.addEventListener('click', importConfigurations);
    }

    if (exportConfigIconBtn) {
        exportConfigIconBtn.addEventListener('click', exportActiveConfiguration);
    }

    [configNameInput, configUrlInput, initWaitInput].forEach(input => {
        input.addEventListener('input', () => hasUnsavedChanges = true);
        input.addEventListener('change', () => hasUnsavedChanges = true);
    });

    document.addEventListener('click', function(event) {
        const isClickInsideModal = actionConfigModal.contains(event.target) && actionConfigModal.style.display === 'block';
        const isInteractiveElement = event.target.matches('input, select, button, .icon-btn, a, [contenteditable="true"]');
        const isClickInsideConfigArea = event.target.closest('.config-details') || event.target.closest('.config-sidebar');
        
        if (hasUnsavedChanges && !isClickInsideModal && !isInteractiveElement && isClickInsideConfigArea) {
            console.log("Click outside interactive elements in configuration area, triggering auto-save.");
            saveCurrentConfiguration(true);
        }
    }, true);

    window.addEventListener('beforeunload', () => {
        if (hasUnsavedChanges && activeConfigId) {
            saveCurrentConfiguration(false);
        }
    });

    const settingsBtn = document.getElementById('settingsGearBtn');
    const settingsPopup = document.getElementById('settingsPopup');
    const closeBtn = document.getElementById('closeSettingsPopup');

    settingsBtn.addEventListener('click', () => {
        settingsPopup.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => {
        settingsPopup.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === settingsPopup) {
            settingsPopup.style.display = 'none';
        }
    });

    const configModeSelect = document.getElementById('configMode');
    const securitySection = document.getElementById('securitySection');

    function toggleSecuritySection() {
        if (configModeSelect.value === 'advanced') {
            securitySection.style.display = 'block';
        } else {
            securitySection.style.display = 'none';
        }
    }

    configModeSelect.addEventListener('change', toggleSecuritySection);
    toggleSecuritySection();

acfhStorage.get(["uiLanguage", "configMode", "contentScriptApi", "sandboxMode", "blacklist", "feedbackMode"], (data) => {
    const currentLang = data.uiLanguage || (document.documentElement && document.documentElement.lang) || 'pt-BR';
    try {
        window.localStorage.setItem('uiLanguage', currentLang);
    } catch {
        // ignore
    }
    document.getElementById('configMode').value = data.configMode || 'beginner';
    toggleSecuritySection();
    document.getElementById('contentScriptApi').value = data.contentScriptApi || 'dynamicUserScriptApi';
    document.getElementById('sandboxMode').value = data.sandboxMode || 'default';
    document.getElementById('blacklistSites').value = (data.blacklist || ['google.com','facebook.com','twitter.com','instagram.com','linkedin.com','youtube.com']).join('\n');

    const feedbackMode = data.feedbackMode || 'none';
    const noneRadio = document.getElementById('feedbackNone');
    const floatboxRadio = document.getElementById('feedbackFloatbox');
    noneRadio.checked = feedbackMode === 'none';
    floatboxRadio.checked = feedbackMode === 'floatbox';
    
    const noneLabel = noneRadio.nextElementSibling;
    const floatboxLabel = floatboxRadio.nextElementSibling;
    noneLabel.classList.toggle('checked', feedbackMode === 'none');
    floatboxLabel.classList.toggle('checked', feedbackMode === 'floatbox');

    toggleMutationObserveOption();
    toggleScriptEditorButton(); // Add this to update button visibility on load
    applyInterfaceLanguage(currentLang);
});


function updateScriptEditorButtonVisibility() {
    acfhStorage.get(['configMode', 'contentScriptApi', 'sandboxMode'], (data) => {
        const configMode = data.configMode || 'beginner';
        const contentScriptApi = data.contentScriptApi || 'dynamicUserScriptApi';
        const sandboxMode = data.sandboxMode || 'default';
        const scriptEditorIconBtn = document.getElementById('scriptEditorIconBtn');
        
        // Condições exatas da primeira imagem (valores salvos no storage)
        const isVisible = configMode === 'advanced' &&  // Valor interno para 'Avançado'
                          contentScriptApi === 'userScriptApi' &&  // Valor interno para 'APIs dos UserScripts'
                          sandboxMode === 'forceDOM';  // Valor interno para 'Forçar o DOM'

        console.log('Debug visibilidade:', { configMode, contentScriptApi, sandboxMode, isVisible });

        if (scriptEditorIconBtn) {
            // Salva o estado no storage para persistir após reload
            acfhStorage.set({ scriptEditorVisibility: isVisible });
            
            // Aplica visibilidade
            if (isVisible) {
                scriptEditorIconBtn.style.display = 'flex';
                scriptEditorIconBtn.classList.add('visible');
            } else {
                scriptEditorIconBtn.style.display = 'none';
                scriptEditorIconBtn.classList.remove('visible');
            }
        } else {
            console.error('Botão #scriptEditorIconBtn não encontrado no HTML');
        }
    });
}

const saveSettingsBtn = document.querySelector('.btn-save-popup');
saveSettingsBtn.addEventListener('click', () => {
    const uiLanguage = currentUiLanguage || (document.documentElement && document.documentElement.lang) || 'pt-BR';
    const configMode = document.getElementById('configMode').value;
    const contentScriptApi = document.getElementById('contentScriptApi').value;
    const sandboxMode = document.getElementById('sandboxMode').value;
    const blacklistText = document.getElementById('blacklistSites').value;
    const blacklist = blacklistText.split('\n').map(s => s.trim()).filter(s => s);
    const feedbackMode = document.querySelector('input[name="feedbackMode"]:checked')?.value || 'none';

    acfhStorage.set({
        configMode,
        contentScriptApi,
        sandboxMode,
        blacklist,
        uiLanguage,
        feedbackMode
    }, () => {
        console.log('Configurações salvas. Valores:', { uiLanguage, configMode, contentScriptApi, sandboxMode });
        showTemporaryMessage(translations.configSaved);
        document.getElementById('settingsPopup').style.display = 'none';
        
        toggleMutationObserveOption();
        updateScriptEditorButtonVisibility();  // Atualiza visibilidade após salvar

        if (configMode !== 'advanced' || sandboxMode !== 'forceDOM') {
            const actionRows = document.querySelectorAll('.xpath-action-row');
            let changesMade = false;
            actionRows.forEach(row => {
                if (row.getAttribute('data-action-mode') === 'mutationObserve') {
                    row.setAttribute('data-action-mode', 'default');
                    const intervalCol = row.querySelector('.col-interval-ms');
                    const repeatCol = row.querySelector('.col-repeat');
                    if (intervalCol) intervalCol.style.display = '';
                    if (repeatCol) repeatCol.style.display = '';
                    changesMade = true;
                }
            });
            if (changesMade) {
                hasUnsavedChanges = true;
                saveCurrentConfiguration(false);
                const msg = currentUiLanguage === 'en'
                    ? 'Mutation Observe disabled. Affected actions reverted to Default mode.'
                    : 'Mutation Observe desabilitado. Ações afetadas voltaram para o modo Padrão.';
                showTemporaryMessage(msg, 'warning');
            }
        }

        chrome.runtime.sendMessage({
            action: "feedbackModeChanged",
            feedbackMode: feedbackMode
        }, () => {
            console.log("Feedback mode change propagated to content scripts after saving settings.");
        });

        applyInterfaceLanguage(uiLanguage);
    });
});

const cancelSettingsBtn = document.querySelector('.btn-cancel-popup');
cancelSettingsBtn.addEventListener('click', () => {
    document.getElementById('settingsPopup').style.display = 'none';
    acfhStorage.get(["uiLanguage", "configMode", "contentScriptApi", "sandboxMode", "blacklist", "feedbackMode"], (data) => {
        const currentLang = data.uiLanguage || (document.documentElement && document.documentElement.lang) || 'pt-BR';
        document.getElementById('configMode').value = data.configMode || 'beginner';
        toggleSecuritySection();
        document.getElementById('contentScriptApi').value = data.contentScriptApi || 'dynamicUserScriptApi';
        document.getElementById('sandboxMode').value = data.sandboxMode || 'default';
        document.getElementById('blacklistSites').value = (data.blacklist || ['google.com','facebook.com','twitter.com','instagram.com','linkedin.com','youtube.com']).join('\n');

        const feedbackMode = data.feedbackMode || 'none';
        const noneRadio = document.getElementById('feedbackNone');
        const floatboxRadio = document.getElementById('feedbackFloatbox');
        noneRadio.checked = feedbackMode === 'none';
        floatboxRadio.checked = feedbackMode === 'floatbox';
        
        const noneLabel = noneRadio.nextElementSibling;
        const floatboxLabel = floatboxRadio.nextElementSibling;
        noneLabel.classList.toggle('checked', feedbackMode === 'none');
        floatboxLabel.classList.toggle('checked', feedbackMode === 'floatbox');

        toggleMutationObserveOption();
        updateScriptEditorButtonVisibility();  // Restaura visibilidade ao cancelar
        applyInterfaceLanguage(currentLang);
    });
});

window.addEventListener('acfh-language-change', (event) => {
    const nextLang = event && event.detail ? event.detail.lang : null;
    if (nextLang) {
        applyInterfaceLanguage(nextLang);
    }
});

    actionConfigModal.style.display = 'none';
    loadConfigurationsFromStorage();
    hasUnsavedChanges = false;
    saveNotification.classList.remove('show');
    handleSearchSelection();
    updateScriptEditorButtonVisibility();  // Inicializa visibilidade na carga da página
});