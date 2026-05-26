// Constantes médico-deportivas de progresión de tonelaje (volumen)
const TARGET_MIN_PERCENT = 5;
const TARGET_MAX_PERCENT = 10;
const PRIMARY_REP_MIN = 8;
const PRIMARY_REP_MAX = 13;
const ACCEPTABLE_REP_MIN = 6;
const ACCEPTABLE_REP_MAX = 15;
const HIGH_REP_MIN = 16;
const HIGH_REP_MAX = 20;
const MAX_REPS_PER_SET_ALLOWED = 20;

document.addEventListener("DOMContentLoaded", () => {
  // Cargar valores iniciales desde localStorage
  const savedReps = localStorage.getItem("gym_reps");
  const savedPeso = localStorage.getItem("gym_peso");
  const savedSeries = localStorage.getItem("gym_series");
  const savedSalto = localStorage.getItem("gym_salto");

  if (savedReps) document.getElementById("reps").value = savedReps;
  if (savedPeso) document.getElementById("peso").value = savedPeso;
  if (savedSeries) document.getElementById("series").value = savedSeries;
  if (savedSalto) document.getElementById("saltoPeso").value = savedSalto;

  if (window.lucide) lucide.createIcons();

  // Calcular inicialmente si ya existen datos guardados y válidos
  autoCalculate(false);

  // Manejador para los botones de más (+) y menos (-) (stepper)
  document.querySelectorAll(".stepper-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPlus = btn.classList.contains("plus");
      let val = parseFloat(input.value);

      // Definir valores por defecto si el campo está vacío
      if (isNaN(val)) {
        if (targetId === "reps") val = 10;
        else if (targetId === "peso") val = 40;
        else if (targetId === "series") val = 4;
        else if (targetId === "saltoPeso") val = 5;
      }

      // Determinar el tamaño del paso
      let step = 1;
      if (targetId === "peso") {
        const saltoInput = document.getElementById("saltoPeso");
        const saltoVal = saltoInput ? parseFloat(saltoInput.value) : 2.5;
        step = isNaN(saltoVal) || saltoVal <= 0 ? 2.5 : saltoVal;
      } else if (targetId === "saltoPeso") {
        step = 2.5;
      } else {
        step = parseFloat(input.getAttribute("step")) || 1;
      }

      const minVal = parseFloat(input.getAttribute("min")) || 0;

      if (isPlus) {
        val += step;
      } else {
        val = Math.max(minVal, val - step);
      }

      // Evitar decimales flotantes imprecisos (ej: 42.000000000004)
      input.value = Number.isInteger(val) ? val : Math.round(val * 100) / 100;
      
      saveToStorage();
      autoCalculate(false); // Calcular en tiempo real
    });
  });

  // Escuchar inputs directos del teclado y calcular en tiempo real
  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      saveToStorage();
      autoCalculate(false);
    });
  });

  // Al enviar el formulario, forzar el cálculo y deslizar la pantalla en móvil
  document.getElementById("calcForm").addEventListener("submit", (event) => {
    event.preventDefault();
    autoCalculate(true);
  });
});

function saveToStorage() {
  const reps = document.getElementById("reps").value;
  const peso = document.getElementById("peso").value;
  const series = document.getElementById("series").value;
  const salto = document.getElementById("saltoPeso").value;

  if (reps) localStorage.setItem("gym_reps", reps);
  if (peso) localStorage.setItem("gym_peso", peso);
  if (series) localStorage.setItem("gym_series", series);
  if (salto) localStorage.setItem("gym_salto", salto);
}

function getNumber(id) {
  return parseFloat(document.getElementById(id).value);
}

function getInteger(id) {
  return parseInt(document.getElementById(id).value, 10);
}

