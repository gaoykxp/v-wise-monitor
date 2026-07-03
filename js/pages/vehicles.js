// ========== 车型管理页面 ==========

function renderModelsPage() {
    // 使用后端实时数据（如果有）或静态数据
    const models = window._liveModels || vehicleModels;
    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen">
                ${renderHeader()}
                <div class="flex-1 p-6 overflow-auto">
                    <h2 class="text-xl font-semibold text-primary mb-6">车型列表</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        ${models.map(m => renderModelCard(m)).join('')}
                    </div>
                </div>
            </main>
        </div>`;
}

function renderModelCard(model) {
    const onlineCount = model.onlineCount !== undefined ? model.onlineCount : Math.floor(model.totalVehicles * 0.85);
    const offlineCount = model.offlineCount !== undefined ? model.offlineCount : model.totalVehicles - onlineCount;
    return `
        <div onclick="Store.selectModel('${model.id}'); renderApp();" class="bg-surface rounded-xl border border-border p-5 metric-card cursor-pointer hover:border-cta hover:shadow-lg shadow-md">
            <div class="flex items-start justify-between mb-4">
                <div><h3 class="text-lg font-semibold text-primary">${model.name}</h3><p class="text-muted text-sm mt-1">${model.brand} · ${model.year}</p></div>
                <span class="px-2 py-1 bg-cta/20 text-cta text-xs rounded-full">${model.description}</span>
            </div>
            <div class="flex items-center justify-between text-sm mb-4">
                <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-cta"></span><span class="text-cta font-medium">在线 ${onlineCount}</span></div>
                <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-amber-500"></span><span class="text-amber-400 font-medium">离线 ${offlineCount}</span></div>
            </div>
            <div class="pt-3 border-t border-border flex items-center justify-between">
                <span class="text-muted text-xs">点击查看车辆列表</span>
                <svg class="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </div>
            <div class="pt-2 mt-2 border-t border-border/50">
                <button onclick="event.stopPropagation(); Store.goToAlertSettings('${model.id}'); renderApp();"
                    class="w-full px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg text-sm transition-colors cursor-pointer font-medium flex items-center justify-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    预警设置
                </button>
            </div>
        </div>`;
}

// ========== 车辆列表页面 ==========

function renderVehiclesPage() {
    const { selectedModel } = Store.getState();
    const vehicles = selectedModel ? vehiclesByModel[selectedModel.id] : [];

    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen">
                ${renderHeader()}
                <div class="flex-1 p-6 overflow-auto">
                    <div class="mb-4 flex items-center justify-between">
                        <div class="flex-1 max-w-md">
                            <div class="relative">
                                <svg class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                <input type="text" id="vehicle-search" placeholder="搜索车辆VID或IMEI..." class="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-primary placeholder-muted focus:outline-none focus:border-cta transition-colors shadow-md" onkeyup="searchVehicles(event)">
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="flex items-center gap-2 px-3 py-2 bg-cta/20 rounded-lg"><span class="w-2 h-2 rounded-full bg-cta"></span><span class="text-sm text-cta font-medium">在线 ${vehicles.filter(v => v.status === 'online').length}</span></div>
                            <div class="flex items-center gap-2 px-3 py-2 bg-amber-500/20 rounded-lg"><span class="w-2 h-2 rounded-full bg-amber-500"></span><span class="text-sm text-amber-400 font-medium">离线 ${vehicles.filter(v => v.status === 'offline').length}</span></div>
                        </div>
                    </div>
                    <div class="bg-surface rounded-xl border border-border overflow-hidden shadow-lg">
                        <div class="grid grid-cols-7 gap-4 px-6 py-3 bg-background border-b border-border text-sm font-medium text-muted">
                            <div>车辆VID</div><div>IMEI</div><div>状态</div><div>最后更新</div><div>告警</div><div>操作</div><div>历史追溯</div>
                        </div>
                        <div id="vehicle-list" class="divide-y divide-border max-h-[600px] overflow-auto">
                            ${vehicles.map(v => renderVehicleRow(v)).join('')}
                        </div>
                    </div>
                </div>
            </main>
        </div>`;
}

function renderVehicleRow(vehicle) {
    const lastUpdate = new Date(vehicle.lastUpdate).toLocaleString('zh-CN');
    const statusClass = vehicle.status === 'online' ? 'bg-cta' : 'bg-amber-500';
    const statusText = vehicle.status === 'online' ? '在线' : '离线';
    return `
        <div class="grid grid-cols-7 gap-4 px-6 py-4 items-center hover:bg-background/50 transition-colors">
            <div><span class="text-primary font-medium">${vehicle.vid}</span></div>
            <div><span class="text-muted font-mono">${vehicle.imei || vehicle.vid}</span></div>
            <div><div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full ${statusClass}"></span><span class="${vehicle.status === 'online' ? 'text-cta' : 'text-amber-400'} font-medium">${statusText}</span></div></div>
            <div><span class="text-muted">${lastUpdate}</span></div>
            <div>${vehicle.alertCount > 0 ? `<span class="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">${vehicle.alertCount} 条</span>` : `<span class="text-muted">无</span>`}</div>
            <div><button onclick="Store.selectVehicle('${vehicle.vid}'); renderApp();" class="px-3 py-1.5 bg-cta/20 text-cta hover:bg-cta/30 rounded-lg text-sm transition-colors cursor-pointer font-medium">查看详情</button></div>
            <div><button onclick="Store.viewHistory('${vehicle.vid}'); renderApp();" class="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-sm transition-colors cursor-pointer font-medium">查看历史网况</button></div>
        </div>`;
}

function searchVehicles(event) {
    const searchTerm = event.target.value.toLowerCase();
    const { selectedModel } = Store.getState();
    if (!selectedModel) return;

    // 优先从后端API搜索
    if (searchTerm.length > 0) {
        apiFetch(`/models/${selectedModel.id}/vehicles?search=${encodeURIComponent(searchTerm)}`).then(result => {
            if (result && result.length > 0) {
                document.getElementById('vehicle-list').innerHTML = result.map(v => renderVehicleRow(v)).join('');
                return;
            }
        });
    }

    // 回退到本地搜索
    const vehicles = vehiclesByModel[selectedModel.id] || [];
    const filtered = searchTerm
        ? vehicles.filter(v => v.vid.toLowerCase().includes(searchTerm) || (v.imei || v.vid).toLowerCase().includes(searchTerm))
        : vehicles;
    document.getElementById('vehicle-list').innerHTML = filtered.map(v => renderVehicleRow(v)).join('');
}
