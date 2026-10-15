(() => {
  'use strict';
  const B=window.LessonBook,C=window.ACTIVE_COURSE,E=B.escape,app=document.getElementById('app');
  const fresh=()=>({screen:'home',stage:0,completed:[],assisted:[],attempt:0,selected:null,heard:false,...B.preferences()});
  function read(){const raw=B.read(B.storageKey(C));if(!raw||!['home','lesson','complete'].includes(raw.screen))return fresh();const s={...fresh(),...raw,...B.preferences()};s.stage=Number.isInteger(s.stage)&&s.stage>=0&&s.stage<C.missions.length?s.stage:0;s.completed=[...new Set((Array.isArray(s.completed)?s.completed:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<C.missions.length))];s.assisted=[...new Set((Array.isArray(s.assisted)?s.assisted:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<C.missions.length))];s.attempt=Math.max(0,Math.min(100,Number(s.attempt)||0));s.selected=s.selected===C.missions[s.stage].word?s.selected:null;s.heard=false;if(s.screen==='complete'&&s.completed.length!==C.missions.length)s.screen='lesson';return s;}
  let state=read(),toastTimer;
  const save=()=>{B.progressSaveFailed=!B.write(B.storageKey(C),state);B.savePreferences(state);B.renderGrowth(window.COURSE_LIBRARY);};
  const toast=text=>{const el=document.getElementById('toast');el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3000);};
  const voice=window.createLessonVoice({settings:()=>state,save,toast});
  const done=()=>state.completed.includes(state.stage),mission=()=>C.missions[state.stage];
  function listen(){const stage=state.stage;voice.say({text:mission().instruction,lang:'en-US'},false,true,()=>{if(state.screen!=='lesson'||state.stage!==stage)return;state.heard=true;save();render();});}
  function render(){const m=mission(),solved=done();document.querySelector('.sound-label').textContent=state.sound?'语音开':'语音关';document.querySelector('.audio-toggle').setAttribute('aria-pressed',String(state.sound));
    if(state.screen==='home'){const refs=C.reviewOf.map(id=>window.COURSE_LIBRARY.lessons.find(c=>c.id===id)).filter(Boolean);app.innerHTML=`<section class="complete-panel"><span class="eyebrow">${E(C.date)} · 周末动手复习</span><h1>${E(C.title)}</h1><p>听指令 → 选图片 → 点目标交付。让场景变一变！<br>只用本周的五个词，记不住就看中文提示。</p><p>先学过这些词了吗？漏学的可以先打开：</p><div class="button-row">${refs.map(c=>`<a class="chip" href="${B.url(c)}">${E(c.word)}</a>`).join('')}</div><button class="button primary" data-action="start">${state.completed.length?'继续任务':'开始任务'} →</button></section>`;return;}
    if(state.screen==='complete'){app.innerHTML=`<section class="complete-panel"><div class="medal">★</div><h1>五次交付，场景变样啦！</h1><p>今天把本周的词用起来了。</p><p>${state.assisted.length?`${state.assisted.length} 个任务用过提示。这是辅助完成，下次可以再听再试。`:'这次没有使用提示。以后还可以换个场景再试。'}<br>完成记录不等于已经掌握单词。</p><div class="button-row"><a class="button primary" href="index.html">回到课程书架</a><button class="button secondary" data-action="ask-restart">再玩一次</button></div></section>`;return;}
    const order=[...m.options];for(let n=0;n<state.attempt%order.length;n++)order.push(order.shift());
    app.innerHTML=`<section class="lesson-shell"><div class="lesson-head"><button class="back-link" data-action="home">← 本课首页</button><span class="star-count">★ ${state.completed.length} / ${C.missions.length}</span></div><div class="lesson-card delivery-card"><span class="eyebrow">周末任务 ${state.stage+1} / ${C.missions.length}</span><h2>听一听，把需要的物品送到目标</h2><div class="listen-row"><button class="speak-button" data-action="listen">◖)) 听指令</button><button class="button secondary small" data-action="help">中文提示 / 示范</button></div><p class="delivery-help" role="status">${state.assisted.includes(state.stage)?E(m.help):state.heard?'声音听完啦，选出需要的图片。':'请点“听指令”，完整听完再选图片。'}</p><div class="question-grid">${order.map(word=>`<button class="object-option delivery-object ${state.selected===word?'selected':''}" data-action="select" data-word="${E(word)}" aria-label="${E(B.names[word]||word)}" ${!state.heard||solved||state.selected?'disabled':''} style="--instance:${state.attempt%2?'.9':'1'}">${B.art(word)}${state.selected===word?'<span class="answer-check">✓</span>':''}</button>`).join('')}</div><div class="delivery-scene ${solved?'is-delivered':''}" aria-live="polite"><span class="stage-tag">${solved?'交付后':'交付前'}</span><p>${E(solved?m.after:m.before)}</p>${solved?`<div class="delivered-object">${B.art(m.word)}</div>`:'<div class="delivery-empty" aria-hidden="true">＋</div>'}<button class="button ${solved?'secondary':'primary'} delivery-target" data-action="deliver" ${!state.selected||solved?'disabled':''}>${solved?'✓ 已送到':'送到：'}${E(m.target)}</button></div><div class="feedback" role="status">${solved?'场景改变了！'+(state.assisted.includes(state.stage)?' 这次用了提示，下次再试。':''):state.selected?'选好啦！现在点下面的目标，把物品送过去。':''}</div><div class="lesson-bottom"><p>选错会有提示，再换个摆法试一次。</p><button class="button primary" data-action="next" ${solved?'':'disabled'}>${state.stage===C.missions.length-1?'看看今天的收获':'下个任务'} →</button></div></div></section>`;
  }
  function help(){if(!state.assisted.includes(state.stage))state.assisted.push(state.stage);save();render();voice.say({text:mission().help,lang:'zh-CN'},false,true);}
  document.addEventListener('click',event=>{const el=event.target.closest('[data-action]');if(!el||el.disabled)return;switch(el.dataset.action){
    case 'start':voice.stop();state.screen='lesson';save();render();break;
    case 'home':voice.stop();state.screen='home';save();render();break;
    case 'listen':listen();break;
    case 'help':help();break;
    case 'select':if(state.screen!=='lesson'||!state.heard||state.selected||done())break;if(el.dataset.word!==mission().word){state.attempt++;state.heard=false;state.selected=null;help();}else{state.selected=mission().word;save();render();}break;
    case 'deliver':if(state.screen!=='lesson'||state.selected!==mission().word||done())break;voice.stop();state.completed.push(state.stage);save();render();break;
    case 'next':if(!done())break;voice.stop();if(state.stage===C.missions.length-1){state.screen='complete';state.finishedAt=new Date().toISOString();}else{state.stage++;state.attempt=0;state.selected=null;state.heard=false;}save();render();break;
    case 'sound':state.sound=!state.sound;voice.stop();save();render();break;
    case 'voices':document.getElementById('parent-dialog').close();voice.open();break;
    case 'close-voices':voice.close();break;
    case 'voice-demo-en':voice.say(mission().instruction,false,true);break;
    case 'voice-demo-zh':voice.say({text:mission().help,lang:'zh-CN'},false,true);break;
    case 'parent':document.getElementById('parent-dialog').showModal();break;
    case 'close-parent':document.getElementById('parent-dialog').close();break;
    case 'ask-restart':voice.stop();document.getElementById('restart-dialog').showModal();break;
    case 'cancel-restart':document.getElementById('restart-dialog').close();break;
    case 'restart':voice.stop();document.getElementById('restart-dialog').close();state=fresh();state.screen='lesson';save();render();break;
  }});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)voice.stop();});window.addEventListener('pagehide',()=>{voice.stop();save();});
  for(const id of ['parent-dialog','restart-dialog'])document.getElementById(id).addEventListener('cancel',()=>voice.stop());
  const parent=document.getElementById('parent-dialog');parent.querySelector('.dialog-lead').textContent='周末只复习本周五词。听指令，选物，再点目标交付；不录音、不上传学习记录。';parent.querySelector('.guide-list').innerHTML='<p>不熟悉的指令可点中文提示；选错后会换个摆法再试。用过提示会记录为辅助完成，不判断掌握程度。可以先回书架补学漏掉的词。</p>';
  render();
})();
