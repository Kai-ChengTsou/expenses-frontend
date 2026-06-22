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

        // Custom categories are exported so their names and colors survive a restore.
        const customCategoryRows = EXPENSE_CATEGORIES
            .filter(category => category.custom)
            .map(category => ({
                ID: category.id,
                Name: category.label,
                Color: category.color,
                Icon: category.icon
            }));
        const customCategorySheet = XLSX.utils.json_to_sheet(customCategoryRows, { header: ['ID', 'Name', 'Color', 'Icon'] });
        customCategorySheet['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 24 }];
        XLSX.utils.book_append_sheet(wb, customCategorySheet, 'Custom Categories');

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

            // --- Custom categories (optional sheet) ---
            const customCategorySheetName = wb.SheetNames.find(n => /custom categor/i.test(n));
            if (customCategorySheetName) {
                const customCategoryRows = XLSX.utils.sheet_to_json(wb.Sheets[customCategorySheetName], { defval: '' });
                importCustomExpenseCategories(customCategoryRows.map(row => ({
                    id: row.ID ?? row.Id ?? row.id,
                    label: row.Name ?? row.name ?? row.Category ?? row.category,
                    color: row.Color ?? row.color,
                    icon: row.Icon ?? row.icon
                })));
            }

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
