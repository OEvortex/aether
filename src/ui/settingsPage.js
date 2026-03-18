/* Copilot ++ Settings Page - JavaScript */

// VS Code API
const vscode = acquireVsCodeApi();

// State management
let settingsState = {
    providers: [],
    uiPreferences: {
        hideThinkingInUI: false,
    },
    providerSearchQuery: "",
    loading: true,
};
const pendingApiKeyRemovals = new Set();

// Available load balance strategies
const LOAD_BALANCE_STRATEGIES = [
    {
        id: "round-robin",
        name: "Round Robin",
        description: "Distribute requests evenly across accounts",
    },
    {
        id: "quota-aware",
        name: "Quota Aware",
        description: "Prioritize accounts with more remaining quota",
    },
    {
        id: "failover",
        name: "Failover Only",
        description: "Use primary account, switch on errors",
    },
];

/**
 * Initialize the settings page
 */
function _initializeSettingsPage(initialData) {
    settingsState = {
        ...settingsState,
        ...initialData,
        loading: false,
    };
    renderPage();
}

/**
 * Render the entire page
 */
function renderPage() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
        ${renderHeader()}
        ${renderProviderManagementSection()}
        ${renderAdvancedSection()}
        ${renderUiPreferencesSection()}
        ${renderInfoSection()}
    `;

    attachEventListeners();
}

function renderProviderManagementSection() {
    const providerCatalogSection = renderProviderCatalogSection();

    return `
        <div class="settings-section">
            <h2 class="section-title">
                🧩 Provider Configuration
                <span class="badge">Unified</span>
            </h2>
            <p class="section-summary">
                Configure provider settings, API keys, and load balancing directly in each provider card.
            </p>
            ${providerCatalogSection}
        </div>
    `;
}

/**
 * Render header section
 */
function renderHeader() {
    const providers = settingsState.providers || [];
    const configuredProviders = providers.filter(isProviderConfigured).length;
    const activeLoadBalanceCount = providers.filter((provider) =>
        Boolean(provider.loadBalanceEnabled),
    ).length;

    return `
        <div class="settings-header">
				<div class="settings-header-main">
					<div>
			            <h1>
		                	<span class="icon">✨</span>
		                	Copilot ++ Settings
		            </h1>
		            <p>Manage provider setup, accounts, and load balancing from one smoother settings page.</p>
					</div>
					<div class="header-stats">
						${renderHeaderStat("Providers", providers.length)}
						${renderHeaderStat("Configured", configuredProviders)}
						${renderHeaderStat("Load Balance", activeLoadBalanceCount)}
					</div>
				</div>
        </div>
    `;
}

function renderHeaderStat(label, value) {
    return `
		<div class="header-stat">
			<span class="header-stat-value">${escapeHtml(String(value))}</span>
			<span class="header-stat-label">${escapeHtml(label)}</span>
		</div>
	`;
}

function isProviderConfigured(provider) {
    if ((provider.accountCount || 0) > 0) {
        return true;
    }

    return (provider.settingsFields || []).some((field) => {
        if (field.type === "boolean") {
            return field.value === true;
        }

        return String(field.value ?? "").trim().length > 0;
    });
}

function renderProviderCatalogSection() {
    const providers = settingsState.providers || [];
    const query = (settingsState.providerSearchQuery || "").trim().toLowerCase();
    const filteredProviders = providers.filter((provider) => {
        if (!query) {
            return true;
        }
        return (
            provider.id.toLowerCase().includes(query) ||
            provider.displayName.toLowerCase().includes(query) ||
            (provider.description || "").toLowerCase().includes(query)
        );
    });

    const grouped = groupProvidersByCategory(filteredProviders);
    const hasResults = filteredProviders.length > 0;
    const resultSummary =
        filteredProviders.length === providers.length
            ? `${providers.length} providers`
            : `${filteredProviders.length} of ${providers.length} providers`;

    return `
        <div class="provider-subsection">
            <div class="provider-catalog-toolbar">
				<div class="search-shell">
					<span class="search-icon">⌕</span>
	                <input
	                    class="provider-search-input"
	                    id="provider-search-input"
	                    type="text"
	                    placeholder="Search provider by name, id, or description"
	                    value="${escapeHtml(settingsState.providerSearchQuery || "")}" />
				</div>
				<div class="toolbar-meta">${escapeHtml(resultSummary)}</div>
            </div>
            ${hasResults
            ? Object.entries(grouped)
                .map(
                    ([category, categoryProviders]) => `
                    <div class="provider-category-group">
                        <h3 class="provider-category-title">${getCategoryLabel(category)}</h3>
                        <div class="provider-list-grid">
                            ${categoryProviders.map((provider) => renderProviderCatalogItem(provider)).join("")}
                        </div>
                    </div>
                `,
                )
                .join("")
            : `<div class="empty-state compact"><p>No providers match your search.</p></div>`
        }
        </div>
    `;
}

function renderProviderCatalogItem(provider) {
    const accountCount = provider.accountCount || 0;
    const capabilityBadges = [
        provider.supportsApiKey ? "API Key" : null,
        provider.supportsOAuth ? "OAuth" : null,
        (provider.settingsFields || []).length ? "Settings" : null,
        provider.supportsLoadBalance ? "Load Balance" : null,
    ]
        .filter(Boolean)
        .map((badge) => `<span class="account-badge">${badge}</span>`)
        .join("");
    const setupBadge = isProviderConfigured(provider)
        ? '<span class="account-badge success">Configured</span>'
        : '<span class="account-badge warning">Setup needed</span>';
    const compatiblePanel =
        provider.id === "compatible"
            ? renderCompatibleProviderPanel(provider)
            : "";

    return `
        <div class="provider-catalog-item" data-provider-item="${provider.id}">
            <div class="provider-catalog-head">
                <div class="provider-title-wrap">
					<div class="provider-icon">${escapeHtml(provider.icon || "🤖")}</div>
                    <div>
                        <h4>${escapeHtml(provider.displayName)}</h4>
						<p>${escapeHtml(provider.description || "AI model provider")}</p>
                    </div>
                </div>
				<div class="provider-head-badges">
					<span class="account-badge">👤 ${accountCount}</span>
					${setupBadge}
				</div>
            </div>
            ${compatiblePanel}
            <div class="provider-capabilities">${capabilityBadges}</div>
			${renderProviderEditor(provider)}
            <div class="provider-actions">
                <button class="action-button secondary compact" onclick="openProviderSettings('${provider.id}')">
                    Open Settings
                </button>
                ${provider.supportsConfigWizard
            ? `<button class="action-button compact" onclick="runProviderWizard('${provider.id}')">Run Wizard</button>`
            : ""
        }
            </div>
        </div>
    `;
}

function renderCompatibleProviderPanel(provider) {
    const customModelCount = provider.customModelCount || 0;
    const countLabel =
        customModelCount > 0
            ? `${customModelCount} custom model${customModelCount === 1 ? "" : "s"}`
            : "No custom models yet";

    return `
        <div class="compatible-hero-panel">
            <div class="compatible-hero-copy">
                <span class="section-kicker">Featured provider</span>
                <h4>OpenAI / Anthropic Compatible</h4>
                <p>
                    Add your own OpenAI-style or Anthropic-style endpoints, then create models with a direct quick-add flow.
                </p>
                <div class="compatible-hero-meta">
                    <span class="account-badge success">${escapeHtml(countLabel)}</span>
                    <span class="account-badge">Fast setup</span>
                </div>
            </div>
            <div class="compatible-hero-actions">
                <button class="action-button" onclick="createCompatibleModel()">
                    + Add custom model
                </button>
                <button class="action-button secondary" onclick="manageCompatibleModels()">
                    Manage models
                </button>
            </div>
        </div>
    `;
}

function renderProviderEditor(provider) {
    const settingsFields = Array.isArray(provider.settingsFields)
        ? provider.settingsFields
            .map((field) => renderProviderSettingField(provider.id, field))
            .join("")
        : "";

    const loadBalanceSection = renderProviderLoadBalanceSection(provider);

    // Render multiple API keys section
    const apiKeysSection = provider.supportsApiKey
        ? renderApiKeysSection(provider)
        : "";

    const saveButton =
        (provider.settingsFields || []).length
            ? `
			<div class="provider-editor-actions">
				<button class="action-button compact" onclick="saveProviderSettings('${provider.id}')">
						Save changes
				</button>
			</div>
		`
            : "";

    return `
		<div class="provider-editor-grid" data-provider-editor="${provider.id}">
			${loadBalanceSection}
			${apiKeysSection}
				${settingsFields}
			${saveButton}
		</div>
	`;
}

function renderProviderLoadBalanceSection(provider) {
    if (!provider.supportsLoadBalance) {
        return "";
    }

    const accountCount = provider.accountCount || 0;
    const canEnable = accountCount >= 2;
    const isEnabled = Boolean(provider.loadBalanceEnabled) && canEnable;
    const currentStrategy = provider.loadBalanceStrategy || "round-robin";

    return `
        <div class="provider-lb-section ${isEnabled ? "enabled" : "disabled"}">
            <div class="provider-lb-header">
                <div>
                    <span class="section-kicker">Load balancing</span>
                    <h4>Distribute traffic across accounts</h4>
                </div>
                <label class="toggle-switch small">
                    <input type="checkbox"
                           id="toggle-lb-${provider.id}"
                           ${isEnabled ? "checked" : ""}
                           ${!canEnable ? "disabled" : ""}
                           onchange="handleToggleChange('${provider.id}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="provider-lb-meta">
                <span class="account-badge ${canEnable ? "success" : "warning"}">
                    ${canEnable ? "Ready" : "Need 2+ accounts"}
                </span>
                <span class="provider-lb-hint">
                    ${canEnable
            ? "Turn this on to spread requests across active API key accounts."
            : "Add at least two API key accounts to unlock load balancing."}
                </span>
            </div>
            ${isEnabled
            ? renderStrategySelector(provider.id, currentStrategy)
            : ""}
        </div>
    `;
}

function getProviderSettingInputId(providerId, settingKey) {
    return `provider-setting-${providerId}-${settingKey}`;
}

function renderProviderSettingField(providerId, field) {
    const inputId = getProviderSettingInputId(providerId, field.key);
    const description = field.description
        ? `<div class="provider-field-description">${escapeHtml(field.description)}</div>`
        : "";

    if (field.type === "enum") {
        const options = Array.isArray(field.options)
            ? field.options
                .map(
                    (option) => `
							<option value="${escapeHtml(String(option.value))}" ${String(field.value) === String(option.value) ? "selected" : ""}>${escapeHtml(option.label)}</option>
						`,
                )
                .join("")
            : "";

        return `
			<div class="provider-editor-field">
				<label for="${inputId}">${escapeHtml(field.label)}</label>
				<select id="${inputId}">${options}</select>
				${description}
			</div>
		`;
    }

    if (field.type === "boolean") {
        return `
			<div class="provider-editor-field">
				<label for="${inputId}">${escapeHtml(field.label)}</label>
				<input id="${inputId}" type="checkbox" ${field.value ? "checked" : ""} />
				${description}
			</div>
		`;
    }

    const inputType = field.type === "number" ? "number" : "text";
    const placeholder = field.placeholder
        ? `placeholder="${escapeHtml(field.placeholder)}"`
        : "";

    return `
		<div class="provider-editor-field">
			<label for="${inputId}">${escapeHtml(field.label)}</label>
			<input
				id="${inputId}"
				type="${inputType}"
				value="${escapeHtml(String(field.value ?? ""))}"
				${placeholder} />
			${description}
		</div>
	`;
}

function renderApiKeysSection(provider) {
    const apiKeys = provider.apiKeys || [];
    const hasApiKeys = apiKeys.length > 0;

    // Render list of existing API keys
    const apiKeyList = apiKeys
        .map(
            (apiKey) => `
        <div class="api-key-item ${apiKey.isActive ? "active" : ""}">
            <div class="api-key-info">
                <span class="api-key-name">${escapeHtml(apiKey.displayName)}</span>
                <span class="api-key-date">Added: ${formatDate(apiKey.createdAt)}</span>
                ${apiKey.isActive ? '<span class="api-key-badge active">Active</span>' : ""}
            </div>
            <div class="api-key-actions">
                ${!apiKey.isActive ? `<button class="action-button secondary compact" onclick="switchApiKey('${provider.id}', '${apiKey.id}')">Use</button>` : ""}
                <button class="action-button secondary compact danger" onclick="removeApiKey('${provider.id}', '${apiKey.id}')">Remove</button>
            </div>
        </div>
    `,
        )
        .join("");

    // Add new API key form
    const addApiKeyForm = `
        <div class="api-key-add-form">
            <input
                id="provider-apikey-${provider.id}"
                type="password"
                class="api-key-input"
                placeholder="Enter new API key" />
            <input
                id="provider-apikey-name-${provider.id}"
                type="text"
                class="api-key-name-input"
                placeholder="Optional: Display name" />
            <button class="action-button compact" onclick="addApiKey('${provider.id}')">
                Add
            </button>
        </div>
    `;

    return `
        <div class="provider-editor-field api-keys-section">
            <label>API Keys</label>
            ${hasApiKeys ? `<div class="api-key-list">${apiKeyList}</div>` : '<p class="no-api-keys">No API keys configured</p>'}
            ${addApiKeyForm}
        </div>
    `;
}

function formatDate(dateStr) {
    if (!dateStr) return "Unknown";
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString();
    } catch {
        return "Unknown";
    }
}

function groupProvidersByCategory(providers) {
    return providers.reduce((acc, provider) => {
        const category = provider.category || "other";
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(provider);
        return acc;
    }, {});
}

function getCategoryLabel(category) {
    const labels = {
        openai: "OpenAI SDK",
        anthropic: "Anthropic SDK",
        oauth: "OAuth Required",
    };
    return labels[category] || "Other";
}

/**
 * Render strategy selector
 */
function renderStrategySelector(providerId, currentStrategy) {
    return `
        <div class="strategy-container">
            <div class="strategy-label">
                <span class="label-text">Strategy</span>
                <span class="label-hint">How requests should rotate across accounts.</span>
            </div>
            <div class="strategy-options">
                ${LOAD_BALANCE_STRATEGIES.map(
        (strategy) => `
                    <label class="strategy-option ${currentStrategy === strategy.id ? "selected" : ""}">
                        <input type="radio" 
                               name="strategy-${providerId}" 
                               value="${strategy.id}"
                               ${currentStrategy === strategy.id ? "checked" : ""}
                               onchange="handleStrategyChange('${providerId}', '${strategy.id}')">
                        <div class="strategy-content">
                            <span class="strategy-name">${strategy.name}</span>
                            <span class="strategy-desc">${strategy.description}</span>
                        </div>
                    </label>
                `,
    ).join("")}
            </div>
        </div>
    `;
}

/**
 * Render advanced section
 */
function renderAdvancedSection() {
    return `
        <div class="settings-section">
            <h2 class="section-title">
                Quick Actions
            </h2>
            <div class="action-buttons">
                <button class="action-button" onclick="openAccountManager()">
                    👤 Manage Accounts
                </button>
                <button class="action-button secondary" onclick="refreshSettings()">
                    Refresh
                </button>
            </div>
        </div>
    `;
}

function renderUiPreferencesSection() {
    const hideThinkingInUI = Boolean(
        settingsState.uiPreferences?.hideThinkingInUI,
    );

    return `
        <div class="settings-section">
            <h2 class="section-title">
                UI Preferences
            </h2>
            <div class="settings-card">
                <div class="toggle-container">
                    <div class="toggle-label">
                        <span class="label-text">Hide all thinking in chat UI</span>
                        <span class="label-hint">Completely suppress reasoning/thinking blocks from provider responses.</span>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox"
                               id="toggle-hide-thinking-ui"
                               ${hideThinkingInUI ? "checked" : ""}
                               onchange="setHideThinkingInUI(this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render info section
 */
