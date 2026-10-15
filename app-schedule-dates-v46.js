// v46 — edição de datas das atividades e reprogramação global do cronograma.
// As alterações ficam em taskScheduleOverrides para sobreviver à normalização v45/Firebase.
(function () {
  if (window.__scheduleDatesV46) return;
  if (typeof window.taskForm !== 'function' || typeof window.updateTask !== 'function' || typeof window.renderSchedule !== 'function') return;

  const previousTaskForm = window.taskForm;
  const previousUpdateTask = window.updateTask;
  const previousRenderSchedule = window.renderSchedule;
  const DAY = 86400000;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iso = d => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
  function parseDate(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!m) return null;
    const d = new Date(Date.UTC(+m[1], +m[2]-1, +m[3]));
    return iso(d) === value ? d : null;
  }
  function shiftDate(value, days) { const d = parseDate(value); return d ? iso(new Date(d.getTime() + days * DAY)) : null; }
  function workdays(start, finish) {
    const a = parseDate(start), b = parseDate(finish);
    if (!a || !b || a > b || (b-a)/DAY > 3650) return null;
    let n = 0;
    for (let time = a.getTime(); time <= b.getTime(); time += DAY) {
      const dow = new Date(time).getUTCDay();
      if (dow !== 0 && dow !== 6) n++;
    }
    return Math.max(1, n);
  }
  function overrides() {
    state.taskScheduleOverrides = state.taskScheduleOverrides && typeof state.taskScheduleOverrides === 'object' ? state.taskScheduleOverrides : {};
    return state.taskScheduleOverrides;
  }
  function task(id) { return (state.tasks || []).find(t => String(t.id) === String(id)); }

  const style = document.createElement('style');
  style.textContent = `.sch-dates-v46{padding:12px;margin:9px 0 11px;border:1px solid var(--line);border-radius:12px;background:#f8fafb}
    .sch-dates-v46 p{margin:5px 0;font-size:12px;color:var(--muted)}
    .sch-date-grid-v46{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .sch-date-hint-v46{font-size:12px;line-height:1.5;color:var(--muted);margin-top:9px}
    .sch-dates-v46 .btn{font-size:12px;padding:9px 11px}
    @media(max-width:420px){.sch-date-grid-v46{grid-template-columns:1fr}}`;
  document.head.appendChild(style);

  window.taskForm = function (id) {
    previousTaskForm.apply(this, arguments);
    const t = task(id), sheet = document.getElementById('sheet');
    const header = sheet?.querySelector('h2');
    if (!t || !header || sheet.querySelector('#taskStart46')) return;
    const isOverridden = !!(overrides()[String(id)]?.start || overrides()[String(id)]?.finish);
    header.insertAdjacentHTML('afterend', `<div class="sch-dates-v46">
      <b>Datas planejadas</b>
      <div class="sch-date-grid-v46"><div><label for="taskStart46">Início</label><input id="taskStart46" type="date" value="${esc(t.start || '')}"></div>
      <div><label for="taskFinish46">Término</label><input id="taskFinish46" type="date" value="${esc(t.finish || '')}"></div></div>
      <div class="sch-date-hint-v46">A duração em dias úteis será recalculada. O andamento e as observações serão mantidos.</div>
      ${isOverridden ? `<button type="button" class="btn alt" style="margin-top:8px" onclick="restoreTaskDatesV46(${Number(t.id)})">Restaurar datas originais</button>` : ''}
      </div>`);
  };

  window.updateTask = function (id) {
    const startInput = document.getElementById('taskStart46');
    const finishInput = document.getElementById('taskFinish46');
    if (startInput && finishInput) {
      const start = startInput.value, finish = finishInput.value;
      const duration = workdays(start, finish);
      if (duration == null) { alert('Confira as datas: informe início e término válidos, com o término igual ou posterior ao início.'); return; }
      const t = task(id);
      if (!t) return;
      if (start !== t.start || finish !== t.finish) {
        overrides()[String(id)] = {...overrides()[String(id)], start, finish, duration};
        t.start = start; t.finish = finish; t.duration = duration;
      }
    }
    return previousUpdateTask.apply(this, arguments);
  };

  window.restoreTaskDatesV46 = async function (id) {
    if (!confirm('Restaurar as datas originais desta atividade? As observações e o progresso serão preservados.')) return;
    const current = overrides(), old = {...(current[String(id)] || {})};
    delete old.start; delete old.finish; delete old.duration;
    if (Object.keys(old).length) current[String(id)] = old;
    else delete current[String(id)];
    closeModal();
    await save();
  };

  function scopeTasks() {
    const scope = document.getElementById('replanScope46')?.value || 'pending';
    return (state.tasks || []).filter(t => (scope === 'all' || Number(t.progress || 0) < 1) && parseDate(t.start) && parseDate(t.finish));
  }
  function preview() {
    const list = scopeTasks(), target = document.getElementById('replanStart46')?.value;
    const earliest = list.map(t => t.start).sort()[0];
    const base = parseDate(earliest), next = parseDate(target);
    if (!base || !next) return null;
    const delta = Math.round((next - base) / DAY);
    const last = list.map(t => t.finish).sort().at(-1);
    return {list, earliest, target, delta, last:shiftDate(last,delta)};
  }
  window.replanPreviewV46 = function () {
    const p = preview(), el = document.getElementById('replanPreview46');
    if (!el) return;
    el.textContent = p
      ? `${p.list.length} atividades · ${p.delta === 0 ? 'sem deslocamento' : `${Math.abs(p.delta)} dia(s) ${p.delta > 0 ? 'para frente' : 'para trás'}`} · previsão de término: ${date(p.last)}`
      : 'Selecione uma data válida e pelo menos uma atividade com datas.';
  };
  window.replanScopeChangeV46 = function () {
    const list = scopeTasks(), first = list.map(t => t.start).sort()[0] || '';
    const field = document.getElementById('replanStart46');
    if (field) field.value = first;
    replanPreviewV46();
  };
  window.openReplanScheduleV46 = function () {
    const list = (state.tasks || []).filter(t => Number(t.progress || 0) < 1 && parseDate(t.start) && parseDate(t.finish));
    const first = list.map(t => t.start).sort()[0] || '';
    openModal(`<h2>Reprogramar cronograma</h2>
      <p class="sch-date-hint-v46">Informe quando as atividades devem começar. O aplicativo deslocará todas as datas selecionadas pelo mesmo número de dias, sem alterar a duração, o progresso ou os custos.</p>
      <label for="replanScope46">Quais atividades alterar?</label>
      <select id="replanScope46" onchange="replanScopeChangeV46()"><option value="pending">Somente não concluídas (inclui em andamento)</option><option value="all">Todas as atividades</option></select>
      <label for="replanStart46">Nova data da primeira atividade selecionada</label>
      <input id="replanStart46" type="date" value="${esc(first)}" onchange="replanPreviewV46()" oninput="replanPreviewV46()">
      <div id="replanPreview46" class="sch-dates-v46" role="status"></div>
      <p class="sch-date-hint-v46"><b>Atenção:</b> as datas das medições da Caixa (PLS), custos já lançados e prazos de compras definidos manualmente não serão alterados. A programação automática de compras e o fluxo planejado acompanharão as novas datas das atividades.</p>
      <div class="actions"><button class="btn alt" onclick="closeModal()">Cancelar</button><button id="replanSave46" class="btn" onclick="saveReplanScheduleV46()">Aplicar datas</button></div>`);
    replanPreviewV46();
  };
  window.saveReplanScheduleV46 = async function () {
    const p = preview();
    if (!p) { alert('Selecione uma data válida e atividades com datas.'); return; }
    if (!p.delta) { closeModal(); return; }
    if (!confirm(`Deslocar ${p.list.length} atividades em ${Math.abs(p.delta)} dia(s) ${p.delta > 0 ? 'para frente' : 'para trás'}? As datas PLS não serão alteradas.`)) return;
    const btn = document.getElementById('replanSave46');
    if (btn) btn.disabled = true;
    const ov = overrides();
    p.list.forEach(t => {
      const start = shiftDate(t.start, p.delta), finish = shiftDate(t.finish, p.delta);
      ov[String(t.id)] = {...(ov[String(t.id)] || {}), start, finish};
      t.start = start; t.finish = finish;
    });
    closeModal();
    await save();
  };

  window.renderSchedule = function () {
    const result = previousRenderSchedule.apply(this, arguments);
    const root = document.getElementById('schedule'), title = root?.querySelector('.section-title');
    if (title && !root.querySelector('.schedule-replan-v46')) {
      title.insertAdjacentHTML('afterend', `<div class="sch-dates-v46 schedule-replan-v46 row" style="justify-content:space-between;align-items:center;gap:10px">
        <div><b>Precisou alterar as datas da obra?</b><p>Toque em uma atividade para editar ou reprograme todas de uma vez.</p></div>
        <button class="btn alt" onclick="openReplanScheduleV46()">Reprogramar</button></div>`);
    }
    return result;
  };
  window.__scheduleDatesV46 = true;
  renderSchedule();
})();
