document.addEventListener('DOMContentLoaded', () => {
    console.log('[SKMT][PLAYER_CARD] DOM Content Loaded');
    const playerAvatarContainer = document.querySelector('.player-avatar-container');
    const teamLogoContainer = document.querySelector('.team-logo-container');
    const playerFlagImg = document.querySelector('#player-flag img');
    const playerNameElement = document.getElementById('player-name-text');
    const editNameIcon = document.getElementById('edit-name-icon');
    const teamNameElement = document.getElementById('team-name-text');
    const editTeamIcon = document.getElementById('edit-team-icon');

    const pfpUploadInput = document.getElementById('pfp-upload');
    const teamAvatarUploadInput = document.getElementById('team-avatar-upload');
    const flagSelect = document.getElementById('flag-select');

    // Declare customNameLoaded here to make it accessible to both functions
    let customNameLoaded = false;

    // Add all countries to the select element
    const countries = [
        { code: 'AF', name: 'Afghanistan' },
        { code: 'AL', name: 'Albania' },
        { code: 'DZ', name: 'Algeria' },
        { code: 'AD', name: 'Andorra' },
        { code: 'AO', name: 'Angola' },
        { code: 'AG', name: 'Antigua and Barbuda' },
        { code: 'AR', name: 'Argentina' },
        { code: 'AM', name: 'Armenia' },
        { code: 'AU', name: 'Australia' },
        { code: 'AT', name: 'Austria' },
        { code: 'AZ', name: 'Azerbaijan' },
        { code: 'BS', name: 'Bahamas' },
        { code: 'BH', name: 'Bahrain' },
        { code: 'BD', name: 'Bangladesh' },
        { code: 'BB', name: 'Barbados' },
        { code: 'BY', name: 'Belarus' },
        { code: 'BE', name: 'Belgium' },
        { code: 'BZ', name: 'Belize' },
        { code: 'BJ', name: 'Benin' },
        { code: 'BT', name: 'Bhutan' },
        { code: 'BO', name: 'Bolivia' },
        { code: 'BA', name: 'Bosnia and Herzegovina' },
        { code: 'BW', name: 'Botswana' },
        { code: 'BR', name: 'Brazil' },
        { code: 'BN', name: 'Brunei' },
        { code: 'BG', name: 'Bulgaria' },
        { code: 'BF', name: 'Burkina Faso' },
        { code: 'BI', name: 'Burundi' },
        { code: 'KH', name: 'Cambodia' },
        { code: 'CM', name: 'Cameroon' },
        { code: 'CA', name: 'Canada' },
        { code: 'CV', name: 'Cape Verde' },
        { code: 'CF', name: 'Central African Republic' },
        { code: 'TD', name: 'Chad' },
        { code: 'CL', name: 'Chile' },
        { code: 'CN', name: 'China' },
        { code: 'CO', name: 'Colombia' },
        { code: 'KM', name: 'Comoros' },
        { code: 'CG', name: 'Congo' },
        { code: 'CR', name: 'Costa Rica' },
        { code: 'HR', name: 'Croatia' },
        { code: 'CU', name: 'Cuba' },
        { code: 'CY', name: 'Cyprus' },
        { code: 'CZ', name: 'Czech Republic' },
        { code: 'DK', name: 'Denmark' },
        { code: 'DJ', name: 'Djibouti' },
        { code: 'DM', name: 'Dominica' },
        { code: 'DO', name: 'Dominican Republic' },
        { code: 'EC', name: 'Ecuador' },
        { code: 'EG', name: 'Egypt' },
        { code: 'SV', name: 'El Salvador' },
        { code: 'GQ', name: 'Equatorial Guinea' },
        { code: 'ER', name: 'Eritrea' },
        { code: 'EE', name: 'Estonia' },
        { code: 'ET', name: 'Ethiopia' },
        { code: 'FJ', name: 'Fiji' },
        { code: 'FI', name: 'Finland' },
        { code: 'FR', name: 'France' },
        { code: 'GA', name: 'Gabon' },
        { code: 'GM', name: 'Gambia' },
        { code: 'GE', name: 'Georgia' },
        { code: 'DE', name: 'Germany' },
        { code: 'GH', name: 'Ghana' },
        { code: 'GR', name: 'Greece' },
        { code: 'GD', name: 'Grenada' },
        { code: 'GT', name: 'Guatemala' },
        { code: 'GN', name: 'Guinea' },
        { code: 'GW', name: 'Guinea-Bissau' },
        { code: 'GY', name: 'Guyana' },
        { code: 'HT', name: 'Haiti' },
        { code: 'HN', name: 'Honduras' },
        { code: 'HU', name: 'Hungary' },
        { code: 'IS', name: 'Iceland' },
        { code: 'IN', name: 'India' },
        { code: 'ID', name: 'Indonesia' },
        { code: 'IR', name: 'Iran' },
        { code: 'IQ', name: 'Iraq' },
        { code: 'IE', name: 'Ireland' },
        { code: 'IL', name: 'Israel' },
        { code: 'IT', name: 'Italy' },
        { code: 'JM', name: 'Jamaica' },
        { code: 'JP', name: 'Japan' },
        { code: 'JO', name: 'Jordan' },
        { code: 'KZ', name: 'Kazakhstan' },
        { code: 'KE', name: 'Kenya' },
        { code: 'KI', name: 'Kiribati' },
        { code: 'KP', name: 'North Korea' },
        { code: 'KR', name: 'South Korea' },
        { code: 'KW', name: 'Kuwait' },
        { code: 'KG', name: 'Kyrgyzstan' },
        { code: 'LA', name: 'Laos' },
        { code: 'LV', name: 'Latvia' },
        { code: 'LB', name: 'Lebanon' },
        { code: 'LS', name: 'Lesotho' },
        { code: 'LR', name: 'Liberia' },
        { code: 'LY', name: 'Libya' },
        { code: 'LI', name: 'Liechtenstein' },
        { code: 'LT', name: 'Lithuania' },
        { code: 'LU', name: 'Luxembourg' },
        { code: 'MG', name: 'Madagascar' },
        { code: 'MW', name: 'Malawi' },
        { code: 'MY', name: 'Malaysia' },
        { code: 'MV', name: 'Maldives' },
        { code: 'ML', name: 'Mali' },
        { code: 'MT', name: 'Malta' },
        { code: 'MH', name: 'Marshall Islands' },
        { code: 'MR', name: 'Mauritania' },
        { code: 'MU', name: 'Mauritius' },
        { code: 'MX', name: 'Mexico' },
        { code: 'FM', name: 'Micronesia' },
        { code: 'MD', name: 'Moldova' },
        { code: 'MC', name: 'Monaco' },
        { code: 'MN', name: 'Mongolia' },
        { code: 'ME', name: 'Montenegro' },
        { code: 'MA', name: 'Morocco' },
        { code: 'MZ', name: 'Mozambique' },
        { code: 'MM', name: 'Myanmar' },
        { code: 'NA', name: 'Namibia' },
        { code: 'NR', name: 'Nauru' },
        { code: 'NP', name: 'Nepal' },
        { code: 'NL', name: 'Netherlands' },
        { code: 'NZ', name: 'New Zealand' },
        { code: 'NI', name: 'Nicaragua' },
        { code: 'NE', name: 'Niger' },
        { code: 'NG', name: 'Nigeria' },
        { code: 'NO', name: 'Norway' },
        { code: 'OM', name: 'Oman' },
        { code: 'PK', name: 'Pakistan' },
        { code: 'PW', name: 'Palau' },
        { code: 'PS', name: 'Palestine' },
        { code: 'PA', name: 'Panama' },
        { code: 'PG', name: 'Papua New Guinea' },
        { code: 'PY', name: 'Paraguay' },
        { code: 'PE', name: 'Peru' },
        { code: 'PH', name: 'Philippines' },
        { code: 'PL', name: 'Poland' },
        { code: 'PT', name: 'Portugal' },
        { code: 'QA', name: 'Qatar' },
        { code: 'RO', name: 'Romania' },
        { code: 'RU', name: 'Russia' },
        { code: 'RW', name: 'Rwanda' },
        { code: 'KN', name: 'Saint Kitts and Nevis' },
        { code: 'LC', name: 'Saint Lucia' },
        { code: 'VC', name: 'Saint Vincent and the Grenadines' },
        { code: 'WS', name: 'Samoa' },
        { code: 'SM', name: 'San Marino' },
        { code: 'ST', name: 'Sao Tome and Principe' },
        { code: 'SA', name: 'Saudi Arabia' },
        { code: 'SN', name: 'Senegal' },
        { code: 'RS', name: 'Serbia' },
        { code: 'SC', name: 'Seychelles' },
        { code: 'SL', name: 'Sierra Leone' },
        { code: 'SG', name: 'Singapore' },
        { code: 'SK', name: 'Slovakia' },
        { code: 'SI', name: 'Slovenia' },
        { code: 'SB', name: 'Solomon Islands' },
        { code: 'SO', name: 'Somalia' },
        { code: 'ZA', name: 'South Africa' },
        { code: 'SS', name: 'South Sudan' },
        { code: 'ES', name: 'Spain' },
        { code: 'LK', name: 'Sri Lanka' },
        { code: 'SD', name: 'Sudan' },
        { code: 'SR', name: 'Suriname' },
        { code: 'SZ', name: 'Eswatini' },
        { code: 'SE', name: 'Sweden' },
        { code: 'CH', name: 'Switzerland' },
        { code: 'SY', name: 'Syria' },
        { code: 'TW', name: 'Taiwan' },
        { code: 'TJ', name: 'Tajikistan' },
        { code: 'TZ', name: 'Tanzania' },
        { code: 'TH', name: 'Thailand' },
        { code: 'TL', name: 'Timor-Leste' },
        { code: 'TG', name: 'Togo' },
        { code: 'TO', name: 'Tonga' },
        { code: 'TT', name: 'Trinidad and Tobago' },
        { code: 'TN', name: 'Tunisia' },
        { code: 'TR', name: 'Turkey' },
        { code: 'TM', name: 'Turkmenistan' },
        { code: 'TV', name: 'Tuvalu' },
        { code: 'UG', name: 'Uganda' },
        { code: 'UA', name: 'Ukraine' },
        { code: 'AE', name: 'United Arab Emirates' },
        { code: 'GB', name: 'United Kingdom' },
        { code: 'US', name: 'United States' },
        { code: 'UY', name: 'Uruguay' },
        { code: 'UZ', name: 'Uzbekistan' },
        { code: 'VU', name: 'Vanuatu' },
        { code: 'VA', name: 'Vatican City' },
        { code: 'VE', name: 'Venezuela' },
        { code: 'VN', name: 'Vietnam' },
        { code: 'YE', name: 'Yemen' },
        { code: 'ZM', name: 'Zambia' },
        { code: 'ZW', name: 'Zimbabwe' }
    ];

    // Sort countries by name
    countries.sort((a, b) => a.name.localeCompare(b.name));

    // Clear existing options
    flagSelect.innerHTML = '<option value="">Select a country</option>';

    // Add countries to select
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = country.name;
        flagSelect.appendChild(option);
    });

    // Function to handle image file reading and updating
    const handleImageUpload = (inputElement, imgContainer, storageKey) => {
        inputElement.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    console.log(`FileReader loaded for ${inputElement.id}, creating and setting img src.`);
                    const imageDataUrl = e.target.result;

                    // Remove existing image if any
                    imgContainer.innerHTML = '';
                    // Create new image element
                    const newImg = document.createElement('img');
                    newImg.src = imageDataUrl;
                    newImg.alt = inputElement.id.replace('-upload', '') + ' image';
                    // Apply necessary styles for the image inside the circle
                    newImg.style.width = '100%';
                    newImg.style.height = '100%';
                    newImg.style.objectFit = 'cover';
                    newImg.style.borderRadius = '50%'; // Ensure image is also round inside the container

                    // Append the new image to the container
                    imgContainer.appendChild(newImg);

                    console.log(`Created and appended img for ${inputElement.id}. Saving to local storage.`);

                    // Save image data to chrome.storage.local
                    chrome.storage.local.set({ [storageKey]: imageDataUrl }, () => {
                        if (chrome.runtime.lastError) {
                            console.error(`Error saving ${storageKey} to local storage:`, chrome.runtime.lastError);
                        } else {
                            console.log(`${storageKey} saved to local storage. Data size: ${imageDataUrl.length} bytes`);
                        }
                    });
                };
                reader.onerror = (error) => {
                    console.error(`FileReader error for ${inputElement.id}:`, error);
                };
                reader.readAsDataURL(file);
                console.log(`Reading file for ${inputElement.id}:`, file.name);
            } else {
                console.log(`No file selected for ${inputElement.id}.`);
            }
        });
    };

    // Handle Profile Picture Upload and save
    handleImageUpload(pfpUploadInput, playerAvatarContainer, 'playerAvatar');

    // Handle Team Avatar Upload and save
    handleImageUpload(teamAvatarUploadInput, teamLogoContainer, 'teamAvatar');

    // Handle Flag Selection and save
    flagSelect.addEventListener('change', (event) => {
        const selectedValue = event.target.value;
        const storageKey = 'playerFlag';
        if (selectedValue) {
            // Using flagcdn.com for flag images
            const flagImageUrl = `https://flagcdn.com/w80/${selectedValue.toLowerCase()}.png`;
            console.log('Selected flag:', selectedValue, 'Loading image:', flagImageUrl);
            playerFlagImg.src = flagImageUrl;
            playerFlagImg.alt = `${selectedValue} Flag`;
            playerFlagImg.title = selectedValue;
            playerFlagImg.style.display = 'block'; // Ensure image is visible

            // Save selected flag to chrome.storage.sync
            chrome.storage.sync.set({ [storageKey]: selectedValue }, () => {
                console.log(`${storageKey} saved to storage.`);
            });

        } else {
            console.log('No flag selected.');
            playerFlagImg.src = ''; // Clear the flag image
            playerFlagImg.alt = 'No flag selected';
            playerFlagImg.title = '';
            playerFlagImg.style.display = 'none'; // Hide image when no flag selected
            // Save empty value to storage if no flag is selected
            chrome.storage.sync.set({ [storageKey]: '' }, () => {
                console.log(`${storageKey} cleared in storage.`);
            });
        }
    });

    // Handle Player Name Editing and save
    editNameIcon.addEventListener('click', () => {
        console.log('[SKMT][PLAYER_CARD] Edit name icon clicked');
        const currentName = playerNameElement.textContent;
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.value = currentName;
        inputElement.style.cssText = `
            font-size: ${getComputedStyle(playerNameElement).fontSize};
            font-weight: ${getComputedStyle(playerNameElement).fontWeight};
            color: ${getComputedStyle(playerNameElement).color};
            background: none;
            border: none;
            outline: none;
            text-align: center;
            font-family: 'Baloo 2', Arial, sans-serif !important;
            width: ${playerNameElement.offsetWidth}px;
        `;

        playerNameElement.replaceWith(inputElement);
        inputElement.focus();

        const saveName = () => {
            const newName = inputElement.value || 'Player';
            console.log('[SKMT][PLAYER_CARD] Attempting to save new name:', newName);
            
            // First verify we can read/write to storage
            chrome.storage.sync.get(['playerName'], (data) => {
                console.log('[SKMT][PLAYER_CARD] Current storage state:', data);
                
                // Save new name to chrome.storage.sync
                chrome.storage.sync.set({ 'playerName': newName }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('[SKMT][PLAYER_CARD] Error saving name:', chrome.runtime.lastError);
                    } else {
                        console.log('[SKMT][PLAYER_CARD] Name saved successfully');
                        
                        // Verify the save
                        chrome.storage.sync.get(['playerName'], (verifyData) => {
                            console.log('[SKMT][PLAYER_CARD] Verification of saved name:', verifyData);
                            if (verifyData.playerName === newName) {
                                console.log('[SKMT][PLAYER_CARD] Name verified in storage');
                                customNameLoaded = true;
                            } else {
                                console.error('[SKMT][PLAYER_CARD] Name verification failed');
                            }
                        });
                    }
                });
            });

            const newNameSpan = document.createElement('span');
            newNameSpan.id = 'player-name-text';
            newNameSpan.textContent = newName;
            inputElement.replaceWith(newNameSpan);
            playerNameElement = newNameSpan;
        };

        inputElement.addEventListener('blur', saveName);
        inputElement.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                saveName();
            }
        });
    });

    // Handle Team Name Editing and save
    editTeamIcon.addEventListener('click', () => {
        console.log('[SKMT][PLAYER_CARD] Edit team icon clicked');
        const currentName = teamNameElement.textContent;
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.value = currentName;
        // Apply similar styles as the player name input, but potentially smaller
        inputElement.style.cssText = `
            font-size: ${getComputedStyle(teamNameElement).fontSize};
            font-weight: ${getComputedStyle(teamNameElement).fontWeight};
            color: ${getComputedStyle(teamNameElement).color};
            background: none;
            border: none;
            outline: none;
            text-align: center;
            font-family: 'Baloo 2', Arial, sans-serif !important;
            width: ${teamNameElement.offsetWidth}px;
        `;

        teamNameElement.replaceWith(inputElement);
        inputElement.focus();

        const saveTeamName = () => {
            const newName = inputElement.value || 'Team'; // Default to 'Team' if empty
            console.log('[SKMT][PLAYER_CARD] Attempting to save new team name:', newName);

            chrome.storage.sync.set({ 'teamName': newName }, () => {
                if (chrome.runtime.lastError) {
                    console.error('[SKMT][PLAYER_CARD] Error saving team name:', chrome.runtime.lastError);
                } else {
                    console.log('[SKMT][PLAYER_CARD] Team name saved successfully');
                }
            });

            const newNameSpan = document.createElement('span');
            newNameSpan.id = 'team-name-text';
            newNameSpan.textContent = newName;
            inputElement.replaceWith(newNameSpan);
            teamNameElement = newNameSpan; // Update the element reference
        };

        inputElement.addEventListener('blur', saveTeamName);
        inputElement.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                saveTeamName();
            }
        });
    });

    // Load saved data on page load
    const loadSavedData = () => {
        console.log('[SKMT][PLAYER_CARD] Starting loadSavedData');
        return new Promise((resolve) => {
            // Load name and flag from sync, images from local
            chrome.storage.sync.get(['playerName', 'playerFlag', 'teamName'], (syncData) => {
                chrome.storage.local.get(['playerAvatar', 'teamAvatar'], (localData) => {
                    const data = { ...syncData, ...localData };
                    console.log('[SKMT][PLAYER_CARD] Storage data received:', data);
                    if (chrome.runtime.lastError) {
                        console.error('Error loading saved data:', chrome.runtime.lastError);
                        resolve();
                        return;
                    }

                    // Load Player Name
                    if (data.playerName) {
                        console.log('[SKMT][PLAYER_CARD] Setting saved name:', data.playerName);
                        playerNameElement.textContent = data.playerName;
                        customNameLoaded = true;
                    } else {
                        console.log('[SKMT][PLAYER_CARD] No saved name found, using default');
                        playerNameElement.textContent = 'Player';
                        customNameLoaded = false;
                    }

                    // Load Team Name
                    if (data.teamName) {
                        console.log('[SKMT][PLAYER_CARD] Setting saved team name:', data.teamName);
                        teamNameElement.textContent = data.teamName;
                    } else {
                        console.log('[SKMT][PLAYER_CARD] No saved team name found, using default');
                        teamNameElement.textContent = 'Team Alpha'; // Set default if none saved
                    }

                    // Load Player Avatar
                    if (data.playerAvatar) {
                        console.log('Loading saved player avatar.');
                        playerAvatarContainer.innerHTML = ''; // Clear placeholder
                        const savedAvatarImg = document.createElement('img');
                        savedAvatarImg.src = data.playerAvatar;
                        savedAvatarImg.alt = 'Saved Player Avatar';
                        savedAvatarImg.style.width = '100%';
                        savedAvatarImg.style.height = '100%';
                        savedAvatarImg.style.objectFit = 'cover';
                        savedAvatarImg.style.borderRadius = '50%';
                        playerAvatarContainer.appendChild(savedAvatarImg);
                        console.log(`Player avatar loaded. Data size: ${data.playerAvatar.length} bytes`);
                    }

                    // Load Team Avatar
                    if (data.teamAvatar) {
                        console.log('Loading saved team avatar.');
                        teamLogoContainer.innerHTML = ''; // Clear placeholder
                        const savedTeamImg = document.createElement('img');
                        savedTeamImg.src = data.teamAvatar;
                        savedTeamImg.alt = 'Saved Team Avatar';
                        savedTeamImg.style.width = '100%';
                        savedTeamImg.style.height = '100%';
                        savedTeamImg.objectFit = 'cover';
                        savedTeamImg.style.borderRadius = '50%';
                        teamLogoContainer.appendChild(savedTeamImg);
                        console.log('Team avatar loaded.');
                    }

                    // Load Player Flag
                    if (data.playerFlag) {
                        console.log(`Loading saved player flag: ${data.playerFlag}`);
                        const flagImageUrl = `https://flagcdn.com/w80/${data.playerFlag.toLowerCase()}.png`;
                        playerFlagImg.src = flagImageUrl;
                        playerFlagImg.alt = `${data.playerFlag} Flag`;
                        playerFlagImg.title = data.playerFlag;
                        playerFlagImg.style.display = 'block'; // Ensure image is visible
                        flagSelect.value = data.playerFlag; // Set dropdown value
                        console.log('Player flag loaded.');
                    } else {
                        console.log('No saved player flag.');
                        flagSelect.value = ''; // Set dropdown to default
                        playerFlagImg.style.display = 'none'; // Hide image when no flag selected
                    }

                    resolve();
                });
            });
        });
    };

    // --- Stat Calculation and Display Logic --- //

    // Get player stats from storage
    async function getPlayerStats() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['currentSkid'], (skidData) => {
                const currentSkid = skidData.currentSkid || 'Default';
                const keysToFetch = [
                    `matchHistory_${currentSkid}_normal`,
                    `matchHistory_${currentSkid}_special`,
                    `matchHistory_${currentSkid}_custom`,
                    `gamesJoined_${currentSkid}_normal`,
                    `gamesJoined_${currentSkid}_special`,
                    `gamesJoined_${currentSkid}_custom`,
                    `gamesStarted_${currentSkid}_normal`,
                    `gamesStarted_${currentSkid}_special`,
                    `gamesStarted_${currentSkid}_custom`,
                    `gamesQuit_${currentSkid}_normal`,
                    `gamesQuit_${currentSkid}_special`,
                    `gamesQuit_${currentSkid}_custom`,
                    `matchesCompleted_${currentSkid}_normal`,
                    `matchesCompleted_${currentSkid}_special`,
                    `matchesCompleted_${currentSkid}_custom`
                ];

                chrome.storage.local.get(keysToFetch, (data) => {
                    let matchHistory = [];
                    let gamesJoined = 0;
                    let gamesStarted = 0;
                    let gamesQuit = 0;
                    let matchesCompleted = 0;
                    let totalKills = 0;
                    let totalDeaths = 0;
                    let totalTimePlayed = 0;

                    // Combine data from all modes
                    ['normal', 'special', 'custom'].forEach(mode => {
                        const modeHistory = data[`matchHistory_${currentSkid}_${mode}`] || [];
                        matchHistory = matchHistory.concat(modeHistory);
                        gamesJoined += data[`gamesJoined_${currentSkid}_${mode}`] || 0;
                        gamesStarted += data[`gamesStarted_${currentSkid}_${mode}`] || 0;
                        gamesQuit += data[`gamesQuit_${currentSkid}_${mode}`] || 0;
                        matchesCompleted += data[`matchesCompleted_${currentSkid}_${mode}`] || 0;

                        // Calculate kills, deaths, and time played from match history
                        modeHistory.forEach(match => {
                            totalKills += match.kills || 0;
                            totalDeaths += match.deaths || 0;
                            const matchDuration = match.duration || 
                                (match.endTime && match.startTime ? match.endTime - match.startTime : 0) || 
                                (match.matchEndTime && match.matchStartTime ? match.matchEndTime - match.matchStartTime : 0) || 0;
                            totalTimePlayed += matchDuration;
                        });
                    });

                    // Sort match history by start time
                    matchHistory.sort((a, b) => {
                        const timeA = a.matchStartTime || a.startTime || 0;
                        const timeB = b.matchStartTime || b.startTime || 0;
                        return timeA - timeB;
                    });

                    // Convert totalTimePlayed from milliseconds to minutes
                    totalTimePlayed = totalTimePlayed / 1000 / 60;

                    resolve({
                        matchHistory,
                        gamesJoined,
                        gamesStarted,
                        gamesQuit,
                        matchesCompleted,
                        currentSkid,
                        totalKills,
                        totalDeaths,
                        totalTimePlayed
                    });
                });
            });
        });
    }

    // Function to calculate Attack Rating (ATK)
    function calculateATK(stats) {
        if (!stats || stats.matchHistory.length === 0 || stats.totalTimePlayed === 0) return 0;

        // Calculate average kills per minute
        const totalTimeInMinutes = stats.totalTimePlayed;
        const totalKills = stats.totalKills;
        const avgKillsPerMinute = totalTimeInMinutes > 0 ? totalKills / totalTimeInMinutes : 0;

        // Scale to kills per 3 minutes and calculate percentage
        const avgKillsPer3Minutes = avgKillsPerMinute * 3;
        const atk = Math.round((avgKillsPer3Minutes / 18) * 100); // 18 kills per 3 minutes is 100

        return Math.min(100, Math.max(0, atk));
    }

    // Function to calculate Defensive Rating (DEF)
    function calculateDEF(stats) {
        if (!stats || stats.matchHistory.length === 0 || stats.totalTimePlayed === 0) return 100; // 0 deaths per 3 min = 100 DEF

        // Calculate average deaths per minute
        const totalTimeInMinutes = stats.totalTimePlayed;
        const totalDeaths = stats.totalDeaths;
        const avgDeathsPerMinute = totalTimeInMinutes > 0 ? totalDeaths / totalTimeInMinutes : 0;

        // Scale to deaths per 3 minutes (0 deaths / 3 minutes = 100)
        const avgDeathsPer3Minutes = avgDeathsPerMinute * 3;

        // 9 deaths per 3 minutes is 0 DEF
        const scaledDeaths = Math.max(0, 100 - (avgDeathsPer3Minutes / 9) * 100); // 9 deaths per 3 minutes is 0

        return Math.round(Math.min(100, Math.max(0, scaledDeaths)));
    }

    // Function to calculate Consistency Rating (CNS)
    function calculateCNS(stats) {
        if (!stats || (stats.matchesCompleted + stats.gamesQuit) === 0) return 0; // Use matchesCompleted + gamesQuit for total played attempts

        const completionRate = stats.matchesCompleted / (stats.matchesCompleted + stats.gamesQuit); // Completed / Total attempts

        // Simple linear scaling for completion rate
        const cns = completionRate * 100;
        return Math.round(Math.min(100, Math.max(0, cns)));
    }

    // Function to calculate Experience Rating (EXP)
    function calculateEXP(stats) {
        if (!stats || stats.totalTimePlayed < 0) return 0; // Ensure playtime is non-negative

        // Logarithmic scaling for total time played
        const timeInMinutes = stats.totalTimePlayed;

        // Adjusted constants for more gradual progression
        // Aiming for:
        // ~5 at 0 min
        // ~30 at 100 min
        // ~60 at 1000 min
        // ~90 at 10000 min
        const A = 15; // Reduced from 20 to make the curve less steep
        const B = 5;  // Keep base rating at 5
        const C = 5;  // Reduced from 10 to make early progression slower

        const exp = A * Math.log10(timeInMinutes + C) + B;

        return Math.round(Math.min(100, Math.max(0, exp)));
    }

    // Function to calculate Performance Rating (PRF)
    function calculatePRF(stats) {
        if (!stats || stats.matchHistory.length === 0) return 0;

        const avgKdr = stats.totalDeaths === 0 ? stats.totalKills : (stats.totalKills / stats.totalDeaths);
        
        // Simple linear scaling where KDR of 3.50 = 100 rating
        const prf = Math.min(100, (avgKdr / 3.50) * 100);
        return Math.round(Math.min(100, Math.max(0, prf)));
    }

    // Function to calculate Overall Rating (OVR)
    function calculateOVR(atk, def, cns, exp, prf) {
        // Example weights for OVR (adjust based on desired importance)
        const weightATK = 0.25;
        const weightDEF = 0.25;
        const weightCNS = 0.15;
        const weightEXP = 0.10;
        const weightPRF = 0.25;

        const ovr = (atk * weightATK) + (def * weightDEF) + (cns * weightCNS) + (exp * weightEXP) + (prf * weightPRF);
        return Math.round(Math.min(100, Math.max(0, ovr)));
    }

    // Main function to fetch, calculate, and display stats
    async function updatePlayerCard() {
        console.log('[SKMT][PLAYER_CARD] Starting updatePlayerCard, customNameLoaded:', customNameLoaded);
        const stats = await getPlayerStats();
        console.log('[SKMT][PLAYER_CARD] Fetched Stats:', stats);

        // Only update stats, don't touch the name here
        if (!stats || stats.matchHistory.length === 0) {
            console.log('[SKMT][PLAYER_CARD] No stats data available to display.');
            document.getElementById('player-ovr').textContent = '--';
            document.getElementById('stat-ofs').textContent = '--';
            document.getElementById('stat-def').textContent = '--';
            document.getElementById('stat-cns').textContent = '--';
            document.getElementById('stat-exp').textContent = '--';
            document.getElementById('stat-prf').textContent = '--';
            return;
        }

        // Calculate attributes
        const atk = calculateATK(stats);
        const def = calculateDEF(stats);
        const cns = calculateCNS(stats);
        const exp = calculateEXP(stats);
        const prf = calculatePRF(stats);
        const ovr = calculateOVR(atk, def, cns, exp, prf);

        // Update HTML elements
        document.getElementById('player-ovr').textContent = ovr;
        document.getElementById('stat-ofs').textContent = atk;
        document.getElementById('stat-def').textContent = def;
        document.getElementById('stat-cns').textContent = cns;
        document.getElementById('stat-exp').textContent = exp;
        document.getElementById('stat-prf').textContent = prf;

        // Ensure ATK label is set
        const atkLabelElement = document.getElementById('label-atk');
        if (atkLabelElement) atkLabelElement.textContent = 'ATK';

        console.log('[SKMT][PLAYER_CARD] Updated card with calculated stats.');
    }

    // --- Initialization --- //

    // Load saved data first, then update card with stats
    console.log('[SKMT][PLAYER_CARD] Starting initialization');
    loadSavedData().then(() => {
        console.log('[SKMT][PLAYER_CARD] Saved data loaded, customNameLoaded:', customNameLoaded);
        updatePlayerCard();
    }).catch(error => {
        console.error('[SKMT][PLAYER_CARD] Error during loadSavedData:', error);
        updatePlayerCard();
    });

    // Modal functionality
    const modal = document.getElementById('statsInfoModal');
    const btn = document.getElementById('statsInfoButton');
    const span = document.getElementsByClassName('close-button')[0];

    // When the user clicks the button, open the modal
    btn.onclick = function() {
        modal.style.display = "block";
    }

    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Download Card as Image functionality
    const downloadBtn = document.getElementById('download-card-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            const card = document.querySelector('.smash-karts-card');
            if (!card) return;
            html2canvas(card, {backgroundColor: null, useCORS: true}).then(function(canvas) {
                const link = document.createElement('a');
                link.download = 'player-card.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        });
    }
});