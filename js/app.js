// Google Sheet ID from the URL
const SPREADSHEET_ID = '1YztC7lJq9mg2GEt92TdPWAfhH_UmFvXFQW8hKLKL798';
const SHEET_NAME = 'Expenses'; // Changed to match the Apple Shortcuts script
const INCOME_SHEET_NAME = 'Income'; // New sheet for Income
const RANGE = 'A1:F1000'; // Adjust range as needed
const INCOME_RANGE = 'A1:F1000'; // Adjust range as needed

// Subscription sheet constants
const SUBSCRIPTION_SHEET_NAME = 'Subscription';
const SUBSCRIPTION_RANGE = 'A1:H1000'; // Include all columns for subscriptions

// Google Apps Script Web App URL with the new script ID
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxfeOrbwhM2JUOP6zFPv9ivlEENtsOGzODQeBNIdlenH85hhpC0qo6RiJRVrPqq5BK0VQ/exec';

// App version to force cache refresh
const APP_VERSION = Date.now();

// Global variables for delete functionality
let isDeleteMode = false;
let transactionData = []; // Store transaction data for deletion
let incomeData = []; // Store income data
let isIncomeDeleteMode = false;
let isSubscriptionDeleteMode = false;
let subscriptionData = []; // Store subscription data for deletion
let deleteCallback = null; // Store the function to call when delete is confirmed

// Calculator Logic Variables
let currentCalcAmount = '0';
let currentCalcType = 'expense'; // 'expense' or 'income'
let currentCalcDate = new Date();
let selectedCategoryId = null;

// Categories Config
const EXPENSE_CATEGORIES = [
    { id: 'food', label: '食物', icon: 'fas fa-utensils' },
    { id: 'rent', label: '租房', icon: 'fas fa-home' },
    { id: 'transport', label: '交通', icon: 'fas fa-bus' },
    { id: 'subscription', label: '訂閱', icon: 'fas fa-calendar-check' },
    { id: 'daily', label: '日常用品', icon: 'fas fa-shopping-basket' },
    { id: 'cat', label: '貓咪', icon: 'fas fa-paw' },
    { id: 'entertainment', label: '娛樂', icon: 'fas fa-gamepad' },
    { id: 'gf', label: '女友', icon: 'fas fa-heart' },
    { id: 'shopping', label: '購物', icon: 'fas fa-shopping-bag' },
    { id: 'other', label: '其他', icon: 'fas fa-box' }
];

const INCOME_CATEGORIES = [
    { id: 'salary', label: '薪水', icon: 'fas fa-money-bill-wave' },
    { id: 'bonus', label: '獎金', icon: 'fas fa-star' },
    { id: 'invest', label: '投資', icon: 'fas fa-chart-line' },
    { id: 'gift', label: '禮金', icon: 'fas fa-gift' },
    { id: 'parttime', label: '兼職', icon: 'fas fa-briefcase' },
    { id: 'other', label: '其他', icon: 'fas fa-box' }
];

