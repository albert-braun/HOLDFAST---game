export const keys = new Set();
export const pressed = new Set();
export const released = new Set();
export const mouse = { x: 0, y: 0, down: false, pressed: false, released: false, inside: false };

let canvas;

function place(event) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) * canvas.width) / rect.width;
  mouse.y = ((event.clientY - rect.top) * canvas.height) / rect.height;
  mouse.inside = mouse.x >= 0 && mouse.y >= 0 && mouse.x <= canvas.width && mouse.y <= canvas.height;
}

export function bindInput(target) {
  canvas = target;
  window.addEventListener("keydown", (event) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
    }
    if (!keys.has(event.code)) pressed.add(event.code);
    keys.add(event.code);
  });
  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
    released.add(event.code);
  });
  canvas.addEventListener("pointerdown", (event) => {
    canvas.focus();
    place(event);
    mouse.down = true;
    mouse.pressed = true;
  });
  window.addEventListener("pointerup", () => {
    if (!mouse.down) return;
    mouse.down = false;
    mouse.released = true;
  });
  window.addEventListener("pointermove", (event) => {
    if (!canvas) return;
    place(event);
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  document.querySelectorAll("[data-key]").forEach((button) => {
    const code = button.dataset.key;
    const down = (event) => {
      event.preventDefault();
      if (!keys.has(code)) pressed.add(code);
      keys.add(code);
    };
    const up = (event) => {
      event.preventDefault();
      keys.delete(code);
      released.add(code);
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointerleave", up);
    button.addEventListener("pointercancel", up);
  });
}

export function endFrame() {
  pressed.clear();
  released.clear();
  mouse.pressed = false;
  mouse.released = false;
}

export function held(code) {
  return keys.has(code);
}

export function wentDown(...codes) {
  return codes.some((code) => pressed.has(code));
}

export function wentUp(...codes) {
  return codes.some((code) => released.has(code));
}
