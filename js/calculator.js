/**
 * 柑橘園智能灌溉計算系統 - 逐日水分收支
 * 依灌溉運算邏輯：每日 Kc、RAM、ETo、Ks、有效雨量與固定灌溉深度。
 * 節點之間的 Kc 與 c/d 使用線性內插，使曲線落在文件給出的數值範圍。
 */

console.log('Calculator.js 開始載入...');

if (typeof window.CITRUS_CALCULATOR_LOADED === 'undefined') {
    window.CITRUS_CALCULATOR_LOADED = true;

    function localDateISO(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function dayIndexFromDate(dateString) {
        const [year, month, day] = String(dateString).split('-').map(Number);
        if (!year || !month || !day) {
            return 0;
        }
        const date = new Date(year, month - 1, day);
        const start = new Date(year, 0, 1);
        const index = Math.round((date - start) / 86400000);
        return Math.min(366, Math.max(0, index));
    }

    function addDays(dateString, days) {
        const [year, month, day] = String(dateString).split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() + days);
        return localDateISO(date);
    }

    function interpolate(x, days, values) {
        if (x <= days[0]) {
            return values[0];
        }
        const last = days.length - 1;
        if (x >= days[last]) {
            return values[last];
        }
        for (let i = 0; i < last; i++) {
            if (x >= days[i] && x <= days[i + 1]) {
                const span = days[i + 1] - days[i];
                if (span === 0) {
                    return values[i + 1];
                }
                const ratio = (x - days[i]) / span;
                return values[i] + ratio * (values[i + 1] - values[i]);
            }
        }
        return values[last];
    }

    function stageName(x, stages) {
        let name = stages[0].name;
        stages.forEach(stage => {
            if (x >= stage.start && x <= stage.end) {
                name = stage.name;
            }
        });
        return name;
    }

    function kcLimits(age, densityLevel) {
        if (age < 10) {
            if (densityLevel === 'high') {
                return {
                    min: 0.4,
                    max: 0.75,
                    label: '樹齡未滿 10 年，種植密度較大（0.4–0.75）'
                };
            }
            return {
                min: 0.6,
                max: 0.8,
                label: '樹齡未滿 10 年，種植密度較小（0.6–0.8）'
            };
        }
        if (age >= 20) {
            return {
                min: 0.3,
                max: 1.35,
                label: '樹齡 20 年以上（0.3–1.35）'
            };
        }
        const max = 1 + ((age - 10) / 10) * 0.35;
        return {
            min: 0.3,
            max,
            label: `樹齡 ${formatNumber(age, 0)} 年，峰值由 10 年的 1.0 線性內插至 20 年的 1.35`
        };
    }

    function scaleKc(baseKc, limits) {
        const span = KC_CURVE.baseMax - KC_CURVE.baseMin;
        const ratio = (baseKc - KC_CURVE.baseMin) / span;
        return limits.min + ratio * (limits.max - limits.min);
    }

    function fieldCapacity(soilType, depthCm) {
        const soil = SOIL_TYPE_PARAMETERS[soilType] || SOIL_TYPE_PARAMETERS.loam;
        return soil.fcPerCm * depthCm;
    }

    function coefficientAt(x, c, d) {
        const values = RAM_CURVE.symbols.map(symbol => (symbol === 'c' ? c : d));
        return interpolate(x, RAM_CURVE.days, values);
    }

    function referenceEvapotranspiration(x) {
        const { a, b, h } = ETO_PARAMETERS;
        const exponent = a * x + b;
        const exponential = Math.exp(exponent);
        const Ux = exponential * a * h;
        const Vx = exponential + 1;
        return {
            eto: Ux / (Vx * Vx),
            Ux,
            Vx
        };
    }

    function formatNumber(value, digits) {
        return Number(value).toFixed(digits);
    }

    // 台灣地政：1 分地 = 293.4 坪，1 坪 = 1/0.3025 平方公尺。
    const FEN_SQUARE_METERS = 293.4 / 0.3025;

    function fenWaterTotals(litersPerPlant, plantDensity) {
        const treesPerFen = plantDensity * (FEN_SQUARE_METERS / 10000);
        const tonsPerFen = litersPerPlant * treesPerFen / 1000;
        return { treesPerFen, tonsPerFen };
    }

    class CitrusIrrigationCalculator {
        constructor() {
            this.calculationResults = {};
            this.calculationSteps = [];
        }

        calculate(parameters) {
            this.calculationSteps = [];
            const context = this.prepareContext(parameters);
            const day = this.evaluateDay(context.dayIndex, context.initialDeficit, context.rainfall, context);

            this.addCalculationStep(
                '年積日',
                `${context.currentDate} 為年積日 ${context.dayIndex}（1 月 1 日 = 0）。Kc 生育期：${day.kcStage}。耗水限值生育期：${day.ramStage}。`
            );
            this.addCalculationStep(
                '作物係數 Kc',
                `基礎曲線 Kc = ${formatNumber(day.baseKc, 3)}。${day.limits.label}，調整後 Kc = ${formatNumber(day.kc, 3)}。`,
                'Kc 在年積日節點間線性內插，再映射到樹齡與密度對應的範圍'
            );
            this.addCalculationStep(
                '根層田間容水量 Fc',
                `${day.soilName} × 根深 ${formatNumber(context.soilDepth, 0)} cm = ${formatNumber(day.fc, 1)} mm。`,
                'Fc = 質地係數（mm/cm）× 根深（cm）'
            );
            this.addCalculationStep(
                '耗水限值 RAM',
                `當日係數 = ${formatNumber(day.cd, 3)}（c = ${formatNumber(context.c, 2)}，d = ${formatNumber(context.d, 2)}），RAM = ${formatNumber(day.ram, 1)} mm。`,
                'RAM = Fc × 當日 c/d（節點之間線性過渡）'
            );
            this.addCalculationStep(
                '初始耗水量',
                `D[x-1] = ${formatNumber(context.initialDeficit, 1)} mm${context.usedDefaultDeficit ? '（預設 Fc×d）' : ''}。`
            );
            this.addCalculationStep(
                '參考蒸發散量 ETo',
                `ETo = ${formatNumber(day.eto, 2)} mm。Ux = ${formatNumber(day.Ux, 3)}，Vx = ${formatNumber(day.Vx, 3)}。`,
                'Ux = e^(ax+b) × a × h，Vx = e^(ax+b) + 1，ETo = Ux / Vx²，a=0.0133，b=-2.56，h=1600'
            );
            this.addCalculationStep(
                '水分逆境係數 Ks',
                `Ks = ${formatNumber(day.ks, 3)}（上限 1）。`,
                'Ks = (Fc − D[x-1]) / (Fc × 0.67)，若大於 1 則取 1'
            );
            this.addCalculationStep(
                '作物蒸發散量 ETc',
                `ETc = ${formatNumber(day.eto, 2)} × ${formatNumber(day.kc, 3)} × ${formatNumber(day.ks, 3)} = ${formatNumber(day.etc, 2)} mm。`,
                'ETc = ETo × Kc × Ks'
            );
            this.addCalculationStep(
                '有效雨量 Pe',
                `雨量 ${formatNumber(context.rainfall, 1)} mm，先扣植物截留 ${INTERCEPTION.rainfall} mm，再受限於土壤可吸納量，Pe = ${formatNumber(day.pe, 2)} mm。`,
                '雨量 ≤ 3 mm 時 Pe = 0；否則 Pe = min(雨量 − 3, D[x-1] + ETc)'
            );
            this.addCalculationStep(
                '灌溉前耗水量',
                `D = ${formatNumber(context.initialDeficit, 1)} + ${formatNumber(day.etc, 2)} − ${formatNumber(day.pe, 2)} = ${formatNumber(day.deficitBefore, 1)} mm。`,
                'D[x] = D[x-1] + ETc[x] − Pe'
            );

            if (day.irrigated) {
                this.addCalculationStep(
                    '建議灌溉',
                    `耗水量 ${formatNumber(day.deficitBefore, 1)} mm 大於 RAM ${formatNumber(day.ram, 1)} mm。I = ${formatNumber(context.irrigationDepth, 1)} × ${formatNumber(context.efficiency, 3)} − ${formatNumber(context.interception, 2)} = ${formatNumber(day.irrigation, 2)} mm。${context.efficiencyAdjusted ? '輸入的效率已調整到此系統的文件範圍。' : ''}`,
                    'I = uI × 灌溉效率 − 植物截留量 INi'
                );
                this.addCalculationStep(
                    '灌溉後水分平衡',
                    `D = ${formatNumber(day.deficit, 1)} mm。依 ${formatNumber(context.plantDensity, 0)} 株/公頃換算約 ${formatNumber(day.litersPerPlant, 1)} L/株，一分地約 ${formatNumber(day.treesPerFen, 0)} 株、${formatNumber(day.tonsPerFen, 1)} 噸。`,
                    'D[x] = D[x-1] + ETc[x] − Pe − I'
                );
            } else {
                this.addCalculationStep(
                    '不需灌溉',
                    `耗水量 ${formatNumber(day.deficitBefore, 1)} mm 未超過 RAM ${formatNumber(day.ram, 1)} mm，今日灌溉量為 0。`
                );
            }

            const daysUntilNext = this.projectDaysUntilIrrigation(context, day.deficit);
            const nextLabel = day.irrigated
                ? '今天'
                : (daysUntilNext === null ? '120 天內不需' : `${daysUntilNext} 天後`);

            if (!day.irrigated && daysUntilNext !== null) {
                this.addCalculationStep(
                    '若後續無降雨',
                    `沿用同一套逐日公式、雨量以 0 計算，約 ${daysUntilNext} 天後耗水量會超過當日 RAM。`
                );
            }

            this.calculationResults = {
                irrigationDepth: day.irrigation,
                irrigationAmount: day.irrigation,
                irrigationLiters: day.litersPerPlant,
                treesPerFen: day.treesPerFen,
                tonsPerFen: day.tonsPerFen,
                soilDeficit: day.deficit,
                deficitBefore: day.deficitBefore,
                ram: day.ram,
                fieldCapacity: day.fc,
                kc: day.kc,
                baseKc: day.baseKc,
                eto: day.eto,
                etc: day.etc,
                ks: day.ks,
                pe: day.pe,
                cd: day.cd,
                kcStage: day.kcStage,
                ramStage: day.ramStage,
                irrigated: day.irrigated,
                nextIrrigation: nextLabel,
                daysUntilNext,
                recommendations: this.buildRecommendations(day, context, daysUntilNext),
                calculationSteps: this.calculationSteps,
                waterBalance: {
                    fieldCapacity: day.fc,
                    ram: day.ram,
                    deficitBefore: Math.max(0, day.deficitBefore),
                    irrigation: day.irrigation
                }
            };
            this.addCalculationStep('計算完成', '已依當日水分收支得到灌溉建議。');
            return this.calculationResults;
        }

        prepareContext(parameters) {
            const soilType = SOIL_TYPE_PARAMETERS[parameters.soilType] ? parameters.soilType : 'loam';
            const soilDepth = this.number(parameters.soilDepth, 60);
            const fc = fieldCapacity(soilType, soilDepth);
            const c = this.number(parameters.cValue, 0.35);
            const d = this.number(parameters.dValue, 0.45);
            const defaultDeficit = fc * d;
            const usedDefaultDeficit = parameters.useDefaultDeficit !== false;
            const initialDeficit = usedDefaultDeficit
                ? defaultDeficit
                : Math.max(0, this.number(parameters.initialDeficit, defaultDeficit));
            const systemKey = IRRIGATION_SYSTEM_PARAMETERS[parameters.irrigationSystem]
                ? parameters.irrigationSystem
                : 'drip';
            const system = IRRIGATION_SYSTEM_PARAMETERS[systemKey];
            let efficiency = this.number(parameters.systemEfficiency, system.efficiency * 100) / 100;
            if (efficiency > 1) {
                efficiency = efficiency / 100;
            }
            const requestedEfficiency = efficiency;
            efficiency = Math.min(system.efficiencyMax, Math.max(system.efficiencyMin, efficiency));
            const efficiencyAdjusted = Math.abs(efficiency - requestedEfficiency) > 0.0001;
            const position = parameters.emitterPosition === 'above' ? 'above' : 'below';
            let interception = position === 'above'
                ? INTERCEPTION.aboveCanopy
                : this.number(parameters.canopyInterception, INTERCEPTION.belowCanopyDefault);
            if (position === 'below') {
                interception = Math.min(
                    INTERCEPTION.belowCanopyMax,
                    Math.max(INTERCEPTION.belowCanopyMin, interception)
                );
            }
            const currentDate = parameters.currentDate || localDateISO();
            return {
                currentDate,
                dayIndex: dayIndexFromDate(currentDate),
                plantAge: Math.max(1, this.number(parameters.plantAge, 8)),
                plantDensity: Math.max(1, this.number(parameters.plantDensity, 400)),
                densityLevel: parameters.densityLevel === 'high' ? 'high' : 'low',
                soilType,
                soilDepth,
                fc,
                c,
                d,
                initialDeficit,
                usedDefaultDeficit,
                rainfall: Math.max(0, this.number(parameters.rainfall, 0)),
                irrigationSystem: systemKey,
                efficiency,
                emitterPosition: position,
                interception,
                irrigationDepth: Math.max(0, this.number(parameters.irrigationDepth, CALCULATION_CONSTANTS.DEFAULT_IRRIGATION_DEPTH)),
                efficiencyAdjusted
            };
        }

        evaluateDay(x, previousDeficit, rainfall, context) {
            const limits = kcLimits(context.plantAge, context.densityLevel);
            const baseKc = interpolate(x, KC_CURVE.days, KC_CURVE.values);
            const kc = scaleKc(baseKc, limits);
            const cd = coefficientAt(x, context.c, context.d);
            const fc = context.fc;
            const ram = fc * cd;
            const etoResult = referenceEvapotranspiration(x);
            let ks = (fc - previousDeficit) / (fc * CALCULATION_CONSTANTS.KS_FIELD_CAPACITY_FRACTION);
            if (ks > 1) {
                ks = 1;
            }
            if (ks < 0) {
                ks = 0;
            }
            const etc = etoResult.eto * kc * ks;
            let pe = rainfall > INTERCEPTION.rainfall ? rainfall - INTERCEPTION.rainfall : 0;
            const absorbable = previousDeficit + etc;
            if (absorbable <= 0) {
                pe = 0;
            } else if (pe > absorbable) {
                pe = absorbable;
            }
            const deficitBefore = previousDeficit + etc - pe;
            let irrigation = 0;
            let deficit = deficitBefore;
            const irrigated = deficitBefore > ram;
            if (irrigated) {
                irrigation = context.irrigationDepth * context.efficiency - context.interception;
                if (irrigation < 0) {
                    irrigation = 0;
                }
                deficit = previousDeficit + etc - pe - irrigation;
            }
            const litersPerPlant = irrigation * (10000 / context.plantDensity);
            const fenTotals = fenWaterTotals(litersPerPlant, context.plantDensity);
            return {
                baseKc,
                kc,
                limits,
                cd,
                fc,
                ram,
                eto: etoResult.eto,
                Ux: etoResult.Ux,
                Vx: etoResult.Vx,
                ks,
                etc,
                pe,
                deficitBefore,
                deficit,
                irrigation,
                irrigated,
                litersPerPlant,
                treesPerFen: fenTotals.treesPerFen,
                tonsPerFen: fenTotals.tonsPerFen,
                kcStage: stageName(x, KC_STAGES),
                ramStage: stageName(x, RAM_STAGES),
                soilName: SOIL_TYPE_PARAMETERS[context.soilType].name
            };
        }

        projectDaysUntilIrrigation(context, endingDeficit) {
            let deficit = endingDeficit;
            for (let ahead = 1; ahead <= 120; ahead++) {
                const date = addDays(context.currentDate, ahead);
                const x = dayIndexFromDate(date);
                const day = this.evaluateDay(x, deficit, 0, context);
                if (day.irrigated) {
                    return ahead;
                }
                deficit = day.deficit;
            }
            return null;
        }

        buildRecommendations(day, context, daysUntilNext) {
            const recommendations = [];
            if (day.irrigated) {
                recommendations.push({
                    type: 'warning',
                    title: '建議今日灌溉',
                    message: `耗水量 ${formatNumber(day.deficitBefore, 1)} mm 已超過耗水限值 ${formatNumber(day.ram, 1)} mm。請灌 ${formatNumber(day.irrigation, 1)} mm（約 ${formatNumber(day.litersPerPlant, 1)} L/株，一分地約 ${formatNumber(day.tonsPerFen, 1)} 噸）。`,
                    icon: 'fas fa-tint'
                });
                if (day.deficit > day.ram) {
                    recommendations.push({
                        type: 'critical',
                        title: '單次灌溉後仍超過限值',
                        message: `灌溉後耗水量為 ${formatNumber(day.deficit, 1)} mm，仍高於 RAM。此邏輯每天只灌一次固定深度，請持續逐日重算。`,
                        icon: 'fas fa-exclamation-triangle'
                    });
                }
            } else {
                recommendations.push({
                    type: 'success',
                    title: '今日不需灌溉',
                    message: `耗水量 ${formatNumber(day.deficitBefore, 1)} mm，尚未超過耗水限值 ${formatNumber(day.ram, 1)} mm。`,
                    icon: 'fas fa-check-circle'
                });
            }
            if (!day.irrigated && daysUntilNext !== null) {
                recommendations.push({
                    type: 'info',
                    title: '若後續沒有降雨',
                    message: `約 ${daysUntilNext} 天後，耗水量會超過當日耗水限值。`,
                    icon: 'fas fa-calendar-alt'
                });
            }
            if (context.c > context.d) {
                recommendations.push({
                    type: 'info',
                    title: 'c 大於 d',
                    message: '著果期係數 c 通常不高於其餘時期的 d。請確認管理目標是否填反。',
                    icon: 'fas fa-info-circle'
                });
            }
            return recommendations;
        }

        number(value, fallback) {
            const parsed = typeof value === 'number' ? value : parseFloat(value);
            return Number.isFinite(parsed) ? parsed : fallback;
        }

        addCalculationStep(title, description, formula = null) {
            this.calculationSteps.push({
                title,
                description,
                formula,
                timestamp: new Date().toLocaleTimeString()
            });
        }
    }

    window.irrigationCalculator = new CitrusIrrigationCalculator();
    window.irrigationFormula = {
        localDateISO,
        dayIndexFromDate,
        fieldCapacity,
        defaultDeficit(soilType, depthCm, d) {
            return fieldCapacity(soilType, depthCm) * d;
        },
        describeDate(dateString) {
            const x = dayIndexFromDate(dateString);
            return `年積日 ${x}（1 月 1 日為 0）：${stageName(x, KC_STAGES)}；耗水限值時期為${stageName(x, RAM_STAGES)}`;
        }
    };

    function checkFormElements() {
        const requiredElements = [
            'currentDate', 'plantAge', 'plantDensity', 'densityLevel', 'soilType', 'soilDepth',
            'cValue', 'dValue', 'initialDeficit', 'rainfall', 'irrigationSystem',
            'systemEfficiency', 'emitterPosition', 'canopyInterception', 'irrigationDepth'
        ];
        const missing = requiredElements.filter(id => !document.getElementById(id));
        if (missing.length) {
            console.error('缺少表單元素:', missing);
            return false;
        }
        return true;
    }

    window.calculateIrrigation = function() {
        try {
            if (!checkFormElements()) {
                throw new Error('表單元素不完整');
            }
            showLoadingOverlay(true);
            const parameters = collectFormParameters();
            const results = window.irrigationCalculator.calculate(parameters);
            updateResultsDisplay(results);
            updateCalculationStepsDisplay(results.calculationSteps);
            updateRecommendationsDisplay(results.recommendations);
            updateWaterBalanceChart(results);
            hideLoadingOverlay();
            showSuccessMessage('計算完成');
        } catch (error) {
            hideLoadingOverlay();
            showErrorMessage(`計算過程發生錯誤: ${error.message}`);
            console.error(error);
        }
    };

    function collectFormParameters() {
        function read(id, fallback = '') {
            const element = document.getElementById(id);
            if (!element) {
                return fallback;
            }
            return element.value;
        }
        const checkbox = document.getElementById('useDefaultDeficit');
        return {
            currentDate: read('currentDate', localDateISO()),
            plantAge: parseFloat(read('plantAge', '8')),
            plantDensity: parseFloat(read('plantDensity', '400')),
            densityLevel: read('densityLevel', 'low'),
            soilType: read('soilType', 'loam'),
            soilDepth: parseFloat(read('soilDepth', '60')),
            cValue: parseFloat(read('cValue', '0.35')),
            dValue: parseFloat(read('dValue', '0.45')),
            useDefaultDeficit: checkbox ? checkbox.checked : true,
            initialDeficit: parseFloat(read('initialDeficit', '0')),
            rainfall: parseFloat(read('rainfall', '0')),
            irrigationSystem: read('irrigationSystem', 'drip'),
            systemEfficiency: parseFloat(read('systemEfficiency', '92.5')),
            emitterPosition: read('emitterPosition', 'below'),
            canopyInterception: parseFloat(read('canopyInterception', '0.75')),
            irrigationDepth: parseFloat(read('irrigationDepth', '10'))
        };
    }

    window.collectFormParameters = collectFormParameters;

    window.showLoadingOverlay = function(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    };

    window.hideLoadingOverlay = function() {
        showLoadingOverlay(false);
    };

    console.log('Calculator.js 載入完成');
}
