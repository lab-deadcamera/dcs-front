---
name: generate-service
description: Generate Angular feature services with HTTP requests following Aura POS modular architecture
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: angular
  layer: module-feature
---

# 🛠 generate-service Skill

## What I do

I generate Angular feature services responsible for HTTP API communication inside a specific module.

This skill creates a clean separation between:

- API Layer → Handles HTTP requests
- Business Layer → Handles business logic
- Barrel Export → Exposes feature services

I DO NOT generate global services inside `@services/`.

All generated files must follow the Aura POS modular structure.

---

## When to use me

Use this skill when:

- You need to create a new feature service inside a module
- The feature requires HTTP communication with backend APIs
- You want to maintain API / Business logic separation
- The service belongs to a module, NOT global scope

Do NOT use me for:

- Global shared services
- Utility services
- Non-HTTP services

---

## Parameters

Required parameters:

- moduleName → Name of the module
- feature → Name of the feature
- endpoint → API endpoint path
- methods → List of HTTP methods to generate (including 'page' for paginated tables)
- requestInterfaces → Interfaces used for request
- responseInterfaces → Interfaces used for response

Example:

```json
{
  "moduleName": "catalog",
  "feature": "units",
  "endpoint": "/catalog/units",
  "methods": ["list", "getById", "create", "update", "delete", "page"]
}
```

## Workflow

1. Validate module exists: src/app/modules/{moduleName}
2. Validate feature folder exists or create: src/app/modules/{moduleName}/{feature}/services/
3. Generate required files:
  - {feature}-api.service.ts
  - {feature}.service.ts
  - index.ts

4. Ensure:
  - HttpClient is injected using inject()
  - environment.apiUrl is used
  - httpErrorHandler is used
  - Observable return type is explicit
  - No business logic inside API service
  - No HTTP calls inside business service

---

## Generated Structure

The skill MUST have the following structure:

```
src/app/modules/{moduleName}/
├── {moduleName}-routing.module.ts
├── {feature}/
│   ├── ui/
│   ├── interfaces/
│   └── services/
│       ├── {feature}-api.service.ts
│       ├── {feature}.service.ts
│       └── index.ts
```
Minimum files required in (services/): 3

---

## File Responsibilities

1️⃣ {feature}-api.service.ts

Purpose:
  - Handle HTTP communication only
  - Map backend response
  - Handle errors
  - Transform response format if needed

Rules:
  - Must use HttpClient
  - Must use inject()
  - Must use environment.apiUrl
  - Must use catchError(httpErrorHandler)
  - Must NOT contain business logic
  - Must return Observable with structured response

Standard response format:
```typescript
{
  error: boolean;
  msg: string;
  data?: T;
}
```

### Page Method Response Format
For paginated endpoints, use:
```typescript
{
  error: boolean;
  msg: string;
  data?: PageData<T>;
}

interface PageData<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

Import from `@core/interfaces:
```typescript
import { ListId, PageData, PageParams, PageResponse, ResponseBase } from '@core/interfaces';
```

2️⃣ {feature}.service.ts
Purpose:
  - Handle business logic
  - Delegate API calls
  - Transform data if needed

Rules:
  - Must inject {Feature}ApiService
  - Must NOT use HttpClient
  - Must NOT call environment directly
  - Must only communicate with API service


3️⃣ index.ts

Purpose:
  - Export only business services
  - NEVER export api services

```typescript
export * from './auth.service';
```

---
## Naming Conventions

- Module folder → kebab-case
- Feature folder → kebab-case
- API Service → PascalCase + ApiService
- Business Service → PascalCase + Service
- File names → kebab-case

Example:

feature: auth

Files:
- auth-api.service.ts
- auth.service.ts

Classes:
- AuthApiService
- AuthService

---

## Validation Rules

The generated code MUST:
- Use inject() instead of constructor injection
- Use providedIn: 'root'
- Use environment.apiUrl
- Use httpErrorHandler
- Use typed interfaces from ../interfaces
- Return Observable with strict typing
- Not duplicate API URL strings
- Not create global services
- Not export api services in index.ts

---

## Available Methods

### Standard CRUD Methods

| Method | HTTP Verb | Description |
|--------|-----------|-------------|
| `list` | GET | List all items (for dropdowns) |
| `getById` | GET | Get single item by ID |
| `create` | POST | Create new item |
| `update` | PUT | Update existing item |
| `delete` | DELETE | Delete item |

### Pagination Method

| Method | HTTP Verb | Description |
|--------|-----------|-------------|
| `page` | POST | Paginated list for PrimeNG tables |

The `page` method uses:
- `PageParams<FilterType>` from `@core/interfaces` for request
- `PageData<T>` and `PageResponse<T>` from `@core/interfaces` for response
- `formatPageParams` from `@shared/utils/table` for converting PrimeNG events

