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
const thresholdSliderSecondary = document.getElementById('thresholdSliderSecondary');
const thresholdLabelSecondary = document.getElementById('thresholdLabelSecondary');
const saveRefBtn = document.getElementById('saveRefBtn');
const savedContainer = document.getElementById('savedContainer');
const clearSavedBtn = document.getElementById('clearSavedBtn');
const exportRefsBtn = document.getElementById('exportRefsBtn');
const importRefsInput = document.getElementById('importRefsInput');
const forceNoMirrorBtn = document.getElementById('forceNoMirrorBtn');
const pageHeading = document.querySelector('.page-heading');
const pageSubtitle = document.querySelector('.page-subtitle');
const patientTabBtn = document.getElementById('patientTabBtn');
const adminTabBtn = document.getElementById('adminTabBtn');
const patientPage = document.getElementById('patientPage');
const adminPage = document.getElementById('adminPage');
const adminRefUpload = document.getElementById('adminRefUpload');
const adminGallery = document.getElementById('adminGallery');
const startBtnSecondary = document.getElementById('startBtnSecondary');
const stopBtnSecondary = document.getElementById('stopBtnSecondary');
const summaryTherapy = document.getElementById('summaryTherapy');
const summaryResult = document.getElementById('summaryResult');
const summaryJoint = document.getElementById('summaryJoint');
const sessionStatus = document.getElementById('sessionStatus');
const sessionAccuracy = document.getElementById('sessionAccuracy');
const sessionRecommendation = document.getElementById('sessionRecommendation');
const sessionAction = document.getElementById('sessionAction');
const therapyAction = document.getElementById('therapyAction');
const therapyResult = document.getElementById('therapyResult');
const jointMovement = document.getElementById('jointMovement');
const patientName = document.getElementById('patientName');
const patientAge = document.getElementById('patientAge');
const therapySession = document.getElementById('therapySession');
const sessionDate = document.getElementById('sessionDate');
const cameraReferencePanel = document.getElementById('cameraReferencePanel');
const sessionHistoryList = document.getElementById('sessionHistoryList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const cameraRefImage = document.getElementById('cameraRefImage');
const cameraAccuracyValue = document.getElementById('cameraAccuracyValue');
const cameraAccuracyResult = document.getElementById('cameraAccuracyResult');
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
let latestPoseLandmarks = null;

function updateStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? '#ff8080' : '#ffffff';
  console.log('[STATUS]', message);
}

function syncPatientSummary() {
  if (summaryTherapy) summaryTherapy.textContent = therapyAction?.value || '-';
  if (summaryResult) summaryResult.textContent = therapyResult?.value || '-';
  if (summaryJoint) summaryJoint.textContent = jointMovement?.value || '-';
  updateSessionResult(null);
}

function updateSessionResult(percent) {
  const value = Number.isFinite(percent) ? percent : null;
  let status = 'Menunggu';
  let recommendation = 'Tunggu hasil deteksi.';
  let accuracyText = '--';

  if (value !== null) {
    const safePercent = Math.min(100, Math.max(0, value));
    accuracyText = `${safePercent.toFixed(1)}%`;
    if (safePercent >= similarityThreshold) {
      status = 'Bagus';
      recommendation = 'Lanjutkan sesi dan catat hasil terapi.';
    } else if (safePercent >= similarityThreshold * 0.8) {
      status = 'Cukup';
      recommendation = 'Ulangi gerakan dengan fokus pada sendi yang dipantau.';
    } else {
      status = 'Perlu Perbaikan';
      recommendation = 'Ulangi sesi dengan referensi tambahan atau koreksi postur.';
    }
  }

  if (sessionStatus) sessionStatus.textContent = status;
  if (sessionAccuracy) sessionAccuracy.textContent = accuracyText;
  if (sessionRecommendation) sessionRecommendation.textContent = recommendation;
  if (sessionAction) sessionAction.textContent = therapyAction?.value || '-';
}

