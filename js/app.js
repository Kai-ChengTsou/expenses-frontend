// Google Sheet ID from the URL
const SPREADSHEET_ID = '1YztC7lJq9mg2GEt92TdPWAfhH_UmFvXFQW8hKLKL798';
const SHEET_NAME = 'Expenses'; // Changed to match the Apple Shortcuts script
const RANGE = 'A1:F1000'; // Adjust range as needed

// Google Apps Script Web App URL with the new script ID
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby-LLk4KrVEAeviuPsOukGgfDA_s1VsZG1dQjAtjXhUOx_IAxK_8rHCoKILGwIqhoKpmg/exec';

// Global variables for delete functionality
let isDeleteMode = false;
let transactionData = []; // Store transaction data for deletion

// Function to fetch data from the published Google Sheet
async function fetchExpenseData() {
    try {
        // Using the CSV export approach which is more reliable
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}&range=${RANGE}`;
        
        // Show loading status
        document.getElementById('status-message').textContent = 'Loading...';
        
        const response = await fetch(url);
        const csvText = await response.text();
        
        // Parse CSV data
        const rows = parseCSV(csvText);
        
        // Store the raw data for deletion purposes
        transactionData = rows.slice(1).map((row, index) => ({
            index: index + 1, // +1 because row 0 is headers
            date: row[0],
            amount: row[1],
            category: row[2],
            description: row[3],
            paymentMethod: row[4]
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
        
        // Show success status
        document.getElementById('status-message').textContent = 'Updated';
        setTimeout(() => {
            document.getElementById('status-message').textContent = '';
        }, 2000);
        
        // Process and display the data
        await displayExpenseData(result);
        
        return Promise.resolve(result);
    } catch (error) {
        console.error('Error fetching expense data:', error);
        document.getElementById('status-message').textContent = 'Connection error';
        return Promise.reject(error);
    }
}

// Helper function to parse CSV
function parseCSV(text) {
    const lines = text.split('\n');
    return lines.map(line => {
        // Handle quoted values (which might contain commas)
        const result = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        // Add the last value
        result.push(currentValue);
        
        // Clean up quotes
        return result.map(value => {
            if (value.startsWith('"') && value.endsWith('"')) {
                return value.substring(1, value.length - 1);
            }
            return value;
        });
    }).filter(row => row.length > 1 || row[0] !== ''); // Filter out empty rows
}

// Function to process and display the expense data
async function displayExpenseData(data) {
    if (!data) return;
    
    if (!data || !data.table || !data.table.rows || data.table.rows.length === 0) {
        document.getElementById('expenses-body').innerHTML = `
            <tr class="empty-row">
                <td colspan="6">No transactions found. Click the + button to add your first transaction.</td>
            </tr>
        `;
        
        // Update total amount to zero
        document.getElementById('total-amount').textContent = '$0.00';
        
        // Create empty charts
        createEmptyCharts();
        
        return;
    }
    
    const rows = data.table.rows;
    const columns = data.table.cols;
    
    // Get column indices
    const dateIndex = 0;  // Assuming Date is the first column
    const amountIndex = 1; // Assuming Amount is the second column
    const categoryIndex = 2; // Assuming Category is the third column
    const descriptionIndex = 3; // Assuming Description is the fourth column
    const paymentMethodIndex = 4; // Assuming Payment Method is the fifth column
    
    // Process expense data
    let totalExpense = 0;
    const categoryTotals = {};
    const monthlyExpenses = {};
    
    const expensesHTML = rows.map((row, rowIndex) => {
        if (!row.c || row.c.some(cell => !cell)) return ''; // Skip rows with empty cells
        
        const date = row.c[dateIndex]?.v || 'N/A';
        const amount = row.c[amountIndex]?.v || '0';
        const category = row.c[categoryIndex]?.v || 'Uncategorized';
        const description = row.c[descriptionIndex]?.v || '';
        const paymentMethod = row.c[paymentMethodIndex]?.v || 'N/A';
        
        // Clean amount string and convert to number
        const amountValue = parseFloat(String(amount).replace(/[^0-9.-]+/g, ''));
        
        if (!isNaN(amountValue)) {
            totalExpense += amountValue;
            
            // Aggregate by category
            categoryTotals[category] = (categoryTotals[category] || 0) + amountValue;
            
            // Aggregate by month (for the chart)
            const dateObj = new Date(date);
            if (!isNaN(dateObj.getTime())) {
                const monthYear = `${dateObj.toLocaleString('default', { month: 'short' })} ${dateObj.getFullYear()}`;
                monthlyExpenses[monthYear] = (monthlyExpenses[monthYear] || 0) + amountValue;
            }
        }
        
        // Format date for display
        let displayDate = date;
        try {
            const dateObj = new Date(date);
            if (!isNaN(dateObj.getTime())) {
                displayDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }
        } catch (e) {
            console.warn('Date parsing error:', e);
        }
        
        // Format amount for display - ensure $ is always shown
        let displayAmount;
        if (typeof amountValue === 'number' && !isNaN(amountValue)) {
            displayAmount = `$${amountValue.toFixed(2)}`;
        } else {
            // If for some reason we can't parse it, just show the original
            displayAmount = amount.toString().startsWith('$') ? amount : `$${amount}`;
        }
        
        // Add data attributes for deletion
        const dataAttributes = `
            data-row-index="${rowIndex}"
            data-date="${date}"
            data-amount="${amountValue}"
            data-category="${category}"
            data-description="${description}"
            data-payment="${paymentMethod}"
        `;
        
        return `
            <tr ${dataAttributes}>
                <td class="delete-column hidden">
                    <button class="delete-button" data-row-index="${rowIndex}">
                        <i class="fas fa-minus"></i>
                    </button>
                </td>
                <td>${displayDate}</td>
                <td>${displayAmount}</td>
                <td>${category}</td>
                <td>${description}</td>
                <td>${paymentMethod}</td>
            </tr>
        `;
    }).join('');
    
    // Update the expenses table
    if (expensesHTML) {
        document.getElementById('expenses-body').innerHTML = expensesHTML;
    } else {
        document.getElementById('expenses-body').innerHTML = `
            <tr class="empty-row">
                <td colspan="6">No transactions found. Click the + button to add your first transaction.</td>
            </tr>
        `;
    }
    
    // Add empty rows if there are few transactions to maintain layout
    const visibleRows = document.querySelectorAll('#expenses-body tr').length;
    if (visibleRows > 0 && visibleRows < 5) {
        // Add some empty spacer rows for better appearance
        const spacerRows = Array(5 - visibleRows).fill().map(() => `
            <tr class="spacer-row">
                <td colspan="6">&nbsp;</td>
            </tr>
        `).join('');
        document.getElementById('expenses-body').innerHTML += spacerRows;
    }
    
    // Update total amount
    document.getElementById('total-amount').textContent = `$${totalExpense.toFixed(2)}`;
    
    // Create the monthly expense chart
    if (Object.keys(monthlyExpenses).length > 0) {
        createMonthlyExpenseChart(monthlyExpenses);
    } else {
        createEmptyMonthlyChart();
    }
    
    // Create the category expense chart
    if (Object.keys(categoryTotals).length > 0) {
        createCategoryExpenseChart(categoryTotals);
    } else {
        createEmptyCategoryChart();
    }
    
    // Add event listeners to delete buttons
    setupDeleteButtons();
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
    const deleteButtons = document.querySelectorAll('.delete-button');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const rowIndex = this.getAttribute('data-row-index');
            const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
            
            if (row) {
                // Get transaction details for confirmation
                const date = row.getAttribute('data-date');
                const amount = row.getAttribute('data-amount');
                const category = row.getAttribute('data-category');
                const description = row.getAttribute('data-description');
                const payment = row.getAttribute('data-payment');
                
                // Show confirmation modal
                showDeleteConfirmation(rowIndex, date, amount, category, description, payment);
            }
        });
    });
}

// Function to show delete confirmation modal
function showDeleteConfirmation(rowIndex, date, amount, category, description, payment) {
    const modal = document.getElementById('delete-confirm-modal');
    const detailsContainer = document.getElementById('delete-transaction-details');
    
    // Format date for display
    let displayDate = date;
    try {
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
            displayDate = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }
    } catch (e) {
        console.warn('Date parsing error:', e);
    }
    
    // Format amount for display
    const displayAmount = `$${parseFloat(amount).toFixed(2)}`;
    
    // Display transaction details
    detailsContainer.innerHTML = `
        <p><strong>Date:</strong> ${displayDate}</p>
        <p><strong>Amount:</strong> ${displayAmount}</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Description:</strong> ${description}</p>
        <p><strong>Payment Method:</strong> ${payment}</p>
    `;
    
    // Store the row index on the confirm button
    document.getElementById('confirm-delete').setAttribute('data-row-index', rowIndex);
    
    // Show the modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
    
    // Setup close modal events
    const closeModalBtn = document.querySelector('.close-modal-delete');
    const cancelBtn = document.getElementById('cancel-delete');
    
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Re-enable scrolling
    }
    
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Setup confirm delete event
    const confirmBtn = document.getElementById('confirm-delete');
    confirmBtn.addEventListener('click', async function() {
        const rowIndex = parseInt(this.getAttribute('data-row-index'));
        
        // Show loading status
        document.getElementById('status-message').textContent = 'Deleting...';
        
        try {
            // Get the actual row number in the spreadsheet (add 2: 1 for header, 1 for 0-index)
            const spreadsheetRowIndex = rowIndex + 2;
            
            // Delete from Google Sheet
            await deleteTransactionFromSheet(spreadsheetRowIndex);
            
            // Close the modal first to prevent UI jumps
            closeModal();
            
            // Show success message
            document.getElementById('status-message').textContent = 'Transaction deleted';
            setTimeout(() => {
                document.getElementById('status-message').textContent = '';
            }, 2000);
            
            // Refresh data to update charts and totals
            // This is better than removing just one row as it maintains the layout
            await fetchExpenseData();
            
        } catch (error) {
            console.error('Error deleting transaction:', error);
            document.getElementById('status-message').textContent = 'Error deleting transaction';
            
            // Show error message
            alert('Failed to delete transaction. Please try again.');
            
            // Close the modal
            closeModal();
        }
    }, { once: true }); // Use once to prevent multiple clicks
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
}

// Function to delete transaction from Google Sheet
async function deleteTransactionFromSheet(rowIndex) {
    // Check if we have a deployed Google Apps Script Web App URL
    if (!SCRIPT_URL || SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
        console.warn('No Google Apps Script Web App URL configured. Transaction will not be deleted from Google Sheet.');
        
        // For demo purposes, we'll just simulate a successful API call
        return new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
        // Prepare the data to send
        const data = {
            action: 'delete',
            rowIndex: rowIndex,
            spreadsheetId: SPREADSHEET_ID,
            sheetName: SHEET_NAME
        };
        
        // Send the data to Google Apps Script Web App
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // This is important for cross-origin requests to Google Apps Script
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            body: JSON.stringify(data)
        });
        
        // Note: Due to 'no-cors' mode, we won't be able to read the response
        // We'll assume it was successful if no error was thrown
        
        return true;
    } catch (error) {
        console.error('Error deleting data from Google Sheet:', error);
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
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Fetch and display expense data
        await fetchExpenseData();
        
        // Setup navigation
        setupNavigation();
        
        // Setup transaction modal functionality
        setupTransactionModal();
        
        // Setup delete mode functionality
        setupDeleteMode();
        
        // Setup refresh button functionality
        setupRefreshButton();
        
        // Initialize the UI to show only the active section
        initializeSections();
        
    } catch (error) {
        console.error('Error initializing app:', error);
    }
});

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

// Function to setup transaction modal
function setupTransactionModal() {
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    const transactionModal = document.getElementById('transaction-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelTransactionBtn = document.getElementById('cancel-transaction');
    const transactionForm = document.getElementById('transaction-form');
    
    // Set default date to today
    document.getElementById('transaction-date').valueAsDate = new Date();
    
    // Show modal when add button is clicked
    addTransactionBtn.addEventListener('click', () => {
        transactionModal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
    });
    
    // Close modal functions
    function closeModal() {
        transactionModal.style.display = 'none';
        document.body.style.overflow = ''; // Re-enable scrolling
        transactionForm.reset();
        document.getElementById('transaction-date').valueAsDate = new Date(); // Reset date to today
    }
    
    // Close modal when X is clicked
    closeModalBtn.addEventListener('click', closeModal);
    
    // Close modal when Cancel button is clicked
    cancelTransactionBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === transactionModal) {
            closeModal();
        }
    });
    
    // Handle form submission
    transactionForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Show loading status
        document.getElementById('status-message').textContent = 'Adding transaction...';
        
        // Get form values
        const date = document.getElementById('transaction-date').value;
        const amount = document.getElementById('transaction-amount').value;
        const category = document.getElementById('transaction-category').value;
        const description = document.getElementById('transaction-description').value;
        const paymentMethod = document.getElementById('transaction-payment').value;
        
        // Format date for display
        const dateObj = new Date(date);
        const displayDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        
        // Format amount for display - ensure $ is always shown
        const numericAmount = parseFloat(amount);
        const displayAmount = `$${numericAmount.toFixed(2)}`;
        
        try {
            // Send data to Google Sheet
            await addTransactionToSheet(date, amount, category, description, paymentMethod);
            
            // Create new row for the table
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${displayDate}</td>
                <td>${displayAmount}</td>
                <td>${category}</td>
                <td>${description}</td>
                <td>${paymentMethod}</td>
            `;
            
            // Add the new row to the table
            const expensesBody = document.getElementById('expenses-body');
            
            // If there's a "no data" message, clear it first
            if (expensesBody.innerHTML.includes('No expense data available') || 
                expensesBody.innerHTML.includes('Loading expense data...')) {
                expensesBody.innerHTML = '';
            }
            
            // Add the new row at the top of the table
            expensesBody.insertBefore(newRow, expensesBody.firstChild);
            
            // Update total amount
            const currentTotal = parseFloat(document.getElementById('total-amount').textContent.replace('$', ''));
            const newTotal = currentTotal + numericAmount;
            document.getElementById('total-amount').textContent = `$${newTotal.toFixed(2)}`;
            
            // Show success message
            document.getElementById('status-message').textContent = 'Transaction added';
            setTimeout(() => {
                document.getElementById('status-message').textContent = '';
            }, 2000);
            
            // Close the modal
            closeModal();
            
            // Optional: Refresh data to update charts
            // Uncomment the line below if you want to refresh all data after adding a transaction
            // await fetchExpenseData();
            
        } catch (error) {
            console.error('Error adding transaction:', error);
            document.getElementById('status-message').textContent = 'Error adding transaction';
            
            // Show error message to user
            alert('Failed to add transaction to Google Sheet. Please try again.');
        }
    });
}

