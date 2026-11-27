import {
  pingServer,
  listPassports,
  insertPassport,
  patchPassport,
  listFellowshipRequests,
  insertFellowshipRequest,
} from "./backend.js";

let passports = [];
let fellowshipRequests = [];
let selectedPassportId = null;

// Elements
const statusChip = document.getElementById("server-status");
const alertBanner = document.getElementById("global-alert");
const tabBeneficiary = document.getElementById("tab-beneficiary");
const tabEmployer = document.getElementById("tab-employer");
const beneficiaryView = document.getElementById("beneficiary-view");
const employerView = document.getElementById("employer-view");
const activePassportSelect = document.getElementById("active-passport-select");

function showAlert(message, tone = "info") {
  if (!message) {
    alertBanner.classList.add("hidden");
    return;
  }
  alertBanner.textContent = message;
  alertBanner.className = `alert alert-${tone}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function isSafeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

async function computeSha256(input) {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function makePassportCode() {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `VP-${digits}`;
}

function getSelectedPassport() {
  return passports.find((item) => item.id === selectedPassportId) || null;
}

// Portal Navigation
function activatePortal(mode) {
  const isBeneficiary = mode === "beneficiary";
  tabBeneficiary.classList.toggle("active", isBeneficiary);
  tabEmployer.classList.toggle("active", !isBeneficiary);
  beneficiaryView.classList.toggle("hidden", !isBeneficiary);
  employerView.classList.toggle("hidden", isBeneficiary);

  if (!isBeneficiary) {
    renderEmployerDirectory();
    renderFellowshipsTable();
  }
}

tabBeneficiary.addEventListener("click", () => activatePortal("beneficiary"));
tabEmployer.addEventListener("click", () => activatePortal("employer"));

// Telemetry Stats
function refreshStats() {
  const verifiedTotal = passports.filter((p) => Boolean(p.quiz_passed)).length;
  const voucherSum = passports.reduce(
    (sum, p) => sum + Number(p.voucher_estimate || 0),
    0
  );

  document.getElementById("stat-passports").textContent = String(passports.length);
  document.getElementById("stat-verified").textContent = String(verifiedTotal);
  document.getElementById("stat-vouchers").textContent = `$${voucherSum.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
  document.getElementById("stat-fellowships").textContent = String(fellowshipRequests.length);
}

// Passport Selector & Card
function syncPassportSelector() {
  activePassportSelect.innerHTML = `<option value="">Start a new passport record</option>`;
  for (const p of passports) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.passport_code} — ${p.full_name} (${p.target_role})`;
    if (p.id === selectedPassportId) opt.selected = true;
    activePassportSelect.appendChild(opt);
  }
}

activePassportSelect.addEventListener("change", () => {
  selectedPassportId = activePassportSelect.value || null;
  renderActivePassportCard();
  syncQuizPill();
});

function syncQuizPill() {
  const current = getSelectedPassport();
  const pill = document.getElementById("quiz-status-pill");
  if (current && current.quiz_passed) {
    pill.textContent = `Verified (${current.quiz_score}/3)`;
    pill.className = "pill";
  } else if (current && typeof current.quiz_score === "number") {
    pill.textContent = `Score ${current.quiz_score}/3`;
    pill.className = "pill pill-muted";
  } else {
    pill.textContent = "Not Taken";
    pill.className = "pill pill-muted";
  }
}

function renderActivePassportCard() {
  const current = getSelectedPassport();
  const card = document.getElementById("passport-card");
  if (!current) {
    card.classList.add("hidden");
    return;
  }

  card.classList.remove("hidden");
  document.getElementById("card-name").textContent = current.full_name;
  document.getElementById("card-role-loc").textContent =
    `${current.target_role} • ${current.current_location} (from ${current.origin_country}) • ${current.years_experience} yrs exp`;
  document.getElementById("card-code").textContent = current.passport_code;
  document.getElementById("card-doc-status").textContent = current.record_status;
  document.getElementById("card-auth-status").textContent = current.work_authorization_status;
  document.getElementById("card-quiz-status").textContent = current.quiz_passed
    ? `Verified (${current.quiz_score}/3)`
    : typeof current.quiz_score === "number"
      ? `Needs Retake (${current.quiz_score}/3)`
      : "Pending Check";
  document.getElementById("card-voucher-status").textContent =
    `$${Number(current.voucher_estimate || 0).toFixed(2)} (${current.voucher_status})`;
  document.getElementById("card-hash").textContent = current.verification_hash;
}

// Create New Passport on Server
document.getElementById("passport-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitBtn = document.getElementById("save-passport-btn");
  submitBtn.disabled = true;

  try {
    const full_name = document.getElementById("full_name").value.trim();
    const origin_country = document.getElementById("origin_country").value.trim();
    const current_location = document.getElementById("current_location").value.trim();
    const target_role = document.getElementById("target_role").value.trim();
    const years_experience = Number(document.getElementById("years_experience").value || 0);
    const education_summary = document.getElementById("education_summary").value.trim();
    const record_status = document.getElementById("record_status").value;
    const work_authorization_status = document.getElementById("work_authorization_status").value;
    const skills = document
      .getElementById("skills")
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const work_proof_url = document.getElementById("work_proof_url").value.trim();
    const work_proof_notes = document.getElementById("work_proof_notes").value.trim();

    const passport_code = makePassportCode();
    const verification_hash = await computeSha256(
      `${passport_code}|${full_name}|${origin_country}|${target_role}|${skills.join("|")}|${Date.now()}`
    );

    const created = await insertPassport({
      passport_code,
      full_name,
      origin_country,
      current_location,
      target_role,
      years_experience,
      education_summary,
      record_status,
      work_authorization_status,
      skills,
      work_proof_url: work_proof_url || null,
      work_proof_notes,
      verification_hash,
      quiz_score: null,
      quiz_passed: false,
      voucher_estimate: 0,
      voucher_status: "Not Calculated",
    });

    passports = [created, ...passports.filter((item) => item.id !== created.id)];
    selectedPassportId = created.id;
    syncPassportSelector();
    renderActivePassportCard();
    syncQuizPill();
    refreshStats();
    showAlert(`Passport ${created.passport_code} for ${created.full_name} saved to server.`, "info");
    event.target.reset();
  } catch (err) {
    showAlert(err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// Competency Check Submission
document.getElementById("quiz-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const feedback = document.getElementById("quiz-feedback");
  const current = getSelectedPassport();

  if (!current) {
    feedback.textContent = "Select or create a Digital Skills Passport first so the score links to a record.";
    feedback.classList.remove("hidden");
    return;
  }

  const submitBtn = document.getElementById("submit-quiz-btn");
  submitBtn.disabled = true;

  try {
    const fd = new FormData(event.target);
    const score =
      Number(fd.get("q1") || 0) +
      Number(fd.get("q2") || 0) +
      Number(fd.get("q3") || 0);
    const passed = score >= 2;

    const updated = await patchPassport(current.id, {
      quiz_score: score,
      quiz_passed: passed,
    });

    passports = passports.map((item) => (item.id === updated.id ? updated : item));
    renderActivePassportCard();
    syncQuizPill();
    refreshStats();

    feedback.textContent = passed
      ? `Competency check passed (${score}/3). Verified status persisted on ${updated.passport_code}.`
      : `Score recorded (${score}/3). Two or more correct answers earn Verified status.`;
    feedback.classList.remove("hidden");
  } catch (err) {
    showAlert(err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// Fee-Waiver & Bridging Voucher Estimator
function computeVoucherTotal() {
  const fee = Math.max(0, Number(document.getElementById("exam_fee").value || 0));
  const months = Math.max(0, Number(document.getElementById("bridging_months").value || 0));
  const monthlyBridging = months * 65;
  const stipendAddon = document.getElementById("connectivity_stipend").checked ? months * 45 : 0;
  const total = fee + monthlyBridging + stipendAddon;
  document.getElementById("voucher-total").textContent = `$${total.toFixed(2)}`;
  return total;
}

["exam_fee", "bridging_months", "connectivity_stipend"].forEach((id) => {
  document.getElementById(id).addEventListener("input", computeVoucherTotal);
  document.getElementById(id).addEventListener("change", computeVoucherTotal);
});

document.getElementById("voucher-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const feedback = document.getElementById("voucher-feedback");
  const current = getSelectedPassport();

  if (!current) {
    feedback.textContent = "Select or create a Digital Skills Passport first to attach a voucher estimate.";
    feedback.classList.remove("hidden");
    return;
  }

  const submitBtn = document.getElementById("save-voucher-btn");
  submitBtn.disabled = true;

  try {
    const amount = computeVoucherTotal();
    const updated = await patchPassport(current.id, {
      voucher_estimate: amount,
      voucher_status: "Calculated — Ready for Partner Review",
    });

    passports = passports.map((item) => (item.id === updated.id ? updated : item));
    renderActivePassportCard();
    refreshStats();

    feedback.textContent = `Voucher estimate ($${amount.toFixed(2)}) saved to passport ${updated.passport_code}.`;
    feedback.classList.remove("hidden");
  } catch (err) {
    showAlert(err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// Employer Directory & Fellowship Requests
const candidateSearch = document.getElementById("candidate-search");
const onlyVerifiedFilter = document.getElementById("only-verified-filter");
candidateSearch.addEventListener("input", renderEmployerDirectory);
onlyVerifiedFilter.addEventListener("change", renderEmployerDirectory);

function renderEmployerDirectory() {
  const grid = document.getElementById("directory-grid");
  const query = candidateSearch.value.trim().toLowerCase();
  const verifiedOnly = onlyVerifiedFilter.checked;

  const matches = passports.filter((p) => {
    if (verifiedOnly && !p.quiz_passed) return false;
    if (!query) return true;
    const haystack = [
      p.full_name,
      p.origin_country,
      p.current_location,
      p.target_role,
      p.education_summary,
      ...(p.skills || []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  if (matches.length === 0) {
    grid.innerHTML = `<div class="card"><p class="card-desc">No candidate passports match your current search or filter.</p></div>`;
    return;
  }

  grid.innerHTML = matches
    .map((p) => {
      const safeLink = p.work_proof_url && isSafeUrl(p.work_proof_url) ? p.work_proof_url : "";
      return `
        <article class="candidate-card">
          <div>
            <div class="card-header">
              <div>
                <strong>${escapeHtml(p.full_name)}</strong>
                <div class="candidate-meta">${escapeHtml(p.target_role)} • ${escapeHtml(p.current_location)}</div>
              </div>
              <span class="pill ${p.quiz_passed ? "" : "pill-muted"}">
                ${p.quiz_passed ? `Verified (${p.quiz_score}/3)` : "Unverified"}
              </span>
            </div>

            <p class="candidate-line"><strong>Origin &amp; Readiness:</strong> From ${escapeHtml(p.origin_country)} • ${escapeHtml(p.work_authorization_status)}</p>
            <p class="candidate-line"><strong>Education / Records:</strong> ${escapeHtml(p.education_summary)} (${escapeHtml(p.record_status)})</p>
            <p class="candidate-line"><strong>Work Proof:</strong> ${escapeHtml(p.work_proof_notes)}</p>
            ${
              safeLink
                ? `<a class="proof-link" href="${escapeHtml(safeLink)}" target="_blank" rel="noopener noreferrer">Open Work Proof Link ↗</a>`
                : ""
            }
          </div>

          <div class="skill-list">
            ${(p.skills || []).map((skill) => `<span class="skill-chip">${escapeHtml(skill)}</span>`).join("")}
          </div>

          <div class="candidate-foot">
            <div class="foot-meta">
              Passport <strong>${escapeHtml(p.passport_code)}</strong> • Voucher Need: <strong>$${Number(p.voucher_estimate || 0).toFixed(0)}</strong>
            </div>
            <button type="button" class="btn btn-primary full-width" data-fellowship-target="${escapeHtml(p.id)}">
              Request Fellowship
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  grid.querySelectorAll("[data-fellowship-target]").forEach((btn) => {
    btn.addEventListener("click", () => openFellowshipDialog(btn.dataset.fellowshipTarget));
  });
}

