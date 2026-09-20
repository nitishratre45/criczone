let matchesData = [];
let currentCategory = 'ALL';
let pendingStreamData = null;

window.PRIMARY_URL = "https://raw.githubusercontent.com/kajju027/Fancode-Events-Json/main/fancode.json";

// ========== DATE PARSER ==========
function parseCustomDate(s) {
    if (!s) return 0;
    const m = s.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)\s*(\d{2})-(\d{2})-(\d{4})$/i);
    if (!m) return Date.parse(s) || 0;
    let h = +m[1];
    const ampm = m[4].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return new Date(+m[7], +m[6] - 1, +m[5], h, +m[2], +m[3]).getTime();
}

function getDatePart(s) {
    const t = parseCustomDate(s);
    if (!t) return 0;
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

// ========== FETCH ==========
async function fetchLatestMatches() {
    const loader = document.getElementById('loader');
    if (loader) { loader.style.display = 'block'; loader.innerText = 'Fetching Latest Updated Streams...'; }

    try {
        const res = await fetch(window.PRIMARY_URL + '?t=' + Date.now());
        const data = await res.json();
        matchesData = data.matches || [];
        console.log(`✅ Loaded ${matchesData.length} matches`);
        if (loader) loader.style.display = 'none';
        setupCategories();
        renderMatches();
    } catch (e) {
        console.error('❌ Fetch error:', e);
        if (loader) loader.innerText = '⚠️ Error loading data. Please refresh.';
    }
}

// ========== CATEGORIES ==========
function setupCategories() {
    const cats = [...new Set(matchesData.map(m => m.category?.trim()).filter(Boolean))].sort();
    const container = document.getElementById('category-container');
    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'flex';
    ['ALL', ...cats].forEach(c => {
        const b = document.createElement('button');
        b.className = `cat-btn ${c === currentCategory ? 'active' : ''}`;
        b.innerText = c;
        b.onclick = () => { currentCategory = c; showHome(); setupCategories(); renderMatches(); };
        container.appendChild(b);
    });
}

// ========== RENDER MATCHES ==========
function renderMatches() {
    const homeView = document.getElementById('home-view');
    if (!homeView) return;
    homeView.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const filtered = matchesData
        .filter(m => currentCategory === 'ALL' || m.category?.trim().toLowerCase() === currentCategory.toLowerCase())
        .sort((a, b) => {
            const dA = getDatePart(a.startTime), dB = getDatePart(b.startTime);
            const isTodayA = dA === todayTime, isTodayB = dB === todayTime;
            if (isTodayA && !isTodayB) return -1;
            if (!isTodayA && isTodayB) return 1;
            if (dA !== dB) return dA - dB;
            return parseCustomDate(a.startTime) - parseCustomDate(b.startTime);
        });

    if (!filtered.length) {
        homeView.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#64748b;padding:4rem 1rem;">⚡ No matches found.</div>`;
        return;
    }

    filtered.forEach(match => {
        const idx = matchesData.indexOf(match);
        const isLive = match.status === 'LIVE';
        const imgUrl = match.image || match.image_cdn?.APP || '';
        const isToday = getDatePart(match.startTime) === todayTime;

        const card = document.createElement('div');
        card.className = 'match-card';
        card.onclick = () => showDetails(idx);
        card.innerHTML = `
            <div class="card-thumb-wrap">
                <span class="status-badge ${isLive ? 'badge-live' : 'badge-upcoming'}">${match.status || 'UPCOMING'}</span>
                ${isToday ? '<span class="today-badge-card">TODAY</span>' : ''}
                <img class="card-img" src="${imgUrl}" alt="${match.title}" onerror="this.src='https://via.placeholder.com/300x160/1e293b/64748b?text=No+Image'">
                <button class="share-btn-3dot" onclick="openShareModal(${idx});event.stopPropagation();" title="Share">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                </button>
            </div>
            <div class="card-body">
                <div class="card-category">${match.category || 'Uncategorized'}</div>
                <div class="card-title">${match.title || 'Untitled'}</div>
                <div class="card-tournament">${match.tournament || ''}</div>
                <div class="card-time">🕒 ${match.startTime || 'TBD'}</div>
            </div>`;
        homeView.appendChild(card);
    });
}

// ========== SHARE MODAL ==========
function openShareModal(idx) {
    const match = matchesData[idx];
    if (!match) return;

    const shareUrl = window.location.href.split('?')[0] + '?match=' + idx;
    const title = match.title || 'Live Match';
    const img = match.image || match.image_cdn?.APP || '';
    const tournament = match.tournament || '';

    document.getElementById('custom-share-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'custom-share-modal';
    modal.className = 'custom-share-modal';
    modal.innerHTML = `
        <div class="share-box">
            <div class="share-drag-handle"></div>
            <button class="share-close" onclick="closeShareModal()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
            <div class="share-header">
                <div class="share-match-preview">
                    <img src="${img}" alt="${title}" onerror="this.src='https://via.placeholder.com/80x80/1e293b/64748b?text=Live'">
                    <div class="share-match-glow"></div>
                </div>
                <h3 class="share-title">Share This Match</h3>
                <p class="share-match-name">${title}</p>
                ${tournament ? `<p class="share-match-tournament">${tournament}</p>` : ''}
            </div>
            <div class="share-link-section">
                <div class="share-link-box">
                    <svg class="link-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    <input type="text" id="share-url-input" value="${shareUrl}" readonly>
                    <button class="copy-btn" onclick="copyShareUrl()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        <span>Copy</span>
                    </button>
                </div>
            </div>
            <div class="share-divider"><span>Share via</span></div>
            <div class="share-options">
                <a href="https://wa.me/?text=${encodeURIComponent(title + '\n' + shareUrl)}" target="_blank" class="share-option whatsapp">
                    <div class="share-option-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg></div>
                    <span>WhatsApp</span>
                </a>
                <a href="https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}" target="_blank" class="share-option telegram">
                    <div class="share-option-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></div>
                    <span>Telegram</span>
                </a>
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}" target="_blank" class="share-option twitter">
                    <div class="share-option-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></div>
                    <span>Twitter</span>
                </a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" class="share-option facebook">
                    <div class="share-option-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></div>
                    <span>Facebook</span>
                </a>
            </div>
            <button class="share-native-btn" onclick="nativeShare('${shareUrl}','${title.replace(/'/g, "\\'")}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                <span>More Sharing Options</span>
            </button>
        </div>`;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
    modal.addEventListener('click', e => { if (e.target === modal) closeShareModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeShareModal(); }, { once: true });
}

function closeShareModal() {
    const modal = document.getElementById('custom-share-modal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 250);
}

function copyShareUrl() {
    const input = document.getElementById('share-url-input');
    if (!input) return;
    navigator.clipboard.writeText(input.value).then(() => {
        const btn = document.querySelector('.copy-btn span');
        if (btn) { btn.innerText = '✓ Copied'; setTimeout(() => btn.innerText = 'Copy', 2000); }
    }).catch(() => { input.select(); document.execCommand('copy'); alert('✅ Link copied!'); });
}

function nativeShare(url, title) {
    navigator.share
        ? navigator.share({ title, text: 'Check out this live match!', url }).catch(() => {})
        : copyShareUrl();
}

// ========== EXTRACT STREAMS (LANGUAGE-WISE) ==========
function extractStreams(match) {
    const languages = {};
    let drmKey = match.STREAMING_CDN?.drm?.clearkey || match.drm?.clearkey || "";

    if (match.auto_streams && !Array.isArray(match.auto_streams)) {
        Object.keys(match.auto_streams).forEach(lang => {
            const streams = match.auto_streams[lang]?.streams;
            if (streams && Object.keys(streams).some(k => /^\d+p$/.test(k))) {
                languages[lang.toUpperCase()] = streams;
            }
        });
    }

    if (Array.isArray(match.auto_streams) && match.auto_streams[0]?.auto) {
        const parsed = parseM3u8Qualities(match.auto_streams[0].auto);
        if (Object.keys(parsed).length) languages['DEFAULT'] = parsed;
    }

    if (!Object.keys(languages).length && match.streams?.primary) {
        languages['DEFAULT'] = { '1080p': match.streams.primary };
    }

    console.log('🌐 Languages:', Object.keys(languages));
    return { languages, drmKey };
}

function parseM3u8Qualities(str) {
    if (!str || typeof str !== 'string') return {};
    const map = {};
    const lines = str.split('\n');
    lines.forEach((line, i) => {
        const m = line.match(/RESOLUTION=\d+x(\d+)/);
        if (m && lines[i + 1]?.startsWith('http')) map[m[1] + 'p'] = lines[i + 1].trim();
    });
    return map;
}

// ========== SHOW DETAILS ==========
function showDetails(index) {
    const match = matchesData[index];
    if (!match) return;

    const url = new URL(window.location);
    url.searchParams.set('match', index);
    window.history.pushState({}, '', url);

    document.getElementById('home-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';

    const $ = id => document.getElementById(id);
    if ($('detail-img')) $('detail-img').src = match.image || match.image_cdn?.APP || '';
    if ($('detail-tournament')) $('detail-tournament').innerText = match.tournament || 'Tournament';
    if ($('detail-title')) $('detail-title').innerText = match.title || 'Match';
    if ($('detail-time')) $('detail-time').innerText = `Start Time: ${match.startTime || 'TBD'}`;
    if ($('detail-status')) $('detail-status').innerText = `Status: ${match.status || 'UPCOMING'}`;
    if ($('share-detail-btn')) $('share-detail-btn').onclick = () => openShareModal(index);

    // 🔥 Remove old dynamic sections
    document.querySelectorAll('.language-title, .language-tabs, .quality-section, .quality-title, #quality-grid').forEach(el => el.remove());

    const detailView = document.getElementById('detail-view');
    const { languages, drmKey } = extractStreams(match);
    const langKeys = Object.keys(languages);

    if (!langKeys.length) {
        const p = document.createElement('p');
        p.style.cssText = 'color:#64748b;text-align:center;padding:20px;';
        p.innerText = '🚫 Stream unavailable';
        detailView.appendChild(p);
        return;
    }

    // Sort: HINDI priority
    const priority = ['HINDI', 'ENGLISH', 'PUNJABI', 'TAMIL', 'TELUGU', 'BHOJPURI', 'MALAYALAM', 'KANNADA', 'BENGALI', 'MARATHI'];
    langKeys.sort((a, b) => {
        const ai = priority.indexOf(a), bi = priority.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.localeCompare(b);
    });

    // Language title
    const langTitle = document.createElement('div');
    langTitle.className = 'language-title';
    langTitle.innerText = '🌐 Select Language';
    detailView.appendChild(langTitle);

    // Language tabs
    const langTabs = document.createElement('div');
    langTabs.className = 'language-tabs';
    detailView.appendChild(langTabs);

    // Quality section
    const qSection = document.createElement('div');
    qSection.className = 'quality-section';
    qSection.innerHTML = `
        <div class="quality-title">🎬 Select Quality</div>
        <div class="quality-grid" id="quality-grid"></div>`;
    detailView.appendChild(qSection);

    const qGrid = qSection.querySelector('#quality-grid');
    let activeLang = langKeys[0];

    langKeys.forEach(lang => {
        const btn = document.createElement('button');
        btn.className = `lang-btn ${lang === activeLang ? 'active' : ''}`;
        btn.innerText = lang;
        btn.onclick = () => {
            langTabs.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeLang = lang;
            renderQualities(languages[lang], drmKey, qGrid);
        };
        langTabs.appendChild(btn);
    });

    renderQualities(languages[activeLang], drmKey, qGrid);
}

function renderQualities(streams, drmKey, grid) {
    grid.innerHTML = '';
    const q = Object.keys(streams).filter(k => /^\d+p$/.test(k));
    if (!q.length) {
        grid.innerHTML = '<p style="color:#64748b;text-align:center;padding:20px;">🚫 No streams</p>';
        return;
    }
    q.sort((a, b) => parseInt(b) - parseInt(a)).forEach(quality => {
        const btn = document.createElement('button');
        btn.className = 'quality-btn';
        btn.innerText = `▶ PLAY ${quality.toUpperCase()}`;
        btn.onclick = () => triggerStreamFlow(streams[quality], drmKey);
        grid.appendChild(btn);
    });
}

// ========== NAVIGATION ==========
function showHome() {
    document.getElementById('home-view').style.display = 'grid';
    document.getElementById('detail-view').style.display = 'none';
    const url = new URL(window.location);
    url.searchParams.delete('match');
    window.history.pushState({}, '', url);
}

// ========== STREAM FLOW ==========
function triggerStreamFlow(url, key = "") {
    if (!url) return alert('Stream URL not available.');
    pendingStreamData = { url, key };
    document.getElementById('telegram-modal')?.classList.add('active');
}

function startSelectedStream() {
    if (!pendingStreamData?.url) return alert('No stream selected.');
    document.getElementById('telegram-modal')?.classList.remove('active');

    const iframe = document.getElementById('iframePlayer');
    if (!iframe) return;

    let playerUrl = "https://chaudhary-player.netlify.app/?famcode=" + encodeURIComponent(pendingStreamData.url);
    if (pendingStreamData.key) playerUrl += "&key=" + encodeURIComponent(pendingStreamData.key);
    iframe.src = playerUrl;

    const pm = document.getElementById('player-modal');
    if (pm) { pm.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}

function closePlayer() {
    const pm = document.getElementById('player-modal');
    if (pm) pm.style.display = 'none';
    document.body.style.overflow = 'auto';
    const iframe = document.getElementById('iframePlayer');
    if (iframe) iframe.src = '';
    pendingStreamData = null;
}

// ========== INIT ==========
fetchLatestMatches().then(() => {
    const p = new URLSearchParams(location.search).get('match');
    if (p !== null && !isNaN(p) && matchesData[+p]) setTimeout(() => showDetails(+p), 500);
});

setInterval(fetchLatestMatches, 120000);
console.log('✅ Script loaded successfully!');