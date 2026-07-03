function renderApp() {
    const { currentPage, isAuthenticated } = Store.getState();
    const app = document.getElementById('app');
    if (!isAuthenticated) {
        app.innerHTML = renderLoginPage();
    } else {
        let html = '';
        if (currentPage === 'dashboard') html = renderDashboardPage();
        else if (currentPage === 'models') html = renderModelsPage();
        else if (currentPage === 'vehicles') html = renderVehiclesPage();
        else if (currentPage === 'vehicle-detail') html = renderVehicleDetailPage();
        else if (currentPage === 'vehicle-history') html = renderVehicleHistoryPage();
        else if (currentPage === 'fault-analysis') html = renderFaultAnalysisPage();
        else if (currentPage === 'fault-detail') html = renderFaultDetailPage();
        else if (currentPage === 'single-vehicle-fault-diagnosis') html = renderSingleVehicleFaultDiagnosisPage();
        else if (currentPage === 'single-vehicle-fault-vehicles') html = renderSingleVehicleFaultVehicleListPage();
        else if (currentPage === 'single-vehicle-fault-boundary-detail') html = renderSingleVehicleFaultBoundaryDetailPage();
        else if (currentPage === 'sdk-management') html = renderSdkManagementPage();
        else if (currentPage === 'ping-tasks') html = renderPingTasksPage();
        else if (currentPage === 'sdk-collection-config') html = renderSdkCollectionConfigPage();
        else if (currentPage === 'ping-task-detail') html = renderPingTaskDetailPage();
        else if (currentPage === 'ota-management') html = renderOtaManagementPage();
        else if (currentPage === 'heatmap') html = renderHeatmapPage();
        else if (currentPage === 'alert-settings') html = renderAlertSettingsPage();
        else html = renderDashboardPage();
        resetVehicleMap();
        app.innerHTML = html;
        if (currentPage === 'vehicle-detail') setTimeout(initMap, 100);
        if (currentPage === 'single-vehicle-fault-boundary-detail') setTimeout(initFaultSignalMap, 100);
        if (currentPage === 'heatmap') setTimeout(() => { updateHeatmap(); }, 100);
    }
}

function updateHeaderTime() {
    const el = document.getElementById('header-time');
    if (el) el.textContent = new Date().toLocaleString('zh-CN');
}

function updateVehicleDetail() {
    const { currentPage, selectedVehicle, vehicleData } = Store.getState();
    if (currentPage !== 'vehicle-detail' || !selectedVehicle || !vehicleData[selectedVehicle.vid]) return;
    const data = vehicleData[selectedVehicle.vid];
    const tsEl = document.getElementById('update-timestamp');
    if (tsEl) tsEl.textContent = new Date(data.system.timestamp).toLocaleTimeString('zh-CN');
    updatePositionInfo(data);
    refreshVehicleMap();
}

function applyDefaultRoute() {
    if (!Store.state.isAuthenticated) return;
    const route = getDefaultRoute();
    Store.setState({
        currentMenu: route.currentMenu,
        currentPage: route.currentPage,
        selectedModel: null,
        selectedVehicle: null
    });
}

// ========== 初始化 ==========

async function initApp() {
    document.body.classList.toggle('theme-light', Store.state.theme === 'light');
    document.body.classList.toggle('theme-dark', Store.state.theme === 'dark');
    Store.restoreSession();
    applyDefaultRoute();
    Store.subscribe(() => updateVehicleDetail());
    renderApp();

    // 连接WebSocket接收实时数据推送
    connectWebSocket();

    // 从后端API加载车型数据（带在线/离线统计）
    try {
        const models = await apiFetch('/models');
        if (models && models.length > 0) {
            vehicleModels = models;
            window._liveModels = models;
            // 如果已登录且在车型页面，刷新显示
            if (Store.state.isAuthenticated && (Store.state.currentPage === 'models' || Store.state.currentPage === 'dashboard')) {
                renderApp();
            }
        }
    } catch (e) {
        console.log('[Init] 使用静态车型数据');
    }

    if (Store.state.isAuthenticated && Store.state.currentPage === 'fault-analysis') {
        loadFaultStatsModels();
    }

    if (Store.state.isAuthenticated && Store.state.currentPage === 'single-vehicle-fault-diagnosis') {
        loadSingleVehicleFaultModels();
    }

    // 从后端API加载仪表盘统计
    if (Store.state.isAuthenticated && Store.state.currentPage === 'dashboard') {
        loadDashboardStats();
    }

    let faultStatsResizeTimer = null;
    window.addEventListener('resize', () => {
        if (faultStatsResizeTimer) clearTimeout(faultStatsResizeTimer);
        faultStatsResizeTimer = setTimeout(() => {
            if (Store.state.currentPage === 'fault-detail') {
                renderApp();
            }
        }, 150);
    });

    setInterval(updateHeaderTime, 1000);
}

document.addEventListener('DOMContentLoaded', initApp);
