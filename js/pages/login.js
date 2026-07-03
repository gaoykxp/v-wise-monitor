function renderLoginPage() {
    return `
        <div class="min-h-screen bg-background flex items-center justify-center p-4">
            <div class="absolute inset-0 overflow-hidden">
                <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-cta/10 rounded-full blur-3xl"></div>
                <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cta/10 rounded-full blur-3xl"></div>
            </div>
            <div class="relative w-full max-w-md">
                <div class="bg-surface rounded-2xl p-8 border border-border shadow-2xl">
                    <div class="flex justify-center mb-8">
                        <div class="w-16 h-16 bg-cta rounded-xl flex items-center justify-center">
                            <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
                        </div>
                    </div>
                    <div class="text-center mb-8">
                        <h1 class="text-2xl font-bold text-primary mb-2">V-Wise</h1>
                        <p class="text-muted">车辆网络数据分析中心</p>
                    </div>
                    <form onsubmit="handleLogin(event)" class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-muted mb-2">用户名</label>
                            <input type="text" id="login-username" value="admin" class="w-full px-4 py-3 bg-background border border-border rounded-lg text-primary placeholder-muted focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors" placeholder="请输入用户名">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-muted mb-2">密码</label>
                            <input type="password" id="login-password" value="admin123" class="w-full px-4 py-3 bg-background border border-border rounded-lg text-primary placeholder-muted focus:outline-none focus:border-cta focus:ring-1 focus:ring-cta transition-colors" placeholder="请输入密码">
                        </div>
                        <div id="login-error" class="hidden text-sm text-red-400 text-center"></div>
                        <button type="submit" class="w-full py-3 bg-cta hover:bg-cta/90 text-white font-semibold rounded-lg transition-colors duration-200 cursor-pointer flex items-center justify-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                            登录系统
                        </button>
                    </form>
                    <div class="mt-6 pt-6 border-t border-border"><p class="text-xs text-muted text-center">测试账号：admin / admin123</p></div>
                </div>
            </div>
        </div>`;
}

function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const result = Store.login(username, password);
    if (result.success) renderApp();
    else {
        document.getElementById('login-error').textContent = result.message;
        document.getElementById('login-error').classList.remove('hidden');
    }
}