// Function to fetch data from the published Google Sheet
async function fetchExpenseData() {
    try {
        // Fetch data from Google Apps Script to ensure we get proper text values
        // This avoids GVIZ type inference issues where text in mixed columns is dropped
        const url = `${SCRIPT_URL}?action=getData&sheetName=${SHEET_NAME}&spreadsheetId=${SPREADSHEET_ID}&v=${Date.now()}`;
        
        // Show loading status
        const statusMsg = document.getElementById('status-message');
        if (statusMsg) statusMsg.textContent = 'Loading...';
        
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
            // mode: 'cors' is default and required to read body
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const resultJson = await response.json();
        
        if (resultJson.status !== 'success' || !resultJson.data) {
            // Check for specific "Invalid action" error which means old script version
            if (resultJson.message === 'Invalid action specified') {
                showRedeployWarning();
            }
            throw new Error(resultJson.message || 'Failed to load data');
        }
        
        const rows = resultJson.data;
        
        // Hide warning if successful
        hideRedeployWarning();
        
        // Store the raw data for deletion purposes
        // Reset arrays
        transactionData = [];
        incomeData = [];

        rows.slice(1).forEach((row, index) => {
            // Ensure we have enough columns, pad with empty strings if needed
            const safeRow = [...row]; 
            while (safeRow.length < 4) safeRow.push('');
            
            const amountVal = parseFloat(String(safeRow[1]).replace(/[^0-9.-]/g, ''));
            const isExpense = amountVal < 0;

            const item = {
                index: index + 1, // +1 because row 0 is headers
                date: safeRow[0],
                amount: safeRow[1],
                category: safeRow[2],
                description: safeRow[3],
                type: isExpense ? 'expense' : 'income'
            };

            if (isExpense) {
                transactionData.push(item);
            } else {
                incomeData.push(item);
            }
        });
        
        // Convert to the format expected by the chart functions
        // Charts expect { table: { rows: [{ c: [{v: val}, ...] }] } }
        const chartResult = {
            table: {
                cols: rows[0].map(header => ({ label: header })),
                rows: rows.slice(1).map(row => ({
                    c: row.map(cell => ({ v: cell }))
                }))
            }
        };
        
        // Process and display the data
        updateTransactionsList();
        updateExpenseCharts();
        
        // Update balance
        updateBalance();
        
        // Clear loading status
        if (statusMsg) {
            statusMsg.textContent = 'Updated';
            setTimeout(() => {
                if (statusMsg.textContent === 'Updated') {
                    statusMsg.textContent = '';
                }
            }, 2000);
        }
        
        return Promise.resolve(chartResult);
    } catch (error) {
        console.error('Error fetching expense data:', error);
        
        // Fallback to CSV method if Script API fails (e.g. not redeployed yet)
        console.log('Falling back to CSV fetch...');
        
        // Only show warning if we aren't already showing it from the specific error above
        if (!document.getElementById('redeploy-warning')) {
             // If we are falling back, it implies the backend isn't ready or accessible
             // We can show a generic "Using offline/backup mode" or just the redeploy warning if it's likely the cause
             // For now, let's assumes if the API failed, we might be on old version
             // But we don't want to annoy user if it's just a network glitch.
             // However, the "Invalid action" check above is the robust one.
        }
        
        return fetchExpenseDataCSV();
    }
}

// Function to show redeploy warning
function showRedeployWarning() {
    let warningEl = document.getElementById('redeploy-warning');
    if (!warningEl) {
        warningEl = document.createElement('div');
        warningEl.id = 'redeploy-warning';
        warningEl.style.cssText = 'position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #ff3b30; color: white; padding: 12px 20px; border-radius: 50px; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 9999; text-align: center; width: 90%; max-width: 400px;';
        warningEl.innerHTML = '⚠️ System Update Required<br><span style="font-size:12px; opacity:0.9">Please redeploy Google Apps Script (Select "New Version") to see descriptions.</span>';
        document.body.appendChild(warningEl);
        
        // Allow dismissing
        warningEl.onclick = () => warningEl.remove();
    }
}

function hideRedeployWarning() {
    const warningEl = document.getElementById('redeploy-warning');
    if (warningEl) warningEl.remove();
}

