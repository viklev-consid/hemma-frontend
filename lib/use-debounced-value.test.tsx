import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebouncedValue } from "./use-debounced-value";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value synchronously", () => {
    const { result } = renderHook(() => useDebouncedValue("alpha", 200));
    expect(result.current).toBe("alpha");
  });

  it("delays propagation by the given delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 200),
      { initialProps: { value: "alpha" } },
    );

    rerender({ value: "beta" });
    expect(result.current).toBe("alpha");

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe("alpha");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("beta");
  });

  it("collapses rapid changes into a single update", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 200),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: "abc" });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: "abcd" });

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("abcd");
  });
});
