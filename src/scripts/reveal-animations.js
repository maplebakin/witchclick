const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const REVEAL_SELECTOR = "[data-reveal]";
const REVEAL_STAGGER_MS = 70;
const REVEAL_STAGGER_MAX = 8;
const DEFAULT_DURATION_MS = 520;
const PENDING_FALLBACK_MS = 2000;
const OBSERVER_OPTIONS = { threshold: 0, rootMargin: "0px 0px -50px 0px" };

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

function markVisible(elements) {
  elements.forEach((element) => {
    element.dataset.revealState = "done";
    element.style.removeProperty("opacity");
    element.style.removeProperty("transform");
    element.style.removeProperty("filter");
    element.style.removeProperty("will-change");
  });
}

function setupRevealAnimations() {
  if (typeof window === "undefined") {
    return () => {};
  }

  const sections = Array.from(document.querySelectorAll(REVEAL_SELECTOR));
  if (!sections.length) {
    return () => {};
  }

  const supportsWAAPI = typeof Element !== "undefined" && typeof Element.prototype.animate === "function";
  const supportsObserver = typeof IntersectionObserver !== "undefined";
  const motionPreference = window.matchMedia(MOTION_QUERY);

  // Fail open: if any capability is missing, keep sections visible.
  if (!supportsWAAPI || !supportsObserver || motionPreference.matches) {
    markVisible(sections);
    return () => {};
  }

  let observer;
  try {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const section = entry.target;

        if (section.dataset.revealState === "done") {
          observer.unobserve(section);
          return;
        }

        const delayFromAttr = Number(section.dataset.revealDelay ?? 0);
        const sequenceDelay = Number(section.dataset.revealSequenceDelay ?? 0);
        const delay = Number.isFinite(delayFromAttr) && delayFromAttr > 0 ? delayFromAttr : sequenceDelay;
        section.dataset.revealState = "animating";

        const animation = section.animate(
          [
            { opacity: 0, transform: "translateY(24px)", filter: "blur(8px)" },
            { opacity: 1, transform: "translateY(0)", filter: "blur(0px)" },
          ],
          {
            duration: DEFAULT_DURATION_MS,
            delay,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards",
          },
        );

        const finalize = () => {
          section.dataset.revealState = "done";
          section.style.removeProperty("opacity");
          section.style.removeProperty("transform");
          section.style.removeProperty("filter");
          section.style.removeProperty("will-change");
          observer.unobserve(section);
        };

        animation.finished.then(finalize).catch(finalize);
      });
    }, OBSERVER_OPTIONS);
  } catch {
    markVisible(sections);
    return () => {};
  }

  // Only hide after successful observer wiring.
  sections.forEach((section, index) => {
    if (section.dataset.revealState === "done") return;

    try {
      observer.observe(section);
      section.dataset.revealState = "pending";
      section.dataset.revealSequenceDelay = `${Math.min(index, REVEAL_STAGGER_MAX) * REVEAL_STAGGER_MS}`;
      section.style.opacity = "0";
      section.style.transform = "translateY(24px)";
      section.style.filter = "blur(8px)";
      section.style.willChange = "opacity, transform, filter";
    } catch {
      section.dataset.revealState = "done";
      section.style.removeProperty("opacity");
      section.style.removeProperty("transform");
      section.style.removeProperty("filter");
      section.style.removeProperty("will-change");
    }
  });

  // Safety net: prevent hidden sections if scroll/IO misses an entry.
  const fallbackTimer = window.setTimeout(() => {
    sections.forEach((section) => {
      if (section.dataset.revealState === "pending") {
        section.dataset.revealState = "done";
        section.style.removeProperty("opacity");
        section.style.removeProperty("transform");
        section.style.removeProperty("filter");
        section.style.removeProperty("will-change");
        observer.unobserve(section);
      }
    });
  }, PENDING_FALLBACK_MS);

  const handleMotionChange = (event) => {
    if (!event.matches) return;
    observer.disconnect();
    markVisible(sections);
  };

  const detachMotionChange = bindMotionPreferenceChange(motionPreference, handleMotionChange);

  return () => {
    window.clearTimeout(fallbackTimer);
    observer.disconnect();
    detachMotionChange();
  };
}

function runRevealAnimations() {
  let cleanup = null;

  const trigger = () => {
    if (typeof cleanup === "function") {
      cleanup();
    }
    cleanup = setupRevealAnimations();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trigger, { once: true });
  } else {
    trigger();
  }

  document.addEventListener("astro:after-swap", trigger);
  document.addEventListener("astro:page-load", trigger);
}

if (typeof window !== "undefined") {
  if (!window.__wcRevealAnimationsInitialized) {
    window.__wcRevealAnimationsInitialized = true;
    runRevealAnimations();
  }
}

export {};
