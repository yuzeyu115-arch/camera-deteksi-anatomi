/**
 * Enhanced Pose Tracker with Real-time Smoothing and Optimization
 * Improves responsiveness and accuracy of pose detection
 */

class EnhancedPoseTracker {
  constructor() {
    this.smoothedLandmarks = null;
    this.previousLandmarks = null;
    this.smoothingFactor = 0.25; // EMA smoothing (0.25 = 25% previous, 75% current) - VERY LOW for real-time
    this.adaptiveSmoothing = true;
    this.motionThreshold = 0.08; // pixels threshold for detecting motion - HIGHER
    this.fpsHistory = [];
    this.lastFrameTime = Date.now();
    this.fps = 0;
    this.detectionQuality = 'medium';
    this.confidenceThreshold = 0.5; // Dynamic detection confidence
  }

  /**
   * Apply Exponential Moving Average smoothing to landmarks
   * Balances between responsiveness and stability
   */
  smoothLandmarks(landmarks, dynamicSmoothing = true) {
    if (!landmarks || landmarks.length === 0) {
      return landmarks;
    }

    if (this.previousLandmarks === null) {
      this.previousLandmarks = JSON.parse(JSON.stringify(landmarks));
      this.smoothedLandmarks = landmarks;
      return landmarks;
    }

    const smoothed = landmarks.map((landmark, idx) => {
      if (!landmark || !this.previousLandmarks[idx]) {
        return landmark;
      }

      const prev = this.previousLandmarks[idx];
      
      // Calculate motion magnitude
      const dx = landmark.x - prev.x;
      const dy = landmark.y - prev.y;
      const motion = Math.sqrt(dx * dx + dy * dy);

      // Adaptive smoothing: less smoothing during fast motion
      let smoothFactor = this.smoothingFactor;
      if (dynamicSmoothing && motion > this.motionThreshold) {
        // Reduce smoothing during active movement for faster response
        smoothFactor = Math.max(0.15, this.smoothingFactor - (motion * 0.8)); // INCREASED reduction rate from 0.5 to 0.8
      }

      return {
        x: prev.x * smoothFactor + landmark.x * (1 - smoothFactor),
        y: prev.y * smoothFactor + landmark.y * (1 - smoothFactor),
        z: landmark.z || 0,
        visibility: landmark.visibility || 0.5
      };
    });

    this.previousLandmarks = JSON.parse(JSON.stringify(landmarks));
    this.smoothedLandmarks = smoothed;
    return smoothed;
  }

  /**
   * Calculate and update FPS counter
   */
  updateFPS() {
    const now = Date.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.fpsHistory.push(1000 / deltaTime);
    
    // Keep last 30 frames
    if (this.fpsHistory.length > 30) {
      this.fpsHistory.shift();
    }

    this.fps = Math.round(
      this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
    );

    return this.fps;
  }

  /**
   * Adjust detection confidence based on FPS
   * Lower confidence for better tracking when FPS is good
   */
  adaptiveConfidence() {
    if (this.fps > 24) {
      this.confidenceThreshold = 0.5; // Good FPS, lower threshold for better tracking
    } else if (this.fps > 18) {
      this.confidenceThreshold = 0.55;
    } else {
      this.confidenceThreshold = 0.6; // Lower FPS, higher threshold for stability
    }
    return this.confidenceThreshold;
  }

  /**
   * Calculate motion velocity for all keypoints
   */
  calculateMotionMetrics(landmarks) {
    if (!this.previousLandmarks || !landmarks) {
      return { maxMotion: 0, avgMotion: 0, isHighMotion: false };
    }

    let totalMotion = 0;
    let maxMotion = 0;
    let validPoints = 0;

    for (let i = 0; i < Math.min(landmarks.length, this.previousLandmarks.length); i++) {
      const curr = landmarks[i];
      const prev = this.previousLandmarks[i];

      if (!curr || !prev) continue;

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const motion = Math.sqrt(dx * dx + dy * dy);

      totalMotion += motion;
      maxMotion = Math.max(maxMotion, motion);
      validPoints++;
    }

    const avgMotion = validPoints > 0 ? totalMotion / validPoints : 0;

    return {
      maxMotion,
      avgMotion,
      isHighMotion: avgMotion > this.motionThreshold * 2
    };
  }

  /**
   * Filter unreliable landmarks based on confidence
   */
  filterByConfidence(landmarks, threshold = 0.5) {
    if (!landmarks) return landmarks;

    return landmarks.map(landmark => {
      if (!landmark) return landmark;
      
      if ((landmark.visibility || 0) < threshold) {
        return {
          x: landmark.x,
          y: landmark.y,
          z: landmark.z || 0,
          visibility: landmark.visibility || 0,
          filtered: true
        };
      }
      return landmark;
    });
  }

  /**
   * Get detailed tracking status
   */
  getStatus() {
    return {
      fps: this.fps,
      smoothingFactor: this.smoothingFactor,
      confidenceThreshold: this.confidenceThreshold,
      hasSmoothedData: this.smoothedLandmarks !== null,
      qualityLevel: this.detectionQuality
    };
  }

  /**
   * Reset tracker state
   */
  reset() {
    this.smoothedLandmarks = null;
    this.previousLandmarks = null;
    this.fpsHistory = [];
    this.lastFrameTime = Date.now();
  }
}

// Create global instance
window.poseTrackerEnhanced = new EnhancedPoseTracker();

/**
 * Helper function to apply all enhancements
 */
function applyPoseTrackingEnhancements(landmarks) {
  if (!window.poseTrackerEnhanced) {
    return landmarks;
  }

  // Update FPS counter
  window.poseTrackerEnhanced.updateFPS();

  // Skip confidence filter for performance - MediaPipe already filters
  // Just apply smoothing directly for speed
  const smoothed = window.poseTrackerEnhanced.smoothLandmarks(landmarks, true);

  // Calculate motion metrics
  const metrics = window.poseTrackerEnhanced.calculateMotionMetrics(smoothed);

  // Store for UI
  if (window.EnhancedUI && window.EnhancedUI.updateTrackingMetrics) {
    window.EnhancedUI.updateTrackingMetrics({
      fps: window.poseTrackerEnhanced.fps,
      motion: metrics.avgMotion,
      maxMotion: metrics.maxMotion,
      confidence: window.poseTrackerEnhanced.confidenceThreshold
    });
  }

  return smoothed;
}

// Export for use
window.applyPoseTrackingEnhancements = applyPoseTrackingEnhancements;
