// script.js

const App = {
    // --- STATE ---
    state: {
        income: 0,
        transactions: [],
        selectedCurrency: '₹', // Default currency symbol
        currencies: [],
        lastVisitedMonth: null,
    },

    // --- DOM ELEMENTS CACHE ---
    DOM: {
        currencySelect: null,
        incomeDisplay: null,
        incomeInput: null,
        setIncomeBtn: null,
        transactionsContainer: null,
        summaryDisplay: null,
        clearDataBtn: null,
        addTransactionModalToggle: null, // Checkbox that controls the modal
        modalTransactionForm: null,
        modalDescriptionInput: null,
        modalAmountInput: null,
        modalDateInput: null,
    },

    // --- INITIALIZATION ---
    async init() {
        console.log("App Initializing...");
        this.cacheDOM();
        this.loadStateFromLocalStorage();
        this.bindEvents();

        try {
            await this.loadCurrencies();
            this.populateCurrencySelect();
            this.setSelectedCurrency(this.state.selectedCurrency, false); // false to prevent re-render during init
        } catch (error) {
            console.error("Failed to initialize currencies:", error);
            this.showNotification("Error loading currency list. Using defaults.", "error");
        }

        this.checkMonthlyReset();
        this.renderAll(); // Initial full render
        console.log("App Initialized Successfully.");
    },

    // --- DOM CACHING ---
    cacheDOM() {
        this.DOM.currencySelect = document.getElementById('currency-select');
        this.DOM.incomeDisplay = document.getElementById('income-display');
        this.DOM.incomeInput = document.getElementById('income-input');
        this.DOM.setIncomeBtn = document.getElementById('set-income');
        this.DOM.transactionsContainer = document.getElementById('transactions-container');
        this.DOM.summaryDisplay = document.getElementById('summary');
        this.DOM.clearDataBtn = document.getElementById('clear-data');
        this.DOM.addTransactionModalToggle = document.getElementById('add-transaction-modal-toggle');
        this.DOM.modalTransactionForm = document.getElementById('modal-transaction-form');
        this.DOM.modalDescriptionInput = document.getElementById('modal-description-input');
        this.DOM.modalAmountInput = document.getElementById('modal-amount-input');
        this.DOM.modalDateInput = document.getElementById('modal-date-input');
    },

    // --- LOCAL STORAGE ---
    loadStateFromLocalStorage() {
        this.state.income = parseFloat(localStorage.getItem('income')) || 0;
        this.state.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.state.selectedCurrency = localStorage.getItem('currency') || '₹';
        this.state.lastVisitedMonth = parseInt(localStorage.getItem('lastVisitedMonth'), 10); // Can be NaN initially
    },

    saveIncomeToLocalStorage() {
        localStorage.setItem('income', this.state.income.toString());
    },

    saveTransactionsToLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(this.state.transactions));
    },

    saveCurrencyToLocalStorage() {
        localStorage.setItem('currency', this.state.selectedCurrency);
    },

    saveLastVisitedMonthToLocalStorage() {
        if (this.state.lastVisitedMonth !== null && !isNaN(this.state.lastVisitedMonth)) {
            localStorage.setItem('lastVisitedMonth', this.state.lastVisitedMonth.toString());
        }
    },

    // --- CURRENCY HANDLING ---
    async loadCurrencies() {
        try {
            const response = await fetch('currencies.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.state.currencies = await response.json();
        } catch (error) {
            console.error('Error loading currencies.json:', error);
            this.state.currencies = [
                { code: "USD", symbol: "$", name: "US Dollar" },
                { code: "EUR", symbol: "€", name: "Euro" },
                { code: "GBP", symbol: "£", name: "British Pound" },
                { code: "JPY", symbol: "¥", name: "Japanese Yen" },
                { code: "INR", symbol: "₹", name: "Indian Rupee" }
            ]; // Fallback
            throw error; // Re-throw to be caught by init
        }
    },

    populateCurrencySelect() {
        this.DOM.currencySelect.innerHTML = '';
        this.state.currencies.forEach(currency => {
            const option = document.createElement('option');
            option.value = currency.symbol;
            option.textContent = `${currency.code} (${currency.symbol}) - ${currency.name}`;
            if (currency.symbol === this.state.selectedCurrency) {
                option.selected = true;
            }
            this.DOM.currencySelect.appendChild(option);
        });
    },

    setSelectedCurrency(currencySymbol, shouldRender = true) {
        this.state.selectedCurrency = currencySymbol;
        if (this.DOM.currencySelect.value !== currencySymbol) { // Avoid unnecessary DOM manipulation
            this.DOM.currencySelect.value = currencySymbol;
        }
        this.saveCurrencyToLocalStorage();
        if (shouldRender) {
            this.renderAll();
        }
    },

    // --- EVENT BINDING ---
    bindEvents() {
        this.DOM.currencySelect.addEventListener('change', (e) => {
            this.setSelectedCurrency(e.target.value);
        });

        this.DOM.setIncomeBtn.addEventListener('click', () => this.handleSetIncome());
        this.DOM.modalTransactionForm.addEventListener('submit', (e) => this.handleAddTransactionFromModal(e));

        this.DOM.transactionsContainer.addEventListener('click', (e) => {
            const deleteButton = e.target.closest('.delete-transaction-btn');
            if (deleteButton) {
                const transactionItem = deleteButton.closest('.transaction-item');
                if (transactionItem && transactionItem.dataset.index) {
                    this.handleDeleteTransaction(parseInt(transactionItem.dataset.index, 10));
                }
            }
        });

        this.DOM.clearDataBtn.addEventListener('click', () => this.handleClearAllData());
    },

    // --- INCOME HANDLING ---
    handleSetIncome() {
        const incomeValue = parseFloat(this.DOM.incomeInput.value);
        if (!isNaN(incomeValue) && incomeValue >= 0) {
            this.state.income = incomeValue;
            this.saveIncomeToLocalStorage();
            this.renderIncomeDisplay(); // Only re-render what's needed
            this.renderSummary();       // Summary depends on income
            this.DOM.incomeInput.value = '';
            this.showNotification('Income updated successfully!', 'success');
        } else {
            this.showNotification('Please enter a valid income amount.', 'error');
        }
    },

    // --- TRANSACTION HANDLING ---
    handleAddTransactionFromModal(event) {
        event.preventDefault();
        const description = this.DOM.modalDescriptionInput.value.trim();
        const amount = parseFloat(this.DOM.modalAmountInput.value);
        const date = this.DOM.modalDateInput.value;

        if (description && !isNaN(amount) && date) {
            this.state.transactions.push({ description, amount, date });
            this.state.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            this.saveTransactionsToLocalStorage();
            this.renderTransactionsList(); // Re-render transactions
            this.renderSummary();          // Re-render summary
            this.DOM.modalTransactionForm.reset();
            this.DOM.addTransactionModalToggle.checked = false;
            this.showNotification('Transaction added!', 'success');
        } else {
            this.showNotification('Please fill out all transaction details correctly.', 'error');
        }
    },

    handleDeleteTransaction(indexToDelete) {
        if (indexToDelete >= 0 && indexToDelete < this.state.transactions.length) {
            this.state.transactions.splice(indexToDelete, 1);
            this.saveTransactionsToLocalStorage();
            this.renderTransactionsList(); // Re-render transactions
            this.renderSummary();          // Re-render summary
            this.showNotification('Transaction deleted.', 'info');
        } else {
            console.error("Invalid index for deletion:", indexToDelete);
            this.showNotification('Error deleting transaction.', 'error');
        }
    },

    // --- MONTHLY RESET LOGIC ---
    checkMonthlyReset() {
        const currentMonth = new Date().getMonth();
        if (isNaN(this.state.lastVisitedMonth) || this.state.lastVisitedMonth !== currentMonth) {
            if (!isNaN(this.state.lastVisitedMonth)) { // Only if it's not the very first visit
                this.showMonthlySummaryAlert();
                this.performMonthlyDataReset();
                this.showNotification('New month! Transactions have been cleared.', 'info');
            }
            this.state.lastVisitedMonth = currentMonth;
            this.saveLastVisitedMonthToLocalStorage();
        }
    },

    showMonthlySummaryAlert() {
        const totalSpent = this.state.transactions.reduce((sum, t) => sum + t.amount, 0);
        const savings = this.state.income - totalSpent;
        alert(`Previous Month's Summary:\n
    Total Income: ${this.state.selectedCurrency}${this.state.income.toFixed(2)}\n
    Total Spent: ${this.state.selectedCurrency}${totalSpent.toFixed(2)}\n
    Savings: ${this.state.selectedCurrency}${savings.toFixed(2)}`);
    },

    performMonthlyDataReset() {
        this.state.transactions = [];
        this.saveTransactionsToLocalStorage();
        // Income is typically not reset monthly, but transactions are.
    },

    // --- CLEAR ALL DATA ---
    handleClearAllData() {
        if (confirm('Are you sure you want to clear ALL data? This includes income and all transactions and cannot be undone.')) {
            this.state.income = 0;
            this.state.transactions = [];
            localStorage.clear();
            this.state.selectedCurrency = '₹'; // Reset to default
            this.state.lastVisitedMonth = new Date().getMonth();
            this.saveCurrencyToLocalStorage(); // Re-save default
            this.saveLastVisitedMonthToLocalStorage();
            this.populateCurrencySelect(); // Repopulate and set default
            this.setSelectedCurrency(this.state.selectedCurrency, false);
            this.renderAll();
            this.showNotification('All data cleared!', 'warning');
        }
    },

    // --- RENDERING ---
    renderAll() {
        this.renderIncomeDisplay();
        this.renderTransactionsList();
        this.renderSummary();
    },

    renderIncomeDisplay() {
        this.DOM.incomeDisplay.textContent = `Monthly Income: ${this.state.selectedCurrency} ${this.state.income.toFixed(2)}`;
    },

    renderTransactionsList() {
        this.DOM.transactionsContainer.innerHTML = '';
        if (this.state.transactions.length === 0) {
            // CSS :empty pseudo-class handles the "No transactions yet" message
            return;
        }
        this.state.transactions.forEach((transaction, index) => {
            const item = document.createElement('div');
            item.classList.add('transaction-item');
            item.dataset.index = index;
            item.dataset.type = transaction.amount >= 0 ? 'income' : 'expense';

            const amountColorClass = transaction.amount >= 0 ? 'positive-amount' : 'negative-amount';
            const formattedDate = new Date(transaction.date + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); // Ensure date is treated as local

            item.innerHTML = `
                <div class="transaction-details">
                    <span class="transaction-description">${transaction.description}</span>
                    <span class="transaction-date">${formattedDate}</span>
                </div>
                <div class="transaction-amount-actions">
                    <span class="transaction-amount ${amountColorClass}">
                        ${transaction.amount >= 0 ? '+' : ''}${this.state.selectedCurrency}${Math.abs(transaction.amount).toFixed(2)}
                    </span>
                    <button class="delete-transaction-btn" aria-label="Delete transaction">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            this.DOM.transactionsContainer.appendChild(item);
        });
    },

    renderSummary() {
        const totalExpenses = this.state.transactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + t.amount, 0);
        const totalIncomeFromTransactions = this.state.transactions
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);
        const netTransactionFlow = this.state.transactions.reduce((sum, t) => sum + t.amount, 0);
        const projectedSavings = this.state.income + netTransactionFlow;

        this.DOM.summaryDisplay.innerHTML = `
            <strong>Set Monthly Income:</strong> ${this.state.selectedCurrency}${this.state.income.toFixed(2)}<br>
            <strong>Income from Transactions:</strong> ${this.state.selectedCurrency}${totalIncomeFromTransactions.toFixed(2)}<br>
            <strong>Total Expenses:</strong> ${this.state.selectedCurrency}${Math.abs(totalExpenses).toFixed(2)}<br>
            <hr style="border-color: var(--border-color); margin: var(--spacing-xs, 5px) 0;">
            <strong>Projected Savings/Balance:</strong> 
            <span class="${projectedSavings >= 0 ? 'positive-amount' : 'negative-amount'}">
                ${this.state.selectedCurrency}${projectedSavings.toFixed(2)}
            </span>
        `;
    },

    // --- UTILITIES ---
    showNotification(message, type = 'info') {
        const notificationArea = document.getElementById('notification-area') || this.createNotificationArea();
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notificationArea.appendChild(notification);
        // Trigger reflow for animation
        void notification.offsetWidth;
        notification.classList.add('notification-visible');

        setTimeout(() => {
            notification.classList.remove('notification-visible');
            notification.classList.add('notification-fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    },

    createNotificationArea() {
        let area = document.getElementById('notification-area');
        if (!area) {
            area = document.createElement('div');
            area.id = 'notification-area';
            document.body.appendChild(area);
        }
        return area;
    }
};

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
