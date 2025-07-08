// location.js - 完全修正版本（整合農業部自動氣象站資料）

// === 設定區域 ===
const CONFIG = {
// 模擬功能設定
SIMULATION_MODE: {
  enabled: false,           // true: 強制使用模擬資料, false: 優先使用真實API
  fallbackEnabled: true,   // true: API失敗時使用模擬資料, false: API失敗時直接報錯
  logMode: true            // true: 顯示模擬資料來源訊息, false: 靜默模式
},

// 農業部API設定 - 修正版
AGRI_API: {
  baseURL: 'https://data.moa.gov.tw/api/v1/AutoWeatherStationType/',
  apiKey: 'IKXAGW0DJ1G90FL4SJ5N364EM567QX', // 修正：統一使用 apiKey
  apiKeyParam: 'api_key', // 修正：使用官方文件的正確參數名稱
  timeout: 15000,
  retryCount: 3,
  retryDelay: 2000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'CitrusIrrigationSystem/1.0'
  }
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
      TEMP: 25.3 + (Math.random() - 0.5) * 2,
      HUMD: 78.5 + (Math.random() - 0.5) * 10,
      WDSD: 2.1 + (Math.random() - 0.5) * 1,
      WDIR: 135 + Math.floor((Math.random() - 0.5) * 60),
      PRES: 1013.2 + (Math.random() - 0.5) * 5,
      H_24R: Math.random() * 5,
      SUN: Math.floor(Math.random() * 10),
      TIME: new Date().toISOString(),
      ELEV: 85,
      dataSource: 'SIMULATION'
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
      ELEV: 92,
      dataSource: 'SIMULATION'
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
      ELEV: 78,
      dataSource: 'SIMULATION'
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

// XML解析函數
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

// 農業部氣象站API處理類 - 修正版
class AgriWeatherAPI {
static async fetchWithRetry(url, options = {}, retries = CONFIG.AGRI_API.retryCount) {
  for (let i = 0; i <= retries; i++) {
    try {
      debugLog(`🌐 嘗試第 ${i + 1} 次 API 請求: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.AGRI_API.timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...CONFIG.AGRI_API.headers,
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      debugLog(`📡 API回應狀態: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        debugLog(`❌ API錯誤回應: ${errorText.substring(0, 200)}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        debugLog(`📝 非JSON回應: ${text.substring(0, 200)}`);
        throw new Error(`API回應非JSON格式: ${contentType}`);
      }
      
      const data = await response.json();
      debugLog(`✅ API請求成功，資料類型: ${typeof data}`);
      
      return data;
      
    } catch (error) {
      debugLog(`❌ API 請求失敗 (第 ${i + 1} 次):`, error.message);
      
      if (error.name === 'AbortError') {
        debugLog(`⏰ 請求超時 (${CONFIG.AGRI_API.timeout}ms)`);
      }
      
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

static buildApiUrl() {
  const url = new URL(CONFIG.AGRI_API.baseURL);
  
  if (CONFIG.AGRI_API.apiKey && CONFIG.AGRI_API.apiKey !== 'YOUR_AGRI_API_KEY') {
    url.searchParams.append(CONFIG.AGRI_API.apiKeyParam, CONFIG.AGRI_API.apiKey);
  }
  
  debugLog(`🔗 建構的API URL: ${url.toString()}`);
  return url.toString();
}

static processApiResponse(data) {
  debugLog('🔍 開始分析農業部API回應結構...');
  debugLog('📊 回應類型:', typeof data);
  
  const possibleDataPaths = [
    data,
    data.data,
    data.records,
    data.result,
    data.items,
    data.stations,
    data.weatherStations,
    data.list,
    data.content
  ];
  
  for (const [index, dataPath] of possibleDataPaths.entries()) {
    if (Array.isArray(dataPath)) {
      debugLog(`✅ 在路徑 ${index} 找到陣列資料，長度: ${dataPath.length}`);
      return dataPath;
    }
  }
  
  if (data && typeof data === 'object') {
    debugLog('🔄 嘗試將物件轉換為陣列格式...');
    
    if (data.Station_ID || data.station_id || data.id) {
      debugLog('📍 發現單一氣象站資料，轉換為陣列');
      return [data];
    }
    
    const objectKeys = Object.keys(data);
    for (const key of objectKeys) {
      if (Array.isArray(data[key])) {
        debugLog(`✅ 在屬性 "${key}" 中找到陣列資料`);
        return data[key];
      }
    }
  }
  
  throw new Error(`無法解析農業部API回應格式。回應類型: ${typeof data}, 屬性: ${Object.keys(data || {}).join(', ')}`);
}

static async getWeatherStations(latitude, longitude) {
  if (CONFIG.SIMULATION_MODE.enabled) {
    SimulationManager.logSimulationUsage('強制模擬模式已啟用');
    return SimulationManager.generateMockAgriData();
  }
  
  try {
    debugLog('🌾 開始獲取農業部自動氣象站資料...');
    
    const apiUrl = this.buildApiUrl();
    const data = await this.fetchWithRetry(apiUrl);
    
    if (!data) {
      throw new Error('農業部API回應為空');
    }
    
    const stations = this.processApiResponse(data);
    
    debugLog(`✅ 成功獲取 ${stations.length} 個氣象站資料`);
    
    if (stations.length === 0) {
      throw new Error('未獲取到氣象站資料');
    }
    
    const stationsWithDistance = stations.map(station => ({
      ...station,
      distance: calculateDistance(
        latitude, longitude,
        parseFloat(station.Station_Latitude || station.lat || station.latitude || 0),
        parseFloat(station.Station_Longitude || station.lon || station.longitude || 0)
      )
    })).sort((a, b) => a.distance - b.distance);
    
    if (stationsWithDistance.length > 0) {
      debugLog(`🎯 找到最近的氣象站: ${stationsWithDistance[0].Station_name || stationsWithDistance[0].name} (距離: ${stationsWithDistance[0].distance.toFixed(2)}km)`);
    }
    
    return stationsWithDistance;
    
  } catch (error) {
    debugLog('❌ 農業部API請求失敗:', error.message);
    
    if (CONFIG.SIMULATION_MODE.fallbackEnabled) {
      SimulationManager.logSimulationUsage(`API失敗，啟用備用模擬: ${error.message}`);
      return SimulationManager.generateMockAgriData();
    } else {
      throw error;
    }
  }
}
}

// 更新表單氣象參數的函數
function updateWeatherInputs(temperature, windSpeed, townName, cityName, humidity, pressure, rainfall, latitude, longitude) {
  debugLog('🔄 更新表單氣象參數:', {
      temperature, windSpeed, townName, cityName, humidity, pressure, rainfall
  });
  
  // 溫度輸入框
  const tempInput = document.getElementById('temperature') || 
                   document.getElementById('temp') || 
                   document.querySelector('input[name="temperature"]');
  if (tempInput) {
      tempInput.value = temperature;
      debugLog('✅ 更新溫度:', temperature);
  }
  
  // 風速輸入框
  const windInput = document.getElementById('windSpeed') || 
                   document.getElementById('wind_speed') || 
                   document.querySelector('input[name="windSpeed"]');
  if (windInput) {
      windInput.value = windSpeed;
      debugLog('✅ 更新風速:', windSpeed);
  }
  
  // 濕度輸入框
  const humidityInput = document.getElementById('humidity') || 
                       document.querySelector('input[name="humidity"]');
  if (humidityInput) {
      humidityInput.value = humidity;
      debugLog('✅ 更新濕度:', humidity);
  }
  
  // 氣壓輸入框
  const pressureInput = document.getElementById('pressure') || 
                       document.querySelector('input[name="pressure"]');
  if (pressureInput) {
      pressureInput.value = pressure;
      debugLog('✅ 更新氣壓:', pressure);
  }
  
  // 雨量輸入框
  const rainfallInput = document.getElementById('rainfall') || 
                       document.querySelector('input[name="rainfall"]');
  if (rainfallInput) {
      rainfallInput.value = rainfall;
      debugLog('✅ 更新雨量:', rainfall);
  }
  
  // 位置相關輸入框
  const locationInput = document.getElementById('location') || 
                       document.querySelector('input[name="location"]');
  if (locationInput) {
      locationInput.value = `${cityName} ${townName}`;
      debugLog('✅ 更新位置:', `${cityName} ${townName}`);
  }
  
  // 緯度輸入框
  const latInput = document.getElementById('latitude') || 
                  document.querySelector('input[name="latitude"]');
  if (latInput) {
      latInput.value = latitude.toFixed(6);
      debugLog('✅ 更新緯度:', latitude);
  }
  
  // 經度輸入框
  const lngInput = document.getElementById('longitude') || 
                  document.querySelector('input[name="longitude"]');
  if (lngInput) {
      lngInput.value = longitude.toFixed(6);
      debugLog('✅ 更新經度:', longitude);
  }
  
  // 觸發input事件以確保表單驗證和其他事件處理器正常工作
  [tempInput, windInput, humidityInput, pressureInput, rainfallInput, locationInput, latInput, lngInput]
      .filter(input => input)
      .forEach(input => {
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
      });
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
            
            const nearestStation = stations[0];
            debugLog('✅ 農業氣象API回應成功:', nearestStation);
            
            const updateTime = new Date(nearestStation.TIME);
            const timeString = updateTime.toLocaleString('zh-TW');
            
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
                    <small class="text-muted">座標: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} | 資料來源: 農業部自動氣象站${nearestStation.dataSource === 'SIMULATION' ? ' (模擬資料)' : ''}</small>
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
                    <p>將使用預設氣象參數，請手動調整數值。</p>
                    <button class="btn btn-sm btn-outline-success mt-2" onclick="getAgriWeatherData(${latitude}, ${longitude}, '${townName}', '${ctyName}')">
                        <i class="fas fa-redo"></i> 重新獲取氣象資料
                    </button>
                </div>
            `;
            
            // 使用預設值更新表單
            updateWeatherInputs(
                25.0,  // 預設溫度
                2.0,   // 預設風速
                townName, 
                ctyName, 
                75,    // 預設濕度
                1013,  // 預設氣壓
                0,     // 預設雨量
                latitude,
                longitude
            );
        }
    }
}

// 全域錯誤處理
window.addEventListener('error', function(event) {
    debugLog('❌ 全域錯誤:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    debugLog('❌ 未處理的Promise拒絕:', event.reason);
});

// 導出主要函數供外部使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        SimulationManager,
        AgriWeatherAPI,
        updateWeatherInputs,
        calculateDistance,
        parseLocationXML,
        activateAPIs,
        debugLog
    };
}

// 開發模式下的額外調試功能
if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
    debugLog('🔧 開發模式已啟用');
    
    // 提供全域調試函數
    window.locationSystemDebug = {
        enableSimulation: () => {
            CONFIG.SIMULATION_MODE.enabled = true;
            debugLog('🎭 已啟用強制模擬模式');
        },
        disableSimulation: () => {
            CONFIG.SIMULATION_MODE.enabled = false;
            debugLog('🎭 已關閉強制模擬模式');
        },
        testLocation: (lat = 24.5593, lng = 120.8214) => {
            debugLog(`🧪 測試位置: ${lat}, ${lng}`);
            activateAPIs(lat, lng);
        },
        showConfig: () => {
            console.table(CONFIG);
        }
    };
    
    debugLog('🔧 調試函數已載入到 window.locationSystemDebug');
}

debugLog('✅ 位置系統初始化完成');
