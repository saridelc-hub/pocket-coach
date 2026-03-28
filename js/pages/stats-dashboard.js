// Pocket Coach — Stats Dashboard
import { getAll, getAllByIndex } from '../db.js';
import { calcBatting, calcPitching, calcFielding } from '../utils/stats-calc.js';

let players = [];
let selectedPlayerId = null;

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

async function getPlayerStats(playerId) {
  const atBats = await getAllByIndex('atBats', 'playerId', playerId);
  const pitching = await getAllByIndex('pitching', 'playerId', playerId);
  const fielding = await getAllByIndex('fielding', 'playerId', playerId);

  return {
    batting: calcBatting(atBats),
    pitching: calcPitching(pitching),
    fielding: calcFielding(fielding),
  };
}

async function getTeamStats() {
  const allAtBats = await getAll('atBats');
  const allPitching = await getAll('pitching');
  const allFielding = await getAll('fielding');

  return {
    batting: calcBatting(allAtBats),
    pitching: calcPitching(allPitching),
    fielding: calcFielding(allFielding),
  };
}

function renderBattingTable(stats) {
  return `
    <div class="table-scroll">
      <table class="stats-table">
        <thead>
          <tr><th>JJ</th><th>AB</th><th>H</th><th>2B</th><th>3B</th><th>HR</th><th>CI</th><th>CA</th><th>BR</th><th>AVG</th><th>OBP</th><th>SLG</th><th>OPS</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>${stats.JJ}</td><td>${stats.AB}</td><td>${stats.H}</td><td>${stats['2B']}</td><td>${stats['3B']}</td><td>${stats.HR}</td>
            <td>${stats.CI}</td><td>${stats.CA}</td><td>${stats.BR}</td>
            <td><b>${stats.AVG}</b></td><td>${stats.OBP}</td><td>${stats.SLG}</td><td><b>${stats.OPS}</b></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function renderPitchingTable(stats) {
  return `
    <div class="table-scroll">
      <table class="stats-table">
        <thead>
          <tr><th>JJ</th><th>IL</th><th>K</th><th>BB</th><th>HP</th><th>CL</th><th>ERA</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>${stats.JJ}</td><td>${stats.IL}</td><td>${stats.K}</td><td>${stats.BB}</td><td>${stats.HP}</td><td>${stats.CL}</td><td><b>${stats.ERA}</b></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function renderFieldingTable(stats) {
  return `
    <div class="table-scroll">
      <table class="stats-table">
        <thead>
          <tr><th>JJ</th><th>O</th><th>A</th><th>E</th><th>FPCT</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>${stats.JJ}</td><td>${stats.O}</td><td>${stats.A}</td><td>${stats.E}</td><td><b>${stats.FPCT}</b></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

async function renderAllPlayersTable() {
  const rows = [];
  for (const p of players) {
    const atBats = await getAllByIndex('atBats', 'playerId', p.id);
    const batting = calcBatting(atBats);
    if (batting.PA > 0) {
      rows.push({ player: p, ...batting });
    }
  }

  if (rows.length === 0) return '<p style="color:var(--text-secondary);font-size:0.85rem;text-align:center;">No hay datos de bateo aún</p>';

  rows.sort((a, b) => parseFloat(b.AVG) - parseFloat(a.AVG));

  return `
    <div class="table-scroll">
      <table class="stats-table">
        <thead>
          <tr><th>#</th><th>Jugadora</th><th>JJ</th><th>AB</th><th>H</th><th>HR</th><th>CI</th><th>AVG</th><th>OPS</th></tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr class="player-stat-row" data-id="${r.player.id}" style="cursor:pointer">
              <td>${r.player.numero || '?'}</td>
              <td style="text-align:left;font-weight:600;white-space:nowrap;">${r.player.nombre.split(' ')[0]}</td>
              <td>${r.JJ}</td><td>${r.AB}</td><td>${r.H}</td><td>${r.HR}</td><td>${r.CI}</td>
              <td><b>${r.AVG}</b></td><td><b>${r.OPS}</b></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function refreshView() {
  const app = document.getElementById('app');

  if (selectedPlayerId) {
    const player = players.find(p => p.id === selectedPlayerId);
    const stats = await getPlayerStats(selectedPlayerId);

    app.innerHTML = `
      <button class="btn btn-outline btn-sm mb-2" id="back-to-all">&#8592; Todas las jugadoras</button>

      <div class="card">
        <div class="flex" style="align-items:center;gap:12px;">
          <div class="item-number" style="width:48px;height:48px;font-size:1.1rem;">${player.numero || '?'}</div>
          <div>
            <div style="font-weight:700;font-size:1.1rem;">${player.nombre}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);">${(player.posiciones || []).join(', ')}</div>
          </div>
        </div>
      </div>

      <div class="section-title">Bateo</div>
      ${renderBattingTable(stats.batting)}

      ${stats.pitching.JJ > 0 ? `
        <div class="section-title">Pitcheo</div>
        ${renderPitchingTable(stats.pitching)}
      ` : ''}

      ${stats.fielding.JJ > 0 ? `
        <div class="section-title">Fildeo</div>
        ${renderFieldingTable(stats.fielding)}
      ` : ''}
    `;

    document.getElementById('back-to-all').addEventListener('click', () => {
      selectedPlayerId = null;
      refreshView();
    });

  } else {
    const teamStats = await getTeamStats();
    const allPlayersTable = await renderAllPlayersTable();

    app.innerHTML = `
      <div class="section-title">Equipo</div>
      ${teamStats.batting.PA > 0 ? renderBattingTable(teamStats.batting) : '<p style="color:var(--text-secondary);font-size:0.85rem;text-align:center;">No hay datos aún. Registra un juego primero.</p>'}

      <div class="section-title mt-2">Jugadoras</div>
      ${allPlayersTable}
    `;

    document.querySelectorAll('.player-stat-row').forEach(row => {
      row.addEventListener('click', () => {
        selectedPlayerId = Number(row.dataset.id);
        refreshView();
      });
    });
  }
}

export async function render() {
  players = (await getAll('players')).filter(p => p.activa !== false);
  selectedPlayerId = null;

  if (players.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">&#128202;</div>
        <p>Agrega jugadoras y registra juegos para ver estadísticas</p>
      </div>
    `;
  }

  const div = document.createElement('div');
  return div;
}

export async function init() {
  players = (await getAll('players')).filter(p => p.activa !== false);
  if (players.length > 0) {
    await refreshView();
  }
}
