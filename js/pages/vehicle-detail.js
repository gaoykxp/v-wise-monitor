// ========== 车辆详情页面 ==========

let vehicleMap = null;
let vehicleMarker = null;

function renderVehicleDetailPage() {
    const { selectedVehicle, vehicleData, historyData } = Store.getState();
    if (!selectedVehicle) return renderModelsPage();
    const data = vehicleData[selectedVehicle.vid] || generateVehicleData(selectedVehicle.vid);
    const history = historyData[selectedVehicle.vid] || [];

    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen overflow-hidden">
                ${renderHeader()}
                <div class="flex-1 flex overflow-hidden">
                    <!-- 左侧指标面板 -->
                    <div class="w-2/3 flex flex-col p-4 overflow-auto">
                    <div class="mb-4">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-lg font-semibold text-primary">网络状态实时监控</h2>
                            <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-cta animate-pulse"></span><span class="text-sm text-cta font-medium">实时更新</span><span class="text-xs text-muted" id="update-timestamp">${new Date(data.system.timestamp).toLocaleTimeString('zh-CN')}</span></div>
                        </div>
                        <div class="grid grid-cols-4 gap-3">
                            ${renderMetricCard('RSRP', data.wireless.rsrp.toFixed(1), 'dBm', getSignalQuality(data.wireless.rsrp, 'rsrp'), '信号接收功率')}
                            ${renderMetricCard('SINR', data.wireless.sinr.toFixed(1), 'dB', getSignalQuality(data.wireless.sinr, 'sinr'), '干扰信噪比')}
                            ${renderMetricCard('RSRQ', data.wireless.rsrq.toFixed(1), 'dB', getSignalQuality(data.wireless.rsrq, 'rsrq'), '接收信号质量')}
                            ${renderMetricCard('网络制式', networkTypes[data.wireless.networkType], '', 'info', '当前注册网络')}
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div class="bg-surface rounded-xl border border-border p-4 shadow-lg">
                            <h3 class="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                                <svg class="w-4 h-4 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                                无线网络参数
                            </h3>
                            <div class="space-y-2 text-sm">
                                ${renderDataRow('注册状态', registerStatus[data.wireless.registerStatus], data.wireless.registerStatus === 1 ? 'text-cta font-medium' : 'text-amber-400 font-medium')}
                                ${renderDataRow('CID (小区ID)', data.wireless.cid.toString(), 'text-primary')}
                                ${renderDataRow('TAC (跟踪区码)', data.wireless.tac.toString(), 'text-primary')}
                                ${data.wireless.errorCode > 0 ? renderDataRow('错误码', data.wireless.errorCode.toString(), 'text-red-400 font-medium') : ''}
                            </div>
                        </div>
                        <div class="bg-surface rounded-xl border border-border p-4 shadow-lg">
                            <h3 class="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                                <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
                                系统资源状态
                            </h3>
                            <div class="space-y-3">
                                <div class="flex items-center justify-between"><span class="text-muted">CPU利用率</span><div class="flex items-center gap-2"><div class="w-32 h-2 bg-background rounded-full overflow-hidden"><div class="h-full bg-cta transition-all duration-300" style="width: ${data.system.cpuUsage}%"></div></div><span class="text-primary text-sm font-medium">${data.system.cpuUsage.toFixed(1)}%</span></div></div>
                                <div class="flex items-center justify-between"><span class="text-muted">内存利用率</span><div class="flex items-center gap-2"><div class="w-32 h-2 bg-background rounded-full overflow-hidden"><div class="h-full bg-blue-500 transition-all duration-300" style="width: ${data.system.memUsage}%"></div></div><span class="text-primary text-sm font-medium">${data.system.memUsage.toFixed(1)}%</span></div></div>
                            </div>
                        </div>
                    </div>
                    <div class="bg-surface rounded-xl border border-border p-4 mb-4 shadow-lg">
                        <h3 class="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                            <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/></svg>
                            SIM卡标识信息
                        </h3>
                        <div class="grid grid-cols-3 gap-4 text-sm">
                            ${renderDataRow('IMEI', data.sim.imei, 'text-primary')}
                            ${renderDataRow('IMSI', data.sim.imsi, 'text-primary')}
                            ${renderDataRow('ICCID', data.sim.iccid, 'text-primary')}
                        </div>
                    </div>
                    <div class="bg-surface rounded-xl border border-border p-4 shadow-lg">
                        <h3 class="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                            <svg class="w-4 h-4 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
                            信号强度趋势 (24小时)
                        </h3>
                        <div id="chart-container" class="h-48 relative">${renderSimpleChart(history)}</div>
                    </div>
                    <div class="bg-surface rounded-xl border border-border p-4 mb-4 shadow-lg">
                        <h3 class="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                            <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                            异常预警
                        </h3>
                        <div id="alert-warnings">${renderAlertWarnings(selectedVehicle.vid)}</div>
                    </div>
                </div>
                <!-- 右侧GIS地图 -->
                <div class="w-1/3 p-4 flex flex-col">
                    <div class="bg-surface rounded-xl border border-border overflow-hidden flex-1 shadow-lg">
                        <div class="p-3 border-b border-border bg-background">
                            <h3 class="text-sm font-semibold text-primary flex items-center gap-2">
                                <svg class="w-4 h-4 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                实时位置
                            </h3>
                        </div>
                        <div id="map" class="flex-1 min-h-[300px]" style="height: calc(100% - 44px);"></div>
                    </div>
                    <div class="mt-4 bg-surface rounded-xl border border-border p-4 shadow-lg">
                        <h3 class="text-sm font-semibold text-primary mb-3">位置信息</h3>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            ${renderDataRow('经度', formatCoordinate(getVehiclePosition(data)?.lng), 'text-primary', 'vehicle-longitude')}
                            ${renderDataRow('纬度', formatCoordinate(getVehiclePosition(data)?.lat), 'text-primary', 'vehicle-latitude')}
                            ${renderDataRow('设备序列号', data.system.deviceSn, 'text-primary')}
                            ${renderDataRow('VID', selectedVehicle.vid, 'text-cta font-medium')}
                        </div>
                    </div>
                </div>
            </div>
        </main>
        </div>`;
}

function renderMetricCard(title, value, unit, quality, description) {
    const qualityColors = {
        excellent: 'text-cta bg-cta/20',
        good: 'text-blue-400 bg-blue-500/20',
        moderate: 'text-amber-400 bg-amber-500/20',
        poor: 'text-red-400 bg-red-500/20',
        info: 'text-purple-400 bg-purple-500/20'
    };
    const qualityLabels = { excellent: '优秀', good: '良好', moderate: '一般', poor: '较差', info: '' };
    const classes = qualityColors[quality].split(' ');
    return `<div class="bg-surface rounded-xl border border-border p-4 shadow-lg"><div class="text-muted text-xs mb-1">${description}</div><div class="flex items-baseline gap-1"><span class="text-xl font-bold ${classes[0]}">${value}</span><span class="text-sm ${classes[0]}">${unit}</span></div>${qualityLabels[quality] ? `<span class="inline-block mt-1 px-2 py-0.5 rounded text-xs ${classes[0]} ${classes[1]} font-medium">${qualityLabels[quality]}</span>` : ''}</div>`;
}

function renderDataRow(label, value, valueClass, valueId) {
    const idAttr = valueId ? ` id="${valueId}"` : '';
    return `<div class="flex justify-between items-center"><span class="text-muted">${label}</span><span${idAttr} class="${valueClass} font-mono">${value}</span></div>`;
}

function toFiniteNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function getVehiclePosition(data) {
    if (!data || !data.system) return null;
    const lng = toFiniteNumber(data.system.longitude);
    const lat = toFiniteNumber(data.system.latitude);
    if (lng === null || lat === null) return null;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
    if (lng === 0 && lat === 0) return null;
    return { lat, lng };
}

function formatCoordinate(value) {
    const num = toFiniteNumber(value);
    return num === null ? '--' : num.toFixed(6);
}

function updatePositionInfo(data) {
    const position = getVehiclePosition(data);
    const lngEl = document.getElementById('vehicle-longitude');
    const latEl = document.getElementById('vehicle-latitude');
    if (lngEl) lngEl.textContent = position ? position.lng.toFixed(6) : '--';
    if (latEl) latEl.textContent = position ? position.lat.toFixed(6) : '--';
}

function showMapPlaceholder(text = '暂无有效定位数据') {
    const mapEl = document.getElementById('map');
    if (!mapEl || vehicleMap) return;
    mapEl.innerHTML = `<div class="h-full min-h-[300px] flex items-center justify-center text-muted text-sm">${text}</div>`;
}

function clearMapPlaceholder() {
    const mapEl = document.getElementById('map');
    if (mapEl && !vehicleMap) mapEl.innerHTML = '';
}

function refreshVehicleMap() {
    if (!vehicleMap || !vehicleMarker) {
        initMap();
        return;
    }
    updateMapPosition();
}

function resetVehicleMap() {
    if (vehicleMap) {
        vehicleMap.remove();
        vehicleMap = null;
        vehicleMarker = null;
    }
    // 同步清理故障定界详情页的信号点位地图，避免重新渲染后残留/叠加
    if (typeof faultSignalMap !== 'undefined' && faultSignalMap) {
        faultSignalMap.remove();
        faultSignalMap = null;
    }
}

function getSignalQuality(value, type) {
    if (type === 'rsrp') { if (value >= -80) return 'excellent'; if (value >= -90) return 'good'; if (value >= -100) return 'moderate'; return 'poor'; }
    if (type === 'sinr') { if (value >= 20) return 'excellent'; if (value >= 13) return 'good'; if (value >= 0) return 'moderate'; return 'poor'; }
    if (type === 'rsrq') { if (value >= -10) return 'excellent'; if (value >= -15) return 'good'; if (value >= -20) return 'moderate'; return 'poor'; }
    return 'info';
}

function renderSimpleChart(history) {
    if (!history || history.length === 0) return '<div class="text-muted text-center py-8">暂无历史数据</div>';
    const width = 100, height = 50;
    const rsrpMin = -140, rsrpMax = -40;
    const points = history.map((d, i) => { const x = (i / (history.length - 1)) * width; const y = height - ((d.rsrp - rsrpMin) / (rsrpMax - rsrpMin)) * height; return `${x},${y}`; }).join(' ');
    return `
        <svg viewBox="0 0 ${width} ${height}" class="w-full h-full" preserveAspectRatio="none">
            <defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#334155" stroke-width="0.5"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
            <polygon points="0,${height} ${points} ${width},${height}" fill="#22C55E" fill-opacity="0.2"/>
            <polyline points="${points}" fill="none" stroke="#22C55E" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted px-2"><span>24h前</span><span>现在</span></div>`;
}

