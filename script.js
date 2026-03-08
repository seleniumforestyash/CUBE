const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
});

// --- Rubik's cube colors per face ---
const faceColors = {
  front:  '#C41E3A', // red
  back:   '#FF5800', // orange
  left:   '#0051BA', // blue
  right:  '#009E60', // green
  top:    '#FFD500', // yellow
  bottom: '#FFFFFF', // white
};

const gridSize = 3;     // 3x3 grid
const cubeSize = 1.5;   // half-size of the whole cube
const gap = 0.06;       // gap between stickers

// Build all small tile quads for each face of the Rubik's cube
function buildRubiksFaces() {
  const tiles = [];
  const step = (cubeSize * 2) / gridSize;
  const inset = gap / 2;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x0 = -cubeSize + col * step + inset;
      const x1 = -cubeSize + (col + 1) * step - inset;
      const y0 = -cubeSize + row * step + inset;
      const y1 = -cubeSize + (row + 1) * step - inset;

      // Front face (z = cubeSize)
      tiles.push({
        verts: [[x0, y0, cubeSize], [x1, y0, cubeSize], [x1, y1, cubeSize], [x0, y1, cubeSize]],
        color: faceColors.front,
      });

      // Back face (z = -cubeSize), mirror X
      tiles.push({
        verts: [[-x1, y0, -cubeSize], [-x0, y0, -cubeSize], [-x0, y1, -cubeSize], [-x1, y1, -cubeSize]],
        color: faceColors.back,
      });

      // Left face (x = -cubeSize)
      tiles.push({
        verts: [[-cubeSize, y0, -x0], [-cubeSize, y0, -x1], [-cubeSize, y1, -x1], [-cubeSize, y1, -x0]],
        color: faceColors.left,
      });

      // Right face (x = cubeSize)
      tiles.push({
        verts: [[cubeSize, y0, x0], [cubeSize, y0, x1], [cubeSize, y1, x1], [cubeSize, y1, x0]],
        color: faceColors.right,
      });

      // Top face (y = -cubeSize)
      tiles.push({
        verts: [[x0, -cubeSize, -y0], [x1, -cubeSize, -y0], [x1, -cubeSize, -y1], [x0, -cubeSize, -y1]],
        color: faceColors.top,
      });

      // Bottom face (y = cubeSize)
      tiles.push({
        verts: [[x0, cubeSize, y0], [x1, cubeSize, y0], [x1, cubeSize, y1], [x0, cubeSize, y1]],
        color: faceColors.bottom,
      });
    }
  }

  return tiles;
}

const tiles = buildRubiksFaces();

// --- 3D math helpers ---

function rotateX(point, angle) {
  const [x, y, z] = point;
  const c = Math.cos(angle), s = Math.sin(angle);
  return [x, y * c - z * s, y * s + z * c];
}

function rotateY(point, angle) {
  const [x, y, z] = point;
  const c = Math.cos(angle), s = Math.sin(angle);
  return [x * c + z * s, y, -x * s + z * c];
}

function project(point, scale, cx, cy) {
  const dist = 6;
  const [x, y, z] = point;
  const f = dist / (dist + z);
  return [x * f * scale + cx, y * f * scale + cy, z];
}

function tileAvgZ(projectedVerts) {
  return projectedVerts.reduce((sum, v) => sum + v[2], 0) / projectedVerts.length;
}

// --- Mouse interaction ---

let angleX = -0.45;
let angleY = 0.6;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

canvas.style.cursor = 'grab';

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  angleY += dx * 0.007;
  angleX += dy * 0.007;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  draw();
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;
  canvas.style.cursor = 'grab';
});

canvas.addEventListener('mouseleave', () => {
  isDragging = false;
  canvas.style.cursor = 'grab';
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  isDragging = true;
  lastMouseX = e.touches[0].clientX;
  lastMouseY = e.touches[0].clientY;
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!isDragging) return;
  const dx = e.touches[0].clientX - lastMouseX;
  const dy = e.touches[0].clientY - lastMouseY;
  angleY += dx * 0.007;
  angleX += dy * 0.007;
  lastMouseX = e.touches[0].clientX;
  lastMouseY = e.touches[0].clientY;
  draw();
});

canvas.addEventListener('touchend', () => {
  isDragging = false;
});

// --- Drawing ---

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const scale = Math.min(canvas.width, canvas.height) * 0.18;

  // Transform & project every tile
  const projected = tiles.map(tile => {
    const verts = tile.verts.map(v => {
      let p = rotateX(v, angleX);
      p = rotateY(p, angleY);
      return project(p, scale, cx, cy);
    });
    return { verts, color: tile.color, z: tileAvgZ(verts) };
  });

  // Sort back-to-front
  projected.sort((a, b) => b.z - a.z);

  // Draw tiles
  for (const tile of projected) {
    const pts = tile.verts;

    // Colored sticker
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = tile.color;
    ctx.fill();

    // Dark border to separate tiles (looks like the black body of a Rubik's cube)
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

draw();
