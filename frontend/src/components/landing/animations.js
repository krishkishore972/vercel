export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: "easeOut" },
  }),
};

export const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}
