import { VolumeX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { cosmicAudio } from '../utils/cosmicAudio';

/**
 * The sound switch. Mounted once at the root, so it is on screen in every view:
 * the sky, the orrery, the journeys, the worlds, the observatory panels and Quick View.
 * Shortcut: [M].
 */
export function AudioButton() {
  const [on, setOn] = useState(false);
  const [nudge, setNudge] = useState(true);

  const toggle = useCallback(() => {
    setOn(cosmicAudio.toggle());
    setNudge(false);
  }, []);

  // the little "Sound?" label fades away on its own
  useEffect(() => {
    const t = window.setTimeout(() => setNudge(false), 16000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey) toggle();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [toggle]);

  return (
    <div
      data-ui
      className="group fixed z-[70] left-3 top-[30%] sm:left-auto sm:right-5 sm:top-1/2 sm:-translate-y-1/2 flex items-center"
    >
      {/* label — shown on hover, and as a gentle nudge until the first click */}
      <span
        className={`pointer-events-none absolute right-full mr-3 hidden sm:block whitespace-nowrap rounded-full border border-white/10 bg-[#080B16]/80 backdrop-blur-xl px-3 py-1.5 font-mono-tech text-[10px] tracking-[0.18em] uppercase text-[#cbd5e1] transition-all duration-500 ${
          nudge && !on ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
        }`}
      >
        {on ? 'Sound on · M' : 'Turn sound on · M'}
      </span>

      <button
        onClick={toggle}
        aria-label={on ? 'Mute sound' : 'Turn sound on'}
        aria-pressed={on}
        title={on ? 'Sound on — click to mute (M)' : 'Sound off — click to enable (M)'}
        className={`relative h-11 w-11 grid place-items-center rounded-full border backdrop-blur-xl cursor-pointer transition-all duration-300 active:scale-95 ${
          on
            ? 'bg-[#0a1830]/85 border-[#38BDF8]/60 text-[#F4F7FF] shadow-[0_0_22px_rgba(56,189,248,0.35)]'
            : 'bg-[#080B16]/70 border-white/15 text-[#94A3B8] hover:text-[#F4F7FF] hover:border-white/35'
        }`}
      >
        {nudge && !on && (
          <span className="absolute inset-0 rounded-full border border-[#7BA4FF]/70" style={{ animation: 'ringPulse 2s ease-out infinite' }} />
        )}
        {on ? (
          <span className="flex items-end gap-[3px] h-4" aria-hidden>
            {[0, 0.25, 0.1, 0.4].map((d, i) => (
              <span
                key={i}
                className="w-[3px] h-full rounded-full bg-[#38BDF8] origin-bottom"
                style={{ animation: `eq ${0.9 + i * 0.17}s ease-in-out ${d}s infinite` }}
              />
            ))}
          </span>
        ) : (
          <VolumeX className="w-[18px] h-[18px]" />
        )}
      </button>
    </div>
  );
}
