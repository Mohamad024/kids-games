// ===== امرح وتعلّم - محرك الألعاب =====
const STORE_KEY = 'imrah_learn_v1';
const TOTAL_Q = 10;

let store = loadStore();
let game = null;
let timerInt = null;
let timeLeft = 20;
let selectedAvatar = '🦁';
let soundOn = store.soundOn !== false;

function loadStore(){
  try{
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if(s) return s;
  }catch(e){}
  return {
    name:'', avatar:'🦁', points:0, games:0, stars:0,
    best:{math:0,arabic:0,english:0,science:0},
    badges:[], board:[], soundOn:true, theme:'day'
  };
}
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(store)); }

// ---------- الصوت ----------
let audioCtx = null;
function tone(freq, dur=0.15, delay=0, type='sine'){
  if(!soundOn) return;
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    const t = audioCtx.currentTime + delay;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t+dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t+dur);
  }catch(e){}
}
const sfx = {
  click:()=>tone(600,0.08),
  correct:()=>{tone(523,0.12);tone(659,0.12,0.1);tone(784,0.2,0.2);},
  wrong:()=>{tone(300,0.2,0,'sawtooth');tone(220,0.25,0.12,'sawtooth');},
  win:()=>{[523,659,784,1046,784,1046].forEach((f,i)=>tone(f,0.18,i*0.13));},
  tick:()=>tone(880,0.05)
};

// ---------- بنوك الأسئلة ----------
// رياضيات: توليد ديناميكي
function genMath(level){
  let a,b,op,ans,text;
  const r=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
  if(level==='easy'){
    a=r(1,10); b=r(1,10);
    if(Math.random()<0.5){op='+';ans=a+b;text=`كم يساوي ${a} + ${b} ؟`;}
    else{if(b>a)[a,b]=[b,a];op='−';ans=a-b;text=`كم يساوي ${a} − ${b} ؟`;}
  }else if(level==='medium'){
    const t=Math.random();
    if(t<0.4){a=r(10,50);b=r(5,30);op='+';ans=a+b;text=`كم يساوي ${a} + ${b} ؟`;}
    else if(t<0.7){a=r(10,50);b=r(1,20);op='−';ans=a-b;text=`كم يساوي ${a} − ${b} ؟`;}
    else{a=r(2,9);b=r(2,9);op='×';ans=a*b;text=`كم يساوي ${a} × ${b} ؟`;}
  }else{
    const t=Math.random();
    if(t<0.4){a=r(6,12);b=r(6,12);op='×';ans=a*b;text=`كم يساوي ${a} × ${b} ؟`;}
    else if(t<0.7){b=r(2,9);ans=r(2,12);a=b*ans;op='÷';text=`كم يساوي ${a} ÷ ${b} ؟`;}
    else{a=r(50,150);b=r(20,80);op='+';ans=a+b;text=`كم يساوي ${a} + ${b} ؟`;}
  }
  const opts=new Set([ans]);
  while(opts.size<4){
    const d=ans+ r(-10,10);
    if(d!==ans && d>=0) opts.add(d);
  }
  return {text, emoji: op==='+'?'➕':op==='−'?'➖':op==='×'?'✖️':'➗', answer:ans, options:shuffle([...opts])};
}

