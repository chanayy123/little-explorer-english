const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,'dist',name),'utf8');
const library=JSON.parse(fs.readFileSync(path.join(root,'dist/assets/lessons.json'),'utf8'));
const STORE='little-explorer-growth-v1';
const clone=value=>JSON.parse(JSON.stringify(value));
const find=id=>library.lessons.find(lesson=>lesson.id===id);
const block=find('2026-10-08-block'),tree=find('2026-10-12-tree'),house=find('2026-10-13-house');
const key=lesson=>lesson.storageKey||`little-explorer-course-${lesson.id}-v1`;
const WORD_STAGES=['listen','meaning','speak','use','spell','write'];
const full=lesson=>Array.from({length:lesson.type==='delivery'?lesson.missions.length:lesson.type==='review'?lesson.questions.length+1:6},(_,i)=>i);
let tests=0;
function test(name,run){run();tests++;console.log('PASS growth:',name);}
function storage(seed={}){
  const memory=new Map(Object.entries(seed)),gets=[],writes=[];
  const api={memory,gets,writes,getItem(k){gets.push(k);return memory.get(k)??null;},setItem(k,v){writes.push(k);memory.set(k,String(v));},removeItem(k){memory.delete(k);}};
  return api;
}
function setup({store=storage(),day='2026-10-25',data=library,script=source('growth.js'),denied=false}={}){
  const dom=new JSDOM('<!doctype html><body></body>',{url:'https://example.test/english/',runScripts:'outside-only'}),w=dom.window;
  Object.defineProperty(w,'localStorage',denied?{configurable:true,get(){throw new w.DOMException('denied','SecurityError');}}:{configurable:true,value:store});
  w.eval(source('book-core.js'));w.LessonBook.today=()=>day;w.eval(script);
  const B=w.LessonBook;
  return {dom,w,B,store,run:()=>B.growth.reconcile(data),close:()=>w.close()};
}
function completed(store,lesson,indices){store.memory.set(key(lesson),JSON.stringify({screen:'lesson',stage:0,completed:indices}));}
function entries(store){return JSON.parse(store.memory.get(STORE));}
function awardIds(store,lesson){return entries(store).stages.filter(item=>item.lessonId===lesson.id).map(item=>item.stageId).sort();}

// The migration can read handwriting and preferences but can never normalize,
// re-save, delete, or otherwise change the exact original course bytes.
test('migration preserves original raw course, handwriting, preference and unrelated values',()=>{
  const store=storage();
  for(const lesson of library.lessons){
    store.memory.set(key(lesson),'  '+JSON.stringify({screen:'complete',stage:full(lesson).length-1,completed:full(lesson),strokes:[[{x:.12,y:.34},{x:.56,y:.78}]],sound:false,recordingVoice:'aria',paper:true})+'\n');
  }
  store.memory.set('little-explorer-voice-v1',' { "sound": false, "recordingVoice": "aria" } ');
  store.memory.set('unrelated-setting','untouched');
  const before=new Map(store.memory),t=setup({store}),g=t.run();
  assert.equal(g.saved,true);assert.equal(g.available,true);
  const expected=library.lessons.reduce((total,lesson)=>total+full(lesson).length,0);
  assert.equal(g.stars,expected);assert.equal(g.xp,expected*10);
  assert.equal(g.level,Math.floor(expected*10/100)+1);assert.equal(g.levelProgress,expected*10%100);
  assert.equal(g.xpPerStage,10);assert.equal(g.xpPerLevel,100);
  for(const [k,v] of before)assert.equal(store.memory.get(k),v,'Changed old storage: '+k);
  assert.deepEqual([...new Set(store.writes)],[STORE]);
  assert.deepEqual(awardIds(store,block),[...WORD_STAGES].sort());
  for(const lesson of library.lessons.filter(c=>c.type==='word'))assert.deepEqual(awardIds(store,lesson),[...WORD_STAGES].sort());
  for(const lesson of library.lessons.filter(c=>c.type==='delivery'))assert.deepEqual(awardIds(store,lesson),lesson.missions.map(m=>m.word+'-delivery').sort());
  for(const [id,count] of [['2026-10-09-review',5],['2026-10-16-review',7],['2026-10-23-review',8]]){
    const ids=awardIds(store,find(id));assert.equal(ids.length,count);assert.equal(ids.includes('practical'),true);assert.equal(new Set(ids).size,count);
  }
  assert.equal(g.themes.length,3);t.close();
});

