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
        
        // Format Date Header (e.g. 2026/02/09 星期一) - parse as local date so it matches sheet
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

let monthlyTrendCategory = 'total';

function setupMonthlyCategoryFilter() {
    const picker = document.querySelector('.trend-category-picker');
    const trigger = document.getElementById('monthly-category-filter-btn');
    const menu = document.getElementById('monthly-category-menu');
    const triggerLabel = document.getElementById('monthly-category-filter-label');
    const triggerIcon = document.getElementById('monthly-category-filter-icon');
    if (!picker || !trigger || !menu || !triggerLabel || !triggerIcon) return;

    const choices = [
        { id: 'total', label: 'Total expenses', icon: 'fas fa-layer-group' },
        ...EXPENSE_CATEGORIES
    ];

    function closeMenu({ returnFocus = false } = {}) {
        menu.classList.remove('active');
        trigger.setAttribute('aria-expanded', 'false');
        if (returnFocus) trigger.focus();
    }

    function selectChoice(choice) {
        monthlyTrendCategory = choice.id;
        triggerLabel.textContent = choice.label;
        triggerIcon.className = choice.icon;
        menu.querySelectorAll('.trend-category-option').forEach(option => {
            const selected = option.dataset.category === choice.id;
            option.classList.toggle('selected', selected);
            option.setAttribute('aria-selected', String(selected));
        });
        closeMenu({ returnFocus: true });
        updateExpenseCharts();
    }

    choices.forEach(choice => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'trend-category-option';
        option.dataset.category = choice.id;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(choice.id === monthlyTrendCategory));
        option.classList.toggle('selected', choice.id === monthlyTrendCategory);
        option.innerHTML = `
            <span class="trend-category-option-icon" style="${choice.id === 'total' ? '' : getCategoryVisualStyle(choice)}">
                <i class="${choice.icon}" aria-hidden="true"></i>
            </span>
            <span>${choice.label}</span>
            <i class="fas fa-check trend-category-option-check" aria-hidden="true"></i>
        `;
        option.addEventListener('click', () => selectChoice(choice));
        menu.appendChild(option);
    });

    trigger.addEventListener('click', () => {
        const opening = !menu.classList.contains('active');
        menu.classList.toggle('active', opening);
        trigger.setAttribute('aria-expanded', String(opening));
        if (opening) {
            menu.querySelector('.trend-category-option.selected')?.focus();
        }
    });

    document.addEventListener('click', event => {
        if (!picker.contains(event.target)) closeMenu();
    });

    picker.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menu.classList.contains('active')) {
            event.preventDefault();
            closeMenu({ returnFocus: true });
            return;
        }

        if (menu.classList.contains('active') && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const options = [...menu.querySelectorAll('.trend-category-option')];
            const currentIndex = options.indexOf(document.activeElement);
            let nextIndex = currentIndex;

            if (event.key === 'Home') nextIndex = 0;
            if (event.key === 'End') nextIndex = options.length - 1;
            if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1 + options.length) % options.length;
            if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + options.length) % options.length;

            options[nextIndex]?.focus();
        }
    });
}

