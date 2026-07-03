/**
 * V-Wise Monitor 后端服务
 *
 * 功能:
 * 1. 订阅MQTT Broker的"v-wise-network"topic，接收车辆SDK发布的网况数据
 * 2. 将SDK数据格式转换为前端格式，存储到内存
 * 3. 通过WebSocket实时推送车辆数据更新到前端
 * 4. 提供REST API查询车型/车辆/历史数据
 *
 * 启动: node app.js
 * API: http://localhost:3000/api/*
 * WS:  ws://localhost:3000/ws
 */

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const config = require('./config.json');

const DataStore = require('./data-store');
const MqttClient = require('./mqtt-client');
const WsHandler = require('./ws-handler');
const FaultStatsStore = require('./fault-stats-store');
const PingTaskStore = require('./ping-task-store');
const CollectionConfigStore = require('./collection-config-store');
const AlertRuleStore = require('./alert-rule-store');
const createApiRoutes = require('./api-routes');

// ========== 初始化 ==========

const app = express();
const server = http.createServer(app);

// 中间件
app.use(cors({ origin: config.server.corsOrigin }));
app.use(express.json());

// 静态文件 - 托管前端
app.use(express.static(path.join(__dirname, '..')));

// ========== 数据存储 ==========

const dataStore = new DataStore();
const faultStatsStore = new FaultStatsStore(dataStore.vehicleModels);
faultStatsStore.ensureAllFiles();
const pingTaskStore = new PingTaskStore(dataStore);
const collectionConfigStore = new CollectionConfigStore(dataStore);
const alertRuleStore = new AlertRuleStore(dataStore);

// ========== MQTT客户端 ==========

const mqttClient = new MqttClient(dataStore, pingTaskStore);
mqttClient.connect();

function dispatchPingTask(task) {
    const ok = mqttClient.publishPingTask(task.vid, pingTaskStore.buildSdkPayload(task));
    if (ok) pingTaskStore.markDispatched(task.taskId);
    return ok;
}

// 下发SDK数据采集配置：对配置覆盖的每个设备 imei 各 publish 一条 collection_config 指令
function dispatchCollectionConfig(config) {
    const payload = collectionConfigStore.buildSdkPayload(config);
    let allOk = true;
    (config.vids || []).forEach(imei => {
        const ok = mqttClient.publishCollectionConfig(imei, { ...payload, vid: imei });
        if (!ok) allOk = false;
    });
    if (allOk) collectionConfigStore.markDispatched(config.id);
    return allOk;
}

// ========== REST API ==========

const apiRoutes = createApiRoutes(dataStore, faultStatsStore, pingTaskStore, dispatchPingTask, collectionConfigStore, dispatchCollectionConfig, alertRuleStore);
app.use('/api', apiRoutes);

// SPA回退 - 所有非API请求返回index.html
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '..', 'index.html'));
    }
});

// ========== WebSocket ==========

const wsHandler = new WsHandler(server, dataStore);

// ========== 定时任务 ==========

// 每30秒检查超时离线的车辆
setInterval(() => {
    dataStore.checkOfflineVehicles();
}, 30000);

// 每5秒检查待下发/到期的Ping测任务
setInterval(() => {
    pingTaskStore.getDueTasks().forEach(dispatchPingTask);
    pingTaskStore.refreshStatuses();
}, 5000);

// ========== 启动服务器 ==========

const PORT = config.server.port || 3000;

server.listen(PORT, () => {
    console.log('========================================');
    console.log('  V-Wise Monitor 后端服务已启动');
    console.log('========================================');
    console.log(`  HTTP:      http://localhost:${PORT}`);
    console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`  API:       http://localhost:${PORT}/api/status`);
    console.log(`  MQTT:      ${config.mqtt.broker}`);
    console.log(`  Topic:     ${config.mqtt.topic}`);
    console.log('========================================');
});

// ========== 优雅退出 ==========

process.on('SIGINT', () => {
    console.log('\n[Server] 正在关闭...');
    mqttClient.disconnect();
    server.close(() => {
        console.log('[Server] 已关闭');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    mqttClient.disconnect();
    server.close(() => {
        process.exit(0);
    });
});
