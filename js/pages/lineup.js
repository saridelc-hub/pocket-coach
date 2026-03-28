// Pocket Coach — Alineaciones (Lineup Builder)
import { getAll, add, put, del, get } from '../db.js';
import { POSICIONES } from '../utils/constants.js';
import { renderDiamond, bindDiamondClicks } from '../utils/diamond-svg.js';

let players = [];
let lineups = [];
let currentLineup = { nombre: '', orden: [], posiciones: {} };
let editingId = null;

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

function getAssignments() {
  const assignments = {};
  for (const [pos, playerId] of Object.entries(currentLineup.posiciones)) {
    const player = players.find(p => p.id === playerId);
    if (player) {
      assignments[pos] = { playerId: player.id, nombre: player.nombre, numero: player.numero };
    }
  }
  return assignments;
}

function renderPositionModal(pos) {
  const assigned = currentLineup.posiciones[pos];
  const usedPlayerIds = new Set(Object.values(currentLineup.posiciones));
  const available = players.filter(p =>
    p.id === assigned || !usedPlayerIds.has(p.id)
  );

  const items = available.map(p => `
    <div class="list-item pos-select-item" data-player-id="${p.id}" style="${p.id === assigned ? 'background:#fce4ec' : ''}">
      <div class="item-number">${p.numero || '?'}</div>
      <div class="item-info">
        <div class="item-name">${p.nombre}</div>
        <div class="item-detail">${(p.posiciones || []).join(', ')}</div>
      </div>
    </div>
  `).join('');

  return `
    <div class="modal-overlay" id="pos-modal">
      <div class="modal">
        <h2 class="modal-title">Asignar ${pos}</h2>
        ${available.length === 0
          ? '<p style="color:var(--text-secondary)">No hay jugadoras disponibles</p>'
          : items}
        ${assigned ? '<button class="btn btn-sm mt-2" id="clear-pos-btn" style="color:var(--error);background:none;padding:0;">Quitar asignación</button>' : ''}
        <div class="modal-actions">
          <button class="btn btn-outline btn-block" id="pos-modal-close">Cerrar</button>
        </div>
      </div>
    </div>
  `;
}

function renderBattingOrder() {
  if (currentLineup.orden.length === 0) {
    return '<p class="text-center" style="color:var(--text-secondary);font-size:0.85rem;">Asigna posiciones para armar el orden al bate</p>';
  }

  return `
    <div class="batting-order" id="batting-list">
      ${currentLineup.orden.map(pid => {
        const p = players.find(pl => pl.id === pid);
        if (!p) return '';
        const pos = Object.entries(currentLineup.posiciones).find(([, v]) => v === pid)?.[0] || '?';
        return `
          <div class="batting-item" data-player-id="${pid}" draggable="true">
            <span class="drag-handle">&#9776;</span>
            <span style="font-weight:600;flex:1">${p.nombre}</span>
            <span style="color:var(--text-secondary);font-size:0.8rem">#${p.numero} · ${pos}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderSavedLineups() {
  if (lineups.length === 0) return '';
  return `
    <div class="section-title">Alineaciones guardadas</div>
    ${lineups.map(l => `
      <div class="list-item saved-lineup" data-id="${l.id}">
        <div class="item-info">
          <div class="item-name">${l.nombre || 'Sin nombre'}</div>
          <div class="item-detail">${l.orden.length} jugadoras</div>
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-outline load-lineup-btn" data-id="${l.id}">Cargar</button>
          <button class="btn btn-sm btn-icon delete-lineup-btn" data-id="${l.id}" style="color:var(--error);background:none;">&#128465;</button>
        </div>
      </div>
    `).join('')}
  `;
}

function openPositionModal(pos) {
  document.body.insertAdjacentHTML('beforeend', renderPositionModal(pos));
  const modal = document.getElementById('pos-modal');

  modal.querySelector('#pos-modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  const clearBtn = modal.querySelector('#clear-pos-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const pid = currentLineup.posiciones[pos];
      delete currentLineup.posiciones[pos];
      currentLineup.orden = currentLineup.orden.filter(id => id !== pid);
      modal.remove();
      refreshView();
    });
  }

  modal.querySelectorAll('.pos-select-item').forEach(item => {
    item.addEventListener('click', () => {
      const playerId = Number(item.dataset.playerId);
      // Remove player from any other position
      for (const [p, pid] of Object.entries(currentLineup.posiciones)) {
        if (pid === playerId) delete currentLineup.posiciones[p];
      }
      currentLineup.posiciones[pos] = playerId;
      // Update batting order
      if (!currentLineup.orden.includes(playerId)) {
        currentLineup.orden.push(playerId);
      }
      modal.remove();
      refreshView();
    });
  });
}

