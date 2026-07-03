// 路由管理 - 车联网网况监控平台

const Router = {
    routes: {
        'login': LoginPage,
        'dashboard': DashboardPage,
        'vehicles': VehiclesPage,
        'vehicle-detail': VehicleDetailPage
    },

    navigate(page) {
        Store.setState({ currentPage: page });
    },

    render() {
        const { currentPage, isAuthenticated } = Store.getState();

        // 未登录只能访问登录页
        if (!isAuthenticated && currentPage !== 'login') {
            Store.setState({ currentPage: 'login' });
            return LoginPage.render();
        }

        const route = this.routes[currentPage];
        if (route) {
            return route.render();
        }

        // 默认跳转
        return isAuthenticated ? DashboardPage.render() : LoginPage.render();
    }
};