// Fallback function using CSV (Old Method)
async function fetchExpenseDataCSV() {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}&range=${RANGE}&v=${Date.now()}`;
        
        const response = await fetch(url, {
            cache: 'no-store',
            headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
        });
        
        const csvText = await response.text();
        const rows = parseCSV(csvText);
        
        transactionData = rows.slice(1).map((row, index) => {
            const safeRow = [...row]; 
            while (safeRow.length < 4) safeRow.push('');
            
            return {
                index: index + 1,
                date: safeRow[0],
                amount: safeRow[1],
                category: safeRow[2],
                description: safeRow[3],
                type: 'expense'
            };
        });
        
        const result = {
            table: {
                cols: rows[0].map(header => ({ label: header })),
                rows: rows.slice(1).map(row => ({
                    c: row.map(cell => ({ v: cell }))
                }))
            }
        };
        
        updateTransactionsList();
        updateExpenseCharts(result);
        updateBalance();
        
        return Promise.resolve(result);
    } catch (error) {
        console.error('CSV Fallback failed:', error);
        const statusMsg = document.getElementById('status-message');
        if (statusMsg) statusMsg.textContent = 'Connection error';
        return Promise.reject(error);
    }
}

// Function to fetch income data from the published Google Sheet
async function fetchIncomeData() {
    // Deprecated: Income is now fetched from the main Expenses sheet
    return Promise.resolve({ rows: [] });
}

// Fallback for Income CSV
async function fetchIncomeDataCSV() {
    // Deprecated
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
    
    if (allTransactions.length === 0) {
        container.innerHTML = `
            <div class="empty-subscriptions" style="text-align:center; padding: 40px; color: var(--text-secondary);">
                <i class="fas fa-receipt" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>No transactions found.</p>
            </div>
        `;
        return;
    }
    
    // Sort by date descending (use local date key for consistent order)
    allTransactions.sort((a, b) => {
        const keyA = toLocalDateKey(a.date);
        const keyB = toLocalDateKey(b.date);
        if (keyA !== keyB) return keyB.localeCompare(keyA);
        return 0;
    });
    
    // Group by Date (use local calendar date so sheet date matches display)
    const grouped = {};
    allTransactions.forEach(t => {
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
            
            const amountStyle = isIncome ? 'color: #4cd964;' : 'color: #000;'; 
            
            // Get Icon and Color
            let iconClass = 'fas fa-question';
            let catConfig = null;
            if (isIncome) {
                catConfig = INCOME_CATEGORIES.find(c => c.label === t.category || c.id === t.category);
            } else {
                catConfig = EXPENSE_CATEGORIES.find(c => c.label === t.category || c.id === t.category);
            }
            if (catConfig) iconClass = catConfig.icon;
            
            // Pick distinct color based on category name
            // Simple hash function to get consistent color for same category
            let hash = 0;
            for (let i = 0; i < t.category.length; i++) {
                hash = t.category.charCodeAt(i) + ((hash << 5) - hash);
            }
            const bgIndex = (Math.abs(hash) % 12) + 1; // 1-12
            
            // All transactions (Expense AND Income) are now in the same SHEET_NAME ('Expenses')
            const sheetName = SHEET_NAME;
            
            html += `
                <div class="transaction-item" onclick="/* Open details? */">
                    <div class="trans-icon-wrapper icon-bg-${bgIndex}">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="trans-content">
                        <span class="trans-category">${t.category}</span>
                        ${(t.description && String(t.description).trim() !== '') ? `<span class="trans-desc">${t.description}</span>` : ''}
                    </div>
                    <span class="trans-amount" style="${amountStyle}">${amountDisplay}</span>
                    
                    <div class="trans-delete-wrapper">
                        <button class="list-delete-btn" data-row-index="${t.index}" data-sheet="${sheetName}">
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
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const parseAmount = (str) => {
        return parseFloat(String(str).replace(/[^0-9.-]+/g, '')) || 0;
    };
    
    const isCurrentMonth = (dateStr) => {
        try {
            const key = toLocalDateKey(dateStr);
            if (!key) return false;
            const [y, mo] = key.split('-').map(Number);
            return mo === currentMonth + 1 && y === currentYear;
        } catch (e) { return false; }
    };
    
    let monthlyExpense = 0;
    let monthlyIncome = 0;

    // Calculate totals from both transactionData (expenses) and incomeData (income)
    const allItems = [...transactionData, ...incomeData];
    
    allItems.forEach(item => {
        if (isCurrentMonth(item.date)) {
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
        balanceEl.style.color = monthlyLeft >= 0 ? '#4cd964' : '#ff3b30';
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
                backgroundColor: 'rgba(14, 165, 233, 0.2)',
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
                        color: 'rgba(161, 161, 170, 0.4)'
                    },
                    grid: {
                        display: false
                    }
                },
                x: {
                    ticks: {
                        color: 'rgba(161, 161, 170, 0.4)'
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
                backgroundColor: ['rgba(14, 165, 233, 0.2)'],
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
        const sheetName = this.getAttribute('data-sheet') || SHEET_NAME; // Get sheet name
        
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
                if (sheetName === SHEET_NAME) { // Expenses sheet
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
                     
                     // Update Charts and Balance with new data
                     updateBalance();
                     updateExpenseCharts();
                }

                // Close modal immediately
                closeDeleteModal();
                
                // Show "Deleting" status quietly
                const statusMsg = document.getElementById('status-message');
                if (statusMsg) statusMsg.textContent = 'Deleting...';
                
                // Calculate the actual row index in the spreadsheet (add 1 for header row)
                const actualRowIndex = parseInt(rowIndex) + 1;
                
                // Delete from Google Sheet in background
                deleteTransactionFromSheet(actualRowIndex, sheetName)
                    .then(() => {
                        if (statusMsg) statusMsg.textContent = 'Deleted';
                        setTimeout(() => {
                            if (statusMsg && statusMsg.textContent === 'Deleted') statusMsg.textContent = '';
                        }, 2000);
                        
                        // Sync real state
                        fetchExpenseData();
                    })
                    .catch(error => {
                        console.error('Error deleting transaction:', error);
                        if (statusMsg) statusMsg.textContent = 'Error deleting';
                        alert('Failed to delete from sheet. Please refresh.');
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

// Function to delete transaction from Google Sheet (modified to accept sheetName)
async function deleteTransactionFromSheet(rowIndex, sheetName = SHEET_NAME) {
    // Check if we have a deployed Google Apps Script Web App URL
    if (!SCRIPT_URL || SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
        console.warn('No Google Apps Script Web App URL configured. Transaction will not be deleted from Google Sheet.');
        
        // For demo purposes, we'll just simulate a successful API call
        return new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
        console.log('Deleting transaction at row:', rowIndex);
        
        // Build URL with all parameters since no-cors mode doesn't properly send JSON body
        const url = `${SCRIPT_URL}?action=delete&rowIndex=${rowIndex}&spreadsheetId=${SPREADSHEET_ID}&sheetName=${sheetName}&v=${Date.now()}`;
        
        // Send the request to Google Apps Script Web App
        const response = await fetch(url, {
            method: 'GET', // Changed to GET since we're passing parameters in URL
            mode: 'no-cors', // This is important for cross-origin requests to Google Apps Script
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            redirect: 'follow'
        });
        
        // Note: Due to 'no-cors' mode, we won't be able to read the response
        // We'll assume it was successful if no error was thrown
        
        return true;
    } catch (error) {
        console.error('Error deleting transaction from Google Sheet:', error);
        throw error;
    }
}

// Function to create the monthly expense chart
function createMonthlyExpenseChart(monthlyExpenses) {
    const ctx = document.getElementById('monthly-chart').getContext('2d');
    
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
                gradient.addColorStop(0, 'rgba(14, 165, 233, 0.8)');
                gradient.addColorStop(1, 'rgba(6, 182, 212, 0.8)');
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
                    backgroundColor: 'rgba(28, 31, 38, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(14, 165, 233, 0.3)',
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
                        color: 'rgba(161, 161, 170, 0.8)',
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
                        color: 'rgba(161, 161, 170, 0.8)',
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
    
    // Enhanced color palette with more variety
    const colors = [
        'rgba(14, 165, 233, 0.85)',  // Blue
        'rgba(236, 72, 153, 0.85)',  // Pink
        'rgba(34, 197, 94, 0.85)',   // Green
        'rgba(250, 204, 21, 0.85)',  // Yellow
        'rgba(168, 85, 247, 0.85)',  // Purple
        'rgba(249, 115, 22, 0.85)',  // Orange
        'rgba(6, 182, 212, 0.85)',   // Cyan
        'rgba(16, 185, 129, 0.85)',  // Emerald
        'rgba(239, 68, 68, 0.85)',   // Red
        'rgba(79, 70, 229, 0.85)',   // Indigo
        'rgba(20, 184, 166, 0.85)',  // Teal
        'rgba(245, 158, 11, 0.85)',  // Amber
        'rgba(217, 70, 239, 0.85)',  // Fuchsia
        'rgba(59, 130, 246, 0.85)',  // Light Blue
        'rgba(132, 204, 22, 0.85)'   // Lime
    ];
    
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
            borderColor: '#0f1115',
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
                        color: 'rgba(161, 161, 170, 0.8)',
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
                    backgroundColor: 'rgba(28, 31, 38, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(14, 165, 233, 0.3)',
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
        
        // Hide all modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Initialize sections
        initializeSections();
        
        // Setup delete modal
        setupDeleteModal();
        
        // Setup navigation
        setupNavigation();
        
        // Add ripple effect to buttons
        document.querySelectorAll('.btn-primary, .btn-secondary, .btn-danger').forEach(button => {
            button.addEventListener('click', createRipple);
        });
        
        // Setup transaction modal (New Calculator)
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
        
        // Setup subscription modal (Removed)
        // setupSubscriptionModal();
        
        // Setup delete mode
        setupDeleteMode();
        
        // Setup subscription delete mode (Removed)
        // setupSubscriptionDeleteMode();
        
        // Setup refresh button
        setupRefreshButton();
        
        // Setup Quick Add Buttons
        setupQuickAdd();
        
        // Setup Budget Logic
        setupBudgetSection();
        
        // Create empty charts initially
        createEmptyCharts();
        
        // Fetch expense data from Google Sheet
        await fetchExpenseData();
        
        // Fetch income data
        await fetchIncomeData();
        
        // Fetch subscription data from Google Sheet (Removed)
        // await fetchSubscriptionData();
        
    } catch (error) {
        console.error('Error initializing app:', error);
    }
});

// --- Budget Page Logic ---

function setupBudgetSection() {
    // Load budget from localStorage
    let monthlyBudget = parseFloat(localStorage.getItem('monthlyBudget')) || 0;
    updateBudgetUI(monthlyBudget);
    
    // Setup Edit Button
    const editBtn = document.getElementById('edit-budget-btn');
    const modal = document.getElementById('budget-modal');
    const closeBtn = document.querySelector('.close-budget-modal');
    const saveBtn = document.getElementById('save-budget-btn');
    const budgetInput = document.getElementById('budget-input');
    
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            budgetInput.value = monthlyBudget;
            modal.style.display = 'block';
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const newBudget = parseFloat(budgetInput.value);
            if (!isNaN(newBudget) && newBudget >= 0) {
                monthlyBudget = newBudget;
                localStorage.setItem('monthlyBudget', monthlyBudget);
                updateBudgetUI(monthlyBudget);
                modal.style.display = 'none';
            } else {
                alert('Please enter a valid budget amount.');
            }
        });
    }
}

