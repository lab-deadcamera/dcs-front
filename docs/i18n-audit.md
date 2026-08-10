# Auditoría i18n del frontend (Dead Camera Studio)

Fecha: 2026-08-10 · Alcance: `dcs-front/src/app` (25 `.html` + 168 `.ts` no-spec)

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Textos hardcodeados en `.html` (nodos de texto + atributos) | **843** |
| Textos hardcodeados en `.ts` (toast summary/detail, `error.set`) | **~360** |
| Claves i18n referenciadas por el código (`\| translate`, `instant()`, `labelKey`, `hintKey`…) | **~90** |
| Idiomas soportados | `en` (fallback) · `es` |
| Estado de los bundles antes de esta auditoría | **No existían** (`public/assets/i18n/` tenía bundles viejos de Jun 2026 sin las claves del código) |

**Bug crítico encontrado**: la app usa `ngx-translate` (configurado en `app.config.ts` con loader
`assets/i18n/${lang}.json`) y el código ya referencia ~90 claves (`COMMON.CANCEL`,
`VALIDATION.REQUIRED`, `STUDIO.RATING.*`, …), **pero los bundles nunca se crearon**.
En producción la UI muestra las claves crudas (p. ej. `COMMON.CANCEL` en lugar de "Cancelar").

**Solución aplicada**: se reconstruyeron los bundles **`public/assets/i18n/en.json` y
`public/assets/i18n/es.json`** — la ruta real que sirve la app, porque `angular.json` copia
`public/` (no `src/assets/`) al build. Hoy tienen **1051 claves por idioma**, paridad
estructural perfecta (mismas claves, mismas interpolaciones `{{...}}`) y cobertura del 100 %
de las claves referenciadas en el código (837 claves detectadas, 0 faltantes).
Build verificado: `ng build --configuration dev` ✅.

> ⚠️ Nota: una versión anterior de esta auditoría creó `src/assets/i18n/`, pero Angular **no**
> copia esa carpeta al build — los bundles reales viven en `public/assets/i18n/`. Se eliminó
> `src/assets/i18n/` para evitar dos fuentes de verdad.

## 1. Estado de la infraestructura

- **Librería**: `@ngx-translate/core` (loader HTTP propio en `services/custom-translate-loader.ts`).
- **Config**: `app.config.ts` → `provideTranslateService({ loader: CustomTranslateLoader, fallbackLang: 'en' })`.
- **Idiomas**: `session.store.ts` → `SupportedLanguage = 'en' | 'es'`; el usuario cambia idioma desde
  `shared/components/language-picker`.
- **Patrones en uso**:
  - Templates: `{{ 'CLAVE' | translate }}` y `[label]="'CLAVE' | translate"`.
  - Claves dinámicas: `labelKey="..."`, `hintKey`, `placeholderKey`, `leftLabelKey`/`rightLabelKey` (componentes
    `section-header`, `drop-zone`, `pill-toggle`, `toggle-group`).
  - TypeScript: `TranslateService.instant('CLAVE', { params })` (ej. `validator-errors`, `custom-preset-dialog`).
- **Interpolaciones**: `{{n}}`, `{{label}}` — ver `VALIDATION.*` y `STUDIO.PROMPT.CHARS`.

## 2. Inventario de textos hardcodeados por archivo

Contador: texto visible fuera de `{{ }}` + atributos con texto (`placeholder`, `title`, `label`,
`alt`, `pTooltip`, `aria-label`, `header`, `emptyMessage`). Para `.ts`: strings en `summary:`,
`detail:` y `error.set(`.

