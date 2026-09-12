/* =============================================
   MODEL CATALOG (Cutting-Edge & Future Era)
   ============================================= */
const MODELS = [
    {
        provider: "🔀 OpenRouter Universal",
        models: [
            { name: "Auto (Best Available)",          id: "openrouter/auto",                    tag: "auto",   tagLabel: "AUTO" },
            { name: "OpenRouter Free Router",         id: "openrouter/free",                    tag: "fast",   tagLabel: "FREE" },
        ]
    },
    {
        provider: "🟤 Anthropic (Claude)",
        models: [
            { name: "Claude 5.1 (Next-Gen Preview)",  id: "anthropic/claude-5.1",               tag: "smart",  tagLabel: "NEXT-GEN" },
            { name: "Claude 4.5 Opus",                id: "anthropic/claude-4.5-opus",          tag: "smart",  tagLabel: "FRONTIER" },
            { name: "Claude 4.5 Sonnet",              id: "anthropic/claude-4.5-sonnet",        tag: "smart",  tagLabel: "SMART" },
            { name: "Claude 3.7 Sonnet (Hybrid)",     id: "anthropic/claude-3.7-sonnet",        tag: "reason", tagLabel: "HYBRID" },
            { name: "Claude 3.7 Sonnet: Thinking",    id: "anthropic/claude-3.7-sonnet:thinking",tag: "reason",tagLabel: "THINK" },
            { name: "Claude 3.5 Sonnet (v2)",         id: "anthropic/claude-3.5-sonnet",        tag: "smart",  tagLabel: "SMART" },
            { name: "Claude 3.5 Haiku",               id: "anthropic/claude-3.5-haiku",         tag: "fast",   tagLabel: "FAST" },
            { name: "Claude 3 Opus",                  id: "anthropic/claude-3-opus",            tag: "long",   tagLabel: "200K" },
        ]
    },
    {
        provider: "🟢 Google (Gemini)",
        models: [
            { name: "Gemini 3.8 Pro (Next-Gen)",      id: "google/gemini-3.8-pro",              tag: "smart",  tagLabel: "3.8 PRO" },
            { name: "Gemini 3.7 Ultra",               id: "google/gemini-3.7-ultra",            tag: "smart",  tagLabel: "3.7 ULTRA" },
            { name: "Gemini 3.0 Flash",               id: "google/gemini-3.0-flash",            tag: "fast",   tagLabel: "3.0 FAST" },
            { name: "Gemini 2.5 Pro Preview",         id: "google/gemini-2.5-pro-preview",      tag: "smart",  tagLabel: "SMART" },
            { name: "Gemini 2.0 Flash Thinking",      id: "google/gemini-2.0-flash-thinking-exp", tag: "reason", tagLabel: "THINK" },
            { name: "Gemini 2.0 Flash (Fast)",        id: "google/gemini-2.0-flash-001",        tag: "fast",   tagLabel: "FAST" },
            { name: "Gemini 2.0 Pro Experimental",    id: "google/gemini-2.0-pro-exp-02-05",    tag: "smart",  tagLabel: "PRO" },
            { name: "Gemini 1.5 Pro (2M Context)",    id: "google/gemini-pro-1.5",              tag: "long",   tagLabel: "2M CTX" },
        ]
    },
    {
        provider: "🟡 OpenAI (GPT & Reasoning)",
        models: [
            { name: "GPT-5 (Next-Gen Preview)",       id: "openai/gpt-5",                       tag: "smart",  tagLabel: "GPT-5" },
            { name: "GPT-4.5 Preview (Orion)",        id: "openai/gpt-4.5-preview",             tag: "smart",  tagLabel: "FLAGSHIP" },
            { name: "o3 (Full Reasoning Engine)",     id: "openai/o3",                          tag: "reason", tagLabel: "REASON" },
            { name: "o3-mini (High Reasoning)",       id: "openai/o3-mini-high",                tag: "reason", tagLabel: "DEEP" },
            { name: "o3-mini",                        id: "openai/o3-mini",                     tag: "reason", tagLabel: "REASON" },
            { name: "o1 Pro (Deep Thinking)",         id: "openai/o1-pro",                      tag: "reason", tagLabel: "O1 PRO" },
            { name: "o1 (Full Reasoning)",            id: "openai/o1",                          tag: "reason", tagLabel: "REASON" },
            { name: "o1-mini",                        id: "openai/o1-mini",                     tag: "fast",   tagLabel: "FAST" },
            { name: "GPT-4o (Latest Omnimodal)",      id: "openai/gpt-4o",                      tag: "smart",  tagLabel: "SMART" },
            { name: "GPT-4o Mini",                    id: "openai/gpt-4o-mini",                 tag: "fast",   tagLabel: "FAST" },
        ]
    },
    {
        provider: "⚫ DeepSeek",
        models: [
            { name: "DeepSeek R2 (Next-Gen Preview)", id: "deepseek/deepseek-r2",               tag: "reason", tagLabel: "R2 NEXT" },
            { name: "DeepSeek R1 (Full Reasoning)",   id: "deepseek/deepseek-r1",               tag: "reason", tagLabel: "REASON" },
            { name: "DeepSeek V3 (671B MoE)",         id: "deepseek/deepseek-chat",             tag: "smart",  tagLabel: "SMART" },
            { name: "DeepSeek Coder V3",              id: "deepseek/deepseek-coder-v3",         tag: "code",   tagLabel: "CODE" },
            { name: "DeepSeek R1 Distill Llama 70B",  id: "deepseek/deepseek-r1-distill-llama-70b", tag: "fast", tagLabel: "FAST" },
            { name: "DeepSeek R1 Distill Qwen 32B",   id: "deepseek/deepseek-r1-distill-qwen-32b", tag: "fast",  tagLabel: "FAST" },
        ]
    },
    {
        provider: "🔴 xAI (Grok)",
        models: [
            { name: "Grok 3 (Next-Gen Preview)",      id: "x-ai/grok-3",                        tag: "smart",  tagLabel: "GROK 3" },
            { name: "Grok 2 (1212)",                  id: "x-ai/grok-2-1212",                   tag: "smart",  tagLabel: "SMART" },
            { name: "Grok 2 Vision",                  id: "x-ai/grok-2-vision-1212",            tag: "vision", tagLabel: "VISION" },
            { name: "Grok Beta",                      id: "x-ai/grok-beta",                     tag: "fast",   tagLabel: "FAST" },
        ]
    },
    {
        provider: "🟣 Meta (Llama)",
        models: [
            { name: "Llama 4 (Next-Gen Preview)",     id: "meta-llama/llama-4",                 tag: "smart",  tagLabel: "LLAMA 4" },
            { name: "Llama 3.3 70B Instruct",         id: "meta-llama/llama-3.3-70b-instruct",  tag: "smart",  tagLabel: "FREE" },
            { name: "Llama 3.1 405B Instruct",        id: "meta-llama/llama-3.1-405b-instruct", tag: "smart",  tagLabel: "405B" },
            { name: "Llama 3.2 90B Vision",           id: "meta-llama/llama-3.2-90b-vision-instruct", tag: "vision", tagLabel: "VISION" },
            { name: "Llama 3.2 11B Vision",           id: "meta-llama/llama-3.2-11b-vision-instruct", tag: "vision", tagLabel: "VISION" },
            { name: "Llama 3.1 8B Instruct",          id: "meta-llama/llama-3.1-8b-instruct",   tag: "fast",   tagLabel: "FAST" },
        ]
    },
    {
        provider: "🟠 Qwen (Alibaba)",
        models: [
            { name: "Qwen 3 (Next-Gen Preview)",      id: "qwen/qwen-3",                        tag: "smart",  tagLabel: "QWEN 3" },
            { name: "QwQ 32B (Reasoning)",            id: "qwen/qwq-32b",                       tag: "reason", tagLabel: "REASON" },
            { name: "Qwen 2.5 Max",                   id: "qwen/qwen-2.5-max",                  tag: "smart",  tagLabel: "MAX" },
            { name: "Qwen 2.5 72B Instruct",          id: "qwen/qwen-2.5-72b-instruct",         tag: "smart",  tagLabel: "SMART" },
            { name: "Qwen 2.5 Coder 32B",             id: "qwen/qwen-2.5-coder-32b-instruct",   tag: "code",   tagLabel: "CODE" },
            { name: "Qwen 2.5 7B Instruct",           id: "qwen/qwen-2.5-7b-instruct",          tag: "fast",   tagLabel: "FAST" },
        ]
    },
    {
        provider: "🔵 Mistral AI",
        models: [
            { name: "Mistral Large 3 (Next-Gen)",     id: "mistralai/mistral-large-3",          tag: "smart",  tagLabel: "LARGE 3" },
            { name: "Mistral Large 2411",             id: "mistralai/mistral-large-2411",       tag: "smart",  tagLabel: "128K" },
            { name: "Pixtral Large (Vision)",         id: "mistralai/pixtral-large-2411",       tag: "vision", tagLabel: "VISION" },
            { name: "Codestral 2501",                 id: "mistralai/codestral-2501",           tag: "code",   tagLabel: "CODE" },
            { name: "Mistral Small 24B",              id: "mistralai/mistral-small-24b-instruct-2501", tag: "fast", tagLabel: "FAST" },
            { name: "Mistral Nemo",                   id: "mistralai/mistral-nemo",             tag: "fast",   tagLabel: "FAST" },
        ]
    },
    {
        provider: "🌐 Perplexity & Research",
        models: [
            { name: "Perplexity Deep Research",       id: "perplexity/sonar-deep-research",     tag: "reason", tagLabel: "RESEARCH" },
            { name: "Perplexity Sonar Reasoning",     id: "perplexity/sonar-reasoning",         tag: "reason", tagLabel: "WEB+R1" },
            { name: "Perplexity Sonar Pro",           id: "perplexity/sonar-pro",               tag: "smart",  tagLabel: "SEARCH" },
            { name: "Perplexity Sonar",               id: "perplexity/sonar",                   tag: "fast",   tagLabel: "FAST" },
        ]
    },
    {
        provider: "⚡ Amazon & Cohere",
        models: [
            { name: "Amazon Nova Premier",            id: "amazon/nova-premier-v1",             tag: "smart",  tagLabel: "PREMIER" },
            { name: "Amazon Nova Pro",                id: "amazon/nova-pro-v1",                 tag: "smart",  tagLabel: "SMART" },
            { name: "Amazon Nova Lite",               id: "amazon/nova-lite-v1",                tag: "fast",   tagLabel: "FAST" },
            { name: "Cohere Command R+ (08-2024)",    id: "cohere/command-r-plus-08-2024",      tag: "smart",  tagLabel: "128K" },
            { name: "Cohere Command R (08-2024)",     id: "cohere/command-r-08-2024",           tag: "fast",   tagLabel: "FAST" },
        ]
    },
];

