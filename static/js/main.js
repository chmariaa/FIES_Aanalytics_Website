
// ── CLOCK ─────────────────────────────────────────────────────────────
setInterval(()=>{document.getElementById('clock').textContent=new Date().toLocaleTimeString('en-PH');},1000);

// ── CHART DEFAULTS ────────────────────────────────────────────────────
Chart.defaults.color='#8A9E90';
Chart.defaults.borderColor='#1E2B24';
Chart.defaults.font.family='JetBrains Mono';

function gg(ctx,h=300){const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(0,200,83,0.25)');g.addColorStop(1,'rgba(0,200,83,0)');return g;}

// ── API HELPERS ───────────────────────────────────────────────────────
const BASE = '';
async function api(endpoint){
  try{const r=await fetch(BASE+endpoint);return await r.json();}
  catch(e){console.error('API error:',e);return null;}
}
async function apiPost(endpoint,body){
  try{const r=await fetch(BASE+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return await r.json();}
  catch(e){console.error('API error:',e);return null;}
}

// ── NAVIGATION ────────────────────────────────────────────────────────
const TITLES={home:'Home',dashboard:'Dashboard',explorer:'Rate Explorer',burden:'Burden Analysis',regions:'Regional Profile',simulator:'Formula Simulator',export:'Export Data',about:'About the Study'};

async function navigate(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  const ni=document.querySelector(`[data-page="${page}"]`);
  if(ni) ni.classList.add('active');
  document.getElementById('pageTitle').textContent=TITLES[page]||page;
  if(page==='dashboard') await initDashboard();
  if(page==='explorer')  await initExplorer();
  if(page==='burden')    await initBurden();
  if(page==='regions')   await initRegions();
  if(page==='simulator') {runCDF();runTrap();}
}

document.querySelectorAll('.nav-item').forEach(item=>{
  item.addEventListener('click',()=>navigate(item.dataset.page));
});

document.getElementById('collapseBtn').addEventListener('click',()=>{
  const sb=document.getElementById('sidebar'),tb=document.getElementById('topbar'),mn=document.getElementById('main');
  sb.classList.toggle('collapsed');tb.classList.toggle('collapsed');mn.classList.toggle('collapsed');
  document.getElementById('collapseBtn').textContent=sb.classList.contains('collapsed')?'⇥':'⇤';
});

// ── HEALTH CHECK & HOME KPIs ──────────────────────────────────────────
async function initHealth(){
  const data=await api('/api/summary');
  if(!data){
    document.getElementById('statusDot').className='status-dot error';
    document.getElementById('statusText').textContent='Offline';
    document.getElementById('healthBadge').textContent='API Offline';
    return;
  }
  document.getElementById('statusDot').className='status-dot';
  document.getElementById('statusText').textContent='Live';
  document.getElementById('healthBadge').textContent=`PSA FIES 2015 — ${data.totalHouseholds.toLocaleString()} HH`;

  document.getElementById('homeKpis').innerHTML=`
    <div class="kpi-card"><div class="kpi-icon">🏠</div><div class="kpi-label">TOTAL HOUSEHOLDS</div><div class="kpi-value">${data.totalHouseholds.toLocaleString()}<span class="unit"> HH</span></div><div class="kpi-change up">▲ ${data.totalRegions} regions covered</div></div>
    <div class="kpi-card"><div class="kpi-icon">₱</div><div class="kpi-label">MEAN HOUSEHOLD INCOME</div><div class="kpi-value">₱${(data.meanIncome/1000).toFixed(0)}<span class="unit">K</span></div><div class="kpi-change neutral">Range ₱${(data.minIncome/1000).toFixed(0)}K – ₱${(data.maxIncome/1000000).toFixed(1)}M</div></div>
    <div class="kpi-card"><div class="kpi-icon">📊</div><div class="kpi-label">PEAK FOOD RATE OF CHANGE</div><div class="kpi-value">${data.peakFoodRate}<span class="unit"> ₱/₱1</span></div><div class="kpi-change up">▲ At 50K–100K bracket</div></div>
    <div class="kpi-card"><div class="kpi-icon">🎓</div><div class="kpi-label">PEAK EDU RATE OF CHANGE</div><div class="kpi-value">${data.peakEduRate}<span class="unit"> ₱/₱1</span></div><div class="kpi-change up">▲ At 300K–500K bracket</div></div>`;

  document.getElementById('homeKpis2').innerHTML=`
    <div class="kpi-card"><div class="kpi-icon">🍚</div><div class="kpi-label">HIGHEST FOOD BURDEN</div><div class="kpi-value">₱247<span class="unit">B</span></div><div class="kpi-change up">${data.topFoodRegion}</div></div>
    <div class="kpi-card"><div class="kpi-icon">🏥</div><div class="kpi-label">HIGHEST MEDICAL BURDEN</div><div class="kpi-value">₱51<span class="unit">B</span></div><div class="kpi-change down">${data.topMedRegion} — anomaly</div></div>
    <div class="kpi-card"><div class="kpi-icon">📚</div><div class="kpi-label">HIGHEST EDU BURDEN</div><div class="kpi-value">₱49<span class="unit">B</span></div><div class="kpi-change neutral">${data.topEduRegion}</div></div>`;
}

// ── DASHBOARD ─────────────────────────────────────────────────────────
let expChart,rateChart,allRateChart;
let natData=null;
let currentExpCat='food',currentRateCat='food';

async function initDashboard(){
  if(!natData){
    const d=await api('/api/national'); if(!d)return;
    natData=d;
  }
  const s=await api('/api/summary'); if(s){
    document.getElementById('dashKpis').innerHTML=`
      <div class="kpi-card"><div class="kpi-icon">🍚</div><div class="kpi-label">PEAK FOOD RATE</div><div class="kpi-value">${s.peakFoodRate}<span class="unit"> ₱/₱1</span></div><div class="kpi-change up">▲ At 50K–100K</div></div>
      <div class="kpi-card"><div class="kpi-icon">🎓</div><div class="kpi-label">PEAK EDU RATE</div><div class="kpi-value">${s.peakEduRate}<span class="unit"> ₱/₱1</span></div><div class="kpi-change up">▲ At 300K–500K</div></div>
      <div class="kpi-card"><div class="kpi-icon">🏥</div><div class="kpi-label">PEAK MEDICAL RATE</div><div class="kpi-value">${s.peakMedRate}<span class="unit"> ₱/₱1</span></div><div class="kpi-change neutral">At 200K–300K</div></div>
      <div class="kpi-card"><div class="kpi-icon">📊</div><div class="kpi-label">INCOME BRACKETS</div><div class="kpi-value">8<span class="unit"> brackets</span></div><div class="kpi-change neutral">₱0 to 1M+</div></div>`;
  }
  buildExpChart(); buildRateChart(); buildAllRateChart();
}

function buildExpChart(){
  if(expChart) expChart.destroy();
  const d=natData.national[currentExpCat];
  const ctx=document.getElementById('expCurveChart').getContext('2d');
  expChart=new Chart(ctx,{type:'line',data:{labels:natData.brackets,datasets:[{label:'Avg Expenditure',data:d.avgExp,borderColor:'#00C853',backgroundColor:gg(ctx),borderWidth:2.5,pointBackgroundColor:'#00C853',pointRadius:4,fill:true,tension:.35}]},options:{responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:v=>`₱${Number(v.raw).toLocaleString()}`}}},scales:{x:{grid:{color:'#1E2B24'},ticks:{font:{size:10}}},y:{grid:{color:'#1E2B24'},ticks:{callback:v=>`₱${(v/1000).toFixed(0)}K`}}}}});
}

