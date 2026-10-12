"""Download Lahman 2025 CSVs (People, Appearances, Teams, readme) from SABR's official Box share into data/raw/."""
import os, sys, urllib.request

SHARE = "y1prhc795jk8zvmelfd3jq7tl389y6cd"  # https://sabr.box.com/s/<SHARE>, linked from https://sabr.org/lahman-database/
FILES = {"Appearances.csv": "f_2084267195632", "People.csv": "f_2084263017537", "Teams.csv": "f_2084266946255"}
URL = "https://sabr.box.com/index.php?rm=box_download_shared_file&shared_name=%s&file_id=%s"


def main(out="data/raw"):
    os.makedirs(out, exist_ok=True)
    for name, fid in FILES.items():
        dest = os.path.join(out, name)
        if os.path.exists(dest) and os.path.getsize(dest) > 1000:
            print("have", name); continue
        urllib.request.urlretrieve(URL % (SHARE, fid), dest)
        print("downloaded", name, os.path.getsize(dest))


if __name__ == "__main__":
    sys.exit(main())
