// =================== DATA LAYER ===================
const DB = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  getArr: k => DB.get(k) || [],
};

const data = {
  get members()    { return DB.getArr('ak_members'); },
  set members(v)   { DB.set('ak_members', v); },
  get savings()    { return DB.getArr('ak_savings'); },
  set savings(v)   { DB.set('ak_savings', v); },
  get kasPayments(){ return DB.getArr('ak_kas_payments'); },
  set kasPayments(v){ DB.set('ak_kas_payments', v); },
  get kasTagihan() { return DB.getArr('ak_kas_tagihan'); },
  set kasTagihan(v){ DB.set('ak_kas_tagihan', v); },
  get kasSettings(){ return DB.get('ak_kas_settings') || { period: 'Semester 1', amount: 10000, freq: 'monthly', start: '', end: '' }; },
  set kasSettings(v){ DB.set('ak_kas_settings', v); },
  get debts()      { return DB.getArr('ak_debts'); },
  set debts(v)     { DB.set('ak_debts', v); },
  get debtPayments(){ return DB.getArr('ak_debt_payments'); },
  set debtPayments(v){ DB.set('ak_debt_payments', v); },
  get income()     { return DB.getArr('ak_income'); },
  set income(v)    { DB.set('ak_income', v); },
  get transactions(){ return DB.getArr('ak_transactions'); },
  set transactions(v){ DB.set('ak_transactions', v); },
  get xp()         { return DB.get('ak_xp') || 0; },
  set xp(v)        { DB.set('ak_xp', v); },
};

// =================== PYRAMID CONFIG ===================
const PYRAMID_LEVELS = [
  { name: 'Stone',   icon: '🪨', color: '#888', xp: 0,   glow: '#888' },
  { name: 'Bronze',  icon: '🥉', color: '#CD7F32', xp: 10,  glow: '#CD7F32' },
  { name: 'Silver',  icon: '🥈', color: '#C0C0C0', xp: 25,  glow: '#C0C0C0' },
  { name: 'Gold',    icon: '🥇', color: '#F5C842', xp: 50,  glow: '#F5C842' },
  { name: 'Diamond', icon: '💎', color: '#4DD0E1', xp: 100, glow: '#4DD0E1' },
  { name: 'Divine',  icon: '✨', color: '#A855F7', xp: 200, glow: '#A855F7' },
];

function getCurrentLevel() {
  const xp = data.xp;
  let level = 0;
  for (let i = 0; i < PYRAMID_LEVELS.length; i++) {
    if (xp >= PYRAMID_LEVELS[i].xp) level = i;
  }
  return level;
}

function getLevelProgress() {
  const xp = data.xp;
  const lvl = getCurrentLevel();
  const curr = PYRAMID_LEVELS[lvl];
  const next = PYRAMID_LEVELS[lvl + 1];
  if (!next) return { pct: 100, curr: xp, next: curr.xp };
  const pct = ((xp - curr.xp) / (next.xp - curr.xp)) * 100;
  return { pct: Math.min(100, pct), curr: xp, next: next.xp, lvl };
}

// =================== UTILS ===================
const fmt = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const getInitials = name => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const AVATAR_COLORS = [
  ['#F5C842','#2a1a00'], ['#00D4AA','#002a22'], ['#4D9FFF','#001a38'],
  ['#A855F7','#1a0030'], ['#FF7043','#2a0d00'], ['#26C6DA','#002a2e'],
  ['#EC407A','#2a0015'], ['#66BB6A','#002a05']
];
function memberColor(id) {
  const idx = id ? Math.abs([...id].reduce((a,c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length : 0;
  return AVATAR_COLORS[idx];
}

function getMemberById(id) { return data.members.find(m => m.id === id); }
function getMemberName(id) { const m = getMemberById(id); return m ? (m.nick || m.name) : 'Unknown'; }

function addTransaction(type, memberId, amount, note) {
  const txs = data.transactions;
  txs.unshift({ id: uid(), type, memberId, amount, note, date: today(), ts: Date.now() });
  data.transactions = txs.slice(0, 200);
  data.xp = data.xp + 1;
}

// =================== NAVIGATION ===================
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  document.querySelectorAll(`[data-page="${page}"]`).forEach(n => n.classList.add('active'));
  closeSidebar();
  renderPage(page);
}

function renderPage(page) {
  const fns = {
    dashboard: renderDashboard,
    members: renderMembers,
    savings: renderSavings,
    kas: renderKas,
    debts: renderDebts,
    income: renderIncome,
    stats: renderStats,
    pyramid: renderPyramid,
  };
  if (fns[page]) fns[page]();
}

// =================== MODAL ===================
function openModal(id) {
  document.getElementById('modal-overlay').classList.add('active');
  const modal = document.getElementById(id);
  if (modal) { modal.style.display = 'block'; setTimeout(() => modal.classList.add('active'), 10); }
  // Pre-fill dates
  document.querySelectorAll(`#${id} input[type=date]`).forEach(el => { if (!el.value) el.value = today(); });
  // Populate member selects in modal
  populateMemberSelects(id);
}

function closeAllModals() {
  document.getElementById('modal-overlay').classList.remove('active');
  document.querySelectorAll('.modal').forEach(m => {
    m.classList.remove('active');
    setTimeout(() => { if (!m.classList.contains('active')) m.style.display = 'none'; }, 250);
  });
}

function populateMemberSelects(modalId) {
  const members = data.members.filter(m => m.status === 'active');
  const idMap = {
    'modal-add-saving': ['s-member'],
    'modal-bayar-kas': ['bk-member'],
    'modal-tagihan': ['tag-member'],
    'modal-add-debt': ['d-member'],
    'modal-quick-pay': ['qt-kas-member', 'qt-save-member'],
  };
  const ids = idMap[modalId] || [];
  ids.forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">-- Pilih Anggota --</option>' +
      members.map(m => `<option value="${m.id}">${m.name}${m.nick ? ' ('+m.nick+')' : ''}</option>`).join('');
    if (cur) sel.value = cur;
  });
}

