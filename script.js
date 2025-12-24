// Initialize IndexedDB
let db;
let customerDb;
const DB_NAME = 'PurchaseDB';
const CUSTOMER_DB_NAME = 'CustomerDB';
const DB_VERSION = 1;
const CUSTOMER_DB_VERSION = 1;
const STORE_NAME = 'purchases';
const CUSTOMER_STORE_NAME = 'customers';

// Open purchases database
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onerror = (event) => {
    console.error('Database error:', event.target.error);
};

request.onsuccess = (event) => {
    db = event.target.result;
    loadPurchases();
};

request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('customerName', 'customerName', { unique: false });
        objectStore.createIndex('date', 'date', { unique: false });
    }
};

// Open customers database
const customerRequest = indexedDB.open(CUSTOMER_DB_NAME, CUSTOMER_DB_VERSION);

customerRequest.onerror = (event) => {
    console.error('Customer database error:', event.target.error);
};

customerRequest.onsuccess = (event) => {
    customerDb = event.target.result;
};

customerRequest.onupgradeneeded = (event) => {
    customerDb = event.target.result;
    if (!customerDb.objectStoreNames.contains(CUSTOMER_STORE_NAME)) {
        const objectStore = customerDb.createObjectStore(CUSTOMER_STORE_NAME, { keyPath: 'customerName' });
        objectStore.createIndex('phoneNumber', 'phoneNumber', { unique: false });
    }
};

// Autocomplete functionality for customer name
const customerNameInput = document.getElementById('customerName');
const autocompleteDropdown = document.getElementById('autocompleteDropdown');
let selectedIndex = -1;
let currentMatches = [];

customerNameInput.addEventListener('input', function(e) {
    const searchTerm = e.target.value.trim();
    
    if (searchTerm.length >= 2) {
        searchCustomerNames(searchTerm);
    } else {
        hideAutocomplete();
    }
    
    selectedIndex = -1;
});

customerNameInput.addEventListener('keydown', function(e) {
    if (!autocompleteDropdown.classList.contains('show') || currentMatches.length === 0) {
        return;
    }
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % currentMatches.length;
        updateSelectedItem();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = selectedIndex <= 0 ? currentMatches.length - 1 : selectedIndex - 1;
        updateSelectedItem();
    } else if (e.key === 'Enter' && selectedIndex >= 0 && currentMatches.length > 0) {
        e.preventDefault();
        selectCustomerName(currentMatches[selectedIndex]);
    } else if (e.key === 'Escape') {
        hideAutocomplete();
    }
});

// Close autocomplete when clicking outside
document.addEventListener('click', function(e) {
    if (!customerNameInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
        hideAutocomplete();
    }
});

