/**
 * 柑橘園智能灌溉計算系統 - UI處理模組
 * 開發者: 林鈺荏
 * 機構: 苗栗區農業改良場
 */

/**
 * 初始化表單
 */
function initializeForm() {
    setDefaultValues();
    bindEventListeners();
    const dateInput = document.getElementById('currentDate');
    if (dateInput && !dateInput.value && window.irrigationFormula) {
        dateInput.value = window.irrigationFormula.localDateISO();
    }
    refreshDerivedInputs();
    initializeTooltips();
    console.log('表單初始化完成');
}

/**
 * 設定預設值
 */
function setDefaultValues() {
    const defaults = DEFAULT_PARAMETERS;
    Object.keys(defaults).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            element.value = defaults[key];
        }
    });
}

/**
 * 綁定事件監聽器
 */
let applyingManagementPreset = false;

function bindEventListeners() {
    const parameterInputs = document.querySelectorAll('input, select');
    parameterInputs.forEach(input => {
        input.addEventListener('change', onParameterChange);
        input.addEventListener('input', onParameterInput);
    });

    document.getElementById('soilType').addEventListener('change', onSoilTypeChange);
    document.getElementById('irrigationSystem').addEventListener('change', onIrrigationSystemChange);
    document.getElementById('managementGoal').addEventListener('change', onManagementGoalChange);
    document.getElementById('emitterPosition').addEventListener('change', onEmitterPositionChange);
    document.getElementById('useDefaultDeficit').addEventListener('change', refreshDerivedInputs);
    document.getElementById('chart-tab').addEventListener('shown.bs.tab', () => {
        if (latestWaterBalance) {
            renderWaterBalanceChart(latestWaterBalance);
        }
    });
    ['soilDepth', 'cValue', 'dValue', 'plantAge', 'currentDate'].forEach(id => {
        const element = document.getElementById(id);
        element.addEventListener('input', refreshDerivedInputs);
        element.addEventListener('change', refreshDerivedInputs);
    });
    document.getElementById('cValue').addEventListener('input', markManagementCustom);
    document.getElementById('dValue').addEventListener('input', markManagementCustom);
}

/**
 * 參數變更處理
 */
function onParameterChange(event) {
    const element = event.target;
    validateInput(element);
    updateParameterDescription(element);
}

/**
 * 參數輸入處理
 */
function onParameterInput(event) {
    const element = event.target;
    if (element.type === 'number' || element.type === 'range') {
        validateNumericInput(element);
    }
}

/**
 * 土壤類型變更處理
 */
function onSoilTypeChange(event) {
    const soilInfo = SOIL_TYPE_PARAMETERS[event.target.value];
    if (soilInfo) {
        showParameterInfo('土壤質地', soilInfo.description);
    }
    refreshDerivedInputs();
}

/**
 * 灌溉系統變更處理
 */
function onIrrigationSystemChange(event) {
    const systemInfo = IRRIGATION_SYSTEM_PARAMETERS[event.target.value];
    if (!systemInfo) {
        return;
    }
    const efficiency = document.getElementById('systemEfficiency');
    efficiency.min = systemInfo.efficiencyMin * 100;
    efficiency.max = systemInfo.efficiencyMax * 100;
    efficiency.value = systemInfo.efficiency * 100;
    document.getElementById('emitterPosition').value = systemInfo.defaultPosition;
    applyEmitterInterception();
    showParameterInfo('灌溉系統', systemInfo.description);
}

function onManagementGoalChange() {
    const preset = MANAGEMENT_PRESETS[document.getElementById('managementGoal').value];
    if (!preset) {
        return;
    }
    applyingManagementPreset = true;
    document.getElementById('cValue').value = preset.c.toFixed(2);
    document.getElementById('dValue').value = preset.d.toFixed(2);
    applyingManagementPreset = false;
    refreshDerivedInputs();
}

function markManagementCustom() {
    if (!applyingManagementPreset) {
        document.getElementById('managementGoal').value = 'custom';
    }
}

function onEmitterPositionChange() {
    applyEmitterInterception(true);
}

