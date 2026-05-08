document.addEventListener('DOMContentLoaded', () => {
    const campaignsContainer = document.getElementById('campaigns-container');

    function fetchCampaigns() {
        fetch('/dashboard/campaigns')
            .then(response => response.json())
            .then(campaigns => {
                renderCampaigns(campaigns);
            })
            .catch(error => {
                console.error('Error fetching campaigns:', error);
                campaignsContainer.textContent = 'Error fetching campaigns. See console for details.';
            });
    }

    function renderCampaigns(campaigns) {
        const table = document.createElement('table');
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
                    <button class="action-btn" data-id="${campaignId}" data-action="pause" ${status === 'ENABLED' ? '' : 'disabled'}>Pause</button>
                    <button class="action-btn" data-id="${campaignId}" data-action="enable" ${status === 'PAUSED' ? '' : 'disabled'}>Enable</button>
                    <button class="view-ad-groups-btn" data-id="${campaignId}">View Ad Groups</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        campaignsContainer.innerHTML = '';
        campaignsContainer.appendChild(table);

        // Add event listeners to the buttons
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(button => {
            button.addEventListener('click', handleActionClick);
        });

        const viewAdGroupsButtons = document.querySelectorAll('.view-ad-groups-btn');
        viewAdGroupsButtons.forEach(button => {
            button.addEventListener('click', handleViewAdGroupsClick);
        });
    }

    function handleViewAdGroupsClick(event) {
        const campaignId = event.target.dataset.id;
        fetch(`/dashboard/campaigns/${campaignId}/ad-groups`)
            .then(response => response.json())
            .then(adGroups => {
                renderAdGroups(adGroups, campaignId);
            })
            .catch(error => {
                console.error('Error fetching ad groups:', error);
                campaignsContainer.textContent = 'Error fetching ad groups. See console for details.';
            });
    }

    function renderAdGroups(adGroups, campaignId) {
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Create table headers
        const headers = ['Ad Group ID', 'Ad Group Name', 'Status', 'Clicks', 'Impressions', 'Cost'];
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
            const impressions = metrics.impressions;
            const cost = (metrics.cost_micros / 1000000).toFixed(2);

            row.innerHTML = `
                <td>${adGroupId}</td>
                <td>${adGroupName}</td>
                <td>${status}</td>
                <td>${clicks}</td>
                <td>${impressions}</td>
                <td>${cost}</td>
                <td>
                    <button class="view-ads-btn" data-id="${adGroupId}">View Ads</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);

        const backButton = document.createElement('button');
        backButton.textContent = 'Back to Campaigns';
        backButton.addEventListener('click', fetchCampaigns);

        campaignsContainer.innerHTML = `<h2>Ad Groups for Campaign ${campaignId}</h2>`;
        campaignsContainer.appendChild(backButton);
        campaignsContainer.appendChild(table);

        const viewAdsButtons = document.querySelectorAll('.view-ads-btn');
        viewAdsButtons.forEach(button => {
            button.addEventListener('click', handleViewAdsClick);
        });
    }

    function handleViewAdsClick(event) {
        const adGroupId = event.target.dataset.id;
        fetch(`/dashboard/ad-groups/${adGroupId}/ads`)
            .then(response => response.json())
            .then(ads => {
                renderAds(ads, adGroupId);
            })
            .catch(error => {
                console.error('Error fetching ads:', error);
                campaignsContainer.textContent = 'Error fetching ads. See console for details.';
            });
    }

    function renderAds(ads, adGroupId) {
        const table = document.createElement('table');
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

        const backButton = document.createElement('button');
        backButton.textContent = 'Back to Ad Groups';
        backButton.addEventListener('click', () => handleViewAdGroupsClick({ target: { dataset: { id: adGroupId } } }));

        campaignsContainer.innerHTML = `<h2>Ads for Ad Group ${adGroupId}</h2>`;
        campaignsContainer.appendChild(backButton);
        campaignsContainer.appendChild(table);
    }



    function handleActionClick(event) {
        const campaignId = event.target.dataset.id;
        const action = event.target.dataset.action;

        fetch(`/dashboard/campaigns/${campaignId}/${action}`, { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    fetchCampaigns();
                } else {
                    alert(`Error: ${data.message}`);
                }
            })
            .catch(error => {
                console.error('Error performing action:', error);
                alert('An error occurred. See console for details.');
            });
    }

    fetchCampaigns();
});
