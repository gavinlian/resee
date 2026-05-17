const fs = require('fs');
const path = require('path');

// 简单的PNG生成器 - 创建纯色方块图标
function createSimplePNG(width, height, r, g, b) {
  // PNG文件头
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdr = Buffer.concat([
    Buffer.from([0, 0, 0, 13]),
    Buffer.from('IHDR'),
    ihdrData,
    uint32ToBuffer(ihdrCrc)
  ]);

  // IDAT chunk - 简单的未压缩图像数据
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      rawData.push(r, g, b);
    }
  }

  // 使用 zlib 压缩
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));

  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(compressed.length, 0);
  const idat = Buffer.concat([
    idatLen,
    Buffer.from('IDAT'),
    compressed,
    uint32ToBuffer(idatCrc)
  ]);

  // IEND chunk
  const iendCrc = crc32(Buffer.from('IEND'));
  const iend = Buffer.concat([
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('IEND'),
    uint32ToBuffer(iendCrc)
  ]);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function uint32ToBuffer(val) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(val >>> 0, 0);
  return buf;
}

// CRC32 implementation
function crc32(data) {
  let crc = 0xffffffff;
  const table = [];

  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

const tabsDir = path.join(__dirname, 'static', 'tabs');

// 创建图标 - 24x24 暖棕色系
const normalColor = { r: 139, g: 123, b: 107 }; // #8B7B6B
const activeColor = { r: 139, g: 111, b: 71 };   // #8B6F47

const icons = [
  { name: 'home', icon: createHomeSVG(normalColor.r, normalColor.g, normalColor.b), active: createHomeSVG(activeColor.r, activeColor.g, activeColor.b) },
  { name: 'tree', icon: createTreeSVG(normalColor.r, normalColor.g, normalColor.b), active: createTreeSVG(activeColor.r, activeColor.g, activeColor.b) },
  { name: 'graph', icon: createGraphSVG(normalColor.r, normalColor.g, normalColor.b), active: createGraphSVG(activeColor.r, activeColor.g, activeColor.b) },
  { name: 'search', icon: createSearchSVG(normalColor.r, normalColor.g, normalColor.b), active: createSearchSVG(activeColor.r, activeColor.g, activeColor.b) },
  { name: 'mine', icon: createMineSVG(normalColor.r, normalColor.g, normalColor.b), active: createMineSVG(activeColor.r, activeColor.g, activeColor.b) }
];

// 简单的形状创建函数 - 输出带shape指令的像素数组
function createSimpleBMP(width, height, color, shapes) {
  const pixels = [];
  for (let y = 0; y < height; y++) {
    pixels.push([]);
    for (let x = 0; x < width; x++) {
      let filled = false;
      for (const s of shapes) {
        if (s.type === 'rect' && x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) filled = true;
        if (s.type === 'circle') {
          const cx = s.cx, cy = s.cy, r = s.r;
          if ((x-cx)*(x-cx) + (y-cy)*(y-cy) <= r*r) filled = true;
        }
      }
      pixels[y].push(filled ? [color.r, color.g, color.b] : [255, 255, 255]);
    }
  }
  return pixels;
}

function createPNGFromBMP(bmp) {
  const height = bmp.length;
  const width = bmp[0].length;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdr = Buffer.concat([Buffer.from([0, 0, 0, 13]), Buffer.from('IHDR'), ihdrData, uint32ToBuffer(ihdrCrc)]);

  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0);
    for (let x = 0; x < width; x++) {
      rawData.push(bmp[y][x][0], bmp[y][x][1], bmp[y][x][2]);
    }
  }

  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(compressed.length, 0);
  const idat = Buffer.concat([idatLen, Buffer.from('IDAT'), compressed, uint32ToBuffer(idatCrc)]);

  const iendCrc = crc32(Buffer.from('IEND'));
  const iend = Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from('IEND'), uint32ToBuffer(iendCrc)]);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// 创建各个图标
function createHomeSVG(r, g, b) {
  // 房子形状
  const shapes = [
    { type: 'rect', x: 8, y: 12, w: 8, h: 8 }, // 屋身
    { type: 'rect', x: 6, y: 14, w: 12, h: 6 }, // 屋身
    // 屋顶三角形用圆形模拟
    { type: 'circle', cx: 12, cy: 8, r: 6 },
  ];
  return createSimpleBMP(24, 24, {r, g, b}, shapes);
}

function createTreeSVG(r, g, b) {
  // 树形 - 三角形
  const shapes = [
    { type: 'circle', cx: 12, cy: 6, r: 5 },
    { type: 'circle', cx: 8, cy: 12, r: 4 },
    { type: 'circle', cx: 16, cy: 12, r: 4 },
    { type: 'circle', cx: 12, cy: 16, r: 4 },
    { type: 'rect', x: 10, y: 18, w: 4, h: 4 },
  ];
  return createSimpleBMP(24, 24, {r, g, b}, shapes);
}

