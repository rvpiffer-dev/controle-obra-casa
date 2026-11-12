(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const localSnapshots = [];
  for (const key of ['controleObraCasaRT_v3', 'controleObraCasaRT_v2', 'controleObraCasaRT_v1']) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      if (value?.project && Array.isArray(value.tasks)) localSnapshots.push({key, state:value});
    } catch (_) { /* A corrupt local copy must not block the cloud export. */ }
  }
  let exported = null, busy = false;
  function download(bundle, suffix) {
    const bytes = JSON.stringify(bundle, null, 2);
    const url = URL.createObjectURL(new Blob([bytes], {type:'application/json'}));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'obra-casa-' + suffix + '-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    document.body.appendChild(anchor);
    anchor.click();anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    byId('message').textContent = 'Arquivo gerado. Envie o JSON baixado nesta conversa para concluir a migração.';
  }
  byId('local').hidden = !localSnapshots.length;
  byId('downloadLocal').onclick = () => download({format:'casa-legacy-export-v1',source:'local',exportedAt:new Date().toISOString(),state:localSnapshots[0].state,localSnapshots}, 'aparelho');
  if (typeof firebase === 'undefined' || typeof firebaseConfig === 'undefined') {
    byId('loading').hidden = true;
    byId('message').textContent = 'Não foi possível carregar a conexão. Confira a internet e reabra esta página.';
    return;
  }
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth(), db = firebase.firestore();
  async function readCloud(user) {
    if (busy) return;
    busy = true;exported = null;
    byId('ready').hidden = true;byId('retry').hidden = true;
    byId('loading').hidden = false;byId('loading').textContent = 'Consultando os dados atuais da obra…';
    byId('message').textContent = '';
    try {
      const snapshot = await db.collection('projects').doc('casa-ramon-talita').get({source:'server'});
      if (!snapshot.exists) throw Error('empty');
      const record = snapshot.data(), state = record?.state;
      if (!state?.project || !Array.isArray(state.tasks)) throw Error('invalid');
      exported = {format:'casa-legacy-export-v1',source:'firebase',exportedAt:new Date().toISOString(),sourceDocument:'projects/casa-ramon-talita',sourceUpdatedAt:record.updatedAt?.toDate?.().toISOString() || null,state,sourceRecord:record,localSnapshots};
      const count = name => Array.isArray(state[name]) ? state[name].length : 0;
      byId('summary').textContent = (state.project.name || 'Casa Ramon e Talita') + ' · ' + count('tasks') + ' atividades · ' + count('services') + ' serviços · ' + count('costs') + ' custos. Todos os campos do documento serão incluídos no arquivo.';
      byId('updated').textContent = exported.sourceUpdatedAt ? 'Última atualização da obra: ' + new Date(exported.sourceUpdatedAt).toLocaleString('pt-BR') : 'Consulta realizada agora diretamente na base da obra.';
      byId('ready').hidden = false;
    } catch (error) {
      byId('message').textContent = error.message === 'empty' ? 'Nenhum registro da casa foi encontrado nesta base.' : error.message === 'invalid' ? 'O registro encontrado não tem o formato esperado. A exportação foi interrompida.' : 'Não foi possível consultar a obra. Confira a conexão e se esta conta tem acesso ao aplicativo antigo.';
      byId('retry').hidden = false;
    } finally { busy = false;byId('loading').hidden = true; }
  }
  byId('retry').onclick = () => { if (auth.currentUser) readCloud(auth.currentUser); };
  byId('download').onclick = () => { if (exported) download(exported, 'completa'); };
  byId('login').onsubmit = async event => {
    event.preventDefault();byId('enter').disabled = true;byId('message').textContent = '';
    try { await auth.signInWithEmailAndPassword(byId('email').value.trim(), byId('password').value);byId('password').value = ''; }
    catch (_) { byId('message').textContent = 'Não foi possível entrar. Confira o e-mail e a senha usados no aplicativo antigo.'; }
    finally { byId('enter').disabled = false; }
  };
  auth.onAuthStateChanged(user => {
    byId('loading').hidden = true;byId('login').hidden = !!user;byId('ready').hidden = true;
    if (user) readCloud(user);
    else exported = null;
  }, () => {byId('loading').hidden = true;byId('message').textContent = 'Não foi possível verificar o acesso. Confira a conexão e reabra esta página.';});
})();
