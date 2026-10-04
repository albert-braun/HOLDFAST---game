import { levels } from "./levels.js";
import { bindInput, endFrame, mouse, wentDown } from "./input.js";
import { drawScene } from "./draw.js";
import { stepActors } from "./actors.js";
import { drift, loadLevel, update } from "./play.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scales = ["1", "1.15", "1.3"];

function applyScale(scale) {
  const chosen = scales.includes(scale) ? scale : "1";
  document.documentElement.dataset.scale = chosen;
  document.documentElement.style.setProperty("--scale", chosen);
  for (const button of document.querySelectorAll(".scale button")) {
    button.setAttribute("aria-pressed", button.dataset.scale === chosen ? "true" : "false");
  }
  try {
    localStorage.setItem("holdfast-scale", chosen);
  } catch {
    /* The climb still changes size for this visit. */
  }
}

let saved = "1";
try {
  saved = localStorage.getItem("holdfast-scale") || "1";
} catch {
  saved = "1";
}
applyScale(saved);
for (const button of document.querySelectorAll(".scale button")) {
  button.addEventListener("click", () => applyScale(button.dataset.scale));
}

const state = {
  mode: "title",
  modeTime: 0,
  time: 0,
  index: 0,
  total: levels.length,
  level: levels[0],
  player: null,
  hook: null,
  aiming: false,
  particles: [],
  shake: 0,
  mouse,
};

loadLevel(state, 0);
state.mode = "title";

bindInput(canvas);
canvas.addEventListener("pointerdown", () => {
  if (state.mode === "title") {
    state.mode = "play";
    state.modeTime = 0;
    state.suppressHook = true;
  }
});

let last = 0;
function frame(now) {
  const dt = Math.min(0.033, last ? (now - last) / 1000 : 0);
  last = now;
  state.time += dt;
  state.mouse = mouse;

  if (state.mode === "title") {
    state.levelTime += dt;
    stepActors(state.actors, state.levelTime);
  }
  if (state.mode === "title" && wentDown("Enter")) {
    state.mode = "play";
    state.modeTime = 0;
  } else if (state.mode === "play" && wentDown("Escape")) {
    state.mode = "pause";
  } else if (state.mode === "pause" && wentDown("Escape", "Enter")) {
    state.mode = "play";
  } else if (state.mode === "play") {
    update(state, dt);
  } else if (state.mode === "dead") {
    state.modeTime += dt;
    drift(state, dt);
    if (state.modeTime > 0.85) loadLevel(state, state.index);
  } else if (state.mode === "clear") {
    state.modeTime += dt;
    drift(state, dt);
    if (state.modeTime > 0.9) loadLevel(state, state.index + 1);
  } else if (state.mode === "win" && wentDown("Enter")) {
    loadLevel(state, 0);
  }

  if (wentDown("KeyR") && state.mode !== "title") loadLevel(state, state.index);

  drawScene(ctx, state);
  endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
