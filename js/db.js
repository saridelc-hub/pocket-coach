// Pocket Coach — IndexedDB Wrapper
const DB_NAME = 'PocketCoachDB';
const DB_VERSION = 1;

let dbInstance = null;

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Players
      if (!db.objectStoreNames.contains('players')) {
        const players = db.createObjectStore('players', { keyPath: 'id', autoIncrement: true });
        players.createIndex('activa', 'activa');
      }

      // Games
      if (!db.objectStoreNames.contains('games')) {
        const games = db.createObjectStore('games', { keyPath: 'id', autoIncrement: true });
        games.createIndex('fecha', 'fecha');
      }

      // At-Bats
      if (!db.objectStoreNames.contains('atBats')) {
        const atBats = db.createObjectStore('atBats', { keyPath: 'id', autoIncrement: true });
        atBats.createIndex('gameId', 'gameId');
        atBats.createIndex('playerId', 'playerId');
      }

      // Pitching
      if (!db.objectStoreNames.contains('pitching')) {
        const pitching = db.createObjectStore('pitching', { keyPath: 'id', autoIncrement: true });
        pitching.createIndex('gameId', 'gameId');
        pitching.createIndex('playerId', 'playerId');
      }

      // Fielding
      if (!db.objectStoreNames.contains('fielding')) {
        const fielding = db.createObjectStore('fielding', { keyPath: 'id', autoIncrement: true });
        fielding.createIndex('gameId', 'gameId');
        fielding.createIndex('playerId', 'playerId');
      }

      // Practices
      if (!db.objectStoreNames.contains('practices')) {
        db.createObjectStore('practices', { keyPath: 'id', autoIncrement: true });
      }

      // Lineups
      if (!db.objectStoreNames.contains('lineups')) {
        db.createObjectStore('lineups', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onerror = (e) => reject(e.target.error);
  });
}

async function getStore(storeName, mode = 'readonly') {
  const db = await openDB();
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function add(storeName, data) {
  const store = await getStore(storeName, 'readwrite');
  return promisifyRequest(store.add(data));
}

export async function put(storeName, data) {
  const store = await getStore(storeName, 'readwrite');
  return promisifyRequest(store.put(data));
}

export async function get(storeName, id) {
  const store = await getStore(storeName);
  return promisifyRequest(store.get(id));
}

export async function getAll(storeName) {
  const store = await getStore(storeName);
  return promisifyRequest(store.getAll());
}

export async function getAllByIndex(storeName, indexName, value) {
  const store = await getStore(storeName);
  const index = store.index(indexName);
  return promisifyRequest(index.getAll(value));
}

export async function del(storeName, id) {
  const store = await getStore(storeName, 'readwrite');
  return promisifyRequest(store.delete(id));
}

export async function clear(storeName) {
  const store = await getStore(storeName, 'readwrite');
  return promisifyRequest(store.clear());
}

export async function exportAllData() {
  const db = await openDB();
  const storeNames = Array.from(db.objectStoreNames);
  const data = {};
  for (const name of storeNames) {
    data[name] = await getAll(name);
  }
  return data;
}

export async function importAllData(data) {
  const db = await openDB();
  const storeNames = Array.from(db.objectStoreNames);
  for (const name of storeNames) {
    if (!data[name]) continue;
    const store = db.transaction(name, 'readwrite').objectStore(name);
    store.clear();
    for (const item of data[name]) {
      store.add(item);
    }
  }
}

export { openDB };
