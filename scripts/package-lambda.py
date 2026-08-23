"""Create the Lambda zip from a clean, production-only dependency install."""

from pathlib import Path
import shutil
import subprocess
import zipfile


ROOT = Path(__file__).resolve().parent.parent
STAGING = ROOT / ".lambda-package"
OUTPUT = ROOT / "dist.zip"


def main() -> None:
    if STAGING.exists():
        shutil.rmtree(STAGING)
    STAGING.mkdir()

    for name in ("package.json", "package-lock.json"):
        shutil.copy2(ROOT / name, STAGING / name)
    shutil.copytree(ROOT / "dist", STAGING / "dist")
    expected_handlers = ("dist/authenticate-customer/handler.js", "dist/authorize-request/handler.js")
    missing = [handler for handler in expected_handlers if not (STAGING / handler).is_file()]
    if missing:
        raise RuntimeError(f"Lambda build is missing handler files: {', '.join(missing)}")

    npm = shutil.which("npm.cmd") or shutil.which("npm")
    if npm is None:
        raise RuntimeError("npm is required to package the Lambda")
    subprocess.run(
        [npm, "ci", "--omit=dev", "--ignore-scripts", "--prefix", str(STAGING)],
        cwd=ROOT,
        check=True,
    )

    if OUTPUT.exists():
        OUTPUT.unlink()
    with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(STAGING.rglob("*")):
            if path.is_file():
                relative = path.relative_to(STAGING).as_posix()
                info = zipfile.ZipInfo(relative, date_time=(1980, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o644 << 16
                archive.writestr(info, path.read_bytes())

    with zipfile.ZipFile(OUTPUT) as archive:
        names = set(archive.namelist())
        for handler in expected_handlers:
            if handler not in names:
                raise RuntimeError(f"Lambda zip is missing {handler}")

    shutil.rmtree(STAGING)
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    main()
