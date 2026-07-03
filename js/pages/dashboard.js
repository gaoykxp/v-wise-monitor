// ========== 仪表盘页面 ==========

async function loadDashboardStats() {
    const stats = await apiFetch('/dashboard');
    if (stats) {
        window._dashboardStats = stats;
    }
}

function renderDashboardPage() {
    // 优先使用后端数据，回退到模拟数据
    const stats = window._dashboardStats;
    const totalVehicles = stats ? stats.totalVehicles : vehicleModels.reduce((sum, m) => sum + m.totalVehicles, 0);
    const onlineVehicles = stats ? stats.onlineVehicles : Math.floor(totalVehicles * 0.94);
    const offlineVehicles = stats ? stats.offlineVehicles : totalVehicles - onlineVehicles;
    const alertCount = stats ? stats.alertCount : 0;

    // 异步加载后端数据
    loadDashboardStats().then(() => {
        // 数据加载后不重新渲染整个页面，只更新数字
        const statCards = document.querySelectorAll('.stat-value');
        if (statCards.length >= 4 && window._dashboardStats) {
            statCards[0].textContent = window._dashboardStats.totalVehicles.toLocaleString();
            statCards[1].textContent = window._dashboardStats.onlineVehicles.toLocaleString();
            statCards[2].textContent = window._dashboardStats.offlineVehicles.toLocaleString();
            statCards[3].textContent = window._dashboardStats.alertCount.toLocaleString();
        }
    });

    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen">
                ${renderHeader()}
                <div class="flex-1 p-6 overflow-auto">
                    <h2 class="text-xl font-semibold text-primary mb-6">系统概览</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        ${renderStatCard('总车辆数', totalVehicles.toLocaleString(), '辆', 'green')}
                        ${renderStatCard('在线车辆', onlineVehicles.toLocaleString(), '辆', 'blue')}
                        ${renderStatCard('离线车辆', offlineVehicles.toLocaleString(), '辆', 'yellow')}
                        ${renderStatCard('告警数', alertCount.toLocaleString(), '条', 'red')}
                    </div>
                </div>
            </main>
        </div>`;
}

function renderStatCard(title, value, unit, color) {
    const colorClass = {
        green: 'text-cta bg-cta/20',
        blue: 'text-blue-400 bg-blue-500/20',
        yellow: 'text-amber-400 bg-amber-500/20',
        red: 'text-red-400 bg-red-500/20'
    };
    const icons = {
        green: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>`,
        blue: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"/></svg>`,
        yellow: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.292 8.292l4.243 4.243"/></svg>`,
        red: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`
    };
    return `<div class="bg-surface rounded-xl border border-border p-6 metric-card shadow-lg"><div class="flex items-center justify-between mb-3"><span class="text-muted text-sm">${title}</span><div class="w-10 h-10 rounded-lg ${colorClass[color]} flex items-center justify-center">${icons[color]}</div></div><div class="flex items-baseline gap-2"><span class="text-3xl font-bold text-primary">${value}</span><span class="text-muted text-sm">${unit}</span></div></div>`;
}
