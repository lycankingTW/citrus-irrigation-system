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

const STAGE_SENTENCE = {
    '萌芽前': '還沒萌芽，需水比較少。',
    '春梢萌發': '春梢正在長，不要讓土乾太久。',
    '枝梢旺盛': '枝梢長得快，注意土不要乾透。',
    '果實膨大至轉色': '果實正在長大，這段比較不能缺水。',
    '成熟': '果實接近採收，可以稍為控水，但不要乾到缺水。'
};

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('farmerForm');
    document.getElementById('currentDate').value = window.irrigationFormula.localDateISO();
    bindChoices();
    bindStepper();
    document.getElementById('treeAge').addEventListener('input', updateYoungQuestion);
    form.addEventListener('submit', onSubmit);
    document.getElementById('againButton').addEventListener('click', function() {
        document.getElementById('result').hidden = true;
        form.scrollIntoView({ behavior: 'smooth' });
    });
    loadOrchard();
    updateYoungQuestion();
});

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
        system: selectedValue('system', 'drip')
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
    if (choice === 'custom') {
        const custom = Number(document.getElementById('rainCustom').value);
        return custom >= 0 ? custom : 0;
    }
    return RAIN_MM[choice];
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
        currentDate: document.getElementById('currentDate').value || window.irrigationFormula.localDateISO(),
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

function renderResult(results, parameters) {
    const box = document.getElementById('result');
    const liters = Math.round(results.irrigationLiters);
    const stage = results.kcStage;
    const stageText = STAGE_SENTENCE[stage] || '';
    const systemName = IRRIGATION_SYSTEM_PARAMETERS[parameters.irrigationSystem].name;
    let title;
    let body;
    if (results.irrigated) {
        title = '今天要灌';
        body = systemName + '每株大約灌 ' + liters + ' 公升。';
        if (results.soilDeficit > results.ram) {
            body += '灌完土還是偏乾，明天再算一次。';
        }
    } else {
        title = '今天先不用灌';
        body = '土裡的水還沒少到需要灌的程度。';
        if (results.daysUntilNext) {
            body += '如果後面沒下雨，大約 ' + results.daysUntilNext + ' 天後再來看。';
        }
    }
    box.className = 'result ' + (results.irrigated ? 'need' : 'ok');
    box.innerHTML = [
        '<h2>' + title + '</h2>',
        results.irrigated ? '<p class="liters">' + liters + ' <span>公升／株</span></p>' : '',
        '<p class="say">' + body + '</p>',
        '<p class="say">現在是' + stage + '。' + stageText + '</p>'
    ].join('');

    document.getElementById('detailList').innerHTML = [
        '<li>土壤：' + SOIL_CHOICES[parameters.soilType] + '，根大約 ' + parameters.soilDepth + ' 公分。</li>',
        '<li>今天作物大約耗水 ' + results.etc.toFixed(1) + ' 毫米，有效雨量 ' + results.pe.toFixed(1) + ' 毫米。</li>',
        '<li>土裡已少的水 ' + results.deficitBefore.toFixed(1) + ' 毫米，超過 ' + results.ram.toFixed(1) + ' 毫米才需要灌。</li>',
        results.irrigated ? '<li>這次灌溉深度 ' + results.irrigationDepth.toFixed(1) + ' 毫米，換成每株約 ' + liters + ' 公升。</li>' : ''
    ].join('');
}
