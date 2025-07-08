// location.js - 完全修正版本（徹底解決XML解析問題）

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

// XML解析函數 - 完全重寫版
function parseLocationXML(xmlText) {
    try {
        debugLog('🔍 開始解析XML，內容長度:', xmlText.length);
        debugLog('📄 XML前200字符:', xmlText.substring(0, 200));
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
        
        // 檢查XML解析錯誤
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            debugLog('❌ XML解析錯誤:', parseError.textContent);
            throw new Error('XML格式錯誤');
        }
        
        // 列出所有元素以便調試
        const allElements = xmlDoc.querySelectorAll('*');
        debugLog('🔎 XML中的所有元素:');
        for (let element of allElements) {
            if (element.textContent && element.textContent.trim()) {
                debugLog(`   ${element.tagName}: "${element.textContent.trim()}"`);
            }
        }
        
        // 嘗試多種可能的標籤組合
        let ctyName = '';
        let townName = '';
        let ctyCode = '';
        
        // 縣市名稱的可能標籤
        const countyTags = [
            'ctyName', 'countyName', 'COUNTYNAME', 'county', 'County',
            'ctyname', 'CTYNAME', 'ctName', 'CTNAME'
        ];
        
        // 鄉鎮名稱的可能標籤
        const townTags = [
            'townName', 'townname', 'TOWNNAME', 'town', 'Town',
            'tName', 'TNAME', 'twName', 'TWNAME'
        ];
        
        // 代碼的可能標籤
        const codeTags = [
            'ctyCode', 'countyCode', 'COUNTYCODE', 'code', 'Code',
            'ctycode', 'CTYCODE', 'ctCode', 'CTCODE'
        ];
        
        // 查找縣市名稱
        for (let tag of countyTags) {
            const element = xmlDoc.querySelector(tag);
            if (element && element.textContent && element.textContent.trim()) {
                ctyName = element.textContent.trim();
                debugLog(`✅ 找到縣市名稱 (${tag}): ${ctyName}`);
                break;
            }
        }
        
        // 查找鄉鎮名稱
        for (let tag of townTags) {
            const element = xmlDoc.querySelector(tag);
            if (element && element.textContent && element.textContent.trim()) {
                townName = element.textContent.trim();
                debugLog(`✅ 找到鄉鎮名稱 (${tag}): ${townName}`);
                break;
            }
        }
        
        // 查找代碼
        for (let tag of codeTags) {
            const element = xmlDoc.querySelector(tag);
            if (element && element.textContent && element.textContent.trim()) {
                ctyCode = element.textContent.trim();
                debugLog(`✅ 找到代碼 (${tag}): ${ctyCode}`);
                break;
            }
        }
        
        debugLog('🎯 最終解析結果:', { ctyName, townName, ctyCode });
        
        if (ctyName && townName) {
            return {
                ctyName: ctyName,
                townName: townName,
                ctyCode: ctyCode
            };
        } else {
            debugLog('❌ 解析失敗，完整XML內容:', xmlText);
            throw new Error(`找不到完整行政區資訊 (縣市: "${ctyName}", 鄉鎮: "${townName}")`);
        }
        
    } catch (error) {
        debugLog('❌ XML解析異常:', error.message);
        throw error;
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

// 主要API函數
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
    
    const locationApiUrl = `https://api.nlsc.gov.tw/other/TownVillagePointQuery/${longitude}/${latitude}/4326`;
    
    debugLog('🌍 查詢行政區:', locationApiUrl);

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

    // 使用 fetch 獲取行政區資料
    fetch(locationApiUrl)
        .then(response => {
            debugLog('📡 API回應狀態:', response.status);
            debugLog('📋 API回應標頭:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                throw new Error(`HTTP錯誤 ${response.status}`);
            }
            
            // 重要：直接返回 text()，不要嘗試 json()
            return response.text();
        })
        .then((responseText) => {
            debugLog('📥 收到API回應，長度:', responseText.length);
            debugLog('📝 回應內容前150字符:', responseText.substring(0, 150));
            
            // 確保這是XML格式
            if (responseText.trim().startsWith('<?xml') || responseText.includes('<')) {
                debugLog('✅ 確認為XML格式，開始解析');
                return parseLocationXML(responseText);
            } else {
                debugLog('❌ 回應格式異常:', responseText.substring(0, 100));
                throw new Error('API回應格式不是XML');
            }
        })
        .then((locationData) => {
            debugLog('🎉 行政區資料解析成功:', locationData);
            
            if (locationData && locationData.ctyName && locationData.townName) {
                const ctyName = locationData.ctyName;
                const townName = locationData.townName;
                
                debugLog(`🏛️ 解析出行政區: ${ctyName} ${townName}`);
                
                const dataid = cityList[ctyName];
                if (dataid) {
                    const weatherApiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${dataid}?Authorization=${apikey}&format=${format}&LocationName=${townName}`;
                    debugLog('🌤️ 氣象API URL:', weatherApiUrl);
                    getWeatherApi(weatherApiUrl, townName, ctyName);
                } else {
                    throw new Error(`找不到 ${ctyName} 對應的氣象站編號`);
                }
            } else {
                throw new Error('行政區資料不完整');
            }
        })
        .catch((error) => {
            debugLog('❌ 行政區查詢失敗:', error.message);
            weatherInfoElement.innerHTML = `
                <div class="alert alert-danger">
                    <h6><i class="fas fa-exclamation-triangle"></i> 行政區查詢失敗</h6>
                    <p><strong>錯誤：</strong>${error.message}</p>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="activateAPIs(${latitude}, ${longitude})">
                        <i class="fas fa-redo"></i> 重試
                    </button>
                </div>
            `;
        });

    function getWeatherApi(apiUrl, townName, ctyName) {
        debugLog(`🌦️ 正在獲取 ${ctyName} ${townName} 的氣象資料...`);
        
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
                debugLog('🌡️ 氣象API回應狀態:', response.status);
                if (!response.ok) {
                    throw new Error(`氣象API HTTP錯誤 ${response.status}`);
                }
                return response.json();
            })
            .then((weatherData) => {
                debugLog('✅ 氣象API回應成功:', weatherData);
                
                if (!weatherData.records || !weatherData.records.Locations || !weatherData.records.Locations[0] || 
                    !weatherData.records.Locations[0].Location || !weatherData.records.Locations[0].Location[0] ||
                    !weatherData.records.Locations[0].Location[0].WeatherElement) {
                    throw new Error('氣象資料結構異常');
                }
                
                const weatherElement = weatherData.records.Locations[0].Location[0].WeatherElement;
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
                
                debugLog(`🎉 氣象資料載入成功: ${ctyName} ${townName}`);
                
            })
            .catch((error) => {
                debugLog('❌ 氣象資料獲取失敗:', error.message);
                weatherInfoElement.innerHTML = `
                    <div class="alert alert-warning">
                        <h6><i class="fas fa-exclamation-triangle"></i> 氣象資料獲取失敗</h6>
                        <p><strong>錯誤：</strong>${error.message}</p>
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
        debugLog('🔄 開始更新氣象參數', { temperature, windSpeed, townName, cityName, maxCI, minCI, rainProb });
        
        // 更新溫度
        const tempInput = document.getElementById('temperature');
        if (tempInput) {
            tempInput.value = temperature;
            debugLog(`🌡️ 溫度已更新: ${temperature}°C`);
        }

        // 更新風速
        const windSpeedInput = document.getElementById('windSpeed');
        if (windSpeedInput) {
            windSpeedInput.value = windSpeed;
            debugLog(`💨 風速已更新: ${windSpeed} m/s`);
        }

        // 更新降雨機率
        const rainProbInput = document.getElementById('rainProb');
        if (rainProbInput) {
            rainProbInput.value = rainProb;
            debugLog(`🌧️ 降雨機率已更新: ${rainProb}%`);
        }

        // 觸發計算更新
        if (typeof updateCalculation === 'function') {
            updateCalculation();
            debugLog('🔄 已觸發計算更新');
        }

        debugLog('✅ 氣象參數更新完成');
        
    } catch (error) {
        debugLog('❌ 更新氣象參數時發生錯誤:', error.message);
    }
}

debugLog('🚀 位置系統載入完成');
