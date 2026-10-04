let context;

function tone(freq, duration, type, gain) {
  try {
    context = context || new AudioContext();
    if (context.state === "suspended") context.resume();
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.value = gain;
    osc.connect(amp);
    amp.connect(context.destination);
    osc.start();
    amp.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    osc.stop(context.currentTime + duration);
  } catch {
    // The climb still works if the browser blocks sound.
  }
}

export const sfx = {
  jump: () => tone(540, 0.08, "square", 0.03),
  hook: () => tone(180, 0.12, "triangle", 0.04),
  miss: () => tone(110, 0.06, "square", 0.02),
  land: () => tone(220, 0.05, "triangle", 0.02),
  hurt: () => tone(80, 0.25, "sawtooth", 0.03),
  clear: () => tone(660, 0.18, "triangle", 0.04),
  key: () => tone(760, 0.12, "triangle", 0.04),
};
