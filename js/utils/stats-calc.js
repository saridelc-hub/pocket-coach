// Pocket Coach — Stats Calculations
import { RESULTADOS_BATEO, INNINGS_DEFAULT } from './constants.js';

const HITS = new Set(RESULTADOS_BATEO.hits);
const OUTS = new Set(RESULTADOS_BATEO.outs);

function isHit(r) { return HITS.has(r); }
function isAtBat(r) { return r !== 'BB' && r !== 'HBP' && r !== 'SAC'; }

// Total bases for a result
function totalBases(r) {
  switch (r) {
    case '1B': return 1;
    case '2B': return 2;
    case '3B': return 3;
    case 'HR': return 4;
    default: return 0;
  }
}

/**
 * Batting stats from an array of atBat records
 * @param {Array} atBats - array of { resultado, rpimp, robo, anotada }
 * @returns {Object} stats
 */
export function calcBatting(atBats) {
  if (!atBats || atBats.length === 0) {
    return { JJ: 0, PA: 0, AB: 0, H: 0, '2B': 0, '3B': 0, HR: 0, CI: 0, CA: 0, BR: 0, K: 0, BB: 0, AVG: '.000', OBP: '.000', SLG: '.000', OPS: '.000' };
  }

  const gameIds = new Set(atBats.map(ab => ab.gameId));
  const JJ = gameIds.size;
  const PA = atBats.length;
  const AB = atBats.filter(ab => isAtBat(ab.resultado)).length;
  const H = atBats.filter(ab => isHit(ab.resultado)).length;
  const doubles = atBats.filter(ab => ab.resultado === '2B').length;
  const triples = atBats.filter(ab => ab.resultado === '3B').length;
  const HR = atBats.filter(ab => ab.resultado === 'HR').length;
  const CI = atBats.reduce((s, ab) => s + (ab.rpimp || 0), 0);
  const CA = atBats.filter(ab => ab.anotada).length;
  const BR = atBats.filter(ab => ab.robo).length;
  const K = atBats.filter(ab => ab.resultado === 'K').length;
  const BB = atBats.filter(ab => ab.resultado === 'BB').length;
  const HBP = atBats.filter(ab => ab.resultado === 'HBP').length;
  const SAC = atBats.filter(ab => ab.resultado === 'SAC').length;
  const TB = atBats.reduce((s, ab) => s + totalBases(ab.resultado), 0);

  const avg = AB > 0 ? H / AB : 0;
  const obpDenom = AB + BB + HBP + SAC;
  const obp = obpDenom > 0 ? (H + BB + HBP) / obpDenom : 0;
  const slg = AB > 0 ? TB / AB : 0;
  const ops = obp + slg;

  return {
    JJ, PA, AB, H,
    '2B': doubles, '3B': triples, HR,
    CI, CA, BR, K, BB,
    AVG: formatAvg(avg),
    OBP: formatAvg(obp),
    SLG: formatAvg(slg),
    OPS: formatAvg(ops),
  };
}

/**
 * Pitching stats from an array of pitching records
 * @param {Array} records - array of { innings, ponches, bases, hitsPermitidos, carrerasLimpias, gameId }
 * @returns {Object} stats
 */
export function calcPitching(records) {
  if (!records || records.length === 0) {
    return { JJ: 0, IL: '0.0', K: 0, BB: 0, HP: 0, CL: 0, ERA: '0.00' };
  }

  const gameIds = new Set(records.map(r => r.gameId));
  const JJ = gameIds.size;
  const totalInnings = records.reduce((s, r) => s + (r.innings || 0), 0);
  const K = records.reduce((s, r) => s + (r.ponches || 0), 0);
  const BB = records.reduce((s, r) => s + (r.bases || 0), 0);
  const HP = records.reduce((s, r) => s + (r.hitsPermitidos || 0), 0);
  const CL = records.reduce((s, r) => s + (r.carrerasLimpias || 0), 0);

  const era = totalInnings > 0 ? (CL / totalInnings) * INNINGS_DEFAULT : 0;

  return {
    JJ,
    IL: formatInnings(totalInnings),
    K, BB, HP, CL,
    ERA: era.toFixed(2),
  };
}

/**
 * Fielding stats from an array of fielding records
 * @param {Array} records - array of { outs, asistencias, errores, gameId }
 * @returns {Object} stats
 */
export function calcFielding(records) {
  if (!records || records.length === 0) {
    return { JJ: 0, O: 0, A: 0, E: 0, FPCT: '.000' };
  }

  const gameIds = new Set(records.map(r => r.gameId));
  const JJ = gameIds.size;
  const O = records.reduce((s, r) => s + (r.outs || 0), 0);
  const A = records.reduce((s, r) => s + (r.asistencias || 0), 0);
  const E = records.reduce((s, r) => s + (r.errores || 0), 0);
  const total = O + A + E;
  const fpct = total > 0 ? (O + A) / total : 0;

  return { JJ, O, A, E, FPCT: formatAvg(fpct) };
}

function formatAvg(n) {
  if (n >= 1) return n.toFixed(3);
  return n.toFixed(3).replace('0.', '.');
}

function formatInnings(n) {
  const full = Math.floor(n);
  const frac = n - full;
  if (frac < 0.16) return `${full}.0`;
  if (frac < 0.5) return `${full}.1`;
  return `${full}.2`;
}
