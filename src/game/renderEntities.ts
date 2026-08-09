// Reusable entity drawing routines; the game loop supplies position and state.

type SpriteCanvas = HTMLCanvasElement | OffscreenCanvas;

const preparedSprites = new Map<string, SpriteCanvas>();

function createSprite(width: number, height: number): SpriteCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function spriteContext(canvas: SpriteCanvas) {
  return canvas.getContext("2d") as CanvasRenderingContext2D;
}

function cachedSprite(key: string, width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const cached = preparedSprites.get(key);
  if (cached) return cached;
  const canvas = createSprite(width, height);
  draw(spriteContext(canvas));
  preparedSprites.set(key, canvas);
  return canvas;
}

/** Pre-rendered chest body: the lock and timer stay dynamic in the game loop. */
export function getPreparedChestSprite(accent: string, secondary: string) {
  return cachedSprite(`chest:${accent}:${secondary}`, 48, 36, (ctx) => {
    const wood = ctx.createLinearGradient(0, 4, 0, 34);
    wood.addColorStop(0, secondary); wood.addColorStop(.48, "#4b2818"); wood.addColorStop(1, "#24110c");
    ctx.fillStyle = wood; ctx.strokeStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(4, 13, 40, 19, 4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(4, 5, 40, 13, 5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(255,214,117,.72)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(12, 7); ctx.lineTo(12, 31); ctx.moveTo(36, 7); ctx.lineTo(36, 31); ctx.stroke();
  });
}

/**
 * Pre-rendered enemy shells remove gradients, paths and shadow work from the
 * hot render loop. The cache key carries the level palette and enemy variant;
 * movement, health and guardian UI remain dynamic.
 */
export function getPreparedEnemySprite(variant: number, archetype: number, accent: string, secondary: string, warning: string, guardian: boolean) {
  const size = guardian ? 76 : 52;
  return cachedSprite(`enemy:${variant}:${archetype}:${accent}:${secondary}:${warning}:${guardian}`, size, size, (ctx) => {
    const scale = guardian ? 1.45 : 1;
    ctx.translate(size / 2, size / 2);
    ctx.scale(scale, scale);
    ctx.globalAlpha = .22; ctx.fillStyle = "#01040a"; ctx.beginPath(); ctx.ellipse(3, 18, 16, 4, -.12, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    const shell = ctx.createLinearGradient(-18, -15, 18, 15);
    shell.addColorStop(0, secondary); shell.addColorStop(.46, "#0b1428"); shell.addColorStop(1, "#090713");
    ctx.fillStyle = shell; ctx.strokeStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath();
    if (variant % 5 === 0) ctx.roundRect(-18, -15, 36, 29, 8);
    else if (variant % 5 === 1) { ctx.moveTo(0, -20); ctx.lineTo(21, 0); ctx.lineTo(0, 18); ctx.lineTo(-21, 0); ctx.closePath(); }
    else if (variant % 5 === 2) { ctx.moveTo(-21, -9); ctx.lineTo(0, -19); ctx.lineTo(21, -9); ctx.lineTo(16, 17); ctx.lineTo(-16, 17); ctx.closePath(); }
    else if (variant % 5 === 3) { ctx.moveTo(-22, 4); ctx.quadraticCurveTo(-8, -18, 0, -5); ctx.quadraticCurveTo(9, -18, 22, 4); ctx.quadraticCurveTo(0, 19, -22, 4); ctx.closePath(); }
    else ctx.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.26)";
    if (archetype === 0) ctx.fillRect(-11, -10, 22, 6);
    else if (archetype === 1) { ctx.beginPath(); ctx.moveTo(-12, -9); ctx.lineTo(12, -9); ctx.lineTo(7, -2); ctx.lineTo(-7, -2); ctx.closePath(); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(0, -7, 8, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = warning;
    if (archetype === 0) ctx.fillRect(5, -10, 7, 3);
    else if (archetype === 1) { ctx.fillRect(-10, -10, 6, 4); ctx.fillRect(4, -10, 6, 4); }
    else { ctx.beginPath(); ctx.arc(0, -8, 4.5, 0, Math.PI * 2); ctx.fill(); }
  });
}

/** Cached particle silhouettes; GPU instancing supplies the bloom in Ultra. */
export function getPreparedParticleSprite(kind: string, color: string) {
  return cachedSprite(`particle:${kind}:${color}`, 32, 32, (ctx) => {
    ctx.translate(16, 16);
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 2;
    if (kind === "laser") { ctx.fillRect(-16, -3, 32, 6); ctx.fillStyle = "#fff1a8"; ctx.fillRect(-16, -1, 32, 2); return; }
    if (kind === "energy-bolt") { ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-4, 13); ctx.lineTo(3, 2); ctx.lineTo(-2, -2); ctx.lineTo(7, -13); ctx.stroke(); return; }
    if (kind === "bubble-spray") { ctx.beginPath(); ctx.arc(-5, 3, 7, 0, Math.PI * 2); ctx.arc(6, -4, 5, 0, Math.PI * 2); ctx.stroke(); return; }
    if (kind === "magma-burst") { ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff0a3"; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); return; }
    if (kind === "wind-shard") { ctx.beginPath(); ctx.moveTo(-13, 0); ctx.quadraticCurveTo(0, -7, 13, -2); ctx.quadraticCurveTo(0, 6, -13, 0); ctx.fill(); return; }
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(10, 0); ctx.lineTo(0, 13); ctx.lineTo(-10, 0); ctx.closePath(); ctx.fill();
  });
}

/**
 * Turns the existing full-body avatar artwork into a compact gameplay puppet.
 * The torso stays crisp while two independently transformed leg slices create
 * a readable walk cycle; jumping tilts and compresses the complete pose.
 */
export function drawAnimatedBikiniAvatar(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  time: number,
  horizontalSpeed: number,
  verticalSpeed: number,
  airborne: boolean,
) {
  const move = Math.min(1, Math.abs(horizontalSpeed) / 120);
  // World physics already moves the avatar through the jump arc. Keep the
  // portrait stable in the air; only grounded movement receives a walk cycle.
  const stride = airborne ? 0 : Math.sin(time * (7 + move * 5)) * move;
  const bob = Math.abs(stride) * 1.15;
  const tilt = stride * .035;
  const width = 42;
  const hipY = 9;
  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(tilt);
  const drawLeg = (sourceX: number, destinationX: number, swing: number) => {
    ctx.save();
    ctx.translate(destinationX, hipY);
    ctx.rotate(swing);
    ctx.drawImage(image, sourceX, 188, 50, 181, -7, -2, 14, 43);
    ctx.restore();
  };
  drawLeg(33, -7, stride * .34);
  drawLeg(93, 7, -stride * .34);
  // Head, arms, torso and outfit stay together: recognisable art, no warped body.
  ctx.drawImage(image, 5, 0, 166, 226, -width / 2, -47, width, 58);
  ctx.restore();
}

type RobotPalette = { accent: string; secondary: string; warning: string };

/** Fourteen readable robot identities, keyed directly to the current sector. */
export function drawLevelRobot(
  ctx: CanvasRenderingContext2D,
  level: number,
  palette: RobotPalette,
  time: number,
  horizontalSpeed: number,
  verticalSpeed: number,
  grounded: boolean,
  damage: number,
  ultra: boolean,
) {
  const variant = Math.max(0, Math.min(13, level - 1));
  const moving = Math.min(1, Math.abs(horizontalSpeed) / 135);
  const walk = grounded ? Math.sin(time * (6 + moving * 6)) * moving : 0;
  const bob = grounded ? Math.abs(walk) * 1.6 : 0;
  const tilt = grounded ? walk * .06 : Math.max(-.12, Math.min(.12, verticalSpeed / 1300));
  const glow = ultra ? 0 : 14;
  ctx.save();
  ctx.translate(0, bob); ctx.rotate(tilt);
  ctx.shadowBlur = glow; ctx.shadowColor = palette.accent;

  // Every profile has a distinct travelling effect before its body is drawn.
  ctx.globalAlpha = .72;
  if (variant === 0) { ctx.strokeStyle = palette.accent; for (const y of [-18, -8, 2]) { ctx.beginPath(); ctx.moveTo(-24, y); ctx.lineTo(24, y); ctx.stroke(); } }
  else if (variant === 1) { ctx.strokeStyle = palette.secondary; ctx.strokeRect(-24, -22, 48, 42); ctx.strokeStyle = palette.accent; ctx.strokeRect(-19, -17, 38, 32); }
  else if (variant === 2) { ctx.fillStyle = palette.accent; for (let i = 0; i < 4; i++) { const x = -22 + i * 14; ctx.beginPath(); ctx.arc(x, 19 - Math.abs(Math.sin(time * 2 + i)) * 9, 2.5 + i % 2, 0, Math.PI * 2); ctx.fill(); } }
  else if (variant === 3) { ctx.strokeStyle = palette.warning; ctx.lineWidth = 2; for (const x of [-14, 0, 14]) { ctx.beginPath(); ctx.moveTo(x, 22); ctx.lineTo(x + Math.sin(time * 7 + x) * 5, 35); ctx.stroke(); } }
  else if (variant === 4) { ctx.strokeStyle = palette.accent; for (const r of [16, 23]) { ctx.globalAlpha *= .64; ctx.beginPath(); ctx.arc(0, 4, r, Math.PI * .15 + time, Math.PI * .85 + time); ctx.stroke(); } }
  else if (variant === 5) { ctx.strokeStyle = palette.secondary; ctx.beginPath(); ctx.ellipse(0, 1, 28, 10, time * 1.4, 0, Math.PI * 2); ctx.stroke(); }
  else if (variant === 6) { ctx.strokeStyle = palette.warning; for (let i = 0; i < 6; i++) { const a = time + i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 17, Math.sin(a) * 17); ctx.lineTo(Math.cos(a) * 29, Math.sin(a) * 29); ctx.stroke(); } }
  else if (variant === 7) { ctx.globalAlpha = .17; ctx.fillStyle = palette.secondary; ctx.fillRect(-25 + Math.sin(time * 2) * 7, -23, 36, 48); }
  else if (variant === 8) { ctx.strokeStyle = palette.secondary; for (let i = 0; i < 3; i++) { const a = time * 1.6 + i * 2.1; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 13, Math.sin(a) * 13); ctx.lineTo(Math.cos(a) * 31, Math.sin(a) * 31); ctx.stroke(); } }
  else if (variant === 9) { ctx.strokeStyle = palette.warning; ctx.beginPath(); ctx.moveTo(-28, 4); ctx.lineTo(-18, -12); ctx.lineTo(-10, 7); ctx.moveTo(28, 4); ctx.lineTo(18, -12); ctx.lineTo(10, 7); ctx.stroke(); }
  else if (variant === 10) { ctx.fillStyle = palette.warning; for (const x of [-9, 0, 9]) { ctx.beginPath(); ctx.moveTo(x - 3, 27); ctx.lineTo(x, 39 + Math.sin(time * 9 + x) * 4); ctx.lineTo(x + 3, 27); ctx.closePath(); ctx.fill(); } }
  else if (variant === 11) { ctx.strokeStyle = palette.accent; ctx.beginPath(); ctx.moveTo(-27, 2); ctx.quadraticCurveTo(-12, -18, 0, -5); ctx.quadraticCurveTo(12, -18, 27, 2); ctx.stroke(); }
  else if (variant === 12) { ctx.strokeStyle = palette.secondary; ctx.setLineDash([3, 3]); for (const y of [-13, 1, 14]) { ctx.beginPath(); ctx.moveTo(-30, y); ctx.quadraticCurveTo(0, y - 7, 30, y); ctx.stroke(); } ctx.setLineDash([]); }
  else { ctx.fillStyle = palette.warning; for (const x of [-17, -6, 7, 18]) { ctx.fillRect(x, 22 - Math.abs(Math.sin(time * 6 + x)) * 5, 4, 4); } }
  ctx.globalAlpha = 1;

  // Alternating legs retain the same collision footprint but alter stance by sector.
  ctx.strokeStyle = palette.accent; ctx.lineCap = "round"; ctx.lineWidth = variant === 11 ? 4 : 5;
  ctx.beginPath();
  ctx.moveTo(-8, 15); ctx.lineTo(-10 + walk * 5, 29); ctx.lineTo(-15 + walk * 3, 33);
  ctx.moveTo(8, 15); ctx.lineTo(10 - walk * 5, 29); ctx.lineTo(15 - walk * 3, 33);
  ctx.stroke();
  ctx.fillStyle = "#071321"; ctx.strokeStyle = palette.secondary; ctx.lineWidth = 1.4;
  ctx.fillRect(-18 + walk * 3, 31, 11, 5); ctx.strokeRect(-18 + walk * 3, 31, 11, 5);
  ctx.fillRect(7 - walk * 3, 31, 11, 5); ctx.strokeRect(7 - walk * 3, 31, 11, 5);

  const shell = ctx.createLinearGradient(-17, -15, 17, 21);
  shell.addColorStop(0, palette.secondary); shell.addColorStop(.5, "#0a1629"); shell.addColorStop(1, "#020713");
  ctx.fillStyle = shell; ctx.strokeStyle = palette.accent; ctx.lineWidth = 2;
  ctx.beginPath();
  if (variant === 1 || variant === 9) { ctx.moveTo(-17, -7); ctx.lineTo(-9, -15); ctx.lineTo(14, -12); ctx.lineTo(18, 7); ctx.lineTo(8, 20); ctx.lineTo(-15, 16); ctx.closePath(); }
  else if (variant === 2 || variant === 13) { for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; const x = Math.cos(a) * 17; const y = 4 + Math.sin(a) * 18; if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); }
  else if (variant === 3 || variant === 10) { ctx.moveTo(-15, 18); ctx.lineTo(-10, -12); ctx.lineTo(0, -20); ctx.lineTo(11, -12); ctx.lineTo(16, 18); ctx.closePath(); }
  else if (variant === 4 || variant === 11) ctx.ellipse(0, 3, 18, 17, 0, 0, Math.PI * 2);
  else if (variant === 6 || variant === 12) { ctx.moveTo(-19, 11); ctx.lineTo(-11, -14); ctx.lineTo(11, -14); ctx.lineTo(19, 11); ctx.lineTo(8, 20); ctx.lineTo(-8, 20); ctx.closePath(); }
  else { ctx.roundRect(-16, -12, 32, 33, 8); }
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = palette.warning; ctx.beginPath(); ctx.arc(0, 5, variant === 10 ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0b1728"; ctx.strokeStyle = palette.accent; ctx.lineWidth = 1.7;
  if (variant === 4 || variant === 11) { ctx.beginPath(); ctx.ellipse(0, -18, 16, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  else if (variant === 7 || variant === 8) { ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(15, -18); ctx.lineTo(0, -8); ctx.lineTo(-15, -18); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else { ctx.roundRect(-14, -29, 28, 17, variant === 2 ? 8 : 5); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = palette.secondary;
  if (variant === 1 || variant === 9) { ctx.fillRect(-8, -23, 16, 4); }
  else if (variant === 3 || variant === 10) { ctx.fillRect(-9, -22, 7, 4); ctx.fillRect(2, -22, 7, 4); }
  else { ctx.fillRect(-9, -23, 6, 4); ctx.fillRect(3, -23, 6, 4); }
  if (damage) { ctx.strokeStyle = damage > 2 ? "#ff365f" : palette.warning; ctx.lineWidth = 1.5; for (let i = 0; i < damage; i++) { ctx.beginPath(); ctx.moveTo(-11 + i * 8, -4); ctx.lineTo(-5 + i * 7, 10); ctx.stroke(); } }
  ctx.restore();
}

export function drawHologramDancer(ctx: CanvasRenderingContext2D, time: number, scale: number) {
  const beat = time * Math.PI * 2.55;
  const step = Math.sin(beat);
  const groove = Math.sin(beat * .5);
  const pulse = .74 + (Math.sin(beat * 2) + 1) * .13;
  const point = (x: number, y: number, length: number, angle: number) => ({ x: x + Math.cos(angle) * length, y: y + Math.sin(angle) * length });
  const limb = (start: { x: number; y: number }, elbow: { x: number; y: number }, end: { x: number; y: number }, color: string) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(1, 8, 20, .96)";
    ctx.lineWidth = 17;
    ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(elbow.x, elbow.y); ctx.lineTo(end.x, end.y); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(elbow.x, elbow.y); ctx.lineTo(end.x, end.y); ctx.stroke();
    ctx.fillStyle = "#ffd84d";
    ctx.beginPath(); ctx.arc(elbow.x, elbow.y, 3.5, 0, Math.PI * 2); ctx.fill();
  };

  ctx.save();
  ctx.scale(scale, scale);
  ctx.globalAlpha = pulse;
  const hip = { x: step * 11, y: 22 };
  const shoulderY = -65 + Math.abs(step) * 4;
  const leftHip = { x: hip.x - 17, y: hip.y };
  const rightHip = { x: hip.x + 17, y: hip.y };
  const leftKnee = point(leftHip.x, leftHip.y, 62, Math.PI / 2 + step * .34);
  const rightKnee = point(rightHip.x, rightHip.y, 62, Math.PI / 2 - step * .34);
  const leftFoot = point(leftKnee.x, leftKnee.y, 66, Math.PI / 2 - step * .2);
  const rightFoot = point(rightKnee.x, rightKnee.y, 66, Math.PI / 2 + step * .2);
  limb(leftHip, leftKnee, leftFoot, "#ff2b8a");
  limb(rightHip, rightKnee, rightFoot, "#00f0ff");

  const torsoTilt = groove * .13;
  ctx.save();
  ctx.translate(hip.x, hip.y - 8);
  ctx.rotate(torsoTilt);
  const torso = ctx.createLinearGradient(-30, -90, 30, 15);
  torso.addColorStop(0, "#00f0ff"); torso.addColorStop(.48, "#091a31"); torso.addColorStop(1, "#ff2b8a");
  ctx.fillStyle = torso;
  ctx.beginPath(); ctx.moveTo(-31, 8); ctx.lineTo(-26, -62); ctx.lineTo(26, -62); ctx.lineTo(31, 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#e9ffff"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#07111f";
  ctx.beginPath(); ctx.moveTo(-24, -24); ctx.lineTo(24, -24); ctx.lineTo(18, 6); ctx.lineTo(-18, 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#ff2b8a"; ctx.stroke();
  ctx.restore();

  const leftShoulder = { x: hip.x - 29, y: shoulderY };
  const rightShoulder = { x: hip.x + 29, y: shoulderY };
  const leftElbow = point(leftShoulder.x, leftShoulder.y, 52, 2.35 - step * 1.08);
  const rightElbow = point(rightShoulder.x, rightShoulder.y, 52, .79 + step * 1.08);
  const leftHand = point(leftElbow.x, leftElbow.y, 51, 1.66 + step * .62);
  const rightHand = point(rightElbow.x, rightElbow.y, 51, 1.48 - step * .62);
  limb(leftShoulder, leftElbow, leftHand, "#ff2b8a");
  limb(rightShoulder, rightElbow, rightHand, "#00f0ff");

  const headX = hip.x + groove * 5;
  ctx.fillStyle = "#07111f";
  ctx.beginPath(); ctx.arc(headX, -113, 29, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#ff2b8a"; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = "#ffd84d";
  ctx.fillRect(headX - 12, -116, 24, 5);
  ctx.fillStyle = "#00f0ff";
  ctx.fillRect(headX - 4, -96, 8, 9);
  ctx.fillStyle = "#081222";
  ctx.fillRect(leftFoot.x - 16, leftFoot.y - 8, 32, 18);
  ctx.fillRect(rightFoot.x - 16, rightFoot.y - 8, 32, 18);
  ctx.restore();
}
