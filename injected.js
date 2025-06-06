console.log('[SKMT] Injected script running');

// Add a global event listener for game events
window.addEventListener('message', function(event) {
    if (event.data && typeof event.data === 'object') {
        console.log('[SKMT][INJECTED] Received message:', event.data);
    }
});

const originalLog = console.log;
const originalInfo = console.info;
const originalWarn = console.warn;
const originalError = console.error;

// Flag to prevent recursive logging
let isIntercepting = false;

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

// Track players in current match
let currentMatchPlayers = new Set();

// Real-time player detection state
let collectingPlayers = false;
let detectedPlayersSet = new Set();

function setSkid(skid) {
    if (skid && typeof skid === 'string' && skid.length > 5) {
        window.kartStats.skid = skid;
        originalLog('[SKMT] SKID set:', skid);
        window.postMessage({ type: 'SKMT_SKID_UPDATED', skid }, '*');
    }
}

function interceptConsole(method, original) {
    return function(...args) {
        if (isIntercepting) {
            return original.apply(console, args);
        }

        if (args[0] && typeof args[0] === 'string') {
            isIntercepting = true;
            const msg = args[0].toLowerCase();

            // Clear match code on game exit
            if (msg.includes('bytebrew: sending custom event: loading_unity_awake') ||
                msg.includes('bytebrew: sending custom event: confirmexitgame')) {
                if (window.kartStats.matchCode) {
                    window.kartStats.matchCode = null;
                    // Send empty match code update to content script
                    window.postMessage({ type: 'SKMT_MATCH_CODE_UPDATE', code: '' }, '*');
                    originalLog('[SKMT] Match code cleared on exit');
                }
            }

            // Detect SKID from AuthStateChanged log
            if (msg.includes('authstatechanged, uid:')) {
                const match = args[0].match(/uid:\s*([^,\s]+)/i);
                if (match && match[1]) {
                    setSkid(match[1].trim());
                }
            }

            // Handle special mode
            if (msg.includes('bytebrew: sending custom event: play_special_mode') ||
                msg.includes('bytebrew: sending custom event: play_special_mode_rules') ||
                msg.includes('bytebrew: sending custom event: play_special_mode_arena')) {
                window.kartStats.isSpecialMode = true;
                window.kartStats.isCustomMode = false;
                originalLog('[SKMT] Mode: Special mode detected');
            }

            // Custom mode: ON for any custom event
            if (
                msg.includes('bytebrew: sending custom event: create_game_rules') ||
                msg.includes('bytebrew: sending custom event: create_game_weapons') ||
                msg.includes('bytebrew: sending custom event: create_game_level') ||
                msg.includes('bytebrew: sending custom event: create_game_mode') ||
                msg.includes('bytebrew: sending custom event: join_or_create_private_mode') ||
                msg.includes('bytebrew: sending custom event: join_or_create_private_arena')
            ) {
                window.kartStats.isCustomMode = true;
                window.kartStats.isSpecialMode = false;
                originalLog('[SKMT] Mode: Custom mode detected');
            }

            // Normal mode: Reset both flags when joining a normal match
            if (msg.includes('bytebrew: sending custom event: play_3min_mode')) {
                window.kartStats.isSpecialMode = false;
                window.kartStats.isCustomMode = false;
                originalLog('[SKMT] Mode: Normal mode detected');
            }

            // Track players
            if (msg.includes('Vehicle Setup: VehicleCharacter - setting new head position -') ||
                msg.includes('Vehicle Setup: VehicleCharacter - setting original head position -')) {
                const playerMatch = args[0].match(/Vehicle Setup: VehicleCharacter - setting (?:new|original) head position - ([^\n]+)/);
                if (playerMatch && playerMatch[1]) {
                    const playerName = playerMatch[1].trim();
                    if (window.kartStats.matchActive) {
                        currentMatchPlayers.add(playerName);
                        originalLog('[SKMT] Player detected:', playerName);
                    }
                }
            }

            // Handle game start
            if (msg.includes('bytebrew: sending custom event: start_game')) {
                if (!window.kartStats.joined) {
                    window.kartStats.started = true;
                }
                window.kartStats.matchActive = true;
                window.kartStats.matchStartTime = Date.now();
                currentMatchPlayers.clear(); // Reset players for new match
                originalLog('[SKMT] Match started');
                window.postMessage({ type: 'SKMT_STATUS_UPDATE', status: 'started' }, '*');
            }

            // Handle game join
            if (msg.includes('bytebrew: sending custom event: joined_room')) {
                window.kartStats.joined = true;
                window.kartStats.started = false;
                window.kartStats.matchActive = true;
                window.kartStats.matchStartTime = Date.now();
                currentMatchPlayers.clear(); // Reset players for new match
                originalLog('[SKMT] Joined match');
                window.postMessage({ type: 'SKMT_STATUS_UPDATE', status: 'joined' }, '*');
            }

            // --- PLAYER DETECTION ---
            // Start collecting on match start/join
            if (msg.includes('bytebrew: sending custom event: start_game') ||
                msg.includes('bytebrew: sending custom event: joined_room')) {
                collectingPlayers = true;
                detectedPlayersSet.clear();
                originalLog('[SKMT] Player collection started');
            }
            // Stop collecting and store on match end/quit
            if (msg.includes('bytebrew: sending custom event: game_end') ||
                msg.includes('bytebrew: sending custom event: confirmexitgame')) {
                collectingPlayers = false;
                originalLog('[SKMT] Player collection ended. Final players:', Array.from(detectedPlayersSet));
            }
            // Collect player names in real time
            if (collectingPlayers && (msg.includes('vehicle setup: vehiclecharacter - setting new head position -') ||
                msg.includes('vehicle setup: vehiclecharacter - setting original head position -'))) {
                const playerMatch = args[0].match(/Vehicle Setup: VehicleCharacter - setting (?:new|original) head position - ([^\n]+)/);
                if (playerMatch && playerMatch[1]) {
                    const playerName = playerMatch[1].trim();
                    detectedPlayersSet.add(playerName);
                    originalLog('[SKMT] Player detected (real-time):', playerName);
                }
            }

            // Detect map from Unity asset bundle URL
            if (msg.includes('[unitycache]') && msg.includes('assetbundles/remote/webgl/')) {
                // First check if it's a scene bundle
                if (msg.includes('_scenes_all_')) {
                    const mapMatch = args[0].match(/assetbundles\/remote\/webgl\/([^_]+)-v1/);
                    if (mapMatch && mapMatch[1]) {
                        let mapName = mapMatch[1];
                        
                        // Map name formatting
                        mapName = mapName
                            .replace('smashislandscene', 'Smash Island')
                            .replace('dinoisland', 'Dino Island')
                            .replace('graveyardscene', 'Graveyard/Graveyard CTF')
                            .replace('lavapitscene', 'Lava Pit/Lava Pit CTF')
                            .replace('skatepark', 'Skate Park')
                            .replace('skyarenadropzonepinball', 'Sky Arena Dropzone/Sky Arena Pinball')
                            .replace('skyarenashowdownscene', 'Sky Arena Showdown')
                            .replace('skyarenatemples', 'Sky Arena Temples')
                            .replace('skyarenatunnels', 'Sky Arena Tunnels')
                            .replace('slicknslidescene', 'Slick n\' Slide')
                            .replace('smashfortscene', 'Smash Fort/Smash Fort CTF')
                            .replace('snowpark', 'Snow Shrine/Snowpark/Snowpark CTF')
                            .replace('spacestationscene', 'Space Station(s)')
                            .replace('stekysspeedwayscene', 'Steky\'s Speedway')
                            .replace('thegravelpitscene', 'Gravel Pit')
                            .replace('theoldgraveyard', 'Old Graveyard');

                        window.kartStats.currentMap = mapName;
                        originalLog('[SKMT] Map detected:', mapName);
                    }
                }
            }

            // Handle game end
            if (msg.includes('bytebrew: sending custom event: game_end') || 
                msg.includes('bytebrew: sending custom event: confirmexitgame')) {
                if (window.kartStats.matchActive && !window.kartStats._gameEndProcessed) {
                    window.kartStats._gameEndProcessed = true;
                    window.kartStats.matchEndTime = Date.now();
                    window.kartStats.matchActive = false;
                    
                    // Only set quit flag when explicitly quitting
                    if (msg.includes('confirmexitgame')) {
                        window.kartStats.quit = true;
                        originalLog('[SKMT] Match quit detected');
                    }
                    
                    // Calculate match duration
                    const matchDuration = window.kartStats.matchEndTime - window.kartStats.matchStartTime;
                    
                    // Capture match data with players and map
                    const matchObj = {
                        kills: window.kartStats.kills,
                        deaths: window.kartStats.deaths,
                        matchStartTime: window.kartStats.matchStartTime,
                        matchEndTime: window.kartStats.matchEndTime,
                        duration: matchDuration,
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
                    
                    // Log comprehensive stats
                    originalLog('[SKMT] Match stats:', {
                        kills: matchObj.kills,
                        deaths: matchObj.deaths,
                        killStreak: window.kartStats.killStreak,
                        mode: matchObj.isCustomMode ? 'custom' : (matchObj.isSpecialMode ? 'special' : 'normal'),
                        joined: matchObj.joined,
                        started: matchObj.started,
                        quit: matchObj.quit,
                        duration: matchDuration,
                        players: Array.from(detectedPlayersSet)
                    });
                    
                    // Send match data to popup
                    window.postMessage({
                        type: 'SKMT_MATCH_COMPLETE',
                        data: matchObj
                    }, '*');
                    console.log('[SKMT] Match ended with players:', Array.from(detectedPlayersSet));
                    
                    // Reset stats after sending match data
                    resetStats();
                    detectedPlayersSet.clear();
                }
            }

            // Handle actual game exit (loading_unity_awake)
            if (msg.includes('bytebrew: sending custom event: loading_unity_awake')) {
                if (window.kartStats.matchActive && !window.kartStats._gameEndProcessed) {
                    window.kartStats._gameEndProcessed = true;
                    // Set quit flag and preserve mode info for the current match
                    window.kartStats.quit = true;
                    window.kartStats.matchEndTime = Date.now();
                    
                    // Send match data before resetting modes
                    const matchObj = {
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
                    
                    // Send match data and wait for popup to update
                    window.postMessage({
                        type: 'SKMT_MATCH_COMPLETE',
                        data: matchObj
                    }, '*');

                    // Only reset modes if this is an explicit game exit
                    if (msg.includes('confirmexitgame')) {
                        window.kartStats.isSpecialMode = false;
                        window.kartStats.isCustomMode = false;
                    }
                }
            }

            // Track kills and deaths
            if (window.kartStats.matchActive) {
                if (msg.includes('destroyed_human')) {
                    window.kartStats.kills++;
                    window.kartStats.killTimestamps.push(Date.now());
                    window.kartStats.killStreak++;
                    originalLog('[SKMT] HUD: Kill streak updated to', window.kartStats.killStreak);
                    window.postMessage({ type: 'SKMT_KILLSTREAK_UPDATE', killStreak: window.kartStats.killStreak }, '*');
                    
                    // Calculate and send KDR update
                    const kdr = window.kartStats.deaths > 0 ? window.kartStats.kills / window.kartStats.deaths : window.kartStats.kills;
                    window.postMessage({ type: 'SKMT_KDR_UPDATE', kdr: kdr }, '*');
                }
                if (msg.includes('destroyed_by_human') || msg.includes('destroyed_by_bot')) {
                    window.kartStats.deaths++;
                    window.kartStats.deathTimestamps.push(Date.now());
                    window.kartStats.killStreak = 0;
                    originalLog('[SKMT] HUD: Deaths updated to', window.kartStats.deaths);
                    window.postMessage({ type: 'SKMT_DEATHS_UPDATE', deaths: window.kartStats.deaths }, '*');
                    window.postMessage({ type: 'SKMT_KILLSTREAK_UPDATE', killStreak: 0 }, '*');
                    
                    // Calculate and send KDR update
                    const kdr = window.kartStats.deaths > 0 ? window.kartStats.kills / window.kartStats.deaths : window.kartStats.kills;
                    window.postMessage({ type: 'SKMT_KDR_UPDATE', kdr: kdr }, '*');
                }
            }

            // Detect match code from JoinOrCreateGame or OnJoinedRoom logs
            if (msg.includes('joinorcreategame') || msg.includes('onjoinedroom')) {
                const match = args[0].match(/(?:joinorcreategame|onjoinedroom)\s+(\w+)/i);
                if (match && match[1]) {
                    window.kartStats.matchCode = match[1].trim();
                    // Send match code update to content script
                    window.postMessage({ type: 'SKMT_MATCH_CODE_UPDATE', code: window.kartStats.matchCode }, '*');
                    originalLog('[SKMT] Match code detected:', window.kartStats.matchCode);
                }
            }

            isIntercepting = false;
        }
        return original.apply(console, args);
    };
}

console.log = interceptConsole('log', originalLog);
console.info = interceptConsole('info', originalInfo);
console.warn = interceptConsole('warn', originalWarn);
console.error = interceptConsole('error', originalError);

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
    if (window.kartStats._gameEndTimeout) clearTimeout(window.kartStats._gameEndTimeout);
    window.kartStats._gameEndTimeout = null;
} 