test('only legal completed indexes migrate; future, unknown and flag-only progress do not',()=>{
  const store=storage();completed(store,block,[0,1,1,-1,6,1.5,'2',null,{},true]);
  store.memory.set(key(tree),JSON.stringify({screen:'complete',stage:5,wordSeen:true,said:true,writingDone:true,completed:[]}));
  for(const lesson of library.lessons.filter(c=>c.date>'2026-10-14'))completed(store,lesson,full(lesson));
  store.memory.set('little-explorer-course-2020-01-01-unknown-v1',JSON.stringify({completed:[0,1,2]}));
  const t=setup({store,day:'2026-10-14'}),g=t.run();
  assert.equal(g.stars,2);assert.equal(g.xp,20);assert.equal(g.themes.length,0);
  assert.deepEqual(awardIds(store,block),['listen','meaning']);
  for(const lesson of library.lessons.filter(c=>c.date>'2026-10-14'))assert.equal(store.gets.includes(key(lesson)),false,'Read future preview progress');
  assert.equal(store.gets.includes('little-explorer-course-2020-01-01-unknown-v1'),false);
  t.close();
});

test('release gating uses LessonBook.available and the current Shanghai date',()=>{
  const store=storage();completed(store,tree,[0]);
  const t=setup({store,day:'2026-10-12'});t.B.available=()=>false;
  assert.equal(t.run().stars,0);t.B.available=(lesson,day)=>lesson.date<=day;
  assert.equal(t.run().stars,1);t.close();
});

test('reconciliation, course restart and browser restart never lose or repeat XP',()=>{
  const store=storage();completed(store,block,[0,1]);let t=setup({store});
  assert.equal(t.run().xp,20);const raw=store.memory.get(STORE),writes=store.writes.length;
  for(let i=0;i<8;i++)assert.equal(t.run().xp,20);
  assert.equal(store.memory.get(STORE),raw);assert.equal(store.writes.length,writes,'No redundant writes');
  completed(store,block,[]);assert.equal(t.run().xp,20);t.close();
  t=setup({store});assert.equal(t.run().xp,20);
  completed(store,block,[0,1,2]);assert.equal(t.run().xp,30);
  assert.equal(entries(store).stages.length,3);t.close();
});

test('all three legacy review courses include the final practical and supplemental records',()=>{
  const store=storage();
  for(const lesson of library.lessons.filter(c=>c.type==='review'))completed(store,lesson,full(lesson));
  const t=setup({store}),g=t.run();assert.equal(g.stars,20);assert.equal(g.xp,200);assert.equal(g.level,3);assert.equal(g.levelProgress,0);
  assert.deepEqual(clone(g.themes.map(t=>t.id)),['2026-10-08-block','2026-10-12-tree','2026-10-19-book']);
  t.close();
});

test('first completed lesson leaves one stable theme mark, retained after course reset',()=>{
  const store=storage();completed(store,house,full(house));const t=setup({store});
  let g=t.run();assert.equal(g.themes.length,1);assert.equal(g.themes[0].id,tree.id);assert.equal(g.themes[0].title,tree.theme);
  completed(store,house,[]);completed(store,tree,[0]);g=t.run();assert.equal(g.themes.length,1);assert.equal(g.xp,70);
  completed(store,tree,full(tree));g=t.run();assert.equal(g.themes.length,1);assert.equal(g.xp,120);
  t.close();const reloaded=setup({store});assert.equal(reloaded.run().themes[0].id,tree.id);reloaded.close();
});

test('XP and theme marks count participation equally with hints and parent assistance',()=>{
  const store=storage(),review=find('2026-10-16-review'),delivery=find('2026-10-17-delivery');
  for(const lesson of [tree,review,delivery])store.memory.set(key(lesson),JSON.stringify({completed:full(lesson),assisted:full(lesson),choiceHelp:true,practiceHelp:true,practicePhase:'done'}));
  const t=setup({store}),g=t.run();assert.equal(g.stars,18);assert.equal(g.xp,180);assert.equal(g.themes.length,1);t.close();
});

