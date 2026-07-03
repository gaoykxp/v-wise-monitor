/**
 * 数据存储模块 - 管理车辆实时数据、历史数据、车型映射
 * 支持WebSocket客户端订阅特定车辆的数据推送
 */

const config = require('./config.json');

// 历史数据最大条数
const MAX_HISTORY_PER_VEHICLE = 2880; // 24小时 × 120条/小时 (30秒间隔)

class DataStore {
    constructor() {
        // 车辆实时数据 { imei: vehicleData }
        this.vehicleData = {};

        // 车辆历史数据 { imei: [historyEntry, ...] }
        this.historyData = {};

        // 车辆在线状态 { imei: { online: bool, lastSeen: timestamp } }
        this.vehicleStatus = {};

        // IMEI → 车型映射
        this.imeiModelMap = { ...config.imeiModelMapping };

        // 车型列表
        this.vehicleModels = [...config.vehicleModels];

        // WebSocket推送回调
        this.wsPushCallback = null;

        // 数据更新事件监听器
        this.listeners = [];
    }

    /**
     * 设置WebSocket推送回调
     */
    setWsPushCallback(callback) {
        this.wsPushCallback = callback;
    }

    /**
     * 添加数据更新监听器
     */
    addListener(listener) {
        this.listeners.push(listener);
    }

    /**
     * 通知监听器
     */
    _notify(event, data) {
        this.listeners.forEach(l => {
            try { l(event, data); } catch (e) { console.error('[DataStore] listener error:', e); }
        });
    }

    // ==================== 车辆数据操作 ====================

