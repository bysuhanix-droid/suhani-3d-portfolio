import { ArrowLeft, FastForward, Gauge, Orbit, Pause, Play, Rocket, Sliders, Tag, Circle } from 'lucide-react';
import { useState } from 'react';
import { getWorld } from '../worlds/worldData';
import { SOLAR_BODIES } from './planetData';

interface SolarHudProps {
  visible: boolean;
  focusId: string | null;
  onFocus: (id: string) => void;
  onExit: () => void;
  paused: boolean;
  onTogglePause: () => void;
  timeScale: number;
  onCycleTimeScale: () => void;
  showOrbits: boolean;
  onToggleOrbits: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  showBelt: boolean;
  onToggleBelt: () => void;
  onTravel: (id: string, skip?: boolean) => void;
}

const SUN_CARD = {
  id: 'sun', name: 'Sol', designation: 'G2V · MAIN SEQUENCE', chapter: 'The Source',
  blurb: 'A 4.6-billion-year-old G-type star fusing 600 million tonnes of hydrogen every second — 99.86% of the system\u2019s mass.',
  facts: [{ label: 'RADIUS', value: '696,340 km' }, { label: 'SURFACE', value: '5,772 K' }, { label: 'CORE', value: '15.7 MK' }, { label: 'ROTATION', value: '~25 d' }],
};

const glass = 'bg-[#080B16]/60 border border-white/[0.09] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)]';

export function SolarHud(p: SolarHudProps) {
  const [menu, setMenu] = useState(false);
  const active = p.focusId === 'sun' ? SUN_CARD : SOLAR_BODIES.find((b) => b.id === p.focusId) ?? null;
  const world = getWorld(p.focusId);

  const Row = ({ icon, label, on, onClick }: { icon: React.ReactNode; label: string; on: boolean; onClick: () => void }) => (
    <button onClick={onClick} className="w-full flex items-center justify-between gap-6 px-3 py-2 rounded-lg hover:bg-white/[0.05] cursor-pointer text-xs text-[#94A3B8]">
      <span className="flex items-center gap-2">{icon}{label}</span>
      <span className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${on ? 'bg-[#7BA4FF]' : 'bg-white/15'}`}>
        <span className={`h-3 w-3 rounded-full bg-white transition-transform ${on ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );

  return (
    <div style={{ visibility: p.visible ? 'visible' : 'hidden' }} className={`fixed inset-0 z-20 pointer-events-none transition-opacity duration-700 ${p.visible ? 'opacity-100' : 'opacity-0'}`}>
      {/* top-left: one way back */}
      <button onClick={p.onExit} className={`${glass} pointer-events-auto absolute top-5 left-5 flex items-center gap-2 px-3.5 py-2 rounded-full text-xs text-[#F4F7FF] hover:border-[#7BA4FF]/60 cursor-pointer`}>
        <ArrowLeft className="w-3.5 h-3.5 text-[#7BA4FF]" /> Back to Sky <span className="hidden md:inline text-[10px] px-1.5 rounded bg-white/10 text-[#94A3B8]">ESC</span>
      </button>

      {/* top-right: everything optional lives behind one menu (all off by default) */}
      <div className="pointer-events-auto absolute top-5 right-5 flex flex-col items-end gap-2">
        <button onClick={() => setMenu((m) => !m)} className={`${glass} flex items-center gap-2 px-3.5 py-2 rounded-full text-xs cursor-pointer ${menu ? 'text-[#F4F7FF] border-[#7BA4FF]/60' : 'text-[#94A3B8] hover:text-[#F4F7FF]'}`}>
          <Sliders className="w-3.5 h-3.5 text-[#7BA4FF]" /> View
        </button>
        {menu && (
          <div className={`${glass} rounded-2xl p-2 w-[230px]`} style={{ animation: 'fadeUp .25s ease-out' }}>
            <Row icon={<Orbit className="w-3.5 h-3.5" />} label="Orbit paths" on={p.showOrbits} onClick={p.onToggleOrbits} />
            <Row icon={<Tag className="w-3.5 h-3.5" />} label="Name labels" on={p.showLabels} onClick={p.onToggleLabels} />
            <Row icon={<Circle className="w-3.5 h-3.5" />} label="Asteroid belt" on={p.showBelt} onClick={p.onToggleBelt} />
            <div className="my-1 h-px bg-white/[0.07]" />
            <Row icon={p.paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />} label="Hold motion" on={p.paused} onClick={p.onTogglePause} />
            <button onClick={p.onCycleTimeScale} className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.05] cursor-pointer text-xs text-[#94A3B8]">
              <span className="flex items-center gap-2"><Gauge className="w-3.5 h-3.5" />Time speed</span>
              <span className="font-mono-tech text-[#F4F7FF]">{p.timeScale.toFixed(1)}×</span>
            </button>
          </div>
        )}
      </div>

      {/* bottom: one centred column — card only appears once something is selected */}
      <div className="absolute bottom-5 inset-x-0 flex flex-col items-center gap-3 px-4">
        {active && (
          <div className={`${glass} pointer-events-auto rounded-2xl w-[min(94vw,430px)] p-4`} style={{ animation: 'fadeUp .35s ease-out' }}>
            <div className="flex items-baseline justify-between">
              <span className="font-display text-lg text-[#F4F7FF]">{active.name}</span>
              <span className="font-mono-tech text-[9px] tracking-[0.2em] uppercase text-[#7BA4FF]">{active.chapter}</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#94A3B8]">{active.blurb}</p>
            <div className="mt-3 flex gap-x-5 gap-y-1 flex-wrap">
              {active.facts.slice(0, 3).map((f) => (
                <div key={f.label}><div className="font-mono-tech text-[8px] tracking-[0.16em] text-[#475569]">{f.label}</div><div className="font-mono-tech text-[10px] text-[#F4F7FF]">{f.value}</div></div>
              ))}
            </div>
            {world && (
              <div className="mt-4 flex items-center gap-2">
                <button onClick={() => p.onTravel(world.id)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#7BA4FF]/20 hover:bg-[#7BA4FF]/35 border border-[#7BA4FF]/55 text-xs tracking-[0.15em] uppercase text-[#F4F7FF] cursor-pointer transition-colors">
                  <Rocket className="w-3.5 h-3.5" /> Travel to {world.name}
                </button>
                <button onClick={() => p.onTravel(world.id, true)} title={`Skip the flight and land on ${world.name} straight away`} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full border border-white/15 hover:border-white/40 text-[11px] text-[#94A3B8] hover:text-[#F4F7FF] cursor-pointer transition-colors">
                  <FastForward className="w-3.5 h-3.5" /> Skip flight
                </button>
              </div>
            )}
          </div>
        )}
        <div className={`${glass} pointer-events-auto flex items-center gap-1 overflow-x-auto no-scrollbar p-1.5 rounded-2xl max-w-full`}>
          {[{ id: 'sun', name: 'Sol' }, ...SOLAR_BODIES].map((b) => (
            <button key={b.id} onClick={() => p.onFocus(b.id)} className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap cursor-pointer transition-all border ${p.focusId === b.id ? 'bg-[#7BA4FF]/20 text-[#F4F7FF] border-[#7BA4FF]/50' : 'text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-white/[0.05] border-transparent'}`}>
              {b.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