function buildRateChart(){
  if(rateChart) rateChart.destroy();
  const interior=natData.national[currentRateCat].rateOfChange.filter(x=>x!==null);
  const labels=natData.brackets.slice(1,-1);
  const maxIdx=interior.indexOf(Math.max(...interior));
  const ctx=document.getElementById('rateChart').getContext('2d');
  rateChart=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Rate of Change',data:interior,backgroundColor:interior.map((_,i)=>i===maxIdx?'rgba(57,255,20,.9)':'rgba(0,200,83,.5)'),borderColor:'#00C853',borderWidth:1,borderRadius:4}]},options:{responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:v=>`₱${Number(v.raw).toFixed(6)} per ₱1`}}},scales:{x:{grid:{color:'#1E2B24'},ticks:{font:{size:10}}},y:{grid:{color:'#1E2B24'},ticks:{callback:v=>Number(v).toFixed(3)}}}}});
}

function buildAllRateChart(){
  if(allRateChart) allRateChart.destroy();
  const labels=natData.brackets.slice(1,-1);
  const ctx=document.getElementById('allRateChart').getContext('2d');
  allRateChart=new Chart(ctx,{type:'bar',data:{labels,datasets:[
    {label:'Food',data:natData.national.food.rateOfChange.filter(x=>x!==null),backgroundColor:'rgba(0,200,83,.7)',borderRadius:3},
    {label:'Education',data:natData.national.education.rateOfChange.filter(x=>x!==null),backgroundColor:'rgba(57,255,20,.5)',borderRadius:3},
    {label:'Medical',data:natData.national.medical.rateOfChange.filter(x=>x!==null),backgroundColor:'rgba(168,255,203,.4)',borderRadius:3}
  ]},options:{responsive:true,plugins:{legend:{labels:{font:{size:11},boxWidth:12}}},scales:{x:{grid:{color:'#1E2B24'},ticks:{font:{size:10}}},y:{grid:{color:'#1E2B24'},ticks:{callback:v=>Number(v).toFixed(3)}}}}});
}

