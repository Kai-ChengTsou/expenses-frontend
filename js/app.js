// App version
const APP_VERSION = Date.now();

// ===== LOCAL STORAGE KEYS =====
const STORAGE_KEYS = {
    TRANSACTIONS: 'tommy_expenses_transactions',
    INCOME: 'tommy_expenses_income',
    SUBSCRIPTIONS: 'tommy_expenses_subscriptions',
    THEME: 'tommy_expense_theme'
};

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

function syncAppViewportHeight() {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    if (!viewportHeight) return;
    document.documentElement.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
}

syncAppViewportHeight();
window.addEventListener('resize', syncAppViewportHeight);
window.addEventListener('orientationchange', () => {
    setTimeout(syncAppViewportHeight, 250);
});
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncAppViewportHeight);
    window.visualViewport.addEventListener('scroll', syncAppViewportHeight);
}

applyTheme(currentTheme, false);

// Global variables for delete functionality
let isDeleteMode = false;
let transactionData = []; // Store transaction data for deletion
let incomeData = []; // Store income data
let isIncomeDeleteMode = false;
let isSubscriptionDeleteMode = false;
let subscriptionData = []; // Store subscription data for deletion
let deleteCallback = null; // Store the function to call when delete is confirmed
let currentView = 'transactions'; // 'transactions' or 'subscriptions'
let editingTransaction = null; // Tracks the transaction currently being edited in the calculator modal

// Calculator Logic Variables
let currentCalcAmount = '0';
let currentCalcType = 'expense'; // 'expense' or 'income'
let currentCalcDate = new Date();
let selectedCategoryId = null;
let currentSubscriptionAmount = '0';
let lockedScrollY = 0;

// Month Selector Variables
let selectedMonth = new Date().getMonth() + 1; // 1-12
let selectedYear = new Date().getFullYear();     // e.g., 2026

// ===== LOCAL STORAGE UTILITIES =====
function getLocalStorageTransactions() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error reading transactions from localStorage:', e);
        return [];
    }
}

function getLocalStorageIncome() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.INCOME);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error reading income from localStorage:', e);
        return [];
    }
}

function saveLocalStorageTransactions(data) {
    try {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving transactions to localStorage:', e);
    }
}

function saveLocalStorageIncome(data) {
    try {
        localStorage.setItem(STORAGE_KEYS.INCOME, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving income to localStorage:', e);
    }
}

function getLocalSubscriptions() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error reading subscriptions from localStorage:', e);
        return [];
    }
}

function saveLocalSubscriptions(data) {
    try {
        localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving subscriptions to localStorage:', e);
    }
}


// Categories Config
const EXPENSE_CATEGORIES = [
    { id: 'food', label: '食物', icon: 'fas fa-utensils', color: '#9b7cff', bg: '#2a2441', gradient: 'linear-gradient(90deg, #7c3aed, #9b7cff, #c4b5fd)' },
    { id: 'rent', label: '租房', icon: 'fas fa-home', color: '#ff4f7b', bg: '#3a1f2b', gradient: 'linear-gradient(90deg, #e11d48, #ff4f7b, #fb7185)' },
    { id: 'mortgage', label: '房貸', icon: 'fas fa-building', color: '#ffb547', bg: '#3a2a16', gradient: 'linear-gradient(90deg, #d97706, #ffb547, #fde68a)' },
    { id: 'transport', label: '交通', icon: 'fas fa-bus', color: '#45a3ff', bg: '#182e49', gradient: 'linear-gradient(90deg, #2563eb, #45a3ff, #7dd3fc)' },
    { id: 'subscription', label: '訂閱', icon: 'fas fa-calendar-check', color: '#28d6c8', bg: '#123838', gradient: 'linear-gradient(90deg, #0f766e, #28d6c8, #99f6e4)' },
    { id: 'daily', label: '日常用品', icon: 'fas fa-shopping-basket', color: '#ff7a1a', bg: '#3d2110', gradient: 'linear-gradient(90deg, #ea580c, #ff7a1a, #fdba74)' },
    { id: 'cat', label: '貓咪', icon: 'fas fa-paw', color: '#4ade80', bg: '#183824', gradient: 'linear-gradient(90deg, #16a34a, #4ade80, #bbf7d0)' },
    { id: 'entertainment', label: '娛樂', icon: 'fas fa-gamepad', color: '#d65cff', bg: '#351d42', gradient: 'linear-gradient(90deg, #a21caf, #d65cff, #f0abfc)' },
    { id: 'gf', label: '女友', icon: 'fas fa-heart', color: '#ff5ab3', bg: '#3b1f35', gradient: 'linear-gradient(90deg, #db2777, #ff5ab3, #f9a8d4)' },
    { id: 'shopping', label: '購物', icon: 'fas fa-shopping-bag', color: '#ff3d5a', bg: '#3c1b24', gradient: 'linear-gradient(90deg, #b91c1c, #ff3d5a, #fca5a5)' },
    { id: 'investment', label: '投資', icon: 'fas fa-chart-line', color: '#2dd4ff', bg: '#143240', gradient: 'linear-gradient(90deg, #0284c7, #2dd4ff, #67e8f9)' },
    { id: 'other', label: '其他', icon: 'fas fa-box', color: '#b4bdcf', bg: '#252b3a', gradient: 'linear-gradient(90deg, #64748b, #b4bdcf, #e2e8f0)' }
];

const INCOME_CATEGORIES = [
    { id: 'salary', label: '薪水', icon: 'fas fa-money-bill-wave', color: '#22c55e', bg: '#153821' },
    { id: 'bonus', label: '獎金', icon: 'fas fa-star', color: '#facc15', bg: '#3a3210' },
    { id: 'invest', label: '投資', icon: 'fas fa-chart-line', color: '#38bdf8', bg: '#143247' },
    { id: 'gift', label: '禮金', icon: 'fas fa-gift', color: '#a78bfa', bg: '#2d2545' },
    { id: 'parttime', label: '兼職', icon: 'fas fa-briefcase', color: '#14b8a6', bg: '#123633' },
    { id: 'other', label: '其他', icon: 'fas fa-box', color: '#cbd5e1', bg: '#273040' }
];

function getCategoryVisualStyle(category) {
    if (!category) return '';
    const themedCategory = getThemedCategory(category);
    return `--category-color: ${themedCategory.color}; --category-bg: ${themedCategory.bg};`;
}

function getThemedCategory(category) {
    if (!category) return null;
    const cute = CUTE_CATEGORY_OVERRIDES[category.id];
    if (currentTheme === THEMES.CUTE && cute) {
        return {
            ...category,
            color: cute.color,
            bg: cute.bg,
            gradient: cute.gradient || category.gradient
        };
    }
    return category;
}

function findCategoryConfig(categoryValue, isIncome = false) {
    const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    return categories.find(c => c.label === categoryValue || c.id === categoryValue);
}


// Main function to load data from localStorage only
async function fetchExpenseData() {
    try {
        // Load from localStorage
        transactionData = getLocalStorageTransactions() || [];
        incomeData = getLocalStorageIncome() || [];
        
        // Update UI with cached data
        updateTransactionsList();
        updateExpenseCharts();
        updateBalance();
        
        return Promise.resolve({ success: true });
    } catch (error) {
        console.error('Error in fetchExpenseData:', error);
        
        // Load from localStorage as fallback
        transactionData = getLocalStorageTransactions() || [];
        incomeData = getLocalStorageIncome() || [];
        
        try {
            updateTransactionsList();
            updateExpenseCharts();
            updateBalance();
        } catch (updateError) {
            console.error('Error updating UI:', updateError);
        }
        
        return Promise.resolve({ success: true, fromCache: true });
    }
}

// Function to fetch income data (now just loads from localStorage)
async function fetchIncomeData() {
    incomeData = getLocalStorageIncome() || [];
    return Promise.resolve({ rows: [] });
}

// Helper function to parse CSV (Robust standard compliant)
function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentVal = '';
    let inQuotes = false;
    
    // Remove BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i+1];
        
        if (inQuotes) {
            if (char === '"') {
                if (nextChar === '"') {
                    currentVal += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = false;
                }
            } else {
                currentVal += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentVal);
                currentVal = '';
            } else if (char === '\n' || char === '\r') {
                // Handle line break
                if (char === '\r' && nextChar === '\n') i++; // Skip \n in \r\n
                
                currentRow.push(currentVal);
                rows.push(currentRow);
                currentRow = [];
                currentVal = '';
            } else {
                currentVal += char;
            }
        }
    }
    
    // Add last row if there's remaining data
    if (currentRow.length > 0 || currentVal !== '') {
        currentRow.push(currentVal);
        rows.push(currentRow);
    }
    
    // Filter out empty rows (except if they are genuinely empty cells in a row)
    return rows.filter(row => row.length > 1 || (row.length === 1 && row[0] !== ''));
}

