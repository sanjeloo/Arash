// Lottery functionality
// Note: customerDb, CUSTOMER_DB_NAME, CUSTOMER_STORE_NAME are defined in script.js

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

// Run lottery
function runLottery() {
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
            console.warn('[Lottery] Total purchases before filter:', purchases.length);
            
            // Apply date range and category filters
            // Get Persian date strings and convert to Gregorian
            const persianFromDate = document.getElementById('lotteryFromDate')?.value || '';
            const persianToDate = document.getElementById('lotteryToDate')?.value || '';
            console.warn('[Lottery] Persian dates from inputs:', { persianFromDate, persianToDate });
            
            const fromDate = persianFromDate ? getGregorianDateFromPersian(persianFromDate) : '';
            const toDate = persianToDate ? getGregorianDateFromPersian(persianToDate) : '';
            console.warn('[Lottery] Converted Gregorian dates:', { fromDate, toDate });
            
            const category = document.getElementById('lotteryCategory')?.value || '';
            console.warn('[Lottery] Category filter:', category);
            
            purchases = filterPurchasesByDateRange(purchases, fromDate, toDate, category);
            console.warn('[Lottery] Total purchases after filter:', purchases.length);
            
            if (purchases.length === 0) {
                showMessage('فروشی یافت نشد. ابتدا چند فروش اضافه کنید.', 'error');
                return;
            }

            // Group purchases by customer name (same as summary)
            const customerSummary = {};
            
            purchases.forEach(purchase => {
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

            // Get phone numbers from customer database
            if (customerDb) {
                const customerTransaction = customerDb.transaction([CUSTOMER_STORE_NAME], 'readonly');
                const customerStore = customerTransaction.objectStore(CUSTOMER_STORE_NAME);
                const customerRequest = customerStore.getAll();

                customerRequest.onsuccess = () => {
                    const customers = customerRequest.result;
                    const customerPhoneMap = new Map();
                    
                    // Create a map of customer names to phone numbers
                    customers.forEach(customer => {
                        customerPhoneMap.set(customer.customerName, customer.phoneNumber || '');
                    });

                    // Calculate chance codes for each customer
                    const lotteryParticipants = [];
                    let currentCode = 1;
                    
                    Object.values(customerSummary).forEach(customer => {
                        // Divide by 50,000 and floor it
                        const chances = Math.floor(customer.total / 50000);
                        
                        if (chances >= 1) {
                            const codes = [];
                            for (let i = 0; i < chances; i++) {
                                codes.push(currentCode++);
                            }
                            
                            lotteryParticipants.push({
                                name: customer.name,
                                phoneNumber: customerPhoneMap.get(customer.name) || '',
                                total: customer.total,
                                count: customer.count,
                                chances: chances,
                                codes: codes
                            });
                        }
                    });

                    if (lotteryParticipants.length === 0) {
                        showMessage('هیچ مشتری واجد شرایط قرعه‌کشی نیست. مشتریان باید حداقل 50,000 فروش داشته باشند.', 'error');
                        return;
                    }

                    // Pick a random winner
                    const totalCodes = currentCode - 1; // Total number of codes generated
                    const winningCode = Math.floor(Math.random() * totalCodes) + 1;
                    
                    // Find the winner
                    let winner = null;
                    for (const participant of lotteryParticipants) {
                        if (participant.codes.includes(winningCode)) {
                            winner = participant;
                            break;
                        }
                    }

                    // Display lottery results
                    showLotteryResults(lotteryParticipants, winningCode, winner);
                };

                customerRequest.onerror = () => {
                    // If customer DB fails, continue without phone numbers
                    calculateLotteryWithoutPhones(customerSummary);
                };
            } else {
                // If customer DB not available, continue without phone numbers
                calculateLotteryWithoutPhones(customerSummary);
            }
        };

        request.onerror = (event) => {
            showMessage('Error loading purchases for lottery', 'error');
        };
    } catch (error) {
        showMessage('Error running lottery. Please try again.', 'error');
    }
}

// Calculate lottery without phone numbers (fallback)
function calculateLotteryWithoutPhones(customerSummary) {
    const lotteryParticipants = [];
    let currentCode = 1;
    
    Object.values(customerSummary).forEach(customer => {
        const chances = Math.floor(customer.total / 50000);
        
        if (chances >= 1) {
            const codes = [];
            for (let i = 0; i < chances; i++) {
                codes.push(currentCode++);
            }
            
            lotteryParticipants.push({
                name: customer.name,
                phoneNumber: '',
                total: customer.total,
                count: customer.count,
                chances: chances,
                codes: codes
            });
        }
    });

    if (lotteryParticipants.length === 0) {
        showMessage('هیچ مشتری واجد شرایط قرعه‌کشی نیست. مشتریان باید حداقل 50,000 فروش داشته باشند.', 'error');
        return;
    }

    const totalCodes = currentCode - 1;
    const winningCode = Math.floor(Math.random() * totalCodes) + 1;
    
    let winner = null;
    for (const participant of lotteryParticipants) {
        if (participant.codes.includes(winningCode)) {
            winner = participant;
            break;
        }
    }

    showLotteryResults(lotteryParticipants, winningCode, winner);
}

