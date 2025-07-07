// location.js

// 重置按鈕狀態
function resetButton() {
    const autoLocateBtn = document.getElementById('autoLocateBtn');
    if (autoLocateBtn) {
        autoLocateBtn.disabled = false;
        autoLocateBtn.textContent = '自動定位';

// 更新位置資訊顯示
function updateLocationDisplay(position) {
    const locationData = document.getElementById('location-data');
    if (locationData) {
        locationData.innerHTML = `
            <div class="alert alert-success">
                <h6><i class="fas fa-map-marker-alt"></i> 位置獲取成功！</h6>
                <p><strong>緯度：</strong> ${position.coords.latitude.toFixed(6)}</p>
                <p><strong>經度：</strong> ${position.coords.longitude.toFixed(6)}</p>
                <p><strong>時間：</strong> ${new Date(position.timestamp).toLocaleString()}</p>
            </div>
        `;
    }
}

// 當文件載入完成後執行
document.addEventListener('DOMContentLoaded', function() {
    // 找到自動定位按鈕
    const autoLocateBtn = document.getElementById('autoLocateBtn');
    
    if (autoLocateBtn) {
        // 為按鈕添加點擊事件
        autoLocateBtn.addEventListener('click', function() {
            // 檢查瀏覽器是否支援地理位置功能
            if ("geolocation" in navigator) {
                // 顯示載入中狀態
                autoLocateBtn.disabled = true;
                autoLocateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在獲取位置...';
                
                navigator.geolocation.getCurrentPosition(
                    function(position) {
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
                        console.error("定位錯誤：", error);
                        
                        let errorMessage = "無法取得您的位置";
                        switch(error.code) {
                            case error.PERMISSION_DENIED:
                                errorMessage = "用戶拒絕了定位請求";
                                break;
                            case error.POSITION_UNAVAILABLE:
                                errorMessage = "位置信息不可用";
                                break;
                            case error.TIMEOUT:
                                errorMessage = "定位請求超時";
                                break;
                        }
                        
                        alert(errorMessage + "，請手動輸入位置資訊");
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
    }
    
    // 自動初始化位置服務（可選）
    // initLocationService();
});

// 獲取行政區域和氣象資料
// 修改後的 getLocationAndWeather 函數
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
        // 檢查天氣參數顯示區域
        let weatherInfoElement = document.getElementById('weather-parameters') || 
                                document.getElementById('weatherDisplay') ||
                                document.getElementById('weatherInfo');
        
        if (!weatherInfoElement) {
            console.warn('找不到天氣參數顯示區域，創建新的顯示區域');
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

        // **移除有問題的位置 API 調用，改用座標判斷**
        const locationInfo = getLocationByCoordinates(latitude, longitude);
        
        if (!locationInfo) {
            throw new Error('無法判斷所在縣市，建議手動選擇地區');
        }

        const { cityName, townName } = locationInfo;
        const dataid = cityList[cityName];
        
        if (!dataid) {
            throw new Error(`找不到 ${cityName} 的氣象站編號`);
        }

        // 直接獲取氣象資料
        const weatherApiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${dataid}?Authorization=${apikey}&format=JSON&LocationName=${townName}`;
        
        console.log(`正在獲取 ${cityName} ${townName} 的氣象資料...`);
        
        const weatherResponse = await fetch(weatherApiUrl);
        if (!weatherResponse.ok) {
            throw new Error(`氣象資料獲取失敗: ${weatherResponse.status} ${weatherResponse.statusText}`);
        }

        const weatherData = await weatherResponse.json();
        
        if (weatherData.records && weatherData.records.Locations && weatherData.records.Locations[0].Location.length > 0) {
            const weatherElement = weatherData.records.Locations[0].Location[0].WeatherElement;
            updateWeatherParameters(weatherElement, townName, cityName);
            
            // 顯示成功訊息
            weatherInfoElement.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    氣象資料已成功載入自 ${cityName} ${townName}
                    <br><small class="text-muted">座標: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}</small>
                </div>
            `;
        } else {
            throw new Error('無法解析氣象資料結構');
        }

    } catch (error) {
        console.error('獲取氣象資料失敗：', error);
        
        const weatherInfoElement = document.getElementById('weather-parameters') || 
                                  document.getElementById('weatherDisplay');
        if (weatherInfoElement) {
            weatherInfoElement.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>無法自動獲取氣象資料</strong><br>
                    ${error.message}<br>
                    <small class="text-muted">請手動輸入氣象參數或選擇地區</small>
                </div>
            `;
        }
    }
}

// 根據座標判斷縣市的函數
function getLocationByCoordinates(lat, lon) {
    // 台灣主要縣市的座標範圍 (基於 WGS84 座標系統)
    const locationRanges = {
        '基隆市': { 
            latMin: 25.1, latMax: 25.2, lonMin: 121.7, lonMax: 121.8, 
            towns: ['中正區', '七堵區', '暖暖區', '仁愛區', '中山區', '安樂區', '信義區'] 
        },
        '臺北市': { 
            latMin: 25.0, latMax: 25.3, lonMin: 121.4, lonMax: 121.7, 
            towns: ['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區'] 
        },
        '新北市': { 
            latMin: 24.6, latMax: 25.3, lonMin: 121.2, lonMax: 122.0, 
            towns: ['板橋區', '三重區', '中和區', '永和區', '新莊區', '新店區', '樹林區', '鶯歌區', '三峽區', '淡水區', '汐止區', '瑞芳區', '土城區', '蘆洲區', '五股區', '泰山區', '林口區', '深坑區', '石碇區', '坪林區', '三芝區', '石門區', '八里區', '平溪區', '雙溪區', '貢寮區', '金山區', '萬里區', '烏來區'] 
        },
        '桃園市': { 
            latMin: 24.8, latMax: 25.1, lonMin: 121.0, lonMax: 121.5, 
            towns: ['桃園區', '中壢區', '大溪區', '楊梅區', '蘆竹區', '大園區', '龜山區', '八德區', '龍潭區', '平鎮區', '新屋區', '觀音區', '復興區'] 
        },
        '新竹市': { 
            latMin: 24.7, latMax: 24.9, lonMin: 120.9, lonMax: 121.0, 
            towns: ['東區', '北區', '香山區'] 
        },
        '新竹縣': { 
            latMin: 24.4, latMax: 24.9, lonMin: 120.8, lonMax: 121.3, 
            towns: ['竹北市', '竹東鎮', '新埔鎮', '關西鎮', '湖口鄉', '新豐鄉', '芎林鄉', '橫山鄉', '北埔鄉', '寶山鄉', '峨眉鄉', '尖石鄉', '五峰鄉'] 
        },
        '苗栗縣': { 
            latMin: 24.2, latMax: 24.8, lonMin: 120.6, lonMax: 121.1, 
            towns: ['苗栗市', '頭份市', '苑裡鎮', '通霄鎮', '竹南鎮', '後龍鎮', '卓蘭鎮', '大湖鄉', '公館鄉', '銅鑼鄉', '南庄鄉', '頭屋鄉', '三義鄉', '西湖鄉', '造橋鄉', '三灣鄉', '獅潭鄉', '泰安鄉'] 
        },
        '臺中市': { 
            latMin: 24.0, latMax: 24.5, lonMin: 120.4, lonMax: 121.0, 
            towns: ['中區', '東區', '南區', '西區', '北區', '西屯區', '南屯區', '北屯區', '豐原區', '東勢區', '大甲區', '清水區', '沙鹿區', '梧棲區', '后里區', '神岡區', '潭子區', '大雅區', '新社區', '石岡區', '外埔區', '大安區', '烏日區', '大肚區', '龍井區', '霧峰區', '太平區', '大里區', '和平區'] 
        }
        // 可以繼續添加其他縣市...
    };

    for (const [cityName, range] of Object.entries(locationRanges)) {
        if (lat >= range.latMin && lat <= range.latMax && 
            lon >= range.lonMin && lon <= range.lonMax) {
            // 選擇第一個鄉鎮區作為預設值
            const townName = range.towns[0];
            console.log(`座標判斷結果: ${cityName} ${townName}`);
            return { cityName, townName };
        }
    }
}

        
        // 顯示錯誤訊息
        const weatherInfoElement = document.getElementById('weather-parameters') || 
                                  document.getElementById('weatherDisplay');
        if (weatherInfoElement) {
            weatherInfoElement.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>資料獲取失敗：</strong>${error.message}
                    <br><small>請檢查網路連線或手動輸入氣象參數</small>
                </div>
            `;
        }
    }
}

// 更新氣象參數到表單
function updateWeatherParameters(weatherElement, townName, cityName) {
    try {
        // 更新溫度
        if (weatherElement[0] && weatherElement[0].Time[0]) {
            const temperature = weatherElement[0].Time[0].ElementValue[0].value;
            const tempInput = document.getElementById('temperature');
            if (tempInput) {
                tempInput.value = temperature;
                console.log(`溫度已更新: ${temperature}°C`);
            }
        }

        // 更新相對濕度
        if (weatherElement[2] && weatherElement[2].Time[0]) {
            const humidity = weatherElement[2].Time[0].ElementValue[0].value;
            const humidityInput = document.getElementById('humidity');
            if (humidityInput) {
                humidityInput.value = humidity;
                console.log(`濕度已更新: ${humidity}%`);
            }
        }

        // 更新風速
        if (weatherElement[4] && weatherElement[4].Time[0]) {
            const windSpeed = weatherElement[4].Time[0].ElementValue[0].value;
            const windSpeedInput = document.getElementById('windSpeed');
            if (windSpeedInput) {
                windSpeedInput.value = windSpeed;
                console.log(`風速已更新: ${windSpeed} m/s`);
            }
        }

        // 更新日照時數 (如果有的話)
        const sunshine = weatherElement.find(e => e.elementName === 'GloblRad');
        if (sunshine && sunshine.Time[0]) {
            const sunshineInput = document.getElementById('sunshine');
            if (sunshineInput) {
                sunshineInput.value = sunshine.Time[0].ElementValue[0].value;
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

        // 觸發參數更新事件（如果需要）
        if (typeof updateIrrigationCalculation === 'function') {
            updateIrrigationCalculation();
        }

        console.log('氣象參數更新完成');

    } catch (error) {
        console.error('更新氣象參數失敗：', error);
        throw error;
    }
}

// 初始化位置服務（可選功能）
function initLocationService() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                console.log('自動獲取位置成功');
                getLocationAndWeather(longitude, latitude);
            },
            function(error) {
                console.warn("自動定位失敗：", error.message);
                // 不顯示alert，因為這是自動功能
            },
            {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 300000 // 5分鐘快取
            }
        );
    }
}