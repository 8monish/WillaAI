/* =============================================
   RipeAI — Modern Agentic Terminal Interface
   Connected to local system tools
   ============================================= */

const CLI_ENGINES = [
    {
        id: "antigravity",
        name: "Gemini 3.8 Flash (High)",
        tag: "LOCAL",
        models: [
            { id: "gemini-3.8-flash-high",   name: "Gemini 3.8 Flash (High)", tag: "RECOMMENDED", tagLabel: "DEFAULT" },
            { id: "gemini-3.8-flash-medium", name: "Gemini 3.8 Flash (Medium)", tag: "BALANCED", tagLabel: "FAST" },
            { id: "gemini-3.8-flash-low",    name: "Gemini 3.8 Flash (Low)", tag: "LIGHT", tagLabel: "LOW" },
            { id: "claude-sonnet-4-6",       name: "Claude Sonnet 4.6 (Thinking)", tag: "REASON", tagLabel: "THINK" },
            { id: "gpt-oss-120b-medium",     name: "GPT-OSS 120B (Medium)", tag: "OPEN", tagLabel: "OSS" },
        ]
    },
    {
        id: "codex",
        name: "GPT-6 Luna",
        tag: "CODEX",
        models: [
            { id: "gpt-6-luna", name: "GPT-6 Luna", tag: "SMART", tagLabel: "CODEX" }
        ]
    },
    {
        id: "terminal",
        name: "Direct Linux Bash Terminal",
        tag: "BASH",
        models: [
            { id: "bash", name: "Direct Shell Execution", tag: "SHELL", tagLabel: "BASH" }
        ]
    }
];

/* =============================================
   STATE
   ============================================= */
const STATE = {
    user: null,
    googleClientId: localStorage.getItem('ripe_google_client_id') || localStorage.getItem('willa_google_client_id') || '',
    engine: localStorage.getItem('ripe_engine') || 'antigravity',
    modelId: localStorage.getItem('ripe_model_id') || 'gemini-3.8-flash-high',
    modelName: localStorage.getItem('ripe_model_name') || 'Gemini 3.8 Flash (High)',
    history: [],
    autoExec: true,
    safeMode: false,
    showOutput: true,
    streamMode: true,
    theme: localStorage.getItem('app_theme') || 'dark',
    currentCwd: '~'
};

// Default to dark theme for modern terminal aesthetic
if (STATE.theme === 'dark' || !localStorage.getItem('app_theme')) {
    document.body.classList.add('dark-theme');
    STATE.theme = 'dark';
}

// Dangerous command patterns for safe mode
const DANGEROUS_PATTERNS = [
    /rm\s+-rf?\s+\//, /mkfs/, /dd\s+if=/, /:\(\)\s*\{/,
    /chmod\s+777\s+\//, /shutdown/, /reboot/, /halt/,
    /> \/dev\/sda/, /format/, /fdisk/,
];

/* =============================================
   DOM REFS
   ============================================= */
const $ = id => document.getElementById(id);

const els = {
    appLayout: $('app'),
    signinScreen: $('signin-screen'),
    guestSigninBtn: $('guest-signin-btn'),
    gSigninWrapper: $('g-signin-wrapper'),
    gSigninBtn: $('g-signin-btn'),
    customGoogleSigninBtn: $('custom-google-signin-btn'),
    signinStatus: $('signin-status'),
    signOutBtn: $('sign-out-btn'),
    sidebarUserName: $('sidebar-user-name'),
    sidebarUserEmail: $('sidebar-user-email'),
    sidebarUserAvatar: $('sidebar-user-avatar'),

    onboardScreen: $('onboarding-screen'),
    onboardSaveBtn: $('onboard-save-btn'),

    settingsOverlay: $('settings-overlay'),
    closeSettingsBtn: $('close-settings-btn'),
    openSettingsBtn: $('open-settings-btn'),
    engineSelect: $('engine-select'),
    modalModelList: $('model-list'),
    selectedModelName: $('selected-model-name'),
    antigravityModelGroup: $('antigravity-model-group'),
    healthGeminiEngine: $('health-gemini-engine'),
    healthCodex: $('health-codex'),
    googleClientIdInput: $('google-client-id-input'),
    saveSettingsBtn: $('save-settings-btn'),
    resetSettingsBtn: $('reset-settings-btn'),

    waStatusText: $('wa-status-text'),
    waQrImg: $('wa-qr-img'),
    waLinkBtn: $('wa-link-btn'),
    waInstructions: $('wa-instructions'),

    sidebarWaBadge: $('sidebar-wa-badge'),
    sidebarWaDot: $('sidebar-wa-dot'),
    sidebarWaStatusText: $('sidebar-wa-status-text'),
    sidebarWaInputGroup: $('sidebar-wa-input-group'),
    sidebarWaPhoneInput: $('sidebar-wa-phone-input'),
    sidebarWaLinkBtn: $('sidebar-wa-link-btn'),
    sidebarWaQrBox: $('sidebar-wa-qr-box'),
    sidebarWaQrImg: $('sidebar-wa-qr-img'),
    sidebarWaUnlinkBtn: $('sidebar-wa-unlink-btn'),

    sidebarModel: $('sidebar-model'),
    headerModelBadge: $('header-model-badge'),
    headerStatusText: $('header-status-text'),
    themeToggleBtn: $('theme-toggle-btn'),
    sidebarToggleBtn: $('sidebar-toggle-btn'),
    clearChatBtn: $('clear-chat-btn'),
    useGeminiModelBtn: $('use-gemini-model-btn'),

    messagesContainer: $('messages-container'),
    messages: $('chat-messages'),

    userInput: $('user-input'),
    sendBtn: $('send-btn'),
    stopBtn: $('stop-btn'),
    attachBtn: $('attach-btn'),
    fileInput: $('file-input'),
    attachmentBar: $('attachment-bar'),

    toggleAutoExec: $('toggle-auto-exec'),
    toggleSafeMode: $('toggle-safe-mode'),
    toggleShowOutput: $('toggle-show-output'),
    toggleStream: $('toggle-stream'),

    memoryList: $('memory-list'),
    clearMemoriesBtn: $('clear-memories-btn'),

    // Terminal Drawer elements
    terminalToggleBtn: $('terminal-toggle-btn'),
    terminalDrawer: $('terminal-drawer'),
    terminalOutput: $('terminal-output'),
    terminalInputForm: $('terminal-input-form'),
    terminalCmdInput: $('terminal-cmd-input'),
    termCloseBtn: $('term-close-btn'),
    termClearBtn: $('term-clear-btn'),
    termCwdDisplay: $('term-cwd-display'),

    // Multi-View Navigation Tabs & Views
    tabTerminalBtn: $('tab-terminal-btn'),
    tabWhatsappBtn: $('tab-whatsapp-btn'),
    tabWizardBtn: $('tab-wizard-btn'),
    tabWaDot: $('tab-wa-dot'),
    viewTerminal: $('view-terminal'),
    viewWhatsappHub: $('view-whatsapp-hub'),
    viewWhatsappWizard: $('view-whatsapp-wizard'),
    directWaWizardBtn: $('direct-wa-wizard-btn'),

    // Wizard Stepper & Pages
    stepNav1: $('step-nav-1'),
    stepNav2: $('step-nav-2'),
    stepNav3: $('step-nav-3'),
    stepNav4: $('step-nav-4'),
    wizardStep1: $('wizard-step-1'),
    wizardStep2: $('wizard-step-2'),
    wizardStep3: $('wizard-step-3'),
    wizardStep4: $('wizard-step-4'),
    wizardQrImg: $('wizard-qr-img'),
    wizardQrLoading: $('wizard-qr-loading'),
    wizardQrStatus: $('wizard-qr-status'),
    wizardRefreshQrBtn: $('wizard-refresh-qr-btn'),
    wizardStep1NextBtn: $('wizard-step1-next-btn'),
    wizardStep2BackBtn: $('wizard-step2-back-btn'),
    wizardStep2NextBtn: $('wizard-step2-next-btn'),
    wizardPhoneInput: $('wizard-phone-input'),
    wizardStep3BackBtn: $('wizard-step3-back-btn'),
    wizardStep3NextBtn: $('wizard-step3-next-btn'),
    wizardOpenHubBtn: $('wizard-open-hub-btn'),
    wizardFinishBtn: $('wizard-finish-btn'),

    // WhatsApp Hub
    hubPingBtn: $('hub-ping-btn'),
    hubOpenWizardBtn: $('hub-open-wizard-btn'),
    hubPhoneDisplay: $('hub-phone-display'),
    hubChangeNumberBtn: $('hub-change-number-btn'),
    hubUnlinkBtn: $('hub-unlink-btn'),
    hubGoChatBtn: $('hub-go-chat-btn')
};

