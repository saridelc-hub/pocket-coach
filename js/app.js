// Pocket Coach — App Bootstrap & Router
import { openDB, exportAllData, importAllData } from './db.js';

const pages = {};
const pageContainer = document.getElementById('app');
const navButtons = document.querySelectorAll('.nav-btn');

const routes = {
  plantel: () => import('./pages/roster.js'),
  alineacion: () => import('./pages/lineup.js'),
  practica: () => import('./pages/practice.js'),
  juego: () => import('./pages/game-tracker.js'),
  estadisticas: () => import('./pages/stats-dashboard.js'),
};

function getRoute() {
  return location.hash.slice(1) || 'plantel';
}

async function navigate(route) {
  if (!routes[route]) route = 'plantel';

  // Update nav active state
  navButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === route);
  });

  // Load and render page
  if (!pages[route]) {
    const module = await routes[route]();
    pages[route] = module;
  }

  pageContainer.innerHTML = '';
  const content = await pages[route].render();
  if (typeof content === 'string') {
    pageContainer.innerHTML = content;
  } else if (content instanceof Node) {
    pageContainer.appendChild(content);
  }

  if (pages[route].init) {
    pages[route].init();
  }
}

// Nav click handlers
navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    location.hash = page;
  });
});

// Hash change listener
window.addEventListener('hashchange', () => navigate(getRoute()));

// Settings modal
const settingsBtn = document.getElementById('settings-btn');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsClose = document.getElementById('settings-close');
const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('import-file');

settingsBtn.addEventListener('click', () => settingsOverlay.classList.remove('hidden'));
settingsClose.addEventListener('click', () => settingsOverlay.classList.add('hidden'));
settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) settingsOverlay.classList.add('hidden');
});

exportBtn.addEventListener('click', async () => {
  const data = await exportAllData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pocket-coach-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

importFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!confirm('Esto reemplazará todos los datos actuales. ¿Continuar?')) {
    importFile.value = '';
    return;
  }
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await importAllData(data);
    settingsOverlay.classList.add('hidden');
    alert('Datos importados correctamente');
    location.reload();
  } catch (err) {
    alert('Error al importar: ' + err.message);
  }
  importFile.value = '';
});

// Init
async function init() {
  await openDB();
  await navigate(getRoute());
}

init();
