(function (root) {
  "use strict";
  const modes = {
    "casa-pls": ["PLS Caixa", "pls", "measurements"],
    "casa-abc": ["Curva ABC", "abc", "budget"],
    "casa-compras": ["Programação de compras", "buy", "supplies"],
    "casa-ff": ["Físico-financeiro e Curva S", "ff", "timeline"],
    "casa-caixa": ["Fluxo de caixa e PLS", "cash", "profit"],
    "casa-alertas": ["Alertas de compras", "alerts", "supplies"],
    "casa-excel": ["Orçamento Excel da casa", "excel", "budget"],
    "casa-sinapi": ["Composições e insumos SINAPI", "sinapi", "budget"],
    "casa-retirados": ["Serviços retirados", "removed", "budget"],
    "casa-reprogramar": ["Reprogramar cronograma", "replan", "timeline"],
    "casa-composicao": ["Composição do serviço", "composition", "budget"],
  };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  let context,
    session = null,
    busy = false;
  const budgetFilter = {
    stage: "all",
    component: "all",
    value: "all",
    sort: "code",
  };
  const escape = (value) =>
    String(value || "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );

  function actions(view) {
    const lists = {
      budget: ["casa-abc", "casa-excel", "casa-sinapi", "casa-retirados"],
      timeline: ["casa-ff", "casa-reprogramar"],
      supplies: ["casa-compras", "casa-alertas"],
      profit: ["casa-caixa"],
    };
    return (lists[view] || []).length
      ? '<nav class="casa-actions" aria-label="Ferramentas da casa">' +
          lists[view]
            .map(
              (key) =>
                `<a class="button secondary" href="#${key}">${modes[key][0]}</a>`,
            )
            .join("") +
          "</nav>"
      : "";
  }

  function page(view, state, projectId) {
    const list = state.projects.filter(
      (project) => projectId === "all" || project.id === projectId,
    );
    if (list.length !== 1)
      return '<section class="empty"><h1>Selecione uma obra</h1><p>Escolha a obra no seletor superior para abrir esta ferramenta.</p></section>';
    const project = list[0];
    const mode = modes[view];
    return `<section class="casa-feature"><header class="casa-feature-heading"><h1>${mode[0]}</h1><a href="#${mode[2]}">Voltar</a></header><p class="notice neutral" id="casa-save-status" role="status">Carregando dados da obra…</p><iframe title="${escape(mode[0])}" id="casa-feature-frame" src="casa-runtime.html?v=1" data-mode="${mode[1]}" data-project="${escape(project.id)}"></iframe></section>`;
  }

  function permissions(view) {
    return modes[view]?.[2] || view;
  }
  function budgetFilters(state, projectId) {
    const select = (key, label, options) =>
      `<label>${label}<select data-casa-budget-filter="${key}">${options.map(([value, text]) => `<option value="${escape(value)}" ${budgetFilter[key] === value ? "selected" : ""}>${escape(text)}</option>`).join("")}</select></label>`;
    return (
      '<details class="casa-budget-filters" ' +
      (Object.entries(budgetFilter).some(
        ([key, value]) => value !== (key === "sort" ? "code" : "all"),
      )
        ? "open"
        : "") +
      '><summary>Filtros do orçamento detalhado</summary><div class="casa-filter-grid">' +
      select("stage", "Macroetapa", [
        ["all", "Todas"],
        ...state.budgetStages
          .filter((row) => projectId === "all" || row.project === projectId)
          .map((row) => [row.id, row.name]),
      ]) +
      select("component", "Componente do custo", [
        ["all", "Todos"],
        ["material", "Material"],
        ["labor", "Mão de obra"],
        ["other", "Equipamentos e outros"],
      ]) +
      select("value", "Valor", [
        ["all", "Todos"],
        ["value", "Com custo"],
        ["zero", "Custo zero"],
      ]) +
      select("sort", "Ordenar", [
        ["code", "Código"],
        ["desc", "Maior valor"],
        ["asc", "Menor valor"],
      ]) +
      '<button type="button" class="button secondary" id="casa-clear-budget-filters">Limpar filtros</button></div></details>'
    );
  }
  function budgetTree(state, projectId) {
    const tree = root.Obras.budgetTree(state, projectId);
    const value = (row) =>
      budgetFilter.component === "material"
        ? Number(row.materialUnit || 0) * row.quantity
        : budgetFilter.component === "labor"
          ? Number(row.laborUnit || 0) * row.quantity
          : budgetFilter.component === "other"
            ? Number(row.sale || 0) -
              (Number(row.materialUnit || 0) + Number(row.laborUnit || 0)) *
                row.quantity
            : Number(row.sale || 0);
    const stageIds = new Set();
    function addStage(id) {
      if (!id || stageIds.has(id)) return;
      stageIds.add(id);
      addStage(state.budgetStages.find((row) => row.id === id)?.parent);
    }
    const selectedStage = budgetFilter.stage;
    const underStage = (id) => {
      const visited = new Set();
      while (id && !visited.has(id)) {
        if (id === selectedStage) return true;
        visited.add(id);
        id = state.budgetStages.find((row) => row.id === id)?.parent;
      }
      return false;
    };
    const items = tree.filter(
      (row) =>
        row.kind === "item" &&
        !row.record.casaRemoved &&
        (selectedStage === "all" || underStage(row.record.stage)) &&
        (budgetFilter.component === "all" || value(row.record) > 0) &&
        (budgetFilter.value === "all" ||
          (budgetFilter.value === "value"
            ? value(row.record) > 0
            : value(row.record) === 0)),
    );
    for (const row of items) addStage(row.record.stage);
    const ids = new Set(items.map((row) => row.record.id));
    const result = tree.filter((row) =>
      row.kind === "stage"
        ? stageIds.has(row.record.id)
        : ids.has(row.record.id),
    );
    if (budgetFilter.sort !== "code")
      for (let start = 0; start < result.length; start++) {
        if (result[start].kind !== "item") continue;
        let end = start + 1;
        while (
          end < result.length &&
          result[end].kind === "item" &&
          result[end].record.stage === result[start].record.stage
        )
          end++;
        const rows = result
          .slice(start, end)
          .sort(
            (a, b) =>
              (value(a.record) - value(b.record)) *
              (budgetFilter.sort === "desc" ? -1 : 1),
          );
        result.splice(start, end - start, ...rows);
        start = end - 1;
      }
    return result;
  }
  function bind(view) {
    for (const input of document.querySelectorAll("[data-casa-budget-filter]"))
      input.onchange = () => {
        budgetFilter[input.dataset.casaBudgetFilter] = input.value;
        context.render();
      };
    const clear = document.getElementById("casa-clear-budget-filters");
    if (clear)
      clear.onclick = () => {
        Object.assign(budgetFilter, {
          stage: "all",
          component: "all",
          value: "all",
          sort: "code",
        });
        context.render();
      };
    const frame = document.getElementById("casa-feature-frame");
    if (!frame) {
      session = null;
      return;
    }
    if (session?.frame === frame) return;
    const projectId = frame.dataset.project;
    const source = context.getState();
    const projected = root.CasaModel.projectState(
      source,
      projectId,
      root.FULL_SEED || {},
    );
    session = {
      frame,
      projectId,
      view,
      source: clone(source),
      projected,
      snapshot: JSON.stringify(source),
      dirty: false,
    };
    frame.addEventListener("load", () => {
      if (session?.frame !== frame) return;
      frame.contentWindow.postMessage(
        {
          type: "casa-init",
          state: projected,
          mode: frame.dataset.mode,
          code:
            new URLSearchParams(location.hash.split("?")[1] || "").get(
              "code",
            ) || "",
          canWrite: root.EngefexAccess?.canWrite(permissions(view)) !== false,
        },
        location.origin,
      );
    });
  }

  function status(message, error = false) {
    const label = document.getElementById("casa-save-status");
    if (label) {
      label.textContent = message;
      label.classList.toggle("casa-error", error);
    }
  }
  async function receive(event) {
    if (
      event.origin !== location.origin ||
      !session ||
      event.source !== session.frame.contentWindow
    )
      return;
    const message = event.data || {};
    if (message.type === "casa-ready") {
      status("Dados da obra carregados.");
      return;
    }
    if (message.type === "casa-dirty") {
      session.dirty = message.dirty === true;
      return;
    }
    if (message.type === "casa-status") {
      status(message.message);
      return;
    }
    if (message.type !== "casa-save") return;
    const current = session;
    const respond = (data) =>
      current.frame.contentWindow.postMessage(
        { type: "casa-saved", id: message.id, ...data },
        location.origin,
      );
    if (busy) {
      respond({ error: "Aguarde o salvamento em andamento." });
      return;
    }
    busy = true;
    try {
      if (root.EngefexAccess?.canWrite(permissions(current.view)) === false)
        throw Error("Seu acesso a esta ferramenta é somente de leitura.");
      const source = context.getState();
      if (JSON.stringify(source) !== current.snapshot)
        throw Error(
          "Os dados da obra mudaram. Reabra esta ferramenta para trabalhar com a versão atual.",
        );
      const next = root.CasaModel.applyState(
        source,
        current.projectId,
        current.projected,
        message.state,
        root.EngefexManager,
        root.Obras,
      );
      const budgetChanged =
        JSON.stringify(source.budgetItems) !== JSON.stringify(next.budgetItems);
      const scheduleChanged =
        JSON.stringify(source.activities) !== JSON.stringify(next.activities);
      if (budgetChanged && root.EngefexAccess?.canWrite("budget") === false)
        throw Error("Permissão de edição do orçamento obrigatória.");
      if (scheduleChanged && root.EngefexAccess?.canWrite("timeline") === false)
        throw Error("Permissão de edição do cronograma obrigatória.");
      status("Salvando no banco da obra…");
      const saved = await context.save(next);
      if (saved === false) throw Error("O banco não confirmou o salvamento.");
      current.source = context.getState();
      current.snapshot = JSON.stringify(current.source);
      current.dirty = false;
      status("Alteração confirmada no banco da obra.");
      respond({ ok: true });
    } catch (error) {
      status(error.message, true);
      respond({ error: error.message });
    } finally {
      busy = false;
    }
  }
  root.addEventListener("message", receive);
  root.document.addEventListener(
    "click",
    (event) => {
      if (busy && event.target.closest?.('a[href^="#"]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        status("Aguarde a confirmação do salvamento antes de trocar de tela.");
      }
    },
    true,
  );
  root.CasaTools = {
    modes,
    actions,
    page,
    bind,
    permissions,
    budgetFilters,
    budgetTree,
    importLegacy(legacy, source, projectId) {
      const project =
        source.projects.find((row) => row.id === projectId) ||
        (source.projects.length === 1 ? source.projects[0] : null);
      if (!project)
        throw Error("Selecione a obra que receberá o backup anterior.");
      return root.CasaModel.importLegacy(
        source,
        project.id,
        legacy,
        root.EngefexManager,
        root.Obras,
        root.FULL_SEED || {},
      );
    },
    init(value) {
      context = value;
    },
    updated() {
      if (!session || busy || session.dirty) return;
      const source = context.getState();
      session.snapshot = JSON.stringify(source);
      session.projected = root.CasaModel.projectState(
        source,
        session.projectId,
        root.FULL_SEED || {},
      );
      session.frame.contentWindow.postMessage(
        {
          type: "casa-init",
          state: session.projected,
          mode: session.frame.dataset.mode,
          code:
            new URLSearchParams(location.hash.split("?")[1] || "").get(
              "code",
            ) || "",
          canWrite:
            root.EngefexAccess?.canWrite(permissions(session.view)) !== false,
        },
        location.origin,
      );
    },
    get active() {
      return (
        !!session &&
        document.getElementById("casa-feature-frame") === session.frame
      );
    },
    isDirty() {
      return busy || !!session?.dirty;
    },
  };
})(window);
