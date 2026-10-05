// Generates PLACEHOLDER brownie illustrations (one per flavour) until real DGAP photography is uploaded.
// Run: node scripts/make-art.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const L = [150, 380], T = [400, 290], Bm = [400, 470];
const P = (u, v) => [L[0] + u * (T[0] - L[0]) + v * (Bm[0] - L[0]), L[1] + u * (T[1] - L[1]) + v * (Bm[1] - L[1])];
const pt = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;
const rnd = (seed) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

function defs() {
  return `<defs>
<radialGradient id="bg" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="#fff8f0"/><stop offset="1" stop-color="#ead8c5"/></radialGradient>
<linearGradient id="top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a2a1b"/><stop offset=".55" stop-color="#2b160f"/><stop offset="1" stop-color="#1a0d09"/></linearGradient>
<linearGradient id="side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1d12"/><stop offset="1" stop-color="#160b08"/></linearGradient>
<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<filter id="blur"><feGaussianBlur stdDeviation="14"/></filter></defs>`;
}

function body(topping, seed = 7) {
  const r = rnd(seed);
  let t = "";
  const tf = (u, v) => P(u, v);
  const poly = (pts, fill, stroke = "none", extra = "") => `<polygon points="${pts.map(pt).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round" ${extra}/>`;
  const chunk = (u, v, s, fill) => poly([tf(u, v), tf(u + s, v), tf(u + s, v + s), tf(u, v + s)], fill, "#5a331f");
  const dot = (u, v, rad, fill, o = 1) => { const [x, y] = tf(u, v); return `<ellipse cx="${x}" cy="${y}" rx="${rad}" ry="${rad * 0.55}" fill="${fill}" opacity="${o}"/>`; };
  if (topping === "fudge") {
    t += `<g fill="none" stroke="#c89452" stroke-linecap="round" opacity=".55"><path d="M300 360 L350 372 L378 355 L420 380" stroke-width="2.5"/><path d="M470 345 L520 362 L548 350" stroke-width="2"/><path d="M400 420 L440 410 L480 428" stroke-width="2"/></g>`;
    t += chunk(.3, .25, .09, "#1a0d09") + chunk(.62, .55, .08, "#1a0d09") + chunk(.45, .4, .07, "#1a0d09");
    for (let i = 0; i < 6; i++) t += dot(.15 + r() * .7, .15 + r() * .7, 3, "#fff8f0", .85);
  } else if (topping === "nutella") {
    t += `<path d="M${pt(tf(.12, .3))} C ${pt(tf(.3, .1))} ${pt(tf(.5, .6))} ${pt(tf(.7, .35))} S ${pt(tf(.92, .5))} ${pt(tf(.9, .7))}" fill="none" stroke="#7a3f1c" stroke-width="22" stroke-linecap="round" opacity=".95"/>`;
    t += `<path d="M${pt(tf(.14, .6))} C ${pt(tf(.35, .45))} ${pt(tf(.5, .9))} ${pt(tf(.75, .65))}" fill="none" stroke="#a5622d" stroke-width="12" stroke-linecap="round" opacity=".85"/>`;
    for (const [u, v] of [[.3, .3], [.55, .5], [.72, .3], [.4, .68]]) { const [x, y] = tf(u, v); t += `<ellipse cx="${x}" cy="${y}" rx="15" ry="9" fill="#c89452" stroke="#8a5a24" stroke-width="2"/>`; }
  } else if (topping === "biscoff") {
    t += `<path d="M${pt(tf(.1, .2))} C ${pt(tf(.3, .5))} ${pt(tf(.5, .1))} ${pt(tf(.7, .5))} S ${pt(tf(.9, .3))} ${pt(tf(.95, .6))}" fill="none" stroke="#c4722a" stroke-width="14" stroke-linecap="round" opacity=".92"/>`;
    t += poly([tf(.4, .22), tf(.62, .22), tf(.62, .46), tf(.4, .46)], "#d9a766", "#9a6a2e");
    t += `<g stroke="#9a6a2e" stroke-width="2" opacity=".7"><path d="M${pt(tf(.47, .26))} L${pt(tf(.47, .42))} M${pt(tf(.55, .26))} L${pt(tf(.55, .42))}"/></g>`;
    for (let i = 0; i < 9; i++) t += dot(.12 + r() * .76, .12 + r() * .76, 4, "#e6bd84", .9);
  } else if (topping === "chip") {
    for (let i = 0; i < 26; i++) { const u = .08 + r() * .84, v = .08 + r() * .84; t += poly([tf(u, v), tf(u + .05, v), tf(u + .05, v + .05), tf(u, v + .05)], i % 3 ? "#6b3a1e" : "#1a0d09", "#8a5a30"); }
    t += `<g fill="none" stroke="#c89452" stroke-linecap="round" opacity=".4"><path d="M320 362 L360 372 L390 358" stroke-width="2"/></g>`;
  } else if (topping === "nuts") {
    for (const [u, v, s] of [[.2, .25, 1], [.5, .2, 1.15], [.68, .5, 1], [.35, .6, 1.1], [.55, .72, .9], [.15, .6, .9]]) {
      const [x, y] = tf(u, v);
      t += `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-22 4 q4 -16 22 -14 q20 -2 24 12 q-6 14 -24 12 q-20 2 -22 -10z" fill="#c8985a" stroke="#8a5e2c" stroke-width="2"/><path d="M-10 2 q10 -6 22 0 M-8 10 q10 4 20 -2" fill="none" stroke="#8a5e2c" stroke-width="2" opacity=".7"/></g>`;
    }
  }
  return `<ellipse cx="400" cy="610" rx="260" ry="46" fill="#2b160f" opacity=".28" filter="url(#blur)"/>
<path d="M150 380 L400 470 L400 610 L150 520 Z" fill="url(#side)"/><path d="M650 380 L400 470 L400 610 L650 520 Z" fill="#1f0f0a"/>
<path d="M150 440 L400 530 L650 440" fill="none" stroke="#5a331f" stroke-width="3" opacity=".55"/>
<polygon points="150,380 400,290 650,380 400,470" fill="url(#top)" stroke="#5a331f" stroke-width="2" stroke-linejoin="round"/>
<polygon points="150,380 400,290 650,380 400,470" fill="url(#sheen)"/>${t}`;
}