function applyEmitterInterception(resetBelow) {
    const position = document.getElementById('emitterPosition').value;
    const interception = document.getElementById('canopyInterception');
    if (position === 'above') {
        interception.value = INTERCEPTION.aboveCanopy;
        interception.readOnly = true;
        interception.min = INTERCEPTION.aboveCanopy;
        interception.max = INTERCEPTION.aboveCanopy;
        return;
    }
    interception.readOnly = false;
    interception.min = INTERCEPTION.belowCanopyMin;
    interception.max = INTERCEPTION.belowCanopyMax;
    const current = parseFloat(interception.value);
    if (resetBelow || !Number.isFinite(current) || current < 0.5 || current > 1) {
        interception.value = INTERCEPTION.belowCanopyDefault;
    }
}

function describeCoefficient(value) {
    let nearest = CD_TENSION_TABLE[0];
    CD_TENSION_TABLE.forEach(row => {
        if (Math.abs(row.value - value) < Math.abs(nearest.value - value)) {
            nearest = row;
        }
    });
    return `最接近 ${nearest.value.toFixed(2)}：${nearest.description}（約 ${nearest.tension} kPa）`;
}

function refreshDerivedInputs() {
    if (!window.irrigationFormula) {
        return;
    }
    const soilType = document.getElementById('soilType').value;
    const depth = parseFloat(document.getElementById('soilDepth').value);
    const d = parseFloat(document.getElementById('dValue').value);
    const c = parseFloat(document.getElementById('cValue').value);
    const age = parseFloat(document.getElementById('plantAge').value);
    const fcHint = document.getElementById('fieldCapacityHint');
    if (Number.isFinite(depth)) {
        const fc = window.irrigationFormula.fieldCapacity(soilType, depth);
        fcHint.textContent = `根層田間容水量 Fc = ${fc.toFixed(1)} mm`;
        const deficit = document.getElementById('initialDeficit');
        const useDefault = document.getElementById('useDefaultDeficit');
        if (useDefault.checked && Number.isFinite(d)) {
            deficit.value = (fc * d).toFixed(1);
            deficit.readOnly = true;
        } else {
            deficit.readOnly = false;
        }
    }
    document.getElementById('cValueHint').textContent = Number.isFinite(c)
        ? `著果及果實發育期使用。${describeCoefficient(c)}`
        : '著果及果實發育期使用';
    document.getElementById('dValueHint').textContent = Number.isFinite(d)
        ? `花芽分化、春梢與轉色採收期使用。${describeCoefficient(d)}`
        : '花芽分化、春梢與轉色採收期使用';

    const densityLevel = document.getElementById('densityLevel');
    const densityGroup = document.getElementById('densityLevelGroup');
    const applies = Number.isFinite(age) && age < 10;
    densityLevel.disabled = !applies;
    densityGroup.style.opacity = applies ? '1' : '0.55';

    const dateValue = document.getElementById('currentDate').value;
    if (dateValue) {
        document.getElementById('stageHint').textContent = window.irrigationFormula.describeDate(dateValue);
    }
}

/**
 * 輸入驗證
 */
function validateInput(element) {
    const value = parseFloat(element.value);
    const id = element.id;
    let isValid = true;
    let message = '';

    switch (id) {
        case 'temperature':
            if (value < -10 || value > 50) {
                isValid = false;
                message = '溫度應在 -10°C 到 50°C 之間';
            }
            break;
        case 'humidity':
            if (value < 0 || value > 100) {
                isValid = false;
                message = '相對濕度應在 0% 到 100% 之間';
            }
            break;
        case 'windSpeed':
            if (value < 0 || value > 20) {
                isValid = false;
                message = '風速應在 0 到 20 m/s 之間';
            }
            break;
        case 'currentMoisture':
            if (value < 0 || value > 100) {
                isValid = false;
                message = '土壤含水量應在 0% 到 100% 之間';
            }
            break;
    }

    updateInputValidation(element, isValid, message);
    return isValid;
}

/**
 * 數值輸入驗證
 */
