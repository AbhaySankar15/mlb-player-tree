"""Normalize Lahman CSVs into Player / TeamSeason / PlayerTeamSeason tables (stable playerID joins)."""
import pandas as pd

RAW = "data/raw"
LEAGUE_NAMES = {
    "NL": "National League", "AL": "American League", "AA": "American Association", "UA": "Union Association",
    "PL": "Players' League", "FL": "Federal League", "NA": "National Association (1871-75)",
    "NNL": "Negro National League (I)", "NN2": "Negro National League (II)", "NAL": "Negro American League",
    "ECL": "Eastern Colored League", "EWL": "East-West League", "ANL": "American Negro League",
    "NSL": "Negro Southern League", "IND": "Independent Negro teams", "EAS": "Eastern (Negro) teams",
    "WES": "Western (Negro) teams", "NAC": "North Atlantic (Negro) teams", "INT": "International (Negro) teams",
}
NEGRO = {"NNL", "NN2", "NAL", "ECL", "EWL", "ANL", "NSL", "IND", "EAS", "WES", "NAC", "INT"}


def load(raw=RAW):
    # keep_default_na=False: league 'NA' (National Association) must not become NaN
    rd = lambda f: pd.read_csv(f"{raw}/{f}", encoding="utf-8-sig", keep_default_na=False, dtype=str)
    return rd("People.csv"), rd("Appearances.csv"), rd("Teams.csv")


def normalize(people, app, teams):
    app = app.drop_duplicates(["yearID", "teamID", "lgID", "playerID"]).copy()
    app["teamSeasonId"] = app.yearID + "-" + app.lgID + "-" + app.teamID
    mem = app[["playerID", "teamSeasonId"]].drop_duplicates()
    ts = app[["teamSeasonId", "teamID", "yearID", "lgID"]].drop_duplicates()
    tn = teams[["yearID", "lgID", "teamID", "name"]].rename(columns={"name": "teamName"})
    ts = ts.merge(tn, on=["yearID", "lgID", "teamID"], how="left")
    ts["teamName"] = ts.teamName.fillna("")
    ts["source"] = "Lahman Appearances"
    ts = ts.rename(columns={"yearID": "season", "lgID": "leagueId", "teamID": "teamId", "teamSeasonId": "teamSeasonId"})
    g = app.groupby("playerID")
    pl = pd.DataFrame({
        "debutYear": g.yearID.min().astype(int), "finalYear": g.yearID.max().astype(int),
        "leagues": g.lgID.agg(lambda s: ",".join(sorted(set(s)))), "teamSeasonCount": g.teamSeasonId.nunique(),
    }).reset_index()
    ppl = people[["playerID", "nameFirst", "nameLast", "nameGiven"]]
    pl = pl.merge(ppl, on="playerID", how="left")
    pl["fullName"] = (pl.nameFirst.fillna("") + " " + pl.nameLast.fillna("")).str.strip()
    pl.loc[pl.fullName == "", "fullName"] = pl.playerID
    return pl.sort_values("playerID").reset_index(drop=True), ts, mem
