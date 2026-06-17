// Function to format date and time
function formatDateTime(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Function to format duration
function formatDuration(duration) {
    if (!duration) return 'N/A';
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

// Function to format KDR
function formatKDR(kills, deaths) {
    if (deaths === 0) return kills > 0 ? kills.toFixed(2) : '0.00';
    return (kills / deaths).toFixed(2);
}

// Function to get match status
function getMatchStatus(match) {
    if (match.quit) return 'Quit';
    if (match.started && !match.quit) return 'Completed';
    if (match.joined && !match.started) return 'Joined';
    return 'Unknown';
}

// Function to get match mode
function getMatchMode(match) {
    if (match.isSpecialMode) return 'Special Mode';
    if (match.isCustomMode) return 'Custom Mode';
    return 'Normal Mode';
}

// Function to generate consistent match ID
function generateMatchId(match, mode) {
    const timestamp = match.matchStartTime || match.startTime;
    const map = match.map || 'unknown';
    const kills = match.kills || 0;
    const deaths = match.deaths || 0;
    // Create a deterministic ID based on match properties
    return `${timestamp}_${mode}_${map}_${kills}_${deaths}`.replace(/[^a-zA-Z0-9_]/g, '_');
}

// Declare currentSkid globally
let currentSkid = 'Default';

// Add favorites storage (using chrome.storage.local)
let favoriteMatches = {}; // Initialize as empty, load from storage

async function saveFavoriteMatches() {
    // Use the same key as the popup for synchronization
    // Use the global currentSkid
    const skid = currentSkid || 'Default';
    const key = `favoriteMatches_${skid}`;
    await new Promise(resolve => chrome.storage.local.set({ [key]: favoriteMatches }, resolve));
    console.log('[SKMT][MATCH_HISTORY] Saved favorite matches to storage.', favoriteMatches);
}

// Add match names storage
let matchNames = JSON.parse(localStorage.getItem('matchNames') || '{}');

function saveMatchNames() {
    localStorage.setItem('matchNames', JSON.stringify(matchNames));
}

// Function to create match card
function createMatchCard(match, index) {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.dataset.index = index;

    // Generate a unique ID for the match if it doesn't have one
    if (!match.id) {
        match.id = `${match.matchStartTime || match.startTime}_${index}`;
    }

    const duration = match.duration || (match.matchEndTime && match.matchStartTime ? match.matchEndTime - match.matchStartTime : 0);
    const status = getMatchStatus(match);
    const mode = getMatchMode(match);

    // Calculate highest kill streak and streaks without dying
    let highestKillStreak = 0;
    let streaksWithoutDying = {
        smashStreak: 0,
        smashtacularStreak: 0,
        smashosaurusStreak: 0,
        smashlvaniaStreak: 0,
        monsterSmashStreak: 0,
        potatoStreak: 0,
        smashSmashStreak: 0,
        potoatachioStreak: 0
    };
    let quickKillsStreaks = {
        doubleSmash: 0,
        multiSmash: 0,
        multiMegaSmash: 0,
        multiMegaUltraSmash: 0,
        gooseySmash: 0,
        crazyMultiMegaUltraSmash: 0
    };

    if (match.killTimestamps && match.killTimestamps.length > 0) {
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

                // Check for streaks without dying
                if (currentStreak >= 3 && !achievedMilestones[3]) { streaksWithoutDying.smashStreak++; achievedMilestones[3] = true; }
                if (currentStreak >= 5 && !achievedMilestones[5]) { streaksWithoutDying.smashtacularStreak++; achievedMilestones[5] = true; }
                if (currentStreak >= 7 && !achievedMilestones[7]) { streaksWithoutDying.smashosaurusStreak++; achievedMilestones[7] = true; }
                if (currentStreak >= 10 && !achievedMilestones[10]) { streaksWithoutDying.smashlvaniaStreak++; achievedMilestones[10] = true; }
                if (currentStreak >= 15 && !achievedMilestones[15]) { streaksWithoutDying.monsterSmashStreak++; achievedMilestones[15] = true; }
                if (currentStreak >= 20 && !achievedMilestones[20]) { streaksWithoutDying.potatoStreak++; achievedMilestones[20] = true; }
                if (currentStreak >= 25 && !achievedMilestones[25]) { streaksWithoutDying.smashSmashStreak++; achievedMilestones[25] = true; }
                if (currentStreak >= 30 && !achievedMilestones[30]) { streaksWithoutDying.potoatachioStreak++; achievedMilestones[30] = true; }

                // Check for quick kills streaks
                if (lastKillTime === null) {
                    // First kill after death
                    quickKillStreak = 1;
                    lastKillTime = event.time;
                } else {
                    const timeSinceLastKill = event.time - lastKillTime;
                    if (timeSinceLastKill <= 4000) {
                        // Kill within 4 seconds of last kill - INCREASE STREAK
                        quickKillStreak++;
                        if (quickKillStreak === 2) quickKillsStreaks.doubleSmash++;
                        if (quickKillStreak === 3) quickKillsStreaks.multiSmash++;
                        if (quickKillStreak === 4) quickKillsStreaks.multiMegaSmash++;
                        if (quickKillStreak === 5) quickKillsStreaks.multiMegaUltraSmash++;
                        if (quickKillStreak === 6) quickKillsStreaks.gooseySmash++;
                        if (quickKillStreak === 7) quickKillsStreaks.crazyMultiMegaUltraSmash++;
                    } else {
                        // Kill after more than 4 seconds - RESET STREAK
                        quickKillStreak = 1;
                    }
                    lastKillTime = event.time;
                }
            }
        });
        highestKillStreak = maxStreak;
    }

    // Get players from match data
    let detectedPlayers = [];
    if (Array.isArray(match.players)) {
        detectedPlayers = [...new Set(match.players)];
    }

    // Get match indicators
    let indicators = [];
    if (match.joined) indicators.push('Joined');
    if (match.started) indicators.push('Started');
    if (match.quit) indicators.push('Quit');
    else indicators.push('Completed');
    if (match.isSpecialMode) indicators.push('Special Mode');
    if (match.isCustomMode) indicators.push('Custom Match');
    if (match.mode) indicators.push(`${match.mode.charAt(0).toUpperCase() + match.mode.slice(1)} Mode`);

    card.innerHTML = `
        <div class="match-header">
            <div class="match-header-left">
                <div class="match-number">Match #${index + 1}</div>
                <div class="match-name-container">
                    <span class="match-name-text ${matchNames[match.matchStartTime] ? 'has-name' : ''}">${matchNames[match.matchStartTime] || 'Click to add name'}</span>
                    <input type="text" class="match-name-input" placeholder="Enter match name..." style="display: none;">
                    <button class="edit-name-btn" title="Edit match name">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                </div>
            </div>
            <div class="match-info">
                <div class="match-date">${formatDateTime(match.matchStartTime || match.startTime)}</div>
                <div class="match-map">${match.map || 'Unknown Map'}</div>
                <div class="match-actions">
                    <button class="create-link-btn" title="Create shareable link">
                        <i class="fas fa-link"></i>
                    </button>
                <button class="favorite-btn" data-match-id="${match.id}">
                    <i class="fas fa-star ${favoriteMatches[match.matchStartTime] ? 'active' : ''}"></i>
                </button>
                </div>
            </div>
        </div>
        <div class="match-stats">
            <div class="stat-item">
                <div class="stat-value">${match.kills || 0}</div>
                <div class="stat-label">Kills</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${match.deaths || 0}</div>
                <div class="stat-label">Deaths</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${formatKDR(match.kills || 0, match.deaths || 0)}</div>
                <div class="stat-label">KDR</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${formatDuration(duration)}</div>
                <div class="stat-label">Duration</div>
            </div>
        </div>
        <div class="match-footer">
            <div class="match-mode">${mode}</div>
            <div class="match-status ${status.toLowerCase()}">${status}</div>
        </div>
        <div class="match-details">
            <div class="details-grid">
                <div class="detail-item">
                    <div class="detail-label">Map</div>
                    <div class="detail-value">${match.map || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Start Time</div>
                    <div class="detail-value">${formatDateTime(match.matchStartTime || match.startTime)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">End Time</div>
                    <div class="detail-value">${formatDateTime(match.matchEndTime || match.endTime)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Mode</div>
                    <div class="detail-value">${mode}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Kills</div>
                    <div class="detail-value">${match.kills || 0}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Deaths</div>
                    <div class="detail-value">${match.deaths || 0}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">KDR</div>
                    <div class="detail-value">${formatKDR(match.kills || 0, match.deaths || 0)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Duration</div>
                    <div class="detail-value">${formatDuration(duration)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Highest Kill Streak</div>
                    <div class="detail-value">${highestKillStreak}</div>
                </div>
            </div>

            ${Object.values(streaksWithoutDying).some(v => v > 0) ? `
            <div class="detail-section">
                <div class="detail-section-title">Streaks (Without Dying)</div>
                <div class="detail-section-content">
                    ${streaksWithoutDying.smashStreak > 0 ? `<div class="detail-item"><div class="detail-label">Smash Streak (3)</div><div class="detail-value">${streaksWithoutDying.smashStreak}</div></div>` : ''}
                    ${streaksWithoutDying.smashtacularStreak > 0 ? `<div class="detail-item"><div class="detail-label">Smashtacular Streak (5)</div><div class="detail-value">${streaksWithoutDying.smashtacularStreak}</div></div>` : ''}
                    ${streaksWithoutDying.smashosaurusStreak > 0 ? `<div class="detail-item"><div class="detail-label">Smashosaurus Streak (7)</div><div class="detail-value">${streaksWithoutDying.smashosaurusStreak}</div></div>` : ''}
                    ${streaksWithoutDying.smashlvaniaStreak > 0 ? `<div class="detail-item"><div class="detail-label">Smashlvania Streak (10)</div><div class="detail-value">${streaksWithoutDying.smashlvaniaStreak}</div></div>` : ''}
                    ${streaksWithoutDying.monsterSmashStreak > 0 ? `<div class="detail-item"><div class="detail-label">Monster Smash Streak (15)</div><div class="detail-value">${streaksWithoutDying.monsterSmashStreak}</div></div>` : ''}
                    ${streaksWithoutDying.potatoStreak > 0 ? `<div class="detail-item"><div class="detail-label">Potato Streak (20)</div><div class="detail-value">${streaksWithoutDying.potatoStreak}</div></div>` : ''}
                    ${streaksWithoutDying.smashSmashStreak > 0 ? `<div class="detail-item"><div class="detail-label">Smash Smash Streak (25)</div><div class="detail-value">${streaksWithoutDying.smashSmashStreak}</div></div>` : ''}
                    ${streaksWithoutDying.potoatachioStreak > 0 ? `<div class="detail-item"><div class="detail-label">Potoatachio Streak (30)</div><div class="detail-value">${streaksWithoutDying.potoatachioStreak}</div></div>` : ''}
                </div>
            </div>
            ` : ''}

            ${Object.values(quickKillsStreaks).some(v => v > 0) ? `
            <div class="detail-section">
                <div class="detail-section-title">Streaks (Quick Kills)</div>
                <div class="detail-section-content">
                    ${quickKillsStreaks.doubleSmash > 0 ? `<div class="detail-item"><div class="detail-label">Double Smash (2)</div><div class="detail-value">${quickKillsStreaks.doubleSmash}</div></div>` : ''}
                    ${quickKillsStreaks.multiSmash > 0 ? `<div class="detail-item"><div class="detail-label">Multi Smash (3)</div><div class="detail-value">${quickKillsStreaks.multiSmash}</div></div>` : ''}
                    ${quickKillsStreaks.multiMegaSmash > 0 ? `<div class="detail-item"><div class="detail-label">Multi Mega Smash (4)</div><div class="detail-value">${quickKillsStreaks.multiMegaSmash}</div></div>` : ''}
                    ${quickKillsStreaks.multiMegaUltraSmash > 0 ? `<div class="detail-item"><div class="detail-label">Multi Mega Ultra Smash (5)</div><div class="detail-value">${quickKillsStreaks.multiMegaUltraSmash}</div></div>` : ''}
                    ${quickKillsStreaks.gooseySmash > 0 ? `<div class="detail-item"><div class="detail-label">Goosey Smash (6)</div><div class="detail-value">${quickKillsStreaks.gooseySmash}</div></div>` : ''}
                    ${quickKillsStreaks.crazyMultiMegaUltraSmash > 0 ? `<div class="detail-item"><div class="detail-label">Crazy Multi Mega Ultra Smash (7)</div><div class="detail-value">${quickKillsStreaks.crazyMultiMegaUltraSmash}</div></div>` : ''}
                </div>
            </div>
            ` : ''}

            <div class="detail-section">
                <div class="detail-section-title">Detected Players In Room</div>
                <div class="detail-section-content">
                    ${detectedPlayers.length > 0 ? 
                        detectedPlayers.map(p => `<div class="detail-item"><div class="detail-value">${p}</div></div>`).join('') : 
                        '<div class="detail-item"><div class="detail-value" style="color:#aaa;">Currently unable to fetch player names, awaiting for devs patch to hopefully restore this feature</div></div>'
                    }
                </div>
            </div>

            <div class="match-indicators">${indicators.join(' | ')}</div>
        </div>
    `;

    // Add click event to toggle details
    card.addEventListener('click', (e) => {
        // Don't toggle if clicking the favorite button or edit name button
        if (e.target.closest('.favorite-btn') || e.target.closest('.edit-name-btn')) {
            e.stopPropagation();
            return;
        }
        const details = card.querySelector('.match-details');
        details.classList.toggle('active');
    });

    // Add favorite button click handler
    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const star = favoriteBtn.querySelector('i');
        const isFavorite = star.classList.contains('active');
        
        // Toggle favorite state
        star.classList.toggle('active');
        
        // Update favorites storage
        if (isFavorite) {
            delete favoriteMatches[match.matchStartTime];
        } else {
            favoriteMatches[match.matchStartTime] = true;
        }
        saveFavoriteMatches();
        
        // Reload matches to update sorting if needed
        if (document.getElementById('sortFilter').value === 'favorites') {
            loadMatches();
        }
    });

    // Add edit name button click handler
    const editNameBtn = card.querySelector('.edit-name-btn');
    const matchNameContainer = card.querySelector('.match-name-container');
    const matchNameText = card.querySelector('.match-name-text');
    const matchNameInput = card.querySelector('.match-name-input');

    editNameBtn.addEventListener('click', (e) => {
        console.log('[SKMT][MATCH_HISTORY] Edit name button clicked.', { matchId: match.id, detailsActive: card.querySelector('.match-details').classList.contains('active') });
        e.stopPropagation();
        
        // Hide text, show input, set value, and focus
        matchNameText.style.display = 'none';
        matchNameInput.style.display = 'inline-block';
        matchNameInput.value = matchNames[match.matchStartTime] || '';
        matchNameInput.focus();

        // Handle input completion
        const handleInputComplete = () => {
            console.log('[SKMT][MATCH_HISTORY] Input complete.', { value: matchNameInput.value });
            const newName = matchNameInput.value.trim();
            if (newName) {
                matchNames[match.matchStartTime] = newName;
                matchNameText.textContent = newName;
                matchNameText.classList.add('has-name');
            } else {
                delete matchNames[match.matchStartTime];
                matchNameText.textContent = 'Click to add name';
                matchNameText.classList.remove('has-name');
            }
            saveMatchNames();
            console.log('[SKMT][MATCH_HISTORY] Match names saved.', { matchNames });
            
            // Hide input, show text
            matchNameInput.style.display = 'none';
            matchNameText.style.display = 'inline-block';
            
            // Reload matches to update search results if needed
            if (document.getElementById('searchInput').value) {
                loadMatches();
            }
        };
        
        // Attach listeners to the input for this editing session
        matchNameInput.addEventListener('blur', handleInputComplete, { once: true });
        matchNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleInputComplete();
            }
        }, { once: true });

        console.log('[SKMT][MATCH_HISTORY] Swapped to input field and added listeners.');
    });

    // Add create link button click handler
    const createLinkBtn = card.querySelector('.create-link-btn');
    createLinkBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const matchData = {
            id: match.id,
            timestamp: match.matchStartTime,
            map: match.map,
            mode: match.isSpecialMode ? 'special' : 
                  match.isCustomMode ? 'custom' : 'normal',
            kills: match.kills,
            deaths: match.deaths,
            duration: match.duration,
            players: match.players,
            indicators: indicators,
            // Add streak data
            highestKillStreak: highestKillStreak,
            streaksWithoutDying: streaksWithoutDying,
            quickKillsStreaks: quickKillsStreaks,
            // Add start and end times
            startTime: match.matchStartTime || match.startTime,
            endTime: match.matchEndTime || match.endTime,
            // Add status indicators again for clarity in viewer
            statusIndicators: indicators
        };
        
        // Create a base64 encoded string of the match data
        const encodedData = btoa(JSON.stringify(matchData));
        // Use the correct GitHub Pages URL format
        const fullUrl = `https://leafbolt8.github.io/Kart-Companion/match-viewer.html?match=${encodedData}`;
        
        // Show modal with loading state
        const modal = document.getElementById('linkModal');
        const shareLinkInput = document.getElementById('shareLink');
        const copyBtn = document.getElementById('copyLink');
        
        shareLinkInput.value = 'Generating short link...';
        modal.classList.add('active');
        
        try {
            // Get shortened URL
            const shortUrl = await shortenUrl(fullUrl);
            shareLinkInput.value = shortUrl;
            
            // Handle copy button click
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(shortUrl).then(() => {
                    copyBtn.textContent = 'Copied!';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy Link';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                });
            };
        } catch (error) {
            console.error('Error generating short link:', error);
            // Fallback to original URL if shortening fails
            shareLinkInput.value = fullUrl;
            
            // Handle copy button click for original URL
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(fullUrl).then(() => {
                    copyBtn.textContent = 'Copied!';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy Link';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                });
            };
        }
        
        // Handle close button click
        document.getElementById('closeModal').onclick = () => {
            modal.classList.remove('active');
        };
        
        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        };
    });

    return card;
}

