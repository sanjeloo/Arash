// Persian Date Picker Initialization
// Using babakhani persian-datepicker library

// Helper function to convert Persian digits to English digits
function persianToEnglishDigits(str) {
    if (!str) return str;
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    let result = str;
    for (let i = 0; i < persianDigits.length; i++) {
        result = result.replace(new RegExp(persianDigits[i], 'g'), englishDigits[i]);
    }
    return result;
}

// Helper function to convert Persian date string to Gregorian date string (YYYY-MM-DD)
function getGregorianDateFromPersian(persianDateString) {
    if (!persianDateString || persianDateString.trim() === '') {
        return '';
    }
    
    try {
        // Convert Persian digits to English digits first
        const englishDateString = persianToEnglishDigits(persianDateString);
        
        // Parse Persian date (format: YYYY/MM/DD)
        const parts = englishDateString.split('/');
        if (parts.length !== 3) {
            return '';
        }
        
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
            return '';
        }
        
        // Use persianDate library to convert
        const pd = new persianDate([year, month, day]);
        const gregorian = pd.toCalendar('gregory');
        
        const gregorianYear = gregorian.year();
        const gregorianMonth = gregorian.month();
        const gregorianDay = gregorian.date();
        
        // Return in YYYY-MM-DD format
        return `${gregorianYear}-${String(gregorianMonth).padStart(2, '0')}-${String(gregorianDay).padStart(2, '0')}`;
    } catch (error) {
        return '';
    }
}

// Initialize a Persian date picker on an element
function initPersianDatePicker(elementId, options) {
    if (typeof $ === 'undefined' || typeof $.fn.pDatepicker === 'undefined') {
        return false;
    }
    
    const element = document.getElementById(elementId);
    if (!element) {
        return false;
    }
    
    // Check if already initialized
    if ($(element).data('pDatepicker')) {
        return true;
    }
    
    // Default options
    const defaultOptions = {
        calendarType: 'persian',
        format: 'YYYY/MM/DD',
        initialValue: false,
        autoClose: true,
        calendar: {
            persian: {
                leapYearMode: 'astronomical'
            }
        }
    };
    
    // Merge with provided options
    const config = Object.assign({}, defaultOptions, options);
    
    try {
        $(element).pDatepicker(config);
        return true;
    } catch (error) {
        console.error(`[DatePicker] Error initializing ${elementId}:`, error);
        return false;
    }
}

// Helper function to convert Gregorian Date object to Persian date string (YYYY/MM/DD)
function gregorianDateToPersian(gregorianDate) {
    if (!gregorianDate || isNaN(gregorianDate.getTime())) {
        return '';
    }
    
    try {
        // Create persianDate from JavaScript Date object (unix timestamp)
        // When created from a timestamp, persianDate interprets it as Gregorian and converts to Persian by default
        const unixTimestamp = gregorianDate.getTime();
        const pd = new persianDate(unixTimestamp);
        
        // The persianDate object is already in Persian calendar, so use it directly
        const jalaliYear = pd.year();
        const jalaliMonth = pd.month();
        const jalaliDay = pd.date();
        
        // Return in YYYY/MM/DD format with English digits
        return `${jalaliYear}/${String(jalaliMonth).padStart(2, '0')}/${String(jalaliDay).padStart(2, '0')}`;
    } catch (error) {
        return '';
    }
}

// Initialize multiple date pickers
function initPersianDatePickers(elementIds, options) {
    if (!Array.isArray(elementIds)) {
        return false;
    }
    
    let successCount = 0;
    elementIds.forEach(elementId => {
        if (initPersianDatePicker(elementId, options)) {
            successCount++;
        }
    });
    
    return successCount === elementIds.length;
}

