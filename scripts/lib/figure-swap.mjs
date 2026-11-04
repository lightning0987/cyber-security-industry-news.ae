/**
 * Детерминированная замена устаревших чисел.
 *
 * Большая часть правок после обновления данных — это одно число вместо
 * другого в предложении, смысл которого не меняется. Платить за это модели
 * бессмысленно. Но замена безопасна далеко не всегда, поэтому здесь не одна
 * функция, а набор запретов, и по умолчанию ответ «нет».
 *
 * Всё, от чего здесь отказались, уходит модели. Отказ стоит денег, ошибка
 * стоит доверия к цифрам на сайте, поэтому запреты намеренно широкие.
 */

/**
 * Слова, при которых предложение утверждает отношение, а не факт.
 *
 * «RansomHub самый активный с 12 заявлениями» остаётся ложью и с цифрой 13,
 * если кто-то обогнал. Такое предложение нужно переписывать, а не править.
 */
const RELATIONAL = new RegExp(
  [
    // Превосходные степени. «RansomHub самый активный с 12 заявлениями»
    // остаётся ложью и с цифрой 13, если кто-то обогнал. Ни одно сравнение
    // чисел внутри предложения этого не покажет.
    'most', 'least', 'largest', 'smallest', 'highest', 'lowest', 'biggest',
    'busiest', 'heaviest', 'dominant', 'leading', 'leads', 'leader',
    'no other', 'sole', 'solely', 'alone', 'only',
    // Доли и кратности: отношение закодировано словом, а не вторым числом.
    'half', 'quarter', 'double', 'doubled', 'twice', 'triple', 'tripled',
    // Границы. «более 7» с числом 8 ложно, когда на деле ровно 8, и второго
    // числа в предложении нет, чтобы это заметить.
    'more than', 'fewer than', 'less than', 'greater than', 'at least',
    'at most', 'no more than', 'up to', 'exceeds', 'exceed', 'above', 'below',
  ].join('|'),
  'i',
);

/**
 * Порядковые словами вынесены отдельно, потому что их вето снимается
 * доказательством. «Everest ranks third of 47 groups» нельзя править вслепую:
 * цифрой «third» не видно, и проверка направления до неё не доберётся. Но
 * ранг есть в брифе, и если он не сдвинулся, слово остаётся верным, а менять
 * нужно только общее число групп.
 */
const ORDINALS = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
  sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
};
const ORDINAL_RE = new RegExp(`\\b(${Object.keys(ORDINALS).join('|')})\\b`, 'i');

/** «ranks third of 47 groups» → порядковое и общее число. */
const RANK_RE = new RegExp(`\\branks?\\s+(${Object.keys(ORDINALS).join('|')})\\s+of\\s+\\d+`, 'i');

/**
 * Снимается ли вето на порядковое в этом сегменте.
 *
 * Только когда предложение построено по шаблону «ranks <словом> of <число>»
 * и словесный ранг совпадает с тем, что сейчас в данных. Несовпадение значит,
 * что сущность сдвинулась в рейтинге, и предложение нужно переписывать, а не
 * править цифру.
 */
function ordinalProven(segment, rankNow) {
  if (!ORDINAL_RE.test(segment)) return true;
  if (typeof rankNow !== 'number') return false;
  const m = segment.match(RANK_RE);
  if (!m) return false;
  if (ORDINALS[m[1].toLowerCase()] !== rankNow) return false;
  // Второго порядкового в предложении быть не должно: доказали только это.
  return (segment.match(new RegExp(ORDINAL_RE, 'gi')) ?? []).length === 1;
}

/**
 * Числа, написанные словом.
 *
 * «Twenty-four of the 47 groups have claimed exactly one UAE organisation»:
 * заменить 47 на 48 легко, а Twenty-four не видит ни линтер, ни гард, ни эта
 * замена. Предложение осталось бы с правильным общим числом и неправильным
 * частным, и ни одна проверка на сайте этого бы не поймала.
 *
 * Поэтому сегмент с числом словом не трогается вовсе. Исключение только одно
 * и доказуемое: ранг в шаблоне «ranks <словом> of <число>».
 */
const SPELLED = new RegExp(
  '\\b(' +
    ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
     'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
     'eighteen', 'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty',
     'seventy', 'eighty', 'ninety', 'hundred', 'dozen'].join('|') +
    ')(-(one|two|three|four|five|six|seven|eight|nine))?\\b',
  'i',
);

/** «меньше заявлений, чем 8.8» — та же граница, но слова разнесены. */
const SPLIT_COMPARISON = /\b(more|fewer|less|greater|higher|lower)\b[^.]{0,40}\bthan\b/i;

/**
 * Число внутри текста.
 *
 * Хвост `(?!\\.?\\d)` обязателен: без него «2» находится внутри «2.7», потому
 * что следом идёт точка, а не цифра. Отсюда брались ложные «отношение
 * перевернулось». Просто запретить точку следом нельзя, иначе число в конце
 * предложения перестанет находиться.
 */
const numberRe = (value) =>
  new RegExp(`(?<![\\d.])${String(value).replace('.', '\\.')}(?!\\.?\\d)`, 'g');

/**
 * Карта «старое значение → новое» по двум версиям одного брифа.
 *
 * Обходятся оба дерева параллельно, и пара записывается только там, где
 * совпал путь. Число, сменившее роль, в карту не попадает: совпадение
 * значений без совпадения пути ничего не доказывает.
 */
