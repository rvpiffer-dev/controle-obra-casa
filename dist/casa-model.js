(function (root) {
  "use strict";
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const number = (value) =>
    Number.isFinite(Number(value)) ? Number(value) : 0;

  function projectState(source, projectId, template = {}) {
    const project = source.projects.find((row) => row.id === projectId);
    if (!project) throw Error("Selecione a obra.");
    const house = projectId === "CASA-RAMON-TALITA";
    const stored = clone(
      project.casa || (house ? source.casaLegacy : null) || {},
    );
    const base = house ? template : {};
    const stages = source.budgetStages.filter(
      (row) => row.project === projectId,
    );
    const tasks = source.activities.filter((row) => row.project === projectId);
    const taskIds = new Map(
      tasks.map((row, index) => [
        row.id,
        row.casaTaskId ||
          Number(row.id.match(/^ATIV-(\d+)$/)?.[1]) ||
          index + 1,
      ]),
    );
    const services = source.budgetItems
      .filter((row) => row.project === projectId)
      .map((row) => {
        const original =
          base.services?.find((item) => item.code === row.code) || {};
        const stage = stages.find((item) => item.id === row.stage);
        const quantity = number(row.quantity);
        const materialUnit = number(row.materialUnit);
        const laborUnit = number(row.laborUnit);
        const equipUnit = number(row.equipmentUnit);
        const otherUnit = number(
          row.casa?.otherUnit ??
            original.otherUnit ??
            Math.max(
              0,
              number(row.unitPrice) - materialUnit - laborUnit - equipUnit,
            ),
        );
        const link = tasks.find(
          (task) =>
            task.originBudgetItem === row.id ||
            task.casaBudgetItems?.includes(row.id),
        );
        const taskId = link ? taskIds.get(link.id) : original.taskId;
        return {
          ...original,
          ...clone(row.casa || {}),
          __id: row.id,
          code: row.code || row.id,
          name: row.name,
          macro: stage?.name || "Sem etapa",
          unit: row.unit,
          qty: row.casaRemoved ? number(row.casa?.qty) : quantity,
          materialUnit,
          laborUnit,
          equipUnit,
          otherUnit,
          unitCost: number(row.unitPrice),
          material: quantity * materialUnit,
          labor: quantity * laborUnit,
          equipment: quantity * equipUnit,
          others: quantity * otherUnit,
          total: number(row.sale),
          taskId,
          reference: row.reference || row.source || original.reference || "",
          removed: row.casaRemoved === true,
        };
      });
    const archived = services.filter((row) => row.removed);
    const projected = {
      project: {
        name: project.name,
        start: project.start,
        budget: services
          .filter((s) => !s.removed)
          .reduce((sum, row) => sum + row.total, 0),
      },
      services: services.filter((row) => !row.removed),
      macros: stages.map((row) => ({
        code: row.code || row.id,
        name: row.name,
        material: 0,
        labor: 0,
        equipment: 0,
        others: 0,
        total: 0,
      })),
      tasks: tasks.map((row) => {
        const id = taskIds.get(row.id);
        const original =
          base.tasks?.find((item) => Number(item.id) === id) || {};
        return {
          ...original,
          __id: row.id,
          id,
          phase:
            source.stages.find((item) => item.id === row.stage)?.name ||
            "Sem etapa",
          name: row.name,
          origin: row.code,
          start: row.start,
          finish: row.finish,
          progress: row.quantity ? row.executed / row.quantity : 0,
          preds: (row.dependencies || [])
            .map((dep) => taskIds.get(dep))
            .filter(Boolean)
            .join(", "),
          plannedCost: services
            .filter(
              (service) =>
                String(service.taskId) === String(id) && !service.removed,
            )
            .reduce((sum, service) => sum + service.total, 0),
          resource: row.team || row.responsible || original.resource || "",
          notes: row.evidence || "",
          duration: row.casaDuration || original.duration || 1,
        };
      }),
      costs: source.costs
        .filter((row) => row.project === projectId)
        .map((row) => ({
          ...clone(row),
          date: row.paidDate || row.date || row.due,
          macro: stages.find((stage) => stage.id === row.stage)?.code || "",
          nature: row.category,
          notes: row.note || "",
        })),
      pls: clone(stored.pls || base.pls || []),
      purchases: clone(stored.purchases || base.purchases || []),
      purchasePlan: clone(stored.purchasePlan || {}),
      budgetOverrides: {},
      addedServices: [],
      addedTasks: [],
      taskScheduleOverrides: {},
      budgetImportMeta: stored.budgetImportMeta || null,
      plsSimulations: clone(stored.plsSimulations || []),
      plsSimulationDraft: clone(stored.plsSimulationDraft || null),
      __archived: archived,
      __settings: { initialCash: project.initialCash || 0 },
    };
    if (stored.plsSimulations?.length) {
      const snapshots = new Map(
        stored.plsSimulations.map((row) => [row.id, row]),
      );
      for (const row of projected.purchasePlan.__plsSimulations || [])
        snapshots.set(row.id, row);
      projected.purchasePlan.__plsSimulations = clone([...snapshots.values()]);
    }
    if (
      !projected.purchasePlan.__plsSimulationDraft &&
      stored.plsSimulationDraft
    )
      projected.purchasePlan.__plsSimulationDraft = clone(
        stored.plsSimulationDraft,
      );
    for (const macro of projected.macros)
      for (const service of projected.services.filter(
        (row) => row.macro === macro.name,
      )) {
        for (const key of ["material", "labor", "equipment", "others", "total"])
          macro[key] += number(service[key]);
      }
    return projected;
  }

  function applyState(source, projectId, before, after, manager, domain) {
    const next = clone(source);
    const project = next.projects.find((row) => row.id === projectId);
    if (
      !project ||
      !Array.isArray(after.services) ||
      !Array.isArray(after.tasks)
    )
      throw Error("Dados da obra inválidos.");
    const unique = (rows, key) => {
      const ids = rows.map((row) => String(row[key]));
      if (new Set(ids).size !== ids.length)
        throw Error("Código repetido. Confira os registros.");
    };
    unique(after.services, "code");
    unique(after.tasks, "id");
    const services = [
      ...after.services,
      ...(after.__archived || []).filter(
        (row) => !after.services.some((item) => item.code === row.code),
      ),
    ];
    const serviceIds = new Map();
    for (const service of services) {
      let row = next.budgetItems.find(
        (item) =>
          item.project === projectId &&
          (service.__id
            ? item.id === service.__id
            : item.code === service.code),
      );
      const isNew = !row;
      if (!row) {
        const stage = next.budgetStages.find(
          (item) => item.project === projectId && item.name === service.macro,
        );
        if (!stage) throw Error("Etapa do orçamento não encontrada.");
        row = {
          ...manager.defaults("budgetItems", projectId),
          id: "ITEM-" + crypto.randomUUID(),
          stage: stage.id,
        };
        next.budgetItems.push(row);
      }
      const previous = [...before.services, ...(before.__archived || [])].find(
        (item) => item.__id === row.id,
      );
      const archived = !after.services.some(
        (item) => item.code === service.code,
      );
      const quantity = archived ? 0 : number(service.qty);
      const unitPrice = number(service.unitCost);
      if (quantity < 0 || unitPrice < 0)
        throw Error("Quantidade e valor devem ser não negativos.");
      if (
        archived &&
        next.measurements.some((item) => item.activity === row.id)
      )
        throw Error(
          "Este serviço possui medições. Confira os vínculos antes de retirá-lo.",
        );
      const changed =
        isNew ||
        archived !== (row.casaRemoved === true) ||
        !previous ||
        [
          "code",
          "name",
          "unit",
          "qty",
          "unitCost",
          "materialUnit",
          "laborUnit",
          "equipUnit",
          "otherUnit",
          "reference",
          "sinapiItems",
          "sinapiCode",
          "referenceMonth",
        ].some((key) => {
          if (
            typeof previous[key] === "number" &&
            typeof service[key] === "number"
          )
            return Math.abs(previous[key] - service[key]) > 0.000001;
          return JSON.stringify(previous[key]) !== JSON.stringify(service[key]);
        });
      if (changed)
        Object.assign(row, {
          code: String(service.code),
          name: service.name,
          unit: service.unit,
          quantity,
          unitPrice,
          sale: quantity * unitPrice,
          materialUnit: number(service.materialUnit),
          laborUnit: number(service.laborUnit),
          equipmentUnit: number(service.equipUnit),
          reference: service.reference || "",
          casaRemoved: archived,
          casa: { ...clone(service), __id: row.id },
        });
      // O progresso financeiro continua limitado pelos registros de medição existentes.
      if (!previous && !row.executed) row.executed = 0;
      serviceIds.set(String(service.code), row.id);
    }
    const taskIds = new Map();
    for (const task of after.tasks) {
      const row = next.activities.find(
        (item) =>
          item.project === projectId &&
          (task.__id ? item.id === task.__id : item.casaTaskId === task.id),
      );
      taskIds.set(String(task.id), row?.id || "ATIV-" + crypto.randomUUID());
    }
    for (const task of after.tasks) {
      let row = next.activities.find(
        (item) => item.id === taskIds.get(String(task.id)),
      );
      if (!row) {
        let stage = next.stages.find(
          (item) => item.project === projectId && item.name === task.phase,
        );
        if (!stage) {
          stage = {
            ...manager.defaults("stages", projectId),
            id: "ETAPA-" + crypto.randomUUID(),
            name: task.phase,
          };
          next.stages.push(stage);
        }
        row = {
          ...manager.defaults("activities", projectId),
          id: taskIds.get(String(task.id)),
          stage: stage.id,
          quantity: 1,
          unit: "un",
        };
        next.activities.push(row);
      }
      const linked = services
        .filter(
          (service) =>
            String(service.taskId) === String(task.id) && !service.removed,
        )
        .map((service) => serviceIds.get(String(service.code)));
      const previous = before.tasks.find(
        (item) => String(item.id) === String(task.id),
      );
      const priorLinks = before.services
        .filter((service) => String(service.taskId) === String(task.id))
        .map((service) => service.__id)
        .sort();
      const changed =
        !previous ||
        [
          "name",
          "start",
          "finish",
          "progress",
          "preds",
          "resource",
          "notes",
          "duration",
        ].some(
          (key) => JSON.stringify(previous[key]) !== JSON.stringify(task[key]),
        ) ||
        JSON.stringify(priorLinks) !== JSON.stringify([...linked].sort());
      if (changed)
        Object.assign(row, {
          name: task.name,
          start: task.start || "",
          finish: task.finish || "",
          executed:
            row.quantity * Math.max(0, Math.min(1, number(task.progress))),
          dependencies: String(task.preds || "")
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
            .map((id) => {
              const value = taskIds.get(id);
              if (!value) throw Error("Dependência do cronograma ausente.");
              return value;
            }),
          team: task.resource || "",
          evidence: task.notes || "",
          casaTaskId: task.id,
          casaDuration: number(task.duration),
          casaBudgetItems: linked,
        });
    }
    const stored = clone(
      project.casa ||
        (projectId === "CASA-RAMON-TALITA" ? next.casaLegacy : null) ||
        {},
    );
    project.casa = stored;
    for (const key of [
      "pls",
      "purchasePlan",
      "budgetImportMeta",
      "plsSimulations",
      "plsSimulationDraft",
    ]) {
      if (
        JSON.stringify(before[key] ?? null) !==
        JSON.stringify(after[key] ?? null)
      )
        project.casa[key] = clone(after[key] ?? null);
    }
    const settings = after.purchasePlan?.__managementSettings;
    if (
      settings &&
      number(project.initialCash) !== number(settings.initialCash)
    )
      project.initialCash = number(settings.initialCash);
    let result = manager.reconcile(next);
    for (const row of result.budgetItems.filter(
      (item) => item.project === projectId,
    ))
      domain.validateBudgetItem(result, row);
    for (const row of result.activities.filter(
      (item) => item.project === projectId,
    ))
      domain.validateActivity(result, row);
    domain.backupValid(result);
    return result;
  }

  function importLegacy(
    source,
    projectId,
    legacy,
    manager,
    domain,
    template = {},
  ) {
    if (
      !legacy?.project ||
      !Array.isArray(legacy.services) ||
      !Array.isArray(legacy.tasks)
    )
      throw Error("Backup do sistema anterior incompleto.");
    const baseline = projectState(source, projectId, template);
    const incoming = clone(legacy);
    const draft = clone(source);
    for (const macro of legacy.macros || [])
      if (
        !draft.budgetStages.some(
          (row) => row.project === projectId && row.name === macro.name,
        )
      ) {
        draft.budgetStages.push({
          ...manager.defaults("budgetStages", projectId),
          id: "ORC-" + crypto.randomUUID(),
          code: macro.code || "",
          name: macro.name,
        });
      }
    for (const service of incoming.services) {
      const match =
        baseline.services.find((row) => row.code === service.code) ||
        baseline.__archived.find((row) => row.code === service.code);
      if (match) service.__id = match.__id;
    }
    for (const task of incoming.tasks) {
      const match = baseline.tasks.find(
        (row) => String(row.id) === String(task.id),
      );
      if (match) task.__id = match.__id;
    }
    incoming.__archived = [];
    for (const [code, override] of Object.entries(
      incoming.budgetOverrides || {},
    ))
      if (Number(override.qty) === 0) {
        const original = [
          ...(template.services || []),
          ...(legacy.addedServices || []),
        ].find((row) => String(row.code) === code);
        if (!original) continue;
        const match = [...baseline.services, ...baseline.__archived].find(
          (row) => String(row.code) === code,
        );
        incoming.__archived.push({
          ...clone(original),
          __id: match?.__id,
          removed: true,
        });
        incoming.services = incoming.services.filter(
          (row) => String(row.code) !== code,
        );
      }
    let result = applyState(
      draft,
      projectId,
      baseline,
      incoming,
      manager,
      domain,
    );
    const category = {
      Material: "Materiais",
      "Mão de obra": "Mão de obra",
      Equipamento: "Equipamentos",
      Outros: "Indiretos e tributos",
    };
    for (const cost of legacy.costs || []) {
      const id = "CASA-LEGACY-COST-" + String(cost.id);
      const prior = result.costs.find(
        (row) => row.id === id && row.project === projectId,
      );
      const stage = result.budgetStages.find(
        (row) =>
          row.project === projectId &&
          (row.code === String(cost.macro) || row.name === cost.macro),
      );
      const record = {
        ...(prior || {}),
        id,
        project: projectId,
        stage: stage?.id || "",
        description: cost.description || "Custo importado",
        supplier: cost.supplier || "",
        category: category[cost.nature] || "Materiais",
        amount: number(cost.amount),
        incurred: number(cost.amount),
        paid: number(cost.paid),
        due: cost.date || "",
        paidDate: cost.paid ? cost.date || "" : "",
        note: cost.notes || "",
        casaLegacyId: cost.id,
      };
      if (record.amount < 0 || record.paid < 0 || record.paid > record.amount)
        throw Error(
          "Confira os valores do custo importado " + record.description + ".",
        );
      if (prior) Object.assign(prior, record);
      else result.costs.push(record);
    }
    domain.backupValid(result);
    return result;
  }

  const api = { projectState, applyState, importLegacy };
  if (typeof module !== "undefined") module.exports = api;
  else root.CasaModel = api;
})(typeof window === "undefined" ? globalThis : window);
