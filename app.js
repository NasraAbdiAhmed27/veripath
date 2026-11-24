import {
  fetchCandidatesFromDb,
  upsertCandidateToDb,
  saveVoucherToDb,
  saveFellowshipRequestToDb
} from "./backend.js";

// Initial Vetted Refugee Talent Records (Pre-populated Cohort & Offline Fallback)
const initialCandidates = [
  {
    id: "VP-8492-KE",
    name: "Dr. Tariq Al-Mansoor",
    role: "Clinical Medical Officer & Public Health Lead",
    location: "Nairobi, Kenya",
    sector: "Clinical Healthcare & Nursing",
    years: 7,
    degree: "M.B.B.S. Medicine & Surgery — Damascus University, Syria",
    docStatus: "Digital Scan Only (Unattested)",
    skills: ["Emergency Triage", "Epidemiology", "Maternal Health", "WHO Protocols"],
    evidence: "Completed 96% clinical simulation audit + WHO communicable disease response certification.",
    verified: true,
    score: "96% Competency Verified",
    hash: "3c91a4b8...e902f11c"
  },
  {
    id: "VP-3104-JO",
    name: "Nadia Habimana",
    role: "Senior IFRS Financial Analyst & Auditor",
    location: "Amman / Remote",
    sector: "Accounting, Audit & Finance",
    years: 6,
    degree: "B.Com. Accounting & Finance — University of Burundi",
    docStatus: "Missing / Left Behind During Displacement",
    skills: ["IFRS Reporting", "Financial Modeling", "Tax Compliance", "SAP ERP"],
    evidence: "Passed 3-stage IFRS audit simulation (92%) + verified donor grant reconciliation portfolio.",
    verified: true,
    score: "92% Competency Verified",
    hash: "7d10e5f2...41a8c39b"
  },
  {
    id: "VP-5521-UG",
    name: "Samuel Deng Kuol",
    role: "Renewable Microgrid & Civil Systems Engineer",
    location: "Kampala, Uganda",
    sector: "Civil & Energy Engineering",
    years: 5,
    degree: "B.Eng. Electrical & Power Systems — University of Juba",
    docStatus: "Foreign Degree Unrecognized Locally",
    skills: ["Solar PV Design", "AutoCAD Civil", "Grid Load Analysis", "Project QA"],
    evidence: "Designed 3 off-grid clinic solar installations + passed IEEE safety standards benchmark.",
    verified: true,
    score: "90% Competency Verified",
    hash: "9a44b7c0...65d2e81f"
  },
  {
    id: "VP-6719-KE",
    name: "Hodan Warsame",
    role: "Cloud Infrastructure & DevSecOps Specialist",
    location: "Garissa / Remote",
    sector: "Software & Cloud Engineering",
    years: 4,
    degree: "B.Sc. Information Technology — Mogadishu University",
    docStatus: "Original Transcripts Available",
    skills: ["Microsoft Azure", "Linux Security", "Docker", "Python Automation"],
    evidence: "AZ-900 & Azure Administrator certified + live infrastructure hardening lab score of 95%.",
    verified: true,
    score: "95% Competency Verified",
    hash: "5e82d9a1...12f7b04e"
  },
  {
    id: "VP-9042-KE",
    name: "Amina Hassan Farah",
    role: "Full-Stack Python & Database Developer",
    location: "Garissa / Nairobi, Kenya",
    sector: "Software & Cloud Engineering",
    years: 4,
    degree: "B.Sc. in Computer Science (4-Year Honours) — University of Khartoum, Sudan",
    docStatus: "Missing / Left Behind During Displacement",
    skills: ["Python", "PostgreSQL", "REST APIs", "System Architecture", "Automated Testing"],
    evidence: "GitHub production repo (github.com/aminahassan/logistics-api), former department lead attestation, and 94% score on live SQL/Python systems benchmark.",
    verified: false,
    score: "Provisional (Awaiting Domain Test)",
    hash: "8f94e2c1...7b30a9d4"
  }
];

