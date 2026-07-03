// ========== 网络覆盖热力图页面 ==========

// 城市列表数据
const cityList = [
    { id: 'beijing', name: '北京市', center: [39.9042, 116.4074] },
    { id: 'shanghai', name: '上海市', center: [31.2304, 121.4737] },
    { id: 'guangzhou', name: '广州市', center: [23.1291, 113.2644] },
    { id: 'shenzhen', name: '深圳市', center: [22.5431, 114.0579] },
    { id: 'chengdu', name: '成都市', center: [30.5728, 104.0668] },
    { id: 'hangzhou', name: '杭州市', center: [30.2741, 120.1551] },
    { id: 'wuhan', name: '武汉市', center: [30.5928, 114.3055] },
    { id: 'nanjing', name: '南京市', center: [32.0603, 118.7969] },
    { id: 'tianjin', name: '天津市', center: [39.0842, 117.2009] },
    { id: 'chongqing', name: '重庆市', center: [29.5630, 106.5516] }
];

// 热力图地图实例
let heatmapMap = null;
let heatmapLayer = null;
let poorAreaMarkers = [];

// 生成模拟热力图数据
function generateHeatmapData(cityId) {
    const city = cityList.find(c => c.id === cityId);
    if (!city) return [];

    const data = [];
    const baseLat = city.center[0];
    const baseLng = city.center[1];

    // 生成覆盖区域数据点
    for (let i = 0; i < 200; i++) {
        const lat = baseLat + (Math.random() - 0.5) * 0.15;
        const lng = baseLng + (Math.random() - 0.5) * 0.2;
        // 信号强度：0-100，越大越好
        let signal = Math.random() * 100;

        // 在某些区域设置较差信号
        if (Math.random() < 0.15) {
            signal = Math.random() * 30; // 差信号区域
        }

        data.push({
            lat: lat,
            lng: lng,
            signal: signal,
            count: Math.floor(Math.random() * 50) + 10 // 数据采集数量
        });
    }

    return data;
}

// 生成Top 10质差区域
function generatePoorAreas(cityId) {
    const city = cityList.find(c => c.id === cityId);
    if (!city) return [];

    const areas = [];
    const baseLat = city.center[0];
    const baseLng = city.center[1];

    for (let i = 1; i <= 10; i++) {
        const lat = baseLat + (Math.random() - 0.5) * 0.12;
        const lng = baseLng + (Math.random() - 0.5) * 0.15;
        const avgSignal = 15 + Math.random() * 25; // 平均信号差
        const vehicleCount = Math.floor(Math.random() * 100) + 20;
        const rsrpAvg = -120 + Math.random() * 15;

        areas.push({
            rank: i,
            lat: lat,
            lng: lng,
            name: `质差区域 #${i}`,
            avgSignal: avgSignal.toFixed(1),
            vehicleCount: vehicleCount,
            rsrpAvg: rsrpAvg.toFixed(1),
            radius: 1000 // 方圆1000米
        });
    }

    return areas.sort((a, b) => parseFloat(a.avgSignal) - parseFloat(b.avgSignal));
}

