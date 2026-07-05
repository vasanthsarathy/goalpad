// library.js — PURE data: bundled read-only preset scenes (tactics & drills).
// A preset's `scene` is a normal goalpad scene; loading copies it onto the board.
// Season presets (cue-word tactics + 8-week drills) live in library-season.js.

import { SEASON } from './library-season.js';

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

  {
    id: 'tac-3v2',
    name: '3v2 attack',
    category: 'tactics',
    group: 'Small-sided',
    description: 'Overload, find the free man',
    scene: {
      name: '3v2 attack',
      field: { preset: 'custom', half: 'full' },
      pieces: [
        { id: 'A1', kind: 'player', team: 'A', number: 1 },
        { id: 'A2', kind: 'player', team: 'A', number: 2 },
        { id: 'A3', kind: 'player', team: 'A', number: 3 },
        { id: 'B1', kind: 'player', team: 'B', number: 1 },
        { id: 'B2', kind: 'player', team: 'B', number: 2 },
        { id: 'ball', kind: 'ball' },
      ],
      frames: [
        { positions: { A1: { x: 80, y: 150 }, A2: { x: 90, y: 75 }, A3: { x: 90, y: 225 }, B1: { x: 230, y: 110 }, B2: { x: 230, y: 190 }, ball: { x: 90, y: 155 } }, markup: [] },
        { positions: { A1: { x: 170, y: 150 }, A2: { x: 205, y: 70 }, A3: { x: 205, y: 230 }, B1: { x: 200, y: 125 }, B2: { x: 200, y: 180 }, ball: { x: 180, y: 152 } }, markup: [{ type: 'arrow', x1: 185, y1: 145, x2: 215, y2: 80 }] },
        { positions: { A1: { x: 170, y: 150 }, A2: { x: 255, y: 62 }, A3: { x: 205, y: 230 }, B1: { x: 200, y: 125 }, B2: { x: 200, y: 180 }, ball: { x: 245, y: 70 } }, markup: [{ type: 'arrow', x1: 262, y1: 60, x2: 370, y2: 130 }] },
      ],
    },
  },

  {
    id: 'tac-overlap',
    name: 'Overlap',
    category: 'tactics',
    group: 'Attacking patterns',
    description: 'Full-back overlaps the winger',
    scene: {
      name: 'Overlap',
      field: { preset: 'custom', half: 'full' },
      pieces: [
        { id: 'A1', kind: 'player', team: 'A', number: 1 },
        { id: 'A2', kind: 'player', team: 'A', number: 2 },
        { id: 'A3', kind: 'player', team: 'A', number: 3 },
        { id: 'B1', kind: 'player', team: 'B', number: 1 },
        { id: 'ball', kind: 'ball' },
      ],
      frames: [
        { positions: { A1: { x: 180, y: 240 }, A2: { x: 110, y: 245 }, A3: { x: 305, y: 110 }, B1: { x: 235, y: 220 }, ball: { x: 190, y: 245 } }, markup: [] },
        { positions: { A1: { x: 180, y: 240 }, A2: { x: 255, y: 258 }, A3: { x: 320, y: 110 }, B1: { x: 222, y: 214 }, ball: { x: 190, y: 245 } }, markup: [{ type: 'arrow', x1: 120, y1: 245, x2: 248, y2: 258 }] },
        { positions: { A1: { x: 205, y: 235 }, A2: { x: 300, y: 250 }, A3: { x: 330, y: 108 }, B1: { x: 222, y: 214 }, ball: { x: 300, y: 250 } }, markup: [{ type: 'arrow', x1: 300, y1: 244, x2: 335, y2: 118 }] },
      ],
    },
  },

  {
    id: 'tac-give-go',
    name: 'Give-and-go',
    category: 'tactics',
    group: 'Attacking patterns',
    description: 'One-two around the defender',
    scene: {
      name: 'Give-and-go',
      field: { preset: 'custom', half: 'full' },
      pieces: [
        { id: 'A1', kind: 'player', team: 'A', number: 1 },
        { id: 'A2', kind: 'player', team: 'A', number: 2 },
        { id: 'B1', kind: 'player', team: 'B', number: 1 },
        { id: 'ball', kind: 'ball' },
      ],
      frames: [
        { positions: { A1: { x: 100, y: 150 }, A2: { x: 185, y: 88 }, B1: { x: 210, y: 150 }, ball: { x: 110, y: 152 } }, markup: [] },
        { positions: { A1: { x: 235, y: 128 }, A2: { x: 190, y: 90 }, B1: { x: 220, y: 155 }, ball: { x: 190, y: 92 } }, markup: [{ type: 'arrow', x1: 115, y1: 148, x2: 183, y2: 95 }] },
        { positions: { A1: { x: 295, y: 118 }, A2: { x: 190, y: 90 }, B1: { x: 220, y: 155 }, ball: { x: 285, y: 116 } }, markup: [{ type: 'arrow', x1: 195, y1: 95, x2: 282, y2: 116 }] },
      ],
    },
  },

  {
    id: 'tac-third-man',
    name: 'Third-man run',
    category: 'tactics',
    group: 'Attacking patterns',
    description: 'Set, release the runner beyond',
    scene: {
      name: 'Third-man run',
      field: { preset: 'custom', half: 'full' },
      pieces: [
        { id: 'A1', kind: 'player', team: 'A', number: 1 },
        { id: 'A2', kind: 'player', team: 'A', number: 2 },
        { id: 'A3', kind: 'player', team: 'A', number: 3 },
        { id: 'B1', kind: 'player', team: 'B', number: 1 },
        { id: 'ball', kind: 'ball' },
      ],
      frames: [
        { positions: { A1: { x: 90, y: 150 }, A2: { x: 190, y: 150 }, A3: { x: 120, y: 250 }, B1: { x: 245, y: 150 }, ball: { x: 100, y: 152 } }, markup: [] },
        { positions: { A1: { x: 120, y: 160 }, A2: { x: 190, y: 150 }, A3: { x: 225, y: 218 }, B1: { x: 250, y: 150 }, ball: { x: 180, y: 150 } }, markup: [{ type: 'arrow', x1: 100, y1: 150, x2: 175, y2: 150 }, { type: 'arrow', x1: 130, y1: 245, x2: 220, y2: 213 }] },
        { positions: { A1: { x: 120, y: 160 }, A2: { x: 190, y: 150 }, A3: { x: 320, y: 168 }, B1: { x: 250, y: 150 }, ball: { x: 305, y: 172 } }, markup: [{ type: 'arrow', x1: 197, y1: 148, x2: 300, y2: 172 }] },
      ],
    },
  },

  {
    id: 'tac-switch',
    name: 'Switch of play',
    category: 'tactics',
    group: 'Attacking patterns',
    description: 'Swing it to the far side',
    scene: {
      name: 'Switch of play',
      field: { preset: 'custom', half: 'full' },
      pieces: [
        { id: 'A1', kind: 'player', team: 'A', number: 1 },
        { id: 'A2', kind: 'player', team: 'A', number: 2 },
        { id: 'A3', kind: 'player', team: 'A', number: 3 },
        { id: 'B1', kind: 'player', team: 'B', number: 1 },
        { id: 'B2', kind: 'player', team: 'B', number: 2 },
        { id: 'ball', kind: 'ball' },
      ],
      frames: [
        { positions: { A1: { x: 70, y: 90 }, A2: { x: 200, y: 150 }, A3: { x: 340, y: 215 }, B1: { x: 110, y: 110 }, B2: { x: 150, y: 150 }, ball: { x: 80, y: 95 } }, markup: [] },
        { positions: { A1: { x: 80, y: 100 }, A2: { x: 200, y: 150 }, A3: { x: 340, y: 215 }, B1: { x: 150, y: 130 }, B2: { x: 190, y: 160 }, ball: { x: 200, y: 150 } }, markup: [{ type: 'arrow', x1: 88, y1: 98, x2: 193, y2: 148 }] },
        { positions: { A1: { x: 80, y: 100 }, A2: { x: 200, y: 150 }, A3: { x: 340, y: 210 }, B1: { x: 190, y: 150 }, B2: { x: 220, y: 165 }, ball: { x: 330, y: 205 } }, markup: [{ type: 'arrow', x1: 208, y1: 152, x2: 328, y2: 203 }] },
      ],
    },
  },

  {
    id: 'tac-corner',
    name: 'Corner — near post',
    category: 'tactics',
    group: 'Set pieces',
    description: 'Near-post flick-on',
    scene: {
      name: 'Corner — near post',
      field: { preset: '11v11', half: 'right' },
      pieces: [
        { id: 'A1', kind: 'player', team: 'A', number: 1 },
        { id: 'A2', kind: 'player', team: 'A', number: 2 },
        { id: 'A3', kind: 'player', team: 'A', number: 3 },
        { id: 'B1', kind: 'player', team: 'B', number: 1 },
        { id: 'B2', kind: 'player', team: 'B', number: 2 },
        { id: 'ball', kind: 'ball' },
      ],
      frames: [
        { positions: { A1: { x: 500, y: 30 }, A2: { x: 320, y: 300 }, A3: { x: 340, y: 430 }, B1: { x: 450, y: 350 }, B2: { x: 505, y: 340 }, ball: { x: 512, y: 18 } }, markup: [] },
        { positions: { A1: { x: 500, y: 30 }, A2: { x: 455, y: 255 }, A3: { x: 375, y: 415 }, B1: { x: 455, y: 360 }, B2: { x: 505, y: 340 }, ball: { x: 512, y: 18 } }, markup: [{ type: 'arrow', x1: 325, y1: 300, x2: 452, y2: 260 }] },
        { positions: { A1: { x: 500, y: 30 }, A2: { x: 462, y: 245 }, A3: { x: 420, y: 380 }, B1: { x: 455, y: 360 }, B2: { x: 500, y: 300 }, ball: { x: 470, y: 240 } }, markup: [{ type: 'arrow', x1: 505, y1: 28, x2: 472, y2: 238 }, { type: 'arrow', x1: 460, y1: 250, x2: 425, y2: 375 }] },
      ],
    },
  },

  {
    id: 'tac-throw-in',
    name: 'Attacking throw-in',
    category: 'tactics',
    group: 'Set pieces',
    description: 'Throw, lay-off, go',
    scene: {
      name: 'Attacking throw-in',
      field: { preset: '11v11', half: 'right' },
      pieces: [
        { id: 'A1', kind: 'player', team: 'A', number: 1 },
        { id: 'A2', kind: 'player', team: 'A', number: 2 },
        { id: 'A3', kind: 'player', team: 'A', number: 3 },
        { id: 'B1', kind: 'player', team: 'B', number: 1 },
        { id: 'ball', kind: 'ball' },
      ],
      frames: [
        { positions: { A1: { x: 240, y: 30 }, A2: { x: 300, y: 150 }, A3: { x: 220, y: 260 }, B1: { x: 320, y: 130 }, ball: { x: 240, y: 22 } }, markup: [] },
        { positions: { A1: { x: 240, y: 40 }, A2: { x: 265, y: 90 }, A3: { x: 250, y: 270 }, B1: { x: 300, y: 120 }, ball: { x: 262, y: 92 } }, markup: [{ type: 'arrow', x1: 240, y1: 30, x2: 262, y2: 86 }] },
        { positions: { A1: { x: 250, y: 60 }, A2: { x: 265, y: 90 }, A3: { x: 320, y: 300 }, B1: { x: 300, y: 120 }, ball: { x: 310, y: 295 } }, markup: [{ type: 'arrow', x1: 262, y1: 98, x2: 305, y2: 290 }] },
      ],
    },
  },

  {
    id: 'tac-free-kick',
    name: 'Free-kick — screen & shot',
    category: 'tactics',
    group: 'Set pieces',
    description: 'Screen the keeper, strike',
    scene: {
      name: 'Free-kick — screen & shot',
      field: { preset: '11v11', half: 'right' },
      pieces: [
        { id: 'A1', kind: 'player', team: 'A', number: 1 },
        { id: 'A2', kind: 'player', team: 'A', number: 2 },
        { id: 'B1', kind: 'player', team: 'B', number: 1 },
        { id: 'B2', kind: 'player', team: 'B', number: 2 },
        { id: 'B3', kind: 'player', team: 'B', number: 3 },
        { id: 'B4', kind: 'player', team: 'B', number: 4 },
        { id: 'ball', kind: 'ball' },
      ],
      frames: [
        { positions: { A1: { x: 300, y: 260 }, A2: { x: 250, y: 340 }, B1: { x: 380, y: 300 }, B2: { x: 380, y: 340 }, B3: { x: 380, y: 380 }, B4: { x: 505, y: 340 }, ball: { x: 292, y: 268 } }, markup: [] },
        { positions: { A1: { x: 300, y: 260 }, A2: { x: 350, y: 320 }, B1: { x: 380, y: 300 }, B2: { x: 380, y: 340 }, B3: { x: 380, y: 380 }, B4: { x: 505, y: 340 }, ball: { x: 292, y: 268 } }, markup: [{ type: 'arrow', x1: 255, y1: 340, x2: 350, y2: 322 }] },
        { positions: { A1: { x: 300, y: 260 }, A2: { x: 360, y: 320 }, B1: { x: 380, y: 300 }, B2: { x: 380, y: 340 }, B3: { x: 380, y: 380 }, B4: { x: 508, y: 300 }, ball: { x: 505, y: 250 } }, markup: [{ type: 'arrow', x1: 296, y1: 265, x2: 502, y2: 250 }] },
      ],
    },
  },

  {
    id: 'drl-passing-y',
    name: 'Passing pattern — Y-drill',
    category: 'drills',
    group: 'Possession',
    description: 'Combination through the cones',
    scene: {
      name: 'Passing pattern — Y-drill',
      field: { preset: 'custom', half: 'full' },
      pieces: [
        { id: 'A1', kind: 'player', team: 'A', number: 1 },
        { id: 'A2', kind: 'player', team: 'A', number: 2 },
        { id: 'A3', kind: 'player', team: 'A', number: 3 },
        { id: 'cone-1', kind: 'cone' },
        { id: 'cone-2', kind: 'cone' },
        { id: 'cone-3', kind: 'cone' },
        { id: 'ball', kind: 'ball' },
      ],
      frames: [
        { positions: { A1: { x: 200, y: 250 }, A2: { x: 200, y: 140 }, A3: { x: 300, y: 80 }, 'cone-1': { x: 200, y: 200 }, 'cone-2': { x: 150, y: 90 }, 'cone-3': { x: 300, y: 130 }, ball: { x: 208, y: 248 } }, markup: [] },
        { positions: { A1: { x: 200, y: 250 }, A2: { x: 200, y: 140 }, A3: { x: 300, y: 80 }, 'cone-1': { x: 200, y: 200 }, 'cone-2': { x: 150, y: 90 }, 'cone-3': { x: 300, y: 130 }, ball: { x: 200, y: 148 } }, markup: [{ type: 'arrow', x1: 205, y1: 242, x2: 200, y2: 155 }] },
        { positions: { A1: { x: 200, y: 250 }, A2: { x: 200, y: 140 }, A3: { x: 300, y: 80 }, 'cone-1': { x: 200, y: 200 }, 'cone-2': { x: 150, y: 90 }, 'cone-3': { x: 300, y: 130 }, ball: { x: 295, y: 85 } }, markup: [{ type: 'arrow', x1: 208, y1: 135, x2: 292, y2: 82 }] },
      ],
    },
  },

  {
    id: 'drl-finishing',
    name: 'Finishing drill',
    category: 'drills',
    group: 'Finishing',
    description: 'Pass, run, shoot',
    scene: {
      name: 'Finishing drill',
      field: { preset: '11v11', half: 'right' },
      pieces: [
        { id: 'A1', kind: 'player', team: 'A', number: 1 },
        { id: 'A2', kind: 'player', team: 'A', number: 2 },
        { id: 'B1', kind: 'player', team: 'B', number: 1 },
        { id: 'cone-1', kind: 'cone' },
        { id: 'ball', kind: 'ball' },
      ],
      frames: [
        { positions: { A1: { x: 200, y: 200 }, A2: { x: 260, y: 420 }, B1: { x: 505, y: 340 }, 'cone-1': { x: 300, y: 340 }, ball: { x: 208, y: 205 } }, markup: [] },
        { positions: { A1: { x: 205, y: 205 }, A2: { x: 340, y: 360 }, B1: { x: 505, y: 340 }, 'cone-1': { x: 300, y: 340 }, ball: { x: 330, y: 340 } }, markup: [{ type: 'arrow', x1: 212, y1: 208, x2: 322, y2: 338 }, { type: 'arrow', x1: 268, y1: 415, x2: 335, y2: 365 }] },
        { positions: { A1: { x: 205, y: 205 }, A2: { x: 355, y: 345 }, B1: { x: 500, y: 320 }, 'cone-1': { x: 300, y: 340 }, ball: { x: 505, y: 305 } }, markup: [{ type: 'arrow', x1: 360, y1: 342, x2: 502, y2: 305 }] },
      ],
    },
  },

  {
    id: 'drl-1v1',
    name: '1v1 defending',
    category: 'drills',
    group: 'Defending',
    description: 'Jockey and shepherd wide',
    scene: {
      name: '1v1 defending',
      field: { preset: 'custom', half: 'full' },
      pieces: [
        { id: 'A1', kind: 'player', team: 'A', number: 1 },
        { id: 'B1', kind: 'player', team: 'B', number: 1 },
        { id: 'cone-1', kind: 'cone' },
        { id: 'cone-2', kind: 'cone' },
        { id: 'ball', kind: 'ball' },
      ],
      frames: [
        { positions: { A1: { x: 90, y: 150 }, B1: { x: 260, y: 150 }, 'cone-1': { x: 370, y: 120 }, 'cone-2': { x: 370, y: 180 }, ball: { x: 100, y: 152 } }, markup: [] },
        { positions: { A1: { x: 175, y: 150 }, B1: { x: 235, y: 150 }, 'cone-1': { x: 370, y: 120 }, 'cone-2': { x: 370, y: 180 }, ball: { x: 185, y: 152 } }, markup: [{ type: 'arrow', x1: 105, y1: 150, x2: 168, y2: 150 }] },
        { positions: { A1: { x: 230, y: 215 }, B1: { x: 250, y: 185 }, 'cone-1': { x: 370, y: 120 }, 'cone-2': { x: 370, y: 180 }, ball: { x: 238, y: 216 } }, markup: [{ type: 'arrow', x1: 185, y1: 155, x2: 228, y2: 208 }] },
      ],
    },
  },

  {
    id: 'drl-warmup',
    name: 'Warm-up passing grid',
    category: 'drills',
    group: 'Warm-up',
    description: 'Pass and follow around the grid',
    scene: {
      name: 'Warm-up passing grid',
      field: { preset: 'custom', half: 'full' },
      pieces: [
        { id: 'A1', kind: 'player', team: 'A', number: 1 },
        { id: 'A2', kind: 'player', team: 'A', number: 2 },
        { id: 'A3', kind: 'player', team: 'A', number: 3 },
        { id: 'A4', kind: 'player', team: 'A', number: 4 },
        { id: 'cone-1', kind: 'cone' },
        { id: 'cone-2', kind: 'cone' },
        { id: 'cone-3', kind: 'cone' },
        { id: 'cone-4', kind: 'cone' },
        { id: 'ball', kind: 'ball' },
      ],
      frames: [
        { positions: { A1: { x: 110, y: 90 }, A2: { x: 290, y: 90 }, A3: { x: 290, y: 210 }, A4: { x: 110, y: 210 }, 'cone-1': { x: 110, y: 90 }, 'cone-2': { x: 290, y: 90 }, 'cone-3': { x: 290, y: 210 }, 'cone-4': { x: 110, y: 210 }, ball: { x: 118, y: 96 } }, markup: [] },
        { positions: { A1: { x: 160, y: 90 }, A2: { x: 290, y: 90 }, A3: { x: 290, y: 210 }, A4: { x: 110, y: 210 }, 'cone-1': { x: 110, y: 90 }, 'cone-2': { x: 290, y: 90 }, 'cone-3': { x: 290, y: 210 }, 'cone-4': { x: 110, y: 210 }, ball: { x: 282, y: 92 } }, markup: [{ type: 'arrow', x1: 125, y1: 92, x2: 278, y2: 90 }] },
        { positions: { A1: { x: 250, y: 90 }, A2: { x: 290, y: 140 }, A3: { x: 290, y: 210 }, A4: { x: 110, y: 210 }, 'cone-1': { x: 110, y: 90 }, 'cone-2': { x: 290, y: 90 }, 'cone-3': { x: 290, y: 210 }, 'cone-4': { x: 110, y: 210 }, ball: { x: 288, y: 200 } }, markup: [{ type: 'arrow', x1: 292, y1: 100, x2: 290, y2: 195 }] },
      ],
    },
  },

  // Season presets appended below (see library-season.js).
  ...SEASON,
];
