/* Hisobot sahifasi — GET /hisobot. Faqat HTML: ma'lumot sahifaning o'zi
   /stats dan token bilan oladi. Token brauzerning localStorage'ida
   qoladi, manzilda emas: xatcho'p (bookmark) parolsiz saqlanadi.
   Tashqi resurs yo'q — bitta so'rov, keshsiz. */

const LABEL = {
  screen: {
    home: 'Bosh sahifa', stores: 'Do\'konlar', storefolder: 'Do\'kon papkasi', store: 'Do\'kon sahifasi',
    couriers: 'Kuryerlar', courierfolder: 'Kuryer papkasi', courier: 'Kuryer sahifasi',
    guides: 'Qo\'llanmalar', fullguide: 'Qo\'llanma (to\'liq)', customs: 'Bojxona', csec: 'Bojxona bo\'limi',
    wizard: 'Reja tuzish', plan: 'Reja', shipments: 'Jo\'natmalar', compare: 'Taqqoslash',
    search: 'Qidiruv', services: 'Xizmatlar', settings: 'Sozlamalar', ci: 'Sinov (CI)'
  },
  svcAsk: {
    'svc-savol': 'Tezkor savol', 'svc-ushlangan': 'Jo\'natma ushlanib qoldi', 'svc-hisob': 'Boj hisobini tekshirish',
    'svc-hujjat': 'Hujjatlarni tayyorlash', 'svc-taqiq': 'Taqiq va cheklov tekshiruvi', 'svc-yuridik': 'Hujjatlar va litsenziya',
    'svc-shartnoma': 'Mijoz bilan shartnoma', 'svc-bahs': 'Bojxona bilan bahs', 'svc-texnik': 'Sayt va Telegram bot',
    'svc-integratsiya': 'Trek tizimi integratsiyasi', 'svc-hamkorlik': 'Ilovada joylashish', umumiy: 'Umumiy murojaat'
  },
  wizard: { yakun: 'Reja yakunlandi' },
  hamkor: { kuryer: 'Kuryer hamkorlik so\'rovi' },
  lang: { uz: 'O\'zbek', ru: 'Rus', '-': 'Noma\'lum' }
};

/* Bo'limlar: nom, sarlavha, izoh. Tartib — hisobotdagi tartib. */
const SECTIONS = [
  ['screen', 'Ekranlar', 'Qaysi bo\'lim necha marta ochilgan'],
  ['store', 'Do\'konga o\'tish', 'Do\'kon havolasi bosilgan'],
  ['courier', 'Kuryerga o\'tish', 'Kuryer havolasi bosilgan'],
  ['guide', 'Qo\'llanmalar', 'Qo\'llanma ochilgan'],
  ['svcAsk', 'Pullik xizmat', 'Telegramga murojaat tugmasi bosilgan'],
  ['wizard', 'Reja', 'Reja tuzish yakuniga yetgan'],
  ['hamkor', 'Hamkorlik', 'Kuryer hamkorlik so\'rovi'],
  ['lang', 'Til', 'Foydalanuvchi tili'],
  ['ver', 'Versiya', 'Ilova versiyasi']
];

