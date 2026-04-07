const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const resultEl = document.getElementById("result");
const itemInput = document.getElementById("item-input");
const addItemBtn = document.getElementById("add-item-btn");
const clearItemsBtn = document.getElementById("clear-items-btn");
const itemList = document.getElementById("item-list");
const prizeFileInput = document.getElementById("prize-file");
const userFileInput = document.getElementById("user-file");
const usePrizesBtn = document.getElementById("use-prizes-btn");
const useUsersBtn = document.getElementById("use-users-btn");
const exportBtn = document.getElementById("export-winners-btn");
const historyList = document.getElementById("history-list");
const spinSound = document.getElementById("spin-sound");
const winSound = document.getElementById("win-sound");
const countdownEl = document.getElementById("countdown");
const winnerModal = document.getElementById("winner-modal");
const winnerNameEl = document.getElementById("winner-name");
const winnerGiftEl = document.getElementById("winner-gift");
const winnerCloseBtn = document.getElementById("winner-close-btn");

const PI = Math.PI;
const TAU = 2 * PI;
const dia = canvas.width;
const rad = dia / 2;

let mode = "manual";
let sectors = [
  { label: "Sample 1", color: "#f94144", data: { id: "S1", name: "Sample 1" } },
  { label: "Sample 2", color: "#f3722c", data: { id: "S2", name: "Sample 2" } },
  { label: "Sample 3", color: "#f8961e", data: { id: "S3", name: "Sample 3" } }
];

let prizeRecords = [];
let userRecords = [];
let winnersLog = [];

let ang = 0;
let angVel = 0;
let friction = 0.992;
let spinning = false;
let decelerating = false;
let animationId = null;

