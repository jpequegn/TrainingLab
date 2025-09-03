/**
 * Quick Settings Component Tests
 * Testing the QuickSettings functionality for issue #121
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Setup global mocks first (before imports)
vi.mock('../../src/services/state-manager.js', () => ({
  stateManager: {
    subscribe: vi.fn(() => vi.fn()), // Returns unsubscribe function
    dispatch: vi.fn()
  }
}));

vi.mock('../../src/services/profile-service.js', () => ({
  profileService: {
    getPreferences: vi.fn(),
    updatePreferences: vi.fn()
  }
}));

// Import after mocks are set up
import { QuickSettings } from '../../src/components/QuickSettings.js';
import { stateManager } from '../../src/services/state-manager.js';
import { profileService } from '../../src/services/profile-service.js';

// Mock DOM methods
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

global.document.dispatchEvent = vi.fn();
global.window.dispatchEvent = vi.fn();

describe('QuickSettings', () => {
  let container;
  let quickSettings;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create container element
    container = document.createElement('div');
    container.id = 'quickSettingsContainer';
    document.body.appendChild(container);

    // Mock profile service responses
    profileService.getPreferences.mockResolvedValue({
      theme: 'light',
      units: 'metric',
      powerDisplay: 'ftp-percentage'
    });
    profileService.updatePreferences.mockResolvedValue();

    // Mock localStorage
    window.localStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    // Clean up
    if (quickSettings) {
      quickSettings.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create QuickSettings component', () => {
      quickSettings = new QuickSettings(container);
      expect(quickSettings).toBeInstanceOf(QuickSettings);
    });

    it('should render the quick settings button', () => {
      quickSettings = new QuickSettings(container);
      const button = container.querySelector('#quickSettingsBtn');
      expect(button).not.toBeNull();
      expect(button.getAttribute('title')).toBe('Quick Settings');
    });

    it('should render the dropdown with correct structure', () => {
      quickSettings = new QuickSettings(container);
      const dropdown = container.querySelector('#quickSettingsDropdown');
      expect(dropdown).not.toBeNull();
      expect(dropdown.style.display).toBe('none'); // Initially hidden
    });

    it('should render all three setting controls', () => {
      quickSettings = new QuickSettings(container);
      
      const themeSelect = container.querySelector('#quickThemeSelect');
      const unitsSelect = container.querySelector('#quickUnitsSelect');
      const powerDisplaySelect = container.querySelector('#quickPowerDisplaySelect');
      
      expect(themeSelect).not.toBeNull();
      expect(unitsSelect).not.toBeNull();
      expect(powerDisplaySelect).not.toBeNull();
    });

    it('should load current preferences on initialization', () => {
      quickSettings = new QuickSettings(container);
      expect(profileService.getPreferences).toHaveBeenCalled();
    });
  });

  describe('Theme Selection', () => {
    beforeEach(() => {
      quickSettings = new QuickSettings(container);
    });

    it('should have correct theme options', () => {
      const themeSelect = container.querySelector('#quickThemeSelect');
      const options = Array.from(themeSelect.options).map(opt => opt.value);
      expect(options).toEqual(['light', 'dark', 'auto']);
    });

    it('should set light theme as default', () => {
      const themeSelect = container.querySelector('#quickThemeSelect');
      expect(themeSelect.value).toBe('light');
    });

    it('should handle theme change', async () => {
      const themeSelect = container.querySelector('#quickThemeSelect');
      
      // Change theme to dark
      themeSelect.value = 'dark';
      const event = new Event('change');
      themeSelect.dispatchEvent(event);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(profileService.updatePreferences).toHaveBeenCalledWith({
        theme: 'dark'
      });
      expect(stateManager.dispatch).toHaveBeenCalledWith('SET_THEME', 'dark');
    });

    it('should apply theme to document element', () => {
      // Spy on classList methods
      const addSpy = vi.spyOn(document.documentElement.classList, 'add');
      const removeSpy = vi.spyOn(document.documentElement.classList, 'remove');

      quickSettings.applyTheme('dark');

      expect(removeSpy).toHaveBeenCalledWith('dark', 'light');
      expect(addSpy).toHaveBeenCalledWith('dark');
    });
  });

  describe('Units Selection', () => {
    beforeEach(() => {
      quickSettings = new QuickSettings(container);
    });

    it('should have correct units options', () => {
      const unitsSelect = container.querySelector('#quickUnitsSelect');
      const options = Array.from(unitsSelect.options).map(opt => opt.value);
      expect(options).toEqual(['metric', 'imperial']);
    });

    it('should handle units change', async () => {
      const unitsSelect = container.querySelector('#quickUnitsSelect');
      
      unitsSelect.value = 'imperial';
      const event = new Event('change');
      unitsSelect.dispatchEvent(event);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(profileService.updatePreferences).toHaveBeenCalledWith({
        units: 'imperial'
      });
      
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'preferences:unitsChanged',
          detail: { units: 'imperial' }
        })
      );
    });
  });

  describe('Power Display Selection', () => {
    beforeEach(() => {
      quickSettings = new QuickSettings(container);
    });

    it('should have correct power display options', () => {
      const powerDisplaySelect = container.querySelector('#quickPowerDisplaySelect');
      const options = Array.from(powerDisplaySelect.options).map(opt => opt.value);
      expect(options).toEqual(['ftp-percentage', 'watts', 'both']);
    });

    it('should handle power display change', async () => {
      const powerDisplaySelect = container.querySelector('#quickPowerDisplaySelect');
      
      powerDisplaySelect.value = 'watts';
      const event = new Event('change');
      powerDisplaySelect.dispatchEvent(event);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(profileService.updatePreferences).toHaveBeenCalledWith({
        powerDisplay: 'watts'
      });
    });
  });

  describe('Dropdown Behavior', () => {
    beforeEach(() => {
      quickSettings = new QuickSettings(container);
    });

    it('should toggle dropdown on button click', () => {
      const button = container.querySelector('#quickSettingsBtn');
      const dropdown = container.querySelector('#quickSettingsDropdown');

      // Initially closed
      expect(dropdown.style.display).toBe('none');
      expect(button.getAttribute('aria-expanded')).toBe('false');

      // Open dropdown
      button.click();
      expect(dropdown.style.display).toBe('block');
      expect(button.getAttribute('aria-expanded')).toBe('true');

      // Close dropdown
      button.click();
      expect(dropdown.style.display).toBe('none');
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    it('should close dropdown when clicking outside', () => {
      const button = container.querySelector('#quickSettingsBtn');
      const dropdown = container.querySelector('#quickSettingsDropdown');

      // Open dropdown
      button.click();
      expect(dropdown.style.display).toBe('block');

      // Click outside
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);
      outsideElement.click();

      expect(dropdown.style.display).toBe('none');
    });

    it('should close dropdown on escape key', () => {
      const button = container.querySelector('#quickSettingsBtn');
      const dropdown = container.querySelector('#quickSettingsDropdown');

      // Open dropdown
      button.click();
      expect(dropdown.style.display).toBe('block');

      // Press escape
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(dropdown.style.display).toBe('none');
    });
  });

  describe('All Settings Button', () => {
    beforeEach(() => {
      quickSettings = new QuickSettings(container);
      
      // Mock the preferences button
      const mockPreferencesBtn = document.createElement('button');
      mockPreferencesBtn.id = 'preferencesBtn';
      mockPreferencesBtn.click = vi.fn();
      document.body.appendChild(mockPreferencesBtn);
    });

    it('should navigate to full preferences when clicked', () => {
      const allSettingsBtn = container.querySelector('#allSettingsBtn');
      const preferencesBtn = document.getElementById('preferencesBtn');

      allSettingsBtn.click();

      expect(preferencesBtn.click).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      quickSettings = new QuickSettings(container);
    });

    it('should handle profile service errors gracefully', async () => {
      // Make profile service fail
      profileService.updatePreferences.mockRejectedValue(new Error('Network error'));

      const themeSelect = container.querySelector('#quickThemeSelect');
      themeSelect.value = 'dark';
      const event = new Event('change');
      
      // Should not throw error
      expect(() => themeSelect.dispatchEvent(event)).not.toThrow();
      
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should fallback to localStorage
      expect(window.localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    });

    it('should use default values when preferences loading fails', async () => {
      profileService.getPreferences.mockRejectedValue(new Error('Failed to load'));
      
      const newQuickSettings = new QuickSettings(container);
      
      // Should use defaults
      expect(newQuickSettings.currentTheme).toBe('light');
      expect(newQuickSettings.currentUnits).toBe('metric');
      expect(newQuickSettings.currentPowerDisplay).toBe('ftp-percentage');
    });
  });
});