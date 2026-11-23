/**
 * Группы вымогателей: слаги, отображаемые имена, семейства.
 *
 * ПОРОГ СВОЕЙ СТРАНИЦЫ живёт в MIN_INCIDENTS_FOR_PAGE ниже, вместе с историей
 * того, почему он менялся дважды.
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
 * Было два, стало пять, стало один. Обе правки имели причину, и вторая не
 * отменяет первую, а снимает условие, при котором та была верна.
 *
 * ПОЧЕМУ ПОДНИМАЛИ ДО ПЯТИ. При пороге два двенадцать страниц групп из
 * двадцати двух стояли ровно на двух точках данных. Замер показал сходство
 * 21–26% по шестисловным шинглам при медиане 1,9% по сайту, а строка
 * рекомендации про UAE PDPL повторялась дословно на всех двенадцати. На двух
 * заявлениях нельзя было написать неформулярный разбор, потому что кроме
 * самих заявлений про группу на сайте не было ничего.
 *
 * ПОЧЕМУ ОПУСТИЛИ ДО ОДНОГО. Появилось то, чего не было: профили групп из
 * src/data/ransomware-group-profiles.json. У страницы теперь есть собственное
 * содержание помимо счётчика — чем группа является, когда её впервые увидели,
 * под какими ещё именами известна, какие инструменты за ней записаны. Две
 * страницы групп с одним заявлением больше не отличаются только числом.
 *
 * И вторая причина, операционная. При пороге пять заметка про группу из
 * хвоста ссылалась на несуществующую страницу, link-graph ронял сборку, и
 * публикация вставала до прихода человека. Так случилось с BrainCipher и
 * Krybit 19 ноября. Порог в одно заявление убирает этот класс поломок
 * целиком: страница есть у всякой группы, про которую можно написать заметку.
 */
export const MIN_INCIDENTS_FOR_PAGE = 1;

/**
 * Граница «короткой записи» для /short-record/.
 *
 * Своя константа, а не MIN_INCIDENTS_FOR_PAGE. Раньше страница определяла
 * хвост как «группы без собственной страницы», и при пороге в одно заявление
 * она стала говорить «групп меньше чем с одним заявлением» и «от двух до
 * нуля». Это не опечатка, а следствие того, что страница опиралась на чужое
 * решение: порог существует для вопроса «давать ли URL», а хвост это вопрос
 * «о чём говорят данные». Вопросы разные, и констант должно быть две.
 */
export const SHORT_RECORD_MAX = 2;

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
