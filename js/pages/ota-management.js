// ========== OTA版本升级管理页面 ==========

// OTA版本数据
const otaVersionData = vehicleModels.map(model => {
    const currentVersions = ['v2.1.0', 'v2.2.1', 'v2.3.1', 'v2.3.5', 'v2.4.0'];
    const latestVersions = ['v2.4.0', 'v2.4.0', 'v2.4.0', 'v2.4.0', 'v2.4.0'];
    const currentIndex = Math.floor(Math.random() * 4);
    const upgradedCount = Math.floor(model.totalVehicles * (0.3 + Math.random() * 0.5));
    const pendingCount = model.totalVehicles - upgradedCount;
    const successRate = 95 + Math.random() * 4;
    const hasUpgrade = currentVersions[currentIndex] !== latestVersions[currentIndex];

    return {
        modelId: model.id,
        modelName: model.name,
        brand: model.brand,
        currentVersion: currentVersions[currentIndex],
        latestVersion: latestVersions[currentIndex],
        upgradedCount: upgradedCount,
        pendingCount: pendingCount,
        successRate: successRate.toFixed(1),
        hasUpgrade: hasUpgrade,
        status: hasUpgrade ? '待升级' : '已是最新',
        lastUpdateTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN')
    };
});

function renderOtaManagementPage() {
    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen">
                ${renderHeader()}
                <div class="flex-1 p-6 overflow-auto">
                    <!-- 页面标题和操作 -->
                    <div class="mb-6 flex items-center justify-between">
                        <h2 class="text-xl font-semibold text-primary">OTA版本升级管理</h2>
                        <div class="flex items-center gap-3">
                            <button class="px-4 py-2 bg-cta text-white rounded-lg hover:bg-cta/90 transition-colors cursor-pointer font-medium text-sm flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                                </svg>
                                批量升级
                            </button>
                        </div>
                    </div>

                    <!-- 版本概览卡片 -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div class="bg-surface rounded-xl border border-border p-5 shadow-lg">
                            <div class="flex items-center justify-between mb-3">
                                <span class="text-muted text-sm">最新SDK版本</span>
                                <div class="w-8 h-8 rounded-lg bg-cta/20 flex items-center justify-center">
                                    <svg class="w-4 h-4 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
                                    </svg>
                                </div>
                            </div>
                            <div class="text-2xl font-bold text-cta">v2.4.0</div>
                            <div class="text-xs text-muted mt-1">发布日期: 2026-04-01</div>
                        </div>
                        <div class="bg-surface rounded-xl border border-border p-5 shadow-lg">
                            <div class="flex items-center justify-between mb-3">
                                <span class="text-muted text-sm">已升级车辆</span>
                                <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                </div>
                            </div>
                            <div class="text-2xl font-bold text-blue-400">${otaVersionData.reduce((sum, d) => sum + d.upgradedCount, 0).toLocaleString()}</div>
                            <div class="text-xs text-muted mt-1">占总车辆 ${((otaVersionData.reduce((sum, d) => sum + d.upgradedCount, 0) / vehicleModels.reduce((sum, m) => sum + m.totalVehicles, 0)) * 100).toFixed(1)}%</div>
                        </div>
                        <div class="bg-surface rounded-xl border border-border p-5 shadow-lg">
                            <div class="flex items-center justify-between mb-3">
                                <span class="text-muted text-sm">待升级车辆</span>
                                <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                    <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                </div>
                            </div>
                            <div class="text-2xl font-bold text-amber-400">${otaVersionData.reduce((sum, d) => sum + d.pendingCount, 0).toLocaleString()}</div>
                            <div class="text-xs text-muted mt-1">需要OTA升级</div>
                        </div>
                    </div>

                    <!-- 版本管理表格 -->
                    <div class="bg-surface rounded-xl border border-border shadow-lg overflow-hidden">
                        <div class="p-4 border-b border-border bg-background flex justify-between items-center">
                            <h3 class="font-semibold text-primary">各车型SDK版本详情</h3>
                            <span class="text-sm text-muted">共 ${otaVersionData.length} 个车型</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="bg-background sticky top-0">
                                    <tr class="text-muted text-left">
                                        <th class="px-6 py-3 font-medium">车型名称</th>
                                        <th class="px-6 py-3 font-medium">品牌</th>
                                        <th class="px-6 py-3 font-medium">当前版本</th>
                                        <th class="px-6 py-3 font-medium">最新版本</th>
                                        <th class="px-6 py-3 font-medium">升级状态</th>
                                        <th class="px-6 py-3 font-medium">已升级</th>
                                        <th class="px-6 py-3 font-medium">待升级</th>
                                        <th class="px-6 py-3 font-medium">成功率</th>
                                        <th class="px-6 py-3 font-medium">最后更新</th>
                                        <th class="px-6 py-3 font-medium">操作</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-border">
                                    ${otaVersionData.map((data, index) => `
                                        <tr class="${index % 2 === 0 ? 'bg-surface' : 'bg-background'} hover:bg-blue-500/10 transition-colors">
                                            <td class="px-6 py-4">
                                                <span class="font-medium text-primary">${data.modelName}</span>
                                            </td>
                                            <td class="px-6 py-4 text-muted">${data.brand}</td>
                                            <td class="px-6 py-4">
                                                <span class="px-2 py-1 bg-background rounded text-primary font-mono text-xs border border-border">${data.currentVersion}</span>
                                            </td>
                                            <td class="px-6 py-4">
                                                <span class="px-2 py-1 bg-cta/20 rounded text-cta font-mono text-xs font-medium">${data.latestVersion}</span>
                                            </td>
                                            <td class="px-6 py-4">
                                                ${data.hasUpgrade ?
                                                    `<span class="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">待升级</span>`
                                                    :
                                                    `<span class="px-2 py-1 bg-cta/20 text-cta rounded-full text-xs font-medium">已是最新</span>`
                                                }
                                            </td>
                                            <td class="px-6 py-4">
                                                <span class="text-blue-400 font-medium">${data.upgradedCount.toLocaleString()}</span>
                                                <span class="text-muted text-xs ml-1">辆</span>
                                            </td>
                                            <td class="px-6 py-4">
                                                <span class="text-amber-400 font-medium">${data.pendingCount.toLocaleString()}</span>
                                                <span class="text-muted text-xs ml-1">辆</span>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="flex items-center gap-2">
                                                    <div class="w-16 h-2 bg-background rounded-full overflow-hidden">
                                                        <div class="h-full ${parseFloat(data.successRate) >= 98 ? 'bg-cta' : parseFloat(data.successRate) >= 95 ? 'bg-blue-500' : 'bg-amber-500'}" style="width: ${data.successRate}%"></div>
                                                    </div>
                                                    <span class="${parseFloat(data.successRate) >= 98 ? 'text-cta' : parseFloat(data.successRate) >= 95 ? 'text-blue-400' : 'text-amber-400'} font-medium">${data.successRate}%</span>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 text-muted">${data.lastUpdateTime}</td>
                                            <td class="px-6 py-4">
                                                ${data.hasUpgrade ?
                                                    `<button class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs transition-colors cursor-pointer font-medium flex items-center gap-1">
                                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                                                        </svg>
                                                        升级
                                                    </button>`
                                                    :
                                                    `<button class="px-3 py-1.5 bg-background text-muted rounded-lg text-xs cursor-pointer font-medium flex items-center gap-1 border border-border">
                                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                        </svg>
                                                        已完成
                                                    </button>`
                                                }
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- 升级历史记录 -->
                    <div class="mt-6 bg-surface rounded-xl border border-border shadow-lg overflow-hidden">
                        <div class="p-4 border-b border-border bg-background">
                            <h3 class="font-semibold text-primary">最近升级记录</h3>
                        </div>
                        <div class="divide-y divide-border max-h-[300px] overflow-auto">
                            ${[
                                { time: '2026-04-10 14:30', model: '智行 X1', from: 'v2.3.1', to: 'v2.4.0', count: 1280, status: 'success', rate: '98.5%' },
                                { time: '2026-04-09 10:15', model: '城市精灵', from: 'v2.2.1', to: 'v2.3.5', count: 1560, status: 'success', rate: '97.2%' },
                                { time: '2026-04-08 16:45', model: '领航者 Pro', from: 'v2.3.1', to: 'v2.4.0', count: 428, status: 'partial', rate: '94.8%' },
                                { time: '2026-04-07 09:20', model: '闪电 GT', from: 'v2.1.0', to: 'v2.3.1', count: 340, status: 'success', rate: '99.1%' },
                                { time: '2026-04-06 13:30', model: '星际旅行者', from: 'v2.3.5', to: 'v2.4.0', count: 210, status: 'success', rate: '98.0%' },
                            ].map(r => `
                                <div class="px-4 py-3 flex items-center justify-between hover:bg-background/50 transition-colors">
                                    <div class="flex items-center gap-6">
                                        <span class="text-sm text-muted w-32">${r.time}</span>
                                        <span class="text-sm font-medium text-primary">${r.model}</span>
                                        <div class="flex items-center gap-2 text-sm">
                                            <span class="text-muted">${r.from}</span>
                                            <svg class="w-4 h-4 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                                            </svg>
                                            <span class="text-cta font-medium">${r.to}</span>
                                        </div>
                                        <span class="text-sm text-muted">${r.count} 辆</span>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        ${r.status === 'success' ?
                                            `<span class="px-2 py-0.5 bg-cta/20 text-cta text-xs rounded-full font-medium">成功</span>`
                                            :
                                            `<span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full font-medium">部分成功</span>`
                                        }
                                        <span class="text-sm text-muted">成功率: ${r.rate}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </main>
        </div>`;
}