function box() {
  // an open cream gift box with four brownies
  const bits = [[270, 400], [400, 440], [530, 400], [400, 360]].map(([x, y], i) =>
    `<g transform="translate(${x - 400} ${y - 380}) scale(.42)" transform-origin="400 380">${body(["fudge", "nutella", "biscoff", "chip"][i], i + 3).replace(/<ellipse[^>]*filter[^>]*\/>/, "")}</g>`).join("");
  return `<ellipse cx="400" cy="640" rx="290" ry="50" fill="#2b160f" opacity=".25" filter="url(#blur)"/>
<polygon points="110,430 400,320 690,430 400,560" fill="#f1e3d0" stroke="#c9ab86" stroke-width="3"/>
<polygon points="110,430 400,560 400,650 110,520" fill="#d9bf9a"/><polygon points="690,430 400,560 400,650 690,520" fill="#c9ab86"/>
<polygon points="140,432 400,335 660,432 400,540" fill="#3a1d12"/>${bits}
<path d="M110 430 L400 560 L690 430" fill="none" stroke="#c89452" stroke-width="6" opacity=".9"/>`;
}

const wrap = (inner, vb = "0 0 800 800", bg = true) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="Illustration of a brownie"><!-- PLACEHOLDER ART: replace with real DGAP photography -->${defs()}${bg ? '<rect width="800" height="800" fill="url(#bg)"/>' : ""}${inner}</svg>`;

mkdirSync("public/images/products", { recursive: true });
mkdirSync("public/images/branding", { recursive: true });
const variants = { fudge: "fudge", nutella: "nutella", biscoff: "biscoff", "chocolate-chip": "chip", nuts: "nuts" };
for (const [name, topping] of Object.entries(variants)) writeFileSync(`public/images/products/${name}.svg`, wrap(body(topping)));
writeFileSync("public/images/products/assorted-box.svg", wrap(box()));
// transparent hero brownie, cropped tight so it fills the frame
const lit = body("fudge")
  .replace('url(#top)" stroke="#5a331f" stroke-width="2"', 'url(#heroTop)" stroke="#d9a766" stroke-width="3"')
  .replace('fill="url(#side)"', 'fill="url(#heroSide)"')
  .replace('fill="#1f0f0a"', 'fill="#2a140c"');
const heroDefs = `<defs><radialGradient id="glow" cx="50%" cy="55%" r="55%"><stop offset="0" stop-color="#b87333" stop-opacity=".55"/><stop offset="1" stop-color="#b87333" stop-opacity="0"/></radialGradient>
<linearGradient id="heroTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a5030"/><stop offset=".55" stop-color="#4a2616"/><stop offset="1" stop-color="#2e170d"/></linearGradient>
<linearGradient id="heroSide" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3320"/><stop offset="1" stop-color="#26110a"/></linearGradient></defs>`;
writeFileSync("public/images/branding/hero-brownie.svg", wrap(lit, "70 230 660 440", false).replace("</defs>", "</defs>" + heroDefs));
console.log("art written");
