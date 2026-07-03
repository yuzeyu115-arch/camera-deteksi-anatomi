const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const statusElement = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const refUpload = document.getElementById('refUpload');
const setRefBtn = document.getElementById('setRefBtn');
const refCanvasEl = document.getElementById('refCanvas');
const refCtx = refCanvasEl ? refCanvasEl.getContext('2d') : null;
const accuracyResult = document.getElementById('accuracyResult');
const thumbnailsContainer = document.getElementById('thumbnailsContainer');
const thresholdSlider = document.getElementById('thresholdSlider');
const thresholdLabel = document.getElementById('thresholdLabel');
const mirrorToggle = document.getElementById('mirrorToggle');
const saveRefBtn = document.getElementById('saveRefBtn');
const savedContainer = document.getElementById('savedContainer');
const clearSavedBtn = document.getElementById('clearSavedBtn');
const exportRefsBtn = document.getElementById('exportRefsBtn');
const importRefsInput = document.getElementById('importRefsInput');
const forceNoMirrorBtn = document.getElementById('forceNoMirrorBtn');
let mediaStream = null;
let isRunning = false;
let animationFrameId = null;
let poseRef = null;
let referenceLandmarks = null;
let referenceImage = null;
let references = [];
let selectedRefIndex = -1;
let similarityThreshold = 70;
let mirrorCanvas = false;

function updateStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? '#ff8080' : '#ffffff';
  console.log('[STATUS]', message);
}

function setButtons() {
  startBtn.textContent = isRunning ? 'Jeda' : 'Mulai Kamera';
  stopBtn.disabled = !isRunning;
}

async function getCameraPermissionState() {
  if (!navigator.permissions || !navigator.permissions.query) return 'unknown';
  try {
    const permission = await navigator.permissions.query({ name: 'camera' });
    return permission.state;
  } catch (error) {
    console.warn('Permission API tidak tersedia untuk camera', error);
    return 'unknown';
  }
}

function startLiveProcessing() {
  if (!isRunning) return;
  if (pose && typeof pose.send === 'function') {
    pose.send({ image: videoElement });
  } else {
    drawVideoFrame();
  }
}

function drawVideoFrame() {
  if (!isRunning) return;
  if (videoElement.videoWidth && videoElement.videoHeight) {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    // apply mirror transform if enabled, otherwise reset
    if (mirrorCanvas) {
      canvasCtx.setTransform(-1, 0, 0, 1, canvasElement.width, 0);
    } else {
      canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
    }
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
  }
  animationFrameId = requestAnimationFrame(drawVideoFrame);
}

const nerveConnections = [
  [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [24, 26], [25, 27], [26, 28],
  [11, 12], [23, 24],
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8]
];

const landmarkLabels = {
  0: { title: 'Hidung', subtitle: 'Tulang Hidung, Saraf Trigeminal' },
  7: { title: 'Telinga Kiri', subtitle: 'Tulang Temporal, Saraf Kranial' },
  8: { title: 'Telinga Kanan', subtitle: 'Tulang Temporal, Saraf Kranial' },
  11: { title: 'Bahu Kiri', subtitle: 'Sendi Peluru, Clavicula & Scapula' },
  12: { title: 'Bahu Kanan', subtitle: 'Sendi Peluru, Clavicula & Scapula' },
  13: { title: 'Siku Kiri', subtitle: 'Sendi Engsel, Saraf Radial/Ulnar' },
  14: { title: 'Siku Kanan', subtitle: 'Sendi Engsel, Saraf Radial/Ulnar' },
  15: { title: 'Pergelangan Kiri', subtitle: 'Sendi Geser, Saraf Median' },
  16: { title: 'Pergelangan Kanan', subtitle: 'Sendi Geser, Saraf Median' },
  17: { title: 'Jari Kelingking Kiri', subtitle: 'Falanges, Saraf Ulnaris' },
  18: { title: 'Jari Kelingking Kanan', subtitle: 'Falanges, Saraf Ulnaris' },
  19: { title: 'Jari Telunjuk Kiri', subtitle: 'Falanges, Saraf Medianus' },
  20: { title: 'Jari Telunjuk Kanan', subtitle: 'Falanges, Saraf Medianus' },
  21: { title: 'Jempol Kiri', subtitle: 'Sendi Pelana, Saraf Medianus' },
  22: { title: 'Jempol Kanan', subtitle: 'Sendi Pelana, Saraf Medianus' },
  23: { title: 'Panggul Kiri', subtitle: 'Os Coxae, Plexus Lumbalis' },
  24: { title: 'Panggul Kanan', subtitle: 'Os Coxae, Plexus Lumbalis' },
  25: { title: 'Lutut Kiri', subtitle: 'Sendi Engsel, Patella, Saraf Femoralis' },
  26: { title: 'Lutut Kanan', subtitle: 'Sendi Engsel, Patella, Saraf Femoralis' },
  27: { title: 'Pergelangan Kaki Kiri', subtitle: 'Sendi Engsel, Saraf Tibialis' },
  28: { title: 'Pergelangan Kaki Kanan', subtitle: 'Sendi Engsel, Saraf Tibialis' }
};

