import { ArrowUpRight, Award, Check, Copy, Cpu, Download, Folder, GraduationCap, Home, Mail, MapPin, Phone, ShieldCheck, Trophy, User, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { P } from '../data/portfolioData';

export type QuickPage = 'home' | 'about' | 'skills' | 'work' | 'contact';
type Page = QuickPage;
const PAGES: { id: Page; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
  { id: 'about', label: 'About', icon: <User className="w-4 h-4" /> },
  { id: 'skills', label: 'Skills', icon: <Cpu className="w-4 h-4" /> },
  { id: 'work', label: 'Projects', icon: <Folder className="w-4 h-4" /> },
  { id: 'contact', label: 'Contact', icon: <Mail className="w-4 h-4" /> },
];

const GRAD = 'bg-clip-text text-transparent bg-[linear-gradient(110deg,#9CC3FF,#F4F7FF,#FFB347,#FF6B9A,#9CC3FF)] bg-[length:300%_100%] animate-[gradshift_9s_linear_infinite]';
const norm = (x: string) => x.toLowerCase().replace(/\.js|[.\s-]/g, '');

/* ------------------------------ ambience ------------------------------ */
function SpaceBg() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, g = c.getContext('2d')!;
    let w = 0, h = 0, raf = 0, mx = 0, my = 0;
    const stars = Array.from({ length: 170 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random() * 0.9 + 0.1 }));
    const rs = () => { w = c.width = innerWidth; h = c.height = innerHeight; };
    const mm = (e: MouseEvent) => { mx = e.clientX / w - 0.5; my = e.clientY / h - 0.5; };
    rs(); window.addEventListener('resize', rs); window.addEventListener('mousemove', mm);
    const loop = (t: number) => {
      g.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.y = (s.y + 0.00005 * s.z) % 1;
        g.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.001 * s.z + s.x * 9));
        g.fillStyle = s.z > 0.8 ? '#ffe9c4' : '#cfe0ff';
        g.fillRect((s.x + mx * 0.025 * s.z) * w, (s.y + my * 0.025 * s.z) * h, s.z * 1.7, s.z * 1.7);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', rs); window.removeEventListener('mousemove', mm); };
  }, []);
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-[#4f6bff]/25 blur-[110px] animate-[drift_14s_ease-in-out_infinite]" />
      <div className="absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-[#ff4fa0]/15 blur-[120px] animate-[drift_18s_ease-in-out_infinite]" />
      <div className="absolute -bottom-40 left-1/4 h-[26rem] w-[26rem] rounded-full bg-[#ffb347]/15 blur-[120px] animate-[drift_16s_ease-in-out_infinite]" />
      <canvas ref={ref} className="absolute inset-0" />
    </div>
  );
}

/** fades + lifts its children in as they scroll into view */
function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const r = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = r.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={r} className={className} style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(26px) scale(.985)', transition: `opacity .7s ${delay}s cubic-bezier(.2,.7,.2,1), transform .7s ${delay}s cubic-bezier(.2,.7,.2,1)` }}>
      {children}
    </div>
  );
}

