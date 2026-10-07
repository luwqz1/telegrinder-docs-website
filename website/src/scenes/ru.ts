import type { Button, PageScenes, Step } from "../render/chat";

function numericKeyboard(kind: "reply" | "inline", handler: "none" | "one" | "all"): Button[][] {
  const buttons = ["1", "2", "3"].map((t): Button => {
    const handled = handler === "all" || (handler === "one" && t === "1");
    if (!handled) return { t };
    const response: Step = kind === "reply" ? { b: "Ты нажал кнопку 1" } : { toast: `Нажата кнопка ${t}` };
    return { t, action: kind === "reply" ? [{ u: t }, response] : [response] };
  });
  return [[buttons[0], buttons[1]], [buttons[2]]];
}

function fruitsKeyboard(handled: boolean): Button[][] {
  return [["Apple", "Banana"], ["Kiwi"]].map((row) => row.map((t): Button => {
    if (!handled || t !== "Apple") return { t };
    return { t, action: [{ u: t }, { kb: null }, { b: "Отличный выбор" }] };
  }));
}

// Ключи — ключи страниц, внутренние ключи — номер блока кода в главе.
// Ответы должны совпадать с тем, что реально вернёт код из главы.
export const scenes: Record<string, PageScenes> = {
  home: {
    0: [{ u: "/start" }, { b: "Hello, Георгий! I'm Telegrinder Demo." }],
  },
  "tutorial/1_setting_up": {
    0: [{ sys: "Бот создан, но ещё не слушает обновления" }],
    1: [{ u: "privetik" }, { b: "privetik" }, { sticker: true }, { sys: "В стикере нет текста, ответа нет" }],
    2: [{ sys: "bot.run_forever() запустил цикл обновлений" }, { u: "privetik" }, { b: "privetik" }],
    3: [{ u: "privetik" }, { b: "privetik" }, { sticker: true }, { b: "Нет текста" }],
  },
  "tutorial/2_rules": {
    0: [{ u: "что угодно" }, { sys: "Событие message попало во view сообщений" }],
    3: [{ u: "ping" }, { b: "Pong" }, { u: "pong" }, { sys: 'Text("ping") не совпал' }],
    5: [{ u: "/hey" }, { b: "Hey hey!" }, { sys: "Теперь пишет пользователь с другим ID" }, { u: "/hey" }, { sys: "IsMessageFromUserId(123) вернул False" }],
    6: [{ u: "2 + 3" }, { b: "5" }, { u: "12 + 30" }, { b: "42" }],
    7: [{ u: "42" }, { b: "42 / 3 = 14.0", reply: "42" }, { u: "сорок два" }, { sys: "IsIntegerText вернул False" }],
  },
  "tutorial/4_api": {
    0: [{ u: "привет" }, { b: "Hi!" }],
    2: [{ u: "привет" }, { sys: "message.api.send_message(chat_id=…)" }, { b: "Hi!" }],
    3: [{ u: "привет" }, { b: "Hi!" }, { sys: "case Ok(message): message_id сохранён" }],
    5: [{ b: "Happy birthday" }, { edit: "Oops wrong chat" }, { del: true }],
  },
  "tutorial/5_nodes": {
    1: [{ u: "ПРИВЕТ, БОТ" }, { b: "привет, бот" }, { sticker: true }, { sys: "NodeError: Message has no text." }],
    4: [{ u: "39" }, { b: "39 + 3 = 42" }, { u: "abc" }, { sys: "NodeError: Text is not a digit." }],
  },
  "tutorial/6_dispatch": {
    1: [{ u: "/repeat да 3" }, { b: "да, да, да" }, { u: "/repeat ок" }, { b: "ок, ок, ок, ок, ок" }],
    2: [{ sys: "bot.on.load(chat_utilities.dp)" }, { u: "/repeat да 2" }, { b: "да, да" }],
    5: [{ u: "/ban" }, { sys: "admin_router ещё не подключён к боту" }],
    6: [{ sys: "bot.on.load(admin)" }, { u: "/ban" }, { b: "Admin action" }],
  },
  "tutorial/7_keyboard": {
    1: [{ u: "/keyboard" }, { b: "Вот клавиатура" }, { kb: numericKeyboard("reply", "none") }],
    2: [{ kb: numericKeyboard("reply", "one") }],
    4: [{ u: "/eat" }, { b: "Что съесть?" }, { kb: fruitsKeyboard(false) }],
    5: [{ u: "/eat" }, { b: "Что съесть?" }, { kb: fruitsKeyboard(true) }],
    6: [
      { sys: "MenuKeyboard.get_markup()" },
      { kb: [
        [
          { t: "Profile", s: "success" },
          { t: "Balance", s: "primary" },
        ],
        [{ t: "Exit", s: "danger" }],
      ] },
    ],
    8: [{ u: "/inline_keyboard" }, { b: "Вот инлайн-клавиатура", inline: numericKeyboard("inline", "none") }],
    9: [{ u: "/inline_keyboard" }, { b: "Вот инлайн-клавиатура", inline: numericKeyboard("inline", "one") }],
    11: [{ b: "Вот инлайн-клавиатура", inline: numericKeyboard("inline", "all") }],
    13: [{ b: "🍩", inline: [[{ t: "Buy doughnut", action: [{ edit: "You bought doughnut for 100" }] }]] }],
  },
  "tutorial/8_text": {
    0: [
      { u: "/formatting" },
      { b: "<b><i>Жирный и курсивный текст</i></b>", html: true },
      { b: 'Привет, <a class="mention">Георгий</a>!', html: true },
      { b: '<span class="datetime">Завтра</span>', html: true },
    ],
    2: [
      { sys: "Так этот text выглядит в Telegram" },
      {
        b: 'Документация: <a>Python docs</a><br>Токен: <span class="spoiler"><code>123:secret-token</code></span><br><b>Не показывай это никому.</b>',
        html: true,
      },
    ],
    4: [{ sys: "first_name равен <i>Георгий</i>" }, { u: "привет" }, { b: "Твой ник: <b>&lt;i&gt;Георгий&lt;/i&gt;</b>", html: true }],
    6: [{ sys: "Язык пользователя: ru" }, { u: "hi" }, { b: "привет" }, { u: "hello" }, { b: "Привет, Георгий!" }],
  },
  "tutorial/9_states": {
    0: [
      { u: "привет" }, { b: "Сейчас ты normal." },
      { u: "/bless" }, { b: "Теперь ты blessed." },
      { u: "/curse" }, { b: "Теперь ты cursed." },
      { u: "/bless" }, { b: "Сейчас ты cursed." },
    ],
    3: [
      { u: "/choice" },
      { b: "Choose something", selection: {
        kind: "choice", picked: ["banana"], ready: "Ready", resultPrefix: "You chose: ",
        options: [
          [{ value: "apple", label: "Apple 🔴", selectedLabel: "Apple 🟢" }],
          [{ value: "banana", label: "Banana 🔴", selectedLabel: "Banana 🟢" }],
          [{ value: "pear", label: "Pear 🔴", selectedLabel: "Pear 🟢" }],
        ],
      } },
    ],
    4: [
      { u: "/checkbox" },
      { b: "Check your checkbox", selection: {
        kind: "checkbox", picked: ["banana"], ready: "Ready", cancel: "Cancel", resultPrefix: "You picked: ",
        options: [
          [{ value: "apple", label: "Apple", selectedLabel: "Apple 🍏" }, { value: "banana", label: "Banana", selectedLabel: "Banana 🍌" }],
          [{ value: "pear", label: "Pear", selectedLabel: "Pear 🍐" }],
        ],
      } },
    ],
    6: [
      { u: "/die" }, { b: "Теперь ты мёртв, причина: sadness" },
      { u: "как дела?" }, { b: "Сейчас ты мёртв, причина: sadness" },
      { u: "/resurrect" }, { b: "Ты воскрес" },
      { u: "как дела?" }, { b: "Сейчас ты живой" },
    ],
    8: [{ u: "/be_born" }, { b: "Ты родился" }, { u: "Gh0$T_рa$$w0rd" }, { b: "Теперь ты призрак" }],
  },
  "tutorial/10_media": {
    0: [{ u: "/photo" }, { photo: "satie", caption: "Erik" }],
    1: [{ photo: "cat", out: true }, { b: "Photo downloaded!" }],
    2: [{ photo: "kitten", out: true }, { b: "Путь к файлу: photos/file_0.jpg" }],
    3: [{ album: ["satie", "cat", "kitten"], caption: "assets" }, { b: "Received media group with 3 items<br>Caption: assets", html: true }],
  },
  "tutorial/11_handling_errors": {
    0: [
      { u: "oops" }, { b: "Oh no" }, { b: "Что-то пошло не так: Wow" },
      { u: "woops" }, { b: "Что-то пошло не так: Wow oopsii!" },
    ],
  },
};
