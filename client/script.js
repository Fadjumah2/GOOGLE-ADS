document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const workspaceArea = document.getElementById('workspace-area');
    const navItems = document.querySelectorAll('.nav-item');
    const workspaceTitle = document.getElementById('workspace-title');

    // Store references to the actual content elements
    const panelContentCache = {};

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
                    <div class="dashboard-grid" id="kpi-container">
                        <!-- KPI Cards will be injected here -->
                    </div>
                    <div id="campaign-list-container">
                        <!-- Campaigns table will be rendered here -->
                    </div>
                `;
                fetchCampaigns(overviewWrapper);
                contentPanel = createPanel('overview-panel', 'Platform Performance', overviewWrapper);
                break;
            case 'orchestration':
                const orchestrationWrapper = document.createElement('div');
                orchestrationWrapper.className = 'agent-card-grid';
                renderAgentCards(orchestrationWrapper);
                contentPanel = createPanel('orchestration-panel', 'Active Agents', orchestrationWrapper);
                break;
            case 'workflows':
                contentPanel = createPanel('workflows-panel', 'Workflow Engine', `
                    <div class="terminal-like-area">
                        <pre><code>
# Synapse Autonomous Workflow
name: "Intelligent ROI Optimization"
schedule: "00:00 UTC Daily"

pipeline:
  - id: monitor
    agent: "ROISentry"
    action: "audit_spend"
  - id: optimize
    agent: "IntentSurgeon"
    depends_on: monitor
    condition: "spend_waste > 5%"
  - id: creative
    agent: "PersuasionArchitect"
    action: "refresh_copy"
                        </code></pre>
                        <button class="btn btn-primary" style="margin-top: 1rem;">Deploy Pipeline</button>
                    </div>
                `);
                break;
            case 'timeline':
                contentPanel = createPanel('timeline-panel', 'Live Execution Stream', `
                    <div class="terminal-like-area">
                        <pre><code>
[SYSTEM] 09:30:00 - Initializing Synapse Core...
[AGENT]  09:30:05 - ROISentry started analysis on Campaign Q2_Growth
[API]    09:30:15 - Fetched metrics for 12 active campaigns
[AGENT]  09:30:20 - IntentSurgeon identified 5 high-waste search terms
[MUTATE] 09:30:35 - Successfully injected 3 negative keywords
[AGENT]  09:31:00 - PersuasionArchitect generating new ad headlines...
                        </code></pre>
                    </div>
                `);
                break;
            case 'logs':
                contentPanel = createPanel('logs-panel', 'System Logs', `
                    <div class="terminal-like-area">
                        <pre><code>
