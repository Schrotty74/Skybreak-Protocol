// GPU and WebGL renderers are isolated from React and game-state code.
type Quality = "low" | "medium" | "high" | "ultra";
type RenderResolution = "720p" | "1080p" | "4k";
const QUALITY_SETTINGS = {
  low: { glFps: 12, glDpr: .7, webgl: false }, medium: { glFps: 30, glDpr: 1, webgl: true },
  high: { glFps: 45, glDpr: 1.5, webgl: true }, ultra: { glFps: 60, glDpr: 2.5, webgl: true },
} as const;
function activeQualitySettings(quality: Quality) { return QUALITY_SETTINGS[quality]; }
function cappedPixelRatio(rect: DOMRect, preferredRatio: number, resolution: RenderResolution, maxTextureSize = Infinity) {
  const target = resolution === "4k" ? { width: 3840, height: 2160 } : resolution === "1080p" ? { width: 1920, height: 1080 } : { width: 1280, height: 720 };
  return Math.min(preferredRatio, target.width / Math.max(1, rect.width), target.height / Math.max(1, rect.height), maxTextureSize / Math.max(1, rect.width), maxTextureSize / Math.max(1, rect.height));
}
export type EffectCleanup = () => void;

export async function startWebGpuEffects(
  canvas: HTMLCanvasElement,
  updateRenderer: (name: string) => void,
  getSceneInstances: () => Float32Array,
  getResolution: () => RenderResolution,
  getAtmosphereIntensity: () => number,
  updateGpuFrameMs?: (milliseconds: number | null) => void,
): Promise<EffectCleanup | null> {
  const gpu = (navigator as Navigator & { gpu?: any }).gpu;
  if (!gpu) return null;

  const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) return null;
  if (adapter.info?.isFallbackAdapter) return null;
  const maxTextureSize = Math.min(Number(adapter.limits?.maxTextureDimension2D || 4096), 4096);
  const supportsTimestampQuery = Boolean(adapter.features?.has?.("timestamp-query"));
  let device: any;
  try {
    device = await adapter.requestDevice(supportsTimestampQuery ? { requiredFeatures: ["timestamp-query"] } : undefined);
  } catch {
    device = await adapter.requestDevice();
  }
  const format = gpu.getPreferredCanvasFormat();
  const shader = device.createShaderModule({
    label: "Skybreak Ultra atmosphere",
    code: `
      struct Uniforms {
        resolution: vec2f,
        time: f32,
        intensity: f32,
      };
      @group(0) @binding(0) var<uniform> uniforms: Uniforms;

      fn hash(p: vec2f) -> f32 {
        return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
      }

      fn noise(p: vec2f) -> f32 {
        let i = floor(p);
        var f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2f(1.0, 0.0)), f.x),
                   mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), f.x), f.y);
      }

      @vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
        var points = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
        return vec4f(points[index], 0.0, 1.0);
      }

      @fragment fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
        let uv = position.xy / uniforms.resolution;
        var p = uv * 2.0 - 1.0;
        p.x *= uniforms.resolution.x / uniforms.resolution.y;
        let t = uniforms.time;
        let n1 = noise(p * 3.1 + vec2f(t * 0.05, -t * 0.08));
        let n2 = noise(p * 6.3 - vec2f(t * 0.08, t * 0.04));

        let fogA = exp(-7.0 * abs(p.y + 0.28 + sin(p.x * 2.4 + t * 0.25) * 0.13));
        let fogB = exp(-10.0 * abs(p.y - 0.34 + sin(p.x * 3.7 - t * 0.19) * 0.09));
        let fogC = exp(-14.0 * abs(p.y + 0.02 + sin(p.x * 5.1 + t * 0.31) * 0.05));
        var color = vec3f(0.0, 0.82, 1.0) * fogA * n1 * 0.2;
        color += vec3f(1.0, 0.03, 0.4) * fogB * (1.0 - n1) * 0.18;
        color += vec3f(0.42, 0.18, 1.0) * fogC * n2 * 0.1;

        let rainUv = uv * vec2f(150.0, 32.0);
        let lane = floor(rainUv.x);
        let drop = fract(rainUv.y + t * (3.0 + hash(vec2f(lane, 4.0))) + hash(vec2f(lane, 7.0)) * 9.0);
        let rain = smoothstep(0.93, 1.0, drop) * step(0.73, hash(vec2f(lane, floor(rainUv.y))));
        color += mix(vec3f(0.0, 0.78, 1.0), vec3f(1.0, 0.06, 0.48), hash(vec2f(lane, 2.0))) * rain * 0.15;

        let gridX = 1.0 - smoothstep(0.0, 0.035, abs(fract(uv.x * 28.0) - 0.5));
        let gridY = 1.0 - smoothstep(0.0, 0.045, abs(fract(uv.y * 18.0 + t * 0.05) - 0.5));
        color += vec3f(0.0, 0.45, 0.62) * max(gridX, gridY) * 0.035;

        let beamA = exp(-18.0 * abs(p.x - sin(t * 0.16) * 0.5 - p.y * 0.28));
        let beamB = exp(-21.0 * abs(p.x + cos(t * 0.13) * 0.62 + p.y * 0.34));
        color += vec3f(0.0, 0.62, 0.82) * beamA * 0.045;
        color += vec3f(0.85, 0.02, 0.34) * beamB * 0.04;

        let bloom = exp(-5.5 * length(p - vec2f(sin(t * 0.11) * 0.5, 0.18)));
        color += vec3f(0.18, 0.72, 1.0) * bloom * 0.065;
        // GPU-composed city fixtures: subtle animated signs and sodium lamps
        // float above the static undercity art without redrawing Canvas paths.
        let flicker = 0.72 + sin(t * 7.0) * 0.18 + sin(t * 15.0) * 0.08;
        let signA = 1.0 - smoothstep(0.0, 0.008, max(abs(uv.x - 0.20) - 0.058, abs(uv.y - 0.29) - 0.010));
        let signB = 1.0 - smoothstep(0.0, 0.008, max(abs(uv.x - 0.72) - 0.046, abs(uv.y - 0.43) - 0.009));
        let lampA = exp(-210.0 * abs(uv.x - 0.085)) * (1.0 - smoothstep(0.18, 0.71, uv.y));
        let lampB = exp(-250.0 * abs(uv.x - 0.90)) * (1.0 - smoothstep(0.24, 0.76, uv.y));
        color += vec3f(0.95, 0.025, 0.38) * signA * flicker * 0.20;
        color += vec3f(0.0, 0.82, 1.0) * signB * flicker * 0.18;
        color += vec3f(1.0, 0.34, 0.05) * (lampA + lampB) * 0.055;
        // Bloom around the actual major signs and lamps in the static Level 1
        // artwork. These are deliberately broad so they read as emitted light,
        // not as extra flat UI rectangles.
        let pinkBillboard = exp(-185.0 * dot(uv - vec2f(0.158, 0.465), uv - vec2f(0.158, 0.465)));
        let cyanBillboard = exp(-230.0 * dot(uv - vec2f(0.228, 0.422), uv - vec2f(0.228, 0.422)));
        let tallCyan = exp(-250.0 * dot(uv - vec2f(0.675, 0.335), uv - vec2f(0.675, 0.335)));
        let pinkTower = exp(-205.0 * dot(uv - vec2f(0.742, 0.485), uv - vec2f(0.742, 0.485)));
        let warmLampLeft = exp(-340.0 * dot(uv - vec2f(0.075, 0.635), uv - vec2f(0.075, 0.635)));
        let warmLampRight = exp(-340.0 * dot(uv - vec2f(0.895, 0.645), uv - vec2f(0.895, 0.645)));
        color += vec3f(1.0, 0.02, 0.34) * (pinkBillboard + pinkTower) * (0.14 + flicker * 0.14);
        color += vec3f(0.0, 0.72, 1.0) * (cyanBillboard + tallCyan) * (0.12 + flicker * 0.13);
        color += vec3f(1.0, 0.32, 0.04) * (warmLampLeft + warmLampRight) * 0.18;
        let scan = sin(position.y * 1.7 + t * 3.2) * 0.5 + 0.5;
        color += vec3f(0.02, 0.05, 0.08) * scan * 0.035;
        color *= uniforms.intensity;

        let alpha = clamp(max(max(color.r, color.g), color.b) * 1.75, 0.0, 0.34);
        return vec4f(color, alpha);
      }

      // Showcase-only GPU stress pass. It deliberately combines multi-octave
      // turbulence, cell noise, chromatic wave fronts and a soft vignette in
      // one shader; normal gameplay never selects this entry point.
      fn fbm(p0: vec2f) -> f32 {
        var p = p0;
        var value = 0.0;
        var amplitude = 0.5;
        for (var octave: i32 = 0; octave < 8; octave = octave + 1) {
          value += noise(p) * amplitude;
          p = p * 2.03 + vec2f(17.3, 9.2);
          amplitude *= 0.5;
        }
        return value;
      }

      fn cellular(p: vec2f) -> f32 {
        let cell = floor(p);
        let local = fract(p);
        var nearest = 1.0;
        for (var y: i32 = -2; y <= 2; y = y + 1) {
          for (var x: i32 = -2; x <= 2; x = x + 1) {
            let offset = vec2f(f32(x), f32(y));
            let point = vec2f(hash(cell + offset), hash(cell + offset + vec2f(31.7, 11.9)));
            nearest = min(nearest, length(offset + point - local));
          }
        }
        return nearest;
      }

      @fragment fn showcaseFragment(@builtin(position) position: vec4f) -> @location(0) vec4f {
        let uv = position.xy / uniforms.resolution;
        var p = uv * 2.0 - 1.0;
        p.x *= uniforms.resolution.x / uniforms.resolution.y;
        let t = uniforms.time;
        let flow = fbm(p * 2.8 + vec2f(t * 0.10, -t * 0.07));
        let detail = fbm(p * 8.6 - vec2f(t * 0.18, t * 0.13));
        let cells = cellular(p * 9.0 + vec2f(t * 0.12, -t * 0.09));
        let core = vec2f(sin(t * 0.19) * 0.28, cos(t * 0.16) * 0.18);
        let distance = length(p - core);
        let ringA = exp(-68.0 * abs(distance - (0.22 + flow * 0.10)));
        let ringB = exp(-96.0 * abs(distance - (0.48 + detail * 0.05)));
        let rays = pow(max(0.0, sin(atan2(p.y, p.x) * 12.0 + t * 1.7 + flow * 5.0)), 13.0);
        let cellEdge = smoothstep(0.18, 0.035, cells) * (0.25 + detail * 0.75);
        let vignette = smoothstep(1.35, 0.22, length(p));
        var color = vec3f(0.0, 0.72, 1.0) * (ringA * 0.22 + cellEdge * 0.075);
        color += vec3f(1.0, 0.02, 0.42) * (ringB * 0.16 + rays * 0.065);
        color += vec3f(1.0, 0.52, 0.03) * exp(-12.0 * distance) * (0.05 + flow * 0.08);
        color *= vignette * uniforms.intensity;
        let alpha = clamp(max(max(color.r, color.g), color.b) * 1.35, 0.0, 0.24);
        return vec4f(color, alpha);
      }
    `,
  });
  const pipeline = device.createRenderPipeline({
    label: "Skybreak Ultra pipeline",
    layout: "auto",
    vertex: { module: shader, entryPoint: "vertexMain" },
    fragment: {
      module: shader,
      entryPoint: "fragmentMain",
      targets: [{
        format,
        blend: {
          color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        },
      }],
    },
    primitive: { topology: "triangle-list" },
  });
  const showcasePipeline = device.createRenderPipeline({
    label: "Skybreak Showcase postprocessing pipeline",
    layout: "auto",
    vertex: { module: shader, entryPoint: "vertexMain" },
    fragment: {
      module: shader,
      entryPoint: "showcaseFragment",
      targets: [{
        format,
        blend: {
          color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        },
      }],
    },
    primitive: { topology: "triangle-list" },
  });
  const context = canvas.getContext("webgpu") as any;
  if (!context) return null;
  // Size the WebGPU surface before configuring it. Resizing immediately after
  // configure makes Safari briefly recreate the transparent swap texture.
  const dynamicScale = 0.65;
  const initialRect = canvas.getBoundingClientRect();
  const initialDprLimit = window.matchMedia("(pointer: coarse)").matches ? 2.25 : 3;
  const initialBaseDpr = cappedPixelRatio(
    initialRect,
    Math.min(window.devicePixelRatio || 1, initialDprLimit),
    getResolution(),
    Math.min(2160, maxTextureSize),
  );
  canvas.width = Math.max(1, Math.round(initialRect.width * initialBaseDpr * dynamicScale));
  canvas.height = Math.max(1, Math.round(initialRect.height * initialBaseDpr * dynamicScale));
  context.configure({ device, format, alphaMode: "premultiplied" });

  const usage = (globalThis as any).GPUBufferUsage;
  const uniformBuffer = device.createBuffer({
    label: "Skybreak Ultra uniforms",
    size: 16,
    usage: (usage?.UNIFORM ?? 0x40) | (usage?.COPY_DST ?? 0x08),
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });
  const showcaseUniformBuffers = Array.from({ length: 7 }, (_, index) => device.createBuffer({
    label: `Skybreak Showcase postprocess uniforms ${index + 1}`,
    size: 16,
    usage: (usage?.UNIFORM ?? 0x40) | (usage?.COPY_DST ?? 0x08),
  }));
  const showcaseBindGroups = showcaseUniformBuffers.map((buffer) => device.createBindGroup({
    layout: showcasePipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer } }],
  }));
  const quadBuffer = device.createBuffer({
    label: "Skybreak instance quad",
    size: 48,
    usage: (usage?.VERTEX ?? 0x20) | (usage?.COPY_DST ?? 0x08),
  });
  device.queue.writeBuffer(quadBuffer, 0, new Float32Array([
    -0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    -0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  ]));
  const instanceCapacity = 34000;
  const instanceBuffer = device.createBuffer({
    label: "Skybreak Ultra instances",
    size: instanceCapacity * 8 * 4,
    usage: (usage?.VERTEX ?? 0x20) | (usage?.COPY_DST ?? 0x08),
  });
  const instanceShader = device.createShaderModule({
    label: "Skybreak instanced highlights",
    code: `
      struct VertexInput {
        @location(0) corner: vec2f,
        @location(1) center: vec2f,
        @location(2) size: vec2f,
        @location(3) color: vec4f,
      };
      struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
        @location(1) local: vec2f,
      };
      @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
        var output: VertexOutput;
        let point = input.center + input.corner * input.size;
        output.position = vec4f(point.x * 2.0 - 1.0, 1.0 - point.y * 2.0, 0.0, 1.0);
        output.color = input.color;
        output.local = input.corner;
        return output;
      }
      @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
        let glow = 1.0 - smoothstep(0.24, 0.72, length(input.local));
        return vec4f(input.color.rgb, input.color.a * (0.45 + glow * 0.55));
      }
    `,
  });
  const instancePipeline = device.createRenderPipeline({
    label: "Skybreak GPU instancing pipeline",
    layout: "auto",
    vertex: {
      module: instanceShader,
      entryPoint: "vertexMain",
      buffers: [
        { arrayStride: 8, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }] },
        {
          arrayStride: 32,
          stepMode: "instance",
          attributes: [
            { shaderLocation: 1, offset: 0, format: "float32x2" },
            { shaderLocation: 2, offset: 8, format: "float32x2" },
            { shaderLocation: 3, offset: 16, format: "float32x4" },
          ],
        },
      ],
    },
    fragment: {
      module: instanceShader,
      entryPoint: "fragmentMain",
      targets: [{
        format,
        blend: {
          color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        },
      }],
    },
    primitive: { topology: "triangle-list" },
  });
  const isMac = /Macintosh|Mac OS X/i.test(navigator.userAgent);
  updateRenderer(isMac ? "WEBGPU · METAL" : "WEBGPU · NATIVE GPU");
  updateGpuFrameMs?.(null);
  const timestampEnabled = supportsTimestampQuery && device.features?.has?.("timestamp-query");
  const querySet = timestampEnabled ? device.createQuerySet({ type: "timestamp", count: 2 }) : null;
  const timestampResolveBuffer = timestampEnabled ? device.createBuffer({
    label: "Skybreak Showcase GPU timestamp resolve",
    size: 16,
    usage: (usage?.QUERY_RESOLVE ?? 0x200) | (usage?.COPY_SRC ?? 0x04),
  }) : null;
  const timestampReadBuffer = timestampEnabled ? device.createBuffer({
    label: "Skybreak Showcase GPU timestamp readback",
    size: 16,
    usage: (usage?.COPY_DST ?? 0x08) | (usage?.MAP_READ ?? 0x01),
  }) : null;
  let active = true;
  let animation = 0;
  let timestampPending = false;
  let lastTimestampSample = 0;

  void device.lost.then(() => {
    if (active) updateRenderer("WEBGPU LOST");
  });

  const render = (time: number) => {
    if (!active) return;
    const rect = canvas.getBoundingClientRect();
    const dprLimit = window.matchMedia("(pointer: coarse)").matches ? 2.25 : 3;
    const baseDpr = cappedPixelRatio(
      rect,
      Math.min(window.devicePixelRatio || 1, dprLimit),
      getResolution(),
      Math.min(2160, maxTextureSize),
    );
    const width = Math.max(1, Math.round(rect.width * baseDpr * dynamicScale));
    const height = Math.max(1, Math.round(rect.height * baseDpr * dynamicScale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const atmosphereIntensity = getAtmosphereIntensity();
    const showcaseActive = atmosphereIntensity > 1.2;
    const shaderTime = time * 0.001;
    const sampleTimestamp = Boolean(showcaseActive && querySet && timestampResolveBuffer && timestampReadBuffer && !timestampPending && time - lastTimestampSample >= 750);
    device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([width, height, shaderTime, atmosphereIntensity]));
    const encoder = device.createCommandEncoder({ label: "Skybreak Ultra frame" });
    const frameView = context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: frameView,
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: "clear",
        storeOp: "store",
      }],
      timestampWrites: sampleTimestamp
        ? showcaseActive
          ? { querySet, beginningOfPassWriteIndex: 0 }
          : { querySet, beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1 }
        : undefined,
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    const instances = getSceneInstances();
    const instanceCount = Math.min(Math.floor(instances.length / 8), instanceCapacity);
    if (instanceCount > 0) {
      device.queue.writeBuffer(instanceBuffer, 0, instances.subarray(0, instanceCount * 8));
      pass.setPipeline(instancePipeline);
      pass.setVertexBuffer(0, quadBuffer);
      pass.setVertexBuffer(1, instanceBuffer);
      pass.draw(6, instanceCount);
    }
    pass.end();
    if (showcaseActive) {
      for (let passIndex = 0; passIndex < showcaseBindGroups.length; passIndex += 1) {
        // Three serial passes intentionally compound different turbulence phases.
        device.queue.writeBuffer(
          showcaseUniformBuffers[passIndex],
          0,
          new Float32Array([width, height, shaderTime + passIndex * 4.73, atmosphereIntensity * (1 + passIndex * .16)]),
        );
        const postPass = encoder.beginRenderPass({
          colorAttachments: [{ view: frameView, loadOp: "load", storeOp: "store" }],
          timestampWrites: sampleTimestamp && passIndex === showcaseBindGroups.length - 1
            ? { querySet, endOfPassWriteIndex: 1 }
            : undefined,
        });
        postPass.setPipeline(showcasePipeline);
        postPass.setBindGroup(0, showcaseBindGroups[passIndex]);
        postPass.draw(3);
        postPass.end();
      }
    }
    if (sampleTimestamp && querySet && timestampResolveBuffer && timestampReadBuffer) {
      encoder.resolveQuerySet(querySet, 0, 2, timestampResolveBuffer, 0);
      encoder.copyBufferToBuffer(timestampResolveBuffer, 0, timestampReadBuffer, 0, 16);
      timestampPending = true;
      lastTimestampSample = time;
    }
    device.queue.submit([encoder.finish()]);
    if (sampleTimestamp && timestampReadBuffer) {
      void timestampReadBuffer.mapAsync((globalThis as any).GPUMapMode?.READ ?? 1)
        .then(() => {
          const values = new BigUint64Array(timestampReadBuffer.getMappedRange().slice(0));
          const milliseconds = Number(values[1] - values[0]) / 1_000_000;
          timestampReadBuffer.unmap();
          if (Number.isFinite(milliseconds) && milliseconds >= 0) updateGpuFrameMs?.(Math.round(milliseconds * 10) / 10);
        })
        .catch(() => {
          try { timestampReadBuffer.unmap(); } catch { /* not mapped */ }
          updateGpuFrameMs?.(null);
        })
        .finally(() => { timestampPending = false; });
    }
    canvas.classList.add("fx-ready");
    animation = requestAnimationFrame(render);
  };
  animation = requestAnimationFrame(render);
  return () => {
    active = false;
    cancelAnimationFrame(animation);
    uniformBuffer.destroy();
    showcaseUniformBuffers.forEach((buffer) => buffer.destroy());
    querySet?.destroy();
    timestampResolveBuffer?.destroy();
    timestampReadBuffer?.destroy();
    quadBuffer.destroy();
    instanceBuffer.destroy();
    device.destroy();
  };
}

