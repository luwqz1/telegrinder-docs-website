// Plays conversation scenes in the pixel chat next to the code that produces them.
import { type ButtonAction, type ChatStrings, type PageScenes, type Selection, type Step, album, esc, incoming, keyboard, outgoing, photo, sticker, system, transcript } from "../render/chat";
import { reducedMotion, wait } from "./env";

interface Data {
  scenes: PageScenes;
  strings: ChatStrings & { status: string; typing: string };
}

function player(chat: HTMLElement, data: Data) {
  const log = chat.querySelector<HTMLElement>(".chat-log")!;
  const kb = chat.querySelector<HTMLElement>(".chat-kb")!;
  const status = chat.querySelector<HTMLElement>(".chat-status-text")!;
  const body = chat.querySelector<HTMLElement>(".chat-body")!;
  let run = 0;
  let current: Step[] | null = null;
  let lastBot: HTMLElement | null = null;

  const add = (html: string) => {
    log.insertAdjacentHTML("beforeend", html);
    log.scrollTop = log.scrollHeight;
    return log.lastElementChild as HTMLElement;
  };
  const setKeyboard = (rows: Parameters<typeof keyboard>[0] | null) => {
    kb.innerHTML = rows ? keyboard(rows, "reply") : "";
  };
  const typing = (on: boolean) => {
    chat.classList.toggle("typing", on);
    status.textContent = on ? data.strings.typing : data.strings.status;
  };
  function interrupt() {
    run++;
    typing(false);
    body.querySelector(".chat-toast")?.remove();
    log.querySelectorAll(":scope > .typing-dots").forEach((el) => el.remove());
    log.querySelectorAll(".leaving").forEach((el) => el.classList.remove("leaving"));
    return run;
  }
  async function delay(ms: number, id: number) {
    await wait(ms);
    return id === run;
  }

  function still(steps: Step[]) {
    interrupt();
    current = steps;
    log.innerHTML = transcript(steps.filter((step) => !("kb" in step)), data.strings);
    for (const el of log.children) (el as HTMLElement).style.animation = "none";
    const bots = log.querySelectorAll<HTMLElement>(".msg.in");
    lastBot = bots.item(bots.length - 1);
    const lastKeyboard = [...steps].reverse().find((step): step is Extract<Step, { kb: unknown }> => "kb" in step);
    setKeyboard(lastKeyboard ? lastKeyboard.kb : null);
  }

  async function play(steps: Step[], append = false, target: HTMLElement | null = null) {
    if (!append && reducedMotion()) return still(steps);
    const id = interrupt();
    if (!append) {
      current = steps;
      log.innerHTML = "";
      setKeyboard(null);
      lastBot = null;
    } else if (target) {
      lastBot = target;
    }

    for (const step of steps) {
      if (id !== run) return;
      if ("u" in step) {
        if (!(await delay(420, id))) return;
        add(outgoing(step.u));
      } else if ("sticker" in step) {
        if (!(await delay(420, id))) return;
        add(sticker(data.strings));
      } else if ("photo" in step) {
        if (!(await delay(420, id))) return;
        const el = add(photo(step, data.strings));
        if (!step.out) lastBot = el;
      } else if ("album" in step) {
        if (!(await delay(420, id))) return;
        add(album(step, data.strings));
      } else if ("b" in step) {
        if (!(await delay(240, id))) return;
        const dots = add('<div class="typing-dots"><i></i><i></i><i></i></div>');
        typing(true);
        if (!(await delay(720, id))) return;
        dots.remove();
        typing(false);
        lastBot = add(incoming(step));
      } else if ("sys" in step) {
        if (!(await delay(360, id))) return;
        add(system(step.sys));
      } else if ("kb" in step) {
        if (!(await delay(220, id))) return;
        setKeyboard(step.kb);
      } else if ("toast" in step) {
        if (!(await delay(140, id))) return;
        const toast = document.createElement("div");
        toast.className = "chat-toast";
        toast.textContent = step.toast;
        body.appendChild(toast);
        await new Promise<void>((resolve) => setTimeout(resolve, 1500));
        if (id !== run) return;
        toast.remove();
      } else if ("edit" in step && lastBot) {
        if (!(await delay(900, id))) return;
        const p = lastBot.querySelector("p");
        if (p) p.innerHTML = step.html ? step.edit : esc(step.edit);
        lastBot.querySelector(".kb-inline")?.remove();
        const meta = lastBot.querySelector(".meta");
        if (meta && !meta.querySelector(".edited")) meta.insertAdjacentHTML("afterbegin", `<span class="edited">${esc(data.strings.edited)}</span>`);
        lastBot.classList.remove("edited");
        void lastBot.offsetWidth;
        lastBot.classList.add("edited");
      } else if ("del" in step && lastBot) {
        if (!(await delay(1000, id))) return;
        const gone = lastBot;
        gone.classList.add("leaving");
        if (!(await delay(320, id))) return;
        gone.replaceWith(document.createRange().createContextualFragment(system(data.strings.deleted)));
        lastBot = null;
      }
    }
  }

  chat.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(".kbtn");
    if (!button || button.disabled) return;
    event.stopPropagation();
    const action = JSON.parse(button.dataset.action!) as ButtonAction;
    const target = button.closest<HTMLElement>(".msg.in");
    if (Array.isArray(action)) {
      void play(action, true, target);
      return;
    }
    const markup = button.closest<HTMLElement>(".kb")!;
    const selection = JSON.parse(markup.dataset.selection!) as Selection;
    const options = selection.options.flat();
    if ("pick" in action) {
      interrupt();
      selection.picked = selection.kind === "choice" ? [action.pick]
        : selection.picked.includes(action.pick) ? selection.picked.filter((value) => value !== action.pick)
        : [...selection.picked, action.pick];
      markup.dataset.selection = JSON.stringify(selection);
      for (const item of markup.querySelectorAll<HTMLButtonElement>(".kbtn")) {
        const itemAction = JSON.parse(item.dataset.action!) as ButtonAction;
        if (Array.isArray(itemAction) || !("pick" in itemAction)) continue;
        const option = options.find((option) => option.value === itemAction.pick)!;
        const pressed = selection.picked.includes(option.value);
        item.querySelector("span")!.textContent = pressed ? option.selectedLabel : option.label;
        item.setAttribute("aria-pressed", String(pressed));
      }
    } else {
      const picked = "cancel" in action ? [] : options
        .filter((option) => selection.picked.includes(option.value)).map((option) => option.value);
      markup.querySelectorAll<HTMLButtonElement>(".kbtn").forEach((item) => { item.disabled = true; });
      void play([{ edit: selection.resultPrefix + picked.join(", ") }], true, target);
    }
  });
  chat.querySelector(".chat-replay")?.addEventListener("click", () => current && play(current));
  return { play, still };
}

