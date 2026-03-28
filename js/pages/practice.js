// Pocket Coach — Planificador de Prácticas
import { getAll, add, put, del, get } from '../db.js';

let practices = [];

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

function totalDuration(ejercicios) {
  return (ejercicios || []).reduce((s, e) => s + (e.duracionMin || 0), 0);
}

function renderPracticeCard(p) {
  const fecha = new Date(p.fecha).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
  const dur = totalDuration(p.ejercicios);
  const count = (p.ejercicios || []).length;

  return `
    <div class="list-item practice-item" data-id="${p.id}">
      <div class="item-info">
        <div class="item-name">${p.titulo || 'Sin título'}</div>
        <div class="item-detail">${fecha} · ${count} ejercicio${count !== 1 ? 's' : ''} · ${dur} min</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-outline edit-practice-btn" data-id="${p.id}">Editar</button>
        <button class="btn btn-sm btn-icon delete-practice-btn" data-id="${p.id}" style="color:var(--error);background:none;">&#128465;</button>
      </div>
    </div>
  `;
}

function renderModal(practice = null) {
  const isEdit = !!practice;
  const ejercicios = practice?.ejercicios || [{ nombre: '', duracionMin: 15, notas: '' }];

  const exerciseRows = ejercicios.map((e, i) => renderExerciseRow(e, i)).join('');

  return `
    <div class="modal-overlay" id="practice-modal">
      <div class="modal">
        <h2 class="modal-title">${isEdit ? 'Editar Práctica' : 'Nueva Práctica'}</h2>

        <div class="form-group">
          <label class="form-label">Título</label>
          <input class="form-input" type="text" id="pr-titulo" value="${practice?.titulo || ''}" placeholder="Ej: Práctica de bateo" autocomplete="off">
        </div>

        <div class="form-group">
          <label class="form-label">Fecha</label>
          <input class="form-input" type="date" id="pr-fecha" value="${practice ? practice.fecha.split('T')[0] : new Date().toISOString().split('T')[0]}">
        </div>

        <div class="flex-between">
          <div class="section-title" style="margin:0;">Ejercicios</div>
          <span id="total-duration" style="font-size:0.8rem;color:var(--text-secondary);">${totalDuration(ejercicios)} min</span>
        </div>

        <div id="exercises-list">
          ${exerciseRows}
        </div>

        <button class="btn btn-outline btn-sm mt-1" id="add-exercise-btn">+ Agregar ejercicio</button>

        <div class="form-group mt-2">
          <label class="form-label">Notas generales</label>
          <textarea class="form-input" id="pr-notas" placeholder="Notas adicionales...">${practice?.notasGenerales || ''}</textarea>
        </div>

        <div class="modal-actions">
          <button class="btn btn-outline" id="pr-modal-cancel">Cancelar</button>
          <button class="btn btn-primary" id="pr-modal-save" data-id="${practice?.id || ''}">
            ${isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderExerciseRow(e, index) {
  return `
    <div class="card exercise-row" style="padding:10px;margin-bottom:8px;" data-index="${index}">
      <div class="flex-between mb-1">
        <input class="form-input ex-nombre" type="text" value="${e.nombre}" placeholder="Nombre del ejercicio" style="flex:1;padding:8px;" autocomplete="off">
        <button class="btn btn-sm btn-icon remove-exercise-btn" style="color:var(--error);background:none;margin-left:8px;">&#10005;</button>
      </div>
      <div class="flex gap-1">
        <div style="flex:0 0 80px;">
          <input class="form-input ex-duracion" type="number" value="${e.duracionMin || 15}" min="1" style="padding:8px;text-align:center;" inputmode="numeric">
          <div style="font-size:0.7rem;color:var(--text-secondary);text-align:center;">min</div>
        </div>
        <input class="form-input ex-notas" type="text" value="${e.notas || ''}" placeholder="Notas..." style="flex:1;padding:8px;" autocomplete="off">
      </div>
    </div>
  `;
}

function updateTotalDuration() {
  const durations = document.querySelectorAll('.ex-duracion');
  let total = 0;
  durations.forEach(d => total += parseInt(d.value) || 0);
  const el = document.getElementById('total-duration');
  if (el) el.textContent = `${total} min`;
}

function bindModalEvents() {
  const modal = document.getElementById('practice-modal');
  if (!modal) return;

  modal.querySelector('#pr-modal-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  // Add exercise
  modal.querySelector('#add-exercise-btn').addEventListener('click', () => {
    const list = document.getElementById('exercises-list');
    const index = list.children.length;
    list.insertAdjacentHTML('beforeend', renderExerciseRow({ nombre: '', duracionMin: 15, notas: '' }, index));
    bindExerciseRemoveButtons();
    bindDurationChange();
  });

  bindExerciseRemoveButtons();
  bindDurationChange();

  // Save
  modal.querySelector('#pr-modal-save').addEventListener('click', async () => {
    const titulo = document.getElementById('pr-titulo').value.trim();
    const fecha = document.getElementById('pr-fecha').value;
    const notasGenerales = document.getElementById('pr-notas').value.trim();

    const rows = document.querySelectorAll('.exercise-row');
    const ejercicios = Array.from(rows).map(row => ({
      nombre: row.querySelector('.ex-nombre').value.trim(),
      duracionMin: parseInt(row.querySelector('.ex-duracion').value) || 15,
      notas: row.querySelector('.ex-notas')?.value.trim() || ''
    })).filter(e => e.nombre);

    const id = modal.querySelector('#pr-modal-save').dataset.id;

    const data = {
      titulo: titulo || `Práctica ${new Date(fecha).toLocaleDateString('es')}`,
      fecha: new Date(fecha).toISOString(),
      ejercicios,
      notasGenerales
    };

    if (id) {
      data.id = Number(id);
      await put('practices', data);
      showToast('Práctica actualizada');
    } else {
      await add('practices', data);
      showToast('Práctica creada');
    }

    modal.remove();
    await refreshList();
  });
}

function bindExerciseRemoveButtons() {
  document.querySelectorAll('.remove-exercise-btn').forEach(btn => {
    btn.onclick = () => {
      const row = btn.closest('.exercise-row');
      if (document.querySelectorAll('.exercise-row').length > 1) {
        row.remove();
        updateTotalDuration();
      }
    };
  });
}

function bindDurationChange() {
  document.querySelectorAll('.ex-duracion').forEach(input => {
    input.addEventListener('input', updateTotalDuration);
  });
}

async function refreshList() {
  practices = await getAll('practices');
  practices.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const container = document.getElementById('practice-list');
  if (!container) return;

  if (practices.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128203;</div>
        <p>No hay prácticas planificadas</p>
        <button class="btn btn-primary" id="empty-add-practice">Crear primera práctica</button>
      </div>
    `;
    const btn = document.getElementById('empty-add-practice');
    if (btn) btn.addEventListener('click', openNewModal);
  } else {
    container.innerHTML = practices.map(renderPracticeCard).join('');

    container.querySelectorAll('.edit-practice-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const p = await get('practices', Number(btn.dataset.id));
        if (p) openEditModal(p);
      });
    });

    container.querySelectorAll('.delete-practice-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('¿Eliminar esta práctica?')) {
          await del('practices', Number(btn.dataset.id));
          showToast('Práctica eliminada');
          await refreshList();
        }
      });
    });
  }
}

function openNewModal() {
  document.body.insertAdjacentHTML('beforeend', renderModal());
  bindModalEvents();
  document.getElementById('pr-titulo').focus();
}

function openEditModal(practice) {
  document.body.insertAdjacentHTML('beforeend', renderModal(practice));
  bindModalEvents();
}

export async function render() {
  return `
    <div id="practice-list"></div>
    <button class="fab" id="add-practice-fab">+</button>
  `;
}

export async function init() {
  await refreshList();
  const fab = document.getElementById('add-practice-fab');
  if (fab) fab.addEventListener('click', openNewModal);
}