const ARABIC_BANK = {
easy:[
 {q:'أكمل الكلمة: مَدرَ...ة', emoji:'🏫', a:'س', opts:['س','ص','ش','ث']},
 {q:'ما أول حرف في كلمة 🍎 تفاحة؟', emoji:'🍎', a:'ت', opts:['ت','ف','ا','ح']},
 {q:'أكمل: قَلَ...', emoji:'✏️', a:'م', opts:['م','ن','ب','ل']},
 {q:'كلمة فيها حرف (ب):', emoji:'🔤', a:'باب', opts:['باب','نار','سور','تين']},
 {q:'ما الحرف الناقص: أَسَ...؟', emoji:'🦁', a:'د', opts:['د','ر','ز','ط']},
 {q:'اختر الكلمة الصحيحة للصورة 🐱', emoji:'🐱', a:'قطة', opts:['قطة','كلب','عصفور','سمكة']},
 {q:'اختر الكلمة الصحيحة للصورة 🌙', emoji:'🌙', a:'قمر', opts:['قمر','شمس','نجمة','سحاب']},
 {q:'كم عدد حروف كلمة (باب)؟', emoji:'🚪', a:'3', opts:['3','2','4','5']},
 {q:'ما جمع كلمة (قلم)؟', emoji:'✏️', a:'أقلام', opts:['أقلام','قلمان','قلمون','قلمات']},
 {q:'أكمل: شَمس...', emoji:'☀️', a:'ة', opts:['ة','ا','ن','م']},
 {q:'كلمة تبدأ بحرف الميم:', emoji:'🌙', a:'موز', opts:['موز','تفاح','عنب','تين']},
 {q:'اختر الكلمة الصحيحة 🐝', emoji:'🐝', a:'نحلة', opts:['نحلة','ذبابة','فراشة','نملة']},
],
medium:[
 {q:'مرادف كلمة (سعيد):', emoji:'😊', a:'فرح', opts:['فرح','حزين','غاضب','متعب']},
 {q:'عكس كلمة (كبير):', emoji:'🐘', a:'صغير', opts:['صغير','ضخم','طويل','عريض']},
 {q:'أكمل الجملة: ... تشرق صباحاً', emoji:'☀️', a:'الشمس', opts:['الشمس','القمر','النجوم','الغيوم']},
 {q:'ما نوع كلمة (يلعب)؟', emoji:'⚽', a:'فعل', opts:['فعل','اسم','حرف','صفة']},
 {q:'جمع كلمة (كتاب):', emoji:'📚', a:'كتب', opts:['كتب','كاتبون','كتيبات','مكتبات']},
 {q:'اختر الكلمة المكتوبة صحيحاً:', emoji:'✍️', a:'مدرسة', opts:['مدرسة','مضرصة','مدرصه','مدرست']},
 {q:'حرف الجر في: ذهب أحمد ... المدرسة', emoji:'🏫', a:'إلى', opts:['إلى','هل','لكن','ثم']},
 {q:'مفرد كلمة (أشجار):', emoji:'🌳', a:'شجرة', opts:['شجرة','شجر','شاجر','شجير']},
 {q:'عكس (سريع):', emoji:'🐢', a:'بطيء', opts:['بطيء','سريع جداً','نشيط','قوي']},
 {q:'أكمل: الطيور ... في السماء', emoji:'🐦', a:'تطير', opts:['تطير','تسبح','تمشي','تقفز']},
],
hard:[
 {q:'إعراب كلمة (الطالب) في: نجح الطالبُ', emoji:'🎓', a:'فاعل مرفوع', opts:['فاعل مرفوع','مفعول به','مبتدأ','خبر']},
 {q:'مرادف (غامض):', emoji:'🌫️', a:'مبهم', opts:['مبهم','واضح','سهل','قريب']},
 {q:'اختر الجملة الصحيحة نحوياً:', emoji:'📝', a:'الطلاب مجتهدون', opts:['الطلاب مجتهدون','الطلاب مجتهد','الطلاب مجتهدين','الطالب مجتهدون']},
 {q:'جمع (قاعدة) جمع تكسير:', emoji:'📏', a:'قواعد', opts:['قواعد','قاعدات','قاعدون','قواعدات']},
 {q:'ضد كلمة (الكرم):', emoji:'🎁', a:'البخل', opts:['البخل','العطاء','السخاء','الجود']},
 {q:'كلمة (مكتبة) فيها:', emoji:'📚', a:'تاء مربوطة', opts:['تاء مربوطة','تاء مفتوحة','هاء','ألف']},
 {q:'الفعل الماضي من (يلعب):', emoji:'⚽', a:'لعب', opts:['لعب','يلعب','العب','لاعب']},
 {q:'حرف العطف في: جاء أحمد وخالد', emoji:'👬', a:'الواو', opts:['الواو','في','إلى','من']},
]
};

