// ========== 主渲染逻辑 ==========

async function loadFaultStatsModels() {
    const data = await apiFetch('/fault-stats/models');
    if (Array.isArray(data)) {
        window._faultStatsModels = data;
        if (Store.state.currentPage === 'fault-analysis') {
            renderApp();
        }
    }
}

function getFaultVisibleDayCount() {
    const width = window.innerWidth || document.documentElement.clientWidth || 1440;
    const sidebarWidth = Store.state.sidebarCollapsed ? 80 : 260;
    const pagePadding = 48;
    const categoryColumnWidth = 140;
    const safetyGap = 40;
    const dayColumnWidth = 80;
    const availableWidth = width - sidebarWidth - pagePadding - categoryColumnWidth - safetyGap;
    return Math.max(7, Math.floor(availableWidth / dayColumnWidth));
}

function shiftFaultDateWindow(delta) {
    const { selectedModel } = Store.getState();
    if (!selectedModel) return;

    const modelId = selectedModel.id || selectedModel.modelId;
    const detail = window._faultStatsDetails[modelId];
    const totalDays = detail?.dates?.length || FAULT_STATS_FETCH_DAYS;
    const visibleDays = Math.min(window._faultStatsDetailWindow.visibleDays || getFaultVisibleDayCount(), totalDays);
    const maxOffset = Math.max(0, totalDays - visibleDays);
    const currentOffset = window._faultStatsDetailWindow.offset || 0;
    const nextOffset = Math.min(Math.max(currentOffset + delta, 0), maxOffset);

    if (nextOffset !== currentOffset) {
        window._faultStatsDetailWindow.offset = nextOffset;
        renderApp();
    }
}

