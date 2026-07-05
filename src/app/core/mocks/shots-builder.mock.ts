import { Sequence } from '../interfaces';

export const SHOT_BUILDER_REQUEST = {
  scene_id: 'ce280523-60f7-430b-aad1-a36634c16401',
  project_id: '972775c4-9cf5-4a6e-be75-eb79c1413268',
  model: 'claude-shot-builder',
  prompt:
    'CREA UN SHOTLIST PARA ESTE GUION, NOSOTROS YA TENEMOS LOS INGREDIENTES VISUALES PARA SEEDANCE, LA SUMA DE LOS SHOTS DEBE DURAR UN MAXIMO DE 80 SEGUNDOS, TE ADJUNTO TAMBIEN UN ARCHIVO CON NOTAS DE DIRECCION PARA EL ACTING\n\n[Reference files: DIRECCION ACTING VERBOS.pdf, TEST ACTING.pdf]\n\n--- DIRECCION ACTING VERBOS.pdf ---\ndata:application/pdf;base64,PLACEHOLDER_KEEP_ORIGINAL',
};

export const SHOT_BUILDER_RESPONSE = {
  success: true,
  text: '```json\n{\n  "title": "The Brothers",\n  "scene": "INT. Wyatt\'s House — Living Room — Continuous",\n  "totalDuration": 79,\n  "durationCap": 80,\n  "shots": [\n    {"id":"A","beat":"HOOK","duration":11,"cuts":2,"title":"Mike irrumpe + estalla","spike":false,"prompt":"","promptZh":"","guide":{"scene":"","type":"","cuts":[],"important":""}},\n    {"id":"B","beat":"FRICTION","duration":14,"cuts":3,"title":"Advertencia · burla · reclamo","spike":false,"prompt":"","promptZh":"","guide":{"scene":"","type":"","cuts":[],"important":""}},\n    {"id":"C","beat":"FRICTION","duration":13,"cuts":3,"title":"\\"I grew up\\" · legado · los frenos","spike":false,"prompt":"","promptZh":"","guide":{"scene":"","type":"","cuts":[],"important":""}},\n    {"id":"D","beat":"SPIKE","duration":7,"cuts":1,"title":"Wyatt se congela","spike":true,"prompt":"","promptZh":"","guide":{"scene":"","type":"","cuts":[],"important":""}},\n    {"id":"E","beat":"SPIKE","duration":13,"cuts":2,"title":"Mike arremete + papel tapiz","spike":false,"prompt":"","promptZh":"","guide":{"scene":"","type":"","cuts":[],"important":""}},\n    {"id":"F","beat":"SPIKE","duration":12,"cuts":2,"title":"Demanda fría vs. furia fría","spike":false,"prompt":"","promptZh":"","guide":{"scene":"","type":"","cuts":[],"important":""}},\n    {"id":"G","beat":"BUTTON","duration":9,"cuts":2,"title":"Embiste · sale · Wyatt se vacía","spike":false,"prompt":"","promptZh":"","guide":{"scene":"","type":"","cuts":[],"important":""}}\n  ],\n  "conventions": [\n    {"label":"Formato","value":"9:16 vertical — mobile-first"},\n    {"label":"FPS","value":"24fps — obturador 180°"},\n    {"label":"Lentes","value":"Esférico / rectilíneo — campo plano, sin viñeteo"},\n    {"label":"Color Grade","value":"teal-amber"},\n    {"label":"Audio","value":"Diegético — sin música"},\n    {"label":"Metodología","value":"Prompt en positivo — capture realism — shutters hasta 3500 chars"}\n  ],\n  "faceToFaceRule": "En cortes con dos o más personajes: hombros cuadrados a cámara, solo gira la cabeza. Eyelines cruzados conectan el careo a través del corte sin renderizar dos rostros enfrentados."\n}\n```',
};

