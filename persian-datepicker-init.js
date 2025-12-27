// Initialize Persian Date Pickers using behzadi/persianDatepicker
// This is a simpler, more reliable library

// Helper function to convert Persian digits to English digits
function persianToEnglishDigits(str) {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    
    let result = str;
    for (let i = 0; i < persianDigits.length; i++) {
        result = result.replace(new RegExp(persianDigits[i], 'g'), englishDigits[i]);
    }
    return result;
}

// Helper function to convert Persian date string (YYYY/MM/DD) to Gregorian Date object
function persianDateToGregorian(persianDateString) {
    if (!persianDateString || persianDateString.trim() === '') {
        return null;
    }
    
    // Convert Persian digits to English digits first
    const englishDateString = persianToEnglishDigits(persianDateString);
    console.warn('[DateConverter] Converted Persian digits to English:', {
        persian: persianDateString,
        english: englishDateString
    });
    
    // Parse Persian date string (format: YYYY/MM/DD)
    const parts = englishDateString.split('/');
    if (parts.length !== 3) {
        console.warn('[DateConverter] Invalid date format, parts:', parts);
        return null;
    }
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    console.warn('[DateConverter] Parsed date parts:', { year, month, day });
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
        console.warn('[DateConverter] Invalid date values (NaN)');
        return null;
    }
    
    // Convert Persian date to Gregorian using persian-date library
    // Based on official documentation: https://github.com/babakhani/PersianDate
    try {
        // Create Persian date instance with array [year, month, day]
        const pd = new persianDate([year, month, day]);
        
        console.warn('[DateConverter] Persian date created:', {
            year: pd.year(),
            month: pd.month(),
            day: pd.date(),
            calendar: pd.calendar()
        });
        
        // Convert to Gregorian calendar using toCalendar method
        // This returns a new persianDate object with Gregorian calendar
        const gregorian = pd.toCalendar('gregory');
        
        // Get Gregorian values
        const gregorianYear = gregorian.year();
        const gregorianMonth = gregorian.month();
        const gregorianDay = gregorian.date();
        
        console.warn('[DateConverter] After toCalendar conversion:', {
            gregorianYear,
            gregorianMonth,
            gregorianDay,
            calendar: gregorian.calendar()
        });
        
        // Create JavaScript Date object
        const result = new Date(gregorianYear, gregorianMonth - 1, gregorianDay);
        
        // Validate the date
        if (isNaN(result.getTime())) {
            console.warn('[DateConverter] Invalid date created:', {
                persian: { year, month, day },
                gregorian: { year: gregorianYear, month: gregorianMonth, day: gregorianDay }
            });
            return null;
        }
        
        console.warn('[DateConverter] Conversion successful:', {
            persian: { year, month, day },
            gregorian: { year: gregorianYear, month: gregorianMonth, day: gregorianDay },
            dateObject: result.toISOString(),
            formatted: result.toLocaleDateString()
        });
        
        return result;
    } catch (error) {
        console.warn('[DateConverter] Error converting Persian date:', error);
        console.warn('[DateConverter] Error details:', {
            year, month, day,
            errorMessage: error.message,
            errorStack: error.stack
        });
        return null;
    }
}

// Helper function to get Gregorian date string from Persian date picker value
function getGregorianDateFromPersian(persianDateString) {
    console.warn('[DateConverter] Converting Persian date to Gregorian:', persianDateString);
    
    const gregorianDate = persianDateToGregorian(persianDateString);
    if (!gregorianDate) {
        console.warn('[DateConverter] Conversion failed, returning empty string');
        return '';
    }
    
    // Return in YYYY-MM-DD format for comparison
    const year = gregorianDate.getFullYear();
    const month = String(gregorianDate.getMonth() + 1).padStart(2, '0');
    const day = String(gregorianDate.getDate()).padStart(2, '0');
    const result = `${year}-${month}-${day}`;
    
    console.warn('[DateConverter] Conversion result:', {
        persian: persianDateString,
        gregorian: result,
        dateObject: gregorianDate.toISOString()
    });
    
    return result;
}

