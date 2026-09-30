(() => {
  const $ = (s) => document.querySelector(s);
  const csrf = $('meta[name="csrf-token"]')?.content || $('input[name="csrf_token"]')?.value || '';
  let soundOn = localStorage.getItem('pompnet-sounds') !== 'off';
  let audio;
  
  function clickSound(kind = 'tap') {
    if (!soundOn || !window.AudioContext) return;
    try {
      audio ||= new AudioContext();
      const o = audio.createOscillator(), g = audio.createGain();
      const freqs = { login: 680, logout: 240, tap: 420, success: 800, copy: 500 };
      o.type = 'sine';
      o.frequency.setValueAtTime(freqs[kind] || 390, audio.currentTime);
      o.frequency.exponentialRampToValueAtTime(freqs[kind] * 1.4, audio.currentTime + 0.05);
      g.gain.setValueAtTime(0.0001, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.04, audio.currentTime + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.09);
      o.connect(g).connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + 0.11);
    } catch (_) {}
  }
  
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-sound],[data-action],button');
    if (el) clickSound(el.dataset.sound || 'tap');
  });
  
  const toggle = $('#sound-toggle');
  if (toggle) {
    toggle.checked = soundOn;
    toggle.onchange = () => {
      soundOn = toggle.checked;
      localStorage.setItem('pompnet-sounds', soundOn ? 'on' : 'off');
    };
  }
  
  const icons = {
    total_users: ['👥', 'کل کاربران', '--', '--blue'],
    active_users: ['🟢', 'کاربران فعال', '--', '--green'],
    disabled_users: ['🔴', 'غیرفعال', '--', '--red'],
    online_users: ['📡', 'آنلاین', '--', '--purple'],
    traffic_usage: ['📊', 'مصرف ترافیک', '--', '--blue'],
    expired_users: ['⏳', 'منقضی شده', '--', '--red'],
    inbounds: ['🔗', 'اینبندها', '--', '--purple'],
    server_status: ['🖥', 'وضعیت سرور', '--', '--green']
  };
  
  function renderStats(data) {
    const root = $('#stats');
    if (!root) return;
    const classes = ['', 'alt-1', 'alt-2', 'alt-3', 'alt-4'];
    root.innerHTML = Object.entries(icons)
      .map(([key, v], i) => `
        <article class="stat glass ${classes[i % classes.length]}" style="">
          <span class="icon">${v[0]}</span>
          <h3 data-count="${data[key] ?? v[2]}">${data[key] ?? v[2]}</h3>
          <p>${v[1]}</p>
        </article>
      `)
      .join('');
    
    const status = $('#agent-status');
    if (status) {
      status.textContent = data.server_status === 'agent_offline' ? '⚠️ اتصال ایجنت برقرار نیست' : '🟢 سرویس آنلاین';
      status.className = data.server_status === 'agent_offline' ? 'status-pill offline' : 'status-pill online';
    }
  }
  
  function renderUsers(items = []) {
    const body = $('#users');
    if (!body) return;
    if (!items.length) {
      body.innerHTML = '<tr><td colspan="6" class="empty">کاربری برای نمایش وجود ندارد یا ایجنت متصل نیست.</td></tr>';
      return;
    }
    body.innerHTML = items.map(u => `
      <tr>
        <td><b>${esc(u.username)}</b></td>
        <td><span class="badge ${u.disabled ? 'disabled-b' : 'active-b'}">${u.disabled ? 'غیرفعال' : 'فعال'}</span></td>
        <td>${esc(u.used || '—')} / ${esc(u.limit || 'نامحدود')}</td>
        <td>${esc(u.expiry || '—')}</td>
        <td>${u.online ? 'آنلاین' : 'آفلاین'}</td>
        <td>
          <button class="icon-button" data-action="copy" data-value="${esc(u.subscription || '')}">کپی</button>
          <button class="icon-button" data-action="qr">QR</button>
        </td>
      </tr>
    `).join('');
  }
  
  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  
  async function load() {
    try {
      const [a, u] = await Promise.all([fetch('/api/overview'), fetch('/api/users')]);
      const overview = await a.json(), users = await u.json();
      renderStats(overview.data || overview);
      renderUsers(users.users);
    } catch (e) {
      renderStats({});
    }
  }
  
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-action="copy"]');
    if (b && b.dataset.value) {
      navigator.clipboard?.writeText(b.dataset.value);
      const orig = b.textContent;
      b.textContent = '✓ کپی شد';
      b.style.color = '#48e6a4';
      setTimeout(() => {
        b.textContent = orig;
        b.style.color = '';
      }, 1500);
      clickSound('copy');
    }
  });
  
  if ($('#stats')) load();
  window.pompnet = { clickSound };
})();
