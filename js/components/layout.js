// ========== 渲染函数 ==========

function renderSidebar() {
    const { currentUser, sidebarCollapsed, currentMenu, currentPage, selectedModel } = Store.getState();
    if (!currentUser) return '';
    const width = sidebarCollapsed ? 'w-16' : 'w-64';

    return `
        <aside class="${width} bg-surface border-r border-border flex flex-col transition-all duration-300 shadow-lg">
            <!-- Logo -->
            <div class="h-16 flex items-center justify-start px-4 border-b border-border">
                ${sidebarCollapsed ?
                    `<div class="w-8 h-8 bg-cta rounded-lg flex items-center justify-center">
                        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
                    </div>`
                    :
                    `<div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-cta rounded-lg flex items-center justify-center">
                            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
                        </div>
                        <div><span class="text-lg font-semibold text-primary">V-Wise</span><span class="text-xs text-muted block">车辆网络数据分析中心</span></div>
                    </div>`
                }
            </div>

            <!-- 主菜单 -->
            <nav class="flex-1 py-4">
                <ul class="space-y-1 px-2">
                    <li>
                        <button onclick="Store.goToDashboard(); renderApp();" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${currentMenu === 'dashboard' ? 'bg-cta/20 text-cta' : 'text-muted hover:bg-secondary hover:text-primary'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                            ${!sidebarCollapsed ? '<span class="font-medium">仪表盘</span>' : ''}
                        </button>
                    </li>
                    <li>
                        <button onclick="Store.goToModels(); renderApp();" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${currentMenu === 'models' ? 'bg-cta/20 text-cta' : 'text-muted hover:bg-secondary hover:text-primary'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                            ${!sidebarCollapsed ? '<span class="font-medium">车辆网况监控</span>' : ''}
                        </button>
                    </li>
                    <li>
                        <button onclick="Store.goToSingleVehicleFaultDiagnosis(); renderApp();" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${currentMenu === 'single-vehicle-fault-diagnosis' ? 'bg-cta/20 text-cta' : 'text-muted hover:bg-secondary hover:text-primary'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2a4 4 0 014-4h2m-6 6l-2 2m2-2l2 2m3-15a9 9 0 100 18 9 9 0 000-18zm3 9h.01"/></svg>
                            ${!sidebarCollapsed ? '<span class="font-medium">车辆网络故障定界</span>' : ''}
                        </button>
                    </li>
                    <li>
                        <button onclick="Store.goToFaultAnalysis(); renderApp();" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${currentMenu === 'fault-analysis' ? 'bg-cta/20 text-cta' : 'text-muted hover:bg-secondary hover:text-primary'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                            ${!sidebarCollapsed ? '<span class="font-medium">车型网络故障分析</span>' : ''}
                        </button>
                    </li>
                    <li>
                        <button onclick="Store.goToSdkManagement(); renderApp();" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${currentMenu === 'sdk-management' ? 'bg-cta/20 text-cta' : 'text-muted hover:bg-secondary hover:text-primary'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            ${!sidebarCollapsed ? '<span class="font-medium">车载网络SDK管理</span>' : ''}
                        </button>
                    </li>
                    <li>
                        <button onclick="Store.goToHeatmap(); renderApp();" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${currentMenu === 'heatmap' ? 'bg-cta/20 text-cta' : 'text-muted hover:bg-secondary hover:text-primary'}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                            ${!sidebarCollapsed ? '<span class="font-medium">网络覆盖热力图</span>' : ''}
                        </button>
                    </li>
                </ul>
            </nav>

            <!-- 用户信息 -->
            <div class="p-3 border-t border-border">
                ${sidebarCollapsed ?
                    `<div class="w-8 h-8 mx-auto rounded-full bg-cta/20 flex items-center justify-center text-sm font-medium text-cta cursor-pointer" onclick="Store.logout(); renderApp();" title="点击退出">${currentUser.name.charAt(0)}</div>`
                    :
                    `<div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-cta/20 flex items-center justify-center text-sm font-medium text-cta">${currentUser.name.charAt(0)}</div>
                        <div class="flex-1 min-w-0"><p class="text-sm font-medium text-primary truncate">${currentUser.name}</p><p class="text-xs text-muted truncate">${currentUser.role === 'admin' ? '管理员' : currentUser.role === 'operator' ? '运维' : '观察员'}</p></div>
                        <button onclick="Store.logout(); renderApp();" class="p-1.5 rounded-lg text-muted hover:bg-secondary hover:text-primary transition-colors cursor-pointer" title="退出">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                        </button>
                    </div>`
                }
            </div>

            <!-- 收起按钮 -->
            <div class="p-3 border-t border-border">
                <button onclick="Store.toggleSidebar(); renderApp();" class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted hover:bg-secondary hover:text-primary transition-colors cursor-pointer">
                    <svg class="w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
                    ${!sidebarCollapsed ? '<span class="font-medium text-sm">收起菜单</span>' : ''}
                </button>
            </div>
        </aside>`;
}

