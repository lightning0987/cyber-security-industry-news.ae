/**
 * Тесты детерминированной замены.
 *
 * Проверяются не удачные случаи, а отказы. Замена, которая срабатывает
 * всегда, не экономит деньги, а портит цифры на сайте.
 */

import { buildMap, swapFigures } from './lib/figure-swap.mjs';
import assert from 'node:assert/strict';

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.log(`  ✖ ${name}\n      ${err.message.split('\n')[0]}`);
    process.exitCode = 1;
  }
};

const run = (text, flagged, oldB, newB, rankNow) =>
  swapFigures(text, new Set(flagged), buildMap(oldB, newB), rankNow);

console.log('карта значений');

test('пара пишется только при совпадении пути', () => {
  const m = buildMap({ a: 3, b: 7 }, { a: 4, b: 7 });
  assert.equal(m.get('3'), '4');
  assert.equal(m.has('7'), false);
});

test('одно старое число с двумя новыми отбрасывается', () => {
  const m = buildMap({ a: 3, b: 3 }, { a: 4, b: 9 });
  assert.equal(m.has('3'), false, 'неоднозначное попало в карту');
});

test('одно старое число с одинаковым новым остаётся', () => {
  const m = buildMap({ a: 3, b: 3 }, { a: 4, b: 4 });
  assert.equal(m.get('3'), '4');
});

console.log('замена');

test('простой факт заменяется', () => {
  const r = run('Education holds 3 claimed organisations.', ['3'], { n: 3 }, { n: 4 });
  assert.equal(r.text, 'Education holds 4 claimed organisations.');
  assert.equal(r.applied.length, 1);
});

test('число, которое линтер не отметил, не трогается', () => {
  const r = run('Education holds 3 claimed organisations.', [], { n: 3 }, { n: 4 });
  assert.equal(r.text, 'Education holds 3 claimed organisations.');
});

test('8.8 не находится внутри 18.8', () => {
  const r = run('The figure is 18.8 today.', ['8.8'], { n: 8.8 }, { n: 8.9 });
  assert.equal(r.text, 'The figure is 18.8 today.');
});

console.log('отказы — главное');

test('перевернувшееся отношение отклоняется', () => {
  // 3 было меньше 8.6, стало 9 против 8.8 — предложение станет ложным
  const r = run(
    'Education recorded 3 claims where the average sector recorded 8.6 claims.',
    ['3', '8.6'],
    { sector: 3, average: 8.6 },
    { sector: 9, average: 8.8 },
  );
  assert.equal(r.applied.length, 0, 'замена прошла, хотя знак перевернулся');
  assert.match(r.refused[0].reason, /перевернул/);
});

test('сохранившееся отношение пропускается', () => {
  const r = run(
    'Education recorded 3 claims where the average sector recorded 8.6 claims.',
    ['3', '8.6'],
    { sector: 3, average: 8.6 },
    { sector: 4, average: 8.8 },
  );
  assert.equal(r.text.includes('4 claims'), true);
  assert.equal(r.text.includes('8.8 claims'), true);
});

test('превосходная степень отклоняется', () => {
  const r = run('RansomHub is the most active group with 12 claims.', ['12'], { n: 12 }, { n: 13 });
  assert.equal(r.applied.length, 0);
  assert.match(r.refused[0].reason, /отношение/);
});

test('порядковое словом без доказательства отклоняется', () => {
  const r = run('Everest holds third place with 9 claims.', ['9'], { n: 9 }, { n: 10 });
  assert.equal(r.applied.length, 0);
  assert.match(r.refused[0].reason, /ранг не подтверждён/);
});

test('порядковое пропускается, когда бриф подтверждает ранг', () => {
  // третий как был, так и остался — менять нужно только число групп
  const r = run('Everest ranks third of 47 groups on this tracker.', ['47'], { n: 47 }, { n: 48 }, 3);
  assert.equal(r.text, 'Everest ranks third of 48 groups on this tracker.');
});

test('порядковое отклоняется, когда ранг сдвинулся', () => {
  // текст говорит seventh, в данных уже восьмое место
  const r = run('Healthcare ranks seventh of 13 UAE sectors.', ['13'], { n: 13 }, { n: 14 }, 8);
  assert.equal(r.applied.length, 0, 'заменили, хотя сущность съехала в рейтинге');
});

test('порядковое вне шаблона ranks не пропускается даже при верном ранге', () => {
  const r = run('Everest was the third group to reach 47 UAE claims.', ['47'], { n: 47 }, { n: 48 }, 3);
  assert.equal(r.applied.length, 0);
});

test('доля отклоняется', () => {
  const r = run('Half of its 4 claims fall in Transportation.', ['4'], { n: 4 }, { n: 5 });
  assert.equal(r.applied.length, 0);
});

test('сравнение отклоняется', () => {
  const r = run('Transportation carries more than 7 claims.', ['7'], { n: 7 }, { n: 8 });
  assert.equal(r.applied.length, 0);
});

test('число не из карты не заменяется', () => {
  const r = run('Education holds 3 claimed organisations.', ['3'], { n: 5 }, { n: 6 });
  assert.equal(r.text, 'Education holds 3 claimed organisations.');
});

test('число словом рядом с цифрой отклоняется', () => {
  const r = run(
    'Twenty-four of the 47 groups have claimed exactly one organisation.',
    ['47'], { n: 47 }, { n: 48 }, null,
  );
  assert.equal(r.applied.length, 0, 'заменили цифру рядом с непроверяемым числом словом');
  assert.match(r.refused[0].reason, /словом/);
});

test('шаблон ранга не считается числом словом', () => {
  const r = run('Everest ranks third of 47 groups on this tracker.', ['47'], { n: 47 }, { n: 48 }, 3);
  assert.equal(r.text, 'Everest ranks third of 48 groups on this tracker.');
});

console.log('целостность файла');

test('меняются только цифры, буквы остаются', () => {
  const src = 'Education holds 3 claims.\nTechnology holds 13 claims.\n';
  const r = run(src, ['3', '13'], { a: 3, b: 13 }, { a: 4, b: 14 });
  const letters = (s) => s.replace(/[\d.]+/g, '');
  assert.equal(letters(r.text), letters(src));
  assert.equal(r.text, 'Education holds 4 claims.\nTechnology holds 14 claims.\n');
});

test('одно отклонённое предложение не мешает соседнему', () => {
  const src = 'Education holds 3 claims.\nRansomHub is the most active with 12 claims.\n';
  const r = run(src, ['3', '12'], { a: 3, b: 12 }, { a: 4, b: 13 });
  assert.equal(r.text.includes('4 claims'), true, 'хорошее предложение не заменилось');
  assert.equal(r.text.includes('12 claims'), true, 'плохое предложение заменилось');
});

test('frontmatter правится как отдельная строка', () => {
  const src = '---\ndescription: "Education holds 3 claimed organisations today."\n---\n';
  const r = run(src, ['3'], { n: 3 }, { n: 4 });
  assert.equal(r.text.includes('4 claimed'), true);
});

console.log(`\n${passed} проверок пройдено`);
