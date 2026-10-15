'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'dist/voice-player.js'),'utf8');

function setup(t,{native=true,recorded=true,sound=true,play,throwSpeak=false}={}){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'dist/lesson.html'),'utf8'),{
    url:'https://example.test/english/lesson.html',runScripts:'outside-only'
  });
  t.after(()=>dom.window.close());
  const w=dom.window,audio=[],spoken=[],messages=[];
  const settings={sound,voiceMode:recorded?'recorded':'native',recordingVoice:'jenny',speechRate:1};
  w.LESSON_AUDIO={ready:true,english:{jenny:{tree:'assets/tree.mp3',flower:'assets/flower.mp3'}},chinese:{'你好':'assets/hello.mp3'}};
  w.Audio=class{
    constructor(){audio.push(this);this.pauses=0;this.plays=0;}
    play(){this.plays++;return play?play(this):Promise.resolve();}
    pause(){this.pauses++;}
  };
  const synth={
    cancellations:0,
    getVoices:()=>[],addEventListener(){},resume(){},
    cancel(){this.cancellations++;},
    speak(u){if(throwSpeak)throw new Error('Synthesis unavailable');spoken.push(u);}
  };
  if(native){w.speechSynthesis=synth;w.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};}
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.eval(source);
  const voice=w.createLessonVoice({settings:()=>settings,save(){},toast:message=>messages.push(message)});
  return {w,voice,settings,audio,spoken,messages,synth};
}

const english=['tree','flower'];

test('recordings complete exactly once, after every segment ended',t=>{
  const c=setup(t);let count=0;
  c.voice.say(english,false,false,()=>count++);
  const player=c.audio[0],firstEnd=player.onended;
  player.onplaying();
  assert.equal(c.w.document.body.classList.contains('speaking'),true);
  assert.equal(count,0);
  firstEnd();
  assert.equal(player.plays,2);
  assert.equal(count,0);
  firstEnd(); // A duplicate event from the first segment must not skip the second.
  assert.equal(player.plays,2);
  assert.equal(count,0);
  const lastEnd=player.onended;
  lastEnd();lastEnd();
  assert.equal(count,1);
  assert.equal(c.w.document.body.classList.contains('speaking'),false);
  assert.equal(player.onended,null);
  assert.equal(player.onerror,null);
});

test('recording cancellation invalidates saved completion and error handlers',t=>{
  const c=setup(t);let count=0;
  c.voice.say('tree',false,false,()=>count++);
  const player=c.audio[0],end=player.onended,error=player.onerror;
  c.voice.stop();end();error();
  assert.equal(count,0);
  assert.equal(c.spoken.length,0);
  assert.equal(player.currentTime,0);
  assert.equal(c.w.document.body.classList.contains('speaking'),false);
});

test('new speech invalidates an older recording callback without breaking its own',t=>{
  const c=setup(t);let old=0,current=0;
  c.voice.say('tree',false,false,()=>old++);
  const staleEnd=c.audio[0].onended;
  c.voice.say('flower',false,false,()=>current++);
  staleEnd();assert.equal(old,0);assert.equal(current,0);
  c.audio[0].onended();assert.equal(current,1);
});

test('muted requests cancel old playback and never complete',t=>{
  const c=setup(t);let count=0;
  c.voice.say('tree',false,false,()=>count++);
  const staleEnd=c.audio[0].onended;
  c.settings.sound=false;
  c.voice.say('flower',false,false,()=>count++);
  staleEnd();
  assert.equal(c.audio[0].plays,1);
  assert.equal(c.spoken.length,0);
  assert.equal(count,0);
});

test('explicit force remains compatible with muted settings',t=>{
  const c=setup(t,{sound:false});let count=0;
  c.voice.say('tree',true,true,()=>count++);
  assert.equal(c.audio[0].playbackRate,.78);
  c.audio[0].onended();assert.equal(count,1);
});

test('recording error completes only after successful full native fallback',t=>{
  const c=setup(t);let count=0;
  c.voice.say(english,false,false,()=>count++);
  const player=c.audio[0],staleEnd=player.onended,error=player.onerror;
  error();error();staleEnd();
  assert.equal(count,0);
  assert.deepEqual(c.spoken.map(u=>u.text),english);
  c.spoken[0].onend();assert.equal(count,0);
  c.spoken[1].onend();c.spoken[1].onend();assert.equal(count,1);
  assert.equal(c.messages.length,1);
});

test('rejected play promise falls back only once',async t=>{
  const c=setup(t,{play:()=>Promise.reject(new Error('NotAllowedError'))});let count=0;
  c.voice.say('tree',false,false,()=>count++);
  const error=c.audio[0].onerror;
  await Promise.resolve();error();
  assert.equal(c.spoken.length,1);assert.equal(count,0);
  c.spoken[0].onend();assert.equal(count,1);
});

test('synchronous play failure can complete through native fallback',t=>{
  const c=setup(t,{play:()=>{throw new Error('Playback failed');}});let count=0;
  c.voice.say('tree',false,false,()=>count++);
  assert.equal(c.spoken.length,1);assert.equal(count,0);
  c.spoken[0].onend();assert.equal(count,1);
});

