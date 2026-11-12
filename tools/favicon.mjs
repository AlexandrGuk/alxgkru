import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const palette = {
    K: [5, 7, 26, 255],
    W: [230, 233, 255, 255],
    B: [42, 54, 154, 255],
    D: [30, 40, 118, 255],
    N: [18, 26, 82, 255],
    O: [255, 140, 0, 255],
    '.': [0, 0, 0, 0]
};

const grid = [
    '..KKKKKKKKKKKK..',
    '.KWWWWWWWWWWWWK.',
    'KWWBBBBBBBBBBWWK',
    'KWBBBBBBBBBBBBWK',
    'KWBBOOBBBBBBBBWK',
    'KWBBOOOOBBBBBBWK',
    'KWDDOOOOOODDDDWK',
    'KWDDOOOOOOOODDWK',
    'KWDDOOOOOOOODDWK',
    'KWDDOOOOOODDDDWK',
    'KWNNOOOONNNNNNWK',
    'KWNNOONNNNNNNNWK',
    'KWNNNNNNNNNNNNWK',
    'KWWNNNNNNNNNNWWK',
    '.KWWWWWWWWWWWWK.',
    '..KKKKKKKKKKKK..'
];

const scale = 12;
const size = grid.length * scale;
const raw = Buffer.alloc((size * 4 + 1) * size);

for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
        const color = palette[grid[Math.floor(y / scale)][Math.floor(x / scale)]];
        raw.set(color, row + 1 + x * 4);
    }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});

const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
};

const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 6;

writeFileSync(process.argv[2], Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
]));
