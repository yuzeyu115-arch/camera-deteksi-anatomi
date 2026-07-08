/**
 * Accuracy Detection Auto-Loader
 * Ensures accuracy detection runs automatically when camera is active
 */

class AccuracyDetectionManager {
  constructor() {
    this.isMonitoring = false;
    this.lastAccuracy = 0;
    this.accuracyUpdateInterval = null;
    this.updateFrequency = 1000; // ms
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

    // Periodically check if reference is loaded, but less aggressively to save CPU
    this.referenceCheckInterval = setInterval(() => {
      if (document.hidden) return;
      this.checkReferenceStatus();
    }, 2000);

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
    // BUG FIX: Check if globals are defined (might not be if scripts load out of order)
    if (typeof referenceLandmarks === 'undefined' || typeof latestPoseLandmarks === 'undefined') {
      return;
    }
    
    const hasRef = referenceLandmarks && Array.isArray(referenceLandmarks) && referenceLandmarks.length > 0;
    
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
    // BUG FIX: Add multiple safety checks before accessing globals
    try {
      if (document.hidden) return;
      if (typeof referenceLandmarks === 'undefined' || typeof latestPoseLandmarks === 'undefined' || 
          typeof computePoseSimilarity === 'undefined' || typeof updateAccuracyDisplay === 'undefined') {
        return;
      }
      
      if (!referenceLandmarks || !Array.isArray(referenceLandmarks) || referenceLandmarks.length === 0) {
        return;
      }
      
      if (!latestPoseLandmarks || !Array.isArray(latestPoseLandmarks) || latestPoseLandmarks.length === 0) {
        return;
      }
      
      // Choose source for similarity: prefer raw landmarks if hybrid realtime mode is enabled
      const similaritySource = (window.realtimeAccuracy && typeof latestRawLandmarks !== 'undefined' && latestRawLandmarks) ? latestRawLandmarks : latestPoseLandmarks;
      // Call compute similarity
      const accuracy = computePoseSimilarity(referenceLandmarks, similaritySource);
      
      if (!Number.isFinite(accuracy)) {
        return;
      }
      
      this.lastAccuracy = accuracy;
      
      // Update UI
      updateAccuracyDisplay(accuracy);
    } catch (error) {
      // Silently catch errors - don't break monitoring on exception
      console.warn('AccuracyDetectionManager: Error updating accuracy display', error);
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