function setupDragAndDrop(container) {
  const list = container.querySelector('#batting-list');
  if (!list) return;

  let draggedItem = null;

  list.addEventListener('dragstart', (e) => {
    draggedItem = e.target.closest('.batting-item');
    if (draggedItem) draggedItem.classList.add('dragging');
  });

  list.addEventListener('dragend', () => {
    if (draggedItem) draggedItem.classList.remove('dragging');
    draggedItem = null;
  });

  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(list, e.clientY);
    if (draggedItem) {
      if (afterElement) {
        list.insertBefore(draggedItem, afterElement);
      } else {
        list.appendChild(draggedItem);
      }
    }
  });

  list.addEventListener('dragend', () => {
    // Update order from DOM
    const items = list.querySelectorAll('.batting-item');
    currentLineup.orden = Array.from(items).map(i => Number(i.dataset.playerId));
  });

  // Touch support
  let touchStartY = 0;
  let touchItem = null;

  list.addEventListener('touchstart', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;
    touchItem = handle.closest('.batting-item');
    touchStartY = e.touches[0].clientY;
    touchItem.classList.add('dragging');
  }, { passive: true });

  list.addEventListener('touchmove', (e) => {
    if (!touchItem) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    const afterElement = getDragAfterElement(list, y);
    if (afterElement) {
      list.insertBefore(touchItem, afterElement);
    } else {
      list.appendChild(touchItem);
    }
  }, { passive: false });

  list.addEventListener('touchend', () => {
    if (touchItem) {
      touchItem.classList.remove('dragging');
      const items = list.querySelectorAll('.batting-item');
      currentLineup.orden = Array.from(items).map(i => Number(i.dataset.playerId));
      touchItem = null;
    }
  });
}

function getDragAfterElement(container, y) {
  const elements = [...container.querySelectorAll('.batting-item:not(.dragging)')];
  return elements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function refreshView() {
  const app = document.getElementById('app');
  renderPage(app);
}

function renderPage(container) {
  container.innerHTML = `
    <div class="form-group">
      <input class="form-input" type="text" id="lineup-name" placeholder="Nombre de la alineación" value="${currentLineup.nombre}">
    </div>

    <div class="diamond-container" id="diamond-area">
      ${renderDiamond(getAssignments())}
    </div>

    <div class="section-title">Orden al Bate</div>
    ${renderBattingOrder()}

    <div class="modal-actions mt-2">
      <button class="btn btn-outline" id="new-lineup-btn">Nueva</button>
      <button class="btn btn-primary" id="save-lineup-btn">Guardar</button>
    </div>

    ${renderSavedLineups()}
  `;

  // Bind diamond clicks
  const diamondArea = container.querySelector('#diamond-area');
  bindDiamondClicks(diamondArea, (pos) => openPositionModal(pos));

  // Name input
  container.querySelector('#lineup-name').addEventListener('input', (e) => {
    currentLineup.nombre = e.target.value;
  });

  // Save button
  container.querySelector('#save-lineup-btn').addEventListener('click', async () => {
    if (!currentLineup.nombre.trim()) {
      currentLineup.nombre = `Alineación ${new Date().toLocaleDateString('es')}`;
    }
    const data = {
      nombre: currentLineup.nombre,
      orden: [...currentLineup.orden],
      posiciones: { ...currentLineup.posiciones },
      creado: new Date().toISOString()
    };
    if (editingId) {
      data.id = editingId;
      await put('lineups', data);
      showToast('Alineación actualizada');
    } else {
      await add('lineups', data);
      showToast('Alineación guardada');
    }
    lineups = await getAll('lineups');
    editingId = null;
    refreshView();
  });

  // New button
  container.querySelector('#new-lineup-btn').addEventListener('click', () => {
    currentLineup = { nombre: '', orden: [], posiciones: {} };
    editingId = null;
    refreshView();
  });

  // Saved lineup buttons
  container.querySelectorAll('.load-lineup-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      const lineup = await get('lineups', id);
      if (lineup) {
        currentLineup = { nombre: lineup.nombre, orden: [...lineup.orden], posiciones: { ...lineup.posiciones } };
        editingId = lineup.id;
        refreshView();
        showToast('Alineación cargada');
      }
    });
  });

  container.querySelectorAll('.delete-lineup-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('¿Eliminar esta alineación?')) {
        await del('lineups', Number(btn.dataset.id));
        lineups = await getAll('lineups');
        if (editingId === Number(btn.dataset.id)) {
          currentLineup = { nombre: '', orden: [], posiciones: {} };
          editingId = null;
        }
        refreshView();
        showToast('Alineación eliminada');
      }
    });
  });

  setupDragAndDrop(container);
}

export async function render() {
  players = (await getAll('players')).filter(p => p.activa !== false);
  lineups = await getAll('lineups');

  if (players.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">&#9830;</div>
        <p>Agrega jugadoras al plantel primero</p>
      </div>
    `;
  }

  const div = document.createElement('div');
  renderPage(div);
  return div;
}

export function init() {}
