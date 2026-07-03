/**
 * WebSocket推送模块 - 实时推送车辆数据到前端
 * 前端通过 ws://host:port/ws 连接，接收实时数据更新
 */

const { WebSocketServer } = require('ws');

class WsHandler {
    constructor(server, dataStore) {
        this.dataStore = dataStore;
        this.clients = new Map(); // clientId → { ws, subscriptions: Set<imei> }

        // 创建WebSocket服务器，挂在HTTP server上
        this.wss = new WebSocketServer({ server, path: '/ws' });

        this.wss.on('connection', (ws) => {
            const clientId = this._generateClientId();
            console.log(`[WS] 客户端连接: ${clientId}`);

            this.clients.set(clientId, {
                ws: ws,
                subscriptions: new Set() // 订阅的IMEI列表，空=接收所有
            });

            // 发送连接确认
            this._send(ws, {
                type: 'connected',
                clientId: clientId,
                message: 'V-Wise Monitor WebSocket 连接成功'
            });

            // 发送当前所有在线车辆数据
            this._sendInitialData(ws);

            ws.on('message', (data) => {
                this._handleMessage(clientId, ws, data);
            });

            ws.on('close', () => {
                console.log(`[WS] 客户端断开: ${clientId}`);
                this.clients.delete(clientId);
            });

            ws.on('error', (err) => {
                console.error(`[WS] 客户端错误: ${clientId}`, err.message);
            });
        });

        // 设置DataStore的推送回调
        this.dataStore.setWsPushCallback((message) => {
            this._broadcast(message);
        });

        console.log('[WS] WebSocket服务器已启动, 路径: /ws');
    }

    /**
     * 发送初始数据给新连接的客户端
     */
    _sendInitialData(ws) {
        // 发送车型列表
        this._send(ws, {
            type: 'models-update',
            models: this.dataStore.getVehicleModels()
        });

        // 发送所有在线车辆的最新数据
        for (const [imei, data] of Object.entries(this.dataStore.vehicleData)) {
            this._send(ws, {
                type: 'vehicle-update',
                imei: imei,
                data: data
            });
        }
    }

    /**
     * 处理客户端消息
     */
    _handleMessage(clientId, ws, rawData) {
        try {
            const msg = JSON.parse(rawData.toString());

            switch (msg.type) {
                case 'subscribe':
                    // 订阅特定车辆的数据更新
                    if (msg.imei) {
                        const client = this.clients.get(clientId);
                        if (client) {
                            client.subscriptions.add(msg.imei);
                            console.log(`[WS] 客户端 ${clientId} 订阅车辆: ${msg.imei}`);

                            // 立即发送该车辆当前数据
                            const data = this.dataStore.getVehicleData(msg.imei);
                            const history = this.dataStore.getHistoryData(msg.imei);
                            if (data) {
                                this._send(ws, {
                                    type: 'vehicle-update',
                                    imei: msg.imei,
                                    data: data,
                                    history: history
                                });
                            }
                        }
                    }
                    break;

                case 'unsubscribe':
                    // 取消订阅
                    if (msg.imei) {
                        const client = this.clients.get(clientId);
                        if (client) {
                            client.subscriptions.delete(msg.imei);
                            console.log(`[WS] 客户端 ${clientId} 取消订阅: ${msg.imei}`);
                        }
                    }
                    break;

                case 'ping':
                    this._send(ws, { type: 'pong', timestamp: Date.now() });
                    break;

                default:
                    console.log(`[WS] 未知消息类型: ${msg.type}`);
            }
        } catch (err) {
            console.error('[WS] 消息解析错误:', err.message);
        }
    }

    /**
     * 广播消息给相关客户端
     */
    _broadcast(message) {
        const targetImei = message.imei;

        for (const [clientId, client] of this.clients) {
            if (client.ws.readyState !== 1) continue; // 跳过非连接状态

            // 如果客户端有特定订阅，只推送订阅的数据
            if (client.subscriptions.size > 0) {
                if (targetImei && client.subscriptions.has(targetImei)) {
                    this._send(client.ws, message);
                }
            } else {
                // 无特定订阅，推送所有更新
                this._send(client.ws, message);
            }
        }
    }

    /**
     * 发送消息给指定客户端
     */
    _send(ws, data) {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify(data));
        }
    }

    /**
     * 生成客户端ID
     */
    _generateClientId() {
        return 'ws_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
    }

    /**
     * 获取在线WebSocket客户端数
     */
    getClientCount() {
        return this.clients.size;
    }
}

module.exports = WsHandler;
