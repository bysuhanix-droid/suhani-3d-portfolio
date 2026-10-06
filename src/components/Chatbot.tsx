import { ArrowUpRight, MapPin, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { P } from '../data/portfolioData';
import { cosmicAudio } from '../utils/cosmicAudio';
import { getWorld } from './worlds/worldData';

/**
 * Nova — the portfolio's mission guide.
 *
 *  • knows where you are in the portfolio (sky, orrery, a journey, a planet, an observatory, Quick View)
 *  • can take you places ("take me to Earth", "show me her projects")
 *  • small-talks, remembers your name and what you were just discussing
 *  • answers from portfolioData.ts, so it always matches the résumé
 *
 * It runs entirely in the browser. To plug in a real LLM, set VITE_CHAT_ENDPOINT to a serverless
 * function you control (never put an API key in browser code); it receives
 * { messages, context, where } and must return { reply }. Local answers are the fallback.
 */

/* ------------------------------ types ------------------------------ */

export interface ChatWhere {
  screen: 'intro' | 'sky' | 'solar' | 'travel' | 'world' | 'observatory' | 'quick';
  worldId?: string | null;
  inside?: boolean;
  focusId?: string | null;
  quickPage?: string;
  target?: string | null;
}

interface Props {
  where: ChatWhere;
  onTravel: (worldId: string) => void;
  onSolar: () => void;
  onQuickView: () => void;
  onStation: () => void;
}

interface Action { label: string; run?: () => void; href?: string; nav?: boolean }
interface Msg { id: number; from: 'me' | 'nova'; text: string; actions?: Action[] }
interface Reply { text: string; actions?: Action[]; topic?: string; chips?: string[]; auto?: Action }
interface Mem { name: string | null; topic: string | null; n: number; turns: number }

/* ------------------------------ helpers ------------------------------ */

const list = (a: string[]) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}` : a[0] ?? '');
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const STOP = new Set('the a an and or of to in on for is are was do does did you your tell me about what which who how can with has have any some it its this that she her suhani know use used using'.split(' '));
const first = P.name;

const SECTION_OF: Record<string, string> = {
  sun: 'About Me', mercury: 'Skills', venus: 'Experience', earth: 'Projects', mars: 'Research',
  jupiter: 'Achievements', saturn: 'Education', uranus: 'Certifications', neptune: 'Contact',
};
const VIEW_TITLE: Record<string, string> = {
  sun: 'Solar Log', mercury: 'Systems Diagnostics', venus: 'Flight Recorder', earth: 'Field Specimens',
  mars: 'Mission Reports', jupiter: 'Storm Records', saturn: 'Ring Ledger', uranus: 'The Archive', neptune: 'Transmission Console',
};
const QUICK_LABEL: Record<string, string> = { home: 'Home', about: 'About', skills: 'Skills', work: 'Projects', contact: 'Contact' };
const FACT: Record<string, string> = {
  sun: 'The Sun holds 99.86% of everything in the solar system by mass.',
  mercury: 'Mercury has almost no atmosphere, so its shadows are pitch black and its temperature swings by about 600 °C between night and day.',
  venus: 'Venus is hotter than Mercury (around 465 °C) because of its crushing carbon-dioxide atmosphere — and it spins backwards.',
  earth: 'Earth is the only place we know of with life, which is why the projects live here.',
  mars: 'Mars has Olympus Mons, a volcano roughly two and a half times the height of Everest.',
  jupiter: 'Jupiter\u2019s Great Red Spot is a storm wider than Earth that has been raging for centuries.',
  saturn: 'Saturn\u2019s rings are mostly water ice, and the planet is less dense than water.',
  uranus: 'Uranus rolls around the Sun on its side, tilted nearly 98°.',
  neptune: 'Neptune has the fastest winds in the solar system — supersonic, around 2,000 km/h.',
};
const JOKES = [
  'A SQL query walks into a bar, sees two tables and asks: "Can I join you?"',
  'Why don\u2019t astronauts get hungry right after launch? They\u2019ve just had a big launch.',
  'There are 10 kinds of people: those who understand binary and those who don\u2019t.',
  'I would tell you a UDP joke, but you might not get it.',
];

// planet / section keywords → world id
const WORLD_WORDS: [RegExp, string][] = [
  [/\b(sun|sol|star|about me|about suhani|about her)\b/, 'sun'],
  [/\b(mercury|skills?|tech stack|technologies|toolkit)\b/, 'mercury'],
  [/\b(venus|experience|bug bounty|work history)\b/, 'venus'],
  [/\b(earth|projects?)\b/, 'earth'],
  [/\b(mars|research|reports?)\b/, 'mars'],
  [/\b(jupiter|achievements?|awards?|hackathon|accomplishments?)\b/, 'jupiter'],
  [/\b(saturn|education|college|university|degree|studies)\b/, 'saturn'],
  [/\b(uranus|certifications?|certificates?|certs?)\b/, 'uranus'],
  [/\b(neptune|contact|get in touch|reach (out|her))\b/, 'neptune'],
];
const findWorld = (q: string) => WORLD_WORDS.find(([re]) => re.test(q))?.[1] ?? null;

function sectionSummary(id: string): string {
  switch (id) {
    case 'sun': return `${P.summary} ${P.facts.join('. ')}.`;
    case 'mercury': return `The toolkit: ${P.skills.map((g) => `${g.group.toLowerCase()} (${list(g.items.slice(0, 3).map(([n]) => n))}…)`).join('; ')}.`;
    case 'venus': return `Experience beyond the classroom: ${P.experience.map((e) => `${e.role.toLowerCase()} — ${e.org}`).join('; ')}.`;
    case 'earth': return `The ${P.projects.length} projects: ${P.projects.map((p) => `${p.name} (${p.date})`).join('; ')}.`;
    case 'mars': return `Experiments and findings: ${P.research.map((r) => r.title.toLowerCase()).join('; ')}.`;
    case 'jupiter': return `Highlights: ${P.achievements.map((a) => a.title).join('; ')}.`;
    case 'saturn': return `${P.education[0].degree} at ${P.education[0].school} (${P.education[0].period}). Coursework: ${list(P.education[0].courses)}.`;
    case 'uranus': return `Certifications: ${P.certs.map((c) => `${c.name} (${c.issuer})`).join('; ')}.`;
    case 'neptune': return `Email ${P.contact.email}, phone ${P.contact.phone}, plus GitHub and LinkedIn — and a message console to send a transmission.`;
    default: return '';
  }
}

/* -------------------------- where am I? -------------------------- */

function whereShort(w: ChatWhere): string {
  const wd = getWorld(w.worldId ?? null);
  switch (w.screen) {
    case 'intro': return 'Star name · start';
    case 'sky': return 'Observatory sky';
    case 'solar': return w.focusId && getWorld(w.focusId) ? `Solar System · ${getWorld(w.focusId)!.name}` : 'Solar System';
    case 'travel': return wd ? `En route → ${wd.name}` : 'In flight';
    case 'world': return wd ? `${wd.name} · exploring` : 'Exploring';
    case 'observatory': return wd ? `${wd.name} · ${wd.section}` : 'Observatory';
    case 'quick': return `Quick View · ${QUICK_LABEL[w.quickPage ?? 'home'] ?? 'Home'}`;
  }
}

function describeWhere(w: ChatWhere): string {
  const wd = getWorld(w.worldId ?? null);
  switch (w.screen) {
    case 'intro':
      return `You\u2019re at the very beginning — ${first}\u2019s name drawn in stars. Click anywhere and it unfolds into the galaxy.`;
    case 'sky':
      return `You\u2019re in the **observatory sky**, the home view of the portfolio${w.target ? `, currently pointed at ${w.target}` : ''}. From here, open the **Solar System** (top right, or press S): every planet is a section of ${first}\u2019s portfolio.`;
    case 'solar': {
      const f = getWorld(w.focusId ?? null);
      return `You\u2019re in the **Solar System**, the hub of the portfolio. ${f ? `You\u2019ve selected **${f.name}**, which holds **${f.section}** — hit Travel to go there (or Skip flight to land straight away).` : 'Pick a planet to see which section it holds.'}`;
    }
    case 'travel':
      return wd ? `You\u2019re mid-flight to **${wd.name}**, the planet that holds **${wd.section}**. You\u2019ll land in a few seconds — or press Skip journey.` : 'You\u2019re in hyperspace between planets.';
    case 'world':
      if (!wd) return 'You\u2019re exploring a planet.';
      return w.inside
        ? `You\u2019re standing at the **${wd.station.name}** on ${wd.name}, right at the door. Press the Enter button to open the **${wd.section}** section.`
        : `You\u2019re on **${wd.name}**, flying freely. The **${wd.section}** section is inside the **${wd.station.name}** somewhere out here — press **O** or the "Go to" button to fly straight there, or explore and find it yourself.`;
    case 'observatory':
      return wd ? `You\u2019re inside the **${wd.station.name}** on ${wd.name}, reading the **${wd.section}** section ("${VIEW_TITLE[wd.id]}").` : 'You\u2019re inside an observatory.';
    case 'quick':
      return `You\u2019re in **Quick View**, the plain-page version of the portfolio, on the **${QUICK_LABEL[w.quickPage ?? 'home'] ?? 'Home'}** page. Use the top menu (or ← →) to switch pages, and "Universe" to go back to space.`;
  }
}

function chipsFor(w: ChatWhere): string[] {
  switch (w.screen) {
    case 'intro': return ['What is this place?', 'Who is Suhani?'];
    case 'sky': return ['Where am I?', 'Take me to the Solar System', 'What can you do?', 'Show me her projects'];
    case 'solar': return ['Where am I?', 'What does each planet hold?', 'Take me to Earth', 'Tell me about Mars'];
    case 'travel': return ['Where am I?', 'What\u2019s on this planet?', 'Tell me a space fact'];
    case 'world': return ['Where am I?', 'How do I reach the observatory?', 'What is in this section?'];
    case 'observatory': return ['What is this section?', 'Where am I?', 'Take me to the Solar System', 'Contact Suhani'];
    case 'quick': return ['Where am I?', 'Download résumé', 'What are her skills?', 'Take me to the universe'];
  }
}

/* ------------------------------ the brain ------------------------------ */

const MORE: Record<string, (m: Mem) => Reply> = {
  projects: (m) => {
    const p = P.projects[m.n % P.projects.length];
    m.n += 1;
    return { text: `**${p.name}** (${p.date}) — ${p.points.join('; ')}.`, topic: 'projects', chips: ['Tell me more', 'Her skills', 'Take me to Earth'] };
  },
  skills: (m) => {
    const g = P.skills[m.n % P.skills.length];
    m.n += 1;
    return { text: `**${g.group}:** ${list(g.items.map(([n]) => n))}.`, topic: 'skills', chips: ['Tell me more', 'Show me her projects'] };
  },
  experience: () => ({ text: P.experience.map((e) => `**${e.org}** — ${e.points.join('; ')}.`).join('\n'), topic: 'experience' }),
  achievements: () => ({ text: P.achievements.map((a) => `**${a.title}** — ${a.detail}.`).join('\n'), topic: 'achievements' }),
  education: () => ({ text: `Coursework: ${list(P.education[0].courses)}.`, topic: 'education' }),
  about: () => ({ text: `${P.about[1]} ${P.facts.join('. ')}.`, topic: 'about' }),
  contact: () => ({ text: `Email is the fastest: ${P.contact.email}. You can also send a message from the Contact planet (Neptune) or the Contact page in Quick View.`, topic: 'contact' }),
};

type Ctx = { q: string; mem: Mem; where: ChatWhere; act: Omit<Props, 'where'> };

const go = (id: string, act: Ctx['act']): Action => ({ label: `Travel to ${getWorld(id)?.name ?? id}`, run: () => act.onTravel(id), nav: true });

function reply(c: Ctx): Reply {
  const { q, mem, where, act } = c;
  const has = (re: RegExp) => re.test(q);
  const wd = getWorld(where.worldId ?? null);

  // --- remember the visitor's name
  const nm = q.match(/\b(?:my name is|call me|name's)\s+([a-z][a-z'-]{1,20})\b/i);
  if (nm) {
    mem.name = nm[1][0].toUpperCase() + nm[1].slice(1);
    return { text: `Nice to meet you, ${mem.name}! Welcome aboard. Where would you like to start — projects, skills, or a flight to a planet?`, chips: ['Show me her projects', 'What are her skills?', 'Take me to Earth'] };
  }

  // --- follow-ups ("tell me more", "yes", "go on")
  if (has(/^(more|tell me more|go on|continue|and\??|yes( please)?|yeah|sure|ok(ay)?|details?|elaborate|more details?)\W*$/) && mem.topic && MORE[mem.topic]) {
    return MORE[mem.topic](mem);
  }

  // --- where am I / what is this
  if (has(/where (am i|are we|is this)|which (part|section|page|planet|place)|what (part|section|page|place|planet) (am i|is this)|what am i (looking at|seeing)|am i (on|in|at) |current (location|section|page)|what is this (place|page|section|screen)|what('s| is) this place/)) {
    return { text: describeWhere(where), chips: chipsFor(where).filter((x) => x !== 'Where am I?') };
  }
  if (has(/what('s| is) (in|on|here|inside)( this| the)?( section| page| planet| place)?\??$|what is (this )?section|what does this (section|page|planet) (have|hold|show|contain)/)) {
    if (wd) return { text: `**${wd.section}** — ${sectionSummary(wd.id)}`, topic: undefined };
    if (where.screen === 'quick') return { text: `This is the ${QUICK_LABEL[where.quickPage ?? 'home']} page of Quick View. ${describeWhere(where)}` };
    return { text: describeWhere(where) };
  }

  // --- "what does each planet hold?"
  if (has(/(what|which).*(planet|section|world)s?.*(hold|have|contain|mean|for)|each planet|map of|planet.*(guide|list)|sections?\b.*(list|all)|where is everything/) && !findWorld(q.replace(/planets?/, ''))) {
    return {
      text: `Each planet is one section:\n${Object.entries(SECTION_OF).map(([id, s]) => `${getWorld(id)?.glyph ?? ''} **${getWorld(id)?.name}** — ${s}`).join('\n')}`,
      chips: ['Take me to Earth', 'Tell me about Jupiter'],
    };
  }

  // --- navigation commands
  const strongGo = has(/\b(take|bring|fly|go|travel|warp|send|head|jump|navigate|teleport|lead|launch|visit)\b/);
  const weakGo = has(/\b(open|show|let'?s see)\b/);
  const planetNamed = has(/\b(sun|sol|mercury|venus|earth|mars|jupiter|saturn|uranus|neptune)\b/);
  if (strongGo || weakGo) {
    if (has(/quick ?view|plain|simple (page|version|site)|normal (page|site|version)|no[- ]frills|regular (site|page)/)) {
      return { text: 'Opening Quick View — the whole portfolio on one clean page.', auto: { label: 'Quick View', run: act.onQuickView, nav: true } };
    }
    if (has(/solar system|orrery|the map|planets? view|all planets/)) {
      if (where.screen === 'solar') return { text: 'You\u2019re already in the Solar System — pick a planet to see what it holds.' };
      return { text: 'Heading for the Solar System.', auto: { label: 'Solar System', run: act.onSolar, nav: true } };
    }
    if (has(/\b(universe|space|sky|galaxy)\b/) && where.screen === 'quick') {
      return { text: 'Back to the universe — close Quick View with the "Universe" button at the top right.' };
    }
    if (has(/observatory|station|base\b|archive|facility/)) {
      if (where.screen === 'world') {
        return { text: where.inside ? 'Opening it now.' : `Setting course for the ${wd?.station.name}.`, auto: { label: 'Go to station', run: act.onStation } };
      }
      if (!planetNamed && !findWorld(q)) {
        return { text: 'Every planet has its own station that holds its section. Land on a planet first, then press O and I\u2019ll fly you to it. Which planet should we visit?', chips: ['Take me to Earth', 'Take me to Mercury', 'What does each planet hold?'] };
      }
    }
    const target = findWorld(q);
    if (target && (strongGo || planetNamed)) {
      const w = getWorld(target)!;
      if (where.worldId === target && where.screen !== 'travel') return { text: `You\u2019re already on ${w.name}! ${describeWhere(where)}` };
      return { text: `Setting course for **${w.name}** — the ${w.section} section.`, auto: go(target, act) };
    }
  }

  // --- how do I reach the observatory
  if (has(/(reach|find|get to|enter|open|get into|locate|where is).*(observatory|station|\bbase\b|archive|facility|section)|how (do|can) i.*(portfolio|section|content|details)|skip button|skip/)) {
    if (where.screen === 'world' && wd) {
      return { text: `Fly toward the glowing structure, or press **O** / the "Go to ${wd.station.name}" button and I\u2019ll fly you there. When you\u2019re at the door, press Enter to read the ${wd.section} section.`, actions: [{ label: `Go to ${wd.station.name}`, run: act.onStation }] };
    }
    return { text: 'Pick a planet in the Solar System and travel there (or skip the flight). On every planet there\u2019s a hidden station that holds that planet\u2019s section — press **O** once you land and you\u2019ll be flown straight to it.', actions: [{ label: 'Open the Solar System', run: act.onSolar, nav: true }] };
  }

  // --- controls & sound
  if (has(/control|shortcut|keys?\b|keyboard|how (do i|to) (move|fly|steer|play|use|navigate)|wasd/)) {
    return { text: 'In the sky: **S** opens the Solar System, **Space** fires a shooting star, **H** hides the HUD, **G** shows guides. On a planet: **WASD** to fly, drag to look, **Space/E** up, **Q/C** down, **Shift** to boost, **O** to fly to the station, **Esc** to go back. **M** toggles sound anywhere.' };
  }
  if (has(/\b(sound|audio|music|noise|mute|volume|hear|silent)\b/)) {
    return { text: 'The speaker button on the screen edge (or **M**) turns sound on. Every place has its own soundscape — Mercury is dry and metallic, Jupiter thunders, Saturn shimmers, Neptune hums like deep ocean — and each trip, landing and observatory door has its own sound too.' };
  }

  // --- small talk
  if (has(/^(hi|hello|hey|yo|hiya|namaste|hola|ciao|hallo|sup|good (morning|afternoon|evening))\b/)) {
    const hi = mem.name ? `Hey ${mem.name}!` : pick(['Hey there!', 'Hello, traveller!', 'Hi!']);
    return { text: `${hi} I\u2019m Nova. ${describeWhere(where).split('. ')[0]}. What would you like to know?`, chips: chipsFor(where) };
  }
  if (has(/how are you|how('s| is) it going|how do you do|what'?s up|how r u|you good/)) {
    return { text: pick(['Running smoothly — no turbulence on this orbit. How about you?', 'All systems nominal, thanks for asking! Anything you\u2019re curious about?', 'Doing great — it\u2019s a nice view from here. What brings you by?']) };
  }
  if (has(/\b(thanks?|thank you|thx|ty|cheers|appreciate)\b/)) {
    return { text: pick(['Anytime! Shout if you need anything else.', 'Happy to help — enjoy the trip!', 'You\u2019re welcome. Safe travels.']) };
  }
  if (has(/^(bye|goodbye|see you|cya|later|good night|gotta go)\b/)) {
    return { text: `${pick(['Safe travels', 'See you among the stars', 'Until next orbit'])}${mem.name ? `, ${mem.name}` : ''}! If you want to get in touch with ${first}, her email is ${P.contact.email}.` };
  }
  if (has(/who are you|what are you|your name|are you (a |an )?(bot|ai|robot|human|real|chatgpt|gpt|claude|person)|are you alive/)) {
    return { text: `I\u2019m **Nova**, the guide built into ${first}\u2019s portfolio. I run on a hand-written knowledge base about her rather than a big language model, so I\u2019m best at her work and at getting you around this universe — but I do enjoy a chat.`, chips: ['What can you do?', 'Tell me a joke'] };
  }
  if (has(/who (made|built|created|designed|coded) (you|this|it|the (site|portfolio|website))|who('s| is) behind/)) {
    return { text: `${first} built all of this — the universe, the planets and me — herself, with React, Three.js and a lot of procedural maths.` };
  }
  if (has(/what can you do|what do you do|help me|can you help|how can you help|your (job|purpose)|what (should|can) i (ask|do|try)/)) {
    return { text: `Quite a bit: I can tell you about ${first}\u2019s projects, skills, certifications, hackathon win and bug-bounty work; tell you **where you are** in the portfolio; and **take you** to any planet or to Quick View. Try "take me to Earth" or "where am I?".`, chips: chipsFor(where) };
  }
  if (has(/joke|funny|make me laugh|humou?r/)) return { text: pick(JOKES) };
  if (has(/fun fact|space fact|random fact|did you know|tell me something/)) {
    const id = pick(Object.keys(FACT));
    return { text: FACT[id], actions: [go(id, act)] };
  }
  if (has(/favou?rite (planet|world)/)) {
    return { text: 'Saturn, if I\u2019m honest — those rings sound like glass. Though the Sun gets all the attention.', actions: [go('saturn', act)] };
  }
  if (has(/\b(love|like|awesome|amazing|cool|great|beautiful|nice|wow|impressive|brilliant|gorgeous)\b.*(site|portfolio|website|design|universe|this|it|work)|^(wow|nice|cool|awesome|amazing)\W*$/)) {
    return { text: `Thank you — ${first} will be glad to hear it! If you\u2019d like to tell her yourself, her email is ${P.contact.email}.`, actions: [go('neptune', act)] };
  }
  if (has(/\b(stupid|dumb|useless|hate|sucks|terrible|idiot|bad bot)\b/)) {
    return { text: 'Fair enough — I\u2019m still learning my way around. Tell me what you were hoping to find and I\u2019ll try again.' };
  }
  if (has(/\b(bored|boring)\b/)) {
    return { text: 'Then let\u2019s fly somewhere! Pick a planet and I\u2019ll take you there, or ask for a space fact.', actions: [go(pick(Object.keys(SECTION_OF)), act)], chips: ['Tell me a space fact', 'Tell me a joke'] };
  }
  if (has(/how old|\bage\b|birthday|born|married|boyfriend|girlfriend|single|salary|expected pay|ctc|religion|address|home address|where does she live exactly/)) {
    return { text: `That\u2019s not something ${first} shares here. What I can say is she\u2019s based in ${P.location} — and the best way to ask her anything else is ${P.contact.email}.` };
  }

  // --- recruiter / pitch
  if (has(/recruit|hiring|hire|interview|why (should|would) (we|i)|strengths?|pitch|sell (me|her)|candidate|shortlist|worth (it|hiring)/)) {
    return {
      text: `The short version on ${first}: **1st place** at the CodeMate Hackathon (Data & AI track, 50 teams, 78% accuracy on 10,000+ records); **11 vulnerabilities** reported to the CDAC BOSS Bug Bounty (XSS and auth bypass among them); a real-time editor tested across 10 concurrent rooms; and an analytics pipeline over 50,000+ transactions with an 8+ KPI Power BI dashboard. She\u2019s a CS student at Chandigarh University, graduating June 2028, and open to internships and collaborations.`,
      topic: 'achievements',
      actions: [{ label: 'Download résumé', href: P.resume }, { label: 'Email her', href: `mailto:${P.contact.email}` }],
    };
  }

  // --- the portfolio itself
  if (has(/(speak|fluent|italian|german|hindi|spoken|multilingual|bilingual|languages? (do|does)|which languages)/) && !has(/programming|code|coding/)) {
    return { text: `${P.facts.slice(0, 2).join('. ')}. So four languages in total: ${P.spoken.map((l) => l.lang).join(', ')}.`, topic: 'about' };
  }
  if (has(/(who (is|are)|introduce|about (you|me|her|suhani)|tell me about (her|suhani|yourself)|^name\b|summary|bio)/) && !findWorld(q.replace(/about (her|suhani|you|me)/, ''))) {
    return { text: `${first} is a ${P.role.toLowerCase()} in ${P.location}. ${P.summary}`, topic: 'about', actions: [go('sun', act)], chips: ['Show me her projects', 'What are her skills?'] };
  }
  if (has(/(open[- ]?source|leetcode|hackerrank|competitive|coding (platform|practice)|activities)/)) {
    return { text: 'She contributes to open-source projects on GitHub (bug fixes, documentation and feature additions) and is active on LeetCode and HackerRank.', topic: 'experience' };
  }
  if (has(/(bug bounty|cdac|boss|pentest|penetration|vulnerabilit|security|xss|hack(ing)?\b)/) && !has(/hackathon/)) {
    return { text: `In the **CDAC BOSS Bug Bounty Program** ${first} did penetration testing and security assessment on government web applications, and reported **11 vulnerabilities** — including XSS and authentication-bypass flaws — each with step-by-step remediation advice. Her Network Packet Sniffer is the security tool she built on the side.`, topic: 'experience', actions: [go('venus', act)] };
  }
  if (has(/(hackathon|codemate|1st|first place|won|win\b|winner|ranked)/)) {
    return { text: `${first} took **1st place at the CodeMate Hackathon** (Data & AI track), ranking first among 50 teams. Her Random Forest model, built with ensemble methods and feature engineering, predicted student academic performance with **78% accuracy** on a 10,000+ record dataset.`, topic: 'achievements', actions: [go('jupiter', act)] };
  }
  if (has(/(achiev|award|honou?r|milestone|accomplish)/)) {
    return { text: `Highlights: ${P.achievements.map((a) => a.title).join('; ')}.`, topic: 'achievements', actions: [go('jupiter', act)] };
  }
  if (has(/(skill|tech|stack|tool|framework|good at|strong|expertise|proficien)/) && !has(/project/)) {
    const top = P.skills.flatMap((g) => g.items).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n]) => n);
    return { text: `Her toolkit spans ${P.skills.length} areas: ${P.skills.map((g) => g.group.toLowerCase()).join(', ')}. Languages are ${list(P.skills[0].items.map(([n]) => n))}. The skills that show up across her projects most are ${list(top)}.`, topic: 'skills', actions: [go('mercury', act)], chips: ['Tell me more'] };
  }
  if (has(/(best|favou?rite|top|most (impressive|interesting)|proudest|main) project/)) {
    return { text: `If I had to choose: the **Real-Time Collaborative Code Editor** is the broadest — WebSockets, JWT auth, per-room namespaces, MongoDB indexing and Monaco. The **sales dashboard** is the one that shows analytics depth (50,000+ records, SQL window functions, 8+ KPIs).`, topic: 'projects', actions: [go('earth', act)] };
  }
  if (has(/(project|built|build|made|app\b|apps\b|github|repo|portfolio of work|what (has|did) she (build|make))/) && !has(/portfolio site/)) {
    return { text: `${first} has ${P.projects.length} featured projects: ${P.projects.map((p) => `**${p.name}** (${p.date}) — ${p.blurb}`).join('\n')}`, topic: 'projects', actions: [go('earth', act), { label: 'GitHub', href: P.contact.github }], chips: ['Tell me more', 'Which is the best?'] };
  }
  if (has(/(research|paper|publication|experiment|finding)/)) {
    return { text: P.research.map((r) => `**${r.title}** (${r.status}) — ${r.finding}`).join('\n'), actions: [go('mars', act)] };
  }
  if (has(/(experience|job|intern(ship)?|career|compan|employ|work history|worked)/)) {
    return { text: `${first}\u2019s résumé doesn\u2019t list a formal job yet — her hands-on experience is the security work and open source: ${P.experience.map((e) => `**${e.org}** (${e.role.toLowerCase()})`).join(', ')}. She\u2019s open to internships.`, topic: 'experience', actions: [go('venus', act)], chips: ['Tell me more'] };
  }
  if (has(/(educat|college|universit|school|degree|graduat|study|studying|course|coursework|cgpa|gpa|marks|grades?)/) && !has(/certif/)) {
    return { text: `${P.education[0].degree} at **${P.education[0].school}**, ${P.education[0].period.replace('Expected', 'expected')}. Coursework: ${list(P.education[0].courses)}.`, topic: 'education', actions: [go('saturn', act)] };
  }
  if (has(/(cert|credential|licen[sc]e|coursera|ibm)/)) {
    return { text: `Certifications: ${P.certs.map((x) => `${x.name} — ${x.issuer}`).join('; ')}.`, actions: [go('uranus', act)] };
  }
  if (has(/(resume|résumé|cv\b|curriculum)/)) {
    return { text: 'Here\u2019s the latest résumé — the Quick View page also has a download button.', actions: [{ label: 'Download résumé', href: P.resume }, { label: 'Open Quick View', run: act.onQuickView, nav: true }] };
  }
  if (has(/(contact|email|e-mail|mail\b|reach|phone|linkedin|connect|available|freelance|collab|message|talk to her|get in touch|socials?)/)) {
    return {
      text: `${P.contact.availability}.\n**Email:** ${P.contact.email}\n**Phone:** ${P.contact.phone}`,
      topic: 'contact',
      actions: [{ label: 'GitHub', href: P.contact.github }, { label: 'LinkedIn', href: P.contact.linkedin }, go('neptune', act)],
    };
  }
  if (has(/(where (is|does) (she|suhani)|location|based|city|live in|country)/)) {
    return { text: `${first} is based in ${P.location}.` };
  }
  if (has(/(portfolio (site|website|link)|website|live site|site url)/)) {
    return { text: `This universe is also live at ${P.siteUrl}.`, actions: [{ label: 'Open site', href: P.siteUrl }] };
  }

  // --- a planet mentioned on its own → a fact + what it holds
  const only = WORLD_WORDS.find(([re]) => re.test(q));
  if (only && has(/\b(sun|sol|mercury|venus|earth|mars|jupiter|saturn|uranus|neptune)\b/)) {
    const w = getWorld(only[1])!;
    return { text: `${FACT[w.id]} In this portfolio, ${w.name} holds **${w.section}**.`, actions: [go(w.id, act)] };
  }

  // --- specific item lookup (a project / skill / cert named in the question)
  const words = q.split(/\W+/).filter((w) => w.length > 2 && !STOP.has(w));
  const items = [
    ...P.projects.map((p) => ({ h: `${p.name} ${p.blurb} ${p.tags.join(' ')}`, a: `**${p.name}** (${p.date}): ${p.blurb} Built with ${list(p.tags)}. ${p.points[0]}.` })),
    ...P.skills.flatMap((g) => g.items.map(([n, v]) => ({ h: n, a: `${n} is in ${first}\u2019s ${g.group.toLowerCase()} toolkit${v ? ` and appears in ${v} of her ${P.projects.length} projects` : ''}.` }))),
    ...P.certs.map((x) => ({ h: `${x.name} ${x.issuer}`, a: `${x.name}, from ${x.issuer}.` })),
  ].map((i) => ({ ...i, s: words.filter((w) => i.h.toLowerCase().includes(w)).length })).sort((a, b) => b.s - a.s);
  if (items[0] && items[0].s > 0) return { text: items[0].a };

  // --- graceful fallback
  return {
    text: pick([
      `Hmm, that\u2019s outside my star charts. I\u2019m best on ${first}\u2019s projects, skills, education and getting around — or I can tell you where you are.`,
      `I don\u2019t have that logged. Try asking about ${first}\u2019s projects or skills, or say "take me to" a planet.`,
      `Not sure about that one! I know ${first}\u2019s work well, though — and I can fly you anywhere in the portfolio.`,
    ]),
    chips: chipsFor(where),
  };
}

/* ------------------------------ UI bits ------------------------------ */

/** **bold**, links and e-mail addresses inside a message */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.]+)/g);
  return (
    <>
      {parts.map((p, i): ReactNode => {
        if (p.startsWith('**')) return <b key={i} className="font-semibold text-[#F4F7FF]">{p.slice(2, -2)}</b>;
        if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noreferrer" className="text-[#9CC3FF] underline underline-offset-2 break-all">{p}</a>;
        if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(p)) return <a key={i} href={`mailto:${p}`} className="text-[#9CC3FF] underline underline-offset-2 break-all">{p}</a>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

const Orb = ({ busy }: { busy: boolean }) => (
  <span className="relative grid place-items-center h-9 w-9 shrink-0">
    <span className="absolute inset-0 rounded-full opacity-90 animate-[spin_6s_linear_infinite]" style={{ background: 'conic-gradient(from 0deg, #38BDF8, #7BA4FF, #FF9ACB, #FFB347, #38BDF8)', filter: busy ? 'blur(1px)' : 'none' }} />
    <span className="absolute inset-[2px] rounded-full bg-[#0a1226]" />
    <Sparkles className={`relative w-4 h-4 text-[#cfe0ff] ${busy ? 'animate-pulse' : ''}`} />
  </span>
);