function createGraphSVG(r, g, b) {
  // 关系图 - 三个圆加连线
  const shapes = [
    { type: 'circle', cx: 6, cy: 6, r: 3 },
    { type: 'circle', cx: 18, cy: 6, r: 3 },
    { type: 'circle', cx: 12, cy: 18, r: 3 },
    { type: 'rect', x: 7, y: 7, w: 12, h: 12 }, // 连线区域用矩形模拟
  ];
  return createSimpleBMP(24, 24, {r, g, b}, shapes);
}

function createSearchSVG(r, g, b) {
  // 放大镜
  const shapes = [
    { type: 'circle', cx: 10, cy: 10, r: 5 },
    { type: 'rect', x: 13, y: 13, w: 8, h: 3 },
  ];
  return createSimpleBMP(24, 24, {r, g, b}, shapes);
}

function createMineSVG(r, g, b) {
  // 人形
  const shapes = [
    { type: 'circle', cx: 12, cy: 6, r: 4 }, // 头
    { type: 'circle', cx: 12, cy: 18, r: 5 }, // 身体
  ];
  return createSimpleBMP(24, 24, {r, g, b}, shapes);
}

async function main() {
  console.log('Creating PNG icons...');

  const baseDir = 'e:/resee/uiapp/static/tabs';

  // Delete old files first
  try {
    require('fs').unlinkSync(path.join(baseDir, 'home.png'));
    require('fs').unlinkSync(path.join(baseDir, 'home-active.png'));
    require('fs').unlinkSync(path.join(baseDir, 'tree.png'));
    require('fs').unlinkSync(path.join(baseDir, 'tree-active.png'));
    require('fs').unlinkSync(path.join(baseDir, 'graph.png'));
    require('fs').unlinkSync(path.join(baseDir, 'graph-active.png'));
    require('fs').unlinkSync(path.join(baseDir, 'search.png'));
    require('fs').unlinkSync(path.join(baseDir, 'search-active.png'));
    require('fs').unlinkSync(path.join(baseDir, 'mine.png'));
    require('fs').unlinkSync(path.join(baseDir, 'mine-active.png'));
  } catch(e) {}

  // Create home icon
  const homeBmp = createHomeSVG(139, 123, 107);
  fs.writeFileSync(path.join(baseDir, 'home.png'), createPNGFromBMP(homeBmp));
  const homeActiveBmp = createHomeSVG(139, 111, 71);
  fs.writeFileSync(path.join(baseDir, 'home-active.png'), createPNGFromBMP(homeActiveBmp));

  // Create tree icon
  const treeBmp = createTreeSVG(139, 123, 107);
  fs.writeFileSync(path.join(baseDir, 'tree.png'), createPNGFromBMP(treeBmp));
  const treeActiveBmp = createTreeSVG(139, 111, 71);
  fs.writeFileSync(path.join(baseDir, 'tree-active.png'), createPNGFromBMP(treeActiveBmp));

  // Create graph icon
  const graphBmp = createGraphSVG(139, 123, 107);
  fs.writeFileSync(path.join(baseDir, 'graph.png'), createPNGFromBMP(graphBmp));
  const graphActiveBmp = createGraphSVG(139, 111, 71);
  fs.writeFileSync(path.join(baseDir, 'graph-active.png'), createPNGFromBMP(graphActiveBmp));

  // Create search icon
  const searchBmp = createSearchSVG(139, 123, 107);
  fs.writeFileSync(path.join(baseDir, 'search.png'), createPNGFromBMP(searchBmp));
  const searchActiveBmp = createSearchSVG(139, 111, 71);
  fs.writeFileSync(path.join(baseDir, 'search-active.png'), createPNGFromBMP(searchActiveBmp));

  // Create mine icon
  const mineBmp = createMineSVG(139, 123, 107);
  fs.writeFileSync(path.join(baseDir, 'mine.png'), createPNGFromBMP(mineBmp));
  const mineActiveBmp = createMineSVG(139, 111, 71);
  fs.writeFileSync(path.join(baseDir, 'mine-active.png'), createPNGFromBMP(mineActiveBmp));

  // Delete SVG files
  try { require('fs').unlinkSync(path.join(baseDir, 'home.svg')); } catch(e) {}
  try { require('fs').unlinkSync(path.join(baseDir, 'home-active.svg')); } catch(e) {}
  try { require('fs').unlinkSync(path.join(baseDir, 'tree.svg')); } catch(e) {}
  try { require('fs').unlinkSync(path.join(baseDir, 'tree-active.svg')); } catch(e) {}
  try { require('fs').unlinkSync(path.join(baseDir, 'graph.svg')); } catch(e) {}
  try { require('fs').unlinkSync(path.join(baseDir, 'graph-active.svg')); } catch(e) {}
  try { require('fs').unlinkSync(path.join(baseDir, 'search.svg')); } catch(e) {}
  try { require('fs').unlinkSync(path.join(baseDir, 'search-active.svg')); } catch(e) {}
  try { require('fs').unlinkSync(path.join(baseDir, 'mine.svg')); } catch(e) {}
  try { require('fs').unlinkSync(path.join(baseDir, 'mine-active.svg')); } catch(e) {}

  console.log('Done! PNG icons created.');
}

main().catch(console.error);