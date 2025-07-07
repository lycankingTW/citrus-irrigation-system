/**
 * 柑橘園智能灌溉計算系統 - 核心計算模組
 * 開發者: 林鈺荏
 * 機構: 苗栗區農業改良場
 * 基於 FAO-56 蒸發散公式
 */

// 必要的常數定義
const GROWTH_STAGE_PARAMETERS = {
  flowerBud: { name: '花芽分化期', cropCoefficient: 0.6 },
  flowering: { name: '開花期', cropCoefficient: 1.1 },
  fruitSet: { name: '結果期', cropCoefficient: 1.2 },
  fruitDevelopment: { name: '果實發育期', cropCoefficient: 1.0 },
  maturation: { name: '成熟期', cropCoefficient: 0.8 },
  vegetative: { name: '營養生長期', cropCoefficient: 0.7 }
};

const SOIL_TYPE_PARAMETERS = {
  sand: { fieldCapacity: 0.15, wiltingPoint: 0.05, infiltrationRate: 30 },
  loamySand: { fieldCapacity: 0.20, wiltingPoint: 0.08, infiltrationRate: 25 },
  sandyLoam: { fieldCapacity: 0.25, wiltingPoint: 0.12, infiltrationRate: 20 },
  loam: { fieldCapacity: 0.30, wiltingPoint: 0.15, infiltrationRate: 15 },
  clayLoam: { fieldCapacity: 0.35, wiltingPoint: 0.18, infiltrationRate: 10 },
  clay: { fieldCapacity: 0.40, wiltingPoint: 0.22, infiltrationRate: 5 }
};

const IRRIGATION_SYSTEM_PARAMETERS = {
  drip: { efficiency: 0.90, flowRate: 4, name: '滴灌系統' },
  microSprinkler: { efficiency: 0.85, flowRate: 15, name: '微噴系統' },
  sprinkler: { efficiency: 0.75, flowRate: 25, name: '噴灌系統' },
  furrow: { efficiency: 0.60, flowRate: 50, name: '溝灌系統' }
};

const MULCHING_PARAMETERS = {
  none: { evaporationReduction: 0, name: '無覆蓋' },
  organic: { evaporationReduction: 0.3, name: '有機覆蓋' },
  plastic: { evaporationReduction: 0.5, name: '塑膠覆蓋' },
  gravel: { evaporationReduction: 0.2, name: '碎石覆蓋' }
};

const CALCULATION_CONSTANTS = {
  SOIL_WATER: {
      DEPLETION_FRACTION: 0.5
  }
};

class CitrusIrrigationCalculator {
  constructor() {
      this.calculationResults = {};
      this.calculationSteps = [];
  }

  /**
   * 主要計算函數
   * @param {Object} parameters - 輸入參數
   * @returns {Object} 計算結果
   */
  calculate(parameters) {
      try {
          this.calculationSteps = [];
          this.addCalculationStep('開始計算', '初始化計算參數');

          // 1. 參數驗證與預處理
          const validatedParams = this.validateParameters(parameters);
          this.addCalculationStep('參數驗證', '所有輸入參數已驗證通過');

          // 2. 計算參考蒸發散量 (ET0)
          const et0 = this.calculateReferenceEvapotranspiration(validatedParams);
          this.addCalculationStep('參考蒸發散量計算', `ET0 = ${et0.toFixed(2)} mm/day`, 'ET0 = (0.408×Δ×(Rn-G) + γ×900/(T+273)×u2×(es-ea)) / (Δ + γ×(1+0.34×u2))');

          // 3. 計算作物蒸發散量 (ETc)
          const etc = this.calculateCropEvapotranspiration(et0, validatedParams);
          this.addCalculationStep('作物蒸發散量計算', `ETc = ${etc.toFixed(2)} mm/day`, `ETc = ET0 × Kc = ${et0.toFixed(2)} × ${this.getCropCoefficient(validatedParams).toFixed(2)}`);

          // 4. 計算土壤水分平衡
          const waterBalance = this.calculateWaterBalance(etc, validatedParams);
          this.addCalculationStep('土壤水分平衡', `可用水量 = ${waterBalance.availableWater.toFixed(1)} mm`);

          // 5. 計算灌溉需求
          const irrigationNeed = this.calculateIrrigationRequirement(waterBalance, validatedParams, etc);
          this.addCalculationStep('灌溉需求計算', `淨灌溉量 = ${irrigationNeed.netIrrigation.toFixed(1)} mm`);

          // 6. 計算實際灌溉量（考慮系統效率）
          const actualIrrigation = this.calculateActualIrrigation(irrigationNeed, validatedParams);
          this.addCalculationStep('實際灌溉量計算', `總灌溉量 = ${actualIrrigation.totalIrrigation.toFixed(1)} mm`);

          // 7. 計算灌溉時間
          const irrigationTime = this.calculateIrrigationTime(actualIrrigation, validatedParams);
          this.addCalculationStep('灌溉時間計算', `建議灌溉時間 = ${irrigationTime.duration.toFixed(0)} 分鐘`);

          // 8. 生成管理建議
          const recommendations = this.generateRecommendations(validatedParams, irrigationNeed, waterBalance);

          // 組合最終結果
          this.calculationResults = {
              irrigationAmount: actualIrrigation.irrigationPerPlant,
              irrigationTime: irrigationTime.duration,
              nextIrrigation: irrigationTime.nextIrrigationDays,
              et0: et0,
              etc: etc,
              waterBalance: waterBalance,
              irrigationNeed: irrigationNeed,
              actualIrrigation: actualIrrigation,
              recommendations: recommendations,
              calculationSteps: this.calculationSteps
          };

          this.addCalculationStep('計算完成', '所有計算已完成，結果已生成');
          return this.calculationResults;

      } catch (error) {
          console.error('計算過程發生錯誤:', error);
          throw new Error(`計算失敗: ${error.message}`);
      }
  }

