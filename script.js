const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spin-btn");
const resultEl = document.getElementById("result");
const itemInput = document.getElementById("item-input");
const addItemBtn = document.getElementById("add-item-btn");
const clearItemsBtn = document.getElementById("clear-items-btn");
const itemList = document.getElementById("item-list");

const PI = Math.PI;
const TAU = 2 * PI;
const dia = canvas.width;
const rad = dia / 2;

// state
let sectors = [
  { label: "Sample 1", color: "#f94144" },
  { label: "Sample 2", color: "#f3722c" },
  { label: "Sample 3", color: "#f8961e" },
];
let ang = 0;
let angVel = 0;
let friction = 0.991;
let spinning = false;

function randomColor() {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h} 70% 55%)`;
}

function updateItemList() {
  itemList.innerHTML = "";
  sectors.forEach((s, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${s.label}`;
    itemList.appendChild(li);
  });
}

function drawWheel() {
  const n = sectors.length;
  const arc = TAU / n;
  ctx.clearRect(0, 0, dia, dia);

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
    ctx.fillText(sector.label, rad - 10, 5);
    ctx.restore();
  });
}

function getIndex() {
  const n = sectors.length;
  const arc = TAU / n;
  const normalized = (TAU - (ang % TAU)) % TAU;
  return Math.floor(normalized / arc) % n;
}

function frame() {
  if (!spinning) return;

  ang += angVel;
  ang %= TAU;
  angVel *= friction;

  canvas.style.transform = `rotate(${ang}rad)`;

  if (angVel < 0.002) {
    spinning = false;
    angVel = 0;
    showResult();
    return;
  }
  requestAnimationFrame(frame);
}

function showResult() {
  const idx = getIndex();
  const winner = sectors[idx];
  resultEl.textContent = `結果：${winner.label}`;
}

spinBtn.addEventListener("click", () => {
  if (spinning || sectors.length === 0) return;
  resultEl.textContent = "";
  angVel = Math.random() * 0.4 + 0.25;
  spinning = true;
  requestAnimationFrame(frame);
});

addItemBtn.addEventListener("click", () => {
  const text = itemInput.value.trim();
  if (!text) return;
  sectors.push({ label: text, color: randomColor() });
  itemInput.value = "";
  updateItemList();
  drawWheel();
});

itemInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") addItemBtn.click();
});

clearItemsBtn.addEventListener("click", () => {
  sectors = [];
  updateItemList();
  drawWheel();
  resultEl.textContent = "";
});

updateItemList();
drawWheel();