## Template Example
{feature}-api.service.ts (with page method)
```typescript
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import { environment } from '@environment/environment';
import { httpErrorHandler } from '@shared/utils';
import { ExampleRequest, ExampleResponse, ExampleData } from '../interfaces';
import { ListId, PageData, PageParams, PageResponse, ResponseBase } from '@core/interfaces';

@Injectable({
  providedIn: 'root',
})
export class ExampleApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_URL + '/example';

  // List for dropdowns
  list(): Observable<{ error: boolean; msg: string; data?: ListId[] }> {
    const res = { error: true, msg: 'Error undefined', data: undefined as ListId[] | undefined };

    return this.http.get<ResponseBase<ListId[]>>(`${this.apiUrl}`).pipe(
      map((r) => {
        res.msg = r.message;
        if (!r.success) return res;
        res.data = r.data;
        res.error = false;
        return res;
      }),
      catchError(httpErrorHandler),
    );
  }

  // Get by ID
  getById(id: number): Observable<{ error: boolean; msg: string; data?: ExampleData }> {
    const res = { error: true, msg: 'Error undefined', data: undefined as ExampleData | undefined };

    return this.http.get<ResponseBase<ExampleData>>(`${this.apiUrl}/${id}`).pipe(
      map((r) => {
        res.msg = r.message;
        if (!r.success) return res;
        res.data = r.data;
        res.error = false;
        return res;
      }),
      catchError(httpErrorHandler),
    );
  }

  // Create
  create(payload: ExampleRequest): Observable<{ error: boolean; msg: string; data?: ExampleData }> {
    const res = { error: true, msg: 'Error undefined', data: undefined as ExampleData | undefined };

    return this.http.post<ResponseBase<ExampleData>>(`${this.apiUrl}`, payload).pipe(
      map((r) => {
        res.msg = r.message;
        if (!r.success) return res;
        res.data = r.data;
        res.error = false;
        return res;
      }),
      catchError(httpErrorHandler),
    );
  }

  // Update
  update(id: number, payload: ExampleRequest): Observable<{ error: boolean; msg: string; data?: ExampleData }> {
    const res = { error: true, msg: 'Error undefined', data: undefined as ExampleData | undefined };

    return this.http.put<ResponseBase<ExampleData>>(`${this.apiUrl}/${id}`, payload).pipe(
      map((r) => {
        res.msg = r.message;
        if (!r.success) return res;
        res.data = r.data;
        res.error = false;
        return res;
      }),
      catchError(httpErrorHandler),
    );
  }

  // Delete
  delete(id: number): Observable<{ error: boolean; msg: string }> {
    const res = { error: true, msg: 'Error undefined' };

    return this.http.delete<ResponseBase<ExampleData>>(`${this.apiUrl}/${id}`).pipe(
      map((r) => {
        res.msg = r.message;
        res.error = !r.success;
        return res;
      }),
      catchError(httpErrorHandler),
    );
  }

  // Page (for PrimeNG tables)
  page(payload: PageParams<null>): Observable<{
    error: boolean;
    msg: string;
    data?: PageData<ExampleData>;
  }> {
    const res = {
      error: true,
      msg: 'Error undefined',
      data: undefined as PageData<ExampleData> | undefined,
    };

    return this.http.post<PageResponse<ExampleData>>(`${this.apiUrl}/page`, payload).pipe(
      map(({ data, success, message }) => {
        res.msg = message;
        if (!success) return res;
        res.data = {
          items: data.items || [],
          page: data.page || 1,
          limit: data.limit || 10,
          total: data.total,
          totalPages: data.totalPages,
        };
        res.error = false;
        return res;
      }),
      catchError(httpErrorHandler),
    );
  }
}
```


{feature}.service.ts (with page method)
```typescript
import { inject, Injectable } from '@angular/core';
import { ExampleApiService } from './example-api.service';
import { ExampleRequest, ExampleData } from '../interfaces';
import { ListId, PageData, PageParams } from '@core/interfaces';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ExampleService {
  private exampleApiService = inject(ExampleApiService);

  list(): Observable<{ error: boolean; msg: string; data?: ListId[] }> {
    return this.exampleApiService.list();
  }

  getById(id: number): Observable<{ error: boolean; msg: string; data?: ExampleData }> {
    return this.exampleApiService.getById(id);
  }

  create(payload: ExampleRequest): Observable<{ error: boolean; msg: string; data?: ExampleData }> {
    return this.exampleApiService.create(payload);
  }

  update(id: number, payload: ExampleRequest): Observable<{ error: boolean; msg: string; data?: ExampleData }> {
    return this.exampleApiService.update(id, payload);
  }

  delete(id: number): Observable<{ error: boolean; msg: string }> {
    return this.exampleApiService.delete(id);
  }

  page(payload: PageParams<null>): Observable<{
    error: boolean;
    msg: string;
    data?: PageData<ExampleData>;
  }> {
    return this.exampleApiService.page(payload);
  }
}
```

index.ts
```typescript
export * from './example.service';
```
---

## Strict Enforcement

This skill must:
- Never create services outside module scope
- Never modify routing files
- Never modify global @services
- Never generate UI code
- Never generate interfaces

It only generates HTTP feature services.
