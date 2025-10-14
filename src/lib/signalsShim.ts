import { useEffect, useState } from 'preact/hooks';

type Subscriber<T> = (value: T) => void;

export class Signal<T> {
  private _value: T;
  private subscribers = new Set<Subscriber<T>>();

  constructor(initial: T) {
    this._value = initial;
  }

  get value(): T {
    return this._value;
  }

  set value(next: T) {
    if (Object.is(this._value, next)) return;
    this._value = next;
    for (const subscriber of this.subscribers) {
      subscriber(this._value);
    }
  }

  subscribe(fn: Subscriber<T>) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }
}

export function signal<T>(initial: T): Signal<T> {
  return new Signal(initial);
}

export function useSignalValue<T>(sig: Signal<T>): T {
  const [value, setValue] = useState(sig.value);

  useEffect(() => sig.subscribe(setValue), [sig]);

  return value;
}
