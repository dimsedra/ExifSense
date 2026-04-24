export class Router {
    constructor(routes) {
        this.routes = routes;
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    }

    handleRoute() {
        let hash = window.location.hash;
        if (!hash || hash === '#') hash = '#/';
        
        const route = this.routes.find(r => r.path === hash) || this.routes[0];
        
        if (route.guard && !route.guard()) {
            window.location.hash = '#/';
            return;
        }

        window.scrollTo({ top: 0, behavior: 'instant' });
        route.action();
    }

    static navigate(path) {
        window.location.hash = path;
    }
}
