// match_info.js
function formatDateTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString();
}

function formatKDR(kills, deaths) {
    if (deaths === 0) return kills > 0 ? '∞' : '0.00';
    return (kills / deaths).toFixed(2);
}

function formatDuration(ms) {
    if (!ms) return '0s';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
}

const match = JSON.parse(localStorage.getItem('kartlog_match_info') || '{}');
const content = document.getElementById('match-info-content');

if (!match || Object.keys(match).length === 0) {
    content.innerHTML = '<div>No match data found.</div>';
} else {
    let indicators = [];
    if (match.joined) indicators.push('Joined');
    if (match.started) indicators.push('Started');
    if (match.quit) indicators.push('Quit');
    else indicators.push('Completed');
    if (match.isSpecialMode) indicators.push('Special Mode');
    if (match.isCustomMode) indicators.push('Custom Match');
    if (match.mode) indicators.push(`${match.mode.charAt(0).toUpperCase() + match.mode.slice(1)} Mode`);

    const duration = match.playerStats?.timeSpent || (match.endTime && match.startTime ? match.endTime - match.startTime : 0);

    content.innerHTML = `
        <div class="match-info-section">
            <span class="match-info-label">Match #:</span>
            <span class="match-info-value">${match.matchNumber !== undefined ? match.matchNumber : ''}</span>
        </div>
        <div class="match-info-section">
            <span class="match-info-label">Start:</span>
            <span class="match-info-value">${formatDateTime(match.matchStartTime || match.startTime)}</span>
        </div>
        <div class="match-info-section">
            <span class="match-info-label">End:</span>
            <span class="match-info-value">${formatDateTime(match.matchEndTime || match.endTime)}</span>
        </div>
        <div class="match-info-section">
            <span class="match-info-label">Kills:</span>
            <span class="match-info-value">${match.kills}</span>
        </div>
        <div class="match-info-section">
            <span class="match-info-label">Deaths:</span>
            <span class="match-info-value">${match.deaths}</span>
        </div>
        <div class="match-info-section">
            <span class="match-info-label">KDR:</span>
            <span class="match-info-value">${formatKDR(match.kills, match.deaths)}</span>
        </div>
        <div class="match-info-section">
            <span class="match-info-label">Duration:</span>
            <span class="match-info-value">${formatDuration(duration)}</span>
        </div>
        <div class="match-info-indicators">
            ${indicators.join(' | ')}
        </div>
    `;
} 