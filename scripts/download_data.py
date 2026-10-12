"""Download Lahman 2025 CSVs (People, Appearances, Teams, Batting, Pitching) from SABR's official Box share into data/raw/."""
import os, shutil, ssl, subprocess, sys, urllib.request

SHARE = "y1prhc795jk8zvmelfd3jq7tl389y6cd"  # https://sabr.box.com/s/<SHARE>, linked from https://sabr.org/lahman-database/
FILES = {"Appearances.csv": "f_2084267195632", "People.csv": "f_2084263017537", "Teams.csv": "f_2084266946255",
         "Batting.csv": "f_2084272468053", "Pitching.csv": "f_2084261668691"}
URL = "https://sabr.box.com/index.php?rm=box_download_shared_file&shared_name=%s&file_id=%s"


def fetch(url, dest):
    """urllib with certifi's CA bundle when available (python.org macOS builds ship without system certs); curl as a fallback."""
    try:
        try:
            import certifi
            ctx = ssl.create_default_context(cafile=certifi.where())
        except ImportError:
            ctx = ssl.create_default_context()
        with urllib.request.urlopen(url, context=ctx, timeout=300) as r, open(dest, "wb") as f:
            shutil.copyfileobj(r, f)
    except (ssl.SSLError, urllib.error.URLError) as e:
        if not shutil.which("curl"):
            raise
        print(f"urllib failed ({e}); retrying with curl", file=sys.stderr)
        subprocess.run(["curl", "-fsSL", "--max-time", "300", "-o", dest, url], check=True)


def main(out="data/raw"):
    os.makedirs(out, exist_ok=True)
    for name, fid in FILES.items():
        dest = os.path.join(out, name)
        if os.path.exists(dest) and os.path.getsize(dest) > 1000:
            print("have", name); continue
        fetch(URL % (SHARE, fid), dest)
        if os.path.getsize(dest) < 1000:
            raise SystemExit(f"{name}: download looks wrong ({os.path.getsize(dest)} bytes); the Box share may have changed")
        print("downloaded", name, os.path.getsize(dest))


if __name__ == "__main__":
    sys.exit(main())
