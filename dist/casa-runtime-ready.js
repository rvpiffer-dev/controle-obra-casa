"use strict";
const budgetComponent = window.renderBudget;
const scheduleComponent = window.renderSchedule;
const homeComponent = window.renderHome;
const settingsComponent = window.renderSettings;
const addServiceComponent = window.saveAddServiceV35;
window.saveAddServiceV35 = async function () {
  if (pendingSave) return;
  const previous = JSON.stringify(state);
  batchDepth++;
  pendingSave = true;
  try {
    await addServiceComponent();
  } catch (error) {
    if (lastConfirmed) state = clone(lastConfirmed);
    throw error;
  } finally {
    batchDepth--;
    pendingSave = false;
  }
  if (JSON.stringify(state) !== previous) return save();
};
const showSection = (id) => {
  for (const section of document.querySelectorAll(".page"))
    section.classList.toggle("active", section.id === id);
};
window.casaShowMode = function (initial = false) {
  if (!currentMode || rendering) return;
  rendering = true;
  try {
    switch (currentMode) {
      case "abc":
        showSection("budget");
        budgetComponent("abc");
        break;
      case "buy":
        showSection("budget");
        budgetComponent("buy", window.__budgetMonth);
        decoratePurchases();
        break;
      case "pls":
        showSection("pls");
        window.renderPLS();
        break;
      case "ff":
        showSection("schedule");
        window.__scheduleView = "ff";
        scheduleComponent();
        break;
      case "cash":
      case "alerts":
        showSection("home");
        window.__managementTab = currentMode;
        homeComponent();
        break;
      case "excel":
        showSection("settings");
        settingsComponent();
        document
          .querySelectorAll("#settings .section-title")
          .forEach((title) => {
            if (title.textContent.includes("Conta")) {
              title.nextElementSibling?.remove();
              title.remove();
            }
          });
        break;
      default:
        showSection("budget");
        document.getElementById("budget").innerHTML =
          '<div class="casa-runtime-actions"><button class="btn alt" id="casaOpenTool">Abrir ferramenta</button></div>';
        document.getElementById("casaOpenTool").onclick = () => openTool();
        if (currentMode === "replan") {
          const select = document.createElement("select");
          select.id = "casaTaskSelect";
          for (const task of state.tasks) {
            const option = document.createElement("option");
            option.value = task.id;
            option.textContent = task.name;
            select.appendChild(option);
          }
          const label = document.createElement("label");
          label.htmlFor = select.id;
          label.textContent = "Datas e duração de uma atividade";
          const button = document.createElement("button");
          button.className = "btn alt";
          button.textContent = "Editar datas da atividade";
          button.onclick = () => taskForm(Number(select.value));
          document.getElementById("budget").append(label, select, button);
        }
        if (initial) openTool();
    }
  } finally {
    rendering = false;
  }
};
function openTool() {
  if (currentMode === "sinapi") openAddServiceV35();
  if (currentMode === "removed") openRemovedServicesV35();
  if (currentMode === "replan") openReplanScheduleV46();
  if (currentMode === "composition") openBudgetEditV28(currentCode);
}
function decoratePurchases() {
  const root = document.getElementById("budget");
  const toolbar = document.createElement("div");
  toolbar.className = "casa-runtime-actions";
  const exportButton = document.createElement("button");
  exportButton.className = "btn alt";
  exportButton.textContent = "Exportar compras do mês";
  exportButton.onclick = () => exportPurchasesCSV(window.__budgetMonth);
  toolbar.appendChild(exportButton);
  root.prepend(toolbar);
  for (const row of root.querySelectorAll(".buy-v25-row")) {
    const label = row.querySelector("h3")?.textContent;
    const item = state.purchases.find((item) => item.name === label);
    if (!item) continue;
    const button = document.createElement("button");
    button.className = "btn alt";
    button.textContent = "Programar compra";
    button.onclick = () =>
      purchasePlanForm(window.__budgetMonth, item.name, item.unit);
    row.appendChild(button);
  }
}
// Components keep their filter and month handlers while exposing one application section.
window.renderBudget = function (tab, month) {
  if (rendering) return budgetComponent(tab, month);
  if (currentMode === "buy" && tab === "buy") {
    window.__budgetMonth = month || window.__budgetMonth;
    return casaShowMode();
  }
  if (currentMode === "abc" && tab === "abc")
    return budgetComponent(tab, month);
  if (currentMode === "composition" && tab === "detail") return;
  if (
    currentMode === "sinapi" ||
    currentMode === "removed" ||
    currentMode === "excel"
  )
    return;
  return casaShowMode();
};
addEventListener("message", (event) => {
  if (
    event.origin !== location.origin ||
    event.source !== parent ||
    event.data?.type !== "casa-init"
  )
    return;
  const input = event.data;
  state = clone(input.state);
  fullSeed = clone(input.state);
  fullSeed.services.push(...clone(state.__archived || []));
  fullSeed.budgetOverrides = {};
  for (const service of state.__archived || [])
    fullSeed.budgetOverrides[service.code] = { qty: 0 };
  state.budgetOverrides = clone(fullSeed.budgetOverrides);
  window.__FULL_SEED = fullSeed;
  if (!state.purchasePlan.__managementSettings)
    state.purchasePlan.__managementSettings = {
      initialCash: state.__settings.initialCash,
      plsBase: 0,
      purchaseLeadDays: 14,
    };
  fullSeed.purchasePlan = clone(state.purchasePlan);
  currentMode = input.mode;
  currentCode = input.code;
  canWrite = input.canWrite;
  recalculate();
  lastConfirmed = clone(state);
  casaShowMode(true);
  if (!canWrite) message("Acesso somente de leitura.");
  parent.postMessage({ type: "casa-ready" }, location.origin);
});
