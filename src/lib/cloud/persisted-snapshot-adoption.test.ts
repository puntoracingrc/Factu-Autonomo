import { describe, expect, it, vi } from "vitest";
import { adoptPersistedSnapshotIfCurrent } from "./persisted-snapshot-adoption";

describe("persisted cloud snapshot adoption", () => {
  it("adopta solo en memoria cuando almacenamiento y pestaña siguen vigentes", () => {
    const previous = { revision: 1 };
    const repaired = { revision: 2 };
    let current = previous;
    const persistedMatches = vi.fn(() => true);

    expect(
      adoptPersistedSnapshotIfCurrent({
        candidate: repaired,
        expectedCurrent: previous,
        getCurrent: () => current,
        currentMatchesDurableBaseline: () => true,
        persistedMatches,
        publishMemoryOnly: (candidate) => {
          current = candidate;
        },
      }),
    ).toBe(true);
    expect(current).toBe(repaired);
    expect(persistedMatches).toHaveBeenCalledWith(repaired);
  });

  it("no publica ni reescribe cuando otra pestaña cambió el almacenamiento", () => {
    const previous = { revision: 1 };
    const repaired = { revision: 2 };
    const concurrent = { revision: 3 };
    let current = previous;
    let persisted = concurrent;
    const publishMemoryOnly = vi.fn((candidate: typeof repaired) => {
      current = candidate;
      persisted = candidate;
    });

    expect(
      adoptPersistedSnapshotIfCurrent({
        candidate: repaired,
        expectedCurrent: previous,
        getCurrent: () => current,
        currentMatchesDurableBaseline: () => true,
        persistedMatches: (candidate) => persisted === candidate,
        publishMemoryOnly,
      }),
    ).toBe(false);
    expect(publishMemoryOnly).not.toHaveBeenCalled();
    expect(current).toBe(previous);
    expect(persisted).toBe(concurrent);
  });

  it("corta si el estado de la pestaña cambia durante la validación durable", () => {
    const previous = { revision: 1 };
    const repaired = { revision: 2 };
    const concurrent = { revision: 3 };
    let current = previous;
    const publishMemoryOnly = vi.fn();

    expect(
      adoptPersistedSnapshotIfCurrent({
        candidate: repaired,
        expectedCurrent: previous,
        getCurrent: () => current,
        currentMatchesDurableBaseline: () => true,
        persistedMatches: () => {
          current = concurrent;
          return true;
        },
        publishMemoryOnly,
      }),
    ).toBe(false);
    expect(publishMemoryOnly).not.toHaveBeenCalled();
    expect(current).toBe(concurrent);
  });

  it("no adopta sobre una edición local que aún no alcanzó el baseline durable", () => {
    const previous = { revision: 1 };
    const repaired = { revision: 2 };
    const persistedMatches = vi.fn(() => true);
    const publishMemoryOnly = vi.fn();

    expect(
      adoptPersistedSnapshotIfCurrent({
        candidate: repaired,
        expectedCurrent: previous,
        getCurrent: () => previous,
        currentMatchesDurableBaseline: () => false,
        persistedMatches,
        publishMemoryOnly,
      }),
    ).toBe(false);
    expect(persistedMatches).not.toHaveBeenCalled();
    expect(publishMemoryOnly).not.toHaveBeenCalled();
  });
});
