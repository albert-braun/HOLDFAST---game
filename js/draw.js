import { TILE, VIEW_H, VIEW_W } from "./levels.js";
import { HOOK_RANGE, aimFrom, cell, raycast } from "./world.js";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hills(ctx, time) {
  ctx.fillStyle = "#1c2633";
  ctx.beginPath();
  ctx.moveTo(0, VIEW_H);
  for (let x = 0; x <= VIEW_W; x += 12) {
    const y = 300 + Math.sin(x * 0.008 + time * 0.2) * 22 + Math.sin(x * 0.02) * 8;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(VIEW_W, VIEW_H);
  ctx.fill();
  ctx.fillStyle = "#243140";
  ctx.beginPath();
  ctx.moveTo(0, VIEW_H);
  for (let x = 0; x <= VIEW_W; x += 12) {
    const y = 390 + Math.sin(x * 0.012 + 1.4 + time * 0.12) * 16;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(VIEW_W, VIEW_H);
  ctx.fill();
}

function drawTile(ctx, kind, x, y, time) {
  if (kind === "#" || kind === "H") {
    ctx.fillStyle = kind === "H" ? "#c4552e" : "#b79a72";
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = kind === "H" ? "#f0c2a4" : "#e4d2b0";
    ctx.fillRect(x, y, TILE, 4);
    ctx.fillStyle = kind === "H" ? "#7a2e1c" : "#7d6748";
    ctx.fillRect(x, y + TILE - 5, TILE, 5);
    if (kind === "H") {
      ctx.strokeStyle = "#f4e7d4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + TILE / 2, y + 12, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    return;
  }
  if (kind === "=") {
    ctx.fillStyle = "#d9c4a0";
    ctx.fillRect(x + 2, y, TILE - 4, 7);
    return;
  }
  if (kind === "^") {
    ctx.fillStyle = "#9c3b2e";
    for (let i = 0; i < 4; i += 1) {
      const left = x + i * 8;
      ctx.beginPath();
      ctx.moveTo(left + 1, y + TILE);
      ctx.lineTo(left + 4, y + 10);
      ctx.lineTo(left + 7, y + TILE);
      ctx.fill();
    }
    return;
  }
  if (kind === "o") {
    const bob = Math.sin(time * 5) * 2;
    ctx.fillStyle = "#e2b15a";
    ctx.beginPath();
    ctx.arc(x + 16, y + 14 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f4e7d4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 16, y + 22 + bob, 4, 0, Math.PI * 1.2);
    ctx.stroke();
    return;
  }
  if (kind === "G") {
    ctx.fillStyle = "#6a5344";
    for (let i = 0; i < 3; i += 1) ctx.fillRect(x + 6 + i * 8, y + 2, 3, TILE - 4);
    ctx.fillRect(x + 4, y + 2, TILE - 8, 3);
    return;
  }
  if (kind === "*") {
    const wave = Math.sin(time * 4) * 3;
    ctx.strokeStyle = "#efe6d6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 4);
    ctx.lineTo(x + 10, y + TILE - 2);
    ctx.stroke();
    ctx.fillStyle = "#d7efe4";
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 4);
    ctx.lineTo(x + 26, y + 10 + wave);
    ctx.lineTo(x + 10, y + 16);
    ctx.fill();
  }
}

function drawPlayer(ctx, player, time) {
  const bob = Math.abs(player.vx) > 20 && player.onGround ? Math.sin(time * 14) * 1.5 : 0;
  const x = player.x;
  const y = player.y + bob;
  ctx.fillStyle = "#1b140f";
  ctx.fillRect(x + 3, y + player.h - 3, 6, 3);
  ctx.fillRect(x + player.w - 9, y + player.h - 3, 6, 3);
  ctx.fillStyle = "#f3ead8";
  roundRect(ctx, x + 2, y + 8, player.w - 4, player.h - 10, 4);
  ctx.fill();
  ctx.fillStyle = "#e7d3b0";
  ctx.beginPath();
  ctx.arc(x + player.w / 2 + player.facing * 2, y + 7, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1b140f";
  ctx.fillRect(x + player.w / 2 + player.facing * 3, y + 6, 2, 2);
}

function drawMover(ctx, mover) {
  const y = mover.y - mover.h;
  ctx.fillStyle = "#6e5338";
  ctx.fillRect(mover.pos, y, mover.w, mover.h);
  ctx.fillStyle = "#e7d3b0";
  ctx.fillRect(mover.pos, y, mover.w, 3);
  ctx.fillStyle = "#c4552e";
  ctx.fillRect(mover.pos + 4, y + 5, 4, 4);
  ctx.fillRect(mover.pos + mover.w - 8, y + 5, 4, 4);
}

function drawHazard(ctx, hazard) {
  ctx.fillStyle = "#2a211c";
  ctx.beginPath();
  ctx.arc(hazard.pos, hazard.y, hazard.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c4552e";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawHook(ctx, player, hook, aim, rows, actors) {
  if (!hook && !aim) return;
  const origin = aimFrom(player, aim || hook);
  const shot = hook || raycast(rows, origin.ox, origin.oy, origin.x, origin.y, actors);
  ctx.save();
  ctx.strokeStyle = shot.hit || hook ? "#e7d3b0" : "rgba(239,230,214,0.45)";
  ctx.lineWidth = hook ? 2.5 : 1.5;
  ctx.setLineDash(hook ? [] : [5, 6]);
  ctx.beginPath();
  ctx.moveTo(origin.ox, origin.oy);
  ctx.lineTo(shot.x, shot.y);
  ctx.stroke();
  ctx.setLineDash([]);
  if (shot.hit || hook) {
    ctx.strokeStyle = "#c4552e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, hook ? 5 : 4, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "rgba(239,230,214,0.25)";
    ctx.beginPath();
    ctx.arc(origin.ox, origin.oy, HOOK_RANGE, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function banner(ctx, title, sub) {
  ctx.fillStyle = "rgba(12, 16, 22, 0.62)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#f4ecdf";
  ctx.font = "64px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.font = "22px Georgia, serif";
  ctx.fillStyle = "#e7d3b0";
  ctx.fillText(sub, VIEW_W / 2, VIEW_H / 2 + 36);
}

export function drawScene(ctx, state) {
  const level = state.level;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = "#141b24";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  hills(ctx, state.time);
  for (let r = 0; r < level.rows.length; r += 1) {
    for (let c = 0; c < level.rows[r].length; c += 1) {
      const kind = cell(level.rows, c, r);
      if (kind === "o" && state.actors.taken.has(`${c},${r}`)) continue;
      if (kind === "G" && state.actors.keysGot >= state.actors.keysNeed) continue;
      if (kind !== ".") drawTile(ctx, kind, c * TILE, r * TILE, state.time);
    }
  }
  for (const mover of state.actors.movers) drawMover(ctx, mover);
  for (const hazard of state.actors.hazards) drawHazard(ctx, hazard);
  for (const bit of state.particles) {
    ctx.globalAlpha = Math.max(0, bit.life);
    ctx.fillStyle = bit.color;
    ctx.fillRect(bit.x, bit.y, bit.size, bit.size);
  }
  ctx.globalAlpha = 1;
  const aiming = state.mode === "play" && state.aiming ? state.mouse : null;
  drawHook(ctx, state.player, state.hook, aiming, level.rows, state.actors);
  drawPlayer(ctx, state.player, state.time);
  ctx.restore();

  ctx.fillStyle = "#f4ecdf";
  ctx.font = "20px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText(`${state.index + 1} / ${state.total}  ${level.name}`, 20, 32);
  ctx.font = "16px Georgia, serif";
  ctx.fillStyle = "#e7d3b0";
  ctx.fillText(level.hint, 20, 54);
  if (state.actors.keysNeed) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#e2b15a";
    ctx.fillText(`Key ${state.actors.keysGot}/${state.actors.keysNeed}`, VIEW_W - 20, 32);
  }

  if (state.mode === "title") banner(ctx, "HOLDFAST", "Press Enter or click the ridge");
  if (state.mode === "pause") banner(ctx, "Paused", "Esc to climb on");
  if (state.mode === "dead") banner(ctx, "The hold slipped", "Back to the ledge");
  if (state.mode === "clear") banner(ctx, "The ledge kept", level.name);
  if (state.mode === "win") banner(ctx, "The ridge is yours", "Enter to climb it again");
}