export function buildMap(oldBrief, newBrief) {
  const pairs = new Map();

  const walk = (a, b) => {
    if (a === null || b === null || a === undefined || b === undefined) return;
    if (typeof a === 'number' && typeof b === 'number') {
      if (a !== b) {
        const key = String(a);
        if (!pairs.has(key)) pairs.set(key, new Set());
        pairs.get(key).add(String(b));
      }
      return;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      for (let i = 0; i < Math.min(a.length, b.length); i += 1) walk(a[i], b[i]);
      return;
    }
    if (typeof a === 'object' && typeof b === 'object') {
      for (const k of Object.keys(a)) if (k in b) walk(a[k], b[k]);
    }
  };

  walk(oldBrief, newBrief);

  // Неоднозначное отбрасывается: одно старое число, два разных новых —
  // значит по тексту не определить, которое из них имелось в виду.
  const out = new Map();
  for (const [from, to] of pairs) if (to.size === 1) out.set(from, [...to][0]);
  return out;
}

/** Куски текста, внутри которых решается судьба числа. */
function segments(text) {
  const out = [];
  let offset = 0;
  for (const line of text.split('\n')) {
    // Строка frontmatter и строка таблицы — самостоятельные единицы:
    // в них нет предложений, но есть собственный контекст.
    const isUnit = /^\s*[a-zA-Z_]+:\s/.test(line) || line.trimStart().startsWith('|');
    if (isUnit || !line.includes('. ')) {
      out.push({ start: offset, text: line });
    } else {
      let p = 0;
      for (const piece of line.split(/(?<=[.!?])\s+/)) {
        out.push({ start: offset + p, text: piece });
        p += piece.length + 1;
      }
    }
    offset += line.length + 1;
  }
  return out;
}

/**
 * Числа сегмента, которые есть в карте, с их старым и новым значением.
 * Длинные значения идут первыми, чтобы «8.8» не был найден внутри «18.8».
 */
function movingNumbers(segment, map) {
  const found = [];
  for (const [from, to] of [...map].sort((a, b) => b[0].length - a[0].length)) {
    if (numberRe(from).test(segment)) found.push({ from, to });
  }
  return found;
}

/**
 * Решение по одному сегменту.
 *
 * Возвращает либо новый текст сегмента, либо причину отказа. Причина нужна
 * не для отладки: она попадает в отчёт, и по ней видно, за что именно
 * заплатили модели.
 */
export function decideSegment(segment, flagged, map, rankNow) {
  const moving = movingNumbers(segment, map).filter((m) => flagged.has(m.from));
  if (moving.length === 0) return { verdict: 'skip' };

  if (RELATIONAL.test(segment) || SPLIT_COMPARISON.test(segment)) {
    return { verdict: 'refuse', reason: 'предложение утверждает отношение, а не факт' };
  }

  if (!ordinalProven(segment, rankNow)) {
    return { verdict: 'refuse', reason: 'порядковое словом, ранг не подтверждён брифом' };
  }

  // Шаблон ранга разрешён, всё остальное словами — нет.
  const withoutRank = segment.replace(RANK_RE, '');
  if (SPELLED.test(withoutRank)) {
    return { verdict: 'refuse', reason: 'в предложении есть число словом, его не проверяет ничто' };
  }

  // Проверка направления: если в сегменте несколько меняющихся чисел,
  // порядок между ними обязан сохраниться. Перевернувшийся знак означает,
  // что предложение станет ложным, даже когда каждое число по отдельности
  // верное.
  const all = movingNumbers(segment, map);
  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      const a = all[i];
      const b = all[j];
      const was = Math.sign(Number(a.from) - Number(b.from));
      const now = Math.sign(Number(a.to) - Number(b.to));
      if (was !== now) {
        return {
          verdict: 'refuse',
          reason: `отношение ${a.from}/${b.from} перевернулось на ${a.to}/${b.to}`,
        };
      }
    }
  }

  let next = segment;
  for (const { from, to } of moving) next = next.replace(numberRe(from), to);
  return { verdict: 'swap', text: next };
}

/**
 * Замена по всему файлу.
 *
 * `flagged` — числа, которые линтер назвал отсутствующими в данных. Трогаются
 * только они: число, которое проверку прошло, менять не за что.
 */
export function swapFigures(text, flagged, map, rankNow) {
  const applied = [];
  const refused = [];
  let out = '';
  let cursor = 0;

  for (const seg of segments(text)) {
    const d = decideSegment(seg.text, flagged, map, rankNow);
    if (d.verdict === 'refuse') refused.push({ segment: seg.text.trim(), reason: d.reason });
    if (d.verdict !== 'swap') continue;

    out += text.slice(cursor, seg.start) + d.text;
    cursor = seg.start + seg.text.length;
    applied.push({ was: seg.text.trim(), now: d.text.trim() });
  }
  out += text.slice(cursor);

  // Единственное, что было позволено изменить, — цифры. Если сошлось не
  // только это, результат выбрасывается целиком: лучше заплатить модели,
  // чем записать файл, про который непонятно, что в нём поменялось.
  const strip = (s) => s.replace(/[\d.]+/g, '#');
  if (strip(out) !== strip(text)) {
    return { text, applied: [], refused: [{ segment: '(весь файл)', reason: 'изменились не только цифры' }] };
  }

  return { text: out, applied, refused };
}
