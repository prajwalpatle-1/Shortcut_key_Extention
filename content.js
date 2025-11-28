
// 1. SETUP: Create an invisible announcer for NVDA (Accessibility)
const announcer = document.createElement('div');
announcer.setAttribute('aria-live', 'assertive');
// CSS to make it invisible but readable by Screen Readers
announcer.style.cssText = 'position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0);';
document.body.appendChild(announcer);

// Helper to make NVDA speak
function speak(msg) {
    announcer.textContent = '';
    setTimeout(() => { announcer.textContent = msg; }, 50);
}

// 2. LISTENER: Watch for key presses on the website
document.addEventListener('keydown', (e) => {
    
    // A. IGNORE typing in search bars, text boxes, etc.
    if (e.target.matches('input, textarea, [contenteditable]')) return;

    // B. IGNORE if the user is just pressing a modifier alone
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    // C. RECONSTRUCT THE KEY COMBO
    // This MUST match the order used in popup.js exactly!
    let combo = [];
    if (e.ctrlKey) combo.push('Ctrl');
    if (e.altKey) combo.push('Alt');
    if (e.shiftKey) combo.push('Shift');
    if (e.metaKey) combo.push('Meta'); 
    
    // Add the specific key (ensure it is uppercase)
    let char = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    combo.push(char);
    
    const pressedString = combo.join('+'); // e.g. "Shift+1"

    // D. CHECK STORAGE & CLICK
    // We look for 'keyConfig' because that is what popup.js saves!
    chrome.storage.local.get(['keyConfig'], (result) => {
        const config = result.keyConfig || [];
        
        // Find if this key combo exists in your saved list
        const match = config.find(item => item.key === pressedString);

        if (match && match.id) {
            e.preventDefault(); // Stop default browser action
            
            const btn = document.querySelector(match.id);
            
            if (btn) {
                btn.click(); // CLICK IT
                speak("Button Clicked"); 
                // console.log("Success: Clicked", match.id);
            } else {
                speak("Error: Button ID not found");
                // console.log("Error: Could not find", match.id);
            }
        }
    });
});