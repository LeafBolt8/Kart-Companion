// Performance optimization: Cache stats to reduce recalculations
let statsCache = null;
let lastStatsUpdate = 0;
const STATS_CACHE_DURATION = 10000; // 10 seconds instead of 5

// Performance optimization: Debounced stats updates
let statsUpdateTimeout = null;
const STATS_UPDATE_DELAY = 0; // No delay - immediate display

let statsWorker = null;
if (window.Worker) {
    try {
        statsWorker = new Worker('webapp/src/utils/statsWorker.js');
    } catch (e) {
        console.warn('Stats Worker could not be loaded:', e);
        statsWorker = null;
    }
}

async function getStats() {
    // Performance optimization: Return cached stats if recent
    const now = Date.now();
    if (statsCache && (now - lastStatsUpdate) < STATS_CACHE_DURATION) {
        return statsCache;
    }

    return new Promise((resolve) => {
        chrome.storage.local.get(['currentSkid'], (skidData) => {
            const currentSkid = skidData.currentSkid || "Default";
            
            // Performance optimization: Batch storage operations
            const keysToFetch = [];
            ['normal', 'special', 'custom'].forEach(mode => {
                keysToFetch.push(`matchHistory_${currentSkid}_${mode}`);
                keysToFetch.push(`gamesJoined_${currentSkid}_${mode}`);
                keysToFetch.push(`gamesStarted_${currentSkid}_${mode}`);
                keysToFetch.push(`gamesQuit_${currentSkid}_${mode}`);
                keysToFetch.push(`matchesCompleted_${currentSkid}_${mode}`);
            });

            chrome.storage.local.get(keysToFetch, (data) => {
                console.log('[SKMT][STATS-NUMBERS][getStats] Raw data received:', data);
                
                let matchHistory = [];
                let gamesJoined = 0;
                let gamesStarted = 0;
                let gamesQuit = 0;
                let matchesCompleted = 0;

                // Initialize combinedData object
                const combinedData = {
                    totalKills: 0,
                    totalDeaths: 0,
                    totalTimePlayed: 0,
                    highestKills: 0,
                    highestDeaths: 0,
                    highestKillStreak: 0,
                    highestKDR: 0,
                    longestTimePlayed: 0,
                    smashStreak: 0,
                    smashtacularStreak: 0,
                    smashosaurusStreak: 0,
                    smashlvaniaStreak: 0,
                    monsterSmashStreak: 0,
                    potatoStreak: 0,
                    smashSmashStreak: 0,
                    potoatachioStreak: 0,
                    doubleSmash: 0,
                    multiSmash: 0,
                    multiMegaSmash: 0,
                    multiMegaUltraSmash: 0,
                    gooseySmash: 0,
                    crazyMultiMegaUltraSmash: 0,
                    mapFrequencies: {} // Add map frequency tracking
                };

                // Combine data from all modes
                ['normal', 'special', 'custom'].forEach(mode => {
                    const modeHistory = data[`matchHistory_${currentSkid}_${mode}`] || [];
                    console.log(`[SKMT][STATS-NUMBERS][getStats] History for ${mode}:`, modeHistory);
                    matchHistory = matchHistory.concat(modeHistory);
                    gamesJoined += data[`gamesJoined_${currentSkid}_${mode}`] || 0;
                    gamesStarted += data[`gamesStarted_${currentSkid}_${mode}`] || 0;
                    gamesQuit += data[`gamesQuit_${currentSkid}_${mode}`] || 0;
                    matchesCompleted += data[`matchesCompleted_${currentSkid}_${mode}`] || 0;
                });

                console.log('[SKMT][STATS-NUMBERS][getStats] Combined match history:', matchHistory);

                // Sort match history by start time
                matchHistory.sort((a, b) => {
                    const timeA = a.matchStartTime || a.startTime || 0;
                    const timeB = b.matchStartTime || b.startTime || 0;
                    return timeA - timeB;
                });

                // Use Web Worker if available
                if (statsWorker) {
                    statsWorker.onmessage = function(e) {
                        const result = e.data;
                        // Compose final stats object
                        const finalStats = {
                            matchHistory: matchHistory,
                            gamesJoined: data[`gamesJoined_${currentSkid}_normal`] + data[`gamesJoined_${currentSkid}_special`] + data[`gamesJoined_${currentSkid}_custom`],
                            gamesStarted: data[`gamesStarted_${currentSkid}_normal`] + data[`gamesStarted_${currentSkid}_special`] + data[`gamesStarted_${currentSkid}_custom`],
                            gamesQuit: data[`gamesQuit_${currentSkid}_normal`] + data[`gamesQuit_${currentSkid}_special`] + data[`gamesQuit_${currentSkid}_custom`],
                            matchesCompleted: data[`matchesCompleted_${currentSkid}_normal`] + data[`matchesCompleted_${currentSkid}_special`] + data[`matchesCompleted_${currentSkid}_custom`],
                            currentSkid: currentSkid,
                            totalKills: result.kills,
                            totalDeaths: result.deaths,
                            totalTimePlayed: Math.floor(result.timePlayed / 1000),
                            highestKills: result.highestKills,
                            highestDeaths: result.highestDeaths,
                            highestKDR: result.highestKDR,
                            highestKillStreak: result.highestKillStreak,
                            longestTimePlayed: Math.floor(result.longestTime / 1000),
                            ...result.streaks,
                            ...result.quickStreaks,
                            mapFrequencies: result.mapCounts
                        };
                        statsCache = finalStats;
                        lastStatsUpdate = Date.now();
                        resolve(finalStats);
                    };
                    statsWorker.postMessage({ matches: matchHistory });
                } else {
                    // Fallback: use main thread calculation (existing logic)
                    // Performance optimization: Process matches in chunks to avoid blocking
                    const processMatchesInChunks = (matches, chunkSize = 50) => {
                        let currentIndex = 0;
                        
                        const processChunk = () => {
                            const endIndex = Math.min(currentIndex + chunkSize, matches.length);
                            
                            for (let i = currentIndex; i < endIndex; i++) {
                                const match = matches[i];
                                console.log(`[SKMT][STATS-NUMBERS][getStats] Processing match ${i}:`, JSON.stringify(match, null, 2));
                                
                                // Basic stats
                                combinedData.totalKills += match.kills || 0;
                                combinedData.totalDeaths += match.deaths || 0;
                                // Convert duration from milliseconds to seconds
                                const durationInSeconds = Math.floor((match.duration || 0) / 1000);
                                combinedData.totalTimePlayed += durationInSeconds;

                                // Track map frequency
                                const mapName = match.map || 'Unknown Map';
                                combinedData.mapFrequencies[mapName] = (combinedData.mapFrequencies[mapName] || 0) + 1;

                                // Update records
                                if (match.kills > combinedData.highestKills) {
                                    combinedData.highestKills = match.kills;
                                }
                                if (match.deaths > combinedData.highestDeaths) {
                                    combinedData.highestDeaths = match.deaths;
                                }

                                // Calculate KDR for the match
                                const matchKDR = match.deaths > 0 ? match.kills / match.deaths : match.kills;
                                if (matchKDR > combinedData.highestKDR) {
                                    combinedData.highestKDR = matchKDR;
                                }

                                // Use duration for longest time (in seconds)
                                if (durationInSeconds > combinedData.longestTimePlayed) {
                                    combinedData.longestTimePlayed = durationInSeconds;
                                }

                                // Performance optimization: Optimized streak calculations
                                if (match.killTimestamps && match.killTimestamps.length > 0) {
                                    calculateStreaksOptimized(match, combinedData);
                                }
                            }
                            
                            currentIndex = endIndex;
                            
                            if (currentIndex < matches.length) {
                                // Process next chunk asynchronously
                                setTimeout(processChunk, 0);
                            } else {
                                // All chunks processed, resolve with final data
                                const finalStats = {
                                    matchHistory: matchHistory,
                                    gamesJoined: gamesJoined,
                                    gamesStarted: gamesStarted,
                                    gamesQuit: gamesQuit,
                                    matchesCompleted: matchesCompleted,
                                    currentSkid: currentSkid,
                                    ...combinedData
                                };
                                
                                // Cache the results
                                statsCache = finalStats;
                                lastStatsUpdate = Date.now();
                                
                                resolve(finalStats);
                            }
                        };
                        
                        processChunk();
                    };

                    // Start processing matches
                    processMatchesInChunks(matchHistory);
                }
            });
        });
    });
}