function renderInfoSection() {
    return `
        <div class="divider"></div>
        <div class="info-box">
            <span class="info-icon"></span>
            <div class="info-content">
                <p><strong>About Load Balancing:</strong></p>
                <p>When enabled, requests will be distributed across multiple accounts to optimize quota usage and improve reliability. 
                If one account hits its quota limit, the system will automatically switch to another available account.</p>
            </div>
        </div>
        <div class="info-box" style="margin-top: 12px;">
            <span class="info-icon"></span>
            <div class="info-content">
                <p><strong>Load Balance Strategies:</strong></p>
                <p>• <strong>Round Robin:</strong> Requests are distributed evenly across accounts<br>
                • <strong>Quota Aware:</strong> Prioritizes accounts with more remaining quota<br>
                • <strong>Failover Only:</strong> Uses primary account, switches only on errors</p>
            </div>
        </div>
    `;
}

function _saveProviderSettings(providerId) {
    const provider = (settingsState.providers || []).find(
        (p) => p.id === providerId,
    );
    if (!provider) {
        return;
    }

    const payload = {};
    const settings = {};
    for (const field of provider.settingsFields || []) {
        const input = document.getElementById(
            getProviderSettingInputId(providerId, field.key),
        );
        if (!input) {
            continue;
        }

        if (field.type === "boolean") {
            settings[field.key] = Boolean(input.checked);
            continue;
        }

        if (field.type === "number") {
            const rawValue = (input.value || "").trim();
            settings[field.key] = rawValue === "" ? Number(field.value || 0) : Number(rawValue);
            continue;
        }

        settings[field.key] = input.value;
    }

    if (Object.keys(settings).length > 0) {
        payload.settings = settings;
    }

    vscode.postMessage({
        command: "saveProviderSettings",
        providerId,
        payload,
    });
}

