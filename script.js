let matchesData = [];
let currentCategory = 'ALL';
let pendingStreamData = null;
let shakaPlayer = null;
window.currentDetailIndex = null;

window.PRIMARY_URL = "https://raw.githubusercontent.com/kajju027/Fancode-Events-Json/main/fancode.json";

/* ---------- helpers ---------- */
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[c]));
}

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

function imageFor(match) {
    return match?.image || match?.image_cdn?.APP || '';
}

function todayTime() {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d.getTime();
}

function formatShortTime(s) {
    if (!s) return 'TBD';
    const m = s.match(/^(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM))/i);
    return m ? m[1] : s;
}

/* ---------- data ---------- */
async function fetchLatestMatches() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'grid';

    try {
        const res = await fetch(window.PRIMARY_URL + '?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        matchesData = Array.isArray(data.matches) ? data.matches : [];
        if (loader) loader.style.display = 'none';
        setupBrand();
        renderHome();
    } catch (e) {
        console.error('Fetch error:', e);
        if (loader) {
            loader.style.display = 'grid';
            loader.textContent = 'Unable to load match data. Refresh and try again.';
        }
    }
}

function sortedMatches(list = matchesData) {
    const tt = todayTime();
    return [...list].sort((a,b) => {
        const da = getDatePart(a.startTime), db = getDatePart(b.startTime);
        const ta = da === tt, tb = db === tt;
        if (ta && !tb) return -1;
        if (!ta && tb) return 1;
        if (da !== db) return da - db;
        return parseCustomDate(a.startTime) - parseCustomDate(b.startTime);
    });
}

function getCategories() {
    return [...new Set(matchesData.map(m => String(m.category || '').trim()).filter(Boolean))]
        .sort((a,b) => a.localeCompare(b));
}

function categoryMatches(cat) {
    return sortedMatches(matchesData.filter(m =>
        cat === 'ALL' || String(m.category || '').trim().toLowerCase() === cat.toLowerCase()
    ));
}

function setupBrand() {
    const brandImage = document.getElementById('brandImage');
    const first = sortedMatches()[0];
    if (!brandImage || !first) return;
    const src = imageFor(first);
    if (!src) return;
    brandImage.src = src;
    brandImage.style.display = 'block';
    brandImage.nextElementSibling.style.display = 'none';
}

/* ---------- home rendering ---------- */
function renderHome() {
    const home = document.getElementById('home-view');
    if (!home) return;

    const all = sortedMatches();
    if (!all.length) {
        home.innerHTML = '<div class="empty-state">No matches available right now.</div>';
        return;
    }

    const hero = all[0];
    const live = all.filter(m => String(m.status || '').toUpperCase() === 'LIVE');
    const liveRail = live.length ? live : all.slice(0, 8);
    const cats = getCategories();

    home.innerHTML = `
        ${renderHero(hero)}
        <section class="section" id="live-section">
            <div class="section-head">
                <div>
                    <div class="section-kicker">01 / LIVE SIGNAL</div>
                    <h2 class="section-title">${live.length ? 'Live now' : 'Up next'}</h2>
                </div>
                <button class="section-link" onclick="showAllMatches()">VIEW ALL →</button>
            </div>
            <div class="match-rail">
                ${liveRail.map(renderRailCard).join('')}
            </div>
        </section>

        <section class="section" id="discover-section">
            <div class="section-head">
                <div>
                    <div class="section-kicker">02 / DISCOVER</div>
                    <h2 class="section-title">Pick your world</h2>
                </div>
                <span class="section-link">EXPLORE →</span>
            </div>
            <div class="category-list">
                ${cats.map((cat,i) => renderCategoryCard(cat,i)).join('')}
            </div>
        </section>

        <section class="section" id="schedule-section">
            <div class="section-head">
                <div>
                    <div class="section-kicker">03 / SCHEDULE</div>
                    <h2 class="section-title">Coming up</h2>
                </div>
            </div>
            <div class="match-rail">
                ${all.slice(0, 10).map(renderRailCard).join('')}
            </div>
        </section>
    `;

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-nav="home"]')?.classList.add('active');
}

