import type { JSX } from "astro/jsx-runtime";
import { Fragment } from "astro/jsx-runtime";

interface LoadMoreButtonProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  basePath: string;
  initialCount: number;
  listSelector?: string;
  paginationSelector?: string;
}

function createScript({
  listSelector,
  paginationSelector,
}: {
  listSelector: string;
  paginationSelector: string;
}) {
  const listSel = JSON.stringify(listSelector);
  const paginationSel = JSON.stringify(paginationSelector);
  return `(() => {
    const script = document.currentScript;
    if (!script) return;
    const root = script.parentElement;
    if (!root) return;
    const button = root.querySelector('[data-load-more-button]');
    if (!(button instanceof HTMLButtonElement)) return;
    const list = document.querySelector(${listSel});
    if (!(list instanceof HTMLElement)) return;
    const pagination = document.querySelector(${paginationSel});
    const announcer = root.querySelector('[data-load-more-announcer]');
    const defaultLabel = button.getAttribute('data-label-default') ?? 'Load more';
    const loadingLabel = button.getAttribute('data-label-loading') ?? 'Loading…';
    const errorLabel = button.getAttribute('data-label-error') ?? 'Try again';
    let currentPage = Number(button.getAttribute('data-current-page')) || 1;
    const totalPages = Number(button.getAttribute('data-total-pages')) || 1;
    const basePath = button.getAttribute('data-base-path') ?? '';
    let itemsLoaded = Number(button.getAttribute('data-initial-count')) || 0;

    root.setAttribute('data-enhanced', 'true');
    if (pagination instanceof HTMLElement) {
      pagination.setAttribute('hidden', '');
    }

    const updateLabel = (value) => {
      button.textContent = value;
    };

    const announce = (message) => {
      if (!(announcer instanceof HTMLElement)) return;
      announcer.textContent = message;
    };

    const buildUrl = (page) => {
      const trimmedBase = basePath.replace(/\/$/, '');
      return `${trimmedBase}/${page}?partial=1`;
    };

    const handleFailure = () => {
      updateLabel(errorLabel);
      button.disabled = false;
      announce('Unable to load more entries. Please try again.');
    };

    button.addEventListener('click', async () => {
      const nextPage = currentPage + 1;
      if (nextPage > totalPages) {
        button.remove();
        return;
      }

      try {
        button.disabled = true;
        updateLabel(loadingLabel);
        announce('Loading more journal entries…');

        const response = await fetch(buildUrl(nextPage), {
          headers: { 'X-Requested-With': 'fetch' },
        });
        if (!response.ok) {
          handleFailure();
          return;
        }

        const html = await response.text();
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const nextList = temp.querySelector('.journal-list');
        if (!(nextList instanceof HTMLElement)) {
          handleFailure();
          return;
        }

        const nodes = Array.from(nextList.children);
        if (nodes.length === 0) {
          button.remove();
          announce('No additional entries to load.');
          return;
        }

        for (const node of nodes) {
          list.appendChild(node);
        }

        currentPage = nextPage;
        itemsLoaded += nodes.length;

        if (currentPage >= totalPages) {
          button.remove();
          announce(`Loaded all journal entries (${itemsLoaded} total).`);
          return;
        }

        button.disabled = false;
        updateLabel(defaultLabel);
        button.setAttribute('data-current-page', String(currentPage));
        button.setAttribute('data-initial-count', String(itemsLoaded));
        announce(`Added ${nodes.length} more entries. ${itemsLoaded} total so far.`);
      } catch (error) {
        console.error('Load more failed', error);
        handleFailure();
      }
    });
  })();`;
}

export default function LoadMoreButton({
  currentPage,
  totalPages,
  pageSize,
  basePath,
  initialCount,
  listSelector = '.journal-list',
  paginationSelector = '[data-journal-pagination]',
}: LoadMoreButtonProps): JSX.Element | null {
  if (totalPages <= 1) return null;

  const script = createScript({ listSelector, paginationSelector });

  return (
    <Fragment>
      <div
        class="flex flex-col items-center gap-3"
        data-load-more-root
      >
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-full border border-line-muted/60 bg-surface-base/80 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-body transition hover:border-line-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          data-load-more-button
          data-current-page={String(currentPage)}
          data-total-pages={String(totalPages)}
          data-base-path={basePath}
          data-page-size={String(pageSize)}
          data-initial-count={String(initialCount)}
          data-label-default="Load more entries"
          data-label-loading="Loading…"
          data-label-error="Try again"
          aria-controls="journal-list"
        >
          Load more entries
        </button>
        <span class="sr-only" aria-live="polite" data-load-more-announcer></span>
        <script type="module" dangerouslySetInnerHTML={{ __html: script }} />
      </div>
    </Fragment>
  );
}
