async function loadPingTasks() {
    const query = window._pingTaskSearch ? `?vid=${encodeURIComponent(window._pingTaskSearch)}` : '';
    const data = await apiFetch(`/ping-tasks${query}`);
    if (Array.isArray(data)) {
        window._pingTasks = data;
        if (Store.state.currentPage === 'ping-tasks') renderApp();
    }
}

async function loadPingTaskVehicles() {
    const data = await apiFetch('/ping-task-vehicles');
    if (Array.isArray(data)) {
        window._pingTaskVehicles = data;
        if (Store.state.currentPage === 'ping-tasks' && window._showPingTaskModal) renderApp();
    }
}

function searchPingTasks(event) {
    window._pingTaskSearch = event.target.value.trim();
    loadPingTasks();
}

function openPingTaskModal() {
    window._showPingTaskModal = true;
    loadPingTaskVehicles();
    renderApp();
}

function closePingTaskModal() {
    window._showPingTaskModal = false;
    renderApp();
}

function getPingVehicleOptions() {
    const vehicles = window._pingTaskVehicles.length ? window._pingTaskVehicles : Object.values(vehiclesByModel).flat();
    return vehicles.map(v => `<option value="${v.vid}" data-model="${v.modelId}">${v.vid} - ${v.modelName || v.modelId} (${v.plateNumber || '终端'})</option>`).join('');
}

