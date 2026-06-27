import { t } from './i18n.js';
import { Router } from './router.js';

const TAB_KEYS = ['overview', 'navigation', 'features'];

const SECTION_CONTENT = {
    overview: {
        icon: 'compass',
        items: [
            { key: 'feat_secure', icon: 'lock' },
            { key: 'feat_integrity', icon: 'activity' },
            { key: 'feat_spoof', icon: 'shield-alert' },
            { key: 'feat_sanitize_overview', icon: 'shield-off' }
        ]
    },
    navigation: {
        icon: 'map',
        items: [
            { key: 'nav_header', icon: 'panel-top' },
            { key: 'nav_upload', icon: 'upload-cloud' },
            { key: 'nav_dashboard', icon: 'layout-dashboard' },
            { key: 'nav_history', icon: 'history' }
        ]
    },
    features: {
        icon: 'zap',
        items: [
            { key: 'feat_analyze', icon: 'search' },
            { key: 'feat_batch', icon: 'layers' },
            { key: 'feat_sanitize', icon: 'shield-off' }
        ]
    }
};

function renderTabButton(tabKey, isActive) {
    const iconMap = { overview: 'compass', navigation: 'map', features: 'zap' };
    return `<button class="guide-tab-btn${isActive ? ' active' : ''}" data-guide-tab="${tabKey}">
        <i data-lucide="${iconMap[tabKey]}"></i>
        <span>${t(`guide_tab_${tabKey}`)}</span>
    </button>`;
}

function renderTabContent(tabKey) {
    const section = SECTION_CONTENT[tabKey];
    const items = section.items.map(item => {
        const heading = t(`guide_${item.key}_title`);
        const desc = t(`guide_${item.key}_desc`);
        return `<div class="guide-feature-item">
            <div class="guide-feature-icon"><i data-lucide="${item.icon}"></i></div>
            <div class="guide-feature-text">
                <h4>${heading}</h4>
                <p>${desc}</p>
            </div>
        </div>`;
    }).join('');

    return `<div class="guide-tab-pane${tabKey === 'overview' ? ' active' : ''}" data-guide-pane="${tabKey}">
        <div class="guide-pane-inner">
            ${tabKey === 'overview' ? `<p class="guide-intro-text">${t('guide_overview_intro')}</p>` : ''}
            <div class="guide-feature-grid">
                ${items}
            </div>
            ${tabKey === 'overview' ? `<div class="guide-cta-row">
                <button class="btn btn-primary" id="guide-start-btn"><i data-lucide="play"></i> ${t('guide_btn_start')}</button>
                <button class="btn btn-secondary" id="guide-history-btn"><i data-lucide="history"></i> ${t('guide_btn_history')}</button>
            </div>` : ''}
        </div>
    </div>`;
}

export function renderGuide() {
    const container = document.getElementById('guide-state');
    if (!container) return;

    const tabsHtml = TAB_KEYS.map(k => renderTabButton(k, k === 'overview')).join('');
    const panesHtml = TAB_KEYS.map(k => renderTabContent(k)).join('');

    container.innerHTML = `
        <div class="guide-page">
            <div class="guide-header">
                <div class="guide-header-icon"><i data-lucide="book-open"></i></div>
                <h2>${t('guide_title')}</h2>
            </div>
            <div class="guide-tabs-container">
                ${tabsHtml}
            </div>
            <div class="guide-panes-wrapper">
                ${panesHtml}
            </div>
        </div>
    `;

    container.querySelectorAll('.guide-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.guideTab;
            container.querySelectorAll('.guide-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.guideTab === tab));
            container.querySelectorAll('.guide-tab-pane').forEach(p => p.classList.toggle('active', p.dataset.guidePane === tab));
        });
    });

    const startBtn = container.querySelector('#guide-start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => Router.navigate('#/'));
    }
    const historyBtn = container.querySelector('#guide-history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            Router.navigate('#/');
            setTimeout(() => window.dispatchEvent(new CustomEvent('switch-to-history')), 50);
        });
    }

    if (window.lucide) lucide.createIcons();
}

export function initGuide(state, elements) {
    elements.guideBtn?.addEventListener('click', () => {
        Router.navigate('#/guide');
    });

    window.addEventListener('languageChanged', () => {
        if (!elements.guideState.classList.contains('hidden')) {
            renderGuide();
        }
    });
}
