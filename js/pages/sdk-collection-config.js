// ========== SDK 数据采集配置页面 ==========

// 内存状态：当前 Tab、选中的车型、勾选的VID集合、VID搜索关键字、命中车辆、已下发配置列表
if (typeof window._sdkCollectionTab === 'undefined') window._sdkCollectionTab = 'model';
if (typeof window._sdkCollectionSelectedModelId === 'undefined') window._sdkCollectionSelectedModelId = '';
if (typeof window._sdkCollectionSelectedVids === 'undefined') window._sdkCollectionSelectedVids = {};
if (typeof window._sdkCollectionVidSearch === 'undefined') window._sdkCollectionVidSearch = '';
if (typeof window._sdkCollectionVehiclesByModel === 'undefined') window._sdkCollectionVehiclesByModel = {};
if (typeof window._sdkCollectionConfigs === 'undefined') window._sdkCollectionConfigs = [];

// 从后端拉取已下发的采集配置列表
async function loadSdkCollectionConfigs() {
    const data = await apiFetch('/sdk-collection-configs');
    if (Array.isArray(data)) {
        window._sdkCollectionConfigs = data;
        if (Store.state.currentPage === 'sdk-collection-config') renderApp();
    }
}

function getSdkCollectionConfigs() {
    return Array.isArray(window._sdkCollectionConfigs) ? window._sdkCollectionConfigs.slice() : [];
}