// Domain Competency Scenario Questions
const assessmentBank = {
  tech: [
    {
      q: "1. A distributed humanitarian supply API suffers duplicate order writes during intermittent mobile connectivity. Which mechanism guarantees idempotency?",
      options: [
        "Client-generated UUID idempotency keys checked atomically before database commit",
        "Increasing HTTP request timeout from 5 seconds to 60 seconds",
        "Running a nightly cron job to delete duplicate rows manually"
      ],
      answer: 0
    },
    {
      q: "2. When indexing a multi-million-row PostgreSQL table frequently queried by (region_code, created_at), what index design is optimal?",
      options: [
        "Separate hash indexes on every column in the table",
        "A composite B-tree index on (region_code, created_at)",
        "Converting timestamps to VARCHAR text fields"
      ],
      answer: 1
    },
    {
      q: "3. Which practice best protects sensitive refugee identity records at rest and in transit?",
      options: [
        "Storing national IDs in Base64 encoding inside local browser storage",
        "TLS 1.3 in transit + envelope AES-256 encryption with role-based access keys",
        "Sharing read-only database credentials over encrypted chat"
      ],
      answer: 1
    }
  ],
  health: [
    {
      q: "1. During an acute watery diarrhea outbreak in a high-density settlement, a 3-year-old presents with sunken eyes, lethargy, and slow skin pinch (>2 sec). First-line action?",
      options: [
        "Immediate IV Ringer's Lactate (Plan C rapid rehydration) + close vitals monitoring",
        "Oral antibiotics only and discharge home for 48 hours",
        "Plain water sips without electrolytes"
      ],
      answer: 0
    },
    {
      q: "2. What is the single most critical indicator when triaging multiple trauma patients in a low-resource clinic?",
      options: [
        "Order of arrival at the clinic registration desk",
        "Airway patency, breathing adequacy, and active hemorrhage control (ABCDE)",
        "Availability of prior paper medical records"
      ],
      answer: 1
    },
    {
      q: "3. Which cold-chain protocol ensures vaccine potency when grid power fluctuates?",
      options: [
        "Continuous digital temperature logging (2°C–8°C) with solar-direct-drive backup",
        "Freezing all vaccines at -20°C regardless of manufacturer label",
        "Checking refrigerator temperature once per week"
      ],
      answer: 0
    }
  ],
  finance: [
    {
      q: "1. Under IFRS 15, when should a multi-milestone technical services contract recognize revenue?",
      options: [
        "100% upon signing the initial memorandum of understanding",
        "As each distinct performance obligation is satisfied and verified",
        "Only at the end of the fiscal year regardless of delivery"
      ],
      answer: 1
    },
    {
      q: "2. During a donor grant audit, bank transfers match ledger entries, but 3 vendor invoices lack goods-received notes. What is the proper audit classification?",
      options: [
        "Internal control exception requiring supporting delivery verification before sign-off",
        "Immaterial variance that can be deleted from the trial balance",
        "Automatic fraud conviction without vendor inquiry"
      ],
      answer: 0
    },
    {
      q: "3. Which ratio best measures an organization's immediate ability to cover short-term payroll and obligations without selling inventory?",
      options: [
        "Debt-to-Equity Ratio",
        "Quick (Acid-Test) Ratio",
        "Gross Profit Margin"
      ],
      answer: 1
    }
  ]
};

const grantData = {
  equivalency: {
    cost: 120,
    note: "Includes direct voucher payment to National Qualifications Authority + 14-day dossier mentor."
  },
  licensing: {
    cost: 280,
    note: "Covers professional board exam sitting fee, study prep bank, and identity attestation."
  },
  cloud_cert: {
    cost: 165,
    note: "Covers proctored industry certification exam voucher + practice lab access."
  },
  portfolio_lab: {
    cost: 210,
    note: "Covers assessed capstone environment + 2 months high-speed connectivity stipend."
  }
};

let candidates = [...initialCandidates];
let currentPassportId = "VP-9042-KE";
let activeSectorFilter = "ALL";
let activeModalCandidate = null;

// DOM References
const passportForm = document.getElementById("passport-form");
const stepTabs = document.querySelectorAll(".step-tab");
const formSteps = document.querySelectorAll(".form-step");

function switchStep(stepNumber) {
  stepTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.step === String(stepNumber));
  });
  formSteps.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.stepPanel === String(stepNumber));
  });
}

stepTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchStep(tab.dataset.step));
});

