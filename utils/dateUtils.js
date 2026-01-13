class DateUtils {
  /**
   * Safely parse any date format into Date object
   */
  static parseDate(dateInput) {
    if (!dateInput) return new Date();
    
    if (dateInput instanceof Date) {
      return isNaN(dateInput.getTime()) ? new Date() : dateInput;
    }
    
    if (typeof dateInput === 'string') {
      // Try ISO format
      let date = new Date(dateInput);
      if (!isNaN(date.getTime())) return date;
      
      // Try YYYY-MM-DD format
      if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
        date = new Date(dateInput + 'T00:00:00');
        if (!isNaN(date.getTime())) return date;
      }
      
      // Try combined formats
      if (dateInput.includes('T')) {
        date = new Date(dateInput);
        if (!isNaN(date.getTime())) return date;
      }
    }
    
    return new Date();
  }
  
  /**
   * Extract date parts from any date input
   */
  static extractDateParts(dateInput) {
    const date = this.parseDate(dateInput);
    
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().slice(0, 5);
    const timestamp = date;
    
    return { date: dateStr, time: timeStr, timestamp };
  }
  
  /**
   * Calculate date ranges for periods
   */
  static getDateRange(period) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let startDate, endDate;
    
    switch (period) {
      case 'today':
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 1);
        break;
        
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(today);
        break;
        
      case 'thisWeek': {
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(today);
        startDate.setDate(today.getDate() - diffToMonday);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        break;
      }
        
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
        
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
        break;
        
      case 'last7':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 1);
        break;
        
      case 'last30':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 1);
        break;
        
      default:
        return { startDate: null, endDate: null };
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }
  
  /**
   * Check if a date is within a period
   */
  static isDateInPeriod(dateInput, period) {
    if (period === 'all') return true;
    
    const date = this.parseDate(dateInput);
    const dateRange = this.getDateRange(period);
    
    if (!dateRange.startDate || !dateRange.endDate) return true;
    
    const dateStr = date.toISOString().split('T')[0];
    return dateStr >= dateRange.startDate && dateStr < dateRange.endDate;
  }
}

module.exports = DateUtils;