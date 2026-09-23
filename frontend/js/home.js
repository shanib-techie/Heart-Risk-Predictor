/*
 * home.js — model comparison bars and the feature-importance preview on the homepage.
 */

(async function () {
  const accuracyEl = document.getElementById("accuracy-bars");
  const stats = await loadStats();

  if (!stats) {
    accuracyEl.innerHTML = '<p class="load-error">Model results could not be loaded (data/model_stats.json). Open the site through the FastAPI server.</p>';
  } else {
    const models = [...stats.models].sort((a, b) => b.accuracy - a.accuracy);
    const list = document.createElement("ol");
    list.className = "bars bars--wide";
    models.forEach((m, i) => {
      const li = document.createElement("li");
      li.className = "bar-row" + (m.final ? " is-top" : "");
      li.style.setProperty("--w", (m.accuracy * 100).toFixed(2) + "%");
      li.style.setProperty("--i", i);
      li.innerHTML = `<span class="bar-label"></span><span class="bar-track"><span class="bar-fill"></span></span><span class="bar-value"></span>`;
      li.querySelector(".bar-label").textContent = m.name;
      li.querySelector(".bar-value").textContent = pct(m.accuracy);
      list.append(li);
    });
    accuracyEl.replaceChildren(list);
    revealWhenVisible(list);
  }

  mountImportanceChart(document.getElementById("importance-preview"), { limit: 8 });
})();
