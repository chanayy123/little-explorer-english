(() => {
  'use strict';
  const STORE = 'little-explorer-block-v1';
  const WORD = 'BLOCK';
  const stages = [
    { name: '听一听', icon: '♫', sub: '认识新朋友', title: '方块的英语，叫 block。', intro: '点一下方块，听听它的英文名字。' },
    { name: '找一找', icon: '⌕', sub: '听声音找方块', title: '听声音，找到方块！', intro: '听一听，然后点出正确的图形。' },
    { name: '说一说', icon: '◖))', sub: '跟着开口说', title: '轮到你的声音啦。', intro: '听一次，说一次。让妈妈听听你的 block。' },
    { name: '用一用', icon: '↗', sub: '把单词放进句子', title: '用英语，介绍你的方块。', intro: '两句小魔法，游戏里、生活里都能用。' },
    { name: '拼一拼', icon: 'Aa', sub: '字母搭建挑战', title: '用字母，搭出 block。', intro: '按顺序点字母，让单词从左到右长出来。' },
    { name: '写一写', icon: '✎', sub: '留下你的笔迹', title: '把新朋友写下来。', intro: '用手指、Apple Pencil，或者纸笔写一次。' }
  ];
  const fresh = () => ({screen:'home',stage:0,completed:[],wordSeen:false,material:'grass',listenRound:0,listenAwaiting:false,said:false,sentence:0,phrases:[false,false],letters:[],strokes:[],showGuide:true,paper:false,writingDone:false,finishedAt:null,sound:true,voiceMode:"auto",recordingVoice:"jenny",englishVoice:"auto",chineseVoice:"auto",speechRate:1,...(window.LessonBook?.preferences()||{})});
  function readState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE));
      if (!raw || !['home','lesson','complete'].includes(raw.screen) || !Number.isInteger(raw.stage) || raw.stage < 0 || raw.stage > 5) return fresh();
      const s = {...fresh(),...raw};
      s.completed = Array.isArray(s.completed) ? [...new Set(s.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<6))].sort((a,b)=>a-b) : [];
      s.material = ['grass','stone','wood'].includes(s.material) ? s.material : 'grass';
      s.listenRound = Math.max(0, Math.min(3, Number(s.listenRound)||0));
      s.phrases = Array.isArray(s.phrases) && s.phrases.length === 2 ? s.phrases.map(Boolean) : [false,false];
      s.sentence = s.sentence === 1 ? 1 : 0;
      s.letters = Array.isArray(s.letters) && s.letters.join('') === WORD.slice(0,s.letters.length) && s.letters.length <= 5 ? s.letters : [];
      s.strokes = Array.isArray(s.strokes) ? s.strokes.slice(0,200).filter(st=>Array.isArray(st)&&st.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y))).map(st=>st.slice(0,1500)) : [];
      if (s.screen === 'complete' && s.completed.length !== 6) s.screen = 'lesson';
      return s;
    } catch { return fresh(); }
  }
  let state = readState();
  const app = document.getElementById('app');
  let resizeObserver = null;
  let toastTimer;
  let spellingHint = false;
  const voicePlayer = window.createLessonVoice({ settings: () => state, save, toast });
  function save() { try {localStorage.setItem(STORE,JSON.stringify(state));} catch {} window.LessonBook?.savePreferences(state); }
  function toast(message) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>el.classList.remove('visible'),3400);
  }
  function stopVoice() { voicePlayer.stop(); }
  function speak(parts, slow=false, force=false) { voicePlayer.say(parts, slow, force); }
  const en = text => ({text,lang:'en-US'});
  const zh = text => ({text,lang:'zh-CN'});
  function speakStage() {
    switch (state.stage) {
      case 0: speak([zh('今天的新朋友，方块。它的英语名字是'),en('block')]); break;
      case 1: speak([zh('听一听，找到'),en('block')]); break;
      case 2: speak([zh('听一次，再跟着说'),en('block')]); break;
      case 3: speak([zh(state.sentence === 0 ? '指着一个方块，跟着说' : '拿起一个方块，跟着说'),en(phraseText())]); break;
      case 4: speak([zh('用字母拼出'),en('block')]); break;
      case 5: speak([zh('用手指或者纸笔，写下'),en('block')]); break;
    }
  }
  function completeStage(stage) {
    if (!state.completed.includes(stage)) {
      state.completed.push(stage);
      state.completed.sort((a,b)=>a-b);
      toast('获得一颗探险星 ★');
    }
    save();
  }
  const unlocked = i => i === 0 || state.completed.includes(i-1);
  const cube = (kind='grass', cls='') => {
    const colors = kind==='stone' ? ['#c8ccbf','#a3ab9d','#85917f'] : kind==='wood' ? ['#e2c396','#c7a171','#a98153'] : ['#b6d789','#b99466','#93774f'];
    return `<svg class="cube-art ${cls}" viewBox="0 0 200 218" aria-hidden="true"><ellipse cx="100" cy="199" rx="72" ry="12" fill="#253f33" opacity=".08"/><path d="M18 63 100 20 182 63 100 106Z" fill="${colors[0]}"/><path d="M18 63v87l82 44v-88Z" fill="${colors[1]}"/><path d="m100 106 82-43v87l-82 44Z" fill="${colors[2]}"/>${kind==='grass'?'<path d="m18 63 82 43v23l-22-12v10l-24-13v-12L18 84Z" fill="#8daf65"/><path d="m100 106 82-43v22l-21 11v12l-28 15v-9l-33 18Z" fill="#638d45"/><path d="m44 65 29-15 29 15-29 15ZM123 50l21-11 20 11-21 11Z" fill="#c5e39a"/><path d="m32 108 20 11v13l-20-11ZM69 150l18 10v18l-18-10Z" fill="#a38159"/><path d="m143 145 19-10v18l-19 10Z" fill="#7f6945"/>' : kind==='stone'?'<path d="m36 95 22 12v19l-22-12ZM73 145l22 11v20l-22-11Z" fill="#929c8c"/><path d="m126 127 22-12v20l-22 12Z" fill="#77846f"/><path d="m49 61 30-16 24 13-30 16Z" fill="#d3d7cd"/>' : '<path d="m32 89 55 30m-55-5 55 30m-55-5 55 30m26-56 54-29m-54 56 54-29m-54 56 54-29" stroke="#a78055" stroke-width="5"/><path d="m139 138 15-8v19l-15 8Z" fill="#8e693e"/>'}</svg>`;
  };
  const ball = () => '<svg class="object-art" viewBox="0 0 170 180" aria-hidden="true"><ellipse cx="85" cy="156" rx="51" ry="9" fill="#253f33" opacity=".08"/><circle cx="85" cy="89" r="57" fill="#f1b972"/><path d="M33 71c28 10 60 13 101-9M31 105c27 14 65 15 108-1M74 35c-13 34-13 77 7 110" stroke="#e49a4e" stroke-width="10"/><path d="M107 39c16 36 17 68 5 100" stroke="#fff0c4" stroke-width="8"/><circle cx="64" cy="63" r="10" fill="#ffdb9d"/></svg>';
  const leaf = () => '<svg class="object-art" viewBox="0 0 170 180" aria-hidden="true"><ellipse cx="85" cy="156" rx="51" ry="9" fill="#253f33" opacity=".08"/><path d="M36 122C26 55 85 32 143 27c0 61-10 105-64 113-22 3-31-5-43-18Z" fill="#a5c583"/><path d="M142 29 48 125" stroke="#71975a" stroke-width="6" stroke-linecap="round"/><path d="m61 114 31-4m-11-16 29-4m-8-21 28-1M76 98l-3-26m23 5-3-23" stroke="#83a366" stroke-width="3"/><path d="m47 126-17 22" stroke="#729451" stroke-width="7" stroke-linecap="round"/></svg>';
  const speaker = (text='听一听', action='listen-word', extra='') => `<button class="speak-button" data-action="${action}" ${extra}><span class="speaker-glyph" aria-hidden="true">◖))</span>${text}</button>`;
  const feedback = (message='',hint=false) => `<div class="feedback${hint?' hint':''}" role="status" aria-live="polite">${message}</div>`;
  function hero() {
    const hasProgress = state.wordSeen || state.completed.length>0;
    const finished = state.completed.length===6;
    return `<section class="hero"><div class="hero-copy"><span class="eyebrow">第 01 课 · 方块世界</span><h1>今天，用英语<br>搭起你的世界。<span class="hero-en" lang="en">Hello, block!</span></h1><p>小小的方块，大大的冒险。<br>和妈妈一起，认识今天的英语新朋友。</p><div class="hero-meta"><span>三年级兴趣英语</span><i class="meta-dot"></i><span>约 8～10 分钟</span><i class="meta-dot"></i><span>1 个新单词</span></div><button class="button primary" data-action="start">${finished?'再看一遍':hasProgress?'继续探险':'开始探险'}<span class="arrow" aria-hidden="true">↗</span></button>${hasProgress?'<button class="resume-link" data-action="ask-restart">想从头学？重新开始</button>':''}<div class="hero-note">先听、再说，最后把单词用起来。</div></div><div class="hero-art"><img src="assets/world.svg" alt="绿色的方块小岛上，小探险家站在树和石头旁"><div class="floating-label"><b lang="en">block</b>你的第一块英语积木</div></div></section><section class="path-section" aria-label="今天的探险路线"><div class="path-heading"><h3>今天的探险路线</h3><span>六个小任务，收集六颗星</span></div><div class="journey">${stages.map((s,i)=>`<div class="journey-card"><span class="journey-icon" aria-hidden="true">${state.completed.includes(i)?'★':s.icon}</span><div><b>${s.name}</b><small>${s.sub}</small></div></div>`).join('')}</div></section>`;
  }
  function stageHeader() {
    const s=stages[state.stage];
    return `<div class="lesson-title"><span class="eyebrow">任务 0${state.stage+1} · ${s.name}</span><h2>${s.title}</h2><p>${s.intro}</p></div>`;
  }
  function ready() {
    return [state.wordSeen,state.listenRound===3,state.said,state.phrases.every(Boolean),state.letters.length===5,state.writingDone][state.stage];
  }
  function bottom(note) {
    return `<div class="lesson-bottom"><p>${note}</p><button class="button primary" data-action="next" ${ready()?'':'disabled'}>${state.stage===5?'领取探险徽章':'下一关'}<span aria-hidden="true">→</span></button></div>`;
  }
  function firstStage() {
    return `<div class="stage-grid"><div class="word-world"><button class="cube-button" data-action="word-cube" aria-label="听 block 的发音">${cube(state.material)}</button><div class="material-switch" aria-label="方块材质">${[['grass','草地方块'],['stone','石头方块'],['wood','木头方块']].map(([key,label])=>`<button class="chip ${state.material===key?'active':''}" data-action="material" data-kind="${key}" aria-pressed="${state.material===key}">${label}</button>`).join('')}</div></div><div class="word-panel"><span class="stage-tag">今天的单词</span><span class="big-word" lang="en">block</span><div class="pronunciation" lang="en">/blɑːk/</div><p class="word-meaning">方块 · 积木<span>一个有棱有角的小家伙</span></p>${speaker('听发音')}${speaker('慢一点','slow-word')}<p class="tiny-note">游戏里的方块，桌上的积木，都可以叫 block。</p></div></div>${feedback(state.wordSeen?'✓ 认识啦！它们都是 block。':'点方块或喇叭，先听一次。',!state.wordSeen)}${bottom('妈妈小提示：指一指屏幕，也可以拿出一块真实积木。')}`;
  }
  function findStage() {
    const arrangements=[['leaf','block','ball'],['block','ball','leaf'],['ball','leaf','block']];
    const kinds=arrangements[Math.min(state.listenRound-(state.listenAwaiting?1:0),2)];
    const materials=['grass','stone','wood'];
    const round=Math.min(state.listenRound-(state.listenAwaiting?1:0),2);
    const done=state.listenRound===3;
    return `<div class="listen-row">${speaker('再听一次')}<span>找到 ${state.listenRound} / 3 个方块</span></div><div class="question-grid">${kinds.map((kind,index)=>`<button class="object-option ${state.listenAwaiting&&kind==='block'?'selected':''}" data-action="choose" data-kind="${kind}" aria-label="第 ${index+1} 张图：${kind==='block'?'有平面和棱角的形状':kind==='ball'?'圆球':'叶子'}" ${state.listenAwaiting?'disabled':''}>${kind==='block'?cube(materials[round]):kind==='ball'?ball():leaf()}${state.listenAwaiting&&kind==='block'?'<span class="answer-check" aria-hidden="true">✓</span>':''}</button>`).join('')}</div><div class="round-dots" aria-hidden="true">${[0,1,2].map(i=>`<span class="${state.listenRound>i?'done':''}"></span>`).join('')}</div>${feedback(done?'★ 三个都找到了！换个样子，它还是 block。':state.listenAwaiting?'✓ 找对了！':'先听，再选。不着急。')}${state.listenAwaiting&&!done?'<div class="button-row"><button class="button orange small" data-action="next-round">再找一个 →</button></div>':''}${bottom('看一看形状：方块有平平的面，还有棱和角。')}`;
  }
  function sayStage() {
    return `<div class="say-card"><span class="stage-tag">先听示范，再跟着读</span><span class="big-word" lang="en">block</span><div class="waveform" aria-hidden="true">${'<i></i>'.repeat(17)}</div><div class="say-actions">${speaker('听示范')}${speaker('慢速示范','slow-word')}</div></div><div class="parent-check"><span><b>对妈妈说一次：block！</b>妈妈听完以后，轻轻点一下。</span><button class="button secondary small" data-action="said">${state.said?'✓ 已经说出来了':'妈妈确认：说出来了'}</button></div>${feedback(state.said?'★ 你的声音，让单词活起来了！':'')}${bottom('不必一次就读得完美。可以再听一次，再试一次。')}`;
  }
  const phraseText = () => state.sentence===0?'This is a block.':'I have a block.';
  function sentenceStage() {
    const idx=state.sentence;
    return `<div class="sentence-tab" role="group" aria-label="两个使用场景"><button class="${idx===0?'active':''}" data-action="sentence" data-index="0">${state.phrases[0]?'✓ ':''}指一指方块</button><button class="${idx===1?'active':''}" data-action="sentence" data-index="1">${state.phrases[1]?'✓ ':''}拿起一个方块</button></div><div class="scene-sentence"><div class="scene-illustration">${cube(idx===0?'grass':'wood')}${idx===0?'<span class="pointer-hand" aria-hidden="true">☜</span>':'<span class="held-hand" aria-hidden="true"></span>'}</div><div><h3 lang="en">${idx===0?'This is a <mark>block.</mark>':'I have a <mark>block.</mark>'}</h3><p>${idx===0?'这是一个方块。':'我有一个方块。'}</p>${speaker('听这句话','listen-phrase')}<p class="tiny-note">${idx===0?'指着屏幕上的方块，试着跟妈妈说。':'拿起一块积木；没有积木，就假装手里拿了一块。'}</p><div class="sentence-confirm"><button class="button secondary small" data-action="phrase-done">${state.phrases[idx]?'✓ 这一句说过啦':'我跟妈妈说完了'}</button></div></div></div>${feedback(state.phrases.every(Boolean)?'★ 两句小魔法，都会用了！':'跟着读就可以，今天不用背整句拼写。')}${bottom('妈妈可以问：“你手里有什么？”孩子试着用英语回答。')}`;
  }
  function spellingStage() {
    const done=state.letters.length===5;
    const hintChar=WORD[state.letters.length];
    return `<div class="listen-row">${speaker('再听单词')}${speaker('听字母顺序','listen-letters')}</div><div class="spell-slots ${done?'spell-success':''}" aria-label="已拼出 ${state.letters.join('') || '零个字母'}">${[...WORD].map((_,i)=>`<div class="spell-slot ${i<state.letters.length?'filled':''} ${spellingHint&&i===state.letters.length?'hinted':''}">${state.letters[i]||(spellingHint&&i===state.letters.length?hintChar:'')}</div>`).join('')}</div><div class="letter-bank" aria-label="可选择的字母">${['O','K','B','A','L','C','E'].map(letter=>`<button class="letter-tile ${state.letters.includes(letter)?'used':''}" data-action="letter" data-letter="${letter}" aria-label="字母 ${letter}" ${state.letters.includes(letter)||done?'disabled':''}>${letter}</button>`).join('')}</div><div class="spell-tools"><button data-action="spell-undo" ${state.letters.length?'':'disabled'}>↶ 撤回一个</button><button data-action="spell-hint" ${done?'disabled':''}>给我一个提示</button></div>${feedback(done?'★ B · L · O · C · K，你搭出来啦！':'从第一个字母开始。不会的话，可以听字母顺序。')}${bottom('小发现：结尾的 c 和 k 在这里一起发 /k/，不用念两次。')}`;
  }
  function writingStage() {
    return `<div class="writing-wrap"><div class="writing-bar"><span class="mini-word" lang="en">block</span><div class="writing-tools"><button class="${state.showGuide?'active':''}" data-action="guide" aria-pressed="${state.showGuide}">${state.showGuide?'隐藏描红':'显示描红'}</button><button data-action="clear-writing">清空重写</button></div></div><div class="canvas-wrap"><canvas id="writing-canvas" tabindex="0" aria-label="block 手写练习区域；也可以选择在纸上写"></canvas></div><p class="writing-help">用手指在上面写。笔迹会保存在这台设备上；这一版由妈妈确认，不会自动判定字母。</p><label class="paper-option"><input type="checkbox" data-action="paper" ${state.paper?'checked':''}>我在纸上写，不在屏幕上写</label><div class="writing-bottom"><p>先看着写，再试试藏起描红写。</p><button class="button secondary small" data-action="written" ${state.strokes.length||state.paper||state.writingDone?'':'disabled'}>${state.writingDone?'✓ 写过啦':'妈妈确认：写过啦'}</button></div></div>${feedback(state.writingDone?'★ 最后一颗星，属于你的认真尝试！':'')}${bottom('会写 BLOCK 或 block 都可以；慢慢练习，不比较漂亮。')}`;
  }
  function lesson() {
    const content=[firstStage,findStage,sayStage,sentenceStage,spellingStage,writingStage][state.stage]();
    return `<section class="lesson-shell"><div class="lesson-head"><button class="back-link" data-action="home">← 探险首页</button><nav class="progress-nav" aria-label="关卡进度">${stages.map((s,i)=>`<button class="step-dot ${i===state.stage?'active':state.completed.includes(i)?'done':''}" data-action="goto" data-stage="${i}" aria-label="第 ${i+1} 关：${s.name}${state.completed.includes(i)?'，已完成':''}" ${i===state.stage?'aria-current="step"':''} ${unlocked(i)?'':'disabled'}>${state.completed.includes(i)?'✓':i+1}<span class="sr-only">${s.name}</span></button>`).join('')}</nav><div class="star-count" aria-label="获得 ${state.completed.length} 颗星"><span aria-hidden="true">★</span>${state.completed.length} / 6</div></div><div class="lesson-card">${stageHeader()}${content}</div></section>`;
  }
  function finish() {
    return `<section class="complete-panel"><div class="medal" aria-hidden="true">★</div><span class="eyebrow">第 01 课 · 探险完成</span><h1>你好，方块小达人！</h1><p>今天，你把一个英语新朋友带进了自己的世界。</p><div class="complete-stars" aria-label="获得全部六颗探险星">★★★★★★</div><div class="certificate"><div><span class="stage-tag">今日词汇收藏</span><span class="big-word" lang="en">block</span><span class="word-meaning">方块 · 积木</span></div><div class="achievement-list">${['认识方块','听音找方块','开口说单词','用短句表达','拼出五个字母','动手写一次'].map(item=>`<span><i>✓</i>${item}</span>`).join('')}</div></div><div class="review-card"><span aria-hidden="true">☀</span><div><b>离开屏幕，还有一个小任务</b><p>拿一块积木给妈妈看，说：“I have a block.”<br>明天开始前，再不看提示说一次 block。</p></div></div><div class="button-row"><button class="button primary" data-action="review-sentences">再听两句小魔法 <span aria-hidden="true">♫</span></button><button class="button secondary" data-action="ask-restart">再探险一次 ↗</button></div><p class="saved-note">本课进度会留在这台设备上。今天学完，就好好休息吧。</p></section>`;
  }
  function render(focus=false) {
    if (resizeObserver) {resizeObserver.disconnect();resizeObserver=null;}
    app.innerHTML = state.screen==='home' ? hero() : state.screen==='complete' ? finish() : lesson();
    updateSoundUI();
    if (state.screen==='lesson'&&state.stage===5) initWriting();
    if (focus) {app.focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});}
  }
  function updateSoundUI() {
    const toggle=document.querySelector('.audio-toggle');
    toggle.setAttribute('aria-pressed',String(state.sound));
    toggle.setAttribute('aria-label',state.sound?'关闭语音':'开启语音');
    toggle.querySelector('.sound-label').textContent=state.sound?'语音开':'语音关';
    toggle.querySelector('.sound-icon').textContent=state.sound?'◖))':'◖×';
  }
  function updateFeedback(message,hint=false) {
    const target=app.querySelector('.feedback');
    if (target) {target.textContent=message;target.classList.toggle('hint',hint);}
  }
  function initWriting() {
    const canvas=document.getElementById('writing-canvas');
    if (!canvas) return;
    const context=canvas.getContext('2d');
    if (!context) {toast('请用纸笔写一次，再请妈妈确认。');return;}
    let width=0,height=0,drawing=false,pointer=null,current=[];
    function paint() {
      context.clearRect(0,0,width,height);
      context.fillStyle='#faf9f1';context.fillRect(0,0,width,height);
      context.setLineDash([7,6]);context.strokeStyle='#d8decd';context.lineWidth=1;
      for (const y of [.3,.73]) {context.beginPath();context.moveTo(18,height*y);context.lineTo(width-18,height*y);context.stroke();}
      context.setLineDash([]);
      if (state.showGuide) {context.fillStyle='#dfe4d4';context.font=`800 ${Math.min(width*.2,height*.6)}px ui-rounded, "Avenir Next", sans-serif`;context.textAlign='center';context.textBaseline='alphabetic';context.fillText('block',width/2,height*.73);}
      context.lineCap='round';context.lineJoin='round';context.strokeStyle='#315841';context.fillStyle='#315841';context.lineWidth=4;
      for (const stroke of state.strokes) {
        if (!stroke.length) continue;
        if (stroke.length===1) {context.beginPath();context.arc(stroke[0].x*width,stroke[0].y*height,2,0,Math.PI*2);context.fill();continue;}
        context.beginPath();context.moveTo(stroke[0].x*width,stroke[0].y*height);
        for (const p of stroke.slice(1)) context.lineTo(p.x*width,p.y*height);
        context.stroke();
      }
    }
    function size() {const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const ratio=Math.min(window.devicePixelRatio||1,3);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);context.setTransform(ratio,0,0,ratio,0,0);paint();}
    const point=ev=>{const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height))};};
    canvas.addEventListener('pointerdown',ev=>{
      if (drawing || state.strokes.length>=200 || (ev.pointerType==='mouse'&&ev.button!==0)) return;
      ev.preventDefault();pointer=ev.pointerId;drawing=true;current=[point(ev)];state.strokes.push(current);
      if (canvas.setPointerCapture) canvas.setPointerCapture(pointer);paint();
    });
    canvas.addEventListener('pointermove',ev=>{if (!drawing||ev.pointerId!==pointer||current.length>=1500)return;ev.preventDefault();current.push(point(ev));paint();});
    const up=ev=>{if (!drawing||ev.pointerId!==pointer)return;drawing=false;pointer=null;save();const button=app.querySelector('[data-action="written"]');if(button)button.disabled=false;};
    canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);
    size();
    if ('ResizeObserver' in window) {resizeObserver=new ResizeObserver(size);resizeObserver.observe(canvas);}
  }
  function confetti() {
    if (window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for(let i=0;i<28;i++) {const bit=document.createElement('i');bit.className='confetti';bit.setAttribute('aria-hidden','true');bit.style.left=(Math.random()*100)+'vw';bit.style.background=['#a7c875','#ffb16b','#b8a0d7','#ead586'][i%4];bit.style.animationDelay=(Math.random()*.45)+'s';bit.style.transform=`rotate(${Math.random()*180}deg)`;document.body.appendChild(bit);setTimeout(()=>bit.remove(),3100);}
  }
  function openDialog(id) {stopVoice();document.getElementById(id).showModal();}
  function goStage(stage) {if(!unlocked(stage))return;state.screen='lesson';state.stage=stage;spellingHint=false;save();render(true);speakStage();}
  function onAction(event) {
    const button=event.target.closest('[data-action]');
    if(!button||button.disabled)return;
    const action=button.dataset.action;
    if(button.tagName==='A')event.preventDefault();
    switch(action) {
      case 'home': stopVoice();state.screen='home';save();render(true);break;
      case 'start': if(state.completed.length===6)state.stage=0;state.screen='lesson';save();render(true);speakStage();break;
      case 'sound': state.sound=!state.sound;save();updateSoundUI();if(!state.sound)stopVoice();else speak('block');break;
      case 'parent': openDialog('parent-dialog');break;
      case 'close-parent': stopVoice();document.getElementById('parent-dialog').close();break;
      case 'voice-test': speak('block',false,true);break;
      case 'voices': if(document.getElementById('parent-dialog').open)document.getElementById('parent-dialog').close();voicePlayer.open();break;
      case 'close-voices': voicePlayer.close();break;
      case 'voice-demo-en': speak([en('block'),en('This is a block.'),en('I have a block.')],false,true);break;
      case 'voice-demo-zh': speak(zh('今天的新朋友，方块。我们一起听一听。'),false,true);break;
      case 'ask-restart': openDialog('restart-dialog');break;
      case 'cancel-restart': document.getElementById('restart-dialog').close();break;
      case 'restart': {stopVoice();document.getElementById('restart-dialog').close();const preferences={sound:state.sound,voiceMode:state.voiceMode,recordingVoice:state.recordingVoice,englishVoice:state.englishVoice,chineseVoice:state.chineseVoice,speechRate:state.speechRate};state={...fresh(),...preferences};state.screen='lesson';spellingHint=false;save();render(true);speakStage();break;}
      case 'goto': goStage(Number(button.dataset.stage));break;
      case 'word-cube': case 'listen-word': case 'slow-word':
        if(state.stage===0&&state.screen==='lesson') {state.wordSeen=true;completeStage(0);render();}
        speak('block',action==='slow-word');break;
      case 'material': if(!['grass','stone','wood'].includes(button.dataset.kind))break;state.material=button.dataset.kind;state.wordSeen=true;completeStage(0);save();render();speak('block');break;
      case 'choose':
        if(state.listenAwaiting||state.listenRound===3)break;
        if(button.dataset.kind==='block') {state.listenRound++;state.listenAwaiting=true;if(state.listenRound===3)completeStage(1);save();render();speak([en('block'),zh('找对了！')]);}
        else {button.classList.remove('shake');void button.offsetWidth;button.classList.add('shake');updateFeedback('再试试：找有平平的面和棱角的那一个。',true);speak([zh('再试试，找到'),en('block')]);}break;
      case 'next-round': if(state.listenRound>=3)break;state.listenAwaiting=false;save();render();speak('block');break;
      case 'said': state.said=true;completeStage(2);render();speak(zh('你说出来啦！'));break;
      case 'sentence': state.sentence=Number(button.dataset.index)===1?1:0;save();render();speak(phraseText());break;
      case 'listen-phrase': speak(phraseText());break;
      case 'phrase-done': state.phrases[state.sentence]=true;if(state.phrases.every(Boolean)) {completeStage(3);render();speak(zh('两句都会用了！'));}else {state.sentence=state.sentence===0?1:0;save();render();speakStage();}break;
      case 'listen-letters': speak('B. L. O. C. K.',true);break;
      case 'letter': {const letter=button.dataset.letter;if(state.letters.length>=5)break;if(letter===WORD[state.letters.length]) {state.letters.push(letter);spellingHint=false;if(state.letters.length===5)completeStage(4);save();render();speak(state.letters.length===5?'block':letter);}else {button.classList.add('shake');updateFeedback('这块字母还不对。听听字母顺序，或者点「提示」。',true);}break;}
      case 'spell-undo': state.letters.pop();spellingHint=false;save();render();break;
      case 'spell-hint': spellingHint=true;render();speak(WORD[state.letters.length]);break;
      case 'guide': state.showGuide=!state.showGuide;save();render();break;
      case 'clear-writing': state.strokes=[];save();render();break;
      case 'paper': state.paper=button.checked;save();render();break;
      case 'written': if(!state.strokes.length&&!state.paper&&!state.writingDone)break;state.writingDone=true;completeStage(5);save();render();speak(zh('认真写过啦，做得好！'));break;
      case 'next':
        if(!ready())break;
        completeStage(state.stage);
        if(state.stage<5)goStage(state.stage+1);
        else if(state.completed.length===6) {state.screen='complete';state.finishedAt=new Date().toISOString();save();render(true);confetti();speak([zh('探险完成！你好，方块小达人。'),en('block')]);}break;
      case 'review-sentences': speak([en('This is a block.'),en('I have a block.')]);break;
    }
  }
  document.addEventListener('click',onAction);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopVoice();});
  window.addEventListener('pagehide',()=>{stopVoice();save();});
  for (const id of ['parent-dialog','restart-dialog']) {
    const dialog=document.getElementById(id);
    dialog.addEventListener('click',event=>{if(event.target===dialog) {const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) {stopVoice();dialog.close();}}});
    dialog.addEventListener('cancel',stopVoice);
  }
  render();
})();
