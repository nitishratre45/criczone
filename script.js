/* =========================================================
   CRICZONE LIVE — MAIN SCRIPT
   ========================================================= */

let matchesData = [];
let currentCategory = 'ALL';
let pendingStreamData = null;


/* =========================================================
   ORIGINAL DATA SOURCE — DO NOT CHANGE
   ========================================================= */

window.PRIMARY_URL =
    "https://raw.githubusercontent.com/kajju027/Fancode-Events-Json/main/fancode.json";


/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}

function escapeHTML(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}


/* =========================================================
   DATE PARSER
   ========================================================= */

function parseCustomDate(value) {

    if (!value) return 0;

    const stringValue = String(value).trim();

    const match = stringValue.match(
        /^(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)\s*(\d{2})-(\d{2})-(\d{4})$/i
    );

    if (!match) {
        const parsed = Date.parse(stringValue);
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    let hour = Number(match[1]);

    const minute = Number(match[2]);
    const second = Number(match[3]);

    const ampm = match[4].toUpperCase();

    const day = Number(match[5]);
    const month = Number(match[6]) - 1;
    const year = Number(match[7]);

    if (ampm === 'PM' && hour !== 12) {
        hour += 12;
    }

    if (ampm === 'AM' && hour === 12) {
        hour = 0;
    }

    return new Date(
        year,
        month,
        day,
        hour,
        minute,
        second
    ).getTime();
}


function getDatePart(value) {

    const timestamp = parseCustomDate(value);

    if (!timestamp) return 0;

    const date = new Date(timestamp);

    date.setHours(0, 0, 0, 0);

    return date.getTime();
}


/* =========================================================
   FETCH MATCHES
   ========================================================= */

async function fetchLatestMatches() {

    const loader = $('loader');

    if (loader) {
        loader.style.display = 'flex';
        loader.innerHTML = `
            <div class="loading-spinner"></div>
            <span>Fetching Latest Updated Streams...</span>
        `;
    }

    try {

        const response = await fetch(
            window.PRIMARY_URL +
            '?t=' +
            Date.now(),
            {
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data = await response.json();

        matchesData =
            Array.isArray(data.matches)
                ? data.matches
                : [];

        console.log(
            `✅ Loaded ${matchesData.length} matches`
        );

        setupCategories();

        renderMatches();

        updateStats();

        if (loader) {
            loader.style.display = 'none';
        }

    } catch (error) {

        console.error(
            '❌ Fetch error:',
            error
        );

        if (loader) {

            loader.innerHTML = `
                <div class="loading-error">
                    <div class="error-icon">⚠️</div>
                    <strong>Unable to load matches</strong>
                    <span>Please refresh and try again.</span>
                    <button
                        class="error-retry"
                        onclick="fetchLatestMatches()">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
}


/* =========================================================
   CATEGORY SETUP
   ========================================================= */

function setupCategories() {

    const container =
        $('category-container');

    if (!container) return;

    const categories = [
        ...new Set(
            matchesData
                .map(match =>
                    String(
                        match.category || ''
                    ).trim()
                )
                .filter(Boolean)
        )
    ].sort();

    container.innerHTML = '';

    container.style.display = 'flex';


    /* ALL */

    const allButton =
        document.createElement('button');

    allButton.className =
        `cat-btn ${
            currentCategory === 'ALL'
                ? 'active'
                : ''
        }`;

    allButton.innerHTML =
        `<span>✦</span> ALL`;

    allButton.onclick = () => {

        currentCategory = 'ALL';

        setupCategories();
        renderMatches();

        scrollToMatches();
    };

    container.appendChild(allButton);


    /* Categories */

    categories.forEach(category => {

        const button =
            document.createElement('button');

        button.className =
            `cat-btn ${
                category === currentCategory
                    ? 'active'
                    : ''
            }`;

        button.textContent =
            category;

        button.onclick = () => {

            currentCategory =
                category;

            setupCategories();
            renderMatches();

            scrollToMatches();
        };

        container.appendChild(button);
    });
}


/* =========================================================
   FILTER
   ========================================================= */

function filterCategory(category) {

    currentCategory =
        category || 'ALL';

    setupCategories();

    renderMatches();

    scrollToMatches();
}


/* =========================================================
   RENDER MATCHES
   ========================================================= */

function renderMatches() {

    const homeView =
        $('home-view');

    if (!homeView) return;


    const oldGrid =
        $('matches-container');

    const grid =
        oldGrid ||
        homeView;


    grid.innerHTML = '';


    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    const todayTime =
        today.getTime();


    let filtered =
        matchesData.filter(match => {

            if (
                currentCategory === 'ALL'
            ) {
                return true;
            }

            return String(
                match.category || ''
            )
            .trim()
            .toLowerCase() ===
                String(
                    currentCategory
                )
                .trim()
                .toLowerCase();
        });


    /* =====================================================
       SORT
    ===================================================== */

    filtered.sort((a, b) => {

        const dateA =
            getDatePart(a.startTime);

        const dateB =
            getDatePart(b.startTime);

        const liveA =
            String(a.status || '')
                .toUpperCase() === 'LIVE';

        const liveB =
            String(b.status || '')
                .toUpperCase() === 'LIVE';


        /* LIVE first */

        if (liveA && !liveB) return -1;

        if (!liveA && liveB) return 1;


        /* TODAY first */

        const todayA =
            dateA === todayTime;

        const todayB =
            dateB === todayTime;

        if (todayA && !todayB) return -1;

        if (!todayA && todayB) return 1;


        /* Date */

        if (dateA !== dateB) {
            return dateA - dateB;
        }


        /* Time */

        return (
            parseCustomDate(a.startTime) -
            parseCustomDate(b.startTime)
        );
    });


    /* =====================================================
       EMPTY
    ===================================================== */

    if (!filtered.length) {

        grid.innerHTML = `
            <div class="empty-matches">
                <div class="empty-matches-icon">
                    🏏
                </div>

                <h3>
                    No matches found
                </h3>

                <p>
                    There are no matches in
                    this category right now.
                </p>
            </div>
        `;

        return;
    }


    /* =====================================================
       CARDS
    ===================================================== */

    filtered.forEach(
        (match, displayIndex) => {

            const index =
                matchesData.indexOf(match);

            const status =
                String(
                    match.status || 'UPCOMING'
                ).toUpperCase();

            const isLive =
                status === 'LIVE';

            const image =
                match.image ||
                match.image_cdn?.APP ||
                '';

            const title =
                match.title ||
                'Live Match';

            const category =
                match.category ||
                'SPORTS';

            const tournament =
                match.tournament ||
                '';

            const startTime =
                match.startTime ||
                'TBD';

            const isToday =
                getDatePart(startTime) ===
                todayTime;


            const card =
                document.createElement('article');

            card.className =
                'match-card';

            card.style.setProperty(
                '--card-index',
                displayIndex
            );


            card.onclick = () => {

                showDetails(index);
            };


            /* Image */

            let imageHTML = '';

            if (image) {

                imageHTML = `
                    <img
                        class="card-img"
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(title)}"
                        loading="lazy"
                        onerror="this.style.display='none';this.parentElement.classList.add('image-failed');"
                    >
                `;

            } else {

                imageHTML = `
                    <div class="card-img-placeholder">
                        <span>🏏</span>
                    </div>
                `;
            }


            card.innerHTML = `

                <div class="card-thumb-wrap"
                     style="--card-image:url('${escapeHTML(image)}')">

                    ${imageHTML}


                    <div class="card-overlay"></div>


                    <div class="card-top">

                        <span class="
                            status-badge
                            ${
                                isLive
                                    ? 'badge-live'
                                    : 'badge-upcoming'
                            }
                        ">

                            ${
                                isLive
                                    ? '● LIVE'
                                    : escapeHTML(status)
                            }

                        </span>


                        ${
                            isToday
                                ? `
                                    <span class="today-badge-card">
                                        TODAY
                                    </span>
                                  `
                                : ''
                        }


                        <button
                            class="share-btn-3dot"
                            onclick="
                                event.stopPropagation();
                                openShareModal(${index});
                            "
                            title="Share">

                            <span></span>
                            <span></span>
                            <span></span>

                        </button>

                    </div>


                    ${
                        isLive
                            ? `
                                <div class="watch-overlay">
                                    <span class="watch-play">
                                        ▶
                                    </span>
                                    <span>
                                        WATCH LIVE
                                    </span>
                                </div>
                              `
                            : ''
                    }

                </div>


                <div class="card-body">

                    <div class="card-category">
                        ${escapeHTML(category)}
                    </div>


                    <div class="card-title">
                        ${escapeHTML(title)}
                    </div>


                    ${
                        tournament
                            ? `
                                <div class="card-tournament">
                                    ${escapeHTML(tournament)}
                                </div>
                              `
                            : ''
                    }


                    <div class="card-time">
                        <span>◷</span>
                        ${escapeHTML(startTime)}
                    </div>

                </div>
            `;


            grid.appendChild(card);
        }
    );


    applySearch();
}


/* =========================================================
   SEARCH
   ========================================================= */

const searchInput =
    $('match-search');


if (searchInput) {

    searchInput.addEventListener(
        'input',
        applySearch
    );
}


function applySearch() {

    const input =
        $('match-search');

    if (!input) return;

    const query =
        input.value
            .trim()
            .toLowerCase();


    document
        .querySelectorAll(
            '#matches-container .match-card'
        )
        .forEach(card => {

            const text =
                card.innerText
                    .toLowerCase();

            card.style.display =
                text.includes(query)
                    ? ''
                    : 'none';
        });
}


/* =========================================================
   SHOW DETAILS
   ========================================================= */

function showDetails(index) {

    const match =
        matchesData[index];

    if (!match) return;


    const home =
        $('home-view');

    const detail =
        $('detail-view');

    if (!home || !detail) return;


    /* URL */

    const url =
        new URL(
            window.location.href
        );

    url.searchParams.set(
        'match',
        index
    );

    window.history.pushState(
        {},
        '',
        url
    );


    /* Views */

    home.style.display =
        'none';

    detail.style.display =
        'block';


    /* Image */

    const image =
        match.image ||
        match.image_cdn?.APP ||
        '';

    if ($('detail-img')) {

        $('detail-img').src =
            image;

        $('detail-img').alt =
            match.title ||
            'Match Poster';
    }


    /* Text */

    if ($('detail-tournament')) {

        $('detail-tournament').textContent =
            match.tournament ||
            match.category ||
            'LIVE SPORTS';
    }


    if ($('detail-title')) {

        $('detail-title').textContent =
            match.title ||
            'Live Match';
    }


    if ($('detail-time')) {

        $('detail-time').textContent =
            `Start Time: ${
                match.startTime ||
                'TBD'
            }`;
    }


    if ($('detail-status')) {

        $('detail-status').textContent =
            `Status: ${
                match.status ||
                'UPCOMING'
            }`;
    }


    /* Share */

    const shareButton =
        $('share-detail-btn');

    if (shareButton) {

        shareButton.onclick = () =>
            openShareModal(index);
    }


    /* Streams */

    renderDetailStreams(match);


    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}


/* =========================================================
   STREAM EXTRACTION
   ========================================================= */

function extractStreams(match) {

    const languages = {};

    const drmKey =
        match?.STREAMING_CDN?.drm?.clearkey ||
        match?.drm?.clearkey ||
        "";


    /* -----------------------------------------
       AUTO STREAMS — OBJECT
    ----------------------------------------- */

    if (
        match.auto_streams &&
        !Array.isArray(
            match.auto_streams
        )
    ) {

        Object.keys(
            match.auto_streams
        ).forEach(language => {

            const streamData =
                match.auto_streams[
                    language
                ];

            const streams =
                streamData?.streams;

            if (
                streams &&
                Object.keys(streams)
                    .some(
                        key =>
                            /^\d+p$/i.test(key)
                    )
            ) {

                languages[
                    language.toUpperCase()
                ] = streams;
            }
        });
    }


    /* -----------------------------------------
       AUTO STREAMS — ARRAY
    ----------------------------------------- */

    if (
        Array.isArray(
            match.auto_streams
        )
    ) {

        match.auto_streams.forEach(
            item => {

                if (
                    item?.auto &&
                    typeof item.auto ===
                        'string'
                ) {

                    const parsed =
                        parseM3u8Qualities(
                            item.auto
                        );

                    if (
                        Object.keys(
                            parsed
                        ).length
                    ) {

                        languages.DEFAULT =
                            parsed;
                    }
                }
            }
        );
    }


    /* -----------------------------------------
       PRIMARY STREAM
    ----------------------------------------- */

    if (
        !Object.keys(languages).length &&
        match.streams?.primary
    ) {

        let primary =
            match.streams.primary;


        if (
            typeof primary ===
            'string'
        ) {

            languages.DEFAULT = {
                '1080p':
                    primary
            };

        } else {

            const primaryURL =
                primary.url ||
                primary.stream ||
                primary.src ||
                '';

            if (primaryURL) {

                languages.DEFAULT = {
                    '1080p':
                        primaryURL
                };
            }
        }
    }


    console.log(
        '🌐 Languages:',
        Object.keys(languages)
    );


    return {
        languages,
        drmKey
    };
}


/* =========================================================
   PARSE M3U8 QUALITIES
   ========================================================= */

function parseM3u8Qualities(
    playlist
) {

    if (
        !playlist ||
        typeof playlist !== 'string'
    ) {
        return {};
    }


    const result = {};

    const lines =
        playlist.split('\n');


    lines.forEach(
        (line, index) => {

            const resolution =
                line.match(
                    /RESOLUTION=\d+x(\d+)/i
                );


            if (
                resolution &&
                lines[index + 1]
            ) {

                const nextLine =
                    lines[index + 1]
                        .trim();


                if (
                    nextLine.startsWith(
                        'http'
                    )
                ) {

                    result[
                        resolution[1] +
                        'p'
                    ] =
                        nextLine;
                }
            }
        }
    );


    return result;
}


/* =========================================================
   DETAIL STREAM UI
   ========================================================= */

function renderDetailStreams(
    match
) {

    const detail =
        $('detail-view');

    if (!detail) return;


    /* Remove previous dynamic sections */

    detail
        .querySelectorAll(
            '.dynamic-stream-area'
        )
        .forEach(
            element =>
                element.remove()
        );


    const {
        languages,
        drmKey
    } =
        extractStreams(match);


    const languageKeys =
        Object.keys(languages);


    /* No streams */

    if (!languageKeys.length) {

        const empty =
            document.createElement(
                'div'
            );

        empty.className =
            'dynamic-stream-area stream-empty';

        empty.innerHTML = `
            <div>
                🚫
            </div>

            <strong>
                Stream unavailable
            </strong>

            <span>
                No playable stream is available
                for this match.
            </span>
        `;

        detail.appendChild(empty);

        return;
    }


    /* Language priority */

    const priority = [
        'HINDI',
        'ENGLISH',
        'PUNJABI',
        'TAMIL',
        'TELUGU',
        'BHOJPURI',
        'MALAYALAM',
        'KANNADA',
        'BENGALI',
        'MARATHI'
    ];


    languageKeys.sort(
        (a, b) => {

            const aIndex =
                priority.indexOf(a);

            const bIndex =
                priority.indexOf(b);


            if (
                aIndex !== -1 &&
                bIndex !== -1
            ) {
                return aIndex - bIndex;
            }


            if (aIndex !== -1) {
                return -1;
            }


            if (bIndex !== -1) {
                return 1;
            }


            return a.localeCompare(b);
        }
    );


    /* -----------------------------------------
       STREAM AREA
    ----------------------------------------- */

    const area =
        document.createElement(
            'div'
        );

    area.className =
        'dynamic-stream-area';


    area.innerHTML = `

        <div class="language-title">
            <span>🌐</span>
            Select Language
        </div>

        <div class="language-tabs"></div>

        <div class="quality-section">

            <div class="quality-title">
                <span>🎬</span>
                Select Quality
            </div>

            <div
                class="quality-grid"
                id="dynamic-quality-grid">
            </div>

        </div>
    `;


    detail.appendChild(area);


    const tabs =
        area.querySelector(
            '.language-tabs'
        );


    const qualityGrid =
        area.querySelector(
            '#dynamic-quality-grid'
        );


    let activeLanguage =
        languageKeys[0];


    /* -----------------------------------------
       LANGUAGE BUTTONS
    ----------------------------------------- */

    languageKeys.forEach(
        language => {

            const button =
                document.createElement(
                    'button'
                );


            button.className =
                `lang-btn ${
                    language ===
                    activeLanguage
                        ? 'active'
                        : ''
                }`;


            button.textContent =
                language;


            button.onclick = () => {

                tabs
                    .querySelectorAll(
                        '.lang-btn'
                    )
                    .forEach(
                        item =>
                            item.classList
                                .remove(
                                    'active'
                                )
                    );


                button.classList.add(
                    'active'
                );


                activeLanguage =
                    language;


                renderQualities(
                    languages[
                        activeLanguage
                    ],
                    drmKey,
                    qualityGrid
                );
            };


            tabs.appendChild(
                button
            );
        }
    );


    /* First language */

    renderQualities(
        languages[
            activeLanguage
        ],
        drmKey,
        qualityGrid
    );
}


/* =========================================================
   RENDER QUALITIES
   ========================================================= */

function renderQualities(
    streams,
    drmKey,
    grid
) {

    if (!grid) return;


    grid.innerHTML = '';


    if (!streams) {

        grid.innerHTML = `
            <div class="stream-empty">
                No streams available.
            </div>
        `;

        return;
    }


    const qualities =
        Object.keys(streams)
            .filter(
                key =>
                    /^\d+p$/i.test(key)
            )
            .sort(
                (a, b) =>
                    parseInt(b) -
                    parseInt(a)
            );


    if (!qualities.length) {

        grid.innerHTML = `
            <div class="stream-empty">
                No playable quality found.
            </div>
        `;

        return;
    }


    qualities.forEach(
        quality => {

            const button =
                document.createElement(
                    'button'
                );


            button.className =
                'quality-btn';


            button.innerHTML = `
                <span class="quality-play">
                    ▶
                </span>

                <span>
                    PLAY
                    ${escapeHTML(
                        quality.toUpperCase()
                    )}
                </span>
            `;


            button.onclick = () => {

                triggerStreamFlow(
                    streams[quality],
                    drmKey
                );
            };


            grid.appendChild(
                button
            );
        }
    );
}


/* =========================================================
   HOME
   ========================================================= */

function showHome() {

    const home =
        $('home-view');

    const detail =
        $('detail-view');


    if (home) {
        home.style.display =
            'block';
    }


    if (detail) {
        detail.style.display =
            'none';
    }


    const url =
        new URL(
            window.location.href
        );

    url.searchParams.delete(
        'match'
    );


    window.history.pushState(
        {},
        '',
        url
    );


    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}


/* =========================================================
   SCROLL
   ========================================================= */

function scrollToMatches() {

    const section =
        $('live-matches');

    if (!section) return;


    section.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}


/* =========================================================
   STREAM FLOW
   ========================================================= */

function triggerStreamFlow(
    url,
    key = ''
) {

    if (!url) {

        alert(
            'Stream URL not available.'
        );

        return;
    }


    pendingStreamData = {
        url,
        key
    };


    const modal =
        $('telegram-modal');


    if (!modal) return;


    modal.classList.add(
        'active'
    );


    document.body.style.overflow =
        'hidden';
}


/* =========================================================
   CLOSE TELEGRAM
   ========================================================= */

function closeTelegramModal() {

    const modal =
        $('telegram-modal');


    if (modal) {

        modal.classList.remove(
            'active'
        );
    }


    document.body.style.overflow =
        '';
}


/* =========================================================
   START STREAM
   ========================================================= */

function startSelectedStream() {

    if (
        !pendingStreamData?.url
    ) {

        alert(
            'No stream selected.'
        );

        return;
    }


    const streamData =
        {
            ...pendingStreamData
        };


    closeTelegramModal();


    const iframe =
        $('iframePlayer');

    const playerModal =
        $('player-modal');


    if (
        !iframe ||
        !playerModal
    ) {

        console.error(
            'Player elements not found.'
        );

        return;
    }


    /*
       EXISTING PLAYER URL — DO NOT CHANGE
    */

    let playerURL =
        'https://chaudhary-player.netlify.app/?famcode=' +
        encodeURIComponent(
            streamData.url
        );


    if (streamData.key) {

        playerURL +=
            '&key=' +
            encodeURIComponent(
                streamData.key
            );
    }


    iframe.src =
        playerURL;


    playerModal.style.display =
        'flex';


    document.body.style.overflow =
        'hidden';
}


/* =========================================================
   CLOSE PLAYER
   ========================================================= */

function closePlayer() {

    const playerModal =
        $('player-modal');


    const iframe =
        $('iframePlayer');


    if (playerModal) {

        playerModal.style.display =
            'none';
    }


    if (iframe) {

        iframe.src =
            '';
    }


    document.body.style.overflow =
        '';


    pendingStreamData =
        null;
}


/* =========================================================
   SHARE MODAL
   ========================================================= */

function openShareModal(index) {

    const match =
        matchesData[index];


    if (!match) return;


    const shareURL =
        window.location
            .href
            .split('?')[0] +
        '?match=' +
        index;


    const title =
        match.title ||
        'Live Match';


    const image =
        match.image ||
        match.image_cdn?.APP ||
        '';


    const tournament =
        match.tournament ||
        '';


    closeShareModal();


    const modal =
        document.createElement(
            'div'
        );


    modal.id =
        'custom-share-modal';


    modal.className =
        'custom-share-modal';


    modal.innerHTML = `

        <div class="share-box">

            <button
                class="share-close"
                onclick="closeShareModal()">
                ✕
            </button>


            <div class="share-preview">

                ${
                    image
                        ? `
                            <img
                                src="${escapeHTML(image)}"
                                alt=""
                                onerror="this.style.display='none'"
                            >
                          `
                        : `
                            <div class="share-preview-placeholder">
                                🏏
                            </div>
                          `
                }

            </div>


            <div class="share-header">

                <span>
                    SHARE MATCH
                </span>

                <h3>
                    ${escapeHTML(title)}
                </h3>

                ${
                    tournament
                        ? `
                            <p>
                                ${escapeHTML(
                                    tournament
                                )}
                            </p>
                          `
                        : ''
                }

            </div>


            <div class="share-link-box">

                <input
                    id="share-url-input"
                    type="text"
                    value="${escapeHTML(shareURL)}"
                    readonly
                >

                <button
                    class="copy-btn"
                    onclick="copyShareUrl()">

                    Copy

                </button>

            </div>


            <div class="share-options">

                <a
                    href="https://wa.me/?text=${encodeURIComponent(
                        title +
                        '\n' +
                        shareURL
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="share-option">

                    <span>🟢</span>
                    WhatsApp

                </a>


                <a
                    href="https://t.me/share/url?url=${encodeURIComponent(
                        shareURL
                    )}&text=${encodeURIComponent(
                        title
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="share-option">

                    <span>🔵</span>
                    Telegram

                </a>


                <a
                    href="https://twitter.com/intent/tweet?url=${encodeURIComponent(
                        shareURL
                    )}&text=${encodeURIComponent(
                        title
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="share-option">

                    <span>𝕏</span>
                    Twitter

                </a>


                <a
                    href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                        shareURL
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="share-option">

                    <span>🔵</span>
                    Facebook

                </a>

            </div>


            <button
                class="share-native-btn"
                onclick="
                    nativeShare(
                        '${shareURL.replace(/'/g, "\\'")}',
                        '${title.replace(/'/g, "\\'")}'
                    )
                ">

                ↗ More Sharing Options

            </button>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    requestAnimationFrame(() => {

        modal.classList.add(
            'active'
        );
    });


    modal.addEventListener(
        'click',
        event => {

            if (
                event.target ===
                modal
            ) {

                closeShareModal();
            }
        }
    );
}


