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
    document.getElementById('currentDate').value = new Date().toISOString().split('T')[0];
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
function bindEventListeners() {
    const parameterInputs = document.querySelectorAll('input, select');
    parameterInputs.forEach(input => {
        input.addEventListener('change', onParameterChange);
        input.addEventListener('input', onParameterInput);
    });
    
    document.getElementById('growthStage').addEventListener('change', onGrowthStageChange);
    document.getElementById('soilType').addEventListener('change', onSoilTypeChange);
    document.getElementById('irrigationSystem').addEventListener('change', onIrrigationSystemChange);
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
 * 生育期變更處理
 */
function onGrowthStageChange(event) {
    const stage = event.target.value;
    const stageInfo = GROWTH_STAGE_PARAMETERS[stage];
    showParameterInfo('生育期資訊', stageInfo.description);
}

/**
 * 土壤類型變更處理
 */
function onSoilTypeChange(event) {
    const soilType = event.target.value;
    const soilInfo = SOIL_TYPE_PARAMETERS[soilType];
    showParameterInfo('土壤類型資訊', soilInfo.description);
}

/**
 * 灌溉系統變更處理
 */
function onIrrigationSystemChange(event) {
    const system = event.target.value;
    const systemInfo = IRRIGATION_SYSTEM_PARAMETERS[system];
    showParameterInfo('灌溉系統資訊', systemInfo.description);
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
    // 更新主要結果卡片
    document.getElementById('irrigationAmount').textContent = 
        `${results.irrigationAmount.toFixed(1)} L/株`;
    
    document.getElementById('irrigationTime').textContent = 
        `${Math.round(results.irrigationTime)} 分鐘`;
    
    document.getElementById('nextIrrigation').textContent = 
        `${results.nextIrrigation} 天後`;

    // 添加動畫效果
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

/**
 * 更新水分平衡圖表
 */
function updateWaterBalanceChart(results) {
    const chartContainer = document.getElementById('waterBalanceChart');
    
    // 清除現有內容
    chartContainer.innerHTML = '<canvas id="waterChart" width="400" height="200"></canvas>';
    
    const ctx = document.getElementById('waterChart').getContext('2d');
    
    const chartData = {
        labels: ['田間容水量', '目前含水量', '凋萎點', '建議灌溉量'],
        datasets: [{
            label: '水分狀況 (mm)',
            data: [
                results.waterBalance.fieldCapacity,
                results.waterBalance.currentWater,
                results.waterBalance.wiltingPoint,
                results.irrigationAmount * 0.4 // 概估轉換
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

    new Chart(ctx, {
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
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '水分含量 (mm)'
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

    // 設定預設值
    setDefaultValues();

    // 清除結果顯示
    clearResults();

    // 顯示重置訊息
    showSuccessMessage('參數已重置為預設值');
}

/**
 * 清除結果
 */
function clearResults() {
    document.getElementById('irrigationAmount').textContent = '-- L/株';
    document.getElementById('irrigationTime').textContent = '-- 分鐘';
    document.getElementById('nextIrrigation').textContent = '-- 天後';

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

    document.getElementById('waterBalanceChart').innerHTML = `
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
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '9999';
    
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
        { id: 'growthStage', text: '不同生育期的需水量不同' },
        { id: 'plantAge', text: '樹齡影響根系深度和需水量' },
        { id: 'soilType', text: '土壤類型決定保水和排水特性' },
        { id: 'irrigationSystem', text: '不同灌溉系統的效率不同' }
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
            if (element) {
                element.value = parameters[key];
            }
        });
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

    // 根據參數ID和數值找出對應的描述和建議
    if (parameterRanges[id]) {
        const range = parameterRanges[id].find(r => value > r.min && value <= r.max);
        if (range) {
            description = range.description;
            suggestion = range.suggestion;
        }
    }

    // 更新UI顯示
    updateParameterUI(element, description, suggestion);
}

/**
 * 更新參數UI顯示
 * @param {HTMLElement} element - 參數輸入元素
 * @param {string} description - 參數描述
 * @param {string} suggestion - 建議措施
 */
function updateParameterUI(element, description, suggestion) {
    // 找到或創建描述容器
    let descContainer = document.getElementById(`${element.id}-description`);
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
