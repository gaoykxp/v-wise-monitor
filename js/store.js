// 状态管理 - 车联网网况监控平台

const Store = {
    state: {
        currentUser: null,
        isAuthenticated: false,
        currentPage: 'login',
        selectedModel: null,
        selectedVehicle: null,
        vehicleData: {},
        historyData: {},
        realtimeInterval: null,
        sidebarCollapsed: false
    },

    listeners: [],

    getState() {
        return this.state;
    },

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notify();
    },

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    },

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    },

    // 登录
    login(username, password) {
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            this.setState({
                currentUser: user,
                isAuthenticated: true,
                currentPage: 'dashboard'
            });
            localStorage.setItem('vwise_user', JSON.stringify(user));
            return { success: true, user };
        }
        return { success: false, message: '用户名或密码错误' };
    },

    // 登出
    logout() {
        this.setState({
            currentUser: null,
            isAuthenticated: false,
            currentPage: 'login',
            selectedModel: null,
            selectedVehicle: null
        });
        localStorage.removeItem('vwise_user');
        if (this.state.realtimeInterval) {
            clearInterval(this.state.realtimeInterval);
        }
    },

    // 恢复登录状态
    restoreSession() {
        const savedUser = localStorage.getItem('vwise_user');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            this.setState({
                currentUser: user,
                isAuthenticated: true,
                currentPage: 'dashboard'
            });
            return true;
        }
        return false;
    },

    // 选择车型
    selectModel(modelId) {
        const model = vehicleModels.find(m => m.id === modelId);
        this.setState({
            selectedModel: model,
            currentPage: 'vehicles'
        });
    },

    // 选择车辆
    selectVehicle(vid) {
        let vehicle = null;
        for (const modelId in vehiclesByModel) {
            const found = vehiclesByModel[modelId].find(v => v.vid === vid);
            if (found) {
                vehicle = found;
                break;
            }
        }

        if (vehicle) {
            // 生成初始数据
            const initialData = generateVehicleData(vid, {
                longitude: 116.4074 + (Math.random() - 0.5) * 0.5,
                latitude: 39.9042 + (Math.random() - 0.5) * 0.3
            });

            this.setState({
                selectedVehicle: vehicle,
                vehicleData: { [vid]: initialData },
                historyData: { [vid]: generateHistoryData(24) },
                currentPage: 'vehicle-detail'
            });

            // 启动实时更新
            this.startRealtimeUpdate(vid);
        }
    },

    // 实时数据更新
    startRealtimeUpdate(vid) {
        if (this.state.realtimeInterval) {
            clearInterval(this.state.realtimeInterval);
        }

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

            // 添加微小位置变化
            if (Math.random() > 0.7) {
                updatedData.system.longitude += (Math.random() - 0.5) * 0.001;
                updatedData.system.latitude += (Math.random() - 0.5) * 0.001;
            }

            // 更新历史数据
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

    // 停止实时更新
    stopRealtimeUpdate() {
        if (this.state.realtimeInterval) {
            clearInterval(this.state.realtimeInterval);
            this.setState({ realtimeInterval: null });
        }
    },

    // 切换侧边栏
    toggleSidebar() {
        this.setState({ sidebarCollapsed: !this.state.sidebarCollapsed });
    },

    // 返回车型列表
    goToDashboard() {
        this.stopRealtimeUpdate();
        this.setState({
            currentPage: 'dashboard',
            selectedModel: null,
            selectedVehicle: null
        });
    },

    // 返回车辆列表
    goToVehicles() {
        this.stopRealtimeUpdate();
        this.setState({
            currentPage: 'vehicles',
            selectedVehicle: null
        });
    }
};