function renderHero(match) {
    const live = String(match.status || '').toUpperCase() === 'LIVE';
    const img = imageFor(match);
    const safeTitle = escapeHtml(match.title || 'Live Match');
    const idx = matchesData.indexOf(match);
    return `
        <section class="hero">
            <img class="hero-image" src="${escapeHtml(img)}" alt="${safeTitle}"
                 onerror="this.style.display='none'">
            <div class="hero-copy">
                <div class="eyebrow">${live ? '<span class="live-pulse"><i></i> LIVE NOW</span>' : 'UP NEXT'}</div>
                <h1 class="hero-title">${safeTitle}</h1>
                <div class="hero-meta">
                    <span>${escapeHtml(match.tournament || 'Live event')}</span>
                    <span>•</span>
                    <span>${escapeHtml(match.startTime || 'TBD')}</span>
                </div>
                <div class="hero-teams">
                    ${escapeHtml(match.title || '')}
                </div>
                <div class="hero-actions">
                    <button class="watch-btn" onclick="showDetails(${idx})">WATCH ↗</button>
                    <button class="ghost-btn" onclick="showDetails(${idx})">MATCH DETAILS</button>
                </div>
            </div>
        </section>
    `;
}

function renderRailCard(match) {
    const idx = matchesData.indexOf(match);
    const img = imageFor(match);
    const live = String(match.status || '').toUpperCase() === 'LIVE';
    return `
        <article class="rail-card" onclick="showDetails(${idx})">
            <div class="rail-image">
                <img src="${escapeHtml(img)}" alt="${escapeHtml(match.title || '')}" onerror="this.style.opacity='.25'">
                <span class="rail-status ${live ? 'live' : ''}">${escapeHtml(match.status || 'UPCOMING')}</span>
                <span class="rail-time">${escapeHtml(formatShortTime(match.startTime))}</span>
            </div>
            <div class="rail-info">
                <div class="rail-tournament">${escapeHtml(match.tournament || match.category || '')}</div>
                <div class="rail-title">${escapeHtml(match.title || 'Untitled')}</div>
            </div>
        </article>
    `;
}

function renderCategoryCard(cat, i) {
    const list = categoryMatches(cat);
    const first = list[0];
    const img = imageFor(first);
    return `
        <article class="category-card" onclick="setCategoryAndShow('${escapeHtml(cat).replace(/'/g, "\\'")}')">
            <div class="category-copy">
                <div class="category-number">${String(i+1).padStart(2,'0')} / CATEGORY</div>
                <div class="category-name">${escapeHtml(cat)}</div>
                <div class="category-count">${list.length} ACTIVE MATCH${list.length === 1 ? '' : 'ES'}</div>
            </div>
            <div class="category-image">
                <img src="${escapeHtml(img)}" alt="" onerror="this.style.opacity='.25'">
            </div>
        </article>
    `;
}

/* ---------- category / nav ---------- */
function filterCategory(category) {
    currentCategory = category || 'ALL';
    renderFilteredHome();
}

function setCategoryAndShow(category) {
    currentCategory = category;
    renderFilteredHome();
    window.scrollTo({top:0, behavior:'smooth'});
}

function renderFilteredHome() {
    const home = document.getElementById('home-view');
    const list = categoryMatches(currentCategory);

    if (!list.length) {
        home.innerHTML = '<div class="empty-state">No matches found in this category.</div>';
        return;
    }

    home.innerHTML = `
        <section class="section" style="padding-top:32px;">
            <div class="section-head">
                <div>
                    <div class="section-kicker">CATEGORY / ${escapeHtml(currentCategory)}</div>
                    <h2 class="section-title">${escapeHtml(currentCategory)}</h2>
                </div>
                <button class="section-link" onclick="showHome()">HOME →</button>
            </div>
            <div class="match-rail" style="flex-wrap:wrap;overflow:visible;">
                ${list.map(renderRailCard).join('')}
            </div>
        </section>
    `;
}

function showAllMatches() {
    currentCategory = 'ALL';
    renderFilteredHome();
    window.scrollTo({top:0,behavior:'smooth'});
}

function goToLive() {
    showHome();
    setTimeout(() => document.getElementById('live-section')?.scrollIntoView({behavior:'smooth'}), 30);
}
function goToDiscover() {
    showHome();
    setTimeout(() => document.getElementById('discover-section')?.scrollIntoView({behavior:'smooth'}), 30);
}
function goToSchedule() {
    showHome();
    setTimeout(() => document.getElementById('schedule-section')?.scrollIntoView({behavior:'smooth'}), 30);
}

