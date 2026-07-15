const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement ? canvasElement.getContext('2d') : null;
const statusElement = document.getElementById('status');
const startBtn = document.getElementById('startBtnSecondary');
const stopBtn = document.getElementById('stopBtnSecondary');
const adminRefUpload = document.getElementById('adminRefUpload');
const cameraRefImage = document.getElementById('cameraRefImage');
const cameraAccuracyValue = document.getElementById('cameraAccuracyValue');
const cameraAccuracyResult = document.getElementById('cameraAccuracyResult');
const accuracyReferenceStatus = document.getElementById('accuracyReferenceStatus');
const patientTabBtn = document.getElementById('patientTabBtn');
const adminTabBtn = document.getElementById('adminTabBtn');
const patientPage = document.getElementById('patientPage');
const adminPage = document.getElementById('adminPage');
const therapyAction = document.getElementById('therapyAction');
const jointMovement = document.getElementById('jointMovement');
const sessionAccuracy = document.getElementById('sessionAccuracy');

let mediaStream = null;
let isRunning = false;
let pose = null;
let poseRef = null;
let referenceLandmarks = null;
let latestRawLandmarks = null;
let poseSenderIntervalId = null;
let lastAccuracyUpdate = 0;
// Keep camera preview and overlay in normal orientation (not mirrored).
const mirrorVideo = false;
const mirrorOverlay = false;
const poseSelfieMode = false;

window.realtimeAccuracy = true;
window.latestPoseLandmarks = null;
window.latestRawLandmarks = null;
window.referenceLandmarks = null;

const poseConnectionsFallback = [
  [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [11, 12], [23, 24]
];

console.log('camera_tracking loaded', { mirrorVideo, mirrorOverlay, poseSelfieMode });

function updateStatus(message, isError = false) {
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.style.color = isError ? '#ff8080' : '#ffffff';
  }
  console.log('[STATUS]', message);
}

function updateAccuracyUI(percent) {
  if (!cameraAccuracyValue || !cameraAccuracyResult) return;
  const safe = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  cameraAccuracyValue.textContent = `${safe.toFixed(1)}%`;
  cameraAccuracyResult.textContent = `Akurasi: ${safe.toFixed(1)}%`;
  cameraAccuracyResult.style.color = safe >= 70 ? '#8cff7a' : '#ff8c8c';
}

function setReferenceStatus(hasReference) {
  if (!accuracyReferenceStatus) return;
  accuracyReferenceStatus.textContent = hasReference ? '? Reference Loaded' : '? No Reference';
  accuracyReferenceStatus.style.color = hasReference ? '#22c55e' : '#ef4444';
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
}

function initPose() {
  if (typeof Pose === 'undefined') {
    updateStatus('MediaPipe Pose belum ter-load. Cek koneksi internet.', true);
    return;
  }

  pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
  pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: false,
    minDetectionConfidence: 0.4,
    minTrackingConfidence: 0.4,
    selfieMode: poseSelfieMode
  });
  pose.onResults(onResults);

  poseRef = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
  poseRef.setOptions({
    modelComplexity: 0,
    smoothLandmarks: false,
    minDetectionConfidence: 0.4,
    minTrackingConfidence: 0.4,
    selfieMode: poseSelfieMode
  });
  poseRef.onResults(onReferenceResults);

  window.pose = pose;
  window.poseRef = poseRef;
  window.computePoseSimilarity = computePoseSimilarity;
  window.updateAccuracyUI = updateAccuracyUI;
  window.updateAccuracyDisplay = updateAccuracyUI;
  window.startCamera = startCamera;
  window.stopCamera = stopCamera;
  window.switchPage = switchPage;
}

function toCanvasPoint(landmark) {
  const x = (landmark.x || 0) * canvasElement.width;
  const y = (landmark.y || 0) * canvasElement.height;
  return {
    x: mirrorOverlay ? canvasElement.width - x : x,
    y
  };
}