function toCanvasPoint(landmark) {
  return {
    x: landmark.x * canvasElement.width,
    y: landmark.y * canvasElement.height
  };
}

function drawGlowPoint(point, color = '#ff4d6d', radius = 5) {
  const gradient = canvasCtx.createRadialGradient(point.x, point.y, 1, point.x, point.y, radius * 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.4, 'rgba(255,77,109,0.8)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  canvasCtx.beginPath();
  canvasCtx.fillStyle = gradient;
  canvasCtx.arc(point.x, point.y, radius * 2, 0, Math.PI * 2);
  canvasCtx.fill();
  canvasCtx.beginPath();
  canvasCtx.fillStyle = '#fff';
  canvasCtx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  canvasCtx.fill();
}

function drawNerveLines(landmarks) {
  canvasCtx.save();
  canvasCtx.lineWidth = 3;
  canvasCtx.shadowColor = 'rgba(124, 252, 0, 0.55)';
  canvasCtx.shadowBlur = 16;
  nerveConnections.forEach(([i, j]) => {
    const a = toCanvasPoint(landmarks[i]);
    const b = toCanvasPoint(landmarks[j]);
    const gradient = canvasCtx.createLinearGradient(a.x, a.y, b.x, b.y);
    gradient.addColorStop(0, 'rgba(124,252,0,0.9)');
    gradient.addColorStop(1, 'rgba(255,77,109,0.9)');
    canvasCtx.strokeStyle = gradient;
    canvasCtx.beginPath();
    canvasCtx.moveTo(a.x, a.y);
    canvasCtx.lineTo(b.x, b.y);
    canvasCtx.stroke();
  });
  canvasCtx.restore();
}

function onReferenceResults(results) {
  if (!results.image) return;
  if (!results.poseLandmarks) {
    updateStatus('Tidak dapat mendeteksi pose pada foto referensi.', true);
    return;
  }
  referenceLandmarks = results.poseLandmarks.map((l) => ({ x: l.x, y: l.y, z: l.z }));
  // draw preview
  if (refCanvasEl && refCtx) {
    refCanvasEl.width = Math.min(480, results.image.width);
    refCanvasEl.height = Math.min(360, results.image.height * (refCanvasEl.width / results.image.width));
    refCtx.setTransform(1, 0, 0, 1, 0, 0);
    refCtx.clearRect(0, 0, refCanvasEl.width, refCanvasEl.height);
    refCtx.drawImage(results.image, 0, 0, refCanvasEl.width, refCanvasEl.height);
    drawConnectors(refCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: 'rgba(124,252,0,0.9)', lineWidth: 2 });
    drawLandmarks(refCtx, results.poseLandmarks, { color: '#fff', lineWidth: 1, radius: 2 });
    try {
      const dataUrl = refCanvasEl.toDataURL('image/jpeg', 0.8);
      // store dataURL into current references entry if exists
      if (selectedRefIndex >= 0 && references[selectedRefIndex]) {
        references[selectedRefIndex].dataURL = dataUrl;
        references[selectedRefIndex].name = references[selectedRefIndex].file ? references[selectedRefIndex].file.name : `ref-${Date.now()}`;
      }
    } catch (e) {
      console.warn('Tidak dapat mengambil dataURL preview', e);
    }
  }
  updateStatus('Foto referensi tersimpan. Kini sistem dapat membandingkan posisi.', false);
}

function saveCurrentReferenceToLocal() {
  if (!referenceLandmarks || !refCanvasEl) {
    updateStatus('Tidak ada referensi aktif untuk disimpan.', true);
    return;
  }
  try {
    const dataUrl = refCanvasEl.toDataURL('image/jpeg', 0.9);
    const saved = JSON.parse(localStorage.getItem('savedPoseRefs') || '[]');
    saved.push({ name: `ref-${Date.now()}`, image: dataUrl, landmarks: referenceLandmarks });
    localStorage.setItem('savedPoseRefs', JSON.stringify(saved));
    renderSavedRefs();
    updateStatus('Referensi disimpan ke browser.', false);
  } catch (e) {
    console.error('save error', e);
    updateStatus('Gagal menyimpan referensi.', true);
  }
}

