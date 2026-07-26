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

export const RESPONSE = {
  description: 'Mike & Wyatt (gafas) - Confrontación fraternal en la sala',
  duration: 40,
  mode: 'M1',
  aspectRatio: '9:16',
  references: [
    { slot: '@image1', assetId: 'mike', type: 'character' },
    { slot: '@image2', assetId: 'wyatt-gafas', type: 'character' },
    { slot: '@image3', assetId: 'plate-sala', type: 'plate' },
  ],
  sequenceFlow: {
    title: 'Time budget',
    subtitle: 'De la tensión fría al silencio roto',
    duration: 40,
    metric: 'dramaticIntensity',
    scale: { start: 'Cold', middle: 'Hot', end: 'Empty' },
    segments: [
      { id: 'A', shotId: 'A', label: 'Hook', start: 0, end: 9, intensity: 0.25, color: '#3d8b8f' },
      {
        id: 'B',
        shotId: 'B',
        label: 'Friction',
        start: 9,
        end: 20,
        intensity: 0.55,
        color: '#c47c2b',
      },
      {
        id: 'C',
        shotId: 'C',
        label: 'Spike',
        start: 20,
        end: 32,
        intensity: 0.92,
        color: '#b83232',
      },
      {
        id: 'D',
        shotId: 'D',
        label: 'Button',
        start: 32,
        end: 40,
        intensity: 0.18,
        color: '#4a4a5a',
      },
    ],
  },
  directorNotes: {
    goal: 'El espectador debe sentir que Mike ha cruzado una línea que Wyatt no puede ignorar — la sala se convierte en un ring donde nadie gana.',
    styleGuide:
      'teal-amber grade - spherical rectilinear lens - flat field no vignette - 24fps 180 degree - diegetic audio only - prompt in positive - analog grain visible',
    warnings: [
      'Cargar @image1 Mike y @image2 Wyatt (gafas) antes de generar cualquier shot',
      '@image3 plate-sala se usa como entorno de fondo — no reemplazar con entorno sintético',
      'Nunca cruzar el eje 180° entre @image1 y @image2 dentro del mismo shot',
      'Mantener las gafas de Wyatt visibles y consistentes en todos los planos — rasgo de identidad clave',
      'No usar música extradiegética — solo audio ambiente de sala y efectos físicos',
    ],
  },
  shots: [
    {
      id: 'A',
      title: 'Wyatt planta los pies — Mike entra al territorio',
      description:
        'Wyatt está de pie en la sala, inmóvil, con los brazos cruzados. Mike entra al fondo del plano y avanza hacia él sin decir nada todavía.',
      duration: 9,
      start: 0,
      end: 9,
      camera: {
        lens: '40mm',
        framing: 'Wide two-shot estático con sala visible',
        movement: 'Near-static, ligera respiración de cámara handheld',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          '0-9s: Wide two-shot. @image2 izquierda x=28%, primer plano, brazos cruzados, de frente a cámara. @image1 derecha x=72%, fondo medio, avanzando hacia centro. Sala (@image3) visible en profundidad de campo.',
        subjectLock:
          '@image2: gafas visibles, camisa consistente, brazos cruzados al pecho. @image1: ropa consistente, postura erguida avanzando.',
        crossFrameRules:
          '@image2 izquierda fija, @image1 derecha entrando — ninguno cruza el eje central. Hombros de @image2 escuadrados a cámara.',
        focus: 'Foco en @image2 primer plano, @image1 ligeramente desenfocado al fondo.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Sala — zona central, @image3 plate visible al fondo',
        movement:
          '0-9s: @image2 plantado izquierda, brazos cruzados, peso atrás en los talones. @image1 entra derecha-fondo y avanza lentamente hacia centro sin detenerse.',
        interaction: 'Wide two-shot, nunca cara a cara directa — ángulo ligeramente escorzado.',
        positions: [
          {
            subjectId: '@image2',
            description: 'Izquierda x=28%, primer plano, inmóvil, brazos cruzados, gafas al frente',
          },
          {
            subjectId: '@image1',
            description: 'Derecha x=72%, fondo medio, avanzando lentamente hacia cámara',
          },
        ],
      },
      acting: {
        emotion: 'Tensión fría / territorio marcado',
        bodyLanguage:
          '@image2: mandíbula apretada, hombros bajos y anchos, peso distribuido en ambos pies, brazos cruzados bloqueando el pecho. @image1: paso deliberado y lento, mirada fija en @image2, mentón nivelado.',
        dialogue: '',
        microExpressions: [
          'Respiración visible en el pecho de @image2',
          'Pisadas lentas y deliberadas de @image1',
          'Músculos del antebrazo de @image2 apretados',
        ],
      },
      timeline: {
        duration: 9,
        segments: [{ start: 0, end: 9, label: 'Wide two-shot — entrada silenciosa' }],
        beats: [
          { start: 0, end: 3, description: '@image2 plantado, cámara lo descubre' },
          {
            start: 3,
            end: 9,
            description: '@image1 entra al fondo y avanza hacia el territorio de @image2',
          },
        ],
      },
      audio: {
        dialogue: '',
        ambient: 'Sala en silencio — tono de habitación, leve zumbido de ciudad al fondo',
        sfx: ['Pisadas lentas sobre suelo de madera o parquet', 'Crujido leve del suelo'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'mike', type: 'character' },
        { slot: '@image2', assetId: 'wyatt-gafas', type: 'character' },
        { slot: '@image3', assetId: 'plate-sala', type: 'plate' },
      ],
      prompt: {
        en: "SCENE: Living room interior, natural daylight from one side, warm-teal color grade, analog film grain, flat field, no vignette, spherical rectilinear lens 40mm. Plate background @image3 sala visible in depth. FRAME MAP: Wide two-shot, 9:16 vertical aspect ratio. @image2 (Wyatt with glasses) left third x=28%, foreground, stationary, arms crossed over chest, glasses clearly visible, shoulders square to camera, weight back on both feet, jaw tight, eyes fixed forward. @image1 (Mike) right third x=72%, midground-background, advancing slowly toward center frame at deliberate walking pace, chin level, gaze locked on @image2. @image2 sharp focus foreground, @image1 slightly soft in depth — shallow DOF. Neither subject crosses center axis. BLOCKING: @image2 holds position entire 9 seconds — planted, unmovable. @image1 enters right side of frame at second 0 from background distance and walks steadily closer, closing distance by 60% over 9 seconds. No dialogue. ACTING: @image2 — arms crossed blocking chest, forearm muscles visibly tensed, chest rising with controlled breath, jaw clamped shut, weight evenly on both feet, body language reads 'this is my territory'. @image1 — slow deliberate footsteps, erect posture, unhurried advance, chin level, eyes never leave @image2. LAST FRAME: @image1 has closed to mid-distance, @image2 still planted left, tension visibly established between both bodies. AUDIO: Room tone silence, faint city hum beyond walls, slow deliberate footsteps on wood floor, minor floor creak. CAPTURE: 40mm spherical rectilinear, 24fps, 180-degree shutter, 9:16 aspect ratio, handheld near-static with subtle breathing movement, total duration 9 seconds.",
        zh: "场景：室内客厅，单侧自然日光，暖青色调，模拟胶片颗粒，平坦画面，无晕影，球面直线镜头40mm。背景底板@image3 sala在景深中可见。构图：宽幅双人画面，9:16竖向比例。@image2（戴眼镜的Wyatt）左三分之一x=28%，前景，静止，双臂交叉于胸前，眼镜清晰可见，双肩正对镜头，重心后移，下颌咬紧，目视前方。@image1（Mike）右三分之一x=72%，中远景，以缓慢而刻意的步伐向画面中央走来，下巴水平，目光锁定@image2。@image2前景清晰对焦，@image1在景深中略微虚化——浅景深。两个主体均不越过画面中轴。走位：@image2全程9秒保持原位——planted，不动如山。@image1在第0秒从右侧背景距离入画，稳步向前，9秒内缩短约60%距离。无台词。表演：@image2——双臂交叉挡住胸口，前臂肌肉明显绷紧，胸部随控制呼吸起伏，下颌紧闭，重心平均分布双脚，肢体语言传达'这是我的地盘'。@image1——步伐缓慢刻意，身姿挺直，不紧不慢地走近，下巴水平，眼神始终不离@image2。最后一帧：@image1已缩短至中等距离，@image2仍植于左侧，双人之间的张力已清晰建立。音频：室内静音房间音，远处城市低鸣，木地板上缓慢有力的脚步声，轻微地板嘎吱声。拍摄参数：40mm球面直线镜头，24fps，180度快门，9:16比例，手持近静态带轻微呼吸晃动，总时长9秒。",
      },
      render: {
        mode: 'M1',
        engine: 'Seedance',
      },
      notes: {
        todos: ['Cargar @image1 Mike', 'Cargar @image2 Wyatt (gafas)', 'Cargar @image3 plate-sala'],
        warnings: [
          'Verificar que las gafas de @image2 sean visibles desde el inicio',
          'Confirmar que @image1 no llega demasiado cerca al final — debe conservar distancia media',
        ],
        approved: false,
      },
    },
    {
      id: 'B',
      title: 'Mike lanza el primer golpe verbal',
      description:
        'Singles alternados OTS: Mike habla directo a Wyatt, luego Wyatt escucha con la mandíbula apretada. La fricción se instala.',
      duration: 11,
      start: 9,
      end: 20,
      camera: {
        lens: '55mm, 75mm',
        framing: 'OTS @image1 sobre @image2, luego OTS @image2 sobre @image1',
        movement: 'Handheld stable',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Corte 1 (9-14s): OTS @image2 — hombro izquierdo de @image2 x=15% ocupa esquina, @image1 en foco x=60% pecho-arriba, mirando a @image2. Corte 2 (14-20s): OTS @image1 — hombro derecho de @image1 x=85% esquina, @image2 en foco x=38% pecho-arriba, gafas visibles.',
        subjectLock:
          '@image1 + @image2: ropa y facciones idénticas a shot A. @image2 gafas siempre visibles. Hombros escuadrados.',
        crossFrameRules:
          '@image1 siempre mira izquierda-dentro, @image2 siempre mira derecha-dentro — miradas conectan a través del corte. No cruzar eje 180°.',
        focus: 'Corte 1: foco en @image1. Corte 2: foco en @image2.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Sala — zona central, distancia media entre personajes',
        movement:
          'Corte 1: @image1 habla, mentón empujando hacia adelante, mano cortando el aire. Corte 2: @image2 escucha inmóvil, mandíbula apretada, luego gira levemente la cabeza mirando de reojo.',
        interaction: 'OTS alternado — nunca cara a cara directa, siempre ángulo escorzado.',
        positions: [
          {
            subjectId: '@image1',
            description:
              'Corte 1: centro-derecho x=60%, en foco, pecho-arriba. Corte 2: hombro derecho x=85%, fuera de foco, esquina',
          },
          {
            subjectId: '@image2',
            description:
              'Corte 1: hombro izquierdo x=15%, fuera de foco, esquina. Corte 2: centro-izquierdo x=38%, en foco, pecho-arriba, gafas visibles',
          },
        ],
      },
      acting: {
        emotion: 'Friccción verbal / presión acumulada',
        bodyLanguage:
          '@image1: mentón empujando hacia arriba y adelante, mano derecha cortando el aire en gesto de acusación, torso inclinado hacia @image2, peso sobre pie adelantado. @image2: mandíbula apretada, músculos temporales visibles, gira la cabeza 5° de reojo — señal de control máximo antes de estallar.',
        dialogue: "'¿En serio vas a hacer esto otra vez?'",
        microExpressions: [
          'Mentón de @image1 empujando hacia adelante',
          'Mano de @image1 cortando el aire',
          'Músculo temporal de @image2 pulsando',
          'Giro de cabeza de @image2 de 5° al final',
        ],
      },
      timeline: {
        duration: 11,
        segments: [
          { start: 9, end: 14, label: 'Corte 1 — OTS @image1 hablando' },
          { start: 14, end: 20, label: 'Corte 2 — OTS @image2 escuchando' },
        ],
        beats: [
          { start: 9, end: 12, description: '@image1 lanza la acusación verbal, mentón adelante' },
          { start: 12, end: 14, description: '@image1 termina frase, mano corta el aire' },
          { start: 14, end: 18, description: '@image2 absorbe el golpe, mandíbula apretada' },
          {
            start: 18,
            end: 20,
            description: '@image2 gira la cabeza levemente de reojo — control al límite',
          },
        ],
      },
      audio: {
        dialogue: "'¿En serio vas a hacer esto otra vez?'",
        ambient: 'Sala en silencio, tono de habitación',
        sfx: ['Mano golpeando el aire suavemente'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'mike', type: 'character' },
        { slot: '@image2', assetId: 'wyatt-gafas', type: 'character' },
      ],
      prompt: {
        en: "SCENE: Living room interior, natural daylight, warm-teal color grade, analog film grain, flat field, no vignette, spherical rectilinear lens alternating 55mm to 75mm across two cuts. 9:16 vertical aspect ratio. FRAME MAP — CUT 1 (0-5s within shot): OTS @image2 (Wyatt with glasses) — @image2 left shoulder x=15% foreground out-of-focus corner element. @image1 (Mike) in sharp focus center-right x=60%, chest-up framing, speaking directly toward @image1 eyeline. Shallow DOF. CUT 2 (5-11s within shot): OTS @image1 (Mike) — @image1 right shoulder x=85% foreground out-of-focus corner element. @image2 (Wyatt with glasses) in sharp focus center-left x=38%, chest-up framing, glasses clearly visible, listening. Shallow DOF. CROSS-FRAME RULES: @image1 always looks left-into-frame, @image2 always looks right-into-frame — eyelines connect across the cut. 180-degree axis never crossed. BLOCKING: Cut 1 — @image1 speaks with chin pushing forward and upward, right hand cutting the air in accusatory gesture, torso leaning toward @image2, weight on front foot. Cut 2 — @image2 stands completely still, jaw clenched, temporal muscles visibly tight, at second 4 of cut 2 turns head 5 degrees looking sideways — maximum controlled restraint before breaking point. ACTING: @image1 — aggressive-forward energy, chin jutting, hand slicing downward through air. @image2 — stillness as weapon, controlled breath, micro-jaw-clench visible, side-eye glance at end. DIALOGUE: @image1 says 'Are you seriously going to do this to me again?' in cut 1. @image2 silent in cut 2. LAST FRAME: @image2 in tight OTS, jaw hard, gaze shifted 5 degrees, glasses visible, tension maximal. AUDIO: Room tone, single hand gesture through air, near-silence otherwise. CAPTURE: 55mm for cut 1, 75mm for cut 2, 24fps, 180-degree shutter, 9:16, handheld stable, total duration 11 seconds.",
        zh: "场景：室内客厅，自然日光，暖青色调，模拟胶片颗粒，平坦画面，无晕影，球面直线镜头在两个剪切间交替使用55mm和75mm。9:16竖向比例。构图——剪切1（镜头内0-5秒）：@image2（戴眼镜的Wyatt）过肩拍——@image2左肩x=15%前景失焦角落元素。@image1（Mike）中右位置x=60%清晰对焦，胸部以上取景，直视@image2方向说话。浅景深。剪切2（镜头内5-11秒）：@image1（Mike）过肩拍——@image1右肩x=85%前景失焦角落元素。@image2（戴眼镜的Wyatt）中左位置x=38%清晰对焦，胸部以上取景，眼镜清晰可见，正在倾听。浅景深。跨帧规则：@image1始终向左看入画面，@image2始终向右看入画面——视线在剪切间连接。180度轴线从不越过。走位：剪切1——@image1说话时下巴向前向上推，右手切割空气做出指责手势，上身向@image2倾斜，重心在前脚。剪切2——@image2完全静止，下颌咬紧，颞肌明显紧绷，剪切2第4秒头部转动5度向侧面瞥视——在爆发临界点前的最大克制控制。表演：@image1——攻击性向前能量，下巴突出，手向下切空气。@image2——静止作为武器，控制呼吸，微观下颌咬紧可见，结尾处斜眼一瞥。台词：@image1在剪切1说'你真的要再这样对我吗？'@image2在剪切2沉默。最后一帧：@image2紧凑过肩特写，下颌坚硬，目光偏移5度，眼镜可见，张力最大化。音频：室内音，单次手势切空气声，其余近乎静默。拍摄参数：剪切1用55mm，剪切2用75mm，24fps，180度快门，9:16，手持稳定，总时长11秒。",
      },
      render: {
        mode: 'M1',
        engine: 'Seedance',
      },
      notes: {
        todos: [
          'Confirmar eyeline de @image1 hacia izquierda y @image2 hacia derecha',
          'Verificar gafas de @image2 en corte 2',
        ],
        warnings: [
          'El OTS de @image2 debe mostrar hombro claramente como elemento de profundidad — no recortarlo',
          'El giro de cabeza de @image2 al final debe ser sutil — 5° máximo, no exagerar',
        ],
        approved: false,
      },
    },
    {
      id: 'C',
      title: 'Wyatt rompe — contraataca directo a la cara de Mike',
      description:
        'Wyatt descruza los brazos y avanza medio paso hacia Mike, lanzando su respuesta al pecho. La temperatura explota. Singles rápidos en empuje-respuesta.',
      duration: 12,
      start: 20,
      end: 32,
      camera: {
        lens: '75mm to 85mm',
        framing: 'Single @image2 pecho-arriba con push-in lento, luego single @image1 reacción',
        movement: 'Push-in lento continuo en @image2, corte a handheld stable @image1',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Corte 1 (20-27s): Single @image2 pecho-arriba, x=50% centro, push-in lento de 75mm a 85mm durante 7s. @image2 descruza brazos y da medio paso hacia cámara. Corte 2 (27-32s): Single @image1 pecho-arriba x=50% centro, reacción — mandíbula apretada, retrocede medio paso.',
        subjectLock:
          '@image2 gafas visibles y consistentes. @image1 ropa y facciones idénticas al shot anterior. Hombros escuadrados en ambos singles.',
        crossFrameRules:
          'Singles independientes — cada uno centrado. Sin cruce de eje. Eyelines conectan a través del corte.',
        focus:
          'Corte 1: foco en @image2 todo el tiempo, push-in tightens encuadre. Corte 2: foco en @image1.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Sala — zona central, distancia cercana entre personajes',
        movement:
          'Corte 1: @image2 descruza los brazos (segundo 0 del corte), da medio paso adelante, torso inclinado hacia cámara, palabras disparadas a la garganta. Corte 2: @image1 absorbe el contraataque, retrocede medio paso involuntario, mandíbula apretada, ojos entrecerrados.',
        interaction: 'Singles en empuje-respuesta — presión física sin contacto.',
        positions: [
          {
            subjectId: '@image2',
            description:
              'Centro x=50%, pecho-arriba, avanzando medio paso hacia cámara durante corte 1',
          },
          {
            subjectId: '@image1',
            description:
              'Centro x=50%, pecho-arriba, retrocediendo medio paso en corte 2, reacción de impacto',
          },
        ],
      },
      acting: {
        emotion: 'Explosión controlada / contraataque con precisión',
        bodyLanguage:
          '@image2: descruza los brazos de golpe liberando energía contenida, da medio paso adelante, torso inclinado hacia adelante, dedos abiertos apuntando al pecho de @image1, voz baja y directa pero cargada. @image1: absorbe el golpe verbal, retrocede involuntariamente medio paso, mandíbula apretada, ojos entrecerrados, mano aprieta el costado del muslo.',
        dialogue: "'Tú sabes exactamente lo que hiciste.'",
        microExpressions: [
          'Brazos de @image2 descruzan de golpe',
          'Dedo de @image2 apuntando al pecho',
          'Retroceso involuntario de @image1',
          'Mano de @image1 apretando el muslo',
          'Ojos entrecerrados de @image1',
        ],
      },
      timeline: {
        duration: 12,
        segments: [
          { start: 20, end: 27, label: 'Corte 1 — Single @image2 con push-in, contraataque' },
          { start: 27, end: 32, label: 'Corte 2 — Single @image1 reacción de impacto' },
        ],
        beats: [
          { start: 20, end: 21, description: '@image2 descruza los brazos de golpe' },
          {
            start: 21,
            end: 23,
            description: '@image2 da medio paso adelante, cámara push-in comienza',
          },
          {
            start: 23,
            end: 27,
            description: '@image2 dispara las palabras, dedo apuntando, push-in completa',
          },
          { start: 27, end: 29, description: '@image1 absorbe el golpe, retroceso involuntario' },
          {
            start: 29,
            end: 32,
            description: '@image1 se recompone, mandíbula apretada, mano aprieta muslo',
          },
        ],
      },
      audio: {
        dialogue: "'Tú sabes exactamente lo que hiciste.'",
        ambient: 'Sala silencio tenso — room tone mínimo',
        sfx: ['Brazos descruzados con fricción de ropa', 'Medio paso sobre suelo de madera'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'mike', type: 'character' },
        { slot: '@image2', assetId: 'wyatt-gafas', type: 'character' },
      ],
      prompt: {
        en: "SCENE: Living room interior, natural daylight, warm-teal color grade, analog film grain, flat field, no vignette, spherical rectilinear lens 75mm to 85mm push-in for cut 1, 75mm static for cut 2. 9:16 vertical aspect ratio. FRAME MAP — CUT 1 (0-7s within shot): Single @image2 (Wyatt with glasses), chest-up, centered x=50%. Slow continuous push-in from 75mm to 85mm over 7 seconds, tightening on @image2's face. Shallow DOF, @image2 sharp. CUT 2 (7-12s within shot): Single @image1 (Mike), chest-up, centered x=50%, handheld stable, @image1 sharp, shallow DOF. BLOCKING — CUT 1: At second 0 @image2 suddenly uncrosses arms releasing stored energy — motion is abrupt not smooth. Takes one half-step forward toward camera, torso leans forward, right hand fingers open pointing at chest level toward @image1 offscreen. Voice is low, direct, precise — not shouting, stabbing. Push-in camera mirrors the advance, tightening frame. CUT 2: @image1 receives the verbal impact — involuntary half-step backward, weight shifts to back foot, jaw clamps shut, eyes narrow, right hand clenches against outer thigh. ACTING: @image2 — uncrossing arms is the explosion of contained energy, controlled fury not rage, finger points like a blade not a fist. @image1 — the backward step is not retreat but absorption, body betrays what the face tries to hide — hand squeezing thigh is the tell. DIALOGUE: @image2 says 'You know exactly what you did.' in cut 1 — delivered low, direct. @image1 silent in cut 2. LAST FRAME: @image1 tight single, jaw clamped, eyes narrowed, hand pressing into thigh, face working to stay neutral. AUDIO: Room silence, abrupt cloth-on-cloth sound of arms uncrossing, half-step on wood floor, near-silence. CAPTURE: 75mm-to-85mm push-in for cut 1, 75mm stable for cut 2, 24fps, 180-degree shutter, 9:16, total duration 12 seconds.",
        zh: "场景：室内客厅，自然日光，暖青色调，模拟胶片颗粒，平坦画面，无晕影，球面直线镜头剪切1为75mm到85mm推进，剪切2为75mm固定。9:16竖向比例。构图——剪切1（镜头内0-7秒）：@image2（戴眼镜的Wyatt）单人，胸部以上，居中x=50%。在7秒内从75mm到85mm缓慢连续推进，收紧@image2面部。浅景深，@image2清晰对焦。剪切2（镜头内7-12秒）：@image1（Mike）单人，胸部以上，居中x=50%，手持稳定，@image1清晰对焦，浅景深。走位——剪切1：第0秒@image2突然解开双臂，释放储存的能量——动作突然而非顺滑。向镜头方向迈半步，上身前倾，右手手指张开指向胸口高度朝向画面外的@image1。声音低沉、直接、精准——不是喊叫，而是刺入。推进镜头与前进动作呼应，收紧构图。剪切2：@image1接受言语冲击——不由自主地向后退半步，重心移向后脚，下颌咬紧，眼睛眯起，右手握紧贴于大腿外侧。表演：@image2——解开双臂是积累能量的爆炸，是控制的愤怒而非狂暴，手指像刀刃而非拳头指向对方。@image1——向后退步不是撤退而是吸收，身体出卖了脸部试图隐藏的东西——挤压大腿的手是泄露的破绽。台词：@image2在剪切1低声说'你很清楚自己做了什么。'@image1在剪切2沉默。最后一帧：@image1紧凑单人，下颌咬紧，眼睛眯起，手按在大腿上，面部努力保持平静。音频：室内静默，手臂解开时衣物摩擦的突然声响，木地板上半步声，近乎静默。拍摄参数：剪切1用75mm到85mm推进，剪切2用75mm固定，24fps，180度快门，9:16，总时长12秒。",
      },
      render: {
        mode: 'M1',
        engine: 'Seedance',
      },
      notes: {
        todos: [
          'Confirmar push-in fluido en corte 1 — no jerky',
          'Verificar retroceso involuntario de @image1 — debe parecer instintivo',
        ],
        warnings: [
          'El push-in debe ser lento y continuo — no un zoom brusco',
          'El retroceso de @image1 es medio paso — no exagerar la retirada',
        ],
        approved: false,
      },
    },
    {
      id: 'D',
      title: 'El silencio después — nadie gana',
      description:
        'Wide two-shot estático. Ambos personajes en sus lados del encuadre, sin hablar. Mike mira al suelo. Wyatt vuelve a cruzar los brazos. La sala los separa.',
      duration: 8,
      start: 32,
      end: 40,
      camera: {
        lens: '40mm',
        framing: 'Wide two-shot estático — espejo del shot A',
        movement: 'Near-static, levísima respiración handheld',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          '32-40s: Wide two-shot. @image2 izquierda x=28%, foreground, vuelve a cruzar lentamente los brazos. @image1 derecha x=72%, midground, mira al suelo. Espacio vacío entre ellos en el tercio central. Sala @image3 visible al fondo.',
        subjectLock:
          '@image2 gafas visibles. Ropa idéntica a shots anteriores. Distancia entre ellos mayor que en shot C.',
        crossFrameRules:
          '@image2 izquierda, @image1 derecha — espejo de shot A. Ninguno cruza el eje central. El espacio vacío entre ellos es el protagonista.',
        focus:
          'Ambos en el mismo plano focal, foco repartido — sala @image3 ligeramente desenfocada al fondo.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Sala — zona central, @image3 plate visible al fondo',
        movement:
          '32-40s: @image2 en posición izquierda descruza y vuelve a cruzar lentamente los brazos — movimiento de cierre. @image1 baja la mirada al suelo, desplaza el peso al pie trasero. Ninguno se mueve del sitio.',
        interaction: 'Wide two-shot — el espacio vacío entre ellos es la distancia emocional.',
        positions: [
          {
            subjectId: '@image2',
            description:
              'Izquierda x=28%, foreground, cruzando los brazos lentamente, gafas visibles',
          },
          {
            subjectId: '@image1',
            description: 'Derecha x=72%, midground, mirada al suelo, peso atrás',
          },
        ],
      },
      acting: {
        emotion: 'Vacío / tabique roto / nadie gana',
        bodyLanguage:
          '@image2: reconstruye lentamente la barrera de brazos cruzados — este cruce es diferente, ya no es territorio sino escudo. Mirada fija adelante pero vaciada. @image1: baja los ojos al suelo, el cuerpo cede ligeramente hacia atrás, hombros caen 2° — no derrota, pero sí peso.',
        dialogue: '',
        microExpressions: [
          'Brazos de @image2 cruzándose lentamente',
          'Mirada de @image1 cayendo al suelo',
          'Hombros de @image1 cediendo 2°',
          'Respiración visible y lenta en @image2',
        ],
      },
      timeline: {
        duration: 8,
        segments: [{ start: 32, end: 40, label: 'Wide two-shot — silencio y distancia' }],
        beats: [
          { start: 32, end: 34, description: '@image1 baja la mirada al suelo' },
          { start: 34, end: 37, description: '@image2 empieza a cruzar lentamente los brazos' },
          {
            start: 37,
            end: 40,
            description: 'Ambos inmóviles — el silencio sostiene el plano hasta el corte',
          },
        ],
      },
      audio: {
        dialogue: '',
        ambient: 'Sala silencio bajo — room tone, leve respiración de los cuerpos, ciudad lejana',
        sfx: ['Fricción suave de ropa al cruzar los brazos'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'mike', type: 'character' },
        { slot: '@image2', assetId: 'wyatt-gafas', type: 'character' },
        { slot: '@image3', assetId: 'plate-sala', type: 'plate' },
      ],
      prompt: {
        en: "SCENE: Living room interior, natural daylight slightly reduced — emotional cooldown, warm-teal color grade leaning cooler on the teal, analog film grain, flat field, no vignette, spherical rectilinear lens 40mm. Plate background @image3 sala visible in depth, slightly out of focus. FRAME MAP: Wide two-shot, 9:16 vertical aspect ratio, mirroring shot A composition. @image2 (Wyatt with glasses) left third x=28%, foreground, arms beginning to slowly cross over chest — this arm-cross is a shield not a wall. Glasses clearly visible. Eyes forward but emptied of heat. @image1 (Mike) right third x=72%, midground, eyes cast downward toward floor, weight shifts subtly to back foot, shoulders drop 2 degrees. Empty space in center third between them is intentional and compositionally heavy. @image3 sala plate faintly visible in depth, desaturated. BLOCKING: @image2 stands left, slowly reconstructs arm-cross over 3 seconds — movement is deliberate and quiet, not aggressive. Eyes stay forward and flat. @image1 stands right, lowers gaze to floor at second 1, slight weight shift back, shoulders yield imperceptibly — not defeat, but weight. Neither subject moves their feet. No dialogue. ACTING: @image2 — the slow arm-cross is closing off, withdrawal into armor. Breath visible in chest, controlled, returning to baseline. @image1 — eyes on floor is the cost of what was said. Shoulders yield 2 degrees — the body carries the blow the face won't show. LAST FRAME: Both subjects fixed in position, center space empty between them, @image2 arms fully crossed, @image1 eyes down — the room holds the distance. @image3 sala plate in soft depth behind. AUDIO: Near-silence, low room tone, soft cloth sound of arms crossing, distant city hum. CAPTURE: 40mm spherical rectilinear, 24fps, 180-degree shutter, 9:16, near-static handheld with subtle breathing, total duration 8 seconds.",
        zh: '场景：室内客厅，自然日光略有减弱——情绪冷却，暖青色调偏向更冷的青色，模拟胶片颗粒，平坦画面，无晕影，球面直线镜头40mm。背景底板@image3 sala在景深中隐约可见，略微失焦。构图：宽幅双人画面，9:16竖向比例，与镜头A构图呼应形成镜像。@image2（戴眼镜的Wyatt）左三分之一x=28%，前景，双臂开始缓慢交叉于胸前——这次交叉是盾牌而非壁垒。眼镜清晰可见。眼睛向前但已失去热度。@image1（Mike）右三分之一x=72%，中景，眼神投向地面，重心微妙地移向后脚，肩膀下沉2度。画面中央三分之一的空白空间是刻意的，在构图上具有重量感。@image3 sala底板在景深中隐约可见，去饱和处理。走位：@image2站左侧，在3秒内缓慢重建交叉双臂——动作刻意而安静，不具攻击性。眼睛保持向前，表情平淡。@image1站右侧，第1秒将目光投向地面，重心轻微后移，肩膀几乎察觉不到地向后退——不是失败，而是承受重量。两人均不移动脚步。无台词。表演：@image2——缓慢交叉双臂是关闭自我、退回铠甲的行为。胸口呼吸可见，受控，回归基线。@image1——目光看地是付出的代价，是已说出口的话的重量。肩膀退让2度——身体承受着脸部不愿展示的打击。最后一帧：两个主体固定在各自位置，中央空间空旷，@image2双臂完全交叉，@image1眼神向下——这个房间承载着彼此的距离。@image3 sala底板柔和地在背景景深中。音频：近乎静默，低沉室内音，双臂交叉时柔和的衣物声，远处城市低鸣。拍摄参数：40mm球面直线镜头，24fps，180度快门，9:16，手持近静态带轻微呼吸晃动，总时长8秒。',
      },
      render: {
        mode: 'M1',
        engine: 'Seedance',
      },
      notes: {
        todos: [
          'Confirmar que el espacio vacío central entre @image1 y @image2 es visible y no recortado',
          'Incluir @image3 plate-sala en el fondo',
        ],
        warnings: [
          'El cruce de brazos de @image2 debe ser LENTO — si es rápido pierde el significado emocional de cierre',
          'El plano debe cortar en seco — sin fade out ni transición suave',
        ],
        approved: false,
      },
    },
  ],
};

