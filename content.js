// content.js - Key Listener, Element Picker & Domain Locking

// --- GLOBAL VARIABLES ---
let siteConfig = [];
let pickingMode = false;
let lastHighlighted = null;
let currentLang = 'en';


// --- PART 1: NVDA ANNOUNCER (For Accessibility) ---
const announcer = document.createElement('div');
announcer.setAttribute('aria-live', 'assertive');
announcer.style.cssText = 'position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0);';
document.body.appendChild(announcer);

function speak(msg) {
    announcer.textContent = '';
    setTimeout(() => { announcer.textContent = msg; }, 50);
}

// Translate Helper 
function t(key) {
    return TRANSLATIONS[currentLang][key] || TRANSLATIONS['en'][key];
}

// --- LOAD DATA & DETECT LANG ---
function loadConfig() {
    if (!chrome.runtime?.id) return; 
    const currentDomain = window.location.hostname;

    chrome.storage.local.get([currentDomain, 'appLanguage'], (result) => {
        siteConfig = result[currentDomain] || [];

        if (result.appLanguage) {
            currentLang = result.appLanguage;
            console.log("Content Script: Loaded saved language:", currentLang);
        } 
        else {
            const browserLang = navigator.language.split('-')[0];
            if (typeof TRANSLATIONS !== 'undefined'&& TRANSLATIONS[browserLang]) {
                currentLang = browserLang;
            }
            else {
                currentLang = 'en';
            }
            console.log("Content Script: Auto-detected language:", currentLang);
        }
    });
}
loadConfig();
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "changeLanguage") {
        currentLang = request.language;
        console.log("Language manually changed to:", currentLang);
        const msgText=t('langChanged')
        speak(msgText);
        showToast(msgText);
        sendResponse({ status: "success" });
    }
    if (request.action === "togglePicker") {
        enablePicker();
        sendResponse({ status: "ok" });
    }
    return true;
});

chrome.storage.onChanged.addListener((changes) => {
    const currentDomain = window.location.hostname;
    if (changes[currentDomain]) siteConfig= changes[currentDomain].newValue || [];

    if (changes.appLanguage) currentLang = changes.appLanguage.newValue || 'en';
});

// --- PART 2: KEY SHORTCUT LISTENER ---
document.addEventListener('keydown', (e) => {
    
    if (pickingMode) return; // Don't trigger shortcuts while picking!
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    let combo = [];
    if (e.ctrlKey) combo.push('Ctrl');
    if (e.altKey) combo.push('Alt');
    if (e.shiftKey) combo.push('Shift');
    if (e.metaKey) combo.push('Meta');
    let char = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    combo.push(char);
    
    const pressedString = combo.join('+');
    
    const match = siteConfig.find(item => item.key === pressedString);

    if (match && match.id) {
        e.preventDefault();
        e.stopPropagation();

        const btn = document.querySelector(match.id);
        if (btn) {
            btn.click();
            btn.focus();
            speak("Clicked");
            const originalOutline = btn.style.outline;
            btn.style.outline = "3px solid yellow";
            setTimeout(() => btn.style.outline = originalOutline, 200);
        } 
        else {
            console.log("Button not found:", match.id);
            speak("Button not found on this page");
        }
    }
});

// --- PART 4: PICKER MODE ---
let pickerOverlay;
chrome.runtime.onMessage.addListener((msg,sender,sendResponse) => {
    if (msg.action === "togglePicker") {
        enablePicker();
        sendResponse({status: "ok" });
    }
    return true;
});


function enablePicker() {
    pickingMode = true;
    document.body.style.cursor = 'crosshair';
    speak("Picker Mode On. Click a button.");
    document.addEventListener('mouseover', handleMouseHover, true);
    document.addEventListener('click', handleSelection, true);

    // 2. KEYBOARD Listeners (Tab navigation support)
    document.addEventListener('focus', handleFocusHover, true);
    document.addEventListener('keydown', handleKeySelection, true);

    document.addEventListener('keydown', exitPickerOnEsc, true);
}

function disablePicker() {
    pickingMode = false;
    document.body.style.cursor = 'default';

    if (lastHighlighted) {
        lastHighlighted.style.outline = '';
        lastHighlighted.classList.remove('nayan-highlight');
    }
    
    // Remove MOUSE Listeners
    document.removeEventListener('mouseover', handleMouseHover, true);
    document.removeEventListener('click', handleSelection, true);

    // Remove KEYBOARD Listeners
    document.removeEventListener('focus', handleFocusHover, true);
    document.removeEventListener('keydown', handleKeySelection, true);
    document.removeEventListener('keydown', exitPickerOnEsc, true);
}

function highlightTarget(target) {
    if (!pickingMode || !target) return;

    if (lastHighlighted && lastHighlighted !== target) {
        lastHighlighted.style.outline = '';
    }
    const validElement = target.closest('button, a, input, select, textarea, [role="button"], [tabindex]');
    
    if (validElement) {
        lastHighlighted = validElement;
        validElement.style.outline = '3px solid #ff7b00';
        validElement.focus({ preventScroll: true }); 
    }
}
// --- HANDLERS ---

// 1. Mouse Hover
function handleMouseHover(e) {
    if (!pickingMode) return;
    highlightTarget(e.target);
}

// 2. Keyboard Focus (Tab Key)
function handleFocusHover(e) {
    if (!pickingMode) return;
    highlightTarget(e.target);
}

// 3. Mouse Click Selection
function handleSelection(e) {
    if (!pickingMode) return;
    e.preventDefault();
    e.stopPropagation();

    if (lastHighlighted) {
        finalizeSelection(lastHighlighted);
    }
}

