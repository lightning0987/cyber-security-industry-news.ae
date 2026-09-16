#!/usr/bin/env node
/**
 * Лоадер ransomware.live — ГРАНИЦА СНЯТИЯ ЗАПРЕЩЁННЫХ ПОЛЕЙ.
 *
 * Это самый важный файл проекта. Здесь и только здесь сырые записи с именами
 * компаний-жертв превращаются в публичные записи, из которых имя восстановить
 * нельзя. Всё, что ниже по течению, работает уже с обезличенными данными.
 *
 * ПРИНЦИП. Запрещённые поля снимаются в памяти, до первой записи в src/.
 * Они физически не существуют в файле, который может прочитать Astro. Это
 * структурная гарантия, а не соглашение: чтобы нарушить её, недостаточно
 * ошибиться в шаблоне — надо переписать этот файл.
 *
 * СНИМАЮТСЯ: post_title, website, description, post_url (.onion), country
 * (константа "AE"), а также ransom и data_size. Последние два не называют
 * жертву напрямую, но в связке «сектор + дата» работают как квазиидентификатор,
 * и ransom всё равно недостоверен. По той же причине таймстемпы срезаются до дня.
 *
 * ВЫЖИВАЕТ один производный бит: ae_confidence. Он вычисляется из website и
 * description в момент загрузки, после чего сами поля выбрасываются.
 *
 * Запуск: npm run fetch:ransomware [-- --force]
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fetchJson } from './lib/http.mjs';
import { defendAgainstRegression, readSnapshot, writeSnapshot } from './lib/snapshot.mjs';
import { fingerprintRecord, getSalt, hashValue, saltId } from './lib/fingerprint.mjs';
import { normaliseSector } from '../src/lib/taxonomy/sectors.mjs';
import { groupFamily, slugifyGroup } from '../src/lib/taxonomy/groups.mjs';

const SOURCE = 'ransomware.live';
const ENDPOINT = 'https://api.ransomware.live/v2/countryvictims/AE';
const SNAPSHOT_NAME = 'ransomware-live-ae';

/** Признаки принадлежности к ОАЭ в свободном тексте записи. */
const UAE_PATTERN =
  /\b(u\.?a\.?e\.?|united arab emirates|dubai|abu dhabi|sharjah|ajman|fujairah|ras al[- ]khaimah|umm al[- ]quwain|emirates?|emirati|difc|adgm|dmcc|jafza|jebel ali|masdar)\b/i;

/**
 * Насколько уверенно запись относится к ОАЭ.
 *
 * ЗАЧЕМ. Страновая атрибуция в ransomware.live ненадёжна: в выборке AE есть
 * организации, не имеющие к ОАЭ отношения (проверено — бангладешский траст с
 * пометкой country: "AE"). Публиковать 182 как «атаки на ОАЭ» нельзя, это
 * не выдержит первой же проверки. Публикуем то, что подтверждается.
 */
function assessUaeConfidence(raw) {
  const site = String(raw.website ?? '').trim().toLowerCase();
  const host = site.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');

  if (host.endsWith('.ae')) return 'confirmed';

  const haystack = [raw.description, raw.post_title, raw.website].filter(Boolean).join(' ');
  if (UAE_PATTERN.test(haystack)) return 'probable';

  return 'unverified';
}