function initMap() {
    const { selectedVehicle, vehicleData } = Store.getState();
    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    if (!selectedVehicle || !vehicleData[selectedVehicle.vid]) {
        showMapPlaceholder('定位数据加载中...');
        return;
    }

    const data = vehicleData[selectedVehicle.vid];
    const position = getVehiclePosition(data);
    if (!position) {
        showMapPlaceholder();
        return;
    }

    clearMapPlaceholder();
    if (!vehicleMap) {
        vehicleMap = L.map('map', { center: [position.lat, position.lng], zoom: 14, zoomControl: false });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 19 }).addTo(vehicleMap);
        const vehicleIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="relative"><div class="w-8 h-8 bg-cta rounded-full flex items-center justify-center shadow-lg"><svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg></div><div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cta rounded-full animate-ping"></div></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
        vehicleMarker = L.marker([position.lat, position.lng], { icon: vehicleIcon }).addTo(vehicleMap);
        setTimeout(() => vehicleMap.invalidateSize(), 0);
    } else {
        vehicleMarker.setLatLng([position.lat, position.lng]);
        vehicleMap.panTo([position.lat, position.lng]);
        vehicleMap.invalidateSize();
    }
}

function updateMapPosition() {
    const { selectedVehicle, vehicleData } = Store.getState();
    if (!selectedVehicle || !vehicleData[selectedVehicle.vid] || !vehicleMap || !vehicleMarker) return;
    const data = vehicleData[selectedVehicle.vid];
    const position = getVehiclePosition(data);
    if (!position) return;
    vehicleMarker.setLatLng([position.lat, position.lng]);
    vehicleMap.panTo([position.lat, position.lng]);
    vehicleMap.invalidateSize();
}