let waPollInterval = null;
let currentView = 'terminal';
let currentWizardStep = 1;
let prevWaStatus = null;
let terminalHistory = [];
let terminalHistoryIndex = -1;

/* =============================================
   INITIALIZATION
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    checkCliHealth();
    bindEvents();
    initGoogleAuth();
    syncToggleUI();
    updateUI();
    renderEmptyHero();
    loadMemoryPanel();

    // Start background WhatsApp status polling and real-time remote event listener
    pollWhatsAppStatus();
    setInterval(pollWhatsAppStatus, 3000);
    initSSEListener();
    loadServerChatHistory();

    if (STATE.user) {
        updateUserProfileUI();
        els.signinScreen.classList.add('hidden');
        els.appLayout.classList.remove('hidden');
    }
});

/* =============================================
   CLI HEALTH CHECK
   ============================================= */
async function checkCliHealth() {
    try {
        const res = await fetch('/api/model/status');
        if (!res.ok) return;
        const data = await res.json();
        
        if (els.healthGeminiEngine && data.engines?.primary_model) {
            const ok = data.engines.primary_model.available;
            els.healthGeminiEngine.textContent = ok ? 'Connected' : 'Unavailable';
            els.healthGeminiEngine.className = 'cli-status-badge ' + (ok ? 'ok' : 'err');
        }
        if (els.healthCodex && data.engines?.codex) {
            const ok = data.engines.codex.available;
            els.healthCodex.textContent = ok ? 'Available' : 'Unavailable';
            els.healthCodex.className = 'cli-status-badge ' + (ok ? 'ok' : 'err');
        }
        if (data.current_cwd) {
            STATE.currentCwd = data.current_cwd;
            if (els.termCwdDisplay) els.termCwdDisplay.textContent = data.current_cwd;
        }
    } catch (e) {
        console.warn('CLI status check failed', e);
    }
}

/* =============================================
   EVENT BINDINGS
   ============================================= */
function bindEvents() {
    // Auth
    els.guestSigninBtn?.addEventListener('click', () => {
        loginUser({
            id: 'guest',
            name: 'Terminal Guest',
            email: 'guest@ripe.ai',
            picture: '',
            provider: 'guest'
        });
    });

    els.signOutBtn?.addEventListener('click', () => {
        if (confirm('Sign out of RipeAI?')) signOut();
    });

    // Theme toggle
    els.themeToggleBtn?.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-theme');
        STATE.theme = isDark ? 'dark' : 'light';
        localStorage.setItem('app_theme', STATE.theme);
    });

    // Sidebar
    els.sidebarToggleBtn?.addEventListener('click', () => {
        els.appLayout.classList.toggle('sidebar-hidden');
    });

    // New Chat
    els.clearChatBtn?.addEventListener('click', async () => {
        if (confirm('Start a fresh conversation?')) {
            STATE.history = [];
            els.messages.innerHTML = '';
            renderEmptyHero();
            try {
                await fetch('/api/chat/clear', { method: 'POST' });
            } catch (_) {}
            showToast('New conversation started');
        }
    });

    // Input & Send
    els.sendBtn?.addEventListener('click', sendMessage);
    els.userInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    els.userInput?.addEventListener('input', () => {
        els.userInput.style.height = 'auto';
        els.userInput.style.height = Math.min(els.userInput.scrollHeight, 180) + 'px';
    });

    // Stop button
    els.stopBtn?.addEventListener('click', () => {
        if (abortController) abortController.abort();
    });

    // Settings
    els.openSettingsBtn?.addEventListener('click', openSettings);
    els.headerModelBadge?.addEventListener('click', openSettings);
    els.sidebarModel?.addEventListener('click', openSettings);
    els.useGeminiModelBtn?.addEventListener('click', selectGeminiModel);
    els.closeSettingsBtn?.addEventListener('click', closeSettings);
    els.settingsOverlay?.addEventListener('click', e => {
        if (e.target === els.settingsOverlay) closeSettings();
    });

    els.engineSelect?.addEventListener('change', () => {
        const eng = els.engineSelect.value;
        if (eng === 'antigravity') {
            els.antigravityModelGroup.classList.remove('hidden');
        } else {
            els.antigravityModelGroup.classList.add('hidden');
        }
    });

    els.saveSettingsBtn?.addEventListener('click', saveSettings);
    els.resetSettingsBtn?.addEventListener('click', resetSettings);

    // Onboarding cards
    document.querySelectorAll('.engine-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.engine-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            STATE.engine = card.dataset.engine;
            STATE.modelId = card.dataset.model;
        });
    });

    els.onboardSaveBtn?.addEventListener('click', () => {
        saveToStorage();
        updateUI();
        els.onboardScreen.classList.add('hidden');
        els.appLayout.classList.remove('hidden');
        showToast(`RipeAI ready with ${STATE.modelName}.`);
    });

    // Terminal Drawer controls
    els.terminalToggleBtn?.addEventListener('click', toggleTerminalDrawer);
    els.termCloseBtn?.addEventListener('click', toggleTerminalDrawer);
    els.termClearBtn?.addEventListener('click', () => {
        els.terminalOutput.innerHTML = '<div class="terminal-welcome">Terminal buffer cleared.</div>';
    });

    // Terminal quick chips
    document.querySelectorAll('.term-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const cmd = chip.dataset.cmd;
            if (cmd) executeTerminalCommand(cmd);
        });
    });

    // Terminal input submission
    els.terminalInputForm?.addEventListener('submit', e => {
        e.preventDefault();
        const cmd = els.terminalCmdInput.value.trim();
        if (!cmd) return;
        terminalHistory.push(cmd);
        terminalHistoryIndex = terminalHistory.length;
        els.terminalCmdInput.value = '';
        executeTerminalCommand(cmd);
    });

    // Terminal up/down arrow history
    els.terminalCmdInput?.addEventListener('keydown', e => {
        if (e.key === 'ArrowUp') {
            if (terminalHistory.length > 0 && terminalHistoryIndex > 0) {
                terminalHistoryIndex--;
                els.terminalCmdInput.value = terminalHistory[terminalHistoryIndex];
            }
        } else if (e.key === 'ArrowDown') {
            if (terminalHistoryIndex < terminalHistory.length - 1) {
                terminalHistoryIndex++;
                els.terminalCmdInput.value = terminalHistory[terminalHistoryIndex];
            } else {
                terminalHistoryIndex = terminalHistory.length;
                els.terminalCmdInput.value = '';
            }
        }
    });

    // Toggles
    bindToggles();

    // Attachments
    bindAttachments();

    // Multi-View Navigation Tabs
    els.tabTerminalBtn?.addEventListener('click', () => switchView('terminal'));
    els.tabWhatsappBtn?.addEventListener('click', () => switchView('whatsapp-hub'));
    els.tabWizardBtn?.addEventListener('click', () => switchView('whatsapp-wizard'));

    // Landing Screen Direct WhatsApp Setup
    els.directWaWizardBtn?.addEventListener('click', () => {
        if (!STATE.user) {
            loginUser({
                id: 'guest',
                name: 'Terminal Guest',
                email: 'guest@ripe.ai',
                picture: '',
                provider: 'guest'
            });
        }
        goToWizardStep(1);
        switchView('whatsapp-wizard');
    });

    // Wizard Stepper Indicator Clicks
    [els.stepNav1, els.stepNav2, els.stepNav3, els.stepNav4].forEach((nav, idx) => {
        nav?.addEventListener('click', () => {
            goToWizardStep(idx + 1);
        });
    });

    // Wizard Step 1 Controls
    els.wizardRefreshQrBtn?.addEventListener('click', async () => {
        showToast('Refreshing WhatsApp QR code...');
        await handleStartWhatsApp(els.wizardPhoneInput?.value?.trim() || '');
        pollWhatsAppStatus();
    });
    els.wizardStep1NextBtn?.addEventListener('click', () => goToWizardStep(2));

    // Wizard Step 2 Controls
    els.wizardStep2BackBtn?.addEventListener('click', () => goToWizardStep(1));
    els.wizardStep2NextBtn?.addEventListener('click', () => goToWizardStep(3));

    // Wizard Step 3 Controls
    els.wizardStep3BackBtn?.addEventListener('click', () => goToWizardStep(2));
    els.wizardStep3NextBtn?.addEventListener('click', handleWizardStep3Save);

    // Wizard Step 4 Controls
    els.wizardOpenHubBtn?.addEventListener('click', () => switchView('whatsapp-hub'));
    els.wizardFinishBtn?.addEventListener('click', () => switchView('terminal'));

    // WhatsApp Hub Actions
    els.hubPingBtn?.addEventListener('click', handleHubPing);
    els.hubOpenWizardBtn?.addEventListener('click', () => {
        goToWizardStep(1);
        switchView('whatsapp-wizard');
    });
    els.hubChangeNumberBtn?.addEventListener('click', () => {
        goToWizardStep(3);
        switchView('whatsapp-wizard');
    });
    els.hubUnlinkBtn?.addEventListener('click', handleHubUnlink);
    els.hubGoChatBtn?.addEventListener('click', () => switchView('terminal'));
}

