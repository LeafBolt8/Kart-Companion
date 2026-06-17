// console.log("[SKMT] Injected script running"); // Commented out to reduce debug logs

// Performance optimization: Debounced message posting for non-critical messages
let messageQueue = [];
let messageTimeout = null;
const MESSAGE_BATCH_DELAY = 16; // ~60fps

function batchPostMessage() {
    if (messageQueue.length === 0) return;
    
    // Send all queued messages at once
    messageQueue.forEach(msg => {
        window.postMessage(msg, "*");
    });
    messageQueue = [];
    messageTimeout = null;
}

function queueMessage(message) {
    messageQueue.push(message);
    if (!messageTimeout) {
        messageTimeout = setTimeout(batchPostMessage, MESSAGE_BATCH_DELAY);
    }
}

// Performance optimization: Immediate posting for critical stats updates
function postMessageImmediate(message) {
    window.postMessage(message, "*");
}

// Performance optimization: Cache DOM queries and reduce function calls
const originalLog = console.log;
const originalInfo = console.info;
const originalWarn = console.warn;
const originalError = console.error;

let isIntercepting = false;
let lastProcessedMessage = '';
let messageProcessCount = 0;
let lastResetTime = Date.now();
const MESSAGE_THROTTLE_LIMIT = 10000; // Higher limit for better performance
const THROTTLE_RESET_INTERVAL = 1000; // Reset counter every 1 second

// Performance optimization: Use object literal for faster property access
window.kartStats = {
    kills: 0,
    deaths: 0,
    matchActive: false,
    matchStartTime: null,
    matchEndTime: null,
    isSpecialMode: false,
    isCustomMode: false,
    joined: false,
    started: false,
    quit: false,
    awaitingStartType: true,
    _pendingGameEnd: false,
    _successLogCount: 0,
    _gameEndTimeout: null,
    _gameEndProcessed: false,
    skid: null,
    killTimestamps: [],
    deathTimestamps: [],
    sawJoinedRoom: false,
    sawStartGame: false,
    killStreak: 0,
    joinedFirst: null,
    players: [],
    currentMap: null,
    matchCode: null
};

let collectingPlayerLogs = false;
let currentPlayerLogLines = [];
let currentMatchPlayers = new Set();
let collectingPlayers = false;
let detectedPlayersSet = new Set();

// Performance optimization: Cache regex patterns
const REGEX_PATTERNS = {
    uid: /uid:\s*([^,\s]+)/i,
    vehicleSetup: /Vehicle Setup: VehicleCharacter - setting (?:new|original) head position - ([^\n]+)/,
    mapScene: /assetbundles\/remote\/webgl\/([^_]+)-v1/,
    matchCode: /(?:joinorcreategame|onjoinedroom)\s+(\w+)/i
};

// Performance optimization: Cache map name replacements
const MAP_REPLACEMENTS = {
    'smashislandscene': 'Smash Island',
    'dinoisland': 'Boneyard Basin',
    'graveyardscene': 'Graveyard/Graveyard CTF',
    'lavapitscene': 'Lava Pit/Lava Pit CTF',
    'skatepark': 'Skate Park',
    'skyarenadropzonepinball': 'Sky Arena Dropzone/Sky Arena Pinball',
    'skyarenashowdownscene': 'Sky Arena Showdown',
    'skyarenatemples': 'Sky Arena Temples',
    'skyarenatunnels': 'Sky Arena Tunnels',
    'slicknslidescene': 'Slick n\' Slide',
    'smashfortscene': 'Smash Fort/Smash Fort CTF',
    'snowpark': 'Snow Shrine/Snowpark/Snowpark CTF',
    'spacestationscene': 'Space Station(s)',
    'stekysspeedwayscene': 'Steky\'s Speedway',
    'thegravelpitscene': 'Gravel Pit',
    'theoldgraveyard': 'Old Graveyard',
    'thesandbox': 'The Sandbox'
};

// Performance optimization: Cache common string checks
const STRING_CHECKS = {
    bytebrew: 'bytebrew: sending custom event:',
    vehicleSetup: 'vehicle setup: vehiclecharacter - setting',
    unityCache: '[unitycache]',
    assetBundles: 'assetbundles/remote/webgl/',
    destroyedHuman: 'destroyed_human',
    destroyedByHuman: 'destroyed_by_human',
    destroyedByBot: 'destroyed_by_bot',
    joinOrCreate: 'joinorcreategame',
    onJoinedRoom: 'onjoinedroom'
};

function setSkid(skid) {
    if (skid && typeof skid === 'string' && skid.length > 5) {
        window.kartStats.skid = skid;
        // originalLog("[SKMT] SKID set:", skid); // Commented out
        postMessageImmediate({type: "SKMT_SKID_UPDATED", skid: skid});
    }
}

