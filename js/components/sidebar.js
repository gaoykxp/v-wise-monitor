// 侧边栏组件 - 车联网网况监控平台

const Sidebar = {
    render() {
        const { currentUser, sidebarCollapsed, currentPage } = Store.getState();

        if (!currentUser) return '';

        const menuItems = [
            {
                id: 'dashboard',
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>`,
                label: '控制台',
                action: () => Store.goToDashboard()
            },
            {
                id: 'vehicles',
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`,
                label: '车型管理',
                action: () => Store.goToDashboard()
            }
        ];

        const width = sidebarCollapsed ? 'w-16' : 'w-64';

        return `
            <aside class="${width} bg-surface border-r border-border flex flex-col transition-all duration-300">
                <!-- Logo -->
                <div class="h-16 flex items-center justify-center border-b border-border">
                    ${sidebarCollapsed ?
                        `<div class="w-8 h-8 bg-cta rounded-lg flex items-center justify-center">
                            <svg class="w-5 h-5 text-background" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                            </svg>
                        </div>`
                        :
                        `<div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-cta rounded-lg flex items-center justify-center">
                                <svg class="w-6 h-6 text-background" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                                </svg>
                            </div>
                            <div>
                                <span class="text-lg font-semibold text-white">V-Wise</span>
                                <span class="text-xs text-muted block">Monitor</span>
                            </div>
                        </div>`
                    }
                </div>

                <!-- Menu -->
                <nav class="flex-1 py-4">
                    <ul class="space-y-1 px-2">
                        ${menuItems.map(item => `
                            <li>
                                <button
                                    onclick="${item.action.toString().replace(/'/g, "\\'")}; renderApp();"
                                    class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 cursor-pointer
                                    ${currentPage === item.id ?
                                        'bg-cta/20 text-cta' :
                                        'text-muted hover:bg-secondary hover:text-white'
                                    }"
                                    title="${sidebarCollapsed ? item.label : ''}"
                                >
                                    ${item.icon}
                                    ${!sidebarCollapsed ? `<span class="font-medium">${item.label}</span>` : ''}
                                </button>
                            </li>
                        `).join('')}
                    </ul>
                </nav>

                <!-- Toggle Button -->
                <div class="p-2 border-t border-border">
                    <button
                        onclick="Store.toggleSidebar(); renderApp();"
                        class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted hover:bg-secondary hover:text-white transition-colors cursor-pointer"
                    >
                        <svg class="w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
                        </svg>
                        ${!sidebarCollapsed ? '<span class="font-medium">收起</span>' : ''}
                    </button>
                </div>

                <!-- User Info -->
                <div class="p-3 border-t border-border">
                    ${sidebarCollapsed ?
                        `<div class="w-8 h-8 mx-auto rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-cta">
                            ${currentUser.name.charAt(0)}
                        </div>`
                        :
                        `<div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-cta">
                                ${currentUser.name.charAt(0)}
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-white truncate">${currentUser.name}</p>
                                <p class="text-xs text-muted truncate">${currentUser.role === 'admin' ? '管理员' : currentUser.role === 'operator' ? '运维' : '观察员'}</p>
                            </div>
                        </div>`
                    }
                </div>
            </aside>
        `;
    }
};