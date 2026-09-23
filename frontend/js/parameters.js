/*
 * parameters.js — builds the parameter explanations from FIELDS (fields.js).
 */

(function () {
  const groupsRoot = document.getElementById("param-groups");
  const jumpNav = document.getElementById("jump-nav");
  const expandBtn = document.getElementById("expand-all");

  const KIND_STYLE = { known: "easy", estimate: "easy", measure: "careful", lab: "careful", test: "careful" };
  const num = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

  /** "Range the form accepts" text, e.g. "50 to 300 mmHg". */
  function acceptedRange(f) {
    if (f.type === "select") return "";
    const unit = f.unit ? " " + f.unit : "";
    if (f.min != null && f.max != null) return `${num(f.min)} to ${num(f.max)}${unit}`;
    if (f.min != null) return `${num(f.min)} or more${unit}`;
    return "";
  }

  function paramHTML(f) {
    const options = f.type === "select"
      ? `<p>Choices: ${f.options.map((o) => `<b>${o.label}</b>`).join(", ")}.</p>` : "";
    const example = f.example
      ? `<p class="example">Example: <b>${f.example}${f.unit ? " " + f.unit : ""}</b></p>` : "";
    const refs = f.ref.length
      ? `<ul class="ref-list">${f.ref.map((r) => `<li class="${r.tag}">${r.text}</li>`).join("")}</ul>` : "";
    const convert = f.convert ? `<p class="convert">${f.convert}</p>` : "";
    const accepted = acceptedRange(f);
    const inputRange = accepted
      ? `<p class="input-range">The form accepts <strong>${accepted}</strong>. These limits only block impossible values. They are not medical ranges.
         <span data-range-for="${f.key}"></span></p>` : "";

    return `
      <details class="param" id="p-${f.key}">
        <summary>
          <span class="param-name">${f.label}</span>
          <span class="param-unit">${f.unit || "Choose one"}</span>
          <span class="param-hint">${f.hint}</span>
        </summary>
        <div class="param-body">
          <div class="pb"><h4>What it means</h4><p>${f.meaning}</p></div>
          <div class="pb"><h4>What to enter</h4><p>${f.enter}</p>${options}${example}</div>
          <div class="pb"><h4>Reference ranges</h4>${refs}<p class="ref-note">${f.refNote}</p></div>
          <div class="pb"><h4>Where to find it</h4><p>${f.source}</p>${convert}${inputRange}</div>
          <div class="unknown unknown--${KIND_STYLE[f.unknown.kind]}">
            <h4>${UNKNOWN_TITLES[f.unknown.kind]}</h4>
            <p>${f.unknown.text}</p>
          </div>
        </div>
      </details>`;
  }

  // one section per group, in the same order as the form
  GROUPS.forEach((g) => {
    const fields = FIELDS.filter((f) => f.group === g.id);
    if (!fields.length) return;

    const section = document.createElement("section");
    section.className = "param-group";
    section.id = "group-" + g.id;
    section.innerHTML = `
      <div class="param-group-title"><h2>${g.title}<span>${fields.length} ${fields.length === 1 ? "parameter" : "parameters"}</span></h2></div>
      <div class="param-list">${fields.map(paramHTML).join("")}</div>`;
    groupsRoot.append(section);

    const chip = document.createElement("a");
    chip.href = "#group-" + g.id;
    chip.textContent = g.title;
    jumpNav.append(chip);
  });

  // "Expand all / Collapse all"
  const allDetails = () => [...groupsRoot.querySelectorAll("details.param")];
  expandBtn.addEventListener("click", () => {
    const open = allDetails().some((d) => !d.open);
    allDetails().forEach((d) => { d.open = open; });
    expandBtn.textContent = open ? "Collapse all" : "Expand all";
  });

  // A link like parameters.html#p-hba1c (from the prediction form) opens that parameter.
  function openFromHash() {
    const target = location.hash.startsWith("#p-") ? document.querySelector(location.hash) : null;
    if (target && target.tagName === "DETAILS") {
      target.open = true;
      target.scrollIntoView({ block: "center" });
    }
  }
  openFromHash();
  window.addEventListener("hashchange", openFromHash);

  // Show the value range seen in the training data, if model_stats.json has it.
  loadStats().then((stats) => {
    if (!stats || !stats.feature_ranges) return;
    document.querySelectorAll("[data-range-for]").forEach((span) => {
      const r = stats.feature_ranges[span.dataset.rangeFor];
      if (r) span.textContent = `In the training data the values ran from ${num(r.min)} to ${num(r.max)}.`;
    });
  });

  // Feature importance chart
  mountImportanceChart(document.getElementById("importance-chart"), {
    limit: 10,
    toggle: document.getElementById("importance-toggle"),
    noteEl: document.getElementById("importance-note"),
  });
})();