  /**
   * 參數驗證
   */
  validateParameters(params) {
      const validated = { ...params };
      
      // 設定預設值
      validated.mulching = validated.mulching || 'none';
      validated.rainfall = validated.rainfall || 0;
      validated.solarRadiation = validated.solarRadiation || 8;
      validated.canopyCover = validated.canopyCover || 70;
      validated.organicMatter = validated.organicMatter || 2.5;
      validated.systemEfficiency = validated.systemEfficiency || 85;
      validated.irrigationInterval = validated.irrigationInterval || 3;
      validated.latitude = validated.latitude || 24.5;
      validated.longitude = validated.longitude || 120.8;
      validated.elevation = validated.elevation || 150;
      
      // 溫度範圍檢查
      if (validated.temperature < -10 || validated.temperature > 50) {
          throw new Error('溫度超出合理範圍 (-10°C ~ 50°C)');
      }

      // 濕度範圍檢查
      if (validated.humidity < 0 || validated.humidity > 100) {
          throw new Error('相對濕度超出範圍 (0% ~ 100%)');
      }

      // 土壤含水量檢查
      if (validated.currentMoisture < 0 || validated.currentMoisture > 100) {
          throw new Error('土壤含水量超出範圍 (0% ~ 100%)');
      }

      return validated;
  }

  /**
   * 計算參考蒸發散量 (FAO-56 Penman-Monteith)
   */
  calculateReferenceEvapotranspiration(params) {
      const T = params.temperature;
      const RH = params.humidity;
      const u2 = params.windSpeed;
      
      // 飽和蒸氣壓
      const es = 0.6108 * Math.exp((17.27 * T) / (T + 237.3));
      
      // 實際蒸氣壓
      const ea = es * (RH / 100);
      
      // 飽和蒸氣壓曲線斜率
      const delta = (4098 * es) / Math.pow(T + 237.3, 2);
      
      // 乾濕計常數
      const gamma = 0.665;
      
      // 簡化的淨輻射計算 (基於溫度和日照)
      const solarHours = params.solarRadiation || 8;
      const Rn = Math.max(0, (15 + solarHours * 0.5) - 0.5 * Math.abs(T - 25));
      
      // 土壤熱通量 (假設為0)
      const G = 0;
      
      // FAO-56 Penman-Monteith 公式
      const numerator = 0.408 * delta * (Rn - G) + gamma * (900 / (T + 273)) * u2 * (es - ea);
      const denominator = delta + gamma * (1 + 0.34 * u2);
      
      return Math.max(0, numerator / denominator);
  }

  /**
   * 計算作物蒸發散量
   */
  calculateCropEvapotranspiration(et0, params) {
      const kc = this.getCropCoefficient(params);
      return et0 * kc;
  }

  /**
   * 獲取作物係數
   */
  getCropCoefficient(params) {
      const stageParams = GROWTH_STAGE_PARAMETERS[params.growthStage] || GROWTH_STAGE_PARAMETERS.vegetative;
      let kc = stageParams.cropCoefficient;
      
      // 樹齡調整
      const ageCategory = this.getAgeCategory(params.plantAge);
      const ageMultiplier = this.getAgeMultiplier(ageCategory);
      kc *= ageMultiplier;
      
      // 季節調整
      const seasonalMultiplier = this.getSeasonalMultiplier(params.currentDate);
      kc *= seasonalMultiplier;
      
      return Math.max(0.3, Math.min(1.5, kc));
  }

