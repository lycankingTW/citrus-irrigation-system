/**
 * 農民簡易版：把日常選項轉成既有的逐日水分收支參數。
 */
const ORCHARD_STORAGE_KEY = 'citrus_farmer_orchard_v1';

const SOIL_CHOICES = {
    sand: '砂土',
    sandyLoam: '砂壤土',
    loam: '壤土',
    siltLoam: '坋壤土',
    clayLoam: '黏壤土',
    siltClay: '坋黏土',
    clay: '黏土'
};

const ROOT_DEPTH = {
    shallow: 40,
    normal: 60,
    deep: 90
};

const RAIN_MM = {
    none: 0,
    trace: 2,
    light: 10
};

const MOISTURE_FACTOR = {
    wet: 0.2,
    dry: 0.55,
    veryDry: 0.75
};

let stationReading = null;

const STAGE_SENTENCE = {
    '萌芽前': '還沒萌芽，需水比較少。',
    '春梢萌發': '春梢正在長，不要讓土乾太久。',
    '枝梢旺盛': '枝梢長得快，注意土不要乾透。',
    '果實膨大至轉色': '果實正在長大，這段比較不能缺水。',
    '成熟': '果實接近採收，可以稍為控水，但不要乾到缺水。'
};

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('farmerForm');
    showToday();
    bindChoices();
    bindStepper();
    document.getElementById('treeAge').addEventListener('input', updateYoungQuestion);
    form.addEventListener('submit', onSubmit);
    document.getElementById('locateStation').addEventListener('click', function() {
        loadStationFromHere();
    });
    document.getElementById('miaoliStation').addEventListener('click', function() {
        const place = CONFIG.TARGET_LOCATION;
        loadStation(place.lat, place.lng, place.name);
    });
    document.getElementById('againButton').addEventListener('click', function() {
        document.getElementById('result').hidden = true;
        form.scrollIntoView({ behavior: 'smooth' });
    });
    loadOrchard();
    updateYoungQuestion();
    updateStageHint();
});

function showToday() {
    const today = window.irrigationFormula.localDateISO();
    const parts = today.split('-');
    document.getElementById('todayLabel').textContent =
        '今天是 ' + parts[0] + '年' + Number(parts[1]) + '月' + Number(parts[2]) + '日';
}

function updateStageHint() {
    const hint = document.getElementById('stageHint');
    const mode = selectedValue('stage', 'auto');
    if (mode === 'auto') {
        const name = window.irrigationFormula.stageOnDate(window.irrigationFormula.localDateISO());
        hint.textContent = '依今天判斷，現在是' + name + '。如果園裡不是這個時期，請自己選。';
        return;
    }
    const notes = {
        prebud: '你選了萌芽前，這段需水少。',
        spring: '你選了春梢萌發。',
        shoot: '你選了枝梢旺盛，水要跟上。',
        fruit: '你選了果實膨大，這段最需要水。',
        mature: '你選了接近採收，可以稍為控水。'
    };
    hint.textContent = notes[mode] || '';
}

function bindChoices() {
    document.querySelectorAll('.choice').forEach(function(button) {
        button.addEventListener('click', function() {
            const group = button.dataset.group;
            document.querySelectorAll('.choice[data-group="' + group + '"]').forEach(function(item) {
                item.classList.remove('is-selected');
                item.setAttribute('aria-pressed', 'false');
            });
            button.classList.add('is-selected');
            button.setAttribute('aria-pressed', 'true');
            if (group === 'density') {
                document.getElementById('densityCustomWrap').classList.toggle('hidden', button.dataset.value !== 'custom');
            }
            if (group === 'rain') {
                document.getElementById('rainCustomWrap').classList.toggle('hidden', button.dataset.value !== 'custom');
            }
            if (group === 'stage') {
                updateStageHint();
            }
        });
    });
}

