document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const workspaceArea = document.getElementById('workspace-area');
    const navItems = document.querySelectorAll('.nav-item');
    const topBarTitle = mainContent.querySelector('#top-bar h2');

    // Store references to the actual content elements, not just the raw HTML
    // This allows for better management of dynamic content without constant re-parsing
    const panelContentCache = {};

    // --- Utility Functions ---
    function setTopBarTitle(title) {
        topBarTitle.textContent = `Workspace: ${title}`;
    }

    function createPanel(id, headerText, content) {
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.dataset.panelId = id;

        const header = document.createElement('div');
        header.className = 'panel-header';
        header.textContent = headerText;
        panel.appendChild(header);

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
        // Apply fade-out effect before clearing content
        workspaceArea.classList.add('fade-out');
        workspaceArea.classList.remove('fade-in');

        setTimeout(() => {
            workspaceArea.innerHTML = ''; // Clear current workspace after fade-out
            setTopBarTitle(panelName.charAt(0).toUpperCase() + panelName.slice(1)); // Update top bar title

            let contentPanel;
            if (panelContentCache[panelName]) {
                contentPanel = panelContentCache[panelName];
            } else {
                switch (panelName) {
                    case 'overview':
                        const overviewPanel = createPanel('overview-panel', 'Campaign Overview');
                        const overviewContent = overviewPanel.querySelector('.panel-content');
                        overviewContent.innerHTML = `
                            <div class="dashboard-grid" id="overview-metrics-grid">
                                <!-- Metric Cards will go here -->
                            </div>
                            <div class="panel" data-panel-id="campaign-list">
                                <div class="panel-header">Active Campaigns</div>
                                <div class="panel-content" id="campaigns-table-container">
                                    <!-- Campaigns table will be rendered here -->
                                </div>
                            </div>
                        `;
                        fetchCampaigns(overviewContent.querySelector('#campaigns-table-container'));
                        contentPanel = overviewPanel;
                        break;
                    case 'orchestration':
                        const orchestrationPanel = createPanel('orchestration-panel', 'Agent Orchestration');
                        const orchestrationContent = orchestrationPanel.querySelector('.panel-content');
                        orchestrationContent.innerHTML = `
                            <div class="agent-card-grid" id="agent-cards-container">
                                <!-- Agent cards will be rendered here -->
                            </div>
                        `;
                        renderAgentCards(orchestrationContent.querySelector('#agent-cards-container'));
                        contentPanel = orchestrationPanel;
                        break;
                    case 'workflows':
                        contentPanel = createPanel('workflows-panel', 'Workflow Builder');
                        contentPanel.querySelector('.panel-content').innerHTML = `
                            <div class="terminal-like-area">
                                <pre><code>
# Autonomous Workflow Definition
# Use a DSL to define agent tasks and dependencies.

workflow:
  name: "Daily ROI Optimization"
  trigger: "daily at 02:00 AM UTC"
  steps:
    - agent: "ROISentry"
      action: "analyze_budget_spend"
      params: { campaign_id: "all", budget_threshold: 0.8 }
    - agent: "IntentSurgeon"
      action: "identify_negative_keywords"
      depends_on: "ROISentry"
      params: { campaign_id: "all", spend_threshold: 100 }
    - agent: "PersuasionArchitect"
      action: "rewrite_ad_copy"
      depends_on: "IntentSurgeon"
      params: { ad_group_id: "high_impression", ctr_threshold: 0.01 }
                                </code></pre>
                                <button class="btn" style="margin-top: var(--spacing-md);">Deploy Workflow</button>
                            </div>
                        `;
                        break;
                    case 'timeline':
                        contentPanel = createPanel('timeline-panel', 'Live Execution Timeline');
                        contentPanel.querySelector('.panel-content').innerHTML = `
                            <div class="terminal-like-area">
                                <pre><code>
[2026-05-10 09:30:00] ROISentry: Initializing for campaign 'Brand_Awareness_Q2'
[2026-05-10 09:30:05] ROISentry: Fetching metrics...
[2026-05-10 09:30:15] ROISentry: Budget utilization for 'Brand_Awareness_Q2': 75%. Status: OK.
[2026-05-10 09:30:20] IntentSurgeon: Starting negative keyword identification for 'Brand_Awareness_Q2'
[2026-05-10 09:30:35] IntentSurgeon: Identified 3 new negative keyword candidates. Awaiting approval.
[2026-05-10 09:30:40] PersuasionArchitect: Analyzing ad copy for 'Product_Launch_Campaign'
[2026-05-10 09:30:55] PersuasionArchitect: Suggested minor headline adjustments for AdGroup 'New_Product_Features'.
                                </code></pre>
                            </div>
                        `;
                        break;
                    case 'logs':
                        contentPanel = createPanel('logs-panel', 'Live Agent Logs');
                        contentPanel.querySelector('.panel-content').innerHTML = `
                            <div class="terminal-like-area">
                                <pre><code>
[INFO] [Agent:ROISentry] 2026-05-10 09:30:05 - Fetching budget data for all campaigns.
[DEBUG] [GoogleAdsApiManager] 2026-05-10 09:30:10 - Executing GAQL query: SELECT campaign.id, metrics.cost_micros FROM campaign...
[WARN] [Agent:IntentSurgeon] 2026-05-10 09:30:25 - High spend on search term 'cheap widgets' in campaign 'Spring_Sale'. Suggesting negative.
[INFO] [Agent:PersuasionArchitect] 2026-05-10 09:30:45 - Rewriting ad headline 'Buy Now' to 'Shop Exclusive Deals'.
[SUCCESS] [GoogleAdsApiManager] 2026-05-10 09:30:50 - Mutation successful: ADD negative keyword 'cheap widgets'.
                                </code></pre>
                            </div>
                        `;
                        break;
                    case 'files':
                        contentPanel = createPanel('files-panel', 'File Explorer');
                        contentPanel.querySelector('.panel-content').innerHTML = `
                            <ul class="file-tree">
                                <li><span class="icon folder"></span> config/</li>
                                <li><span class="icon folder"></span> agents/</li>
                                <li><span class="icon file"></span> agent_config.json</li>
                                <li><span class="icon file"></span> workflow_definitions.yaml</li>
                                <li><span class="icon file"></span> data_exports/report_20260509.csv</li>
                            </ul>
                        `;
                        break;
                    case 'integrations':
                        contentPanel = createPanel('integrations-panel', 'External Integrations');
                        contentPanel.querySelector('.panel-content').innerHTML = `
                            <div class="integration-settings">
                                <div class="setting-item">
                                    <span class="label">GitHub Repo:</span>
                                    <span class="value">my-org/ad-agent-playbooks</span>
                                    <button class="btn">Configure</button>
                                </div>
                                <div class="setting-item">
                                    <span class="label">Google Business Profile:</span>
                                    <span class="value">Linked (Store ID: 12345)</span>
                                    <button class="btn">Manage</button>
                                </div>
                            </div>
                        `;
                        break;
                    case 'settings':
                        contentPanel = createPanel('settings-panel', 'System Settings');
                        contentPanel.querySelector('.panel-content').innerHTML = `
                            <div class="system-settings">
                                <div class="setting-item">
                                    <span class="label">API Key:</span>
                                    <input type="password" value="****************" class="terminal-input" />
                                    <button class="btn">Reveal</button>
                                    <button class="btn">Update</button>
                                </div>
                                <div class="setting-item">
                                    <span class="label">Logging Level:</span>
                                    <select class="terminal-input">
                                        <option>INFO</option>
                                        <option>DEBUG</option>
                                        <option>WARN</option>
                                        <option>ERROR</option>
                                    </select>
                                </div>
                            </div>
                        `;
                        break;
                    default:
                        contentPanel = createPanel('unknown-panel', 'Unknown Workspace');
                        contentPanel.querySelector('.panel-content').innerHTML = '<p>This workspace is not yet implemented.</p>';
                        break;
                }
                panelContentCache[panelName] = contentPanel;
            }
            workspaceArea.appendChild(contentPanel);

            // Apply fade-in effect after content is added
            workspaceArea.classList.remove('fade-out');
            workspaceArea.classList.add('fade-in');
        }, 200); // Delay for fade-out transition duration
    }

    // --- Agent Card Rendering (New Helper) ---
    function renderAgentCards(container) {
        // Dummy data for agent cards
        const agents = [
            { id: 'roi-sentry', name: 'ROI Sentry', description: 'Monitors budget and optimizes return on investment.', status: 'enabled' },
            { id: 'intent-surgeon', name: 'Intent Surgeon', description: 'Identifies and injects negative keywords.', status: 'enabled' },
            { id: 'persuasion-architect', name: 'Persuasion Architect', description: 'Rewrites ad copy for improved CTR.', status: 'paused' },
            { id: 'location-sentry', name: 'Location Sentry', description: 'Optimizes geo-targeting and bid adjustments.', status: 'enabled' },
            { id: 'bid-strategist', name: 'Bid Strategist', description: 'Adjusts bids based on performance and goals.', status: 'removed' }
        ];

        container.innerHTML = ''; // Clear previous content

        agents.forEach(agent => {
            const card = document.createElement('div');
            card.className = 'agent-card';
            card.innerHTML = `
                <div class="agent-card-header">
                    <span>${agent.name}</span>
                    <span class="agent-card-status ${agent.status}">${agent.status.toUpperCase()}</span>
                </div>
                <div class="agent-card-body">
                    <p>${agent.description}</p>
                </div>
                <div class="agent-card-footer">
                    <button class="btn agent-action-btn" data-agent-id="${agent.id}" data-action="configure">Configure</button>
                    <button class="btn agent-action-btn" data-agent-id="${agent.id}" data-action="view-logs">Logs</button>
                </div>
            `;
            container.appendChild(card);
        });

        // Add event listeners for agent actions (e.g., configure, view logs)
        container.querySelectorAll('.agent-action-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const agentId = event.target.dataset.agentId;
                const action = event.target.dataset.action;
                console.log(`Agent: ${agentId}, Action: ${action}`);
                // Implement specific logic for each agent action
                alert(`Performing ${action} for ${agentId}`);
            });
        });
    }

    // --- Navigation Handlers ---
    navItems.forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            const panelName = item.dataset.panel;
            renderWorkspace(panelName);
        });
    });

    // --- Existing Data Fetching and Rendering (Further Adapted) ---
    function fetchCampaigns(targetElement) {
        targetElement.innerHTML = '<p>Loading campaigns...</p>'; // Loading indicator
        fetch('/dashboard/campaigns')
            .then(response => response.json())
            .then(campaigns => {
                renderCampaignsOverview(campaigns, targetElement); // New render function
            })
            .catch(error => {
                console.error('Error fetching campaigns:', error);
                targetElement.textContent = 'Error fetching campaigns. See console for details.';
            });
    }

    function renderCampaignsOverview(campaigns, targetElement) {
        const overviewMetricsGrid = document.getElementById('overview-metrics-grid');
        if (overviewMetricsGrid) {
            // Calculate aggregate metrics
            let totalClicks = 0;
            let totalImpressions = 0;
            let totalCost = 0;
            let activeCampaigns = 0;

            campaigns.forEach(campaignData => {
                const metrics = campaignData.metrics;
                if (campaignData.campaign.status === 2) { // ENABLED
                    activeCampaigns++;
                }
                totalClicks += metrics.clicks || 0;
                totalImpressions += metrics.impressions || 0;
                totalCost += (metrics.cost_micros / 1000000) || 0;
            });

            overviewMetricsGrid.innerHTML = `
                <div class="dashboard-metric-card">
                    <div class="label">Total Clicks</div>
                    <div class="value">${totalClicks.toLocaleString()}</div>
                </div>
                <div class="dashboard-metric-card">
                    <div class="label">Total Impressions</div>
                    <div class="value">${totalImpressions.toLocaleString()}</div>
                </div>
                <div class="dashboard-metric-card">
                    <div class="label">Total Cost</div>
                    <div class="value">$${totalCost.toFixed(2).toLocaleString()}</div>
                </div>
                <div class="dashboard-metric-card">
                    <div class="label">Active Campaigns</div>
                    <div class="value">${activeCampaigns}</div>
                </div>
            `;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'campaigns-view';
        const table = document.createElement('table');
        table.className = 'data-table';
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Create table headers
        const headers = ['Campaign ID', 'Campaign Name', 'Status', 'Clicks', 'Impressions', 'Cost', 'Actions'];
        const headerRow = document.createElement('tr');
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Create table rows
        campaigns.forEach(campaignData => {
            const row = document.createElement('tr');
            const campaign = campaignData.campaign;
            const metrics = campaignData.metrics;

            const campaignStatus = {
                0: 'UNSPECIFIED',
                1: 'UNKNOWN',
                2: 'ENABLED',
                3: 'PAUSED',
                4: 'REMOVED'
            };

            const campaignId = campaign.id;
            const campaignName = campaign.name;
            const status = campaignStatus[campaign.status];
            const clicks = metrics.clicks;
            const impressions = metrics.impressions;
            const cost = (metrics.cost_micros / 1000000).toFixed(2);


            row.innerHTML = `
                <td>${campaignId}</td>
                <td>${campaignName}</td>
                <td>${status}</td>
                <td>${clicks}</td>
                <td>${impressions}</td>
                <td>${cost}</td>
                <td>
                    <button class="action-btn btn" data-id="${campaignId}" data-action="pause" ${status === 'ENABLED' ? '' : 'disabled'}>Pause</button>
                    <button class="action-btn btn" data-id="${campaignId}" data-action="enable" ${status === 'PAUSED' ? '' : 'disabled'}>Enable</button>
                    <button class="view-ad-groups-btn btn" data-id="${campaignId}">View Ad Groups</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);

        // Add a "View Reports" button
        const reportButton = document.createElement('button');
        reportButton.className = 'btn';
        reportButton.textContent = 'View Reports';
        reportButton.addEventListener('click', () => fetchReports(targetElement));
        wrapper.appendChild(reportButton);
        wrapper.appendChild(table);

        targetElement.innerHTML = ''; // Clear previous loading indicator
        targetElement.appendChild(wrapper);


        // Add event listeners to the buttons (delegated for dynamically added elements)
        wrapper.querySelectorAll('.action-btn').forEach(button => {
            button.addEventListener('click', handleActionClick);
        });

        wrapper.querySelectorAll('.view-ad-groups-btn').forEach(button => {
            button.addEventListener('click', handleViewAdGroupsClick);
        });
    }

    function fetchReports(targetElement) {
        targetElement.innerHTML = '<p>Loading reports...</p>'; // Loading indicator
        fetch('/dashboard/reports/campaigns')
            .then(response => response.json())
            .then(reports => {
                renderReports(reports, targetElement);
            })
            .catch(error => {
                console.error('Error fetching reports:', error);
                targetElement.textContent = 'Error fetching reports. See console for details.';
            });
    }

    function renderReports(reports, targetElement) {
        const wrapper = document.createElement('div');
        wrapper.className = 'reports-view';

        const backButton = document.createElement('button');
        backButton.className = 'btn';
        backButton.textContent = 'Back to Campaigns';
        backButton.addEventListener('click', () => {
            const overviewPanel = panelContentCache['overview'];
            if (overviewPanel) {
                fetchCampaigns(overviewPanel.querySelector('#campaigns-table-container'));
            } else {
                fetchCampaigns(targetElement); // Fallback if overview not cached
            }
        });
        wrapper.appendChild(backButton);

        const table = document.createElement('table');
        table.className = 'data-table';
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Create table headers
        const headers = ['Date', 'Campaign ID', 'Campaign Name', 'Clicks', 'Impressions', 'Cost'];
        const headerRow = document.createElement('tr');
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Create table rows
        reports.forEach(reportData => {
            const row = document.createElement('tr');
            const campaign = reportData.campaign;
            const metrics = reportData.metrics;
            const segments = reportData.segments;

            const date = segments.date;
            const campaignId = campaign.id;
            const campaignName = campaign.name;
            const clicks = metrics.clicks;
            const impressions = metrics.impressions;
            const cost = (metrics.cost_micros / 1000000).toFixed(2);

            row.innerHTML = `
                <td>${date}</td>
                <td>${campaignId}</td>
                <td>${campaignName}</td>
                <td>${clicks}</td>
                <td>${impressions}</td>
                <td>${cost}</td>
            `;
            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);

        wrapper.appendChild(table);

        targetElement.innerHTML = '';
        targetElement.appendChild(wrapper);
    }

    function handleViewAdGroupsClick(event) {
        const campaignId = event.target.dataset.id;
        const currentPanelContent = event.target.closest('.panel-content');
        if (!currentPanelContent) {
            console.error('Could not find parent panel-content for ad groups.');
            return;
        }

        currentPanelContent.innerHTML = '<p>Loading ad groups...</p>';
        fetch(`/dashboard/campaigns/${campaignId}/ad-groups`)
            .then(response => response.json())
            .then(adGroups => {
                renderAdGroups(adGroups, campaignId, currentPanelContent);
            })
            .catch(error => {
                console.error('Error fetching ad groups:', error);
                currentPanelContent.textContent = 'Error fetching ad groups. See console for details.';
            });
    }

    function renderAdGroups(adGroups, campaignId, targetElement) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ad-groups-view';

        const backButton = document.createElement('button');
        backButton.className = 'btn';
        backButton.textContent = 'Back to Campaigns';
        backButton.addEventListener('click', () => {
            const overviewPanel = panelContentCache['overview'];
            if (overviewPanel) {
                fetchCampaigns(overviewPanel.querySelector('#campaigns-table-container'));
            } else {
                fetchCampaigns(targetElement); // Fallback if overview not cached
            }
        });
        wrapper.appendChild(backButton);

        const table = document.createElement('table');
        table.className = 'data-table';
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Create table headers
        const headers = ['Ad Group ID', 'Ad Group Name', 'Status', 'Clicks', 'Impressions', 'Cost', 'Actions'];
        const headerRow = document.createElement('tr');
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Create table rows
        adGroups.forEach(adGroupData => {
            const row = document.createElement('tr');
            const adGroup = adGroupData.ad_group;
            const metrics = adGroupData.metrics;

            const adGroupStatus = {
                0: 'UNSPECIFIED',
                1: 'UNKNOWN',
                2: 'ENABLED',
                3: 'PAUSED',
                4: 'REMOVED'
            };

            const adGroupId = adGroup.id;
            const adGroupName = adGroup.name;
            const status = adGroupStatus[adGroup.status];
            const clicks = metrics.clicks;
            const impressions = metrics.metrics.impressions;
            const cost = (metrics.cost_micros / 1000000).toFixed(2);

            row.innerHTML = `
                <td>${adGroupId}</td>
                <td>${adGroupName}</td>
                <td>${status}</td>
                <td>${clicks}</td>
                <td>${impressions}</td>
                <td>${cost}</td>
                <td>
                    <button class="view-ads-btn btn" data-id="${adGroupId}">View Ads</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);

        wrapper.appendChild(table);
        targetElement.innerHTML = `<h3>Ad Groups for Campaign ${campaignId}</h3>`; // Use H3 for sub-titles
        targetElement.appendChild(wrapper);

        wrapper.querySelectorAll('.view-ads-btn').forEach(button => {
            button.addEventListener('click', handleViewAdsClick);
        });
    }

    function handleViewAdsClick(event) {
        const adGroupId = event.target.dataset.id;
        const currentPanelContent = event.target.closest('.panel-content');
        if (!currentPanelContent) {
            console.error('Could not find parent panel-content for ads.');
            return;
        }

        currentPanelContent.innerHTML = '<p>Loading ads...</p>';
        fetch(`/dashboard/ad-groups/${adGroupId}/ads`)
            .then(response => response.json())
            .then(ads => {
                renderAds(ads, adGroupId, currentPanelContent);
            })
            .catch(error => {
                console.error('Error fetching ads:', error);
                currentPanelContent.textContent = 'Error fetching ads. See console for details.';
            });
    }

    function renderAds(ads, adGroupId, targetElement) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ads-view';

        const backButton = document.createElement('button');
        backButton.className = 'btn';
        backButton.textContent = 'Back to Ad Groups';
        backButton.addEventListener('click', () => {
            const overviewPanel = panelContentCache['overview'];
            if (overviewPanel) {
                // This is still a bit of a hack. A true navigation state is needed here.
                // For now, we'll try to go back to the top-level campaigns view.
                fetchCampaigns(overviewPanel.querySelector('#campaigns-table-container'));
            } else {
                fetchCampaigns(targetElement); // Fallback
            }
        });
        wrapper.appendChild(backButton);

        const table = document.createElement('table');
        table.className = 'data-table';
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Create table headers
        const headers = ['Ad ID', 'Ad Name', 'Status', 'Type', 'Clicks', 'Impressions', 'Cost'];
        const headerRow = document.createElement('tr');
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Create table rows
        ads.forEach(adData => {
            const row = document.createElement('tr');
            const ad = adData.ad_group_ad.ad;
            const metrics = adData.metrics;

            const adStatus = {
                0: 'UNSPECIFIED',
                1: 'UNKNOWN',
                2: 'ENABLED',
                3: 'PAUSED',
                4: 'REMOVED'
            };

            const adType = {
                0: 'UNKNOWN',
                1: 'TEXT_AD',
                2: 'EXPANDED_TEXT_AD',
                3: 'CALL_ONLY_AD',
                4: 'EXPANDED_DYNAMIC_SEARCH_AD',
                5: 'HOTEL_AD',
                6: 'SHOPPING_PRODUCT_AD',
                7: 'IMAGE_AD',
                8: 'VIDEO_AD',
                9: 'GMAIL_AD',
                10: 'TEMPLATE_AD',
                11: 'RESPONSIVE_SEARCH_AD',
                12: 'LEGACY_RESPONSIVE_DISPLAY_AD',
                13: 'APP_AD',
                14: 'LEGACY_APP_INSTALL_AD',
                15: 'RESPONSIVE_DISPLAY_AD',
                16: 'HTML5_UPLOAD_AD',
                17: 'DISPLAY_UPLOAD_AD',
                18: 'APP_ENGAGEMENT_AD',
                19: 'SHOPPING_COMPARISON_LISTING_AD',
                20: 'VIDEO_RESPONSIVE_AD',
                21: 'LOCATION_EXTENSION_AD',
                22: 'GENERAL_AD',
                23: 'DISCOVERY_CAROUSEL_AD',
                24: 'DISCOVERY_MULTI_ASSET_AD'
            };

            const adId = ad.id;
            const adName = ad.name;
            const status = adStatus[adData.ad_group_ad.status];
            const type = adType[ad.type];
            const clicks = metrics.clicks;
            const impressions = metrics.impressions;
            const cost = (metrics.cost_micros / 1000000).toFixed(2);

            row.innerHTML = `
                <td>${adId}</td>
                <td>${adName}</td>
                <td>${status}</td>
                <td>${type}</td>
                <td>${clicks}</td>
                <td>${impressions}</td>
                <td>${cost}</td>
            `;
            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);

        wrapper.appendChild(table);
        targetElement.innerHTML = `<h3>Ads for Ad Group ${adGroupId}</h3>`;
        targetElement.appendChild(wrapper);
    }

    function handleActionClick(event) {
        const campaignId = event.target.dataset.id;
        const action = event.target.dataset.action;
        const currentPanelContent = event.target.closest('.panel-content');

        fetch(`/dashboard/campaigns/${campaignId}/${action}`, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Re-fetch campaigns to update the view after action
                    const overviewPanel = panelContentCache['overview'];
                    if (overviewPanel) {
                        fetchCampaigns(overviewPanel.querySelector('#campaigns-table-container'));
                    } else {
                        fetchCampaigns(currentPanelContent); // Fallback
                    }
                } else {
                    alert(`Error: ${data.message}`);
                }
            })
            .catch(error => {
                console.error('Error performing action:', error);
                alert('An error occurred. See console for details.');
            });
    }

    // Initialize the default view
    renderWorkspace('overview');

    // --- Command Palette Logic ---
    const commandPalette = document.getElementById('command-palette');
    const commandInput = document.getElementById('command-input');

    function toggleCommandPalette(show) {
        if (show) {
            commandPalette.classList.add('is-visible');
            commandInput.focus();
        } else {
            commandPalette.classList.remove('is-visible');
            commandInput.value = ''; // Clear input on close
        }
    }

    // Keyboard shortcut to open command palette (Ctrl+K or Cmd+K)
    document.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            toggleCommandPalette(true);
        } else if (event.key === 'Escape' && commandPalette.classList.contains('is-visible')) {
            event.preventDefault();
            toggleCommandPalette(false);
        }
    });

    // Handle command input
    commandInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const command = commandInput.value.trim();
            if (command) {
                console.log('Command entered:', command);
                // Here, you would parse the command and execute actions
                // For now, let's just close the palette
                toggleCommandPalette(false);
            }
        }
    });

    // Close palette if clicking outside (optional, but good UX)
    document.addEventListener('click', (event) => {
        if (commandPalette.classList.contains('is-visible') && !commandPalette.contains(event.target) && event.target !== commandInput) {
            toggleCommandPalette(false);
        }
    });
});
