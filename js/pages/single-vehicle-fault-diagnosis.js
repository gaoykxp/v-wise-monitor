async function loadSingleVehicleFaultModels() {
    const data = await apiFetch('/models');
    if (Array.isArray(data) && data.length) {
        window._singleVehicleFaultModels = data;
    } else if (!window._singleVehicleFaultModels.length) {
        window._singleVehicleFaultModels = vehicleModels;
    }
    if (Store.state.currentPage === 'single-vehicle-fault-diagnosis') renderApp();
}

function renderSingleVehicleFaultDiagnosisPage() {
    const models = window._singleVehicleFaultModels.length ? window._singleVehicleFaultModels : vehicleModels;
    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen">
                ${renderHeader()}
                <div class="flex-1 p-6 overflow-auto">
                    <div class="mb-6">
                        <h2 class="text-xl font-semibold text-primary">车辆网络故障定界</h2>
                        <p class="text-sm text-muted mt-1">按车型查看车辆级网络故障定界列表</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        ${models.map(model => renderSingleVehicleFaultModelCard(model)).join('')}
                    </div>
                </div>
            </main>
        </div>`;
}

function renderSingleVehicleFaultModelCard(model) {
    const modelId = model.id || model.modelId;
    const totalVehicles = model.totalVehicles || 0;
    const onlineCount = model.onlineCount ?? Math.floor(totalVehicles * 0.7);
    const offlineCount = model.offlineCount ?? Math.max(0, totalVehicles - onlineCount);
    const boundaryCount = Math.max(0, model.faultCount ?? model.alertCount ?? Math.floor(totalVehicles * 0.06));
    const boundaryRate = totalVehicles ? ((boundaryCount / totalVehicles) * 100).toFixed(1) : '0.0';

    return `
        <div onclick="Store.selectSingleVehicleFaultModel('${modelId}'); renderApp();" class="bg-surface rounded-xl border border-border p-5 metric-card shadow-lg hover:shadow-xl hover:border-cta transition-all cursor-pointer">
            <div class="flex items-start justify-between mb-4">
                <div>
                    <h3 class="text-lg font-semibold text-primary">${model.name}</h3>
                    <p class="text-muted text-sm mt-1">${model.brand || '--'} · ${model.year || '--'}</p>
                </div>
                <span class="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">${boundaryCount} 待定界</span>
            </div>
            <div class="space-y-3">
                <div class="flex items-center justify-between py-2 border-b border-border">
                    <span class="text-muted text-sm">车辆总数</span>
                    <span class="text-primary font-medium">${totalVehicles.toLocaleString()}</span>
                </div>
                <div class="flex items-center justify-between py-2 border-b border-border">
                    <span class="text-muted text-sm">在线车辆</span>
                    <span class="text-cta font-medium">${onlineCount.toLocaleString()}</span>
                </div>
                <div class="flex items-center justify-between py-2">
                    <span class="text-muted text-sm">离线车辆</span>
                    <span class="text-amber-400 font-medium">${offlineCount.toLocaleString()}</span>
                </div>
            </div>
            <div class="mt-4 pt-4 border-t border-border flex justify-between items-center">
                <span class="text-muted text-xs">定界率: ${boundaryRate}%</span>
                <span class="text-cta text-sm font-medium flex items-center gap-1">
                    查看车辆列表
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </span>
            </div>
        </div>`;
}

function renderSingleVehicleFaultVehicleListPage() {
    const { selectedModel } = Store.getState();
    if (!selectedModel) return renderSingleVehicleFaultDiagnosisPage();
    const modelId = selectedModel.id || selectedModel.modelId;
    const baseVehicles = window._singleVehicleFaultVehiclesByModel[modelId] || vehiclesByModel[modelId] || [];
    // 合并 localStorage 中持久化的故障工单，保证刷新/重进后仍可见
    const vehicles = mergeFaultWorkOrders(baseVehicles, modelId);

    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen">
                ${renderHeader()}
                <div class="flex-1 p-6 overflow-auto">
                    <div class="mb-6 flex items-center justify-between">
                        <div>
                            <h2 class="text-xl font-semibold text-primary">${selectedModel.name} 网络故障定界列表</h2>
                            <p class="text-sm text-muted mt-1">共 ${vehicles.length} 辆车，按单车维度展示网络故障定界状态</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <button onclick="openFaultWorkOrderModal()" class="px-4 py-2 bg-cta text-white rounded-lg hover:bg-cta/90 transition-colors cursor-pointer font-medium text-sm flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                                添加故障工单
                            </button>
                            <button onclick="Store.goToSingleVehicleFaultDiagnosisList(); renderApp();" class="px-4 py-2 bg-background text-primary rounded-lg hover:bg-border transition-colors cursor-pointer font-medium border border-border text-sm">返回车型列表</button>
                        </div>
                    </div>
                    <div class="bg-surface rounded-xl border border-border shadow-lg overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="bg-background border-b border-border">
                                    <tr>
                                        <th class="px-4 py-3 text-left text-muted font-medium">车辆VID</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">ICCID</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">在线状态</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">用户故障描述</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">故障发生时段</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">上报地点</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">定界状态</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">最后更新时间</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">操作</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-border">
                                    ${vehicles.length ? vehicles.map(renderSingleVehicleFaultVehicleRow).join('') : '<tr><td colspan="9" class="px-4 py-8 text-center text-muted">暂无车辆数据</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        ${window._showFaultWorkOrderModal ? renderFaultWorkOrderModal() : ''}`;
}

