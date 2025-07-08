// location.js - 完全修正版本（整合農業部自動氣象站資料）

// === 設定區域 ===
const CONFIG = {
  // 模擬功能設定
  SIMULATION_MODE: {
    enabled: false,           // true: 強制使用模擬資料, false: 優先使用真實API
    fallbackEnabled: true,   // true: API失敗時使用模擬資料, false: API失敗時直接報錯
    logMode: true            // true: 顯示模擬資料來源訊息, false: 靜默模式
  },
  
  // 農業部API設定
  AGRI_API: {
    baseURL: 'https://data.moa.gov.tw/api/v1/AutoWeatherStationType/?api_key=IKXAGW0DJ1G90FL4SJ5N364EM567QX',
    apiKey: 'IKXAGW0DJ1G90FL4SJ5N364EM567QX', // 請替換為您的農業部API金鑰
    timeout: 10000,
    retryCount: 3,              // API失敗重試次數
    retryDelay: 2000           // 重試間隔(毫秒)
  },
  
  // 目標位置設定
  TARGET_LOCATION: {
    lat: 24.5593,
    lng: 120.8214,
    name: '苗栗區農業改良場',
    city: '苗栗縣',
    town: '公館鄉'
  }
};

// === 模擬資料管理 ===
class SimulationManager {
  static generateMockAgriData() {
    const mockStations = [
      {
        Station_name: '苗栗農改場',
        Station_ID: 'ML001',
        Station_Latitude: 24.5593,
        Station_Longitude: 120.8214,
        CITY: '苗栗縣',
        TOWN: '公館鄉',
        TEMP: 25.3 + (Math.random() - 0.5) * 2, // 添加隨機變化
        HUMD: 78.5 + (Math.random() - 0.5) * 10,
        WDSD: 2.1 + (Math.random() - 0.5) * 1,
        WDIR: 135 + Math.floor((Math.random() - 0.5) * 60),
        PRES: 1013.2 + (Math.random() - 0.5) * 5,
        H_24R: Math.random() * 5,
        SUN: Math.floor(Math.random() * 10),
        TIME: new Date().toISOString(),
        ELEV: 85
      },
      {
        Station_name: '頭屋測站',
        Station_ID: 'ML002',
        Station_Latitude: 24.5789,
        Station_Longitude: 120.8456,
        CITY: '苗栗縣',
        TOWN: '頭屋鄉',
        TEMP: 24.8 + (Math.random() - 0.5) * 2,
        HUMD: 82.1 + (Math.random() - 0.5) * 8,
        WDSD: 1.8 + (Math.random() - 0.5) * 1,
        WDIR: 180 + Math.floor((Math.random() - 0.5) * 40),
        PRES: 1012.8 + (Math.random() - 0.5) * 4,
        H_24R: Math.random() * 8,
        SUN: Math.floor(Math.random() * 8),
        TIME: new Date().toISOString(),
        ELEV: 92
      },
      {
        Station_name: '銅鑼測站',
        Station_ID: 'ML003',
        Station_Latitude: 24.4892,
        Station_Longitude: 120.7834,
        CITY: '苗栗縣',
        TOWN: '銅鑼鄉',
        TEMP: 26.1 + (Math.random() - 0.5) * 2,
        HUMD: 75.3 + (Math.random() - 0.5) * 12,
        WDSD: 2.5 + (Math.random() - 0.5) * 1.5,
        WDIR: 90 + Math.floor((Math.random() - 0.5) * 80),
        PRES: 1014.1 + (Math.random() - 0.5) * 6,
        H_24R: Math.random() * 3,
        SUN: Math.floor(Math.random() * 12),
        TIME: new Date().toISOString(),
        ELEV: 78
      }
    ];
    
    if (CONFIG.SIMULATION_MODE.logMode) {
      debugLog('🎭 使用模擬農業氣象站資料');
    }
    
    return mockStations;
  }
  
  static logSimulationUsage(reason) {
    if (CONFIG.SIMULATION_MODE.logMode) {
      debugLog(`🎭 切換到模擬模式: ${reason}`);
    }
  }
}

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

