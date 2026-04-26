/* =============================================
   MODEL CATALOG
   ============================================= */
const MODELS = [
    {
        provider: "🔀 OpenRouter",
        models: [
            { name: "Auto (Best Available)", id: "openrouter/auto", tag: "auto", tagLabel: "AUTO" },
        ]
    },
    {
        provider: "🟤 Anthropic",
        models: [
            { name: "Claude Opus 4.5",    id: "anthropic/claude-opus-4-5",       tag: "smart", tagLabel: "SMART" },
            { name: "Claude Sonnet 4.5",  id: "anthropic/claude-sonnet-4-5",     tag: "smart", tagLabel: "SMART" },
            { name: "Claude Haiku 3.5",   id: "anthropic/claude-haiku-3-5",      tag: "fast",  tagLabel: "FAST"  },
            { name: "Claude 3 Opus",      id: "anthropic/claude-3-opus",         tag: "long",  tagLabel: "128K"  },
        ]
    },
    {
        provider: "🟢 Google",
        models: [
            { name: "Gemini 2.5 Pro",       id: "google/gemini-2.5-pro-preview",  tag: "smart", tagLabel: "SMART" },
            { name: "Gemini 2.0 Flash",     id: "google/gemini-2.0-flash-001",    tag: "fast",  tagLabel: "FAST"  },
            { name: "Gemini 1.5 Pro",       id: "google/gemini-pro-1.5",          tag: "long",  tagLabel: "1M CTX"},
            { name: "Gemini 1.5 Flash",     id: "google/gemini-flash-1.5",        tag: "fast",  tagLabel: "FAST"  },
        ]
    },
    {
        provider: "🟡 OpenAI",
        models: [
            { name: "GPT-4o",              id: "openai/gpt-4o",                   tag: "smart", tagLabel: "SMART" },
            { name: "GPT-4o Mini",         id: "openai/gpt-4o-mini",              tag: "fast",  tagLabel: "FAST"  },
            { name: "o3 Mini",             id: "openai/o3-mini",                  tag: "smart", tagLabel: "REASON"},
            { name: "o1",                  id: "openai/o1",                       tag: "smart", tagLabel: "REASON"},
            { name: "GPT-4 Turbo",         id: "openai/gpt-4-turbo",              tag: "long",  tagLabel: "128K"  },
        ]
    },
    {
        provider: "🟣 Meta (Llama)",
        models: [
            { name: "Llama 3.3 70B",       id: "meta-llama/llama-3.3-70b-instruct", tag: "fast", tagLabel: "FREE" },
            { name: "Llama 3.1 405B",      id: "meta-llama/llama-3.1-405b-instruct",tag: "smart",tagLabel: "SMART"},
            { name: "Llama 3.1 8B",        id: "meta-llama/llama-3.1-8b-instruct",  tag: "fast", tagLabel: "FAST" },
        ]
    },
    {
        provider: "🔵 Mistral",
        models: [
            { name: "Mistral Large",       id: "mistralai/mistral-large",            tag: "smart", tagLabel: "SMART"},
            { name: "Mistral Nemo",        id: "mistralai/mistral-nemo",             tag: "fast",  tagLabel: "FAST" },
            { name: "Mixtral 8x7B",        id: "mistralai/mixtral-8x7b-instruct",    tag: "fast",  tagLabel: "MoE"  },
        ]
    },
    {
        provider: "⚫ DeepSeek",
        models: [
            { name: "DeepSeek R1",         id: "deepseek/deepseek-r1",               tag: "smart", tagLabel: "REASON"},
            { name: "DeepSeek R1 Distill", id: "deepseek/deepseek-r1-distill-llama-70b", tag: "fast", tagLabel: "FAST"},
            { name: "DeepSeek Chat V3",    id: "deepseek/deepseek-chat-v3-0324",     tag: "smart", tagLabel: "SMART"},
        ]
    },
];

/* =============================================
   STATE
   ============================================= */
