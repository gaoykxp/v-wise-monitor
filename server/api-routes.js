/**
 * REST API路由模块 - 提供车型/车辆/网况数据查询接口
 */

const express = require('express');

function createApiRoutes(dataStore, faultStatsStore, pingTaskStore, dispatchPingTask, collectionConfigStore, dispatchCollectionConfig, alertRuleStore) {
    const router = express.Router();

    // ==================== 仪表盘 ====================

    /**
     * GET /api/dashboard
     * 系统概览统计
     */
    router.get('/dashboard', (req, res) => {
        const totalVehicles = dataStore.getTotalCount();
        const onlineVehicles = dataStore.getOnlineCount();

        res.json({
            totalVehicles,
            onlineVehicles,
            offlineVehicles: totalVehicles - onlineVehicles,
            alertCount: 0, // 可根据实际告警数据计算
            mqttConnected: true // 可从mqtt-client获取
        });
    });

    // ==================== 车型管理 ====================

    /**
     * GET /api/models
     * 获取车型列表（含在线/离线车辆数）
     */
    router.get('/models', (req, res) => {
        const models = dataStore.getVehicleModels();
        res.json(models);
    });

    /**
     * GET /api/models/:modelId
     * 获取单个车型详情
     */
    router.get('/models/:modelId', (req, res) => {
        const model = dataStore.vehicleModels.find(m => m.id === req.params.modelId);
        if (!model) {
            return res.status(404).json({ error: '车型不存在' });
        }
        const vehicles = dataStore.getVehiclesByModel(model.id);
        res.json({
            ...model,
            onlineCount: vehicles.filter(v => v.status === 'online').length,
            offlineCount: vehicles.filter(v => v.status === 'offline').length,
            vehicles: vehicles
        });
    });

    // ==================== 车辆列表 ====================

    /**
     * GET /api/models/:modelId/vehicles
     * 获取指定车型的车辆列表
     * query: ?search=关键词
     */
    router.get('/models/:modelId/vehicles', (req, res) => {
        const { search } = req.query;
        let vehicles = dataStore.getVehiclesByModel(req.params.modelId);

        if (search) {
            const kw = search.toLowerCase();
            vehicles = vehicles.filter(v =>
                v.vid.toLowerCase().includes(kw) ||
                v.plateNumber.toLowerCase().includes(kw)
            );
        }

        res.json(vehicles);
    });

    // ==================== 车型网络故障分析 ====================

    /**
     * GET /api/fault-stats/models
     * 获取车型网络故障分析摘要
     */
    router.get('/fault-stats/models', (req, res) => {
        if (!faultStatsStore) {
            return res.status(503).json({ error: '车型故障统计服务不可用' });
        }
        res.json(faultStatsStore.getModelSummaries());
    });

    /**
     * GET /api/fault-stats/models/:modelId
     * 获取单个车型网络故障分析详情
     */
    router.get('/fault-stats/models/:modelId', (req, res) => {
        if (!faultStatsStore) {
            return res.status(503).json({ error: '车型故障统计服务不可用' });
        }
        const days = parseInt(req.query.days, 10) || 30;
        const detail = faultStatsStore.getModelDetail(req.params.modelId, days);
        if (!detail) {
            return res.status(404).json({ error: '车型故障统计不存在' });
        }
        res.json(detail);
    });

    // ==================== Ping测任务管理 ====================

    /**
     * GET /api/ping-tasks?vid=xxx
     * 获取Ping测任务列表
     */
    router.get('/ping-tasks', (req, res) => {
        if (!pingTaskStore) {
            return res.status(503).json({ error: 'Ping测任务服务不可用' });
        }
        pingTaskStore.refreshStatuses();
        res.json(pingTaskStore.listTasks({ vid: req.query.vid }));
    });

    /**
     * GET /api/ping-tasks/:taskId
     * 获取Ping测任务详情
     */
    router.get('/ping-tasks/:taskId', (req, res) => {
        if (!pingTaskStore) {
            return res.status(503).json({ error: 'Ping测任务服务不可用' });
        }
        const task = pingTaskStore.getTask(req.params.taskId);
        if (!task) {
            return res.status(404).json({ error: 'Ping测任务不存在' });
        }
        res.json(task);
    });

    /**
     * GET /api/ping-tasks/:taskId/history
     * 获取Ping测任务实时上报明细
     */
    router.get('/ping-tasks/:taskId/history', (req, res) => {
        if (!pingTaskStore) {
            return res.status(503).json({ error: 'Ping测任务服务不可用' });
        }
        const limit = parseInt(req.query.limit, 10) || 200;
        const records = pingTaskStore.getTaskHistory(req.params.taskId, limit);
        res.json({ taskId: req.params.taskId, count: records.length, records });
    });

    /**
     * DELETE /api/ping-tasks/:taskId
     * 删除Ping测任务
     */
    router.delete('/ping-tasks/:taskId', (req, res) => {
        if (!pingTaskStore) {
            return res.status(503).json({ error: 'Ping测任务服务不可用' });
        }
        const task = pingTaskStore.deleteTask(req.params.taskId);
        if (!task) {
            return res.status(404).json({ error: 'Ping测任务不存在' });
        }
        res.json({ success: true, task });
    });

    /**
     * GET /api/ping-task-vehicles
     * 获取可下发Ping测任务的终端列表
     */
    router.get('/ping-task-vehicles', (req, res) => {
        const vehicles = [];
        dataStore.vehicleModels.forEach(model => {
            dataStore.getVehiclesByModel(model.id).forEach(vehicle => {
                vehicles.push({
                    ...vehicle,
                    modelName: model.name
                });
            });
        });
        res.json(vehicles);
    });

    /**
     * POST /api/ping-tasks
     * 新增并下发Ping测任务
     */
    router.post('/ping-tasks', (req, res) => {
        if (!pingTaskStore) {
            return res.status(503).json({ error: 'Ping测任务服务不可用' });
        }

        const { taskName, modelId, vid, target, serverIp, startTime, duration, frequency } = req.body;
        if (!taskName || !modelId || !vid || !target || !serverIp || !startTime || !duration || !frequency) {
            return res.status(400).json({ error: '缺少必填字段' });
        }

        const model = dataStore.vehicleModels.find(m => m.id === modelId);
        if (!model || dataStore.getModelByImei(vid) !== modelId) {
            return res.status(400).json({ error: '车型或终端不存在' });
        }

        const task = pingTaskStore.createTask(req.body);
        if (task.taskStatus === '进行中' && dispatchPingTask) {
            dispatchPingTask(task);
        }
        res.json({ success: true, task });
    });

    // ==================== SDK数据采集配置 ====================

    /**
     * GET /api/sdk-collection-configs
     * 获取已下发的采集配置列表
     */
    router.get('/sdk-collection-configs', (req, res) => {
        if (!collectionConfigStore) {
            return res.status(503).json({ error: '采集配置服务不可用' });
        }
        res.json(collectionConfigStore.listConfigs());
    });

    /**
     * POST /api/sdk-collection-configs
     * 新增并下发采集配置
     * body: { name, scope:'model'|'vid', modelId, vids:[], vid, category:'full'|'core', frequency, retention }
     */
    router.post('/sdk-collection-configs', (req, res) => {
        if (!collectionConfigStore) {
            return res.status(503).json({ error: '采集配置服务不可用' });
        }
        const { name, scope, category, frequency, retention } = req.body;
        if (!name || !scope || !category) {
            return res.status(400).json({ error: '缺少必填字段（name/scope/category）' });
        }
        if (scope === 'vid' && !req.body.vid) {
            return res.status(400).json({ error: '按VID配置缺少 vid' });
        }
        if (scope === 'model' && !req.body.modelId) {
            return res.status(400).json({ error: '按车型配置缺少 modelId' });
        }

        // model 模式：vids 即选中车辆 imei 列表；为空则下发到该车型全部车辆
        let targetVids = [];
        if (scope === 'vid') {
            targetVids = [req.body.vid];
        } else {
            targetVids = Array.isArray(req.body.vids) ? req.body.vids.filter(Boolean) : [];
            if (targetVids.length === 0) {
                // 未勾选则默认该车型全部车辆（imei）
                targetVids = dataStore.getVehiclesByModel(req.body.modelId).map(v => v.vid);
            }
        }
        if (targetVids.length === 0) {
            return res.status(400).json({ error: '未找到目标设备' });
        }

        const config = collectionConfigStore.createConfig({
            ...req.body,
            vids: targetVids
        });

        // 立即经 MQTT 下发到每个目标设备
        if (dispatchCollectionConfig) {
            dispatchCollectionConfig(config);
        }
        res.json({ success: true, config });
    });

    /**
     * DELETE /api/sdk-collection-configs/:id
     * 删除采集配置（仅删除记录，不下发撤销指令）
     */
    router.delete('/sdk-collection-configs/:id', (req, res) => {
        if (!collectionConfigStore) {
            return res.status(503).json({ error: '采集配置服务不可用' });
        }
        const config = collectionConfigStore.deleteConfig(req.params.id);
        if (!config) {
            return res.status(404).json({ error: '采集配置不存在' });
        }
        res.json({ success: true, config });
    });

    // ==================== 预警规则 ====================

    const ALERT_VALID_METRICS = ['rsrp', 'rsrq', 'sinr'];

    /**
     * GET /api/models/:modelId/alert-rules
     * 获取指定车型的预警规则列表
     */
    router.get('/models/:modelId/alert-rules', (req, res) => {
        if (!alertRuleStore) {
            return res.status(503).json({ error: '预警规则服务不可用' });
        }
        res.json(alertRuleStore.listRules(req.params.modelId));
    });

    /**
     * GET /api/alert-rules?modelId=xxx
     * 获取预警规则列表（全部或按 modelId 过滤）
     */
    router.get('/alert-rules', (req, res) => {
        if (!alertRuleStore) {
            return res.status(503).json({ error: '预警规则服务不可用' });
        }
        res.json(alertRuleStore.listRules(req.query.modelId || undefined));
    });

    /**
     * POST /api/alert-rules
     * 新增预警规则
     * body: { modelId, imei, alertType, metric, threshold, durationSec }
     */
    router.post('/alert-rules', (req, res) => {
        if (!alertRuleStore) {
            return res.status(503).json({ error: '预警规则服务不可用' });
        }
        const { modelId, imei, alertType, metric, threshold, durationSec } = req.body;
        if (!modelId || !imei || !alertType) {
            return res.status(400).json({ error: '缺少 modelId/imei/alertType' });
        }
        if (!ALERT_VALID_METRICS.includes(metric)) {
            return res.status(400).json({ error: 'metric 必须为 rsrp/rsrq/sinr' });
        }
        if (threshold === undefined || isNaN(Number(threshold))) {
            return res.status(400).json({ error: 'threshold 必须为数值' });
        }
        if (durationSec === undefined || isNaN(Number(durationSec)) || Number(durationSec) <= 0) {
            return res.status(400).json({ error: 'durationSec 必须为正数' });
        }
        const rule = alertRuleStore.createRule({ modelId, imei, alertType, metric, threshold, durationSec });
        res.json(rule);
    });

    /**
     * PUT /api/alert-rules/:id
     * 更新预警规则
     */
    router.put('/alert-rules/:id', (req, res) => {
        if (!alertRuleStore) {
            return res.status(503).json({ error: '预警规则服务不可用' });
        }
        const rule = alertRuleStore.updateRule(req.params.id, req.body);
        if (!rule) {
            return res.status(404).json({ error: '预警规则不存在' });
        }
        res.json(rule);
    });

    /**
     * DELETE /api/alert-rules/:id
     * 删除预警规则
     */
    router.delete('/alert-rules/:id', (req, res) => {
        if (!alertRuleStore) {
            return res.status(503).json({ error: '预警规则服务不可用' });
        }
        const rule = alertRuleStore.deleteRule(req.params.id);
        if (!rule) {
            return res.status(404).json({ error: '预警规则不存在' });
        }
        res.json({ success: true });
    });

    // ==================== 车辆详情 ====================

    /**
     * GET /api/vehicles/:imei
     * 获取车辆实时网况数据
     */
    router.get('/vehicles/:imei', (req, res) => {
        const detail = dataStore.getVehicleDetail(req.params.imei);
        if (!detail.data) {
            return res.status(404).json({ error: '车辆数据不存在' });
        }
        res.json(detail);
    });

    /**
     * GET /api/vehicles/:imei/history
     * 获取车辆历史网况数据
     * query: ?hours=24
     */
    router.get('/vehicles/:imei/history', (req, res) => {
        const hours = parseInt(req.query.hours) || 24;
        const history = dataStore.getHistoryData(req.params.imei, hours);
        res.json({
            vid: req.params.imei,
            hours: hours,
            count: history.length,
            records: history
        });
    });

    // ==================== IMEI映射管理 ====================

    /**
     * POST /api/mappings
     * 添加IMEI到车型的映射
     * body: { imei, modelId }
     */
    router.post('/mappings', (req, res) => {
        const { imei, modelId } = req.body;
        if (!imei || !modelId) {
            return res.status(400).json({ error: '缺少imei或modelId' });
        }
        const model = dataStore.vehicleModels.find(m => m.id === modelId);
        if (!model) {
            return res.status(400).json({ error: '车型不存在' });
        }
        dataStore.addImeiMapping(imei, modelId);
        res.json({ success: true, imei, modelId });
    });

    /**
     * GET /api/mappings
     * 获取所有IMEI映射
     */
    router.get('/mappings', (req, res) => {
        res.json(dataStore.imeiModelMap);
    });

    // ==================== 系统状态 ====================

    /**
     * GET /api/status
     * 获取后端系统状态
     */
    router.get('/status', (req, res) => {
        res.json({
            status: 'running',
            mqttConnected: true,
            wsClients: 0,
            vehicleCount: dataStore.getTotalCount(),
            onlineCount: dataStore.getOnlineCount(),
            uptime: process.uptime()
        });
    });

    return router;
}

module.exports = createApiRoutes;
