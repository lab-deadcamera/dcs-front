/**
 * BytePlus / Volcengine endpoints supported by the studio.
 * Mirrors the ENDPOINTS map in dcs-v0/server.js.
 */
export interface ApiEndpoint {
  id: string;
  label: string;
  url: string;
}

export interface ApiKey {
  id: string;
  name: string;
  value: string;
  endpoint: string;
  ak: string | null;
  sk: string | null;
  createdAt: string;
}

export const API_ENDPOINTS: readonly ApiEndpoint[] = [
  {
    id: 'byteplus_ap',
    label: 'BytePlus · Singapore (ap-southeast)',
    url: 'https://ark.ap-southeast.bytepluses.com/api/v3',
  },
  {
    id: 'volcengine_cn',
    label: 'Volcengine · China (cn-beijing)',
    url: 'https://ark.cn-beijing.volces.com/api/v3',
  },
];

export const DEFAULT_ENDPOINT_ID = 'byteplus_ap';

/** First 4 + bullets + last 4. Empty string -> empty. */
export function maskKey(value: string): string {
  if (!value) return '';
  if (value.length <= 12) return '••••';
  return value.slice(0, 4) + '••••' + value.slice(-4);
}