/* =============================================
   SYSTEM TERMINAL DRAWER LOGIC
   ============================================= */
function toggleTerminalDrawer() {
    const isHidden = els.terminalDrawer.classList.toggle('hidden');
    els.terminalToggleBtn.classList.toggle('active', !isHidden);
    if (!isHidden) {
        setTimeout(() => els.terminalCmdInput?.focus(), 150);
    }
}

async function executeTerminalCommand(cmd) {
    appendTerminalLine(`$ ${cmd}`, 'term-cmd-line');
    try {
        const res = await fetch('/api/terminal/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cmd })
        });
        const data = await res.json();
        if (data.cwd) {
            STATE.currentCwd = data.cwd;
            if (els.termCwdDisplay) els.termCwdDisplay.textContent = data.cwd;
        }
        if (data.output) {
            appendTerminalLine(data.output, data.code === 0 ? 'term-stdout' : 'term-stderr');
        }
    } catch (err) {
        appendTerminalLine(`Terminal Error: ${err.message}`, 'term-stderr');
    }
}

function appendTerminalLine(text, className) {
    const row = document.createElement('div');
    row.className = className;
    row.textContent = text;
    els.terminalOutput.appendChild(row);
    els.terminalOutput.scrollTop = els.terminalOutput.scrollHeight;
}

/* =============================================
   AUTH
   ============================================= */
function loginUser(user) {
    STATE.user = user;
    localStorage.setItem('ripe_auth_user', JSON.stringify(user));
    updateUserProfileUI();
    els.signinScreen.classList.add('hidden');
    els.appLayout.classList.remove('hidden');
    showToast(`Welcome, ${user.name || 'User'}! ${STATE.modelName} ready.`);
}

function signOut() {
    STATE.user = null;
    localStorage.removeItem('ripe_auth_user');
    els.appLayout.classList.add('hidden');
    els.signinScreen.classList.remove('hidden');
    showToast('Signed out.');
}

function updateUserProfileUI() {
    if (!STATE.user) return;
    els.sidebarUserName.textContent = STATE.user.name || 'User';
    els.sidebarUserEmail.textContent = STATE.user.email || 'guest@ripe.ai';
    els.sidebarUserAvatar.onerror = () => {
        els.sidebarUserAvatar.onerror = null;
        els.sidebarUserAvatar.src = '/static/default-user.svg';
    };
    const savedPicture = STATE.user.provider === 'google-demo' ? '' : STATE.user.picture;
    els.sidebarUserAvatar.src = savedPicture || '/static/default-user.svg';
}

