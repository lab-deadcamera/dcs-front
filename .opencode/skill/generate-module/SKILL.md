---
name: generate-module
description: Generate Angular modules following Aura POS architecture with lazy loading
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: angular
---

## What I do

- Generate Angular modules with lazy loading support
- Create feature components following Aura POS conventions
- Set up routing with proper path aliases
- Update app.routes.ts automatically

## When to use me

Use this when you need to create a new feature module in the Angular application.

## Parameters

- `moduleName` (string, required): Name of the module in kebab-case (e.g., 'inventory', 'sales')
- `features` (array of strings, required): List of feature names (e.g., ['products', 'categories'])

## Workflow

1. Validate `moduleName` is in kebab-case format
2. Validate `features` array has at least one item
3. Check if module already exists
4. Create directory structure and files
5. Add path alias to tsconfig.json
6. Update app.routes.ts with lazy loading

## Generated Structure

```
src/app/modules/{moduleName}/
├── {moduleName}-routing.module.ts
├── {feature}/
│   ├── ui/
│   │   ├── components/
│   │   └── index-{feature}/
│   │       ├── index-{feature}.ts
│   │       ├── index-{feature}.html
│   │       └── index-{feature}.css
│   ├── interfaces/
│   │   ├── {feature}.interface.ts
│   │   └── index.ts
│   └── services/
│       ├── {feature}-api.service.ts
│       ├── {feature}.service.ts
│       └── index.ts
```

## Naming Conventions

- Module file: `{module}-routing.module.ts`
- Routing class: `{Module}RoutingModule`
- Component class: `Index{Feature}` (no "Component" suffix)
- Component selector: `app-index-{feature}`
- Interface file: `{feature}.interface.ts`
- Service file: `{feature}.service.ts` (It has business logic)
- API service file: `{feature}-api.service.ts` (It has HTTP request logic)
- Path alias: `@module-{module}/*`

## Validation

After generating:
1. Run `npm run build` to verify compilation
2. Verify routing works by navigating to `/{moduleName}`
