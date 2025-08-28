/**
 * Keyboard Shortcuts System
 * Provides keyboard shortcuts for common actions
 */

export class ShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.initializeShortcuts();
    this.bindEventListeners();
    this.showShortcutsHelp = false;
  }

  initializeShortcuts() {
    // Define keyboard shortcuts
    this.shortcuts.set('KeyO', {
      key: 'o',
      description: 'Open file dialog',
      action: () => this.triggerFileInput(),
    });

    this.shortcuts.set('KeyS', {
      key: 's',
      description: 'Load sample workout',
      action: () => this.triggerSampleLoad(),
    });

    this.shortcuts.set('KeyE', {
      key: 'e',
      description: 'Export to ERG',
      action: () => this.triggerERGExport(),
    });

    this.shortcuts.set('KeyM', {
      key: 'm',
      description: 'Export to MRC',
      action: () => this.triggerMRCExport(),
    });

    this.shortcuts.set('KeyR', {
      key: 'r',
      description: 'Reset workout',
      action: () => this.triggerReset(),
    });

    this.shortcuts.set('KeyT', {
      key: 't',
      description: 'Toggle theme (light/dark)',
      action: () => this.toggleTheme(),
    });

    this.shortcuts.set('KeyZ', {
      key: 'z',
      description: 'Undo last edit',
      action: () => this.triggerUndo(),
    });

    this.shortcuts.set('Slash', {
      key: '?',
      description: 'Show keyboard shortcuts',
      action: () => this.toggleShortcutsHelp(),
    });

    this.shortcuts.set('Escape', {
      key: 'Esc',
      description: 'Close dialogs/help',
      action: () => this.closeDialogs(),
    });
  }

  bindEventListeners() {
    document.addEventListener('keydown', e => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Handle Ctrl/Cmd + key combinations
      if (e.ctrlKey || e.metaKey) {
        const shortcut = this.shortcuts.get(e.code);
        if (shortcut) {
          e.preventDefault();
          shortcut.action();
        }
      }

      // Handle standalone keys
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.code === 'Slash' && e.shiftKey) {
          // ? key
          e.preventDefault();
          this.toggleShortcutsHelp();
        } else if (e.code === 'Escape') {
          this.closeDialogs();
        }
      }
    });
  }

  triggerFileInput() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.click();
    }
  }

  triggerSampleLoad() {
    const sampleButton = document.getElementById('loadSample');
    if (sampleButton) {
      sampleButton.click();
    }
  }

  triggerERGExport() {
    const ergButton = document.getElementById('exportERG');
    if (ergButton && !ergButton.disabled) {
      ergButton.click();
    }
  }

  triggerMRCExport() {
    const mrcButton = document.getElementById('exportMRC');
    if (mrcButton && !mrcButton.disabled) {
      mrcButton.click();
    }
  }

  triggerReset() {
    const resetButton = document.getElementById('resetWorkout');
    if (resetButton && !resetButton.disabled) {
      resetButton.click();
    }
  }

  triggerUndo() {
    const undoButton = document.getElementById('undoEditBtn');
    if (undoButton && undoButton.style.display !== 'none') {
      undoButton.click();
    }
  }

  toggleTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.click();
    }
  }

  closeDialogs() {
    // Close shortcuts help if open
    if (this.showShortcutsHelp) {
      this.toggleShortcutsHelp();
    }

    // Close segment edit box if open
    const segmentEditBox = document.getElementById('segmentEditBox');
    if (segmentEditBox && segmentEditBox.style.display !== 'none') {
      segmentEditBox.style.display = 'none';
    }
  }

  toggleShortcutsHelp() {
    this.showShortcutsHelp = !this.showShortcutsHelp;

    if (this.showShortcutsHelp) {
      this.showShortcutsDialog();
    } else {
      this.hideShortcutsDialog();
    }
  }

  showShortcutsDialog() {
    // Remove existing dialog if present
    this.hideShortcutsDialog();

    const dialog = document.createElement('div');
    dialog.id = 'shortcutsDialog';
    dialog.className =
      'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    dialog.innerHTML = `
            <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-xl font-bold text-gray-800">Keyboard Shortcuts</h3>
                    <button id="closeShortcuts" class="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors">
                        ✕
                    </button>
                </div>
                <div class="space-y-3">
                    ${Array.from(this.shortcuts.entries())
                      .map(
                        ([code, shortcut]) => `
                        <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                            <span class="text-gray-600">${shortcut.description}</span>
                            <kbd class="px-2 py-1 bg-gray-100 rounded text-sm font-mono text-gray-700">
                                ${code === 'Slash' ? '?' : `Ctrl+${shortcut.key.toUpperCase()}`}
                            </kbd>
                        </div>
                    `
                      )
                      .join('')}
                </div>
                <div class="mt-6 text-center">
                    <p class="text-xs text-gray-500">Press <kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> to close</p>
                </div>
            </div>
        `;

    document.body.appendChild(dialog);

    // Add event listeners
    document.getElementById('closeShortcuts').addEventListener('click', () => {
      this.toggleShortcutsHelp();
    });

    dialog.addEventListener('click', e => {
      if (e.target === dialog) {
        this.toggleShortcutsHelp();
      }
    });
  }

  hideShortcutsDialog() {
    const dialog = document.getElementById('shortcutsDialog');
    if (dialog) {
      dialog.remove();
    }
  }

  // Show a brief notification about shortcuts on first visit
  showShortcutsHint() {
    const hasShownHint = localStorage.getItem('shortcuts-hint-shown');
    if (!hasShownHint) {
      setTimeout(() => {
        this.showToast('💡 Press Ctrl+? to see keyboard shortcuts', 4000);
        localStorage.setItem('shortcuts-hint-shown', 'true');
      }, 3000);
    }
  }

  showToast(message, duration = 3000) {
    const toast = document.getElementById('toastNotification');
    if (toast) {
      const span = toast.querySelector('span');
      if (span) {
        span.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
          toast.classList.remove('show');
        }, duration);
      }
    }
  }
}

// Initialize shortcuts manager when module loads
let shortcutManager;
document.addEventListener('DOMContentLoaded', () => {
  shortcutManager = new ShortcutManager();
  // Show hint after a delay
  shortcutManager.showShortcutsHint();
});

export { shortcutManager };
