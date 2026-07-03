/**
 * MQTT客户端模块 - 订阅车辆SDK发布的网况数据
 * 订阅topic: v-wise-network/#
 * 消息格式参考 v-wise-agent-cpp-sdk 的 probe_mgr.cpp
 */

const mqtt = require('mqtt');
const config = require('./config.json');

// MQTT注册状态映射 (SDK发送字符串 → 前端数字编码)
const REG_STATUS_MAP = {
    'NOT_REGISTERED': 0,
    'REGISTERED_HOME': 1,
    'REGISTERED_ROAMING': 2,
    'REGISTERING': 3,
    'REGISTRATION_FAILED': 4,
    'LIMITED_SERVICE': 5
};

// SDK网络制式 → 前端网络制式映射
const NET_TYPE_MAP = {
    'LTE': 'LTE',
    'NR': 'NR5G_SA',
    'NR5G_SA': 'NR5G_SA',
    'NR5G_NSA': 'NR5G_NSA',
    'WCDMA': 'WCDMA',
    'GSM': 'GSM'
};

class MqttClient {
    constructor(dataStore, pingTaskStore = null) {
        this.dataStore = dataStore;
        this.pingTaskStore = pingTaskStore;
        this.client = null;
        this.connected = false;
    }

    /**
     * 连接MQTT Broker并订阅topic
     */
    connect() {
        const mqttConfig = config.mqtt;

        const options = {
            clientId: mqttConfig.clientId,
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 30000
        };

        if (mqttConfig.username) {
            options.username = mqttConfig.username;
            options.password = mqttConfig.password;
        }

        const topics = Array.isArray(mqttConfig.topics) ? mqttConfig.topics : [mqttConfig.topic];

        console.log(`[MQTT] 正在连接 Broker: ${mqttConfig.broker}`);
        console.log(`[MQTT] 订阅 Topics: ${topics.join(', ')}`);

        this.client = mqtt.connect(mqttConfig.broker, options);

        this.client.on('connect', () => {
            this.connected = true;
            console.log('[MQTT] 已连接到 Broker');

            // 同时订阅SDK实际topic和模拟器topic
            this.client.subscribe(topics, { qos: 0 }, (err, granted) => {
                if (err) {
                    console.error('[MQTT] 订阅失败:', err);
                } else {
                    const grantedTopics = (granted || []).map(item => item.topic).join(', ');
                    console.log(`[MQTT] 已订阅 topics: ${grantedTopics}`);
                }
            });
        });

        this.client.on('message', (topic, message) => {
            this._handleMessage(topic, message);
        });

        this.client.on('error', (err) => {
            console.error('[MQTT] 连接错误:', err.message);
        });

        this.client.on('close', () => {
            this.connected = false;
            console.log('[MQTT] 连接已关闭');
        });

        this.client.on('reconnect', () => {
            console.log('[MQTT] 正在重连...');
        });

        this.client.on('offline', () => {
            this.connected = false;
            console.log('[MQTT] 离线');
        });
    }

    /**
     * 处理收到的MQTT消息
     * 支持两类topic格式:
     * 1. SDK实际格式: probe/devices/{imei}/{suffix}
     * 2. 示例格式: v-wise-network/{imei}/{suffix} 或 v-wise-network(flat)
     * suffix: data/up, wireless/up, ping/up, heartbeat, user/online, fault/up
     */
    _handleMessage(topic, message) {
        try {
            const payload = JSON.parse(message.toString());
            const topicParts = topic.split('/');

            let imei = null;
            let msgType = 'data';

            if (topicParts[0] === 'probe' && topicParts[1] === 'devices' && topicParts.length >= 4) {
                // probe/devices/{imei}/{suffix}
                imei = topicParts[2];
                msgType = topicParts.slice(3).join('/');
            } else if (topicParts[0] === 'v-wise-network' && topicParts.length >= 3) {
                // v-wise-network/{imei}/{suffix}
                imei = topicParts[1];
                msgType = topicParts.slice(2).join('/');
            } else if (topicParts[0] === 'v-wise-network' && topicParts.length === 2) {
                // v-wise-network/{imei}
                imei = topicParts[1];
                msgType = 'data';
            } else {
                // flat topic，IMEI从payload中取
                imei = this._extractImeiFromPayload(payload);
                msgType = this._detectMsgType(payload);
            }

            if (!imei) {
                console.warn('[MQTT] 无法识别设备IMEI, topic:', topic);
                return;
            }

            console.log(`[MQTT] 收到消息 - IMEI: ${imei}, 类型: ${msgType}`);

            // 根据消息类型处理
            switch (msgType) {
                case 'data/up':
                case 'data':
                    this._handleDataReport(imei, payload);
                    break;
                case 'wireless/up':
                case 'wireless':
                    this._handleWirelessReport(imei, payload);
                    break;
                case 'ping/up':
                case 'ping':
                    this._handlePingReport(imei, payload);
                    break;
                case 'user/online':
                case 'online':
                    this._handleOnline(imei, payload);
                    break;
                case 'heartbeat':
                    this._handleHeartbeat(imei, payload);
                    break;
                case 'fault/up':
                case 'fault':
                    this._handleFaultReport(imei, payload);
                    break;
                default:
                    // 尝试按数据上报格式处理
                    if (payload.system || payload.wireless) {
                        this._handleDataReport(imei, payload);
                    }
                    break;
            }

        } catch (err) {
            console.error('[MQTT] 消息解析错误:', err.message, 'topic:', topic);
        }
    }

