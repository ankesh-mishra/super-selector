# Super Selector — Scoring API

This guide is for the **scorer app** that pushes match results into Super Selector.  
All games and contests are pre-created by the admin. The scorer only needs to submit results.

---

## Base URL

```
https://<your-railway-app>.up.railway.app
```

---

## Authentication

### Get a token

```bash
curl -X POST https://<base-url>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "scorer@yourapp.com", "password": "your-password" }'
```

**Response:**
```json
{ "access_token": "eyJ..." }
```

The token is valid for **7 days**. Store it and reuse it. On a `401` response, re-login to get a fresh token.

---

## Submit a Match Result

```
PATCH /api/ext/contests/{contest_id}/games
```

`/api/ext` is the **scorer-friendly endpoint**. It:
- Accepts either a UUID or an `external_id` (Prisma cuid) for `contest_id` and team IDs
- Identifies the game by `game_code` — no separate game ID needed
- Creates the game automatically if it doesn't exist yet

```bash
curl -X PATCH https://<base-url>/api/ext/contests/<contest_id>/games \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "game_code": "MDB",
    "winning_team_id": "<winning_team_uuid>",
    "player_ids": ["<player_uuid_1>", "<player_uuid_2>", "<player_uuid_3>", "<player_uuid_4>"],
    "game_details": {
      "sets": [
        { "scores": { "<team_uuid_1>": 21, "<team_uuid_2>": 15 } },
        { "scores": { "<team_uuid_1>": 21, "<team_uuid_2>": 18 } }
      ]
    }
  }'
```

Fantasy scores are **automatically recalculated** after every successful PATCH.

### With shot tracking (optional)

Add a `shots` object inside each set, keyed by player UUID:

```json
{
  "game_code": "MDB",
  "winning_team_id": "<winning_team_uuid>",
  "player_ids": ["<player_uuid_1>", "<player_uuid_2>", "<player_uuid_3>", "<player_uuid_4>"],
  "game_details": {
    "sets": [
      {
        "scores": { "<team_uuid_1>": 21, "<team_uuid_2>": 15 },
        "shots": {
          "<player_uuid_1>": { "positive": 4, "negative": 1 },
          "<player_uuid_2>": { "positive": 2, "negative": 0 },
          "<player_uuid_3>": { "positive": 1, "negative": 3 },
          "<player_uuid_4>": { "positive": 5, "negative": 2 }
        }
      },
      {
        "scores": { "<team_uuid_1>": 21, "<team_uuid_2>": 18 },
        "shots": {
          "<player_uuid_1>": { "positive": 6, "negative": 0 }
        }
      }
    ]
  }
}
```

| Field | Points |
|---|---|
| Each `positive` shot | +0.05 pts |
| Each `negative` shot | −0.05 pts |

`shots` is optional — omit it entirely or per-set if not tracking.

---

## Fix a Mistake

Re-PATCH the same `contest_id` + `game_code` with corrected data. Scores are fully recalculated from scratch.

---

## ID Format

All IDs accept **either** a UUID or an `external_id` string. You can use whichever you have on hand.

| Field | Example UUID | Example external_id |
|---|---|---|
| `contest_id` (path) | `3fa85f64-...` | `cmniu90zs00002vv3e24jmudq` |
| `winning_team_id` (body) | `9ab34d12-...` | `cmniu9lin008n2vv3kaeuj6vt` |
| `scores` dict keys (body) | `"9ab34d12-..."` | `"cmniu9lin008n2vv3kaeuj6vt"` |
| `player_ids` (body) | `["1a2b..."]` | `["cmprzqm3t0003bs9i..."]` |

## Game Codes

`game_code` identifies the game type. Pass it alongside `game_details` so the UI can display the correct label.

| Code | Name | Points | Type |
|------|------|--------|------|
| `MDA` | Men's Doubles A | 5 | DOUBLES |
| `MDB` | Men's Doubles B | 4 | DOUBLES |
| `MDC` | Men's Doubles C | 3 | DOUBLES |
| `MDD` | Men's Doubles D | 2 | DOUBLES |
| `MS`  | Men's Singles   | 3 | SINGLES |
| `WD`  | Women's Doubles | 4 | DOUBLES |
| `MXD` | Mixed Doubles   | 4 | DOUBLES |

