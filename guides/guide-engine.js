/* Qo'llanmalarning umumiy render kodi.
 *
 * GENERATSIYA QILINGAN: tools/extract-guide-engine.mjs qo'llanmalar ichidagi
 * bir xil koddan chiqargan. Bu yerni tahrirlash mumkin, ammo o'zgarish
 * hamma qo'llanmaga tegishli bo'ladi.
 *
 * Ma'lumot (TABS, STEPS, CALC, BAN, CARGO, WORDS, FAQ, CHECK) har bir
 * qo'llanmaning o'z ichidagi skriptda e'lon qilinadi va shu yerda
 * ishlatiladi — klassik skriptlarda top-level const global leksik
 * doirada bo'lgani uchun bu ishlaydi.
 */
/* ---------- PANELLARNI TALAB BO'YICHA CHIZISH ----------
   Qo'llanma ochilganda ilgari hamma bo'lim birdaniga qurilardi: lug'at
   (50-80 yozuv), taqiqlar jadvali (40 qator), FAQ, checklist, kargo — jami
   bir necha ming element, ularning to'qqiztasi esa o'sha zahoti yashirin
   panelda turardi. Endi ochilishda faqat faol panel chiziladi, qolganlari
   tab birinchi marta bosilganda. */
const PANEL_DRAW = new Map();
function drawPanel(panel){
  if(!panel) return;
  const fn = PANEL_DRAW.get(panel);
  if(!fn) return;
  PANEL_DRAW.delete(panel);
  fn();
  // Sahifa balandligi o'zgardi — guide.js progress chizig'ini qayta o'lchaydi.
  document.dispatchEvent(new CustomEvent('xy:panel',{detail:panel.id}));
}
/* elId — panel ichidagi biror element; shu orqali qaysi panelga tegishli
   ekanini topamiz (qo'llanmalarda panel nomlari har xil). */
function whenPanelOpens(elId, fn){
  const el = document.getElementById(elId);
  const panel = el && el.closest('.panel');
  if(!panel || panel.classList.contains('active')){ fn(); return; }
  PANEL_DRAW.set(panel, fn);
}

/* ---------- TABS ---------- */
const tabsEl=document.getElementById('tabs');
TABS.forEach((t,i)=>{
  const b=document.createElement('button');
  b.className='tab'+(i===0?' active':'');
  b.innerHTML='<span class="n">'+(i+1)+'</span>'+t.t;
  b.onclick=()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const panel=document.getElementById(t.id);
    drawPanel(panel);            // kerak bo'lsa mazmunini shu yerda quramiz
    panel.classList.add('active');
    b.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    window.scrollTo({top:0,behavior:'smooth'});
  };
  tabsEl.appendChild(b);
});

/* ---------- WIZARD ---------- */
let wi=0; const seen=new Set([0]);
const bar=document.getElementById('wizbar');
const dots=document.getElementById('wizdots');
function drawWiz(){
  const s=STEPS[wi];
  document.getElementById('wizcard').innerHTML=
    '<div class="step-head"><div class="step-num">'+(wi+1)+'</div><div>'+
    '<div class="step-title">'+s.t+'</div>'+
    '<div class="step-meta">⏱ '+s.m+' · '+(wi+1)+' / '+STEPS.length+'</div></div></div>'+
    '<div class="step-body">'+s.b+'</div>';
  [...bar.children].forEach((el,i)=>{el.className = i<wi?'done' : i===wi?'now' : ''});
  [...dots.children].forEach((el,i)=>{el.className='dot'+(i===wi?' active':(seen.has(i)?' seen':''))});
  document.getElementById('wprev').disabled = wi===0;
  const nx=document.getElementById('wnext');
  nx.disabled = wi===STEPS.length-1;
  nx.textContent = wi===STEPS.length-1 ? '✓ Qo’llanma tugadi' : 'Keyingi qadam →';
}
whenPanelOpens('wizcard',()=>{
  STEPS.forEach((_,i)=>{
    bar.appendChild(document.createElement('i'));
    const d=document.createElement('button');
    d.className='dot'; d.textContent=i+1;
    d.onclick=()=>{wi=i;seen.add(i);drawWiz()};
    dots.appendChild(d);
  });
  document.getElementById('wprev').onclick=()=>{if(wi>0){wi--;seen.add(wi);drawWiz();document.getElementById('wizcard').scrollIntoView({behavior:'smooth',block:'center'})}};
  document.getElementById('wnext').onclick=()=>{if(wi<STEPS.length-1){wi++;seen.add(wi);drawWiz();document.getElementById('wizcard').scrollIntoView({behavior:'smooth',block:'center'})}};
  drawWiz();
});

