/*
 * about.js — comparison table, confusion matrix, "why LightGBM" summary and notes.
 * Everything is generated from data/model_stats.json.
 */

(async function () {
  const stats = await loadStats();
  const tableEl = document.getElementById("metrics-table");
  const matrixEl = document.getElementById("confusion-matrix");
  const reasonsEl = document.getElementById("why-list");
  const notesEl = document.getElementById("stats-notes");

  mountImportanceChart(document.getElementById("importance-chart"), {
    limit: 10,
    toggle: document.getElementById("importance-toggle"),
    noteEl: document.getElementById("importance-note"),
  });

  if (!stats) {
    const msg = '<p class="load-error">Model results could not be loaded (data/model_stats.json). Open the site through the FastAPI server.</p>';
    tableEl.innerHTML = msg;
    return;
  }

  const models = stats.models;
  const final = models.find((m) => m.final) || models[models.length - 1];
  const four = (v) => v.toFixed(4);
  const lower = (label) => (/^[A-Z]{2,}|F1/.test(label) ? label : label.toLowerCase());   // keep ROC-AUC / F1 as written

  const COLUMNS = [
    { key: "accuracy",  label: "Accuracy",  fmt: pct },
    { key: "precision", label: "Precision", fmt: pct },
    { key: "recall",    label: "Recall",    fmt: pct },
    { key: "f1",        label: "F1 score",  fmt: pct },
    { key: "roc_auc",   label: "ROC-AUC",   fmt: four },
  ];
  if (models.some((m) => m.cv_accuracy != null)) {
    COLUMNS.push({ key: "cv_accuracy", label: "5-fold CV accuracy", fmt: pct });
  }

  /* ---- comparison table; the best value in each column is highlighted */
  const best = {};
  COLUMNS.forEach((c) => {
    const vals = models.map((m) => m[c.key]).filter((v) => v != null);
    best[c.key] = vals.length ? Math.max(...vals) : null;
  });

  const head = COLUMNS.map((c) => `<th scope="col">${c.label}</th>`).join("");
  const rows = models.map((m) => {
    const cells = COLUMNS.map((c) => {
      const v = m[c.key];
      if (v == null) return '<td class="na">Not calculated</td>';
      const mark = c.key === "roc_auc" && m.roc_auc_inferred ? "†" : "";
      return `<td class="${v === best[c.key] ? "best" : ""}">${c.fmt(v)}${mark}</td>`;
    }).join("");
    const badge = m.final ? '<span class="final-tag">Final model</span>' : "";
    return `<tr class="${m.final ? "is-final" : ""}"><th scope="row">${m.name}${badge}</th>${cells}</tr>`;
  }).join("");

  tableEl.innerHTML = `<table class="metrics">
    <caption>Scores on the held-out test set (${Number(stats.dataset.test_rows).toLocaleString("en-US")} records). Best value in each column is highlighted.</caption>
    <thead><tr><th scope="col">Model</th>${head}</tr></thead><tbody>${rows}</tbody></table>`;

  /* ---- confusion matrix of the final model */
  const cell = (n, cls, label) => `<div class="cm-cell ${cls}"><strong>${n}</strong><span>${label}</span></div>`;
  matrixEl.innerHTML = `
    <div class="cm-grid" role="table" aria-label="Confusion matrix for ${final.name}">
      <div class="cm-corner"></div>
      <div class="cm-head">Model said: no disease</div>
      <div class="cm-head">Model said: disease</div>
      <div class="cm-head cm-side">Actually no disease</div>
      ${cell(final.tn, "good", "correct")}
      ${cell(final.fp, "bad", "false alarm")}
      <div class="cm-head cm-side">Actually has disease</div>
      ${cell(final.fn, "bad", "missed")}
      ${cell(final.tp, "good", "correct")}
    </div>`;

  /* ---- why LightGBM, worded from the numbers */
  const positives = final.tp + final.fn;
  const reasons = [];
  ["accuracy", "precision", "recall", "f1", "roc_auc"].forEach((key) => {
    const col = COLUMNS.find((c) => c.key === key);
    const ranked = models.filter((m) => m[key] != null).sort((a, b) => b[key] - a[key]);
    if (!ranked.length || final[key] == null) return;
    const top = ranked[0];
    if (top === final) {
      const next = ranked[1];
      reasons.push(`<strong>Highest ${lower(col.label)}.</strong> ${final.name} scored ${col.fmt(final[key])}${next ? `, ahead of ${next.name} at ${col.fmt(next[key])}` : ""}.`);
    } else {
      const gap = top[key] - final[key];
      reasons.push(`<strong>${col.label}: ${top.name} is ${gap < 0.005 ? "marginally " : ""}ahead.</strong> ${top.name} scored ${col.fmt(top[key])} against ${col.fmt(final[key])} for ${final.name}.`);
    }
  });
  const fewest = [...models].sort((a, b) => a.fn - b.fn);
  if (fewest[0] === final) {
    reasons.push(`<strong>Fewest missed cases.</strong> Of ${positives} people with the disease in the test set, ${final.name} missed ${final.fn}. The others missed ${fewest.slice(1).map((m) => `${m.fn} (${m.name})`).join(", ")}.`);
  }
  reasonsEl.innerHTML = reasons.map((r) => `<li>${r}</li>`).join("");

  /* ---- caveats that go with the numbers */
  const notes = statsNotes(stats);
  if (notes.length) {
    notesEl.innerHTML = `<summary>About these numbers</summary>${notes.map((n) => `<p>${n}</p>`).join("")}`;
  } else {
    notesEl.hidden = true;
  }
})();
