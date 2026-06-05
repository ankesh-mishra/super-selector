import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contestsApi, playersApi, userTeamsApi } from "../api/endpoints";
import PlayerCard from "../components/PlayerCard";
import PlayerAvatar from "../components/PlayerAvatar";
import { useAuth } from "../context/AuthContext";

const TEAM_SIZE = 11;
const MAX_FROM_ONE_TEAM = 7;
const MIN_FEMALE = 2;
const MAX_BID = 100_000;

export default function TeamBuilderPage() {
  const { id: contestId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [captainId, setCaptainId] = useState(null);
  const [vcId, setVcId] = useState(null);
  const [filterGroup, setFilterGroup] = useState("real_c");
  const [step, setStep] = useState("pick"); // 'pick' | 'assign'
  const [error, setError] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  const { data: contest } = useQuery({
    queryKey: ["contest", contestId],
    queryFn: () => contestsApi.get(contestId).then((r) => r.data),
  });

  const { data: existingTeam } = useQuery({
    queryKey: ["my-team", contestId],
    queryFn: () =>
      userTeamsApi
        .get(contestId)
        .then((r) => r.data)
        .catch(() => null),
    enabled: !!contestId,
    retry: false,
  });

  const { data: players } = useQuery({
    queryKey: ["players", contestId],
    queryFn: async () => {
      if (!contest) return [];
      const [a, b] = await Promise.all([
        playersApi.list({ team_id: contest.team_a_id }).then((r) => r.data),
        playersApi.list({ team_id: contest.team_b_id }).then((r) => r.data),
      ]);
      return [...a, ...b];
    },
    enabled: !!contest,
  });

  useEffect(() => {
    if (!existingTeam || !players) return;
    if (contest?.is_locked) {
      navigate(`/contests/${contestId}/my-team`, { replace: true });
      return;
    }
    setIsEditMode(true);
    const ids = new Set(existingTeam.players.map((utp) => utp.player_id));
    setSelectedIds(ids);
    const cap = existingTeam.players.find((utp) => utp.is_captain);
    const vc = existingTeam.players.find((utp) => utp.is_vice_captain);
    if (cap) setCaptainId(cap.player_id);
    if (vc) setVcId(vc.player_id);
  }, [existingTeam, players, contest, contestId, navigate]);

  const selectedPlayers = useMemo(
    () => (players || []).filter((p) => selectedIds.has(p.id)),
    [players, selectedIds],
  );

  const totalBid = useMemo(
    () => selectedPlayers.reduce((s, p) => s + p.bid_points, 0),
    [selectedPlayers],
  );
  const femaleCount = useMemo(
    () => selectedPlayers.filter((p) => p.gender === "FEMALE").length,
    [selectedPlayers],
  );
  const teamCount = useMemo(() => {
    const c = {};
    selectedPlayers.forEach((p) => {
      c[p.team_id] = (c[p.team_id] || 0) + 1;
    });
    return c;
  }, [selectedPlayers]);
  const realCaptainCount = useMemo(
    () => selectedPlayers.filter((p) => p.is_real_captain).length,
    [selectedPlayers],
  );
  const maxTeamCount = Math.max(0, ...Object.values(teamCount));

  const pickErrors = [];
  if (selectedIds.size !== TEAM_SIZE)
    pickErrors.push(
      `Select ${TEAM_SIZE} players (${selectedIds.size} selected)`,
    );
  if (totalBid > MAX_BID)
    pickErrors.push(
      `Budget exceeded: ${totalBid.toLocaleString()} / ${MAX_BID.toLocaleString()}`,
    );
  if (femaleCount < MIN_FEMALE)
    pickErrors.push(
      `Min ${MIN_FEMALE} female required (${femaleCount} selected)`,
    );
  if (maxTeamCount > MAX_FROM_ONE_TEAM)
    pickErrors.push(`Max ${MAX_FROM_ONE_TEAM} from one team`);
  if (realCaptainCount !== 1)
    pickErrors.push(
      `Must include exactly 1 owner (${realCaptainCount} selected)`,
    );
  const canProceed = pickErrors.length === 0;

  const assignErrors = [];
  if (!captainId) assignErrors.push("Designate a fantasy captain (C)");
  if (!vcId) assignErrors.push("Designate a vice captain (VC)");
  const canSubmit = canProceed && assignErrors.length === 0;

  const togglePlayer = (playerId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
        if (captainId === playerId) setCaptainId(null);
        if (vcId === playerId) setVcId(null);
      } else {
        if (next.size >= TEAM_SIZE) return prev;
        next.add(playerId);
      }
      return next;
    });
  };

  const handleSetCaptain = (playerId) => {
    if (vcId === playerId) setVcId(null);
    setCaptainId(playerId);
  };
  const handleSetVC = (playerId) => {
    if (captainId === playerId) setCaptainId(null);
    setVcId(playerId);
  };

  const submitMutation = useMutation({
    mutationFn: () => {
      const payload = {
        players: [...selectedIds].map((pid) => ({
          player_id: pid,
          is_captain: pid === captainId,
          is_vice_captain: pid === vcId,
        })),
      };
      return isEditMode
        ? userTeamsApi.update(contestId, payload)
        : userTeamsApi.create(contestId, payload);
    },
    onSuccess: async () => {
      const requiresApproval = !!(
        contest?.sponsor_id && contest?.join_approval_required
      );
      const isSponsorUser =
        !!user?.id && !!contest?.sponsor_id && user.id === contest.sponsor_id;

      if (requiresApproval && !isSponsorUser) {
        try {
          await contestsApi.requestJoin(contestId);
        } catch (e) {
          const statusCode = e?.response?.status;
          if (statusCode !== 409) {
            console.error("auto requestJoin failed", e);
          }
        }
        await queryClient.invalidateQueries({
          queryKey: ["my-join-request", contestId],
        });
      }

      navigate(`/contests/${contestId}?tab=my-team`);
    },
    onError: (e) => setError(e.response?.data?.detail || "Submission failed."),
  });

  const filteredPlayers = useMemo(() => {
    const sorted = [...(players || [])].sort(
      (a, b) => b.bid_points - a.bid_points,
    );
    if (filterGroup === "real_c")
      return sorted.filter((p) => p.is_real_captain);
    if (filterGroup === "women")
      return sorted.filter((p) => p.gender === "FEMALE");
    return sorted.filter((p) => !p.is_real_captain && p.gender !== "FEMALE");
  }, [players, filterGroup]);

  if (!contest || !players)
    return (
      <p className="text-center py-12 text-sm" style={{ color: "#64748b" }}>
        Loading…
      </p>
    );

  const statOk = (ok) => (ok ? "#34d399" : "#f87171");

  // ── Step 2: Assign C / VC ───────────────────────────────────────────────
  if (step === "assign") {
    const sorted = [...selectedPlayers].sort(
      (a, b) => b.bid_points - a.bid_points,
    );
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => setStep("pick")}
          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition self-start"
        >
          ← Back to selection
        </button>
        <div>
          <h2 className="text-lg font-bold text-white">
            Pick Captain &amp; Vice Captain
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
            Tap C or VC next to a player. Each role can only be held by one
            player.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          {sorted.map((p) => (
            <div
              key={p.id}
              className="rounded-xl px-3 py-2 flex items-center gap-2"
              style={{
                background: "#0f1623",
                border: `1px solid ${
                  captainId === p.id
                    ? "rgba(16,185,129,.5)"
                    : vcId === p.id
                      ? "rgba(59,130,246,.5)"
                      : "#1e2d42"
                }`,
              }}
            >
              <PlayerAvatar player={p} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white truncate">
                  {p.name}
                </p>
                <p className="text-xs truncate" style={{ color: "#64748b" }}>
                  {p.team?.name}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleSetCaptain(p.id)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg transition"
                  style={
                    captainId === p.id
                      ? { background: "#059669", color: "#fff" }
                      : {
                          background: "#1a2236",
                          color: "#475569",
                          border: "1px solid #1e2d42",
                        }
                  }
                >
                  C
                </button>
                <button
                  onClick={() => handleSetVC(p.id)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg transition"
                  style={
                    vcId === p.id
                      ? { background: "#2563eb", color: "#fff" }
                      : {
                          background: "#1a2236",
                          color: "#475569",
                          border: "1px solid #1e2d42",
                        }
                  }
                >
                  VC
                </button>
              </div>
            </div>
          ))}
        </div>

        {assignErrors.length > 0 && (
          <ul
            className="rounded-xl p-3 text-xs flex flex-col gap-1"
            style={{
              background: "rgba(239,68,68,.08)",
              border: "1px solid rgba(239,68,68,.25)",
              color: "#f87171",
            }}
          >
            {assignErrors.map((e, i) => (
              <li key={i}>• {e}</li>
            ))}
          </ul>
        )}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          disabled={!canSubmit || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
          className="font-semibold py-3 rounded-xl transition disabled:opacity-40 hover:opacity-90"
          style={{
            background: "linear-gradient(135deg,#10b981,#059669)",
            color: "#fff",
          }}
        >
          {submitMutation.isPending
            ? "Submitting…"
            : isEditMode
              ? "Update Team"
              : "Submit Team"}
        </button>
      </div>
    );
  }

  // ── Step 1: Pick players ────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate(-1)}
        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition self-start"
      >
        ← Back
      </button>
      <h2 className="text-lg font-bold text-white">
        {isEditMode ? "Edit Your Team" : "Build Your Team"}
      </h2>

      {/* Stats bar */}
      <div
        className="grid grid-cols-4 gap-2 rounded-xl p-3 text-center text-xs"
        style={{ background: "#0f1623", border: "1px solid #1e2d42" }}
      >
        <div>
          <p
            className="font-black text-base"
            style={{ color: statOk(selectedIds.size === TEAM_SIZE) }}
          >
            {selectedIds.size}/{TEAM_SIZE}
          </p>
          <p style={{ color: "#64748b" }}>Players</p>
        </div>
        <div>
          <p
            className="font-black text-base"
            style={{ color: totalBid > MAX_BID ? "#f87171" : "#f0f4f8" }}
          >
            {(totalBid / 1000).toFixed(0)}K
          </p>
          <p style={{ color: "#64748b" }}>/ {MAX_BID / 1000}K</p>
        </div>
        <div>
          <p
            className="font-black text-base"
            style={{ color: statOk(femaleCount >= MIN_FEMALE) }}
          >
            {femaleCount}
          </p>
          <p style={{ color: "#64748b" }}>♀ (min {MIN_FEMALE})</p>
        </div>
        <div>
          <p
            className="font-black text-base"
            style={{ color: statOk(realCaptainCount === 1) }}
          >
            {realCaptainCount}
          </p>
          <p style={{ color: "#64748b" }}>Owner</p>
        </div>
      </div>

      {/* Player group tabs */}
      <div className="flex gap-2">
        {[
          ["real_c", "Owner"],
          ["women", "Women"],
          ["rest", "Rest"],
        ].map(([key, label]) => (
          <button
            key={key}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition"
            style={
              filterGroup === key
                ? {
                    background: "linear-gradient(135deg,#10b981,#059669)",
                    color: "#fff",
                  }
                : {
                    background: "#0f1623",
                    border: "1px solid #1e2d42",
                    color: "#64748b",
                  }
            }
            onClick={() => setFilterGroup(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Validation errors */}
      {pickErrors.length > 0 && (
        <ul
          className="rounded-xl p-3 text-xs flex flex-col gap-1"
          style={{
            background: "rgba(239,68,68,.08)",
            border: "1px solid rgba(239,68,68,.25)",
            color: "#f87171",
          }}
        >
          {pickErrors.map((e, i) => (
            <li key={i}>• {e}</li>
          ))}
        </ul>
      )}

      {/* Player list */}
      <div className="flex flex-col gap-1">
        {filteredPlayers.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            selected={selectedIds.has(p.id)}
            onToggle={togglePlayer}
          />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button
        disabled={!canProceed}
        onClick={() => setStep("assign")}
        className="font-semibold py-3 rounded-xl transition disabled:opacity-40 hover:opacity-90"
        style={{
          background: "linear-gradient(135deg,#10b981,#059669)",
          color: "#fff",
        }}
      >
        {isEditMode ? "Update Team →" : "Continue →"}
      </button>
    </div>
  );
}