function switchExpCat(cat){
  currentExpCat=cat;
  ['food','education','medical'].forEach(c=>{document.getElementById(`expBtn${c.charAt(0).toUpperCase()+c.slice(1)}`).classList[c===cat?'add':'remove']('active');});
  buildExpChart();
}
function switchRateCat(cat){
  currentRateCat=cat;
  ['food','education','medical'].forEach(c=>{document.getElementById(`rateBtn${c.charAt(0).toUpperCase()+c.slice(1)}`).classList[c===cat?'add':'remove']('active');});
  buildRateChart();
}

// ── EXPLORER ──────────────────────────────────────────────────────────
let explorerCurve,explorerRate;

async function initExplorer(){
  if(!natData){const d=await api('/api/national');if(!d)return;natData=d;}
  const rd=await api('/api/regions');
  if(rd){
    const sel=document.getElementById('explorerRegion');
    sel.innerHTML='<option value="national">National (All Philippines)</option>';
    rd.regions.forEach(r=>{const o=document.createElement('option');o.value=r;o.textContent=r;sel.appendChild(o);});
  }
  await loadExplorer();
}

async function loadExplorer(){
  const reg=document.getElementById('explorerRegion').value;
  const cat=document.getElementById('explorerCat').value;
  let src;
  if(reg==='national'){
    if(!natData){const d=await api('/api/national');if(!d)return;natData=d;}
    src={avgExp:natData.national[cat].avgExp,rateOfChange:natData.national[cat].rateOfChange,brackets:natData.brackets};
  } else {
    const d=await api(`/api/region/${encodeURIComponent(reg)}`);
    if(!d)return;
    src={avgExp:d.data[cat].avgExp,rateOfChange:d.data[cat].rateOfChange,brackets:d.brackets};
  }

  if(explorerCurve) explorerCurve.destroy();
  const ctx1=document.getElementById('explorerCurve').getContext('2d');
  explorerCurve=new Chart(ctx1,{type:'line',data:{labels:src.brackets,datasets:[{label:'Avg Exp',data:src.avgExp,borderColor:'#00C853',backgroundColor:gg(ctx1,220),borderWidth:2.5,pointBackgroundColor:'#00C853',pointRadius:4,fill:true,tension:.35}]},options:{responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:v=>`₱${Number(v.raw).toLocaleString()}`}}},scales:{x:{grid:{color:'#1E2B24'},ticks:{font:{size:10}}},y:{grid:{color:'#1E2B24'},ticks:{callback:v=>`₱${(v/1000).toFixed(0)}K`}}}}});

  const inner=src.rateOfChange.filter(x=>x!==null);
  const innerLabels=src.brackets.slice(1,-1);
  const maxIdx=inner.indexOf(Math.max(...inner));
  if(explorerRate) explorerRate.destroy();
  const ctx2=document.getElementById('explorerRate').getContext('2d');
  explorerRate=new Chart(ctx2,{type:'bar',data:{labels:innerLabels,datasets:[{label:'Rate',data:inner,backgroundColor:inner.map((_,i)=>i===maxIdx?'rgba(57,255,20,.9)':'rgba(0,200,83,.5)'),borderColor:'#00C853',borderWidth:1,borderRadius:4}]},options:{responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:v=>`₱${Number(v.raw).toFixed(6)} per ₱1`}}},scales:{x:{grid:{color:'#1E2B24'},ticks:{font:{size:10}}},y:{grid:{color:'#1E2B24'},ticks:{callback:v=>Number(v).toFixed(4)}}}}});

  const tbody=document.getElementById('explorerTbody');tbody.innerHTML='';
  src.brackets.forEach((b,i)=>{
    const r=src.rateOfChange[i];const e=src.avgExp[i];
    const isMax=r&&r===Math.max(...src.rateOfChange.filter(x=>x!==null));
    const tr=document.createElement('tr');if(isMax)tr.className='highlight';
    tr.innerHTML=`<td><strong>${b}</strong></td><td>₱${e?Number(e).toLocaleString('en-PH',{maximumFractionDigits:2}):'—'}</td><td style="color:${r?'var(--green)':'var(--dim)'}">${r?Number(r).toFixed(6):'—'}</td><td style="font-size:12px;color:var(--gray)">${r?(isMax?'🟢 Peak rate':r>0.3?'High responsiveness':r>0.15?'Moderate':'Low responsiveness'):'Endpoint — excluded'}</td>`;
    tbody.appendChild(tr);
  });
}