// 车型网络故障分析页面
function renderFaultAnalysisPage() {
    const faultModels = window._faultStatsModels || vehicleModels;
    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen">
                ${renderHeader()}
                <div class="flex-1 p-6 overflow-auto">
                    <h2 class="text-xl font-semibold text-primary mb-6">车型网络故障分析</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        ${faultModels.map(m => renderFaultModelCard(m)).join('')}
                    </div>
                </div>
            </main>
        </div>`;
}

function renderFaultModelCard(model) {
    // 优先使用后端JSON统计数据，保留前端模拟计算作为回退
    const modelId = model.id || model.modelId;
    const totalVehicles = model.totalVehicles;
    const faultCount = model.faultCount ?? Math.floor(totalVehicles * 0.08);
    const signalWeakCount = model.signalWeakCount ?? Math.floor(faultCount * 0.4);
    const registerFailCount = model.registerFailCount ?? Math.floor(faultCount * 0.25);
    const offlineCount = model.offlineCount ?? Math.floor(faultCount * 0.35);
    const faultRate = model.faultRate ?? ((faultCount / totalVehicles) * 100).toFixed(2);

    return `
        <div onclick="Store.selectFaultModel('${modelId}'); renderApp();" class="bg-surface rounded-xl border border-border p-5 metric-card shadow-lg hover:shadow-xl hover:border-cta transition-all cursor-pointer">
            <div class="flex items-start justify-between mb-4">
                <div>
                    <h3 class="text-lg font-semibold text-primary">${model.name}</h3>
                    <p class="text-muted text-sm mt-1">${model.brand} · ${model.year}</p>
                </div>
                <span class="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">${faultCount} 故障</span>
            </div>

            <div class="space-y-3">
                <div class="flex items-center justify-between py-2 border-b border-border">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span class="text-muted text-sm">信号弱</span>
                    </div>
                    <span class="text-amber-400 font-medium">${signalWeakCount}</span>
                </div>
                <div class="flex items-center justify-between py-2 border-b border-border">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-red-500"></span>
                        <span class="text-muted text-sm">注册失败</span>
                    </div>
                    <span class="text-red-400 font-medium">${registerFailCount}</span>
                </div>
                <div class="flex items-center justify-between py-2">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-gray-400"></span>
                        <span class="text-muted text-sm">设备离线</span>
                    </div>
                    <span class="text-gray-400 font-medium">${offlineCount}</span>
                </div>
            </div>

            <div class="mt-4 pt-4 border-t border-border flex justify-between items-center">
                <span class="text-muted text-xs">故障率: ${faultRate}%</span>
                <span class="text-cta text-sm font-medium flex items-center gap-1">
                    查看详情
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </span>
            </div>
        </div>`;
}

// 故障详情页面
function renderFaultDetailPage() {
    const { selectedModel } = Store.getState();
    if (!selectedModel) return renderFaultAnalysisPage();

    const modelId = selectedModel.id || selectedModel.modelId;
    const detail = window._faultStatsDetails[modelId];

    // 故障分类
    const defaultFaultCategories = [
        { id: 'signal_weak', name: '信号弱', color: 'amber' },
        { id: 'network_resource', name: '网络资源不足', color: 'orange' },
        { id: 'no_network', name: '无网络资源', color: 'red' },
        { id: 'switch_4_5g', name: '4/5G切换', color: 'blue' },
        { id: 'restart', name: '重启', color: 'purple' },
        { id: 'bandwidth', name: '带宽竞争', color: 'cyan' },
        { id: 'register_fail', name: '注册失败', color: 'rose' },
        { id: 'handover_fail', name: '切换失败', color: 'pink' }
    ];
    const faultCategories = detail?.categories || defaultFaultCategories;

    // 生成日期列表（优先使用后端JSON详情数据）
    let allDates = detail?.dates;
    if (!allDates) {
        allDates = [];
        for (let i = 0; i < FAULT_STATS_FETCH_DAYS; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            allDates.push({
                date: date.toISOString().split('T')[0],
                display: `${month}-${day}`,
                weekday: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
            });
        }
    }

    const visibleDays = Math.min(getFaultVisibleDayCount(), allDates.length);
    const maxOffset = Math.max(0, allDates.length - visibleDays);
    const offset = Math.min(Math.max(window._faultStatsDetailWindow.offset || 0, 0), maxOffset);
    window._faultStatsDetailWindow.offset = offset;
    window._faultStatsDetailWindow.visibleDays = visibleDays;
    const dates = allDates.slice(offset, offset + visibleDays);
    const canGoPrev = offset < maxOffset;
    const canGoNext = offset > 0;
    const newestDisplay = dates[0]?.display || '--';
    const oldestDisplay = dates[dates.length - 1]?.display || '--';

    // 优先使用后端JSON详情数据，保留模拟数据作为回退
    let faultData = detail?.faultData;
    if (!faultData) {
        faultData = {};
        faultCategories.forEach(cat => {
            faultData[cat.id] = {};
            dates.forEach(d => {
                const count = Math.floor(Math.random() * 50) + 5;
                const total = Math.floor(Math.random() * 200) + 100;
                faultData[cat.id][d.date] = {
                    count: count,
                    total: total,
                    percent: ((count / total) * 100).toFixed(1)
                };
            });
        });
    }

    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen">
                ${renderHeader()}
                <div class="flex-1 p-6 overflow-hidden flex flex-col">
                    <!-- 日期滚动控制 -->
                    <div class="bg-surface rounded-xl border border-border shadow-lg p-4 mb-4">
                        <div class="flex items-center justify-between">
                            <button onclick="shiftFaultDateWindow(1)" class="flex items-center gap-1 px-4 py-2 bg-background hover:bg-border rounded-lg transition-colors ${canGoPrev ? 'cursor-pointer text-primary' : 'cursor-not-allowed text-muted opacity-50'} font-medium border border-border">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                                前一天
                            </button>
                            <div class="flex items-center gap-2 text-muted">
                                <span>共显示 ${visibleDays} 天数据</span>
                                <span class="text-border">|</span>
                                <span>${oldestDisplay} 至 ${newestDisplay}</span>
                            </div>
                            <button onclick="shiftFaultDateWindow(-1)" class="flex items-center gap-1 px-4 py-2 bg-background hover:bg-border rounded-lg transition-colors ${canGoNext ? 'cursor-pointer text-primary' : 'cursor-not-allowed text-muted opacity-50'} font-medium border border-border">
                                后一天
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                            </button>
                        </div>
                    </div>

                    <!-- 数据表格 -->
                    <div class="bg-surface rounded-xl border border-border shadow-lg overflow-hidden flex-1">
                        <div id="fault-table-wrapper" class="overflow-x-auto h-full" style="scrollbar-width: thin; scrollbar-color: #475569 #1E293B;">
                            <style>
                                #fault-table-wrapper::-webkit-scrollbar { height: 12px; }
                                #fault-table-wrapper::-webkit-scrollbar-track { background: #1E293B; border-radius: 6px; }
                                #fault-table-wrapper::-webkit-scrollbar-thumb { background: #475569; border-radius: 6px; }
                                #fault-table-wrapper::-webkit-scrollbar-thumb:hover { background: #64748b; }
                            </style>
                            <table class="text-sm" style="min-width: max-content;">
                                <thead class="bg-background sticky top-0 z-10">
                                    <tr>
                                        <th class="px-4 py-3 text-left font-semibold text-primary border-r border-border w-[140px] sticky left-0 bg-background z-20">故障分类</th>
                                        ${dates.map(d => `
                                            <th class="px-3 py-3 text-center font-semibold text-primary min-w-[80px]">
                                                <div class="flex flex-col">
                                                    <span>${d.display}</span>
                                                    <span class="text-xs font-normal text-muted">周${d.weekday}</span>
                                                </div>
                                            </th>
                                        `).join('')}
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-border">
                                    ${faultCategories.map((cat, index) => `
                                        <tr class="${index % 2 === 0 ? 'bg-surface' : 'bg-background'} hover:bg-blue-500/10 transition-colors">
                                            <td class="px-4 py-4 border-r border-border sticky left-0 ${index % 2 === 0 ? 'bg-surface' : 'bg-background'} z-10">
                                                <div class="flex items-center gap-2">
                                                    <span class="w-3 h-3 rounded-full bg-${cat.color}-500"></span>
                                                    <span class="font-medium text-primary whitespace-nowrap">${cat.name}</span>
                                                </div>
                                            </td>
                                            ${dates.map(d => {
                                                const data = faultData?.[cat.id]?.[d.date] || { count: 0, percent: '0.0' };
                                                const bgColor = data.percent > 30 ? 'bg-red-500/20' : data.percent > 15 ? 'bg-amber-500/20' : '';
                                                const textColor = data.percent > 30 ? 'text-red-400' : data.percent > 15 ? 'text-amber-400' : 'text-primary';
                                                return `
                                                    <td class="px-3 py-3 text-center ${bgColor}">
                                                        <div class="flex flex-col items-center">
                                                            <span class="font-semibold ${textColor}">${data.count}</span>
                                                            <span class="text-xs text-muted">${data.percent}%</span>
                                                        </div>
                                                    </td>
                                                `;
                                            }).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- 图例说明 -->
                    <div class="mt-4 flex items-center justify-center gap-6 text-sm text-muted">
                        <div class="flex items-center gap-2">
                            <div class="w-4 h-4 bg-red-500/20 rounded border border-red-500/40"></div>
                            <span>占比 &gt; 30%</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-4 h-4 bg-amber-500/20 rounded border border-amber-500/40"></div>
                            <span>占比 15% - 30%</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="w-4 h-4 bg-surface border border-border rounded"></div>
                            <span>占比 &lt; 15%</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>`;
}

// 滚动故障表格
function scrollFaultTable(distance) {
    const wrapper = document.getElementById('fault-table-wrapper');
    if (wrapper) {
        wrapper.scrollBy({ left: distance, behavior: 'smooth' });
    }
}