function validateNumericInput(element) {
    const value = element.value;
    if (value !== '' && isNaN(parseFloat(value))) {
        element.classList.add('is-invalid');
        showInputError(element, '請輸入有效的數值');
    } else {
        element.classList.remove('is-invalid');
        hideInputError(element);
    }
}

/**
 * 更新輸入驗證狀態
 */
function updateInputValidation(element, isValid, message) {
    if (isValid) {
        element.classList.remove('is-invalid');
        element.classList.add('is-valid');
        hideInputError(element);
    } else {
        element.classList.remove('is-valid');
        element.classList.add('is-invalid');
        showInputError(element, message);
    }
}

/**
 * 顯示輸入錯誤
 */
function showInputError(element, message) {
    let errorDiv = element.parentNode.querySelector('.invalid-feedback');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        element.parentNode.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
}

/**
 * 隱藏輸入錯誤
 */
function hideInputError(element) {
    const errorDiv = element.parentNode.querySelector('.invalid-feedback');
    if (errorDiv) {
        errorDiv.remove();
    }
}

/**
 * 更新結果顯示
 */
function updateResultsDisplay(results) {
    document.getElementById('irrigationAmount').textContent =
        `${results.irrigationDepth.toFixed(1)} mm`;
    document.getElementById('irrigationLiters').textContent = results.irrigated
        ? `約 ${results.irrigationLiters.toFixed(1)} L/株`
        : '今日不需灌溉';

    document.getElementById('soilDeficit').textContent =
        `${results.soilDeficit.toFixed(1)} mm`;
    document.getElementById('deficitNote').textContent = results.irrigated
        ? `灌溉前 ${results.deficitBefore.toFixed(1)} mm`
        : '今日未灌溉';

    document.getElementById('ramLimit').textContent =
        `${results.ram.toFixed(1)} mm`;
    document.getElementById('nextIrrigation').textContent = results.irrigated
        ? '已超過，建議今天灌'
        : `若無降雨，${results.nextIrrigation}`;

    const summary = document.getElementById('dailySummary');
    if (summary) {
        summary.className = 'alert alert-light border mb-4';
        summary.innerHTML = [
            `生育期 ${results.kcStage}`,
            `Kc ${results.kc.toFixed(3)}`,
            `ETo ${results.eto.toFixed(2)} mm`,
            `ETc ${results.etc.toFixed(2)} mm`,
            `Ks ${results.ks.toFixed(3)}`,
            `有效雨量 ${results.pe.toFixed(1)} mm`
        ].map((item) => `<span class="summary-chip">${item}</span>`).join('');
    }

    animateResultCards();
}

/**
 * 更新計算步驟顯示
 */
function updateCalculationStepsDisplay(steps) {
    const container = document.getElementById('calculationSteps');
    container.innerHTML = '';

    steps.forEach((step, index) => {
        const stepElement = createCalculationStepElement(step, index + 1);
        container.appendChild(stepElement);
    });

    // 添加滾動動畫
    container.scrollTop = 0;
    animateCalculationSteps();
}

/**
 * 創建計算步驟元素
 */
function createCalculationStepElement(step, stepNumber) {
    const div = document.createElement('div');
    div.className = 'calculation-step fade-in-up';
    div.style.animationDelay = `${stepNumber * 0.1}s`;

    div.innerHTML = `
        <h6><i class="fas fa-calculator"></i> 步驟 ${stepNumber}: ${step.title}</h6>
        <p>${step.description}</p>
        ${step.formula ? `<div class="formula">${step.formula}</div>` : ''}
        <small class="text-muted">
            <i class="fas fa-clock"></i> ${step.timestamp}
        </small>
    `;

    return div;
}

/**
 * 更新建議顯示
 */
