// src/scripts/card-animations.ts
var MOTION_QUERY = "(prefers-reduced-motion: reduce)";
var STAGGER_STEP = 80;
var STAGGER_MAX = 6;
function setupCardAnimations() {
  if (typeof window === "undefined") {
    return () => {
    };
  }
  const supportsWAAPI = typeof Element !== "undefined" && typeof Element.prototype.animate === "function";
  if (!supportsWAAPI) {
    return () => {
    };
  }
  const motionPreference = window.matchMedia(MOTION_QUERY);
  if (motionPreference.matches) {
    return () => {
    };
  }
  const cards = Array.from(document.querySelectorAll(".card-panel"));
  if (!cards.length) {
    return () => {
    };
  }
  cards.forEach((card, index) => {
    if (card.dataset.animate !== "done") {
      card.dataset.animate = "pending";
      card.dataset.animateDelay = `${Math.min(index, STAGGER_MAX) * STAGGER_STEP}`;
    }
  });
  const observer = new IntersectionObserver(
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
              filter: "blur(12px) saturate(0.7)"
            },
            {
              opacity: 1,
              transform: "translateY(0) scale(1)",
              filter: "blur(0px) saturate(1)"
            }
          ],
          {
            duration: 680,
            delay,
            easing: "cubic-bezier(0.33, 1, 0.68, 1)",
            fill: "forwards"
          }
        );
        const finalize = () => {
          card.dataset.animate = "done";
          delete card.dataset.animateDelay;
          observer.unobserve(card);
        };
        animation.finished.then(finalize).catch(finalize);
      });
    },
    { threshold: 0.25, rootMargin: "0px 0px -10%" }
  );
  cards.forEach((card) => observer.observe(card));
  const handleMotionChange = (event) => {
    if (event.matches) {
      observer.disconnect();
      cards.forEach((card) => {
        card.dataset.animate = "done";
        delete card.dataset.animateDelay;
      });
      return;
    }
    cards.forEach((card, index) => {
      if (card.dataset.animate !== "animating") {
        card.dataset.animate = "pending";
        card.dataset.animateDelay = `${Math.min(index, STAGGER_MAX) * STAGGER_STEP}`;
        observer.observe(card);
      }
    });
  };
  if (typeof motionPreference.addEventListener === "function") {
    motionPreference.addEventListener("change", handleMotionChange);
  } else if (typeof motionPreference.addListener === "function") {
    motionPreference.addListener(handleMotionChange);
  }
  return () => {
    observer.disconnect();
    if (typeof motionPreference.removeEventListener === "function") {
      motionPreference.removeEventListener("change", handleMotionChange);
    } else if (typeof motionPreference.removeListener === "function") {
      motionPreference.removeListener(handleMotionChange);
    }
  };
}
function runAnimations() {
  let cleanup = null;
  const trigger = () => {
    cleanup?.();
    cleanup = setupCardAnimations();
  };
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        trigger();
      },
      { once: true }
    );
  } else {
    trigger();
  }
  document.addEventListener("astro:after-swap", trigger);
  document.addEventListener("astro:page-load", trigger);
}
if (typeof window !== "undefined" && !window.__wcCardAnimationsInitialized) {
  window.__wcCardAnimationsInitialized = true;
  runAnimations();
}
