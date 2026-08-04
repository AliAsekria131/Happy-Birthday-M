/* =========================================================================
   A MESSAGE FOR YOU — script.js
   Structure:
     1. Particle engine (canvas 2D, no libraries)
     2. Tiny WebAudio music/tone generator (no audio files needed)
     3. Scene sequencer (Scene 1 -> 2 -> 3 -> 4)
   Customize the CONFIG block below to change timings and text.
   ========================================================================= */

(() => {
  'use strict';

  /* ===================================================================
     CONFIG — tweak freely
     =================================================================== */
  const CONFIG = {
    journeyMessages: [
      'بعض الناس يجعلون الحياة أكثر إشراقًا.',
      'بعض الناس يتركون ذكريات لا تُنسى.',
      'بعض الناس يستحقون أكثر من الكلمات.',
      'وأنت واحد من هؤلاء الناس.'
    ],
    journeyMessageDuration: 4200, // ms each message is visible (matches CSS animation)
    typewriterSpeed: 55,          // ms per character
    reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };

  /* ===================================================================
     1. PARTICLE ENGINE
     A single canvas reused across every scene. Particle "mode" changes
     the behavior (ambient drift, journey streak, orbit, explosion).
     =================================================================== */
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W, H;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const rand = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;

  class Particle {
    constructor(opts) { Object.assign(this, opts); }
  }

  let particles = [];
  let mode = 'ambient'; // ambient | journey | orbit | explosion
  let orbitCenter = { x: 0, y: 0 };
  let mouse = { x: -9999, y: -9999 };
  let gravityBoost = 0; // used for celebration explosion decay

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  function spawnAmbient(count = 90) {
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push(new Particle({
        x: rand(0, W),
        y: rand(0, H),
        r: rand(0.5, 1.8),
        baseAlpha: rand(0.15, 0.7),
        alpha: 0,
        vx: rand(-0.05, 0.05),
        vy: rand(-0.12, -0.02),
        hue: Math.random() < 0.7 ? 'gold' : 'violet',
        twinkleSpeed: rand(0.4, 1.4),
        phase: rand(0, TAU)
      }));
    }
  }

  function spawnOrbit(count = 60) {
    particles = [];
    for (let i = 0; i < count; i++) {
      const radius = rand(50, 120);
      const angle = rand(0, TAU);
      particles.push(new Particle({
        angle,
        radius,
        baseRadius: radius,
        speed: rand(0.002, 0.006) * (Math.random() < 0.5 ? 1 : -1),
        r: rand(0.8, 2.4),
        hue: Math.random() < 0.6 ? 'gold' : 'violet',
        alpha: rand(0.4, 0.9),
        bob: rand(0, TAU)
      }));
    }
  }

  function spawnExplosion(cx, cy, count = 220) {
    const burst = [];
    for (let i = 0; i < count; i++) {
      const angle = rand(0, TAU);
      const speed = rand(2.5, 9.5);
      burst.push(new Particle({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: rand(1, 3.2),
        alpha: 1,
        decay: rand(0.006, 0.016),
        hue: ['gold', 'ember', 'violet', 'white'][Math.floor(rand(0, 4))],
        gravity: rand(0.02, 0.05)
      }));
    }
    particles = particles.concat(burst);
  }

  function spawnFirework(cx, cy) {
    spawnExplosion(cx, cy, 70);
  }

  function colorFor(hue, alpha) {
    switch (hue) {
      case 'gold':   return `rgba(232, 192, 125, ${alpha})`;
      case 'violet': return `rgba(107, 123, 214, ${alpha})`;
      case 'ember':  return `rgba(255, 157, 122, ${alpha})`;
      case 'white':  return `rgba(255, 250, 240, ${alpha})`;
      default:       return `rgba(255, 255, 255, ${alpha})`;
    }
  }

  let ambientT = 0;

  function drawAmbient() {
    ambientT += 0.016;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) { p.y = H + 10; p.x = rand(0, W); }
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;

      // gentle parallax pull toward mouse for a subtle "alive" feel
      const dx = mouse.x - p.x, dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 160) {
        p.x -= dx * 0.0008;
        p.y -= dy * 0.0008;
      }

      const twinkle = 0.5 + 0.5 * Math.sin(ambientT * p.twinkleSpeed + p.phase);
      const a = p.baseAlpha * twinkle;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fillStyle = colorFor(p.hue, a);
      ctx.shadowBlur = 6;
      ctx.shadowColor = colorFor(p.hue, 0.8);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function drawOrbit() {
    const t = performance.now();
    const isHover = orbitHoverActive;
    for (const p of particles) {
      p.angle += p.speed * (isHover ? 1.8 : 1);
      p.bob += 0.02;
      const r = p.baseRadius + Math.sin(p.bob) * 6 * (isHover ? 1.6 : 1);
      const x = orbitCenter.x + Math.cos(p.angle) * r;
      const y = orbitCenter.y + Math.sin(p.angle) * r * 0.55; // slight ellipse for depth
      ctx.beginPath();
      ctx.arc(x, y, p.r * (isHover ? 1.3 : 1), 0, TAU);
      ctx.fillStyle = colorFor(p.hue, p.alpha);
      ctx.shadowBlur = 10;
      ctx.shadowColor = colorFor(p.hue, 0.9);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function drawExplosion() {
    const next = [];
    for (const p of particles) {
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.985;
      p.alpha -= p.decay;
      if (p.alpha > 0.01) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fillStyle = colorFor(p.hue, p.alpha);
        ctx.shadowBlur = 8;
        ctx.shadowColor = colorFor(p.hue, p.alpha);
        ctx.fill();
        next.push(p);
      }
    }
    ctx.shadowBlur = 0;
    particles = next;

    // sustain gentle ambient sparkle underneath once the burst thins out
    if (particles.length < 40 && Math.random() < 0.15) {
      particles.push(new Particle({
        x: rand(0, W), y: H + 10,
        vx: rand(-0.3, 0.3), vy: rand(-1.6, -0.6),
        r: rand(1, 2.2), alpha: 1, decay: rand(0.004, 0.009),
        hue: ['gold', 'ember', 'violet'][Math.floor(rand(0, 3))],
        gravity: -0.002
      }));
    }
  }

  let orbitHoverActive = false;

  function loop() {
    ctx.clearRect(0, 0, W, H);
    if (mode === 'ambient') drawAmbient();
    else if (mode === 'orbit') drawOrbit();
    else if (mode === 'explosion') drawExplosion();
    requestAnimationFrame(loop);
  }

  spawnAmbient();
  loop();

  /* ===================================================================
     2. TINY WEBAUDIO MUSIC GENERATOR
     No external audio files: soft ambient pad for scenes 1-3, then a
     brighter uplifting swell for the celebration. Built from oscillators
     so the whole project stays dependency-free.
     =================================================================== */
  let audioCtx = null;
  let musicNodes = [];
  let musicMuted = false;

  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function stopMusic() {
    musicNodes.forEach(n => {
      try { n.stop && n.stop(); } catch (e) {}
      try { n.disconnect(); } catch (e) {}
    });
    musicNodes = [];
  }

  // Soft ambient pad: a few detuned sine/triangle oscillators, slow filter sweep.
  function playAmbientPad() {
    const ac = ensureAudio();
    stopMusic();
    const master = ac.createGain();
    master.gain.value = 0;
    master.connect(ac.destination);
    master.gain.linearRampToValueAtTime(musicMuted ? 0 : 0.05, ac.currentTime + 3);

    const freqs = [110, 164.81, 220, 277.18]; // A2, E3, A3, C#4 — warm, open
    freqs.forEach((f, i) => {
      const osc = ac.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      const g = ac.createGain();
      g.gain.value = 0.5 / freqs.length;
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      osc.connect(filter);
      filter.connect(g);
      g.connect(master);
      osc.start();
      // slow detune drift for a "breathing" pad feel
      const lfo = ac.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.01;
      const lfoGain = ac.createGain();
      lfoGain.gain.value = 3;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);
      lfo.start();
      musicNodes.push(osc, lfo, g, filter, lfoGain);
    });
    musicNodes.push(master);
  }

  // Bright uplifting swell for the celebration: major arpeggio + shimmering top.
  function playCelebrationSwell() {
    const ac = ensureAudio();
    stopMusic();
    const master = ac.createGain();
    master.gain.value = 0;
    master.connect(ac.destination);
    master.gain.linearRampToValueAtTime(musicMuted ? 0 : 0.06, ac.currentTime + 1.2);

    const chord = [261.63, 329.63, 392.0, 523.25, 659.25]; // C major, open voicing
    chord.forEach((f, i) => {
      const osc = ac.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const g = ac.createGain();
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(0.4 / chord.length, ac.currentTime + 1.5 + i * 0.15);
      osc.connect(g);
      g.connect(master);
      osc.start(ac.currentTime + i * 0.12);
      musicNodes.push(osc, g);
    });
    musicNodes.push(master);
  }

  function setMuted(val) {
    musicMuted = val;
    musicNodes.forEach(n => {
      if (n.gain && typeof n.gain.value === 'number' && n.gain.value > 0.001) {
        n.gain.linearRampToValueAtTime(val ? 0 : n.gain.value, (audioCtx || ensureAudio()).currentTime + 0.4);
      }
    });
    const btn = document.getElementById('sound-toggle');
    btn.classList.toggle('is-muted', val);
  }

  /* ===================================================================
     3. SCENE SEQUENCER
     =================================================================== */
  const sceneStart = document.getElementById('scene-start');
  const sceneJourney = document.getElementById('scene-journey');
  const sceneGift = document.getElementById('scene-gift');
  const sceneReveal = document.getElementById('scene-reveal');
  const soundToggle = document.getElementById('sound-toggle');

  function showScene(el) {
    document.querySelectorAll('.scene').forEach(s => s.classList.remove('scene--active'));
    el.classList.add('scene--active');
  }

  /* ---- Scene 1: typewriter intro ---- */
  const line1 = document.querySelector('.line--1');
  const line2 = document.querySelector('.line--2');

  function typewrite(el, text, speed) {
    return new Promise((resolve) => {
      el.textContent = '';
      el.classList.add('typewriter-cursor');
      let i = 0;
      const step = () => {
        if (i < text.length) {
          el.textContent += text[i];
          i++;
          setTimeout(step, speed + (Math.random() * 30 - 15)); // slight human irregularity
        } else {
          el.classList.remove('typewriter-cursor');
          resolve();
        }
      };
      step();
    });
  }

  async function runIntro() {
    const text1 = line1.getAttribute('data-text');
    await typewrite(line1, text1, CONFIG.reduceMotion ? 1 : CONFIG.typewriterSpeed);
    await wait(700);
    line2.textContent = line2.getAttribute('data-text');
    line2.classList.add('is-visible');
  }

  let introDone = false;
  runIntro();

  sceneStart.addEventListener('click', () => {
    if (!introDone) return; // ignore clicks until the invitation line has appeared
    introDone = false; // prevent double-trigger
    ensureAudio();
    playAmbientPad();
    soundToggle.hidden = false;
    startJourney();
  }, { once: false });

  // allow click only after line 2 is visible
  const introWatcher = setInterval(() => {
    if (line2.classList.contains('is-visible')) {
      introDone = true;
      clearInterval(introWatcher);
    }
  }, 150);

  /* ---- Scene 2: journey messages ---- */
  const journeyMessageEl = document.getElementById('journey-message');
  const dots = document.querySelectorAll('.journey-progress__dot');

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function startJourney() {
    showScene(sceneJourney);
    mode = 'ambient'; // keep gentle drifting particles, camera-move feel comes from message pacing

    for (let i = 0; i < CONFIG.journeyMessages.length; i++) {
      dots.forEach((d, idx) => d.classList.toggle('is-active', idx === i));
      journeyMessageEl.textContent = CONFIG.journeyMessages[i];
      journeyMessageEl.classList.remove('is-visible');
      // force reflow so the animation restarts each time
      void journeyMessageEl.offsetWidth;
      journeyMessageEl.classList.add('is-visible');
      await wait(CONFIG.journeyMessageDuration);
    }

    startGiftScene();
  }

  /* ---- Scene 3: the gift orb ---- */
  const giftOrb = document.getElementById('gift-orb');
  const giftCaption = document.getElementById('gift-caption');
  let giftOpened = false;

  function startGiftScene() {
    showScene(sceneGift);
    orbitCenter = { x: W / 2, y: H / 2 - 20 };
    mode = 'orbit';
    spawnOrbit(64);

    giftCaption.textContent = 'هديتك بانتظارك...';
    giftCaption.classList.add('is-visible');
    setTimeout(() => {
      giftCaption.textContent = 'اضغط لفتحها.';
      giftCaption.classList.remove('is-visible');
      void giftCaption.offsetWidth;
      giftCaption.classList.add('is-visible');
    }, 2600);
  }

  giftOrb.addEventListener('mouseenter', () => { orbitHoverActive = true; });
  giftOrb.addEventListener('mouseleave', () => { orbitHoverActive = false; });

  function openGift() {
    if (giftOpened) return;
    giftOpened = true;
    beginCelebration();
  }
  giftOrb.addEventListener('click', openGift);
  giftOrb.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGift(); }
  });

  /* ---- Scene 4: explosion, countdown, reveal ---- */
  const countdownEl = document.getElementById('countdown');
  const revealContent = document.getElementById('reveal-content');
  const revealTitle = document.querySelector('.reveal-title');
  const revealLines = document.querySelectorAll('#reveal-lines [data-line]');

  async function beginCelebration() {
    showScene(sceneReveal);
    playCelebrationSwell();

    mode = 'explosion';
    spawnExplosion(W / 2, H / 2, 260);

    document.body.classList.add('is-shaking');
    setTimeout(() => document.body.classList.remove('is-shaking'), 500);

    // a few extra firework bursts around the initial explosion
    fireworksSequence();

    await runCountdown();
    await revealMessage();
  }

  function fireworksSequence() {
    const bursts = [
      { delay: 500,  x: () => rand(W * 0.2, W * 0.4), y: () => rand(H * 0.2, H * 0.45) },
      { delay: 950,  x: () => rand(W * 0.6, W * 0.8), y: () => rand(H * 0.2, H * 0.45) },
      { delay: 1500, x: () => rand(W * 0.35, W * 0.65), y: () => rand(H * 0.15, H * 0.35) },
      { delay: 2200, x: () => rand(W * 0.15, W * 0.85), y: () => rand(H * 0.2, H * 0.5) }
    ];
    bursts.forEach(b => setTimeout(() => spawnFirework(b.x(), b.y()), b.delay));

    // gentle ongoing fireworks that continue softly through the reveal and after
    clearInterval(window.__fireworksInterval);
    window.__fireworksInterval = setInterval(() => {
      if (Math.random() < 0.55) {
        spawnFirework(rand(W * 0.15, W * 0.85), rand(H * 0.15, H * 0.55));
      }
    }, 2600);
  }

  async function runCountdown() {
    const steps = ['3', '2', '1'];
    for (const s of steps) {
      countdownEl.textContent = s;
      countdownEl.style.animation = 'none';
      void countdownEl.offsetWidth;
      countdownEl.style.animation = 'title-in 0.9s cubic-bezier(0.16,1,0.3,1) forwards';
      await wait(950);
    }
    countdownEl.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    countdownEl.style.opacity = '0';
    countdownEl.style.transform = 'scale(1.3)';
    await wait(700);
    countdownEl.style.display = 'none';
    await wait(300); // brief dramatic pause
  }

async function revealMessage() {
    revealContent.classList.add('is-visible');
    revealTitle.classList.add('is-visible');
    await wait(900);

    for (const line of revealLines) {
      line.classList.add('is-visible');
      const extraPause = line.hasAttribute('data-pause') ? 900 : 0;
      await wait(950 + extraPause);
    }

    // let the user gently rotate the ambient field with the mouse afterward
    enableDriftParallax();

    // بعد ما تنتهي الرسالة الأخيرة، انتقل لصفحة المزحة (don.html)
    // REDIRECT_DELAY: كم ميلي ثانية ينتظر قبل الانتقال (3000 = 3 ثواني)
    const REDIRECT_DELAY = 3000;
    const REDIRECT_URL = 'don.html';
    setTimeout(() => {
      window.location.href = REDIRECT_URL;
    }, REDIRECT_DELAY);
  }

  function enableDriftParallax() {
    // Once settled, ease explosion particles back toward a calm ambient field
    setTimeout(() => {
      mode = 'ambient';
      spawnAmbient(70);
    }, 4000);
  }

  /* ---- Sound toggle ---- */
  soundToggle.addEventListener('click', () => setMuted(!musicMuted));

})();