test('late promise rejection from a finished recording cannot restart speech',async t=>{
  let reject;
  const c=setup(t,{play:()=>new Promise((resolve,failure)=>{reject=failure;})});let count=0;
  c.voice.say('tree',false,false,()=>count++);
  c.audio[0].onended();assert.equal(count,1);
  reject(new Error('Stale playback failure'));await Promise.resolve();
  assert.equal(c.spoken.length,0);assert.equal(count,1);
});

test('recording error with no native fallback never completes',t=>{
  const c=setup(t,{native:false});let count=0;
  c.voice.say('tree',false,false,()=>count++);
  const player=c.audio[0],staleEnd=player.onended;
  player.onplaying();player.onerror();staleEnd();
  assert.equal(count,0);assert.equal(c.messages.length,2);
  assert.equal(c.w.document.body.classList.contains('speaking'),false);
});

test('native completion requires every utterance and remains one-shot',t=>{
  const c=setup(t,{recorded:false});let count=0;
  c.voice.say(english,false,false,()=>count++);
  assert.equal(c.audio.length,0);
  c.spoken[0].onstart();
  assert.equal(c.w.document.body.classList.contains('speaking'),true);
  c.spoken[1].onend();c.spoken[1].onend();assert.equal(count,0);
  c.spoken[0].onend();c.spoken[0].onend();assert.equal(count,1);
  assert.equal(c.w.document.body.classList.contains('speaking'),false);
});

for(const error of ['synthesis-failed','interrupted','canceled']){
  test('any native '+error+' invalidates all later completion events',t=>{
    const c=setup(t,{recorded:false});let count=0;
    c.voice.say(english,false,false,()=>count++);
    c.spoken[0].onstart();c.spoken[0].onerror({error});
    c.spoken[0].onend();c.spoken[1].onstart();c.spoken[1].onend();
    assert.equal(count,0);
    assert.equal(c.w.document.body.classList.contains('speaking'),false);
    assert.equal(c.messages.length,error==='synthesis-failed'?1:0);
  });
}

test('native failure after an earlier success still invalidates completion',t=>{
  const c=setup(t,{recorded:false});let count=0;
  c.voice.say(english,false,false,()=>count++);
  c.spoken[0].onend();c.spoken[1].onerror({error:'network'});c.spoken[1].onend();
  assert.equal(count,0);
});

test('failed native fallback never completes a recorded request',t=>{
  const c=setup(t);let count=0;
  c.voice.say(english,false,false,()=>count++);
  c.audio[0].onerror();
  c.spoken[0].onerror({error:'synthesis-failed'});
  for(const u of c.spoken)u.onend();
  assert.equal(count,0);
});

test('stop and replacement invalidate native callbacks',t=>{
  const c=setup(t,{recorded:false});let first=0,second=0,third=0;
  c.voice.say('tree',false,false,()=>first++);
  const old=c.spoken[0];c.voice.stop();old.onend();assert.equal(first,0);
  c.voice.say('tree',false,false,()=>second++);
  c.voice.say('flower',false,false,()=>third++);
  c.spoken[1].onend();assert.equal(second,0);
  c.spoken[2].onend();assert.equal(third,1);
});

test('synchronous native failure never completes',t=>{
  const c=setup(t,{recorded:false,throwSpeak:true});let count=0;
  assert.doesNotThrow(()=>c.voice.say('tree',false,false,()=>count++));
  assert.equal(count,0);assert.equal(c.messages.length,1);
});

test('unavailable speech, empty inputs and muted speech never complete',t=>{
  const c=setup(t,{native:false,recorded:false});let count=0;
  c.voice.say('tree',false,false,()=>count++);
  c.voice.say([],false,false,()=>count++);
  c.voice.say([null,{},42],false,false,()=>count++);
  c.settings.sound=false;c.voice.say('tree',false,false,()=>count++);
  assert.equal(count,0);assert.equal(c.audio.length,0);
});

test('existing three-argument calls still play normally',t=>{
  const c=setup(t);
  c.voice.say('tree');assert.doesNotThrow(()=>c.audio[0].onended());
  c.settings.voiceMode='native';c.voice.say('flower',true,true);
  assert.equal(c.spoken[0].rate,.76);assert.doesNotThrow(()=>c.spoken[0].onend());
});

test('dialog close invalidates pending successful playback',t=>{
  const c=setup(t);let count=0;
  c.voice.say('tree',false,false,()=>count++);
  const end=c.audio[0].onended;c.voice.close();end();
  assert.equal(count,0);
});

test('completion may start a fresh request without duplicate callbacks',t=>{
  const c=setup(t);let first=0,second=0;
  c.voice.say('tree',false,false,()=>{first++;c.voice.say('flower',false,false,()=>second++);});
  const end=c.audio[0].onended;end();end();
  assert.equal(first,1);assert.equal(second,0);
  c.audio[0].onended();assert.equal(second,1);
});
