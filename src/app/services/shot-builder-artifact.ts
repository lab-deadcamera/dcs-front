/**
 * Generates the artifact HTML from structured shot list JSON (returned by Claude).
 * Faithful reproduction of artifact-example.html by Dead Camera Studios.
 */
import { Sequence } from '@app/core/interfaces';

export interface ArtifactData {
  title: string;
  scene: string;
  totalDuration: number;
  durationCap: number;
  shots: ArtifactShot[];
  conventions: ArtifactConvention[];
  faceToFaceRule?: string;
}

export interface ArtifactShot {
  id: string;
  beat: 'HOOK' | 'FRICTION' | 'SPIKE' | 'BUTTON' | string;
  duration: number;
  cuts: number;
  title: string;
  spike: boolean;
  prompt: string;
  promptZh: string;
  guide: {
    scene: string;
    type: string;
    cuts: Array<[string, string]>;
    important: string;
  };
}

export interface ArtifactConvention {
  label: string;
  value: string;
}

const BEAT_COLORS: Record<string, string> = {
  HOOK: '#3d8b8f',
  FRICTION: '#c98a3c',
  SPIKE: '#e0653c',
  BUTTON: '#5e7073',
};

const BEAT_VARS: Record<string, string> = {
  HOOK: 'var(--hook)',
  FRICTION: 'var(--friction)',
  SPIKE: 'var(--spike)',
  BUTTON: 'var(--button)',
};