function updateBudgetUI(budget) {
    // Calculate Total Spent for current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let totalSpent = 0;
    
    // Use transactionData (which contains expenses as negative values)
    if (transactionData) {
        transactionData.forEach(item => {
            // Check if it's an expense and in current month
            // Note: toLocalDateKey handles the date string
            const dateStr = toLocalDateKey(item.date);
            if (!dateStr) return;
            
            const [y, mo, d] = dateStr.split('-').map(Number);
            // Check if same month/year
            if (y === currentYear && mo === currentMonth + 1) {
                 const amountVal = parseFloat(String(item.amount).replace(/[^0-9.-]+/g, ''));
                 if (!isNaN(amountVal) && amountVal < 0) {
                     totalSpent += Math.abs(amountVal);
                 }
            }
        });
    }
    
    const remaining = budget - totalSpent;
    const percentage = budget > 0 ? Math.min((remaining / budget) * 100, 100) : 0;
    const spentPercentage = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;
    
    // Update Text
    const budgetDisplay = document.getElementById('total-budget-display');
    const spentDisplay = document.getElementById('total-spent-display');
    const remainingDisplay = document.getElementById('budget-remaining');
    
    if (budgetDisplay) budgetDisplay.textContent = `$${budget.toLocaleString()}`;
    if (spentDisplay) spentDisplay.textContent = `$${totalSpent.toLocaleString()}`;
    if (remainingDisplay) {
        remainingDisplay.textContent = `$${remaining.toLocaleString()}`;
        remainingDisplay.style.color = remaining >= 0 ? '#4cd964' : '#ff3b30';
    }
    
    // Update Circle Progress
    const circle = document.getElementById('budget-progress-circle');
    if (circle) {
        // Calculate stroke-dasharray
        // 100 is full circle
        // We want to show REMAINING percentage? Or SPENT?
        // Usually budget circles show how much is LEFT or how much is SPENT.
        // Let's show SPENT as the progress (filling up), and color changes if over budget.
        
        // Actually, user asked for "Budget Left".
        // Let's make the circle full (100) and reduce it as you spend? 
        // Or start empty and fill up as you spend?
        // Let's fill up as you spend.
        
        circle.setAttribute('stroke-dasharray', `${spentPercentage}, 100`);
        
        if (remaining < 0) {
            circle.style.stroke = '#ff3b30'; // Red if over budget
        } else if (spentPercentage > 80) {
            circle.style.stroke = '#ff9500'; // Orange if near limit
        } else {
            circle.style.stroke = '#4cd964'; // Green otherwise
        }
    }
}