// Performance optimization: Debounced console interception with improved throttling
function interceptConsole(type, originalFn) {
    return function(...args) {
        if (isIntercepting) {
            return originalFn.apply(console, args);
        }

        if (args[0] && typeof args[0] === 'string') {
            const message = args[0];
            const currentTime = Date.now();
            
            // Performance optimization: Reset counter periodically
            if (currentTime - lastResetTime > THROTTLE_RESET_INTERVAL) {
                messageProcessCount = 0;
                lastResetTime = currentTime;
            }
            
            // Performance optimization: Skip processing if message is identical to last processed
            if (message === lastProcessedMessage) {
                return originalFn.apply(console, args);
            }
            
            // Performance optimization: Throttle message processing with periodic reset
            messageProcessCount++;
            if (messageProcessCount > MESSAGE_THROTTLE_LIMIT) {
                return originalFn.apply(console, args);
            }
            
            lastProcessedMessage = message;
            isIntercepting = true;
            
            const lowerMessage = message.toLowerCase();
            
            // Performance optimization: Use early returns and cached string checks
            if (lowerMessage.includes(STRING_CHECKS.bytebrew + ' loading_unity_awake') || 
                lowerMessage.includes(STRING_CHECKS.bytebrew + ' confirmexitgame')) {
                if (window.kartStats.matchCode) {
                    window.kartStats.matchCode = null;
                    postMessageImmediate({type: "SKMT_MATCH_CODE_UPDATE", code: ""});
                    // originalLog("[SKMT] Match code cleared on exit"); // Commented out
                }
            }
            
            if (lowerMessage.includes("authstatechanged, uid:")) {
                const match = message.match(REGEX_PATTERNS.uid);
                if (match && match[1]) {
                    setSkid(match[1].trim());
                }
            }
            
            if (lowerMessage.includes(STRING_CHECKS.bytebrew + ' play_special_mode') ||
                lowerMessage.includes(STRING_CHECKS.bytebrew + ' play_special_mode_rules') ||
                lowerMessage.includes(STRING_CHECKS.bytebrew + ' play_special_mode_arena')) {
                window.kartStats.isSpecialMode = true;
                window.kartStats.isCustomMode = false;
                // originalLog("[SKMT] Mode: Special mode detected"); // Commented out
            }
            
            if (lowerMessage.includes(STRING_CHECKS.bytebrew + ' create_game_rules') ||
                lowerMessage.includes(STRING_CHECKS.bytebrew + ' create_game_weapons') ||
                lowerMessage.includes(STRING_CHECKS.bytebrew + ' create_game_level') ||
                lowerMessage.includes(STRING_CHECKS.bytebrew + ' create_game_mode') ||
                lowerMessage.includes(STRING_CHECKS.bytebrew + ' join_or_create_private_mode') ||
                lowerMessage.includes(STRING_CHECKS.bytebrew + ' join_or_create_private_arena')) {
                window.kartStats.isCustomMode = true;
                window.kartStats.isSpecialMode = false;
                // originalLog("[SKMT] Mode: Custom mode detected"); // Commented out
            }
            
            if (lowerMessage.includes(STRING_CHECKS.bytebrew + ' play_3min_mode')) {
                window.kartStats.isSpecialMode = false;
                window.kartStats.isCustomMode = false;
                // originalLog("[SKMT] Mode: Normal mode detected"); // Commented out
            }
            
            if (lowerMessage.includes(STRING_CHECKS.vehicleSetup)) {
                const match = message.match(REGEX_PATTERNS.vehicleSetup);
                if (match && match[1]) {
                    const playerName = match[1].trim();
                    if (window.kartStats.matchActive) {
                        currentMatchPlayers.add(playerName);
                        // originalLog("[SKMT] Player detected:", playerName); // Commented out
                    }
                }
            }
            
            if (lowerMessage.includes(STRING_CHECKS.bytebrew + ' start_game')) {
                if (!window.kartStats.joined) {
                    window.kartStats.started = true;
                }
                window.kartStats.matchActive = true;
                window.kartStats.matchStartTime = Date.now();
                currentMatchPlayers.clear();
                originalLog("[SKMT] Match started");
                postMessageImmediate({type: "SKMT_STATUS_UPDATE", status: "started"});
            }
            
            if (lowerMessage.includes(STRING_CHECKS.bytebrew + ' joined_room')) {
                window.kartStats.joined = true;
                window.kartStats.started = false;
                window.kartStats.matchActive = true;
                window.kartStats.matchStartTime = Date.now();
                currentMatchPlayers.clear();
                // originalLog("[SKMT] Joined match"); // Commented out
                postMessageImmediate({type: "SKMT_STATUS_UPDATE", status: "joined"});
            }
            
            if (lowerMessage.includes(STRING_CHECKS.bytebrew + ' start_game') ||
                lowerMessage.includes(STRING_CHECKS.bytebrew + ' joined_room')) {
                collectingPlayers = true;
                detectedPlayersSet.clear();
                // originalLog("[SKMT] Player collection started"); // Commented out
            }
            
            if (lowerMessage.includes(STRING_CHECKS.bytebrew + ' game_end') ||
                lowerMessage.includes(STRING_CHECKS.bytebrew + ' confirmexitgame')) {
                collectingPlayers = false;
                // originalLog("[SKMT] Player collection ended. Final players:", Array.from(detectedPlayersSet)); // Commented out
            }
            
            if (collectingPlayers && lowerMessage.includes(STRING_CHECKS.vehicleSetup)) {
                const match = message.match(REGEX_PATTERNS.vehicleSetup);
                if (match && match[1]) {
                    const playerName = match[1].trim();
                    detectedPlayersSet.add(playerName);
                    // originalLog("[SKMT] Player detected (real-time):", playerName); // Commented out
                }
            }
            
            if (lowerMessage.includes(STRING_CHECKS.unityCache) && lowerMessage.includes(STRING_CHECKS.assetBundles) && lowerMessage.includes("_scenes_all_")) {
                const match = message.match(REGEX_PATTERNS.mapScene);
                if (match && match[1]) {
                    let mapName = match[1];
                    mapName = MAP_REPLACEMENTS[mapName] || mapName;
                    window.kartStats.currentMap = mapName;
                    // originalLog("[SKMT] Map detected:", mapName); // Commented out
                }
            }
            
            if ((lowerMessage.includes(STRING_CHECKS.bytebrew + ' game_end') ||
                lowerMessage.includes(STRING_CHECKS.bytebrew + ' confirmexitgame')) &&
                window.kartStats.matchActive && !window.kartStats._gameEndProcessed) {
                
                window.kartStats._gameEndProcessed = true;
                window.kartStats.matchEndTime = Date.now();
                window.kartStats.matchActive = false;
                
                if (lowerMessage.includes("confirmexitgame")) {
                    window.kartStats.quit = true;
                    originalLog("[SKMT] Match quit detected");
                }
                
                const duration = window.kartStats.matchEndTime - window.kartStats.matchStartTime;
                const matchData = {
                    kills: window.kartStats.kills,
                    deaths: window.kartStats.deaths,
                    matchStartTime: window.kartStats.matchStartTime,
                    matchEndTime: window.kartStats.matchEndTime,
                    duration: duration,
                    isSpecialMode: window.kartStats.isSpecialMode,
                    isCustomMode: window.kartStats.isCustomMode,
                    joined: window.kartStats.joined,
                    started: window.kartStats.started,
                    quit: window.kartStats.quit,
                    killTimestamps: [...window.kartStats.killTimestamps],
                    deathTimestamps: [...window.kartStats.deathTimestamps],
                    players: Array.from(detectedPlayersSet),
                    map: window.kartStats.currentMap
                };
                
                originalLog("[SKMT] Match stats:", {
                    kills: matchData.kills,
                    deaths: matchData.deaths,
                    killStreak: window.kartStats.killStreak,
                    mode: matchData.isCustomMode ? "custom" : matchData.isSpecialMode ? "special" : "normal",
                    joined: matchData.joined,
                    started: matchData.started,
                    quit: matchData.quit,
                    duration: duration,
                    players: Array.from(detectedPlayersSet)
                });
                
                postMessageImmediate({type: "SKMT_MATCH_COMPLETE", data: matchData});
                console.log("[SKMT] Match ended with players:", Array.from(detectedPlayersSet));
                resetStats();
                detectedPlayersSet.clear();
            }
            
            if (lowerMessage.includes(STRING_CHECKS.bytebrew + ' loading_unity_awake') &&
                window.kartStats.matchActive && !window.kartStats._gameEndProcessed) {
                
                window.kartStats._gameEndProcessed = true;
                window.kartStats.quit = true;
                window.kartStats.matchEndTime = Date.now();
                
                const matchData = {
                    kills: window.kartStats.kills,
                    deaths: window.kartStats.deaths,
                    matchStartTime: window.kartStats.matchStartTime,
                    matchEndTime: window.kartStats.matchEndTime,
                    duration: window.kartStats.matchEndTime - window.kartStats.matchStartTime,
                    isSpecialMode: window.kartStats.isSpecialMode,
                    isCustomMode: window.kartStats.isCustomMode,
                    joined: window.kartStats.joined,
                    started: window.kartStats.started,
                    quit: true,
                    killTimestamps: [...window.kartStats.killTimestamps],
                    deathTimestamps: [...window.kartStats.deathTimestamps],
                    players: Array.from(detectedPlayersSet)
                };
                
                postMessageImmediate({type: "SKMT_MATCH_COMPLETE", data: matchData});
                
                if (lowerMessage.includes("confirmexitgame")) {
                    window.kartStats.isSpecialMode = false;
                    window.kartStats.isCustomMode = false;
                }
            }
            
            if (window.kartStats.matchActive) {
                if (lowerMessage.includes(STRING_CHECKS.destroyedHuman)) {
                    window.kartStats.kills++;
                    postMessageImmediate({type: "SKMT_KILLS_UPDATE", kills: window.kartStats.kills});
                    window.kartStats.killTimestamps.push(Date.now());
                    window.kartStats.killStreak++;
                    // originalLog("[SKMT] HUD: Kill streak updated to", window.kartStats.killStreak); // Commented out
                    postMessageImmediate({type: "SKMT_KILLSTREAK_UPDATE", killStreak: window.kartStats.killStreak});
                    
                    const kdr = window.kartStats.deaths > 0 ? window.kartStats.kills / window.kartStats.deaths : window.kartStats.kills;
                    postMessageImmediate({type: "SKMT_KDR_UPDATE", kdr: kdr});
                }
                
                if (lowerMessage.includes(STRING_CHECKS.destroyedByHuman) || lowerMessage.includes(STRING_CHECKS.destroyedByBot)) {
                    window.kartStats.deaths++;
                    window.kartStats.deathTimestamps.push(Date.now());
                    window.kartStats.killStreak = 0;
                    // originalLog("[SKMT] HUD: Deaths updated to", window.kartStats.deaths); // Commented out
                    postMessageImmediate({type: "SKMT_DEATHS_UPDATE", deaths: window.kartStats.deaths});
                    postMessageImmediate({type: "SKMT_KILLSTREAK_UPDATE", killStreak: 0});
                    
                    const kdr = window.kartStats.deaths > 0 ? window.kartStats.kills / window.kartStats.deaths : window.kartStats.kills;
                    postMessageImmediate({type: "SKMT_KDR_UPDATE", kdr: kdr});
                }
            }
            
            if (lowerMessage.includes(STRING_CHECKS.joinOrCreate) || lowerMessage.includes(STRING_CHECKS.onJoinedRoom)) {
                const match = message.match(REGEX_PATTERNS.matchCode);
                if (match && match[1]) {
                    window.kartStats.matchCode = match[1].trim();
                    postMessageImmediate({type: "SKMT_MATCH_CODE_UPDATE", code: window.kartStats.matchCode});
                    // originalLog("[SKMT] Match code detected:", window.kartStats.matchCode); // Commented out
                }
            }
            
            isIntercepting = false;
        }
        
        return originalFn.apply(console, args);
    };
}

