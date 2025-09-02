/**
 * FTP Test Calculator Component
 * Interactive calculators for advanced FTP testing protocols
 */

import { profileService } from '../../services/profile-service.js';
import { stateManager } from '../../services/state-manager.js';

export class FTPTestCalculator {
  constructor(container) {
    this.container = container;
    this.currentProfile = null;
    this.activeProtocol = null;
    this.testResults = {};

    // Bind methods
    this.render = this.render.bind(this);
    this.handleProtocolSelect = this.handleProtocolSelect.bind(this);
    this.calculateFTP = this.calculateFTP.bind(this);

    // Subscribe to profile changes
    this.unsubscribeProfile = stateManager.subscribe(
      'userProfile',
      this.handleProfileUpdate.bind(this),
      { immediate: true }
    );
  }

  /**
   * Handle profile updates from state
   */
  handleProfileUpdate(profile) {
    this.currentProfile = profile;
    this.render();
  }

  /**
   * Render the FTP test calculator component
   */
  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="card-modern p-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h3 class="text-nebula-h3 font-semibold text-foreground">
              FTP Test Calculator
            </h3>
            <p class="text-nebula-small text-muted-foreground">
              Calculate your FTP using various testing protocols
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <button
              id="testHistoryBtn"
              class="btn-modern btn-outline h-9 px-3 w-full sm:w-auto"
              title="View Test History"
            >
              <svg class="w-4 h-4 mr-1 sm:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="sm:hidden ml-1">History</span>
            </button>
          </div>
        </div>

