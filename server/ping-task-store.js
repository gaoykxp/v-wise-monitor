/**
 * Ping测任务存储模块
 * 使用本地JSON文件持久化任务列表
 */

const fs = require('fs');
const path = require('path');

class PingTaskStore {
    constructor(dataStore, options = {}) {
        this.dataStore = dataStore;
        this.filePath = options.filePath || path.join(__dirname, 'data', 'ping-tasks.json');
        this.ensureFile();

        // Ping测结果历史 { taskId: [result, ...] }，由SDK ping/up上报实时填充
        this.resultHistory = {};
    }

    ensureFile() {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf8');
        }
    }

    listTasks(filters = {}) {
        const tasks = this._readTasks().map(task => this._decorateTask(task));
        if (filters.vid) {
            const keyword = filters.vid.toLowerCase();
            return tasks.filter(task => task.vid.toLowerCase().includes(keyword));
        }
        return tasks;
    }

    createTask(input) {
        const now = new Date();
        const startTime = input.startTime ? new Date(input.startTime) : now;
        const duration = parseInt(input.duration, 10) || 300;
        const frequency = parseInt(input.frequency, 10) || 5;
        const model = this.dataStore.vehicleModels.find(m => m.id === input.modelId) || {};
        const taskId = this._generateTaskId();
        const shouldStartNow = input.taskType === '立即执行' || startTime.getTime() <= now.getTime();

        const task = {
            id: taskId,
            taskId,
            taskName: input.taskName,
            taskType: input.taskType || (shouldStartNow ? '立即执行' : '定时执行'),
            modelId: input.modelId,
            modelName: model.name || input.modelId,
            vid: input.vid,
            terminalStatus: this._getTerminalStatus(input.vid),
            taskStatus: shouldStartNow ? '进行中' : '待执行',
            target: input.target,
            serverIp: input.serverIp,
            startTime: shouldStartNow ? now.toISOString() : startTime.toISOString(),
            endTime: new Date((shouldStartNow ? now : startTime).getTime() + duration * 1000).toISOString(),
            duration,
            frequency,
            dispatched: false,
            completed: false,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        };

        const tasks = this._readTasks();
        tasks.unshift(task);
        this._writeTasks(tasks);
        return this._decorateTask(task);
    }

    markDispatched(taskId) {
        this._updateTask(taskId, task => {
            task.dispatched = true;
            task.taskStatus = '进行中';
            task.updatedAt = new Date().toISOString();
        });
    }

    refreshStatuses() {
        const now = Date.now();
        const tasks = this._readTasks();
        let changed = false;

        tasks.forEach(task => {
            if (task.taskStatus !== '完成' && new Date(task.endTime).getTime() <= now) {
                task.taskStatus = '完成';
                task.completed = true;
                task.updatedAt = new Date().toISOString();
                changed = true;
            }
        });

        if (changed) this._writeTasks(tasks);
    }

    getDueTasks() {
        this.refreshStatuses();
        const now = Date.now();
        return this._readTasks()
            .filter(task => !task.dispatched && task.taskStatus !== '完成' && new Date(task.startTime).getTime() <= now)
            .map(task => this._decorateTask(task));
    }

    addPingResult(imei, payload) {
        const taskId = payload.task_id || payload.taskId || `ping_${imei}`;
        const tasks = this._readTasks();
        let task = tasks.find(item => item.taskId === taskId);
        const now = new Date();
        const resultTime = this._normalizeTimestamp(payload.time || payload.timestamp || now.toISOString());
        const targetIp = payload.target_ip || payload.targetIp || payload.serverIp || (task && task.serverIp) || '--';
        const result = {
            taskId,
            vid: imei,
            targetIp,
            time: resultTime,
            delay: Number(payload.delay || 0),
            loseRate: Number(payload.lose_rate !== undefined ? payload.lose_rate : (payload.loseRate || 0)),
            latitude: Number(payload.latitude || 0),
            longitude: Number(payload.longitude || 0),
            altitude: Number(payload.altitude || 0)
        };

        if (!task) {
            console.warn(`[PingTaskStore] 忽略未登记Ping测任务上报: ${taskId}, IMEI: ${imei}`);
            return null;
        }

        task.serverIp = targetIp;
        task.target = task.target || targetIp;
        task.taskStatus = task.completed ? '完成' : '进行中';
        task.updatedAt = resultTime;
        task.lastPingResult = result;

        if (!this.resultHistory[taskId]) this.resultHistory[taskId] = [];
        this.resultHistory[taskId].push(result);
        if (this.resultHistory[taskId].length > 200) {
            this.resultHistory[taskId] = this.resultHistory[taskId].slice(-200);
        }

        const history = this.resultHistory[taskId];
        const delays = history.map(item => item.delay).filter(Number.isFinite);
        const avgDelay = delays.length ? delays.reduce((sum, item) => sum + item, 0) / delays.length : 0;
        const maxDelay = delays.length ? Math.max(...delays) : 0;
        const minDelay = delays.length ? Math.min(...delays) : 0;
        const avgLoss = history.length ? history.reduce((sum, item) => sum + item.loseRate, 0) / history.length : 0;
        task.pingStats = {
            totalTests: history.length,
            avgDelay: Number(avgDelay.toFixed(1)),
            maxDelay,
            minDelay,
            packetLoss: Number(avgLoss.toFixed(1))
        };

        this._writeTasks(tasks);
        return { task: this._decorateTask(task), result };
    }

    getTask(taskId) {
        const task = this._readTasks().find(item => item.taskId === taskId);
        return task ? this._decorateTask(task) : null;
    }

    getTaskHistory(taskId, limit = 200) {
        return (this.resultHistory[taskId] || []).slice(-limit);
    }

    deleteTask(taskId) {
        const tasks = this._readTasks();
        const index = tasks.findIndex(item => item.taskId === taskId);
        if (index < 0) return null;
        const [removed] = tasks.splice(index, 1);
        delete this.resultHistory[taskId];
        this._writeTasks(tasks);
        return this._decorateTask(removed);
    }

    buildSdkPayload(task) {
        const execNum = Math.max(1, Math.ceil((parseInt(task.duration, 10) || 300) / (parseInt(task.frequency, 10) || 5)));
        return {
            task_id: task.taskId,
            task_type: 0,
            task_control: 0,
            exec_num: execNum,
            frequency: parseInt(task.frequency, 10) || 5,
            upload_type: 1,
            paras: {
                address: task.serverIp,
                packet_size: 64,
                timeout: 1000
            }
        };
    }

    _updateTask(taskId, updater) {
        const tasks = this._readTasks();
        const task = tasks.find(item => item.taskId === taskId);
        if (!task) return null;
        updater(task);
        this._writeTasks(tasks);
        return this._decorateTask(task);
    }

    _decorateTask(task) {
        return {
            ...task,
            terminalStatus: this._getTerminalStatus(task.vid)
        };
    }

    _getTerminalStatus(vid) {
        const status = this.dataStore.vehicleStatus[vid];
        return status && status.online ? '在线' : '离线';
    }

    _readTasks() {
        this.ensureFile();
        try {
            const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error('[PingTaskStore] 读取任务文件失败:', err.message);
            return [];
        }
    }

    _writeTasks(tasks) {
        fs.writeFileSync(this.filePath, JSON.stringify(tasks, null, 2), 'utf8');
    }

    _normalizeTimestamp(value) {
        if (!value) return new Date().toISOString();
        if (typeof value === 'number') return new Date(value).toISOString();
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    }

    _generateTaskId() {
        const now = new Date();
        const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
        const suffix = Math.random().toString(36).slice(2, 6);
        return `ping_${stamp}_${suffix}`;
    }
}

module.exports = PingTaskStore;