function updateRecommendationsDisplay(recommendations) {
    const container = document.getElementById('managementAdvice');
    container.innerHTML = '';

    if (recommendations.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                目前沒有特殊管理建議
            </div>
        `;
        return;
    }

    recommendations.forEach((rec, index) => {
        const recElement = createRecommendationElement(rec, index);
        container.appendChild(recElement);
    });
}

/**
 * 創建建議元素
 */
function createRecommendationElement(recommendation, index) {
    const div = document.createElement('div');
    div.className = `advice-item ${recommendation.type} slide-in-right`;
    div.style.animationDelay = `${index * 0.2}s`;

    div.innerHTML = `
        <h6>
            <i class="${recommendation.icon}"></i>
            ${recommendation.title}
        </h6>
        <p>${recommendation.message}</p>
    `;

    return div;
}

let latestWaterBalance = null;
let waterChartInstance = null;

/**
 * 更新水分平衡圖表。分頁隱藏時畫布尺寸為 0，等分頁顯示後再畫一次。
 */
function updateWaterBalanceChart(results) {
    latestWaterBalance = results;
    renderWaterBalanceChart(results);
}

function renderWaterBalanceChart(results) {
    const chartContainer = document.getElementById('waterBalanceChart');
    if (waterChartInstance) {
        waterChartInstance.destroy();
        waterChartInstance = null;
    }
    chartContainer.innerHTML = '<canvas id="waterChart"></canvas>';
    chartContainer.style.height = '280px';
    chartContainer.style.width = '100%';
    const ctx = document.getElementById('waterChart').getContext('2d');
    
    const chartData = {
        labels: ['田間容水量 Fc', '耗水限值 RAM', '灌溉前耗水量', '建議灌溉量'],
        datasets: [{
            label: '水分 (mm)',
            data: [
                results.waterBalance.fieldCapacity,
                results.waterBalance.ram,
                results.waterBalance.deficitBefore,
                results.waterBalance.irrigation
            ],
            backgroundColor: [
                'rgba(76, 175, 80, 0.8)',
                'rgba(33, 150, 243, 0.8)',
                'rgba(255, 152, 0, 0.8)',
                'rgba(156, 39, 176, 0.8)'
            ],
            borderColor: [
                'rgba(76, 175, 80, 1)',
                'rgba(33, 150, 243, 1)',
                'rgba(255, 152, 0, 1)',
                'rgba(156, 39, 176, 1)'
            ],
            borderWidth: 2
        }]
    };

    waterChartInstance = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '土壤水分平衡分析'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 40,
                        minRotation: 0,
                        font: { size: window.innerWidth < 576 ? 11 : 12 }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '深度 (mm)'
                    },
                    ticks: {
                        font: { size: window.innerWidth < 576 ? 11 : 12 }
                    }
                }
            }
        }
    });
}

/**
 * 重置表單
 */
function resetForm() {
    // 重置所有輸入欄位
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.classList.remove('is-valid', 'is-invalid');
    });

    const useDefault = document.getElementById('useDefaultDeficit');
    if (useDefault) {
        useDefault.checked = true;
    }
    setDefaultValues();
    applyEmitterInterception(true);
    refreshDerivedInputs();

    // 清除結果顯示
    clearResults();

    // 顯示重置訊息
    showSuccessMessage('參數已重置為預設值');
}

/**
 * 清除結果
 */
function clearResults() {
    document.getElementById('irrigationAmount').textContent = '-- mm';
    document.getElementById('irrigationLiters').textContent = '--';
    document.getElementById('soilDeficit').textContent = '-- mm';
    document.getElementById('deficitNote').textContent = '灌溉後';
    document.getElementById('ramLimit').textContent = '-- mm';
    document.getElementById('nextIrrigation').textContent = '--';
    const summary = document.getElementById('dailySummary');
    if (summary) {
        summary.className = 'alert alert-light border mb-4';
        summary.textContent = '設定參數後按「開始計算」，這裡會顯示年積日、Kc、ETo 與有效雨量。';
    }

    document.getElementById('calculationSteps').innerHTML = `
        <div class="alert alert-info">
            <i class="fas fa-info-circle"></i>
            請設定參數並點擊「開始計算」來查看詳細結果
        </div>
    `;

    document.getElementById('managementAdvice').innerHTML = `
        <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i>
            管理建議將在計算完成後顯示
        </div>
    `;

    latestWaterBalance = null;
    if (waterChartInstance) {
        waterChartInstance.destroy();
        waterChartInstance = null;
    }
    const chartBox = document.getElementById('waterBalanceChart');
    chartBox.style.height = '';
    chartBox.innerHTML = `
        <div class="chart-placeholder">
            <i class="fas fa-chart-line fa-3x text-muted"></i>
            <p class="text-muted mt-2">計算完成後將顯示水分平衡圖表</p>
        </div>
    `;
}

/**
 * 顯示載入覆蓋層
 */
function showLoadingOverlay(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

/**
 * 隱藏載入覆蓋層
 */
function hideLoadingOverlay() {
    showLoadingOverlay(false);
}

/**
 * 顯示參數資訊
 */
function showParameterInfo(title, message) {
    // 可以使用 Bootstrap Toast 或自定義提示
    console.log(`${title}: ${message}`);
    
    // 簡單的提示實現
    const toast = createToast(title, message, 'info');
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * 創建提示訊息
 */
function createToast(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `app-toast toast align-items-center text-white bg-${type} border-0`;
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <strong>${title}</strong><br>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                    onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    return toast;
}

/**
 * 顯示成功訊息
 */
function showSuccessMessage(message) {
    const toast = createToast('成功', message, 'success');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

/**
 * 顯示錯誤訊息
 */
function showErrorMessage(message) {
    const toast = createToast('錯誤', message, 'danger');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

/**
 * 動畫效果
 */
function animateResultCards() {
    const cards = document.querySelectorAll('.result-card');
    cards.forEach((card, index) => {
        card.style.animation = 'none';
        setTimeout(() => {
            card.style.animation = 'fadeInUp 0.6s ease-out';
        }, index * 100);
    });
}

function animateCalculationSteps() {
    const steps = document.querySelectorAll('.calculation-step');
    steps.forEach((step, index) => {
        step.style.opacity = '0';
        setTimeout(() => {
            step.style.opacity = '1';
            step.classList.add('fade-in-up');
        }, index * 150);
    });
}

/**
 * 初始化工具提示
 */
function initializeTooltips() {
    // 為需要說明的元素添加工具提示
    const tooltipElements = [
        { id: 'plantAge', text: '樹齡決定 Kc 曲線的上下限' },
        { id: 'soilType', text: '質地係數乘上根深就是田間容水量' },
        { id: 'irrigationSystem', text: '系統決定效率範圍與預設截留量' },
        { id: 'cValue', text: '著果及果實發育期的耗水限值係數' }
    ];

    tooltipElements.forEach(item => {
        const element = document.getElementById(item.id);
        if (element) {
            element.setAttribute('data-tooltip', item.text);
            element.classList.add('tooltip-custom');
        }
    });
}

/**
 * 導出結果為 PDF（未來功能）
 */
function exportToPDF() {
    // TODO: 實現 PDF 導出功能
    showSuccessMessage('PDF 導出功能開發中...');
}

/**
 * 儲存參數設定
 */
function saveParameters() {
    const parameters = collectFormParameters();
    localStorage.setItem('citrus_irrigation_params', JSON.stringify(parameters));
    showSuccessMessage('參數設定已儲存');
}

/**
 * 載入參數設定
 */
function loadParameters() {
    const saved = localStorage.getItem('citrus_irrigation_params');
    if (saved) {
        const parameters = JSON.parse(saved);
        Object.keys(parameters).forEach(key => {
            const element = document.getElementById(key);
            if (!element) {
                return;
            }
            if (element.type === 'checkbox') {
                element.checked = Boolean(parameters[key]);
            } else {
                element.value = parameters[key];
            }
        });
        applyEmitterInterception(false);
        refreshDerivedInputs();
        showSuccessMessage('參數設定已載入');
    } else {
        showErrorMessage('沒有找到儲存的參數設定');
    }
}

/**
 * 更新參數描述和建議
 * @param {HTMLElement} element - 參數輸入元素
 */
function updateParameterDescription(element) {
    const value = parseFloat(element.value);
    const id = element.id;
    let description = '';
    let suggestion = '';

    // 參數範圍和建議對照表
    const parameterRanges = {
        temperature: [
            { min: -Infinity, max: 10, description: '溫度過低，柑橘生長受限', suggestion: '建議使用防寒措施，可考慮使用防寒布或溫室保護' },
            { min: 10, max: 15, description: '溫度偏低，生長緩慢', suggestion: '可考慮使用保溫設施，適度減少灌溉量' },
            { min: 15, max: 25, description: '適宜溫度範圍', suggestion: '維持正常灌溉計畫' },
            { min: 25, max: 30, description: '生長適溫', suggestion: '注意適度增加灌溉頻率' },
            { min: 30, max: 35, description: '溫度偏高', suggestion: '建議增加灌溉次數，可考慮遮蔭' },
            { min: 35, max: Infinity, description: '高溫逆境', suggestion: '需要採取降溫措施，增加灌溉頻率，使用遮蔭網' }
        ],
        humidity: [
            { min: 0, max: 30, description: '濕度過低', suggestion: '需要增加灌溉頻率，考慮使用噴霧系統' },
            { min: 30, max: 60, description: '適中濕度', suggestion: '維持正常灌溉管理' },
            { min: 60, max: 80, description: '濕度較高', suggestion: '注意控制灌溉量，預防病害發生' },
            { min: 80, max: 100, description: '濕度過高', suggestion: '減少灌溉量，加強通風，注意病害防治' }
        ],
        windSpeed: [
            { min: 0, max: 2, description: '微風', suggestion: '正常灌溉即可' },
            { min: 2, max: 5, description: '和風', suggestion: '可能需要略微增加灌溉量' },
            { min: 5, max: 8, description: '強風', suggestion: '建議增加灌溉量15-20%' },
            { min: 8, max: Infinity, description: '強風警告', suggestion: '大幅增加灌溉量，考慮使用防風措施' }
        ],
        currentMoisture: [
            { min: 0, max: 20, description: '土壤極度乾燥', suggestion: '立即進行灌溉' },
            { min: 20, max: 40, description: '土壤水分不足', suggestion: '需要進行灌溉' },
            { min: 40, max: 60, description: '土壤水分適中', suggestion: '維持現有灌溉計畫' },
            { min: 60, max: 80, description: '土壤水分充足', suggestion: '可暫緩灌溉' },
            { min: 80, max: 100, description: '土壤水分過高', suggestion: '停止灌溉，注意排水' }
        ],
        irrigationInterval: [
            { min: 0, max: 1, description: '每日灌溉', suggestion: '適用於幼苗或特殊天氣條件' },
            { min: 1, max: 3, description: '高頻率灌溉', suggestion: '適用於開花結果期' },
            { min: 3, max: 7, description: '中等頻率灌溉', suggestion: '適用於一般生長期' },
            { min: 7, max: Infinity, description: '低頻率灌溉', suggestion: '注意監測土壤水分' }
        ]
    };

    if (parameterRanges[id]) {
        const range = parameterRanges[id].find(r => value > r.min && value <= r.max);
        if (range) {
            description = range.description;
            suggestion = range.suggestion;
        }
    }

    updateParameterUI(element, description, suggestion);
}

/**
 * 更新參數UI顯示
 * @param {HTMLElement} element - 參數輸入元素
 * @param {string} description - 參數描述
 * @param {string} suggestion - 建議措施
 */
function updateParameterUI(element, description, suggestion) {
    let descContainer = document.getElementById(`${element.id}-description`);
    if (!description) {
        if (descContainer) {
            descContainer.remove();
        }
        return;
    }
    if (!descContainer) {
        descContainer = document.createElement('div');
        descContainer.id = `${element.id}-description`;
        descContainer.className = 'parameter-description mt-2 small';
        element.parentNode.appendChild(descContainer);
    }

    // 更新描述內容
    descContainer.innerHTML = `
        <div class="alert alert-info p-2 mb-0">
            <div><i class="fas fa-info-circle"></i> <strong>狀態：</strong>${description}</div>
            <div><i class="fas fa-lightbulb"></i> <strong>建議：</strong>${suggestion}</div>
        </div>
    `;

    // 添加淡入動畫效果
    descContainer.style.animation = 'fadeIn 0.3s ease-in-out';
}

// 添加必要的CSS樣式
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .parameter-description {
        transition: all 0.3s ease-in-out;
    }
`;
document.head.appendChild(style);
