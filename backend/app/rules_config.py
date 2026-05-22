"""
Super Selector — Fantasy Badminton League
All configurable game rules live here. Change values and restart to apply.
"""

# ──────────────────────────────────────────────
# Team selection rules
# ──────────────────────────────────────────────
TEAM_SIZE = 11
MAX_PLAYERS_FROM_ONE_TEAM = 7
MIN_FEMALE_PLAYERS = 2
MAX_TOTAL_BID_POINTS = 100_000   # sum of all 11 selected players' bid_points
MUST_PICK_ONE_REAL_CAPTAIN = True  # exactly 1 real team captain must be selected
CAPTAIN_COUNT = 1
VICE_CAPTAIN_COUNT = 1

# ──────────────────────────────────────────────
# Fantasy point multipliers
# ──────────────────────────────────────────────
CAPTAIN_MULTIPLIER = 2.0
VICE_CAPTAIN_MULTIPLIER = 1.5
DEFAULT_MULTIPLIER = 1.0

# ──────────────────────────────────────────────
# Scoring events
# Each event has:
#   points            — base points awarded
#   enabled           — set to False to disable the rule without code changes
#   (optional keys)   — rule-specific thresholds
# ──────────────────────────────────────────────
SCORING_EVENTS = {
    # 1 pt to every player on the winning side of a game
    "WIN": {
        "points": 1,
        "enabled": True,
    },
    # +0.5 pts to every player on the side that wins each individual set
    "SET_WIN": {
        "points": 0.5,
        "enabled": True,
    },
    # +1 pt bonus if the winning team won 2-0 (straight sets)
    "STRAIGHT_SET_WIN_BONUS": {
        "points": 1,
        "enabled": True,
    },
    # +0.5 pts per set where the winning margin is >= diff_threshold
    # Awarded to players on the side that WON that specific set
    "DOMINANT_SET_BONUS": {
        "points": 0.5,
        "enabled": True,
        "diff_threshold": 10,
    },
    # +1 pt underdog bonus: winning team's total bid points <= 50% of losing team's
    "UNDERDOG_WIN_LARGE": {
        "points": 1,
        "enabled": True,
        "bid_ratio_threshold": 0.50,  # winner_bid_total <= loser_bid_total * 0.50
    },
    # +0.5 pt underdog bonus: winning team's total bid points <= 75% of losing team's
    # (mutually exclusive with UNDERDOG_WIN_LARGE — only larger fires)
    "UNDERDOG_WIN_SMALL": {
        "points": 0.5,
        "enabled": True,
        "bid_ratio_threshold": 0.75,  # winner_bid_total <= loser_bid_total * 0.75
    },
    # +0.05 pts per positive shot credited to a player in a set
    "POSITIVE_SHOT": {
        "points": 0.05,
        "enabled": True,
    },
    # -0.05 pts per negative shot credited to a player in a set
    "NEGATIVE_SHOT": {
        "points": -0.05,
        "enabled": True,
    },
}
