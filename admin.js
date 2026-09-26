const firebaseConfig = { databaseURL: "https://anistreamx-903a3-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const ADMIN_PASSWORD = "Admin@123";

// Login System
function login() {
    if (document.getElementById('adminPassword').value === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('mainLayout').style.display = 'flex';
        loadDashboardData(); loadAnimeList();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

function logout() { sessionStorage.removeItem('adminLoggedIn'); location.reload(); }

window.onload = function() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('mainLayout').style.display = 'flex';
        loadDashboardData(); loadAnimeList();
    }
};

// Tabs
function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).style.display = 'block';
    document.getElementById('tab-' + id).classList.add('active');
}

// AniList API Search
async function searchAniList() {
    const q = document.getElementById('anilistSearch').value.trim();
    if (!q) return alert("Enter anime name");
    const resDiv = document.getElementById('searchResults');
    resDiv.style.display = 'block';
    resDiv.innerHTML = '<p style="padding: 15px; color: #71717a;">Searching AniList...</p>';

    const query = `query ($search: String) { Page(page: 1, perPage: 5) { media(search: $search, type: ANIME, sort: POPULARITY_DESC) { title { romaji english } coverImage { large } bannerImage description averageScore genres } } }`;
    try {
        const res = await fetch('https://graphql.anilist.co', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query, variables: { search: q } })
        });
        const data = await res.json();
        const list = data.data.Page.media;
        resDiv.innerHTML = '';
        list.forEach(a => {
            const title = a.title.english || a.title.romaji;
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `<img src="${a.coverImage.large}"><div class="info"><h4>${title}</h4><p>⭐ ${a.averageScore/10 || 'N/A'}</p></div>`;
            div.onclick = () => fillForm(a);
            resDiv.appendChild(div);
        });
    } catch (e) { resDiv.innerHTML = '<p style="padding: 15px; color: #ef4444;">Error fetching data.</p>'; }
}

function fillForm(a) {
    document.getElementById('title').value = a.title.english || a.title.romaji;
    document.getElementById('poster').value = a.coverImage.large;
    document.getElementById('banner').value = a.bannerImage || '';
    document.getElementById('rating').value = a.averageScore ? (a.averageScore/10).toFixed(1) : '';
    document.getElementById('genres').value = a.genres.join(', ');
    document.getElementById('synopsis').value = a.description ? a.description.replace(/<[^>]*>?/gm, '') : '';
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('anilistSearch').value = '';
}

// Save Anime
function saveAnime() {
    const id = document.getElementById('editId').value || 'anime_' + Date.now();
    const data = {
        title: document.getElementById('title').value,
        type: document.getElementById('type').value,
        poster: document.getElementById('poster').value,
        banner: document.getElementById('banner').value,
        rating: document.getElementById('rating').value,
        genres: document.getElementById('genres').value.split(',').map(g => g.trim()),
        synopsis: document.getElementById('synopsis').value,
        stream_link: document.getElementById('streamLink').value,
        downloads: {
            "1080p": document.getElementById('dl_1080p').value,
            "720p": document.getElementById('dl_720p').value,
            "480p": document.getElementById('dl_480p').value
        }
    };
    db.ref('anime/' + id).set(data).then(() => {
        ['top_ten', 'trending', 'recently_added', 'for_you'].forEach(sec => {
            const ref = db.ref('sections/' + sec);
            ref.once('value', s => {
                let list = s.val() || [];
                const isChecked = document.getElementById('sec_' + sec).checked;
                if (isChecked && !list.includes(id)) list.push(id);
                else if (!isChecked) list = list.filter(i => i !== id);
                ref.set(list);
            });
        });
        alert("Anime saved successfully!");
        clearForm(); loadAnimeList(); showTab('manageAnime');
    });
}

function clearForm() {
    document.getElementById('editId').value = '';
    ['title','poster','banner','rating','genres','synopsis','streamLink','dl_1080p','dl_720p','dl_480p'].forEach(id => document.getElementById(id).value = '');
    ['sec_top_ten','sec_trending','sec_recently_added','sec_for_you'].forEach(id => document.getElementById(id).checked = false);
}

// Load List
function loadAnimeList() {
    db.ref('anime').on('value', snap => {
        const data = snap.val(); const c = document.getElementById('animeList'); c.innerHTML = '';
        if (!data) { c.innerHTML = '<p style="color:#71717a;">No data.</p>'; return; }
        Object.keys(data).forEach(k => {
            const a = data[k];
            c.innerHTML += `
                <div class="admin-card">
                    <img src="${a.poster}">
                    <div class="card-body">
                        <h4>${a.title}</h4>
                        <p>${a.type} • ⭐ ${a.rating}</p>
                        <div class="actions">
                            <button class="btn-edit" onclick="editAnime('${k}')">Edit</button>
                            <button class="btn-delete" onclick="deleteAnime('${k}')">Delete</button>
                        </div>
                    </div>
                </div>`;
        });
    });
}

function editAnime(id) {
    db.ref('anime/' + id).once('value', s => {
        const a = s.val();
        document.getElementById('editId').value = id;
        document.getElementById('title').value = a.title || '';
        document.getElementById('type').value = a.type || 'Series';
        document.getElementById('poster').value = a.poster || '';
        document.getElementById('banner').value = a.banner || '';
        document.getElementById('rating').value = a.rating || '';
        document.getElementById('genres').value = a.genres ? a.genres.join(', ') : '';
        document.getElementById('synopsis').value = a.synopsis || '';
        document.getElementById('streamLink').value = a.stream_link || '';
        document.getElementById('dl_1080p').value = a.downloads ? a.downloads["1080p"] : '';
        document.getElementById('dl_720p').value = a.downloads ? a.downloads["720p"] : '';
        document.getElementById('dl_480p').value = a.downloads ? a.downloads["480p"] : '';
        db.ref('sections').once('value', sec => {
            const sections = sec.val() || {};
            document.getElementById('sec_top_ten').checked = sections.top_ten ? sections.top_ten.includes(id) : false;
            document.getElementById('sec_trending').checked = sections.trending ? sections.trending.includes(id) : false;
            document.getElementById('sec_recently_added').checked = sections.recently_added ? sections.recently_added.includes(id) : false;
            document.getElementById('sec_for_you').checked = sections.for_you ? sections.for_you.includes(id) : false;
        });
        showTab('addAnime');
    });
}

function deleteAnime(id) {
    if (confirm("Delete this anime?")) {
        db.ref('anime/' + id).remove().then(() => {
            ['top_ten', 'trending', 'recently_added', 'for_you'].forEach(sec => {
                const ref = db.ref('sections/' + sec);
                ref.once('value', s => {
                    let list = s.val() || []; list = list.filter(i => i !== id); ref.set(list);
                });
            });
            alert("Deleted!");
        });
    }
}

// Dashboard
function loadDashboardData() {
    db.ref('anime').on('value', s => document.getElementById('totalAnime').innerText = s.val() ? Object.keys(s.val()).length : 0);
    db.ref('analytics/page_views').on('value', s => {
        const v = s.val() || {}; let t = 0; Object.values(v).forEach(x => t += x);
        document.getElementById('totalViews').innerText = t;
    });
    const today = new Date().toISOString().split('T')[0];
    db.ref('analytics/daily_users/' + today).on('value', s => document.getElementById('totalUsers').innerText = s.val() || 0);
}
