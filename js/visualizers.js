// Helper: Get stats from storage
async function getStats() {
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

            console.log('[SKMT][VISUALIZER][getStats] Current Page:', currentPage, 'Determined Mode:', mode, 'Current SKID:', currentSkid);

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

            console.log('[SKMT][VISUALIZER][getStats] Keys to Fetch:', keysToFetch);

            chrome.storage.local.get(keysToFetch, (data) => {
                console.log('[SKMT][VISUALIZER][getStats] Data received:', data);
                let matchHistory = [];
                let gamesJoined = 0;
                let gamesStarted = 0;
                let gamesQuit = 0;
                let matchesCompleted = 0;

                if (mode === 'all') {
                    // Combine data from all modes
                    ['normal', 'special', 'custom'].forEach(m => {
                        const modeHistory = data[`matchHistory_${currentSkid}_${m}`] || [];
                        matchHistory = matchHistory.concat(modeHistory);
                        gamesJoined += data[`gamesJoined_${currentSkid}_${m}`] || 0;
                        gamesStarted += data[`gamesStarted_${currentSkid}_${m}`] || 0;
                        gamesQuit += data[`gamesQuit_${currentSkid}_${m}`] || 0;
                        matchesCompleted += data[`matchesCompleted_${currentSkid}_${m}`] || 0;
                    });
                } else {
                    // Get data for specific mode
                    matchHistory = data[`matchHistory_${currentSkid}_${mode}`] || [];
                    gamesJoined = data[`gamesJoined_${currentSkid}_${mode}`] || 0;
                    gamesStarted = data[`gamesStarted_${currentSkid}_${mode}`] || 0;
                    gamesQuit = data[`gamesQuit_${currentSkid}_${mode}`] || 0;
                    matchesCompleted = data[`matchesCompleted_${currentSkid}_${mode}`] || 0;
                }

                // Sort match history by start time
                matchHistory.sort((a, b) => {
                    const timeA = a.matchStartTime || a.startTime || 0;
                    const timeB = b.matchStartTime || b.startTime || 0;
                    return timeA - timeB;
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

// Calculate streaks (without dying and quick kills)
function calculateStreaks(matchHistory) {
    // Without Dying
    const streaks = {
        smashStreak: 0,
        smashtacularStreak: 0,
        smashosaurusStreak: 0,
        smashlvaniaStreak: 0,
        monsterSmashStreak: 0,
        potatoStreak: 0,
        smashSmashStreak: 0,
        potoatachioStreak: 0
    };
    // Quick Kills
    const quickStreaks = {
        doubleSmash: 0,
        multiSmash: 0,
        multiMegaSmash: 0,
        multiMegaUltraSmash: 0,
        gooseySmash: 0,
        crazyMultiMegaUltraSmash: 0
    };
    matchHistory.forEach(match => {
        // Without Dying
        let currentStreak = 0;
        let achieved = {};
        const timeline = [];
        if (match.killTimestamps) match.killTimestamps.forEach(time => timeline.push({ type: 'kill', time }));
        if (match.deathTimestamps) match.deathTimestamps.forEach(time => timeline.push({ type: 'death', time }));
        timeline.sort((a, b) => a.time - b.time);
        timeline.forEach(event => {
            if (event.type === 'death') {
                currentStreak = 0;
                achieved = {};
            } else if (event.type === 'kill') {
                currentStreak++;
                if (currentStreak >= 3 && !achieved[3]) { streaks.smashStreak++; achieved[3] = true; }
                if (currentStreak >= 5 && !achieved[5]) { streaks.smashtacularStreak++; achieved[5] = true; }
                if (currentStreak >= 7 && !achieved[7]) { streaks.smashosaurusStreak++; achieved[7] = true; }
                if (currentStreak >= 10 && !achieved[10]) { streaks.smashlvaniaStreak++; achieved[10] = true; }
                if (currentStreak >= 15 && !achieved[15]) { streaks.monsterSmashStreak++; achieved[15] = true; }
                if (currentStreak >= 20 && !achieved[20]) { streaks.potatoStreak++; achieved[20] = true; }
                if (currentStreak >= 25 && !achieved[25]) { streaks.smashSmashStreak++; achieved[25] = true; }
                if (currentStreak >= 30 && !achieved[30]) { streaks.potoatachioStreak++; achieved[30] = true; }
            }
        });
        // Quick Kills
        if (match.killTimestamps && match.killTimestamps.length > 0) {
            let quickKillStreak = 1;
            let lastKillTime = match.killTimestamps[0];
            for (let i = 1; i < match.killTimestamps.length; i++) {
                const currentKillTime = match.killTimestamps[i];
                const timeDiff = currentKillTime - lastKillTime;
                if (timeDiff <= 3000) {
                    quickKillStreak++;
                    if (quickKillStreak === 2) quickStreaks.doubleSmash++;
                    if (quickKillStreak === 3) quickStreaks.multiSmash++;
                    if (quickKillStreak === 4) quickStreaks.multiMegaSmash++;
                    if (quickKillStreak === 5) quickStreaks.multiMegaUltraSmash++;
                    if (quickKillStreak === 6) quickStreaks.gooseySmash++;
                    if (quickKillStreak === 7) quickStreaks.crazyMultiMegaUltraSmash++;
                } else {
                    quickKillStreak = 1;
                }
                lastKillTime = currentKillTime;
            }
        }
    });
    return { streaks, quickStreaks };
}

// Customizable Game Trends Chart
function renderCustomTrendsChart(matchHistory, selectedMetrics, selectedMap = 'all') {
    const ctx = document.getElementById('customTrendsChart').getContext('2d');
    
    // Filter match history by selected map
    const filteredHistory = selectedMap === 'all' 
        ? matchHistory 
        : matchHistory.filter(m => m.map === selectedMap);

    if (filteredHistory.length === 0) {
        if (window.customTrendsChartInstance) {
            window.customTrendsChartInstance.destroy();
        }
        return;
    }

    // Compute all possible data arrays
    let totalKills = 0, totalDeaths = 0, totalTime = 0;
    const killsArr = [], deathsArr = [], kdrArr = [], totalKillsArr = [], totalDeathsArr = [], totalKdrArr = [], timePlayedArr = [], totalTimeArr = [];
    filteredHistory.forEach((m, i) => {
        killsArr.push(m.kills);
        deathsArr.push(m.deaths);
        kdrArr.push(m.deaths === 0 ? (m.kills > 0 ? m.kills : 0) : (m.kills / m.deaths));
        totalKills += m.kills;
        totalDeaths += m.deaths;
        totalKillsArr.push(totalKills);
        totalDeathsArr.push(totalDeaths);
        totalKdrArr.push(totalDeaths === 0 ? (totalKills > 0 ? totalKills : 0) : (totalKills / totalDeaths));
        // Robust time played per game
        let time = m.duration || m.playerStats?.timeSpent || (m.endTime && m.startTime ? m.endTime - m.startTime : 0) || (m.matchEndTime && m.matchStartTime ? m.matchEndTime - m.matchStartTime : 0) || 0;
        timePlayedArr.push(time / 1000 / 60); // minutes
        totalTime += time;
        totalTimeArr.push(totalTime / 1000 / 60); // minutes
    });

    // Build datasets based on selected metrics
    const datasets = [];
    if (selectedMetrics.includes('kills')) {
        datasets.push({
            label: 'Kills',
            data: killsArr.map(v => Math.round(v)),
            borderColor: '#3498db',
            backgroundColor: '#3498db',
            tension: 0.1
        });
    }
    if (selectedMetrics.includes('deaths')) {
        datasets.push({
            label: 'Deaths',
            data: deathsArr.map(v => Math.round(v)),
            borderColor: '#FFA500',
            backgroundColor: '#FFA500',
            tension: 0.1
        });
    }
    if (selectedMetrics.includes('kdr')) {
        datasets.push({
            label: 'KDR',
            data: kdrArr.map(v => Math.round(v)),
            borderColor: '#8e44ad',
            backgroundColor: '#8e44ad',
            tension: 0.1
        });
    }
    if (selectedMetrics.includes('totalKills')) {
        datasets.push({
            label: 'Total Kills',
            data: totalKillsArr.map(v => Math.round(v)),
            borderColor: '#00b894',
            backgroundColor: '#00b894',
            tension: 0.1
        });
    }
    if (selectedMetrics.includes('totalDeaths')) {
        datasets.push({
            label: 'Total Deaths',
            data: totalDeathsArr.map(v => Math.round(v)),
            borderColor: '#e67e22',
            backgroundColor: '#e67e22',
            tension: 0.1
        });
    }
    if (selectedMetrics.includes('totalKdr')) {
        datasets.push({
            label: 'Total KDR',
            data: totalKdrArr.map(v => Math.round(v)),
            borderColor: '#f39c12',
            backgroundColor: '#f39c12',
            tension: 0.1
        });
    }
    if (selectedMetrics.includes('timePlayed')) {
        datasets.push({
            label: 'Time Played (min)',
            data: timePlayedArr.map(v => Math.round(v)),
            borderColor: '#16a085',
            backgroundColor: '#16a085',
            tension: 0.1
        });
    }
    if (selectedMetrics.includes('totalTimePlayed')) {
        datasets.push({
            label: 'Total Time Played (min)',
            data: totalTimeArr.map(v => Math.round(v)),
            borderColor: '#e67e22',
            backgroundColor: '#e67e22',
            tension: 0.1
        });
    }

    // Destroy previous chart if exists
    if (window.customTrendsChartInstance) {
        window.customTrendsChartInstance.destroy();
    }
    window.customTrendsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: filteredHistory.map((_, i) => `Game ${i + 1}`),
            datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#217dbb', font: { weight: 'bold', size: 20, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' } } },
                title: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    bodyFont: { size: 18, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' },
                    titleFont: { size: 20, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#217dbb', font: { size: 18, weight: 'bold', family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' } }, grid: { color: '#e3eaf1' } },
                x: { ticks: { color: '#217dbb', font: { size: 18, weight: 'bold', family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' }, maxRotation: 30, minRotation: 30 }, grid: { color: '#e3eaf1' } }
            }
        }
    });
}

// Chart 1b: Total Kills and Deaths over Games
function renderTotalKillsDeathsChart(matchHistory) {
    const ctx = document.getElementById('totalKillsDeathsChart').getContext('2d');
    let totalKills = 0;
    let totalDeaths = 0;
    const killsCumulative = [];
    const deathsCumulative = [];
    matchHistory.forEach(m => {
        totalKills += m.kills;
        totalDeaths += m.deaths;
        killsCumulative.push(totalKills);
        deathsCumulative.push(totalDeaths);
    });
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: matchHistory.map((_, i) => `Game ${i + 1}`),
            datasets: [
                {
                    label: 'Total Kills',
                    data: killsCumulative,
                    borderColor: '#3498db',
                    backgroundColor: '#3498db',
                    tension: 0.1
                },
                {
                    label: 'Total Deaths',
                    data: deathsCumulative,
                    borderColor: '#FFA500',
                    backgroundColor: '#FFA500',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#217dbb', font: { weight: 'bold', size: 20, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' } } },
                title: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#217dbb', font: { size: 18, weight: 'bold', family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' } }, grid: { color: '#e3eaf1' } },
                x: { ticks: { color: '#217dbb', font: { size: 18, weight: 'bold', family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' }, maxRotation: 30, minRotation: 30 }, grid: { color: '#e3eaf1' } }
            }
        }
    });
}

// Chart 2: Streaks (Without Dying)
function renderStreaksWithoutDyingChart(streaks) {
    const ctx = document.getElementById('streaksWithoutDyingChart').getContext('2d');
    const labels = [
        'Smash Streak',
        'Smashtacular Streak',
        'Smashosaurus Streak',
        'Smashlvania Streak',
        'Monster Smash Streak',
        'Potato Streak',
        'Smash Smash Smash Smash Smash Smash Smash Smash Streak',
        'Potoatachio Streak'
    ];
    const dataArr = [
        streaks.smashStreak,
        streaks.smashtacularStreak,
        streaks.smashosaurusStreak,
        streaks.smashlvaniaStreak,
        streaks.monsterSmashStreak,
        streaks.potatoStreak,
        streaks.smashSmashStreak,
        streaks.potoatachioStreak
    ];
    const barColors = ['#3498db', '#FFA500', '#3498db', '#FFA500', '#3498db', '#FFA500', '#3498db', '#FFA500'];
    const borderColors = ['#217dbb', '#FFA500', '#217dbb', '#FFA500', '#217dbb', '#FFA500', '#217dbb', '#FFA500'];
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Achieved',
                data: dataArr,
                backgroundColor: barColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    bodyFont: { size: 18, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' },
                    titleFont: { size: 20, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#217dbb', font: { size: 18, weight: 'bold', family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' } }, grid: { color: '#e3eaf1' } },
                x: { ticks: { color: '#217dbb', font: { size: 18, weight: 'bold', family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' }, maxRotation: 30, minRotation: 30 }, grid: { color: '#e3eaf1' } }
            }
        }
    });
}

// Chart 3: Streaks (Quick Kills)
function renderStreaksQuickKillsChart(quickStreaks) {
    const ctx = document.getElementById('streaksQuickKillsChart').getContext('2d');
    const labels = [
        'Double Smash',
        'Multi Smash',
        'Multi Mega Smash',
        'Multi Mega Ultra Smash',
        'Goosey Smash',
        'Crazy Multi Mega Ultra Smash'
    ];
    const dataArr = [
        quickStreaks.doubleSmash,
        quickStreaks.multiSmash,
        quickStreaks.multiMegaSmash,
        quickStreaks.multiMegaUltraSmash,
        quickStreaks.gooseySmash,
        quickStreaks.crazyMultiMegaUltraSmash
    ];
    const barColors = ['#3498db', '#FFA500', '#3498db', '#FFA500', '#3498db', '#FFA500'];
    const borderColors = ['#217dbb', '#FFA500', '#217dbb', '#FFA500', '#217dbb', '#FFA500'];
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Achieved',
                data: dataArr,
                backgroundColor: barColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    bodyFont: { size: 18, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' },
                    titleFont: { size: 20, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#217dbb', font: { size: 18, weight: 'bold', family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' } }, grid: { color: '#e3eaf1' } },
                x: { ticks: { color: '#217dbb', font: { size: 18, weight: 'bold', family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' }, maxRotation: 30, minRotation: 30 }, grid: { color: '#e3eaf1' } }
            }
        }
    });
}

// Chart 4: Games Joined vs Started
function renderGamesJoinedStartedChart(gamesJoined, gamesStarted) {
    const ctx = document.getElementById('gamesJoinedStartedChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Joined', 'Started'],
            datasets: [{
                data: [gamesJoined, gamesStarted],
                backgroundColor: ['#3498db', '#FFA500'],
                borderColor: ['#217dbb', '#FFA500'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, position: 'top', labels: { color: '#217dbb', font: { weight: 'bold', size: 20, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' } } },
                title: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    bodyFont: { size: 18, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' },
                    titleFont: { size: 20, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' }
                }
            }
        }
    });
}

// Chart 5: Games Completed vs Quit
function renderGamesCompletedQuitChart(matchesCompleted, gamesQuit) {
    const ctx = document.getElementById('gamesCompletedQuitChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Completed', 'Quit'],
            datasets: [{
                data: [matchesCompleted, gamesQuit],
                backgroundColor: ['#3498db', '#e74c3c']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#217dbb', font: { weight: 'bold', size: 20, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' } } },
                title: { display: false }
            }
        }
    });
}

// Function to render game mode distribution pie chart
function renderGameModeDistributionChart(data) {
    const ctx = document.getElementById('gameModeDistributionChart').getContext('2d');
    const modes = ['normal', 'special', 'custom'];
    const modeData = modes.map(mode => data[`matchesCompleted_${data.currentSkid}_${mode}`] || 0);
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Normal Mode', 'Special Mode', 'Custom Mode'],
            datasets: [{
                data: modeData,
                backgroundColor: ['#3498db', '#2ecc71', '#e74c3c']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#217dbb', font: { weight: 'bold', size: 20, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' } } },
                title: { display: false }
            }
        }
    });
}

// Function to render map distribution pie chart
function renderMapDistributionChart(matchHistory) {
    const ctx = document.getElementById('mapDistributionChart').getContext('2d');
    
    // Count occurrences of each map
    const mapCounts = {};
    matchHistory.forEach(match => {
        if (match.map) {
            mapCounts[match.map] = (mapCounts[match.map] || 0) + 1;
        }
    });

    // Sort maps by count (descending) and take top 10
    const sortedMaps = Object.entries(mapCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

    // If no maps found, show a message
    if (sortedMaps.length === 0) {
        if (window.mapDistributionChartInstance) {
            window.mapDistributionChartInstance.destroy();
        }
        return;
    }

    // Generate colors for the pie chart
    const colors = [
        '#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6',
        '#1abc9c', '#e67e22', '#34495e', '#16a085', '#d35400'
    ];

    // Destroy previous chart if exists
    if (window.mapDistributionChartInstance) {
        window.mapDistributionChartInstance.destroy();
    }

    window.mapDistributionChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: sortedMaps.map(([map]) => map),
            datasets: [{
                data: sortedMaps.map(([,count]) => count),
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.8', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { 
                    labels: { 
                        color: '#217dbb', 
                        font: { 
                            weight: 'bold', 
                            size: 16, 
                            family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' 
                        } 
                    },
                    position: 'right'
                },
                title: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} games (${percentage}%)`;
                        }
                    },
                    bodyFont: { 
                        size: 16, 
                        family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' 
                    },
                    titleFont: { 
                        size: 18, 
                        family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' 
                    }
                }
            }
        }
    });
}

// Chart 6: Games Played Per Day
function renderGamesPlayedPerDayChart(matchHistory) {
    // Group matches by day
    const dayCounts = {};
    matchHistory.forEach(m => {
        const ts = m.matchStartTime || m.startTime;
        if (!ts) return;
        const date = new Date(ts);
        // Format as YYYY-MM-DD
        const dayStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
        dayCounts[dayStr] = (dayCounts[dayStr] || 0) + 1;
    });
    // Sort days
    const days = Object.keys(dayCounts).sort();
    const counts = days.map(day => dayCounts[day]);
    const ctx = document.getElementById('gamesPlayedPerDayChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [{
                label: 'Games Played',
                data: counts,
                backgroundColor: '#3498db',
                borderColor: '#217dbb',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    bodyFont: { size: 18, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' },
                    titleFont: { size: 20, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#217dbb', font: { size: 18, weight: 'bold', family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' } }, grid: { color: '#e3eaf1' } },
                x: { ticks: { color: '#217dbb', font: { size: 18, weight: 'bold', family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' }, maxRotation: 30, minRotation: 30 }, grid: { color: '#e3eaf1' } }
            }
        }
    });
}

// Helper: Aggregate match history by period (day, month, year)
function aggregateByPeriod(matchHistory, groupBy) {
    const groups = {};
    let totalKills = 0, totalDeaths = 0, totalTime = 0, totalGames = 0;
    matchHistory.forEach(m => {
        const ts = m.matchStartTime || m.startTime;
        if (!ts) return;
        const date = new Date(ts);
        let key;
        if (groupBy === 'year') {
            key = date.getFullYear().toString();
        } else if (groupBy === 'month') {
            key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
        } else {
            key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
        }
        if (!groups[key]) {
            groups[key] = {
                kills: 0,
                deaths: 0,
                kdr: 0,
                totalKills: 0,
                totalDeaths: 0,
                totalKdr: 0,
                timePlayed: 0,
                totalTimePlayed: 0,
                games: 0,
                totalGames: 0,
                count: 0
            };
        }
        groups[key].kills += m.kills;
        groups[key].deaths += m.deaths;
        groups[key].count++;
        groups[key].games++;
        totalKills += m.kills;
        totalDeaths += m.deaths;
        totalGames++;
        groups[key].totalKills = totalKills;
        groups[key].totalDeaths = totalDeaths;
        groups[key].totalKdr = totalDeaths === 0 ? (totalKills > 0 ? totalKills : 0) : (totalKills / totalDeaths);
        groups[key].kdr = groups[key].deaths === 0 ? (groups[key].kills > 0 ? groups[key].kills : 0) : (groups[key].kills / groups[key].deaths);
        groups[key].totalGames = totalGames;
        // Robust time played per game
        let time = m.duration || m.playerStats?.timeSpent || (m.endTime && m.startTime ? m.endTime - m.startTime : 0) || (m.matchEndTime && m.matchStartTime ? m.matchEndTime - m.matchStartTime : 0) || 0;
        groups[key].timePlayed += time / 1000 / 60; // minutes
        totalTime += time;
        groups[key].totalTimePlayed = totalTime / 1000 / 60; // minutes
    });
    // For timePlayed, total per group
    Object.values(groups).forEach(g => {
        g.timePlayed = g.timePlayed; // Keep as total, don't divide by count
    });
    return groups;
}

// Customizable Per-Day/Month/Year Trends Chart
function renderCustomTrendsPerDayChart(matchHistory, selectedMetrics, groupBy, selectedMap = 'all') {
    const ctx = document.getElementById('customTrendsPerDayChart').getContext('2d');
    
    // Filter match history by selected map
    const filteredHistory = selectedMap === 'all' 
        ? matchHistory 
        : matchHistory.filter(m => m.map === selectedMap);

    if (filteredHistory.length === 0) {
        if (window.customTrendsPerDayChartInstance) {
            window.customTrendsPerDayChartInstance.destroy();
        }
        return;
    }

    const groups = aggregateByPeriod(filteredHistory, groupBy);
    const keys = Object.keys(groups).sort();
    const metricsMap = {
        kills: { label: 'Kills', color: '#3498db' },
        deaths: { label: 'Deaths', color: '#FFA500' },
        kdr: { label: 'KDR', color: '#8e44ad' },
        totalKills: { label: 'Total Kills', color: '#00b894' },
        totalDeaths: { label: 'Total Deaths', color: '#e67e22' },
        totalKdr: { label: 'Total KDR', color: '#f39c12' },
        timePlayed: { label: 'Time Played (min)', color: '#16a085' },
        totalTimePlayed: { label: 'Total Time Played (min)', color: '#e67e22' },
        games: { label: 'Games', color: '#0984e3' },
        totalGames: { label: 'Total Games', color: '#6c5ce7' }
    };
    const datasets = [];
    selectedMetrics.forEach(metric => {
        datasets.push({
            label: metricsMap[metric].label,
            data: keys.map(k => Math.round(groups[k][metric])),
            borderColor: metricsMap[metric].color,
            backgroundColor: metricsMap[metric].color,
            tension: 0.1
        });
    });
    if (window.customTrendsPerDayChartInstance) {
        window.customTrendsPerDayChartInstance.destroy();
    }
    window.customTrendsPerDayChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: keys,
            datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#217dbb', font: { weight: 'bold', size: 20, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' } } },
                title: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    bodyFont: { size: 18, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' },
                    titleFont: { size: 20, family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#217dbb', font: { size: 18, weight: 'bold', family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' } }, grid: { color: '#e3eaf1' } },
                x: { ticks: { color: '#217dbb', font: { size: 18, weight: 'bold', family: 'Bungee, Luckiest Guy, Quicksand, Segoe UI, Arial, sans-serif' }, maxRotation: 30, minRotation: 30 }, grid: { color: '#e3eaf1' } }
            }
        }
    });
}

// Main: Render all charts
async function initializeCharts() {
    const stats = await getStats();
    // Display SKID
    if (stats && stats.currentSkid) {
        const skidDisplay = document.getElementById('skidDisplay');
        if (skidDisplay) skidDisplay.textContent = `SKID: ${stats.currentSkid}`;
    }
    if (!stats.matchHistory.length) {
        document.querySelector('.container').innerHTML += '<p style="text-align: center; color: #888;">No stats data available. Play some matches first!</p>';
        return;
    }

    // Get unique maps and populate map filters
    const uniqueMaps = [...new Set(stats.matchHistory.map(m => m.map).filter(Boolean))].sort();
    const mapFilter = document.getElementById('trendMapFilter');
    const perDayMapFilter = document.getElementById('trendPerDayMapFilter');
    
    uniqueMaps.forEach(map => {
        mapFilter.add(new Option(map, map));
        perDayMapFilter.add(new Option(map, map));
    });

    const { streaks, quickStreaks } = calculateStreaks(stats.matchHistory);
    
    // Stats Per Game
    const defaultMetrics = ['kills', 'deaths', 'kdr'];
    renderCustomTrendsChart(stats.matchHistory, defaultMetrics);
    
    // Checkbox logic for per game
    const checkboxes = document.querySelectorAll('#trendCheckboxes input[type=checkbox]');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const selected = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
            const selectedMap = document.getElementById('trendMapFilter').value;
            renderCustomTrendsChart(stats.matchHistory, selected, selectedMap);
        });
    });

    // Map filter logic for per game
    mapFilter.addEventListener('change', () => {
        const selected = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
        const selectedMap = mapFilter.value;
        renderCustomTrendsChart(stats.matchHistory, selected, selectedMap);
    });

    // Stats Per Day
    const perDayCheckboxes = document.querySelectorAll('#trendPerDayCheckboxes input[type=checkbox]');
    const groupBySelect = document.getElementById('trendPerDayGroupBy');
    
    function renderPerDayChartFromUI() {
        const selected = Array.from(perDayCheckboxes).filter(c => c.checked).map(c => c.value);
        const groupBy = groupBySelect.value;
        const selectedMap = perDayMapFilter.value;
        renderCustomTrendsPerDayChart(stats.matchHistory, selected, groupBy, selectedMap);
    }
    
    perDayCheckboxes.forEach(cb => {
        cb.addEventListener('change', renderPerDayChartFromUI);
    });
    
    groupBySelect.addEventListener('change', renderPerDayChartFromUI);
    perDayMapFilter.addEventListener('change', renderPerDayChartFromUI);
    
    // Initial render for per day
    renderPerDayChartFromUI();
    
    // Render other charts (unchanged)
    renderStreaksWithoutDyingChart(streaks);
    renderStreaksQuickKillsChart(quickStreaks);
    renderGamesJoinedStartedChart(stats.gamesJoined, stats.gamesStarted);
    renderGamesCompletedQuitChart(stats.matchesCompleted, stats.gamesQuit);
    // Only render game mode distribution chart if the element exists (it's only on the All Stats page)
    if (document.getElementById('gameModeDistributionChart')) {
        renderGameModeDistributionChart(stats);
    }
    renderMapDistributionChart(stats.matchHistory);
    renderGamesPlayedPerDayChart(stats.matchHistory);
}
document.addEventListener('DOMContentLoaded', initializeCharts); 