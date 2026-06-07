const datasetSelect = document.getElementById("datasetSelect");
const initialAmountInput = document.getElementById("initialAmount");
const monthlyAmountInput = document.getElementById("monthlyAmount");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const runButton = document.getElementById("runButton");
const reloadButton = document.getElementById("reloadButton");
const statusEl = document.getElementById("status");
const cardsEl = document.getElementById("summaryCards");
const chartCanvas = document.getElementById("chart");
const datasetHelpEl = document.getElementById("datasetHelp");
const bundledCsvData = window.BUNDLED_CSV_DATA || {};

const palette = ["#136f63", "#d95d39", "#315cfd", "#9f6f00", "#8d3dae", "#0081a7"];
const bundledCatalog = {
  updatedAt: "2026-06-07",
  datasets: [
    {
      id: "sp500",
      name: "S&P 500",
      file: "sp500.csv",
      meta: {
        source: "FRED",
        seriesId: "SP500",
        lastObservedDate: "2026-06-04",
      },
    },
    {
      id: "nasdaq100",
      name: "NASDAQ-100",
      file: "nasdaq100.csv",
      meta: {
        source: "FRED",
        seriesId: "NASDAQ100",
        lastObservedDate: "2026-06-04",
      },
    },
    {
      id: "sox",
      name: "SOX",
      file: "sox.csv",
      meta: {
        source: "FRED",
        seriesId: "NASDAQSOX",
        lastObservedDate: "2026-06-04",
      },
    },
  ],
};
let datasets = [];
let csvCatalog = bundledCatalog;

function setStatus(message) {
  statusEl.textContent = message;
}

function clearResults() {
  cardsEl.innerHTML = "";
  const ctx = chartCanvas.getContext("2d");
  ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
}

