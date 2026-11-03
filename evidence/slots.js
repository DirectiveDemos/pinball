// Fixed same-origin template script. Reads session.json in this directory and shows the matching placeholder from the page's fixed wording. The
// attachment and evidence tasks write only those files and never edit HTML. Anything missing,
// unreadable or unknown shows the initial state, so the page never claims more than the record has.
// A final evidence record is shown as plain text (textContent only): fixed labels, then the record's
// own values as data. A final record that is not that shape shows "not yet published", never a partial
// view. This is the one page file the allowlist lets call fetch, and only while it matches its pin.

/** @typedef {"reel" | "evidence"} SlotKind */

export const SLOTS = Object.freeze({
  reel: Object.freeze({ file: "reel/video.json", schema: "directive-demos.reel", initial: "not-available" }),
  evidence: Object.freeze({ file: "session.json", schema: "directive-demos.evidence", initial: "not-published" }),
});

/** @type {readonly SlotKind[]} */
export const SLOT_KINDS = Object.freeze(["reel", "evidence"]);

/** Label keys the final evidence view requires. A missing label is a malformed page, so the view is not shown. */
const EVIDENCE_LABEL_KEYS = Object.freeze([
  "pageDir", "game", "catalogVersion", "options", "status", "goAcceptedAt", "deliveredAt", "goToDeliveryMs", "drawDescriptionGiven",
  "timeline", "at", "kind", "stage", "runId", "outcome", "eventId",
  "contributions", "runIds", "models", "startedAt", "endedAt", "durationMs", "documentRevisionId", "documentSha256",
  "challenge", "verdict", "checkedScopeRecorded",
  "review", "result", "commitSha", "publicCheck", "repairs",
  "implementation", "base", "head", "pinnedFiles", "perDemoFiles", "generatedFiles", "diffFiles", "additions", "deletions", "paths",
  "governance", "founderAuthorized", "publishCommit", "pageTreeHash", "publicUrlVerified", "crewReleased", "evidenceComplete",
  "integrity", "manifestVersion", "manifestSha256", "artifacts", "name", "sha256",
]);

const SESSION_KEYS = Object.freeze(["pageDir", "game", "catalogVersion", "options", "status", "goAcceptedAt", "deliveredAt", "goToDeliveryMs", "drawDescriptionGiven"]);
const TIMELINE_KEYS = Object.freeze(["eventId", "at", "kind", "stage", "runId", "outcome"]);
const CONTRIBUTION_KEYS = Object.freeze(["stage", "runIds", "models", "startedAt", "endedAt", "durationMs", "status", "documentRevisionId", "documentSha256"]);
const CHALLENGE_KEYS = Object.freeze(["verdict", "checkedScopeRecorded", "documentSha256"]);
const REVIEW_KEYS = Object.freeze(["result", "commitSha", "publicCheck", "repairs", "documentSha256"]);
const IMPLEMENTATION_KEYS = Object.freeze(["base", "head", "pinnedFiles", "perDemoFiles", "generatedFiles", "diff"]);
const DIFF_KEYS = Object.freeze(["files", "additions", "deletions", "paths"]);
const GOVERNANCE_KEYS = Object.freeze(["founderAuthorized", "publishCommit", "pageTreeHash", "publicUrlVerified", "crewReleased", "evidenceComplete"]);
const INTEGRITY_KEYS = Object.freeze(["manifestVersion", "manifestSha256", "artifacts"]);
const ARTIFACT_KEYS = Object.freeze(["name", "sha256"]);
const ROOT_KEYS = Object.freeze(["schema", "version", "state", "session", "timeline", "contributions", "challenge", "review", "implementation", "governance", "integrity"]);

/**
 * The state to show for one slot: the record's state when it is well formed and listed, else initial.
 * A listed `final` still has to match the evidence shape before the page will show it (`finalEvidenceText`).
 * @param {SlotKind} kind
 * @param {unknown} record parsed slot file, or null when absent
 * @param {Record<string, string>} states wording for this slot: state -> text
 */
export function slotState(kind, record, states) {
  const r = /** @type {any} */ (record);
  const ok = r && typeof r === "object" && r.schema === SLOTS[kind].schema && r.version === 1 && typeof r.state === "string" && Object.hasOwn(states, r.state);
  return ok ? r.state : SLOTS[kind].initial;
}

/**
 * @param {unknown} value
 * @param {readonly string[]} keys
 * @returns {Record<string, unknown> | null}
 */
function exactRecord(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = /** @type {Record<string, unknown>} */ (value);
  if (Object.keys(obj).length !== keys.length) return null;
  for (const key of keys) if (!Object.hasOwn(obj, key)) return null;
  return obj;
}

