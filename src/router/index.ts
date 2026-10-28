export type AppRoute = '#/' | '#/dashboard' | '#/sanitize' | '#/guide';

export interface RouteDefinition {
  path: AppRoute;
  guard?: () => boolean;
  redirectFallback?: AppRoute;
  action?: () => void;
}

let activeRoutes: RouteDefinition[] = [];
let routeListener: ((route: AppRoute) => void) | null = null;
let currentRoute: AppRoute = '#/';

export function getCurrentRoute(): AppRoute {
  return currentRoute;
}

export function navigateTo(route: AppRoute): void {
  if (window.location.hash !== route) {
    window.location.hash = route;
    window.dispatchEvent(new Event('hashchange'));
  }
}

export function initRouter(
  routes: RouteDefinition[],
  onRouteChange?: (route: AppRoute) => void
): () => void {
  activeRoutes = routes;
  routeListener = onRouteChange || null;

  const handleRoute = () => {
    let hash = window.location.hash;
    if (!hash || hash === '#' || hash === '') {
      hash = '#/';
    }

    const matchedRoute =
      activeRoutes.find((r) => r.path === hash) ||
      activeRoutes.find((r) => r.path === '#/') ||
      activeRoutes[0];

    if (!matchedRoute) return;

    if (matchedRoute.guard && !matchedRoute.guard()) {
      const fallback = matchedRoute.redirectFallback || '#/';
      if (window.location.hash !== fallback) {
        window.location.hash = fallback;
      }
      return;
    }

    currentRoute = matchedRoute.path;

    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    if (matchedRoute.action) {
      matchedRoute.action();
    }

    if (routeListener) {
      routeListener(matchedRoute.path);
    }
  };

  const onHashChange = () => {
    handleRoute();
  };

  window.addEventListener('hashchange', onHashChange);
  handleRoute();

  return () => {
    window.removeEventListener('hashchange', onHashChange);
    routeListener = null;
  };
}
