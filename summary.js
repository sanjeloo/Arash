// Customer Purchase Summary functionality
// Note: STORE_NAME and db are defined in script.js and accessible globally

// Filter purchases by date range and category
function filterPurchasesByDateRange(purchases, fromDate, toDate, category) {
    let filtered = purchases;
    console.warn('[Filter] Starting filter with:', { 
        totalPurchases: purchases.length, 
        fromDate, 
        toDate, 
        category 
    });
    
    // Filter by date range
    if (fromDate || toDate) {
        console.warn('[Filter] Applying date filter...');
        const beforeDateFilter = filtered.length;
        
        let sampleLogged = false;
        filtered = filtered.filter((purchase, index) => {
            const purchaseDate = new Date(purchase.date);
            purchaseDate.setHours(0, 0, 0, 0);
            
            if (fromDate && toDate) {
                const from = new Date(fromDate);
                from.setHours(0, 0, 0, 0);
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                
                const isInRange = purchaseDate >= from && purchaseDate <= to;
                
                // Log first few comparisons as sample
                if (!sampleLogged && index < 3) {
                    console.warn('[Filter] Sample date comparison:', {
                        purchaseDate: purchaseDate.toISOString(),
                        from: from.toISOString(),
                        to: to.toISOString(),
                        isInRange
                    });
                    if (index === 2) sampleLogged = true;
                }
                
                return isInRange;
            } else if (fromDate) {
                const from = new Date(fromDate);
                from.setHours(0, 0, 0, 0);
                const isInRange = purchaseDate >= from;
                
                if (!sampleLogged && index < 3) {
                    console.warn('[Filter] Sample from date comparison:', {
                        purchaseDate: purchaseDate.toISOString(),
                        from: from.toISOString(),
                        isInRange
                    });
                    if (index === 2) sampleLogged = true;
                }
                return isInRange;
            } else if (toDate) {
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                const isInRange = purchaseDate <= to;
                
                if (!sampleLogged && index < 3) {
                    console.warn('[Filter] Sample to date comparison:', {
                        purchaseDate: purchaseDate.toISOString(),
                        to: to.toISOString(),
                        isInRange
                    });
                    if (index === 2) sampleLogged = true;
                }
                return isInRange;
            }
            return true;
        });
        
        console.warn('[Filter] After date filter:', { 
            before: beforeDateFilter, 
            after: filtered.length 
        });
    } else {
        console.warn('[Filter] No date filter applied');
    }
    
    // Filter by category
    if (category && category.trim() !== '') {
        const beforeCategoryFilter = filtered.length;
        filtered = filtered.filter(purchase => {
            return purchase.category === category;
        });
        console.warn('[Filter] After category filter:', { 
            before: beforeCategoryFilter, 
            after: filtered.length,
            category
        });
    } else {
        console.warn('[Filter] No category filter applied');
    }
    
    console.warn('[Filter] Final filtered count:', filtered.length);
    return filtered;
}

// Show customer purchase summary
function showSummary() {
    if (!db) {
        showMessage('پایگاه داده آماده نیست. لطفاً صفحه را رفرش کنید.', 'error');
        return;
    }

    try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.getAll();

        request.onsuccess = () => {
            let purchases = request.result;
            console.warn('[Summary] Total purchases before filter:', purchases.length);
            
            // Apply date range and category filters
            // Get Persian date strings and convert to Gregorian
            const persianFromDate = document.getElementById('summaryFromDate')?.value || '';
            const persianToDate = document.getElementById('summaryToDate')?.value || '';
            console.warn('[Summary] Persian dates from inputs:', { persianFromDate, persianToDate });
            
            const fromDate = persianFromDate ? getGregorianDateFromPersian(persianFromDate) : '';
            const toDate = persianToDate ? getGregorianDateFromPersian(persianToDate) : '';
            console.warn('[Summary] Converted Gregorian dates:', { fromDate, toDate });
            
            const category = document.getElementById('summaryCategory')?.value || '';
            console.warn('[Summary] Category filter:', category);
            
            purchases = filterPurchasesByDateRange(purchases, fromDate, toDate, category);
            console.warn('[Summary] Total purchases after filter:', purchases.length);
            
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
        };

        request.onerror = (event) => {
            showMessage('خطا در بارگذاری فروش‌ها برای خلاصه', 'error');
        };
    } catch (error) {
        showMessage('Error generating summary. Please try again.', 'error');
    }
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
                    console.log('[Summary] Dialog shown, initializing date pickers...');
                    // Ensure date pickers are initialized after dialog is visible
                    setTimeout(() => {
                        console.log('[Summary] Checking initDatePicker function:', typeof initDatePicker);
                        if (typeof initDatePicker === 'function') {
                            console.log('[Summary] Calling initDatePicker for summary dates...');
                            initDatePicker('summaryFromDate');
                            initDatePicker('summaryToDate');
                        } else {
                            console.error('[Summary] initDatePicker function not found!');
                        }
                    }, 50);
                }, 10);
            }
            showSummary();
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
            if (summaryFromDateEl && $(summaryFromDateEl).data('pDatepicker')) {
                $(summaryFromDateEl).pDatepicker('clear');
            } else {
                summaryFromDateEl.value = '';
            }
            if (summaryToDateEl && $(summaryToDateEl).data('pDatepicker')) {
                $(summaryToDateEl).pDatepicker('clear');
            } else {
                summaryToDateEl.value = '';
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSummary);
} else {
    // DOM is already ready
    initSummary();
}

