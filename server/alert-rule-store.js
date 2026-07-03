/**
 * 预警规则存储模块
 * 使用本地 JSON 文件持久化预警规则列表，提供 CRUD 能力。
 *
 * 当前预警类型仅 "coverage"（网络覆盖类）：
 *   选定一个无线信号维度（rsrp/rsrq/sinr），配置门限与无覆盖持续时长。
 * 字段 alertType 预留以便后续扩展其它预警类型。
 */

const fs = require('fs');
const path = require('path');

const VALID_METRICS = ['rsrp', 'rsrq', 'sinr'];

class AlertRuleStore {
    constructor(dataStore, options = {}) {
        this.dataStore = dataStore;
        this.filePath = options.filePath || path.join(__dirname, 'data', 'alert-rules.json');
        this.ensureFile();
    }

    ensureFile() {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf8');
        }
    }

    /**
     * 列出预警规则（按 modelId 过滤，updatedAt 倒序）
     */
    listRules(modelId) {
        let rules = this._readRules();
        if (modelId) {
            rules = rules.filter(r => r.modelId === modelId);
        }
        return rules.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    /**
     * 获取单条预警规则
     */
    getRule(id) {
        return this._readRules().find(r => r.id === id) || null;
    }

    /**
     * 新增预警规则
     * input: { modelId, imei, alertType, metric, threshold, durationSec }
     */
    createRule(input) {
        const now = new Date().toISOString();
        const rule = {
            id: this._generateId(),
            modelId: input.modelId,
            imei: input.imei,
            alertType: input.alertType || 'coverage',
            metric: VALID_METRICS.includes(input.metric) ? input.metric : 'rsrp',
            threshold: Number(input.threshold),
            durationSec: Number(input.durationSec),
            createdAt: now,
            updatedAt: now
        };

        const rules = this._readRules();
        rules.push(rule);
        this._writeRules(rules);
        return rule;
    }

    /**
     * 更新预警规则（合并字段，刷新 updatedAt）
     */
    updateRule(id, patch) {
        const rules = this._readRules();
        const rule = rules.find(r => r.id === id);
        if (!rule) return null;

        if (patch.modelId !== undefined) rule.modelId = patch.modelId;
        if (patch.imei !== undefined) rule.imei = patch.imei;
        if (patch.alertType !== undefined) rule.alertType = patch.alertType;
        if (patch.metric !== undefined && VALID_METRICS.includes(patch.metric)) rule.metric = patch.metric;
        if (patch.threshold !== undefined) rule.threshold = Number(patch.threshold);
        if (patch.durationSec !== undefined) rule.durationSec = Number(patch.durationSec);
        rule.updatedAt = new Date().toISOString();

        this._writeRules(rules);
        return rule;
    }

    /**
     * 删除预警规则
     */
    deleteRule(id) {
        const rules = this._readRules();
        const index = rules.findIndex(r => r.id === id);
        if (index < 0) return null;
        const [removed] = rules.splice(index, 1);
        this._writeRules(rules);
        return removed;
    }

    _readRules() {
        this.ensureFile();
        try {
            const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error('[AlertRuleStore] 读取预警规则文件失败:', err.message);
            return [];
        }
    }

    _writeRules(rules) {
        fs.writeFileSync(this.filePath, JSON.stringify(rules, null, 2), 'utf8');
    }

    _generateId() {
        const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
        const suffix = Math.random().toString(36).slice(2, 6);
        return `AR-${stamp}-${suffix}`;
    }
}

module.exports = AlertRuleStore;