function validateInputs() {
  const peso = getNumber("peso");
  const reps = getNumber("reps");
  const series = getNumber("series");
  const salto = getNumber("saltoPeso");

  // Evitar inputs vacíos, cero, negativos, NaN o Infinity
  if (isNaN(peso) || peso <= 0 || !Number.isFinite(peso)) {
    return { valid: false, msg: "La carga usada debe ser un número válido mayor que cero." };
  }
  if (isNaN(reps) || reps <= 0 || !Number.isFinite(reps)) {
    return { valid: false, msg: "Las repeticiones por serie deben ser mayores que cero." };
  }
  if (isNaN(series) || series <= 0 || !Number.isFinite(series)) {
    return { valid: false, msg: "El número de series debe ser mayor que cero." };
  }
  if (isNaN(salto) || salto <= 0 || !Number.isFinite(salto)) {
    return { valid: false, msg: "El salto de peso debe ser mayor que cero." };
  }

  const repsRaw = document.getElementById("reps").value;
  const seriesRaw = document.getElementById("series").value;

  if (repsRaw.includes(".") || repsRaw.includes(",") || !Number.isInteger(reps)) {
    return { valid: false, msg: "Las repeticiones por serie deben ser un número entero." };
  }
  if (seriesRaw.includes(".") || seriesRaw.includes(",") || !Number.isInteger(series)) {
    return { valid: false, msg: "El número de series debe ser un número entero." };
  }

  return { valid: true, peso, reps, series, salto };
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

function statusFromPercentAndCategory(percent, category) {
  if (category === "no_recomendada" || percent > TARGET_MAX_PERCENT) {
    return {
      text: "No recomendado: supera el límite del 10% de seguridad",
      className: "status-high"
    };
  }
  if (category === "ideal") {
    return {
      text: "dentro del rango recomendado (+5% a +10%)",
      className: "status-good"
    };
  }
  if (category === "conservadora") {
    return {
      text: "progresión conservadora (menor al +5%)",
      className: "status-low"
    };
  }
  if (category === "secundaria") {
    return {
      text: "progresión secundaria (alta repetición o bajas reps)",
      className: "status-low"
    };
  }
  if (category === "futura") {
    return {
      text: "inactiva (opción para más adelante)",
      className: "status-low"
    };
  }
  if (category === "tecnica") {
    return {
      text: "modo técnica y control (recuperación)",
      className: "status-low"
    };
  }
  return {
    text: "calculado",
    className: "status-low"
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

  const maxRepsPerSet = Math.max(...distribution);
  const minRepsPerSet = Math.min(...distribution);
  const avgRepsPerSet = totalReps / series;

  let repRangeCategory = "acceptable";
  if (maxRepsPerSet <= PRIMARY_REP_MAX && minRepsPerSet >= PRIMARY_REP_MIN) {
    repRangeCategory = "primary";
  } else if (maxRepsPerSet <= ACCEPTABLE_REP_MAX && minRepsPerSet >= ACCEPTABLE_REP_MIN) {
    repRangeCategory = "acceptable";
  } else if (maxRepsPerSet >= HIGH_REP_MIN && maxRepsPerSet <= HIGH_REP_MAX) {
    repRangeCategory = "high";
  } else if (maxRepsPerSet > MAX_REPS_PER_SET_ALLOWED) {
    repRangeCategory = "too_high";
  } else if (minRepsPerSet < ACCEPTABLE_REP_MIN) {
    repRangeCategory = "too_low";
  }

  // Clasificación de categorías médico-deportivas
  let category = "acceptable";
  let isMainProgression = true;
  let isNotRecommended = false;

  if (percent > TARGET_MAX_PERCENT || repRangeCategory === "too_high" || percent <= 0) {
    category = "no_recomendada";
    isMainProgression = false;
    isNotRecommended = true;
  } else if (percent >= TARGET_MIN_PERCENT && percent <= TARGET_MAX_PERCENT) {
    if (repRangeCategory === "high" || repRangeCategory === "too_low") {
      category = "secundaria";
      isMainProgression = false;
      isNotRecommended = false;
    } else {
      category = "ideal";
      isMainProgression = true;
      isNotRecommended = false;
    }
  } else if (percent > 0 && percent < TARGET_MIN_PERCENT) {
    if (repRangeCategory === "high" || repRangeCategory === "too_low") {
      category = "secundaria";
      isMainProgression = false;
      isNotRecommended = false;
    } else {
      category = "conservadora";
      isMainProgression = true;
      isNotRecommended = false;
    }
  }

  const status = statusFromPercentAndCategory(percent, category);

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
    note,
    maxRepsPerSet,
    minRepsPerSet,
    avgRepsPerSet,
    repRangeCategory,
    category,
    isMainProgression,
    isNotRecommended
  };
}

function buildWeightOption(context) {
  const { peso, reps, series, salto, totalRepsBase, baseTonnage, maxTarget } = context;

  // Probar saltos de peso: n de 1 a 10
  const candidates = [];
  for (let n = 1; n <= 10; n++) {
    const newWeight = peso + salto * n;
    const tonnage = newWeight * totalRepsBase;
    const percent = percentIncrease(tonnage, baseTonnage);
    candidates.push({ n, newWeight, tonnage, percent });
  }

  // Si el primer salto ya se pasa del 10%
  const firstJump = candidates[0];
  if (firstJump.percent > TARGET_MAX_PERCENT) {
    const opt = buildOption({
      id: "weight",
      name: "Subir solo peso",
      weight: firstJump.newWeight,
      series,
      totalReps: totalRepsBase,
      baseTonnage,
      note: "No recomendado: el primer salto de peso supera el 10% indicado como límite de seguridad.",
      currentWeight: peso
    });
    opt.category = "no_recomendada";
    opt.isMainProgression = false;
    opt.isNotRecommended = true;
    return opt;
  }

  // Buscar el mejor salto n que quede entre 5% y 10%
  let best = null;
  for (let i = candidates.length - 1; i >= 0; i--) {
    const cand = candidates[i];
    if (cand.percent >= TARGET_MIN_PERCENT && cand.percent <= TARGET_MAX_PERCENT) {
      best = cand;
      break;
    }
  }

  // Si no hay entre 5% y 10%, buscar uno entre 0% y 5%
  if (!best) {
    for (let i = candidates.length - 1; i >= 0; i--) {
      const cand = candidates[i];
      if (cand.percent > 0 && cand.percent < TARGET_MIN_PERCENT) {
        best = cand;
        break;
      }
    }
  }

  // Si aún no hay (por ejemplo todos son >10%), usamos el primer salto n=1
  if (!best) {
    best = firstJump;
  }

  const note = best.percent > TARGET_MAX_PERCENT 
    ? "No recomendado: el primer salto de peso supera el 10% indicado como límite de seguridad."
    : "Mantienes las mismas series y repeticiones. Solo cambia el peso, respetando los saltos reales de la máquina.";

  return buildOption({
    id: "weight",
    name: "Subir solo peso",
    weight: best.newWeight,
    series,
    totalReps: totalRepsBase,
    baseTonnage,
    note,
    currentWeight: peso
  });
}

function buildRepsOption(context) {
  const { peso, reps, series, totalRepsBase, baseTonnage } = context;

  const candidates = [];
  for (let add = 1; add <= 40; add++) {
    const totalRepsCandidate = totalRepsBase + add;
    const tonnage = peso * totalRepsCandidate;
    const percent = percentIncrease(tonnage, baseTonnage);
    const dist = distributeReps(totalRepsCandidate, series);
    const maxReps = Math.max(...dist);
    const minReps = Math.min(...dist);

    candidates.push({
      totalReps: totalRepsCandidate,
      tonnage,
      percent,
      dist,
      maxReps,
      minReps
    });
  }

  // Filtrar candidatos
  const idealPrimary = candidates.filter(c => c.percent >= TARGET_MIN_PERCENT && c.percent <= TARGET_MAX_PERCENT && c.maxReps <= PRIMARY_REP_MAX && c.minReps >= PRIMARY_REP_MIN);
  const idealAcceptable = candidates.filter(c => c.percent >= TARGET_MIN_PERCENT && c.percent <= TARGET_MAX_PERCENT && c.maxReps <= ACCEPTABLE_REP_MAX && c.minReps >= ACCEPTABLE_REP_MIN);
  const conservadora = candidates.filter(c => c.percent > 0 && c.percent < TARGET_MIN_PERCENT && c.maxReps <= ACCEPTABLE_REP_MAX && c.minReps >= ACCEPTABLE_REP_MIN);
  const highReps = candidates.filter(c => c.percent > 0 && c.percent <= TARGET_MAX_PERCENT && c.maxReps >= HIGH_REP_MIN && c.maxReps <= HIGH_REP_MAX);

  let best = null;
  if (idealPrimary.length > 0) {
    idealPrimary.sort((a, b) => b.percent - a.percent);
    best = idealPrimary[0];
  } else if (idealAcceptable.length > 0) {
    idealAcceptable.sort((a, b) => b.percent - a.percent);
    best = idealAcceptable[0];
  } else if (conservadora.length > 0) {
    conservadora.sort((a, b) => b.percent - a.percent);
    best = conservadora[0];
  } else if (highReps.length > 0) {
    highReps.sort((a, b) => b.percent - a.percent);
    best = highReps[0];
  } else {
    best = candidates[0]; // fallback repsBase + 1
  }

  let note = "Mantienes el mismo peso. La progresión sale de repartir más repeticiones entre las series.";
  if (best.maxReps <= PRIMARY_REP_MAX) {
    note = "Mantienes el mismo peso. La progresión sale de repartir más repeticiones entre las series en rango ideal de hipertrofia.";
  } else if (best.maxReps <= ACCEPTABLE_REP_MAX) {
    note = "Mantienes el mismo peso. Repartes más repeticiones, aproximándote al límite de repeticiones aceptable.";
  } else if (best.maxReps >= HIGH_REP_MIN && best.maxReps <= HIGH_REP_MAX) {
    note = "Alta repetición: exige más de 15 reps por serie. Puede ser útil para accesorios o trabajo metabólico, pero no es la progresión principal recomendada.";
  } else if (best.maxReps > MAX_REPS_PER_SET_ALLOWED) {
    note = "No recomendado: exige más de 20 reps por serie, saliéndose del rango de progresión principal.";
  }

  return buildOption({
    id: "reps",
    name: "Subir solo repeticiones",
    weight: peso,
    series,
    totalReps: best.totalReps,
    baseTonnage,
    note,
    currentWeight: peso
  });
}

function buildCombinedOption(context) {
  const { peso, reps, series, salto, totalRepsBase, baseTonnage, maxTarget } = context;
  const candidates = [];

  for (let jumps = 1; jumps <= 10; jumps++) {
    const newWeight = peso + salto * jumps;
    const minRepsCandidate = series * ACCEPTABLE_REP_MIN;
    const maxRepsCandidate = series * ACCEPTABLE_REP_MAX;

    for (let totalReps = minRepsCandidate; totalReps <= maxRepsCandidate; totalReps++) {
      const tonnage = newWeight * totalReps;
      const percent = percentIncrease(tonnage, baseTonnage);
      
      if (percent >= TARGET_MIN_PERCENT && percent <= TARGET_MAX_PERCENT) {
        const dist = distributeReps(totalReps, series);
        const maxReps = Math.max(...dist);
        const minReps = Math.min(...dist);
        const repsDifference = Math.abs(totalReps - totalRepsBase);

        candidates.push({
          newWeight,
          totalReps,
          tonnage,
          percent,
          jumps,
          dist,
          maxReps,
          minReps,
          repsDifference
        });
      }
    }
  }

  if (candidates.length === 0) {
    // Fallback: 1 salto de peso, reps máximas sin exceder 10%
    const newWeight = peso + salto;
    const totalReps = Math.max(1, Math.floor(maxTarget / newWeight));
    const tonnage = newWeight * totalReps;
    const percent = percentIncrease(tonnage, baseTonnage);
    const note = "No hay una combinación perfecta en rango ideal. Esta es la aproximación más cercana.";

    return buildOption({
      id: "combined",
      name: "Combinada: peso + reps",
      weight: newWeight,
      series,
      totalReps,
      baseTonnage,
      note,
      currentWeight: peso
    });
  }

  // Ordenar candidatos
  candidates.sort((a, b) => {
    // 1. rango de hipertrofia primero (8-13 reps por serie)
    const aPrimary = (a.maxReps <= PRIMARY_REP_MAX && a.minReps >= PRIMARY_REP_MIN);
    const bPrimary = (b.maxReps <= PRIMARY_REP_MAX && b.minReps >= PRIMARY_REP_MIN);
    if (aPrimary && !bPrimary) return -1;
    if (!aPrimary && bPrimary) return 1;

    // 2. mayor porcentaje (más cercano al 10% sin pasarse)
    if (Math.abs(b.percent - a.percent) > 0.01) {
      return b.percent - a.percent;
    }

    // 3. menor número de saltos de peso
    if (a.jumps !== b.jumps) return a.jumps - b.jumps;

    // 4. menor diferencia en repeticiones totales
    if (a.repsDifference !== b.repsDifference) return a.repsDifference - b.repsDifference;

    // 5. spread más equilibrado
    const aSpread = a.maxReps - a.minReps;
    const bSpread = b.maxReps - b.minReps;
    return aSpread - bSpread;
  });

  const best = candidates[0];
  let note = "Subes peso, pero ajustas las repeticiones para progresar sin pasar del 10%.";
  if (best.totalReps === totalRepsBase) {
    note = "Con este salto de peso, añadir una repetición más ya se pasa del 10%. Por eso la combinada conserva las repeticiones totales.";
  }

  return buildOption({
    id: "combined",
    name: "Combinada: peso + reps",
    weight: best.newWeight,
    series,
    totalReps: best.totalReps,
    baseTonnage,
    note,
    currentWeight: peso
  });
}

function buildSeriesOption(context) {
  const { peso, reps, series, totalRepsBase, baseTonnage, maxTarget } = context;
  const newSeries = series + 1;

  // Candidatos para repeticiones totales
  const candidates = [];
  const minRepsCandidate = newSeries * ACCEPTABLE_REP_MIN;
  const maxRepsCandidate = newSeries * ACCEPTABLE_REP_MAX;

  for (let totalReps = minRepsCandidate; totalReps <= maxRepsCandidate; totalReps++) {
    const tonnage = peso * totalReps;
    const percent = percentIncrease(tonnage, baseTonnage);
    const dist = distributeReps(totalReps, newSeries);
    const maxReps = Math.max(...dist);
    const minReps = Math.min(...dist);

    candidates.push({
      totalReps,
      tonnage,
      percent,
      dist,
      maxReps,
      minReps
    });
  }

  // Filtrar
  const idealPrimary = candidates.filter(c => c.percent >= TARGET_MIN_PERCENT && c.percent <= TARGET_MAX_PERCENT && c.maxReps <= 12 && c.minReps >= 8);
  const idealAcceptable = candidates.filter(c => c.percent >= TARGET_MIN_PERCENT && c.percent <= TARGET_MAX_PERCENT && c.maxReps <= ACCEPTABLE_REP_MAX && c.minReps >= ACCEPTABLE_REP_MIN);
  const conservadora = candidates.filter(c => c.percent > 0 && c.percent < TARGET_MIN_PERCENT);

  let best = null;
  if (idealPrimary.length > 0) {
    idealPrimary.sort((a, b) => b.percent - a.percent);
    best = idealPrimary[0];
  } else if (idealAcceptable.length > 0) {
    idealAcceptable.sort((a, b) => b.percent - a.percent);
    best = idealAcceptable[0];
  } else if (conservadora.length > 0) {
    conservadora.sort((a, b) => b.percent - a.percent);
    best = conservadora[0];
  } else {
    // Fallback: 10 reps por serie
    const totalReps = 10 * newSeries;
    const dist = distributeReps(totalReps, newSeries);
    best = {
      totalReps,
      tonnage: peso * totalReps,
      percent: percentIncrease(peso * totalReps, baseTonnage),
      dist,
      maxReps: Math.max(...dist),
      minReps: Math.min(...dist)
    };
  }

  const note = reps >= 12
    ? "Añades una serie, pero las repeticiones se reparten para no pasarte del 10%. Esta opción tiene sentido cuando ya estás cerca de 12–13 reps por serie y quieres volver a un rango más cómodo de 10 reps aumentando una serie."
    : "Esta opción tiene sentido cuando ya estás cerca de 12–13 reps por serie y quieres volver a un rango más cómodo de 10 reps aumentando una serie. Por ahora se mantiene inactiva como progresión ideal.";

  const opt = buildOption({
    id: "series",
    name: "Añadir una serie",
    weight: peso,
    series: newSeries,
    totalReps: best.totalReps,
    baseTonnage,
    note,
    currentWeight: peso
  });

  // Si repsBase < 12, se marca como futura inactiva
  if (reps < 12) {
    opt.category = "futura";
    opt.isMainProgression = false;
    opt.isNotRecommended = false;
  }

  return opt;
}

function buildTechniqueOption(context) {
  const { peso, reps, series, salto, baseTonnage } = context;
  const lowerWeight = peso - salto;

  if (lowerWeight <= 0) return null;

  // Bajar peso, mantener series y reps para control y técnica
  const totalReps = reps * series;
  const tonnage = lowerWeight * totalReps;
  const percent = percentIncrease(tonnage, baseTonnage);

  const note = "Úsala cuando quieras priorizar control, técnica, molestias, recuperación o aprendizaje del movimiento. No cuenta como progresión principal de hipertrofia.";

  const opt = buildOption({
    id: "technique",
    name: "Modo técnica / control",
    weight: lowerWeight,
    series,
    totalReps,
    baseTonnage,
    note,
    currentWeight: peso
  });

  opt.category = "tecnica";
  opt.isMainProgression = false;
  opt.isNotRecommended = false;
  opt.isTechnique = true;

  return opt;
}

function autoCalculate(showValidationErrors = false) {
  const validation = validateInputs();

  if (!validation.valid) {
    if (showValidationErrors) {
      showError(validation.msg);
      hideResults();
    }
    return;
  }

  hideError();

  const { peso, reps, series, salto } = validation;
  const totalRepsBase = reps * series;
  const baseTonnage = peso * totalRepsBase;
  const minTarget = baseTonnage * (1 + TARGET_MIN_PERCENT / 100);
  const maxTarget = baseTonnage * (1 + TARGET_MAX_PERCENT / 100);

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

  renderBestOption(options);
  showResults();

  if (showValidationErrors) {
    setTimeout(() => {
      document.getElementById("results").scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }, 80);
  }

  if (window.lucide) lucide.createIcons();
}

function renderSummary(baseTonnage, minTarget, maxTarget) {
  document.getElementById("baseTonnage").textContent = formatKg(baseTonnage);
  document.getElementById("targetRange").textContent = `${formatKg(minTarget)} - ${formatKg(maxTarget)}`;
}

function renderWeightOption(option) {
  const card = document.getElementById("weightCard");
  const badge = document.getElementById("weightBadge");
  if (!option) {
    card.classList.add("hidden");
    return;
  }
  card.classList.remove("hidden");
  updateBadge(badge, option.category);

  // Agregar clase CSS si es no recomendada
  if (option.category === "no_recomendada") {
    card.classList.add("futura-card");
  } else {
    card.classList.remove("futura-card");
  }

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
  const card = document.getElementById("repsCard");
  const badge = document.getElementById("repsBadge");
  if (!option) {
    card.classList.add("hidden");
    return;
  }
  card.classList.remove("hidden");
  updateBadge(badge, option.category);

  if (option.category === "no_recomendada") {
    card.classList.add("futura-card");
  } else {
    card.classList.remove("futura-card");
  }

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
  const card = document.getElementById("combinedCard");
  const badge = document.getElementById("combinedBadge");
  if (!option) {
    card.classList.add("hidden");
    return;
  }
  card.classList.remove("hidden");
  updateBadge(badge, option.category);

  if (option.category === "no_recomendada") {
    card.classList.add("futura-card");
  } else {
    card.classList.remove("futura-card");
  }

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
  const card = document.getElementById("seriesCard");
  const badge = document.getElementById("seriesBadge");
  if (!option) {
    card.classList.add("hidden");
    return;
  }
  card.classList.remove("hidden");
  updateBadge(badge, option.category);

  if (option.category === "futura" || option.category === "no_recomendada") {
    card.classList.add("futura-card");
  } else {
    card.classList.remove("futura-card");
  }

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
  const section = document.getElementById("techniqueSection");
  if (!option) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");
  
  renderGenericOption(option, {
    mainId: "techniqueMain",
    tonnageId: "techniqueTonnage",
    percentId: "techniquePercent",
    noteId: "techniqueNote",
    mainText: `
      Baja de <b>${formatKg(option.currentWeight)}</b> a
      <b>${formatKg(option.weight)}</b>.
      Haz <b>${option.totalReps} reps totales</b> (${distributionText(option.distribution)}).
    `
  });
}

function updateBadge(badge, category) {
  if (!badge) return;
  badge.className = "option-badge";
  
  if (category === "ideal") {
    badge.textContent = "Ideal";
    badge.classList.add("badge-ideal");
  } else if (category === "conservadora") {
    badge.textContent = "Conservadora";
    badge.classList.add("badge-conservadora");
  } else if (category === "no_recomendada") {
    badge.textContent = "Excesiva";
    badge.classList.add("badge-no-recomendada");
  } else if (category === "secundaria") {
    badge.textContent = "Secundaria";
    badge.classList.add("badge-conservadora");
  } else if (category === "alta_repeticion") {
    badge.textContent = "Alta Rep.";
    badge.classList.add("badge-alta-rep");
  } else if (category === "futura") {
    badge.textContent = "Futura";
    badge.classList.add("badge-futura");
  } else if (category === "tecnica") {
    badge.textContent = "Técnica";
    badge.classList.add("badge-tecnica");
  } else {
    badge.textContent = category;
    badge.classList.add("badge-futura");
  }
}

function renderGenericOption(option, config) {
  const percentText = formatPercent(option.percent);
  document.getElementById(config.mainId).innerHTML = config.mainText;
  document.getElementById(config.tonnageId).innerHTML = formatKg(option.tonnage);
  document.getElementById(config.percentId).innerHTML = `
    <span class="${option.status.className}">
      ${percentText}
    </span>
  `;
  document.getElementById(config.noteId).innerHTML = `
    ${option.note} <br><strong>Estatus:</strong> <span class="${option.status.className}">${option.status.text}</span>.
  `;
}

function renderBestOption(options) {
  const bestText = document.getElementById("bestText");

  // Filtrar ideales
  const idealOptions = options.filter(opt => 
    opt.category === "ideal" &&
    opt.isMainProgression === true &&
    !opt.isTechnique &&
    !opt.isNotRecommended
  );

  if (idealOptions.length > 0) {
    // Ordenar ideales con criterio deportivo
    idealOptions.sort((a, b) => {
      const aHyper = (a.maxRepsPerSet <= PRIMARY_REP_MAX && a.minRepsPerSet >= PRIMARY_REP_MIN);
      const bHyper = (b.maxRepsPerSet <= PRIMARY_REP_MAX && b.minRepsPerSet >= PRIMARY_REP_MIN);
      if (aHyper && !bHyper) return -1;
      if (!aHyper && bHyper) return 1;

      // Más cercano al 10% sin pasarse (a.percent y b.percent son <= 10)
      return b.percent - a.percent;
    });

    const best = idealOptions[0];
    bestText.innerHTML = `
      Te conviene la opción de <b>${best.name.toLowerCase()}</b>:
      <b>${formatKg(best.weight)}</b>,
      <b>${best.series} series</b>, y
      <b>${best.totalReps} reps totales</b> (${distributionText(best.distribution)}).
      Logras un tonelaje de <b>${formatKg(best.tonnage)}</b>, equivalente a un
      <b>+${formatPercent(best.percent)}</b> de aumento. Esta opción queda dentro del rango recomendado por tonelaje.
    `;
    return;
  }

  // Si no hay ideales, buscar conservadoras
  const conservadoraOptions = options.filter(opt =>
    opt.category === "conservadora" &&
    opt.isMainProgression === true &&
    !opt.isTechnique &&
    !opt.isNotRecommended
  );

  if (conservadoraOptions.length > 0) {
    conservadoraOptions.sort((a, b) => b.percent - a.percent);
    const best = conservadoraOptions[0];
    bestText.innerHTML = `
      No hay una progresión ideal con estos datos y este salto de peso. La opción más segura queda por debajo del 5%, o se necesita ajustar manualmente el salto, las series o las repeticiones. 
      Como alternativa conservadora, te sugerimos <b>${best.name.toLowerCase()}</b>:
      <b>${formatKg(best.weight)}</b>,
      <b>${best.series} series</b>, y
      <b>${best.totalReps} reps totales</b> (${distributionText(best.distribution)}), 
      con un aumento del <b>+${formatPercent(best.percent)}</b>.
    `;
    return;
  }

  // Si todas superan el 10% de seguridad
  bestText.innerHTML = `
    No recomiendo progresar con estos datos: todas las opciones disponibles superan el 10%. 
    Reduce el salto de peso, mantén el peso actual o ajusta manualmente las repeticiones.
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

// Para depuración y pruebas de calidad deportiva: se puede ejecutar en consola
window.runAlgorithmTests = function() {
  console.log("=== INICIANDO PRUEBAS DE ALGORITMO DE PROGRESIÓN GYM ===");

  function mockContext(peso, reps, series, salto) {
    const totalRepsBase = reps * series;
    const baseTonnage = peso * totalRepsBase;
    return {
      peso, reps, series, salto,
      totalRepsBase, baseTonnage,
      minTarget: baseTonnage * 1.05,
      maxTarget: baseTonnage * 1.10
    };
  }

  // Caso 1
  {
    const ctx = mockContext(130, 10, 4, 5);
    const weightOpt = buildWeightOption(ctx);
    const repsOpt = buildRepsOption(ctx);
    console.assert(weightOpt.percent > 0, "Caso 1: Peso debe progresar");
    console.log("Caso 1 (Peso 130, 10 reps, 4 series, salto 5):");
    console.log(`- Base: ${ctx.baseTonnage} kg. Rango objetivo: ${ctx.minTarget.toFixed(1)}-${ctx.maxTarget.toFixed(1)} kg.`);
    console.log(`- Opción Reps (total reps ${repsOpt.totalReps}): +${repsOpt.percent.toFixed(1)}% | Categoría: ${repsOpt.category}`);
  }

  // Caso 2
  {
    const ctx = mockContext(100, 10, 4, 20);
    const weightOpt = buildWeightOption(ctx);
    console.log("Caso 2 (Salto grande 20kg):");
    console.log(`- Opción Peso (+20%): +${weightOpt.percent.toFixed(1)}% | Categoría: ${weightOpt.category} | Recomendable: ${!weightOpt.isNotRecommended}`);
    console.assert(weightOpt.isNotRecommended === true, "Caso 2: Subir peso debe ser no recomendado");
  }

  // Caso 3
  {
    const ctx = mockContext(50, 15, 4, 2.5);
    const repsOpt = buildRepsOption(ctx);
    console.log("Caso 3 (Reps base altas = 15):");
    console.log(`- Opción Reps: max reps por serie = ${repsOpt.maxRepsPerSet} | Categoría: ${repsOpt.category}`);
    console.assert(repsOpt.category === "secundaria" || repsOpt.category === "no_recomendada", "Caso 3: Debe catalogarse como secundaria o no recomendada por altas reps");
  }

  // Caso 4
  {
    const ctx = mockContext(80, 12, 4, 5);
    const seriesOpt = buildSeriesOption(ctx);
    console.log("Caso 4 (Reps base 12, añade serie):");
    console.log(`- Opción Series: reps totales = ${seriesOpt.totalReps} | Categoría: ${seriesOpt.category}`);
    console.assert(seriesOpt.category === "ideal" || seriesOpt.category === "conservadora", "Caso 4: Añadir serie debe permitirse como progresión");
  }

  // Caso 5
  {
    const ctx = mockContext(80, 10, 4, 5);
    const seriesOpt = buildSeriesOption(ctx);
    console.log("Caso 5 (Reps base 10, añade serie):");
    console.log(`- Opción Series: Categoría: ${seriesOpt.category}`);
    console.assert(seriesOpt.category === "futura", "Caso 5: Añadir serie debe ser futura/inactiva");
  }

  console.log("=== PRUEBAS DE ALGORITMO FINALIZADAS ===");
  return "Pruebas finalizadas. Revisa los logs en la consola.";
};