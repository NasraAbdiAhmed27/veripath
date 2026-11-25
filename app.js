import {
  checkConnection,
  fetchPassports,
  createPassport,
  updatePassport,
  fetchFellowshipRequests,
  createFellowshipRequest,
} from "./backend.js";

let passports = [];
let requests = [];
let activePassport = null;

// DOM references
const dbStatusEl = document.getElementById("db-status");
const btnBeneficiary = document.getElementById("btn-beneficiary-portal");
const btnEmployer = document.getElementById("btn-employer-portal");
const beneficiaryPortal = document.getElementById("beneficiary-portal");
const employerPortal = document.getElementById("employer-portal");

// Portal Switcher
function switchPortal(target) {
  const isBeneficiary = target === "beneficiary";
  btnBeneficiary.classList.toggle("active", isBeneficiary);
  btnBeneficiary.setAttribute("aria-selected", String(isBeneficiary));
  btnEmployer.classList.toggle("active", !isBeneficiary);
  btnEmployer.setAttribute("aria-selected", String(!isBeneficiary));

  beneficiaryPortal.classList.toggle("hidden", !isBeneficiary);
  employerPortal.classList.toggle("hidden", isBeneficiary);

  if (!isBeneficiary) {
    renderDirectory();
    renderRequestsTable();
  }
}

btnBeneficiary.addEventListener("click", () => switchPortal("beneficiary"));
btnEmployer.addEventListener("click", () => switchPortal("employer"));

// SHA-256 Integrity Fingerprint
async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generatePassportCode() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `VP-${num}`;
}

// Telemetry Metrics
function updateMetrics() {
  const validatedCount = passports.filter((p) => p.quiz_passed).length;
  const voucherSum = passports.reduce(
    (sum, p) => sum + Number(p.voucher_estimate || 0),
    0
  );

  document.getElementById("metric-passports").textContent = passports.length;
  document.getElementById("metric-validated").textContent = validatedCount;
  document.getElementById("metric-vouchers").textContent = `$${voucherSum.toLocaleString()}`;
  document.getElementById("metric-requests").textContent = requests.length;
}

// Render Active Beneficiary Passport Card
function renderActivePassport() {
  const box = document.getElementById("issued-passport-box");
  if (!activePassport) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  document.getElementById("preview-name").textContent = activePassport.full_name;
  document.getElementById("preview-role").textContent = `${activePassport.primary_role} • ${activePassport.location} (${activePassport.years_experience} yrs)`;
  document.getElementById("preview-code").textContent = activePassport.passport_code;
  document.getElementById("preview-doc-status").textContent = activePassport.record_status;
  document.getElementById("preview-quiz-status").textContent = activePassport.quiz_passed
    ? `Passed (${activePassport.quiz_score}/3)`
    : "Pending Assessment";
  document.getElementById("preview-voucher").textContent = `$${Number(
    activePassport.voucher_estimate || 0
  ).toFixed(2)} (${activePassport.voucher_status})`;
  document.getElementById("preview-hash").textContent = activePassport.verification_hash;

  const quizBadge = document.getElementById("quiz-badge");
  if (activePassport.quiz_passed) {
    quizBadge.textContent = `Verified (${activePassport.quiz_score}/3)`;
    quizBadge.className = "badge";
  } else {
    quizBadge.textContent = "Unverified";
    quizBadge.className = "badge neutral";
  }
}

// 1. Create Digital Skills Passport
document.getElementById("passport-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const full_name = document.getElementById("full_name").value.trim();
  const location = document.getElementById("location").value.trim();
  const primary_role = document.getElementById("primary_role").value.trim();
  const years_experience = Number(document.getElementById("years_experience").value || 0);
  const education_summary = document.getElementById("education_summary").value.trim();
  const record_status = document.getElementById("record_status").value;
  const skills = document
    .getElementById("skills")
    .value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const work_proof_url = document.getElementById("work_proof_url").value.trim();
  const work_proof_notes = document.getElementById("work_proof_notes").value.trim();

  const passport_code = generatePassportCode();
  const verification_hash = await sha256Hex(
    `${passport_code}|${full_name}|${primary_role}|${skills.join(",")}|${Date.now()}`
  );

  const saved = await createPassport({
    passport_code,
    full_name,
    location,
    primary_role,
    years_experience,
    education_summary,
    record_status,
    skills,
    work_proof_url,
    work_proof_notes,
    verification_hash,
    quiz_score: null,
    quiz_passed: false,
    voucher_estimate: 0,
    voucher_status: "Not Requested",
  });

  activePassport = saved;
  passports = [saved, ...passports.filter((p) => p.id !== saved.id)];
  renderActivePassport();
  updateMetrics();
});