test('duplicate persisted awards and repeated tabs are a deterministic set union',()=>{
  const store=storage();completed(store,block,[0]);let t=setup({store});t.run();t.close();
  const duplicate=entries(store);duplicate.stages.push(clone(duplicate.stages[0]));store.memory.set(STORE,JSON.stringify(duplicate));
  t=setup({store});assert.equal(t.run().xp,10);assert.equal(entries(store).stages.length,1);
  const raw=store.memory.get(STORE);assert.equal(t.run().xp,10);assert.equal(store.memory.get(STORE),raw);
  assert.deepEqual(Object.keys(t.B.growth).sort(),['reconcile','snapshot']);t.close();
});

test('inserted/reordered review and delivery indexes are refused, never silently reinterpreted',()=>{
  for(const mutate of [
    l=>l.lessons.find(c=>c.id==='2026-10-16-review').questions.unshift(clone(l.lessons.find(c=>c.id==='2026-10-16-review').questions[0])),
    l=>l.lessons.find(c=>c.id==='2026-10-16-review').questions.reverse(),
    l=>l.lessons.find(c=>c.id==='2026-10-17-delivery').missions.reverse(),
    l=>l.lessons.find(c=>c.id==='2026-10-17-delivery').missions.push(clone(l.lessons.find(c=>c.id==='2026-10-17-delivery').missions[0])),
    l=>{l.lessons.find(c=>c.id==='2026-10-17-delivery').missions[1].word='tree';},
    l=>{l.lessons.find(c=>c.id===tree.id).growthStageIds=['new-stage',...WORD_STAGES];}
  ]){
    const changed=clone(library);mutate(changed);const store=storage();
    const altered=changed.lessons.find((c,i)=>JSON.stringify(c)!==JSON.stringify(library.lessons[i]));completed(store,altered,[0,1,2,3,4,5,6]);
    const t=setup({store,data:changed}),g=t.run();assert.equal(g.stars,0);assert.equal(g.saved,false);assert.match(g.warning,/关卡对应关系/);t.close();
  }
  const store=storage();completed(store,tree,full(tree));const t=setup({store});t.B.total=()=>7;
  assert.equal(t.run().stars,0);assert.match(t.run().warning,/关卡对应关系/);t.close();
});

test('unknown review/delivery schemas, duplicate lesson IDs and aliased course storage are skipped',()=>{
  for(const changed of [
    {lessons:[{...clone(find('2026-10-09-review')),id:'2026-10-10-review',date:'2026-10-10'}]},
    {lessons:[{...clone(find('2026-10-17-delivery')),id:'2026-10-11-delivery',date:'2026-10-11'}]},
    {lessons:[clone(tree),clone(tree)]},
    {lessons:[{...clone(tree),storageKey:key(block)}]}
  ]){
    const store=storage();for(const lesson of changed.lessons)completed(store,lesson,[0,1,2]);
    const t=setup({store,data:changed}),g=t.run();assert.equal(g.stars,0);assert.equal(g.saved,false);assert.ok(g.warning);t.close();
  }
});

test('future delivery requires an explicit unique map, then freezes that adopted map in its own ledger',()=>{
  const extra={...clone(find('2026-10-17-delivery')),id:'2026-10-31-delivery',date:'2026-10-31'};
  extra.growthStageIds=extra.missions.map(m=>m.word+'-delivery');
  const data={...clone(library),lessons:[...clone(library.lessons),extra]},store=storage();
  completed(store,extra,[0,2]);let t=setup({store,data,day:'2026-10-31'});
  let g=t.run();assert.equal(g.saved,true);assert.equal(g.xp,20);assert.deepEqual(awardIds(store,extra),['tree-delivery','water-delivery']);
  assert.deepEqual(entries(store).indexes,[{lessonId:extra.id,stageIds:extra.growthStageIds}]);
  const raw=store.memory.get(STORE);t.close();
  // Reordering both missions and their declaration still must not reinterpret
  // the old numeric progress, even in a new browser instance.
  const changed=clone(data),course=changed.lessons.at(-1);course.missions.reverse();course.growthStageIds=course.missions.map(m=>m.word+'-delivery');
  t=setup({store,data:changed,day:'2026-10-31'});g=t.run();assert.equal(g.saved,false);assert.equal(g.available,false);assert.ok(g.warning);assert.equal(store.memory.get(STORE),raw);t.close();
  const without=clone(data);delete without.lessons.at(-1).growthStageIds;const missing=storage();completed(missing,extra,[0]);
  t=setup({store:missing,data:without,day:'2026-10-31'});g=t.run();assert.equal(g.stars,0);assert.equal(g.saved,false);assert.match(g.warning,/关卡对应关系/);t.close();
  const mismatched=clone(data);mismatched.lessons.at(-1).growthStageIds.reverse();const wrong=storage();completed(wrong,extra,[0]);
  t=setup({store:wrong,data:mismatched,day:'2026-10-31'});g=t.run();assert.equal(g.stars,0);assert.equal(g.saved,false);t.close();
});