export async function startWebGpuUltraRenderer(
  canvas: HTMLCanvasElement,
  sourceCanvas: HTMLCanvasElement,
  updateRenderer: (name: string) => void,
  getSceneInstances: () => Float32Array,
  updateFrameRate: (fps: number) => void,
  getFrameRateMode: () => "60" | "120" | "unlimited",
  updateThermalProtection: (active: boolean) => void,
  getResolution: () => RenderResolution,
): Promise<EffectCleanup | null> {
  const gpu = (navigator as Navigator & { gpu?: any }).gpu;
  if (!gpu) return null;

  const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter || adapter.info?.isFallbackAdapter) return null;
  const maxTextureSize = Math.min(Number(adapter.limits?.maxTextureDimension2D || 4096), 4096);
  const mobile = window.matchMedia("(pointer: coarse)").matches;
  // Current mobile WebKit builds can expose shader-f16 while producing a black
  // post-process texture. Keep the stable F32 path on touch devices.
  const supportsF16 = !mobile && Boolean(adapter.features?.has?.("shader-f16"));
  const device = await adapter.requestDevice({ requiredFeatures: supportsF16 ? ["shader-f16"] : [] });
  const format = gpu.getPreferredCanvasFormat();
  const context = canvas.getContext("webgpu") as any;
  if (!context) return null;
  let renderScale = 1;
  const initialRect = canvas.getBoundingClientRect();
  const initialDprLimit = window.matchMedia("(pointer: coarse)").matches ? 2.25 : 3;
  const initialBaseDpr = cappedPixelRatio(
    initialRect,
    Math.min(window.devicePixelRatio || 1, initialDprLimit),
    getResolution(),
    Math.min(2160, maxTextureSize),
  );
  canvas.width = Math.max(1, Math.round(initialRect.width * initialBaseDpr * renderScale));
  canvas.height = Math.max(1, Math.round(initialRect.height * initialBaseDpr * renderScale));
  context.configure({ device, format, alphaMode: "premultiplied" });

  const usage = (globalThis as any).GPUBufferUsage;
  const textureUsage = (globalThis as any).GPUTextureUsage;
  const uniformBuffer = device.createBuffer({
    label: "Skybreak Ultra uniforms",
    size: 32,
    usage: (usage?.UNIFORM ?? 0x40) | (usage?.COPY_DST ?? 0x08),
  });
  const quadBuffer = device.createBuffer({
    label: "Skybreak instance quad",
    size: 48,
    usage: (usage?.VERTEX ?? 0x20) | (usage?.COPY_DST ?? 0x08),
  });
  device.queue.writeBuffer(quadBuffer, 0, new Float32Array([
    -0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    -0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  ]));
  const instanceCapacity = 1600;
  const instanceBuffer = device.createBuffer({
    label: "Skybreak Ultra instances",
    size: instanceCapacity * 8 * 4,
    usage: (usage?.VERTEX ?? 0x20) | (usage?.COPY_DST ?? 0x08),
  });

  const postShader = device.createShaderModule({
    label: "Skybreak full-scene post processing",
    code: `
      ${supportsF16 ? "enable f16;" : ""}
      struct Uniforms {
        resolution: vec2f,
        time: f32,
        intensity: f32,
        postQuality: f32,
        bloomStrength: f32,
        reflectionStrength: f32,
        padding: f32,
      };
      @group(0) @binding(0) var<uniform> uniforms: Uniforms;
      @group(0) @binding(1) var sceneTexture: texture_2d<f32>;
      @group(0) @binding(2) var sceneSampler: sampler;

      fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
      fn noise(p: vec2f) -> f32 {
        let i = floor(p); var f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2f(1.0, 0.0)), f.x),
                   mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), f.x), f.y);
      }
      ${supportsF16
        ? "fn toneMap(color32: vec3f) -> vec3f { let color = vec3<f16>(max(color32, vec3f(0.0))); let mapped = color / (color + vec3<f16>(f16(0.82))); return vec3f(mapped); }"
        : "fn toneMap(color: vec3f) -> vec3f { return color / (color + vec3f(0.82)); }"}
      @vertex fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
        var points = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
        return vec4f(points[index], 0.0, 1.0);
      }
      @fragment fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
        let uv = position.xy / uniforms.resolution;
        let textureSize = vec2f(textureDimensions(sceneTexture));
        let texel = 1.0 / max(textureSize, vec2f(1.0));
        let chroma = texel * (1.4 + sin(uniforms.time * 0.7) * 0.25);
        let baseR = textureSample(sceneTexture, sceneSampler, clamp(uv + vec2f(chroma.x, 0.0), vec2f(0.0), vec2f(1.0))).r;
        let baseG = textureSample(sceneTexture, sceneSampler, uv).g;
        let baseB = textureSample(sceneTexture, sceneSampler, clamp(uv - vec2f(chroma.x, 0.0), vec2f(0.0), vec2f(1.0))).b;
        var scene = vec3f(baseR, baseG, baseB);

        var bloom = vec3f(0.0);
        if (uniforms.postQuality > 0.25) {
          bloom += textureSample(sceneTexture, sceneSampler, uv + texel * vec2f(4.0, 0.0)).rgb;
          bloom += textureSample(sceneTexture, sceneSampler, uv - texel * vec2f(4.0, 0.0)).rgb;
          if (uniforms.postQuality > 1.25) {
            bloom += textureSample(sceneTexture, sceneSampler, uv + texel * vec2f(0.0, 4.0)).rgb;
            bloom += textureSample(sceneTexture, sceneSampler, uv - texel * vec2f(0.0, 4.0)).rgb;
            bloom += textureSample(sceneTexture, sceneSampler, uv + texel * vec2f(3.0, 3.0)).rgb;
            bloom += textureSample(sceneTexture, sceneSampler, uv - texel * vec2f(3.0, 3.0)).rgb;
            bloom *= 0.1667;
          } else {
            bloom *= 0.5;
          }
          bloom = max(bloom - vec3f(0.28), vec3f(0.0));
          scene += bloom * uniforms.bloomStrength;

          let distortion = (noise(vec2f(uv.x * 24.0, uniforms.time * 0.45)) - 0.5) * 0.012;
          let reflectionUv = clamp(vec2f(uv.x + distortion, 1.18 - uv.y), vec2f(0.0), vec2f(1.0));
          let reflected = textureSample(sceneTexture, sceneSampler, reflectionUv).rgb;
          let reflectionMask = smoothstep(0.5, 0.96, uv.y) * (1.0 - smoothstep(0.96, 1.0, uv.y));
          scene += reflected * reflectionMask * uniforms.reflectionStrength;
        }

        var p = uv * 2.0 - 1.0;
        p.x *= uniforms.resolution.x / uniforms.resolution.y;
        let n = noise(p * 3.1 + vec2f(uniforms.time * 0.05, -uniforms.time * 0.08));
        let fogA = exp(-7.0 * abs(p.y + 0.28 + sin(p.x * 2.4 + uniforms.time * 0.25) * 0.13));
        let fogB = exp(-10.0 * abs(p.y - 0.34 + sin(p.x * 3.7 - uniforms.time * 0.19) * 0.09));
        scene += vec3f(0.0, 0.82, 1.0) * fogA * n * 0.09;
        scene += vec3f(1.0, 0.03, 0.4) * fogB * (1.0 - n) * 0.075;

        let beamA = exp(-18.0 * abs(p.x - sin(uniforms.time * 0.16) * 0.5 - p.y * 0.28));
        let beamB = exp(-21.0 * abs(p.x + cos(uniforms.time * 0.13) * 0.62 + p.y * 0.34));
        scene += vec3f(0.0, 0.62, 0.82) * beamA * 0.035;
        scene += vec3f(0.85, 0.02, 0.34) * beamB * 0.03;

        let fixtureFlicker = 0.72 + sin(uniforms.time * 7.0) * 0.18 + sin(uniforms.time * 15.0) * 0.08;
        let signA = 1.0 - smoothstep(0.0, 0.008, max(abs(uv.x - 0.20) - 0.058, abs(uv.y - 0.29) - 0.010));
        let signB = 1.0 - smoothstep(0.0, 0.008, max(abs(uv.x - 0.72) - 0.046, abs(uv.y - 0.43) - 0.009));
        let lampA = exp(-210.0 * abs(uv.x - 0.085)) * (1.0 - smoothstep(0.18, 0.71, uv.y));
        let lampB = exp(-250.0 * abs(uv.x - 0.90)) * (1.0 - smoothstep(0.24, 0.76, uv.y));
        scene += vec3f(0.95, 0.025, 0.38) * signA * fixtureFlicker * 0.20;
        scene += vec3f(0.0, 0.82, 1.0) * signB * fixtureFlicker * 0.18;
        scene += vec3f(1.0, 0.34, 0.05) * (lampA + lampB) * 0.055;
        let pinkBillboard = exp(-185.0 * dot(uv - vec2f(0.158, 0.465), uv - vec2f(0.158, 0.465)));
        let cyanBillboard = exp(-230.0 * dot(uv - vec2f(0.228, 0.422), uv - vec2f(0.228, 0.422)));
        let tallCyan = exp(-250.0 * dot(uv - vec2f(0.675, 0.335), uv - vec2f(0.675, 0.335)));
        let pinkTower = exp(-205.0 * dot(uv - vec2f(0.742, 0.485), uv - vec2f(0.742, 0.485)));
        let warmLampLeft = exp(-340.0 * dot(uv - vec2f(0.075, 0.635), uv - vec2f(0.075, 0.635)));
        let warmLampRight = exp(-340.0 * dot(uv - vec2f(0.895, 0.645), uv - vec2f(0.895, 0.645)));
        scene += vec3f(1.0, 0.02, 0.34) * (pinkBillboard + pinkTower) * (0.14 + fixtureFlicker * 0.14);
        scene += vec3f(0.0, 0.72, 1.0) * (cyanBillboard + tallCyan) * (0.12 + fixtureFlicker * 0.13);
        scene += vec3f(1.0, 0.32, 0.04) * (warmLampLeft + warmLampRight) * 0.18;

        let vignette = 1.0 - smoothstep(0.55, 1.25, length(p));
        scene *= 0.78 + vignette * 0.28;
        scene = toneMap(scene);
        scene = pow(max(scene, vec3f(0.0)), vec3f(0.92));
        // A few macOS WebGPU implementations can briefly expose an empty
        // external Canvas texture. Keep that frame transparent so the source
        // canvas remains visible instead of flashing black.
        let sourceEnergy = max(max(baseR, baseG), baseB);
        let outputAlpha = select(0.0, 1.0, sourceEnergy > 0.003);
        return vec4f(scene, outputAlpha);
      }
    `,
  });
  const postPipeline = await device.createRenderPipelineAsync({
    label: "Skybreak full-scene post pipeline",
    layout: "auto",
    vertex: { module: postShader, entryPoint: "vertexMain" },
    fragment: { module: postShader, entryPoint: "fragmentMain", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });

  const instanceShader = device.createShaderModule({
    label: "Skybreak instanced highlights",
    code: `
      struct VertexInput {
        @location(0) corner: vec2f,
        @location(1) center: vec2f,
        @location(2) size: vec2f,
        @location(3) color: vec4f,
      };
      struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
        @location(1) local: vec2f,
      };
      @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
        var output: VertexOutput;
        let point = input.center + input.corner * input.size;
        output.position = vec4f(point.x * 2.0 - 1.0, 1.0 - point.y * 2.0, 0.0, 1.0);
        output.color = input.color;
        output.local = input.corner;
        return output;
      }
      @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
        let glow = 1.0 - smoothstep(0.24, 0.72, length(input.local));
        return vec4f(input.color.rgb, input.color.a * (0.45 + glow * 0.55));
      }
    `,
  });
  const instancePipeline = await device.createRenderPipelineAsync({
    label: "Skybreak GPU instancing pipeline",
    layout: "auto",
    vertex: {
      module: instanceShader,
      entryPoint: "vertexMain",
      buffers: [
        { arrayStride: 8, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }] },
        {
          arrayStride: 32,
          stepMode: "instance",
          attributes: [
            { shaderLocation: 1, offset: 0, format: "float32x2" },
            { shaderLocation: 2, offset: 8, format: "float32x2" },
            { shaderLocation: 3, offset: 16, format: "float32x4" },
          ],
        },
      ],
    },
    fragment: {
      module: instanceShader,
      entryPoint: "fragmentMain",
      targets: [{
        format,
        blend: {
          color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        },
      }],
    },
    primitive: { topology: "triangle-list" },
  });

  const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
  let sceneTexture: any = null;
  let sceneTextureWidth = 0;
  let sceneTextureHeight = 0;
  let postBindGroup: any = null;
  const ensureSceneTexture = () => {
    const width = Math.max(1, Math.min(maxTextureSize, sourceCanvas.width));
    const height = Math.max(1, Math.min(maxTextureSize, sourceCanvas.height));
    if (sceneTexture && width === sceneTextureWidth && height === sceneTextureHeight) return;
    sceneTexture?.destroy();
    sceneTextureWidth = width;
    sceneTextureHeight = height;
    sceneTexture = device.createTexture({
      label: "Skybreak Canvas scene texture",
      size: [width, height, 1],
      format: "rgba8unorm",
      usage: (textureUsage?.TEXTURE_BINDING ?? 0x04) | (textureUsage?.COPY_DST ?? 0x02),
    });
    postBindGroup = device.createBindGroup({
      layout: postPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: sceneTexture.createView() },
        { binding: 2, resource: sampler },
      ],
    });
  };

  const isMac = /Macintosh|Mac OS X/i.test(navigator.userAgent);
  updateRenderer(`${isMac ? "WEBGPU · METAL" : "WEBGPU · NATIVE"}${supportsF16 ? " · F16" : " · F32"} · INSTANCED`);
  const worker = new Worker(new URL("../ultraWorker.ts", import.meta.url), { type: "module" });
  let active = true;
  let animation = 0;
  let workerBusy = false;
  let workerInstances = new Float32Array(0);
  let targetFps = 60;
  let postQuality = 2;
  let lastAnimationFrame = performance.now();
  let lastRenderedFrame = 0;
  let nextFrameDue = 0;
  let lastWorkerPost = 0;

  worker.onmessage = (event: MessageEvent<{ buffer: ArrayBuffer; renderScale: number; targetFps: number; postQuality: number }>) => {
    workerBusy = false;
    workerInstances = new Float32Array(event.data.buffer);
    renderScale = Math.max(0.62, Math.min(1, event.data.renderScale));
    postQuality = Math.max(0, Math.min(2, event.data.postQuality));
    updateThermalProtection(postQuality < 2);
    const nextFps = event.data.targetFps === 0 ? 0 : Math.max(60, Math.min(120, event.data.targetFps));
    if (nextFps !== targetFps) {
      targetFps = nextFps;
      updateFrameRate(nextFps);
    }
  };
  worker.onerror = () => {
    workerBusy = false;
    targetFps = 60;
    updateFrameRate(60);
  };
  void device.lost.then(() => {
    if (active) updateRenderer("WEBGPU LOST");
  });

  const render = (time: number) => {
    if (!active) return;
    const animationDelta = Math.max(4, Math.min(40, time - lastAnimationFrame));
    lastAnimationFrame = time;
    if (!workerBusy && time - lastWorkerPost >= 24) {
      workerBusy = true;
      lastWorkerPost = time;
      worker.postMessage({ type: "tick", time, frameDelta: animationDelta, frameRateMode: getFrameRateMode(), mobile, rainCount: 220 });
    }

    const frameInterval = targetFps > 0 ? 1000 / targetFps : 0;
    if (targetFps > 0) {
      if (!nextFrameDue) nextFrameDue = time;
      if (time + 0.35 < nextFrameDue) {
        animation = requestAnimationFrame(render);
        return;
      }
    }
    lastRenderedFrame = time;
    if (targetFps > 0) {
      nextFrameDue += frameInterval;
      if (nextFrameDue < time - frameInterval) nextFrameDue = time + frameInterval;
    }
    const rect = canvas.getBoundingClientRect();
    const dprLimit = window.matchMedia("(pointer: coarse)").matches ? 2.25 : 3;
    const baseDpr = cappedPixelRatio(
      rect,
      Math.min(window.devicePixelRatio || 1, dprLimit),
      getResolution(),
      Math.min(2160, maxTextureSize),
    );
    const width = Math.max(1, Math.round(rect.width * baseDpr * renderScale));
    const height = Math.max(1, Math.round(rect.height * baseDpr * renderScale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ensureSceneTexture();
    try {
      device.queue.copyExternalImageToTexture(
        { source: sourceCanvas },
        { texture: sceneTexture },
        [sceneTextureWidth, sceneTextureHeight],
      );
    } catch {
      animation = requestAnimationFrame(render);
      return;
    }

    const sceneInstances = getSceneInstances();
    const workerCount = Math.min(workerInstances.length / 8, instanceCapacity);
    const sceneCount = Math.min(sceneInstances.length / 8, instanceCapacity - workerCount);
    if (workerCount > 0) device.queue.writeBuffer(instanceBuffer, 0, workerInstances.subarray(0, workerCount * 8));
    if (sceneCount > 0) device.queue.writeBuffer(instanceBuffer, workerCount * 32, sceneInstances.subarray(0, sceneCount * 8));
    const bloomStrength = postQuality >= 2 ? 0.42 : postQuality >= 1 ? 0.22 : 0;
    const reflectionStrength = postQuality >= 2 ? 0.16 : postQuality >= 1 ? 0.07 : 0;
    device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([
      width, height, time * 0.001, 1, postQuality, bloomStrength, reflectionStrength, 0,
    ]));

    const encoder = device.createCommandEncoder({ label: "Skybreak Ultra frame" });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: "clear",
        storeOp: "store",
      }],
    });
    pass.setPipeline(postPipeline);
    pass.setBindGroup(0, postBindGroup);
    pass.draw(3);
    if (workerCount + sceneCount > 0) {
      pass.setPipeline(instancePipeline);
      pass.setVertexBuffer(0, quadBuffer);
      pass.setVertexBuffer(1, instanceBuffer);
      pass.draw(6, workerCount + sceneCount);
    }
    pass.end();
    device.queue.submit([encoder.finish()]);
    canvas.classList.add("fx-ready");
    animation = requestAnimationFrame(render);
  };
  animation = requestAnimationFrame(render);
  return () => {
    active = false;
    cancelAnimationFrame(animation);
    worker.terminate();
    updateThermalProtection(false);
    sceneTexture?.destroy();
    uniformBuffer.destroy();
    quadBuffer.destroy();
    instanceBuffer.destroy();
    device.destroy();
  };
}

