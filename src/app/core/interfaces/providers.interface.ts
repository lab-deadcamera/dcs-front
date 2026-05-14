/**
 * AI provider catalog — admin-managed list of upstream services we can
 * route generation requests through. Each provider holds its credentials
 * (URL + API key) plus a list of named models with descriptions.
 *
 * Persisted to localStorage. A future backend can swap the storage layer
 * without changing this shape.
 */

export interface AIModel {
  id: string;
  /** Display name shown in pickers, e.g. "Ark Seedance 2". */
  name: string;
  /** Short blurb of what the model does — surfaces in the UI as the hint. */
  description: string;
  /** ISO timestamp when this model was added by the admin. */
  createdAt: string;
}

export interface AIProvider {
  id: string;
  /** Human-readable provider name, e.g. "BytePlus". */
  name: string;
  /** Base URL the API client should target. */
  url: string;
  /** Plain-text API key. Stored in localStorage — admin-tool only for now. */
  apiKey: string;
  /** Optional free-form notes about the provider. */
  description?: string;
  /** Models exposed by this provider. Order is preserved. */
  models: AIModel[];
  /** ISO timestamp when this provider was added. */
  createdAt: string;
}
