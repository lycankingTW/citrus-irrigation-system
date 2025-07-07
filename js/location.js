// location.js - 修正版本（移除錯誤的座標判斷）

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
                        // 直接使用您的簡潔方法
                        activateAPIs(latitude, longitude);
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

// 使用您原本正確的方法
function activateAPIs(latitude, longitude) {
    const cityList = {
        宜蘭縣: 'F-D0047-003', 桃園市: 'F-D0047-007', 新竹縣: 'F-D0047-011', 苗栗縣: 'F-D0047-015',
        彰化縣: 'F-D0047-019', 南投縣: 'F-D0047-023', 雲林縣: 'F-D0047-027', 嘉義縣: 'F-D0047-031',
        屏東縣: 'F-D0047-035', 臺東縣: 'F-D0047-039', 花蓮縣: 'F-D0047-043', 澎湖縣: 'F-D0047-047',
        基隆市: 'F-D0047-051', 新竹市: 'F-D0047-055', 嘉義市: 'F-D0047-059', 臺北市: 'F-D0047-063',
        高雄市: 'F-D0047-067', 新北市: 'F-D0047-071', 臺中市: 'F-D0047-075', 臺南市: 'F-D0047-079',
        連江縣: 'F-D0047-083', 金門縣: 'F-D0047-087'
    };
    const apikey = 'CWA-D32F5AAF-8CB1-49C5-A651-8AD504393777';
    const format = 'JSON';
    
    // 使用國土測繪中心API - 這是正確的方法！
    const locationApiUrl = `https://api.nlsc.gov.tw/other/TownVillagePointQuery/${longitude}/${latitude}/4326`;
    
    debugLog('查詢真實行政區:', locationApiUrl);

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

    // 顯示載入中
    weatherInfoElement.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">載入中...</span>
            </div>
            <p class="mt-2">正在查詢行政區資料...</p>
        </div>
    `;

    fetch(locationApiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then((res) => {
            debugLog('✅ 國土測繪中心回應:', res);
            
            if (res.ctyCode) {
                const ctyName = res.ctyName;
                const townName = res.townName;
                
                debugLog(`🎯 正確的行政區: ${ctyName} ${townName}`);
                
                const dataid = cityList[ctyName];
                if (dataid) {
                    const apiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${dataid}?Authorization=${apikey}&format=${format}&LocationName=${townName}`;
                    debugLog('氣象API URL:', apiUrl);
                    getWeatherApi(apiUrl, townName, ctyName);
                } else {
                    throw new Error(`找不到 ${ctyName} 的氣象站編號`);
                }
            } else {
                throw new Error('行政區資料無法取得');
            }
        })
        .catch((err) => {
            debugLog('❌ 行政區查詢失敗:', err);
            weatherInfoElement.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    行政區查詢失敗: ${err.message}
                </div>
            `;
        });

    function getWeatherApi(apiUrl, townName, ctyName) {
        debugLog(`正在獲取 ${ctyName} ${townName} 的氣象資料...`);
        
        weatherInfoElement.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">載入中...</span>
                </div>
                <p class="mt-2">正在獲取 ${ctyName} ${townName} 氣象資料...</p>
            </div>
        `;
        
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.json();
            })
            .then((res) => {
                debugLog('✅ 氣象API回應:', res);
                
                if (!townName || !res.records || !res.records.Locations || !res.records.Locations[0] || !res.records.Locations[0].Location || !res.records.Locations[0].Location[0]) {
                    throw new Error('氣象資料格式異常');
                }
                
                const weatherElement = res.records.Locations[0].Location[0].WeatherElement;
                const startTime = new Date(weatherElement[0].Time[0].StartTime);
                const endTime = new Date(weatherElement[0].Time[0].EndTime);
                const dateRange = `${startTime.getMonth() + 1}月${startTime.getDate()}日 ${startTime.getHours()}點${startTime.getMinutes()}分 ～ ${endTime.getMonth() + 1}月${endTime.getDate()}日 ${endTime.getHours()}點${endTime.getMinutes()}分`;

                const description = weatherElement[14].Time[0].ElementValue[0].WeatherDescription;
                const avgTemp = weatherElement[0].Time[0].ElementValue[0].Temperature;
                const maxCI = weatherElement[7].Time[0].ElementValue[0].MaxComfortIndex;
                const minCI = weatherElement[8].Time[0].ElementValue[0].MinComfortIndex;
                const windSpeed = weatherElement[9].Time[0].ElementValue[0].WindSpeed;
                const rainProb = weatherElement[11].Time[0].ElementValue[0].ProbabilityOfPrecipitation;

                // 更新表單中的氣象參數
                updateWeatherInputs(avgTemp, windSpeed, townName, ctyName, maxCI, minCI, rainProb);

                const weatherInfoHtml = `
                    <div class="alert alert-success">
                        <h3><i class="fas fa-check-circle"></i> ${ctyName} ${townName} 氣象預報</h3>
                        <p><strong>預報時段：</strong>${dateRange}</p>
                        <p><strong>天氣描述：</strong>${description}</p>
                        <p><strong>平均溫度：</strong>${avgTemp} °C</p>
                        <p><strong>舒適度指數：</strong> ${minCI} ～ ${maxCI}</p>
                        <p><strong>風速：</strong>${windSpeed} m/s</p>
                        <p><strong>12小時降雨機率：</strong>${rainProb} %</p>
                        <small class="text-muted">座標: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}</small>
                    </div>
                `;
                weatherInfoElement.innerHTML = weatherInfoHtml;
                
                debugLog(`✅ 氣象資料載入成功: ${ctyName} ${townName}`);
                
            })
            .catch((err) => {
                debugLog('❌ 氣象資料獲取失敗:', err);
                weatherInfoElement.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        氣象資料獲取失敗: ${err.message}
                        <br>
                        <button class="btn btn-sm btn-outline-primary mt-2" onclick="activateAPIs(${latitude}, ${longitude})">
                            <i class="fas fa-redo"></i> 重試
                        </button>
                    </div>
                `;
            });
    }
}

// 更新氣象參數到表單
function updateWeatherInputs(temperature, windSpeed, townName, cityName, maxCI, minCI, rainProb) {
    try {
        debugLog('開始更新氣象參數', { temperature, windSpeed, townName, cityName, maxCI, minCI, rainProb });
        
        // 更新溫度
        const tempInput = document.getElementById('temperature');
        if (tempInput) {
            tempInput.value = temperature;
            debugLog(`✅ 溫度已更新: ${temperature}°C`);
        }

        // 更新風速
        const windSpeedInput = document.getElementById('windSpeed');
        if (windSpeedInput) {
            windSpeedInput.value = windSpeed;
            debugLog(`✅ 風速已更新: ${windSpeed} m/s`);
        }

        // 🎯 更新降雨機率
        const rainProbInput = document.getElementById('rainProb');
        if (rainProbInput) {
            rainProbInput.value = rainProb;
            debugLog(`✅ 降雨機率已更新: ${rainProb}%`);
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
    }
}

debugLog('位置系統載入完成');
