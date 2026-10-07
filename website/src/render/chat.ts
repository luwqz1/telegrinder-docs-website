// Conversation scenes: what the bot does for a given code block.
// The same builders render the static transcript at build time and the animated one in the browser,
// so this module must stay free of Node APIs.
import { markSvg } from "./pixel";

export interface Selection {
  kind: "choice" | "checkbox";
  options: { value: string; label: string; selectedLabel: string }[][];
  picked: string[];
  ready: string;
  cancel?: string;
  resultPrefix: string;
}

export type ButtonAction = Step[] | { pick: string } | { finish: true } | { cancel: true };
export interface Button {
  t: string;
  s?: "primary" | "success" | "danger";
  action?: ButtonAction;
  pressed?: boolean;
}

export interface BotMessage {
  b: string;
  reply?: string;
  inline?: Button[][];
  selection?: Selection;
  html?: boolean;
}

export type Step =
  | { u: string }
  | BotMessage
  | { sys: string }
  | { kb: Button[][] | null }
  | { toast: string }
  | { edit: string; html?: boolean }
  | { sticker: true }
  | { photo: string; caption?: string; out?: boolean }
  | { album: string[]; caption?: string }
  | { del: true };

/** Scenes for one page, keyed by the zero-based index of the fenced code block. */
export type PageScenes = Record<number, Step[]>;

export interface ChatStrings {
  edited: string;
  popup: string;
  photo: string;
  sticker: string;
  deleted: string;
}

export const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

const TIME = "21:04";

export function keyboard(rows: Button[][], variant: "inline" | "reply", selection?: Selection): string {
  const body = rows
    .map((row) => `<div class="kb-row">${row.map((button) => {
      const style = button.s ? ` kb-${button.s}` : "";
      const pressed = button.pressed === undefined ? "" : ` aria-pressed="${button.pressed}"`;
      const action = button.action ? ` data-action="${esc(JSON.stringify(button.action))}"` : " disabled";
      return `<button type="button" class="kbtn${style}"${action}${pressed}><span>${esc(button.t)}</span></button>`;
    }).join("")}</div>`)
    .join("");
  const state = selection ? ` data-selection="${esc(JSON.stringify(selection))}"` : "";
  return `<div class="kb kb-${variant}"${state}>${body}</div>`;
}

function selectionKeyboard(selection: Selection): string {
  const rows: Button[][] = selection.options.map((row) => row.map((option) => {
    const pressed = selection.picked.includes(option.value);
    return { t: pressed ? option.selectedLabel : option.label, action: { pick: option.value }, pressed };
  }));
  rows.push([{ t: selection.ready, action: { finish: true } }]);
  if (selection.cancel) rows.push([{ t: selection.cancel, action: { cancel: true } }]);
  return keyboard(rows, "inline", selection);
}

export function chatContents(scenes: PageScenes, s: ChatStrings & {
  chatName: string; status: string; typing: string; replay: string; replayLabel: string;
}): string {
  const strings = { edited: s.edited, popup: s.popup, photo: s.photo, sticker: s.sticker, deleted: s.deleted, status: s.status, typing: s.typing };
  const data = JSON.stringify({ scenes, strings }).replace(/</g, "\\u003c");
  return `<div class="chat-head">
    <span class="chat-avatar">${markSvg()}</span>
    <div class="chat-who"><span class="chat-name">${esc(s.chatName)}</span><span class="chat-status"><span class="chat-status-text">${esc(s.status)}</span><i></i><i></i><i></i></span></div>
    <button class="chat-replay" type="button" aria-label="${esc(s.replayLabel)}">${esc(s.replay)}</button>
  </div><div class="chat-body"><div class="chat-log" aria-live="polite"></div></div><div class="chat-kb"></div>
  <script type="application/json" class="chat-data">${data}</script>`;
}

const text = (value: string, html?: boolean) => (html ? value : esc(value));

export function outgoing(value: string): string {
  return `<div class="msg out"><div class="bubble"><div class="body"><p>${esc(value)}</p><span class="meta"><time>${TIME}</time></span></div></div></div>`;
}

export function incoming(step: BotMessage, edited = "", editedLabel = ""): string {
  const quote = step.reply ? `<span class="quote">${esc(step.reply)}</span>` : "";
  const mark = edited ? `<span class="edited">${esc(editedLabel)}</span>` : "";
  const buttons = step.selection ? selectionKeyboard(step.selection) : step.inline ? keyboard(step.inline, "inline") : "";
  return `<div class="msg in"><div class="bubble"><div class="body">${quote}<p>${text(step.b, step.html)}</p><span class="meta">${mark}<time>${TIME}</time></span></div></div>${buttons}</div>`;
}

export const system = (value: string) => `<div class="sys"><span>${esc(value)}</span></div>`;

export const sticker = (s: ChatStrings) => `<div class="msg out sticker" role="img" aria-label="${esc(s.sticker)}">${markSvg("sticker-mark")}</div>`;

export function photo(step: { photo: string; caption?: string; out?: boolean }, s: ChatStrings): string {
  const caption = step.caption ? `<p>${esc(step.caption)}</p>` : "";
  return `<div class="msg ${step.out ? "out" : "in"} media"><div class="bubble"><div class="body"><span class="photo photo-${esc(step.photo)}" role="img" aria-label="${esc(s.photo)}"></span>${caption}<span class="meta"><time>${TIME}</time></span></div></div></div>`;
}

export function album(step: { album: string[]; caption?: string }, s: ChatStrings): string {
  const tiles = step.album.map((name) => `<span class="photo photo-${esc(name)}" role="img" aria-label="${esc(s.photo)}"></span>`).join("");
  const caption = step.caption ? `<p>${esc(step.caption)}</p>` : "";
  return `<div class="msg out media album"><div class="bubble"><div class="body"><span class="tiles">${tiles}</span>${caption}<span class="meta"><time>${TIME}</time></span></div></div></div>`;
}

/** The whole scene as it looks once it has finished playing. */
export function transcript(steps: Step[], s: ChatStrings): string {
  type Slot = string | { bot: BotMessage; edited: boolean; deleted: boolean };
  const out: Slot[] = [];
  let lastBot = -1;
  let reply: Button[][] | null = null;
  for (const step of steps) {
    if ("u" in step) out.push(outgoing(step.u));
    else if ("b" in step) lastBot = out.push({ bot: { ...step }, edited: false, deleted: false }) - 1;
    else if ("sys" in step) out.push(system(step.sys));
    else if ("toast" in step) out.push(system(`${s.popup}: ${step.toast}`));
    else if ("kb" in step) reply = step.kb;
    else if ("sticker" in step) out.push(sticker(s));
    else if ("photo" in step) out.push(photo(step, s));
    else if ("album" in step) out.push(album(step, s));
    else if ("edit" in step && lastBot >= 0) {
      const slot = out[lastBot] as Exclude<Slot, string>;
      slot.bot = { b: step.edit, html: step.html, reply: slot.bot.reply };
      slot.edited = true;
    } else if ("del" in step && lastBot >= 0) {
      (out[lastBot] as Exclude<Slot, string>).deleted = true;
    }
  }
  const html = out
    .map((slot) => {
      if (typeof slot === "string") return slot;
      if (slot.deleted) return system(s.deleted);
      return incoming(slot.bot, slot.edited ? "1" : "", s.edited);
    })
    .join("");
  return html + (reply ? keyboard(reply, "reply") : "");
}