/** @param {unknown} value @returns {unknown[] | null} */
function exactArray(value) {
  if (!Array.isArray(value) || Object.keys(value).length !== value.length) return null;
  return value;
}

/**
 * @param {unknown} view
 * @returns {{ yes: string, no: string, none: string, labels: Record<string, string> } | null}
 */
function evidenceWording(view) {
  if (!view || typeof view !== "object" || Array.isArray(view)) return null;
  const v = /** @type {Record<string, unknown>} */ (view);
  if (typeof v.yes !== "string" || v.yes === "" || typeof v.no !== "string" || v.no === "" || typeof v.none !== "string" || v.none === "") return null;
  if (!v.labels || typeof v.labels !== "object" || Array.isArray(v.labels)) return null;
  const raw = /** @type {Record<string, unknown>} */ (v.labels);
  /** @type {Record<string, string>} */
  const labels = {};
  for (const key of EVIDENCE_LABEL_KEYS) {
    const text = raw[key];
    if (typeof text !== "string" || text === "") return null;
    labels[key] = text;
  }
  return { yes: v.yes, no: v.no, none: v.none, labels };
}

/**
 * @param {{ yes: string, no: string, none: string }} words
 * @param {unknown} value
 * @param {"s" | "s?" | "b"} type
 * @returns {string | null}
 */
function scalar(words, value, type) {
  if (type === "s") return typeof value === "string" ? value : null;
  if (type === "s?") return value === null ? words.none : typeof value === "string" ? value : null;
  if (typeof value !== "boolean") return null;
  return value ? words.yes : words.no;
}

/** @param {unknown} value @param {number} min @returns {string | null} */
function whole(value, min) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) return null;
  return String(value);
}

/**
 * @param {Record<string, string>} labels
 * @param {string} key
 * @param {string | null} value
 * @returns {string | null}
 */
function pair(labels, key, value) {
  if (value === null) return null;
  const name = labels[key];
  if (!name) return null;
  return `${name}: ${value}`;
}

/**
 * @param {{ none: string }} words
 * @param {unknown} value
 * @param {boolean} allowEmpty
 * @returns {string | null}
 */
function stringList(words, value, allowEmpty) {
  const items = exactArray(value);
  if (!items) return null;
  if (items.length === 0) return allowEmpty ? words.none : null;
  if (!items.every((item) => typeof item === "string")) return null;
  return items.join(", ");
}

/**
 * @param {{ none: string }} words
 * @param {unknown} value
 * @returns {string | null}
 */
function optionsText(words, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = /** @type {Record<string, unknown>} */ (value);
  const keys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (keys.length === 0) return words.none;
  /** @type {string[]} */
  const parts = [];
  for (const key of keys) {
    if (typeof obj[key] !== "string") return null;
    parts.push(`${key}=${/** @type {string} */ (obj[key])}`);
  }
  return parts.join(", ");
}

/** @param {string} text */
function indent(text) {
  return text.split("\n").map((line) => `  ${line}`).join("\n");
}

/**
 * @param {Record<string, string>} labels
 * @param {string} key
 * @returns {string | null}
 */
function title(labels, key) {
  const name = labels[key];
  return name ? name : null;
}

/**
 * @param {{ yes: string, no: string, none: string }} words
 * @param {Record<string, string>} labels
 * @param {string} key
 * @param {unknown[] | null} items
 * @param {(item: unknown) => string | null} row
 * @returns {string | null}
 */
function block(words, labels, key, items, row) {
  const name = title(labels, key);
  if (!name || !items) return null;
  if (items.length === 0) return `${name}: ${words.none}`;
  /** @type {string[]} */
  const rows = [];
  for (const item of items) {
    const line = row(item);
    if (line === null) return null;
    rows.push(line);
  }
  return `${name}:\n${rows.join("\n")}`;
}

/**
 * @param {{ yes: string, no: string, none: string }} words
 * @param {Record<string, string>} labels
 * @param {unknown} item
 * @returns {string | null}
 */
function timelineRow(words, labels, item) {
  const o = exactRecord(item, TIMELINE_KEYS);
  if (!o) return null;
  const parts = [
    pair(labels, "at", scalar(words, o.at, "s")),
    pair(labels, "kind", scalar(words, o.kind, "s")),
    pair(labels, "stage", scalar(words, o.stage, "s?")),
    pair(labels, "runId", scalar(words, o.runId, "s?")),
    pair(labels, "outcome", scalar(words, o.outcome, "s")),
    pair(labels, "eventId", scalar(words, o.eventId, "s")),
  ];
  if (parts.some((part) => part === null)) return null;
  return `  ${parts.join(" | ")}`;
}

