import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProfilePage } from '../../src/components/profile/ProfilePage.js';
import { PersonalInfoForm } from '../../src/components/profile/PersonalInfoForm.js';
import { TrainingZones } from '../../src/components/profile/TrainingZones.js';
import { FTPHistory } from '../../src/components/profile/FTPHistory.js';
import { UserPreferences } from '../../src/components/profile/UserPreferences.js';

// Mock DOM environment
Object.defineProperty(window, 'CustomEvent', {
  value: class CustomEvent extends Event {
    constructor(event, params) {
      super(event, params);
      this.detail = params?.detail || {};
    }
  },
});

// Mock stateManager
vi.mock('../../src/services/state-manager.js', () => ({
  stateManager: {
    subscribe: vi.fn(() => vi.fn()), // Return unsubscribe function
    getState: vi.fn(),
    dispatch: vi.fn(),
  },
}));

// Mock profileService
vi.mock('../../src/services/profile-service.js', () => ({
  profileService: {
    getCurrentProfile: vi.fn(),
    getTrainingZones: vi.fn(),
    updateProfile: vi.fn(),
    updateFTP: vi.fn(),
    saveProfilePhoto: vi.fn(),
    exportProfileData: vi.fn(),
  },
}));

describe('Profile Components', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('ProfilePage', () => {
    let profilePage;

    beforeEach(() => {
      profilePage = new ProfilePage(container);
    });

    afterEach(() => {
      if (profilePage) {
        profilePage.destroy();
      }
    });

    it('should initialize with correct default state', () => {
      expect(profilePage.container).toBe(container);
      expect(profilePage.currentTab).toBe('personal');
      expect(profilePage.components).toEqual({});
    });

    it('should render the profile page structure', () => {
      profilePage.render();

      expect(container.innerHTML).toContain('Profile Management');
      expect(container.innerHTML).toContain('personal-tab');
      expect(container.innerHTML).toContain('zones-tab');
      expect(container.innerHTML).toContain('history-tab');
      expect(container.innerHTML).toContain('preferences-tab');
    });

    it('should handle tab switching', () => {
      profilePage.render();

      // Get tab buttons
      const zonesTab = container.querySelector('[data-tab="zones"]');
      expect(zonesTab).toBeTruthy();

      // Click zones tab
      zonesTab.click();

      // Check that zones tab is now active
      expect(zonesTab.classList.contains('active')).toBe(true);
      expect(profilePage.currentTab).toBe('zones');
    });

    it('should initialize child components correctly', () => {
      profilePage.render();

      expect(profilePage.components.personalInfo).toBeInstanceOf(PersonalInfoForm);
      expect(profilePage.components.trainingZones).toBeInstanceOf(TrainingZones);
      expect(profilePage.components.ftpHistory).toBeInstanceOf(FTPHistory);
      expect(profilePage.components.userPreferences).toBeInstanceOf(UserPreferences);
    });

    it('should handle show/hide methods', () => {
      profilePage.render();

      // Initially hidden
      expect(container.style.display).toBe('none');

      // Show profile page
      profilePage.show();
      expect(container.style.display).toBe('block');

      // Hide profile page
      profilePage.hide();
      expect(container.style.display).toBe('none');
    });

    it('should clean up properly on destroy', () => {
      profilePage.render();
      const unsubscribeSpy = vi.fn();
      profilePage.unsubscribeProfile = unsubscribeSpy;

      profilePage.destroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('should handle back navigation', () => {
      const hidePageSpy = vi.spyOn(window, 'dispatchEvent');
      profilePage.render();

      const backBtn = container.querySelector('.back-btn');
      backBtn.click();

      expect(hidePageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'profile:hide',
        })
      );
    });
  });

  describe('PersonalInfoForm', () => {
    let personalInfoForm;

    beforeEach(() => {
      personalInfoForm = new PersonalInfoForm(container);
    });

    afterEach(() => {
      if (personalInfoForm) {
        personalInfoForm.destroy();
      }
    });

    it('should render personal info form', () => {
      personalInfoForm.render();

      expect(container.innerHTML).toContain('Personal Information');
      expect(container.innerHTML).toContain('input[name="name"]');
      expect(container.innerHTML).toContain('input[name="email"]');
      expect(container.innerHTML).toContain('input[name="ftp"]');
      expect(container.innerHTML).toContain('input[name="weight"]');
      expect(container.innerHTML).toContain('input[name="age"]');
    });

    it('should handle form validation', () => {
      personalInfoForm.render();

      const form = container.querySelector('form');
      const nameInput = container.querySelector('input[name="name"]');

      // Test empty name validation
      nameInput.value = '';
      form.dispatchEvent(new Event('submit', { bubbles: true }));

      expect(container.innerHTML).toContain('Name is required');
    });

    it('should handle profile photo upload', () => {
      personalInfoForm.render();

      const photoInput = container.querySelector('.profile-photo-input');
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:image/jpeg;base64,test',
        onload: null,
      };
      vi.spyOn(window, 'FileReader').mockImplementation(() => mockFileReader);

      photoInput.files = [file];
      photoInput.dispatchEvent(new Event('change'));

      // Simulate file load
      mockFileReader.onload();

      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file);
    });

    it('should calculate power-to-weight ratio', () => {
      personalInfoForm.render();

      const ftpInput = container.querySelector('input[name="ftp"]');
      const weightInput = container.querySelector('input[name="weight"]');

      ftpInput.value = '250';
      weightInput.value = '70';

      ftpInput.dispatchEvent(new Event('input'));
      weightInput.dispatchEvent(new Event('input'));

      const powerWeightDisplay = container.querySelector('.power-weight-display');
      expect(powerWeightDisplay?.textContent).toContain('3.57');
    });

    it('should handle auto-save functionality', async () => {
      personalInfoForm.render();

      const nameInput = container.querySelector('input[name="name"]');
      nameInput.value = 'John Doe';

      // Trigger input event
      nameInput.dispatchEvent(new Event('input'));

      // Wait for auto-save timeout
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should have called save function
      expect(personalInfoForm.hasUnsavedChanges).toBe(false);
    });
  });

  describe('TrainingZones', () => {
    let trainingZones;

    beforeEach(() => {
      trainingZones = new TrainingZones(container);
    });

    afterEach(() => {
      if (trainingZones) {
        trainingZones.destroy();
      }
    });

    it('should render no FTP message when FTP is not set', () => {
      trainingZones.currentProfile = null;
      trainingZones.render();

      expect(container.innerHTML).toContain('FTP Required');
      expect(container.innerHTML).toContain('Set FTP');
    });

    it('should render training zones when FTP is available', () => {
      trainingZones.currentProfile = { ftp: 250 };
      trainingZones.trainingZones = {
        ftp: 250,
        zones: {
          zone1: { name: 'Active Recovery', min: 0, max: 0.55, color: '#4CAF50' },
          zone2: { name: 'Endurance', min: 0.56, max: 0.75, color: '#8BC34A' },
        },
        zonesInWatts: {
          zone1: { minWatts: 0, maxWatts: 138 },
          zone2: { minWatts: 140, maxWatts: 188 },
        },
        statistics: {
          totalZones: 7,
          wattsRange: { min: 0, max: 375 },
        },
      };

      trainingZones.render();

      expect(container.innerHTML).toContain('Training Zones');
      expect(container.innerHTML).toContain('Active Recovery');
      expect(container.innerHTML).toContain('0-138W');
      expect(container.innerHTML).toContain('Zone Visualization');
    });

    it('should handle refresh zones action', () => {
      trainingZones.currentProfile = { ftp: 250 };
      trainingZones.render();

      const refreshBtn = container.querySelector('#refreshZonesBtn');
      refreshBtn.click();

      // Should trigger zones update
      expect(trainingZones.trainingZones).toBeDefined();
    });

    it('should handle set FTP button click', () => {
      const eventSpy = vi.spyOn(window, 'dispatchEvent');
      trainingZones.render(); // Renders no FTP message

      const setFTPBtn = container.querySelector('#setFTPBtn');
      setFTPBtn.click();

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'profile:editFTP',
        })
      );
    });

    it('should export zone data correctly', () => {
      trainingZones.currentProfile = { ftp: 250, name: 'John Doe' };
      trainingZones.trainingZones = { ftp: 250 };

      const exportData = trainingZones.exportZoneData();

      expect(exportData).toEqual({
        trainingZones: { ftp: 250 },
        profile: {
          ftp: 250,
          name: 'John Doe',
        },
        exportDate: expect.any(String),
      });
    });
  });

  describe('FTPHistory', () => {
    let ftpHistory;

    beforeEach(() => {
      ftpHistory = new FTPHistory(container);
    });

    afterEach(() => {
      if (ftpHistory) {
        ftpHistory.destroy();
      }
    });

    it('should render FTP history component', () => {
      ftpHistory.render();

      expect(container.innerHTML).toContain('FTP History');
      expect(container.innerHTML).toContain('Add FTP Entry');
      expect(container.innerHTML).toContain('ftp-chart-container');
    });

    it('should handle add FTP entry', async () => {
      ftpHistory.render();

      const ftpInput = container.querySelector('input[name="ftp"]');
      const notesInput = container.querySelector('textarea[name="notes"]');
      const addBtn = container.querySelector('#addFTPBtn');

      ftpInput.value = '275';
      notesInput.value = 'Test improvement';

      addBtn.click();

      // Should call profileService.updateFTP
      expect(ftpHistory.isLoading).toBe(true);
    });

    it('should validate FTP input', () => {
      ftpHistory.render();

      const ftpInput = container.querySelector('input[name="ftp"]');
      const addBtn = container.querySelector('#addFTPBtn');

      ftpInput.value = '-50'; // Invalid FTP
      addBtn.click();

      expect(container.innerHTML).toContain('Please enter a valid FTP value');
    });

    it('should display FTP history list', () => {
      ftpHistory.ftpHistory = [
        {
          id: '1',
          ftp: 275,
          previousFTP: 250,
          date: '2024-01-15',
          notes: 'After training camp',
        },
        {
          id: '2',
          ftp: 250,
          previousFTP: 240,
          date: '2024-01-01',
          notes: 'New year test',
        },
      ];

      ftpHistory.render();

      expect(container.innerHTML).toContain('275W');
      expect(container.innerHTML).toContain('After training camp');
      expect(container.innerHTML).toContain('+25W');
    });

    it('should calculate and display statistics', () => {
      ftpHistory.ftpHistory = [
        { ftp: 240, date: '2023-12-01' },
        { ftp: 250, date: '2024-01-01' },
        { ftp: 275, date: '2024-01-15' },
      ];

      ftpHistory.render();

      expect(container.innerHTML).toContain('275'); // Peak FTP
      expect(container.innerHTML).toContain('255'); // Average FTP
    });
  });

  describe('UserPreferences', () => {
    let userPreferences;

    beforeEach(() => {
      userPreferences = new UserPreferences(container);
    });

    afterEach(() => {
      if (userPreferences) {
        userPreferences.destroy();
      }
    });

    it('should render user preferences form', () => {
      userPreferences.render();

      expect(container.innerHTML).toContain('User Preferences');
      expect(container.innerHTML).toContain('Units & Display');
      expect(container.innerHTML).toContain('Theme Preferences');
      expect(container.innerHTML).toContain('Data & Privacy');
    });

    it('should handle toggle switches', () => {
      userPreferences.render();

      const darkModeToggle = container.querySelector('input[name="darkMode"]');
      expect(darkModeToggle).toBeTruthy();

      darkModeToggle.checked = true;
      darkModeToggle.dispatchEvent(new Event('change'));

      expect(userPreferences.preferences.theme.darkMode).toBe(true);
    });

    it('should handle select dropdowns', () => {
      userPreferences.render();

      const unitsSelect = container.querySelector('select[name="units"]');
      unitsSelect.value = 'imperial';
      unitsSelect.dispatchEvent(new Event('change'));

      expect(userPreferences.preferences.units.system).toBe('imperial');
    });

    it('should handle data export', () => {
      const exportSpy = vi.fn();
      userPreferences.handleDataExport = exportSpy;
      userPreferences.render();

      const exportBtn = container.querySelector('#exportDataBtn');
      exportBtn.click();

      expect(exportSpy).toHaveBeenCalledWith('json');
    });

    it('should handle data import', () => {
      userPreferences.render();

      const importArea = container.querySelector('.import-area');
      const mockFile = new File(['{"test": "data"}'], 'profile.json', { type: 'application/json' });

      // Mock drag and drop
      const dropEvent = new DragEvent('drop');
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { files: [mockFile] },
      });

      importArea.dispatchEvent(dropEvent);

      expect(importArea.classList.contains('drag-over')).toBe(false);
    });

    it('should validate import data', async () => {
      const invalidData = { invalid: 'format' };
      
      const result = await userPreferences.validateImportData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid profile data format');
    });

    it('should save preferences automatically', async () => {
      userPreferences.render();

      const darkModeToggle = container.querySelector('input[name="darkMode"]');
      darkModeToggle.checked = true;
      darkModeToggle.dispatchEvent(new Event('change'));

      // Wait for auto-save
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(userPreferences.hasUnsavedChanges).toBe(false);
    });
  });

  describe('Component Integration', () => {
    it('should handle cross-component communication', () => {
      const profilePage = new ProfilePage(container);
      profilePage.render();

      // Simulate FTP update from PersonalInfoForm
      const ftpUpdateEvent = new CustomEvent('profile:ftpUpdated', {
        detail: { newFTP: 275, oldFTP: 250 },
      });

      window.dispatchEvent(ftpUpdateEvent);

      // Should update training zones and FTP history
      expect(profilePage.components.trainingZones.trainingZones).toBeTruthy();
    });

    it('should handle profile data synchronization', () => {
      const profilePage = new ProfilePage(container);
      profilePage.render();

      // Mock profile update
      const updatedProfile = {
        id: 'profile-123',
        name: 'John Doe Updated',
        ftp: 275,
      };

      profilePage.handleProfileUpdate(updatedProfile);

      // All components should have updated profile
      Object.values(profilePage.components).forEach(component => {
        if (component.currentProfile) {
          expect(component.currentProfile).toEqual(updatedProfile);
        }
      });
    });

    it('should handle error states consistently', () => {
      const profilePage = new ProfilePage(container);
      profilePage.render();

      const error = new Error('Profile update failed');
      profilePage.handleError(error);

      // Should show error message
      expect(container.innerHTML).toContain('error');
    });

    it('should handle loading states', () => {
      const profilePage = new ProfilePage(container);
      profilePage.render();

      profilePage.setLoading(true);

      expect(container.classList.contains('profile-loading')).toBe(true);

      profilePage.setLoading(false);

      expect(container.classList.contains('profile-loading')).toBe(false);
    });
  });
});