// Normalize sheet date to local YYYY-MM-DD (avoids UTC shift from Google Sheets JSON)
function toLocalDateKey(dateVal) {
    if (dateVal == null || dateVal === '') return '';
    const s = String(dateVal).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return s;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Function to update the unified transaction list
function updateTransactionsList() {
    const container = document.getElementById('transaction-list-container');
    if (!container) return;
    
    // Combine expense and income data
    const allTransactions = [
        ...transactionData,
        ...incomeData
    ];
    
    // Filter by selected month/year
    const filteredTransactions = allTransactions.filter(t => {
        const key = toLocalDateKey(t.date);
        if (!key) return false;
        const [y, mo] = key.split('-').map(Number);
        return mo === selectedMonth && y === selectedYear;
    });
    
    if (filteredTransactions.length === 0) {
        container.innerHTML = `
            <div class="empty-subscriptions" style="text-align:center; padding: 40px; color: var(--text-secondary);">
                <i class="fas fa-receipt" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>No transactions found for this month.</p>
            </div>
        `;
        return;
    }
    
    // Sort by date descending (use local date key for consistent order)
    filteredTransactions.sort((a, b) => {
        const keyA = toLocalDateKey(a.date);
        const keyB = toLocalDateKey(b.date);
        if (keyA !== keyB) return keyB.localeCompare(keyA);
        return 0;
    });
    
    // Group by Date (use local calendar date so sheet date matches display)
    const grouped = {};
    filteredTransactions.forEach(t => {
        const dateStr = toLocalDateKey(t.date);
        if (!dateStr) return;
        if (!grouped[dateStr]) grouped[dateStr] = [];
        grouped[dateStr].push(t);
    });
    
    // Generate HTML
    let html = '';
    
    // Sort keys (dates) descending
    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
    
    sortedDates.forEach(dateKey => {
        const transactions = grouped[dateKey];
        
        // Calculate Daily Total (Income - Expense)
        let dailyTotal = 0;
        transactions.forEach(t => {
            // Clean amount string before parsing
            const cleanAmount = String(t.amount).replace(/[^0-9.-]+/g, '');
            const amount = parseFloat(cleanAmount);
            if (!isNaN(amount)) {
                // Since expenses are negative and income is positive, just sum them up
                dailyTotal += amount;
            }
        });
        
        // Format Date Header (e.g. 2026/02/09 星期一) — parse as local date so it matches sheet
        const [y, mo, d] = dateKey.split('-').map(Number);
        const dateObj = new Date(y, mo - 1, d);
        const dateDisplay = dateObj.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' });
        
        // Format Total
        const fmtMoney = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
        const totalFormatted = fmtMoney(dailyTotal);
        
        const totalClass = dailyTotal >= 0 ? 'positive' : 'negative';
        
        html += `
            <div class="transaction-day-card">
                <div class="day-header">
                    <span class="day-date">${dateDisplay}</span>
                    <span class="day-total ${totalClass}">${totalFormatted}</span>
                </div>
                <div class="transaction-list">
        `;
        
        transactions.forEach(t => {
            const isIncome = t.type === 'income';
            
            // Clean amount string before parsing
            const cleanAmount = String(t.amount).replace(/[^0-9.-]+/g, '');
            const amountVal = parseFloat(cleanAmount);
            
            let amountDisplay;
            if (isNaN(amountVal)) {
                amountDisplay = t.amount; // Fallback to original string
            } else {
                // Format with sign
                const sign = isIncome ? '+' : '-';
                const absVal = Math.abs(amountVal);
                amountDisplay = `${sign}$${Math.round(absVal).toLocaleString()}`;
            }
            
            const amountClass = isIncome ? 'amount-positive' : 'amount-negative';
            
            // Get Icon and Color
            let iconClass = 'fas fa-question';
            let catConfig = findCategoryConfig(t.category, isIncome);
            if (catConfig) iconClass = catConfig.icon;
            
            html += `
                <div class="transaction-item" data-transaction-id="${t.index}" role="button" tabindex="0" aria-label="Edit transaction">
                    <div class="trans-icon-wrapper" style="${getCategoryVisualStyle(catConfig)}">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="trans-content">
                        <span class="trans-category">${t.category}</span>
                        ${(t.description && String(t.description).trim() !== '') ? `<span class="trans-desc">${t.description}</span>` : ''}
                    </div>
                    <span class="trans-amount ${amountClass}">${amountDisplay}</span>
                    
                    <div class="trans-delete-wrapper">
                        <button class="list-delete-btn" data-row-index="${t.index}" data-sheet="Expenses">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Apply delete mode class if active
    if (isDeleteMode) {
        container.classList.add('delete-mode');
    } else {
        container.classList.remove('delete-mode');
    }
    
    setupDeleteButtons();
    setupTransactionEditHandlers();
    setupTransactionSwipeHandlers();
}

function setupTransactionEditHandlers() {
    document.querySelectorAll('.transaction-item[data-transaction-id]').forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.dataset.skipClick === 'true') {
                item.dataset.skipClick = 'false';
                return;
            }
            if (isDeleteMode) return;
            if (e.target.closest('.list-delete-btn')) return;
            if (item.classList.contains('swipe-revealed')) {
                closeTransactionSwipeItem(item);
                return;
            }
            openEditTransaction(item.dataset.transactionId);
        });

        item.addEventListener('keydown', (e) => {
            if (isDeleteMode) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEditTransaction(item.dataset.transactionId);
            }
        });
    });
}

function setupTransactionSwipeHandlers() {
    document.querySelectorAll('.transaction-item[data-transaction-id]').forEach(item => {
        let startX = 0;
        let startY = 0;
        let latestX = 0;
        let startTranslateX = 0;
        let latestTranslateX = 0;
        let isDragging = false;
        let isHorizontalSwipe = false;

        item.addEventListener('pointerdown', (e) => {
            if (isDeleteMode || e.target.closest('.list-delete-btn')) return;
            startX = e.clientX;
            startY = e.clientY;
            latestX = e.clientX;
            startTranslateX = item.classList.contains('swipe-revealed') ? -64 : 0;
            latestTranslateX = startTranslateX;
            isDragging = true;
            isHorizontalSwipe = false;
            closeOtherSwipedTransactions(item);
            item.setPointerCapture?.(e.pointerId);
        });

        item.addEventListener('pointermove', (e) => {
            if (!isDragging || isDeleteMode) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            if (!isHorizontalSwipe && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
                isHorizontalSwipe = true;
            }

            if (!isHorizontalSwipe) return;

            latestX = e.clientX;
            item.classList.add('swiping');
            item.classList.remove('swipe-revealed');
            const translateX = Math.max(Math.min(startTranslateX + deltaX, 0), -76);
            latestTranslateX = translateX;
            item.style.transform = `translateX(${translateX}px)`;
            item.dataset.skipClick = 'true';
            e.preventDefault();
        });

        item.addEventListener('pointerup', () => finishTransactionSwipe(item));
        item.addEventListener('pointercancel', () => finishTransactionSwipe(item));

        function finishTransactionSwipe(currentItem) {
            if (!isDragging) return;

            const deltaX = latestX - startX;
            isDragging = false;
            currentItem.classList.remove('swiping');

            if (isHorizontalSwipe && latestTranslateX < -38) {
                openSwipedTransaction(currentItem);
                return;
            }

            if (isHorizontalSwipe || Math.abs(deltaX) > 6) {
                currentItem.dataset.skipClick = 'true';
            }
            closeTransactionSwipeItem(currentItem);
        }
    });
}

function openSwipedTransaction(item) {
    closeOtherSwipedTransactions(item);
    item.classList.remove('swiping');
    item.classList.add('swipe-revealed');
    item.style.transform = '';
    item.dataset.skipClick = 'true';
}

function closeTransactionSwipeItem(item) {
    if (!item) return;
    item.classList.remove('swiping', 'swipe-revealed');
    item.style.transform = '';
}

function closeOtherSwipedTransactions(exceptItem = null) {
    document.querySelectorAll('.transaction-item.swipe-revealed').forEach(item => {
        if (item !== exceptItem) {
            closeTransactionSwipeItem(item);
        }
    });
}

// Function to update expense charts (Refactored to use local transactionData)
async function updateExpenseCharts() {
    // transactionData global already contains the expense items
    if (!transactionData || transactionData.length === 0) {
        createEmptyCharts();
        return;
    }
    
    let totalExpense = 0;
    const categoryTotals = {};
    const monthlyExpenses = {};
    
    transactionData.forEach(item => {
        // item: { date, amount, category, type: 'expense', ... }
        // Ensure it's an expense just in case
        if (item.type !== 'expense') return;
        
        // Clean amount string
        const amountVal = parseFloat(String(item.amount).replace(/[^0-9.-]+/g, ''));
        
        if (!isNaN(amountVal) && amountVal < 0) {
            const absAmount = Math.abs(amountVal);
            totalExpense += absAmount;
            
            // Category
            const category = item.category || 'Uncategorized';
            categoryTotals[category] = (categoryTotals[category] || 0) + absAmount;
            
            // Month
            // Use local date for monthly grouping
            const dateStr = toLocalDateKey(item.date);
            if (dateStr) {
                const [y, mo, d] = dateStr.split('-').map(Number);
                const dateObj = new Date(y, mo - 1, d);
                const monthYear = `${dateObj.toLocaleString('default', { month: 'short' })} ${dateObj.getFullYear()}`;
                monthlyExpenses[monthYear] = (monthlyExpenses[monthYear] || 0) + absAmount;
            }
        }
    });
    
    // Charts only reflect Expenses
    if (Object.keys(monthlyExpenses).length > 0) {
        createMonthlyExpenseChart(monthlyExpenses);
    } else {
        createEmptyMonthlyChart();
    }
    
    if (Object.keys(categoryTotals).length > 0) {
        createCategoryExpenseChart(categoryTotals);
    } else {
        createEmptyCategoryChart();
    }
}


function updateBalance() {
    const parseAmount = (str) => {
        return parseFloat(String(str).replace(/[^0-9.-]+/g, '')) || 0;
    };

    const isSelectedMonth = (dateStr) => {
        try {
            const key = toLocalDateKey(dateStr);
            if (!key) return false;
            const [y, mo] = key.split('-').map(Number);
            return mo === selectedMonth && y === selectedYear;
        } catch (e) { return false; }
    };
    
    let monthlyExpense = 0;
    let monthlyIncome = 0;

    // Calculate totals from both transactionData (expenses) and incomeData (income)
    const allItems = [...transactionData, ...incomeData];
    
    allItems.forEach(item => {
        if (isSelectedMonth(item.date)) {
            const val = parseAmount(item.amount);
            if (val < 0) {
                monthlyExpense += Math.abs(val);
            } else {
                monthlyIncome += val;
            }
        }
    });
    
    const monthlyLeft = monthlyIncome - monthlyExpense;
    
    // Update UI
    const incomeEl = document.getElementById('total-income');
    if (incomeEl) incomeEl.textContent = `$${monthlyIncome.toFixed(2)}`;
    
    const expenseEl = document.getElementById('total-expenses');
    if (expenseEl) expenseEl.textContent = `$${monthlyExpense.toFixed(2)}`;
    
    // Also update total-amount just in case it's still used somewhere
    const totalAmountEl = document.getElementById('total-amount');
    if (totalAmountEl) totalAmountEl.textContent = `$${monthlyExpense.toFixed(2)}`;
    
    const balanceEl = document.getElementById('total-balance');
    if (balanceEl) {
        balanceEl.textContent = `$${monthlyLeft.toFixed(2)}`;
        balanceEl.style.color = monthlyLeft >= 0 ? getCssVar('--success-color', '#4cd964') : getCssVar('--danger-color', '#ff3b30');
    }
}

// Function to create empty charts when no data is available
function createEmptyCharts() {
    createEmptyMonthlyChart();
    createEmptyCategoryChart();
}

// Function to create an empty monthly chart
function createEmptyMonthlyChart() {
    const ctx = document.getElementById('monthly-chart').getContext('2d');
    
    if (window.monthlyChart) {
        window.monthlyChart.destroy();
    }
    
    window.monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['No Data'],
            datasets: [{
                label: 'Monthly Expenses',
                data: [0],
                backgroundColor: getCssVar('--chart-empty-color', 'rgba(14, 165, 233, 0.2)'),
                borderWidth: 0,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: getCssVar('--chart-grid-color', 'rgba(161, 161, 170, 0.4)')
                    },
                    grid: {
                        display: false
                    }
                },
                x: {
                    ticks: {
                        color: getCssVar('--chart-grid-color', 'rgba(161, 161, 170, 0.4)')
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Function to create an empty category chart
function createEmptyCategoryChart() {
    const ctx = document.getElementById('category-chart').getContext('2d');
    
    if (window.categoryChart) {
        window.categoryChart.destroy();
    }
    
    window.categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['No Data'],
            datasets: [{
                data: [1],
                backgroundColor: [getCssVar('--chart-empty-color', 'rgba(14, 165, 233, 0.2)')],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            cutout: '70%'
        }
    });
    
    // Update category insights with empty data
    document.getElementById('highest-category').textContent = '-';
    document.getElementById('average-category').textContent = '-';
    document.getElementById('category-count').textContent = '0';
    
    // Update top categories
    document.getElementById('top-categories').innerHTML = `
        <div class="category-item">
            <div class="category-info">
                <div class="category-name">No categories yet</div>
                <div class="category-amount">$0.00</div>
            </div>
        </div>
    `;
}

// Function to setup delete buttons
function setupDeleteButtons() {
    // Select both types of delete buttons (old table style if any, and new list style)
    const deleteButtons = document.querySelectorAll('.delete-button, .list-delete-btn');
    
    // Define the delete handler function
    function handleDeleteClick(e) {
        e.stopPropagation();
        const rowIndex = this.getAttribute('data-row-index');
        const sheetName = this.getAttribute('data-sheet') || 'Expenses'; // Get sheet name
        
        // Find row/item
        const item = this.closest('.transaction-item') || this.closest('tr');
        
        if (item) {
            let date, amount, category, description;
            
            if (item.classList.contains('transaction-item')) {
                // New List View
                // Date is in the header of the parent card
                const dayCard = item.closest('.transaction-day-card');
                date = dayCard ? dayCard.querySelector('.day-date').textContent : 'N/A';
                amount = item.querySelector('.trans-amount').textContent;
                category = item.querySelector('.trans-category').textContent;
                description = item.querySelector('.trans-desc') ? item.querySelector('.trans-desc').textContent : '';
            } else {
                // Old Table View
                const cells = item.querySelectorAll('td');
                date = cells[1].textContent;
                amount = cells[2].textContent;
                category = cells[3].textContent;
                description = cells[4].textContent;
            }
            
            // Open the cute delete confirmation modal
            openDeleteModal({
                date,
                amount,
                category,
                description
            }, () => {
                // The actual delete logic to run when confirmed
                
                // Optimistic UI: Remove immediately from local view
                const indexToRemove = parseInt(rowIndex);
                // Note: The logic for finding the exact item in array based on rowIndex is tricky if not synced.
                // However, we can simply hide the DOM element and update totals based on the value we parsed.
                
                // 1. Hide the item visually
                if (item) {
                    item.style.transition = 'all 0.3s ease';
                    item.style.opacity = '0';
                    item.style.height = '0';
                    item.style.padding = '0';
                    item.style.margin = '0';
                    setTimeout(() => item.remove(), 300);
                }
                
                // 2. Remove from local data to update totals
                // Use filter to remove by index (approximate match) or exact object ref if possible
                // Since we don't have object ref here easily, we'll try to find by index
                // Wait, removing by index is safer if we know the array. 
                // But transactionData holds both.
                // Let's just update the array by filtering out this specific item if possible.
                // Or simpler: Just re-fetch silently. 
                // BUT user wants smooth UI.
                
                // Let's manually subtract the amount from totals?
                // Actually, filtering transactionData is safer.
                if (sheetName === 'Expenses') { // Expenses sheet
                     // Try to remove from transactionData or incomeData based on rowIndex
                     // Note: row indices in data are 1-based (from sheet). 
                     // item.index stores this.
                     const idx = parseInt(rowIndex);
                     // Find and remove
                     let removed = false;
                     // Look in transactionData
                     const tIdx = transactionData.findIndex(t => t.index == idx);
                     if (tIdx > -1) { transactionData.splice(tIdx, 1); removed = true; }
                     // Look in incomeData
                     if (!removed) {
                         const iIdx = incomeData.findIndex(t => t.index == idx);
                         if (iIdx > -1) { incomeData.splice(iIdx, 1); }
                     }
                     
                     // Update Charts, Balance, and Transaction List with new data
                     updateBalance();
                     updateExpenseCharts();
                     updateTransactionsList();
                }

                // Close modal immediately
                closeDeleteModal();
                
                // Show "Deleting" status quietly
                const statusMsg = document.getElementById('status-message');
                if (statusMsg) statusMsg.textContent = 'Deleted locally';
                
                // Save updated state to localStorage
                if (sheetName === 'Expenses') {
                    saveLocalStorageTransactions(transactionData);
                    saveLocalStorageIncome(incomeData);
                }
                
                // Close modal immediately
                closeDeleteModal();
                
                // Delete from Google Sheet in background (async, no wait)
                const actualRowIndex = parseInt(rowIndex) + 1;
                deleteTransactionFromSheet(actualRowIndex, sheetName)
                    .then(() => {
                        if (statusMsg && statusMsg.textContent === 'Deleted locally') {
                            statusMsg.textContent = 'Synced';
                            setTimeout(() => {
                                if (statusMsg && statusMsg.textContent === 'Synced') statusMsg.textContent = '';
                            }, 2000);
                        }
                        
                    })
                    .catch(error => {
                        console.error('Background delete sync error (will retry at midnight):', error);
                        if (statusMsg && statusMsg.textContent === 'Deleted locally') {
                            statusMsg.textContent = 'Deleted (sync at midnight)';
                            setTimeout(() => {
                                if (statusMsg && statusMsg.textContent === 'Deleted (sync at midnight)') statusMsg.textContent = '';
                            }, 3000);
                        }
                    });
            });
        }
    }
    
    // Remove existing event listeners and add new ones
    deleteButtons.forEach(button => {
        // First remove any existing click listeners by cloning the node
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add the event listener to the new button
        newButton.addEventListener('click', handleDeleteClick);
    });
}

// Function to setup and handle the Delete Modal
function setupDeleteModal() {
    const modal = document.getElementById('delete-modal');
    const cancelBtn = document.getElementById('cancel-delete-btn');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeDeleteModal);
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (deleteCallback && typeof deleteCallback === 'function') {
                deleteCallback();
            }
        });
    }
    
    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeDeleteModal();
        }
    });
}

function openDeleteModal(data, onConfirm) {
    const modal = document.getElementById('delete-modal');
    if (!modal) return;
    
    // Note: We removed the detail fields (del-date, del-amount, etc.) 
    // based on the request for a simpler pop-up. 
    // We only need to store the callback now.
    
    // Store callback
    deleteCallback = onConfirm;
    
    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    deleteCallback = null;
}

// Function to delete transaction from localStorage
async function deleteTransactionFromSheet(rowIndex, type = 'expense') {
    try {
        console.log('Deleting transaction at index:', rowIndex);
        
        if (type === 'income') {
            const incomeList = getLocalStorageIncome();
            const indexToDelete = incomeList.findIndex(item => item.index == rowIndex);
            if (indexToDelete !== -1) {
                incomeList.splice(indexToDelete, 1);
                saveLocalStorageIncome(incomeList);
            }
        } else {
            const transactionList = getLocalStorageTransactions();
            const indexToDelete = transactionList.findIndex(item => item.index == rowIndex);
            if (indexToDelete !== -1) {
                transactionList.splice(indexToDelete, 1);
                saveLocalStorageTransactions(transactionList);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error deleting transaction from localStorage:', error);
        throw error;
    }
}

// Function to create the monthly expense chart
function createMonthlyExpenseChart(monthlyExpenses) {
    const ctx = document.getElementById('monthly-chart').getContext('2d');
    const themeMeta = THEME_META[currentTheme];
    
    // Sort months chronologically
    const sortedMonths = Object.keys(monthlyExpenses).sort((a, b) => {
        const monthA = new Date(a);
        const monthB = new Date(b);
        return monthA - monthB;
    });
    
    const chartData = {
        labels: sortedMonths,
        datasets: [{
            label: 'Monthly Expenses',
            data: sortedMonths.map(month => monthlyExpenses[month]),
            backgroundColor: function(context) {
                const chart = context.chart;
                const {ctx, chartArea} = chart;
                if (!chartArea) return null;
                
                const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                gradient.addColorStop(0, themeMeta.monthlyGradient[0]);
                gradient.addColorStop(1, themeMeta.monthlyGradient[1]);
                return gradient;
            },
            borderWidth: 0,
            borderRadius: 6,
            barThickness: 16
        }]
    };
    
    if (window.monthlyChart) {
        window.monthlyChart.destroy();
    }
    
    window.monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: getCssVar('--tooltip-background', 'rgba(28, 31, 38, 0.9)'),
                    titleColor: getCssVar('--tooltip-text-color', '#ffffff'),
                    bodyColor: getCssVar('--tooltip-text-color', '#ffffff'),
                    borderColor: getCssVar('--border-color', 'rgba(14, 165, 233, 0.3)'),
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `$${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: getCssVar('--chart-label-color', 'rgba(161, 161, 170, 0.8)'),
                        font: {
                            family: 'Inter',
                            size: 10
                        },
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: getCssVar('--chart-label-color', 'rgba(161, 161, 170, 0.8)'),
                        font: {
                            family: 'Inter',
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

// Function to create the category expense chart
function createCategoryExpenseChart(categoryTotals) {
    const ctx = document.getElementById('category-chart').getContext('2d');
    
    // Sort categories by amount (descending)
    const sortedCategories = Object.keys(categoryTotals).sort((a, b) => 
        categoryTotals[b] - categoryTotals[a]
    );
    
    const colors = THEME_META[currentTheme].categoryChartColors;
    
    // Create a color mapping for categories to ensure consistency
    const categoryColorMap = {};
    sortedCategories.forEach((category, index) => {
        categoryColorMap[category] = colors[index % colors.length];
    });
    
    const chartData = {
        labels: sortedCategories,
        datasets: [{
            data: sortedCategories.map(category => categoryTotals[category]),
            backgroundColor: sortedCategories.map(category => categoryColorMap[category]),
            borderWidth: 2,
            borderColor: getCssVar('--chart-border-color', '#0f1115'),
            hoverOffset: 8,
            hoverBorderWidth: 0
        }]
    };
    
    if (window.categoryChart) {
        window.categoryChart.destroy();
    }
    
    window.categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getCssVar('--chart-label-color', 'rgba(161, 161, 170, 0.8)'),
                        padding: 15,
                        font: {
                            family: 'Inter',
                            size: 11
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: getCssVar('--tooltip-background', 'rgba(28, 31, 38, 0.9)'),
                    titleColor: getCssVar('--tooltip-text-color', '#ffffff'),
                    bodyColor: getCssVar('--tooltip-text-color', '#ffffff'),
                    borderColor: getCssVar('--border-color', 'rgba(14, 165, 233, 0.3)'),
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: $${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
    
    // Update Top Categories section
    updateTopCategories(sortedCategories, categoryTotals, categoryColorMap);
    
    // Update Category Insights
    updateCategoryInsights(categoryTotals);
}

// Function to update the Top Categories section
function updateTopCategories(sortedCategories, categoryTotals, categoryColorMap) {
    const topCategoriesElement = document.getElementById('top-categories');
    const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
    
    // Take top 5 categories
    const topCategories = sortedCategories.slice(0, 5);
    
    if (topCategories.length === 0) {
        topCategoriesElement.innerHTML = '<div class="category-loading">No category data available</div>';
        return;
    }
    
    let topCategoriesHTML = '';
    
    topCategories.forEach(category => {
        const amount = categoryTotals[category];
        const percentage = ((amount / totalExpenses) * 100).toFixed(1);
        const color = categoryColorMap[category];
        
        topCategoriesHTML += `
            <div class="category-item">
                <div class="category-info">
                    <div class="category-color" style="background-color: ${color}"></div>
                    <div class="category-name">${category}</div>
                </div>
                <div class="category-amount">
                    $${amount.toFixed(2)}
                    <span class="category-percentage">${percentage}%</span>
                </div>
            </div>
        `;
    });
    
    topCategoriesElement.innerHTML = topCategoriesHTML;
}

// Function to update the Category Insights
function updateCategoryInsights(categoryTotals) {
    const categories = Object.keys(categoryTotals);
    const amounts = Object.values(categoryTotals);
    
    if (categories.length === 0) {
        document.getElementById('highest-category').textContent = '-';
        document.getElementById('average-category').textContent = '-';
        document.getElementById('category-count').textContent = '-';
        return;
    }
    
    // Highest spending category
    const highestAmount = Math.max(...amounts);
    const highestCategory = categories.find(cat => categoryTotals[cat] === highestAmount);
    document.getElementById('highest-category').textContent = `${highestCategory} ($${highestAmount.toFixed(2)})`;
    
    // Average per category
    const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
    const averageAmount = totalAmount / categories.length;
    document.getElementById('average-category').textContent = `$${averageAmount.toFixed(2)}`;
    
    // Categories count
    document.getElementById('category-count').textContent = categories.length.toString();
}

// Add to Home Screen functionality
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Create and show the Add to Home button
    const addToHomeBtn = document.createElement('button');
    addToHomeBtn.className = 'add-to-home';
    addToHomeBtn.innerHTML = '+';
    addToHomeBtn.title = 'Add to Home Screen';
    document.body.appendChild(addToHomeBtn);
    
    addToHomeBtn.addEventListener('click', () => {
        // Show the install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            // Clear the saved prompt since it can't be used again
            deferredPrompt = null;
            
            // Hide the button
            addToHomeBtn.classList.add('hidden');
        });
    });
});

// Initialize the app
window.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Initializing app...');
        syncAppViewportHeight();
        
        // Hide all modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Initialize sections
        console.log('Initializing sections...');
        initializeSections();
        
        // Setup delete modal
        console.log('Setting up delete modal...');
        setupDeleteModal();
        
        // Setup navigation
        console.log('Setting up navigation...');
        setupNavigation();

        // Setup theme switch
        console.log('Setting up theme switch...');
        setupThemeSwitch();
        
        // Add ripple effect to buttons
        console.log('Adding ripple effects...');
        document.querySelectorAll('.btn-primary, .btn-secondary, .btn-danger').forEach(button => {
            button.addEventListener('click', createRipple);
        });
        
        // Setup transaction modal (New Calculator)
        console.log('Setting up calculator modal...');
        setupCalculatorModal();
        
        // Replace old button listeners
        const addTransBtn = document.getElementById('add-transaction-btn');
        if (addTransBtn) {
            // Clone to remove old listeners
            const newBtn = addTransBtn.cloneNode(true);
            addTransBtn.parentNode.replaceChild(newBtn, addTransBtn);
            newBtn.addEventListener('click', () => openCalculatorModal('expense'));
        }
        
        // Add Income Button (Removed from UI but keeping check just in case)
        const addIncomeBtn = document.getElementById('add-income-btn');
        if (addIncomeBtn) {
            const newBtn = addIncomeBtn.cloneNode(true);
            addIncomeBtn.parentNode.replaceChild(newBtn, addIncomeBtn);
            newBtn.addEventListener('click', () => openCalculatorModal('income'));
        }
        
        // Setup delete mode
        console.log('Setting up delete mode...');
        setupDeleteMode();
        
        // Setup refresh button
        console.log('Setting up refresh button...');
        setupRefreshButton();
        
        // Setup Quick Add Buttons
        console.log('Setting up quick add...');
        setupQuickAdd();
        
        // Setup Subscription Management
        console.log('Setting up subscription management...');
        setupSubscriptionManagement();
        
        // Setup Budget Logic
        console.log('Setting up budget section...');
        setupBudgetSection();
        
        // Setup Month Selector
        console.log('Setting up month selector...');
        setupMonthSelector();
        
        // Create empty charts initially
        console.log('Creating empty charts...');
        createEmptyCharts();
        
        // Fetch expense data from Google Sheet
        console.log('Fetching expense data...');
        await fetchExpenseData();
        
        // Fetch income data
        console.log('Fetching income data...');
        await fetchIncomeData();
        
        // Sync scheduling removed - app now works entirely offline with localStorage
        
        // Setup export to Excel button
        console.log('Setting up export button...');
        setupExportButton();
        
        console.log('App initialization complete!');
        
    } catch (error) {
        console.error('Error initializing app:', error);
        const statusMsg = document.getElementById('status-message');
        if (statusMsg) statusMsg.textContent = 'Error loading app';
    }

// --- EXPORT TO EXCEL FUNCTION ---

// Small helper to flash a message in the status bar
function showStatusMessage(text, duration = 2500) {
    const statusMsg = document.getElementById('status-message');
    if (statusMsg) {
        statusMsg.textContent = text;
        if (duration > 0) {
            setTimeout(() => { statusMsg.textContent = ''; }, duration);
        }
    }
}

function exportToExcel() {
    try {
        if (typeof XLSX === 'undefined') {
            showStatusMessage('Excel library not loaded. Check your connection.');
            return;
        }

        // Get all data from localStorage
        const transactions = getLocalStorageTransactions() || [];
        const income = getLocalStorageIncome() || [];
        const subscriptions = getLocalSubscriptions() || [];

        // Combine expenses and income, newest first
        const allTransactions = [...transactions, ...income];
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Build one clean row per transaction
        const txRows = allTransactions.map(item => ({
            Date: item.date || '',
            Type: item.type || 'expense',
            Category: item.category || '',
            Amount: Number(item.amount) || 0,
            Description: item.description || ''
        }));

        const wb = XLSX.utils.book_new();

        const txHeader = ['Date', 'Type', 'Category', 'Amount', 'Description'];
        const txSheet = XLSX.utils.json_to_sheet(txRows, { header: txHeader });
        txSheet['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 32 }];
        XLSX.utils.book_append_sheet(wb, txSheet, 'Transactions');

        // Subscriptions on their own sheet (columns match the app's real schema)
        const subRows = subscriptions.map(sub => ({
            Name: sub.name || sub.service || '',
            Amount: Number(sub.amount ?? sub.price) || 0,
            'Payment Method': sub.payment || sub.paymentMethod || sub.account || '',
            'Billing Day': sub.billingDate ?? sub.nextPaymentDate ?? ''
        }));
        const subHeader = ['Name', 'Amount', 'Payment Method', 'Billing Day'];
        const subSheet = XLSX.utils.json_to_sheet(subRows, { header: subHeader });
        subSheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, subSheet, 'Subscriptions');

        // Category budgets on their own sheet
        const categoryBudgets = JSON.parse(localStorage.getItem('categoryBudgets')) || {};
        const budgetRows = EXPENSE_CATEGORIES
            .filter(cat => Number(categoryBudgets[cat.id]) > 0)
            .map(cat => ({
                'Category ID': cat.id,
                Category: cat.label,
                Budget: Number(categoryBudgets[cat.id]) || 0
            }));
        const budgetHeader = ['Category ID', 'Category', 'Budget'];
        const budgetSheet = XLSX.utils.json_to_sheet(budgetRows, { header: budgetHeader });
        budgetSheet['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, budgetSheet, 'Budgets');

        // Filename with current date
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        XLSX.writeFile(wb, `Tommy_Expense_Export_${dateStr}.xlsx`);

        showStatusMessage(`Exported ${txRows.length} transactions!`);
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showStatusMessage('Export failed');
    }
}

// Read an uploaded Excel/CSV file and merge its rows into localStorage
function importFromExcel(file) {
    if (!file) return;

    if (typeof XLSX === 'undefined') {
        showStatusMessage('Excel library not loaded. Check your connection.');
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: 'array', cellDates: true });

            if (!wb.SheetNames.length) {
                showStatusMessage('That file has no data');
                return;
            }

            // --- Transactions / Income ---
            const txSheetName = wb.SheetNames.find(n => /transaction|income|expense/i.test(n)) || wb.SheetNames[0];
            const txRows = XLSX.utils.sheet_to_json(wb.Sheets[txSheetName], { defval: '' });

            const existingTx = getLocalStorageTransactions() || [];
            const existingInc = getLocalStorageIncome() || [];

            const txSignature = t => `${t.date}|${t.amount}|${t.category}|${t.description}|${t.type}`;
            const seenTx = new Set([...existingTx, ...existingInc].map(txSignature));

            let importedCount = 0;
            let uid = Date.now();

            txRows.forEach(row => {
                const date = toLocalDateKey(row.Date ?? row.date ?? '');
                const amount = parseFloat(row.Amount ?? row.amount) || 0;
                const category = String(row.Category ?? row.category ?? '').trim();
                const description = String(row.Description ?? row.description ?? '').trim();
                let type = String(row.Type ?? row.type ?? 'expense').trim().toLowerCase();
                if (type !== 'income') type = 'expense';

                // Skip blank rows
                if (!date && !amount && !category && !description) return;

                const entry = { index: uid++, date, amount, category, description, type };
                const sig = txSignature(entry);
                if (seenTx.has(sig)) return; // skip duplicates already in memory
                seenTx.add(sig);

                if (type === 'income') existingInc.push(entry);
                else existingTx.push(entry);
                importedCount++;
            });

            saveLocalStorageTransactions(existingTx);
            saveLocalStorageIncome(existingInc);

            // --- Subscriptions (optional sheet) ---
            const subSheetName = wb.SheetNames.find(n => /subscription/i.test(n));
            if (subSheetName) {
                const subRows = XLSX.utils.sheet_to_json(wb.Sheets[subSheetName], { defval: '' });
                const existingSubs = getLocalSubscriptions() || [];
                const subSignature = s => `${s.name}|${s.amount}|${s.billingDate}`;
                const seenSubs = new Set(existingSubs.map(subSignature));

                subRows.forEach(row => {
                    // Support both the current export columns and any older/legacy names
                    const name = String(row.Name ?? row.name ?? row.Service ?? row.service ?? '').trim();
                    if (!name) return;
                    const entry = {
                        index: uid++,
                        name,
                        amount: parseFloat(row.Amount ?? row.amount ?? row.Price ?? row.price) || 0,
                        payment: String(row['Payment Method'] ?? row.payment ?? row.paymentMethod ?? row.Account ?? '').trim(),
                        billingDate: String(row['Billing Day'] ?? row.billingDate ?? row['Next Payment'] ?? row.nextPaymentDate ?? '').trim(),
                        status: 'active',
                        createdAt: new Date().toISOString()
                    };
                    const sig = subSignature(entry);
                    if (seenSubs.has(sig)) return;
                    seenSubs.add(sig);
                    existingSubs.push(entry);
                });

                saveLocalSubscriptions(existingSubs);
            }

            // --- Category budgets (optional sheet) ---
            const budgetSheetName = wb.SheetNames.find(n => /budget/i.test(n));
            if (budgetSheetName) {
                const budgetRows = XLSX.utils.sheet_to_json(wb.Sheets[budgetSheetName], { defval: '' });
                const categoryBudgets = JSON.parse(localStorage.getItem('categoryBudgets')) || {};

                budgetRows.forEach(row => {
                    // Match by Category ID first, then fall back to the category label
                    let catId = String(row['Category ID'] ?? row['Category Id'] ?? row.id ?? '').trim();
                    const catLabel = String(row.Category ?? row.category ?? '').trim();
                    if (!catId && catLabel) {
                        const match = EXPENSE_CATEGORIES.find(c => c.label === catLabel || c.id === catLabel);
                        if (match) catId = match.id;
                    }
                    const amount = parseFloat(row.Budget ?? row.budget ?? row.Amount) || 0;
                    if (catId && amount > 0) {
                        categoryBudgets[catId] = amount;
                    }
                });

                localStorage.setItem('categoryBudgets', JSON.stringify(categoryBudgets));
            }

            showStatusMessage(`Imported ${importedCount} transactions! Refreshing...`, 0);
            setTimeout(() => location.reload(), 1200);
        } catch (error) {
            console.error('Error importing file:', error);
            showStatusMessage('Import failed. Use a file exported from this app.');
        }
    };

    reader.onerror = function() {
        showStatusMessage('Could not read that file');
    };

    reader.readAsArrayBuffer(file);
}

// Setup export and import buttons
function setupExportButton() {
    const exportBtn = document.getElementById('export-excel-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);

        exportBtn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = `0 8px 16px ${getCssVar('--glow-shadow', 'rgba(102, 126, 234, 0.4)')}`;
        });

        exportBtn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    }

    const importBtn = document.getElementById('import-excel-btn');
    const importInput = document.getElementById('import-excel-input');
    if (importBtn && importInput) {
        importBtn.addEventListener('click', () => importInput.click());

        importInput.addEventListener('change', function() {
            const file = this.files && this.files[0];
            if (file) importFromExcel(file);
            // Reset so selecting the same file again still fires change
            this.value = '';
        });

        importBtn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = `0 8px 16px ${getCssVar('--glow-shadow', 'rgba(17, 153, 142, 0.4)')}`;
        });

        importBtn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    }
}
});

