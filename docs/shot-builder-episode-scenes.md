# Shot Builder — Episode → Scenes → Shots

## Arquitectura

El Shot Builder ahora retorna una estructura jerárquica de 3 niveles:

```
Episode
 └── Scenes[]  (cada una con su scriptNumber, locación, continuity)
      └── Shots[]  (cada uno con camera, blocking, acting, prompt, etc.)
```

---

## 🔄 Flujo completo de generación

### 1. Usuario sube archivos + prompt

- Sube PDF(s) con el script del episodio (formato `56. INT. LOCATION — DAY`)
- Sube imágenes de referencia (personajes, location plates)
- Escribe prompt opcional + estimación de duración total
- Habilita/deshabilita generación de chino

### 2. Backend: ClaudeGenerateShots

El nuevo `defaultShotBuilderPrompt` (DCS-DIRECTION) parsea el script y retorna:

```jsonc
{
  "episode": {
    "title": "EPISODE 16: EXPERTISE",
    "totalDuration": 120,
    "assetAssignments": [
      { "slot": "[Image1]", "assetId": "wyatt", "type": "character" },
      { "slot": "[Image4]", "assetId": "kitchen-plate", "type": "environment" }
    ]
  },
  "aspectRatio": "9:16",
  "mode": "M1",
  "directorNotes": { "goal": "...", "styleGuide": "...", "warnings": [...] },
  "scenes": [
    {
      "scriptNumber": 56,
      "scriptLocation": "INT. WYATT'S KITCHEN — DAY",
      "title": "...",
      "description": "...",
      "duration": 25,
      "mode": "M1",
      "sceneType": "present",            // present | flashback | fantasy | ...
      "continuity": {                     // tracking de cambios vs escena anterior
        "location": "INT. WYATT'S KITCHEN — DAY",
        "locationChange": false,
        "timeContinuity": "DAY — same day",
        "charactersPresent": ["Wyatt", "Dixie"],
        "emotionalCarryover": "...",
        "physicalCarryover": "...",
        "wardrobeCarryover": "...",
        "notes": [...]
      },
      "references": [
        { "slot": "[Image1]", "assetId": "wyatt", "type": "character" },
        { "slot": "[Image4]", "assetId": "kitchen-plate", "type": "environment" }
      ],
      "shots": [
        {
          "id": "A",
          "title": "Wyatt paces frantically",
          "description": "...",
          "duration": 10, "start": 0, "end": 10,
          "camera": { "lens": "...", "framing": "...", "movement": "...", "fps": 24, "shutter": "180 degree", "aspectRatio": "9:16" },
          "composition": { "frameMap": "...", "subjectLock": "...", "crossFrameRules": "...", "focus": "...", "depth": "Shallow DOF" },
          "blocking": { "location": "...", "movement": "...", "interaction": "...", "positions": [...] },
          "acting": { "emotion": "...", "bodyLanguage": "...", "dialogue": "...", "microExpressions": [...] },
          "timeline": { "duration": 10, "segments": [...], "beats": [...] },
          "audio": { "dialogue": "...", "ambient": "...", "sfx": [...], "music": false },
          "prompt": { "en": "Scene & Mood: ...\n\nFrame Map: ...\n\n(11 bloques DCS-DIRECTION)", "zh": "..." },
          "render": { "mode": "M1", "engine": "Seedance" },
          "notes": { "todos": [...], "warnings": [...], "approved": false }
        }
      ]
    }
  ]
}
```

### 3. Frontend: Visualización

El shot list viewer debe mostrar:

- **Time budget** — duración total del episodio, barra de tiempo con segmentos por escena
- **Temperature / Intensity** — gráfica de intensidad dramática por escena
- **Camera plans / Framing** — resumen de tipos de plano por escena
- **Cuts** — número de cortes, tipo de transiciones
- **Total duration** — contador, validación contra lo estimado por el usuario

**Acordeón de escenas:**

