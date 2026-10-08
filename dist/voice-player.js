(() => {
  'use strict';
  window.createLessonVoice = ({ settings, save, toast }) => {
    const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
    const catalog = window.LESSON_AUDIO || { ready: false };
    let voices=[],serial=0,utterances=[],watchdog,player=null,warned=false;
    const rate = () => [.85,1,1.1].includes(Number(settings().speechRate)) ? Number(settings().speechRate) : 1;
    const usesRecordings = () => catalog.ready && settings().voiceMode !== 'native';
    const nativeScore = voice => (/premium|enhanced|natural|neural|siri|google/i.test(voice.name)?100:0) + (voice.lang==='en-US'||voice.lang==='zh-CN'?25:0) + (/ava|allison|susan|nicky|jenny|aria/i.test(voice.name)?12:0);
    function chooseVoice(lang) {
      const candidates=voices.filter(v=>v.lang.toLowerCase().startsWith(lang.split('-')[0]));
      const selected=lang.startsWith('en')?settings().englishVoice:settings().chineseVoice;
      return candidates.find(v=>v.voiceURI===selected) || [...candidates].sort((a,b)=>nativeScore(b)-nativeScore(a))[0];
    }
    function stop() {
      serial++;clearTimeout(watchdog);
      if(synth)synth.cancel();
      utterances=[];
      if(player){player.onended=null;player.onerror=null;player.onplaying=null;player.pause();try{player.currentTime=0;}catch{}}
      document.body.classList.remove('speaking');
    }
    function nativeSay(items,slow,id) {
      if(!synth||!('SpeechSynthesisUtterance' in window)){toast('这台设备暂时不能朗读，可以请妈妈示范。');return;}
      voices=synth.getVoices();let started=false;
      utterances=items.map(part=>{
        const u=new SpeechSynthesisUtterance(part.text);
        u.lang=part.lang;const voice=chooseVoice(part.lang);if(voice)u.voice=voice;
        u.rate=(part.lang.startsWith('en')?(slow?.76:.96):(slow?.85:1))*rate();
        u.pitch=1;
        u.onstart=()=>{if(id!==serial)return;started=true;document.body.classList.add('speaking');document.getElementById('speech-status').textContent='正在朗读：'+part.text;};
        u.onerror=e=>{if(id!==serial||['interrupted','canceled'].includes(e.error))return;document.body.classList.remove('speaking');if(!warned){warned=true;toast('请再点一次喇叭，或换一个声音试听。');}};
        return u;
      });
      const last=utterances[utterances.length-1];
      if(last)last.onend=()=>{if(id!==serial)return;clearTimeout(watchdog);document.body.classList.remove('speaking');utterances=[];};
      synth.resume();for(const u of utterances)synth.speak(u);
      watchdog=setTimeout(()=>{if(id===serial&&!started){toast('没听到声音？检查音量后，再点一次喇叭。');document.body.classList.remove('speaking');}},5000);
    }
    function recordingFor(part) {
      if(!usesRecordings())return null;
      if(part.lang.startsWith('en'))return catalog.english?.[settings().recordingVoice==='aria'?'aria':'jenny']?.[part.text] || null;
      return catalog.chinese?.[part.text] || null;
    }
    function recordedSay(items,files,slow,id) {
      if(!player)player=new Audio();let index=0,failed=false;
      const fallback=()=>{
        if(id!==serial||failed)return;failed=true;
        player.onended=null;player.onerror=null;player.onplaying=null;player.pause();
        if(!warned){warned=true;toast('录音暂未播放，先使用设备声音。');}
        nativeSay(items,slow,id);
      };
      const next=()=>{
        if(id!==serial)return;
        if(index>=files.length){document.body.classList.remove('speaking');player.onended=null;return;}
        const part=items[index],file=files[index++];
        player.src=new URL(file,document.baseURI).href;
        player.playbackRate=(slow?.78:1)*rate();
        player.preservesPitch=true;player.webkitPreservesPitch=true;
        player.onplaying=()=>{if(id!==serial)return;document.body.classList.add('speaking');document.getElementById('speech-status').textContent='正在朗读：'+part.text;};
        player.onended=next;player.onerror=fallback;
        const promise=player.play();if(promise?.catch)promise.catch(fallback);
      };
      next();
    }
    function say(parts,slow=false,force=false) {
      stop();if(!settings().sound&&!force)return;
      const id=serial;
      const items=(Array.isArray(parts)?parts:[parts]).map(p=>typeof p==='string'?{text:p,lang:'en-US'}:p).filter(p=>p&&typeof p.text==='string'&&typeof p.lang==='string');
      if(!items.length)return;
      const files=items.map(recordingFor);
      if(files.every(Boolean)&&'Audio' in window)recordedSay(items,files,slow,id);else nativeSay(items,slow,id);
    }
    function populateSelect(id,language,key) {
      const select=document.getElementById(id);if(!select)return;
      select.replaceChildren();const automatic=document.createElement('option');automatic.value='auto';automatic.textContent=language==='en'?'自动选择英语声音':'自动选择中文声音';select.appendChild(automatic);
      for(const voice of voices.filter(v=>v.lang.toLowerCase().startsWith(language)).sort((a,b)=>nativeScore(b)-nativeScore(a))){const option=document.createElement('option');option.value=voice.voiceURI;option.textContent=voice.name+' · '+voice.lang;select.appendChild(option);}
      select.value=[...select.options].some(o=>o.value===settings()[key])?settings()[key]:'auto';
    }
    function controls() {
      const recorded=usesRecordings();
      document.getElementById('voice-source-row').hidden=!catalog.ready;
      document.getElementById('voice-source').value=recorded?'recorded':'native';
      document.getElementById('recorded-voice-controls').hidden=!recorded;
      document.getElementById('native-voice-controls').hidden=recorded;
      document.getElementById('recorded-voice').value=settings().recordingVoice==='aria'?'aria':'jenny';
      document.getElementById('voice-speed').value=String(rate());
      populateSelect('english-voice','en','englishVoice');populateSelect('chinese-voice','zh','chineseVoice');
      document.getElementById('available-voice-note').textContent=voices.length?'这里显示这台设备提供的声音，音色选择会自动保存。':'声音列表可能还在加载。稍等几秒再试听，也可以直接使用自动选择。';
    }
    function refresh() {voices=synth?synth.getVoices():[];if(document.getElementById('voice-dialog').open)controls();}
    if(synth){refresh();synth.addEventListener('voiceschanged',refresh);}
    const fields={'english-voice':'englishVoice','chinese-voice':'chineseVoice','voice-source':'voiceMode','recorded-voice':'recordingVoice','voice-speed':'speechRate'};
    document.addEventListener('change',event=>{
      const key=fields[event.target.id];if(!key)return;stop();settings()[key]=key==='speechRate'?Number(event.target.value):event.target.value;save();controls();
    });
    const dialog=document.getElementById('voice-dialog');
    dialog.addEventListener('cancel',stop);
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom){stop();dialog.close();}});
    return {stop,say,open(){stop();refresh();controls();dialog.showModal();},close(){stop();dialog.close();}};
  };
})();