/* =============================================
   STATE
   ============================================= */
const STATE = {
    user: null,
    googleClientId: localStorage.getItem('willa_google_client_id') || '',
    apiKey: '',
    modelId: '',
    modelName: '',
    history: [],
    autoExec: true,
    safeMode: false,
    showOutput: true,
    streamMode: true,
    provider: localStorage.getItem('ai_provider') || 'openrouter',
    theme: localStorage.getItem('app_theme') || 'light'
};

// Apply theme on load
if (STATE.theme === 'dark') document.body.classList.add('dark-theme');

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
    app: $('app'),
    signinScreen: $('signin-screen'),
    onboardScreen: $('onboarding-screen'),
    settingsOverlay: $('settings-overlay'),

    // Sign-in Screen
    gSigninWrapper: $('g-signin-wrapper'),
    gSigninBtn: $('g-signin-btn'),
    customGoogleSigninBtn: $('custom-google-signin-btn'),
    guestSigninBtn: $('guest-signin-btn'),
    signinStatus: $('signin-status'),

    // User Profile in Sidebar
    sidebarUserSection: $('sidebar-user-section'),
    sidebarUserAvatar: $('sidebar-user-avatar'),
    sidebarUserName: $('sidebar-user-name'),
    sidebarUserEmail: $('sidebar-user-email'),
    signOutBtn: $('sign-out-btn'),

    // Onboarding
    onboardApiKey: $('onboard-api-key'),
    onboardToggleKey: $('onboard-toggle-key'),
    onboardModelList: $('onboard-model-list'),
    onboardSaveBtn: $('onboard-save-btn'),
    onboardProvider: $('onboard-provider'),
    onboardError: $('onboard-error'),

    // Settings modal
    closeSettingsBtn: $('close-settings-btn'),
    apiKeyInput: $('api-key-input'),
    providerSelect: $('provider-select'),
    toggleKeyBtn: $('toggle-key-btn'),
    modelSearch: $('model-search'),
    modalModelList: $('model-list'),
    selectedModelName: $('selected-model-name'),
    googleClientIdInput: $('google-client-id-input'),
    keyStatus: $('key-status'),
    saveSettingsBtn: $('save-settings-btn'),
    resetSettingsBtn: $('reset-settings-btn'),
    waStatusText: $('wa-status-text'),
    waQrImg: $('wa-qr-img'),
    waLinkBtn: $('wa-link-btn'),
    waInstructions: $('wa-instructions'),
    
    // Sidebar / header
    openSettingsBtn: $('open-settings-btn'),
    clearChatBtn: $('clear-chat-btn'),
    sidebarModel: $('sidebar-model'),
    sidebarStatus: $('sidebar-status'),
    headerModelBadge: $('header-model-badge'),
    themeToggle: $('theme-toggle-btn'),
    sidebarToggleBtn: $('sidebar-toggle-btn'),
    appLayout: $('app'),

    // Toggles
    toggleAutoExec: $('toggle-auto-exec'),
    toggleSafeMode: $('toggle-safe-mode'),
    toggleShowOutput: $('toggle-show-output'),
    toggleStream: $('toggle-stream'),

    // Memory panel
    memoryList: $('memory-list'),
    clearMemoriesBtn: $('clear-memories-btn'),

    // Chat
    messagesContainer: $('messages-container'),
    messages: $('chat-messages'),
    userInput: $('user-input'),
    sendBtn: $('send-btn'),
    stopBtn: $('stop-btn'),
    attachBtn: $('attach-btn'),
    fileInput: $('file-input'),
    attachmentBar: $('attachment-bar'),
};