// ── BURDEN ────────────────────────────────────────────────────────────
let burdenChart;let currentBurden='food';

async function initBurden(){
  await loadBurden();
  await buildBurdenTable();
}

async function loadBurden(){
  const d=await api(`/api/burden?category=${currentBurden}`);if(!d)return;
  const labels=d.data.map(x=>x.region);
  const vals=d.data.map(x=>x.burdenB);
  const max=Math.max(...vals);
  if(burdenChart) burdenChart.destroy();
  const ctx=document.getElementById('burdenChart').getContext('2d');
  burdenChart=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Burden (₱B)',data:vals,backgroundColor:vals.map((v,i)=>i===0?'rgba(57,255,20,.9)':v>max*.8?'rgba(0,200,83,.7)':'rgba(0,200,83,.4)'),borderRadius:4}]},options:{indexAxis:'y',responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:v=>`₱${Number(v.raw).toFixed(2)}B`}}},scales:{x:{grid:{color:'#1E2B24'},ticks:{callback:v=>`₱${v}B`}},y:{grid:{display:false},ticks:{font:{size:10}}}}}});
}

async function buildBurdenTable(){
  const d=await api('/api/all_burdens');if(!d)return;
  const sorted=[...d.data].sort((a,b)=>b.food-a.food);
  const maxFood=Math.max(...sorted.map(x=>x.food));
  const tbody=document.getElementById('burdenTbody');tbody.innerHTML='';
  sorted.forEach((row,i)=>{
    const rk=i===0?'gold':i===1?'silver':i===2?'bronze':'';
    const tr=document.createElement('tr');
    if(row.region.includes('Davao')) tr.className='highlight';
    tr.innerHTML=`<td><span class="rank-badge ${rk}">${i+1}</span></td><td>${row.region}</td><td>${row.householdCount.toLocaleString()}</td><td style="color:var(--green)">₱${row.food}B</td><td>₱${row.education}B</td><td>₱${row.medical}B</td><td><div class="bar-cell"><div class="bar-track"><div class="bar-fill" style="width:${(row.food/maxFood*100).toFixed(0)}%"></div></div><span style="font-size:11px;color:var(--dim)">${(row.food/maxFood*100).toFixed(0)}%</span></div></td>`;
    tbody.appendChild(tr);
  });
}

async function switchBurden(cat){
  currentBurden=cat;
  ['food','education','medical'].forEach(c=>{document.getElementById(`burdBtn${c.charAt(0).toUpperCase()+c.slice(1)}`).classList[c===cat?'add':'remove']('active');});
  document.getElementById('burdenSub').textContent=cat.toUpperCase()+' — ALL 17 REGIONS SORTED';
  await loadBurden();
}

