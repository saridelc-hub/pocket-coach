// Pocket Coach — Game Tracker (Registro de Juego en Vivo)
import { getAll, add, put, get, getAllByIndex, del } from '../db.js';
import { RESULTADOS_BATEO, RESULTADO_LABELS, RESULTADO_COLORS, INNINGS_DEFAULT } from '../utils/constants.js';

let players = [];
let games = [];
let currentGame = null;
let gameAtBats = [];
let gamePitching = [];
let gameFielding = [];
let currentInning = 1;
let currentBatterIndex = 0;
let activeTab = 'bateo';

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

function getPlayer(id) {
  return players.find(p => p.id === id);
}

// ---- Render Functions ----

function renderGameList() {
  if (games.length === 0 && !currentGame) {
    return `
      <div class="empty-state">
        <div class="empty-icon">&#129358;</div>
        <p>No hay juegos registrados</p>
        <button class="btn btn-primary" id="new-game-btn">Nuevo Juego</button>
      </div>
    `;
  }

  const pastGames = games.map(g => `
    <div class="list-item game-item" data-id="${g.id}">
      <div class="item-info">
        <div class="item-name">vs ${g.rival}</div>
        <div class="item-detail">${new Date(g.fecha).toLocaleDateString('es')} · ${g.lugar || 'Sin ubicación'} ${g.resultado ? '· ' + g.resultado : ''}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-primary resume-game-btn" data-id="${g.id}">Abrir</button>
        <button class="btn btn-sm btn-icon delete-game-btn" data-id="${g.id}" style="color:var(--error);background:none;">&#128465;</button>
      </div>
    </div>
  `).join('');

  return `
    <button class="btn btn-primary btn-block mb-2" id="new-game-btn">Nuevo Juego</button>
    <div class="section-title">Juegos</div>
    ${pastGames}
  `;
}

function renderNewGameForm() {
  return `
    <div class="modal-overlay" id="new-game-modal">
      <div class="modal">
        <h2 class="modal-title">Nuevo Juego</h2>
        <div class="form-group">
          <label class="form-label">Rival</label>
          <input class="form-input" type="text" id="g-rival" placeholder="Nombre del equipo rival" autocomplete="off">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha</label>
          <input class="form-input" type="date" id="g-fecha" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label class="form-label">Lugar</label>
          <input class="form-input" type="text" id="g-lugar" placeholder="Estadio / Campo" autocomplete="off">
        </div>
        <div class="section-title">Alineación</div>
        <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px;">Selecciona las jugadoras que participan (en orden de bateo)</p>
        <div id="lineup-select">
          ${players.map(p => `
            <label class="list-item" style="cursor:pointer;">
              <input type="checkbox" class="lineup-check" data-id="${p.id}" style="width:20px;height:20px;">
              <div class="item-info">
                <div class="item-name">#${p.numero || '?'} ${p.nombre}</div>
                <div class="item-detail">${(p.posiciones || []).join(', ')}</div>
              </div>
            </label>
          `).join('')}
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" id="game-modal-cancel">Cancelar</button>
          <button class="btn btn-primary" id="game-modal-start">Iniciar Juego</button>
        </div>
      </div>
    </div>
  `;
}

