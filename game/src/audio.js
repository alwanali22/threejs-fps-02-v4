export function createAudio() {
  let context = null;
  let master = null;
  let noiseBuffer = null;
  function ready() {
    return Boolean(context && context.state === 'running');
  }
  function unlock() {
    if (!context) {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass) return false;
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
    }
    if (context.state === 'suspended') context.resume();
    return true;
  }
  function blip(freq, dur, type = 'sine', gain = 0.15, when = 0) {
    if (!ready()) return;
    const start = context.currentTime + when;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.02, dur));
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(start);
    oscillator.stop(start + dur + 0.015);
  }
  function noiseBurst(dur, filterFreq, gain, when = 0) {
    if (!ready()) return;
    const start = context.currentTime + when;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);
    source.start(start);
    source.stop(start + dur + 0.01);
  }
  function sweep(freqA, freqB, dur, type = 'sine', gain = 0.15) {
    if (!ready()) return;
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, freqA), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, freqB), start + dur);
    envelope.gain.setValueAtTime(Math.max(0.0002, gain), start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(start);
    oscillator.stop(start + dur + 0.01);
  }
  function shot(distance = 0) {
    if (!ready()) return;
    const d = Math.max(0, distance);
    const delay = d / 340;
    const loudness = Math.max(0.06, 0.46 / (1 + d * 0.035));
    noiseBurst(0.09, Math.max(700, 8500 - d * 90), loudness, delay);
    blip(82, 0.14, 'sine', loudness * 0.68, delay);
  }
  function enemyShot(distance = 0) {
    if (!ready()) return;
    const d = Math.max(0, distance);
    const delay = d / 340;
    const loudness = Math.max(0.025, 0.24 / (1 + d * 0.045));
    noiseBurst(0.075, Math.max(500, 6000 - d * 70), loudness, delay);
    blip(68, 0.12, 'triangle', loudness * 0.6, delay);
  }
  function reload() {
    blip(520, 0.045, 'square', 0.09);
    blip(340, 0.065, 'square', 0.1, 0.42);
  }
  function dryFire() {
    blip(210, 0.035, 'square', 0.1);
    blip(95, 0.045, 'triangle', 0.06, 0.025);
  }
  function hit(headshot = false) {
    blip(headshot ? 1450 : 920, 0.12, 'sine', 0.17);
    blip(headshot ? 2100 : 1280, 0.07, 'triangle', 0.055, 0.035);
  }
  function hurt() {
    noiseBurst(0.13, 520, 0.14);
    blip(58, 0.18, 'sine', 0.18);
  }
  function plantBeep() {
    blip(880, 0.09, 'sine', 0.12);
    blip(1180, 0.11, 'sine', 0.09, 0.11);
  }
  function defuseTick() {
    blip(620, 0.035, 'square', 0.075);
  }
  function explosion() {
    noiseBurst(1.2, 1800, 0.62);
    sweep(105, 28, 1.05, 'sine', 0.42);
    blip(42, 0.75, 'sine', 0.3);
  }
  function flash() {
    sweep(3200, 900, 1.8, 'sine', 0.1);
    blip(2400, 1.2, 'sine', 0.08);
  }
  function smokeHiss() {
    noiseBurst(1.0, 900, 0.16);
  }
  function footstep(run = false) {
    noiseBurst(run ? 0.11 : 0.08, run ? 650 : 460, run ? 0.075 : 0.045);
    blip(run ? 74 : 58, 0.07, 'sine', run ? 0.055 : 0.035);
  }
  function roundWin() {
    blip(523, 0.15, 'sine', 0.12);
    blip(659, 0.16, 'sine', 0.12, 0.13);
    blip(784, 0.24, 'sine', 0.14, 0.27);
  }
  function roundLose() {
    sweep(390, 150, 0.42, 'triangle', 0.13);
    blip(92, 0.28, 'sine', 0.12, 0.12);
  }
  function click() {
    blip(740, 0.035, 'square', 0.055);
  }
  function buy() {
    blip(660, 0.07, 'sine', 0.085);
    blip(990, 0.12, 'sine', 0.08, 0.075);
  }
  function denied() {
    sweep(180, 95, 0.18, 'square', 0.09);
  }
  return {
    unlock,
    shot,
    enemyShot,
    reload,
    dryFire,
    hit,
    hurt,
    plantBeep,
    defuseTick,
    explosion,
    flash,
    smokeHiss,
    footstep,
    roundWin,
    roundLose,
    click,
    buy,
    denied
  };
}