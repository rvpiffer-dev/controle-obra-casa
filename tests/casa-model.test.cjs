const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const model = require("../dist/casa-model.js");
const context = { window: {} };
vm.createContext(context);
for (const name of ["data", "domain", "manager"])
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../dist", name + ".js"), "utf8"),
    context,
  );
const manager = context.window.EngefexManager;
const domain = context.window.Obras;
const clone = (value) => JSON.parse(JSON.stringify(value));
function fixture() {
  const state = manager.separate(context.window.OBRAS_SEED);
  state.projects.push({
    ...manager.defaults("projects"),
    id: "P",
    name: "Casa",
    value: 100,
  });
  state.budgetStages.push({
    ...manager.defaults("budgetStages", "P"),
    id: "B",
    name: "Etapa",
    code: "01",
  });
  state.budgetItems.push({
    ...manager.defaults("budgetItems", "P"),
    id: "I",
    stage: "B",
    code: "01.01",
    name: "Serviço",
    unit: "un",
    quantity: 2,
    unitPrice: 50,
    sale: 100,
    materialUnit: 30,
    laborUnit: 20,
  });
  state.stages.push({
    ...manager.defaults("stages", "P"),
    id: "S",
    name: "Etapa",
  });
  state.activities.push({
    ...manager.defaults("activities", "P"),
    id: "T",
    stage: "S",
    name: "Atividade",
    unit: "un",
    quantity: 1,
    start: "2026-11-10",
    finish: "2026-11-11",
    originBudgetItem: "I",
  });
  state.costs.push({
    id: "C",
    project: "P",
    stage: "B",
    description: "Compra",
    category: "Materiais",
    amount: 30,
    incurred: 30,
    paid: 10,
  });
  return clone(manager.reconcile(state));
}
const apply = (source, before, after) =>
  clone(model.applyState(source, "P", before, after, manager, domain));
test("PLS-only save preserves every budget, schedule and cost row", () => {
  const source = fixture(),
    before = model.projectState(source, "P"),
    after = clone(before);
  after.purchasePlan.__plsSimulations = [{ id: "PLS-1", rows: [] }];
  const result = apply(source, before, after);
  assert.deepEqual(result.budgetItems, source.budgetItems);
  assert.deepEqual(result.activities, source.activities);
  assert.deepEqual(result.costs, source.costs);
  assert.equal(result.projects[0].casa.purchasePlan.__plsSimulations.length, 1);
});
test("new service and dependent activity are converted together", () => {
  const source = fixture(),
    before = model.projectState(source, "P"),
    after = clone(before);
  after.services.push({
    code: "01.02",
    name: "Novo",
    macro: "Etapa",
    unit: "un",
    qty: 2,
    unitCost: 10,
    materialUnit: 10,
    laborUnit: 0,
    equipUnit: 0,
    otherUnit: 0,
    taskId: 2,
  });
  after.tasks.push({
    id: 2,
    name: "Nova atividade",
    phase: "Etapa",
    start: "2026-11-12",
    finish: "2026-11-12",
    preds: "1",
    progress: 0,
    duration: 1,
  });
  const result = apply(source, before, after),
    item = result.budgetItems.find((row) => row.code === "01.02"),
    task = result.activities.find((row) => row.name === "Nova atividade");
  assert.equal(item.sale, 20);
  assert.deepEqual(task.dependencies, ["T"]);
  assert.deepEqual(task.casaBudgetItems, [item.id]);
  assert.deepEqual(result.costs, source.costs);
});
test("retirement preserves the item id and supports reactivation", () => {
  const source = fixture(),
    before = model.projectState(source, "P"),
    after = clone(before);
  after.__archived = [after.services.pop()];
  const removed = apply(source, before, after);
  assert.equal(removed.budgetItems[0].id, "I");
  assert.equal(removed.budgetItems[0].sale, 0);
  const projected = model.projectState(removed, "P"),
    restored = clone(projected);
  restored.services.push(restored.__archived.pop());
  const result = apply(removed, projected, restored);
  assert.equal(result.budgetItems[0].sale, 100);
  assert.equal(result.budgetItems[0].id, "I");
});
test("duplicate codes and invalid dependencies fail without changing the source", () => {
  const source = fixture(),
    before = model.projectState(source, "P"),
    after = clone(before),
    original = clone(source);
  after.services.push(clone(after.services[0]));
  assert.throws(() => apply(source, before, after), /repetido/);
  after.services.pop();
  after.tasks[0].preds = "999";
  assert.throws(() => apply(source, before, after), /ausente/);
  assert.deepEqual(source, original);
});
test("existing monetary totals survive projection without recalculating historic unit prices", () => {
  const source = fixture();
  source.budgetItems[0].unitPrice = 123;
  const projected = model.projectState(source, "P"),
    result = apply(source, projected, projected);
  assert.deepEqual(result.budgetItems, source.budgetItems);
});
test("legacy backup can be imported twice without duplicating expenses or PLS snapshots", () => {
  const source = fixture(),
    legacy = model.projectState(source, "P");
  legacy.costs = [
    {
      id: 17,
      date: "2026-11-10",
      description: "Custo anterior",
      amount: 20,
      paid: 10,
      macro: "01",
      nature: "Material",
    },
  ];
  legacy.purchasePlan.__plsSimulations = [{ id: "PLS-old", rows: [] }];
  const first = clone(model.importLegacy(source, "P", legacy, manager, domain));
  const second = clone(model.importLegacy(first, "P", legacy, manager, domain));
  assert.equal(second.costs.filter((row) => row.casaLegacyId === 17).length, 1);
  assert.equal(second.costs.find((row) => row.id === "C").paid, 10);
  assert.equal(second.projects[0].casa.purchasePlan.__plsSimulations.length, 1);
});
test("legacy totals, components, omitted services and purchase audit survive import", () => {
  const source = fixture();
  source.budgetItems.push({...clone(source.budgetItems[0]),id:'I-omitted',code:'01.02',sale:40});
  const legacy = model.projectState(fixture(), 'P');
  legacy.services[0].total = 80;
  legacy.services[0].material = 45;
  legacy.purchases = [{serviceCode:'01.01',name:'Insumo',qty:1,estimatedCost:45}];
  legacy.purchaseAudit = {purchaseTotal:45};
  legacy.tasks[0].origin = '01.01';
  legacy.tasks[0].plannedCost = 80;
  const template = {services:[...clone(legacy.services),{code:'01.02'}]};
  const imported = clone(model.importLegacy(source,'P',legacy,manager,domain,template));
  const projected = model.projectState(imported,'P');
  assert.equal(projected.project.budget,80);
  assert.equal(projected.services.length,1);
  assert.equal(projected.services[0].unitCost,50);
  assert.equal(projected.services[0].material,45);
  assert.equal(projected.__archived[0].__id,'I-omitted');
  assert.equal(projected.tasks[0].origin,'01.01');
  assert.deepEqual(projected.purchases,legacy.purchases);
  assert.deepEqual(projected.purchaseAudit,legacy.purchaseAudit);
  assert.deepEqual(imported.projects[0].casa.legacyImportedState,clone(legacy));
  const saved = apply(imported,projected,projected);
  assert.deepEqual(saved.budgetItems,imported.budgetItems);
  const repeated = clone(model.importLegacy(imported,'P',legacy,manager,domain,template));
  assert.deepEqual(repeated.budgetItems,imported.budgetItems);
});
