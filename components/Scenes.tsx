import type { CSSProperties, ReactNode } from 'react';

export const v = (i: number, extra: Record<string, string | number> = {}) => ({ '--i': i, ...extra } as CSSProperties);

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 320 220" className="scene" role="img" aria-label={label}>
      <rect width="320" height="220" rx="24" className="f-n" />
      {children}
    </svg>
  );
}

/* ---------- Hero: growth staircase + stamped document + AI recommendation ---------- */
export function HeroScene() {
  const hs = [50, 80, 110, 150, 195, 250, 320];
  const pts = hs.map((h, i) => [170 + i * 54, 420 - h]);
  return (
    <svg viewBox="0 0 560 460" className="hero-art" role="img" aria-label="Bars climbing to an eightfold sales gain, a stamped document, and an AI assistant recommending the brand">
      <circle cx="330" cy="240" r="205" fill="none" className="s-t an spin" strokeWidth="2" strokeDasharray="4 14" />
      {hs.map((h, i) => (
        <rect key={i} x={150 + i * 54} y={420 - h} width="40" height={h} rx="12" className={`an rise ${i === 6 ? 'f-a' : 'f-t'}`} style={{ ...v(i), opacity: i === 6 ? 1 : 0.35 + i * 0.1 }} />
      ))}
      <path d={'M' + pts.map((p) => p.join(' ')).join(' L')} pathLength={1} strokeDasharray={1} fill="none" className="s-i an draw" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={v(7, { '--len': 1 })} />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="6" className="f-w s-i an pop" strokeWidth="3" style={v(i + 3)} />)}
      <g className="an float" style={v(0)}>
        <rect x="14" y="300" width="140" height="150" rx="18" className="f-w" />
        <rect x="34" y="326" width="100" height="8" rx="4" className="f-n" />
        <rect x="34" y="346" width="76" height="8" rx="4" className="f-n" />
        <rect x="34" y="366" width="88" height="8" rx="4" className="f-n" />
        <g transform="translate(110 412)"><g className="an stamp" style={{ '--d': '6s' } as CSSProperties}>
          <circle r="30" className="s-a" strokeWidth="6" fill="none" />
          <path d="M-12 0 L-3 10 L14 -10" className="s-a" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g></g>
      </g>
      <g className="an float" style={v(4)}>
        <rect x="24" y="40" width="214" height="96" rx="28" className="f-w" />
        <path d="M60 134 L50 158 L88 134Z" className="f-w" />
        <path d="M52 70 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6z" className="f-a an pulse" />
        <rect x="90" y="70" width="124" height="10" rx="5" className="f-n" />
        <rect x="90" y="90" width="92" height="10" rx="5" className="f-n" />
        <rect x="90" y="110" width="64" height="14" rx="7" className="f-t" />
      </g>
    </svg>
  );
}

/* ---------- Services ---------- */
const SeoScene = () => (
  <Frame label="A brand climbing to the top search result and being cited by an AI assistant">
    <rect x="30" y="18" width="260" height="34" rx="17" className="f-w" />
    <circle cx="54" cy="35" r="7" className="s-i" fill="none" strokeWidth="3" /><path d="M59 40 L66 47" className="s-i" strokeWidth="3" strokeLinecap="round" />
    <rect x="80" y="30" width="120" height="10" rx="5" className="f-t an type" style={{ transformOrigin: '0 50%' } as CSSProperties} />
    {[0, 1, 2].map((i) => <rect key={i} x="30" y={64 + i * 30} width="260" height="24" rx="12" className="f-w" />)}
    <g className="an climb"><rect x="30" y="64" width="260" height="24" rx="12" className="f-t" /><path d="M48 76 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" transform="scale(.6) translate(24 -4)" className="f-a" /><rect x="80" y="72" width="110" height="8" rx="4" fill="#fff" /></g>
    <g className="an float"><rect x="30" y="160" width="190" height="44" rx="22" className="f-i" /><path d="M56 170 l5 10 10 4 -10 4 -5 10 -5 -10 -10 -4 10 -4z" className="f-a an pulse" /><rect x="84" y="176" width="110" height="8" rx="4" fill="#fff" opacity=".8" /><rect x="84" y="190" width="64" height="8" rx="4" className="f-a" /></g>
  </Frame>
);

const ContentScene = () => {
  const fills = ['f-t', 'f-w', 'f-a', 'f-i', 'f-t', 'f-w', 'f-w', 'f-t', 'f-a'];
  return (
    <Frame label="A content calendar filling up with posts, videos and images">
      {fills.map((f, i) => <rect key={i} x={30 + (i % 3) * 96} y={20 + Math.floor(i / 3) * 62} width="88" height="54" rx="14" className={`${f} an pop`} style={v(i)} />)}
      <path d="M166 48 l22 12 -22 12z" className="f-w" opacity=".9" /><circle cx="262" cy="143" r="10" fill="#fff" opacity=".9" />
      <rect x="40" y="132" width="60" height="7" rx="3.5" className="f-n" /><rect x="40" y="148" width="40" height="7" rx="3.5" className="f-n" />
    </Frame>
  );
};