/* ---------- CALCULATOR ---------- */
let cur=CALC.curDefault, mode='air';
function setCur(c){cur=c;document.querySelectorAll('[data-cur]').forEach(b=>b.classList.toggle('on',b.dataset.cur===c));calc()}
function setMode(m){
  mode=m;
  document.querySelectorAll('[data-m]').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
  document.getElementById('rate').value = m==='air'?CALC.airRate:CALC.roadRate;
  calc();
}
const num=id=>{const e=document.getElementById(id);if(!e)return 0;const v=parseFloat(e.value);return isNaN(v)?0:v};
const fmt=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:0});
const fmt2=n=>n.toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});

/* Yetkazish qatorining nomi qo'llanmaga qarab o'zgaradi (Taobao'da — "Kargo").
   Berilmasa umumiy nom ishlatiladi. */
const SHIP_LABEL  = CALC.shipLabel  || 'Xalqaro yetkazish';
const SHIP_SHORT  = CALC.shipShort  || 'Yetkazish';
const INNER_LABEL = CALC.innerLabel || 'Mahalliy yetkazish';

function calc(){
  const fx=Math.max(num('fxrate'),0.0001);
  const usdUzs=num('usdrate');
  const rawPrice=num('price');
  const goodsUsd = cur==='loc' ? rawPrice/fx : rawPrice;
  const innerUsd = cur==='loc' ? num('inner')/fx : num('inner');
  const taxPct = num('taxpct');
  const localTax = (goodsUsd+innerUsd)*taxPct/100;

  const actual=num('wkg');
  const div=num('divisor');
  const vol = div>0 ? (num('dl')*num('dw')*num('dh'))/div : 0;
  const billed=Math.max(actual,vol);

  const shipUsd=billed*num('rate');
  const customsValue=goodsUsd+innerUsd+localTax+shipUsd;

  const limit=num('channel');
  const remain=Math.max(0,limit-num('used'));
  /* Me'yor tovar qiymatiga qo'llanadi; yetkazishning ortiqcha qismga to'g'ri
     keladigan ulushi nisbat bo'yicha qo'shiladi — ilovadagi hisob bilan bir xil.
     Ilgari yetkazish ham me'yordan chegirilib, boj oshib ketardi. */
  const goodsTotal=Math.max(0,customsValue-shipUsd);
  const excessGoods=Math.max(0,goodsTotal-remain);
  const ratio=goodsTotal>0 ? excessGoods/goodsTotal : 0;
  const excess=excessGoods+shipUsd*ratio;

  /* Me'yorlar ilovadagi bilan bir xil manbadan keladi (guide.js ularni
     data/norms.json dan oladi), topilmasa amaldagi qiymatlar ishlatiladi. */
  const N = (typeof window !== 'undefined' && window.XY_NORMS) || {};
  const DUTY_PCT = N.dutyPct > 0 ? N.dutyPct : 0.30;
  const MIN_PER_KG = N.minPerKg >= 0 ? N.minPerKg : 3;
  const FEE_SHARE = N.feeShare >= 0 ? N.feeShare : 0.25;
  const FEE_UZS = (N.bhm > 0 ? N.bhm : 412000) * FEE_SHARE;

  let duty=0, dutyNote='', fee=0;
  if(excess>0){
    // Ortiqcha qiymatga to'g'ri keladigan vazn ulushi (ilovadagi kabi)
    const excessKg = billed*ratio;
    const pct = excess*DUTY_PCT;
    const perKg = excessKg*MIN_PER_KG;
    duty = Math.max(pct,perKg);
    dutyNote = perKg>pct ? ('min $'+MIN_PER_KG+'/kg qoidasi qo’llandi') : (Math.round(DUTY_PCT*100)+'% stavka');
    fee = FEE_UZS;
  }
  const totalUsd=goodsUsd+innerUsd+localTax+shipUsd+duty;
  // Bojxona yig'imi so'mda undiriladi, shuning uchun yakuniy summaga qo'shiladi.
  const totalUzs=totalUsd*usdUzs+fee;
  const totalUsdAll=usdUzs>0 ? totalUzs/usdUzs : totalUsd;

  const parts=[
    {l:'Tovar',v:goodsUsd+innerUsd,c:'#c7d2fe'},
    {l:CALC.taxLabel,v:localTax,c:'#818cf8'},
    {l:SHIP_SHORT,v:shipUsd,c:'#a5b4fc'},
    {l:'Boj',v:duty,c:'#fbbf24'}
  ].filter(p=>p.v>0);
  const sum=parts.reduce((a,b)=>a+b.v,0)||1;

  document.getElementById('result').innerHTML=
   '<div class="total">'+fmt(totalUzs)+' <small>so’m</small></div>'+
   '<div class="sum">≈ $'+fmt2(totalUsdAll)+' · hisob og’irligi '+fmt2(billed)+' kg</div>'+
   '<div class="bar">'+parts.map(p=>'<i style="width:'+(p.v/sum*100)+'%;background:'+p.c+'"></i>').join('')+'</div>'+
   '<div class="legend">'+parts.map(p=>'<span><i style="background:'+p.c+'"></i>'+p.l+' $'+fmt2(p.v)+'</span>').join('')+'</div>'+
   '<div style="margin-top:14px">'+
   '<div class="rrow"><span>Tovar qiymati</span><span>$'+fmt2(goodsUsd)+'</span></div>'+
   (innerUsd>0?'<div class="rrow"><span>'+INNER_LABEL+'</span><span>$'+fmt2(innerUsd)+'</span></div>':'')+
   (localTax>0?'<div class="rrow"><span>'+CALC.taxLabel+' ('+taxPct+'%)</span><span>$'+fmt2(localTax)+'</span></div>':'')+
   '<div class="rrow"><span>Haqiqiy / hajmiy og’irlik</span><span>'+fmt2(actual)+' / '+fmt2(vol)+' kg</span></div>'+
   '<div class="rrow"><span>'+SHIP_LABEL+' ('+(mode==='air'?'avia':'avto')+', $'+num('rate')+'/kg)</span><span>$'+fmt2(shipUsd)+'</span></div>'+
   '<div class="rrow"><span>Bojxona qiymati</span><span>$'+fmt2(customsValue)+'</span></div>'+
   '<div class="rrow"><span>Bojsiz qolgan norma</span><span>$'+fmt2(remain)+'</span></div>'+
   (excess>0
     ? '<div class="rrow"><span>Normadan oshgan qism</span><span>$'+fmt2(excess)+'</span></div>'+
       '<div class="rrow"><span>Bojxona to’lovi <span style="opacity:.7;font-weight:400">('+dutyNote+')</span></span><span>$'+fmt2(duty)+'</span></div>'+
       '<div class="rrow"><span>Bojxona yig’imi (BHM '+Math.round(FEE_SHARE*100)+'%)</span><span>'+fmt(fee)+' so’m</span></div>'
     : '<div class="rrow"><span>Bojxona to’lovi</span><span>Yo’q ✓</span></div>')+
   '</div>';
}
calc();

