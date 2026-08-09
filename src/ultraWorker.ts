type UltraTick = {
  type: "tick";
  time: number;
  frameDelta: number;
  frameRateMode: "60" | "120" | "unlimited";
  mobile: boolean;
  rainCount: number;
};

let averageFrameTime = 16.67;
let renderScale = 1;
let targetFps = 60;
let peakFps = 60;
let performancePressure = 0;
let postQuality = 2;

const hash = (value: number) => {
  const x = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

self.onmessage = (event: MessageEvent<UltraTick>) => {
  const message = event.data;
  if (message.type !== "tick") return;

  const measured = Math.max(4, Math.min(40, message.frameDelta));
  averageFrameTime = averageFrameTime * 0.9 + measured * 0.1;
  const refreshEstimate = 1000 / averageFrameTime;

  if (message.frameRateMode === "unlimited") targetFps = 0;
  else if (message.frameRateMode === "120" && refreshEstimate >= 108 && renderScale >= 0.78) targetFps = 120;
  else if (message.frameRateMode === "120" && refreshEstimate >= 82 && renderScale >= 0.72) targetFps = 90;
  else targetFps = 60;
  peakFps = Math.max(peakFps, targetFps || Math.min(240, Math.round(refreshEstimate)));

  const targetFrameTime = targetFps > 0 ? 1000 / targetFps : Math.min(16.67, 1000 / Math.max(60, refreshEstimate));
  if (averageFrameTime > targetFrameTime * 1.2) renderScale = Math.max(0.62, renderScale - 0.045);
  else if (averageFrameTime < targetFrameTime * 1.04) renderScale = Math.min(1, renderScale + 0.012);

  // Browsers expose no temperature sensor. Sustained frame-time degradation is
  // used as a local proxy for thermal or power throttling.
  const sustainedStress = averageFrameTime > targetFrameTime * 1.16
    || renderScale <= 0.7
    || (message.frameRateMode === "120" && peakFps >= 120 && targetFps < 120);
  performancePressure = Math.max(0, Math.min(1,
    performancePressure + (sustainedStress ? (message.mobile ? 0.035 : 0.022) : -0.012),
  ));
  postQuality = performancePressure > 0.72 ? 0 : performancePressure > 0.34 ? 1 : 2;

  // Keep the gameplay canvas untouched. Under sustained GPU pressure the
  // worker reduces only atmospheric instances before lowering post quality.
  const density = postQuality === 2 ? 1 : postQuality === 1 ? .68 : .42;
  const count = Math.max(32, Math.min(240, Math.round(message.rainCount * density)));
  const instances = new Float32Array(count * 8);
  const seconds = message.time * 0.001;
  for (let index = 0; index < count; index += 1) {
    const offset = index * 8;
    const seed = hash(index + 1);
    const pink = hash(index + 91) > 0.72;
    instances[offset] = (hash(index + 17) + seconds * (0.035 + seed * 0.045)) % 1;
    instances[offset + 1] = (hash(index + 53) + seconds * (0.42 + seed * 0.5)) % 1;
    instances[offset + 2] = 0.0007 + seed * 0.0015;
    instances[offset + 3] = 0.018 + hash(index + 31) * 0.055;
    instances[offset + 4] = pink ? 1 : 0.05;
    instances[offset + 5] = pink ? 0.08 : 0.76;
    instances[offset + 6] = pink ? 0.46 : 1;
    instances[offset + 7] = 0.14 + seed * 0.24;
  }

  self.postMessage({
    type: "frame",
    buffer: instances.buffer,
    renderScale,
    targetFps,
    postQuality,
    averageFrameTime,
  }, { transfer: [instances.buffer] });
};

export {};
