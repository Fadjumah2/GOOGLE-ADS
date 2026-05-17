/**
 * Synapse Master Grade Dashboard Controller
 */
document.addEventListener('DOMContentLoaded', () => {
    const UI = {
        sidebar: document.getElementById('sidebar'),
        sidebarBackdrop: document.getElementById('sidebar-backdrop'),
        workspaceArea: document.getElementById('workspace-area'),
        workspaceTitle: document.getElementById('workspace-title'),
        navItems: document.querySelectorAll('.nav-item'),
        menuOpen: document.getElementById('menu-open'),
        menuClose: document.getElementById('menu-close'),
        palette: document.getElementById('command-palette'),
        commandInput: document.getElementById('command-input')
    };

    // --- State Management ---
    let currentPanel = 'overview';
    let currentData = null; // Store data of the current panel for searching

    // --- Core UI Logic ---

    // Toast System
    function showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}"></i><span>${message}</span>`;
        container.appendChild(toast);
        lucide.createIcons({ props: { width: 18, height: 18 }, target: toast });

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Robust Fetch Wrapper
    async function fetchData(url, options = {}) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.message || `System error: ${res.status}`);
            }
            return await res.json();
        } catch (error) {
            showToast(error.message, 'error');
            throw error;
        }
    }

    // Toggle Sidebar Overlay
    function toggleSidebar(show) {
        if (show) {
            UI.sidebar.classList.add('open');
            UI.sidebarBackdrop.classList.add('visible');
            document.body.style.overflow = 'hidden'; // Prevent scroll when open
        } else {
            UI.sidebar.classList.remove('open');
            UI.sidebarBackdrop.classList.remove('visible');
            document.body.style.overflow = '';
        }
    }

    UI.menuOpen.onclick = () => toggleSidebar(true);
    UI.menuClose.onclick = () => toggleSidebar(false);
    UI.sidebarBackdrop.onclick = () => toggleSidebar(false);

    // --- Backend Integration Logic ---

    async function updateMode(mode) {
        try {
            await fetchData('/dashboard/mode', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ mode })
            });
            showToast(`System mode updated to ${mode.toUpperCase()}`, 'success');
            renderModeToggle();
        } catch (e) { /* Error handled by fetchData */ }
    }

    async function renderModeToggle() {
        try {
            const { mode } = await fetchData('/dashboard/mode');
            let headerRight = document.getElementById('header-right');
            if (!headerRight) {
                headerRight = document.createElement('div');
                headerRight.id = 'header-right';
                headerRight.className = 'flex-row flex-1 gap-1';
                headerRight.style.justifyContent = 'flex-end'; // Keep this inline for positioning
                const headerContainer = document.getElementById('header');
                if (headerContainer) headerContainer.appendChild(headerRight);
            }
            
            headerRight.innerHTML = `
                <span style="font-size: 0.85rem; color: var(--muted-foreground);">Mode: <strong style="color: var(--foreground);">${mode.toUpperCase()}</strong></span>
                <button id="toggle-mode" class="btn btn-sm" style="padding: 0.4rem 0.8rem;">${mode === 'manual' ? 'Enable Autonomous' : 'Enable Manual'}</button>
            `;

            const toggleBtn = document.getElementById('toggle-mode');
            if (toggleBtn) {
                toggleBtn.onclick = () => {
                    updateMode(mode === 'manual' ? 'autonomous' : 'manual');
                };
            }
        } catch (e) { /* Error handled by fetchData */ }
    }
    window.renderModeToggle = renderModeToggle;

    // Workspace Rendering
    async function renderWorkspace(panelName, dataOverride = null) {
        currentPanel = panelName;
        UI.workspaceArea.innerHTML = '';
        setWorkspaceTitle(panelName.charAt(0).toUpperCase() + panelName.slice(1));

        // Loading state
        UI.workspaceArea.innerHTML = '<div class="loading">Synchronizing with core...</div>';

        try {
            let contentPanel;
            switch (panelName) {
                case 'overview': contentPanel = await getOverviewPanel(dataOverride); break;
                case 'orchestration': contentPanel = await getOrchestrationPanel(dataOverride); break;
                case 'workflows': contentPanel = await getWorkflowsPanel(dataOverride); break;
                case 'timeline': contentPanel = await getTimelinePanel(dataOverride); break;
                case 'logs': contentPanel = await getLogsPanel(); break;
                case 'reports': contentPanel = await getReportsPanel(dataOverride); break;
                case 'integrations': contentPanel = await getIntegrationsPanel(); break;
                case 'settings': contentPanel = getSettingsPanel(); break;
                case 'chat': contentPanel = createChatPanel(); break;
                default:
                    contentPanel = createPanel('404', 'Module Not Found', '<p>The requested operations module is offline or missing.</p>');
            }
            UI.workspaceArea.innerHTML = '';
            UI.workspaceArea.appendChild(contentPanel);
            lucide.createIcons({ target: contentPanel });
        } catch (error) {
            console.error('Render Error:', error);
            UI.workspaceArea.innerHTML = `<div class="panel" style="border-color: var(--destructive);"><div class="panel-header">System Fault</div><p>Failed to initialize module: ${error.message}</p></div>`;
        }
    }

    function setWorkspaceTitle(title) {
        UI.workspaceTitle.textContent = `Workspace: ${title}`;
    }

    // --- Panel Builders ---

    async function getOverviewPanel(dataOverride = null) {
        const campaigns = dataOverride || await fetchData('/dashboard/campaigns');
        if (!dataOverride) currentData = campaigns;

        const wrapper = document.createElement('div');
        wrapper.className = 'workspace-wrapper';
        
        const grid = document.createElement('div');
        grid.className = 'dashboard-grid';
        
        let clicks = 0, cost = 0, active = 0;
        campaigns.forEach(c => {
            clicks += c.metrics.clicks || 0;
            cost += (c.metrics.cost_micros / 1000000) || 0;
            if (c.campaign.status === 2) active++;
        });

        // Deltas are set to 0 as we don't have historical data yet in this view
        grid.appendChild(createKpiCard('Aggregated Clicks', clicks.toLocaleString(), 0, 'mouse-pointer-2'));
        grid.appendChild(createKpiCard('Total Investment', `$${cost.toFixed(2)}`, 0, 'dollar-sign'));
        grid.appendChild(createKpiCard('Active Nodes', active.toString(), 0, 'target'));
        wrapper.appendChild(grid);
        
        const tablePanel = createPanel('campaign-catalog', 'Real-time Campaign Stream');
        tablePanel.querySelector('.panel-content').innerHTML = `
            <table class="data-table">
                <thead><tr><th>Identifier</th><th>Status</th><th>Interactions</th><th>Cost</th><th style="text-align:right">Control</th></tr></thead>
                <tbody>
                    ${campaigns.map(c => `
                        <tr>
                            <td style="font-weight:600">${c.campaign.name}</td>
                            <td><span class="status-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:${c.campaign.status === 2 ? 'var(--success)':'#555'}"></span> ${c.campaign.status === 2 ? 'ACTIVE':'PAUSED'}</td>
                            <td>${c.metrics.clicks.toLocaleString()}</td>
                            <td>$${(c.metrics.cost_micros/1000000).toFixed(2)}</td>
                            <td style="text-align:right">
                                <button class="btn btn-sm btn-action" data-id="${c.campaign.id}" data-action="${c.campaign.status === 2 ? 'pause':'enable'}" style="padding: 0.4rem;">
                                    <i data-lucide="${c.campaign.status === 2 ? 'pause':'play'}" style="width:16px;height:16px;"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        wrapper.appendChild(tablePanel);
        wrapper.querySelectorAll('.btn-action').forEach(btn => {
            btn.onclick = async () => { 
                btn.disabled = true; 
                try {
                    await fetchData(`/dashboard/campaigns/${btn.dataset.id}/${btn.dataset.action}`, {method:'POST'}); 
                    showToast(`Campaign ${btn.dataset.action === 'pause' ? 'paused' : 'enabled'}`, 'success');
                    renderWorkspace('overview'); 
                } catch (e) { btn.disabled = false; }
            };
        });
        return wrapper;
    }

    async function getOrchestrationPanel(dataOverride = null) {
        const configs = dataOverride || await fetchData('/dashboard/agent-configurations');
        if (!dataOverride) currentData = configs;

        const grid = document.createElement('div');
        grid.className = 'orchestration-grid';
        grid.innerHTML = configs.map(cfg => `
            <div class="panel flex-col">
                <div class="flex-row gap-1" style="justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
                    <div class="flex-row gap-1" style="align-items:center;">
                        <div style="padding:0.6rem; background:rgba(0,123,255,0.1); border-radius:0.6rem; color:var(--primary);"><i data-lucide="zap"></i></div>
                        <div><div style="font-weight:700">${cfg.config_name}</div><div style="font-size:0.75rem; color:var(--muted-foreground)">CID: ${cfg.customer_id}</div></div>
                    </div>
                </div>
                <p style="font-size:0.85rem; color: var(--muted-foreground); margin-bottom: 1.5rem;">Autonomous optimization cycle targeting campaign <code>${cfg.campaign_id}</code>.</p>
                <div style="margin-bottom: 1rem;">
                    <label class="form-label">Bid Amount ($)</label>
                    <input type="number" class="bid-input form-input" data-id="${cfg.id}" value="${cfg.bid_amount || 0}" step="0.01">
                </div>
                <div class="flex-row gap-1" style="margin-top:auto">
                    <button class="btn btn-primary btn-run" data-id="${cfg.id}" style="flex:1">Execute Now</button>
                    <button class="btn btn-save-bid" data-id="${cfg.id}" title="Save Bid"><i data-lucide="save" style="width:16px;height:16px;"></i></button>
                </div>
            </div>
        `).join('');
        grid.querySelectorAll('.btn-save-bid').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.id; const bidAmount = grid.querySelector(`.bid-input[data-id="${id}"]`).value;
                try {
                    await fetchData(`/dashboard/campaigns/${id}/bid`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ bidAmount }) });
                    showToast('Bid updated successfully', 'success');
                } catch (e) {}
            };
        });
        grid.querySelectorAll('.btn-run').forEach(btn => {
            btn.onclick = async () => { 
                btn.disabled = true; 
                btn.textContent = 'Executing...'; 
                try {
                    const data = await fetchData(`/dashboard/trigger-agent/${btn.dataset.id}`, {method:'POST'}); 
                    showToast(data.message, 'success');
                } catch (e) {} finally {
                    btn.disabled = false; 
                    btn.textContent = 'Execute Now'; 
                }
            };
        });
        return createPanel('orch-v2', 'Synapse Operation Nodes', grid);
    }

    async function getWorkflowsPanel(dataOverride = null) {
        const actions = dataOverride || await fetchData('/dashboard/prepared-actions');
        if (!dataOverride) currentData = actions;

        if (actions.length === 0) return createPanel('workflows-v2', 'Workflow Intelligence', '<p>No pending agent actions found.</p>');
        const table = `<table class="data-table"><thead><tr><th>Agent</th><th>Action Description</th><th>Campaign ID</th><th>Status</th></tr></thead><tbody>${actions.map(a => `<tr><td style="font-weight:600">${a.agent}</td><td>${a.action_description}</td><td>${a.campaign_id}</td><td><span class="delta positive" style="padding:0.2rem 0.5rem;border-radius:0.4rem;font-size:0.75rem">${a.status}</span></td></tr>`).join('')}</tbody></table>`;
        return createPanel('workflows-v2', 'Workflow Intelligence', table);
    }

    async function getTimelinePanel(dataOverride = null) {
        const runs = dataOverride || await fetchData('/dashboard/agent-runs');
        if (!dataOverride) currentData = runs;

        const table = `<table class="data-table"><thead><tr><th>Phase Timestamp</th><th>Operation</th><th>Status</th><th>Payload</th></tr></thead><tbody>${runs.map(r => `<tr><td style="color:var(--muted-foreground); font-size: 0.85rem">${new Date(r.run_timestamp).toLocaleString()}</td><td style="font-weight:600">${r.config_name || 'Generic Run'}</td><td><span style="color:${r.status === 'completed' ? 'var(--success)':'var(--destructive)'}">${r.status.toUpperCase()}</span></td><td style="font-family:var(--font-mono); font-size:0.8rem; color:var(--muted-foreground)">${JSON.stringify(r.details).substring(0, 50)}...</td></tr>`).join('')}</tbody></table>`;
        return createPanel('timeline-v2', 'System Execution History', table);
    }

    async function getLogsPanel() {
        const data = await fetchData('/dashboard/system-logs');
        const text = data.message || JSON.stringify(data);
        const area = document.createElement('div');
        area.className = 'log-container';
        area.innerHTML = `<pre class="log-code"><code>${text}</code></pre>`;
        return createPanel('logs-v2', 'Kernel Operation Stream', area);
    }

    async function getReportsPanel(dataOverride = null) {
        const data = dataOverride || await fetchData('/dashboard/reports/campaigns');
        if (!dataOverride) currentData = data;

        const table = `<table class="data-table"><thead><tr><th>Date</th><th>Node Name</th><th>Clicks</th><th>Impressions</th><th>Cost</th></tr></thead><tbody>${data.map(r => `<tr><td style="font-size:0.85rem; color:var(--muted-foreground)">${r.segments.date}</td><td style="font-weight:600">${r.campaign.name}</td><td>${r.metrics.clicks.toLocaleString()}</td><td>${r.metrics.impressions.toLocaleString()}</td><td>$${(r.metrics.cost_micros/1000000).toFixed(2)}</td></tr>`).join('')}</tbody></table>`;
        return createPanel('reports-v2', 'Performance Intelligence', table);
    }

    async function getIntegrationsPanel() {
        const data = await fetchData('/dashboard/status');
        const grid = document.createElement('div');
        grid.className = 'flex-col gap-1';
        grid.innerHTML = Object.entries(data).map(([k, v]) => `
            <div class="panel status-indicator">
                <div class="status-info">
                    <div style="color:var(--primary)"><i data-lucide="${k==='database'?'database':k==='googleAds'?'cloud':'activity'}" style="width:24px;height:24px;"></i></div>
                    <div>
                        <div class="status-text">${k.replace(/([A-Z])/g, ' $1')}</div>
                        <div class="status-value ${v.includes('Connected')||v.includes('Active')||v.includes('Configured')?'status-success':'status-error'}">${v}</div>
                    </div>
                </div>
                <button class="btn btn-sm verify-btn">Verify</button>
            </div>
        `).join('');
        grid.querySelectorAll('.verify-btn').forEach(button => {
            button.addEventListener('click', async () => {
                button.disabled = true; button.textContent = 'Verifying...'; await renderWorkspace('integrations');
            });
        });
        return createPanel('status-v2', 'Core Infrastructure Health', grid);
    }

    function getSettingsPanel() {
        const form = document.createElement('div');
        form.className = 'settings-form';
        form.innerHTML = `
            <div class="form-group">
                <label class="form-label">Developer Credentials</label>
                <div class="flex-row gap-1">
                    <input type="password" value="************************" class="form-input form-input-mono flex-1" readonly />
                    <button class="btn btn-sm"><i data-lucide="eye" style="width:16px;height:16px;"></i></button>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Log Verbosity</label>
                <select class="form-input">
                    <option>INFO</option>
                    <option>DEBUG</option>
                    <option>VERBOSE</option>
                </select>
            </div>
            <button class="btn btn-primary" style="align-self:flex-start;" id="commit-settings">Commit Configuration</button>
        `;
        form.querySelector('#commit-settings').onclick = () => {
            showToast('Settings functionality is under synchronization.', 'info');
        };
        return createPanel('settings-v2', 'Kernel Parameters', form);
    }

    function createChatPanel() {
        const panel = createPanel('chat', 'Interactive Command Center', `
            <div class="chat-container">
                <div id="chat-box" class="chat-box"></div>
                <div class="chat-input-wrap">
                    <input id="chat-input" type="text" class="chat-input" placeholder="Command the agent...">
                    <button id="chat-send" class="btn btn-primary">Send</button>
                </div>
            </div>
        `);
        const chatBox = panel.querySelector('#chat-box'); 
        const chatInput = panel.querySelector('#chat-input'); 
        const chatSend = panel.querySelector('#chat-send');
        
        chatSend.onclick = async () => {
            const message = chatInput.value; if (!message) return;
            chatBox.innerHTML += `<div class="msg-user-wrap"><span class="msg-user">${message}</span></div>`;
            chatInput.value = '';
            
            const typing = document.createElement('div');
            typing.className = 'typing-indicator';
            typing.textContent = 'Synapse is analyzing...';
            chatBox.appendChild(typing);
            chatBox.scrollTop = chatBox.scrollHeight;

            try {
                const data = await fetchData('/dashboard/chat', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ message }) });
                typing.remove();
                chatBox.innerHTML += `<div class="msg-ai-wrap"><span class="msg-ai">${data.response}</span></div>`;
            } catch (e) {
                typing.remove();
            }
            chatBox.scrollTop = chatBox.scrollHeight;
        };
        
        chatInput.onkeydown = (e) => { if (e.key === 'Enter') chatSend.click(); };
        
        return panel;
    }

    function createKpiCard(label, value, delta, iconName) {
        const up = delta >= 0; const card = document.createElement('div'); card.className = 'kpi-card fade-in';
        card.innerHTML = `<div class="label">${label}</div><div class="value">${value}</div><div class="delta ${up ? 'positive' : 'negative'}"><i data-lucide="${up ? 'arrow-up-right' : 'arrow-down-right'}" style="width:14px;height:14px;margin-right:4px;"></i>${Math.abs(delta).toFixed(1)}%</div><div style="position: absolute; right: 1.5rem; top: 1.5rem; opacity: 0.1; color: var(--primary);"><i data-lucide="${iconName}" style="width:32px;height:32px;"></i></div>`;
        return card;
    }

    function createPanel(id, headerText, content) {
        const panel = document.createElement('div'); panel.className = 'panel fade-in'; panel.dataset.panelId = id;
        if (headerText) { const header = document.createElement('div'); header.className = 'panel-header'; header.textContent = headerText; panel.appendChild(header); }
        const contentDiv = document.createElement('div'); contentDiv.className = 'panel-content';
        if (content) { if (typeof content === 'string') contentDiv.innerHTML = content; else contentDiv.appendChild(content); }
        panel.appendChild(contentDiv); return panel;
    }

    // Navigation Listeners
    UI.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            UI.navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            renderWorkspace(item.dataset.panel);
            toggleSidebar(false); // Always close after selection
        });
    });

    // Command Palette Logic
    UI.commandInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (!term || !currentData) return;

        // Simple filtering logic based on panel type
        if (currentPanel === 'overview') {
            const filtered = currentData.filter(c => c.campaign.name.toLowerCase().includes(term));
            renderWorkspace('overview', filtered);
        } else if (currentPanel === 'orchestration') {
            const filtered = currentData.filter(cfg => cfg.config_name.toLowerCase().includes(term));
            renderWorkspace('orchestration', filtered);
        } else if (currentPanel === 'workflows') {
            const filtered = currentData.filter(a => a.action_description.toLowerCase().includes(term));
            renderWorkspace('workflows', filtered);
        }
    });

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); UI.palette.style.display = 'block'; setTimeout(() => { UI.palette.classList.add('is-visible'); UI.commandInput.focus(); }, 10); }
        if (e.key === 'Escape') { UI.palette.classList.remove('is-visible'); setTimeout(() => UI.palette.style.display = 'none', 300); }
    });

    // Initial Load
    renderWorkspace('overview');
    renderModeToggle();
});
