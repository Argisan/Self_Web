// accounts.js

// Account Management Functionality

class AccountManager {
    constructor() {
        this.accounts = this.loadAccounts();
    }

    createAccount(account) {
        this.accounts.push(account);
        this.saveAccounts();
        this.renderAccounts();
    }

    loadAccounts() {
        return JSON.parse(localStorage.getItem('accounts')) || [];
    }

    saveAccounts() {
        localStorage.setItem('accounts', JSON.stringify(this.accounts));
    }

    renderAccounts() {
        const accountList = document.getElementById('account-list');
        accountList.innerHTML = '';
        this.accounts.forEach(account => {
            const accountCard = this.createAccountCard(account);
            accountList.appendChild(accountCard);
        });
    }

    createAccountCard(account) {
        const card = document.createElement('div');
        card.className = 'account-card';
        card.style.boxShadow = '0 0 10px purple';
        card.innerHTML = `<h3>${account.name}</h3><button onclick='viewDetails(${account.id})'>View Details</button>`;
        return card;
    }

    viewDetails(accountId) {
        const account = this.accounts.find(acc => acc.id === accountId);
        // Open modal and show details
        this.openModal(account);
    }

    openModal(account) {
        const modal = document.getElementById('modal');
        modal.innerHTML = `<h2>${account.name}</h2><p>${account.details}</p>`;
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('modal').style.display = 'none';
    }
}

const accountManager = new AccountManager();

// Example of server API integration
async function fetchAccountsFromServer() {
    const response = await fetch('https://api.example.com/accounts');
    const data = await response.json();
    data.forEach(account => accountManager.createAccount(account));
}

fetchAccountsFromServer();