INFO  [ROISentry] Audit complete. No budget anomalies found.
DEBUG [GoogleAds] GAQL: SELECT campaign.name, metrics.ctr FROM campaign...
WARN  [IntentSurgeon] High CPA detected in 'Discovery_Spring'.
SUCCESS [PersuasionArchitect] Ad copy updated for Group 'Summer_Deals'.
                        </code></pre>
                    </div>
                `);
                break;
            case 'reports':
                const reportsWrapper = document.createElement('div');
                reportsWrapper.id = 'reports-container';
                fetchReports(reportsWrapper);
                contentPanel = createPanel('reports-panel', 'Analytics Reports', reportsWrapper);
                break;
            case 'files':
                contentPanel = createPanel('files-panel', 'System Assets', `
                    <div class="panel">
                        <div class="panel-content">
                            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                                <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; border-radius: 0.5rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border);">
                                    <i data-lucide="folder" style="color: var(--primary);"></i>
                                    <span>config/</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; border-radius: 0.5rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border);">
                                    <i data-lucide="file-json" style="color: var(--primary);"></i>
                                    <span>agent_config.json</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; border-radius: 0.5rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border);">
                                    <i data-lucide="file-text" style="color: var(--primary);"></i>
                                    <span>deployment_strategy.md</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `);
                break;
            case 'integrations':
                contentPanel = createPanel('integrations-panel', 'External Connectors', `
                    <div style="display: grid; gap: 1rem;">
                        <div class="panel">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; gap: 1rem; align-items: center;">
                                    <i data-lucide="github" size="24"></i>
                                    <div>
                                        <div style="font-weight: 600;">GitHub Repository</div>
                                        <div style="font-size: 0.75rem; color: var(--muted-foreground);">Connected: Fadjumah/GOOGLE-ADS</div>
                                    </div>
                                </div>
                                <button class="btn">Configure</button>
                            </div>
                        </div>
                        <div class="panel">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; gap: 1rem; align-items: center;">
                                    <i data-lucide="database" size="24"></i>
                                    <div>
                                        <div style="font-weight: 600;">PostgreSQL Instance</div>
                                        <div style="font-size: 0.75rem; color: var(--muted-foreground);">Status: Healthy (12ms latency)</div>
                                    </div>
                                </div>
                                <button class="btn">Monitor</button>
                            </div>
                        </div>
                    </div>
                `);
                break;
            case 'settings':
                contentPanel = createPanel('settings-panel', 'Core Configuration', `
                    <div style="max-width: 600px;">
                        <div class="panel">
                            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                                <div>
                                    <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground); margin-bottom: 0.5rem; text-transform: uppercase;">Google Ads Developer Token</label>
                                    <div style="display: flex; gap: 0.5rem;">
                                        <input type="password" value="****************" class="terminal-input" style="flex: 1;" readonly />
                                        <button class="btn">Reveal</button>
                                    </div>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground); margin-bottom: 0.5rem; text-transform: uppercase;">System Log Level</label>
                                    <select class="terminal-input">
                                        <option>DEBUG</option>
                                        <option selected>INFO</option>
                                        <option>WARN</option>
                                        <option>ERROR</option>
                                    </select>
                                </div>
                                <div style="padding-top: 1rem; border-top: 1px solid var(--border);">
                                    <button class="btn btn-primary">Save Configuration</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `);
                break;
            default:
                contentPanel = createPanel('unknown-panel', 'Module Pending', '<p>This feature is currently in development.</p>');
                break;
        }
        
        workspaceArea.appendChild(contentPanel);
        lucide.createIcons();
    }

    // --- Agent Card Rendering ---
    function renderAgentCards(container) {
        const agents = [
            { id: 'roi-sentry', name: 'ROI Sentry', description: 'Real-time budget monitoring and ROI optimization.', status: 'enabled', icon: 'trending-up' },
            { id: 'intent-surgeon', name: 'Intent Surgeon', description: 'Precise search term analysis and negative keyword injection.', status: 'enabled', icon: 'scissors' },
            { id: 'persuasion-architect', name: 'Persuasion Architect', description: 'Generative ad copy rewriting for maximum engagement.', status: 'paused', icon: 'pen-tool' },
            { id: 'weekly-auditor', name: 'Weekly Auditor', description: 'Deep campaign audits and strategic performance reviews.', status: 'enabled', icon: 'calendar' }
        ];

        agents.forEach(agent => {
            const card = document.createElement('div');
            card.className = 'agent-card';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="display: flex; gap: 0.75rem; align-items: center;">
                        <div style="padding: 0.5rem; background: var(--muted); border-radius: 0.5rem; color: var(--primary);">
                            <i data-lucide="${agent.icon}"></i>
                        </div>
                        <div>
                            <div style="font-weight: 700; font-size: 1rem;">${agent.name}</div>
                            <span class="agent-card-status" style="background: ${agent.status === 'enabled' ? 'rgba(40,167,69,0.1)' : 'rgba(255,193,7,0.1)'}; color: ${agent.status === 'enabled' ? '#28a745' : '#ffc107'}">
                                ${agent.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
                <p style="font-size: 0.875rem; color: var(--muted-foreground); line-height: 1.5;">${agent.description}</p>
                <div style="display: flex; gap: 0.5rem; margin-top: auto;">
                    <button class="btn" style="flex: 1;">Configure</button>
                    <button class="btn" style="padding: 0.5rem;"><i data-lucide="more-horizontal"></i></button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // --- Data Fetching ---
    function fetchCampaigns(container) {
        const kpiContainer = container.querySelector('#kpi-container');
        const tableContainer = container.querySelector('#campaign-list-container');
        
        tableContainer.innerHTML = '<p style="color: var(--muted-foreground);">Loading data streams...</p>';

        fetch('/dashboard/campaigns')
            .then(response => response.json())
            .then(campaigns => {
                renderOverviewData(campaigns, kpiContainer, tableContainer);
                lucide.createIcons();
            })
            .catch(error => {
                console.error('Fetch error:', error);
                tableContainer.textContent = 'Connection failed. Verify system status.';
            });
    }

    function renderOverviewData(campaigns, kpiContainer, tableContainer) {
        // Aggregate Metrics
        let totalClicks = 0;
        let totalImpressions = 0;
        let totalCost = 0;
        let activeCount = 0;

        campaigns.forEach(c => {
            if (c.campaign.status === 2) activeCount++;
            totalClicks += c.metrics.clicks || 0;
            totalImpressions += c.metrics.impressions || 0;
            totalCost += (c.metrics.cost_micros / 1000000) || 0;
        });

        // KPI Cards
        kpiContainer.appendChild(createKpiCard('Total Clicks', totalClicks.toLocaleString(), 12.5, 'mouse-pointer-2'));
        kpiContainer.appendChild(createKpiCard('Total Impressions', totalImpressions.toLocaleString(), -2.4, 'eye'));
        kpiContainer.appendChild(createKpiCard('Total Spend', `$${totalCost.toFixed(2)}`, 8.1, 'dollar-sign'));
        kpiContainer.appendChild(createKpiCard('Active Campaigns', activeCount.toString(), 0, 'target'));

        // Table
        const tablePanel = createPanel('campaign-table', 'Campaign Catalog');
        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Campaign Name</th>
                    <th>Status</th>
                    <th>Clicks</th>
                    <th>Impressions</th>
                    <th>Cost</th>
                    <th style="text-align: right;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${campaigns.map(c => `
                    <tr>
                        <td style="font-weight: 500;">${c.campaign.name}</td>
                        <td>
                            <span style="display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; font-weight: 600;">
                                <span style="width: 0.5rem; height: 0.5rem; border-radius: 50%; background: ${c.campaign.status === 2 ? '#28a745' : '#888'}"></span>
                                ${c.campaign.status === 2 ? 'Active' : 'Paused'}
                            </span>
                        </td>
                        <td>${c.metrics.clicks.toLocaleString()}</td>
                        <td>${c.metrics.impressions.toLocaleString()}</td>
                        <td>$${(c.metrics.cost_micros / 1000000).toFixed(2)}</td>
                        <td style="text-align: right;">
                            <button class="btn btn-action" data-id="${c.campaign.id}" data-action="${c.campaign.status === 2 ? 'pause' : 'enable'}">
                                <i data-lucide="${c.campaign.status === 2 ? 'pause' : 'play'}" size="14"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        tablePanel.querySelector('.panel-content').appendChild(table);
        tableContainer.innerHTML = '';
        tableContainer.appendChild(tablePanel);

        // Event Listeners
        table.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const action = btn.dataset.action;
                fetch(`/dashboard/campaigns/${id}/${action}`, { method: 'POST' })
                    .then(() => renderWorkspace('overview'));
            });
        });
    }

    function fetchReports(targetElement) {
        targetElement.innerHTML = '<p style="color: var(--muted-foreground);">Compiling report data...</p>';
        fetch('/dashboard/reports/campaigns')
            .then(response => response.json())
            .then(reports => {
                renderReports(reports, targetElement);
                lucide.createIcons();
            })
            .catch(error => {
                console.error('Report fetch error:', error);
                targetElement.textContent = 'Report generation failed.';
            });
    }

    function renderReports(reports, targetElement) {
        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Campaign</th>
                    <th>Clicks</th>
                    <th>Impressions</th>
                    <th>Cost</th>
                </tr>
            </thead>
            <tbody>
                ${reports.map(r => `
                    <tr>
                        <td>${r.segments.date}</td>
                        <td style="font-weight: 500;">${r.campaign.name}</td>
                        <td>${r.metrics.clicks.toLocaleString()}</td>
                        <td>${r.metrics.impressions.toLocaleString()}</td>
                        <td>$${(r.metrics.cost_micros / 1000000).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        targetElement.innerHTML = '';
        targetElement.appendChild(table);
    }


    // --- Navigation ---
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            renderWorkspace(item.dataset.panel);
        });
    });

    // Initial load
    renderWorkspace('overview');

    // --- Command Palette ---
    const commandPalette = document.getElementById('command-palette');
    const commandInput = document.getElementById('command-input');

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            commandPalette.style.display = 'block';
            setTimeout(() => {
                commandPalette.classList.add('is-visible');
                commandInput.focus();
            }, 10);
        }
        if (e.key === 'Escape') {
            commandPalette.classList.remove('is-visible');
            setTimeout(() => commandPalette.style.display = 'none', 200);
        }
    });
});
