(() => {
  'use strict';
  const B=window.LessonBook,app=document.getElementById('app');
  B.load().then(library=>{
    const id=new URLSearchParams(location.search).get('id')||'2026-10-08-block';
    const course=library.lessons.find(c=>c.id===id);
    if(!B.available(course)){document.title='课程尚未开放 · 小小探险家';app.innerHTML='<section class="complete-panel"><div class="medal">✧</div><h1>这场探险还没开放。</h1><p>当天再来，或者先重玩以前的课程。</p><a class="button primary" href="index.html">回到课程书架</a></section>';document.querySelector('.top-actions').hidden=true;return;}
    window.ACTIVE_COURSE=course;window.COURSE_LIBRARY=library;
    document.title=course.title+' · 小小探险家';
    document.querySelector('.lesson-badge').textContent=course.date.slice(5).replace('-','月')+'日 · '+(course.type==='review'?'复习课':'英语小课');
    const older=library.lessons.filter(c=>c.date<course.date&&B.available(c)).at(-1),newer=library.lessons.find(c=>c.date>course.date&&B.available(c));
    const nav=document.createElement('nav');nav.className='course-neighbors';nav.setAttribute('aria-label','切换课程');nav.innerHTML=(older?`<a href="${B.url(older)}">← 上一课</a>`:'<span></span>')+'<a href="index.html">回到课程书架</a>'+(newer?`<a href="${B.url(newer)}">下一课 →</a>`:'<span></span>');app.after(nav);
    if(course.type==='block'){const previous=B.read(B.storageKey(course));if(previous){Object.assign(previous,B.preferences());B.write(B.storageKey(course),previous);}}
    const script=document.createElement('script');script.src=(course.type==='block'?'app.js':'course-engine.js')+'?v=3';script.onerror=()=>{app.textContent='课程暂未打开，请刷新页面再试。';};document.body.appendChild(script);
  }).catch(()=>{app.innerHTML='<section class="complete-panel"><h1>课程还没加载好。</h1><p>检查网络，再刷新一下页面。</p><a class="button primary" href="index.html">回到课程书架</a></section>';});
})();