function _addApiKey(providerId) {
    const provider = (settingsState.providers || []).find(
        (p) => p.id === providerId,
    );
    if (!provider) {
        return;
    }

    const apiKeyInput = document.getElementById(`provider-apikey-${providerId}`);
    const apiKeyNameInput = document.getElementById(
        `provider-apikey-name-${providerId}`,
    );

    if (!apiKeyInput) {
        return;
    }

    const apiKey = (apiKeyInput.value || "").trim();
    if (!apiKey) {
        showToast("Please enter an API key", "error");
        return;
    }

    const displayName = (apiKeyNameInput?.value || "").trim();

    vscode.postMessage({
        command: "addApiKey",
        providerId,
        payload: {
            apiKey,
            displayName: displayName || undefined,
        },
    });

    // Clear inputs after sending
    apiKeyInput.value = "";
    if (apiKeyNameInput) {
        apiKeyNameInput.value = "";
    }
}

function _removeApiKey(providerId, apiKeyId) {
    const removalKey = `${providerId}:${apiKeyId}`;
    if (pendingApiKeyRemovals.has(removalKey)) {
        return;
    }
    pendingApiKeyRemovals.add(removalKey);

    vscode.postMessage({
        command: "removeApiKey",
        providerId,
        apiKeyId,
    });

    // Prevent duplicate rapid-click requests
    setTimeout(() => {
        pendingApiKeyRemovals.delete(removalKey);
    }, 1500);
}