```
▼ Scene 56 — INT. WYATT'S KITCHEN — DAY  (25s)  [present]
  │  Continuity: Cold open → Wyatt desperate → Dixie calm
  │  Refs: [Image1] wyatt, [Image2] dixie, [Image4] kitchen-plate
  │
  ├── Shot A: Wyatt paces frantically  (10s)   [Use] [Edit]
  │     Description: ...
  │     Camera: 40-55mm, Handheld
  │     Acting: Desperation — pacing, chopping gestures
  │     Dialogue: "If it were that simple..."
  │
  └── Shot B: Dixie's unnerving calm   (15s)   [Use] [Edit]
        Description: ...
        Camera: 75mm, Static
        Acting: Controlled calm — immobile, slow beer sip
        Dialogue: "(Wyatt o.s.)"

▼ Scene 57 — INT. CONVENIENCE STORE — NIGHT (FLASHBACK)  (18s)
  │  Continuity: ⚠️ LOCATION CHANGE → NIGHT → 2015
  │  Refs: [Image2] dixie(15), [Image3] destiny, [Image5] store-plate
  │
  └── Shot C: Dixie(15) waiting for the signal  (8s)  [Use] [Edit]
```

- **Convenciones** (Cross-Frame Rules, subject locks, warnings de continuidad)
- **Referencias** (qué assets aplican a cada escena)
- **Cada shot** mantiene su estructura actual (camera, composition, blocking, acting, timeline, audio, prompt, render, notes)

---

## 💾 Guardado: Escenas + Shots

### Paso 1: Preview y confirmación

Antes de guardar, mostrar al usuario:

```
📋 Se van a crear:
  • 4 escenas nuevas
    - Scene 56: INT. WYATT'S KITCHEN — DAY (2 shots)
    - Scene 57: INT. CONVENIENCE STORE — NIGHT (1 shot)
    - Scene 58: EXT. GAS STATION — PARKING LOT — NIGHT (2 shots)
    - Scene 59: INT. WYATT'S KITCHEN — DAY (2 shots)
  • 7 shots total

⚠️ Scene 59 comparte locación con Scene 56 — verify continuity.
¿Proceder con la creación? [Confirmar] [Cancelar]
```

### Paso 2: Validación de escenas existentes

Por cada `scriptNumber` en la respuesta:

```
GET /projects/:pid/scenes?script_number=56
  → Si existe → usar ese sceneId
  → Si no existe → POST /projects/:pid/scenes { script_number: 56, name: "INT. WYATT'S KITCHEN — DAY" }
```

### Paso 3: Asignación de assets a episodio

```
POST /episodes/:episodeId/assets
  Body: { slot: "[Image1]", assetId: "wyatt", type: "character" }
```

(O un bulk-assign si existe endpoint)

### Paso 4: Creación de shots

Por cada escena, crear sus shots:

```
POST /projects/:pid/scenes/:sceneId/shots { number, name, description, ... }
  → shotId devuelto
  → Asignar characters: POST .../shots/:shotId/resources/characters { character_id, slot }
```

### Paso 5: Emitir navegación

```
shotsSaved.emit({ projectId, chapterId, sceneId: firstSceneId, firstShotId, firstShotDescription })
```

El padre navega a la primera escena y carga el primer shot.

---

## 📋 Cambios necesarios en frontend

### A. ShotBuilderResult (shot-builder.service.ts)

```typescript
export interface EpisodeData {
  title?: string;
  totalDuration?: number;
  totalShots?: number;
  assetAssignments?: Array<{ slot: string; assetId: string; type: string }>;
}

export interface SceneContinuity {
  location: string;
  locationChange: boolean;
  timeContinuity: string;
  charactersPresent: string[];
  emotionalCarryover?: string;
  physicalCarryover?: string;
  wardrobeCarryover?: string;
  notes: string[];
}

export interface SceneData {
  scriptNumber: number;
  scriptLocation: string;
  title: string;
  description: string;
  duration: number;
  start: number;
  end: number;
  sceneType: 'present' | 'flashback' | 'fantasy' | string;
  mode: string;
  continuity: SceneContinuity;
  references: Reference[];
  shots: ShotBuilderShot[];
}

export interface ShotBuilderResult {
  episode?: EpisodeData;
  scenes: SceneData[];
  rawText: string;
}
```

