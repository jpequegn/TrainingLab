/**
 * Personal Information Form Component
 * Handles user profile data input and validation
 */

import { profileService } from '../../services/profile-service.js';
import { stateManager } from '../../services/state-manager.js';

export class PersonalInfoForm {
  constructor(container) {
    this.container = container;
    this.currentProfile = null;
    this.isEditing = false;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handlePhotoUpload = this.handlePhotoUpload.bind(this);
    this.validateForm = this.validateForm.bind(this);

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
   * Render the personal info form
   */
  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="card-modern p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-nebula-h3 font-semibold text-foreground">
              Personal Information
            </h3>
            <p class="text-nebula-small text-muted-foreground">
              Manage your profile and training data
            </p>
          </div>
          ${this.currentProfile && !this.isEditing ? `
            <button
              id="editProfileBtn"
              class="btn-modern btn-outline h-9 px-3"
            >
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              Edit
            </button>
          ` : ''}
        </div>

        ${this.renderForm()}

        ${this.renderProfilePhoto()}
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render the form section
   */
  renderForm() {
    const profile = this.currentProfile || {};
    const isDisabled = this.currentProfile && !this.isEditing;

    return `
      <form id="personalInfoForm" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Name -->
          <div>
            <label for="name" class="block text-nebula-small font-medium text-foreground mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value="${profile.name || ''}"
              ${isDisabled ? 'disabled' : ''}
              class="input-modern w-full ${isDisabled ? 'opacity-60' : ''}"
              placeholder="Enter your full name"
              required
            />
          </div>

          <!-- Email -->
          <div>
            <label for="email" class="block text-nebula-small font-medium text-foreground mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value="${profile.email || ''}"
              ${isDisabled ? 'disabled' : ''}
              class="input-modern w-full ${isDisabled ? 'opacity-60' : ''}"
              placeholder="your.email@example.com"
              required
            />
          </div>

          <!-- Age -->
          <div>
            <label for="age" class="block text-nebula-small font-medium text-foreground mb-2">
              Age
            </label>
            <input
              type="number"
              id="age"
              name="age"
              value="${profile.age || ''}"
              ${isDisabled ? 'disabled' : ''}
              class="input-modern w-full ${isDisabled ? 'opacity-60' : ''}"
              placeholder="25"
              min="10"
              max="100"
            />
          </div>

          <!-- Weight -->
          <div>
            <label for="weight" class="block text-nebula-small font-medium text-foreground mb-2">
              Weight (kg)
            </label>
            <input
              type="number"
              id="weight"
              name="weight"
              value="${profile.weight || ''}"
              ${isDisabled ? 'disabled' : ''}
              class="input-modern w-full ${isDisabled ? 'opacity-60' : ''}"
              placeholder="70"
              min="30"
              max="200"
              step="0.1"
            />
          </div>

          <!-- FTP -->
          <div>
            <label for="ftp" class="block text-nebula-small font-medium text-foreground mb-2">
              FTP (Watts)
              <span class="text-muted-foreground">*</span>
            </label>
            <input
              type="number"
              id="ftp"
              name="ftp"
              value="${profile.ftp || 250}"
              ${isDisabled ? 'disabled' : ''}
              class="input-modern w-full ${isDisabled ? 'opacity-60' : ''}"
              placeholder="250"
              min="50"
              max="600"
              required
            />
          </div>

          <!-- Units -->
          <div>
            <label for="units" class="block text-nebula-small font-medium text-foreground mb-2">
              Units
            </label>
            <select
              id="units"
              name="units"
              ${isDisabled ? 'disabled' : ''}
              class="input-modern w-full ${isDisabled ? 'opacity-60' : ''}"
            >
              <option value="metric" ${(profile.units || 'metric') === 'metric' ? 'selected' : ''}>
                Metric (kg, km, °C)
              </option>
              <option value="imperial" ${profile.units === 'imperial' ? 'selected' : ''}>
                Imperial (lbs, miles, °F)
              </option>
            </select>
          </div>
        </div>

        ${profile.ftp ? this.renderPowerToWeightRatio(profile) : ''}

        <!-- Form Actions -->
        <div class="flex items-center justify-end space-x-3 pt-4 border-t border-border">
          ${this.renderFormActions()}
        </div>

        <!-- Form Validation -->
        <div id="formValidation" class="hidden">
          <div class="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              <span class="text-sm font-medium">Please check the following:</span>
            </div>
            <ul id="validationErrors" class="list-disc list-inside text-sm mt-2 space-y-1"></ul>
          </div>
        </div>
      </form>
    `;
  }

  /**
   * Render power-to-weight ratio if data is available
   */
  renderPowerToWeightRatio(profile) {
    if (!profile.ftp || !profile.weight) return '';

    const powerToWeight = (profile.ftp / profile.weight).toFixed(2);
    let rating = '';
    let color = '';

    if (powerToWeight < 2.5) {
      rating = 'Recreational';
      color = 'text-blue-600';
    } else if (powerToWeight < 3.5) {
      rating = 'Fair';
      color = 'text-green-600';
    } else if (powerToWeight < 4.5) {
      rating = 'Good';
      color = 'text-yellow-600';
    } else if (powerToWeight < 5.5) {
      rating = 'Very Good';
      color = 'text-orange-600';
    } else {
      rating = 'Excellent';
      color = 'text-red-600';
    }

    return `
      <div class="bg-muted/50 p-4 rounded-md mt-4">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-nebula-small font-medium text-foreground">
              Power-to-Weight Ratio
            </span>
            <div class="flex items-center space-x-2 mt-1">
              <span class="text-lg font-bold text-foreground">${powerToWeight}</span>
              <span class="text-nebula-small text-muted-foreground">W/kg</span>
              <span class="text-nebula-small font-medium ${color}">${rating}</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-nebula-small text-muted-foreground">FTP</div>
            <div class="font-semibold text-foreground">${profile.ftp}W</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render form actions based on current state
   */
  renderFormActions() {
    if (!this.currentProfile) {
      // New profile creation
      return `
        <button
          type="submit"
          class="btn-modern h-10 px-6"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Create Profile
        </button>
      `;
    } else if (this.isEditing) {
      // Editing existing profile
      return `
        <button
          type="button"
          id="cancelBtn"
          class="btn-modern btn-outline h-10 px-4"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn-modern h-10 px-6"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Save Changes
        </button>
      `;
    } else {
      // Read-only view
      return `
        <div class="text-nebula-small text-muted-foreground">
          <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Click Edit to modify your information
        </div>
      `;
    }
  }

  /**
   * Render profile photo section
   */
  renderProfilePhoto() {
    const profile = this.currentProfile || {};
    
    return `
      <div class="border-t border-border pt-6 mt-6">
        <h4 class="text-nebula-h3 font-medium text-foreground mb-4">Profile Photo</h4>
        <div class="flex items-center space-x-4">
          <div class="w-20 h-20 bg-muted rounded-full overflow-hidden flex items-center justify-center">
            ${profile.profilePhoto ? `
              <img
                src="${profile.profilePhoto}"
                alt="Profile photo"
                class="w-full h-full object-cover"
              />
            ` : `
              <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            `}
          </div>
          <div class="flex-1">
            <input
              type="file"
              id="profilePhotoInput"
              accept="image/*"
              class="hidden"
            />
            <button
              type="button"
              id="uploadPhotoBtn"
              class="btn-modern btn-outline h-9 px-3"
              ${this.currentProfile && !this.isEditing ? 'disabled' : ''}
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              ${profile.profilePhoto ? 'Change Photo' : 'Upload Photo'}
            </button>
            ${profile.profilePhoto ? `
              <button
                type="button"
                id="removePhotoBtn"
                class="ml-2 btn-modern btn-outline text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground h-9 px-3"
                ${this.currentProfile && !this.isEditing ? 'disabled' : ''}
              >
                Remove
              </button>
            ` : ''}
            <p class="text-nebula-small text-muted-foreground mt-1">
              Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const form = document.getElementById('personalInfoForm');
    const editBtn = document.getElementById('editProfileBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
    const removePhotoBtn = document.getElementById('removePhotoBtn');
    const photoInput = document.getElementById('profilePhotoInput');

    if (form) {
      form.addEventListener('submit', this.handleSubmit);
    }

    if (editBtn) {
      editBtn.addEventListener('click', this.handleEdit);
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', this.handleCancel);
    }

    if (uploadPhotoBtn) {
      uploadPhotoBtn.addEventListener('click', () => {
        photoInput?.click();
      });
    }

    if (photoInput) {
      photoInput.addEventListener('change', this.handlePhotoUpload);
    }

    if (removePhotoBtn) {
      removePhotoBtn.addEventListener('click', () => {
        this.handlePhotoRemove();
      });
    }
  }

  /**
   * Handle form submission
   */
  async handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const profileData = {
      name: formData.get('name'),
      email: formData.get('email'),
      age: formData.get('age') ? parseInt(formData.get('age')) : null,
      weight: formData.get('weight') ? parseFloat(formData.get('weight')) : null,
      ftp: parseInt(formData.get('ftp')),
      units: formData.get('units'),
    };

    // Validate form
    const validation = this.validateForm(profileData);
    if (!validation.isValid) {
      this.showValidationErrors(validation.errors);
      return;
    }

    this.hideValidationErrors();

    try {
      if (this.currentProfile) {
        // Update existing profile
        await profileService.updateProfile(profileData);
        this.isEditing = false;
      } else {
        // Create new profile
        await profileService.createProfile(profileData);
      }

      // Show success message
      this.showSuccessMessage(
        this.currentProfile ? 'Profile updated successfully!' : 'Profile created successfully!'
      );

    } catch (error) {
      console.error('Failed to save profile:', error);
      this.showValidationErrors([error.message]);
    }
  }

  /**
   * Handle edit button click
   */
  handleEdit() {
    this.isEditing = true;
    this.render();
  }

  /**
   * Handle cancel button click
   */
  handleCancel() {
    this.isEditing = false;
    this.render();
  }

  /**
   * Handle photo upload
   */
  async handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await profileService.updateProfilePhoto(file);
      this.showSuccessMessage('Profile photo updated successfully!');
    } catch (error) {
      console.error('Failed to upload photo:', error);
      this.showValidationErrors([error.message]);
    }
  }

  /**
   * Handle photo removal
   */
  async handlePhotoRemove() {
    try {
      await profileService.updateProfile({ profilePhoto: null });
      this.showSuccessMessage('Profile photo removed successfully!');
    } catch (error) {
      console.error('Failed to remove photo:', error);
      this.showValidationErrors([error.message]);
    }
  }

  /**
   * Validate form data
   */
  validateForm(data) {
    const errors = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!data.email || data.email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!data.ftp || data.ftp < 50 || data.ftp > 600) {
      errors.push('FTP must be between 50 and 600 watts');
    }

    if (data.age !== null && (data.age < 10 || data.age > 100)) {
      errors.push('Age must be between 10 and 100 years');
    }

    if (data.weight !== null && (data.weight < 30 || data.weight > 200)) {
      errors.push('Weight must be between 30 and 200 kg');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Show validation errors
   */
  showValidationErrors(errors) {
    const validationDiv = document.getElementById('formValidation');
    const errorsList = document.getElementById('validationErrors');

    if (validationDiv && errorsList) {
      errorsList.innerHTML = errors
        .map(error => `<li>${error}</li>`)
        .join('');
      validationDiv.classList.remove('hidden');
    }
  }

  /**
   * Hide validation errors
   */
  hideValidationErrors() {
    const validationDiv = document.getElementById('formValidation');
    if (validationDiv) {
      validationDiv.classList.add('hidden');
    }
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    // Use existing toast system if available
    if (window.app?.ui?.showToast) {
      window.app.ui.showToast(message, 'success');
    } else {
      alert(message); // Fallback
    }
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