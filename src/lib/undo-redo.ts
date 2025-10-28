/**
 * Undo/Redo System
 * Manages history of changes with undo and redo operations
 */

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export class UndoRedo<T> {
  private history: HistoryState<T>;
  private maxHistory: number;
  private onChange?: (state: T) => void;

  constructor(initialState: T, maxHistory = 50, onChange?: (state: T) => void) {
    this.history = {
      past: [],
      present: initialState,
      future: [],
    };
    this.maxHistory = maxHistory;
    this.onChange = onChange;
  }

  /**
   * Add a new state to history
   */
  push(newState: T): void {
    // Deep clone to prevent mutations
    const clonedPresent = this.clone(this.history.present);
    const clonedNew = this.clone(newState);

    this.history = {
      past: [...this.history.past, clonedPresent].slice(-this.maxHistory),
      present: clonedNew,
      future: [], // Clear future when new action is taken
    };

    this.notifyChange();
  }

  /**
   * Undo the last action
   */
  undo(): boolean {
    if (this.history.past.length === 0) {
      return false;
    }

    const previous = this.history.past[this.history.past.length - 1];
    if (!previous) {
      return false;
    }
    const newPast = this.history.past.slice(0, this.history.past.length - 1);

    this.history = {
      past: newPast,
      present: this.clone(previous),
      future: [this.clone(this.history.present), ...this.history.future],
    };

    this.notifyChange();
    return true;
  }

  /**
   * Redo the last undone action
   */
  redo(): boolean {
    if (this.history.future.length === 0) {
      return false;
    }

    const next = this.history.future[0];
    if (!next) {
      return false;
    }
    const newFuture = this.history.future.slice(1);

    this.history = {
      past: [...this.history.past, this.clone(this.history.present)],
      present: this.clone(next),
      future: newFuture,
    };

    this.notifyChange();
    return true;
  }

  /**
   * Get the current state
   */
  getState(): T {
    return this.clone(this.history.present);
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.history.past.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.history.future.length > 0;
  }

  /**
   * Clear all history
   */
  clear(newInitialState?: T): void {
    this.history = {
      past: [],
      present: newInitialState ? this.clone(newInitialState) : this.history.present,
      future: [],
    };
    this.notifyChange();
  }

  /**
   * Get history stats
   */
  getStats(): { past: number; future: number } {
    return {
      past: this.history.past.length,
      future: this.history.future.length,
    };
  }

  private clone(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  private notifyChange(): void {
    if (this.onChange) {
      this.onChange(this.getState());
    }
  }
}
