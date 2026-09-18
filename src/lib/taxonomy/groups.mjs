/**
 * Группы вымогателей: слаги, отображаемые имена, семейства.
 *
 * ПОРОГ ≥2 ИНЦИДЕНТА. В выборке 61 группа, но у 30 из них ровно по одному
 * инциденту. Отдельная страница на один инцидент — тонкий контент, который
 * пройдёт проверку уникальности Title и всё равно будет прочитан как дорвей.
 * Порог даёт 31 страницу; остальные перечисляются на хабе без своего URL.
 *
 * ПОЧЕМУ lockbit2 И lockbit3 НЕ СЛИВАЮТСЯ В ОДИН URL. Слияние — это
 * редакторское утверждение о тождестве актора, а не факт из данных, и оно ломает
 * соответствие 1:1 с источником. Связь между ними выражается полем family и
 * блоком related, а не общей страницей. По той же причине medusa и medusalocker
 * оставлены раздельными: их часто путают, но это разные операции.
 */

/**
 * Минимум заявлений для собственной страницы.
 *
 * Было два, стало пять, и это не вкусовая правка. При пороге в два заявления
 * двенадцать страниц групп из двадцати двух стояли ровно на двух точках данных.
 * Замер показал, что они похожи друг на друга на 21–26% по шестисловным
 * шинглам при медиане 1,9% по сайту, а строка рекомендации про UAE PDPL
 * повторялась дословно на всех двенадцати. На двух заявлениях нельзя написать
 * 270 слов неформулярного разбора: получается шаблон в редакторском костюме,
 * и такие страницы тянут вниз оценку качества всего сайта, а не только свою.
 *
 * Группы ниже порога не исчезают. Они собраны на /short-record/ одной
 * содержательной страницей с таблицей, где виден их общий смысл: в наборе ОАЭ
 * подавляющее большинство групп появляется считанные разы.
 */
export const MIN_INCIDENTS_FOR_PAGE = 5;

/** Отображаемые имена. Без записи здесь имя выводится эвристикой. */
const DISPLAY_NAMES = {
  coinbasecartel: 'Coinbase Cartel',
  ransomhub: 'RansomHub',
  everest: 'Everest',
  lockbit3: 'LockBit 3.0',
  lockbit2: 'LockBit 2.0',
  lockbit5: 'LockBit 5.0',
  stormous: 'Stormous',
  qilin: 'Qilin',
  thegentlemen: 'The Gentlemen',
  dragonforce: 'DragonForce',
  incransom: 'INC Ransom',
  killsec: 'KillSec',
  medusa: 'Medusa',
  medusalocker: 'MedusaLocker',
  arcusmedia: 'Arcus Media',
  funksec: 'FunkSec',
  nightspire: 'NightSpire',
  braincipher: 'Brain Cipher',
  eldorado: 'Eldorado',
  apt73: 'APT73',
  darkvault: 'DarkVault',
  flocker: 'FLocker',
  lynx: 'Lynx',
  snatch: 'Snatch',
  bqtlock: 'BQTLock',
  clop: 'Clop',
  direwolf: 'Direwolf',
  gunra: 'Gunra',
  krybit: 'Krybit',
  maze: 'Maze',
  raworld: 'RA World',
  tengu: 'Tengu',
};

/** Семейства — только для блока related, никогда для объединения URL. */
const FAMILIES = {
  lockbit2: 'lockbit',
  lockbit3: 'lockbit',
  lockbit5: 'lockbit',
};

export function slugifyGroup(rawName) {
  return String(rawName ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function displayGroupName(rawName) {
  const key = String(rawName ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (DISPLAY_NAMES[key]) return DISPLAY_NAMES[key];

  // Эвристика для групп, которых нет в карте: разумный титул-кейс.
  const raw = String(rawName ?? '').trim();
  if (!raw) return 'Unknown';
  if (/[A-Z]/.test(raw.slice(1))) return raw; // Уже читаемое, вроде BrainCipher
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function groupFamily(rawName) {
  return FAMILIES[String(rawName ?? '').toLowerCase()] ?? null;
}

export { DISPLAY_NAMES, FAMILIES };