function randomColor() {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h} 70% 55%)`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startCountdown(seconds = 3) {
  countdownEl.style.display = "block";

  for (let i = seconds; i > 0; i--) {
    countdownEl.textContent = i;
    countdownEl.classList.remove("show");
    void countdownEl.offsetWidth;
    countdownEl.classList.add("show");
    await sleep(1000);
  }

  countdownEl.textContent = "GO!";
  countdownEl.classList.remove("show");
  void countdownEl.offsetWidth;
  countdownEl.classList.add("show");
  await sleep(500);

  countdownEl.style.display = "none";
}

function playSound(audioEl) {
  if (!audioEl) return;
  audioEl.currentTime = 0;
  const p = audioEl.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

function fireConfetti() {
  if (typeof confetti !== "function") return;

  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.65 }
  });

  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 110,
      origin: { y: 0.6 }
    });
  }, 250);
}

function showWinnerPopup(name, gift) {
  winnerNameEl.textContent = name || "";
  winnerGiftEl.textContent = gift || "";
  winnerModal.classList.remove("hidden");
  requestAnimationFrame(() => winnerModal.classList.add("show"));
  winnerCloseBtn.focus();
}

function hideWinnerPopup() {
  winnerModal.classList.remove("show");
  setTimeout(() => {
    winnerModal.classList.add("hidden");
  }, 250);
}

function updateItemList() {
  itemList.innerHTML = "";
  if (!sectors.length) {
    const li = document.createElement("li");
    li.textContent = "暫時未有項目";
    itemList.appendChild(li);
    return;
  }

  sectors.forEach((s, i) => {
    const li = document.createElement("li");
    if (mode === "prize" && s.data) {
      li.textContent = `${i + 1}. [${s.data.id || ""}] ${s.data.name || s.label} (${s.data.value || ""})`;
    } else if (mode === "user" && s.data) {
      li.textContent = `${i + 1}. [${s.data.id || ""}] ${s.data.name || s.label} <${s.data.email || ""}>`;
    } else {
      li.textContent = `${i + 1}. ${s.label}`;
    }
    itemList.appendChild(li);
  });
}

function drawWheel() {
  ctx.clearRect(0, 0, dia, dia);

  if (!sectors.length) {
    ctx.beginPath();
    ctx.arc(rad, rad, rad - 2, 0, TAU);
    ctx.fillStyle = "#f3f4f6";
    ctx.fill();
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No items", rad, rad);
    return;
  }

  const n = sectors.length;
  const arc = TAU / n;

  sectors.forEach((sector, i) => {
    const start = i * arc;
    const end = start + arc;

    ctx.beginPath();
    ctx.moveTo(rad, rad);
    ctx.arc(rad, rad, rad, start, end);
    ctx.closePath();
    ctx.fillStyle = sector.color;
    ctx.fill();

    ctx.save();
    ctx.translate(rad, rad);
    ctx.rotate(start + arc / 2);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "right";

    const text = sector.label.length > 18 ? sector.label.slice(0, 18) + "…" : sector.label;
    ctx.fillText(text, rad - 12, 5);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(rad, rad, 18, 0, TAU);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#d1d5db";
  ctx.stroke();
}

function getIndex() {
  const n = sectors.length;
  if (!n) return 0;
  const arc = TAU / n;
  const normalized = (TAU - (ang % TAU)) % TAU;
  return Math.floor(normalized / arc) % n;
}

function frame() {
  if (!spinning) return;

  if (!decelerating) {
    angVel *= friction;
  } else {
    angVel *= 0.95;
    if (angVel < 0.01) {
      spinning = false;
      angVel = 0;
      canvas.style.transform = `rotate(${ang}rad)`;
      showResult();
      return;
    }
  }

  ang += angVel;
  ang %= TAU;
  canvas.style.transform = `rotate(${ang}rad)`;
  animationId = requestAnimationFrame(frame);
}

function appendHistoryItem(entry) {
  const li = document.createElement("li");
  if (entry.mode === "user") {
    li.textContent = `[${entry.time}] 中獎者：${entry.name} <${entry.email}> (ID: ${entry.id})`;
  } else if (entry.mode === "prize") {
    li.textContent = `[${entry.time}] 中獎禮物：${entry.name} (ID: ${entry.id}, 價值: ${entry.value})`;
  } else {
    li.textContent = `[${entry.time}] 結果：${entry.name}`;
  }
  historyList.appendChild(li);
}

function showResult() {
  if (!sectors.length) return;

  const idx = getIndex();
  const winner = sectors[idx];
  const rec = winner.data || {};
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  const winnerName = rec.name || winner.label;
  const winnerGift = rec.value ? `Gift: ${rec.value}` : `Gift: ${winner.label}`;

  resultEl.textContent = `結果：${winnerName}`;

  const entry = {
    time: now,
    mode,
    id: rec.id || "",
    name: winnerName,
    email: rec.email || "",
    value: rec.value || ""
  };

  winnersLog.push(entry);
  appendHistoryItem(entry);

  sectors.splice(idx, 1);

  if (mode === "prize" && rec.id) {
    prizeRecords = prizeRecords.filter((r) => r.id !== rec.id);
  }
  if (mode === "user" && rec.id) {
    userRecords = userRecords.filter((r) => r.id !== rec.id);
  }

  playSound(winSound);
  fireConfetti();
  showWinnerPopup(winnerName, winnerGift);

  if (!sectors.length) {
    alert("所有項目已經抽完！");
  }

  updateItemList();
  drawWheel();
}

function parseCsvToObjects(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cols[i] || "").trim();
    });
    return obj;
  });
}

function readCsvFileToObjects(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => callback(parseCsvToObjects(e.target.result));
  reader.readAsText(file, "utf-8");
}

function objectArrayToCsv(items) {
  if (!items.length) return "";
  const headers = Object.keys(items[0]);
  const csvRows = [headers.join(",")];

  for (const row of items) {
    const values = headers.map((header) => {
      const val = row[header] ?? "";
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

function downloadCsv(filename, csvText) {
  const blob = new Blob(["\ufeff" + csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

startBtn.addEventListener("click", async () => {
  if (spinning || sectors.length === 0) return;

  startBtn.disabled = true;
  stopBtn.disabled = true;
  resultEl.textContent = "";
  winnerModal.classList.add("hidden");

  await startCountdown(3);

  angVel = Math.random() * 0.35 + 0.45;
  decelerating = false;
  spinning = true;
  playSound(spinSound);

  startBtn.disabled = false;
  stopBtn.disabled = false;
  animationId = requestAnimationFrame(frame);
});

stopBtn.addEventListener("click", () => {
  if (!spinning) return;
  decelerating = true;
});

addItemBtn.addEventListener("click", () => {
  const text = itemInput.value.trim();
  if (!text) return;

  mode = "manual";
  sectors.push({
    label: text,
    color: randomColor(),
    data: { name: text }
  });

  itemInput.value = "";
  updateItemList();
  drawWheel();
});

itemInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") addItemBtn.click();
});

clearItemsBtn.addEventListener("click", () => {
  sectors = [];
  mode = "manual";
  resultEl.textContent = "";
  updateItemList();
  drawWheel();
});

prizeFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  readCsvFileToObjects(file, (records) => {
    prizeRecords = records;
    alert(`讀到 ${records.length} 個禮物`);
  });
});

userFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  readCsvFileToObjects(file, (records) => {
    userRecords = records;
    alert(`讀到 ${records.length} 個抽獎者`);
  });
});

usePrizesBtn.addEventListener("click", () => {
  if (!prizeRecords.length) {
    alert("請先 upload 禮物 CSV（header: id,name,value）");
    return;
  }

  mode = "prize";
  sectors = prizeRecords.map((rec) => ({
    label: rec.name || rec["gift item"] || "",
    color: randomColor(),
    data: rec
  }));

  updateItemList();
  drawWheel();
});

useUsersBtn.addEventListener("click", () => {
  if (!userRecords.length) {
    alert("請先 upload 抽獎者 CSV（header: id,name,email）");
    return;
  }

  mode = "user";
  sectors = userRecords.map((rec) => ({
    label: rec.name || "",
    color: randomColor(),
    data: rec
  }));

  updateItemList();
  drawWheel();
});

exportBtn.addEventListener("click", () => {
  if (!winnersLog.length) {
    alert("暫時未有任何中獎紀錄。");
    return;
  }
  const csvText = objectArrayToCsv(winnersLog);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  downloadCsv(`lucky-wheel-winners-${ts}.csv`, csvText);
});

winnerCloseBtn.addEventListener("click", hideWinnerPopup);

winnerModal.addEventListener("click", (e) => {
  if (e.target === winnerModal) hideWinnerPopup();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !winnerModal.classList.contains("hidden")) {
    hideWinnerPopup();
  }
});

updateItemList();
drawWheel();