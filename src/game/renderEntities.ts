// Reusable entity drawing routines; the game loop supplies position and state.
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
