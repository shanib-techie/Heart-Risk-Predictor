/*
 * prediction.js — multi-step form, validation, POST /prediction and result view.
 * Sends the form to the FastAPI /prediction endpoint (main.py).
 * The form is generated from FIELDS (fields.js), whose names match the Pydantic model in main.py.
 */

(function () {
  const form = document.getElementById("predict-form");
  const formWrap = document.getElementById("form-wrap");
  const stepperEl = document.getElementById("stepper");
  const statusEl = document.getElementById("step-status");
  const panelsEl = document.getElementById("step-panels");
  const backBtn = document.getElementById("back-btn");
  const nextBtn = document.getElementById("next-btn");
  const submitBtn = document.getElementById("submit-btn");
  const formError = document.getElementById("form-error");
  const resultEl = document.getElementById("result");

  let current = 0; // index of the visible step

  const fieldsOf = (stepIndex) => FIELDS.filter((f) => STEPS[stepIndex].groups.includes(f.group));
  const inputOf = (f) => form.elements[f.key];
  const fmt = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

  /* ------------------------------------------------------------ build the form */

  function fieldHTML(f) {
    const id = "f-" + f.key;
    const describedBy = `h-${f.key} m-${f.key}`;
    let control;
    if (f.type === "select") {
      control = `<div class="input-wrap"><select id="${id}" name="${f.key}" required aria-describedby="${describedBy}">
          <option value="" selected disabled>Choose…</option>
          ${f.options.map((o) => `<option value="${o.value}">${o.label}</option>`).join("")}
        </select></div>`;
    } else {
      const step = f.type === "int" ? 1 : (f.step || 0.1);
      const attrs = [
        f.min != null ? `min="${f.min}"` : "",
        f.max != null ? `max="${f.max}"` : "",
        `step="${step}"`,
        `inputmode="${f.type === "int" ? "numeric" : "decimal"}"`,
        f.example ? `placeholder="e.g. ${f.example}"` : "",
      ].join(" ");
      control = `<div class="input-wrap">
          <input id="${id}" name="${f.key}" type="number" ${attrs} required aria-describedby="${describedBy}" autocomplete="off">
          <span class="unit">${f.unitShort || f.unit}</span>
        </div>`;
    }
    return `
      <div class="field" data-key="${f.key}">
        <label for="${id}">${f.label} <span class="req" aria-hidden="true">*</span>
          <a class="help" href="parameters.html#p-${f.key}" target="_blank" rel="noopener" aria-label="Explain ${f.label} (opens the Parameters page)" title="What is this?">?</a>
        </label>
        ${control}
        <p class="hint" id="h-${f.key}">${f.hint}</p>
        <p class="msg" id="m-${f.key}" role="alert"></p>
      </div>`;
  }

  function buildForm() {
    STEPS.forEach((step, i) => {
      const panel = document.createElement("fieldset");
      panel.className = "step-panel";
      panel.dataset.step = i;
      panel.hidden = i !== 0;

      const groups = step.groups.map((gid) => {
        const g = GROUPS.find((x) => x.id === gid);
        const fields = FIELDS.filter((f) => f.group === gid);
        return `<h3 class="group-title">${g.title}</h3><div class="field-grid">${fields.map(fieldHTML).join("")}</div>`;
      }).join("");

      panel.innerHTML = `<legend>${step.title}</legend>${groups}`;
      panelsEl.append(panel);

      const li = document.createElement("li");
      li.innerHTML = `<button type="button" class="step-btn" data-go="${i}">
          <span class="step-num">Step ${i + 1}</span><span class="step-title">${step.title}</span></button>`;
      stepperEl.append(li);
    });
  }

  /* ------------------------------------------------------------ validation */

  /** Returns an error message for one field, or "" if it is fine. */
  function checkField(f) {
    const input = inputOf(f);
    const raw = input.value.trim();

    if (f.type === "select") return raw ? "" : "Choose an option.";
    if (raw === "") return input.validity && input.validity.badInput ? "Enter a number." : "Enter a value.";

    const n = Number(raw);
    if (!Number.isFinite(n)) return "Enter a number.";
    if (f.type === "int" && !Number.isInteger(n)) return "Enter a whole number, without decimals.";
    if (f.min != null && n < f.min) return f.min === 0 ? "This cannot be negative." : `Must be at least ${fmt(f.min)}.`;
    if (f.max != null && n > f.max) return `Must be ${fmt(f.max)} or less.`;
    return "";
  }

  /** Rules that involve two fields. Returns {fieldKey: message}. */
  function checkRelations() {
    const out = {};
    const val = (key) => {
      const f = FIELDS.find((x) => x.key === key);
      return checkField(f) === "" ? Number(inputOf(f).value) : null;
    };
    const sys = val("resting_bp_systolic"), dia = val("resting_bp_diastolic");
    if (sys !== null && dia !== null && dia >= sys) out.resting_bp_diastolic = "Must be lower than the systolic value.";
    const rest = val("resting_heart_rate"), peak = val("max_heart_rate_achieved");
    if (rest !== null && peak !== null && peak < rest) out.max_heart_rate_achieved = "Cannot be lower than your resting heart rate.";
    return out;
  }

  function showError(key, text) {
    const msg = document.getElementById("m-" + key);
    msg.textContent = text;
    msg.className = "msg" + (text ? " msg--error" : "");
    form.querySelector(`.field[data-key="${key}"]`).classList.toggle("has-error", !!text);
    form.elements[key].setAttribute("aria-invalid", text ? "true" : "false");
  }

  function validateField(f, relations = checkRelations()) {
    const error = checkField(f) || relations[f.key] || "";
    showError(f.key, error);
    return error === "";
  }

  function validateStep(i) {
    const relations = checkRelations();
    let firstBad = null;
    fieldsOf(i).forEach((f) => {
      if (!validateField(f, relations) && !firstBad) firstBad = f;
    });
    if (firstBad) inputOf(firstBad).focus();
    return firstBad === null;
  }

  /* ------------------------------------------------------------ steps */

  function goTo(index, { scroll = true } = {}) {
    current = index;
    panelsEl.querySelectorAll(".step-panel").forEach((p) => { p.hidden = Number(p.dataset.step) !== index; });
    stepperEl.querySelectorAll("li").forEach((li, i) => {
      li.classList.toggle("is-current", i === index);
      li.classList.toggle("is-done", i < index);
      const button = li.querySelector("button");
      if (i === index) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
    });
    statusEl.textContent = `Step ${index + 1} of ${STEPS.length}: ${STEPS[index].title}`;
    backBtn.hidden = index === 0;
    nextBtn.hidden = index === STEPS.length - 1;
    submitBtn.hidden = index !== STEPS.length - 1;
    formError.hidden = true;
    if (scroll) stepperEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  /** Moves to `target`, but only if every step before it is valid. */
  function tryGoTo(target) {
    for (let i = current; i < target; i++) {
      if (!validateStep(i)) { goTo(i); validateStep(i); return; }
    }
    goTo(target);
  }

  /* ------------------------------------------------------------ submit */

  /** Field names and types match the Pydantic model `Detail` in main.py. */
  function buildPayload() {
    const payload = {};
    FIELDS.forEach((f) => {
      const raw = inputOf(f).value.trim();
      payload[f.key] = f.type === "int" ? parseInt(raw, 10) : f.type === "float" ? parseFloat(raw) : raw;
    });
    return payload;
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    backBtn.disabled = loading;
    submitBtn.innerHTML = loading ? '<span class="spinner" aria-hidden="true"></span> Predicting…' : "Predict risk";
    form.setAttribute("aria-busy", String(loading));
  }

  function showFormError(title, detail) {
    formError.innerHTML = `<strong>${title}</strong>${detail ? "<span></span>" : ""}`;
    if (detail) formError.querySelector("span").textContent = detail;
    formError.hidden = false;
    formError.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  async function submitForm() {
    for (let i = 0; i < STEPS.length; i++) {
      if (!validateStep(i)) { goTo(i); validateStep(i); return; }
    }
    const payload = buildPayload();
    formError.hidden = true;
    setLoading(true);

    try {
      const res = await fetch("/prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Prediction request failed:", res.status, err);
        showFormError(
          res.status === 422 ? "The server rejected some values." : `The server returned an error (HTTP ${res.status}).`,
          "Check the terminal where FastAPI is running for details."
        );
        return;
      }

      const data = await res.json();
      if (typeof data.probability_disease !== "number" || typeof data.probability_no_disease !== "number") {
        console.error("Unexpected response:", data);
        showFormError("The server sent a response this page does not understand.", "Expected probability_disease and probability_no_disease.");
        return;
      }
      showResult(data, payload);
    } catch (e) {
      console.error("Prediction request error:", e);
      showFormError("Could not reach the prediction service.",
        "Make sure the FastAPI server is running and that you opened this page through it (for example http://127.0.0.1:8000/prediction.html).");
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------------------------------------ result */

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function showResult(data, payload) {
    const isHigh = data.prediction === 1;
    const RADIUS = 54, CIRC = 2 * Math.PI * RADIUS;

    resultEl.classList.toggle("result--low", !isHigh);
    document.getElementById("result-title").textContent = isHigh ? "Higher heart disease risk" : "Lower heart disease risk";
    document.getElementById("result-raw").textContent = `Model output: ${data.result}`;
    document.getElementById("val-disease").textContent = data.probability_disease.toFixed(2) + "%";
    document.getElementById("val-no-disease").textContent = data.probability_no_disease.toFixed(2) + "%";

    // Values are shown exactly as the API returned them. Nothing is recalculated here.
    const arc = document.getElementById("gauge-arc");
    arc.style.strokeDasharray = CIRC;
    arc.style.strokeDashoffset = CIRC;
    const yes = document.getElementById("bar-yes"), no = document.getElementById("bar-no");
    yes.style.width = "0%"; no.style.width = "0%";
    const gaugeNumber = document.getElementById("gauge-number");
    gaugeNumber.textContent = reduceMotion ? data.probability_disease.toFixed(2) + "%" : "0.00%";

    document.getElementById("sent-values").innerHTML = FIELDS.map((f) => {
      const unit = f.unitShort || f.unit;
      const shown = f.type === "select"
        ? f.options.find((o) => o.value === payload[f.key]).label
        : payload[f.key] + (unit ? " " + unit : "");
      return `<dt>${f.label}</dt><dd>${shown}</dd>`;
    }).join("");

    formWrap.hidden = true;
    resultEl.hidden = false;
    document.getElementById("result-heading").focus({ preventScroll: true });
    resultEl.scrollIntoView({ block: "start", behavior: "smooth" });

    requestAnimationFrame(() => requestAnimationFrame(() => {
      arc.style.strokeDashoffset = CIRC * (1 - data.probability_disease / 100);
      yes.style.width = data.probability_disease + "%";
      no.style.width = data.probability_no_disease + "%";
      if (!reduceMotion) countUp(gaugeNumber, data.probability_disease, 1100);
    }));
  }

  function countUp(el, target, duration) {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (target * eased).toFixed(2) + "%";
      if (t < 1) requestAnimationFrame(tick); else el.textContent = target.toFixed(2) + "%";
    };
    requestAnimationFrame(tick);
  }

  function backToForm(reset) {
    if (reset) {
      form.reset();
      FIELDS.forEach((f) => showError(f.key, ""));
    }
    resultEl.hidden = true;
    formWrap.hidden = false;
    goTo(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ------------------------------------------------------------ wiring */

  buildForm();
  goTo(0, { scroll: false });

  stepperEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-go]");
    if (btn) tryGoTo(Number(btn.dataset.go));
  });
  backBtn.addEventListener("click", () => goTo(current - 1));
  nextBtn.addEventListener("click", () => tryGoTo(current + 1));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (current < STEPS.length - 1) tryGoTo(current + 1); else submitForm(); // Enter on early steps = Next
  });
  document.getElementById("edit-btn").addEventListener("click", () => backToForm(false));
  document.getElementById("reset-btn").addEventListener("click", () => backToForm(true));

  // validate a field when the user leaves it; clear its error as soon as it becomes valid
  const fieldOf = (el) => el.name && FIELDS.find((x) => x.key === el.name);
  form.addEventListener("focusout", (e) => {
    const f = fieldOf(e.target);
    if (f && (e.target.value.trim() !== "" || e.target.closest(".field").classList.contains("has-error"))) validateField(f);
  });
  form.addEventListener("input", (e) => {
    const f = fieldOf(e.target);
    if (f && e.target.closest(".field").classList.contains("has-error") && checkField(f) === "" && !checkRelations()[f.key]) validateField(f);
  });
  form.addEventListener("change", (e) => {
    const f = fieldOf(e.target);
    if (f && f.type === "select") validateField(f);
  });
})();