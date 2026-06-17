// Theme setup lives separately from the feature logic in app.js.
const THEMES = {
    NEON: 'neon',
    CUTE: 'cute'
};

const THEME_META = {
    neon: {
        icon: 'fas fa-bolt',
        colorScheme: '#090d18',
        monthlyGradient: ['rgba(14, 165, 233, 0.8)', 'rgba(6, 182, 212, 0.8)'],
        categoryChartColors: [
            'rgba(14, 165, 233, 0.85)',
            'rgba(236, 72, 153, 0.85)',
            'rgba(34, 197, 94, 0.85)',
            'rgba(250, 204, 21, 0.85)',
            'rgba(168, 85, 247, 0.85)',
            'rgba(249, 115, 22, 0.85)',
            'rgba(6, 182, 212, 0.85)',
            'rgba(16, 185, 129, 0.85)',
            'rgba(239, 68, 68, 0.85)',
            'rgba(79, 70, 229, 0.85)',
            'rgba(20, 184, 166, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            'rgba(217, 70, 239, 0.85)',
            'rgba(59, 130, 246, 0.85)',
            'rgba(132, 204, 22, 0.85)'
        ]
    },
    cute: {
        icon: 'fas fa-heart',
        colorScheme: '#fff5fb',
        monthlyGradient: ['rgba(255, 158, 199, 0.82)', 'rgba(169, 121, 255, 0.82)'],
        categoryChartColors: [
            'rgba(232, 93, 158, 0.86)',
            'rgba(255, 158, 199, 0.86)',
            'rgba(169, 121, 255, 0.86)',
            'rgba(255, 179, 92, 0.86)',
            'rgba(42, 157, 114, 0.86)',
            'rgba(255, 143, 171, 0.86)',
            'rgba(124, 199, 255, 0.86)',
            'rgba(255, 209, 102, 0.86)',
            'rgba(217, 68, 106, 0.86)',
            'rgba(190, 149, 255, 0.86)',
            'rgba(92, 198, 183, 0.86)',
            'rgba(255, 187, 204, 0.86)'
        ]
    }
};

const CUTE_CATEGORY_OVERRIDES = {
    food: { color: '#e85d9e', bg: '#ffe8f3', gradient: 'linear-gradient(90deg, #e85d9e, #ff9ec7, #ffd1e3)' },
    rent: { color: '#a979ff', bg: '#f0e7ff', gradient: 'linear-gradient(90deg, #8b5cf6, #a979ff, #d7c2ff)' },
    mortgage: { color: '#d9891f', bg: '#fff1d8', gradient: 'linear-gradient(90deg, #d9891f, #ffb35c, #ffd166)' },
    transport: { color: '#4c9fe8', bg: '#e5f4ff', gradient: 'linear-gradient(90deg, #4c9fe8, #7cc7ff, #c8ecff)' },
    subscription: { color: '#2a9d72', bg: '#e1f7ee', gradient: 'linear-gradient(90deg, #2a9d72, #5cc6b7, #b9f3dd)' },
    daily: { color: '#ff8f6b', bg: '#fff0e8', gradient: 'linear-gradient(90deg, #ff8f6b, #ffb35c, #ffd1a8)' },
    cat: { color: '#d9446a', bg: '#ffe8ef', gradient: 'linear-gradient(90deg, #d9446a, #ff8fab, #ffd1dc)' },
    entertainment: { color: '#a979ff', bg: '#f0e7ff', gradient: 'linear-gradient(90deg, #8b5cf6, #a979ff, #ff9ec7)' },
    gf: { color: '#e85d9e', bg: '#ffe4f1', gradient: 'linear-gradient(90deg, #d9446a, #e85d9e, #ffb3cf)' },
    shopping: { color: '#ff7fae', bg: '#ffe8f3', gradient: 'linear-gradient(90deg, #ff7fae, #ff9ec7, #ffd1e3)' },
    investment: { color: '#5cc6b7', bg: '#e5f8f5', gradient: 'linear-gradient(90deg, #2a9d72, #5cc6b7, #c4f1ec)' },
    salary: { color: '#2a9d72', bg: '#e1f7ee', gradient: 'linear-gradient(90deg, #2a9d72, #5cc6b7, #b9f3dd)' },
    bonus: { color: '#d9891f', bg: '#fff3d6', gradient: 'linear-gradient(90deg, #d9891f, #ffb35c, #ffd166)' },
    invest: { color: '#5c9ded', bg: '#e8f3ff', gradient: 'linear-gradient(90deg, #5c9ded, #7cc7ff, #c8ecff)' },
    gift: { color: '#e85d9e', bg: '#ffe8f3', gradient: 'linear-gradient(90deg, #e85d9e, #ff9ec7, #ffd1e3)' },
    parttime: { color: '#a979ff', bg: '#f0e7ff', gradient: 'linear-gradient(90deg, #8b5cf6, #a979ff, #d7c2ff)' },
    other: { color: '#896778', bg: '#f7edf3', gradient: 'linear-gradient(90deg, #896778, #c79caf, #f0c8d9)' }
};

let currentTheme = localStorage.getItem(STORAGE_KEYS.THEME) || THEMES.NEON;
if (!Object.values(THEMES).includes(currentTheme)) currentTheme = THEMES.NEON;

function getCssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

function applyTheme(theme, shouldPersist = true) {
    currentTheme = theme === THEMES.CUTE ? THEMES.CUTE : THEMES.NEON;
    document.documentElement.dataset.theme = currentTheme;
    document.body?.setAttribute('data-theme', currentTheme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) metaThemeColor.setAttribute('content', THEME_META[currentTheme].colorScheme);
    if (shouldPersist) localStorage.setItem(STORAGE_KEYS.THEME, currentTheme);
    updateThemeToggleUI();
}

function updateThemeToggleUI() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    const isCute = currentTheme === THEMES.CUTE;
    const meta = THEME_META[currentTheme];
    toggle.setAttribute('aria-pressed', String(isCute));
    toggle.setAttribute('aria-label', isCute ? 'Switch to neon theme' : 'Switch to cute theme');
    const icon = toggle.querySelector('.theme-toggle-thumb i');
    if (icon) icon.className = meta.icon;
}

function setupThemeSwitch() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    updateThemeToggleUI();
    toggle.addEventListener('click', () => {
        applyTheme(currentTheme === THEMES.CUTE ? THEMES.NEON : THEMES.CUTE);
        updateTransactionsList();
        updateExpenseCharts();
        updateBalance();
        const budgets = JSON.parse(localStorage.getItem('categoryBudgets')) || {};
        if (typeof updateBudgetUI === 'function') updateBudgetUI(budgets);
    });
}

applyTheme(currentTheme, false);
