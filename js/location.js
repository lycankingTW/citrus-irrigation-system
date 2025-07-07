// location.js - 增加 API 調試功能

// 調試日誌函數
function debugLog(message, data = null) {
    console.log(`[位置系統] ${message}`, data || '');
}

// 重置按鈕狀態
function resetButton() {
    const autoLocateBtn = document.getElementById('autoLocateBtn');
    if (autoLocateBtn) {
        autoLocateBtn.disabled = false;
        autoLocateBtn.innerHTML = '<i class="fas fa-location-arrow"></i> 自動定位';
    }
}

// 更新位置資訊顯示
function updateLocationDisplay(position) {
    const locationData = document.getElementById('location-data');
    if (locationData) {
        locationData.innerHTML = `
            <div class="alert alert-success">
                <h6><i class="fas fa-map-marker-alt"></i> 位置獲取成功！</h6>
                <p><strong>緯度：</strong> ${position.coords.latitude.toFixed(6)}</p>
                <p><strong>經度：</strong> ${position.coords.longitude.toFixed(6)}</p>
                <p><strong>精確度：</strong> ${position.coords.accuracy} 公尺</p>
                <p><strong>時間：</strong> ${new Date(position.timestamp).toLocaleString('zh-TW')}</p>
            </div>
        `;
    } else {
        debugLog('警告：找不到 location-data 元素');
        // 創建顯示區域
        const newDisplay = document.createElement('div');
        newDisplay.id = 'location-data';
        newDisplay.className = 'mt-3';
        newDisplay.innerHTML = `
            <div class="alert alert-success">
                <h6><i class="fas fa-map-marker-alt"></i> 位置獲取成功！</h6>
                <p>緯度: ${position.coords.latitude.toFixed(6)}, 經度: ${position.coords.longitude.toFixed(6)}</p>
            </div>
        `;
        
        const container = document.querySelector('.container') || document.querySelector('main') || document.body;
        container.appendChild(newDisplay);
    }
}

// 當文件載入完成後執行
document.addEventListener('DOMContentLoaded', function() {
    debugLog('DOM 載入完成，初始化位置服務');
    
    const autoLocateBtn = document.getElementById('autoLocateBtn');
    
    if (autoLocateBtn) {
        debugLog('找到定位按鈕，綁定事件');
        
        autoLocateBtn.addEventListener('click', function(event) {
            event.preventDefault();
            debugLog('定位按鈕被點擊');
            
            if ("geolocation" in navigator) {
                autoLocateBtn.disabled = true;
                autoLocateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在獲取位置...';
                
                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        debugLog('位置獲取成功', {
                            lat: position.coords.latitude,
                            lon: position.coords.longitude
                        });
                        
                        const latitude = position.coords.latitude;
                        const longitude = position.coords.longitude;
                        
                        updateLocationDisplay(position);
                        getLocationAndWeather(longitude, latitude);
                        resetButton();
                    }, 
                    function(error) {
                        debugLog('定位錯誤', error);
                        
                        let errorMessage = "無法取得您的位置";
                        switch(error.code) {
                            case error.PERMISSION_DENIED:
                                errorMessage = "用戶拒絕了定位請求。請在瀏覽器設定中允許位置存取。";
                                break;
                            case error.POSITION_UNAVAILABLE:
                                errorMessage = "位置信息不可用。請檢查您的網路連線。";
                                break;
                            case error.TIMEOUT:
                                errorMessage = "定位請求超時。請重試。";
                                break;
                            default:
                                errorMessage = `定位錯誤: ${error.message}`;
                                break;
                        }
                        
                        showLocationError(errorMessage);
                        resetButton();
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 60000
                    }
                );
            } else {
                alert("您的瀏覽器不支援地理位置功能");
            }
        });
    } else {
        debugLog('警告：找不到 autoLocateBtn 按鈕');
    }
});

// 顯示位置錯誤訊息
function showLocationError(message) {
    let errorDisplay = document.getElementById('location-data');
    if (!errorDisplay) {
        errorDisplay = document.createElement('div');
        errorDisplay.id = 'location-data';
        errorDisplay.className = 'mt-3';
        const container = document.querySelector('.container') || document.querySelector('main') || document.body;
        container.appendChild(errorDisplay);
    }
    
    errorDisplay.innerHTML = `
        <div class="alert alert-danger">
            <h6><i class="fas fa-exclamation-triangle"></i> 定位失敗</h6>
            <p>${message}</p>
            <button class="btn btn-sm btn-outline-danger" onclick="document.getElementById('autoLocateBtn').click()">
                <i class="fas fa-redo"></i> 重試
            </button>
        </div>
    `;
}

