/**
 * Segment Editor Component
 * Reusable component for editing workout segments
 */

import { BaseComponent } from './base-component.js';

export class SegmentEditor extends BaseComponent {
  getDefaultOptions() {
    return {
      ...super.getDefaultOptions(),
      editable: true,
      showDuration: true,
      showPower: true,
      showCadence: true,
      validationRules: {
        duration: { min: 1, max: 7200 }, // 1 second to 2 hours
        power: { min: 0, max: 200 }, // 0% to 200% FTP
        cadence: { min: 40, max: 140 }, // 40 to 140 RPM
      },
    };
  }

  initialize() {
    super.initialize();

    this.currentSegment = null;
    this.isEditing = false;
    this.validationErrors = new Map();

    // Create editor structure
    this.createEditorStructure();
  }

  setupEventListeners() {
    super.setupEventListeners();

    // Form submission
    this.element.addEventListener('submit', this.handleSubmit.bind(this));

    // Input validation
    this.element.addEventListener('input', this.handleInput.bind(this));

    // Cancel button
    const cancelBtn = this.element.querySelector('[data-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', this.handleCancel.bind(this));
    }

    // Reset button
    const resetBtn = this.element.querySelector('[data-action="reset"]');
    if (resetBtn) {
      resetBtn.addEventListener('click', this.handleReset.bind(this));
    }
  }

  setupStateBindings() {
    // Subscribe to selected segment changes
    this.subscribe('selectedSegmentIndex', index => {
      this.loadSegment(index);
    });

    // Subscribe to workout changes
    this.subscribe('workout', workout => {
      if (!workout) {
        this.clearEditor();
      }
    });
  }

  createEditorStructure() {
    this.element.innerHTML = `
            <form class="segment-editor-form bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div class="editor-header mb-4">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                        Edit Segment
                    </h3>
                    <div class="segment-info text-sm text-gray-600 dark:text-gray-400">
                        <span data-bind="segment-index">No segment selected</span>
                    </div>
                </div>
                
                <div class="editor-fields space-y-4">
                    <div class="field-group" data-field="duration">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Duration (seconds)
                        </label>
                        <input 
                            type="number" 
                            name="duration" 
                            class="form-input w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            min="1" 
                            max="7200" 
                            step="1"
                            required
                        >
                        <div class="field-error text-red-500 text-sm mt-1 hidden"></div>
                        <div class="field-help text-gray-500 text-xs mt-1">
                            Enter duration in seconds (1-7200)
                        </div>
                    </div>
                    
                    <div class="field-group" data-field="power">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Power (%FTP)
                        </label>
                        <input 
                            type="number" 
                            name="power" 
                            class="form-input w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            min="0" 
                            max="200" 
                            step="1"
                            required
                        >
                        <div class="field-error text-red-500 text-sm mt-1 hidden"></div>
                        <div class="field-help text-gray-500 text-xs mt-1">
                            Power as percentage of FTP (0-200%)
                        </div>
                    </div>
                    
                    <div class="field-group" data-field="cadence">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Cadence (RPM)
                        </label>
                        <input 
                            type="number" 
                            name="cadence" 
                            class="form-input w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            min="40" 
                            max="140" 
                            step="1"
                        >
                        <div class="field-error text-red-500 text-sm mt-1 hidden"></div>
                        <div class="field-help text-gray-500 text-xs mt-1">
                            Target cadence in RPM (40-140, optional)
                        </div>
                    </div>
                    
                    <div class="field-group" data-field="powerLow" style="display: none;">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Power Low (%FTP)
                        </label>
                        <input 
                            type="number" 
                            name="powerLow" 
                            class="form-input w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            min="0" 
                            max="200" 
                            step="1"
                        >
                        <div class="field-error text-red-500 text-sm mt-1 hidden"></div>
                    </div>
                    
                    <div class="field-group" data-field="powerHigh" style="display: none;">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Power High (%FTP)
                        </label>
                        <input 
                            type="number" 
                            name="powerHigh" 
                            class="form-input w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            min="0" 
                            max="200" 
                            step="1"
                        >
                        <div class="field-error text-red-500 text-sm mt-1 hidden"></div>
                    </div>
                </div>
                
                <div class="editor-actions flex gap-2 mt-6">
                    <button 
                        type="submit" 
                        class="btn-primary flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        disabled
                    >
                        Apply Changes
                    </button>
                    <button 
                        type="button" 
                        data-action="cancel"
                        class="btn-secondary px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-gray-500"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        data-action="reset"
                        class="btn-reset px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 focus:ring-2 focus:ring-red-500"
                    >
                        Reset
                    </button>
                </div>
                
                <div class="editor-status mt-4 text-sm text-gray-600 dark:text-gray-400 hidden">
                    <div class="status-message"></div>
                </div>
            </form>
        `;
  }

  loadSegment(segmentIndex) {
    const workout = stateManager.getState('workout');

    if (!workout || segmentIndex === null || segmentIndex < 0) {
      this.clearEditor();
      return;
    }

    const segment = workout.segments?.[segmentIndex];
    if (!segment) {
      this.clearEditor();
      return;
    }

    this.currentSegment = { ...segment };
    this.currentSegmentIndex = segmentIndex;

    // Update segment info
    const segmentInfo = this.element.querySelector(
      '[data-bind="segment-index"]'
    );
    if (segmentInfo) {
      segmentInfo.textContent = `Segment ${segmentIndex + 1}`;
    }

    // Populate form fields
    this.populateForm(segment);

    // Show/hide interval-specific fields
    this.updateFieldVisibility(segment);

    // Enable form
    this.setEditable(this.options.editable);

    this.emit('segment:loaded', { segment, index: segmentIndex });
  }

  populateForm(segment) {
    const form = this.element.querySelector('form');
    const formData = {
      duration: segment.duration || '',
      power: segment.power || '',
      cadence: segment.cadence || '',
      powerLow: segment.powerLow || '',
      powerHigh: segment.powerHigh || '',
    };

    Object.entries(formData).forEach(([field, value]) => {
      const input = form.querySelector(`[name="${field}"]`);
      if (input) {
        input.value = value;
      }
    });

    // Clear any existing validation errors
    this.clearValidationErrors();
  }

  updateFieldVisibility(segment) {
    // Show interval fields for intervals with power ranges
    const hasRange =
      segment.powerLow !== undefined || segment.powerHigh !== undefined;

    const powerLowField = this.element.querySelector('[data-field="powerLow"]');
    const powerHighField = this.element.querySelector(
      '[data-field="powerHigh"]'
    );

    if (powerLowField && powerHighField) {
      powerLowField.style.display = hasRange ? 'block' : 'none';
      powerHighField.style.display = hasRange ? 'block' : 'none';
    }
  }

  handleSubmit(event) {
    event.preventDefault();

    if (!this.currentSegment || this.currentSegmentIndex === null) {
      return;
    }

    const formData = this.getFormData();

    // Validate form data
    if (!this.validateForm(formData)) {
      return;
    }

    // Apply changes
    this.applyChanges(formData);
  }

  handleInput(event) {
    const field = event.target.name;
    const value = event.target.value;

    // Real-time validation
    this.validateField(field, value);

    // Update submit button state
    this.updateSubmitButton();
  }

  handleCancel() {
    this.clearEditor();
    stateManager.dispatch('SELECT_SEGMENT', null);
    this.emit('edit:cancelled');
  }

  handleReset() {
    if (this.currentSegment) {
      this.populateForm(this.currentSegment);
      this.emit('edit:reset');
    }
  }

  getFormData() {
    const form = this.element.querySelector('form');
    const formData = new FormData(form);

    return {
      duration: parseInt(formData.get('duration')) || 0,
      power: parseInt(formData.get('power')) || 0,
      cadence: parseInt(formData.get('cadence')) || null,
      powerLow: parseInt(formData.get('powerLow')) || null,
      powerHigh: parseInt(formData.get('powerHigh')) || null,
    };
  }

  validateForm(data) {
    let isValid = true;

    // Validate each field
    Object.entries(data).forEach(([field, value]) => {
      if (!this.validateField(field, value, true)) {
        isValid = false;
      }
    });

    // Cross-field validation
    if (data.powerLow !== null && data.powerHigh !== null) {
      if (data.powerLow >= data.powerHigh) {
        this.setFieldError(
          'powerHigh',
          'High power must be greater than low power'
        );
        isValid = false;
      }
    }

    return isValid;
  }

  validateField(field, value, showError = false) {
    const rules = this.options.validationRules[field];
    if (!rules) return true;

    let isValid = true;
    let errorMessage = '';

    // Required field validation
    if (rules.required && (value === null || value === '' || value === 0)) {
      isValid = false;
      errorMessage = `${field} is required`;
    }

    // Range validation
    if (value !== null && value !== '') {
      const numValue = parseFloat(value);

      if (rules.min !== undefined && numValue < rules.min) {
        isValid = false;
        errorMessage = `${field} must be at least ${rules.min}`;
      }

      if (rules.max !== undefined && numValue > rules.max) {
        isValid = false;
        errorMessage = `${field} must be no more than ${rules.max}`;
      }
    }

    if (showError || !isValid) {
      if (isValid) {
        this.clearFieldError(field);
      } else {
        this.setFieldError(field, errorMessage);
      }
    }

    return isValid;
  }

  setFieldError(field, message) {
    this.validationErrors.set(field, message);

    const fieldGroup = this.element.querySelector(`[data-field="${field}"]`);
    if (fieldGroup) {
      const input = fieldGroup.querySelector('input');
      const errorDiv = fieldGroup.querySelector('.field-error');

      if (input) {
        input.classList.add('border-red-500', 'focus:ring-red-500');
        input.classList.remove('border-gray-300', 'focus:ring-blue-500');
      }

      if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
      }
    }
  }

  clearFieldError(field) {
    this.validationErrors.delete(field);

    const fieldGroup = this.element.querySelector(`[data-field="${field}"]`);
    if (fieldGroup) {
      const input = fieldGroup.querySelector('input');
      const errorDiv = fieldGroup.querySelector('.field-error');

      if (input) {
        input.classList.remove('border-red-500', 'focus:ring-red-500');
        input.classList.add('border-gray-300', 'focus:ring-blue-500');
      }

      if (errorDiv) {
        errorDiv.classList.add('hidden');
      }
    }
  }

  clearValidationErrors() {
    this.validationErrors.clear();

    this.element.querySelectorAll('.field-error').forEach(errorDiv => {
      errorDiv.classList.add('hidden');
    });

    this.element.querySelectorAll('input').forEach(input => {
      input.classList.remove('border-red-500', 'focus:ring-red-500');
      input.classList.add('border-gray-300', 'focus:ring-blue-500');
    });
  }

  updateSubmitButton() {
    const submitBtn = this.element.querySelector('button[type="submit"]');
    if (submitBtn) {
      const hasErrors = this.validationErrors.size > 0;
      const hasChanges = this.hasChanges();

      submitBtn.disabled = hasErrors || !hasChanges;
    }
  }

  hasChanges() {
    if (!this.currentSegment) return false;

    const currentData = this.getFormData();

    return (
      currentData.duration !== this.currentSegment.duration ||
      currentData.power !== this.currentSegment.power ||
      currentData.cadence !== (this.currentSegment.cadence || null) ||
      currentData.powerLow !== (this.currentSegment.powerLow || null) ||
      currentData.powerHigh !== (this.currentSegment.powerHigh || null)
    );
  }

  applyChanges(formData) {
    if (window.app && typeof window.app.applySegmentEdit === 'function') {
      window.app.applySegmentEdit(
        this.currentSegmentIndex,
        formData.duration,
        formData.power,
        formData.powerLow,
        formData.powerHigh
      );

      this.showStatus('Changes applied successfully', 'success');
      this.emit('changes:applied', {
        segmentIndex: this.currentSegmentIndex,
        changes: formData,
      });
    } else {
      this.showStatus('Failed to apply changes', 'error');
    }
  }

  setEditable(editable) {
    const form = this.element.querySelector('form');
    const inputs = form.querySelectorAll('input, button');

    inputs.forEach(input => {
      if (input.type === 'submit') {
        input.disabled =
          !editable || this.validationErrors.size > 0 || !this.hasChanges();
      } else {
        input.disabled = !editable;
      }
    });
  }

  clearEditor() {
    this.currentSegment = null;
    this.currentSegmentIndex = null;

    // Update segment info
    const segmentInfo = this.element.querySelector(
      '[data-bind="segment-index"]'
    );
    if (segmentInfo) {
      segmentInfo.textContent = 'No segment selected';
    }

    // Clear form
    const form = this.element.querySelector('form');
    if (form) {
      form.reset();
    }

    // Clear validation errors
    this.clearValidationErrors();

    // Disable form
    this.setEditable(false);

    // Hide status
    this.hideStatus();
  }

  showStatus(message, type = 'info') {
    const statusDiv = this.element.querySelector('.editor-status');
    const messageDiv = statusDiv?.querySelector('.status-message');

    if (statusDiv && messageDiv) {
      messageDiv.textContent = message;
      statusDiv.className = `editor-status mt-4 text-sm ${this.getStatusClasses(type)}`;
      statusDiv.classList.remove('hidden');

      // Auto-hide after 3 seconds
      setTimeout(() => {
        this.hideStatus();
      }, 3000);
    }
  }

  hideStatus() {
    const statusDiv = this.element.querySelector('.editor-status');
    if (statusDiv) {
      statusDiv.classList.add('hidden');
    }
  }

  getStatusClasses(type) {
    const classes = {
      success: 'text-green-600 dark:text-green-400',
      error: 'text-red-600 dark:text-red-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      info: 'text-blue-600 dark:text-blue-400',
    };

    return classes[type] || classes.info;
  }
}

export default SegmentEditor;
