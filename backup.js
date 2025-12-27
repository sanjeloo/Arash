// Backup and Restore functionality

// Backup purchases database
function backupPurchases() {
    if (!db) {
        showMessage('پایگاه داده آماده نیست. لطفاً صفحه را رفرش کنید.', 'error');
        return;
    }

    try {
        const purchaseTransaction = db.transaction([STORE_NAME], 'readonly');
        const purchaseStore = purchaseTransaction.objectStore(STORE_NAME);
        const purchaseRequest = purchaseStore.getAll();

        purchaseRequest.onsuccess = () => {
            const purchases = purchaseRequest.result;
            const purchaseData = JSON.stringify(purchases, null, 2);
            
            // Create download link for purchases
            const purchaseBlob = new Blob([purchaseData], { type: 'application/json' });
            const purchaseUrl = URL.createObjectURL(purchaseBlob);
            const purchaseLink = document.createElement('a');
            purchaseLink.href = purchaseUrl;
            purchaseLink.download = 'purchases_backup.json';
            document.body.appendChild(purchaseLink);
            purchaseLink.click();
            document.body.removeChild(purchaseLink);
            URL.revokeObjectURL(purchaseUrl);

            showMessage('پشتیبان‌گیری فروش‌ها با موفقیت انجام شد!', 'success');
        };

        purchaseRequest.onerror = () => {
            showMessage('خطا در پشتیبان‌گیری داده‌های فروش', 'error');
        };
    } catch (error) {
        showMessage('خطا در ایجاد پشتیبان فروش‌ها. لطفاً دوباره تلاش کنید.', 'error');
    }
}

// Backup customers database
function backupCustomers() {
    if (!customerDb) {
        showMessage('پایگاه داده مشتریان آماده نیست. لطفاً صفحه را رفرش کنید.', 'error');
        return;
    }

    try {
        const customerTransaction = customerDb.transaction([CUSTOMER_STORE_NAME], 'readonly');
        const customerStore = customerTransaction.objectStore(CUSTOMER_STORE_NAME);
        const customerRequest = customerStore.getAll();

        customerRequest.onsuccess = () => {
            const customers = customerRequest.result;
            const customerData = JSON.stringify(customers, null, 2);
            
            // Create download link for customers
            const customerBlob = new Blob([customerData], { type: 'application/json' });
            const customerUrl = URL.createObjectURL(customerBlob);
            const customerLink = document.createElement('a');
            customerLink.href = customerUrl;
            customerLink.download = 'customers_backup.json';
            document.body.appendChild(customerLink);
            customerLink.click();
            document.body.removeChild(customerLink);
            URL.revokeObjectURL(customerUrl);

            showMessage('پشتیبان‌گیری مشتریان با موفقیت انجام شد!', 'success');
        };

        customerRequest.onerror = () => {
            showMessage('خطا در پشتیبان‌گیری داده‌های مشتریان', 'error');
        };
    } catch (error) {
        showMessage('خطا در ایجاد پشتیبان مشتریان. لطفاً دوباره تلاش کنید.', 'error');
    }
}

// Restore purchases from JSON file
function restorePurchases() {
    if (!confirm('بازیابی فروش‌ها تمام سوابق فروش موجود را جایگزین می‌کند. آیا مطمئن هستید که می‌خواهید ادامه دهید؟')) {
        return;
    }

    // Create file input for purchases
    const purchaseInput = document.createElement('input');
    purchaseInput.type = 'file';
    purchaseInput.accept = '.json';
    purchaseInput.style.display = 'none';
    
    purchaseInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const purchases = JSON.parse(event.target.result);
                
                if (!Array.isArray(purchases)) {
                    showMessage('فرمت فایل پشتیبان فروش‌ها نامعتبر است', 'error');
                    return;
                }

                // Restore purchases
                if (db) {
                    const transaction = db.transaction([STORE_NAME], 'readwrite');
                    const objectStore = transaction.objectStore(STORE_NAME);
                    
                    // Clear existing data
                    objectStore.clear().onsuccess = () => {
                        // Add all purchases
                        let completed = 0;
                        let errors = 0;
                        
                        if (purchases.length === 0) {
                            showMessage('فروش‌ها بازیابی شد (فایل خالی بود). صفحه رفرش می‌شود...', 'success');
                            setTimeout(() => {
                                window.location.reload();
                            }, 1500);
                            return;
                        }

                        purchases.forEach((purchase, index) => {
                            const request = objectStore.add(purchase);
                            request.onsuccess = () => {
                                completed++;
                                if (completed + errors === purchases.length) {
                                    if (errors === 0) {
                                        showMessage('فروش‌ها با موفقیت بازیابی شد! صفحه رفرش می‌شود...', 'success');
                                        setTimeout(() => {
                                            window.location.reload();
                                        }, 1500);
                                    } else {
                                        showMessage(`فروش‌ها با ${errors} خطا بازیابی شد. صفحه رفرش می‌شود...`, 'error');
                                        setTimeout(() => {
                                            window.location.reload();
                                        }, 1500);
                                    }
                                }
                            };
                            request.onerror = () => {
                                errors++;
                                if (completed + errors === purchases.length) {
                                    if (errors === 0) {
                                        showMessage('فروش‌ها با موفقیت بازیابی شد! صفحه رفرش می‌شود...', 'success');
                                        setTimeout(() => {
                                            window.location.reload();
                                        }, 1500);
                                    } else {
                                        showMessage(`فروش‌ها با ${errors} خطا بازیابی شد. صفحه رفرش می‌شود...`, 'error');
                                        setTimeout(() => {
                                            window.location.reload();
                                        }, 1500);
                                    }
                                }
                            };
                        });
                    };
                } else {
                    showMessage('پایگاه داده آماده نیست', 'error');
                }
            } catch (error) {
                showMessage('خطا در خواندن فایل پشتیبان فروش‌ها. فرمت JSON نامعتبر است.', 'error');
            }
        };
        reader.readAsText(file);
    };
    
    document.body.appendChild(purchaseInput);
    purchaseInput.click();
    document.body.removeChild(purchaseInput);
}

