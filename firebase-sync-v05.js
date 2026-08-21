// Firebase/Auth/Firestore para a versão completa do aplicativo.
(function(){
  if(typeof SEED==='undefined' || typeof state==='undefined') return;

  const style=document.createElement('style');
  style.textContent=`.auth-screen{position:fixed;inset:0;background:linear-gradient(135deg,#102f50,#245b92);z-index:500;display:none;align-items:center;justify-content:center;padding:18px}.auth-screen.open{display:flex}.auth-card{background:#fff;width:min(420px,100%);border-radius:20px;padding:22px;box-shadow:0 20px 60px #0005}.auth-card h2{margin:0 0 5px;color:#153a62}.auth-card p{color:#667380;font-size:13px;margin:0 0 15px}.sync-pill{position:absolute;right:14px;bottom:9px;font-size:10px;background:#ffffff24;padding:4px 8px;border-radius:99px;color:#fff}.sync-pill.ok{background:#1f8a5b}.sync-pill.warn{background:#c77816}`;
  document.head.appendChild(style);

  if(!document.getElementById('authScreen')){
    const authBox=document.createElement('div');
    authBox.id='authScreen';authBox.className='auth-screen';
    authBox.innerHTML=`<div class="auth-card"><h2>Controle da Obra</h2><p>Entre para sincronizar a obra entre celular e computador.</p><label>E-mail</label><input id="loginEmail" type="email" autocomplete="email"><label>Senha</label><input id="loginPassword" type="password" autocomplete="current-password"><button class="btn" style="width:100%;margin-top:14px" onclick="loginFirebase()">Entrar</button><div id="loginError" style="color:#b94040;font-size:12px;margin-top:10px"></div></div>`;
    document.body.prepend(authBox);
  }
  const header=document.querySelector('.top');
  if(header && !document.getElementById('syncPill')){
    const pill=document.createElement('span');pill.id='syncPill';pill.className='sync-pill warn';pill.textContent='conectando…';header.appendChild(pill);
  }

  const config={
    apiKey:'AIzaSyDuEvZt8yvQF1OoiQoeYd9YSjiZPc1Wjgg',
    authDomain:'controle-obra-casa-a3d59.firebaseapp.com',
    projectId:'controle-obra-casa-a3d59',
    storageBucket:'controle-obra-casa-a3d59.firebasestorage.app',
    messagingSenderId:'157648632089',
    appId:'1:157648632089:web:9e9fef4de3cd6dd451ad88'
  };
  if(!firebase.apps.length) firebase.initializeApp(config);
  const auth=firebase.auth(),db=firebase.firestore();
  db.enablePersistence({synchronizeTabs:true}).catch(()=>{});
  const PROJECT_DOC='casa-ramon-talita';
  const fullSeed=JSON.parse(JSON.stringify(SEED));
  let cloudReady=false,applyingRemote=false,unsubscribeCloud=null;

  function syncStatus(text,ok=false){const e=document.getElementById('syncPill');if(e){e.textContent=text;e.className='sync-pill '+(ok?'ok':'warn')}}
  function normalize(remote){
    const r=remote||{},fresh=JSON.parse(JSON.stringify(fullSeed));
    fresh.costs=Array.isArray(r.costs)?r.costs:[];
    fresh.purchasePlan=(r.purchasePlan&&typeof r.purchasePlan==='object')?r.purchasePlan:{};
    const oldTasks=new Map((r.tasks||[]).map(t=>[t.id,t]));
    fresh.tasks=(fresh.tasks||[]).map(t=>{const o=oldTasks.get(t.id);return o?{...t,progress:+o.progress||0,notes:o.notes||''}:t});
    const oldPls=new Map((r.pls||[]).map(p=>[p.stage,p]));
    fresh.pls=(fresh.pls||[]).map(p=>{const o=oldPls.get(p.stage);return o?{...p,status:o.status||p.status,notes:o.notes||''}:p});
    return fresh;
  }

  state=normalize(state);
  try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}

  window.save=async function(){
    try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
    renderAll();
    if(auth.currentUser&&cloudReady&&!applyingRemote){
      syncStatus('salvando…');
      try{await db.collection('projects').doc(PROJECT_DOC).set({state,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:auth.currentUser.email||auth.currentUser.uid});syncStatus('sincronizado',true)}
      catch(e){console.error(e);syncStatus('offline/local')}
    }
  };

  async function startCloud(user){
    if(unsubscribeCloud)unsubscribeCloud();
    const ref=db.collection('projects').doc(PROJECT_DOC);
    try{
      const snap=await ref.get();
      if(snap.exists&&snap.data()?.state){applyingRemote=true;state=normalize(snap.data().state);localStorage.setItem(KEY,JSON.stringify(state));renderAll();applyingRemote=false}
      else await ref.set({state,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:user.email||user.uid});
      cloudReady=true;syncStatus('sincronizado',true);
      // Atualiza o documento antigo/reduzido para a base completa sem perder dados do usuário.
      await window.save();
      unsubscribeCloud=ref.onSnapshot(s=>{
        if(!s.exists||!s.data()?.state)return;
        applyingRemote=true;state=normalize(s.data().state);localStorage.setItem(KEY,JSON.stringify(state));renderAll();applyingRemote=false;syncStatus('sincronizado',true);
      },()=>syncStatus('offline/local'));
    }catch(e){console.error(e);syncStatus('sem acesso ao banco')}
  }

  window.loginFirebase=async function(){
    const err=document.getElementById('loginError');err.textContent='';
    try{await auth.signInWithEmailAndPassword(document.getElementById('loginEmail').value.trim(),document.getElementById('loginPassword').value)}
    catch(e){err.textContent='Não foi possível entrar. Confira e-mail e senha.'}
  };
  window.logoutFirebase=function(){auth.signOut()};
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
  auth.onAuthStateChanged(user=>{
    const screen=document.getElementById('authScreen');
    if(user){screen.classList.remove('open');startCloud(user)}
    else{cloudReady=false;screen.classList.add('open');syncStatus('login necessário')}
  });

  const oldSettings=window.renderSettings;
  window.renderSettings=function(){
    oldSettings();
    const el=document.getElementById('settings');
    if(el&&!document.getElementById('logoutFirebaseBtn')) el.insertAdjacentHTML('beforeend','<div class="section-title">Conta compartilhada</div><div class="card"><p style="font-size:13px;color:var(--muted)">Dados sincronizados com o Firebase e mantidos também neste aparelho.</p><button id="logoutFirebaseBtn" class="btn alt" onclick="logoutFirebase()">Sair da conta</button></div>');
  };
  renderAll();
})();
