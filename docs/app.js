const csvInput = document.getElementById("csvFiles");
const sourceCsvInput = document.getElementById("sourceCsv");
const sourceStaticInput = document.getElementById("sourceStatic");
const staticDatasetSelect = document.getElementById("staticDataset");
const monthlyAmountInput = document.getElementById("monthlyAmount");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const runButton = document.getElementById("runButton");
const loadStaticButton = document.getElementById("loadStaticButton");
const templateButton = document.getElementById("templateButton");
const statusEl = document.getElementById("status");
const cardsEl = document.getElementById("summaryCards");
const chartCanvas = document.getElementById("chart");
const csvHelpEl = document.getElementById("csvHelp");
const staticHelpEl = document.getElementById("staticHelp");

const palette = ["#136f63", "#d95d39", "#315cfd", "#9f6f00", "#8d3dae", "#0081a7"];
let datasets = [];
let sourceMode = "csv";
let staticCatalog = null;

function setStatus(message) {
  statusEl.textContent = message;
}

function clearResults() {
  cardsEl.innerHTML = "";
  const ctx = chartCanvas.getContext("2d");
  ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
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

function simulateDataset(dataset, monthlyAmount, startMonth, endMonth) {
  const months = monthKeysBetween(startMonth, endMonth);
  let shares = 0;
  let invested = 0;
  const series = [];

  for (const month of months) {
    const point = dataset.monthMap.get(month);
    if (!point) {
      continue;
    }

    invested += monthlyAmount;
    shares += monthlyAmount / point.close;
    series.push({
      month,
      value: shares * point.close,
      invested,
    });
  }

  if (series.length === 0) {
    throw new Error(`${dataset.name} は指定期間に月次データがありません。`);
  }

  const finalPoint = series.at(-1);
  return {
    name: dataset.name,
    invested: finalPoint.invested,
    finalValue: finalPoint.value,
    gain: finalPoint.value - finalPoint.invested,
    gainRate: ((finalPoint.value / finalPoint.invested) - 1) * 100,
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
      <p class="metric"><strong>投資元本</strong>${yen(result.invested)}</p>
      <p class="metric"><strong>評価額</strong>${yen(result.finalValue)}</p>
      <p class="metric ${gainClass}"><strong>損益</strong>${yen(result.gain)} (${percent(result.gainRate)})</p>
      <p class="meta">${result.startMonth} から ${result.endMonth} まで ${result.months} 回積立</p>
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

  const allValues = results.flatMap((result) => result.series.map((point) => point.value));
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

    const lastPoint = result.series.at(-1);
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
    .map((dataset) => Array.from(dataset.monthMap.keys()).at(-1))
    .sort()
    .at(-1);

  startDateInput.value = `${minMonth}-01`;
  endDateInput.value = `${maxMonth}-01`;
}

async function loadFiles(files) {
  datasets = [];

  for (const file of files) {
    const text = await file.text();
    const rows = parseCsv(text);
    datasets.push(buildDataset(deriveName(file.name), rows, { source: "csv" }));
  }

  applyDefaultRange();
  setStatus(`${datasets.length} 件の指数データを読み込みました。`);
}

function parseStaticRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("静的JSONに価格データがありません。");
  }

  const normalized = rows
    .map((row) => ({
      date: typeof row.date === "string" ? row.date : "",
      close: Number(row.close),
    }))
    .filter((row) => row.date && !Number.isNaN(row.close));

  if (normalized.length === 0) {
    throw new Error("静的JSONの価格データ形式が正しくありません。");
  }

  normalized.sort((a, b) => a.date.localeCompare(b.date));
  return normalized;
}

function populateStaticOptions(catalog) {
  staticDatasetSelect.innerHTML = "";
  for (const dataset of catalog.datasets) {
    const option = document.createElement("option");
    option.value = dataset.id;
    option.textContent = dataset.name;
    staticDatasetSelect.appendChild(option);
  }
}

async function loadStaticCatalog() {
  if (staticCatalog) {
    return staticCatalog;
  }

  const response = await fetch("assets/indices.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`静的JSONを取得できませんでした: HTTP ${response.status}`);
  }

  const catalog = await response.json();
  if (!catalog || !Array.isArray(catalog.datasets)) {
    throw new Error("静的JSONの形式が正しくありません。");
  }

  staticCatalog = catalog;
  populateStaticOptions(catalog);
  return catalog;
}

async function loadStaticDataset() {
  const catalog = await loadStaticCatalog();
  const datasetId = staticDatasetSelect.value;
  const selected = catalog.datasets.find((dataset) => dataset.id === datasetId);

  if (!selected) {
    throw new Error("選択した静的データセットが見つかりません。");
  }

  const rows = parseStaticRows(selected.rows);
  datasets = [buildDataset(selected.name, rows, selected.meta || { source: "static" })];
  applyDefaultRange();
  setStatus(`${selected.name} を静的JSONから読み込みました。`);
}

function updateSourceUi() {
  const isCsv = sourceMode === "csv";
  csvInput.disabled = !isCsv;
  loadStaticButton.disabled = isCsv;
  staticDatasetSelect.disabled = isCsv;
  csvHelpEl.textContent = isCsv
    ? "`Date` と `Close` 系の列があれば読み込めます。"
    : "CSVモードに切り替えると選択できます。";
  staticHelpEl.textContent = isCsv
    ? "`docs/assets/indices.json` を使うときはサンプル内蔵データに切り替えてください。"
    : "`docs/assets/indices.json` から読み込みます。";

  clearResults();
  datasets = [];
  setStatus(
    isCsv
      ? "CSV を読み込んでください。"
      : "静的JSONを読み込んでください。GitHub Pages 上では docs/assets/indices.json を参照します。"
  );
}

function runSimulation() {
  if (datasets.length === 0) {
    setStatus(sourceMode === "csv" ? "先に CSV を読み込んでください。" : "先に静的JSONを読み込んでください。");
    return;
  }

  const monthlyAmount = Number(monthlyAmountInput.value);
  const startMonth = startDateInput.value.slice(0, 7);
  const endMonth = endDateInput.value.slice(0, 7);

  if (!monthlyAmount || !startMonth || !endMonth) {
    setStatus("積立額と期間を指定してください。");
    return;
  }

  if (startMonth > endMonth) {
    setStatus("開始月は終了月以前にしてください。");
    return;
  }

  try {
    const results = datasets.map((dataset) =>
      simulateDataset(dataset, monthlyAmount, startMonth, endMonth)
    );
    renderCards(results);
    renderChart(results);
    setStatus("シミュレーションを更新しました。");
  } catch (error) {
    setStatus(error.message);
  }
}

function downloadTemplate() {
  const csv = "Date,Close\n2024-01-31,1000\n2024-02-29,1030\n2024-03-29,980\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "index_template.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

csvInput.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) {
    return;
  }

  try {
    await loadFiles(files);
    runSimulation();
  } catch (error) {
    setStatus(error.message);
  }
});

sourceCsvInput.addEventListener("change", () => {
  sourceMode = "csv";
  updateSourceUi();
});

sourceStaticInput.addEventListener("change", () => {
  sourceMode = "static";
  updateSourceUi();
});

loadStaticButton.addEventListener("click", async () => {
  try {
    await loadStaticDataset();
    runSimulation();
  } catch (error) {
    setStatus(
      `${error.message} ブラウザで file:// 直開きしている場合は、GitHub Pages かローカルHTTP配信で確認してください。`
    );
  }
});

runButton.addEventListener("click", runSimulation);
templateButton.addEventListener("click", downloadTemplate);
updateSourceUi();