// ── REGIONS ───────────────────────────────────────────────────────────
let profileCurveChart,profileRateChart;

async function initRegions(){
  const rd=await api('/api/regions');if(!rd)return;
  const grid=document.getElementById('regionGrid');grid.innerHTML='';
  rd.regions.forEach(r=>{
    const chip=document.createElement('div');chip.className='region-chip';
    chip.textContent=r;
    chip.onclick=()=>loadRegionProfile(r,chip);
    if(r.includes('Davao')) chip.classList.add('active');
    grid.appendChild(chip);
  });
  await loadRegionProfile('XI - Davao Region',null);
}

async function loadRegionProfile(reg,chip){
  if(chip){document.querySelectorAll('.region-chip').forEach(c=>c.classList.remove('active'));chip.classList.add('active');}
  const d=await api(`/api/region/${encodeURIComponent(reg)}`);if(!d)return;
  document.getElementById('regionProfile').style.display='block';
  document.getElementById('profileName').textContent=reg;
  document.getElementById('profileMeta').textContent=`${d.householdCount.toLocaleString()} households  ·  Mean Income: ₱${Math.round(d.meanIncome).toLocaleString()}  ·  2015 PSA FIES`;

  const cats=['food','education','medical'];
  const metrics=cats.map(s=>{
    const rates=d.data[s].rateOfChange.filter(x=>x!==null);
    const peak=Math.max(...rates).toFixed(4);
    const burden=(d.data[s].cumulativeBurden/1e9).toFixed(2);
    return `<div class="metric-block"><div class="metric-label">${s.toUpperCase()} BURDEN</div><div class="metric-value">₱${burden}B</div><div class="metric-sub">Peak rate: ${peak}</div></div>`;
  });
  metrics.push(`<div class="metric-block"><div class="metric-label">HOUSEHOLDS</div><div class="metric-value">${d.householdCount.toLocaleString()}</div><div class="metric-sub">Surveyed 2015</div></div>`);
  metrics.push(`<div class="metric-block"><div class="metric-label">MEAN INCOME</div><div class="metric-value">₱${(d.meanIncome/1000).toFixed(0)}K</div><div class="metric-sub">Annual household</div></div>`);
  metrics.push(`<div class="metric-block"><div class="metric-label">INCOME BRACKETS</div><div class="metric-value">${d.brackets.length}</div><div class="metric-sub">Groups analyzed</div></div>`);
  document.getElementById('profileMetrics').innerHTML=metrics.join('');

  if(profileCurveChart) profileCurveChart.destroy();
  if(profileRateChart)  profileRateChart.destroy();
  const colors=['#00C853','#39FF14','#A8FFCB'];

  const ctx1=document.getElementById('profileCurve').getContext('2d');
  profileCurveChart=new Chart(ctx1,{type:'line',data:{labels:d.brackets,datasets:cats.map((s,i)=>({label:s.charAt(0).toUpperCase()+s.slice(1),data:d.data[s].avgExp,borderColor:colors[i],backgroundColor:i===0?gg(ctx1):'transparent',borderWidth:2,pointRadius:3,fill:i===0,tension:.35}))},options:{responsive:true,plugins:{legend:{labels:{font:{size:10},boxWidth:10}}},scales:{x:{grid:{color:'#1E2B24'},ticks:{font:{size:9}}},y:{grid:{color:'#1E2B24'},ticks:{callback:v=>`₱${(v/1000).toFixed(0)}K`}}}}});

  const ctx2=document.getElementById('profileRate').getContext('2d');
  profileRateChart=new Chart(ctx2,{type:'bar',data:{labels:d.brackets.slice(1,-1),datasets:cats.map((s,i)=>({label:s.charAt(0).toUpperCase()+s.slice(1),data:d.data[s].rateOfChange.filter(x=>x!==null),backgroundColor:colors[i].replace('#','rgba(').replace(/(..)(..)(..)$/,(_,r,g,b)=>`${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)},0.6)`),borderRadius:3}))},options:{responsive:true,plugins:{legend:{labels:{font:{size:10},boxWidth:10}}},scales:{x:{grid:{color:'#1E2B24'},ticks:{font:{size:9}}},y:{grid:{color:'#1E2B24'},ticks:{callback:v=>Number(v).toFixed(3)}}}}});
}

