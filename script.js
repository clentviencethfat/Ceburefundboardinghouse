
const STORAGE_KEY = "boardingHouseRefundRecords";

function getRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function money(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP"
  });
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function totalDeductions(record) {
  return (record.deductions || []).reduce(
    (total, item) => total + Number(item.amount || 0), 0
  );
}

function refundAmount(record) {
  return Math.max(0, Number(record.deposit || 0) - totalDeductions(record));
}

function formatDate(date) {
  if (!date) return "—";
  const parts = date.split("-");
  return parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : date;
}

function findRecord(id) {
  return getRecords().find(record => record.id === id);
}

function editLink(record) {
  return `<a class="btn" href="editrefund.html?id=${encodeURIComponent(record.id)}">Edit</a>`;
}

function actionButtons(record) {
  return `<div class="record-actions">
    ${editLink(record)}
    <button type="button" onclick="toggleStatus('${record.id}')">
      ${record.status === "Completed" ? "Mark Pending" : "Mark Completed"}
    </button>
    <button type="button" class="delete-one"
      onclick="deleteRecord('${record.id}')">Delete</button>
  </div>`;
}

function toggleStatus(id) {
  const records = getRecords();
  const record = records.find(item => item.id === id);
  if (!record) return;

  record.status = record.status === "Completed" ? "Pending" : "Completed";
  saveRecords(records);
  refreshPages();
}

function deleteRecord(id) {
  if (!confirm("Delete this refund record permanently?")) return;

  saveRecords(getRecords().filter(record => record.id !== id));
  refreshPages();
}