function drawPoseLandmarks(landmarks) {
  if (!canvasCtx || !landmarks || !landmarks.length) return;
  canvasCtx.save();
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = 'rgba(124,252,0,0.95)';
  canvasCtx.fillStyle = '#ff4d6d';

  const connections = window.POSE_CONNECTIONS || poseConnectionsFallback;
  connections.forEach(([i, j]) => {
    const a = landmarks[i];
    const b = landmarks[j];
    if (!a || !b) return;
    const pa = toCanvasPoint(a);
    const pb = toCanvasPoint(b);
    canvasCtx.beginPath();
    canvasCtx.moveTo(pa.x, pa.y);
    canvasCtx.lineTo(pb.x, pb.y);
    canvasCtx.stroke();
  });

  landmarks.forEach((lm) => {
    if (!lm) return;
    const p = toCanvasPoint(lm);
    canvasCtx.beginPath();
    canvasCtx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    canvasCtx.fill();
  });

  canvasCtx.restore();
}

function drawVideoFrame() {
  if (!videoElement || !canvasElement || !canvasCtx) return;
  if (videoElement.readyState < 2 || !videoElement.videoWidth || !videoElement.videoHeight) return;
  if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
  }
  canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.save();
  if (mirrorVideo) {
    canvasCtx.setTransform(-1, 0, 0, 1, canvasElement.width, 0);
  } else {
    canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
  }
  canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.restore();

  if (latestRawLandmarks && latestRawLandmarks.length) {
    drawPoseLandmarks(latestRawLandmarks);
  }
}

async function getCameraStream() {
  return await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 20, max: 25 } }, audio: false });
}

async function startCamera() {
  if (isRunning) return;
  if (!videoElement) return updateStatus('Elemen video tidak ditemukan.', true);
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return updateStatus('Browser tidak mendukung kamera.', true);
  }
  if (!pose) initPose();

  updateStatus('Memulai kamera...');
  try {
    mediaStream = await getCameraStream();
    videoElement.srcObject = mediaStream;
    await videoElement.play();
    if (videoElement) videoElement.style.transform = 'none';
    if (canvasElement) canvasElement.style.transform = 'none';
    isRunning = true;
    updateStatus('Kamera aktif. Menunggu deteksi...');
    if (typeof startAccuracyDetection === 'function') startAccuracyDetection();
    requestAnimationFrame(stepCamera);
    if (pose && typeof pose.send === 'function') {
      if (poseSenderIntervalId) clearInterval(poseSenderIntervalId);
      poseSenderIntervalId = setInterval(() => {
        if (videoElement.readyState >= 2) {
          pose.send({ image: videoElement });
        }
      }, 100);
    }
  } catch (error) {
    console.error('startCamera error', error);
    updateStatus('Gagal membuka kamera: ' + (error.message || error), true);
  }
}