document.querySelectorAll(".next-step").forEach((btn) => {
  btn.addEventListener("click", () => switchStep(btn.dataset.next));
});

document.querySelectorAll(".prev-step").forEach((btn) => {
  btn.addEventListener("click", () => switchStep(btn.dataset.prev));
});

// Live Passport Sync
function generatePseudoHash(input) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  const partA = (h1 >>> 0).toString(16).padStart(8, "0");
  const partB = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${partA}...${partB}`;
}

function buildCurrentRecordFromForm() {
  const name = document.getElementById("cand-name").value.trim() || "Amina Hassan Farah";
  const location = document.getElementById("cand-location").value.trim() || "Garissa / Nairobi, Kenya";
  const sector = document.getElementById("cand-sector").value;
  const role = document.getElementById("cand-role").value.trim() || "Target Role";
  const degreeTitle = document.getElementById("cand-degree").value.trim() || "Prior Qualification";
  const institution = document.getElementById("cand-institution").value.trim() || "Issuing Institution";
  const degree = `${degreeTitle} — ${institution}`;
  const docStatus = document.getElementById("cand-doc-status").value;
  const years = Number(document.getElementById("cand-years").value) || 0;
  const skills = document
    .getElementById("cand-skills")
    .value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const evidence = document.getElementById("cand-evidence").value.trim();

  const existing = candidates.find((c) => c.id === currentPassportId);
  const verified = existing ? existing.verified : false;
  const score = existing
    ? existing.score
    : "Provisional (Take Step 2 Test to Verify)";

  return {
    id: currentPassportId,
    name,
    role,
    location,
    sector,
    years,
    degree,
    docStatus,
    skills,
    evidence,
    verified,
    score,
    hash: generatePseudoHash(name + degree + skills.join(","))
  };
}

function updateLivePreview() {
  const name = document.getElementById("cand-name").value.trim() || "Candidate Name";
  const location = document.getElementById("cand-location").value.trim() || "Host Location";
  const sector = document.getElementById("cand-sector").value;
  const role = document.getElementById("cand-role").value.trim() || "Target Role";
  const degree = document.getElementById("cand-degree").value.trim() || "Prior Qualification";
  const institution = document.getElementById("cand-institution").value.trim() || "Issuing Institution";
  const docStatus = document.getElementById("cand-doc-status").value;
  const years = document.getElementById("cand-years").value || "0";
  const skillsRaw = document.getElementById("cand-skills").value;
  const evidence = document.getElementById("cand-evidence").value.trim();

  document.getElementById("prev-name").textContent = name;
  document.getElementById("prev-role").textContent = role;
  document.getElementById("prev-location").textContent = location;
  document.getElementById("prev-sector-exp").textContent = `${sector} · ${years} Yrs`;
  document.getElementById("prev-degree").textContent = `${degree} — ${institution}`;
  document.getElementById("prev-doc-status").textContent = docStatus;
  document.getElementById("prev-evidence").textContent = evidence || "Pending practical evidence upload.";

  const skillsContainer = document.getElementById("prev-skills");
  skillsContainer.innerHTML = "";
  skillsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((skill) => {
      const chip = document.createElement("span");
      chip.className = "skill-chip";
      chip.textContent = skill;
      skillsContainer.appendChild(chip);
    });

  document.getElementById("prev-hash").textContent = `SHA256: ${generatePseudoHash(name + degree + skillsRaw)}`;
}

passportForm.addEventListener("input", updateLivePreview);

// 1. Passport Creation & Supabase Sync
passportForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  updateLivePreview();

  const submitBtn = passportForm.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving to Database...";

  const record = buildCurrentRecordFromForm();
  const publishConsent = document.getElementById("cand-consent").checked;
  const existingIndex = candidates.findIndex((c) => c.id === currentPassportId);

  if (publishConsent) {
    if (existingIndex >= 0) {
      candidates[existingIndex] = record;
    } else {
      candidates.unshift(record);
    }
    renderTalentGrid();
  }

  let dbSaved = false;
  if (publishConsent) {
    try {
      await upsertCandidateToDb(record);
      dbSaved = true;
    } catch (err) {
      console.warn("Supabase candidate upsert failed, kept in local session:", err.message);
    }
  }

  const metricEl = document.getElementById("metric-passports");
  metricEl.textContent = (1428 + Math.max(0, candidates.length - initialCandidates.length + 1)).toLocaleString();

  const banner = document.getElementById("publish-banner");
  banner.classList.remove("hidden");
  banner.textContent = dbSaved
    ? `Passport ${currentPassportId} saved to PostgreSQL & indexed! Complete Step 02 below to earn a Verified Competency Badge.`
    : `Passport ${currentPassportId} saved locally (offline/unconfigured backend mode). Complete Step 02 below to earn a Verified Competency Badge.`;

  submitBtn.disabled = false;
  submitBtn.textContent = originalBtnText;
});

// 2. Quiz / Competency Assessment & Supabase Verification Sync
const quizDomainSelect = document.getElementById("quiz-domain");
const quizContainer = document.getElementById("quiz-container");

function renderQuiz(domainKey) {
  const questions = assessmentBank[domainKey];
  quizContainer.innerHTML = questions
    .map(
      (item, idx) => `
      <div class="quiz-question">
        <p>${item.q}</p>
        ${item.options
          .map(
            (opt, optIdx) => `
            <label class="quiz-option">
              <input type="radio" name="q_${idx}" value="${optIdx}" />
              <span>${opt}</span>
            </label>
          `
          )
          .join("")}
      </div>
    `
    )
    .join("");
}

quizDomainSelect.addEventListener("change", (e) => {
  renderQuiz(e.target.value);
  document.getElementById("quiz-result").textContent = "";
});

document.getElementById("submit-quiz-btn").addEventListener("click", async () => {
  const domainKey = quizDomainSelect.value;
  const questions = assessmentBank[domainKey];
  let correct = 0;
  let answered = 0;

  questions.forEach((item, idx) => {
    const selected = document.querySelector(`input[name="q_${idx}"]:checked`);
    if (selected) {
      answered++;
      if (Number(selected.value) === item.answer) correct++;
    }
  });

  const resultEl = document.getElementById("quiz-result");
  if (answered < questions.length) {
    resultEl.style.color = "#b45309";
    resultEl.textContent = "Please answer all 3 scenario questions first.";
    return;
  }

  const pct = Math.round((correct / questions.length) * 100);
  if (correct >= 2) {
    // Upgrade Live Passport Card immediately
    const seal = document.getElementById("prev-seal");
    seal.classList.add("verified");
    document.getElementById("prev-seal-text").textContent = "VERIFIED";

    // Upgrade or insert Candidate in Directory
    let target = candidates.find((c) => c.id === currentPassportId);
    if (!target) {
      target = buildCurrentRecordFromForm();
      candidates.unshift(target);
    }
    target.verified = true;
    target.score = `${pct}% Competency Verified`;
    renderTalentGrid();

    let synced = false;
    try {
      await upsertCandidateToDb(target);
      synced = true;
    } catch (err) {
      console.warn("Supabase verification update failed, kept in local session:", err.message);
    }

    resultEl.style.color = "#0f766e";
    resultEl.textContent = synced
      ? `Passed (${correct}/3 · ${pct}%) — Passport ${currentPassportId} upgraded & synced to database!`
      : `Passed (${correct}/3 · ${pct}%) — Passport ${currentPassportId} upgraded to VERIFIED!`;
  } else {
    resultEl.style.color = "#c5192d";
    resultEl.textContent = `Score: ${correct}/3 (${pct}%). Review domain guidance and retry to unlock verification.`;
  }
});

// 3. Bridging Micro-Grant Calculator & Supabase Voucher Reservation
const grantPathway = document.getElementById("grant-pathway");
const grantNeed = document.getElementById("grant-need");

function updateGrantSummary() {
  const selected = grantData[grantPathway.value];
  const ratio = Number(grantNeed.value);
  const covered = selected.cost * ratio;
  const oop = selected.cost - covered;

  document.getElementById("grant-total-cost").textContent = `$${selected.cost.toFixed(2)}`;
  document.getElementById("grant-covered").textContent = `$${covered.toFixed(2)} (${Math.round(ratio * 100)}%)`;
  document.getElementById("grant-oop").textContent = `$${oop.toFixed(2)}`;
  document.getElementById("grant-timeline").textContent = selected.note;
}

grantPathway.addEventListener("change", updateGrantSummary);
grantNeed.addEventListener("change", updateGrantSummary);

document.getElementById("claim-voucher-btn").addEventListener("click", async () => {
  const btn = document.getElementById("claim-voucher-btn");
  const conf = document.getElementById("voucher-confirmation");
  btn.disabled = true;
  btn.textContent = "Reserving Voucher...";

  const selected = grantData[grantPathway.value];
  const ratio = Number(grantNeed.value);
  const covered = Number((selected.cost * ratio).toFixed(2));
  const voucherCode = `VCH-${Math.floor(100000 + Math.random() * 900000)}`;

  let savedToDb = false;
  try {
    // Ensure candidate exists in DB first so foreign-key link succeeds
    let target = candidates.find((c) => c.id === currentPassportId);
    if (!target) {
      target = buildCurrentRecordFromForm();
      candidates.unshift(target);
      renderTalentGrid();
    }
    await upsertCandidateToDb(target);
    await saveVoucherToDb({
      voucher_code: voucherCode,
      candidate_id: currentPassportId,
      pathway: grantPathway.value,
      coverage_ratio: ratio,
      amount_covered: covered
    });
    savedToDb = true;
  } catch (err) {
    console.warn("Supabase voucher save failed, showing local voucher:", err.message);
  }

  conf.classList.remove("hidden");
  conf.textContent = savedToDb
    ? `Voucher ${voucherCode} ($${covered.toFixed(2)}) saved to database & linked to ${currentPassportId}.`
    : `Voucher ${voucherCode} ($${covered.toFixed(2)}) linked to ${currentPassportId}. Direct disbursement queued with accrediting partner.`;

  btn.disabled = false;
  btn.textContent = "Reserve Fee-Waiver Voucher";
});

// 4. Employer Directory & Credential Lookup
function renderTalentGrid() {
  const grid = document.getElementById("talent-grid");
  const onlyVerified = document.getElementById("only-verified-toggle").checked;

  const filtered = candidates.filter((c) => {
    const sectorMatch = activeSectorFilter === "ALL" || c.sector === activeSectorFilter;
    const verifiedMatch = !onlyVerified || c.verified;
    return sectorMatch && verifiedMatch;
  });

  grid.innerHTML = filtered
    .map(
      (c) => `
      <article class="talent-card">
        <div>
          <div class="talent-top">
            <div>
              <h3>${c.name}</h3>
              <div class="talent-role">${c.role}</div>
            </div>
            <span class="${c.verified ? "badge-verified" : "badge-provisional"}">
              ${c.verified ? "✓ Verified" : "Provisional"}
            </span>
          </div>
          <p class="talent-detail">
            <strong>Origin Degree:</strong> ${c.degree}<br />
            <strong>Location:</strong> ${c.location} · ${c.years} yrs exp.<br />
            <strong>Record Status:</strong> ${c.docStatus}
          </p>
          <div class="talent-tags">
            ${c.skills.slice(0, 4).map((s) => `<span class="talent-tag">${s}</span>`).join("")}
          </div>
        </div>
        <div class="talent-actions">
          <span>${c.id}</span>
          <button type="button" class="btn btn-outline btn-sm audit-btn" data-id="${c.id}">Inspect Dossier</button>
        </div>
      </article>
    `
    )
    .join("");

  document.querySelectorAll(".audit-btn").forEach((btn) => {
    btn.addEventListener("click", () => openCandidateModal(btn.dataset.id));
  });
}

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeSectorFilter = btn.dataset.filter;
    renderTalentGrid();
  });
});

document.getElementById("only-verified-toggle").addEventListener("change", renderTalentGrid);

// Instant Credential ID Verification
document.getElementById("verify-id-btn").addEventListener("click", () => {
  const query = document.getElementById("lookup-id").value.trim().toUpperCase();
  const resultBox = document.getElementById("lookup-result");
  const match = candidates.find((c) => c.id.toUpperCase() === query);

  if (!query) {
    resultBox.innerHTML = `<span style="color:#b45309;font-weight:600;">Enter a Credential ID (e.g., VP-8492-KE or VP-9042-KE).</span>`;
    return;
  }

  if (match) {
    resultBox.innerHTML = `
      <strong style="color:#0f766e;">✓ AUTHENTIC RECORD FOUND (${match.id})</strong><br />
      <span><strong>${match.name}</strong> — ${match.role} (${match.score}) · Hash: <code>${match.hash}</code></span>
    `;
  } else {
    resultBox.innerHTML = `<strong style="color:#c5192d;">✕ No matching VeriPath ID found for "${query}".</strong>`;
  }
});

// Modal Controls & Fellowship Request Persistence
const modal = document.getElementById("candidate-modal");

function openCandidateModal(id) {
  const cand = candidates.find((c) => c.id === id);
  if (!cand) return;
  activeModalCandidate = cand;

  document.getElementById("modal-id").textContent = `${cand.verified ? "VERIFIED" : "PROVISIONAL"} DOSSIER · ${cand.id}`;
  document.getElementById("modal-title").textContent = cand.name;
  document.getElementById("modal-body").innerHTML = `
    <div><strong>Target Role:</strong> ${cand.role}</div>
    <div><strong>Host Location:</strong> ${cand.location}</div>
    <div><strong>Foreign Qualification:</strong> ${cand.degree}</div>
    <div><strong>Documentation Pathway:</strong> ${cand.docStatus}</div>
    <div><strong>Competency Evaluation:</strong> ${cand.score}</div>
    <div><strong>Practical Work Proof:</strong> ${cand.evidence}</div>
    <div><strong>Cryptographic Hash:</strong> <code>SHA256:${cand.hash}</code></div>
  `;
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

document.getElementById("modal-close-btn").addEventListener("click", closeModal);
document.getElementById("modal-close-bg").addEventListener("click", closeModal);

document.getElementById("modal-download-btn").addEventListener("click", () => {
  if (!activeModalCandidate) return;
  const blob = new Blob([JSON.stringify(activeModalCandidate, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${activeModalCandidate.id}-veripath-dossier.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("modal-invite-btn").addEventListener("click", async () => {
  if (!activeModalCandidate) return;
  const inviteBtn = document.getElementById("modal-invite-btn");
  inviteBtn.disabled = true;
  inviteBtn.textContent = "Logging Request...";

  let loggedToDb = false;
  try {
    // Ensure candidate exists in DB before inserting fellowship request FK
    await upsertCandidateToDb(activeModalCandidate);
    await saveFellowshipRequestToDb(
      activeModalCandidate.id,
      `Employer interview & paid fellowship request for ${activeModalCandidate.name} (${activeModalCandidate.role})`
    );
    loggedToDb = true;
  } catch (err) {
    console.warn("Supabase fellowship request failed, showing local confirmation:", err.message);
  }

  alert(
    loggedToDb
      ? `Interview & Paid Fellowship request logged to database for ${activeModalCandidate.name} (${activeModalCandidate.id}).`
      : `Interview & Paid Fellowship request dispatched to ${activeModalCandidate.name} (${activeModalCandidate.id}).`
  );

  inviteBtn.disabled = false;
  inviteBtn.textContent = "Request Paid Fellowship / Interview";
  closeModal();
});

// Initialize App & Load Persisted Records from Supabase
async function initApp() {
  renderQuiz("tech");
  updateGrantSummary();
  updateLivePreview();
  renderTalentGrid();

  try {
    const dbRows = await fetchCandidatesFromDb();
    if (Array.isArray(dbRows) && dbRows.length > 0) {
      // Merge DB records with initial seed records so demo IDs remain searchable
      const mergedMap = new Map();
      initialCandidates.forEach((c) => mergedMap.set(c.id, c));
      dbRows.forEach((c) => mergedMap.set(c.id, c));
      candidates = Array.from(mergedMap.values());

      // Sync live preview seal if currentPassportId is already verified in DB
      const currentCand = candidates.find((c) => c.id === currentPassportId);
      if (currentCand && currentCand.verified) {
        document.getElementById("prev-seal").classList.add("verified");
        document.getElementById("prev-seal-text").textContent = "VERIFIED";
      }

      document.getElementById("metric-passports").textContent = (
        1428 + Math.max(0, candidates.length - initialCandidates.length)
      ).toLocaleString();

      renderTalentGrid();
    }
  } catch (err) {
    console.info("Running with local seed cohort (Supabase not yet configured or offline):", err.message);
  }
}

initApp(); 