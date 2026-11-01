/**
 * Уведомление в Telegram. Текст приходит аргументом или со stdin.
 *
 * Без секретов скрипт молча выходит с нулём. Канал оповещения не должен
 * ронять прогон: падение здесь означало бы, что сломанной считается сборка,
 * с которой всё в порядке, а до человека это всё равно не доедет.
 *
 * В сообщение не попадает ничего из данных, кроме имён файлов и счётчиков.
 * Telegram это внешний сервис, и пострадавшая организация не должна
 * оказаться в чужой инфраструктуре даже в виде уведомления.
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
const chat = process.env.TELEGRAM_CHAT_ID;

if (!token || !chat) {
  console.log('Telegram не настроен (нет TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID), пропускаю.');
  process.exit(0);
}

const fromArgv = process.argv.slice(2).join(' ').trim();
const text =
  fromArgv ||
  (await new Promise((done) => {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (buf += c));
    process.stdin.on('end', () => done(buf.trim()));
  }));

if (!text) {
  console.log('Пустое сообщение, отправлять нечего.');
  process.exit(0);
}

try {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chat,
      text: text.slice(0, 4000),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (res.ok) console.log('Уведомление отправлено.');
  else console.log(`Telegram ответил ${res.status}: ${(await res.text()).slice(0, 200)}`);
} catch (err) {
  // Недоступный Telegram это не сломанная сборка. Выход остаётся нулевым,
  // иначе красным становился бы прогон, с которым всё в порядке.
  console.log(`Telegram недоступен: ${err.message}`);
}