function renderSavedRefs() {
  if (!savedContainer) return;
  const saved = JSON.parse(localStorage.getItem('savedPoseRefs') || '[]');
  savedContainer.innerHTML = '';
  saved.forEach((item, idx) => {
    const img = document.createElement('img');
    img.src = item.image;
    img.style.width = '80px';
    img.style.height = '60px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '6px';
    img.style.cursor = 'pointer';
    img.title = item.name;
    img.addEventListener('click', () => {
      // load as active reference
      const im = new Image();
      im.onload = () => {
        referenceImage = im;
        referenceLandmarks = item.landmarks;
        if (refCanvasEl && refCtx) {
          refCanvasEl.width = im.width;
          refCanvasEl.height = im.height * (refCanvasEl.width / im.width);
          refCtx.setTransform(1, 0, 0, 1, 0, 0);
          refCtx.clearRect(0, 0, refCanvasEl.width, refCanvasEl.height);
          refCtx.drawImage(im, 0, 0, refCanvasEl.width, refCanvasEl.height);
        }
        updateStatus('Referensi dimuat dari penyimpanan lokal.', false);
      };
      im.src = item.image;
    });
    savedContainer.appendChild(img);
  });
}

function clearSavedRefs() {
  localStorage.removeItem('savedPoseRefs');
  renderSavedRefs();
  updateStatus('Semua referensi tersimpan dihapus.', false);
}

function exportSavedRefs() {
  try {
    const saved = JSON.parse(localStorage.getItem('savedPoseRefs') || '[]');
    const blob = new Blob([JSON.stringify(saved)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pose_refs_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    updateStatus('Preset diekspor sebagai file JSON.', false);
  } catch (e) {
    console.error('export error', e);
    updateStatus('Gagal mengekspor preset.', true);
  }
}

function importSavedRefs(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error('Invalid format');
      localStorage.setItem('savedPoseRefs', JSON.stringify(data));
      renderSavedRefs();
      updateStatus('Preset berhasil diimpor.', false);
    } catch (err) {
      console.error('import error', err);
      updateStatus('Gagal mengimpor preset. Pastikan format JSON benar.', true);
    }
  };
  reader.onerror = () => updateStatus('Gagal membaca file impor.', true);
  reader.readAsText(file);
}

function computePoseSimilarity(ref, live) {
  if (!ref || !live) return 0;
  function centerAndScale(landmarks) {
    const left = landmarks[11];
    const right = landmarks[12];
    const fallbackLeft = landmarks[23];
    const fallbackRight = landmarks[24];
    const a = left || fallbackLeft;
    const b = right || fallbackRight;
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const scale = Math.hypot(a.x - b.x, a.y - b.y) || 1e-6;
    return { cx, cy, scale };
  }
  const r = centerAndScale(ref);
  const s = centerAndScale(live);
  const indices = Array.from({ length: Math.min(ref.length, live.length) }, (_, i) => i);
  let sum = 0;
  let count = 0;
  indices.forEach((i) => {
    const ra = ref[i];
    const la = live[i];
    if (!ra || !la) return;
    const rx = (ra.x - r.cx) / r.scale;
    const ry = (ra.y - r.cy) / r.scale;
    const lx = (la.x - s.cx) / s.scale;
    const ly = (la.y - s.cy) / s.scale;
    const d = Math.hypot(rx - lx, ry - ly);
    // similarity per keypoint, tolerance roughly 0.5
    const sim = Math.max(0, 1 - d / 0.5);
    sum += sim;
    count += 1;
  });
  if (count === 0) return 0;
  return (sum / count) * 100; // percent
}

function updateAccuracyDisplay(percent) {
  if (!accuracyResult) return;
  const pass = percent >= similarityThreshold;
  accuracyResult.textContent = `Presisi: ${percent.toFixed(1)}% — ${pass ? 'Benar' : 'Salah'}`;
  accuracyResult.style.color = pass ? '#8cff7a' : '#ff8c8c';
}