  /**
   * 計算土壤水分平衡
   */
  calculateWaterBalance(etc, params) {
      const soilParams = SOIL_TYPE_PARAMETERS[params.soilType] || SOIL_TYPE_PARAMETERS.loam;
      const soilDepth = params.soilDepth / 100; // 轉換為公尺
      
      // 田間容水量和凋萎點
      const fieldCapacity = soilParams.fieldCapacity * soilDepth * 1000; // mm
      const wiltingPoint = soilParams.wiltingPoint * soilDepth * 1000; // mm
      
      // 目前土壤含水量
      const currentWater = (params.currentMoisture / 100) * fieldCapacity;
      
      // 可用水量
      const availableWater = fieldCapacity - wiltingPoint;
      const currentAvailableWater = Math.max(0, currentWater - wiltingPoint);
      
      // 允許耗水量
      const allowableDepletion = availableWater * CALCULATION_CONSTANTS.SOIL_WATER.DEPLETION_FRACTION;
      
      return {
          fieldCapacity: fieldCapacity,
          wiltingPoint: wiltingPoint,
          currentWater: currentWater,
          availableWater: availableWater,
          currentAvailableWater: currentAvailableWater,
          allowableDepletion: allowableDepletion,
          depletionLevel: (availableWater - currentAvailableWater) / availableWater
      };
  }

  /**
   * 計算灌溉需求
   */
  calculateIrrigationRequirement(waterBalance, params, etc) {
      const rainfall = params.rainfall || 0;
      
      // 淨灌溉需求
      let netIrrigation = etc - rainfall;
      
      // 考慮土壤水分狀況
      const currentDepletion = waterBalance.availableWater - waterBalance.currentAvailableWater;
      const criticalDepletion = waterBalance.allowableDepletion;
      
      if (currentDepletion > criticalDepletion) {
          // 需要補充到田間容水量
          netIrrigation = Math.max(netIrrigation, currentDepletion - criticalDepletion);
      } else if (waterBalance.depletionLevel < 0.3) {
          // 水分充足，減少灌溉
          netIrrigation *= 0.5;
      }
      
      // 覆蓋處理調整
      const mulchParams = MULCHING_PARAMETERS[params.mulching] || MULCHING_PARAMETERS.none;
      netIrrigation *= (1 - mulchParams.evaporationReduction * 0.3);
      
      return {
          netIrrigation: Math.max(0, netIrrigation),
          currentDepletion: currentDepletion,
          criticalDepletion: criticalDepletion,
          isIrrigationNeeded: netIrrigation > 0
      };
  }

  /**
   * 計算實際灌溉量（考慮系統效率）
   */
  calculateActualIrrigation(irrigationNeed, params) {
      const systemParams = IRRIGATION_SYSTEM_PARAMETERS[params.irrigationSystem] || IRRIGATION_SYSTEM_PARAMETERS.drip;
      const efficiency = (params.systemEfficiency || 85) / 100;
      
      // 總灌溉量 = 淨灌溉量 / 系統效率
      const totalIrrigation = irrigationNeed.netIrrigation / efficiency;
      
      // 每株灌溉量
      const plantSpacing = 10000 / params.plantDensity; // m²/株
      const irrigationPerPlant = totalIrrigation * plantSpacing; // L/株
      
      return {
          totalIrrigation: totalIrrigation,
          irrigationPerPlant: irrigationPerPlant,
          systemEfficiency: efficiency
      };
  }

  /**
   * 計算灌溉時間
   */
  calculateIrrigationTime(actualIrrigation, params) {
      const systemParams = IRRIGATION_SYSTEM_PARAMETERS[params.irrigationSystem] || IRRIGATION_SYSTEM_PARAMETERS.drip;
      const flowRate = systemParams.flowRate; // L/h
      
      // 灌溉時間 (分鐘)
      const duration = (actualIrrigation.irrigationPerPlant / flowRate) * 60;
      
      // 下次灌溉時間估算
      const nextIrrigationDays = params.irrigationInterval || 3;
      
      return {
          duration: Math.max(5, duration), // 最少5分鐘
          nextIrrigationDays: nextIrrigationDays,
          flowRate: flowRate
      };
  }