/* ---------- BAN CHECKER ---------- */
let banFilter='all';
const BANCATS=[{k:'all',t:'Hammasi'},{k:'r',t:'🔴 Taqiqlangan'},{k:'a',t:'🟡 Ruxsat/cheklov'},{k:'g',t:'🟢 Erkin'}];
const bc=document.getElementById('banchips');
function renderBan(){
  const q=document.getElementById('banq').value.trim().toLowerCase();
  const list=BAN.filter(x=>(banFilter==='all'||x.s===banFilter)&&(!q||x.n.toLowerCase().includes(q)||x.d.toLowerCase().includes(q)));
  const el=document.getElementById('banlist');
  if(!list.length){el.innerHTML='<div class="empty">Hech narsa topilmadi. Boshqa so’z bilan qidirib ko’ring — ro’yxat to’liq emas.</div>';return}
  const txtmap={taqiq:'TAQIQ',ruxsat:'RUXSAT KERAK',cheklov:'CHEKLOV',erkin:'ERKIN'};
  el.innerHTML=list.map(x=>
    '<div class="item '+x.s+'"><div class="body"><div class="nm">'+x.n+'</div>'+
    '<div class="ds">'+x.d+'</div></div>'+
    '<span class="pill '+x.s+'">'+txtmap[x.c]+'</span></div>').join('');
}
whenPanelOpens('banlist',()=>{
  BANCATS.forEach(c=>{
    const b=document.createElement('button');
    b.className='chip'+(c.k==='all'?' on':''); b.textContent=c.t;
    b.onclick=()=>{banFilter=c.k;[...bc.children].forEach(x=>x.classList.remove('on'));b.classList.add('on');renderBan()};
    bc.appendChild(b);
  });
  renderBan();
});

/* ---------- CARGO ---------- */
let cargoF='all';
const cch=document.getElementById('cargochips');
function renderCargo(){
  const list=CARGO.filter(x=>cargoF==='all'||x.tag.includes(cargoF));
  document.getElementById('cargobody').innerHTML=list.map(x=>
    '<tr><td><b>'+x.n+'</b></td><td>'+x.r+'</td><td>'+x.p+'</td><td>'+x.t+'</td><td class="mini">'+x.f+'</td></tr>').join('');
}
whenPanelOpens('cargobody',()=>{
  if(cch){
    CARGOCATS.forEach(c=>{
      const b=document.createElement('button');
      b.className='chip'+(c.k==='all'?' on':''); b.textContent=c.t;
      b.onclick=()=>{cargoF=c.k;[...cch.children].forEach(x=>x.classList.remove('on'));b.classList.add('on');renderCargo()};
      cch.appendChild(b);
    });
  }
  renderCargo();
});