### B. ShotBuilderPanelComponent

- Reemplazar `shots` signal por `scenes` signal
- Calcular `totalShots` como computed de scenes
- Acordeón en template: `@for (scene of scenes()) { ... @for (shot of scene.shots) { ... } }`
- Selector de escena en el breadcrumb
- Nuevo botón "Save Episodio" con diálogo de confirmación (N escenas, N shots)

### C. Nuevos endpoints requeridos

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `GET /projects/:pid/scenes?script_number=N` | GET | Validar si escena existe por número |
| `POST /projects/:pid/scenes` | POST | Crear escena si no existe |
| `POST /episodes/:eid/assets` | POST | Asignar assets a episodio |

(O reutilizar endpoints existentes de scenes)

---

## 🎨 Visualizador de Shot List

El componente `ShotSequenceViewerComponent` debe actualizarse para:

1. **Header del episodio** → título, duración total, modo, aspect ratio
2. **Time Budget Bar** → barra horizontal segmentada por escena con color por intensidad
3. **Acordeón de escenas** → expandible, cada una con:
   - Número + nombre de locación
   - Badge de sceneType (`flashback`, `present`)
   - Chip de continuity changes (🚩 location change, 👕 wardrobe, 💔 emotional)
   - Lista de references que aplican
   - Shot list expandible
4. **Cada shot** mantiene el layout actual (tabla con número, nombre, pre-prompt, Use button)

---

## 🧪 Mock data

```typescript
export const EPISODE_MOCK = {
  episode: {
    title: "EPISODE 16: EXPERTISE",
    totalDuration: 120,
    assetAssignments: [
      { slot: "[Image1]", assetId: "wyatt", type: "character" },
      { slot: "[Image2]", assetId: "dixie", type: "character" },
    ]
  },
  scenes: [
    {
      scriptNumber: 56,
      scriptLocation: "INT. WYATT'S KITCHEN — DAY",
      title: "Wyatt confronts Dixie",
      description: "...",
      duration: 25,
      sceneType: "present",
      continuity: {
        location: "INT. WYATT'S KITCHEN — DAY",
        locationChange: false,
        timeContinuity: "DAY",
        charactersPresent: ["Wyatt", "Dixie"],
        emotionalCarryover: "N/A — scene one",
        physicalCarryover: "N/A — scene one",
        wardrobeCarryover: "N/A — scene one",
        notes: ["Cold open del episodio"]
      },
      references: [
        { slot: "[Image1]", assetId: "wyatt", type: "character" }
      ],
      shots: [
        {
          number: 1, name: "Wyatt paces", description: "...",
          references: [{ slot: "[Image1]", assetId: "wyatt", type: "character" }]
        }
      ]
    }
  ]
};
```

---

## ✅ Checklist de implementación

- [x] Backend: `defaultShotBuilderPrompt` reemplazado con DCS-DIRECTION
- [x] Frontend: `ShotBuilderResult` → `{ episode, scenes[], rawText }`
- [x] Frontend: Acordeón de escenas en el panel
- [x] Frontend: Time budget bar + intensity visualization
- [x] Frontend: Confirmación "Se van a crear N escenas, M shots"
- [x] Frontend: Validar escenas existentes por `scriptNumber`
- [x] Frontend: Crear escenas faltantes antes de crear shots
- [x] Backend: Migración + tipos + store + service + handler + routes para chapter assignments
- [x] Frontend: Save button con flujo completo multi-scene
- [ ] Pruebas con script real (PDF de ejemplo — Episode 16)

---

*Documento actualizado: 2026-07-29. Implementación completada. Pendiente: pruebas con PDF real.*
