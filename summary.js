// Customer Purchase Summary functionality
// Note: STORE_NAME and db are defined in script.js and accessible globally

// Filter purchases by date range and category
function filterPurchasesByDateRange(purchases, fromDate, toDate, category) {
    let filtered = purchases;
    
    // Filter by date range
    if (fromDate || toDate) {
        filtered = filtered.filter(purchase => {
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

// Show customer purchase summary
function showSummary() {
    console.log('=== showSummary called ===');
    console.log('db:', db);
    console.log('STORE_NAME:', typeof STORE_NAME !== 'undefined' ? STORE_NAME : 'UNDEFINED');
    
    if (!db) {
        console.error('Database not available');
        showMessage('پایگاه داده آماده نیست. لطفاً صفحه را رفرش کنید.', 'error');
        return;
    }

    try {
        console.log('Creating transaction for store:', STORE_NAME);
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        console.log('Object store:', objectStore);
        
        const request = objectStore.getAll();
        console.log('Request created, waiting for result...');

        request.onsuccess = () => {
            console.log('=== Request successful ===');
            let purchases = request.result;
            
            // Apply date range and category filters
            const fromDate = document.getElementById('summaryFromDate')?.value || '';
            const toDate = document.getElementById('summaryToDate')?.value || '';
            const category = document.getElementById('summaryCategory')?.value || '';
            purchases = filterPurchasesByDateRange(purchases, fromDate, toDate, category);
            console.log('Purchases retrieved:', purchases);
            console.log('Number of purchases:', purchases.length);
            console.log('First purchase sample:', purchases[0]);
            
            const summaryContainer = document.getElementById('summaryContainer');
            const summarySection = document.getElementById('summarySection');
            
            console.log('summaryContainer:', summaryContainer);
            console.log('summarySection:', summarySection);
            
            if (!summaryContainer || !summarySection) {
                console.error('Summary container elements not found');
                return;
            }
            
            if (purchases.length === 0) {
                console.log('No purchases found');
                summaryContainer.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">فروشی برای خلاصه‌سازی وجود ندارد</p>';
                return;
            }

            // Group purchases by customer name
            const customerSummary = {};
            console.log('Starting to process purchases...');
            
            purchases.forEach((purchase, index) => {
                console.log(`Processing purchase ${index}:`, purchase);
                
                if (!purchase.customerName || !purchase.price) {
                    console.warn('Invalid purchase data at index', index, ':', purchase);
                    return;
                }
                
                const customerName = purchase.customerName;
                const price = Math.round(purchase.price);
                console.log(`  Customer: ${customerName}, Price: ${price}`);
                
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

            console.log('Customer summary object:', customerSummary);

            // Convert to array and sort by total (descending)
            const summaryArray = Object.values(customerSummary);
            console.log('Summary array (before sort):', summaryArray);
            
            if (summaryArray.length === 0) {
                console.error('Summary array is empty after processing');
                summaryContainer.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">فروش معتبری برای خلاصه‌سازی وجود ندارد</p>';
                return;
            }
            
            summaryArray.sort((a, b) => b.total - a.total);
            console.log('Summary array (after sort):', summaryArray);

            // Calculate grand total
            const grandTotal = summaryArray.reduce((sum, customer) => sum + customer.total, 0);
            const totalCount = purchases.length;
            console.log('Grand total:', grandTotal);
            console.log('Total count:', totalCount);

            // Generate table HTML
            let tableHTML = '<table class="summary-table"><thead><tr><th>نام مشتری</th><th style="text-align: center;">تعداد فروش</th><th style="text-align: right;">مبلغ کل</th></tr></thead><tbody>';

            console.log('Generating table rows for', summaryArray.length, 'customers');
            summaryArray.forEach((customer, index) => {
                console.log(`  Row ${index}:`, customer);
                const formattedTotal = customer.total.toLocaleString('en-US');
                tableHTML += '<tr><td><strong>' + customer.name + '</strong></td><td style="text-align: center;">' + customer.count + '</td><td style="text-align: right; color: #667eea; font-weight: 600;">$' + formattedTotal + '</td></tr>';
            });

            // Add total row
            const formattedGrandTotal = grandTotal.toLocaleString('en-US');
            tableHTML += '</tbody><tfoot><tr class="total-row"><td><strong>جمع کل</strong></td><td style="text-align: center;"><strong>' + totalCount + '</strong></td><td style="text-align: right; color: #667eea;"><strong>$' + formattedGrandTotal + '</strong></td></tr></tfoot></table>';

            console.log('Generated HTML length:', tableHTML.length);
            console.log('Generated HTML preview:', tableHTML.substring(0, 200));
            console.log('Full generated HTML:', tableHTML);
            
            summaryContainer.innerHTML = tableHTML;
            console.log('innerHTML set. Container innerHTML length:', summaryContainer.innerHTML.length);
            console.log('Container has table?', summaryContainer.querySelector('table') !== null);
            console.log('Container tbody rows count:', summaryContainer.querySelectorAll('tbody tr').length);
            
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
            
            console.log('Summary section displayed');
        };

        request.onerror = (event) => {
            console.error('=== Request error ===');
            console.error('Error loading purchases:', event.target.error);
            showMessage('خطا در بارگذاری فروش‌ها برای خلاصه', 'error');
        };
    } catch (error) {
        console.error('=== Exception in showSummary ===');
        console.error('Error:', error);
        console.error('Error stack:', error.stack);
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
                }, 10);
            }
            showSummary();
        });
    } else {
        console.error('Summary button not found');
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
            document.getElementById('summaryFromDate').value = '';
            document.getElementById('summaryToDate').value = '';
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

