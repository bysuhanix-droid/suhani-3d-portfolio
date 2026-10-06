import { Canvas } from '@react-three/fiber';
import {
  Compass,
  Eye,
  EyeOff,
  Orbit,
  Sliders,
  Sparkles,
  Sun as SunIcon,
  ChevronDown,
  ChevronUp,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  CELESTIAL_TARGETS,
  CelestialRig,
  type TelemetryData,
} from './components/CelestialRig';
import { MilkyWayGalaxy } from './components/MilkyWayGalaxy';
import {
  type MeteorFrequencyMode,
  ShootingStars,
} from './components/ShootingStars';
import { StarField } from './components/StarField';
import { SuhaniConstellationAura } from './components/SuhaniConstellationAura';
import { SolarHud } from './components/solar/SolarHud';
import { SolarSystemScene } from './components/solar/SolarSystem';
import { cosmicAudio } from './utils/cosmicAudio';
import { TravelScene, WorldScene, type WorldPhase } from './components/worlds/WorldScene';
import { WorldOverlay } from './components/worlds/WorldOverlay';
import { Chatbot, type ChatWhere } from './components/Chatbot';
import { AudioButton } from './components/AudioButton';
import { QuickView } from './components/QuickView';
import { getWorld } from './components/worlds/worldData';
import type { QuickPage } from './components/QuickView';

// Default 3D Space Parameters (Fixed at default values as requested)
const DEFAULT_STAR_COUNT = 14000;
const DEFAULT_TWINKLE_INTENSITY = 1.15;
const DEFAULT_CORE_GLOW_INTENSITY = 1.15;
const DEFAULT_METEOR_FREQUENCY: MeteorFrequencyMode = 'perseids';

const TIME_SCALES = [0.25, 0.5, 1, 2, 4];