// =================== PYRAMID SVG ===================
function buildPyramidSVG(level, small = false) {
  const lv = PYRAMID_LEVELS[level];
  const rows = 5;
  const w = small ? 200 : 260;
  const h = small ? 160 : 210;
  const baseW = w * 0.85;
  const blockH = h / rows;
  let blocks = [];
  for (let r = 0; r < rows; r++) {
    const rowW = baseW * ((r + 1) / rows);
    const x = (w - rowW) / 2;
    const y = h - (r + 1) * blockH;
    const filled = (rows - r - 1) < level + 1 || r === 0;
    const opacity = filled ? (0.5 + (r / rows) * 0.5) : 0.12;
    blocks.push(`<rect x="${x}" y="${y}" width="${rowW}" height="${blockH - 3}" rx="4"
      fill="${lv.color}" opacity="${opacity}" stroke="${lv.color}" stroke-opacity="0.2" stroke-width="1"/>`);
  }
  // Top gem
  const gemX = w / 2, gemY = h - rows * blockH - 8;
  blocks.push(`<text x="${gemX}" y="${gemY + 14}" text-anchor="middle" font-size="${small ? 20 : 26}">${lv.icon}</text>`);
  return `<svg width="${w}" height="${h + 10}" viewBox="0 0 ${w} ${h + 10}" xmlns="http://www.w3.org/2000/svg">${blocks.join('')}</svg>`;
}

// =================== DASHBOARD ===================
function renderDashboard() {
  // Stat totals
  const totalSavings = data.savings.reduce((s, x) => s + x.amount, 0);
  const totalKas = data.kasPayments.reduce((s, x) => s + x.amount, 0);
  const totalTagihan = data.kasTagihan.reduce((s, x) => s + x.amount, 0);
  const totalKasPaid = data.kasPayments.reduce((s, x) => s + x.amount, 0);
  const totalDebt = data.debts.reduce((s, x) => s + (x.amount - (x.paid || 0)), 0);
  const tunggakan = Math.max(0, totalTagihan - totalKasPaid) + totalDebt;
  const activeMembers = data.members.filter(m => m.status === 'active').length;

  document.getElementById('stat-tabungan').textContent = fmt(totalSavings);
  document.getElementById('stat-kas').textContent = fmt(totalKas);
  document.getElementById('stat-tunggakan').textContent = fmt(tunggakan);
  document.getElementById('stat-members').textContent = activeMembers;

  // Streak
  const streak = calculateStreak();
  document.getElementById('sidebar-streak').textContent = streak;

  // Pyramid
  const lvl = getCurrentLevel();
  const prog = getLevelProgress();
  document.getElementById('dash-pyramid').innerHTML = buildPyramidSVG(lvl, true);
  document.getElementById('dash-level-label').textContent = PYRAMID_LEVELS[lvl].name;
  document.getElementById('dash-level-label').style.color = PYRAMID_LEVELS[lvl].color;
  document.getElementById('dash-level-bar').style.width = prog.pct + '%';
  document.getElementById('dash-level-bar').style.background = `linear-gradient(90deg, ${PYRAMID_LEVELS[lvl].color}88, ${PYRAMID_LEVELS[lvl].color})`;
  const next = PYRAMID_LEVELS[lvl + 1];
  document.getElementById('dash-level-xp').textContent = next
    ? `${data.xp} / ${next.xp} transaksi → ${next.name}`
    : `Max Level! ${data.xp} transaksi`;

  // Recent transactions
  const txs = data.transactions.slice(0, 12);
  const txList = document.getElementById('dash-tx-list');
  if (txs.length === 0) {
    txList.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Belum ada transaksi</p></div>';
  } else {
    txList.innerHTML = txs.map(tx => {
      const [bg, fg] = memberColor(tx.memberId);
      const typeLabel = { kas: 'Kas', saving: 'Tabungan', debt: 'Hutang', income: 'Pemasukan', pay_debt: 'Bayar Hutang' }[tx.type] || tx.type;
      const badgeCls = { kas: 'badge-kas', saving: 'badge-saving', debt: 'badge-debt', income: 'badge-income', pay_debt: 'badge-kas' }[tx.type] || '';
      const member = getMemberById(tx.memberId);
      const displayName = member ? (member.nick || member.name) : (tx.source || 'Pemasukan');
      return `<div class="tx-item">
        <div class="tx-avatar" style="background:${bg};color:${fg}">${getInitials(displayName)}</div>
        <div class="tx-info">
          <div class="tx-name">${displayName} <span class="tx-type-badge ${badgeCls}">${typeLabel}</span></div>
          <div class="tx-meta">${tx.date} ${tx.note ? '· ' + tx.note : ''}</div>
        </div>
        <div class="tx-amount positive">${fmt(tx.amount)}</div>
      </div>`;
    }).join('');
  }

  // Ranking
  renderKasRanking();
}

