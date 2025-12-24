// Database reset functionality
// Note: DB_NAME, STORE_NAME are defined in script.js and accessible globally

// Reset database with confirmation
function resetDatabase() {
    // Show confirmation dialog
    const resetDialog = document.getElementById('resetDialog');
    const resetBackdrop = document.getElementById('resetBackdrop');
    
    if (resetDialog && resetBackdrop) {
        resetBackdrop.style.display = 'block';
        resetDialog.style.display = 'flex';
        setTimeout(() => {
            resetDialog.classList.add('show');
        }, 10);
    }
}

// Confirm and execute database reset (only purchases, not customers)
function confirmReset() {
    if (!db) {
        showMessage('پایگاه داده در دسترس نیست', 'error');
        closeResetDialog();
        return;
    }

    try {
        // Close the confirmation dialog first
        closeResetDialog();
        
        // Clear only the purchases store, keep customer database intact
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const clearRequest = objectStore.clear();
        
        clearRequest.onsuccess = () => {
            showMessage('سوابق خرید با موفقیت بازنشانی شد! اطلاعات مشتریان حفظ شد.', 'success');
            // Reload purchases list
            if (typeof loadPurchases === 'function') {
                loadPurchases();
            }
            // Reload page after a short delay to refresh UI
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        };
        
        clearRequest.onerror = (event) => {
            console.error('Error clearing purchases:', event.target.error);
            showMessage('خطا در بازنشانی خریدها. لطفاً دوباره تلاش کنید.', 'error');
        };
    } catch (error) {
        console.error('Error in confirmReset:', error);
        showMessage('خطا در بازنشانی پایگاه داده. لطفاً دوباره تلاش کنید.', 'error');
    }
}

// Close reset confirmation dialog
function closeResetDialog() {
    const resetDialog = document.getElementById('resetDialog');
    const resetBackdrop = document.getElementById('resetBackdrop');
    
    if (resetDialog) {
        resetDialog.classList.remove('show');
        setTimeout(() => {
            resetDialog.style.display = 'none';
            if (resetBackdrop) {
                resetBackdrop.style.display = 'none';
            }
        }, 300);
    }
}

// Initialize reset functionality
function initReset() {
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetDatabase);
    } else {
        console.error('Reset button not found');
    }

    const confirmResetBtn = document.getElementById('confirmResetBtn');
    if (confirmResetBtn) {
        confirmResetBtn.addEventListener('click', confirmReset);
    }

    const cancelResetBtn = document.getElementById('cancelResetBtn');
    if (cancelResetBtn) {
        cancelResetBtn.addEventListener('click', closeResetDialog);
    }

    const resetBackdrop = document.getElementById('resetBackdrop');
    if (resetBackdrop) {
        resetBackdrop.addEventListener('click', function(e) {
            if (e.target === resetBackdrop) {
                closeResetDialog();
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReset);
} else {
    initReset();
}