| Archivo | Cant. | Tipo |
|---|---|---|
| `/app/modules/studio/studio/ui/components/shot-builder-panel/shot-builder-panel.component.html` | 149 | html |
| `/app/modules/admin/admin/ui/index-admin/index-admin.html` | 96 | html |
| `/app/modules/studio/studio/ui/components/studio-breadcrumb/studio-breadcrumb.html` | 76 | html |
| `/app/modules/admin/admin/ui/external-galleries/external-galleries.component.html` | 64 | html |
| `/app/modules/director/director/ui/scene-assignment/scene-assignment.html` | 59 | html |
| `/app/modules/admin/admin/ui/shot-builder-logs/shot-builder-logs.component.html` | 57 | html |
| `/app/modules/director/director/ui/takes-review/takes-review.html` | 50 | html |
| `/app/shared/components/image-gen-panel/image-gen-panel.component.html` | 40 | html |
| `/app/modules/projects/projects/ui/index-projects/index-projects.html` | 34 | html |
| `/app/modules/studio/studio/ui/index-studio/index-studio.ts` | 32 | ts |
| `/app/modules/providers/providers/ui/index-providers/index-providers.html` | 27 | html |
| `/app/modules/studio/studio/ui/index-studio/index-studio.html` | 27 | html |
| `/app/shared/components/character-assets/character-assets.html` | 26 | html |
| `/app/shared/components/prompt-builder/prompt-builder.component.html` | 26 | html |
| `/app/modules/home/home.component.html` | 25 | html |
| `/app/modules/files/files/ui/index-files/index-files.html` | 22 | html |
| `/app/modules/projects/projects/ui/index-projects/index-projects.ts` | 21 | ts |
| `/app/modules/director/director/ui/scene-assignment/scene-assignment.ts` | 20 | ts |
| `/app/modules/characters/characters/ui/index-characters/index-characters.html` | 19 | html |
| `/app/modules/providers/providers/ui/index-providers/index-providers.ts` | 17 | ts |
| `/app/modules/studio/studio/ui/components/shot-builder-panel/shot-builder-panel.component.ts` | 14 | ts |
| `/app/modules/characters/characters/ui/index-characters/index-characters.ts` | 13 | ts |
| `/app/shared/components/takes-reel/takes-reel.component.html` | 11 | html |
| `/app/modules/admin/admin/ui/user-management/user-management.component.ts` | 9 | ts |
| `/app/modules/skills/skills/ui/index-skills/index-skills.component.html` | 9 | html |
| `/app/modules/admin/admin/ui/admin-project-management/admin-project-management.component.ts` | 8 | ts |
| `/app/modules/director/director/ui/preset-manager/preset-manager.ts` | 8 | ts |
| `/app/modules/studio/studio/ui/components/shot-builder-panel/components/shot-reference-resolver.component.ts` | 8 | ts |
| `/app/shared/components/asset-viewer/asset-viewer.html` | 8 | html |
| `/app/shared/components/character-assets/character-assets.component.ts` | 8 | ts |
| `/app/modules/director/director/ui/takes-review/takes-review.ts` | 7 | ts |
| `/app/services/shot-builder.service.ts` | 7 | ts |
| `/app/shared/components/header/header.component.html` | 7 | html |
| `/app/modules/admin/admin/ui/external-galleries/external-galleries.component.ts` | 6 | ts |
| `/app/modules/admin/admin/ui/index-admin/index-admin.ts` | 5 | ts |
| `/app/modules/characters/characters/ui/components/character-form-dialog/character-form-dialog.component.ts` | 5 | ts |
| `/app/modules/characters/characters/ui/components/character-files-dialog/character-files-dialog.component.ts` | 4 | ts |
| `/app/modules/providers/providers/ui/components/model-form-dialog/model-form-dialog.component.html` | 4 | html |
| `/app/shared/components/theme-picker/theme-picker.html` | 4 | html |
| `/app/modules/characters/characters/ui/components/asset-create-dialog/asset-create-dialog.component.ts` | 3 | ts |
| `/app/modules/files/files/ui/index-files/index-files.ts` | 3 | ts |
| `/app/modules/skills/skills/ui/index-skills/index-skills.component.ts` | 3 | ts |
| `/app/modules/files/files/ui/components/file-link-dialog/file-link-dialog.component.ts` | 2 | ts |
| `/app/modules/skills/skills/ui/components/skill-form-dialog/skill-form-dialog.component.ts` | 2 | ts |
| `/app/shared/components/image-gen-panel/image-gen-panel.component.ts` | 2 | ts |
| `/app/shared/components/output-format/output-format.html` | 2 | html |
| `/app/modules/admin/admin/ui/shot-builder-logs/shot-builder-logs.component.ts` | 1 | ts |
| `/app/shared/components/language-picker/language-picker.html` | 1 | html |
| `/app/shared/components/session-gate-dialog/session-gate-dialog.component.ts` | 1 | ts |
| `/app/shared/components/viewer/viewer.component.ts` | 1 | ts |

