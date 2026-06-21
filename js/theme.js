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
    food: { color: '#ad96ff', bg: '#f1edff', gradient: 'linear-gradient(90deg, #9b7cff, #ad96ff, #d8ceff)' },
    rent: { color: '#ff7394', bg: '#ffe8ee', gradient: 'linear-gradient(90deg, #ff4f7b, #ff7394, #ffb3c4)' },
    mortgage: { color: '#ffc66f', bg: '#fff3df', gradient: 'linear-gradient(90deg, #ffb547, #ffc66f, #ffe2ad)' },
    transport: { color: '#70b8ff', bg: '#e8f4ff', gradient: 'linear-gradient(90deg, #45a3ff, #70b8ff, #b8ddff)' },
    subscription: { color: '#56e0d5', bg: '#e5faf8', gradient: 'linear-gradient(90deg, #28d6c8, #56e0d5, #a9f1eb)' },
    daily: { color: '#ff9850', bg: '#fff0e5', gradient: 'linear-gradient(90deg, #ff7a1a, #ff9850, #ffc79d)' },
    cat: { color: '#72e69a', bg: '#e8f9ee', gradient: 'linear-gradient(90deg, #4ade80, #72e69a, #b9f2cc)' },
    entertainment: { color: '#df82ff', bg: '#f7eaff', gradient: 'linear-gradient(90deg, #d65cff, #df82ff, #efbdff)' },
    gf: { color: '#ff82c5', bg: '#ffe9f5', gradient: 'linear-gradient(90deg, #ff5ab3, #ff82c5, #ffbadc)' },
    shopping: { color: '#ff6b80', bg: '#ffe8ec', gradient: 'linear-gradient(90deg, #ff3d5a, #ff6b80, #ffadb9)' },
    investment: { color: '#62dfff', bg: '#e6faff', gradient: 'linear-gradient(90deg, #2dd4ff, #62dfff, #b2efff)' },
    salary: { color: '#57d582', bg: '#e7f8ed', gradient: 'linear-gradient(90deg, #22c55e, #57d582, #afeac4)' },
    bonus: { color: '#fbd94f', bg: '#fff8da', gradient: 'linear-gradient(90deg, #facc15, #fbd94f, #fdec9d)' },
    invest: { color: '#68cdfa', bg: '#e8f7fe', gradient: 'linear-gradient(90deg, #38bdf8, #68cdfa, #b3e6fc)' },
    gift: { color: '#baa5fb', bg: '#f2eeff', gradient: 'linear-gradient(90deg, #a78bfa, #baa5fb, #ddd3fd)' },
    parttime: { color: '#4ccbbe', bg: '#e5f7f5', gradient: 'linear-gradient(90deg, #14b8a6, #4ccbbe, #a6e5de)' },
    other: { color: '#c4cada', bg: '#f0f2f6', gradient: 'linear-gradient(90deg, #b4bdcf, #c4cada, #e2e5ec)' }
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
        if (typeof renderQuickAddButtons === 'function') renderQuickAddButtons();
        const budgets = JSON.parse(localStorage.getItem('categoryBudgets')) || {};
        if (typeof updateBudgetUI === 'function') updateBudgetUI(budgets);
    });
}

applyTheme(currentTheme, false);