// 4. Keyboard Selection (Enter Key)
function handleKeySelection(e) {
    if (!pickingMode) return;

    if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (lastHighlighted) {
            finalizeSelection(lastHighlighted);
        }
    }
}

function exitPickerOnEsc(e) {
    if (e.key === 'Escape') {
        disablePicker();
        speak(t('Picker Mode Cancelled'));
    }
}
// Finalization
function finalizeSelection(element) {
    const selector = generateSelector(element);
    
    element.style.outline = '4px solid #00E5ff';
    speak(t('selected'));
    disablePicker(); 
    recordShortcutForElement(selector, element);
}

    // document.addEventListener('mouseover', highlightElement, true);
    // document.addEventListener('click', selectElement, true);
    // document.addEventListener('keydown', exitPickerOnEsc, true);
// function selectElement(e) {
//     if (!pickingMode) return;
//     e.preventDefault();
//     e.stopPropagation();
//     let target = e.target.closest('button, a, input, [role="button"]');
//     if (!target) target = e.target;

//     const selector = generateSelector(target);
//     const currentDomain = window.location.hostname;
//     target.style.outline = '4px solid #00E5FF';
//     speak("Button selected. Now press your desired shortcut keys.");
//     disablePicker(); 
//     recordShortcutForElement(selector, target);
// }

// function generateSelector(el) {
//     if (el.id) return '#' + el.id;
//     if (el.getAttribute('aria-label')) return `[aria-label="${el.getAttribute('aria-label')}"]`;
//     if (el.title) return `[title="${el.title}"]`;
//     if (el.alt) return `[alt="${el.alt}"]`;

//     let tagName = el.tagName.toLowerCase();
//     let parent = el.parentElement;
//     if (parent) {
//         let siblings = parent.children;
//         let index = 1;
//         for (let sibling of siblings) {
//             if (sibling === el) return `${tagName}:nth-child(${index})`;
//             index++;
//         }
//     }
//     return tagName;
// }
function generateSelector(el) {
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
        return `[aria-label="${ariaLabel}"]`;
    }

    // 2. Look for aria-label on parent (Fixes the SVG click issue)
    const parent = el.parentElement;
    if (parent && parent.getAttribute('aria-label')) {
        return `[aria-label="${parent.getAttribute('aria-label')}"]`;
    }

    // 3. Fallback to Tooltip/Title
    if (el.title) return `[title="${el.title}"]`;
    if (el.alt) return `[alt="${el.alt}"]`;

    // 4. Stable IDs (Ignore weird generated ones)
    // Only use ID if it looks human-readable, not random like "yDmH0d"
    if (el.id && !el.id.match(/[A-Z0-9]{5,}/)) {
        return '#' + el.id;
    }

    // 5. Last Resort: CSS Path (nth-child)
    let tagName = el.tagName.toLowerCase();
    if (parent) {
        let siblings = parent.children;
        let index = 1;
        for (let sibling of siblings) {
            if (sibling === el) return `${tagName}:nth-child(${index})`;
            index++;
        }
    }
    return tagName;
}

// RECORDING & SAVING PER SITE 
function recordShortcutForElement(selector,visualElement) {
    const keyListener = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
        // --- NEW: STRICT VALIDATION (Letters & Numbers Only) ---
        const isAlphanumeric = /^[a-zA-Z0-9]$/.test(e.key);

        if (!isAlphanumeric) {
            speak(t("Please use letters or numbers only"));
            
            if (visualElement) {
                const oldOutline = visualElement.style.outline;
                visualElement.style.outline = '4px solid red'; 
                setTimeout(() => visualElement.style.outline = oldOutline, 500);
                return ;
            }
        }
        let combo = [];
        if (e.ctrlKey) combo.push('Ctrl');
        if (e.altKey) combo.push('Alt');
        if (e.shiftKey) combo.push('Shift');
        if (e.metaKey) combo.push('Meta');
        let char = e.key.length === 1 ? e.key.toUpperCase() : e.key;
        combo.push(char);

        const finalKey = combo.join('+');

        const currentDomain = window.location.hostname;
        // Fetch FRESH data for this domain
        chrome.storage.local.get([currentDomain], (data) => {
            let config = data[currentDomain] || [];
            // Check Duplicates in THIS site's config
            const conflict = config.find(item => item.key === finalKey && item.id !== selector);

            if (conflict) {
                speak(t('conflict')); 
                if (visualElement) {
                    visualElement.style.outline = '4px solid red';
                    setTimeout(() => visualElement.style.outline = '4px solid #00E5FF', 500);
                }
                return; 
            }

            // Save Logic
            const existingIndex = config.findIndex(item => item.id === selector);
            if (existingIndex !== -1) {
                config[existingIndex].key = finalKey;
            } else {
                config.push({ id: selector, key: finalKey });
            }

            // Save to specific domain key
            chrome.storage.local.set({ [currentDomain]: config }, () => {
                document.removeEventListener('keydown', keyListener, true);
                if (visualElement) visualElement.style.outline = '';
                speak(t('saved') + finalKey);
                alert(t('saved') + finalKey);
            });
        });
    };
    document.addEventListener('keydown', keyListener, true);
}
// --- TOAST NOTIFICATION HELPER ---
function showToast(message) {
    // 1. Create the element
    const toast = document.createElement('div');
    toast.textContent = message;
    
    // 2. Style it (Floating black box at bottom center)
    toast.style.position = 'fixed';
    toast.style.bottom = '30px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = '#333';
    toast.style.color = '#fff';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '14px';
    toast.style.fontFamily = 'Segoe UI, sans-serif';
    toast.style.zIndex = '10000'; // Make sure it's on top
    toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';

    // 3. Add to page
    document.body.appendChild(toast);

    // 4. Animate In (Fade In)
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });

    // 5. Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300); // Wait for fade out to finish
    }, 3000);
}