// ── SIMULATOR ─────────────────────────────────────────────────────────
async function runCDF(){
  const fp=parseFloat(document.getElementById('c_prev').value);
  const fn=parseFloat(document.getElementById('c_next').value);
  const h=parseFloat(document.getElementById('c_h').value);
  if([fp,fn,h].some(isNaN)||h===0)return;
  const d=await api(`/api/cdf?f_prev=${fp}&f_next=${fn}&h=${h}`);
  if(!d)return;
  document.getElementById('c_out').textContent='₱' + d.rate.toFixed(4);
  document.getElementById('c_interp').textContent=`Meaning: for every ₱1.00 increase in income at this bracket, spending goes up by ₱${d.rate.toFixed(4)}.`;
  document.getElementById('c_steps').innerHTML=
    `<span style="color:var(--dim)">Step 1 — Subtract the lower bracket spending from the higher bracket spending:</span><br>`+
    `${fn.toLocaleString()} − ${fp.toLocaleString()} = ${d.numerator.toLocaleString()}<br><br>`+
    `<span style="color:var(--dim)">Step 2 — Multiply the income gap by 2:</span><br>`+
    `2 × ${h.toLocaleString()} = ${d.denominator.toLocaleString()}<br><br>`+
    `<span style="color:var(--dim)">Step 3 — Divide Step 1 by Step 2 to get the rate of change:</span><br>`+
    `${d.numerator.toLocaleString()} ÷ ${d.denominator.toLocaleString()} = <strong style="color:var(--neon)">₱${d.rate.toFixed(4)} per ₱1 of income</strong>`;
}

async function runTrap(){
  const vals=[0,1,2,3].map(i=>parseFloat(document.getElementById(`t_f${i}`).value));
  const mids=[0,1,2,3].map(i=>parseFloat(document.getElementById(`t_m${i}`).value));
  if(vals.some(isNaN)||mids.some(isNaN))return;
  const d=await apiPost('/api/trapezoidal',{values:vals,midpoints:mids});
  if(!d||d.error)return;
  document.getElementById('t_out').textContent=`₱${d.total.toLocaleString('en-PH',{maximumFractionDigits:2})}`;
  document.getElementById('t_interp').textContent='This is the total accumulated spending across all the income brackets you entered.';
  document.getElementById('t_steps').innerHTML=d.segments.map((s,i)=>'<span style="color:var(--dim)">Bracket '+(i+1)+' to Bracket '+(i+2)+':</span>  '+'('+s.h.toLocaleString()+' ÷ 2) × (₱'+s.f_j.toLocaleString()+' + ₱'+s.f_j1.toLocaleString()+') = <strong style="color:var(--mint)">₱'+s.area.toLocaleString()+'</strong>').join('<br>')+'<br><br><strong style="color:var(--neon)">Total spending burden = ₱'+d.total.toLocaleString('en-PH',{maximumFractionDigits:2})+'</strong>';
}

function preset(p){
  if(p==='food_nat'){document.getElementById('c_prev').value=24768.74;document.getElementById('c_next').value=63562.04;document.getElementById('c_h').value=50000;}
  else if(p==='edu_nat'){document.getElementById('c_prev').value=6941.76;document.getElementById('c_next').value=12561.5;document.getElementById('c_h').value=250000;}
  else if(p==='med_nat'){document.getElementById('c_prev').value=4357.64;document.getElementById('c_next').value=12357.97;document.getElementById('c_h').value=75000;}
  else if(p==='davao'){['t_f0','t_f1','t_f2','t_f3'].forEach((id,i)=>{document.getElementById(id).value=[22117.28,41669.86,61694.88,74355.46][i];});['t_m0','t_m1','t_m2','t_m3'].forEach((id,i)=>{document.getElementById(id).value=[25000,75000,125000,175000][i];});}
  runCDF();runTrap();
}

// ── INIT ──────────────────────────────────────────────────────────────
(async()=>{
  await initHealth();
  runCDF();
  runTrap();
})();