// Show lottery results in a dialog
function showLotteryResults(participants, winningCode, winner) {
    const lotteryDialog = document.getElementById('lotteryDialog');
    const lotteryContainer = document.getElementById('lotteryContainer');
    const lotteryBackdrop = document.getElementById('lotteryBackdrop');
    
    if (!lotteryDialog || !lotteryContainer) {
        return;
    }

    // Generate HTML for lottery results
    let resultsHTML = '<div class="lottery-results"><table class="lottery-table"><thead><tr><th>نام مشتری</th><th style="text-align: center;">مجموع فروش</th><th style="text-align: center;">شانس</th><th style="text-align: center;">کدهای شانس</th></tr></thead><tbody>';

    participants.forEach(participant => {
        const isWinner = participant === winner;
        const rowClass = isWinner ? 'lottery-winner' : '';
        const formattedTotal = participant.total.toLocaleString('en-US');
        const codesText = participant.codes.join(', ');
        
        resultsHTML += `<tr class="${rowClass}">`;
        resultsHTML += `<td><strong>${participant.name}</strong>${isWinner ? ' 🎉' : ''}</td>`;
        resultsHTML += `<td style="text-align: right;">$${formattedTotal}</td>`;
        resultsHTML += `<td style="text-align: center;">${participant.chances}</td>`;
        resultsHTML += `<td style="text-align: center;">${codesText}</td>`;
        resultsHTML += '</tr>';
    });

    resultsHTML += '</tbody></table>';
    
            // Add winner announcement
            if (winner) {
                const formattedWinnerTotal = winner.total.toLocaleString('en-US');
                const phoneDisplay = winner.phoneNumber ? `<p>شماره تماس: <strong>${winner.phoneNumber}</strong></p>` : '';
                resultsHTML += `<div class="lottery-winner-announcement"><h3>🎊 برنده: ${winner.name} 🎊</h3><p>کد برنده: <strong>${winningCode}</strong></p><p>مجموع فروش: <strong>$${formattedWinnerTotal}</strong></p>${phoneDisplay}</div>`;
            }
    
    resultsHTML += '</div>';

    lotteryContainer.innerHTML = resultsHTML;
    
    // Show dialog with transition
    if (lotteryBackdrop) {
        lotteryBackdrop.style.display = 'block';
    }
    lotteryDialog.style.display = 'flex';
    setTimeout(() => {
        lotteryDialog.classList.add('show');
    }, 10);
}

// Initialize lottery functionality
function initLottery() {
    const lotteryBtn = document.getElementById('lotteryBtn');
    if (lotteryBtn) {
        lotteryBtn.addEventListener('click', function() {
            // Show dialog first, then run lottery
            const lotteryDialog = document.getElementById('lotteryDialog');
            const lotteryBackdrop = document.getElementById('lotteryBackdrop');
            if (lotteryDialog && lotteryBackdrop) {
                lotteryBackdrop.style.display = 'block';
                lotteryDialog.style.display = 'flex';
                setTimeout(() => {
                    lotteryDialog.classList.add('show');
                    console.log('[Lottery] Dialog shown, initializing date pickers...');
                    // Ensure date pickers are initialized after dialog is visible
                    setTimeout(() => {
                        console.log('[Lottery] Checking initDatePicker function:', typeof initDatePicker);
                        if (typeof initDatePicker === 'function') {
                            console.log('[Lottery] Calling initDatePicker for lottery dates...');
                            initDatePicker('lotteryFromDate');
                            initDatePicker('lotteryToDate');
                        } else {
                            console.error('[Lottery] initDatePicker function not found!');
                        }
                    }, 50);
                }, 10);
            }
            runLottery();
        });
    }

    const closeLotteryBtn = document.getElementById('closeLotteryBtn');
    const lotteryBackdrop = document.getElementById('lotteryBackdrop');
    
    if (closeLotteryBtn) {
        closeLotteryBtn.addEventListener('click', function() {
            const lotteryDialog = document.getElementById('lotteryDialog');
            if (lotteryDialog) {
                lotteryDialog.classList.remove('show');
                setTimeout(() => {
                    lotteryDialog.style.display = 'none';
                    if (lotteryBackdrop) {
                        lotteryBackdrop.style.display = 'none';
                    }
                }, 300);
            }
        });
    }
    
    // Event listener for apply filter button
    const applyFilterBtn = document.getElementById('applyLotteryFilter');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', runLottery);
    }
    
    // Event listener for clear filter button
    const clearFilterBtn = document.getElementById('clearLotteryFilter');
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', function() {
            const lotteryFromDateEl = document.getElementById('lotteryFromDate');
            const lotteryToDateEl = document.getElementById('lotteryToDate');
            if (lotteryFromDateEl && $(lotteryFromDateEl).data('pDatepicker')) {
                $(lotteryFromDateEl).pDatepicker('clear');
            } else {
                lotteryFromDateEl.value = '';
            }
            if (lotteryToDateEl && $(lotteryToDateEl).data('pDatepicker')) {
                $(lotteryToDateEl).pDatepicker('clear');
            } else {
                lotteryToDateEl.value = '';
            }
            document.getElementById('lotteryCategory').value = '';
            runLottery();
        });
    }
    
    // Close on backdrop click
    if (lotteryBackdrop) {
        lotteryBackdrop.addEventListener('click', function(e) {
            if (e.target === lotteryBackdrop) {
                const lotteryDialog = document.getElementById('lotteryDialog');
                if (lotteryDialog) {
                    lotteryDialog.classList.remove('show');
                    setTimeout(() => {
                        lotteryDialog.style.display = 'none';
                        lotteryBackdrop.style.display = 'none';
                    }, 300);
                }
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLottery);
} else {
    initLottery();
}