function Tilt({ children, className = '' }: { children: ReactNode; className?: string }) {
  const r = useRef<HTMLDivElement>(null);
  const mv = (e: React.MouseEvent) => {
    const el = r.current!, b = el.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateZ(0)`;
    el.style.setProperty('--mx', `${(x + 0.5) * 100}%`); el.style.setProperty('--my', `${(y + 0.5) * 100}%`);
  };
  return (
    <div ref={r} onMouseMove={mv} onMouseLeave={() => { r.current!.style.transform = ''; }}
      className={`group/tilt relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md transition-[transform,border-color,box-shadow] duration-300 ease-out hover:border-[#9CC3FF]/35 hover:shadow-[0_24px_60px_rgba(0,0,0,.5),0_0_40px_rgba(123,164,255,.08)] ${className}`}>
      <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover/tilt:opacity-100 transition-opacity duration-300" style={{ background: 'radial-gradient(420px circle at var(--mx,50%) var(--my,50%), rgba(156,195,255,.18), transparent 45%)' }} />
      <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover/tilt:opacity-100 transition-opacity duration-300" style={{ padding: 1, background: 'radial-gradient(260px circle at var(--mx,50%) var(--my,50%), rgba(156,195,255,.7), transparent 60%)', WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />
      <div className="relative">{children}</div>
    </div>
  );
}

function useCount(to: number, ms = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const f = (t: number) => { const k = Math.min(1, (t - t0) / ms); setV(Math.round(to * (1 - (1 - k) ** 3))); if (k < 1) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return v;
}

function Typer({ words }: { words: string[] }) {
  const [i, setI] = useState(0), [n, setN] = useState(0), [del, setDel] = useState(false);
  useEffect(() => {
    const w = words[i];
    const id = setTimeout(() => {
      if (!del && n < w.length) setN(n + 1);
      else if (!del) setDel(true);
      else if (n > 0) setN(n - 1);
      else { setDel(false); setI((i + 1) % words.length); }
    }, !del && n === w.length ? 1400 : del ? 28 : 55);
    return () => clearTimeout(id);
  }, [n, del, i, words]);
  return <span className="text-[#FFB347]">{words[i].slice(0, n)}<span className="animate-pulse">|</span></span>;
}

const Stat = ({ k, v }: { k: string; v: string }) => {
  const num = parseInt(v, 10), c = useCount(num);
  return (
    <div className="text-center sm:text-left">
      <div className="font-display text-4xl sm:text-5xl text-[#F4F7FF] tabular-nums">{v === '2028' ? v : c}</div>
      <div className="mt-1 text-xs text-[#94A3B8]">{k}</div>
    </div>
  );
};

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <div className="font-mono-tech text-[11px] uppercase tracking-[0.4em] text-[#7BA4FF]">{children}</div>
);

/* -------------------------------- pages -------------------------------- */
function HomePage({ go }: { go: (p: Page) => void }) {
  const allSkills = P.skills.flatMap((g) => g.items.map(([n]) => n));
  return (
    <div className="min-h-[calc(100vh-9rem)] flex flex-col justify-center gap-10">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/[0.04] text-[11px] text-[#cbd5e1]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4DFFC3] animate-pulse" /> {P.role} · Chandigarh University
        </div>
        <h1 className={`mt-5 font-display font-semibold leading-[0.9] tracking-tight text-[clamp(3.5rem,17vw,11rem)] ${GRAD}`}>{P.name.toUpperCase()}</h1>
        <p className="mt-5 text-xl sm:text-3xl text-[#e2e8f0] max-w-3xl leading-snug">
          I build <Typer words={['backend systems', 'real-time web apps', 'analytics dashboards', 'network security tools']} />
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={() => go('work')} className="group px-6 py-3 rounded-full bg-[#7BA4FF] hover:bg-[#9CC3FF] text-[#05070f] text-sm font-semibold cursor-pointer transition-colors flex items-center gap-2">
            See projects <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
          <a href={P.resume} download className="px-6 py-3 rounded-full border border-white/25 hover:bg-white/10 text-sm text-[#F4F7FF] flex items-center gap-2 transition-colors"><Download className="w-4 h-4" />Résumé</a>
          <button onClick={() => go('contact')} className="px-6 py-3 rounded-full border border-white/25 hover:bg-white/10 text-sm text-[#F4F7FF] cursor-pointer transition-colors">Say hello</button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-white/10 pt-8">{P.stats.map((s, i) => <div key={s.k} style={{ animation: `fadeUp .7s ${0.25 + i * 0.1}s both ease-out` }}><Stat {...s} /></div>)}</div>
      <div className="relative overflow-hidden -mx-4 sm:mx-0 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
        <div className="flex w-max gap-3 animate-[marquee_34s_linear_infinite]">
          {[...allSkills, ...allSkills].map((s, i) => <span key={i} className="px-4 py-1.5 rounded-full border border-white/15 text-sm text-[#cbd5e1] whitespace-nowrap">{s}</span>)}
        </div>
      </div>
    </div>
  );
}

function AboutPage() {
  const days = Math.max(0, Math.ceil((new Date('2028-06-30').getTime() - Date.now()) / 864e5));
  return (
    <div className="space-y-12">
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] items-start">
        <div>
          <Eyebrow>About</Eyebrow>
          <h2 className="mt-3 font-display text-4xl sm:text-6xl text-[#F4F7FF] leading-tight">Student by title, <span className={GRAD}>builder</span> by habit.</h2>
          {P.about.map((a) => <p key={a} className="mt-5 text-base sm:text-lg text-[#cbd5e1] leading-relaxed">{a}</p>)}
        </div>
        <Tilt className="p-6">
          <div className="flex items-center gap-2 text-[#FFB347] text-xs uppercase tracking-[0.3em]"><GraduationCap className="w-4 h-4" /> Education</div>
          <div className="mt-3 font-display text-2xl text-[#F4F7FF]">{P.education[0].school}</div>
          <div className="text-sm text-[#cbd5e1]">{P.education[0].degree}</div>
          <div className="mt-4 font-mono-tech text-xs text-[#7BA4FF]">{P.education[0].period.toUpperCase()}</div>
          <div className="mt-1 font-display text-4xl text-[#F4F7FF]">{days.toLocaleString()}<span className="text-sm text-[#94A3B8] font-sans"> days to graduation</span></div>
          <div className="mt-4 flex flex-wrap gap-1.5">{P.education[0].courses.map((c) => <span key={c} className="px-2.5 py-1 rounded-full text-[11px] bg-[#7BA4FF]/10 border border-[#7BA4FF]/25 text-[#9CC3FF]">{c}</span>)}</div>
        </Tilt>
      </div>
      <div>
        <Eyebrow>Highlights</Eyebrow>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            { icon: <Trophy className="w-5 h-5" />, c: '#FFD27A', t: '1st place · CodeMate Hackathon', d: 'Data & AI track, 50 teams. Random Forest with feature engineering — 78% accuracy on 10,000+ records.' },
            { icon: <ShieldCheck className="w-5 h-5" />, c: '#4DFFC3', t: 'CDAC BOSS Bug Bounty', d: 'Pen-tested government web apps and reported 11 vulnerabilities, including XSS and authentication bypass, with remediation steps.' },
            { icon: <Award className="w-5 h-5" />, c: '#9CC3FF', t: 'Open source & problem solving', d: 'Bug fixes, docs and features on GitHub; active on LeetCode and HackerRank.' },
          ].map((h, i) => (
            <Reveal key={h.t} delay={i * 0.1}>
              <Tilt className="p-5 h-full">
                <span className="grid place-items-center h-10 w-10 rounded-xl" style={{ background: h.c + '1f', color: h.c, boxShadow: `0 0 24px ${h.c}30` }}>{h.icon}</span>
                <div className="mt-3 font-display text-lg text-[#F4F7FF] leading-snug">{h.t}</div>
                <p className="mt-1.5 text-sm text-[#94A3B8] leading-relaxed">{h.d}</p>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </div>
      <div>
        <Eyebrow>Languages · tap to flip</Eyebrow>
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {P.spoken.map((l) => <Flip key={l.lang} front={l.hello} back={`${l.lang} · ${l.level}`} />)}
        </div>
      </div>
    </div>
  );
}

function Flip({ front, back }: { front: string; back: string }) {
  const [f, setF] = useState(false);
  return (
    <button onClick={() => setF(!f)} className="h-32 [perspective:800px] cursor-pointer">
      <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]" style={{ transform: f ? 'rotateY(180deg)' : 'none' }}>
        <div className="absolute inset-0 grid place-items-center rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md [backface-visibility:hidden]"><span className={`font-display text-3xl sm:text-4xl ${GRAD}`}>{front}</span></div>
        <div className="absolute inset-0 grid place-items-center rounded-2xl border border-[#7BA4FF]/40 bg-[#7BA4FF]/15 text-[#F4F7FF] text-sm px-3 text-center [backface-visibility:hidden]" style={{ transform: 'rotateY(180deg)' }}>{back}</div>
      </div>
    </button>
  );
}

function SkillsPage({ pick }: { pick: (s: string) => void }) {
  const accents = ['#9CC3FF', '#FF9ACB', '#FFD27A', '#4DFFC3', '#B69CFF', '#FF8A6B', '#7FD7FF'];
  return (
    <div className="space-y-8">
      <div><Eyebrow>Skills</Eyebrow>
        <h2 className="mt-3 font-display text-4xl sm:text-6xl text-[#F4F7FF]">The toolkit.</h2>
        <p className="mt-3 text-[#94A3B8] max-w-xl">Tap any skill to jump to the projects where it shows up. The number is how many of my {P.projects.length} projects use it.</p></div>
      <div className="grid gap-5 sm:grid-cols-2">
        {P.skills.map((g, i) => (
          <Reveal key={g.group} delay={(i % 2) * 0.08}>
          <Tilt className="p-6 h-full">
            <div className="flex items-center justify-between">
              <div className="font-display text-xl text-[#F4F7FF]">{g.group}</div>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: accents[i], boxShadow: `0 0 14px ${accents[i]}` }} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {g.items.map(([n, u]) => (
                <button key={n} onClick={() => pick(n)} className="group flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/15 hover:border-white/50 hover:bg-white/10 text-sm text-[#e2e8f0] cursor-pointer transition-all hover:-translate-y-0.5">
                  {n}{u > 0 && <span className="text-[10px] font-mono-tech px-1.5 rounded-full" style={{ background: accents[i] + '33', color: accents[i] }}>{u}</span>}
                </button>
              ))}
            </div>
          </Tilt>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function WorkPage({ filter, setFilter }: { filter: string | null; setFilter: (s: string | null) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const hay = (p: (typeof P.projects)[number]) => norm([p.name, p.blurb, ...p.tags, ...p.points].join(' '));
  const shown = filter ? P.projects.filter((p) => hay(p).includes(norm(filter))) : P.projects;
  const chips = [...new Set(P.projects.flatMap((p) => p.tags))];
  const hues = ['from-[#ffb347]/35', 'from-[#4f6bff]/40', 'from-[#4dffc3]/30', 'from-[#ff4fa0]/35'];
  return (
    <div className="space-y-8">
      <div><Eyebrow>Projects</Eyebrow>
        <h2 className="mt-3 font-display text-4xl sm:text-6xl text-[#F4F7FF]">Things I’ve built.</h2></div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {[null, ...chips].map((c) => (
          <button key={c ?? 'all'} onClick={() => setFilter(c)} className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs border cursor-pointer transition-colors ${filter === c ? 'bg-[#7BA4FF] text-[#05070f] border-[#7BA4FF]' : 'border-white/15 text-[#cbd5e1] hover:bg-white/10'}`}>{c ?? 'All'}</button>
        ))}
      </div>
      {filter && shown.length === 0 && <p className="text-sm text-[#94A3B8]">“{filter}” is part of my toolkit rather than a stack item in these three builds. Clear the filter to see everything.</p>}
      <div className="space-y-6">
        {shown.map((p, i) => {
          const isOpen = open === p.id;
          return (
            <Reveal key={p.id} delay={0.05}>
            <Tilt className="overflow-hidden">
              <div className={`absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${hues[i % 4]} to-transparent opacity-60 pointer-events-none`} />
              <div className="relative p-6 sm:p-8">
                <div className="flex items-start gap-5">
                  <div className="font-display text-5xl sm:text-7xl leading-none text-white/15">{String(P.projects.indexOf(p) + 1).padStart(2, '0')}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono-tech text-[10px] uppercase tracking-[0.3em] text-[#9CC3FF]"><span>{p.kind}</span><span className="px-2 py-0.5 rounded-full bg-white/[0.07] tracking-[0.15em] text-[#cbd5e1]">{p.date}</span></div>
                    <h3 className="mt-1 font-display text-2xl sm:text-3xl text-[#F4F7FF]">{p.name}</h3>
                    <p className="mt-2 text-[#cbd5e1] text-sm sm:text-base">{p.blurb}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">{p.tags.map((t) => <button key={t} onClick={() => setFilter(t)} className="px-2.5 py-1 rounded-full text-[11px] bg-white/[0.07] border border-white/10 text-[#cbd5e1] hover:bg-white/15 cursor-pointer">{t}</button>)}</div>
                <div className={`grid transition-[grid-template-rows] duration-500 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <ul className="overflow-hidden space-y-2 text-sm text-[#cbd5e1]">
                    <li className="h-4" />
                    {p.points.map((x) => <li key={x} className="flex gap-2"><span className="text-[#FFB347]">▸</span>{x}</li>)}
                  </ul>
                </div>
                <div className="mt-5 flex items-center gap-4 text-sm">
                  <button onClick={() => setOpen(isOpen ? null : p.id)} className="text-[#9CC3FF] hover:underline cursor-pointer">{isOpen ? 'Hide details' : 'How it works'}</button>
                  <a href={p.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#94A3B8] hover:text-white">GitHub <ArrowUpRight className="w-3.5 h-3.5" /></a>
                </div>
              </div>
            </Tilt>
            </Reveal>
          );
        })}
      </div>
      <div>
        <Eyebrow>Certifications</Eyebrow>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {P.certs.map((c) => <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:-translate-y-1 hover:border-[#7BA4FF]/40 hover:bg-white/[0.06]"><div className="text-sm text-[#F4F7FF]">{c.name}</div><div className="mt-1 text-xs text-[#94A3B8]">{c.issuer}</div></div>)}
        </div>
      </div>
    </div>
  );
}

function ContactPage() {
  const [copied, setCopied] = useState(false), [name, setName] = useState(''), [msg, setMsg] = useState('');
  const copy = () => { navigator.clipboard?.writeText(P.contact.email); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  const send = () => { window.location.href = `mailto:${P.contact.email}?subject=${encodeURIComponent('Hello from your portfolio')}&body=${encodeURIComponent(`${msg}\n\n— ${name}`)}`; };
  const input = 'w-full rounded-xl bg-white/[0.05] border border-white/15 px-4 py-3 text-sm text-[#F4F7FF] outline-none focus:border-[#7BA4FF]';
  return (
    <div className="space-y-10">
      <div><Eyebrow>Contact</Eyebrow>
        <h2 className="mt-3 font-display text-[clamp(2.6rem,9vw,6rem)] leading-[0.95] text-[#F4F7FF]">Let’s build <span className={GRAD}>something.</span></h2>
        <p className="mt-4 text-[#94A3B8] max-w-xl">{P.contact.availability}.</p></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <button onClick={copy} className="w-full text-left rounded-2xl border border-white/15 hover:border-[#7BA4FF]/60 bg-white/[0.04] p-5 flex items-center justify-between gap-3 cursor-pointer transition-colors">
            <div className="min-w-0"><div className="text-[11px] uppercase tracking-[0.25em] text-[#94A3B8]">Email · tap to copy</div><div className="mt-1 font-display text-lg sm:text-2xl text-[#F4F7FF] break-all">{P.contact.email}</div></div>
            {copied ? <Check className="w-5 h-5 text-[#4DFFC3] shrink-0" /> : <Copy className="w-5 h-5 text-[#94A3B8] shrink-0" />}
          </button>
          <div className="grid sm:grid-cols-2 gap-4">
            <a href={`tel:${P.contact.phone.replace(/\s/g, '')}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-white/30 flex items-center gap-3"><Phone className="w-4 h-4 text-[#FFB347]" /><span className="text-sm text-[#e2e8f0]">{P.contact.phone}</span></a>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 flex items-center gap-3"><MapPin className="w-4 h-4 text-[#FF9ACB]" /><span className="text-sm text-[#e2e8f0]">{P.location}</span></div>
            <a href={P.contact.github} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-white/30 flex items-center justify-between text-sm text-[#e2e8f0]">GitHub <ArrowUpRight className="w-4 h-4" /></a>
            <a href={P.contact.linkedin} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-white/30 flex items-center justify-between text-sm text-[#e2e8f0]">LinkedIn <ArrowUpRight className="w-4 h-4" /></a>
          </div>
          <a href={P.resume} download className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/25 hover:bg-white/10 text-sm text-[#F4F7FF]"><Download className="w-4 h-4" />Download résumé</a>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 space-y-3">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[#94A3B8]">Send a message</div>
          <input className={input} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea className={`${input} resize-none`} rows={5} placeholder="What would you like to talk about?" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <button onClick={send} className="px-6 py-2.5 rounded-full bg-[#7BA4FF] hover:bg-[#9CC3FF] text-[#05070f] text-sm font-semibold cursor-pointer transition-colors">Open in my email app</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- shell ---------------------------------- */
export function QuickView({ onClose, onPage }: { onClose: () => void; onPage?: (p: QuickPage) => void }) {
  const [page, setPage] = useState<Page>('home');
  const [filter, setFilter] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const touch = useRef(0);
  const [prog, setProg] = useState(0);
  const idx = PAGES.findIndex((p) => p.id === page);

  const go = useCallback((p: Page) => { setPage(p); onPage?.(p); scroller.current?.scrollTo({ top: 0 }); }, [onPage]);
  const step = useCallback((d: number) => go(PAGES[(idx + d + PAGES.length) % PAGES.length].id), [idx, go]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose, step]);

  return (
    <div ref={scroller} data-ui className="fixed inset-0 z-[60] bg-[#05070f] text-[#cbd5e1] overflow-y-auto overflow-x-hidden font-sans select-text"
      style={{ animation: 'iris .75s cubic-bezier(.2,.7,.2,1) both' }}
      onScroll={(e) => { const el = e.currentTarget; const m = el.scrollHeight - el.clientHeight; setProg(m > 0 ? el.scrollTop / m : 0); }}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { const d = e.changedTouches[0].clientX - touch.current; if (Math.abs(d) > 80) step(d < 0 ? 1 : -1); }}>
      <SpaceBg />
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-[#05070f]/55 border-b border-white/[0.07]">
        <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#7BA4FF] via-[#FF9ACB] to-[#FFB347]" style={{ width: `${prog * 100}%` }} />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={() => go('home')} className="relative h-8 w-8 shrink-0 cursor-pointer" aria-label="Home">
            <span className="absolute inset-0 rounded-full border border-[#7BA4FF]/60 animate-[spin_9s_linear_infinite] border-t-transparent" />
            <span className="absolute inset-0 grid place-items-center font-display text-[#F4F7FF]">S</span>
          </button>
          <nav className="relative hidden md:flex items-center ml-4 p-1 rounded-full bg-white/[0.05] border border-white/10">
            <span aria-hidden className="absolute top-1 bottom-1 left-1 w-[5.25rem] rounded-full bg-[#7BA4FF] shadow-[0_0_18px_rgba(123,164,255,.55)] transition-transform duration-500 ease-[cubic-bezier(.3,1.3,.5,1)]" style={{ transform: `translateX(${idx * 100}%)` }} />
            {PAGES.map((p) => (
              <button key={p.id} onClick={() => go(p.id)} className={`relative z-10 w-[5.25rem] py-1.5 rounded-full text-xs cursor-pointer transition-colors duration-300 ${page === p.id ? 'text-[#05070f] font-semibold' : 'text-[#94A3B8] hover:text-white'}`}>{p.label}</button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a href={P.resume} download className="hidden sm:flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border border-white/20 text-[#F4F7FF] hover:bg-white/10"><Download className="w-3.5 h-3.5" />Résumé</a>
            <button onClick={onClose} className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full bg-[#7BA4FF]/20 border border-[#7BA4FF]/50 text-[#F4F7FF] cursor-pointer hover:bg-[#7BA4FF]/35"><X className="w-3.5 h-3.5" />Universe</button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-28 md:pb-16">
        <div key={page} style={{ animation: 'pageIn .6s cubic-bezier(.2,.7,.2,1) both' }}>
          {page === 'home' && <HomePage go={go} />}
          {page === 'about' && <AboutPage />}
          {page === 'skills' && <SkillsPage pick={(s) => { setFilter(s); go('work'); }} />}
          {page === 'work' && <WorkPage filter={filter} setFilter={setFilter} />}
          {page === 'contact' && <ContactPage />}
        </div>
        <footer className="mt-16 pt-6 border-t border-white/[0.07] text-[11px] text-[#475569] flex justify-between"><span>© {new Date().getFullYear()} {P.name}</span><span className="hidden sm:inline">← → to navigate</span></footer>
      </main>

      {/* mobile tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 backdrop-blur-xl bg-[#080B16]/85 border-t border-white/10 flex justify-around pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {PAGES.map((p) => (
          <button key={p.id} onClick={() => go(p.id)} className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] cursor-pointer ${page === p.id ? 'text-[#9CC3FF]' : 'text-[#64748b]'}`}>
            {p.icon}{p.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