/* =========================================================
   CLOSE SHARE
   ========================================================= */

function closeShareModal() {

    const modal =
        $('custom-share-modal');


    if (!modal) return;


    modal.classList.remove(
        'active'
    );


    setTimeout(
        () => {

            if (modal) {
                modal.remove();
            }

        },
        250
    );
}


/* =========================================================
   COPY SHARE URL
   ========================================================= */

function copyShareUrl() {

    const input =
        $('share-url-input');


    if (!input) return;


    if (
        navigator.clipboard &&
        window.isSecureContext
    ) {

        navigator.clipboard
            .writeText(
                input.value
            )
            .then(() => {

                showToast(
                    '✓ Link copied!'
                );

            })
            .catch(() => {

                fallbackCopy(
                    input
                );
            });

    } else {

        fallbackCopy(
            input
        );
    }
}


function fallbackCopy(input) {

    input.select();

    input.setSelectionRange(
        0,
        99999
    );


    try {

        document.execCommand(
            'copy'
        );

        showToast(
            '✓ Link copied!'
        );

    } catch {

        alert(
            'Copy the link manually.'
        );
    }
}


/* =========================================================
   NATIVE SHARE
   ========================================================= */

function nativeShare(
    url,
    title
) {

    if (
        navigator.share
    ) {

        navigator.share({
            title,
            text:
                'Check out this live match!',
            url
        })
        .catch(() => {});

    } else {

        copyShareUrl();
    }
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    message
) {

    const oldToast =
        document.querySelector(
            '.criczone-toast'
        );


    if (oldToast) {
        oldToast.remove();
    }


    const toast =
        document.createElement(
            'div'
        );


    toast.className =
        'criczone-toast';


    toast.textContent =
        message;


    document.body.appendChild(
        toast
    );


    setTimeout(() => {

        toast.classList.add(
            'show'
        );

    }, 20);


    setTimeout(() => {

        toast.classList.remove(
            'show'
        );


        setTimeout(() => {

            toast.remove();

        }, 300);

    }, 2200);
}


