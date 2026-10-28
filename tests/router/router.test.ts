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