/* ---------- GLOSSARY ---------- */
function fallbackCopy(txt,cb){
  const ta=document.createElement('textarea');
  ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{document.execCommand('copy');cb()}catch(e){}
  document.body.removeChild(ta);
}
let wcat='all';
const wch=document.getElementById('wchips');
function renderWords(){
  if(!document.getElementById('wlist'))return;
  const q=document.getElementById('wq').value.trim().toLowerCase();
  const list=WORDS.filter(x=>(wcat==='all'||x.c===wcat)&&(!q||x.u.toLowerCase().includes(q)||x.k.toLowerCase().includes(q)));
  const el=document.getElementById('wlist');
  if(!list.length){el.innerHTML='<div class="empty">Topilmadi.</div>';return}
  el.innerHTML=list.map(x=>
    '<div class="gl"><div class="zh">'+x.k+'</div><div class="uz">'+x.u+'</div>'+
    '<button class="cp" data-k="'+x.k.replace(/"/g,'&quot;')+'">Nusxa</button></div>').join('');
  el.querySelectorAll('.cp').forEach(b=>{
    b.onclick=()=>{
      const txt=b.dataset.k;
      const done=()=>{b.textContent='✓ Ok';b.classList.add('ok');setTimeout(()=>{b.textContent='Nusxa';b.classList.remove('ok')},1400)};
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(txt).then(done).catch(()=>fallbackCopy(txt,done));
      } else fallbackCopy(txt,done);
    };
  });
}
whenPanelOpens('wlist',()=>{
  if(wch){
    WCATS.forEach(c=>{
      const b=document.createElement('button');
      b.className='chip'+(c.k==='all'?' on':''); b.textContent=c.t;
      b.onclick=()=>{wcat=c.k;[...wch.children].forEach(x=>x.classList.remove('on'));b.classList.add('on');renderWords()};
      wch.appendChild(b);
    });
  }
  renderWords();
});

/* ---------- FAQ ---------- */
whenPanelOpens('faqlist',()=>{
  document.getElementById('faqlist').innerHTML=FAQ.map((f,i)=>
    '<div class="acc" id="acc'+i+'"><button type="button" onclick="document.getElementById(\'acc'+i+'\').classList.toggle(\'open\')">'+f.q+'</button>'+
    '<div class="ans">'+f.a+'</div></div>').join('');
});

/* ---------- CHECKLIST ----------
   Belgilangan bandlar shu qurilmada saqlanadi. Ilgari saqlangan holat
   guide.js tomonidan har bir bandni "bosib" tiklanardi — 25 ta band uchun
   ro'yxat 25 marta qaytadan chizilardi. Endi holat to'g'ridan-to'g'ri
   o'qiladi va ro'yxat bir marta chiziladi. */
const CHK_KEY = 'xy-chk:' + location.pathname.split('/').pop();
const state={};
try {
  const saved = JSON.parse(localStorage.getItem(CHK_KEY) || '[]');
  if (Array.isArray(saved)) saved.forEach(k => { state[k] = true; });
} catch (e) {}
function saveChk(){
  try {
    localStorage.setItem(CHK_KEY, JSON.stringify(Object.keys(state).filter(k => state[k])));
  } catch (e) {}
}
function renderChk(){
  let total=0,done=0;
  CHECK.forEach((g,gi)=>g.items.forEach((_,ii)=>{total++;if(state[gi+'-'+ii])done++}));
  document.getElementById('chklist').innerHTML=CHECK.map((g,gi)=>{
    const gd=g.items.filter((_,ii)=>state[gi+'-'+ii]).length;
    return '<div class="chk-head"><h3>'+g.g+'</h3><span class="prog-txt">'+gd+' / '+g.items.length+'</span></div>'+
    g.items.map((it,ii)=>{
      const k=gi+'-'+ii, on=!!state[k];
      return '<div class="chk'+(on?' done':'')+'" data-k="'+k+'"><div class="box">'+(on?'✓':'')+'</div>'+
      '<div><div class="t">'+it.t+'</div><div class="d">'+it.d+'</div></div></div>';
    }).join('');
  }).join('')+
  '<div style="text-align:center;margin-top:18px"><span class="prog-txt" style="font-size:14px;padding:8px 18px">Umumiy: '+done+' / '+total+'</span></div>';
  document.querySelectorAll('.chk').forEach(el=>{
    el.onclick=()=>{state[el.dataset.k]=!state[el.dataset.k];saveChk();renderChk()};
  });
}
whenPanelOpens('chklist',renderChk);
