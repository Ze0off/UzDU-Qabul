/* ============================
   MA'LUMOTLAR (localStorage)
   ============================ */

function getData(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
function setData(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// Boshlang'ich ma'lumotlar
if (!localStorage.getItem('uz_users'))  setData('uz_users', []);
if (!localStorage.getItem('uz_apps'))   setData('uz_apps',  []);
if (!localStorage.getItem('uz_admin'))  setData('uz_admin', { user: 'admin', pass: 'admin123' });

/* ============================
   HOLAT
   ============================ */
let currentUser  = null;  // { id, name, email }
let adminMode    = false;
let admFilterVal = 'all';

/* ============================
   NAVBAR
   ============================ */
function renderNav() {
  const el = document.getElementById('navLinks');
  if (adminMode) {
    el.innerHTML = `
      <span style="color:rgba(255,255,255,.6);padding:8px 12px;font-size:.85rem;">⚙️ Admin</span>
      <button onclick="adminLogout()">Chiqish</button>`;
  } else if (currentUser) {
    el.innerHTML = `
      <button onclick="showPage('p-dashboard')">Kabinet</button>
      <button onclick="showPage('p-apply')">Ariza</button>
      <span style="color:rgba(255,255,255,.55);padding:8px 10px;font-size:.83rem;">👤 ${currentUser.name.split(' ')[0]}</span>
      <button onclick="userLogout()">Chiqish</button>`;
  } else {
    el.innerHTML = `
      <button onclick="showPage('p-home')">Bosh sahifa</button>
      <button onclick="showPage('p-login')">Kirish</button>
      <button class="btn-gold" onclick="showPage('p-register')">Ro'yxatdan O'tish</button>`;
  }
}

/* ============================
   SAHIFA ALMASHTIRISH
   ============================ */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  clearMessages();

  if (id === 'p-dashboard') renderDashboard();
  if (id === 'p-admin')     { renderAdminStats(); renderAdminTable(); }
}

function goHome() {
  if (adminMode) showPage('p-admin');
  else if (currentUser) showPage('p-dashboard');
  else showPage('p-home');
}

function clearMessages() {
  ['reg-msg','login-msg','apply-msg','adm-login-msg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = ''; 
  });
}

function msg(id, type, text) {
  const icons = { ok:'✅', err:'⚠️', inf:'💡', wrn:'⚠️' };
  document.getElementById(id).innerHTML =
    `<div class="alert alert-${type}">${icons[type]||'ℹ️'} ${text}</div>`;
}

/* ============================
   RO'YXATDAN O'TISH
   ============================ */
function doRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;

  if (!name || !email || !pass)     return msg('reg-msg','err','Barcha maydonlarni to\'ldiring!');
  if (!email.includes('@'))          return msg('reg-msg','err','Email manzil noto\'g\'ri!');
  if (pass.length < 6)               return msg('reg-msg','err','Parol kamida 6 belgidan iborat bo\'lishi kerak!');
  if (pass !== pass2)                return msg('reg-msg','err','Parollar mos kelmadi!');

  const users = getData('uz_users');
  if (users.find(u => u.email === email)) return msg('reg-msg','err','Bu email allaqachon ro\'yxatdan o\'tgan!');

  const user = { id: Date.now(), name, email, pass, createdAt: new Date().toISOString() };
  users.push(user);
  setData('uz_users', users);

  msg('reg-msg','ok','Ro\'yxatdan muvaffaqiyatli o\'tdingiz! Tizimga kiring.');
  setTimeout(() => showPage('p-login'), 1800);
}

/* ============================
   KIRISH
   ============================ */
function doLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass  = document.getElementById('login-pass').value;

  if (!email || !pass) return msg('login-msg','err','Email va parolni kiriting!');

  const user = getData('uz_users').find(u => u.email === email && u.pass === pass);
  if (!user) return msg('login-msg','err','Email yoki parol noto\'g\'ri!');

  currentUser = user;
  localStorage.setItem('uz_session', JSON.stringify({ type: 'user', id: user.id }));
  renderNav();
  showPage('p-dashboard');
}

function userLogout() {
  currentUser = null;
  localStorage.removeItem('uz_session');
  renderNav();
  showPage('p-home');
}

/* ============================
   DASHBOARD
   ============================ */
