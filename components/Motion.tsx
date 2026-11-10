'use client';
import { useEffect, useRef, type CSSProperties } from 'react';

/**
 * Motion layer for Business Aid.
 *
 * Authoring API (all optional, progressive enhancement):
 *   data-reveal="up|fade|left|right|scale"  fade/slide an element in once, when it scrolls into view
 *   data-reveal="group"                     stagger the direct children of the element
 *   data-glow                               soft pointer-following spotlight on cards (fine pointers only)
 *   .btn                                    gets a gentle magnetic pull toward the pointer (fine pointers only)
 *
 * Everything is gated by `html.js` (set in layout.tsx before first paint), so the
 * page is fully visible without JavaScript, and by `prefers-reduced-motion`.
 */

type Variant = 'up' | 'fade' | 'left' | 'right' | 'scale';

/** Spread onto any element to reveal it on scroll: <div {...rv(120, 'left')} /> */
export function rv(delay = 0, variant: Variant = 'up') {
  return { 'data-reveal': variant, style: { '--rd': `${delay}ms` } as CSSProperties };
}

export function MotionRoot() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const cleanups: Array<() => void> = [];

    /* ---------- scroll reveal + pause off-screen SVG loops ---------- */
    const revealIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          revealIO.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );

    const pauseIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          (entry.target as HTMLElement).dataset.offscreen = String(!entry.isIntersecting);
        }
      },
      { rootMargin: '120px' },
    );

    const watch = (node: Element) => {
      if (node.matches('[data-reveal]:not(.is-in)')) {
        if (reduce) node.classList.add('is-in');
        else revealIO.observe(node);
      }
      if (node.matches('.hero-art, .scene')) pauseIO.observe(node);
    };
    const scan = (scope: ParentNode) => {
      if (scope instanceof Element) watch(scope);
      scope.querySelectorAll('[data-reveal]:not(.is-in), .hero-art, .scene').forEach(watch);
    };

    // Elements that mount later (client filter results, mobile accordion, service detail swaps).
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => { if (node instanceof Element) scan(node); });
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    scan(document);
    cleanups.push(() => { revealIO.disconnect(); pauseIO.disconnect(); mutations.disconnect(); });

    /* ---------- scroll progress + hero parallax (one rAF-throttled listener) ---------- */
    const hero = document.getElementById('top');
    let maxScroll = 1;
    let queued = false;
    const measure = () => { maxScroll = Math.max(1, root.scrollHeight - window.innerHeight); };
    const paint = () => {
      queued = false;
      const y = window.scrollY;
      barRef.current?.style.setProperty('--p', Math.min(1, Math.max(0, y / maxScroll)).toFixed(4));
      if (hero && !reduce) {
        hero.style.setProperty('--hero-p', Math.min(1, Math.max(0, y / (window.innerHeight * 0.9))).toFixed(3));
      }
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(paint); } };
    const onResize = () => { measure(); onScroll(); };
    measure();
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const sizeObserver = new ResizeObserver(onResize);
    sizeObserver.observe(document.body);
    cleanups.push(() => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      sizeObserver.disconnect();
    });

    /* ---------- pointer spotlight + magnetic buttons (mouse / trackpad only) ---------- */
    if (finePointer && !reduce) {
      let frame = 0;
      let last: PointerEvent | null = null;
      let magnet: HTMLElement | null = null;

      const release = () => {
        if (!magnet) return;
        magnet.style.removeProperty('--tx');
        magnet.style.removeProperty('--ty');
        magnet = null;
      };

      const handle = (event: PointerEvent) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const glow = target.closest<HTMLElement>('[data-glow]');
        if (glow) {
          const box = glow.getBoundingClientRect();
          glow.style.setProperty('--mx', `${(event.clientX - box.left).toFixed(0)}px`);
          glow.style.setProperty('--my', `${(event.clientY - box.top).toFixed(0)}px`);
        }

        const button = target.closest<HTMLElement>('.btn:not(:disabled)');
        if (magnet && magnet !== button) release();
        if (button) {
          const box = button.getBoundingClientRect();
          const dx = (event.clientX - (box.left + box.width / 2)) / box.width;
          const dy = (event.clientY - (box.top + box.height / 2)) / box.height;
          button.style.setProperty('--tx', `${(dx * 9).toFixed(1)}px`);
          button.style.setProperty('--ty', `${(dy * 7).toFixed(1)}px`);
          magnet = button;
        }
      };

      const onMove = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') return;
        last = event;
        if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (last) handle(last); });
      };

      document.addEventListener('pointermove', onMove, { passive: true });
      root.addEventListener('mouseleave', release);
      window.addEventListener('blur', release);
      cleanups.push(() => {
        document.removeEventListener('pointermove', onMove);
        root.removeEventListener('mouseleave', release);
        window.removeEventListener('blur', release);
        if (frame) cancelAnimationFrame(frame);
        release();
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return <div ref={barRef} className="scroll-progress" aria-hidden="true" />;
}
