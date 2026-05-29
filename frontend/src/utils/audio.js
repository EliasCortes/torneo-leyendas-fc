// Web Audio API helper for sound effects
class SoundController {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.enabled) return;
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle(state) {
    this.enabled = state !== undefined ? state : !this.enabled;
    if (!this.enabled && this.ctx) {
      this.ctx.suspend();
    }
  }

  playTick() {
    this.init();
    if (!this.ctx || !this.enabled) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.04);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playSwoosh() {
    this.init();
    if (!this.ctx || !this.enabled) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.25);
    
    gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playSuccess() {
    this.init();
    if (!this.ctx || !this.enabled) return;
    
    const now = this.ctx.currentTime;
    
    const playNote = (freq, delay, duration) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      gain.gain.setValueAtTime(0.0, now + delay);
      gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    };
    
    // Play a nice arpeggio (C Major Triad)
    playNote(523.25, 0, 0.25);   // C5
    playNote(659.25, 0.08, 0.25); // E5
    playNote(783.99, 0.16, 0.3);  // G5
    playNote(1046.50, 0.24, 0.5); // C6
  }

  playFail() {
    this.init();
    if (!this.ctx || !this.enabled) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(70, this.ctx.currentTime + 0.35);
    
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  playCardReveal() {
    this.init();
    if (!this.ctx || !this.enabled) return;
    
    const now = this.ctx.currentTime;
    
    const playNote = (freq, delay, duration) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      gain.gain.setValueAtTime(0.0, now + delay);
      gain.gain.linearRampToValueAtTime(0.1, now + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    };
    
    playNote(440.00, 0, 0.2); // A4
    playNote(554.37, 0.05, 0.2); // C#5
    playNote(659.25, 0.1, 0.35); // E5
  }
}

export const sounds = new SoundController();
export default sounds;