function stopCamera() {
  if (poseSenderIntervalId) {
    clearInterval(poseSenderIntervalId);
    poseSenderIntervalId = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
  if (videoElement) {
    try { videoElement.pause(); } catch (e) {}
    videoElement.srcObject = null;
  }
  isRunning = false;
  updateStatus('Kamera berhenti. Klik Mulai untuk kembali.');
  if (typeof stopAccuracyDetection === 'function') stopAccuracyDetection();
}

function stepCamera() {
  if (!isRunning) return;
  drawVideoFrame();
  requestAnimationFrame(stepCamera);
}

function onResults(results) {
  if (!results) return;
  latestRawLandmarks = results.poseLandmarks || null;
  window.latestRawLandmarks = latestRawLandmarks;
  window.latestPoseLandmarks = latestRawLandmarks;

  if (latestRawLandmarks && latestRawLandmarks.length) {
    updateStatus('Pose terdeteksi. Overlay aktif.');
  } else {
    updateStatus('Menunggu pose...');
  }
  if (referenceLandmarks && latestRawLandmarks && latestRawLandmarks.length) {
    const now = Date.now();
    if (now - lastAccuracyUpdate > 800) {
      lastAccuracyUpdate = now;
      const acc = computePoseSimilarity(referenceLandmarks, latestRawLandmarks);
      updateAccuracyUI(acc);
      console.log('computed similarity', acc);
    }
  }
}

function onReferenceResults(results) {
  if (!results || !results.poseLandmarks || !results.poseLandmarks.length) {
    updateStatus('Gagal mendeteksi reference pose.', true);
    setReferenceStatus(false);
    return;
  }
  referenceLandmarks = results.poseLandmarks.map((l) => ({ x: l.x, y: l.y, z: l.z }));
  window.referenceLandmarks = referenceLandmarks;
  setReferenceStatus(true);
  updateStatus('Foto referensi dimuat. Silakan mulai kamera.');
}

function loadReferenceFromDataUrl(dataUrl) {
  const img = new Image();
  img.onload = () => {
    if (cameraRefImage) cameraRefImage.src = dataUrl;
    if (poseRef && typeof poseRef.send === 'function') {
      poseRef.send({ image: img });
      updateStatus('Memproses foto referensi...');
    } else {
      updateStatus('Pose reference tidak tersedia.', true);
    }
  };
  img.onerror = () => updateStatus('Gagal memuat foto referensi.', true);
  img.src = dataUrl;
}

function autoLoadFirstReference() {
  try {
    const saved = JSON.parse(localStorage.getItem('savedPoseRefs') || '[]');
    const first = saved.find((item) => item && item.image);
    if (first) {
      loadReferenceFromDataUrl(first.image);
      return true;
    }
  } catch (e) {
    console.warn('autoLoadFirstReference error', e);
  }
  setReferenceStatus(false);
  return false;
}

function computePoseSimilarity(ref, live) {
  if (!Array.isArray(ref) || !Array.isArray(live) || ref.length === 0 || live.length === 0) return 0;
  const total = Math.min(ref.length, live.length);
  const indices = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].filter((i) => i < total);
  let sum = 0;
  let count = 0;
  const center = (landmarks) => {
    const left = landmarks[11] || landmarks[23];
    const right = landmarks[12] || landmarks[24];
    if (!left || !right) return { x: 0.5, y: 0.5, scale: 1 };
    const cx = (left.x + right.x) / 2;
    const cy = (left.y + right.y) / 2;
    const scale = Math.hypot(left.x - right.x, left.y - right.y) || 1e-6;
    return { cx, cy, scale };
  };
  const r = center(ref);
  const l = center(live);
  indices.forEach((i) => {
    const ra = ref[i];
    const la = live[i];
    if (!ra || !la) return;
    const rx = (ra.x - r.cx) / r.scale;
    const ry = (ra.y - r.cy) / r.scale;
    const lx = (la.x - l.cx) / l.scale;
    const ly = (la.y - l.cy) / l.scale;
    const d = Math.hypot(rx - lx, ry - ly);
    const sim = Math.max(0, 1 - d / 0.5);
    sum += sim;
    count += 1;
  });
  return count ? (sum / count) * 100 : 0;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target.result);
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.readAsDataURL(file);
  });
}

function initUI() {
  if (patientTabBtn) patientTabBtn.addEventListener('click', () => switchPage('patient'));
  if (adminTabBtn) adminTabBtn.addEventListener('click', () => switchPage('admin'));
  if (startBtn) startBtn.addEventListener('click', startCamera);
  if (stopBtn) stopBtn.addEventListener('click', stopCamera);
  if (adminRefUpload) {
    adminRefUpload.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.type.startsWith('image/')) return updateStatus('Pilih file gambar.', true);
      try {
        const dataUrl = await readFileAsDataURL(file);
        loadReferenceFromDataUrl(dataUrl);
      } catch (err) {
        updateStatus('Gagal membaca file referensi.', true);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initPose();
  initUI();
  autoLoadFirstReference();
  if (statusElement) statusElement.style.display = 'block';
});