// Function to add transaction to Google Sheet
async function addTransactionToSheet(date, amount, category, description, paymentMethod) {
    // Check if we have a deployed Google Apps Script Web App URL
    if (!SCRIPT_URL || SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
        console.warn('No Google Apps Script Web App URL configured. Transaction will only be added to UI.');
        
        // For demo purposes, we'll just simulate a successful API call
        return new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
        // Format the date to YYYY-MM-DD for consistency
        const formattedDate = new Date(date).toISOString().split('T')[0];
        
        // Convert amount to a number to ensure proper formatting
        const numericAmount = parseFloat(amount);
        
        // Prepare the data to send - simplified to match Apple Shortcuts format
        const data = {
            date: formattedDate,
            amount: numericAmount,
            category: category,
            description: description,
            paymentMethod: paymentMethod,
            // Optional: Include these if you want to specify a different sheet
            spreadsheetId: SPREADSHEET_ID,
            sheetName: SHEET_NAME
        };
        
        // Send the data to Google Apps Script Web App
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // This is important for cross-origin requests to Google Apps Script
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            body: JSON.stringify(data)
        });
        
        // Note: Due to 'no-cors' mode, we won't be able to read the response
        // We'll assume it was successful if no error was thrown
        
        return true;
    } catch (error) {
        console.error('Error sending data to Google Sheet:', error);
        throw error;
    }
}

