import { describe, expect, it } from "vitest";
import { resolveSettingsDraftAfterProfileSync } from "./settings-draft-sync";

describe("settings draft synchronization", () => {
  it("preserva lo escrito cuando llega una sincronización durante la edición", () => {
    const currentDraft = {
      advisorName: "Laura García",
      email: "laura@gestoria.test",
      phone: "600 000 000",
    };

    const resolved = resolveSettingsDraftAfterProfileSync({
      currentDraft,
      incomingProfile: {
        advisorName: "",
        email: "",
        phone: "",
      },
      hasLocalChanges: true,
    });

    expect(resolved).toBe(currentDraft);
    expect(resolved).toEqual(currentDraft);
  });

  it("actualiza el formulario cuando no hay cambios locales pendientes", () => {
    const incomingProfile = {
      advisorName: "Gestor sincronizado",
      email: "gestor@gestoria.test",
      phone: "611 111 111",
    };

    const resolved = resolveSettingsDraftAfterProfileSync({
      currentDraft: {
        advisorName: "",
        email: "",
        phone: "",
      },
      incomingProfile,
      hasLocalChanges: false,
    });

    expect(resolved).toBe(incomingProfile);
  });
});