/* =========================================================
   REFRESH
   ========================================================= */

function refreshMatches() {

    const button =
        $('refresh-btn');


    if (button) {

        button.classList.add(
            'rotating'
        );
    }


    fetchLatestMatches()
        .finally(() => {

            if (button) {

                setTimeout(
                    () => {

                        button.classList.remove(
                            'rotating'
                        );

                    },
                    500
                );
            }
        });
}


/* =========================================================
   STATS
   ========================================================= */

function updateStats() {

    const total =
        matchesData.length;


    const live =
        matchesData.filter(
            match =>
                String(
                    match.status || ''
                ).toUpperCase() ===
                'LIVE'
        ).length;


    const sports =
        new Set(
            matchesData
                .map(
                    match =>
                        String(
                            match.category ||
                            ''
                        ).trim()
                )
                .filter(Boolean)
        ).size;


    if ($('totalCount')) {

        $('totalCount').textContent =
            total;
    }


    if ($('liveCount')) {

        $('liveCount').textContent =
            live;
    }


    if ($('sportCount')) {

        $('sportCount').textContent =
            sports;
    }
}


/* =========================================================
   MODAL BACKDROP
   ========================================================= */

document.addEventListener(
    'click',
    event => {

        const telegram =
            $('telegram-modal');


        if (
            telegram &&
            event.target ===
                telegram
        ) {

            closeTelegramModal();
        }
    }
);


