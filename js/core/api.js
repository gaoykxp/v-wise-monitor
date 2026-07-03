// ========== 后端API & WebSocket 客户端 ==========

const API_BASE = window.location.origin; // 后端与前端同源
let wsConnection = null;
let wsReconnectTimer = null;
let pendingSubscriptions = new Set();

// API请求封装
async function apiFetch(path, options = {}) {
    try {
        const resp = await fetch(API_BASE + '/api' + path, options);
        if (!resp.ok) throw new Error(`API错误: ${resp.status}`);
        return await resp.json();
    } catch (err) {
        console.error('[API]', path, err.message);
        return null;
    }
}

// WebSocket连接管理
function connectWebSocket() {
    if (wsConnection && (wsConnection.readyState === WebSocket.OPEN || wsConnection.readyState === WebSocket.CONNECTING)) return;

    const wsUrl = API_BASE.replace(/^http/, 'ws') + '/ws';
    console.log('[WS] 连接:', wsUrl);

    wsConnection = new WebSocket(wsUrl);

    wsConnection.onopen = () => {
        console.log('[WS] 已连接');
        if (wsReconnectTimer) { clearInterval(wsReconnectTimer); wsReconnectTimer = null; }

        if (Store.state.currentPage === 'vehicle-detail' && Store.state.selectedVehicle) {
            pendingSubscriptions.add(Store.state.selectedVehicle.vid);
        }

        pendingSubscriptions.forEach(imei => {
            wsConnection.send(JSON.stringify({ type: 'subscribe', imei: imei }));
        });
        pendingSubscriptions.clear();
    };

    wsConnection.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            handleWsMessage(msg);
        } catch (e) {
            console.error('[WS] 消息解析错误:', e);
        }
    };

    wsConnection.onclose = () => {
        console.log('[WS] 连接断开，5秒后重连...');
        wsConnection = null;
        if (!wsReconnectTimer) {
            wsReconnectTimer = setInterval(() => { connectWebSocket(); }, 5000);
        }
    };

    wsConnection.onerror = (err) => {
        console.error('[WS] 连接错误');
    };
}

// 处理WebSocket推送消息
function handleWsMessage(msg) {
    switch (msg.type) {
        case 'vehicle-update':
            // 收到车辆数据更新，写入Store
            if (msg.imei && msg.data) {
                const vid = msg.imei;
                // 更新vehicleData
                Store.state.vehicleData[vid] = msg.data;
                // 如果正在查看该车辆，刷新UI
                if (Store.state.currentPage === 'vehicle-detail' && Store.state.selectedVehicle && Store.state.selectedVehicle.vid === vid) {
                    // 更新历史数据
                    if (msg.history) {
                        if (!Store.state.historyData[vid]) Store.state.historyData[vid] = [];
                        Store.state.historyData[vid].push(msg.history);
                        if (Store.state.historyData[vid].length > 2880) {
                            Store.state.historyData[vid] = Store.state.historyData[vid].slice(-2880);
                        }
                    }
                    updateVehicleDetailUI(vid);
                }
            }
            break;
        case 'vehicle-status':
            // 车辆在线/离线状态变化
            if (Store.state.currentPage === 'vehicles') {
                renderApp(); // 刷新车辆列表
            }
            break;
        case 'ping-update':
            if (msg.task) {
                const index = window._pingTasks.findIndex(task => task.taskId === msg.task.taskId);
                if (index >= 0) window._pingTasks[index] = msg.task;
                else window._pingTasks.unshift(msg.task);
            }
            if (msg.taskId && msg.result) {
                if (!window._pingTaskHistory[msg.taskId]) window._pingTaskHistory[msg.taskId] = [];
                window._pingTaskHistory[msg.taskId].push(msg.result);
                if (window._pingTaskHistory[msg.taskId].length > 200) {
                    window._pingTaskHistory[msg.taskId] = window._pingTaskHistory[msg.taskId].slice(-200);
                }
                if (window._selectedPingTask && window._selectedPingTask.taskId === msg.taskId && msg.task) {
                    window._selectedPingTask = msg.task;
                }
            }
            if (Store.state.currentPage === 'ping-tasks' ||
                (Store.state.currentPage === 'ping-task-detail' && window._selectedPingTask && window._selectedPingTask.taskId === msg.taskId)) {
                renderApp();
            }
            break;
        case 'models-update':
            // 车型数据更新
            if (msg.models) {
                window._liveModels = msg.models;
                if (Store.state.currentPage === 'models' || Store.state.currentPage === 'dashboard') {
                    renderApp();
                }
            }
            break;
    }
}

// 订阅特定车辆的实时数据
function subscribeVehicle(imei) {
    if (!imei) return;
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({ type: 'subscribe', imei: imei }));
        return;
    }

    pendingSubscriptions.add(imei);
    if (!wsConnection) {
        connectWebSocket();
    }
}

function unsubscribeVehicle(imei) {
    if (!imei) return;
    pendingSubscriptions.delete(imei);
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({ type: 'unsubscribe', imei: imei }));
    }
}

// 实时更新车辆详情UI（不重新渲染整个页面）
function updateVehicleDetailUI(vid) {
    const data = Store.state.vehicleData[vid];
    if (!data) return;
    const tsEl = document.getElementById('update-timestamp');
    if (tsEl) tsEl.textContent = new Date(data.system.timestamp).toLocaleTimeString('zh-CN');
    updatePositionInfo(data);
    refreshVehicleMap();
    // 局部刷新异常预警栏（依据最新信号与历史做持续时长判定）
    if (typeof updateAlertWarnings === 'function') updateAlertWarnings(vid);
}