  /**
   * 生成管理建議
   */
  generateRecommendations(params, irrigationNeed, waterBalance) {
      const recommendations = [];
      
      // 灌溉建議
      if (irrigationNeed.isIrrigationNeeded) {
          if (waterBalance.depletionLevel > 0.7) {
              recommendations.push({
                  type: 'critical',
                  title: '緊急灌溉',
                  message: '土壤水分嚴重不足，建議立即進行灌溉',
                  icon: 'fas fa-exclamation-triangle'
              });
          } else {
              recommendations.push({
                  type: 'warning',
                  title: '建議灌溉',
                  message: '土壤水分偏低，建議近期內進行灌溉',
                  icon: 'fas fa-tint'
              });
          }
      } else {
          recommendations.push({
              type: 'success',
              title: '水分充足',
              message: '目前土壤水分充足，暫不需要灌溉',
              icon: 'fas fa-check-circle'
          });
      }
      
      // 環境條件建議
      if (params.temperature > 35) {
          recommendations.push({
              type: 'warning',
              title: '高溫警告',
              message: '氣溫過高，建議增加灌溉頻率並注意遮陰',
              icon: 'fas fa-thermometer-full'
          });
      }
      
      if (params.windSpeed > 8) {
          recommendations.push({
              type: 'info',
              title: '強風影響',
              message: '風速較大，可能增加蒸發散，建議調整灌溉量',
              icon: 'fas fa-wind'
          });
      }
      
      // 覆蓋建議
      if (params.mulching === 'none') {
          recommendations.push({
              type: 'info',
              title: '覆蓋建議',
              message: '建議使用覆蓋材料以減少土壤水分蒸發',
              icon: 'fas fa-leaf'
          });
      }
      
      return recommendations;
  }

  /**
   * 輔助函數
   */
  getAgeCategory(age) {
      if (age <= 3) return 'young';
      if (age <= 7) return 'juvenile';
      if (age <= 15) return 'mature';
      return 'old';
  }

  getAgeMultiplier(category) {
      const multipliers = {
          young: 0.6,
          juvenile: 0.8,
          mature: 1.0,
          old: 0.9
      };
      return multipliers[category] || 1.0;
  }

  getSeasonalMultiplier(dateString) {
      const date = new Date(dateString);
      const month = date.getMonth() + 1;
      
      if (month >= 6 && month <= 8) return 1.2; // 夏季
      if (month >= 9 && month <= 11) return 0.9; // 秋季
      if (month >= 12 || month <= 2) return 0.6; // 冬季
      return 1.0; // 春季
  }

  addCalculationStep(title, description, formula = null) {
      this.calculationSteps.push({
          title: title,
          description: description,
          formula: formula,
          timestamp: new Date().toLocaleTimeString()
      });
  }

  /**
   * 獲取計算結果
   */
  getResults() {
      return this.calculationResults;
  }

  /**
   * 獲取計算步驟
   */
  getCalculationSteps() {
      return this.calculationSteps;
  }
}

// 全域計算器實例
const irrigationCalculator = new CitrusIrrigationCalculator();

/**
 * 檢查必要的表單元素是否存在
 */
function checkFormElements() {
  const requiredElements = [
      'currentDate', 'growthStage', 'plantAge', 'temperature', 'humidity', 
      'windSpeed', 'rainfall', 'solarRadiation', 'soilType', 'soilDepth', 
      'currentMoisture', 'organicMatter', 'irrigationSystem', 'plantDensity', 
      'mulching', 'systemEfficiency', 'irrigationInterval', 'canopyCover',
      'latitude', 'longitude', 'elevation'
  ];
  
  const missingElements = [];
  
  requiredElements.forEach(elementId => {
      const element = document.getElementById(elementId);
      if (!element) {
          missingElements.push(elementId);
      }
  });
  
  if (missingElements.length > 0) {
      console.error('❌ 缺少以下表單元素:', missingElements);
      return false;
  }
  
  console.log('✅ 所有必要表單元素都存在');
  return true;
}

/**
 * 主要計算函數 (供 HTML 調用) - 修正版
 */
function calculateIrrigation() {
  try {
      console.log('🚀 開始灌溉計算...');
      
      // 檢查表單元素
      if (!checkFormElements()) {
          throw new Error('表單元素不完整，請檢查 HTML 結構');
      }
      
      showLoadingOverlay(true);
      
      // 收集表單參數
      const parameters = collectFormParameters();
      console.log('📋 收集到的參數:', parameters);
      
      // 執行計算
      console.log('⚙️ 開始執行計算...');
      const results = irrigationCalculator.calculate(parameters);
      console.log('📊 計算結果:', results);
      
      // 更新UI顯示
      console.log('🎨 更新UI顯示...');
      updateResultsDisplay(results);
      updateCalculationStepsDisplay(results.calculationSteps);
      updateRecommendationsDisplay(results.recommendations);
      updateWaterBalanceChart(results);
      
      hideLoadingOverlay();
      showSuccessMessage('✅ 計算完成！');
      
  } catch (error) {
      hideLoadingOverlay();
      const errorMessage = `❌ 計算過程發生錯誤: ${error.message}`;
      showErrorMessage(errorMessage);
      console.error('💥 計算錯誤詳情:', error);
      
      // 顯示詳細的錯誤資訊給開發者
      console.error('錯誤堆疊:', error.stack);
  }
}