// Initialize a single date picker
function initDatePicker(elementId) {
    console.log(`[DatePicker] Initializing date picker for: ${elementId}`);
    
    if (typeof $ === 'undefined') {
        console.error(`[DatePicker] jQuery ($) is not defined`);
        return false;
    }
    
    // Check if persianDatepicker is available as jQuery plugin
    if (typeof $.fn.pDatepicker === 'undefined' && 
        typeof $.fn.persianDatepicker === 'undefined') {
        console.error(`[DatePicker] persianDatepicker is not defined`);
        console.error(`[DatePicker] Available jQuery plugins:`, Object.keys($.fn).filter(k => k.toLowerCase().includes('date')));
        return false;
    }
    
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`[DatePicker] Element not found: ${elementId}`);
        return false;
    }
    
    // Check if already initialized - check multiple possible data attribute names
    if ($(element).data('persianDatepicker') || 
        $(element).data('pDatepicker') || 
        $(element).data('datepicker') ||
        $(element).hasClass('hasDatepicker')) {
        console.log(`[DatePicker] Already initialized: ${elementId}`);
        return true;
    }
    
    try {
        console.log(`[DatePicker] Attaching persianDatepicker to ${elementId}`);
        
        // Try pDatepicker first (persian-datepicker library)
        if (typeof $.fn.pDatepicker !== 'undefined') {
            console.log(`[DatePicker] Using pDatepicker method`);
            try {
                $(element).pDatepicker({
                    format: 'YYYY/MM/DD',
                    autoClose: true,
                    calendarType: 'persian'
                });
                console.log(`[DatePicker] pDatepicker called successfully`);
            } catch (e) {
                console.error(`[DatePicker] Error calling pDatepicker:`, e);
                throw e;
            }
        } else if (typeof $.fn.persianDatepicker !== 'undefined') {
            console.log(`[DatePicker] Using persianDatepicker method`);
            try {
                $(element).persianDatepicker({
                    format: 'YYYY/MM/DD',
                    autoClose: true,
                    calendarType: 'persian',
                    observer: true
                });
                console.log(`[DatePicker] persianDatepicker called successfully`);
            } catch (e) {
                console.error(`[DatePicker] Error calling persianDatepicker:`, e);
                throw e;
            }
        } else {
            console.error(`[DatePicker] No datepicker method available`);
            console.error(`[DatePicker] Available jQuery methods:`, Object.keys($.fn).filter(k => k.toLowerCase().includes('date')));
            return false;
        }
        
        // Verify it was attached - check multiple possible data attribute names
        const data1 = $(element).data('persianDatepicker');
        const data2 = $(element).data('pDatepicker');
        const data3 = $(element).data('datepicker');
        
        console.log(`[DatePicker] Data attributes after init:`, {
            persianDatepicker: data1,
            pDatepicker: data2,
            datepicker: data3,
            allData: $(element).data()
        });
        
        if (data1 || data2 || data3) {
            console.log(`[DatePicker] Successfully initialized: ${elementId}`);
            return true;
        } else {
            console.error(`[DatePicker] Initialization failed - datepicker not attached`);
            console.error(`[DatePicker] Element:`, element);
            console.error(`[DatePicker] jQuery element:`, $(element));
            console.error(`[DatePicker] Element classes:`, element.className);
            console.error(`[DatePicker] Element style:`, element.style.cssText);
            
            // Try to manually check if picker exists
            const hasPicker = $(element).hasClass('hasDatepicker') || 
                             element.getAttribute('data-picker-initialized') ||
                             $(element).next('.pdp-calendar').length > 0;
            console.log(`[DatePicker] Has picker indicators:`, hasPicker);
            
            return false;
        }
    } catch (error) {
        console.error(`[DatePicker] Error initializing ${elementId}:`, error);
        return false;
    }
}

// Initialize all date pickers
function initPersianDatePickers() {
    console.log('[DatePicker] initPersianDatePickers called');
    console.log('[DatePicker] typeof $:', typeof $);
    console.log('[DatePicker] typeof $.fn.pDatepicker:', typeof $.fn.pDatepicker);
    console.log('[DatePicker] typeof $.fn.persianDatepicker:', typeof $.fn.persianDatepicker);
    
    // Check if it's available as jQuery plugin
    const isAvailable = typeof $ !== 'undefined' && 
                        (typeof $.fn.pDatepicker !== 'undefined' || 
                         typeof $.fn.persianDatepicker !== 'undefined');
    
    if (!isAvailable) {
        console.log('[DatePicker] Dependencies not ready, retrying...');
        // Stop retrying after 5 seconds
        if (typeof initPersianDatePickers.retryCount === 'undefined') {
            initPersianDatePickers.retryCount = 0;
        }
        initPersianDatePickers.retryCount++;
        if (initPersianDatePickers.retryCount < 50) {
            setTimeout(initPersianDatePickers, 100);
        } else {
            console.error('[DatePicker] Failed to load persianDatepicker after multiple retries');
        }
        return;
    }
    
    console.log('[DatePicker] All dependencies ready');
    
    // Initialize summary date pickers
    const summaryFromDate = document.getElementById('summaryFromDate');
    const summaryToDate = document.getElementById('summaryToDate');
    if (summaryFromDate && summaryToDate) {
        initDatePicker('summaryFromDate');
        initDatePicker('summaryToDate');
    }
    
    // Initialize lottery date pickers
    const lotteryFromDate = document.getElementById('lotteryFromDate');
    const lotteryToDate = document.getElementById('lotteryToDate');
    if (lotteryFromDate && lotteryToDate) {
        initDatePicker('lotteryFromDate');
        initDatePicker('lotteryToDate');
    }
    
    console.log('[DatePicker] Initialization complete');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initPersianDatePickers, 300);
    });
} else {
    setTimeout(initPersianDatePickers, 300);
}
