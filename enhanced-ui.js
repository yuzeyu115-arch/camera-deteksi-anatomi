// Enhanced UI Functionality untuk Sistem Deteksi Anatomi
let accuracyData = [];
let accuracyChart = null;
let maxDataPoints = 30;

// Initialize Accuracy Chart
function initAccuracyChart() {
  const ctx = document.getElementById('accuracyChart');
  if (!ctx) return;
  
  // Check if Chart is available
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded yet, retrying...');
    setTimeout(initAccuracyChart, 500);
    return;
  }

  accuracyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Akurasi (%)',
          data: [],
          borderColor: '#6d5cff',
          backgroundColor: 'rgba(109, 92, 255, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#6d5cff',
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#aaa',
            font: { size: 12 },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: '#aaa', font: { size: 11 } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        x: {
          ticks: { color: '#aaa', font: { size: 11 } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
        },
      },
    },
  });
}

// Update Accuracy Display dengan Color Gradient
function updateAccuracyDisplay(accuracy) {
  const accuracyValue = document.getElementById('accuracyValue');
  const accuracyBarFill = document.getElementById('accuracyBarFill');
  const matchScore = document.getElementById('matchScore');

  // Jika accuracy adalah object dari MediaPipe, ambil confidence
  let accValue = accuracy;
  if (typeof accuracy === 'object' && accuracy.value !== undefined) {
    accValue = accuracy.value;
  } else if (typeof accuracy !== 'number') {
    accValue = 0;
  }

  accValue = Math.min(100, Math.max(0, accValue));

  // Update value display
  accuracyValue.textContent = accValue.toFixed(1) + '%';

  // Update bar fill dengan color gradient
  accuracyBarFill.style.width = accValue + '%';

  // Set color based on value: red (0-33) -> yellow (34-66) -> green (67-100)
  let color;
  if (accValue < 34) {
    // Red to Yellow
    const ratio = accValue / 34;
    color = `rgb(${239}, ${68 + ratio * 27}, ${68})`;
  } else if (accValue < 67) {
    // Yellow to Green
    const ratio = (accValue - 34) / 33;
    color = `rgb(${239 - ratio * 217}, ${95 + ratio * 160}, ${68 - ratio * 68})`;
  } else {
    // Green
    color = 'rgb(34, 197, 94)';
  }

  accuracyBarFill.style.background = color;
  matchScore.textContent = Math.round(accValue) + '/100';

  // Add to chart data
  if (accuracyChart) {
    accuracyData.push(accValue);
    if (accuracyData.length > maxDataPoints) {
      accuracyData.shift();
    }

    accuracyChart.data.labels = Array.from(
      { length: accuracyData.length },
      (_, i) => (i + 1).toString()
    );
    accuracyChart.data.datasets[0].data = accuracyData;
    accuracyChart.update('none');
  }
}

// Update Distance Metrics
function updateDistanceMetrics(refDistance, currentDistance, matchPercentage) {
  const distRef = document.getElementById('distRef');
  const distCurrent = document.getElementById('distCurrent');
  const distDiff = document.getElementById('distDiff');

  if (distRef) distRef.textContent = refDistance ? refDistance.toFixed(2) : '--';
  if (distCurrent) distCurrent.textContent = currentDistance ? currentDistance.toFixed(2) : '--';

  if (distRef && distCurrent && refDistance && currentDistance) {
    const diff = Math.abs(refDistance - currentDistance);
    if (distDiff) distDiff.textContent = diff.toFixed(2);
  }

  // Update accuracy from match percentage
  if (matchPercentage !== undefined) {
    updateAccuracyDisplay(matchPercentage);
  }
}

// Get selected therapy action
function getSelectedTherapy() {
  const select = document.getElementById('therapyAction');
  return select ? select.value : '';
}

// Get selected joint movement
function getSelectedJoint() {
  const select = document.getElementById('jointMovement');
  return select ? select.value : '';
}

// Get patient info
function getPatientInfo() {
  return {
    name: document.getElementById('patientName')?.value || 'N/A',
    age: document.getElementById('patientAge')?.value || 'N/A',
    session: document.getElementById('therapySession')?.value || '1',
    date: document.getElementById('sessionDate')?.value || new Date().toISOString().split('T')[0],
  };
}

// Update real-time tracking metrics - THROTTLED to reduce DOM updates
function updateTrackingMetrics(metrics) {
  if (!metrics) return;

  // THROTTLED: Only update display every few calls to avoid DOM thrashing
  if (!window.metricsUpdateCounter) window.metricsUpdateCounter = 0;
  if (++window.metricsUpdateCounter % 8 !== 0) return; // Update every 8th call only (less DOM updates)

  // Create or update tracking status element
  let trackingStatus = document.getElementById('trackingStatusMetrics');
  if (!trackingStatus) {
    trackingStatus = document.createElement('div');
    trackingStatus.id = 'trackingStatusMetrics';
    trackingStatus.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      background: rgba(30, 30, 50, 0.9);
      border: 1px solid rgba(109, 92, 255, 0.6);
      border-radius: 8px;
      padding: 10px;
      font-size: 11px;
      color: #ddd;
      font-family: 'Courier New', monospace;
      z-index: 1000;
      min-width: 130px;
    `;
    document.body.appendChild(trackingStatus);
  }

  // Simple text update instead of innerHTML - far less expensive
  const fps = metrics.fps || 0;
  const motion = metrics.motion || 0;
  const confidence = (metrics.confidence * 100).toFixed(0);
  const fpsColor = fps > 20 ? '#7cfc00' : fps > 15 ? '#ffff00' : '#ff6b6b';
  
  trackingStatus.textContent = `FPS: ${fps.toFixed(0)} | Motion: ${(motion*100).toFixed(0)}px | Conf: ${confidence}%`;
  trackingStatus.style.color = fpsColor;
}

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initAccuracyChart();

  // Update threshold label
  const thresholdSlider = document.getElementById('thresholdSlider');
  const thresholdLabel = document.getElementById('thresholdLabel');
  if (thresholdSlider && thresholdLabel) {
    thresholdSlider.addEventListener('input', (e) => {
      thresholdLabel.textContent = e.target.value + '%';
    });
  }

  // Therapy action change handler
  const therapyAction = document.getElementById('therapyAction');
  if (therapyAction) {
    therapyAction.addEventListener('change', (e) => {
      console.log('Therapy Action Selected:', e.target.value);
    });
  }

  // Joint movement change handler
  const jointMovement = document.getElementById('jointMovement');
  if (jointMovement) {
    jointMovement.addEventListener('change', (e) => {
      console.log('Joint Movement Selected:', e.target.value);
    });
  }

  // Set today's date as default
  const sessionDate = document.getElementById('sessionDate');
  if (sessionDate) {
    sessionDate.valueAsDate = new Date();
  }
});

// Export functions to be used by camera_tracking.js
window.EnhancedUI = {
  updateAccuracyDisplay,
  updateDistanceMetrics,
  getSelectedTherapy,
  getSelectedJoint,
  getPatientInfo,
  initAccuracyChart,
  updateTrackingMetrics,
};