// ========== 添加故障工单对话框 ==========
const FAULT_WORK_ORDER_STORAGE_KEY = 'vwise_fault_work_orders';

// 读取全部持久化工单 { [modelId]: [workOrder, ...] }
function loadPersistedFaultWorkOrders() {
    try {
        return JSON.parse(localStorage.getItem(FAULT_WORK_ORDER_STORAGE_KEY) || '{}');
    } catch (e) {
        return {};
    }
}

// 读取某车型的持久化工单（最新在前）
function getPersistedFaultWorkOrders(modelId) {
    const all = loadPersistedFaultWorkOrders();
    return (all[modelId] || []).slice();
}

// 持久化单个工单（同VID更新，否则插入到最前）
function persistFaultWorkOrder(modelId, vehicle) {
    const all = loadPersistedFaultWorkOrders();
    if (!all[modelId]) all[modelId] = [];
    const idx = all[modelId].findIndex(v => v.vid === vehicle.vid);
    if (idx >= 0) all[modelId][idx] = vehicle;
    else all[modelId].unshift(vehicle);
    try {
        localStorage.setItem(FAULT_WORK_ORDER_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
        // 存储不可用时静默降级为仅内存
    }
}

// 将持久化工单合并进车辆列表：已存在VID则用工单字段覆盖，不存在则置顶
function mergeFaultWorkOrders(vehicles, modelId) {
    const persisted = getPersistedFaultWorkOrders(modelId);
    if (!persisted.length) return vehicles;
    const result = (vehicles || []).slice();
    const indexByVid = {};
    result.forEach((v, i) => { if (v && v.vid) indexByVid[v.vid] = i; });
    const toPrepend = [];
    persisted.forEach(wo => {
        if (indexByVid[wo.vid] !== undefined) {
            result[indexByVid[wo.vid]] = { ...result[indexByVid[wo.vid]], ...wo };
        } else {
            toPrepend.push(wo);
        }
    });
    return [...toPrepend, ...result];
}

// 删除工单：同时清除内存列表与 localStorage 中的记录
function deleteFaultWorkOrder(vid) {
    const { selectedModel } = Store.getState();
    const modelId = selectedModel && (selectedModel.id || selectedModel.modelId);
    if (!vid) return;
    if (!confirm(`确认删除车辆 ${vid} 的故障工单？`)) return;

    // 1. 从内存车辆列表中移除
    if (modelId && Array.isArray(window._singleVehicleFaultVehiclesByModel[modelId])) {
        window._singleVehicleFaultVehiclesByModel[modelId] =
            window._singleVehicleFaultVehiclesByModel[modelId].filter(v => v.vid !== vid);
    }

    // 2. 从 localStorage 持久化记录中移除
    const all = loadPersistedFaultWorkOrders();
    if (modelId && Array.isArray(all[modelId])) {
        all[modelId] = all[modelId].filter(v => v.vid !== vid);
        if (!all[modelId].length) delete all[modelId];
        try {
            localStorage.setItem(FAULT_WORK_ORDER_STORAGE_KEY, JSON.stringify(all));
        } catch (e) {
            // 存储不可用时静默
        }
    }
    renderApp();
}

function openFaultWorkOrderModal() {
    window._showFaultWorkOrderModal = true;
    renderApp();
}

function closeFaultWorkOrderModal() {
    window._showFaultWorkOrderModal = false;
    renderApp();
}

function renderFaultWorkOrderModal() {
    const { selectedModel } = Store.getState();
    const defaultReportTime = new Date().toISOString().slice(0, 16);
    return `
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div class="bg-surface border border-border rounded-xl shadow-xl w-[560px] max-w-[90vw]">
                <div class="p-4 border-b border-border flex items-center justify-between">
                    <div>
                        <h3 class="font-semibold text-primary">添加故障工单</h3>
                        <p class="text-xs text-muted mt-0.5">归属车型：${selectedModel ? selectedModel.name : '--'}</p>
                    </div>
                    <button onclick="closeFaultWorkOrderModal()" class="text-muted hover:text-primary cursor-pointer">✕</button>
                </div>
                <form id="fault-work-order-form" class="p-4 grid grid-cols-2 gap-4" onsubmit="event.preventDefault(); submitFaultWorkOrder();">
                    <label class="text-sm text-muted">车辆VID<input name="vid" required placeholder="如 VID0010001" class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary"></label>
                    <label class="text-sm text-muted">ICCID<input name="iccid" required placeholder="如 898608D5992430000006" class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary"></label>
                    <label class="col-span-2 text-sm text-muted">用户故障描述<input name="faultDescription" required placeholder="如 车辆行驶中网络频繁断连" class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary"></label>
                    <label class="col-span-2 text-sm text-muted">上报地点<input name="reportLocation" required placeholder="如 北京市朝阳区国贸CBD" class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary"></label>
                    <label class="text-sm text-muted">故障发生时段·开始<input type="datetime-local" name="faultTimeStart" value="${defaultReportTime}" required class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary"></label>
                    <label class="text-sm text-muted">故障发生时段·结束<input type="datetime-local" name="faultTimeEnd" value="${defaultReportTime}" required class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary"></label>
                    <div class="col-span-2 flex justify-end gap-3 pt-3 border-t border-border">
                        <button type="button" onclick="closeFaultWorkOrderModal()" class="px-4 py-2 bg-background hover:bg-border text-primary rounded-lg border border-border cursor-pointer">取消</button>
                        <button type="submit" class="px-4 py-2 bg-cta hover:bg-cta/90 text-white rounded-lg cursor-pointer">确定</button>
                    </div>
                </form>
            </div>
        </div>`;
}

function submitFaultWorkOrder() {
    const form = document.getElementById('fault-work-order-form');
    if (!form) return;
    const data = new FormData(form);
    const vid = (data.get('vid') || '').trim();
    const iccid = (data.get('iccid') || '').trim();
    const faultDescription = (data.get('faultDescription') || '').trim();
    const reportLocation = (data.get('reportLocation') || '').trim();
    const faultTimeStart = (data.get('faultTimeStart') || '').trim();
    const faultTimeEnd = (data.get('faultTimeEnd') || '').trim();

    if (!vid || !iccid || !faultDescription || !reportLocation || !faultTimeStart || !faultTimeEnd) return;

    // 校验结束时间不早于开始时间
    if (new Date(faultTimeEnd).getTime() < new Date(faultTimeStart).getTime()) {
        alert('故障发生时段结束时间不能早于开始时间');
        return;
    }

    const { selectedModel } = Store.getState();
    const modelId = selectedModel && (selectedModel.id || selectedModel.modelId);

    // 构造工单对应的车辆记录，写入当前车型的故障定界列表
    // 若该车型尚未从后端拉取列表，则基于静态回退数据初始化，避免覆盖
    if (!window._singleVehicleFaultVehiclesByModel[modelId]) {
        window._singleVehicleFaultVehiclesByModel[modelId] = (vehiclesByModel[modelId] || []).slice();
    }
    const list = window._singleVehicleFaultVehiclesByModel[modelId];

    // 以结束时间作为最后更新/上报时间，便于列表按时间排序与展示
    const reportIso = new Date(faultTimeEnd).toISOString();
    // 同一VID去重：若已存在则更新其工单字段，否则插入到列表顶部
    let vehicle = list.find(v => v.vid === vid);
    if (vehicle) {
        vehicle.iccid = iccid;
        vehicle.faultDescription = faultDescription;
        vehicle.reportLocation = reportLocation;
        vehicle.faultTimeStart = new Date(faultTimeStart).toISOString();
        vehicle.faultTimeEnd = reportIso;
        vehicle.lastUpdate = reportIso;
        vehicle.alertCount = Math.max(1, vehicle.alertCount || 1);
    } else {
        vehicle = {
            vid,
            modelId,
            iccid,
            status: 'online',
            lastUpdate: reportIso,
            alertCount: 1,
            faultDescription,
            reportLocation,
            faultTimeStart: new Date(faultTimeStart).toISOString(),
            faultTimeEnd: reportIso,
            isFaultWorkOrder: true
        };
        list.unshift(vehicle);
    }

    // 持久化到 localStorage，确保返回车型列表再进入仍可见
    persistFaultWorkOrder(modelId, vehicle);

    window._showFaultWorkOrderModal = false;
    renderApp();
}

function renderSingleVehicleFaultVehicleRow(vehicle) {
    const isOnline = vehicle.status === 'online' || vehicle.status === '在线';
    const alertCount = vehicle.alertCount || (isOnline ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 5) + 1);
    const boundaryStatus = alertCount > 0 ? '待定界' : '正常';
    const statusClass = isOnline ? 'bg-cta/20 text-cta' : 'bg-amber-500/20 text-amber-400';
    const boundaryClass = boundaryStatus === '正常' ? 'bg-cta/20 text-cta' : 'bg-red-500/20 text-red-400';
    const lastUpdate = vehicle.lastUpdate ? new Date(vehicle.lastUpdate).toLocaleString('zh-CN') : '--';

    // ICCID mock 数据：基于车辆VID生成稳定的20位ICCID
    const iccid = vehicle.iccid || generateMockIccid(vehicle.vid);
    // 用户故障描述 mock 数据
    const faultDesc = vehicle.faultDescription || generateMockFaultDescription(vehicle, alertCount);
    // 上报地点 mock 数据
    const reportLocation = vehicle.reportLocation || generateMockReportLocation(vehicle.vid);
    // 故障发生时段：取工单的开始-结束时间，无则显示 --
    const faultTimeRange = formatFaultTimeRange(vehicle.faultTimeStart, vehicle.faultTimeEnd);

    return `
        <tr class="hover:bg-background/50 transition-colors">
            <td class="px-4 py-3 text-primary font-mono">${vehicle.vid}</td>
            <td class="px-4 py-3 text-muted font-mono">${iccid}</td>
            <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs ${statusClass}">${isOnline ? '在线' : '离线'}</span></td>
            <td class="px-4 py-3 text-muted max-w-[220px] truncate" title="${faultDesc}">${faultDesc}</td>
            <td class="px-4 py-3 text-muted whitespace-nowrap">${faultTimeRange}</td>
            <td class="px-4 py-3 text-muted whitespace-nowrap">${reportLocation}</td>
            <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs ${boundaryClass}">${boundaryStatus}</span></td>
            <td class="px-4 py-3 text-muted whitespace-nowrap">${lastUpdate}</td>
            <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                    <button onclick="Store.selectSingleVehicleFaultBoundary('${vehicle.vid}'); renderApp();" class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs transition-colors cursor-pointer font-medium">查看定界</button>
                    <button onclick="deleteFaultWorkOrder('${vehicle.vid}')" class="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-xs transition-colors cursor-pointer font-medium">删除</button>
                </div>
            </td>
        </tr>`;
}