function lastItem(items) {
  return items[items.length - 1];
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error("CSV にデータ行がありません。");
  }

  const headers = lines[0].split(",").map((cell) => cell.trim());
  const lowerHeaders = headers.map((header) => header.toLowerCase());
  const dateIndex = lowerHeaders.findIndex((header) => header === "date");
  const closeIndex = lowerHeaders.findIndex((header) =>
    ["close", "adj close", "price"].includes(header)
  );

  if (dateIndex === -1 || closeIndex === -1) {
    throw new Error("`Date` 列と `Close` 系の列が必要です。");
  }

  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",").map((cell) => cell.trim());
    const date = cells[dateIndex];
    const close = Number(cells[closeIndex]);
    if (!date || Number.isNaN(close)) {
      continue;
    }
    rows.push({ date, close });
  }

  if (rows.length === 0) {
    throw new Error("有効な価格データを読み込めませんでした。");
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

function toMonthMap(rows) {
  const monthMap = new Map();
  for (const row of rows) {
    const monthKey = row.date.slice(0, 7);
    monthMap.set(monthKey, row);
  }
  return monthMap;
}

function monthKeysBetween(startMonth, endMonth) {
  const keys = [];
  const cursor = new Date(`${startMonth}-01T00:00:00`);
  const end = new Date(`${endMonth}-01T00:00:00`);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    keys.push(`${year}-${month}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

function simulateDataset(dataset, initialAmount, monthlyAmount, startMonth, endMonth) {
  const months = monthKeysBetween(startMonth, endMonth);
  let shares = 0;
  let invested = 0;
  const series = [];
  let initialApplied = false;
  let contributionCount = 0;

  for (const month of months) {
    const point = dataset.monthMap.get(month);
    if (!point) {
      continue;
    }

    if (!initialApplied && initialAmount > 0) {
      invested += initialAmount;
      shares += initialAmount / point.close;
      initialApplied = true;
    }

    if (monthlyAmount > 0) {
      invested += monthlyAmount;
      shares += monthlyAmount / point.close;
      contributionCount += 1;
    }

    series.push({
      month,
      value: shares * point.close,
      invested,
    });
  }

  if (series.length === 0) {
    throw new Error(`${dataset.name} は指定期間に月次データがありません。`);
  }

  const finalPoint = lastItem(series);
  return {
    name: dataset.name,
    invested: finalPoint.invested,
    finalValue: finalPoint.value,
    gain: finalPoint.value - finalPoint.invested,
    gainRate: ((finalPoint.value / finalPoint.invested) - 1) * 100,
    initialAmount,
    monthlyAmount,
    contributionCount,
    startMonth: series[0].month,
    endMonth: finalPoint.month,
    months: series.length,
    series,
  };
}

function yen(value) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function renderCards(results) {
  cardsEl.innerHTML = "";

  for (const result of results) {
    const card = document.createElement("article");
    card.className = "card";
    const gainClass = result.gain >= 0 ? "gain-positive" : "gain-negative";
    card.innerHTML = `
      <h3>${result.name}</h3>
      <p class="metric"><strong>初期投資</strong>${yen(result.initialAmount)}</p>
      <p class="metric"><strong>毎月積立</strong>${yen(result.monthlyAmount)}</p>
      <p class="metric"><strong>投資元本</strong>${yen(result.invested)}</p>
      <p class="metric"><strong>評価額</strong>${yen(result.finalValue)}</p>
      <p class="metric ${gainClass}"><strong>損益</strong>${yen(result.gain)} (${percent(result.gainRate)})</p>
      <p class="meta">${result.startMonth} から ${result.endMonth} まで ${result.contributionCount} 回積立</p>
    `;
    cardsEl.appendChild(card);
  }
}

function renderChart(results) {
  const ctx = chartCanvas.getContext("2d");
  const width = chartCanvas.width;
  const height = chartCanvas.height;
  ctx.clearRect(0, 0, width, height);

  if (results.length === 0) {
    return;
  }

  const allValues = [];
  results.forEach((result) => {
    result.series.forEach((point) => {
      allValues.push(point.value);
    });
  });
  const maxValue = Math.max(...allValues);
  const minValue = 0;
  const left = 64;
  const right = width - 30;
  const top = 26;
  const bottom = height - 46;

  ctx.strokeStyle = "rgba(29, 42, 47, 0.12)";
  ctx.lineWidth = 1;
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#53626a";

  for (let i = 0; i <= 4; i += 1) {
    const y = top + ((bottom - top) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();

    const value = maxValue - ((maxValue - minValue) / 4) * i;
    ctx.fillText(yen(value), 8, y + 4);
  }

  results.forEach((result, index) => {
    const color = palette[index % palette.length];
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();

    result.series.forEach((point, pointIndex) => {
      const x = left + ((right - left) * pointIndex) / Math.max(result.series.length - 1, 1);
      const y = bottom - ((point.value - minValue) / (maxValue - minValue || 1)) * (bottom - top);
      if (pointIndex === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    const lastPoint = lastItem(result.series);
    const labelX = right - 100;
    const labelY = bottom - ((lastPoint.value - minValue) / (maxValue - minValue || 1)) * (bottom - top);
    ctx.fillStyle = color;
    ctx.fillRect(labelX, Math.max(top, labelY - 10), 10, 10);
    ctx.fillStyle = "#1d2a2f";
    ctx.fillText(result.name, labelX + 16, Math.max(top + 9, labelY));
  });
}

function deriveName(fileName) {
  return fileName.replace(/\.csv$/i, "");
}

function buildDataset(name, rows, meta = {}) {
  return {
    name,
    rows,
    monthMap: toMonthMap(rows),
    meta,
  };
}

function applyDefaultRange() {
  if (datasets.length === 0) {
    return;
  }

  const minMonth = datasets
    .map((dataset) => Array.from(dataset.monthMap.keys())[0])
    .sort()[0];
  const maxMonth = datasets
    .map((dataset) => lastItem(Array.from(dataset.monthMap.keys())))
    .sort()[datasets.length - 1];

  startDateInput.value = minMonth;
  endDateInput.value = maxMonth;
}

function hasSelectedRange() {
  return Boolean(startDateInput.value && endDateInput.value);
}

function populateDatasetOptions(catalog) {
  const existingValues = new Set(Array.from(datasetSelect.options).map((option) => option.value));
  for (const dataset of catalog.datasets) {
    if (existingValues.has(dataset.id)) {
      continue;
    }

    const option = document.createElement("option");
    option.value = dataset.id;
    option.textContent = dataset.name;
    datasetSelect.appendChild(option);
  }
}

async function loadCsvCatalog() {
  if (!csvCatalog || !Array.isArray(csvCatalog.datasets)) {
    throw new Error("CSVカタログの形式が正しくありません。");
  }

  populateDatasetOptions(csvCatalog);
  return csvCatalog;
}

async function loadSelectedDataset(options = {}) {
  const preserveRange = options.preserveRange === true;
  const catalog = await loadCsvCatalog();
  const datasetId = datasetSelect.value;
  const selected = catalog.datasets.find((dataset) => dataset.id === datasetId);

  if (!selected) {
    throw new Error("選択したCSVデータセットが見つかりません。");
  }

  const csvText = bundledCsvData[selected.file];
  if (!csvText) {
    throw new Error(`${selected.file} の同梱データが見つかりません。`);
  }

  const rows = parseCsv(csvText);
  datasets = [buildDataset(selected.name, rows, selected.meta || { source: "bundled-csv" })];
  if (!preserveRange && !hasSelectedRange()) {
    applyDefaultRange();
  }
  setStatus(`${selected.name} を読み込みました。`);
}

function renderSimulation() {
  if (datasets.length === 0) {
    throw new Error("先に CSV データセットを読み込んでください。");
  }

  const initialAmount = Number(initialAmountInput.value);
  const monthlyAmount = Number(monthlyAmountInput.value);
  const startMonth = startDateInput.value.slice(0, 7);
  const endMonth = endDateInput.value.slice(0, 7);

  if (Number.isNaN(initialAmount) || initialAmount < 0) {
    throw new Error("初期投資額は 0 円以上にしてください。");
  }

  if (Number.isNaN(monthlyAmount) || monthlyAmount < 0) {
    throw new Error("毎月の積立額は 0 円以上にしてください。");
  }

  if (!startMonth || !endMonth) {
    throw new Error("初期投資額・積立額・期間を指定してください。");
  }

  if (startMonth > endMonth) {
    throw new Error("開始月は終了月以前にしてください。");
  }

  if (initialAmount === 0 && monthlyAmount === 0) {
    throw new Error("初期投資額か毎月の積立額のどちらかを 1 円以上にしてください。");
  }

  const results = datasets.map((dataset) =>
    simulateDataset(dataset, initialAmount, monthlyAmount, startMonth, endMonth)
  );
  renderCards(results);
  renderChart(results);
  setStatus("シミュレーションを更新しました。");
}

async function ensureDatasetLoaded(forceReload = false) {
  if (!forceReload && datasets.length > 0) {
    return;
  }

  await loadSelectedDataset({ preserveRange: forceReload && hasSelectedRange() });
}

async function runSimulation(forceReload = false) {
  try {
    await ensureDatasetLoaded(forceReload);
    renderSimulation();
  } catch (error) {
    setStatus(error.message);
  }
}

runButton.addEventListener("click", () => {
  runSimulation(true);
});
reloadButton.addEventListener("click", async () => {
  try {
    await loadSelectedDataset({ preserveRange: true });
    renderSimulation();
  } catch (error) {
    setStatus(error.message);
  }
});

datasetSelect.addEventListener("change", async () => {
  try {
    await loadSelectedDataset({ preserveRange: true });
    renderSimulation();
  } catch (error) {
    setStatus(error.message);
  }
});

async function initialize() {
  try {
    const catalog = await loadCsvCatalog();
    datasetHelpEl.textContent = `${catalog.datasets.length} 件のCSVを利用できます。`;
    if (catalog.datasets.length > 0) {
      await loadSelectedDataset();
      renderSimulation();
    } else {
      setStatus("CSV データセットが見つかりません。");
    }
  } catch (error) {
    setStatus(error.message);
  }
}

initialize();
