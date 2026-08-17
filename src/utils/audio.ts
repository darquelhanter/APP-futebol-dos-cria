// Sound synthesizer using Web Audio API for referee whistle and celebration sounds

export function playWhistleSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2900, ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(2500, ctx.currentTime + 0.3);

    // Modulation for authentic trill
    const modOsc = ctx.createOscillator();
    const modGain = ctx.createGain();
    modOsc.frequency.value = 40; // 40Hz trill
    modGain.gain.value = 300;
    modOsc.connect(osc.frequency);

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    modOsc.start();
    osc.start();
    modOsc.stop(ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.log('Audio playback not permitted or unsupported', e);
  }
}

export function playGoalCheerSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    // Play a dual rising fanfare
    const now = ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      
      gain.gain.setValueAtTime(0.01, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.45);
    });
  } catch (e) {
    console.log('Goal sound error', e);
  }
}
