document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const workspaceArea = document.getElementById('workspace-area');
    const navItems = document.querySelectorAll('.nav-item');
    const workspaceTitle = document.getElementById('workspace-title');

    // --- Utility Functions ---
    function setWorkspaceTitle(title) {
        workspaceTitle.textContent = `Workspace: ${title}`;
    }

    function createKpiCard(label, value, delta, iconName) {
        const up = delta >= 0;
        const card = document.createElement('div');
        card.className = 'kpi-card';
        card.innerHTML = `
            <div class="label">${label}</div>
            <div class="value">${value}</div>
            <div class="delta ${up ? 'positive' : 'negative'}">
                <i data-lucide="${up ? 'arrow-up-right' : 'arrow-down-right'}"></i>
                ${Math.abs(delta).toFixed(1)}%
            </div>
            <div style="position: absolute; right: 1.25rem; top: 1.25rem; opacity: 0.1;">
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
            if (typeof content === 'string') {
                contentDiv.innerHTML = content;
            } else {
                contentDiv.appendChild(content);
            }
        }
        panel.appendChild(contentDiv);
        return panel;
    }

    // --- Workspace Rendering ---
    function renderWorkspace(panelName) {
        workspaceArea.innerHTML = ''; 
        setWorkspaceTitle(panelName.charAt(0).toUpperCase() + panelName.slice(1));

        let contentPanel;
        switch (panelName) {
            case 'overview':
                const overviewWrapper = document.createElement('div');
                overviewWrapper.innerHTML = `
                    <div class="dashboard-grid" id="kpi-container"></div>
                    <div id="campaign-list-container"></div>
                `;
                fetchCampaigns(overviewWrapper);
                contentPanel = createPanel('overview-panel', 'Platform Performance', overviewWrapper);
                break;
            case 'orchestration':
                const orchWrapper = document.createElement('div');
                orchWrapper.id = 'agent-configs-container';
                fetchAgentConfigs(orchWrapper);
                contentPanel = createPanel('orchestration-panel', 'Synapse Agent Orchestration', orchWrapper);
                break;
            case 'workflows':
                contentPanel = createPanel('workflows-panel', 'Workflow Engine', `
                    <div class="terminal-like-area">
                        <pre><code>
# Synapse Autonomous Workflow
# Configured via campaign_configurations table

pipeline:
  - id: monitor
    agent: "ROISentry"
    action: "audit_spend"
  - id: optimize
    agent: "IntentSurgeon"
    condition: "spend_waste > 5%"
  - id: creative
    agent: "PersuasionArchitect"
    action: "refresh_copy"
                        </code></pre>
                        <button class="btn btn-primary" style="margin-top: 1rem;">Deploy New Pipeline</button>
                    </div>
                `);
                break;
            case 'timeline':
                const timelineWrapper = document.createElement('div');
                timelineWrapper.id = 'timeline-container';
                fetchAgentRuns(timelineWrapper);
                contentPanel = createPanel('timeline-panel', 'Agent Execution History', timelineWrapper);
                break;
            case 'logs':
                const logsWrapper = document.createElement('div');
                logsWrapper.id = 'logs-container';
                fetchSystemLogs(logsWrapper);
                contentPanel = createPanel('logs-panel', 'Live System Output', logsWrapper);
                break;
            case 'reports':
                const reportsWrapper = document.createElement('div');
                reportsWrapper.id = 'reports-container';
                fetchReports(reportsWrapper);
                contentPanel = createPanel('reports-panel', 'Analytics Reports', reportsWrapper);
                break;
            case 'files':
                const filesWrapper = document.createElement('div');
                filesWrapper.id = 'files-container';
                fetchFiles(filesWrapper);
                contentPanel = createPanel('files-panel', 'Project Assets', filesWrapper);
                break;
            case 'integrations':
                const intWrapper = document.createElement('div');
                intWrapper.id = 'integrations-container';
                fetchIntegrations(intWrapper);
                contentPanel = createPanel('integrations-panel', 'System Health', intWrapper);
                break;
            case 'settings':
                const settingsWrapper = document.createElement('div');
                settingsWrapper.id = 'settings-container';
                fetchSettings(settingsWrapper);
                contentPanel = createPanel('settings-panel', 'Core Configuration', settingsWrapper);
                break;
            default:
                contentPanel = createPanel('unknown-panel', 'Module Pending', '<p>Feature in development.</p>');
                break;
        }
        
        workspaceArea.appendChild(contentPanel);
        lucide.createIcons();
    }

    // --- Data Fetching & Rendering Helpers ---

    function fetchCampaigns(container) {
        const kpiContainer = container.querySelector('#kpi-container');
        const tableContainer = container.querySelector('#campaign-list-container');
        tableContainer.innerHTML = '<p class="loading">Fetching data streams...</p>';

        fetch('/dashboard/campaigns')
            .then(res => res.json())
            .then(data => {
                renderOverviewData(data, kpiContainer, tableContainer);
                lucide.createIcons();
            })
            .catch(() => tableContainer.textContent = 'Connection failed.');
    }

    function renderOverviewData(campaigns, kpis, table) {
        let clicks = 0, imps = 0, cost = 0, active = 0;
        campaigns.forEach(c => {
            if (c.campaign.status === 2) active++;
            clicks += c.metrics.clicks || 0;
            imps += c.metrics.impressions || 0;
            cost += (c.metrics.cost_micros / 1000000) || 0;
        });

        kpis.appendChild(createKpiCard('Total Clicks', clicks.toLocaleString(), 12.5, 'mouse-pointer-2'));
        kpis.appendChild(createKpiCard('Total Impressions', imps.toLocaleString(), -2.4, 'eye'));
        kpis.appendChild(createKpiCard('Total Spend', `$${cost.toFixed(2)}`, 8.1, 'dollar-sign'));
        kpis.appendChild(createKpiCard('Active Campaigns', active.toString(), 0, 'target'));

        const tPanel = createPanel('campaign-table', 'Campaign Catalog');
        tPanel.querySelector('.panel-content').innerHTML = `
            <table class="data-table">
                <thead>
                    <tr><th>Name</th><th>Status</th><th>Clicks</th><th>Spend</th><th style="text-align:right">Action</th></tr>
                </thead>
                <tbody>
                    ${campaigns.map(c => `
                        <tr>
                            <td style="font-weight:600">${c.campaign.name}</td>
                            <td><span class="status-dot" style="background:${c.campaign.status === 2 ? '#28a745':'#888'}"></span> ${c.campaign.status === 2 ? 'Active':'Paused'}</td>
                            <td>${c.metrics.clicks.toLocaleString()}</td>
                            <td>$${(c.metrics.cost_micros/1000000).toFixed(2)}</td>
                            <td style="text-align:right"><button class="btn btn-action" data-id="${c.campaign.id}" data-action="${c.campaign.status === 2 ? 'pause':'enable'}"><i data-lucide="${c.campaign.status === 2 ? 'pause':'play'}"></i></button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        table.appendChild(tPanel);
        table.querySelectorAll('.btn-action').forEach(btn => btn.onclick = () => {
            fetch(`/dashboard/campaigns/${btn.dataset.id}/${btn.dataset.action}`, {method:'POST'}).then(() => renderWorkspace('overview'));
        });
    }

    function fetchAgentConfigs(container) {
        container.innerHTML = '<p class="loading">Loading configurations...</p>';
        fetch('/dashboard/agent-configurations')
            .then(res => res.json())
            .then(configs => {
                container.innerHTML = `
                    <div class="agent-card-grid">
                        ${configs.map(cfg => `
                            <div class="agent-card">
                                <div style="display:flex; gap:1rem; align-items:center;">
                                    <div style="padding:0.5rem; background:var(--muted); border-radius:0.5rem; color:var(--primary);"><i data-lucide="settings"></i></div>
                                    <div>
                                        <div style="font-weight:700">${cfg.config_name}</div>
                                        <div style="font-size:0.75rem; color:var(--muted-foreground)">CID: ${cfg.customer_id}</div>
                                    </div>
                                </div>
                                <div style="font-size:0.875rem; color:var(--muted-foreground)">Target Campaign: ${cfg.campaign_id}</div>
                                <div style="display:flex; gap:0.5rem; margin-top:auto">
                                    <button class="btn btn-primary btn-run" data-id="${cfg.id}" style="flex:1">Run Now</button>
                                    <button class="btn">Edit</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                container.querySelectorAll('.btn-run').forEach(btn => {
                    btn.onclick = () => {
                        btn.disabled = true;
                        btn.textContent = 'Triggering...';
                        fetch(`/dashboard/trigger-agent/${btn.dataset.id}`, { method: 'POST' })
                            .then(res => res.json())
                            .then(data => {
                                alert(data.message);
                                btn.disabled = false;
                                btn.textContent = 'Run Now';
                            });
                    };
                });
                lucide.createIcons();
            });
    }

    function fetchAgentRuns(container) {
        container.innerHTML = '<p class="loading">Fetching run history...</p>';
        fetch('/dashboard/agent-runs')
            .then(res => res.json())
            .then(runs => {
                container.innerHTML = `
                    <table class="data-table">
                        <thead><tr><th>Timestamp</th><th>Config</th><th>Status</th><th>Details</th></tr></thead>
                        <tbody>
                            ${runs.map(r => `
                                <tr>
                                    <td>${new Date(r.run_timestamp).toLocaleString()}</td>
                                    <td>${r.config_name || 'N/A'}</td>
                                    <td><span style="color:${r.status === 'completed' ? '#28a745':'#dc3545'}">${r.status.toUpperCase()}</span></td>
                                    <td>${JSON.stringify(r.details)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            });
    }

    function fetchSystemLogs(container) {
        container.innerHTML = '<p class="loading">Connecting to log stream...</p>';
        fetch('/dashboard/system-logs')
            .then(res => res.text())
            .then(logs => {
                container.innerHTML = `<div class="terminal-like-area"><pre><code>${logs}</code></pre></div>`;
            });
    }

    function fetchReports(container) {
        container.innerHTML = '<p class="loading">Compiling report data...</p>';
        fetch('/dashboard/reports/campaigns')
            .then(res => res.json())
            .then(data => {
                container.innerHTML = `
                    <table class="data-table">
                        <thead><tr><th>Date</th><th>Campaign</th><th>Clicks</th><th>Impressions</th><th>Cost</th></tr></thead>
                        <tbody>
                            ${data.map(r => `
                                <tr>
                                    <td>${r.segments.date}</td>
                                    <td>${r.campaign.name}</td>
                                    <td>${r.metrics.clicks.toLocaleString()}</td>
                                    <td>${r.metrics.impressions.toLocaleString()}</td>
                                    <td>$${(r.metrics.cost_micros/1000000).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            });
    }

    function fetchFiles(container) {
        fetch('/dashboard/files')
            .then(res => res.json())
            .then(files => {
                container.innerHTML = `
                    <div style="display:grid; gap:0.5rem;">
                        ${files.map(f => `
                            <div style="display:flex; align-items:center; gap:0.75rem; padding:0.5rem; background:var(--muted); border-radius:0.5rem;">
                                <i data-lucide="${f.type === 'folder' ? 'folder':'file-text'}" style="color:var(--primary)"></i>
                                <span style="font-size:0.875rem">${f.path}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
                lucide.createIcons();
            });
    }

    function fetchIntegrations(container) {
        fetch('/dashboard/status')
            .then(res => res.json())
            .then(data => {
                container.innerHTML = `
                    <div style="display:grid; gap:1rem;">
                        ${Object.entries(data).map(([k, v]) => `
                            <div class="panel">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <div style="display:flex; gap:1rem; align-items:center;">
                                        <i data-lucide="${k === 'database' ? 'database' : k === 'googleAds' ? 'cloud' : 'activity'}"></i>
                                        <div><div style="font-weight:600; text-transform:capitalize">${k}</div><div style="font-size:0.75rem; color:${v === 'Connected' || v === 'Active' ? '#28a745':'#dc3545'}">${v}</div></div>
                                    </div>
                                    <button class="btn">Check</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                lucide.createIcons();
            });
    }

    function fetchSettings(container) {
        container.innerHTML = `
            <div style="max-width:600px;">
                <div class="panel">
                    <div style="display:flex; flex-direction:column; gap:1.5rem;">
                        <div>
                            <label style="display:block; font-size:0.75rem; color:var(--muted-foreground); margin-bottom:0.5rem;">DEVELOPER TOKEN</label>
                            <input type="password" value="****************" class="terminal-input" readonly />
                        </div>
                        <div>
                            <label style="display:block; font-size:0.75rem; color:var(--muted-foreground); margin-bottom:0.5rem;">LOG LEVEL</label>
                            <select class="terminal-input"><option>INFO</option><option>DEBUG</option></select>
                        </div>
                        <button class="btn btn-primary">Save Settings</button>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Mobile Navigation ---
    const menuOpen = document.getElementById('menu-open');
    const menuClose = document.getElementById('menu-close');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    function toggleSidebar(show) {
        if (show) {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('visible');
            menuClose.style.display = 'block';
        } else {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('visible');
            menuClose.style.display = 'none';
        }
    }

    menuOpen.addEventListener('click', () => toggleSidebar(true));
    menuClose.addEventListener('click', () => toggleSidebar(false));
    sidebarOverlay.addEventListener('click', () => toggleSidebar(false));

    // --- Navigation & Initial Load ---
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            renderWorkspace(item.dataset.panel);
            
            // Auto-close sidebar on mobile after selection
            if (window.innerWidth <= 1024) {
                toggleSidebar(false);
            }
        });
    });

    renderWorkspace('overview');

    // --- Command Palette ---
    const palette = document.getElementById('command-palette');
    const input = document.getElementById('command-input');

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            palette.style.display = 'block';
            setTimeout(() => { palette.classList.add('is-visible'); input.focus(); }, 10);
        }
        if (e.key === 'Escape') {
            palette.classList.remove('is-visible');
            setTimeout(() => palette.style.display = 'none', 200);
        }
    });
});