function _switchApiKey(providerId, apiKeyId) {
    vscode.postMessage({
        command: "switchApiKey",
        providerId,
        apiKeyId,
    });
}

function _openProviderSettings(providerId) {
    vscode.postMessage({
        command: "openProviderSettings",
        providerId,
    });
}

function _runProviderWizard(providerId) {
    vscode.postMessage({
        command: "runProviderWizard",
        providerId,
    });
}

function _manageCompatibleModels() {
    vscode.postMessage({
        command: "manageCompatibleModels",
    });
}

function _createCompatibleModel() {
    vscode.postMessage({
        command: "createCompatibleModel",
    });
}

/**
 * Handle toggle change
 */
function _handleToggleChange(providerId, enabled) {
    // Update local state
    const provider = (settingsState.providers || []).find(
        (p) => p.id === providerId,
    );
    if (provider) {
        provider.loadBalanceEnabled = enabled;
    }

    // Send message to extension
    vscode.postMessage({
        command: "setLoadBalance",
        providerId: providerId,
        enabled: enabled,
    });

    // Update only the affected card and header stats to avoid full-page blinking
    syncProviderCard(providerId);
    syncHeaderStats();
    showToast(
        enabled ? "Load balancing enabled" : "Load balancing disabled",
        "success",
    );
}

