/**
 * 车型网络故障分析文件存储
 * 每个车型对应一个JSON文件，文件内records按日期升序排列
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_DAYS = 30;

const FAULT_CATEGORIES = [
    { id: 'signal_weak', name: '信号弱', color: 'amber' },
    { id: 'network_resource', name: '网络资源不足', color: 'orange' },
    { id: 'no_network', name: '无网络资源', color: 'red' },
    { id: 'switch_4_5g', name: '4/5G切换', color: 'blue' },
    { id: 'restart', name: '重启', color: 'purple' },
    { id: 'bandwidth', name: '带宽竞争', color: 'cyan' },
    { id: 'register_fail', name: '注册失败', color: 'rose' },
    { id: 'handover_fail', name: '切换失败', color: 'pink' }
];

class FaultStatsStore {
    constructor(vehicleModels, options = {}) {
        this.vehicleModels = vehicleModels || [];
        this.dataDir = options.dataDir || path.join(__dirname, 'data', 'fault-stats');
        this.days = options.days || DEFAULT_DAYS;
    }

    ensureAllFiles() {
        fs.mkdirSync(this.dataDir, { recursive: true });
        this.vehicleModels.forEach(model => {
            const filePath = this._getFilePath(model.id);
            if (!fs.existsSync(filePath)) {
                this._writeModelFile(model, this._generateDefaultData(model));
            }
        });
    }

    getModelSummaries() {
        this.ensureAllFiles();
        return this.vehicleModels.map(model => {
            const data = this._readModelFile(model.id) || this._generateDefaultData(model);
            const summary = data.summary || this._buildSummary(model);
            const cards = summary.cards || {};

            return {
                ...model,
                id: model.id,
                modelId: model.id,
                totalVehicles: summary.totalVehicles ?? model.totalVehicles,
                faultCount: summary.faultCount ?? 0,
                signalWeakCount: cards.signalWeakCount ?? 0,
                registerFailCount: cards.registerFailCount ?? 0,
                offlineCount: cards.offlineCount ?? 0,
                faultRate: summary.faultRate ?? '0.00'
            };
        });
    }

    getModelDetail(modelId, days = DEFAULT_DAYS) {
        const model = this.vehicleModels.find(m => m.id === modelId);
        if (!model) return null;

        this.ensureAllFiles();
        const data = this._readModelFile(modelId) || this._generateDefaultData(model);
        const categories = Array.isArray(data.categories) && data.categories.length > 0
            ? data.categories
            : FAULT_CATEGORIES;

        const records = Array.isArray(data.records) ? data.records.slice() : [];
        records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const safeDays = Math.max(1, parseInt(days, 10) || DEFAULT_DAYS);
        const selectedRecords = records.slice(-safeDays).reverse();
        const dates = selectedRecords.map(record => this._formatDateMeta(record.date));
        const faultData = {};

        categories.forEach(category => {
            faultData[category.id] = {};
            selectedRecords.forEach(record => {
                const item = record.categories && record.categories[category.id]
                    ? record.categories[category.id]
                    : { count: 0, total: 0, percent: '0.0' };
                faultData[category.id][record.date] = {
                    count: Number(item.count) || 0,
                    total: Number(item.total) || 0,
                    percent: this._formatPercent(item.percent)
                };
            });
        });

        return {
            id: model.id,
            modelId: model.id,
            name: model.name,
            brand: model.brand,
            year: model.year,
            summary: data.summary || this._buildSummary(model),
            categories,
            dates,
            faultData
        };
    }

    _getFilePath(modelId) {
        if (!/^[\w-]+$/.test(modelId)) {
            throw new Error('Invalid modelId');
        }
        return path.join(this.dataDir, `${modelId}.json`);
    }

    _readModelFile(modelId) {
        try {
            const filePath = this._getFilePath(modelId);
            if (!fs.existsSync(filePath)) return null;
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (err) {
            console.error(`[FaultStats] 读取车型故障统计失败: ${modelId}`, err.message);
            return null;
        }
    }

    _writeModelFile(model, data) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        fs.writeFileSync(this._getFilePath(model.id), JSON.stringify(data, null, 2), 'utf8');
    }

    _generateDefaultData(model) {
        const records = [];
        const now = new Date();

        for (let i = this.days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const categories = {};

            FAULT_CATEGORIES.forEach(category => {
                const seed = `${model.id}-${dateStr}-${category.id}`;
                const count = this._range(seed, 5, 54);
                const total = this._range(`${seed}-total`, 100, 299);
                categories[category.id] = {
                    count,
                    total,
                    percent: ((count / total) * 100).toFixed(1)
                };
            });

            records.push({ date: dateStr, categories });
        }

        return {
            schemaVersion: 1,
            modelId: model.id,
            modelName: model.name,
            updatedAt: now.toISOString(),
            summary: this._buildSummary(model),
            categories: FAULT_CATEGORIES,
            records
        };
    }

    _buildSummary(model) {
        const totalVehicles = model.totalVehicles || 0;
        const faultCount = Math.floor(totalVehicles * 0.08);
        return {
            totalVehicles,
            faultCount,
            faultRate: totalVehicles > 0 ? ((faultCount / totalVehicles) * 100).toFixed(2) : '0.00',
            cards: {
                signalWeakCount: Math.floor(faultCount * 0.4),
                registerFailCount: Math.floor(faultCount * 0.25),
                offlineCount: Math.floor(faultCount * 0.35)
            }
        };
    }

    _formatDateMeta(dateStr) {
        const date = new Date(`${dateStr}T00:00:00`);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return {
            date: dateStr,
            display: `${month}-${day}`,
            weekday: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
        };
    }

    _formatPercent(value) {
        const num = Number(value);
        return Number.isFinite(num) ? num.toFixed(1) : '0.0';
    }

    _range(seed, min, max) {
        const hash = this._hash(seed);
        return min + (hash % (max - min + 1));
    }

    _hash(input) {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) - hash + input.charCodeAt(i)) >>> 0;
        }
        return hash;
    }
}

module.exports = FaultStatsStore;