// API 調試函數 - 專門用來檢查 API 回應格式
async function debugWeatherAPI(longitude, latitude) {
    const cityList = {
        臺中市: 'F-D0047-075'
    };
    
    const apikey = 'CWA-D32F5AAF-8CB1-49C5-A651-8AD504393777';
    const dataid = cityList['臺中市'];
    
    console.log('\n=== 氣象 API 調試開始 ===');
    console.log('座標:', { latitude, longitude });
    console.log('API URL:', `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${dataid}?Authorization=${apikey}&format=JSON`);
    
    try {
        const response = await fetch(`https://opendata.cwa.gov.tw/api/v1/rest/datastore/${dataid}?Authorization=${apikey}&format=JSON`);
        const data = await response.json();
        
        console.log('HTTP 狀態:', response.status);
        console.log('API 回應成功:', data.success);
        
        // 第一層結構
        console.log('\n=== 第一層資料結構 ===');
        console.log('頂層 keys:', Object.keys(data));
        
        if (data.records) {
            console.log('\n=== Records 結構分析 ===');
            console.log('records keys:', Object.keys(data.records));
            
            // 檢查 records.location
            if (data.records.location) {
                console.log('\n--- records.location 格式 ---');
                console.log('是否為陣列:', Array.isArray(data.records.location));
                console.log('陣列長度:', data.records.location.length);
                
                if (data.records.location.length > 0) {
                    console.log('第一個 location:', data.records.location[0]);
                    console.log('第一個 location keys:', Object.keys(data.records.location[0]));
                    
                    if (data.records.location[0].weatherElement) {
                        console.log('weatherElement 數量:', data.records.location[0].weatherElement.length);
                        console.log('weatherElement 名稱:', data.records.location[0].weatherElement.map(e => e.elementName));
                    }
                }
            }
            
            // 檢查 records.locations
            if (data.records.locations) {
                console.log('\n--- records.locations 格式 ---');
                console.log('是否為陣列:', Array.isArray(data.records.locations));
                console.log('陣列長度:', data.records.locations.length);
                
                if (data.records.locations.length > 0 && data.records.locations[0].location) {
                    console.log('第一個 locations[0].location 長度:', data.records.locations[0].location.length);
                    
                    if (data.records.locations[0].location.length > 0) {
                        console.log('第一個地區:', data.records.locations[0].location[0]);
                        console.log('第一個地區 keys:', Object.keys(data.records.locations[0].location[0]));
                    }
                }
            }
            
            // 檢查其他可能的結構
            console.log('\n=== 其他可能的結構 ===');
            for (const key of Object.keys(data.records)) {
                if (key !== 'location' && key !== 'locations') {
                    console.log(`records.${key}:`, typeof data.records[key], data.records[key]);
                }
            }
        }
        
        // 完整資料輸出（僅在需要時）
        console.log('\n=== 完整 API 回應 ===');
        console.log(JSON.stringify(data, null, 2));
        
        return data;
        
    } catch (error) {
        console.error('API 調試失敗:', error);
        return null;
    }
}