function setButtons() {
  if (startBtn) startBtn.textContent = isRunning ? 'Jeda' : 'Mulai';
  if (stopBtn) stopBtn.disabled = !isRunning;
  if (startBtnSecondary) startBtnSecondary.textContent = isRunning ? 'Jeda' : '▶️ Mulai';
  if (stopBtnSecondary) stopBtnSecondary.disabled = !isRunning;
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

let poseBusy = false;

function startLiveProcessing() {
  if (!isRunning) return;
  drawVideoFrame();
  if (pose && typeof pose.send === 'function' && !poseBusy) {
    poseBusy = true;
    pose.send({ image: videoElement });
  }
  animationFrameId = requestAnimationFrame(startLiveProcessing);
}

function drawVideoFrame() {
  if (!isRunning || !videoElement || !canvasElement || !canvasCtx) return;

  if (videoElement.readyState >= 2 && videoElement.videoWidth && videoElement.videoHeight) {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

    if (latestPoseLandmarks && latestPoseLandmarks.length) {
      drawPoseOverlay(latestPoseLandmarks);
    }
  }
}

function prepareVideoElement() {
  if (!videoElement) return;
  videoElement.setAttribute('playsinline', 'true');
  videoElement.setAttribute('autoplay', 'true');
  videoElement.setAttribute('muted', 'true');
  videoElement.playsInline = true;
  videoElement.muted = true;
  videoElement.style.transform = 'scaleX(1)';
  if (canvasElement) canvasElement.style.transform = 'scaleX(1)';
}

async function getCameraStream() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Browser tidak mendukung akses kamera.');
  }

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768;
  const targetWidth = isMobile ? { ideal: 720 } : { ideal: 1280 };
  const targetHeight = isMobile ? { ideal: 1280 } : { ideal: 720 };

  const constraintSets = [
    {
      video: {
        facingMode: { ideal: 'user' },
        width: targetWidth,
        height: targetHeight,
        frameRate: { ideal: 24, max: 30 }
      }
    },
    {
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24, max: 30 }
      }
    },
    {
      video: {
        facingMode: { ideal: 'environment' },
        width: targetWidth,
        height: targetHeight,
        frameRate: { ideal: 24, max: 30 }
      }
    },
    { video: true }
  ];

  let lastError = null;
  for (const constraints of constraintSets) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
      console.warn('Kunci kamera gagal, mencoba fallback:', error);
    }
  }

  throw lastError || new Error('Tidak bisa mendapatkan akses kamera.');
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
  if (!canvasCtx || !point) return;
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

function drawPoseOverlay(landmarks) {
  if (!canvasCtx || !landmarks || landmarks.length === 0) return;
  const visible = landmarks.filter(Boolean);
  if (!visible.length) return;

  drawNerveLines(landmarks);

  visible.forEach((landmark) => {
    if (!landmark) return;
    const point = toCanvasPoint(landmark);
    drawGlowPoint(point, '#ff4d6d', 4);
  });
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
    if (typeof drawConnectors === 'function' && typeof drawLandmarks === 'function') {
      drawConnectors(refCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: 'rgba(124,252,0,0.9)', lineWidth: 2 });
      drawLandmarks(refCtx, results.poseLandmarks, { color: '#fff', lineWidth: 1, radius: 2 });
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
    renderAdminGallery();
    updateStatus('Referensi disimpan ke browser.', false);
  } catch (e) {
    console.error('save error', e);
    updateStatus('Gagal menyimpan referensi.', true);
  }
}

function loadReferenceFromDataUrl(dataUrl, fallbackName = '') {
  const img = new Image();
  img.onload = () => {
    referenceImage = img;
    showCameraReferencePreview(dataUrl);
    if (poseRef && typeof poseRef.send === 'function') {
      poseRef.send({ image: img });
    } else {
      updateStatus('Pose reference tidak tersedia.', true);
    }
  };
  img.onerror = () => updateStatus('Gagal memuat foto referensi.', true);
  img.src = dataUrl;
  if (fallbackName) {
    updateStatus(`Referensi ${fallbackName} dipakai untuk pencocokan otomatis.`, false);
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target.result);
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.readAsDataURL(file);
  });
}

function waitAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function compressImageFile(file, maxDimension = 800) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const width = Math.round(img.width * ratio);
      const height = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context tidak tersedia'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Gagal mengompres gambar'));
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = () => reject(new Error('Gagal membaca hasil kompresi'));
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.75);
    };
    img.onerror = () => reject(new Error('Gagal memuat file gambar'));
    img.src = URL.createObjectURL(file);
  });
}