/* ---------- detail ---------- */
function showDetails(index) {
    const match = matchesData[index];
    if (!match) return;

    window.currentDetailIndex = index;
    const url = new URL(window.location);
    url.searchParams.set('match', index);
    history.pushState({}, '', url);

    document.getElementById('home-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';

    const img = document.getElementById('detail-img');
    img.src = imageFor(match);
    document.getElementById('detail-tournament').textContent = match.tournament || match.category || 'LIVE EVENT';
    document.getElementById('detail-title').textContent = match.title || 'Match';
    document.getElementById('detail-time').textContent = match.startTime || 'TBD';
    document.getElementById('detail-status').textContent = match.status || 'UPCOMING';
    document.getElementById('share-detail-btn').onclick = () => openShareModal(index);

    const content = document.getElementById('dynamic-stream-content');
    content.innerHTML = '';
    document.querySelectorAll('.language-title,.language-tabs,.quality-section').forEach(el => el.remove());

    const { languages, drmKey } = extractStreams(match);
    const langKeys = Object.keys(languages);

    if (!langKeys.length) {
        content.innerHTML = '<div class="empty-state">Stream unavailable for this event.</div>';
        window.scrollTo({top:0,behavior:'smooth'});
        return;
    }

    const priority = ['HINDI','ENGLISH','PUNJABI','TAMIL','TELUGU','BHOJPURI','MALAYALAM','KANNADA','BENGALI','MARATHI'];
    langKeys.sort((a,b) => {
        const ai=priority.indexOf(a), bi=priority.indexOf(b);
        if(ai!==-1&&bi!==-1)return ai-bi;
        if(ai!==-1)return -1;
        if(bi!==-1)return 1;
        return a.localeCompare(b);
    });

    const langTitle = document.createElement('div');
    langTitle.className = 'language-title';
    langTitle.textContent = 'Select language';
    content.appendChild(langTitle);

    const tabs = document.createElement('div');
    tabs.className = 'language-tabs';
    content.appendChild(tabs);

    const qSection = document.createElement('div');
    qSection.className = 'quality-section';
    qSection.innerHTML = '<div class="quality-title">Select quality</div><div class="quality-grid" id="quality-grid"></div>';
    content.appendChild(qSection);

    const grid = qSection.querySelector('#quality-grid');
    let activeLang = langKeys[0];

    langKeys.forEach(lang => {
        const b = document.createElement('button');
        b.className = 'lang-btn' + (lang === activeLang ? ' active' : '');
        b.textContent = lang;
        b.onclick = () => {
            tabs.querySelectorAll('.lang-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            activeLang = lang;
            renderQualities(languages[lang], drmKey, grid, match);
        };
        tabs.appendChild(b);
    });

    renderQualities(languages[activeLang], drmKey, grid, match);
    window.scrollTo({top:0,behavior:'smooth'});
}

function renderQualities(streams, drmKey, grid, match) {
    grid.innerHTML = '';
    const qualities = Object.keys(streams || {}).filter(k => /^\d+p$/i.test(k))
        .sort((a,b)=>parseInt(b)-parseInt(a));

    if (!qualities.length) {
        grid.innerHTML = '<div class="empty-state">No playback quality is available.</div>';
        return;
    }

    qualities.forEach(q => {
        const b = document.createElement('button');
        b.className = 'quality-btn';
        b.textContent = `▶ PLAY ${q.toUpperCase()}`;
        b.onclick = () => triggerStreamFlow(streams[q], drmKey, match?.title || 'Live Stream');
        grid.appendChild(b);
    });
}

function showHome() {
    window.currentDetailIndex = null;
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('home-view').style.display = 'block';
    const url = new URL(window.location);
    url.searchParams.delete('match');
    history.pushState({}, '', url);
    renderHome();
    window.scrollTo({top:0,behavior:'smooth'});
}

/* ---------- stream extraction ---------- */
function extractStreams(match) {
    const languages = {};
    const drmKey = match?.STREAMING_CDN?.drm?.clearkey || match?.drm?.clearkey || "";

    if (match?.auto_streams && !Array.isArray(match.auto_streams)) {
        Object.keys(match.auto_streams).forEach(lang => {
            const streams = match.auto_streams[lang]?.streams;
            if (streams && Object.keys(streams).some(k => /^\d+p$/.test(k))) {
                languages[lang.toUpperCase()] = streams;
            }
        });
    }

    if (Array.isArray(match?.auto_streams) && match.auto_streams[0]?.auto) {
        const parsed = parseM3u8Qualities(match.auto_streams[0].auto);
        if (Object.keys(parsed).length) languages.DEFAULT = parsed;
    }

    if (!Object.keys(languages).length && match?.streams?.primary) {
        languages.DEFAULT = {'1080p': match.streams.primary};
    }

    return {languages, drmKey};
}

function parseM3u8Qualities(str) {
    if (!str || typeof str !== 'string') return {};
    const map = {};
    const lines = str.split(/\r?\n/);
    lines.forEach((line,i)=>{
        const m = line.match(/RESOLUTION=\d+x(\d+)/i);
        if (m && lines[i+1]?.trim().startsWith('http')) map[m[1]+'p'] = lines[i+1].trim();
    });
    return map;
}

/* ---------- sharing ---------- */
function openShareModal(idx) {
    const match = matchesData[idx];
    if (!match) return;

    const shareUrl = window.location.href.split('?')[0] + '?match=' + idx;
    const title = match.title || 'Live Match';
    const text = `${title}\n${shareUrl}`;

    document.getElementById('custom-share-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'custom-share-modal';
    modal.className = 'tg-modal active';
    modal.innerHTML = `
      <div class="tg-box">
        <div class="tg-icon">↗</div>
        <div class="section-kicker">SHARE</div>
        <h3>${escapeHtml(title)}</h3>
        <p>Share this match with your friends.</p>
        <div class="share-link-box" style="display:flex;gap:8px;margin:18px 0;">
          <input id="share-url-input" value="${escapeHtml(shareUrl)}" readonly style="flex:1;min-width:0;background:#050506;border:1px solid var(--line);color:#aaa;border-radius:10px;padding:0 10px;height:42px;">
          <button class="tg-secondary-btn" style="flex:0 0 80px;" onclick="copyShareUrl()">Copy</button>
        </div>
        <div class="tg-actions">
          <a class="tg-secondary-btn" style="display:grid;place-items:center;text-decoration:none;" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(text)}">WhatsApp</a>
          <a class="tg-close-btn" style="display:grid;place-items:center;text-decoration:none;" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}">Telegram</a>
        </div>
        <button class="tg-close-btn" style="width:100%;margin-top:10px;" onclick="document.getElementById('custom-share-modal')?.remove()">Close</button>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function copyShareUrl() {
    const input = document.getElementById('share-url-input');
    if (!input) return;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(input.value).then(()=>alert('Link copied!')).catch(()=>fallbackCopy(input));
    } else fallbackCopy(input);
}
function fallbackCopy(input) {
    input.select();
    document.execCommand('copy');
    alert('Link copied!');
}

/* ---------- search ---------- */
function focusSearch() {
    const sheet = document.getElementById('search-sheet');
    sheet.classList.add('active');
    document.getElementById('search-input').focus();
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
    document.querySelector('[data-nav="search"]')?.classList.add('active');
    renderSearchResults('');
}
function closeSearch() {
    document.getElementById('search-sheet').classList.remove('active');
}
function renderSearchResults(query) {
    const box = document.getElementById('search-results');
    const q = String(query||'').trim().toLowerCase();
    const list = sortedMatches().filter(m => {
        const hay = [m.title,m.tournament,m.category,m.status].join(' ').toLowerCase();
        return !q || hay.includes(q);
    }).slice(0,30);

    box.innerHTML = list.map(m => {
        const idx = matchesData.indexOf(m);
        return `<div class="search-result" onclick="closeSearch();showDetails(${idx})">
          <strong>${escapeHtml(m.title || 'Untitled')}</strong>
          <small>${escapeHtml(m.tournament || m.category || '')}</small>
        </div>`;
    }).join('') || '<div class="empty-state" style="padding:25px;">No matches found.</div>';
}

document.getElementById('search-input')?.addEventListener('input', e => renderSearchResults(e.target.value));
document.getElementById('search-btn')?.addEventListener('click', focusSearch);
document.getElementById('theme-btn')?.addEventListener('click', () => {
    document.documentElement.classList.toggle('soft-mode');
});

/* ---------- telegram/stream/player ---------- */
function triggerStreamFlow(url, key = "", title = "Live Stream") {
    if (!url) return alert('Stream URL not available.');
    pendingStreamData = {url, key, title};
    document.getElementById('telegram-modal')?.classList.add('active');
}
function closeTelegramModal() {
    document.getElementById('telegram-modal')?.classList.remove('active');
}

function normalizeClearKey(rawKey) {
    if (!rawKey) return null;
    try {
        const parsed = typeof rawKey === 'string' ? JSON.parse(rawKey) : rawKey;
        if (parsed && typeof parsed === 'object') {
            if (parsed.clearKeys && typeof parsed.clearKeys === 'object') return parsed.clearKeys;
            if (parsed.clearkeys && typeof parsed.clearkeys === 'object') return parsed.clearkeys;
            if (Array.isArray(parsed.keys)) {
                const out = {};
                parsed.keys.forEach(k => {
                    const kid = k.kid || k.keyId;
                    const key = k.k || k.key || k.value;
                    if (kid && key) out[kid] = key;
                });
                return Object.keys(out).length ? out : null;
            }
            const direct = {};
            Object.entries(parsed).forEach(([kid,key]) => {
                if (typeof key === 'string' && typeof kid === 'string') direct[kid] = key;
            });
            return Object.keys(direct).length ? direct : null;
        }
    } catch (_) {}
    if (typeof rawKey === 'string' && rawKey.includes(':')) {
        const [kid,key] = rawKey.split(':',2);
        if (kid && key) return {[kid.trim()]:key.trim()};
    }
    return null;
}

async function startSelectedStream() {
    if (!pendingStreamData?.url) return alert('No stream selected.');

    closeTelegramModal();

    const pm = document.getElementById('player-modal');
    const video = document.getElementById('shakaVideo');
    const loading = document.getElementById('player-loading');
    const errorBox = document.getElementById('player-error');
    const titleBox = document.getElementById('player-title');

    pm.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    loading.style.display = 'flex';
    errorBox.style.display = 'none';
    errorBox.textContent = '';
    titleBox.textContent = pendingStreamData.title || 'Live Stream';

    try {
        if (!window.shaka) throw new Error('Shaka Player library was not loaded.');
        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) throw new Error('Browser is not supported by Shaka Player.');

        if (shakaPlayer) {
            await shakaPlayer.destroy();
            shakaPlayer = null;
        }

        shakaPlayer = new shaka.Player(video);

        shakaPlayer.addEventListener('error', e => {
            console.error('Shaka error:', e.detail);
            loading.style.display = 'none';
            errorBox.style.display = 'block';
            errorBox.textContent = `Playback error ${e.detail?.code || ''}`.trim();
        });

        const clearKeys = normalizeClearKey(pendingStreamData.key);
        if (clearKeys) shakaPlayer.configure({drm:{clearKeys}});

        await shakaPlayer.load(pendingStreamData.url);
        loading.style.display = 'none';
        await video.play().catch(()=>{});
    } catch (err) {
        console.error('Player load failed:', err);
        loading.style.display = 'none';
        errorBox.style.display = 'block';
        errorBox.textContent = 'Unable to play this stream in the browser. The source may require supported CORS/format/access.';
    }
}

async function closePlayer() {
    document.getElementById('player-modal').style.display = 'none';
    document.body.style.overflow = 'auto';

    try {
        if (shakaPlayer) {
            await shakaPlayer.destroy();
            shakaPlayer = null;
        }
    } catch (_) {}

    const video = document.getElementById('shakaVideo');
    if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
    }
    pendingStreamData = null;
}

function toggleFullscreen() {
    const stage = document.querySelector('.player-stage');
    if (!document.fullscreenElement) stage?.requestFullscreen?.();
    else document.exitFullscreen?.();
}

/* ---------- init ---------- */
fetchLatestMatches().then(() => {
    const p = new URLSearchParams(location.search).get('match');
    if (p !== null && !isNaN(p) && matchesData[+p]) setTimeout(()=>showDetails(+p),350);
});

window.addEventListener('popstate', () => {
    const p = new URLSearchParams(location.search).get('match');
    if (p !== null && matchesData[+p]) showDetails(+p);
    else showHome();
});

setInterval(fetchLatestMatches, 120000);
console.log('CRICXCRATE OTT loaded');