export const SHOT_SEQUENCE: Sequence = {
  description: 'Wyatt & Mike · Conflicto fraternal en la sala de estar',
  duration: 79,
  mode: 'M1',
  aspectRatio: '9:16',

  references: [
    { slot: '@image1', assetId: 'wyatt', type: 'character' },
    { slot: '@image2', assetId: 'mike', type: 'character' },
    { slot: '@image3', assetId: 'living-room', type: 'plate' },
  ],

  sequenceFlow: {
    title: 'Presupuesto de tiempo',
    subtitle: 'La temperatura sube con el conflicto',
    duration: 79,
    metric: 'dramaticIntensity',
    scale: { start: 'Frío', middle: 'Caliente', end: 'Vacío' },
    segments: [
      { id: 'A', shotId: 'A', label: 'Hook', start: 0, end: 11, intensity: 0.2, color: '#3d8b8f' },
      {
        id: 'B',
        shotId: 'B',
        label: 'Friction',
        start: 11,
        end: 25,
        intensity: 0.5,
        color: '#c98a3c',
      },
      {
        id: 'C',
        shotId: 'C',
        label: 'Friction',
        start: 25,
        end: 38,
        intensity: 0.65,
        color: '#c98a3c',
      },
      {
        id: 'D',
        shotId: 'D',
        label: 'Spike',
        start: 38,
        end: 45,
        intensity: 1.0,
        marker: true,
        color: '#e0653c',
      },
      {
        id: 'E',
        shotId: 'E',
        label: 'Spike',
        start: 45,
        end: 58,
        intensity: 0.95,
        color: '#e0653c',
      },
      {
        id: 'F',
        shotId: 'F',
        label: 'Release',
        start: 58,
        end: 70,
        intensity: 0.8,
        color: '#e0653c',
      },
      {
        id: 'G',
        shotId: 'G',
        label: 'Button',
        start: 70,
        end: 79,
        intensity: 0.15,
        color: '#5e7073',
      },
    ],
  },

  directorNotes: {
    goal: '15 beats consolidados en 7 planos multi-corte (≤3 cortes · ≤15s c/u) para mantener consistencia en las interacciones.',
    styleGuide:
      'teal-amber grade · spherical rectilinear lens · flat field no vignette · 24fps 180° · diegetic audio only · prompt in positive',
    warnings: [
      'D y E son single-character — NO cargar ref del que no aparece',
      'Face-to-face rule: shoulders square to camera, only head turns, eyelines cross the cut',
    ],
  },

  continuity: {
    keepWardrobe: true,
    keepLighting: true,
    keepEyelines: true,
    keepCameraAxis: true,
  },

  shots: [
    // ── Shot A: Mike irrumpe + estalla ──────────────────────────────────
    {
      id: 'A',
      title: 'Mike irrumpe + estalla',
      description: 'Wyatt entra y azota la puerta; Mike irrumpe atrás y explota a gritos.',
      duration: 11,
      start: 0,
      end: 11,
      camera: {
        lens: '40mm → 55mm',
        framing: 'Two-shot escalonado → single Mike',
        movement: 'Handheld',
        fps: 24,
        shutter: '180°',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Cut 1 (0–6s): Two-shot escalonado. @image1 (gafas) tercio izq x=34%. @image2 tercio der x=70%. Cut 2 (6–11s): Single @image2.',
        subjectLock: '@image1 + @image2: cara/vestuario idéntico. Hombros cuadrados a cámara.',
        crossFrameRules:
          '@image1 izq, @image2 der — nunca cruzan centro. Hombros cuadrados a cámara.',
        focus: 'Cut 1: ambos planos. Cut 2: @image2 solo.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Living room — entrada',
        movement:
          'Cut 1: @image1 entra y azota puerta; @image2 irrumpe tras él. Cut 2: @image2 solo chest-up.',
        interaction: 'Staggered two-shot, nunca cara-a-cara.',
        positions: [
          {
            subjectId: '@image1',
            description: 'Tercio izquierdo x=34%, foreground, junto a puerta',
          },
          { subjectId: '@image2', description: 'Tercio derecho x=70%, midground, irrumpe' },
        ],
      },
      acting: {
        emotion: 'Rage',
        bodyLanguage: '@image1: jaw tight, plantado. @image2: chin lifting, jaw driving.',
        dialogue: '"Are you seriously gonna do this to me again?!"',
        microExpressions: ['Chin jabbing forward', 'Hand cutting the air'],
      },
      timeline: {
        duration: 11,
        segments: [
          { start: 0, end: 6, label: 'Cut 1 — Two-shot escalonado' },
          { start: 6, end: 11, label: 'Cut 2 — Single Mike' },
        ],
        beats: [
          { start: 0, end: 2, description: '@image1 entra, azota puerta' },
          { start: 2, end: 6, description: '@image2 irrumpe, azota, drive un paso' },
          { start: 6, end: 11, description: '@image2 solo, ladra' },
        ],
      },
      audio: {
        dialogue: '"Are you seriously gonna do this to me again?! Are you fucking kidding me?!"',
        ambient: 'Room tone',
        sfx: ['Door slammed twice', 'Footfalls on floorboards', 'Fabric whip'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'wyatt', type: 'character' },
        { slot: '@image2', assetId: 'mike', type: 'character' },
        { slot: '@image3', assetId: 'living-room', type: 'plate' },
      ],
      prompt: {
        en: 'Scene & Mood: A violent intrusion. A man storms into his own home and slams the door; a second man explodes in after him. Frame Map: Cut 1 (0–6s) — staggered two-shot. @image1 left third x=34%, foreground. @image2 right third x=70%, midground. Cut 2 (6–11s) — single on @image2 centered chest-up. Subject Locks: Shoulders squared to camera, only heads turn. Cross-Frame Rules: Never cross center, never face-to-face axis. Movement: Cut 1 — @image1 steps in and slams door; @image2 bursts through and drives in. Hard cut to Cut 2 — @image2 barking to camera-left. Last Frame: Tight on @image2 centered. Capture: spherical lens, flat rectilinear field no vignette — Cut 1 40mm, Cut 2 55mm. 9:16, 24fps 180°. 11s total.',
        zh: 'Scene & Mood: 一次暴力闯入。画面布局：分镜1(0–6s)错位双人镜@image1左x=34%@image2右x=70%。分镜2(6–11s)@image2单人居中。运动：@image1进门摔门→@image2炸入→@image2咆哮。镜头：40mm/55mm。9:16竖屏24fps 180°。11s。',
      },
      render: { mode: 'M1', engine: 'Seedance', characterCount: { en: 950, zh: 200 } },
      notes: {
        todos: ['Cargar @image1 Wyatt', 'Cargar @image2 Mike', 'Cargar @image3 plate sala'],
      },
    },

    // ── Shot B: Advertencia · burla · reclamo ───────────────────────────
    {
      id: 'B',
      title: 'Advertencia · burla · reclamo',
      description: 'Wyatt temblando ordena irse; Mike se burla; Wyatt reclama la casa.',
      duration: 14,
      start: 11,
      end: 25,
      camera: {
        lens: '55mm → 55mm → 75mm',
        framing: '3 singles alternos',
        movement: 'Handheld',
        fps: 24,
        shutter: '180°',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Cut 1 (0–6s): @image1 chest-up x=48%. Cut 2 (6–10s): @image2 chest-up x=52%. Cut 3 (10–14s): @image1 más apretado.',
        subjectLock:
          '@image1: cabeza girada a der. @image2: cabeza girada a izq, barbilla levantada.',
        crossFrameRules:
          'Singles — una cara por corte. Eyelines conectan: @image1 looking screen-right, @image2 screen-left.',
        focus: 'Rostro del hablante',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Living room — centro',
        movement: 'Tres singles hard-cut, cada corte centrado chest-up.',
        interaction: 'Eyelines cruzados conectan careo sin compartir cuadro.',
        positions: [
          { subjectId: '@image1', description: 'Centrado chest-up x=48%' },
          { subjectId: '@image2', description: 'Centrado chest-up x=52%' },
        ],
      },
      acting: {
        emotion: 'Tension / Mockery / Defiance',
        bodyLanguage: '@image1: shaking, pushes glasses up. @image2: provocative tilt, half-sneer.',
        dialogue:
          '"Mike, you need to leave. Now." / "Selling my own house?" / "It\'s not your house."',
        microExpressions: ['Pushes glasses up', 'Half sneer', 'Jaw setting hard'],
      },
      timeline: {
        duration: 14,
        segments: [
          { start: 0, end: 6, label: 'Cut 1 — Wyatt "you need to leave"' },
          { start: 6, end: 10, label: 'Cut 2 — Mike "my own house"' },
          { start: 10, end: 14, label: 'Cut 3 — Wyatt "not your house"' },
        ],
        beats: [
          { start: 3, end: 6, description: '"Mike, you need to leave. Now."' },
          { start: 6, end: 10, description: '"\'Doing this\'? Doing what? Selling my own house?"' },
          {
            start: 10,
            end: 14,
            description: '"It\'s not your house. You gave up on this place years ago."',
          },
        ],
      },
      audio: {
        dialogue:
          '"Mike, you need to leave." / "\'Doing this\'? Selling my own house?" / "It\'s not your house."',
        ambient: 'Quiet room tone',
        sfx: ['Fabric movement', 'Breath', 'Fingers flexing'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'wyatt', type: 'character' },
        { slot: '@image2', assetId: 'mike', type: 'character' },
        { slot: '@image3', assetId: 'living-room', type: 'plate' },
      ],
      prompt: {
        en: 'Scene & Mood: The first parley. One man, shaking, orders the other out; the intruder mocks the idea. Frame Map: Three singles, hard-cut. Cut 1 — @image1 centered chest-up x=48%. Cut 2 — @image2 centered x=52%. Cut 3 — @image1 tighter. Subject Locks: Shoulders squared to camera, heads turned. Cross-Frame Rules: One face per cut, no face-to-face axis. Movement: Cut 1 — @image1 pushes glasses up, speaks low: "Mike, you need to leave. Now." Cut 2 — @image2 sneers: "\'Doing this\'? Selling my own house?" Cut 3 — @image1 hardens: "It\'s not your house." Last Frame: Tight on @image1, jaw set. Camera: 55mm/55mm/75mm, no vignette. 9:16, 24fps 180°. 14s total.',
        zh: '第一次交涉。画面布局：三个单人硬切。分镜1@image1居中x=48% 0–6s。分镜2@image2居中x=52% 6–10s。分镜3@image1更紧10–14s。运动：@image1上推眼镜→低语→@image2半冷笑→@image1硬下来。镜头：55mm/55mm/75mm。9:16竖屏24fps。14s。',
      },
      render: { mode: 'M1', engine: 'Seedance', characterCount: { en: 880, zh: 160 } },
      notes: { warnings: ['Tic de gafas en cut 1 — no olvidar'] },
    },

    // ── Shot C: "I grew up" · legado · los frenos ───────────────────────
    {
      id: 'C',
      title: '"I grew up" · legado · los frenos',
      description: '"I grew up" → Wyatt avanza → Mike lanza lo de los frenos.',
      duration: 13,
      start: 25,
      end: 38,
      camera: {
        lens: '55mm → 50mm → 75mm',
        framing: 'single → OTS → single',
        movement: 'Handheld',
        fps: 24,
        shutter: '180°',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Cut 1 (0–4s): Single @image2 chest-up. Cut 2 (4–8s): OTS @image2 foreground, @image1 avanza. Cut 3 (8–13s): Single @image2 x=50%.',
        subjectLock: '@image1: puños blanqueados. @image2: semi-smile → línea cruel, brow arching.',
        crossFrameRules: 'OTS: solo @image1 se renderiza. Singles otherwise.',
        focus: '@image2 cut 1 y 3, @image1 en OTS cut 2',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Living room — centro',
        movement: 'Cut 1: @image2 quieto. Cut 2: @image1 avanza hacia lens. Cut 3: @image2 quieto.',
        interaction: 'OTS deja solo una cara.',
        positions: [
          { subjectId: '@image1', description: 'Avanza hacia lens, puños subiendo' },
          { subjectId: '@image2', description: 'Chest-up centrado, luego OTS foreground' },
        ],
      },
      acting: {
        emotion: 'Escalation / Cruelty',
        bodyLanguage: '@image1: fists whitening. @image2: half-smile drops to flat cruel line.',
        dialogue:
          '"I didn\'t give up. I grew up!" / "It\'s our parents\' legacy!" / "Check the brakes."',
        microExpressions: ['Short ugly laugh', 'Brow arching', 'Sliding the knife in flat'],
      },
      timeline: {
        duration: 13,
        segments: [
          { start: 0, end: 4, label: 'Cut 1 — Mike risa fea' },
          { start: 4, end: 8, label: 'Cut 2 — Wyatt avanza (OTS)' },
          { start: 8, end: 13, label: 'Cut 3 — Mike "check the brakes"' },
        ],
        beats: [
          { start: 0, end: 4, description: '"I didn\'t give up. I grew up!"' },
          { start: 4, end: 8, description: '"It\'s our parents\' legacy, Mike!"' },
          { start: 8, end: 13, description: '"Go check the brakes this time."' },
        ],
      },
      audio: {
        dialogue:
          '"I didn\'t give up. I grew up!" / "It\'s our parents\' legacy!" / "Check the brakes this time."',
        ambient: 'Room tone, house creak',
        sfx: ['Knuckles tightening', 'Footstep', 'Ugly laugh'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'wyatt', type: 'character' },
        { slot: '@image2', assetId: 'mike', type: 'character' },
        { slot: '@image3', assetId: 'living-room', type: 'plate' },
      ],
      prompt: {
        en: 'Scene & Mood: Escalation. Jeer about growing up, appeal to legacy, cruel answer. Frame Map: Cut 1 — single @image2. Cut 2 — OTS, @image1 advancing waist-up, fists rising. Cut 3 — single @image2 tighter. Subject Locks: @image1 fists balling white, advancing. @image2 half-smile to cruel line, brow arching. Cross-Frame Rules: OTS back-to-camera, only @image1 renders. Singles otherwise. Movement: Cut 1 — @image2 ugly laugh: "I grew up!" Cut 2 — @image1 advances: "It\'s our parents\' legacy!" Cut 3 — @image2 arches brow: "Check the brakes this time." Last Frame: Tight on @image2, brow arched, cruel look. Camera: 55mm/50mm/75mm. 9:16, 24fps 180°. 13s total.',
        zh: '升级。画面布局：分镜1@image2单人0–4s。分镜2OTS@image1逼近4–8s。分镜3@image2更紧8–13s。运动：@image2丑笑→@image1逼近→@image2挑眉冷插刀。镜头：55mm/50mm/75mm。9:16竖屏24fps。13s。',
      },
      render: { mode: 'M1', engine: 'Seedance', characterCount: { en: 890, zh: 160 } },
      notes: { todos: ['Puños blanqueados entran a cuadro'] },
    },

    // ── Shot D: Wyatt se congela ───────────────────────────────────────
    {
      id: 'D',
      title: 'Wyatt se congela (Spike)',
      description: 'La línea de los frenos aterriza y Wyatt se quiebra por dentro.',
      duration: 7,
      start: 38,
      end: 45,
      camera: {
        lens: '75mm',
        framing: 'Chest-up → Close-up push-in',
        movement: 'Push-in lento continuo',
        fps: 24,
        shutter: '180°',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap: 'Single @image1 centrado x=50%. Slow push chest-up to close-up 7s.',
        subjectLock: '@image1: tres-cuartos a cámara. El golpe llega a 2s.',
        crossFrameRules: 'Single character. Una cara. Sin corte. Una toma.',
        focus: '@image1 — chest-up a close-up',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Living room — centro',
        movement: 'Una toma push-in. @image1 sostiene, a 2s golpe, a 4s retrocede medio paso.',
        interaction: 'Sin interacción — es el corazón emocional.',
        positions: [{ subjectId: '@image1', description: 'Centrado x=50%' }],
      },
      acting: {
        emotion: 'Gut-punch / Inward detonation',
        bodyLanguage: 'Freeze — breath hitching, eyes widen, shoulders drop, backs off half step.',
        dialogue: '"Don\'t. You know that wasn\'t… the police said it was a—"',
        microExpressions: [
          'Sharp caught breath',
          'Eyes widen',
          'Shoulders drop',
          'Unfinished word',
        ],
      },
      timeline: {
        duration: 7,
        segments: [{ start: 0, end: 7, label: 'Single take — freeze' }],
        beats: [
          { start: 2, end: 4, description: 'Golpe aterriza — breath catches' },
          {
            start: 4,
            end: 7,
            description: 'Backs off, broken whisper: "the police said it was a—"',
          },
        ],
      },
      audio: {
        dialogue: '"Don\'t. The police said it was a—"',
        ambient: 'Near-silence',
        sfx: ['Sharp caught breath', 'House creak'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'wyatt', type: 'character' },
        { slot: '@image2', assetId: 'living-room', type: 'plate' },
      ],
      prompt: {
        en: 'Scene & Mood: The gut-punch. Cruelty lands, composure detonates inward. Frame Map: Single on @image1, centered, slow push chest-up to close-up. Subject Lock: Facing three-quarter, shoulders squared. Movement: At 2s hit lands — breath catches, eyes widen, shoulders drop. At 4s backs off, broken whisper: "Don\'t. The police said it was a—" Last Frame: Eyes wide, lips parted on unfinished word. Camera: 75mm spherical, slow push-in. 9:16, 24fps 180°. 7s total.',
        zh: '致命一击。画面布局：@image1单人居中缓推7s。运动：2秒击中→僵住→4秒后退半步→低语破碎："the police said it was a—" 末帧：贴近双眼瞪大、双唇微启。镜头：75mm缓推。9:16竖屏24fps。7s。',
      },
      render: { mode: 'M1', engine: 'Seedance', characterCount: { en: 620, zh: 120 } },
      notes: { approved: true, warnings: ['CORTE ÚNICO — NO cargar @image2 Mike'] },
    },

    // ── Shot E: Mike arremete + papel tapiz ────────────────────────────
    {
      id: 'E',
      title: 'Mike arremete + papel tapiz',
      description: 'Mike arremete — desprecio por los muertos, la casa, demanda plana.',
      duration: 13,
      start: 45,
      end: 58,
      camera: {
        lens: '55mm → 100mm / 55mm',
        framing: 'single → insert pared + single',
        movement: 'Handheld, camera gives ground',
        fps: 24,
        shutter: '180°',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Cut 1 (0–7s): Single @image1 chest-up, cámara cede. Cut 2 (7–13s): Insert mano en pared, reframe chest-up.',
        subjectLock: '@image1: flushing, driving forward, arm points, lip curls.',
        crossFrameRules: 'Solo @image1. Insert solo mano y pared.',
        focus: '@image1 / pared en insert',
        depth: 'Shallow DOF, insert 100mm comprime',
      },
      blocking: {
        location: 'Living room — cerca de pared',
        movement: 'Cut 1: @image1 drive hacia lens. Cut 2: arm jabs a wallpaper.',
        interaction: 'Monólogo con gesticulación.',
        positions: [{ subjectId: '@image1', description: 'Chest-up, camera ceding' }],
      },
      acting: {
        emotion: 'Contempt / Aggressor',
        bodyLanguage: 'Flushing, driving forward, arm jabbing, lip curling.',
        dialogue: '"Fuck the police. Sell the shop. Sign the papers."',
        microExpressions: ['Lip curl', 'Flush', 'Hand jabbing wall'],
      },
      timeline: {
        duration: 13,
        segments: [
          { start: 0, end: 7, label: 'Cut 1 — Mike arremete' },
          { start: 7, end: 13, label: 'Cut 2 — Insert + demanda' },
        ],
        beats: [
          {
            start: 0,
            end: 7,
            description:
              'Spits contempt: "The police... You think keeping the shop open makes up for it?"',
          },
          {
            start: 7,
            end: 13,
            description: '"Sell the shop. Sign the papers. You owe me that much."',
          },
        ],
      },
      audio: {
        dialogue:
          '"The police... You think keeping the shop makes up for it? Sell the shop. Sign the papers. You owe me."',
        ambient: 'Room tone',
        sfx: ['Hand striking wall', 'Paper rustle', 'Footstep'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'mike', type: 'character' },
        { slot: '@image2', assetId: 'living-room-wallpaper', type: 'plate' },
      ],
      prompt: {
        en: 'Scene & Mood: Aggressor presses advantage — contempt for the dead, the house, the man. Frame Map: Cut 1 — single @image1, camera gives ground. Cut 2 — insert hand jabbing peeling wallpaper, then reframe. Subject Lock: Shoulders squared, head turned screen-left, flushing. Cross-Frame Rules: Only @image1 renders. Insert only hand and wall. Movement: Cut 1 — flushes, drives step, spits contempt. Cut 2 — arm jabs at wallpaper, lip curled: "Sell the shop. Sign the papers." Last Frame: Tight on @image1, lip curled. Camera: 55mm / 100mm insert. 9:16, 24fps 180°. 13s total.',
        zh: '施压者乘胜追击。画面布局：分镜1(0–7s)@image1单人。分镜2(7–13s)手臂戳向剥落墙纸+重构。运动：@image1涨红→逼近→啐出→手臂指向墙纸→"Sell the shop!" 镜头：55mm/100mm插入。9:16竖屏24fps。13s。',
      },
      render: { mode: 'M1', engine: 'Seedance', characterCount: { en: 870, zh: 150 } },
      notes: { warnings: ['NO cargar @image2 Wyatt. Cámara cede terreno.'] },
    },

    // ── Shot F: Demanda fría vs. furia fría ────────────────────────────
    {
      id: 'F',
      title: 'Demanda fría vs. furia fría',
      description: 'Última demanda fría de Mike vs primera furia fría de Wyatt.',
      duration: 12,
      start: 58,
      end: 70,
      camera: {
        lens: '75mm',
        framing: '2 singles (el careo)',
        movement: 'Handheld estable',
        fps: 24,
        shutter: '180°',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Cut 1 (0–6s) @image2 chest-up leaning. Cut 2 (6–12s) @image1 chest-up dead still.',
        subjectLock: '@image2: smirk leans, wipes mouth. @image1: fists whitening, flat stare.',
        crossFrameRules: 'Singles. @image2 screen-left, @image1 screen-right, eyelines lock.',
        focus: 'Rostro del hablante',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Living room — centro',
        movement: 'Cut 1: @image2 leans in. Cut 2: @image1 dead still.',
        interaction: 'Cross-cutting — eyelines conectan sin compartir cuadro.',
        positions: [
          { subjectId: '@image2', description: 'Chest-up leaning toward lens' },
          { subjectId: '@image1', description: 'Chest-up dead still, fists blanching' },
        ],
      },
      acting: {
        emotion: 'Cold demand vs cold fury',
        bodyLanguage: '@image2: smirk, wipes mouth. @image1: dead still, voice colder than shout.',
        dialogue: '"Mom and Dad are dead. Sign the fucking papers." / "I don\'t owe you anything."',
        microExpressions: ['Smirk', 'Wipes mouth', 'Single slow blink', 'Flat hard stare'],
      },
      timeline: {
        duration: 12,
        segments: [
          { start: 0, end: 6, label: 'Cut 1 — Mike demanda fría' },
          { start: 6, end: 12, label: 'Cut 2 — Wyatt furia fría' },
        ],
        beats: [
          { start: 0, end: 6, description: '"Mom and Dad are dead... sign the fucking papers."' },
          {
            start: 6,
            end: 12,
            description: '"I don\'t owe you anything. I\'ve spent my whole life in this house."',
          },
        ],
      },
      audio: {
        dialogue:
          '"Mom and Dad are dead. Sign the fucking papers." / "I don\'t owe you anything. I\'ve spent my whole life here."',
        ambient: 'Low room tone',
        sfx: ['Rasp of hand across mouth', 'Knuckles tightening'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'wyatt', type: 'character' },
        { slot: '@image2', assetId: 'mike', type: 'character' },
        { slot: '@image3', assetId: 'living-room', type: 'plate' },
      ],
      prompt: {
        en: 'Scene & Mood: The pivot. Cold demand meets first truly cold refusal. Frame Map: Two singles. Cut 1 — @image2 chest-up x=50%. Cut 2 — @image1 chest-up x=50% dead still. Subject Locks: @image2 smirks, wipes mouth. @image1 fists whitening, flat hard stare. Cross-Frame Rules: Singles only, eyelines lock across cut. Movement: Cut 1 — @image2 smirks, leans: "Mom and Dad are dead... sign the fucking papers." Cut 2 — @image1 dead still, colder than any shout: "I don\'t owe you anything." Last Frame: Tight on @image1, fists tight, eyes flat. Camera: 75mm spherical. 9:16, 24fps 180°. 12s total.',
        zh: '转折。倒数第二个冷要求 vs 第一份真正冰冷的拒绝。画面布局：两个单人。分镜1@image2冷笑前倾0–6s。分镜2@image1纹丝不动6–12s。运动：@image2"Mom and Dad are dead..." → @image1"I don\'t owe you anything." 镜头：75mm。9:16竖屏24fps。12s。',
      },
      render: { mode: 'M1', engine: 'Seedance', characterCount: { en: 840, zh: 140 } },
      notes: { warnings: ['Voces bajan, peligro sube. Puños blanqueados.'] },
    },

    // ── Shot G: Embiste · sale · Wyatt se vacía ────────────────────────
    {
      id: 'G',
      title: 'Embiste · sale · Wyatt se vacía',
      description: 'Mike embiste hombro, sale, portazo; Wyatt solo se vacía → negro.',
      duration: 9,
      start: 70,
      end: 79,
      camera: {
        lens: '40mm → 55mm',
        framing: 'Medium-wide → single Wyatt',
        movement: 'Handheld → near-static',
        fps: 24,
        shutter: '180°',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Cut 1 (0–4s): Medium-wide, @image2 crosses to door, shoulder-check. Cut 2 (4–9s): @image1 alone x=50% → SMASH TO BLACK.',
        subjectLock: '@image2: drives shoulder, walks out. @image1: takes hit, empties out.',
        crossFrameRules: 'Cut 1: passing shoulder-check. Cut 2: @image1 alone.',
        focus: 'Movement en cut 1, vacío en cut 2',
        depth: 'Medium DOF cut 1, shallow on @image1 cut 2',
      },
      blocking: {
        location: 'Living room — centro → puerta',
        movement:
          'Cut 1: @image2 shoulder-checks, strides to door, slams. Cut 2: @image1 alone → SMASH TO BLACK.',
        interaction: 'Contacto de paso. Negro cierra el episodio.',
        positions: [
          { subjectId: '@image2', description: 'Cruza de centro a puerta, shoulder-checks' },
          { subjectId: '@image1', description: 'Left-of-center, rocked, then alone' },
        ],
      },
      acting: {
        emotion: 'Exit / Wreckage / Emptiness',
        bodyLanguage: '@image2: never looks back. @image1: shoulders fall, gaze to nothing.',
        dialogue: '(Silence. No final line.)',
        microExpressions: ['Shoulders fall', 'Gaze through room to nothing'],
      },
      timeline: {
        duration: 9,
        segments: [
          { start: 0, end: 4, label: 'Cut 1 — Shoulder-check + exit + slam' },
          { start: 4, end: 9, label: 'Cut 2 — Wyatt alone → BLACK' },
        ],
        beats: [
          { start: 0, end: 4, description: 'Shoulder-check, door slam' },
          { start: 4, end: 9, description: 'Empty. Shoulders fall. SMASH TO BLACK.' },
        ],
      },
      audio: {
        dialogue: '',
        ambient: 'Thinning → silence',
        sfx: ['Shoulder impact', 'Door slam', 'Single breath'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'wyatt', type: 'character' },
        { slot: '@image2', assetId: 'mike', type: 'character' },
        { slot: '@image3', assetId: 'living-room-door', type: 'plate' },
      ],
      prompt: {
        en: 'Scene & Mood: The exit and the wreckage. Shoulder driven home, door slammed, man left alone. Frame Map: Cut 1 — medium wide, @image2 crosses to door, shoulder-checks @image1. Cut 2 — @image1 alone, empty → SMASH TO BLACK. Subject Locks: @image2 never looks back. @image1 empties out. Movement: Cut 1 — shoulder-check, strides to door, slams. Cut 2 — fight drains, shoulders fall, gaze to nothing. Hold two beats → SMASH TO BLACK. Camera: 40mm / 55mm. 9:16, 24fps 180°. 9s total.',
        zh: '离场与残局。画面布局：分镜1(0–4s)中景@image2穿过撞肩@image1→出门→摔门。分镜2(4–9s)@image1独自→肩膀沉落→SMASH TO BLACK。镜头：40mm/55mm。9:16竖屏24fps。9s。',
      },
      render: { mode: 'M1', engine: 'Seedance', characterCount: { en: 740, zh: 120 } },
      notes: { approved: true, warnings: ['SMASH TO BLACK cierra el episodio'] },
    },
  ],
};