// Function to get stats from storage
function getStats() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['currentSkid'], (skidData) => {
            const currentSkid = skidData.currentSkid || 'Default';
            const currentPage = window.location.pathname.split('/').pop();
            let mode = 'all';
            
            // Determine mode based on current page
            if (currentPage === '3min-mode.html') {
                mode = 'normal';
            } else if (currentPage === 'special-mode.html') {
                mode = 'special';
            } else if (currentPage === 'custom-mode.html') {
                mode = 'custom';
            }

            console.log('[SKMT][MATCH_HISTORY][getStats] Current Page:', currentPage, 'Determined Mode:', mode, 'Current SKID:', currentSkid);

            const keysToFetch = ['currentSkid'];
            
            // Add keys based on mode
            if (mode === 'all') {
                ['normal', 'special', 'custom'].forEach(m => {
                    keysToFetch.push(`matchHistory_${currentSkid}_${m}`);
                    keysToFetch.push(`gamesJoined_${currentSkid}_${m}`);
                    keysToFetch.push(`gamesStarted_${currentSkid}_${m}`);
                    keysToFetch.push(`gamesQuit_${currentSkid}_${m}`);
                    keysToFetch.push(`matchesCompleted_${currentSkid}_${m}`);
                });
            } else {
                keysToFetch.push(`matchHistory_${currentSkid}_${mode}`);
                keysToFetch.push(`gamesJoined_${currentSkid}_${mode}`);
                keysToFetch.push(`gamesStarted_${currentSkid}_${mode}`);
                keysToFetch.push(`gamesQuit_${currentSkid}_${mode}`);
                keysToFetch.push(`matchesCompleted_${currentSkid}_${mode}`);
            }

            console.log('[SKMT][MATCH_HISTORY][getStats] Keys to Fetch:', keysToFetch);

            chrome.storage.local.get(keysToFetch, (data) => {
                console.log('[SKMT][MATCH_HISTORY][getStats] Data received:', data);
                let matchHistory = [];
                let gamesJoined = 0;
                let gamesStarted = 0;
                let gamesQuit = 0;
                let matchesCompleted = 0;

                if (mode === 'all') {
                    // Combine data from all modes
                    ['normal', 'special', 'custom'].forEach(m => {
                        const modeHistory = data[`matchHistory_${currentSkid}_${m}`] || [];
                        // Ensure each match has a unique ID and favorite state
                        modeHistory.forEach(match => {
                            if (!match.id) {
                                match.id = generateMatchId(match, m);
                            }
                            // Don't reset favorite state if it exists
                            if (match.favorite === undefined) {
                                match.favorite = false;
                            }
                        });
                        matchHistory = matchHistory.concat(modeHistory);
                        gamesJoined += data[`gamesJoined_${currentSkid}_${m}`] || 0;
                        gamesStarted += data[`gamesStarted_${currentSkid}_${m}`] || 0;
                        gamesQuit += data[`gamesQuit_${currentSkid}_${m}`] || 0;
                        matchesCompleted += data[`matchesCompleted_${currentSkid}_${m}`] || 0;
                    });
                } else {
                    // Get data for specific mode
                    matchHistory = data[`matchHistory_${currentSkid}_${mode}`] || [];
                    // Ensure each match has a unique ID and favorite state
                    matchHistory.forEach(match => {
                        if (!match.id) {
                            match.id = generateMatchId(match, mode);
                        }
                        // Don't reset favorite state if it exists
                        if (match.favorite === undefined) {
                            match.favorite = false;
                        }
                    });
                    gamesJoined = data[`gamesJoined_${currentSkid}_${mode}`] || 0;
                    gamesStarted = data[`gamesStarted_${currentSkid}_${mode}`] || 0;
                    gamesQuit = data[`gamesQuit_${currentSkid}_${mode}`] || 0;
                    matchesCompleted = data[`matchesCompleted_${currentSkid}_${mode}`] || 0;
                }

                // Sort match history by start time
                matchHistory.sort((a, b) => {
                    const timeA = a.matchStartTime || a.startTime || 0;
                    const timeB = b.matchStartTime || b.startTime || 0;
                    return timeB - timeA; // Most recent first for match history
                });

                // Log favorite states for debugging
                matchHistory.forEach(match => {
                    console.log(`[SKMT][MATCH_HISTORY] Match ${match.id} favorite state:`, match.favorite);
                });

                resolve({
                    matchHistory,
                    gamesJoined,
                    gamesStarted,
                    gamesQuit,
                    matchesCompleted,
                    currentSkid,
                    // Add mode-specific completed games data
                    [`matchesCompleted_${currentSkid}_normal`]: mode === 'all' ? (data[`matchesCompleted_${currentSkid}_normal`] || 0) : (mode === 'normal' ? matchesCompleted : 0),
                    [`matchesCompleted_${currentSkid}_special`]: mode === 'all' ? (data[`matchesCompleted_${currentSkid}_special`] || 0) : (mode === 'special' ? matchesCompleted : 0),
                    [`matchesCompleted_${currentSkid}_custom`]: mode === 'all' ? (data[`matchesCompleted_${currentSkid}_custom`] || 0) : (mode === 'custom' ? matchesCompleted : 0)
                });
            });
        });
    });
}