function drawLabel(point, title, subtitle) {
  const padding = 6;
  const lineHeight = 18;
  const lines = [title, subtitle];
  canvasCtx.font = '600 14px Poppins, sans-serif';
  const maxTextWidth = Math.max(...lines.map((line) => canvasCtx.measureText(line).width));
  const x = point.x > canvasElement.width * 0.65 ? point.x - maxTextWidth - 16 : point.x + 14;
  const y = Math.max(16, Math.min(canvasElement.height - lineHeight * lines.length - 10, point.y - lineHeight));

  canvasCtx.fillStyle = '#ffffff';
  lines.forEach((line, index) => {
    canvasCtx.fillText(line, x, y + index * lineHeight);
  });
}

function drawLabelSet(landmarks) {
  Object.entries(landmarkLabels).forEach(([index, label]) => {
    const landmark = landmarks[index];
    if (!landmark) return;
    const point = toCanvasPoint(landmark);
    drawLabel(point, label.title, label.subtitle);
  });

  const leftShoulder = toCanvasPoint(landmarks[11]);
  const rightShoulder = toCanvasPoint(landmarks[12]);
  const neckPoint = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2 - 48
  };
  drawLabel(neckPoint, 'Leher', 'Saraf Leher, Sendi Kervikal');
}

function onResults(results) {
  if (!results.image) return;
  canvasElement.width = results.image.width;
  canvasElement.height = results.image.height;
  // apply transform first so image and annotations share same orientation
  canvasCtx.save();
  if (mirrorCanvas) {
    canvasCtx.setTransform(-1, 0, 0, 1, canvasElement.width, 0);
  } else {
    canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
  }
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.poseLandmarks) {
    const landmarks = results.poseLandmarks;
    drawConnectors(canvasCtx, landmarks, POSE_CONNECTIONS, { color: 'rgba(255,255,255,0.25)', lineWidth: 2 });
    drawNerveLines(landmarks);
    drawLandmarks(canvasCtx, landmarks, { color: '#fff', lineWidth: 1, radius: 2 });
    [0, 7, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28].forEach((index) => {
      if (landmarks[index]) {
        drawGlowPoint(toCanvasPoint(landmarks[index]), '#ff4d6d', 5);
      }
    });
    drawLabelSet(landmarks);
    updateStatus('Audience terdeteksi. Titik dan garis saraf mengikuti gerakan.');
    // if a reference exists, compute similarity
    if (referenceLandmarks) {
      const percent = computePoseSimilarity(referenceLandmarks, landmarks);
      updateAccuracyDisplay(percent);
    }
    canvasCtx.restore();
  } else {
    // restore transform even when no landmarks
    canvasCtx.restore();
    updateStatus('Tidak ada audience yang terdeteksi. Silakan masuk ke frame kamera.');
  }
  animationFrameId = requestAnimationFrame(startLiveProcessing);
}

let pose = null;
if (typeof Pose !== 'undefined') {
  pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
  });
  pose.onResults(onResults);
} else {
  updateStatus('Library MediaPipe tidak bisa dimuat. Kamera tetap bisa dipakai dalam mode langsung.', false);
}

// Create a separate Pose instance for processing reference images
if (typeof Pose !== 'undefined') {
  poseRef = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
  poseRef.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.6 });
  poseRef.onResults(onReferenceResults);
}

function renderThumbnails(files) {
  if (!thumbnailsContainer) return;
  thumbnailsContainer.innerHTML = '';
  Array.from(files).forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.src = url;
    img.style.width = '80px';
    img.style.height = '60px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '6px';
    img.style.cursor = 'pointer';
    img.title = file.name;
    img.addEventListener('click', () => {
      // mark selection
      Array.from(thumbnailsContainer.children).forEach((c) => c.style.outline = '');
      img.style.outline = '3px solid rgba(109,92,255,0.6)';
      selectedRefIndex = idx;
      // immediately load the selected file as active reference
      try { loadReferenceFromFile(file); } catch (e) { console.warn('Failed to load thumbnail file', e); }
    });
    thumbnailsContainer.appendChild(img);
  });
}

function loadReferenceFromFile(file) {
  const img = new Image();
  img.onload = () => {
    referenceImage = img;
    if (poseRef && typeof poseRef.send === 'function') {
      poseRef.send({ image: img });
    } else {
      updateStatus('Pose reference tidak tersedia.', true);
    }
  };
  img.onerror = () => updateStatus('Gagal memuat foto referensi.', true);
  img.src = URL.createObjectURL(file);
}

