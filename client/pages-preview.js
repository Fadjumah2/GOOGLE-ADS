/**
 * Static GitHub Pages preview adapter.
 * Included only in the Pages artifact; the server-hosted app is unchanged.
 */
(() => {
    const originalFetch = window.fetch.bind(window);
    const notice = 'Preview only: connect a hosted backend to use live campaign data and controls.';
    const emptyRoutes = new Set([
        '/dashboard/campaigns', '/dashboard/agent-configurations',
        '/dashboard/prepared-actions', '/dashboard/agent-runs',
        '/dashboard/reports/campaigns'
    ]);
    window.fetch = async (input, options = {}) => {
        const url = new URL(typeof input === 'string' ? input : input.url, location.href);
        if (url.origin !== location.origin || !url.pathname.startsWith('/dashboard/')) {
            return originalFetch(input, options);
        }
        const method = (options.method || input.method || 'GET').toUpperCase();
        let status = 200;
        let data;
        if (method !== 'GET') {
            status = 503;
            data = { error: notice };
        } else if (emptyRoutes.has(url.pathname)) {
            data = [];
        } else if (url.pathname === '/dashboard/mode') {
            data = { mode: 'preview' };
        } else if (url.pathname === '/dashboard/status') {
            data = {
                database: 'Unavailable in static preview',
                googleAds: 'Unavailable in static preview',
                agents: 'Unavailable in static preview'
            };
        } else if (url.pathname === '/dashboard/system-logs') {
            data = { message: notice };
        } else {
            status = 404;
            data = { error: notice };
        }
        return new Response(JSON.stringify(data), {
            status, headers: { 'Content-Type': 'application/json' }
        });
    };
    document.addEventListener('DOMContentLoaded', () => {
        const banner = document.createElement('p');
        banner.setAttribute('role', 'status');
        banner.style.cssText = 'margin:0;padding:12px 20px;background:#172554;color:#eff6ff;font:14px/1.5 Inter,sans-serif;border-bottom:1px solid #3b82f6;';
        banner.textContent = 'GitHub Pages preview — no live account data. Campaign metrics are empty; live controls require a hosted backend.';
        const workspace = document.getElementById('workspace-area');
        workspace.before(banner);
        const observer = new MutationObserver(() => {
            const toggle = document.getElementById('toggle-mode');
            if (toggle && !toggle.disabled) {
                toggle.disabled = true;
                toggle.textContent = 'Preview only';
                toggle.title = notice;
            }
        });
        observer.observe(document.getElementById('header'), { childList: true, subtree: true });
    });
})();
