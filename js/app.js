// Google Sheet ID from the URL
const SPREADSHEET_ID = '1YztC7lJq9mg2GEt92TdPWAfhH_UmFvXFQW8hKLKL798';
const SHEET_NAME = 'Sheet1';
const RANGE = 'A1:F1000'; // Adjust range as needed

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
        
        return result;
    } catch (error) {
        console.error('Error fetching expense data:', error);
        document.getElementById('status-message').textContent = 'Connection error';
        return null;
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
async function displayExpenseData() {
    const data = await fetchExpenseData();
    
    if (!data || !data.table || !data.table.rows) {
        document.getElementById('expenses-body').innerHTML = `
            <tr>
                <td colspan="5">No data available</td>
            </tr>
        `;
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
    
    const expensesHTML = rows.map(row => {
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
        
        // Format amount for display
        const displayAmount = typeof amount === 'number' 
            ? `$${amount.toFixed(2)}` 
            : amount;
        
        return `
            <tr>
                <td>${displayDate}</td>
                <td>${displayAmount}</td>
                <td>${category}</td>
                <td>${description}</td>
                <td>${paymentMethod}</td>
            </tr>
        `;
    }).join('');
    
    // Update the expenses table
    document.getElementById('expenses-body').innerHTML = expensesHTML || `
        <tr>
            <td colspan="5">No expense data available</td>
        </tr>
    `;
    
    // Update total amount
    document.getElementById('total-amount').textContent = `$${totalExpense.toFixed(2)}`;
    
    // Create the monthly expense chart
    createMonthlyExpenseChart(monthlyExpenses);
    
    // Create the category expense chart
    createCategoryExpenseChart(categoryTotals);
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
    
    const colors = [
        'rgba(14, 165, 233, 0.8)',
        'rgba(6, 182, 212, 0.8)',
        'rgba(2, 132, 199, 0.8)',
        'rgba(8, 145, 178, 0.8)',
        'rgba(20, 184, 166, 0.8)',
        'rgba(56, 189, 248, 0.8)',
        'rgba(14, 116, 144, 0.8)',
        'rgba(34, 211, 238, 0.8)'
    ];
    
    const chartData = {
        labels: sortedCategories,
        datasets: [{
            data: sortedCategories.map(category => categoryTotals[category]),
            backgroundColor: sortedCategories.map((_, i) => colors[i % colors.length]),
            borderWidth: 0,
            hoverOffset: 5
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

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    displayExpenseData();
}); 