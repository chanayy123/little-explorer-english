(() => {
  'use strict';
  const B=window.LessonBook,E=B.escape,app=document.getElementById('app');
  let library,selectedWeek=B.monday(B.today()),prefs=B.preferences(),toastTimer;
  const toast=text=>{const el=document.getElementById('toast');el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3200);};
  const voice=window.createLessonVoice({settings:()=>prefs,save:()=>B.savePreferences(prefs),toast});
  function card(lesson,date){
    if(!lesson)return `<div class="course-card empty"><span class="day-label">${date.slice(5).replace('-','月')}日</span><span class="card-art">✧</span><h3>这一天自由安排</h3><p>没有安排新任务，可以重玩旧课。</p></div>`;
    const open=B.available(lesson),p=B.progress(lesson),isToday=lesson.date===B.today();
    if(!open)return `<div class="course-card locked"><span class="day-label">${lesson.date.slice(5).replace('-','月')}日</span><span class="card-art lock-art">⌑</span><span class="course-status">未解锁</span><h3>等待新一天的发现</h3><p>当天就可以打开，不用等到晚上。</p></div>`;
    return `<a class="course-card ${isToday?'is-today':''} ${p.done?'is-done':''}" href="${B.url(lesson)}"><div class="card-top"><span class="day-label">${lesson.date.slice(5).replace('-','月')}日</span><span class="course-status">${p.done?'★ 已完成':p.started?'继续学习':isToday?'今天':'待学习'}</span></div>${['review','delivery'].includes(lesson.type)?'<span class="card-art review-art">★</span>':B.art(lesson.art,'card-art')}<span class="card-word" lang="en">${['review','delivery'].includes(lesson.type)?'REVIEW':E(lesson.word)}</span><h3>${E(lesson.title)}</h3><p>${['review','delivery'].includes(lesson.type)?'把这周的发现用起来':E(lesson.meaning)+' · 听、说、拼、写'}</p><div class="card-bottom"><span>${lesson.minutes} 分钟</span><span>${p.stars} / ${p.total} ★</span></div></a>`;
  }
  function render(){
    if(!library)return;B.renderGrowth(library);
    const key=B.today(),all=library.lessons.filter(c=>!c.supplemental),open=all.filter(c=>B.available(c,key)),current=all.find(c=>c.date===key),recent=open.at(-1),focus=current||recent;
    const weeks=[...new Set(all.map(c=>B.monday(c.date)))];let index=weeks.indexOf(selectedWeek);
    if(index<0){selectedWeek=weeks.includes(B.monday(key))?B.monday(key):weeks.filter(w=>w<=B.monday(key)).at(-1)||weeks[0]||B.monday(key);index=weeks.indexOf(selectedWeek);}
    const week=all.filter(c=>B.monday(c.date)===selectedWeek),finished=open.filter(c=>B.progress(c).done).length;
    const p=focus?B.progress(focus):null;
    app.innerHTML=`<section class="book-hero"><div><span class="eyebrow">小小探险家 · 英语课程书架</span><h1>每天一个小发现，<br>搭起你的英语世界。</h1><p>听声音，看画面，动手玩一玩。<br>和妈妈一起，把英语用起来。</p><div class="hero-meta"><span>每天约 8～10 分钟</span><i class="meta-dot"></i><span>周一到周五新词 · 周末动手复习</span><i class="meta-dot"></i><span>放学后随时学</span></div></div><img src="assets/world.svg" alt="有树和积木的绿色方块小岛"></section><section class="today-panel" aria-labelledby="today-title"><div><span class="eyebrow">${current?'今天的探险':'今天自由复习'} · ${key.replaceAll('-','.')}</span><h2 id="today-title">${current?E(current.title):'旧朋友，也值得再见一次。'}</h2><p>${current?(['review','delivery'].includes(current.type)?'把学过的单词用在小挑战里。':`今天认识 <b lang="en">${E(current.word)}</b> · ${E(current.meaning)}`):'今天没有新课。可以选择以前的课程，想重玩几次都可以。'}</p></div>${focus?`<a class="button primary" href="${B.url(focus)}">${current?(p.done?'重玩今天的课':p.started?'继续今天的课':'开始今天的探险'):'打开最近的课程'} <span aria-hidden="true">↗</span></a>`:'<span>第一课还在准备中</span>'}</section><section class="bookshelf" aria-labelledby="week-title"><div class="shelf-heading"><div><span class="eyebrow">已完成 ${finished} 课 · 每一课都留在这里</span><h2 id="week-title">${selectedWeek.slice(5).replace('-','月')}日 — ${B.addDays(selectedWeek,6).slice(5).replace('-','月')}日</h2><p>${E(week[0]?.theme||'英语小探险')}</p></div><div class="week-tools"><button class="icon-button" data-action="week-prev" aria-label="上一周" ${index<=0?'disabled':''}>← 上一周</button><button class="icon-button" data-action="week-now">本周</button><button class="icon-button" data-action="week-next" aria-label="下一周" ${index>=weeks.length-1?'disabled':''}>下一周 →</button></div></div><div class="weekday-row" aria-hidden="true">${['周一','周二','周三','周四','周五','周六','周日'].map(x=>`<span>${x}</span>`).join('')}</div><div class="course-grid">${[0,1,2,3,4,5,6].map(n=>{const date=B.addDays(selectedWeek,n);return card(all.find(c=>c.date===date),date);}).join('')}</div></section>${library.lessons.some(c=>c.supplemental&&B.available(c)&&B.monday(c.date)===selectedWeek)?`<section class="book-note"><p>以前安排的附加复习仍保留进度： ${library.lessons.filter(c=>c.supplemental&&B.available(c)&&B.monday(c.date)===selectedWeek).map(c=>`<a href="${B.url(c)}">${E(c.title)}</a>`).join(' · ')}</p></section>`:''}<section class="book-note"><span aria-hidden="true">♡</span><p><b>不用赶时间，也不用赶进度。</b><br>当天课程从北京时间零点开放。漏学的课留在书架里；周末用本周的词完成交付小任务。</p></section>`;
    document.querySelector('.lesson-badge').textContent='英语课程书架';
    document.querySelector('.audio-toggle').setAttribute('aria-pressed',String(prefs.sound));
    document.querySelector('.audio-toggle').setAttribute('aria-label',prefs.sound?'关闭语音':'开启语音');
    document.querySelector('.sound-label').textContent=prefs.sound?'语音开':'语音关';
  }
  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-action]');if(!target||target.disabled)return;
    const action=target.dataset.action;
    const weeks=library?[...new Set(library.lessons.map(c=>B.monday(c.date)))]:[];
    if(action==='week-prev'||action==='week-next'){selectedWeek=weeks[weeks.indexOf(selectedWeek)+(action==='week-prev'?-1:1)]||selectedWeek;render();}
    if(action==='week-now'||action==='home'){if(target.tagName==='A')event.preventDefault();selectedWeek=B.monday(B.today());render();}
    if(action==='voices'){document.getElementById('parent-dialog').close();voice.open();}
    if(action==='close-voices')voice.close();
    if(action==='voice-demo-en')voice.say(['block','This is a block.','I have a block.'],false,true);
    if(action==='voice-demo-zh')voice.say({text:'今天的新朋友，方块。我们一起听一听。',lang:'zh-CN'},false,true);
    if(action==='sound'){prefs.sound=!prefs.sound;B.savePreferences(prefs);voice.stop();render();}
    if(action==='parent')document.getElementById('parent-dialog').showModal();
    if(action==='close-parent')document.getElementById('parent-dialog').close();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)voice.stop();else render();});
  window.addEventListener('pageshow',render);window.addEventListener('growthchange',()=>{if(library)B.renderGrowth(library);});
  setInterval(()=>{if(!document.hidden)render();},60000);
  B.load().then(data=>{library=data;render();}).catch(()=>{app.innerHTML='<section class="complete-panel"><h1>课程还没加载好。</h1><p>检查网络，再刷新一下页面。你的练习进度仍保存在这台设备上。</p><button class="button primary" data-action="reload">重新加载</button></section>';document.querySelector('[data-action="reload"]').addEventListener('click',()=>location.reload());});
})();
