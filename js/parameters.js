/**
 * 柑橘園智能灌溉計算系統 - 參數定義
 * 每日 Kc、耗水限值與灌溉深度，依灌溉運算邏輯文件
 */

// 20 年樹的基礎 Kc 曲線。年積日 0 = 1 月 1 日。
const KC_CURVE = {
    days: [0, 67, 87, 97, 111, 170, 200, 340, 366],
    values: [0.3, 0.3, 0.5, 0.5, 1.35, 1.35, 1, 1, 0.3],
    baseMin: 0.3,
    baseMax: 1.35
};

// 節點所標示的生育期（邊界日歸入較後的生育期）
const KC_STAGES = [
    { start: 0, end: 67, name: '萌芽前' },
    { start: 67, end: 97, name: '春梢萌發' },
    { start: 97, end: 170, name: '枝梢旺盛' },
    { start: 170, end: 340, name: '果實膨大至轉色' },
    { start: 340, end: 366, name: '成熟' }
];

// 耗水限值係數：著果及果實發育用 c，其餘時期用 d，節點之間線性過渡
const RAM_CURVE = {
    days: [0, 60, 97, 280, 310, 366],
    symbols: ['d', 'd', 'c', 'c', 'd', 'd']
};

const RAM_STAGES = [
    { start: 0, end: 60, name: '花芽分化前期' },
    { start: 60, end: 97, name: '春梢萌發' },
    { start: 97, end: 310, name: '著果及果實發育' },
    { start: 310, end: 366, name: '果實轉色至採收' }
];

// 每公分根深的田間容水量（公釐／公分）。文件「砏」依土壤分類記為坋。
const SOIL_TYPE_PARAMETERS = {
    sand: {
        name: '砂土',
        fcPerCm: 0.47,
        description: '每公分根深田間容水量 0.47 mm'
    },
    sandyLoam: {
        name: '砂壤土',
        fcPerCm: 1.28,
        description: '每公分根深田間容水量 1.28 mm'
    },
    loam: {
        name: '壤土',
        fcPerCm: 1.92,
        description: '每公分根深田間容水量 1.92 mm'
    },
    siltLoam: {
        name: '坋壤土',
        fcPerCm: 2.23,
        description: '每公分根深田間容水量 2.23 mm'
    },
    clayLoam: {
        name: '黏壤土',
        fcPerCm: 2.33,
        description: '每公分根深田間容水量 2.33 mm'
    },
    siltClay: {
        name: '坋黏土',
        fcPerCm: 2.30,
        description: '每公分根深田間容水量 2.30 mm'
    },
    clay: {
        name: '黏土',
        fcPerCm: 2.30,
        description: '每公分根深田間容水量 2.30 mm'
    }
};

// c、d 對照的土壤水分張力
const CD_TENSION_TABLE = [
    { value: 0.30, tension: 25, description: '濕潤' },
    { value: 0.32, tension: 30, description: '適合' },
    { value: 0.35, tension: 40, description: '略乾' },
    { value: 0.40, tension: 50, description: '半乾' },
    { value: 0.45, tension: 60, description: '乾燥但不缺水' },
    { value: 0.57, tension: 100, description: '輕微缺水' }
];

const MANAGEMENT_PRESETS = {
    general: { c: 0.35, d: 0.45, name: '一般管理' },
    shallow: { c: 0.35, d: 0.40, name: '淺層土' },
    young: { c: 0.35, d: 0.45, name: '幼樹' },
    hillside: { c: 0.40, d: 0.57, name: '山坡地水源不足' }
};

// 管路灌溉效率取文件範圍的中值。溝灌不在此邏輯內。
const IRRIGATION_SYSTEM_PARAMETERS = {
    drip: {
        name: '滴灌',
        efficiency: 0.925,
        efficiencyMin: 0.90,
        efficiencyMax: 0.95,
        defaultPosition: 'below',
        description: '效率約 90–95%，噴頭在樹冠下層'
    },
    microSprinkler: {
        name: '微噴灌',
        efficiency: 0.875,
        efficiencyMin: 0.85,
        efficiencyMax: 0.90,
        defaultPosition: 'below',
        description: '效率約 85–90%'
    },
    sprinkler: {
        name: '噴灌',
        efficiency: 0.825,
        efficiencyMin: 0.80,
        efficiencyMax: 0.85,
        defaultPosition: 'above',
        description: '效率約 80–85%，噴頭多在樹冠上層'
    }
};

const INTERCEPTION = {
    rainfall: 3,
    aboveCanopy: 2,
    belowCanopyDefault: 0.75,
    belowCanopyMin: 0.5,
    belowCanopyMax: 1
};

const ETO_PARAMETERS = {
    a: 0.0133,
    b: -2.56,
    h: 1600
};

const CALCULATION_CONSTANTS = {
    KS_FIELD_CAPACITY_FRACTION: 0.67,
    DEFAULT_IRRIGATION_DEPTH: 10
};

const DEFAULT_PARAMETERS = {
    plantAge: 8,
    plantDensity: 400,
    densityLevel: 'low',
    soilType: 'loam',
    soilDepth: 60,
    managementGoal: 'general',
    cValue: 0.35,
    dValue: 0.45,
    rainfall: 0,
    irrigationSystem: 'drip',
    systemEfficiency: 92.5,
    emitterPosition: 'below',
    canopyInterception: 0.75,
    irrigationDepth: 10
};
