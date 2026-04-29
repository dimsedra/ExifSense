let currentDictionary = null;
let currentLang = localStorage.getItem('exifsense_lang') || 'en';

/**
 * Initialize i18n by loading the preferred language
 */
export async function initI18n() {
    await loadLanguage(currentLang);
    translatePage();
}

/**
 * Load a specific language JSON from src/locales/
 */
async function loadLanguage(lang) {
    try {
        const response = await fetch(`./src/locales/${lang}.json`);
        if (!response.ok) throw new Error(`Could not load language: ${lang}`);
        currentDictionary = await response.json();
        currentLang = lang;
        localStorage.setItem('exifsense_lang', lang);
        document.documentElement.lang = lang;
        document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
    } catch (error) {
        console.error('i18n Error:', error);
        // Fallback to English if not already tried
        if (lang !== 'en') {
            await loadLanguage('en');
        }
    }
}

/**
 * Switch language and re-translate the page
 */
export async function setLanguage(lang) {
    if (lang === currentLang) return;
    await loadLanguage(lang);
    translatePage();
    
    // Trigger a custom event for other modules to re-render if needed
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

export function getCurrentLanguage() {
    return currentLang;
}

/**
 * Translate a key with optional parameters
 */
export function t(key, params = {}, category = 'ui') {
    if (!currentDictionary) return key;
    
    let text = currentDictionary[category]?.[key] || currentDictionary['ui']?.[key] || currentDictionary['reports']?.[key] || key;
    
    // Replace placeholders {key} with params
    Object.keys(params).forEach(param => {
        text = text.replace(new RegExp(`{${param}}`, 'g'), String(params[param]));
    });
    
    return text;
}

/**
 * Scan the DOM for data-i18n attributes and translate them
 */
export function translatePage() {
    if (!currentDictionary) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        
        // Extract dynamic parameters from data-i18n-param-* attributes
        const params = {};
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('data-i18n-param-')) {
                const paramName = attr.name.replace('data-i18n-param-', '');
                params[paramName] = attr.value;
            }
        });
        
        const translated = t(key, params);
        
        if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
            el.setAttribute('placeholder', translated);
        }
        
        if (el.hasAttribute('title')) {
            el.setAttribute('title', translated);
        }

        // Only modify DOM content if it's not a pure title-only input
        if (el.tagName !== 'INPUT' && (el.hasChildNodes() || !el.hasAttribute('title'))) {
            const spanText = el.querySelector('span');
            if (spanText) {
                spanText.textContent = translated;
            } else {
                const icon = el.querySelector('i[data-lucide], svg.lucide');
                if (icon) {
                    Array.from(el.childNodes).forEach(node => {
                        if (node.nodeType === 3) node.remove();
                    });
                    el.appendChild(document.createTextNode(' ' + translated));
                } else {
                    el.innerHTML = translated;
                }
            }
        }
    });
    
    document.title = t('title');
}
