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
                fetchWeatherData(longitude, latitude);
            }, function(error) {
                console.error("定位錯誤：", error);
                alert("無法取得您的位置，請手動輸入位置資訊");
                autoLocateBtn.disabled = false;
                autoLocateBtn.textContent = '自動獲取當前位置';
            });
        } else {
            alert("您的瀏覽器不支援地理位置功能");
        }
    });
});

// 獲取氣象資料的函數
async function fetchWeatherData(longitude, latitude) {
    const CWB_API_KEY = 'CWA-D32F5AAF-8CB1-49C5-A651-8AD504393777';
    const url = 'https://opendata.cwa.gov.tw/linked/graphql';
    
    const graphqlQuery = {
        query: `
            query town {
                town(Longitude: ${longitude}, Latitude: ${latitude}) {
                    ctyName
                    townName
                    forecast72hr {
                        Temperature {
                            Time {
                                DataTime
                                Temperature
                            }
                        }
                        ComfortIndex {
                            Time {
                                DataTime
                                ComfortIndex
                                ComfortIndexDescription
                            }
                        }
                        WindSpeed {
                            Time {
                                DataTime
                                WindSpeed
                                BeaufortScale
                            }
                        }
                        ProbabilityOfPrecipitation {
                            Time {
                                StartTime
                                EndTime
                                ProbabilityOfPrecipitation
                            }
                        }
                        WeatherDescription {
                            Time {
                                StartTime
                                EndTime
                                WeatherDescription
                            }
                        }
                    }
                }
            }
        `,
        variables: null
    };

    try {
        const response = await fetch(`${url}?Authorization=${CWB_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(graphqlQuery)
        });

        const data = await response.json();
        
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }
        
        updateFormWithWeatherData(data.data);
    } catch (error) {
        console.error("獲取氣象資料失敗：", error);
        alert("無法獲取氣象資料，請稍後再試");
    } finally {
        // 恢復按鈕狀態
        const autoLocateBtn = document.getElementById('autoLocateBtn');
        autoLocateBtn.disabled = false;
        autoLocateBtn.textContent = '自動獲取當前位置';
    }
}

// 更新表單數據的函數
function updateFormWithWeatherData(data) {
    try {
        const townData = data.town;
        const forecast = townData.forecast72hr;

        // 獲取最新的溫度數據
        if (forecast.Temperature?.Time?.[0]) {
            document.getElementById('temperature').value = 
                `${forecast.Temperature.Time[0].Temperature} °C`;
        }

        // 獲取最新的舒適度指數
        if (forecast.ComfortIndex?.Time?.[0]) {
            const comfortData = forecast.ComfortIndex.Time[0];
            document.getElementById('humidity').value = 
                `${comfortData.ComfortIndex} (${comfortData.ComfortIndexDescription})`;
        }

        // 獲取最新的風速
        if (forecast.WindSpeed?.Time?.[0]) {
            const windData = forecast.WindSpeed.Time[0];
            document.getElementById('windSpeed').value = 
                `${windData.WindSpeed} m/s (蒲福風級: ${windData.BeaufortScale})`;
        }

        // 獲取降雨機率
        if (forecast.ProbabilityOfPrecipitation?.Time?.[0]) {
            document.getElementById('rainfall').value = 
                `${forecast.ProbabilityOfPrecipitation.Time[0].ProbabilityOfPrecipitation}%`;
        }

        // 更新天氣描述
        if (forecast.WeatherDescription?.Time?.[0]) {
            const weatherDesc = document.getElementById('weatherDescription');
            if (weatherDesc) {
                weatherDesc.textContent = forecast.WeatherDescription.Time[0].WeatherDescription;
            }
        }

        // 更新資料來源資訊
        const timestamp = new Date().toLocaleString('zh-TW', { 
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        document.getElementById('dataSource').textContent = 
            `資料來源: ${townData.ctyName}${townData.townName} (更新時間: ${timestamp})`;

    } catch (error) {
        console.error('更新表單時發生錯誤:', error);
        alert('更新資料時發生錯誤');
    }
}