function calculateStreak() {
  const txs = data.transactions;
  if (!txs.length) return 0;
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 30; i++) {
    const dateStr = d.toISOString().slice(0, 10);
    if (txs.some(t => t.date === dateStr)) streak++;
    else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function renderKasRanking() {
  const members = data.members.filter(m => m.status === 'active');
  const kasPayments = data.kasPayments;
  const kasTagihan = data.kasTagihan;

  const ranked = members.map(m => {
    const paid = kasPayments.filter(k => k.memberId === m.id).reduce((s, x) => s + x.amount, 0);
    const tagihan = kasTagihan.filter(t => t.memberId === m.id).reduce((s, x) => s + x.amount, 0);
    const pct = tagihan > 0 ? Math.min(100, (paid / tagihan) * 100) : (paid > 0 ? 100 : 0);
    return { ...m, paid, tagihan, pct };
  }).sort((a, b) => b.pct - a.pct || b.paid - a.paid).slice(0, 5);

  const container = document.getElementById('dash-ranking');
  if (!ranked.length) { container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-medal"></i><p>Belum ada data kas</p></div>'; return; }
  const numClass = ['gold-rank','silver-rank','bronze-rank','',''];
  container.innerHTML = ranked.map((m, i) => {
    const [bg, fg] = memberColor(m.id);
    return `<div class="rank-item">
      <div class="rank-num ${numClass[i]}">${i + 1}</div>
      <div class="rank-avatar" style="background:${bg};color:${fg}">${getInitials(m.name)}</div>
      <div class="rank-info">
        <div class="rank-name">${m.name}</div>
        <div class="rank-stats">${fmt(m.paid)} · ${Math.round(m.pct)}%</div>
      </div>
      <div class="rank-bar-wrap"><div class="rank-bar" style="width:${m.pct}%"></div></div>
    </div>`;
  }).join('');
}

// =================== MEMBERS ===================
function renderMembers() {
  const search = (document.getElementById('member-search')?.value || '').toLowerCase();
  let members = data.members;
  if (search) members = members.filter(m => m.name.toLowerCase().includes(search) || (m.nick||'').toLowerCase().includes(search));
  const grid = document.getElementById('members-grid');

  if (!members.length) {
    grid.innerHTML = '<div class="empty-state full"><i class="fa-solid fa-users"></i><p>Belum ada anggota.</p></div>';
    return;
  }
  grid.innerHTML = members.map(m => {
    const [bg, fg] = memberColor(m.id);
    const savings = data.savings.filter(s => s.memberId === m.id).reduce((s, x) => s + x.amount, 0);
    return `<div class="member-card">
      <span class="member-badge ${m.status === 'active' ? 'badge-active' : 'badge-inactive'}">${m.status === 'active' ? 'Aktif' : 'Non-aktif'}</span>
      <div class="member-card-top">
        <div class="member-avatar" style="background:${bg};color:${fg};border-color:${bg}">${getInitials(m.name)}</div>
        <div>
          <div class="member-name">${m.name}</div>
          <div class="member-nick">${m.nick ? '@'+m.nick : ''}${m.class ? ' · '+m.class : ''}</div>
        </div>
      </div>
      <div class="member-info">
        <div class="member-info-item"><label>Bergabung</label><span>${m.joinDate || '-'}</span></div>
        <div class="member-info-item"><label>Tabungan</label><span style="color:var(--teal)">${fmt(savings)}</span></div>
        ${m.phone ? `<div class="member-info-item"><label>HP</label><span>${m.phone}</span></div>` : ''}
        ${m.notes ? `<div class="member-info-item"><label>Catatan</label><span>${m.notes.slice(0,30)}</span></div>` : ''}
      </div>
      <div class="member-actions">
        <button class="btn btn-ghost btn-sm" onclick="editMember('${m.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteMember('${m.id}')"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

function saveMember() {
  const name = document.getElementById('m-name').value.trim();
  if (!name) { showToast('Nama tidak boleh kosong!', 'error'); return; }
  const editId = document.getElementById('m-edit-id').value;
  const member = {
    id: editId || uid(),
    name,
    nick: document.getElementById('m-nick').value.trim(),
    class: document.getElementById('m-class').value.trim(),
    phone: document.getElementById('m-phone').value.trim(),
    joinDate: document.getElementById('m-join').value || today(),
    status: document.getElementById('m-status').value,
    notes: document.getElementById('m-notes').value.trim(),
  };
  let members = data.members;
  if (editId) { const idx = members.findIndex(m => m.id === editId); if (idx > -1) members[idx] = member; }
  else members.push(member);
  data.members = members;
  closeAllModals();
  clearMemberForm();
  renderMembers();
  updateMemberFilters();
  showToast(editId ? 'Anggota diperbarui!' : 'Anggota ditambahkan!', 'success');
}

function clearMemberForm() {
  ['m-name','m-nick','m-class','m-phone','m-notes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('m-join').value = today();
  document.getElementById('m-status').value = 'active';
  document.getElementById('m-edit-id').value = '';
}

function editMember(id) {
  const m = getMemberById(id);
  if (!m) return;
  document.getElementById('m-name').value = m.name;
  document.getElementById('m-nick').value = m.nick || '';
  document.getElementById('m-class').value = m.class || '';
  document.getElementById('m-phone').value = m.phone || '';
  document.getElementById('m-join').value = m.joinDate || today();
  document.getElementById('m-status').value = m.status || 'active';
  document.getElementById('m-notes').value = m.notes || '';
  document.getElementById('m-edit-id').value = id;
  openModal('modal-add-member');
}

function deleteMember(id) {
  if (!confirm('Hapus anggota ini?')) return;
  data.members = data.members.filter(m => m.id !== id);
  renderMembers();
  showToast('Anggota dihapus.', 'info');
}

function updateMemberFilters() {
  const members = data.members.filter(m => m.status === 'active');
  const filterSel = document.getElementById('savings-filter-member');
  if (filterSel) {
    filterSel.innerHTML = '<option value="">Semua Anggota</option>' +
      members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  }
}

// =================== SAVINGS ===================
function renderSavings() {
  updateMemberFilters();
  const filterMemberId = document.getElementById('savings-filter-member')?.value || '';
  let savings = data.savings;
  if (filterMemberId) savings = savings.filter(s => s.memberId === filterMemberId);
  savings = savings.slice().sort((a, b) => b.date.localeCompare(a.date));

  // Summary per member
  const members = data.members.filter(m => m.status === 'active');
  const summaryDiv = document.getElementById('savings-summary');
  summaryDiv.innerHTML = members.map(m => {
    const memberSavings = data.savings.filter(s => s.memberId === m.id);
    const total = memberSavings.reduce((s, x) => s + x.amount, 0);
    const count = memberSavings.length;
    const [bg, fg] = memberColor(m.id);
    return `<div class="saving-member-card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:28px;height:28px;border-radius:50%;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${getInitials(m.name)}</div>
        <div class="saving-member-name">${m.nick || m.name}</div>
      </div>
      <div class="saving-total">${fmt(total)}</div>
      <div class="saving-count">${count} transaksi</div>
    </div>`;
  }).join('') || '<div class="empty-state full"><i class="fa-solid fa-users"></i><p>Belum ada anggota.</p></div>';

  // Table
  const tbody = document.getElementById('savings-tbody');
  if (!savings.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fa-solid fa-inbox"></i><p>Belum ada tabungan</p></td></tr>'; return; }
  tbody.innerHTML = savings.map(s => `
    <tr>
      <td>${s.date}</td>
      <td>${getMemberName(s.memberId)}</td>
      <td class="amount-positive">${fmt(s.amount)}</td>
      <td>${s.note || '-'}</td>
      <td><button class="btn btn-danger btn-icon btn-sm" onclick="deleteSaving('${s.id}')"><i class="fa-solid fa-trash"></i></button></td>
    </tr>`).join('');
}

function saveSaving() {
  const memberId = document.getElementById('s-member').value;
  const amount = parseFloat(document.getElementById('s-amount').value);
  if (!memberId) { showToast('Pilih anggota!', 'error'); return; }
  if (!amount || amount <= 0) { showToast('Jumlah tidak valid!', 'error'); return; }
  const saving = {
    id: uid(),
    memberId,
    date: document.getElementById('s-date').value || today(),
    amount,
    note: document.getElementById('s-note').value.trim(),
  };
  data.savings = [saving, ...data.savings];
  addTransaction('saving', memberId, amount, saving.note);
  closeAllModals();
  document.getElementById('s-amount').value = '';
  document.getElementById('s-note').value = '';
  renderSavings();
  playPaymentSound();
  triggerConfetti();
  showToast(`Tabungan ${fmt(amount)} berhasil!`, 'success');
}

function deleteSaving(id) {
  if (!confirm('Hapus tabungan ini?')) return;
  data.savings = data.savings.filter(s => s.id !== id);
  renderSavings();
}

// =================== KAS ===================
function renderKas() {
  const settings = data.kasSettings;
  const infoBar = document.getElementById('kas-info-bar');
  const freqLabel = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' }[settings.freq] || '-';
  infoBar.innerHTML = `
    <div class="kas-info-card"><span class="kas-info-label">Periode</span><span class="kas-info-val" style="color:var(--gold)">${settings.period}</span></div>
    <div class="kas-info-card"><span class="kas-info-label">Iuran</span><span class="kas-info-val" style="color:var(--teal)">${fmt(settings.amount)} / ${freqLabel}</span></div>
    <div class="kas-info-card"><span class="kas-info-label">Total Terkumpul</span><span class="kas-info-val" style="color:var(--blue)">${fmt(data.kasPayments.reduce((s,x)=>s+x.amount,0))}</span></div>
    <div class="kas-info-card"><span class="kas-info-label">Total Tagihan</span><span class="kas-info-val" style="color:var(--red)">${fmt(data.kasTagihan.reduce((s,x)=>s+x.amount,0))}</span></div>
  `;

  const members = data.members.filter(m => m.status === 'active');
  const tbody = document.getElementById('kas-tbody');
  if (!members.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Belum ada anggota aktif</td></tr>'; return; }

  tbody.innerHTML = members.map(m => {
    const tagihan = data.kasTagihan.filter(t => t.memberId === m.id).reduce((s, x) => s + x.amount, 0);
    const paid = data.kasPayments.filter(k => k.memberId === m.id).reduce((s, x) => s + x.amount, 0);
    const sisa = Math.max(0, tagihan - paid);
    const lastPay = data.kasPayments.filter(k => k.memberId === m.id).sort((a,b) => b.date.localeCompare(a.date))[0];
    let status, badgeCls;
    if (sisa === 0 && tagihan > 0) { status = 'Lunas'; badgeCls = 'status-paid'; }
    else if (paid > 0 && sisa > 0) { status = 'Sebagian'; badgeCls = 'status-partial'; }
    else if (tagihan === 0) { status = 'Belum Ada Tagihan'; badgeCls = 'status-partial'; }
    else { status = 'Belum Bayar'; badgeCls = 'status-unpaid'; }
    const pct = tagihan > 0 ? Math.min(100, (paid / tagihan) * 100) : 0;
    return `<tr>
      <td><strong>${m.name}</strong>${m.nick ? '<br><small style="color:var(--text-muted)">@'+m.nick+'</small>' : ''}</td>
      <td>${fmt(tagihan)}</td>
      <td class="amount-positive">${fmt(paid)}</td>
      <td class="${sisa > 0 ? 'amount-negative' : 'amount-positive'}">${fmt(sisa)}</td>
      <td>${lastPay ? lastPay.date : '-'}</td>
      <td><span class="status-pill ${badgeCls}">${status}</span><br><div class="progress-mini mt-1"><div class="progress-mini-fill" style="width:${pct}%"></div></div></td>
      <td>
        <button class="btn btn-gold btn-sm" onclick="quickBayarKas('${m.id}')"><i class="fa-solid fa-money-bill"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function saveKasSettings() {
  const settings = {
    period: document.getElementById('ks-period').value || 'Semester 1',
    amount: parseFloat(document.getElementById('ks-amount').value) || 10000,
    freq: document.getElementById('ks-freq').value,
    start: document.getElementById('ks-start').value,
    end: document.getElementById('ks-end').value,
  };
  data.kasSettings = settings;
  closeAllModals();
  renderKas();
  showToast('Pengaturan kas disimpan!', 'success');
}

function bayarKas() {
  const memberId = document.getElementById('bk-member').value;
  const amount = parseFloat(document.getElementById('bk-amount').value);
  if (!memberId) { showToast('Pilih anggota!', 'error'); return; }
  if (!amount || amount <= 0) { showToast('Jumlah tidak valid!', 'error'); return; }
  const payment = { id: uid(), memberId, amount, date: document.getElementById('bk-date').value || today(), note: document.getElementById('bk-note').value.trim() };
  data.kasPayments = [payment, ...data.kasPayments];
  addTransaction('kas', memberId, amount, payment.note);
  closeAllModals();
  document.getElementById('bk-amount').value = '';
  renderKas();
  playPaymentSound();
  triggerConfetti();
  showToast(`Kas ${fmt(amount)} berhasil dibayar! 🎉`, 'success');
}

function quickBayarKas(memberId) {
  document.getElementById('bk-member').value = '';
  openModal('modal-bayar-kas');
  setTimeout(() => { document.getElementById('bk-member').value = memberId; }, 50);
}

function tambahTagihan() {
  const memberId = document.getElementById('tag-member').value;
  const amount = parseFloat(document.getElementById('tag-amount').value);
  if (!memberId) { showToast('Pilih anggota!', 'error'); return; }
  if (!amount || amount <= 0) { showToast('Jumlah tidak valid!', 'error'); return; }
  const tagihan = { id: uid(), memberId, amount, note: document.getElementById('tag-note').value.trim(), date: today() };
  data.kasTagihan = [tagihan, ...data.kasTagihan];
  closeAllModals();
  document.getElementById('tag-amount').value = '';
  renderKas();
  showToast('Tagihan ditambahkan!', 'success');
}

// =================== DEBTS ===================
function renderDebts() {
  const debts = data.debts;
  const tbody = document.getElementById('debt-tbody');
  if (!debts.length) { tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Belum ada catatan hutang</p></div></td></tr>'; return; }
  tbody.innerHTML = debts.map(d => {
    const paid = d.paid || 0;
    const sisa = d.amount - paid;
    let status, badgeCls;
    const isOverdue = d.deadline && d.deadline < today() && sisa > 0;
    if (sisa <= 0) { status = 'Lunas'; badgeCls = 'status-paid'; }
    else if (isOverdue) { status = 'Melewati Batas'; badgeCls = 'status-overdue'; }
    else if (paid > 0) { status = 'Sebagian'; badgeCls = 'status-partial'; }
    else { status = 'Belum Bayar'; badgeCls = 'status-unpaid'; }
    return `<tr>
      <td><strong>${getMemberName(d.memberId)}</strong></td>
      <td>${d.reason}</td>
      <td class="amount-gold">${fmt(d.amount)}</td>
      <td class="amount-positive">${fmt(paid)}</td>
      <td class="${sisa > 0 ? 'amount-negative' : 'amount-positive'}">${fmt(sisa)}</td>
      <td>${d.deadline || '-'}</td>
      <td><span class="status-pill ${badgeCls}">${status}</span></td>
      <td style="display:flex;gap:6px">
        ${sisa > 0 ? `<button class="btn btn-gold btn-icon btn-sm" onclick="openPayDebt('${d.id}')"><i class="fa-solid fa-money-bill"></i></button>` : ''}
        <button class="btn btn-danger btn-icon btn-sm" onclick="deleteDebt('${d.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function saveDebt() {
  const memberId = document.getElementById('d-member').value;
  const amount = parseFloat(document.getElementById('d-amount').value);
  if (!memberId) { showToast('Pilih anggota!', 'error'); return; }
  if (!amount || amount <= 0) { showToast('Jumlah tidak valid!', 'error'); return; }
  const debt = {
    id: uid(), memberId, amount, paid: 0,
    reason: document.getElementById('d-reason').value.trim() || 'Hutang',
    deadline: document.getElementById('d-deadline').value,
    notes: document.getElementById('d-notes').value.trim(),
    date: today(),
  };
  data.debts = [debt, ...data.debts];
  addTransaction('debt', memberId, amount, debt.reason);
  closeAllModals();
  renderDebts();
  showToast('Hutang dicatat!', 'info');
}

function openPayDebt(debtId) {
  document.getElementById('pd-debt-id').value = debtId;
  document.getElementById('pd-amount').value = '';
  document.getElementById('pd-date').value = today();
  openModal('modal-pay-debt');
}

function payDebt() {
  const debtId = document.getElementById('pd-debt-id').value;
  const amount = parseFloat(document.getElementById('pd-amount').value);
  if (!amount || amount <= 0) { showToast('Jumlah tidak valid!', 'error'); return; }
  const debts = data.debts;
  const idx = debts.findIndex(d => d.id === debtId);
  if (idx < 0) return;
  debts[idx].paid = (debts[idx].paid || 0) + amount;
  data.debts = debts;
  addTransaction('pay_debt', debts[idx].memberId, amount, 'Bayar ' + debts[idx].reason);
  closeAllModals();
  renderDebts();
  playPaymentSound();
  showToast(`Pembayaran ${fmt(amount)} berhasil!`, 'success');
}

function deleteDebt(id) {
  if (!confirm('Hapus catatan hutang ini?')) return;
  data.debts = data.debts.filter(d => d.id !== id);
  renderDebts();
}

// =================== INCOME ===================
function renderIncome() {
  const incomes = data.income.slice().sort((a, b) => b.date.localeCompare(a.date));
  const totalIncome = incomes.reduce((s, x) => s + x.amount, 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyIncome = incomes.filter(i => i.date.startsWith(thisMonth)).reduce((s, x) => s + x.amount, 0);
  const statsDiv = document.getElementById('income-stats');
  statsDiv.innerHTML = `
    <div class="income-stat-card"><span class="income-stat-label">Total Pemasukan</span><span class="income-stat-val">${fmt(totalIncome)}</span></div>
    <div class="income-stat-card"><span class="income-stat-label">Bulan Ini</span><span class="income-stat-val" style="color:var(--teal)">${fmt(monthlyIncome)}</span></div>
    <div class="income-stat-card"><span class="income-stat-label">Jumlah Entri</span><span class="income-stat-val" style="color:var(--gold)">${incomes.length}</span></div>
  `;
  const tbody = document.getElementById('income-tbody');
  if (!incomes.length) { tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Belum ada pemasukan</p></div></td></tr>'; return; }
  tbody.innerHTML = incomes.map(i => `
    <tr>
      <td>${i.date}</td>
      <td><span class="status-pill badge-income">${i.source || '-'}</span></td>
      <td>${i.desc || '-'}</td>
      <td class="amount-positive">${fmt(i.amount)}</td>
      <td><button class="btn btn-danger btn-icon btn-sm" onclick="deleteIncome('${i.id}')"><i class="fa-solid fa-trash"></i></button></td>
    </tr>`).join('');
}

function saveIncome() {
  const amount = parseFloat(document.getElementById('i-amount').value);
  if (!amount || amount <= 0) { showToast('Jumlah tidak valid!', 'error'); return; }
  const inc = {
    id: uid(), amount,
    date: document.getElementById('i-date').value || today(),
    source: document.getElementById('i-source').value.trim() || 'Lainnya',
    desc: document.getElementById('i-desc').value.trim(),
  };
  data.income = [inc, ...data.income];
  addTransaction('income', null, amount, inc.source);
  closeAllModals();
  renderIncome();
  showToast('Pemasukan dicatat!', 'success');
}

function deleteIncome(id) {
  if (!confirm('Hapus pemasukan ini?')) return;
  data.income = data.income.filter(i => i.id !== id);
  renderIncome();
}

// =================== STATS ===================
let chartInstances = {};
function destroyChart(id) { if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } }

function renderStats() {
  renderKasChart();
  renderSavingsChart();
  renderRankingChart();
  renderMonthlyChart();
}

function renderKasChart() {
  destroyChart('chart-kas');
  const members = data.members.filter(m => m.status === 'active').slice(0, 8);
  const labels = members.map(m => m.nick || m.name.split(' ')[0]);
  const values = members.map(m => {
    const tagihan = data.kasTagihan.filter(t => t.memberId === m.id).reduce((s, x) => s + x.amount, 0);
    const paid = data.kasPayments.filter(k => k.memberId === m.id).reduce((s, x) => s + x.amount, 0);
    return { paid, sisa: Math.max(0, tagihan - paid) };
  });
  const ctx = document.getElementById('chart-kas').getContext('2d');
  chartInstances['chart-kas'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Sudah Bayar', data: values.map(v => v.paid), backgroundColor: 'rgba(0,212,170,0.6)', borderColor: '#00D4AA', borderWidth: 1, borderRadius: 4 },
        { label: 'Sisa', data: values.map(v => v.sisa), backgroundColor: 'rgba(255,87,87,0.4)', borderColor: '#FF5757', borderWidth: 1, borderRadius: 4 },
      ],
    },
    options: chartOptions('Pembayaran Kas per Anggota'),
  });
}

function renderSavingsChart() {
  destroyChart('chart-savings');
  // Group by month
  const byMonth = {};
  data.savings.forEach(s => {
    const m = s.date.slice(0, 7);
    byMonth[m] = (byMonth[m] || 0) + s.amount;
  });
  const months = Object.keys(byMonth).sort().slice(-6);
  const ctx = document.getElementById('chart-savings').getContext('2d');
  chartInstances['chart-savings'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months.map(m => { const d = new Date(m+'-01'); return d.toLocaleString('id-ID', {month:'short', year:'2-digit'}); }),
      datasets: [{
        label: 'Total Tabungan', data: months.map(m => byMonth[m]),
        borderColor: '#F5C842', backgroundColor: 'rgba(245,200,66,0.1)',
        tension: 0.4, fill: true, pointBackgroundColor: '#F5C842',
      }],
    },
    options: chartOptions('Pertumbuhan Tabungan Bulanan'),
  });
}

function renderRankingChart() {
  const members = data.members.filter(m => m.status === 'active');
  const ranked = members.map(m => {
    const tagihan = data.kasTagihan.filter(t => t.memberId === m.id).reduce((s, x) => s + x.amount, 0);
    const paid = data.kasPayments.filter(k => k.memberId === m.id).reduce((s, x) => s + x.amount, 0);
    const pct = tagihan > 0 ? Math.min(100, Math.round((paid / tagihan) * 100)) : 0;
    return { name: m.nick || m.name.split(' ')[0], pct, id: m.id };
  }).sort((a, b) => b.pct - a.pct).slice(0, 7);
  const container = document.getElementById('chart-ranking');
  container.innerHTML = ranked.map(r => {
    const [bg] = memberColor(r.id);
    return `<div class="cr-item">
      <div class="cr-name">${r.name}</div>
      <div class="cr-bar-wrap"><div class="cr-bar" style="width:${r.pct}%;background:${bg}"></div></div>
      <div class="cr-pct">${r.pct}%</div>
    </div>`;
  }).join('') || '<div class="empty-state"><p>Belum ada data</p></div>';
}

function renderMonthlyChart() {
  destroyChart('chart-monthly');
  const months = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(dt.toISOString().slice(0, 7));
  }
  const kasData = months.map(m => data.kasPayments.filter(k => k.date.startsWith(m)).reduce((s, x) => s + x.amount, 0));
  const savingData = months.map(m => data.savings.filter(s => s.date.startsWith(m)).reduce((s, x) => s + x.amount, 0));
  const incomeData = months.map(m => data.income.filter(i => i.date.startsWith(m)).reduce((s, x) => s + x.amount, 0));
  const ctx = document.getElementById('chart-monthly').getContext('2d');
  chartInstances['chart-monthly'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months.map(m => { const dt = new Date(m+'-01'); return dt.toLocaleString('id-ID', {month:'short'}); }),
      datasets: [
        { label: 'Kas', data: kasData, backgroundColor: 'rgba(245,200,66,0.7)', borderRadius: 4 },
        { label: 'Tabungan', data: savingData, backgroundColor: 'rgba(0,212,170,0.6)', borderRadius: 4 },
        { label: 'Pemasukan Lain', data: incomeData, backgroundColor: 'rgba(77,159,255,0.6)', borderRadius: 4 },
      ],
    },
    options: chartOptions('Ringkasan 6 Bulan Terakhir'),
  });
}

function chartOptions(title) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#7A8299', font: { size: 11 } } },
      tooltip: { backgroundColor: 'rgba(14,20,36,0.95)', borderColor: 'rgba(245,200,66,0.3)', borderWidth: 1, titleColor: '#E8EAF0', bodyColor: '#7A8299', callbacks: { label: ctx => ' ' + fmt(ctx.parsed.y) } },
    },
    scales: {
      x: { ticks: { color: '#7A8299', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { ticks: { color: '#7A8299', font: { size: 11 }, callback: v => 'Rp' + (v/1000).toFixed(0)+'k' }, grid: { color: 'rgba(255,255,255,0.06)' } },
    },
  };
}

// =================== PYRAMID PAGE ===================
function renderPyramid() {
  const lvl = getCurrentLevel();
  const prog = getLevelProgress();
  const bigWrap = document.getElementById('pyramid-big');
  bigWrap.innerHTML = `
    <div style="text-align:center;width:100%">
      ${buildPyramidSVG(lvl, false)}
      <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:28px;color:${PYRAMID_LEVELS[lvl].color};margin-top:8px">${PYRAMID_LEVELS[lvl].name}</div>
      <div style="font-size:13px;color:var(--text-muted);margin-top:4px">${data.xp} XP terkumpul</div>
      <div style="width:80%;margin:12px auto;height:8px;background:rgba(255,255,255,0.08);border-radius:10px;overflow:hidden">
        <div style="height:100%;width:${prog.pct}%;background:linear-gradient(90deg,${PYRAMID_LEVELS[lvl].color}88,${PYRAMID_LEVELS[lvl].color});border-radius:10px;transition:width 0.6s"></div>
      </div>
    </div>`;
  const levelCards = document.getElementById('level-cards');
  levelCards.innerHTML = PYRAMID_LEVELS.map((lv, i) => {
    const isCurrentLvl = i === lvl;
    const isUnlocked = i <= lvl;
    return `<div class="level-card ${isCurrentLvl ? 'current' : ''} ${isUnlocked ? 'unlocked' : 'locked'}">
      <div class="level-icon" style="background:${lv.color}22;font-size:22px">${lv.icon}</div>
      <div>
        <div class="level-name" style="color:${lv.color}">${lv.name}</div>
        <div class="level-req">${lv.xp === 0 ? 'Level awal' : `${lv.xp} transaksi`}${isCurrentLvl ? ' · Level saat ini' : ''}</div>
      </div>
      ${isCurrentLvl ? '<span class="status-pill badge-kas" style="margin-left:auto">Aktif</span>' : ''}
      ${isUnlocked && !isCurrentLvl ? '<i class="fa-solid fa-check" style="margin-left:auto;color:var(--teal)"></i>' : ''}
      ${!isUnlocked ? '<i class="fa-solid fa-lock" style="margin-left:auto;color:var(--text-dim)"></i>' : ''}
    </div>`;
  }).join('');
}

// =================== QUICK PAY ============
function setQTab(tab, btn) {
  document.querySelectorAll('.qtab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('qt-kas').style.display = tab === 'kas' ? '' : 'none';
  document.getElementById('qt-saving').style.display = tab === 'saving' ? '' : 'none';
  document.getElementById('qt-kas').dataset.active = tab === 'kas' ? '1' : '';
}

function quickPay() {
  const kasActive = document.getElementById('qt-kas').dataset.active !== '';
  if (kasActive) {
    const memberId = document.getElementById('qt-kas-member').value;
    const amount = parseFloat(document.getElementById('qt-kas-amount').value);
    if (!memberId || !amount) { showToast('Isi semua field!', 'error'); return; }
    const payment = { id: uid(), memberId, amount, date: today(), note: 'Quick pay' };
    data.kasPayments = [payment, ...data.kasPayments];
    addTransaction('kas', memberId, amount, 'Quick pay');
  } else {
    const memberId = document.getElementById('qt-save-member').value;
    const amount = parseFloat(document.getElementById('qt-save-amount').value);
    if (!memberId || !amount) { showToast('Isi semua field!', 'error'); return; }
    const saving = { id: uid(), memberId, amount, date: today(), note: 'Quick save' };
    data.savings = [saving, ...data.savings];
    addTransaction('saving', memberId, amount, 'Quick save');
  }
  closeAllModals();
  playPaymentSound();
  triggerConfetti();
  renderDashboard();
  showToast('Transaksi berhasil! 🎉', 'success');
}

// =================== SOUND ===================
function playPaymentSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

// =================== CONFETTI ===================
function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const particles = Array.from({length: 60}, () => ({
    x: Math.random() * canvas.width, y: -10,
    w: Math.random() * 8 + 4, h: Math.random() * 4 + 2,
    color: ['#F5C842','#00D4AA','#4D9FFF','#A855F7','#FF7043'][Math.floor(Math.random()*5)],
    vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 2,
    rot: Math.random() * 360, rotV: (Math.random()-0.5)*8,
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotV;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI/180);
      ctx.fillStyle = p.color; ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h); ctx.restore();
    });
    if (++frame < 80) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}

// =================== TOAST ===================
let toastTimer;
function showToast(msg, type = 'success') {
  clearTimeout(toastTimer);
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const t = document.getElementById('toast');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa-solid ${icons[type] || 'fa-circle-check'}"></i> ${msg}`;
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// =================== EXPORT CSV ===================
function exportCSV() {
  const rows = [['Tanggal','Tipe','Anggota','Jumlah','Catatan']];
  data.transactions.forEach(tx => {
    rows.push([tx.date, tx.type, getMemberName(tx.memberId), tx.amount, tx.note || '']);
  });
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `angkatanku-export-${today()}.csv`; a.click();
  showToast('Exported!', 'success');
}

// =================== MOBILE SIDEBAR ===================
function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.remove('open');
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) overlay.classList.remove('active');
}

document.getElementById('menuBtn').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');
  let overlay = document.getElementById('sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    overlay.onclick = closeSidebar;
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('active', sidebar.classList.contains('open'));
});

// =================== START APP ===================
document.addEventListener('DOMContentLoaded', () => {

  // nav click
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigate(item.dataset.page);
    });
  });

  // menu mobile
  const menuBtn = document.getElementById('menuBtn');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      if (!sidebar) return;

      sidebar.classList.toggle('open');

      let overlay = document.getElementById('sidebar-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.className = 'sidebar-overlay';
        overlay.onclick = closeSidebar;
        document.body.appendChild(overlay);
      }

      overlay.classList.toggle('active', sidebar.classList.contains('open'));
    });
  }

  // start page
  navigate('dashboard');
});