function initGoogleAuth() {
    els.customGoogleSigninBtn?.addEventListener('click', () => {
        const userName = prompt('Enter your name for Google Demo Sign-In:', 'Developer');
        if (userName !== null) {
            loginUser({
                id: 'demo-' + Date.now(),
                name: userName.trim() || 'Developer',
                email: `${(userName.trim() || 'dev').toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
                provider: 'google-demo'
            });
        }
    });
}

/* =============================================
   SETTINGS & ENGINES
   ============================================= */
function openSettings() {
    els.engineSelect.value = STATE.engine;
    if (STATE.engine === 'antigravity') {
        els.antigravityModelGroup.classList.remove('hidden');
    } else {
        els.antigravityModelGroup.classList.add('hidden');
    }

    renderGeminiModels();
    els.settingsOverlay.classList.remove('hidden');
    checkCliHealth();
    pollWhatsAppStatus();
    if (waPollInterval) clearInterval(waPollInterval);
    waPollInterval = setInterval(pollWhatsAppStatus, 2500);
}

function closeSettings() {
    els.settingsOverlay.classList.add('hidden');
    if (waPollInterval) clearInterval(waPollInterval);
}

function renderGeminiModels() {
    const geminiEngine = CLI_ENGINES.find(e => e.id === 'antigravity');
    if (!geminiEngine) return;
    els.modalModelList.innerHTML = '';

    geminiEngine.models.forEach(m => {
        const row = document.createElement('div');
        row.className = `model-item-clean ${STATE.modelId === m.id ? 'active' : ''}`;
        row.innerHTML = `
            <div class="model-item-info">
                <span class="model-item-title">${escapeHtml(m.name)}</span>
                <span class="model-item-id">${escapeHtml(m.tagLabel)} model</span>
            </div>
            <span class="model-badge-clean ${m.tag.toLowerCase()}">${m.tagLabel}</span>
        `;
        row.addEventListener('click', () => {
            document.querySelectorAll('.model-item-clean').forEach(r => r.classList.remove('active'));
            row.classList.add('active');
            STATE.modelId = m.id;
            STATE.modelName = m.name;
            els.selectedModelName.textContent = m.name;
        });
        els.modalModelList.appendChild(row);
    });
}

function saveSettings() {
    STATE.engine = els.engineSelect.value;
    if (STATE.engine === 'antigravity') {
        ensureGeminiModel();
    } else if (STATE.engine === 'codex') {
        STATE.modelId = 'gpt-6-luna';
        STATE.modelName = 'GPT-6 Luna';
    } else if (STATE.engine === 'terminal') {
        STATE.modelId = 'bash';
        STATE.modelName = 'Direct Bash Shell';
    }

    saveToStorage();
    updateUI();
    closeSettings();
    showToast(`Selected ${STATE.modelName}.`);
}

function ensureGeminiModel() {
    const geminiModels = CLI_ENGINES.find(engine => engine.id === 'antigravity').models;
    if (!geminiModels.some(model => model.id === STATE.modelId)) {
        STATE.modelId = 'gemini-3.8-flash-high';
        STATE.modelName = 'Gemini 3.8 Flash (High)';
    }
}

function selectGeminiModel() {
    STATE.engine = 'antigravity';
    ensureGeminiModel();
    saveToStorage();
    updateUI();
    showToast(`Selected ${STATE.modelName}.`);
}

function resetSettings() {
    STATE.engine = 'antigravity';
    STATE.modelId = 'gemini-3.8-flash-high';
    STATE.modelName = 'Gemini 3.8 Flash (High)';
    saveToStorage();
    updateUI();
    renderGeminiModels();
    els.engineSelect.value = 'antigravity';
    els.antigravityModelGroup.classList.remove('hidden');
    showToast('Reset to Gemini 3.8 Flash (High).');
}

/* =============================================
   MULTI-PAGE NAVIGATION & WIZARD CONTROLLER
   ============================================= */
function switchView(viewName) {
    currentView = viewName;

    const navTabs = [
        { name: 'terminal', btn: els.tabTerminalBtn, view: els.viewTerminal },
        { name: 'whatsapp-hub', btn: els.tabWhatsappBtn, view: els.viewWhatsappHub },
        { name: 'whatsapp-wizard', btn: els.tabWizardBtn, view: els.viewWhatsappWizard }
    ];

    navTabs.forEach(t => {
        if (t.name === viewName) {
            t.btn?.classList.add('active');
            t.view?.classList.remove('hidden');
        } else {
            t.btn?.classList.remove('active');
            t.view?.classList.add('hidden');
        }
    });

    if (viewName === 'whatsapp-hub' || viewName === 'whatsapp-wizard') {
        pollWhatsAppStatus();
    }
}

function goToWizardStep(stepNum) {
    currentWizardStep = stepNum;

    const stepNavs = [els.stepNav1, els.stepNav2, els.stepNav3, els.stepNav4];
    const stepPanels = [els.wizardStep1, els.wizardStep2, els.wizardStep3, els.wizardStep4];

    stepNavs.forEach((nav, idx) => {
        const step = idx + 1;
        if (!nav) return;
        nav.classList.remove('active', 'completed');
        if (step === stepNum) {
            nav.classList.add('active');
        } else if (step < stepNum) {
            nav.classList.add('completed');
        }
    });

    stepPanels.forEach((panel, idx) => {
        const step = idx + 1;
        if (!panel) return;
        if (step === stepNum) {
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    });

    if (stepNum === 1) {
        pollWhatsAppStatus();
    } else if (stepNum === 3) {
        setTimeout(() => els.wizardPhoneInput?.focus(), 100);
    }
}

/* =============================================
   WHATSAPP STATUS & MULTI-VIEW CONTROLS
   ============================================= */
async function pollWhatsAppStatus() {
    try {
        const res = await fetch('/api/whatsapp/status');
        if (!res.ok) return;
        const data = await res.json();
        
        const qrSrc = data.qr_base64 
            ? (data.qr_base64.startsWith('data:') ? data.qr_base64 : `data:image/png;base64,${data.qr_base64}`)
            : '';

        // Auto-advance wizard if transition to connected occurred while on Step 1
        if (prevWaStatus && prevWaStatus !== 'connected' && data.status === 'connected') {
            if (currentWizardStep === 1) {
                showToast('🎉 WhatsApp linked successfully!');
                goToWizardStep(2);
            }
        }
        prevWaStatus = data.status;

        // 1. Update Top Nav Tab Dot
        if (els.tabWaDot) {
            if (data.status === 'connected') {
                els.tabWaDot.style.background = '#10b981';
                els.tabWaDot.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.7)';
                els.tabWaDot.title = 'WhatsApp Connected';
            } else if (data.status === 'qr' || data.status === 'starting') {
                els.tabWaDot.style.background = '#f59e0b';
                els.tabWaDot.style.boxShadow = '0 0 8px rgba(245, 158, 11, 0.7)';
                els.tabWaDot.title = 'WhatsApp Setup Required';
            } else {
                els.tabWaDot.style.background = 'var(--text-muted)';
                els.tabWaDot.style.boxShadow = 'none';
                els.tabWaDot.title = 'WhatsApp Disconnected';
            }
        }

        const displayPhone = data.connected_number ? `+${data.connected_number}` : (data.owner_number ? `+${data.owner_number}` : '');

        // 2. Update WhatsApp Hub Page
        if (els.hubPhoneDisplay) {
            els.hubPhoneDisplay.textContent = displayPhone || 'Not Configured';
        }

        // 3. Update Multi-Step Wizard
        if (els.wizardQrStatus) {
            if (data.status === 'connected') {
                els.wizardQrStatus.textContent = `🟢 WhatsApp Connected & Active (${displayPhone || 'Linked'})`;
                els.wizardQrStatus.style.color = '#10b981';
                els.wizardQrLoading?.classList.add('hidden');
                els.wizardQrImg?.classList.add('hidden');
            } else if (data.status === 'qr' && qrSrc) {
                els.wizardQrStatus.textContent = '🟡 Scan this code in WhatsApp > Linked Devices';
                els.wizardQrStatus.style.color = '#f59e0b';
                if (els.wizardQrImg) {
                    els.wizardQrImg.src = qrSrc;
                    els.wizardQrImg.classList.remove('hidden');
                }
                els.wizardQrLoading?.classList.add('hidden');
            } else if (data.status === 'starting') {
                els.wizardQrStatus.textContent = '⏳ Initializing WhatsApp Web browser...';
                els.wizardQrStatus.style.color = '#3b82f6';
                els.wizardQrImg?.classList.add('hidden');
                if (els.wizardQrLoading) {
                    els.wizardQrLoading.textContent = 'Generating pairing QR code...';
                    els.wizardQrLoading.classList.remove('hidden');
                }
            } else {
                els.wizardQrStatus.textContent = 'WhatsApp offline. Click Refresh to generate QR code.';
                els.wizardQrStatus.style.color = 'var(--text-secondary)';
                els.wizardQrImg?.classList.add('hidden');
                els.wizardQrLoading?.classList.add('hidden');
            }
        }

        if ((data.connected_number || data.owner_number) && els.wizardPhoneInput && !els.wizardPhoneInput.value) {
            els.wizardPhoneInput.value = data.connected_number || data.owner_number;
        }

        // 4. Update Settings Modal (if open)
        if (els.waStatusText) {
            if (data.status === 'connected') {
                els.waStatusText.textContent = `Linked to ${displayPhone || 'Device'}`;
                els.waStatusText.style.color = '#10b981';
                els.waQrImg?.classList.add('hidden');
                els.waInstructions?.classList.add('hidden');
                els.waLinkBtn?.classList.add('hidden');
            } else if (data.status === 'qr' && qrSrc) {
                els.waStatusText.textContent = 'Scan QR code in WhatsApp Linked Devices';
                els.waStatusText.style.color = '#f59e0b';
                if (els.waQrImg) {
                    els.waQrImg.src = qrSrc;
                    els.waQrImg.classList.remove('hidden');
                }
                els.waInstructions?.classList.remove('hidden');
                els.waLinkBtn?.classList.add('hidden');
            } else {
                els.waStatusText.textContent = 'WhatsApp not linked';
                els.waStatusText.style.color = 'var(--text-secondary)';
                els.waQrImg?.classList.add('hidden');
                els.waInstructions?.classList.add('hidden');
                els.waLinkBtn?.classList.remove('hidden');
            }
        }

        // 5. Update Sidebar Controls
        if (els.sidebarWaBadge) {
            if (data.status === 'connected') {
                if (els.sidebarWaDot) els.sidebarWaDot.style.background = '#10b981';
                if (els.sidebarWaStatusText) els.sidebarWaStatusText.textContent = displayPhone || 'Connected';
                els.sidebarWaBadge.style.color = '#10b981';
                els.sidebarWaBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';

                els.sidebarWaInputGroup?.classList.add('hidden');
                els.sidebarWaQrBox?.classList.add('hidden');
                els.sidebarWaUnlinkBtn?.classList.remove('hidden');
            } else if (data.status === 'qr' && qrSrc) {
                if (els.sidebarWaDot) els.sidebarWaDot.style.background = '#f59e0b';
                if (els.sidebarWaStatusText) els.sidebarWaStatusText.textContent = 'Scan QR Code';
                els.sidebarWaBadge.style.color = '#f59e0b';
                els.sidebarWaBadge.style.borderColor = 'rgba(245, 158, 11, 0.3)';

                if (els.sidebarWaQrImg) els.sidebarWaQrImg.src = qrSrc;
                els.sidebarWaQrBox?.classList.remove('hidden');
                els.sidebarWaInputGroup?.classList.add('hidden');
                els.sidebarWaUnlinkBtn?.classList.add('hidden');
            } else if (data.status === 'starting') {
                if (els.sidebarWaDot) els.sidebarWaDot.style.background = '#3b82f6';
                if (els.sidebarWaStatusText) els.sidebarWaStatusText.textContent = 'Initializing...';
                els.sidebarWaBadge.style.color = '#3b82f6';
                els.sidebarWaBadge.style.borderColor = 'rgba(59, 130, 246, 0.3)';

                els.sidebarWaQrBox?.classList.add('hidden');
                els.sidebarWaInputGroup?.classList.remove('hidden');
                els.sidebarWaUnlinkBtn?.classList.add('hidden');
            } else {
                if (els.sidebarWaDot) els.sidebarWaDot.style.background = 'var(--text-muted)';
                if (els.sidebarWaStatusText) els.sidebarWaStatusText.textContent = 'Disconnected';
                els.sidebarWaBadge.style.color = 'var(--text-secondary)';
                els.sidebarWaBadge.style.borderColor = 'var(--border-medium)';

                els.sidebarWaQrBox?.classList.add('hidden');
                els.sidebarWaInputGroup?.classList.remove('hidden');
                els.sidebarWaUnlinkBtn?.classList.add('hidden');

                if (data.owner_number && els.sidebarWaPhoneInput && !els.sidebarWaPhoneInput.value) {
                    els.sidebarWaPhoneInput.value = data.owner_number;
                }
            }
        }
    } catch (_) {}
}

async function handleStartWhatsApp(phone) {
    if (els.sidebarWaStatusText) els.sidebarWaStatusText.textContent = 'Connecting...';
    if (els.waStatusText) els.waStatusText.textContent = 'Starting WhatsApp service...';
    
    try {
        const body = phone ? { owner_number: phone } : {};
        await fetch('/api/whatsapp/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        showToast('WhatsApp service requested.');
        pollWhatsAppStatus();
    } catch (e) {
        showToast('Failed to start WhatsApp bridge.');
        console.error(e);
    }
}

async function handleDisconnectWhatsApp() {
    try {
        await fetch('/api/whatsapp/disconnect', { method: 'POST' });
        showToast('WhatsApp disconnected.');
        pollWhatsAppStatus();
    } catch (e) {
        showToast('Failed to disconnect WhatsApp.');
        console.error(e);
    }
}

async function handleWizardStep3Save() {
    const rawNumber = els.wizardPhoneInput?.value?.trim() || '';
    const cleanNumber = rawNumber.replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 8) {
        showToast('Please enter your WhatsApp phone number with country code (e.g. 919363936963).');
        els.wizardPhoneInput?.focus();
        return;
    }

    if (els.wizardStep3NextBtn) {
        els.wizardStep3NextBtn.disabled = true;
        els.wizardStep3NextBtn.textContent = 'Saving & Sending Handshake...';
    }

    try {
        // Save owner number to backend
        await fetch('/api/whatsapp/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_number: cleanNumber })
        });

        // Trigger ping handshake test
        const pingRes = await fetch('/api/whatsapp/ping', { method: 'POST' });
        const pingData = await pingRes.json().catch(() => ({}));

        if (pingData.success) {
            showToast(`✅ Handshake message sent to +${cleanNumber}!`);
        } else {
            showToast(`Controller number set to +${cleanNumber}.`);
        }

        if (els.hubPhoneDisplay) {
            els.hubPhoneDisplay.textContent = `+${cleanNumber}`;
        }

        goToWizardStep(4);
    } catch (err) {
        showToast('Error saving number: ' + err.message);
    } finally {
        if (els.wizardStep3NextBtn) {
            els.wizardStep3NextBtn.disabled = false;
            els.wizardStep3NextBtn.textContent = 'Save Number & Send Handshake Test →';
        }
        pollWhatsAppStatus();
    }
}

async function handleHubPing() {
    if (els.hubPingBtn) {
        els.hubPingBtn.disabled = true;
        els.hubPingBtn.textContent = 'Sending Ping...';
    }
    try {
        const res = await fetch('/api/whatsapp/ping', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast('✅ Ping handshake sent to your WhatsApp DM!');
        } else {
            showToast('Ping response: ' + (data.message || 'WhatsApp not ready yet'));
        }
    } catch (e) {
        showToast('Failed to ping WhatsApp: ' + e.message);
    } finally {
        if (els.hubPingBtn) {
            els.hubPingBtn.disabled = false;
            els.hubPingBtn.textContent = '🔔 Ping My WhatsApp';
        }
    }
}

async function handleHubUnlink() {
    if (!confirm('Are you sure you want to disconnect WhatsApp? You will need to re-scan the QR code to connect again.')) {
        return;
    }
    await handleDisconnectWhatsApp();
    goToWizardStep(1);
    switchView('whatsapp-wizard');
}

els.sidebarWaLinkBtn?.addEventListener('click', () => {
    const rawNumber = els.sidebarWaPhoneInput?.value?.trim() || '';
    const cleanNumber = rawNumber.replace(/\D/g, '');
    if (!cleanNumber) {
        showToast('Please enter your WhatsApp phone number with country code (e.g. 919363936963).');
        els.sidebarWaPhoneInput?.focus();
        return;
    }
    handleStartWhatsApp(cleanNumber);
});

els.sidebarWaUnlinkBtn?.addEventListener('click', handleDisconnectWhatsApp);

els.waLinkBtn?.addEventListener('click', () => {
    const phone = els.sidebarWaPhoneInput?.value?.trim()?.replace(/\D/g, '') || '';
    handleStartWhatsApp(phone);
});

/* =============================================
   PERSISTENCE
   ============================================= */
function saveToStorage() {
    localStorage.setItem('ripe_engine', STATE.engine);
    localStorage.setItem('ripe_model_id', STATE.modelId);
    localStorage.setItem('ripe_model_name', STATE.modelName);
    localStorage.setItem('ripe_auto_exec', STATE.autoExec);
    localStorage.setItem('ripe_safe_mode', STATE.safeMode);
    localStorage.setItem('ripe_show_output', STATE.showOutput);
    localStorage.setItem('ripe_stream', STATE.streamMode);
}

function loadFromStorage() {
    const savedUser = localStorage.getItem('ripe_auth_user') || localStorage.getItem('willa_auth_user');
    if (savedUser) {
        try { STATE.user = JSON.parse(savedUser); } catch (_) {}
    }
    STATE.engine = localStorage.getItem('ripe_engine') || 'antigravity';
    STATE.modelId = localStorage.getItem('ripe_model_id') || 'gemini-3.8-flash-high';
    STATE.modelName = localStorage.getItem('ripe_model_name') || 'Gemini 3.8 Flash (High)';
    STATE.autoExec = localStorage.getItem('ripe_auto_exec') !== 'false';
    STATE.safeMode = localStorage.getItem('ripe_safe_mode') === 'true';
    STATE.showOutput = localStorage.getItem('ripe_show_output') !== 'false';
    STATE.streamMode = localStorage.getItem('ripe_stream') !== 'false';
}

function updateUI() {
    const label = STATE.engine === 'codex' ? 'GPT-6 Luna' :
                  STATE.engine === 'terminal' ? 'Local Bash' :
                  STATE.modelName;

    if (els.sidebarModel) els.sidebarModel.textContent = label;
    if (els.headerModelBadge) els.headerModelBadge.querySelector('span').textContent = label;
    if (els.headerStatusText) {
        els.headerStatusText.textContent = STATE.engine === 'terminal' ? 'Local Bash ready' : `${label} ready`;
    }
}

function syncToggleUI() {
    if (els.toggleAutoExec) els.toggleAutoExec.checked = STATE.autoExec;
    if (els.toggleSafeMode) els.toggleSafeMode.checked = STATE.safeMode;
    if (els.toggleShowOutput) els.toggleShowOutput.checked = STATE.showOutput;
    if (els.toggleStream) els.toggleStream.checked = STATE.streamMode;
}

function bindToggles() {
    els.toggleAutoExec?.addEventListener('change', () => {
        STATE.autoExec = els.toggleAutoExec.checked;
        saveToStorage();
    });
    els.toggleSafeMode?.addEventListener('change', () => {
        STATE.safeMode = els.toggleSafeMode.checked;
        saveToStorage();
        showToast(STATE.safeMode ? 'Safe Mode ON' : 'Safe Mode OFF');
    });
    els.toggleShowOutput?.addEventListener('change', () => {
        STATE.showOutput = els.toggleShowOutput.checked;
        saveToStorage();
    });
    els.toggleStream?.addEventListener('change', () => {
        STATE.streamMode = els.toggleStream.checked;
        saveToStorage();
    });
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'neo-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(8px)';
        toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        setTimeout(() => toast.remove(), 250);
    }, 2800);
}

/* =============================================
   CHAT RENDERING
   ============================================= */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function uiIcon(name) {
    const paths = {
        resources: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
        system: '<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.64 5.64l2.12 2.12m8.48 8.48 2.12 2.12m0-12.72-2.12 2.12m-8.48 8.48-2.12 2.12"/><circle cx="12" cy="12" r="4"/>',
        files: '<path d="M3 6h7l2 2h9v11H3z"/><path d="M3 6V4h7l2 2"/>',
        processes: '<path d="M4 18V6m0 12h16M8 14l3-4 3 2 5-6"/>',
        warning: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3h.01"/>',
        image: '<rect x="3" y="3" width="18" height="18"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
        file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8m-8 4h8"/>'
    };
    return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${paths[name] || paths.file}</svg>`;
}

function renderMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text)
        .replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
            return `<pre class="code-block"><code class="lang-${lang}">${code}</code></pre>`;
        })
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    return html;
}

function hideEmptyHero() {
    const hero = $('empty-state-hero');
    if (hero) hero.remove();
}

function renderEmptyHero() {
    if (STATE.history.length === 0) {
        els.messages.innerHTML = `
            <div class="empty-state-hero" id="empty-state-hero">
                <div class="hero-icon-bubble"><img src="/static/ripeai-mark.svg" alt="RipeAI"></div>
                <h2 class="hero-heading">RipeAI Assistant</h2>
                <p class="hero-subtext">Local AI pair programmer, autonomous orchestrator, and WhatsApp remote bridge.</p>
                <div class="quick-prompts-grid">
                    <div class="quick-prompt-card" data-prompt="Explain the project structure and suggest improvements">
                        <span class="prompt-card-title">${uiIcon('files')} Codebase Architecture</span>
                        <span class="prompt-card-desc">Inspect project tree & design patterns</span>
                    </div>
                    <div class="quick-prompt-card" data-prompt="What is the status of the WhatsApp remote assistant and authorized number?">
                        <span class="prompt-card-title">${uiIcon('system')} WhatsApp Remote</span>
                        <span class="prompt-card-desc">Verify phone pairing & remote agent bridge</span>
                    </div>
                    <div class="quick-prompt-card" data-prompt="Check CPU, memory, and disk usage on this machine">
                        <span class="prompt-card-title">${uiIcon('resources')} System Resources</span>
                        <span class="prompt-card-desc">Check CPU, RAM & disk health</span>
                    </div>
                    <div class="quick-prompt-card" data-prompt="Show available system tools and autonomous agent capabilities">
                        <span class="prompt-card-title">${uiIcon('processes')} Agent Capabilities</span>
                        <span class="prompt-card-desc">Explore tools, shell, and automation</span>
                    </div>
                </div>
            </div>
        `;
        els.messages.querySelectorAll('.quick-prompt-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                if (prompt) {
                    els.userInput.value = prompt;
                    sendMessage();
                }
            });
        });
    }
}