test('invalid legacy JSON and oversized progress stay untouched and cannot create awards',()=>{
  for(const raw of ['{bad','null','[]','{"completed":"all"}',JSON.stringify({completed:Array(10001).fill(0)}),' '.repeat(4*1024*1024+1)]){
    const store=storage({[key(block)]:raw}),t=setup({store}),g=t.run();
    assert.equal(g.stars,0);assert.equal(g.saved,false);assert.ok(g.warning);assert.equal(store.memory.get(key(block)),raw);t.close();
  }
});

test('corrupt, unsupported or oversized growth ledger is never reset or overwritten',()=>{
  const corrupts=['{bad','null','[]','{}',JSON.stringify({version:2,stages:[],themes:[]}),JSON.stringify({version:1,stages:{},themes:[]}),
    JSON.stringify({version:1,stages:[{lessonId:block.id,stageId:'invented-stage'}],themes:[]}),
    JSON.stringify({version:1,stages:[{lessonId:'2026-10-01-unknown',stageId:'listen'}],themes:[]}),
    JSON.stringify({version:1,stages:[],themes:[{id:block.id,title:block.theme,lessonId:block.id}]}),' '.repeat(2*1024*1024+1)];
  for(const raw of corrupts){
    const store=storage({[STORE]:raw});completed(store,block,full(block));const t=setup({store}),g=t.run();
    assert.equal(g.saved,false);assert.equal(g.available,false);assert.match(g.warning,/没有清零或覆盖/);assert.equal(store.memory.get(STORE),raw);assert.equal(store.writes.length,0);t.close();
  }
});

test('a ledger corrupted after successful use preserves verified totals and never overwrites the raw value',()=>{
  const store=storage();completed(store,block,[0]);const t=setup({store});assert.equal(t.run().xp,10);
  store.memory.set(STORE,'{broken after save');completed(store,block,[0,1]);const writes=store.writes.length;
  const g=t.run();assert.equal(g.available,false);assert.equal(g.saved,false);assert.equal(g.xp,10);
  assert.equal(store.writes.length,writes);assert.equal(store.memory.get(STORE),'{broken after save');t.close();
});

test('every reconcile merges the latest stored ledger with remembered awards, even without an event',()=>{
  const store=storage();completed(store,block,[0]);const t=setup({store});assert.equal(t.run().xp,10);completed(store,block,[]);
  store.memory.set(STORE,JSON.stringify({version:1,stages:[{lessonId:tree.id,stageId:'meaning'}],themes:[]}));
  const g=t.run();assert.equal(g.saved,true);assert.equal(g.xp,20);assert.equal(entries(store).stages.length,2);t.close();
});

test('storage denied reports unavailable rather than claiming a saved zero',()=>{
  const t=setup({denied:true}),g=t.run();assert.equal(g.saved,false);assert.equal(g.available,false);assert.match(g.warning,/无法读取/);t.close();
  const store=storage();store.getItem=()=>{throw new Error('denied');};const u=setup({store});assert.equal(u.run().available,false);u.close();
});

test('quota failure displays only verified XP; pending union survives a course reset and retries',()=>{
  const store=storage();completed(store,block,[0]);const t=setup({store});assert.equal(t.run().xp,10);
  const savedRaw=store.memory.get(STORE),set=store.setItem;store.setItem=()=>{throw new Error('QuotaExceededError');};
  completed(store,block,[0,1]);let g=t.run();assert.equal(g.saved,false);assert.equal(g.available,true);assert.equal(g.xp,10);assert.match(g.warning,/暂未保存/);assert.equal(store.memory.get(STORE),savedRaw);
  completed(store,block,[]);store.setItem=set;g=t.run();assert.equal(g.saved,true);assert.equal(g.xp,20);t.close();
});