function renderHeatmapPage() {
    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen">
                ${renderHeader()}
                <div class="flex-1 p-6 overflow-hidden flex flex-col">
                    <!-- 城市选择和统计 -->
                    <div class="bg-surface rounded-xl border border-border shadow-lg p-4 mb-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <div class="flex items-center gap-2">
                                    <svg class="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    </svg>
                                    <span class="text-sm text-muted">选择城市</span>
                                </div>
                                <select id="city-selector" onchange="updateHeatmap()" class="px-4 py-2 bg-background border border-border rounded-lg text-primary focus:outline-none focus:border-cta cursor-pointer font-medium">
                                    ${cityList.map(city => `<option value="${city.id}">${city.name}</option>`).join('')}
                                </select>
                                <button onclick="updateHeatmap()" class="px-4 py-2 bg-cta text-white rounded-lg hover:bg-cta/90 transition-colors cursor-pointer font-medium text-sm flex items-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                    </svg>
                                    刷新数据
                                </button>
                            </div>
                            <div class="flex items-center gap-6">
                                <!-- 信号等级图例 -->
                                <div class="flex items-center gap-2 text-sm">
                                    <span class="text-muted">信号等级:</span>
                                    <div class="flex items-center gap-3">
                                        <div class="flex items-center gap-1">
                                            <div class="w-4 h-4 bg-blue-500 rounded"></div>
                                            <span class="text-xs text-muted">优秀</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <div class="w-4 h-4 bg-cta rounded"></div>
                                            <span class="text-xs text-muted">良好</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <div class="w-4 h-4 bg-amber-500 rounded"></div>
                                            <span class="text-xs text-muted">一般</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <div class="w-4 h-4 bg-red-500 rounded"></div>
                                            <span class="text-xs text-muted">较差</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 主内容区域 -->
                    <div class="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
                        <!-- 左侧：热力图地图 -->
                        <div class="lg:col-span-3 bg-surface rounded-xl border border-border shadow-lg overflow-hidden flex flex-col">
                            <div class="p-3 border-b border-border bg-background flex justify-between items-center">
                                <h3 class="font-semibold text-primary flex items-center gap-2">
                                    <svg class="w-4 h-4 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                                    </svg>
                                    网络覆盖热力图
                                </h3>
                                <span class="text-xs text-muted" id="heatmap-data-count">点击区域查看详情</span>
                            </div>
                            <div id="heatmap-map" class="flex-1 min-h-[400px]"></div>
                        </div>

                        <!-- 右侧：Top 10质差区域列表 -->
                        <div class="bg-surface rounded-xl border border-border shadow-lg overflow-hidden flex flex-col">
                            <div class="p-3 border-b border-border bg-background">
                                <h3 class="font-semibold text-primary flex items-center gap-2">
                                    <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                    </svg>
                                    Top 10 网络质差区域
                                </h3>
                                <p class="text-xs text-muted mt-1">方圆1000米范围统计</p>
                            </div>
                            <div id="poor-areas-list" class="flex-1 overflow-auto p-2">
                                <div class="text-center text-muted py-8 text-sm">请选择城市后查看</div>
                            </div>
                        </div>
                    </div>

                    <!-- 底部统计卡片 -->
                    <div class="mt-4 grid grid-cols-4 gap-4">
                        <div class="bg-surface rounded-xl border border-border p-4 shadow-lg">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-muted text-sm">数据采集点</span>
                                <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                    <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                    </svg>
                                </div>
                            </div>
                            <div class="text-xl font-bold text-primary" id="stat-collection-points">--</div>
                        </div>
                        <div class="bg-surface rounded-xl border border-border p-4 shadow-lg">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-muted text-sm">平均信号强度</span>
                                <div class="w-8 h-8 rounded-lg bg-cta/20 flex items-center justify-center">
                                    <svg class="w-4 h-4 text-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"/>
                                    </svg>
                                </div>
                            </div>
                            <div class="text-xl font-bold text-cta" id="stat-avg-signal">-- dBm</div>
                        </div>
                        <div class="bg-surface rounded-xl border border-border p-4 shadow-lg">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-muted text-sm">质差区域数</span>
                                <div class="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                                    <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                    </svg>
                                </div>
                            </div>
                            <div class="text-xl font-bold text-red-400" id="stat-poor-areas">-- 个</div>
                        </div>
                        <div class="bg-surface rounded-xl border border-border p-4 shadow-lg">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-muted text-sm">覆盖车辆数</span>
                                <div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                    <svg class="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                                    </svg>
                                </div>
                            </div>
                            <div class="text-xl font-bold text-purple-400" id="stat-vehicle-count">-- 辆</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>`;
}

function updateHeatmap() {
    const cityId = document.getElementById('city-selector').value;
    if (!cityId) return;

    // 生成数据
    const heatmapData = generateHeatmapData(cityId);
    const poorAreas = generatePoorAreas(cityId);

    // 更新统计
    document.getElementById('stat-collection-points').textContent = heatmapData.length.toLocaleString();
    const avgSignal = heatmapData.reduce((sum, d) => sum + d.signal, 0) / heatmapData.length;
    document.getElementById('stat-avg-signal').textContent = `${(avgSignal * 0.8 - 100).toFixed(1)} dBm`;
    document.getElementById('stat-poor-areas').textContent = `${poorAreas.length} 个`;
    document.getElementById('stat-vehicle-count').textContent = heatmapData.reduce((sum, d) => sum + d.count, 0).toLocaleString() + ' 辆';
    document.getElementById('heatmap-data-count').textContent = `共 ${heatmapData.length} 个数据采集点`;

    // 更新质差区域列表
    const poorAreasList = document.getElementById('poor-areas-list');
    poorAreasList.innerHTML = poorAreas.map(area => `
        <div onclick="focusPoorArea(${area.lat}, ${area.lng})" class="p-3 mb-2 bg-red-500/20 rounded-lg border border-red-500/40 cursor-pointer hover:bg-red-500/30 transition-colors">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-red-400">#${area.rank}</span>
                <span class="text-xs text-muted">${area.name}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="flex justify-between">
                    <span class="text-muted">信号:</span>
                    <span class="text-red-400 font-medium">${area.avgSignal}%</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-muted">RSRP:</span>
                    <span class="text-red-400 font-medium">${area.rsrpAvg} dBm</span>
                </div>
            </div>
            <div class="mt-2 text-xs text-muted flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                </svg>
                ${area.vehicleCount} 辆车 · 方圆${area.radius}米
            </div>
        </div>
    `).join('');

    // 初始化或更新地图
    initHeatmapMap(cityId, heatmapData, poorAreas);
}

function initHeatmapMap(cityId, data, poorAreas) {
    const city = cityList.find(c => c.id === cityId);
    if (!city) return;

    // 清除旧地图
    if (heatmapMap) {
        heatmapMap.remove();
        heatmapMap = null;
        heatmapLayer = null;
        poorAreaMarkers = [];
    }

    // 创建地图
    heatmapMap = L.map('heatmap-map', {
        center: city.center,
        zoom: 12,
        zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(heatmapMap);

    // 使用CircleMarker模拟热力图效果
    data.forEach(point => {
        let color, opacity;
        if (point.signal >= 80) {
            color = '#3B82F6'; // 蓝色 - 优秀
            opacity = 0.8;
        } else if (point.signal >= 60) {
            color = '#22C55E'; // 绿色 - 良好
            opacity = 0.7;
        } else if (point.signal >= 40) {
            color = '#F59E0B'; // 黄色 - 一般
            opacity = 0.6;
        } else {
            color = '#EF4444'; // 红色 - 较差
            opacity = 0.8;
        }

        L.circleMarker([point.lat, point.lng], {
            radius: 8 + point.count * 0.1,
            fillColor: color,
            color: color,
            weight: 1,
            opacity: opacity,
            fillOpacity: opacity * 0.5
        }).addTo(heatmapMap).bindPopup(`
            <div style="font-family: 'Inter', sans-serif; padding: 8px; background: #1E293B; color: #F1F5F9;">
                <div style="font-weight: 600; margin-bottom: 8px; color: #F1F5F9;">网络覆盖详情</div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                    <span style="color: #94A3B8;">信号强度</span>
                    <span style="color: ${color}; font-weight: 600;">${point.signal.toFixed(1)}%</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                    <span style="color: #94A3B8;">采集数量</span>
                    <span style="color: #F1F5F9;">${point.count} 条</span>
                </div>
            </div>
        `);
    });

    // 添加质差区域标记
    poorAreas.forEach(area => {
        const markerIcon = L.divIcon({
            className: 'custom-marker',
            html: `
                <div class="relative" style="width: 40px; height: 40px;">
                    <div style="width: 40px; height: 40px; background: rgba(239, 68, 68, 0.2); border: 2px solid #EF4444; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <span style="color: #EF4444; font-weight: bold; font-size: 12px;">#${area.rank}</span>
                    </div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        const marker = L.marker([area.lat, area.lng], { icon: markerIcon }).addTo(heatmapMap);

        // 绘制1000米半径圆
        L.circle([area.lat, area.lng], {
            radius: area.radius,
            color: '#EF4444',
            fillColor: '#EF4444',
            fillOpacity: 0.1,
            weight: 2
        }).addTo(heatmapMap);

        marker.bindPopup(`
            <div style="font-family: 'Inter', sans-serif; padding: 8px; min-width: 200px; background: #1E293B; color: #F1F5F9;">
                <div style="font-weight: 600; margin-bottom: 8px; color: #EF4444; border-bottom: 1px solid #334155; padding-bottom: 6px;">
                    Top #${area.rank} 质差区域
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #94A3B8;">区域名称</span>
                        <span style="color: #F1F5F9; font-weight: 500;">${area.name}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #94A3B8;">平均信号</span>
                        <span style="color: #EF4444; font-weight: 600;">${area.avgSignal}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #94A3B8;">平均RSRP</span>
                        <span style="color: #EF4444; font-weight: 600;">${area.rsrpAvg} dBm</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #94A3B8;">覆盖车辆</span>
                        <span style="color: #F1F5F9;">${area.vehicleCount} 辆</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #94A3B8;">统计范围</span>
                        <span style="color: #F1F5F9;">方圆 ${area.radius} 米</span>
                    </div>
                </div>
            </div>
        `);

        poorAreaMarkers.push(marker);
    });
}

function focusPoorArea(lat, lng) {
    if (heatmapMap) {
        heatmapMap.setView([lat, lng], 14);
        // 打开对应的弹窗
        poorAreaMarkers.forEach(marker => {
            if (marker.getLatLng().lat === lat && marker.getLatLng().lng === lng) {
                marker.openPopup();
            }
        });
    }
}