// Hook into updateBalance/fetchData to refresh budget UI when data changes
const originalUpdateBalance = updateBalance;
updateBalance = function() {
    originalUpdateBalance();
    const budget = parseFloat(localStorage.getItem('monthlyBudget')) || 0;
    updateBudgetUI(budget);
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
    if (closeBtn) closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    });
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
}

function openCalculatorModal(type = 'expense') {
    const modal = document.getElementById('add-modal');
    modal.style.display = 'flex'; // Use flex to center/align
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Reset State
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
            <div class="cat-icon-circle">
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
    
    // Optimistic UI Update: Immediately add to local state
    const newItem = {
        index: -1, // Temporary index, will be fixed on next sync
        date: toLocalDateKey(currentCalcDate), // Use local date helper
        amount: amount,
        category: categoryLabel,
        description: description,
        type: currentCalcType
    };
    
    if (currentCalcType === 'expense') {
        transactionData.push(newItem);
    } else {
        incomeData.push(newItem);
    }
    
    // Update UI components immediately
    updateTransactionsList();
    updateBalance();
    updateExpenseCharts();
    
    // Close modal immediately
    document.getElementById('add-modal').style.display = 'none';
    document.body.style.overflow = '';
    
    // Show quiet "Saving..." message
    const statusMsg = document.getElementById('status-message');
    if (statusMsg) statusMsg.textContent = 'Saving...';

    // Submit to backend in background
    try {
        await addTransactionToSheet(
            currentCalcDate, 
            amount, 
            categoryLabel, 
            description,
            SHEET_NAME 
        );
        
        if (statusMsg) {
            statusMsg.textContent = 'Saved';
            setTimeout(() => { if (statusMsg.textContent === 'Saved') statusMsg.textContent = ''; }, 2000);
        }
        
        // Silent sync to update row indices
        fetchExpenseData(); 
        
    } catch (error) {
        console.error(error);
        alert('Error syncing transaction to sheet. Please check connection.');
        // Optionally revert local change here if needed, but for now we assume it eventually syncs or user refreshes
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
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
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
            }
        });
    });
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