const pill = 'shrink-0 text-[11px] px-3 py-1.5 rounded-full border border-[#7BA4FF]/35 bg-[#7BA4FF]/[0.07] text-[#b9d2ff] hover:bg-[#7BA4FF]/20 hover:border-[#7BA4FF]/70 hover:text-white cursor-pointer transition-colors whitespace-nowrap';

export function Chatbot({ where, onTravel, onSolar, onQuickView, onStation }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const idc = useRef(1);
  const mem = useRef<Mem>({ name: null, topic: null, n: 0, turns: 0 });
  const whereRef = useRef(where);
  whereRef.current = where;
  const act = useMemo(() => ({ onTravel, onSolar, onQuickView, onStation }), [onTravel, onSolar, onQuickView, onStation]);
  const actRef = useRef(act);
  actRef.current = act;

  const nova = (m: Omit<Msg, 'id' | 'from'>): Msg => ({ id: idc.current++, from: 'nova', ...m });

  // first open: a greeting that already knows where you are
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      cosmicAudio.chatOpen();
      if (msgs.length === 0) {
        const w = whereRef.current;
        setMsgs([nova({ text: `Hi, I\u2019m **Nova**, ${first}\u2019s guide. ${describeWhere(w).split('. ')[0]}. Ask me anything about her work — or tell me where you want to go and I\u2019ll fly you there.` })]);
      }
      setChips(chipsFor(whereRef.current));
    } else cosmicAudio.chatClose();
  };

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, busy, open]);

  const run = (a: Action) => {
    cosmicAudio.uiClick();
    a.run?.();
    if (a.nav) window.setTimeout(() => setOpen(false), 900);
  };

  const send = async (q: string) => {
    const t = q.trim();
    if (!t || busy) return;
    cosmicAudio.chatSend();
    const mine: Msg = { id: idc.current++, from: 'me', text: t };
    setMsgs((m) => [...m, mine]);
    setText('');
    setChips([]);
    setBusy(true);
    mem.current.turns += 1;

    let r: Reply | null = null;
    const ep = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_CHAT_ENDPOINT;
    if (ep) {
      try {
        const history = [...msgs, mine].map((m) => ({ from: m.from, text: m.text }));
        const res = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history, context: JSON.stringify(P), where: whereRef.current }) });
        const j = (await res.json()) as { reply?: string };
        if (j.reply) r = { text: j.reply };
      } catch { /* fall back to the local brain */ }
    }
    if (!r) r = reply({ q: t.toLowerCase(), mem: mem.current, where: whereRef.current, act: actRef.current });
    if (r.topic !== mem.current.topic) mem.current.n = 0;
    mem.current.topic = r.topic ?? null;

    // a human-ish pause that scales with the length of the answer
    await new Promise((res) => setTimeout(res, 380 + Math.min(1100, r!.text.length * 6) + Math.random() * 250));
    const actions = [...(r.actions ?? []), ...(r.auto ? [r.auto] : [])];
    setMsgs((m) => [...m, nova({ text: r!.text, actions: actions.length ? actions : undefined })]);
    setChips(r.chips ?? chipsFor(whereRef.current));
    setBusy(false);
    cosmicAudio.chatReceive();
    if (r.auto) {
      const a = r.auto;
      window.setTimeout(() => run(a), 1100);
    }
  };

  return (
    <div className="fixed z-[65] right-3 top-[56%] sm:top-auto sm:bottom-24 sm:right-5 flex flex-col items-end gap-3 pointer-events-none" data-ui>
      {open && (
        <div
          className="pointer-events-auto fixed inset-x-3 bottom-3 h-[58vh] sm:static sm:w-[390px] sm:h-[540px] flex flex-col rounded-[22px] overflow-hidden border border-[#7BA4FF]/25 bg-[#060914]/92 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,.85),0_0_60px_rgba(123,164,255,.12)]"
          style={{ animation: 'fadeUp .35s ease-out' }}
        >
          {/* header */}
          <div className="relative px-4 pt-3.5 pb-3 border-b border-white/[0.08] bg-gradient-to-b from-[#7BA4FF]/[0.09] to-transparent">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7BA4FF]/70 to-transparent" />
            <div className="flex items-center gap-3">
              <Orb busy={busy} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[15px] text-[#F4F7FF] leading-none">Nova</span>
                  <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute h-full w-full rounded-full bg-[#4DFFC3] opacity-70" /><span className="relative h-1.5 w-1.5 rounded-full bg-[#4DFFC3]" /></span>
                </div>
                <div className="mt-1 font-mono-tech text-[9px] tracking-[0.22em] text-[#64748b] uppercase">Mission guide</div>
              </div>
              <button onClick={toggle} aria-label="Close chat" className="h-7 w-7 grid place-items-center rounded-full text-[#94A3B8] hover:text-white hover:bg-white/10 cursor-pointer transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono-tech text-[10px] text-[#9CC3FF]">
              <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{whereShort(where)}</span>
            </div>
          </div>

          {/* conversation */}
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 text-[13px] font-sans [scrollbar-width:thin] [scrollbar-color:rgba(123,164,255,.3)_transparent]">
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`} style={{ animation: 'msgIn .3s ease-out both' }}>
                <div className="max-w-[88%]">
                  <div
                    className={`px-3.5 py-2.5 leading-relaxed whitespace-pre-line select-text ${
                      m.from === 'me'
                        ? 'rounded-2xl rounded-br-md bg-gradient-to-br from-[#4f7bff] to-[#6d5cff] text-white shadow-[0_6px_20px_rgba(79,123,255,.3)]'
                        : 'rounded-2xl rounded-bl-md bg-white/[0.055] border border-white/[0.07] text-[#dbe4f5]'
                    }`}
                  >
                    {m.from === 'nova' ? <Rich text={m.text} /> : m.text}
                  </div>
                  {m.actions && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.actions.map((a) =>
                        a.href ? (
                          <a key={a.label} href={a.href} target={a.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" download={a.href.endsWith('.pdf') ? true : undefined} className={`${pill} inline-flex items-center gap-1`}>
                            {a.label} <ArrowUpRight className="w-3 h-3" />
                          </a>
                        ) : (
                          <button key={a.label} onClick={() => run(a)} className={`${pill} inline-flex items-center gap-1`}>
                            {a.label} <ArrowUpRight className="w-3 h-3" />
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex" style={{ animation: 'msgIn .25s ease-out both' }}>
                <div className="flex items-center gap-1 px-3.5 py-3 rounded-2xl rounded-bl-md bg-white/[0.055] border border-white/[0.07]">
                  {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-[#9CC3FF]" style={{ animation: `dot 1.1s ease-in-out ${i * 0.15}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={end} />
          </div>

          {/* suggestions */}
          {chips.length > 0 && !busy && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-3 pb-2 pt-1">
              {chips.map((c) => <button key={c} onClick={() => send(c)} className={pill}>{c}</button>)}
            </div>
          )}

          {/* input */}
          <form
            className="flex items-center gap-2 p-3 border-t border-white/[0.08] bg-black/20"
            onSubmit={(e) => { e.preventDefault(); void send(text); }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Ask anything, or say where to go…"
              maxLength={240}
              className="flex-1 select-text bg-white/[0.05] border border-white/10 rounded-full px-4 py-2.5 text-[13px] text-[#F4F7FF] outline-none placeholder:text-[#475569] focus:border-[#7BA4FF]/60 focus:bg-white/[0.07] transition-colors"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={!text.trim() || busy}
              className="h-10 w-10 grid place-items-center rounded-full bg-gradient-to-br from-[#4f7bff] to-[#6d5cff] text-white shadow-[0_6px_18px_rgba(79,123,255,.4)] disabled:opacity-35 disabled:shadow-none enabled:hover:scale-105 transition-all cursor-pointer disabled:cursor-default"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={toggle}
        aria-label="Chat with Nova"
        className="pointer-events-auto relative h-12 w-12 grid place-items-center rounded-full bg-[#0a1226]/90 border border-[#7BA4FF]/50 text-[#cfe0ff] shadow-[0_0_28px_rgba(123,164,255,.35)] hover:scale-105 transition-transform cursor-pointer"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        {!open && msgs.length === 0 && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#4DFFC3] border-2 border-[#050816]" />}
      </button>
    </div>
  );
}
