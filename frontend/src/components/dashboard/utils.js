const gradients = [
  "from-deploy-purple to-deploy-blue",
  "from-fuchsia-500 to-deploy-purple",
  "from-deploy-blue to-cyan-500",
  "from-violet-500 to-fuchsia-500",
  "from-indigo-500 to-deploy-blue",
  "from-purple-500 to-pink-500",
];

export function getGradient(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return gradients[h % gradients.length];
}

export function getInitials(name = "?") {
  return name
    .split(/[\s-_]+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatGitURL(url) {
  try {
    const match = url.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/);
    return match ? match[1] : url;
  } catch {
    return url;
  }
}

export function isValidGitHubURL(url) {
  return /^https?:\/\/github\.com\/[^/]+\/[^/]+?(\.git)?\/?$/.test(url.trim());
}