// 2. Competency Check
document.getElementById("quiz-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const resultBox = document.getElementById("quiz-result");
  if (!activePassport) {
    resultBox.textContent = "Create your Digital Skills Passport first so your score can be attached.";
    resultBox.classList.remove("hidden");
    return;
  }

  const formData = new FormData(e.target);
  const score =
    Number(formData.get("q1") || 0) +
    Number(formData.get("q2") || 0) +
    Number(formData.get("q3") || 0);
  const passed = score >= 2;

  const updated = await updatePassport(activePassport.id, {
    quiz_score: score,
    quiz_passed: passed,
  });

  activePassport = updated;
  passports = passports.map((p) => (p.id === updated.id ? updated : p));
  renderActivePassport();
  updateMetrics();

  resultBox.textContent = passed
    ? `Assessment passed (${score}/3). Verified badge attached to ${activePassport.passport_code}.`
    : `Score recorded (${score}/3). Review practical scenarios and retake anytime to reach 2/3.`;
  resultBox.classList.remove("hidden");
});

// 3. Voucher / Bridging Stipend Estimator
function calculateVoucherAmount() {
  const fee = Number(document.getElementById("exam_fee").value || 0);
  const months = Number(document.getElementById("bridging_months").value || 0);
  const connectivity = document.getElementById("needs_connectivity").checked ? 40 * months : 0;
  const baseBridging = months * 60;
  const total = fee + baseBridging + connectivity;
  document.getElementById("voucher-total").textContent = `$${total.toFixed(2)}`;
  return total;
}

["exam_fee", "bridging_months", "needs_connectivity"].forEach((id) => {
  document.getElementById(id).addEventListener("input", calculateVoucherAmount);
});

document.getElementById("voucher-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const voucherResult = document.getElementById("voucher-result");
  if (!activePassport) {
    voucherResult.textContent = "Create your Digital Skills Passport first to attach a voucher estimate.";
    voucherResult.classList.remove("hidden");
    return;
  }

  const total = calculateVoucherAmount();
  const updated = await updatePassport(activePassport.id, {
    voucher_estimate: total,
    voucher_status: "Estimated — Ready for Partner Review",
  });

  activePassport = updated;
  passports = passports.map((p) => (p.id === updated.id ? updated : p));
  renderActivePassport();
  updateMetrics();

  voucherResult.textContent = `Voucher estimate ($${total.toFixed(2)}) saved to passport ${activePassport.passport_code}.`;
  voucherResult.classList.remove("hidden");
});

// =========================================================
// EMPLOYER DIRECTORY & FELLOWSHIP MODAL
// =========================================================
const searchInput = document.getElementById("search-candidates");
const validatedOnlyCheckbox = document.getElementById("filter-validated-only");

searchInput.addEventListener("input", renderDirectory);
validatedOnlyCheckbox.addEventListener("change", renderDirectory);

