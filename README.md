# HOLDFAST

A climb drawn on a canvas. Twenty-four ledges, each a little harder than the last.

The page is plain HTML, CSS, and JavaScript. There is no framework. `js/main.js` runs the loop with `requestAnimationFrame`. `js/world.js` moves the climber in small steps and resolves collisions against the stone, one axis at a time, so a fast fall cannot pass through a floor. The hook is a ray: it walks from the climber toward the cursor and stops at the first solid tile. Keyboard input moves and jumps. The mouse aims and throws.

## Play

```bash
node server.js
```

Open [http://localhost:3000](http://localhost:3000).

- A / D or arrows move
- W, Space, or Up jumps
- Hold the mouse, then release, to throw the hook
- Q drops the hook, R restarts the ledge, Esc pauses

The early ledges teach a jump, a moving plank, the hook, a key, and a rolling stone. Later ledges combine them: faster planks, higher holds, two keys, and shelves you have to clear. The last ledge uses all of it.