// Performance optimization: Optimized streak calculations
function calculateStreaksOptimized(match, combinedData) {
    let currentStreak = 0;
    let maxStreak = 0;
    let quickKillStreak = 0;
    let lastKillTime = null;
    let achievedMilestones = {};
    
    // Create a combined timeline of kills and deaths
    const timeline = [];
    if (match.killTimestamps) {
        match.killTimestamps.forEach(time => timeline.push({ type: 'kill', time }));
    }
    if (match.deathTimestamps) {
        match.deathTimestamps.forEach(time => timeline.push({ type: 'death', time }));
    }
    // Sort timeline by timestamp
    timeline.sort((a, b) => a.time - b.time);

    // Process events in chronological order
    timeline.forEach(event => {
        if (event.type === 'death') {
            if (currentStreak > maxStreak) maxStreak = currentStreak;
            currentStreak = 0; // Reset streak on death
            achievedMilestones = {}; // Reset achieved milestones
            quickKillStreak = 0; // Reset quick kill streak on death
            lastKillTime = null; // Reset last kill time on death
        } else if (event.type === 'kill') {
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;

            // Update without dying streaks
            if (currentStreak >= 3 && !achievedMilestones[3]) { combinedData.smashStreak++; achievedMilestones[3] = true; }
            if (currentStreak >= 5 && !achievedMilestones[5]) { combinedData.smashtacularStreak++; achievedMilestones[5] = true; }
            if (currentStreak >= 7 && !achievedMilestones[7]) { combinedData.smashosaurusStreak++; achievedMilestones[7] = true; }
            if (currentStreak >= 10 && !achievedMilestones[10]) { combinedData.smashlvaniaStreak++; achievedMilestones[10] = true; }
            if (currentStreak >= 15 && !achievedMilestones[15]) { combinedData.monsterSmashStreak++; achievedMilestones[15] = true; }
            if (currentStreak >= 20 && !achievedMilestones[20]) { combinedData.potatoStreak++; achievedMilestones[20] = true; }
            if (currentStreak >= 25 && !achievedMilestones[25]) { combinedData.smashSmashStreak++; achievedMilestones[25] = true; }
            if (currentStreak >= 30 && !achievedMilestones[30]) { combinedData.potoatachioStreak++; achievedMilestones[30] = true; }

            // Handle quick kills streak
            if (lastKillTime === null) {
                // First kill after death
                quickKillStreak = 1;
                lastKillTime = event.time;
            } else {
                const timeSinceLastKill = event.time - lastKillTime;
                if (timeSinceLastKill <= 3000) { // 3 seconds for quick kills
                    // Kill within 3 seconds of last kill - INCREASE STREAK
                    quickKillStreak++;
                    if (quickKillStreak === 2) combinedData.doubleSmash++;
                    if (quickKillStreak === 3) combinedData.multiSmash++;
                    if (quickKillStreak === 4) combinedData.multiMegaSmash++;
                    if (quickKillStreak === 5) combinedData.multiMegaUltraSmash++;
                    if (quickKillStreak === 6) combinedData.gooseySmash++;
                    if (quickKillStreak === 7) combinedData.crazyMultiMegaUltraSmash++;
                } else {
                    // Kill after more than 3 seconds - RESET STREAK
                    quickKillStreak = 1;
                }
                lastKillTime = event.time;
            }
        }
    });

    // Update highest kill streak
    if (maxStreak > combinedData.highestKillStreak) {
        combinedData.highestKillStreak = maxStreak;
    }
}