/* =============================================
   BUILD MODEL LIST
   ============================================= */
function buildModelList(container, selectedId, onSelect) {
    container.innerHTML = '';
    MODELS.forEach(group => {
        const header = document.createElement('div');
        header.className = 'model-provider-header';
        header.textContent = group.provider;
        container.appendChild(header);

        group.models.forEach(m => {
            const item = document.createElement('div');
            item.className = 'model-item' + (m.id === selectedId ? ' selected' : '');
            item.dataset.id = m.id;
            item.dataset.name = m.name;
            item.innerHTML = `
                <div class="model-item-info">
                    <span class="model-item-name">${m.name}</span>
                    <span class="model-item-id">${m.id}</span>
                </div>
                <span class="model-tag tag-${m.tag}">${m.tagLabel}</span>
            `;
            item.addEventListener('click', () => {
                container.querySelectorAll('.model-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                onSelect(m.id, m.name);
            });
            container.appendChild(item);
        });
    });
}

/* =============================================
   FILTER MODEL LIST ON SEARCH
   ============================================= */
function filterModels(query, container, selectedId, onSelect) {
    const q = query.toLowerCase();
    container.innerHTML = '';
    MODELS.forEach(group => {
        const filtered = group.models.filter(
            m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
        );
        if (!filtered.length) return;

        const header = document.createElement('div');
        header.className = 'model-provider-header';
        header.textContent = group.provider;
        container.appendChild(header);

        filtered.forEach(m => {
            const item = document.createElement('div');
            item.className = 'model-item' + (m.id === selectedId ? ' selected' : '');
            item.dataset.id = m.id;
            item.dataset.name = m.name;
            item.innerHTML = `
                <div class="model-item-info">
                    <span class="model-item-name">${m.name}</span>
                    <span class="model-item-id">${m.id}</span>
                </div>
                <span class="model-tag tag-${m.tag}">${m.tagLabel}</span>
            `;
            item.addEventListener('click', () => {
                container.querySelectorAll('.model-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                onSelect(m.id, m.name);
            });
            container.appendChild(item);
        });
    });
}

/* =============================================
   AUTHENTICATION SYSTEM (Google OAuth & Session)
   ============================================= */
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

function showSigninStatus(msg, type = 'loading') {
    if (!els.signinStatus) return;
    els.signinStatus.textContent = msg;
    els.signinStatus.className = `signin-status status-${type}`;
    els.signinStatus.classList.remove('hidden');
}

function hideSigninStatus() {
    if (!els.signinStatus) return;
    els.signinStatus.classList.add('hidden');
}

async function handleGoogleCredentialResponse(response) {
    showSigninStatus('Verifying Google credentials...', 'loading');
    try {
        let user = null;
        // Attempt backend token validation
        try {
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.user) user = data.user;
            }
        } catch (apiErr) {
            console.warn('Backend validation call skipped/failed, using client JWT decode:', apiErr);
        }

        // Client-side decode fallback
        if (!user) {
            const payload = parseJwt(response.credential);
            if (payload) {
                user = {
                    id: payload.sub,
                    name: payload.name || payload.given_name || 'Google User',
                    email: payload.email || '',
                    picture: payload.picture || '',
                    given_name: payload.given_name || '',
                    provider: 'google'
                };
            }
        }

        if (!user) {
            throw new Error('Unable to read user profile from Google credential.');
        }

        loginUser(user);
    } catch (err) {
        showSigninStatus('Google Sign-In failed: ' + err.message, 'error');
    }
}