// --- SYNC SCHEDULING FUNCTIONS ---

// Get time until next event (in milliseconds)
function getTimeUntilNextMidnight() {
    const taiwanTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    const tomorrow = new Date(taiwanTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return tomorrow.getTime() - taiwanTime.getTime();
}

function getTimeUntil6AM() {
    const taiwanTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    const target = new Date(taiwanTime);
    target.setHours(6, 0, 0, 0);
    
    if (target.getTime() <= taiwanTime.getTime()) {
        // If it's already past 6 AM, set for tomorrow
        target.setDate(target.getDate() + 1);
    }
    
    return target.getTime() - taiwanTime.getTime();
}

// --- Budget Page Logic ---

function setupBudgetSection() {
    let categoryBudgets = JSON.parse(localStorage.getItem('categoryBudgets')) || {};
    updateBudgetUI(categoryBudgets);
    
    const editBtn = document.getElementById('edit-budget-btn');
    const modal = document.getElementById('budget-modal');
    const closeBtn = document.querySelector('.close-budget-modal');
    const gridView = document.getElementById('budget-grid-view');
    const inputView = document.getElementById('budget-input-view');
    const modalTitle = document.getElementById('budget-modal-title');
    const selectedIcon = document.getElementById('selected-budget-icon');
    const selectedName = document.getElementById('selected-budget-name');
    const amountInput = document.getElementById('single-budget-input');
    const backBtn = document.getElementById('back-to-grid-btn');
    const saveBtn = document.getElementById('save-single-budget-btn');
    
    let currentEditingId = null;
    
    function showGridView() {
        gridView.style.display = 'grid';
        inputView.style.display = 'none';
        modalTitle.textContent = 'Tap to set budget';
    }
    
    function showInputView(cat) {
        gridView.style.display = 'none';
        inputView.style.display = 'flex';
        modalTitle.textContent = 'Edit Budget';
        currentEditingId = cat.id;
        
        selectedName.textContent = cat.label;
        selectedIcon.className = 'selected-budget-icon';
        selectedIcon.setAttribute('style', getCategoryVisualStyle(cat));
        selectedIcon.innerHTML = `<i class="${cat.icon}"></i>`;
        
        amountInput.value = categoryBudgets[cat.id] || '';
        amountInput.focus();
    }
    
    function renderBudgetGrid() {
        categoryBudgets = JSON.parse(localStorage.getItem('categoryBudgets')) || {};
        
        gridView.innerHTML = EXPENSE_CATEGORIES.map(cat => {
            const hasBudget = categoryBudgets[cat.id] > 0;
            return `
                <div class="budget-grid-item" data-id="${cat.id}">
                    <div class="budget-grid-icon" style="${getCategoryVisualStyle(cat)}">
                        <i class="${cat.icon}"></i>
                        ${hasBudget ? '<span class="budget-grid-badge">✓</span>' : ''}
                    </div>
                    <span class="budget-grid-label">${cat.label}</span>
                </div>
            `;
        }).join('');
        
        document.querySelectorAll('.budget-grid-item').forEach(item => {
            item.addEventListener('click', () => {
                const cat = EXPENSE_CATEGORIES.find(c => c.id === item.dataset.id);
                if (cat) showInputView(cat);
            });
        });
    }
    
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            renderBudgetGrid();
            showGridView();
            modal.style.display = 'flex';
        });
    }
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            renderBudgetGrid();
            showGridView();
        });
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (currentEditingId) {
                const val = parseFloat(amountInput.value);
                if (!isNaN(val) && val > 0) {
                    categoryBudgets[currentEditingId] = val;
                } else {
                    delete categoryBudgets[currentEditingId];
                }
                localStorage.setItem('categoryBudgets', JSON.stringify(categoryBudgets));
                updateBudgetUI(categoryBudgets);
                renderBudgetGrid();
                showGridView();
            }
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function updateBudgetUI(categoryBudgets) {
    if (!categoryBudgets) {
        categoryBudgets = JSON.parse(localStorage.getItem('categoryBudgets')) || {};
    }

    // Calculate Total Spent for current month per category
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const categorySpent = {};
    let totalSpent = 0;
    
    // Use transactionData (which contains expenses as negative values)
    if (transactionData) {
        transactionData.forEach(item => {
            // Check if it's an expense and in current month
            const dateStr = toLocalDateKey(item.date);
            if (!dateStr) return;
            
            const [y, mo, d] = dateStr.split('-').map(Number);
            // Check if same month/year
            if (y === currentYear && mo === currentMonth + 1) {
                 const amountVal = parseFloat(String(item.amount).replace(/[^0-9.-]+/g, ''));
                 if (!isNaN(amountVal) && amountVal < 0) {
                     const absAmount = Math.abs(amountVal);
                     totalSpent += absAmount;
                     
                     // Find category ID from label
                     // Note: item.category stores the Label (e.g. "食物"), not ID.
                     // We need to map label back to ID or just use label if consistent.
                     // The app uses Labels for display and storage.
                     // Let's try to match label to ID from EXPENSE_CATEGORIES
                     const catObj = EXPENSE_CATEGORIES.find(c => c.label === item.category);
                     const catId = catObj ? catObj.id : 'other';
                     
                     categorySpent[catId] = (categorySpent[catId] || 0) + absAmount;
                 }
            }
        });
    }
    
    // Calculate Totals
    let totalBudget = 0;
    Object.values(categoryBudgets).forEach(val => totalBudget += val);
    
    const remaining = totalBudget - totalSpent;
    const spentPercentage = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
    
    // Update Top Overview
    const budgetDisplay = document.getElementById('total-budget-display');
    const spentDisplay = document.getElementById('total-spent-display');
    const remainingDisplay = document.getElementById('budget-remaining');
    
    if (budgetDisplay) budgetDisplay.textContent = `$${totalBudget.toLocaleString()}`;
    if (spentDisplay) spentDisplay.textContent = `$${totalSpent.toLocaleString()}`;
    if (remainingDisplay) {
        remainingDisplay.textContent = `$${remaining.toLocaleString()}`;
        remainingDisplay.style.color = remaining >= 0 ? getCssVar('--success-color', '#4cd964') : getCssVar('--danger-color', '#ff3b30');
    }
    
    // Update Circle Progress
    const circle = document.getElementById('budget-progress-circle');
    if (circle) {
        circle.setAttribute('stroke-dasharray', `${spentPercentage}, 100`);
        circle.style.stroke = 'url(#budget-circle-gradient)';
        if (remaining < 0) {
            updateBudgetCircleGradient(
                getCssVar('--warning-color', '#ff7a1a'),
                getCssVar('--danger-color', '#ff3d5a'),
                getCssVar('--secondary-color', '#c026d3')
            );
        } else if (spentPercentage > 80) {
            updateBudgetCircleGradient(
                '#ffd166',
                getCssVar('--warning-color', '#ff9500'),
                getCssVar('--accent-color', '#ff7a1a')
            );
        } else {
            updateBudgetCircleGradient(
                getCssVar('--success-color', '#4ade80'),
                getCssVar('--accent-color', '#28d6c8'),
                getCssVar('--primary-color', '#45a3ff')
            );
        }
    }
    
    // Update Category Breakdown List
    const listContainer = document.getElementById('budget-breakdown');
    if (listContainer) {
        // Only show categories that have a budget set OR have spending
        // Actually, user probably only cares about tracking set budgets here.
        // Let's show all categories that have a budget set.
        
        const budgetKeys = Object.keys(categoryBudgets);
        
        if (budgetKeys.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary);">No budgets set. Tap the pen icon to start planning!</div>';
        } else {
            let html = '';
            
            // Sort by highest budget? Or standard order?
            // Standard order matches input list
            const sortedCats = EXPENSE_CATEGORIES.filter(c => categoryBudgets[c.id] > 0);
            
            sortedCats.forEach(cat => {
                const themedCat = getThemedCategory(cat);
                const budget = categoryBudgets[cat.id];
                const spent = categorySpent[cat.id] || 0;
                const percent = Math.min((spent / budget) * 100, 100);
                const isOver = spent > budget;
                
                // Color logic
                let progressClass = '';
                if (isOver) progressClass = 'danger';
                else if (percent > 80) progressClass = 'warning';
                
                html += `
                    <div class="budget-item" style="${getCategoryVisualStyle(themedCat)}">
                        <div class="budget-item-header">
                            <div class="budget-cat-info">
                                <div class="budget-cat-icon" style="${getCategoryVisualStyle(themedCat)}">
                                    <i class="${cat.icon}"></i>
                                </div>
                                <span class="budget-cat-name">${cat.label}</span>
                            </div>
                            <div class="budget-cat-amount">
                                <strong>$${spent.toLocaleString()}</strong> / $${budget.toLocaleString()}
                            </div>
                        </div>
                        <div class="budget-progress-bar">
                            <div class="budget-progress-fill ${progressClass}" style="width: ${percent}%; background: ${themedCat.gradient};"></div>
                        </div>
                    </div>
                `;
            });
            
            listContainer.innerHTML = html;
        }
    }
}