/**
 * Handle strategy change
 */
function _handleStrategyChange(providerId, strategy) {
    // Update local state
    const provider = (settingsState.providers || []).find(
        (p) => p.id === providerId,
    );
    if (provider) {
        provider.loadBalanceStrategy = strategy;
    }

    // Send message to extension
    vscode.postMessage({
        command: "setLoadBalanceStrategy",
        providerId: providerId,
        strategy: strategy,
    });

    // Update only the affected card to avoid full-page blinking
    syncProviderCard(providerId);
    showToast(`Strategy changed to ${strategy}`, "success");
}

/**
 * Open account manager
 */
function _openAccountManager() {
    vscode.postMessage({
        command: "openAccountManager",
    });
}

/**
 * Refresh settings
 */
function _refreshSettings() {
    vscode.postMessage({
        command: "refresh",
    });
    showToast("Refreshing settings...", "success");
}

function _setHideThinkingInUI(enabled) {
    const hideThinkingInUI = Boolean(enabled);
    settingsState.uiPreferences = {
        ...(settingsState.uiPreferences || {}),
        hideThinkingInUI,
    };

    vscode.postMessage({
        command: "setHideThinkingInUI",
        enabled: hideThinkingInUI,
    });

    renderPage();
}

function syncProviderCard(providerId) {
    const provider = (settingsState.providers || []).find(
        (p) => p.id === providerId,
    );
    if (!provider) {
        return;
    }

    const safeProviderId = String(providerId).replace(/"/g, "\\\"");
    const card = document.querySelector(`[data-provider-item="${safeProviderId}"]`);
    if (!card) {
        return;
    }

    card.outerHTML = renderProviderCatalogItem(provider);
}

