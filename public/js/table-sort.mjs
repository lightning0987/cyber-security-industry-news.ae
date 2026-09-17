/**
 * Сортировка таблиц данных на клиенте (ТЗ 15.5).
 *
 * Прогрессивное улучшение: без JavaScript таблица остаётся полностью
 * читаемой, потому что все значения уже в HTML. Скрипт только переставляет
 * существующие строки и ничего не подгружает.
 *
 * Без библиотек, без зависимостей, ~40 строк.
 */
const NUM = /^-?[\d.,]+%?$/;

function value(row, index) {
  const cell = row.children[index];
  const text = (cell?.textContent ?? '').trim();
  if (NUM.test(text)) return parseFloat(text.replace(/[,%]/g, '')) || 0;
  return text.toLowerCase();
}

function makeSortable(table) {
  const head = table.tHead?.rows[0];
  const body = table.tBodies[0];
  if (!head || !body || body.rows.length < 3) return;

  [...head.cells].forEach((th, index) => {
    if (!th.textContent.trim()) return;
    // Колонка без текстовых значений сортироваться не может: в ячейке
    // полоска доли, а не число. Значок сортировки над ней — чистый шум.
    if (!(body.rows[0]?.children[index]?.textContent ?? '').trim()) return;
    th.setAttribute('role', 'columnheader');
    th.tabIndex = 0;
    th.setAttribute('aria-sort', 'none');
    th.classList.add('is-sortable');

    const sort = () => {
      const current = th.getAttribute('aria-sort');
      const dir = current === 'descending' ? 1 : -1;
      const rows = [...body.rows];
      rows.sort((a, b) => {
        const va = value(a, index);
        const vb = value(b, index);
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb)) * dir;
      });
      for (const r of rows) body.appendChild(r);
      for (const other of head.cells) other.setAttribute('aria-sort', 'none');
      th.setAttribute('aria-sort', dir === -1 ? 'descending' : 'ascending');
    };

    th.addEventListener('click', sort);
    th.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sort(); }
    });
  });
}

for (const table of document.querySelectorAll('.table-wrap table')) makeSortable(table);
