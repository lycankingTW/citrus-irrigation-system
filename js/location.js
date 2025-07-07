// location.js

// 當文件載入完成後執行
document.addEventListener('DOMContentLoaded', function() {
    // 找到自動定位按鈕
    const autoLocateBtn = document.getElementById('autoLocateBtn');
    
    // 為按鈕添加點擊事件
    autoLocateBtn.addEventListener('click', function() {
        // 檢查瀏覽器是否支援地理位置功能
        if ("geolocation" in navigator) {
            // 顯示載入中狀態
            autoLocateBtn.disabled = true;
            autoLocateBtn.textContent = '正在獲取位置...';
            
            navigator.geolocation.getCurrentPosition(function(position) {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                // 更新位置資訊顯示
                function updateLocationDisplay(position) {
                    const locationData = document.getElementById('location-data');
                    if (locationData) {
                        locationData.innerHTML = `
            <p>位置獲取成功！</p>
            <p><span class="coordinates">緯度：</span> ${position.coords.latitude}</p>
            <p><span class="coordinates">經度：</span> ${position.coords.longitude}</p>
            <p><span class="coordinates">時間戳記：</span> ${new Date(position.timestamp).toLocaleString()}</p>
        `;
    }
}
                // 獲取氣象資料
                getLocationAndWeather(longitude, latitude);
            }, function(error) {
                console.error("定位錯誤：", error);
                alert("無法取得您的位置，請手動輸入位置資訊");
                resetButton();
            });
        } else {
            alert("您的瀏覽器不支援地理位置功能");
        }
    });
});

// 獲取行政區域和氣象資料
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
    const locationApiUrl = `https://api.nlsc.gov.tw/other/TownVillagePointQuery/${longitude}/${latitude}/4326`;

    try {
        // 先檢查必要的 DOM 元素是否存在
        const weatherInfoElement = document.getElementById('weather-parameters');
        if (!weatherInfoElement) {
            console.warn('找不到天氣參數顯示區域');
            return;
        }

        // 加入錯誤處理和回應格式檢查
        const locationResponse = await fetch(locationApiUrl);
        if (!locationResponse.ok) {
            throw new Error(`HTTP error! status: ${locationResponse.status}`);
        }
        
        // 檢查回應的內容類型
        const contentType = locationResponse.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") === -1) {
            throw new Error("API 未返回 JSON 格式資料");
        }

        const locationData = await locationResponse.json();

        if (locationData && locationData.ctyCode) {
            const ctyName = locationData.ctyName;
            const townName = locationData.townName;
            const dataid = cityList[ctyName];
            
            if (!dataid) {
                throw new Error(`找不到 ${ctyName} 的氣象站編號`);
            }

            const weatherApiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${dataid}?Authorization=${apikey}&format=JSON&LocationName=${townName}`;
            
            const weatherResponse = await fetch(weatherApiUrl);
            if (!weatherResponse.ok) {
                throw new Error(`氣象資料獲取失敗: ${weatherResponse.status}`);
            }

            const weatherData = await weatherResponse.json();
            
            if (weatherData.records && weatherData.records.Locations) {
                const weatherElement = weatherData.records.Locations[0].Location[0].WeatherElement;
                updateWeatherParameters(weatherElement, townName);
            } else {
                throw new Error('無法解析氣象資料');
            }
        } else {
            throw new Error('無法解析位置資料');
        }
    } catch (error) {
        console.error('獲取位置或天氣資料失敗：', error);
        // 使用更友善的錯誤提示
        const errorMessage = document.createElement('div');
        errorMessage.className = 'alert alert-danger';
        errorMessage.textContent = `資料獲取失敗：${error.message}`;
        
        const container = document.getElementById('weather-parameters');
        if (container) {
            container.innerHTML = '';
            container.appendChild(errorMessage);
        }
    }
}


// 更新氣象參數到表單
function updateWeatherParameters(weatherElement, townName) {
    try {
        // 更新溫度
        const temperature = weatherElement[0].Time[0].ElementValue[0].value;
        if (document.getElementById('temperature')) {
            document.getElementById('temperature').value = temperature;
        }

        // 更新相對濕度
        const humidity = weatherElement[2].Time[0].ElementValue[0].value;
        if (document.getElementById('humidity')) {
            document.getElementById('humidity').value = humidity;
        }

        // 更新風速
        const windSpeed = weatherElement[4].Time[0].ElementValue[0].value;
        if (document.getElementById('windSpeed')) {
            document.getElementById('windSpeed').value = windSpeed;
        }

        // 更新日照時數 (如果有的話)
        const sunshine = weatherElement.find(e => e.elementName === 'GloblRad');
        if (sunshine && document.getElementById('sunshine')) {
            document.getElementById('sunshine').value = sunshine.Time[0].ElementValue[0].value;
        }

        // 更新資料來源資訊
        const timestamp = new Date().toLocaleString('zh-TW');
        const sourceInfo = document.getElementById('data-source');
        if (sourceInfo) {
            sourceInfo.textContent = `資料來源: ${townName} 氣象站 (更新時間: ${timestamp})`;
        }

        // 觸發參數更新事件（如果需要）
        if (typeof updateIrrigationCalculation === 'function') {
            updateIrrigationCalculation();
        }

    } catch (error) {
        console.error('更新氣象參數失敗：', error);
        throw error;
    }
}

// 初始化位置服務
function initLocationService() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                getLocationAndWeather(longitude, latitude);
            },
            function(error) {
                console.error("定位錯誤：", error);
                alert("無法取得您的位置，請手動輸入氣象參數");
            }
        );
    } else {
        alert("您的瀏覽器不支援地理位置功能");
    }
}

// 當文件載入完成時初始化
document.addEventListener('DOMContentLoaded', function() {
    // 檢查並初始化位置服務
    initLocationService();
});