// Function to update expense charts (Refactored to use local transactionData)
async function updateExpenseCharts() {
    if (!transactionData || transactionData.length === 0) {
        createEmptyCharts();
        return;
    }

    // Monthly trend uses ALL data (filtering to one month would make it pointless)
    const monthlyTotals = {};
    const monthlyCategoryExpenses = {};
    const selectedCategory = EXPENSE_CATEGORIES.find(category => category.id === monthlyTrendCategory);

    // Category pie + top categories filter to the currently selected month
    const categoryTotals = {};

    transactionData.forEach(item => {
        if (item.type !== 'expense') return;

        const amountVal = parseFloat(String(item.amount).replace(/[^0-9.-]+/g, ''));
        if (isNaN(amountVal) || amountVal >= 0) return;

        const absAmount = Math.abs(amountVal);
        const dateStr = toLocalDateKey(item.date);

        // Monthly trend bar chart — accumulate all months
        if (dateStr) {
            const [y, mo] = dateStr.split('-').map(Number);
            const monthKey = `${y}-${String(mo).padStart(2, '0')}`;
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + absAmount;
            monthlyCategoryExpenses[monthKey] = monthlyCategoryExpenses[monthKey] || 0;

            if (selectedCategory && (item.category === selectedCategory.id || item.category === selectedCategory.label)) {
                monthlyCategoryExpenses[monthKey] += absAmount;
            }

            // Category pie — only the selected month
            if (mo === selectedMonth && y === selectedYear) {
                const category = item.category || 'Uncategorized';
                categoryTotals[category] = (categoryTotals[category] || 0) + absAmount;
            }
        }
    });

    if (Object.keys(monthlyTotals).length > 0) {
        const isTotal = monthlyTrendCategory === 'total';
        createMonthlyExpenseChart(
            isTotal ? monthlyTotals : monthlyCategoryExpenses,
            isTotal ? 'Total expenses' : selectedCategory?.label || 'Selected category'
        );
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

function setupBalanceSummaryDisclosure() {
    const toggle = document.getElementById('balance-summary-toggle');
    const details = document.getElementById('monthly-summary-details');
    if (!toggle || !details) return;

    details.inert = true;

    toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(expanded));
        toggle.setAttribute('aria-label', `${expanded ? 'Hide' : 'Show'} monthly income and expense details`);
        details.classList.toggle('is-collapsed', !expanded);
        details.setAttribute('aria-hidden', String(!expanded));
        details.inert = !expanded;
    });
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
function createMonthlyExpenseChart(monthlyExpenses, datasetLabel = 'Total expenses') {
    const ctx = document.getElementById('monthly-chart').getContext('2d');
    const themeMeta = THEME_META[currentTheme];
    
    // Sort YYYY-MM keys chronologically so the x-axis reads past -> now.
    const sortedMonths = Object.keys(monthlyExpenses).sort();
    const monthLabels = sortedMonths.map(monthKey => {
        const [year, month] = monthKey.split('-').map(Number);
        return new Date(year, month - 1, 1).toLocaleString('default', { month: 'short' });
    });
    const monthColors = sortedMonths.map((month, index) => {
        return themeMeta.categoryChartColors[index % themeMeta.categoryChartColors.length];
    });
    
    const chartData = {
        labels: monthLabels,
        datasets: [{
            label: datasetLabel,
            data: sortedMonths.map(month => monthlyExpenses[month]),
            backgroundColor: monthColors,
            hoverBackgroundColor: monthColors,
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
        setupBalanceSummaryDisclosure();
        
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

        const navAddBtn = document.getElementById('nav-add-transaction');
        if (navAddBtn) {
            navAddBtn.addEventListener('click', () => openCalculatorModal('expense'));
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
        setupStatsMonthSelector();
        setupMonthlyCategoryFilter();
        
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

});


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
    const budgetCalcKeys = document.querySelectorAll('.budget-calc-key');
    
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
    
    function saveCurrentBudget() {
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
    }

    function appendBudgetDigit(key) {
        const current = amountInput.value || '';
        if (key === 'clear') {
            amountInput.value = '';
            return;
        }
        if (key === 'backspace') {
            amountInput.value = current.slice(0, -1);
            return;
        }
        if (key === '.') {
            if (!current.includes('.')) amountInput.value = current ? `${current}.` : '0.';
            return;
        }
        if (current === '0' && key !== '00') {
            amountInput.value = key;
            return;
        }
        amountInput.value = `${current}${key}`;
    }

    budgetCalcKeys.forEach(keyBtn => {
        keyBtn.addEventListener('click', () => {
            const key = keyBtn.dataset.budgetKey;
            if (key === 'save') {
                saveCurrentBudget();
                return;
            }
            appendBudgetDigit(key);
        });
    });

    if (saveBtn) {
        saveBtn.addEventListener('click', saveCurrentBudget);
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
                     // Note: item.category stores the label (e.g. "食物"), not ID.
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
        remainingDisplay.style.color = remaining >= 0
            ? getCssVar('--budget-remaining-color', '#4cd964')
            : getCssVar('--danger-color', '#ff3b30');
    }
    
    // Update Circle Progress
    const circle = document.getElementById('budget-progress-circle');
    if (circle) {
        circle.setAttribute('stroke-dasharray', `${spentPercentage}, 100`);
        circle.style.stroke = 'url(#budget-circle-gradient)';
        if (remaining < 0) {
            updateBudgetCircleGradient(
                getCssVar('--budget-circle-danger-start', '#ff7a1a'),
                getCssVar('--budget-circle-danger-middle', '#ff3d5a'),
                getCssVar('--budget-circle-danger-end', '#c026d3')
            );
        } else if (spentPercentage > 80) {
            updateBudgetCircleGradient(
                getCssVar('--budget-circle-warning-start', '#ffd166'),
                getCssVar('--budget-circle-warning-middle', '#ff9500'),
                getCssVar('--budget-circle-warning-end', '#ff7a1a')
            );
        } else {
            updateBudgetCircleGradient(
                getCssVar('--budget-circle-start', '#4ade80'),
                getCssVar('--budget-circle-middle', '#28d6c8'),
                getCssVar('--budget-circle-end', '#45a3ff')
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
                const overAmount = spent - budget;
                
                // Color logic
                let progressClass = '';
                if (isOver) progressClass = 'danger';
                else if (percent > 80) progressClass = 'warning';
                
                html += `
                    <div class="budget-item${isOver ? ' is-over-budget' : ''}"
                         style="${getCategoryVisualStyle(themedCat)}"
                         ${isOver ? `role="group" aria-label="${cat.label} is over budget by $${overAmount.toLocaleString()}"` : ''}>
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
                        ${isOver ? `
                            <div class="budget-over-warning" role="status">
                                <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
                                <span>Over budget by <strong>$${overAmount.toLocaleString()}</strong></span>
                            </div>
                        ` : ''}
                        <div class="budget-progress-bar">
                            <div class="budget-progress-fill ${progressClass}" style="width: ${percent}%;"></div>
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

function resetSwipeDismissState(modal) {
    const content = modal?.querySelector('.calculator-content');
    if (!content) return;
    modal.classList.remove('swipe-dismiss-active');
    content.classList.remove('swipe-dismiss-dragging', 'swipe-dismiss-settling', 'swipe-dismiss-closing');
    content.style.removeProperty('--swipe-dismiss-y');
}

function setupSwipeDownToClose(modal, content, closeHandler) {
    if (!modal || !content || typeof closeHandler !== 'function') return;

    let startX = 0;
    let startY = 0;
    let currentY = 0;
    let startTime = 0;
    let activePointerId = null;
    let isDragging = false;

    const isInteractiveTarget = (target) => Boolean(
        target.closest('button, input, textarea, select, label, .keypad-grid, .category-grid-container')
    );

    const finishSwipe = (shouldClose) => {
        if (shouldClose) {
            content.classList.remove('swipe-dismiss-dragging');
            content.classList.add('swipe-dismiss-closing');
            content.style.setProperty('--swipe-dismiss-y', '110vh');
            setTimeout(() => {
                closeHandler();
                content.classList.remove('swipe-dismiss-closing');
            }, 180);
            return;
        }

        content.classList.remove('swipe-dismiss-dragging');
        content.classList.add('swipe-dismiss-settling');
        content.style.setProperty('--swipe-dismiss-y', '0px');
        setTimeout(() => {
            resetSwipeDismissState(modal);
        }, 180);
    }

    content.addEventListener('pointerdown', (event) => {
        if (modal.style.display === 'none' || isInteractiveTarget(event.target)) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        startX = event.clientX;
        startY = event.clientY;
        currentY = startY;
        startTime = performance.now();
        activePointerId = event.pointerId;
        isDragging = false;
        content.setPointerCapture?.(event.pointerId);
    });

    content.addEventListener('pointermove', (event) => {
        if (activePointerId !== event.pointerId) return;
        const deltaY = event.clientY - startY;
        const deltaX = Math.abs(event.clientX - startX);
        currentY = event.clientY;

        if (deltaY <= 0 || deltaX > deltaY * 1.15) return;
        if (!isDragging && deltaY < 12) return;

        isDragging = true;
        event.preventDefault();
        modal.classList.add('swipe-dismiss-active');
        content.classList.add('swipe-dismiss-dragging');
        content.classList.remove('swipe-dismiss-settling');
        content.style.setProperty('--swipe-dismiss-y', `${Math.min(deltaY, 260)}px`);
    }, { passive: false });

    const endDrag = (event) => {
        if (activePointerId !== event.pointerId) return;
        const elapsed = Math.max(performance.now() - startTime, 1);
        const deltaY = currentY - startY;
        const velocity = deltaY / elapsed;
        const shouldClose = isDragging && (deltaY > 120 || (deltaY > 64 && velocity > 0.55));

        activePointerId = null;
        isDragging = false;
        content.releasePointerCapture?.(event.pointerId);
        finishSwipe(shouldClose);
    }

    content.addEventListener('pointerup', endDrag);
    content.addEventListener('pointercancel', endDrag);
}

// Setup Calculator Modal
function setupCalculatorModal() {
    const modal = document.getElementById('add-modal');
    const closeBtn = document.querySelector('.close-add-modal');
    const content = modal?.querySelector('.calculator-content');
    
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
    setupSwipeDownToClose(modal, content, closeCalculatorModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeCalculatorModal();
        }
    });
}

function openCalculatorModal(type = 'expense') {
    const modal = document.getElementById('add-modal');
    modal.style.display = 'flex'; // Use flex to center/align
    resetSwipeDismissState(modal);
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
    resetSwipeDismissState(modal);
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
    resetSwipeDismissState(modal);
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
        <div class="category-option" data-id="${cat.id}" role="button" tabindex="0">
            <div class="cat-icon-circle" style="${getCategoryVisualStyle(cat)}">
                <i class="${cat.icon}"></i>
            </div>
            <div class="cat-label">${cat.label}</div>
        </div>
    `).join('');

    grid.querySelectorAll('.category-option').forEach(option => {
        const select = () => handleCategorySelect(option.dataset.id);
        option.addEventListener('click', select);
        option.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                select();
            }
        });
    });
}

function handleCategorySelect(id) {
    const categories = currentCalcType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const category = categories.find(c => c.id === id);
    if (category) selectCategory(category);
}
// Keep this global for backward compatibility with older saved markup.
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
    resetSwipeDismissState(document.getElementById('add-modal'));
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
    closeButton.addEventListener('click', function() {
        modal.style.display = 'none';
        document.body.style.overflow = ''; 
    }, { once: true });
    
    const deleteButton = document.getElementById('delete-subscription-detail-btn');
    deleteButton.addEventListener('click', function() {
        modal.style.display = 'none';
        showDeleteSubscriptionConfirmation(rowIndex, service, account, price, billingCycle, category, nextPayment, paymentMethod);
    }, { once: true });
    
    const editButton = document.getElementById('edit-subscription-btn');
    editButton.addEventListener('click', function() {
        modal.style.display = 'none';
        openEditSubscriptionModal(service, account, price, billingCycle, category, nextPayment, paymentMethod, description, rowIndex);
    }, { once: true });
    
    const resubscribeButton = document.getElementById('resubscribe-btn');
    resubscribeButton.addEventListener('click', function() {
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
    }, { once: true });
    
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
    closeButton.addEventListener('click', function() {
        modal.style.display = 'none';
    }, { once: true });
    
    const cancelButton = document.getElementById('cancel-edit-subscription');
    cancelButton.addEventListener('click', function() {
        modal.style.display = 'none';
    }, { once: true });
    
    const form = document.getElementById('edit-subscription-form');
    form.addEventListener('submit', async function(e) {
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
    }, { once: true });
    
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
        <div class="quick-add-btn" data-id="${btn.id}" role="button" tabindex="0">
            <i class="${btn.icon || 'fas fa-plus'}"></i>
            <span>${btn.label}</span>
        </div>
    `).join('');

    container.querySelectorAll('.quick-add-btn').forEach(button => {
        const runQuickAdd = () => window.handleQuickAddClick(button.dataset.id);
        button.addEventListener('click', runQuickAdd);
        button.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                runQuickAdd();
            }
        });
    });
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
            <div class="subscription-list-item-inline ${warningClass}" data-subscription-index="${sub.index}" role="button" tabindex="0">
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
                <button class="subscription-item-delete ${deleteClass}" data-delete-subscription-index="${sub.index}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');
    
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('[data-subscription-index]').forEach(item => {
        const openDetail = () => showSubscriptionDetail(Number(item.dataset.subscriptionIndex));
        item.addEventListener('click', openDetail);
        item.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openDetail();
            }
        });
    });

    container.querySelectorAll('[data-delete-subscription-index]').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            handleDeleteSubscriptionInline(event, Number(button.dataset.deleteSubscriptionIndex));
        });
    });
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
        <div id="subscription-detail-modal" class="modal subscription-detail-modal-visible">
            <div class="modal-content subscription-detail-content">
                <div class="modal-header">
                    <h2>Subscription Details</h2>
                    <span class="close-subscription-detail" role="button" tabindex="0">&times;</span>
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
                    
                    <div class="detail-grid detail-grid-single">
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
                    <button class="btn-cancel" data-subscription-detail-close>Close</button>
                    <button class="btn-delete" data-subscription-detail-delete="${subscriptionIndex}">Delete</button>
                </div>
            </div>
        </div>
    `;
    
    // Insert modal into page
    const existingModal = document.getElementById('subscription-detail-modal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const detailModal = document.getElementById('subscription-detail-modal');
    const closeControls = detailModal.querySelectorAll('.close-subscription-detail, [data-subscription-detail-close]');
    closeControls.forEach(control => {
        control.addEventListener('click', closeSubscriptionDetail);
        control.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                closeSubscriptionDetail();
            }
        });
    });

    const deleteButton = detailModal.querySelector('[data-subscription-detail-delete]');
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            deleteAndCloseSubscription(Number(deleteButton.dataset.subscriptionDetailDelete));
        });
    }
    
    // Close modal on background click
    detailModal.addEventListener('click', function(e) {
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
    const addSubscriptionContent = addSubscriptionModal?.querySelector('.subscription-calculator-content');
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

    setupSwipeDownToClose(addSubscriptionModal, addSubscriptionContent, closeSubscriptionCalculator);
    
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
    document.documentElement.classList.add('subscription-calculator-open');
    document.body.classList.add('subscription-calculator-open');
    form.reset();
    currentSubscriptionAmount = '0';
    document.getElementById('sub-billing-date').value = new Date().getDate();
    updateSubscriptionAmountDisplay();
    modal.style.display = 'flex';
    resetSwipeDismissState(modal);
    lockPageScroll();
    requestAnimationFrame(syncAppViewportHeight);
}

function closeSubscriptionCalculator() {
    const modal = document.getElementById('add-subscription-modal');
    const form = document.getElementById('add-subscription-form');
    resetSwipeDismissState(modal);
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    document.documentElement.classList.remove('subscription-calculator-open');
    document.body.classList.remove('subscription-calculator-open');
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
