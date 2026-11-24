const SUPABASE_URL = "https://guhsaixfkjrbobzgacff.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MSNDe4CnVoQCFgLGScg10A_Ko6ESINH";

function headers() {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Prefer: "return=representation"
  };
}

export async function fetchCandidatesFromDb() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/candidates?order=created_at.desc`, {
    headers: headers()
  });
  if (!res.ok) throw new Error("Failed to fetch candidates");
  const rows = await res.json();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    location: r.location,
    sector: r.sector,
    years: r.years,
    degree: r.degree,
    docStatus: r.doc_status,
    skills: r.skills || [],
    evidence: r.evidence,
    verified: r.verified,
    score: r.score,
    hash: r.hash
  }));
}

export async function upsertCandidateToDb(cand) {
  const payload = {
    id: cand.id,
    name: cand.name,
    role: cand.role,
    location: cand.location,
    sector: cand.sector,
    years: cand.years,
    degree: cand.degree,
    doc_status: cand.docStatus,
    skills: cand.skills,
    evidence: cand.evidence,
    verified: cand.verified,
    score: cand.score,
    hash: cand.hash
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/candidates?on_conflict=id`, {
    method: "POST",
    headers: {
      ...headers(),
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to save candidate");
  return res.json();
}

export async function saveVoucherToDb(voucher) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/vouchers`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(voucher)
  });
  if (!res.ok) throw new Error("Failed to save voucher");
  return res.json();
}

export async function saveFellowshipRequestToDb(candidateId, notes = "Hackathon employer fellowship request") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/fellowship_requests`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ candidate_id: candidateId, notes })
  });
  if (!res.ok) throw new Error("Failed to save fellowship request");
  return res.json();
} 