export const RESPONSE_2 = {
  description: 'Mike & Wyatt - Confrontación fraternal en la sala',
  duration: 79,
  mode: 'M1',
  aspectRatio: '9:16',
  references: [
    { slot: '@image1', assetId: 'cc36a4e5-2afa-473c-bdbc-e06d8ad79723', type: 'character' },
    { slot: '@image2', assetId: '50e9c5a0-4a63-46e9-a0d8-3d7ebf4760e1', type: 'plate' },
    { slot: '@image3', assetId: '01d03f57-5b6e-4445-a97e-3526069528bc', type: 'character' },
  ],
  sequenceFlow: {
    title: 'Time budget',
    subtitle: 'La tensión se acumula hasta el silencio definitivo',
    duration: 79,
    metric: 'dramaticIntensity',
    scale: { start: 'Cold', middle: 'Hot', end: 'Empty' },
    segments: [
      { id: 'A', shotId: 'A', label: 'Hook', start: 0, end: 11, intensity: 0.25, color: '#3d6e8f' },
      {
        id: 'B',
        shotId: 'B',
        label: 'Friction',
        start: 11,
        end: 27,
        intensity: 0.55,
        color: '#7a5c2e',
      },
      {
        id: 'C',
        shotId: 'C',
        label: 'Friction',
        start: 27,
        end: 43,
        intensity: 0.72,
        color: '#a04a20',
      },
      {
        id: 'D',
        shotId: 'D',
        label: 'Spike',
        start: 43,
        end: 60,
        intensity: 0.95,
        color: '#c0391a',
      },
      {
        id: 'E',
        shotId: 'E',
        label: 'Button',
        start: 60,
        end: 79,
        intensity: 0.15,
        color: '#4a4a4a',
      },
    ],
  },
  directorNotes: {
    goal: 'El espectador debe sentir el peso irresuelto de una herida vieja que ninguno de los dos puede nombrar, y quedarse con el vacío cuando Wyatt da la espalda.',
    styleGuide:
      'tungsten-teal grade - spherical rectilinear lens - flat field no vignette - 24fps 180 degree - diegetic audio only - prompt in positive imperative',
    warnings: [
      'Never cross the 180-degree line between @image1 and @image3 across consecutive shots.',
      '@image1 (Mike) always occupies frame left; @image3 (Wyatt con gafas) always occupies frame right.',
      '@image2 (Plate sala) must appear in every shot as background environment — do NOT generate a new room.',
      'Shallow DOF on singles; rack focus only on cue, never mid-action.',
      'No music. Room tone and diegetic SFX only.',
    ],
  },
  shots: [
    {
      id: 'A',
      title: 'Mike irrumpe — primer golpe verbal',
      description:
        'Mike entra en la sala y lanza la primera acusación; Wyatt está de espaldas junto a la ventana y se tensa sin girar.',
      duration: 11,
      start: 0,
      end: 11,
      camera: {
        lens: '40mm',
        framing:
          'Wide two-shot estancado — Wyatt de espaldas en foreground derecho, Mike entrando por izquierda',
        movement: 'Handheld leve, deriva lateral mínima hacia Mike',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Cut único (0-11s): Wide two-shot. @image3 (Wyatt) espalda al cámara, right third x=68%, foreground. @image1 (Mike) entrando left third x=28%, midground. @image2 (Plate sala) ocupa el fondo completo.',
        subjectLock:
          '@image3: espalda visible, camiseta oscura, gafas colgando. @image1: cara frontal visible, mandíbula apretada. Wardrobe consistente con referencia.',
        crossFrameRules:
          '@image1 siempre izquierda, @image3 siempre derecha. Nunca cruzar la línea de 180°. Hombros de @image1 cuadrados a cámara.',
        focus: 'Foco en @image1 (Mike) — @image3 desenfocado en foreground.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Sala — zona entrada, junto a la puerta',
        movement:
          'Cut único: @image1 entra por izquierda, da tres pasos al interior y se planta. @image3 permanece quieto de espaldas junto a la ventana derecha, hombros subiéndole lentamente.',
        interaction: 'Wide two-shot sin contacto visual; eyelines no se cruzan en este corte.',
        positions: [
          {
            subjectId: '@image1',
            description: 'Left third x=28%, midground, recién entrado, pie izquierdo adelantado',
          },
          {
            subjectId: '@image3',
            description: 'Right third x=68%, foreground, de espaldas a cámara, junto a ventana',
          },
        ],
      },
      acting: {
        emotion: 'Indignación acumulada buscando descarga',
        bodyLanguage:
          '@image1: mandíbula hacia adelante, peso en pie delantero, manos abiertas a los costados. @image3: hombros suben 2 cm, nuca tensa, sin girarse.',
        dialogue: "'¿En serio me vas a hacer esto otra vez?'",
        microExpressions: [
          'Mandíbula de @image1 proyectada hacia delante',
          'Hombros de @image3 elevándose en silencio',
          'Manos de @image1 abriéndose y cerrándose',
        ],
      },
      timeline: {
        duration: 11,
        segments: [
          { start: 0, end: 4, label: 'Mike entra y planta los pies' },
          { start: 4, end: 11, label: 'Wyatt no se gira — tensión silenciosa' },
        ],
        beats: [
          { start: 0, end: 2, description: '@image1 cruza el umbral, puerta cierra sola' },
          { start: 2, end: 6, description: '@image1 avanza tres pasos y se detiene' },
          {
            start: 6,
            end: 11,
            description: '@image1 dispara la primera línea; @image3 absorbe sin moverse',
          },
        ],
      },
      audio: {
        dialogue: "'¿En serio me vas a hacer esto otra vez?'",
        ambient: 'Room tone de sala residencial — leve zumbido de calle lejana',
        sfx: ['Puerta cerrándose con peso controlado', 'Pisadas sobre suelo de madera'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'cc36a4e5-2afa-473c-bdbc-e06d8ad79723', type: 'character' },
        { slot: '@image2', assetId: '50e9c5a0-4a63-46e9-a0d8-3d7ebf4760e1', type: 'plate' },
        { slot: '@image3', assetId: '01d03f57-5b6e-4445-a97e-3526069528bc', type: 'character' },
      ],
      prompt: {
        en: "SCENE — Interior living room, daytime. Use @image2 as the complete background environment (do not generate a new room). Tungsten-teal color grade, flat lighting, no vignette, analog film texture.\n\nFRAME MAP (0–11s, single cut, wide two-shot, 40mm spherical lens, 9:16 aspect ratio, 24fps, 180-degree shutter):\n— @image3 (Wyatt, glasses man) occupies right third of frame at x=68%, in the foreground, facing AWAY from camera. His back is visible: dark shirt, glasses hanging from collar. He stands motionless beside a window on the right side of the room.\n— @image1 (Mike) enters from screen left at x=28%, midground, walking toward camera and stopping after three steps. His face is fully visible, jaw jutting forward, weight on front foot, hands open at his sides.\n— @image2 plate fills the entire background behind both subjects.\n— Shallow DOF: focus locked on @image1; @image3 foreground is slightly soft.\n\nBLOCKING — @image1 enters through the left doorway, door swings closed behind him with controlled weight. He takes exactly three deliberate steps into the room and plants his feet, left foot slightly forward. @image3 does not turn. His shoulders rise 2 centimeters as @image1 speaks. No other movement.\n\nACTING — @image1 (Mike): jaw projected forward, transitive verb 'ACCUSE' — his chin drives the line of accusation. Hands open and close once at his sides. Eyes fixed on the back of @image3's head. @image3 (Wyatt): absorbs the blow without turning. Nape of neck visible and rigid. Shoulders climb in one slow involuntary breath.\n\nDIALOGUE — @image1 speaks: 'Are you seriously going to do this to me again?' Voice taut, restrained fury, not a shout.\n\nAUDIO — Room tone of a residential living room, faint street noise through glass. SFX: door closing with weight on beat 2s; footfalls on hardwood floor beats 2–5s.\n\nLAST FRAME (11s) — @image1 planted left third, jaw set, staring at @image3's back. @image3 back to camera right third, shoulders raised, not turned. @image2 fills background. Hold.\n\nCAMERA — 40mm spherical rectilinear lens. Light handheld drift left toward @image1, no more than 3cm lateral movement total. 9:16 vertical frame. 24fps, 180-degree shutter angle. Duration: 11 seconds.",
        zh: "场景——日景室内客厅。使用 @image2 作为完整背景环境（不要生成新的房间）。钨光-青色调色，平光照明，无暗角，模拟胶片质感。\n\n画面布局（0–11秒，单个剪辑，宽双人镜，40毫米球形镜头，9:16比例，24帧，180度快门角）：\n— @image3（Wyatt，戴眼镜男子）位于画面右三分之一处x=68%，处于前景，背对摄像机。背部可见：深色衬衫，眼镜挂在领口。他静立在房间右侧窗边。\n— @image1（Mike）从画面左侧x=28%中景入画，走向摄像机方向，迈三步后停下。面部完全可见，下颌前伸，重心压在前脚，双手在身侧张开。\n— @image2 底板铺满整个背景。\n— 浅景深：焦点锁定在 @image1；@image3 前景略微虚焦。\n\n走位——@image1 从左侧门道进入，门在身后带重量地关上。他迈出恰好三步，停稳，左脚微微前踏。@image3 没有转身。当 @image1 说话时，他的肩膀不由自主地上抬2厘米。无其他动作。\n\n表演——@image1（Mike）：下颌前推，及物动词'指控'——下巴引领指控的走向。双手在身侧开合一次。目光锁定 @image3 的后脑勺。@image3（Wyatt）：不转身承受冲击。颈背紧绷可见。肩膀在一次缓慢的不自觉呼吸中上升。\n\n台词——@image1 说道：'你是认真的吗？你还要这样对我？'声音绷紧，克制的愤怒，不是喊叫。\n\n音频——住宅客厅室内音，玻璃外隐约的街道噪音。音效：2秒时门带重量关上；2–5秒时木地板脚步声。\n\n最后一帧（11秒）——@image1 站稳左三分之一处，下颌绷紧，凝视 @image3 的背部。@image3 背对镜头右三分之一处，肩膀抬高，未转身。@image2 铺满背景。定格。\n\n摄影机——40毫米球形直线镜头。轻微手持横向漂移向 @image1，总横向位移不超过3厘米。9:16竖幅画面。24帧，180度快门角。时长：11秒。",
      },
      render: { mode: 'M1', engine: 'Seedance' },
      notes: {
        todos: ['Cargar @image1 Mike', 'Cargar @image2 Plate sala', 'Cargar @image3 Wyatt (gafas)'],
        warnings: [
          '@image3 debe aparecer de espaldas — no mostrar su cara en este shot.',
          'Mantener la línea de 180° intacta.',
        ],
        approved: false,
      },
    },
    {
      id: 'B',
      title: 'Wyatt se gira — contraataca con frialdad',
      description:
        'Wyatt se da la vuelta despacio y mira a Mike fijamente; su respuesta llega en voz baja y más letal que un grito.',
      duration: 16,
      start: 11,
      end: 27,
      camera: {
        lens: '55mm',
        framing: 'OTS de @image1 sobre hombro izquierdo viendo a @image3, luego single de @image3',
        movement: 'Handheld estable — ligero push-in lento sobre @image3 al final',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Cut 1 (0-8s): OTS de @image1 hombro izquierdo en frame left, @image3 chest-up en frame center-right x=62%. Cut 2 (8-16s): Single @image3 chest-up, x=55% center, leve push-in de 55mm a 62mm.',
        subjectLock:
          '@image3: gafas en rostro, camiseta oscura, expresión contenida. @image1: hombro y parte de perfil visible en cut 1. Wardrobe idéntico al shot A.',
        crossFrameRules:
          '@image1 permanece izquierda en cut 1. En cut 2 solo @image3 en frame. Eyeline de @image3 ligeramente por encima del eje de cámara.',
        focus: 'Cut 1: foco en @image3. Cut 2: foco en @image3, rack out muy leve al final.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Sala — zona central-derecha, frente a la ventana',
        movement:
          'Cut 1: @image3 completa el giro de 180° durante los primeros 3s hasta quedar cara a cara con @image1, se planta. @image1 visible como hombro OTS. Cut 2: @image3 solo, responde en voz baja.',
        interaction:
          'OTS conecta eyelines a través del corte; en single @image3 habla directamente a cámara-axis.',
        positions: [
          {
            subjectId: '@image3',
            description: 'Center-right x=62%, chest-up, cara visible, gafas puestas, de frente',
          },
          {
            subjectId: '@image1',
            description: 'Left edge, hombro y perfil OTS en cut 1, fuera de cuadro en cut 2',
          },
        ],
      },
      acting: {
        emotion: 'Frialdad como arma — control que duele más que la ira',
        bodyLanguage:
          '@image3: giro lento y deliberado, aterriza con los pies separados al ancho de hombros. Barbilla levemente baja. Párpados relajados. @image1 (OTS): hombros cuadrados, fijos.',
        dialogue: "'Yo no te estoy haciendo nada. Tú llevas años haciéndotelo a ti mismo.'",
        microExpressions: [
          'Giro de @image3 lento y medido',
          'Párpados entrecerrados de @image3',
          'Pausa de 1 segundo antes de hablar',
        ],
      },
      timeline: {
        duration: 16,
        segments: [
          { start: 0, end: 8, label: 'Cut 1 — OTS Wyatt completa el giro' },
          { start: 8, end: 16, label: 'Cut 2 — Single Wyatt responde en frío' },
        ],
        beats: [
          { start: 0, end: 3, description: '@image3 completa el giro, se planta' },
          { start: 3, end: 8, description: 'Silencio cargado — ambos se miden' },
          { start: 8, end: 10, description: 'Cut a single @image3, pausa antes de hablar' },
          { start: 10, end: 16, description: '@image3 dispara la línea en voz baja' },
        ],
      },
      audio: {
        dialogue: "'Yo no te estoy haciendo nada. Tú llevas años haciéndotelo a ti mismo.'",
        ambient: 'Room tone — silencio residencial, casi opresivo',
        sfx: ['Crujido leve de suelo al girar @image3', 'Exhalación nasal de @image1 audible'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'cc36a4e5-2afa-473c-bdbc-e06d8ad79723', type: 'character' },
        { slot: '@image2', assetId: '50e9c5a0-4a63-46e9-a0d8-3d7ebf4760e1', type: 'plate' },
        { slot: '@image3', assetId: '01d03f57-5b6e-4445-a97e-3526069528bc', type: 'character' },
      ],
      prompt: {
        en: "SCENE — Interior living room, daytime, continuous from previous shot. @image2 fills the entire background (same room as before, do not generate a new environment). Tungsten-teal color grade, flat field, no vignette, analog film texture.\n\nFRAME MAP (16 seconds total, 55mm spherical lens, 9:16, 24fps, 180-degree shutter):\nCUT 1 (0–8s): OTS shot. @image1 (Mike) visible as left-edge shoulder and partial profile, x=18%, in-focus foreground left. @image3 (Wyatt, glasses on face) chest-up at x=62% center-right, fully visible, face toward camera. @image2 background behind @image3.\nCUT 2 (8–16s): Single on @image3 (Wyatt), chest-up, x=55% center. Slow push-in: lens drifts 55mm toward 62mm equivalent over 8 seconds. @image2 background. @image1 out of frame.\n\nBLOCKING — Cut 1: @image3 completes a slow 180-degree pivot during the first 3 seconds, landing feet shoulder-width apart, facing @image1 and camera axis. Both characters hold position for 5 seconds of charged silence. Cut 2: @image3 alone, chin slightly lowered, delivers his line in a measured low voice. Camera pushes in slowly.\n\nACTING — @image3 (Wyatt): transitive verb 'DISMISS' — he does not raise his voice. The slowness of his pivot is the weapon. Eyelids relaxed, almost half-closed. A 1-second pause before speaking. @image1 (OTS, cut 1 only): shoulders square, fixed, receiving.\n\nDIALOGUE — @image3 speaks quietly: 'I am not doing anything to you. You have been doing this to yourself for years.' One beat of silence after the last word.\n\nAUDIO — Room tone, near-silence, oppressive stillness. SFX: light floor creak as @image3 pivots (beat 2s); audible nasal exhale from @image1 off-screen (beat 9s).\n\nLAST FRAME (16s) — @image3 single chest-up center frame, slightly closer due to push-in, chin down, eyes level, mouth closed after delivering line. @image2 background behind him.\n\nCAMERA — 55mm spherical rectilinear lens. Cut 1: handheld stable, no drift. Cut 2: slow continuous push-in, total zoom equivalent drift of ~7mm over 8 seconds. 9:16 vertical. 24fps, 180-degree shutter. Duration: 16 seconds.",
        zh: "场景——日景室内客厅，与上一镜头连续。@image2 铺满整个背景（与之前同一房间，不要生成新环境）。钨光-青色调色，平光，无暗角，模拟胶片质感。\n\n画面布局（共16秒，55毫米球形镜头，9:16，24帧，180度快门）：\n剪辑1（0–8秒）：过肩镜头。@image1（Mike）作为左侧边缘肩部和部分侧脸可见，x=18%，前景左侧清晰。@image3（Wyatt，戴眼镜）正面胸部以上，x=62%中右，面向摄像机。@image2 背景在 @image3 身后。\n剪辑2（8–16秒）：@image3（Wyatt）单人镜，胸部以上，x=55%居中。缓慢推镜：镜头焦距在8秒内从55毫米等效漂移至62毫米。@image2 背景。@image1 出画。\n\n走位——剪辑1：@image3 在前3秒完成缓慢的180度转身，双脚以肩宽落地，面向 @image1 和摄像机轴线。两人保持姿势5秒沉默对视。剪辑2：@image3 独自入画，下颌微低，用低沉平稳的声音说出台词。摄像机缓慢推进。\n\n表演——@image3（Wyatt）：及物动词'驳回'——他不提高声音。转身的缓慢本身就是武器。眼睑放松，几乎半闭。开口前停顿1秒。@image1（过肩，仅剪辑1）：肩膀方正，固定，承受中。\n\n台词——@image3 低声说道：'我没有对你做任何事。你自己折磨自己已经好多年了。'最后一个字后停顿一拍。\n\n音频——室内音，近乎静默，压迫感。音效：@image3 转身时地板轻微嘎吱（第2秒）；@image1 在画外的鼻腔呼气声（第9秒）。\n\n最后一帧（16秒）——@image3 单人胸部以上居中，因推镜稍近，下颌低垂，目光平视，说完台词后嘴唇合上。@image2 背景在其身后。\n\n摄影机——55毫米球形直线镜头。剪辑1：手持稳定，无漂移。剪辑2：缓慢连续推镜，8秒内等效焦距漂移约7毫米。9:16竖幅。24帧，180度快门角。时长：16秒。",
      },
      render: { mode: 'M1', engine: 'Seedance' },
      notes: {
        todos: ['Verificar que @image3 lleve las gafas puestas en este shot'],
        warnings: [
          'El giro de @image3 debe ser lento — no brusco. Si el modelo lo acelera, ajustar en prompt.',
          'Push-in sutil — no zoom óptico visible, movimiento de cámara físico.',
        ],
        approved: false,
      },
    },
    {
      id: 'C',
      title: 'Mike escala — dos singles alternados',
      description:
        'Mike sube el tono y da un paso adelante; los singles alternados comprimen el espacio entre ellos sin que se toquen.',
      duration: 16,
      start: 27,
      end: 43,
      camera: {
        lens: '75mm',
        framing: 'Singles alternados — primero single Mike, luego single Wyatt más cerrado',
        movement: 'Handheld con deriva imperceptible hacia sujeto en cada single',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Cut 1 (0-8s): Single @image1 (Mike) chest-up, x=38% frame left. Cut 2 (8-16s): Single @image3 (Wyatt) chin-up close, x=60% frame right. @image2 visible as background in both cuts.',
        subjectLock:
          '@image1: mismo wardrobe, cara frontal, venas del cuello ligeramente marcadas. @image3: gafas puestas, expresión inamovible.',
        crossFrameRules:
          '@image1 frame left en su single, @image3 frame right en su single. Eyelines opuestos crean el eje imaginario entre ambos.',
        focus: 'Cut 1: foco total en @image1. Cut 2: foco total en @image3.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Sala — zona central, ambos de pie a 1.5 metros de distancia',
        movement:
          'Cut 1: @image1 da un paso adelante durante la primera mitad del cut, se detiene. Cut 2: @image3 no se mueve — su quietud es la respuesta.',
        interaction:
          'Singles que se responden — la edición crea la confrontación sin que los cuerpos se toquen.',
        positions: [
          {
            subjectId: '@image1',
            description: 'Frame left x=38%, chest-up, un paso más cerca que en shot A',
          },
          { subjectId: '@image3', description: 'Frame right x=60%, chin-up close, inmóvil' },
        ],
      },
      acting: {
        emotion: 'Rabia que busca fisura — desesperación disfrazada de ataque',
        bodyLanguage:
          "@image1: paso adelante, vena del cuello visible, mano izquierda cerrándose en puño y abriéndose. @image3: mentón muy levemente elevado — transitive verb 'WITHSTAND' — absorbe sin ceder un milímetro.",
        dialogue: "'¡No me vengas con esa mierda filosófica! ¡Me debes una explicación!'",
        microExpressions: [
          'Vena del cuello de @image1 pulsando',
          'Puño de @image1 abriéndose y cerrándose',
          'Párpado de @image3 sin parpadear durante 4 segundos',
        ],
      },
      timeline: {
        duration: 16,
        segments: [
          { start: 0, end: 8, label: 'Cut 1 — Single Mike escala' },
          { start: 8, end: 16, label: 'Cut 2 — Single Wyatt aguanta' },
        ],
        beats: [
          { start: 0, end: 3, description: '@image1 da el paso, voz sube' },
          { start: 3, end: 8, description: '@image1 dispara la línea agresiva' },
          { start: 8, end: 12, description: 'Cut a @image3 — silencio sostenido' },
          {
            start: 12,
            end: 16,
            description: '@image3 aguanta sin pestañear, mínima reacción en párpado',
          },
        ],
      },
      audio: {
        dialogue: "'¡No me vengas con esa mierda filosófica! ¡Me debes una explicación!'",
        ambient: 'Room tone tenso — silencio después del grito que resuena',
        sfx: ['Pisada de @image1 sobre madera (beat 2s)', 'Eco breve del grito en la sala'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'cc36a4e5-2afa-473c-bdbc-e06d8ad79723', type: 'character' },
        { slot: '@image2', assetId: '50e9c5a0-4a63-46e9-a0d8-3d7ebf4760e1', type: 'plate' },
        { slot: '@image3', assetId: '01d03f57-5b6e-4445-a97e-3526069528bc', type: 'character' },
      ],
      prompt: {
        en: "SCENE — Interior living room, daytime, continuous. @image2 fills the background in both cuts (same room, do not generate a new environment). Tungsten-teal color grade, flat field, no vignette, analog film texture.\n\nFRAME MAP (16 seconds total, 75mm spherical lens, 9:16, 24fps, 180-degree shutter):\nCUT 1 (0–8s): Single on @image1 (Mike), chest-up, positioned at x=38% frame left. Face fully visible, neck tendons slightly raised. @image2 background behind him.\nCUT 2 (8–16s): Single on @image3 (Wyatt, glasses on), chin-up close framing, x=60% frame right. Utterly still. @image2 background behind him.\n\nBLOCKING — Cut 1: @image1 takes one decisive step forward during the first 3 seconds, stops. His left fist closes and opens once. His voice rises. Cut 2: @image3 does not move a single centimeter. His stillness is the answer. He does not blink for 4 continuous seconds.\n\nACTING — @image1 (Mike): transitive verb 'DEMAND' — voice breaks upward, neck vein visible, jaw drives each word. Left hand opens and closes at his side. Eyes wide. @image3 (Wyatt): transitive verb 'WITHSTAND' — chin fractionally elevated, eyelids locked open, jaw relaxed. Not a single muscle responds to the escalation.\n\nDIALOGUE — @image1 shouts: 'Don't give me that philosophical bullshit! You owe me an explanation!' Voice peaks on the second sentence.\n\nAUDIO — Cut 1: room tone + shout fills the space. Cut 2: abrupt silence after the shout — the echo settles. SFX: footstep on hardwood (beat 2s, cut 1); brief acoustic ring as voice hits the walls.\n\nLAST FRAME (16s) — @image3 single, x=60% right, chin up, eyes unblinking, mouth closed, after receiving the outburst. Shallow DOF, @image2 background softly out of focus behind him.\n\nCAMERA — 75mm spherical rectilinear lens. Cut 1: light handheld drift 2cm toward @image1. Cut 2: near-static, barely perceptible drift toward @image3. 9:16 vertical. 24fps, 180-degree shutter. Duration: 16 seconds.",
        zh: "场景——日景室内客厅，与上一镜头连续。@image2 在两个剪辑中铺满背景（同一房间，不要生成新环境）。钨光-青色调色，平光，无暗角，模拟胶片质感。\n\n画面布局（共16秒，75毫米球形镜头，9:16，24帧，180度快门）：\n剪辑1（0–8秒）：@image1（Mike）单人镜，胸部以上，x=38%画面左侧。面部完全可见，颈部肌腱略微凸出。@image2 背景在其身后。\n剪辑2（8–16秒）：@image3（Wyatt，戴眼镜）单人镜，下颌以上特写，x=60%画面右侧。纹丝不动。@image2 背景在其身后。\n\n走位——剪辑1：@image1 在前3秒迈出决定性的一步，停下。左拳握紧再松开一次。声音提高。剪辑2：@image3 一厘米都不动。他的静止就是回应。他持续4秒不眨眼。\n\n表演——@image1（Mike）：及物动词'索取'——声音向上破裂，颈部青筋可见，下颌驱动每个字。左手在身侧开合。眼睛睁大。@image3（Wyatt）：及物动词'承受'——下颌微微抬高，眼睑锁定睁开，下颌放松。对于升级没有一块肌肉作出反应。\n\n台词——@image1 大喊：'别跟我来那套哲学废话！你欠我一个解释！'第二句声音达到峰值。\n\n音频——剪辑1：室内音+喊声充满空间。剪辑2：喊声后骤然静默——回声平息。音效：木地板脚步声（第2秒，剪辑1）；声音撞墙后短暂的声学余响。\n\n最后一帧（16秒）——@image3 单人镜，x=60%右侧，下颌抬起，双眼不眨，嘴唇合拢，承受完爆发。浅景深，@image2 背景在其身后柔和虚焦。\n\n摄影机——75毫米球形直线镜头。剪辑1：轻微手持漂移向 @image1 约2厘米。剪辑2：近似静止，几乎察觉不到地向 @image3 漂移。9:16竖幅。24帧，180度快门角。时长：16秒。",
      },
      render: { mode: 'M1', engine: 'Seedance' },
      notes: {
        todos: ['Confirmar que la voz de @image1 se graba por separado en postproducción'],
        warnings: [
          'El grito de @image1 no debe hacer que @image3 retroceda físicamente — queda plantado.',
          '@image3 debe llevar las gafas durante todo el shot.',
        ],
        approved: false,
      },
    },
    {
      id: 'D',
      title: 'El golpe más bajo — insert de manos + single Wyatt roto',
      description:
        'Wyatt baja las gafas lentamente como acto de rendición parcial, luego dice la verdad más cruel en susurro.',
      duration: 17,
      start: 43,
      end: 60,
      camera: {
        lens: '85mm, 100mm',
        framing: 'Insert manos @image3 bajan gafas, luego single @image3 cara close-up',
        movement: 'Estático en insert; micro push-in en close-up',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Cut 1 (0-5s): Insert 85mm — manos de @image3 en frame center, gafas bajando desde rostro hasta colgar del dedo. Cut 2 (5-17s): Single 100mm — @image3 close-up cara, x=52% center, micro push-in lento.',
        subjectLock:
          '@image3: gafas colgando del dedo en cut 1, sin gafas en cut 2. Continuidad de wardrobe.',
        crossFrameRules:
          'Solo @image3 en frame. @image1 fuera de cuadro — su presencia solo en audio.',
        focus: 'Cut 1: foco en gafas y dedos. Cut 2: foco en ojos de @image3.',
        depth: 'Shallow DOF — máxima en cut 2',
      },
      blocking: {
        location: 'Sala — zona central, mismo punto que shot C',
        movement:
          'Cut 1: las manos de @image3 suben al rostro, toman las gafas y las bajan con control hasta colgar del dedo índice. Cut 2: @image3 cara sin gafas, ojos directamente al eje de cámara.',
        interaction:
          'Solo @image3 en frame. Ausencia de @image1 convierte la cámara en testigo directo.',
        positions: [
          {
            subjectId: '@image3',
            description: 'Cut 1: manos center frame. Cut 2: cara close-up x=52% center',
          },
        ],
      },
      acting: {
        emotion: 'Gut-punch deliberado — crueldad nacida del agotamiento',
        bodyLanguage:
          '@image3: gesto de bajar las gafas lento y consciente como un desarme. En cut 2: ojos ligeramente enrojecidos en los bordes, respiración nasal visible, boca cerrada hasta el momento exacto de hablar.',
        dialogue: "'Lo que más te duele no soy yo. Eres tú cuando te miras al espejo.'",
        microExpressions: [
          'Gafas bajando frame-by-frame',
          'Borde de párpado inferior levemente húmedo',
          'Respiración nasal visible antes de hablar',
        ],
      },
      timeline: {
        duration: 17,
        segments: [
          { start: 0, end: 5, label: 'Cut 1 — Insert gafas bajando' },
          { start: 5, end: 17, label: 'Cut 2 — Close-up Wyatt dispara la verdad' },
        ],
        beats: [
          { start: 0, end: 5, description: 'Manos de @image3 bajan gafas — silencio total' },
          { start: 5, end: 9, description: '@image3 cara sin gafas — pausa antes de hablar' },
          { start: 9, end: 17, description: '@image3 dice la línea en susurro; push-in termina' },
        ],
      },
      audio: {
        dialogue: "'Lo que más te duele no soy yo. Eres tú cuando te miras al espejo.'",
        ambient: 'Silencio casi total — room tone mínimo',
        sfx: [
          'Leve roce de plástico de gafas contra dedos',
          'Respiración nasal de @image3 audible antes de la línea',
        ],
        music: false,
      },
      references: [
        { slot: '@image2', assetId: '50e9c5a0-4a63-46e9-a0d8-3d7ebf4760e1', type: 'plate' },
        { slot: '@image3', assetId: '01d03f57-5b6e-4445-a97e-3526069528bc', type: 'character' },
      ],
      prompt: {
        en: "SCENE — Interior living room, daytime, continuous. @image2 visible as background in both cuts. Tungsten-teal color grade, maximum shallow DOF in cut 2, flat field, no vignette, analog film texture.\n\nFRAME MAP (17 seconds total, two cuts, 9:16, 24fps, 180-degree shutter):\nCUT 1 (0–5s): Insert shot, 85mm. Frame filled by @image3's hands in center frame. @image3 raises both hands to his face, grasps his glasses, and lowers them slowly until they hang from his right index finger. The gesture takes the full 5 seconds — deliberate, controlled, weaponized. @image2 background softly visible behind.\nCUT 2 (5–17s): Single close-up on @image3 (Wyatt, without glasses now), face x=52% center. 100mm lens. Micro push-in over 12 seconds — total drift equivalent of approximately 5mm. Eyes visible: slight redness at lower eyelid rim. Mouth closed until the moment of speaking.\n\nBLOCKING — Cut 1: hands move upward to face, grasp glasses at temples, lower in one unbroken motion. No tremor, no hesitation. Cut 2: @image3 holds eye contact with camera axis. Nasal breath audible before speaking. He delivers the line in a controlled whisper. @image1 is entirely off-screen — present only in audio if reacting.\n\nACTING — @image3 (Wyatt): transitive verb 'WOUND' — the slow removal of glasses is a ritual that announces the final blow. In cut 2: lower eyelid rim slightly moist, nasal breathing visible (nostrils expand once before speech), jaw loose, voice a near-whisper.\n\nDIALOGUE — @image3 whispers: 'What hurts you most is not me. It is you, when you look in the mirror.' Full pause before the second sentence.\n\nAUDIO — Near total silence. Room tone minimum. SFX: faint plastic-on-finger sound as glasses slide down (cut 1, beat 2s); audible nasal inhale from @image3 (cut 2, beat 8s).\n\nLAST FRAME (17s) — @image3 close-up, x=52% center, slightly closer due to push-in, eyes forward, mouth closed after final word, glasses gone from face. @image2 background behind him, very shallow focus.\n\nCAMERA — Cut 1: 85mm spherical, static tripod-style, no movement. Cut 2: 100mm spherical, micro push-in, barely perceptible, over 12 seconds. 9:16 vertical. 24fps, 180-degree shutter. Duration: 17 seconds.",
        zh: "场景——日景室内客厅，与上一镜头连续。@image2 在两个剪辑中作为背景可见。钨光-青色调色，剪辑2最大浅景深，平光，无暗角，模拟胶片质感。\n\n画面布局（共17秒，两个剪辑，9:16，24帧，180度快门）：\n剪辑1（0–5秒）：插入镜头，85毫米。画面充满 @image3 的双手，居中画面。@image3 双手上移至脸部，握住眼镜，缓慢将其放下，直到挂在右手食指上。这个动作持续完整的5秒——刻意、克制、被武器化。@image2 背景在后方柔和可见。\n剪辑2（5–17秒）：@image3（Wyatt，此时不戴眼镜）单人特写，面部x=52%居中。100毫米镜头。12秒内微推镜——总漂移等效约5毫米。眼睛可见：下眼睑边缘轻微泛红。嘴唇合拢至开口说话的那一刻。\n\n走位——剪辑1：双手向上移至脸部，握住眼镜镜腿，一气呵成地放下。无颤抖，无犹豫。剪辑2：@image3 与摄像机轴线保持眼神接触。开口前鼻腔呼吸可听见。他用克制的低语说出台词。@image1 完全在画外——仅通过音频存在。\n\n表演——@image3（Wyatt）：及物动词'伤害'——缓慢摘下眼镜是一个仪式，宣告最后一击。剪辑2：下眼睑边缘略微湿润，鼻腔呼吸可见（说话前鼻孔扩张一次），下颌放松，声音几乎是低语。\n\n台词——@image3 低语道：'最让你痛苦的不是我。是你照镜子时看到的自己。'两句之间完整停顿。\n\n音频——近乎完全的静默。室内音极低。音效：眼镜沿手指滑落时轻微的塑料摩擦声（剪辑1，第2秒）；@image3 可听见的鼻腔吸气声（剪辑2，第8秒）。\n\n最后一帧（17秒）——@image3 特写，x=52%居中，因推镜稍近，目光向前，说完最后一个字后嘴唇合上，脸上已无眼镜。@image2 背景在其身后，焦点极浅。\n\n摄影机——剪辑1：85毫米球形镜，静态三脚架风格，无运动。剪辑2：100毫米球形，微推镜，几乎察觉不到，持续12秒。9:16竖幅。24帧，180度快门角。时长：17秒。",
      },
      render: { mode: 'M1', engine: 'Seedance' },
      notes: {
        todos: [
          'En cut 2 @image3 aparece SIN gafas — verificar continuidad con cut 1 donde las baja',
        ],
        warnings: [
          'El insert de manos debe mostrar claramente las gafas siendo bajadas — no omitir la continuidad del objeto prop.',
          '@image1 no aparece en ningún frame de este shot — solo audio off-screen.',
        ],
        approved: false,
      },
    },
    {
      id: 'E',
      title: 'El vacío — Wyatt da la espalda y Mikexx se desmorona',
      description:
        'Wyatt se vuelve de espaldas y sale de cuadro; Mike queda solo en sala vacía, inmóvil.',
      duration: 19,
      start: 60,
      end: 79,
      camera: {
        lens: '40mm',
        framing: 'Wide two-shot, luego single Mike — Wyatt desaparece del cuadro',
        movement: 'Estático — cámara no sigue a nadie',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Cut 1 (0-9s): Wide two-shot retomando composición de Shot A. @image1 left third x=30%, @image3 right third x=67% de espaldas y caminando hacia fondo. Cut 2 (9-19s): Single @image1 left third x=32%, chest-up, Mike solo. @image2 fondo vacío. Cámara estática.',
        subjectLock:
          '@image1: mismo wardrobe, cara frontal ahora caída. @image3: de espaldas, sin gafas en la mano, camina al fondo hasta desaparecer.',
        crossFrameRules:
          '@image1 izquierda durante todo el shot. @image3 se mueve hacia el fondo derecho y sale de cuadro. Cámara no lo sigue.',
        focus:
          'Cut 1: foco en @image1, @image3 se vuelve borroso al alejarse. Cut 2: foco total en @image1.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Sala — zona central; @image3 camina hacia el fondo derecho y desaparece',
        movement:
          'Cut 1: @image3 se gira de espaldas lentamente y camina en profundidad hacia el fondo derecho de @image2, saliendo de cuadro entre 7-9s. @image1 permanece inmóvil izquierda. Cut 2: @image1 solo, no se mueve durante 10 segundos completos.',
        interaction:
          'La distancia creciente entre @image3 alejándose y @image1 plantado es la acción dramática principal.',
        positions: [
          { subjectId: '@image1', description: 'Left third x=30–32%, inmóvil, peso hundido' },
          {
            subjectId: '@image3',
            description:
              'Right third x=67% al inicio, caminando en profundidad hasta salir de cuadro en 9s',
          },
        ],
      },
      acting: {
        emotion: 'El vacío después del golpe — Mike no persigue, no habla',
        bodyLanguage:
          '@image3 (Wyatt): giro limpio de espaldas, paso largo y deliberado sin mirar atrás. @image1 (Mike): hombros caen 3 cm, respiración visible en pecho, cabeza baja 2 grados. Manos sueltas a los costados.',
        dialogue: '',
        microExpressions: [
          'Hombros de @image1 hundiéndose progresivamente',
          'Respiración pectoral visible de @image1',
          'Manos de @image1 abriéndose en rendición',
        ],
      },
      timeline: {
        duration: 19,
        segments: [
          { start: 0, end: 9, label: 'Cut 1 — Wyatt da la espalda y se aleja' },
          { start: 9, end: 19, label: 'Cut 2 — Mike solo en sala vacía' },
        ],
        beats: [
          { start: 0, end: 3, description: '@image3 inicia el giro de espaldas' },
          { start: 3, end: 9, description: '@image3 camina en profundidad hasta salir de cuadro' },
          { start: 9, end: 14, description: 'Cut a single @image1 — proceso de hundimiento' },
          { start: 14, end: 19, description: '@image1 quieto, sala vacía — hold final' },
        ],
      },
      audio: {
        dialogue: '',
        ambient: 'Room tone desnudo — silencio residencial con levísimo zumbido eléctrico',
        sfx: [
          'Pasos de @image3 alejándose sobre madera (beats 3-9s)',
          'Crujido de puerta lejana o pasos en pasillo (beat 10s)',
        ],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'cc36a4e5-2afa-473c-bdbc-e06d8ad79723', type: 'character' },
        { slot: '@image2', assetId: '50e9c5a0-4a63-46e9-a0d8-3d7ebf4760e1', type: 'plate' },
        { slot: '@image3', assetId: '01d03f57-5b6e-4445-a97e-3526069528bc', type: 'character' },
      ],
      prompt: {
        en: "SCENE — Interior living room, daytime, continuous. @image2 fills the entire background throughout both cuts (same room, do not generate a new environment). Tungsten-teal color grade, flat field, no vignette, analog film texture.\n\nFRAME MAP (19 seconds total, 40mm spherical lens, 9:16, 24fps, 180-degree shutter):\nCUT 1 (0–9s): Wide two-shot. @image1 (Mike) left third x=30%, chest-up, stationary, face visible and falling. @image3 (Wyatt, no glasses on face, glasses held loosely at side or placed on nearby surface) right third x=67%, executing a slow turn to face away from camera. From second 3 onward @image3 walks in depth toward the background-right of @image2 until he exits frame completely by second 9. Camera is static — it does not follow @image3.\nCUT 2 (9–19s): Single on @image1 (Mike), chest-up, x=32% left third. @image3 is completely gone. @image2 background is the entire visible environment. Camera static. @image1 does not move for 10 full seconds.\n\nBLOCKING — Cut 1: @image3 turns his back in a single clean pivot (3 seconds), then walks in perspective depth toward the far right background, footsteps audible on hardwood, disappearing into the @image2 room depth. @image1 stands fixed, receiving. Shoulders drop 3 centimeters progressively as @image3 retreats. Cut 2: @image1 alone. Weight sunken. Head lowers 2 degrees. Hands open at sides. Chest breathing visible.\n\nACTING — @image3 (Wyatt): transitive verb 'ABANDON' — the walk away is final, no hesitation, no backward glance. @image1 (Mike): transitive verb 'COLLAPSE INWARD' — he does not pursue, does not speak. His body slowly absorbs the absence. Not a dramatic breakdown — a quiet implosion.\n\nDIALOGUE — No dialogue. Complete silence.\n\nAUDIO — Bare room tone: residential silence with the faintest electrical hum. SFX: footsteps of @image3 on hardwood receding (beats 3–9s, cut 1); distant hallway creak or soft door sound (beat 10s, cut 2).\n\nLAST FRAME (19s) — @image1 alone, left third x=32%, chest-up, head 2 degrees lower than start, hands open, eyes forward but unfocused. @image2 fills the background — the empty room around him. Hold for 3 seconds. Fade to cut.\n\nCAMERA — 40mm spherical rectilinear lens. Both cuts: completely static, tripod-locked. No drift, no movement. Camera refuses to follow @image3. 9:16 vertical. 24fps, 180-degree shutter. Duration: 19 seconds.",
        zh: "场景——日景室内客厅，与上一镜头连续。@image2 在两个剪辑中铺满整个背景（同一房间，不要生成新环境）。钨光-青色调色，平光，无暗角，模拟胶片质感。\n\n画面布局（共19秒，40毫米球形镜头，9:16，24帧，180度快门）：\n剪辑1（0–9秒）：宽双人镜。@image1（Mike）左三分之一处x=30%，胸部以上，静止，面部可见且正在垮掉。@image3（Wyatt，脸上无眼镜，眼镜松散地拿在手侧或放在附近）右三分之一处x=67%，执行缓慢的背身转动。从第3秒起 @image3 向 @image2 背景右侧深处走去，至第9秒完全出画。摄像机静止——不跟随 @image3。\n剪辑2（9–19秒）：@image1（Mike）单人镜，胸部以上，x=32%左三分之一处。@image3 完全消失。@image2 背景是全部可见的环境。摄像机静止。@image1 在完整的10秒内不移动。\n\n走位——剪辑1：@image3 在3秒内完成单次干净的背身转动，然后向背景右侧深处走去，脚步声在木地板上可听见，消失在 @image2 的房间纵深中。@image1 固定站立，承受。随着 @image3 后退，肩膀逐渐下沉3厘米。剪辑2：@image1 独自在场。重心下沉。头部低下2度。双手在身侧张开。胸部呼吸可见。\n\n表演——@image3（Wyatt）：及物动词'离弃'——离开是决定性的，无犹豫，无回头。@image1（Mike）：及物动词'向内崩塌'——他不追，不说话。他的身体缓慢吸收这个空缺。不是戏剧性崩溃——是安静的内爆。\n\n台词——无台词。完全静默。\n\n音频——裸露的室内音：住宅静默加上极其微弱的电气嗡鸣。音效：@image3 脚步声在木地板上远去（剪辑1，第3–9秒）；遥远走廊的嘎吱声或轻柔的门声（剪辑2，第10秒）。\n\n最后一帧（19秒）——@image1 独自，左三分之一处x=32%，胸部以上，头部比开始时低2度，双手张开，目光向前但失焦。@image2 铺满背景——他周围空旷的房间。定格3秒。淡出至剪辑。\n\n摄影机——40毫米球形直线镜头。两个剪辑均完全静止，三脚架锁定。无漂移，无运动。摄像机拒绝跟随 @image3。9:16竖幅。24帧，180度快门角。时长：19秒。",
      },
      render: { mode: 'M1', engine: 'Seedance' },
      notes: {
        todos: [
          'Confirmar que @image3 sale de cuadro antes del corte a cut 2',
          'Verificar que @image2 no cambie entre cuts — mismo fondo',
        ],
        warnings: [
          'Cámara ESTÁTICA en ambos cuts — no seguir a @image3 cuando se aleja. Esta es la decisión clave del shot.',
          '@image3 en cut 1 debe ser sin gafas en el rostro (continuidad desde shot D).',
        ],
        approved: false,
      },
    },
  ],
};

