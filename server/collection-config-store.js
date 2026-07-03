/**
 * SDK数据采集配置存储模块
 * 使用本地JSON文件持久化采集配置列表，并提供下发到设备的 payload 构造。
 *
 * 指令经 MQTT publish 到 probe/devices/{imei}/sys/commands，
 * payload 由 cmd_type="collection_config" 标识，与 ping 测命令共用同一 topic，
 * cpp sdk 在 proccessTaskMgr 内按 cmd_type 字段分流。
 */

const fs = require('fs');
const path = require('path');

// 采集频率中文字符串 → 秒
const FREQUENCY_TO_SEC = {
    '每1分钟': 60,
    '每5分钟': 300,
    '每10分钟': 600,
    '每30分钟': 1800
};

// 数据保留中文字符串 → 天数（仅记录，SDK 端不实现）
const RETENTION_TO_DAYS = {
    '30天': 30,
    '60天': 60,
    '90天': 90
};

class CollectionConfigStore {
    constructor(dataStore, options = {}) {
        this.dataStore = dataStore;
        this.filePath = options.filePath || path.join(__dirname, 'data', 'sdk-collection-configs.json');
        this.ensureFile();
    }

    ensureFile() {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf8');
        }
    }

    /**
     * 列出全部采集配置（最新在前）
     */
    listConfigs() {
        return this._readConfigs();
    }

    /**
     * 获取单条配置
     */
    getConfig(id) {
        return this._readConfigs().find(c => c.id === id) || null;
    }

    /**
     * 新增采集配置
     * input: { name, scope:'model'|'vid', modelId, vids:[], vid, category:'full'|'core', frequency, retention }
     * 返回创建的配置对象
     */
    createConfig(input) {
        const now = new Date().toISOString();
        const modelId = input.scope === 'model' ? input.modelId : (this.dataStore.getModelByImei(input.vid) || '');
        const model = this.dataStore.vehicleModels.find(m => m.id === modelId) || {};
        const vids = input.scope === 'model' ? (Array.isArray(input.vids) ? input.vids : []) : [input.vid];

        const config = {
            id: this._generateId(),
            name: input.name,
            scope: input.scope,
            modelId,
            modelName: model.name || modelId || '',
            vids,                       // 目标设备 imei 列表（model 模式为选中车辆，vid 模式为单台）
            category: input.category === 'core' ? 'core' : 'full',
            frequency: input.frequency || '每5分钟',
            intervalSec: FREQUENCY_TO_SEC[input.frequency] || 300,
            retention: input.retention || '30天',
            retentionDays: RETENTION_TO_DAYS[input.retention] || 30,
            dispatched: false,
            createdAt: now,
            updatedAt: now
        };

        const configs = this._readConfigs();
        configs.unshift(config);
        this._writeConfigs(configs);
        return config;
    }

    /**
     * 标记已下发
     */
    markDispatched(id) {
        this._updateConfig(id, c => {
            c.dispatched = true;
            c.updatedAt = new Date().toISOString();
        });
    }

    /**
     * 删除采集配置
     */
    deleteConfig(id) {
        const configs = this._readConfigs();
        const index = configs.findIndex(c => c.id === id);
        if (index < 0) return null;
        const [removed] = configs.splice(index, 1);
        this._writeConfigs(configs);
        return removed;
    }

    /**
     * 构造下发到 cpp sdk 的指令 payload
     * 与 v-wise-agent-cpp-sdk 的 proccessCollectionConfig 对齐：
     * { cmd_type, vid, category, interval_sec, retention_days, name }
     */
    buildSdkPayload(config) {
        return {
            cmd_type: 'collection_config',
            vid: config.vids && config.vids.length ? config.vids[0] : '',
            category: config.category,
            interval_sec: config.intervalSec,
            retention_days: config.retentionDays,
            name: config.name
        };
    }

    _updateConfig(id, updater) {
        const configs = this._readConfigs();
        const config = configs.find(c => c.id === id);
        if (!config) return null;
        updater(config);
        this._writeConfigs(configs);
        return config;
    }

    _readConfigs() {
        this.ensureFile();
        try {
            const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error('[CollectionConfigStore] 读取配置文件失败:', err.message);
            return [];
        }
    }

    _writeConfigs(configs) {
        fs.writeFileSync(this.filePath, JSON.stringify(configs, null, 2), 'utf8');
    }

    _generateId() {
        const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
        const suffix = Math.random().toString(36).slice(2, 6);
        return `SCC-${stamp}-${suffix}`;
    }
}

module.exports = CollectionConfigStore;
