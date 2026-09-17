/**
 * Склеенные слова в отрендеренном тексте.
 *
 * Astro схлопывает перенос строки между выражением и текстом в пустоту, а не в
 * пробел. "{label}\n organisations" превращается в "financial servicesorganisations".
 * В шаблоне это не видно, в сборке — тоже, пока не прочитаешь строку целиком.
 * Один такой дефект уже дожил до опубликованной страницы.
 *
 * Ловим по двум признакам: аномально длинное «слово» и стык строчной с
 * заглавной внутри слова, которого нет в списке допустимых написаний.
 */

export const name = 'glued-words';

const MAX_WORD = 34;

/** Написания, где заглавная внутри слова легитимна. */
/**
 * Адрес — не проза. Склейка, которую ловит этот гард, рождается из переноса
 * строки в шаблоне и не может породить ни '@', ни '://'. Почтовый адрес длиннее
 * порога по своей природе, и укорачивать его ради гарда было бы абсурдом.
 */
const ADDRESS = /@|:\/\//;

const ALLOWED = /^(MedusaLocker|RansomHub|DragonForce|LockBit|FunkSec|KillSec|NightSpire|BQTLock|DarkVault|FLocker|BrainCipher|RansomHouse|aeCERT|eCommerce|iOS|macOS|JavaScript|GitHub|YouTube)$/;

function textOf(root) {
  const out = [];
  const walk = (node) => {
    for (const child of node.childNodes ?? []) {
      const tag = child.tagName?.toLowerCase?.();
      if (tag === 'script' || tag === 'style' || tag === 'code') continue;
      // Блоки атрибуции содержат имена людей, а не прозу: LoboStudio и LaRussa
      // пишутся именно так, и проверять их на склейку бессмысленно.
      const cls = (child.className ?? '').toString();
      if (cls.includes('hero__credit') || cls.includes('credits-')) continue;
      if (child.nodeType === 3) out.push(child.textContent ?? '');
      else walk(child);
    }
  };
  walk(root);
  return out.join(' ');
}

export function run({ pages }) {
  const failures = [];
  const seen = new Set();

  for (const { path, doc } of pages) {
    if (!doc.body) continue;
    for (const word of textOf(doc.body).split(/\s+/)) {
      if (ADDRESS.test(word)) continue;
      const w = word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
      if (!w) continue;

      if (w.length > MAX_WORD && !seen.has(w)) {
        seen.add(w);
        failures.push(`${path}: аномально длинное слово, похоже на склейку — "${w.slice(0, 50)}"`);
        continue;
      }
      // строчная, сразу заглавная: "servicesOrganisations".
      // Точка склейку не оправдывает: "project.It" — тот же дефект, просто
      // после конца предложения. Он дожил до подвала на всех страницах.
      if ((/\p{Ll}\p{Lu}/u.test(w) || /\p{Ll}\.\p{Lu}/u.test(w)) && !ALLOWED.test(w) && !seen.has(w)) {
        seen.add(w);
        failures.push(`${path}: заглавная внутри слова, похоже на склейку — "${w}"`);
      }
    }
  }

  return { name, failures };
}
