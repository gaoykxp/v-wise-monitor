// 模拟数据 - 车联网网况监控平台

// 用户数据
const users = [
    { id: 1, username: 'admin', password: 'admin123', name: '系统管理员', role: 'admin', permissions: ['all'] },
    { id: 2, username: 'operator', password: 'op123', name: '运维人员', role: 'operator', permissions: ['view', 'export'] },
    { id: 3, username: 'viewer', password: 'view123', name: '观察员', role: 'viewer', permissions: ['view'] }
];

// 车型数据
const vehicleModels = [
    { id: 'VM001', name: '智行 X1', brand: '智行汽车', year: 2024, totalVehicles: 1280, description: '智能纯电轿车' },
    { id: 'VM002', name: '领航者 Pro', brand: '领航汽车', year: 2024, totalVehicles: 856, description: '智能SUV' },
    { id: 'VM003', name: '城市精灵', brand: '绿动出行', year: 2023, totalVehicles: 2340, description: '城市微型电动车' },
    { id: 'VM004', name: '星际旅行者', brand: '星际汽车', year: 2024, totalVehicles: 420, description: '高端商务MPV' },
    { id: 'VM005', name: '闪电 GT', brand: '极速科技', year: 2024, totalVehicles: 680, description: '高性能电动跑车' }
];

// 网络制式映射
const networkTypes = {
    'LTE': '4G LTE',
    'NR5G_SA': '5G SA',
    'NR5G_NSA': '5G NSA',
    'WCDMA': '3G WCDMA',
    'GSM': '2G GSM',
    'UNKNOWN': '未知'
};

// 注册状态映射
const registerStatus = {
    0: '未注册',
    1: '已注册-本地',
    2: '已注册-漫游',
    3: '注册中',
    4: '注册失败',
    5: '受限服务'
};

// 生成随机车辆数据
function generateVehicleData(vid, baseData = {}) {
    const now = new Date();
    const networkTypeKeys = Object.keys(networkTypes);
    const randomNetType = networkTypeKeys[Math.floor(Math.random() * networkTypeKeys.length)];

    return {
        vid: vid,
        // 无线类数据
        wireless: {
            networkType: randomNetType,
            registerStatus: Math.random() > 0.1 ? 1 : Math.floor(Math.random() * 6),
            errorCode: Math.random() > 0.9 ? Math.floor(Math.random() * 100) : 0,
            rsrp: -80 - Math.random() * 30, // -80 to -110 dBm
            sinr: 5 + Math.random() * 20, // 5 to 25 dB
            rsrq: -5 - Math.random() * 15, // -5 to -20 dB
            cid: 49003,
            tac: 10493
        },
        // SIM卡类数据
        sim: {
            imei: '868220032249471',
            imsi: '460138800508594',
            iccid: '89860808192320000143'
        },
        // 系统类数据
        system: {
            cpuUsage: 20 + Math.random() * 60, // 20-80%
            memUsage: 30 + Math.random() * 50, // 30-80%
            timestamp: now.toISOString(),
            longitude: baseData.longitude || 116.4074 + (Math.random() - 0.5) * 0.5,
            latitude: baseData.latitude || 39.9042 + (Math.random() - 0.5) * 0.3,
            deviceSn: baseData.deviceSn || `SN${vid.replace('VID', '')}`
        }
    };
}

// 生成车辆列表
function generateVehicles(modelId, count = 50) {
    const vehicles = [];
    for (let i = 1; i <= count; i++) {
        const vid = `VID${modelId.substring(2)}${String(i).padStart(4, '0')}`;
        vehicles.push({
            vid: vid,
            modelId: modelId,
            plateNumber: `京A${String(Math.floor(Math.random() * 90000) + 10000)}`,
            status: Math.random() > 0.15 ? 'online' : 'offline',
            lastUpdate: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            totalDistance: Math.floor(Math.random() * 50000) + 1000,
            alertCount: Math.floor(Math.random() * 10)
        });
    }
    return vehicles;
}

// 预生成车辆数据
const vehiclesByModel = {};
vehicleModels.forEach(model => {
    vehiclesByModel[model.id] = generateVehicles(model.id, Math.min(model.totalVehicles, 50));
});

// 车辆历史数据生成（用于图表）
function generateHistoryData(hours = 24) {
    const data = [];
    const now = Date.now();
    for (let i = hours; i >= 0; i--) {
        const time = new Date(now - i * 3600000);
        data.push({
            time: time.toISOString(),
            timeLabel: `${time.getHours()}:00`,
            rsrp: -80 - Math.random() * 30,
            sinr: 5 + Math.random() * 20,
            rsrq: -5 - Math.random() * 15,
            cpuUsage: 20 + Math.random() * 60,
            memUsage: 30 + Math.random() * 50
        });
    }
    return data;
}

// 实时数据更新模拟
function updateVehicleRealtime(vid) {
    const variation = {
        rsrp: (Math.random() - 0.5) * 5,
        sinr: (Math.random() - 0.5) * 3,
        rsrq: (Math.random() - 0.5) * 2,
        cpuUsage: (Math.random() - 0.5) * 10,
        memUsage: (Math.random() - 0.5) * 5
    };
    return variation;
}

// 区域统计
const regionStats = [
    { region: '华北区', online: 1250, offline: 89, alert: 23 },
    { region: '华东区', online: 1890, offline: 134, alert: 45 },
    { region: '华南区', online: 1560, offline: 78, alert: 32 },
    { region: '西南区', online: 890, offline: 56, alert: 18 },
    { region: '西北区', online: 450, offline: 34, alert: 12 }
];

// 告警类型统计
const alertTypes = [
    { type: '信号弱', count: 234, severity: 'warning' },
    { type: '注册失败', count: 56, severity: 'error' },
    { type: '设备离线', count: 189, severity: 'error' },
    { type: 'SIM异常', count: 23, severity: 'critical' },
    { type: '资源告警', count: 78, severity: 'warning' }
];