function bindStepper() {
    document.querySelectorAll('.stepper button').forEach(function(button) {
        button.addEventListener('click', function() {
            const input = document.getElementById(button.dataset.target);
            const step = Number(button.dataset.step);
            const next = Math.min(Number(input.max), Math.max(Number(input.min), Number(input.value) + step));
            input.value = String(next);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
    });
}

function updateYoungQuestion() {
    const age = Number(document.getElementById('treeAge').value);
    document.getElementById('youngDensity').classList.toggle('hidden', !(age < 10));
}

function selectedValue(group, fallback) {
    const selected = document.querySelector('.choice[data-group="' + group + '"].is-selected');
    return selected ? selected.dataset.value : fallback;
}

function selectChoice(group, value) {
    const button = document.querySelector('.choice[data-group="' + group + '"][data-value="' + value + '"]');
    if (button) {
        button.click();
    }
}

function orchardProfile() {
    return {
        age: Number(document.getElementById('treeAge').value),
        density: selectedValue('density', '400'),
        densityCustom: document.getElementById('densityCustom').value,
        youngSpacing: selectedValue('youngSpacing', 'sparse'),
        soil: selectedValue('soil', 'loam'),
        root: selectedValue('root', 'normal'),
        situation: selectedValue('situation', 'general'),
        system: selectedValue('system', 'drip'),
        stage: selectedValue('stage', 'auto')
    };
}

function saveOrchard() {
    try {
        localStorage.setItem(ORCHARD_STORAGE_KEY, JSON.stringify(orchardProfile()));
    } catch (error) {
        console.warn('無法記住果園設定', error);
    }
}

function loadOrchard() {
    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem(ORCHARD_STORAGE_KEY) || 'null');
    } catch (error) {
        saved = null;
    }
    if (!saved) {
        return;
    }
    if (saved.age) {
        document.getElementById('treeAge').value = saved.age;
    }
    if (saved.density) {
        selectChoice('density', saved.density);
    }
    if (saved.densityCustom) {
        document.getElementById('densityCustom').value = saved.densityCustom;
    }
    if (saved.youngSpacing) {
        selectChoice('youngSpacing', saved.youngSpacing);
    }
    if (saved.soil) {
        selectChoice('soil', saved.soil);
    }
    if (saved.root) {
        selectChoice('root', saved.root);
    }
    if (saved.situation) {
        selectChoice('situation', saved.situation);
    }
    if (saved.system) {
        selectChoice('system', saved.system);
    }
    if (saved.stage) {
        selectChoice('stage', saved.stage);
    }
    document.getElementById('savedNote').hidden = false;
}

function plantDensity() {
    const choice = selectedValue('density', '400');
    if (choice === 'custom') {
        const custom = Number(document.getElementById('densityCustom').value);
        return custom >= 100 ? custom : 400;
    }
    return Number(choice);
}

function rainfallMm() {
    const choice = selectedValue('rain', 'none');
    if (choice === 'station' && stationReading) {
        return stationReading.rain;
    }
    if (choice === 'custom') {
        const custom = Number(document.getElementById('rainCustom').value);
        return custom >= 0 ? custom : 0;
    }
    return RAIN_MM[choice] || 0;
}

function usingStationRain() {
    return selectedValue('rain', 'none') === 'station' && !!stationReading;
}

