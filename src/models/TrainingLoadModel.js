/**
 * Training Load Model
 * Manages ATL, CTL, TSB calculations and training load metrics as outlined in issue #111
 * Implements the TrainingPeaks/WKO methodology for fitness and fatigue tracking
 */

export class TrainingLoadModel {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.userId = data.userId || null;
    this.date = data.date || new Date().toISOString();
    
    // Training Stress Score for the day
    this.dailyTSS = data.dailyTSS || 0;
    
    // Training load metrics
    this.atl = data.atl || 0; // Acute Training Load (7-day exponentially weighted average)
    this.ctl = data.ctl || 0; // Chronic Training Load (42-day exponentially weighted average)
    this.tsb = data.tsb || 0; // Training Stress Balance (CTL - ATL)
    
    // Derived metrics
    this.rampRate = data.rampRate || 0; // CTL change per week
    this.form = data.form || this.calculateForm(); // Training form assessment
    
    // Training load distribution
    this.weeklyTSS = data.weeklyTSS || 0; // 7-day rolling sum
    this.monthlyTSS = data.monthlyTSS || 0; // 30-day rolling sum
    
    // Intensity distribution
    this.intensityDistribution = data.intensityDistribution || {
      zone1: 0, // % of weekly training
      zone2: 0,
      zone3: 0,
      zone4: 0,
      zone5: 0,
      zone6: 0,
      zone7: 0
    };
    
    // Training patterns
    this.trainingDays = data.trainingDays || 0; // days with training in last 7 days
    this.restDays = data.restDays || 0; // consecutive rest days
    
    // Recommendations and flags
    this.recommendations = data.recommendations || [];
    this.flags = data.flags || []; // overreaching, detraining, etc.
    
