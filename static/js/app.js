// Application State
let state = {
    releases: [],
    filteredReleases: [],
    selectedRelease: null,
    searchQuery: '',
    selectedCategory: 'all',
    isLoading: false
};

// DOM Elements
const elements = {
    releasesStream: document.getElementById('releases-stream'),
    searchInput: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    categoryChips: document.getElementById('category-chips'),
    btnRefresh: document.getElementById('btn-refresh'),
    refreshIcon: document.getElementById('refresh-icon'),
    lastUpdatedText: document.getElementById('last-updated-text'),
    composerEmptyState: document.getElementById('composer-empty-state'),
    composerActiveForm: document.getElementById('composer-active-form'),
    contextBadge: document.getElementById('context-badge'),
    contextDate: document.getElementById('context-date'),
    contextText: document.getElementById('context-text'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    chkIncludeLink: document.getElementById('chk-include-link'),
    chkIncludeTags: document.getElementById('chk-include-tags'),
    btnCopyTweet: document.getElementById('btn-copy-tweet'),
    btnShareTweet: document.getElementById('btn-share-tweet'),
    charCounterNumber: document.getElementById('char-counter-number'),
    progressRingFill: document.getElementById('progress-ring-fill'),
    toast: document.getElementById('toast-notification'),
    toastMessage: document.getElementById('toast-message'),
    activeFiltersInfo: document.getElementById('active-filters-info'),
    activeFiltersText: document.getElementById('active-filters-text'),
    btnResetFilters: document.getElementById('btn-reset-filters'),
    
    // Stats elements
    statTotal: document.getElementById('stat-total'),
    statFeatures: document.getElementById('stat-features'),
    statBreaking: document.getElementById('stat-breaking'),
    statIssues: document.getElementById('stat-issues'),
    statCards: document.querySelectorAll('.stat-card')
};

// Configuration
const TWITTER_CHAR_LIMIT = 280;
const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * 10; // r=10

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupProgressRing();
    fetchReleases(false); // Fetch from cache on start
});

// Setup Progress Ring
function setupProgressRing() {
    if (elements.progressRingFill) {
        elements.progressRingFill.style.strokeDasharray = `${PROGRESS_RING_CIRCUMFERENCE} ${PROGRESS_RING_CIRCUMFERENCE}`;
        elements.progressRingFill.style.strokeDashoffset = PROGRESS_RING_CIRCUMFERENCE;
    }
}

// Event Listeners
function setupEventListeners() {
    // Refresh feed
    elements.btnRefresh.addEventListener('click', () => fetchReleases(true));
    
    // Search input
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        elements.clearSearch.style.display = state.searchQuery ? 'block' : 'none';
        applyFilters();
    });
    
    elements.clearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.clearSearch.style.display = 'none';
        applyFilters();
    });
    
    // Reset filters banner
    elements.btnResetFilters.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.clearSearch.style.display = 'none';
        
        state.selectedCategory = 'all';
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.chip[data-category="all"]').classList.add('active');
        
        applyFilters();
    });
    
    // Category chips
    elements.categoryChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        
        state.selectedCategory = chip.dataset.category;
        applyFilters();
    });
    
    // Stats Cards (act as filters)
    elements.statCards.forEach(card => {
        card.addEventListener('click', () => {
            const categoryMapping = {
                'all': 'all',
                'feature': 'Feature',
                'breaking': 'Breaking',
                'issue': 'Issue'
            };
            const cat = categoryMapping[card.dataset.category];
            if (cat) {
                state.selectedCategory = cat;
                
                // Update active chip
                document.querySelectorAll('.chip').forEach(c => {
                    if (c.dataset.category === cat) {
                        c.classList.add('active');
                    } else {
                        c.classList.remove('active');
                    }
                });
                
                applyFilters();
            }
        });
    });
    
    // Tweet composer input triggers
    elements.tweetTextarea.addEventListener('input', () => {
        updateCharCounter();
    });
    
    elements.chkIncludeLink.addEventListener('change', () => {
        if (state.selectedRelease) {
            regenerateTweetText();
        }
    });
    
    elements.chkIncludeTags.addEventListener('change', () => {
        if (state.selectedRelease) {
            regenerateTweetText();
        }
    });
    
    // Share and Copy actions
    elements.btnCopyTweet.addEventListener('click', copyTweetText);
    elements.btnShareTweet.addEventListener('click', shareTweetOnTwitter);
}