async function deletePingTask(taskId) {
    const task = (window._pingTasks || []).find(item => item.taskId === taskId);
    const taskName = task ? task.taskName : taskId;
    if (!confirm(`确定删除Ping测任务「${taskName}」吗？`)) return;

    const result = await apiFetch(`/ping-tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
    if (result && result.success) {
        window._pingTasks = (window._pingTasks || []).filter(item => item.taskId !== taskId);
        delete window._pingTaskHistory[taskId];
        if (window._selectedPingTask && window._selectedPingTask.taskId === taskId) {
            window._selectedPingTask = null;
        }
        renderApp();
    }
}

async function submitPingTask() {
    const form = document.getElementById('ping-task-form');
    if (!form) return;
    const data = new FormData(form);
    const vid = data.get('vid');
    const vehicle = (window._pingTaskVehicles.length ? window._pingTaskVehicles : Object.values(vehiclesByModel).flat()).find(v => v.vid === vid);
    const startTime = data.get('startTime');
    const now = new Date();
    const start = startTime ? new Date(startTime) : now;
    const payload = {
        taskName: data.get('taskName'),
        taskType: start.getTime() <= now.getTime() ? '立即执行' : '定时执行',
        modelId: vehicle?.modelId || data.get('modelId'),
        vid,
        target: data.get('target'),
        serverIp: data.get('serverIp'),
        startTime: start.toISOString(),
        duration: parseInt(data.get('duration'), 10) * 60,
        frequency: parseInt(data.get('frequency'), 10)
    };
    const result = await apiFetch('/ping-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (result && result.success) {
        window._showPingTaskModal = false;
        await loadPingTasks();
    }
}

function renderPingTasksPage() {
    const tasks = window._pingTasks || [];
    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen">
                ${renderHeader()}
                <div class="flex-1 p-6 overflow-auto">
                    <div class="mb-6 flex items-center justify-between">
                        <h2 class="text-xl font-semibold text-primary">SDK Ping测任务管理</h2>
                        <button onclick="openPingTaskModal()" class="px-4 py-2 bg-cta text-white rounded-lg hover:bg-cta/90 transition-colors cursor-pointer font-medium text-sm">新增任务</button>
                    </div>
                    <div class="mb-4 bg-surface rounded-xl border border-border p-4 shadow-lg">
                        <input oninput="searchPingTasks(event)" value="${window._pingTaskSearch || ''}" placeholder="按终端名称 VID 搜索" class="w-80 px-3 py-2 bg-background border border-border rounded-lg text-primary focus:outline-none focus:border-cta">
                    </div>
                    <div class="bg-surface rounded-xl border border-border shadow-lg overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="bg-background border-b border-border">
                                    <tr>
                                        <th class="px-4 py-3 text-left text-muted font-medium">Ping测任务名称</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">任务类型</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">车型</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">终端名称（VID）</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">终端状态</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">任务状态</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">开始时间</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">结束时间</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">详情</th>
                                        <th class="px-4 py-3 text-left text-muted font-medium">编辑</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-border">
                                    ${tasks.length ? tasks.map(renderPingTaskRow).join('') : '<tr><td colspan="10" class="px-4 py-8 text-center text-muted">暂无Ping测任务</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                ${window._showPingTaskModal ? renderPingTaskModal() : ''}
            </main>
        </div>`;
}

function renderPingTaskRow(task) {
    const terminalClass = task.terminalStatus === '在线' ? 'text-cta bg-cta/20' : 'text-amber-400 bg-amber-500/20';
    const statusClass = task.taskStatus === '完成' ? 'text-cta bg-cta/20' : task.taskStatus === '待执行' ? 'text-blue-400 bg-blue-500/20' : 'text-amber-400 bg-amber-500/20';
    return `
        <tr class="hover:bg-background/50 transition-colors">
            <td class="px-4 py-3 text-primary font-medium">${task.taskName}</td>
            <td class="px-4 py-3 text-muted">${task.taskType}</td>
            <td class="px-4 py-3 text-muted">${task.modelName}</td>
            <td class="px-4 py-3 text-primary font-mono">${task.vid}</td>
            <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs ${terminalClass}">${task.terminalStatus}</span></td>
            <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs ${statusClass}">${task.taskStatus}</span></td>
            <td class="px-4 py-3 text-muted whitespace-nowrap">${task.startTime ? new Date(task.startTime).toLocaleString('zh-CN') : '--'}</td>
            <td class="px-4 py-3 text-muted whitespace-nowrap">${task.endTime ? new Date(task.endTime).toLocaleString('zh-CN') : '--'}</td>
            <td class="px-4 py-3"><button onclick="Store.selectPingTask('${task.taskId}')" class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs transition-colors cursor-pointer font-medium">详情</button></td>
            <td class="px-4 py-3"><button onclick="deletePingTask('${task.taskId}')" class="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs transition-colors cursor-pointer font-medium">删除</button></td>
        </tr>`;
}

function formatPingDetailTime(time) {
    return time ? new Date(time).toLocaleString('zh-CN') : '--';
}

function renderPingDelayChart(history) {
    const records = (history || []).slice(-100);
    if (!records.length) return '<div class="h-64 flex items-center justify-center text-muted">暂无时延趋势数据，等待SDK上报Ping测结果</div>';
    const maxDelay = Math.max(100, Math.ceil(Math.max(...records.map(item => item.delay || 0)) / 50) * 50);
    const points = records.map((item, index) => {
        const x = records.length === 1 ? 50 : (index / (records.length - 1)) * 100;
        const y = 90 - ((item.delay || 0) / maxDelay) * 75;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    const firstTime = new Date(records[0].time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const lastTime = new Date(records[records.length - 1].time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `
        <div class="h-64">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full">
                <defs><linearGradient id="pingDelayFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#22C55E" stop-opacity="0.35"/><stop offset="100%" stop-color="#22C55E" stop-opacity="0.02"/></linearGradient></defs>
                <line x1="0" y1="15" x2="100" y2="15" stroke="rgb(var(--color-border))" stroke-width="0.4"/>
                <line x1="0" y1="40" x2="100" y2="40" stroke="rgb(var(--color-border))" stroke-width="0.4"/>
                <line x1="0" y1="65" x2="100" y2="65" stroke="rgb(var(--color-border))" stroke-width="0.4"/>
                <line x1="0" y1="90" x2="100" y2="90" stroke="rgb(var(--color-border))" stroke-width="0.4"/>
                <polygon points="0,95 ${points} 100,95" fill="url(#pingDelayFill)"/>
                <polyline points="${points}" fill="none" stroke="#22C55E" stroke-width="1.2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="flex justify-between text-xs text-muted mt-2"><span>${firstTime}</span><span>最高 ${maxDelay}ms</span><span>${lastTime}</span></div>
        </div>`;
}

function renderPingTaskDetailPage() {
    const task = window._selectedPingTask;
    if (!task) return renderPingTasksPage();
    const history = window._pingTaskHistory[task.taskId] || [];
    const latest = task.lastPingResult || history[history.length - 1] || {};
    const stats = task.pingStats || {};
    return `
        <div class="flex min-h-screen">
            ${renderSidebar()}
            <main class="flex-1 flex flex-col bg-background min-h-screen">
                ${renderHeader()}
                <div class="flex-1 p-6 overflow-auto">
                    <div class="mb-6 flex items-center justify-between">
                        <div>
                            <div class="flex items-center gap-2 text-sm text-muted mb-2"><button onclick="Store.goToPingTasks(); renderApp();" class="hover:text-primary cursor-pointer">SDK Ping测任务管理</button><span>/</span><span class="text-primary">详情</span></div>
                            <h2 class="text-xl font-semibold text-primary">Ping测详情</h2>
                        </div>
                        <button onclick="Store.goToPingTasks(); renderApp();" class="px-4 py-2 bg-background text-primary rounded-lg hover:bg-border transition-colors cursor-pointer font-medium border border-border text-sm">返回任务列表</button>
                    </div>
                    <div class="bg-surface rounded-xl border border-border p-5 shadow-lg mb-6">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div><span class="text-muted">任务名称</span><div class="text-primary font-medium mt-1">${task.taskName}</div></div>
                            <div><span class="text-muted">任务ID</span><div class="text-primary font-mono mt-1">${task.taskId}</div></div>
                            <div><span class="text-muted">终端VID</span><div class="text-primary font-mono mt-1">${task.vid}</div></div>
                            <div><span class="text-muted">测试目标</span><div class="text-primary font-mono mt-1">${task.serverIp || task.target || '--'}</div></div>
                            <div><span class="text-muted">任务状态</span><div class="text-primary mt-1">${task.taskStatus}</div></div>
                            <div><span class="text-muted">最近上报</span><div class="text-primary mt-1">${formatPingDetailTime(latest.time || task.updatedAt)}</div></div>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div class="bg-surface rounded-xl border border-border p-5 shadow-lg metric-card"><div class="text-sm text-muted mb-2">最新时延</div><div class="text-2xl font-bold text-cta">${latest.delay || 0}<span class="text-sm text-muted ml-1">ms</span></div></div>
                        <div class="bg-surface rounded-xl border border-border p-5 shadow-lg metric-card"><div class="text-sm text-muted mb-2">平均时延</div><div class="text-2xl font-bold text-blue-400">${stats.avgDelay || 0}<span class="text-sm text-muted ml-1">ms</span></div></div>
                        <div class="bg-surface rounded-xl border border-border p-5 shadow-lg metric-card"><div class="text-sm text-muted mb-2">最大时延</div><div class="text-2xl font-bold text-amber-400">${stats.maxDelay || 0}<span class="text-sm text-muted ml-1">ms</span></div></div>
                        <div class="bg-surface rounded-xl border border-border p-5 shadow-lg metric-card"><div class="text-sm text-muted mb-2">丢包率 / 次数</div><div class="text-2xl font-bold text-primary">${stats.packetLoss || 0}%<span class="text-sm text-muted ml-1">/ ${stats.totalTests || history.length}</span></div></div>
                    </div>
                    <div class="bg-surface rounded-xl border border-border p-5 shadow-lg mb-6"><div class="flex items-center justify-between mb-4"><h3 class="font-semibold text-primary">时延趋势图</h3><span class="text-xs text-muted">最近 ${history.length} 条上报</span></div>${renderPingDelayChart(history)}</div>
                    <div class="bg-surface rounded-xl border border-border shadow-lg overflow-hidden">
                        <div class="p-4 border-b border-border bg-background"><h3 class="font-semibold text-primary">Ping测明细</h3></div>
                        <div class="overflow-x-auto max-h-[420px]"><table class="w-full text-sm"><thead class="bg-background sticky top-0"><tr class="text-muted text-left"><th class="px-4 py-3 font-medium">时间</th><th class="px-4 py-3 font-medium">时延</th><th class="px-4 py-3 font-medium">丢包率</th><th class="px-4 py-3 font-medium">经度</th><th class="px-4 py-3 font-medium">纬度</th><th class="px-4 py-3 font-medium">高度</th><th class="px-4 py-3 font-medium">目标IP</th></tr></thead><tbody class="divide-y divide-border">${history.length ? history.slice().reverse().map((item, index) => `<tr class="${index % 2 === 0 ? 'bg-surface' : 'bg-background'} hover:bg-cta/10 transition-colors"><td class="px-4 py-3 text-muted">${formatPingDetailTime(item.time)}</td><td class="px-4 py-3 text-cta font-medium">${item.delay} ms</td><td class="px-4 py-3 text-primary">${item.loseRate}%</td><td class="px-4 py-3 text-muted font-mono text-xs">${Number(item.longitude || 0).toFixed(6)}</td><td class="px-4 py-3 text-muted font-mono text-xs">${Number(item.latitude || 0).toFixed(6)}</td><td class="px-4 py-3 text-muted">${Number(item.altitude || 0).toFixed(1)} m</td><td class="px-4 py-3 text-primary font-mono text-xs">${item.targetIp || '--'}</td></tr>`).join('') : '<tr><td colspan="7" class="px-4 py-8 text-center text-muted">暂无Ping测明细，等待SDK上报</td></tr>'}</tbody></table></div>
                    </div>
                </div>
            </main>
        </div>`;
}

function renderPingTaskModal() {
    const defaultStart = new Date().toISOString().slice(0, 16);
    return `
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div class="bg-surface border border-border rounded-xl shadow-xl w-[560px] max-w-[90vw]">
                <div class="p-4 border-b border-border flex items-center justify-between">
                    <h3 class="font-semibold text-primary">新增Ping测任务</h3>
                    <button onclick="closePingTaskModal()" class="text-muted hover:text-primary">✕</button>
                </div>
                <form id="ping-task-form" class="p-4 grid grid-cols-2 gap-4" onsubmit="event.preventDefault(); submitPingTask();">
                    <label class="col-span-2 text-sm text-muted">任务名称<input name="taskName" required class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary"></label>
                    <label class="text-sm text-muted">Ping测目标<input name="target" value="公网DNS" required class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary"></label>
                    <label class="text-sm text-muted">Ping测服务器IP<input name="serverIp" value="8.8.8.8" required class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary"></label>
                    <label class="col-span-2 text-sm text-muted">终端名称（VID）<select name="vid" required class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary">${getPingVehicleOptions()}</select></label>
                    <label class="text-sm text-muted">起始时间<input type="datetime-local" name="startTime" value="${defaultStart}" required class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary"></label>
                    <label class="text-sm text-muted">持续时间（分钟）<input type="number" name="duration" value="5" min="1" required class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary"></label>
                    <label class="text-sm text-muted">频率<select name="frequency" class="mt-1 w-full px-3 py-2 bg-background border border-border rounded-lg text-primary"><option value="5">5秒</option><option value="10">10秒</option></select></label>
                    <input type="hidden" name="modelId" value="">
                    <div class="col-span-2 flex justify-end gap-3 pt-3 border-t border-border">
                        <button type="button" onclick="closePingTaskModal()" class="px-4 py-2 bg-background hover:bg-border text-primary rounded-lg border border-border">取消</button>
                        <button type="submit" class="px-4 py-2 bg-cta hover:bg-cta/90 text-white rounded-lg">确定，下发任务</button>
                    </div>
                </form>
            </div>
        </div>`;
}
