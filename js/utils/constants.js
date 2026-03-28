// Pocket Coach — Constantes
export const POSICIONES = ['P', 'C', '1B', '2B', '3B', 'SS', 'SF', 'LF', 'CF', 'RF', 'D', 'A'];

export const POSICIONES_LABELS = {
  P: 'Pitcher', C: 'Catcher', '1B': 'Primera Base', '2B': 'Segunda Base',
  '3B': 'Tercera Base', SS: 'Short Stop', SF: 'Short Field', LF: 'Left Field', CF: 'Center Field',
  RF: 'Right Field', D: 'Designada', A: 'Bateadora Asignada'
};

export const RESULTADOS_BATEO = {
  hits: ['1B', '2B', '3B', 'HR'],
  outs: ['K', 'FO', 'GO', 'LO', 'DP'],
  otros: ['BB', 'HBP', 'SAC', 'FC', 'E']
};

export const RESULTADO_LABELS = {
  '1B': 'Sencillo', '2B': 'Doble', '3B': 'Triple', HR: 'Jonrón',
  K: 'Ponche', FO: 'Fly Out', GO: 'Ground Out', LO: 'Line Out', DP: 'Doble Play',
  BB: 'Base por Bola', HBP: 'Golpeada', SAC: 'Sacrificio', FC: "Fielder's Choice", E: 'Error'
};

export const RESULTADO_COLORS = {
  '1B': '#4caf50', '2B': '#8bc34a', '3B': '#ff9800', HR: '#f44336',
  K: '#9e9e9e', FO: '#9e9e9e', GO: '#9e9e9e', LO: '#9e9e9e', DP: '#795548',
  BB: '#2196f3', HBP: '#2196f3', SAC: '#607d8b', FC: '#607d8b', E: '#ff5722'
};

export const INNINGS_DEFAULT = 7;