function loadStationFromHere() {
    const status = document.getElementById('stationStatus');
    if (!navigator.geolocation) {
        status.textContent = '這個瀏覽器不能定位。可以改用苗栗農改場附近的測站。';
        return;
    }
    setStationBusy(true);
    status.textContent = '正在取得你的位置…';
    navigator.geolocation.getCurrentPosition(function(position) {
        loadStation(position.coords.latitude, position.coords.longitude, '你的位置');
    }, function() {
        setStationBusy(false);
        status.textContent = '沒有拿到位置。請允許定位，或改用苗栗農改場附近的測站。';
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}

async function loadStation(latitude, longitude, placeName) {
    const status = document.getElementById('stationStatus');
    setStationBusy(true);
    status.textContent = '正在讀取農業氣象站…';
    try {
        const station = await nearestStation(latitude, longitude);
        stationReading = station;
        showStation(station, placeName);
        document.getElementById('stationRainLabel').textContent = station.rain.toFixed(1) + ' 毫米';
        document.getElementById('stationRainChoice').classList.remove('hidden');
        selectChoice('rain', 'station');
        status.textContent = '已用測站的 24 小時雨量。若和園裡不一樣，可改選下面的雨量。';
    } catch (error) {
        stationReading = null;
        document.getElementById('stationCard').classList.add('hidden');
        status.textContent = '氣象站暫時讀不到，請改選下面的雨量。' + (error && error.message ? '（' + error.message + '）' : '');
    } finally {
        setStationBusy(false);
    }
}

function setStationBusy(busy) {
    document.getElementById('locateStation').disabled = busy;
    document.getElementById('miaoliStation').disabled = busy;
}

async function nearestStation(latitude, longitude) {
    const controller = new AbortController();
    const timer = setTimeout(function() { controller.abort(); }, 12000);
    try {
        const response = await fetch(AgriWeatherAPI.buildApiUrl(), {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) {
            throw new Error('連線失敗');
        }
        const payload = await response.json();
        const stations = AgriWeatherAPI.processApiResponse(payload);
        const ranked = stations.map(function(station) {
            const lat = parseFloat(station.Station_Latitude || station.lat || station.latitude);
            const lon = parseFloat(station.Station_Longitude || station.lon || station.longitude);
            return {
                station: station,
                distance: Number.isFinite(lat) && Number.isFinite(lon)
                    ? calculateDistance(latitude, longitude, lat, lon)
                    : Number.POSITIVE_INFINITY
            };
        }).filter(function(item) {
            return item.distance < 500;
        }).sort(function(a, b) {
            return a.distance - b.distance;
        });
        if (!ranked.length) {
            throw new Error('附近沒有測站');
        }
        return normalizeStation(ranked[0].station, ranked[0].distance);
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('等候逾時');
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

function normalizeStation(station, distance) {
    const rain = parseFloat(station.H_24R);
    const temp = parseFloat(station.TEMP);
    const humidity = parseFloat(station.HUMD);
    const wind = parseFloat(station.WDSD);
    return {
        name: station.Station_name || station.name || '農業氣象站',
        rain: Number.isFinite(rain) ? rain : 0,
        temp: Number.isFinite(temp) ? temp : null,
        humidity: Number.isFinite(humidity) ? humidity : null,
        wind: Number.isFinite(wind) ? wind : null,
        time: station.TIME || '',
        distance: distance
    };
}

function showStation(station, placeName) {
    const card = document.getElementById('stationCard');
    const distanceText = Number.isFinite(station.distance)
        ? '，距離' + placeName + ' ' + station.distance.toFixed(1) + ' 公里'
        : '';
    card.classList.remove('hidden');
    card.innerHTML = [
        '<strong>' + escapeHtml(station.name) + '測站' + escapeHtml(distanceText) + '</strong>',
        '<div>24 小時雨量 ' + station.rain.toFixed(1) + ' 毫米</div>',
        station.temp === null ? '' : '<div>氣溫 ' + station.temp.toFixed(1) + ' 度</div>',
        station.humidity === null ? '' : '<div>相對濕度 ' + Math.round(station.humidity) + '%</div>',
        station.wind === null ? '' : '<div>風速 ' + station.wind.toFixed(1) + ' 公尺／秒</div>',
        station.time ? '<div>更新時間 ' + escapeHtml(station.time) + '</div>' : ''
    ].join('');
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function(character) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character];
    });
}

function weatherAdvice(parameters) {
    if (!stationReading) {
        return '';
    }
    const used = usingStationRain();
    let text = '參考' + stationReading.name + '測站';
    if (stationReading.temp !== null) {
        text += '，氣溫 ' + stationReading.temp.toFixed(1) + ' 度';
    }
    if (stationReading.humidity !== null) {
        text += '，濕度 ' + Math.round(stationReading.humidity) + '%';
    }
    text += '。';
    if (used) {
        text += '24 小時雨量 ' + stationReading.rain.toFixed(1) + ' 毫米已算進今天的判斷。';
    } else {
        text += '這次改用你選的雨量 ' + parameters.rainfall.toFixed(1) + ' 毫米，測站是 ' + stationReading.rain.toFixed(1) + ' 毫米。';
    }
    if (stationReading.temp !== null && stationReading.temp >= 33) {
        text += '今天很熱，灌水避開中午。';
    }
    if (stationReading.wind !== null && stationReading.wind >= 8) {
        text += '風比較大，灌完看土有沒有濕到。';
    }
    return text;
}

function buildParameters() {
    const age = Math.min(50, Math.max(1, Number(document.getElementById('treeAge').value) || 8));
    const soil = selectedValue('soil', 'loam');
    const depth = ROOT_DEPTH[selectedValue('root', 'normal')];
    const situation = selectedValue('situation', 'general');
    const preset = MANAGEMENT_PRESETS[situation] || MANAGEMENT_PRESETS.general;
    const systemKey = selectedValue('system', 'drip');
    const system = IRRIGATION_SYSTEM_PARAMETERS[systemKey];
    const moisture = selectedValue('moisture', 'normal');
    const fc = window.irrigationFormula.fieldCapacity(soil, depth);
    const useDefaultDeficit = moisture === 'normal';
    const initialDeficit = useDefaultDeficit ? fc * preset.d : fc * MOISTURE_FACTOR[moisture];
    const youngSpacing = selectedValue('youngSpacing', 'sparse');
    return {
        currentDate: window.irrigationFormula.localDateISO(),
        stageMode: selectedValue('stage', 'auto'),
        plantAge: age,
        plantDensity: plantDensity(),
        densityLevel: youngSpacing === 'dense' ? 'high' : 'low',
        soilType: soil,
        soilDepth: depth,
        cValue: preset.c,
        dValue: preset.d,
        useDefaultDeficit: useDefaultDeficit,
        initialDeficit: initialDeficit,
        rainfall: rainfallMm(),
        irrigationSystem: systemKey,
        systemEfficiency: system.efficiency * 100,
        emitterPosition: system.defaultPosition,
        canopyInterception: system.defaultPosition === 'above' ? INTERCEPTION.aboveCanopy : INTERCEPTION.belowCanopyDefault,
        irrigationDepth: CALCULATION_CONSTANTS.DEFAULT_IRRIGATION_DEPTH
    };
}

function onSubmit(event) {
    event.preventDefault();
    const parameters = buildParameters();
    const results = window.irrigationCalculator.calculate(parameters);
    renderResult(results, parameters);
    saveOrchard();
    document.getElementById('result').hidden = false;
    document.getElementById('detailBox').hidden = false;
    document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function waterPerFen(litersPerPlant, plantDensity) {
    const fenSquareMeters = 293.4 / 0.3025;
    const treesPerFen = plantDensity * (fenSquareMeters / 10000);
    const tonsPerFen = litersPerPlant * treesPerFen / 1000;
    return { treesPerFen: treesPerFen, tonsPerFen: tonsPerFen };
}

function renderResult(results, parameters) {
    const box = document.getElementById('result');
    const liters = Math.round(results.irrigationLiters || 0);
    const fen = waterPerFen(results.irrigationLiters || 0, parameters.plantDensity);
    const treesText = Math.round(fen.treesPerFen);
    const tonsText = fen.tonsPerFen.toFixed(1);
    const stage = results.kcStage;
    const stageText = STAGE_SENTENCE[stage] || '';
    const systemName = IRRIGATION_SYSTEM_PARAMETERS[parameters.irrigationSystem].name;
    let title;
    let body;
    if (results.irrigated) {
        title = '今天要灌';
        body = systemName + '每株大約灌 ' + liters + ' 公升。一分地大約 ' + treesText + ' 株，共 ' + tonsText + ' 噸。';
        if (results.soilDeficit > results.ram) {
            body += '灌完土還是偏乾，明天再算一次。';
        }
    } else {
        title = '今天先不用灌';
        body = '土裡的水還沒少到需要灌的程度，所以一分地是 0 噸。';
        if (results.daysUntilNext) {
            body += '如果後面沒下雨，大約 ' + results.daysUntilNext + ' 天後再來看。';
        }
    }
    box.className = 'result ' + (results.irrigated ? 'need' : 'ok');
    box.innerHTML = [
        '<h2>' + title + '</h2>',
        results.irrigated ? '<p class="liters">' + liters + ' <span>公升／株</span></p>' : '',
        '<p class="liters">' + tonsText + ' <span>噸／分地</span></p>',
        '<p class="say">' + body + '</p>',
        '<p class="say">現在是' + stage + '。' + stageText + '</p>',
        '<p class="say">同樣把 10 毫米的水送進土裡：滴灌最省，微噴居中，噴灌最耗水。</p>',
        weatherAdvice(parameters) ? '<p class="say">' + escapeHtml(weatherAdvice(parameters)) + '</p>' : ''
    ].join('');

    document.getElementById('detailList').innerHTML = [
        '<li>土壤：' + SOIL_CHOICES[parameters.soilType] + '，根大約 ' + parameters.soilDepth + ' 公分。</li>',
        '<li>今天雨量用 ' + parameters.rainfall.toFixed(1) + ' 毫米' + (usingStationRain() ? '（' + escapeHtml(stationReading.name) + '測站）' : '') + '，有效雨量 ' + results.pe.toFixed(1) + ' 毫米。作物大約耗水 ' + results.etc.toFixed(1) + ' 毫米。</li>',
        '<li>土裡已少的水 ' + results.deficitBefore.toFixed(1) + ' 毫米，超過 ' + results.ram.toFixed(1) + ' 毫米才需要灌。</li>',
        '<li>每株約 ' + liters + ' 公升。一分地約 ' + treesText + ' 株，共 ' + tonsText + ' 噸。</li>'
    ].join('');
}