/**
 * @param {{ yes: string, no: string, none: string }} words
 * @param {Record<string, string>} labels
 * @param {unknown} item
 * @returns {string | null}
 */
function contributionRow(words, labels, item) {
  const o = exactRecord(item, CONTRIBUTION_KEYS);
  if (!o) return null;
  const parts = [
    pair(labels, "stage", scalar(words, o.stage, "s")),
    pair(labels, "runIds", stringList(words, o.runIds, false)),
    pair(labels, "models", stringList(words, o.models, true)),
    pair(labels, "startedAt", scalar(words, o.startedAt, "s?")),
    pair(labels, "endedAt", scalar(words, o.endedAt, "s?")),
    pair(labels, "durationMs", o.durationMs === null ? words.none : whole(o.durationMs, 0)),
    pair(labels, "status", scalar(words, o.status, "s")),
    pair(labels, "documentRevisionId", scalar(words, o.documentRevisionId, "s?")),
    pair(labels, "documentSha256", scalar(words, o.documentSha256, "s?")),
  ];
  if (parts.some((part) => part === null)) return null;
  return `  ${parts.join(" | ")}`;
}

/**
 * @param {{ yes: string, no: string, none: string }} words
 * @param {Record<string, string>} labels
 * @param {string} key
 * @param {unknown} value
 * @param {readonly string[]} keys
 * @param {boolean} allowNull
 * @param {(o: Record<string, unknown>) => (string | null)[]} fields
 * @returns {string | null}
 */
function objectBlock(words, labels, key, value, keys, allowNull, fields) {
  const name = title(labels, key);
  if (!name) return null;
  if (value === null) return allowNull ? `${name}: ${words.none}` : null;
  const o = exactRecord(value, keys);
  if (!o) return null;
  const rows = fields(o);
  if (rows.some((row) => row === null)) return null;
  return `${name}:\n${/** @type {string[]} */ (rows).map((row) => indent(row)).join("\n")}`;
}

/**
 * Plain text for a final evidence record, or null when the record or the labels are not the fixed shape.
 * Callers assign the result with textContent and never with innerHTML. Every value from the record is data.
 * @param {unknown} record
 * @param {unknown} view wording.evidenceView
 * @param {unknown} heading the `final` state line
 * @returns {string | null}
 */
