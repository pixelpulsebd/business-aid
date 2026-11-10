'use client';
import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { CLIENTS, CONTACT, SERVICES, WORK_TAGS, type Cat } from '@/lib/data';
import { submitForm } from '@/lib/formdata';
import { rv } from './Motion';
import { Globe, HeroScene, Ring14, SCENES, v } from './Scenes';

/* ---------- hooks ---------- */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

function useCount(to: number, run: boolean, ms = 1600, from = 0) {
  const [n, setN] = useState(from);
  useEffect(() => {
    if (!run) return;
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / ms, 1);
      setN(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to, ms, from]);
  return Math.round(n);
}

/* ---------- TagInput (multi-select chips with suggestions) ---------- */
export function TagInput({ options, value, onChange, placeholder, label, inputName, inputInvalid, inputDescribedBy }: { options: string[]; value: string[]; onChange: (v: string[]) => void; placeholder?: string; label: string; inputName?: string; inputInvalid?: boolean; inputDescribedBy?: string }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const id = useId();
  const list = options.filter((o) => !value.includes(o) && o.toLowerCase().includes(q.toLowerCase()));
  const add = (t: string) => { onChange([...value, t]); setQ(''); setHi(0); };
  return (
    <div className="tagin" onFocus={() => setOpen(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <div className="tagbox">
        {value.map((t) => (
          <span className="chip on pop-in" key={t}>{t}<button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>×</button></span>
        ))}
        <input
          aria-label={label} name={inputName} aria-invalid={inputInvalid} aria-describedby={inputDescribedBy}
          role="combobox" aria-expanded={open} aria-controls={id} aria-autocomplete="list"
          value={q} placeholder={value.length ? '' : placeholder}
          onChange={(e) => { setQ(e.target.value); setHi(0); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); if (list[hi]) add(list[hi]); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, list.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === 'Backspace' && !q && value.length) onChange(value.slice(0, -1));
          }}
        />
      </div>
      {open && list.length > 0 && (
        <ul className="sug" id={id} role="listbox">
          {list.map((o, i) => (
            <li key={o} role="option" aria-selected={i === hi}>
              <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => add(o)}>{o}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Nav / footer / WhatsApp ---------- */
const BUSINESS_AID_LOGO = '/business-aid-mark.png';

const Logo = ({ footer = false }: { footer?: boolean }) => (
  <a href="#top" className={`logo brand-lockup${footer ? ' brand-lockup-footer' : ''}`} aria-label="Business Aid home">
    <img className="brand-logo" src={BUSINESS_AID_LOGO} alt="" aria-hidden="true" />
    <span className="brand-copy">
      <span className="brand-title">business <b>aid</b></span>
    </span>
  </a>
);


const NAV_ITEMS = [
  { id: 'top', label: 'Home', href: '#top' },
  { id: 'services', label: 'Services', href: '#services' },
  { id: 'ezsell', label: 'EZsell', href: '#ezsell' },
  { id: 'work', label: 'Our Work', href: '#work' },
  { id: 'contact', label: 'Contact', href: '#contact' },
] as const;

/**
 * Navigate to the visible content of a section, not just its outer section box.
 * Sections intentionally have large decorative top padding; native hash jumps
 * align the outer box and make that padding look like an excessive header gap.
 */
function scrollToSectionContent(id: string, header: HTMLElement | null, updateHistory = true, forceAuto = false) {
  const section = document.getElementById(id);
  if (!section) return;

  if (updateHistory && window.location.hash !== `#${id}`) {
    window.history.pushState(null, '', `#${id}`);
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior: ScrollBehavior = forceAuto || reduceMotion ? 'auto' : 'smooth';
  if (id === 'top') {
    window.scrollTo({ top: 0, behavior });
    return;
  }

  // All navigated content sections start with a .wrap whose first child is
  // the section's intro/layout. Align that content just below the compact bar.
  const content = section.querySelector<HTMLElement>(':scope > .wrap > *') ?? section;
  const contentTop = window.scrollY + content.getBoundingClientRect().top;
  const headerHeight = header?.getBoundingClientRect().height ?? 62;
  const breathingRoom = window.matchMedia('(max-width: 860px)').matches ? 10 : 14;
  const destination = Math.max(0, contentTop - headerHeight - breathingRoom);

  window.scrollTo({ top: destination, behavior });
}

export function Nav() {
  const [activeSection, setActiveSection] = useState<string>('top');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [scrolled, setScrolled] = useState(false);
  const [pill, setPill] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuPanelRef = useRef<HTMLElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  // Read the already-resolved system/stored theme after hydration. If the user
  // has not selected a preference, keep following OS appearance changes.
  useEffect(() => {
    const root = document.documentElement;
    const readTheme = (): 'light' | 'dark' => root.dataset.theme === 'dark' ? 'dark' : 'light';
    setTheme(readTheme());

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const followSystemTheme = (event: MediaQueryListEvent) => {
      let savedPreference: string | null = null;
      try { savedPreference = window.localStorage.getItem('business-aid-theme'); } catch (_) { /* storage may be disabled */ }
      if (savedPreference === 'dark' || savedPreference === 'light') return;
      const nextTheme = event.matches ? 'dark' : 'light';
      root.dataset.theme = nextTheme;
      setTheme(nextTheme);
    };

    media.addEventListener?.('change', followSystemTheme);
    return () => media.removeEventListener?.('change', followSystemTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.add('theme-anim');
    window.setTimeout(() => root.classList.remove('theme-anim'), 500);
    root.dataset.theme = nextTheme;
    try { window.localStorage.setItem('business-aid-theme', nextTheme); } catch (_) { /* theme still works for this page view */ }
    setTheme(nextTheme);
  };

  useEffect(() => {
    if (!isMenuOpen || !window.matchMedia('(max-width: 860px)').matches) {
      if (menuPanelRef.current?.contains(document.activeElement)) menuToggleRef.current?.focus();
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => {
      menuPanelRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
    });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMenuOpen(false);
      }
    };
    const closeOnResize = () => {
      if (!window.matchMedia('(max-width: 860px)').matches) setIsMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeOnResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeOnResize);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const navigateHashLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const origin = event.target;
      if (!(origin instanceof Element)) return;
      const anchor = origin.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const id = anchor.getAttribute('href')?.slice(1);
      if (!id || !NAV_ITEMS.some((item) => item.id === id)) return;

      event.preventDefault();
      setIsMenuOpen(false);
      scrollToSectionContent(id, navRef.current);
    };

    const alignCurrentHash = () => {
      const id = window.location.hash.slice(1);
      if (!NAV_ITEMS.some((item) => item.id === id)) return;
      // Let the browser finish its native initial/history jump, then correct it
      // to the same measured landing point used for clicks.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => scrollToSectionContent(id, navRef.current, false, true));
      });
    };

    document.addEventListener('click', navigateHashLink);
    window.addEventListener('hashchange', alignCurrentHash);
    window.addEventListener('popstate', alignCurrentHash);
    if (window.location.hash) alignCurrentHash();

    return () => {
      document.removeEventListener('click', navigateHashLink);
      window.removeEventListener('hashchange', alignCurrentHash);
      window.removeEventListener('popstate', alignCurrentHash);
    };
  }, []);

  // Glass header once the page has moved.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Measure the active link so a single pill can glide between sections (desktop only; hidden by CSS on mobile).
  useEffect(() => {
    const panel = menuPanelRef.current;
    if (!panel) return;
    const measure = () => {
      const el = panel.querySelector<HTMLElement>('.nav-link.is-active');
      if (!el || panel.offsetParent === null) return;
      const next = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
      setPill((prev) => (prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [activeSection]);

  useEffect(() => {
    const sectionIds = NAV_ITEMS.map((item) => item.id);
    const updateActiveSection = () => {
      // The fixed glass header is taken into account when selecting the current section.
      const readingLine = window.scrollY + Math.min(150, window.innerHeight * 0.24);
      let next = 'top';
      for (const id of sectionIds) {
        const section = document.getElementById(id);
        if (section && section.offsetTop <= readingLine) next = id;
      }
      setActiveSection((current) => current === next ? current : next);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, []);

  return (
    <header
      ref={navRef}
      className={`nav${isMenuOpen ? ' is-menu-open' : ''}${scrolled ? ' is-scrolled' : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setIsMenuOpen(false);
        if (event.key !== 'Tab' || !isMenuOpen || !window.matchMedia('(max-width: 860px)').matches) return;
        const links = menuPanelRef.current?.querySelectorAll<HTMLElement>('a[href]');
        const first = links?.[0];
        const last = links?.[links.length - 1];
        const toggle = menuToggleRef.current;
        if (!first || !last || !toggle) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          toggle.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          toggle.focus();
        } else if (event.shiftKey && document.activeElement === toggle) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === toggle) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <button
        type="button"
        className="mobile-drawer-backdrop"
        aria-label="Close navigation menu"
        tabIndex={isMenuOpen ? 0 : -1}
        onClick={() => setIsMenuOpen(false)}
      />
      <div className="wrap nav-in">
        <Logo />
        <nav ref={menuPanelRef} aria-label="Primary navigation" className="links" id="primary-navigation">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={`nav-link${activeSection === item.id ? ' is-active' : ''}`}
              aria-current={activeSection === item.id ? 'location' : undefined}
              onClick={() => setIsMenuOpen(false)}
            >
              <span>{item.label}</span>
            </a>
          ))}
          {pill && (
            <span
              className="nav-indicator"
              aria-hidden="true"
              style={{ '--x': `${pill.x}px`, '--y': `${pill.y}px`, '--w': `${pill.w}px`, '--h': `${pill.h}px` } as CSSProperties}
            />
          )}
        </nav>
        <div className="nav-actions" role="group" aria-label="Display and navigation controls">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? (
              <svg key="sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
            ) : (
              <svg key="moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.8 15.4A8.5 8.5 0 0 1 8.6 3.2 8.7 8.7 0 1 0 20.8 15.4Z" /></svg>
            )}
          </button>
          <button
            type="button"
            ref={menuToggleRef}
            className={`mobile-menu-toggle${isMenuOpen ? ' is-open' : ''}`}
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-in" {...rv(0, 'fade')}>
        <div className="foot-brand"><Logo footer /></div>
        <address>{CONTACT.address}<br /><a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`}>{CONTACT.phone}</a> · <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></address>
        <p className="foot-links"><a href="#">Privacy Policy</a> · <a href="#">Terms of Service</a> · <a href="https://ezsell.xyz/">EZsell</a></p>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} Business Aid. All rights reserved.</span>
          <span>Where business gets better.</span>
        </div>
      </div>
    </footer>
  );
}

export function WhatsApp() {
  return (
    <a className="wa" href={`https://wa.me/${CONTACT.wa}`} aria-label="Chat on WhatsApp">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="#fff" aria-hidden><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" /></svg>
    </a>
  );
}

/* ---------- Hero ---------- */
export function Hero() {
  const [ref, seen] = useInView<HTMLDivElement>();
  const n = useCount(8, seen, 1600, 1);
  return (
    <section id="top" className="hero">
      <div className="wrap hero-in" ref={ref}>
        <div className="hero-l">
          <h1 className="tag">
            {'Where business gets better'.split(' ').map((word, i) => (
              <span key={i}>
                <span className="w-mask"><span className="w-in" style={{ '--wi': i } as CSSProperties}>{word}</span></span>{' '}
              </span>
            ))}
          </h1>
          <p className="hero-description">Business growth, digital marketing, and essential tax and company-compliance support for e-commerce brands and entrepreneurs.</p>
          <div className="big" aria-label="Eight times sales growth in five months">
            <span className="n">{n}</span><span className="x an pulse">×</span>
          </div>
          <div className="months" aria-hidden>{[0, 1, 2, 3, 4].map((i) => <i key={i} className="an dotfill" style={v(i)} />)}</div>
          <p className="cap">jbhalalfood.com, 5 months</p>
          <div className="cta"><a className="btn sm" href="#contact">Book a consultation</a><a className="btn ghost sm" href="#services">Explore our services</a></div>
        </div>
        <HeroScene />
      </div>
    </section>
  );
}

/* ---------- Services: service details on the left, service navigation on the right ---------- */
const SERVICE_DESCRIPTIONS: Record<string, string> = {
  seo: 'Help customers find your products in Google and other search engines, while making your brand easier for AI answer tools to understand and recommend.',
  content: 'Create clear, engaging product and social media content that explains your offer, builds customer confidence, and supports more informed buying decisions.',
  media: 'Plan and manage paid campaigns across platforms such as Facebook, Instagram, and Google, with clear goals and performance tracking.',
  strategy: 'Turn your business goals into a practical plan for positioning, customer acquisition, sales improvement, and sustainable growth.',
  tax: 'Get guidance on income tax return filing, tax planning, TIN-related matters, and preparing responses to tax notices.',
  rjsc: 'Get help understanding company or partnership formation, required documents, RJSC filings, and ongoing company record and compliance requirements.',
  audit: 'Organise records and supporting documents for audit requirements, and coordinate with the relevant accounting or audit professionals.',
};

export function Services() {
  const [cat, setCat] = useState<Cat>('growth');
  const [slug, setSlug] = useState('seo');
  // Mobile accordion state is separate so closing a mobile card never changes the desktop detail panel.
  const [mobileOpenSlug, setMobileOpenSlug] = useState<string | null>('seo');
  const list = SERVICES.filter((service) => service.cat === cat);
  const active = list.find((service) => service.slug === slug) ?? list[0];
  const Scene = SCENES[active.slug];
  const pick = (category: Cat) => {
    const firstService = SERVICES.find((service) => service.cat === category)!;
    setCat(category);
    setSlug(firstService.slug);
    setMobileOpenSlug(firstService.slug);
  };

  return (
    <section id="services" className="sec services-section">
      <div className="wrap">
        <div className="section-intro" data-reveal="group">
          <p className="eyebrow">Our services</p>
          <h2 className="section-title">Growth and compliance, under one roof.</h2>
          <p className="section-copy">From attracting online customers to managing tax and company filings, choose practical support that matches your business needs.</p>
        </div>

        <div className="svc service-explorer" {...rv(80)}>
          <aside className="service-navigation" aria-label="Choose a service">
            <p className="nav-label">Choose a service area</p>
            <div className="category-options" role="tablist" aria-label="Service areas">
              {(['growth', 'legal'] as Cat[]).map((category) => (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={cat === category}
                  className={`category-option ${category}`}
                  onClick={() => pick(category)}
                >
                  <span className="category-title">{category === 'growth' ? 'E-commerce' : 'Legal Aid'}</span>
                  <span className="category-subtitle">{category === 'growth' ? 'Growth & marketing' : 'Tax & company compliance'}</span>
                </button>
              ))}
            </div>

            <div className="submenu" role="tablist" aria-label={`${cat === 'growth' ? 'E-commerce' : 'Legal Aid'} services`}>
              <p className="submenu-heading">{cat === 'growth' ? 'Growth services' : 'Legal aid services'}</p>
              {list.map((service) => (
                <button
                  key={service.slug}
                  type="button"
                  role="tab"
                  aria-selected={service.slug === active.slug}
                  className="row"
                  onClick={() => setSlug(service.slug)}
                >
                  <i className={cat} aria-hidden="true" />
                  <span>{service.name}</span>
                  <span className="row-arrow" aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="detail" key={active.slug} data-glow>
            <div className="scene-wrap pop-in">{Scene()}</div>
            <div className="service-copy">
              <p className="service-kicker">{cat === 'growth' ? 'E-commerce growth & marketing' : 'Legal aid & compliance'}</p>
              <h3>{active.name}</h3>
              <p className="service-description">{SERVICE_DESCRIPTIONS[active.slug]}</p>
              <h4>How we can help</h4>
              <ul className="chips">{active.items.map((item) => <li className="chip" key={item}>{item}</li>)}</ul>
              <a className="btn" href="#contact" onClick={() => window.dispatchEvent(new CustomEvent('ba:service', { detail: active.name }))}>Discuss this service</a>
            </div>
          </div>
        </div>


        {/* Mobile-only service explorer: selected service details expand inside the chosen service group. */}
        <div className="service-explorer-mobile" {...rv(60)}>
          <div className="mobile-service-area-select">
            <p className="nav-label">Choose a section area</p>
            <div className="category-options" role="tablist" aria-label="Service areas">
              {(['growth', 'legal'] as Cat[]).map((category) => (
                <button
                  key={category}
                  id={`mobile-service-area-${category}`}
                  type="button"
                  role="tab"
                  aria-selected={cat === category}
                  aria-controls="mobile-service-area-panel"
                  className={`category-option ${category}`}
                  onClick={() => pick(category)}
                >
                  <span className="category-title">{category === 'growth' ? 'E-commerce' : 'Legal Aid'}</span>
                  <span className="category-subtitle">{category === 'growth' ? 'Growth & marketing' : 'Tax & company compliance'}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mobile-service-area-panel" id="mobile-service-area-panel" role="tabpanel" aria-labelledby={`mobile-service-area-${cat}`}>
            <div className="mobile-services-container">
              <p className="submenu-heading">{cat === 'growth' ? 'Growth services' : 'Legal aid services'}</p>
              <div className="mobile-service-list">
                {list.map((service) => {
                  const isOpen = service.slug === mobileOpenSlug;
                  const cardId = `mobile-service-card-${service.slug}`;
                  return (
                    <div className={`mobile-service-entry${isOpen ? ' is-active' : ''}`} key={service.slug}>
                      <button
                        id={`mobile-service-option-${service.slug}`}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={isOpen ? cardId : undefined}
                        className="mobile-service-row"
                        onClick={() => {
                          if (mobileOpenSlug === service.slug) {
                            setMobileOpenSlug(null);
                          } else {
                            setSlug(service.slug);
                            setMobileOpenSlug(service.slug);
                          }
                        }}
                      >
                        <i className={cat} aria-hidden="true" />
                        <span>{service.name}</span>
                        <span className="row-arrow" aria-hidden="true">
                          <svg viewBox="0 0 20 20" fill="none" focusable="false">
                            <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </button>

                      {isOpen && (
                        <article className="detail mobile-service-detail pop-in" id={cardId} aria-labelledby={`mobile-service-option-${service.slug}`}>
                          <div className="mobile-service-visual">
                            <div className="scene-wrap">{Scene()}</div>
                          </div>
                          <div className="service-copy">
                            <p className="service-kicker">{cat === 'growth' ? 'E-commerce growth & marketing' : 'Legal aid & compliance'}</p>
                            <h3>{active.name}</h3>
                            <p className="service-description">{SERVICE_DESCRIPTIONS[active.slug]}</p>
                            <h4>How we can help</h4>
                            <ul className="chips">{active.items.map((item) => <li className="chip" key={item}>{item}</li>)}</ul>
                            <a className="btn" href="#contact" onClick={() => window.dispatchEvent(new CustomEvent('ba:service', { detail: active.name }))}>Discuss this service</a>
                          </div>
                        </article>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Selected work: high-resolution brand marks and clear service references ---------- */
const BRAND_LABELS: Record<string, string> = {
  'jbhalalfood.com': 'JB HALAL FOOD',
  'gulfgainsborough.co.uk': 'GULF GAINSBOROUGH',
  'thefishbazar.com': 'THE FISH BAZAR',
  'farmzila.com.bd': 'FARMZILA',
  'smartmeals.online': 'SMART MEALS',
  'japangoodsbd.com': 'JAPAN GOODS',
  'mrsolutionbd.com': 'MR SOLUTION',
  'rongdhonubd.com': 'RONGDHONU',
  'facebook.com/shop.radience': 'RADIENCE',
  'unicornbd.com': 'UNICORN BD',
  'ariosebd.com': 'ARIOSE',
  'koyabazar.com': 'KOYA BAZAR',
};

function brandLabel(client: (typeof CLIENTS)[number]) {
  return BRAND_LABELS[client.name] ?? client.name;
}

function workTagLabel(tag: string) {
  const labels: Record<string, string> = {
    'Content creation': 'Content',
    'Legal / tech support': 'Legal / tech',
    'Web / digital presence': 'Web / digital',
  };
  return labels[tag] ?? tag;
}

function PartnerLogo({ client, compact = false }: { client: (typeof CLIENTS)[number]; compact?: boolean }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const origin = new URL(client.href).origin;
  const iconSources = [
    client.logoPath,
    client.logoUrl,
    `${origin}/apple-touch-icon.png`,
    `${origin}/favicon.ico`,
    `https://www.google.com/s2/favicons?domain=${client.logoDomain}&sz=512`,
  ].filter((src): src is string => Boolean(src));
  const source = iconSources[sourceIndex];

  return (
    <div className={`partner-logo-surface${compact ? ' compact' : ''}`} role="img" aria-label={`${brandLabel(client)} logo`}>
      {source ? (
        <img
          key={source}
          className="partner-logo-image"
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setSourceIndex((index) => Math.min(index + 1, iconSources.length))}
        />
      ) : (
        <span className="partner-logo-fallback" aria-hidden="true">{compact ? brandLabel(client).split(/\s+/).map((part) => part[0]).join('').slice(0, 3) : brandLabel(client)}</span>
      )}
    </div>
  );
}

function WorkMarqueeItem({ client, duplicate = false }: { client: (typeof CLIENTS)[number]; duplicate?: boolean }) {
  return (
    <a
      className="work-marquee-item"
      href={client.href}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={duplicate ? -1 : undefined}
      aria-label={duplicate ? undefined : `Visit ${brandLabel(client)}`}
    >
      <span className="work-marquee-logo"><PartnerLogo client={client} compact /></span>
      <span className="work-marquee-name">{brandLabel(client)}</span>
    </a>
  );
}

export function Work() {
  const [tags, setTags] = useState<string[]>([]);
  const shown = CLIENTS.filter((client) => !tags.length || tags.some((tag) => client.tags.includes(tag)));
  return (
    <section id="work" className="sec tint work-section">
      <div className="wrap">
        <div className="section-intro" data-reveal="group">
          <p className="eyebrow">Selected work</p>
          <h2 className="section-title">Client work across industries.</h2>
          <p className="section-copy">Explore client businesses across e-commerce, food delivery, retail, home services, and international markets, alongside the services Business Aid has provided.</p>
        </div>
        <div className="work-filter-row" {...rv(0)}>
          <p>Explore by service</p>
          <TagInput label="Filter work by service" options={WORK_TAGS} value={tags} onChange={setTags} placeholder="Choose a service to filter" />
        </div>
        <div className="client-grid">
          {shown.map((client, index) => (
            <article
              key={client.name}
              className={`client-card ${client.result ? 'client-featured' : ''}`}
              data-glow
              {...rv(Math.min((index % 2) * 90 + (Math.floor(index / 2) % 3) * 40, 260))}
            >
              <a className="client-logo-link" href={client.href} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${client.name}`}>
                <PartnerLogo client={client} />
              </a>
              <div className="client-details">
                <div className="client-site-row">
                  <a className="client-site" href={client.href} target="_blank" rel="noopener noreferrer" aria-label={`Website: ${client.name}`}>
                    {client.name}
                  </a>
                  {client.result && <span className="client-result">{client.result}</span>}
                </div>
                <p className="client-business-type">{client.businessType}</p>
                <div className="client-services" aria-label={`Services provided: ${client.tags.join(', ')}`}>
                  {client.tags.map((tag) => <span className="client-service-pill" key={tag}>{workTagLabel(tag)}</span>)}
                </div>
              </div>
            </article>
          ))}
        </div>
        {shown.length === 0 && <p className="empty-work">No client examples match that service. Remove a filter to see more work.</p>}
        <p className="work-note">Client names and logos identify the referenced businesses. Services listed reflect the current project framework; publish client work and performance claims only with appropriate approval.</p>

        <div className="work-marquee" aria-label="Client and partner businesses" {...rv(0, 'fade')}>
          <p className="work-marquee-kicker">Businesses across our client portfolio</p>
          <div className="work-marquee-window">
            <div className="work-marquee-track">
              <div className="work-marquee-group">
                {CLIENTS.map((client) => <WorkMarqueeItem key={`marquee-${client.name}`} client={client} />)}
              </div>
              <div className="work-marquee-group" aria-hidden="true">
                {CLIENTS.map((client) => <WorkMarqueeItem key={`marquee-copy-${client.name}`} client={client} duplicate />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Why ---------- */
export function Why() {
  const [ref, seen] = useInView<HTMLDivElement>();
  const n = useCount(14, seen, 1800);
  return (
    <section className="sec dark">
      <div className="wrap why" ref={ref}>
        <div className="ring-wrap" role="img" aria-label="Fourteen years of experience">
          <Ring14 /><span className="ring-n">{n}</span>
        </div>
        <Globe />
      </div>
    </section>
  );
}

/* ---------- EZsell: embedded website on the left, product details on the right ---------- */
export function EZsell() {
  return (
    <section id="ezsell" className="sec ez-section">
      <div className="wrap">
        <div className="ez-layout">
          <div className="ez-preview" {...rv(0, 'left')}>
            <div className="iframe-bar"><span className="browser-dots"><i/><i/><i/></span><span>ezsell.xyz</span><a href="https://ezsell.xyz/" target="_blank" rel="noopener noreferrer">Open full site</a></div>
            <iframe title="EZsell full website preview" src="https://ezsell.xyz/" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
            <p className="iframe-note">Scroll inside the preview to explore EZsell. If the site blocks embedding, open it in a new tab.</p>
          </div>

          <div className="ez-copy" data-reveal="group" style={{ '--rd': '120ms' } as CSSProperties}>
            <span className="eyebrow">Our product</span>
            <h2 className="section-title">Meet EZsell.</h2>
            <p className="section-copy">A selling platform for e-commerce and Facebook-based businesses, with AI-assisted customer conversations.</p>
            <div className="ez-benefits">
              <h3>Made for online sellers</h3>
              <ul>
                <li><span aria-hidden="true">✓</span><span><b>Support customer conversations</b><small>Introduce an AI sales agent into the selling experience.</small></span></li>
                <li><span aria-hidden="true">✓</span><span><b>Built around online selling</b><small>Explore a product designed for e-commerce and F-commerce workflows.</small></span></li>
                <li><span aria-hidden="true">✓</span><span><b>Explore before you decide</b><small>Browse the live website here or open it in a separate tab.</small></span></li>
              </ul>
            </div>
            <div className="cta ez-links">
              <a className="btn" href="https://ezsell.xyz/" target="_blank" rel="noopener noreferrer">Visit EZsell</a>
              <a className="btn ghost" href="https://facebook.com/EzSellAI" target="_blank" rel="noopener noreferrer">Follow on Facebook</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Contact ---------- */
type ContactField = 'name' | 'phone' | 'services' | 'message';
type ContactErrors = Partial<Record<ContactField, string>>;
type ContactValues = { name: string; phone: string; services: string[]; message: string };

function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  const name = values.name.trim();
  const phone = values.phone;
  const message = values.message.trim();

  if (!name) errors.name = 'Please enter your name.';
  else if (name.length > 120) errors.name = 'Name must be 120 characters or fewer.';

  if (!phone) errors.phone = 'Please enter your phone number.';
  else if (!/^\d+$/.test(phone)) errors.phone = 'Use digits only; do not include spaces, +, or other characters.';
  else if (!phone.startsWith('0')) errors.phone = 'Phone number must start with 0.';
  else if (phone.length !== 11) errors.phone = 'Phone number must be exactly 11 digits.';

  if (values.services.length === 0) errors.services = 'Please choose at least one service.';

  if (!message) errors.message = 'Please tell us how we can help.';
  else if (message.length > 3000) errors.message = 'Message must be 3,000 characters or fewer.';

  return errors;
}

export function Contact() {
  const [services, setServices] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ContactErrors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const service = (e as CustomEvent<string>).detail;
      if (typeof service !== 'string' || !service.trim()) return;
      const next = services.includes(service) ? services : [...services, service];
      setServices(next);
      if (hasAttemptedSubmit || fieldErrors.services) {
        setFieldErrors((current) => {
          const updated = { ...current };
          const error = validateContact({ name, phone, services: next, message: msg }).services;
          if (error) updated.services = error;
          else delete updated.services;
          return updated;
        });
      }
    };
    window.addEventListener('ba:service', on);
    return () => window.removeEventListener('ba:service', on);
  }, [hasAttemptedSubmit, fieldErrors.services, name, phone, msg, services]);

  const enquiry: ContactValues = { name, phone, services, message: msg };

  const setFieldError = (field: ContactField, error?: string) => {
    setFieldErrors((current) => {
      const updated = { ...current };
      if (error) updated[field] = error;
      else delete updated[field];
      return updated;
    });
  };

  const validateOne = (field: ContactField, values: ContactValues = enquiry) => {
    setFieldError(field, validateContact(values)[field]);
  };

  const validateBeforeAction = () => {
    const errors = validateContact(enquiry);
    setHasAttemptedSubmit(true);
    setFieldErrors(errors);
    const firstInvalid = (Object.keys(errors) as ContactField[])[0];
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus(null);
    if (!validateBeforeAction()) return;

    setSubmitting(true);
    try {
      const result = await submitForm({ ...enquiry, name: name.trim(), phone: phone.trim(), message: msg.trim() });
      setStatus({ type: 'success', message: result.message || 'Thank you. Your enquiry has been sent successfully.' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'We could not send your enquiry. Please try again or use WhatsApp.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const sendEnquiryOnWhatsApp = async () => {
    setStatus(null);
    if (!validateBeforeAction()) return;

    // Open the tab synchronously to avoid popup blockers while the server checks
    // and records the attempt against the same 3-in-24-hour limit as form submits.
    const whatsappWindow = window.open('about:blank', '_blank');
    if (!whatsappWindow) {
      setStatus({ type: 'error', message: 'Please allow pop-ups for this site to prepare your WhatsApp enquiry. Your enquiry has not been counted.' });
      return;
    }
    whatsappWindow.opener = null;
    setSubmitting(true);

    try {
      await submitForm({
        ...enquiry,
        name: name.trim(),
        phone: phone.trim(),
        message: msg.trim(),
        channel: 'whatsapp',
      });
      const text = `Hello Business Aid, I'm ${name.trim()} (${phone.trim()}). Interested in: ${services.join(', ')}. ${msg.trim()}`;
      whatsappWindow.location.replace(`https://wa.me/${CONTACT.wa}?text=${encodeURIComponent(text)}`);
      setStatus({ type: 'info', message: 'Your WhatsApp draft is ready. It counts toward your limit of 3 enquiries per phone number in 24 hours. Review it in WhatsApp and press Send.' });
    } catch (error) {
      whatsappWindow.close();
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'We could not prepare your WhatsApp enquiry. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="sec tint contact-section">
      <div className="wrap">
        <div className="section-intro contact-intro" data-reveal="group">
          <p className="eyebrow">Contact us</p>
          <h2 className="section-title">Let’s talk about your business.</h2>
          <p className="section-copy">Tell us what you want to improve or where you need compliance support, and we’ll help you identify the right next step.</p>
        </div>
        <div className="contact">
          <div className="info" data-reveal="group">
            <a className="big-link" href={`tel:${CONTACT.phone.replace(/\s/g, '')}`}>{CONTACT.phone}</a>
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            <address>{CONTACT.address}</address>
            <p className="contact-helper">Prefer a quick conversation? Contact us by phone or WhatsApp.</p>
            <a className="btn ghost contact-whatsapp" href={`https://wa.me/${CONTACT.wa}`} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
          </div>
          <form ref={formRef} className="form" onSubmit={handleSubmit} noValidate {...rv(140, 'scale')}>
            <label htmlFor="contact-name">Name
              <input id="contact-name" name="name" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
                maxLength={120} value={name} onChange={(e) => { const value = e.target.value; setName(value); if (hasAttemptedSubmit || fieldErrors.name) validateOne('name', { ...enquiry, name: value }); }}
                onBlur={() => validateOne('name')} autoComplete="name" />
              {fieldErrors.name && <span className="field-error" id="contact-name-error" role="alert">{fieldErrors.name}</span>}
            </label>
            <label htmlFor="contact-phone">Phone or WhatsApp
              <input id="contact-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'contact-phone-error' : undefined}
                value={phone} onChange={(e) => { const value = e.target.value; setPhone(value); if (hasAttemptedSubmit || fieldErrors.phone) validateOne('phone', { ...enquiry, phone: value }); }}
                onBlur={() => validateOne('phone')} />
              {fieldErrors.phone && <span className="field-error" id="contact-phone-error" role="alert">{fieldErrors.phone}</span>}
            </label>
            <div className="fld" aria-describedby={fieldErrors.services ? 'contact-services-error' : undefined}>
              <span>What do you need help with?</span>
              <TagInput label="Services you need" inputName="services" inputInvalid={Boolean(fieldErrors.services)} inputDescribedBy={fieldErrors.services ? 'contact-services-error' : undefined}
                options={[...SERVICES.map((service) => service.name), 'EZsell', 'General enquiry']} value={services}
                onChange={(value) => { setServices(value); if (hasAttemptedSubmit || fieldErrors.services) validateOne('services', { ...enquiry, services: value }); }} placeholder="Choose one or more services" />
              {fieldErrors.services && <p className="field-error" id="contact-services-error" role="alert">{fieldErrors.services}</p>}
            </div>
            <label htmlFor="contact-message">How can we help?
              <textarea id="contact-message" name="message" rows={3} maxLength={3000} aria-invalid={Boolean(fieldErrors.message)} aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
                value={msg} onChange={(e) => { const value = e.target.value; setMsg(value); if (hasAttemptedSubmit || fieldErrors.message) validateOne('message', { ...enquiry, message: value }); }}
                onBlur={() => validateOne('message')} placeholder="Briefly describe what you need." />
              {fieldErrors.message && <span className="field-error" id="contact-message-error" role="alert">{fieldErrors.message}</span>}
            </label>
            <div className="form-actions">
              <button className="btn" type="submit" disabled={submitting} aria-busy={submitting}>
                {submitting ? 'Sending enquiry…' : 'Send enquiry'}
              </button>
              <button className="btn ghost" type="button" onClick={sendEnquiryOnWhatsApp} disabled={submitting}>
                Send enquiry on WhatsApp
              </button>
            </div>
            <p className="form-note" key={status?.message ?? 'idle'} role="status" aria-live="polite" data-status={status?.type ?? 'idle'}>
              {status?.message ?? 'You can send 3 enquiries in a day.'}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