/** ISO-таймстемп → дата до дня. Время срезается намеренно. */
function toDay(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/**
 * Сырая запись → публичная. Здесь происходит снятие полей.
 * Возвращает { record, fingerprints, unknownSectorLabel }.
 */
function normaliseRecord(raw, salt) {
  const sector = normaliseSector(raw.activity);
  const discovered = toDay(raw.discovered);
  const groupRaw = String(raw.group_name ?? '').trim();

  // Отпечаток жертвы: единственное, что связывает публичную запись с личностью,
  // и он необратим без соли.
  const victimHash = hashValue(raw.website || raw.post_title || `${groupRaw}|${discovered}`, salt);

  const record = {
    id: hashValue(`${groupRaw}|${discovered}|${victimHash}`, salt),
    victim_hash: victimHash,
    group: groupRaw.toLowerCase(),
    group_slug: slugifyGroup(groupRaw),
    group_family: groupFamily(groupRaw),
    sector: sector.slug,
    sector_label: sector.label,
    discovered,
    published: toDay(raw.published),
    year: discovered ? Number(discovered.slice(0, 4)) : null,
    month: discovered ? discovered.slice(0, 7) : null,
    ae_confidence: assessUaeConfidence(raw),
  };

  return {
    record,
    fingerprints: fingerprintRecord(raw, salt),
    unknownSectorLabel: sector.known ? null : String(raw.activity ?? ''),
  };
}

async function main() {
  const force = process.argv.includes('--force');
  const salt = getSalt({ createIfMissing: true });

  console.log(`→ ${ENDPOINT}`);
  const { data, attempts } = await fetchJson(ENDPOINT);

  if (!Array.isArray(data)) {
    throw new Error(`Ожидался JSON-массив, получен ${typeof data}. Апстрим сменил форму ответа.`);
  }
  console.log(`  получено ${data.length} записей за ${attempts} попыт(ок)`);

  // Сырые данные — только в private/, который в .gitignore.
  // Нужны для ручного аудита и перерасчёта отпечатков, если сменится схема.
  writeFileSync(
    resolve(process.cwd(), 'private', `${SNAPSHOT_NAME}.raw.json`),
    `${JSON.stringify(data, null, 2)}\n`,
    { mode: 0o600 },
  );

  const records = [];
  const fingerprints = new Set();
  const unknownSectors = new Map();

  for (const raw of data) {
    const { record, fingerprints: fps, unknownSectorLabel } = normaliseRecord(raw, salt);
    records.push(record);
    for (const fp of fps) fingerprints.add(fp);
    if (unknownSectorLabel !== null) {
      unknownSectors.set(unknownSectorLabel, (unknownSectors.get(unknownSectorLabel) ?? 0) + 1);
    }
  }

  // Незнакомый лейбл сектора — это не повод угадывать, а повод разбудить человека.
  if (unknownSectors.size > 0) {
    console.warn('\n  ⚠ Незнакомые лейблы секторов (сборка упадёт, пока их не добавить):');
    for (const [label, count] of unknownSectors) console.warn(`      "${label}" — ${count} зап.`);
    console.warn('    Правится одной строкой в src/lib/taxonomy/sectors.mjs\n');
  }

  // Защита от регрессии — важнее ретраев. Подробности в snapshot.mjs.
  const previous = readSnapshot(SNAPSHOT_NAME);
  const problems = defendAgainstRegression(records, previous, {
    facets: {
      сектор: (r) => r.sector,
      группа: (r) => r.group_slug,
    },
  });

  if (problems.length > 0 && !force) {
    console.error('\n✖ Снапшот НЕ записан — свежие данные выглядят повреждёнными:');
    for (const p of problems) console.error(`    • ${p}`);
    console.error('\n  Предыдущий снапшот оставлен нетронутым. Это штатное поведение:');
    console.error('  частичный ответ апстрима снёс бы страницы, а гарды этого не заметили бы.');
    console.error('  Если данные верны и апстрим действительно изменился — npm run fetch:ransomware -- --force\n');
    process.exit(1);
  }
  if (problems.length > 0 && force) {
    console.warn('\n  ⚠ --force: защита от регрессии отключена вручную. Претензии:');
    for (const p of problems) console.warn(`    • ${p}`);
  }

  const byConfidence = records.reduce((acc, r) => {
    acc[r.ae_confidence] = (acc[r.ae_confidence] ?? 0) + 1;
    return acc;
  }, {});

  const envelope = writeSnapshot(SNAPSHOT_NAME, {
    source: SOURCE,
    endpoint: ENDPOINT,
    records,
    extra: {
      attribution: byConfidence,
      // Незнакомые лейблы секторов едут в конверт, чтобы check-data.mjs мог
      // уронить сборку. Отличить «апстрим не классифицировал» от «лейбл, о
      // котором мы не знаем» по одному sector: null невозможно.
      unknown_sector_labels: [...unknownSectors.entries()].map(([label, count]) => ({ label, count })),
    },
  });

  // Отпечатки коммитятся: гард в CI работает из чистого чекаута, где private/ нет.
  // salt_id позволяет гарду убедиться, что его соль — та же самая.
  writeFileSync(
    resolve(process.cwd(), 'src/data', `${SNAPSHOT_NAME}.fingerprints.json`),
    `${JSON.stringify(
      {
        source: SOURCE,
        fetched_at: envelope.fetched_at,
        salt_id: saltId(salt),
        count: fingerprints.size,
        fingerprints: [...fingerprints].sort(),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log(`\n✓ Снапшот записан: ${records.length} записей`);
  console.log(`  атрибуция к ОАЭ: confirmed ${byConfidence.confirmed ?? 0}, ` +
    `probable ${byConfidence.probable ?? 0}, unverified ${byConfidence.unverified ?? 0}`);
  console.log(`  отпечатков для гарда: ${fingerprints.size}`);
  console.log(`  salt_id: ${saltId(salt)}`);
}

main().catch((error) => {
  console.error(`\n✖ ${error.message}`);
  process.exit(1);
});