// 新增并下发采集配置（调用后端，后端负责 MQTT publish 到 probe/devices/{imei}/sys/commands）
async function postSdkCollectionConfig(payload) {
    return apiFetch('/sdk-collection-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

// 删除采集配置（调用后端）
async function deleteSdkCollectionConfigRemote(id) {
    return apiFetch(`/sdk-collection-configs/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// 拉取某车型车辆列表（API优先，静态回退）
async function loadSdkCollectionVehiclesForModel(modelId) {
    if (!modelId) return;
    const vehicles = await apiFetch(`/models/${modelId}/vehicles`);
    if (Array.isArray(vehicles) && vehicles.length) {
        window._sdkCollectionVehiclesByModel[modelId] = vehicles;
    }
    if (Store.state.currentPage === 'sdk-collection-config') renderApp();
}

function getSdkCollectionVehicles(modelId) {
    return (modelId && window._sdkCollectionVehiclesByModel[modelId]) || (modelId && vehiclesByModel[modelId]) || [];
}

// ---- Tab 切换 ----
function setSdkCollectionTab(tab) {
    window._sdkCollectionTab = tab;
    renderApp();
}

function setSdkCollectionModel(modelId) {
    window._sdkCollectionSelectedModelId = modelId;
    window._sdkCollectionSelectedVids = {};
    if (modelId) loadSdkCollectionVehiclesForModel(modelId);
    renderApp();
}

function toggleSdkCollectionVid(vid, checked) {
    if (checked) window._sdkCollectionSelectedVids[vid] = true;
    else delete window._sdkCollectionSelectedVids[vid];
}

function sdkCollectionSelectAll(checked) {
    const modelId = window._sdkCollectionSelectedModelId;
    const vehicles = getSdkCollectionVehicles(modelId);
    if (checked) vehicles.forEach(v => { window._sdkCollectionSelectedVids[v.vid] = true; });
    else window._sdkCollectionSelectedVids = {};
    renderApp();
}

function sdkCollectionSearchVid(event) {
    window._sdkCollectionVidSearch = event.target.value.trim();
    renderApp();
}

// 跨所有车型搜索 VID（用于按VID模式）
function searchSdkCollectionVehicles() {
    const term = (window._sdkCollectionVidSearch || '').toLowerCase();
    const all = Object.values(vehiclesByModel).flat();
    if (!term) return [];
    return all.filter(v => v.vid.toLowerCase().includes(term));
}

// ---- 提交配置 ----
async function submitSdkCollectionConfig(scope) {
    const form = document.getElementById('sdk-collection-form');
    if (!form) return;
    const data = new FormData(form);
    const name = (data.get('name') || '').trim();
    const category = data.get('category') || 'full';
    const frequency = data.get('frequency') || '每5分钟';
    const retention = data.get('retention') || '30天';
    if (!name) { alert('请填写配置名称'); return; }

    // 构造下发 payload。vid 即设备 imei；后端做 frequency→interval_sec 转换并 MQTT publish
    let payload;
    if (scope === 'vid') {
        const matched = searchSdkCollectionVehicles();
        if (!matched.length) { alert('未搜索到对应车辆，请输入有效的VID'); return; }
        payload = { name, scope: 'vid', vid: matched[0].vid, category, frequency, retention };
    } else {
        const modelId = window._sdkCollectionSelectedModelId;
        if (!modelId) { alert('请选择车型'); return; }
        const selectedVids = Object.keys(window._sdkCollectionSelectedVids);
        payload = { name, scope: 'model', modelId, vids: selectedVids, category, frequency, retention };
    }

    const result = await postSdkCollectionConfig(payload);
    if (result && result.success) {
        // 重置表单勾选状态
        window._sdkCollectionSelectedVids = {};
        if (form.reset) form.reset();
        await loadSdkCollectionConfigs();   // 刷新列表
    } else {
        alert('采集配置下发失败，请检查后端服务');
    }
}

async function deleteSdkCollectionConfig(id) {
    if (!confirm('确认删除该采集配置？')) return;
    const result = await deleteSdkCollectionConfigRemote(id);
    if (result && result.success) {
        await loadSdkCollectionConfigs();
    } else {
        alert('删除失败，请检查后端服务');
    }
}

// ---- 配置项渲染（两种模式共用）----
function renderSdkCollectionConfigFields(defaultName) {
    return `
        <label class="text-sm text-muted">配置名称<input name="name" required value="${defaultName || ''}" placeholder="如 智行X1核心指标采集" class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary"></label>
        <div class="text-sm text-muted">数据采集类别
            <div class="mt-2 space-y-2">
                <label class="flex items-start gap-2 p-3 bg-background rounded-lg border border-border cursor-pointer hover:border-cta transition-colors">
                    <input type="radio" name="category" value="full" checked class="mt-0.5 accent-[rgb(var(--color-cta))]">
                    <div>
                        <div class="text-primary font-medium">全量网络数据</div>
                        <div class="text-xs text-muted mt-0.5">RSRP/RSRQ/SINR/网络制式/CID/TAC/注册状态/错误码 + CPU/内存等系统资源</div>
                    </div>
                </label>
                <label class="flex items-start gap-2 p-3 bg-background rounded-lg border border-border cursor-pointer hover:border-cta transition-colors">
                    <input type="radio" name="category" value="core" class="mt-0.5 accent-[rgb(var(--color-cta))]">
                    <div>
                        <div class="text-primary font-medium">核心网络数据</div>
                        <div class="text-xs text-muted mt-0.5">error code、register status、CID/TAC、网络制式</div>
                    </div>
                </label>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
            <label class="text-sm text-muted">采集频率<select name="frequency" class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary">
                <option>每1分钟</option><option selected>每5分钟</option><option>每10分钟</option><option>每30分钟</option>
            </select></label>
            <label class="text-sm text-muted">数据保留<select name="retention" class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary">
                <option selected>30天</option><option>60天</option><option>90天</option>
            </select></label>
        </div>`;
}

// ---- 模式A：按车型配置 ----
function renderSdkCollectionModelTab() {
    const modelId = window._sdkCollectionSelectedModelId;
    const vehicles = getSdkCollectionVehicles(modelId);
    const selectedCount = Object.keys(window._sdkCollectionSelectedVids).length;
    const allChecked = vehicles.length > 0 && vehicles.every(v => window._sdkCollectionSelectedVids[v.vid]);

    return `
        <div class="space-y-4">
            <label class="text-sm text-muted">选择车型
                <select onchange="setSdkCollectionModel(this.value)" class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary">
                    <option value="">请选择车型</option>
                    ${vehicleModels.map(m => `<option value="${m.id}" ${m.id === modelId ? 'selected' : ''}>${m.name}（${m.totalVehicles}辆）</option>`).join('')}
                </select>
            </label>

            ${modelId ? `
                <div class="bg-background rounded-lg border border-border overflow-hidden">
                    <div class="flex items-center justify-between px-4 py-2 border-b border-border">
                        <label class="flex items-center gap-2 text-sm text-muted cursor-pointer">
                            <input type="checkbox" ${allChecked ? 'checked' : ''} onchange="sdkCollectionSelectAll(this.checked)" class="accent-[rgb(var(--color-cta))]">
                            全选
                        </label>
                        <span class="text-xs text-muted">共 ${vehicles.length} 辆，已选 ${selectedCount} 辆</span>
                    </div>
                    <div class="max-h-[280px] overflow-auto">
                        ${vehicles.length ? vehicles.map(v => `
                            <label class="flex items-center gap-3 px-4 py-2 border-b border-border last:border-0 cursor-pointer hover:bg-surface/50 transition-colors">
                                <input type="checkbox" ${window._sdkCollectionSelectedVids[v.vid] ? 'checked' : ''} onchange="toggleSdkCollectionVid('${v.vid}', this.checked)" class="accent-[rgb(var(--color-cta))]">
                                <span class="text-primary font-mono text-sm">${v.vid}</span>
                                <span class="text-muted text-sm">${v.plateNumber || ''}</span>
                                <span class="ml-auto px-2 py-0.5 rounded-full text-xs ${v.status === 'online' ? 'bg-cta/20 text-cta' : 'bg-amber-500/20 text-amber-400'}">${v.status === 'online' ? '在线' : '离线'}</span>
                            </label>
                        `).join('') : '<div class="px-4 py-6 text-center text-muted text-sm">暂无车辆数据</div>'}
                    </div>
                </div>
            ` : '<div class="text-sm text-muted text-center py-6">请先选择车型</div>'}
        </div>`;
}

// ---- 模式B：按VID搜索配置 ----
function renderSdkCollectionVidTab() {
    const matched = searchSdkCollectionVehicles();
    return `
        <div class="space-y-4">
            <label class="text-sm text-muted">搜索车辆 VID
                <input type="text" oninput="sdkCollectionSearchVid(event)" value="${window._sdkCollectionVidSearch || ''}" placeholder="输入车辆VID，如 VID0010001" class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:outline-none focus:border-cta">
            </label>
            ${window._sdkCollectionVidSearch ? (matched.length ? `
                <div class="bg-background rounded-lg border border-border p-4">
                    <div class="text-xs text-muted mb-2">命中车辆</div>
                    ${matched.slice(0, 5).map(v => `
                        <div class="flex items-center gap-3 py-1">
                            <span class="text-primary font-mono text-sm">${v.vid}</span>
                            <span class="text-muted text-sm">${v.plateNumber || ''}</span>
                            <span class="ml-auto px-2 py-0.5 rounded-full text-xs ${v.status === 'online' ? 'bg-cta/20 text-cta' : 'bg-amber-500/20 text-amber-400'}">${v.status === 'online' ? '在线' : '离线'}</span>
                        </div>
                    `).join('')}
                    ${matched.length > 5 ? `<div class="text-xs text-muted mt-1">…共 ${matched.length} 条，将对该VID下发配置</div>` : ''}
                </div>
            ` : '<div class="text-sm text-muted text-center py-4">未搜索到对应车辆</div>') : '<div class="text-sm text-muted text-center py-6">请输入车辆VID进行搜索</div>'}
        </div>`;
}

// ---- 已下发配置列表 ----
function renderSdkCollectionConfigList() {
    const configs = getSdkCollectionConfigs();
    const categoryLabel = c => c.category === 'full' ? '全量网络数据' : '核心网络数据';
    const scopeLabel = c => {
        if (c.scope === 'vid') return `单车：${c.vid || (c.vids && c.vids[0]) || '--'}`;
        const cnt = (c.vids && c.vids.length) || 0;
        return `${c.modelName || c.modelId}（${cnt ? cnt + '辆' : '全量'}）`;
    };
    return `
        <div class="bg-surface rounded-xl border border-border shadow-lg overflow-hidden">
            <div class="p-4 border-b border-border bg-background"><h3 class="font-semibold text-primary">已下发采集配置</h3></div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-background border-b border-border">
                        <tr>
                            <th class="px-4 py-3 text-left text-muted font-medium">配置名称</th>
                            <th class="px-4 py-3 text-left text-muted font-medium">配置范围</th>
                            <th class="px-4 py-3 text-left text-muted font-medium">采集类别</th>
                            <th class="px-4 py-3 text-left text-muted font-medium">采集频率</th>
                            <th class="px-4 py-3 text-left text-muted font-medium">数据保留</th>
                            <th class="px-4 py-3 text-left text-muted font-medium">下发时间</th>
                            <th class="px-4 py-3 text-left text-muted font-medium">操作</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                        ${configs.length ? configs.map(c => `
                            <tr class="hover:bg-background/50 transition-colors">
                                <td class="px-4 py-3 text-primary font-medium">${c.name}</td>
                                <td class="px-4 py-3 text-muted">${scopeLabel(c)}</td>
                                <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs ${c.category === 'full' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}">${categoryLabel(c)}</span></td>
                                <td class="px-4 py-3 text-muted">${c.frequency}</td>
                                <td class="px-4 py-3 text-muted">${c.retention}</td>
                                <td class="px-4 py-3 text-muted whitespace-nowrap">${c.createdAt}</td>
                                <td class="px-4 py-3"><button onclick="deleteSdkCollectionConfig('${c.id}')" class="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-xs transition-colors cursor-pointer font-medium">删除</button></td>
                            </tr>
                        `).join('') : '<tr><td colspan="7" class="px-4 py-8 text-center text-muted">暂无已下发的采集配置</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>`;
}

// ---- 主页面 ----
function renderSdkCollectionConfigPage() {
    const tab = window._sdkCollectionTab;
    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen">
                ${renderHeader()}
                <div class="flex-1 p-6 overflow-auto space-y-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="flex items-center gap-2 text-sm text-muted mb-2">
                                <button onclick="Store.goToSdkManagementList(); renderApp();" class="hover:text-primary cursor-pointer">车载网络SDK管理</button>
                                <span>/</span>
                                <span class="text-primary">SDK数据采集配置</span>
                            </div>
                            <h2 class="text-xl font-semibold text-primary">SDK数据采集配置</h2>
                        </div>
                        <button onclick="Store.goToSdkManagementList(); renderApp();" class="px-4 py-2 bg-background text-primary rounded-lg hover:bg-border transition-colors cursor-pointer font-medium border border-border text-sm">返回SDK管理</button>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- 左侧：配置区 -->
                        <div class="bg-surface rounded-xl border border-border p-5 shadow-lg">
                            <!-- Tab -->
                            <div class="flex gap-2 mb-4 p-1 bg-background rounded-lg border border-border">
                                <button onclick="setSdkCollectionTab('model')" class="flex-1 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${tab === 'model' ? 'bg-cta text-white' : 'text-muted hover:text-primary'}">按车型配置</button>
                                <button onclick="setSdkCollectionTab('vid')" class="flex-1 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${tab === 'vid' ? 'bg-cta text-white' : 'text-muted hover:text-primary'}">按VID搜索配置</button>
                            </div>

                            <form id="sdk-collection-form" class="space-y-4" onsubmit="event.preventDefault(); submitSdkCollectionConfig('${tab}');">
                                ${tab === 'model' ? renderSdkCollectionModelTab() : renderSdkCollectionVidTab()}

                                <div class="pt-4 border-t border-border space-y-4">
                                    ${renderSdkCollectionConfigFields()}
                                </div>

                                <div class="flex justify-end pt-2">
                                    <button type="submit" class="px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors cursor-pointer font-medium text-sm flex items-center gap-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                        下发配置
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- 右侧：采集类别说明 -->
                        <div class="bg-surface rounded-xl border border-border p-5 shadow-lg">
                            <h3 class="font-semibold text-primary mb-4">采集类别说明</h3>
                            <div class="space-y-4">
                                <div class="bg-background rounded-lg p-4 border border-border">
                                    <div class="flex items-center gap-2 mb-2">
                                        <span class="w-3 h-3 rounded-full bg-purple-500"></span>
                                        <span class="text-primary font-medium">全量网络数据</span>
                                    </div>
                                    <p class="text-sm text-muted">采集完整网络与系统指标，适用于深度故障分析、回溯定位。</p>
                                    <div class="mt-2 flex flex-wrap gap-1.5">
                                        ${['RSRP','RSRQ','SINR','网络制式','CID','TAC','注册状态','错误码','CPU','内存'].map(t => `<span class="px-2 py-0.5 bg-surface text-muted text-xs rounded">${t}</span>`).join('')}
                                    </div>
                                </div>
                                <div class="bg-background rounded-lg p-4 border border-border">
                                    <div class="flex items-center gap-2 mb-2">
                                        <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                                        <span class="text-primary font-medium">核心网络数据</span>
                                    </div>
                                    <p class="text-sm text-muted">仅采集核心注册与小区指标，数据量小，适用于日常监控与轻量上报。</p>
                                    <div class="mt-2 flex flex-wrap gap-1.5">
                                        ${['error code','register status','CID','TAC','网络制式'].map(t => `<span class="px-2 py-0.5 bg-surface text-muted text-xs rounded">${t}</span>`).join('')}
                                    </div>
                                </div>
                                <div class="bg-background rounded-lg p-4 border border-border">
                                    <div class="text-sm text-muted mb-2">提示</div>
                                    <p class="text-xs text-muted leading-relaxed">按车型配置可勾选部分车辆或全选；按VID搜索可对单车精确下发。配置下发后持久保存，可在下方列表管理。</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 已下发配置列表 -->
                    ${renderSdkCollectionConfigList()}
                </div>
            </main>
        </div>`;
}