function renderActiveGame() {
  if (!currentGame) return '';
  const lineup = currentGame.alineacion?.orden || [];
  if (lineup.length === 0) return '<p>No hay alineación para este juego</p>';

  const currentBatter = getPlayer(lineup[currentBatterIndex % lineup.length]);

  // Calculate score (runs scored)
  const runs = gameAtBats.filter(ab => ab.anotada).length;

  // Tab content
  let tabContent = '';
  if (activeTab === 'bateo') {
    tabContent = renderBateoTab(currentBatter, lineup);
  } else if (activeTab === 'pitcheo') {
    tabContent = renderPitcheoTab();
  } else {
    tabContent = renderFildeoTab();
  }

  return `
    <div class="score-display">
      <div class="score-team">
        <div style="font-size:0.75rem;opacity:0.7">Nosotros</div>
        <div class="score-num">${runs}</div>
      </div>
      <div class="score-vs">vs</div>
      <div class="score-team">
        <div style="font-size:0.75rem;opacity:0.7">${currentGame.rival}</div>
        <div class="score-num" contenteditable="false" style="opacity:0.5">-</div>
      </div>
    </div>

    <!-- Innings -->
    <div class="inning-bar" id="inning-bar">
      ${Array.from({length: INNINGS_DEFAULT}, (_, i) => `
        <button class="inning-btn ${i + 1 === currentInning ? 'active' : ''}" data-inning="${i + 1}">${i + 1}</button>
      `).join('')}
      <button class="inning-btn" data-inning="${INNINGS_DEFAULT + 1}">EX</button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab-btn ${activeTab === 'bateo' ? 'active' : ''}" data-tab="bateo">Bateo</button>
      <button class="tab-btn ${activeTab === 'pitcheo' ? 'active' : ''}" data-tab="pitcheo">Pitcheo</button>
      <button class="tab-btn ${activeTab === 'fildeo' ? 'active' : ''}" data-tab="fildeo">Fildeo</button>
    </div>

    <div id="tab-content">${tabContent}</div>

    <div class="mt-2 flex-between">
      <button class="btn btn-outline btn-sm" id="back-to-list">Volver</button>
      <button class="btn btn-sm" style="background:var(--primary);color:white;" id="finish-game-btn">Terminar Juego</button>
    </div>
  `;
}

function renderBateoTab(currentBatter, lineup) {
  // Batter selector (horizontal scroll)
  const batterSelector = lineup.map((pid, i) => {
    const p = getPlayer(pid);
    if (!p) return '';
    const isCurrent = i === currentBatterIndex % lineup.length;
    return `<button class="inning-btn ${isCurrent ? 'active' : ''} batter-select" data-index="${i}" style="min-width:auto;padding:4px 10px;border-radius:8px;font-size:0.75rem;">#${p.numero}</button>`;
  }).join('');

  // Quick buttons
  const allResults = [...RESULTADOS_BATEO.hits, ...RESULTADOS_BATEO.outs, ...RESULTADOS_BATEO.otros];
  const quickButtons = allResults.map(r => `
    <button class="quick-btn result-btn" data-result="${r}" style="background:${RESULTADO_COLORS[r] || '#999'}">
      ${r}
    </button>
  `).join('');

  // Recent at-bats for current inning
  const inningABs = gameAtBats.filter(ab => ab.inning === currentInning);
  const recentHTML = inningABs.map(ab => {
    const p = getPlayer(ab.playerId);
    return `<span style="font-size:0.8rem;color:var(--text-secondary);">${p?.nombre?.split(' ')[0] || '?'}: <b style="color:${RESULTADO_COLORS[ab.resultado]}">${ab.resultado}</b>${ab.rpimp ? ' (' + ab.rpimp + 'CI)' : ''}${ab.anotada ? ' &#127939;' : ''}</span>`;
  }).join(' · ');

  return `
    <div class="mb-1" style="font-size:0.8rem;color:var(--text-secondary);">Al bate:</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
      <div class="item-number" style="width:48px;height:48px;font-size:1.1rem;">${currentBatter?.numero || '?'}</div>
      <div>
        <div style="font-weight:700;font-size:1.1rem;">${currentBatter?.nombre || '?'}</div>
        <div style="font-size:0.8rem;color:var(--text-secondary);">${(currentBatter?.posiciones || []).join(', ')}</div>
      </div>
    </div>

    <div class="inning-bar mb-1" style="gap:6px;">${batterSelector}</div>

    <div class="quick-grid">${quickButtons}</div>

    <div class="flex gap-1 mb-1">
      <label style="display:flex;align-items:center;gap:4px;font-size:0.85rem;">
        <input type="number" id="rbi-count" min="0" max="4" value="0" style="width:45px;text-align:center;border:2px solid var(--border);border-radius:6px;padding:4px;font-size:0.9rem;">
        CI
      </label>
      <label style="display:flex;align-items:center;gap:4px;font-size:0.85rem;">
        <input type="checkbox" id="stolen-base" style="width:20px;height:20px;">
        BR
      </label>
      <label style="display:flex;align-items:center;gap:4px;font-size:0.85rem;">
        <input type="checkbox" id="run-scored" style="width:20px;height:20px;">
        CA
      </label>
    </div>

    ${recentHTML ? `<div class="card" style="padding:8px 12px;margin-top:8px;"><div class="section-title" style="margin-top:0;">Inning ${currentInning}</div>${recentHTML}</div>` : ''}
  `;
}