    /**
     * 从payload中提取IMEI
     */
    _extractImeiFromPayload(payload) {
        if (payload.system && payload.system.imei) return payload.system.imei;
        if (payload.imei) return payload.imei;
        return null;
    }

    /**
     * 检测消息类型
     */
    _detectMsgType(payload) {
        if (payload.system && payload.wireless) return 'data';
        if (payload.cell_info) return 'wireless';
        if (payload.delay !== undefined && payload.lose_rate !== undefined) return 'ping';
        if (payload.task_list) return 'heartbeat';
        if (payload.imei && Object.keys(payload).length <= 2) return 'online';
        return 'data';
    }

    /**
     * 处理数据上报消息 (主要消息类型)
     * SDK格式 → 前端格式转换
     */
    _handleDataReport(imei, payload) {
        const vehicleData = this._convertDataReport(imei, payload);
        this.dataStore.updateVehicleData(imei, vehicleData);
    }

    /**
     * 处理无线网络数据上报
     */
    _handleWirelessReport(imei, payload) {
        const cellInfo = payload.cell_info && payload.cell_info[0] ? payload.cell_info[0] : {};
        const vehicleData = {
            vid: imei,
            wireless: {
                networkType: NET_TYPE_MAP[cellInfo.rat] || cellInfo.rat || 'UNKNOWN',
                registerStatus: cellInfo.state === 1 ? 1 : 0,
                errorCode: 0,
                rsrp: cellInfo.rsrp || 0,
                sinr: cellInfo.sinr || 0,
                rsrq: cellInfo.rsrq || 0,
                cid: parseInt(cellInfo.cid) || 0,
                tac: parseInt(cellInfo.tac) || 0
            },
            system: {
                cpuUsage: 0,
                memUsage: 0,
                timestamp: payload.time ? new Date(payload.time).toISOString() : new Date().toISOString(),
                longitude: payload.longitude || 0,
                latitude: payload.latitude || 0,
                deviceSn: ''
            }
        };
        this.dataStore.updateVehicleData(imei, vehicleData);
    }

    /**
     * 处理Ping测试结果
     */
    _handlePingReport(imei, payload) {
        if (this.pingTaskStore) {
            const pingUpdate = this.pingTaskStore.addPingResult(imei, payload);
            if (pingUpdate && this.dataStore.wsPushCallback) {
                this.dataStore.wsPushCallback({
                    type: 'ping-update',
                    taskId: pingUpdate.task.taskId,
                    imei,
                    task: pingUpdate.task,
                    result: pingUpdate.result
                });
            }
        }

        const existing = this.dataStore.getVehicleData(imei);
        if (existing) {
            existing.system.netDelay = payload.delay || 0;
            existing.system.netLoss = payload.lose_rate || 0;
            existing.system.pingTarget = payload.target_ip || '';
            if (payload.longitude) existing.system.longitude = payload.longitude;
            if (payload.latitude) existing.system.latitude = payload.latitude;
            existing.system.timestamp = payload.time ? new Date(payload.time).toISOString() : new Date().toISOString();
            this.dataStore.updateVehicleData(imei, existing);
        }
    }

    /**
     * 处理设备上线通知
     */
    _handleOnline(imei, payload) {
        this.dataStore.setVehicleOnline(imei, true);
    }

    /**
     * 处理心跳
     */
    _handleHeartbeat(imei, payload) {
        this.dataStore.updateHeartbeat(imei);
    }