function updateBudgetCircleGradient(startColor, middleColor, endColor) {
    const stops = document.querySelectorAll('#budget-circle-gradient stop');
    if (stops.length < 3) return;

    stops[0].setAttribute('stop-color', startColor);
    stops[1].setAttribute('stop-color', middleColor);
    stops[2].setAttribute('stop-color', endColor);
}

// Hook into updateBalance/fetchData to refresh budget UI when data changes
const originalUpdateBalance = updateBalance;
updateBalance = function() {
    originalUpdateBalance();
    const budgets = JSON.parse(localStorage.getItem('categoryBudgets')) || {};
    updateBudgetUI(budgets);
};

// --- End Budget Page Logic ---

// Setup Calculator Modal
function setupCalculatorModal() {
    const modal = document.getElementById('add-modal');
    const closeBtn = document.querySelector('.close-add-modal');
    
    // Toggle Buttons
    const typeBtns = document.querySelectorAll('.type-btn');
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            switchCalcType(type);
        });
    });

    // Keypad Logic
    const keypadBtns = document.querySelectorAll('.keypad-btn');
    keypadBtns.forEach(btn => {
        btn.addEventListener('click', (e) => handleKeypadClick(e, btn));
    });

    // Date Navigation
    const prevDayBtn = document.getElementById('prev-day');
    const nextDayBtn = document.getElementById('next-day');
    if (prevDayBtn) prevDayBtn.addEventListener('click', () => changeDate(-1));
    if (nextDayBtn) nextDayBtn.addEventListener('click', () => changeDate(1));
    
    // Date Display Click (to pick date)
    const dateDisplay = document.getElementById('calc-date-display');
    const dateInput = document.getElementById('calc-date-input');
    
    if (dateDisplay && dateInput) {
        dateDisplay.addEventListener('click', () => {
            dateInput.showPicker ? dateInput.showPicker() : dateInput.click();
        });
        
        dateInput.addEventListener('change', (e) => {
            if(e.target.valueAsDate) {
                currentCalcDate = e.target.valueAsDate;
                updateDateDisplay();
            }
        });
    }

    // Close handlers
    if (closeBtn) closeBtn.addEventListener('click', closeCalculatorModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeCalculatorModal();
        }
    });
}

function openCalculatorModal(type = 'expense') {
    const modal = document.getElementById('add-modal');
    modal.style.display = 'flex'; // Use flex to center/align
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Reset State
    editingTransaction = null;
    currentCalcAmount = '0';
    currentCalcDate = new Date();
    document.getElementById('calc-description').value = '';
    updateAmountDisplay();
    updateDateDisplay();
    
    // Switch Type
    switchCalcType(type);
    
    // Select default category
    const defaultCat = type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0];
    selectCategory(defaultCat);
}