if (refUpload) {
  refUpload.addEventListener('change', (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    renderThumbnails(files);
    // populate references array metadata
    references = Array.from(files).map((f) => ({ file: f }));
    selectedRefIndex = 0;
    // auto-select first thumbnail outline
    const first = thumbnailsContainer && thumbnailsContainer.children[0];
    if (first) first.style.outline = '3px solid rgba(109,92,255,0.6)';
  });
}

if (setRefBtn) {
  setRefBtn.addEventListener('click', () => {
    if (references.length === 0) {
      updateStatus('Pilih file foto terlebih dahulu.', true);
      return;
    }
    const idx = selectedRefIndex >= 0 ? selectedRefIndex : 0;
    const file = references[idx].file;
    loadReferenceFromFile(file);
  });
}

if (thresholdSlider && thresholdLabel) {
  thresholdSlider.addEventListener('input', (e) => {
    similarityThreshold = Number(e.target.value);
    thresholdLabel.textContent = `${similarityThreshold}%`;
  });
}

if (mirrorToggle) {
  mirrorToggle.addEventListener('change', (e) => {
    mirrorCanvas = !!e.target.checked;
    try { localStorage.setItem('mirrorPref', mirrorCanvas ? 'true' : 'false'); } catch (err) { console.warn('mirror save failed', err); }
  });
}

if (forceNoMirrorBtn) {
  forceNoMirrorBtn.addEventListener('click', () => {
    mirrorCanvas = false;
    if (mirrorToggle) mirrorToggle.checked = false;
    try { localStorage.setItem('mirrorPref', 'false'); } catch (err) { console.warn('mirror save failed', err); }
    updateStatus('Mode non-mirror dipaksa dan disimpan sebagai preferensi.', false);
  });
}

if (saveRefBtn) saveRefBtn.addEventListener('click', saveCurrentReferenceToLocal);
if (clearSavedBtn) clearSavedBtn.addEventListener('click', clearSavedRefs);
if (exportRefsBtn) exportRefsBtn.addEventListener('click', exportSavedRefs);
if (importRefsInput) importRefsInput.addEventListener('change', (e) => {
  if (!e.target.files || e.target.files.length === 0) return; importSavedRefs(e.target.files[0]);
});

// load saved refs on startup
try { renderSavedRefs(); } catch (e) { console.warn('renderSavedRefs failed', e); }

// initialize UI state
if (thresholdLabel) thresholdLabel.textContent = `${similarityThreshold}%`;
// load mirror preference from localStorage
try {
  const savedMirror = localStorage.getItem('mirrorPref');
  if (savedMirror !== null) {
    mirrorCanvas = savedMirror === 'true';
  }
} catch (e) { console.warn('localStorage mirror read failed', e); }
if (mirrorToggle) mirrorToggle.checked = !!mirrorCanvas;

async function startCamera() {
  const permState = await getCameraPermissionState();
  if (permState === 'denied') {
    updateStatus('Akses kamera diblokir. Buka ikon gembok di address bar dan izinkan kamera untuk origin ini.', true);
    return;
  }

  if (isRunning) {
    stopCamera();
    updateStatus('Kamera dijeda. Klik Mulai Kamera untuk melanjutkan.');
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    updateStatus('Browser tidak mendukung akses kamera. Gunakan Chrome atau Edge terbaru.', true);
    return;
  }

  videoElement.muted = true;

  try {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const preferPortrait = isMobile && window.innerHeight >= window.innerWidth;
    const constraints = {
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: isMobile ? 720 : 1280 },
        height: { ideal: isMobile ? 1280 : 720 },
        aspectRatio: preferPortrait ? 9 / 16 : 16 / 9
      }
    };
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = mediaStream;
    await videoElement.play();
    if (videoElement.readyState < 2) {
      await new Promise((resolve) => {
        videoElement.addEventListener('loadeddata', resolve, { once: true });
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    isRunning = true;
    setButtons();
    updateStatus('Kamera aktif. Live tracking berjalan...');

    startLiveProcessing();
  } catch (error) {
    console.error('camera start error', error);
    const message = error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError'
      ? 'Izin kamera ditolak. Periksa pengaturan kamera di origin ini.'
      : 'Gagal mengaktifkan kamera: ' + (error.message || error);
    updateStatus(message, true);
    stopCamera();
  }
}

function stopCamera() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  if (videoElement.srcObject) {
    videoElement.srcObject = null;
  }
  isRunning = false;
  setButtons();
  updateStatus('Kamera berhenti. Klik Mulai Kamera untuk memulai ulang.');
}

startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);
setButtons();

// setRefBtn handled earlier (loads selected thumbnail)