export function startWebGlEffects(
  canvas: HTMLCanvasElement,
  updateRenderer: (name: string) => void,
  getQuality: () => Quality,
  getResolution: () => RenderResolution,
): EffectCleanup | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: "high-performance",
    premultipliedAlpha: true,
  });
  if (!gl) return null;
  updateRenderer("WEBGL2");

  const vertexSource = `#version 300 es
    precision highp float;
    const vec2 points[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
    void main(){ gl_Position = vec4(points[gl_VertexID], 0.0, 1.0); }
  `;
  const fragmentSource = `#version 300 es
    precision highp float;
    uniform vec2 u_resolution;
    uniform float u_time;
    out vec4 outColor;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
    }
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution; vec2 p = uv * 2.0 - 1.0;
      p.x *= u_resolution.x / u_resolution.y;
      float n = noise(p * 2.8 + vec2(u_time * .035, -u_time * .06));
      float fogA = exp(-7.0 * abs(p.y + .26 + sin(p.x * 2.2 + u_time * .22) * .12));
      float fogB = exp(-9.0 * abs(p.y - .38 + sin(p.x * 3.4 - u_time * .17) * .08));
      vec3 color = vec3(0.0, .85, 1.0) * fogA * n * .16;
      color += vec3(1.0, .04, .42) * fogB * (1.0 - n) * .13;
      vec2 rainUv = uv * vec2(95.0, 24.0); float lane = floor(rainUv.x);
      float drop = fract(rainUv.y + u_time * (2.4 + hash(vec2(lane, 4.0))) + hash(vec2(lane, 7.0)) * 7.0);
      float rain = smoothstep(.94, 1.0, drop) * step(.82, hash(vec2(lane, floor(rainUv.y))));
      color += mix(vec3(0.0,.75,1.0), vec3(1.0,.08,.5), hash(vec2(lane,2.0))) * rain * .1;
      float scan = sin(gl_FragCoord.y * 1.55 + u_time * 3.0) * .5 + .5;
      color += vec3(.02,.05,.08) * scan * .035;
      float alpha = clamp(max(max(color.r, color.g), color.b) * 1.7, 0.0, .28);
      outColor = vec4(color, alpha);
    }
  `;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const timeLocation = gl.getUniformLocation(program, "u_time");
  let animation = 0;
  let lastGlFrame = 0;
  let averageFrameTime = 16.67;
  let effectScale = 1;
  const render = (time: number) => {
    const settings = activeQualitySettings(getQuality());
    const frameInterval = 1000 / settings.glFps;
    if (time - lastGlFrame < frameInterval) {
      animation = requestAnimationFrame(render);
      return;
    }
    if (lastGlFrame) {
      const elapsed = Math.max(4, Math.min(80, time - lastGlFrame));
      averageFrameTime = averageFrameTime * .9 + elapsed * .1;
      const minScale = window.matchMedia("(pointer: coarse)").matches ? .58 : .68;
      if (averageFrameTime > frameInterval * 1.28) effectScale = Math.max(minScale, effectScale - .055);
      else if (averageFrameTime < frameInterval * 1.05) effectScale = Math.min(1, effectScale + .014);
    }
    lastGlFrame = time;
    const rect = canvas.getBoundingClientRect();
    // Gameplay remains full resolution on its own canvas. Only the separate
    // atmospheric WebGL layer adapts its internal resolution under pressure.
    const dpr = cappedPixelRatio(rect, Math.min(window.devicePixelRatio || 1, settings.glDpr), getResolution()) * effectScale;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (settings.webgl) {
      gl.useProgram(program);
      gl.uniform2f(resolutionLocation, width, height);
      gl.uniform1f(timeLocation, time * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      canvas.classList.add("fx-ready");
    }
    animation = requestAnimationFrame(render);
  };
  animation = requestAnimationFrame(render);
  return () => {
    cancelAnimationFrame(animation);
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
  };
}