// Function to setup delete mode
function setupDeleteMode() {
    const deleteModeBtn = document.getElementById('delete-mode-btn');
    const deleteColumn = document.querySelectorAll('.delete-column');
    
    deleteModeBtn.addEventListener('click', function() {
        // Toggle delete mode
        isDeleteMode = !isDeleteMode;
        
        // Toggle active class on button
        this.classList.toggle('active', isDeleteMode);
        
        // Show/hide delete column
        deleteColumn.forEach(cell => {
            cell.classList.toggle('hidden', !isDeleteMode);
        });
    });
}

// Function to setup refresh button
function setupRefreshButton() {
    const refreshBtn = document.getElementById('refresh-btn');
    
    refreshBtn.addEventListener('click', async function() {
        // Add refreshing class for spinning animation
        this.classList.add('refreshing');
        
        // Show loading status
        document.getElementById('status-message').textContent = 'Refreshing data...';
        
        try {
            // Fetch fresh data
            await fetchExpenseData();
            
            // Show success message
            document.getElementById('status-message').textContent = 'Refreshed!';
            setTimeout(() => {
                document.getElementById('status-message').textContent = '';
            }, 2000);
        } catch (error) {
            console.error('Error refreshing data:', error);
            document.getElementById('status-message').textContent = 'Refresh failed';
            setTimeout(() => {
                document.getElementById('status-message').textContent = '';
            }, 2000);
        } finally {
            // Remove refreshing class to stop animation
            this.classList.remove('refreshing');
        }
    });
} 