The server resolves external IDs to internal UUIDs automatically. Mix and match is fine.

---

## Reference IDs

The admin will provide a lookup sheet like this before the event:

```
Base URL    : https://<your-railway-app>.up.railway.app
Login email : scorer@yourapp.com

Contest ID  : cmp5u9in10002145ho67cnnym  or  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  (Team A vs Team B)
Team 1 ID   : cmniu9lin008n2vv3kaeuj6vt  or  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  (Team Name A)
Team 2 ID   : cmniu9m9g008x2vv3t3nrxlgu  or  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  (Team Name B)

Game codes  : MDA  Men's Doubles A  (5pt)
              MDB  Men's Doubles B  (4pt)
              MDC  Men's Doubles C  (3pt)
              MDD  Men's Doubles D  (2pt)
              MS   Men's Singles    (3pt)
              WD   Women's Doubles  (4pt)
              MXD  Mixed Doubles    (4pt)
```

If you need to look up IDs yourself:

```bash
# List contests
GET /api/contests

# Get contest details (includes team_a_id, team_b_id, games)
GET /api/contests/<contest_id>

# List all players
GET /api/players
```

These read endpoints require no authentication.

---

## Python Example

```python
import requests

BASE = "https://<base-url>"
CREDS = {"email": "scorer@yourapp.com", "password": "your-password"}

def get_token():
    return requests.post(f"{BASE}/api/auth/login", json=CREDS).json()["access_token"]

def push_score(contest_id, payload, token):
    r = requests.patch(
        f"{BASE}/api/ext/contests/{contest_id}/games",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    if r.status_code == 401:       # token expired — re-login once
        token = get_token()
        r = requests.patch(
            f"{BASE}/api/ext/contests/{contest_id}/games",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
    r.raise_for_status()
    return token                   # return possibly-refreshed token

# Example usage
token = get_token()

token = push_score(
    contest_id="<contest_id>",
    payload={
        "game_code": "MDA",
        "winning_team_id": "<team_uuid_1>",
        "player_ids": ["<player_uuid_1>", "<player_uuid_2>", "<player_uuid_3>", "<player_uuid_4>"],
        "game_details": {
            "sets": [
                {"scores": {"<team_uuid_1>": 21, "<team_uuid_2>": 15}},
                {"scores": {"<team_uuid_1>": 21, "<team_uuid_2>": 18}},
            ]
        },
    },
    token=token,
)
print("Score submitted!")
```

---

## Permissions

The scorer account (`is_scorer = true`) can only:

| Endpoint | Access |
|---|---|
| `PATCH /api/ext/contests/{id}/games` | ✅ Submit / update result |
| `POST /api/admin/contests/{id}/games` | ✅ Create game |
| `DELETE /api/admin/contests/{id}/games/{id}` | ✅ Delete game |
| All other admin endpoints | ❌ 403 Forbidden |
| All public read endpoints | ✅ Read-only |

---

## Leaderboard

### Contest leaderboard

Requires a valid token (any authenticated user, not just scorer/admin).

```bash
curl https://<base-url>/api/leaderboard/contests/<contest_id> \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
[
  {
    "rank": 1,
    "user_id": "uuid",
    "user_name": "Alice",
    "team_name": "Alice's Dream Team",
    "total_points": 42.5,
    "contest_id": "uuid"
  },
  ...
]
```

Results are sorted by `total_points` descending. Points update live as scores are submitted.

### Tournament leaderboard

No authentication required.

```bash
curl https://<base-url>/api/leaderboard/tournaments/<tournament_id>
```

**Response:**
```json
[
  {
    "rank": 1,
    "user_id": "uuid",
    "user_name": "Alice",
    "team_name": "Alice's Dream Team",
    "total_points": 108.0,
    "contests_entered": 3
  },
  ...
]
```

Cumulative points across all contests in the tournament.
