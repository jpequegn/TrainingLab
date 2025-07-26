/**
 * Enhanced Error Handling System
 * Provides better user feedback and error recovery
 */

export class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.setupGlobalErrorHandling();
    }

    setupGlobalErrorHandling() {
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'Unhandled Promise Rejection');
            event.preventDefault();
        });

        // Catch JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error, 'JavaScript Error', event.filename, event.lineno);
        });
    }

    handleError(error, context = 'Unknown', filename = '', lineno = 0) {
        const errorInfo = {
            message: error?.message || String(error),
            context,
            filename,
            lineno,
            timestamp: new Date().toISOString(),
            stack: error?.stack
        };

        this.errorLog.push(errorInfo);
        this.showUserFriendlyError(errorInfo);
        console.error('Error handled:', errorInfo);
    }

    showUserFriendlyError(errorInfo) {
        const userMessage = this.createUserFriendlyMessage(errorInfo);
        this.showErrorToast(userMessage.title, userMessage.message, userMessage.type);
    }

    createUserFriendlyMessage(errorInfo) {
        const message = errorInfo.message.toLowerCase();

        // File-related errors
        if (message.includes('file') || message.includes('upload')) {
            return {
                title: '📁 File Error',
                message: 'There was a problem with the file. Please check that it\'s a valid .zwo workout file and try again.',
                type: 'error'
            };
        }

        // Network-related errors
        if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
            return {
                title: '🌐 Network Error',
                message: 'Connection problem detected. Please check your internet connection and try again.',
                type: 'error'
            };
        }

        // Parsing errors
        if (message.includes('parse') || message.includes('xml') || message.includes('invalid')) {
            return {
                title: '⚠️ Workout File Error',
                message: 'The workout file appears to be corrupted or in an unsupported format. Please try a different file.',
                type: 'error'
            };
        }

        // Chart/visualization errors
        if (message.includes('chart') || message.includes('canvas')) {
            return {
                title: '📊 Display Error',
                message: 'There was a problem displaying the workout chart. Try refreshing the page.',
                type: 'error'
            };
        }

        // Export errors
        if (message.includes('export') || message.includes('download')) {
            return {
                title: '💾 Export Error',
                message: 'Failed to export the workout. Please check your browser settings and try again.',
                type: 'error'
            };
        }

        // Generic error
        return {
            title: '❌ Something went wrong',
            message: 'An unexpected error occurred. Please try refreshing the page.',
            type: 'error'
        };
    }

    showErrorToast(title, message, type = 'error', duration = 8000) {
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = `fixed top-4 right-4 max-w-sm w-full bg-white border-l-4 ${
            type === 'error' ? 'border-red-500' : 'border-yellow-500'
        } rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full`;
        
        errorDiv.innerHTML = `
            <div class="p-4">
                <div class="flex items-start">
                    <div class="flex-1">
                        <h4 class="text-sm font-semibold text-gray-900 mb-1">${title}</h4>
                        <p class="text-sm text-gray-600">${message}</p>
                    </div>
                    <button class="ml-4 text-gray-400 hover:text-gray-600 transition-colors" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                ${type === 'error' ? `
                    <div class="mt-3">
                        <button class="text-xs text-gray-500 hover:text-gray-700 underline" onclick="window.errorHandler?.showErrorDetails('${this.errorLog.length - 1}')">
                            Show technical details
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(errorDiv);

        // Animate in
        setTimeout(() => {
            errorDiv.classList.remove('translate-x-full');
        }, 100);

        // Auto-remove after duration
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.classList.add('translate-x-full');
                setTimeout(() => {
                    if (errorDiv.parentNode) {
                        errorDiv.remove();
                    }
                }, 300);
            }
        }, duration);
    }

    showErrorDetails(errorIndex) {
        const error = this.errorLog[errorIndex];
        if (!error) return;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-hidden">
                <div class="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-gray-900">Error Details</h3>
                    <button class="text-gray-400 hover:text-gray-600" onclick="this.closest('.fixed').remove()">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="p-4 overflow-y-auto max-h-80">
                    <div class="space-y-3 text-sm">
                        <div>
                            <strong>Error:</strong> ${error.message}
                        </div>
                        <div>
                            <strong>Context:</strong> ${error.context}
                        </div>
                        <div>
                            <strong>Time:</strong> ${new Date(error.timestamp).toLocaleString()}
                        </div>
                        ${error.filename ? `<div><strong>File:</strong> ${error.filename}:${error.lineno}</div>` : ''}
                        ${error.stack ? `<div><strong>Stack Trace:</strong><pre class="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">${error.stack}</pre></div>` : ''}
                    </div>
                </div>
                <div class="p-4 border-t border-gray-200 bg-gray-50">
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-gray-600">This information can help with troubleshooting</span>
                        <button class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors" onclick="navigator.clipboard?.writeText(JSON.stringify(${JSON.stringify(error)}, null, 2))">
                            Copy Details
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // File validation helpers
    validateWorkoutFile(file) {
        const errors = [];

        if (!file) {
            errors.push('No file selected');
            return { valid: false, errors };
        }

        if (!file.name.toLowerCase().endsWith('.zwo')) {
            errors.push('File must have a .zwo extension');
        }

        if (file.size === 0) {
            errors.push('File is empty');
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            errors.push('File is too large (maximum 10MB)');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Network operation wrapper with error handling
    async safeNetworkOperation(operation, operationName) {
        try {
            this.showLoadingState(operationName);
            const result = await operation();
            this.hideLoadingState();
            return result;
        } catch (error) {
            this.hideLoadingState();
            this.handleError(error, `Network Operation: ${operationName}`);
            throw error;
        }
    }

    showLoadingState(operationName) {
        const toast = document.getElementById('toastNotification');
        if (toast) {
            const span = toast.querySelector('span');
            if (span) {
                span.innerHTML = `<div class="flex items-center"><div class="spinner mr-2"></div>${operationName}...</div>`;
                toast.classList.add('show');
            }
        }
    }

    hideLoadingState() {
        const toast = document.getElementById('toastNotification');
        if (toast) {
            toast.classList.remove('show');
        }
    }

    // Success message helper
    showSuccess(message, duration = 3000) {
        this.showErrorToast('✅ Success', message, 'success', duration);
    }

    // Warning message helper
    showWarning(message, duration = 5000) {
        this.showErrorToast('⚠️ Warning', message, 'warning', duration);
    }

    // Get error statistics
    getErrorStats() {
        const total = this.errorLog.length;
        const recent = this.errorLog.filter(e => Date.now() - new Date(e.timestamp).getTime() < 300000).length; // Last 5 minutes
        
        return { total, recent };
    }

    // Clear error log
    clearErrorLog() {
        this.errorLog = [];
    }
}

// Initialize error handler when module loads
let errorHandler;
document.addEventListener('DOMContentLoaded', () => {
    errorHandler = new ErrorHandler();
    // Make it globally accessible for error detail viewing
    window.errorHandler = errorHandler;
});

export { errorHandler };