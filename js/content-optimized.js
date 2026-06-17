(() => {
    // Performance optimization: Use a more efficient data structure
    let matchData = {
        startTime: null,
        endTime: null,
        map: null,
        playerStats: {
            kills: 0,
            deaths: 0,
            powerUpsCollected: 0,
            powerUpsUsed: 0,
            smashStreaks: [],
            timeJoined: null,
            timeSpent: 0
        },
        otherPlayers: new Map()
    };

    // Performance optimization: Cache DOM queries
    let playerInfoCache = null;
    let lastPlayerInfoCheck = 0;
    const PLAYER_INFO_CACHE_DURATION = 5000; // 5 seconds

    // Performance optimization: Message queue for throttling
    let messageQueue = [];
    let messageTimeout = null;
    const MESSAGE_BATCH_DELAY = 50; // 50ms

    // Performance optimization: Mutation observer timeout
    let mutationTimeout = null;

    // Performance optimization: Logs array for match data
    let logs = [];

    function getPlayerInfo() {
        const now = Date.now();
        if (playerInfoCache && (now - lastPlayerInfoCheck) < PLAYER_INFO_CACHE_DURATION) {
            return playerInfoCache;
        }
        
        const element = document.querySelector("[data-player-info]");
        if (element) {
            playerInfoCache = {
                skid: element.dataset.skid,
                username: element.dataset.username
            };
            lastPlayerInfoCheck = now;
            return playerInfoCache;
        }
        return null;
    }

    // Performance optimization: Debounced storage operations
    let storageQueue = [];
    let storageTimeout = null;
    const STORAGE_BATCH_DELAY = 100; // 100ms

    function queueStorageOperation(operation) {
        storageQueue.push(operation);
        if (!storageTimeout) {
            storageTimeout = setTimeout(processStorageQueue, STORAGE_BATCH_DELAY);
        }
    }

    function processStorageQueue() {
        if (storageQueue.length === 0) return;
        
        const operations = [...storageQueue];
        storageQueue = [];
        storageTimeout = null;

        // console.log("[SKMT] Processing storage queue:", operations); // Commented out

        // Batch storage operations
        const batchOperations = operations.reduce((acc, op) => {
            if (op.type === 'get') {
                acc.gets.push(...op.keys);
            } else if (op.type === 'set') {
                Object.assign(acc.sets, op.data);
            }
            return acc;
        }, { gets: [], sets: {} });

        // console.log("[SKMT] Batch operations:", batchOperations); // Commented out

        // Execute batch operations
        if (batchOperations.gets.length > 0) {
            chrome.storage.local.get(batchOperations.gets, (data) => {
                // console.log("[SKMT] Storage get result:", data); // Commented out
                operations.forEach(op => {
                    if (op.type === 'get' && op.callback) {
                        op.callback(data);
                    }
                });
            });
        }

        if (Object.keys(batchOperations.sets).length > 0) {
            // console.log("[SKMT] Setting storage:", batchOperations.sets); // Commented out
            chrome.storage.local.set(batchOperations.sets, () => {
                // console.log("[SKMT] Storage set completed"); // Commented out
            });
        }
    }

    // Performance optimization: Optimized WebSocket proxy with message filtering
    (function() {
        const originalWebSocket = window.WebSocket;
        let lastMessageTime = 0;
        const MESSAGE_THROTTLE_INTERVAL = 16; // ~60fps

        window.WebSocket = function(url, protocols) {
            const ws = new originalWebSocket(url, protocols);
            
            // console.log("[SKMT] WebSocket connected"); // Commented out
            
            ws.addEventListener("open", function() {
                // console.log("[SKMT] WebSocket ready"); // Commented out
            });

            ws.addEventListener("message", function(event) {
                // Performance optimization: Throttle message processing
                const now = Date.now();
                if (now - lastMessageTime < MESSAGE_THROTTLE_INTERVAL) {
                    return; // Skip processing to maintain frame rate
                }
                lastMessageTime = now;

                try {
                    // Performance optimization: Only parse JSON for relevant messages
                    const messageStr = event.data;
                    if (typeof messageStr !== 'string') return;

                    // Quick string checks before JSON parsing
                    const relevantPatterns = [
                        'gameStart', 'start_game', 'gameEnd', 'game_end',
                        'playerKill', 'destroyed_human', 'playerDeath', 
                        'destroyed_by_human', 'destroyed_by_bot',
                        'powerUpCollected', 'powerUpUsed', 'smashStreak'
                    ];

                    const isRelevant = relevantPatterns.some(pattern => 
                        messageStr.includes(pattern)
                    );

                    if (!isRelevant) return;

                    const data = JSON.parse(messageStr);
                    if (!data || !data.type) return;

                    // Performance optimization: Use switch instead of if-else chain
                    switch (data.type) {
                        case "gameStart":
                        case "start_game":
                            handleGameStart(data);
                            break;
                        case "gameEnd":
                        case "game_end":
                            handleGameEnd();
                            break;
                        case "playerKill":
                        case "destroyed_human":
                            handlePlayerKill(data);
                            break;
                        case "playerDeath":
                        case "destroyed_by_human":
                        case "destroyed_by_bot":
                            handlePlayerDeath(data);
                            break;
                        case "powerUpCollected":
                            handlePowerUpCollected(data);
                            break;
                        case "powerUpUsed":
                            handlePowerUpUsed(data);
                            break;
                        case "smashStreak":
                            handleSmashStreak(data);
                            break;
                    }
                } catch (error) {
                    if (typeof event.data === 'string') {
                        // console.error("[SKMT] WebSocket error:", error.message); // Commented out
                    }
                }
            });

            ws.addEventListener("error", function(error) {
                // console.error("[SKMT] WebSocket error:", error.message); // Commented out
            });

            ws.addEventListener("close", function() {
                // console.log("[SKMT] WebSocket closed"); // Commented out
            });

            return ws;
        };
    })();

    // Performance optimization: Separated event handlers for better performance
    function handleGameStart(data) {
        // console.log("[SKMT] Game starting"); // Commented out
        logs = [];
        matchData = {
            startTime: Date.now(),
            endTime: null,
            map: data.map,
            playerStats: {
                kills: 0,
                deaths: 0,
                powerUpsCollected: 0,
                powerUpsUsed: 0,
                smashStreaks: [],
                timeJoined: Date.now(),
                timeSpent: 0
            },
            otherPlayers: new Map()
        };
        
        const playerInfo = getPlayerInfo();
        if (playerInfo) {
            matchData.playerStats.skid = playerInfo.skid;
            matchData.playerStats.username = playerInfo.username;
        }
    }

    function handleGameEnd() {
        // console.log("[SKMT] Game ending"); // Commented out
        matchData.endTime = Date.now();
        matchData.playerStats.timeSpent = matchData.endTime - matchData.playerStats.timeJoined;
        
        const matchResult = {
            ...matchData,
            otherPlayers: Array.from(matchData.otherPlayers.values()),
            logs: logs
        };

        const sendMatchData = (retryCount = 0) => {
            chrome.runtime.sendMessage({ type: "matchComplete", data: matchResult })
                .catch(error => {
                    if (retryCount < 3) {
                        // console.log(`[SKMT] Retrying match data send (attempt ${retryCount + 1})`); // Commented out
                        setTimeout(() => sendMatchData(retryCount + 1), 1000);
                    } else {
                        // console.log("[SKMT] Content: Message port closed after retries, storing match data locally"); // Commented out
                        queueStorageOperation({
                            type: 'get',
                            keys: ['pendingMatches'],
                            callback: (data) => {
                                const pendingMatches = data.pendingMatches || [];
                                pendingMatches.push(matchResult);
                                queueStorageOperation({
                                    type: 'set',
                                    data: { pendingMatches: pendingMatches }
                                });
                            }
                        });
                    }
                });
        };
        sendMatchData();
    }

    function handlePlayerKill(data) {
        if (data.killerId === matchData.playerStats.skid) {
            matchData.playerStats.kills++;
        }
        if (matchData.otherPlayers.has(data.victimId)) {
            const player = matchData.otherPlayers.get(data.victimId);
            player.deaths++;
            matchData.otherPlayers.set(data.victimId, player);
        }
    }

    function handlePlayerDeath(data) {
        if (data.victimId === matchData.playerStats.skid) {
            matchData.playerStats.deaths++;
        }
    }

    function handlePowerUpCollected(data) {
        if (data.playerId === matchData.playerStats.skid) {
            matchData.playerStats.powerUpsCollected++;
        }
    }

    function handlePowerUpUsed(data) {
        if (data.playerId === matchData.playerStats.skid) {
            matchData.playerStats.powerUpsUsed++;
        }
    }

    function handleSmashStreak(data) {
        if (data.playerId === matchData.playerStats.skid) {
            matchData.playerStats.smashStreaks.push({
                type: data.streakType,
                timestamp: Date.now()
            });
        }
    }

    // Performance optimization: Debounced mutation observer
    new MutationObserver((mutations) => {
        if (mutationTimeout) clearTimeout(mutationTimeout);
        
        mutationTimeout = setTimeout(() => {
            mutations.forEach((mutation) => {
                if (mutation.type === "childList") {
                    const playerInfo = getPlayerInfo();
                    if (playerInfo) {
                        matchData.playerStats.skid = playerInfo.skid;
                        matchData.playerStats.username = playerInfo.username;
                    }
                }
            });
        }, MUTATION_DEBOUNCE_DELAY);
    }).observe(document.body, { childList: true, subtree: true });

    // console.log("[SKMT] Content script loaded"); // Commented out

    // Performance optimization: Lazy load injected script
    function loadInjectedScript() {
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL("injected-optimized.js");
        script.onload = function() {
            this.remove();
        };
        (document.head || document.documentElement).appendChild(script);
    }

    // Load injected script after a short delay to avoid blocking initial page load
    setTimeout(loadInjectedScript, 100);

    // Performance optimization: Debounced message handling
    function queueMessage(message) {
        messageQueue.push(message);
        if (!messageTimeout) {
            messageTimeout = setTimeout(processMessageQueue, MESSAGE_BATCH_DELAY);
        }
    }

    function processMessageQueue() {
        if (messageQueue.length === 0) return;
        
        const messages = [...messageQueue];
        messageQueue = [];
        messageTimeout = null;

        messages.forEach(handleMessage);
    }

    function handleMessage(event) {
        if (event.source !== window || !event.data || !event.data.type || !event.data.type.startsWith("SKMT_")) {
            return;
        }

        switch (event.data.type) {
            case "SKMT_SKID_UPDATED":
                handleSkidUpdate(event.data);
                break;
            case "SKMT_MATCH_COMPLETE":
                handleMatchComplete(event.data);
                break;
            case "SKMT_DEATHS_UPDATE":
                handleDeathsUpdate(event.data);
                break;
            case "SKMT_KILLSTREAK_UPDATE":
                handleKillStreakUpdate(event.data);
                break;
        }
    }

    function handleSkidUpdate(data) {
        const skid = data.skid;
        if (skid && typeof skid === "string" && skid.length > 5 && window.chrome && chrome.storage && chrome.storage.local) {
            queueStorageOperation({
                type: 'set',
                data: { currentSkid: skid }
            });
            // console.log("[SKMT] SKID saved:", skid); // Commented out
            chrome.runtime.sendMessage(data);
        }
    }

    function handleMatchComplete(data) {
        const matchData = data.data;
        // console.log("[SKMT] Saving match data:", { kills: matchData.kills, deaths: matchData.deaths, quit: matchData.quit }); // Commented out
        
        queueStorageOperation({
            type: 'get',
            keys: ['currentSkid'],
            callback: (skidData) => {
                const currentSkid = skidData.currentSkid || "default";
                let mode = "normal";
                
                if (matchData.isCustomMode) {
                    mode = "custom";
                    // console.log("[SKMT] Recording quit in custom mode"); // Commented out
                } else if (matchData.isSpecialMode) {
                    mode = "special";
                    // console.log("[SKMT] Recording quit in special mode"); // Commented out
                } else {
                    // console.log("[SKMT] Recording quit in normal mode"); // Commented out
                }

                const getKey = (prefix) => `${prefix}_${currentSkid}_${mode}`;
                const keys = matchData.quit ? 
                    [getKey("gamesQuit")] : 
                    [getKey("matchHistory"), getKey("gamesJoined"), getKey("gamesStarted"), getKey("matchesCompleted")];

                queueStorageOperation({
                    type: 'get',
                    keys: keys,
                    callback: (storageData) => {
                        const updates = {};
                        
                        if (matchData.quit) {
                            const timeSpent = matchData.matchEndTime - matchData.matchStartTime;
                            if (timeSpent >= 10000) {
                                let quitCount = storageData[getKey("gamesQuit")] || 0;
                                quitCount++;
                                updates[getKey("gamesQuit")] = quitCount;
                                // console.log("[SKMT] Incrementing gamesQuit for mode:", mode, "New value:", quitCount, "Time spent:", timeSpent); // Commented out
                            } else {
                                // console.log("[SKMT] Not incrementing gamesQuit - time spent less than 10 seconds:", timeSpent); // Commented out
                            }
                        } else {
                            let matchHistory = storageData[getKey("matchHistory")] || [];
                            matchHistory.push(matchData);
                            
                            let gamesJoined = storageData[getKey("gamesJoined")] || 0;
                            let gamesStarted = storageData[getKey("gamesStarted")] || 0;
                            let matchesCompleted = storageData[getKey("matchesCompleted")] || 0;
                            
                            if (matchData.joined) gamesJoined++;
                            if (matchData.started) gamesStarted++;
                            matchesCompleted++;
                            
                            updates[getKey("matchHistory")] = matchHistory;
                            updates[getKey("gamesJoined")] = gamesJoined;
                            updates[getKey("gamesStarted")] = gamesStarted;
                            updates[getKey("matchesCompleted")] = matchesCompleted;
                        }

                        queueStorageOperation({
                            type: 'set',
                            data: updates
                        });

                        console.log("[SKMT] Match data saved:", {
                            mode: mode,
                            quit: matchData.quit,
                            isSpecialMode: matchData.isSpecialMode,
                            isCustomMode: matchData.isCustomMode,
                            savedToHistory: !matchData.quit,
                            statsUpdated: !matchData.quit,
                            timeSpent: matchData.matchEndTime - matchData.matchStartTime
                        });

                        chrome.runtime.sendMessage({
                            type: "SKMT_MATCH_COMPLETE",
                            data: { ...matchData, mode: mode, quit: matchData.quit }
                        }, () => {
                            if (chrome.runtime.lastError) {
                                // console.error("[SKMT] Error sending message to popup:", chrome.runtime.lastError); // Commented out
                            } else {
                                // console.log("[SKMT] Successfully sent match data to popup:", {
                                //     mode: mode,
                                //     quit: matchData.quit,
                                //     isSpecialMode: matchData.isSpecialMode,
                                //     isCustomMode: matchData.isCustomMode
                                // }); // Commented out
                            }
                        });
                    }
                });
            }
        });
    }

    function handleDeathsUpdate(data) {
        // console.log("[SKMT] Received deaths update:", data.deaths); // Commented out
        if (deathsHudElement) {
            deathsHudElement.textContent = `Deaths: ${data.deaths}`;
        }
        // console.log("[SKMT] HUD: Deaths display updated to", data.deaths); // Commented out
    }

    function handleKillStreakUpdate(data) {
        // console.log("[SKMT] Received kill streak update:", data.killStreak); // Commented out
        if (killStreakHudElement) {
            killStreakHudElement.textContent = `Kill Streak: ${data.killStreak}`;
        }
        // console.log("[SKMT] HUD: Kill streak display updated to", data.killStreak); // Commented out
    }

    // Performance optimization: Use event delegation for message handling
    window.addEventListener("message", queueMessage);

    // Performance optimization: Optimized HUD creation with CSS-in-JS
    function createHudElement(id, defaultText, defaultPosition) {
        const element = document.createElement("div");
        element.id = id;
        
        // Use CSS transform for better performance
        Object.assign(element.style, {
            position: "fixed",
            top: defaultPosition.top + "px",
            left: defaultPosition.left + "px",
            zIndex: "999999",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontWeight: "700",
            fontSize: "24px",
            color: "#fff",
            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.3)",
            cursor: "move",
            userSelect: "none",
            display: "block", // Show by default instead of "none"
            textRendering: "optimizeLegibility",
            webkitFontSmoothing: "antialiased",
            mozOsxFontSmoothing: "grayscale",
            letterSpacing: "0.5px",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            padding: "0.5em 1em",
            borderRadius: "0.5em",
            willChange: "transform", // Performance optimization
            transform: "translate3d(0, 0, 0)" // Force hardware acceleration
        });
        
        element.textContent = defaultText;
        return element;
    }

    // Performance optimization: Create HUD elements with better positioning
    const deathsHudElement = createHudElement("death-hud-overlay", "Deaths: 0", { top: 100, left: 300 });
    const killStreakHudElement = createHudElement("kill-streak-hud-overlay", "Kill Streak: 0", { top: 160, left: 300 });
    const kdrHudElement = createHudElement("kdr-hud-overlay", "KDR: 0.00", { top: 220, left: 300 });
    const matchCodeHudElement = createHudElement("match-code-hud-overlay", "Code: ", { top: 280, left: 300 });
    // Kills HUD
    const killsHudElement = createHudElement("kills-hud-overlay", "Kills: 0", { top: 340, left: 300 });

    // Performance optimization: Efficient drag handling
    function createDragHandler(element, positionKey) {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        const startDrag = (e) => {
            if (e.target !== element) return;
            e.preventDefault();
            e.stopPropagation();
            // Get current transform values (if any)
            const transform = element.style.transform.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px, 0\)/);
            startX = transform ? parseFloat(transform[1]) : 0;
            startY = transform ? parseFloat(transform[2]) : 0;
            initialX = e.clientX;
            initialY = e.clientY;
                isDragging = true;
            // Prevent text selection
            document.body.style.userSelect = 'none';
            window.addEventListener('pointermove', drag);
            window.addEventListener('pointerup', endDrag);
        };

        const drag = (e) => {
            if (!isDragging) return;
                e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const deltaX = clientX - initialX;
            const deltaY = clientY - initialY;
            element.style.transform = `translate3d(${startX + deltaX}px, ${startY + deltaY}px, 0)`;
        };

        const endDrag = (e) => {
            if (!isDragging) return;
                isDragging = false;
            // Remove listeners
            window.removeEventListener('pointermove', drag);
            window.removeEventListener('pointerup', endDrag);
            // Restore text selection
            document.body.style.userSelect = '';
            
            // Calculate final position based on drag delta
            const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
            const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
            const deltaX = clientX - initialX;
            const deltaY = clientY - initialY;
            const finalX = startX + deltaX;
            const finalY = startY + deltaY;
            
            console.log(`[SKMT] Saving position for ${positionKey}: x=${finalX}, y=${finalY}`);
                queueStorageOperation({
                    type: 'set',
                data: { [positionKey]: { x: finalX, y: finalY } }
                });
        };

        element.addEventListener('pointerdown', startDrag);
        // No need for pointermove/pointerup here; they're attached dynamically during drag
        return { startX, startY };
    }

    // Initialize drag handlers
    const deathsPosition = createDragHandler(deathsHudElement, "hudPosition");
    const killStreakPosition = createDragHandler(killStreakHudElement, "killStreakHudPosition");
    const kdrPosition = createDragHandler(kdrHudElement, "kdrHudPosition");
    const matchCodePosition = createDragHandler(matchCodeHudElement, "matchCodeHudPosition");
    const killsPosition = createDragHandler(killsHudElement, "killsHudPosition");

    // Performance optimization: Batch DOM operations
    [deathsHudElement, killStreakHudElement, kdrHudElement, matchCodeHudElement, killsHudElement].forEach(element => {
        document.body.appendChild(element);
        // console.log("[SKMT] HUD element appended:", element.id, element.style.display); // Commented out
    });

    // Performance optimization: Load settings in batch
    queueStorageOperation({
        type: 'get',
        keys: ['hudPosition', 'killStreakHudPosition', 'kdrHudPosition', 'matchCodeHudPosition', 'killsHudPosition',
               'deathsHudEnabled', 'killStreakHudEnabled', 'kdrHudEnabled', 'matchCodeHudEnabled', 'killsHudEnabled',
               'deathsHudSettings', 'killStreakHudSettings', 'kdrHudSettings', 'matchCodeHudSettings', 'killsHudSettings'],
        callback: (data) => {
            // console.log("[SKMT] Storage callback received data:", data); // Commented out
            
            // Apply positions
            if (data.hudPosition) {
                // console.log("[SKMT] Applying deaths HUD position:", data.hudPosition.x, data.hudPosition.y); // Commented out
                deathsHudElement.style.transform = `translate3d(${data.hudPosition.x}px, ${data.hudPosition.y}px, 0)`;
            }
            if (data.killStreakHudPosition) {
                // console.log("[SKMT] Applying kill streak HUD position:", data.killStreakHudPosition.x, data.killStreakHudPosition.y); // Commented out
                killStreakHudElement.style.transform = `translate3d(${data.killStreakHudPosition.x}px, ${data.killStreakHudPosition.y}px, 0)`;
            }
            if (data.kdrHudPosition) {
                // console.log("[SKMT] Applying KDR HUD position:", data.kdrHudPosition.x, data.kdrHudPosition.y); // Commented out
                kdrHudElement.style.transform = `translate3d(${data.kdrHudPosition.x}px, ${data.kdrHudPosition.y}px, 0)`;
            }
            if (data.matchCodeHudPosition) {
                // console.log("[SKMT] Applying match code HUD position:", data.matchCodeHudPosition.x, data.matchCodeHudPosition.y); // Commented out
                matchCodeHudElement.style.transform = `translate3d(${data.matchCodeHudPosition.x}px, ${data.matchCodeHudPosition.y}px, 0)`;
            }
            if (data.killsHudPosition) {
                // console.log("[SKMT] Applying kills HUD position:", data.killsHudPosition.x, data.killsHudPosition.y); // Commented out
                killsHudElement.style.transform = `translate3d(${data.killsHudPosition.x}px, ${data.killsHudPosition.y}px, 0)`;
            }

            // Apply visibility - only hide if explicitly disabled
            if (data.deathsHudEnabled === false) {
                deathsHudElement.style.display = "none";
            }
            if (data.killStreakHudEnabled === false) {
                killStreakHudElement.style.display = "none";
            }
            if (data.kdrHudEnabled === false) {
                kdrHudElement.style.display = "none";
            }
            if (data.matchCodeHudEnabled === false) {
                matchCodeHudElement.style.display = "none";
            }
            if (data.killsHudEnabled === false) {
                killsHudElement.style.display = "none";
            }

            // Apply styles
            const applySettings = (element, settings, defaultSettings) => {
                if (settings) {
                    element.style.fontSize = settings.fontSize + "px";
                    element.style.color = settings.fontColor;
                    element.style.fontFamily = settings.fontFamily;
                    element.style.backgroundColor = settings.backgroundColor || "rgba(0, 0, 0, 0.5)";
                } else {
                    queueStorageOperation({
                        type: 'set',
                        data: { [defaultSettings.key]: defaultSettings.value }
                    });
                    applySettings(element, defaultSettings.value, null);
                }
            };

            applySettings(deathsHudElement, data.deathsHudSettings, {
                key: 'deathsHudSettings',
                value: { fontSize: 24, fontColor: "#ffffff", fontFamily: "Arial, sans-serif" }
            });
            applySettings(killStreakHudElement, data.killStreakHudSettings, {
                key: 'killStreakHudSettings',
                value: { fontSize: 24, fontColor: "#ffffff", fontFamily: "Arial, sans-serif" }
            });
            applySettings(kdrHudElement, data.kdrHudSettings, {
                key: 'kdrHudSettings',
                value: { fontSize: 24, fontColor: "#ffffff", fontFamily: "Arial, sans-serif" }
            });
            applySettings(matchCodeHudElement, data.matchCodeHudSettings, {
                key: 'matchCodeHudSettings',
                value: { fontSize: 24, fontColor: "#ffffff", fontFamily: "Arial, sans-serif" }
            });
            applySettings(killsHudElement, data.killsHudSettings, {
                key: 'killsHudSettings',
                value: { fontSize: 24, fontColor: "#ffffff", fontFamily: "Arial, sans-serif" }
            });

            // console.log("[SKMT] HUD states:", { ... }); // Commented out
        }
    });

    // Performance optimization: Efficient message handling
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.type) {
            case "toggle-deaths-hud":
                deathsHudElement.style.display = message.enabled ? "block" : "none";
                // console.log("[SKMT] Deaths HUD toggled:", message.enabled); // Commented out
                break;
            case "toggle-killstreak-hud":
                killStreakHudElement.style.display = message.enabled ? "block" : "none";
                // console.log("[SKMT] Kill Streak HUD toggled:", message.enabled); // Commented out
                break;
            case "toggle-kdr-hud":
                kdrHudElement.style.display = message.enabled ? "block" : "none";
                // console.log("[SKMT] KDR HUD toggled:", message.enabled); // Commented out
                break;
            case "toggle-matchcode-hud":
                matchCodeHudElement.style.display = message.enabled ? "block" : "none";
                // console.log("[SKMT] Match Code HUD toggled:", message.enabled); // Commented out
                break;
            case "toggle-kills-hud":
                killsHudElement.style.display = message.enabled ? "block" : "none";
                // console.log("[SKMT] Kills HUD toggled:", message.enabled); // Commented out
                break;
            case "update-deaths-hud-style":
                applyHudStyle(deathsHudElement, message.settings);
                queueStorageOperation({
                    type: 'set',
                    data: { deathsHudSettings: message.settings }
                });
                break;
            case "update-killstreak-hud-style":
                applyHudStyle(killStreakHudElement, message.settings);
                queueStorageOperation({
                    type: 'set',
                    data: { killStreakHudSettings: message.settings }
                });
                break;
            case "update-kdr-hud-style":
                applyHudStyle(kdrHudElement, message.settings);
                queueStorageOperation({
                    type: 'set',
                    data: { kdrHudSettings: message.settings }
                });
                break;
            case "update-matchcode-hud-style":
                applyHudStyle(matchCodeHudElement, message.settings);
                queueStorageOperation({
                    type: 'set',
                    data: { matchCodeHudSettings: message.settings }
                });
                break;
            case "update-kills-hud-style":
                applyHudStyle(killsHudElement, message.settings);
                queueStorageOperation({
                    type: 'set',
                    data: { killsHudSettings: message.settings }
                });
                break;
        }
        
        // Handle resetHudPositions action
        if (message.action === "resetHudPositions") {
            const resetPosition = (element, x, y) => {
                element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            };
            
            resetPosition(deathsHudElement, 0, 0);
            resetPosition(killStreakHudElement, 0, 0);
            resetPosition(kdrHudElement, 0, 0);
            resetPosition(matchCodeHudElement, 0, 0);
            resetPosition(killsHudElement, 0, 0);
            
            queueStorageOperation({
                type: 'set',
                data: { 
                    hudPosition: null,
                    killStreakHudPosition: null,
                    kdrHudPosition: null,
                    matchCodeHudPosition: null,
                    killsHudPosition: null
                }
            });
        }
    });

    function applyHudStyle(element, settings) {
        if (settings) {
            element.style.fontSize = settings.fontSize + "px";
            element.style.color = settings.fontColor;
            element.style.fontFamily = settings.fontFamily;
            element.style.backgroundColor = settings.backgroundColor || "rgba(0, 0, 0, 0.5)";
        }
    }

    // Performance optimization: Efficient HUD updates
    window.addEventListener("message", (event) => {
        if (event.source !== window || !event.data || !event.data.type || !event.data.type.startsWith("SKMT_")) {
            return;
        }

        switch (event.data.type) {
            case "SKMT_DEATHS_UPDATE":
                if (deathsHudElement) {
                    deathsHudElement.textContent = `Deaths: ${event.data.deaths}`;
                }
                break;
            case "SKMT_KILLSTREAK_UPDATE":
                if (killStreakHudElement) {
                    killStreakHudElement.textContent = `Kill Streak: ${event.data.killStreak}`;
                }
                break;
            case "SKMT_KDR_UPDATE":
                if (kdrHudElement) {
                    kdrHudElement.textContent = `KDR: ${event.data.kdr.toFixed(2)}`;
                }
                break;
            case "SKMT_MATCH_CODE_UPDATE":
                if (matchCodeHudElement) {
                    matchCodeHudElement.textContent = event.data.code ? `Code: ${event.data.code}` : "Code: ";
                }
                break;
            case "SKMT_KILLS_UPDATE":
                if (killsHudElement) {
                    killsHudElement.textContent = `Kills: ${event.data.kills}`;
                }
                break;
            case "SKMT_MATCH_COMPLETE":
                if (deathsHudElement) deathsHudElement.textContent = "Deaths: 0";
                if (killStreakHudElement) killStreakHudElement.textContent = "Kill Streak: 0";
                if (kdrHudElement) kdrHudElement.textContent = "KDR: 0.00";
                if (killsHudElement) killsHudElement.textContent = "Kills: 0";
                break;
        }
    });

    // Performance optimization: Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (storageTimeout) {
            clearTimeout(storageTimeout);
            processStorageQueue();
        }
        if (messageTimeout) {
            clearTimeout(messageTimeout);
            processMessageQueue();
        }
        if (mutationTimeout) {
            clearTimeout(mutationTimeout);
        }
    });

    // --- Kills HUD logic ---
    let killsHudKills = 0;
    function handleKillsUpdate(data) {
        killsHudKills = data.kills;
        if (killsHudElement) {
            killsHudElement.textContent = `Kills: ${killsHudKills}`;
        }
    }
    // Hook into player kill event
    const originalHandlePlayerKill = handlePlayerKill;
    handlePlayerKill = function(data) {
        if (data.killerId === matchData.playerStats.skid) {
            killsHudKills++;
            window.postMessage({ type: "SKMT_KILLS_UPDATE", kills: killsHudKills }, "*");
        }
        originalHandlePlayerKill.apply(this, arguments);
    };
    // Reset on game end/quit
    const originalHandleGameEnd = handleGameEnd;
    handleGameEnd = function() {
        killsHudKills = 0;
        window.postMessage({ type: "SKMT_KILLS_UPDATE", kills: 0 }, "*");
        originalHandleGameEnd.apply(this, arguments);
    };

    // Add helper at the top:
    function idleUpdate(fn) {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(fn);
        } else {
            setTimeout(fn, 100);
        }
    }

    // Ensure event listeners are attached only once by tracking with a flag
    let listenersAttached = false;
    function attachListenersOnce() {
        if (listenersAttached) return;
        listenersAttached = true;
        // ... existing event listener attachment code ...
    }
    attachListenersOnce();

    // Debounce any input handlers if present
    function debounce(fn, delay) {
        let timer = null;
        return function(...args) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

})();