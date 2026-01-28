import { useMemo, useState } from "react";
import data from "./data.json";

const COLS_TOP = ["A", "B", "C"];
const COLS_MID = ["D"];
const COLS_BOTTOM = ["E", "F", "G", "H", "I"];
const ALL = ["A","B","C","D","E","F","G","H","I"];
const LABELS = {
  A: "西元年",
  B: "西元月",
  C: "西元日",
  D: "星期",
  E: "Carter年份",
  F: "Carter月份",
  G: "Carter日期(54日制)",
  H: "Carter日期(27日制)",
  I: "Carter日期分字(27日制)",
};
const MODE_TEXT = { top: "西元曆法轉Carter曆法", bottom: "Carter曆法轉西元曆法", none: "未選" };


function uniq(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const s = String(x).trim();
    if (!s) continue;
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out; // ✅ 不 sort
}

function getMode(values) {
  const topHas = COLS_TOP.some((k) => values[k]);
  const botHas = COLS_BOTTOM.some((k) => values[k]);
  if (topHas && !botHas) return "top";
  if (!topHas && botHas) return "bottom";
  return "none"; // 兩邊都空 or 兩邊都有（正常情況下會被禁用避免）
}

function filterRows(rows, values, activeCols) {
  const filled = activeCols.filter((k) => values[k]);
  if (filled.length === 0) return rows;
  return rows.filter((r) => filled.every((k) => r[k] === values[k]));
}

function App() {
  const [values, setValues] = useState(() =>
    Object.fromEntries(ALL.map((k) => [k, ""]))
  );

  const mode = getMode(values);
  const activeCols = mode === "top" ? COLS_TOP : mode === "bottom" ? COLS_BOTTOM : [...COLS_TOP, ...COLS_BOTTOM];

  // 目前依「正在操作的那一排」過濾出的候選列
  const candidates = useMemo(() => {
    const rows = data;
    if (mode === "top") return filterRows(rows, values, COLS_TOP);
    if (mode === "bottom") return filterRows(rows, values, COLS_BOTTOM);
    // none：尚未決定操作哪排，就用所有條件（若使用者亂填兩邊也能收斂）
    const filled = [...COLS_TOP, ...COLS_BOTTOM].filter((k) => values[k]);
    return rows.filter((r) => filled.every((k) => r[k] === values[k]));
  }, [values, mode]);

  // 用候選列來動態產生選項（做成「越選越收斂」）
  const options = useMemo(() => {
    const base = candidates.length ? candidates : data;
    const o = {};
    for (const k of ALL) o[k] = uniq(base.map((r) => r[k]));
    return o;
  }, [candidates]);

  function hardFillRow(row) {
    setValues((prev) => {
      const next = { ...prev };
      for (const k of ALL) next[k] = row[k] ?? "";
      return next;
    });
  }

  function clearAll() {
    setValues(Object.fromEntries(ALL.map((k) => [k, ""])));
  }

  function onChange(col, v) {
    setValues((prev) => {
      const next = { ...prev, [col]: v };

      // 一旦使用者開始操作 top/bottom，鎖定另一排（用 disabled 做），但這裡也防呆：
      const m = getMode(next);
      if (m === "top") {
        for (const k of COLS_BOTTOM) {
          // 若真的混到值，清掉
          if (next[k]) next[k] = "";
        }
      } else if (m === "bottom") {
        for (const k of COLS_TOP) {
          if (next[k]) next[k] = "";
        }
      }

      // 依 active 排過濾
      const cand =
        m === "top"
          ? filterRows(data, next, COLS_TOP)
          : m === "bottom"
          ? filterRows(data, next, COLS_BOTTOM)
          : filterRows(data, next, [...COLS_TOP, ...COLS_BOTTOM]);

      // ✅ 若唯一命中：自動回填整列（A~I）
      if (cand.length === 1) {
        const row = cand[0];
        for (const k of ALL) next[k] = row[k] ?? "";
      } else {
        // 不唯一就不要亂填：中間 D + 另一排先清空，避免顯示錯資料
        if (m === "top") {
          next["D"] = "";
          for (const k of COLS_BOTTOM) next[k] = "";
        } else if (m === "bottom") {
          next["D"] = "";
          for (const k of COLS_TOP) next[k] = "";
        } else {
          // none：不處理
        }
      }

      return next;
    });
  }

  const lockTop = mode === "bottom";
  const lockBottom = mode === "top";

  const box = {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  };

  const grid3 = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 };
  const grid1 = { display: "grid", gridTemplateColumns: "1fr", gap: 12 };
  const grid5 = { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 };

  function Select({ col, disabled }) {
    return (
      <label style={{ display: "block" }}>
        <div style={{ fontSize: 12, marginBottom: 6 }}>{LABELS[col] ?? col}</div>
        <select
          value={values[col]}
          disabled={disabled}
          onChange={(e) => onChange(col, e.target.value)}
          style={{ width: "100%", padding: "10px 8px", borderRadius: 10, border: "1px solid #ccc" }}
        >
          <option value="">（未選）</option>
          {options[col].map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 12px", fontFamily: "ui-sans-serif, system-ui" }}>
      <h2 style={{ marginBottom: 8 }}>西元日曆 Carter日曆 轉換工具</h2>
      <div style={{ color: "#666", marginBottom: 12, lineHeight: 1.5 }}>
        目前模式：<b>{MODE_TEXT[mode] ?? mode}</b>　|　可查閱筆數：<b>{candidates.length}</b>
        <button onClick={clearAll} style={{ marginLeft: 12, padding: "6px 10px", borderRadius: 10, border: "1px solid #ccc", background: "white", cursor: "pointer" }}>
          清空
        </button>
      </div>

      <div style={box}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>西元曆 年月日</div>
        <div style={grid3}>
          <Select col="A" disabled={lockTop} />
          <Select col="B" disabled={lockTop} />
          <Select col="C" disabled={lockTop} />
        </div>
        {lockTop && <div style={{ marginTop: 8, color: "#a33", fontSize: 12 }}>當前模式：西元曆法轉Carter曆法</div>}
      </div>

      <div style={box}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>星期</div>
        <div style={grid1}>
          <Select col="D" disabled={true} />
        </div>
      </div>

      <div style={box}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>Carter曆 年月日（54日制/27日制）</div>
        <div style={grid5}>
          <Select col="E" disabled={lockBottom} />
          <Select col="F" disabled={lockBottom} />
          <Select col="G" disabled={lockBottom} />
          <Select col="H" disabled={lockBottom} />
          <Select col="I" disabled={lockBottom} />
        </div>
        {lockBottom && <div style={{ marginTop: 8, color: "#a33", fontSize: 12 }}>當前模式：Carter曆法轉西元曆法</div>}
      </div>
    </div>
  );
}

export default App;