function autoLoadFirstReference() {
  try {
    const saved = JSON.parse(localStorage.getItem('savedPoseRefs') || '[]');
    const first = saved.find((item) => item && item.image);
    if (first) {
      loadReferenceFromDataUrl(first.image, first.name || 'pertama');
    }
  } catch (error) {
    console.warn('autoLoadFirstReference failed', error);
  }
}

function showCameraReferencePreview(src) {
  if (!cameraReferencePanel || !cameraRefImage) return;
  cameraRefImage.src = src || '';
}

function hideCameraReferencePreview() {
  if (!cameraReferencePanel || !cameraRefImage) return;
  cameraRefImage.src = '';
}

function tryAutoLoadReferenceForCamera() {
  if (!therapyAction || !jointMovement) return;
  if (!therapyAction.value || !jointMovement.value) {
    return;
  }
  try {
    const saved = JSON.parse(localStorage.getItem('savedPoseRefs') || '[]');
    const first = saved.find((item) => item && item.image);
    if (first) {
      loadReferenceFromDataUrl(first.image, first.name || 'referensi otomatis');
      showCameraReferencePreview(first.image);
      if (cameraAccuracyResult) {
        cameraAccuracyResult.textContent = 'Referensi dimuat. Menunggu deteksi...';
        cameraAccuracyResult.style.color = '#d1d5db';
      }
      updateAccuracyDisplay(0);
    } else {
      showCameraReferencePreview('');
      if (cameraAccuracyResult) {
        cameraAccuracyResult.textContent = 'Tidak ada referensi tersimpan. Unggah di admin.';
        cameraAccuracyResult.style.color = '#f0f0f0';
      }
      updateAccuracyDisplay(0);
    }
  } catch (error) {
    console.warn('tryAutoLoadReferenceForCamera failed', error);
  }
}

function renderAdminGallery() {
  if (!adminGallery) return;
  const saved = JSON.parse(localStorage.getItem('savedPoseRefs') || '[]');
  adminGallery.innerHTML = '';
  if (!saved.length) {
    adminGallery.innerHTML = '<div class="admin-hint">Belum ada foto referensi tersimpan.</div>';
    return;
  }
  saved.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'gallery-item';
    card.style.cursor = 'pointer';
    card.title = item.name || `Referensi ${idx + 1}`;
    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.name || `referensi-${idx + 1}`;
    const label = document.createElement('div');
    label.className = 'gallery-name';
    label.textContent = item.name || `Referensi ${idx + 1}`;
    card.addEventListener('click', () => loadReferenceFromDataUrl(item.image, item.name || `Referensi ${idx + 1}`));
    card.appendChild(img);
    card.appendChild(label);
    adminGallery.appendChild(card);
  });
}

function renderSavedRefs() {
  if (!savedContainer) return;
  const saved = JSON.parse(localStorage.getItem('savedPoseRefs') || '[]');
  savedContainer.innerHTML = '';
  if (!saved.length) {
    savedContainer.innerHTML = '<div class="admin-hint">Belum ada foto referensi tersimpan.</div>';
    return;
  }
  saved.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'gallery-item';
    card.style.cursor = 'pointer';
    card.tabIndex = 0;
    card.title = item.name || `Referensi ${idx + 1}`;

    const img = document.createElement('img');
    img.src = item.image;
    img.alt = item.name || `Referensi ${idx + 1}`;

    const label = document.createElement('div');
    label.className = 'gallery-name';
    label.textContent = item.name || `Referensi ${idx + 1}`;

    const loadReference = () => {
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
        updateStatus('Referensi dimuat dari galeri tersimpan.', false);
      };
      im.src = item.image;
    };

    card.addEventListener('click', loadReference);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        loadReference();
      }
    });

    card.appendChild(img);
    card.appendChild(label);
    savedContainer.appendChild(card);
  });
}