export function generateArtifactHtml(data: ArtifactData): string {
  const total = data.totalDuration;
  const cap = data.durationCap || 80;
  const slack = Math.max(0, cap - total);
  const totalCuts = data.shots.reduce((a, s) => a + s.cuts, 0);

  const conventionsHtml = data.conventions
    .map((c) => `<span class="chip"><b>${esc(c.label)}</b> ${esc(c.value)}</span>`)
    .join('\n');

  const stripHtml = data.shots
    .map((s) => {
      const color = BEAT_COLORS[s.beat] || '#5e7073';
      return `<button class="seg${s.spike ? ' spike' : ''}" style="flex:${s.duration} 0 0;background:${color}" data-shot="${s.id}" role="listitem" aria-label="Plano ${s.id}, ${s.duration}s">${s.id}</button>`;
    })
    .join('\n');

  const shotsHtml = data.shots.map((s) => renderShot(s)).join('\n');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(data.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0c1315;--bg2:#0f1a1c;--panel:#121f21;--panel2:#16282a;--line:#1e3133;--ink:#ece6d8;--ink-dim:#9aa6a3;--ink-faint:#6a7977;--teal:#4fb0b5;--teal-deep:#2f6e72;--amber:#e0a95c;--amber-deep:#c98a3c;--ember:#e0653c;--hook:#3d8b8f;--friction:#c98a3c;--spike:#e0653c;--button:#5e7073;--ok:#5fb98f;--warn:#e0a95c;--bad:#e0653c;--radius:3px}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation:none!important;transition:none!important}}
body{background:radial-gradient(120% 80% at 80% -10%,rgba(224,169,92,0.07),transparent 55%),radial-gradient(120% 90% at -10% 110%,rgba(79,176,181,0.06),transparent 55%),var(--bg);color:var(--ink);font-family:"Archivo",system-ui,sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased;padding:clamp(18px,4vw,52px) clamp(14px,4vw,40px) 80px}
.wrap{max-width:1080px;margin:0 auto}.mono{font-family:"JetBrains Mono",monospace}
header{border-bottom:1px solid var(--line);padding-bottom:26px;margin-bottom:30px}
.eyebrow{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:0.34em;text-transform:uppercase;color:var(--teal);display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:18px}
.eyebrow .dot{width:5px;height:5px;border-radius:50%;background:var(--amber);box-shadow:0 0 10px var(--amber)}
h1{font-weight:900;font-size:clamp(30px,6.2vw,58px);line-height:0.96;letter-spacing:-0.02em;text-transform:uppercase;color:var(--ink)}
h1 .scene{display:block;color:var(--amber);font-size:0.5em;letter-spacing:0.01em;margin-top:10px;font-weight:700}
.subline{color:var(--ink-dim);margin-top:14px;font-size:14px;max-width:64ch}
.runline{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-top:22px;font-family:"JetBrains Mono",monospace}
.runline .big{font-size:clamp(26px,5vw,38px);font-weight:700;color:var(--ink)}
.runline .cap{font-size:15px;color:var(--ink-faint)}
.runline .slack{font-size:12px;color:var(--teal);border:1px solid var(--teal-deep);border-radius:100px;padding:3px 11px;letter-spacing:0.06em}
.runline .count{font-size:12px;color:var(--ink-dim);letter-spacing:0.18em;text-transform:uppercase}
.strip-block{margin:34px 0 8px}
.strip-label{display:flex;justify-content:space-between;font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:9px}
.strip{display:flex;width:100%;height:54px;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;background:#0a1011}
.seg{position:relative;border-right:1px solid rgba(10,16,17,0.65);cursor:pointer;display:flex;align-items:flex-end;justify-content:center;padding-bottom:5px;transition:filter 0.18s ease;min-width:0;border:none;color:rgba(12,19,21,0.92);font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:700}
.seg:last-child{border-right:none}
.seg:hover,.seg.lit{filter:brightness(1.28) saturate(1.1);z-index:2}
.seg.lit{outline:1px solid var(--ink)}
.seg.spike::after{content:"";position:absolute;top:5px;left:50%;transform:translateX(-50%);width:5px;height:5px;border-radius:50%;background:#fff;box-shadow:0 0 9px #fff}
.strip-slack{flex:0 0 auto;background:repeating-linear-gradient(45deg,#0e1719,#0e1719 4px,#0a1011 4px,#0a1011 8px)}
.strip-scale{display:flex;justify-content:space-between;font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--ink-faint);margin-top:7px}
.meta-grid{display:grid;grid-template-columns:1fr;gap:14px;margin:30px 0 6px}@media(min-width:760px){.meta-grid{grid-template-columns:1.35fr 1fr}}
.card-flat{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:18px 20px}
.card-flat h3{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:var(--teal);margin-bottom:14px;font-weight:700}
.chips{display:flex;flex-wrap:wrap;gap:7px}
.chip{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-dim);border:1px solid var(--line);background:var(--bg2);border-radius:100px;padding:4px 11px}
.chip b{color:var(--ink);font-weight:500}
.f2f{border-left:2px solid var(--ember)}
.f2f p{font-size:13.5px;color:var(--ink-dim);line-height:1.55}
.f2f strong{color:var(--ink);font-weight:600}
.section-tag{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--ink-faint);margin:40px 0 16px;display:flex;align-items:center;gap:14px}
.section-tag::after{content:"";flex:1;height:1px;background:var(--line)}
.shot{background:linear-gradient(180deg,var(--panel),var(--bg2));border:1px solid var(--line);border-radius:var(--radius);margin-bottom:18px;position:relative;scroll-margin-top:18px;overflow:hidden;transition:border-color 0.18s ease,box-shadow 0.18s ease}
.shot::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--beat,var(--teal));z-index:1}
.shot.lit{border-color:var(--ink-faint);box-shadow:0 0 0 1px var(--ink-faint)}
.shot-top{display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;padding:20px clamp(16px,3vw,26px) 0}
.shot-n{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:30px;line-height:1;color:var(--ink);min-width:44px;letter-spacing:-0.03em}
.shot-head{flex:1;min-width:200px}
.shot-title{font-weight:800;font-size:18px;letter-spacing:-0.01em;color:var(--ink);line-height:1.2}
.shot-meta{font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--ink-dim);margin-top:6px}
.shot-side{display:flex;align-items:center;gap:10px;margin-left:auto}
.beat-tag{font-family:"JetBrains Mono",monospace;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;padding:5px 10px;border-radius:100px;color:#0c1315;background:var(--beat);white-space:nowrap}
.dur{font-family:"JetBrains Mono",monospace;font-size:20px;font-weight:700;color:var(--amber)}
.guide{margin:18px clamp(16px,3vw,26px) 0;background:rgba(79,176,181,0.05);border:1px solid rgba(79,176,181,0.18);border-left:2px solid var(--teal);border-radius:var(--radius);padding:15px 17px}
.guide .gl{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--teal);margin-bottom:11px;display:flex;align-items:center;gap:9px}
.guide .gl::after{content:"para ti";color:var(--ink-faint);letter-spacing:0.12em}
.grow{display:flex;gap:10px;font-size:13.5px;line-height:1.5;padding:4px 0;border-bottom:1px solid rgba(30,49,51,0.5)}
.grow:last-child{border-bottom:none}
.grow .k{font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-faint);min-width:78px;flex:0 0 78px;padding-top:2px}
.grow .v{color:var(--ink-dim);flex:1}
.grow .v b{color:var(--ink);font-weight:600}
.cuts{display:flex;flex-wrap:wrap;gap:6px}
.cut{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink);background:var(--bg2);border:1px solid var(--line);border-radius:var(--radius);padding:3px 9px}
.cut em{color:var(--amber);font-style:normal;font-weight:700}
.prompt{margin:18px clamp(16px,3vw,26px) 22px}
.prompt-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px}
.pl{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--amber)}
.toggle{display:inline-flex;border:1px solid var(--line);border-radius:100px;overflow:hidden}
.toggle button{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:0.06em;background:transparent;color:var(--ink-dim);border:none;padding:6px 15px;cursor:pointer;transition:all 0.15s ease}
.toggle button.on{background:var(--teal-deep);color:#eafcfb}
.toggle button:focus-visible,.copy:focus-visible,.seg:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
.counter{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ok);margin-left:auto;letter-spacing:0.04em}
.counter.warn{color:var(--warn)}.counter.bad{color:var(--bad)}
.copy{background:transparent;border:1px solid var(--line);color:var(--ink-dim);border-radius:var(--radius);font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:0.1em;text-transform:uppercase;padding:6px 11px;cursor:pointer;transition:all 0.16s ease}
.copy:hover{border-color:var(--teal-deep);color:var(--teal)}.copy.done{border-color:var(--teal);color:var(--teal)}
pre.body{font-family:"JetBrains Mono",monospace;font-size:12px;line-height:1.62;color:#d3d8d4;background:#0a1011;border:1px solid var(--line);border-radius:var(--radius);padding:16px 17px;white-space:pre-wrap;word-break:break-word;max-height:340px;overflow:auto;margin:0}
pre.body.zh{font-family:"Noto Sans SC","JetBrains Mono",monospace;font-size:13px;line-height:1.7}
pre.body::-webkit-scrollbar{width:9px}pre.body::-webkit-scrollbar-thumb{background:var(--line);border-radius:9px}
.note{margin-top:36px;background:var(--panel2);border:1px solid var(--line);border-left:2px solid var(--amber);border-radius:var(--radius);padding:22px clamp(18px,3vw,26px)}
.note h3{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:var(--amber);margin-bottom:14px}
.note p{font-size:14px;color:var(--ink-dim);line-height:1.6;margin-bottom:10px}
.note b{color:var(--ink);font-weight:600}
.note code{font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--teal);background:var(--bg2);padding:2px 6px;border-radius:3px}
footer{margin-top:42px;text-align:center;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-faint)}
</style>
</head>
<body>
<div class="wrap">
<header>
<div class="eyebrow"><span class="dot"></span>${esc(data.title)}</div>
<h1>${esc(data.title)}<span class="scene">${esc(data.scene)}</span></h1>
<p class="subline">${data.shots.length} planos · ${totalCuts} cortes · duración total ${total}s</p>
<div class="runline">
<span class="big">${total}s</span><span class="cap">/ ${cap}s tope</span>
${slack > 0 ? `<span class="slack">+${slack}s holgura</span>` : ''}
<span class="count">· ${data.shots.length} planos · ${totalCuts} cortes</span>
</div>
</header>