function renderPitcheoTab() {
  const record = gamePitching.length > 0 ? gamePitching[0] : null;

  return `
    <div class="card">
      <div class="card-title mb-1">Pitcheo</div>
      <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px;">Selecciona la pitcher y registra sus estadísticas</p>
      <div class="form-group">
        <label class="form-label">Pitcher</label>
        <select class="form-input" id="pitcher-select">
          <option value="">Seleccionar...</option>
          ${players.map(p => `<option value="${p.id}" ${record && record.playerId === p.id ? 'selected' : ''}>#${p.numero} ${p.nombre}</option>`).join('')}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div class="form-group">
          <label class="form-label">Innings</label>
          <input class="form-input pitch-stat" type="number" id="ps-innings" step="0.1" min="0" value="${record?.innings || 0}" inputmode="decimal">
        </div>
        <div class="form-group">
          <label class="form-label">Ponches (K)</label>
          <input class="form-input pitch-stat" type="number" id="ps-ponches" min="0" value="${record?.ponches || 0}" inputmode="numeric">
        </div>
        <div class="form-group">
          <label class="form-label">Bases (BB)</label>
          <input class="form-input pitch-stat" type="number" id="ps-bases" min="0" value="${record?.bases || 0}" inputmode="numeric">
        </div>
        <div class="form-group">
          <label class="form-label">Hits Permitidos</label>
          <input class="form-input pitch-stat" type="number" id="ps-hits" min="0" value="${record?.hitsPermitidos || 0}" inputmode="numeric">
        </div>
        <div class="form-group">
          <label class="form-label">Carreras Limpias</label>
          <input class="form-input pitch-stat" type="number" id="ps-cl" min="0" value="${record?.carrerasLimpias || 0}" inputmode="numeric">
        </div>
      </div>
      <button class="btn btn-primary btn-block mt-1" id="save-pitching-btn">Guardar Pitcheo</button>
    </div>
  `;
}

function renderFildeoTab() {
  const lineup = currentGame?.alineacion?.orden || [];

  return `
    <div class="card">
      <div class="card-title mb-1">Fildeo</div>
      <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px;">Registra outs, asistencias y errores por jugadora</p>
      ${lineup.map(pid => {
        const p = getPlayer(pid);
        if (!p) return '';
        const rec = gameFielding.find(f => f.playerId === pid);
        return `
          <div class="flex-between mb-1" style="background:var(--bg);padding:8px 10px;border-radius:8px;">
            <span style="font-weight:600;font-size:0.85rem;">#${p.numero} ${p.nombre.split(' ')[0]}</span>
            <div class="flex gap-1">
              <div style="text-align:center;">
                <div style="font-size:0.65rem;color:var(--text-secondary);">O</div>
                <div class="flex" style="gap:2px;">
                  <button class="btn btn-sm field-btn" data-player="${pid}" data-stat="outs" data-dir="-1" style="padding:2px 8px;">-</button>
                  <span class="field-val" id="fo-${pid}">${rec?.outs || 0}</span>
                  <button class="btn btn-sm field-btn" data-player="${pid}" data-stat="outs" data-dir="1" style="padding:2px 8px;">+</button>
                </div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:0.65rem;color:var(--text-secondary);">A</div>
                <div class="flex" style="gap:2px;">
                  <button class="btn btn-sm field-btn" data-player="${pid}" data-stat="asistencias" data-dir="-1" style="padding:2px 8px;">-</button>
                  <span class="field-val" id="fa-${pid}">${rec?.asistencias || 0}</span>
                  <button class="btn btn-sm field-btn" data-player="${pid}" data-stat="asistencias" data-dir="1" style="padding:2px 8px;">+</button>
                </div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:0.65rem;color:var(--text-secondary);">E</div>
                <div class="flex" style="gap:2px;">
                  <button class="btn btn-sm field-btn" data-player="${pid}" data-stat="errores" data-dir="-1" style="padding:2px 8px;">-</button>
                  <span class="field-val" id="fe-${pid}">${rec?.errores || 0}</span>
                  <button class="btn btn-sm field-btn" data-player="${pid}" data-stat="errores" data-dir="1" style="padding:2px 8px;">+</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
      <button class="btn btn-primary btn-block mt-1" id="save-fielding-btn">Guardar Fildeo</button>
    </div>
  `;
}

// ---- Bind Events ----

function bindGameListEvents() {
  const newBtn = document.getElementById('new-game-btn');
  if (newBtn) newBtn.addEventListener('click', openNewGameForm);

  document.querySelectorAll('.resume-game-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      await loadGame(id);
      refreshPage();
    });
  });

  document.querySelectorAll('.delete-game-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('¿Eliminar este juego y todas sus estadísticas?')) {
        const id = Number(btn.dataset.id);
        // Delete related records
        const abs = await getAllByIndex('atBats', 'gameId', id);
        for (const ab of abs) await del('atBats', ab.id);
        const pits = await getAllByIndex('pitching', 'gameId', id);
        for (const p of pits) await del('pitching', p.id);
        const fields = await getAllByIndex('fielding', 'gameId', id);
        for (const f of fields) await del('fielding', f.id);
        await del('games', id);
        games = await getAll('games');
        showToast('Juego eliminado');
        refreshPage();
      }
    });
  });
}

