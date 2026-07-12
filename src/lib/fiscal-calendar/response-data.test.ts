import { describe, expect, it } from "vitest";
import { parseFiscalCalendarResponseData } from "./response-data";

function validEnvelope(): { data: Record<string, unknown> } {
  return {
    data: {
      events: [
        {
          id: "aeat_0123456789abcdef0123456789abcdef",
          source: "AEAT",
          sourceProvider: "google-calendar",
          sourceCalendarKey: "iva",
          sourceCalendarId: "calendar@example.invalid",
          externalEventId: "external-1",
          iCalUID: "external-1@example.invalid",
          title: "Vencimiento de prueba",
          description: "Información general\nModelo 303",
          category: "iva",
          deadlineKind: "unclassified",
          reviewStatus: "review-with-advisor",
          startDate: "2026-07-20",
          endDateExclusive: "2026-07-21",
          allDay: true,
          status: "confirmed",
          sourceUpdatedAt: "2026-07-01T07:00:00.000Z",
          fetchedAt: "2026-07-12T08:00:00.000Z",
        },
        {
          id: "aeat_abcdef0123456789abcdef0123456789",
          source: "AEAT",
          sourceProvider: "google-calendar",
          sourceCalendarKey: "renta",
          sourceCalendarId: "calendar-2@example.invalid",
          externalEventId: "external-2",
          iCalUID: null,
          title: "Evento con hora",
          description: "",
          category: "renta",
          deadlineKind: "direct-debit",
          reviewStatus: "source-classified",
          startDate: "2026-10-25T02:30:00+02:00",
          endDateExclusive: "2026-10-25T02:30:00+01:00",
          allDay: false,
          status: "tentative",
          sourceUpdatedAt: null,
          fetchedAt: "2026-07-12T08:00:00+02:00",
        },
      ],
      fetchedAt: "2026-07-12T08:00:00.000Z",
      providerMode: "fixture",
      truncated: false,
      categories: [
        { key: "renta", label: "Renta" },
        { key: "iva", label: "IVA" },
      ],
      officialSource: {
        id: "aeat-calendario-contribuyente-icalendar",
        authority: "AEAT",
        title: "Calendario del contribuyente — integración iCalendar",
        officialUrl:
          "https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/icalendar/instrucciones-integrar-calendario.html",
        retrievedAt: "2026-07-12",
        verificationStatus: "VERIFIED",
        scope: "GENERAL_INFORMATION",
        catalogVersion: "aeat-public-calendars-2026-07-12.v1",
        catalogContentSha256:
          "162d9d10580f0cbaa1bb0af8b7226020de2bbfce72aa0b655912fcfc66dd7e43",
      },
      timeZone: "Europe/Madrid",
      generalInformationOnly: true,
      modelPageLinks: [
        {
          code: "303",
          href: "/consultor-fiscal/modelos?origen=calendario&foco=303#modelo-303",
          historical: false,
        },
      ],
    },
  };
}

function withDataChange(
  change: (data: Record<string, unknown>) => void,
): unknown {
  const envelope = structuredClone(validEnvelope());
  change(envelope.data);
  return envelope;
}

function firstEvent(data: Record<string, unknown>): Record<string, unknown> {
  return (data.events as Record<string, unknown>[])[0];
}