export const SCENES_35_MOCK = {
  description: 'Mike vs Wyatt - Confrontación fraternal en la sala',
  duration: 40,
  mode: 'M1',
  aspectRatio: '9:16',
  references: [
    { slot: '@image1', assetId: 'cc36a4e5-2afa-473c-bdbc-e06d8ad79723', type: 'character' },
    { slot: '@image2', assetId: '50e9c5a0-4a63-46e9-a0d8-3d7ebf4760e1', type: 'plate' },
    { slot: '@image3', assetId: '01d03f57-5b6e-4445-a97e-3526069528bc', type: 'character' },
  ],
  sequenceFlow: {
    title: 'Time budget',
    subtitle: 'La tensión sube hasta el silencio que lo dice todo',
    duration: 40,
    metric: 'dramaticIntensity',
    scale: { start: 'Frío', middle: 'Ignición', end: 'Ceniza' },
    segments: [
      { id: 'A', shotId: 'A', label: 'Hook', start: 0, end: 10, intensity: 0.25, color: '#3d6e8f' },
      {
        id: 'B',
        shotId: 'B',
        label: 'Friction',
        start: 10,
        end: 22,
        intensity: 0.65,
        color: '#c87c2a',
      },
      {
        id: 'C',
        shotId: 'C',
        label: 'Spike',
        start: 22,
        end: 33,
        intensity: 0.95,
        color: '#c03030',
      },
      {
        id: 'D',
        shotId: 'D',
        label: 'Button',
        start: 33,
        end: 40,
        intensity: 0.3,
        color: '#5a5a5a',
      },
    ],
  },
  directorNotes: {
    goal: 'El espectador debe sentir que una palabra más rompe algo irreparable entre estos dos hombres.',
    styleGuide:
      'teal-amber grade - 35mm spherical rectilinear lens - flat field no vignette - 24fps 180 degree shutter - diegetic audio only - prompt in positive imperative - analog film grain',
    warnings: [
      'Do NOT generate abstract or metaphorical visuals; all emotion must be expressed through observable physical action.',
      'Keep @image1 (Mike) always left of center; keep @image3 (Wyatt) always right of center in two-shot frames.',
      'Use @image2 as the living room environment plate — never reinterpret the space.',
      'Do NOT cross the 180-degree line between characters.',
      'Shallow DOF on all shots; background plate @image2 must remain recognizable but soft.',
    ],
  },
  shots: [
    {
      id: 'A',
      title: 'Mike entra y planta los pies',
      description:
        'Mike entra en la sala con paso decidido y se detiene en el centro, mirando a Wyatt que ya está en el cuarto.',
      duration: 10,
      start: 0,
      end: 10,
      camera: {
        lens: '35mm',
        framing: 'Full shot staggered two-shot',
        movement: 'Handheld slight drift toward subjects',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          '0-10s: Staggered two-shot. @image1 (Mike) enters from bottom-left, plants at left third x=30%. @image3 (Wyatt) stands right third x=72%, slightly deeper in frame. Both visible waist-to-head. @image2 living room plate fills background, soft and warm.',
        subjectLock:
          '@image1 Mike: dark casual clothes, tense jaw, fists loosely at sides. @image3 Wyatt: glasses, arms crossed, weight on back foot. Identical wardrobe and face across all shots.',
        crossFrameRules:
          '@image1 always left of center, @image3 always right of center. Never cross the axis. Shoulders angled 15 degrees toward each other, not full profile.',
        focus: 'Rack focus from @image1 entering to both in plane by second 4.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Living room - entrance area, using @image2 plate',
        movement:
          '0-4s: @image1 walks in from bottom-left frame edge, footfalls audible on hardwood floor; stops at x=30%. 4-10s: Both men hold position; @image1 exhales through nose, weight shifts forward onto toes.',
        interaction:
          'Staggered two-shot. @image1 advances slightly; @image3 does not retreat. Eyelines lock across the frame.',
        positions: [
          {
            subjectId: '@image1',
            description:
              'Left third x=30%, foreground, stopped mid-stride, slightly closer to camera',
          },
          {
            subjectId: '@image3',
            description: 'Right third x=72%, midground, arms crossed, weight back',
          },
        ],
      },
      acting: {
        emotion: 'Cold confrontation arriving',
        bodyLanguage:
          '@image1 (Mike): jaw clenched, chin level, fists loosely closed at hips, plants feet wide. @image3 (Wyatt): arms crossed tight over chest, glasses slightly down nose, eyebrows flat.',
        dialogue: '',
        microExpressions: [
          'Mike: nostril flare on entry',
          'Wyatt: chin tilts up 2 degrees as Mike stops',
          'Mike: slow exhale visible through parted lips',
        ],
      },
      timeline: {
        duration: 10,
        segments: [
          { start: 0, end: 4, label: 'Mike enters and closes distance' },
          { start: 4, end: 10, label: 'Both locked in silent standoff' },
        ],
        beats: [
          {
            start: 0,
            end: 4,
            description: '@image1 enters frame, footsteps on hardwood, plants feet',
          },
          {
            start: 4,
            end: 10,
            description: 'Mutual eyeline lock; charged stillness; @image1 exhales',
          },
        ],
      },
      audio: {
        dialogue: '',
        ambient: 'Low room tone, distant street hum, house creak',
        sfx: ['Footsteps on hardwood floor', 'Subtle exhale'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'cc36a4e5-2afa-473c-bdbc-e06d8ad79723', type: 'character' },
        { slot: '@image2', assetId: '50e9c5a0-4a63-46e9-a0d8-3d7ebf4760e1', type: 'plate' },
        { slot: '@image3', assetId: '01d03f57-5b6e-4445-a97e-3526069528bc', type: 'character' },
      ],
      prompt: {
        en: 'SHOT A — Hook — 10 seconds — 9:16 — 24fps — 180-degree shutter — Seedance M1.\n\nSCENE: Interior living room, warm late-afternoon light, teal-amber color grade, analog film grain. The room is furnished and lived-in; background comes from reference plate @image2, kept soft and slightly out of focus.\n\nFRAME MAP: Staggered two-shot for the full 10 seconds. @image1 (Mike) occupies the LEFT THIRD of the frame at horizontal position x=30%, slightly closer to camera, visible from waist to head. @image3 (Wyatt, glasses) occupies the RIGHT THIRD at x=72%, slightly deeper in frame, also waist-to-head. Neither subject crosses the center axis at any point.\n\nSUBJECT LOCK — @image1 Mike: dark casual clothes, strong jaw tightly clenched, fists loosely closed at hips. Must match @image1 reference exactly in face and wardrobe throughout shot. @image3 Wyatt: glasses worn on face, arms crossed firmly over chest, weight on back foot. Must match @image3 reference exactly.\n\nBLOCKING AND MOVEMENT: 0-4s — @image1 enters from the bottom-left edge of frame walking with deliberate, heavy footsteps; audible on hardwood floor; stops at x=30% with feet planted wide. Camera drifts slightly forward on a handheld rig, closing the implied distance. 4-10s — Both men hold their positions. @image1 exhales slowly through parted lips. @image3 tilts chin up approximately 2 degrees. Neither man retreats. Eyelines connect across the frame.\n\nACTING MICRO-BEATS: @image1 nostril flare on entry (second 1). @image3 chin tilts up as @image1 stops (second 4). @image1 slow exhale visible as chest drops (second 6). Both hold the lock through second 10.\n\nLAST FRAME: Full staggered two-shot. @image1 left, feet wide, jaw tight. @image3 right, arms crossed, chin up. Eyelines locked. Room behind them soft and warm.\n\nCAMERA: 35mm spherical rectilinear lens. Handheld with slight drift toward subjects. Shallow depth of field — both subjects in focus plane, background @image2 plate rendered soft. Flat field, no vignette. 24fps, 180-degree shutter angle.\n\nAUDIO: Footsteps on hardwood floor during entry. Subtle exhale at second 6. Low room tone, distant street hum, house creak throughout. No music. Diegetic audio only.\n\nCOLOR: Teal-amber grade. Warm practical light from room. Analog film grain texture.',
        zh: '镜头A — 钩子 — 10秒 — 9:16 — 24帧/秒 — 180度快门 — Seedance M1。\n\n场景：室内客厅，温暖的午后光线，青绿-琥珀色调，模拟胶片颗粒感。房间陈设真实、有生活感；背景来自参考板 @image2，保持柔和略微失焦。\n\n构图：全程10秒使用错位双人镜头。@image1（Mike）占据画面左三分之一，水平位置x=30%，略靠近摄影机，腰部至头部可见。@image3（Wyatt，戴眼镜）占据右三分之一，x=72%，略深入画面，同样腰部至头部可见。两人始终不越过中心轴。\n\n角色锁定 — @image1 Mike：深色休闲服，下颌紧咬，拳头在臀部侧松握。整个镜头中面部和服装必须与 @image1 参考完全一致。@image3 Wyatt：戴眼镜，双臂紧抱胸前，重心后移。面部和服装必须与 @image3 参考完全一致。\n\n走位与动作：0-4秒 — @image1 从画面左下角入画，步伐沉稳有力，木地板脚步声清晰可辨；停在x=30%处，双脚踩实。手持摄影机略微向前漂移，缩小隐含距离。4-10秒 — 两人保持位置。@image1 从嘴唇间缓缓呼气。@image3 下颌抬高约2度。无人退后。眼神在画面中交锁。\n\n表演微节拍：@image1 入场时鼻孔张开（第1秒）。@image1 停步时 @image3 下颌上抬（第4秒）。@image1 缓慢呼气可见胸腔下沉（第6秒）。两人对视保持至第10秒。\n\n末帧：完整错位双人镜头。@image1 在左，双脚踩实，下颌紧绷。@image3 在右，双臂抱胸，下颌上扬。眼神交锁。身后房间柔和温暖。\n\n摄影机：35mm球面直线镜头。手持略微向前漂移。浅景深——两个角色在同一焦平面，背景 @image2 板渲染柔和。平坦画面，无暗角。24帧/秒，180度快门角。\n\n音频：入场时木地板脚步声。第6秒轻微呼气声。全程低沉室内音，远处街道嗡嗡声，房屋轻微咯吱声。无音乐。仅叙事性音频。\n\n色调：青绿-琥珀调。房间暖光。模拟胶片颗粒质感。',
      },
      render: {
        mode: 'M1',
        engine: 'Seedance',
      },
      notes: {
        todos: [
          'Load @image1 Mike reference',
          'Load @image2 living room plate',
          'Load @image3 Wyatt reference',
        ],
        warnings: [
          'Ensure @image1 and @image3 never cross the center axis in the frame',
          'Background plate @image2 must remain recognizable but kept soft — shallow DOF',
        ],
        approved: false,
      },
    },
    {
      id: 'B',
      title: 'Wyatt acusa — Mike absorbe el golpe',
      description:
        'Wyatt señala con el dedo y dispara palabras como cuchillos; Mike encaja el impacto sin retroceder, la mandíbula se aprieta más.',
      duration: 12,
      start: 10,
      end: 22,
      camera: {
        lens: '55mm, 75mm',
        framing: 'OTS Wyatt on Mike, cut to OTS Mike on Wyatt',
        movement: 'Handheld stable — barely breathing',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Cut 1 (10-16s): OTS — @image3 shoulder fills left edge x=15% soft, @image1 face dominates center x=50%, chest-up. Cut 2 (16-22s): OTS — @image1 shoulder fills right edge x=85% soft, @image3 face dominates center x=50%, chest-up. Eyelines angled across center; 180-degree line maintained.',
        subjectLock:
          '@image1 Mike: same dark clothes, jaw clenching visibly, no retreat. @image3 Wyatt: same glasses, same clothes, finger raised, eyes narrowed.',
        crossFrameRules:
          'OTS axis holds: in Cut 1 @image1 faces screen-right; in Cut 2 @image3 faces screen-left. The 180-degree line between them is never crossed.',
        focus:
          'Cut 1: sharp on @image1 face, @image3 shoulder soft. Cut 2: sharp on @image3 face, @image1 shoulder soft.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Living room - center, same @image2 plate',
        movement:
          'Cut 1 (10-16s): @image3 raises right index finger and drives it forward toward @image1 repeatedly with punctuating jabs — transitive verb: TO STAB. @image1 absorbs each verbal blow; jaw muscles flex, eyes hold steady, no step back. Cut 2 (16-22s): @image3 finishes the accusation; @image1 swallows hard, chin dips a fraction, then rises back.',
        interaction: 'Over-the-shoulder coverage; characters never face each other symmetrically.',
        positions: [
          {
            subjectId: '@image1',
            description: 'Cut 1: face center frame x=50%, OTS from @image3 shoulder on left',
          },
          {
            subjectId: '@image3',
            description: 'Cut 2: face center frame x=50%, OTS from @image1 shoulder on right',
          },
        ],
      },
      acting: {
        emotion: 'Cold demand vs cold fury',
        bodyLanguage:
          '@image3 (Wyatt): index finger stabs the air rhythmically with each accusatory phrase, chin pushed forward, lips thin and precise. @image1 (Mike): jaw muscles bulge, eyes unblinking, weight slightly forward — he does not retreat — absorbs each jab like a post taking a hammer.',
        dialogue: "'You always do this. Every single time.'",
        microExpressions: [
          'Wyatt: finger-jab punctuating each syllable',
          'Mike: visible jaw clench after each jab',
          'Mike: single slow blink as he swallows the accusation',
          'Wyatt: nostrils flare at end of speech',
        ],
      },
      timeline: {
        duration: 12,
        segments: [
          { start: 10, end: 16, label: 'Cut 1 - OTS Wyatt on Mike / accusation lands' },
          { start: 16, end: 22, label: 'Cut 2 - OTS Mike on Wyatt / Mike absorbs' },
        ],
        beats: [
          { start: 10, end: 13, description: '@image3 raises finger, first jab' },
          {
            start: 13,
            end: 16,
            description: '@image1 jaw clenches, holds eye contact, does not retreat',
          },
          { start: 16, end: 19, description: '@image3 finishes accusation, nostrils flare' },
          {
            start: 19,
            end: 22,
            description: '@image1 swallows, chin dips, rises back — contained fury',
          },
        ],
      },
      audio: {
        dialogue: "'You always do this. Every single time.'",
        ambient: 'Room tone, slight hum of the room',
        sfx: ['Cloth shift as arm rises', 'Subtle breath catch'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'cc36a4e5-2afa-473c-bdbc-e06d8ad79723', type: 'character' },
        { slot: '@image2', assetId: '50e9c5a0-4a63-46e9-a0d8-3d7ebf4760e1', type: 'plate' },
        { slot: '@image3', assetId: '01d03f57-5b6e-4445-a97e-3526069528bc', type: 'character' },
      ],
      prompt: {
        en: "SHOT B — Friction — 12 seconds — 9:16 — 24fps — 180-degree shutter — Seedance M1.\n\nSCENE: Interior living room, same location as Shot A. Background plate @image2 visible and soft behind both subjects. Warm teal-amber grade, analog film grain, flat field, no vignette.\n\nTHIS SHOT CONTAINS TWO INTERNAL CUTS.\n\nCUT 1 (seconds 0-6 of this shot, scene time 10-16s): Over-the-shoulder shot — @image3 (Wyatt, glasses) provides the background shoulder at LEFT EDGE x=15%, soft and out of focus. @image1 (Mike) fills CENTER FRAME at x=50%, chest-up, face sharp. @image3 raises his right index finger and drives it forward toward @image1 repeatedly in rhythmic pointed jabs — each jab coincides with a spoken phrase: 'You always do this. Every single time.' @image1 receives each verbal blow; his jaw muscles visibly clench after each jab; his eyes are unblinking and fixed on @image3; he does not retreat one centimeter. He absorbs like a post taking a hammer — transitive action: TO ABSORB. 55mm lens. Handheld barely breathing.\n\nCUT 2 (seconds 6-12 of this shot, scene time 16-22s): Over-the-shoulder shot — @image1 (Mike) provides the background shoulder at RIGHT EDGE x=85%, soft and out of focus. @image3 (Wyatt, glasses) fills CENTER FRAME at x=50%, chest-up, face sharp. @image3 finishes his accusation; nostrils flare. Then @image1 reacts: chin dips one fraction, a single slow blink, then chin rises back to level — fury contained under pressure. @image1 does not speak. 75mm lens. Handheld barely breathing.\n\nSUBJECT LOCK — @image1 Mike: same dark casual clothes as Shot A. Jaw visibly clenching. @image3 Wyatt: same clothes, glasses on face, finger raised in Cut 1.\n\n180-DEGREE RULE: In Cut 1 @image1 faces screen-right; in Cut 2 @image3 faces screen-left. The spatial axis between them is never broken.\n\nFOCUS: Cut 1 — sharp on @image1 face, @image3 shoulder soft. Cut 2 — sharp on @image3 face, @image1 shoulder soft. Shallow DOF throughout.\n\nLAST FRAME: OTS @image1 shoulder right, @image3 face center, jaw set, glasses slightly fogged from confrontation heat.\n\nAUDIO: Dialogue — 'You always do this. Every single time.' (from @image3). Cloth shift sound as arm raises. Subtle breath catch from @image1. Room tone throughout. No music.\n\nCOLOR: Teal-amber grade, warm practical light, analog film grain.",
        zh: "镜头B — 摩擦 — 12秒 — 9:16 — 24帧/秒 — 180度快门 — Seedance M1。\n\n场景：与镜头A相同的室内客厅。背景板 @image2 在两位角色身后可见且柔和。温暖的青绿-琥珀色调，模拟胶片颗粒感，平坦画面，无暗角。\n\n本镜头包含两个内部切换。\n\n切换1（本镜头第0-6秒，场景时间10-16秒）：过肩镜头——@image3（Wyatt，戴眼镜）的肩膀在画面左边缘x=15%提供背景，柔和失焦。@image1（Mike）占据画面中心x=50%，胸部以上，面部清晰。@image3 抬起右手食指，随着每个指控短语向 @image1 反复刺戳：'你总是这样。每一次都是。' @image1 承受每次言语打击；每次刺戳后下颌肌肉明显紧绷；眼神不眨一眨地盯住 @image3；一厘米都不退后。他像承受锤击的木柱一样吸收——及物动词：承受。55mm镜头。手持几乎不动。\n\n切换2（本镜头第6-12秒，场景时间16-22秒）：过肩镜头——@image1（Mike）的肩膀在画面右边缘x=85%提供背景，柔和失焦。@image3（Wyatt，戴眼镜）占据画面中心x=50%，胸部以上，面部清晰。@image3 完成指控，鼻孔张开。然后 @image1 做出反应：下颌微微下沉一分，一次缓慢的单眨，然后下颌恢复水平——在压力下被压制的愤怒。@image1 不说话。75mm镜头。手持几乎不动。\n\n角色锁定 — @image1 Mike：与镜头A相同的深色休闲服。下颌明显紧绷。@image3 Wyatt：相同服装，眼镜戴在脸上，切换1中食指抬起。\n\n180度规则：切换1中 @image1 面朝画面右侧；切换2中 @image3 面朝画面左侧。两人之间的空间轴线始终不被打破。\n\n焦点：切换1——@image1 面部清晰，@image3 肩膀柔和。切换2——@image3 面部清晰，@image1 肩膀柔和。全程浅景深。\n\n末帧：过肩，@image1 肩膀在右，@image3 面孔居中，下颌紧绷，眼镜略微因对峙热度蒙雾。\n\n音频：对白——'你总是这样。每一次都是。'（来自 @image3）。手臂抬起时衣物摩擦声。@image1 的轻微喘息声。全程室内音。无音乐。\n\n色调：青绿-琥珀调，温暖实际光源，模拟胶片颗粒感。",
      },
      render: {
        mode: 'M1',
        engine: 'Seedance',
      },
      notes: {
        todos: [
          'Confirm 180-degree axis is maintained across Cut 1 and Cut 2',
          'Verify @image3 finger-jab reads clearly on 9:16 frame',
        ],
        warnings: [
          'Do not let @image1 step back even one frame — he must hold ground physically at all times',
          'OTS shoulder must remain soft — do not accidentally bring it into focus',
        ],
        approved: false,
      },
    },
    {
      id: 'C',
      title: 'Mike explota — el quiebre',
      description:
        'Mike da un paso al frente y lanza su verdad al aire; su cuerpo es un muelle soltado — Wyatt retrocede un paso involuntario.',
      duration: 11,
      start: 22,
      end: 33,
      camera: {
        lens: '40mm to 50mm',
        framing: 'Single Mike chest-up, push-in slow, then cut to single Wyatt chest-up',
        movement: 'Push-in lento continuo on @image1, cut to near-static on @image3',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          'Cut 1 (22-29s): Single @image1 (Mike) chest-up, centered x=50%. Camera pushes in slowly from 40mm to 50mm equivalent. Cut 2 (29-33s): Single @image3 (Wyatt) chest-up, centered x=50%. Near-static. Both in separate singles — no two-shot in this segment.',
        subjectLock:
          '@image1 Mike: same dark clothes, face contorted with released fury, chin driving forward, hand cutting the air. @image3 Wyatt: glasses, face absorbs impact, involuntary step back visible.',
        crossFrameRules:
          'Singles only — no shared frame. Eyelines connect across the cut (screen-left to screen-right convention maintained).',
        focus: 'Both singles: face in sharp focus, background @image2 soft.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Living room - center, @image2 plate behind',
        movement:
          'Cut 1 (22-29s): @image1 steps forward one full stride, chin drives forward and up, right hand cuts the air palm-down — transitive verb: TO CUT. He speaks fast and hard. Camera pushes in slowly to match his advance. Cut 2 (29-33s): @image3 takes one involuntary half-step backward — his body speaks before his mind; glasses shift slightly; mouth opens a fraction then closes.',
        interaction:
          'Singles — cutting between the two men during the peak exchange. Eyelines connect across cuts.',
        positions: [
          {
            subjectId: '@image1',
            description: 'Cut 1: center frame x=50%, stepping forward, dominant',
          },
          {
            subjectId: '@image3',
            description: 'Cut 2: center frame x=50%, absorbing, half-step back',
          },
        ],
      },
      acting: {
        emotion: 'Rage detonated',
        bodyLanguage:
          '@image1 (Mike): chin juts forward, right hand slashes the air palm-down with each clause, voice projects from chest, veins in neck visible, body fully forward. @image3 (Wyatt): one involuntary half-step back, mouth opens slightly then closes, glasses shift on nose bridge, jaw works silently.',
        dialogue: "'You want the truth? Fine. Here it is.'",
        microExpressions: [
          'Mike: hand slashing the air palm-down',
          'Mike: veins visible in neck',
          'Wyatt: involuntary half-step backward',
          'Wyatt: glasses shift on nose bridge',
          'Wyatt: mouth opens then closes without sound',
        ],
      },
      timeline: {
        duration: 11,
        segments: [
          { start: 22, end: 29, label: 'Cut 1 - Single Mike / detonation' },
          { start: 29, end: 33, label: 'Cut 2 - Single Wyatt / absorbs the blast' },
        ],
        beats: [
          { start: 22, end: 24, description: '@image1 steps forward, chin drives up' },
          { start: 24, end: 29, description: '@image1 hand cuts air, delivers the truth' },
          { start: 29, end: 31, description: '@image3 involuntary half-step back' },
          { start: 31, end: 33, description: '@image3 mouth works silently, glasses shift' },
        ],
      },
      audio: {
        dialogue: "'You want the truth? Fine. Here it is.'",
        ambient: 'Room tone drops slightly — the world holds its breath',
        sfx: ['Foot plant on hardwood — one heavy step', 'Cloth snap as hand cuts air'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'cc36a4e5-2afa-473c-bdbc-e06d8ad79723', type: 'character' },
        { slot: '@image2', assetId: '50e9c5a0-4a63-46e9-a0d8-3d7ebf4760e1', type: 'plate' },
        { slot: '@image3', assetId: '01d03f57-5b6e-4445-a97e-3526069528bc', type: 'character' },
      ],
      prompt: {
        en: "SHOT C — Spike — 11 seconds — 9:16 — 24fps — 180-degree shutter — Seedance M1.\n\nSCENE: Interior living room, same space as previous shots. Background plate @image2 behind both subjects, rendered soft. Warm teal-amber color grade, analog film grain, flat field, no vignette.\n\nTHIS SHOT CONTAINS TWO INTERNAL CUTS.\n\nCUT 1 (seconds 0-7 of this shot, scene time 22-29s): Single on @image1 (Mike). Chest-up, centered in frame at x=50%. @image1 takes one full deliberate stride forward — his foot plants hard on the hardwood floor, audible impact. His chin drives forward and upward. His right hand rises and slashes the air palm-down in a cutting motion on each clause — transitive verb: TO CUT. He speaks fast and from the chest: 'You want the truth? Fine. Here it is.' Veins are visible in his neck. His body is fully committed forward, not a single muscle held back. Camera executes a slow continuous push-in from 40mm to 50mm equivalent focal length as he advances. Face sharp, background @image2 soft. Shallow DOF.\n\nCUT 2 (seconds 7-11 of this shot, scene time 29-33s): Single on @image3 (Wyatt, glasses). Chest-up, centered at x=50%. @image3 takes one involuntary half-step backward — his body moves before his mind gives permission. His glasses shift slightly on his nose bridge. His mouth opens a fraction — and then closes without producing a single word. His jaw works silently. He has absorbed the blast. Near-static camera, barely breathing. Face sharp, background soft. Shallow DOF.\n\nSUBJECT LOCK — @image1 Mike: same dark casual clothes, face contorted with released fury. @image3 Wyatt: same clothes, glasses on face, glasses shift moment must read clearly on 9:16 frame.\n\nEYELINE CONTINUITY: In Cut 1 @image1 looks screen-left (toward where @image3 would be). In Cut 2 @image3 looks screen-right (toward where @image1 would be). The spatial relationship is maintained across the cut.\n\nLAST FRAME: @image3 face center, mouth closed, jaw working, glasses slightly shifted, the half-step backward frozen in the aftermath.\n\nAUDIO: Dialogue 'You want the truth? Fine. Here it is.' delivered by @image1 in Cut 1. One heavy foot plant on hardwood at scene second 22. Cloth snap as hand cuts air. Room tone drops very slightly in Cut 2 — a held breath. No music. Diegetic only.\n\nCOLOR: Teal-amber grade, analog film grain.",
        zh: "镜头C — 高峰 — 11秒 — 9:16 — 24帧/秒 — 180度快门 — Seedance M1。\n\n场景：与前几个镜头相同的室内客厅。背景板 @image2 在两位角色身后，渲染柔和。温暖的青绿-琥珀色调，模拟胶片颗粒感，平坦画面，无暗角。\n\n本镜头包含两个内部切换。\n\n切换1（本镜头第0-7秒，场景时间22-29秒）：@image1（Mike）单人镜头。胸部以上，画面中心x=50%。@image1 向前迈出一步——脚掌重重踩在木地板上，可听见冲击声。下颌向前向上推进。右手上扬，在每个子句上手掌向下劈砍空气——及物动词：切割。他急速从胸腔发声：'你想要真相？好。听着。' 颈部青筋可见。整个身体毫无保留地向前压。摄影机随着他的推进，以40mm到50mm等效焦距执行缓慢连续推镜。面部清晰，背景 @image2 柔和。浅景深。\n\n切换2（本镜头第7-11秒，场景时间29-33秒）：@image3（Wyatt，戴眼镜）单人镜头。胸部以上，画面中心x=50%。@image3 不由自主地向后退了半步——身体先于意识做出反应。眼镜在鼻梁上略微移位。嘴巴张开一分——然后无声合上，一个字也没说出来。下颌无声地动着。他承受了这次爆炸。摄影机几乎静止不动，几乎不呼吸。面部清晰，背景柔和。浅景深。\n\n角色锁定 — @image1 Mike：相同的深色休闲服，面部因释放的愤怒而扭曲。@image3 Wyatt：相同服装，眼镜戴在脸上，眼镜移位的瞬间必须在9:16画面中清晰可见。\n\n视线连续性：切换1中 @image1 看向画面左侧（朝向 @image3 所在方向）。切换2中 @image3 看向画面右侧（朝向 @image1 所在方向）。两次切换之间空间关系保持不变。\n\n末帧：@image3 面孔居中，嘴巴合拢，下颌无声运动，眼镜略微移位，向后半步的动作定格在事后。\n\n音频：切换1中 @image1 说出对白'你想要真相？好。听着。'。场景第22秒一次沉重的脚踩木地板声。手劈空气时的衣物破风声。切换2中室内音略微降低——憋住的呼吸。无音乐。仅叙事性音频。\n\n色调：青绿-琥珀调，模拟胶片颗粒感。",
      },
      render: {
        mode: 'M1',
        engine: 'Seedance',
      },
      notes: {
        todos: [
          'Confirm push-in on Cut 1 is slow and controlled — not aggressive zoom',
          'Verify glasses-shift micro-beat reads on @image3 in Cut 2',
        ],
        warnings: [
          '@image1 must advance — if he stays static the beat is lost',
          '@image3 half-step back must be involuntary-looking, not theatrical — keep it small',
        ],
        approved: false,
      },
    },
    {
      id: 'D',
      title: 'El silencio entre los dos — button',
      description:
        'Los dos hombres se miran desde su distancia; Wyatt se gira levemente, no huye pero tampoco puede sostenerse; Mike se queda quieto como piedra.',
      duration: 7,
      start: 33,
      end: 40,
      camera: {
        lens: '85mm',
        framing: 'Wide staggered two-shot, pulling back slowly',
        movement: 'Near-static with imperceptible pull-back',
        fps: 24,
        shutter: '180 degree',
        aspectRatio: '9:16',
      },
      composition: {
        frameMap:
          '33-40s: Staggered two-shot. @image1 (Mike) left third x=28%, @image3 (Wyatt) right third x=74%. Both chest-up fading to waist-up as camera imperceptibly pulls back. @image2 background plate visible and slightly more revealed as pull-back opens frame.',
        subjectLock:
          '@image1 Mike: same dark clothes, face returned to stone, arms at sides. @image3 Wyatt: same clothes, glasses, turned 10 degrees away from @image1 — not a full turn, just a deflection.',
        crossFrameRules:
          '@image1 left, @image3 right. Never cross center. The space between them is the subject of this shot.',
        focus: 'Both subjects in plane — equally sharp. Background @image2 soft.',
        depth: 'Shallow DOF',
      },
      blocking: {
        location: 'Living room - center, @image2 plate behind',
        movement:
          '33-37s: Both men hold position. @image3 slowly turns his torso 10 degrees away from @image1 — not a retreat, a deflection — transitive verb: TO DEFLECT. @image1 does not move a muscle. 37-40s: @image3 drops his gaze to the floor for one beat, then raises it to the middle distance — not to @image1. @image1 watches him with the stillness of someone who has said everything.',
        interaction:
          'Two-shot: the empty space between them carries the drama. Neither man leaves the frame.',
        positions: [
          {
            subjectId: '@image1',
            description: 'Left third x=28%, stone still, arms at sides, watching @image3',
          },
          {
            subjectId: '@image3',
            description:
              'Right third x=74%, torso 10 degrees deflected away, gaze drops then rises to middle distance',
          },
        ],
      },
      acting: {
        emotion: 'Empty — aftermath; the silence that holds everything',
        bodyLanguage:
          '@image1 (Mike): arms fall to sides, face returns to stone mask, breath barely visible, eyes track @image3 without blinking. @image3 (Wyatt): torso rotates 10 degrees away — small, involuntary — glasses catch the light as his head drops, then his gaze rises to middle distance, refusing to find @image1 again.',
        dialogue: '',
        microExpressions: [
          'Mike: single blink after Wyatt deflects',
          'Wyatt: gaze drops to floor then rises to middle distance',
          'Wyatt: glasses catch warm light on the turn',
          'The space between them widens as camera pulls back',
        ],
      },
      timeline: {
        duration: 7,
        segments: [
          { start: 33, end: 37, label: 'Wyatt deflects — Mike holds' },
          { start: 37, end: 40, label: 'The aftermath silence — neither man moves' },
        ],
        beats: [
          { start: 33, end: 35, description: 'Both men in charged stillness' },
          { start: 35, end: 37, description: '@image3 torso deflects 10 degrees away' },
          { start: 37, end: 39, description: '@image3 gaze drops to floor' },
          {
            start: 39,
            end: 40,
            description: '@image3 gaze rises to middle distance; @image1 watches; camera settles',
          },
        ],
      },
      audio: {
        dialogue: '',
        ambient: 'Near-silence — low room tone, single house creak, distant street',
        sfx: ['Single house creak', 'Very faint ambient breath from both men'],
        music: false,
      },
      references: [
        { slot: '@image1', assetId: 'cc36a4e5-2afa-473c-bdbc-e06d8ad79723', type: 'character' },
        { slot: '@image2', assetId: '50e9c5a0-4a63-46e9-a0d8-3d7ebf4760e1', type: 'plate' },
        { slot: '@image3', assetId: '01d03f57-5b6e-4445-a97e-3526069528bc', type: 'character' },
      ],
      prompt: {
        en: 'SHOT D — Button — 7 seconds — 9:16 — 24fps — 180-degree shutter — Seedance M1.\n\nSCENE: Interior living room, same space throughout this scene. Background plate @image2 behind both subjects, slightly more revealed as the camera imperceptibly pulls back during the shot. Warm teal-amber color grade. Analog film grain. Flat field, no vignette.\n\nFRAME MAP: Staggered two-shot for the full 7 seconds. @image1 (Mike) occupies the LEFT THIRD at horizontal position x=28%, starting chest-up and opening to waist-up by the end as the camera pulls back. @image3 (Wyatt, glasses) occupies the RIGHT THIRD at x=74%, same framing. Neither man crosses the center axis. The empty space between them is the visual and dramatic subject of this shot.\n\nSUBJECT LOCK — @image1 Mike: same dark casual clothes as all previous shots. Arms fall to sides. Face returned to stone mask — neutral, contained, final. @image3 Wyatt: same clothes, glasses on face catching warm light on the turn. Torso rotates 10 degrees away from @image1 during the shot.\n\nBLOCKING AND MOVEMENT: Seconds 33-37 (shot-internal 0-4s) — Both men hold position in charged silence. Then @image3 slowly rotates his torso 10 degrees away from @image1 — this is a deflection, not a retreat; his feet do not move; it is the smallest possible turn, barely perceptible but unmistakable — transitive verb: TO DEFLECT. @image1 does not move a single muscle. His eyes track @image3 without blinking. Seconds 37-40 (shot-internal 4-7s) — @image3 drops his gaze to the floor for one beat; his glasses catch the warm ambient light. Then his gaze rises to the middle distance — not to @image1, not to any specific point. He is nowhere. @image1 watches him with the stillness of someone who has said everything and has nothing left to add. Camera executes an imperceptible, near-static pull-back — almost breathing rather than moving — opening the frame slightly to reveal more of the space between them.\n\nFOCUS: Both subjects equally sharp in the same focal plane. Background @image2 remains soft throughout. Shallow DOF.\n\nLAST FRAME: Staggered two-shot. @image1 stone-still on left, arms at sides, eyes forward. @image3 on right, 10 degrees deflected, gaze in middle distance. The room behind them — @image2 soft and warm — fills the frame between and behind them. The shot ends here.\n\nAUDIO: No dialogue. Near-silence — very low room tone. A single house creak somewhere in the structure. Very faint ambient breath from both men. Distant street sound. No music. Diegetic only.\n\nCOLOR: Teal-amber grade. Warm practical room light. Analog film grain. The silence should feel visible.',
        zh: '镜头D — 尾声按钮 — 7秒 — 9:16 — 24帧/秒 — 180度快门 — Seedance M1。\n\n场景：整个场景中相同的室内客厅。背景板 @image2 在两位角色身后，随着摄影机在镜头中轻微向后拉，背景略微更多地展现出来。温暖的青绿-琥珀色调。模拟胶片颗粒感。平坦画面，无暗角。\n\n构图：全程7秒使用错位双人镜头。@image1（Mike）占据画面左三分之一，水平位置x=28%，从胸部以上开始，随着摄影机后拉至镜头结束时变为腰部以上。@image3（Wyatt，戴眼镜）占据右三分之一x=74%，相同取景。两人均不越过中心轴。两人之间的空旷空间是本镜头的视觉和戏剧主题。\n\n角色锁定 — @image1 Mike：与所有前序镜头相同的深色休闲服。双臂垂落两侧。面部回归石头面具——中性、克制、最终的。@image3 Wyatt：相同服装，眼镜戴在脸上，在转身时接收到暖光反射。镜头拍摄期间躯干向远离 @image1 方向旋转10度。\n\n走位与动作：场景时间33-37秒（镜头内部0-4秒）——两人在充满张力的沉默中保持位置。然后 @image3 缓慢将躯干向远离 @image1 方向旋转10度——这是偏转，不是逃跑；双脚不移动；这是尽可能微小的转动，几乎难以察觉但无误——及物动词：偏转。@image1 一块肌肉都不动。眼睛一眨不眨地追踪着 @image3。场景时间37-40秒（镜头内部4-7秒）——@image3 将目光落到地板上停顿一拍；眼镜接受暖光环境光。然后他的目光升至中间距离——不是看向 @image1，不是任何具体的点。他在虚无之处。@image1 用一个已经说完一切、无话可说的人的静止注视着他。摄影机执行几乎无法察觉的、近乎静止的后拉——与其说是移动，不如说是呼吸——略微打开画面，揭示两人之间更多的空间。\n\n焦点：两位角色在同一焦平面上同等清晰。背景 @image2 全程保持柔和。浅景深。\n\n末帧：错位双人镜头。@image1 在左如石静立，双臂垂侧，目视前方。@image3 在右，偏转10度，目光在中间距离。两人背后的房间——@image2 柔和温暖——在他们之间和身后填满画面。镜头在此结束。\n\n音频：无对白。近乎寂静——极低的室内音。房屋结构某处传来一声咯吱声。两人极其微弱的环境呼吸声。远处街道声音。无音乐。仅叙事性音频。\n\n色调：青绿-琥珀调。温暖的实际室内光源。模拟胶片颗粒感。寂静应该是可见的。',
      },
      render: {
        mode: 'M1',
        engine: 'Seedance',
      },
      notes: {
        todos: [
          'Confirm pull-back is imperceptible — if visible as a deliberate move, adjust to near-static',
          'Verify @image3 10-degree deflection reads as involuntary, not theatrical',
        ],
        warnings: [
          'Do NOT let @image3 fully turn away — 10 degrees maximum; feet must not move',
          '@image1 must remain completely still — any fidget breaks the button',
          'The space between the two men is the hero of this shot — do not crop it out',
        ],
        approved: false,
      },
    },
  ],
};