function refreshPages() {
  renderHome();
  renderDashboard();
  renderPending();
  renderHistory();
  renderAllRecords();
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderHome() {
  const records = getRecords();
  const pending = records.filter(r => r.status === "Pending");
  const completed = records.filter(r => r.status === "Completed");

  setText("homeTotal", records.length);
  setText("homePending", pending.length);
  setText("homeCompleted", completed.length);
  setText("homeAmount", money(
    records.reduce((sum, r) => sum + refundAmount(r), 0)
  ));
}

function renderDashboard() {
  const records = getRecords();
  const pending = records.filter(r => r.status === "Pending");
  const completed = records.filter(r => r.status === "Completed");

  setText("dashTotal", records.length);
  setText("dashPending", pending.length);
  setText("dashCompleted", completed.length);
  setText("dashAmount", money(
    records.reduce((sum, r) => sum + refundAmount(r), 0)
  ));

  const body = document.getElementById("recentRecords");
  if (!body) return;

  const recent = [...records].reverse().slice(0, 5);
  body.innerHTML = recent.length ? recent.map(r => `
    <tr>
      <td>${safe(r.tenantName)}</td>
      <td>${safe(r.roomNumber)}</td>
      <td>${formatDate(r.checkoutDate)}</td>
      <td>${money(refundAmount(r))}</td>
      <td>${safe(r.status)}</td>
    </tr>
  `).join("") : `<tr><td colspan="5">No records yet.</td></tr>`;
}

function searchable(record, query) {
  const text = [
    record.tenantName, record.boardingHouse,
    record.roomNumber, record.checkoutDate
  ].join(" ").toLowerCase();

  return text.includes(query.toLowerCase());
}

function renderPending() {
  const body = document.getElementById("pendingRecords");
  if (!body) return;

  const query = document.getElementById("pendingSearch")?.value || "";
  const allPending = getRecords().filter(r => r.status === "Pending");
  const records = allPending.filter(r => searchable(r, query));

  setText("pendingCount", allPending.length);
  setText("pendingAmount", money(
    allPending.reduce((sum, r) => sum + refundAmount(r), 0)
  ));

  body.innerHTML = records.length ? records.map(r => `
    <tr>
      <td>${safe(r.tenantName)}</td>
      <td>${safe(r.boardingHouse)}</td>
      <td>${safe(r.roomNumber)}</td>
      <td>${formatDate(r.checkoutDate)}</td>
      <td>${money(refundAmount(r))}</td>
      <td>
        <div class="record-actions">
          ${editLink(r)}
          <button type="button" onclick="toggleStatus('${r.id}')">
            Mark Completed
          </button>
        </div>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="6">No pending refunds found.</td></tr>`;
}

function renderHistory() {
  const body = document.getElementById("historyRecords");
  if (!body) return;

  const query = document.getElementById("historySearch")?.value || "";
  const records = getRecords().filter(
    r => r.status === "Completed" && searchable(r, query)
  );

  body.innerHTML = records.length ? [...records].reverse().map(r => `
    <tr>
      <td>${safe(r.tenantName)}</td>
      <td>${safe(r.boardingHouse)}</td>
      <td>${safe(r.roomNumber)}</td>
      <td>${formatDate(r.checkoutDate)}</td>
      <td>${money(refundAmount(r))}</td>
      <td>${actionButtons(r)}</td>
    </tr>
  `).join("") : `<tr><td colspan="6">No completed refunds found.</td></tr>`;
}

function renderAllRecords() {
  const body = document.getElementById("allRecords");
  if (!body) return;

  const query = document.getElementById("allSearch")?.value || "";
  const status = document.getElementById("statusFilter")?.value || "All";
  const sort = document.getElementById("sortFilter")?.value || "newest";

  let records = getRecords().filter(r =>
    searchable(r, query) && (status === "All" || r.status === status)
  );

  records.sort((a, b) => {
    if (sort === "highest") return refundAmount(b) - refundAmount(a);
    if (sort === "lowest") return refundAmount(a) - refundAmount(b);
    const dateA = a.checkoutDate || "";
    const dateB = b.checkoutDate || "";
    return sort === "oldest"
      ? dateA.localeCompare(dateB)
      : dateB.localeCompare(dateA);
  });

  body.innerHTML = records.length ? records.map(r => `
    <tr>
      <td>${safe(r.tenantName)}</td>
      <td>${safe(r.boardingHouse)}</td>
      <td>${safe(r.roomNumber)}</td>
      <td>${formatDate(r.checkoutDate)}</td>
      <td>${money(r.deposit)}</td>
      <td>${money(totalDeductions(r))}</td>
      <td>${money(refundAmount(r))}</td>
      <td>${safe(r.status)}</td>
      <td>${actionButtons(r)}</td>
    </tr>
  `).join("") : `<tr><td colspan="9">No records found.</td></tr>`;

  setText("recordCount", `Showing ${records.length} record(s).`);
}

function setupRefundForm() {
  const form = document.getElementById("refundForm");
  if (!form) return;

  const rows = document.getElementById("deductionRows");
  const deposit = document.getElementById("deposit");
  const recordId = document.getElementById("recordId");

  function addDeduction(description = "", amount = 0) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input class="deduction-name" placeholder="e.g. Electricity bill"
        value="${safe(description)}"></td>
      <td><input class="deduction-amount" type="number" min="0"
        step="0.01" value="${Number(amount) || 0}"></td>
      <td><button type="button" class="remove">Remove</button></td>
    `;
    rows.appendChild(row);
    updateTotals();
  }

  function collectDeductions() {
    return [...rows.querySelectorAll("tr")].map(row => ({
      description: row.querySelector(".deduction-name").value.trim(),
      amount: Math.max(0, Number(
        row.querySelector(".deduction-amount").value
      ) || 0)
    })).filter(item => item.description || item.amount > 0);
  }

  function updateTotals() {
    const totalDeposit = Math.max(0, Number(deposit.value) || 0);
    const deductions = collectDeductions().reduce(
      (sum, item) => sum + item.amount, 0
    );

    setText("showDeposit", money(totalDeposit));
    setText("showDeductions", money(deductions));
    setText("finalRefund", money(Math.max(0, totalDeposit - deductions)));
  }

  function clearForm() {
    form.reset();
    recordId.value = "";
    rows.innerHTML = "";
    addDeduction();
    setText("message", "");
    updateTotals();
  }

  function loadRecord(record) {
    recordId.value = record.id;
    document.getElementById("tenantName").value = record.tenantName;
    document.getElementById("boardingHouse").value = record.boardingHouse;
    document.getElementById("roomNumber").value = record.roomNumber;
    document.getElementById("roomType").value = record.roomType || "Good for 2";
    document.getElementById("checkoutDate").value = record.checkoutDate || "";
    document.getElementById("checkoutTime").value = record.checkoutTime || "";
    document.getElementById("refundStatus").value = record.status || "Pending";
    document.getElementById("notes").value = record.notes || "";
    deposit.value = record.deposit || 0;
    rows.innerHTML = "";
    (record.deductions || []).forEach(d => addDeduction(d.description, d.amount));
    if (!record.deductions?.length) addDeduction();
    updateTotals();
  }

  document.getElementById("addDeduction").addEventListener("click", () => {
    addDeduction();
  });

  rows.addEventListener("input", updateTotals);
  deposit.addEventListener("input", updateTotals);

  rows.addEventListener("click", event => {
    if (!event.target.classList.contains("remove")) return;
    event.target.closest("tr").remove();
    updateTotals();
  });

  document.getElementById("clearForm").addEventListener("click", clearForm);

  form.addEventListener("submit", event => {
    event.preventDefault();

    const records = getRecords();
    const old = records.find(r => r.id === recordId.value);
    const record = {
      id: recordId.value || (
        Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      ),
      tenantName: document.getElementById("tenantName").value.trim(),
      boardingHouse: document.getElementById("boardingHouse").value.trim(),
      roomNumber: document.getElementById("roomNumber").value.trim(),
      roomType: document.getElementById("roomType").value,
      checkoutDate: document.getElementById("checkoutDate").value,
      checkoutTime: document.getElementById("checkoutTime").value,
      deposit: Math.max(0, Number(deposit.value) || 0),
      deductions: collectDeductions(),
      status: document.getElementById("refundStatus").value,
      notes: document.getElementById("notes").value.trim(),
      createdAt: old?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (totalDeductions(record) > record.deposit) {
      if (!confirm("Deductions exceed the deposit. The refund will be ₱0.00. Save anyway?")) {
        return;
      }
    }

    const index = records.findIndex(r => r.id === record.id);
    if (index >= 0) records[index] = record;
    else records.push(record);

    saveRecords(records);
    recordId.value = record.id;
    setText("message", "Refund record saved successfully.");
    refreshPages();
  });

  document.getElementById("printCurrent").addEventListener("click", () => {
    const name = document.getElementById("tenantName").value.trim();
    if (!name) {
      alert("Enter tenant information before printing.");
      return;
    }

    const record = {
      tenantName: name,
      boardingHouse: document.getElementById("boardingHouse").value,
      roomNumber: document.getElementById("roomNumber").value,
      roomType: document.getElementById("roomType").value,
      checkoutDate: document.getElementById("checkoutDate").value,
      checkoutTime: document.getElementById("checkoutTime").value,
      deposit: Number(deposit.value) || 0,
      deductions: collectDeductions(),
      status: document.getElementById("refundStatus").value,
      notes: document.getElementById("notes").value
    };

    printReceipt(record);
  });

  const id = new URLSearchParams(location.search).get("id");
  if (id) {
    const record = findRecord(id);
    if (record) loadRecord(record);
    else addDeduction();
  } else {
    addDeduction();
  }

  updateTotals();
}

function printReceipt(record) {
  const target = document.getElementById("printReceipt");
  if (!target) return;

  target.innerHTML = `
    <div class="receipt-head">
      <div>
        <small>BOARDING HOUSE ADMINISTRATION</small>
        <h1>Refund Receipt</h1>
      </div>
      <b>${safe(record.status)}</b>
    </div>

    <div class="receipt-info">
      <div><span>Tenant Name</span><strong>${safe(record.tenantName)}</strong></div>
      <div><span>Boarding House</span><strong>${safe(record.boardingHouse)}</strong></div>
      <div><span>Room Number</span><strong>${safe(record.roomNumber)}</strong></div>
      <div><span>Room Type</span><strong>${safe(record.roomType)}</strong></div>
      <div><span>Checkout Date</span><strong>${formatDate(record.checkoutDate)}</strong></div>
      <div><span>Checkout Time</span><strong>${safe(record.checkoutTime || "—")}</strong></div>
    </div>

    <h2>Refund Breakdown</h2>
    <table class="pdf-table">
      <thead><tr><th>Description</th><th>Amount</th></tr></thead>
      <tbody>
        <tr><td>Security Deposit</td><td>${money(record.deposit)}</td></tr>
        ${(record.deductions || []).map(d => `
          <tr><td>${safe(d.description || "Deduction")}</td>
          <td>${money(d.amount)}</td></tr>
        `).join("")}
      </tbody>
    </table>

    <div class="totals">
      <div><span>Total Deposit</span><b>${money(record.deposit)}</b></div>
      <div><span>Total Deductions</span><b>${money(totalDeductions(record))}</b></div>
      <div class="grand"><span>FINAL REFUND</span><b>${money(refundAmount(record))}</b></div>
    </div>

    <div class="pdf-notes"><b>Notes:</b> ${safe(record.notes || "None")}</div>

    <div class="signatures">
      <div>________________________<br>Tenant's Signature</div>
      <div>________________________<br>Authorized Personnel</div>
    </div>

    <div class="receipt-foot">Please keep this receipt for your records.</div>
  `;

  window.print();
}

document.addEventListener("DOMContentLoaded", () => {
  const date = document.getElementById("todayDate");
  if (date) {
    date.textContent = new Date().toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric"
    });
  }

  ["pendingSearch", "historySearch", "allSearch"].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener("input", refreshPages);
  });

  ["statusFilter", "sortFilter"].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener("change", renderAllRecords);
  });

  setupRefundForm();
  refreshPages();
});
