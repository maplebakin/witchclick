type EntityIndexItem = {
  slug: string;
  type: string;
  name: string;
  summary: string;
  tags: string[];
  keywords: string[];
};

type EntityIndexPayload = {
  items: EntityIndexItem[];
  facets: {
    types: Record<string, number>;
    tags: Record<string, number>;
  };
};

type SearchState = {
  q: string;
  type: string;
  tag: string;
};

const form = document.querySelector<HTMLFormElement>("[data-entity-search-form]");
const resultsContainer = document.querySelector<HTMLElement>("[data-entity-results]");
const countEl = document.querySelector<HTMLElement>("[data-entity-count]");
const liveEl = document.querySelector<HTMLElement>("[data-entity-count-live]");

if (form && resultsContainer && countEl && liveEl) {
  const searchInput = form.querySelector<HTMLInputElement>("[data-entity-search-input]");
  const typeSelect = form.querySelector<HTMLSelectElement>("[data-entity-type-select]");
  let tagInput = form.querySelector<HTMLInputElement>("[data-entity-tag-field]");

  if (!tagInput) {
    tagInput = document.createElement("input");
    tagInput.type = "hidden";
    tagInput.name = "tag";
    tagInput.dataset.entityTagField = "";
    tagInput.disabled = true;
    form.append(tagInput);
  }

  let indexData: EntityIndexPayload | null = null;
  let pendingRequest: Promise<EntityIndexPayload> | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const tagButtons = Array.from(form.querySelectorAll<HTMLButtonElement>("[data-entity-tag]"));

  const ensureIndex = async (): Promise<EntityIndexPayload> => {
    if (indexData) return indexData;
    if (!pendingRequest) {
      pendingRequest = fetch("/entities/index.json")
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load entity index: ${res.status}`);
          return res.json() as Promise<EntityIndexPayload>;
        })
        .then((payload) => {
          indexData = payload;
          return payload;
        })
        .catch((error) => {
          console.error(error);
          pendingRequest = null;
          throw error;
        });
    }
    return pendingRequest;
  };

  const getState = (): SearchState => {
    const data = new FormData(form);
    const tags = data.getAll("tag");
    const tagValue = tags.length > 0 ? String(tags[tags.length - 1] ?? "") : "";
    return {
      q: String(data.get("q") ?? ""),
      type: String(data.get("type") ?? ""),
      tag: tagValue,
    };
  };

  const updateHiddenTag = (value: string) => {
    if (!tagInput) return;
    if (value) {
      tagInput.disabled = false;
      tagInput.value = value;
    } else {
      tagInput.value = "";
      tagInput.disabled = true;
    }
  };

  const formatSummary = (count: number, total: number): string => {
    if (count === total) return `Showing all ${total} entities`;
    if (count === 0) return "No entities match your filters";
    return `Showing ${count} of ${total} entities`;
  };

  const filterItems = (items: EntityIndexItem[], state: SearchState) => {
    const normalizedQuery = state.q.trim().toLowerCase();
    const normalizedTag = state.tag.trim().toLowerCase();
    return items.filter((item) => {
      if (state.type && item.type !== state.type) return false;
      if (normalizedTag) {
        const hasTag = item.tags.some((value) => value.toLowerCase() === normalizedTag);
        if (!hasTag) return false;
      }
      if (!normalizedQuery) return true;
      const haystack = [item.name, item.summary, ...item.tags, ...item.keywords]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  };

  function startCase(value: string): string {
    return value
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function renderResults(items: EntityIndexItem[]) {
    const activeElement = document.activeElement as HTMLElement | null;
    let focusedSlug: string | null = null;
    if (activeElement && resultsContainer.contains(activeElement)) {
      const parent = activeElement.closest<HTMLElement>("[data-entity-result]");
      focusedSlug = parent?.dataset.entityResult ?? null;
    }

    resultsContainer.innerHTML = "";
    const fragment = document.createDocumentFragment();

    for (const item of items) {
      const li = document.createElement("li");
      li.className = "entities-result";
      li.dataset.entityResult = item.slug;

      const link = document.createElement("a");
      link.className = "entities-result__link";
      link.href = `/entities/${item.slug}`;

      const typeLabel = document.createElement("span");
      typeLabel.className = "entities-result__type";
      typeLabel.textContent = startCase(item.type);

      const name = document.createElement("span");
      name.className = "entities-result__name";
      name.textContent = item.name;

      link.append(typeLabel, name);
      li.append(link);

      if (item.summary) {
        const summary = document.createElement("p");
        summary.className = "entities-result__summary";
        summary.textContent = item.summary;
        li.append(summary);
      }

      if (item.tags.length > 0) {
        const tagList = document.createElement("ul");
        tagList.className = "entities-result__tags";
        for (const value of item.tags.slice(0, 6)) {
          const tagEl = document.createElement("li");
          tagEl.className = "entities-result__tag";
          tagEl.textContent = value;
          tagList.append(tagEl);
        }
        li.append(tagList);
      }

      fragment.append(li);
    }

    resultsContainer.append(fragment);

    if (focusedSlug) {
      const nextFocus = resultsContainer.querySelector<HTMLElement>(
        `[data-entity-result="${CSS.escape(focusedSlug)}"] a`,
      );
      if (nextFocus) {
        nextFocus.focus();
      }
    }
  }

  const updateTagButtons = (state: SearchState) => {
    const active = state.tag.trim().toLowerCase();
    for (const button of tagButtons) {
      const value = (button.value || "").trim().toLowerCase();
      const isActive = active === value;
      if (isActive) {
        button.classList.add("entity-chip--active");
      } else {
        button.classList.remove("entity-chip--active");
      }
      button.setAttribute("aria-pressed", String(isActive));
    }
  };

  const updateCount = (visible: number, total: number) => {
    const message = formatSummary(visible, total);
    countEl.textContent = message;
    liveEl.textContent = message;
  };

  const updateUrl = (state: SearchState) => {
    const url = new URL(window.location.href);
    if (state.q.trim()) {
      url.searchParams.set("q", state.q.trim());
    } else {
      url.searchParams.delete("q");
    }

    if (state.type.trim()) {
      url.searchParams.set("type", state.type.trim());
    } else {
      url.searchParams.delete("type");
    }

    if (state.tag.trim()) {
      url.searchParams.set("tag", state.tag.trim());
    } else {
      url.searchParams.delete("tag");
    }

    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const applyEnhancement = async () => {
    const payload = await ensureIndex();
    const state = getState();
    const filtered = filterItems(payload.items, state);
    renderResults(filtered);
    updateTagButtons(state);
    updateCount(filtered.length, payload.items.length);
    updateUrl(state);
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    ensureIndex().then(() => applyEnhancement()).catch(() => {});
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        ensureIndex().then(() => applyEnhancement()).catch(() => {});
      }, 300);
    });
  }

  if (typeSelect) {
    typeSelect.addEventListener("change", () => {
      ensureIndex().then(() => applyEnhancement()).catch(() => {});
    });
  }

  for (const button of tagButtons) {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const value = (event.currentTarget as HTMLButtonElement).value || "";
      updateHiddenTag(value);
      ensureIndex().then(() => applyEnhancement()).catch(() => {});
    });
  }

  // Ensure the hidden tag input represents the initial state for keyboard submissions.
  updateHiddenTag(tagInput.value);

  // Mark the count live region for assistive tech updates.
  liveEl.setAttribute("aria-live", "polite");
}
