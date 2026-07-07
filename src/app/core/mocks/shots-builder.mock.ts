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
      render: { mode: 'M1', engine: 'Seedance' },
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
      render: { mode: 'M1', engine: 'Seedance' },
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
      render: { mode: 'M1', engine: 'Seedance' },
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
      render: { mode: 'M1', engine: 'Seedance' },

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
      render: { mode: 'M1', engine: 'Seedance' },

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
      render: { mode: 'M1', engine: 'Seedance' },

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
      render: { mode: 'M1', engine: 'Seedance' },

      notes: { approved: true, warnings: ['SMASH TO BLACK cierra el episodio'] },
    },
  ],
};

const SHOT_OPTIMIZE_API: Sequence = {
  description: 'Elena & David - Romantic confession in a sunlit apartment',
  duration: 80,
  mode: 'M1',
  aspectRatio: '9:16',
  references: [
    { slot: '@image1', assetId: 'elena', type: 'character' },
    { slot: '@image2', assetId: 'david', type: 'character' },
  ],
  sequenceFlow: {
    title: 'Time budget',
    subtitle: 'Silence that becomes confession',
    duration: 80,
    metric: 'emotion',
    scale: { start: 'Unaware', middle: 'Charged', end: 'Surrendered' },
    segments: [
      { id: 'A', shotId: 'A', label: 'Hook', start: 0, end: 10, intensity: 0.15, color: '#5c8fa8' },
      {
        id: 'B',
        shotId: 'B',
        label: 'Friction',
        start: 10,
        end: 22,
        intensity: 0.35,
        color: '#6b9e7a',
      },
      {
        id: 'C',
        shotId: 'C',
        label: 'Friction',
        start: 22,
        end: 36,
        intensity: 0.55,
        color: '#c4923a',
      },
      {
        id: 'D',
        shotId: 'D',
        label: 'Spike',
        start: 36,
        end: 55,
        intensity: 0.85,
        color: '#c45c3a',
      },
      {
        id: 'E',
        shotId: 'E',
        label: 'Button',
        start: 55,
        end: 80,
        intensity: 0.4,
        color: '#8a6fbf',
      },
    ],
  },
  directorNotes: {
    goal: "The audience should feel the exact moment two people stop pretending they don't love each other — tenderness collapsing into terrifying honesty.",
    styleGuide:
      'warm golden-teal grade - spherical rectilinear lens - flat field no vignette - 24fps 180 degree - diegetic audio only - prompt in positive - natural window light - analog grain texture',
    warnings: [
      'Never place @image1 and @image2 face-to-face in the same frame — use staggered depth or singles only',
      'Keep wardrobe and hair identical across all shots for @image1 and @image2',
      'No digital plastic skin — analog texture mandatory',
      'Shallow DOF required in every shot — never full focus on both subjects simultaneously',
      'Do not cross the 180-degree line between Elena and David',
    ],
  },
  shots: [
    {
      id: 'A',
      title: 'Elena alone — she holds the letter',
      description:
        'Elena stands by the apartment window, holding an unopened letter, staring at the street below as morning light falls across her face.',
      duration: 10,
      start: 0,
      end: 10,
      camera: {
        lens: '50mm',
        framing: 'Chest-up single — @image1 center-left frame',
        movement: 'Near-static, barely perceptible breath drift',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Full shot duration (0-10s): Single @image1. Center-left x=40%. Window frame visible right third. Curtain soft in background.',
        subjectLock:
          '@image1: consistent face, hair, wardrobe throughout scene. Shoulders at slight diagonal to camera.',
        crossFrameRules:
          '@image1 occupies left-center. Right side open toward window. Never cross center line.',
        focus: '@image1 sharp. Window and street behind rendered as warm bokeh.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Sunlit apartment — living room window bay',
        movement:
          '@image1 stands still, weight shifting imperceptibly. Fingers slowly tighten around the envelope. Eyes move from street to letter.',
        interaction: 'Solo. No second subject in frame.',
        positions: [
          {
            subjectId: '@image1',
            description: 'Center-left x=40%, chest-up, facing slightly right toward window light',
          },
        ],
      },
      acting: {
        emotion: 'Suspended anticipation',
        bodyLanguage:
          '@image1: shoulders softly rounded, chin slightly lowered, breath held. Fingers press the letter against sternum.',
        dialogue: '',
        microExpressions: [
          'Lower lip pressed inward',
          'Slow blink — eyes wet but not crying',
          'Thumb running along envelope edge',
        ],
      },
      timeline: {
        duration: 10,
        segments: [{ start: 0, end: 10, label: 'Single Elena at window' }],
        beats: [
          { start: 0, end: 4, description: '@image1 stares at street, letter held loose' },
          { start: 4, end: 8, description: '@image1 looks down at the letter, fingers tighten' },
          { start: 8, end: 10, description: '@image1 inhales — holds — does not open it' },
        ],
      },
      audio: {
        dialogue: '',
        ambient: 'Distant city hum, pigeons on ledge, faint traffic',
        sfx: ['Paper envelope rustling softly', 'Single pigeon flutter off-screen'],
        music: false,
      },
      references: [{ slot: '@image1', assetId: 'elena', type: 'character' }],
      prompt: {
        en: 'SCENE: Sunlit apartment living room, morning golden hour. A young woman (@image1, Elena — consistent face, hair, wardrobe throughout) stands alone at a bay window, chest-up framing, center-left of frame at x=40%. She holds an unopened white envelope pressed lightly against her sternum with both hands.\n\nFRAME MAP: Single @image1 occupies center-left of the 9:16 vertical frame. Window frame and soft curtain visible in right third. Street and buildings behind rendered as warm golden bokeh. @image1 x=40% horizontal position.\n\nCOMPOSITION: 50mm spherical rectilinear lens. Chest-up single. Shallow DOF — @image1 face and hands sharp, everything behind dissolves into warm amber and teal bokeh. Flat field, no vignette. Shoulders at slight diagonal to camera, body angled slightly right toward window light.\n\nACTING & BLOCKING: @image1 stands nearly still — a barely perceptible shift of weight. Her shoulders are softly rounded, chin slightly lowered. She stares at the street below for 4 seconds, then her gaze drops slowly to the envelope in her hands. Fingers tighten around the paper. At 8 seconds she draws a slow deliberate inhale and holds it — she does not open the letter.\n\nMICRO-EXPRESSIONS: Lower lip pressed inward. Slow blink — eyes luminous, not crying. Thumb running along the envelope edge in a small repetitive stroke. No dialogue.\n\nLAST FRAME: @image1 frozen mid-breath, envelope held to sternum, eyes lowered, bathed in warm morning window light. Right side of frame open toward the glowing window.\n\nAUDIO: Diegetic only. Distant city hum, pigeons on ledge, faint traffic rumble. Paper envelope rustling softly as fingers adjust grip. Single pigeon flutter off-screen at ~6s.\n\nCAMERA: 50mm spherical rectilinear. Near-static — barely perceptible breath drift, camera locked. 9:16 aspect ratio. 24fps. 180-degree shutter. Analog grain texture. Warm teal-amber grade. No music.',
        zh: '场景：公寓客厅，清晨金色时分。一位年轻女性（@image1，Elena——整个场景中面容、发型、服装保持一致）独自站在飘窗前，胸部以上构图，位于画面左中位置，水平坐标约x=40%。她双手轻轻将一封未拆开的白色信封贴在胸口。\n\n画面布局：单人画面，@image1占据9:16竖幅画面的左中区域。窗框和柔和的窗帘出现在右侧三分之一处。身后的街道与建筑融化为温暖的金琥珀和青色散景。@image1水平位置约x=40%。\n\n构图：50mm球面镜头。胸部以上单人镜头。浅景深——@image1的脸和双手清晰锐利，身后所有元素化为温暖的琥珀与青色虚化。平坦画场，无暗角。肩膀与镜头呈轻微对角线，身体略微朝向右侧窗光方向。\n\n表演与调度：@image1几乎静止——重心有微乎其微的移动。她肩膀轻柔地内收，下巴略低。她凝视楼下街道约4秒，随后目光缓缓落到手中的信封上。手指收紧握住纸张。第8秒时她缓慢而刻意地深吸一口气并屏住——她没有拆开信封。\n\n微表情：下唇向内轻咬。缓慢眨眼——双眼明亮湿润但未落泪。拇指在信封边缘来回摩挲做小幅重复动作。无台词。\n\n最后一帧：@image1屏气凝神，信封贴于胸口，目光下垂，沐浴在温暖的清晨窗光中。画面右侧向发光的窗户敞开。\n\n音效：仅限现场音效。远处城市噪音、窗台上的鸽子声、微弱的车流声。手指调整握持时信封纸张轻微沙沙声。约第6秒时画面外传来单只鸽子扑翅声。\n\n摄影机：50mm球面镜头。近乎静止——几乎感受不到的呼吸漂移，摄影机锁定。9:16画幅。24帧率。180度快门角。胶片颗粒质感。温暖青金色调。无音乐。',
      },
      render: {
        mode: 'M1',
        engine: 'Seedance',
      },
      notes: {
        todos: ['Load @image1 Elena — face, wardrobe, hair reference'],
        warnings: ['No second character in frame — solo shot'],
        approved: false,
      },
    },
    {
      id: 'B',
      title: 'David enters — staggered two-shot, tension mounts',
      description:
        'David enters the apartment behind Elena; she hears him but does not turn. He stops when he sees her at the window.',
      duration: 12,
      start: 10,
      end: 22,
      camera: {
        lens: '40mm',
        framing: 'Staggered two-shot — @image1 foreground left, @image2 background right',
        movement: 'Handheld stable — slight organic sway',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Full shot duration (10-22s): Staggered two-shot. @image1 foreground left third x=30%, in focus. @image2 background right third x=72%, soft focus entering frame at ~12s.',
        subjectLock:
          '@image1 + @image2: identical face/wardrobe to shot A and throughout. Shoulders never square to each other within frame.',
        crossFrameRules:
          '@image1 holds left third. @image2 enters right third. Never cross center line. @image1 always closer to camera.',
        focus:
          '@image1 sharp foreground. @image2 rendered in shallow soft focus behind — depth separation visible.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Sunlit apartment — living room, from doorway to window zone',
        movement:
          '@image1 remains stationary at window, back partially toward camera. @image2 enters through door in right background at 12s (cumulative), takes three steps in, stops when he sees @image1. His hand rests on door frame.',
        interaction:
          "Staggered — never face-to-face. @image1 front-left, @image2 back-right. Eyelines diverge: @image1 toward window, @image2 toward @image1's back.",
        positions: [
          {
            subjectId: '@image1',
            description: 'Left third x=30%, foreground, partial back to camera, facing window',
          },
          {
            subjectId: '@image2',
            description:
              'Right third x=72%, background, facing into room toward @image1, hand on door frame',
          },
        ],
      },
      acting: {
        emotion: 'Surprise folding into careful stillness',
        bodyLanguage:
          '@image1: spine straightens almost imperceptibly when she hears door — she knows it is him. @image2: takes three deliberate steps then stops dead, weight forward, jaw tightening as he reads her posture.',
        dialogue: '',
        microExpressions: [
          '@image1: shoulder blades drawing together',
          '@image2: hand gripping door frame knuckles whitening',
          '@image2: slow breath visible in chest expansion',
        ],
      },
      timeline: {
        duration: 12,
        segments: [
          { start: 10, end: 12, label: 'Elena alone at window — sound of door' },
          { start: 12, end: 22, label: 'David enters, staggered two-shot holds' },
        ],
        beats: [
          {
            start: 10,
            end: 12,
            description: '@image1 spine stiffens — faint door sound off-screen',
          },
          {
            start: 12,
            end: 17,
            description: '@image2 enters right background, three steps, stops',
          },
          {
            start: 17,
            end: 22,
            description: "Both frozen — @image2 watches @image1's back, neither speaks",
          },
        ],
      },
      audio: {
        dialogue: '',
        ambient: 'Room tone, quiet apartment, distant city',
        sfx: [
          'Door opening — wooden creak',
          'Footsteps on hardwood — three steps then silence',
          'Subtle environmental settle',
        ],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'elena', type: 'character' },
        { slot: '@image2', assetId: 'david', type: 'character' },
      ],
      prompt: {
        en: "SCENE: Sunlit apartment living room, continuous morning golden hour. Two characters: @image1 (Elena — consistent face/wardrobe/hair from shot A) and @image2 (David — consistent face/wardrobe/hair throughout).\n\nFRAME MAP: Staggered two-shot. @image1 occupies left third of the 9:16 vertical frame at x=30%, FOREGROUND, partial back to camera facing the window. @image2 occupies right third x=72%, BACKGROUND, facing into the room toward @image1's back. Never crossing the center line. @image1 always closer to camera.\n\nCOMPOSITION: 40mm spherical rectilinear lens. Staggered depth composition — @image1 sharp in foreground, @image2 in soft shallow-DOF background. Flat field, no vignette. Handheld stable — slight organic sway. Warm teal-amber grade.\n\nACTING & BLOCKING: Shot begins with @image1 alone at window (0-2s of this shot). At 2s a wooden door creak is heard off-screen. @image1's spine straightens almost imperceptibly — she knows who it is. At 2s @image2 enters through door in right background, takes three deliberate steps forward, and stops dead the moment he sees her back at the window. His hand rests on the door frame. Both freeze. @image2 watches @image1 carefully — jaw tight, weight leaning forward. @image1 does not turn. Neither speaks. This stillness holds for 5 seconds.\n\nMICRO-EXPRESSIONS: @image1: shoulder blades drawing together, a subtle tightening of posture. @image2: knuckles whitening on door frame, slow visible chest expansion as he breathes.\n\nLAST FRAME: Both frozen in staggered depth — @image1 foreground left facing window, @image2 background right watching her. The charged silence between them fills the room.\n\nAUDIO: Diegetic only. Room tone, quiet apartment, distant city hum. Wooden door creak at 2s. Three footsteps on hardwood then absolute silence. No music.\n\nCAMERA: 40mm spherical rectilinear. Handheld stable — slight organic breath sway. 9:16 aspect ratio. 24fps. 180-degree shutter. Analog grain texture.",
        zh: '场景：公寓客厅，清晨金色时分连续进行。两位角色：@image1（Elena——延续镜头A中的面容/服装/发型）和@image2（David——整个场景保持面容/服装/发型一致）。\n\n画面布局：错位双人构图。@image1占据9:16竖幅画面左侧三分之一，水平位置x=30%，位于前景，背部局部朝向摄影机，面向窗户。@image2占据右侧三分之一x=72%，位于背景，面向室内朝向@image1的背影。两人永不跨越中心线。@image1始终更靠近摄影机。\n\n构图：40mm球面镜头。错位景深构图——@image1前景清晰，@image2在浅景深背景中柔化。平坦画场，无暗角。手持稳定拍摄——轻微自然摇动。温暖青金色调。\n\n表演与调度：镜头开始时@image1独自站在窗前（本镜头前2秒）。第2秒画面外传来木门吱嘎声。@image1脊背几乎察觉不到地挺直——她知道来者是谁。第2秒@image2从右侧背景的门口进入，向前迈三步后骤然停住，恰在他看到她背影的瞬间。他的手搭在门框上。两人同时僵住。@image2仔细打量@image1——下颌收紧，身体略前倾。@image1没有转身。两人沉默无语。这种静止持续约5秒。\n\n微表情：@image1：肩胛骨轻微内收，姿态微妙收紧。@image2：握门框的指关节泛白，胸腔随呼吸可见地扩张。\n\n最后一帧：两人在错位景深中僵住——@image1前景左侧面向窗户，@image2背景右侧注视着她。两人之间充满张力的沉默弥漫整个房间。\n\n音效：仅限现场音效。室内背景音，安静的公寓，远处城市噪音。第2秒木门吱嘎声。三步木地板脚步声后归于绝对寂静。无音乐。\n\n摄影机：40mm球面镜头。手持稳定——轻微自然呼吸晃动。9:16画幅。24帧率。180度快门角。胶片颗粒质感。',
      },
      render: {
        mode: 'M1',
        engine: 'Seedance',
      },
      notes: {
        todos: [
          'Load @image1 Elena',
          'Load @image2 David — confirm wardrobe consistent with entire sequence',
        ],
        warnings: [
          '@image1 and @image2 must never face each other directly within the same frame — staggered depth only',
        ],
        approved: false,
      },
    },
    {
      id: 'C',
      title: 'David speaks — OTS push-in on Elena',
      description:
        "David breaks the silence with a single quiet sentence. Camera catches Elena's face in profile as she absorbs his words.",
      duration: 14,
      start: 22,
      end: 36,
      camera: {
        lens: '55mm to 75mm',
        framing: 'OTS @image2 shoulder — @image1 profile center frame, slow push-in',
        movement: 'Push-in lento continuo — imperceptible drift toward @image1',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Full shot duration (22-36s): OTS framing. @image2 right-back shoulder at x=75%, blurred. @image1 profile center x=45%. Slow push-in: starts chest-up, ends close-up of @image1 face by end of shot.',
        subjectLock:
          '@image1 + @image2: identical face/wardrobe. @image2 shoulder only in frame — no full face.',
        crossFrameRules:
          '@image1 center-left profile. @image2 back-shoulder only right edge. Camera tracks @image1 exclusively.',
        focus:
          '@image1 face and profile sharp. @image2 shoulder in foreground bokeh. Background apartment soft.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: "Sunlit apartment — living room, Elena's position at window maintained",
        movement:
          '@image1 holds position at window, slowly turns profile toward camera at ~24s cumulative. @image2 remains stationary in background right, only shoulder entering frame left-right edge. Camera slowly pushes in on @image1 face across the shot.',
        interaction:
          'OTS. @image2 shoulder anchors depth. @image1 face is the sole dramatic focus.',
        positions: [
          {
            subjectId: '@image1',
            description:
              'Center x=45%, profile — turns to quarter-profile at 24s cumulative, staying at window position',
          },
          {
            subjectId: '@image2',
            description: 'Right edge background x=75%, only shoulder in frame, body facing @image1',
          },
        ],
      },
      acting: {
        emotion: 'Words landing like stones in still water',
        bodyLanguage:
          '@image1: turns slowly to quarter-profile, eyes closing briefly as she absorbs his words, envelope still held to chest. @image2: OFF CAMERA voice only — shoulder and arm visible, not moving.',
        dialogue: '"I read it. I\'ve always known."',
        microExpressions: [
          '@image1: jaw slightly slack — breath catches',
          '@image1: eyelid flutter before slow close',
          '@image1: hand on envelope pressing harder against chest',
        ],
      },
      timeline: {
        duration: 14,
        segments: [
          { start: 22, end: 25, label: 'Hold before David speaks' },
          { start: 25, end: 30, label: 'David delivers line — Elena absorbs' },
          { start: 30, end: 36, label: 'Push-in completes to close-up Elena' },
        ],
        beats: [
          {
            start: 22,
            end: 25,
            description: 'Continued silence — push-in begins almost imperceptibly',
          },
          {
            start: 25,
            end: 28,
            description: "@image2 voice off-shoulder: 'I read it. I've always known.'",
          },
          {
            start: 28,
            end: 32,
            description: '@image1 turns to quarter-profile, eyes close briefly',
          },
          {
            start: 32,
            end: 36,
            description: 'Push-in completes — @image1 face fills frame, eyes open, wet',
          },
        ],
      },
      audio: {
        dialogue: '"I read it. I\'ve always known."',
        ambient: 'Near-silence. Room tone only. City gone distant.',
        sfx: ['Faint paper crinkle as @image1 hand tightens on envelope'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'elena', type: 'character' },
        { slot: '@image2', assetId: 'david', type: 'character' },
      ],
      prompt: {
        en: "SCENE: Sunlit apartment living room, continuous morning. Two characters: @image1 (Elena — consistent face/wardrobe/hair) and @image2 (David — consistent face/wardrobe/hair).\n\nFRAME MAP: OTS composition across the full 14-second shot. @image2 back-right shoulder occupies right edge of frame at x=75%, heavily blurred foreground bokeh — face NOT visible. @image1 profile at center x=45%, faces slightly right. Lens pushes slowly from 55mm to 75mm — @image1 starts chest-up, ends as close-up by 36s cumulative.\n\nCOMPOSITION: 55mm to 75mm spherical rectilinear push-in. Shallow DOF — @image1 face and profile sharp throughout. @image2 shoulder in foreground rendered as soft blur anchor. Background apartment dissolves into warm bokeh. Flat field, no vignette. Warm teal-amber grade.\n\nACTING & BLOCKING: First 3 seconds (22-25s cumulative) hold in near-silence — push already beginning almost imperceptibly. At 25s @image2 speaks in a quiet, precise voice off-shoulder: 'I read it. I've always known.' At 28s @image1 slowly turns to quarter-profile toward camera. Her eyes close briefly — a single long blink. The envelope in her hands is pressed harder against her chest. By 32s her eyes open again — luminous and wet. Push-in completes by 36s: @image1's face fills the close-up frame.\n\nMICRO-EXPRESSIONS: @image1: jaw slightly slack, breath visibly catching when the words land. Eyelid flutter before slow deliberate close. Hand pressing envelope harder into sternum.\n\nLAST FRAME: @image1 close-up profile, eyes open and luminous, face turned toward camera in three-quarter view. @image2 shoulder soft-blur right edge. Warm window light raking across @image1 cheekbone.\n\nAUDIO: Diegetic only. Near-silence — room tone, city completely distant. @image2 voice quiet and precise at 25s: 'I read it. I've always known.' Faint paper crinkle as @image1 hand tightens on envelope at ~28s. No music.\n\nCAMERA: 55mm pushing slowly to 75mm spherical rectilinear. Push-in lento continuo — imperceptible drift. 9:16 aspect ratio. 24fps. 180-degree shutter. Analog grain texture.",
        zh: "场景：公寓客厅，清晨连续进行。两位角色：@image1（Elena——保持面容/服装/发型一致）和@image2（David——保持面容/服装/发型一致）。\n\n画面布局：整个14秒镜头采用过肩构图。@image2的后背右侧肩膀占据画面右边缘x=75%位置，大量前景虚化——面部不可见。@image1侧面位于画面中央x=45%，略朝右。镜头从55mm缓慢推至75mm——@image1从胸部以上构图开始，至第36秒累计时变为特写。\n\n构图：55mm推至75mm球面镜头缓推。浅景深——@image1面部和侧面轮廓全程清晰。@image2肩膀作为前景柔化虚化锚点。背景公寓融化为温暖散景。平坦画场，无暗角。温暖青金色调。\n\n表演与调度：前3秒（累计22-25秒）在近乎寂静中保持——推镜几乎察觉不到地已经开始。第25秒@image2从肩膀外发出安静而清晰的声音：'我读了。我一直都知道。'第28秒@image1缓慢转向四分之三侧面朝向摄影机。她的眼睛短暂闭合——一次缓慢的长眨眼。她手中的信封被更用力地贴在胸口。第32秒她的眼睛再次睁开——明亮而湿润。第36秒推镜完成：@image1面部填满特写画面。\n\n微表情：@image1：下颌微微松弛，话语落下时呼吸可见地凝滞。眼睑颤动后缓慢刻意地闭合。手掌更用力将信封压入胸骨。\n\n最后一帧：@image1侧面特写，双眼睁开明亮，面部转向摄影机呈四分之三视角。@image2肩膀在右边缘柔化虚化。温暖窗光斜照过@image1颧骨。\n\n音效：仅限现场音效。近乎寂静——室内背景音，城市声音完全退远。第25秒@image2声音安静清晰：我读了。我一直都知道。'约第28秒@image1手握信封收紧时传来微弱纸张沙沙声。无音乐。\n\n摄影机：55mm缓慢推至75mm球面镜头。缓慢推进——几乎察觉不到的运动。9:16画幅。24帧率。180度快门角。胶片颗粒质感。",
      },
      render: {
        mode: 'M1',
        engine: 'Seedance',
      },
      notes: {
        todos: [
          'Confirm @image2 shoulder only — no face in this shot',
          'Sync dialogue timing with audio track',
        ],
        warnings: ['@image2 face must NOT appear — shoulder/arm only in this OTS'],
        approved: false,
      },
    },
    {
      id: 'D',
      title: 'Elena turns — singles alternating, the confession',
      description:
        'Elena finally turns to face David. Two singles in rapid alternation capture the raw exchange — she confesses, he receives it.',
      duration: 19,
      start: 36,
      end: 55,
      camera: {
        lens: '75mm, 85mm',
        framing:
          'Singles alternating — Cut 1: @image1 close-up. Cut 2: @image2 close-up. Cut 3: @image1 extreme close-up. Cut 4: @image2 extreme close-up.',
        movement: 'Handheld — slight micro-tremor, intimate',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Cut 1 (36-41s): Single @image1 close-up x=50%, 75mm, now fully turned toward camera. Cut 2 (41-46s): Single @image2 close-up x=50%, 75mm, reaction. Cut 3 (46-50s): @image1 extreme close-up 85mm x=50%, mouth and eyes. Cut 4 (50-55s): @image2 extreme close-up 85mm x=50%, eyes filling frame.',
        subjectLock:
          '@image1 + @image2: identical face/wardrobe throughout. Eyelines suggest connection across cuts — @image1 looks screen-right, @image2 looks screen-left. Maintained 180-degree rule.',
        crossFrameRules:
          '@image1 always looks screen-right. @image2 always looks screen-left. Eyelines connect across the cut. Never in the same frame in this shot sequence.',
        focus: 'Each single: subject sharp, background apartment soft warm bokeh.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location:
          'Sunlit apartment — @image1 has turned from window. @image2 remains near doorway.',
        movement:
          'Cut 1: @image1 has turned fully to face @image2 direction. Eyes meeting across space. Cut 2: @image2 absorbs her gaze — does not move. Cut 3: @image1 opens mouth, speaks. Cut 4: @image2 eyes react — deep breath.',
        interaction: 'Singles only — eyelines connect across cuts. Never share frame.',
        positions: [
          {
            subjectId: '@image1',
            description: "Center x=50%, close-up, facing screen-right toward David's eyeline",
          },
          {
            subjectId: '@image2',
            description: "Center x=50%, close-up, facing screen-left toward Elena's eyeline",
          },
        ],
      },
      acting: {
        emotion: 'Terror + surrender — the confession',
        bodyLanguage:
          '@image1: turned fully, chin lifted, eyes direct and trembling with unshed tears. Envelope lowered to side — both hands visible. @image2: jaw locked then slowly releases, eyes softening, a single visible swallow.',
        dialogue:
          '"I wrote it two years ago. I never sent it because I was afraid you already knew."',
        microExpressions: [
          '@image1: chin lifting as she speaks — vulnerability in the set of the jaw',
          '@image1: one tear breaking at outer corner of eye in Cut 3',
          "@image2: visible swallow in Cut 4 — Adam's apple rising and falling",
          '@image2: corners of mouth softening — not smiling, something harder than that',
        ],
      },
      timeline: {
        duration: 19,
        segments: [
          { start: 36, end: 41, label: 'Cut 1 — Elena CU, fully turned, holds gaze' },
          { start: 41, end: 46, label: 'Cut 2 — David CU, absorbing' },
          { start: 46, end: 50, label: 'Cut 3 — Elena ECU, speaks' },
          { start: 50, end: 55, label: 'Cut 4 — David ECU, receives' },
        ],
        beats: [
          {
            start: 36,
            end: 41,
            description: '@image1 holds his gaze in silence — the weight of the moment',
          },
          { start: 41, end: 46, description: '@image2 stares back — jaw unlocking' },
          { start: 46, end: 50, description: '@image1 speaks the confession, one tear breaks' },
          { start: 50, end: 55, description: '@image2 absorbs — swallow, eyes soften' },
        ],
      },
      audio: {
        dialogue:
          '"I wrote it two years ago. I never sent it because I was afraid you already knew."',
        ambient: 'Near-silence. Room tone only.',
        sfx: ['Envelope lightly lowered — soft fabric rustle against hand'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'elena', type: 'character' },
        { slot: '@image2', assetId: 'david', type: 'character' },
      ],
      prompt: {
        en: "SCENE: Sunlit apartment living room, continuous morning. Two characters: @image1 (Elena — consistent face/wardrobe/hair) and @image2 (David — consistent face/wardrobe/hair). This shot is a four-cut alternating singles sequence — @image1 and @image2 NEVER share the same frame.\n\nFRAME MAP:\nCut 1 (0-5s of this shot, cumulative 36-41s): Single @image1 close-up. Center x=50%. 75mm. @image1 has turned fully from the window and holds @image2's eyeline (screen-right). Silent. Envelope lowered to her side.\nCut 2 (5-10s, cumulative 41-46s): Single @image2 close-up. Center x=50%. 75mm. @image2 stares screen-left toward @image1. Jaw tight then slowly releasing.\nCut 3 (10-14s, cumulative 46-50s): Single @image1 extreme close-up. Center x=50%. 85mm. Mouth and eyes fill frame. She speaks.\nCut 4 (14-19s, cumulative 50-55s): Single @image2 extreme close-up. Center x=50%. 85mm. Eyes fill frame. He receives her words.\n\nCOMPOSITION: 75mm (Cuts 1-2) and 85mm (Cuts 3-4) spherical rectilinear. Shallow DOF — subject sharp, warm apartment bokeh behind. Flat field, no vignette. Handheld — slight micro-tremor, intimate proximity feel. Warm teal-amber grade. 180-degree rule maintained: @image1 ALWAYS looks screen-right; @image2 ALWAYS looks screen-left.\n\nACTING & BLOCKING:\nCut 1: @image1 has turned fully from window, facing David's direction. Chin lifted. Eyes direct, trembling with unshed tears. Envelope held loose at her side, both hands visible. Holds gaze in silence 5 seconds.\nCut 2: @image2 stares back screen-left. Jaw locked tight then slowly unlocking. Body does not move. One visible breath.\nCut 3: @image1 opens her mouth. Speaks quietly but clearly: 'I wrote it two years ago. I never sent it because I was afraid you already knew.' At the last word, one tear breaks at the outer corner of her eye — slow and real.\nCut 4: @image2's eyes absorb every word. A visible swallow — Adam's apple rising and falling. The corners of his mouth soften — not smiling, something harder and more honest than that.\n\nMICRO-EXPRESSIONS: @image1: chin lifting as she speaks, vulnerability in jaw set, one real tear at outer eye corner. @image2: visible swallow, mouth corners releasing tension.\n\nLAST FRAME: @image2 extreme close-up — eyes soft, wet, steady. The confession has landed.\n\nAUDIO: Diegetic only. Near-silence — room tone only. @image1 dialogue quiet and clear in Cut 3: 'I wrote it two years ago. I never sent it because I was afraid you already knew.' Soft fabric rustle as envelope is lowered at Cut 1. No music.\n\nCAMERA: 75mm then 85mm spherical rectilinear. Handheld — slight micro-tremor. 9:16 aspect ratio. 24fps. 180-degree shutter. Analog grain texture.",
        zh: "场景：公寓客厅，清晨连续进行。两位角色：@image1（Elena——保持面容/服装/发型一致）和@image2（David——保持面容/服装/发型一致）。本镜头为四切交替单人镜头序列——@image1和@image2绝对不在同一画面中出现。\n\n画面布局：\n第1切（本镜头0-5秒，累计36-41秒）：@image1单人特写。中心x=50%。75mm。@image1已完全从窗户转身，保持@image2的视线方向（看向画面右侧）。沉默。信封垂放在她身侧。\n第2切（5-10秒，累计41-46秒）：@image2单人特写。中心x=50%。75mm。@image2凝视画面左侧朝向@image1。下颌收紧后缓慢松开。\n第3切（10-14秒，累计46-50秒）：@image1单人大特写。中心x=50%。85mm。嘴唇和眼睛充满画面。她开口说话。\n第4切（14-19秒，累计50-55秒）：@image2单人大特写。中心x=50%。85mm。双眼充满画面。他接受她的话语。\n\n构图：第1-2切75mm，第3-4切85mm球面镜头。浅景深——主体清晰，背后公寓温暖散景。平坦画场，无暗角。手持——轻微微颤，营造亲密感。温暖青金色调。严格遵守180度轴线：@image1始终看向画面右侧；@image2始终看向画面左侧。\n\n表演与调度：\n第1切：@image1已从窗户完全转身，面向David的方向。下巴抬起。眼神直视，带着未落泪水的颤抖。信封松松垂在身侧，双手可见。沉默凝视5秒。\n第2切：@image2对视画面左侧。下颌紧锁后缓缓松开。身体不动。一次可见的呼吸。\n第3切：@image1张嘴。安静但清晰地说： '我两年前写的。我从未寄出，因为我害怕你早就知道了。'最后一个字落下，她眼角外侧一颗泪水缓慢而真实地划落。\n第4切：@image2的眼睛吸收着她的每一个字。一次可见的吞咽——喉结上下滚动。他嘴角的紧绷缓缓释放——不是微笑，是比微笑更深沉、更真实的什么。\n\n微表情：@image1：说话时下巴抬起，颌骨的脆弱姿态，眼角外侧一颗真实泪水。@image2：可见吞咽，嘴角紧张释放。\n\n最后一帧：@image2大特写——双眼柔和、湿润、平静。告白已经落地。\n\n音效：仅限现场音效。近乎寂静——仅室内背景音。第3切@image1台词安静清晰：'我两年前写的。我从未寄出，因为我害怕你早就知道了 '第1切信封垂下时轻微布料摩擦声。无音乐。\n\n摄影机：75mm后转85mm球面镜头。手持——轻微微颤。9:16画幅。24帧率。180度快门角。胶片颗粒质感。",
      },
      render: {
        mode: 'M1',
        engine: 'Seedance',
      },
      notes: {
        todos: [
          'Confirm 180-degree rule in all four cuts',
          "Sync dialogue with Cut 3 timing — 'I wrote it two years ago...'",
        ],
        warnings: [
          '@image1 and @image2 must NEVER share the same frame in this shot',
          'Eyeline continuity critical — @image1 screen-right / @image2 screen-left — do not violate',
        ],
        approved: false,
      },
    },
    {
      id: 'E',
      title: 'David crosses to her — wide pull-back, button',
      description:
        'David walks slowly across the apartment to Elena. He stops in front of her. Neither speaks. He takes the envelope gently from her hands.',
      duration: 25,
      start: 55,
      end: 80,
      camera: {
        lens: '35mm',
        framing: 'Wide staggered two-shot pulling slowly back — then tight insert on hands',
        movement: 'Slow pull-back dolly then near-static close on hands',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Cut 1 (55-70s): Wide 35mm staggered two-shot pulling back. @image2 enters left third x=30% from right background, walks toward @image1. @image1 right third x=70% at window, stationary. Camera pulls gently back to reveal full room as @image2 crosses. Cut 2 (70-80s): Insert 85mm — hands only. @image2 hands taking envelope from @image1 hands. Both pairs of hands in frame center.',
        subjectLock:
          '@image1 + @image2: identical face/wardrobe. In Cut 1 — they approach but do not yet meet face-to-face until the last moment, then camera cuts to insert.',
        crossFrameRules:
          'Cut 1: @image2 crosses left-to-right toward @image1. They meet center frame at ~68s. Cut 2: Insert on hands only — no faces.',
        focus:
          'Cut 1: both in soft shared focus — 35mm wide allows more depth. Cut 2: hands sharp, forearms soft.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Sunlit apartment — full room width visible in pull-back',
        movement:
          'Cut 1: @image2 begins walking slowly from left toward @image1 at window right. @image1 remains stationary. @image2 walks the full width of the room — slow, deliberate, no rush. At ~68s cumulative they stand facing each other. Cut 2: @image2 hands gently close around the envelope in @image1 hands and lift it free. @image1 hands release. Stillness.',
        interaction:
          "Cut 1: approaching, not yet meeting. Cut 2: hands only — the transfer of the letter is the scene's final act.",
        positions: [
          { subjectId: '@image1', description: 'Right third x=70%, stationary at window, waiting' },
          {
            subjectId: '@image2',
            description:
              'Begins left third x=28%, walks right across room to meet @image1 at center-right by 68s',
          },
        ],
      },
      acting: {
        emotion: 'Resolution — tender, exhausted, real',
        bodyLanguage:
          '@image2: walks with deliberate unhurried steps, eyes on @image1 the entire time. @image1: holds position, chin lowering as he approaches, shoulders dropping — releasing the held tension. In Cut 2: @image2 hands gentle, slow — not grasping, receiving.',
        dialogue: '',
        microExpressions: [
          '@image2: each step landing with intention — no hesitation',
          '@image1: shoulders visibly dropping as he nears — a release of years',
          '@image2 hands: fingers opening wide then closing softly around the envelope',
          '@image1 hands: fingers releasing one by one',
        ],
      },
      timeline: {
        duration: 25,
        segments: [
          { start: 55, end: 70, label: 'Cut 1 — Wide pull-back, David crosses to Elena' },
          { start: 70, end: 80, label: 'Cut 2 — Insert: hands, envelope transfer' },
        ],
        beats: [
          {
            start: 55,
            end: 60,
            description: '@image2 begins walking — slow, deliberate, full resolve',
          },
          {
            start: 60,
            end: 68,
            description: '@image2 crosses room, @image1 receives his approach, shoulders drop',
          },
          {
            start: 68,
            end: 70,
            description: 'They stand face-to-face — camera cuts before full face reveal',
          },
          {
            start: 70,
            end: 75,
            description: '@image2 hands gently take envelope from @image1 hands',
          },
          {
            start: 75,
            end: 80,
            description:
              '@image1 fingers release — stillness. Scene closes on joined hands holding the letter',
          },
        ],
      },
      audio: {
        dialogue: '',
        ambient: 'Room tone. Soft city returning. Morning birds distant.',
        sfx: [
          'Slow deliberate footsteps on wood floor — each step clear',
          'Envelope paper between hands — soft crinkle at transfer',
          'Long breath release — @image1, barely audible',
        ],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'elena', type: 'character' },
        { slot: '@image2', assetId: 'david', type: 'character' },
      ],
      prompt: {
        en: "SCENE: Sunlit apartment living room, continuous morning golden hour. Two characters: @image1 (Elena — consistent face/wardrobe/hair throughout) and @image2 (David — consistent face/wardrobe/hair throughout). This is the closing shot — a slow pull-back wide shot followed by an intimate hand insert.\n\nFRAME MAP:\nCut 1 (0-15s of this shot, cumulative 55-70s): Wide 35mm staggered two-shot with slow pull-back. @image1 stands stationary at window right third x=70%, facing left, waiting. @image2 begins at left third x=28% and walks slowly, deliberately, across the room's full width toward @image1. Camera pulls back gently to reveal the full room as he crosses — warm morning light fills the space. At ~13s of this shot (cumulative 68s) they stand face-to-face at center-right — camera cuts before lingering on faces.\nCut 2 (15-25s of this shot, cumulative 70-80s): Insert close-up 85mm — hands only. @image2 both hands open wide then close gently around the envelope held in @image1 hands at frame center. @image1 fingers release one by one. Both pairs of hands visible holding the letter together, then @image1 releases fully. Stillness.\n\nCOMPOSITION: Cut 1 — 35mm spherical rectilinear, wide staggered two-shot. Shallow DOF — both figures share soft focus in the wider lens. Camera on slow pull-back dolly as @image2 crosses. Warm teal-amber grade. Full room interior visible. Cut 2 — 85mm insert. Hands sharp center frame. Forearms soft. Background apartment warm bokeh.\n\nACTING & BLOCKING:\nCut 1: @image2 walks with deliberate unhurried steps — each step landing with intention, no hesitation. Eyes on @image1 the entire crossing. @image1 holds position. As he nears (cumulative ~64s), her shoulders visibly drop — a release of held tension. Chin lowers. She does not step toward him — she waits, and the waiting is its own admission. At cumulative 68s they stand face-to-face. Cut to hands.\nCut 2: @image2 hands — fingers open wide and then close slowly and gently around the envelope in @image1 hands. Not grasping — receiving. @image1 fingers release one by one. At the final frame both pairs of hands hold the letter together in the golden light. Then @image1's hands release completely. @image2 holds the letter alone. Stillness.\n\nMICRO-EXPRESSIONS / PHYSICAL DETAILS: Each of @image2's footsteps deliberate. @image1 shoulders dropping as he approaches. @image2 fingers opening wide before gentle closure. @image1 fingers releasing one by one. Long barely audible breath release from @image1 during transfer.\n\nLAST FRAME: @image2 hands holding the envelope alone in golden morning light. @image1 hands withdrawn, resting at her sides. The letter passed. Scene closes.\n\nAUDIO: Diegetic only. Room tone with soft city returning — morning birds distant. Slow deliberate footsteps on wood floor — each step clear through Cut 1. Soft paper crinkle at envelope transfer in Cut 2. Barely audible long breath release from @image1 at ~74s cumulative. No music.\n\nCAMERA: 35mm (Cut 1 pull-back) then 85mm (Cut 2 insert) spherical rectilinear. Slow pull-back dolly in Cut 1 then near-static in Cut 2. 9:16 aspect ratio. 24fps. 180-degree shutter. Analog grain texture. Warm teal-amber grade.",
        zh: '场景：公寓客厅，清晨金色时分连续进行。两位角色：@image1（Elena——整个场景保持面容/服装/发型一致）和@image2（David——整个场景保持面容/服装/发型一致）。这是结束镜头——一个缓慢后拉的广角镜头，随后接一个亲密的手部插入镜头。\n\n画面布局：\n第1切（本镜头0-15秒，累计55-70秒）：35mm宽画幅错位双人镜头，缓慢后拉。@image1静止站在窗边右侧三分之一x=70%，面向左侧等待。@image2从左侧三分之一x=28%开始，缓慢而刻意地穿越整个房间宽度走向@image1。摄影机在他横穿时缓缓后拉，展现完整房间——温暖晨光充满空间。本镜头约第13秒（累计第68秒）时两人在中心偏右处面对面站立——摄影机在面部特写之前切换。\n第2切（本镜头15-25秒，累计70-80秒）：85mm手部插入特写。@image2双手张开后缓慢温柔地合拢，包住@image1双手捧着的信封，位于画面中心。@image1手指一根一根松开。两双手共同捧着信件可见，随后@image1完全松开。静止。\n\n构图：第1切——35mm球面镜头，宽画幅错位双人构图。浅景深——在更广的焦距下两个人物共享柔和焦点。摄影机随@image2横穿室内时缓慢后拉。温暖青金色调。完整室内可见。第2切——85mm插入。双手中心清晰。前臂柔化。背景公寓温暖散景。\n\n表演与调度：\n第1切：@image2迈着刻意而从容的步伐——每一步都带着决心，毫无犹豫。整个横穿过程眼睛始终注视@image1。@image1保持位置。当他临近时（累计约第64秒），她的肩膀可见地下沉——多年来的紧张释放。下巴降低。她不向他走去——她等待，而这种等待本身就是一种承认。累计第68秒时两人面对面站立。切换到手部。\n第2切：@image2的手——手指张开，然后缓慢温柔地合拢在@image1手中的信封上。不是抓取——是接收。@image1手指一根一根松开。最后一帧两双手共同在金色光线中捧着信件。随后@image1的手完全松开。@image2单独持有信件。静止。\n\n微表情/身体细节：@image2每一步都刻意。@image1随他临近而肩膀下沉。@image2手指在温柔合拢前大幅张开。@image1手指一根一根松开。转交过程中@image1几乎听不见的长吐气。\n\n最后一帧：@image2双手在清晨金色光线中单独持有信封。@image1双手收回垂于身侧。信件已传递。场景结束。\n\n音效：仅限现场音效。室内背景音伴随城市声音轻柔回归——远处晨鸟。第1切中木地板上缓慢刻意的脚步声——每一步清晰可辨。第2切信封转交时柔和纸张沙沙声。累计约第74秒@image1几乎听不见的长吐气。无音乐。\n\n摄影机：35mm（第1切后拉）后转85mm（第2切插入）球面镜头。第1切缓慢后拉移动轨，第2切近乎静止。9:16画幅。24帧率。180度快门角。胶片颗粒质感。温暖青金色调。',
      },
      render: {
        mode: 'M1',
        engine: 'Seedance',
      },
      notes: {
        todos: [
          'Confirm dolly track or smooth handheld pull-back for Cut 1',
          'Confirm hands only in Cut 2 — no faces visible',
        ],
        warnings: [
          'Cut 2 must show HANDS ONLY — no faces to avoid the staggered-rule complication at the moment of physical meeting',
          'Pull-back in Cut 1 must be slow enough to feel contemplative — not a reaction pull',
        ],
        approved: false,
      },
    },
  ],
};

