"use strict";
const emptyState = () => ({
  project: { name: "", budget: 0 },
  services: [],
  macros: [],
  tasks: [],
  pls: [],
  purchases: [],
  costs: [],
  abc: [],
  purchasePlan: {},
  budgetOverrides: {},
  addedServices: [],
  addedTasks: [],
  taskScheduleOverrides: {},
});
let state = emptyState(),
  fullSeed = emptyState(),
  currentMode = "",
  currentCode = "",
  canWrite = false;
let requestNumber = 0,
  saveQueue = Promise.resolve(),
  rendering = false,
  pendingSave = false,
  lastConfirmed = null,
  batchDepth = 0;
const requests = new Map();
const clone = (value) => JSON.parse(JSON.stringify(value));
const brl = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const pct = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "percent",
    maximumFractionDigits: 1,
  });
const date = (value) =>
  value ? new Date(value + "T12:00:00").toLocaleDateString("pt-BR") : "—";
const message = (text) => {
  document.getElementById("runtimeMessage").textContent = text || "";
};
function setSync(text) {
  parent.postMessage({ type: "casa-status", message: text }, location.origin);
}
function renderHome() {
  document.getElementById("home").innerHTML = "";
}
function renderSchedule() {}
function renderCosts() {}
function renderBudget() {}
function renderSettings() {}
function renderPLS() {}
function renderAll() {
  if (window.casaShowMode && !rendering) window.casaShowMode(false);
}
function totals() {
  const launched = state.costs.reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0,
    ),
    paid = state.costs.reduce((sum, row) => sum + Number(row.paid || 0), 0);
  return { launched, paid, payable: launched - paid };
}
function openModal(html) {
  document.getElementById("sheet").innerHTML = html;
  document.getElementById("modal").classList.add("open");
}
function closeModal() {
  document.getElementById("modal").classList.remove("open");
}
function download(blob, name) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function costForm() {}
function taskForm(id) {
  const task = state.tasks.find((row) => String(row.id) === String(id));
  if (!task) return;
  openModal(
    '<h2 id="casaTaskName"></h2><label>Percentual executado</label><input id="taskProgress" type="range" min="0" max="100"><label>Observações</label><textarea id="taskNotes"></textarea><div class="actions"><button class="btn alt" onclick="closeModal()">Cancelar</button><button class="btn" id="casaTaskSave">Salvar</button></div>',
  );
  document.getElementById("casaTaskName").textContent = task.name;
  document.getElementById("taskProgress").value =
    Number(task.progress || 0) * 100;
  document.getElementById("taskNotes").value = task.notes || "";
  document.getElementById("casaTaskSave").onclick = () => window.updateTask(id);
}
function updateTask(id) {
  const task = state.tasks.find((row) => String(row.id) === String(id));
  if (!task) return;
  task.progress = Number(document.getElementById("taskProgress").value) / 100;
  task.notes = document.getElementById("taskNotes").value;
  closeModal();
  return save();
}
function recalculate() {
  const fresh = clone(fullSeed);
  for (const key of [
    "purchasePlan",
    "budgetOverrides",
    "addedServices",
    "addedTasks",
    "taskScheduleOverrides",
    "budgetImportMeta",
    "pls",
    "plsSimulations",
    "plsSimulationDraft",
    "__archived",
  ])
    fresh[key] = clone(
      state[key] ?? (Array.isArray(fresh[key]) ? [] : (fresh[key] ?? null)),
    );
  const existing = new Set(
    fresh.services.map((service) => String(service.code)),
  );
  for (const service of fresh.addedServices || [])
    if (!existing.has(String(service.code))) {
      fresh.services.push(clone(service));
      existing.add(String(service.code));
    }
  mergeAddedTasks(fresh, fresh.addedTasks);
  applyTaskScheduleOverrides(fresh, fresh.taskScheduleOverrides);
  const all = clone(fresh.services);
  applyBudgetOverrides(fresh, fresh.budgetOverrides);
  fresh.__archived = all
    .filter((service) => fresh.budgetOverrides?.[service.code]?.qty === 0)
    .map((service) => ({
      ...service,
      ...fresh.budgetOverrides[service.code],
      qty: service.qty,
      removed: true,
    }));
  reconcilePurchases(fresh);
  // Preserve SINAPI analytics for added compositions as material purchase inputs.
  for (const service of fresh.services.filter(
    (row) => Array.isArray(row.sinapiItems) && row.sinapiItems.length,
  )) {
    const rows = service.sinapiItems.filter((item) =>
      String(item.resourceType || item.itemType || "")
        .toUpperCase()
        .includes("MATERIAL"),
    );
    if (!rows.length) continue;
    fresh.purchases = fresh.purchases.filter(
      (row) => String(row.serviceCode) !== String(service.code),
    );
    for (const item of rows) {
      const quantity =
        Number(item.coefficient || item.quantity || 0) *
        Number(service.qty || 0);
      fresh.purchases.push({
        serviceCode: service.code,
        taskId: service.taskId,
        name: item.description || item.name || String(item.code),
        unit: item.unit || "",
        qty: quantity,
        unitPrice: Number(item.unitPrice || 0) / 100,
        estimatedCost:
          (Number(item.totalPrice || 0) / 100) * Number(service.qty || 0),
        inputCode: String(item.code || ""),
        source: "SINAPI analítico",
      });
    }
  }
  state = fresh;
  return fresh;
}
function save() {
  if (!canWrite) return Promise.reject(Error("Acesso somente de leitura."));
  if (batchDepth) {
    recalculate();
    return Promise.resolve(true);
  }
  pendingSave = true;
  const run = async () => {
    const id = ++requestNumber;
    message("Salvando…");
    try {
      const payload = clone(recalculate());
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          requests.delete(id);
          reject(
            Error(
              "O banco não confirmou o salvamento. Reabra a ferramenta para conferir os dados.",
            ),
          );
        }, 130000);
        requests.set(id, { resolve, reject, timeout });
        parent.postMessage(
          { type: "casa-save", id, state: payload },
          location.origin,
        );
      });
      parent.postMessage({ type: "casa-dirty", dirty: false }, location.origin);
      message("Alteração confirmada no banco da obra.");
      lastConfirmed = clone(state);
      renderAll();
    } catch (error) {
      if (lastConfirmed) state = clone(lastConfirmed);
      renderAll();
      message(error.message);
      alert(error.message);
      throw error;
    } finally {
      pendingSave = false;
    }
  };
  const result = saveQueue.then(run);
  saveQueue = result.catch(() => {});
  return result;
}
addEventListener("message", (event) => {
  if (
    event.origin !== location.origin ||
    event.source !== parent ||
    event.data?.type !== "casa-saved"
  )
    return;
  const item = requests.get(event.data.id);
  if (!item) return;
  clearTimeout(item.timeout);
  requests.delete(event.data.id);
  if (event.data.error) item.reject(Error(event.data.error));
  else item.resolve();
});
document.addEventListener("input", () =>
  parent.postMessage({ type: "casa-dirty", dirty: true }, location.origin),
);
document.addEventListener("change", () =>
  parent.postMessage({ type: "casa-dirty", dirty: true }, location.origin),
);
document.addEventListener(
  "click",
  (event) => {
    if (pendingSave) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },
  true,
);
document.getElementById("modal").addEventListener("click", (event) => {
  if (event.target.id === "modal") closeModal();
});