const fellowshipDialog = document.getElementById("fellowship-dialog");

function openFellowshipDialog(passportId) {
  const candidate = passports.find((p) => p.id === passportId);
  if (!candidate) return;

  document.getElementById("dialog-passport-id").value = candidate.id;
  document.getElementById("dialog-candidate-name").value = candidate.full_name;
  document.getElementById("dialog-passport-code").value = candidate.passport_code;
  document.getElementById("dialog-candidate-summary").textContent =
    `Candidate: ${candidate.full_name} (${candidate.passport_code}) — Target role: ${candidate.target_role}`;

  if (typeof fellowshipDialog.showModal === "function") {
    fellowshipDialog.showModal();
  }
}

document.getElementById("close-dialog-btn").addEventListener("click", () => fellowshipDialog.close());
document.getElementById("cancel-dialog-btn").addEventListener("click", () => fellowshipDialog.close());

document.getElementById("fellowship-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitBtn = document.getElementById("submit-fellowship-btn");
  submitBtn.disabled = true;

  try {
    const payload = {
      passport_id: document.getElementById("dialog-passport-id").value,
      candidate_name: document.getElementById("dialog-candidate-name").value,
      passport_code: document.getElementById("dialog-passport-code").value,
      organization_name: document.getElementById("organization_name").value.trim(),
      employer_email: document.getElementById("employer_email").value.trim(),
      role_offered: document.getElementById("role_offered").value.trim(),
      monthly_stipend_cofund: Number(document.getElementById("monthly_stipend_cofund").value || 0),
      onboarding_notes: document.getElementById("onboarding_notes").value.trim() || null,
      status: "Fellowship Requested",
    };

    const created = await insertFellowshipRequest(payload);
    fellowshipRequests = [created, ...fellowshipRequests];
    refreshStats();
    renderFellowshipsTable();
    event.target.reset();
    fellowshipDialog.close();
    showAlert(`Fellowship request for ${created.candidate_name} saved to server.`, "info");
  } catch (err) {
    showAlert(err.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

function renderFellowshipsTable() {
  const tbody = document.getElementById("fellowships-tbody");
  if (fellowshipRequests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">No fellowship requests recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = fellowshipRequests
    .map(
      (req) => `
      <tr>
        <td><strong>${escapeHtml(req.candidate_name)}</strong></td>
        <td><code>${escapeHtml(req.passport_code)}</code></td>
        <td>${escapeHtml(req.organization_name)}</td>
        <td>${escapeHtml(req.role_offered)}</td>
        <td>$${Number(req.monthly_stipend_cofund || 0).toFixed(2)}/mo</td>
        <td><span class="pill">${escapeHtml(req.status)}</span></td>
      </tr>
    `
    )
    .join("");
}

// Boot From Server
async function boot() {
  computeVoucherTotal();
  const ping = await pingServer();

  if (ping.online) {
    statusChip.textContent = ping.label;
    statusChip.className = "status-chip status-online";
    showAlert("");
  } else {
    statusChip.textContent = ping.label;
    statusChip.className = "status-chip status-offline";
    showAlert(ping.detail, "warn");
  }

  try {
    [passports, fellowshipRequests] = await Promise.all([
      listPassports(),
      listFellowshipRequests(),
    ]);
    if (passports.length > 0 && !selectedPassportId) {
      selectedPassportId = passports[0].id;
    }
  } catch (err) {
    showAlert(`Could not load server records: ${err.message}`, "error");
  }

  syncPassportSelector();
  renderActivePassportCard();
  syncQuizPill();
  refreshStats();
  renderEmployerDirectory();
  renderFellowshipsTable();
}

boot(); 