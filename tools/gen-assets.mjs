// Regenerates ../assets/*.svg for the profile README: node tools/gen-assets.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../assets", import.meta.url));
const VORTEX = readFileSync(fileURLToPath(new URL("./vortex-src.svg", import.meta.url)), "utf8");
mkdirSync(OUT, { recursive: true });

const MONO = `ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace`;
const C = {
  night: "#050c1f", glow: "#0d2457", navy: "#0b2a63", coral: "#ff4556",
  cream: "#f3ede2", dim: "#6f7fa8", faint: "#1d2d55",
};
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r3 = (n) => Math.round(n * 1000) / 1000;

// Discrete SMIL animation from [time, value] events over a cycle of T seconds.
function discrete(attr, events, T) {
  const ev = [...events].sort((a, b) => a[0] - b[0]);
  if (ev[0][0] !== 0) ev.unshift([0, ev[0][1]]);
  return `<animate attributeName="${attr}" calcMode="discrete" dur="${T}s" repeatCount="indefinite" values="${ev.map((e) => r3(e[1])).join(";")}" keyTimes="${ev.map((e) => r3(e[0] / T)).join(";")}"/>`;
}

// One <path> of unit squares from a bitmap (rows of '#'/'.'), origin (x,y), pixel p, gap g.
function pixels(rows, x, y, p, g = 0, on = "#") {
  let d = "";
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === on) d += `M${r3(x + i * p)} ${r3(y + j * p)}h${r3(p - g)}v${r3(p - g)}h${r3(g - p)}z`;
  }));
  return d;
}

// ── Vortex: the two artwork layers, recoloured for the night canvas ──────────
const [coralD, navyD] = ["coral", "navy"].map((l) => VORTEX.match(new RegExp(`data-layer="${l}" d="([^"]*)"`))[1]);
const vortexG = VORTEX.match(/<g transform="([^"]*)"/)[1];
const VCX = 772, VCY = 750; // centre of the vortex's eye, in artwork units

// ── Pixel mask with LED eyes ────────────────────────────────────────────────
const MASK = [
  ".....######.....",
  "...##########...",
  "..############..",
  ".##############.",
  ".##############.",
  "################",
  "##.....##.....##",
  "##.....##.....##",
  "##.....##.....##",
  "##.....##.....##",
  "##.....##.....##",
  "################",
  ".######..######.",
  ".##############.",
  "..#.##.##.##.#..",
  "..############..",
  "...##########...",
  ".....######.....",
];
const EYES = {
  O: [".###.", "#...#", "#...#", "#...#", ".###."],
  blink: [".....", ".....", "#####", ".....", "....."],
  X: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  up: [".....", "..#..", ".#.#.", "#...#", "....."],
  gt: ["#....", ".##..", "...#.", ".##..", "#...."],
};
const mirror = (rows) => rows.map((r) => [...r].reverse().join(""));
// [left, right, seconds]
const FACES = [["O", "O", 2.2], ["blink", "blink", 0.14], ["O", "O", 1.6], ["X", "X", 1.3], ["O", "O", 1.2], ["up", "up", 1.6], ["gt", "lt", 1.0], ["blink", "blink", 0.14]];

function mask(id, cx, cy, u) {
  const w = 16 * u, h = 18 * u, x = cx - w / 2, y = cy - h / 2;
  const T = FACES.reduce((s, f) => s + f[2], 0);
  let t = 0;
  const css = [];
  const frames = FACES.map(([l, r, dur], i) => {
    const a = (t / T) * 100, b = ((t + dur) / T) * 100;
    t += dur;
    css.push(`@keyframes ${id}f${i}{0%{opacity:0}${r3(a)}%,${r3(b - 0.01)}%{opacity:1}${r3(b)}%,100%{opacity:0}}.${id}f${i}{opacity:0;animation:${id}f${i} ${r3(T)}s infinite}`);
    const L = EYES[l], R = r === "lt" ? mirror(EYES.gt) : EYES[r];
    return `<path class="${id}f${i}" fill="${C.coral}" d="${pixels(L, x + 2 * u, y + 6 * u, u, u * 0.18)}${pixels(R, x + 9 * u, y + 6 * u, u, u * 0.18)}"/>`;
  });
  return {
    css: css.join(""),
    svg: `<path fill="${C.coral}" opacity=".85" transform="translate(${r3(u * 0.45)} ${r3(u * 0.35)})" d="${pixels(MASK, x, y, u)}"/>
    <path fill="${C.cream}" d="${pixels(MASK, x, y, u)}"/>
    <rect x="${x + 2 * u}" y="${y + 6 * u}" width="${5 * u}" height="${5 * u}" fill="${C.night}"/><rect x="${x + 9 * u}" y="${y + 6 * u}" width="${5 * u}" height="${5 * u}" fill="${C.night}"/>
    ${frames.join("\n    ")}`,
  };
}

