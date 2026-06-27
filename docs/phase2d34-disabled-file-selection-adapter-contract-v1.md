# PHASE2D34_DISABLED_FILE_SELECTION_ADAPTER_CONTRACT_V1

Fase 2D.34 define un adapter de seleccion de archivo bloqueado por defecto.

Objetivo:

- preparar el contrato que una UI futura podria recibir;
- impedir apertura de selector real;
- impedir lectura real de archivos;
- dejar evidenciado que no existe conexion operativa.

Funciones:

- `createDisabledBackupFileSelectionAdapter`;
- `summarizeBackupFileSelectionAdapter`;
- `assertBackupFileSelectionDisabled`.

Reglas:

- `canOpenFilePicker: false`;
- `canReadFile: false`;
- `openFilePicker` devuelve blocked;
- `readSelectedFile` devuelve blocked;
- no usa FileReader;
- no usa filesystem;
- no lee local files.

Limites:

- adapter future UI only;
- no file picker real;
- no documentos reales;
- no import/restore apply;
- sin produccion;
- sin Supabase.
