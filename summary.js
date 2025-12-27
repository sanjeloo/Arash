// Customer Purchase Summary functionality
// Note: STORE_NAME and db are defined in script.js and accessible globally
// Date picker functions are in persian-datepicker.js

// Filter purchases by date range and category
function filterPurchasesByDateRange(purchases, fromDate, toDate, category) {
    let filtered = purchases;
    
    // Filter by date range
    if (fromDate || toDate) {
        filtered = filtered.filter((purchase) => {
            const purchaseDate = new Date(purchase.date);
            purchaseDate.setHours(0, 0, 0, 0);
            
            if (fromDate && toDate) {
                const from = new Date(fromDate);
                from.setHours(0, 0, 0, 0);
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                return purchaseDate >= from && purchaseDate <= to;
            } else if (fromDate) {
                const from = new Date(fromDate);
                from.setHours(0, 0, 0, 0);
                return purchaseDate >= from;
            } else if (toDate) {
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                return purchaseDate <= to;
            }
            return true;
        });
    }
    
    // Filter by category
    if (category && category.trim() !== '') {
        filtered = filtered.filter(purchase => {
            return purchase.category === category;
        });
    }
    
    return filtered;
}

// Fetch purchases using cursor with date and category filters
function fetchPurchasesWithFilters(fromDate, toDate, category, callback) {
    if (!db) {
        callback([]);
        return;
    }
    
    const purchases = [];
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const index = objectStore.index('date');
    
    // Create date range for cursor
    let keyRange = null;
    if (fromDate && toDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        keyRange = IDBKeyRange.bound(from.toISOString(), to.toISOString(), false, false);
    } else if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        keyRange = IDBKeyRange.lowerBound(from.toISOString(), false);
    } else if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        keyRange = IDBKeyRange.upperBound(to.toISOString(), false);
    }
    
    const request = keyRange ? index.openCursor(keyRange) : index.openCursor();
    
    request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (!cursor) {
            // All records processed, apply category filter and return
            let filtered = purchases;
            if (category && category.trim() !== '') {
                filtered = purchases.filter(purchase => purchase.category === category);
            }
            callback(filtered);
            return;
        }
        
        const purchase = cursor.value;
        purchases.push(purchase);
        cursor.continue();
    };
    
    request.onerror = () => {
        callback([]);
    };
}

// Show customer purchase summary
function showSummary() {
    if (!db) {
        showMessage('پایگاه داده آماده نیست. لطفاً صفحه را رفرش کنید.', 'error');
        return;
    }

    // Validate required dates
    const persianFromDate = document.getElementById('summaryFromDate')?.value || '';
    const persianToDate = document.getElementById('summaryToDate')?.value || '';
    
    if (!persianFromDate || !persianToDate) {
        const summaryContainer = document.getElementById('summaryContainer');
        if (summaryContainer) {
            summaryContainer.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 20px; font-weight: 600;">⚠️ لطفاً تاریخ شروع و پایان را انتخاب کنید</p>';
        }
        return;
    }
    
    // Convert Persian dates to Gregorian for filtering
    const fromDate = persianFromDate && typeof getGregorianDateFromPersian === 'function' 
        ? getGregorianDateFromPersian(persianFromDate) 
        : '';
    const toDate = persianToDate && typeof getGregorianDateFromPersian === 'function' 
        ? getGregorianDateFromPersian(persianToDate) 
        : '';
    
    if (!fromDate || !toDate) {
        const summaryContainer = document.getElementById('summaryContainer');
        if (summaryContainer) {
            summaryContainer.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 20px; font-weight: 600;">⚠️ لطفاً تاریخ‌های معتبری انتخاب کنید</p>';
        }
        return;
    }
    
    const category = document.getElementById('summaryCategory')?.value || '';
    
    // Show loading message
    const summaryContainer = document.getElementById('summaryContainer');
    if (summaryContainer) {
        summaryContainer.innerHTML = '<p style="color: #667eea; text-align: center; padding: 20px;">در حال بارگذاری...</p>';
    }
    
    // Fetch purchases using cursor
    fetchPurchasesWithFilters(fromDate, toDate, category, (purchases) => {
        try {
            
            const summaryContainer = document.getElementById('summaryContainer');
            const summarySection = document.getElementById('summarySection');
            
            if (!summaryContainer || !summarySection) {
                return;
            }
            
            if (purchases.length === 0) {
                summaryContainer.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">فروشی برای خلاصه‌سازی وجود ندارد</p>';
                return;
            }

            // Group purchases by customer name
            const customerSummary = {};
            
            purchases.forEach((purchase, index) => {
                if (!purchase.customerName || !purchase.price) {
                    return;
                }
                
                const customerName = purchase.customerName;
                const price = Math.round(purchase.price);
                
                if (!customerSummary[customerName]) {
                    customerSummary[customerName] = {
                        name: customerName,
                        total: 0,
                        count: 0
                    };
                }
                
                customerSummary[customerName].total += price;
                customerSummary[customerName].count += 1;
            });

            // Convert to array and sort by total (descending)
            const summaryArray = Object.values(customerSummary);
            
            if (summaryArray.length === 0) {
                summaryContainer.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">فروش معتبری برای خلاصه‌سازی وجود ندارد</p>';
                return;
            }
            
            summaryArray.sort((a, b) => b.total - a.total);

            // Calculate grand total
            const grandTotal = summaryArray.reduce((sum, customer) => sum + customer.total, 0);
            const totalCount = purchases.length;

            // Generate table HTML
            let tableHTML = '<table class="summary-table"><thead><tr><th>نام مشتری</th><th style="text-align: center;">تعداد فروش</th><th style="text-align: right;">مبلغ کل</th></tr></thead><tbody>';

            summaryArray.forEach((customer, index) => {
                const formattedTotal = customer.total.toLocaleString('en-US');
                tableHTML += '<tr><td><strong>' + customer.name + '</strong></td><td style="text-align: center;">' + customer.count + '</td><td style="text-align: right; color: #667eea; font-weight: 600;">$' + formattedTotal + '</td></tr>';
            });

            // Add total row
            const formattedGrandTotal = grandTotal.toLocaleString('en-US');
            tableHTML += '</tbody><tfoot><tr class="total-row"><td><strong>جمع کل</strong></td><td style="text-align: center;"><strong>' + totalCount + '</strong></td><td style="text-align: right; color: #667eea;"><strong>$' + formattedGrandTotal + '</strong></td></tr></tfoot></table>';
            
            summaryContainer.innerHTML = tableHTML;
            
            // Show backdrop first
            const backdrop = document.getElementById('summaryBackdrop');
            if (backdrop) {
                backdrop.style.display = 'block';
            }
            
            // Show summary section with transition
            summarySection.style.display = 'flex';
            // Use setTimeout to trigger transition
            setTimeout(() => {
                summarySection.classList.add('show');
            }, 10);
        } catch (error) {
            showMessage('خطا در تولید خلاصه. لطفاً دوباره تلاش کنید.', 'error');
        }
    });
}

