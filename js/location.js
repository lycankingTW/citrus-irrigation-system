// location.js - 修正版本（解決XML解析問題）

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

// XML解析函數 - 修正版
function parseLocationXML(xmlText) {
    try {
        debugLog('開始解析XML，內容長度:', xmlText.length);
        debugLog('XML前200字符:', xmlText.substring(0, 200));
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // 檢查XML解析錯誤
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            debugLog('XML解析錯誤:', parseError.textContent);
            throw new Error('XML解析錯誤');
        }
        
        // 嘗試多種可能的標籤名稱
        let ctyName = '';
        let townName = '';
        let ctyCode = '';
        
        // 方法1: 直接查找標籤
        const ctyNameNodes = ['ctyName', 'countyname', 'COUNTYNAME', 'county', 'County'];
        const townNameNodes = ['townName', 'townname', 'TOWNNAME', 'town', 'Town'];
        const ctyCodeNodes = ['ctyCode', 'countycode', 'COUNTYCODE', 'code', 'Code'];
        
        for (let tagName of ctyNameNodes) {
            const element = xmlDoc.querySelector(tagName);
            if (element && element.textContent) {
                ctyName = element.textContent.trim();
                break;
            }
        }
        
        for (let tagName of townNameNodes) {
            const element = xmlDoc.querySelector(tagName);
            if (element && element.textContent) {
                townName = element.textContent.trim();
                break;
            }
        }
        
        for (let tagName of ctyCodeNodes) {
            const element = xmlDoc.querySelector(tagName);
            if (element && element.textContent) {
                ctyCode = element.textContent.trim();
                break;
            }
        }
        
        // 方法2: 如果方法1失敗，嘗試查找所有文本節點
        if (!ctyName || !townName) {
            debugLog('嘗試方法2: 查找所有元素');
            const allElements = xmlDoc.querySelectorAll('*');
            debugLog('找到的所有XML元素:', Array.from(allElements).map(el => el.tagName));
            
            // 列出所有有內容的元素
            for (let element of allElements) {
                if (element.textContent && element.textContent.trim()) {
                    debugLog(`元素 ${element.tagName}: ${element.textContent.trim()}`);
                }
            }
        }
        
        debugLog('XML解析結果:', { ctyName, townName, ctyCode });
        
        if (ctyName && townName) {
            return {
                ctyName: ctyName,
                townName: townName,
                ctyCode: ctyCode
            };
        } else {
            // 如果解析失敗，顯示XML結構以便調試
            debugLog('XML解析失敗，完整XML內容:', xmlText);
            throw new Error('XML中找不到行政區資訊');
        }
        
    } catch (error) {
        debugLog('XML解析失敗:', error.message);
        debugLog('原始XML內容:', xmlText);
        throw new Error(`XML解析失敗: ${error.message}`);
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
    
    debugLog('查詢行政區:', locationApiUrl);

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
            debugLog('API回應狀態:', response.status);
            debugLog('API回應標頭:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            // 直接當作XML處理
            return response.text();
        })
        .then((xmlText) => {
            debugLog('收到API回應，長度:', xmlText.length);
            debugLog('回應內容前100字符:', xmlText.substring(0, 100));
            
            // 檢查是否為XML
            if (xmlText.trim().startsWith('<?xml') || xmlText.trim().startsWith('<')) {
                debugLog('確認為XML格式，開始解析');
                return parseLocationXML(xmlText);
            } else {
                // 嘗試JSON解析
                debugLog('嘗試JSON解析');
                try {
                    return JSON.parse(xmlText);
                } catch (e) {
                    debugLog('JSON解析失敗:', e.message);
                    throw new Error('回應格式無法識別');
                }
            }
        })
        .then((res) => {
            debugLog('✅ 行政區資料解析成功:', res);
            
            if (res && res.ctyName && res.townName) {
                const ctyName = res.ctyName;
                const townName = res.townName;
                
                debugLog(`🎯 行政區: ${ctyName} ${townName}`);
                
                const dataid = cityList[ctyName];
                if (dataid) {
                    const apiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${dataid}?Authorization=${apikey}&format=${format}&LocationName=${townName}`;
                    debugLog('氣象API URL:', apiUrl);
                    getWeatherApi(apiUrl, townName, ctyName);
                } else {
                    throw new Error(`找不到 ${ctyName} 的氣象站編號`);
                }
            } else {
                debugLog('❌ 行政區資料格式異常:', res);
                throw new Error('無法解析行政區資料');
            }
        })
        .catch((err) => {
            debugLog('❌ 行政區查詢失敗:', err);
            weatherInfoElement.innerHTML = `
                <div class="alert alert-danger">
                    <h6><i class="fas fa-exclamation-triangle"></i> 行政區查詢失敗</h6>
                    <p>${err.message}</p>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="activateAPIs(${latitude}, ${longitude})">
                        <i class="fas fa-redo"></i> 重試
                    </button>
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
                
                if (!res.records || !res.records.Locations || !res.records.Locations[0] || 
                    !res.records.Locations[0].Location || !res.records.Locations[0].Location[0] ||
                    !res.records.Locations[0].Location[0].WeatherElement) {
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
                        <h6><i class="fas fa-exclamation-triangle"></i> 氣象資料獲取失敗</h6>
                        <p>${err.message}</p>
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

        // 更新降雨機率
        const rainProbInput = document.getElementById('rainProb');
        if (rainProbInput) {
            rainProbInput.value = rainProb;
            debugLog(`✅ 降雨機率已更新: ${rainProb}%`);
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