function syncHeaderStats() {
    const providers = settingsState.providers || [];
    const stats = {
        Providers: providers.length,
        Configured: providers.filter(isProviderConfigured).length,
        "Load Balance": providers.filter((provider) => Boolean(provider.loadBalanceEnabled)).length,
    };

    document.querySelectorAll(".header-stat").forEach((stat) => {
        const labelEl = stat.querySelector(".header-stat-label");
        const valueEl = stat.querySelector(".header-stat-value");
        const label = labelEl?.textContent?.trim();
        if (label && valueEl && Object.prototype.hasOwnProperty.call(stats, label)) {
            valueEl.textContent = String(stats[label]);
        }
    });
}

/**
 * Show toast notification
 */
function showToast(message, type = "success") {
    // Remove existing toast
    const existingToast = document.querySelector(".toast");
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === "success" ? "OK" : "NO"}</span>
        <span>${escapeHtml(message)}</span>
    `;
    document.body.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = "slideIn 0.3s ease reverse";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
    const searchInput = document.getElementById("provider-search-input");
    if (searchInput) {
        searchInput.addEventListener("input", (event) => {
            const target = event.target;
            settingsState.providerSearchQuery = target?.value || "";
            renderPage();
            const nextSearchInput = document.getElementById(
                "provider-search-input",
            );
            if (nextSearchInput) {
                const cursor = settingsState.providerSearchQuery.length;
                nextSearchInput.focus();
                nextSearchInput.setSelectionRange(cursor, cursor);
            }
        });
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return "";
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    };
    return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Handle messages from extension
 */
window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.command) {
        case "updateState":
            settingsState = {
                ...settingsState,
                ...message.data,
            };
            renderPage();
            break;
        case "showToast":
            showToast(message.message, message.type);
            break;
    }
});

// Expose handlers for inline HTML event attributes
window.initializeSettingsPage = _initializeSettingsPage;
window.handleToggleChange = _handleToggleChange;
window.handleStrategyChange = _handleStrategyChange;
window.openAccountManager = _openAccountManager;
window.openProviderSettings = _openProviderSettings;
window.refreshSettings = _refreshSettings;
window.runProviderWizard = _runProviderWizard;
window.manageCompatibleModels = _manageCompatibleModels;
window.createCompatibleModel = _createCompatibleModel;
window.saveProviderSettings = _saveProviderSettings;
window.addApiKey = _addApiKey;
window.removeApiKey = _removeApiKey;
window.switchApiKey = _switchApiKey;
window.setHideThinkingInUI = _setHideThinkingInUI;

// Ask extension for current state when the page loads
window.addEventListener("DOMContentLoaded", () => {
    vscode.postMessage({
        command: "refresh",
    });
});