function clearSavedRefs() {
  localStorage.removeItem('savedPoseRefs');
  renderSavedRefs();
  renderAdminGallery();
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

// Calculate joint distance metrics
function calculateJointDistances(landmarks) {
  if (!landmarks || landmarks.length < 2) return { distance: 0, avgDistance: 0 };
  
  let totalDistance = 0;
  let count = 0;
  
  // Calculate distances between major joints
  const jointPairs = [
    [11, 13], // Left shoulder to left elbow
    [13, 15], // Left elbow to left wrist
    [12, 14], // Right shoulder to right elbow
    [14, 16], // Right elbow to right wrist
    [23, 25], // Left hip to left knee
    [25, 27], // Left knee to left ankle
    [24, 26], // Right hip to right knee
    [26, 28]  // Right knee to right ankle
  ];
  
  jointPairs.forEach(([i, j]) => {
    if (landmarks[i] && landmarks[j]) {
      const dx = landmarks[i].x - landmarks[j].x;
      const dy = landmarks[i].y - landmarks[j].y;
      const distance = Math.hypot(dx, dy);
      totalDistance += distance;
      count++;
    }
  });
  
  return {
    distance: totalDistance,
    avgDistance: count > 0 ? totalDistance / count : 0
  };
}

function updateAccuracyDisplay(percent) {
  const safePercent = Number.isFinite(percent) ? percent : 0;
  const pass = safePercent >= similarityThreshold;
  const resultText = `Presisi: ${safePercent.toFixed(1)}% — ${pass ? 'Benar' : 'Salah'}`;

  if (accuracyResult) {
    accuracyResult.textContent = resultText;
    accuracyResult.style.color = pass ? '#8cff7a' : '#ff8c8c';
  }
  if (cameraAccuracyValue) {
    cameraAccuracyValue.textContent = `${safePercent.toFixed(1)}%`;
  }
  if (cameraAccuracyResult) {
    cameraAccuracyResult.textContent = resultText;
    cameraAccuracyResult.style.color = pass ? '#8cff7a' : '#ff8c8c';
  }
  if (window.EnhancedUI && window.EnhancedUI.updateAccuracyDisplay) {
    window.EnhancedUI.updateAccuracyDisplay(safePercent);
  }
  updateSessionResult(safePercent);
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
  if (!results.image || !canvasElement || !canvasCtx) return;

  latestPoseLandmarks = results.poseLandmarks || null;

  if (results.poseLandmarks) {
    const landmarks = results.poseLandmarks;
    updateStatus('Audience terdeteksi. Titik dan garis saraf mengikuti gerakan.');

    if (referenceLandmarks) {
      const percent = computePoseSimilarity(referenceLandmarks, landmarks);
      updateAccuracyDisplay(percent);

      const refDistances = calculateJointDistances(referenceLandmarks);
      const liveDistances = calculateJointDistances(landmarks);

      if (window.EnhancedUI && window.EnhancedUI.updateDistanceMetrics) {
        window.EnhancedUI.updateDistanceMetrics(
          refDistances.avgDistance,
          liveDistances.avgDistance,
          percent
        );
      }
    }
  } else {
    latestPoseLandmarks = null;
    updateStatus('Tidak ada audience yang terdeteksi. Silakan masuk ke frame kamera.');
  }
  poseBusy = false;
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
    minTrackingConfidence: 0.6,
    selfieMode: false
  });
  pose.onResults(onResults);
} else {
  updateStatus('Library MediaPipe tidak bisa dimuat. Kamera tetap bisa dipakai dalam mode langsung.', false);
}

// Create a separate Pose instance for processing reference images
if (typeof Pose !== 'undefined') {
  poseRef = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
  poseRef.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.6,
    selfieMode: false
  });
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

function syncThreshold(value) {
  similarityThreshold = Number(value);
  if (thresholdLabel) thresholdLabel.textContent = `${similarityThreshold}%`;
  if (thresholdLabelSecondary) thresholdLabelSecondary.textContent = `${similarityThreshold}%`;
  if (thresholdSlider) thresholdSlider.value = `${similarityThreshold}`;
  if (thresholdSliderSecondary) thresholdSliderSecondary.value = `${similarityThreshold}`;
}

