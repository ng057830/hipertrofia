document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();

  document.getElementById("calcForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const peso = getNumber("peso");
    const reps = getInteger("reps");
    const series = getInteger("series");
    const salto = getNumber("saltoPeso");

    if (!isValid(peso, reps, series, salto)) {
      showError("Completa todos los campos con números válidos mayores que cero.");
      hideResults();
      return;
    }

    hideError();

    const totalRepsBase = reps * series;
    const baseTonnage = peso * totalRepsBase;
    const minTarget = baseTonnage * 1.05;
    const maxTarget = baseTonnage * 1.10;

    const context = {
      peso,
      reps,
      series,
      salto,
      totalRepsBase,
      baseTonnage,
      minTarget,
      maxTarget
    };

    const options = [
      buildWeightOption(context),
      buildRepsOption(context),
      buildCombinedOption(context),
      buildSeriesOption(context),
      buildTechniqueOption(context)
    ].filter(Boolean);

    renderSummary(baseTonnage, minTarget, maxTarget);

    renderWeightOption(options.find((option) => option.id === "weight"));
    renderRepsOption(options.find((option) => option.id === "reps"));
    renderCombinedOption(options.find((option) => option.id === "combined"));
    renderSeriesOption(options.find((option) => option.id === "series"));
    renderTechniqueOption(options.find((option) => option.id === "technique"));

    renderBestOption(options, maxTarget);

    showResults();

    setTimeout(() => {
      document.getElementById("results").scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }, 80);

    if (window.lucide) lucide.createIcons();
  });
});

function getNumber(id) {
  return parseFloat(document.getElementById(id).value);
}

function getInteger(id) {
  return parseInt(document.getElementById(id).value, 10);
}

function isValid(peso, reps, series, salto) {
  return (
    Number.isFinite(peso) &&
    Number.isFinite(reps) &&
    Number.isFinite(series) &&
    Number.isFinite(salto) &&
    peso > 0 &&
    reps > 0 &&
    series > 0 &&
    salto > 0
  );
}

function formatNumber(value) {
  const rounded = Math.round(value * 10) / 10;

  return rounded.toLocaleString("es-CO", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1
  });
}

