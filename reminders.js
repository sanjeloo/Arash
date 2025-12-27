// Expense Reminders functionality

// Add new reminder
function addReminder() {
    if (!reminderDb) {
        showMessage('پایگاه داده آماده نیست. لطفاً صفحه را رفرش کنید.', 'error');
        return;
    }
    
    const title = document.getElementById('reminderTitle').value.trim();
    const amountValue = document.getElementById('reminderAmount').value.replace(/,/g, '');
    const amount = parseInt(amountValue, 10);
    const persianDueDate = document.getElementById('reminderDueDate').value.trim();
    const description = document.getElementById('reminderDescription').value.trim();
    
    // Validation
    if (!title) {
        showMessage('لطفاً عنوان را وارد کنید', 'error');
        return;
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
        showMessage('لطفاً مبلغ معتبری وارد کنید', 'error');
        return;
    }
    
    if (!persianDueDate) {
        showMessage('لطفاً تاریخ سررسید را انتخاب کنید', 'error');
        return;
    }
    
    // Convert Persian date to Gregorian
    const dueDate = persianDueDate && typeof getGregorianDateFromPersian === 'function' 
        ? getGregorianDateFromPersian(persianDueDate) 
        : '';
    
    if (!dueDate) {
        showMessage('لطفاً تاریخ معتبری انتخاب کنید', 'error');
        return;
    }
    
    // Convert to Date object for storage
    const dueDateObj = new Date(dueDate);
    dueDateObj.setHours(23, 59, 59, 999); // End of day
    
    const transaction = reminderDb.transaction([REMINDER_STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(REMINDER_STORE_NAME);
    
    const reminder = {
        title: title,
        amount: amount,
        dueDate: dueDateObj.toISOString(),
        description: description || '',
        createdAt: new Date().toISOString()
    };
    
    const request = objectStore.add(reminder);
    
    request.onsuccess = () => {
        showMessage('یادآوری با موفقیت افزوده شد!', 'success');
        document.getElementById('reminderForm').reset();
        loadReminders();
    };
    
    request.onerror = () => {
        showMessage('خطا در افزودن یادآوری', 'error');
    };
}

// Load and display reminders
function loadReminders() {
    if (!reminderDb) {
        const container = document.getElementById('remindersList');
        if (container) {
            container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">پایگاه داده آماده نیست</p>';
        }
        return;
    }
    
    const transaction = reminderDb.transaction([REMINDER_STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(REMINDER_STORE_NAME);
    const request = objectStore.getAll();
    
    request.onsuccess = () => {
        const reminders = request.result;
        const container = document.getElementById('remindersList');
        
        if (!container) {
            return;
        }
        
        if (reminders.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">یادآوری ثبت نشده است</p>';
            return;
        }
        
        // Sort by due date (soonest first)
        reminders.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        
        container.innerHTML = reminders.map(reminder => {
            const dueDate = new Date(reminder.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDateOnly = new Date(dueDate);
            dueDateOnly.setHours(0, 0, 0, 0);
            
            const daysUntilDue = Math.ceil((dueDateOnly - today) / (1000 * 60 * 60 * 24));
            const isOverdue = daysUntilDue < 0;
            const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 5;
            
            const formattedDate = typeof gregorianDateToPersian === 'function' 
                ? gregorianDateToPersian(dueDate) 
                : dueDate.toLocaleDateString();
            
            const formattedAmount = Math.round(reminder.amount).toLocaleString('en-US');
            
            let statusClass = '';
            let statusText = '';
            if (isOverdue) {
                statusClass = 'reminder-overdue';
                statusText = `⚠️ ${Math.abs(daysUntilDue)} روز گذشته`;
            } else if (isDueSoon) {
                statusClass = 'reminder-due-soon';
                statusText = `⏰ ${daysUntilDue} روز باقی مانده`;
            } else {
                statusClass = 'reminder-upcoming';
                statusText = `📅 ${daysUntilDue} روز باقی مانده`;
            }
            
            const descriptionDisplay = reminder.description ? `<div class="reminder-description">${reminder.description}</div>` : '';
            
            return `
                <div class="reminder-item ${statusClass}" data-reminder-id="${reminder.id}">
                    <div class="reminder-info">
                        <div class="reminder-header">
                            <strong>${reminder.title}</strong>
                            <span class="reminder-status">${statusText}</span>
                        </div>
                        <div class="reminder-details">
                            <span class="reminder-amount">$${formattedAmount}</span>
                            <span class="reminder-date">📅 ${formattedDate}</span>
                        </div>
                        ${descriptionDisplay}
                    </div>
                    <button class="delete-reminder-btn" data-reminder-id="${reminder.id}" title="حذف یادآوری" aria-label="حذف یادآوری">
                        🗑️
                    </button>
                </div>
            `;
        }).join('');
        
        // Attach delete listeners
        attachDeleteReminderListeners();
    };
}

// Delete reminder
function deleteReminder(reminderId) {
    if (!reminderDb) return;
    
    if (!confirm('آیا از حذف این یادآوری اطمینان دارید؟')) {
        return;
    }
    
    const transaction = reminderDb.transaction([REMINDER_STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(REMINDER_STORE_NAME);
    const request = objectStore.delete(reminderId);
    
    request.onsuccess = () => {
        showMessage('یادآوری با موفقیت حذف شد!', 'success');
        loadReminders();
    };
    
    request.onerror = () => {
        showMessage('خطا در حذف یادآوری', 'error');
    };
}

// Attach delete button listeners
function attachDeleteReminderListeners() {
    const deleteButtons = document.querySelectorAll('.delete-reminder-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const reminderId = parseInt(this.getAttribute('data-reminder-id'), 10);
            deleteReminder(reminderId);
        });
    });
}

// Check expense reminders on page load (show every time)
function checkExpenseReminders() {
    if (!reminderDb) return;
    
    const transaction = reminderDb.transaction([REMINDER_STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(REMINDER_STORE_NAME);
    const request = objectStore.getAll();
    
    request.onsuccess = () => {
        const reminders = request.result;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Filter reminders that are due within 5 days or overdue
        const activeReminders = reminders.filter(reminder => {
            const dueDate = new Date(reminder.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            return daysUntilDue <= 5; // Show if 5 days or less remaining
        });
        
        if (activeReminders.length > 0) {
            showExpenseRemindersNotification(activeReminders);
        }
    };
}

// Show expense reminders notification
function showExpenseRemindersNotification(reminders) {
    // Remove any existing reminder notification
    const existing = document.getElementById('expenseRemindersNotification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.id = 'expenseRemindersNotification';
    notification.className = 'expense-reminders-notification';
    
    let remindersHTML = reminders.map(reminder => {
        const dueDate = new Date(reminder.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDateOnly = new Date(dueDate);
        dueDateOnly.setHours(0, 0, 0, 0);
        
        const daysUntilDue = Math.ceil((dueDateOnly - today) / (1000 * 60 * 60 * 24));
        const isOverdue = daysUntilDue < 0;
        
        const formattedDate = typeof gregorianDateToPersian === 'function' 
            ? gregorianDateToPersian(dueDate) 
            : dueDate.toLocaleDateString();
        
        const formattedAmount = Math.round(reminder.amount).toLocaleString('en-US');
        
        if (isOverdue) {
            return `<div class="reminder-notification-item overdue">⚠️ ${reminder.title} - $${formattedAmount} (${Math.abs(daysUntilDue)} روز گذشته - ${formattedDate})</div>`;
        } else {
            return `<div class="reminder-notification-item">⏰ ${reminder.title} - $${formattedAmount} (${daysUntilDue} روز باقی مانده - ${formattedDate})</div>`;
        }
    }).join('');
    
    notification.innerHTML = `
        <div class="reminder-notification-content">
            <div class="reminder-notification-header">
                <span class="reminder-notification-icon">⏰</span>
                <strong>یادآوری هزینه‌ها</strong>
                <button class="reminder-notification-close" onclick="dismissExpenseReminders()">×</button>
            </div>
            <div class="reminder-notification-body">
                ${remindersHTML}
            </div>
        </div>
    `;
    
    // Insert at the top of container
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(notification, container.firstChild);
    }
}

// Dismiss expense reminders notification
window.dismissExpenseReminders = function() {
    const notification = document.getElementById('expenseRemindersNotification');
    if (notification) {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
};

// Initialize reminders functionality
function initReminders() {
    // Event listener for reminders button
    const remindersBtn = document.getElementById('remindersBtn');
    if (remindersBtn) {
        remindersBtn.addEventListener('click', function() {
            const remindersDialog = document.getElementById('remindersDialog');
            const remindersBackdrop = document.getElementById('remindersBackdrop');
            if (remindersDialog && remindersBackdrop) {
                remindersBackdrop.style.display = 'block';
                remindersDialog.style.display = 'flex';
                setTimeout(() => {
                    remindersDialog.classList.add('show');
                    // Initialize date picker
                    setTimeout(() => {
                        if (typeof initPersianDatePicker === 'function') {
                            initPersianDatePicker('reminderDueDate', {
                                calendar: {
                                    persian: {
                                        leapYearMode: 'astronomical'
                                    }
                                }
                            });
                        }
                    }, 100);
                }, 10);
            }
            loadReminders();
        });
    }
    
    // Event listener for close button
    const closeRemindersBtn = document.getElementById('closeRemindersBtn');
    const remindersBackdrop = document.getElementById('remindersBackdrop');
    if (closeRemindersBtn) {
        closeRemindersBtn.addEventListener('click', function() {
            const remindersDialog = document.getElementById('remindersDialog');
            if (remindersDialog) {
                remindersDialog.classList.remove('show');
                setTimeout(() => {
                    remindersDialog.style.display = 'none';
                    if (remindersBackdrop) {
                        remindersBackdrop.style.display = 'none';
                    }
                }, 300);
            }
        });
    }
    
    // Close on backdrop click
    if (remindersBackdrop) {
        remindersBackdrop.addEventListener('click', function(e) {
            if (e.target === remindersBackdrop) {
                const remindersDialog = document.getElementById('remindersDialog');
                if (remindersDialog) {
                    remindersDialog.classList.remove('show');
                    setTimeout(() => {
                        remindersDialog.style.display = 'none';
                        remindersBackdrop.style.display = 'none';
                    }, 300);
                }
            }
        });
    }
    
    // Event listener for reminder form
    const reminderForm = document.getElementById('reminderForm');
    if (reminderForm) {
        reminderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addReminder();
        });
    }
    
    // Format reminder amount with thousand separators (integers only)
    const reminderAmountInput = document.getElementById('reminderAmount');
    if (reminderAmountInput) {
        reminderAmountInput.addEventListener('input', function(e) {
            // Remove all non-digit characters
            let value = e.target.value.replace(/[^\d]/g, '');
            
            // Add thousand separators
            value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            
            e.target.value = value;
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReminders);
} else {
    initReminders();
}