function syncMirrorState(value) {
  mirrorCanvas = !!value;
  try { localStorage.setItem('mirrorPref', mirrorCanvas ? 'true' : 'false'); } catch (err) { console.warn('mirror save failed', err); }
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
if (therapyAction) {
  therapyAction.addEventListener('change', () => {
    syncPatientSummary();
    tryAutoLoadReferenceForCamera();
  });
}
if (therapyResult) therapyResult.addEventListener('change', syncPatientSummary);
if (jointMovement) {
  jointMovement.addEventListener('change', () => {
    syncPatientSummary();
    tryAutoLoadReferenceForCamera();
  });
}

// load saved refs on startup
try {
  renderSavedRefs();
  renderAdminGallery();
  autoLoadFirstReference();
} catch (e) { console.warn('renderSavedRefs failed', e); }

// initialize UI state
syncThreshold(similarityThreshold);
syncPatientSummary();
renderSessionHistory();
// disable mirror preference: kamera selalu tampil natural
mirrorCanvas = false;

if (adminRefUpload) {
  adminRefUpload.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const images = Array.from(files).filter((file) => file.type.startsWith('image/')).slice(0, 20);
    if (!images.length) {
      updateStatus('Tidak ada file gambar valid yang dipilih.', true);
      return;
    }

    const saved = JSON.parse(localStorage.getItem('savedPoseRefs') || '[]');
    const newItems = [];
    updateStatus('Memproses foto referensi admin, kamera tetap berjalan...');

    for (const file of images) {
      try {
        const dataUrl = file.size > 500000 ? await compressImageFile(file, 700) : await readFileAsDataURL(file);
        newItems.push({ name: file.name || `admin-ref-${saved.length + newItems.length + 1}`, image: dataUrl, landmarks: null });
      } catch (error) {
        console.warn('Gagal memproses file referensi admin:', file.name, error);
      }
      await waitAnimationFrame();
    }

    if (!newItems.length) {
      updateStatus('Gagal memproses semua foto referensi. Coba unggah kembali satu per satu.', true);
      return;
    }

    const merged = saved.concat(newItems);
    try {
      localStorage.setItem('savedPoseRefs', JSON.stringify(merged));
    } catch (error) {
      console.error('Gagal menyimpan referensi admin ke localStorage', error);
      updateStatus('Penyimpanan referensi gagal. Coba dengan jumlah file lebih sedikit.', true);
      return;
    }

    renderSavedRefs();
    renderAdminGallery();
    autoLoadFirstReference();
    if (therapyAction?.value && jointMovement?.value) {
      tryAutoLoadReferenceForCamera();
    }
    updateStatus(`Foto admin tersimpan ke galeri referensi (${newItems.length} file).`, false);
  });
}

