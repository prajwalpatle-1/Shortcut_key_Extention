let shortcuts = {};

// Load existing
chrome.storage.local.get("shortcuts", (data) => {
    shortcuts = data.shortcuts || {};
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "updateShortcuts") {
        shortcuts = msg.data;
    }
});

// Inject Listener
chrome.tabs.onActivated.addListener(injectListener);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') injectListener();
});

function injectListener() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !tabs[0].url || tabs[0].url.startsWith("chrome://")) return;
        
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
                if (window.myExtensionListener) document.removeEventListener('keydown', window.myExtensionListener);
                
                window.myExtensionListener = (e) => {
                    // Ignore inputs
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                    // 1. IGNORE MODIFIER KEYS ALONE (Don't trigger if just pressing Shift)
                    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

                    // 2. CONSTRUCT COMBO STRING (e.g., "Shift+A")
                    let parts = [];
                    if (e.ctrlKey) parts.push("Ctrl");
                    if (e.altKey) parts.push("Alt");
                    if (e.shiftKey) parts.push("Shift");
                    
                    // We use uppercase for consistency
                    parts.push(e.key.toUpperCase());

                    const combo = parts.join("+");

                    chrome.runtime.sendMessage({ type: "shortcutPress", key: combo });
                };
                
                document.addEventListener('keydown', window.myExtensionListener);
            }
        });
    });
}

// Trigger Click
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "shortcutPress") {
        const selector = shortcuts[msg.key];
        if (selector) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: (sel) => {
                        const el = document.querySelector(sel);
                        if (el) el.click();
                    },
                    args: [selector]
                });
            });
        }
    }
});