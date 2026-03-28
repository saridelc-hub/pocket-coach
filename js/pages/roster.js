// Pocket Coach — Plantel (Roster)
import { getAll, add, put, del } from '../db.js';
import { POSICIONES, POSICIONES_LABELS } from '../utils/constants.js';

let players = [];

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function renderPlayerCard(player) {
  const initials = player.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const posStr = (player.posiciones || []).join(', ') || 'Sin posición';
  const photoHTML = player.foto
    ? `<img class="avatar" src="${player.foto}" alt="${player.nombre}">`
    : `<div class="avatar">${initials}</div>`;

  return `
    <div class="list-item" data-id="${player.id}">
      ${photoHTML}
      <div class="item-info">
        <div class="item-name">${player.nombre}</div>
        <div class="item-detail">#${player.numero || '?'} · ${posStr}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-outline edit-btn" data-id="${player.id}">Editar</button>
      </div>
    </div>
  `;
}

function renderModal(player = null) {
  const isEdit = !!player;
  const selectedPos = player ? (player.posiciones || []) : [];

  const posChips = POSICIONES.map(p =>
    `<span class="chip ${selectedPos.includes(p) ? 'selected' : ''}" data-pos="${p}">${p}</span>`
  ).join('');

  return `
    <div class="modal-overlay" id="player-modal">
      <div class="modal">
        <h2 class="modal-title">${isEdit ? 'Editar Jugadora' : 'Nueva Jugadora'}</h2>

        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input class="form-input" type="text" id="p-nombre" value="${player?.nombre || ''}" placeholder="Nombre completo" autocomplete="off">
        </div>

        <div class="form-group">
          <label class="form-label">Número</label>
          <input class="form-input" type="number" id="p-numero" value="${player?.numero ?? ''}" placeholder="Ej: 7" min="0" max="99" inputmode="numeric">
        </div>

        <div class="form-group">
          <label class="form-label">Posiciones</label>
          <div class="chips" id="pos-chips">
            ${posChips}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Foto (opcional)</label>
          <input class="form-input" type="file" id="p-foto" accept="image/*" capture="environment">
        </div>

        ${isEdit ? `
        <div class="form-group">
          <button class="btn btn-sm" style="color:var(--error);background:none;padding:0;" id="delete-player-btn" data-id="${player.id}">
            Eliminar jugadora
          </button>
        </div>
        ` : ''}

        <div class="modal-actions">
          <button class="btn btn-outline" id="modal-cancel">Cancelar</button>
          <button class="btn btn-primary" id="modal-save" data-id="${player?.id || ''}">
            ${isEdit ? 'Guardar' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  `;
}

async function resizeImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function bindModalEvents() {
  const overlay = document.getElementById('player-modal');
  if (!overlay) return;

  // Close modal
  const cancelBtn = document.getElementById('modal-cancel');
  cancelBtn.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // Chip toggle
  const chipsContainer = document.getElementById('pos-chips');
  chipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) chip.classList.toggle('selected');
  });

  // Delete button
  const deleteBtn = document.getElementById('delete-player-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const id = Number(deleteBtn.dataset.id);
      if (confirm('¿Eliminar esta jugadora?')) {
        await del('players', id);
        overlay.remove();
        showToast('Jugadora eliminada');
        await refreshList();
      }
    });
  }

  // Save
  const saveBtn = document.getElementById('modal-save');
  saveBtn.addEventListener('click', async () => {
    const nombre = document.getElementById('p-nombre').value.trim();
    if (!nombre) {
      document.getElementById('p-nombre').focus();
      return;
    }

    const numero = parseInt(document.getElementById('p-numero').value) || 0;
    const posiciones = Array.from(chipsContainer.querySelectorAll('.chip.selected')).map(c => c.dataset.pos);

    let foto = null;
    const fileInput = document.getElementById('p-foto');
    if (fileInput.files.length > 0) {
      foto = await resizeImage(fileInput.files[0]);
    }

    const id = saveBtn.dataset.id ? Number(saveBtn.dataset.id) : null;

    if (id) {
      // Edit existing
      const existing = players.find(p => p.id === id);
      const updated = { ...existing, nombre, numero, posiciones };
      if (foto) updated.foto = foto;
      await put('players', updated);
      showToast('Jugadora actualizada');
    } else {
      // New player
      await add('players', {
        nombre,
        numero,
        posiciones,
        foto,
        activa: true,
        creado: new Date().toISOString()
      });
      showToast('Jugadora agregada');
    }

    overlay.remove();
    await refreshList();
  });
}

async function refreshList() {
  players = await getAll('players');
  players = players.filter(p => p.activa !== false);
  players.sort((a, b) => (a.numero || 0) - (b.numero || 0));

  const container = document.getElementById('roster-list');
  if (!container) return;

  if (players.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128101;</div>
        <p>No hay jugadoras en el plantel</p>
        <button class="btn btn-primary" id="empty-add-btn">Agregar primera jugadora</button>
      </div>
    `;
    const emptyBtn = document.getElementById('empty-add-btn');
    if (emptyBtn) emptyBtn.addEventListener('click', openNewPlayerModal);
  } else {
    container.innerHTML = players.map(renderPlayerCard).join('');

    // Edit buttons
    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.id);
        const player = players.find(p => p.id === id);
        openEditPlayerModal(player);
      });
    });
  }
}

function openNewPlayerModal() {
  document.body.insertAdjacentHTML('beforeend', renderModal());
  bindModalEvents();
  document.getElementById('p-nombre').focus();
}

function openEditPlayerModal(player) {
  document.body.insertAdjacentHTML('beforeend', renderModal(player));
  bindModalEvents();
}

export async function render() {
  return `
    <div id="roster-list"></div>
    <button class="fab" id="add-player-fab">+</button>
  `;
}

export async function init() {
  await refreshList();

  const fab = document.getElementById('add-player-fab');
  if (fab) fab.addEventListener('click', openNewPlayerModal);
}