function loginUser(user) {
    STATE.user = user;
    localStorage.setItem('willa_auth_user', JSON.stringify(user));
    hideSigninStatus();
    updateUserProfileUI();
    
    els.signinScreen.classList.add('hidden');

    if (!STATE.apiKey || !STATE.modelId) {
        showOnboarding();
    } else {
        els.app.classList.remove('hidden');
        updateUI();
        syncToggleUI();
        loadMemoryPanel();
    }
    showToast(`👋 Welcome, ${user.name || 'User'}!`);
}

function signOut() {
    STATE.user = null;
    localStorage.removeItem('willa_auth_user');
    els.app.classList.add('hidden');
    els.onboardScreen.classList.add('hidden');
    els.settingsOverlay.classList.add('hidden');
    hideSigninStatus();
    els.signinScreen.classList.remove('hidden');
    showToast('🚪 Signed out successfully.');
}

function updateUserProfileUI() {
    if (!STATE.user) return;
    els.sidebarUserName.textContent = STATE.user.name || 'User';
    els.sidebarUserEmail.textContent = STATE.user.email || 'guest@willa.ai';
    if (STATE.user.picture) {
        els.sidebarUserAvatar.src = STATE.user.picture;
    } else {
        els.sidebarUserAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(STATE.user.name || 'User')}`;
    }
}

function renderGisButton() {
    const clientId = STATE.googleClientId || localStorage.getItem('willa_google_client_id');
    if (clientId && window.google && google.accounts && google.accounts.id) {
        try {
            google.accounts.id.initialize({
                client_id: clientId,
                callback: handleGoogleCredentialResponse,
                auto_select: false
            });
            if (els.gSigninBtn) {
                els.gSigninBtn.innerHTML = '';
                google.accounts.id.renderButton(els.gSigninBtn, {
                    theme: 'filled_blue',
                    size: 'large',
                    width: 320,
                    shape: 'rectangular',
                    text: 'signin_with'
                });
            }
            if (els.customGoogleSigninBtn) {
                els.customGoogleSigninBtn.classList.add('hidden');
            }
            if (els.gSigninWrapper) {
                els.gSigninWrapper.classList.remove('hidden');
            }
            return true;
        } catch (err) {
            console.error('Failed to initialize Google Sign-In button:', err);
        }
    }
    return false;
}

async function initGoogleAuth() {
    // 1. Check backend configuration
    try {
        const res = await fetch('/api/auth/config');
        if (res.ok) {
            const data = await res.json();
            if (data.google_client_id) {
                STATE.googleClientId = data.google_client_id;
                localStorage.setItem('willa_google_client_id', data.google_client_id);
            }
        }
    } catch (e) {
        console.warn('Could not fetch auth config from server', e);
    }

    // 2. Render Google GIS Button if client ID is configured
    if (!renderGisButton()) {
        let attempts = 0;
        const gisInterval = setInterval(() => {
            attempts++;
            if (renderGisButton() || attempts > 20) {
                clearInterval(gisInterval);
            }
        }, 150);
    }

    // 3. Fallback Custom Button Handlers
    els.customGoogleSigninBtn?.addEventListener('click', () => {
        const currentClientId = STATE.googleClientId || localStorage.getItem('willa_google_client_id');
        if (currentClientId && window.google && google.accounts && google.accounts.id) {
            google.accounts.id.prompt();
        } else {
            // Friendly demo sign in with prompt
            const userName = prompt('Enter your name for Google Demo Sign-In (or leave blank for demo user):', 'Demo User');
            if (userName !== null) {
                loginUser({
                    id: 'demo-google-' + Date.now(),
                    name: userName.trim() || 'Demo User',
                    email: `${(userName.trim() || 'demo').toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
                    picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userName || 'GoogleUser')}`,
                    provider: 'google-demo'
                });
            }
        }
    });

    els.guestSigninBtn?.addEventListener('click', () => {
        loginUser({
            id: 'guest',
            name: 'Guest User',
            email: 'guest@willa.ai',
            picture: '',
            provider: 'guest'
        });
    });

    els.signOutBtn?.addEventListener('click', () => {
        if (confirm('Are you sure you want to sign out?')) {
            signOut();
        }
    });
}

/* =============================================
   PERSIST SETTINGS
   ============================================= */
function saveToStorage() {
    localStorage.setItem('willa_ai_key', STATE.apiKey);
    localStorage.setItem('willa_ai_model_id', STATE.modelId);
    localStorage.setItem('willa_ai_model_name', STATE.modelName);
    localStorage.setItem('willa_ai_provider', STATE.provider);
    localStorage.setItem('willa_google_client_id', STATE.googleClientId || '');
    localStorage.setItem('willa_ai_auto_exec',   STATE.autoExec);
    localStorage.setItem('willa_ai_safe_mode',   STATE.safeMode);
    localStorage.setItem('willa_ai_show_output', STATE.showOutput);
    localStorage.setItem('willa_ai_stream',      STATE.streamMode);
    
    // Sync critical config with backend for WhatsApp bot
    fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action_ai_key: STATE.apiKey,
            action_ai_model_id: STATE.modelId,
            action_ai_provider: STATE.provider
        })
    }).catch(e => console.error('Failed to sync config', e));
}

function loadFromStorage() {
    const savedUser = localStorage.getItem('willa_auth_user');
    if (savedUser) {
        try {
            STATE.user = JSON.parse(savedUser);
        } catch (e) {
            STATE.user = null;
        }
    }

    STATE.googleClientId = localStorage.getItem('willa_google_client_id') || '';
    STATE.apiKey     = localStorage.getItem('willa_ai_key') || '';
    STATE.modelId    = localStorage.getItem('willa_ai_model_id') || '';
    STATE.modelName  = localStorage.getItem('willa_ai_model_name') || '';
    STATE.provider   = localStorage.getItem('willa_ai_provider') || 'openrouter';
    STATE.autoExec   = localStorage.getItem('willa_ai_auto_exec')   !== 'false';
    STATE.safeMode   = localStorage.getItem('willa_ai_safe_mode')   === 'true';
    STATE.showOutput = localStorage.getItem('willa_ai_show_output') !== 'false';
    STATE.streamMode = localStorage.getItem('willa_ai_stream')      !== 'false';
}

function syncToggleUI() {
    els.toggleAutoExec.checked   = STATE.autoExec;
    els.toggleSafeMode.checked   = STATE.safeMode;
    els.toggleShowOutput.checked = STATE.showOutput;
    els.toggleStream.checked     = STATE.streamMode;
}

function bindToggles() {
    els.toggleAutoExec.addEventListener('change', () => {
        STATE.autoExec = els.toggleAutoExec.checked;
        saveToStorage();
    });
    els.toggleSafeMode.addEventListener('change', () => {
        STATE.safeMode = els.toggleSafeMode.checked;
        saveToStorage();
        showToast(STATE.safeMode ? '🛡 Safe Mode ON — dangerous commands blocked' : '⚠ Safe Mode OFF');
    });
    els.toggleShowOutput.addEventListener('change', () => {
        STATE.showOutput = els.toggleShowOutput.checked;
        saveToStorage();
    });
    els.toggleStream.addEventListener('change', () => {
        STATE.streamMode = els.toggleStream.checked;
        saveToStorage();
    });
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    Object.assign(toast.style, {
        position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
        background: '#0f172a', color: '#fff', padding: '10px 20px',
        border: '2.5px solid #000', boxShadow: '3px 3px 0 #000',
        fontFamily: 'Space Grotesk, sans-serif', fontWeight: '700',
        fontSize: '13px', zIndex: '999', whiteSpace: 'nowrap',
        transition: 'opacity 0.3s',
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 350); }, 2500);
}

function updateUI() {
    const label = STATE.modelName || STATE.modelId || '—';
    els.sidebarModel.textContent = label;
    els.headerModelBadge.textContent = label;
    updateSidebarStatus(true);
}

function updateSidebarStatus(ok) {
    if (ok) {
        els.sidebarStatus.className = 'status-pill status-ok';
        els.sidebarStatus.textContent = '● Connected';
    } else {
        els.sidebarStatus.className = 'status-pill status-error';
        els.sidebarStatus.textContent = '● API Error';
    }
}

/* =============================================
   ONBOARDING
   ============================================= */
let onboardSelectedId = 'openrouter/auto';
let onboardSelectedName = 'Auto (Best Available)';

function showOnboarding() {
    buildModelList(els.onboardModelList, onboardSelectedId, (id, name) => {
        onboardSelectedId = id;
        onboardSelectedName = name;
    });
    // Pre-scroll to top (auto)
    els.onboardModelList.querySelectorAll('.model-item').forEach(el => {
        if (el.dataset.id === 'openrouter/auto') el.scrollIntoView({ block: 'nearest' });
    });
    els.app.classList.add('hidden');
    els.onboardScreen.classList.remove('hidden');
}

els.onboardToggleKey.addEventListener('click', () => {
    const t = els.onboardApiKey.type === 'password' ? 'text' : 'password';
    els.onboardApiKey.type = t;
    els.onboardToggleKey.textContent = t === 'password' ? '👁' : '🙈';
});

els.onboardSaveBtn.addEventListener('click', () => {
    const key = els.onboardApiKey.value.trim();
    if (!key) {
        showOnboardError('Please enter your OpenRouter API key.');
        return;
    }
    if (!onboardSelectedId) {
        showOnboardError('Please select a model.');
        return;
    }
    STATE.apiKey = key;
    STATE.modelId = onboardSelectedId;
    STATE.modelName = onboardSelectedName;
    STATE.provider = els.onboardProvider.value;
    saveToStorage();
    els.onboardScreen.classList.add('hidden');
    els.app.classList.remove('hidden');
    updateUI();
    syncToggleUI();
    loadMemoryPanel();
});

function showOnboardError(msg) {
    els.onboardError.textContent = msg;
    els.onboardError.classList.remove('hidden');
    setTimeout(() => els.onboardError.classList.add('hidden'), 4000);
}

/* =============================================
   SETTINGS MODAL
   ============================================= */
let settingsSelectedId = '';
let settingsSelectedName = '';

let waPollInterval = null;

async function pollWhatsAppStatus() {
    try {
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();
        
        els.waQrImg.classList.add('hidden');
        els.waLinkBtn.classList.add('hidden');
        els.waInstructions.classList.add('hidden');

        if (data.status === 'connected') {
            els.waStatusText.textContent = '✅ Linked Successfully!';
            els.waStatusText.style.color = 'var(--green)';
        } else if (data.status === 'qr') {
            els.waStatusText.textContent = 'Scan the QR Code to Link';
            els.waStatusText.style.color = 'var(--blue-dark)';
            els.waQrImg.src = `data:image/png;base64,${data.qr_base64}`;
            els.waQrImg.classList.remove('hidden');
            els.waInstructions.classList.remove('hidden');
        } else if (data.status === 'starting') {
            els.waStatusText.textContent = 'Starting WhatsApp service...';
            els.waStatusText.style.color = 'var(--blue-dark)';
        } else {
            els.waStatusText.textContent = 'WhatsApp not linked';
            els.waStatusText.style.color = 'var(--red)';
            els.waLinkBtn.classList.remove('hidden');
        }
    } catch (e) {
        els.waStatusText.textContent = 'Failed to check status';
        els.waLinkBtn.classList.remove('hidden');
    }
}

function openSettings() {
    settingsSelectedId = STATE.modelId;
    settingsSelectedName = STATE.modelName;
    els.apiKeyInput.value = STATE.apiKey;
    els.providerSelect.value = STATE.provider;
    if (els.googleClientIdInput) {
        els.googleClientIdInput.value = STATE.googleClientId || '';
    }
    els.selectedModelName.textContent = STATE.modelName || 'None';
    buildModelList(els.modalModelList, settingsSelectedId, (id, name) => {
        settingsSelectedId = id;
        settingsSelectedName = name;
        els.selectedModelName.textContent = name;
    });
    els.modelSearch.value = '';
    els.keyStatus.classList.add('hidden');
    els.settingsOverlay.classList.remove('hidden');
    
    pollWhatsAppStatus();
    if (waPollInterval) clearInterval(waPollInterval);
    waPollInterval = setInterval(pollWhatsAppStatus, 2000);
}

els.waLinkBtn.addEventListener('click', async () => {
    els.waLinkBtn.classList.add('hidden');
    els.waStatusText.textContent = 'Starting WhatsApp service...';
    try {
        await fetch('/api/whatsapp/start', { method: 'POST' });
        pollWhatsAppStatus();
    } catch (e) {
        console.error(e);
    }
});

els.openSettingsBtn.addEventListener('click', openSettings);

els.closeSettingsBtn.addEventListener('click', () => {
    els.settingsOverlay.classList.add('hidden');
    if (waPollInterval) clearInterval(waPollInterval);
});

els.settingsOverlay.addEventListener('click', e => {
    if (e.target === els.settingsOverlay) {
        els.settingsOverlay.classList.add('hidden');
        if (waPollInterval) clearInterval(waPollInterval);
    }
});

els.toggleKeyBtn.addEventListener('click', () => {
    const t = els.apiKeyInput.type === 'password' ? 'text' : 'password';
    els.apiKeyInput.type = t;
    els.toggleKeyBtn.textContent = t === 'password' ? '👁' : '🙈';
});

els.modelSearch.addEventListener('input', () => {
    filterModels(els.modelSearch.value, els.modalModelList, settingsSelectedId, (id, name) => {
        settingsSelectedId = id;
        settingsSelectedName = name;
        els.selectedModelName.textContent = name;
    });
});

els.saveSettingsBtn.addEventListener('click', () => {
    const key = els.apiKeyInput.value.trim();
    if (!key) {
        showKeyStatus('API key cannot be empty.', false);
        return;
    }
    if (!settingsSelectedId) {
        showKeyStatus('Please select a model.', false);
        return;
    }
    STATE.apiKey = key;
    STATE.modelId = settingsSelectedId;
    STATE.modelName = settingsSelectedName;
    STATE.provider = els.providerSelect.value;
    if (els.googleClientIdInput) {
        STATE.googleClientId = els.googleClientIdInput.value.trim();
    }
    saveToStorage();
    updateUI();
    showKeyStatus('Settings saved!', true);
    setTimeout(() => els.settingsOverlay.classList.add('hidden'), 900);
});

function showKeyStatus(msg, ok) {
    els.keyStatus.textContent = msg;
    els.keyStatus.className = 'key-status ' + (ok ? 'ok' : 'err');
    els.keyStatus.classList.remove('hidden');
    setTimeout(() => els.keyStatus.classList.add('hidden'), 3500);
}

/* =============================================
   CHAT RENDERING (Minimal Claude/ChatGPT style)
   ============================================= */
function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderMarkdown(text) {
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

function hideEmptyHero() {
    const hero = document.getElementById('empty-state-hero');
    if (hero) hero.remove();
}

function renderEmptyHero() {
    if (STATE.history.length === 0) {
        els.messages.innerHTML = `
            <div class="empty-state-hero" id="empty-state-hero">
                <div class="hero-icon-bubble">W</div>
                <h2 class="hero-heading">What can I do for you today?</h2>
                <p class="hero-subtext">Ask a question or request tasks to run on your terminal environment.</p>
                <div class="quick-prompts-grid">
                    <div class="quick-prompt-card" data-prompt="Show me my current CPU, RAM, and disk usage">
                        <span class="prompt-card-title">📊 System Health</span>
                        <span class="prompt-card-desc">Show CPU, RAM, and disk usage</span>
                    </div>
                    <div class="quick-prompt-card" data-prompt="List all files in the current workspace with details">
                        <span class="prompt-card-title">📁 Explore Files</span>
                        <span class="prompt-card-desc">List files in detail</span>
                    </div>
                    <div class="quick-prompt-card" data-prompt="Show top 10 running processes sorted by memory">
                        <span class="prompt-card-title">⚡ Process Monitor</span>
                        <span class="prompt-card-desc">Top memory & CPU processes</span>
                    </div>
                    <div class="quick-prompt-card" data-prompt="What is my current local IP address and network status?">
                        <span class="prompt-card-title">🌐 Network Info</span>
                        <span class="prompt-card-desc">Check network interfaces & IP</span>
                    </div>
                </div>
            </div>
        `;
        // Attach click listeners to prompt cards
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

function addUserMessage(text) {
    hideEmptyHero();
    const div = document.createElement('div');
    div.className = 'message user-message';
    div.innerHTML = `
        <div class="msg-content-wrap">
            <div class="msg-bubble">${escapeHtml(text)}</div>
        </div>
        <div class="msg-avatar">U</div>
    `;
    els.messages.appendChild(div);
    scrollBottom();
}

function addAiMessage(text) {
    hideEmptyHero();
    const div = document.createElement('div');
    div.className = 'message ai-message';
    div.innerHTML = `
        <div class="msg-avatar">W</div>
        <div class="msg-content-wrap">
            <div class="msg-bubble">${renderMarkdown(text)}</div>
        </div>
    `;
    els.messages.appendChild(div);
    scrollBottom();
}

function addActionMessage(cmd) {
    hideEmptyHero();
    const div = document.createElement('div');
    div.className = 'message ai-message';
    div.innerHTML = `
        <div class="msg-avatar">W</div>
        <div class="msg-content-wrap" style="width: 100%;">
            <div class="action-card">
                <div class="action-card-header">
                    <span class="action-badge">⚡ Executing Command</span>
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
        <div class="msg-avatar" style="visibility: hidden;">W</div>
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
        <div class="msg-avatar" style="background: var(--red-light); color: var(--red);">⚠</div>
        <div class="msg-content-wrap">
            <div class="msg-bubble" style="background: var(--red-light); color: var(--red-text); border: 1px solid rgba(239, 68, 68, 0.2);">
                ${escapeHtml(msg)}
                ${(msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('invalid')) ? '<br><button onclick="openSettings()" style="margin-top:6px; background:none; border:none; color:inherit; text-decoration:underline; cursor:pointer; font-weight:600;">Open Settings →</button>' : ''}
            </div>
        </div>
    `;
    els.messages.appendChild(div);
    scrollBottom();
    updateSidebarStatus(false);
}

let thinkingEl = null;
function showThinking() {
    removeThinking();
    thinkingEl = document.createElement('div');
    thinkingEl.className = 'message ai-message';
    thinkingEl.id = 'thinking-row';
    thinkingEl.innerHTML = `
        <div class="msg-avatar">W</div>
        <div class="msg-content-wrap">
            <div class="thinking-bubble">
                <span class="pulse-dot"></span>
                <span>Thinking...</span>
            </div>
        </div>
    `;
    els.messages.appendChild(thinkingEl);
    scrollBottom();
}

function removeThinking() {
    const el = document.getElementById('thinking-row');
    if (el) el.remove();
    thinkingEl = null;
}

function scrollBottom() {
    if (els.messagesContainer) {
        els.messagesContainer.scrollTop = els.messagesContainer.scrollHeight;
    } else {
        els.messages.scrollTop = els.messages.scrollHeight;
    }
}

/* =============================================
   MEMORY PANEL
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
    els.memoryList.innerHTML = '';
    const keys = Object.keys(memories);
    if (!keys.length) {
        els.memoryList.innerHTML = '<span class="memory-empty">No memories yet</span>';
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
            <button class="memory-chip-del" data-key="${escapeHtml(key)}" title="Forget this">✕</button>
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

els.clearMemoriesBtn.addEventListener('click', async () => {
    if (!confirm('Clear ALL memories? The AI will forget everything about you.')) return;
    try {
        await fetch('/api/memories', { method: 'DELETE' });
        loadMemoryPanel();
        showToast('🧠 All memories cleared');
    } catch (_) {}
});

function addMemorySavedMsg(memories) {
    const keys = memories.map(m => m.key).join(', ');
    const div = document.createElement('div');
    div.className = 'memory-saved-msg';
    div.textContent = `🧠 Remembered: ${keys}`;
    els.messages.appendChild(div);
    scrollBottom();
    // Reload sidebar panel
    loadMemoryPanel();
}

/* =============================================
   SIDEBAR TOGGLE
   ============================================= */
els.sidebarToggleBtn.addEventListener('click', () => {
    els.appLayout.classList.toggle('sidebar-hidden');
    const hidden = els.appLayout.classList.contains('sidebar-hidden');
    els.sidebarToggleBtn.textContent = hidden ? '▶' : '☰';
    els.sidebarToggleBtn.title = hidden ? 'Show Sidebar' : 'Hide Sidebar';
    localStorage.setItem('willa_ai_sidebar_hidden', hidden);
});

/* =============================================
   FILE ATTACHMENTS
   ============================================= */
const ATTACHMENTS = []; // [{name, type, content}]

els.attachBtn.addEventListener('click', () => els.fileInput.click());

els.fileInput.addEventListener('change', () => {
    const files = Array.from(els.fileInput.files);
    files.forEach(file => {
        const reader = new FileReader();
        const isText = file.type.startsWith('text/') ||
            /\.(md|json|py|js|ts|html|css|sh|yaml|yml|txt|csv|xml|toml|ini|conf|log)$/i.test(file.name);
        const isImage = file.type.startsWith('image/');

        reader.onload = (e) => {
            let content;
            if (isImage) {
                content = `[Image attached: ${file.name} — describe what you see and use it as context]\nData: ${e.target.result}`;
            } else if (isText) {
                const truncated = e.target.result.slice(0, 8000);
                content = `[File: ${file.name}]\n\`\`\`\n${truncated}${e.target.result.length > 8000 ? '\n...(truncated)' : ''}\n\`\`\``;
            } else {
                content = `[Binary file attached: ${file.name} (${file.type || 'unknown type'}, ${(file.size/1024).toFixed(1)}KB) — acknowledge this file was attached]`;
            }
            ATTACHMENTS.push({ name: file.name, type: isImage ? 'image' : isText ? 'text' : 'binary', content });
            renderAttachmentBar();
        };
        if (isImage) reader.readAsDataURL(file);
        else reader.readAsText(file);
    });
    els.fileInput.value = ''; // reset so same file can be re-added
});