const MediaScene = () => (
  <Frame label="A target being hit while ad performance bars rise">
    {[70, 48, 26].map((r, i) => <circle key={r} cx="110" cy="110" r={r} fill="none" className="s-t" strokeWidth={i === 0 ? 4 : 5} opacity={0.35 + i * 0.3} />)}
    <circle cx="110" cy="110" r="12" className="f-a" />
    <circle cx="110" cy="110" r="70" fill="none" className="s-a an ping" strokeWidth="3" />
    <circle cx="110" cy="110" r="70" fill="none" className="s-a an ping" strokeWidth="3" style={v(6)} />
    {[50, 80, 110, 150].map((h, i) => <rect key={i} x={208 + i * 24} y={190 - h} width="16" height={h} rx="6" className={`an rise ${i === 3 ? 'f-a' : 'f-t'}`} style={v(i)} />)}
  </Frame>
);

const StrategyScene = () => {
  const d = 'M40 170 C90 170 90 90 140 100 S210 160 250 66';
  return (
    <Frame label="A route with checkpoints leading a marker to a goal flag">
      <path d={d} fill="none" className="s-t" strokeWidth="4" strokeDasharray="2 10" strokeLinecap="round" />
      <circle cx="40" cy="170" r="11" className="f-t" /><circle cx="140" cy="100" r="11" className="f-t" /><circle cx="205" cy="146" r="8" className="f-t" opacity=".5" />
      <path d="M250 66 V22" className="s-i" strokeWidth="4" strokeLinecap="round" /><path d="M250 22 L284 34 L250 46z" className="f-a an pulse" />
      <circle r="10" className="f-i"><animateMotion dur="4s" repeatCount="indefinite" path={d} /></circle>
    </Frame>
  );
};

const TaxScene = () => (
  <Frame label="A tax return document being stamped approved">
    <rect x="86" y="16" width="148" height="188" rx="16" className="f-w" />
    {[0, 1, 2, 3].map((i) => <rect key={i} x="106" y={40 + i * 22} width={108 - (i % 2) * 28} height="9" rx="4.5" className="f-n" />)}
    <rect x="106" y="132" width="50" height="9" rx="4.5" className="f-t" />
    <g transform="translate(196 166)"><g className="an stamp"><circle r="28" fill="none" className="s-a" strokeWidth="6" /><path d="M-11 0 L-3 9 L13 -9" fill="none" className="s-a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></g></g>
  </Frame>
);

const RjscScene = () => (
  <Frame label="Three days filling in, then a company certificate sealed">
    <path d="M60 52 H260" className="s-t" strokeWidth="4" strokeDasharray="1" pathLength={1} style={v(0, { '--len': 1, '--d': '6s' })} />
    {[60, 160, 260].map((x, i) => <circle key={x} cx={x} cy="52" r="16" className="an stepfill s-t" strokeWidth="4" style={v(i * 5, { '--d': '6s' })} />)}
    <rect x="80" y="92" width="160" height="112" rx="16" className="f-w" />
    <rect x="102" y="114" width="116" height="9" rx="4.5" className="f-n" /><rect x="102" y="134" width="80" height="9" rx="4.5" className="f-n" />
    <g transform="translate(200 172)"><g className="an stamp" style={v(0, { '--d': '6s' })}><circle r="20" className="f-a" /><circle r="12" fill="none" stroke="#fff" strokeWidth="3" /></g></g>
  </Frame>
);

const AuditScene = () => (
  <Frame label="A magnifier scanning ledger rows and ticking each one">
    {[0, 1, 2, 3].map((i) => (
      <g key={i}>
        <rect x="40" y={26 + i * 42} width="240" height="32" rx="12" className="f-w" />
        <rect x="56" y={38 + i * 42} width={120 - i * 12} height="8" rx="4" className="f-n" />
        <circle cx="254" cy={42 + i * 42} r="9" className="f-t an pop" style={v(i * 3, { '--d': '5s' })} />
        <path d={`M249 ${42 + i * 42} l4 4 7 -8`} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    ))}
    <g className="an scan" style={{ '--d': '5s' } as CSSProperties}><circle cx="150" cy="40" r="22" fill="#fff" fillOpacity=".4" className="s-i" strokeWidth="5" /><path d="M166 56 L184 74" className="s-i" strokeWidth="6" strokeLinecap="round" /></g>
  </Frame>
);

