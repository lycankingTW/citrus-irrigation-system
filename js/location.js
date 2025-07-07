// location.js - 修正版本

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
    
    // 找到自動定位按鈕
    const autoLocateBtn = document.getElementById('autoLocateBtn');
    
    if (autoLocateBtn) {
        debugLog('找到定位按鈕，綁定事件');
        
        // 為按鈕添加點擊事件
        autoLocateBtn.addEventListener('click', function(event) {
            event.preventDefault();
            debugLog('定位按鈕被點擊');
            
            // 檢查瀏覽器是否支援地理位置功能
            if ("geolocation" in navigator) {
                // 顯示載入中狀態
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
                        
                        // 更新位置資訊顯示
                        updateLocationDisplay(position);
                        
                        // 獲取氣象資料
                        getLocationAndWeather(longitude, latitude);
                        
                        // 重置按鈕
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
                        
                        // 顯示錯誤訊息
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

// 獲取行政區域和氣象資料（修正版）
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

        // 修正：先嘗試不指定地區的 API 呼叫
        const weatherApiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${dataid}?Authorization=${apikey}&format=JSON`;
        
        debugLog('API URL:', weatherApiUrl);
        
        const weatherResponse = await fetch(weatherApiUrl);
        if (!weatherResponse.ok) {
            throw new Error(`氣象資料獲取失敗: ${weatherResponse.status} ${weatherResponse.statusText}`);
        }

        const weatherData = await weatherResponse.json();
        debugLog('API 回應資料結構:', {
            success: weatherData.success,
            hasRecords: !!weatherData.records,
            recordsKeys: weatherData.records ? Object.keys(weatherData.records) : []
        });
        
        // 修正：詳細檢查資料結構並適應多種格式
        let locationData = null;
        let actualLocationName = townName;
        
        if (weatherData.records) {
            // 檢查新格式: records.location (直接陣列)
            if (weatherData.records.location && Array.isArray(weatherData.records.location)) {
                debugLog('找到 records.location 格式，地區數量:', weatherData.records.location.length);
                
                // 嘗試找到指定的鄉鎮區
                locationData = weatherData.records.location.find(loc => {
                    const locName = loc.locationName || '';
                    return locName === townName || 
                           locName.includes(townName.replace(/[區鎮鄉市]/g, '')) ||
                           townName.includes(locName.replace(/[區鎮鄉市]/g, ''));
                });
                
                // 如果找不到指定地區，使用第一個可用的
                if (!locationData && weatherData.records.location.length > 0) {
                    locationData = weatherData.records.location[0];
                    actualLocationName = locationData.locationName;
                    debugLog('使用第一個可用地區:', actualLocationName);
                }
            }
            
            // 檢查舊格式: records.locations[0].location
            if (!locationData && weatherData.records.locations && Array.isArray(weatherData.records.locations)) {
                debugLog('找到 records.locations 格式');
                
                if (weatherData.records.locations[0] && weatherData.records.locations[0].location) {
                    const locations = weatherData.records.locations[0].location;
                    debugLog('locations[0].location 地區數量:', locations.length);
                    
                    locationData = locations.find(loc => {
                        const locName = loc.locationName || '';
                        return locName === townName || 
                               locName.includes(townName.replace(/[區鎮鄉市]/g, '')) ||
                               townName.includes(locName.replace(/[區鎮鄉市]/g, ''));
                    });
                    
                    if (!locationData && locations.length > 0) {
                        locationData = locations[0];
                        actualLocationName = locationData.locationName;
                        debugLog('使用第一個可用地區:', actualLocationName);
                    }
                }
            }
        }
        
        if (locationData && locationData.weatherElement) {
            debugLog('找到氣象資料', {
                locationName: locationData.locationName,
                elementCount: locationData.weatherElement.length,
                elements: locationData.weatherElement.map(e => e.elementName)
            });
            
            // 更新氣象參數
            await updateWeatherParameters(locationData.weatherElement, actualLocationName, cityName);
            
            // 顯示成功訊息
            weatherInfoElement.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    氣象資料已成功載入自 ${cityName} ${actualLocationName}
                    <br><small class="text-muted">座標: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}</small>
                </div>
            `;
            
            debugLog('氣象資料載入成功');
            
        } else {
            // 詳細的錯誤資訊
            const errorDetails = {
                hasRecords: !!weatherData.records,
                recordsStructure: weatherData.records ? Object.keys(weatherData.records) : [],
                locationFound: !!locationData,
                weatherElementFound: locationData ? !!locationData.weatherElement : false
            };
            
            debugLog('資料結構分析:', errorDetails);
            debugLog('完整 API 回應:', weatherData);
            
            throw new Error(`無法解析氣象資料結構。詳細資訊: ${JSON.stringify(errorDetails)}`);
        }

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
                    <small class="text-muted">請手動輸入氣象參數或重試</small>
                    <br>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="getLocationAndWeather(${longitude}, ${latitude})">
                        <i class="fas fa-redo"></i> 重試
                    </button>
                    <button class="btn btn-sm btn-outline-info mt-2" onclick="console.log('調試資訊已輸出到 Console')">
                        <i class="fas fa-bug"></i> 查看 Console 調試資訊
                    </button>
                </div>
            `;
        }
    }
}

// 根據座標判斷縣市的函數
function getLocationByCoordinates(lat, lon) {
    debugLog('根據座標判斷位置', { lat, lon });
    
    // 台灣主要縣市的座標範圍
    const locationRanges = {
        '臺中市': { 
            latMin: 24.0, latMax: 24.5, lonMin: 120.4, lonMax: 121.0, 
            towns: ['中區', '東區', '南區', '西區', '北區', '西屯區', '南屯區', '北屯區', '豐原區', '東勢區', '大甲區', '清水區', '沙鹿區', '梧棲區', '后里區', '神岡區', '潭子區', '大雅區', '新社區', '石岡區', '外埔區', '大安區', '烏日區', '大肚區', '龍井區', '霧峰區', '太平區', '大里區', '和平區'] 
        },
        '苗栗縣': { 
            latMin: 24.2, latMax: 24.8, lonMin: 120.6, lonMax: 121.1, 
            towns: ['苗栗市', '頭份市', '公館鄉', '銅鑼鄉', '三義鄉', '大湖鄉', '卓蘭鎮', '通霄鎮', '苑裡鎮', '竹南鎮', '後龍鎮', '南庄鄉', '頭屋鄉', '西湖鄉', '造橋鄉', '三灣鄉', '獅潭鄉', '泰安鄉'] 
        },
        '彰化縣': { 
            latMin: 23.8, latMax: 24.3, lonMin: 120.3, lonMax: 120.8, 
            towns: ['彰化市', '鹿港鎮', '和美鎮', '線西鄉', '伸港鄉', '福興鄉', '秀水鄉', '花壇鄉', '芬園鄉', '員林市', '溪湖鎮', '田中鎮', '大村鄉', '埔鹽鄉', '埔心鄉', '永靖鄉', '社頭鄉', '二水鄉', '北斗鎮', '二林鎮', '田尾鄉', '埤頭鄉', '芳苑鄉', '大城鄉', '竹塘鄉', '溪州鄉'] 
        }
    };

    for (const [cityName, range] of Object.entries(locationRanges)) {
        if (lat >= range.latMin && lat <= range.latMax && 
            lon >= range.lonMin && lon <= range.lonMax) {
            
            // 根據座標選擇最適合的鄉鎮區
            let townName = range.towns[0]; // 預設使用第一個
            
            // 對於臺中市，根據更精確的座標判斷
            if (cityName === '臺中市') {
                if (lat >= 24.13 && lat <= 24.16 && lon >= 120.67 && lon <= 120.69) {
                    townName = '中區';
                } else if (lat >= 24.13 && lat <= 24.16 && lon >= 120.69 && lon <= 120.71) {
                    townName = '東區';
                } else if (lat >= 24.11 && lat <= 24.14 && lon >= 120.67 && lon <= 120.69) {
                    townName = '南區';
                } else if (lat >= 24.13 && lat <= 24.16 && lon >= 120.65 && lon <= 120.67) {
                    townName = '西區';
                } else if (lat >= 24.15 && lat <= 24.18 && lon >= 120.67 && lon <= 120.69) {
                    townName = '北區';
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

        // 更新資料來源資訊
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

        // 觸發參數更新事件（如果有相關的計算函數）
        if (typeof updateCalculation === 'function') {
            updateCalculation();
        }

        debugLog('氣象參數更新完成');
        
    } catch (error) {
        debugLog('更新氣象參數時發生錯誤', error);
        throw error;
    }
}

// 載入完成日誌
debugLog('位置系統載入完成');