/**
 * Debug script to test modern UI functionality
 */

console.log('🔍 Debug Modern UI Script Loaded');

// Log all JavaScript errors
window.addEventListener('error', (e) => {
    console.error('❌ JavaScript Error:', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error
    });
});

// Log unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Unhandled Promise Rejection:', e.reason);
});

// Monitor modern UI initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded');
    
    // Check if modern UI classes exist
    setTimeout(() => {
        const modernCards = document.querySelectorAll('.card-modern');
        const modernButtons = document.querySelectorAll('.btn-modern');
        const modernInputs = document.querySelectorAll('.input-modern');
        
        console.log('📊 Modern UI Status:', {
            modernCards: modernCards.length,
            modernButtons: modernButtons.length,
            modernInputs: modernInputs.length,
            isUpgraded: window.ModernUIUpgrade ? 'Class Available' : 'Class Not Found'
        });
        
        if (modernCards.length === 0) {
            console.warn('⚠️  No modern cards found - modern UI may not be working');
        }
    }, 2000);
});

// Add visual error indicator
function showErrorIndicator(message) {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #ef4444;
        color: white;
        padding: 10px 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    indicator.textContent = `Error: ${message}`;
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        indicator.remove();
    }, 5000);
}

// Monitor specific modern UI elements
function checkModernUI() {
    const checks = {
        'Card Modern Classes': document.querySelectorAll('.card-modern').length,
        'Button Modern Classes': document.querySelectorAll('.btn-modern').length,
        'Modern Upgraded Cards': document.querySelectorAll('.modern-upgraded').length,
        'Glass Cards': document.querySelectorAll('.glass-card').length,
        'Animate on Scroll': document.querySelectorAll('.animate-on-scroll').length
    };
    
    console.log('🎨 Modern UI Element Count:', checks);
    
    return checks;
}

// Export for console use
window.debugModernUI = {
    checkModernUI,
    showErrorIndicator
};

console.log('✅ Debug Modern UI Script Ready');