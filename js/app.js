// Google Sheet ID from the URL
const SPREADSHEET_ID = '1YztC7lJq9mg2GEt92TdPWAfhH_UmFvXFQW8hKLKL798';
const SHEET_NAME = 'Expenses'; // Changed to match the Apple Shortcuts script
const RANGE = 'A1:F1000'; // Adjust range as needed

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
let isSubscriptionDeleteMode = false;
let subscriptionData = []; // Store subscription data for deletion

// Function to fetch data from the published Google Sheet
async function fetchExpenseData() {
    try {
        // Using the CSV export approach which is more reliable
        // Add version parameter to bust cache
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}&range=${RANGE}&v=${APP_VERSION}`;
        
        // Show loading status
        document.getElementById('status-message').textContent = 'Loading...';
        
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
        const payment = row.c[paymentMethodIndex]?.v || 'N/A';
        
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
        // For display, we use the array index (0-based)
        // For sheet operations, we'll calculate the actual sheet row later
        const dataAttributes = `
            data-row-index="${rowIndex}"
            data-date="${date}"
            data-amount="${amountValue}"
            data-category="${category}"
            data-description="${description}"
            data-payment="${payment}"
        `;
        
        return `
            <tr ${dataAttributes} class="transaction-row">
                <td class="delete-column hidden">
                    <button class="delete-button" data-row-index="${rowIndex}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
                <td>${displayDate}</td>
                <td>${displayAmount}</td>
                <td>${category}</td>
                <td>${description}</td>
                <td>${payment}</td>
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
    
    // Define the delete handler function
    function handleDeleteClick(e) {
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
            
            // Show simple confirmation
            const confirmed = confirm(`Delete transaction?\n\nDate: ${displayDate}\nAmount: ${displayAmount}\nCategory: ${category}\nDescription: ${description}`);
            
            if (confirmed) {
                // Calculate the actual row index in the spreadsheet (add 2 for header row and 1-based indexing)
                const actualRowIndex = parseInt(rowIndex) + 2;
                
                // Show loading status
                document.getElementById('status-message').textContent = 'Deleting...';
                
                // Delete from Google Sheet
                deleteTransactionFromSheet(actualRowIndex)
                    .then(() => {
                        // Show success message
                        document.getElementById('status-message').textContent = 'Deleted!';
                        setTimeout(() => {
                            document.getElementById('status-message').textContent = '';
                        }, 2000);
                        
                        // Refresh data to update charts and totals
                        fetchExpenseData();
                    })
                    .catch(error => {
                        console.error('Error deleting transaction:', error);
                        document.getElementById('status-message').textContent = 'Error deleting';
                        setTimeout(() => {
                            document.getElementById('status-message').textContent = '';
                        }, 2000);
                    });
            }
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

// Function to delete transaction from Google Sheet
async function deleteTransactionFromSheet(rowIndex) {
    // Check if we have a deployed Google Apps Script Web App URL
    if (!SCRIPT_URL || SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
        console.warn('No Google Apps Script Web App URL configured. Transaction will not be deleted from Google Sheet.');
        
        // For demo purposes, we'll just simulate a successful API call
        return new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
        console.log('Deleting transaction at row:', rowIndex);
        
        // Build URL with all parameters since no-cors mode doesn't properly send JSON body
        const url = `${SCRIPT_URL}?action=delete&rowIndex=${rowIndex}&spreadsheetId=${SPREADSHEET_ID}&sheetName=${SHEET_NAME}&v=${Date.now()}`;
        
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
        
        // Hide any visible modals that might be stuck
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Initialize sections
        initializeSections();
        
        // Setup navigation
        setupNavigation();
        
        // Add ripple effect to buttons
        document.querySelectorAll('.btn-primary, .btn-secondary, .btn-danger').forEach(button => {
            button.addEventListener('click', createRipple);
        });
        
        // Setup transaction modal
        setupTransactionModal();
        
        // Setup subscription modal
        setupSubscriptionModal();
        
        // Setup delete mode
        setupDeleteMode();
        
        // Setup subscription delete mode
        setupSubscriptionDeleteMode();
        
        // Setup refresh button
        setupRefreshButton();
        
        // Create empty charts initially
        createEmptyCharts();
        
        // Fetch expense data from Google Sheet
        await fetchExpenseData();
        
        // Fetch subscription data from Google Sheet
        await fetchSubscriptionData();
        
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
        
        // Build URL with parameters
        const url = new URL(SCRIPT_URL);
        url.searchParams.append('action', 'addTransaction');
        url.searchParams.append('date', formattedDate);
        url.searchParams.append('amount', numericAmount);
        url.searchParams.append('category', category);
        url.searchParams.append('description', description || '');
        url.searchParams.append('paymentMethod', paymentMethod);
        url.searchParams.append('spreadsheetId', SPREADSHEET_ID);
        url.searchParams.append('sheetName', SHEET_NAME);
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
    
    deleteModeBtn.addEventListener('click', function() {
        // Toggle delete mode
        isDeleteMode = !isDeleteMode;
        
        // Toggle active class on button
        if (isDeleteMode) {
            deleteModeBtn.classList.add('active');
        } else {
            deleteModeBtn.classList.remove('active');
        }
        
        // Show/hide delete column
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

// Function to setup refresh button
function setupRefreshButton() {
    const refreshButton = document.getElementById('refresh-btn');
    
    refreshButton.addEventListener('click', async function() {
        try {
            // Show loading animation
            refreshButton.classList.add('rotating');
            
            // Fetch expense data
            await fetchExpenseData();
            
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

// Function to fetch subscription data from the Google Sheet
async function fetchSubscriptionData() {
    try {
        // Using the CSV export approach which is more reliable
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SUBSCRIPTION_SHEET_NAME}&range=${SUBSCRIPTION_RANGE}&v=${APP_VERSION}`;
        
        // Show loading status
        document.getElementById('status-message').textContent = 'Loading...';
        
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
        
        // Show success status
        document.getElementById('status-message').textContent = 'Updated';
        setTimeout(() => {
            document.getElementById('status-message').textContent = '';
        }, 2000);
        
        // Process and display the data
        await displaySubscriptionData(result);
        
        return Promise.resolve(result);
    } catch (error) {
        console.error('Error fetching subscription data:', error);
        document.getElementById('status-message').textContent = 'Connection error';
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
        // For display, we use the array index (0-based)
        // For sheet operations, we'll calculate the actual sheet row later
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
        
        // Determine if the service has an icon or use the first letter
        const serviceFirstLetter = service.charAt(0).toUpperCase();
        let serviceIcon;
        
        // Map common services to Font Awesome icons
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
        
        // Try to find a matching icon
        const serviceLower = service.toLowerCase();
        for (const [key, icon] of Object.entries(serviceIcons)) {
            if (serviceLower.includes(key)) {
                serviceIcon = icon;
                break;
            }
        }
        
        // If no icon found, use a default
        if (!serviceIcon) {
            serviceIcon = 'fas fa-calendar-alt';
        }
        
        // Generate HTML for the card - only showing service, price and next payment date
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
    
    // Update the container
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
        
        // For demo purposes, we'll just simulate a successful API call
        return new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
        // Format the next payment date to YYYY-MM-DD for consistency
        const formattedDate = new Date(nextPaymentDate).toISOString().split('T')[0];
        
        // Convert price to a number to ensure proper formatting
        const numericPrice = parseFloat(price);
        
        // Build URL with parameters
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
        console.error('Error adding subscription to Google Sheet:', error);
        throw error;
    }
}

// Function to delete subscription from Google Sheet
async function deleteSubscriptionFromSheet(rowIndex) {
    // Check if we have a deployed Google Apps Script Web App URL
    if (!SCRIPT_URL || SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
        console.warn('No Google Apps Script Web App URL configured. Subscription will not be deleted from Google Sheet.');
        
        // For demo purposes, we'll just simulate a successful API call
        return new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
        // Calculate the actual row index in the spreadsheet (add 2 for header row and 1-based indexing)
        const actualRowIndex = parseInt(rowIndex) + 2;
        
        console.log('Deleting subscription at row:', actualRowIndex);
        
        // Build URL with all parameters since no-cors mode doesn't properly send JSON body
        const url = `${SCRIPT_URL}?action=deleteSubscription&rowIndex=${actualRowIndex}&spreadsheetId=${SPREADSHEET_ID}&sheetName=${SUBSCRIPTION_SHEET_NAME}&v=${Date.now()}`;
        
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
            
            // Get subscription details for confirmation
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
    // Use a simple confirm dialog instead of complex modal
    const confirmed = confirm(`Are you sure you want to delete the ${service} subscription?`);
    
    if (confirmed) {
        deleteSubscriptionFromSheet(rowIndex)
            .then(() => {
                // Show success message
                document.getElementById('status-message').textContent = 'Deleted!';
                setTimeout(() => {
                    document.getElementById('status-message').textContent = '';
                }, 2000);
                
                // Refresh the data
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
    
    // Open modal when clicking the add button
    addButton.addEventListener('click', function() {
        modal.style.display = 'block';
        // Set default date to today
        document.getElementById('subscription-next-payment').valueAsDate = new Date();
    });
    
    // Close modal functions
    function closeModal() {
        modal.style.display = 'none';
        form.reset();
    }
    
    closeButton.addEventListener('click', closeModal);
    cancelButton.addEventListener('click', closeModal);
    
    // Close modal when clicking outside - use a named function that we can remove later
    const outsideClickHandler = function(event) {
        if (event.target === modal) {
            closeModal();
            // Remove this event listener when modal is closed
            window.removeEventListener('click', outsideClickHandler);
        }
    };
    
    // Add the event listener for outside clicks
    window.addEventListener('click', outsideClickHandler);
    
    // Form submission
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        // Get form values
        const service = document.getElementById('subscription-service').value;
        const account = document.getElementById('subscription-account').value;
        const price = document.getElementById('subscription-price').value;
        const billingCycle = document.getElementById('subscription-billing').value;
        const category = document.getElementById('subscription-category').value;
        const nextPaymentDate = document.getElementById('subscription-next-payment').value;
        const paymentMethod = document.getElementById('subscription-payment').value;
        const description = document.getElementById('subscription-description').value;
        
        try {
            // Show loading status
            document.getElementById('status-message').textContent = 'Adding...';
            
            // Add subscription to Google Sheet
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
            
            // Close the modal
            closeModal();
            
            // Refresh the data
            await fetchSubscriptionData();
            
            // Show success message
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
    
    deleteButton.addEventListener('click', function() {
        isSubscriptionDeleteMode = !isSubscriptionDeleteMode;
        
        // Toggle delete button appearance
        if (isSubscriptionDeleteMode) {
            deleteButton.classList.add('active');
        } else {
            deleteButton.classList.remove('active');
        }
        
        // Toggle delete overlay visibility on cards
        const cards = document.querySelectorAll('.subscription-card');
        cards.forEach(card => {
            const deleteOverlay = card.querySelector('.delete-overlay');
            if (isSubscriptionDeleteMode) {
                deleteOverlay.classList.add('visible');
            } else {
                deleteOverlay.classList.remove('visible');
            }
        });
        
        // Setup delete buttons if in delete mode
        if (isSubscriptionDeleteMode) {
            setupSubscriptionDeleteButtons();
        }
    });
}

// Show subscription details modal
function showSubscriptionDetails(service, account, price, billingCycle, category, nextPayment, paymentMethod, description, rowIndex) {
    const modal = document.getElementById('subscription-details-modal');
    const detailsContainer = document.getElementById('subscription-detail-content');
    
    // Format price for display
    const priceValue = parseFloat(price);
    const displayPrice = !isNaN(priceValue) ? `$${priceValue.toFixed(2)}` : `$${price}`;
    
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
    
    // Determine if the service has an icon
    const serviceLower = service.toLowerCase();
    let serviceIcon = 'fas fa-calendar-alt';
    
    // Map common services to Font Awesome icons
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
    
    // Try to find a matching icon
    for (const [key, icon] of Object.entries(serviceIcons)) {
        if (serviceLower.includes(key)) {
            serviceIcon = icon;
            break;
        }
    }
    
    // Display subscription details in the modal
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
    
    // Show the modal
    modal.style.display = 'block';
    
    // Setup close button
    const closeButton = modal.querySelector('.close-details-modal');
    closeButton.onclick = function() {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Re-enable scrolling
    };
    
    // Setup delete button
    const deleteButton = document.getElementById('delete-subscription-detail-btn');
    deleteButton.onclick = function() {
        // Close the details modal
        modal.style.display = 'none';
        
        // Show delete confirmation
        showDeleteSubscriptionConfirmation(rowIndex, service, account, price, billingCycle, category, nextPayment, paymentMethod);
    };
    
    // Setup edit button
    const editButton = document.getElementById('edit-subscription-btn');
    editButton.onclick = function() {
        // Close the details modal
        modal.style.display = 'none';
        
        // Open the edit modal and populate with subscription details
        openEditSubscriptionModal(service, account, price, billingCycle, category, nextPayment, paymentMethod, description, rowIndex);
    };
    
    // Setup resubscribe button
    const resubscribeButton = document.getElementById('resubscribe-btn');
    resubscribeButton.onclick = function() {
        // Calculate new payment date based on billing cycle
        let newPaymentDate = calculateNextPaymentDate(nextPayment, billingCycle);
        
        // Show confirmation
        const confirmed = confirm(`Resubscribe to ${service} for another ${billingCycle} cycle?\nNew payment date: ${formatDateForDisplay(newPaymentDate)}`);
        
        if (confirmed) {
            // Close the details modal
            modal.style.display = 'none';
            
            // Update the subscription with the new payment date
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
                // Refresh the data
                fetchSubscriptionData();
                
                // Show success message
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
    
    // Close modal when clicking outside - use a named function that we can remove later
    const outsideClickHandler = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Re-enable scrolling
            // Remove this event listener when modal is closed
            window.removeEventListener('click', outsideClickHandler);
        }
    };
    
    // Add the event listener
    window.addEventListener('click', outsideClickHandler);
}

// Setup edit subscription modal
function openEditSubscriptionModal(service, account, price, billingCycle, category, nextPayment, paymentMethod, description, rowIndex) {
    const modal = document.getElementById('edit-subscription-modal');
    
    // Populate form fields with current values
    document.getElementById('edit-subscription-service').value = service;
    document.getElementById('edit-subscription-account').value = account;
    document.getElementById('edit-subscription-price').value = parseFloat(price);
    document.getElementById('edit-subscription-billing').value = billingCycle;
    document.getElementById('edit-subscription-category').value = category;
    
    // Format date for input field (YYYY-MM-DD)
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
    
    // Show the modal
    modal.style.display = 'block';
    
    // Setup close button
    const closeButton = modal.querySelector('.close-edit-subscription-modal');
    closeButton.onclick = function() {
        modal.style.display = 'none';
    };
    
    // Setup cancel button
    const cancelButton = document.getElementById('cancel-edit-subscription');
    cancelButton.onclick = function() {
        modal.style.display = 'none';
    };
    
    // Setup form submission
    const form = document.getElementById('edit-subscription-form');
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        try {
            // Get form values
            const updatedService = document.getElementById('edit-subscription-service').value;
            const updatedAccount = document.getElementById('edit-subscription-account').value;
            const updatedPrice = document.getElementById('edit-subscription-price').value;
            const updatedBillingCycle = document.getElementById('edit-subscription-billing').value;
            const updatedCategory = document.getElementById('edit-subscription-category').value;
            const updatedNextPayment = document.getElementById('edit-subscription-next-payment').value;
            const updatedPaymentMethod = document.getElementById('edit-subscription-payment').value;
            const updatedDescription = document.getElementById('edit-subscription-description').value;
            const rowIndex = document.getElementById('edit-subscription-row-index').value;
            
            // Update subscription in the sheet
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
            
            // Close the modal
            modal.style.display = 'none';
            
            // Refresh the data
            await fetchSubscriptionData();
            
            // Show success message
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
    
    // Close modal when clicking outside
    const outsideClickHandler = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            // Remove this event listener when modal is closed
            window.removeEventListener('click', outsideClickHandler);
        }
    };
    
    // Add the event listener
    window.addEventListener('click', outsideClickHandler);
}

// Update subscription in the Google Sheet
async function updateSubscriptionFromSheet(rowIndex, service, account, price, billingCycle, category, nextPaymentDate, paymentMethod, description) {
    try {
        // Calculate the actual row index in the spreadsheet (add 2 for header row and 1-based indexing)
        const actualRowIndex = parseInt(rowIndex) + 2;
        
        console.log(`Updating subscription at row index: ${actualRowIndex}`);
        
        // Prepare the URL with parameters
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
        
        // Make the request
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
        });
        
        // Parse the response
        const result = await response.json();
        
        // Check if the operation was successful
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
        // Parse the current date
        const date = new Date(currentDate);
        
        // If date is invalid, return today's date
        if (isNaN(date.getTime())) {
            return new Date().toISOString().split('T')[0];
        }
        
        // Calculate next payment date based on billing cycle
        switch (billingCycle) {
            case '月': // Monthly
                date.setMonth(date.getMonth() + 1);
                break;
            case '季': // Quarterly
                date.setMonth(date.getMonth() + 3);
                break;
            case '年': // Yearly
                date.setFullYear(date.getFullYear() + 1);
                break;
            default:
                // Default to monthly if cycle is unknown
                date.setMonth(date.getMonth() + 1);
                break;
        }
        
        // Format as YYYY-MM-DD for input fields
        return date.toISOString().split('T')[0];
    } catch (error) {
        console.error('Error calculating next payment date:', error);
        // Return today's date as fallback
        return new Date().toISOString().split('T')[0];
    }
}

// Format date for display
function formatDateForDisplay(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString; // Return original string if invalid date
        }
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
        console.warn('Date formatting error:', error);
        return dateString;
    }
} 