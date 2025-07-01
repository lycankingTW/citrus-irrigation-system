/**
 * 柑橘園智能灌溉計算系統 - 參數定義模組
 * 開發者: 林鈺荏
 * 機構: 苗栗區農業改良場
 */

// 生育期參數定義
const GROWTH_STAGE_PARAMETERS = {
    flowerBud: {
        name: '花芽分化期',
        cropCoefficient: 0.6,
        rootDepthFactor: 0.8,
        stressThreshold: 0.4,
        description: '花芽開始分化，需適度控水以促進花芽分化'
    },
    flowering: {
        name: '開花期',
        cropCoefficient: 0.8,
        rootDepthFactor: 0.9,
        stressThreshold: 0.3,
        description: '開花期間需充足水分，避免落花落果'
    },
    fruitSet: {
        name: '著果期',
        cropCoefficient: 1.0,
        rootDepthFactor: 1.0,
        stressThreshold: 0.25,
        description: '著果期為需水關鍵期，水分不足易造成落果'
    },
    fruitDev: {
        name: '果實發育期',
        cropCoefficient: 1.2,
        rootDepthFactor: 1.0,
        stressThreshold: 0.3,
        description: '果實快速發育期，需水量最大'
    },
    fruitMature: {
        name: '果實成熟期',
        cropCoefficient: 0.9,
        rootDepthFactor: 0.9,
        stressThreshold: 0.35,
        description: '成熟期適度控水，提升果實品質'
    },
    dormant: {
        name: '休眠期',
        cropCoefficient: 0.4,
        rootDepthFactor: 0.7,
        stressThreshold: 0.5,
        description: '休眠期需水量最少，避免過度灌溉'
    }
};

// 土壤類型參數
const SOIL_TYPE_PARAMETERS = {
    sandy: {
        name: '砂質土',
        fieldCapacity: 0.15,
        wiltingPoint: 0.05,
        bulkDensity: 1.6,
        infiltrationRate: 25,
        description: '排水良好但保水力差，需頻繁少量灌溉'
    },
    loamy: {
        name: '壤土',
        fieldCapacity: 0.25,
        wiltingPoint: 0.12,
        bulkDensity: 1.4,
        infiltrationRate: 15,
        description: '理想的土壤類型，保水排水平衡'
    },
    clay: {
        name: '黏質土',
        fieldCapacity: 0.35,
        wiltingPoint: 0.20,
        bulkDensity: 1.2,
        infiltrationRate: 5,
        description: '保水力強但排水差，需注意排水管理'
    },
    organicRich: {
        name: '有機質豐富土壤',
        fieldCapacity: 0.40,
        wiltingPoint: 0.15,
        bulkDensity: 1.1,
        infiltrationRate: 20,
        description: '有機質含量高，保水保肥能力優良'
    }
};

// 灌溉系統效率參數
const IRRIGATION_SYSTEM_PARAMETERS = {
    drip: {
        name: '滴灌系統',
        efficiency: 0.90,
        uniformity: 0.85,
        flowRate: 2.0,
        wettingPattern: 'localized',
        description: '高效節水，適合精準灌溉'
    },
    sprinkler: {
        name: '噴灌系統',
        efficiency: 0.75,
        uniformity: 0.70,
        flowRate: 15.0,
        wettingPattern: 'area',
        description: '覆蓋面積大，適合大面積灌溉'
    },
    microSprinkler: {
        name: '微噴系統',
        efficiency: 0.80,
        uniformity: 0.75,
        flowRate: 8.0,
        wettingPattern: 'semi-localized',
        description: '介於滴灌與噴灌之間，適合果樹'
    },
    furrow: {
        name: '溝灌系統',
        efficiency: 0.60,
        uniformity: 0.60,
        flowRate: 50.0,
        wettingPattern: 'linear',
        description: '傳統灌溉方式，成本低但效率較差'
    }
};

// 覆蓋處理參數
const MULCHING_PARAMETERS = {
    none: {
        name: '無覆蓋',
        evaporationReduction: 0.0,
        temperatureModeration: 0.0,
        description: '無覆蓋處理，蒸發量最大'
    },
    organic: {
        name: '有機覆蓋',
        evaporationReduction: 0.3,
        temperatureModeration: 0.15,
        description: '稻草、木屑等有機材料覆蓋'
    },
    plastic: {
        name: '塑膠布覆蓋',
        evaporationReduction: 0.8,
        temperatureModeration: 0.1,
        description: '塑膠薄膜覆蓋，保水效果最佳'
    },
    gravel: {
        name: '礫石覆蓋',
        evaporationReduction: 0.4,
        temperatureModeration: 0.2,
        description: '礫石覆蓋，具良好的溫度調節效果'
    }
};

// 預設參數值
const DEFAULT_PARAMETERS = {
    currentDate: new Date().toISOString().split('T')[0],
    growthStage: 'fruitDev',
    plantAge: 8,
    temperature: 25,
    humidity: 70,
    windSpeed: 2.0,
    rainfall: 0,
    soilType: 'loamy',
    soilDepth: 60,
    currentMoisture: 60,
    irrigationSystem: 'drip',
    plantDensity: 400,
    mulching: 'organic'
};

// 計算公式常數
const CALCULATION_CONSTANTS = {
    PENMAN_MONTEITH: {
        CN: 900,
        CD: 0.34,
        REFERENCE_HEIGHT: 0.12
    },
    UNIT_CONVERSIONS: {
        MM_TO_LITERS_PER_M2: 1.0,
        M2_TO_HECTARE: 10000,
        DAY_TO_HOUR: 24,
        CELSIUS_TO_KELVIN: 273.15
    },
    SOIL_WATER: {
        DEPLETION_FRACTION: 0.5,
        MANAGEMENT_ALLOWABLE_DEPLETION: 0.3
    }
};

// 警告閾值
const WARNING_THRESHOLDS = {
    soilMoisture: {
        critical: 30,
        warning: 40,
        optimal: 60
    },
    temperature: {
        freezing: 0,
        heatStress: 35,
        optimal: { min: 20, max: 30 }
    }
};

// 建議訊息模板
const RECOMMENDATION_TEMPLATES = {
    irrigation: {
        immediate: "建議立即進行灌溉，土壤含水量已低於臨界值",
        scheduled: "建議在 {days} 天內進行灌溉",
        adequate: "目前土壤水分充足，暫不需要灌溉"
    },
    management: {
        mulching: "建議使用覆蓋材料以減少水分蒸發",
        drainage: "注意排水，避免土壤過濕",
        monitoring: "持續監測土壤水分變化"
    }
};