    /**
     * 更新车辆实时数据（来自MQTT消息）
     */
    updateVehicleData(imei, data) {
        const prevData = this.vehicleData[imei];
        this.vehicleData[imei] = data;

        // 更新在线状态
        this.vehicleStatus[imei] = {
            online: true,
            lastSeen: Date.now()
        };

        // 自动注册IMEI到车型（如果未映射，分配到第一个车型）
        if (!this.imeiModelMap[imei]) {
            this.imeiModelMap[imei] = this.vehicleModels[0].id;
            console.log(`[DataStore] 自动映射 IMEI: ${imei} → 车型: ${this.vehicleModels[0].name}`);
        }

        // 添加历史记录
        const historyEntry = {
            time: data.system.timestamp,
            timeLabel: new Date(data.system.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            rsrp: data.wireless.rsrp,
            sinr: data.wireless.sinr,
            rsrq: data.wireless.rsrq,
            cpuUsage: data.system.cpuUsage,
            memUsage: data.system.memUsage
        };

        if (!this.historyData[imei]) {
            this.historyData[imei] = [];
        }

        this.historyData[imei].push(historyEntry);

        // 限制历史数据长度
        if (this.historyData[imei].length > MAX_HISTORY_PER_VEHICLE) {
            this.historyData[imei] = this.historyData[imei].slice(-MAX_HISTORY_PER_VEHICLE);
        }

        // WebSocket实时推送
        if (this.wsPushCallback) {
            this.wsPushCallback({
                type: 'vehicle-update',
                imei: imei,
                data: data,
                history: historyEntry
            });
        }

        this._notify('vehicle-update', { imei, data });
    }

    /**
     * 设置车辆在线状态
     */
    setVehicleOnline(imei, online) {
        this.vehicleStatus[imei] = {
            online: online,
            lastSeen: Date.now()
        };

        if (!this.imeiModelMap[imei]) {
            this.imeiModelMap[imei] = this.vehicleModels[0].id;
        }

        if (this.wsPushCallback) {
            this.wsPushCallback({
                type: 'vehicle-status',
                imei: imei,
                online: online
            });
        }
    }

    /**
     * 更新心跳
     */
    updateHeartbeat(imei) {
        if (!this.vehicleStatus[imei]) {
            this.vehicleStatus[imei] = { online: true, lastSeen: Date.now() };
        } else {
            this.vehicleStatus[imei].lastSeen = Date.now();
            this.vehicleStatus[imei].online = true;
        }
    }

    /**
     * 获取车辆实时数据
     */
    getVehicleData(imei) {
        return this.vehicleData[imei] || null;
    }

    /**
     * 获取车辆历史数据
     */
    getHistoryData(imei, hours = 24) {
        const history = this.historyData[imei] || [];
        if (hours >= 24) return history;

        const cutoff = Date.now() - hours * 60 * 60 * 1000;
        return history.filter(h => new Date(h.time).getTime() >= cutoff);
    }

    // ==================== 车型/车辆查询 ====================

    /**
     * 获取车型列表
     */
    getVehicleModels() {
        return this.vehicleModels.map(model => {
            const vehicles = this.getVehiclesByModel(model.id);
            return {
                ...model,
                onlineCount: vehicles.filter(v => v.status === 'online').length,
                offlineCount: vehicles.filter(v => v.status === 'offline').length
            };
        });
    }

    /**
     * 获取指定车型的车辆列表
     */
    getVehiclesByModel(modelId) {
        const vehicles = [];
        for (const [imei, modelMap] of Object.entries(this.imeiModelMap)) {
            if (modelMap === modelId) {
                const status = this.vehicleStatus[imei] || { online: false, lastSeen: 0 };
                const data = this.vehicleData[imei];
                vehicles.push({
                    vid: imei,
                    modelId: modelId,
                    plateNumber: `京A${imei.slice(-5)}`,
                    status: status.online ? 'online' : 'offline',
                    lastUpdate: status.lastSeen ? new Date(status.lastSeen).toISOString() : null,
                    totalDistance: data ? Math.floor(Math.random() * 50000) + 1000 : 0,
                    alertCount: (data && data.wireless && data.wireless.rsrp < -110) ? Math.floor(Math.random() * 5) + 1 : 0
                });
            }
        }
        return vehicles;
    }

    /**
     * 获取车辆详情（实时数据 + 历史数据）
     */
    getVehicleDetail(imei) {
        const data = this.vehicleData[imei];
        const status = this.vehicleStatus[imei];
        const history = this.historyData[imei] || [];

        return {
            vid: imei,
            status: status || { online: false, lastSeen: 0 },
            data: data,
            history: history
        };
    }

    /**
     * 搜索车辆
     */
    searchVehicles(modelId, keyword) {
        const vehicles = this.getVehiclesByModel(modelId);
        if (!keyword) return vehicles;
        const kw = keyword.toLowerCase();
        return vehicles.filter(v =>
            v.vid.toLowerCase().includes(kw) ||
            v.plateNumber.toLowerCase().includes(kw)
        );
    }

    /**
     * 获取所有在线车辆数
     */
    getOnlineCount() {
        return Object.values(this.vehicleStatus).filter(s => s.online).length;
    }

    /**
     * 获取所有车辆数
     */
    getTotalCount() {
        return Object.keys(this.imeiModelMap).length;
    }

    /**
     * 检查超时离线的车辆（超过60秒无数据视为离线）
     */
    checkOfflineVehicles() {
        const OFFLINE_THRESHOLD = 60000; // 60秒
        const now = Date.now();
        let changed = false;

        for (const [imei, status] of Object.entries(this.vehicleStatus)) {
            if (status.online && (now - status.lastSeen) > OFFLINE_THRESHOLD) {
                status.online = false;
                changed = true;
                console.log(`[DataStore] 车辆离线: ${imei}`);
            }
        }

        if (changed && this.wsPushCallback) {
            this.wsPushCallback({
                type: 'status-update',
                models: this.getVehicleModels()
            });
        }
    }

    // ==================== IMEI映射管理 ====================

    /**
     * 添加IMEI到车型的映射
     */
    addImeiMapping(imei, modelId) {
        this.imeiModelMap[imei] = modelId;
        console.log(`[DataStore] 映射 IMEI: ${imei} → 车型: ${modelId}`);
    }

    /**
     * 获取IMEI对应的车型ID
     */
    getModelByImei(imei) {
        return this.imeiModelMap[imei] || null;
    }
}

module.exports = DataStore;
