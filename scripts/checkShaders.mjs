// Dev-only: syntax-validate every inline GLSL shader used by the solar system.
import fs from 'node:fs';
import path from 'node:path';
import { parser } from '@shaderfrog/glsl-parser';

const root = path.resolve('src/components/solar');
const files = ['glslCommon.ts', 'planetSurfaces.ts', 'Planet.tsx', 'PlanetRings.tsx', 'Sun.tsx'];

const consts = {};
const RE = /const\s+([A-Z0-9_]+)\s*=\s*\/\*\s*glsl\s*\*\/\s*`([\s\S]*?)`;/g;

for (const f of files) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  let m;
  while ((m = RE.exec(src))) consts[m[1]] = m[2];
}

const resolve = (s, depth = 0) => {
  if (depth > 6) return s;
  const out = s.replace(/\$\{\s*([A-Za-z0-9_]+)\s*\}/g, (full, id) =>
    consts[id] !== undefined ? consts[id] : full
  );
  return out === s ? out : resolve(out, depth + 1);
};

const THREE_PREFIX = `
precision highp float;
precision highp int;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
`;

const shaders = [];

// Every planet fragment = uniforms + noise + a surface() + the shared main()
for (const [name, body] of Object.entries(consts)) {
  if (name.startsWith('SURFACE_')) {
    shaders.push([
      `planet:${name}`,
      `${consts.GLSL_PLANET_UNIFORMS}\n${consts.GLSL_NOISE}\n${body}\n${consts.GLSL_PLANET_MAIN}`,
      'varying vec3 vObjPos;\n',
    ]);
  }
}

for (const [name, body] of Object.entries(consts)) {
  if (name.endsWith('_FRAGMENT') || name.endsWith('_VERTEX')) {
    shaders.push([name, resolve(body), name.includes('CORONA') ? '' : '']);
  }
}

let failed = 0;
for (const [name, body, extra] of shaders) {
  const source = `${THREE_PREFIX}\n${extra}\n${resolve(body)}`;
  try {
    parser.parse(source, { quiet: true });
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}: ${e.message.split('\n').slice(0, 4).join(' | ')}`);
  }
}

console.log(failed ? `\n${failed} shader(s) failed to parse` : `\nAll ${shaders.length} shaders parsed cleanly`);
process.exit(failed ? 1 : 0);