function addUserMessage(text, options = {}) {
    hideEmptyHero();
    const div = document.createElement('div');
    div.className = 'message user-message';
    
    let waBadge = '';
    if (options.fromWhatsApp) {
        const senderDisplay = options.sender ? `+${options.sender}` : 'Authorized DM';
        waBadge = `
            <div class="wa-source-pill" title="Triggered from WhatsApp DM">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2Z"/>
                </svg>
                <span>WhatsApp • ${escapeHtml(senderDisplay)}</span>
            </div>
        `;
    }

    div.innerHTML = `
        <div class="msg-content-wrap">
            ${waBadge}
            <div class="msg-bubble">${escapeHtml(text)}</div>
        </div>
        <div class="msg-avatar">${options.fromWhatsApp ? '📱' : 'U'}</div>
    `;
    els.messages.appendChild(div);
    scrollBottom();
}

function addAiMessage(text) {
    hideEmptyHero();
    const div = document.createElement('div');
    div.className = 'message ai-message';
    div.innerHTML = `
        <div class="msg-avatar"><img src="/static/ripeai-mark.svg" alt=""></div>
        <div class="msg-content-wrap">
            <div class="msg-bubble">${renderMarkdown(text)}</div>
        </div>
    `;
    els.messages.appendChild(div);
    scrollBottom();
}

