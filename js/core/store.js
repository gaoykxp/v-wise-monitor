// ========== 状态管理 ==========

function getDefaultRoute() {
    const body = document.body || { dataset: {} };
    return {
        currentMenu: body.dataset.defaultMenu || 'dashboard',
        currentPage: body.dataset.defaultPage || 'dashboard'
    };
}

function navigateMainPage(targetFile, fallbackState) {
    const currentFile = location.pathname.split('/').pop() || 'index.html';
    const isIndexDashboard = currentFile === 'index.html' && targetFile === 'dashboard.html';
    if (currentFile !== targetFile && !isIndexDashboard) {
        location.href = targetFile;
        return true;
    }
    Store.setState(fallbackState);
    return false;
}

const Store = {
    state: {
        currentUser: null,
        isAuthenticated: false,
        currentPage: 'dashboard',
        currentMenu: 'dashboard', // 'dashboard' or 'models'
        selectedModel: null,
        selectedVehicle: null,
        vehicleData: {},
        historyData: {},
        realtimeInterval: null,
        sidebarCollapsed: false,
        theme: localStorage.getItem('vwise_theme') || 'dark',
        alertRules: [],
        editingAlertRule: null,
        alertRuleModalOpen: false
    },
    listeners: [],
    getState() { return this.state; },
    setState(newState) { this.state = { ...this.state, ...newState }; this.notify(); },
    subscribe(listener) { this.listeners.push(listener); },
    notify() { this.listeners.forEach(l => l(this.state)); },

    login(username, password) {
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            const route = getDefaultRoute();
            this.setState({ currentUser: user, isAuthenticated: true, currentPage: route.currentPage, currentMenu: route.currentMenu });
            localStorage.setItem('vwise_user', JSON.stringify(user));
            return { success: true, user };
        }
        return { success: false, message: '用户名或密码错误' };
    },
    logout() {
        if (this.state.realtimeInterval) clearInterval(this.state.realtimeInterval);
        localStorage.removeItem('vwise_user');
        this.setState({ currentUser: null, isAuthenticated: false, currentPage: 'login', currentMenu: 'dashboard', selectedModel: null, selectedVehicle: null });
    },
    restoreSession() {
        const savedUser = localStorage.getItem('vwise_user');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            this.setState({ currentUser: user, isAuthenticated: true, currentPage: 'dashboard', currentMenu: 'dashboard' });
            return true;
        }
        return false;
    },
    // 切换到仪表盘
    goToDashboard() {
        this.stopRealtimeUpdate();
        navigateMainPage('dashboard.html', { currentMenu: 'dashboard', currentPage: 'dashboard', selectedModel: null, selectedVehicle: null });
    },
    // 切换到车型管理
    goToModels() {
        this.stopRealtimeUpdate();
        navigateMainPage('vehicle-monitor.html', { currentMenu: 'models', currentPage: 'models', selectedModel: null, selectedVehicle: null });
    },
    // 选择车型，从后端获取车辆列表
    async selectModel(modelId) {
        const model = vehicleModels.find(m => m.id === modelId);
        this.stopRealtimeUpdate();
        this.setState({ selectedModel: model, currentPage: 'vehicles', selectedVehicle: null });

        // 从后端API获取车辆列表
        try {
            const vehicles = await apiFetch(`/models/${modelId}/vehicles`);
            if (vehicles && vehicles.length > 0) {
                vehiclesByModel[modelId] = vehicles;
            }
        } catch (e) {
            // API不可用时保留现有数据
        }
        this.notify();
    },
    // 返回车型列表
    goToModelList() {
        this.stopRealtimeUpdate();
        this.setState({ currentPage: 'models', selectedModel: null, selectedVehicle: null });
    },
    // 选择车辆 - 从后端API获取数据
    async selectVehicle(vid) {
        let vehicle = null;
        // 先从缓存的车辆列表中查找
        for (const modelId in vehiclesByModel) {
            const found = vehiclesByModel[modelId].find(v => v.vid === vid);
            if (found) { vehicle = found; break; }
        }
        if (!vehicle) {
            // 如果缓存中没有，构造一个基本vehicle对象
            vehicle = { vid: vid, modelId: '', plateNumber: `京A${vid.slice(-5)}`, status: 'online', lastUpdate: new Date().toISOString(), totalDistance: 0, alertCount: 0 };
        }

        // 设置页面状态
        this.setState({
            selectedVehicle: vehicle,
            currentPage: 'vehicle-detail'
        });

        // 立即订阅WebSocket实时更新，避免API慢加载期间丢失推送
        subscribeVehicle(vid);

        // 从后端API获取车辆数据
        let nextData = null;
        let nextHistory = [];
        try {
            const detail = await apiFetch(`/vehicles/${vid}`);
            if (detail && detail.data) {
                nextData = detail.data;
                nextHistory = detail.history || [];
            }
        } catch (e) {
            // API不可用时使用模拟数据
        }

        if (!nextData) {
            // 后端无数据时使用模拟数据作为回退
            nextData = generateVehicleData(vid);
            nextHistory = generateHistoryData(24);
        }

        this.setState({
            vehicleData: { ...this.state.vehicleData, [vid]: nextData },
            historyData: { ...this.state.historyData, [vid]: nextHistory }
        });

        // 加载预警规则（供详情页异常预警栏做实时判定）
        if (typeof loadVehicleAlertRules === 'function') loadVehicleAlertRules();

    },
    startRealtimeUpdate(vid) {
        if (this.state.realtimeInterval) clearInterval(this.state.realtimeInterval);
        const interval = setInterval(() => {
            const currentData = this.state.vehicleData[vid];
            if (!currentData) return;
            const variation = updateVehicleRealtime(vid);
            const updatedData = {
                ...currentData,
                wireless: {
                    ...currentData.wireless,
                    rsrp: Math.max(-140, Math.min(-40, currentData.wireless.rsrp + variation.rsrp)),
                    sinr: Math.max(-5, Math.min(30, currentData.wireless.sinr + variation.sinr)),
                    rsrq: Math.max(-25, Math.min(-3, currentData.wireless.rsrq + variation.rsrq))
                },
                system: {
                    ...currentData.system,
                    cpuUsage: Math.max(0, Math.min(100, currentData.system.cpuUsage + variation.cpuUsage)),
                    memUsage: Math.max(0, Math.min(100, currentData.system.memUsage + variation.memUsage)),
                    timestamp: new Date().toISOString()
                }
            };
            if (Math.random() > 0.7) {
                updatedData.system.longitude += (Math.random() - 0.5) * 0.001;
                updatedData.system.latitude += (Math.random() - 0.5) * 0.001;
            }
            const history = this.state.historyData[vid] || [];
            const newHistory = [...history.slice(1), {
                time: updatedData.system.timestamp,
                timeLabel: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
                rsrp: updatedData.wireless.rsrp,
                sinr: updatedData.wireless.sinr,
                rsrq: updatedData.wireless.rsrq,
                cpuUsage: updatedData.system.cpuUsage,
                memUsage: updatedData.system.memUsage
            }];
            this.setState({
                vehicleData: { ...this.state.vehicleData, [vid]: updatedData },
                historyData: { ...this.state.historyData, [vid]: newHistory }
            });
        }, 3000);
        this.setState({ realtimeInterval: interval });
    },
    stopRealtimeUpdate() {
        if (this.state.realtimeInterval) {
            clearInterval(this.state.realtimeInterval);
            this.setState({ realtimeInterval: null });
        }
        // 取消WebSocket订阅
        if (this.state.selectedVehicle) {
            unsubscribeVehicle(this.state.selectedVehicle.vid);
        }
    },
    toggleSidebar() { this.setState({ sidebarCollapsed: !this.state.sidebarCollapsed }); },
    setTheme(theme) {
        const nextTheme = theme === 'light' ? 'light' : 'dark';
        localStorage.setItem('vwise_theme', nextTheme);
        document.body.classList.toggle('theme-light', nextTheme === 'light');
        document.body.classList.toggle('theme-dark', nextTheme === 'dark');
        this.setState({ theme: nextTheme });
    },
    // 查看历史网况
    viewHistory(vid) {
        let vehicle = null;
        for (const modelId in vehiclesByModel) {
            const found = vehiclesByModel[modelId].find(v => v.vid === vid);
            if (found) { vehicle = found; break; }
        }
        if (vehicle) {
            this.stopRealtimeUpdate();
            this.setState({
                selectedVehicle: vehicle,
                currentPage: 'vehicle-history'
            });
        }
    },
    // 返回车辆列表
    goToVehicles() {
        this.stopRealtimeUpdate();
        this.setState({ currentPage: 'vehicles', selectedVehicle: null });
    },
    // 切换到车辆网络故障定界
    goToSingleVehicleFaultDiagnosis() {
        this.stopRealtimeUpdate();
        if (!navigateMainPage('single-vehicle-fault-diagnosis.html', { currentMenu: 'single-vehicle-fault-diagnosis', currentPage: 'single-vehicle-fault-diagnosis', selectedModel: null, selectedVehicle: null })) {
            loadSingleVehicleFaultModels();
        }
    },
    // 选择车型查看车辆网络故障定界列表
    async selectSingleVehicleFaultModel(modelId) {
        const model = (window._singleVehicleFaultModels || []).find(m => (m.id || m.modelId) === modelId)
            || vehicleModels.find(m => m.id === modelId);
        this.stopRealtimeUpdate();
        this.setState({ currentMenu: 'single-vehicle-fault-diagnosis', selectedModel: model, currentPage: 'single-vehicle-fault-vehicles', selectedVehicle: null });

        const vehicles = await apiFetch(`/models/${modelId}/vehicles`);
        if (Array.isArray(vehicles)) {
            window._singleVehicleFaultVehiclesByModel[modelId] = vehicles;
            renderApp();
        }
    },
    // 返回车辆网络故障定界车型列表
    goToSingleVehicleFaultDiagnosisList() {
        this.setState({ currentPage: 'single-vehicle-fault-diagnosis', selectedModel: null, selectedVehicle: null });
    },
    // 查看车辆网络故障定界详情
    selectSingleVehicleFaultBoundary(vid) {
        const modelId = this.state.selectedModel && (this.state.selectedModel.id || this.state.selectedModel.modelId);
        const baseVehicles = (modelId && window._singleVehicleFaultVehiclesByModel[modelId]) || (modelId && vehiclesByModel[modelId]) || [];
        // 合并持久化故障工单，确保取到工单填写的 faultTimeStart/faultTimeEnd 等字段
        const vehicles = mergeFaultWorkOrders(baseVehicles, modelId);
        let vehicle = vehicles.find(item => item.vid === vid);
        if (!vehicle) {
            vehicle = { vid, plateNumber: `京A${vid.slice(-5)}`, status: 'online', lastUpdate: new Date().toISOString(), alertCount: 1 };
        }
        if (!this.state.vehicleData[vid]) {
            this.state.vehicleData[vid] = generateVehicleData(vid);
        }
        this.setState({ selectedVehicle: vehicle, currentPage: 'single-vehicle-fault-boundary-detail' });
    },
    // 返回单车型车辆故障定界列表
    goToSingleVehicleFaultVehicleList() {
        this.setState({ currentPage: 'single-vehicle-fault-vehicles', selectedVehicle: null });
    },
    // 切换到故障分析
    goToFaultAnalysis() {
        this.stopRealtimeUpdate();
        if (!navigateMainPage('fault-analysis.html', { currentMenu: 'fault-analysis', currentPage: 'fault-analysis', selectedModel: null, selectedVehicle: null })) {
            loadFaultStatsModels();
        }
    },
    // 选择车型查看故障详情
    async selectFaultModel(modelId) {
        const model = vehicleModels.find(m => m.id === modelId)
            || (window._faultStatsModels || []).find(m => (m.id || m.modelId) === modelId);
        this.stopRealtimeUpdate();
        window._faultStatsDetailWindow.offset = 0;
        window._faultStatsDetailWindow.visibleDays = getFaultVisibleDayCount();
        this.setState({ selectedModel: model, currentPage: 'fault-detail' });

        const detail = await apiFetch(`/fault-stats/models/${modelId}?days=${FAULT_STATS_FETCH_DAYS}`);
        if (detail) {
            window._faultStatsDetails[modelId] = detail;
            renderApp();
        }
    },
    // 返回故障分析列表
    goToFaultAnalysisList() {
        this.setState({ currentPage: 'fault-analysis', selectedModel: null });
    },
    // 切换到SDK管理
    goToSdkManagement() {
        this.stopRealtimeUpdate();
        navigateMainPage('sdk-management.html', { currentMenu: 'sdk-management', currentPage: 'sdk-management', selectedModel: null, selectedVehicle: null });
    },
    // 切换到OTA版本管理
    goToOtaManagement() {
        this.stopRealtimeUpdate();
        this.setState({ currentMenu: 'sdk-management', currentPage: 'ota-management', selectedModel: null, selectedVehicle: null });
    },
    // 切换到Ping测任务管理
    goToPingTasks() {
        this.stopRealtimeUpdate();
        this.setState({ currentMenu: 'sdk-management', currentPage: 'ping-tasks', selectedModel: null, selectedVehicle: null });
        loadPingTaskVehicles();
        loadPingTasks();
    },
    // 切换到SDK数据采集配置
    goToSdkCollectionConfig() {
        this.stopRealtimeUpdate();
        this.setState({ currentMenu: 'sdk-management', currentPage: 'sdk-collection-config', selectedModel: null, selectedVehicle: null });
        loadSdkCollectionConfigs();
    },
    // 返回SDK管理
    goToSdkManagementList() {
        this.setState({ currentPage: 'sdk-management' });
    },
    async selectPingTask(taskId) {
        const cachedTask = (window._pingTasks || []).find(task => task.taskId === taskId);
        if (cachedTask) {
            window._selectedPingTask = cachedTask;
            if (!window._pingTaskHistory[taskId]) window._pingTaskHistory[taskId] = [];
            this.setState({ currentMenu: 'sdk-management', currentPage: 'ping-task-detail' });
        }

        const encodedTaskId = encodeURIComponent(taskId);
        const [task, history] = await Promise.all([
            apiFetch(`/ping-tasks/${encodedTaskId}`),
            apiFetch(`/ping-tasks/${encodedTaskId}/history?limit=200`)
        ]);

        if (task) {
            window._selectedPingTask = task;
            window._pingTaskHistory[taskId] = history && history.records ? history.records : [];
            if (!cachedTask || Store.state.currentPage === 'ping-task-detail') {
                this.setState({ currentMenu: 'sdk-management', currentPage: 'ping-task-detail' });
                renderApp();
            }
        }
    },
    // 切换到网络覆盖热力图
    goToHeatmap() {
        this.stopRealtimeUpdate();
        navigateMainPage('heatmap.html', { currentMenu: 'heatmap', currentPage: 'heatmap', selectedModel: null, selectedVehicle: null });
    },

    // 切换到某车型的预警设置列表
    async goToAlertSettings(modelId) {
        this.stopRealtimeUpdate();
        const model = vehicleModels.find(m => m.id === modelId)
            || (window._liveModels || vehicleModels).find(m => m.id === modelId);
        this.setState({
            currentMenu: 'models',
            currentPage: 'alert-settings',
            selectedModel: model || { id: modelId },
            selectedVehicle: null,
            alertRules: [],
            alertRuleModalOpen: false,
            editingAlertRule: null
        });
        await loadAlertRules(modelId);
    },
    // 打开预警规则弹窗（rule=null 为新增）
    openAlertRuleModal(rule = null) {
        this.setState({ alertRuleModalOpen: true, editingAlertRule: rule });
    },
    // 关闭预警规则弹窗
    closeAlertRuleModal() {
        this.setState({ alertRuleModalOpen: false, editingAlertRule: null });
    },
    // 保存预警规则（新增/编辑）
    async saveAlertRule() {
        const imei = document.getElementById('ar-imei')?.value.trim();
        const alertType = document.getElementById('ar-type')?.value;
        const metric = document.getElementById('ar-metric')?.value;
        const threshold = document.getElementById('ar-threshold')?.value;
        const durationSec = document.getElementById('ar-duration')?.value;
        const { selectedModel, editingAlertRule } = this.state;

        if (!imei) { alert('请填写车辆IMEI'); return; }
        if (threshold === '' || threshold === undefined || isNaN(Number(threshold))) { alert('请填写有效的门限值'); return; }
        if (!durationSec || isNaN(Number(durationSec)) || Number(durationSec) <= 0) { alert('请填写有效的持续时长'); return; }

        const payload = {
            modelId: selectedModel && selectedModel.id,
            imei,
            alertType,
            metric,
            threshold: Number(threshold),
            durationSec: Number(durationSec)
        };

        let result;
        if (editingAlertRule) {
            result = await apiFetch(`/alert-rules/${encodeURIComponent(editingAlertRule.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            result = await apiFetch('/alert-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (result && (result.id || result.success)) {
            this.closeAlertRuleModal();
            renderApp();
            await loadAlertRules(selectedModel && selectedModel.id);
        } else {
            alert('保存失败，请检查后端服务');
        }
    },
    // 删除预警规则
    async deleteAlertRule(id) {
        if (!confirm('确认删除该预警规则？')) return;
        const result = await apiFetch(`/alert-rules/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (result && result.success) {
            const { selectedModel } = this.state;
            await loadAlertRules(selectedModel && selectedModel.id);
        } else {
            alert('删除失败，请检查后端服务');
        }
    }
};
