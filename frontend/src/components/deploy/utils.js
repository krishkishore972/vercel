export function getLiveProjectUrl(proxyUrl, subDomain) {
  const clean = (proxyUrl || "").replace(/\/$/, "");
  if (!clean || !subDomain) return "#";
  // Render free tier can't do nested subdomains (*.*.onrender.com SSL fails),
  // so use path mode: https://xxx.onrender.com/site/:subDomain
  if (/onrender\.com/i.test(clean)) {
    return `${clean}/site/${subDomain}`;
  }
  const normalized = /^https?:\/\//i.test(clean) ? clean : `http://${clean}`;
  try {
    const url = new URL(normalized);
    url.hostname = `${subDomain}.${url.hostname}`;
    return url.toString().replace(/\/$/, "");
  } catch {
    return "#";
  }
}

export function getLogLevel(text = "") {
  if (/ERROR|FAIL|FAILED/i.test(text)) return "error";
  if (/SUCCESS|SUCCESSFUL|Successfully|uploaded successfully/i.test(text))
    return "success";
  if (/WARN|WARNING|in progress|building|deploying/i.test(text)) return "warn";
  return "info";
}

export const LOG_COLORS = {
  error: "text-red-400",
  success: "text-emerald-400",
  warn: "text-amber-300",
  info: "text-slate-300",
};