const ENGLISH_BANK = {
easy:[
 {emoji:'🍎', word:'Apple', ar:'تفاحة'},
 {emoji:'🐱', word:'Cat', ar:'قطة'},
 {emoji:'🐶', word:'Dog', ar:'كلب'},
 {emoji:'☀️', word:'Sun', ar:'شمس'},
 {emoji:'🌙', word:'Moon', ar:'قمر'},
 {emoji:'🐟', word:'Fish', ar:'سمكة'},
 {emoji:'🐦', word:'Bird', ar:'عصفور'},
 {emoji:'🍌', word:'Banana', ar:'موزة'},
 {emoji:'⚽', word:'Ball', ar:'كرة'},
 {emoji:'📚', word:'Book', ar:'كتاب'},
 {emoji:'🏠', word:'House', ar:'بيت'},
 {emoji:'🚗', word:'Car', ar:'سيارة'},
],
medium:[
 {emoji:'🦁', word:'Lion', ar:'أسد'},
 {emoji:'🐘', word:'Elephant', ar:'فيل'},
 {emoji:'🦋', word:'Butterfly', ar:'فراشة'},
 {emoji:'🌳', word:'Tree', ar:'شجرة'},
 {emoji:'🌸', word:'Flower', ar:'زهرة'},
 {emoji:'🍯', word:'Honey', ar:'عسل'},
 {emoji:'🥛', word:'Milk', ar:'حليب'},
 {emoji:'🍞', word:'Bread', ar:'خبز'},
 {emoji:'👨‍⚕️', word:'Doctor', ar:'طبيب'},
 {emoji:'👩‍🏫', word:'Teacher', ar:'معلمة'},
],
hard:[
 {emoji:'🚀', word:'Rocket', ar:'صاروخ'},
 {emoji:'🪐', word:'Planet', ar:'كوكب'},
 {emoji:'🌋', word:'Volcano', ar:'بركان'},
 {emoji:'🦖', word:'Dinosaur', ar:'ديناصور'},
 {emoji:'🔬', word:'Microscope', ar:'مجهر'},
 {emoji:'💡', word:'Idea', ar:'فكرة'},
 {emoji:'🌈', word:'Rainbow', ar:'قوس قزح'},
 {emoji:'❄️', word:'Snow', ar:'ثلج'},
]
};