export function hisobotHtml() {
  return `<!doctype html>
<html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Pochtam hisobot</title>
<style>
:root{color-scheme:light dark;--bg:#f6f7fb;--card:#fff;--ink:#14161f;--mute:#6b7080;--line:#e3e5ec;--bar:#1a1fb0;--barbg:#e9eaf7}
@media(prefers-color-scheme:dark){:root{--bg:#0f1117;--card:#181b24;--ink:#eef0f6;--mute:#9aa0b3;--line:#2a2e3b;--bar:#7c82ff;--barbg:#252a3c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:720px;margin:0 auto;padding:20px 16px 48px}h1{font-size:22px;margin:0 0 4px}
.sub{color:var(--mute);margin:0 0 16px}.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px}
button,input{font:inherit}input{flex:1;min-width:200px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink)}
button{padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink);cursor:pointer}
button.on{background:var(--bar);border-color:var(--bar);color:#fff}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px}
.tile b{display:block;font-size:26px;line-height:1.1}.tile span{color:var(--mute);font-size:13px}
section{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:12px}
h2{font-size:17px;margin:0}h2+p{margin:2px 0 10px;color:var(--mute);font-size:13px}
.r{display:grid;grid-template-columns:1fr auto;gap:2px 12px;padding:6px 0;border-top:1px solid var(--line)}
.r:first-of-type{border-top:0}.r .k{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.r .n{font-weight:700;font-variant-numeric:tabular-nums}
.r .b{grid-column:1/-1;height:6px;background:var(--barbg);border-radius:3px;overflow:hidden}.r .b i{display:block;height:100%;background:var(--bar)}
.empty{color:var(--mute)}.err{background:#fde8e8;color:#8a1c1c;padding:10px 12px;border-radius:10px;margin-bottom:12px}
@media(prefers-color-scheme:dark){.err{background:#3a1a1a;color:#ffb4b4}}
.foot{color:var(--mute);font-size:13px;margin-top:20px}.foot button{padding:6px 10px;font-size:13px;margin-top:8px}.hid{display:none}
</style></head><body><main>
<h1>Pochtam hisobot</h1><p class="sub" id="range">Sanoq yuklanmoqda…</p>
<div class="row" id="auth"><input id="tok" type="password" placeholder="Hisobot paroli (METRICS_READ_TOKEN)" autocomplete="off"><button id="go">Kirish</button></div>
<div class="row hid" id="days"><button data-d="1">Bugun</button><button data-d="7" class="on">7 kun</button><button data-d="30">30 kun</button><button data-d="90">90 kun</button></div>
<div id="err" class="err hid"></div>
<div id="out-body"></div>
<p class="foot">Faqat sanoq saqlanadi: kun · hodisa · kalit → nechta. Shaxsiy ma'lumot yo'q. Beacon sahifa fonga o'tganda ketadi, shuning uchun raqamlar bir necha daqiqa kechikishi mumkin. <button id="out" class="hid">Chiqish</button></p>
</main>
<script>
const LABEL=${JSON.stringify(LABEL)}, SECTIONS=${JSON.stringify(SECTIONS)};
const $=s=>document.querySelector(s);
let token='';try{token=localStorage.getItem('pochtam_tok')||''}catch(e){}
const q=new URLSearchParams(location.search);
if(q.get('token')){token=q.get('token');try{localStorage.setItem('pochtam_tok',token)}catch(e){}history.replaceState(null,'',location.pathname)}
let days=7;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const label=(n,k)=>(LABEL[n]&&LABEL[n][k])||k;
const fmt=n=>n.toLocaleString('ru-RU');
function ui(){$('#auth').classList.toggle('hid',!!token);$('#days').classList.toggle('hid',!token);$('#out').classList.toggle('hid',!token);}
async function load(){
  ui(); if(!token){$('#range').textContent='Parolni kiriting.';$('#out-body').innerHTML='';return;}
  $('#err').classList.add('hid'); $('#range').textContent='Yuklanmoqda…';
  let r; try{r=await fetch('/stats?days='+days,{headers:{authorization:'Bearer '+token},cache:'no-store'});}catch(e){return fail('Server javob bermadi. Internetni tekshiring.');}
  if(r.status===401){token='';try{localStorage.removeItem('pochtam_tok')}catch(e){}ui();return fail('Parol noto\\'g\\'ri.');}
  if(!r.ok)return fail('Xato: '+r.status);
  const st=await r.json(); render(st);
}
function fail(m){$('#err').textContent=m;$('#err').classList.remove('hid');$('#range').textContent='';}
function render(st){
  $('#range').textContent=(st.days===1?'Bugun':'Oxirgi '+st.days+' kun')+' · '+st.from+' – '+st.to+' (UTC)';
  const screens=Object.values(st.byDay).reduce((a,b)=>a+b,0);
  const sum=n=>Object.values(st.byName[n]||{}).reduce((a,b)=>a+b,0);
  const clicks=sum('store')+sum('courier'), asks=sum('svcAsk')+sum('hamkor');
  let h='<div class="tiles"><div class="tile"><b>'+fmt(screens)+'</b><span>ekran ochildi</span></div><div class="tile"><b>'+fmt(clicks)+'</b><span>do\\'kon/kuryerga o\\'tish</span></div><div class="tile"><b>'+fmt(asks)+'</b><span>murojaat</span></div></div>';
  if(st.days>1){const ds=Object.keys(st.byDay).sort();if(ds.length){const mx=Math.max(...ds.map(d=>st.byDay[d]));h+='<section><h2>Kunlar bo\\'yicha</h2><p>Har kuni ochilgan ekranlar</p>'+ds.map(d=>row(d,st.byDay[d],mx)).join('')+'</section>';}}
  for(const [n,t,s] of SECTIONS){const o=st.byName[n]||{};const ks=Object.keys(o);h+='<section><h2>'+esc(t)+'</h2><p>'+esc(s)+'</p>';
    if(!ks.length)h+='<div class="empty">Hali yo\\'q</div>';else{const mx=Math.max(...ks.map(k=>o[k]));h+=ks.map(k=>row(label(n,k),o[k],mx)).join('');}h+='</section>';}
  $('#out-body').innerHTML=h;
}
const row=(k,n,mx)=>'<div class="r"><span class="k">'+esc(k)+'</span><span class="n">'+fmt(n)+'</span><span class="b"><i style="width:'+Math.max(2,Math.round(100*n/mx))+'%"></i></span></div>';
$('#go').onclick=()=>{token=$('#tok').value.trim();if(!token)return;try{localStorage.setItem('pochtam_tok',token)}catch(e){}load();};
$('#tok').addEventListener('keydown',e=>{if(e.key==='Enter')$('#go').click();});
$('#out').onclick=()=>{token='';try{localStorage.removeItem('pochtam_tok')}catch(e){}$('#tok').value='';load();};
document.querySelectorAll('#days [data-d]').forEach(b=>b.onclick=()=>{days=+b.dataset.d;document.querySelectorAll('#days [data-d]').forEach(x=>x.classList.toggle('on',x===b));load();});
load();
</script></body></html>`;
}