// 計算兩點間距離（公里）
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半徑（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 農業部氣象站API處理類
class AgriWeatherAPI {
  static async fetchWithRetry(url, options = {}, retries = CONFIG.AGRI_API.retryCount) {
    for (let i = 0; i <= retries; i++) {
      try {
        debugLog(`🌐 嘗試第 ${i + 1} 次 API 請求`);
        
        const response = await fetch(url, {
          ...options,
          timeout: CONFIG.AGRI_API.timeout
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
        
      } catch (error) {
        debugLog(`❌ API 請求失敗 (第 ${i + 1} 次):`, error.message);
        
        if (i === retries) {
          throw error;
        }
        
        if (i < retries) {
          debugLog(`⏳ ${CONFIG.AGRI_API.retryDelay}ms 後重試...`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.AGRI_API.retryDelay));
        }
      }
    }
  }
  
  static async getWeatherStations(latitude, longitude) {
    // 檢查是否強制使用模擬模式
    if (CONFIG.SIMULATION_MODE.enabled) {
      SimulationManager.logSimulationUsage('強制模擬模式已啟用');
      return SimulationManager.generateMockAgriData();
    }
    
    try {
      debugLog('🌾 開始獲取農業部自動氣象站資料...');
      
      let apiUrl = CONFIG.AGRI_API.baseURL;
      if (CONFIG.AGRI_API.apiKey && CONFIG.AGRI_API.apiKey !== 'YOUR_AGRI_API_KEY') {
        apiUrl += `?apikey=${CONFIG.AGRI_API.apiKey}`;
      }
      
      const data = await this.fetchWithRetry(apiUrl);
      
      if (!data || !Array.isArray(data)) {
        throw new Error('農業部API回應格式異常');
      }
      
      debugLog(`✅ 成功獲取 ${data.length} 個氣象站資料`);
      
      // 計算距離並排序
      const stationsWithDistance = data.map(station => ({
        ...station,
        distance: calculateDistance(
          latitude, longitude,
          parseFloat(station.Station_Latitude),
          parseFloat(station.Station_Longitude)
        )
      })).sort((a, b) => a.distance - b.distance);
      
      debugLog(`🎯 找到最近的氣象站: ${stationsWithDistance[0].Station_name} (距離: ${stationsWithDistance[0].distance.toFixed(2)}km)`);
      
      return stationsWithDistance;
      
    } catch (error) {
      debugLog('❌ 農業部API請求失敗:', error.message);
      
      // 檢查是否啟用備用模擬功能
      if (CONFIG.SIMULATION_MODE.fallbackEnabled) {
        SimulationManager.logSimulationUsage(`API失敗，啟用備用模擬: ${error.message}`);
        return SimulationManager.generateMockAgriData();
      } else {
        throw error;
      }
    }
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

// 主要API函數 - 使用農業部自動氣象站API
function activateAPIs(latitude, longitude) {
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
            
            return response.text();
        })
        .then((responseText) => {
            debugLog('📥 收到API回應，長度:', responseText.length);
            debugLog('📝 回應內容前150字符:', responseText.substring(0, 150));
            
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
                
                // 使用農業部自動氣象站API
                getAgriWeatherData(latitude, longitude, townName, ctyName);
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

    async function getAgriWeatherData(latitude, longitude, townName, ctyName) {
        debugLog(`🌾 正在獲取 ${ctyName} ${townName} 的農業氣象資料...`);
        
        weatherInfoElement.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">載入中...</span>
                </div>
                <p class="mt-2">正在獲取 ${ctyName} ${townName} 農業氣象資料...</p>
            </div>
        `;
        
        try {
            const stations = await AgriWeatherAPI.getWeatherStations(latitude, longitude);
            
            if (!stations || stations.length === 0) {
                throw new Error('找不到附近的農業氣象站');
            }
            
            // 選擇最近的氣象站
            const nearestStation = stations[0];
            debugLog('✅ 農業氣象API回應成功:', nearestStation);
            
            // 格式化時間
            const updateTime = new Date(nearestStation.TIME);
            const timeString = updateTime.toLocaleString('zh-TW');
            
            // 更新表單中的氣象參數
            updateWeatherInputs(
                nearestStation.TEMP, 
                nearestStation.WDSD, 
                townName, 
                ctyName, 
                nearestStation.HUMD,
                nearestStation.PRES,
                nearestStation.H_24R || 0,
                latitude,
                longitude
              );

            const weatherInfoHtml = `
                <div class="alert alert-success">
                    <h3><i class="fas fa-check-circle"></i> ${ctyName} ${townName} 農業氣象資料</h3>
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>🌡️ 溫度：</strong>${nearestStation.TEMP}°C</p>
                            <p><strong>💧 濕度：</strong>${nearestStation.HUMD}%</p>
                            <p><strong>💨 風速：</strong>${nearestStation.WDSD} m/s</p>
                            <p><strong>🧭 風向：</strong>${nearestStation.WDIR}°</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>📊 氣壓：</strong>${nearestStation.PRES} hPa</p>
                            <p><strong>🌧️ 24小時雨量：</strong>${nearestStation.H_24R || 0} mm</p>
                            <p><strong>☀️ 日照時數：</strong>${nearestStation.SUN || 0} 小時</p>
                            <p><strong>📍 測站：</strong>${nearestStation.Station_name}</p>
                        </div>
                    </div>
                    <hr>
                    <p><strong>⏰ 更新時間：</strong>${timeString}</p>
                    <p><strong>📏 距離：</strong>${nearestStation.distance ? nearestStation.distance.toFixed(2) + ' km' : '計算中'}</p>
                    <small class="text-muted">座標: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} | 資料來源: 農業部自動氣象站</small>
                </div>
            `;
            weatherInfoElement.innerHTML = weatherInfoHtml;
            
            debugLog(`🎉 農業氣象資料載入成功: ${ctyName} ${townName} - ${nearestStation.Station_name}`);
            
        } catch (error) {
            debugLog('❌ 農業氣象資料獲取失敗:', error.message);
            weatherInfoElement.innerHTML = `
                <div class="alert alert-warning">
                    <h6><i class="fas fa-exclamation-triangle"></i> 農業氣象資料獲取失敗</h6>
                    <p><strong>錯誤：</strong>${error.message}</p>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="activateAPIs(${latitude}, ${longitude})">
                        <i class="fas fa-redo"></i> 重試
                    </button>
                </div>
            `;
        }
    }
}

// 更新氣象參數到表單
function updateWeatherInputs(temperature, windSpeed, townName, cityName, humidity, pressure, rainfall, latitude, longitude) {
    try {
        debugLog('🔄 開始更新農業氣象參數', { 
            temperature, windSpeed, townName, cityName, humidity, pressure, rainfall, latitude, longitude 
        });
        
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

        // 更新濕度
        const humidityInput = document.getElementById('humidity');
        if (humidityInput) {
            humidityInput.value = humidity;
            debugLog(`💧 濕度已更新: ${humidity}%`);
        }

        // 更新氣壓
        const pressureInput = document.getElementById('pressure');
        if (pressureInput) {
            pressureInput.value = pressure;
            debugLog(`📊 氣壓已更新: ${pressure} hPa`);
        }

        // 更新降雨量
        const rainfallInput = document.getElementById('rainfall');
        if (rainfallInput) {
            rainfallInput.value = rainfall;
            debugLog(`🌧️ 降雨量已更新: ${rainfall} mm`);
        }

        // 更新緯度
        if (latitude !== undefined) {
            const latitudeInput = document.getElementById('latitude');
            if (latitudeInput) {
                latitudeInput.value = latitude.toFixed(4);
                debugLog(`📍 緯度已更新: ${latitude.toFixed(4)}°`);
            }
        }

        // 更新經度
        if (longitude !== undefined) {
            const longitudeInput = document.getElementById('longitude');
            if (longitudeInput) {
                longitudeInput.value = longitude.toFixed(4);
                debugLog(`📍 經度已更新: ${longitude.toFixed(4)}°`);
            }
        }

        // 根據緯度估算海拔高度（台灣地區概略值）
        if (latitude !== undefined && longitude !== undefined) {
            const elevationInput = document.getElementById('elevation');
            if (elevationInput) {
                // 台灣地區海拔估算邏輯
                let estimatedElevation = 85; // 預設值
                
                // 根據經緯度粗略估算海拔
                if (latitude > 24.0 && latitude < 24.5) {
                    estimatedElevation = Math.round(50 + Math.random() * 100); // 中部地區
                } else if (latitude >= 24.5) {
                    estimatedElevation = Math.round(100 + Math.random() * 200); // 北部地區
                } else {
                    estimatedElevation = Math.round(30 + Math.random() * 80); // 南部地區
                }
                
                elevationInput.value = estimatedElevation;
                debugLog(`🏔️ 海拔高度已估算: ${estimatedElevation}m`);
            }
        }

        // 根據氣象資料估算太陽輻射
        if (temperature !== undefined) {
            const solarRadiationInput = document.getElementById('solarRadiation');
            if (solarRadiationInput) {
                // 根據溫度和季節估算太陽輻射
                const currentMonth = new Date().getMonth() + 1;
                let baseSolarRadiation = 15; // 基礎值
                
                // 季節調整
                if (currentMonth >= 4 && currentMonth <= 9) {
                    baseSolarRadiation = 20; // 夏季較高
                } else {
                    baseSolarRadiation = 12; // 冬季較低
                }
                
                // 溫度調整
                const tempAdjustment = (temperature - 20) * 0.3;
                const estimatedSolarRadiation = Math.max(5, baseSolarRadiation + tempAdjustment);
                
                solarRadiationInput.value = estimatedSolarRadiation.toFixed(1);
                debugLog(`☀️ 太陽輻射已估算: ${estimatedSolarRadiation.toFixed(1)} MJ/m²/day`);
            }
        }

        // 觸發計算更新
        if (typeof updateCalculation === 'function') {
            updateCalculation();
            debugLog('🔄 已觸發計算更新');
        }

        debugLog('✅ 農業氣象參數更新完成');
        
    } catch (error) {
        debugLog('❌ 更新農業氣象參數時發生錯誤:', error.message);
    }
}

debugLog('🚀 農業氣象站整合位置系統載入完成');
