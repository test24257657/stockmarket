export function pct(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const v = Number(n);
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

export function clsChange(n) {
  if (n == null) return "";
  return n >= 0 ? "up" : "down";
}

export function num(n, d = 2) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });
}

export function Spark({ values, up }) {
  if (!values?.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const w = 120;
  const h = 36;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={up ? "#15803d" : "#b91c1c"} strokeWidth="1.5" points={pts} />
    </svg>
  );
}