<div class="strip-block">
<div class="strip-label"><span>Presupuesto de tiempo — la temperatura sube con el conflicto</span><span>frío → caliente → vacío</span></div>
<div class="strip" id="strip" role="list" aria-label="Distribución de tiempo por plano">
${stripHtml}
${slack > 0 ? `<div class="strip-slack" style="flex:${slack} 0 0" title="${slack}s holgura"></div>` : ''}
</div>
<div class="strip-scale">
<span>0s</span><span>${Math.round(cap * 0.25)}s</span><span>${Math.round(cap * 0.5)}s</span><span>${Math.round(cap * 0.75)}s</span><span>${cap}s</span>
</div>
</div>

<div class="meta-grid">
<div class="card-flat">
<h3>Convenciones bloqueadas</h3>
<div class="chips">${conventionsHtml}</div>
</div>
${data.faceToFaceRule ? `<div class="card-flat f2f"><h3>Regla cara-a-cara</h3><p>${esc(data.faceToFaceRule)}</p></div>` : ''}
</div>

<div class="section-tag">Planos · ingredientes (refs @image) listados por tarjeta</div>
<div id="shots">${shotsHtml}</div>

<footer>Dead Camera Studios · ${data.shots.length} planos · revisar → cargar refs → pegar idioma → generar</footer>
</div>

