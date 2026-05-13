/**
 * Synapse Master Grade Dashboard Controller
 */
document.addEventListener('DOMContentLoaded', () => {
    const UI = {
        sidebar: document.getElementById('sidebar'),
        sidebarOverlay: document.getElementById('sidebar-overlay'),
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

    // --- Core UI Logic ---

    function setWorkspaceTitle(title) {
        UI.workspaceTitle.textContent = `Workspace: ${title}`;
    }

    function toggleSidebar(show) {
        if (show) {
            UI.sidebar.classList.add('open');
            UI.sidebarOverlay.classList.add('visible');
            UI.menuClose.style.display = 'block';
        } else {
            UI.sidebar.classList.remove('open');
            UI.sidebarOverlay.classList.remove('visible');
            UI.menuClose.style.display = 'none';
        }
    }

    function createKpiCard(label, value, delta, iconName) {
        const up = delta >= 0;
        const card = document.createElement('div');
        card.className = 'kpi-card fade-in';
        card.innerHTML = `
            <div class="label">${label}</div>
            <div class="value">${value}</div>
            <div class="delta ${up ? 'positive' : 'negative'}">
                <i data-lucide="${up ? 'arrow-up-right' : 'arrow-down-right'}"></i>
                ${Math.abs(delta).toFixed(1)}%
            </div>
            <div style="position: absolute; right: 1.5rem; top: 1.5rem; opacity: 0.1; color: var(--primary);">
                <i data-lucide="${iconName}" size="32"></i>
            </div>
        `;
        return card;
    }

    function createPanel(id, headerText, content) {
        const panel = document.createElement('div');
        panel.className = 'panel fade-in';
        panel.dataset.panelId = id;

        if (headerText) {
            const header = document.createElement('div');
            header.className = 'panel-header';
            header.textContent = headerText;
            panel.appendChild(header);
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'panel-content';
        if (content) {
            if (typeof content === 'string') contentDiv.innerHTML = content;
            else contentDiv.appendChild(content);
        }
        panel.appendChild(contentDiv);
        return panel;
    }

    async function renderWorkspace(panelName) {
        currentPanel = panelName;
        UI.workspaceArea.innerHTML = '';
        setWorkspaceTitle(panelName.charAt(0).toUpperCase() + panelName.slice(1));

        // Loading state
        UI.workspaceArea.innerHTML = '<div class="loading">Synchronizing with core...</div>';

        try {
            let contentPanel;
            switch (panelName) {
                case 'overview':
                    contentPanel = await getOverviewPanel();
                    break;
                case 'orchestration':
                    contentPanel = await getOrchestrationPanel();
                    break;
                case 'workflows':
                    contentPanel = createPanel('workflows-v2', 'Workflow Intelligence', '<p>Neural pipeline engine is currently in training. Expected deployment in next cycle.</p>');
                    break;
                case 'timeline':
                    contentPanel = await getTimelinePanel();
                    break;
                case 'logs':
                    contentPanel = await getLogsPanel();
                    break;
                case 'reports':
                    contentPanel = await getReportsPanel();
                    break;
                case 'integrations':
                    contentPanel = await getIntegrationsPanel();
                    break;
                case 'settings':
                    contentPanel = getSettingsPanel();
                    break;
                default:
                    contentPanel = createPanel('404', 'Module Not Found', '<p>The requested operations module is offline or missing.</p>');
            }
            UI.workspaceArea.innerHTML = '';
            UI.workspaceArea.appendChild(contentPanel);
            lucide.createIcons();
        } catch (error) {
            console.error('Render Error:', error);
            UI.workspaceArea.innerHTML = `<div class="panel" style="border-color: var(--destructive);"><div class="panel-header">System Fault</div><p>Failed to initialize module: ${error.message}</p></div>`;
        }
    }

    // --- Panel Builders (Data Integrated) ---

    async function getOverviewPanel() {
        const res = await fetch('/dashboard/campaigns');
        const campaigns = await res.json();
        
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.gap = '2rem';

        // KPIs
        const grid = document.createElement('div');
        grid.className = 'dashboard-grid';
        let clicks = 0, cost = 0, active = 0;
        campaigns.forEach(c => {
            clicks += c.metrics.clicks || 0;
            cost += (c.metrics.cost_micros / 1000000) || 0;
            if (c.campaign.status === 2) active++;
        });
        
        grid.appendChild(createKpiCard('Aggregated Clicks', clicks.toLocaleString(), 14.2, 'mouse-pointer-2'));
        grid.appendChild(createKpiCard('Total Investment', `$${cost.toFixed(2)}`, 5.7, 'dollar-sign'));
        grid.appendChild(createKpiCard('Active Nodes', active.toString(), 0, 'target'));
        wrapper.appendChild(grid);

        // Table
        const tablePanel = createPanel('campaign-catalog', 'Real-time Campaign Stream');
        tablePanel.querySelector('.panel-content').innerHTML = `
            <table class="data-table">
                <thead><tr><th>Identifier</th><th>Status</th><th>Interactions</th><th>Cost</th><th style="text-align:right">Control</th></tr></thead>
                <tbody>
                    ${campaigns.map(c => `
                        <tr>
                            <td style="font-weight:600">${c.campaign.name}</td>
                            <td><span class="status-dot" style="background:${c.campaign.status === 2 ? 'var(--success)':'#555'}"></span> ${c.campaign.status === 2 ? 'ACTIVE':'PAUSED'}</td>
                            <td>${c.metrics.clicks.toLocaleString()}</td>
                            <td>$${(c.metrics.cost_micros/1000000).toFixed(2)}</td>
                            <td style="text-align:right">
                                <button class="btn btn-action" data-id="${c.campaign.id}" data-action="${c.campaign.status === 2 ? 'pause':'enable'}">
                                    <i data-lucide="${c.campaign.status === 2 ? 'pause':'play'}"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        wrapper.appendChild(tablePanel);
        
        // Listeners
        wrapper.querySelectorAll('.btn-action').forEach(btn => {
            btn.onclick = async () => {
                btn.disabled = true;
                await fetch(`/dashboard/campaigns/${btn.dataset.id}/${btn.dataset.action}`, {method:'POST'});
                renderWorkspace('overview');
            };
        });

        return wrapper;
    }

    async function getOrchestrationPanel() {
        const res = await fetch('/dashboard/agent-configurations');
        const configs = await res.json();
        
        const grid = document.createElement('div');
        grid.className = 'agent-card-grid';
        grid.innerHTML = configs.map(cfg => `
            <div class="agent-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:1rem; align-items:center;">
                        <div style="padding:0.6rem; background:rgba(0,123,255,0.1); border-radius:0.6rem; color:var(--primary);"><i data-lucide="zap"></i></div>
                        <div><div style="font-weight:700">${cfg.config_name}</div><div style="font-size:0.75rem; color:var(--muted-foreground)">CID: ${cfg.customer_id}</div></div>
                    </div>
                </div>
                <p style="font-size:0.85rem;">Autonomous optimization cycle targeting campaign <code>${cfg.campaign_id}</code>.</p>
                <div style="display:flex; gap:0.5rem; margin-top:auto">
                    <button class="btn btn-primary btn-run" data-id="${cfg.id}" style="flex:1">Execute Now</button>
                    <button class="btn"><i data-lucide="edit-3"></i></button>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('.btn-run').forEach(btn => {
            btn.onclick = async () => {
                btn.disabled = true;
                btn.textContent = 'Executing...';
                const r = await fetch(`/dashboard/trigger-agent/${btn.dataset.id}`, {method:'POST'});
                const data = await r.json();
                alert(data.message);
                btn.disabled = false;
                btn.textContent = 'Execute Now';
            };
        });

        return createPanel('orch-v2', 'Synapse Operation Nodes', grid);
    }

    async function getTimelinePanel() {
        const res = await fetch('/dashboard/agent-runs');
        const runs = await res.json();
        const table = `
            <table class="data-table">
                <thead><tr><th>Phase Timestamp</th><th>Operation</th><th>Status</th><th>Payload</th></tr></thead>
                <tbody>
                    ${runs.map(r => `
                        <tr>
                            <td style="color:var(--muted-foreground)">${new Date(r.run_timestamp).toLocaleString()}</td>
                            <td style="font-weight:600">${r.config_name || 'Generic Run'}</td>
                            <td><span style="color:${r.status === 'completed' ? 'var(--success)':'var(--destructive)'}">${r.status.toUpperCase()}</span></td>
                            <td style="font-family:var(--font-mono); font-size:0.8rem; color:var(--muted-foreground)">${JSON.stringify(r.details).substring(0, 50)}...</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        return createPanel('timeline-v2', 'System Execution History', table);
    }

    async function getLogsPanel() {
        const res = await fetch('/dashboard/system-logs');
        const text = await res.text();
        const area = document.createElement('div');
        area.className = 'terminal-like-area';
        area.innerHTML = `<pre><code>${text}</code></pre>`;
        return createPanel('logs-v2', 'Kernel Operation Stream', area);
    }

    async function getReportsPanel() {
        const res = await fetch('/dashboard/reports/campaigns');
        const data = await res.json();
        const table = `
            <table class="data-table">
                <thead><tr><th>Date</th><th>Node Name</th><th>Clicks</th><th>Impressions</th><th>Cost</th></tr></thead>
                <tbody>
                    ${data.map(r => `
                        <tr>
                            <td>${r.segments.date}</td>
                            <td style="font-weight:600">${r.campaign.name}</td>
                            <td>${r.metrics.clicks.toLocaleString()}</td>
                            <td>${r.metrics.impressions.toLocaleString()}</td>
                            <td>$${(r.metrics.cost_micros/1000000).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        return createPanel('reports-v2', 'Performance Intelligence', table);
    }

    async function getIntegrationsPanel() {
        const res = await fetch('/dashboard/status');
        const data = await res.json();
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gap = '1.5rem';
        grid.innerHTML = Object.entries(data).map(([k, v]) => `
            <div class="panel" style="margin-bottom:0;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:1.25rem; align-items:center;">
                        <div style="color:var(--primary)"><i data-lucide="${k==='database'?'database':k==='googleAds'?'cloud':'activity'}" size="24"></i></div>
                        <div><div style="font-weight:700; text-transform:capitalize;">${k.replace(/([A-Z])/g, ' $1')}</div><div style="font-size:0.85rem; color:${v.includes('Connected')||v.includes('Active')||v.includes('Configured')?'var(--success)':'var(--destructive)'}">${v}</div></div>
                    </div>
                    <button class="btn">Verify</button>
                </div>
            </div>
        `).join('');
        return createPanel('status-v2', 'Core Infrastructure Health', grid);
    }

    function getSettingsPanel() {
        const form = `
            <div style="max-width:600px; display:flex; flex-direction:column; gap:2rem;">
                <div>
                    <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--muted-foreground); margin-bottom:0.75rem; text-transform:uppercase; letter-spacing:0.05em;">Developer Credentials</label>
                    <div style="display:flex; gap:0.5rem;">
                        <input type="password" value="************************" class="terminal-input" style="flex:1; border:1px solid var(--border); padding:0.75rem; border-radius:var(--radius-sm);" readonly />
                        <button class="btn"><i data-lucide="eye"></i></button>
                    </div>
                </div>
                <div>
                    <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--muted-foreground); margin-bottom:0.75rem; text-transform:uppercase; letter-spacing:0.05em;">Log Verbosity</label>
                    <select class="terminal-input" style="width:100%; border:1px solid var(--border); padding:0.75rem; border-radius:var(--radius-sm); background:var(--background);">
                        <option>INFO</option>
                        <option>DEBUG</option>
                        <option>VERBOSE</option>
                    </select>
                </div>
                <button class="btn btn-primary" style="align-self:flex-start;">Commit Configuration</button>
            </div>
        `;
        return createPanel('settings-v2', 'Kernel Parameters', form);
    }

    // --- Interaction Listeners ---

    UI.menuOpen.onclick = () => toggleSidebar(true);
    UI.menuClose.onclick = () => toggleSidebar(false);
    UI.sidebarOverlay.onclick = () => toggleSidebar(false);

    UI.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            UI.navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            renderWorkspace(item.dataset.panel);
            if (window.innerWidth <= 1024) toggleSidebar(false);
        });
    });

    // Command Palette
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            UI.palette.style.display = 'block';
            setTimeout(() => { UI.palette.classList.add('is-visible'); UI.commandInput.focus(); }, 10);
        }
        if (e.key === 'Escape') {
            UI.palette.classList.remove('is-visible');
            setTimeout(() => UI.palette.style.display = 'none', 300);
        }
    });

    // Initial Load
    renderWorkspace('overview');
});