function openNewGameForm() {
  document.body.insertAdjacentHTML('beforeend', renderNewGameForm());
  const modal = document.getElementById('new-game-modal');

  modal.querySelector('#game-modal-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  modal.querySelector('#game-modal-start').addEventListener('click', async () => {
    const rival = document.getElementById('g-rival').value.trim();
    if (!rival) { document.getElementById('g-rival').focus(); return; }

    const fecha = document.getElementById('g-fecha').value;
    const lugar = document.getElementById('g-lugar').value.trim();
    const checks = modal.querySelectorAll('.lineup-check:checked');
    const orden = Array.from(checks).map(c => Number(c.dataset.id));

    if (orden.length < 1) {
      showToast('Selecciona al menos una jugadora');
      return;
    }

    const gameId = await add('games', {
      fecha: new Date(fecha).toISOString(),
      rival,
      lugar,
      resultado: null,
      alineacion: { orden, posiciones: {} },
      creado: new Date().toISOString()
    });

    modal.remove();
    await loadGame(gameId);
    games = await getAll('games');
    showToast('Juego iniciado');
    refreshPage();
  });
}

async function loadGame(id) {
  currentGame = await get('games', id);
  gameAtBats = await getAllByIndex('atBats', 'gameId', id);
  gamePitching = await getAllByIndex('pitching', 'gameId', id);
  gameFielding = await getAllByIndex('fielding', 'gameId', id);
  currentInning = 1;
  currentBatterIndex = 0;
  activeTab = 'bateo';
}

function bindActiveGameEvents() {
  // Inning selector
  document.querySelectorAll('#inning-bar .inning-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentInning = Number(btn.dataset.inning);
      refreshPage();
    });
  });

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      refreshPage();
    });
  });

  // Back to list
  const backBtn = document.getElementById('back-to-list');
  if (backBtn) backBtn.addEventListener('click', () => {
    currentGame = null;
    refreshPage();
  });

  // Finish game
  const finishBtn = document.getElementById('finish-game-btn');
  if (finishBtn) finishBtn.addEventListener('click', async () => {
    const score = prompt('Resultado del juego (ej: 5-3):');
    if (score !== null) {
      currentGame.resultado = score || null;
      await put('games', currentGame);
      games = await getAll('games');
      currentGame = null;
      showToast('Juego finalizado');
      refreshPage();
    }
  });

  // Bateo tab events
  if (activeTab === 'bateo') bindBateoEvents();
  if (activeTab === 'pitcheo') bindPitcheoEvents();
  if (activeTab === 'fildeo') bindFildeoEvents();
}