// Function to add transaction to Google Sheet
async function addTransactionToSheet(date, amount, category, description, sheetName = SHEET_NAME) {
    // Check if we have a deployed Google Apps Script Web App URL
    if (!SCRIPT_URL || SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
        console.warn('No Google Apps Script Web App URL configured. Transaction will only be added to UI.');
        
        // For demo purposes, we'll just simulate a successful API call
        return new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
        // Format the date to YYYY-MM-DD in LOCAL time (avoid UTC shift)
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        // Convert amount to a number to ensure proper formatting
        const numericAmount = parseFloat(amount);
        
        // Build URL with parameters
        const url = new URL(SCRIPT_URL);
        
        // Determine action based on sheet name
        url.searchParams.append('action', 'addTransaction');
        
        url.searchParams.append('date', formattedDate);
        url.searchParams.append('amount', numericAmount);
        url.searchParams.append('category', category);
        url.searchParams.append('description', description || '');
        url.searchParams.append('spreadsheetId', SPREADSHEET_ID);
        url.searchParams.append('sheetName', sheetName);
        url.searchParams.append('v', Date.now());
        
        // Send the request to Google Apps Script Web App
        const response = await fetch(url.toString(), {
            method: 'GET', // Using GET with URL parameters
            mode: 'no-cors',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            redirect: 'follow'
        });
        
        // Note: Due to 'no-cors' mode, we won't be able to read the response
        // We'll assume it was successful if no error was thrown
        
        return true;
    } catch (error) {
        console.error('Error adding transaction to Google Sheet:', error);
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
                
                // Fetch expense data
                await fetchExpenseData();
                
                // Fetch income data
                await fetchIncomeData();
                
                // Fetch subscription data
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

// Function to fetch subscription data from the Google Sheet
async function fetchSubscriptionData() {
    try {
        // Using the CSV export approach which is more reliable
        // Add current timestamp to bust cache effectively
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SUBSCRIPTION_SHEET_NAME}&range=${SUBSCRIPTION_RANGE}&v=${Date.now()}`;
        
        const response = await fetch(url, {
            cache: 'no-store', // Force fetch from network, not cache
            headers: {
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache'
            }
        });
        
        const csvText = await response.text();
        
        // Parse CSV data
        const rows = parseCSV(csvText);
        
        // Store the raw data for deletion purposes
        subscriptionData = rows.slice(1).map((row, index) => ({
            index: index + 1, // +1 because row 0 is headers
            service: row[0],
            account: row[1],
            price: row[2],
            billingCycle: row[3],
            category: row[4],
            nextPaymentDate: row[5],
            paymentMethod: row[6],
            description: row[7]
        }));
        
        // Convert to the format expected by the rest of the code
        const result = {
            table: {
                cols: rows[0].map(header => ({ label: header })),
                rows: rows.slice(1).map(row => ({
                    c: row.map(cell => ({ v: cell }))
                }))
            }
        };
        
        // Process and display the data
        await displaySubscriptionData(result);
        
        return Promise.resolve(result);
    } catch (error) {
        console.error('Error fetching subscription data:', error);
        return Promise.reject(error);
    }
}

// Function to display subscription data
async function displaySubscriptionData(data) {
    if (!data) return;
    
    const container = document.getElementById('subscription-cards-container');
    
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

// Function to add subscription to Google Sheet
async function addSubscriptionToSheet(service, account, price, billingCycle, category, nextPaymentDate, paymentMethod, description) {
    // Check if we have a deployed Google Apps Script Web App URL
    if (!SCRIPT_URL || SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
        console.warn('No Google Apps Script Web App URL configured. Subscription will only be added to UI.');
        return new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
        const formattedDate = new Date(nextPaymentDate).toISOString().split('T')[0];
        const numericPrice = parseFloat(price);
        
        const url = new URL(SCRIPT_URL);
        url.searchParams.append('action', 'addSubscription');
        url.searchParams.append('service', service);
        url.searchParams.append('account', account);
        url.searchParams.append('price', numericPrice);
        url.searchParams.append('billingCycle', billingCycle);
        url.searchParams.append('category', category);
        url.searchParams.append('nextPaymentDate', formattedDate);
        url.searchParams.append('paymentMethod', paymentMethod);
        url.searchParams.append('description', description || '');
        url.searchParams.append('spreadsheetId', SPREADSHEET_ID);
        url.searchParams.append('sheetName', SUBSCRIPTION_SHEET_NAME);
        url.searchParams.append('v', Date.now());
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            redirect: 'follow'
        });
        
        return true;
    } catch (error) {
        console.error('Error adding subscription to Google Sheet:', error);
        throw error;
    }
}

// Function to delete subscription from Google Sheet
async function deleteSubscriptionFromSheet(rowIndex) {
    if (!SCRIPT_URL || SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
        console.warn('No Google Apps Script Web App URL configured.');
        return new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
        const actualRowIndex = parseInt(rowIndex) + 1;
        console.log('Deleting subscription at row:', actualRowIndex);
        
        const url = `${SCRIPT_URL}?action=deleteSubscription&rowIndex=${actualRowIndex}&spreadsheetId=${SPREADSHEET_ID}&sheetName=${SUBSCRIPTION_SHEET_NAME}&v=${Date.now()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            redirect: 'follow'
        });
        
        return true;
    } catch (error) {
        console.error('Error deleting subscription from Google Sheet:', error);
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

// Update subscription in the Google Sheet
async function updateSubscriptionFromSheet(rowIndex, service, account, price, billingCycle, category, nextPaymentDate, paymentMethod, description) {
    try {
        const actualRowIndex = parseInt(rowIndex) + 1;
        
        console.log(`Updating subscription at row index: ${actualRowIndex}`);
        
        const url = new URL(SCRIPT_URL);
        url.searchParams.append('action', 'updateSubscription');
        url.searchParams.append('rowIndex', actualRowIndex);
        url.searchParams.append('service', service);
        url.searchParams.append('account', account);
        url.searchParams.append('price', price);
        url.searchParams.append('billingCycle', billingCycle);
        url.searchParams.append('category', category);
        url.searchParams.append('nextPaymentDate', nextPaymentDate);
        url.searchParams.append('paymentMethod', paymentMethod);
        url.searchParams.append('description', description || '');
        url.searchParams.append('sheetName', 'Subscription');
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
        });
        
        const result = await response.json();
        
        if (result.status !== 'success') {
            throw new Error(result.message || 'Failed to update subscription');
        }
        
        return result;
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