// Search for matching customer names in customer database
function searchCustomerNames(searchTerm) {
    if (!customerDb) return;
    
    const transaction = customerDb.transaction([CUSTOMER_STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(CUSTOMER_STORE_NAME);
    const request = objectStore.getAll();
    
    request.onsuccess = () => {
        const customers = request.result;
        const searchLower = searchTerm.toLowerCase();
        
        // Filter customers that match the search term
        const matches = customers
            .filter(customer => {
                const nameLower = customer.customerName.toLowerCase();
                return nameLower.includes(searchLower);
            })
            .map(customer => ({
                name: customer.customerName,
                phoneNumber: customer.phoneNumber || ''
            }))
            .slice(0, 10); // Limit to 10 results
        
        currentMatches = matches;
        
        if (currentMatches.length > 0) {
            displayAutocomplete(currentMatches);
        } else {
            hideAutocomplete();
        }
    };
    
    request.onerror = () => {
        hideAutocomplete();
    };
}

// Display autocomplete suggestions
function displayAutocomplete(matches) {
    autocompleteDropdown.innerHTML = matches.map((customer, index) => {
        return `<div class="autocomplete-item" data-index="${index}">${customer.name}</div>`;
    }).join('');
    
    autocompleteDropdown.classList.add('show');
    
    // Add click event listeners to each item
    autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach((item, index) => {
        item.addEventListener('click', () => {
            selectCustomerName(matches[index]);
        });
    });
}

// Hide autocomplete dropdown
function hideAutocomplete() {
    autocompleteDropdown.classList.remove('show');
    selectedIndex = -1;
    currentMatches = [];
}

// Update selected item in dropdown
function updateSelectedItem() {
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

// Select a customer name from autocomplete
function selectCustomerName(customer) {
    customerNameInput.value = customer.name;
    const phoneInput = document.getElementById('phoneNumber');
    if (phoneInput && customer.phoneNumber) {
        phoneInput.value = customer.phoneNumber;
    }
    hideAutocomplete();
    customerNameInput.focus();
}

// Format price with thousand separators (integers only)
const priceInput = document.getElementById('price');
priceInput.addEventListener('input', function(e) {
    // Remove all non-digit characters
    let value = e.target.value.replace(/[^\d]/g, '');
    
    // Add thousand separators
    value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    e.target.value = value;
});

// Handle form submission
document.getElementById('purchaseForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const customerName = document.getElementById('customerName').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const priceValue = document.getElementById('price').value.replace(/,/g, '');
    const price = parseInt(priceValue, 10);
    const explanation = document.getElementById('explanation').value.trim();
    const hasGoods = document.getElementById('hasGoods').checked;

    // Validation
    if (!customerName) {
        showMessage('لطفاً نام مشتری را وارد کنید', 'error');
        return;
    }

    if (!price || isNaN(price) || price <= 0) {
        showMessage('لطفاً مبلغ معتبری وارد کنید', 'error');
        return;
    }

    // Add purchase to database and update customer info
    if (db && customerDb) {
        // Add purchase
        const purchaseTransaction = db.transaction([STORE_NAME], 'readwrite');
        const purchaseStore = purchaseTransaction.objectStore(STORE_NAME);
        
        const purchase = {
            customerName: customerName,
            phoneNumber: phoneNumber || '',
            price: price,
            explanation: explanation || '',
            hasGoods: hasGoods,
            date: new Date().toISOString()
        };

        const purchaseRequest = purchaseStore.add(purchase);

        purchaseRequest.onsuccess = () => {
            // Save or update customer info in customer database
            const customerTransaction = customerDb.transaction([CUSTOMER_STORE_NAME], 'readwrite');
            const customerStore = customerTransaction.objectStore(CUSTOMER_STORE_NAME);
            
            const customerData = {
                customerName: customerName,
                phoneNumber: phoneNumber || '',
                lastUpdated: new Date().toISOString()
            };
            
            // Use put to update if exists, or create if new
            const customerRequest = customerStore.put(customerData);
            
            customerRequest.onsuccess = () => {
                showMessage('خرید با موفقیت افزوده شد!', 'success');
                document.getElementById('purchaseForm').reset();
                loadPurchases();
                // Focus back on customer name input
                setTimeout(() => {
                    customerNameInput.focus();
                }, 100);
            };
            
            customerRequest.onerror = () => {
                console.error('Error saving customer info');
                // Still show success for purchase even if customer save fails
                showMessage('خرید با موفقیت افزوده شد!', 'success');
                document.getElementById('purchaseForm').reset();
                loadPurchases();
                // Focus back on customer name input
                setTimeout(() => {
                    customerNameInput.focus();
                }, 100);
            };
        };

        purchaseRequest.onerror = () => {
            showMessage('خطا در افزودن خرید به پایگاه داده', 'error');
        };
    } else {
        showMessage('پایگاه داده آماده نیست. لطفاً صفحه را رفرش کنید.', 'error');
    }
});

// Show message
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    
    setTimeout(() => {
        messageDiv.className = 'message';
    }, 3000);
}

// Attach price edit event listeners
function attachPriceEditListeners() {
    const editablePrices = document.querySelectorAll('.editable-price');
    
    editablePrices.forEach(priceElement => {
        priceElement.addEventListener('click', function(e) {
            e.stopPropagation();
            const purchaseId = parseInt(this.getAttribute('data-purchase-id'));
            const currentPrice = parseInt(this.getAttribute('data-price'));
            const priceInput = document.querySelector(`.price-edit-input[data-purchase-id="${purchaseId}"]`);
            const priceContainer = this.parentElement;
            
            // Hide price display, show input
            this.style.display = 'none';
            priceInput.value = currentPrice; // Show raw number for editing
            priceInput.style.display = 'inline-block';
            priceInput.style.width = '120px';
            priceInput.style.padding = '4px 8px';
            priceInput.style.border = '2px solid #667eea';
            priceInput.style.borderRadius = '5px';
            priceInput.style.textAlign = 'right';
            priceInput.style.fontSize = '16px';
            priceInput.focus();
            priceInput.select();
            
            // Format price input as user types (with thousand separators)
            const formatInput = (e) => {
                let value = e.target.value.replace(/[^\d]/g, '');
                value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                e.target.value = value;
            };
            
            // Remove any existing listeners by cloning
            const tempInput = priceInput.cloneNode(true);
            priceInput.parentNode.replaceChild(tempInput, priceInput);
            const newInput = tempInput;
            
            // Add event listeners
            newInput.addEventListener('input', formatInput);
            
            // Handle input blur (save) or Enter key
            const savePrice = () => {
                let newPriceValue = newInput.value.replace(/,/g, '');
                const newPrice = parseInt(newPriceValue, 10);
                
                if (!isNaN(newPrice) && newPrice > 0) {
                    updatePurchasePrice(purchaseId, newPrice);
                } else {
                    // Revert if invalid
                    newInput.style.display = 'none';
                    priceElement.style.display = 'inline';
                }
            };
            
            newInput.addEventListener('blur', savePrice);
            newInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    savePrice();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    newInput.style.display = 'none';
                    priceElement.style.display = 'inline';
                }
            });
        });
    });
}