// Function to populate map filter
function populateMapFilter(matches) {
    const mapFilter = document.getElementById('mapFilter');
    const maps = new Set(matches.map(match => match.map || 'Unknown Map'));
    
    // Clear existing options except "All Maps"
    while (mapFilter.options.length > 1) {
        mapFilter.remove(1);
    }
    
    // Add map options
    [...maps].sort().forEach(map => {
        const option = document.createElement('option');
        option.value = map;
        option.textContent = map;
        mapFilter.appendChild(option);
    });
}

// Function to load and display matches
async function loadMatches() {
    console.log('[SKMT][MATCH_HISTORY] Starting loadMatches...');
    const modeFilter = document.getElementById('modeFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;
    const mapFilter = document.getElementById('mapFilter').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const matchesList = document.getElementById('matches-list');
    matchesList.innerHTML = '';

    try {
        console.log('[SKMT][MATCH_HISTORY] Getting stats...');
        // Fetch currentSkid and favoriteMatches in the initial getStats call
        const stats = await getStats();
        
        // Set the global currentSkid
        currentSkid = stats.currentSkid;

        // Load favorite matches into the global object after currentSkid is set
        const favoriteKey = `favoriteMatches_${currentSkid || 'Default'}`;
        const favoriteData = await new Promise(resolve => chrome.storage.local.get([favoriteKey], resolve));
        favoriteMatches = favoriteData[favoriteKey] || {};
        console.log('[SKMT][MATCH_HISTORY] Loaded favorite matches after setting skid:', favoriteMatches);

        console.log('[SKMT][MATCH_HISTORY] Stats received:', stats);
        
        let matches = stats.matchHistory;
        console.log('[SKMT][MATCH_HISTORY] Initial matches:', matches);

        // Inject favorite state into match history objects using the loaded favoriteMatches
         matches.forEach(match => {
            match.favorite = favoriteMatches[match.matchStartTime] === true;
         });
         console.log('[SKMT][MATCH_HISTORY] Matches with favorite state injected:', matches);


        // Populate map filter
        populateMapFilter(matches);

        // Filter by mode
        if (modeFilter !== 'all') {
            matches = matches.filter(match => {
                if (modeFilter === 'special') return match.isSpecialMode;
                if (modeFilter === 'custom') return match.isCustomMode;
                return !match.isSpecialMode && !match.isCustomMode;
            });
        }

        // Filter by map
        if (mapFilter !== 'all') {
            matches = matches.filter(match => (match.map || 'Unknown Map') === mapFilter);
        }

        // Filter by search query
        if (searchQuery) {
            matches = matches.filter(match => {
                const matchName = matchNames[match.matchStartTime] || '';
                return matchName.toLowerCase().includes(searchQuery);
            });
        }

        // Filter by favorites if that sort option is selected
        if (sortFilter === 'favorites') {
            matches = matches.filter(match => favoriteMatches[match.matchStartTime]);
        }

        console.log('[SKMT][MATCH_HISTORY] Matches after filters:', matches);

        // Sort matches
        matches.sort((a, b) => {
            const timeA = a.matchStartTime || a.startTime || 0;
            const timeB = b.matchStartTime || b.startTime || 0;
            
            switch (sortFilter) {
                case 'recent':
                    return timeB - timeA;
                case 'oldest':
                    return timeA - timeB;
                case 'kills':
                    return (b.kills || 0) - (a.kills || 0);
                case 'kdr':
                    const kdrA = (a.deaths || 0) === 0 ? (a.kills || 0) : (a.kills || 0) / (a.deaths || 0);
                    const kdrB = (b.deaths || 0) === 0 ? (b.kills || 0) : (b.kills || 0) / (b.deaths || 0);
                    return kdrB - kdrA;
                case 'favorites':
                    // Sort by most recent since we've already filtered to only favorites
                    return timeB - timeA;
                case 'longest':
                    const durationA = a.duration || (a.matchEndTime && a.matchStartTime ? a.matchEndTime - a.matchStartTime : 0);
                    const durationB = b.duration || (b.matchEndTime && b.matchStartTime ? b.matchEndTime - b.matchStartTime : 0);
                    return durationB - durationA; // Longest first
                case 'deaths':
                    return (b.deaths || 0) - (a.deaths || 0); // Highest deaths first
                default:
                    return timeB - timeA;
            }
        });

        // Create and append match cards
        if (matches.length === 0) {
            console.log('[SKMT][MATCH_HISTORY] No matches found');
            matchesList.innerHTML = '<div class="no-matches">No matches found. Play some games to see your match history!</div>';
        } else {
            matches.forEach((match, index) => {
                console.log(`[SKMT][MATCH_HISTORY] Creating card for match ${index}:`, match);
                const card = createMatchCard(match, index);
                matchesList.appendChild(card);
            });
        }
    } catch (error) {
        console.error('[SKMT][MATCH_HISTORY] Error loading matches:', error);
        matchesList.innerHTML = '<div class="error">Error loading matches. Please try again later.</div>';
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    console.log('[SKMT][MATCH_HISTORY] Page loaded, initializing...');
    loadMatches();

    // Add event listeners for filters
    document.getElementById('modeFilter').addEventListener('change', loadMatches);
    document.getElementById('sortFilter').addEventListener('change', loadMatches);
    document.getElementById('mapFilter').addEventListener('change', loadMatches);
    document.getElementById('searchInput').addEventListener('input', loadMatches);

    // Check for showCopyModal parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get('match');
    const showCopyModal = urlParams.get('showCopyModal');

    if (matchId && showCopyModal === 'true') {
        // Wait for matches to load before showing the modal
        const checkMatchesLoaded = setInterval(async () => {
            const matches = await getStats();
            const targetMatch = matches.matchHistory.find(m => m.matchStartTime === parseInt(matchId));
            
            if (targetMatch) {
                clearInterval(checkMatchesLoaded);
                // Find the match card and trigger the create link button click
                const matchCard = document.querySelector(`[data-index="${matches.matchHistory.indexOf(targetMatch)}"]`);
                if (matchCard) {
                    const createLinkBtn = matchCard.querySelector('.create-link-btn');
                    if (createLinkBtn) {
                        createLinkBtn.click();
                    }
                }
            }
        }, 100); // Check every 100ms

        // Clear interval after 5 seconds if match is not found
        setTimeout(() => clearInterval(checkMatchesLoaded), 5000);
    }
});

// Add chrome.storage.onChanged listener to react to changes from popup
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        // Use the global currentSkid, but fetch it again as a fallback if not set
        const skid = currentSkid || 'Default';
        const favoriteKey = `favoriteMatches_${skid}`;
        
        if (changes[favoriteKey]) {
            console.log('[SKMT][MATCH_HISTORY] Favorite matches changed in storage, reloading matches.');
            // Update the local favoriteMatches object
            favoriteMatches = changes[favoriteKey].newValue || {};
            loadMatches(); // Reload matches to update the display and sorting
        } else if (skid !== 'Default') { // Only react to other changes if currentSkid is properly set
             // Only reload if the change is relevant to the current skid for other data
             const skidRelevant = Object.keys(changes).some(key => key.includes(`_${skid}_`));
             if (skidRelevant) {
                 console.log('[SKMT][MATCH_HISTORY] Other relevant data changed in storage, reloading matches.');
                 loadMatches(); // Reload matches
             }
        }
    }
});

// Add this function at the top of the file, after any existing functions
async function shortenUrl(longUrl) {
    try {
        const response = await fetch('https://tinyurl.com/api-create.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `url=${encodeURIComponent(longUrl)}`
        });
        
        if (!response.ok) {
            throw new Error('Failed to shorten URL');
        }
        
        return await response.text();
    } catch (error) {
        console.error('Error shortening URL:', error);
        return longUrl; // Return original URL if shortening fails
    }
} 