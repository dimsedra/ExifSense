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
    
    let text = currentDictionary[category]?.[key] || key;
    
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
        const translated = t(key);
        
        if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
            el.setAttribute('placeholder', translated);
        } else if (el.hasAttribute('title') && !el.hasChildNodes()) {
             el.setAttribute('title', translated);
        } else {
            // Preservation of icons (search for child <i> tags or already rendered <svg>)
            const icon = el.querySelector('i[data-lucide], svg.lucide');
            if (icon) {
                // Remove all existing text nodes to avoid double text
                Array.from(el.childNodes).forEach(node => {
                    if (node.nodeType === 3) node.remove();
                });
                // Add the translated text as a single text node after the icon
                el.appendChild(document.createTextNode(' ' + translated));
            } else {
                el.innerHTML = translated;
            }
        }
    });
    
    document.title = t('title');
}
