(() => {
  'use strict';
  const PREFS='little-explorer-voice-v1';
  const defaults={sound:true,voiceMode:'auto',recordingVoice:'jenny',englishVoice:'auto',chineseVoice:'auto',speechRate:1};
  const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateKey=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).reduce((o,p)=>(o[p.type]=p.value,o),{});
  const today=(date=new Date())=>{const p=dateKey(date);return `${p.year}-${p.month}-${p.day}`;};
  const addDays=(key,n)=>{const date=new Date(key+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+n);return date.toISOString().slice(0,10);};
  const monday=key=>addDays(key,-((new Date(key+'T12:00:00Z').getUTCDay()+6)%7));
  const available=(lesson,key=today())=>Boolean(lesson&&lesson.date<=key);
  const read=key=>{try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
  const write=(key,value)=>{try{const raw=JSON.stringify(value);localStorage.setItem(key,raw);return localStorage.getItem(key)===raw;}catch{return false;}};
  const storageKey=lesson=>lesson.storageKey||`little-explorer-course-${lesson.id}-v1`;
  const total=lesson=>lesson.type==='delivery'?lesson.missions.length:lesson.type==='review'?lesson.questions.length+1:6;
  const progress=lesson=>{const state=read(storageKey(lesson));const stars=Array.isArray(state?.completed)?new Set(state.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<total(lesson))).size:0;return {stars,total:total(lesson),done:stars===total(lesson),started:stars>0||state?.screen==='lesson'};};
  const preferences=()=>{const raw=read(PREFS)||read('little-explorer-block-v1')||{};return Object.fromEntries(Object.keys(defaults).map(key=>[key,raw[key]??defaults[key]]));};
  const savePreferences=state=>write(PREFS,Object.fromEntries(Object.keys(defaults).map(key=>[key,state[key]??defaults[key]])));
  const url=lesson=>'lesson.html?id='+encodeURIComponent(lesson.id);
  const art=(kind,cls='')=>`<svg class="book-object ${escape(cls)}" viewBox="0 0 200 200" aria-hidden="true"><use href="assets/lesson-art.svg#${escape(kind)}"></use></svg>`;
  const names={block:'方块',tree:'树',house:'房子',water:'水',seed:'种子'};
  const load=async()=>{const response=await fetch(new URL('assets/lessons.json',document.baseURI),{cache:'no-cache'});if(!response.ok)throw new Error('课程暂未加载');const data=await response.json();if(!Array.isArray(data.lessons))throw new Error('课程清单无效');for(const c of data.lessons)if(c.word&&c.meaning)names[c.art||c.word]=c.meaning;return {...data,lessons:[...data.lessons].sort((a,b)=>a.date.localeCompare(b.date))};};
  function renderGrowth(library){const panel=document.getElementById('growth-panel');if(!panel||!window.LessonBook.growth||!library)return;const g=window.LessonBook.growth.reconcile(library),warning=[g.warning,window.LessonBook.progressSaveFailed?'本课进度暂未保存，请保留当前页面，检查浏览器存储后再试。':''].filter(Boolean).join(' ');panel.innerHTML=`<div class="growth-avatar"><svg viewBox="285 170 150 220" role="img" aria-label="同一位小探险家"><image href="assets/world.svg" width="660" height="540"/></svg></div><div class="growth-main"><span class="eyebrow">同一个小探险家 · 跨主题成长</span>${g.available===false?'<h2>成长记录暂时无法读取</h2>':`<h2>冒险等级 ${g.level} <small>累计 ${g.xp} 经验 · ${g.stars} 颗完成星</small></h2><progress max="${g.xpPerLevel||100}" value="${g.levelProgress}" aria-label="距离下个冒险等级的进度"></progress>`}<p>每个关卡首次完成 +${g.xpPerStage||10} 经验；每${g.xpPerLevel||100}经验升一级。重玩不重复加分，不是英语能力等级。</p><div class="growth-marks">${g.themes.length?g.themes.map(t=>`<span class="chip">✦ ${escape(t.title)}</span>`).join(''):'完成某个主题的一课，就留下一个主题印记。'}</div>${warning?`<p class="storage-warning" role="alert">${escape(warning)}</p>`:'<small>成长保存在这台设备上；漏学和休息不会扣分。</small>'}</div>`;}
  window.LessonBook={renderGrowth,escape,today,addDays,monday,available,read,write,storageKey,total,progress,preferences,savePreferences,url,art,names,load};
})();
