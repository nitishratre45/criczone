let matchesData = [];
let currentCategory = 'ALL';
let pendingStreamData = null;

window.PRIMARY_URL =
    "https://raw.githubusercontent.com/kajju027/Fancode-Events-Json/main/fancode.json";

const $ = (id) => document.getElementById(id);

const escapeHTML = (value) => {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
};

/* =========================
   FETCH LIVE MATCH DATA
========================= */

async function fetchLatestMatches() {
    const loader = $('loader');

    try {
        if (loader) loader.style.display = 'flex';

        const response = await fetch(
            window.PRIMARY_URL + '?t=' + Date.now(),
            {
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        matchesData = Array.isArray(data.matches)
            ? data.matches
            : [];

        setupCategories();
        renderMatches();
        updateStats();

    } catch (error) {
        console.error('Failed to load matches:', error);

        const container = $('matches-container');

        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Unable to load matches</h3>
                    <p>Please try refreshing the page.</p>
                    <button class="primary-btn" onclick="fetchLatestMatches()">
                        Try Again
                    </button>
                </div>
            `;
        }

    } finally {
        if (loader) loader.style.display = 'none';
    }
}


/* =========================
   CATEGORIES
========================= */

function setupCategories() {
    const container = $('categories');

    if (!container) return;

    const categories = [
        'ALL',
        ...new Set(
            matchesData
                .map(match => match.category)
                .filter(Boolean)
        )
    ];

    container.innerHTML = categories.map(category => `
        <button
            class="category-btn ${currentCategory === category ? 'active' : ''}"
            onclick="filterCategory('${escapeHTML(category)}')"
        >
            ${escapeHTML(category)}
        </button>
    `).join('');
}


/* =========================
   FILTER CATEGORY
========================= */

function filterCategory(category) {
    currentCategory = category || 'ALL';

    setupCategories();
    renderMatches();

    const section = $('live-matches');

    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}


/* =========================
   RENDER MATCHES
========================= */

function renderMatches() {
    const container = $('matches-container');

    if (!container) return;

    let filteredMatches = matchesData;

    if (currentCategory !== 'ALL') {
        filteredMatches = matchesData.filter(
            match => match.category === currentCategory
        );
    }

    if (!filteredMatches.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏏</div>
                <h3>No live matches found</h3>
                <p>There are no matches in this category right now.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredMatches.map((match, index) => {

        const actualIndex = matchesData.indexOf(match);

        const title =
            match.title ||
            match.name ||
            'Live Match';

        const teamA =
            match.team_a ||
            match.team1 ||
            match.teams?.[0] ||
            'Team A';

        const teamB =
            match.team_b ||
            match.team2 ||
            match.teams?.[1] ||
            'Team B';

        const image =
            match.image ||
            match.thumbnail ||
            match.logo ||
            '';

        const category =
            match.category ||
            'LIVE';

        return `
            <article
                class="match-card"
                data-title="${escapeHTML(title)}"
                onclick="showDetails(${actualIndex})"
            >

                <div class="match-image">

                    ${
                        image
                        ? `<img
                            src="${escapeHTML(image)}"
                            alt="${escapeHTML(title)}"
                            loading="lazy"
                           >`
                        : `
                            <div class="match-placeholder">
                                🏏
                            </div>
                          `
                    }

                    <span class="live-badge">
                        LIVE
                    </span>

                    <span class="category-badge">
                        ${escapeHTML(category)}
                    </span>

                    <div class="card-play">
                        ▶
                    </div>

                </div>

                <div class="match-content">

                    <h3>
                        ${escapeHTML(title)}
                    </h3>

                    <div class="teams-row">
                        <span>
                            ${escapeHTML(teamA)}
                        </span>

                        <span class="vs">
                            VS
                        </span>

                        <span>
                            ${escapeHTML(teamB)}
                        </span>
                    </div>

                    <div class="match-footer">
                        <span>📺 Live</span>
                        <span>▶ Watch</span>
                    </div>

                </div>

            </article>
        `;
    }).join('');
}


/* =========================
   SEARCH
========================= */

const matchSearch = $('match-search');

if (matchSearch) {

    matchSearch.addEventListener('input', () => {

        const query =
            matchSearch.value
                .trim()
                .toLowerCase();

        document
            .querySelectorAll('.match-card')
            .forEach(card => {

                const text =
                    card.innerText.toLowerCase();

                card.style.display =
                    text.includes(query)
                        ? ''
                        : 'none';
            });
    });
}


/* =========================
   DETAILS PAGE
========================= */

function showDetails(index) {

    const match = matchesData[index];

    if (!match) return;

    const homeView = $('home-view');
    const detailView = $('detail-view');

    if (!homeView || !detailView) return;

    homeView.style.display = 'none';
    detailView.style.display = 'block';

    const title =
        match.title ||
        match.name ||
        'Live Match';

    const image =
        match.image ||
        match.thumbnail ||
        match.logo ||
        '';

    const detailTitle = $('detail-title');
    const detailImage = $('detail-image');
    const detailCategory = $('detail-category');

    if (detailTitle) {
        detailTitle.textContent = title;
    }

    if (detailImage && image) {
        detailImage.src = image;
    }

    if (detailCategory) {
        detailCategory.textContent =
            match.category || 'LIVE';
    }

    renderQualities(match);

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

    history.pushState(
        {},
        '',
        '?match=' + index
    );
}


/* =========================
   HOME
========================= */

function showHome() {

    const homeView = $('home-view');
    const detailView = $('detail-view');

    if (detailView) {
        detailView.style.display = 'none';
    }

    if (homeView) {
        homeView.style.display = 'block';
    }

    history.pushState(
        {},
        '',
        location.pathname
    );

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}


/* =========================
   QUALITY / STREAMS
========================= */

function getStreams(match) {

    const streams = [];

    if (
        match?.STREAMING_CDN?.drm?.clearkey
    ) {
        streams.push({
            name: 'HD',
            url: match.STREAMING_CDN.drm.clearkey.url,
            key: match.STREAMING_CDN.drm.clearkey.key
        });
    }

    if (
        match?.drm?.clearkey
    ) {
        streams.push({
            name: 'HD',
            url: match.drm.clearkey.url,
            key: match.drm.clearkey.key
        });
    }

    if (Array.isArray(match?.auto_streams)) {

        match.auto_streams.forEach((stream, index) => {

            if (!stream) return;

            if (typeof stream === 'string') {

                streams.push({
                    name: `Stream ${index + 1}`,
                    url: stream,
                    key: ''
                });

            } else {

                streams.push({
                    name:
                        stream.name ||
                        stream.quality ||
                        `Stream ${index + 1}`,

                    url:
                        stream.url ||
                        stream.stream ||
                        stream.src ||
                        '',

                    key:
                        stream.key ||
                        ''
                });
            }
        });
    }

    if (Array.isArray(match?.streams)) {

        match.streams.forEach((stream, index) => {

            if (!stream) return;

            if (typeof stream === 'string') {

                streams.push({
                    name: `Stream ${index + 1}`,
                    url: stream,
                    key: ''
                });

            } else {

                streams.push({
                    name:
                        stream.name ||
                        stream.quality ||
                        `Stream ${index + 1}`,

                    url:
                        stream.url ||
                        stream.stream ||
                        stream.src ||
                        '',

                    key:
                        stream.key ||
                        ''
                });
            }
        });
    }

    if (
        match?.streams?.primary
    ) {

        const primary =
            match.streams.primary;

        if (typeof primary === 'string') {

            streams.push({
                name: 'Primary',
                url: primary,
                key: ''
            });

        } else {

            streams.push({
                name:
                    primary.name ||
                    'Primary',

                url:
                    primary.url ||
                    primary.stream ||
                    primary.src ||
                    '',

                key:
                    primary.key ||
                    ''
            });
        }
    }

    return streams.filter(
        stream => stream.url
    );
}


/* =========================
   RENDER QUALITY BUTTONS
========================= */

function renderQualities(match) {

    const container =
        $('quality-buttons');

    if (!container) return;

    const streams =
        getStreams(match);

    if (!streams.length) {

        container.innerHTML = `
            <div class="empty-stream">
                Stream URL not available.
            </div>
        `;

        return;
    }

    container.innerHTML =
        streams.map(stream => `
            <button
                class="quality-btn"
                onclick="triggerStreamFlow(
                    '${encodeURIComponent(stream.url)}',
                    '${encodeURIComponent(stream.key || '')}'
                )"
            >
                ▶ ${escapeHTML(stream.name)}
            </button>
        `).join('');
}


/* =========================
   STREAM FLOW
========================= */

function triggerStreamFlow(
    url,
    key = ''
) {

    if (!url) {
        alert('Stream URL not available.');
        return;
    }

    try {
        url = decodeURIComponent(url);
        key = decodeURIComponent(key);
    } catch (error) {
        console.warn(
            'URL decode failed:',
            error
        );
    }

    pendingStreamData = {
        url,
        key
    };

    const modal =
        $('telegram-modal');

    if (!modal) return;

    modal.classList.add('active');

    document.body.style.overflow =
        'hidden';
}


/* =========================
   CLOSE TELEGRAM MODAL
========================= */

function closeTelegramModal() {

    const modal =
        $('telegram-modal');

    if (modal) {
        modal.classList.remove('active');
    }

    document.body.style.overflow =
        '';
}


/* =========================
   START STREAM
========================= */

function startSelectedStream() {

    if (!pendingStreamData?.url) {

        alert(
            'No stream selected.'
        );

        return;
    }

    const streamData =
        { ...pendingStreamData };

    closeTelegramModal();

    const iframe =
        $('iframePlayer');

    const playerModal =
        $('player-modal');

    if (!iframe || !playerModal) {

        console.error(
            'Player elements not found.'
        );

        return;
    }

    let playerUrl =
        'https://chaudhary-player.netlify.app/?famcode=' +
        encodeURIComponent(
            streamData.url
        );

    if (streamData.key) {

        playerUrl +=
            '&key=' +
            encodeURIComponent(
                streamData.key
            );
    }

    iframe.src = playerUrl;

    playerModal.style.display =
        'flex';

    document.body.style.overflow =
        'hidden';
}


/* =========================
   CLOSE PLAYER
========================= */

function closePlayer() {

    const modal =
        $('player-modal');

    const iframe =
        $('iframePlayer');

    if (iframe) {
        iframe.src = 'about:blank';
    }

    if (modal) {
        modal.style.display = 'none';
    }

    document.body.style.overflow =
        '';
}


/* =========================
   SHARE MODAL
========================= */

function openShareModal() {

    const modal =
        $('share-modal');

    if (!modal) return;

    modal.classList.add('active');

    document.body.style.overflow =
        'hidden';
}


function closeShareModal() {

    const modal =
        $('share-modal');

    if (modal) {
        modal.classList.remove('active');
    }

    document.body.style.overflow =
        '';
}

/* =========================
   SHARE LINKS
========================= */

function shareCurrentPage() {

    const url = window.location.href;

    const title =
        document.title || 'Live Sports';

    const whatsapp =
        'https://wa.me/?text=' +
        encodeURIComponent(
            `${title}\n${url}`
        );

    const telegram =
        'https://t.me/share/url?url=' +
        encodeURIComponent(url) +
        '&text=' +
        encodeURIComponent(title);

    const twitter =
        'https://twitter.com/intent/tweet?text=' +
        encodeURIComponent(title) +
        '&url=' +
        encodeURIComponent(url);

    const facebook =
        'https://www.facebook.com/sharer/sharer.php?u=' +
        encodeURIComponent(url);

    const whatsappBtn =
        document.getElementById('share-whatsapp');

    const telegramBtn =
        document.getElementById('share-telegram');

    const twitterBtn =
        document.getElementById('share-twitter');

    const facebookBtn =
        document.getElementById('share-facebook');

    if (whatsappBtn) {
        whatsappBtn.href = whatsapp;
    }

    if (telegramBtn) {
        telegramBtn.href = telegram;
    }

    if (twitterBtn) {
        twitterBtn.href = twitter;
    }

    if (facebookBtn) {
        facebookBtn.href = facebook;
    }
}


/* =========================
   SCROLL
========================= */

function scrollToMatches() {

    const section =
        document.getElementById('live-matches');

    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}


/* =========================
   REFRESH
========================= */

function refreshMatches() {

    fetchLatestMatches();
}


/* =========================
   UI HELPERS
========================= */

function filterCategory(category) {

    currentCategory =
        category || 'ALL';

    showHome();
    setupCategories();
    renderMatches();

    const section =
        document.getElementById('live-matches');

    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}


/* =========================
   SEARCH
========================= */

const matchSearch =
    document.getElementById('match-search');

if (matchSearch) {

    matchSearch.addEventListener(
        'input',
        function () {

            const query =
                matchSearch.value
                    .trim()
                    .toLowerCase();

            document
                .querySelectorAll(
                    '#home-view .match-card'
                )
                .forEach(function (card) {

                    const text =
                        card.innerText
                            .toLowerCase();

                    card.style.display =
                        text.includes(query)
                            ? ''
                            : 'none';
                });
        }
    );
}


/* =========================
   INITIAL LOAD
========================= */

fetchLatestMatches().then(() => {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const matchIndex =
        params.get('match');

    if (
        matchIndex !== null &&
        !isNaN(matchIndex) &&
        matchesData[Number(matchIndex)]
    ) {

        setTimeout(() => {

            showDetails(
                Number(matchIndex)
            );

        }, 500);
    }

});


/* =========================
   AUTO REFRESH
========================= */

setInterval(
    fetchLatestMatches,
    120000
);


/* =========================
   GLOBAL FUNCTIONS
========================= */

window.filterCategory =
    filterCategory;

window.scrollToMatches =
    scrollToMatches;

window.refreshMatches =
    refreshMatches;

window.shareCurrentPage =
    shareCurrentPage;

window.showHome =
    showHome;

window.showDetails =
    showDetails;

window.triggerStreamFlow =
    triggerStreamFlow;

window.startSelectedStream =
    startSelectedStream;

window.closeTelegramModal =
    closeTelegramModal;

window.closePlayer =
    closePlayer;

window.openShareModal =
    openShareModal;

window.closeShareModal =
    closeShareModal;

console.log(
    '✅ Script loaded successfully!'
);