function closeCalculatorModal() {
    const modal = document.getElementById('add-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    editingTransaction = null;
}

function openEditTransaction(transactionId) {
    const allTransactions = [...transactionData, ...incomeData];
    const transaction = allTransactions.find(t => String(t.index) === String(transactionId));
    if (!transaction) return;

    editingTransaction = {
        index: transaction.index,
        originalType: transaction.type === 'income' ? 'income' : 'expense'
    };

    const type = transaction.type === 'income' ? 'income' : 'expense';
    const modal = document.getElementById('add-modal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    currentCalcDate = parseLocalDate(transaction.date);
    currentCalcAmount = String(Math.abs(parseFloat(String(transaction.amount).replace(/[^0-9.-]+/g, '')) || 0));
    document.getElementById('calc-description').value = transaction.description || '';
    updateAmountDisplay();
    updateDateDisplay();

    switchCalcType(type);

    const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const categoryObj = categories.find(c => c.label === transaction.category || c.id === transaction.category) || categories[0];
    selectCategory(categoryObj);
}

function parseLocalDate(dateValue) {
    const key = toLocalDateKey(dateValue);
    if (!key) return new Date();

    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function switchCalcType(type) {
    currentCalcType = type;
    
    // Update Toggle UI
    document.querySelectorAll('.type-btn').forEach(btn => {
        if (btn.dataset.type === type) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Render Categories
    renderCategories(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES);
    
    // Select first category by default if none selected or invalid
    const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    selectCategory(categories[0]);
}

function renderCategories(categories) {
    const grid = document.getElementById('category-grid');
    grid.innerHTML = categories.map(cat => `
        <div class="category-option" onclick="handleCategorySelect('${cat.id}')" data-id="${cat.id}">
            <div class="cat-icon-circle" style="${getCategoryVisualStyle(cat)}">
                <i class="${cat.icon}"></i>
            </div>
            <div class="cat-label">${cat.label}</div>
        </div>
    `).join('');
}

function handleCategorySelect(id) {
    const categories = currentCalcType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const category = categories.find(c => c.id === id);
    if (category) selectCategory(category);
}
// Exporting handleCategorySelect to window for onclick handlers in HTML
window.handleCategorySelect = handleCategorySelect;

function selectCategory(category) {
    selectedCategoryId = category.id;
    
    // Update UI
    document.querySelectorAll('.category-option').forEach(el => {
        if (el.dataset.id === category.id) el.classList.add('selected');
        else el.classList.remove('selected');
    });
    
    // Update Input Display Icon
    document.getElementById('selected-icon').className = category.icon;
    document.getElementById('selected-category-name').textContent = category.label;
}

function handleKeypadClick(e, btn) {
    // Ripple effect
    createRipple(e);

    const val = btn.dataset.val;
    const action = btn.id;

    if (action === 'btn-submit') {
        submitTransaction();
        return;
    }

    if (action === 'btn-ac') {
        currentCalcAmount = '0';
    } else if (action === 'btn-backspace') {
        if (currentCalcAmount.length > 1) {
            currentCalcAmount = currentCalcAmount.slice(0, -1);
        } else {
            currentCalcAmount = '0';
        }
    } else if (val) {
        // Handle numbers and operators (simple appending for now, can extend to eval)
        if (['+', '-', '*', '/'].includes(val)) {
            // Simple evaluation logic if user pressed operator?
            // For now, let's just allow typing numbers. 
            // If the user wants to calculate, we can add evaluation later.
            // The request was "something like this", usually implies the look.
            // Let's ignore operators for now or treat them as no-op to avoid eval errors
            return; 
        }

        if (currentCalcAmount === '0' && val !== '.') {
            currentCalcAmount = val;
        } else {
            // Prevent multiple decimals
            if (val === '.' && currentCalcAmount.includes('.')) return;
            // Max length check
            if (currentCalcAmount.length < 10) {
                currentCalcAmount += val;
            }
        }
    }
    updateAmountDisplay();
}

function updateAmountDisplay() {
    document.getElementById('display-amount').textContent = currentCalcAmount;
}

function changeDate(days) {
    const newDate = new Date(currentCalcDate);
    newDate.setDate(newDate.getDate() + days);
    currentCalcDate = newDate;
    updateDateDisplay();
}

function updateDateDisplay() {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
    // Format: 2026/02/09 Mon
    const dateStr = currentCalcDate.toLocaleDateString('zh-TW', options); 
    document.getElementById('calc-date-display').textContent = dateStr;
    
    // Sync hidden input
    document.getElementById('calc-date-input').valueAsDate = currentCalcDate;
}

async function submitTransaction() {
    let amount = parseFloat(currentCalcAmount);
    if (amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    const description = document.getElementById('calc-description').value;
    const categories = currentCalcType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const categoryObj = categories.find(c => c.id === selectedCategoryId);
    const categoryLabel = categoryObj ? categoryObj.label : 'Uncategorized';
    
    // Adjust sign based on type
    if (currentCalcType === 'expense') {
        amount = -Math.abs(amount); // Ensure expense is negative
    } else {
        amount = Math.abs(amount); // Ensure income is positive
    }
    
    // Close modal immediately
    document.getElementById('add-modal').style.display = 'none';
    document.body.style.overflow = '';
    
    // Show quiet "Saving..." message
    const statusMsg = document.getElementById('status-message');
    const savingText = editingTransaction ? 'Updating...' : 'Saving...';
    const successText = editingTransaction ? 'Updated!' : 'Saved!';
    if (statusMsg) statusMsg.textContent = savingText;

    // Add or update transaction in localStorage
    try {
        if (editingTransaction) {
            await updateTransactionInStorage(
                editingTransaction.index,
                currentCalcDate,
                amount,
                categoryLabel,
                description,
                currentCalcType
            );
        } else {
            await addTransactionToSheet(
                currentCalcDate,
                amount,
                categoryLabel,
                description,
                currentCalcType // 'expense' or 'income'
            );
        }
        editingTransaction = null;
        
        if (statusMsg && statusMsg.textContent === savingText) {
            statusMsg.textContent = successText;
            setTimeout(() => { if (statusMsg.textContent === successText) statusMsg.textContent = ''; }, 2000);
        }
        
        // Data is already in localStorage, just refresh all UI components
        transactionData = getLocalStorageTransactions();
        incomeData = getLocalStorageIncome();
        updateTransactionsList();
        updateBalance();
        updateExpenseCharts();
        
    } catch (error) {
        console.error('Background sync error (will retry at midnight):', error);
        if (statusMsg && statusMsg.textContent === savingText) {
            statusMsg.textContent = 'Error saving';
            setTimeout(() => { if (statusMsg.textContent === 'Error saving') statusMsg.textContent = ''; }, 3000);
        }
    }
}

// Function to initialize sections
function initializeSections() {
    // Hide all sections except the active one
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        if (!section.classList.contains('active')) {
            section.style.display = 'none';
        }
    });
}

// Handle bottom navigation
function setupNavigation() {
    try {
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.section');
        
        if (!navItems || navItems.length === 0) {
            console.warn('No nav items found');
            return;
        }
        
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                try {
                    e.preventDefault();
                    
                    // Remove active class from all nav items
                    navItems.forEach(navItem => {
                        navItem.classList.remove('active');
                    });
                    
                    // Add active class to clicked nav item
                    this.classList.add('active');
                    
                    // Add ripple effect
                    createRipple(e);
                    
                    // Get the target section ID
                    const targetSectionId = this.getAttribute('data-section');
                    
                    // Hide all sections
                    sections.forEach(section => {
                        section.classList.remove('active');
                        section.style.display = 'none';
                    });
                    
                    // Show only the target section
                    const targetSection = document.getElementById(targetSectionId);
                    if (targetSection) {
                        targetSection.classList.add('active');
                        targetSection.style.display = 'block';
                    } else {
                        console.warn('Target section not found:', targetSectionId);
                    }
                } catch (err) {
                    console.error('Error in nav click handler:', err);
                }
            });
        });
    } catch (e) {
        console.error('Error setting up navigation:', e);
    }
}

