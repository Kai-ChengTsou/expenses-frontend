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
