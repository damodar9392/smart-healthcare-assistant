import { useEffect } from 'react';

const TILT_SELECTORS = [
  '.card',
  '.stat-card',
  '.welcome-hero',
  '.notification-item',
  '.guidance-item',
];

const TILT_EXCLUDE = [
  '.form-card',
  '.review-form',
  '.reschedule-form',
  '.patient-details',
  '.verification-details',
  '.disclaimer-box',
  '.chat-panel',
  '.chat-settings-panel',
  '.suggestions-dropdown',
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const use3DEffects = () => {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const noHover = window.matchMedia('(hover: none)').matches;
    if (reduce || noHover) return undefined;

    let lastEl = null;
    let hoverRect = null;
    let lastX = 0;
    let lastY = 0;
    let frame = 0;
    let rootX = 0;
    let rootY = 0;
    let ax = 0;
    let ay = 0;

    const reset = () => {
      if (lastEl) {
        lastEl.style.transform = '';
        lastEl.style.willChange = '';
        lastEl.style.removeProperty('--glare-x');
        lastEl.style.removeProperty('--glare-y');
      }
      lastEl = null;
      hoverRect = null;
    };

    const tick = () => {
      frame = 0;

      // Root parallax, eased towards the target for a smoother 3D float.
      ax += (rootX - ax) * 0.12;
      ay += (rootY - ay) * 0.12;
      const px = (ax / window.innerWidth - 0.5) * 52;
      const py = (ay / window.innerHeight - 0.5) * 34;
      document.documentElement.style.setProperty('--parallax-x', `${px.toFixed(1)}px`);
      document.documentElement.style.setProperty('--parallax-y', `${py.toFixed(1)}px`);

      if (!lastEl) return;
      if (!hoverRect) hoverRect = lastEl.getBoundingClientRect();
      const nx = clamp((lastX - hoverRect.left) / hoverRect.width, 0, 1);
      const ny = clamp((lastY - hoverRect.top) / hoverRect.height, 0, 1);
      const max = hoverRect.width < 220 ? 10 : 14;
      const rotY = (nx - 0.5) * 2 * max;
      const rotX = (0.5 - ny) * 2 * max * 0.85;
      const lift = hoverRect.width < 220 ? -4 : -6;
      lastEl.style.willChange = 'transform';
      lastEl.style.transform = `perspective(1100px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(
        2
      )}deg) rotateZ(${((nx - 0.5) * 2 * 1.2).toFixed(2)}deg) translate3d(0, ${lift}px, 8px) scale(1.015)`;
      lastEl.style.setProperty('--glare-x', `${(nx * 100).toFixed(2)}%`);
      lastEl.style.setProperty('--glare-y', `${(ny * 100).toFixed(2)}%`);
    };

    const onPointerMove = (e) => {
      rootX = e.clientX;
      rootY = e.clientY;
      const el = e.target.closest(TILT_SELECTORS.join(','));
      const excluded = el && e.target.closest(TILT_EXCLUDE.join(','));
      const target = el && !excluded ? el : null;

      if (target !== lastEl) {
        reset();
        lastEl = target;
        hoverRect = null;
      }
      lastX = e.clientX;
      lastY = e.clientY;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      hoverRect = null;
    };

    const onLeave = () => {
      ax = 0;
      ay = 0;
      reset();
    };

    const onVisibility = () => {
      if (document.hidden) {
        reset();
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('blur', onLeave);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('blur', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      if (frame) cancelAnimationFrame(frame);
      reset();
      document.documentElement.style.removeProperty('--parallax-x');
      document.documentElement.style.removeProperty('--parallax-y');
    };
  }, []);
};

export default use3DEffects;