// ── Pixel font for the handle ───────────────────────────────────────────────
const GLYPHS = {
  r: [".....", ".....", "#.##.", "##..#", "#....", "#....", "#...."],
  4: ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  n: [".....", ".....", "#.##.", "##..#", "#...#", "#...#", "#...#"],
  k: ["#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#."],
  0: [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
};
function word(text, x, y, p) {
  return [...text].map((ch, i) => pixels(GLYPHS[ch], x + i * 6 * p, y, p, 1)).join("");
}

const DEFS = `
    <pattern id="dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="1.6" fill="${C.coral}"/></pattern>
    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0"/></filter>
    <pattern id="scan" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity=".22"/></pattern>`;
const STYLE_COMMON = `.blink{animation:blink 1.1s steps(1) infinite}@keyframes blink{50%{opacity:0}}`;

function hero() {
  const W = 1000, H = 460;
  const s = 0.29, cx = 250, cy = 230;
  const m = mask("m", cx, cy, 4.3);
  const hx = 520, hy = 128, hp = 12;
  const handle = word("r4nk0X", hx, hy, hp);
  const stats = [["LOGS", "NULL", C.cream], ["FACE", "MASKED", C.cream], ["SIGNAL", "ENCRYPTED", C.cream], ["LOCATION", "████████", C.coral], ["STATUS", "ONLINE", C.coral]];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${MONO}">
  <defs>${DEFS}
    <radialGradient id="halo" cx="${cx}" cy="${cy}" r="300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.glow}"/><stop offset="1" stop-color="${C.night}" stop-opacity="0"/></radialGradient>
    <linearGradient id="dotfade" x1="0" y1="0" x2="1" y2="1"><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".9"/></linearGradient>
    <mask id="dotmask"><rect width="${W}" height="${H}" fill="url(#dotfade)"/></mask>
    <clipPath id="round"><rect width="${W}" height="${H}" rx="18"/></clipPath>
    <clipPath id="sliceA"><rect x="0" y="${hy + 14}" width="${W}" height="18"/></clipPath>
    <clipPath id="sliceB"><rect x="0" y="${hy + 50}" width="${W}" height="12"/></clipPath>
    <path id="handle" d="${handle}"/>
  </defs>
  <style>
    ${m.css}${STYLE_COMMON}
    .jit{animation:jit 6s infinite}
    @keyframes jit{0%,90%,100%{transform:translate(0,0)}91%{transform:translate(-5px,2px)}93%{transform:translate(4px,-3px)}95%{transform:translate(0,0)}}
    .sa{animation:sa 5s infinite}.sb{animation:sb 5s infinite}
    @keyframes sa{0%,82%,90%,100%{opacity:0;transform:translate(0,0)}83%{opacity:1;transform:translate(22px,0)}86%{opacity:1;transform:translate(-14px,0)}}
    @keyframes sb{0%,84%,92%,100%{opacity:0;transform:translate(0,0)}85%{opacity:1;transform:translate(-26px,0)}88%{opacity:1;transform:translate(10px,0)}}
    .reg{animation:reg 5s infinite}
    @keyframes reg{0%,80%,100%{transform:translate(6px,5px)}83%{transform:translate(-4px,7px)}87%{transform:translate(9px,2px)}}
  </style>
  <g clip-path="url(#round)">
    <rect width="${W}" height="${H}" fill="${C.night}"/>
    <rect width="${W}" height="${H}" fill="url(#halo)"/>
    <rect width="${W}" height="${H}" fill="url(#dots)" opacity=".16" mask="url(#dotmask)"/>

    <g class="jit">
      <g transform="translate(${cx} ${cy})">
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="80s" repeatCount="indefinite"/>
          <g transform="scale(${s}) translate(${-VCX} ${-VCY})">
            <g transform="${vortexG}">
              <path fill="${C.coral}" opacity=".35" transform="translate(16 12)" d="${coralD}"/>
              <path fill="${C.coral}" d="${coralD}"/>
              <path fill="${C.navy}" d="${navyD}"/>
            </g>
          </g>
        </g>
      </g>
      <circle cx="${cx}" cy="${cy}" r="47" fill="${C.night}"/>
      ${m.svg}
    </g>

    <text x="${hx}" y="98" font-size="14" fill="${C.coral}" letter-spacing="3">// SIGNAL ACQUIRED</text>
    <use href="#handle" class="reg" fill="${C.coral}" opacity=".9"/>
    <use href="#handle" fill="${C.cream}"/>
    <g clip-path="url(#sliceA)"><use href="#handle" class="sa" fill="${C.coral}"/></g>
    <g clip-path="url(#sliceB)"><use href="#handle" class="sb" fill="${C.cream}"/></g>

    <text x="${hx}" y="${hy + 7 * hp + 44}" font-size="20" fill="${C.cream}">you won't find me in the logs.</text>
    <line x1="${hx}" y1="${hy + 7 * hp + 66}" x2="${hx + 420}" y2="${hy + 7 * hp + 66}" stroke="${C.faint}"/>
    ${stats.map(([k, v, col], i) => {
      const y = hy + 7 * hp + 96 + i * 24;
      const dot = k === "STATUS" ? `<tspan class="blink" fill="${C.coral}">● </tspan>` : "";
      return `<text x="${hx}" y="${y}" font-size="14"><tspan fill="${C.dim}">${k.padEnd(10, " ").replace(/ /g, " ")}${".".repeat(6)} </tspan>${dot}<tspan fill="${col}">${v}</tspan></text>`;
    }).join("\n    ")}

    <rect width="${W}" height="${H}" filter="url(#grain)"/>
    <rect width="${W}" height="${H}" fill="url(#scan)"/>
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="${C.faint}"/>
</svg>
`;
}

function manifesto() {
  const W = 1000, H = 280, x0 = 84, fs = 30, cw = fs * 0.6;
  const lines = ["they log everything.", "we log nothing.", "your data was never theirs."];
  const ys = [92, 142, 192];
  const typeDt = 0.06, gap = 0.5;
  let t = 0.6;
  const starts = lines.map((s) => { const a = t; t += s.length * typeDt + gap; return a; });
  const sigAt = t;
  const T = Math.ceil(sigAt + 6);
  const fadeAt = T * 0.96;
  const curX = [], curY = [];
  const typed = lines.map((s, i) => {
    const ev = [[0, 0]];
    for (let k = 1; k <= s.length; k++) ev.push([starts[i] + k * typeDt, k * cw]);
    ev.push([fadeAt, 0]);
    // Cursor sits on the line currently being typed, then on the last line.
    if (i === 0) { curX.push([0, x0]); curY.push([0, ys[0]]); }
    for (let k = 0; k <= s.length; k++) curX.push([starts[i] + k * typeDt + (k ? 0 : 0.001), x0 + k * cw + 2]);
    curY.push([starts[i] + 0.001, ys[i]]);
    return `<clipPath id="t${i}"><rect x="${x0}" y="${ys[i] - 30}" height="40" width="0">${discrete("width", ev, T)}</rect></clipPath>
    <text x="${x0}" y="${ys[i]}" font-size="${fs}" font-weight="700" fill="${i === 1 ? C.coral : C.cream}" textLength="${r3(s.length * cw)}" lengthAdjust="spacingAndGlyphs" clip-path="url(#t${i})">${esc(s)}</text>`;
  });
  curX.push([fadeAt, x0]); curY.push([fadeAt, ys[0]]);
  const m = mask("q", 820, 140, 7);
  const pct = (s) => r3((s / T) * 100);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${MONO}">
  <defs>${DEFS}
    <clipPath id="round"><rect width="${W}" height="${H}" rx="18"/></clipPath>
    <radialGradient id="spot" cx="820" cy="140" r="200" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.glow}"/><stop offset="1" stop-color="${C.night}" stop-opacity="0"/></radialGradient>
    <mask id="dm"><circle cx="820" cy="140" r="150" fill="#fff" opacity=".9"/></mask>
  </defs>
  <style>${m.css}${STYLE_COMMON}
    @keyframes sig{0%,${pct(sigAt)}%{opacity:0}${r3(pct(sigAt) + 3)}%,96%{opacity:1}100%{opacity:0}}.sig{animation:sig ${T}s infinite}
  </style>
  <g clip-path="url(#round)">
    <rect width="${W}" height="${H}" fill="${C.night}"/>
    <rect width="${W}" height="${H}" fill="url(#spot)"/>
    <rect width="${W}" height="${H}" fill="url(#dots)" opacity=".18" mask="url(#dm)"/>
    <rect x="44" y="56" width="6" height="190" fill="${C.coral}"/>
    <text x="${x0}" y="44" font-size="12" fill="${C.dim}" letter-spacing="3">TRANSMISSION // DECRYPTED</text>
    ${typed.join("\n    ")}
    <rect class="blink" width="${r3(cw * 0.6)}" height="30" fill="${C.coral}" x="${x0}" y="${ys[0] - 25}">${discrete("x", curX, T)}${discrete("y", curY.map(([tt, y]) => [tt, y - 25]), T)}</rect>
    <text class="sig" x="${x0}" y="242" font-size="15" fill="${C.coral}">// r4nk0X :: privacy is not a crime.</text>
    ${m.svg}
    <rect width="${W}" height="${H}" filter="url(#grain)"/>
    <rect width="${W}" height="${H}" fill="url(#scan)"/>
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="${C.faint}"/>
</svg>
`;
}

writeFileSync(`${OUT}/hero.svg`, hero());
writeFileSync(`${OUT}/manifesto.svg`, manifesto());
console.log("ok");
