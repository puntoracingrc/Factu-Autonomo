# 2B.7K - Official alignment gate checkpoint v1

Marker: `PHASE2B7K_OFFICIAL_ALIGNMENT_GATE_CHECKPOINT_V1`
Date: 2026-06-26

`PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED`

## Completed

2B.7F:

- official XSD URLs remain identified;
- checksums from the existing manifest remain recorded;
- no XSD fixture is committed because the files were not safely obtained into
  the repo during this phase;
- PDFs and XLSX are not committed.

2B.7G:

- no validator dependency is selected;
- no validation module is created;
- fake XSD validation is explicitly rejected.

2B.7H:

- a blocked synthetic data catalog is added;
- no value is usable for official XML;
- no real data, NIF, invoice number or customer data is introduced.

## Blocked

2B.7I is not implemented:

- no official-aligned XML serializer;
- no XML wrapper;
- no positive XML cases;
- no negative XML cases;
- no XML persistence;
- no full XML printing.

2B.7J is not implemented:

- no real offline XSD validation;
- no XSD validator;
- no XSD validation result claim.

## Blockers

- `BLOCKED_XSD_NOT_COMMITTED`;
- `BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR`;
- `BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA`.

## Official artifact summary

| Artifact | Version | SHA-256 | Fixture |
| --- | --- | --- | --- |
| `AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0` | `tikeV1.0` | `cbdac8d427cc5ab5d77ca48974cab0f35d6bb819c4c66db361681e3710aeba36` | no |
| `AEAT_VERIFACTU_SUMINISTRO_INFORMACION_XSD_TIKE_V1_0` | `tikeV1.0` | `ee4c1655175644de44c4c25055ffeb8e5f4bb4bc3834ce8254d4222ef18c8aa1` | no |

Known official root and namespace remain references only:

- root: `RegFactuSistemaFacturacion`;
- namespace:
  `https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd`.

## Limits

Still not allowed:

- QR;
- signature;
- certificates;
- XAdES;
- transport;
- AEAT real calls;
- production VeriFactu;
- real data;
- XML for real invoices;
- candidate XML persistence;
- full XML logs or snapshots;
- Supabase production or staging;
- Vercel config, promote, domains, DNS or aliases.

## Next decision

Before opening any later phase, decide how to obtain the official XSD fixtures
from an official static source without real certificates or operational AEAT
calls, and choose a real offline validator that can run in CI with those
fixtures and no network.

Do not start 2B.8 from this state.
