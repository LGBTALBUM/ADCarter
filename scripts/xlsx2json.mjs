import fs from "node:fs";
import XLSX from "xlsx";

const INPUT = "public/data.xlsx";
const OUTPUT = "src/data.json";

const wb = XLSX.readFile(INPUT);
const ws = wb.Sheets[wb.SheetNames[0]];

// 轉成二维陣列
const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

// 展開合併儲存格：把左上角值填到合併範圍每一格
const merges = ws["!merges"] || [];
for (const m of merges) {
  const v = (aoa[m.s.r] && aoa[m.s.r][m.s.c]) ?? "";
  for (let r = m.s.r; r <= m.e.r; r++) {
    aoa[r] = aoa[r] || [];
    for (let c = m.s.c; c <= m.e.c; c++) {
      const cur = aoa[r][c];
      if (cur === "" || cur == null) aoa[r][c] = v;
    }
  }
}

// 向下填充：空白就沿用上一列（依你的資料習慣選欄位）
// 常見只需要 A/B/C/D 這種階層欄位
const FILL_DOWN_COLS = [0, 1, 2, 3, 4, 5, 6, 7, 8]; // A,B,C,D  (需要更多就加到 8)

for (const c of FILL_DOWN_COLS) {
  for (let r = 1; r < aoa.length; r++) {
    aoa[r] = aoa[r] || [];
    const cur = aoa[r][c];
    const prev = aoa[r - 1]?.[c];
    if ((cur === "" || cur == null) && (prev !== "" && prev != null)) {
      aoa[r][c] = prev;
    }
  }
}

// ✅ 你若 Excel 第 1 列是標題列，改成 aoa.slice(1)
const rows = aoa
  .filter((r) => r.some((cell) => String(cell).trim() !== ""))
  .map((r) => ({
    A: String(r[0] ?? "").trim(),
    B: String(r[1] ?? "").trim(),
    C: String(r[2] ?? "").trim(),
    D: String(r[3] ?? "").trim(),
    E: String(r[4] ?? "").trim(),
    F: String(r[5] ?? "").trim(),
    G: String(r[6] ?? "").trim(),
    H: String(r[7] ?? "").trim(),
    I: String(r[8] ?? "").trim(),
  }));

fs.writeFileSync(OUTPUT, JSON.stringify(rows, null, 2), "utf8");
console.log(`Wrote ${rows.length} rows -> ${OUTPUT}`);