test('failed readback and silently dropped writes never report success or unsaved XP',()=>{
  const store=storage();completed(store,block,[0]);const t=setup({store});assert.equal(t.run().xp,10);
  completed(store,block,[0,1]);const get=store.getItem,set=store.setItem;let failRead=false;
  store.setItem=function(k,v){set.call(this,k,v);if(k===STORE)failRead=true;};
  store.getItem=function(k){if(failRead&&k===STORE)throw new Error('readback failed');return get.call(this,k);};
  let g=t.run();assert.equal(g.saved,false);assert.equal(g.xp,10);assert.ok(g.warning);
  store.getItem=get;store.setItem=set;g=t.run();assert.equal(g.saved,true);assert.equal(g.xp,20);t.close();
  const dropped=storage();completed(dropped,block,[0]);dropped.setItem=()=>{};const u=setup({store:dropped});g=u.run();assert.equal(g.saved,false);assert.equal(g.xp,0);assert.ok(g.warning);u.close();
});

test('unreadable individual course is reported while unrelated verified progress is retained',()=>{
  const store=storage();completed(store,block,[0]);completed(store,tree,[0]);const get=store.getItem;
  store.getItem=function(k){if(k===key(tree))throw new Error('cannot read course');return get.call(this,k);};
  const t=setup({store}),g=t.run();assert.equal(g.saved,false);assert.equal(g.xp,10);assert.match(g.warning,/部分课程记录无法读取/);t.close();
});

test('two racing tabs recover the union from storage events without a write/render loop',()=>{
  const memory=new Map(),queue=[],tabs=[];let writeCount=0;
  function tab(){
    let stale=null;
    const store={memory,getItem(k){if(k===STORE&&stale!==null){const raw=stale;stale=null;return raw;}return memory.get(k)??null;},setItem(k,v){const old=memory.get(k)??null;memory.set(k,v);writeCount++;if(old!==v)for(const other of tabs)if(other.store!==store)queue.push({other,key:k,oldValue:old,newValue:v});}};
    const t=setup({store});t.stale=raw=>{stale=raw;};tabs.push(t);return t;
  }
  const a=tab(),b=tab();a.run();b.run();queue.length=0;
  const initial=memory.get(STORE);let refreshes=0;
  for(const t of tabs)t.w.addEventListener('growthchange',()=>{refreshes++;t.run();});
  completed(a.store,block,[0]);assert.equal(a.run().xp,10);const aRaw=memory.get(STORE);
  completed(a.store,block,[]);completed(a.store,tree,[1]);b.stale(initial);assert.equal(b.run().xp,10);
  assert.notEqual(memory.get(STORE),aRaw);assert.equal(entries(a.store).stages.length,1,'Simulated lost write before events');
  let delivered=0;
  while(queue.length){
    assert.ok(delivered++<20,'Storage event loop');const {other,...payload}=queue.shift();
    const event=new other.w.Event('storage');for(const [k,v] of Object.entries(payload))Object.defineProperty(event,k,{value:v});other.w.dispatchEvent(event);
  }
  assert.equal(a.B.growth.snapshot().xp,20);assert.equal(b.B.growth.snapshot().xp,20);assert.equal(entries(a.store).stages.length,2);assert.ok(refreshes>0);
  const before=writeCount;a.run();b.run();assert.equal(writeCount,before,'Stable serialization avoids loops');
  assert.deepEqual(entries(a.store).stages.map(e=>e.lessonId+'/'+e.stageId),[block.id+'/listen',tree.id+'/meaning']);
  a.close();b.close();
});

test('snapshot is a copy, and progression configuration is returned with calculated progress',()=>{
  const store=storage();completed(store,block,full(block));
  const script=source('growth.js').replace('XP_PER_STAGE=10,XP_PER_LEVEL=100','XP_PER_STAGE=25,XP_PER_LEVEL=200');
  const t=setup({store,script}),g=t.run();assert.equal(g.xp,150);assert.equal(g.level,1);assert.equal(g.levelProgress,150);assert.equal(g.xpPerStage,25);assert.equal(g.xpPerLevel,200);
  g.themes[0].title='changed';g.themes.push({id:'fake',title:'fake'});assert.equal(t.B.growth.snapshot().themes.length,1);assert.equal(t.B.growth.snapshot().themes[0].title,block.theme);
  assert.equal(t.B.growth.snapshot().saved,true);t.close();
});

console.log(`PASS: ${tests} growth-ledger checks, local-only and no legacy storage writes.`);