        ${this.renderProtocolSelector()}
        ${this.renderActiveProtocol()}
        ${this.renderTestResults()}
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render protocol selector
   */
  renderProtocolSelector() {
    const protocols = this.getTestProtocols();

    return `
      <div class="mb-6">
        <h4 class="text-nebula-h3 font-medium text-foreground mb-4">Select Test Protocol</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${Object.entries(protocols)
            .map(
              ([key, protocol]) => `
            <button
              class="protocol-btn p-4 border border-border rounded-md text-left hover:border-primary hover:bg-primary/5 transition-colors ${this.activeProtocol === key ? 'border-primary bg-primary/10' : ''}"
              data-protocol="${key}"
            >
              <div class="flex items-center justify-between mb-2">
                <h5 class="font-semibold text-foreground">${protocol.name}</h5>
                <div class="text-xs bg-muted px-2 py-1 rounded-full">
                  ${protocol.duration}
                </div>
              </div>
              <p class="text-nebula-small text-muted-foreground mb-2">
                ${protocol.description}
              </p>
              <div class="text-xs text-primary font-medium">
                Accuracy: ${protocol.accuracy} • Difficulty: ${protocol.difficulty}
              </div>
            </button>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render active protocol calculator
   */
  renderActiveProtocol() {
    if (!this.activeProtocol) {
      return `
        <div class="text-center py-8 bg-muted/50 rounded-md mb-6">
          <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h4 class="text-nebula-h3 font-semibold text-foreground mb-2">Select a Test Protocol</h4>
          <p class="text-nebula-body text-muted-foreground">
            Choose a testing protocol above to calculate your FTP
          </p>
        </div>
      `;
    }

    const protocol = this.getTestProtocols()[this.activeProtocol];

    switch (this.activeProtocol) {
      case 'ramp':
        return this.renderRampTestCalculator(protocol);
      case '20min':
        return this.render20MinTestCalculator(protocol);
      case '8min':
        return this.render8MinTestCalculator(protocol);
      case 'cp':
        return this.renderCriticalPowerCalculator(protocol);
      case 'frc':
        return this.renderFRCCalculator(protocol);
      default:
        return '';
    }
  }

  /**
   * Render ramp test calculator
   */
  renderRampTestCalculator(protocol) {
    return `
      <div class="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 p-6 rounded-md mb-6">
        <h4 class="text-lg font-semibold text-foreground mb-4">${protocol.name}</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 class="font-medium text-foreground mb-3">Test Instructions:</h5>
            <ol class="text-nebula-small text-muted-foreground space-y-2">
              <li>1. Warm up for 10-15 minutes at easy pace</li>
              <li>2. Start at ${protocol.startPower}W (or 50% of current FTP)</li>
              <li>3. Increase power by ${protocol.increment}W every minute</li>
              <li>4. Continue until exhaustion (unable to maintain power)</li>
              <li>5. Record your final completed step power</li>
            </ol>
          </div>
          <div>
            <div class="space-y-4">
              <div>
                <label class="block text-nebula-small font-medium text-foreground mb-2">
                  Final Completed Step (watts)
                </label>
                <input
                  type="number"
                  id="rampFinalPower"
                  class="input-modern w-full"
                  placeholder="300"
                  min="100"
                  max="800"
                />
              </div>
              <div>
                <label class="block text-nebula-small font-medium text-foreground mb-2">
                  Weight (kg) - optional for power/weight
                </label>
                <input
                  type="number"
                  id="rampWeight"
                  class="input-modern w-full"
                  placeholder="${this.currentProfile?.weight || 70}"
                  min="40"
                  max="150"
                  step="0.1"
                />
              </div>
              <button
                id="calculateRampBtn"
                class="btn-modern w-full h-10"
              >
                Calculate FTP
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render 20-minute test calculator
   */
  render20MinTestCalculator(protocol) {
    return `
      <div class="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 p-6 rounded-md mb-6">
        <h4 class="text-lg font-semibold text-foreground mb-4">${protocol.name}</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 class="font-medium text-foreground mb-3">Test Instructions:</h5>
            <ol class="text-nebula-small text-muted-foreground space-y-2">
              <li>1. Warm up for 20 minutes with some efforts</li>
              <li>2. Do a 5-minute all-out effort</li>
              <li>3. Recover for 10 minutes</li>
              <li>4. Perform 20-minute all-out time trial</li>
              <li>5. Record average power for the 20 minutes</li>
            </ol>
          </div>
          <div>
            <div class="space-y-4">
              <div>
                <label class="block text-nebula-small font-medium text-foreground mb-2">
                  20-Minute Average Power (watts)
                </label>
                <input
                  type="number"
                  id="twentyMinPower"
                  class="input-modern w-full"
                  placeholder="280"
                  min="100"
                  max="600"
                />
              </div>
              <div>
                <label class="block text-nebula-small font-medium text-foreground mb-2">
                  Normalization Factor
                </label>
                <select id="twentyMinFactor" class="input-modern w-full">
                  <option value="0.95">0.95 (Standard)</option>
                  <option value="0.93">0.93 (Conservative)</option>
                  <option value="0.97">0.97 (Aggressive)</option>
                </select>
              </div>
              <button
                id="calculate20MinBtn"
                class="btn-modern w-full h-10"
              >
                Calculate FTP
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render 8-minute test calculator
   */
  render8MinTestCalculator(protocol) {
    return `
      <div class="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50 p-6 rounded-md mb-6">
        <h4 class="text-lg font-semibold text-foreground mb-4">${protocol.name}</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 class="font-medium text-foreground mb-3">Test Instructions:</h5>
            <ol class="text-nebula-small text-muted-foreground space-y-2">
              <li>1. Warm up thoroughly for 15-20 minutes</li>
              <li>2. Perform first 8-minute all-out effort</li>
              <li>3. Recover for 10 minutes at easy pace</li>
              <li>4. Perform second 8-minute all-out effort</li>
              <li>5. Record average power for both efforts</li>
            </ol>
          </div>
          <div>
            <div class="space-y-4">
              <div>
                <label class="block text-nebula-small font-medium text-foreground mb-2">
                  First 8-Min Average Power (watts)
                </label>
                <input
                  type="number"
                  id="eightMin1Power"
                  class="input-modern w-full"
                  placeholder="290"
                  min="100"
                  max="600"
                />
              </div>
              <div>
                <label class="block text-nebula-small font-medium text-foreground mb-2">
                  Second 8-Min Average Power (watts)
                </label>
                <input
                  type="number"
                  id="eightMin2Power"
                  class="input-modern w-full"
                  placeholder="285"
                  min="100"
                  max="600"
                />
              </div>
              <button
                id="calculate8MinBtn"
                class="btn-modern w-full h-10"
              >
                Calculate FTP
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render critical power calculator
   */
  renderCriticalPowerCalculator(protocol) {
    return `
      <div class="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50 p-6 rounded-md mb-6">
        <h4 class="text-lg font-semibold text-foreground mb-4">${protocol.name}</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 class="font-medium text-foreground mb-3">Test Instructions:</h5>
            <ol class="text-nebula-small text-muted-foreground space-y-2">
              <li>1. Perform these tests on separate days</li>
              <li>2. Do a 3-minute all-out effort</li>
              <li>3. Do a 12-minute all-out effort</li>
              <li>4. Record average power for each effort</li>
              <li>5. Critical Power = your sustainable power</li>
            </ol>
          </div>
          <div>
            <div class="space-y-4">
              <div>
                <label class="block text-nebula-small font-medium text-foreground mb-2">
                  3-Minute Average Power (watts)
                </label>
                <input
                  type="number"
                  id="cp3MinPower"
                  class="input-modern w-full"
                  placeholder="350"
                  min="100"
                  max="800"
                />
              </div>
              <div>
                <label class="block text-nebula-small font-medium text-foreground mb-2">
                  12-Minute Average Power (watts)
                </label>
                <input
                  type="number"
                  id="cp12MinPower"
                  class="input-modern w-full"
                  placeholder="290"
                  min="100"
                  max="600"
                />
              </div>
              <button
                id="calculateCPBtn"
                class="btn-modern w-full h-10"
              >
                Calculate Critical Power
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render FRC calculator
   */
  renderFRCCalculator(protocol) {
    return `
      <div class="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50 p-6 rounded-md mb-6">
        <h4 class="text-lg font-semibold text-foreground mb-4">${protocol.name}</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 class="font-medium text-foreground mb-3">Test Instructions:</h5>
            <ol class="text-nebula-small text-muted-foreground space-y-2">
              <li>1. You need your Critical Power first</li>
              <li>2. Perform a 3-minute all-out effort</li>
              <li>3. Calculate work done above CP</li>
              <li>4. FRC = anaerobic work capacity</li>
              <li>5. Provides training zones precision</li>
            </ol>
          </div>
          <div>
            <div class="space-y-4">
              <div>
                <label class="block text-nebula-small font-medium text-foreground mb-2">
                  Critical Power (watts)
                </label>
                <input
                  type="number"
                  id="frcCriticalPower"
                  class="input-modern w-full"
                  placeholder="280"
                  min="100"
                  max="500"
                />
              </div>
              <div>
                <label class="block text-nebula-small font-medium text-foreground mb-2">
                  3-Min Test Average Power (watts)
                </label>
                <input
                  type="number"
                  id="frc3MinPower"
                  class="input-modern w-full"
                  placeholder="350"
                  min="150"
                  max="800"
                />
              </div>
              <button
                id="calculateFRCBtn"
                class="btn-modern w-full h-10"
              >
                Calculate FRC
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render test results
   */
  renderTestResults() {
    if (!this.testResults.ftp) return '';

    const results = this.testResults;

    return `
      <div class="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 p-6 rounded-md">
        <h4 class="text-lg font-semibold text-foreground mb-4">Test Results</h4>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div class="text-center">
            <div class="text-3xl font-bold text-foreground mb-2">
              ${results.ftp}W
            </div>
            <div class="text-nebula-small text-muted-foreground">
              Calculated FTP
            </div>
          </div>
          
          ${
            results.powerToWeight
              ? `
            <div class="text-center">
              <div class="text-3xl font-bold text-foreground mb-2">
                ${results.powerToWeight}
              </div>
              <div class="text-nebula-small text-muted-foreground">
                W/kg Ratio
              </div>
            </div>
          `
              : ''
          }
          
          ${
            results.frc
              ? `
            <div class="text-center">
              <div class="text-3xl font-bold text-foreground mb-2">
                ${results.frc}kJ
              </div>
              <div class="text-nebula-small text-muted-foreground">
                FRC Capacity
              </div>
            </div>
          `
              : ''
          }
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="bg-white dark:bg-slate-800/50 p-4 rounded-md">
            <h5 class="font-semibold text-foreground mb-2">Comparison</h5>
            ${
              this.currentProfile?.ftp
                ? `
              <div class="text-nebula-small text-muted-foreground">
                Current FTP: ${this.currentProfile.ftp}W
                <br>
                Change: ${results.ftp - this.currentProfile.ftp > 0 ? '+' : ''}${results.ftp - this.currentProfile.ftp}W
                (${(((results.ftp - this.currentProfile.ftp) / this.currentProfile.ftp) * 100).toFixed(1)}%)
              </div>
            `
                : `
              <div class="text-nebula-small text-muted-foreground">
                This will be your first recorded FTP value
              </div>
            `
            }
          </div>
          
          <div class="bg-white dark:bg-slate-800/50 p-4 rounded-md">
            <h5 class="font-semibold text-foreground mb-2">Reliability</h5>
            <div class="text-nebula-small text-muted-foreground">
              Protocol: ${results.protocol}<br>
              Accuracy: ${results.accuracy}<br>
              Confidence: ${results.confidence}
            </div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            id="discardResultsBtn"
            class="btn-modern btn-outline h-10 px-4 w-full sm:w-auto"
          >
            Discard
          </button>
          <button
            id="saveResultsBtn"
            class="btn-modern h-10 px-4 w-full sm:w-auto"
          >
            Save to Profile
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Get available test protocols
   */
  getTestProtocols() {
    return {
      ramp: {
        name: 'Ramp Test',
        description:
          'Incremental test starting easy and increasing power every minute until exhaustion',
        duration: '8-25 min',
        accuracy: 'High',
        difficulty: 'Medium',
        startPower: 100,
        increment: 20,
      },
      '20min': {
        name: '20-Minute Test',
        description:
          'Classic 20-minute all-out time trial with 95% normalization factor',
        duration: '20 min',
        accuracy: 'Very High',
        difficulty: 'Hard',
      },
      '8min': {
        name: '8-Minute Test (2x8)',
        description:
          'Two 8-minute all-out efforts with 10-minute recovery between',
        duration: '2x8 min',
        accuracy: 'High',
        difficulty: 'Very Hard',
      },
      cp: {
        name: 'Critical Power',
        description:
          'Mathematical model using 3-min and 12-min all-out efforts',
        duration: '3+12 min',
        accuracy: 'Very High',
        difficulty: 'Hard',
      },
      frc: {
        name: 'FRC Test',
        description:
          'Functional Reserve Capacity - measures anaerobic work capacity',
        duration: '3 min',
        accuracy: 'High',
        difficulty: 'Very Hard',
      },
    };
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Protocol selection
    document.querySelectorAll('.protocol-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const { protocol } = e.currentTarget.dataset;
        this.handleProtocolSelect(protocol);
      });
    });

    // Calculator buttons
    document
      .getElementById('calculateRampBtn')
      ?.addEventListener('click', () => {
        this.calculateRampTest();
      });

    document
      .getElementById('calculate20MinBtn')
      ?.addEventListener('click', () => {
        this.calculate20MinTest();
      });

    document
      .getElementById('calculate8MinBtn')
      ?.addEventListener('click', () => {
        this.calculate8MinTest();
      });

    document.getElementById('calculateCPBtn')?.addEventListener('click', () => {
      this.calculateCriticalPower();
    });

    document
      .getElementById('calculateFRCBtn')
      ?.addEventListener('click', () => {
        this.calculateFRC();
      });

    // Results buttons
    document.getElementById('saveResultsBtn')?.addEventListener('click', () => {
      this.saveResults();
    });

    document
      .getElementById('discardResultsBtn')
      ?.addEventListener('click', () => {
        this.discardResults();
      });
  }

  /**
   * Handle protocol selection
   */
  handleProtocolSelect(protocol) {
    this.activeProtocol = protocol;
    this.testResults = {};
    this.render();
  }

  /**
   * Calculate ramp test FTP
   */
  calculateRampTest() {
    const finalPower = parseInt(
      document.getElementById('rampFinalPower').value
    );
    const weight = parseFloat(document.getElementById('rampWeight').value);

    if (!finalPower || finalPower < 100) {
      alert('Please enter a valid final step power (minimum 100W)');
      return;
    }

    // Ramp test FTP = 75% of final step power
    const ftp = Math.round(finalPower * 0.75);
    const protocol = this.getTestProtocols().ramp;

    this.testResults = {
      ftp,
      protocol: protocol.name,
      accuracy: protocol.accuracy,
      confidence: 'High',
      powerToWeight: weight ? (ftp / weight).toFixed(1) : null,
      source: 'ramp_test',
      rawData: { finalPower, weight },
    };

    this.render();
  }

  /**
   * Calculate 20-minute test FTP
   */
  calculate20MinTest() {
    const avgPower = parseInt(document.getElementById('twentyMinPower').value);
    const factor = parseFloat(document.getElementById('twentyMinFactor').value);

    if (!avgPower || avgPower < 100) {
      alert('Please enter a valid 20-minute average power (minimum 100W)');
      return;
    }

    const ftp = Math.round(avgPower * factor);
    const protocol = this.getTestProtocols()['20min'];

    this.testResults = {
      ftp,
      protocol: protocol.name,
      accuracy: protocol.accuracy,
      confidence: 'Very High',
      source: '20min_test',
      rawData: { avgPower, factor },
    };

    this.render();
  }

  /**
   * Calculate 8-minute test FTP
   */
  calculate8MinTest() {
    const power1 = parseInt(document.getElementById('eightMin1Power').value);
    const power2 = parseInt(document.getElementById('eightMin2Power').value);

    if (!power1 || !power2 || power1 < 100 || power2 < 100) {
      alert('Please enter valid power values for both efforts (minimum 100W)');
      return;
    }

    // Average of both efforts, then 90% normalization
    const avgPower = (power1 + power2) / 2;
    const ftp = Math.round(avgPower * 0.9);
    const protocol = this.getTestProtocols()['8min'];

    this.testResults = {
      ftp,
      protocol: protocol.name,
      accuracy: protocol.accuracy,
      confidence: 'High',
      source: '8min_test',
      rawData: { power1, power2, avgPower },
    };

    this.render();
  }

  /**
   * Calculate critical power
   */
  calculateCriticalPower() {
    const power3min = parseInt(document.getElementById('cp3MinPower').value);
    const power12min = parseInt(document.getElementById('cp12MinPower').value);

    if (!power3min || !power12min || power3min < 150 || power12min < 100) {
      alert('Please enter valid power values for both efforts');
      return;
    }

    if (power3min <= power12min) {
      alert('3-minute power should be higher than 12-minute power');
      return;
    }

    // Critical Power calculation: CP = (W2*T2 - W1*T1) / (T2 - T1)
    // Simplified: CP ≈ 12-min power (close approximation)
    const cp = Math.round(power12min);

    // FRC = (W1 - CP) * T1 (work above CP in 3-min test)
    const frc = Math.round(((power3min - cp) * 180) / 1000); // Convert to kJ

    const protocol = this.getTestProtocols().cp;

    this.testResults = {
      ftp: cp, // CP is essentially FTP
      protocol: protocol.name,
      accuracy: protocol.accuracy,
      confidence: 'Very High',
      frc: frc,
      source: 'cp_test',
      rawData: { power3min, power12min },
    };

    this.render();
  }

  /**
   * Calculate FRC
   */
  calculateFRC() {
    const cp = parseInt(document.getElementById('frcCriticalPower').value);
    const power3min = parseInt(document.getElementById('frc3MinPower').value);

    if (!cp || !power3min || cp < 100 || power3min < 150) {
      alert('Please enter valid Critical Power and 3-minute test power values');
      return;
    }

    if (power3min <= cp) {
      alert('3-minute test power should be higher than Critical Power');
      return;
    }

    // FRC = (W - CP) * T (work above CP in 3-min test)
    const frc = Math.round(((power3min - cp) * 180) / 1000); // Convert to kJ
    const protocol = this.getTestProtocols().frc;

    this.testResults = {
      ftp: cp, // Use the provided CP as FTP
      protocol: protocol.name,
      accuracy: protocol.accuracy,
      confidence: 'High',
      frc: frc,
      source: 'frc_test',
      rawData: { cp, power3min },
    };

    this.render();
  }

  /**
   * Save results to profile
   */
  async saveResults() {
    if (!this.testResults.ftp) return;

    try {
      const testDate = new Date();
      await profileService.addFTPEntry(
        this.testResults.ftp,
        testDate,
        this.testResults.source
      );

      // Update current profile FTP
      await profileService.updateProfile({
        ftp: this.testResults.ftp,
      });

      // Show success message
      if (window.app?.ui?.showToast) {
        window.app.ui.showToast(
          `FTP updated to ${this.testResults.ftp}W using ${this.testResults.protocol}`,
          'success'
        );
      }

      // Clear results
      this.testResults = {};
      this.activeProtocol = null;
      this.render();
    } catch (error) {
      console.error('Failed to save FTP results:', error);
      alert(`Failed to save results: ${error.message}`);
    }
  }

  /**
   * Discard current results
   */
  discardResults() {
    this.testResults = {};
    this.render();
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.unsubscribeProfile) {
      this.unsubscribeProfile();
    }
  }
}