const SCIENCE_BANK = {
easy:[
 {q:'كم عدد أرجل القطة؟', emoji:'🐱', a:'4', opts:['4','2','6','8']},
 {q:'ما لون السماء في النهار؟', emoji:'☁️', a:'أزرق', opts:['أزرق','أخضر','أحمر','أسود']},
 {q:'ماذا يأكل الأرنب؟', emoji:'🐰', a:'جزر', opts:['جزر','لحم','سمك','حلويات']},
 {q:'أين تعيش السمكة؟', emoji:'🐟', a:'في الماء', opts:['في الماء','على الشجرة','في الصحراء','في البيت فقط']},
 {q:'كم عدد أيام الأسبوع؟', emoji:'📅', a:'7', opts:['7','5','10','6']},
 {q:'ما الذي يضيء لنا في النهار؟', emoji:'☀️', a:'الشمس', opts:['الشمس','القمر','النجوم','المصباح']},
 {q:'الطيور تطير بـ...', emoji:'🐦', a:'الأجنحة', opts:['الأجنحة','الأرجل','الذيل','المنقار فقط']},
 {q:'ماذا نشرب عندما نعطش؟', emoji:'💧', a:'الماء', opts:['الماء','العصير فقط','الحليب فقط','الشاي فقط']},
 {q:'كم عدد أصابع اليد الواحدة؟', emoji:'✋', a:'5', opts:['5','4','6','10']},
 {q:'ما صوت القطة؟', emoji:'🐱', a:'مواء', opts:['مواء','نباح','زقزقة','خوار']},
],
medium:[
 {q:'كم عدد كواكب المجموعة الشمسية؟', emoji:'🪐', a:'8', opts:['8','9','7','10']},
 {q:'ما أقرب كوكب إلى الشمس؟', emoji:'☀️', a:'عطارد', opts:['عطارد','الزهرة','الأرض','المريخ']},
 {q:'كم عدد أسنان الإنسان البالغ؟', emoji:'🦷', a:'32', opts:['32','28','20','30']},
 {q:'ماذا يحتاج النبات لينمو؟', emoji:'🌱', a:'ماء وضوء', opts:['ماء وضوء','حلويات','لحم','رمل فقط']},
 {q:'ما أكبر حيوان في العالم؟', emoji:'🐋', a:'الحوت الأزرق', opts:['الحوت الأزرق','الفيل','الزرافة','القرش']},
 {q:'كم عدد أرجل العنكبوت؟', emoji:'🕷️', a:'8', opts:['8','6','4','10']},
 {q:'ما الغاز الذي نتنفسه؟', emoji:'💨', a:'الأكسجين', opts:['الأكسجين','الهيليوم','ثاني أكسيد الكربون','النيتروجين فقط']},
 {q:'الفراشة تخرج من...', emoji:'🦋', a:'الشرنقة', opts:['الشرنقة','البيضة مباشرة','الزهرة','التراب']},
],
hard:[
 {q:'ما أكبر كوكب في المجموعة الشمسية؟', emoji:'🪐', a:'المشتري', opts:['المشتري','زحل','الأرض','المريخ']},
 {q:'ما العضو الذي يضخ الدم؟', emoji:'❤️', a:'القلب', opts:['القلب','الرئة','المعدة','الكبد']},
 {q:'كم عدد عظام جسم الإنسان؟', emoji:'🦴', a:'206', opts:['206','106','306','156']},
 {q:'ما أسرع حيوان بري؟', emoji:'🐆', a:'الفهد', opts:['الفهد','الأسد','الغزال','الحصان']},
 {q:'الماء يغلي عند درجة...', emoji:'💧', a:'100', opts:['100','90','80','120']},
 {q:'ما الكوكب الملقب بالكوكب الأحمر؟', emoji:'🔴', a:'المريخ', opts:['المريخ','الزهرة','عطارد','نبتون']},
 {q:'الديناصورات انقرضت منذ حوالي...', emoji:'🦖', a:'65 مليون سنة', opts:['65 مليون سنة','1000 سنة','10 آلاف سنة','مليون سنة']},
 {q:'ما وظيفة الأوراق في النبات؟', emoji:'🍃', a:'صنع الغذاء', opts:['صنع الغذاء','امتصاص الماء','تثبيت النبات','التكاثر فقط']},
]
};

const BADGES = [
 {id:'first', emoji:'🎮', name:'أول مغامرة'},
 {id:'p100', emoji:'⭐', name:'100 نقطة'},
 {id:'p500', emoji:'💫', name:'500 نقطة'},
 {id:'math', emoji:'➕', name:'عبقري الرياضيات'},
 {id:'arabic', emoji:'📚', name:'بطل العربية'},
 {id:'english', emoji:'🔤', name:'نجم الإنجليزية'},
 {id:'science', emoji:'🔬', name:'عالم الغابة'},
 {id:'streak5', emoji:'🔥', name:'سلسلة نارية'},
];

const CHEERS = ['أحسنت! 🎉','رائع! ⭐','ممتاز! 👏','عبقري! 🧠','واصل! 🚀','مذهل! 🌟'];
const SAD = ['لا بأس! حاول مجدداً 💪','قريب! ركّز أكثر 🧐','ستنجح المرة القادمة! 🍀'];
const MASCOTS = ['مرحباً يا بطل! أنا لولو! اختر لعبة 👇','هل تعلم؟ الأسد يحب الأذكياء! 🦁','اجمع 500 نقطة لتصبح ملك الغابة! 👑','العب كل يوم واكسب شارات جديدة! 🎖️'];