function renderAttachmentBar() {
    if (!els.attachmentBar) return;
    els.attachmentBar.innerHTML = '';
    if (!ATTACHMENTS.length) {
        els.attachmentBar.classList.add('hidden');
        return;
    }
    els.attachmentBar.classList.remove('hidden');
    ATTACHMENTS.forEach((att, idx) => {
        const icon = att.type === 'image' ? '🖼' : att.type === 'text' ? '📄' : '📦';
        const chip = document.createElement('div');
        chip.className = 'attachment-chip';
        chip.innerHTML = `
            <span>${icon}</span>
            <span class="attachment-chip-name">${escapeHtml(att.name)}</span>
            <button class="attachment-chip-remove" data-idx="${idx}" title="Remove">✕</button>
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
   SEND MESSAGE
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

    // Guard: check settings
    if (!STATE.apiKey) {
        openSettings();
        return;
    }
    if (!STATE.modelId) {
        openSettings();
        return;
    }

    const fullText = buildMessageWithAttachments(text);
    // Clear attachment state
    ATTACHMENTS.length = 0;
    renderAttachmentBar();
    els.userInput.value = '';
    addUserMessage(text);
    STATE.history.push({ role: 'user', content: fullText });

    abortController = new AbortController();
    setSending(true);
    showThinking();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: STATE.history,
                api_key: STATE.apiKey,
                model: STATE.modelId,
                provider: STATE.provider
            }),
            signal: abortController.signal,
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
        let finalContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep incomplete line

            for (const line of lines) {
                if (!line.trim()) continue;
                let data;
                try { data = JSON.parse(line); } catch (_) { continue; }

                if (data.type === 'status') {
                    showThinking();
                } else if (data.type === 'memories_saved') {
                    addMemorySavedMsg(data.memories);
                } else if (data.type === 'action') {
                    removeThinking();
                    // Safe mode check
                    if (STATE.safeMode && DANGEROUS_PATTERNS.some(p => p.test(data.command))) {
                        addErrorMessage(`🛡 Safe Mode blocked: \`${data.command}\` — looks dangerous. Disable Safe Mode in the sidebar to allow it.`);
                        break;
                    }
                    addActionMessage(data.command);
                } else if (data.type === 'action_result') {
                    if (STATE.showOutput) addResultMessage(data.output);
                    showThinking();
                } else if (data.type === 'final') {
                    removeThinking();
                    finalContent = data.content;
                    addAiMessage(data.content);
                    updateSidebarStatus(true);
                } else if (data.type === 'error') {
                    removeThinking();
                    addErrorMessage(data.message);
                    updateSidebarStatus(false);
                }
            }
        }

        if (finalContent) {
            STATE.history.push({ role: 'assistant', content: finalContent });
        }

    } catch (err) {
        removeThinking();
        if (err.name === 'AbortError') {
            addErrorMessage('⏹ Generation stopped by user.');
        } else {
            addErrorMessage(`Network error: ${err.message}. Is the server running?`);
        }
    } finally {
        abortController = null;
        setSending(false);
        els.userInput.focus();
    }
}

