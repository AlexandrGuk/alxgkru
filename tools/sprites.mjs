import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const palette = {
    K: '#03050c',
    W: '#ffffff',
    L: '#c2cbd8',
    B: '#38d9ff',
    D: '#176b87',
    O: '#ff8c00',
    Y: '#ffb347',
    G: '#2eff7b',
    E: '#169c48',
    R: '#ff2a4b'
};

const sprites = {
    gpu: [
        '................',
        '................',
        '................',
        '.KKKKKKKKKKKKKK.',
        'KLLLLLLLLLLLLLLK',
        'KLKKKKKLLKKKKKLK',
        'KLKBWBKLLKBWBKLK',
        'KLKWBWKLLKWBWKLK',
        'KLKBWBKLLKBWBKLK',
        'KLKKKKKLLKKKKKLK',
        'KLLLLLLLLLLOOOLK',
        '.KKKKKKKKKKKKKK.',
        '...KYKYKYKYK....',
        '...KKKKKKKKK....',
        '................',
        '................'
    ],
    json: [
        '................',
        '................',
        '...WWW....WWW...',
        '..WW........WW..',
        '..WW........WW..',
        '..WW...OO...WW..',
        '..WW...OO...WW..',
        'WWW..........WWW',
        'WWW..........WWW',
        '..WW...OO...WW..',
        '..WW...OO...WW..',
        '..WW........WW..',
        '..WW........WW..',
        '...WWW....WWW...',
        '................',
        '................'
    ],
    html: [
        '................',
        '................',
        '................',
        '.........O......',
        '...WW....O.WW...',
        '..WW....O...WW..',
        '.WW.....O....WW.',
        'WW.....O......WW',
        '.WW....O.....WW.',
        '..WW...O....WW..',
        '...WW.O....WW...',
        '......O.........',
        '................',
        '................',
        '................',
        '................'
    ],
    ua: [
        '................',
        '....KKKKK.......',
        '...KWWWWWK......',
        '..KWBBBBBWK.....',
        '.KWBLLBBBBWK....',
        '.KWBLBBBBBWK....',
        '.KWBBBBBBBWK....',
        '.KWBBBBBBBWK....',
        '.KWBBBBBBBWK....',
        '..KWBBBBBWK.....',
        '...KWWWWWKK.....',
        '....KKKKKOOK....',
        '.........KOOK...',
        '..........KOOK..',
        '...........KOOK.',
        '............KK..'
    ],
    image: [
        '................',
        '................',
        'KKKKKKKKKKKKKKKK',
        'KWWWWWWWWWWWWWWK',
        'KWBBBBBBBBBBBBWK',
        'KWBBBBBBBBYYBBWK',
        'KWBBBBBBBBYYBBWK',
        'KWBBBGBBBBBBBBWK',
        'KWBBGGGBBBGBBBWK',
        'KWBGGGGGBGGGBBWK',
        'KWGGGGGGGGGGGBWK',
        'KWGGGGGGGGGGGGWK',
        'KWWWWWWWWWWWWWWK',
        'KKKKKKKKKKKKKKKK',
        '................',
        '................'
    ],
    cloud: [
        '................',
        '................',
        '................',
        '......KKKK......',
        '.....KWWWWK.....',
        '..KKKWWWWWWK....',
        '.KWWWWWWWWWWKK..',
        'KWWBBBBBBWBBWWK.',
        'KWWWWWWWWWWWWWWK',
        'KWWBBBWBBBBBWWWK',
        'KLWWWWWWWWWWWWLK',
        '.KLLLLLLLLLLLLK.',
        '..KKKKKKKKKKKK..',
        '................',
        '................',
        '................'
    ],
    key: [
        '................',
        '................',
        '................',
        '................',
        '..KKKK..........',
        '.KYYYYK.........',
        'KYYKKYYKKKKKKKK.',
        'KYK..KYYYYYYYYYK',
        'KYK..KYYYYYYYYYK',
        'KYYKKYYKKYYKYYK.',
        '.KYYYYK.KYYKYYK.',
        '..KKKK..KKKKKKK.',
        '................',
        '................',
        '................',
        '................'
    ],
    forest: [
        '.......KK.......',
        '......KGGK......',
        '.....KGGGEK.....',
        '....KGGGGEEK....',
        '.....KGGEEK.....',
        '....KGGGGEEK....',
        '...KGGGGGGEEK...',
        '..KGGGGGGGGEEK..',
        '....KGGGGEEK....',
        '...KGGGGGGEEK...',
        '..KGGGGGGGGEEK..',
        '.KGGGGGGGGGGEEK.',
        '.KKKKKKOOKKKKKK.',
        '......KOOK......',
        '......KOOK......',
        '......KKKK......'
    ],
    cursor: [
        'O....',
        'OO...',
        'OOO..',
        'OOOO.',
        'OOOOO',
        'OOOO.',
        'OOO..',
        'OO...',
        'O....'
    ]
};

const outDir = process.argv[2];
mkdirSync(outDir, { recursive: true });

for (const [name, rows] of Object.entries(sprites)) {
    const width = rows[0].length;
    const paths = {};
    rows.forEach((row, y) => {
        if (row.length !== width) {
            throw new Error(`${name}: row ${y} has ${row.length} cells, expected ${width}`);
        }
        let x = 0;
        while (x < width) {
            const cell = row[x];
            let end = x;
            while (end < width && row[end] === cell) end++;
            if (cell !== '.') {
                if (!palette[cell]) throw new Error(`${name}: unknown color ${cell}`);
                paths[cell] = (paths[cell] || '') + `M${x} ${y}h${end - x}v1h-${end - x}z`;
            }
            x = end;
        }
    });
    const body = Object.entries(paths)
        .map(([cell, d]) => `<path fill="${palette[cell]}" d="${d}"/>`)
        .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${rows.length}" shape-rendering="crispEdges">${body}</svg>\n`;
    writeFileSync(join(outDir, `${name}.svg`), svg);
    console.log(`${name}.svg ${width}x${rows.length} ${svg.length}b`);
}
