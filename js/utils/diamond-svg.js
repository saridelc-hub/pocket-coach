// Pocket Coach — Diamond SVG Renderer
import { POSICIONES_LABELS } from './constants.js';

const POSITION_COORDS = {
  P:    { x: 150, y: 195 },
  C:    { x: 150, y: 280 },
  '1B': { x: 240, y: 180 },
  '2B': { x: 200, y: 120 },
  '3B': { x: 60,  y: 180 },
  SS:   { x: 100, y: 120 },
  SF:   { x: 150, y: 80 },
  LF:   { x: 35,  y: 55 },
  CF:   { x: 150, y: 25 },
  RF:   { x: 265, y: 55 },
  DP:   { x: 270, y: 140 },
  FLEX: { x: 30,  y: 140 },
};

export function renderDiamond(assignments = {}, onPositionClick = null) {
  // assignments: { position: { playerId, nombre, numero } }
  const positions = Object.keys(POSITION_COORDS);

  const circles = positions.map(pos => {
    const { x, y } = POSITION_COORDS[pos];
    const assigned = assignments[pos];
    const fill = assigned ? '#e94560' : '#ccc';
    const textColor = assigned ? '#fff' : '#666';
    const label = assigned ? `#${assigned.numero}` : pos;
    const nameLine = assigned ? assigned.nombre.split(' ')[0] : '';

    return `
      <g class="diamond-pos" data-pos="${pos}" style="cursor:pointer">
        <circle cx="${x}" cy="${y}" r="22" fill="${fill}" stroke="#1a1a2e" stroke-width="2"/>
        <text x="${x}" y="${y + 1}" text-anchor="middle" dominant-baseline="central"
              fill="${textColor}" font-size="11" font-weight="700">${label}</text>
        <text x="${x}" y="${y + 36}" text-anchor="middle" fill="#333" font-size="9" font-weight="500">${nameLine}</text>
        <text x="${x}" y="${y - 28}" text-anchor="middle" fill="#888" font-size="8">${assigned ? pos : ''}</text>
      </g>
    `;
  }).join('');

  const svg = `
    <svg viewBox="0 0 300 310" width="100%" style="max-width:340px" xmlns="http://www.w3.org/2000/svg">
      <!-- Field -->
      <polygon points="150,85 230,170 150,255 70,170" fill="none" stroke="#4caf50" stroke-width="2" opacity="0.4"/>
      <!-- Grass arc -->
      <path d="M 30,280 Q 150,-20 270,280" fill="none" stroke="#4caf50" stroke-width="1.5" opacity="0.3"/>
      <!-- Base lines -->
      <line x1="150" y1="255" x2="230" y2="170" stroke="#8d6e63" stroke-width="1.5" opacity="0.4"/>
      <line x1="150" y1="255" x2="70" y2="170" stroke="#8d6e63" stroke-width="1.5" opacity="0.4"/>
      <!-- Bases -->
      <rect x="145" y="80" width="10" height="10" transform="rotate(45,150,85)" fill="#fff" stroke="#333" stroke-width="1.5"/>
      <rect x="225" y="165" width="10" height="10" transform="rotate(45,230,170)" fill="#fff" stroke="#333" stroke-width="1.5"/>
      <rect x="65" y="165" width="10" height="10" transform="rotate(45,70,170)" fill="#fff" stroke="#333" stroke-width="1.5"/>
      <rect x="145" y="250" width="10" height="10" fill="#fff" stroke="#333" stroke-width="1.5"/>
      <!-- Positions -->
      ${circles}
    </svg>
  `;

  return svg;
}

export function bindDiamondClicks(container, callback) {
  container.querySelectorAll('.diamond-pos').forEach(g => {
    g.addEventListener('click', () => {
      const pos = g.dataset.pos;
      if (callback) callback(pos);
    });
  });
}
