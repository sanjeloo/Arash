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
    // Database error handled silently
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
    // Customer database error handled silently
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
                if (!customer || !customer.customerName) return false;
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
    const category = document.getElementById('category').value.trim();

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
            category: category || '',
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
                showMessage('فروش با موفقیت افزوده شد!', 'success');
                document.getElementById('purchaseForm').reset();
                loadPurchases();
                // Focus back on customer name input
                setTimeout(() => {
                    customerNameInput.focus();
                }, 100);
            };
            
            customerRequest.onerror = () => {
                // Still show success for purchase even if customer save fails
                showMessage('فروش با موفقیت افزوده شد!', 'success');
                document.getElementById('purchaseForm').reset();
                loadPurchases();
                // Focus back on customer name input
                setTimeout(() => {
                    customerNameInput.focus();
                }, 100);
            };
        };

        purchaseRequest.onerror = () => {
            showMessage('خطا در افزودن فروش به پایگاه داده', 'error');
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

// Attach category edit event listeners
function attachCategoryEditListeners() {
    const editableCategories = document.querySelectorAll('.editable-category');
    
    editableCategories.forEach(categoryElement => {
        categoryElement.addEventListener('click', function(e) {
            e.stopPropagation();
            const purchaseId = parseInt(this.getAttribute('data-purchase-id'));
            const currentCategory = this.getAttribute('data-category') || '';
            const categorySelect = document.querySelector(`.category-edit-select[data-purchase-id="${purchaseId}"]`);
            
            if (!categorySelect) return;
            
            // Category color mapping for select dropdown
            const categoryColors = {
                'فیلم و اهنگ': { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' },
                'فیلتر شکن': { gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: 'white' },
                'اپل ایدی': { gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white' },
                'لوازم جانبی': { gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' },
                'خدمات اینستاگرام': { gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', color: 'white' },
                'قفل گوشی': { gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' },
                'سایر': { gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', color: 'white' }
            };
            const selectedColor = currentCategory && categoryColors[currentCategory] 
                ? categoryColors[currentCategory] 
                : { gradient: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)', color: '#718096' };
            
            // Hide category badge, show select
            this.style.display = 'none';
            categorySelect.value = currentCategory;
            categorySelect.style.display = 'inline-block';
            categorySelect.style.padding = '6px 14px';
            categorySelect.style.border = '2px solid transparent';
            categorySelect.style.borderRadius = '20px';
            categorySelect.style.fontSize = '12px';
            categorySelect.style.fontWeight = '700';
            categorySelect.style.background = selectedColor.gradient;
            categorySelect.style.color = selectedColor.color;
            categorySelect.style.cursor = 'pointer';
            categorySelect.style.minWidth = '180px';
            categorySelect.style.textShadow = selectedColor.color === 'white' ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none';
            categorySelect.focus();
            
            // Update select style when category changes
            const updateSelectStyle = () => {
                const newCategory = categorySelect.value || '';
                const newColor = newCategory && categoryColors[newCategory] 
                    ? categoryColors[newCategory] 
                    : { gradient: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)', color: '#718096' };
                categorySelect.style.background = newColor.gradient;
                categorySelect.style.color = newColor.color;
                categorySelect.style.textShadow = newColor.color === 'white' ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none';
            };
            
            // Handle change event
            const saveCategory = () => {
                const newCategory = categorySelect.value || '';
                updatePurchaseCategory(purchaseId, newCategory);
            };
            
            // Update style on change, then save
            categorySelect.addEventListener('change', function() {
                updateSelectStyle();
                saveCategory();
            }, { once: true });
            
            // Handle blur (click outside)
            categorySelect.addEventListener('blur', function() {
                setTimeout(() => {
                    if (categorySelect.style.display !== 'none') {
                        saveCategory();
                    }
                }, 200);
            }, { once: true });
            
            // Handle Escape key
            categorySelect.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    categorySelect.style.display = 'none';
                    categoryElement.style.display = 'inline-block';
                }
            }, { once: true });
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
        showMessage('فروش یافت نشد', 'error');
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

// Update purchase category in database
function updatePurchaseCategory(purchaseId, newCategory) {
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
            showMessage('فروش یافت نشد', 'error');
            return;
        }
        
        // Update category
        purchase.category = newCategory;
        
        // Update in database
        const updateRequest = objectStore.put(purchase);
        
        updateRequest.onsuccess = () => {
            showMessage('دسته‌بندی با موفقیت به‌روزرسانی شد!', 'success');
            loadPurchases(); // Reload to show updated category
        };
        
        updateRequest.onerror = () => {
            showMessage('خطا در به‌روزرسانی دسته‌بندی', 'error');
        };
    };
    
    getRequest.onerror = () => {
        showMessage('Error loading purchase', 'error');
    };
}

// Attach delete button event listeners
function attachDeleteListeners() {
    const deleteButtons = document.querySelectorAll('.delete-purchase-btn');
    
    deleteButtons.forEach(deleteBtn => {
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const purchaseId = parseInt(this.getAttribute('data-purchase-id'));
            
            // Show confirmation dialog
            if (confirm('آیا مطمئن هستید که می‌خواهید این فروش را حذف کنید؟\n\nاین عمل قابل بازگشت نیست.')) {
                deletePurchase(purchaseId);
            }
        });
    });
}

// Delete purchase from database
function deletePurchase(purchaseId) {
    if (!db) {
        showMessage('Database not ready', 'error');
        return;
    }
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const deleteRequest = objectStore.delete(purchaseId);
    
    deleteRequest.onsuccess = () => {
        showMessage('فروش با موفقیت حذف شد!', 'success');
        loadPurchases(); // Reload to show updated list
    };
    
    deleteRequest.onerror = () => {
        showMessage('خطا در حذف فروش', 'error');
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
            container.innerHTML = '<div style="text-align: center; padding: 60px 20px;"><div style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;">📋</div><p style="color: #a0aec0; font-size: 16px; font-weight: 500;">هنوز فروشی ثبت نشده است</p><p style="color: #cbd5e0; font-size: 14px; margin-top: 8px;">برای شروع، اولین فروش را اضافه کنید</p></div>';
            return;
        }

        // Sort by date (newest first)
        purchases.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Category emoji mapping
        const categoryEmojis = {
            'فیلم و اهنگ': '🎬',
            'فیلتر شکن': '🔒',
            'اپل ایدی': '🍎',
            'لوازم جانبی': '📱',
            'خدمات اینستاگرام': '📸',
            'قفل گوشی': '🔓',
            'سایر': '📦'
        };

        // Category color mapping
        const categoryColors = {
            'فیلم و اهنگ': {
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#4c51bf',
                shadow: 'rgba(102, 126, 234, 0.3)'
            },
            'فیلتر شکن': {
                gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                color: '#0e7490',
                shadow: 'rgba(6, 182, 212, 0.3)'
            },
            'اپل ایدی': {
                gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#991b1b',
                shadow: 'rgba(239, 68, 68, 0.3)'
            },
            'لوازم جانبی': {
                gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#047857',
                shadow: 'rgba(16, 185, 129, 0.3)'
            },
            'خدمات اینستاگرام': {
                gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                color: '#9f1239',
                shadow: 'rgba(236, 72, 153, 0.3)'
            },
            'قفل گوشی': {
                gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#92400e',
                shadow: 'rgba(245, 158, 11, 0.3)'
            },
            'سایر': {
                gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                color: '#374151',
                shadow: 'rgba(107, 114, 128, 0.3)'
            }
        };

        container.innerHTML = purchases.map(purchase => {
            // Format date for display in Persian
            const purchaseDate = new Date(purchase.date);
            const formattedDate = typeof gregorianDateToPersian === 'function' 
                ? gregorianDateToPersian(purchaseDate) 
                : purchaseDate.toLocaleDateString();
            
            const formattedPrice = Math.round(purchase.price).toLocaleString('en-US');
            const phoneDisplay = purchase.phoneNumber ? ` - ${purchase.phoneNumber}` : '';
            const category = purchase.category || '';
            const categoryEmoji = category ? (categoryEmojis[category] || '📦') : '';
            const categoryColor = category ? categoryColors[category] : null;
            const categoryBadge = category 
                ? `<span class="goods-badge editable-category" data-category="${category}" data-purchase-id="${purchase.id}" style="background: ${categoryColor.gradient}; color: white; box-shadow: 0 2px 6px ${categoryColor.shadow}; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);">${categoryEmoji} ${category}</span>` 
                : `<span class="goods-badge editable-category" data-category="" data-purchase-id="${purchase.id}" style="background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%); color: #718096; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);">🏷️ بدون دسته‌بندی</span>`;
            const itemClass = category ? 'purchase-item has-goods' : 'purchase-item';
            // Extract colors from gradient for row styling
            let rowStyle = '';
            let dataAttributes = '';
            if (category && categoryColor) {
                // Extract hex colors from gradient
                const color1 = categoryColor.gradient.match(/#[0-9a-fA-F]{6}/g)?.[0] || '#667eea';
                const color2 = categoryColor.gradient.match(/#[0-9a-fA-F]{6}/g)?.[1] || '#764ba2';
                // Create semi-transparent background and colored border
                rowStyle = `background: linear-gradient(135deg, ${color1}15 0%, ${color2}15 100%); border: 2px solid ${color1}; box-shadow: 0 2px 8px ${categoryColor.shadow}; --category-color: ${color1}; --category-gradient: ${categoryColor.gradient}; --category-shadow: ${categoryColor.shadow};`;
                // Add data attribute for CSS styling
                dataAttributes = `data-category-color="${color1}"`;
            }
            const explanationDisplay = purchase.explanation ? `<div class="purchase-explanation">${purchase.explanation}</div>` : '';
            return `
                <div class="${itemClass}" data-purchase-id="${purchase.id}" style="${rowStyle}" ${dataAttributes}>
                    <div class="purchase-info">
                        <span>
                            <strong>${purchase.customerName}</strong>
                            ${phoneDisplay ? `<span style="color: #718096; font-size: 14px;">${phoneDisplay}</span>` : ''}
                            <span style="color: #a0aec0; font-size: 13px; margin: 0 8px;">•</span>
                            <span style="color: #718096; font-size: 14px;">📅 ${formattedDate}</span>
                        </span>
                        <span style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
                            ${categoryBadge}
                            <select class="category-edit-select" data-purchase-id="${purchase.id}" style="display: none;">
                                <option value="">بدون دسته‌بندی</option>
                                <option value="فیلم و اهنگ">🎬 فیلم و اهنگ</option>
                                <option value="فیلتر شکن">🔒 فیلتر شکن</option>
                                <option value="اپل ایدی">🍎 اپل ایدی</option>
                                <option value="لوازم جانبی">📱 لوازم جانبی</option>
                                <option value="خدمات اینستاگرام">📸 خدمات اینستاگرام</option>
                                <option value="قفل گوشی">🔓 قفل گوشی</option>
                                <option value="سایر">📦 سایر</option>
                            </select>
                        </span>
                        ${explanationDisplay}
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span class="price-container">
                            <span class="price editable-price" data-price="${purchase.price}" data-purchase-id="${purchase.id}">$${formattedPrice}</span>
                            <input type="text" class="price-edit-input" data-purchase-id="${purchase.id}" value="${purchase.price}" style="display: none;">
                        </span>
                        <button class="delete-purchase-btn" data-purchase-id="${purchase.id}" title="حذف فروش" aria-label="حذف فروش">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click event listeners for price editing
        attachPriceEditListeners();
        
        // Add click event listeners for category editing
        attachCategoryEditListeners();
        
        // Add click event listeners for delete buttons
        attachDeleteListeners();
    };
}