let activeAiBubble = null;

function createStreamingAiMessage() {
    hideEmptyHero();
    const div = document.createElement('div');
    div.className = 'message ai-message';
    div.innerHTML = `
        <div class="msg-avatar"><img src="/static/ripeai-mark.svg" alt=""></div>
        <div class="msg-content-wrap">
            <div class="msg-bubble streaming-bubble"></div>
        </div>
    `;
    els.messages.appendChild(div);
    activeAiBubble = div.querySelector('.msg-bubble');
    scrollBottom();
    return activeAiBubble;
}

function updateStreamingAiMessage(accumulatedText) {
    if (!activeAiBubble) {
        createStreamingAiMessage();
    }
    activeAiBubble.innerHTML = renderMarkdown(accumulatedText);
    scrollBottom();
}

function addActionMessage(cmd, toolName) {
    hideEmptyHero();
    const div = document.createElement('div');
    div.className = 'message ai-message';
    div.innerHTML = `
        <div class="msg-avatar"><img src="/static/ripeai-mark.svg" alt=""></div>
        <div class="msg-content-wrap" style="width: 100%;">
            <div class="action-card">
                <div class="action-card-header">
                    <span class="action-badge">${uiIcon('processes')} ${escapeHtml(toolName || 'System Action')}</span>
                </div>
                <div class="action-card-cmd">$ ${escapeHtml(cmd)}</div>
            </div>
        </div>
    `;
    els.messages.appendChild(div);
    scrollBottom();
}

