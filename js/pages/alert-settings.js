// ========== 预警设置页面 ==========

// 内存状态：当前车型的预警规则列表（Store.state.alertRules）、编辑态（editingAlertRule）、弹窗开关（alertRuleModalOpen）

const ALERT_TYPE_LABELS = { coverage: '网络覆盖类' };
const ALERT_METRIC_LABELS = { rsrp: 'RSRP', rsrq: 'RSRQ', sinr: 'SINR' };

// 从后端拉取某车型的预警规则列表
async function loadAlertRules(modelId) {
    if (!modelId) return;
    const data = await apiFetch(`/models/${encodeURIComponent(modelId)}/alert-rules`);
    if (Array.isArray(data)) {
        Store.setState({ alertRules: data });
        if (Store.state.currentPage === 'alert-settings') renderApp();
    }
}

function renderAlertSettingsPage() {
    const { selectedModel, alertRules, alertRuleModalOpen } = Store.getState();
    const rules = Array.isArray(alertRules) ? alertRules : [];
    const modelName = selectedModel ? (selectedModel.name || '未知车型') : '未知车型';
    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen">
                ${renderHeader()}
                <div class="flex-1 p-6 overflow-auto">
                    <div class="mb-6 flex items-center justify-between">
                        <div>
                            <div class="flex items-center gap-2 text-sm text-muted mb-2">
                                <button onclick="Store.goToModelList(); renderApp();" class="hover:text-primary cursor-pointer">车辆网况监控</button>
                                <span>/</span>
                                <span class="text-primary">预警设置</span>
                            </div>
                            <h2 class="text-xl font-semibold text-primary">${modelName} · 预警设置</h2>
                        </div>
                        <div class="flex items-center gap-3">
                            <button onclick="Store.openAlertRuleModal(null); renderApp();" class="px-4 py-2 bg-cta text-white rounded-lg hover:bg-cta/90 transition-colors cursor-pointer font-medium text-sm flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                                添加预警规则
                            </button>
                            <button onclick="Store.goToModelList(); renderApp();" class="px-4 py-2 bg-background text-primary rounded-lg hover:bg-border transition-colors cursor-pointer font-medium border border-border text-sm">返回车型列表</button>
                        </div>
                    </div>

                    <div class="bg-surface rounded-xl border border-border shadow-lg overflow-hidden">
                        <div class="p-4 border-b border-border bg-background flex justify-between items-center">
                            <h3 class="font-semibold text-primary">预警规则列表</h3>
                            <span class="text-xs text-muted">共 ${rules.length} 条</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="bg-background border-b border-border">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-muted font-medium">预警类型</th>
                                        <th class="px-6 py-3 text-left text-muted font-medium">车辆VID</th>
                                        <th class="px-6 py-3 text-left text-muted font-medium">IMEI</th>
                                        <th class="px-6 py-3 text-left text-muted font-medium">最后更新时间</th>
                                        <th class="px-6 py-3 text-left text-muted font-medium">操作</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-border">
                                    ${rules.length ? rules.map(rule => `
                                        <tr class="hover:bg-background/50 transition-colors">
                                            <td class="px-6 py-4">
                                                <div class="flex items-center gap-2">
                                                    <span class="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full font-medium">${ALERT_TYPE_LABELS[rule.alertType] || rule.alertType}</span>
                                                    <span class="text-muted text-xs">· ${ALERT_METRIC_LABELS[rule.metric] || rule.metric}</span>
                                                </div>
                                                <div class="text-xs text-muted mt-1">低于 ${rule.threshold} 持续 ${rule.durationSec}s</div>
                                            </td>
                                            <td class="px-6 py-4"><span class="font-mono text-primary text-xs">${rule.imei}</span></td>
                                            <td class="px-6 py-4"><span class="font-mono text-muted text-xs">${rule.imei}</span></td>
                                            <td class="px-6 py-4 text-muted whitespace-nowrap">${rule.updatedAt ? new Date(rule.updatedAt).toLocaleString('zh-CN') : '--'}</td>
                                            <td class="px-6 py-4">
                                                <div class="flex items-center gap-2">
                                                    <button onclick='Store.openAlertRuleModal(${JSON.stringify(rule)}); renderApp();' class="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg text-xs transition-colors cursor-pointer font-medium">编辑</button>
                                                    <button onclick="Store.deleteAlertRule('${rule.id}')" class="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-xs transition-colors cursor-pointer font-medium">删除</button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('') : `<tr><td colspan="5" class="px-6 py-12 text-center text-muted">暂无预警规则，点击右上角"添加预警规则"</td></tr>`}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        ${alertRuleModalOpen ? renderAlertRuleModal() : ''}`;
}

function renderAlertRuleModal() {
    const { editingAlertRule } = Store.getState();
    const isEdit = !!editingAlertRule;
    const r = editingAlertRule || {};
    return `
        <div class="fixed inset-0 bg-black/50 z-40" onclick="Store.closeAlertRuleModal(); renderApp();"></div>
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="bg-surface rounded-xl border border-border shadow-xl w-full max-w-lg">
                <div class="flex items-center justify-between p-4 border-b border-border">
                    <h3 class="text-lg font-semibold text-primary">${isEdit ? '编辑预警规则' : '添加预警规则'}</h3>
                    <button onclick="Store.closeAlertRuleModal(); renderApp();" class="p-1 text-muted hover:text-primary cursor-pointer">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <div class="p-4 space-y-4">
                    <label class="block text-sm text-muted">预警类型
                        <select id="ar-type" onchange="toggleAlertMetricVisibility()" class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary">
                            <option value="coverage" ${r.alertType === 'coverage' ? 'selected' : ''}>网络覆盖类</option>
                        </select>
                    </label>
                    <label class="block text-sm text-muted">车辆IMEI <span class="text-xs">(即车辆VID)</span>
                        <input type="text" id="ar-imei" value="${r.imei || ''}" placeholder="请输入车辆IMEI" class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary font-mono text-sm">
                    </label>
                    <div id="ar-metric-block" class="space-y-4 p-4 bg-background rounded-lg border border-border">
                        <label class="block text-sm text-muted">信号维度
                            <select id="ar-metric" class="mt-1 w-full px-3 py-2 bg-surface border border-border rounded-lg text-primary">
                                <option value="rsrp" ${r.metric === 'rsrp' ? 'selected' : ''}>RSRP (参考信号接收功率)</option>
                                <option value="rsrq" ${r.metric === 'rsrq' ? 'selected' : ''}>RSRQ (参考信号接收质量)</option>
                                <option value="sinr" ${r.metric === 'sinr' ? 'selected' : ''}>SINR (信噪比)</option>
                            </select>
                        </label>
                        <div class="grid grid-cols-2 gap-4">
                            <label class="block text-sm text-muted">无覆盖门限
                                <input type="number" id="ar-threshold" value="${r.threshold !== undefined ? r.threshold : -110}" class="mt-1 w-full px-3 py-2 bg-surface border border-border rounded-lg text-primary">
                                <span class="text-xs text-muted">低于此值视为无覆盖</span>
                            </label>
                            <label class="block text-sm text-muted">无覆盖持续时长 (秒)
                                <input type="number" id="ar-duration" value="${r.durationSec !== undefined ? r.durationSec : 60}" min="1" class="mt-1 w-full px-3 py-2 bg-surface border border-border rounded-lg text-primary">
                                <span class="text-xs text-muted">持续低于门限的时长</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="flex justify-end gap-3 p-4 border-t border-border">
                    <button onclick="Store.closeAlertRuleModal(); renderApp();" class="px-4 py-2 bg-background text-primary rounded-lg hover:bg-border transition-colors cursor-pointer font-medium border border-border text-sm">取消</button>
                    <button onclick="Store.saveAlertRule()" class="px-4 py-2 bg-cta text-white rounded-lg hover:bg-cta/90 transition-colors cursor-pointer font-medium text-sm">${isEdit ? '保存' : '添加'}</button>
                </div>
            </div>
        </div>`;
}

function toggleAlertMetricVisibility() {
    const type = document.getElementById('ar-type')?.value;
    const block = document.getElementById('ar-metric-block');
    if (block) block.style.display = (type === 'coverage') ? '' : 'none';
}

// ========== 车辆详情页：异常预警判定与渲染 ==========

// 内存缓存：全部预警规则（供车辆详情页按 imei 过滤后做实时判定）
if (typeof window._vehicleAlertRules === 'undefined') window._vehicleAlertRules = [];

// 拉取全部预警规则；若当前在车辆详情页，局部刷新异常预警栏
async function loadVehicleAlertRules() {
    const data = await apiFetch('/alert-rules');
    if (Array.isArray(data)) {
        window._vehicleAlertRules = data;
        if (Store.state.currentPage === 'vehicle-detail' && Store.state.selectedVehicle) {
            updateAlertWarnings(Store.state.selectedVehicle.vid);
        }
    }
}

// 取本车（vid=imei）适用的预警规则
function getVehicleAlertRules(vid) {
    const rules = Array.isArray(window._vehicleAlertRules) ? window._vehicleAlertRules : [];
    return vid ? rules.filter(r => r.imei === vid) : [];
}

/**
 * 对每条规则计算判定结果
 * - cur: 当前信号值；threshold: 门限
 * - belowSec: 从历史末尾倒推连续低于门限的时长（含当前时刻）
 * - triggered: 当前低于门限且 belowSec >= durationSec
 * - pending:   当前低于门限但未达持续时长
 */
function evaluateAlerts(rules, data, history) {
    if (!data || !data.wireless) return [];
    const now = Date.now();
    return rules.map(rule => {
        const cur = Number(data.wireless[rule.metric]);
        const threshold = Number(rule.threshold);
        const metric = rule.metric;

        // 历史按 time 升序，从末尾倒推连续低于门限的最早一条
        const sorted = (Array.isArray(history) ? history : [])
            .slice()
            .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        let runStart = null;
        for (let i = sorted.length - 1; i >= 0; i--) {
            const v = Number(sorted[i][metric]);
            if (!isNaN(v) && v < threshold) {
                runStart = new Date(sorted[i].time).getTime();
            } else {
                break;
            }
        }

        let belowSec = 0;
        const curBelow = !isNaN(cur) && cur < threshold;
        if (curBelow) {
            // 当前低于门限：连续段从 runStart 延续到 now
            const start = runStart !== null ? runStart : now;
            belowSec = Math.max(0, (now - start) / 1000);
        } else if (runStart !== null) {
            // 当前已恢复：统计到最近一次低于门限的结束（这里仍给出历史最长持续，仅参考）
            belowSec = 0;
        }

        const triggered = curBelow && belowSec >= Number(rule.durationSec);
        const pending = curBelow && !triggered;
        return { rule, cur, belowSec, triggered, pending };
    });
}

// 渲染「异常预警」栏内容
function renderAlertWarnings(vid) {
    const { vehicleData, historyData } = Store.getState();
    const rules = getVehicleAlertRules(vid);

    if (!rules.length) {
        return `<div class="flex items-center gap-2 text-sm text-muted py-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            该车辆未配置预警规则
        </div>`;
    }

    const data = vehicleData[vid];
    if (!data || !data.wireless) {
        return `<div class="text-sm text-muted py-2">信号数据加载中…</div>`;
    }

    const results = evaluateAlerts(rules, data, historyData[vid]);
    const triggered = results.filter(r => r.triggered);
    const pending = results.filter(r => r.pending);

    if (triggered.length === 0 && pending.length === 0) {
        return `<div class="flex items-center gap-2 text-sm text-cta py-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            当前无异常预警
            <span class="text-xs text-muted ml-1">${rules.length} 条规则监测中</span>
        </div>`;
    }

    const fmt = v => (Number.isFinite(Number(v)) ? Number(v).toFixed(1) : '--');
    const cards = [];

    triggered.forEach(({ rule, cur, belowSec }) => {
        cards.push(`
            <div class="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <svg class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <div class="text-sm">
                    <div class="text-red-400 font-medium">${ALERT_METRIC_LABELS[rule.metric] || rule.metric} 异常</div>
                    <div class="text-muted text-xs mt-1">当前 ${fmt(cur)} 低于门限 ${rule.threshold}，已持续 ${Math.round(belowSec)}s（规则要求持续 ${rule.durationSec}s）</div>
                </div>
            </div>`);
    });

    pending.forEach(({ rule, cur, belowSec }) => {
        cards.push(`
            <div class="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <svg class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <div class="text-sm">
                    <div class="text-amber-400 font-medium">${ALERT_METRIC_LABELS[rule.metric] || rule.metric} 偏低（预警中）</div>
                    <div class="text-muted text-xs mt-1">当前 ${fmt(cur)} 低于门限 ${rule.threshold}，已持续 ${Math.round(belowSec)}s / 需 ${rule.durationSec}s</div>
                </div>
            </div>`);
    });

    return `<div class="space-y-2">${cards.join('')}</div>`;
}

// 局部刷新异常预警栏（不重绘整页，不影响地图）
function updateAlertWarnings(vid) {
    const el = document.getElementById('alert-warnings');
    if (!el) return;
    el.innerHTML = renderAlertWarnings(vid);
}
