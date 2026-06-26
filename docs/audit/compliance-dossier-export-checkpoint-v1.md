# Compliance dossier export checkpoint v1

Marker: AUDIT6_COMPLIANCE_DOSSIER_EXPORT_CHECKPOINT_V1

Status:

```text
COMPLIANCE_DOSSIER_EXPORT:
HTML SNAPSHOT READY / PDF GUIDE READY / MD CANONICAL
```

## Summary

AUDIT_EXPORT_V1 adds a safe, reproducible export layer for the live compliance dossier:

- snapshot metadata JSON;
- snapshot policy;
- printable HTML export script;
- PDF snapshot guide;
- export validators;
- dossier update.

## Boundaries

- NO PRODUCTIVE COMPLIANCE CLAIM
- NO CERTIFICATION
- NO AEAT VALIDATION
- NO LEGAL/FISCAL OPINION
- MD REMAINS CANONICAL
- NO PRODUCT CODE CHANGES
- NO SUPABASE PRODUCTION
- NO SUPABASE REMOTE
- NO VERCEL CONFIG
- NO VIDA
- NO PDF BINARY COMMITTED

## Next step

Use the generated HTML as the printable snapshot source. Generate PDF manually from the HTML only when an external review package needs a frozen artifact.
