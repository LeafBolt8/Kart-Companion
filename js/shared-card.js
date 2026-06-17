document.addEventListener('DOMContentLoaded', () => {
    const cardDataContainer = document.getElementById('shared-player-card');
    // Get card id from URL
    const urlParams = new URLSearchParams(window.location.search);
    const cardId = urlParams.get('id');

    if (!cardId) {
        cardDataContainer.innerHTML = '<div style="color:red;text-align:center;padding:30px;">Invalid card link. Please make sure you are using a valid Kart Companion card URL.</div>';
        return;
    }

    let cardData;
    try {
        cardData = JSON.parse(localStorage.getItem(cardId));
        if (!cardData) throw new Error('No data found');
    } catch (e) {
        cardDataContainer.innerHTML = '<div style="color:red;text-align:center;padding:30px;">Could not load card data. The link may be corrupted or expired.</div>';
        return;
    }

    // Set OVR
    document.getElementById('player-ovr').textContent = cardData.ovr || '';
    // Set flag
    const flagImg = document.querySelector('.player-flag-container img');
    if (flagImg && cardData.flag) {
        // You may want to map flag codes to URLs if you use real flags
        flagImg.src = cardData.flag.startsWith('http') ? cardData.flag : `https://placehold.co/60x40/0033a0/ffffff?text=${cardData.flag}`;
        flagImg.alt = cardData.flag + ' Flag';
        flagImg.title = cardData.flag;
    }
    // Set team logo
    const teamLogoContainer = document.querySelector('.team-logo-container');
    teamLogoContainer.innerHTML = '';
    if (cardData.teamLogo) {
        const teamLogoImg = document.createElement('img');
        teamLogoImg.src = cardData.teamLogo;
        teamLogoImg.alt = 'Team Logo';
        teamLogoContainer.appendChild(teamLogoImg);
    }
    // Set avatar
    const avatarContainer = document.querySelector('.player-avatar-container');
    avatarContainer.innerHTML = '';
    if (cardData.avatar) {
        const avatarImg = document.createElement('img');
        avatarImg.src = cardData.avatar;
        avatarImg.alt = 'Player Avatar';
        avatarImg.style.width = '100%';
        avatarImg.style.height = '100%';
        avatarImg.style.borderRadius = '50%';
        avatarContainer.appendChild(avatarImg);
    }
    // Set player name
    document.getElementById('player-name-text').textContent = cardData.playerName || '';
    // Set team name
    document.getElementById('team-name-text').textContent = cardData.teamName || '';
    // Set stats
    document.getElementById('stat-ofs').textContent = cardData.atk || '';
    document.getElementById('stat-def').textContent = cardData.def || '';
    document.getElementById('stat-cns').textContent = cardData.cns || '';
    document.getElementById('stat-exp').textContent = cardData.exp || '';
    document.getElementById('stat-prf').textContent = cardData.prf || '';
}); 