import type { LevelTheme } from "../levelData";

type Viewport = { width: number; height: number };

export function drawLevelBackgroundAnimation(ctx: CanvasRenderingContext2D, theme: LevelTheme, view: Viewport, pulse: number, cameraX: number) {
// Each level has a distinct animated skyline signature.
ctx.save();
ctx.globalCompositeOperation = "lighter";
ctx.strokeStyle = theme.accent;
ctx.fillStyle = theme.secondary;
ctx.lineWidth = 1.4;
if (theme.motif === 0) {
  // Neon Undercity: deep shafts, service pipes and fast maglev traffic.
  ctx.globalAlpha = 0.24;
  for (let i = 0; i < 12; i++) {
  const x = (i * 113 - cameraX * 0.08) % (view.width + 80) - 40;
    ctx.fillRect(x, 0, 5 + (i % 3) * 3, view.height);
    ctx.fillRect(x - 18, 72 + (i * 47) % (view.height - 90), 62, 3);
  }
  for (let i = 0; i < 7; i++) {
    const x = (i * 171 + pulse * 95) % (view.width + 180) - 90;
    const y = 52 + (i * 73) % Math.max(100, view.height - 100);
    ctx.fillStyle = i % 2 ? theme.secondary : theme.accent;
    ctx.fillRect(x, y, 74, 3);
    ctx.fillRect(x + 69, y - 2, 9, 7);
  }
} else if (theme.motif === 1) {
  // Chrome Bazaar: warm hanging lanterns and small shop-sign glimmers
  // placed at the sides so the new market artwork remains readable.
  const lanternAnchors: Array<[number, number]> = [
    [.075, .29], [.135, .22], [.215, .35], [.305, .16], [.405, .27],
    [.615, .31], [.695, .18], [.775, .25], [.865, .36], [.925, .20],
    [.11, .72], [.81, .73],
  ];
  for (let i = 0; i < lanternAnchors.length; i++) {
    const [nx, ny] = lanternAnchors[i];
    const x = view.width * nx;
    const y = view.height * ny;
    const swing = Math.sin(pulse * (1.1 + (i % 3) * .14) + i) * 2.2;
    const glow = .24 + (Math.sin(pulse * 2.7 + i) + 1) * .08;
    ctx.globalAlpha = glow;
    ctx.strokeStyle = "rgba(255,173,67,.78)";
    ctx.beginPath(); ctx.moveTo(x, y - 25); ctx.lineTo(x + swing, y - 5); ctx.stroke();
    const lantern = ctx.createRadialGradient(x + swing, y, 1, x + swing, y, 18);
    lantern.addColorStop(0, "rgba(255,246,184,.95)");
    lantern.addColorStop(.22, "rgba(255,130,45,.72)");
    lantern.addColorStop(1, "rgba(255,43,138,0)");
    ctx.fillStyle = lantern;
    ctx.beginPath(); ctx.arc(x + swing, y, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,211,104,.85)";
    ctx.fillRect(x + swing - 2, y - 6, 4, 12);
  }
  for (let i = 0; i < 5; i++) {
    const x = i % 2 ? view.width * .75 + i * 14 : view.width * .08 + i * 18;
    const y = 120 + i * 115;
    ctx.globalAlpha = .16 + (Math.sin(pulse * 3 + i * 2) + 1) * .1;
    ctx.fillStyle = i % 2 ? theme.secondary : theme.accent;
  ctx.beginPath(); ctx.roundRect(x, y, 34 + (i % 2) * 14, 4, 2); ctx.fill();
  }
} else if (theme.motif === 2) {
  // Toxic Transit: tunnel ribs, moving train windows and rising gas.
  ctx.globalAlpha = 0.2;
  for (let rib = 0; rib < 8; rib++) {
    const radius = 90 + rib * 65;
    ctx.beginPath();
    ctx.arc(view.width / 2, view.height + 35, radius, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = theme.accent;
  for (let i = 0; i < 11; i++) {
    const x = (i * 96 - pulse * 115) % (view.width + 120) - 60;
    ctx.fillRect(x, view.height * 0.62, 55, 18);
    ctx.fillStyle = i % 2 ? theme.secondary : theme.accent;
  }
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.arc((i * 83 + pulse * 17) % view.width, view.height - ((i * 61 + pulse * 34) % view.height), 3 + (i % 5) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
} else if (theme.motif === 3) {
  // Crimson Firewall: pulsing data walls and upward-flying embers.
  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 15; i++) {
    const x = i * (view.width / 14);
    const opening = 45 + (Math.sin(pulse * 2.8 + i) + 1) * 28;
    ctx.fillRect(x, 0, 4, view.height - opening);
    ctx.fillRect(x + 7, opening + 24, 2, view.height - opening - 24);
  }
  for (let i = 0; i < 30; i++) {
    const x = (i * 47 + Math.sin(i) * 35) % view.width;
    const y = view.height - ((i * 29 + pulse * (75 + i % 5 * 17)) % view.height);
    ctx.fillStyle = i % 3 ? theme.accent : theme.warning;
    ctx.fillRect(x, y, 2, 8 + i % 9);
  }
} else if (theme.motif === 4) {
  // Azure Data Sea: layered waves, bubbles and luminous data jellyfish.
  ctx.globalAlpha = 0.25;
  for (let band = 0; band < 7; band++) {
    ctx.beginPath();
    for (let x = 0; x <= view.width; x += 18) {
      const y = 55 + band * 72 + Math.sin(x * 0.021 + pulse * (1.3 + band * 0.08) + band) * (10 + band * 2);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const x = (i * 127 + Math.sin(pulse + i) * 42) % view.width;
    const y = view.height - ((i * 71 + pulse * 24) % (view.height + 80));
    ctx.beginPath(); ctx.arc(x, y, 11 + i % 4 * 4, Math.PI, 0); ctx.stroke();
    for (let arm = -1; arm <= 1; arm++) {
      ctx.beginPath(); ctx.moveTo(x + arm * 7, y); ctx.lineTo(x + arm * 10 + Math.sin(pulse * 2 + i) * 4, y + 26); ctx.stroke();
    }
  }
} else if (theme.motif === 5) {
  // Violet Reactor: rotating containment rings and an unstable core.
  const cx = view.width * 0.5;
  const cy = view.height * 0.48;
  const core = ctx.createRadialGradient(cx, cy, 4, cx, cy, 125);
  core.addColorStop(0, theme.warning);
  core.addColorStop(0.2, theme.secondary);
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = core;
  ctx.fillRect(cx - 140, cy - 140, 280, 280);
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, 42 + i * 34, 20 + i * 18, pulse * (i % 2 ? 0.22 : -0.17) + i, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const angle = pulse * 1.8 + i * Math.PI / 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(angle) * 220, cy + Math.sin(angle) * 135); ctx.stroke();
  }
} else if (theme.motif === 6) {
  // Solar Megagrid: autonomous heliostat drones harvest the remaining
  // dusk light above the arrays. Their individual, slowly shifting
  // positions make this a living solar field rather than another stream
  // of horizontal or diagonal lines.
  const sunX = view.width * .72;
  const sunY = view.height * .25;
  const sun = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 155);
  sun.addColorStop(0, "rgba(255,249,205,.62)");
  sun.addColorStop(.26, "rgba(255,178,55,.24)");
  sun.addColorStop(1, "rgba(255,141,36,0)");
  ctx.globalAlpha = .66 + Math.sin(pulse * .72) * .08;
  ctx.fillStyle = sun;
  ctx.fillRect(sunX - 155, sunY - 155, 310, 310);
  const heliostatAnchors: Array<[number, number]> = [
    [.17, .18], [.41, .29], [.63, .16], [.84, .37],
    [.26, .54], [.56, .66], [.78, .79],
  ];
  for (let i = 0; i < 7; i++) {
    const orbit = pulse * (.32 + i * .027) + i * 1.74;
    const [anchorX, anchorY] = heliostatAnchors[i];
    const x = view.width * anchorX + Math.cos(orbit) * (17 + (i % 3) * 8);
    const y = view.height * anchorY + Math.sin(orbit * 1.31) * 13;
    const radius = 9 + (i % 3) * 2;
    const halo = ctx.createRadialGradient(x, y, 1, x, y, radius * 3.5);
    halo.addColorStop(0, "rgba(255,250,208,.9)");
    halo.addColorStop(.18, "rgba(255,195,75,.58)");
    halo.addColorStop(1, "rgba(255,133,25,0)");
    ctx.globalAlpha = .28 + (Math.sin(pulse * 2.2 + i) + 1) * .13;
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y, radius * 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = .62;
    ctx.fillStyle = "rgba(255,219,116,.9)";
    ctx.beginPath();
    ctx.moveTo(x, y - radius); ctx.lineTo(x + radius, y); ctx.lineTo(x, y + radius); ctx.lineTo(x - radius, y); ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = .82;
    ctx.fillStyle = "rgba(255,255,224,.95)";
    ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 22; i++) {
    const x = (i * 149 + Math.sin(pulse * .72 + i * 2.1) * 54) % view.width;
    const y = view.height - ((i * 71 + pulse * (10 + i % 4 * 4)) % (view.height * .72));
    const spark = 1 + (i % 3) * .7;
    ctx.globalAlpha = .16 + (Math.sin(pulse * 2.4 + i) + 1) * .12;
    ctx.fillStyle = i % 4 === 0 ? "rgba(255,120,43,.9)" : "rgba(255,219,118,.9)";
    ctx.beginPath(); ctx.arc(x, y, spark, 0, Math.PI * 2); ctx.fill();
  }
} else if (theme.motif === 7) {
  // Ghost Network: broken packet streams and flickering phantom nodes.
  ctx.globalAlpha = 0.21;
  for (let i = 0; i < 28; i++) {
    const x = (i * 67 + Math.sin(pulse * 1.7 + i) * 45) % view.width;
    const y = (i * 97 + pulse * (38 + i % 4 * 11)) % view.height;
    ctx.fillRect(x, y, 2, 18 + (i % 7) * 7);
    if (i % 3 === 0) ctx.fillRect(x - 22, y + 8, 46, 1);
  }
  ctx.globalAlpha = 0.1 + (Math.sin(pulse * 9) + 1) * 0.05;
  for (let i = 0; i < 5; i++) {
    const x = 100 + i * 190 + Math.sin(pulse + i) * 30;
    const y = 100 + (i * 83) % 330;
    ctx.beginPath(); ctx.arc(x, y, 28, Math.PI, 0); ctx.lineTo(x + 28, y + 52); ctx.lineTo(x - 28, y + 52); ctx.closePath(); ctx.stroke();
  }
} else if (theme.motif === 8) {
  // Quantum Rift: rotating singularity with warped star trails.
  const cx = view.width * 0.52;
  const cy = view.height * 0.44;
  ctx.globalAlpha = 0.25;
  for (let arm = 0; arm < 7; arm++) {
    ctx.beginPath();
    for (let i = 0; i < 22; i++) {
      const radius = 12 + i * 15;
      const angle = pulse * 0.28 + arm * 0.9 + i * 0.19;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius * 0.58;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 45; i++) {
    const angle = i * 2.399 + pulse * 0.08;
    const radius = 65 + (i * 47) % 370;
    ctx.fillRect(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius * 0.62, 2 + i % 3, 2 + i % 3);
  }
} else if (theme.motif === 9) {
  // Skybreak Apex: dawn above the clouds and the transmission beacon.
  const horizon = view.height * 0.55;
  const dawn = ctx.createRadialGradient(view.width / 2, horizon, 8, view.width / 2, horizon, 310);
  dawn.addColorStop(0, theme.warning);
  dawn.addColorStop(0.35, theme.secondary);
  dawn.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = dawn;
  ctx.fillRect(0, 0, view.width, view.height);
  for (let i = 0; i < 24; i++) {
    const angle = (Math.PI * 2 * i) / 24 + pulse * 0.025;
    ctx.beginPath();
    ctx.moveTo(view.width / 2, horizon);
    ctx.lineTo(view.width / 2 + Math.cos(angle) * view.width, horizon + Math.sin(angle) * view.height);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.24;
  for (let i = 0; i < 10; i++) {
    const x = (i * 137 + pulse * (8 + i % 3 * 4)) % (view.width + 220) - 110;
    const y = horizon + 35 + (i % 3) * 42;
    ctx.beginPath(); ctx.ellipse(x, y, 90 + i % 4 * 18, 20 + i % 3 * 7, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = theme.accent;
  ctx.fillRect(view.width / 2 - 4, 45, 8, horizon - 45);
  ctx.fillRect(view.width / 2 - 58, 86, 116, 3);
} else if (theme.motif === 10) {
  // Inferno Foundry: heat shimmer, rising cinders and furnace pulses.
  ctx.globalAlpha = .3;
  for (let i = 0; i < 42; i++) { const x = (i * 71 + Math.sin(pulse * 1.7 + i) * 20) % view.width; const y = view.height - ((i * 39 + pulse * (45 + i % 5 * 18)) % view.height); ctx.fillStyle = i % 3 ? "#ff5c24" : "#ffe39a"; ctx.fillRect(x, y, 2 + i % 3, 4 + i % 6); }
  for (let i = 0; i < 4; i++) { const x = view.width * (.16 + i * .23); const glow = ctx.createRadialGradient(x, view.height * .72, 4, x, view.height * .72, 90); glow.addColorStop(0, "rgba(255,230,130,.48)"); glow.addColorStop(1, "rgba(255,44,8,0)"); ctx.fillStyle = glow; ctx.fillRect(x - 90, view.height * .72 - 90, 180, 180); }
  // Four deliberately uneven thermal sources rise from the lava rather than
  // covering the whole level in a repeated grid. Each plume has its own pace,
  // reach and sideways drift, which reads as unstable hot air instead of lines.
  const heatSources = [
    { x: .11, y: .82, rise: .52, width: 19, speed: 1.26 },
    { x: .34, y: .67, rise: .38, width: 12, speed: .83 },
    { x: .71, y: .78, rise: .61, width: 24, speed: 1.58 },
    { x: .91, y: .56, rise: .31, width: 11, speed: 1.03 },
  ];
  for (let source = 0; source < heatSources.length; source++) {
    const plume = heatSources[source];
    const baseX = view.width * plume.x;
    const baseY = view.height * plume.y;
    const phase = pulse * plume.speed + source * 2.73;
    ctx.globalAlpha = .085 + (Math.sin(phase * .7) + 1) * .035;
    ctx.strokeStyle = source % 2 ? "#ffb654" : "#ff7544";
    ctx.lineWidth = 2 + source % 2;
    for (let strand = 0; strand < 2; strand++) {
      ctx.beginPath();
      for (let part = 0; part <= 12; part++) {
        const progress = part / 12;
        const y = baseY - view.height * plume.rise * progress;
        const sway = Math.sin(phase + progress * (7.4 + source) + strand * 1.6) * (plume.width + progress * 18);
        const drift = Math.sin(phase * .53 + progress * 3.1) * progress * 28;
        const x = baseX + sway + drift + strand * 5;
        if (part === 0) ctx.moveTo(x, y); else ctx.quadraticCurveTo(x, y - 7, x, y);
      }
      ctx.stroke();
    }
    const halo = ctx.createRadialGradient(baseX, baseY, 2, baseX, baseY, 42 + plume.width);
    halo.addColorStop(0, "rgba(255,223,142,.2)"); halo.addColorStop(1, "rgba(255,75,24,0)");
    ctx.globalAlpha = .32 + Math.sin(phase) * .08;
    ctx.fillStyle = halo; ctx.fillRect(baseX - 60, baseY - 60, 120, 120);
  }
} else if (theme.motif === 11) {
  // Abyss: bioluminescent manta rays glide through the data ocean. This keeps
  // the water world distinct from the jellyfish animation in Azure Data Sea.
  ctx.globalAlpha = .3;
  for (let i = 0; i < 7; i++) {
    const x = (i * 181 + pulse * (18 + i % 3 * 7)) % (view.width + 180) - 90;
    const y = 70 + (i * 97) % Math.max(130, view.height - 110);
    const wing = 24 + i % 3 * 7;
    const flap = Math.sin(pulse * 1.5 + i) * 7;
    ctx.fillStyle = i % 2 ? "rgba(78,238,255,.38)" : "rgba(112,126,255,.34)";
    ctx.beginPath();
    ctx.moveTo(x - wing, y + flap); ctx.quadraticCurveTo(x - 8, y - 13 - flap, x, y - 2);
    ctx.quadraticCurveTo(x + 8, y - 13 - flap, x + wing, y + flap);
    ctx.quadraticCurveTo(x + 6, y + 9, x, y + 5); ctx.quadraticCurveTo(x - 6, y + 9, x - wing, y + flap);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(189,255,252,.72)";
    ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.quadraticCurveTo(x + 16, y + 12, x + 24, y + 21); ctx.stroke();
    ctx.fillStyle = "rgba(210,255,255,.75)"; ctx.beginPath(); ctx.arc(x + 3, y - 2, 1.6, 0, Math.PI * 2); ctx.fill();
  }
} else if (theme.motif === 12) {
  // Air: turbine rings, cloud vortices and charged wind motes.
  ctx.globalAlpha = .24;
  for (let i = 0; i < 5; i++) { const cx = view.width * (.12 + i * .2); const cy = view.height * (.25 + (i % 3) * .22); ctx.beginPath(); ctx.arc(cx, cy, 30 + Math.sin(pulse + i) * 8, pulse * .5 + i, pulse * .5 + i + Math.PI * 1.5); ctx.stroke(); }
  for (let i = 0; i < 30; i++) { const x = (i * 97 + pulse * (38 + i % 5 * 8)) % view.width; const y = (i * 71 + Math.sin(pulse + i) * 22) % view.height; ctx.fillStyle = i % 4 ? "rgba(117,255,243,.8)" : "rgba(255,229,161,.9)"; ctx.fillRect(x, y, 4 + i % 5, 1); }
} else {
  // Earth: levitating stones, glowing mineral seams and slow spores.
  ctx.globalAlpha = .3;
  for (let i = 0; i < 12; i++) { const x = (i * 131 + Math.sin(pulse * .55 + i) * 28) % view.width; const y = 70 + (i * 83) % Math.max(110, view.height - 100); ctx.fillStyle = "rgba(36,54,29,.86)"; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 14, y - 2); ctx.lineTo(x + 8, y + 11); ctx.lineTo(x - 10, y + 8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#64f09a"; ctx.stroke(); }
  for (let i = 0; i < 26; i++) { ctx.fillStyle = i % 3 ? "rgba(100,240,154,.6)" : "rgba(240,186,82,.65)"; ctx.beginPath(); ctx.arc((i * 83 + pulse * 11) % view.width, (i * 47 + pulse * 17) % view.height, 1 + i % 3, 0, Math.PI * 2); ctx.fill(); }
}
ctx.restore();

}