// Restore customers from JSON file
function restoreCustomers() {
    if (!confirm('بازیابی مشتریان تمام سوابق مشتری موجود را جایگزین می‌کند. آیا مطمئن هستید که می‌خواهید ادامه دهید؟')) {
        return;
    }

    // Create file input for customers
    const customerInput = document.createElement('input');
    customerInput.type = 'file';
    customerInput.accept = '.json';
    customerInput.style.display = 'none';
    
    customerInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const customers = JSON.parse(event.target.result);
                
                if (!Array.isArray(customers)) {
                    showMessage('فرمت فایل پشتیبان مشتریان نامعتبر است', 'error');
                    return;
                }

                // Restore customers
                if (customerDb) {
                    const transaction = customerDb.transaction([CUSTOMER_STORE_NAME], 'readwrite');
                    const objectStore = transaction.objectStore(CUSTOMER_STORE_NAME);
                    
                    // Clear existing data
                    objectStore.clear().onsuccess = () => {
                        // Add all customers
                        let completed = 0;
                        let errors = 0;
                        
                        if (customers.length === 0) {
                            showMessage('مشتریان بازیابی شد (فایل خالی بود). صفحه رفرش می‌شود...', 'success');
                            setTimeout(() => {
                                window.location.reload();
                            }, 1500);
                            return;
                        }

                        customers.forEach((customer, index) => {
                            const request = objectStore.put(customer);
                            request.onsuccess = () => {
                                completed++;
                                if (completed + errors === customers.length) {
                                    if (errors === 0) {
                                        showMessage('مشتریان با موفقیت بازیابی شد! صفحه رفرش می‌شود...', 'success');
                                        setTimeout(() => {
                                            window.location.reload();
                                        }, 1500);
                                    } else {
                                        showMessage(`مشتریان با ${errors} خطا بازیابی شد. صفحه رفرش می‌شود...`, 'error');
                                        setTimeout(() => {
                                            window.location.reload();
                                        }, 1500);
                                    }
                                }
                            };
                            request.onerror = () => {
                                errors++;
                                if (completed + errors === customers.length) {
                                    if (errors === 0) {
                                        showMessage('مشتریان با موفقیت بازیابی شد! صفحه رفرش می‌شود...', 'success');
                                        setTimeout(() => {
                                            window.location.reload();
                                        }, 1500);
                                    } else {
                                        showMessage(`مشتریان با ${errors} خطا بازیابی شد. صفحه رفرش می‌شود...`, 'error');
                                        setTimeout(() => {
                                            window.location.reload();
                                        }, 1500);
                                    }
                                }
                            };
                        });
                    };
                } else {
                    showMessage('پایگاه داده مشتریان آماده نیست', 'error');
                }
            } catch (error) {
                showMessage('خطا در خواندن فایل پشتیبان مشتریان. فرمت JSON نامعتبر است.', 'error');
            }
        };
        reader.readAsText(file);
    };
    
    document.body.appendChild(customerInput);
    customerInput.click();
    document.body.removeChild(customerInput);
}

// Initialize backup/restore functionality
function initBackup() {
    const backupPurchasesBtn = document.getElementById('backupPurchasesBtn');
    if (backupPurchasesBtn) {
        backupPurchasesBtn.addEventListener('click', backupPurchases);
    }

    const backupCustomersBtn = document.getElementById('backupCustomersBtn');
    if (backupCustomersBtn) {
        backupCustomersBtn.addEventListener('click', backupCustomers);
    }

    const restorePurchasesBtn = document.getElementById('restorePurchasesBtn');
    if (restorePurchasesBtn) {
        restorePurchasesBtn.addEventListener('click', restorePurchases);
    }

    const restoreCustomersBtn = document.getElementById('restoreCustomersBtn');
    if (restoreCustomersBtn) {
        restoreCustomersBtn.addEventListener('click', restoreCustomers);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackup);
} else {
    initBackup();
}


