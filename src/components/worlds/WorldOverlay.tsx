import { ArrowLeft, Compass, FastForward, Navigation, Rocket } from 'lucide-react';
import { cosmicAudio } from '../../utils/cosmicAudio';
import { ObservatoryPanel } from './Observatory';
import { useEffect, useState } from 'react';
import type { WorldPhase } from './WorldScene';
import type { WorldDef } from './worldData';

const INSIDE_RADIUS = 40;
const SIGNAL_RADIUS = 160;

interface Props {
  def: WorldDef;
  phase: WorldPhase;
  travelP: number;
  dist: number;
  onEnter: () => void;
  onBackToWorld: () => void;
  onLeave: () => void;
  onSkipTravel: () => void;
  onFly: () => void;
}

const glass =
  'rounded-2xl bg-[#080B16]/60 border border-white/[0.09] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)]';

export function WorldOverlay({ def, phase, travelP, dist, onEnter, onBackToWorld, onLeave, onSkipTravel, onFly }: Props) {
  const [veil, setVeil] = useState(1);
  const [caption, setCaption] = useState(true);

  // fade the planet-coloured veil away once we've arrived
  useEffect(() => {
    if (phase === 'arrive') {
      const a = requestAnimationFrame(() => setVeil(0));
      const b = setTimeout(() => setCaption(false), 3800);
      return () => { cancelAnimationFrame(a); clearTimeout(b); };
    }
  }, [phase]);

  const travelVeil = phase === 'travel' ? Math.max(0, (travelP - 0.86) / 0.14) : veil;
  const inside = phase === 'explore' && dist < INSIDE_RADIUS;
  const signal = phase === 'explore' && !inside && dist < SIGNAL_RADIUS;
  const remainingAu = (def.au * (1 - travelP)).toFixed(def.au > 0 ? 2 : 0);

  return (
    <div className="fixed inset-0 z-30 pointer-events-none font-mono-tech">
      {/* veil */}
      <div
        className="absolute inset-0"
        style={{
          background: def.planetB,
          opacity: travelVeil,
          transition: phase === 'travel' ? 'none' : 'opacity 2.2s ease-out',
        }}
      />

      {/* TRAVEL */}
      {phase === 'travel' && (
        <div className="absolute inset-x-0 bottom-14 flex flex-col items-center gap-3">
          <div className={`${glass} px-6 py-4 w-[min(92vw,420px)]`}>
            <div className="flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-[#94A3B8]">
              <Rocket className="w-3.5 h-3.5 text-[#7BA4FF]" />
              Travelling to {def.name}
            </div>
            <div className="mt-2 flex items-end justify-between text-[#F4F7FF]">
              <span className="text-2xl font-display">{def.glyph} {def.name}</span>
              <span className="text-xs text-[#94A3B8]">{def.au > 0 ? `${remainingAu} AU remaining` : 'Entering the corona'}</span>
            </div>
            <div className="mt-3 h-[3px] rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-[#7BA4FF]" style={{ width: `${travelP * 100}%` }} />
            </div>
          </div>
          <button
            onClick={onSkipTravel}
            className={`${glass} pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full text-[11px] tracking-[0.2em] uppercase text-[#94A3B8] hover:text-[#F4F7FF] hover:border-[#7BA4FF]/60 cursor-pointer transition-colors`}
            title="Skip the journey and land on the planet"
          >
            <FastForward className="w-3.5 h-3.5" /> Skip journey
          </button>
        </div>
      )}

      {/* ARRIVAL CAPTION */}
      {phase !== 'travel' && caption && (
        <div className="absolute inset-x-0 top-[22%] text-center px-6 transition-opacity duration-1000" style={{ opacity: phase === 'arrive' ? 1 : 0 }}>
          <div className="text-[11px] tracking-[0.4em] uppercase text-[#94A3B8]">Arrival</div>
          <div className="mt-2 text-4xl sm:text-5xl font-display text-[#F4F7FF]">{def.name}</div>
          <div className="mt-3 text-sm text-[#cbd5e1] max-w-md mx-auto">{def.intro}</div>
        </div>
      )}

      {/* EXPLORATION HUD */}
      {(phase === 'explore' || phase === 'arrive') && (
        <>
          <div className={`${glass} pointer-events-auto absolute top-3 left-3 sm:top-5 sm:left-5 px-3 py-2 sm:px-4 sm:py-3 max-w-[52vw] sm:max-w-[300px]`}>
            <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[#7BA4FF]">
              <Compass className="w-3.5 h-3.5" /> Exploration · {def.name}
            </div>
            <div className="mt-1.5 text-xs text-[#F4F7FF]">{def.objective}</div>
            <div className="mt-1 text-[11px] text-[#94A3B8] hidden sm:block">{def.hint}</div>
            <div className="mt-1.5 text-[11px] text-[#94A3B8] hidden sm:block">
              Short on time? Press <b className="text-[#F4F7FF]">O</b> to fly straight to the {def.station.name}.
            </div>
          </div>

          <div className="absolute top-3 right-3 sm:top-5 sm:right-5 flex flex-col items-end gap-2 pointer-events-none">
            <button
              onClick={onLeave}
              className={`${glass} pointer-events-auto flex items-center gap-2 px-3.5 py-2 text-xs text-[#94A3B8] hover:text-[#F4F7FF] cursor-pointer`}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Solar System</span><span className="sm:hidden">Back</span> <span className="text-[10px] px-1.5 rounded bg-white/10">ESC</span>
            </button>
            {(phase === 'explore' || phase === 'arrive') && !inside && (
              <button
                onClick={onFly}
                className={`${glass} station-call pointer-events-auto flex items-center gap-2 px-3.5 py-2 text-xs cursor-pointer hover:scale-[1.03] transition-transform`}
                style={{ color: def.station.accent, borderColor: def.station.accent + '88', '--accent': def.station.accent } as React.CSSProperties}
                title={`Fly straight to the ${def.station.name}`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Go to {def.station.name}</span>
                <span className="sm:hidden">Observatory</span>
                <span className="hidden sm:inline text-[10px] px-1.5 rounded bg-white/10 text-[#F4F7FF]">O</span>
              </button>
            )}
          </div>

          <div className={`${glass} absolute bottom-5 left-5 px-4 py-2.5 text-[11px] text-[#94A3B8] hidden sm:block`}>
            <b className="text-[#F4F7FF]">WASD</b> move · <b className="text-[#F4F7FF]">Drag</b> look ·{' '}
            <b className="text-[#F4F7FF]">Space/E</b> up · <b className="text-[#F4F7FF]">Q/C</b> down ·{' '}
            <b className="text-[#F4F7FF]">Shift</b> boost
          </div>

          <button
            className={`${glass} pointer-events-auto absolute bottom-6 right-6 sm:hidden px-5 py-4 text-xs text-[#F4F7FF] active:bg-[#7BA4FF]/30 touch-none select-none`}
            onPointerDown={() => window.dispatchEvent(new CustomEvent('world-thrust', { detail: true }))}
            onPointerUp={() => window.dispatchEvent(new CustomEvent('world-thrust', { detail: false }))}
            onPointerLeave={() => window.dispatchEvent(new CustomEvent('world-thrust', { detail: false }))}
          >
            HOLD TO FLY
          </button>

          {/* subtle signal hint — no name, no marker until you are close */}
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.3em] uppercase text-[#94A3B8] transition-opacity duration-700"
            style={{ opacity: signal ? 1 : 0 }}
          >
            Unknown structure detected · {dist} m
          </div>
        </>
      )}

      {/* DISCOVERY */}
      {inside && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${glass} pointer-events-auto w-[min(92vw,460px)] px-6 sm:px-10 py-6 sm:py-8 text-center animate-[fadeUp_.8s_ease-out]`} style={{ borderColor: def.station.accent + '88' }}>
            <div className="text-[11px] tracking-[0.5em] uppercase text-[#94A3B8]">You are inside…</div>
            <div className="mt-3 text-2xl sm:text-3xl font-display text-[#F4F7FF]">{def.station.name}</div>
            <button
              onClick={() => { cosmicAudio.uiClick(); onEnter(); }}
              className="mt-6 px-8 py-2.5 rounded-full text-sm tracking-[0.35em] text-[#F4F7FF] cursor-pointer transition-all hover:scale-105"
              style={{ border: `1px solid ${def.station.accent}`, boxShadow: `0 0 28px ${def.station.accent}55`, background: def.station.accent + '22' }}
            >
              [ ENTER ]
            </button>
          </div>
        </div>
      )}

      {/* OBSERVATORY (portfolio) */}
      {phase === 'portfolio' && <ObservatoryPanel def={def} onBack={onBackToWorld} onLeave={onLeave} />}
    </div>
  );
}