async function startCamera() {
  const permState = await getCameraPermissionState();
  if (permState === 'denied') {
    updateStatus('Izin kamera saat ini ditolak. Silakan cek ikon gembok browser dan coba lagi.', true);
  }

  if (isRunning) {
    stopCamera();
    updateStatus('Kamera dijeda. Klik Mulai Kamera untuk melanjutkan.');
    return;
  }

  if (!videoElement) {
    updateStatus('Elemen video tidak tersedia. Muat ulang halaman dan coba lagi.', true);
    return;
  }

  updateStatus('Memulai kamera...');
  prepareVideoElement();

  try {
    mediaStream = await getCameraStream();
    videoElement.srcObject = mediaStream;
    await videoElement.play();

    await new Promise((resolve, reject) => {
      const onLoaded = () => {
        videoElement.removeEventListener('loadedmetadata', onLoaded);
        videoElement.removeEventListener('loadeddata', onLoaded);
        resolve();
      };
      videoElement.addEventListener('loadedmetadata', onLoaded, { once: true });
      videoElement.addEventListener('loadeddata', onLoaded, { once: true });
      setTimeout(onLoaded, 1000);
    });

    if (videoElement.videoWidth && videoElement.videoHeight) {
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
    }

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

function savePatientSessionHistory() {
  try {
    const history = JSON.parse(localStorage.getItem('patientSessionHistory') || '[]');
    const record = {
      id: Date.now(),
      timestamp: new Date().toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      patientName: patientName?.value || 'Tanpa nama',
      age: patientAge?.value || '-',
      sessionLabel: therapySession?.value || '-',
      sessionDate: sessionDate?.value || new Date().toISOString().slice(0, 10),
      therapyAction: therapyAction?.value || '-',
      jointMovement: jointMovement?.value || '-',
      therapyResult: therapyResult?.value || '-',
      status: sessionStatus?.textContent || 'Menunggu',
      accuracy: sessionAccuracy?.textContent || '--',
      recommendation: sessionRecommendation?.textContent || ''
    };
    history.unshift(record);
    if (history.length > 20) history.length = 20;
    localStorage.setItem('patientSessionHistory', JSON.stringify(history));
    renderSessionHistory();
  } catch (error) {
    console.warn('savePatientSessionHistory failed', error);
  }
}

function renderSessionHistory() {
  if (!sessionHistoryList) return;
  const history = JSON.parse(localStorage.getItem('patientSessionHistory') || '[]');
  sessionHistoryList.innerHTML = '';
  if (!history.length) {
    sessionHistoryList.innerHTML = '<div class="admin-hint">Belum ada riwayat pasien. Hentikan sesi setelah monitoring untuk menyimpannya.</div>';
    return;
  }
  history.forEach((record) => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div class="history-title">
        <span>${record.patientName} — ${record.sessionLabel}</span>
        <span>${record.timestamp}</span>
      </div>
      <div class="history-detail">
        <div><strong>Usia:</strong> ${record.age}</div>
        <div><strong>Hasil:</strong> ${record.therapyResult}</div>
        <div><strong>Aksi:</strong> ${record.therapyAction}</div>
        <div><strong>Sendi:</strong> ${record.jointMovement}</div>
        <div><strong>Status:</strong> ${record.status}</div>
        <div><strong>Akurasi:</strong> ${record.accuracy}</div>
      </div>
      <div class="history-note">${record.recommendation || '-'}</div>
    `;
    sessionHistoryList.appendChild(card);
  });
}

function clearSessionHistory() {
  localStorage.removeItem('patientSessionHistory');
  renderSessionHistory();
  updateStatus('Riwayat pasien dihapus.', false);
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
  if (videoElement) {
    try {
      videoElement.pause();
    } catch (error) {
      console.warn('Gagal pause video', error);
    }
    if (videoElement.srcObject) {
      videoElement.srcObject = null;
    }
  }
  if (sessionAccuracy && sessionAccuracy.textContent !== '--') {
    savePatientSessionHistory();
  }
  isRunning = false;
  setButtons();
  updateStatus('Kamera berhenti. Klik Mulai Kamera untuk memulai ulang.');
}

function switchPage(target) {
  if (patientPage && adminPage) {
    patientPage.classList.toggle('active', target === 'patient');
    adminPage.classList.toggle('active', target === 'admin');
  }
  if (patientTabBtn && adminTabBtn) {
    patientTabBtn.classList.toggle('active', target === 'patient');
    adminTabBtn.classList.toggle('active', target === 'admin');
  }
  if (pageHeading && pageSubtitle) {
    if (target === 'admin') {
      pageHeading.textContent = 'HALAMAN ADMIN';
      pageSubtitle.textContent = 'Atur foto referensi, pilih hasil terapi, dan kelola galeri referensi untuk pasien.';
    } else {
      pageHeading.textContent = 'HALAMAN PASIEN';
      pageSubtitle.textContent = 'Isi data pasien, pilih opsi terapi, lihat layar kamera, dan lihat akurasi secara otomatis.';
    }
  }
}

if (patientTabBtn) patientTabBtn.addEventListener('click', () => switchPage('patient'));
if (adminTabBtn) adminTabBtn.addEventListener('click', () => switchPage('admin'));

if (startBtnSecondary) {
  startBtnSecondary.addEventListener('click', startCamera);
}
if (stopBtnSecondary) {
  stopBtnSecondary.addEventListener('click', stopCamera);
}

if (startBtn) startBtn.addEventListener('click', startCamera);
if (stopBtn) stopBtn.addEventListener('click', stopCamera);
if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearSessionHistory);
setButtons();

// setRefBtn handled earlier (loads selected thumbnail)