// 生成 mock ICCID（格式如 898608D5992430000006，20位）
function generateMockIccid(vid) {
    const seed = String(vid).replace(/[^0-9]/g, '');
    const hexChars = '0123456789ABCDEF';
    // 固定前缀 898608D，后接12位由VID派生的字符，组成20位
    let suffix = '';
    let num = parseInt(seed.slice(-8) || '12345') || 12345;
    for (let i = 0; i < 12; i++) {
        num = (num * 1103515245 + 12345) & 0x7fffffff;
        suffix += hexChars[num % 16];
    }
    return `898608D${suffix}`;
}

// 生成 mock 用户故障描述
function generateMockFaultDescription(vehicle, alertCount) {
    if (!alertCount || alertCount === 0) return '无';
    const descriptions = [
        '车辆行驶中网络频繁断连，导航卡顿',
        '地下停车场内信号丢失，无法远程解锁',
        '高速路段视频流卡顿，T-BOX频繁掉线',
        '车载娱乐系统提示网络连接超时',
        '远程控制指令下发延迟较大',
        '车机OTA升级失败，疑似网络异常',
        '路口等红灯时网络切换导致通话中断'
    ];
    const seed = String(vehicle.vid).replace(/[^0-9]/g, '');
    const idx = (parseInt(seed.slice(-4) || '0') || 0) % descriptions.length;
    return descriptions[idx];
}

