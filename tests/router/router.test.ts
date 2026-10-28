// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { initRouter, navigateTo, getCurrentRoute } from '../../src/router';
import type { RouteDefinition } from '../../src/router';

describe('Client Hash Router - Navigation & Lifecycle (Scenario 6.1, REQ-STA-007)', () => {
  let cleanup: (() => void) | null = null;
  const scrollMock = vi.fn();

  beforeEach(() => {
    window.location.hash = '';
    window.scrollTo = scrollMock;
    scrollMock.mockClear();
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  });

  it('initializes and defaults empty hash to #/', () => {
    let current: string = '';
    const routes: RouteDefinition[] = [
      { path: '#/' },
      { path: '#/guide' },
    ];

    cleanup = initRouter(routes, (route) => {
      current = route;
    });

    expect(getCurrentRoute()).toBe('#/');
    expect(current).toBe('#/');
    expect(scrollMock).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  });

  it('navigates programmatically via navigateTo and executes route action', () => {
    const actionSpy = vi.fn();
    const routes: RouteDefinition[] = [
      { path: '#/' },
      { path: '#/guide', action: actionSpy },
    ];

    let current = '';
    cleanup = initRouter(routes, (route) => {
      current = route;
    });

    navigateTo('#/guide');
    expect(window.location.hash).toBe('#/guide');
    expect(getCurrentRoute()).toBe('#/guide');
    expect(current).toBe('#/guide');
    expect(actionSpy).toHaveBeenCalled();
  });

  it('unsubscribes and cleans up hashchange listener', () => {
    const routes: RouteDefinition[] = [
      { path: '#/' },
      { path: '#/guide' },
    ];

    let triggerCount = 0;
    cleanup = initRouter(routes, () => {
      triggerCount++;
    });

    expect(triggerCount).toBe(1); // initial route

    // Cleanup router
    cleanup();
    cleanup = null;

    // Further navigation should not invoke route listener
    window.location.hash = '#/guide';
    window.dispatchEvent(new Event('hashchange'));
    expect(triggerCount).toBe(1);
  });
});


describe('Client Hash Router - Route Guards & Redirection (Scenario 6.2, REQ-STA-007)', () => {
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    window.location.hash = '';
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  });

  it('allows navigation when route guard returns true', () => {
    const dashboardAction = vi.fn();
    const routes: RouteDefinition[] = [
      { path: '#/' },
      {
        path: '#/dashboard',
        guard: () => true,
        action: dashboardAction,
      },
    ];

    let current = '';
    cleanup = initRouter(routes, (route) => {
      current = route;
    });

    navigateTo('#/dashboard');
    expect(window.location.hash).toBe('#/dashboard');
    expect(getCurrentRoute()).toBe('#/dashboard');
    expect(current).toBe('#/dashboard');
    expect(dashboardAction).toHaveBeenCalled();
  });

  it('blocks navigation and redirects to fallback when guard returns false', () => {
    let hasAssets = false;
    const dashboardAction = vi.fn();
    const homeAction = vi.fn();

    const routes: RouteDefinition[] = [
      { path: '#/', action: homeAction },
      {
        path: '#/dashboard',
        guard: () => hasAssets,
        redirectFallback: '#/',
        action: dashboardAction,
      },
    ];

    let current = '';
    cleanup = initRouter(routes, (route) => {
      current = route;
    });

    // Attempt navigating to dashboard when hasAssets is false
    navigateTo('#/dashboard');

    expect(dashboardAction).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('#/');
    expect(getCurrentRoute()).toBe('#/');
    expect(current).toBe('#/');

    // Now set hasAssets to true and navigate again
    hasAssets = true;
    navigateTo('#/dashboard');

    expect(dashboardAction).toHaveBeenCalled();
    expect(window.location.hash).toBe('#/dashboard');
    expect(getCurrentRoute()).toBe('#/dashboard');
    expect(current).toBe('#/dashboard');
  });
});