// ---------- أدوات ----------
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function $(id){return document.getElementById(id);}
function openModal(id){$(id).classList.remove('hidden');}
function closeModal(id){$(id).classList.add('hidden');}
function scrollToTop(e){if(e)e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});}
function speak(text){
  if(!soundOn) return;
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang='en-US'; u.rate=0.8;
    speechSynthesis.speak(u);
  }catch(e){}
}

// ---------- الملف الشخصي ----------
function refreshUI(){
  $('totalPoints').textContent = store.points;
  $('statPoints').textContent = store.points;
  $('statGames').textContent = store.games;
  $('statStars').textContent = store.stars;
  $('profileName').textContent = store.name || 'صديقنا';
  $('profileAvatar').textContent = store.avatar || '🦊';
  $('badgesCount').textContent = `${store.badges.length}/8`;
  ['math','arabic','english','science'].forEach(k=>{
    const el=$('best-'+k); if(el) el.textContent=`⭐ ${store.best[k]||0}`;
  });
  $('soundBtn').textContent = soundOn ? '🔊' : '🔇';
  renderBadges(); renderBoard();
}

function renderBadges(){
  const g=$('badgesGrid'); if(!g) return; g.innerHTML='';
  BADGES.forEach(b=>{
    const un = store.badges.includes(b.id);
    const d=document.createElement('div');
    d.className='badge-item '+(un?'unlocked':'locked');
    d.innerHTML=`${un?b.emoji:'🔒'}<small>${b.name}</small>`;
    g.appendChild(d);
  });
}
function unlockBadge(id){
  if(!store.badges.includes(id)){
    store.badges.push(id); save(); refreshUI();
    tone(1046,0.2); setTimeout(()=>tone(1318,0.3),150);
    showToast(`🎖️ شارة جديدة: ${BADGES.find(b=>b.id===id).name}!`);
  }
}
function showToast(msg){
  const f=$('feedback'); // إعادة استخدام بسيطة
  const t=document.createElement('div');
  t.textContent=msg;
  t.style.cssText='position:fixed;bottom:20px;right:50%;transform:translateX(50%);background:#2e7d32;color:#fff;padding:12px 20px;border-radius:999px;font-weight:800;z-index:300;box-shadow:0 8px 20px rgba(0,0,0,.25)';
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2600);
}

