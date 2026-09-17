#!/usr/bin/env node
/**
 * Живы ли источники.
 *
 * Отдельно от сборки и отдельно от обновления данных. Сборка офлайновая
 * намеренно: флапающий апстрим не имеет права уронить деплой. Но знать, что
 * источник лёг, всё равно нужно, иначе первым признаком станет снапшот,
 * не менявшийся неделю.
 *
 * Ретраи обязательны: ransomware.live отдаёт HTML-404 вместо JSON примерно
 * в половине запросов. Без ретраев эта проверка краснела бы через раз и её
 * перестали бы читать, а проверка, которую не читают, хуже её отсутствия.
 */

import { fetchJson } from './lib/http.mjs';

const SOURCES = [
  {
    name: 'ransomware.live',
    url: 'https://api.ransomware.live/v2/countryvictims/AE',
    check: (data) => (Array.isArray(data) ? null : `ожидался массив, получен ${typeof data}`),
  },
  {
    name: 'CISA KEV',
    url: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
    check: (data) =>
      Array.isArray(data?.vulnerabilities) && data.vulnerabilities.length > 0
        ? null
        : 'в каталоге нет поля vulnerabilities',
  },
];

const failures = [];

for (const source of SOURCES) {
  try {
    const { data } = await fetchJson(source.url);
    const problem = source.check(data);
    if (problem) {
      failures.push(`${source.name}: ${problem}`);
      console.log(`  ✖ ${source.name} — ${problem}`);
    } else {
      const size = Array.isArray(data) ? data.length : data.vulnerabilities.length;
      console.log(`  ✓ ${source.name} — ${size} записей`);
    }
  } catch (error) {
    failures.push(`${source.name}: ${error.message}`);
    console.log(`  ✖ ${source.name} — ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error(`\n✖ Источников недоступно: ${failures.length}. Сайт при этом работает: он собирается из закоммиченного снапшота.`);
  process.exit(1);
}
console.log('\n✓ Все источники отвечают.');