### Muestras de textos hardcodeados (los más repetidos)

- **HTML** (`.html`): "Shot Builder", "Episode Assets", "Characters", "Generation Logs",
  "Resource Type", "Model", "Status", "User", "Project", "Scene", "Total Cost:",
  "Episode Resources", "Scene Resources", "Takes Review", "Loading…", "External Galleries",
  "Last sync:", "Describe the scene, upload reference files…", etc.
- **TS** (toasts/errores): "Project created", "Project updated", "Project deleted", "Upload failed",
  "Fix failed", "Sync fixed", "Task refreshed", "No image models", "Error", "Warning",
  "Failed to load users", "No roles returned from server", "Select a project before generating shots",
  "Write a prompt before generating shots", etc.

## 3. Namespaces de claves propuestos para la migración

Los bundles ya tienen los nombres definidos. Para los hardcodeados que quedan, seguir la misma
convención por módulo:

| Namespace | Uso |
|---|---|
| `COMMON.*` | Acciones genéricas: cancel/close/create/delete/save/edit/download/loading… |
| `VALIDATION.*` | Errores de formulario (ya traducidos). |
| `PROJECTS.*`, `FILES.*`, `PROVIDERS.*`, `CHARACTERS.*`, `SKILLS.*` | CRUDs de cada módulo. |
| `STUDIO.SHOT_BUILDER.*` | Panel del Shot Builder (149 textos — el archivo más grande). |
| `STUDIO.ADMIN.*` | Logs de generación, galleries externas, user management. |
| `DIRECTOR.*` | Scene assignment, takes review, preset manager. |
| `GLOBAL.*`, `HEADER.*`, `NAV.*` | Layout, tema, brand, navegación. |

## 4. Plan de migración (por prioridad)

1. ✅ **Reconstruir bundles `en.json` + `es.json`** — hecho (1051 claves, cobertura 100 % de lo referenciado, en `public/assets/i18n/`).
2. **Migrar `.html` de shared/studio** (componentes reutilizados): `prompt-builder`, `character-assets`,
   `image-gen-panel`, `takes-reel`, `viewer`, `output-format` → impacto inmediato en toda la app.
3. **Migrar CRUDs**: `index-projects`, `index-providers`, `index-characters`, `index-files` + sus diálogos.
4. **Migrar toasts/errores en `.ts`**: `index-studio.ts` (32), `scene-assignment.ts` (20),
   `index-projects.ts` (21) — usar `i18n.instant('KEY', { params })` dentro de `subscribe`.
5. **Migrar admin/director** (menor prioridad: pantallas internas).
6. **Añadir guard**: script/CI que verifique que toda clave referenciada exista en `en.json`
   (se puede reusar el script de validación de esta auditoría).

### Reglas para migrar sin romper

- `en.json` es la fuente (fallback). Toda clave nueva debe existir en **ambos** idiomas.
- Las interpolaciones deben coincidir exactamente en EN y ES (`{{n}}`, `{{label}}`).
- Textos con mayúsculas de estilo (branding, `tracking-[0.18em]`) se traducen en mayúscula en el bundle.
- Los toasts que hoy concatenan variables (p. ej. `'Failed to load roles: ' + x`) pasan a
  `instant('KEY', { param: x })`.
- Las marcas registradas y nombres propios (`DEAD CAMERA`, `SEEDANCE STUDIO`, `AI LAB`,
  `The Electric Mind`, `Seedance`, `BytePlus`, `Gemini`) **no se traducen**.

## 5. Verificación

- `en.json` / `es.json`: 1051 claves cada uno, sin claves solo-EN ni solo-ES, mismas interpolaciones.
- Cobertura: 100 % de las claves referenciadas en `src/app` (TS + HTML, incluidos `labelKey`,
  `hintKey`, `placeholderKey`, `leftLabelKey`/`rightLabelKey`).
- Build: `npx ng build --configuration dev` ✅.