function addResultMessage(output) {
    const div = document.createElement('div');
    div.className = 'message ai-message';
    div.innerHTML = `
        <div class="msg-avatar" style="visibility: hidden;"><img src="/static/ripeai-mark.svg" alt=""></div>
        <div class="msg-content-wrap" style="width: 100%;">
            <div class="action-card" style="border-top: none; margin-top: -8px;">
                <div class="action-card-header" style="background-color: var(--bg-code); font-size: 11px; color: var(--text-muted);">
                    <span>Terminal Output</span>
                </div>
                <div class="action-output-drawer">${escapeHtml(output)}</div>
            </div>
        </div>
    `;
    els.messages.appendChild(div);
    scrollBottom();
}

function addErrorMessage(msg) {
    hideEmptyHero();
    const div = document.createElement('div');
    div.className = 'message ai-message';
    div.innerHTML = `
        <div class="msg-avatar msg-avatar-warning" aria-label="Warning">${uiIcon('warning')}</div>
        <div class="msg-content-wrap">
            <div class="msg-bubble" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.25);">
                ${escapeHtml(msg)}
            </div>
        </div>
    `;
    els.messages.appendChild(div);
    scrollBottom();
}

let thinkingEl = null;
function showThinking(statusText = 'Thinking...') {
    removeThinking();
    thinkingEl = document.createElement('div');
    thinkingEl.className = 'message ai-message';
    thinkingEl.id = 'thinking-row';
    thinkingEl.innerHTML = `
        <div class="msg-avatar"><img src="/static/ripeai-mark.svg" alt=""></div>
        <div class="msg-content-wrap">
            <div class="thinking-bubble">
                <span class="pulse-dot"></span>
                <span>${escapeHtml(statusText)}</span>
            </div>
        </div>
    `;
    els.messages.appendChild(thinkingEl);
    scrollBottom();
}

function removeThinking() {
    const el = $('thinking-row');
    if (el) el.remove();
    thinkingEl = null;
}

function scrollBottom() {
    if (els.messagesContainer) {
        els.messagesContainer.scrollTop = els.messagesContainer.scrollHeight;
    }
}

/* =============================================
   MEMORIES
   ============================================= */
async function loadMemoryPanel() {
    try {
        const res = await fetch('/api/memories');
        if (!res.ok) return;
        const data = await res.json();
        renderMemories(data);
    } catch (_) {}
}

function renderMemories(memories) {
    if (!els.memoryList) return;
    els.memoryList.innerHTML = '';
    const keys = Object.keys(memories);
    if (!keys.length) {
        els.memoryList.innerHTML = '<span class="memory-empty">No facts remembered yet</span>';
        return;
    }
    keys.forEach(key => {
        const chip = document.createElement('div');
        chip.className = 'memory-chip';
        chip.innerHTML = `
            <div class="memory-chip-content">
                <span class="memory-chip-key">${escapeHtml(key)}</span>
                <span class="memory-chip-val">${escapeHtml(memories[key])}</span>
            </div>
            <button class="memory-chip-del" data-key="${escapeHtml(key)}" title="Forget">✕</button>
        `;
        chip.querySelector('.memory-chip-del').addEventListener('click', () => deleteMemory(key));
        els.memoryList.appendChild(chip);
    });
}

async function deleteMemory(key) {
    try {
        await fetch(`/api/memories/${encodeURIComponent(key)}`, { method: 'DELETE' });
        loadMemoryPanel();
    } catch (_) {}
}

els.clearMemoriesBtn?.addEventListener('click', async () => {
    if (!confirm('Clear all remembered facts?')) return;
    try {
        await fetch('/api/memories', { method: 'DELETE' });
        loadMemoryPanel();
        showToast('Memories cleared');
    } catch (_) {}
});

function addMemorySavedMsg(memories) {
    const keys = memories.map(m => m.key).join(', ');
    const div = document.createElement('div');
    div.className = 'memory-saved-msg';
    div.textContent = `Remembered: ${keys}`;
    els.messages.appendChild(div);
    scrollBottom();
    loadMemoryPanel();
}

/* =============================================
   ATTACHMENTS
   ============================================= */
const ATTACHMENTS = [];

function bindAttachments() {
    els.attachBtn?.addEventListener('click', () => els.fileInput.click());

    els.fileInput?.addEventListener('change', () => {
        const files = Array.from(els.fileInput.files);
        files.forEach(file => {
            const reader = new FileReader();
            const isText = file.type.startsWith('text/') ||
                /\.(md|json|py|js|ts|html|css|sh|yaml|yml|txt|csv|toml|ini|conf|log)$/i.test(file.name);
            const isImage = file.type.startsWith('image/');

            reader.onload = e => {
                let content;
                if (isImage) {
                    content = `[Image attached: ${file.name}]\nData: ${e.target.result}`;
                } else if (isText) {
                    const truncated = e.target.result.slice(0, 8000);
                    content = `[File: ${file.name}]\n\`\`\`\n${truncated}\n\`\`\``;
                } else {
                    content = `[Binary file: ${file.name} (${(file.size/1024).toFixed(1)}KB)]`;
                }
                ATTACHMENTS.push({ name: file.name, type: isImage ? 'image' : 'text', content });
                renderAttachmentBar();
            };
            if (isImage) reader.readAsDataURL(file);
            else reader.readAsText(file);
        });
        els.fileInput.value = '';
    });
}

function renderAttachmentBar() {
    if (!els.attachmentBar) return;
    els.attachmentBar.innerHTML = '';
    if (!ATTACHMENTS.length) {
        els.attachmentBar.classList.add('hidden');
        return;
    }
    els.attachmentBar.classList.remove('hidden');
    ATTACHMENTS.forEach((att, idx) => {
        const chip = document.createElement('div');
        chip.className = 'attachment-chip';
        chip.innerHTML = `
            <span>${uiIcon(att.type === 'image' ? 'image' : 'file')}</span>
            <span class="attachment-chip-name">${escapeHtml(att.name)}</span>
            <button class="attachment-chip-remove" data-idx="${idx}">✕</button>
        `;
        chip.querySelector('.attachment-chip-remove').addEventListener('click', () => {
            ATTACHMENTS.splice(idx, 1);
            renderAttachmentBar();
        });
        els.attachmentBar.appendChild(chip);
    });
}

function buildMessageWithAttachments(text) {
    if (!ATTACHMENTS.length) return text;
    const attachPart = ATTACHMENTS.map(a => a.content).join('\n\n');
    return `${text}\n\n--- ATTACHMENTS ---\n${attachPart}`;
}

/* =============================================
   SEND MESSAGE (CLI Connected)
   ============================================= */
let abortController = null;

