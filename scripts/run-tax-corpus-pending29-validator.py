from pathlib import Path


repository_root = Path(__file__).resolve().parent.parent
corpus_root = repository_root / "test/fixtures/tax-model-diagnostic/pending29-v1"
validator_path = corpus_root / "tools/validate_pending29_corpus.py"
source = validator_path.read_text(encoding="utf-8")
source = source.replace(
    "ROOT = Path('/mnt/data/tax_profile_corpus_pending29_v1')",
    f"ROOT = Path({str(corpus_root)!r})",
)
if "'/mnt/data/tax_profile_corpus_pending29_v1'" in source:
    raise RuntimeError("No se pudo reservar la raíz local del validador incluido.")
exec(compile(source, str(validator_path), "exec"), {"__name__": "__main__"})
