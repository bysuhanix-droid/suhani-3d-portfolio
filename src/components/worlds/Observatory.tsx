import { X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { P } from '../../data/portfolioData';
import type { WorldDef } from './worldData';

const t = 'text-[#F4F7FF]', mut = 'text-[#94A3B8]';
const card = 'rounded-lg border border-white/[0.09] bg-white/[0.03]';

/** staggered reveal so entries "arrive" one by one */
const Rise = ({ i, children, className = '' }: { i: number; children: ReactNode; className?: string }) => (
  <div className={className} style={{ animation: `fadeUp .6s ${0.12 + i * 0.09}s both ease-out` }}>{children}</div>
);

/* ---------- typed line, for the Sun's log ---------- */
function Typed({ text, delay = 0 }: { text: string; delay?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => {
      const iv = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(iv), v) : v + 2)), 16);
    }, delay);
    return () => clearTimeout(id);
  }, [text, delay]);
  return <>{text.slice(0, n)}<span className="opacity-50">{n < text.length ? '▍' : ''}</span></>;
}

/* ---------- layouts ---------- */

function SolarLog() {
  return (
    <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4 font-sans">
        {P.about.map((a, i) => (
          <Rise i={i} key={i}>
            <div className="flex gap-3 text-sm leading-relaxed">
              <span className="font-mono-tech text-[10px] pt-1 text-[#FFB347] shrink-0">T+0{i + 1}:00</span>
              <p className={t}><Typed text={a} delay={400 + i * 900} /></p>
            </div>
          </Rise>
        ))}
        <Rise i={3}><p className={`${mut} text-xs italic`}>{P.facts.join('  ·  ')}</p></Rise>
      </div>
      <div className="grid grid-cols-2 gap-3 content-start">
        <div className={`col-span-2 font-mono-tech text-[10px] tracking-[0.3em] ${mut}`}>CORE READINGS</div>
        {P.stats.map((st, i) => (
          <Rise i={i + 2} key={st.k} className={`${card} p-3`}>
            <div className="font-display text-3xl bg-gradient-to-r from-[#ff6a10] to-[#ffe08a] bg-clip-text text-transparent">{st.v}</div>
            <div className={`text-[11px] ${mut}`}>{st.k}</div>
          </Rise>
        ))}
      </div>
    </div>
  );
}

