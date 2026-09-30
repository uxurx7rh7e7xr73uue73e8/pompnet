(() => {
  const $ = (s) => document.querySelector(s);
  const csrf = $('meta[name="csrf-token"]')?.content || $('input[name="csrf_token"]')?.value || '';
  let soundOn = localStorage.getItem('pompnet-sounds') !== 'off';
  let audio;
  function clickSound(kind='tap') {
    if (!soundOn || !window.AudioContext) return;
    try { audio ||= new AudioContext(); const o=audio.createOscillator(), g=audio.createGain();
      o.type='sine'; o.frequency.setValueAtTime(kind==='login'?520:kind==='logout'?260:390,audio.currentTime); o.frequency.exponentialRampToValueAtTime(720,audio.currentTime+.045); g.gain.setValueAtTime(.0001,audio.currentTime); g.gain.exponentialRampToValueAtTime(.035,audio.currentTime+.006); g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.075); o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime+.08);
    } catch (_) {}
  }
  document.addEventListener('click', e => { const el=e.target.closest('[data-sound],[data-action],button'); if(el) clickSound(el.dataset.sound||'tap'); });
  const toggle=$('#sound-toggle'); if(toggle){toggle.checked=soundOn;toggle.onchange=()=>{soundOn=toggle.checked;localStorage.setItem('pompnet-sounds',soundOn?'on':'off');};}
  const icons={total_users:['👥','کل کاربران','--','var(--blue)'],active_users:['🟢','کاربران فعال','--','var(--green)'],disabled_users:['🔴','غیرفعال','--','var(--red)'],online_users:['📡','آنلاین','--','var(--purple)'],traffic_usage:['📊','مصرف ترافیک','--','var(--blue)'],expired_users:['⏳','منقضی شده','--','var(--red)'],inbounds:['🔗','این‌باندها','--','var(--purple)'],server_status:['🖥','وضعیت سرور','--','var(--green)']};
  function renderStats(data){const root=$('#stats');if(!root)return;root.innerHTML=Object.entries(icons).map(([key,v])=>`<article class="stat glass" style="--accent:${v[3]}"><span class="icon">${v[0]}</span><h3 data-count="${data[key]??v[2]}">${data[key]??v[2]}</h3><p>${v[1]}</p></article>`).join('');const status=$('#agent-status');if(status)status.textContent=data.server_status==='agent_offline'?'اتصال ایجنت برقرار نیست':'● سرویس آنلاین';}
  function renderUsers(items=[]){const body=$('#users');if(!body)return;if(!items.length){body.innerHTML='<tr><td colspan="6" class="empty">کاربری برای نمایش وجود ندارد یا ایجنت متصل نیست.</td></tr>';return}body.innerHTML=items.map(u=>`<tr><td><b>${esc(u.username)}</b></td><td><span class="badge ${u.disabled?'disabled-b':'active-b'}">${u.disabled?'غیرفعال':'فعال'}</span></td><td>${esc(u.used||'—')} / ${esc(u.limit||'نامحدود')}</td><td>${esc(u.expiry||'—')}</td><td>${u.online?'آنلاین':'آفلاین'}</td><td><button class="icon-button" data-action="copy" data-value="${esc(u.subscription||'')}">کپی</button> <button class="icon-button" data-action="qr">QR</button></td></tr>`).join('');}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  async function load(){try{const [a,u]=await Promise.all([fetch('/api/overview'),fetch('/api/users')]);const overview=await a.json(), users=await u.json();renderStats(overview.data||overview);renderUsers(users.users);}catch(e){renderStats({});}}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-action="copy"]');if(b&&b.dataset.value){navigator.clipboard?.writeText(b.dataset.value);b.textContent='کپی شد';setTimeout(()=>b.textContent='کپی',1200);}});
  if($('#stats')) load(); window.pompnet={clickSound};
})();