function setSending(busy) {
    els.sendBtn.classList.toggle('hidden', busy);
    els.stopBtn.classList.toggle('hidden', !busy);
    els.userInput.disabled = busy;
    if (els.attachBtn) els.attachBtn.disabled = busy;
}

async function sendMessage() {
    const text = els.userInput.value.trim();
    if (!text) return;

    const fullText = buildMessageWithAttachments(text);
    ATTACHMENTS.length = 0;
    renderAttachmentBar();
    els.userInput.value = '';
    els.userInput.style.height = 'auto';

    addUserMessage(text);
    STATE.history.push({ role: 'user', content: fullText });

    // Two-way sync: Notify WhatsApp owner immediately that a prompt was sent from Web UI
    notifyWhatsAppOwner(`💻 *[Web Terminal Prompt]:*\n${text}`);

    abortController = new AbortController();
    setSending(true);
    showThinking(`Running ${STATE.modelName}...`);
    activeAiBubble = null;

    let streamedContent = '';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: STATE.history,
                engine: STATE.engine,
                model: STATE.modelId
            }),
            signal: abortController.signal
        });

        if (!response.ok) {
            let errMsg = `Server error (${response.status}).`;
            try {
                const data = await response.json();
                errMsg = data.detail || errMsg;
            } catch (_) {}
            removeThinking();
            addErrorMessage(errMsg);
            setSending(false);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.trim()) continue;
                let data;
                try { data = JSON.parse(line); } catch (_) { continue; }

                if (data.type === 'status') {
                    showThinking(data.message || 'Executing your request...');
                } else if (data.type === 'delta') {
                    removeThinking();
                    streamedContent += data.content;
                    updateStreamingAiMessage(streamedContent);
                } else if (data.type === 'action') {
                    removeThinking();
                    if (STATE.safeMode && DANGEROUS_PATTERNS.some(p => p.test(data.command))) {
                        addErrorMessage(`Safe Mode blocked dangerous action: \`${data.command}\``);
                        break;
                    }
                    addActionMessage(data.command, data.tool);
                } else if (data.type === 'action_result') {
                    if (STATE.showOutput) addResultMessage(data.output);
                    showThinking('Processing output...');
                } else if (data.type === 'memories_saved') {
                    addMemorySavedMsg(data.memories);
                } else if (data.type === 'final') {
                    removeThinking();
                    if (!streamedContent) {
                        updateStreamingAiMessage(data.content);
                        streamedContent = data.content;
                    }
                } else if (data.type === 'error') {
                    removeThinking();
                    addErrorMessage(data.message);
                }
            }
        }

        if (streamedContent) {
            STATE.history.push({ role: 'assistant', content: streamedContent });
            // Two-way sync: mirror completed AI response to owner's WhatsApp!
            notifyWhatsAppOwner(`🤖 *[AI Response]:*\n${streamedContent}`);
        }

    } catch (err) {
        removeThinking();
        if (err.name === 'AbortError') {
            addErrorMessage('⏹ Command execution stopped by user.');
        } else {
            addErrorMessage(`Execution error: ${err.message}. Ensure backend is running.`);
        }
    } finally {
        abortController = null;
        setSending(false);
        els.userInput.focus();
    }
}

/* =============================================
   WHATSAPP TWO-WAY REMOTE SYNC & SSE EVENT LISTENER
   ============================================= */

let remoteStreamedContent = '';

async function notifyWhatsAppOwner(msg) {
    if (!msg) return;
    try {
        await fetch('/api/whatsapp/notify-owner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
    } catch (_) {}
}

function initSSEListener() {
    if (window.__ripeAiSSE) {
        try { window.__ripeAiSSE.close(); } catch (_) {}
    }
    const es = new EventSource('/api/chat/events');
    window.__ripeAiSSE = es;

    es.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleLiveServerEvent(data);
        } catch (_) {}
    };

    es.onerror = () => {
        // EventSource handles reconnection automatically
    };
}

const recentUiMessageKeys = new Set();

function handleLiveServerEvent(data) {
    if (!data || !data.type) return;

    if (data.type === 'clear_chat') {
        STATE.history = [];
        els.messages.innerHTML = '';
        renderEmptyHero();
        return;
    }

    if (data.type === 'user_message') {
        const dedupeKey = `${data.id || ''}:${data.sender || ''}:${(data.content || '').trim()}`;
        if (recentUiMessageKeys.has(dedupeKey)) {
            return;
        }
        recentUiMessageKeys.add(dedupeKey);
        setTimeout(() => recentUiMessageKeys.delete(dedupeKey), 8000);

        hideEmptyHero();
        // Visual indicator in input box if from WhatsApp
        if (data.from_whatsapp && els.userInput) {
            els.userInput.value = data.content;
            setTimeout(() => {
                if (els.userInput && els.userInput.value === data.content) {
                    els.userInput.value = '';
                    els.userInput.style.height = 'auto';
                }
            }, 600);
        }
        addUserMessage(data.content, {
            fromWhatsApp: data.from_whatsapp,
            sender: data.sender
        });
        STATE.history.push({ role: 'user', content: data.content });
        remoteStreamedContent = '';
        activeAiBubble = null;
        showThinking(`Running ${STATE.modelName || 'Gemini 3.8 Flash (High)'} (from WhatsApp DM)...`);
        scrollBottom();
        return;
    }

    if (data.type === 'status') {
        showThinking(data.message || 'Executing your request...');
        return;
    }

    if (data.type === 'delta') {
        removeThinking();
        remoteStreamedContent = (remoteStreamedContent || '') + (data.content || '');
        updateStreamingAiMessage(remoteStreamedContent);
        scrollBottom();
        return;
    }

    if (data.type === 'action') {
        removeThinking();
        if (STATE.safeMode && DANGEROUS_PATTERNS.some(p => p.test(data.command))) {
            addErrorMessage(`Safe Mode blocked dangerous action: \`${data.command}\``);
            return;
        }
        addActionMessage(data.command, data.tool);
        scrollBottom();
        return;
    }

    if (data.type === 'action_result') {
        if (STATE.showOutput) {
            addResultMessage(data.output);
        }
        showThinking('Processing output...');
        scrollBottom();
        return;
    }

    if (data.type === 'memories_saved') {
        addMemorySavedMsg(data.memories);
        return;
    }

    if (data.type === 'final') {
        removeThinking();
        const finalTxt = data.content || remoteStreamedContent || '';
        if (finalTxt && !remoteStreamedContent) {
            updateStreamingAiMessage(finalTxt);
        }
        if (finalTxt) {
            STATE.history.push({ role: 'assistant', content: finalTxt });
        }
        remoteStreamedContent = '';
        activeAiBubble = null;
        scrollBottom();
        return;
    }

    if (data.type === 'error') {
        removeThinking();
        addErrorMessage(data.message || 'Error occurred during execution.');
        remoteStreamedContent = '';
        activeAiBubble = null;
        scrollBottom();
        return;
    }
}

async function loadServerChatHistory() {
    try {
        const res = await fetch('/api/chat/history');
        if (!res.ok) return;
        const history = await res.json();
        if (!Array.isArray(history) || history.length === 0) return;

        hideEmptyHero();
        STATE.history = [];

        for (const item of history) {
            if (item.role === 'user') {
                addUserMessage(item.content, {
                    fromWhatsApp: item.from_whatsapp,
                    sender: item.sender
                });
                STATE.history.push({ role: 'user', content: item.content });
            } else if (item.role === 'assistant') {
                addAiMessage(item.content);
                STATE.history.push({ role: 'assistant', content: item.content });
            }
        }
        scrollBottom();
    } catch (e) {
        console.error('Failed to load chat history:', e);
    }
}