<script>
(function(){var LIMIT=3500;
document.getElementById('strip').addEventListener('click',function(e){var btn=e.target.closest('.seg');if(!btn)return;var id=btn.getAttribute('data-shot');var el=document.getElementById('shot-'+id);if(el){el.scrollIntoView({block:'center'});el.classList.add('lit');setTimeout(function(){el.classList.remove('lit')},1100)}});
document.getElementById('strip').addEventListener('mouseenter',function(e){var btn=e.target.closest('.seg');if(!btn)return;var el=document.getElementById('shot-'+btn.getAttribute('data-shot'));if(el)el.classList.add('lit')},true);
document.getElementById('strip').addEventListener('mouseleave',function(e){var btn=e.target.closest('.seg');if(!btn)return;var el=document.getElementById('shot-'+btn.getAttribute('data-shot'));if(el)el.classList.remove('lit')},true);
document.querySelectorAll('.shot').forEach(function(card){var pre=card.querySelector('pre.body');var counter=card.querySelector('.counter');var bEN=card.querySelector('.lang-en');var bZH=card.querySelector('.lang-zh');var copyBtn=card.querySelector('.copy');var shotId=card.id.replace('shot-','');
function render(lang){var txt=lang==='en'?${'`${'}(window.SHOT_PROMPTS||{})[shotId+''] ? window.SHOT_PROMPTS[shotId+''] : ''${'`}'}:'';pre.textContent=txt;pre.classList.toggle('zh',lang==='zh');var n=txt.length;counter.textContent=(lang==='en'?'EN':'中文')+' '+n.toLocaleString()+' / '+LIMIT.toLocaleString();counter.className='counter'+(n>LIMIT?' bad':n>LIMIT*0.92?' warn':'');bEN.classList.toggle('on',lang==='en');bEN.setAttribute('aria-pressed',lang==='en');bZH.classList.toggle('on',lang==='zh');bZH.setAttribute('aria-pressed',lang==='zh')};
bEN.addEventListener('click',function(){render('en')});
bZH.addEventListener('click',function(){render('zh')});
copyBtn.addEventListener('click',function(ev){var txt=pre.textContent;navigator.clipboard.writeText(txt).then(function(){copyBtn.textContent='Copiado \\u2713';copyBtn.classList.add('done');setTimeout(function(){copyBtn.textContent='Copy';copyBtn.classList.remove('done')},1400)}).catch(function(){copyBtn.textContent='\\u2318C'})});
render('en')})})();
</script>
</body>
</html>`;
}

function renderShot(shot: ArtifactShot): string {
  const beatColor = BEAT_VARS[shot.beat] || 'var(--teal)';
  const cutsHtml = shot.guide.cuts
    .map((c) => `<span class="cut"><em>${esc(c[0])}</em> ${esc(c[1])}</span>`)
    .join('');

  return `