    // System metadata
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Generate unique training load ID
   */
  generateId() {
    return `trainingload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate ATL (Acute Training Load)
   * ATL = yesterday's ATL × 0.85714 + today's TSS × 0.14286
   * Time constant: 7 days (1/7 = 0.14286, 6/7 = 0.85714)
   */
  static calculateATL(previousATL, todayTSS) {
    const timeConstant = 7;
    const alpha = 1 / timeConstant; // 0.14286
    const beta = 1 - alpha; // 0.85714
    
    return previousATL * beta + todayTSS * alpha;
  }

  /**
   * Calculate CTL (Chronic Training Load)
   * CTL = yesterday's CTL × 0.97619 + today's TSS × 0.02381
   * Time constant: 42 days (1/42 = 0.02381, 41/42 = 0.97619)
   */
  static calculateCTL(previousCTL, todayTSS) {
    const timeConstant = 42;
    const alpha = 1 / timeConstant; // 0.02381
    const beta = 1 - alpha; // 0.97619
    
    return previousCTL * beta + todayTSS * alpha;
  }

  /**
   * Calculate TSB (Training Stress Balance)
   * TSB = CTL - ATL
   * Positive TSB = fresher, negative TSB = more fatigued
   */
  static calculateTSB(ctl, atl) {
    return ctl - atl;
  }

  /**
   * Calculate training form based on TSB
   */
  calculateForm() {
    if (this.tsb > 25) return 'rested';
    if (this.tsb > 5) return 'fresh';
    if (this.tsb > -10) return 'neutral';
    if (this.tsb > -30) return 'tired';
    return 'very_tired';
  }

  /**
   * Get form description and recommendations
   */
  getFormAnalysis() {
    const form = this.calculateForm();
    
    const analysis = {
      rested: {
        description: 'Well rested and ready for high-intensity training',
        color: 'green',
        recommendation: 'Good time for races or breakthrough workouts',
        icon: '🔥'
      },
      fresh: {
        description: 'Fresh and recovered with good training capacity',
        color: 'lightgreen',
        recommendation: 'Excellent for quality training sessions',
        icon: '✨'
      },
      neutral: {
        description: 'Maintaining fitness with balanced training stress',
        color: 'blue',
        recommendation: 'Continue current training pattern',
        icon: '⚖️'
      },
      tired: {
        description: 'Accumulating fatigue, monitor recovery closely',
        color: 'orange',
        recommendation: 'Consider easier training or rest day',
        icon: '😴'
      },
      very_tired: {
        description: 'High fatigue levels, prioritize recovery',
        color: 'red',
        recommendation: 'Rest or very easy training recommended',
        icon: '🚨'
      }
    };
    
    return analysis[form] || analysis.neutral;
  }

  /**
   * Calculate ramp rate (CTL change per week)
   */
  calculateRampRate(previousWeekCTL) {
    if (!previousWeekCTL) return 0;
    return this.ctl - previousWeekCTL;
  }

  /**
   * Detect training patterns and flags
   */
  analyzeTrainingPatterns(historicalData = []) {
    const flags = [];
    const recommendations = [];
    
    // Check for overreaching (rapid ATL increase)
    if (this.atl > this.ctl * 1.5) {
      flags.push('overreaching');
      recommendations.push('Consider reducing training intensity');
    }
    
    // Check for detraining (CTL declining rapidly)
    if (this.rampRate < -5) {
      flags.push('detraining');
      recommendations.push('Increase training volume to maintain fitness');
    }
    
    // Check for excessive ramp rate
    if (this.rampRate > 10) {
      flags.push('rapid_buildup');
      recommendations.push('Monitor fatigue levels closely');
    }
    
    // Check for extended negative TSB
    if (this.tsb < -20 && this.restDays < 2) {
      flags.push('chronic_fatigue');
      recommendations.push('Schedule rest days or reduce training load');
    }
    
    // Check for extended positive TSB (possible detraining)
    if (this.tsb > 20 && this.weeklyTSS < this.ctl * 0.5) {
      flags.push('undertraining');
      recommendations.push('Consider increasing training stimulus');
    }
    
    this.flags = flags;
    this.recommendations = recommendations;
    
    return { flags, recommendations };
  }

  /**
   * Get training load summary
   */
  getSummary() {
    return {
      date: this.date,
      dailyTSS: this.dailyTSS,
      atl: Math.round(this.atl * 10) / 10,
      ctl: Math.round(this.ctl * 10) / 10,
      tsb: Math.round(this.tsb * 10) / 10,
      form: this.calculateForm(),
      rampRate: Math.round(this.rampRate * 10) / 10,
      weeklyTSS: this.weeklyTSS
    };
  }

  /**
   * Get metrics for charting
   */
  getChartData() {
    return {
      date: this.date,
      atl: this.atl,
      ctl: this.ctl,
      tsb: this.tsb,
      dailyTSS: this.dailyTSS,
      weeklyTSS: this.weeklyTSS
    };
  }

  /**
   * Update training load with new activity
   */
  updateWithActivity(activity, previousTrainingLoad = null) {
    // Add activity TSS to daily total
    this.dailyTSS += activity.tss || 0;
    
    // Calculate new ATL and CTL if we have previous data
    if (previousTrainingLoad) {
      this.atl = TrainingLoadModel.calculateATL(
        previousTrainingLoad.atl,
        this.dailyTSS
      );
      this.ctl = TrainingLoadModel.calculateCTL(
        previousTrainingLoad.ctl,
        this.dailyTSS
      );
    } else {
      // Initialize with current TSS
      this.atl = this.dailyTSS * 0.14286; // First day approximation
      this.ctl = this.dailyTSS * 0.02381; // First day approximation
    }
    
    // Calculate TSB
    this.tsb = TrainingLoadModel.calculateTSB(this.ctl, this.atl);
    
    // Update form
    this.form = this.calculateForm();
    
    // Update timestamp
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Validate training load data
   */
  validate() {
    const errors = [];
    
    if (!this.date) {
      errors.push('Date is required');
    }
    
    if (this.dailyTSS < 0) {
      errors.push('Daily TSS cannot be negative');
    }
    
    if (this.atl < 0) {
      errors.push('ATL cannot be negative');
    }
    
    if (this.ctl < 0) {
      errors.push('CTL cannot be negative');
    }
    
    return errors;
  }

  /**
   * Convert to JSON for storage
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      date: this.date,
      dailyTSS: this.dailyTSS,
      atl: this.atl,
      ctl: this.ctl,
      tsb: this.tsb,
      rampRate: this.rampRate,
      form: this.form,
      weeklyTSS: this.weeklyTSS,
      monthlyTSS: this.monthlyTSS,
      intensityDistribution: this.intensityDistribution,
      trainingDays: this.trainingDays,
      restDays: this.restDays,
      recommendations: this.recommendations,
      flags: this.flags,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create from JSON data
   */
  static fromJSON(data) {
    return new TrainingLoadModel(data);
  }
}

/**
 * Training Load Calculator
 * Utility class for bulk calculations and analysis
 */
export class TrainingLoadCalculator {
  /**
   * Calculate training load metrics for a series of activities
   */
  static calculateTrainingLoadSeries(activities, startDate = null, endDate = null) {
    // Sort activities by date
    const sortedActivities = activities.sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // Group activities by date
    const activitiesByDate = {};
    sortedActivities.forEach(activity => {
      const date = new Date(activity.date).toISOString().split('T')[0];
      if (!activitiesByDate[date]) {
        activitiesByDate[date] = [];
      }
      activitiesByDate[date].push(activity);
    });
    
    // Generate date range
    const dates = this.generateDateRange(
      startDate || sortedActivities[0]?.date,
      endDate || new Date().toISOString()
    );
    
    // Calculate training load for each date
    const trainingLoadData = [];
    let previousTrainingLoad = null;
    
    dates.forEach(date => {
      const dateActivities = activitiesByDate[date] || [];
      const dailyTSS = dateActivities.reduce((sum, activity) => 
        sum + (activity.tss || 0), 0
      );
      
      const trainingLoad = new TrainingLoadModel({
        date: date,
        dailyTSS: dailyTSS
      });
      
      // Update with previous data
      if (previousTrainingLoad) {
        trainingLoad.atl = TrainingLoadModel.calculateATL(
          previousTrainingLoad.atl, dailyTSS
        );
        trainingLoad.ctl = TrainingLoadModel.calculateCTL(
          previousTrainingLoad.ctl, dailyTSS
        );
        trainingLoad.tsb = TrainingLoadModel.calculateTSB(
          trainingLoad.ctl, trainingLoad.atl
        );
        trainingLoad.rampRate = trainingLoad.calculateRampRate(
          previousTrainingLoad.ctl
        );
      } else {
        // Initialize first day
        trainingLoad.atl = dailyTSS * 0.14286;
        trainingLoad.ctl = dailyTSS * 0.02381;
        trainingLoad.tsb = trainingLoad.ctl - trainingLoad.atl;
      }
      
      trainingLoad.form = trainingLoad.calculateForm();
      trainingLoadData.push(trainingLoad);
      previousTrainingLoad = trainingLoad;
    });
    
    return trainingLoadData;
  }

  /**
   * Generate array of dates between start and end
   */
  static generateDateRange(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date).toISOString().split('T')[0]);
    }
    
    return dates;
  }

  /**
   * Calculate performance trends
   */
  static calculatePerformanceTrends(trainingLoadData, windowSize = 7) {
    if (trainingLoadData.length < windowSize) return [];
    
    const trends = [];
    
    for (let i = windowSize - 1; i < trainingLoadData.length; i++) {
      const window = trainingLoadData.slice(i - windowSize + 1, i + 1);
      
      const avgATL = window.reduce((sum, tl) => sum + tl.atl, 0) / windowSize;
      const avgCTL = window.reduce((sum, tl) => sum + tl.ctl, 0) / windowSize;
      const avgTSB = window.reduce((sum, tl) => sum + tl.tsb, 0) / windowSize;
      const totalTSS = window.reduce((sum, tl) => sum + tl.dailyTSS, 0);
      
      trends.push({
        date: trainingLoadData[i].date,
        avgATL: Math.round(avgATL * 10) / 10,
        avgCTL: Math.round(avgCTL * 10) / 10,
        avgTSB: Math.round(avgTSB * 10) / 10,
        weeklyTSS: totalTSS
      });
    }
    
    return trends;
  }
}

export default TrainingLoadModel;