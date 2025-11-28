document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('container');
    const errorBox = document.getElementById('error-box');
    const liveRegion = document.getElementById('live-region');

    // 1. Initialize 10 Empty Rows
    const DEFAULT_CONFIG = Array(10).fill({ id: '', key: '' });

    chrome.storage.local.get(['keyConfig'], (result) => {
        let loadedData = result.keyConfig || [];
        // Ensure exactly 10 rows exist
        if (loadedData.length < 10) {
            loadedData = [...loadedData, ...Array(10 - loadedData.length).fill({ id: '', key: '' })];
        }
        renderRows(loadedData);
    });

    function renderRows(data) {
        container.innerHTML = '';
        
        data.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'row';

            // Col 1: Number
            const col1 = document.createElement('div');
            col1.className = 'col-1';
            col1.innerText = `Shortcut ${index + 1}`;

            // Col 2: ID Input
            const col2 = document.createElement('div');
            col2.className = 'col-2';
            const idInput = document.createElement('input');
            idInput.type = 'text';
            idInput.className = 'id-input';
            idInput.placeholder = '#btnId';
            idInput.value = item.id;
            col2.appendChild(idInput);

            // Col 3: Key Input
            const col3 = document.createElement('div');
            col3.className = 'col-3';
            const keyInput = document.createElement('input');
            keyInput.type = 'text';
            keyInput.className = 'key-input';
            keyInput.placeholder = 'Key...';
            keyInput.value = item.key;
            col3.appendChild(keyInput);

            row.appendChild(col1);
            row.appendChild(col2);
            row.appendChild(col3);
            container.appendChild(row);

            // --- LISTENERS ---

            // 1. ID BOX: Enter -> Move to Key
            idInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (idInput.value.trim() === '') {
                        announce("Enter ID first", true);
                        idInput.classList.add('error');
                    } else {
                        idInput.classList.remove('error');
                        keyInput.focus(); // Jump to Key
                    }
                }
            });

            // 2. KEY BOX LOGIC
            keyInput.addEventListener('keydown', (e) => {
                // Prevent typing unless it's a modifier or navigation
                if (e.key !== 'Tab' && e.key !== 'Enter') {
                    e.preventDefault(); 
                }

                // --- NAVIGATION LOGIC (ENTER & TAB) ---
                if (e.key === 'Tab') return; // Default tab behavior

                if (e.key === 'Enter') {
                    // Do NOT save 'Enter'. Just move to NEXT ROW.
                    const nextIdInput = document.querySelectorAll('.id-input')[index + 1];
                    if (nextIdInput) {
                        nextIdInput.focus();
                    } else {
                        announce("End of list");
                    }
                    return; 
                }

                // --- CLEAR LOGIC (Backspace/Delete) ---
                if (e.key === 'Backspace' || e.key === 'Delete') {
                    keyInput.value = '';
                    saveRow(index, idInput.value, ''); // Save empty
                    announce("Key Cleared");
                    return;
                }

                // --- RECORDING LOGIC ---
                
                // Ignore standalone modifiers
                if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

                // Build Combo String
                let combo = [];
                if (e.ctrlKey) combo.push('Ctrl');
                if (e.altKey) combo.push('Alt');
                if (e.shiftKey) combo.push('Shift');
                if (e.metaKey) combo.push('Meta');
                
                let char = e.key.length === 1 ? e.key.toUpperCase() : e.key;
                combo.push(char);
                const finalKeyString = combo.join('+');

                // Check for Duplicates
                chrome.storage.local.get(['keyConfig'], (res) => {
                    const currentConfig = res.keyConfig || DEFAULT_CONFIG;
                    const duplicateIndex = currentConfig.findIndex((row, i) => i !== index && row.key === finalKeyString);

                    if (duplicateIndex !== -1) {
                        announce(`Error: key already Used for Shortcut ${duplicateIndex + 1}`, true);
                        keyInput.classList.add('error');
                        setTimeout(() => keyInput.classList.remove('error'), 1000);
                        return; 
                    }

                    // Save Data
                    if (idInput.value.trim() === '') {
                        announce("Error: Missing ID", true);
                        idInput.focus();
                        idInput.classList.add('error');
                    } else {
                        keyInput.value = finalKeyString; 
                        saveRow(index, idInput.value, finalKeyString); 
                        
                        // AUTO-MOVE after saving
                        const nextIdInput = document.querySelectorAll('.id-input')[index + 1];
                        if (nextIdInput) {
                            nextIdInput.focus();
                            announce(`Saved. Next Shortcut.`);
                        } else {
                            announce(`Saved. Done.`);
                        }
                    }
                });
            });
        });
    }

    function saveRow(index, idValue, keyValue) {
        chrome.storage.local.get(['keyConfig'], (result) => {
            let currentConfig = result.keyConfig || [];
            if (currentConfig.length < 10) {
                 currentConfig = [...currentConfig, ...Array(10 - currentConfig.length).fill({ id: '', key: '' })];
            }
            
            currentConfig[index] = { 
                id: idValue.trim(), 
                key: keyValue 
            };

            chrome.storage.local.set({ keyConfig: currentConfig }, () => {
                const inputs = document.querySelectorAll('.row')[index].querySelectorAll('input');
                inputs.forEach(inp => inp.classList.add('saved'));
                setTimeout(() => inputs.forEach(inp => inp.classList.remove('saved')), 800);
            });
        });
    }

    function announce(msg, isError = false) {
        errorBox.innerText = msg;
        errorBox.style.display = 'block';
        errorBox.style.backgroundColor = isError ? '#cc0000' : '#222';
        
        liveRegion.innerText = '';
        setTimeout(() => { liveRegion.innerText = msg; }, 50);
        setTimeout(() => { errorBox.style.display = 'none'; }, 2000);
    }

    document.getElementById('cancelBtn').addEventListener('click', () => window.close());
    document.getElementById('resetBtn').addEventListener('click', () => {
        if(confirm("Reset All?")) {
            chrome.storage.local.clear(() => {
                location.reload(); 
            });
        }
    });
});