/* =============================================
   CLEAR CHAT / NEW CHAT
   ============================================= */
els.clearChatBtn.addEventListener('click', () => {
    STATE.history = [];
    renderEmptyHero();
    updateSidebarStatus(true);
    showToast('✨ Started a new chat');
});


// =============================================
// INITIALIZATION & THEME (wrapped in DOMContentLoaded)
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    els.themeToggle?.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        STATE.theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        localStorage.setItem('app_theme', STATE.theme);
    });
    
    els.headerModelBadge?.addEventListener('click', openSettings);
    els.sidebarModel?.addEventListener('click', openSettings);

    els.sendBtn.addEventListener('click', sendMessage);
    els.stopBtn.addEventListener('click', () => {
        if (abortController) abortController.abort();
    });
    els.userInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    // Auto-grow textarea
    els.userInput.addEventListener('input', () => {
        els.userInput.style.height = 'auto';
        els.userInput.style.height = Math.min(els.userInput.scrollHeight, 160) + 'px';
    });
    // Onboarding provider change refreshes model list
    els.onboardProvider.addEventListener('change', () => {
        buildModelList(els.onboardModelList, onboardSelectedId, (id, name) => {
            onboardSelectedId = id;
            onboardSelectedName = name;
        });
    });

    /* =============================================
       INIT
       ============================================= */
    loadFromStorage();
    bindToggles();
    initGoogleAuth();

    if (!STATE.user) {
        // Show Sign-in screen first for new / unauthenticated users
        els.signinScreen.classList.remove('hidden');
        els.app.classList.add('hidden');
        els.onboardScreen.classList.add('hidden');
    } else {
        // User is logged in
        els.signinScreen.classList.add('hidden');
        updateUserProfileUI();

        if (!STATE.apiKey || !STATE.modelId) {
            showOnboarding();
        } else {
            els.app.classList.remove('hidden');
            updateUI();
            syncToggleUI();
            loadMemoryPanel();
            renderEmptyHero();
            // Restore sidebar state
            if (localStorage.getItem('willa_ai_sidebar_hidden') === 'true') {
                els.app.classList.add('sidebar-hidden');
                els.sidebarToggleBtn.textContent = '▶';
                els.sidebarToggleBtn.title = 'Show Sidebar';
            }
        }
    }

    els.resetSettingsBtn.addEventListener('click', () => {
        if(confirm('Reset all settings?')) {
            localStorage.clear();
            location.reload();
        }
    });
});

