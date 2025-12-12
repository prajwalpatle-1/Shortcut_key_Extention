chrome.runtime.onInstalled.addListener(() => {
    console.log("Nayan Deep Extension Installed");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
            chrome.tabs.sendMessage(tabId, {
                action: "TRIGGER_TOAST",
                message: "Nayan Deep Extension is active!" 
            })
            .catch((error) => {
                console.log("Content script not ready on this tab yet.");
            });
        }
    }
});