// 獲取行政區域和氣象資料（增加詳細調試）
async function getLocationAndWeather(longitude, latitude) {
    const cityList = {
        宜蘭縣: 'F-D0047-003', 桃園市: 'F-D0047-007', 新竹縣: 'F-D0047-011', 苗栗縣: 'F-D0047-015',
        彰化縣: 'F-D0047-019', 南投縣: 'F-D0047-023', 雲林縣: 'F-D0047-027', 嘉義縣: 'F-D0047-031',
        屏東縣: 'F-D0047-035', 臺東縣: 'F-D0047-039', 花蓮縣: 'F-D0047-043', 澎湖縣: 'F-D0047-047',
        基隆市: 'F-D0047-051', 新竹市: 'F-D0047-055', 嘉義市: 'F-D0047-059', 臺北市: 'F-D0047-063',
        高雄市: 'F-D0047-067', 新北市: 'F-D0047-071', 臺中市: 'F-D0047-075', 臺南市: 'F-D0047-079',
        連江縣: 'F-D0047-083', 金門縣: 'F-D0047-087'
    };
    
    const apikey = 'CWA-D32F5AAF-8CB1-49C5-A651-8AD504393777';

    try {
        debugLog('開始獲取氣象資料', { longitude, latitude });
        
        // 檢查或創建天氣參數顯示區域
        let weatherInfoElement = document.getElementById('weather-parameters') || 
                                document.getElementById('weatherDisplay') ||
                                document.getElementById('weatherInfo');
        
        if (!weatherInfoElement) {
            debugLog('創建新的天氣顯示區域');
            weatherInfoElement = document.createElement('div');
            weatherInfoElement.id = 'weather-parameters';
            weatherInfoElement.className = 'weather-info mt-3';
            
            const container = document.querySelector('.weather-section') ||
                             document.querySelector('.container') ||
                             document.querySelector('main') ||
                             document.body;
            container.appendChild(weatherInfoElement);
        }

        // 顯示載入中狀態
        weatherInfoElement.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">載入中...</span>
                </div>
                <p class="mt-2">正在獲取氣象資料...</p>
            </div>
        `;

        // 根據座標判斷位置
        const locationInfo = getLocationByCoordinates(latitude, longitude);
        
        if (!locationInfo) {
            throw new Error('無法判斷所在縣市，建議手動選擇地區');
        }

        const { cityName, townName } = locationInfo;
        const dataid = cityList[cityName];
        
        if (!dataid) {
            throw new Error(`找不到 ${cityName} 的氣象站編號`);
        }

        debugLog(`正在獲取 ${cityName} ${townName} 的氣象資料...`);

        const weatherApiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${dataid}?Authorization=${apikey}&format=JSON`;
        debugLog('API URL:', weatherApiUrl);
        
        const weatherResponse = await fetch(weatherApiUrl);
        if (!weatherResponse.ok) {
            throw new Error(`氣象資料獲取失敗: ${weatherResponse.status} ${weatherResponse.statusText}`);
        }

        const weatherData = await weatherResponse.json();
        
        // 詳細的資料結構分析
        debugLog('=== API 回應分析 ===');
        debugLog('HTTP 狀態:', weatherResponse.status);
        debugLog('API 成功狀態:', weatherData.success);
        debugLog('頂層 keys:', Object.keys(weatherData));
        
        if (weatherData.records) {
            debugLog('Records keys:', Object.keys(weatherData.records));
            
            // 檢查所有可能的資料結構
            let locationData = null;
            let actualLocationName = townName;
            let foundStructure = null;
            
            // 格式 1: records.location
            if (weatherData.records.location && Array.isArray(weatherData.records.location)) {
                debugLog('找到 records.location 格式');
                debugLog('地區數量:', weatherData.records.location.length);
                debugLog('所有地區名稱:', weatherData.records.location.map(loc => loc.locationName));
                
                locationData = weatherData.records.location.find(loc => {
                    const locName = loc.locationName || '';
                    return locName === townName || 
                           locName.includes(townName.replace(/[區鎮鄉市]/g, '')) ||
                           townName.includes(locName.replace(/[區鎮鄉市]/g, ''));
                });
                
                if (!locationData && weatherData.records.location.length > 0) {
                    locationData = weatherData.records.location[0];
                    actualLocationName = locationData.locationName;
                }
                
                if (locationData) {
                    foundStructure = 'records.location';
                }
            }
            
            // 格式 2: records.locations[0].location
            if (!locationData && weatherData.records.locations && Array.isArray(weatherData.records.locations)) {
                debugLog('找到 records.locations 格式');
                debugLog('locations 數量:', weatherData.records.locations.length);
                
                if (weatherData.records.locations[0] && weatherData.records.locations[0].location) {
                    const locations = weatherData.records.locations[0].location;
                    debugLog('locations[0].location 數量:', locations.length);
                    debugLog('所有地區名稱:', locations.map(loc => loc.locationName));
                    
                    locationData = locations.find(loc => {
                        const locName = loc.locationName || '';
                        return locName === townName || 
                               locName.includes(townName.replace(/[區鎮鄉市]/g, '')) ||
                               townName.includes(locName.replace(/[區鎮鄉市]/g, ''));
                    });
                    
                    if (!locationData && locations.length > 0) {
                        locationData = locations[0];
                        actualLocationName = locationData.locationName;
                    }
                    
                    if (locationData) {
                        foundStructure = 'records.locations[0].location';
                    }
                }
            }
            
            debugLog('找到的資料結構:', foundStructure);
            debugLog('選擇的地區:', actualLocationName);
            
            if (locationData) {
                debugLog('地區資料 keys:', Object.keys(locationData));
                
                if (locationData.weatherElement) {
                    debugLog('氣象元素數量:', locationData.weatherElement.length);
                    debugLog('氣象元素名稱:', locationData.weatherElement.map(e => e.elementName));
                    
                    // 更新氣象參數
                    await updateWeatherParameters(locationData.weatherElement, actualLocationName, cityName);
                    
                    // 顯示成功訊息
                    weatherInfoElement.innerHTML = `
                        <div class="alert alert-success">
                            <i class="fas fa-check-circle"></i>
                            氣象資料已成功載入自 ${cityName} ${actualLocationName}
                            <br><small class="text-muted">座標: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} | 資料結構: ${foundStructure}</small>
                        </div>
                    `;
                    
                    debugLog('氣象資料載入成功');
                    return;
                } else {
                    debugLog('找不到 weatherElement');
                }
            } else {
                debugLog('找不到對應的地區資料');
            }
        } else {
            debugLog('找不到 records');
        }
        
        // 如果到這裡表示解析失敗，觸發調試
        debugLog('資料結構解析失敗，啟動詳細調試...');
        await debugWeatherAPI(longitude, latitude);
        
        throw new Error('無法解析氣象資料結構');

    } catch (error) {
        debugLog('獲取氣象資料失敗', error);
        
        const weatherInfoElement = document.getElementById('weather-parameters') || 
                                  document.getElementById('weatherDisplay') ||
                                  document.getElementById('weatherInfo');
        
        if (weatherInfoElement) {
            weatherInfoElement.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>無法自動獲取氣象資料</strong><br>
                    ${error.message}<br>
                    <small class="text-muted">請檢查 Console 中的詳細調試資訊</small>
                    <br>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="getLocationAndWeather(${longitude}, ${latitude})">
                        <i class="fas fa-redo"></i> 重試
                    </button>
                    <button class="btn btn-sm btn-outline-info mt-2" onclick="debugWeatherAPI(${longitude}, ${latitude})">
                        <i class="fas fa-bug"></i> 詳細調試
                    </button>
                </div>
            `;
        }
    }
}

// 根據座標判斷縣市的函數
function getLocationByCoordinates(lat, lon) {
    debugLog('根據座標判斷位置', { lat, lon });
    
    const locationRanges = {
        '臺中市': { 
            latMin: 24.0, latMax: 24.5, lonMin: 120.4, lonMax: 121.0, 
            towns: ['中區', '東區', '南區', '西區', '北區', '西屯區', '南屯區', '北屯區'] 
        },
        '苗栗縣': { 
            latMin: 24.2, latMax: 24.8, lonMin: 120.6, lonMax: 121.1, 
            towns: ['苗栗市', '頭份市', '公館鄉', '銅鑼鄉'] 
        }
    };

    for (const [cityName, range] of Object.entries(locationRanges)) {
        if (lat >= range.latMin && lat <= range.latMax && 
            lon >= range.lonMin && lon <= range.lonMax) {
            
            let townName = range.towns[0];
            
            if (cityName === '臺中市') {
                if (lat >= 24.13 && lat <= 24.16 && lon >= 120.67 && lon <= 120.69) {
                    townName = '中區';
                }
            }
            
            debugLog(`座標判斷結果: ${cityName} ${townName}`);
            return { cityName, townName };
        }
    }
    
    debugLog('無法判斷位置，座標超出範圍');
    return null;
}

// 更新氣象參數到表單
async function updateWeatherParameters(weatherElements, locationName, cityName) {
    try {
        debugLog('開始更新氣象參數', { locationName, cityName });
        debugLog('可用的氣象元素:', weatherElements.map(e => e.elementName));
        
        // 更新溫度 (T)
        const tempElement = weatherElements.find(e => e.elementName === 'T');
        if (tempElement && tempElement.time && tempElement.time[0] && tempElement.time[0].parameter) {
            const temperature = tempElement.time[0].parameter.parameterName;
            const tempInput = document.getElementById('temperature');
            if (tempInput) {
                tempInput.value = temperature;
                debugLog(`溫度已更新: ${temperature}°C`);
            }
        }

        // 更新相對濕度 (RH)
        const humidityElement = weatherElements.find(e => e.elementName === 'RH');
        if (humidityElement && humidityElement.time && humidityElement.time[0] && humidityElement.time[0].parameter) {
            const humidity = humidityElement.time[0].parameter.parameterName;
            const humidityInput = document.getElementById('humidity');
            if (humidityInput) {
                humidityInput.value = humidity;
                debugLog(`濕度已更新: ${humidity}%`);
            }
        }

        // 更新風速 (WS)
        const windElement = weatherElements.find(e => e.elementName === 'WS');
        if (windElement && windElement.time && windElement.time[0] && windElement.time[0].parameter) {
            const windSpeed = windElement.time[0].parameter.parameterName;
            const windSpeedInput = document.getElementById('windSpeed');
            if (windSpeedInput) {
                windSpeedInput.value = windSpeed;
                debugLog(`風速已更新: ${windSpeed} m/s`);
            }
        }

        const timestamp = new Date().toLocaleString('zh-TW');
        const sourceInfo = document.getElementById('data-source');
        if (sourceInfo) {
            sourceInfo.innerHTML = `
                <small class="text-muted">
                    <i class="fas fa-info-circle"></i>
                    資料來源: ${cityName} ${locationName} 氣象站 | 更新時間: ${timestamp}
                </small>
            `;
        }

        if (typeof updateCalculation === 'function') {
            updateCalculation();
        }

        debugLog('氣象參數更新完成');
        
    } catch (error) {
        debugLog('更新氣象參數時發生錯誤', error);
        throw error;
    }
}

debugLog('位置系統載入完成');