function bindBateoEvents() {
  // Batter selector
  document.querySelectorAll('.batter-select').forEach(btn => {
    btn.addEventListener('click', () => {
      currentBatterIndex = Number(btn.dataset.index);
      refreshPage();
    });
  });

  // Result buttons
  document.querySelectorAll('.result-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const resultado = btn.dataset.result;
      const lineup = currentGame.alineacion.orden;
      const playerId = lineup[currentBatterIndex % lineup.length];

      const rpimp = parseInt(document.getElementById('rbi-count')?.value) || 0;
      const robo = document.getElementById('stolen-base')?.checked || false;
      const anotada = document.getElementById('run-scored')?.checked || false;

      await add('atBats', {
        gameId: currentGame.id,
        playerId,
        inning: currentInning,
        resultado,
        rpimp,
        robo,
        anotada
      });

      gameAtBats = await getAllByIndex('atBats', 'gameId', currentGame.id);

      // Advance to next batter
      currentBatterIndex = (currentBatterIndex + 1) % lineup.length;

      showToast(`${resultado} registrado`);
      refreshPage();
    });
  });
}

function bindPitcheoEvents() {
  const saveBtn = document.getElementById('save-pitching-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const pitcherId = Number(document.getElementById('pitcher-select').value);
      if (!pitcherId) { showToast('Selecciona una pitcher'); return; }

      const data = {
        gameId: currentGame.id,
        playerId: pitcherId,
        innings: parseFloat(document.getElementById('ps-innings').value) || 0,
        ponches: parseInt(document.getElementById('ps-ponches').value) || 0,
        bases: parseInt(document.getElementById('ps-bases').value) || 0,
        hitsPermitidos: parseInt(document.getElementById('ps-hits').value) || 0,
        carrerasLimpias: parseInt(document.getElementById('ps-cl').value) || 0,
      };

      // Update or add
      const existing = gamePitching.find(p => p.playerId === pitcherId);
      if (existing) {
        data.id = existing.id;
        await put('pitching', data);
      } else {
        await add('pitching', data);
      }

      gamePitching = await getAllByIndex('pitching', 'gameId', currentGame.id);
      showToast('Pitcheo guardado');
    });
  }
}

function bindFildeoEvents() {
  document.querySelectorAll('.field-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const playerId = Number(btn.dataset.player);
      const stat = btn.dataset.stat;
      const dir = Number(btn.dataset.dir);

      let rec = gameFielding.find(f => f.playerId === playerId);
      if (!rec) {
        rec = { gameId: currentGame.id, playerId, outs: 0, asistencias: 0, errores: 0 };
        const id = await add('fielding', rec);
        rec.id = id;
        gameFielding.push(rec);
      }

      rec[stat] = Math.max(0, (rec[stat] || 0) + dir);
      await put('fielding', rec);

      // Update display inline
      const prefix = stat === 'outs' ? 'fo' : stat === 'asistencias' ? 'fa' : 'fe';
      const valEl = document.getElementById(`${prefix}-${playerId}`);
      if (valEl) valEl.textContent = rec[stat];
    });
  });

  const saveBtn = document.getElementById('save-fielding-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => showToast('Fildeo guardado'));
  }
}

// ---- Main ----

function refreshPage() {
  const app = document.getElementById('app');
  if (currentGame) {
    app.innerHTML = renderActiveGame();
    bindActiveGameEvents();
  } else {
    app.innerHTML = renderGameList();
    bindGameListEvents();
  }
}

export async function render() {
  players = (await getAll('players')).filter(p => p.activa !== false);
  games = (await getAll('games')).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  currentGame = null;
  return currentGame ? renderActiveGame() : renderGameList();
}

export function init() {
  if (currentGame) {
    bindActiveGameEvents();
  } else {
    bindGameListEvents();
  }
}