<article class="shot" id="shot-${shot.id}" style="--beat:${beatColor}">
<div class="shot-top">
<div class="shot-n">${esc(shot.id)}</div>
<div class="shot-head">
<div class="shot-title">${esc(shot.title)}</div>
<div class="shot-meta">${shot.cuts} corte${shot.cuts > 1 ? 's' : ''}</div>
</div>
<div class="shot-side">
<span class="beat-tag" style="--beat:${beatColor}">${esc(shot.beat)}</span>
<span class="dur">${shot.duration}s</span>
</div>
</div>
<div class="guide">
<div class="gl">Guía de dirección</div>
<div class="grow"><span class="k">Escena</span><span class="v">${esc(shot.guide.scene)}</span></div>
<div class="grow"><span class="k">Duración</span><span class="v"><b>${shot.duration}s</b> · ${shot.cuts} corte${shot.cuts > 1 ? 's' : ''}</span></div>
<div class="grow"><span class="k">Tipo</span><span class="v">${esc(shot.guide.type)}</span></div>
<div class="grow"><span class="k">Cortes</span><span class="v"><div class="cuts">${cutsHtml}</div></span></div>
<div class="grow"><span class="k">Importante</span><span class="v">${esc(shot.guide.important)}</span></div>
</div>
<div class="prompt">
<div class="prompt-bar">
<span class="pl">Prompt Seedance</span>
<div class="toggle" role="group" aria-label="Idioma del prompt">
<button class="lang-en on" aria-pressed="true">EN</button>
<button class="lang-zh" aria-pressed="false">中文</button>
</div>
<span class="counter" data-shot="${shot.id}">EN 0 / 3,500</span>
<button class="copy" aria-label="Copiar prompt">Copy</button>
</div>
<pre class="body" data-shot="${shot.id}" data-en="${escAttr(shot.prompt)}" data-zh="${escAttr(shot.promptZh)}">${esc(shot.prompt)}</pre>
</div>
</article>`;
}

function esc(s: string): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(s: string): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Parse any raw text (mock or API response) into ArtifactData.
 * Handles:
 *   - Direct JSON: { "title": "...", "shots": [...] }
 *   - JSON wrapped in ```json ... ``` fences
 *   - JSON wrapped in data:text/plain;base64,... URIs
 */
export function parseArtifactData(raw: string): ArtifactData | null {
  if (!raw) return null;

  let clean = raw.trim();

  // Decode data:text/plain;base64,...
  const base64Match = clean.match(/^data:text\/plain;base64,(.+)$/);
  if (base64Match) {
    try {
      clean = atob(base64Match[1]);
    } catch {
      /* not valid base64 */
    }
  }

  // Strip markdown fences
  const fenceMatch = clean.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    clean = fenceMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(clean);
    // Old ArtifactData format: has totalDuration AND shots[0].prompt (string, not object)
    if (
      parsed.shots &&
      Array.isArray(parsed.shots) &&
      typeof parsed.totalDuration === 'number' &&
      typeof parsed.shots[0]?.prompt === 'string'
    ) {
      return parsed as ArtifactData;
    }
  } catch {
    // not parseable
  }

  return null;
}

/**
 * Compute characterCount for every shot in a Sequence based on prompt length.
 * Returns a new Sequence with render.characterCount populated.
 */
export function computeCharacterCount(seq: Sequence): Sequence {
  return {
    ...seq,
    shots: seq.shots.map((shot) => ({
      ...shot,
      render: {
        ...shot.render,
        characterCount: {
          en: shot.prompt.en.length,
          zh: shot.prompt.zh?.length || 0,
        },
      },
    })),
  };
}
