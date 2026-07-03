// ========== 车载网络SDK管理页面 ==========

function renderSdkManagementPage() {
    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen">
                ${renderHeader()}
                <div class="flex-1 p-6 overflow-auto">
                    <h2 class="text-xl font-semibold text-primary mb-6">车载网络SDK管理</h2>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- OTA管理模块 -->
                        <div class="bg-surface rounded-xl border border-border shadow-lg overflow-hidden">
                            <div class="p-4 bg-background border-b border-border">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 class="font-semibold text-primary">OTA管理</h3>
                                        <p class="text-xs text-muted">SDK版本升级管理</p>
                                    </div>
                                </div>
                            </div>
                            <div class="p-4 space-y-4">
                                <!-- 当前版本信息 -->
                                <div class="p-3 bg-background rounded-lg">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="text-sm text-muted">当前版本</span>
                                        <span class="text-sm font-medium text-primary">v2.3.1</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="text-sm text-muted">最新版本</span>
                                        <span class="text-sm font-medium text-cta">v2.4.0</span>
                                    </div>
                                </div>

                                <!-- 升级统计 -->
                                <div class="space-y-2">
                                    <div class="flex justify-between text-sm">
                                        <span class="text-muted">升级成功率</span>
                                        <span class="text-cta font-medium">98.5%</span>
                                    </div>
                                </div>

                                <div class="pt-3 border-t border-border">
                                    <button onclick="Store.goToOtaManagement(); renderApp();" class="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors cursor-pointer font-medium text-sm">
                                        版本升级管理
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- SDK数据采集管理模块 -->
                        <div class="bg-surface rounded-xl border border-border shadow-lg overflow-hidden">
                            <div class="p-4 bg-background border-b border-border">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 class="font-semibold text-primary">SDK数据采集管理</h3>
                                        <p class="text-xs text-muted">网络数据采集配置</p>
                                    </div>
                                </div>
                            </div>
                            <div class="p-4 space-y-4">
                                <!-- 采集状态 -->
                                <div class="p-3 bg-background rounded-lg">
                                    <div class="flex items-center justify-between mb-3">
                                        <span class="text-sm text-muted">采集开关</span>
                                        <button id="collect-toggle" onclick="toggleCollection()" class="relative w-12 h-6 bg-cta rounded-full transition-colors cursor-pointer">
                                            <span class="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform"></span>
                                        </button>
                                    </div>
                                    <div class="text-xs text-muted">
                                        状态: <span class="text-cta font-medium">已开启</span>
                                    </div>
                                </div>

                                <!-- 采集配置 -->
                                <div class="space-y-3">
                                    <div class="flex justify-between text-sm">
                                        <span class="text-muted">今日采集量</span>
                                        <span class="text-primary font-medium">128,456 条</span>
                                    </div>
                                </div>

                                <div class="pt-3 border-t border-border">
                                    <button onclick="Store.goToSdkCollectionConfig(); renderApp();" class="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors cursor-pointer font-medium text-sm">
                                        采集配置
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- SDK Ping测管理模块 -->
                        <div class="bg-surface rounded-xl border border-border shadow-lg overflow-hidden">
                            <div class="p-4 bg-background border-b border-border">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-lg bg-cta flex items-center justify-center">
                                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 class="font-semibold text-primary">SDK Ping测管理</h3>
                                        <p class="text-xs text-muted">网络质量Ping测试</p>
                                    </div>
                                </div>
                            </div>
                            <div class="p-4 space-y-4">
                                <!-- Ping测状态 -->
                                <div class="p-3 bg-background rounded-lg">
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="text-sm text-muted">Ping测状态</span>
                                        <span class="px-2 py-0.5 bg-cta/30 text-cta text-xs rounded-full font-medium">运行中</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="text-sm text-muted">测试目标</span>
                                        <span class="text-xs text-primary font-mono">8.8.8.8</span>
                                    </div>
                                </div>

                                <!-- Ping测统计 -->
                                <div class="space-y-2">
                                    <div class="flex justify-between text-sm">
                                        <span class="text-muted">测试车辆数</span>
                                        <span class="text-primary font-medium">4,590 辆</span>
                                    </div>
                                </div>

                                <div class="pt-3 border-t border-border">
                                    <button onclick="Store.goToPingTasks(); renderApp();" class="w-full py-2 bg-cta hover:bg-cta/90 text-white rounded-lg transition-colors cursor-pointer font-medium text-sm">
                                        配置Ping测任务
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 最近操作记录 -->
                    <div class="mt-6 bg-surface rounded-xl border border-border shadow-lg overflow-hidden">
                        <div class="p-4 border-b border-border bg-background">
                            <h3 class="font-semibold text-primary">最近操作记录</h3>
                        </div>
                        <div class="divide-y divide-border">
                            ${[
                                { time: '2026-04-10 14:30', action: 'OTA升级', target: '智行 X1 全部车辆', status: 'success', user: '管理员' },
                                { time: '2026-04-10 11:20', action: '修改采集频率', target: '全局配置', status: 'success', user: '运维人员' },
                                { time: '2026-04-09 16:45', action: 'Ping测配置', target: '新增测试目标 114.114.114.114', status: 'success', user: '管理员' },
                                { time: '2026-04-09 09:30', action: '数据导出', target: '领航者 Pro 近7天数据', status: 'success', user: '运维人员' },
                            ].map(r => `
                                <div class="px-4 py-3 flex items-center justify-between hover:bg-background/50 transition-colors">
                                    <div class="flex items-center gap-4">
                                        <span class="text-sm text-muted w-32">${r.time}</span>
                                        <span class="text-sm font-medium text-primary">${r.action}</span>
                                        <span class="text-sm text-muted">${r.target}</span>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class="px-2 py-0.5 bg-cta/20 text-cta text-xs rounded-full">成功</span>
                                        <span class="text-xs text-muted">${r.user}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </main>
        </div>`;
}

function toggleCollection() {
    const btn = document.getElementById('collect-toggle');
    if (btn) {
        btn.classList.toggle('bg-cta');
        btn.classList.toggle('bg-gray-300');
        const span = btn.querySelector('span');
        if (span) {
            span.classList.toggle('right-1');
            span.classList.toggle('left-1');
        }
    }
}