function renderDirectory() {
  const grid = document.getElementById("candidate-grid");
  const term = searchInput.value.trim().toLowerCase();
  const onlyValidated = validatedOnlyCheckbox.checked;

  const filtered = passports.filter((p) => {
    if (onlyValidated && !p.quiz_passed) return false;
    if (!term) return true;
    const hay = `${p.full_name} ${p.primary_role} ${p.location} ${(p.skills || []).join(" ")}`.toLowerCase();
    return hay.includes(term);
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="card"><p class="muted">No candidate passports match the current filter. Switch to the Beneficiary Portal to issue a new passport.</p></div>`;
    return;
  }

  grid.innerHTML = filtered
    .map(
      (p) => `
      <article class="candidate-card">
        <div>
          <div class="card-head">
            <div>
              <strong>${escapeHtml(p.full_name)}</strong>
              <div class="muted">${escapeHtml(p.primary_role)} • ${escapeHtml(p.location)}</div>
            </div>
            <span class="badge ${p.quiz_passed ? "" : "neutral"}">
              ${p.quiz_passed ? `Verified (${p.quiz_score}/3)` : "Pending Check"}
            </span>
          </div>

          <p class="proof-snippet"><strong>Education:</strong> ${escapeHtml(p.education_summary)} (${escapeHtml(p.record_status)})</p>
          <p class="proof-snippet" style="margin-top:6px;"><strong>Work Proof:</strong> ${escapeHtml(p.work_proof_notes)}</p>
          ${
            p.work_proof_url
              ? `<p style="margin:6px 0 0;font-size:0.84rem;"><a href="${escapeHtml(p.work_proof_url)}" target="_blank" rel="noopener">View Submitted Work Sample ↗</a></p>`
              : ""
          }
        </div>

        <div class="skill-tags">
          ${(p.skills || []).map((s) => `<span class="skill-tag">${escapeHtml(s)}</span>`).join("")}
        </div>

        <div class="dossier-footer">
          <div class="muted" style="font-size:0.8rem;">
            Passport <strong>${escapeHtml(p.passport_code)}</strong> • Voucher Need: <strong>$${Number(p.voucher_estimate || 0).toFixed(0)}</strong>
          </div>
          <button class="btn primary full" data-request-id="${p.id}">
            Request Fellowship / Interview
          </button>
        </div>
      </article>
    `
    )
    .join("");

  grid.querySelectorAll("[data-request-id]").forEach((btn) => {
    btn.addEventListener("click", () => openFellowshipModal(btn.dataset.requestId));
  });
}

const modal = document.getElementById("fellowship-modal");
function openFellowshipModal(passportId) {
  const candidate = passports.find((p) => p.id === passportId);
  if (!candidate) return;
  document.getElementById("modal-passport-id").value = candidate.id;
  document.getElementById("modal-candidate-name").value = candidate.full_name;
  document.getElementById("modal-candidate-label").textContent =
    `Issuing offer to ${candidate.full_name} (${candidate.passport_code} — ${candidate.primary_role})`;
  modal.showModal();
}

document.getElementById("close-modal").addEventListener("click", () => modal.close());
document.getElementById("cancel-modal").addEventListener("click", () => modal.close());

document.getElementById("fellowship-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    passport_id: document.getElementById("modal-passport-id").value,
    candidate_name: document.getElementById("modal-candidate-name").value,
    company_name: document.getElementById("company_name").value.trim(),
    employer_email: document.getElementById("employer_email").value.trim(),
    role_offered: document.getElementById("role_offered").value.trim(),
    stipend_co_fund: Number(document.getElementById("stipend_co_fund").value || 0),
    message: document.getElementById("fellowship_message").value.trim(),
    status: "Issued to Candidate",
  };

  const savedReq = await createFellowshipRequest(payload);
  requests = [savedReq, ...requests];
  updateMetrics();
  renderRequestsTable();
  e.target.reset();
  modal.close();
});

function renderRequestsTable() {
  const tbody = document.getElementById("requests-tbody");
  if (requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="muted">No fellowship requests issued yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = requests
    .map(
      (r) => `
      <tr>
        <td><strong>${escapeHtml(r.candidate_name)}</strong></td>
        <td>${escapeHtml(r.company_name)}</td>
        <td>${escapeHtml(r.role_offered)}</td>
        <td>$${Number(r.stipend_co_fund || 0).toFixed(2)}/mo</td>
        <td><span class="badge">${escapeHtml(r.status)}</span></td>
      </tr>
    `
    )
    .join("");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Initial Boot
async function init() {
  calculateVoucherAmount();
  const status = await checkConnection();
  dbStatusEl.textContent = status.mode;

  [passports, requests] = await Promise.all([
    fetchPassports(),
    fetchFellowshipRequests(),
  ]);

  if (passports.length > 0) {
    activePassport = passports[0];
    renderActivePassport();
  }
  updateMetrics();
  renderDirectory();
  renderRequestsTable();
}

init(); 