export const SHOT_RESPONSE: Sequence = {
  description: 'Sofia - Soliloquio de una mujer que se reencuentra con su propia voz',
  duration: 80,
  mode: 'M1',
  aspectRatio: '9:16',
  references: [{ slot: '@image1', assetId: 'sofia', type: 'character' }],
  sequenceFlow: {
    title: 'Time budget',
    subtitle: 'Del silencio roto a la certeza encarnada',
    duration: 80,
    metric: 'dramaticIntensity',
    scale: { start: 'Frozen', middle: 'Awakening', end: 'Declared' },
    segments: [
      { id: 'A', shotId: 'A', label: 'Hook', start: 0, end: 12, intensity: 0.15, color: '#2a4a5e' },
      {
        id: 'B',
        shotId: 'B',
        label: 'Friction',
        start: 12,
        end: 24,
        intensity: 0.35,
        color: '#3d6b72',
      },
      {
        id: 'C',
        shotId: 'C',
        label: 'Friction',
        start: 24,
        end: 38,
        intensity: 0.55,
        color: '#5e8a72',
      },
      {
        id: 'D',
        shotId: 'D',
        label: 'Spike',
        start: 38,
        end: 56,
        intensity: 0.85,
        color: '#c47c3a',
      },
      {
        id: 'E',
        shotId: 'E',
        label: 'Button',
        start: 56,
        end: 80,
        intensity: 0.4,
        color: '#3d5a4e',
      },
    ],
  },
  directorNotes: {
    goal: 'The audience should feel the exact moment a woman stops performing emotions and starts actually living them — every shot is a physical verb, not a mood.',
    styleGuide:
      'desaturated teal-to-warm-amber grade across sequence - spherical rectilinear prime lenses - flat field no vignette - 24fps 180 degree shutter - diegetic audio only - prompts in positive imperative',
    warnings: [
      'Load @image1 Sofia before rendering any shot — character lock is mandatory across all cuts.',
      'No abstract visual metaphors: every beat must be a transitive verb performed on a real object or space.',
      'Dialogue lines are interior monologue whispered aloud — lips barely move on Hook and Friction shots; full voice on Spike.',
      'Do NOT cross the center line between consecutive singles — Sofia stays frame-left on wide shots, frame-right on close-ups.',
    ],
  },
  shots: [
    {
      id: 'A',
      title: 'Sofia holds herself still at the window',
      description:
        'Sofia stands at a window in dim morning light, both hands pressing flat against the glass, not looking outside — looking at her own faint reflection.',
      duration: 12,
      start: 0,
      end: 12,
      camera: {
        lens: '85mm',
        framing: 'Full-length shot — Sofia x=38%, window frame x=60%',
        movement: 'Near-static, barely perceptible float inward',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          '0-12s: Full-length. @image1 left-center x=38%, window occupies right half of frame. Faint ghost reflection of her face visible in glass at x=62%.',
        subjectLock:
          '@image1: exact wardrobe and face throughout sequence. Back partially to camera, head tilted toward glass.',
        crossFrameRules:
          '@image1 inhabits left-center of vertical frame. Window light source stays right. Never reposition to right side.',
        focus: 'Soft focus on @image1 back/shoulders; reflection slightly softer still.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Small apartment — window wall, early morning',
        movement:
          '0-4s: @image1 stationary, palms flat on glass. 4-8s: shifts weight to right foot, chin dips. 8-12s: forehead slowly presses against glass.',
        interaction: 'Solo — @image1 interacts only with the window surface.',
        positions: [
          {
            subjectId: '@image1',
            description:
              'Left-center x=38%, full body visible, back 3/4 to camera, forehead approaching glass by end of shot',
          },
        ],
      },
      acting: {
        emotion:
          'Frozen containment — the verb is PRESS (she presses herself against the glass as if trying to go through it)',
        bodyLanguage:
          '@image1: shoulders drawn in and slightly raised, elbows locked, palms flat on glass, weight slowly transferring forward over 12 seconds.',
        dialogue: '',
        microExpressions: [
          'Jaw set, no movement',
          'Eyelids heavy, gaze fixed on own reflection',
          'Slow single exhale fogs the glass at second 10',
        ],
      },
      timeline: {
        duration: 12,
        segments: [
          { start: 0, end: 4, label: 'Palms flat, static' },
          { start: 4, end: 8, label: 'Weight shift, chin dip' },
          { start: 8, end: 12, label: 'Forehead touches glass' },
        ],
        beats: [
          { start: 0, end: 4, description: '@image1 stands motionless, palms pressed to glass' },
          { start: 4, end: 8, description: 'Weight transfers, chin drops slightly' },
          { start: 8, end: 12, description: 'Forehead rests on glass, breath fogs it' },
        ],
      },
      audio: {
        dialogue: '',
        ambient: 'Low apartment room tone, distant street hum, refrigerator hiss',
        sfx: ['Glass faintly creaking under palm pressure', 'Slow exhale at second 10'],
        music: false,
      },
      references: [{ slot: '@image1', assetId: 'sofia', type: 'character' }],
      prompt: {
        en: 'SCENE: Small urban apartment, window wall. Early morning, flat overcast daylight through glass. Desaturated teal-to-cool-grey color grade. Spherical rectilinear 85mm prime lens, flat field, no vignette, 24fps, 180-degree shutter, 9:16 vertical frame, total duration 12 seconds.\n\nFRAME MAP — single continuous shot:\n0-12s: Full-length vertical composition. @image1 (Sofia — load reference image) occupies left-center of frame at approximately x=38%. The window frame and glass occupy the right half of the vertical frame at x=60% onward. A faint ghost reflection of her face is visible in the glass at approximately x=62%, soft and barely legible.\n\nSUBJECT LOCK: @image1 Sofia — exact face and wardrobe identical to reference. Back and right shoulder 3/4 toward camera throughout. Never reframe her to the right side of frame.\n\nBLOCKING & MOVEMENT:\n0-4s: @image1 stands absolutely still. Both palms press flat against the window glass, arms slightly bent at the elbows, elbows locked. Shoulders drawn inward and slightly elevated. She does not look outside — her gaze is fixed on her own faint reflection in the glass.\n4-8s: She shifts her weight slowly from left foot to right foot. Her chin dips a few degrees downward. The pressing of her palms does not release.\n8-12s: Her forehead begins to lower and press against the glass. By second 12 her forehead rests fully on the surface. At second 10 a slow exhale fogs a small circle on the glass in front of her mouth.\n\nACTING — transitive verb PRESS: She is physically pressing herself against the glass as if trying to pass through it. No performance of sadness — only the muscular action of weight and contact. Jaw set and motionless. Eyelids heavy. Single slow exhale fogs the glass.\n\nCAMERA: Near-static handheld float — almost imperceptibly drifts 3–4 cm inward over 12 seconds. No pan, no tilt. Shallow depth of field: @image1 shoulders in soft focus, reflection slightly softer still.\n\nLAST FRAME (second 12): @image1 forehead touching glass, shoulders rounded inward, palms still flat, reflection a blurred ghost in the right half of the frame. Fog ring on glass from her breath.\n\nAUDIO: Low apartment room tone, distant street hum, faint refrigerator hiss. Soft creak of glass under palm pressure at second 2. Slow audible exhale at second 10. No music.',
      },
      render: { mode: 'M1', engine: 'Seedance' },
      notes: {
        todos: ['Load @image1 Sofia reference image'],
        warnings: [
          'Forehead-on-glass contact must be legible — if lens is too long flatten to 75mm',
          'Reflection must be visible but not sharp — reduce ambient light behind camera if needed',
        ],
        approved: false,
      },
    },
    {
      id: 'B',
      title: 'Sofia peels her hand away and stares at it',
      description:
        'Sofia lifts one palm from the glass and holds it in front of her face, studying it as if reading a foreign language written in her own skin.',
      duration: 12,
      start: 12,
      end: 24,
      camera: {
        lens: '85mm to 55mm',
        framing:
          "Chest-up, then push to medium close-up on raised hand with Sofia's face behind it",
        movement: 'Slow push-in from chest-up to MCU',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          '12-17s: Chest-up. @image1 x=40%, face in upper-center frame, window light from screen-right. 17-24s: Camera pushes to MCU — raised right hand occupies center-frame, @image1 face slightly out-of-focus behind it at x=42%.',
        subjectLock:
          '@image1: same face and wardrobe as shot A. Now facing more toward camera, 1/4 turn from glass.',
        crossFrameRules:
          '@image1 stays left-of-center. Window stays screen-right. Hand rises to center on push.',
        focus: '17-24s: rack from face to hand as hand rises to mid-frame.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Same apartment window wall',
        movement:
          '12-15s: @image1 peels right palm slowly off the glass, leaving a sweat print on the surface. 15-17s: She turns her head 1/4 toward camera and raises the freed hand to face-level. 17-24s: She holds the palm open in front of her face, turning it slowly, studying it.',
        interaction: 'Solo — @image1 examines her own hand.',
        positions: [
          {
            subjectId: '@image1',
            description:
              'Left-center x=40%, chest-up, right hand raised to face-level by second 17',
          },
        ],
      },
      acting: {
        emotion:
          'Awakening — the verb is EXAMINE (she examines her own hand as if it belongs to a stranger)',
        bodyLanguage:
          '@image1: slow deliberate peel of palm from glass, hand rises unhurriedly, fingers slightly spread, head tilts as she studies it. Left hand remains at her side.',
        dialogue: "'I forgot what these could do.'",
        microExpressions: [
          'Single blink as palm leaves glass',
          'Eyebrows slightly raised in neutral study',
          'Lips part but barely move on the whispered line',
        ],
      },
      timeline: {
        duration: 12,
        segments: [
          { start: 12, end: 17, label: 'Palm peels — chest-up' },
          { start: 17, end: 24, label: 'Hand raised for study — MCU push' },
        ],
        beats: [
          {
            start: 12,
            end: 15,
            description: '@image1 peels right palm off glass, sweat print left behind',
          },
          { start: 15, end: 17, description: 'Turns 1/4 toward camera, raises hand to face level' },
          {
            start: 17,
            end: 24,
            description: 'Holds open palm in front of face, turns it slowly, whispers line',
          },
        ],
      },
      audio: {
        dialogue: "'I forgot what these could do.'",
        ambient: 'Room tone continues, street hum',
        sfx: ['Faint adhesive peel of palm leaving glass at second 14', 'Soft finger-spread sound'],
        music: false,
      },
      references: [{ slot: '@image1', assetId: 'sofia', type: 'character' }],
      prompt: {
        en: "SCENE: Small urban apartment, window wall. Early morning overcast light, desaturated teal-grey grade warming fractionally toward amber. Spherical rectilinear lens beginning at 85mm pushing to 55mm effective framing, flat field no vignette, 24fps 180-degree shutter, 9:16 vertical frame, total duration 12 seconds.\n\nFRAME MAP:\n12-17s: Chest-up. @image1 (Sofia — load reference image) at x=40%, face in upper-center frame. Window light source from screen-right. Both hands initially still against glass.\n17-24s: Slow push-in tightens to medium close-up. @image1 raised right hand occupies center-frame, fingers slightly spread, palm open facing her. @image1 face slightly defocused behind the hand at x=42%.\n\nSUBJECT LOCK: @image1 same face and exact wardrobe as previous shot. She has now turned approximately 1/4 toward camera — no longer fully back-to-camera.\n\nBLOCKING & MOVEMENT:\n12-15s: @image1 peels her right palm slowly off the glass. A faint sweat print remains on the glass surface for a moment. The movement is deliberate, unhurried.\n15-17s: She turns her head 1/4 toward camera and raises the freed hand to face-level. Left hand stays loose at her side.\n17-24s: She holds her open right palm in front of her face, 20–25cm from her nose. She turns it slowly — palm up, then palm down, then back up — studying it the way one reads a foreign text. At approximately second 21 her lips part barely and she whispers the line: 'I forgot what these could do.' Lips barely move.\n\nACTING — transitive verb EXAMINE: She examines her own hand as if it belongs to a stranger. No sentimentality — only focused muscular attention. Eyebrows lift slightly in neutral study. Single blink as the palm leaves the glass.\n\nCAMERA: Slow push-in — smooth, almost imperceptible, from chest-up to medium close-up over the full 12 seconds. Rack focus from @image1 face to raised hand at second 17. Shallow depth of field throughout.\n\nLAST FRAME (second 24): @image1 open palm fills center-frame, face softly defocused behind it, window light edge-lighting the hand from screen-right.\n\nAUDIO: Room tone continues. Faint adhesive peel sound as palm leaves glass around second 14. Soft finger-spread creak. Barely audible whispered line at second 21: 'I forgot what these could do.' No music.",
      },
      render: { mode: 'M1', engine: 'Seedance' },
      notes: {
        todos: ['Confirm @image1 Sofia wardrobe matches Shot A exactly'],
        warnings: [
          'Sweat print on glass is a production detail — include it',
          'Whispered dialogue must be physically present in lip movement, however small',
        ],
        approved: false,
      },
    },
    {
      id: 'C',
      title: 'Sofia walks to center room — rehearses a gesture',
      description:
        'Sofia steps away from the window into the middle of the room and stands alone, then slowly raises both arms outward to shoulder height as if testing whether the air will hold her.',
      duration: 14,
      start: 24,
      end: 38,
      camera: {
        lens: '40mm',
        framing:
          'Full-length wide shot — Sofia in center room, vertical frame captures ceiling and floor',
        movement: 'Handheld, very slight lateral drift right 8cm over 14 seconds',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          '24-38s: Full-length. @image1 center frame x=50%, room visible around her on all sides. Ceiling visible in upper 15% of frame, floor visible in lower 20%. Window now in background at screen-left.',
        subjectLock: '@image1 same face and wardrobe. Now fully facing camera.',
        crossFrameRules:
          '@image1 stays frame-center for this shot only — her isolation in the room requires it. Window recedes to background left.',
        focus: '@image1 in full focus, background room slightly soft.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Same apartment — open center of main room',
        movement:
          '24-28s: @image1 walks in 4 slow steps from window to center of room, stops. 28-32s: Stands still, arms at sides, head slightly bowed. 32-38s: Slowly raises both arms outward from sides to shoulder height, palms down, moving at a pace slow enough to feel the air resistance.',
        interaction: 'Solo — @image1 in the open room, arms extending into empty space.',
        positions: [
          {
            subjectId: '@image1',
            description:
              'Center frame x=50%, full body, facing camera, arms extending to horizontal by second 38',
          },
        ],
      },
      acting: {
        emotion:
          'Tentative claim — the verb is TEST (she tests whether the space around her will accept her body)',
        bodyLanguage:
          '@image1: deliberate walk, each step placed with attention. Head bowed in stillness. Then a slow inexorable rise of both arms from sides to shoulder height — not dramatic, not expressive, purely functional and measured.',
        dialogue: "'It still fits.'",
        microExpressions: [
          'Eyes open and steady, gaze slightly downward during stillness',
          'Jaw relaxes for first time in sequence',
          'A single controlled breath in before arms begin to rise',
        ],
      },
      timeline: {
        duration: 14,
        segments: [
          { start: 24, end: 28, label: 'Walk to center' },
          { start: 28, end: 32, label: 'Stillness, head bowed' },
          { start: 32, end: 38, label: 'Arms rise to shoulder height' },
        ],
        beats: [
          { start: 24, end: 28, description: '@image1 walks 4 steps to center of room and stops' },
          { start: 28, end: 32, description: 'Stands still, head bowed, jaw relaxes' },
          {
            start: 32,
            end: 38,
            description: 'Both arms rise slowly outward to shoulder height, whispers line',
          },
        ],
      },
      audio: {
        dialogue: "'It still fits.'",
        ambient: 'Room tone, floorboards under her footsteps, apartment settling',
        sfx: [
          'Four measured footstep sounds on hardwood floor at seconds 24-28',
          'Cloth sleeve brush as arms rise',
        ],
        music: false,
      },
      references: [{ slot: '@image1', assetId: 'sofia', type: 'character' }],
      prompt: {
        en: "SCENE: Small urban apartment, center of main room. Morning light now slightly warmer — overcast but with a faint amber quality entering from the window in the background at screen-left. Color grade shifting from teal-grey toward neutral amber. Spherical rectilinear 40mm prime lens, flat field no vignette, 24fps 180-degree shutter, 9:16 vertical frame, total duration 14 seconds.\n\nFRAME MAP — single continuous shot:\n24-38s: Full-length vertical composition. @image1 (Sofia — load reference image) occupies frame-center at x=50%. Ceiling visible in upper 15% of vertical frame, bare hardwood floor visible in lower 20%. Window is now background at screen-left, softly out of focus. Room walls visible on both sides.\n\nSUBJECT LOCK: @image1 same face and exact wardrobe as previous shots. Now fully facing camera.\n\nBLOCKING & MOVEMENT:\n24-28s: @image1 walks four slow, deliberate steps from the window toward the center of the room. Each footstep is placed with conscious attention — not dragging, not hurrying. She stops in the geometric center of the room.\n28-32s: She stands absolutely still, arms loose at her sides, head bowed approximately 20 degrees. The jaw visibly relaxes — first time in the sequence. Eyes open, gaze slightly downward. A single controlled breath in.\n32-38s: She raises both arms outward from her sides with extreme slowness — palms facing downward — until they reach shoulder height by second 38. The movement is not expressive or theatrical; it is purely mechanical and measuring, as if testing whether the air will accept her wingspan. At approximately second 36 she whispers barely audibly: 'It still fits.'\n\nACTING — transitive verb TEST: She is physically testing the dimensions of the space with her own body. No performance. Jaw released. Eyes level. Arms move at constant slow velocity.\n\nCAMERA: Handheld with very slight lateral drift rightward — approximately 8cm total over 14 seconds. Almost imperceptible. No tilt, no zoom. @image1 stays in full sharp focus; background room softens into shallow DOF.\n\nLAST FRAME (second 38): @image1 standing center-frame, arms extended to shoulder height, palms down, head lifted to horizontal gaze, jaw relaxed. Window soft in background screen-left.\n\nAUDIO: Room tone, apartment settling sounds. Four measured footstep sounds on hardwood floor between seconds 24-28. Cloth sleeve brush as arms rise. Barely audible whisper 'It still fits.' at second 36. No music.",
      },
      render: { mode: 'M1', engine: 'Seedance' },
      notes: {
        todos: ['Hardwood floor must be visible — confirm set dressing'],
        warnings: [
          'Arms must reach exactly shoulder height — not above. Overshoot reads as surrender, not testing.',
          'Walk must be 4 steps — not a glide',
        ],
        approved: false,
      },
    },
    {
      id: 'D',
      title: 'Sofia speaks directly to herself — SPIKE',
      description:
        'Sofia drops her arms, lifts her chin, and speaks a full-volume statement into the room, spine lengthening with each word.',
      duration: 18,
      start: 38,
      end: 56,
      camera: {
        lens: '55mm to 35mm',
        framing: 'Chest-up push out to medium full — camera pulls back as Sofia expands',
        movement: 'Slow pull-back from chest-up to medium full over 18 seconds',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          '38-44s: Chest-up. @image1 x=48%, arms dropping. 44-56s: Camera pulls back to medium full, @image1 x=48%, full torso and partial legs visible, room expanding around her.',
        subjectLock: '@image1 same face and wardrobe. Full frontal, spine vertical, chin lifted.',
        crossFrameRules:
          '@image1 stays near frame-center during this shot — she is claiming the center. No lateral reposition.',
        focus: '@image1 sharp throughout. Background stays soft.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Center of apartment room — same position as Shot C',
        movement:
          '38-42s: Arms drop smoothly from shoulder height to sides, hands close into loose fists. 42-46s: Chin lifts, spine lengthens upward vertebra by vertebra — visible postural change. 46-56s: She stands fully erect, head level, and delivers the full-voice statement. With each sentence her shoulders drop further back and down, opening the chest.',
        interaction: 'Solo — @image1 addresses the empty room.',
        positions: [
          {
            subjectId: '@image1',
            description:
              'Frame-center x=48%, chest-up tightening then pulling back to medium full, spine fully erect by second 46',
          },
        ],
      },
      acting: {
        emotion:
          'Declaration — the verb is CLAIM (she claims the room, the air, the right to take up space)',
        bodyLanguage:
          '@image1: arms drop with controlled gravity, hands form loose fists. Then a vertebral lengthening — each segment of spine straightens from lumbar to cervical. Shoulders roll back and down. Chin level. Full voice, no performance — just volume and clarity.',
        dialogue: "'I have been waiting for permission. I do not need it. I am the room.'",
        microExpressions: [
          'Hands close to loose fists as arms drop',
          'Nostril flare before first spoken word',
          'Chin lifts 15 degrees, held for duration',
          'Shoulders visibly drop back on each sentence',
        ],
      },
      timeline: {
        duration: 18,
        segments: [
          { start: 38, end: 42, label: 'Arms drop, fists form' },
          { start: 42, end: 46, label: 'Spine lengthens, chin lifts' },
          { start: 46, end: 56, label: 'Full voice declaration, chest opens' },
        ],
        beats: [
          { start: 38, end: 42, description: '@image1 drops arms, hands close to loose fists' },
          { start: 42, end: 46, description: 'Spine lengthens, chin lifts 15 degrees' },
          {
            start: 46,
            end: 56,
            description: 'Full-voice statement delivered, shoulders roll back with each sentence',
          },
        ],
      },
      audio: {
        dialogue: "'I have been waiting for permission. I do not need it. I am the room.'",
        ambient:
          'Room tone drops in presence — a slight acoustic fullness as Sofia speaks into the space',
        sfx: [
          'Hands closing to fists — cloth and knuckle sound at second 40',
          'Full breath in at second 45',
        ],
        music: false,
      },
      references: [{ slot: '@image1', assetId: 'sofia', type: 'character' }],
      prompt: {
        en: "SCENE: Small urban apartment, center of main room. Morning light now fully amber — the color grade has completed its arc from cold teal to warm amber. The room is lit by window light from screen-left background. Spherical rectilinear lens starting at 55mm effective framing and pulling to 35mm effective framing (camera moves backward), flat field no vignette, 24fps 180-degree shutter, 9:16 vertical frame, total duration 18 seconds.\n\nFRAME MAP:\n38-44s: Chest-up. @image1 (Sofia — load reference image) at frame-center x=48%. Arms are extended at shoulder height at the start of this shot and begin dropping.\n44-56s: Camera pulls back slowly over the remaining 12 seconds to a medium full shot. @image1 stays at x=48%, now visible from top of head to mid-thigh. Room expands into frame on both sides and above.\n\nSUBJECT LOCK: @image1 same face and exact wardrobe as all previous shots. Full frontal facing camera.\n\nBLOCKING & MOVEMENT:\n38-42s: Both arms drop smoothly from shoulder height to her sides. The drop is controlled — not collapsed. As arms reach her sides, both hands close into loose fists.\n42-46s: Her spine lengthens upward in a visible vertebral sequence — lumbar first, then thoracic, then cervical. Each spinal segment straightening is observable in her posture. Chin lifts approximately 15 degrees to horizontal level. Shoulders begin to roll back.\n46-56s: She stands fully erect with chin level, shoulders back and down. She delivers the statement at full, clear, unforced voice — not shouting, not whispering: 'I have been waiting for permission. I do not need it. I am the room.' Between each sentence she takes a small breath and her shoulders drop another centimeter further back. By sentence three her chest is maximally open.\n\nACTING — transitive verb CLAIM: She physically claims the room with her body and her voice. Hands in loose fists — not aggressive, contained. Nostril flare before first word. Voice is direct and clear, no wavering. Jaw unclenched. Eyes level and open, looking at nothing specific — addressing the air.\n\nCAMERA: Slow pull-back — smooth, continuous, from chest-up to medium full over the full 18 seconds. Camera moves backward along the axis, not a zoom. @image1 stays sharp throughout. Background soft in shallow DOF.\n\nLAST FRAME (second 56): @image1 medium full, spine erect, chin level, chest open, hands in loose fists at sides, room visible around her. Window light warm amber from screen-left background.\n\nAUDIO: Room tone present but with a slight acoustic fullness as she speaks into the space — her voice resonates. Cloth and knuckle sound as hands close to fists around second 40. Full audible breath in at second 45 before first word. Full-voice dialogue delivered clearly 46-56s: 'I have been waiting for permission. I do not need it. I am the room.' No music.",
      },
      render: { mode: 'M1', engine: 'Seedance' },
      notes: {
        todos: [
          'Confirm acoustic treatment of the audio — room resonance must be audible on the dialogue',
          'Color grade amber must be complete by frame 1 of this shot',
        ],
        warnings: [
          'Full voice does NOT mean shouting — any sign of strain ruins the declaration',
          'Vertebral lengthening must be visible — if Sofia collapses posture early, re-direct',
        ],
        approved: false,
      },
    },
    {
      id: 'E',
      title: 'Sofia sits on the floor — aftermath of having spoken',
      description:
        'Sofia descends slowly to sit cross-legged on the hardwood floor in the center of the room, settles her hands on her knees, and breathes.',
      duration: 24,
      start: 56,
      end: 80,
      camera: {
        lens: '55mm',
        framing:
          'Begin medium full standing, follow down to tight overhead-angled waist-up as she settles on floor',
        movement:
          'Handheld descends with her — camera lowers from eye-height to approximately 120cm from floor, slight tilt down',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          '56-62s: Medium full, @image1 standing x=48%, frame center. 62-70s: @image1 descending, camera follows down, transitioning to waist-up. 70-80s: @image1 seated on floor, camera at 120cm height, slight downward tilt — overhead-angled waist-up composition, x=50%.',
        subjectLock:
          '@image1 same face and wardrobe. Seated cross-legged, spine upright but released.',
        crossFrameRules:
          '@image1 stays frame-center throughout the descent. Ceiling disappears from frame as camera descends.',
        focus: '@image1 face and hands sharp. Floor around her soft.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Center of apartment room — same spot as shots C and D',
        movement:
          '56-62s: @image1 stands still, the post-declaration stillness. 62-70s: She descends slowly to the floor — not collapse, a deliberate lowering: first to knees, then she rotates and crosses her legs. 70-80s: Seated cross-legged on the hardwood floor. She places both hands palms-down on her knees. She breathes. By second 78 she closes her eyes.',
        interaction: 'Solo — @image1 in stillness with herself.',
        positions: [
          {
            subjectId: '@image1',
            description:
              'Frame-center x=50%, seated cross-legged on floor by second 70, hands on knees, spine upright and released',
          },
        ],
      },
      acting: {
        emotion: 'Earned quiet — the verb is SETTLE (she settles into herself after having spoken)',
        bodyLanguage:
          '@image1: deliberate descent — no collapse. Knees first, then cross-legged. Hands placed open, palms down, on knees. Spine upright but without the effortful lengthening of Shot D — a natural vertical. Shoulders level. Breathing visible in rib expansion. Eyes close at second 78.',
        dialogue: '',
        microExpressions: [
          'Face neutral, no performance',
          'Nostrils release — the flare from Shot D is gone',
          'Visible rib-expansion breath at seconds 72 and 76',
          'Eyelids lower slowly and close at second 78',
        ],
      },
      timeline: {
        duration: 24,
        segments: [
          { start: 56, end: 62, label: 'Post-declaration stillness, standing' },
          { start: 62, end: 70, label: 'Deliberate descent to floor' },
          { start: 70, end: 80, label: 'Seated, hands on knees, breathing, eyes close' },
        ],
        beats: [
          { start: 56, end: 62, description: '@image1 stands still in aftermath silence' },
          {
            start: 62,
            end: 70,
            description: 'Descends deliberately to cross-legged seated position',
          },
          { start: 70, end: 78, description: 'Seated, hands on knees, two visible breaths' },
          { start: 78, end: 80, description: 'Eyes close slowly' },
        ],
      },
      audio: {
        dialogue: '',
        ambient:
          'Room tone, very quiet — ambient sound pulls back 3dB from Shot D level. Apartment settling. Distant street now barely audible.',
        sfx: [
          'Knees meeting hardwood floor at second 63',
          'Fabric settling as she crosses legs at second 67',
          'Two slow visible breath sounds at seconds 72 and 76',
        ],
        music: false,
      },
      references: [{ slot: '@image1', assetId: 'sofia', type: 'character' }],
      prompt: {
        en: 'SCENE: Small urban apartment, center of main room. Morning amber light, color grade holds warm amber from Shot D but dims fractionally in overall luminance — the room feels quieter after sound. Spherical rectilinear 55mm prime lens, flat field no vignette, 24fps 180-degree shutter, 9:16 vertical frame, total duration 24 seconds.\n\nFRAME MAP:\n56-62s: Medium full. @image1 (Sofia — load reference image) standing at frame-center x=48%. Same position as end of Shot D.\n62-70s: Camera descends smoothly with @image1 as she lowers herself to the floor. Frame transitions from medium full to a waist-up composition at lower angle.\n70-80s: Camera settles at approximately 120cm from floor, slight downward tilt — overhead-angled waist-up composition. @image1 seated cross-legged at x=50%, floor hardwood visible around her, ceiling no longer in frame.\n\nSUBJECT LOCK: @image1 same face and exact wardrobe as all previous shots. Seated cross-legged, spine upright and released — not effortful, natural.\n\nBLOCKING & MOVEMENT:\n56-62s: @image1 stands completely still. The silence after having spoken. No fidgeting. Arms at sides, hands open.\n62-70s: She descends deliberately to the floor in a controlled sequence: first she lowers to her knees (both knees contact hardwood at approximately second 63), then she rotates her hips and crosses her legs into a cross-legged seated position by second 70. This is not a collapse — every centimeter of the descent is intentional.\n70-80s: She is now seated cross-legged in the center of the room. She places both hands palms-down on her knees, fingers relaxed and slightly spread. Her spine is upright — naturally, not rigidly. She breathes. Two visible rib-expansion breaths occur at approximately seconds 72 and 76. At second 78 her eyelids lower slowly and close.\n\nACTING — transitive verb SETTLE: She settles into herself after having claimed the room. No performance. Face neutral. The nostril flare from the previous shot is gone. Nostrils release. Shoulders level and soft. Each breath is visible in the expansion of her ribcage. Eyes close not from exhaustion but from completion.\n\nCAMERA: Handheld descends with @image1 — camera operator lowers from standing eye-height to approximately 120cm as she descends between seconds 62-70. Once she is seated, camera holds at 120cm with a slight downward tilt of approximately 10 degrees. Very gentle handheld breathing movement — barely perceptible. @image1 face and hands stay in sharp focus. Floor soft in shallow DOF.\n\nLAST FRAME (second 80): @image1 seated cross-legged, frame-center, hands palms-down on knees, eyes closed, spine naturally upright, room floor extending softly around her. Warm amber window light from screen-left background.\n\nAUDIO: Room tone quiet — 3dB lower than Shot D. Apartment settling sounds. Knees on hardwood floor at second 63. Fabric settling as legs cross at second 67. Two slow visible breath sounds at seconds 72 and 76. No dialogue. No music.',
      },
      render: { mode: 'M1', engine: 'Seedance' },
      notes: {
        todos: [
          'Confirm floor is bare hardwood — no rug, rug kills the acoustic and visual clarity',
          'Confirm camera operator can physically descend smoothly from standing to 120cm in 8 seconds',
        ],
        warnings: [
          'Eyes closing at second 78 is the last meaningful action — hold on it for the final 2 seconds, do not cut early',
          'Descent must not look like falling or collapse — re-shoot if Sofia rushes the kneel',
        ],
        approved: false,
      },
    },
  ],
};
