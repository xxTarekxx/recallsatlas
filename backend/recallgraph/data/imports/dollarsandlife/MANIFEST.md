# DollarsAndLife Recall Data Import Manifest

Copy date: 2026-06-19

Safety note: `C:\Users\perso\dollarsandlife` is read-only for this migration. No DollarsAndLife files were edited, formatted, deleted, renamed, or generated.

RecallGraph is now the intended canonical home for recall ingestion, normalization, embeddings, related recall links, search, evaluation, and dashboard work.

## Copied files

| Source | Destination | Records |
| --- | --- | ---: |
| `C:\Users\perso\dollarsandlife\server\recalls\fda\data\fda-recalls-en-eeat.json` | `C:\Users\perso\recallsatlas\backend\recallgraph\data\imports\dollarsandlife\fda\fda-recalls-en-eeat.json` | 366 |
| `C:\Users\perso\dollarsandlife\server\recalls\general\data\general-recalls-en-eeat.json` | `C:\Users\perso\recallsatlas\backend\recallgraph\data\imports\dollarsandlife\general\general-recalls-en-eeat.json` | 753 |

Total imported source records: 1,119.

## Not imported yet

The larger RecallsAtlas CPSC backup at `C:\Users\perso\recallsatlas\generalRecallsBackup\testing2.json` contains historical CPSC API-shaped records and remains phase 2 data. It was intentionally not imported for the MVP.
