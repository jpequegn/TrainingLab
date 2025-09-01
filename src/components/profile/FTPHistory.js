/**
 * FTP History Component
 * Displays and manages FTP history with visualization
 */

import { profileService } from '../../services/profile-service.js';
import { stateManager } from '../../services/state-manager.js';

export class FTPHistory {
  constructor(container) {
    this.container = container;
    this.currentProfile = null;
    this.ftpHistory = [];
    this.chart = null;
    this.showingAddForm = false;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.renderChart = this.renderChart.bind(this);
    this.handleAddFTP = this.handleAddFTP.bind(this);
    this.toggleAddForm = this.toggleAddForm.bind(this);

    // Subscribe to profile and FTP history changes
    this.unsubscribeProfile = stateManager.subscribe(
      'userProfile',
      this.handleProfileUpdate.bind(this),
      { immediate: true }
    );

    this.unsubscribeFTPHistory = stateManager.subscribe(
      'ftpHistory',
      this.handleFTPHistoryUpdate.bind(this),
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
   * Handle FTP history updates from state
   */
  handleFTPHistoryUpdate(ftpHistory) {
    this.ftpHistory = ftpHistory || [];
    this.render();
  }

  /**
   * Render the FTP history component
   */
  render() {
    if (!this.container) return;

    if (!this.currentProfile) {
      this.renderNoProfile();
      return;
    }

    this.container.innerHTML = `
      <div class="card-modern p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-nebula-h3 font-semibold text-foreground">
              FTP History
            </h3>
            <p class="text-nebula-small text-muted-foreground">
              Track your Functional Threshold Power over time
            </p>
          </div>
          <button
            id="addFTPBtn"
            class="btn-modern h-10 px-4"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Add FTP Test
          </button>
        </div>

        ${this.renderCurrentFTP()}
        ${this.renderAddForm()}
        ${this.renderChart()}
        ${this.renderHistoryList()}
        ${this.renderStatistics()}
      </div>
    `;

    this.attachEventListeners();
    
    // Render chart after DOM is ready
    setTimeout(() => {
      this.renderChart();
    }, 100);
  }

  /**
   * Render no profile message
   */
  renderNoProfile() {
    this.container.innerHTML = `
      <div class="card-modern p-6">
        <div class="text-center py-8">
          <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          <h3 class="text-nebula-h3 font-semibold text-foreground mb-2">
            Profile Required
          </h3>
          <p class="text-nebula-body text-muted-foreground">
            Please create a profile to track your FTP history.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Render current FTP display
   */
  renderCurrentFTP() {
    const currentFTP = this.currentProfile?.ftp || 250;
    const latestEntry = this.ftpHistory[0]; // History is sorted by date desc
    const previousFTP = this.ftpHistory[1]?.ftpValue;
    
    let changeIndicator = '';
    if (previousFTP) {
      const change = currentFTP - previousFTP;
      const changePercent = ((change / previousFTP) * 100).toFixed(1);
      
      if (change > 0) {
        changeIndicator = `
          <div class="flex items-center text-green-600 text-nebula-small">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 17l9.2-9.2M17 17V7H7"></path>
            </svg>
            +${change}W (+${changePercent}%)
          </div>
        `;
      } else if (change < 0) {
        changeIndicator = `
          <div class="flex items-center text-red-600 text-nebula-small">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 7l-9.2 9.2M7 7v10h10"></path>
            </svg>
            ${change}W (${changePercent}%)
          </div>
        `;
      }
    }

    return `
      <div class="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 p-6 rounded-md mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-nebula-small font-medium text-muted-foreground mb-1">
              Current FTP
            </h4>
            <div class="text-3xl font-bold text-foreground">${currentFTP}W</div>
            ${changeIndicator}
          </div>
          <div class="text-right">
            <div class="text-nebula-small text-muted-foreground">Last Updated</div>
            <div class="font-medium text-foreground">
              ${latestEntry ? this.formatDate(latestEntry.date) : 'Never'}
            </div>
            ${latestEntry ? `
              <div class="text-nebula-small text-muted-foreground capitalize">
                ${this.formatSource(latestEntry.source)}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render add FTP form
   */
  renderAddForm() {
    if (!this.showingAddForm) return '';

    return `
      <div class="bg-muted/50 p-4 rounded-md mb-6">
        <form id="addFTPForm" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="ftpValue" class="block text-nebula-small font-medium text-foreground mb-2">
                FTP Value (watts) *
              </label>
              <input
                type="number"
                id="ftpValue"
                name="ftpValue"
                class="input-modern w-full"
                placeholder="280"
                min="50"
                max="600"
                required
              />
            </div>
            <div>
              <label for="testDate" class="block text-nebula-small font-medium text-foreground mb-2">
                Test Date
              </label>
              <input
                type="date"
                id="testDate"
                name="testDate"
                class="input-modern w-full"
                value="${new Date().toISOString().split('T')[0]}"
              />
            </div>
            <div>
              <label for="ftpSource" class="block text-nebula-small font-medium text-foreground mb-2">
                Source
              </label>
              <select id="ftpSource" name="ftpSource" class="input-modern w-full">
                <option value="test">FTP Test</option>
                <option value="estimate">Estimate</option>
                <option value="manual">Manual Entry</option>
                <option value="ramp_test">Ramp Test</option>
                <option value="20min_test">20min Test</option>
              </select>
            </div>
          </div>
          <div class="flex items-center justify-end space-x-3">
            <button
              type="button"
              id="cancelAddFTPBtn"
              class="btn-modern btn-outline h-9 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn-modern h-9 px-4"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Add Entry
            </button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Render FTP history chart
   */
  renderChart() {
    if (this.ftpHistory.length === 0) {
      return '';
    }

    const chartHTML = `
      <div class="mb-6">
        <h4 class="text-nebula-h3 font-medium text-foreground mb-4">FTP Progress Chart</h4>
        <div class="bg-muted/50 p-4 rounded-md">
          <canvas id="ftpChart" class="w-full h-64"></canvas>
        </div>
      </div>
    `;

    // Check if chart container already exists and update it
    const existingChartContainer = this.container.querySelector('#ftpChart')?.parentElement?.parentElement;
    if (existingChartContainer) {
      existingChartContainer.outerHTML = chartHTML;
    } else {
      // Add chart HTML to appropriate position
      const historySection = this.container.querySelector('.history-list-container');
      if (historySection) {
        historySection.insertAdjacentHTML('beforebegin', chartHTML);
      }
    }

    this.createChart();
  }

  /**
   * Create Chart.js chart
   */
  createChart() {
    const canvas = document.getElementById('ftpChart');
    if (!canvas || this.ftpHistory.length === 0) return;

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const ctx = canvas.getContext('2d');
    
    // Prepare data (reverse for chronological order)
    const data = [...this.ftpHistory].reverse();
    const labels = data.map(entry => this.formatDate(entry.date, true));
    const values = data.map(entry => entry.ftpValue);

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'FTP (watts)',
          data: values,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: 'white',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
            },
            ticks: {
              font: {
                size: 11,
              },
            },
            title: {
              display: true,
              text: 'FTP (watts)',
              font: {
                size: 12,
                weight: 'bold',
              },
            },
          },
          x: {
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
            },
            ticks: {
              font: {
                size: 11,
              },
              maxRotation: 45,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              afterLabel: (context) => {
                const index = context.dataIndex;
                const entry = data[index];
                return `Source: ${this.formatSource(entry.source)}`;
              },
            },
          },
        },
        elements: {
          point: {
            hoverBackgroundColor: 'rgb(59, 130, 246)',
          },
        },
      },
    });
  }

  /**
   * Render history list
   */
  renderHistoryList() {
    if (this.ftpHistory.length === 0) {
      return `
        <div class="history-list-container">
          <h4 class="text-nebula-h3 font-medium text-foreground mb-4">History</h4>
          <div class="text-center py-8 bg-muted/50 rounded-md">
            <div class="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <p class="text-muted-foreground">No FTP history yet</p>
            <p class="text-nebula-small text-muted-foreground">Add your first FTP test to track progress</p>
          </div>
        </div>
      `;
    }

    const historyItems = this.ftpHistory.map((entry, index) => {
      const isLatest = index === 0;
      const previousEntry = this.ftpHistory[index + 1];
      let changeIndicator = '';
      
      if (previousEntry) {
        const change = entry.ftpValue - previousEntry.ftpValue;
        if (change > 0) {
          changeIndicator = `
            <span class="text-green-600 text-nebula-small">
              +${change}W
            </span>
          `;
        } else if (change < 0) {
          changeIndicator = `
            <span class="text-red-600 text-nebula-small">
              ${change}W
            </span>
          `;
        }
      }

      return `
        <div class="bg-white dark:bg-slate-800/50 p-4 rounded-md border border-border ${isLatest ? 'ring-2 ring-primary/20' : ''}">
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center space-x-2">
                <span class="text-lg font-bold text-foreground">${entry.ftpValue}W</span>
                ${isLatest ? '<span class="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">Current</span>' : ''}
                ${changeIndicator}
              </div>
              <div class="text-nebula-small text-muted-foreground">
                ${this.formatDate(entry.date)} • ${this.formatSource(entry.source)}
              </div>
            </div>
            <div class="text-right">
              <button
                class="text-muted-foreground hover:text-foreground"
                title="Delete entry"
                onclick="ftpHistoryComponent.deleteEntry('${entry.id}')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="history-list-container mb-6">
        <h4 class="text-nebula-h3 font-medium text-foreground mb-4">History</h4>
        <div class="space-y-3 max-h-96 overflow-y-auto">
          ${historyItems}
        </div>
      </div>
    `;
  }

  /**
   * Render statistics
   */
  renderStatistics() {
    if (this.ftpHistory.length < 2) return '';

    const values = this.ftpHistory.map(entry => entry.ftpValue);
    const maxFTP = Math.max(...values);
    const minFTP = Math.min(...values);
    const totalGain = values[0] - values[values.length - 1]; // Latest - oldest
    const avgGain = totalGain / (this.ftpHistory.length - 1);

    return `
      <div>
        <h4 class="text-nebula-h3 font-medium text-foreground mb-4">Statistics</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-muted/50 p-4 rounded-md text-center">
            <div class="text-lg font-bold text-foreground">${maxFTP}W</div>
            <div class="text-nebula-small text-muted-foreground">Peak FTP</div>
          </div>
          <div class="bg-muted/50 p-4 rounded-md text-center">
            <div class="text-lg font-bold text-foreground">${minFTP}W</div>
            <div class="text-nebula-small text-muted-foreground">Lowest FTP</div>
          </div>
          <div class="bg-muted/50 p-4 rounded-md text-center">
            <div class="text-lg font-bold ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}">
              ${totalGain >= 0 ? '+' : ''}${totalGain}W
            </div>
            <div class="text-nebula-small text-muted-foreground">Total Gain</div>
          </div>
          <div class="bg-muted/50 p-4 rounded-md text-center">
            <div class="text-lg font-bold ${avgGain >= 0 ? 'text-green-600' : 'text-red-600'}">
              ${avgGain >= 0 ? '+' : ''}${avgGain.toFixed(1)}W
            </div>
            <div class="text-nebula-small text-muted-foreground">Avg per Test</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const addFTPBtn = document.getElementById('addFTPBtn');
    const cancelAddFTPBtn = document.getElementById('cancelAddFTPBtn');
    const addFTPForm = document.getElementById('addFTPForm');

    if (addFTPBtn) {
      addFTPBtn.addEventListener('click', this.toggleAddForm);
    }

    if (cancelAddFTPBtn) {
      cancelAddFTPBtn.addEventListener('click', this.toggleAddForm);
    }

    if (addFTPForm) {
      addFTPForm.addEventListener('submit', this.handleAddFTP);
    }

    // Make component globally accessible for delete functionality
    window.ftpHistoryComponent = this;
  }

  /**
   * Toggle add FTP form visibility
   */
  toggleAddForm() {
    this.showingAddForm = !this.showingAddForm;
    this.render();
  }

  /**
   * Handle adding new FTP entry
   */
  async handleAddFTP(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const ftpValue = parseInt(formData.get('ftpValue'));
    const testDate = new Date(formData.get('testDate'));
    const source = formData.get('ftpSource');

    // Validation
    if (!ftpValue || ftpValue < 50 || ftpValue > 600) {
      alert('Please enter a valid FTP between 50 and 600 watts');
      return;
    }

    try {
      await profileService.addFTPEntry(ftpValue, testDate, source);
      
      // Update current profile FTP if this is the latest entry
      const latestEntry = stateManager.getState('ftpHistory')?.[0];
      if (latestEntry && latestEntry.ftpValue === ftpValue) {
        await profileService.updateProfile({ ftp: ftpValue });
      }

      this.showingAddForm = false;
      this.showSuccessMessage('FTP entry added successfully!');
      
    } catch (error) {
      console.error('Failed to add FTP entry:', error);
      alert(`Failed to add FTP entry: ${error.message}`);
    }
  }

  /**
   * Delete FTP entry
   */
  async deleteEntry(entryId) {
    if (!confirm('Are you sure you want to delete this FTP entry?')) {
      return;
    }

    try {
      // This would need to be implemented in the profile service
      // For now, just show a message
      alert('Delete functionality would be implemented here');
    } catch (error) {
      console.error('Failed to delete FTP entry:', error);
      alert(`Failed to delete FTP entry: ${error.message}`);
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString, short = false) {
    const date = new Date(dateString);
    if (short) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
      });
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Format source for display
   */
  formatSource(source) {
    const sourceMap = {
      test: 'FTP Test',
      estimate: 'Estimate',
      manual: 'Manual',
      ramp_test: 'Ramp Test',
      '20min_test': '20min Test',
      profile_creation: 'Profile Creation',
      manual_update: 'Manual Update',
      import: 'Import',
    };
    return sourceMap[source] || source;
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    if (window.app?.ui?.showToast) {
      window.app.ui.showToast(message, 'success');
    } else {
      alert(message);
    }
  }

  /**
   * Export FTP history data
   */
  exportData() {
    return {
      profile: {
        name: this.currentProfile?.name,
        currentFTP: this.currentProfile?.ftp,
      },
      ftpHistory: this.ftpHistory,
      exportDate: new Date().toISOString(),
    };
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    
    if (this.unsubscribeProfile) {
      this.unsubscribeProfile();
    }
    
    if (this.unsubscribeFTPHistory) {
      this.unsubscribeFTPHistory();
    }
    
    // Clean up global reference
    if (window.ftpHistoryComponent === this) {
      delete window.ftpHistoryComponent;
    }
  }
}