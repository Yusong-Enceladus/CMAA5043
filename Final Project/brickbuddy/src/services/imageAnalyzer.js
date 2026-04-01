/**
 * ImageAnalyzer — Canvas-based photo analysis for camera input.
 * Extracts dominant colors and simple shape features from the captured photo
 * to suggest which robot model the child might be drawing/showing.
 */

/**
 * Extract dominant colors from an image data URL.
 * Samples pixels from the image and groups them into color buckets.
 */
function extractColors(imageDataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 64; // Downsample for speed
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      const buckets = {
        red: 0, green: 0, blue: 0, yellow: 0,
        orange: 0, brown: 0, grey: 0, white: 0, black: 0,
      };
      let totalPixels = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const lum = (r + g + b) / 3;

        // Skip near-transparent or near-white backgrounds
        if (lum > 240) { buckets.white++; totalPixels++; continue; }
        if (lum < 30) { buckets.black++; totalPixels++; continue; }

        const saturation = max - min;
        if (saturation < 30) {
          buckets.grey++;
          totalPixels++;
          continue;
        }

        // Classify by hue
        if (r > 180 && g < 100 && b < 100) buckets.red++;
        else if (r < 100 && g > 150 && b < 100) buckets.green++;
        else if (r < 100 && g < 100 && b > 150) buckets.blue++;
        else if (r > 180 && g > 150 && b < 80) buckets.yellow++;
        else if (r > 180 && g > 100 && g < 170 && b < 80) buckets.orange++;
        else if (r > 100 && r < 180 && g > 60 && g < 130 && b < 80) buckets.brown++;
        else if (r > 150 && g < 130 && b < 130) buckets.red++;
        else if (g > 130 && r < 150 && b < 150) buckets.green++;
        else if (b > 130 && r < 150 && g < 150) buckets.blue++;
        else buckets.grey++;

        totalPixels++;
      }

      // Normalize to percentages
      const result = {};
      for (const [key, count] of Object.entries(buckets)) {
        result[key] = totalPixels > 0 ? count / totalPixels : 0;
      }
      resolve(result);
    };
    img.onerror = () => resolve(null);
    img.src = imageDataUrl;
  });
}

/**
 * Detect rough shape characteristics from the image.
 * Uses simple edge density in different regions.
 */
function analyzeShape(imageDataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 64;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;

      // Simple edge detection: count brightness changes between adjacent pixels
      let horizontalEdges = 0;
      let verticalEdges = 0;
      let topHalf = 0;
      let bottomHalf = 0;

      const getBrightness = (x, y) => {
        const i = (y * size + x) * 4;
        return (data[i] + data[i + 1] + data[i + 2]) / 3;
      };

      for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
          const center = getBrightness(x, y);
          const right = getBrightness(x + 1, y);
          const below = getBrightness(x, y + 1);

          if (Math.abs(center - right) > 40) {
            verticalEdges++;
            if (y < size / 2) topHalf++;
            else bottomHalf++;
          }
          if (Math.abs(center - below) > 40) {
            horizontalEdges++;
          }
        }
      }

      resolve({
        horizontalEdges,
        verticalEdges,
        topHeavy: topHalf > bottomHalf * 1.3,
        aspectRatio: horizontalEdges > 0 ? verticalEdges / horizontalEdges : 1,
        edgeDensity: (horizontalEdges + verticalEdges) / (size * size),
      });
    };
    img.onerror = () => resolve(null);
    img.src = imageDataUrl;
  });
}

/**
 * Analyze a photo and suggest a robot model.
 * Returns { modelId, confidence, reason }.
 */
export async function analyzePhoto(imageDataUrl) {
  const [colors, shape] = await Promise.all([
    extractColors(imageDataUrl),
    analyzeShape(imageDataUrl),
  ]);

  if (!colors || !shape) {
    return { modelId: 'dog', confidence: 0.3, reason: 'Could not analyze the image clearly' };
  }

  // Score each model based on color and shape analysis
  const scores = { dog: 0, car: 0, dino: 0 };
  const reasons = { dog: [], car: [], dino: [] };

  // Color-based scoring
  if (colors.red > 0.1 || colors.orange > 0.08) {
    scores.dog += 2;
    reasons.dog.push('warm colors like a puppy');
  }
  if (colors.blue > 0.12) {
    scores.car += 2;
    reasons.car.push('blue tones like a race car');
  }
  if (colors.green > 0.12) {
    scores.dino += 3;
    reasons.dino.push('green colors like a dinosaur');
  }
  if (colors.yellow > 0.1) {
    scores.car += 1;
    reasons.car.push('bright accents');
  }
  if (colors.brown > 0.08) {
    scores.dog += 1;
    reasons.dog.push('earthy tones');
  }
  if (colors.grey > 0.15) {
    scores.car += 1;
    reasons.car.push('metallic look');
  }

  // Shape-based scoring
  if (shape.topHeavy) {
    scores.dino += 2; // Dinos have big heads/necks
    reasons.dino.push('a tall shape like a dinosaur neck');
  }
  if (shape.aspectRatio > 1.3) {
    scores.car += 2; // Cars are long/horizontal
    reasons.car.push('a long shape like a vehicle');
  }
  if (shape.aspectRatio < 0.8) {
    scores.dino += 1;
    reasons.dino.push('a vertical shape');
  }
  if (shape.edgeDensity > 0.3) {
    scores.dog += 1; // Dogs have lots of detail (legs, tail, head)
    reasons.dog.push('lots of details');
  }

  // Find best match
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestId, bestScore] = entries[0];
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? bestScore / totalScore : 0.33;

  const topReasons = reasons[bestId].slice(0, 2);
  const reasonText = topReasons.length > 0
    ? `I can see ${topReasons.join(' and ')} in your photo`
    : 'Based on what I can see in your photo';

  return {
    modelId: bestId,
    confidence: Math.min(confidence, 0.95),
    reason: reasonText,
  };
}