function renderDashboard() {
  if (!currentUser) return showPage('p-login');
  document.getElementById('dash-name').textContent = currentUser.name.split(' ')[0];

  const apps = getData('uz_apps').filter(a => a.userId === currentUser.id);
  const pend = apps.filter(a => a.status === 'pending').length;
  const acc  = apps.filter(a => a.status === 'accepted').length;
  const rej  = apps.filter(a => a.status === 'rejected').length;

  document.getElementById('user-stats').innerHTML = `
    <div class="stat s-blue"><div class="stat-num">${apps.length}</div><div class="stat-lbl">Jami arizalar</div></div>
    <div class="stat s-gold"><div class="stat-num">${pend}</div><div class="stat-lbl">Kutilmoqda</div></div>
    <div class="stat s-green"><div class="stat-num">${acc}</div><div class="stat-lbl">Qabul qilindi</div></div>
    <div class="stat s-red"><div class="stat-num">${rej}</div><div class="stat-lbl">Rad etildi</div></div>
  `;

  if (!apps.length) {
    document.getElementById('user-apps').innerHTML = `
      <div class="empty">
        <div class="ico">📋</div>
        <h3>Hali ariza topshirmagansiz</h3>
        <p>Universitetga ariza topshirish uchun quyidagi tugmani bosing</p>
        <br><button class="btn btn-blue" onclick="showPage('p-apply')">Ariza Topshirish →</button>
      </div>`;
    return;
  }

  const rows = apps.map((a, i) => {
    const b = badgeOf(a.status);
    return `<tr>
      <td style="color:var(--muted)">${i+1}</td>
      <td><strong>${a.direction.split('|')[0]}</strong></td>
      <td style="color:var(--muted)">${a.direction.split('|')[1]||''}</td>
      <td style="color:var(--muted);font-size:.83rem">${fmtDate(a.createdAt)}</td>
      <td><span class="badge ${b.cls}">${b.ico} ${b.lbl}</span></td>
      <td><button class="btn btn-blue btn-sm" onclick='openDetail(${JSON.stringify(a)})'>Ko'rish</button></td>
    </tr>`;
  }).join('');

  document.getElementById('user-apps').innerHTML = `
    <div class="tbl-wrap">
    <table>
      <thead><tr><th>#</th><th>Yo'nalish</th><th>Fakultet</th><th>Sana</th><th>Holat</th><th>Amal</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

/* ============================
   ARIZA TOPSHIRISH
   ============================ */
function doApply() {
  if (!currentUser) return showPage('p-login');

  const fname   = document.getElementById('a-fname').value.trim();
  const lname   = document.getElementById('a-lname').value.trim();
  const bdate   = document.getElementById('a-bdate').value;
  const phone   = document.getElementById('a-phone').value.trim();
  const pseries = document.getElementById('a-pseries').value.trim().toUpperCase();
  const pnum    = document.getElementById('a-pnum').value.trim();
  const dir     = document.getElementById('a-dir').value;

  if (!fname || !lname || !bdate || !phone || !pseries || !pnum || !dir)
    return msg('apply-msg','err','Barcha maydonlarni to\'ldiring!');
  if (!/^[A-Z]{2}$/.test(pseries))
    return msg('apply-msg','err','Pasport seriyasi 2 ta lotin harfdan iborat bo\'lishi kerak!');
  if (!/^\d{7}$/.test(pnum))
    return msg('apply-msg','err','Pasport raqami 7 ta raqamdan iborat bo\'lishi kerak!');

  const apps = getData('uz_apps');
  if (apps.find(a => a.userId === currentUser.id && a.direction === dir))
    return msg('apply-msg','err','Bu yo\'nalish bo\'yicha allaqachon ariza topshirgansiz!');

  const app = {
    id: Date.now(),
    userId: currentUser.id,
    userName: currentUser.name,
    userEmail: currentUser.email,
    fname, lname, bdate, phone,
    passport: pseries + pnum,
    direction: dir,
    status: 'pending',
    note: '',
    createdAt: new Date().toISOString()
  };
  apps.push(app);
  setData('uz_apps', apps);

  msg('apply-msg','ok','Arizangiz muvaffaqiyatli topshirildi! Ko\'rib chiqilgandan so\'ng natija bildiriladi.');
  ['a-fname','a-lname','a-bdate','a-phone','a-pseries','a-pnum'].forEach(id => document.getElementById(id).value='');
  document.getElementById('a-dir').value = '';
  setTimeout(() => showPage('p-dashboard'), 2000);
}

/* ============================
   ADMIN LOGIN
   ============================ */
function doAdminLogin() {
  const user = document.getElementById('adm-user').value.trim();
  const pass = document.getElementById('adm-pass').value;
  const adm  = getData('uz_admin');

  if (user === adm.user && pass === adm.pass) {
    adminMode = true;
    localStorage.setItem('uz_session', JSON.stringify({ type: 'admin' }));
    renderNav();
    showPage('p-admin');
  } else {
    msg('adm-login-msg','err','Login yoki parol noto\'g\'ri!');
  }
}

function adminLogout() {
  adminMode = false;
  admFilterVal = 'all';
  localStorage.removeItem('uz_session');
  renderNav();
  showPage('p-home');
}

/* ============================
   ADMIN PANEL
   ============================ */
function renderAdminStats() {
  const apps = getData('uz_apps');
  const users = getData('uz_users');
  document.getElementById('adm-stats').innerHTML = `
    <div class="stat s-blue"><div class="stat-num">${apps.length}</div><div class="stat-lbl">Jami arizalar</div></div>
    <div class="stat s-gold"><div class="stat-num">${apps.filter(a=>a.status==='pending').length}</div><div class="stat-lbl">Kutilmoqda</div></div>
    <div class="stat s-green"><div class="stat-num">${apps.filter(a=>a.status==='accepted').length}</div><div class="stat-lbl">Qabul qilindi</div></div>
    <div class="stat s-red"><div class="stat-num">${apps.filter(a=>a.status==='rejected').length}</div><div class="stat-lbl">Rad etildi</div></div>
  `;
}

function admFilter(el) {
  document.querySelectorAll('#adm-tabs .tab').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  admFilterVal = el.dataset.f;
  renderAdminTable();
}

function renderAdminTable() {
  const search = (document.getElementById('adm-search')?.value || '').toLowerCase();
  let apps = getData('uz_apps');

  if (admFilterVal !== 'all') apps = apps.filter(a => a.status === admFilterVal);
  if (search) apps = apps.filter(a =>
    (a.fname+' '+a.lname).toLowerCase().includes(search) ||
    a.phone.includes(search) || a.passport.toLowerCase().includes(search) ||
    a.userEmail.toLowerCase().includes(search)
  );

  if (!apps.length) {
    document.getElementById('adm-table').innerHTML = `
      <div class="empty"><div class="ico">📭</div><h3>Ariza topilmadi</h3></div>`;
    return;
  }

  const rows = apps.map((a, i) => {
    const b = badgeOf(a.status);
    return `<tr>
      <td style="color:var(--muted)">${i+1}</td>
      <td>
        <strong>${a.fname} ${a.lname}</strong>
        <br><small style="color:var(--muted)">${a.userEmail}</small>
      </td>
      <td>${a.phone}</td>
      <td style="font-family:monospace;letter-spacing:1px">${a.passport}</td>
      <td>
        <strong>${a.direction.split('|')[0]}</strong>
        <br><small style="color:var(--muted)">${a.direction.split('|')[1]||''}</small>
      </td>
      <td style="font-size:.82rem;color:var(--muted)">${fmtDate(a.createdAt)}</td>
      <td><span class="badge ${b.cls}">${b.ico} ${b.lbl}</span></td>
      <td>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <button class="btn btn-blue btn-sm" onclick='openDetail(${JSON.stringify(a)})'>👁</button>
          ${a.status!=='accepted' ? `<button class="btn btn-green btn-sm" onclick="admAccept(${a.id})">✅</button>` : ''}
          ${a.status!=='rejected' ? `<button class="btn btn-red btn-sm" onclick="openReject(${a.id})">❌</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('adm-table').innerHTML = `
    <div class="tbl-wrap">
    <table>
      <thead><tr>
        <th>#</th><th>Ism Familiya</th><th>Telefon</th>
        <th>Pasport</th><th>Yo'nalish</th><th>Sana</th><th>Holat</th><th>Amallar</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

function admAccept(id) {
  if (!confirm('Arizani qabul qilasizmi?')) return;
  const apps = getData('uz_apps');
  const i = apps.findIndex(a => a.id === id);
  if (i > -1) { apps[i].status = 'accepted'; apps[i].note = ''; setData('uz_apps', apps); }
  renderAdminStats();
  renderAdminTable();
}

/* ============================
   MODAL - TAFSILOT
   ============================ */
function openDetail(a) {
  const b = badgeOf(a.status);
  const isAdmin = adminMode;
  document.getElementById('modal-body').innerHTML = `
    <div class="det-grid">
      <div class="det-item"><label>Ism</label><p>${a.fname}</p></div>
      <div class="det-item"><label>Familiya</label><p>${a.lname}</p></div>
      <div class="det-item"><label>Tug'ilgan sana</label><p>${a.bdate}</p></div>
      <div class="det-item"><label>Telefon</label><p>${a.phone}</p></div>
      <div class="det-item"><label>Pasport</label><p style="font-family:monospace;font-size:1.05rem">${a.passport}</p></div>
      <div class="det-item"><label>Email</label><p>${a.userEmail}</p></div>
    </div>
    <div class="det-item" style="margin-bottom:10px;">
      <label>Yo'nalish</label>
      <p>${a.direction.split('|')[0]} <span style="color:var(--muted)">— ${a.direction.split('|')[1]||''}</span></p>
    </div>
    <div class="det-item" style="margin-bottom:14px;">
      <label>Topshirilgan sana</label><p>${fmtDate(a.createdAt)}</p>
    </div>
    <div style="display:flex;align-items:center;gap:10px;padding-top:14px;border-top:1px solid var(--border);">
      <span>Holat:</span>
      <span class="badge ${b.cls}">${b.ico} ${b.lbl}</span>
    </div>
    ${a.note ? `<div class="alert alert-inf" style="margin-top:12px">💬 Admin izohi: ${a.note}</div>` : ''}
    ${isAdmin && a.status !== 'accepted' ? `<button class="btn btn-green btn-full" style="margin-top:12px" onclick="admAccept(${a.id});closeModal()">✅ Qabul Qilish</button>` : ''}
    ${isAdmin && a.status !== 'rejected' ? `<button class="btn btn-red btn-full" style="margin-top:8px" onclick="closeModal();openReject(${a.id})">❌ Rad Etish</button>` : ''}
  `;
  document.getElementById('modal-detail').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-detail').classList.remove('open');
}

/* ============================
   MODAL - RAD ETISH
   ============================ */
function openReject(id) {
  document.getElementById('rej-id').value   = id;
  document.getElementById('rej-note').value = '';
  document.getElementById('modal-reject').classList.add('open');
}

function closeReject() {
  document.getElementById('modal-reject').classList.remove('open');
}

function confirmReject() {
  const id   = parseInt(document.getElementById('rej-id').value);
  const note = document.getElementById('rej-note').value.trim();
  const apps = getData('uz_apps');
  const i = apps.findIndex(a => a.id === id);
  if (i > -1) {
    apps[i].status = 'rejected';
    apps[i].note   = note;
    setData('uz_apps', apps);
  }
  closeReject();
  renderAdminStats();
  renderAdminTable();
}

/* ============================
   YORDAMCHI FUNKSIYALAR
   ============================ */
function badgeOf(status) {
  const m = {
    pending:  { cls:'b-wait',   ico:'⏳', lbl:'Kutilmoqda' },
    accepted: { cls:'b-accept', ico:'✅', lbl:'Qabul qilindi' },
    rejected: { cls:'b-reject', ico:'❌', lbl:'Rad etildi' },
  };
  return m[status] || m.pending;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.getDate().toString().padStart(2,'0') + '.' +
         (d.getMonth()+1).toString().padStart(2,'0') + '.' +
         d.getFullYear() + ' ' +
         d.getHours().toString().padStart(2,'0') + ':' +
         d.getMinutes().toString().padStart(2,'0');
}

// Pasport seriyasini katta harfga
const aPseriesEl = document.getElementById('a-pseries');
if (aPseriesEl) {
  aPseriesEl.addEventListener('input', function(){
    this.value = this.value.toUpperCase().replace(/[^A-Z]/g,'');
  });
}
// Pasport raqami faqat raqam
const aPnumEl = document.getElementById('a-pnum');
if (aPnumEl) {
  aPnumEl.addEventListener('input', function(){
    this.value = this.value.replace(/\D/g,'');
  });
}
// Enter bilan kirish
const loginPassEl = document.getElementById('login-pass');
if (loginPassEl) loginPassEl.addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
const admPassEl = document.getElementById('adm-pass');
if (admPassEl) admPassEl.addEventListener('keydown',  e => { if(e.key==='Enter') doAdminLogin(); });

// Sahifa yuklanganda session tiklash
(function restoreSession() {
  const sess = localStorage.getItem('uz_session');
  if (!sess) { renderNav(); return; }
  try {
    const s = JSON.parse(sess);
    if (s.type === 'admin') {
      adminMode = true;
      renderNav();
      showPage('p-admin');
    } else if (s.type === 'user') {
      const users = getData('uz_users');
      const user  = users.find(u => u.id === s.id);
      if (user) {
        currentUser = user;
        renderNav();
        showPage('p-dashboard');
      } else {
        localStorage.removeItem('uz_session');
        renderNav();
      }
    } else {
      renderNav();
    }
  } catch(e) {
    localStorage.removeItem('uz_session');
    renderNav();
  }
})();

/* ============================
   KURS ISHI PANELI
   ============================ */
function toggleKursIshi() {
  const overlay = document.getElementById('ki-overlay');
  overlay.classList.toggle('open');
  document.body.style.overflow = overlay.classList.contains('open') ? 'hidden' : '';
}

// ESC tugmasi bilan yopish
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('ki-overlay');
    if (overlay.classList.contains('open')) toggleKursIshi();
  }
});

['ki-guruh','ki-bajardi','ki-tekshirdi'].forEach(function(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const saved = localStorage.getItem('uz_' + id);
  if (saved) el.value = saved;
  el.addEventListener('input', function() {
    localStorage.setItem('uz_' + id, this.value);
  });
});
