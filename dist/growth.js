(() => {
  'use strict';
  const B=window.LessonBook;
  if(!B||B.growth)return;

  // Participation only: these numbers never represent vocabulary or pronunciation mastery.
  const STORE='little-explorer-growth-v1',XP_PER_STAGE=10,XP_PER_LEVEL=100;
  const MAX_LEDGER_CHARS=2*1024*1024,MAX_PROGRESS_CHARS=4*1024*1024;
  const MAX_AWARDS=20000,MAX_LESSONS=2000,MAX_COMPLETED=10000;
  const WORD_STAGES=Object.freeze(['listen','meaning','speak','use','spell','write']);
  // Numeric completion indexes are a legacy storage contract. Never insert/reorder
  // these maps to accommodate new activities: introduce an explicit migration first.
  const REVIEWS=Object.freeze({
    '2026-10-09-review':Object.freeze([
      ['block-picture','picture','block','block'],
      ['have-block-sentence','text','I have a block.','I have a block.'],
      ['this-block-sentence','text','This is a block.','This is a block.'],
      ['block-spelling','text','block','block']
    ].map(Object.freeze)),
    '2026-10-16-review':Object.freeze([
      ['tree-picture','picture','tree','tree'],
      ['house-picture','picture','house','house'],
      ['water-picture','picture','water','water'],
      ['seed-picture','picture','seed','seed'],
      ['need-water-sentence','text','I need water.','I need water.'],
      ['tree-spelling','text','tree','tree']
    ].map(Object.freeze)),
    '2026-10-23-review':Object.freeze([
      ['book-picture','picture','book','book'],
      ['pencil-picture','picture','pencil','pencil'],
      ['bag-picture','picture','bag','bag'],
      ['ball-picture','picture','ball','ball'],
      ['book-in-bag-sentence','text','My book is in the bag.','My book is in the bag.'],
      ['kick-ball-sentence','text','I can kick the ball.','I can kick the ball.'],
      ['book-spelling','text','book','book']
    ].map(Object.freeze))
  });
  const GARDEN=Object.freeze(['tree','house','water','seed','flower']);
  const SCHOOL=Object.freeze(['book','pencil','bag','ball','box']);
  const DELIVERY_INDEX=Object.freeze({
    '2026-10-17-delivery':GARDEN,'2026-10-18-delivery':GARDEN,
    '2026-10-24-delivery':SCHOOL,'2026-10-25-delivery':SCHOOL
  });
  const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const id=value=>typeof value==='string'&&value.length<=100&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  const lessonId=value=>id(value)&&/^\d{4}-\d{2}-\d{2}-/.test(value);
  const title=value=>typeof value==='string'&&value.trim().length>0&&value.length<=160;
  const same=(a,b)=>a.length===b.length&&a.every((value,index)=>value===b[index]);
  const compare=(a,b)=>a<b?-1:a>b?1:0;
  const empty=()=>({stages:new Map(),themes:new Map(),indexes:new Map()});
  const awardKey=(lesson,stage)=>lesson+'/'+stage;
  let pending=empty(),verified=empty(),lastLibrary=null;
  let last={saved:false,available:false,xp:0,level:1,stars:0,levelProgress:0,xpPerStage:XP_PER_STAGE,xpPerLevel:XP_PER_LEVEL,themes:[],warning:''};

  function stageMap(lesson){
    let stages;
    if(lesson.type==='block'||lesson.type==='word'){
      if(lesson.type==='block'&&(lesson.id!=='2026-10-08-block'||lesson.word!=='block'))return null;
      if(!id(lesson.word)||lesson.id!==lesson.date+'-'+lesson.word)return null;
      stages=WORD_STAGES;
    }else if(lesson.type==='review'){
      const map=own(REVIEWS,lesson.id)?REVIEWS[lesson.id]:null;
      if(!map||!Array.isArray(lesson.questions)||lesson.questions.length!==map.length)return null;
      if(!map.every((entry,index)=>{const q=lesson.questions[index];return object(q)&&q.kind===entry[1]&&q.speak===entry[2]&&q.answer===entry[3];}))return null;
      stages=[...map.map(entry=>entry[0]),'practical'];
    }else if(lesson.type==='delivery'){
      const words=own(DELIVERY_INDEX,lesson.id)?DELIVERY_INDEX[lesson.id]:null;
      if(!Array.isArray(lesson.missions)||!lesson.missions.length||lesson.missions.length>128||lesson.missions.some(m=>!object(m)||!id(m.word)))return null;
      const actual=lesson.missions.map(m=>m.word);
      if(new Set(actual).size!==actual.length||(words&&!same(actual,words)))return null;
      stages=actual.map(word=>word+'-delivery');
      // Future delivery courses must explicitly declare their stable index map.
      // It is also retained in the ledger to detect later declaration changes.
      if(!words&&(!Array.isArray(lesson.growthStageIds)||!same(lesson.growthStageIds,stages)))return null;
    }else return null;
    // An optional explicit declaration must agree; B.total must also agree with
    // the frozen contract. A changed activity count is never inferred as new XP.
    if(own(lesson,'growthStageIds')&&(!Array.isArray(lesson.growthStageIds)||!same(lesson.growthStageIds,stages)))return null;
    try{if(B.total(lesson)!==stages.length)return null;}catch{return null;}
    return stages;
  }

  function catalog(library,warnings){
    if(!object(library)||!Array.isArray(library.lessons)||library.lessons.length>MAX_LESSONS)throw new Error('课程清单无效，成长记录暂未更新。');
    const courses=new Map(),groups=new Map(),counts=new Map(),day=B.today();
    for(const lesson of library.lessons)if(object(lesson))counts.set(lesson.id,(counts.get(lesson.id)||0)+1);
    for(const lesson of library.lessons){
      if(!object(lesson)||!lessonId(lesson.id)||counts.get(lesson.id)!==1||typeof lesson.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(lesson.date)||!title(lesson.theme)){
        warnings.add('有课程资料不完整或编号重复，相关成长记录暂未更新。');continue;
      }
      const released=Boolean(B.available(lesson,day)),stages=stageMap(lesson);
      const key=lesson.type==='block'?'little-explorer-block-v1':`little-explorer-course-${lesson.id}-v1`;
      const valid=stages&&B.storageKey(lesson)===key;
      if(!valid&&released)warnings.add('课程关卡对应关系有变化，相关成长记录暂未更新。');
      courses.set(lesson.id,{lesson,key,stages:valid?stages:null,released,themeId:null,customIndex:lesson.type==='delivery'&&!own(DELIVERY_INDEX,lesson.id)});
    }
    // Theme labels can be edited; earned identity is the first course's stable ID.
    const ordered=[...courses.values()].sort((a,b)=>compare(a.lesson.date,b.lesson.date)||compare(a.lesson.id,b.lesson.id));
    for(const entry of ordered){
      if(!groups.has(entry.lesson.theme))groups.set(entry.lesson.theme,{id:entry.lesson.id,title:entry.lesson.theme});
      entry.themeId=groups.get(entry.lesson.theme).id;
    }
    return {courses,groups:new Map([...groups.values()].map(group=>[group.id,group]))};
  }

  function decode(raw,book){
    if(raw===null)return empty();
    if(typeof raw!=='string'||raw.length>MAX_LEDGER_CHARS)throw new Error('invalid ledger');
    const value=JSON.parse(raw);
    if(!object(value)||value.version!==1||!Array.isArray(value.stages)||value.stages.length>MAX_AWARDS||!Array.isArray(value.themes)||value.themes.length>MAX_LESSONS)throw new Error('invalid ledger');
    const result=empty();
    if(own(value,'indexes')&&(!Array.isArray(value.indexes)||value.indexes.length>MAX_LESSONS))throw new Error('invalid indexes');
    for(const entry of value.indexes||[]){
      if(!object(entry)||!lessonId(entry.lessonId)||!Array.isArray(entry.stageIds)||!entry.stageIds.length||entry.stageIds.length>128||!entry.stageIds.every(id)||new Set(entry.stageIds).size!==entry.stageIds.length)throw new Error('invalid index map');
      const course=book.courses.get(entry.lessonId);
      if(!course?.stages||!same(entry.stageIds,course.stages))throw new Error('changed index map');
      result.indexes.set(entry.lessonId,[...entry.stageIds]);
    }
    for(const entry of value.stages){
      if(!object(entry)||!lessonId(entry.lessonId)||!id(entry.stageId))throw new Error('invalid award');
      const course=book.courses.get(entry.lessonId);
      if(!course?.stages?.includes(entry.stageId)||(course.customIndex&&!result.indexes.has(entry.lessonId)))throw new Error('unknown award');
      result.stages.set(awardKey(entry.lessonId,entry.stageId),{lessonId:entry.lessonId,stageId:entry.stageId});
    }
    for(const entry of value.themes){
      if(!object(entry)||!lessonId(entry.id)||!lessonId(entry.lessonId)||!title(entry.title))throw new Error('invalid theme');
      const course=book.courses.get(entry.lessonId);
      if(!book.groups.has(entry.id)||course?.themeId!==entry.id||!course.stages?.every(stage=>result.stages.has(awardKey(entry.lessonId,stage))))throw new Error('missing theme evidence');
      addTheme(result,entry);
    }
    return result;
  }

  function addTheme(ledger,entry){
    const previous=ledger.themes.get(entry.id);
    if(!previous||compare(entry.lessonId,previous.lessonId)<0)ledger.themes.set(entry.id,{id:entry.id,title:entry.title,lessonId:entry.lessonId});
  }
  function merge(target,source){
    for(const [key,entry] of source.stages)target.stages.set(key,entry);
    for(const entry of source.themes.values())addTheme(target,entry);
    for(const [courseId,stages] of source.indexes)if(!target.indexes.has(courseId))target.indexes.set(courseId,[...stages]);
  }
  function earnThemes(ledger,book){
    for(const [courseId,course] of book.courses){
      if(!course.released||!course.stages||!course.stages.every(stage=>ledger.stages.has(awardKey(courseId,stage))))continue;
      const group=book.groups.get(course.themeId);
      addTheme(ledger,{id:group.id,title:group.title,lessonId:courseId});
    }
  }
  function encode(ledger){
    return JSON.stringify({version:1,
      stages:[...ledger.stages.values()].sort((a,b)=>compare(a.lessonId,b.lessonId)||compare(a.stageId,b.stageId)),
      themes:[...ledger.themes.values()].sort((a,b)=>compare(a.id,b.id)),
      indexes:[...ledger.indexes].sort(([a],[b])=>compare(a,b)).map(([lessonId,stageIds])=>({lessonId,stageIds}))
    });
  }

  function scan(storage,book,warnings){
    for(const [courseId,course] of book.courses){
      if(!course.released||!course.stages)continue;
      if(course.customIndex&&!pending.indexes.has(courseId))pending.indexes.set(courseId,[...course.stages]);
      let raw;
      try{raw=storage.getItem(course.key);}catch{warnings.add('部分课程记录无法读取，请检查浏览器的本地存储设置。');continue;}
      if(raw===null)continue;
      let state;
      try{
        if(raw.length>MAX_PROGRESS_CHARS)throw new Error('large progress');
        state=JSON.parse(raw);
        if(!object(state)||!Array.isArray(state.completed)||state.completed.length>MAX_COMPLETED)throw new Error('invalid progress');
      }catch{warnings.add('部分旧课程记录无法识别，原记录已保留。');continue;}
      for(const index of state.completed){
        if(!Number.isInteger(index)||index<0||index>=course.stages.length)continue;
        const stageId=course.stages[index];
        pending.stages.set(awardKey(courseId,stageId),{lessonId:courseId,stageId});
      }
    }
  }

  function result(saved,available,warnings,book){
    // Failed writes never turn merely attempted participation into saved points.
    // Keep the verified union in memory; a later reconciliation can retry pending work.
    const eligible=[...verified.stages.values()].filter(entry=>book?.courses.get(entry.lessonId)?.released);
    const stars=eligible.length,xp=stars*XP_PER_STAGE;
    last={saved,available,xp,level:Math.floor(xp/XP_PER_LEVEL)+1,stars,levelProgress:xp%XP_PER_LEVEL,xpPerStage:XP_PER_STAGE,xpPerLevel:XP_PER_LEVEL,
      themes:[...verified.themes.values()].filter(entry=>book?.courses.get(entry.lessonId)?.released).sort((a,b)=>compare(a.id,b.id)).map(entry=>({id:entry.id,title:book.groups.get(entry.id)?.title||entry.title})),
      warning:[...warnings].join(' ')};
    return snapshot();
  }
  function snapshot(){return {...last,themes:last.themes.map(theme=>({...theme}))};}

  function reconcile(library){
    const warnings=new Set();let book,storage,raw;
    try{book=catalog(library,warnings);}catch{warnings.add('课程清单无效，成长记录暂未更新。');return result(false,false,warnings,null);}
    lastLibrary=library;
    try{storage=window.localStorage;raw=storage.getItem(STORE);}catch{
      warnings.add('成长记录无法读取，请保留当前页面，检查浏览器的本地存储设置。');return result(false,false,warnings,book);
    }
    let stored;
    try{stored=decode(raw,book);}catch{
      warnings.add('成长记录无法识别，已保留原记录，没有清零或覆盖。');return result(false,false,warnings,book);
    }
    for(const [courseId,stages] of pending.indexes){
      const course=book.courses.get(courseId);
      if(!course?.stages||!same(stages,course.stages)){
        warnings.add('课程关卡对应关系有变化，原成长记录已保留，暂未更新。');return result(false,true,warnings,book);
      }
    }
    merge(verified,stored);merge(pending,stored);
    scan(storage,book,warnings);earnThemes(pending,book);
    // Read/merge/write/readback is bounded. Storage events also merge the event's
    // value, repairing ordinary last-writer races without a timestamp/writer loop.
    for(let attempt=0;attempt<3;attempt++){
      const serialized=encode(pending);
      if(serialized.length>MAX_LEDGER_CHARS||pending.stages.size>MAX_AWARDS||pending.themes.size>MAX_LESSONS){
        warnings.add('成长记录空间已满，本次新增成长暂未保存。');return result(false,true,warnings,book);
      }
      if(raw===serialized){merge(verified,pending);return result(warnings.size===0,true,warnings,book);}
      try{storage.setItem(STORE,serialized);raw=storage.getItem(STORE);}catch{
        warnings.add('新增成长暂未保存，请保留当前页面，检查浏览器存储空间后再试。');return result(false,true,warnings,book);
      }
      if(raw===serialized){merge(verified,pending);return result(warnings.size===0,true,warnings,book);}
      try{stored=decode(raw,book);}catch{
        warnings.add('成长记录回读未通过检查，原记录没有被继续覆盖。');return result(false,false,warnings,book);
      }
      merge(verified,stored);merge(pending,stored);earnThemes(pending,book);
    }
    warnings.add('成长记录保存后未能核实，请保留当前页面，稍后再试。');
    return result(false,true,warnings,book);
  }

  window.addEventListener('storage',event=>{
    if(event.key!==STORE||!lastLibrary)return;
    // event.newValue may contain an award already lost by a racing tab's write.
    // Never replace the union with the event, and never import arbitrary keys.
    if(event.newValue!==null){
      try{const book=catalog(lastLibrary,new Set()),incoming=decode(event.newValue,book);merge(pending,incoming);merge(verified,incoming);}catch{/* reconcile reports any corruption that is still stored */}
    }
    const before=JSON.stringify(last),next=reconcile(lastLibrary);
    if(JSON.stringify(next)!==before)window.dispatchEvent(new CustomEvent('growthchange',{detail:next}));
  });
  B.growth=Object.freeze({reconcile,snapshot});
})();
