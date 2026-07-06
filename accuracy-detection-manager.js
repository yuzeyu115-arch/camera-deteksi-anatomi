/**
 * Accuracy Detection Auto-Loader
 * Ensures accuracy detection runs automatically when camera is active
 */

class AccuracyDetectionManager {
  constructor() {
    this.isMonitoring = false;
    this.lastAccuracy = 0;
    this.accuracyUpdateInterval = null;
    this.updateFrequency = 500; // ms
    this.hasReference = false;
    this.referenceCheckInterval = null;
  }

  /**
   * Start automatic accuracy monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('✅ Accuracy Detection Manager: Started monitoring');

    // Periodically check if reference is loaded
    this.referenceCheckInterval = setInterval(() => {
      this.checkReferenceStatus();
    }, 1000);

    // Periodically ensure accuracy display is updated
    this.accuracyUpdateInterval = setInterval(() => {
      this.updateAccuracyDisplay();
    }, this.updateFrequency);
  }

  /**
   * Stop monitoring accuracy
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.accuracyUpdateInterval) {
      clearInterval(this.accuracyUpdateInterval);
      this.accuracyUpdateInterval = null;
    }

    if (this.referenceCheckInterval) {
      clearInterval(this.referenceCheckInterval);
      this.referenceCheckInterval = null;
    }

    console.log('⏸️  Accuracy Detection Manager: Stopped monitoring');
  }

  /**
   * Check if reference landmarks are loaded
   */
  checkReferenceStatus() {
    // Check if referenceLandmarks exists (from camera_tracking.js)
    const hasRef = typeof referenceLandmarks !== 'undefined' && referenceLandmarks && referenceLandmarks.length > 0;
    
    if (hasRef !== this.hasReference) {
      this.hasReference = hasRef;
      
      const refDisplay = document.getElementById('accuracyReferenceStatus');
      if (refDisplay) {
        if (hasRef) {
          refDisplay.textContent = '✅ Reference Loaded';
          refDisplay.style.color = '#22c55e';
        } else {
          refDisplay.textContent = '❌ No Reference';
          refDisplay.style.color = '#ef4444';
        }
      }
    }
  }

  /**
   * Force update accuracy display
   */
  updateAccuracyDisplay() {
    // Only update if we have reference and latest pose landmarks
    if (typeof referenceLandmarks !== 'undefined' && referenceLandmarks &&
        typeof latestPoseLandmarks !== 'undefined' && latestPoseLandmarks) {
      
      // Call compute similarity if available
      if (typeof computePoseSimilarity === 'function') {
        const accuracy = computePoseSimilarity(referenceLandmarks, latestPoseLandmarks);
        this.lastAccuracy = accuracy;
        
        // Update UI if function exists
        if (typeof updateAccuracyDisplay === 'function') {
          updateAccuracyDisplay(accuracy);
        }
      }
    }
  }

  /**
   * Get current accuracy value
   */
  getLastAccuracy() {
    return this.lastAccuracy;
  }

  /**
   * Check if monitoring is active
   */
  isActive() {
    return this.isMonitoring;
  }
}

// Create global instance
window.accuracyDetectionManager = new AccuracyDetectionManager();

/**
 * Start accuracy detection (called from camera_tracking.js)
 */
function startAccuracyDetection() {
  if (window.accuracyDetectionManager) {
    window.accuracyDetectionManager.startMonitoring();
  }
}

/**
 * Stop accuracy detection (called from camera_tracking.js)
 */
function stopAccuracyDetection() {
  if (window.accuracyDetectionManager) {
    window.accuracyDetectionManager.stopMonitoring();
  }
}

// Export functions
window.startAccuracyDetection = startAccuracyDetection;
window.stopAccuracyDetection = stopAccuracyDetection;
