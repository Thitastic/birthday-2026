Mic fix:
- Included page5.js.
- Removed 400Hz low-pass filter.
- Direct RMS microphone detection.
- Threshold 0.012 plus ambient calibration/margin.
- AudioContext resume() after stream creation.
- Continuous blow for ~450ms required.
