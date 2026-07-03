// 头部组件 - 车联网网况监控平台

const Header = {
    render() {
        const { currentUser, currentPage, selectedModel, selectedVehicle } = Store.getState();

        if (!currentUser) return '';

        // 根据页面生成面包屑
        let breadcrumbs = [];
        if (currentPage === 'dashboard') {
            breadcrumbs = [{ label: '控制台', active: true }];
        } else if (currentPage === 'vehicles') {
            breadcrumbs = [
                { label: '控制台', action: () => Store.goToDashboard() },
                { label: selectedModel ? selectedModel.name : '车型', active: true }
            ];
        } else if (currentPage === 'vehicle-detail') {
            breadcrumbs = [
                { label: '控制台', action: () => Store.goToDashboard() },
                { label: selectedModel ? selectedModel.name : '车型', action: () => Store.goToVehicles() },
                { label: selectedVehicle ? selectedVehicle.vid : '车辆详情', active: true }
            ];
        }

        return `
            <header class="h-16 bg-surface border-b border-border flex items-center justify-between px-6">
                <!-- 面包屑 -->
                <div class="flex items-center gap-2">
                    ${breadcrumbs.map((item, index) => `
                        ${index > 0 ? '<span class="text-muted">/</span>' : ''}
                        ${item.active ?
                            `<span class="text-white font-medium">${item.label}</span>`
                            :
                            `<button
                                onclick="${item.action.toString().replace(/'/g, "\\'")}; renderApp();"
                                class="text-muted hover:text-white transition-colors cursor-pointer"
                            >${item.label}</button>`
                        }
                    `).join('')}
                </div>

                <!-- 右侧操作区 -->
                <div class="flex items-center gap-4">
                    <!-- 时间显示 -->
                    <div class="text-sm text-muted">
                        <span id="header-time">${new Date().toLocaleString('zh-CN')}</span>
                    </div>

                    <!-- 登出按钮 -->
                    <button
                        onclick="Store.logout(); renderApp();"
                        class="flex items-center gap-2 px-3 py-2 rounded-lg text-muted hover:bg-secondary hover:text-white transition-colors cursor-pointer"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                        </svg>
                        <span class="text-sm">退出</span>
                    </button>
                </div>
            </header>
        `;
    },

    updateTime() {
        const timeEl = document.getElementById('header-time');
        if (timeEl) {
            timeEl.textContent = new Date().toLocaleString('zh-CN');
        }
    }
};