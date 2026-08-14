// EJECUTABLE PARA VALIDAR QUE TODOS LOS ARCHIVOS DE TRADUCCIÓN TENGAN LAS MISMAS CLAVES.
// node scripts/validate-i18n.mjs
// Se ejecuta automáticamente antes de `npm run start` vía el pre-hook `prestart`.

import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const i18nDir = path.join(root, 'public/assets/i18n');
const baseLang = process.argv[2] ?? 'es.json'; // Archivo base de comparación (es por defecto)

if (!fs.existsSync(i18nDir)) {
  console.error(`❌ No se encontró el directorio de traducciones: ${i18nDir}`);
  process.exit(1);
}

const files = fs
  .readdirSync(i18nDir)
  .filter((file) => file.endsWith('.json'))
  .sort();

if (files.length === 0) {
  console.error(`❌ No hay archivos de traducción en: ${i18nDir}`);
  process.exit(1);
}

function flatten(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      Object.assign(acc, flatten(val, newKey));
    } else {
      acc[newKey] = val;
    }
    return acc;
  }, {});
}

function readJson(file) {
  const content = fs.readFileSync(path.join(i18nDir, file), 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(content);
}

if (!files.includes(baseLang)) {
  console.error(`❌ El archivo base '${baseLang}' no existe en ${i18nDir}`);
  process.exit(1);
}

const base = flatten(readJson(baseLang));

console.log(`Validando archivos de traducción en: ${i18nDir}`);
console.log(`Idioma base: ${baseLang}`);

let hasErrors = false;

files.forEach((file) => {
  if (file === baseLang) return;
  const current = flatten(readJson(file));

  const missing = Object.keys(base).filter((key) => !(key in current));
  const extra = Object.keys(current).filter((key) => !(key in base));

  console.log(`\n🔍 Comparando '${file}' con base '${baseLang}':`);

  if (missing.length) {
    hasErrors = true;
    console.log(`❌❌❌❌❌❌❌❌❌❌❌❌❌`);
    console.log(`❌ Claves faltantes (${missing.length}):`);
    missing.forEach((key) => console.log(`   - ${key}`));
  } else {
    console.log(`✅ Sin claves faltantes`);
  }

  if (extra.length) {
    console.log(`⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️`);
    console.log(`⚠️ Claves adicionales (${extra.length}):`);
    extra.forEach((key) => console.log(`   - ${key}`));
  } else {
    console.log(`✅ Sin claves adicionales`);
  }
});

console.log('');

if (hasErrors) {
  console.error('❌ Validación fallida: hay claves faltantes en las traducciones.');
  process.exit(1);
}

console.log('✅ Todas las traducciones están sincronizadas.');