function resetStats() {
    window.kartStats.kills = 0;
    window.kartStats.deaths = 0;
    window.kartStats.matchActive = false;
    window.kartStats.matchStartTime = null;
    window.kartStats.matchEndTime = null;
    window.kartStats.killStreak = 0;
    window.kartStats.joinedFirst = null;
    window.kartStats.joined = false;
    window.kartStats.started = false;
    window.kartStats.quit = false;
    window.kartStats._pendingGameEnd = false;
    window.kartStats._successLogCount = 0;
    window.kartStats._gameEndProcessed = false;
    window.kartStats.killTimestamps = [];
    window.kartStats.deathTimestamps = [];
    window.kartStats.sawJoinedRoom = false;
    window.kartStats.sawStartGame = false;
    window.kartStats.awaitingStartType = true;
    window.kartStats.players = [];
    window.kartStats.matchCode = null;
    window.kartStats.isSpecialMode = false;
    window.kartStats.isCustomMode = false;
    if (window.kartStats._gameEndTimeout) {
        clearTimeout(window.kartStats._gameEndTimeout);
        window.kartStats._gameEndTimeout = null;
    }
}

// Performance optimization: Debounced event listener
let eventTimeout = null;
window.addEventListener("message", function(event) {
    if (event.data && typeof event.data === "object") {
        if (eventTimeout) {
            clearTimeout(eventTimeout);
        }
        eventTimeout = setTimeout(() => {
            // console.log("[SKMT][INJECTED] Received message:", event.data); // Commented out
        }, 16); // ~60fps throttling
    }
});

// Apply optimized console interception
console.log = interceptConsole("log", originalLog);
console.info = interceptConsole("info", originalInfo);
console.warn = interceptConsole("warn", originalWarn);
console.error = interceptConsole("error", originalError); 