const STATE = {
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
    onboardScreen: $('onboarding-screen'),
    settingsOverlay: $('settings-overlay'),

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
    messages: $('chat-messages'),
    userInput: $('user-input'),
    sendBtn: $('send-btn'),
    sendLabel: $('send-label'),
    sendLoader: $('send-loader'),
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
   PERSIST SETTINGS
   ============================================= */
function saveToStorage() {
    localStorage.setItem('willa_ai_key', STATE.apiKey);
    localStorage.setItem('willa_ai_model_id', STATE.modelId);
    localStorage.setItem('willa_ai_model_name', STATE.modelName);
    localStorage.setItem('willa_ai_provider', STATE.provider);
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
    STATE.apiKey     = localStorage.getItem('willa_ai_key') || '';
    STATE.modelId    = localStorage.getItem('willa_ai_model_id') || '';
    STATE.modelName  = localStorage.getItem('willa_ai_model_name') || '';
    STATE.provider   = localStorage.getItem('willa_ai_provider') || 'openrouter';
    STATE.autoExec   = localStorage.getItem('willa_ai_auto_exec')   !== 'false';
    STATE.safeMode   = localStorage.getItem('willa_ai_safe_mode')   === 'true';
    STATE.showOutput = localStorage.getItem('willa_ai_show_output') !== 'false';
    STATE.streamMode = localStorage.getItem('willa_ai_stream')      !== 'false';
    
    // Initial sync on load if we have keys
    if (STATE.apiKey) {
        saveToStorage();
        els.app.classList.remove('hidden');
    } else {
        // Show onboarding if no API key
        els.onboardScreen.classList.remove('hidden');
        els.app.classList.add('hidden');
    }
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
   CHAT RENDERING
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

function addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'message user-message brutal-box';
    div.innerHTML = `<span class="msg-label">You</span><div class="msg-body">${escapeHtml(text)}</div>`;
    els.messages.appendChild(div);
    scrollBottom();
}

function addAiMessage(text) {
    const div = document.createElement('div');
    div.className = 'message ai-message brutal-box';
    div.innerHTML = `<span class="msg-label">Action AI</span><div class="msg-body">${renderMarkdown(text)}</div>`;
    els.messages.appendChild(div);
    scrollBottom();
}

function addActionMessage(cmd) {
    const div = document.createElement('div');
    div.className = 'message ai-message brutal-box action-msg';
    div.innerHTML = `
        <span class="msg-label">🛠 ACTION</span>
        <div class="msg-body"><code>${escapeHtml(cmd)}</code></div>
    `;
    els.messages.appendChild(div);
    scrollBottom();
}

function addResultMessage(output) {
    const div = document.createElement('div');
    div.className = 'message ai-message brutal-box result-msg';
    div.innerHTML = `
        <span class="msg-label">📊 RESULT</span>
        <div class="msg-body"><pre>${escapeHtml(output)}</pre></div>
    `;
    els.messages.appendChild(div);
    scrollBottom();
}

function addErrorMessage(msg) {
    const div = document.createElement('div');
    div.className = 'error-message';
    div.innerHTML = `⚠ ${escapeHtml(msg)}`;
    if (msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('invalid')) {
        div.innerHTML += ` <button onclick="openSettings()" style="margin-left:10px;text-decoration:underline;background:none;border:none;cursor:pointer;font-weight:700;color:inherit;">Open Settings →</button>`;
    }
    els.messages.appendChild(div);
    scrollBottom();
    updateSidebarStatus(false);
}

let thinkingEl = null;
function showThinking() {
    removeThinking();
    thinkingEl = document.createElement('div');
    thinkingEl.className = 'thinking-row';
    thinkingEl.id = 'thinking-row';
    thinkingEl.innerHTML = `<div class="spinner"></div> Thinking...`;
    els.messages.appendChild(thinkingEl);
    scrollBottom();
}
function removeThinking() {
    const el = document.getElementById('thinking-row');
    if (el) el.remove();
    thinkingEl = null;
}

function scrollBottom() {
    els.messages.scrollTop = els.messages.scrollHeight;
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
    localStorage.setItem('action_ai_sidebar_hidden', hidden);
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
    els.attachBtn.disabled = busy;
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
   CLEAR CHAT
   ============================================= */
els.clearChatBtn.addEventListener('click', () => {
    STATE.history = [];
    els.messages.innerHTML = `
        <div class="message ai-message brutal-box">
            <span class="msg-label">WillaAI</span>
            <div class="msg-body">Chat cleared. Ready for a new task!</div>
        </div>
    `;
    updateSidebarStatus(true);
});

// =============================================
// INITIALIZATION & THEME
// =============================================
els.themeToggle?.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    STATE.theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('app_theme', STATE.theme);
});
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

/* =============================================
   INIT
   ============================================= */
loadFromStorage();
bindToggles();

if (!STATE.apiKey || !STATE.modelId) {
    showOnboarding();
} else {
    els.app.classList.remove('hidden');
    updateUI();
    syncToggleUI();
    loadMemoryPanel();
    // Restore sidebar state
    if (localStorage.getItem('willa_ai_sidebar_hidden') === 'true') {
        els.app.classList.add('sidebar-hidden');
        els.sidebarToggleBtn.textContent = '▶';
        els.sidebarToggleBtn.title = 'Show Sidebar';
    }
}

els.resetSettingsBtn.addEventListener('click', () => {
    if(confirm('Reset all settings?')) {
        localStorage.clear();
        location.reload();
    }
});