// Function to create ripple effect
function createRipple(event) {
    const button = event.currentTarget;
    
    // Remove any existing ripples
    const ripples = button.querySelectorAll('.ripple');
    ripples.forEach(ripple => ripple.remove());
    
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    // Get position relative to the button
    const rect = button.getBoundingClientRect();
    let x = event.clientX ? event.clientX - rect.left : event.touches[0].clientX - rect.left;
    let y = event.clientY ? event.clientY - rect.top : event.touches[0].clientY - rect.top;
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${x - radius}px`;
    circle.style.top = `${y - radius}px`;
    circle.classList.add('ripple');
    
    button.appendChild(circle);
    
    // Remove ripple after animation completes
    setTimeout(() => {
        circle.remove();
    }, 600);
}

// Setup Month Selector
function setupMonthSelector() {
    const btn = document.getElementById('month-selector-btn');
    const dropdown = document.getElementById('month-picker-dropdown');
    const grid = document.getElementById('month-picker-grid');
    const label = document.getElementById('month-selector-label');
    const yearLabel = document.getElementById('month-picker-year-label');
    const yearPrevBtn = document.getElementById('year-prev');
    const yearNextBtn = document.getElementById('year-next');
    
    if (!btn || !dropdown || !grid) return;
    
    // Generate month buttons
    function renderMonths() {
        grid.innerHTML = '';
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        monthNames.forEach((name, index) => {
            const monthNum = index + 1;
            const monthBtn = document.createElement('button');
            monthBtn.type = 'button';
            monthBtn.className = 'month-btn';
            monthBtn.textContent = name;
            monthBtn.dataset.month = monthNum;
            
            // Highlight the currently selected month
            if (monthNum === selectedMonth && selectedYear === new Date().getFullYear()) {
                monthBtn.classList.add('selected');
            }
            
            monthBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Update global variables
                selectedMonth = monthNum;
                
                // Update all month buttons
                grid.querySelectorAll('.month-btn').forEach(m => m.classList.remove('selected'));
                monthBtn.classList.add('selected');
                
                // Update label
                label.textContent = `${selectedYear}年${String(selectedMonth).padStart(2, '0')}月`;
                
                // Update data displays
                updateTransactionsList();
                updateBalance();
                updateExpenseCharts();
                
                // Close dropdown
                dropdown.classList.remove('active');
                btn.setAttribute('aria-expanded', 'false');
            });
            
            grid.appendChild(monthBtn);
        });
        
        yearLabel.textContent = `${selectedYear}年`;
    }
    
    // Toggle dropdown
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        dropdown.classList.toggle('active');
        btn.setAttribute('aria-expanded', dropdown.classList.contains('active'));
        if (dropdown.classList.contains('active')) {
            renderMonths();
        }
    });
    
    // Year navigation
    yearPrevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        selectedYear--;
        renderMonths();
    });
    
    yearNextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        selectedYear++;
        renderMonths();
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
            btn.setAttribute('aria-expanded', 'false');
        }
    });
    
    // Initialize label and render months
    label.textContent = `${selectedYear}年${String(selectedMonth).padStart(2, '0')}月`;
    renderMonths();
}

// Function to add transaction to localStorage
async function addTransactionToSheet(date, amount, category, description, type = 'expense') {
    try {
        // Format the date to YYYY-MM-DD in LOCAL time
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        // Convert amount to a number
        const numericAmount = parseFloat(amount);
        
        // Create new transaction object
        const newTransaction = {
            index: Date.now(), // Use timestamp as unique ID
            date: formattedDate,
            amount: numericAmount,
            category: category,
            description: description || '',
            type: type
        };
        
        // Add to appropriate storage
        if (type === 'income') {
            const incomeList = getLocalStorageIncome();
            incomeList.push(newTransaction);
            saveLocalStorageIncome(incomeList);
        } else {
            const transactionList = getLocalStorageTransactions();
            transactionList.push(newTransaction);
            saveLocalStorageTransactions(transactionList);
        }
        
        return true;
    } catch (error) {
        console.error('Error adding transaction to localStorage:', error);
        throw error;
    }
}

async function updateTransactionInStorage(index, date, amount, category, description, type = 'expense') {
    try {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        const numericAmount = parseFloat(amount);

        const updatedTransaction = {
            index: index,
            date: formattedDate,
            amount: numericAmount,
            category: category,
            description: description || '',
            type: type
        };

        const transactionList = getLocalStorageTransactions();
        const incomeList = getLocalStorageIncome();
        const transactionIndex = transactionList.findIndex(t => String(t.index) === String(index));
        const incomeIndex = incomeList.findIndex(t => String(t.index) === String(index));

        if (transactionIndex === -1 && incomeIndex === -1) {
            throw new Error('Transaction not found');
        }

        if (transactionIndex > -1) transactionList.splice(transactionIndex, 1);
        if (incomeIndex > -1) incomeList.splice(incomeIndex, 1);

        if (type === 'income') {
            incomeList.push(updatedTransaction);
        } else {
            transactionList.push(updatedTransaction);
        }

        saveLocalStorageTransactions(transactionList);
        saveLocalStorageIncome(incomeList);

        return true;
    } catch (error) {
        console.error('Error updating transaction in localStorage:', error);
        throw error;
    }
}

// Function to setup delete mode
function setupDeleteMode() {
    const deleteModeBtn = document.getElementById('delete-mode-btn');
    
    if (deleteModeBtn) {
        deleteModeBtn.addEventListener('click', function() {
            // Toggle delete mode
            isDeleteMode = !isDeleteMode;
            
            // Toggle active class on button
            if (isDeleteMode) {
                deleteModeBtn.classList.add('active');
            } else {
                deleteModeBtn.classList.remove('active');
            }
            
            // Show/hide delete buttons in new list view
            const container = document.getElementById('transaction-list-container');
            if (container) {
                if (isDeleteMode) {
                    container.classList.add('delete-mode');
                } else {
                    container.classList.remove('delete-mode');
                }
            }
            
            // Show/hide delete column in old table view (if it still exists anywhere)
            const deleteColumns = document.querySelectorAll('.delete-column');
            deleteColumns.forEach(cell => {
                if (isDeleteMode) {
                    cell.classList.remove('hidden');
                } else {
                    cell.classList.add('hidden');
                }
            });
            
            // Setup delete buttons if in delete mode
            if (isDeleteMode) {
                setupDeleteButtons();
            }
        });
    }
}

// Function to setup refresh button
function setupRefreshButton() {
    const refreshButton = document.getElementById('refresh-btn');
    
    if (refreshButton) {
        refreshButton.addEventListener('click', async function() {
            try {
                // Show loading animation
                refreshButton.classList.add('rotating');
                
                // Reload data from localStorage
                await fetchExpenseData();
                await fetchIncomeData();
                await fetchSubscriptionData();
                
                // Show success message
                document.getElementById('status-message').textContent = 'Refreshed!';
                setTimeout(() => {
                    document.getElementById('status-message').textContent = '';
                }, 2000);
            } catch (error) {
                console.error('Error refreshing data:', error);
                document.getElementById('status-message').textContent = 'Error refreshing';
                setTimeout(() => {
                    document.getElementById('status-message').textContent = '';
                }, 2000);
            } finally {
                // Remove loading animation
                refreshButton.classList.remove('rotating');
            }
        });
    }
}

// Function to fetch subscription data from localStorage
async function fetchSubscriptionData() {
    try {
        // Load from localStorage
        subscriptionData = getLocalSubscriptions() || [];
        
        // Refresh subscription list if on subscription view
        if (currentView === 'subscriptions') {
            renderSubscriptionListInline();
        }
        
        return Promise.resolve({ success: true });
    } catch (error) {
        console.error('Error fetching subscription data:', error);
        return Promise.reject(error);
    }
}

// Deprecated function - kept for compatibility
async function displaySubscriptionData(data) {
    // This function is no longer used but kept for compatibility
    return Promise.resolve();
}

// Function to add subscription to localStorage only
async function addSubscriptionToSheet(service, account, price, billingCycle, category, nextPaymentDate, paymentMethod, description) {
    try {
        const formattedDate = new Date(nextPaymentDate).toISOString().split('T')[0];
        const numericPrice = parseFloat(price);
        
        // Create new subscription object
        const newSubscription = {
            index: Date.now(), // Use timestamp as unique ID
            service: service,
            account: account,
            price: numericPrice,
            billingCycle: billingCycle,
            category: category,
            nextPaymentDate: formattedDate,
            paymentMethod: paymentMethod,
            description: description || ''
        };
        
        // Add to localStorage
        const subscriptionList = getLocalSubscriptions();
        subscriptionList.push(newSubscription);
        saveLocalSubscriptions(subscriptionList);
        
        return true;
    } catch (error) {
        console.error('Error adding subscription to localStorage:', error);
        throw error;
    }
}

// Function to display subscription data (deprecated - kept for compatibility)
async function displaySubscriptionData(data) {
    if (!data) return;
    
    const container = document.getElementById('subscription-list-container');
    
    if (!data || !data.table || !data.table.rows || data.table.rows.length === 0) {
        container.innerHTML = `
            <div class="empty-subscriptions">
                <i class="fas fa-calendar-alt"></i>
                <p>No subscriptions found. Click the + button to add your first subscription.</p>
            </div>
        `;
        return;
    }
    
    const rows = data.table.rows;
    const columns = data.table.cols;
    
    // Get column indices
    const serviceIndex = 0;       // Service
    const accountIndex = 1;       // Account
    const priceIndex = 2;         // Price
    const billingCycleIndex = 3;  // Billing Cycle
    const categoryIndex = 4;      // Category
    const nextPaymentIndex = 5;   // Next Payment Date
    const paymentMethodIndex = 6; // Payment Method
    const descriptionIndex = 7;   // Description (optional)
    
    // Process subscription data
    const subscriptionsHTML = rows.map((row, rowIndex) => {
        if (!row.c || row.c.some(cell => !cell)) return ''; // Skip rows with empty cells
        
        const service = row.c[serviceIndex]?.v || 'N/A';
        const account = row.c[accountIndex]?.v || 'N/A';
        const price = row.c[priceIndex]?.v || '0';
        const billingCycle = row.c[billingCycleIndex]?.v || 'N/A';
        const category = row.c[categoryIndex]?.v || 'Uncategorized';
        const nextPayment = row.c[nextPaymentIndex]?.v || 'N/A';
        const paymentMethod = row.c[paymentMethodIndex]?.v || 'N/A';
        const description = row.c[descriptionIndex]?.v || '';
        
        // Clean price string and convert to number
        const priceValue = parseFloat(String(price).replace(/[^0-9.-]+/g, ''));
        
        // Format price for display - ensure $ is always shown
        let displayPrice;
        if (typeof priceValue === 'number' && !isNaN(priceValue)) {
            displayPrice = `$${priceValue.toFixed(2)}`;
        } else {
            // If for some reason we can't parse it, just show the original
            displayPrice = price.toString().startsWith('$') ? price : `$${price}`;
        }
        
        // Format date for display
        let displayNextPayment = nextPayment;
        try {
            const dateObj = new Date(nextPayment);
            if (!isNaN(dateObj.getTime())) {
                displayNextPayment = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            }
        } catch (e) {
            console.warn('Date parsing error:', e);
        }
        
        // Add data attributes for details and deletion
        const dataAttributes = `
            data-row-index="${rowIndex}"
            data-service="${service}"
            data-account="${account}"
            data-price="${priceValue}"
            data-billing="${billingCycle}"
            data-category="${category}"
            data-next-payment="${nextPayment}"
            data-payment="${paymentMethod}"
            data-description="${description}"
        `;
        
        // Determine if the service has an icon
        const serviceFirstLetter = service.charAt(0).toUpperCase();
        let serviceIcon;
        
        const serviceIcons = {
            'google': 'fab fa-google',
            'netflix': 'fab fa-netflix',
            'spotify': 'fab fa-spotify',
            'apple': 'fab fa-apple',
            'amazon': 'fab fa-amazon',
            'youtube': 'fab fa-youtube',
            'disney': 'fab fa-disney',
            'hulu': 'fas fa-tv',
            'dropbox': 'fab fa-dropbox',
            'microsoft': 'fab fa-microsoft',
            'github': 'fab fa-github',
            'slack': 'fab fa-slack',
            'adobe': 'fab fa-adobe',
            'paypal': 'fab fa-paypal',
            'twitter': 'fab fa-twitter',
            'facebook': 'fab fa-facebook',
            'instagram': 'fab fa-instagram',
            'linkedin': 'fab fa-linkedin'
        };
        
        const serviceLower = service.toLowerCase();
        for (const [key, icon] of Object.entries(serviceIcons)) {
            if (serviceLower.includes(key)) {
                serviceIcon = icon;
                break;
            }
        }
        
        if (!serviceIcon) {
            serviceIcon = 'fas fa-calendar-alt';
        }
        
        return `
            <div class="subscription-card" ${dataAttributes}>
                <div class="service-name">${service}</div>
                <div class="price">${displayPrice}<span class="billing-cycle">/${billingCycle}</span></div>
                <div class="next-payment">
                    <i class="far fa-calendar-alt"></i>
                    ${displayNextPayment}
                </div>
                <div class="delete-overlay">
                    <button class="delete-btn" data-row-index="${rowIndex}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = subscriptionsHTML || `
        <div class="empty-subscriptions">
            <i class="fas fa-calendar-alt"></i>
            <p>No subscriptions found. Click the + button to add your first subscription.</p>
        </div>
    `;
    
    // Add click listeners to cards for showing details
    const cards = document.querySelectorAll('.subscription-card');
    cards.forEach(card => {
        card.addEventListener('click', function(event) {
            // Don't show details if delete mode is active or if clicking on delete button
            if (isSubscriptionDeleteMode || event.target.closest('.delete-btn')) {
                return;
            }
            
            // Show subscription details
            showSubscriptionDetails(
                this.getAttribute('data-service'),
                this.getAttribute('data-account'),
                this.getAttribute('data-price'),
                this.getAttribute('data-billing'),
                this.getAttribute('data-category'),
                this.getAttribute('data-next-payment'),
                this.getAttribute('data-payment'),
                this.getAttribute('data-description'),
                this.getAttribute('data-row-index')
            );
        });
    });
    
    // Setup delete buttons if in delete mode
    if (isSubscriptionDeleteMode) {
        setupSubscriptionDeleteButtons();
    }
}


// Function to delete subscription from localStorage
async function deleteSubscriptionFromSheet(rowIndex) {
    try {
        const subscriptionList = getLocalSubscriptions();
        const indexToDelete = subscriptionList.findIndex(sub => sub.index == rowIndex);
        
        if (indexToDelete !== -1) {
            subscriptionList.splice(indexToDelete, 1);
            saveLocalSubscriptions(subscriptionList);
        }
        
        return true;
    } catch (error) {
        console.error('Error deleting subscription from localStorage:', error);
        throw error;
    }
}

// Setup subscription delete buttons
function setupSubscriptionDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.subscription-card .delete-btn');
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.stopPropagation();
            const rowIndex = this.getAttribute('data-row-index');
            const card = this.closest('.subscription-card');
            
            const service = card.getAttribute('data-service');
            const account = card.getAttribute('data-account');
            const price = card.getAttribute('data-price');
            const billingCycle = card.getAttribute('data-billing');
            const category = card.getAttribute('data-category');
            const nextPayment = card.getAttribute('data-next-payment');
            const paymentMethod = card.getAttribute('data-payment');
            
            showDeleteSubscriptionConfirmation(rowIndex, service, account, price, billingCycle, category, nextPayment, paymentMethod);
        });
    });
}

// Show delete subscription confirmation modal
function showDeleteSubscriptionConfirmation(rowIndex, service, account, price, billingCycle, category, nextPayment, paymentMethod) {
    const confirmed = confirm(`Are you sure you want to delete the ${service} subscription?`);
    
    if (confirmed) {
        deleteSubscriptionFromSheet(rowIndex)
            .then(() => {
                document.getElementById('status-message').textContent = 'Deleted!';
                setTimeout(() => {
                    document.getElementById('status-message').textContent = '';
                }, 2000);
                
                // Reload subscription data
                return fetchSubscriptionData();
            })
            .catch(error => {
                console.error('Error deleting subscription:', error);
                document.getElementById('status-message').textContent = 'Error deleting';
                setTimeout(() => {
                    document.getElementById('status-message').textContent = '';
                }, 2000);
            });
    }
}

// Setup subscription modal
function setupSubscriptionModal() {
    const modal = document.getElementById('subscription-modal');
    const addButton = document.getElementById('add-subscription-btn');
    const closeButton = document.querySelector('.close-subscription-modal');
    const cancelButton = document.getElementById('cancel-subscription');
    const form = document.getElementById('subscription-form');
    
    if (addButton) {
        addButton.addEventListener('click', function() {
            modal.style.display = 'block';
            document.getElementById('subscription-next-payment').valueAsDate = new Date();
        });
    }
    
    function closeModal() {
        modal.style.display = 'none';
        form.reset();
    }
    
    if (closeButton) closeButton.addEventListener('click', closeModal);
    if (cancelButton) cancelButton.addEventListener('click', closeModal);
    
    const outsideClickHandler = function(event) {
        if (event.target === modal) {
            closeModal();
            window.removeEventListener('click', outsideClickHandler);
        }
    };
    
    window.addEventListener('click', outsideClickHandler);
    
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const service = document.getElementById('subscription-service').value;
        const account = document.getElementById('subscription-account').value;
        const price = document.getElementById('subscription-price').value;
        const billingCycle = document.getElementById('subscription-billing').value;
        const category = document.getElementById('subscription-category').value;
        const nextPaymentDate = document.getElementById('subscription-next-payment').value;
        const paymentMethod = document.getElementById('subscription-payment').value;
        const description = document.getElementById('subscription-description').value;
        
        try {
            document.getElementById('status-message').textContent = 'Adding...';
            
            await addSubscriptionToSheet(
                service,
                account,
                price,
                billingCycle,
                category,
                nextPaymentDate,
                paymentMethod,
                description
            );
            
            closeModal();
            
            await fetchSubscriptionData();
            
            document.getElementById('status-message').textContent = 'Added!';
            setTimeout(() => {
                document.getElementById('status-message').textContent = '';
            }, 2000);
        } catch (error) {
            console.error('Error adding subscription:', error);
            document.getElementById('status-message').textContent = 'Error adding';
            setTimeout(() => {
                document.getElementById('status-message').textContent = '';
            }, 2000);
        }
    });
}

// Setup subscription delete mode
function setupSubscriptionDeleteMode() {
    const deleteButton = document.getElementById('delete-subscription-btn');
    
    if (deleteButton) {
        deleteButton.addEventListener('click', function() {
            isSubscriptionDeleteMode = !isSubscriptionDeleteMode;
            
            if (isSubscriptionDeleteMode) {
                deleteButton.classList.add('active');
            } else {
                deleteButton.classList.remove('active');
            }
            
            const cards = document.querySelectorAll('.subscription-card');
            cards.forEach(card => {
                const deleteOverlay = card.querySelector('.delete-overlay');
                if (isSubscriptionDeleteMode) {
                    deleteOverlay.classList.add('visible');
                } else {
                    deleteOverlay.classList.remove('visible');
                }
            });
            
            if (isSubscriptionDeleteMode) {
                setupSubscriptionDeleteButtons();
            }
        });
    }
}

// Show subscription details modal
function showSubscriptionDetails(service, account, price, billingCycle, category, nextPayment, paymentMethod, description, rowIndex) {
    const modal = document.getElementById('subscription-details-modal');
    const detailsContainer = document.getElementById('subscription-detail-content');
    
    const priceValue = parseFloat(price);
    const displayPrice = !isNaN(priceValue) ? `$${priceValue.toFixed(2)}` : `$${price}`;
    
    let displayNextPayment = nextPayment;
    try {
        const dateObj = new Date(nextPayment);
        if (!isNaN(dateObj.getTime())) {
            displayNextPayment = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }
    } catch (e) {
        console.warn('Date parsing error:', e);
    }
    
    const serviceLower = service.toLowerCase();
    let serviceIcon = 'fas fa-calendar-alt';
    
    const serviceIcons = {
        'google': 'fab fa-google',
        'netflix': 'fab fa-netflix',
        'spotify': 'fab fa-spotify',
        'apple': 'fab fa-apple',
        'amazon': 'fab fa-amazon',
        'youtube': 'fab fa-youtube',
        'disney': 'fab fa-disney',
        'hulu': 'fas fa-tv',
        'dropbox': 'fab fa-dropbox',
        'microsoft': 'fab fa-microsoft',
        'github': 'fab fa-github',
        'slack': 'fab fa-slack',
        'adobe': 'fab fa-adobe',
        'paypal': 'fab fa-paypal',
        'twitter': 'fab fa-twitter',
        'facebook': 'fab fa-facebook',
        'instagram': 'fab fa-instagram',
        'linkedin': 'fab fa-linkedin'
    };
    
    for (const [key, icon] of Object.entries(serviceIcons)) {
        if (serviceLower.includes(key)) {
            serviceIcon = icon;
            break;
        }
    }
    
    detailsContainer.innerHTML = `
        <div class="service-tag">
            <i class="${serviceIcon}"></i> ${category}
        </div>
        <div class="service-name">${service}</div>
        <div class="price">${displayPrice}/${billingCycle}</div>
        
        <div class="detail-group">
            <div class="detail-item">
                <i class="fas fa-user"></i>
                <div class="detail-content">
                    <div class="detail-label">Account</div>
                    <div class="detail-value">${account}</div>
                </div>
            </div>
            
            <div class="detail-item">
                <i class="far fa-calendar-alt"></i>
                <div class="detail-content">
                    <div class="detail-label">Next Payment</div>
                    <div class="detail-value">${displayNextPayment}</div>
                </div>
            </div>
            
            <div class="detail-item">
                <i class="fas fa-credit-card"></i>
                <div class="detail-content">
                    <div class="detail-label">Payment Method</div>
                    <div class="detail-value">${paymentMethod}</div>
                </div>
            </div>
            
            ${description ? `
            <div class="detail-item">
                <i class="fas fa-info-circle"></i>
                <div class="detail-content">
                    <div class="detail-label">Description</div>
                    <div class="detail-value">${description}</div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
    
    modal.style.display = 'block';
    
    const closeButton = modal.querySelector('.close-details-modal');
    closeButton.onclick = function() {
        modal.style.display = 'none';
        document.body.style.overflow = ''; 
    };
    
    const deleteButton = document.getElementById('delete-subscription-detail-btn');
    deleteButton.onclick = function() {
        modal.style.display = 'none';
        showDeleteSubscriptionConfirmation(rowIndex, service, account, price, billingCycle, category, nextPayment, paymentMethod);
    };
    
    const editButton = document.getElementById('edit-subscription-btn');
    editButton.onclick = function() {
        modal.style.display = 'none';
        openEditSubscriptionModal(service, account, price, billingCycle, category, nextPayment, paymentMethod, description, rowIndex);
    };
    
    const resubscribeButton = document.getElementById('resubscribe-btn');
    resubscribeButton.onclick = function() {
        let newPaymentDate = calculateNextPaymentDate(nextPayment, billingCycle);
        
        const confirmed = confirm(`Resubscribe to ${service} for another ${billingCycle} cycle?\nNew payment date: ${formatDateForDisplay(newPaymentDate)}`);
        
        if (confirmed) {
            modal.style.display = 'none';
            
            updateSubscriptionFromSheet(
                rowIndex,
                service,
                account,
                price,
                billingCycle,
                category,
                newPaymentDate,
                paymentMethod,
                description
            ).then(() => {
                fetchSubscriptionData();
                
                document.getElementById('status-message').textContent = 'Resubscribed!';
                setTimeout(() => {
                    document.getElementById('status-message').textContent = '';
                }, 2000);
            }).catch(error => {
                console.error('Error resubscribing:', error);
                document.getElementById('status-message').textContent = 'Error resubscribing';
                setTimeout(() => {
                    document.getElementById('status-message').textContent = '';
                }, 2000);
            });
        }
    };
    
    const outsideClickHandler = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; 
            window.removeEventListener('click', outsideClickHandler);
        }
    };
    
    window.addEventListener('click', outsideClickHandler);
}

// Setup edit subscription modal
function openEditSubscriptionModal(service, account, price, billingCycle, category, nextPayment, paymentMethod, description, rowIndex) {
    const modal = document.getElementById('edit-subscription-modal');
    
    document.getElementById('edit-subscription-service').value = service;
    document.getElementById('edit-subscription-account').value = account;
    document.getElementById('edit-subscription-price').value = parseFloat(price);
    document.getElementById('edit-subscription-billing').value = billingCycle;
    document.getElementById('edit-subscription-category').value = category;
    
    let formattedDate = nextPayment;
    try {
        const dateObj = new Date(nextPayment);
        if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toISOString().split('T')[0];
        }
    } catch (e) {
        console.warn('Date parsing error:', e);
    }
    
    document.getElementById('edit-subscription-next-payment').value = formattedDate;
    document.getElementById('edit-subscription-payment').value = paymentMethod;
    document.getElementById('edit-subscription-description').value = description || '';
    document.getElementById('edit-subscription-row-index').value = rowIndex;
    
    modal.style.display = 'block';
    
    const closeButton = modal.querySelector('.close-edit-subscription-modal');
    closeButton.onclick = function() {
        modal.style.display = 'none';
    };
    
    const cancelButton = document.getElementById('cancel-edit-subscription');
    cancelButton.onclick = function() {
        modal.style.display = 'none';
    };
    
    const form = document.getElementById('edit-subscription-form');
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        try {
            const updatedService = document.getElementById('edit-subscription-service').value;
            const updatedAccount = document.getElementById('edit-subscription-account').value;
            const updatedPrice = document.getElementById('edit-subscription-price').value;
            const updatedBillingCycle = document.getElementById('edit-subscription-billing').value;
            const updatedCategory = document.getElementById('edit-subscription-category').value;
            const updatedNextPayment = document.getElementById('edit-subscription-next-payment').value;
            const updatedPaymentMethod = document.getElementById('edit-subscription-payment').value;
            const updatedDescription = document.getElementById('edit-subscription-description').value;
            const rowIndex = document.getElementById('edit-subscription-row-index').value;
            
            await updateSubscriptionFromSheet(
                rowIndex,
                updatedService,
                updatedAccount,
                updatedPrice,
                updatedBillingCycle,
                updatedCategory,
                updatedNextPayment,
                updatedPaymentMethod,
                updatedDescription
            );
            
            modal.style.display = 'none';
            
            await fetchSubscriptionData();
            
            document.getElementById('status-message').textContent = 'Updated!';
            setTimeout(() => {
                document.getElementById('status-message').textContent = '';
            }, 2000);
        } catch (error) {
            console.error('Error updating subscription:', error);
            document.getElementById('status-message').textContent = 'Error updating';
            setTimeout(() => {
                document.getElementById('status-message').textContent = '';
            }, 2000);
        }
    };
    
    const outsideClickHandler = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            window.removeEventListener('click', outsideClickHandler);
        }
    };
    
    window.addEventListener('click', outsideClickHandler);
}

// Update subscription in localStorage
async function updateSubscriptionFromSheet(rowIndex, service, account, price, billingCycle, category, nextPaymentDate, paymentMethod, description) {
    try {
        console.log(`Updating subscription at index: ${rowIndex}`);
        
        const subscriptionList = getLocalSubscriptions();
        const indexToUpdate = subscriptionList.findIndex(sub => sub.index == rowIndex);
        
        if (indexToUpdate !== -1) {
            subscriptionList[indexToUpdate] = {
                ...subscriptionList[indexToUpdate],
                service: service,
                account: account,
                price: parseFloat(price),
                billingCycle: billingCycle,
                category: category,
                nextPaymentDate: nextPaymentDate,
                paymentMethod: paymentMethod,
                description: description || ''
            };
            saveLocalSubscriptions(subscriptionList);
        }
        
        return { status: 'success' };
    } catch (error) {
        console.error('Error updating subscription:', error);
        throw error;
    }
}

// Calculate next payment date based on billing cycle
function calculateNextPaymentDate(currentDate, billingCycle) {
    try {
        const date = new Date(currentDate);
        
        if (isNaN(date.getTime())) {
            return new Date().toISOString().split('T')[0];
        }
        
        switch (billingCycle) {
            case '月': 
                date.setMonth(date.getMonth() + 1);
                break;
            case '季': 
                date.setMonth(date.getMonth() + 3);
                break;
            case '年': 
                date.setFullYear(date.getFullYear() + 1);
                break;
            default:
                date.setMonth(date.getMonth() + 1);
                break;
        }
        
        return date.toISOString().split('T')[0];
    } catch (error) {
        console.error('Error calculating next payment date:', error);
        return new Date().toISOString().split('T')[0];
    }
}

// Format date for display
function formatDateForDisplay(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString; 
        }
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
        console.warn('Date formatting error:', error);
        return dateString;
    }
}

// --- Quick Add Functionality ---

// Default Quick Add Configuration
const DEFAULT_QUICK_ADDS = [
    { id: 1, label: 'Food', category: '食物', icon: 'fas fa-utensils', payment: 'Line Pay', description: 'Lunch' },
    { id: 2, label: 'Cat', category: '貓咪', icon: 'fas fa-paw', payment: 'Line Pay', description: 'Cat Food' },
    { id: 3, label: 'Transport', category: '交通', icon: 'fas fa-bus', payment: 'Line Pay', description: 'MRT/Bus' },
    { id: 4, label: 'Shopping', category: '購物', icon: 'fas fa-shopping-bag', payment: 'Credit Card', description: 'Online' }
];

// Load Quick Add settings from localStorage
function getQuickAddSettings() {
    const saved = localStorage.getItem('quickAddSettings');
    if (saved) {
        try {
            let settings = JSON.parse(saved);
            
            // Basic validation
            if (!Array.isArray(settings) || settings.length === 0) {
                return DEFAULT_QUICK_ADDS;
            }

            // Migration: Ensure IDs match the 1, 2, 3, 4 sequence
            // This fixes the issue where old IDs were strings like 'transport'
            let needsUpdate = false;
            settings = settings.map((item, index) => {
                const expectedId = index + 1;
                if (item.id != expectedId) {
                    item.id = expectedId;
                    needsUpdate = true;
                }
                return item;
            });
            
            if (needsUpdate) {
                localStorage.setItem('quickAddSettings', JSON.stringify(settings));
            }
            
            return settings;
        } catch (e) {
            console.error('Error parsing quick add settings:', e);
            return DEFAULT_QUICK_ADDS;
        }
    }
    return DEFAULT_QUICK_ADDS;
}

// Save Quick Add settings to localStorage
function saveQuickAddSettings(settings) {
    localStorage.setItem('quickAddSettings', JSON.stringify(settings));
}

// Setup Quick Add
function setupQuickAdd() {
    renderQuickAddButtons();
    setupQuickAddConfig();
    
    // Override Quick Add Click to open new Calculator Modal with preset
    window.handleQuickAddClick = function(id) {
        // Convert to number if it's a numeric string
        // This handles cases where ID is "1" vs 1
        let lookupId = id;
        if (!isNaN(parseInt(id)) && typeof id !== 'number') {
             // Try looking up as string first, if not found, try as number
             // Or just normalize everything to string for comparison?
             // Best to just check both
        }

        const settings = getQuickAddSettings();
        // Loose equality check (==) allows "1" to match 1
        const btnConfig = settings.find(b => b.id == id);
        
        if (btnConfig) {
            openCalculatorModal('expense'); // Quick add is usually for expense
            
            // Pre-select category if possible
            const cat = EXPENSE_CATEGORIES.find(c => c.label === btnConfig.category);
            if (cat) selectCategory(cat);
            
            // Pre-fill description
            if (btnConfig.description) {
                document.getElementById('calc-description').value = btnConfig.description;
            }
            
            // Note: Payment method logic is simplified in calculator view
        }
    };
}

// Render Quick Add Buttons
function renderQuickAddButtons() {
    const container = document.getElementById('quick-add-buttons-container');
    const settings = getQuickAddSettings();
    
    container.innerHTML = settings.map(btn => `
        <div class="quick-add-btn" data-id="${btn.id}" onclick="handleQuickAddClick('${btn.id}')">
            <i class="${btn.icon || 'fas fa-plus'}"></i>
            <span>${btn.label}</span>
        </div>
    `).join('');
}

// Setup Quick Add Configuration Modal
function setupQuickAddConfig() {
    const modal = document.getElementById('quick-add-config-modal');
    const editBtn = document.getElementById('edit-quick-add-btn');
    const closeBtn = document.querySelector('.close-quick-add-config');
    const cancelBtn = document.getElementById('cancel-quick-add-config');
    const form = document.getElementById('quick-add-config-form');
    const tabBtns = document.querySelectorAll('.quick-add-tabs .tab-btn');
    
    // Open modal
    editBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        loadQuickAddConfig(1); // Load first button by default
        setActiveTab(1);
    });
    
    // Close modal functions
    function closeModal() {
        modal.style.display = 'none';
    }
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.tab);
            setActiveTab(id);
            loadQuickAddConfig(id);
        });
    });
    
    function setActiveTab(id) {
        tabBtns.forEach(btn => {
            if (parseInt(btn.dataset.tab) === id) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    // Form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = parseInt(document.getElementById('quick-add-id').value);
        const label = document.getElementById('qa-label').value;
        const category = document.getElementById('qa-category').value;
        const description = document.getElementById('qa-description').value;
        const payment = document.getElementById('qa-payment').value;
        
        // Get icon based on category (simple logic for now)
        let icon = 'fas fa-star';
        if (category === '食物') icon = 'fas fa-utensils';
        else if (category === '租房') icon = 'fas fa-home';
        else if (category === '房貸') icon = 'fas fa-building';
        else if (category === '交通') icon = 'fas fa-bus';
        else if (category === '訂閱') icon = 'fas fa-calendar-check';
        else if (category === '日常用品') icon = 'fas fa-shopping-basket';
        else if (category === '貓咪') icon = 'fas fa-paw';
        else if (category === '娛樂') icon = 'fas fa-gamepad';
        else if (category === '女友') icon = 'fas fa-heart';
        else if (category === '購物') icon = 'fas fa-shopping-bag';
        else if (category === '其他') icon = 'fas fa-box';
        
        // Update settings
        const settings = getQuickAddSettings();
        const index = settings.findIndex(b => b.id === id);
        
        if (index !== -1) {
            settings[index] = { id, label, category, description, payment, icon };
            saveQuickAddSettings(settings);
            renderQuickAddButtons();
            
            // Show feedback
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Saved!';
            setTimeout(() => {
                submitBtn.textContent = originalText;
            }, 1000);
        }
    });
}

// Load config for a specific button into the form
function loadQuickAddConfig(id) {
    const settings = getQuickAddSettings();
    const config = settings.find(b => b.id === id);
    
    if (config) {
        document.getElementById('quick-add-id').value = config.id;
        document.getElementById('qa-label').value = config.label || '';
        document.getElementById('qa-category').value = config.category || '';
        document.getElementById('qa-description').value = config.description || '';
        document.getElementById('qa-payment').value = config.payment || '';
    }
}

// Function to setup income modal (Deprecated/Removed)
function setupIncomeModal() {
    // Functionality moved to unified calculator modal
}

// Function to setup income delete buttons (Deprecated/Removed)
function setupIncomeDeleteButtons() {
    // Income section removed
}

// Function to setup income delete mode (Deprecated/Removed)
function setupIncomeDeleteMode() {
    // Income section removed
}


// ===== SUBSCRIPTION MANAGEMENT =====

// Fetch subscriptions from Google Sheets
async function fetchSubscriptionsFromGoogle() {
    try {
        // Simply return subscriptions from localStorage (no network call needed)
        const subscriptions = getLocalSubscriptions();
        return subscriptions;
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        return [];
    }
}

// Get subscriptions from localStorage
function getLocalSubscriptions() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Error reading subscriptions from localStorage:', e);
        return [];
    }
}

// Add new subscription to Google Sheets
async function addSubscriptionToGoogle(subscription) {
    try {
        const statusMsg = document.getElementById('status-message');
        if (statusMsg) statusMsg.textContent = 'Adding subscription...';
        
        // Get existing subscriptions from localStorage
        const subscriptions = getLocalSubscriptions();
        
        // Add new subscription with auto-incrementing index
        const nextIndex = subscriptions.length > 0 ? Math.max(...subscriptions.map(s => s.index || 0)) + 1 : 1;
        const newSubscription = {
            index: nextIndex,
            name: subscription.name,
            amount: parseFloat(subscription.amount) || 0,
            payment: subscription.payment,
            billingDate: subscription.billingDate,
            status: 'active',
            createdAt: new Date().toISOString()
        };
        
        subscriptions.push(newSubscription);
        saveLocalSubscriptions(subscriptions);
        
        if (statusMsg) {
            statusMsg.textContent = 'Subscription added!';
            setTimeout(() => {
                if (statusMsg && statusMsg.textContent === 'Subscription added!') {
                    statusMsg.textContent = '';
                }
            }, 2000);
        }
        
        // Refresh subscriptions display
        renderSubscriptionListInline();
        
        return { success: true };
    } catch (error) {
        console.error('Error adding subscription:', error);
        const statusMsg = document.getElementById('status-message');
        if (statusMsg) {
            statusMsg.textContent = 'Failed to add subscription';
            setTimeout(() => {
                if (statusMsg && statusMsg.textContent === 'Failed to add subscription') {
                    statusMsg.textContent = '';
                }
            }, 3000);
        }
        throw error;
    }
}

// Delete subscription from localStorage
async function deleteSubscriptionFromGoogle(rowIndex) {
    try {
        const statusMsg = document.getElementById('status-message');
        if (statusMsg) statusMsg.textContent = 'Deleting subscription...';
        
        // Get subscriptions from localStorage
        let subscriptions = getLocalSubscriptions();
        
        // Find the subscription by index and remove it
        subscriptions = subscriptions.filter(sub => sub.index !== rowIndex);
        
        // Save updated subscriptions
        saveLocalSubscriptions(subscriptions);
        
        if (statusMsg) {
            statusMsg.textContent = 'Subscription deleted!';
            setTimeout(() => {
                if (statusMsg && statusMsg.textContent === 'Subscription deleted!') {
                    statusMsg.textContent = '';
                }
            }, 2000);
        }
        
        // Refresh subscriptions display
        renderSubscriptionListInline();
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting subscription:', error);
        const statusMsg = document.getElementById('status-message');
        if (statusMsg) {
            statusMsg.textContent = 'Failed to delete subscription';
            setTimeout(() => {
                if (statusMsg && statusMsg.textContent === 'Failed to delete subscription') {
                    statusMsg.textContent = '';
                }
            }, 3000);
        }
        throw error;
    }
}

// Render subscription list inline (replaces transaction list)
// Calculate next billing date
function getNextBillingDate(billingDay) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11
    const currentDate = today.getDate();
    
    const billingDayNum = parseInt(billingDay);
    
    // Create a date for the billing day in the current month
    let nextBillingDate = new Date(currentYear, currentMonth, billingDayNum);
    
    // If the billing day has already passed this month, use next month
    if (currentDate > billingDayNum) {
        nextBillingDate = new Date(currentYear, currentMonth + 1, billingDayNum);
    }
    
    return nextBillingDate;
}

// Get days until next billing date
function getDaysUntilBilling(billingDay) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight
    
    const nextBilling = getNextBillingDate(billingDay);
    nextBilling.setHours(0, 0, 0, 0); // Reset time to midnight
    
    const diffTime = nextBilling - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}

// Format date to M/D format
function formatBillingDate(billingDay) {
    const nextBilling = getNextBillingDate(billingDay);
    const month = nextBilling.getMonth() + 1;
    const date = nextBilling.getDate();
    return `${month}/${date}`;
}

function renderSubscriptionListInline() {
    const container = document.getElementById('subscription-list-container');
    if (!container) return;
    
    const subscriptions = getLocalSubscriptions();
    
    if (subscriptions.length === 0) {
        container.innerHTML = '<div class="loading-message">No subscriptions yet. Click the + button to add one!</div>';
        return;
    }
    
    // Group subscriptions by status
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
    
    if (activeSubscriptions.length === 0) {
        container.innerHTML = '<div class="loading-message">No active subscriptions</div>';
        return;
    }
    
    let html = '<div class="subscription-day-card">';
    
    html += activeSubscriptions.map(sub => {
        const amount = parseFloat(sub.amount) || 0;
        const deleteClass = isSubscriptionDeleteMode ? 'show' : '';
        
        // Calculate the next billing date
        const billingDateDisplay = formatBillingDate(sub.billingDate);
        const daysUntil = getDaysUntilBilling(sub.billingDate);
        
        // Add warning class if billing date is within 7 days
        const warningClass = daysUntil <= 7 && daysUntil > 0 ? 'warning' : '';
        
        return `
            <div class="subscription-list-item-inline ${warningClass}" onclick="showSubscriptionDetail(${sub.index})">
                <div class="subscription-item-info">
                    <div class="subscription-item-icon">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <div class="subscription-item-details">
                        <div class="subscription-item-name">${sub.name}</div>
                        <div class="subscription-item-billing">${billingDateDisplay} • ${sub.payment}</div>
                    </div>
                </div>
                <div class="subscription-item-amount">$${amount.toFixed(2)}</div>
                <button class="subscription-item-delete ${deleteClass}" onclick="handleDeleteSubscriptionInline(event, ${sub.index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');
    
    html += '</div>';
    container.innerHTML = html;
}

// Handle delete subscription inline
async function handleDeleteSubscriptionInline(event, rowIndex) {
    event.stopPropagation(); // Prevent triggering the parent click handler
    if (confirm('Are you sure you want to delete this subscription?')) {
        try {
            await deleteSubscriptionFromGoogle(rowIndex);
            renderSubscriptionListInline();
        } catch (error) {
            alert('Failed to delete subscription. Please try again.');
        }
    }
}

// Show subscription detail in a modal
function showSubscriptionDetail(subscriptionIndex) {
    const subscriptions = getLocalSubscriptions();
    const subscription = subscriptions.find(sub => sub.index === subscriptionIndex);
    
    if (!subscription) return;
    
    const daysUntil = getDaysUntilBilling(subscription.billingDate);
    const nextBillingDate = formatBillingDate(subscription.billingDate);
    const amount = parseFloat(subscription.amount) || 0;
    const createdDate = subscription.createdAt ? new Date(subscription.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
    
    // Create modal HTML with improved layout
    const modalHTML = `
        <div id="subscription-detail-modal" class="modal" style="display: flex;">
            <div class="modal-content subscription-detail-content">
                <div class="modal-header">
                    <h2>Subscription Details</h2>
                    <span class="close-subscription-detail" onclick="closeSubscriptionDetail()">&times;</span>
                </div>
                
                <div class="subscription-detail-body">
                    <div class="detail-section">
                        <div class="detail-icon">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <div class="detail-info">
                            <h3>${subscription.name}</h3>
                            <p class="detail-label">Service Name</p>
                        </div>
                    </div>
                    
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Amount</label>
                            <p class="detail-value">$${amount.toFixed(2)}</p>
                        </div>
                        
                        <div class="detail-item">
                            <label>Next Billing</label>
                            <p class="detail-value">${nextBillingDate}</p>
                        </div>
                    </div>
                    
                    <div class="detail-grid" style="grid-template-columns: 1fr;">
                        <div class="detail-item">
                            <label>Payment Method</label>
                            <p class="detail-value">${subscription.payment}</p>
                        </div>
                        
                        <div class="detail-item">
                            <label>Days Until Billing</label>
                            <p class="detail-value ${daysUntil <= 7 && daysUntil > 0 ? 'warning-text' : ''}">${daysUntil > 0 ? daysUntil + ' day' + (daysUntil !== 1 ? 's' : '') : 'Today!'}</p>
                        </div>
                    </div>
                    
                    ${createdDate ? `
                        <div class="detail-meta">
                            <strong>Created:</strong> ${createdDate}
                        </div>
                    ` : ''}
                </div>
                
                <div class="modal-footer">
                    <button class="btn-cancel" onclick="closeSubscriptionDetail()">Close</button>
                    <button class="btn-delete" onclick="deleteAndCloseSubscription(${subscriptionIndex})">Delete</button>
                </div>
            </div>
        </div>
    `;
    
    // Insert modal into page
    const existingModal = document.getElementById('subscription-detail-modal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Close modal on background click
    document.getElementById('subscription-detail-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeSubscriptionDetail();
        }
    });
}

function closeSubscriptionDetail() {
    const modal = document.getElementById('subscription-detail-modal');
    if (modal) modal.remove();
}

function deleteAndCloseSubscription(subscriptionIndex) {
    if (confirm('Are you sure you want to delete this subscription?')) {
        deleteSubscriptionFromGoogle(subscriptionIndex).then(() => {
            closeSubscriptionDetail();
            renderSubscriptionListInline();
        }).catch(error => {
            alert('Failed to delete subscription. Please try again.');
        });
    }
}

// Toggle between transactions and subscriptions view
function toggleView(view) {
    currentView = view;
    
    const transactionsView = document.getElementById('transactions-view');
    const subscriptionsView = document.getElementById('subscriptions-view');
    const toggleBtns = document.querySelectorAll('.view-toggle-btn');
    
    // Update toggle buttons
    toggleBtns.forEach(btn => {
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Show/hide views
    if (view === 'transactions') {
        transactionsView.style.display = 'block';
        subscriptionsView.style.display = 'none';
        isDeleteMode = false;
        isSubscriptionDeleteMode = false;
        // Reset delete mode button for transactions
        const deleteBtn = document.getElementById('delete-mode-btn');
        if (deleteBtn) deleteBtn.classList.remove('active');
    } else {
        transactionsView.style.display = 'none';
        subscriptionsView.style.display = 'block';
        isDeleteMode = false;
        isSubscriptionDeleteMode = false;
        renderSubscriptionListInline();
        // Reset delete mode button for subscriptions
        const deleteSubBtn = document.getElementById('delete-subscription-mode-btn');
        if (deleteSubBtn) deleteSubBtn.classList.remove('active');
    }
}

// Update subscription delete buttons visibility
function updateSubscriptionDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.subscription-item-delete');
    deleteButtons.forEach(btn => {
        if (isSubscriptionDeleteMode) {
            btn.classList.add('show');
        } else {
            btn.classList.remove('show');
        }
    });
}

// Setup subscription management with inline view
function setupSubscriptionManagement() {
    const addSubscriptionModal = document.getElementById('add-subscription-modal');
    const closeAddSubscriptionBtn = document.querySelector('.close-add-subscription-modal');
    const addForm = document.getElementById('add-subscription-form');
    const addInlineBtn = document.getElementById('add-subscription-inline-btn');
    const deleteSubscriptionModeBtn = document.getElementById('delete-subscription-mode-btn');
    const prevBillingBtn = document.getElementById('sub-prev-day');
    const nextBillingBtn = document.getElementById('sub-next-day');

    // Keep this full-screen modal outside transformed sections so fixed positioning
    // is always relative to the viewport, matching the transaction calculator.
    if (addSubscriptionModal && addSubscriptionModal.parentElement !== document.body) {
        document.body.appendChild(addSubscriptionModal);
    }
    
    // Setup view toggle buttons
    const toggleBtns = document.querySelectorAll('.view-toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleView(btn.dataset.view);
        });
    });
    
    // Add subscription button (inline)
    if (addInlineBtn) {
        addInlineBtn.addEventListener('click', () => {
            openSubscriptionCalculator();
        });
    }

    setupSubscriptionKeypad();

    if (prevBillingBtn) prevBillingBtn.addEventListener('click', () => changeSubscriptionBillingDay(-1));
    if (nextBillingBtn) nextBillingBtn.addEventListener('click', () => changeSubscriptionBillingDay(1));
    
    // Delete mode button for subscriptions
    if (deleteSubscriptionModeBtn) {
        deleteSubscriptionModeBtn.addEventListener('click', () => {
            isSubscriptionDeleteMode = !isSubscriptionDeleteMode;
            deleteSubscriptionModeBtn.classList.toggle('active', isSubscriptionDeleteMode);
            renderSubscriptionListInline();
        });
    }
    
    // Close add subscription modal
    if (closeAddSubscriptionBtn) {
        closeAddSubscriptionBtn.addEventListener('click', () => {
            closeSubscriptionCalculator();
        });
    }
    
    // Handle add subscription form submission
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            updateSubscriptionAmountDisplay();

            const amount = parseFloat(currentSubscriptionAmount);
            const billingDate = parseInt(document.getElementById('sub-billing-date').value, 10);
            if (!amount || amount <= 0) {
                alert('Please enter a valid amount');
                return;
            }
            if (!billingDate || billingDate < 1 || billingDate > 31) {
                alert('Please enter a billing day between 1 and 31');
                return;
            }
            
            const subscription = {
                name: document.getElementById('sub-name').value.trim(),
                amount: document.getElementById('sub-amount').value,
                billingDate: document.getElementById('sub-billing-date').value,
                payment: document.getElementById('sub-payment').value.trim()
            };
            
            try {
                await addSubscriptionToGoogle(subscription);
                closeSubscriptionCalculator();
                renderSubscriptionListInline();
            } catch (error) {
                alert('Failed to add subscription. Please try again.');
            }
        });
    }
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === addSubscriptionModal) {
            closeSubscriptionCalculator();
        }
    });
    
    // Initial load of subscriptions
    fetchSubscriptionsFromGoogle().then(() => {
        renderSubscriptionListInline();
    });
}

