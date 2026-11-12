function mergeAddedTasks(fresh, added) {
  const arr = Array.isArray(added) ? added.map((x) => ({ ...x })) : [];
  if (!arr.length) return fresh;
  const pending = [...arr],
    out = [...(fresh.tasks || [])];
  let guard = 0;
  while (pending.length && guard++ < 1000) {
    let moved = false;
    for (let i = 0; i < pending.length; i++) {
      const t = pending[i],
        anchor = Number(t.positionAfterId),
        idx = out.findIndex((x) => Number(x.id) === anchor);
      if (idx >= 0) {
        let pos = idx + 1;
        while (pos < out.length && Number(out[pos]?.positionAfterId) === anchor)
          pos++;
        out.splice(pos, 0, t);
        pending.splice(i, 1);
        i--;
        moved = true;
      }
    }
    if (!moved) break;
  }
  out.push(...pending);
  fresh.tasks = out;
  return fresh;
}
function applyTaskScheduleOverrides(fresh, overrides) {
  const ov = overrides && typeof overrides === "object" ? overrides : {};
  fresh.tasks = (fresh.tasks || []).map((t) => {
    const o = ov[String(t.id)];
    return o ? { ...t, ...o, id: t.id } : t;
  });
  return fresh;
}
function applyBudgetOverrides(fresh, overrides) {
  overrides = overrides && typeof overrides === "object" ? overrides : {};
  fresh.services = (fresh.services || []).map((s) => {
    const o = overrides[String(s.code || "")];
    if (!o) return s;
    const originalEO = (Number(s.equipUnit) || 0) + (Number(s.otherUnit) || 0),
      equipRatio = originalEO > 0 ? (Number(s.equipUnit) || 0) / originalEO : 0,
      qty = Number.isFinite(Number(o.qty)) ? Number(o.qty) : Number(s.qty) || 0,
      materialUnit = Number.isFinite(Number(o.materialUnit))
        ? Number(o.materialUnit)
        : Number(s.materialUnit) || 0,
      laborUnit = Number.isFinite(Number(o.laborUnit))
        ? Number(o.laborUnit)
        : Number(s.laborUnit) || 0,
      eoUnit = Number.isFinite(Number(o.eoUnit))
        ? Number(o.eoUnit)
        : originalEO,
      name = String(o.name ?? "").trim() || s.name,
      equipUnit = eoUnit * equipRatio,
      otherUnit = eoUnit - equipUnit,
      material = qty * materialUnit,
      labor = qty * laborUnit,
      equipment = qty * equipUnit,
      others = qty * otherUnit,
      total = material + labor + equipment + others;
    return {
      ...s,
      name,
      qty,
      materialUnit,
      laborUnit,
      equipUnit,
      otherUnit,
      unitCost: materialUnit + laborUnit + eoUnit,
      material,
      labor,
      equipment,
      others,
      total,
      priceStatus: "Editado",
    };
  });
  fresh.services = fresh.services.filter((s) => (Number(s.qty) || 0) > 0);
  const macroMap = new Map();
  (fresh.services || []).forEach((s) => {
    const k = String(s.macro || "");
    if (!macroMap.has(k))
      macroMap.set(k, {
        material: 0,
        labor: 0,
        equipment: 0,
        others: 0,
        total: 0,
      });
    const m = macroMap.get(k);
    m.material += Number(s.material) || 0;
    m.labor += Number(s.labor) || 0;
    m.equipment += Number(s.equipment) || 0;
    m.others += Number(s.others) || 0;
    m.total += Number(s.total) || 0;
  });
  fresh.macros = (fresh.macros || []).map((m) => {
    const x = macroMap.get(String(m.name || "")) || {
      material: 0,
      labor: 0,
      equipment: 0,
      others: 0,
      total: 0,
    };
    return { ...m, ...x };
  });
  const projectTotal = (fresh.services || []).reduce(
    (sum, s) => sum + (Number(s.total) || 0),
    0,
  );
  fresh.project = { ...(fresh.project || {}), budget: projectTotal };
  const taskTotals = new Map();
  (fresh.services || []).forEach((s) => {
    if (s.taskId != null)
      taskTotals.set(
        String(s.taskId),
        (taskTotals.get(String(s.taskId)) || 0) + (Number(s.total) || 0),
      );
  });
  fresh.tasks = (fresh.tasks || []).map((t) => ({
    ...t,
    plannedCost: taskTotals.get(String(t.id)) || Number(t.plannedCost) || 0,
  }));
  const abcRows = (fresh.services || [])
    .filter((s) => (Number(s.total) || 0) > 0)
    .sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
  let cum = 0;
  fresh.abc = abcRows.map((s, i) => {
    const part = projectTotal ? (Number(s.total) || 0) / projectTotal : 0;
    cum += part;
    return {
      rank: i + 1,
      code: s.code,
      macro: s.macro,
      name: s.name,
      unit: s.unit,
      qty: s.qty,
      total: s.total,
      pct: part,
      cumPct: cum,
      class: cum <= 0.8 ? "A" : cum <= 0.95 ? "B" : "C",
    };
  });
  return fresh;
}
function reconcilePurchases(fresh) {
  const byCode = new Map();
  (fullSeed?.purchases || []).forEach((p) => {
    const code = String(p.serviceCode || "");
    if (
      code === "04.01" &&
      String(p.source || "").toLowerCase() === "sinapi analítico" &&
      ["34586", "34649", "34788"].includes(String(p.inputCode || ""))
    )
      return;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push({ ...p });
  });
  const out = [];
  (fresh.services || []).forEach((s) => {
    const code = String(s.code || ""),
      material = Number(s.material) || 0;
    if (material <= 0) return;
    const rows = byCode.get(code) || [],
      analyticalTotal = rows.reduce(
        (sum, p) => sum + (Number(p.estimatedCost) || 0),
        0,
      ),
      base = fullSeed?.services?.find((x) => String(x.code || "") === code),
      edited = !!fresh.budgetOverrides?.[code],
      baseQty = Number(base?.qty) || 0,
      qty = Number(s.qty) || 0,
      scale = baseQty > 0 ? qty / baseQty : 1,
      scaled = rows.map((p) => ({
        ...p,
        qty: (Number(p.qty) || 0) * scale,
        estimatedCost: (Number(p.estimatedCost) || 0) * scale,
        unitPrice: Number(p.unitPrice) || 0,
      })),
      scaledTotal = scaled.reduce(
        (sum, p) => sum + (Number(p.estimatedCost) || 0),
        0,
      );
    if (
      rows.length &&
      Math.abs((edited ? scaledTotal : analyticalTotal) - material) <= 1
    ) {
      out.push(...(edited ? scaled : rows));
      return;
    }
    out.push({
      serviceCode: code,
      taskId: s.taskId,
      name: s.name || "Serviço " + code,
      unit: s.unit || "",
      qty: Number(s.qty) || 0,
      unitPrice: Number(s.materialUnit) || 0,
      estimatedCost: material,
      source: s.addedByUser
        ? "Serviço adicionado no orçamento"
        : edited
          ? "Orçamento editado"
          : "Orçamento/EAP reconciliado",
      inputCode: "",
    });
  });
  fresh.purchases = out;
  fresh.purchaseAudit = {
    rawCount: (fullSeed?.purchases || []).length,
    reconciledCount: out.length,
    materialTotal: (fresh.services || []).reduce(
      (sum, s) => sum + (Number(s.material) || 0),
      0,
    ),
    purchaseTotal: out.reduce(
      (sum, p) => sum + (Number(p.estimatedCost) || 0),
      0,
    ),
  };
  return fresh;
}
function renderPLS() {
  pls.innerHTML = `<div class="section-title">Medições PLS</div><div class="list">${state.pls.map((x) => `<div class="item"><h3>Etapa ${x.stage} · acumulado ${pct(x.cumPct)}</h3><div class="meta"><span>${date(x.date)}</span></div><label>Status</label><select onchange="updatePLS(${x.stage},this.value)"><option ${x.status === "Planejada" ? "selected" : ""}>Planejada</option><option ${x.status === "Solicitada" ? "selected" : ""}>Solicitada</option><option ${x.status === "Vistoriada" ? "selected" : ""}>Vistoriada</option><option ${x.status === "Liberada" ? "selected" : ""}>Liberada</option></select></div>`).join("")}</div>`;
}
function updatePLS(s, v) {
  state.pls.find((x) => x.stage === s).status = v;
  save();
}
