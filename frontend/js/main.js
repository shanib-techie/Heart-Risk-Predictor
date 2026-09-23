/*
 * main.js — behaviour shared by every page (needs fields.js loaded first).
 */

const CONFIG = {
  // Empty string = same server that serves this website (the normal case with FastAPI StaticFiles).
  // If you open the pages from another port (e.g. VS Code Live Server), set it to "http://127.0.0.1:8000"
  // and enable CORS in main.py.
  API_BASE: "",
  STATS_URL: "data/model_stats.json",
};

/* ------------------------------------------------------------------ navigation */

function initNav() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  if (!header || !toggle) return;

  const setOpen = (open) => {
    header.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };
  toggle.addEventListener("click", () => setOpen(!header.classList.contains("nav-open")));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  header.querySelectorAll(".site-nav a").forEach((a) => a.addEventListener("click", () => setOpen(false)));

  // Highlight the current page (body has data-page="home|parameters|prediction|about")
  const current = document.body.dataset.page;
  header.querySelectorAll("[data-nav]").forEach((a) => {
    if (a.dataset.nav === current) a.setAttribute("aria-current", "page");
  });
}

/* ------------------------------------------------------------------ model stats */

let statsPromise = null;

/** Loads data/model_stats.json once. Resolves to null if it cannot be loaded. */
function loadStats() {
  if (!statsPromise) {
    statsPromise = fetch(CONFIG.STATS_URL)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return statsPromise;
}

const pct = (value, digits = 2) => (value * 100).toFixed(digits) + "%";

/** Turns a model column name into a readable label, e.g. "smoker_status_Current" -> "Smoking status: Current". */
function prettyFeature(name) {
  const direct = FIELDS.find((f) => f.key === name);
  if (direct) return direct.label;
  if (EXTRA_LABELS[name]) return EXTRA_LABELS[name];

  // one-hot columns look like "<field>_<category>"
  const parent = [...FIELDS.map((f) => f.key), ...Object.keys(EXTRA_LABELS)]
    .sort((a, b) => b.length - a.length)
    .find((k) => name.startsWith(k + "_"));
  if (parent) {
    const parentLabel = (FIELDS.find((f) => f.key === parent) || {}).label || EXTRA_LABELS[parent];
    return `${parentLabel}: ${name.slice(parent.length + 1)}`;
  }
  return name;
}

/** Plain-language caveats that go with the numbers, depending on where the numbers came from. */
function statsNotes(stats) {
  if (!stats) return [];
  if (stats.source === "script") {
    return [
      "All scores were computed on the same 80/20 train-test split (random_state 42) using the same 26 model columns as the deployed API.",
    ];
  }
  const notes = [
    "Precision, recall and F1 were not printed in the notebook. They are calculated here from the notebook’s confusion matrices, with “has heart disease” as the positive class.",
    "These experiments were run while chest pain type and family history were still in the data (31 model columns). The deployed model leaves both out (26 columns), so its exact scores may differ slightly.",
    "Logistic Regression stopped at scikit-learn’s default of 100 iterations without converging, and the features were not scaled. Its scores may understate what the algorithm can do.",
  ];
  if (stats.models.some((m) => m.roc_auc_inferred)) {
    notes.push("† The Random Forest ROC-AUC comes from a notebook cell that does not name its model. It is attributed to Random Forest because that cell ran right after the Random Forest cell.");
  }
  notes.push("Cross-validation scores are not shown. The notebook’s cross-validation cells reuse a variable that each model cell overwrites, so the scores cannot be tied to one model with certainty.");
  return notes;
}

/* ------------------------------------------------------------------ feature-importance bar chart */

/**
 * Draws the LightGBM feature importance as horizontal bars.
 * rows: [{feature, score, in_deployed_model}] sorted high to low.
 * Bars grow when the chart scrolls into view.
 */
function renderImportanceChart(container, rows, limit) {
  const visible = limit ? rows.slice(0, limit) : rows;
  const max = rows[0].score;
  const list = document.createElement("ol");
  list.className = "bars";
  list.setAttribute("aria-label", "Feature importance, highest first");

  visible.forEach((row, i) => {
    const li = document.createElement("li");
    li.className = "bar-row" + (i < 3 ? " is-top" : "") + (row.in_deployed_model ? "" : " is-muted");
    li.style.setProperty("--w", ((row.score / max) * 100).toFixed(1) + "%");
    li.style.setProperty("--i", Math.min(i, 14));
    li.title = `${prettyFeature(row.feature)}: used in ${row.score} tree splits`;

    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = prettyFeature(row.feature);
    if (!row.in_deployed_model) {
      const tag = document.createElement("small");
      tag.textContent = "not in the API";
      label.append(" ", tag);
    }

    const track = document.createElement("span");
    track.className = "bar-track";
    track.innerHTML = '<span class="bar-fill"></span>';

    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = row.score;

    li.append(label, track, value);
    list.append(li);
  });

  container.replaceChildren(list);
  revealWhenVisible(list);
}

/** Mounts the chart and, if a toggle button is given, wires a "Show all / Show top N" switch. */
async function mountImportanceChart(container, { limit = 10, toggle = null, noteEl = null } = {}) {
  const stats = await loadStats();
  if (!stats) {
    container.innerHTML = '<p class="load-error">Feature importance could not be loaded (data/model_stats.json). Open the site through the FastAPI server.</p>';
    return;
  }
  const rows = [...stats.feature_importance].sort((a, b) => b.score - a.score);
  let showAll = !limit || rows.length <= limit;

  const draw = () => {
    renderImportanceChart(container, rows, showAll ? 0 : limit);
    if (toggle) toggle.textContent = showAll ? `Show top ${limit} only` : `Show all ${rows.length}`;
  };
  draw();

  if (toggle) {
    toggle.hidden = rows.length <= limit;
    toggle.addEventListener("click", () => { showAll = !showAll; draw(); });
  }
  if (noteEl && stats.source !== "script" && rows.some((r) => !r.in_deployed_model)) {
    noteEl.textContent = "These counts come from the notebook run, which still included chest pain type and family history. Those rows are greyed out because the deployed API does not use them.";
  }
}

/* ------------------------------------------------------------------ inline numbers in page text */

/**
 * Fills <span data-stat="..."> elements with numbers from model_stats.json, so the text on the pages
 * always matches the data. The text already inside each span is the fallback if the file cannot load.
 */
function fillStatSpans(stats) {
  if (!stats) return;
  const n = (v) => Number(v).toLocaleString("en-US");
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight"];
  const final = stats.models.find((m) => m.final) || stats.models[stats.models.length - 1];
  const values = {
    "total-rows": n(stats.dataset.train_rows + stats.dataset.test_rows),
    "train-rows": n(stats.dataset.train_rows),
    "test-rows": n(stats.dataset.test_rows),
    "model-count": words[stats.models.length] || stats.models.length,
    "final-accuracy": pct(final.accuracy),
    "final-recall": pct(final.recall),
    "final-roc": final.roc_auc == null ? "n/a" : final.roc_auc.toFixed(4),
  };
  document.querySelectorAll("[data-stat]").forEach((el) => {
    if (values[el.dataset.stat] !== undefined) el.textContent = values[el.dataset.stat];
  });
}

/* ------------------------------------------------------------------ small helpers */

const inViewObserver = typeof window.IntersectionObserver === "function"
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("in-view"); inViewObserver.unobserve(entry.target); }
      });
    }, { threshold: 0.15 })
  : null;

/** Adds .in-view once the element is on screen (or straight away if unsupported). */
function revealWhenVisible(el) {
  if (inViewObserver) inViewObserver.observe(el); else el.classList.add("in-view");
}

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  document.querySelectorAll("[data-reveal]").forEach(revealWhenVisible);
  if (document.querySelector("[data-stat]")) loadStats().then(fillStatSpans);
});