    /**
     * 处理故障上报
     */
    _handleFaultReport(imei, payload) {
        // 故障报告格式与数据上报相同
        const vehicleData = this._convertDataReport(imei, payload);
        vehicleData.fault = true;
        this.dataStore.updateVehicleData(imei, vehicleData);
    }

    /**
     * 核心转换函数: SDK数据格式 → 前端数据格式
     *
     * SDK格式 (snake_case, 嵌套对象):
     * {
     *   "system": { "cpu_util", "imei", "sn", "mem_util", "timestamp", "longitude", "latitude", ... },
     *   "sim_card": { "imsi", "iccid", "status" },
     *   "wireless": { "net_type", "rsrp", "rsrq", "sinr", "cid", "tac", "reg_stat", "reg_err_code", ... }
     * }
     *
     * 前端格式 (camelCase):
     * {
     *   "vid", "wireless": { "networkType", "registerStatus", "errorCode", "rsrp", "sinr", "rsrq", "cid", "tac" },
     *   "sim": { "imei", "imsi", "iccid" },
     *   "system": { "cpuUsage", "memUsage", "timestamp", "longitude", "latitude", "deviceSn" }
     * }
     */
    _convertDataReport(imei, payload) {
        const sys = payload.system || {};
        const sim = payload.sim_card || {};
        const wireless = payload.wireless || {};

        // 解析注册状态: 优先使用字符串映射，兼容数字类型
        let registerStatus = 0;
        if (wireless.reg_stat) {
            if (typeof wireless.reg_stat === 'string') {
                registerStatus = REG_STATUS_MAP[wireless.reg_stat] !== undefined
                    ? REG_STATUS_MAP[wireless.reg_stat]
                    : 0;
            } else {
                registerStatus = wireless.reg_stat;
            }
        }

        return {
            vid: imei,
            wireless: {
                networkType: NET_TYPE_MAP[wireless.net_type] || wireless.net_type || 'UNKNOWN',
                registerStatus: registerStatus,
                errorCode: wireless.reg_err_code || 0,
                rsrp: wireless.rsrp || 0,
                sinr: wireless.sinr || 0,
                rsrq: wireless.rsrq || 0,
                cid: parseInt(wireless.cid) || 0,
                tac: parseInt(wireless.tac) || 0
            },
            sim: {
                imei: sys.imei || imei,
                imsi: sim.imsi || '',
                iccid: sim.iccid || ''
            },
            system: {
                cpuUsage: sys.cpu_util || 0,
                memUsage: sys.mem_util || 0,
                timestamp: sys.timestamp
                    ? (typeof sys.timestamp === 'number'
                        ? new Date(sys.timestamp).toISOString()
                        : sys.timestamp)
                    : new Date().toISOString(),
                longitude: sys.longitude || 0,
                latitude: sys.latitude || 0,
                deviceSn: sys.sn || '',
                swVersion: sys.sw_version || '',
                hwVersion: sys.hw_version || '',
                netDelay: sys.net_delay || 0,
                netLoss: sys.net_loss || 0
            },
            _raw: payload  // 保留原始数据
        };
    }

    /**
     * 下发Ping测任务到指定设备
     */
    publishPingTask(imei, payload) {
        if (!this.client || !this.connected) {
            console.warn('[MQTT] 未连接，无法下发Ping测任务:', imei);
            return false;
        }
        const topic = `probe/devices/${imei}/sys/commands`;
        this.client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
            if (err) {
                console.error('[MQTT] Ping测任务下发失败:', err.message);
            } else {
                console.log(`[MQTT] Ping测任务已下发: ${topic}`);
            }
        });
        return true;
    }

    /**
     * 下发SDK数据采集配置到指定设备
     * 与Ping测命令共用同一 topic，cpp sdk 按 payload 中 cmd_type 字段分流。
     */
    publishCollectionConfig(imei, payload) {
        if (!this.client || !this.connected) {
            console.warn('[MQTT] 未连接，无法下发采集配置:', imei);
            return false;
        }
        const topic = `probe/devices/${imei}/sys/commands`;
        this.client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
            if (err) {
                console.error('[MQTT] 采集配置下发失败:', err.message);
            } else {
                console.log(`[MQTT] 采集配置已下发: ${topic}`);
            }
        });
        return true;
    }

    /**
     * 断开MQTT连接
     */
    disconnect() {
        if (this.client) {
            this.client.end();
            console.log('[MQTT] 已断开连接');
        }
    }
}

module.exports = MqttClient;
