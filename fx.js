// Fusion Audio Engine — Web Audio processing chain for local and embedded media.
function createFX(ctx) {
  const filter = (type, frequency) => {
    const node = ctx.createBiquadFilter(); node.type = type; node.frequency.value = frequency; return node;
  };
  const eqFrequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const eq = eqFrequencies.map(frequency => { const node = filter('peaking', frequency); node.Q.value = 1.05; return node; });
  const crush = ctx.createWaveShaper(); crush.oversample = '4x';
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const convolver = ctx.createConvolver();
  const sum = ctx.createGain();
  const panner = ctx.createStereoPanner();
  const tone = filter('lowpass', 22000);
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -2;
  compressor.knee.value = 5;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.18;
  const master = ctx.createGain();
  const noiseGain = ctx.createGain();

  // Every EQ band must be in the signal path. The old build connected only 3 of 10 bands.
  for (let i = 0; i < eq.length - 1; i++) eq[i].connect(eq[i + 1]);
  eq[eq.length - 1].connect(crush);
  crush.connect(dry); crush.connect(convolver); convolver.connect(wet);
  dry.connect(sum); wet.connect(sum); sum.connect(panner); panner.connect(tone);
  tone.connect(compressor); compressor.connect(master); master.connect(ctx.destination);

  // Subtle vinyl surface noise, mixed after the main dynamics stage.
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = (Math.random() * 2 - 1) * (Math.random() < 0.0015 ? 0.7 : 0.012);
  const noise = ctx.createBufferSource(); noise.buffer = noiseBuffer; noise.loop = true; noise.start();
  noise.connect(noiseGain); noiseGain.connect(master);

  const rooms = { room: [0.45, 2.8], hall: [1.7, 2.2], cathedral: [3.5, 1.9], plate: [1.1, 3.8] };
  let currentRoom = null;
  let orbitSpeed = 0;
  let phase = 0;
  let animationFrame = null;
  function impulse(seconds, decay) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    return buffer;
  }
  function animate() {
    phase += 0.025;
    panner.pan.setTargetAtTime(orbitSpeed ? Math.sin(phase * orbitSpeed * 2) : 0, ctx.currentTime, 0.04);
    animationFrame = setTimeout(animate, 40);
  }
  animate();

  return {
    hook(element) {
      if (!element || element.__fusionAudioSource) return;
      const source = ctx.createMediaElementSource(element);
      source.connect(eq[0]);
      try { Object.defineProperty(element, '__fusionAudioSource', { value: source }); } catch {}
    },
    set(settings) {
      const s = settings || {};
      (s.eq || []).forEach((gain, index) => { if (eq[index]) eq[index].gain.setTargetAtTime(Math.max(-12, Math.min(12, Number(gain) || 0)), ctx.currentTime, 0.025); });
      const room = rooms[s.room];
      if (!room || s.room === 'off') { wet.gain.setTargetAtTime(0, ctx.currentTime, 0.03); }
      else {
        if (currentRoom !== s.room) { currentRoom = s.room; convolver.buffer = impulse(...room); }
        wet.gain.setTargetAtTime(Math.max(0, Math.min(1, (Number(s.wet) || 0) / 100)), ctx.currentTime, 0.03);
      }
      dry.gain.setTargetAtTime(1 - wet.gain.value * 0.35, ctx.currentTime, 0.03);
      orbitSpeed = ({ off: 0, '4D': 0.12, '8D': 0.3, '16D': 0.8 })[s.orb] || 0;
      const depth = Math.max(0, Math.min(12, Number(s.crush) || 0));
      if (depth) {
        const steps = Math.pow(2, Math.max(2, depth + 1));
        const curve = new Float32Array(2048);
        for (let i = 0; i < curve.length; i++) { const x = i * 2 / (curve.length - 1) - 1; curve[i] = Math.round(x * steps) / steps; }
        crush.curve = curve;
      } else crush.curve = null;
      tone.frequency.setTargetAtTime(s.vinyl ? 6500 : 22000, ctx.currentTime, 0.05);
      noiseGain.gain.setTargetAtTime(s.vinyl ? 0.035 : 0, ctx.currentTime, 0.08);
    },
    dispose() { if (animationFrame) clearTimeout(animationFrame); }
  };
}
if (typeof module !== 'undefined') module.exports = { createFX };
else window.createFX = createFX;