function Diagnostics() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {P.skills.map((g, gi) => (
        <Rise i={gi} key={g.group} className={`${card} p-4`}>
          <div className={`font-mono-tech text-[10px] tracking-[0.3em] ${mut}`}>MODULE {String.fromCharCode(65 + gi)} · {g.group.toUpperCase()}</div>
          <div className="mt-3 space-y-3">
            {g.items.map(([n, uses]) => {
              const col = uses >= 2 ? '#4DFFC3' : uses === 1 ? '#9CC3FF' : '#FFD27A';
              return (
                <div key={n}>
                  <div className="flex justify-between gap-2 text-xs"><span className={t}>{n}</span><span className="font-mono-tech text-[10px] shrink-0" style={{ color: col }}>{uses ? `${uses} PROJECT${uses > 1 ? 'S' : ''}` : 'IN THE TOOLKIT'}</span></div>
                  <div className="mt-1 flex gap-[2px]">
                    {Array.from({ length: 12 }, (_, k) => (
                      <span key={k} className="h-2 flex-1 rounded-[1px]" style={{ background: k < 3 + uses * 3 ? col : 'rgba(255,255,255,.08)', opacity: k < 3 + uses * 3 ? 0.55 + (k / 12) * 0.45 : 1 }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Rise>
      ))}
    </div>
  );
}

function FlightRecorder() {
  return (
    <div className="relative pl-6 space-y-5">
      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-[#FFE27A] via-white/20 to-transparent" />
      {P.experience.map((e, i) => (
        <Rise i={i} key={i} className="relative">
          <span className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#FFE27A] shadow-[0_0_12px_#FFE27A]" />
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className={`font-display text-lg ${t}`}>{e.role}</span>
            <span className="text-[#FFE27A] text-sm">@ {e.org}</span>
            <span className={`font-mono-tech text-[10px] ${mut}`}>ENTRY {String(P.experience.length - i).padStart(2, '0')} · {e.period}</span>
          </div>
          <ul className={`mt-1.5 space-y-1 text-xs font-sans ${mut}`}>{e.points.map((p) => <li key={p}>▸ {p}</li>)}</ul>
        </Rise>
      ))}
    </div>
  );
}

function Specimens() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {P.projects.map((p, i) => (
        <Rise i={i} key={p.id} className={`${card} p-4 flex flex-col hover:border-[#9CC3FF]/50 transition-colors`}>
          <div className="flex justify-between font-mono-tech text-[10px]"><span className="text-[#9CC3FF]">SPECIMEN {p.id}</span><span className={`${mut} text-right`}>{p.kind.toUpperCase()} · {p.date.toUpperCase()}</span></div>
          <div className={`mt-2 font-display text-lg ${t}`}>{p.name}</div>
          <p className={`mt-1 text-xs leading-relaxed font-sans ${mut} flex-1`}>{p.blurb}</p>
          <ul className={`mt-2 space-y-0.5 text-[11px] font-sans ${mut}`}>{p.points.slice(0, 2).map((x) => <li key={x}>▸ {x}</li>)}</ul>
          <div className="mt-3 flex flex-wrap gap-1.5">{p.tags.map((g) => <span key={g} className="px-2 py-0.5 rounded-full text-[10px] bg-[#9CC3FF]/10 text-[#9CC3FF]">{g}</span>)}</div>
          <a href={p.link} target="_blank" rel="noreferrer" className="mt-3 text-[11px] text-[#9CC3FF] hover:underline">Collect specimen →</a>
        </Rise>
      ))}
    </div>
  );
}

function MissionReports() {
  return (
    <div className="space-y-3">
      {P.research.map((r, i) => (
        <Rise i={i} key={i} className={`${card} p-4 flex gap-4 items-start`}>
          <div className="font-mono-tech text-[10px] px-2 py-1 rounded border border-[#7FD7FF]/50 text-[#7FD7FF] shrink-0">{r.status.toUpperCase()}</div>
          <div><div className={`font-display ${t}`}>{r.title}</div><p className={`mt-1 text-xs font-sans ${mut}`}><span className="text-[#7FD7FF]">FINDING ›</span> {r.finding}</p></div>
        </Rise>
      ))}
      <Rise i={P.research.length}><p className={`text-[11px] ${mut}`}>Related field work lives in <span className="text-[#7FD7FF]">Earth · Projects</span>.</p></Rise>
    </div>
  );
}

function StormRecords() {
  return (
    <div className="space-y-3">
      {P.achievements.map((a, i) => (
        <Rise i={i} key={i} className={`${card} p-4 flex items-center gap-4`}>
          <div className="text-center shrink-0 w-14">
            <div className="font-display text-3xl text-[#FFD27A] leading-none">{a.level}</div>
            <div className={`font-mono-tech text-[8px] tracking-widest ${mut}`}>CATEGORY</div>
          </div>
          <div className="flex-1"><div className={`font-display ${t}`}>{a.title}</div><div className={`text-xs font-sans ${mut}`}>{a.detail}</div></div>
          <div className="font-mono-tech text-[10px] text-[#FFD27A]">{a.year}</div>
        </Rise>
      ))}
    </div>
  );
}

function RingLedger() {
  const rings = ['D', 'C', 'B', 'A', 'F'];
  return (
    <div className="grid gap-6 md:grid-cols-[180px_1fr] items-center">
      <svg viewBox="-100 -100 200 200" className="w-40 mx-auto">
        {P.education.map((_, i) => <circle key={i} r={30 + i * 18} fill="none" stroke="#8EE6FF" strokeOpacity={0.75 - i * 0.2} strokeWidth={6 - i} strokeDasharray={i ? '2 3' : undefined} />)}
        <circle r="18" fill="#d9bd86" />
      </svg>
      <div className="space-y-4">
        {P.education.map((e, i) => (
          <Rise i={i} key={i}>
            <div className="font-mono-tech text-[10px] text-[#8EE6FF]">{rings[i % 5]}-RING · {e.period}</div>
            <div className={`font-display text-lg ${t}`}>{e.degree}</div>
            <div className={`text-sm ${mut}`}>{e.school}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">{e.courses.map((c) => <span key={c} className="px-2 py-0.5 rounded-full text-[10px] bg-[#8EE6FF]/10 text-[#8EE6FF]">{c}</span>)}</div>
          </Rise>
        ))}
      </div>
    </div>
  );
}

function ArchiveShelves() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {P.certs.map((c, i) => (
        <Rise i={i} key={c.id} className="relative p-4 rounded-md border border-[#B6FFF0]/30 bg-[#0b2a33]/60">
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#B6FFF0] to-transparent" />
          <div className="font-mono-tech text-[9px] text-[#B6FFF0] tracking-widest">CATALOG № {c.id}{c.year ? ` · ${c.year}` : ''}</div>
          <div className={`mt-2 font-display ${t}`}>{c.name}</div>
          <div className={`text-xs ${mut}`}>Issued by {c.issuer}</div>
          <div className="mt-3 h-6 flex items-end gap-[3px] opacity-60">{Array.from({ length: 28 }, (_, k) => <span key={k} className="flex-1 bg-[#B6FFF0]" style={{ height: `${20 + ((k * 37 + i * 11) % 80)}%` }} />)}</div>
        </Rise>
      ))}
    </div>
  );
}

function Transmission() {
  const [msg, setMsg] = useState('');
  const [from, setFrom] = useState('');
  const send = () => {
    const body = encodeURIComponent(`${msg}\n\n— ${from}`);
    window.location.href = `mailto:${P.contact.email}?subject=${encodeURIComponent('Transmission from the portfolio')}&body=${body}`;
  };
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
      <Rise i={0} className="space-y-2">
        <div className={`font-mono-tech text-[10px] tracking-[0.3em] ${mut}`}>COMPOSE TRANSMISSION</div>
        <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Your name / callsign" className="w-full rounded bg-black/40 border border-white/15 px-3 py-2 text-sm text-[#F4F7FF] outline-none focus:border-[#FF6B6B]/70" />
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} placeholder="Say something across 4.5 billion km…" className="w-full rounded bg-black/40 border border-white/15 px-3 py-2 text-sm text-[#F4F7FF] outline-none focus:border-[#FF6B6B]/70 font-sans" />
        <button onClick={send} className="px-5 py-2 rounded-full text-xs tracking-[0.3em] border border-[#FF6B6B] text-[#F4F7FF] bg-[#FF6B6B]/15 hover:bg-[#FF6B6B]/30 cursor-pointer">TRANSMIT</button>
      </Rise>
      <Rise i={1} className="space-y-2.5 text-sm">
        <div className={`font-mono-tech text-[10px] tracking-[0.3em] ${mut}`}>OPEN CHANNELS</div>
        {([['Email', `mailto:${P.contact.email}`, P.contact.email], ['GitHub', P.contact.github, 'repository uplink'], ['LinkedIn', P.contact.linkedin, 'professional relay']] as const).map(([n, h, d]) => (
          <a key={n} href={h} target="_blank" rel="noreferrer" className={`${card} flex items-center justify-between px-3 py-2 hover:border-[#FF6B6B]/60`}>
            <span className={t}>{n}</span><span className={`text-[11px] ${mut}`}>{d}</span>
          </a>
        ))}
        <a href={`tel:${P.contact.phone.replace(/\s/g, '')}`} className={`${card} flex items-center justify-between px-3 py-2 hover:border-[#FF6B6B]/60`}><span className={t}>Phone</span><span className={`text-[11px] ${mut}`}>{P.contact.phone}</span></a>
        <div className={`text-[11px] ${mut} pt-1`}>{P.contact.availability}. Light takes ~4 h to reach Neptune — replies from Earth are faster.</div>
      </Rise>
    </div>
  );
}

const VIEW: Record<string, { code: string; title: string; sub: string; el: ReactNode }> = {
  sun: { code: 'SOL-LOG', title: 'Solar Log', sub: 'Recovered from the observatory’s core recorder', el: <SolarLog /> },
  mercury: { code: 'SYS-DIAG', title: 'Systems Diagnostics', sub: 'Every module online — live readout', el: <Diagnostics /> },
  venus: { code: 'FLT-REC', title: 'Flight Recorder', sub: 'Security research, open source and problem-solving — logged by mission', el: <FlightRecorder /> },
  earth: { code: 'FLD-CAT', title: 'Field Specimens', sub: 'Collected, catalogued, still alive', el: <Specimens /> },
  mars: { code: 'MSN-RPT', title: 'Mission Reports', sub: 'Applied ML, analytics and security experiments, filed from the red dust', el: <MissionReports /> },
  jupiter: { code: 'STM-REC', title: 'Storm Records', sub: 'Milestones, ranked by intensity', el: <StormRecords /> },
  saturn: { code: 'RNG-LDG', title: 'Ring Ledger', sub: 'One ring per chapter', el: <RingLedger /> },
  uranus: { code: 'ARC-IDX', title: 'The Archive', sub: 'Verified, shelved, indexed', el: <ArchiveShelves /> },
  neptune: { code: 'TX-CONSOLE', title: 'Transmission Console', sub: 'The last antenna before the dark', el: <Transmission /> },
};

export function ObservatoryPanel({ def, onBack, onLeave }: { def: WorldDef; onBack: () => void; onLeave: () => void }) {
  const v = VIEW[def.id];
  const a = def.station.accent;
  return (
    <div className="absolute inset-0 bg-[#020308]/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto overflow-y-auto" style={{ animation: 'iris 1s ease-out both' }}>
      <div className="relative w-[min(96vw,880px)] rounded-2xl border bg-[#070a14]/90 p-6 sm:p-8 shadow-[0_30px_80px_rgba(0,0,0,.8)]" style={{ borderColor: a + '55', boxShadow: `0 0 60px ${a}22` }}>
        {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((p) => <span key={p} className={`absolute ${p} h-3 w-3 border-t border-l`} style={{ borderColor: a, transform: `rotate(${p.includes('right') ? (p.includes('top') ? 90 : 180) : p.includes('bottom') ? 270 : 0}deg)` }} />)}
        <button onClick={onBack} aria-label="Close" className="absolute top-4 right-5 text-[#94A3B8] hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
        <div className="font-mono-tech text-[10px] tracking-[0.35em]" style={{ color: a }}>{def.station.name.toUpperCase()} · {v.code} · {def.section.toUpperCase()}</div>
        <h2 className={`mt-2 font-display text-3xl sm:text-4xl ${t}`}>{v.title}</h2>
        <p className={`text-xs ${mut} mb-6`}>{v.sub}</p>
        {v.el}
        <div className="mt-8 flex flex-wrap gap-3 text-xs">
          <button onClick={onBack} className="px-4 py-2 rounded-full border border-white/15 text-[#F4F7FF] hover:bg-white/10 cursor-pointer">Back to {def.name}</button>
          <button onClick={onLeave} className="px-4 py-2 rounded-full border border-white/15 text-[#94A3B8] hover:text-white hover:bg-white/10 cursor-pointer">Return to Solar System</button>
        </div>
      </div>
    </div>
  );
}