function formatKg(value) {
  return `${formatNumber(value)} kg`;
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function percentIncrease(newTonnage, baseTonnage) {
  return ((newTonnage - baseTonnage) / baseTonnage) * 100;
}

function statusFromPercent(percent) {
  if (percent < 5) {
    return {
      text: "queda por debajo del rango ideal",
      className: "status-low"
    };
  }

  if (percent <= 10) {
    return {
      text: "queda dentro del rango ideal",
      className: "status-good"
    };
  }

  return {
    text: "se pasa del 10%",
    className: "status-high"
  };
}

function distributeReps(totalReps, series) {
  const base = Math.floor(totalReps / series);
  const remainder = totalReps % series;
  const distribution = [];

  for (let i = 0; i < series; i++) {
    distribution.push(i < remainder ? base + 1 : base);
  }

  return distribution;
}

function distributionText(distribution) {
  const counts = {};

  distribution.forEach((rep) => {
    counts[rep] = (counts[rep] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([rep, count]) => {
      const word = count === 1 ? "serie" : "series";
      return `${count} ${word} de ${rep}`;
    })
    .join(" + ");
}

function bestTotalRepsUnderMax(weight, maxTarget, minTotalReps = 1) {
  return Math.max(minTotalReps, Math.floor(maxTarget / weight));
}

function buildOption({
  id,
  name,
  weight,
  series,
  totalReps,
  baseTonnage,
  note,
  currentWeight = null
}) {
  const distribution = distributeReps(totalReps, series);
  const tonnage = weight * totalReps;
  const percent = percentIncrease(tonnage, baseTonnage);
  const status = statusFromPercent(percent);

  return {
    id,
    name,
    currentWeight,
    weight,
    series,
    totalReps,
    distribution,
    tonnage,
    percent,
    status,
    note
  };
}

function buildWeightOption(context) {
  const {
    peso,
    reps,
    series,
    salto,
    totalRepsBase,
    baseTonnage,
    maxTarget
  } = context;

  let best = null;

  for (let jumps = 1; jumps <= 6; jumps++) {
    const newWeight = peso + salto * jumps;
    const tonnage = newWeight * totalRepsBase;

    if (tonnage <= maxTarget) {
      best = {
        newWeight,
        tonnage
      };
    }
  }

  if (!best) {
    const newWeight = peso + salto;
    return buildOption({
      id: "weight",
      name: "Subir solo peso",
      currentWeight: peso,
      weight: newWeight,
      series,
      totalReps: totalRepsBase,
      baseTonnage,
      note: "El primer salto de peso ya supera el 10%. Puedes hacerlo solo si se siente muy controlado, pero no sería la opción más prudente."
    });
  }

  return buildOption({
    id: "weight",
    name: "Subir solo peso",
    currentWeight: peso,
    weight: best.newWeight,
    series,
    totalReps: totalRepsBase,
    baseTonnage,
    note: "Mantienes las mismas series y repeticiones. Solo cambia el peso, respetando los saltos reales de la máquina."
  });
}

function buildRepsOption(context) {
  const {
    peso,
    series,
    totalRepsBase,
    baseTonnage,
    maxTarget
  } = context;

  const totalReps = bestTotalRepsUnderMax(peso, maxTarget, totalRepsBase + 1);

  return buildOption({
    id: "reps",
    name: "Subir solo repeticiones",
    currentWeight: peso,
    weight: peso,
    series,
    totalReps,
    baseTonnage,
    note: "Mantienes el mismo peso. La progresión sale de repartir más repeticiones entre las series."
  });
}

function buildCombinedOption(context) {
  const {
    peso,
    series,
    salto,
    totalRepsBase,
    baseTonnage,
    maxTarget
  } = context;

  const candidates = [];

  for (let jumps = 1; jumps <= 6; jumps++) {
    const newWeight = peso + salto * jumps;

    const maxTotalReps = Math.floor(maxTarget / newWeight);

    for (let totalReps = Math.max(1, totalRepsBase - 8); totalReps <= maxTotalReps; totalReps++) {
      const tonnage = newWeight * totalReps;

      if (tonnage <= maxTarget && tonnage > baseTonnage) {
        const percent = percentIncrease(tonnage, baseTonnage);

        candidates.push({
          newWeight,
          totalReps,
          tonnage,
          percent,
          jumps,
          repsDifference: Math.abs(totalReps - totalRepsBase)
        });
      }
    }
  }

  if (candidates.length === 0) {
    const newWeight = peso + salto;
    const totalReps = Math.max(1, Math.floor(maxTarget / newWeight));

    return buildOption({
      id: "combined",
      name: "Combinada",
      currentWeight: peso,
      weight: newWeight,
      series,
      totalReps,
      baseTonnage,
      note: "No hay una combinación perfecta con el salto de peso elegido. Esta es la aproximación más cercana sin pasar el 10%."
    });
  }

  candidates.sort((a, b) => {
    if (b.tonnage !== a.tonnage) return b.tonnage - a.tonnage;
    if (a.jumps !== b.jumps) return a.jumps - b.jumps;
    return a.repsDifference - b.repsDifference;
  });

  const best = candidates[0];

  let note = "Subes peso y ajustas las repeticiones para acercarte lo máximo posible al 10% sin pasarte.";

  if (best.totalReps === totalRepsBase) {
    note = "Con este salto de peso, añadir una repetición más ya se pasa del 10%. Por eso la mejor combinada conserva las repeticiones totales.";
  }

  return buildOption({
    id: "combined",
    name: "Combinada",
    currentWeight: peso,
    weight: best.newWeight,
    series,
    totalReps: best.totalReps,
    baseTonnage,
    note
  });
}

function buildSeriesOption(context) {
  const {
    peso,
    series,
    totalRepsBase,
    baseTonnage,
    maxTarget
  } = context;

  const newSeries = series + 1;
  const totalReps = bestTotalRepsUnderMax(peso, maxTarget, totalRepsBase + 1);

  return buildOption({
    id: "series",
    name: "Añadir una serie",
    currentWeight: peso,
    weight: peso,
    series: newSeries,
    totalReps,
    baseTonnage,
    note: "Añades una serie, pero las repeticiones se reparten para no pasarte del 10%."
  });
}

function buildTechniqueOption(context) {
  const {
    peso,
    series,
    salto,
    baseTonnage,
    maxTarget
  } = context;

  const lowerWeight = peso - salto;

  if (lowerWeight <= 0) return null;

  const totalReps = Math.floor(maxTarget / lowerWeight);
  const tonnage = lowerWeight * totalReps;

  if (tonnage <= 0) return null;

  return buildOption({
    id: "technique",
    name: "Bajar peso para técnica",
    currentWeight: peso,
    weight: lowerWeight,
    series,
    totalReps,
    baseTonnage,
    note: "Bajas peso para moverte mejor. Para no perder tanto estímulo, necesitas compensar con más repeticiones."
  });
}

function renderSummary(baseTonnage, minTarget, maxTarget) {
  document.getElementById("baseTonnage").textContent = formatKg(baseTonnage);
  document.getElementById("targetRange").textContent = `${formatKg(minTarget)} - ${formatKg(maxTarget)}`;
}

function renderWeightOption(option) {
  renderGenericOption(option, {
    mainId: "weightMain",
    tonnageId: "weightTonnage",
    percentId: "weightPercent",
    noteId: "weightNote",
    mainText: `
      Pasa de <b>${formatKg(option.currentWeight)}</b> a
      <b>${formatKg(option.weight)}</b>.
      Mantén <b>${option.series} series</b> y
      <b>${option.totalReps} reps totales</b>.
    `
  });
}

function renderRepsOption(option) {
  renderGenericOption(option, {
    mainId: "repsMain",
    tonnageId: "repsTonnage",
    percentId: "repsPercent",
    noteId: "repsNote",
    mainText: `
      Mantén <b>${formatKg(option.weight)}</b>.
      Haz <b>${option.totalReps} reps totales</b>:
      <b>${distributionText(option.distribution)}</b>.
    `
  });
}

function renderCombinedOption(option) {
  renderGenericOption(option, {
    mainId: "combinedMain",
    tonnageId: "combinedTonnage",
    percentId: "combinedPercent",
    noteId: "combinedNote",
    mainText: `
      Pasa de <b>${formatKg(option.currentWeight)}</b> a
      <b>${formatKg(option.weight)}</b>.
      Haz <b>${option.totalReps} reps totales</b>:
      <b>${distributionText(option.distribution)}</b>.
    `
  });
}

function renderSeriesOption(option) {
  renderGenericOption(option, {
    mainId: "seriesMain",
    tonnageId: "seriesTonnage",
    percentId: "seriesPercent",
    noteId: "seriesNote",
    mainText: `
      Mantén <b>${formatKg(option.weight)}</b>.
      Pasa a <b>${option.series} series</b> y reparte:
      <b>${distributionText(option.distribution)}</b>.
    `
  });
}

function renderTechniqueOption(option) {
  const card = document.getElementById("techniqueCard");

  if (!option) {
    card.classList.add("hidden");
    return;
  }

  card.classList.remove("hidden");

  renderGenericOption(option, {
    mainId: "techniqueMain",
    tonnageId: "techniqueTonnage",
    percentId: "techniquePercent",
    noteId: "techniqueNote",
    mainText: `
      Baja de <b>${formatKg(option.currentWeight)}</b> a
      <b>${formatKg(option.weight)}</b>.
      Para acercarte al estímulo óptimo, haz
      <b>${option.totalReps} reps totales</b>:
      <b>${distributionText(option.distribution)}</b>.
    `
  });
}

function renderGenericOption(option, config) {
  const tonnageText = `${formatKg(option.tonnage)}`;
  const percentText = formatPercent(option.percent);

  document.getElementById(config.mainId).innerHTML = config.mainText;

  document.getElementById(config.tonnageId).innerHTML = `
    ${formatKg(option.tonnage)}
  `;

  document.getElementById(config.percentId).innerHTML = `
    <span class="${option.status.className}">
      ${percentText}
    </span>
  `;

  document.getElementById(config.noteId).innerHTML = `
    ${option.note} Resultado: <span class="${option.status.className}">${option.status.text}</span>.
  `;
}

function renderBestOption(options, maxTarget) {
  const validOptions = options
    .filter((option) => option.tonnage <= maxTarget)
    .filter((option) => option.percent > 0)
    .sort((a, b) => b.tonnage - a.tonnage);

  const best = validOptions[0];

  const bestText = document.getElementById("bestText");

  if (!best) {
    bestText.innerHTML = `
      Ninguna opción queda por debajo del 10%.
      Baja la progresión o usa un salto de peso menor si la máquina lo permite.
    `;
    return;
  }

  bestText.innerHTML = `
    Te conviene <b>${best.name.toLowerCase()}</b>:
    <b>${formatKg(best.weight)}</b>,
    <b>${best.series} series</b>,
    <b>${best.totalReps} reps totales</b>.
    Logras <b>${formatKg(best.tonnage)}</b>,
    equivalente a <b>${formatPercent(best.percent)}</b> de aumento.
  `;
}

function showError(message) {
  document.getElementById("errorText").textContent = message;
  document.getElementById("errorBox").classList.remove("hidden");

  if (window.lucide) lucide.createIcons();
}

function hideError() {
  document.getElementById("errorBox").classList.add("hidden");
}

function showResults() {
  document.getElementById("results").classList.remove("hidden");
}

function hideResults() {
  document.getElementById("results").classList.add("hidden");
}