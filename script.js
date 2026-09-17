// ================================================================
// ESTADO GLOBAL DA APLICAÇÃO
// ================================================================
const App = {
    allSongs: [],
    
    // Modo Teclado
    filteredTeclado: [],
    currentSongTeclado: null,
    searchTeclado: '',
    activeCatTeclado: 'Todos',
    
    // Modo Púlpito
    filteredPulpito: [],
    currentSongPulpito: null,
    searchPulpito: '',
    activeCatPulpito: 'Todos',
    pulpitoTab: 'todas',
    pulpitoGridVisible: true,
    
    // Configurações e Dados Compartilhados
    currentMode: 'teclado',
    isTwoColumns: true,
    fontSize: 13.5, // Tamanho padrão compacto e confortável (13.5px)
    cultoSetlist: [],
    cultoDrawerOpen: false,
    curadoriaData: {},
    categories: [
        'Louvor',
        'Adoração',
        'Busca do Espírito Santo',
        'Celebração',
        'Oferta',
        'Comunhão',
        'Apelo / Altar',
    ]
};

// ================================================================
// UTILS
// ================================================================
function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
function esc(t) {
    if (!t) return '';
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function sp(k, v) { localStorage.setItem(k, v); }

// ================================================================
// INICIALIZAÇÃO
// ================================================================
document.addEventListener('DOMContentLoaded', async () => {
    loadPrefs();
    await loadCatalog();
    setupSearch();

    const hasChosen = localStorage.getItem('letras_has_mode');
    if (hasChosen) {
        hideOverlay();
        applyMode(App.currentMode);
    } else {
        showOverlay();
    }
});

function loadPrefs() {
    try {
        const c = localStorage.getItem('letras_curadoria_v1');  if (c) App.curadoriaData = JSON.parse(c);
        const s = localStorage.getItem('letras_setlist');        if (s) App.cultoSetlist   = JSON.parse(s);
        const cats = localStorage.getItem('letras_categories');  if (cats) App.categories  = JSON.parse(cats);
        const fs = localStorage.getItem('letras_fontsize');      if (fs) App.fontSize       = parseInt(fs, 10);
        const mode = localStorage.getItem('letras_mode');        if (mode) App.currentMode = mode;
        const cols = localStorage.getItem('letras_columns');     if (cols !== null) App.isTwoColumns = (cols === 'true');
    } catch(e) {
        console.warn('Erro ao carregar preferências:', e);
    }
}

function saveCuradoria() { sp('letras_curadoria_v1', JSON.stringify(App.curadoriaData)); }
function saveSetlist()   { sp('letras_setlist',       JSON.stringify(App.cultoSetlist)); }
function saveCats()      { sp('letras_categories',    JSON.stringify(App.categories));   }

// ================================================================
// CARREGAMENTO DO CATÁLOGO
// ================================================================
async function loadCatalog() {
    let raw = null;
    if (window.SONGS_CATALOG && Array.isArray(window.SONGS_CATALOG)) {
        raw = window.SONGS_CATALOG;
    } else {
        try {
            const r = await fetch('data/catalog.json');
            if (r.ok) raw = await r.json();
        } catch(e) {}
    }
    
    if (!raw || !raw.length) {
        console.error('Catálogo não encontrado.');
        return;
    }

    App.allSongs = raw.map(song => {
        const cur = App.curadoriaData[song.id] || {};
        return {
            ...song,
            type: cur.type || song.type || '',
            key: cur.key !== undefined ? cur.key : (song.key || '')
        };
    });

    updateWelcomeStats();
    renderTecladoChips();
    applyFiltersTeclado();
    applyFiltersPulpito();
    renderSetlistPanel();
}

// ================================================================
// OVERLAY / SELEÇÃO DE MODO
// ================================================================
function showOverlay() { document.getElementById('mode-selection-overlay').classList.remove('hidden'); }
function hideOverlay() { document.getElementById('mode-selection-overlay').classList.add('hidden'); }

function chooseMode(mode) {
    App.currentMode = mode;
    if (mode === 'pulpito') App.isTwoColumns = true;
    sp('letras_mode', mode);
    sp('letras_has_mode', 'true');
    sp('letras_columns', App.isTwoColumns);
    hideOverlay();
    applyMode(mode);
}

function openModeModal() { showOverlay(); }

// ================================================================
// ALTERNAR MODOS (TECLADO / PÚLPITO)
// ================================================================
function applyMode(mode) {
    App.currentMode = mode;
    sp('letras_mode', mode);

    const pill     = document.getElementById('current-mode-pill');
    const pillTxt  = document.getElementById('mode-pill-text');
    const sbTeclado  = document.getElementById('sidebar-teclado');
    const sbPulpito  = document.getElementById('sidebar-pulpito');
    const mainTeclado = document.getElementById('main-teclado');
    const mainPulpito = document.getElementById('main-pulpito');
    const btnCulto    = document.getElementById('btn-open-culto');

    if (mode === 'teclado') {
        pill.className = 'current-mode-pill mode-teclado';
        pillTxt.textContent = '🎹 Modo Teclado';
        sbTeclado.style.display = 'flex';
        sbPulpito.style.display = 'none';
        mainTeclado.style.display = 'flex';
        mainPulpito.style.display = 'none';
        btnCulto.style.display    = 'none';
        renderTecladoChips();
        applyFiltersTeclado();
        renderSetlistPanel();
    } else {
        pill.className = 'current-mode-pill mode-pulpito';
        pillTxt.textContent = '📖 Modo Púlpito';
        sbTeclado.style.display = 'none';
        sbPulpito.style.display = 'flex';
        mainTeclado.style.display = 'none';
        mainPulpito.style.display = 'flex';
        btnCulto.style.display    = 'inline-flex';
        renderSidebarPulpito();
        showPulpitoGrid();
    }

    updateColumnsUI();
    updateFontDisplays();
}

// ================================================================
// MODO TECLADO (ESTILO CIFRACEROS)
// ================================================================

function renderTecladoChips() {
    const container = document.getElementById('teclado-chips-container');
    if (!container) return;
    const allCats = ['Todos', ...App.categories];

    container.innerHTML = allCats.map(cat => {
        const isActive = App.activeCatTeclado === cat;
        return `<button class="chip ${isActive ? 'active' : ''}" onclick="selectCatTeclado('${esc(cat)}')">
            ${esc(cat)}
        </button>`;
    }).join('');
}

function selectCatTeclado(cat) {
    App.activeCatTeclado = cat;
    renderTecladoChips();
    applyFiltersTeclado();
}

function applyFiltersTeclado() {
    const q   = norm(App.searchTeclado);
    const cat = App.activeCatTeclado;

    App.filteredTeclado = App.allSongs.filter(song => {
        if (cat !== 'Todos' && song.type !== cat) return false;
        if (!q) return true;
        if (norm(song.title).includes(q) || norm(song.artist || '').includes(q)) return true;
        if (q.length >= 3 && song.lyrics) return norm(song.lyrics).includes(q);
        return false;
    });

    renderSongListTeclado();
}

// Renderização limpa e elegante idêntica ao CifrasCeros (SEM "PENDENTE")
function renderSongListTeclado() {
    const container = document.getElementById('results-container-teclado');
    if (!container) return;
    const slice = App.filteredTeclado.slice(0, 100);

    if (!slice.length) {
        container.innerHTML = '<div style="padding:24px 10px; text-align:center; color:var(--text-muted); font-size:0.9rem;">Nenhuma música encontrada.</div>';
        return;
    }

    container.innerHTML = slice.map(song => {
        const isActive = App.currentSongTeclado && App.currentSongTeclado.id === song.id;
        const keyTag = song.key ? `<span class="song-transpose-tag">Tom: ${esc(song.key)}</span>` : '';

        return `
            <div class="song-item ${isActive ? 'active' : ''}" onclick="openSongTeclado(${song.id})">
                <div class="song-clickable">
                    <span class="song-title-text">${esc(song.title)}</span>
                    ${keyTag}
                </div>
            </div>
        `;
    }).join('') + (App.filteredTeclado.length > 100
        ? `<div style="text-align:center; padding:10px; font-size:0.75rem; color:var(--text-subtle);">Mostrando 100 de ${App.filteredTeclado.length}</div>` : '');
}

// Abrir música no Modo Teclado (Card CifrasCeros)
function openSongTeclado(id) {
    const song = App.allSongs.find(s => s.id === id);
    if (!song) return;
    App.currentSongTeclado = song;

    renderSongListTeclado();

    const welcome = document.getElementById('welcome-view-teclado');
    const songView = document.getElementById('song-view-teclado');
    welcome.style.display = 'none';
    songView.className = 'active';

    // Título
    document.getElementById('t-sv-title').textContent = song.title;

    // Tom
    const transBadge = document.getElementById('t-transpose-badge');
    if (transBadge) {
        transBadge.textContent = song.key || 'Original';
    }

    // Curadoria discreta
    populateCatSelect('t-cat-select', song.type);

    // Letra
    const content = document.getElementById('sv-content-teclado');
    content.style.fontSize = App.fontSize + 'px';
    content.className = App.isTwoColumns ? 'two-columns' : '';
    content.innerHTML = buildLyricsHtml(song.lyrics);

    // Barra de categorias da música (estilo CifrasCeros)
    renderSongCategoriesChips(song);

    // Sincroniza botão de Setlist
    syncSetlistBtn(song.id);
    renderSetlistPanel();

    document.querySelector('.teclado-center-scroll').scrollTop = 0;
}

// ================================================================
// SETLIST / ORDEM CIFRACEROS (DIREITA)
// ================================================================
function renderSetlistPanel() {
    const container = document.getElementById('setlist-container');
    if (!container) return;

    updateCultoSidebarBadge();

    if (!App.cultoSetlist.length) {
        container.innerHTML = '<div class="empty-setlist-msg">Nenhuma música no setlist.<br>Clique em <strong>＋ Setlist</strong> dentro de uma música.</div>';
        return;
    }

    container.innerHTML = App.cultoSetlist.map((id, i) => {
        const s = App.allSongs.find(x => x.id === id);
        if (!s) return '';
        const isPlaying = App.currentSongTeclado && App.currentSongTeclado.id === id;

        return `
            <div class="setlist-item ${isPlaying ? 'active-play' : ''}" onclick="openSongTeclado(${s.id})">
                <div class="setlist-item-left">
                    <span class="setlist-num">#${i + 1}</span>
                    <span class="setlist-title-txt" title="${esc(s.title)}">${esc(s.title)}</span>
                    ${s.key ? `<span class="setlist-key-tag">${esc(s.key)}</span>` : ''}
                </div>
                <button class="remove-setlist-btn" onclick="event.stopPropagation(); removeCulto(${s.id})" title="Remover">✕</button>
            </div>
        `;
    }).join('');
}

function toggleTecladoSetlist() {
    if (!App.currentSongTeclado) return;
    const id = App.currentSongTeclado.id;
    const idx = App.cultoSetlist.indexOf(id);

    if (idx >= 0) App.cultoSetlist.splice(idx, 1);
    else App.cultoSetlist.push(id);

    saveSetlist();
    syncSetlistBtn(id);
    renderSetlistPanel();
    renderCultoDrawerList();
    renderPulpitoGrid();
}

function syncSetlistBtn(id) {
    const btn = document.getElementById('btn-t-add-setlist');
    if (!btn) return;
    const inSet = App.cultoSetlist.includes(id);
    btn.className = inSet ? 'btn btn-accent' : 'btn';
    btn.innerHTML = inSet ? '⭐ No Setlist' : '＋ Setlist';
}

// ================================================================
// MODO PÚLPITO (WIREFRAME SOLICITADO)
// ================================================================
function renderSidebarPulpito() {
    const container = document.getElementById('pulpito-cat-list');
    if (!container) return;

    const counts = computeCatCounts();
    const allCats = ['Todos', ...App.categories];

    container.innerHTML = allCats.map(cat => {
        const isActive = App.activeCatPulpito === cat;
        return `
            <div class="pulpito-cat-item ${isActive ? 'active' : ''}" onclick="selectCatPulpito('${esc(cat)}')">
                <span>${esc(cat)}</span>
                <span class="pulpito-cat-count">${counts[cat] || 0}</span>
            </div>
        `;
    }).join('');

    updateCultoSidebarBadge();
}

function selectCatPulpito(cat) {
    App.activeCatPulpito = cat;
    showPulpitoGrid(); // Clicar em categoria sempre volta para a grade!
    renderSidebarPulpito();
    applyFiltersPulpito();
}

function setPulpitoTab(tab) {
    App.pulpitoTab = tab;
    document.getElementById('ptab-todas').classList.toggle('active', tab === 'todas');
    document.getElementById('ptab-culto').classList.toggle('active', tab === 'culto');
    showPulpitoGrid();
    applyFiltersPulpito();
}

function applyFiltersPulpito() {
    const q   = norm(App.searchPulpito);
    const cat = App.activeCatPulpito;

    App.filteredPulpito = App.allSongs.filter(song => {
        if (App.pulpitoTab === 'culto' && !App.cultoSetlist.includes(song.id)) return false;
        if (cat !== 'Todos' && song.type !== cat) return false;
        if (!q) return true;
        if (norm(song.title).includes(q) || norm(song.artist || '').includes(q)) return true;
        if (q.length >= 3 && song.lyrics) return norm(song.lyrics).includes(q);
        return false;
    });

    renderPulpitoGrid();
}

function showPulpitoGrid() {
    App.pulpitoGridVisible = true;
    document.getElementById('pulpito-grid-view').style.display = 'flex';
    document.getElementById('viewer-pulpito').className = '';
}

function renderPulpitoGrid() {
    const grid    = document.getElementById('songs-grid-pulpito');
    const ctxTit  = document.getElementById('p-grid-title');
    const ctxCnt  = document.getElementById('p-grid-count');
    if (!grid) return;

    const total = App.filteredPulpito.length;
    if (ctxTit) ctxTit.textContent = App.activeCatPulpito === 'Todos' ? (App.pulpitoTab === 'culto' ? 'Músicas do Culto' : 'Todas as Músicas') : App.activeCatPulpito;
    if (ctxCnt) ctxCnt.textContent = `${total} músicas`;

    if (!total) {
        grid.innerHTML = `<div class="grid-empty-state">${App.pulpitoTab === 'culto' ? 'Nenhuma música no culto ainda.' : 'Nenhuma música encontrada.'}</div>`;
        return;
    }

    const slice = App.filteredPulpito.slice(0, 120);
    grid.innerHTML = slice.map(song => {
        const inCulto = App.cultoSetlist.includes(song.id);
        return `
            <div class="song-card ${inCulto ? 'in-culto' : ''}" onclick="openSongPulpito(${song.id})">
                <div class="song-card-title">${esc(song.title)}</div>
                <div class="song-card-artist">${esc(song.artist || 'Artista desconhecido')}</div>
                <div class="song-card-footer">
                    ${song.key ? `<span class="song-transpose-tag">${esc(song.key)}</span>` : ''}
                    <button class="card-culto-btn ${inCulto ? 'in-culto' : ''}"
                        onclick="event.stopPropagation(); toggleCulto(${song.id})"
                        title="${inCulto ? 'Remover do Culto' : 'Adicionar ao Culto'}">
                        ${inCulto ? '⭐' : '＋'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openSongPulpito(id) {
    const song = App.allSongs.find(s => s.id === id);
    if (!song) return;
    App.currentSongPulpito = song;
    App.pulpitoGridVisible = false;

    document.getElementById('pulpito-grid-view').style.display = 'none';
    const viewer = document.getElementById('viewer-pulpito');
    viewer.className = 'active';

    document.getElementById('p-viewer-title').textContent = song.title;
    document.getElementById('p-viewer-artist').textContent = song.artist || 'Artista não informado';
    
    const kb = document.getElementById('p-viewer-key');
    if (song.key) { kb.textContent = 'Tom: ' + song.key; kb.style.display = 'inline'; }
    else { kb.style.display = 'none'; }

    syncCultoBtn(song.id);

    const lc = document.getElementById('p-lyrics-content');
    lc.style.fontSize = App.fontSize + 'px';
    lc.className = App.isTwoColumns ? 'lyrics-content-pulpito two-columns' : 'lyrics-content-pulpito';
    lc.innerHTML = buildLyricsHtml(song.lyrics);
    document.querySelector('.pulpito-lyrics-scroll').scrollTop = 0;
}

function closePulpitoViewer() {
    showPulpitoGrid();
    renderPulpitoGrid();
}

function toggleCulto(id) {
    const idx = App.cultoSetlist.indexOf(id);
    if (idx >= 0) App.cultoSetlist.splice(idx, 1);
    else App.cultoSetlist.push(id);

    saveSetlist();
    updateCultoSidebarBadge();
    renderPulpitoGrid();
    renderSetlistPanel();
    if (App.currentSongPulpito && App.currentSongPulpito.id === id) syncCultoBtn(id);
    if (App.currentSongTeclado && App.currentSongTeclado.id === id) syncSetlistBtn(id);
    renderCultoDrawerList();
}

function syncCultoBtn(id) {
    const btn = document.getElementById('btn-viewer-culto');
    if (!btn) return;
    const inCulto = App.cultoSetlist.includes(id);
    btn.className = inCulto ? 'btn btn-accent' : 'btn btn-primary';
    btn.innerHTML = inCulto ? '⭐ No Culto (Remover)' : '➕ Adicionar ao Culto';
}

function toggleViewerCulto() {
    if (App.currentSongPulpito) toggleCulto(App.currentSongPulpito.id);
}

function removeCulto(id) {
    const idx = App.cultoSetlist.indexOf(id);
    if (idx >= 0) {
        App.cultoSetlist.splice(idx, 1);
        saveSetlist();
        updateCultoSidebarBadge();
        renderSetlistPanel();
        renderCultoDrawerList();
        renderPulpitoGrid();
        if (App.currentSongTeclado && App.currentSongTeclado.id === id) syncSetlistBtn(id);
        if (App.currentSongPulpito && App.currentSongPulpito.id === id) syncCultoBtn(id);
    }
}

function clearCulto() {
    if (confirm('Limpar todas as músicas do setlist / culto?')) {
        App.cultoSetlist = [];
        saveSetlist();
        updateCultoSidebarBadge();
        renderSetlistPanel();
        renderCultoDrawerList();
        renderPulpitoGrid();
        if (App.currentSongTeclado) syncSetlistBtn(App.currentSongTeclado.id);
        if (App.currentSongPulpito) syncCultoBtn(App.currentSongPulpito.id);
    }
}

function updateCultoSidebarBadge() {
    const n = App.cultoSetlist.length;
    const ids = ['ptab-culto-badge', 'culto-count-badge'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = n;
    });
}

function toggleCultoDrawer() {
    App.cultoDrawerOpen = !App.cultoDrawerOpen;
    document.getElementById('culto-drawer').classList.toggle('open', App.cultoDrawerOpen);
    if (App.cultoDrawerOpen) renderCultoDrawerList();
}

function renderCultoDrawerList() {
    const c = document.getElementById('culto-list-container');
    if (!c) return;
    if (!App.cultoSetlist.length) {
        c.innerHTML = '<div class="grid-empty-state" style="padding:20px;">Nenhuma música no culto.</div>';
        return;
    }
    c.innerHTML = App.cultoSetlist.map((id, i) => {
        const s = App.allSongs.find(x => x.id === id);
        if (!s) return '';
        return `
            <div class="culto-item" onclick="openSongPulpito(${s.id}); toggleCultoDrawer();">
                <span class="culto-item-num">#${i+1}</span>
                <span class="culto-item-title">${esc(s.title)}</span>
                ${s.key ? `<span class="song-transpose-tag">${esc(s.key)}</span>` : ''}
                <button class="btn-remove-culto" onclick="event.stopPropagation(); removeCulto(${s.id})" title="Remover">✕</button>
            </div>
        `;
    }).join('');
}

// ================================================================
// CONTROLE DE TAMANHO DA FONTE E COLUNAS
// ================================================================
function adjustFontSize(delta) {
    App.fontSize = Math.max(11, Math.min(32, App.fontSize + delta));
    sp('letras_fontsize', App.fontSize);
    
    updateFontDisplays();

    // Aplica no conteúdo ativo
    const elTeclado = document.getElementById('sv-content-teclado');
    if (elTeclado) elTeclado.style.fontSize = App.fontSize + 'px';

    const elPulpito = document.getElementById('p-lyrics-content');
    if (elPulpito) elPulpito.style.fontSize = App.fontSize + 'px';
}

function updateFontDisplays() {
    const txt = App.fontSize + 'px';
    const g = document.getElementById('global-font-display');
    const t = document.getElementById('t-font-size-display');
    if (g) g.textContent = txt;
    if (t) t.textContent = txt;
}

function toggleColumns() {
    App.isTwoColumns = !App.isTwoColumns;
    sp('letras_columns', App.isTwoColumns);
    updateColumnsUI();

    const tContent = document.getElementById('sv-content-teclado');
    if (tContent) tContent.className = App.isTwoColumns ? 'two-columns' : '';

    const pContent = document.getElementById('p-lyrics-content');
    if (pContent) pContent.className = App.isTwoColumns ? 'lyrics-content-pulpito two-columns' : 'lyrics-content-pulpito';
}

function updateColumnsUI() {
    const btnHeader = document.getElementById('btn-toggle-columns');
    const btnTeclado = document.getElementById('btn-t-toggle-columns');
    const label = App.isTwoColumns ? '📖 2 Colunas' : '📄 1 Coluna';

    if (btnHeader) btnHeader.textContent = label;
    if (btnTeclado) {
        btnTeclado.textContent = label;
        btnTeclado.classList.toggle('active', App.isTwoColumns);
    }
}

function toggleSidebar() {
    const isTeclado = App.currentMode === 'teclado';
    const sb = document.getElementById(isTeclado ? 'sidebar-teclado' : 'sidebar-pulpito');
    if (sb) sb.classList.toggle('collapsed');
}

// ================================================================
// CURADORIA E CATEGORIAS
// ================================================================
// ================================================================
// GERENCIAMENTO COMPLETO DE CATEGORIAS (ESTILO CIFRACEROS)
// ================================================================

// Renderiza a barra de chips de categoria dentro da música atual (CifrasCeros)
function renderSongCategoriesChips(song) {
    const container = document.getElementById('song-categories-chips');
    if (!container) return;

    const currentCat = song.type || '';

    container.innerHTML = App.categories.map(cat => {
        const isAssigned = (currentCat === cat);
        return `
            <button class="chip-assign ${isAssigned ? 'active' : ''}" onclick="toggleSongCategory('${esc(cat)}')">
                ${isAssigned ? '✓ ' + esc(cat) : '＋ ' + esc(cat)}
            </button>
        `;
    }).join('') + `
        <button class="chip-assign" style="background:rgba(251,191,36,0.1); color:var(--chord-color); border-color:rgba(251,191,36,0.3);" onclick="promptNewCategoryFromViewer()">
            ＋ Nova
        </button>
    `;
}

// Alternar a categoria da música atual com um clique simples
function toggleSongCategory(catName) {
    if (!App.currentSongTeclado) return;
    const song = App.currentSongTeclado;

    // Se já tinha essa categoria, remove (fica sem categoria / Geral)
    if (song.type === catName) {
        song.type = '';
    } else {
        song.type = catName;
    }

    if (!App.curadoriaData[song.id]) App.curadoriaData[song.id] = {};
    App.curadoriaData[song.id].type = song.type;

    saveCuradoria();
    renderSongCategoriesChips(song);
    updateWelcomeStats();
    renderTecladoChips();
    renderSidebarPulpito();
}

// Criar nova categoria a partir do visualizador da música
function promptNewCategoryFromViewer() {
    const name = prompt('Nome da nova categoria:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (App.categories.includes(trimmed)) {
        alert('Esta categoria já existe!');
        return;
    }
    App.categories.push(trimmed);
    saveCats();
    renderTecladoChips();
    renderSidebarPulpito();
    if (App.currentSongTeclado) {
        toggleSongCategory(trimmed);
    }
}

// Criar nova categoria a partir da barra da sidebar
function createCategoryFromInput() {
    const input = document.getElementById('new-cat-input');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;

    if (App.categories.includes(name)) {
        alert('Esta categoria já existe!');
        return;
    }

    App.categories.push(name);
    saveCats();
    input.value = '';

    renderTecladoChips();
    renderSidebarPulpito();
    if (App.currentSongTeclado) {
        renderSongCategoriesChips(App.currentSongTeclado);
    }
}

// Criar nova categoria a partir do modal
function createCategoryFromModal() {
    const input = document.getElementById('modal-new-cat-input');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;

    if (App.categories.includes(name)) {
        alert('Esta categoria já existe!');
        return;
    }

    App.categories.push(name);
    saveCats();
    input.value = '';

    renderCategoryModalList();
    renderTecladoChips();
    renderSidebarPulpito();
    if (App.currentSongTeclado) {
        renderSongCategoriesChips(App.currentSongTeclado);
    }
}

// Modal de Gerenciamento de Categorias
function openCategoryModal() {
    const modal = document.getElementById('modal-categories');
    if (!modal) return;
    renderCategoryModalList();
    modal.classList.add('open');
}

function closeCategoryModal() {
    const modal = document.getElementById('modal-categories');
    if (modal) modal.classList.remove('open');
}

function renderCategoryModalList() {
    const container = document.getElementById('modal-categories-list');
    if (!container) return;

    const counts = computeCatCounts();

    if (!App.categories.length) {
        container.innerHTML = '<div style="padding:14px; text-align:center; color:var(--text-muted); font-size:0.85rem;">Nenhuma categoria criada ainda.</div>';
        return;
    }

    container.innerHTML = App.categories.map(cat => {
        const count = counts[cat] || 0;
        return `
            <div class="modal-cat-item">
                <div>
                    <strong style="font-size:0.9rem; color:#fff;">${esc(cat)}</strong>
                    <span style="font-size:0.75rem; color:var(--text-muted); margin-left:8px;">(${count} músicas)</span>
                </div>
                <div class="modal-cat-actions">
                    <button class="tool-btn" style="height:28px; padding:0 8px; font-size:0.75rem;" onclick="renameCategory('${esc(cat)}')" title="Renomear">✏️</button>
                    <button class="tool-btn" style="height:28px; padding:0 8px; font-size:0.75rem; color:var(--error-color);" onclick="deleteCategory('${esc(cat)}')" title="Excluir">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function renameCategory(oldName) {
    const newName = prompt(`Renomear categoria "${oldName}" para:`, oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const trimmed = newName.trim();

    const idx = App.categories.indexOf(oldName);
    if (idx !== -1) {
        App.categories[idx] = trimmed;
    }

    // Atualiza músicas que usavam o nome antigo
    App.allSongs.forEach(s => {
        if (s.type === oldName) {
            s.type = trimmed;
            if (!App.curadoriaData[s.id]) App.curadoriaData[s.id] = {};
            App.curadoriaData[s.id].type = trimmed;
        }
    });

    if (App.activeCatTeclado === oldName) App.activeCatTeclado = trimmed;
    if (App.activeCatPulpito === oldName) App.activeCatPulpito = trimmed;

    saveCats();
    saveCuradoria();
    renderCategoryModalList();
    renderTecladoChips();
    renderSidebarPulpito();
    applyFiltersTeclado();
    applyFiltersPulpito();
    if (App.currentSongTeclado) renderSongCategoriesChips(App.currentSongTeclado);
}

function deleteCategory(name) {
    const counts = computeCatCounts();
    const count = counts[name] || 0;
    const msg = count > 0
        ? `Excluir a categoria "${name}"? ${count} música(s) ficarão sem categoria.`
        : `Deseja excluir a categoria "${name}"?`;

    if (!confirm(msg)) return;

    App.categories = App.categories.filter(c => c !== name);

    // Limpa categoria das músicas associadas
    App.allSongs.forEach(s => {
        if (s.type === name) {
            s.type = '';
            if (!App.curadoriaData[s.id]) App.curadoriaData[s.id] = {};
            App.curadoriaData[s.id].type = '';
        }
    });

    if (App.activeCatTeclado === name) App.activeCatTeclado = 'Todos';
    if (App.activeCatPulpito === name) App.activeCatPulpito = 'Todos';

    saveCats();
    saveCuradoria();
    renderCategoryModalList();
    renderTecladoChips();
    renderSidebarPulpito();
    applyFiltersTeclado();
    applyFiltersPulpito();
    if (App.currentSongTeclado) renderSongCategoriesChips(App.currentSongTeclado);
}

// Edição rápida de tom ao clicar na badge de tom
function promptEditKey() {
    if (!App.currentSongTeclado) return;
    const current = App.currentSongTeclado.key || '';
    const newKey = prompt('Editar Tom da Música (ex: C, D, E, F, G, A, B, Gm, F#m):', current);
    if (newKey === null) return;
    const trimmed = newKey.trim().toUpperCase();

    App.currentSongTeclado.key = trimmed;
    if (!App.curadoriaData[App.currentSongTeclado.id]) App.curadoriaData[App.currentSongTeclado.id] = {};
    App.curadoriaData[App.currentSongTeclado.id].key = trimmed;

    saveCuradoria();

    const badge = document.getElementById('t-transpose-badge');
    if (badge) badge.textContent = trimmed || 'Original';

    renderSongListTeclado();
    renderSetlistPanel();
    renderPulpitoGrid();
}

function computeCatCounts() {
    const counts = { 'Todos': App.allSongs.length };
    App.categories.forEach(c => counts[c] = 0);
    App.allSongs.forEach(s => {
        if (s.type && counts[s.type] !== undefined) counts[s.type]++;
    });
    return counts;
}

function updateWelcomeStats() {
    let curated = 0;
    App.allSongs.forEach(s => {
        if (s.type && s.type !== 'Geral') curated++;
    });
    const elTotal = document.getElementById('stat-total-songs');
    const elCur = document.getElementById('stat-curated-songs');
    if (elTotal) elTotal.textContent = App.allSongs.length;
    if (elCur) elCur.textContent = curated;
}

// ================================================================
// LETRAS EM HTML
// ================================================================
function buildLyricsHtml(raw) {
    if (!raw) return '<div style="color:var(--text-subtle); font-style:italic; padding:20px;">Sem letra disponível para esta música.</div>';

    const stanzas = raw.split(/\n\s*\n/);
    return stanzas.map(s => {
        const clean = s.trim();
        if (!clean) return '';
        if (/^(\-{3,}|\={3,}|\[coluna\]|\[col\]|\[quebra\])$/i.test(clean)) {
            return '<div class="column-break"></div>';
        }
        return `<div class="verse-block">${esc(clean).replace(/\n/g, '<br>')}</div>`;
    }).join('');
}

// ================================================================
// BUSCA INSTANTÂNEA
// ================================================================
function setupSearch() {
    const st = document.getElementById('search-input-teclado');
    if (st) {
        let timer;
        st.addEventListener('input', e => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                App.searchTeclado = e.target.value;
                applyFiltersTeclado();
            }, 120);
        });
    }

    const sp2 = document.getElementById('search-input-pulpito');
    if (sp2) {
        let timer;
        sp2.addEventListener('input', e => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                App.searchPulpito = e.target.value;
                if (!App.pulpitoGridVisible) showPulpitoGrid();
                applyFiltersPulpito();
            }, 120);
        });
    }
}