// Initialize summary functionality
function initSummary() {
    // Event listener for summary button
    const summaryBtn = document.getElementById('summaryBtn');
    if (summaryBtn) {
        summaryBtn.addEventListener('click', function() {
            // Show dialog first, then load summary
            const summarySection = document.getElementById('summarySection');
            const backdrop = document.getElementById('summaryBackdrop');
            if (summarySection && backdrop) {
                backdrop.style.display = 'block';
                summarySection.style.display = 'flex';
                setTimeout(() => {
                    summarySection.classList.add('show');
                    // Initialize date pickers after dialog is visible
                    setTimeout(() => {
                        initSummaryDatePickers();
                    }, 100);
                }, 10);
            }
            // Clear container - user must click "Apply Filter" to see results
            const summaryContainer = document.getElementById('summaryContainer');
            if (summaryContainer) {
                summaryContainer.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">لطفاً تاریخ شروع و پایان را انتخاب کرده و روی "اعمال فیلتر" کلیک کنید</p>';
            }
        });
    }

    // Event listener for close summary button
    const closeSummaryBtn = document.getElementById('closeSummaryBtn');
    const backdrop = document.getElementById('summaryBackdrop');
    if (closeSummaryBtn) {
        closeSummaryBtn.addEventListener('click', function() {
            const summarySection = document.getElementById('summarySection');
            if (summarySection) {
                summarySection.classList.remove('show');
                setTimeout(() => {
                    summarySection.style.display = 'none';
                    if (backdrop) {
                        backdrop.style.display = 'none';
                    }
                }, 300); // Wait for transition to complete
            }
        });
    }
    
    // Event listener for apply filter button
    const applyFilterBtn = document.getElementById('applySummaryFilter');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', showSummary);
    }
    
    // Event listener for clear filter button
    const clearFilterBtn = document.getElementById('clearSummaryFilter');
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', function() {
            const summaryFromDateEl = document.getElementById('summaryFromDate');
            const summaryToDateEl = document.getElementById('summaryToDate');
            if (summaryFromDateEl) {
                summaryFromDateEl.value = '';
                if ($(summaryFromDateEl).data('pDatepicker')) {
                    $(summaryFromDateEl).pDatepicker('setDate', null);
                }
            }
            if (summaryToDateEl) {
                summaryToDateEl.value = '';
                if ($(summaryToDateEl).data('pDatepicker')) {
                    $(summaryToDateEl).pDatepicker('setDate', null);
                }
            }
            document.getElementById('summaryCategory').value = '';
            showSummary();
        });
    }
    
    // Close on backdrop click
    if (backdrop) {
        backdrop.addEventListener('click', function(e) {
            if (e.target === backdrop) {
                const summarySection = document.getElementById('summarySection');
                if (summarySection) {
                    summarySection.classList.remove('show');
                    setTimeout(() => {
                        summarySection.style.display = 'none';
                        backdrop.style.display = 'none';
                    }, 300);
                }
            }
        });
    }
}

// Initialize date pickers for summary dialog
function initSummaryDatePickers() {
    if (typeof initPersianDatePickers === 'function') {
        initPersianDatePickers(['summaryFromDate', 'summaryToDate'], {
            calendar: {
                persian: {
                    leapYearMode: 'astronomical'
                }
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSummary);
} else {
    // DOM is already ready
    initSummary();
}

