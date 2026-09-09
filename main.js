// Configuration
const TOTAL_FRAMES = 299;
const FRAME_PATH = (index) => `./frames/frame_${String(index + 1).padStart(4, '0')}.jpg`;

const canvas = document.getElementById('animationCanvas');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

// State
const images = new Array(TOTAL_FRAMES);
const isLoaded = new Array(TOTAL_FRAMES).fill(false);
let lastRenderedIndex = -1;
let currentFrameIndex = 0;
let targetFrameIndex = 0;
let isAnimating = false;
let dpr = Math.min(window.devicePixelRatio || 1, 2);

// Handle canvas resizing with high DPI support
function resizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  // Force redraw of current frame
  if (lastRenderedIndex >= 0) {
    drawFrame(lastRenderedIndex);
  } else {
    drawFrame(0);
  }
}

// Draw frame centered with 'cover' aspect ratio logic
function drawFrame(index) {
  const targetImg = findAvailableFrame(index);
  if (!targetImg || !targetImg.complete || targetImg.naturalWidth === 0) return;

  const cWidth = canvas.width;
  const cHeight = canvas.height;
  const iWidth = targetImg.naturalWidth;
  const iHeight = targetImg.naturalHeight;

  // Calculate cover dimensions
  const scale = Math.max(cWidth / iWidth, cHeight / iHeight);
  const drawWidth = iWidth * scale;
  const drawHeight = iHeight * scale;
  const offsetX = (cWidth - drawWidth) / 2;
  const offsetY = (cHeight - drawHeight) / 2;

  ctx.drawImage(targetImg, offsetX, offsetY, drawWidth, drawHeight);
  lastRenderedIndex = index;
}

// Find closest loaded frame if desired frame hasn't finished loading yet
function findAvailableFrame(desiredIndex) {
  if (isLoaded[desiredIndex] && images[desiredIndex]) {
    return images[desiredIndex];
  }

  // Check closest neighboring loaded frames
  for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
    const prev = desiredIndex - offset;
    if (prev >= 0 && isLoaded[prev] && images[prev]) {
      return images[prev];
    }
    const next = desiredIndex + offset;
    if (next < TOTAL_FRAMES && isLoaded[next] && images[next]) {
      return images[next];
    }
  }

  // Fallback to first loaded or frame 0
  if (isLoaded[0] && images[0]) return images[0];
  return images[desiredIndex];
}

// Smooth frame interpolation loop (RAF)
function animate() {
  const delta = targetFrameIndex - currentFrameIndex;

  if (Math.abs(delta) > 0.005) {
    // Smooth damping (inertia)
    currentFrameIndex += delta * 0.15;
  } else {
    currentFrameIndex = targetFrameIndex;
  }

  const frameToRender = Math.round(currentFrameIndex);
  drawFrame(frameToRender);

  if (Math.abs(targetFrameIndex - currentFrameIndex) > 0.005) {
    requestAnimationFrame(animate);
  } else {
    isAnimating = false;
  }
}

function triggerAnimation() {
  if (!isAnimating) {
    isAnimating = true;
    requestAnimationFrame(animate);
  }
}

// Calculate target frame from scroll progress
function updateScrollProgress() {
  const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? Math.max(0, Math.min(1, scrollY / maxScroll)) : 0;

  targetFrameIndex = progress * (TOTAL_FRAMES - 1);
  triggerAnimation();
}

// Load priority frame 0 immediately, then preload all others in background
function initializeFrames() {
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const img = new Image();
    images[i] = img;

    img.onload = () => {
      isLoaded[i] = true;
      // If this is the initial frame or currently visible frame, draw immediately
      if (i === 0 && lastRenderedIndex === -1) {
        drawFrame(0);
      } else if (Math.round(currentFrameIndex) === i) {
        drawFrame(i);
      }
    };
  }

  // First frame gets immediate highest priority
  images[0].src = FRAME_PATH(0);

  // Progressive batch loader for the remaining 298 frames
  let nextToLoad = 1;
  const CONCURRENCY = 8;

  function loadNext() {
    if (nextToLoad >= TOTAL_FRAMES) return;
    const current = nextToLoad++;
    images[current].onload = () => {
      isLoaded[current] = true;
      if (Math.round(currentFrameIndex) === current) {
        drawFrame(current);
      }
      loadNext();
    };
    images[current].onerror = () => {
      loadNext();
    };
    images[current].src = FRAME_PATH(current);
  }

  for (let c = 0; c < CONCURRENCY; c++) {
    loadNext();
  }
}

// Event Listeners
window.addEventListener('resize', resizeCanvas, { passive: true });
window.addEventListener('scroll', updateScrollProgress, { passive: true });

// Setup on DOM load
resizeCanvas();
initializeFrames();
updateScrollProgress();
