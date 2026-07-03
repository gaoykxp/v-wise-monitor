// ========== 历史网况页面 ==========

let historyRecords = [];
let historyMap = null;
let historyMarkers = [];

function renderVehicleHistoryPage() {
    const { selectedVehicle, selectedModel } = Store.getState();
    if (!selectedVehicle) return renderModelsPage();

    // 默认时间范围：最近24小时
    const now = new Date();
    const defaultEnd = now.toISOString().slice(0, 16);
    const defaultStart = new Date(now - 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen">
                ${renderHeader()}
                <div class="flex-1 p-6 overflow-auto">
                    <div class="bg-surface rounded-xl border border-border p-6 shadow-lg mb-6">
                        <h2 class="text-lg font-semibold text-primary mb-4">历史网况查询</h2>
                        <div class="flex items-end gap-4 flex-wrap">
                            <div class="flex flex-col">
                                <label class="text-sm text-muted mb-1">开始时间</label>
                                <input type="datetime-local" id="history-start" value="${defaultStart}" class="px-3 py-2 bg-background border border-border rounded-lg text-primary focus:outline-none focus:border-cta">
                            </div>
                            <div class="flex flex-col">
                                <label class="text-sm text-muted mb-1">结束时间</label>
                                <input type="datetime-local" id="history-end" value="${defaultEnd}" class="px-3 py-2 bg-background border border-border rounded-lg text-primary focus:outline-none focus:border-cta">
                            </div>
                            <button onclick="queryHistoryRecords()" class="px-4 py-2 bg-cta text-white rounded-lg hover:bg-cta/90 transition-colors cursor-pointer font-medium">
                                查询
                            </button>
                            <button onclick="Store.goToVehicles(); renderApp();" class="px-4 py-2 bg-background text-primary rounded-lg hover:bg-border transition-colors cursor-pointer font-medium border border-border">
                                返回列表
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <!-- 左侧：地图 -->
                        <div class="lg:col-span-1">
                            <div class="bg-surface rounded-xl border border-border shadow-lg overflow-hidden">
                                <div class="p-3 border-b border-border bg-background flex justify-between items-center">
                                    <h3 class="text-sm font-semibold text-primary">轨迹地图</h3>
                                    <span class="text-xs text-muted flex items-center gap-1">
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                        点击轨迹点查看详情
                                    </span>
                                </div>
                                <div id="history-map" style="height: 400px;"></div>
                            </div>
                        </div>

                        <!-- 右侧：数据表格 -->
                        <div class="lg:col-span-2">
                            <div class="bg-surface rounded-xl border border-border shadow-lg overflow-hidden">
                                <div class="p-3 border-b border-border bg-background flex justify-between items-center">
                                    <h3 class="text-sm font-semibold text-primary">历史网况数据</h3>
                                    <span id="record-count" class="text-sm text-muted">共 0 条记录</span>
                                </div>
                                <div class="overflow-auto" style="max-height: 500px;">
                                    <table class="w-full text-sm">
                                        <thead class="bg-background sticky top-0">
                                            <tr class="text-muted text-left">
                                                <th class="px-4 py-3 font-medium">时间戳</th>
                                                <th class="px-4 py-3 font-medium">经度</th>
                                                <th class="px-4 py-3 font-medium">纬度</th>
                                                <th class="px-4 py-3 font-medium">网络制式</th>
                                                <th class="px-4 py-3 font-medium">RSRP(dBm)</th>
                                                <th class="px-4 py-3 font-medium">SINR(dB)</th>
                                                <th class="px-4 py-3 font-medium">RSRQ(dB)</th>
                                                <th class="px-4 py-3 font-medium">CID</th>
                                                <th class="px-4 py-3 font-medium">TAC</th>
                                                <th class="px-4 py-3 font-medium">Ping(ms)</th>
                                                <th class="px-4 py-3 font-medium">注册状态</th>
                                            </tr>
                                        </thead>
                                        <tbody id="history-table-body" class="divide-y divide-border">
                                            <tr><td colspan="11" class="px-4 py-8 text-center text-muted">请选择时间段后点击查询</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>`;
}

async function queryHistoryRecords() {
    const { selectedVehicle } = Store.getState();
    if (!selectedVehicle) return;

    const startInput = document.getElementById('history-start').value;
    const endInput = document.getElementById('history-end').value;

    if (!startInput || !endInput) {
        alert('请选择时间段');
        return;
    }

    const startTime = new Date(startInput).getTime();
    const endTime = new Date(endInput).getTime();

    if (startTime >= endTime) {
        alert('开始时间必须早于结束时间');
        return;
    }

    // 计算查询的小时数
    const hours = Math.ceil((endTime - startTime) / (60 * 60 * 1000));

    // 从后端API获取历史数据
    let records = [];
    try {
        const result = await apiFetch(`/vehicles/${selectedVehicle.vid}/history?hours=${hours}`);
        if (result && result.records && result.records.length > 0) {
            records = result.records;
        } else {
            // 回退到模拟数据
            records = generateHistoryRecords(selectedVehicle.vid, startInput, endInput);
        }
    } catch (e) {
        records = generateHistoryRecords(selectedVehicle.vid, startInput, endInput);
    }

    historyRecords = records;

    // 更新记录数量
    document.getElementById('record-count').textContent = `共 ${historyRecords.length} 条记录`;

    // 渲染表格
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = historyRecords.map((r, index) => `
        <tr class="hover:bg-background/50 transition-colors ${index % 2 === 0 ? 'bg-surface' : 'bg-background'}">
            <td class="px-4 py-3 text-primary whitespace-nowrap">${r.timeDisplay}</td>
            <td class="px-4 py-3 text-muted whitespace-nowrap">${r.longitude.toFixed(6)}</td>
            <td class="px-4 py-3 text-muted whitespace-nowrap">${r.latitude.toFixed(6)}</td>
            <td class="px-4 py-3 whitespace-nowrap"><span class="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">${networkTypes[r.networkType]}</span></td>
            <td class="px-4 py-3 whitespace-nowrap ${getRsrpColor(r.rsrp)}">${r.rsrp.toFixed(1)}</td>
            <td class="px-4 py-3 whitespace-nowrap ${getSinrColor(r.sinr)}">${r.sinr.toFixed(1)}</td>
            <td class="px-4 py-3 whitespace-nowrap ${getRsrqColor(r.rsrq)}">${r.rsrq.toFixed(1)}</td>
            <td class="px-4 py-3 text-muted whitespace-nowrap">${r.cid}</td>
            <td class="px-4 py-3 text-muted whitespace-nowrap">${r.tac}</td>
            <td class="px-4 py-3 whitespace-nowrap ${getPingColor(r.pingLatency)}">${r.pingLatency}</td>
            <td class="px-4 py-3 whitespace-nowrap"><span class="${r.registerStatus === 1 ? 'text-cta' : 'text-amber-400'}">${registerStatus[r.registerStatus]}</span></td>
        </tr>
    `).join('');

    // 初始化地图并显示轨迹
    initHistoryMap();
}

function getPingColor(value) {
    if (value <= 50) return 'text-cta font-medium';
    if (value <= 100) return 'text-blue-400 font-medium';
    if (value <= 150) return 'text-amber-400 font-medium';
    return 'text-red-400 font-medium';
}

function getRsrpColor(value) {
    if (value >= -80) return 'text-cta font-medium';
    if (value >= -90) return 'text-blue-400 font-medium';
    if (value >= -100) return 'text-amber-400 font-medium';
    return 'text-red-400 font-medium';
}

function getSinrColor(value) {
    if (value >= 20) return 'text-cta font-medium';
    if (value >= 13) return 'text-blue-400 font-medium';
    if (value >= 0) return 'text-amber-400 font-medium';
    return 'text-red-400 font-medium';
}

function getRsrqColor(value) {
    if (value >= -10) return 'text-cta font-medium';
    if (value >= -15) return 'text-blue-400 font-medium';
    if (value >= -20) return 'text-amber-400 font-medium';
    return 'text-red-400 font-medium';
}

function initHistoryMap() {
    if (historyRecords.length === 0) return;

    // 清除旧地图
    if (historyMap) {
        historyMap.remove();
        historyMap = null;
        historyMarkers = [];
    }

    // 计算边界
    const lats = historyRecords.map(r => r.latitude);
    const lngs = historyRecords.map(r => r.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // 创建地图
    historyMap = L.map('history-map', {
        center: [centerLat, centerLng],
        zoom: 13,
        zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(historyMap);

    // 绘制轨迹线
    const pathCoords = historyRecords.map(r => [r.latitude, r.longitude]);
    const polyline = L.polyline(pathCoords, {
        color: '#22C55E',
        weight: 4,
        opacity: 0.8
    }).addTo(historyMap);

    // 为轨迹线添加点击事件
    polyline.on('click', function(e) {
        // 找到最近的轨迹点
        const clickLat = e.latlng.lat;
        const clickLng = e.latlng.lng;
        let minDist = Infinity;
        let nearestRecord = null;
        let nearestIndex = -1;

        historyRecords.forEach((r, index) => {
            const dist = Math.sqrt(
                Math.pow(r.latitude - clickLat, 2) +
                Math.pow(r.longitude - clickLng, 2)
            );
            if (dist < minDist) {
                minDist = dist;
                nearestRecord = r;
                nearestIndex = index;
            }
        });

        if (nearestRecord) {
            // 创建弹窗内容
            const popupContent = createPopupContent(nearestRecord, nearestIndex);

            // 显示弹窗
            L.popup({
                maxWidth: 300,
                className: 'custom-popup'
            })
            .setLatLng([nearestRecord.latitude, nearestRecord.longitude])
            .setContent(popupContent)
            .openOn(historyMap);
        }
    });

    // 添加轨迹点标记（每隔一定间隔添加一个可点击的点）
    const pointInterval = Math.max(1, Math.floor(historyRecords.length / 20)); // 最多20个点
    const pointIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div class="w-3 h-3 bg-cta rounded-full border-2 border-white shadow cursor-pointer hover:bg-cta/80" style="cursor: pointer;"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });

    historyRecords.forEach((record, index) => {
        if (index % pointInterval === 0) {
            const marker = L.marker([record.latitude, record.longitude], {
                icon: pointIcon,
                title: '点击查看详情'
            }).addTo(historyMap);

            // 点击标记显示弹窗
            marker.on('click', function() {
                const popupContent = createPopupContent(record, index);
                L.popup({
                    maxWidth: 300,
                    className: 'custom-popup'
                })
                .setLatLng([record.latitude, record.longitude])
                .setContent(popupContent)
                .openOn(historyMap);
            });
        }
    });

    // 添加起点和终点标记
    const startIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div class="w-5 h-5 bg-cta rounded-full border-2 border-white shadow flex items-center justify-center text-white text-xs font-bold">起</div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
    const endIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div class="w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow flex items-center justify-center text-white text-xs font-bold">终</div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    L.marker([historyRecords[0].latitude, historyRecords[0].longitude], { icon: startIcon })
        .addTo(historyMap).bindPopup('起点');
    L.marker([historyRecords[historyRecords.length - 1].latitude, historyRecords[historyRecords.length - 1].longitude], { icon: endIcon })
        .addTo(historyMap).bindPopup('终点');

    // 适配边界
    historyMap.fitBounds(polyline.getBounds(), { padding: [20, 20] });
}

// 创建弹窗内容
function createPopupContent(record, index) {
    const rsrpColor = record.rsrp >= -80 ? '#22C55E' : record.rsrp >= -100 ? '#F59E0B' : '#EF4444';
    const sinrColor = record.sinr >= 15 ? '#22C55E' : record.sinr >= 5 ? '#F59E0B' : '#EF4444';
    const pingColor = record.pingLatency <= 50 ? '#22C55E' : record.pingLatency <= 100 ? '#F59E0B' : '#EF4444';

    return `
        <div style="font-family: 'Inter', sans-serif; padding: 8px; min-width: 220px; background: #1E293B; color: #F1F5F9;">
            <div style="font-weight: 600; font-size: 14px; color: #F1F5F9; margin-bottom: 10px; border-bottom: 1px solid #334155; padding-bottom: 8px;">
                轨迹点 #${index + 1}
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #94A3B8;">时间</span>
                    <span style="color: #F1F5F9; font-weight: 500;">${record.timeDisplay}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #94A3B8;">小区号(CID)</span>
                    <span style="color: #F1F5F9; font-weight: 500; font-family: monospace;">${record.cid}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #94A3B8;">网络制式</span>
                    <span style="color: #3B82F6; font-weight: 500;">${networkTypes[record.networkType]}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #94A3B8;">信号强度(RSRP)</span>
                    <span style="color: ${rsrpColor}; font-weight: 600;">${record.rsrp.toFixed(1)} dBm</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #94A3B8;">信噪比(SINR)</span>
                    <span style="color: ${sinrColor}; font-weight: 600;">${record.sinr.toFixed(1)} dB</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #94A3B8;">Ping时延</span>
                    <span style="color: ${pingColor}; font-weight: 600;">${record.pingLatency} ms</span>
                </div>
            </div>
        </div>
    `;
}