// Update purchase price in database
function updatePurchasePrice(purchaseId, newPrice) {
    if (!db) {
        showMessage('Database not ready', 'error');
        return;
    }
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const getRequest = objectStore.get(purchaseId);
    
    getRequest.onsuccess = () => {
        const purchase = getRequest.result;
        if (!purchase) {
        showMessage('خرید یافت نشد', 'error');
        return;
    }
    
    // Update price
    purchase.price = newPrice;
    
    // Update in database
    const updateRequest = objectStore.put(purchase);
    
    updateRequest.onsuccess = () => {
        showMessage('مبلغ با موفقیت به‌روزرسانی شد!', 'success');
        loadPurchases(); // Reload to show updated price
    };
    
    updateRequest.onerror = () => {
        showMessage('خطا در به‌روزرسانی مبلغ', 'error');
    };
    };
    
    getRequest.onerror = () => {
        showMessage('Error loading purchase', 'error');
    };
}

// Load and display purchases
function loadPurchases() {
    if (!db) return;

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();

    request.onsuccess = () => {
        const purchases = request.result;
        const container = document.getElementById('purchasesContainer');
        
        if (purchases.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center;">هنوز خریدی ثبت نشده است</p>';
            return;
        }

        // Sort by date (newest first)
        purchases.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        container.innerHTML = purchases.map(purchase => {
            const date = new Date(purchase.date).toLocaleDateString();
            const formattedPrice = Math.round(purchase.price).toLocaleString('en-US');
            const phoneDisplay = purchase.phoneNumber ? ` - ${purchase.phoneNumber}` : '';
            const hasGoods = purchase.hasGoods || false;
            const goodsBadge = hasGoods ? '<span class="goods-badge">📦 کالا</span>' : '';
            const itemClass = hasGoods ? 'purchase-item has-goods' : 'purchase-item';
            const explanationDisplay = purchase.explanation ? `<div class="purchase-explanation">${purchase.explanation}</div>` : '';
            return `
                <div class="${itemClass}" data-purchase-id="${purchase.id}">
                    <div class="purchase-info">
                        <span><strong>${purchase.customerName}</strong>${phoneDisplay} - ${date} ${goodsBadge}</span>
                        ${explanationDisplay}
                    </div>
                    <span class="price-container">
                        <span class="price editable-price" data-price="${purchase.price}" data-purchase-id="${purchase.id}">$${formattedPrice}</span>
                        <input type="text" class="price-edit-input" data-purchase-id="${purchase.id}" value="${purchase.price}" style="display: none;">
                    </span>
                </div>
            `;
        }).join('');
        
        // Add click event listeners for price editing
        attachPriceEditListeners();
    };
}