// Performance optimization: Debounced stats update function
function updateStats(shouldAnimate = false) {
    console.log('[SKMT][STATS-NUMBERS][updateStats] Starting stats update');
    
    // Clear any pending update
    if (statsUpdateTimeout) {
        clearTimeout(statsUpdateTimeout);
    }
    
    // Immediate update with no animation
    statsUpdateTimeout = setTimeout(async () => {
        const stats = await getStats();
        console.log('[SKMT][STATS-NUMBERS][updateStats] Stats received:', stats);

        // Helper function to update value without animation
        const updateValue = (element, value, type = 'value') => {
            switch (type) {
                case 'decimal':
                    element.textContent = value.toFixed(2);
                    break;
                case 'time':
                    element.textContent = formatTime(value);
                    break;
                default:
                    element.textContent = value;
            }
        };

        // Primary Stats
        updateValue(document.getElementById('kills'), stats.totalKills);
        updateValue(document.getElementById('deaths'), stats.totalDeaths);
        updateValue(document.getElementById('kdr'), (stats.totalDeaths > 0 ? stats.totalKills / stats.totalDeaths : stats.totalKills), 'decimal');
        updateValue(document.getElementById('timePlayed'), stats.totalTimePlayed, 'time');
        updateValue(document.getElementById('matchesCompleted'), stats.matchesCompleted);

        // Secondary Stats
        updateValue(document.getElementById('matchesJoined'), stats.gamesJoined);
        updateValue(document.getElementById('matchesStarted'), stats.gamesStarted);
        updateValue(document.getElementById('matchesQuit'), stats.gamesQuit);
        updateValue(document.getElementById('totalMatches'), stats.matchesCompleted + stats.gamesQuit);
        
        const totalMatches = stats.matchesCompleted + stats.gamesQuit;
        const completedRate = totalMatches > 0 ? (stats.matchesCompleted / totalMatches * 100) : 0;
        const quitRate = totalMatches > 0 ? (stats.gamesQuit / totalMatches * 100) : 0;
        
        updateValue(document.getElementById('matchesCompletedRate'), completedRate, 'decimal');
        updateValue(document.getElementById('matchesQuitRate'), quitRate, 'decimal');

        // Average Stats
        const avgKills = stats.matchesCompleted > 0 ? stats.totalKills / stats.matchesCompleted : 0;
        const avgDeaths = stats.matchesCompleted > 0 ? stats.totalDeaths / stats.matchesCompleted : 0;
        const avgTime = stats.matchesCompleted > 0 ? stats.totalTimePlayed / stats.matchesCompleted : 0;
        
        updateValue(document.getElementById('avgKills'), avgKills, 'decimal');
        updateValue(document.getElementById('avgDeaths'), avgDeaths, 'decimal');
        updateValue(document.getElementById('avgTime'), avgTime, 'time');

        // Records
        updateValue(document.getElementById('highestKills'), stats.highestKills);
        updateValue(document.getElementById('highestDeaths'), stats.highestDeaths);
        updateValue(document.getElementById('highestKillStreak'), stats.highestKillStreak);
        updateValue(document.getElementById('highestKDR'), stats.highestKDR, 'decimal');
        updateValue(document.getElementById('longestTime'), stats.longestTimePlayed, 'time');

        // Favorite Maps
        const topMaps = Object.entries(stats.mapFrequencies || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        for (let i = 1; i <= 5; i++) {
            const mapNameElement = document.getElementById(`topMap${i}Name`);
            const mapCountElement = document.getElementById(`topMap${i}Count`);
            if (mapNameElement && mapCountElement) {
                const mapData = topMaps[i - 1];
                if (mapData) {
                    mapNameElement.textContent = mapData[0];
                    mapCountElement.textContent = mapData[1];
                } else {
                    mapNameElement.textContent = '-';
                    mapCountElement.textContent = '-';
                }
            }
        }

        // Streaks (Without Dying)
        updateValue(document.getElementById('smashStreak'), stats.smashStreak);
        updateValue(document.getElementById('smashtacularStreak'), stats.smashtacularStreak);
        updateValue(document.getElementById('smashosaurusStreak'), stats.smashosaurusStreak);
        updateValue(document.getElementById('smashlvaniaStreak'), stats.smashlvaniaStreak);
        updateValue(document.getElementById('monsterSmashStreak'), stats.monsterSmashStreak);
        updateValue(document.getElementById('potatoStreak'), stats.potatoStreak);
        updateValue(document.getElementById('smashSmashStreak'), stats.smashSmashStreak);
        updateValue(document.getElementById('potoatachioStreak'), stats.potoatachioStreak);

        // Quick Kills Streaks
        updateValue(document.getElementById('doubleSmash'), stats.doubleSmash);
        updateValue(document.getElementById('multiSmash'), stats.multiSmash);
        updateValue(document.getElementById('multiMegaSmash'), stats.multiMegaSmash);
        updateValue(document.getElementById('multiMegaUltraSmash'), stats.multiMegaUltraSmash);
        updateValue(document.getElementById('gooseySmash'), stats.gooseySmash);
        updateValue(document.getElementById('crazyMultiMegaUltraSmash'), stats.crazyMultiMegaUltraSmash);

        console.log('[SKMT][STATS-NUMBERS][updateStats] Stats update completed');
    }, STATS_UPDATE_DELAY);
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    } else {
        return `${remainingSeconds}s`;
    }
}

// Performance optimization: Reduced update frequency
setInterval(() => {
    console.log('[SKMT][STATS-NUMBERS] Interval update triggered');
    updateStats(false); // Don't animate during regular updates
}, STATS_CACHE_DURATION); // Use cache duration instead of 5 seconds

// Performance optimization: Clear cache when storage changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        // Clear cache when relevant data changes
        const hasRelevantChanges = Object.keys(changes).some(key => 
            key.includes('matchHistory_') || 
            key.includes('gamesJoined_') || 
            key.includes('gamesStarted_') || 
            key.includes('gamesQuit_') || 
            key.includes('matchesCompleted_')
        );
        
        if (hasRelevantChanges) {
            statsCache = null; // Clear cache to force refresh
            console.log('[SKMT][STATS-NUMBERS] Cache cleared due to storage changes');
        }
    }
});

// Performance optimization: Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (statsUpdateTimeout) {
        clearTimeout(statsUpdateTimeout);
    }
});

// Initialize stats on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('[SKMT][STATS-NUMBERS] Page loaded, initializing stats');
    updateStats(true); // Animate initial load
}); 