// 生成 mock 上报地点
function generateMockReportLocation(vid) {
    const locations = [
        '北京市朝阳区国贸CBD',
        '上海市浦东新区陆家嘴',
        '广州市天河区珠江新城',
        '深圳市南山区科技园',
        '成都市武侯区天府大道',
        '杭州市西湖区文三路',
        '武汉市江汉区解放大道',
        '南京市鼓楼区中山北路'
    ];
    const seed = String(vid).replace(/[^0-9]/g, '');
    const idx = (parseInt(seed.slice(-5) || '0') || 0) % locations.length;
    return locations[idx];
}

// 格式化故障发生时段：开始 - 结束，任一缺失则显示 --
function formatFaultTimeRange(start, end) {
    if (!start && !end) return '--';
    const fmt = (t) => {
        if (!t) return '--';
        const d = new Date(t);
        return isNaN(d.getTime()) ? '--' : d.toLocaleString('zh-CN');
    };
    if (!start || !end) return fmt(start || end);
    return `${fmt(start)} ~ ${fmt(end)}`;
}

function getSingleVehicleBoundaryData(vehicle, data) {
    const wireless = data?.wireless || {};
    const system = data?.system || {};
    const rsrp = Number(wireless.rsrp ?? -112);
    const rsrq = Number(wireless.rsrq ?? -16);
    const sinr = Number(wireless.sinr ?? -2);
    let faultType = '网络质量异常';
    let boundaryResult = '网络侧原因';
    let suggestion = '基站覆盖优化';
    let confidence = 88;

    if (rsrp < -110) {
        faultType = '弱覆盖';
        suggestion = '优化服务小区覆盖或补充邻区';
        confidence = 94.5;
    } else if (sinr < 0) {
        faultType = '强干扰';
        suggestion = '排查同频干扰并优化PCI规划';
        confidence = 91.2;
    } else if (vehicle.status !== 'online') {
        faultType = '终端离线';
        boundaryResult = '车辆侧原因';
        suggestion = '检查T-BOX供电与SIM卡状态';
        confidence = 86.8;
    }

    return {
        caseId: `FD-${vehicle.vid}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        detectTime: new Date().toLocaleString('zh-CN'),
        faultType,
        boundaryResult,
        confidence,
        impactScope: boundaryResult === '网络侧原因' ? '周边3km' : '单车终端',
        suggestion,
        networkType: wireless.networkType || '5G-SA',
        rsrp,
        rsrq,
        sinr,
        pci: wireless.pci || wireless.cid || '--',
        location: `${Number(system.longitude || 116.4074).toFixed(4)}, ${Number(system.latitude || 39.9042).toFixed(4)}`
    };
}

function renderInfoRow(label, value, valueClass = 'text-primary') {
    return `<div class="flex justify-between text-sm"><span class="text-muted">${label}</span><span class="${valueClass} font-medium">${value}</span></div>`;
}

// 生成故障发生时段内的信号-位置轨迹点位（含 RSRP/RSRQ/SINR/CPU/内存/TAC/CID，用于 GIS 地图着色与弹窗）
function generateFaultSignalTrack(vehicle, data) {
    const system = (data && data.system) || {};
    const wireless = (data && data.wireless) || {};
    const baseLng = Number(system.longitude || 116.4074);
    const baseLat = Number(system.latitude || 39.9042);
    const baseRsrp = Number(wireless.rsrp ?? -100);
    const baseRsrq = Number(wireless.rsrq ?? -12);
    const baseSinr = Number(wireless.sinr ?? 8);
    const baseCpu = Number(system.cpuUsage ?? 45);
    const baseMem = Number(system.memUsage ?? 55);
    const baseTac = Number(wireless.tac ?? 10493);
    const baseCid = Number(wireless.cid ?? 49003);

    // 取工单时段，回退到当前时刻前 30 分钟
    const end = vehicle.faultTimeEnd ? new Date(vehicle.faultTimeEnd) : new Date();
    const start = vehicle.faultTimeStart ? new Date(vehicle.faultTimeStart) : new Date(end.getTime() - 30 * 60000);
    const span = Math.max(1, end.getTime() - start.getTime());
    const count = 16;

    const points = [];
    let lng = baseLng, lat = baseLat, rsrp = baseRsrp;
    for (let i = 0; i < count; i++) {
        // 沿路径移动 + 信号逐渐劣化后部分恢复，模拟故障时段信号随位置变化
        lng += (Math.sin(i / 2) + 0.3) * 0.0015;
        lat += (Math.cos(i / 3) - 0.1) * 0.0012;
        const progress = i / (count - 1);
        // 中段（progress 0.3~0.8）信号跌落
        const dip = progress > 0.3 && progress < 0.8 ? (1 - Math.abs(progress - 0.55) / 0.25) : 0;
        rsrp = baseRsrp - dip * 22 + (Math.sin(i) * 1.5);
        // RSRQ/SINR 随 RSRP 同向波动
        const rsrq = baseRsrq - dip * 6 + (Math.cos(i) * 0.6);
        const sinr = baseSinr - dip * 12 + (Math.sin(i / 2) * 0.8);
        // 故障时段 CPU/内存略升
        const cpu = baseCpu + dip * 18 + (Math.sin(i / 1.5) * 2);
        const mem = baseMem + dip * 12 + (Math.cos(i / 2) * 2);
        // 故障中段发生小区切换，TAC/CID 变化
        const tac = dip > 0.4 ? baseTac + 7 + (i % 3) : baseTac;
        const cid = dip > 0.4 ? baseCid + 12000 + (i * 137) : baseCid + i * 53;
        const t = new Date(start.getTime() + progress * span);
        points.push({
            lng, lat, rsrp, rsrq, sinr, cpu, mem, tac, cid,
            time: t.toLocaleString('zh-CN')
        });
    }
    return points;
}

// 按 RSRP 强弱映射颜色：蓝(优) > 绿(良) > 黄(一般) > 红(差)
function rsrpToColor(rsrp) {
    if (rsrp >= -90) return '#3B82F6';   // 蓝
    if (rsrp >= -100) return '#22C55E';  // 绿
    if (rsrp >= -110) return '#F59E0B';  // 黄
    return '#EF4444';                     // 红
}

function rsrpLevelLabel(rsrp) {
    if (rsrp >= -90) return '优';
    if (rsrp >= -100) return '良';
    if (rsrp >= -110) return '一般';
    return '差';
}

function renderFaultSignalMapContainer(vehicle, data) {
    const points = generateFaultSignalTrack(vehicle, data);
    const center = points.length ? [points[0].lat, points[0].lng] : [39.9042, 116.4074];
    return `
        <div id="fault-signal-map" class="h-[420px] rounded-lg border border-border overflow-hidden" data-center-lat="${center[0]}" data-center-lng="${center[1]}"></div>
        <div class="mt-3 flex items-center justify-end text-xs text-muted">
            <div class="flex items-center gap-3">
                <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full" style="background:#3B82F6"></span>优(&ge;-90)</span>
                <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full" style="background:#22C55E"></span>良(&ge;-100)</span>
                <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full" style="background:#F59E0B"></span>一般(&ge;-110)</span>
                <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full" style="background:#EF4444"></span>差(&lt;-110)</span>
            </div>
        </div>`;
}

let faultSignalMap = null;

// 初始化故障发生时段信号点位 GIS 地图
function initFaultSignalMap() {
    const mapEl = document.getElementById('fault-signal-map');
    if (!mapEl) return;
    const { selectedVehicle, vehicleData } = Store.getState();
    if (!selectedVehicle) return;
    const data = vehicleData[selectedVehicle.vid] || generateVehicleData(selectedVehicle.vid);
    const points = generateFaultSignalTrack(selectedVehicle, data);
    const center = points.length ? [points[0].lat, points[0].lng] : [39.9042, 116.4074];

    // 复用前先清理旧实例，避免重新渲染时叠加
    if (faultSignalMap) {
        faultSignalMap.remove();
        faultSignalMap = null;
    }

    faultSignalMap = L.map('fault-signal-map', { center, zoom: 14, zoomControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(faultSignalMap);

    // 连线展示行驶轨迹
    if (points.length > 1) {
        L.polyline(points.map(p => [p.lat, p.lng]), { color: '#64748B', weight: 2, opacity: 0.6 }).addTo(faultSignalMap);
    }

    // 按信号强弱着色的点位
    points.forEach((p, i) => {
        const color = rsrpToColor(p.rsrp);
        const marker = L.circleMarker([p.lat, p.lng], {
            radius: 7,
            fillColor: color,
            color: '#0F172A',
            weight: 1.5,
            fillOpacity: 0.9
        }).addTo(faultSignalMap);
        marker.bindPopup(
            `<div style="font-size:12px;line-height:1.6;min-width:200px;">
                <div style="font-weight:600;margin-bottom:4px;">点位 ${i + 1} · ${p.time}</div>
                <div>RSRP：<span style="color:${color};font-weight:600;">${p.rsrp.toFixed(1)} dBm (${rsrpLevelLabel(p.rsrp)})</span></div>
                <div>RSRQ：<span style="font-weight:600;">${p.rsrq.toFixed(1)} dB</span></div>
                <div>SINR：<span style="font-weight:600;">${p.sinr.toFixed(1)} dB</span></div>
                <div>CPU利用率：<span style="font-weight:600;">${p.cpu.toFixed(1)}%</span></div>
                <div>内存利用率：<span style="font-weight:600;">${p.mem.toFixed(1)}%</span></div>
                <div>TAC：<span style="font-weight:600;">${p.tac}</span></div>
                <div>CID：<span style="font-weight:600;">${p.cid}</span></div>
                <div style="color:#94A3B8;margin-top:2px;">经纬度：${p.lng.toFixed(4)}, ${p.lat.toFixed(4)}</div>
            </div>`
        );
    });

    // 视图自适应所有点位
    if (points.length) {
        faultSignalMap.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), { padding: [30, 30] });
    }
    setTimeout(() => faultSignalMap && faultSignalMap.invalidateSize(), 0);
}

function renderSingleVehicleSignalTrendChart(data) {
    const base = Math.max(-125, Math.min(-85, data.rsrp));
    const records = Array.from({ length: 12 }, (_, index) => ({
        x: index,
        rsrp: base + Math.sin(index / 2) * 5 + (index > 7 ? -8 : 0),
        rsrq: data.rsrq + Math.cos(index / 2) * 2
    }));
    const rsrpPoints = records.map((item, index) => `${(index / 11 * 100).toFixed(1)},${(85 - ((item.rsrp + 130) / 60) * 65).toFixed(1)}`).join(' ');
    const rsrqPoints = records.map((item, index) => `${(index / 11 * 100).toFixed(1)},${(85 - ((item.rsrq + 25) / 25) * 65).toFixed(1)}`).join(' ');
    return `
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-64">
            <line x1="0" y1="20" x2="100" y2="20" stroke="rgb(var(--color-border))" stroke-width="0.4"/>
            <line x1="0" y1="45" x2="100" y2="45" stroke="rgb(var(--color-border))" stroke-width="0.4"/>
            <line x1="0" y1="70" x2="100" y2="70" stroke="rgb(var(--color-border))" stroke-width="0.4"/>
            <rect x="64" y="10" width="18" height="78" fill="#EF4444" opacity="0.12"/>
            <polyline points="${rsrpPoints}" fill="none" stroke="#3B82F6" stroke-width="1.2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="${rsrqPoints}" fill="none" stroke="#22C55E" stroke-width="1.2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
}

function renderSingleVehicleFaultRadar(data) {
    const networkScore = data.boundaryResult === '网络侧原因' ? data.confidence : 100 - data.confidence;
    const vehicleScore = 100 - networkScore;
    return `
        <div class="space-y-4">
            <div class="bg-background rounded-lg p-4 border border-border">
                <div class="flex justify-between text-sm mb-2"><span class="text-muted">网络侧归因</span><span class="text-red-400 font-semibold">${networkScore.toFixed(1)}%</span></div>
                <div class="h-2 bg-surface rounded-full overflow-hidden"><div class="h-full bg-red-500" style="width: ${networkScore}%"></div></div>
            </div>
            <div class="bg-background rounded-lg p-4 border border-border">
                <div class="flex justify-between text-sm mb-2"><span class="text-muted">车辆侧归因</span><span class="text-blue-400 font-semibold">${vehicleScore.toFixed(1)}%</span></div>
                <div class="h-2 bg-surface rounded-full overflow-hidden"><div class="h-full bg-blue-500" style="width: ${vehicleScore}%"></div></div>
            </div>
            <div class="grid grid-cols-3 gap-3 text-center text-xs">
                <div class="bg-background rounded-lg p-3 border border-border"><div class="text-muted">信号异常</div><div class="text-red-400 font-semibold mt-1">高</div></div>
                <div class="bg-background rounded-lg p-3 border border-border"><div class="text-muted">终端异常</div><div class="text-cta font-semibold mt-1">低</div></div>
                <div class="bg-background rounded-lg p-3 border border-border"><div class="text-muted">BSS匹配</div><div class="text-blue-400 font-semibold mt-1">完成</div></div>
            </div>
        </div>`;
}

function renderSingleVehicleFaultBoundaryDetailPage() {
    const { selectedModel, selectedVehicle, vehicleData } = Store.getState();
    if (!selectedModel || !selectedVehicle) return renderSingleVehicleFaultVehicleListPage();
    const data = vehicleData[selectedVehicle.vid] || generateVehicleData(selectedVehicle.vid);
    const boundary = getSingleVehicleBoundaryData(selectedVehicle, data);
    const isNetworkSide = boundary.boundaryResult === '网络侧原因';

    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen">
                ${renderHeader()}
                <div class="flex-1 p-6 overflow-auto space-y-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-xl font-semibold text-primary">车辆网络故障定界详情</h2>
                            <p class="text-sm text-muted mt-1">参考定界定位流程，展示单车网络故障归因分析</p>
                        </div>
                        <button onclick="Store.goToSingleVehicleFaultVehicleList(); renderApp();" class="px-4 py-2 bg-background text-primary rounded-lg hover:bg-border transition-colors cursor-pointer font-medium border border-border text-sm">返回车辆列表</button>
                    </div>

                    <div class="bg-surface border border-border rounded-xl overflow-hidden shadow-lg">
                        <div class="p-5 border-b border-border bg-background/50 flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center"><svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div>
                                <div><h3 class="font-semibold text-primary text-lg">故障案例 #${boundary.caseId}</h3><p class="text-sm text-muted">检测时间: ${boundary.detectTime}</p></div>
                            </div>
                            <div class="flex items-center gap-3"><span class="px-3 py-1.5 rounded-lg ${isNetworkSide ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'} font-medium text-sm">${boundary.boundaryResult}</span><span class="px-3 py-1.5 rounded-lg bg-cta/20 text-cta font-medium text-sm">已定界</span></div>
                        </div>
                        <div class="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div class="space-y-4"><h4 class="font-medium text-primary">车辆信息</h4><div class="bg-background rounded-lg p-4 space-y-3 border border-border">${renderInfoRow('车辆VID', selectedVehicle.vid)}${renderInfoRow('车牌号', selectedVehicle.plateNumber || '--')}${renderInfoRow('车型', selectedModel.name)}${renderInfoRow('终端状态', selectedVehicle.status === 'online' ? '在线' : '离线', selectedVehicle.status === 'online' ? 'text-cta' : 'text-amber-400')}${renderInfoRow('当前位置', boundary.location)}</div></div>
                            <div class="space-y-4"><h4 class="font-medium text-primary">网络状态</h4><div class="bg-background rounded-lg p-4 space-y-3 border border-border">${renderInfoRow('网络类型', boundary.networkType)}${renderInfoRow('RSRP信号强度', `${boundary.rsrp} dBm`, boundary.rsrp < -110 ? 'text-red-400' : 'text-cta')}${renderInfoRow('RSRQ质量', `${boundary.rsrq} dB`, boundary.rsrq < -15 ? 'text-amber-400' : 'text-cta')}${renderInfoRow('SINR信噪比', `${boundary.sinr} dB`, boundary.sinr < 0 ? 'text-red-400' : 'text-cta')}${renderInfoRow('PCI/CID', boundary.pci)}</div></div>
                            <div class="space-y-4"><h4 class="font-medium text-primary">定界结论</h4><div class="bg-background rounded-lg p-4 space-y-3 border border-border">${renderInfoRow('故障类型', boundary.faultType)}${renderInfoRow('定界结果', boundary.boundaryResult, isNetworkSide ? 'text-red-400' : 'text-blue-400')}${renderInfoRow('置信度', `${boundary.confidence}%`, 'text-cta')}${renderInfoRow('影响范围', boundary.impactScope)}${renderInfoRow('建议措施', boundary.suggestion, 'text-blue-400')}</div></div>
                        </div>
                    </div>

                    <div class="bg-surface border border-border rounded-xl p-5 shadow-lg">
                        <h3 class="font-semibold text-primary mb-4">定界定位分析过程</h3>
                        <div class="relative pl-8 space-y-5">
                            ${['数据采集阶段|获取车辆网络日志、T-BOX诊断数据、SIM卡状态信息|text-blue-400|bg-blue-500/20','网络状态分析|融合车辆侧无线指标与服务小区状态，识别弱覆盖/干扰特征|text-cta|bg-cta/20','特征分析|分析信号趋势、切换成功率、邻区关系与终端在线状态|text-amber-400|bg-amber-500/20','定界判定|综合车辆侧与网络侧证据，输出故障根因归属|text-red-400|bg-red-500/20'].map((item, index) => { const [title, desc, textClass, bgClass] = item.split('|'); return `<div class="relative"><div class="absolute -left-8 w-7 h-7 rounded-full ${bgClass} ${textClass} flex items-center justify-center border border-current text-xs font-semibold">${index + 1}</div><div class="bg-background rounded-lg p-4 border border-border"><div class="flex justify-between mb-2"><span class="font-medium text-primary">${title}</span><span class="text-xs text-muted">完成</span></div><p class="text-sm text-muted">${desc}</p></div></div>`; }).join('')}
                        </div>
                    </div>

                    <div class="bg-surface border border-border rounded-xl p-5 shadow-lg"><h3 class="font-semibold text-primary mb-4 flex items-center justify-between flex-wrap gap-2"><span>故障发生时段信息回溯分析</span><span class="text-sm font-normal text-muted">时段：${formatFaultTimeRange(selectedVehicle.faultTimeStart, selectedVehicle.faultTimeEnd)}</span></h3>${renderFaultSignalMapContainer(selectedVehicle, data)}</div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div class="bg-surface border border-border rounded-xl p-5 shadow-lg"><h3 class="font-semibold text-primary mb-4">故障归属分析</h3>${renderSingleVehicleFaultRadar(boundary)}</div>
                        <div class="bg-surface border border-border rounded-xl p-5 shadow-lg">
                            <h3 class="font-semibold text-primary mb-4">推荐措施</h3>
                            <div class="space-y-4">
                                <div class="bg-background rounded-lg p-4 border border-border"><div class="text-red-400 font-medium mb-2">高优先级</div><div class="text-primary font-semibold">${boundary.suggestion}</div><p class="text-sm text-muted mt-2">建议24小时内完成排查与参数优化。</p></div>
                                <div class="bg-background rounded-lg p-4 border border-border"><div class="text-amber-400 font-medium mb-2">中优先级</div><div class="text-primary font-semibold">邻区关系核查</div><p class="text-sm text-muted mt-2">核查周边小区配置与切换参数。</p></div>
                                <div class="bg-background rounded-lg p-4 border border-border"><div class="text-blue-400 font-medium mb-2">持续观察</div><div class="text-primary font-semibold">单车复测</div><p class="text-sm text-muted mt-2">完成优化后对该车辆进行网络质量复测。</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>`;
}
