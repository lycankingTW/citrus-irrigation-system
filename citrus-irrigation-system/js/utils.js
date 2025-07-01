/**
 * 柑橘園智能灌溉計算系統 - 工具函數模組
 * 開發者: 林鈺荏
 * 機構: 苗栗區農業改良場
 */

/**
 * 數學工具函數
 */
const MathUtils = {
    degToRad(degrees) {
        return degrees * (Math.PI / 180);
    },
    radToDeg(radians) {
        return radians * (180 / Math.PI);
    },
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    roundTo(value, decimals) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    },
    average(numbers) {
        return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    }
};

/**
 * 日期時間工具函數
 */
const DateUtils = {
    getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    },
    daysDifference(date1, date2) {
        const diffTime = Math.abs(date2 - date1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },
    getSeason(date) {
        const month = date.getMonth() + 1;
        if (month >= 3 && month <= 5) return 'spring';
        if (month >= 6 && month <= 8) return 'summer';
        if (month >= 9 && month <= 11) return 'autumn';
        return 'winter';
    },
    formatDate(date, format = 'YYYY-MM-DD') {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return format.replace('YYYY', year).replace('MM', month).replace('DD', day);
    }
};

/**
 * 單位轉換工具函數
 */
const UnitUtils = {
    celsiusToFahrenheit(celsius) {
        return (celsius * 9/5) + 32;
    },
    msToKmh(ms) {
        return ms * 3.6;
    },
    mmToLitersPerM2(mm) {
        return mm;
    },
    hectareToM2(hectare) {
        return hectare * 10000;
    }
};

/**
 * 氣象計算工具函數
 */
const WeatherUtils = {
    saturationVaporPressure(temperature) {
        return 0.6108 * Math.exp((17.27 * temperature) / (temperature + 237.3));
    },
    actualVaporPressure(temperature, humidity) {
        const es = this.saturationVaporPressure(temperature);
        return es * (humidity / 100);
    },
    slopeVaporPressureCurve(temperature) {
        const es = this.saturationVaporPressure(temperature);
        return (4098 * es) / Math.pow(temperature + 237.3, 2);
    },
    dewPoint(temperature, humidity) {
        const a = 17.27;
        const b = 237.7;
        const alpha = ((a * temperature) / (b + temperature)) + Math.log(humidity / 100);
        return (b * alpha) / (a - alpha);
    }
};

/**
 * 土壤計算工具函數
 */
const SoilUtils = {
    bulkDensity(dryWeight, totalVolume) {
        return dryWeight / totalVolume;
    },
    porosity(bulkDensity, particleDensity = 2.65) {
        return 1 - (bulkDensity / particleDensity);
    },
    availableWater(fieldCapacity, wiltingPoint) {
        return fieldCapacity - wiltingPoint;
    }
};

/**
 * 驗證工具函數
 */
const ValidationUtils = {
    isInRange(value, min, max) {
        return value >= min && value <= max;
    },
    isValidNumber(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    },
    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }
};

/**
 * 格式化工具函數
 */
const FormatUtils = {
    formatNumber(number, decimals = 2) {
        return parseFloat(number).toFixed(decimals);
    },
    formatPercentage(value, decimals = 1) {
        return `${(value * 100).toFixed(decimals)}%`;
    },
    formatDuration(minutes) {
        if (minutes < 60) {
            return `${Math.round(minutes)} 分鐘`;
        } else {
            const hours = Math.floor(minutes / 60);
            const mins = Math.round(minutes % 60);
            return `${hours} 小時 ${mins} 分鐘`;
        }
    }
};

/**
 * 儲存工具函數
 */
const StorageUtils = {
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('儲存失敗:', error);
            return false;
        }
    },
    load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('載入失敗:', error);
            return null;
        }
    },
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('刪除失敗:', error);
            return false;
        }
    }
};

/**
 * 匯出工具函數
 */
const ExportUtils = {
    downloadJSON(data, filename) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        this.downloadBlob(blob, filename);
    },
    downloadCSV(data, filename) {
        const csvContent = this.arrayToCSV(data);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        this.downloadBlob(blob, filename);
    },
    downloadBlob(blob, filename) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
    arrayToCSV(array) {
        if (!array.length) return '';
        const headers = Object.keys(array[0]);
        const csvRows = [headers.join(',')];
        
        for (const row of array) {
            const values = headers.map(header => {
                const val = row[header];
                return typeof val === 'string' ? `"${val}"` : val;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }
};

/**
 * 通用工具函數
 */
const CommonUtils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
};