export const SCENES: Record<string, () => ReactNode> = {
  seo: SeoScene, content: ContentScene, media: MediaScene, strategy: StrategyScene, tax: TaxScene, rjsc: RjscScene, audit: AuditScene,
};

/* ---------- Two-pillar panel art ---------- */
export function PanelArt({ kind }: { kind: 'growth' | 'legal' }) {
  return (
    <svg viewBox="0 0 300 150" className="panel-art" aria-hidden>
      {kind === 'growth' ? (
        <>
          {[40, 66, 92, 124].map((h, i) => <rect key={i} x={40 + i * 56} y={140 - h} width="38" height={h} rx="11" fill="#fff" opacity={0.3 + i * 0.2} className="an rise" style={v(i)} />)}
          <path d="M59 84 L115 62 L171 42 L227 14" fill="none" stroke="#F4B43C" strokeWidth="5" strokeLinecap="round" pathLength={1} strokeDasharray={1} className="an draw" style={v(3, { '--len': 1 })} />
        </>
      ) : (
        <>
          <rect x="80" y="8" width="104" height="134" rx="14" fill="#fff" opacity=".9" />
          {[0, 1, 2].map((i) => <rect key={i} x="98" y={30 + i * 20} width={68 - i * 10} height="8" rx="4" fill="#3F8B84" opacity=".35" />)}
          <g transform="translate(182 108)"><g className="an stamp"><circle r="24" fill="none" stroke="#F4B43C" strokeWidth="6" /><path d="M-9 0 L-2 8 L11 -8" fill="none" stroke="#F4B43C" strokeWidth="6" strokeLinecap="round" /></g></g>
        </>
      )}
    </svg>
  );
}

/* ---------- 14 years ring ---------- */
export function Ring14() {
  return (
    <svg viewBox="0 0 300 300" className="ring14" aria-hidden>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
        const p = (r: number) => `${150 + Math.cos(a) * r} ${150 + Math.sin(a) * r}`;
        return <path key={i} d={`M${p(110)} L${p(140)}`} pathLength={1} strokeDasharray={1} strokeWidth="10" strokeLinecap="round" className={`an draw ${i === 13 ? 's-a' : 's-t'}`} style={v(i, { '--len': 1, '--d': '7s' })} />;
      })}
    </svg>
  );
}

/* ---------- Bangladesh + overseas ---------- */
export function Globe() {
  const pins = [{ x: 90, y: 90, k: 'UK' }, { x: 300, y: 160, k: 'BD' }, { x: 480, y: 110, k: 'JP' }];
  const arcs = ['M90 90 Q190 -10 300 160', 'M300 160 Q400 20 480 110'];
  return (
    <svg viewBox="0 0 570 240" className="globe" role="img" aria-label="Clients in the UK and Japan connected to the Dhaka office">
      <defs><pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="2" fill="#fff" opacity=".18" /></pattern></defs>
      <rect width="570" height="240" rx="28" fill="url(#dots)" />
      {arcs.map((d, i) => <path key={i} d={d} fill="none" className="s-a an draw" strokeWidth="4" strokeLinecap="round" pathLength={1} strokeDasharray={1} style={v(i * 6, { '--len': 1, '--d': '6s' })} />)}
      {pins.map((p) => (
        <g key={p.k}>
          <circle cx={p.x} cy={p.y} r="26" className="f-a an ping" />
          <circle cx={p.x} cy={p.y} r="14" className={p.k === 'BD' ? 'f-a' : 'f-t'} stroke="#fff" strokeWidth="4" />
          <text x={p.x} y={p.y + 44} textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">{p.k}</text>
        </g>
      ))}
    </svg>
  );
}

/* ---------- EZsell: AI sales agent chat (wordless) ---------- */
export function PhoneChat() {
  const bar = (w: number, c = 'rgba(0,0,0,.12)') => <span className="bar" style={{ width: w, background: c }} />;
  return (
    <div className="phone" role="img" aria-label="A customer asks about a product, the AI sales agent replies with a product card, and the order is confirmed">
      <div className="notch" />
      <div className="msg u" style={v(0)}>{bar(110)}{bar(70)}</div>
      <div className="msg a" style={v(1)}>{bar(130, 'rgba(255,255,255,.8)')}{bar(90, 'rgba(255,255,255,.5)')}</div>
      <div className="msg card" style={v(2)}><div className="pic" /><div className="meta">{bar(100)}{bar(60, '#3F8B84')}</div></div>
      <div className="msg ok" style={v(3)}>
        <svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="11" fill="#fff" /><path d="M7 12.5 l3.5 3.5 6.5 -7.5" fill="none" stroke="#3F8B84" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {bar(80, 'rgba(255,255,255,.8)')}
      </div>
    </div>
  );
}