function renderBoard(){
  const list=$('boardList'); if(!list) return; list.innerHTML='';
  const sorted=[...store.board].sort((a,b)=>b.points-a.points).slice(0,10);
  if(!sorted.length) list.innerHTML='<li>لا يوجد أبطال بعد — كن الأول! 🦁</li>';
  sorted.forEach((p,i)=>{
    const li=document.createElement('li');
    const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`;
    li.innerHTML=`<span>${medal} ${p.avatar} ${p.name}</span><b>${p.points} ⭐</b>`;
    list.appendChild(li);
  });
}
function pushBoard(score){
  if(!store.name) return;
  const ex = store.board.find(p=>p.name===store.name);
  if(ex){ ex.points=Math.max(ex.points, store.points); ex.avatar=store.avatar; }
  else store.board.push({name:store.name, avatar:store.avatar, points:store.points});
  save();
}
function clearBoard(){ store.board=[]; save(); renderBoard(); }
function resetAll(){
  if(confirm('هل أنت متأكد؟ سيتم مسح كل النقاط والشارات!')){
    localStorage.removeItem(STORE_KEY);
    location.reload();
  }
}

// ---------- توليد سؤال ----------
function drawFromDeck(key, bank){
  // سحب بدون تكرار داخل الجولة: نستهلك نسخة مخلوطة، وعند نفادها نعيد الخلط
  if(!game.deck[key] || !game.deck[key].length){
    game.deck[key]=shuffle([...bank]);
  }
  return game.deck[key].pop();
}

function makeQuestion(subject, level){
  if(subject==='math'){
    // توليد بدون تكرار داخل الجولة
    if(!game.usedMath) game.usedMath=new Set();
    let m, tries=0;
    do{
      m=genMath(level); tries++;
    }while(game.usedMath.has(m.text) && tries<25);
    game.usedMath.add(m.text);
    return {text:m.text, emoji:m.emoji, answer:m.answer, options:m.options.map(String), speak:null};
  }
  if(subject==='arabic'){
    const bank=ARABIC_BANK[level]||ARABIC_BANK.easy;
    const q=drawFromDeck('bank', bank);
    return {text:q.q, emoji:q.emoji, answer:q.a, options:shuffle([...q.opts]), speak:null};
  }
  if(subject==='english'){
    const bank=ENGLISH_BANK[level]||ENGLISH_BANK.easy;
    const q=drawFromDeck('bank', bank);
    const others=shuffle(bank.filter(x=>x.word!==q.word)).slice(0,3).map(x=>x.word);
    const mode=Math.random()<0.5? 'en':'ar';
    if(mode==='en'){
      return {text:`ما معنى هذه الكلمة بالإنجليزية ${q.emoji} ؟`, emoji:q.emoji, answer:q.word, options:shuffle([q.word,...others]), speak:q.word, hint:`${q.ar}`};
    }else{
      return {text:`ماذا تعني كلمة "${q.word}" ؟ ${q.emoji}`, emoji:q.emoji, answer:q.ar, options:shuffle([q.ar,...shuffle(bank.filter(x=>x.word!==q.word)).slice(0,3).map(x=>x.ar)]), speak:q.word, hint:''};
    }
  }
  // science
  const bank=SCIENCE_BANK[level]||SCIENCE_BANK.easy;
  const q=drawFromDeck('bank', bank);
  return {text:q.q, emoji:q.emoji, answer:q.a, options:shuffle([...q.opts]), speak:null};
}

// ---------- بدء اللعب ----------
const TITLES={math:'الأرقام 🔢',arabic:'الحروف 📖',english:'English 🔤',science:'العلوم 🔬'};
const LEVEL_NAMES={easy:'😊 سهل',medium:'🤩 وسط',hard:'🚀 صعب'};

function startGame(subject, level){
  sfx.click();
  game={subject,level,qIndex:0,score:0,streak:0,maxStreak:0,correct:0,current:null,deck:{},usedMath:new Set()};
  timeLeft = level==='hard'?15:20;
  $('games').classList.add('hidden');
  $('resultSection').classList.add('hidden');
  $('playSection').classList.remove('hidden');
  $('playTitle').textContent=TITLES[subject];
  $('playLevel').textContent=LEVEL_NAMES[level];
  $('playSection').scrollIntoView({behavior:'smooth'});
  nextQuestion();
}
function exitGame(toGames=false){
  clearInterval(timerInt);
  $('playSection').classList.add('hidden');
  $('resultSection').classList.add('hidden');
  $('games').classList.remove('hidden');
  if(toGames) $('games').scrollIntoView({behavior:'smooth'});
  game=null;
}

function nextQuestion(){
  clearInterval(timerInt);
  if(game.qIndex>=TOTAL_Q){ endGame(); return; }
  game.current = makeQuestion(game.subject, game.level);
  const c=game.current;
  $('qText').textContent=c.text + (c.hint?` (تعني: ${c.hint})`:'');
  $('qEmoji').textContent=c.emoji;
  $('progressText').textContent=`${game.qIndex+1} / ${TOTAL_Q}`;
  $('progressFill').style.width=`${(game.qIndex/TOTAL_Q)*100}%`;
  $('currentScore').textContent=game.score;
  $('streak').textContent=game.streak;
  $('feedback').textContent=''; $('feedback').className='feedback';

  const spk=$('speakBtn');
  if(c.speak){ spk.classList.remove('hidden'); spk.onclick=()=>speak(c.speak); }
  else spk.classList.add('hidden');

  const grid=$('answersGrid'); grid.innerHTML='';
  c.options.forEach(opt=>{
    const b=document.createElement('button');
    b.className='answer-btn'; b.textContent=opt;
    b.onclick=()=>answer(opt,b);
    grid.appendChild(b);
  });

  // المؤقت
  timeLeft = game.level==='hard'?15:20;
  updateTimer();
  let lastTick=timeLeft;
  timerInt=setInterval(()=>{
    timeLeft--;
    updateTimer();
    if(timeLeft<=5 && timeLeft!==lastTick){ sfx.tick(); lastTick=timeLeft; }
    if(timeLeft<=0){ clearInterval(timerInt); onTimeout(); }
  },1000);
}
function updateTimer(){
  const t=$('timerCircle');
  t.textContent=`⏱ ${timeLeft}`;
  t.style.background = timeLeft<=5 ? '#EF4444' : '';
}

function answer(choice, btn){
  if(!game||!game.current) return;
  clearInterval(timerInt);
  const c=game.current;
  const btns=[...document.querySelectorAll('.answer-btn')];
  btns.forEach(b=>b.disabled=true);
  const ok = String(choice)===String(c.answer);
  if(ok){
    btn.classList.add('correct');
    const bonus = Math.min(5, Math.floor(timeLeft/4));
    const streakBonus = game.streak>=2?5:0;
    game.score+=10+bonus+streakBonus;
    game.streak++; game.maxStreak=Math.max(game.maxStreak,game.streak); game.correct++;
    $('feedback').textContent=CHEERS[Math.floor(Math.random()*CHEERS.length)]+(streakBonus?` +${streakBonus} سلسلة! 🔥`:'');
    $('feedback').className='feedback good';
    sfx.correct();
    if(game.streak===5) unlockBadge('streak5');
  }else{
    btn.classList.add('wrong');
    btns.forEach(b=>{ if(String(b.textContent)===String(c.answer)) b.classList.add('correct'); });
    game.streak=0;
    $('feedback').textContent=`${SAD[Math.floor(Math.random()*SAD.length)]} الصح: ${c.answer}`;
    $('feedback').className='feedback bad';
    sfx.wrong();
  }
  game.qIndex++;
  $('currentScore').textContent=game.score;
  $('streak').textContent=game.streak;
  $('progressFill').style.width=`${(game.qIndex/TOTAL_Q)*100}%`;
  setTimeout(nextQuestion, ok?900:1600);
}
function onTimeout(){
  const c=game.current;
  const btns=[...document.querySelectorAll('.answer-btn')];
  btns.forEach(b=>{b.disabled=true; if(String(b.textContent)===String(c.answer)) b.classList.add('correct');});
  game.streak=0; game.qIndex++;
  $('feedback').textContent=`⏰ انتهى الوقت! الصح: ${c.answer}`;
  $('feedback').className='feedback bad';
  sfx.wrong();
  setTimeout(nextQuestion,1400);
}

function endGame(){
  $('playSection').classList.add('hidden');
  $('resultSection').classList.remove('hidden');
  $('resultSection').scrollIntoView({behavior:'smooth'});
  const pct=game.correct/TOTAL_Q;
  let stars = pct>=0.9?3: pct>=0.6?2: pct>=0.3?1:0;
  $('resultStars').textContent = stars? '⭐'.repeat(stars)+'☆'.repeat(3-stars) : '💪 حاول مجدداً!';
  $('resultEmoji').textContent = stars===3?'🏆':stars===2?'🎉':stars===1?'👏':'🦁';
  $('resultTitle').textContent = stars===3?'مذهل يا بطل الغابة!':stars===2?'أحسنت! عمل رائع!':stars===1?'جيد! واصل التدرب!':'لا تستسلم يا أسد!';
  $('resultMsg').textContent=`أجبت ${game.correct} من ${TOTAL_Q} وجمعت ${game.score} نقطة!`;

  // حفظ
  store.points+=game.score; store.games++; store.stars+=stars;
  if(game.score>(store.best[game.subject]||0)) store.best[game.subject]=game.score;
  if(store.badges.length===0 || !store.badges.includes('first')) unlockBadge('first');
  if(store.points>=100) unlockBadge('p100');
  if(store.points>=500) unlockBadge('p500');
  if(game.correct>=8){
    if(game.subject==='math') unlockBadge('math');
    if(game.subject==='arabic') unlockBadge('arabic');
    if(game.subject==='english') unlockBadge('english');
    if(game.subject==='science') unlockBadge('science');
  }
  pushBoard(game.score); save(); refreshUI();
  if(stars>=2){ sfx.win(); launchConfetti(); } else sfx.correct();

  $('replayBtn').onclick=()=>{ sfx.click(); startGame(game.subject, game.level); };
}

// ---------- كونفيتي ----------
function launchConfetti(){
  const c=$('confettiCanvas'), ctx=c.getContext('2d');
  c.width=innerWidth; c.height=innerHeight;
  const colors=['#ff5252','#ffeb3b','#69f0ae','#40c4ff','#e040fb','#ff9800'];
  const parts=Array.from({length:140},()=>({
    x:Math.random()*c.width, y:-20-Math.random()*c.height*0.3,
    w:8+Math.random()*8, h:8+Math.random()*6,
    color:colors[Math.floor(Math.random()*colors.length)],
    vy:2+Math.random()*3, vx:-1+Math.random()*2, rot:Math.random()*Math.PI
  }));
  let frames=0;
  (function tick(){
    ctx.clearRect(0,0,c.width,c.height);
    parts.forEach(p=>{
      p.y+=p.vy; p.x+=p.vx; p.rot+=0.05;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle=p.color; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    });
    if(++frames<220) requestAnimationFrame(tick);
    else ctx.clearRect(0,0,c.width,c.height);
  })();
}

// ---------- الوضع النهاري / الليلي ----------
function applyTheme(){
  const t = store.theme || 'day';
  document.documentElement.setAttribute('data-theme', t);
  const b=$('themeBtn');
  if(b) b.textContent = t==='night' ? '☀️' : '🌙';
}
function toggleTheme(){
  store.theme = (store.theme==='night') ? 'day' : 'night';
  save(); applyTheme(); sfx.click();
}

// ---------- التهيئة ----------
document.addEventListener('DOMContentLoaded',()=>{
  applyTheme();
  refreshUI();

  // الترحيب
  if(!store.name){ openModal('welcomeModal'); }
  else $('welcomeModal').classList.add('hidden');

  // اختيار الصورة
  document.querySelectorAll('#avatarGrid button').forEach(b=>{
    b.onclick=()=>{
      document.querySelectorAll('#avatarGrid button').forEach(x=>x.classList.remove('selected'));
      b.classList.add('selected'); selectedAvatar=b.dataset.avatar; sfx.click();
    };
  });
  document.querySelector('#avatarGrid button').classList.add('selected');

  $('startJourneyBtn').onclick=()=>{
    const name=$('playerNameInput').value.trim();
    if(!name){ alert('اكتب اسمك أولاً يا بطل! 😊'); return; }
    store.name=name; store.avatar=selectedAvatar; save(); refreshUI();
    $('welcomeModal').classList.add('hidden');
    sfx.win(); showToast(`أهلاً ${name}! هيا نلعب! 🦁`);
  };
  $('profileChip').onclick=()=>{
    const n=prompt('ما اسمك يا بطل؟', store.name||'');
    if(n){ store.name=n.trim().slice(0,20); save(); refreshUI(); pushBoard(0); }
  };
  $('leaderboardBtn').onclick=()=>{ sfx.click(); renderBoard(); openModal('leaderboardModal'); };
  $('soundBtn').onclick=()=>{
    soundOn=!soundOn; store.soundOn=soundOn; save(); refreshUI(); sfx.click();
  };
  const tb=$('themeBtn'); if(tb) tb.onclick=toggleTheme;
  // رسائل لولو
  let mi=0;
  setInterval(()=>{
    mi=(mi+1)%MASCOTS.length;
    const b=$('mascotBubble'); if(b) b.textContent=MASCOTS[mi];
  },6000);

  window.addEventListener('resize',()=>{
    const c=$('confettiCanvas'); c.width=innerWidth; c.height=innerHeight;
  });
});