export function finalEvidenceText(record, view, heading) {
  const words = evidenceWording(view);
  if (!words || typeof heading !== "string" || heading === "") return null;
  const labels = words.labels;
  const root = exactRecord(record, ROOT_KEYS);
  if (!root || root.schema !== SLOTS.evidence.schema || root.version !== 1 || root.state !== "final") return null;

  const session = exactRecord(root.session, SESSION_KEYS);
  if (!session) return null;
  const sessionLines = [
    pair(labels, "pageDir", scalar(words, session.pageDir, "s")),
    pair(labels, "game", scalar(words, session.game, "s")),
    pair(labels, "catalogVersion", whole(session.catalogVersion, 1)),
    pair(labels, "options", optionsText(words, session.options)),
    pair(labels, "status", scalar(words, session.status, "s")),
    pair(labels, "goAcceptedAt", scalar(words, session.goAcceptedAt, "s")),
    pair(labels, "deliveredAt", scalar(words, session.deliveredAt, "s")),
    pair(labels, "goToDeliveryMs", whole(session.goToDeliveryMs, 0)),
    pair(labels, "drawDescriptionGiven", scalar(words, session.drawDescriptionGiven, "b")),
  ];
  if (sessionLines.some((line) => line === null)) return null;

  const timeline = block(words, labels, "timeline", exactArray(root.timeline), (item) => timelineRow(words, labels, item));
  const contributions = block(words, labels, "contributions", exactArray(root.contributions), (item) => contributionRow(words, labels, item));
  const challenge = objectBlock(words, labels, "challenge", root.challenge, CHALLENGE_KEYS, true, (o) => [
    pair(labels, "verdict", scalar(words, o.verdict, "s")),
    pair(labels, "checkedScopeRecorded", scalar(words, o.checkedScopeRecorded, "b")),
    pair(labels, "documentSha256", scalar(words, o.documentSha256, "s")),
  ]);
  const review = objectBlock(words, labels, "review", root.review, REVIEW_KEYS, false, (o) => [
    pair(labels, "result", scalar(words, o.result, "s")),
    pair(labels, "commitSha", scalar(words, o.commitSha, "s")),
    pair(labels, "publicCheck", scalar(words, o.publicCheck, "s")),
    pair(labels, "repairs", whole(o.repairs, 0)),
    pair(labels, "documentSha256", scalar(words, o.documentSha256, "s")),
  ]);
  const implementation = objectBlock(words, labels, "implementation", root.implementation, IMPLEMENTATION_KEYS, false, (o) => {
    const diff = exactRecord(o.diff, DIFF_KEYS);
    if (!diff) return [null];
    return [
      pair(labels, "base", scalar(words, o.base, "s")),
      pair(labels, "head", scalar(words, o.head, "s")),
      pair(labels, "pinnedFiles", whole(o.pinnedFiles, 0)),
      pair(labels, "perDemoFiles", whole(o.perDemoFiles, 0)),
      pair(labels, "generatedFiles", stringList(words, o.generatedFiles, true)),
      pair(labels, "diffFiles", whole(diff.files, 0)),
      pair(labels, "additions", whole(diff.additions, 0)),
      pair(labels, "deletions", whole(diff.deletions, 0)),
      pair(labels, "paths", stringList(words, diff.paths, true)),
    ];
  });
  const governance = objectBlock(words, labels, "governance", root.governance, GOVERNANCE_KEYS, false, (o) => [
    pair(labels, "founderAuthorized", scalar(words, o.founderAuthorized, "b")),
    pair(labels, "publishCommit", scalar(words, o.publishCommit, "s")),
    pair(labels, "pageTreeHash", scalar(words, o.pageTreeHash, "s")),
    pair(labels, "publicUrlVerified", scalar(words, o.publicUrlVerified, "b")),
    pair(labels, "crewReleased", scalar(words, o.crewReleased, "b")),
    pair(labels, "evidenceComplete", scalar(words, o.evidenceComplete, "b")),
  ]);
  const integrity = objectBlock(words, labels, "integrity", root.integrity, INTEGRITY_KEYS, false, (o) => {
    const artifacts = block(words, labels, "artifacts", exactArray(o.artifacts), (item) => {
      const a = exactRecord(item, ARTIFACT_KEYS);
      if (!a) return null;
      const parts = [pair(labels, "name", scalar(words, a.name, "s")), pair(labels, "sha256", scalar(words, a.sha256, "s"))];
      if (parts.some((part) => part === null)) return null;
      return `  ${parts.join(" | ")}`;
    });
    if (artifacts === null) return [null];
    return [
      pair(labels, "manifestVersion", whole(o.manifestVersion, 1)),
      pair(labels, "manifestSha256", scalar(words, o.manifestSha256, "s")),
      artifacts,
    ];
  });

  const sections = [timeline, contributions, challenge, review, implementation, governance, integrity];
  if (sections.some((section) => section === null)) return null;
  return [heading, .../** @type {string[]} */ (sessionLines), .../** @type {string[]} */ (sections)].join("\n");
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, string>}
 */
function isStringMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((item) => typeof item === "string");
}

/**
 * @typedef {{ textContent: string | null, dataset: Record<string, string | undefined> }} SlotElement
 * @param {{ getElementById(id: string): SlotElement | null }} doc
 * @param {(file: string) => Promise<unknown>} load returns the parsed file, or null
 */
export async function applySlots(doc, load) {
  const wordingEl = doc.getElementById("demo-slots");
  const embedded = /** @type {Record<string, unknown>} */ (JSON.parse(wordingEl?.textContent ?? "{}"));
  for (const kind of SLOT_KINDS) {
    const el = doc.getElementById(`slot-${kind}`);
    const states = embedded[kind];
    if (!el || !isStringMap(states)) continue;
    /** @type {unknown} */
    let record = null;
    try {
      record = await load(SLOTS[kind].file);
    } catch {
      record = null;
    }
    const state = slotState(kind, record, states);
    if (kind === "evidence" && state === "final") {
      const text = finalEvidenceText(record, embedded.evidenceView, states.final);
      const shown = text ?? states[SLOTS.evidence.initial];
      if (typeof shown !== "string") continue;
      el.textContent = shown;
      el.dataset.state = text === null ? SLOTS.evidence.initial : "final";
      continue;
    }
    const text = states[state];
    if (typeof text !== "string") continue;
    el.textContent = text;
    el.dataset.state = state;
  }
}

if (typeof document !== "undefined") {
  void applySlots(document, async (file) => {
    const res = await fetch(new URL(`./${file}`, import.meta.url), { credentials: "omit", cache: "no-store", redirect: "error" });
    return res.ok ? res.json() : null;
  });
}