export function initChats() {
  document.addEventListener("click", (e) => {
    const spoiler = (e.target as Element).closest(".spoiler");
    if (spoiler) spoiler.classList.toggle("open");
  });

  for (const chat of document.querySelectorAll<HTMLElement>("[data-chat]")) {
    const raw = chat.querySelector(".chat-data")?.textContent;
    if (!raw) continue;
    const data = JSON.parse(raw) as Data;
    const p = player(chat, data);
    if (chat.classList.contains("chat-inline")) {
      const fig = chat.previousElementSibling as HTMLElement;
      const steps = data.scenes[Number(chat.dataset.i)];
      p.still(steps);
      fig.addEventListener("click", (event) => {
        if ((event.target as Element).closest(".copy, a")) return;
        if (chat.offsetParent !== null) void p.play(steps);
        else p.still(steps);
      });
      const once = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting || chat.offsetParent === null) return;
        once.disconnect();
        void p.play(steps);
      }, { threshold: 0.25 });
      once.observe(chat);
      continue;
    }
    const scope = chat.closest(".doc") ?? document;
    const figures = [...scope.querySelectorAll<HTMLElement>("figure.code.has-scene")];
    if (!figures.length) continue;

    let live: HTMLElement | null = null;
    const visible = () => chat.offsetParent !== null;
    const activate = (fig: HTMLElement, animate: boolean) => {
      live?.classList.remove("live");
      live = fig;
      fig.classList.add("live");
      const steps = data.scenes[Number(fig.dataset.i)];
      if (!steps) return;
      if (animate && visible()) p.play(steps);
      else p.still(steps);
    };

    activate(figures[0], false);

    const seen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) entry.isIntersecting ? seen.add(entry.target) : seen.delete(entry.target);
      const top = figures.find((f) => seen.has(f));
      if (top && top !== live) activate(top, true);
    }, { rootMargin: "-38% 0px -52% 0px" });

    for (const fig of figures) {
      io.observe(fig);
      fig.addEventListener("click", (e) => {
        if ((e.target as Element).closest(".copy, a")) return;
        activate(fig, true);
      });
    }
  }
}
