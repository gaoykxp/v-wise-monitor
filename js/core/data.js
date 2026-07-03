// ========== 用户 & 基础数据 ==========

const users = [
    { id: 1, username: 'admin', password: 'admin123', name: '系统管理员', role: 'admin', permissions: ['all'] },
    { id: 2, username: 'operator', password: 'op123', name: '运维人员', role: 'operator', permissions: ['view', 'export'] },
    { id: 3, username: 'viewer', password: 'view123', name: '观察员', role: 'viewer', permissions: ['view'] }
];

// 车型列表 - 优先从后端API获取，保留静态数据作为回退
let vehicleModels = [
    { id: 'VM001', name: '智行 X1', brand: '智行汽车', year: 2024, totalVehicles: 1280, description: '智能纯电轿车' },
    { id: 'VM002', name: '领航者 Pro', brand: '领航汽车', year: 2024, totalVehicles: 856, description: '智能SUV' },
    { id: 'VM003', name: '城市精灵', brand: '绿动出行', year: 2023, totalVehicles: 2340, description: '城市微型电动车' },
    { id: 'VM004', name: '星际旅行者', brand: '星际汽车', year: 2024, totalVehicles: 420, description: '高端商务MPV' },
    { id: 'VM005', name: '闪电 GT', brand: '极速科技', year: 2024, totalVehicles: 680, description: '高性能电动跑车' }
];

window._faultStatsModels = null;
window._faultStatsDetails = {};
window._pingTasks = [];
window._selectedPingTask = null;
window._pingTaskHistory = {};
window._pingTaskVehicles = [];
window._pingTaskSearch = '';
window._showPingTaskModal = false;
const FAULT_STATS_FETCH_DAYS = 60;
window._faultStatsDetailWindow = {
    visibleDays: 30,
    offset: 0
};
window._singleVehicleFaultModels = [];
window._singleVehicleFaultVehiclesByModel = {};
window._showFaultWorkOrderModal = false;

const networkTypes = {
    'LTE': '4G LTE',
    'NR5G_SA': '5G SA',
    'NR5G_NSA': '5G NSA',
    'WCDMA': '3G WCDMA',
    'GSM': '2G GSM',
    'UNKNOWN': '未知'
};

const registerStatus = {
    0: '未注册',
    1: '已注册-本地',
    2: '已注册-漫游',
    3: '注册中',
    4: '注册失败',
    5: '受限服务'
};

function generateVehicleData(vid, baseData = {}) {
    const now = new Date();
    const networkTypeKeys = Object.keys(networkTypes);
    const randomNetType = networkTypeKeys[Math.floor(Math.random() * networkTypeKeys.length)];
    return {
        vid: vid,
        wireless: {
            networkType: randomNetType,
            registerStatus: Math.random() > 0.1 ? 1 : Math.floor(Math.random() * 6),
            errorCode: Math.random() > 0.9 ? Math.floor(Math.random() * 100) : 0,
            rsrp: -80 - Math.random() * 30,
            sinr: 5 + Math.random() * 20,
            rsrq: -5 - Math.random() * 15,
            cid: 49003,
            tac: 10493
        },
        sim: {
            imei: '868220032249471',
            imsi: '460138800508594',
            iccid: '89860808192320000143'
        },
        system: {
            cpuUsage: 20 + Math.random() * 60,
            memUsage: 30 + Math.random() * 50,
            timestamp: now.toISOString(),
            longitude: baseData.longitude || 116.4074 + (Math.random() - 0.5) * 0.5,
            latitude: baseData.latitude || 39.9042 + (Math.random() - 0.5) * 0.3,
            deviceSn: baseData.deviceSn || `SN${vid.replace('VID', '')}`
        }
    };
}

function generateVehicles(modelId, count = 50) {
    const vehicles = [];
    for (let i = 1; i <= count; i++) {
        const vid = `VID${modelId.substring(2)}${String(i).padStart(4, '0')}`;
        vehicles.push({
            vid: vid,
            imei: `868220${modelId.substring(2)}${String(i).padStart(7, '0')}`,
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

const vehiclesByModel = {};
vehicleModels.forEach(model => {
    vehiclesByModel[model.id] = generateVehicles(model.id, Math.min(model.totalVehicles, 50));
});

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

function updateVehicleRealtime(vid) {
    return {
        rsrp: (Math.random() - 0.5) * 5,
        sinr: (Math.random() - 0.5) * 3,
        rsrq: (Math.random() - 0.5) * 2,
        cpuUsage: (Math.random() - 0.5) * 10,
        memUsage: (Math.random() - 0.5) * 5
    };
}

// 生成历史网况记录数据
function generateHistoryRecords(vid, startTime, endTime) {
    const records = [];
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const interval = 5 * 60 * 1000; // 每5分钟一条记录
    const networkTypeKeys = Object.keys(networkTypes);

    let baseLng = 116.4074;
    let baseLat = 39.9042;

    for (let t = start; t <= end; t += interval) {
        const time = new Date(t);
        const netType = networkTypeKeys[Math.floor(Math.random() * networkTypeKeys.length)];

        records.push({
            timestamp: time.toISOString(),
            timeDisplay: time.toLocaleString('zh-CN'),
            longitude: baseLng + (Math.random() - 0.5) * 0.01,
            latitude: baseLat + (Math.random() - 0.5) * 0.01,
            networkType: netType,
            registerStatus: Math.random() > 0.05 ? 1 : Math.floor(Math.random() * 6),
            rsrp: -80 - Math.random() * 30,
            sinr: 5 + Math.random() * 20,
            rsrq: -5 - Math.random() * 15,
            cid: Math.floor(Math.random() * 10000000) + 1000000,
            tac: Math.floor(Math.random() * 65535) + 1,
            pingLatency: Math.floor(Math.random() * 150) + 10 // ping时延 10-160ms
        });

        // 模拟位置移动
        baseLng += (Math.random() - 0.5) * 0.005;
        baseLat += (Math.random() - 0.5) * 0.005;
    }

    return records;
}