function renderHeader() {
    const { currentUser, currentPage, currentMenu, selectedModel, selectedVehicle, theme } = Store.getState();
    if (!currentUser) return '';

    let breadcrumbs = [];
    if (currentMenu === 'dashboard') {
        breadcrumbs = [{ label: '仪表盘', active: true }];
    } else if (currentMenu === 'models') {
        if (currentPage === 'models') {
            breadcrumbs = [{ label: '车辆网况监控', active: true }];
        } else if (currentPage === 'vehicles' && selectedModel) {
            breadcrumbs = [
                { label: '车辆网况监控', action: 'goToModelList' },
                { label: selectedModel.name, active: true }
            ];
        } else if (currentPage === 'vehicle-detail' && selectedModel && selectedVehicle) {
            breadcrumbs = [
                { label: '车辆网况监控', action: 'goToModelList' },
                { label: selectedModel.name, action: 'selectModel("' + selectedModel.id + '")' },
                { label: selectedVehicle.vid, active: true }
            ];
        } else if (currentPage === 'vehicle-history' && selectedModel && selectedVehicle) {
            breadcrumbs = [
                { label: '车辆网况监控', action: 'goToModelList' },
                { label: selectedModel.name, action: 'selectModel("' + selectedModel.id + '")' },
                { label: selectedVehicle.vid + ' 历史网况', active: true }
            ];
        }
    } else if (currentMenu === 'fault-analysis') {
        if (currentPage === 'fault-analysis') {
            breadcrumbs = [{ label: '车型网络故障分析', active: true }];
        } else if (currentPage === 'fault-detail' && selectedModel) {
            breadcrumbs = [
                { label: '车型网络故障分析', action: 'goToFaultAnalysisList' },
                { label: selectedModel.name, active: true }
            ];
        }
    } else if (currentMenu === 'single-vehicle-fault-diagnosis') {
        if (currentPage === 'single-vehicle-fault-diagnosis') {
            breadcrumbs = [{ label: '车辆网络故障定界', active: true }];
        } else if (currentPage === 'single-vehicle-fault-vehicles' && selectedModel) {
            breadcrumbs = [
                { label: '车辆网络故障定界', action: 'goToSingleVehicleFaultDiagnosisList' },
                { label: selectedModel.name, active: true }
            ];
        } else if (currentPage === 'single-vehicle-fault-boundary-detail' && selectedModel && selectedVehicle) {
            breadcrumbs = [
                { label: '车辆网络故障定界', action: 'goToSingleVehicleFaultDiagnosisList' },
                { label: selectedModel.name, action: 'goToSingleVehicleFaultVehicleList' },
                { label: selectedVehicle.vid + ' 定界详情', active: true }
            ];
        }
    } else if (currentMenu === 'sdk-management') {
        if (currentPage === 'sdk-management') {
            breadcrumbs = [{ label: '车载网络SDK管理', active: true }];
        } else if (currentPage === 'ota-management') {
            breadcrumbs = [
                { label: '车载网络SDK管理', action: 'goToSdkManagementList' },
                { label: 'OTA版本升级管理', active: true }
            ];
        }
    } else if (currentMenu === 'heatmap') {
        breadcrumbs = [{ label: '网络覆盖热力图', active: true }];
    }

    return `
        <header class="h-16 bg-surface border-b border-border flex items-center justify-between px-6 shadow-lg">
            <div class="flex items-center gap-2">
                ${breadcrumbs.map((item, i) => {
                    const prev = i > 0 ? '<span class="text-muted mx-2">/</span>' : '';
                    if (item.active) {
                        return `${prev}<span class="text-primary font-semibold">${item.label}</span>`;
                    } else {
                        return `${prev}<button onclick="Store.${item.action}(); renderApp();" class="text-muted hover:text-primary transition-colors cursor-pointer">${item.label}</button>`;
                    }
                }).join('')}
            </div>
            <div class="flex flex-col items-end gap-1 text-sm text-muted">
                <span id="header-time">${new Date().toLocaleString('zh-CN')}</span>
                <div class="flex items-center gap-1 rounded-lg border border-border bg-background/70 p-1">
                    <button onclick="Store.setTheme('dark')" class="px-2 py-0.5 rounded-md text-xs transition-colors ${theme === 'dark' ? 'bg-cta text-white' : 'text-muted hover:bg-secondary hover:text-primary'}">暗黑</button>
                    <button onclick="Store.setTheme('light')" class="px-2 py-0.5 rounded-md text-xs transition-colors ${theme === 'light' ? 'bg-cta text-white' : 'text-muted hover:bg-secondary hover:text-primary'}">清淡</button>
                </div>
            </div>
        </header>`;
}