export function App() {
  // Initial state: false = "Suhani" formed by stars on blank cosmic screen; true = spreads into full galaxy
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [hudVisible, setHudVisible] = useState<boolean>(false);

  const [manualMeteorCount, setManualMeteorCount] = useState<number>(0);
  const [observedMeteors, setObservedMeteors] = useState<number>(0);

  // Camera & HUD State
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>('galactic-core');
  const [showGuides, setShowGuides] = useState<boolean>(false);
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(true);
  const [quickOpen, setQuickOpen] = useState<boolean>(false);

  // ☀️ Solar System (Orrery) State
  const [solarMode, setSolarMode] = useState<boolean>(false);
  const [solarHudVisible, setSolarHudVisible] = useState<boolean>(false);
  const [veilKey, setVeilKey] = useState<number>(0);
  const [solarFocusId, setSolarFocusId] = useState<string | null>(null);
  const [solarPaused, setSolarPaused] = useState<boolean>(false);
  const [solarTimeScaleIdx, setSolarTimeScaleIdx] = useState<number>(2);
  const [showOrbits, setShowOrbits] = useState<boolean>(false);
  const [showSolarLabels, setShowSolarLabels] = useState<boolean>(false);
  const [showBelt, setShowBelt] = useState<boolean>(false);

  // 🪐 Explorable worlds: travel → arrive → explore → (discover) → portfolio
  const [worldId, setWorldId] = useState<string | null>(null);
  const [worldPhase, setWorldPhase] = useState<WorldPhase>('travel');
  const [travelP, setTravelP] = useState<number>(0);
  const [worldDist, setWorldDist] = useState<number>(9999);
  const [flyKey, setFlyKey] = useState<number>(0);
  const [quickPage, setQuickPage] = useState<QuickPage>('home');
  const world = getWorld(worldId);

  // "Travel" plays the cinematic journey; "Skip" (skip = true) only skips that journey and lands you
  // on the planet in free-flight — it never fast-forwards to the observatory.
  const beginWorld = useCallback((id: string, skip = false) => {
    setFlyKey(0);
    setWorldDist(9999);
    setTravelP(0);
    setWorldPhase(skip ? 'arrive' : 'travel');
    setWorldId(id);
    if (skip) cosmicAudio.skipWhoosh();
    else cosmicAudio.travelStart(id, getWorld(id)?.travel ?? 5);
  }, []);

  // Skip just the transition while it is playing
  const skipTravel = useCallback(() => {
    cosmicAudio.skipWhoosh();
    setWorldPhase('arrive');
  }, []);

  // Leaving a world returns to the whole orrery — never re-focus the planet we just left
  const leaveWorld = useCallback(() => {
    setWorldId(null);
    setSolarFocusId(null);
    setVeilKey((k) => k + 1);
    cosmicAudio.leaveWorld();
  }, []);

  const handleTravelDone = useCallback(() => setWorldPhase('arrive'), []);

  // After landing: a short arrival beat, then free flight. (No automatic jump to the observatory.)
  useEffect(() => {
    if (worldPhase !== 'arrive') return;
    const timer = setTimeout(() => setWorldPhase('explore'), 3200);
    return () => clearTimeout(timer);
  }, [worldPhase]);

  // Fly the camera to the observatory (button / [O])
  const flyToStation = useCallback(() => {
    cosmicAudio.flyToStation();
    setFlyKey((k) => k + 1);
  }, []);

  // Chat / planet-chip navigation helpers
  const focusPlanet = useCallback((id: string) => {
    setSolarFocusId(id);
    cosmicAudio.planetSelect(id);
  }, []);

  // Live Celestial Coordinates
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    ra: '17h 45m 40s',
    dec: '-29° 00\' 28"',
    galLon: '359.9°',
    galLat: '-0.0°',
    fov: '60°',
  });

  const handleExpandIntoGalaxy = useCallback(() => {
    if (!isExpanded) {
      setIsExpanded(true);
      cosmicAudio.playConstellationBloom();
    }
  }, [isExpanded]);

  const handleReformConstellation = useCallback(() => {
    setHudVisible(false);
    setIsExpanded(false);
    setSelectedTargetId('galactic-core');
  }, []);

  // Reveal Observatory HUD smoothly as the stars finish spreading into the galaxy
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        setHudVisible(true);
      }, 1600);
      return () => clearTimeout(timer);
    } else {
      setHudVisible(false);
    }
  }, [isExpanded]);

  const triggerShootingStar = useCallback(() => {
    setManualMeteorCount((prev) => prev + 1);
  }, []);

  const handleMeteorObserved = useCallback(() => {
    setObservedMeteors((prev) => prev + 1);
  }, []);

  // ☀️ Enter / leave the Sol orrery
  const handleEnterSolarSystem = useCallback(() => {
    if (!isExpanded) return;
    setSolarMode(true);
    setSolarHudVisible(false);
    setSolarFocusId(null);
    setVeilKey((k) => k + 1);
    cosmicAudio.playWarpSwell(true);
  }, [isExpanded]);

  const handleExitSolarSystem = useCallback(() => {
    setSolarMode(false);
    setSolarHudVisible(false);
    setVeilKey((k) => k + 1);
    cosmicAudio.playWarpSwell(false);
  }, []);

  useEffect(() => {
    if (!solarMode) return;
    const timer = setTimeout(() => setSolarHudVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [solarMode]);

  // Keyboard shortcuts: [Space] launches a shooting star (or expands intro), [H] toggles Zen Mode, [G] toggles Celestial Guides, [S] enters the Sol Orrery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (quickOpen || ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (!isExpanded) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleExpandIntoGalaxy();
        }
        return;
      }

      if (worldId) {
        if (e.key === 'Escape') {
          if (worldPhase === 'portfolio') setWorldPhase('explore');
          else leaveWorld();
        } else if ((e.key === 'o' || e.key === 'O') && (worldPhase === 'explore' || worldPhase === 'arrive')) {
          flyToStation();
        }
        return;
      }

      if (solarMode) {
        if (e.key === 'Escape' || e.key === 's' || e.key === 'S') {
          handleExitSolarSystem();
        } else if (e.code === 'Space') {
          e.preventDefault();
          setSolarPaused((prev) => !prev);
        } else if (e.key === 'o' || e.key === 'O') {
          setShowOrbits((prev) => !prev);
        }
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) {
        if (e.code !== 'Space') return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        triggerShootingStar();
      } else if (e.key === 'h' || e.key === 'H') {
        setZenMode((prev) => !prev);
      } else if (e.key === 'g' || e.key === 'G') {
        setShowGuides((prev) => !prev);
      } else if (e.key === 's' || e.key === 'S') {
        handleEnterSolarSystem();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isExpanded,
    solarMode,
    worldId,
    worldPhase,
    leaveWorld,
    flyToStation,
    quickOpen,
    handleExpandIntoGalaxy,
    triggerShootingStar,
    handleEnterSolarSystem,
    handleExitSolarSystem,
  ]);

  const activeTarget = CELESTIAL_TARGETS.find((t) => t.id === selectedTargetId);

  /* ---------------- 🔊 every place gets its own soundscape ---------------- */
  useEffect(() => {
    let id = 'sky';
    if (worldId && worldPhase !== 'travel') id = worldId;
    else if (worldId || solarMode) id = 'solar'; // during the journey the orrery bed stays (ducked)
    cosmicAudio.setScene(id);
  }, [worldId, worldPhase, solarMode]);

  // landing on a world → that planet's arrival stinger
  useEffect(() => {
    if (worldId && worldPhase === 'arrive') cosmicAudio.arrive(worldId);
  }, [worldId, worldPhase]);

  // observatory door open / close
  const prevPhase = useRef<WorldPhase>('travel');
  useEffect(() => {
    if (!worldId) { prevPhase.current = 'travel'; return; }
    if (worldPhase === 'portfolio') cosmicAudio.observatoryOpen(worldId);
    else if (prevPhase.current === 'portfolio') cosmicAudio.observatoryClose();
    prevPhase.current = worldPhase;
  }, [worldId, worldPhase]);

  // standing at the station door
  const insideStation = worldPhase === 'explore' && worldDist < 40;
  useEffect(() => {
    if (worldId && insideStation) cosmicAudio.discover();
  }, [worldId, insideStation]);

  const openQuick = useCallback(() => { cosmicAudio.quickOpen(); setQuickOpen(true); }, []);
  const closeQuick = useCallback(() => { cosmicAudio.quickClose(); setQuickOpen(false); }, []);

  /* ---------------- 🤖 Nova: where am I, and take me there ---------------- */
  const chatWhere: ChatWhere = quickOpen
    ? { screen: 'quick', quickPage }
    : !isExpanded
      ? { screen: 'intro' }
      : worldId
        ? { screen: worldPhase === 'travel' ? 'travel' : worldPhase === 'portfolio' ? 'observatory' : 'world', worldId, inside: insideStation }
        : solarMode
          ? { screen: 'solar', focusId: solarFocusId }
          : { screen: 'sky', target: activeTarget?.name ?? null };

  const chatTravel = useCallback((id: string) => {
    setQuickOpen(false);
    if (!isExpanded) return;
    if (!solarMode) { setSolarMode(true); setSolarHudVisible(false); setSolarFocusId(null); }
    if (worldId === id) { setWorldPhase('explore'); return; }
    beginWorld(id);
  }, [isExpanded, solarMode, worldId, beginWorld]);

  const chatSolar = useCallback(() => {
    setQuickOpen(false);
    if (worldId) leaveWorld();
    else if (!solarMode) handleEnterSolarSystem();
  }, [worldId, solarMode, leaveWorld, handleEnterSolarSystem]);

  const chatEnterStation = useCallback(() => {
    if (worldId && insideStation) setWorldPhase('portfolio');
    else if (worldId && (worldPhase === 'explore' || worldPhase === 'arrive')) flyToStation();
  }, [worldId, insideStation, worldPhase, flyToStation]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020308] select-none">
      {/* ============================================================
          🌌 100% FULL-VIEWPORT WEBGL DEEP-SPACE CANVAS
          ============================================================ */}
      <div className="fixed inset-0 z-0">
        <Canvas
          camera={{
            position: [0, 0, 8],
            fov: 60,
            near: 0.1,
            far: 200,
          }}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            alpha: false,
          }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#020308']} />

          {/* Subtle Constellation Stardust Aura behind "Suhani" before expansion */}
          <SuhaniConstellationAura isExpanded={isExpanded} />

          {/* Procedural Volumetric Milky Way Galactic Band + 24,000 Resolved Core Stars */}
          {!worldId && (
            <MilkyWayGalaxy
              coreGlowIntensity={DEFAULT_CORE_GLOW_INTENSITY}
              isExpanded={isExpanded}
            />
          )}

          {/* Multi-Spectral Twinkling Starfield (O, B, A, F, G, K, M classes + Airy Diffraction) */}
          {!worldId && (
            <StarField
              starCount={DEFAULT_STAR_COUNT}
              twinkleIntensity={DEFAULT_TWINKLE_INTENSITY}
              magnitudeBoost={1.05}
              isExpanded={isExpanded}
            />
          )}

          {/* Distant Realistic Shooting Stars & Bolide Meteor Shower */}
          <ShootingStars
            frequencyMode={DEFAULT_METEOR_FREQUENCY}
            manualTriggerCount={manualMeteorCount}
            onMeteorObserved={handleMeteorObserved}
            enabled={isExpanded && !solarMode && !worldId}
          />

          {/* Orbital Camera Rig, Motorized Slew & 3D Celestial Markers */}
          {!solarMode && (
            <CelestialRig
              autoRotate={autoRotate}
              autoRotateSpeed={0.22}
              selectedTargetId={selectedTargetId}
              onClearTarget={() => setSelectedTargetId(null)}
              showGuides={showGuides && !zenMode && hudVisible}
              onSelectGuideTarget={(id) => setSelectedTargetId(id)}
              onUpdateTelemetry={setTelemetry}
              isExpanded={isExpanded}
            />
          )}

          {/* ☀️ Hyper-Real Procedural Sol System: burning star, 8 worlds, rings, moons & main belt */}
          {solarMode && !worldId && (
            <Suspense fallback={null}>
              <SolarSystemScene
                focusId={solarFocusId}
                onFocus={focusPlanet}
                onUserInteract={() => undefined}
                timeScale={TIME_SCALES[solarTimeScaleIdx]}
                paused={solarPaused}
                showOrbits={showOrbits}
                showLabels={showSolarLabels}
                showBelt={showBelt}
              />
            </Suspense>
          )}

          {/* 🪐 Cinematic journey, then the explorable world */}
          {world && worldPhase === 'travel' && (
            <TravelScene key={`t-${world.id}`} def={world} onProgress={setTravelP} onDone={handleTravelDone} />
          )}
          {world && worldPhase !== 'travel' && (
            <Suspense fallback={null}>
              <WorldScene key={`w-${world.id}`} def={world} phase={worldPhase} onDist={setWorldDist} flyKey={flyKey} />
            </Suspense>
          )}
        </Canvas>
      </div>

      {/* Subtle Optical Lens Vignette */}
      <div className="fixed inset-0 z-10 pointer-events-none observatory-vignette" />

      {/* Warp veil covering the transition between the sky and the orrery */}
      {veilKey > 0 && (
        <div
          key={veilKey}
          className="fixed inset-0 z-40 pointer-events-none solar-veil bg-[#020308]"
        />
      )}

      {/* ============================================================
          ✨ INITIAL COSMIC STAR FORMATION ("Suhani") CLICK OVERLAY
          ============================================================ */}
      {!isExpanded && (
        <div
          onClick={handleExpandIntoGalaxy}
          role="button"
          tabIndex={0}
          aria-label="Click to expand Suhani star constellation into the galaxy"
          className="fixed inset-0 z-30 flex flex-col items-center justify-end pb-14 sm:pb-16 cursor-pointer group"
        >
          <div className="flex flex-col items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#080B16]/45 border border-white/10 group-hover:border-[#7BA4FF]/45 backdrop-blur-md transition-all duration-500 shadow-[0_0_30px_rgba(123,164,255,0.12)] group-hover:shadow-[0_0_36px_rgba(123,164,255,0.28)]">
            <div className="flex items-center gap-2.5 text-xs font-mono-tech tracking-[0.2em] uppercase text-[#94A3B8] group-hover:text-[#F4F7FF] transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-[#7BA4FF] animate-pulse" />
              <span>Click anywhere to unfold the galaxy</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          🛰️ ZEN MODE RESTORE PILL (Only visible when Zen Mode is active)
          ============================================================ */}
      {isExpanded && zenMode && !solarMode && (
        <div className="fixed top-6 right-6 z-30">
          <button
            onClick={() => setZenMode(false)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#080B16]/55 hover:bg-[#080B16]/85 border border-white/10 hover:border-[#7BA4FF]/50 backdrop-blur-md text-xs font-mono-tech text-[#94A3B8] hover:text-[#F4F7FF] transition-all cursor-pointer shadow-lg"
            title="Restore Observatory HUD (Press H)"
          >
            <Eye className="w-3.5 h-3.5 text-[#7BA4FF]" />
            <span>Exit Zen Mode [H]</span>
          </button>
        </div>
      )}

      {/* ============================================================
          ☀️ SOL ORRERY HUD
          ============================================================ */}
      {solarMode && !worldId && (
        <SolarHud
        onTravel={beginWorld}
          visible={solarHudVisible}
          focusId={solarFocusId}
          onFocus={focusPlanet}
          onExit={handleExitSolarSystem}
          paused={solarPaused}
          onTogglePause={() => setSolarPaused((p) => !p)}
          timeScale={TIME_SCALES[solarTimeScaleIdx]}
          onCycleTimeScale={() =>
            setSolarTimeScaleIdx((i) => (i + 1) % TIME_SCALES.length)
          }
          showOrbits={showOrbits}
          onToggleOrbits={() => setShowOrbits((v) => !v)}
          showLabels={showSolarLabels}
          onToggleLabels={() => setShowSolarLabels((v) => !v)}
          showBelt={showBelt}
          onToggleBelt={() => setShowBelt((v) => !v)}
        />
      )}

      {world && (
        <WorldOverlay
          def={world}
          phase={worldPhase}
          travelP={travelP}
          dist={worldDist}
          onEnter={() => setWorldPhase('portfolio')}
          onBackToWorld={() => setWorldPhase('explore')}
          onLeave={leaveWorld}
          onSkipTravel={skipTravel}
          onFly={flyToStation}
        />
      )}

      {/* Always-on shortcuts: plain-page portfolio + Nova the assistant */}
      {isExpanded && !zenMode && (
        <>
          <button
            onClick={openQuick}
            className="fixed right-3 top-[44%] sm:right-auto sm:top-5 sm:left-1/2 sm:-translate-x-1/2 z-40 flex items-center justify-center gap-2 h-12 w-12 sm:h-auto sm:w-auto sm:px-3.5 sm:py-2 rounded-full bg-[#080B16]/70 hover:bg-[#0c1428]/90 border border-white/15 hover:border-[#7BA4FF]/60 backdrop-blur-xl text-xs text-[#F4F7FF] cursor-pointer transition-all"
            title="No time to explore? See everything on one simple page"
          >
            <FileText className="w-3.5 h-3.5 text-[#7BA4FF]" />
            <span className="hidden sm:inline">Quick View</span>
          </button>
          <Chatbot
            where={chatWhere}
            onTravel={chatTravel}
            onSolar={chatSolar}
            onQuickView={openQuick}
            onStation={chatEnterStation}
          />
        </>
      )}
      {quickOpen && <QuickView onClose={closeQuick} onPage={setQuickPage} />}

      {/* Sound control — always on screen, in every view */}
      <AudioButton />

      {/* ============================================================
          🔭 FLOATING PERIPHERAL OBSERVATORY HUD (<10% Viewport Area)
          ============================================================ */}
      <div
        className={`fixed inset-0 z-20 pointer-events-none transition-[opacity,visibility] duration-700 ${
          !hudVisible || zenMode || solarMode
            ? 'opacity-0 invisible pointer-events-none'
            : 'opacity-100 visible'
        }`}
      >
        {/* TOP BAR: Left Telemetry Readout & Right Quick Actions */}
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          {/* Top-Left Astronomical Telemetry Pill */}
          <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl bg-[#080B16]/60 border border-white/[0.08] backdrop-blur-xl px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono-tech text-[11px] text-[#94A3B8]">
              <div>
                <span className="text-[#475569] mr-1">RA</span>
                <span className="text-[#F4F7FF]">{telemetry.ra}</span>
              </div>
              <div>
                <span className="text-[#475569] mr-1">DEC</span>
                <span className="text-[#F4F7FF]">{telemetry.dec}</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-[#475569] mr-1">GAL</span>
                <span className="text-[#7BA4FF]">
                  l={telemetry.galLon} b={telemetry.galLat}
                </span>
              </div>
              <div>
                <span className="text-[#475569] mr-1">STARS</span>
                <span className="text-[#F59E0B]">{(DEFAULT_STAR_COUNT + 24000).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Top-Right Quick Actions Pill */}
          <div className="pointer-events-auto flex items-center gap-2">
            {/* Enter the hyper-real Sol System orrery */}
            <button
              onClick={handleEnterSolarSystem}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#2a1405]/70 hover:bg-[#3a1d07]/90 border border-[#F59E0B]/35 hover:border-[#F59E0B]/75 backdrop-blur-xl text-xs font-medium text-[#F4F7FF] shadow-[0_0_24px_rgba(245,158,11,0.18)] hover:shadow-[0_0_28px_rgba(245,158,11,0.4)] transition-all cursor-pointer active:scale-95"
              title="Fly into the Sol System orrery (S)"
            >
              <SunIcon className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Solar System</span>
              <span className="hidden md:inline-block font-mono-tech text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[#94A3B8]">
                S
              </span>
            </button>

            <button
              onClick={triggerShootingStar}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#0c152c]/75 hover:bg-[#152347]/90 border border-[#38BDF8]/35 hover:border-[#38BDF8]/75 backdrop-blur-xl text-xs text-[#F4F7FF] transition-all cursor-pointer active:scale-95"
              title="Launch a shooting star (Space)"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="hidden lg:inline">Shooting star</span>
            </button>

            {/* Toggle Zen Mode (Hide HUD) */}
            <button
              onClick={() => setZenMode(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#080B16]/55 hover:bg-[#080B16]/80 border border-white/10 hover:border-white/25 backdrop-blur-xl text-xs text-[#94A3B8] hover:text-[#F4F7FF] transition-all cursor-pointer"
              title="Enter Unobstructed Zen Mode (Press H)"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Zen</span>
            </button>
          </div>
        </div>

        {/* BOTTOM BAR: Left/Center Celestial Presets & Bottom-Right Observatory Control Dock */}
        <div className="fixed bottom-5 inset-x-5 sm:bottom-6 sm:inset-x-6 flex flex-col md:flex-row items-stretch md:items-end justify-between gap-4 pointer-events-none">
          {/* Bottom-Left Celestial Region Slew Bar */}
          <div className="pointer-events-auto flex flex-col gap-2 max-w-2xl">
            {activeTarget && (
              <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#080B16]/55 border border-white/[0.07] backdrop-blur-md w-fit">
                <span className="font-mono-tech text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#7BA4FF]/15 text-[#7BA4FF]">
                  {activeTarget.designation}
                </span>
                <span className="text-xs text-[#94A3B8]">{activeTarget.description}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-[#080B16]/60 border border-white/[0.08] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
              {CELESTIAL_TARGETS.map((target) => {
                const isSelected = selectedTargetId === target.id;
                return (
                  <button
                    key={target.id}
                    onClick={() => setSelectedTargetId(target.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#7BA4FF]/20 text-[#F4F7FF] border border-[#7BA4FF]/50 shadow-[0_0_14px_rgba(123,164,255,0.25)]'
                        : 'text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-white/[0.05] border border-transparent'
                    }`}
                  >
                    {target.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom-Right Collapsible Observatory Controls Dock (with brightness, star density, twinkle, and meteor rate controls removed & kept at defaults) */}
          <div className="pointer-events-auto w-full md:w-[280px] rounded-2xl bg-[#080B16]/65 border border-white/[0.09] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.75)] overflow-hidden transition-all">
            {/* Header */}
            <button
              onClick={() => setDockCollapsed((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-white/[0.07] hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-[#7BA4FF]" />
                <span className="font-display text-xs font-medium uppercase tracking-[0.06em] text-[#F4F7FF]">
                  Observatory Controls
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono-tech text-[10px] text-[#475569]">
                  {observedMeteors} METEORS
                </span>
                {dockCollapsed ? (
                  <ChevronUp className="w-4 h-4 text-[#94A3B8]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
                )}
              </div>
            </button>

            {/* Collapsible Toggles */}
            {!dockCollapsed && (
              <div className="p-4 space-y-3 text-xs">
                {/* Equatorial Auto-Drift Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#94A3B8]">
                    <Orbit className="w-3.5 h-3.5 text-[#7BA4FF]" />
                    <span>Equatorial Auto-Drift</span>
                  </div>
                  <button
                    onClick={() => setAutoRotate((prev) => !prev)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                      autoRotate ? 'bg-[#7BA4FF]' : 'bg-white/15'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        autoRotate ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Launch Shooting Star */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#94A3B8]">
                    <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Shooting Star</span>
                  </div>
                  <button
                    onClick={triggerShootingStar}
                    className="px-2 py-0.5 rounded-lg bg-[#38BDF8]/15 hover:bg-[#38BDF8]/30 border border-[#38BDF8]/35 text-[10px] font-mono-tech text-[#F4F7FF] transition-all cursor-pointer"
                  >
                    LAUNCH · SPACE
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#94A3B8]">
                    <Compass className="w-3.5 h-3.5 text-[#7BA4FF]" />
                    <span>Celestial Guides</span>
                  </div>
                  <button
                    onClick={() => setShowGuides((prev) => !prev)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${showGuides ? 'bg-[#7BA4FF]' : 'bg-white/15'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${showGuides ? 'translate-x-4.5' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Fly into the Sol System */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#94A3B8]">
                    <SunIcon className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>Sol Orrery</span>
                  </div>
                  <button
                    onClick={handleEnterSolarSystem}
                    className="px-2 py-0.5 rounded-lg bg-[#F59E0B]/15 hover:bg-[#F59E0B]/30 border border-[#F59E0B]/35 text-[10px] font-mono-tech text-[#F4F7FF] transition-all cursor-pointer"
                  >
                    ENTER
                  </button>
                </div>

                {/* Reform "Suhani" Constellation Action */}
                <div className="pt-2 border-t border-white/[0.06]">
                  <button
                    onClick={handleReformConstellation}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-[#7BA4FF]/15 border border-white/[0.08] hover:border-[#7BA4FF]/40 text-[#94A3B8] hover:text-[#F4F7FF] transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#7BA4FF]" />
                    <span>Reform &ldquo;Suhani&rdquo; Stars</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
