// library.js — PURE data: bundled read-only preset scenes (tactics & drills).
// A preset's `scene` is a normal goalpad scene; loading copies it onto the board.

export const LIBRARY = [
  {
    id: 'tac-2v1',
    name: '2v1 attack',
    category: 'tactics',
    group: 'Small-sided',
    description: 'Draw the defender, slip the pass',
    scene: {
      name: '2v1 attack',
      field: { preset: 'custom', half: 'full' },
      pieces: [
        { id: 'A1', kind: 'player', team: 'A', number: 1 },
        { id: 'A2', kind: 'player', team: 'A', number: 2 },
        { id: 'B1', kind: 'player', team: 'B', number: 1 },
        { id: 'ball', kind: 'ball' },
      ],
      frames: [
        { positions: { A1: { x: 90, y: 150 }, A2: { x: 90, y: 90 }, B1: { x: 240, y: 150 }, ball: { x: 100, y: 155 } }, markup: [] },
        { positions: { A1: { x: 180, y: 150 }, A2: { x: 200, y: 90 }, B1: { x: 215, y: 150 }, ball: { x: 190, y: 155 } }, markup: [{ type: 'arrow', x1: 195, y1: 148, x2: 205, y2: 98 }] },
        { positions: { A1: { x: 180, y: 150 }, A2: { x: 235, y: 80 }, B1: { x: 215, y: 150 }, ball: { x: 225, y: 85 } }, markup: [{ type: 'arrow', x1: 245, y1: 78, x2: 360, y2: 150 }] },
      ],
    },
  },
  {
    id: 'drl-rondo',
    name: 'Rondo 5v2',
    category: 'drills',
    group: 'Possession',
    description: 'Keep-ball circle, two in the middle',
    scene: {
      name: 'Rondo 5v2',
      field: { preset: 'custom', half: 'full' },
      pieces: [
        { id: 'A1', kind: 'player', team: 'A', number: 1 },
        { id: 'A2', kind: 'player', team: 'A', number: 2 },
        { id: 'A3', kind: 'player', team: 'A', number: 3 },
        { id: 'A4', kind: 'player', team: 'A', number: 4 },
        { id: 'A5', kind: 'player', team: 'A', number: 5 },
        { id: 'B1', kind: 'player', team: 'B', number: 1 },
        { id: 'B2', kind: 'player', team: 'B', number: 2 },
        { id: 'ball', kind: 'ball' },
      ],
      frames: [
        { positions: { A1: { x: 200, y: 45 }, A2: { x: 305, y: 110 }, A3: { x: 265, y: 240 }, A4: { x: 135, y: 240 }, A5: { x: 95, y: 110 }, B1: { x: 180, y: 150 }, B2: { x: 230, y: 150 }, ball: { x: 200, y: 62 } }, markup: [] },
        { positions: { A1: { x: 200, y: 45 }, A2: { x: 305, y: 110 }, A3: { x: 265, y: 240 }, A4: { x: 135, y: 240 }, A5: { x: 95, y: 110 }, B1: { x: 245, y: 120 }, B2: { x: 210, y: 158 }, ball: { x: 297, y: 113 } }, markup: [{ type: 'arrow', x1: 205, y1: 55, x2: 292, y2: 108 }] },
        { positions: { A1: { x: 200, y: 45 }, A2: { x: 305, y: 110 }, A3: { x: 265, y: 240 }, A4: { x: 135, y: 240 }, A5: { x: 95, y: 110 }, B1: { x: 250, y: 178 }, B2: { x: 220, y: 185 }, ball: { x: 258, y: 222 } }, markup: [{ type: 'arrow', x1: 300, y1: 120, x2: 262, y2: 215 }] },
      ],
    },
  },
];
