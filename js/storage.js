// ===== LOCAL STORAGE UTILITIES =====
function readJsonStorage(key, fallback = []) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : fallback;
    } catch (e) {
        console.error(`Error reading ${key} from localStorage:`, e);
        return fallback;
    }
}

function writeJsonStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Error saving ${key} to localStorage:`, e);
    }
}

function getLocalStorageTransactions() {
    return readJsonStorage(STORAGE_KEYS.TRANSACTIONS, []);
}

function getLocalStorageIncome() {
    return readJsonStorage(STORAGE_KEYS.INCOME, []);
}

function saveLocalStorageTransactions(data) {
    writeJsonStorage(STORAGE_KEYS.TRANSACTIONS, data);
}

function saveLocalStorageIncome(data) {
    writeJsonStorage(STORAGE_KEYS.INCOME, data);
}

function getLocalSubscriptions() {
    return readJsonStorage(STORAGE_KEYS.SUBSCRIPTIONS, []);
}

function saveLocalSubscriptions(data) {
    writeJsonStorage(STORAGE_KEYS.SUBSCRIPTIONS, data);
}