// Fetch Release Notes
async function fetchReleases(forceRefresh = false) {
    if (state.isLoading) return;
    
    setLoadingState(true);
    
    try {
        const response = await fetch(`/api/releases${forceRefresh ? '?refresh=true' : ''}`);
        const result = await response.json();
        
        if (result.status === 'success' || result.status === 'partial_success') {
            state.releases = result.releases;
            
            // Render Stats
            updateStats();
            
            // Apply current filters
            applyFilters();
            
            // Update last updated info
            const dateStr = result.last_fetched || new Date().toLocaleString();
            elements.lastUpdatedText.textContent = `Updated: ${dateStr}`;
            
            if (result.status === 'partial_success') {
                showToast('Returned cached data (live fetch failed)');
            } else if (forceRefresh) {
                showToast('Release notes successfully refreshed!');
            }
        } else {
            showToast('Error parsing feed: ' + result.message);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showToast('Network error while fetching release notes.');
        renderErrorState();
    } finally {
        setLoadingState(false);
    }
}

// Set Loading State UI
function setLoadingState(loading) {
    state.isLoading = loading;
    const statusDot = document.querySelector('.status-dot');
    
    if (loading) {
        elements.refreshIcon.classList.add('spinning');
        elements.btnRefresh.disabled = true;
        statusDot.classList.add('loading');
        elements.lastUpdatedText.textContent = 'Syncing release notes...';
        renderSkeletons();
    } else {
        elements.refreshIcon.classList.remove('spinning');
        elements.btnRefresh.disabled = false;
        statusDot.classList.remove('loading');
    }
}

// Render Loading Skeletons
function renderSkeletons() {
    let html = '';
    for (let i = 0; i < 4; i++) {
        html += `
            <div class="skeleton-card">
                <div class="card-header">
                    <div class="card-meta">
                        <div class="skeleton skeleton-badge"></div>
                        <div class="skeleton skeleton-title"></div>
                    </div>
                </div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line-short"></div>
            </div>
        `;
    }
    elements.releasesStream.innerHTML = html;
}

// Render Error State
function renderErrorState() {
    elements.releasesStream.innerHTML = `
        <div class="feed-empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p class="feed-empty-title">Failed to load feed</p>
            <p class="feed-empty-desc">Check your internet connection or try refreshing again.</p>
        </div>
    `;
}

// Calculate Stats and Update Counters
function updateStats() {
    const total = state.releases.length;
    const features = state.releases.filter(r => r.type.toLowerCase() === 'feature').length;
    const breaking = state.releases.filter(r => r.type.toLowerCase() === 'breaking').length;
    const issues = state.releases.filter(r => r.type.toLowerCase() === 'issue').length;
    
    elements.statTotal.textContent = total;
    elements.statFeatures.textContent = features;
    elements.statBreaking.textContent = breaking;
    elements.statIssues.textContent = issues;
}

// Filter release data in local state
function applyFilters() {
    state.filteredReleases = state.releases.filter(item => {
        // Category Filter
        const matchesCategory = state.selectedCategory === 'all' || 
            item.type.toLowerCase() === state.selectedCategory.toLowerCase();
            
        // Search Query Filter
        const matchesSearch = !state.searchQuery || 
            item.content.toLowerCase().includes(state.searchQuery) ||
            item.type.toLowerCase().includes(state.searchQuery) ||
            item.date.toLowerCase().includes(state.searchQuery);
            
        return matchesCategory && matchesSearch;
    });
    
    // Show active filter helper banner if filter is active
    if (state.selectedCategory !== 'all' || state.searchQuery) {
        elements.activeFiltersInfo.style.display = 'flex';
        let text = `Showing ${state.filteredReleases.length} of ${state.releases.length} updates`;
        if (state.selectedCategory !== 'all') {
            text += ` in "${state.selectedCategory}"`;
        }
        if (state.searchQuery) {
            text += ` matching "${state.searchQuery}"`;
        }
        elements.activeFiltersText.textContent = text;
    } else {
        elements.activeFiltersInfo.style.display = 'none';
    }
    
    renderReleases();
}

// Render the list of releases
function renderReleases() {
    if (state.filteredReleases.length === 0) {
        elements.releasesStream.innerHTML = `
            <div class="feed-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <p class="feed-empty-title">No matching release notes found</p>
                <p class="feed-empty-desc">Try modifying your search keywords or clearing active filters.</p>
            </div>
        `;
        return;
    }
    
    elements.releasesStream.innerHTML = state.filteredReleases.map(item => {
        const isSelected = state.selectedRelease && state.selectedRelease.id === item.id;
        const typeClass = getCategoryBadgeClass(item.type);
        
        return `
            <div class="release-card ${isSelected ? 'selected' : ''}" data-id="${item.id}">
                <div class="card-header">
                    <div class="card-meta">
                        <span class="badge ${typeClass}">${item.type}</span>
                        <span class="date-badge">${item.date}</span>
                    </div>
                    
                    <div class="card-select-checkbox">
                        <div class="checkmark"></div>
                    </div>
                </div>
                
                <div class="card-body">
                    ${item.content}
                </div>
                
                <div class="card-footer-actions">
                    <a href="${item.link}" target="_blank" class="source-link-btn" title="View official release notes anchor">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        <span>Official Notes</span>
                    </a>
                    
                    <button class="tweet-action-trigger" data-id="${item.id}" title="Select and compose a tweet for this release note">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Select to Tweet</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Add Click Listeners to cards
    document.querySelectorAll('.release-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // If user clicked an anchor tag inside the body or the official source link button, don't trigger card selection
            if (e.target.closest('a') || e.target.closest('.source-link-btn')) {
                return;
            }
            
            const releaseId = card.dataset.id;
            selectRelease(releaseId);
        });
    });
}

// Category Class Resolver
function getCategoryBadgeClass(type) {
    switch (type.toLowerCase()) {
        case 'feature': return 'badge-feature';
        case 'breaking': return 'badge-breaking';
        case 'issue': return 'badge-issue';
        case 'change': return 'badge-change';
        case 'announcement': return 'badge-announcement';
        default: return 'badge-update';
    }
}

// Select a release card
function selectRelease(id) {
    const release = state.releases.find(r => r.id === id);
    if (!release) return;
    
    state.selectedRelease = release;
    
    // Highlight selected card in list
    document.querySelectorAll('.release-card').forEach(card => {
        if (card.dataset.id === id) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    // Update Composer UI
    elements.composerEmptyState.style.display = 'none';
    elements.composerActiveForm.style.display = 'flex';
    
    // Populate context preview
    const badgeTypeClass = getCategoryBadgeClass(release.type);
    elements.contextBadge.className = `badge ${badgeTypeClass}`;
    elements.contextBadge.textContent = release.type;
    elements.contextDate.textContent = release.date;
    elements.contextText.textContent = release.plain_text;
    
    // Generate text template
    regenerateTweetText();
    
    // Scroll composer widget into view on mobile screens
    if (window.innerWidth <= 1024) {
        elements.composerActiveForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Re-generate tweet text based on selected release & settings
function regenerateTweetText() {
    if (!state.selectedRelease) return;
    
    const release = state.selectedRelease;
    const includeLink = elements.chkIncludeLink.checked;
    const includeTags = elements.chkIncludeTags.checked;
    
    const hashtags = " #GoogleCloud #BigQuery";
    const link = release.link ? `\n\nRead more: ${release.link}` : "";
    const tagsSuffix = `\n\n#GoogleCloud #BigQuery`;
    
    // Google Cloud BigQuery (June 15, 2026) - Feature:\n"Use Gemini Cloud Assist..."
    const prefix = `Google Cloud BigQuery (${release.date}) - ${release.type}:\n"`;
    const suffix = `"`;
    
    let reservedLength = prefix.length + suffix.length;
    if (includeLink && release.link) reservedLength += link.length;
    if (includeTags) reservedLength += tagsSuffix.length;
    
    const maxDescLength = TWITTER_CHAR_LIMIT - reservedLength;
    
    let desc = release.plain_text;
    if (desc.length > maxDescLength) {
        desc = desc.substring(0, maxDescLength - 3) + "...";
    }
    
    let tweetText = `${prefix}${desc}${suffix}`;
    if (includeLink && release.link) {
        tweetText += link;
    }
    if (includeTags) {
        tweetText += tagsSuffix;
    }
    
    elements.tweetTextarea.value = tweetText;
    updateCharCounter();
}

// Update Character Counter UI
function updateCharCounter() {
    const text = elements.tweetTextarea.value;
    const count = text.length;
    const remaining = TWITTER_CHAR_LIMIT - count;
    
    elements.charCounterNumber.textContent = remaining;
    
    // Circular Progress Ring Calculation
    let pct = (count / TWITTER_CHAR_LIMIT) * 100;
    pct = Math.min(pct, 100);
    
    const offset = PROGRESS_RING_CIRCUMFERENCE - (pct / 100) * PROGRESS_RING_CIRCUMFERENCE;
    elements.progressRingFill.style.strokeDashoffset = offset;
    
    // Class Color Shift
    elements.charCounterNumber.classList.remove('warn', 'error');
    
    if (remaining < 0) {
        elements.charCounterNumber.classList.add('error');
        elements.progressRingFill.style.stroke = 'var(--color-breaking)';
    } else if (remaining <= 20) {
        elements.charCounterNumber.classList.add('warn');
        elements.progressRingFill.style.stroke = 'var(--color-issue)';
    } else {
        elements.progressRingFill.style.stroke = 'var(--twitter-blue)';
    }
}

// Copy Tweet text to clipboard
async function copyTweetText() {
    const text = elements.tweetTextarea.value;
    if (!text) return;
    
    try {
        await navigator.clipboard.writeText(text);
        showToast('Tweet copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy to clipboard.');
    }
}

// Open Tweet Share Intent in Twitter/X
function shareTweetOnTwitter() {
    const text = elements.tweetTextarea.value;
    if (!text) return;
    
    // Twitter/X Share URL Intent
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=550,height=420,toolbar=no,menubar=no,scrollbars=yes,resizable=yes');
}

// Trigger standard modal toast banner
function showToast(message) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.add('show');
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}