describe("parseFiscalCalendarResponseData", () => {
  it("acepta un contrato completo con fecha civil Madrid y horas RFC3339", () => {
    const parsed = parseFiscalCalendarResponseData(validEnvelope());
    expect(parsed?.events).toHaveLength(2);
    expect(parsed?.timeZone).toBe("Europe/Madrid");
    expect(parsed?.modelPageLinks[0]?.code).toBe("303");
  });

  it("falla cerrado para envoltorios, arrays y tipos incompletos", () => {
    for (const value of [
      null,
      {},
      { data: null },
      withDataChange((data) => {
        data.events = {};
      }),
      withDataChange((data) => {
        data.truncated = "false";
      }),
      withDataChange((data) => {
        firstEvent(data).status = new String("confirmed");
      }),
      withDataChange((data) => {
        data.generalInformationOnly = false;
      }),
      withDataChange((data) => {
        data.timeZone = "UTC";
      }),
    ]) {
      expect(parseFiscalCalendarResponseData(value)).toBeNull();
    }
  });

  it("acota eventos, categorías y enlaces y rechaza duplicados", () => {
    const event = firstEvent(validEnvelope().data);
    const tooManyEvents = withDataChange((data) => {
      data.events = Array.from({ length: 1_001 }, (_, index) => ({
        ...event,
        id: `event-${index}`,
      }));
    });
    const tooManyLinks = withDataChange((data) => {
      data.modelPageLinks = Array.from({ length: 1_001 }, (_, index) => ({
        code: String(index).padStart(3, "0").slice(-3),
        href: `/consultor-fiscal/modelos?origen=calendario&foco=${String(index).padStart(3, "0").slice(-3)}#modelo-${String(index).padStart(3, "0").slice(-3)}`,
        historical: false,
      }));
    });
    const duplicateEvents = withDataChange((data) => {
      const events = data.events as Record<string, unknown>[];
      data.events = [events[0], { ...events[0] }];
    });
    const duplicateCategories = withDataChange((data) => {
      data.categories = [
        { key: "iva", label: "IVA" },
        { key: "iva", label: "IVA duplicado" },
      ];
    });
    const duplicateLinks = withDataChange((data) => {
      const links = data.modelPageLinks as Record<string, unknown>[];
      data.modelPageLinks = [links[0], { ...links[0] }];
    });
    for (const value of [
      tooManyEvents,
      tooManyLinks,
      duplicateEvents,
      duplicateCategories,
      duplicateLinks,
    ]) {
      expect(parseFiscalCalendarResponseData(value)).toBeNull();
    }
  });

  it.each([
    ["source", "otra"],
    ["sourceProvider", "otro"],
    ["category", "desconocida"],
    ["sourceCalendarKey", "renta"],
    ["deadlineKind", "confirmado"],
    ["reviewStatus", "approved"],
    ["status", "published"],
    ["allDay", "true"],
    ["sourceUpdatedAt", "ayer"],
    ["fetchedAt", "2026-07-12"],
  ])("rechaza campo de evento %s inválido", (field, value) => {
    const envelope = withDataChange((data) => {
      firstEvent(data)[field] = value;
    });
    expect(parseFiscalCalendarResponseData(envelope)).toBeNull();
  });

  it("aplica los límites de título, descripción, líneas e identificadores", () => {
    const cases = [
      withDataChange((data) => {
        firstEvent(data).title = "x".repeat(301);
      }),
      withDataChange((data) => {
        firstEvent(data).description = "😀".repeat(5_001);
      }),
      withDataChange((data) => {
        firstEvent(data).description = Array(101).fill("línea").join("\n");
      }),
      withDataChange((data) => {
        firstEvent(data).externalEventId = "x".repeat(1_025);
      }),
      withDataChange((data) => {
        firstEvent(data).title = "";
      }),
    ];
    for (const value of cases) {
      expect(parseFiscalCalendarResponseData(value)).toBeNull();
    }

    const exactLimits = withDataChange((data) => {
      firstEvent(data).title = "😀".repeat(300);
      firstEvent(data).description = "ñ".repeat(5_000);
    });
    expect(parseFiscalCalendarResponseData(exactLimits)).not.toBeNull();
  });

  it("valida fechas all-day reales sin conversiones UTC y exige final exclusivo", () => {
    for (const [startDate, endDateExclusive] of [
      ["2026-02-29", "2026-03-01"],
      ["2026-03-29T00:00:00Z", "2026-03-30"],
      ["2026-07-20", "2026-07-20"],
      ["2026-07-21", "2026-07-20"],
    ]) {
      const envelope = withDataChange((data) => {
        Object.assign(firstEvent(data), { startDate, endDateExclusive });
      });
      expect(parseFiscalCalendarResponseData(envelope)).toBeNull();
    }

    const leapDay = withDataChange((data) => {
      Object.assign(firstEvent(data), {
        startDate: "2028-02-29",
        endDateExclusive: "2028-03-01",
      });
    });
    expect(parseFiscalCalendarResponseData(leapDay)).not.toBeNull();
  });

  it("valida RFC3339 y compara instantes incluso durante el cambio de hora", () => {
    const invalidRanges = [
      ["2026-02-31T12:00:00Z", "2026-03-01T13:00:00Z"],
      ["2026-07-20 12:00:00Z", "2026-07-20T13:00:00Z"],
      ["2026-07-20T24:00:00Z", "2026-07-21T01:00:00Z"],
      ["2026-07-20T13:00:00+25:00", "2026-07-20T14:00:00Z"],
      ["2026-07-20T13:00:00+14:01", "2026-07-20T14:00:00Z"],
      ["2026-07-20T14:00:00Z", "2026-07-20T13:00:00Z"],
      ["2026-07-20T13:00:00Z", "2026-07-20T13:00:00Z"],
    ];
    for (const [startDate, endDateExclusive] of invalidRanges) {
      const envelope = withDataChange((data) => {
        Object.assign(firstEvent(data), {
          allDay: false,
          startDate,
          endDateExclusive,
        });
      });
      expect(parseFiscalCalendarResponseData(envelope)).toBeNull();
    }
  });

  it("valida proveedor, metadatos de fuente y categorías", () => {
    const cases = [
      withDataChange((data) => {
        data.providerMode = "remote";
      }),
      withDataChange((data) => {
        data.fetchedAt = "2026-07-12";
      }),
      withDataChange((data) => {
        data.categories = [];
      }),
      withDataChange((data) => {
        data.categories = [{ key: "otro", label: "Otro" }];
      }),
      withDataChange((data) => {
        (data.officialSource as Record<string, unknown>).authority = "OTRA";
      }),
      withDataChange((data) => {
        (data.officialSource as Record<string, unknown>).officialUrl =
          "https://example.com/fuente";
      }),
      withDataChange((data) => {
        (data.officialSource as Record<string, unknown>).officialUrl =
          "https://sede.agenciatributaria.gob.es:444/fuente";
      }),
      withDataChange((data) => {
        (data.officialSource as Record<string, unknown>).retrievedAt =
          "2026-02-29";
      }),
      withDataChange((data) => {
        (data.officialSource as Record<string, unknown>).catalogContentSha256 =
          "abc";
      }),
    ];
    for (const value of cases) {
      expect(parseFiscalCalendarResponseData(value)).toBeNull();
    }
  });

  it("acepta solo enlaces internos acotados y códigos válidos", () => {
    const invalidHrefs = [
      "https://calendar.invalid/consultor-fiscal/modelos?modelo=303",
      "//calendar.invalid/consultor-fiscal/modelos?modelo=303",
      "/consultor-fiscal/modelos/303",
      "/consultor-fiscal/modelos",
      "/consultor-fiscal/modelos?focus=303#modelo-303",
      "/consultor-fiscal/modelos?foco=303&origen=calendario#modelo-303",
      "/consultor-fiscal/modelos?origen=calendario&foco=303&extra=1#modelo-303",
      "/consultor-fiscal/modelos?origen=calendario&foco=303#modelo-130",
    ];
    for (const href of invalidHrefs) {
      const envelope = withDataChange((data) => {
        (data.modelPageLinks as Record<string, unknown>[])[0].href = href;
      });
      expect(parseFiscalCalendarResponseData(envelope)).toBeNull();
    }
    for (const code of ["303<script>", "abcd", "1", "1234"]) {
      const envelope = withDataChange((data) => {
        (data.modelPageLinks as Record<string, unknown>[])[0].code = code;
      });
      expect(parseFiscalCalendarResponseData(envelope)).toBeNull();
    }
  });

  it("no lanza aunque el objeto hostil tenga getters que fallen", () => {
    const hostile = {
      get data(): never {
        throw new Error("getter hostil");
      },
    };
    expect(() => parseFiscalCalendarResponseData(hostile)).not.toThrow();
    expect(parseFiscalCalendarResponseData(hostile)).toBeNull();
  });
});