/* =========================================================
   ESC KEY
   ========================================================= */

document.addEventListener(
    'keydown',
    event => {

        if (
            event.key ===
            'Escape'
        ) {

            closeTelegramModal();

            closeShareModal();
        }
    }
);


/* =========================================================
   BROWSER BACK / FORWARD
   ========================================================= */

window.addEventListener(
    'popstate',
    () => {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const index =
            params.get('match');


        if (
            index !== null &&
            !Number.isNaN(
                Number(index)
            ) &&
            matchesData[
                Number(index)
            ]
        ) {

            showDetails(
                Number(index)
            );

        } else {

            const home =
                $('home-view');

            const detail =
                $('detail-view');


            if (home) {
                home.style.display =
                    'block';
            }


            if (detail) {
                detail.style.display =
                    'none';
            }
        }
    }
);


/* =========================================================
   INITIAL LOAD
   ========================================================= */

fetchLatestMatches()
    .then(() => {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const matchIndex =
            params.get('match');


        if (
            matchIndex !== null &&
            !Number.isNaN(
                Number(matchIndex)
            ) &&
            matchesData[
                Number(matchIndex)
            ]
        ) {

            setTimeout(
                () => {

                    showDetails(
                        Number(matchIndex)
                    );

                },
                300
            );
        }
    });


/* =========================================================
   AUTO REFRESH
   ========================================================= */

setInterval(
    fetchLatestMatches,
    120000
);


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.fetchLatestMatches =
    fetchLatestMatches;

window.filterCategory =
    filterCategory;

window.setupCategories =
    setupCategories;

window.renderMatches =
    renderMatches;

window.showDetails =
    showDetails;

window.showHome =
    showHome;

window.scrollToMatches =
    scrollToMatches;

window.triggerStreamFlow =
    triggerStreamFlow;

window.closeTelegramModal =
    closeTelegramModal;

window.startSelectedStream =
    startSelectedStream;

window.closePlayer =
    closePlayer;

window.openShareModal =
    openShareModal;

window.closeShareModal =
    closeShareModal;

window.copyShareUrl =
    copyShareUrl;

window.nativeShare =
    nativeShare;

window.refreshMatches =
    refreshMatches;


console.log(
    '✅ CRICZONE LIVE — Script loaded successfully!'
);
