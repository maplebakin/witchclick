const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const STAGGER_STEP = 80;
const STAGGER_MAX = 6;
const PENDING_FALLBACK_MS = 2000;

function bindMotionPreferenceChange(query, listener) {
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }

  if ("onchange" in query) {
    const previous = query.onchange;
    query.onchange = listener;
    return () => {
      if (query.onchange === listener) {
        query.onchange = previous ?? null;
      }
    };
  }

  return () => {};
}

function setupCardAnimations() {
  if (typeof window === "undefined") {
    return () => {};
  }

  const cards = Array.from(document.querySelectorAll(".card-panel"));
  if (!cards.length) {
    return () => {};
  }

  const revealImmediately = (targets) => {
    targets.forEach((card) => {
      if (card.dataset.animate !== "done") {
        card.dataset.animate = "done";
      }
      delete card.dataset.animateDelay;
    });
  };

  const supportsWAAPI = typeof Element !== "undefined" && typeof Element.prototype.animate === "function";
  const supportsObserver = typeof IntersectionObserver !== "undefined";
  const motionPreference = window.matchMedia(MOTION_QUERY);

  // Fail open when animation or observer support is unavailable.
  if (!supportsWAAPI || !supportsObserver) {
    revealImmediately(cards);
    return () => {};
  }

  // Respect reduced motion while keeping cards visible.
  if (motionPreference.matches) {
    revealImmediately(cards);
    return () => {};
  }

  let observer;
  try {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const card = entry.target;
          if (card.dataset.animate === "done") {
            observer.unobserve(card);
            return;
          }

          const delay = Number(card.dataset.animateDelay ?? 0);
          card.dataset.animate = "animating";

          const animation = card.animate(
            [
              {
                opacity: 0,
                transform: "translateY(28px) scale(0.97)",
                filter: "blur(12px) saturate(0.7)",
              },
              {
                opacity: 1,
                transform: "translateY(0) scale(1)",
                filter: "blur(0px) saturate(1)",
              },
            ],
            {
              duration: 680,
              delay,
              easing: "cubic-bezier(0.33, 1, 0.68, 1)",
              fill: "forwards",
            },
          );

          const finalize = () => {
            card.dataset.animate = "done";
            delete card.dataset.animateDelay;
            observer.unobserve(card);
          };

          animation.finished.then(finalize).catch(finalize);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -50px 0px" },
    );
  } catch {
    revealImmediately(cards);
    return () => {};
  }

  // Cards stay visible by default and only enter pending after successful observe.
  cards.forEach((card, index) => {
    if (card.dataset.animate === "done") {
      return;
    }

    try {
      observer.observe(card);
      card.dataset.animate = "pending";
      card.dataset.animateDelay = `${Math.min(index, STAGGER_MAX) * STAGGER_STEP}`;
    } catch {
      card.dataset.animate = "done";
      delete card.dataset.animateDelay;
    }
  });

  // Safety net for jump-scroll/slow-load edge cases.
  const fallbackTimer = window.setTimeout(() => {
    cards.forEach((card) => {
      if (card.dataset.animate === "pending") {
        card.dataset.animate = "done";
        delete card.dataset.animateDelay;
        observer.unobserve(card);
      }
    });
  }, PENDING_FALLBACK_MS);

  const handleMotionChange = (event) => {
    if (event.matches) {
      observer.disconnect();
      revealImmediately(cards);
      return;
    }

    cards.forEach((card, index) => {
      if (card.dataset.animate !== "animating" && card.dataset.animate !== "done") {
        try {
          observer.observe(card);
        } catch {
          card.dataset.animate = "done";
          delete card.dataset.animateDelay;
          return;
        }
        card.dataset.animate = "pending";
        card.dataset.animateDelay = `${Math.min(index, STAGGER_MAX) * STAGGER_STEP}`;
      }
    });
  };

  const detachMotionChange = bindMotionPreferenceChange(motionPreference, handleMotionChange);

  return () => {
    window.clearTimeout(fallbackTimer);
    observer.disconnect();
    detachMotionChange();
  };
}

function runAnimations() {
  let cleanup = null;

  const trigger = () => {
    if (typeof cleanup === "function") {
      cleanup();
    }
    cleanup = setupCardAnimations();
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        trigger();
      },
      { once: true },
    );
  } else {
    trigger();
  }

  document.addEventListener("astro:after-swap", trigger);
  document.addEventListener("astro:page-load", trigger);
}

if (typeof window !== "undefined") {
  if (!window.__wcCardAnimationsInitialized) {
    window.__wcCardAnimationsInitialized = true;
    runAnimations();
  }
}

export {};
