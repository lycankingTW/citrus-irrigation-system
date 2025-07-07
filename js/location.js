// location.js - 整合簡化版本

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
    let locationData = document.getElementById('location-data');
    if (!locationData) {
        locationData = document.createElement('div');
        locationData.id = 'location-data';
        locationData.className = 'mt-3';
        const container = document.querySelector('.container') || document.querySelector('main') || document.body;
        container.appendChild(locationData);
    }
    
    locationData.innerHTML = `
        <div class="alert alert-success">
            <h6><i class="fas fa-map-marker-alt"></i> 位置獲取成功！</h6>
            <p><strong>緯度：</strong> ${position.coords.latitude.toFixed(6)}</p>
            <p><strong>經度：</strong> ${position.coords.longitude.toFixed(6)}</p>
            <p><strong>精確度：</strong> ${position.coords.accuracy} 公尺</p>
            <p><strong>時間：</strong> ${new Date(position.timestamp).toLocaleString('zh-TW')}</p>
        </div>
    `;
}

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

// 獲取行政區域和氣象資料（使用簡化方法）
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
        
        // 創建或獲取天氣顯示區域
        let weatherInfoElement = document.getElementById('weather-parameters') || 
                                document.getElementById('weatherDisplay') ||
                                document.getElementById('weatherInfo');
        
        if (!weatherInfoElement) {
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

        // 使用國土測繪中心API獲取行政區
        const locationApiUrl = `https://api.nlsc.gov.tw/other/TownVillagePointQuery/${longitude}/${latitude}/4326`;
        debugLog('查詢行政區 API:', locationApiUrl);
        
        const locationResponse = await fetch(locationApiUrl);
        if (!locationResponse.ok) {
            throw new Error(`行政區查詢失敗: ${locationResponse.status}`);
        }
        
        const locationData = await locationResponse.json();
        debugLog('行政區查詢結果:', locationData);
        
        if (!locationData.ctyCode) {
            throw new Error('無法取得行政區資料');
        }
        
        const ctyName = locationData.ctyName;
        const townName = locationData.townName;
        const dataid = cityList[ctyName];
        
        if (!dataid) {
            throw new Error(`找不到 ${ctyName} 的氣象站編號`);
        }
        
        debugLog(`正在獲取 ${ctyName} ${townName} 的氣象資料...`);
        
        // 使用 LocationName 參數過濾特定地區的氣象資料
        const weatherApiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${dataid}?Authorization=${apikey}&format=JSON&LocationName=${townName}`;
        debugLog('氣象 API URL:', weatherApiUrl);
        
        const weatherResponse = await fetch(weatherApiUrl);
        if (!weatherResponse.ok) {
            throw new Error(`氣象資料獲取失敗: ${weatherResponse.status} ${weatherResponse.statusText}`);
        }

        const weatherData = await weatherResponse.json();
        debugLog('氣象 API 回應:', weatherData);
        
        // 檢查資料結構並提取氣象元素
        if (weatherData.records && 
            weatherData.records.Locations && 
            weatherData.records.Locations[0] && 
            weatherData.records.Locations[0].Location && 
            weatherData.records.Locations[0].Location[0]) {
            
            const weatherElement = weatherData.records.Locations[0].Location[0].WeatherElement;
            
            if (weatherElement) {
                debugLog('找到氣象元素:', weatherElement.length);
                
                // 更新氣象參數到表單
                updateWeatherInputs(weatherElement, townName, ctyName);
                
                // 顯示成功訊息
                weatherInfoElement.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i>
                        氣象資料已成功載入自 ${ctyName} ${townName}
                        <br><small class="text-muted">座標: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}</small>
                    </div>
                `;
                
                debugLog('✅ 氣象資料載入成功');
                
            } else {
                throw new Error('找不到氣象元素資料');
            }
            
        } else {
            throw new Error('氣象資料格式異常');
        }

    } catch (error) {
        debugLog('❌ 獲取氣象資料失敗', error);
        
        const weatherInfoElement = document.getElementById('weather-parameters') || 
                                  document.getElementById('weatherDisplay') ||
                                  document.getElementById('weatherInfo');
        
        if (weatherInfoElement) {
            weatherInfoElement.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>無法自動獲取氣象資料</strong><br>
                    ${error.message}<br>
                    <small class="text-muted">請手動輸入氣象參數</small>
                    <br>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="getLocationAndWeather(${longitude}, ${latitude})">
                        <i class="fas fa-redo"></i> 重試
                    </button>
                </div>
            `;
        }
    }
}

// 更新氣象參數到表單
function updateWeatherInputs(weatherElements, townName, cityName) {
    try {
        debugLog('開始更新氣象參數', { townName, cityName });
        debugLog('可用的氣象元素:', weatherElements.map(e => e.ElementName));
        
        // 更新溫度 (T)
        const tempElement = weatherElements.find(e => e.ElementName === 'T');
        if (tempElement && tempElement.Time[0]) {
            const temperature = tempElement.Time[0].Parameter.ParameterName;
            const tempInput = document.getElementById('temperature');
            if (tempInput) {
                tempInput.value = temperature;
                debugLog(`✅ 溫度已更新: ${temperature}°C`);
            }
        }

        // 更新相對濕度 (RH)
        const humidityElement = weatherElements.find(e => e.ElementName === 'RH');
        if (humidityElement && humidityElement.Time[0]) {
            const humidity = humidityElement.Time[0].Parameter.ParameterName;
            const humidityInput = document.getElementById('humidity');
            if (humidityInput) {
                humidityInput.value = humidity;
                debugLog(`✅ 濕度已更新: ${humidity}%`);
            }
        }

        // 更新風速 (WS)
        const windElement = weatherElements.find(e => e.ElementName === 'WS');
        if (windElement && windElement.Time[0]) {
            const windSpeed = windElement.Time[0].Parameter.ParameterName;
            const windSpeedInput = document.getElementById('windSpeed');
            if (windSpeedInput) {
                windSpeedInput.value = windSpeed;
                debugLog(`✅ 風速已更新: ${windSpeed} m/s`);
            }
        }

        // 更新資料來源資訊
        const timestamp = new Date().toLocaleString('zh-TW');
        const sourceInfo = document.getElementById('data-source');
        if (sourceInfo) {
            sourceInfo.innerHTML = `
                <small class="text-muted">
                    <i class="fas fa-info-circle"></i>
                    資料來源: ${cityName} ${townName} 氣象站 | 更新時間: ${timestamp}
                </small>
            `;
        }

        // 觸發計算更新
        if (typeof updateCalculation === 'function') {
            updateCalculation();
        }

        debugLog('✅ 氣象參數更新完成');
        
    } catch (error) {
        debugLog('❌ 更新氣象參數時發生錯誤', error);
        throw error;
    }
}

debugLog('位置系統載入完成');