/**
 * 安全收集表單參數 - 修正版
 */
function collectFormParameters() {
  function safeGetValue(elementId, defaultValue = 0) {
      const element = document.getElementById(elementId);
      if (!element) {
          console.warn(`⚠️ 元素 ${elementId} 不存在，使用預設值: ${defaultValue}`);
          return defaultValue;
      }
      
      const value = element.value;
      
      // 如果是數字類型的輸入
      if (typeof defaultValue === 'number') {
          if (value === '' || value === null || value === undefined) {
              console.warn(`⚠️ 元素 ${elementId} 值為空，使用預設值: ${defaultValue}`);
              return defaultValue;
          }
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
              console.warn(`⚠️ 元素 ${elementId} 值無效 (${value})，使用預設值: ${defaultValue}`);
              return defaultValue;
          }
          return numValue;
      }
      
      // 如果是字串類型的輸入
      if (value === '' || value === null || value === undefined) {
          console.warn(`⚠️ 元素 ${elementId} 值為空，使用預設值: ${defaultValue}`);
          return defaultValue;
      }
      
      return value;
  }

  console.log('🔍 開始收集表單參數...');

  const parameters = {
      // 基本參數
      currentDate: safeGetValue('currentDate', new Date().toISOString().split('T')[0]),
      growthStage: safeGetValue('growthStage', 'vegetative'),
      plantAge: safeGetValue('plantAge', 5),
      
      // 氣象參數
      temperature: safeGetValue('temperature', 25),
      humidity: safeGetValue('humidity', 70),
      windSpeed: safeGetValue('windSpeed', 2),
      rainfall: safeGetValue('rainfall', 0),
      solarRadiation: safeGetValue('solarRadiation', 8),
      
      // 土壤參數
      soilType: safeGetValue('soilType', 'loam'),
      soilDepth: safeGetValue('soilDepth', 60),
      currentMoisture: safeGetValue('currentMoisture', 50),
      organicMatter: safeGetValue('organicMatter', 2.5),
      
      // 灌溉系統參數
      irrigationSystem: safeGetValue('irrigationSystem', 'drip'),
      plantDensity: safeGetValue('plantDensity', 100),
      mulching: safeGetValue('mulching', 'none'),
      systemEfficiency: safeGetValue('systemEfficiency', 85),
      irrigationInterval: safeGetValue('irrigationInterval', 3),
      
      // 作物參數
      canopyCover: safeGetValue('canopyCover', 70),
      
      // 地理參數
      latitude: safeGetValue('latitude', 24.5),
      longitude: safeGetValue('longitude', 120.8),
      elevation: safeGetValue('elevation', 150)
  };

  console.log('✅ 表單參數收集完成:', parameters);
  return parameters;
}

// 輔助函數 - 顯示載入覆蓋層
function showLoadingOverlay(show = true) {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
  }
}

function hideLoadingOverlay() {
  showLoadingOverlay(false);
}

// 輔助函數 - 改善錯誤顯示
function showSuccessMessage(message) {
  console.log('✅ 成功:', message);
  
  // 創建成功提示
  const toast = document.createElement('div');
  toast.className = 'alert alert-success alert-dismissible fade show position-fixed';
  toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
  toast.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(toast);
  
  // 3秒後自動移除
  setTimeout(() => {
      if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
      }
  }, 3000);
}

function showErrorMessage(message) {
  console.error('❌ 錯誤:', message);
  
  // 創建錯誤提示
  const toast = document.createElement('div');
  toast.className = 'alert alert-danger alert-dismissible fade show position-fixed';
  toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
  toast.innerHTML = `
      <strong>錯誤：</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(toast);
  
  // 5秒後自動移除
  setTimeout(() => {
      if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
      }
  }, 5000);
}

// DOM 載入完成後執行檢查
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 DOM 載入完成，檢查表單元素...');
  checkFormElements();
  
  // 設定當前日期
  const currentDateInput = document.getElementById('currentDate');
  if (currentDateInput && !currentDateInput.value) {
      currentDateInput.value = new Date().toISOString().split('T')[0];
      console.log('📅 已設定當前日期');
  }
});