function openSubscriptionCalculator() {
    const modal = document.getElementById('add-subscription-modal');
    const form = document.getElementById('add-subscription-form');
    if (!modal || !form) return;

    syncAppViewportHeight();
    form.reset();
    currentSubscriptionAmount = '0';
    document.getElementById('sub-billing-date').value = new Date().getDate();
    updateSubscriptionAmountDisplay();
    modal.style.display = 'flex';
    lockPageScroll();
    requestAnimationFrame(syncAppViewportHeight);
}

function closeSubscriptionCalculator() {
    const modal = document.getElementById('add-subscription-modal');
    const form = document.getElementById('add-subscription-form');
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    currentSubscriptionAmount = '0';
    updateSubscriptionAmountDisplay();
    unlockPageScroll();
}

function lockPageScroll() {
    lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
}

function unlockPageScroll() {
    document.documentElement.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, lockedScrollY);
}

function setupSubscriptionKeypad() {
    document.querySelectorAll('.sub-keypad-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            createRipple(e);

            if (btn.type === 'submit') return;

            const val = btn.dataset.val;
            const action = btn.id;

            if (action === 'sub-btn-ac') {
                currentSubscriptionAmount = '0';
            } else if (action === 'sub-btn-backspace') {
                currentSubscriptionAmount = currentSubscriptionAmount.length > 1
                    ? currentSubscriptionAmount.slice(0, -1)
                    : '0';
            } else if (val) {
                if (['+', '-', '*', '/'].includes(val)) return;
                if (currentSubscriptionAmount === '0' && val !== '.') {
                    currentSubscriptionAmount = val;
                } else {
                    if (val === '.' && currentSubscriptionAmount.includes('.')) return;
                    if (currentSubscriptionAmount.length < 10) currentSubscriptionAmount += val;
                }
            }

            updateSubscriptionAmountDisplay();
        });
    });
}

function updateSubscriptionAmountDisplay() {
    const display = document.getElementById('sub-display-amount');
    const input = document.getElementById('sub-amount');
    if (display) display.textContent = currentSubscriptionAmount;
    if (input) input.value = currentSubscriptionAmount;
}

function changeSubscriptionBillingDay(delta) {
    const input = document.getElementById('sub-billing-date');
    if (!input) return;

    const currentDay = parseInt(input.value, 10) || 1;
    let nextDay = currentDay + delta;
    if (nextDay < 1) nextDay = 31;
    if (nextDay > 31) nextDay = 1;
    input.value = nextDay;
}
