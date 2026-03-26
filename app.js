// ── CONFIG ──
var API_URL = 'https://script.google.com/macros/s/AKfycbzxtCn0ZIP_H5THV63naGJbmOhuKTyEcVvk4l4k0Hmz71luTiENikFPLQ69tJmgdq1c/exec';
var DASHBOARD_PASSWORD = 'joyjoyjoy';
var isAuthenticated = localStorage.getItem('drsti_auth') === 'true';
var POLL_INTERVAL = 45000;
var pollTimer = null;
var toastTimer = null;

// ── STATE ──
var state = {
  applicants: [],
  inventory: [],
  activityLog: [],
  lastFetch: null,
  activeFilters: [],
  sortBy: 'newest',
  expandedCards: {},
  searchQuery: '',
  dirtyCards: {},
  activeRow: null
};

// ── CONSTANTS ──
var STATUSES = [
  'Applied',
  'Hard Yes','Needs Call','Call Scheduled','Waitlist',
  'Offer Sent','Ghosted',
  'Deposit Paid','Payment Plan','Paid in Full',
  'Offer Expired','Not Aligned','Maybe Next Year','No Longer Interested','Cancelled'
];

var STATUS_COLORS = {
  'Applied':              {bg:'#cfe2f3',fg:'#1155cc'},
  'Hard Yes':             {bg:'#b6d7a8',fg:'#274e13'},
  'Needs Call':           {bg:'#d9ead3',fg:'#38761d'},
  'Call Scheduled':       {bg:'#93c47d',fg:'#274e13'},
  'Waitlist':             {bg:'#fff2cc',fg:'#7f6003'},
  'Offer Sent':           {bg:'#b4d7d7',fg:'#0e6251'},
  'Ghosted':              {bg:'#d9d9d9',fg:'#666666'},
  'Deposit Paid':         {bg:'#a2d9ce',fg:'#0e6251'},
  'Payment Plan':         {bg:'#76d7c4',fg:'#0e6251'},
  'Paid in Full':         {bg:'#45b39d',fg:'#ffffff'},
  'Offer Expired':        {bg:'#fce5cd',fg:'#7f6003'},
  'Not Aligned':          {bg:'#f4cccc',fg:'#990000'},
  'Maybe Next Year':      {bg:'#fce5cd',fg:'#783f04'},
  'No Longer Interested': {bg:'#e6b8af',fg:'#85200c'},
  'Cancelled':            {bg:'#ea9999',fg:'#990000'}
};

var PRICE_TYPES = ['','Payment Plan','Pay Full','EB Plan','EB Full'];

var ACCOM_PRICES = {
  'Triple': { plan: 2850, full: 2555, eb_plan: 2565, eb_full: 2220 },
  'Double': { plan: 3240, full: 2888, eb_plan: 2910, eb_full: 2555 },
  'Glamping': { plan: 3690, full: 3690, eb_plan: 3330, eb_full: 2999 }
};
var DEPOSIT_AMOUNT = 350;
var PRICE_TYPE_MAP = {
  'Payment Plan': 'plan',
  'Pay Full': 'full',
  'EB Plan': 'eb_plan',
  'EB Full': 'eb_full'
};
var CONFIRMED_STATUSES = ['Deposit Paid', 'Payment Plan', 'Paid in Full'];
var MAX_PARTICIPANTS = 14;
var ADDON_DEFS = [
  { key: 'Bodywork', label: 'Bodywork', price: 135 },
  { key: 'Healing', label: 'Healing Session', price: 108 },
  { key: 'Photoshoot', label: 'Photoshoot', price: 444 },
  { key: 'Coaching', label: 'Coaching Package', price: 2222 }
];
var SMART_FILTERS = [
  { id: 'smart-paid', label: 'Paid' },
  { id: 'smart-offer-sent', label: 'Offer Sent' },
  { id: 'smart-needs-email', label: 'Needs Email' },
  { id: 'smart-addons', label: 'Has Add-ons' },
  { id: 'smart-waitlist', label: 'Waitlist' }
];

// ── EMAIL TEMPLATES (mirrors emailTemplates.gs) ──
var EMAIL_TEMPLATES_JS = {
  'hard-yes': {
    subject: 'About your Course application \ud83d\ude4f\ud83c\udffb\ud83e\udd73',
    body: '{{first_name}},\n\nWe\'ve finished reviewing applications \u2014 and yours stood out.\n\nWe don\'t extend this invitation to everyone, so we wanted to reach out directly: we\'d love to hold a spot for you in {{country}} this {{retreat_month}}.\n\nBy now you may have also received a short video from Gabi (or will be receiving one shortly). That\'s her way of saying the same thing \u2014 we mean it personally, not just on paper.\n\n**Here\'s how to make it official:**\n\nA {{deposit_amount}} deposit secures your place. It counts toward your total, and the remaining balance is due within **10 days** of your deposit.\n\n\ud83d\udc49 [Reserve my spot \u2192]({{deposit_link}})\n\nWe\'re holding this for you for **5 days**. After that we\'ll need to release it to the waitlist \u2014 there are only {{open_spots}} spots total and several are already spoken for.\n\n---\n\n\n{{payment_summary}}\n\n---\n\nOnce your payment is confirmed, we\'ll send you everything you need to get ready \u2014 flight details and arrival instructions, an invite to our private group, recommended reading, and a few special surprises. \ud83c\udf81\n\nWe\'d love to talk it through before you commit \u2014 even just 20 minutes makes a big difference. Book a free call with Gabi and Ethan here:\n\n\ud83d\udcde [Schedule a call \u2192]({{cal_link}})\n\nWe hope to see you in {{country}}. \ud83c\udf3f\n\nWith love,\nEthan & Gabi \u0950\n\n*{{retreat_name}} \u00b7 {{retreat_dates}} \u00b7 {{venue_name}}, {{city}}, {{country}}*\n*Questions? Just reply to this email.*'
  },
  'needs-call': {
    subject: 'About your Course application \ud83d\ude4f\ud83c\udffb',
    body: '{{first_name}},\n\nThank you for applying to *{{retreat_name}}*. We\'ve read through your application carefully and we\'d love to connect before moving forward.\n\nThere\'s nothing to be concerned about \ud83d\ude0c \u2014 we simply find that a short conversation makes all the difference. It lets us answer your questions, understand where you are on your path, and make sure *The Course* is the right fit for this moment in your life.\n\n**We\'d love to book a free 20-minute call with Gabi and Ethan:**\n\n\ud83d\udcde [Choose a time \u2192]({{cal_link}})\n\nSpots for {{country}} are filling up, so we\'d love to connect with you this week if possible.\n\nIn the meantime, if anything comes to mind \u2014 questions about the schedule, the food, what to expect \u2014 just reply here. We\'re real people on the other end of this email and genuinely happy to help.\n\nWith love,\nEthan & Gabi \u0950\n\n*{{retreat_name}} \u00b7 {{retreat_dates}} \u00b7 {{venue_name}}, {{city}}, {{country}}*'
  },
  'waitlist': {
    subject: 'Hey, about your Course application \ud83d\ude4f\ud83c\udffb',
    body: '{{first_name}},\n\nThank you so much for applying to *{{retreat_name}}*. It means a lot that you felt called to reach out.\n\nWe\'ve reviewed your application and at this stage, the remaining spots have been offered to applicants a little further along in the process. We\'d love to place you on the waitlist for {{country}} \u2014 spots do open up, and when they do, waitlisted applicants are the first to know.\n\nWe\'ll be in touch the moment anything changes. \ud83c\udf3f\n\nIf you\'d prefer not to stay on the waitlist, just reply to this email and let us know \u2014 no problem at all, no explanation needed. Otherwise, consider yourself held.\n\nWith love,\nEthan & Gabi \u0950\n\n*{{retreat_name}} \u00b7 {{retreat_dates}} \u00b7 {{venue_name}}, {{city}}, {{country}}*\n*Questions? Just reply to this email.*'
  },
  'not-aligned': {
    subject: 'Your Course application \ud83d\ude4f\ud83c\udffb',
    body: '{{first_name}},\n\nThank you for the time and honesty you put into your application.\n\nAfter careful reflection, we don\'t feel that *The Course* is the right fit right now. This isn\'t a judgement of your path or your readiness \u2014 it\'s simply our honest sense that the timing or the container may not be what serves you most in this moment.\n\nThe fact that you\'re asking deep questions, that you\'re seeking something real \u2014 that matters. That impulse will take you far.\n\nWe wish you every grace on the journey ahead. \ud83c\udf3f\n\nWith love,\nEthan & Gabi \u0950\n\n*{{retreat_name}} \u00b7 {{retreat_dates}} \u00b7 {{venue_name}}, {{city}}, {{country}}*'
  },
  'ghost-1': {
    subject: 'Just checking in \ud83d\ude4f\ud83c\udffb',
    body: 'Hey {{first_name}},\n\nWe reached out recently about your spot in {{country}} and just wanted to make sure our message landed.\n\nIf you\'re still thinking it over \u2014 no rush at all. We know this kind of decision deserves space.\n\nIf you\'re ready, a {{deposit_amount}} deposit is all it takes to hold your place:\n\n\ud83d\udc49 [Reserve my spot \u2192]({{deposit_link}})\n\nEither way, we\'d love to hear from you. Just hit reply. \ud83c\udf3f\n\nWith love,\nEthan & Gabi \u0950'
  },
  'ghost-2': {
    subject: 'Still thinking it over?',
    body: 'Hey {{first_name}},\n\nWe know big decisions take time, and *{{retreat_name}}* is not a small thing \u2014 it\'s 10 days that can genuinely shift the direction of your life.\n\nIf you have questions or hesitations, we get it. Here are the most common ones we hear:\n\n- *"Can I really take 10 days off?"* \u2014 Most people say this was the best thing they\'ve done for themselves in years.\n- *"I\'m not experienced enough"* \u2014 We welcome complete beginners. You\'ll be supported every step.\n- *"It\'s a big investment"* \u2014 We offer flexible payment plans to make it accessible.\n\nIf a quick call would help, Gabi and Ethan would love to connect:\n\n\ud83d\udcde [Book a free call \u2192]({{cal_link}})\n\nNo pressure \u2014 just clarity. \ud83c\udf3f\n\nWith love,\nEthan & Gabi \u0950'
  },
  'ghost-3': {
    subject: 'Your spot is almost gone',
    body: 'Hey {{first_name}},\n\nJust a quick update \u2014 we\'re down to **{{open_spots}} spots** for *{{retreat_name}}* in {{country}}, and your place is still being held.\n\nWe don\'t want you to miss this if it\'s meant for you.\n\nA {{deposit_amount}} deposit secures your spot. It counts toward your total, and we offer flexible payment plans:\n\n\ud83d\udc49 [Reserve my spot \u2192]({{deposit_link}})\n\nIf now isn\'t the right time, no worries at all \u2014 we\'d just love to hear from you either way so we can plan accordingly.\n\nWith love,\nEthan & Gabi \u0950'
  },
  'ghost-4': {
    subject: 'Last call \ud83c\udf3f',
    body: 'Hey {{first_name}},\n\nThis is the last time we\'ll reach out about your spot for *{{retreat_name}}* in {{country}}.\n\nWe\'ve been holding space for you, but we\'ll need to release it to someone on the waitlist soon.\n\nIf you\'re in \u2014 a {{deposit_amount}} deposit is all it takes:\n\n\ud83d\udc49 [Reserve my spot \u2192]({{deposit_link}})\n\nIf the timing isn\'t right, we completely understand. No pressure, no hard feelings. We\'re grateful you applied, and the door is always open for a future retreat.\n\nWishing you all the best on your path. \ud83d\ude4f\ud83c\udffb\n\nWith love,\nEthan & Gabi \u0950'
  },
  'deposit-reminder-1': {
    subject: 'Your spot is held for a few more days \ud83d\ude4f\ud83c\udffb',
    body: 'Hey {{first_name}},\n\nJust a friendly reminder \u2014 your spot for *{{retreat_name}}* in {{country}} is still being held for you.\n\nA {{deposit_amount}} deposit is all it takes to make it official:\n\n\ud83d\udc49 [Secure my spot \u2192]({{deposit_link}})\n\nIf you have any questions or need to chat, just reply here or book a call:\n\n\ud83d\udcde [Schedule a call \u2192]({{cal_link}})\n\nWe\'d love to have you with us. \ud83c\udf3f\n\nWith love,\nEthan & Gabi \u0950'
  },
  'deposit-reminder-2': {
    subject: 'Final reminder \u2014 we need to release your spot',
    body: 'Hey {{first_name}},\n\nWe\'ve been holding a spot for you for *{{retreat_name}}* in {{country}}, but we\'ll need to release it soon to accommodate folks on the waitlist.\n\nIf you\'d like to join us, now is the time:\n\n\ud83d\udc49 [Secure my spot \u2192]({{deposit_link}})\n\nIf the timing isn\'t right, we totally understand \u2014 just let us know and we\'ll release your spot with love.\n\nEither way, we\'re grateful you applied. \ud83d\ude4f\ud83c\udffb\n\nWith love,\nEthan & Gabi \u0950'
  },
  'payment-reminder': {
    subject: 'Upcoming payment reminder \ud83d\ude4f\ud83c\udffb',
    body: 'Hey {{first_name}},\n\nJust a quick heads-up \u2014 your next instalment for *{{retreat_name}}* is coming up in a few days.\n\nIf you\'ve already taken care of it, please disregard this message. \ud83d\ude4f\ud83c\udffb\n\nIf you have any questions about your payment or need to make arrangements, just reply to this email and we\'ll work it out together.\n\nWe\'re so excited to have you join us in {{country}}! \ud83c\udf3f\n\nWith love,\nEthan & Gabi \u0950'
  },
  'waitlist-spot-open': {
    subject: 'A spot just opened, {{first_name}} \ud83c\udf3f',
    body: 'Hey {{first_name}},\n\nGreat news \u2014 a spot just opened up for *{{retreat_name}}* in {{country}}.\n\nYou were next on the waitlist, so we wanted to reach out right away.\n\nThe first person to secure their deposit gets the spot. If this is your moment, we\'d love to help you make it happen.\n\n\ud83d\udcde [Book a call with Ethan & Gabi \u2192]({{cal_link}})\n\nIf you\'d like to go ahead right away, we can send you a deposit link \u2014 just reply to this email.\n\nWe hope to see you in {{country}}. \ud83d\ude4f\ud83c\udffb\n\nWith love,\nEthan & Gabi \u0950'
  },
  'waitlist-spot-filled': {
    subject: 'Update on the open spot \ud83d\ude4f\ud83c\udffb',
    body: 'Hey {{first_name}},\n\nWe wanted to let you know \u2014 the spot that opened up for *{{retreat_name}}* in {{country}} has been filled.\n\nBut you\'re still first in line if another one opens up. We\'ll reach out the moment it does.\n\nIn the meantime, if you\'d like to chat about future retreats or have any questions, just reply here.\n\nWith love,\nEthan & Gabi \u0950'
  }
};

// ── RETREATS (loaded from API) ──
var RETREATS = {};
var RETREAT_IDS = [];
var RETREAT_META = {}; // keyed by retreatId: { config, accommodations, addons, priceTypes }
var activeRetreat = localStorage.getItem('drsti_active_retreat') || '';

function getAccommodations() {
  var meta = RETREAT_META[activeRetreat];
  if (meta && meta.accommodations && meta.accommodations.length > 0) {
    return meta.accommodations.map(function(x) { return x.name; });
  }
  return ['Triple','Double','Glamping'];
}

async function loadRetreats() {
  var data = await apiGet('getRetreats');
  if (data && data.ok && data.retreats && data.retreats.length > 0) {
    RETREATS = {};
    RETREAT_IDS = [];
    for (var i = 0; i < data.retreats.length; i++) {
      var r = data.retreats[i];
      RETREATS[r.retreatId] = { label: r.label, retreatId: r.retreatId };
      RETREAT_IDS.push(r.retreatId);
    }
    localStorage.setItem('drsti_cache_retreats', JSON.stringify(RETREATS));
  } else {
    var cached = localStorage.getItem('drsti_cache_retreats');
    if (cached) {
      RETREATS = JSON.parse(cached);
      RETREAT_IDS = Object.keys(RETREATS);
    }
    if (RETREAT_IDS.length === 0) {
      RETREATS = { 'tcot-pt-2026': { label: 'Portugal 2026', retreatId: 'tcot-pt-2026' } };
      RETREAT_IDS = ['tcot-pt-2026'];
    }
  }
  if (!activeRetreat || RETREAT_IDS.indexOf(activeRetreat) === -1) {
    activeRetreat = RETREAT_IDS[0];
  }
}

async function loadRetreatMeta(retreatId) {
  var data = await apiGet('getRetreatMeta', retreatId);
  if (data && data.ok) {
    RETREAT_META[retreatId] = {
      config: data.config,
      accommodations: data.accommodations,
      addons: data.addons,
      priceTypes: data.priceTypes
    };
    localStorage.setItem('drsti_cache_meta_' + retreatId, JSON.stringify(RETREAT_META[retreatId]));
  } else {
    var cached = localStorage.getItem('drsti_cache_meta_' + retreatId);
    if (cached) RETREAT_META[retreatId] = JSON.parse(cached);
  }
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', function() {
  if (!isAuthenticated) {
    document.getElementById('configOverlay').classList.remove('hidden');
    document.getElementById('loadingOverlay').classList.add('hidden');
    document.getElementById('configPassword').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') saveConfig();
    });
  } else {
    document.getElementById('configOverlay').classList.add('hidden');
    initDashboard();
  }

  // Init tooltip portal
  _initTooltips();

  // Sticky header shadow
  window.addEventListener('scroll', function() {
    document.getElementById('appHeader').classList.toggle('scrolled', window.scrollY > 4);
  });

  // Pause polling when hidden
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) { stopPolling(); }
    else { startPolling(); flushPendingQueue(); loadAll(); }
  });

  // Register SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function(){});
  }
});

async function initDashboard() {
  await loadRetreats();
  renderRetreatBar();
  // Run meta, templates, and applicant data in parallel — all only need retreatId
  await Promise.all([
    loadRetreatMeta(activeRetreat),
    loadServerTemplates(),
    loadAll()
  ]);
  startPolling();
}

function saveConfig() {
  var pw = document.getElementById('configPassword').value.trim();
  if (pw !== DASHBOARD_PASSWORD) {
    document.getElementById('loginError').style.display = 'block';
    return;
  }
  localStorage.setItem('drsti_auth', 'true');
  isAuthenticated = true;
  document.getElementById('configOverlay').classList.add('hidden');
  initDashboard();
}

// ── SYNC STATUS ──
var syncOnline = true;
var pendingQueue = JSON.parse(localStorage.getItem('drsti_pending_queue') || '[]');

function setSyncStatus(online) {
  syncOnline = online;
  var el = document.getElementById('syncDot');
  if (!el) return;
  if (online && pendingQueue.length === 0) {
    el.className = 'sync-dot-btn synced';
    el.title = 'Synced — click to refresh';
  } else {
    el.className = 'sync-dot-btn error';
    el.title = 'Offline — ' + pendingQueue.length + ' pending';
  }
}

function savePendingQueue() {
  localStorage.setItem('drsti_pending_queue', JSON.stringify(pendingQueue));
}

async function flushPendingQueue() {
  if (pendingQueue.length === 0) return;
  var remaining = [];
  for (var i = 0; i < pendingQueue.length; i++) {
    var item = pendingQueue[i];
    var result = await apiUpdate(item.action, item.body, true);
    if (!result || !result.ok) {
      remaining.push(item); // Keep failed items
    }
  }
  pendingQueue = remaining;
  savePendingQueue();
  setSyncStatus(remaining.length === 0);
}

// ── API ──
async function apiGet(action, retreatId) {
  try {
    var url = API_URL + '?action=' + action;
    if (retreatId) url += '&retreatId=' + encodeURIComponent(retreatId);
    var resp = await fetch(url);
    var data = await resp.json();
    if (data) {
      setSyncStatus(true);
      flushPendingQueue();
    }
    return data;
  } catch(e) {
    console.error('API GET error:', e);
    setSyncStatus(false);
    return null;
  }
}

async function apiUpdate(action, body, isRetry) {
  // Use GET with URL-encoded JSON payload — POST is unreliable with Apps Script
  try {
    var url = API_URL + '?action=' + action + '&payload=' + encodeURIComponent(JSON.stringify(body));
    var resp = await fetch(url);
    var text = await resp.text();
    try {
      var data = JSON.parse(text);
      setSyncStatus(true);
      return data;
    } catch(parseErr) {
      console.error('API update returned non-JSON:', text.substring(0, 300));
      var match = text.match(/margin:50px[^>]*>([^<]+)/);
      var errMsg = match ? match[1] : 'Server returned an error';
      return { error: errMsg };
    }
  } catch(e) {
    console.error('API update network error:', e);
    // Never queue email sends — avoid accidental re-sends
    if (!isRetry && action !== 'sendCustomEmail' && action !== 'sendBulkEmail') {
      pendingQueue.push({ action: action, body: body });
      savePendingQueue();
      setSyncStatus(false);
    }
    return { error: 'Network error: ' + (e.message || 'request failed'), networkError: true };
  }
}

// ── DATA ──
async function loadAll() {
  var showLoader = state.applicants.length === 0;
  if (showLoader) document.getElementById('loadingOverlay').classList.remove('hidden');

  var rid = activeRetreat;
  var results = await Promise.all([
    apiGet('getApplicants', rid),
    apiGet('getInventory', rid)
  ]);
  var appData = results[0], invData = results[1];

  if (appData && appData.ok) {
    state.applicants = appData.applicants;
    state.lastFetch = appData.ts;
    localStorage.setItem('drsti_cache_app_' + rid, JSON.stringify(appData.applicants));
  } else {
    var c = localStorage.getItem('drsti_cache_app_' + rid);
    if (c) state.applicants = JSON.parse(c);
  }

  if (invData && invData.ok) {
    state.inventory = invData.inventory;
    localStorage.setItem('drsti_cache_inv_' + rid, JSON.stringify(invData.inventory));
  } else {
    var c = localStorage.getItem('drsti_cache_inv_' + rid);
    if (c) state.inventory = JSON.parse(c);
  }

  renderInventory();
  renderFilterChips();
  // Only re-render cards if no card is currently expanded (user not interacting)
  var anyExpanded = Object.keys(state.expandedCards).some(function(k) { return state.expandedCards[k]; });
  if (!anyExpanded) {
    renderRetreatBar();
    renderCards();
  }
  updateLastFetched();
  if (showLoader) document.getElementById('loadingOverlay').classList.add('hidden');

  // Load activity log in background (non-blocking)
  loadActivityLog();
}

function toggleActivityLog() {
  var header = document.getElementById('activityLogToggle');
  var body = document.getElementById('activityLogBody');
  header.classList.toggle('open');
  body.classList.toggle('open');
}

async function loadActivityLog() {
  var data = await apiGet('getActivityLog');
  if (data && data.ok) {
    state.activityLog = data.entries || [];
    renderActivityLog(data.entries);
  }
}

function renderActivityLog(entries) {
  var tbody = document.getElementById('activityLogTbody');
  if (!entries || entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="activity-log-empty">No activity yet</td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var ts = e.timestamp ? new Date(e.timestamp) : null;
    var timeStr = ts ? ts.toLocaleDateString('en-US', {month:'short',day:'numeric'}) + ' ' + ts.toLocaleTimeString('en-US', {hour:'numeric',minute:'2-digit'}) : '';
    var typeCls = 'log-type-' + (e.type || 'system');
    html += '<tr>'
      + '<td style="white-space:nowrap">' + timeStr + '</td>'
      + '<td><span class="log-type ' + typeCls + '">' + esc(e.type) + '</span></td>'
      + '<td>' + esc(e.description) + '</td>'
      + '<td>' + esc(e.applicant) + '</td>'
      + '</tr>';
  }
  tbody.innerHTML = html;
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(loadAll, POLL_INTERVAL);
}
function stopPolling() { if (pollTimer) clearInterval(pollTimer); }

function updateLastFetched() {
  var dot = document.getElementById('syncDot');
  if (dot && state.lastFetch) {
    dot.title = 'Synced — updated ' + timeAgo(state.lastFetch) + ' — click to refresh';
  }
}

// ── RENDER: INVENTORY ──
var OFFER_HOLD_DAYS = 5;
function computeClientInventory() {
  var capacity = { 'Triple': 6, 'Double': 8, 'Glamping': 2 };
  var confirmed = { 'Triple': 0, 'Double': 0, 'Glamping': 0 };
  var pending = { 'Triple': 0, 'Double': 0, 'Glamping': 0 };
  var totalConfirmed = 0;
  var totalPending = 0;
  var now = Date.now();
  var holdMs = OFFER_HOLD_DAYS * 86400000;
  state.applicants.forEach(function(a) {
    var accom = String(a.accommodation || '').trim();
    if (CONFIRMED_STATUSES.indexOf(a.status) !== -1) {
      totalConfirmed++;
      if (accom && confirmed.hasOwnProperty(accom)) confirmed[accom]++;
    } else if (a.emailSent && accom && pending.hasOwnProperty(accom)) {
      // Pending = has accommodation + offer sent within hold period + not confirmed/expired
      var sentTime = new Date(a.emailSent).getTime();
      if (!isNaN(sentTime) && (now - sentTime) < holdMs && a.status !== 'Offer Expired' && a.status !== 'Not Aligned' && a.status !== 'Cancelled' && a.status !== 'No Longer Interested') {
        pending[accom]++;
        totalPending++;
      }
    }
  });
  var inv = [];
  ['Triple', 'Double', 'Glamping'].forEach(function(name) {
    inv.push({ item: name, total: capacity[name], confirmed: confirmed[name], pending: pending[name] });
  });
  inv.push({ item: 'TOTAL PARTICIPANTS', total: MAX_PARTICIPANTS, confirmed: totalConfirmed, pending: totalPending });
  return inv;
}

var activeInvFilter = '';
function renderInventory() {
  var strip = document.getElementById('invStrip');
  var html = '';
  var inv = computeClientInventory();
  for (var i = 0; i < inv.length; i++) {
    var item = inv[i];
    var isTotal = item.item === 'TOTAL PARTICIPANTS';
    var held = item.confirmed + item.pending;
    var isFull = held >= item.total;
    var isWarn = !isFull && item.pending > 0 && held >= item.total - 1;
    var isActive = activeInvFilter === item.item;
    var cls = 'inv-pill' + (isFull ? ' full' : '') + (isWarn ? ' warn' : '') + (isTotal ? ' total-pill' : '') + (isActive ? ' active' : '');
    var label = isTotal ? 'Total' : item.item;
    var pendingHtml = item.pending > 0 ? '<span class="inv-pending">(+' + item.pending + ')</span>' : '';
    html += '<div class="'+cls+'" onclick="filterByRoom(\''+item.item+'\')">'
      + '<span class="inv-label">'+esc(label)+'</span>'
      + '<span class="inv-nums">'+item.confirmed+'/'+item.total+pendingHtml+'</span>'
      + '</div>';
  }
  html += '<button class="bulk-toggle" id="bulkToggle" onclick="toggleBulkMode()">Select</button>';
  strip.innerHTML = html;
}

function filterByRoom(roomType) {
  if (activeInvFilter === roomType) {
    activeInvFilter = '';
  } else {
    activeInvFilter = roomType;
  }
  renderInventory();
  renderCards();
}

function getRoomAvailability(accomType) {
  if (!accomType) return null;
  var inv = computeClientInventory();
  for (var i = 0; i < inv.length; i++) {
    if (inv[i].item === accomType) return inv[i];
  }
  return null;
}

// ── RENDER: RETREAT BAR ──
var RETREAT_ICON = '<svg viewBox="0 0 256 256"><path d="M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z"/></svg>';
function renderRetreatBar() {
  var bar = document.getElementById('retreatBar');
  var html = '';
  for (var i = 0; i < RETREAT_IDS.length; i++) {
    var id = RETREAT_IDS[i];
    var r = RETREATS[id];
    var active = id === activeRetreat ? ' active' : '';
    html += '<button class="retreat-tab'+active+'" onclick="switchRetreat(\''+id+'\')">'+RETREAT_ICON+esc(r.label)+'</button>';
  }
  bar.innerHTML = html;
}

async function switchRetreat(retreatId) {
  if (retreatId === activeRetreat) return;
  activeRetreat = retreatId;
  localStorage.setItem('drsti_active_retreat', retreatId);
  renderRetreatBar();
  // Load retreat meta if not cached, then reload all data
  if (!RETREAT_META[retreatId]) {
    await loadRetreatMeta(retreatId);
  }
  await loadAll();
  showToast('Switched to ' + (RETREATS[retreatId] ? RETREATS[retreatId].label : retreatId), 'success');
}

// ── RENDER: FILTER CHIPS ──
function hasApplicantAddons(a) {
  if (a.addonBodywork === 'Yes' || a.addonHealing === 'Yes' || a.addonPhotoshoot === 'Yes' || a.addonCoaching === 'Yes') return true;
  if (a.addonsJson) {
    try { var aj = JSON.parse(a.addonsJson); for (var k in aj) { if (aj[k]) return true; } } catch(e) {}
  }
  return false;
}

function isFilterActive(id) {
  return state.activeFilters.indexOf(id) !== -1;
}
function isAllActive() {
  return state.activeFilters.length === 0;
}

function renderFilterChips() {
  var container = document.getElementById('filterChips');
  var counts = {};
  STATUSES.forEach(function(s) { counts[s] = 0; });
  state.applicants.forEach(function(a) { if (counts[a.status] !== undefined) counts[a.status]++; });

  // Smart filter counts
  var smartCounts = {};
  smartCounts['smart-paid'] = state.applicants.filter(function(a) { return a.status === 'Deposit Paid' || a.status === 'Payment Plan' || a.status === 'Paid in Full'; }).length;
  smartCounts['smart-offer-sent'] = state.applicants.filter(function(a) { return !!a.emailSent; }).length;
  smartCounts['smart-needs-email'] = state.applicants.filter(function(a) { return (a.status === 'Hard Yes' || a.status === 'Needs Call') && !a.emailSent; }).length;
  smartCounts['smart-addons'] = state.applicants.filter(function(a) { return hasApplicantAddons(a); }).length;
  smartCounts['smart-waitlist'] = counts['Waitlist'] || 0;

  var html = '<button class="chip'+(isAllActive()?' active':'')+'" onclick="applyFilter(\'all\')">All <span class="chip-count">'+state.applicants.length+'</span></button>';

  // Smart filters
  SMART_FILTERS.forEach(function(sf) {
    if (smartCounts[sf.id] === 0) return;
    var active = isFilterActive(sf.id) ? ' active' : '';
    html += '<button class="chip smart-chip'+active+'" onclick="applyFilter(\''+sf.id+'\')">'+esc(sf.label)+' <span class="chip-count">'+smartCounts[sf.id]+'</span></button>';
  });

  // Separator
  html += '<span class="chip-separator"></span>';

  // Status filters
  STATUSES.forEach(function(s) {
    if (counts[s] === 0) return;
    var active = isFilterActive(s) ? ' active' : '';
    html += '<button class="chip'+active+'" onclick="applyFilter(\''+s+'\')">'+esc(s)+' <span class="chip-count">'+counts[s]+'</span></button>';
  });
  container.innerHTML = html;

  renderFilterSummary();
}

function renderFilterSummary() {
  var el = document.getElementById('filterSummary');
  if (!el) return;
  if (isAllActive()) {
    el.innerHTML = '';
    return;
  }
  var labels = [];
  state.activeFilters.forEach(function(f) {
    if (f.indexOf('smart-') === 0) {
      var sf = SMART_FILTERS.find(function(s) { return s.id === f; });
      if (sf) labels.push(sf.label);
    } else {
      labels.push(f);
    }
  });
  var result = getFilteredSorted();
  var count = result.active.length + result.archived.length;
  el.innerHTML = '<strong>Filtered by:</strong> ' + labels.map(esc).join(', ') + ' &middot; ' + count + ' applicant' + (count !== 1 ? 's' : '');
}

// Debounce utility
function debounce(fn, delay) {
  var timer;
  return function() {
    var args = arguments;
    var ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function() { fn.apply(ctx, args); }, delay);
  };
}

// rAF-guarded render
var _renderCardsScheduled = false;
function scheduleRenderCards() {
  if (_renderCardsScheduled) return;
  _renderCardsScheduled = true;
  requestAnimationFrame(function() {
    _renderCardsScheduled = false;
    renderCards();
  });
}

var _debouncedRenderCards = debounce(function() { renderCards(); }, 200);

// ── RENDER: CARDS ──
function renderCards() {
  var container = document.getElementById('cardsContainer');
  var result = getFilteredSorted();
  var active = result.active;
  var archived = result.archived;

  if (active.length === 0 && archived.length === 0) {
    container.innerHTML = '<div class="cards-empty"><img src="drsti.png" alt="" style="width:48px;height:48px;border-radius:50%;opacity:0.6;margin-bottom:8px">No applicants found</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < active.length; i++) {
    html += renderCard(active[i]);
  }
  if (archived.length > 0) {
    if (active.length > 0) {
      html += '<div class="cards-divider"></div>';
    }
    for (var i = 0; i < archived.length; i++) {
      html += renderCard(archived[i]);
    }
  }
  container.innerHTML = html;

  // Re-expand any cards that were previously expanded
  for (var row in state.expandedCards) {
    if (state.expandedCards[row]) {
      var card = container.querySelector('[data-row="'+row+'"]');
      if (card) {
        var a = state.applicants.find(function(x) { return x.row === parseInt(row); });
        if (a) {
          card.classList.add('expanded');
          var body = card.querySelector('.card-body');
          if (body) body.innerHTML = renderCardDetail(a);
        }
      }
    }
  }
}

function renderCard(a) {
  var sc = STATUS_COLORS[a.status] || {bg:'#efefef',fg:'#999'};
  var cardClass = 'card';
  var name = esc(a.firstName + ' ' + a.lastName);
  var meta = esc(countryName(a.country)) + ' &middot; ' + timeAgo(a.timestamp);

  // Addons (for summary badges)
  var addons = [];
  if (a.addonBodywork === 'Yes') addons.push('Bodywork');
  if (a.addonHealing === 'Yes') addons.push('Healing');
  if (a.addonPhotoshoot === 'Yes') addons.push('Photoshoot');
  if (a.addonCoaching === 'Yes') addons.push('Coaching');
  if (a.addonsJson) {
    try {
      var aj = JSON.parse(a.addonsJson);
      for (var ak in aj) { if (aj[ak] && addons.indexOf(ak) === -1) addons.push(ak); }
    } catch(e) {}
  }
  var addonHtml = '';
  if (addons.length) {
    addonHtml = '<div class="addon-badges">' + addons.map(function(x){return '<span class="addon-badge">'+esc(x)+'</span>';}).join('') + '</div>';
  }

  // WhatsApp link
  var waLink = '#';
  if (a.phone) {
    var digits = String(a.phone).replace(/\D/g,'');
    waLink = 'https://wa.me/' + digits;
  }
  var igHandle = a.instagram ? String(a.instagram).replace(/^@/,'').replace(/^https?:\/\/(www\.)?instagram\.com\//i,'').replace(/[?#].*$/,'').replace(/\/+$/,'') : '';

  // Contact icons (Phosphor Icons — all same green)
  var contactIcons = '';
  if (a.email) contactIcons += '<button class="action-icon" title="Compose Email" onclick="event.stopPropagation();openEmailModal('+a.row+')"><i class="ph ph-envelope"></i></button>';
  if (a.phone) contactIcons += '<a href="'+waLink+'" target="_blank" class="action-icon" title="WhatsApp" onclick="event.stopPropagation()"><i class="ph ph-whatsapp-logo"></i></a>';
  if (igHandle) contactIcons += '<a href="https://instagram.com/'+esc(igHandle)+'" target="_blank" class="action-icon" title="@'+esc(igHandle)+'" onclick="event.stopPropagation()"><i class="ph ph-instagram-logo"></i></a>';

  var collapseArrow = '<svg class="card-collapse-arrow" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>';

  return '<article class="'+cardClass+'" data-row="'+a.row+'" data-status="'+esc(a.status)+'">'

    // ── HEADER ──
    + '<div class="card-header" onclick="toggleCard('+a.row+')">'
    + '<div class="bulk-check-wrap"><input type="checkbox" class="bulk-check" data-row="'+a.row+'" onclick="event.stopPropagation();updateBulkCount()" data-email="'+(a.email||'')+'"></div>'
    + '<div class="card-header-left">'
    + '<div class="card-header-name">'
    + '<h2>'+name+'</h2>'
    + '<p>'+meta+addonHtml+'</p>'
    + '</div></div>'
    + '<div class="card-header-right">'
    + '<div class="action-icons">'+contactIcons+'</div>'
    + '<div style="display:flex;align-items:center;gap:6px;">'
    + (a.status === 'Hard Yes' && a.emailSent ? '<span class="offer-sent-badge">Offer Sent &#10003;</span>' : '')
    + '<div class="status-badge" style="background:'+sc.bg+';color:'+sc.fg+'">'+esc(a.status)+'</div>'
    + collapseArrow
    + '</div></div></div>'

    // ── BODY (empty — detail injected on expand) ──
    + '<div class="card-body"></div>'
    + '</article>';
}

function renderCardDetail(a) {
  // Addons
  var addons = [];
  if (a.addonBodywork === 'Yes') addons.push('Bodywork');
  if (a.addonHealing === 'Yes') addons.push('Healing');
  if (a.addonPhotoshoot === 'Yes') addons.push('Photoshoot');
  if (a.addonCoaching === 'Yes') addons.push('Coaching');
  if (a.addonsJson) {
    try {
      var aj = JSON.parse(a.addonsJson);
      for (var ak in aj) { if (aj[ak] && addons.indexOf(ak) === -1) addons.push(ak); }
    } catch(e) {}
  }

  // Build add-on checkboxes for Overview
  var addonCheckboxes = '<div class="field"><div class="field-label">Add-ons</div><div class="addon-check-group">';
  ADDON_DEFS.forEach(function(ad) {
    var checked = addons.indexOf(ad.key) !== -1 ? ' checked' : '';
    addonCheckboxes += '<div class="addon-check-row"><div class="addon-check-left">'
      + '<input type="checkbox" id="addon-'+ad.key+'-'+a.row+'"'+checked+' onchange="markCardChanged('+a.row+')">'
      + '<label for="addon-'+ad.key+'-'+a.row+'">'+esc(ad.label)+'</label></div>'
      + '<span class="addon-check-price">'+formatCurrency(ad.price)+'</span></div>';
  });
  addonCheckboxes += '</div></div>';

  var igHandle = a.instagram ? String(a.instagram).replace(/^@/,'').replace(/^https?:\/\/(www\.)?instagram\.com\//i,'').replace(/[?#].*$/,'').replace(/\/+$/,'') : '';

  // Status select options — grouped
  var STATUS_GROUPS = [
    { label: 'Incoming', statuses: ['Applied','First Outreach'] },
    { label: 'Decision', statuses: ['Hard Yes','Needs Call','Call Scheduled','Waitlist','Not Aligned'] },
    { label: 'Offer', statuses: ['Offer Sent','Deposit Paid'] },
    { label: 'Payment', statuses: ['Payment Plan','Paid in Full'] },
    { label: 'Closed', statuses: ['No Longer Interested','Maybe Next Year','Ghosted','Cancelled','Other'] }
  ];
  var statusOpts = '';
  STATUS_GROUPS.forEach(function(g) {
    statusOpts += '<optgroup label="── '+g.label+' ──">';
    g.statuses.forEach(function(s) {
      statusOpts += '<option value="'+s+'"'+(s===a.status?' selected':'')+'>'+s+'</option>';
    });
    statusOpts += '</optgroup>';
  });

  // Accommodation select
  var ACCOM_OPTIONS = [
    {value:'', label:'\u2014 Select \u2014'},
    {value:'Triple', label:'Triple Room'},
    {value:'Double', label:'Double Room'},
    {value:'Glamping', label:'Glamping'}
  ];
  var accomOpts = '';
  ACCOM_OPTIONS.forEach(function(o) {
    accomOpts += '<option value="'+o.value+'"'+(o.value===a.accommodation?' selected':'')+'>'+o.label+'</option>';
  });

  // Price type select
  var priceOpts = '';
  PRICE_TYPES.forEach(function(x) {
    var label = x || '—';
    priceOpts += '<option value="'+x+'"'+(x===a.priceType?' selected':'')+'>'+label+'</option>';
  });

  // Offer email status — always built, shown/hidden dynamically
  var showStatusExtras = (a.status === 'Hard Yes');
  var offerReady = a.accommodation && a.priceType;
  var offerSent = !!a.emailSent;
  var noteClass = 'offer-email-note';
  var noteText = '';
  var sendBtnHtml = '';
  if (offerSent) {
    noteClass += ' sent';
    noteText = '&#10003; Email sent ' + formatDate(a.emailSent);
    sendBtnHtml = '<button class="btn-send-new-email" onclick="openEmailModal('+a.row+')" title="Send another email">+ Send new email</button>';
  } else if (offerReady) {
    noteClass += ' ready';
    noteText = '&#10003; Ready to send';
    sendBtnHtml = '<button class="btn-send-email" onclick="openEmailModal('+a.row+')">&#9993; Compose &amp; Send Email</button>';
  } else {
    noteText = 'Set accommodation and price type to enable offer email';
  }
  var offerHtml = '<div id="offer-section-'+a.row+'"><div class="divider"></div>'
    + '<div><div class="slabel">Offer Email '+tooltip('Opens an editable email preview before sending. Cannot be undone \u2014 only send when ready.')+'</div>'
    + '<div class="offer-email-box"><div class="'+noteClass+'">'+noteText+'</div></div>'
    + sendBtnHtml + '</div></div>';

  // Status-based email (Needs Call, Waitlist, Not Aligned) — compose available without accommodation/price
  var statusEmailStatuses = { 'Needs Call': 'needs-call', 'Waitlist': 'waitlist', 'Not Aligned': 'not-aligned' };
  var statusEmailHtml = '';
  var statusTemplateKey = statusEmailStatuses[a.status];
  if (statusTemplateKey && !offerSent) {
    statusEmailHtml = '<div class="divider"></div>'
      + '<div><div class="slabel">' + esc(a.status) + ' Email</div>'
      + '<div class="offer-email-box"><div class="offer-email-note ready">&#10003; Template ready</div></div>'
      + '<button class="btn-send-email" onclick="openEmailModal('+a.row+')">&#9993; Compose &amp; Send Email</button></div>';
  } else if (statusTemplateKey && offerSent) {
    statusEmailHtml = '<div class="divider"></div>'
      + '<div><div class="slabel">' + esc(a.status) + ' Email</div>'
      + '<div class="offer-email-box"><div class="offer-email-note sent">&#10003; Email sent ' + formatDate(a.emailSent) + '</div></div>'
      + '<button class="btn-send-new-email" onclick="openEmailModal('+a.row+')" title="Send another email">+ Send new email</button></div>';
  }

  // Room preference
  var roomPref = a.roomPlan || a.roomFull || a.roomEB || a.roomEBFull || '—';

  // SVG arrows
  var arrowSvg = '<svg class="accordion-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>';

  // Return INNER content of .card-body (not the wrapper div)
  return ''

    // Overview accordion (open by default when card expands)
    + '<div class="accordion">'
    + '<button class="accordion-trigger open" onclick="toggleAccordion(this)">Overview '+arrowSvg+'</button>'
    + '<div class="accordion-body open">'
    + '<div style="padding-top:14px;display:flex;flex-direction:column;gap:12px;">'
    + '<div class="field"><div class="field-label">Status</div><select id="sel-status-'+a.row+'" onchange="markCardChanged('+a.row+');updateStatusExtras('+a.row+')">'+statusOpts+'</select></div>'
    + '<div class="field-row">'
    + '<div class="field"><div class="field-label">Accommodation</div><select id="sel-accom-'+a.row+'" onchange="markCardChanged('+a.row+');updateOfferReady('+a.row+')">'+accomOpts+'</select></div>'
    + '<div class="field"><div class="field-label">Price Type '+tooltip('EB = Early Bird (before March 20). Plan = 3 instalments. Full = pay in full with 10% discount.')+'</div><select id="sel-price-'+a.row+'" onchange="markCardChanged('+a.row+');updateOfferReady('+a.row+')">'+priceOpts+'</select></div>'
    + '</div>'
    + '<div class="field"><div class="field-label">Scholarship '+tooltip('Amount discounted from total. Deducted automatically from all invoice calculations.')+'</div><div style="display:flex;align-items:center;gap:6px;"><span style="font-size:13px;color:var(--text-muted);flex-shrink:0;">\u20AC</span><input type="number" id="sel-scholarship-'+a.row+'" min="0" step="50" value="'+(a.scholarship||'')+'" placeholder="0" oninput="markCardChanged('+a.row+')"></div></div>'
    + addonCheckboxes
    + '<div id="status-extras-'+a.row+'" style="'+(showStatusExtras?'':'display:none;')+'">'
    + '<div class="divider"></div>'
    + '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text-secondary);">'
    + '<input type="checkbox" id="sel-video-'+a.row+'"'+(a.personalVideoSent?' checked':'')+' onchange="markCardChanged('+a.row+')">'
    + 'Personal video sent'
    + '</label>'
    + (a.status === 'Call Scheduled' || a.callTime ? '<div class="field" style="margin-top:8px;"><div class="field-label">Call Time</div><input type="datetime-local" id="sel-calltime-'+a.row+'" value="'+(a.callTime ? a.callTime.replace('Z','').replace(/\.\d+$/,'').slice(0,16) : '')+'" onchange="markCardChanged('+a.row+')" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px;background:var(--card-bg);color:var(--text-primary);"></div>' : '')
    + offerHtml
    + '</div>'
    + statusEmailHtml
    + buildEmailHistory(a.row)
    + '<div class="field"><div class="field-label">Notes</div><textarea id="sel-notes-'+a.row+'" rows="3" oninput="markCardChanged('+a.row+')" placeholder="Internal notes...">'+esc(a.notes||'')+'</textarea></div>'
    + '</div></div></div>'

    // Application accordion with tabs (closed)
    + '<div class="accordion">'
    + '<button class="accordion-trigger" onclick="toggleAccordion(this)">Application '+arrowSvg+'</button>'
    + '<div class="accordion-body">'
    + '<div style="padding-top:10px;">'
    + '<div class="tab-row">'
    + '<button class="tab-btn active" onclick="event.stopPropagation();switchAppTab('+a.row+',\'answers\')">Answers</button>'
    + '<button class="tab-btn" onclick="event.stopPropagation();switchAppTab('+a.row+',\'prefs\')">Preferences</button>'
    + '<button class="tab-btn" onclick="event.stopPropagation();switchAppTab('+a.row+',\'contact\')">Contact Info</button>'
    + '</div>'
    + '<div id="appview-answers-'+a.row+'">'
    + qaRow('What inspired you to apply?', a.inspired)
    + qaRow('Yoga / Spiritual Experience', a.yogaExperience)
    + qaRow('Health Goals', a.healthGoals)
    + qaRow('Injuries / Conditions', a.injuries)
    + qaRow('Food Restrictions', a.foodRestrictions)
    + qaRow('Substances', a.substances)
    + qaRow('Comfortable with digital detox / silence?', a.comfortableWith)
    + qaRow('Questions or Concerns', a.questionsConcerns)
    + qaRow('How They Found Us', a.howHeard)
    + qaRow('Referral', a.referral)
    + qaRow('Additional Info', a.additionalInfo)
    + '</div>'
    + '<div id="appview-prefs-'+a.row+'" style="display:none;">'
    + '<p style="font-size:11px;color:var(--text-muted);margin-bottom:10px;font-style:italic;">Read-only form responses from the applicant</p>'
    + qaRow('Payment Preference', a.paymentPreference)
    + qaRow('Room Selection', roomPref)
    + qaRow('Add-ons Interested', a.addonsInterested || addons.join(', '))
    + qaRow('Travel Assistance', a.travelAssist)
    + qaRow('Flight Contest', a.flightContest)
    + '</div>'
    + '<div id="appview-contact-'+a.row+'" style="display:none;">'
    + qaRow('Email', a.email)
    + qaRow('Phone', a.phone ? (String(a.phone).replace(/\D/g,'').length > 0 ? '+' + String(a.phone).replace(/[^\d+]/g,'').replace(/^\+?/, '') : a.phone) : '')
    + qaRow('Instagram', igHandle ? '@' + igHandle : '')
    + qaRow('Country', a.country)
    + '</div>'
    + '</div></div></div>'

    // Payment accordion (closed)
    + '<div class="accordion">'
    + '<button class="accordion-trigger" onclick="toggleAccordion(this)">Payment '+arrowSvg+'</button>'
    + '<div class="accordion-body">'
    + '<div id="pay-section-'+a.row+'">'+buildPaymentSection(a)+'</div>'
    + '</div></div>'

    // System Info accordion (closed)
    + '<div class="accordion">'
    + '<button class="accordion-trigger" onclick="toggleAccordion(this)">System Info '+arrowSvg+'</button>'
    + '<div class="accordion-body">'
    + '<div style="padding-top:8px;">'
    + sysRow('Status Changed', a.statusChangedDate ? formatDate(a.statusChangedDate) : '—')
    + sysRow('Applied', a.timestamp ? formatDate(a.timestamp) : '—')
    + sysRow('Email Sent', a.emailSent ? formatDate(a.emailSent) : '—')
    + sysRow('Ghost Step', a.ghostStep || '0')
    + sysRow('Dep Reminder Step', a.depReminderStep || '0')
    + sysRow('CK Tag', a.ckTag || '—')
    + sysRow('Migration Import', a.migrationImport ? 'Yes' : 'No')
    + '</div></div></div>';
}

function qaRow(label, text) {
  return '<div class="qa-row"><div class="qa-q">'+esc(label)+'</div><div class="qa-a">'+esc(text||'')+'</div></div>';
}
function sysRow(label, value) {
  return '<div class="sysrow"><span class="sysrow-label">'+esc(label)+'</span><span class="sysrow-value">'+esc(String(value))+'</span></div>';
}

// ── AVATAR ──
var AVATAR_COLORS = ['#6B8E6B','#8B7355','#7B6B8A','#5F7A8A','#8A6B6B','#6B8A7A','#7A6B5A','#5A7A6B','#8A7A6B','#6B6B8A'];

function avatarInitials(a) {
  var f = (a.firstName || '').trim();
  var l = (a.lastName || '').trim();
  return ((f[0] || '') + (l[0] || '')).toUpperCase() || '?';
}

function avatarColor(name) {
  var hash = 0;
  for (var i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function md5(s){/* Minimal MD5 for Gravatar */var L=function(k,d){return(k<<d)|(k>>>(32-d))},K=function(G,k){var I,d,F,H,x;F=(G&2147483648);H=(k&2147483648);I=(G&1073741824);d=(k&1073741824);x=(G&1073741823)+(k&1073741823);if(I&d)return(x^2147483648^F^H);if(I|d){if(x&1073741824)return(x^3221225472^F^H);else return(x^1073741824^F^H)}else return(x^F^H)},m=function(F,k,d){return(F&k)|((~F)&d)},o=function(F,k,d){return(F&d)|(k&(~d))},n=function(F,k,d){return(F^k^d)},j=function(F,k,d){return(k^(F|(~d)))},ii=function(a,b,c,d,x,s,t){a=K(a,K(K(m(b,c,d),x),t));return K(L(a,s),b)},hh=function(a,b,c,d,x,s,t){a=K(a,K(K(o(b,c,d),x),t));return K(L(a,s),b)},gg=function(a,b,c,d,x,s,t){a=K(a,K(K(n(b,c,d),x),t));return K(L(a,s),b)},ff=function(a,b,c,d,x,s,t){a=K(a,K(K(j(b,c,d),x),t));return K(L(a,s),b)};function C(x){var a,b=[],c=x.length;for(a=0;a<c;a++){var d=x.charCodeAt(a);if(d<128)b.push(d);else if(d<2048){b.push((d>>6)|192);b.push((d&63)|128)}else{b.push((d>>12)|224);b.push(((d>>6)&63)|128);b.push((d&63)|128)}}return b}function D(x){var a=C(x),e=a.length,b=e+8,f=((b-(b%64))/64+1)*16,g=Array(f*16);var h=0,i=0;while(i<e){g[(i-(i%4))/4]|=a[i]<<((i%4)*8);i++}g[(i-(i%4))/4]|=128<<((i%4)*8);g[f-2]=e*8;return g}function W(d){var a="",b="",c,f;for(f=0;f<=3;f++){c=(d>>>(f*8))&255;b="0"+c.toString(16);a+=b.substr(b.length-2,2)}return a}var x=D(s),a=1732584193,b=4023233417,c=2562383102,d=271733878;for(var p=0;p<x.length;p+=16){var A=a,B=b,C2=c,D2=d;a=ii(a,b,c,d,x[p],7,3614090360);d=ii(d,a,b,c,x[p+1],12,3905402710);c=ii(c,d,a,b,x[p+2],17,606105819);b=ii(b,c,d,a,x[p+3],22,3250441966);a=ii(a,b,c,d,x[p+4],7,4118548399);d=ii(d,a,b,c,x[p+5],12,1200080426);c=ii(c,d,a,b,x[p+6],17,2821735955);b=ii(b,c,d,a,x[p+7],22,4249261313);a=ii(a,b,c,d,x[p+8],7,1770035416);d=ii(d,a,b,c,x[p+9],12,2336552879);c=ii(c,d,a,b,x[p+10],17,4294925233);b=ii(b,c,d,a,x[p+11],22,2304563134);a=ii(a,b,c,d,x[p+12],7,1804603682);d=ii(d,a,b,c,x[p+13],12,4254626195);c=ii(c,d,a,b,x[p+14],17,2792965006);b=ii(b,c,d,a,x[p+15],22,1236535329);a=hh(a,b,c,d,x[p+1],5,4129170786);d=hh(d,a,b,c,x[p+6],9,3225465664);c=hh(c,d,a,b,x[p+11],14,643717713);b=hh(b,c,d,a,x[p],20,3921069994);a=hh(a,b,c,d,x[p+5],5,3593408605);d=hh(d,a,b,c,x[p+10],9,38016083);c=hh(c,d,a,b,x[p+15],14,3634488961);b=hh(b,c,d,a,x[p+4],20,3889429448);a=hh(a,b,c,d,x[p+9],5,568446438);d=hh(d,a,b,c,x[p+14],9,3275163606);c=hh(c,d,a,b,x[p+3],14,4107603335);b=hh(b,c,d,a,x[p+8],20,1163531501);a=hh(a,b,c,d,x[p+13],5,2850285829);d=hh(d,a,b,c,x[p+2],9,4243563512);c=hh(c,d,a,b,x[p+7],14,1735328473);b=hh(b,c,d,a,x[p+12],20,2368359562);a=gg(a,b,c,d,x[p+5],4,4294588738);d=gg(d,a,b,c,x[p+8],11,2272392833);c=gg(c,d,a,b,x[p+11],16,1839030562);b=gg(b,c,d,a,x[p],23,4259657740);a=gg(a,b,c,d,x[p+3],4,2763975236);d=gg(d,a,b,c,x[p+6],11,1272893353);c=gg(c,d,a,b,x[p+9],16,4139469664);b=gg(b,c,d,a,x[p+12],23,3200236656);a=gg(a,b,c,d,x[p+15],4,681279174);d=gg(d,a,b,c,x[p+2],11,3936430074);c=gg(c,d,a,b,x[p+5],16,3572445317);b=gg(b,c,d,a,x[p+8],23,76029189);a=gg(a,b,c,d,x[p+11],4,3654602809);d=gg(d,a,b,c,x[p+14],11,3873151461);c=gg(c,d,a,b,x[p+1],16,530742520);b=gg(b,c,d,a,x[p+4],23,3299628645);a=ff(a,b,c,d,x[p],6,4096336452);d=ff(d,a,b,c,x[p+7],10,1126891415);c=ff(c,d,a,b,x[p+14],15,2878612391);b=ff(b,c,d,a,x[p+5],21,4237533241);a=ff(a,b,c,d,x[p+12],6,1700485571);d=ff(d,a,b,c,x[p+3],10,2399980690);c=ff(c,d,a,b,x[p+10],15,4293915773);b=ff(b,c,d,a,x[p+1],21,2240044497);a=ff(a,b,c,d,x[p+8],6,1873313359);d=ff(d,a,b,c,x[p+15],10,4264355552);c=ff(c,d,a,b,x[p+6],15,2734768916);b=ff(b,c,d,a,x[p+13],21,1309151649);a=ff(a,b,c,d,x[p+4],6,4149444226);d=ff(d,a,b,c,x[p+11],10,3174756917);c=ff(c,d,a,b,x[p+2],15,718787259);b=ff(b,c,d,a,x[p+9],21,3951481745);a=K(a,A);b=K(b,B);c=K(c,C2);d=K(d,D2)}return(W(a)+W(b)+W(c)+W(d)).toLowerCase()}

function buildAvatar(a) {
  var initials = avatarInitials(a);
  var bg = avatarColor((a.firstName || '') + (a.lastName || ''));
  return '<div class="card-avatar" style="background:' + bg + ';">' + esc(initials) + '</div>';
}

function buildEmailHistory(row) {
  var emails = state.activityLog.filter(function(e) {
    return e.row == row && e.type === 'email';
  });
  if (!emails.length) return '';
  var h = '<div class="divider"></div><div class="field"><div class="field-label">Email History</div>';
  h += '<div class="email-history">';
  emails.forEach(function(e) {
    var ts = e.timestamp ? new Date(e.timestamp) : null;
    var dateStr = ts ? ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    var timeStr = ts ? ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
    // Extract template/subject from description
    var desc = e.description || '';
    var label = desc.replace(/^Email sent via composer:\s*/i, '').replace(/^Bulk email sent:.*?—\s*/i, '').replace(/email auto-sent.*$/i, 'auto-sent');
    if (desc.indexOf('auto-sent') !== -1) {
      var statusMatch = desc.match(/^(\w[\w\s]+?)\s+email auto-sent/);
      label = statusMatch ? statusMatch[1] + ' (auto)' : 'Auto-sent';
    }
    if (desc.indexOf('Ghost step') !== -1) label = desc.replace(/^.*?(Ghost step.*)email sent.*$/i, '$1');
    if (desc.indexOf('Deposit reminder') !== -1) label = desc.replace(/^.*?(Deposit reminder.*)email sent.*$/i, '$1');
    h += '<div class="email-history-item">'
      + '<i class="ph ph-envelope-simple" style="color:var(--sage-dark);flex-shrink:0;"></i>'
      + '<div class="email-history-detail">'
      + '<span class="email-history-label">' + esc(label) + '</span>'
      + '<span class="email-history-date">' + dateStr + ' at ' + timeStr + '</span>'
      + '</div></div>';
  });
  h += '</div></div>';
  return h;
}

// ── INTERACTIONS ──
function toggleCard(row) {
  var expanding = !state.expandedCards[row];
  state.expandedCards[row] = expanding;
  var card = document.querySelector('[data-row="'+row+'"]');
  if (!card) return;

  if (expanding) {
    var a = state.applicants.find(function(x) { return x.row === row; });
    if (a) {
      var body = card.querySelector('.card-body');
      if (body) body.innerHTML = renderCardDetail(a);
    }
    card.classList.add('expanded');
  } else {
    var body = card.querySelector('.card-body');
    if (body) body.innerHTML = '';
    card.classList.remove('expanded');
  }
}

function toggleAccordion(trigger) {
  var body = trigger.nextElementSibling;
  var isOpen = trigger.classList.contains('open');
  trigger.classList.toggle('open', !isOpen);
  body.classList.toggle('open', !isOpen);

  // If opening the Payment accordion, refresh with live dropdown values
  if (!isOpen && trigger.textContent.trim() === 'Payment') {
    var card = trigger.closest('[data-row]');
    if (card) refreshPaymentSection(parseInt(card.dataset.row));
  }
}

function updateStatusExtras(row) {
  var statusEl = document.getElementById('sel-status-' + row);
  var extrasEl = document.getElementById('status-extras-' + row);
  if (!statusEl || !extrasEl) return;
  var show = statusEl.value === 'Hard Yes';
  extrasEl.style.display = show ? '' : 'none';
}

function updateOfferReady(row) {
  var accomEl = document.getElementById('sel-accom-' + row);
  var priceEl = document.getElementById('sel-price-' + row);
  var offerEl = document.getElementById('offer-section-' + row);
  if (!offerEl || !accomEl || !priceEl) return;
  var a = state.applicants.find(function(x) { return x.row === row; });
  if (!a || a.emailSent) return;
  var ready = accomEl.value && priceEl.value;
  if (ready) {
    offerEl.innerHTML = '<div class="divider"></div>'
      + '<div><div class="slabel">Offer Email</div>'
      + '<div class="offer-email-box"><div class="offer-email-note ready">&#10003; Ready to send</div></div>'
      + '<button class="btn-send-email" onclick="openEmailModal('+row+')">&#9993; Compose &amp; Send Email</button></div>';
  } else {
    offerEl.innerHTML = '<div class="divider"></div>'
      + '<div><div class="slabel">Offer Email</div>'
      + '<div class="offer-email-box"><div class="offer-email-note">Set accommodation and price type to enable offer email</div></div></div>';
  }
}

function rerenderSingleCard(row) {
  var a = state.applicants.find(function(x) { return x.row === row; });
  if (!a) return;
  var oldCard = document.querySelector('[data-row="' + row + '"]');
  if (!oldCard) return;
  var wasExpanded = state.expandedCards[row];
  var tmp = document.createElement('div');
  tmp.innerHTML = renderCard(a);
  var newCard = tmp.firstElementChild;
  oldCard.replaceWith(newCard);
  if (wasExpanded) {
    state.expandedCards[row] = true;
    newCard.classList.add('expanded');
    var body = newCard.querySelector('.card-body');
    if (body) body.innerHTML = renderCardDetail(a);
  }
}

function refreshPaymentSection(row) {
  var container = document.getElementById('pay-section-' + row);
  if (!container) return;

  var a = state.applicants.find(function(x) { return x.row === row; });
  if (!a) return;

  // Build a copy with live dropdown values
  var liveA = {};
  for (var k in a) liveA[k] = a[k];

  var accomEl = document.getElementById('sel-accom-' + row);
  var priceEl = document.getElementById('sel-price-' + row);
  var scholarshipEl = document.getElementById('sel-scholarship-' + row);

  if (accomEl) liveA.accommodation = accomEl.value;
  if (priceEl) liveA.priceType = priceEl.value;
  if (scholarshipEl) liveA.scholarship = scholarshipEl.value;

  // Read live add-on checkboxes
  var liveAddons = {};
  ADDON_DEFS.forEach(function(ad) {
    var el = document.getElementById('addon-' + ad.key + '-' + row);
    if (el && el.checked) liveAddons[ad.key] = true;
  });
  liveA.addonsJson = JSON.stringify(liveAddons);

  container.innerHTML = buildPaymentSection(liveA);
}

function markCardChanged(row) {
  state.dirtyCards[row] = true;
  state.activeRow = row;
  var a = state.applicants.find(function(x){ return x.row === row; });
  var bar = document.getElementById('floatingSave');
  var nameEl = document.getElementById('floatingSaveName');
  if (bar && nameEl && a) {
    nameEl.textContent = (a.firstName || '') + ' ' + (a.lastName || '');
    bar.classList.add('visible');
    document.body.classList.add('save-bar-visible');
  }
}

function saveActiveCard() {
  if (state.activeRow) saveCardChanges(state.activeRow);
}

function hideFloatingSave() {
  var bar = document.getElementById('floatingSave');
  if (bar) bar.classList.remove('visible');
  document.body.classList.remove('save-bar-visible');
}

function showFloatingSaveForNextDirty() {
  var rows = Object.keys(state.dirtyCards);
  if (rows.length === 0) {
    hideFloatingSave();
    return;
  }
  var nextRow = parseInt(rows[0]);
  state.activeRow = nextRow;
  var a = state.applicants.find(function(x){ return x.row === nextRow; });
  var bar = document.getElementById('floatingSave');
  var nameEl = document.getElementById('floatingSaveName');
  if (bar && nameEl && a) {
    nameEl.textContent = (a.firstName || '') + ' ' + (a.lastName || '');
    bar.classList.add('visible');
    document.body.classList.add('save-bar-visible');
  }
}

// ── EMAIL COMPOSER MODAL ──
var emailModalRow = null;

function formatNumberPlain(num) {
  if (!num) return '0';
  var n = Number(num);
  if (n % 1 === 0) return n.toLocaleString();
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function resolveEmailTemplate(a, overrideTemplateKey) {
  var STATUS_TEMPLATE_MAP = { 'Hard Yes': 'hard-yes', 'Needs Call': 'needs-call', 'Waitlist': 'waitlist', 'Not Aligned': 'not-aligned' };
  var templateKey = overrideTemplateKey || STATUS_TEMPLATE_MAP[a.status] || 'hard-yes';
  var tpl = EMAIL_TEMPLATES_JS[templateKey];
  if (!tpl) return { subject: '', body: '' };

  var meta = RETREAT_META[activeRetreat] || {};
  var config = meta.config || {};

  var retreatName = config['Retreat Name'] || 'The Course of Transformation';
  if (retreatName.indexOf('The ') !== 0 && retreatName.indexOf('the ') !== 0) retreatName = 'The ' + retreatName;
  if (retreatName.indexOf(' \u00b7 ') !== -1) retreatName = retreatName.split(' \u00b7 ')[0];

  var symbol = config['Currency Symbol'] || '\u20ac';
  var deposit = config['Deposit Amount'] || DEPOSIT_AMOUNT;
  var priceKey = PRICE_TYPE_MAP[a.priceType] || 'plan';
  var prices = ACCOM_PRICES[a.accommodation];
  var basePrice = prices ? (prices[priceKey] || 0) : 0;
  var scholarship = Number(a.scholarship) || 0;
  if (scholarship > 0) basePrice = basePrice - scholarship;

  // Build payment summary
  var PRICE_LABELS = {'Payment Plan':'Payment Plan','Pay Full':'Pay in Full','EB Plan':'Early Bird Plan','EB Full':'Early Bird Full'};
  var priceLabel = PRICE_LABELS[a.priceType] || a.priceType;

  // Calculate add-on total (merge legacy columns + addonsJson)
  var selectedAddons = {};
  if (a.addonBodywork === 'Yes') selectedAddons['Bodywork'] = true;
  if (a.addonHealing === 'Yes') selectedAddons['Healing'] = true;
  if (a.addonPhotoshoot === 'Yes') selectedAddons['Photoshoot'] = true;
  if (a.addonCoaching === 'Yes') selectedAddons['Coaching'] = true;
  try { if (a.addonsJson) { var pj = JSON.parse(a.addonsJson); for (var pk in pj) { if (pj[pk]) selectedAddons[pk] = true; else delete selectedAddons[pk]; } } } catch(e) {}
  var addonTotal = 0;
  var addonLines = '';
  ADDON_DEFS.forEach(function(ad) {
    if (selectedAddons[ad.key]) {
      addonTotal += ad.price;
      addonLines += ad.label + ': ' + symbol + formatNumberPlain(ad.price) + '\n';
    }
  });
  var grandTotal = basePrice + addonTotal;

  var paymentSummary = '';
  if (!basePrice || !a.priceType) {
    paymentSummary = '_Accommodation and payment details will be confirmed shortly._';
  } else if (a.priceType === 'Pay Full' || a.priceType === 'EB Full') {
    paymentSummary = '**Your pricing (' + priceLabel + '):**\n';
    paymentSummary += a.accommodation ? (a.accommodation + ' \u2014 ' + symbol + formatNumberPlain(basePrice) + '\n') : ('Base: ' + symbol + formatNumberPlain(basePrice) + '\n');
    paymentSummary += addonLines;
    paymentSummary += '**Total: ' + symbol + formatNumberPlain(grandTotal) + '**\n\n';
    var remaining = grandTotal - deposit;
    paymentSummary += 'Deposit: ' + symbol + formatNumberPlain(deposit)
      + '\nRemaining balance: ' + symbol + formatNumberPlain(remaining) + ' (due within two weeks of your deposit)\n';
  } else {
    paymentSummary = '**Your pricing (' + priceLabel + '):**\n';
    paymentSummary += a.accommodation ? (a.accommodation + ' \u2014 ' + symbol + formatNumberPlain(basePrice) + '\n') : ('Base: ' + symbol + formatNumberPlain(basePrice) + '\n');
    paymentSummary += addonLines;
    paymentSummary += '**Total: ' + symbol + formatNumberPlain(grandTotal) + '**\n\n';
    var remaining = grandTotal - deposit;
    var installment = Math.floor(remaining / 3 * 100) / 100;
    var lastInstallment = Math.round((remaining - installment * 2) * 100) / 100;
    paymentSummary += 'Deposit: ' + symbol + formatNumberPlain(deposit) + ' (today)'
      + '\nPayment 1: ' + symbol + formatNumberPlain(installment)
      + '\nPayment 2: ' + symbol + formatNumberPlain(installment)
      + '\nPayment 3: ' + symbol + formatNumberPlain(lastInstallment) + '\n_Exact dates will be sent once your deposit is confirmed._\n';
  }

  // Compute open spots
  var openSpots = MAX_PARTICIPANTS;
  var confirmed = state.applicants.filter(function(x) {
    return CONFIRMED_STATUSES.indexOf(x.status) !== -1;
  }).length;
  openSpots = MAX_PARTICIPANTS - confirmed;
  if (openSpots < 0) openSpots = 0;

  var pricePlan = prices ? (prices['plan'] || 0) : 0;
  var priceFull = prices ? (prices['full'] || 0) : 0;

  var tags = {
    'first_name': a.firstName || '',
    'full_name': (a.firstName || '') + ' ' + (a.lastName || ''),
    'email': a.email || '',
    'phone': a.phone || '',
    'accommodation': a.accommodation || '',
    'deposit_amount': symbol + formatNumberPlain(deposit),
    'deposit_link': '{{deposit_link}}',
    'payment_summary': paymentSummary,
    'price_plan': pricePlan ? symbol + formatNumberPlain(pricePlan) : '',
    'price_full': priceFull ? symbol + formatNumberPlain(priceFull) : '',
    'retreat_name': retreatName,
    'retreat_dates': config['Retreat Dates'] || '',
    'venue_name': config['Venue Name'] || '',
    'city': config['City'] || '',
    'country': config['Country'] || '',
    'open_spots': String(openSpots),
    'retreat_month': config['Retreat Month'] || '',
    'cal_link': config['Cal Link'] || ''
  };

  var subject = tpl.subject;
  var body = tpl.body;
  for (var key in tags) {
    var ph = '{{' + key + '}}';
    // Only resolve tags that have actual values; leave empty ones as {{tag}} for server to resolve
    if (tags[key] && tags[key] !== '{{' + key + '}}') {
      subject = subject.split(ph).join(tags[key]);
      body = body.split(ph).join(tags[key]);
    }
  }
  return { subject: subject, body: body };
}

function markdownToHtmlPreview(text) {
  return text
    .replace(/^---$/gm, '<hr>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/_(.+?)_/g, '<i>$1</i>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/\n/g, '<br>');
}

// Template labels for the compose dropdown
var COMPOSE_TEMPLATES = [
  { key: 'hard-yes', label: 'Hard Yes Offer' },
  { key: 'needs-call', label: 'Needs Call / Schedule' },
  { key: 'waitlist', label: 'Waitlist' },
  { key: 'not-aligned', label: 'Not Aligned' },
  { key: 'ghost-1', label: 'Ghost 1 — Just checking in' },
  { key: 'ghost-2', label: 'Ghost 2 — Still thinking it over?' },
  { key: 'ghost-3', label: 'Ghost 3 — Spot almost gone' },
  { key: 'ghost-4', label: 'Ghost 4 — Last call' },
  { key: 'deposit-reminder-1', label: 'Deposit Reminder 1' },
  { key: 'deposit-reminder-2', label: 'Deposit Reminder 2' },
  { key: 'payment-reminder', label: 'Payment Reminder' },
  { key: 'waitlist-spot-open', label: 'Waitlist — Spot Opened' },
  { key: 'waitlist-spot-filled', label: 'Waitlist — Spot Filled' }
];

// Map status to default template key
var STATUS_DEFAULT_TEMPLATE = { 'Hard Yes': 'hard-yes', 'Needs Call': 'needs-call', 'Waitlist': 'waitlist', 'Not Aligned': 'not-aligned', 'Ghosted': 'ghost-1' };

function openEmailModal(row) {
  var a = state.applicants.find(function(x) { return x.row === row; });
  if (!a) return;
  emailModalRow = row;

  // Read live status from dropdown so unsaved changes are reflected in template selection
  var statusEl = document.getElementById('sel-status-' + row);
  var liveStatus = statusEl ? statusEl.value : a.status;
  var defaultKey = STATUS_DEFAULT_TEMPLATE[liveStatus] || 'hard-yes';

  // Populate template dropdown
  var tplSelect = document.getElementById('emailModalTemplate');
  var opts = '';
  COMPOSE_TEMPLATES.forEach(function(ct) {
    opts += '<option value="' + ct.key + '"' + (ct.key === defaultKey ? ' selected' : '') + '>' + esc(ct.label) + '</option>';
  });
  tplSelect.innerHTML = opts;

  var resolved = resolveEmailTemplate(Object.assign({}, a, { status: liveStatus }));
  document.getElementById('emailModalTo').innerHTML = '<strong>To:</strong> ' + esc(a.email || '');
  document.getElementById('emailModalSubject').value = resolved.subject;
  document.getElementById('emailModalTextarea').value = resolved.body;
  document.getElementById('emailModalPreview').innerHTML = markdownToHtmlPreview(resolved.body);

  // Reset to preview mode
  var toggleBtns = document.querySelectorAll('.email-modal-toggle button');
  toggleBtns[0].classList.add('active');
  toggleBtns[1].classList.remove('active');
  document.getElementById('emailModalPreview').style.display = '';
  document.getElementById('emailModalTextarea').style.display = 'none';

  // Room capacity warning
  var banner = document.getElementById('emailModalBanner');
  var accomEl = document.getElementById('sel-accom-' + row);
  var liveAccom = accomEl ? accomEl.value : (a.accommodation || '');
  if (liveAccom && (defaultKey === 'hard-yes' || (resolved.body && resolved.body.indexOf('{{deposit_link}}') !== -1))) {
    var roomInfo = getRoomAvailability(liveAccom);
    if (roomInfo) {
      var held = roomInfo.confirmed + roomInfo.pending;
      if (held >= roomInfo.total) {
        banner.innerHTML = '<i class="ph ph-warning"></i> All <b>' + esc(liveAccom) + '</b> rooms are held or confirmed (' + roomInfo.confirmed + ' paid + ' + roomInfo.pending + ' pending offers). You can still send, but there may not be a spot.';
        banner.className = 'email-modal-banner warn';
      } else if (held >= roomInfo.total - 1) {
        banner.innerHTML = '<i class="ph ph-info"></i> Only <b>1 ' + esc(liveAccom) + '</b> spot remaining (' + roomInfo.confirmed + ' paid + ' + roomInfo.pending + ' pending).';
        banner.className = 'email-modal-banner info';
      } else {
        banner.className = 'email-modal-banner hidden';
      }
    } else {
      banner.className = 'email-modal-banner hidden';
    }
  } else {
    banner.className = 'email-modal-banner hidden';
  }

  document.getElementById('emailModal').classList.remove('hidden');
}

function closeEmailModal() {
  document.getElementById('emailModal').classList.add('hidden');
  document.getElementById('emailModalBanner').className = 'email-modal-banner hidden';
  emailModalRow = null;
}

function switchEmailTemplate() {
  var tplKey = document.getElementById('emailModalTemplate').value;

  // Bulk mode — no single applicant, use raw template with unresolved tags
  if (!emailModalRow) {
    if (!tplKey) {
      document.getElementById('emailModalSubject').value = '';
      document.getElementById('emailModalTextarea').value = '';
      document.getElementById('emailModalPreview').innerHTML = '<p style="color:#888;">Select a template or write your email using merge tags.</p>';
      return;
    }
    var tpl = EMAIL_TEMPLATES_JS[tplKey];
    if (!tpl) return;
    document.getElementById('emailModalSubject').value = tpl.subject || '';
    document.getElementById('emailModalTextarea').value = tpl.body || '';
    document.getElementById('emailModalPreview').innerHTML = markdownToHtmlPreview(tpl.body || '');
    return;
  }

  // Single applicant mode — resolve merge tags
  var a = state.applicants.find(function(x) { return x.row === emailModalRow; });
  if (!a) return;
  var resolved = resolveEmailTemplate(a, tplKey);
  document.getElementById('emailModalSubject').value = resolved.subject;
  document.getElementById('emailModalTextarea').value = resolved.body;
  document.getElementById('emailModalPreview').innerHTML = markdownToHtmlPreview(resolved.body);
}

function insertMergeTag(tag) {
  var textarea = document.getElementById('emailModalTextarea');
  var val = '{{' + tag + '}}';
  // Switch to edit mode if in preview
  if (textarea.style.display === 'none') toggleEmailView('edit');
  var start = textarea.selectionStart;
  var end = textarea.selectionEnd;
  textarea.value = textarea.value.substring(0, start) + val + textarea.value.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + val.length;
  textarea.focus();
}

function toggleEmailView(mode) {
  var toggleBtns = document.querySelectorAll('.email-modal-toggle button');
  var preview = document.getElementById('emailModalPreview');
  var textarea = document.getElementById('emailModalTextarea');
  if (mode === 'preview') {
    toggleBtns[0].classList.add('active');
    toggleBtns[1].classList.remove('active');
    preview.innerHTML = markdownToHtmlPreview(textarea.value);
    preview.style.display = '';
    textarea.style.display = 'none';
  } else {
    toggleBtns[1].classList.add('active');
    toggleBtns[0].classList.remove('active');
    preview.style.display = 'none';
    textarea.style.display = '';
    textarea.focus();
  }
}

async function sendEmailFromModal() {
  if (!emailModalRow) return;
  var subject = document.getElementById('emailModalSubject').value;
  var body = document.getElementById('emailModalTextarea').value;
  var sendBtn = document.getElementById('emailModalSendBtn');
  sendBtn.textContent = 'Sending...';
  sendBtn.disabled = true;

  var result = await apiUpdate('sendCustomEmail', { row: emailModalRow, subject: subject, body: body, resolveTags: true });
  sendBtn.textContent = 'Send Email';
  sendBtn.disabled = false;

  if (result && result.ok) {
    showToast('Email sent', 'success');
    // Update local data
    var a = state.applicants.find(function(x) { return x.row === emailModalRow; });
    if (a) a.emailSent = new Date().toISOString();
    closeEmailModal();
    rerenderSingleCard(emailModalRow);
  } else {
    var errMsg = (result && result.error) ? result.error : 'Failed to send';
    showToast('Error: ' + errMsg, 'error');
  }
}

/**
 * Save all changed fields for a card via the Save button.
 * Reads current values from the dropdowns and sends them all at once.
 */
async function saveCardChanges(row) {
  var a = state.applicants.find(function(x){return x.row === row;});
  if (!a) return;

  var statusEl = document.getElementById('sel-status-' + row);
  var accomEl = document.getElementById('sel-accom-' + row);
  var priceEl = document.getElementById('sel-price-' + row);
  var scholarshipEl = document.getElementById('sel-scholarship-' + row);
  var notesEl = document.getElementById('sel-notes-' + row);
  var saveBtn = document.getElementById('floatingSaveBtn');

  var fields = {};
  var newStatus = statusEl ? statusEl.value : a.status;
  var newAccom = accomEl ? accomEl.value : a.accommodation;
  var newPrice = priceEl ? priceEl.value : a.priceType;
  var newScholarship = scholarshipEl ? scholarshipEl.value : (a.scholarship || '');
  var newNotes = notesEl ? notesEl.value : (a.notes || '');
  var videoEl = document.getElementById('sel-video-' + row);
  var newVideo = videoEl ? videoEl.checked : !!a.personalVideoSent;
  var callTimeEl = document.getElementById('sel-calltime-' + row);
  var newCallTime = callTimeEl ? (callTimeEl.value ? callTimeEl.value + ':00Z' : '') : (a.callTime || '');

  // Read add-on checkboxes
  var liveAddons = {};
  ADDON_DEFS.forEach(function(ad) {
    var el = document.getElementById('addon-' + ad.key + '-' + row);
    if (el && el.checked) liveAddons[ad.key] = true;
  });
  var newAddonsJson = Object.keys(liveAddons).length > 0 ? JSON.stringify(liveAddons) : '';

  // Build the baseline addons from both legacy columns and addonsJson
  // so unchecking a legacy add-on is detected as a real change
  var oldAddons = {};
  if (a.addonBodywork === 'Yes') oldAddons['Bodywork'] = true;
  if (a.addonHealing === 'Yes') oldAddons['Healing'] = true;
  if (a.addonPhotoshoot === 'Yes') oldAddons['Photoshoot'] = true;
  if (a.addonCoaching === 'Yes') oldAddons['Coaching'] = true;
  if (a.addonsJson) {
    try { var oj = JSON.parse(a.addonsJson); for (var ok in oj) { if (oj[ok]) oldAddons[ok] = true; } } catch(e) {}
  }
  var oldAddonsJson = Object.keys(oldAddons).length > 0 ? JSON.stringify(oldAddons) : '';

  if (newStatus !== a.status) fields.status = newStatus;
  if (newAccom !== a.accommodation) fields.accommodation = newAccom;
  if (newPrice !== a.priceType) fields.priceType = newPrice;
  if (newScholarship !== String(a.scholarship || '')) fields.scholarship = newScholarship;
  if (newNotes !== (a.notes || '')) fields.notes = newNotes;
  if (newAddonsJson !== oldAddonsJson) fields.addonsJson = newAddonsJson;
  if (newVideo !== !!a.personalVideoSent) fields.personalVideoSent = newVideo ? "TRUE" : "";
  if (newCallTime !== (a.callTime || '')) fields.callTime = newCallTime;

  if (Object.keys(fields).length === 0) {
    showToast('No changes to save', 'warning');
    return;
  }

  // Disable button while saving
  if (saveBtn) { saveBtn.textContent = 'Saving...'; saveBtn.disabled = true; }

  // Optimistic update
  for (var k in fields) a[k] = fields[k];
  // When addonsJson is saved, clear legacy add-on columns in local state
  // so the re-render doesn't re-check them from stale legacy values
  if (fields.hasOwnProperty('addonsJson')) {
    a.addonBodywork = '';
    a.addonHealing = '';
    a.addonPhotoshoot = '';
    a.addonCoaching = '';
  }

  if (fields.status) {
    var badge = document.querySelector('[data-row="'+row+'"] .status-badge');
    if (badge) {
      var sc = STATUS_COLORS[fields.status] || {bg:'#efefef',fg:'#999'};
      badge.style.background = sc.bg;
      badge.style.color = sc.fg;
      badge.textContent = fields.status;
    }
    var card = document.querySelector('[data-row="'+row+'"]');
    if (card) card.dataset.status = fields.status;
    renderFilterChips();
  }

  var result = await apiUpdate('updateApplicant', { row: row, fields: fields });
  if (saveBtn) { saveBtn.textContent = 'Save Changes'; saveBtn.disabled = false; }

  if (result && result.ok) {
    showToast('Changes saved', 'success');
    delete state.dirtyCards[row];
    // Re-render card to update conditional sections (video checkbox, offer email, payment)
    rerenderSingleCard(row);
    showFloatingSaveForNextDirty();
  } else if (result && result.error) {
    showToast('Error: ' + result.error, 'error');
  } else if (!result) {
    showToast('Saved offline — will sync when connected', 'warning');
    delete state.dirtyCards[row];
    rerenderSingleCard(row);
    showFloatingSaveForNextDirty();
  }
}

/**
 * Update a single field immediately (used for notes onblur and whatsapp checkbox).
 */
async function updateField(row, field, value) {
  var a = state.applicants.find(function(x){return x.row === row;});
  if (a) a[field] = value;

  var result = await apiUpdate('updateApplicant', { row: row, fields: (function(){var o={};o[field]=value;return o;})() });
  if (result && result.ok) {
    showToast(capitalize(field) + ' updated', 'success');
  } else if (result && result.error) {
    showToast('Error: ' + result.error, 'error');
  } else if (!result) {
    showToast('Saved offline — will sync when connected', 'warning');
  }
}

function applyFilter(filter) {
  if (filter === 'all') {
    state.activeFilters = [];
  } else {
    var idx = state.activeFilters.indexOf(filter);
    if (idx !== -1) {
      state.activeFilters.splice(idx, 1);
    } else {
      state.activeFilters.push(filter);
    }
  }
  renderFilterChips();
  scheduleRenderCards();
}

function applySort(sortBy) {
  state.sortBy = sortBy;
  renderCards();
}

function applySearch(query) {
  state.searchQuery = query.trim().toLowerCase();
  var clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.className = 'search-clear' + (query ? ' visible' : '');
  _debouncedRenderCards();
}

function clearSearch() {
  state.searchQuery = '';
  var input = document.getElementById('searchInput');
  if (input) input.value = '';
  var clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.className = 'search-clear';
  renderCards();
}

function matchesSmartFilter(a, filterId) {
  if (filterId === 'smart-paid') return a.status === 'Deposit Paid' || a.status === 'Payment Plan' || a.status === 'Paid in Full';
  if (filterId === 'smart-offer-sent') return !!a.emailSent;
  if (filterId === 'smart-needs-email') return (a.status === 'Hard Yes' || a.status === 'Needs Call') && !a.emailSent;
  if (filterId === 'smart-addons') return hasApplicantAddons(a);
  if (filterId === 'smart-waitlist') return a.status === 'Waitlist';
  return false;
}

var ARCHIVED_STATUSES = ['Not Aligned', 'Maybe Next Year', 'No Longer Interested', 'Cancelled'];

function getFilteredSorted() {
  var list = state.applicants;
  if (state.activeFilters.length > 0) {
    // Separate into status filters and smart filters
    var statusFilters = [];
    var smartFilters = [];
    state.activeFilters.forEach(function(f) {
      if (f.indexOf('smart-') === 0) smartFilters.push(f);
      else statusFilters.push(f);
    });

    list = list.filter(function(a) {
      // Status filters: OR — match any selected status
      var passesStatus = statusFilters.length === 0 || statusFilters.indexOf(a.status) !== -1;
      // Smart filters: AND with status result — must match ALL active smart filters
      var passesSmart = true;
      for (var i = 0; i < smartFilters.length; i++) {
        if (!matchesSmartFilter(a, smartFilters[i])) { passesSmart = false; break; }
      }
      return passesStatus && passesSmart;
    });
  }
  if (activeInvFilter) {
    if (activeInvFilter === 'TOTAL PARTICIPANTS') {
      list = list.filter(function(a) { return !!a.accommodation; });
    } else {
      list = list.filter(function(a) { return String(a.accommodation || '').trim() === activeInvFilter; });
    }
  }
  if (state.searchQuery) {
    var q = state.searchQuery;
    list = list.filter(function(a){
      var full = (a.firstName + ' ' + a.lastName).toLowerCase();
      return full.indexOf(q) !== -1;
    });
  }
  list = list.slice();
  // Sort active and archived separately, then combine
  var active = list.filter(function(a) { return ARCHIVED_STATUSES.indexOf(a.status) === -1; });
  var archived = list.filter(function(a) { return ARCHIVED_STATUSES.indexOf(a.status) !== -1; });
  var sortFn;
  switch(state.sortBy) {
    case 'newest': sortFn = function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);}; break;
    case 'oldest': sortFn = function(a,b){return new Date(a.timestamp)-new Date(b.timestamp);}; break;
    case 'name': sortFn = function(a,b){return (a.firstName+a.lastName).localeCompare(b.firstName+b.lastName);}; break;
    case 'status': sortFn = function(a,b){return STATUSES.indexOf(a.status)-STATUSES.indexOf(b.status);}; break;
  }
  if (sortFn) { active.sort(sortFn); archived.sort(sortFn); }
  return { active: active, archived: archived };
}

// ── HELPERS ──
function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + (type||'success') + ' visible';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove('visible'); }, 2400);
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  var now = Date.now();
  var then = new Date(dateStr).getTime();
  if (isNaN(then)) return '—';
  var diff = now - then;
  var mins = Math.floor(diff/60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  var hrs = Math.floor(mins/60);
  if (hrs < 24) return hrs + 'h ago';
  var days = Math.floor(hrs/24);
  if (days < 30) return days + 'd ago';
  var months = Math.floor(days/30);
  return months + 'mo ago';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function esc(str) {
  if (!str) return '';
  var d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/([A-Z])/g, ' $1');
}

var _countryNames = (function(){
  try { return new Intl.DisplayNames(['en'], {type:'region'}); } catch(e) { return null; }
})();
function tooltip(text) {
  return '<span class="tooltip-icon" tabindex="0" data-tooltip="'+esc(text).replace(/"/g,'&quot;')+'">\u24D8</span>';
}

// ── PORTAL TOOLTIP SYSTEM ──
var _tooltipEl = null;
function _initTooltips() {
  _tooltipEl = document.createElement('div');
  _tooltipEl.className = 'tooltip-portal';
  document.body.appendChild(_tooltipEl);

  document.addEventListener('mouseenter', function(e) {
    var icon = e.target.closest && e.target.closest('.tooltip-icon');
    if (icon && icon.dataset.tooltip) _showTooltip(icon);
  }, true);
  document.addEventListener('mouseleave', function(e) {
    var icon = e.target.closest && e.target.closest('.tooltip-icon');
    if (icon) _hideTooltip();
  }, true);
  document.addEventListener('focusin', function(e) {
    var icon = e.target.closest && e.target.closest('.tooltip-icon');
    if (icon && icon.dataset.tooltip) _showTooltip(icon);
  });
  document.addEventListener('focusout', function(e) {
    var icon = e.target.closest && e.target.closest('.tooltip-icon');
    if (icon) _hideTooltip();
  });
  document.addEventListener('touchstart', function(e) {
    var icon = e.target.closest && e.target.closest('.tooltip-icon');
    if (icon && icon.dataset.tooltip) {
      e.preventDefault();
      _showTooltip(icon);
      setTimeout(_hideTooltip, 3000);
    } else {
      _hideTooltip();
    }
  }, { passive: false });
}

function _showTooltip(icon) {
  if (!_tooltipEl) return;
  var rect = icon.getBoundingClientRect();
  _tooltipEl.textContent = icon.dataset.tooltip;
  // Measure tooltip size
  _tooltipEl.style.left = '0';
  _tooltipEl.style.top = '0';
  _tooltipEl.style.visibility = 'hidden';
  _tooltipEl.classList.add('visible');
  var tipH = _tooltipEl.offsetHeight;
  var tipW = 220;
  _tooltipEl.style.visibility = '';
  // Position above icon, centered
  var left = rect.left + rect.width / 2 - tipW / 2;
  if (left < 8) left = 8;
  if (left + tipW > window.innerWidth - 8) left = window.innerWidth - tipW - 8;
  var top = rect.top - tipH - 8;
  // If no room above, show below
  if (top < 4) {
    top = rect.bottom + 8;
    _tooltipEl.style.setProperty('--arrow-pos', 'above');
  }
  _tooltipEl.style.left = left + 'px';
  _tooltipEl.style.top = top + 'px';
  // Position arrow to point at icon
  var arrowLeft = rect.left + rect.width / 2 - left;
  _tooltipEl.style.setProperty('--arrow-left', arrowLeft + 'px');
}

function _hideTooltip() {
  if (_tooltipEl) _tooltipEl.classList.remove('visible');
}

function formatCurrency(amount) {
  var n = Number(amount);
  if (isNaN(n)) return '\u20AC0';
  var s = n.toFixed(2).replace(/\.00$/, '');
  // Add thousands separator
  var parts = s.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '\u20AC' + parts.join('.');
}

async function createInvoiceFromDashboard(row, type) {
  var typeLabels = { deposit: 'Deposit', full: 'Full Payment', plan: 'Payment Plan', remaining: 'Remaining Balance' };
  var label = typeLabels[type] || type;
  if (!confirm('Create and send ' + label + ' invoice via Stripe?')) return;

  showToast('Creating ' + label + ' invoice\u2026', 'info');
  var result = await apiUpdate('createInvoice', { row: row, type: type });
  if (result && result.ok) {
    var msg = label + ' invoice created and sent!';
    if (result.invoiceUrl) msg += ' Link copied to clipboard.';
    showToast(msg, 'success');
    if (result.invoiceUrl) {
      try { navigator.clipboard.writeText(result.invoiceUrl); } catch(e) {}
    }
  } else {
    showToast('Error: ' + ((result && result.error) || 'Unknown error'), 'error');
  }
}

function buildPaymentSection(a) {
  if (!a.accommodation || !a.priceType) {
    return '<div style="padding-top:12px;padding-bottom:4px;"><p style="font-size:12px;color:var(--text-muted);line-height:1.5;">Set accommodation and price type in Overview to see payment details.</p></div>';
  }

  var prices = ACCOM_PRICES[a.accommodation];
  if (!prices) return '<div style="padding-top:12px;"><p style="font-size:12px;color:var(--text-muted);">Unknown accommodation type.</p></div>';

  var priceKey = PRICE_TYPE_MAP[a.priceType];
  if (!priceKey) return '<div style="padding-top:12px;"><p style="font-size:12px;color:var(--text-muted);">Unknown price type.</p></div>';

  var selectedPrice = prices[priceKey];
  var scholarship = Number(a.scholarship) || 0;
  var isFullPay = priceKey === 'full' || priceKey === 'eb_full';
  var isPlan = !isFullPay;
  var isEB = priceKey === 'eb_plan' || priceKey === 'eb_full';

  // Compute add-on total
  var addonTotal = 0;
  var selectedAddons = [];
  ADDON_DEFS.forEach(function(ad) {
    var hasIt = false;
    if (a.addonsJson) {
      try { var aj = JSON.parse(a.addonsJson); if (aj[ad.key]) hasIt = true; } catch(e) {}
    }
    if (!hasIt) {
      if (ad.key === 'Bodywork' && a.addonBodywork === 'Yes') hasIt = true;
      if (ad.key === 'Healing' && a.addonHealing === 'Yes') hasIt = true;
      if (ad.key === 'Photoshoot' && a.addonPhotoshoot === 'Yes') hasIt = true;
      if (ad.key === 'Coaching' && a.addonCoaching === 'Yes') hasIt = true;
    }
    if (hasIt) { addonTotal += ad.price; selectedAddons.push(ad); }
  });

  var depositPaid = ['Deposit Paid','Payment Plan','Paid in Full'].indexOf(a.status) !== -1;
  var offerSent = !!a.emailSent;
  var allPaid = a.status === 'Paid in Full';

  var afterScholarship = selectedPrice - scholarship;
  if (afterScholarship < 0) afterScholarship = 0;
  var totalWithAddons = afterScholarship + addonTotal;
  var remainingAfterDeposit = totalWithAddons - (depositPaid ? DEPOSIT_AMOUNT : 0);
  if (remainingAfterDeposit < 0) remainingAfterDeposit = 0;

  var row = a.row;
  var accomLabel = a.accommodation === 'Triple' ? 'Triple Room' : (a.accommodation === 'Double' ? 'Double Room' : a.accommodation);

  // ── PLAN VIEW ──
  var planHtml = '<div id="payview-plan-'+row+'" style="'+(isPlan ? '' : 'display:none;')+'">';

  if (allPaid) {
    planHtml += '<div class="invoice-status inv-paid"><div class="i-status-dot"></div><div class="i-status-text"><strong>Paid in full</strong>All payments received</div></div>';
  } else if (depositPaid) {
    planHtml += '<div class="invoice-status inv-paid"><div class="i-status-dot"></div><div class="i-status-text"><strong>Deposit paid</strong>'+formatCurrency(DEPOSIT_AMOUNT)+' received</div></div>';
  } else if (offerSent) {
    planHtml += '<div class="invoice-status inv-sent"><div class="i-status-dot"></div><div class="i-status-text"><strong>Deposit invoice sent</strong>'+formatCurrency(DEPOSIT_AMOUNT)+' due</div></div>';
  }

  // Summary
  planHtml += '<div class="summary-box"><div class="summary-box-header">Summary</div>';
  planHtml += '<div class="summary-row"><span class="summary-row-label">Accommodation</span><span class="summary-row-value">'+esc(accomLabel)+'</span></div>';
  planHtml += '<div class="summary-row"><span class="summary-row-label">Base price</span><span class="summary-row-value">'+formatCurrency(prices.plan)+'</span></div>';
  if (isEB) {
    planHtml += '<div class="summary-row"><span class="summary-row-label">Early bird</span><span class="summary-row-value discount">'+formatCurrency(selectedPrice)+'</span></div>';
  }
  if (scholarship > 0) {
    planHtml += '<div class="summary-row"><span class="summary-row-label">Scholarship</span><span class="summary-row-value discount">&minus; '+formatCurrency(scholarship)+'</span></div>';
  }
  if (addonTotal > 0) {
    planHtml += '<div class="summary-row"><span class="summary-row-label">Add-ons ('+selectedAddons.length+')</span><span class="summary-row-value">+ '+formatCurrency(addonTotal)+'</span></div>';
  }
  if (depositPaid) {
    planHtml += '<div class="summary-row"><span class="summary-row-label">Deposit paid</span><span class="summary-row-value discount">&minus; '+formatCurrency(DEPOSIT_AMOUNT)+'</span></div>';
  }
  planHtml += '<div class="summary-row total"><span class="summary-row-label">Remaining balance</span><span class="summary-row-value">'+formatCurrency(remainingAfterDeposit)+'</span></div>';
  planHtml += '</div>';

  // Instalment schedule
  if (remainingAfterDeposit > 0) {
    var instalmentAmt = Math.floor(remainingAfterDeposit / 3 * 100) / 100;
    var lastAmt = Math.round((remainingAfterDeposit - instalmentAmt * 2) * 100) / 100;

    planHtml += '<div class="installment-box">';
    planHtml += '<div class="installment-header"><span>3 instalments</span><span style="font-weight:500;color:var(--text);">'+formatCurrency(instalmentAmt)+' each</span></div>';
    planHtml += '<div class="installment-row"><div class="i-label"><div class="i-dot'+(depositPaid?' paid':'')+'"></div><div class="i-meta"><span class="i-name">Deposit</span></div></div>';
    planHtml += '<span style="font-weight:500;'+(depositPaid?'color:var(--sage);':'')+'">'+formatCurrency(DEPOSIT_AMOUNT)+(depositPaid?' \u2713':'')+'</span></div>';
    for (var ii = 1; ii <= 3; ii++) {
      var iAmt = ii < 3 ? instalmentAmt : lastAmt;
      var iLabel = ii < 3 ? 'Instalment ' + ii : 'Final Payment';
      planHtml += '<div class="installment-row"><div class="i-label"><div class="i-dot"></div><div class="i-meta"><span class="i-name">'+iLabel+'</span></div></div>';
      planHtml += '<span style="font-weight:500;">'+formatCurrency(iAmt)+'</span></div>';
    }
    planHtml += '</div>';
  }

  // Buttons
  planHtml += '<div class="pay-btn-grid">';
  planHtml += '<div class="pay-btn-row">';
  planHtml += '<button class="pay-btn pay-btn-secondary"'+(offerSent||depositPaid?' disabled':'')+' onclick="event.stopPropagation();createInvoiceFromDashboard('+row+',\'deposit\')">Send Deposit Invoice</button>';
  planHtml += '<button class="pay-btn pay-btn-primary" onclick="event.stopPropagation();createInvoiceFromDashboard('+row+',\'plan\')">Send Payment Schedule</button>';
  planHtml += '</div>';
  planHtml += '<div class="pay-btn-row">';
  planHtml += '<button class="pay-btn pay-btn-secondary" onclick="event.stopPropagation();createInvoiceFromDashboard('+row+',\'remaining\')" title="Calculates total due minus any payments already recorded in the Finances tab.">Send Remaining Invoice '+tooltip('Calculates total due minus any payments already recorded in the Finances tab. Works even if no deposit has been paid yet.')+'</button>';
  planHtml += '<button class="pay-btn pay-btn-ghost">'+formatCurrency(remainingAfterDeposit)+'</button>';
  planHtml += '</div>';
  planHtml += '<p class="pay-btn-note">'+(depositPaid?'Deposit paid':'Deposit not yet paid')+' \u00B7 Remaining = base \u2212 scholarship'+(depositPaid?' \u2212 deposit':'')+'</p>';
  planHtml += '</div>';
  planHtml += '</div>';

  // ── FULL VIEW ──
  var fullPrice = isEB ? prices.eb_full : prices.full;
  var fullAfterScholarship = fullPrice - scholarship;
  if (fullAfterScholarship < 0) fullAfterScholarship = 0;
  var fullWithAddons = fullAfterScholarship + addonTotal;
  var fullRemaining = fullWithAddons - (depositPaid ? DEPOSIT_AMOUNT : 0);
  if (fullRemaining < 0) fullRemaining = 0;

  var fullHtml = '<div id="payview-full-'+row+'" style="'+(isFullPay ? '' : 'display:none;')+'">';

  if (allPaid) {
    fullHtml += '<div class="invoice-status inv-paid"><div class="i-status-dot"></div><div class="i-status-text"><strong>Paid in full</strong>All payments received</div></div>';
  }

  fullHtml += '<div class="summary-box"><div class="summary-box-header">Summary</div>';
  fullHtml += '<div class="summary-row"><span class="summary-row-label">Accommodation</span><span class="summary-row-value">'+esc(accomLabel)+'</span></div>';
  fullHtml += '<div class="summary-row"><span class="summary-row-label">Base price</span><span class="summary-row-value strike">'+formatCurrency(prices.plan)+'</span></div>';
  var discountLabel = isEB ? 'Early bird + full pay' : 'Pay in full (10% off)';
  fullHtml += '<div class="summary-row"><span class="summary-row-label">'+discountLabel+'</span><span class="summary-row-value discount">'+formatCurrency(fullPrice)+'</span></div>';
  if (scholarship > 0) {
    fullHtml += '<div class="summary-row"><span class="summary-row-label">Scholarship</span><span class="summary-row-value discount">&minus; '+formatCurrency(scholarship)+'</span></div>';
  }
  if (addonTotal > 0) {
    fullHtml += '<div class="summary-row"><span class="summary-row-label">Add-ons ('+selectedAddons.length+')</span><span class="summary-row-value">+ '+formatCurrency(addonTotal)+'</span></div>';
  }
  fullHtml += '<div class="summary-row total"><span class="summary-row-label">Total due</span><span class="summary-row-value">'+formatCurrency(fullWithAddons)+'</span></div>';
  fullHtml += '</div>';

  // Buttons
  fullHtml += '<div class="pay-btn-grid">';
  fullHtml += '<div class="pay-btn-row">';
  fullHtml += '<button class="pay-btn pay-btn-secondary"'+(offerSent||depositPaid?' disabled':'')+' onclick="event.stopPropagation();createInvoiceFromDashboard('+row+',\'deposit\')">Send Deposit Invoice</button>';
  fullHtml += '<button class="pay-btn pay-btn-primary" onclick="event.stopPropagation();createInvoiceFromDashboard('+row+',\'full\')">Send Full Invoice</button>';
  fullHtml += '</div>';
  fullHtml += '<div class="pay-btn-row">';
  fullHtml += '<button class="pay-btn pay-btn-secondary" onclick="event.stopPropagation();createInvoiceFromDashboard('+row+',\'remaining\')" title="Calculates total due minus any payments already recorded.">Send Remaining Invoice '+tooltip('Calculates total due minus any payments already recorded in the Finances tab. Works even if no deposit has been paid yet.')+'</button>';
  fullHtml += '<button class="pay-btn pay-btn-ghost">'+formatCurrency(fullRemaining)+'</button>';
  fullHtml += '</div>';
  fullHtml += '<p class="pay-btn-note">Remaining = full amount \u2212 scholarship'+(depositPaid?' \u2212 deposit':'')+'</p>';
  fullHtml += '</div>';
  fullHtml += '</div>';

  // Tab row + both views
  var html = '<div style="padding-top:14px;">';
  html += '<div class="tab-row">';
  html += '<button class="tab-btn'+(isPlan?' active':'')+'" onclick="event.stopPropagation();switchPayTab('+row+',\'plan\')">Payment Plan</button>';
  html += '<button class="tab-btn'+(isFullPay?' active':'')+'" onclick="event.stopPropagation();switchPayTab('+row+',\'full\')">Pay in Full</button>';
  html += '</div>';
  html += planHtml + fullHtml;
  html += '</div>';
  return html;
}

function switchAppTab(row, tab) {
  var answersEl = document.getElementById('appview-answers-' + row);
  var prefsEl = document.getElementById('appview-prefs-' + row);
  var contactEl = document.getElementById('appview-contact-' + row);
  if (answersEl) answersEl.style.display = tab === 'answers' ? 'block' : 'none';
  if (prefsEl) prefsEl.style.display = tab === 'prefs' ? 'block' : 'none';
  if (contactEl) contactEl.style.display = tab === 'contact' ? 'block' : 'none';
  // Update tab buttons — find the Application accordion (second one in the card)
  var card = document.querySelector('[data-row="'+row+'"]');
  if (card) {
    var accordions = card.querySelectorAll('.accordion');
    if (accordions[1]) {
      var tabs = accordions[1].querySelectorAll('.tab-btn');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('active', (tab === 'answers' && i === 0) || (tab === 'prefs' && i === 1) || (tab === 'contact' && i === 2));
      }
    }
  }
}

function switchPayTab(row, view) {
  var planEl = document.getElementById('payview-plan-' + row);
  var fullEl = document.getElementById('payview-full-' + row);
  if (planEl) planEl.style.display = view === 'plan' ? 'block' : 'none';
  if (fullEl) fullEl.style.display = view === 'full' ? 'block' : 'none';
  var card = document.querySelector('[data-row="'+row+'"]');
  if (card) {
    var tabs = card.querySelectorAll('.tab-btn');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.remove('active');
      if ((view === 'plan' && tabs[i].textContent === 'Payment Plan') || (view === 'full' && tabs[i].textContent === 'Pay in Full')) {
        tabs[i].classList.add('active');
      }
    }
  }
}

function countryName(val) {
  if (!val) return '—';
  var s = String(val).trim();
  // If it's a 2-letter code, convert it
  if (s.length === 2 && /^[A-Z]{2}$/i.test(s)) {
    if (_countryNames) {
      try { return _countryNames.of(s.toUpperCase()); } catch(e) {}
    }
  }
  return s;
}

// ── BULK EMAIL MODE ──
var bulkModeActive = false;

function toggleBulkMode() {
  bulkModeActive = !bulkModeActive;
  document.body.classList.toggle('bulk-mode', bulkModeActive);
  var bar = document.getElementById('bulkBar');
  var btn = document.getElementById('bulkToggle');
  if (bulkModeActive) {
    bar.style.display = 'flex';
    btn.textContent = 'Cancel';
    btn.style.background = 'var(--danger, #ef4444)';
    btn.style.color = '#fff';
    // Populate status dropdown
    var sel = document.getElementById('bulkStatusSelect');
    sel.innerHTML = '<option value="">Change Status...</option>';
    STATUSES.forEach(function(s) {
      sel.innerHTML += '<option value="' + s + '">' + s + '</option>';
    });
  } else {
    bar.style.display = 'none';
    btn.textContent = 'Select';
    btn.style.background = '';
    btn.style.color = '';
    document.querySelectorAll('.bulk-check').forEach(function(cb) { cb.checked = false; });
    document.getElementById('bulkSelectAllBtn').textContent = 'Select All';
    document.getElementById('bulkProgress').textContent = '';
    document.getElementById('bulkStatusSelect').value = '';
  }
  updateBulkCount();
}

function updateBulkCount() {
  var checked = document.querySelectorAll('.bulk-check:checked');
  var n = checked.length;
  document.getElementById('bulkCount').textContent = n + ' selected';
  var hasSelection = n > 0;
  document.getElementById('bulkSendBtn').disabled = !hasSelection;
  document.getElementById('bulkDeleteBtn').disabled = !hasSelection;
  document.getElementById('bulkStatusBtn').disabled = !hasSelection || !document.getElementById('bulkStatusSelect').value;
}

async function bulkChangeStatus() {
  var newStatus = document.getElementById('bulkStatusSelect').value;
  if (!newStatus) return;
  var checked = document.querySelectorAll('.bulk-check:checked');
  if (checked.length === 0) return;

  var rows = [];
  checked.forEach(function(cb) { rows.push(Number(cb.dataset.row)); });

  var statusBtn = document.getElementById('bulkStatusBtn');
  var progress = document.getElementById('bulkProgress');
  statusBtn.textContent = 'Updating...';
  statusBtn.disabled = true;

  var updated = 0;
  var errors = [];

  for (var i = 0; i < rows.length; i++) {
    progress.textContent = 'Updating ' + (i + 1) + '/' + rows.length + '...';
    var result = await apiUpdate('updateApplicant', { row: rows[i], fields: { status: newStatus } });
    if (result && result.ok) {
      updated++;
      var a = state.applicants.find(function(x) { return x.row === rows[i]; });
      if (a) a.status = newStatus;
    } else {
      errors.push('Row ' + rows[i] + ': ' + ((result && result.error) || 'failed'));
    }
  }

  statusBtn.textContent = 'Apply Status';
  statusBtn.disabled = false;
  progress.textContent = '';

  if (errors.length === 0) {
    showToast('Updated ' + updated + ' applicants to ' + newStatus, 'success');
    toggleBulkMode();
    loadAll();
  } else {
    showToast(updated + ' updated, ' + errors.length + ' failed', 'error');
    loadAll();
  }
}

async function bulkDelete() {
  var checked = document.querySelectorAll('.bulk-check:checked');
  if (checked.length === 0) return;
  if (!confirm('Delete ' + checked.length + ' applicant(s)? This cannot be undone.')) return;

  var rows = [];
  checked.forEach(function(cb) { rows.push(Number(cb.dataset.row)); });
  // Sort descending so row numbers stay valid as we delete from bottom up
  rows.sort(function(a, b) { return b - a; });

  var deleteBtn = document.getElementById('bulkDeleteBtn');
  var progress = document.getElementById('bulkProgress');
  deleteBtn.textContent = 'Deleting...';
  deleteBtn.disabled = true;

  var deleted = 0;
  var errors = [];

  for (var i = 0; i < rows.length; i++) {
    progress.textContent = 'Deleting ' + (i + 1) + '/' + rows.length + '...';
    var result = await apiUpdate('deleteApplicant', { row: rows[i] });
    if (result && result.ok) {
      deleted++;
    } else {
      errors.push('Row ' + rows[i] + ': ' + ((result && result.error) || 'failed'));
    }
  }

  deleteBtn.textContent = 'Delete';
  deleteBtn.disabled = false;
  progress.textContent = '';

  if (errors.length === 0) {
    showToast('Deleted ' + deleted + ' applicant(s)', 'success');
    toggleBulkMode();
    loadAll();
  } else {
    showToast(deleted + ' deleted, ' + errors.length + ' failed', 'error');
    loadAll();
  }
}

function bulkSelectAll() {
  var checks = document.querySelectorAll('.bulk-check');
  // Only toggle visible cards (not display:none)
  var visible = [];
  checks.forEach(function(cb) {
    var card = cb.closest('article');
    if (card && card.style.display !== 'none') visible.push(cb);
  });
  var allChecked = visible.every(function(cb) { return cb.checked; });
  visible.forEach(function(cb) { cb.checked = !allChecked; });
  document.getElementById('bulkSelectAllBtn').textContent = allChecked ? 'Select All' : 'Deselect All';
  updateBulkCount();
}

function openBulkEmailModal() {
  var checked = document.querySelectorAll('.bulk-check:checked');
  if (checked.length === 0) return;

  var rows = [];
  var emails = [];
  checked.forEach(function(cb) {
    rows.push(Number(cb.dataset.row));
    if (cb.dataset.email) emails.push(cb.dataset.email);
  });

  // Store bulk state
  emailModalRow = null;
  window._bulkRows = rows;

  // Detect common status among selected applicants for default template
  var statusCounts = {};
  rows.forEach(function(r) {
    var a = state.applicants.find(function(x) { return x.row === r; });
    if (a) statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });
  var commonStatus = '';
  var maxCount = 0;
  for (var s in statusCounts) {
    if (statusCounts[s] > maxCount) { maxCount = statusCounts[s]; commonStatus = s; }
  }
  var defaultKey = STATUS_DEFAULT_TEMPLATE[commonStatus] || '';

  // Populate template dropdown
  var tplSelect = document.getElementById('emailModalTemplate');
  var opts = '<option value="">(blank — write from scratch)</option>';
  COMPOSE_TEMPLATES.forEach(function(ct) {
    opts += '<option value="' + ct.key + '"' + (ct.key === defaultKey ? ' selected' : '') + '>' + esc(ct.label) + '</option>';
  });
  tplSelect.innerHTML = opts;

  // Pre-populate from template if we have a default
  var subject = '';
  var body = '';
  if (defaultKey && EMAIL_TEMPLATES_JS[defaultKey]) {
    subject = EMAIL_TEMPLATES_JS[defaultKey].subject || '';
    body = EMAIL_TEMPLATES_JS[defaultKey].body || '';
  }

  // Set up modal for bulk
  document.getElementById('emailModalTitle').textContent = 'Bulk Email (' + rows.length + ' recipients)';
  document.getElementById('emailModalTo').innerHTML = '<strong>To:</strong> ' + rows.length + ' applicants (' + emails.slice(0, 3).join(', ') + (emails.length > 3 ? ', ...' : '') + ')';
  document.getElementById('emailModalSubject').value = subject;
  document.getElementById('emailModalTextarea').value = body;
  document.getElementById('emailModalPreview').innerHTML = body ? markdownToHtmlPreview(body) : '<p style="color:#888;">Select a template or write your email using merge tags.</p>';

  // Show banner
  var banner = document.getElementById('emailModalBanner');
  banner.textContent = 'Sending to ' + rows.length + ' applicants. Merge tags will be resolved per recipient.';
  banner.classList.remove('hidden');

  // Reset to edit mode for bulk
  var toggleBtns = document.querySelectorAll('.email-modal-toggle button');
  toggleBtns[0].classList.remove('active');
  toggleBtns[1].classList.add('active');
  document.getElementById('emailModalPreview').style.display = 'none';
  document.getElementById('emailModalTextarea').style.display = '';

  // Change send button
  var sendBtn = document.getElementById('emailModalSendBtn');
  sendBtn.textContent = 'Send to ' + rows.length + ' applicants';
  sendBtn.onclick = sendBulkEmailFromModal;

  document.getElementById('emailModal').classList.remove('hidden');
}

async function sendBulkEmailFromModal() {
  var rows = window._bulkRows;
  if (!rows || rows.length === 0) return;

  var subject = document.getElementById('emailModalSubject').value;
  var body = document.getElementById('emailModalTextarea').value;
  if (!subject || !body) { showToast('Subject and body required', 'error'); return; }

  var sendBtn = document.getElementById('emailModalSendBtn');
  var progress = document.getElementById('bulkProgress');
  var banner = document.getElementById('emailModalBanner');
  sendBtn.textContent = 'Sending...';
  sendBtn.disabled = true;

  var sent = 0;
  var errors = [];

  for (var i = 0; i < rows.length; i++) {
    progress.textContent = 'Sending ' + (i + 1) + '/' + rows.length + '...';
    banner.textContent = 'Sending email ' + (i + 1) + ' of ' + rows.length + '...';
    banner.style.background = '';
    banner.style.color = '';
    banner.classList.remove('hidden');

    var result = await apiUpdate('sendCustomEmail', { row: rows[i], subject: subject, body: body, resolveTags: true });
    console.log('Bulk send row ' + rows[i] + ':', result);

    if (result && result.ok) {
      sent++;
    } else {
      var errMsg = (result && result.error) ? result.error : 'Network error';
      errors.push('Row ' + rows[i] + ': ' + errMsg);
    }
  }

  sendBtn.disabled = false;
  progress.textContent = '';

  if (errors.length === 0) {
    showToast('Sent to ' + sent + ' applicants', 'success');
    closeEmailModal();
    toggleBulkMode();
    loadAll();
  } else {
    banner.textContent = 'Sent ' + sent + '/' + rows.length + '. Errors: ' + errors.join('; ');
    banner.style.background = '#fef2f2';
    banner.style.color = '#b91c1c';
    banner.classList.remove('hidden');
    showToast(sent + ' sent, ' + errors.length + ' failed', 'error');
    sendBtn.textContent = 'Retry Send';
  }
}

// Override closeEmailModal to reset bulk state
var _origCloseEmailModal = closeEmailModal;
closeEmailModal = function() {
  _origCloseEmailModal();
  window._bulkRows = null;
  var banner = document.getElementById('emailModalBanner');
  banner.classList.add('hidden');
  banner.textContent = '';
  document.getElementById('emailModalTitle').textContent = 'Email Preview';
  var sendBtn = document.getElementById('emailModalSendBtn');
  sendBtn.onclick = sendEmailFromModal;
  sendBtn.textContent = 'Send Email';
};

// ── VIEW SWITCHING ──
var currentView = 'crm';

function switchView(view) {
  currentView = view;
  ['crm', 'calls', 'templates', 'pipeline', 'sequences', 'blasts', 'compass'].forEach(function(v) {
    var panel = document.getElementById('view' + v.charAt(0).toUpperCase() + v.slice(1));
    var btn = document.getElementById('nav' + v.charAt(0).toUpperCase() + v.slice(1));
    if (panel) panel.classList.toggle('active', v === view);
    if (btn) btn.classList.toggle('active', v === view);
  });
  if (view === 'calls') renderCallsPanel();
  if (view === 'templates') renderTemplatesPanel();
  if (view === 'pipeline') renderPipelinePanel();
  if (view === 'sequences') renderSequencesPanel();
  if (view === 'blasts') renderBlastsPanel();
  if (view === 'compass') renderCompassPanel();
}

// ── SCHEDULED BLASTS PANEL ──

var VALID_STATUSES_FOR_BLAST = [
  'Applied','Hard Yes','Needs Call','Call Scheduled','Waitlist','Offer Sent',
  'Ghosted','Deposit Paid','Payment Plan','Paid in Full',
  'Offer Expired','Not Aligned','Maybe Next Year','No Longer Interested','Cancelled'
];

// Portugal (Europe/Lisbon) offset: UTC+1 in summer (WEST), UTC+0 in winter (WET)
// June 2026 = WEST = UTC+1
function utcToLisbon(isoStr) {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleString('en-GB', {
      timeZone: 'Europe/Lisbon',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }) + ' (PT)';
  } catch(e) { return isoStr; }
}

function lisbonToUtc(localDatetimeStr) {
  // localDatetimeStr is "YYYY-MM-DDTHH:MM" from datetime-local input
  // Interpret as Europe/Lisbon, return UTC ISO string
  // Approach: use Intl to find the offset and subtract
  if (!localDatetimeStr) return '';
  try {
    var d = new Date(localDatetimeStr);
    // Get the UTC time that corresponds to this local time in Lisbon
    var lisbonStr = d.toLocaleString('en-US', { timeZone: 'Europe/Lisbon', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var lisbonMs = new Date(lisbonStr).getTime();
    var localMs  = d.getTime();
    var offset   = localMs - lisbonMs; // offset in ms
    return new Date(localMs + offset).toISOString();
  } catch(e) { return new Date(localDatetimeStr).toISOString(); }
}

async function renderBlastsPanel() {
  var panel = document.getElementById('blastsPanel');
  if (!panel) return;
  panel.innerHTML = '<div class="blasts-empty">Loading\u2026</div>';

  var data = await apiGet('getScheduledBlasts', activeRetreat);
  if (!data || !data.ok) {
    panel.innerHTML = '<div class="blasts-empty">Failed to load blasts.</div>';
    return;
  }

  var blasts = data.blasts || [];

  var h = '<div class="blasts-header">';
  h += '<div><h2>Scheduled Blasts</h2><p>Compose an email to a filtered group — it fires automatically at the scheduled time.</p></div>';
  h += '<button class="btn-primary" onclick="openNewBlastModal()"><i class="ph ph-plus"></i> New Blast</button>';
  h += '</div>';

  if (!blasts.length) {
    h += '<div class="blasts-empty">No blasts scheduled yet.<br>Hit "New Blast" to create one.</div>';
  } else {
    // Sort: pending first, then sent, then cancelled
    blasts.sort(function(a, b) {
      var order = { pending: 0, sent: 1, cancelled: 2 };
      return (order[blastStatus(a)] || 0) - (order[blastStatus(b)] || 0);
    });

    blasts.forEach(function(b) {
      var status = blastStatus(b);
      var badgeCls = status;
      var badgeLabel = status === 'sent' ? 'Sent' : status === 'cancelled' ? 'Cancelled' : 'Pending';

      var statusLabels = b.statusFilter ? b.statusFilter.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];
      var filterSummary = statusLabels.length ? statusLabels.join(', ') : 'All statuses';
      if (b.requireEmailSent === 'yes') filterSummary += ' · has received email';
      if (b.requireEmailSent === 'no')  filterSummary += ' · no email yet';
      if (b.retreatId) filterSummary += ' · ' + b.retreatId;

      h += '<div class="blast-card">';
      h += '<div class="blast-card-row">';
      h += '<div><div class="blast-card-name">' + escHtml(b.name) + '</div>';
      h += '<div class="blast-card-meta">';
      h += '\uD83D\uDCCC ' + escHtml(filterSummary) + '<br>';
      if (status === 'sent') {
        h += '\u2705 Sent ' + utcToLisbon(b.sentAt) + ' &bull; ' + b.recipientCount + ' recipient(s)<br>';
      } else {
        h += '\uD83D\uDD52 Scheduled: ' + utcToLisbon(b.scheduledTimeUtc) + '<br>';
      }
      h += '\uD83D\uDCDD ' + escHtml(b.subject);
      h += '</div></div>';
      h += '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0">';
      h += '<span class="blast-badge ' + badgeCls + '">' + badgeLabel + '</span>';
      if (status === 'pending') {
        h += '<button class="blast-cancel-btn" onclick="cancelBlast(\'' + b.blastId + '\')">Cancel</button>';
      }
      h += '</div></div></div>';
    });
  }

  requestAnimationFrame(function() { panel.innerHTML = h; });
}

function blastStatus(b) {
  if (b.cancelled) return 'cancelled';
  if (b.sentAt)    return 'sent';
  return 'pending';
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function cancelBlast(blastId) {
  if (!confirm('Cancel this blast? It will not fire.')) return;
  var result = await apiUpdate('cancelScheduledBlast', { blastId: blastId });
  if (result && result.ok) {
    renderBlastsPanel();
  } else {
    alert('Error: ' + ((result && result.error) || 'Unknown error'));
  }
}

function openNewBlastModal() {
  var overlay = document.createElement('div');
  overlay.className = 'blast-modal-overlay';
  overlay.id = 'blastModalOverlay';

  var statusChips = VALID_STATUSES_FOR_BLAST.map(function(s) {
    return '<label class="blast-status-chip" id="chip_' + s.replace(/\s/g,'_') + '">'
      + '<input type="checkbox" value="' + s + '" onchange="updateStatusChip(this)"> ' + s + '</label>';
  }).join('');

  overlay.innerHTML = '<div class="blast-modal">'
    + '<h3>New Scheduled Blast</h3>'
    + '<div class="blast-field"><label>Name</label><input id="blastName" type="text" placeholder="e.g. Spring promo — Group A"></div>'
    + '<div class="blast-field"><label>Status filter <span style="font-weight:400;text-transform:none">(leave empty = all statuses)</span></label>'
    + '<div class="blast-status-grid">' + statusChips + '</div></div>'
    + '<div class="blast-field"><label>Has received email?</label>'
    + '<select id="blastReqEmail"><option value="either">Either</option><option value="yes">Yes — only people who received an email</option><option value="no">No — only people who haven\'t received an email</option></select></div>'
    + '<div class="blast-field">'
    + '<div class="blast-preview-row"><button class="btn-secondary" onclick="previewBlastCount()">Preview recipients</button><span class="blast-preview-count" id="blastPreviewCount"></span></div>'
    + '</div>'
    + '<div class="blast-field"><label>Subject</label><input id="blastSubject" type="text" placeholder="Subject line (merge tags like {{first_name}} work)"></div>'
    + '<div class="blast-field"><label>Body (markdown, merge tags supported)</label><textarea id="blastBody" placeholder="Hey {{first_name}},\n\n..."></textarea></div>'
    + '<div class="blast-field"><label>Send time — Portugal time (Europe/Lisbon)</label>'
    + '<input id="blastSendTime" type="datetime-local">'
    + '<div class="blast-tz-note">Enter the time you want in Portugal. The system converts to UTC automatically.</div></div>'
    + '<div class="blast-field"><label>Notes (optional)</label><input id="blastNotes" type="text" placeholder="Internal notes"></div>'
    + '<div class="blast-modal-actions">'
    + '<button class="btn-secondary" onclick="closeBlastModal()">Cancel</button>'
    + '<button class="btn-primary" onclick="submitNewBlast()">Schedule Blast</button>'
    + '</div></div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeBlastModal(); });
}

function updateStatusChip(checkbox) {
  var chip = checkbox.closest('.blast-status-chip');
  if (chip) chip.classList.toggle('selected', checkbox.checked);
}

async function previewBlastCount() {
  var statusFilter = Array.from(document.querySelectorAll('.blast-status-chip input:checked')).map(function(c) { return c.value; });
  var requireEmailSent = document.getElementById('blastReqEmail').value;
  var countEl = document.getElementById('blastPreviewCount');
  countEl.textContent = 'Checking\u2026';
  var result = await apiUpdate('previewBlastRecipients', {
    retreatId: activeRetreat,
    statusFilter: statusFilter,
    requireEmailSent: requireEmailSent
  });
  if (result && result.ok) {
    countEl.textContent = result.count + ' recipient' + (result.count !== 1 ? 's' : '');
  } else {
    countEl.textContent = 'Error';
  }
}

function closeBlastModal() {
  var overlay = document.getElementById('blastModalOverlay');
  if (overlay) overlay.remove();
}

async function submitNewBlast() {
  var name             = (document.getElementById('blastName').value || '').trim();
  var subject          = (document.getElementById('blastSubject').value || '').trim();
  var body             = (document.getElementById('blastBody').value || '').trim();
  var sendTimeLocal    = (document.getElementById('blastSendTime').value || '').trim();
  var requireEmailSent = document.getElementById('blastReqEmail').value;
  var notes            = (document.getElementById('blastNotes').value || '').trim();
  var statusFilter     = Array.from(document.querySelectorAll('.blast-status-chip input:checked')).map(function(c) { return c.value; });

  if (!name)          { alert('Please enter a name.'); return; }
  if (!subject)       { alert('Please enter a subject line.'); return; }
  if (!body)          { alert('Please enter the email body.'); return; }
  if (!sendTimeLocal) { alert('Please set a send time.'); return; }

  var scheduledTimeUtc = lisbonToUtc(sendTimeLocal);

  var result = await apiUpdate('createScheduledBlast', {
    name:             name,
    retreatId:        activeRetreat,
    statusFilter:     statusFilter,
    requireEmailSent: requireEmailSent,
    subject:          subject,
    body:             body,
    scheduledTimeUtc: scheduledTimeUtc,
    notes:            notes
  });

  if (result && result.ok) {
    closeBlastModal();
    renderBlastsPanel();
  } else {
    alert('Error: ' + ((result && result.error) || 'Unknown error'));
  }
}

// ── EMAIL TEMPLATES PANEL (tabbed + editable) ──
var TEMPLATE_GROUPS = [
  {
    id: 'decision', title: 'Decision',
    templates: [
      { key: 'hard-yes', name: 'Hard Yes Offer Email', trigger: 'Sent manually when status = Hard Yes + accommodation + price type set', tag: 'manual' },
      { key: 'needs-call', name: 'Follow-up / Schedule Call', trigger: 'Sent manually when status = Needs Call', tag: 'manual' },
      { key: 'waitlist', name: 'Waitlist Placement', trigger: 'Sent automatically when status set to Waitlist', tag: 'auto' },
      { key: 'not-aligned', name: 'Not Aligned', trigger: 'Sent automatically when status set to Not Aligned', tag: 'auto' }
    ]
  },
  {
    id: 'ghost', title: 'Ghost Protocol',
    templates: [
      { key: 'ghost-1', name: 'Email 1 — Just checking in', trigger: 'Day 3 after status set to Ghosted' },
      { key: 'ghost-2', name: 'Email 2 — Still thinking it over?', trigger: 'Day 7 after Ghosted' },
      { key: 'ghost-3', name: 'Email 3 — Your spot is almost gone', trigger: 'Day 11 after Ghosted' },
      { key: 'ghost-4', name: 'Email 4 — Last call', trigger: 'Day 15 after Ghosted (final)' }
    ]
  },
  {
    id: 'deposit', title: 'Deposit Reminders',
    templates: [
      { key: 'deposit-reminder-1', name: 'Reminder 1 — Spot held', trigger: 'Day 3 after offer sent, deposit unpaid' },
      { key: 'deposit-reminder-2', name: 'Reminder 2 — Final reminder', trigger: 'Day 5 after offer sent, deposit unpaid' }
    ]
  },
  {
    id: 'payment', title: 'Payment',
    templates: [
      { key: 'payment-reminder', name: 'Payment Plan Reminder', trigger: '5 days before instalment due date' }
    ]
  },
  {
    id: 'waitlist', title: 'Waitlist',
    templates: [
      { key: 'waitlist-spot-open', name: 'Spot Opened Notification', trigger: 'When a confirmed applicant cancels/withdraws' },
      { key: 'waitlist-spot-filled', name: 'Spot Filled Follow-up', trigger: '48 hours after spot-open notification' }
    ]
  },
];

var activeTplTab = 'decision';
var serverTemplates = null; // loaded from API

async function loadServerTemplates() {
  var data = await apiGet('getEmailTemplates');
  if (data && data.ok && data.templates) {
    serverTemplates = data.templates;
    // Merge server overrides into local JS copy
    for (var key in serverTemplates) {
      EMAIL_TEMPLATES_JS[key] = serverTemplates[key];
    }
  }
}

function renderTemplatesPanel() {
  var panel = document.getElementById('templatesPanel');

  // Tab bar
  var tabsHtml = '<div class="tpl-tabs">';
  TEMPLATE_GROUPS.forEach(function(g) {
    tabsHtml += '<button class="tpl-tab' + (g.id === activeTplTab ? ' active' : '') + '" onclick="switchTplTab(\'' + g.id + '\')">' + esc(g.title) + '</button>';
  });
  tabsHtml += '</div>';

  // Find active group
  var group = TEMPLATE_GROUPS.find(function(g) { return g.id === activeTplTab; }) || TEMPLATE_GROUPS[0];

  var html = tabsHtml;
  html += '<div class="tpl-group">';
  group.templates.forEach(function(t) {
    var tpl = EMAIL_TEMPLATES_JS[t.key];
    var subject = '';
    var body = '';
    if (tpl) {
      subject = tpl.subject || '';
      body = tpl.body || '';
    }
    var bodyHighlighted = esc(body).replace(/\{\{(\w+)\}\}/g, '<span class="tpl-merge-tag">{{$1}}</span>');
    html += '<div class="tpl-card" id="tpl-' + t.key + '">'
      + '<div class="tpl-card-header" onclick="toggleTplCard(\'' + t.key + '\')">'
      + '<div>'
      + '<div class="tpl-card-name">' + esc(t.name) + (t.tag ? ' <span class="tpl-tag tpl-tag-' + t.tag + '">' + t.tag + '</span>' : '') + '</div>'
      + '<div class="tpl-card-trigger">' + esc(t.trigger) + '</div>'
      + (subject ? '<div class="tpl-card-subject">' + esc(subject) + '</div>' : '')
      + '</div>'
      + '<div class="tpl-card-actions">'
      + '<button class="tpl-action-btn" onclick="event.stopPropagation();editTemplate(\'' + t.key + '\')" title="Edit template"><i class="ph ph-pencil-simple"></i></button>'
      + '<button class="tpl-action-btn" onclick="event.stopPropagation();copyTemplate(\'' + t.key + '\')" title="Copy template"><i class="ph ph-copy"></i></button>'
      + '<svg class="tpl-expand-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>'
      + '</div></div>';
    // Read-only body
    if (tpl) {
      html += '<div class="tpl-card-body">' + bodyHighlighted + '</div>';
    } else {
      html += '<div class="tpl-card-body tpl-placeholder">Template not yet written</div>';
    }
    // Edit area (hidden until edit mode)
    html += '<div class="tpl-edit-area" id="tpl-edit-' + t.key + '">'
      + '<div class="tpl-edit-label">Subject</div>'
      + '<input class="tpl-edit-input" id="tpl-subj-' + t.key + '" value="' + esc(subject).replace(/"/g, '&quot;') + '" placeholder="Email subject line">'
      + '<div class="tpl-edit-label">Body <span style="text-transform:none;font-weight:400;letter-spacing:0">(Markdown)</span></div>'
      + '<textarea class="tpl-edit-textarea" id="tpl-body-' + t.key + '" placeholder="Write your email body...">' + esc(body) + '</textarea>'
      + '<div class="tpl-merge-hint">Merge tags: <code>{{first_name}}</code> <code>{{retreat_name}}</code> <code>{{country}}</code> <code>{{deposit_amount}}</code> <code>{{deposit_link}}</code> <code>{{cal_link}}</code> <code>{{open_spots}}</code> <code>{{payment_summary}}</code></div>'
      + '<div class="tpl-edit-btns">'
      + '<button class="tpl-btn-cancel" onclick="cancelEditTemplate(\'' + t.key + '\')">Cancel</button>'
      + '<button class="tpl-btn-save" id="tpl-save-' + t.key + '" onclick="saveTemplate(\'' + t.key + '\')">Save</button>'
      + '</div></div>';
    html += '</div>';
  });
  html += '</div>';
  panel.innerHTML = html;

  // Load from server on first render
  if (!serverTemplates) {
    loadServerTemplates().then(function() {
      // Re-render if templates changed
      if (currentView === 'templates') renderTemplatesPanel();
    });
  }
}

function switchTplTab(tabId) {
  activeTplTab = tabId;
  renderTemplatesPanel();
}

function toggleTplCard(key) {
  var card = document.getElementById('tpl-' + key);
  if (!card) return;
  // Don't toggle if in edit mode
  if (card.classList.contains('editing')) return;
  card.classList.toggle('open');
}

function editTemplate(key) {
  var card = document.getElementById('tpl-' + key);
  if (!card) return;
  card.classList.remove('open');
  card.classList.add('editing');
}

function cancelEditTemplate(key) {
  var card = document.getElementById('tpl-' + key);
  if (!card) return;
  card.classList.remove('editing');
  // Reset fields to current values
  var tpl = EMAIL_TEMPLATES_JS[key] || {};
  var subjInput = document.getElementById('tpl-subj-' + key);
  var bodyInput = document.getElementById('tpl-body-' + key);
  if (subjInput) subjInput.value = tpl.subject || '';
  if (bodyInput) bodyInput.value = tpl.body || '';
}

async function saveTemplate(key) {
  var subjInput = document.getElementById('tpl-subj-' + key);
  var bodyInput = document.getElementById('tpl-body-' + key);
  var saveBtn = document.getElementById('tpl-save-' + key);
  if (!subjInput || !bodyInput) return;

  var subject = subjInput.value.trim();
  var body = bodyInput.value;
  if (!subject) { showToast('Subject is required', 'error'); return; }

  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;

  var result = await apiUpdate('saveEmailTemplate', { key: key, subject: subject, body: body });

  saveBtn.textContent = 'Save';
  saveBtn.disabled = false;

  if (result && result.ok) {
    // Update local copy
    EMAIL_TEMPLATES_JS[key] = { subject: subject, body: body };
    showToast('Template saved', 'success');
    // Close edit mode and re-render to show updated content
    var card = document.getElementById('tpl-' + key);
    if (card) card.classList.remove('editing');
    renderTemplatesPanel();
  } else {
    showToast('Save failed: ' + ((result && result.error) || 'Unknown error'), 'error');
  }
}

function copyTemplate(key) {
  var tpl = EMAIL_TEMPLATES_JS[key];
  if (!tpl) return;
  var text = 'Subject: ' + (tpl.subject || '') + '\n\n' + (tpl.body || '');
  navigator.clipboard.writeText(text).then(function() {
    showToast('Copied!', 'success');
  });
}

// ── CALLS PANEL ──
function formatInTz(isoStr, tzName) {
  try {
    var d = new Date(isoStr);
    var opts = { timeZone: tzName, hour: 'numeric', minute: '2-digit', hour12: true };
    var time = d.toLocaleTimeString('en-US', opts);
    var dateOpts = { timeZone: tzName, weekday: 'short', month: 'short', day: 'numeric' };
    var date = d.toLocaleDateString('en-US', dateOpts);
    return { time: time, date: date };
  } catch(e) {
    return { time: '—', date: '' };
  }
}

function getDayKeyInTz(isoStr, tz) {
  var d = new Date(isoStr);
  var opts = { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' };
  return d.toLocaleDateString('en-CA', opts); // YYYY-MM-DD
}

function renderCallsPanel() {
  var panel = document.getElementById('callsPanel');

  // Gather all applicants with callTime and status = Call Scheduled, excluding past calls
  var now = Date.now();
  var calls = state.applicants.filter(function(a) {
    if (!a.callTime || a.status !== 'Call Scheduled') return false;
    return new Date(a.callTime).getTime() >= now - 3600000; // include calls up to 1hr ago (in case still ongoing)
  }).map(function(a) {
    return {
      row: a.row,
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      country: a.country,
      status: a.status,
      callTime: a.callTime,
      zoomLink: a.zoomLink || '',
      iso: new Date(a.callTime).getTime()
    };
  }).sort(function(a, b) { return a.iso - b.iso; });

  var html = '<div class="calls-header">'
    + '<h2>Upcoming Calls</h2>'
    + '<p>Showing all scheduled discovery calls across timezones</p>'
    + '</div>';

  if (calls.length === 0) {
    html += '<div class="calls-empty">No upcoming calls scheduled.</div>';
    requestAnimationFrame(function() { panel.innerHTML = html; });
    return;
  }

  // Group by day (in NZ timezone since that's Ethan's)
  var groups = {};
  var groupOrder = [];
  var todayKey = getDayKeyInTz(new Date().toISOString(), 'Pacific/Auckland');

  calls.forEach(function(c) {
    var dayKey = getDayKeyInTz(c.callTime, 'Pacific/Auckland');
    if (!groups[dayKey]) {
      groups[dayKey] = [];
      groupOrder.push(dayKey);
    }
    groups[dayKey].push(c);
  });

  groupOrder.forEach(function(dayKey) {
    var isToday = dayKey === todayKey;
    var dayLabel = isToday ? 'Today' : new Date(dayKey + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    html += '<div class="calls-day-group">';
    html += '<div class="calls-day-label' + (isToday ? ' today' : '') + '">' + dayLabel + '</div>';

    groups[dayKey].forEach(function(c) {
      var nz = formatInTz(c.callTime, 'Pacific/Auckland');
      var pt = formatInTz(c.callTime, 'Europe/Lisbon');
      var et = formatInTz(c.callTime, 'America/New_York');
      // Attendee's own timezone — use their country as a hint, but show UTC as fallback
      var attendee = formatInTz(c.callTime, 'UTC');
      var attendeeLabel = 'Attendee (UTC)';
      if (c.country) attendeeLabel = esc(c.country);

      var sc = STATUS_COLORS[c.status] || { bg: '#efefef', fg: '#999' };

      html += '<div class="call-card">'
        + '<div class="call-card-header">'
        + '<div>'
        + '<div class="call-card-name">' + esc(c.firstName + ' ' + c.lastName) + '</div>'
        + '<div class="call-card-email">' + esc(c.email) + (c.country ? ' · ' + esc(c.country) : '') + '</div>'
        + '</div>'
        + '<div class="call-card-status" style="background:' + sc.bg + ';color:' + sc.fg + '">Call Scheduled</div>'
        + '</div>'
        + '<div class="call-tz-grid">'
        + '<div class="call-tz-block">'
        + '<div class="call-tz-flag">&#127475;&#127487;</div>'
        + '<div class="call-tz-label">Ethan</div>'
        + '<div class="call-tz-time">' + esc(nz.time) + '</div>'
        + '<div class="call-tz-date">' + esc(nz.date) + '</div>'
        + '</div>'
        + '<div class="call-tz-block">'
        + '<div class="call-tz-flag">&#127477;&#127481;</div>'
        + '<div class="call-tz-label">Gabi</div>'
        + '<div class="call-tz-time">' + esc(pt.time) + '</div>'
        + '<div class="call-tz-date">' + esc(pt.date) + '</div>'
        + '</div>'
        + '<div class="call-tz-block">'
        + '<div class="call-tz-flag">&#127482;&#127480;</div>'
        + '<div class="call-tz-label">Eastern</div>'
        + '<div class="call-tz-time">' + esc(et.time) + '</div>'
        + '<div class="call-tz-date">' + esc(et.date) + '</div>'
        + '</div>'
        + '<div class="call-tz-block">'
        + '<div class="call-tz-flag">&#127760;</div>'
        + '<div class="call-tz-label">' + attendeeLabel + '</div>'
        + '<div class="call-tz-time">' + esc(attendee.time) + '</div>'
        + '<div class="call-tz-date">' + esc(attendee.date) + '</div>'
        + '</div>'
        + '</div>'
        + (c.zoomLink ? '<div class="call-card-actions"><a href="' + esc(c.zoomLink) + '" target="_blank" rel="noopener" class="call-zoom-btn">Join Zoom</a></div>' : '')
        + '</div>';
    });

    html += '</div>';
  });

  requestAnimationFrame(function() { panel.innerHTML = html; });
}

// ── PIPELINE GUIDE PANEL (dark theme, matches status-flow.html) ──
// ── THE COMPASS PANEL ──
var activeCompassTab = 'flow';
var compassCache = null;

function switchCompassTab(tab) {
  activeCompassTab = tab;
  ['flow','objections','pricing','reminders'].forEach(function(t) {
    var el = document.getElementById('compassTab_' + t);
    var btn = document.getElementById('compassBtn_' + t);
    if (el) el.classList.toggle('active', t === tab);
    if (btn) btn.classList.toggle('active', t === tab);
  });
}

function renderCompassPanel() {
  var panel = document.getElementById('compassPanel');

  // Load from API (cached after first fetch)
  if (!compassCache) {
    panel.innerHTML = '<div style="text-align:center;padding:60px 0;color:var(--text-muted);">Loading Compass\u2026</div>';
    fetch(API_URL + '?action=getCompass')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.ok && data.phases) {
          compassCache = data;
        }
        renderCompassPanel();
      })
      .catch(function() { renderCompassPanel(); });
    return;
  }

  var phases = compassCache && compassCache.phases ? compassCache.phases : [
    { name: 'Rapport', goal: 'Relax the conversation and establish warmth.',
      anchor: 'Where are you calling from?',
      options: [
        'How did you first come to yoga or meditation?',
        'What does life look like day to day for you right now?',
        'What\u2019s been most alive for you lately?',
        'What season of life does it feel like you\u2019re in right now?',
        'What made now feel like the moment to explore something like this?'
      ],
      transitions: [
        'So tell me \u2014 what made you decide to book this call?',
        'What\u2019s been pulling you toward something like this now?',
        'What feels like it\u2019s wanting to change for you?'
      ] },
    { name: 'Explore', goal: 'Surface the real struggle or desire.',
      anchor: 'What\u2019s actually going on in your life right now that brought you here? Because people don\u2019t fill out a four-page application because something looked nice \u2014 something in you was already moving toward this.',
      options: [
        'What have you tried before that hasn\u2019t fully stuck?',
        'Where do you feel the gap most strongly right now?',
        'What feels hardest to shift on your own?',
        'What keeps repeating, even though part of you is ready for something different?',
        'If you\u2019re honest, what feels out of alignment right now?'
      ],
      transitions: [
        'And if that actually shifted, what would change?',
        'If this really worked, what would become possible?',
        'What do you imagine life could feel like on the other side of this?'
      ] },
    { name: 'The Bridge', goal: 'Reflect their words back. Connect what they just described to why the container is the answer.',
      anchor: 'You don\u2019t pitch here. You reflect. Use their exact words, then explain why ten days works when everything else hasn\u2019t.',
      anchorLabel: 'Anchor Statement',
      optionsLabel: 'Bridge Lines',
      options: [
        'Everything you just described \u2014 that\u2019s not a discipline problem. You\u2019ve been trying to complete an inside job from the outside.',
        'The reason the inspiration fades isn\u2019t the practice. It\u2019s that you step back into the same environment that created the pattern.',
        'What these ten days do is remove every variable that normally pulls you back before the shift can complete.',
        'This isn\u2019t another technique. It\u2019s the first time the conditions are actually right.'
      ],
      transitions: [
        'Does this retreat feel like the kind of container that could help create that?',
        'Does this feel aligned with what you\u2019re actually looking for?',
        'Can you see how a week like this could support that shift?'
      ] },
    { name: 'Alignment', goal: 'Confirm desire before discussing money.',
      anchor: 'Does this retreat feel like what you\u2019ve been looking for?',
      options: [
        'Does this feel like the right next step for you?',
        'If the logistics worked out, would you want to join us?',
        'Can you feel yourself wanting to say yes to this?',
        'Does this feel like the kind of reset you\u2019ve really been craving?',
        'From everything we\u2019ve talked about, does this feel aligned?'
      ],
      transitions: [
        'Okay, let\u2019s look at whether this makes sense practically.',
        'Beautiful \u2014 then the next thing is just to look at the logistics.',
        'Great. So now let\u2019s see what this would look like in practical terms.'
      ] },
    { name: 'Logistics', goal: 'Walk through options calmly and clearly.',
      anchor: 'Want me to walk you through the room options and pricing?',
      options: [
        'You may remember the pricing from the application page, but I\u2019ll walk you through it again so it\u2019s clear.',
        'We have three accommodation options depending on how much privacy you want during the week.',
        'Normally the retreat ranges from about \u20AC2,850 to \u20AC3,690 depending on the room.',
        'Right now the early-bird pricing is still available.',
        'The deposit to secure a spot is \u20AC350, and the rest can be paid either in full or on a payment plan.'
      ],
      transitions: [
        'Which option feels most aligned for you?',
        'How does that land for you?',
        'Which of those feels like the best fit?'
      ] },
    { name: 'Decision', goal: 'Surface hesitation and invite honesty.',
      anchor: 'What is the one thing stopping you from saying yes right now?',
      options: [
        'What would need to be true for you to join?',
        'What feels like the real hesitation for you?',
        'What part of this still feels unresolved?',
        'Is there anything practical or emotional that still feels in the way?',
        'What\u2019s the main thing you\u2019d want to get clear on before deciding?'
      ],
      transitions: [
        'Let\u2019s talk through that.',
        'Say a bit more about that.',
        'Okay \u2014 let\u2019s look at that together.'
      ] }
  ];

  var spokenPricing = compassCache && compassCache.spokenPricing ? compassCache.spokenPricing : [
    { label: 'Short Version', text: 'Loading\u2026' },
    { label: 'Full Version', text: 'Loading\u2026' },
    { label: 'Payment Plan Version', text: 'Loading\u2026' }
  ];

  // Icon mapping by objection label
  var objIconMap = {
    'Money / Affordability': '<i class="ph ph-coin"></i>',
    'Need to Think': '<i class="ph ph-clock"></i>',
    'Waiting on Flight': '<i class="ph ph-airplane-tilt"></i>',
    'Nothing Stuck Before': '<i class="ph ph-arrows-clockwise"></i>',
    'Am I Ready?': '<i class="ph ph-plant"></i>'
  };
  var defaultIcon = '<i class="ph ph-chat-circle-dots"></i>';

  var objections3A = compassCache && compassCache.objections && compassCache.objections.length ? compassCache.objections : [
    { label: 'Money / Affordability', quote: 'I can\u2019t afford it right now',
      ack: 'I hear you \u2014 and I want to be honest with you rather than just try to overcome that.',
      assoc: 'That\u2019s actually what most of our committed participants said before they found a way to make it work.',
      asks: ['Is it the total amount, or is it more about the timing of payments?', 'If money weren\u2019t a factor at all \u2014 would this feel like a yes?', 'What would it cost you to stay in the same pattern for another year?'] },
    { label: 'Need to Think', quote: 'I need to think about it',
      ack: 'Of course \u2014 this is a real decision and I respect that you\u2019re taking it seriously.',
      assoc: 'The people who think most carefully about this decision are usually the ones who get the most from it.',
      asks: ['What specifically do you need to think through?', 'When you check in with your body \u2014 not your mind \u2014 what does it say?', 'What would make this a no?'] },
    { label: 'Waiting on Flight', quote: 'I\u2019m waiting to see if I win the flight',
      ack: 'That makes complete sense \u2014 and I love that you\u2019re already thinking practically about how to make it work.',
      assoc: 'I love that you\u2019re already problem-solving how to make it happen \u2014 that tells me something about how much you want this.',
      asks: ['If the flight wasn\u2019t part of the equation at all \u2014 is this something that feels right for you?', 'The deposit just holds your spot. Does \u20AC350 today feel doable regardless?'] },
    { label: 'Nothing Stuck Before', quote: 'I\u2019ve done retreats before and nothing stuck',
      ack: 'That\u2019s actually the most honest thing someone can say \u2014 and it tells me you\u2019ve gone deep enough to know the difference.',
      assoc: 'That\u2019s honestly the most common thing I hear from the people who end up having the biggest breakthroughs.',
      asks: ['What do you think pulled you back last time \u2014 not logistically, but internally?', 'What would it mean if this time it actually did stick?', 'The shift was real \u2014 what wasn\u2019t there was the infrastructure to sustain it.'] },
    { label: 'Am I Ready?', quote: 'I\u2019m not sure I\u2019m ready / what if it doesn\u2019t stick?',
      ack: 'I\u2019m glad you said that. People who haven\u2019t gone deep don\u2019t ask that question.',
      assoc: 'The fact that you\u2019re asking that question is usually the clearest sign that you are.',
      asks: ['What would another year of almost-but-not-quite cost you?', 'What do you think has been getting in the way?', 'What would your life look like if this time something fundamental actually shifted?'] }
  ];

  var tiers = [
    { name: 'Triple Room', prices: [{ label: 'Plan', val: '\u20AC2,850' }, { label: 'Full', val: '\u20AC2,555' }, { label: 'Early Bird Plan', val: '\u20AC2,565' }, { label: 'Early Bird Full', val: '\u20AC2,220' }], perday: '\u20AC255/day' },
    { name: 'Double Room', prices: [{ label: 'Plan', val: '\u20AC3,240' }, { label: 'Full', val: '\u20AC2,888' }, { label: 'Early Bird Plan', val: '\u20AC2,910' }, { label: 'Early Bird Full', val: '\u20AC2,555' }], perday: '\u20AC288/day' },
    { name: 'Glamping', prices: [{ label: 'Plan', val: '\u20AC3,690' }, { label: 'Full', val: '\u20AC3,690' }, { label: 'Early Bird Plan', val: '\u20AC3,330' }, { label: 'Early Bird Full', val: '\u20AC2,999' }], perday: '\u20AC369/day' }
  ];

  var closes = [
    'The deposit is \u20AC350. Not the full amount.',
    'Ask once. Then stop talking.',
    'Silence is not awkward \u2014 it\u2019s working.',
    'An objection is a question in disguise.',
    'When they start doing their own math out loud, help them solve it \u2014 don\u2019t agree it\u2019s unsolvable.',
    'They came to this call because something in them already said yes.'
  ];

  var tabLabels = [
    { id: 'flow', label: 'Call Flow' },
    { id: 'objections', label: 'Objections' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'reminders', label: 'Reminders' }
  ];

  var h = '<div class="compass-header"><h2>The Compass</h2><p>Discovery call guide for Ethan &amp; Gabi</p></div>';

  // Mantra box
  h += '<div class="compass-mantra">This retreat is for people who have been doing the work but still feel like something fundamental hasn\u2019t shifted.</div>';

  // Tabs
  h += '<div class="compass-tabs">';
  tabLabels.forEach(function(t) {
    h += '<button class="compass-tab' + (t.id === activeCompassTab ? ' active' : '') + '" id="compassBtn_' + t.id + '" onclick="switchCompassTab(\'' + t.id + '\')">' + t.label + '</button>';
  });
  h += '</div>';

  // TAB 1 — Call Flow (horizontal scroll)
  h += '<div class="compass-tab-content' + (activeCompassTab === 'flow' ? ' active' : '') + '" id="compassTab_flow">';
  h += '<div class="compass-nav-strip" id="compassNavStrip">';
  phases.forEach(function(p, i) {
    if (i > 0) h += '<span class="compass-nav-sep">-----</span>';
    h += '<span class="compass-nav-label' + (i === 0 ? ' active' : '') + '" data-nav="' + (i + 1) + '">' + p.name + '</span>';
  });
  h += '</div>';
  h += '<div class="compass-scroll-wrap">';
  h += '<div class="compass-phase-track" id="compassPhaseTrack">';
  phases.forEach(function(p, i) {
    h += '<div class="compass-phase" data-phase="' + (i + 1) + '" id="compassPhase_' + i + '">'
      + '<button class="compass-edit-toggle" onclick="toggleCompassEdit(' + i + ')" title="Edit this phase">\u270E</button>'
      + '<div class="compass-phase-num">Phase ' + (i + 1) + '</div>'
      + '<div class="compass-phase-name">' + p.name + '</div>'
      + '<div class="compass-field-label">Goal</div>'
      + '<div class="compass-goal compass-editable" data-field="goal" data-phase="' + i + '">'
      + '<span class="ce-text">' + p.goal + '</span>'
      + '<span class="ce-actions"><button class="ce-btn" onclick="ceEdit(this)" title="Edit">\u270E</button></span>'
      + '</div>'
      + '<div class="compass-field-label">' + (p.anchorLabel || 'Anchor Question') + '</div>'
      + '<div class="compass-anchor compass-editable" data-field="anchor" data-phase="' + i + '">'
      + '<span class="ce-text">\u201C' + p.anchor + '\u201D</span>'
      + '<span class="ce-actions"><button class="ce-btn" onclick="ceEdit(this)" title="Edit">\u270E</button></span>'
      + '</div>';
    // Spoken Pricing Flow for Logistics
    if (p.name === 'Logistics') {
      h += '<div class="compass-spoken-pricing">'
        + '<div class="compass-spoken-pricing-title">Spoken Pricing Flow</div>';
      spokenPricing.forEach(function(sp, si) {
        h += '<div class="compass-script-card compass-editable" data-field="pricing" data-idx="' + si + '">'
          + '<div class="compass-script-label">' + sp.label + '</div>'
          + '<div class="compass-script-text"><span class="ce-text">\u201C' + sp.text.replace(/\n/g, '<br>') + '\u201D</span></div>'
          + '<span class="ce-actions"><button class="ce-btn" onclick="ceEdit(this)" title="Edit">\u270E</button></span>'
          + '</div>';
      });
      h += '</div>';
    } else {
      h += '<div class="compass-field-label">' + (p.optionsLabel || 'More Options') + '</div>'
        + '<div class="compass-more-options" id="ceOpts_' + i + '">';
      (p.options || []).forEach(function(q, qi) {
        h += '<div class="compass-option-chip compass-editable" data-field="option" data-phase="' + i + '" data-idx="' + qi + '">'
          + '<span class="ce-text">\u201C' + q + '\u201D</span>'
          + '<span class="ce-actions"><button class="ce-btn" onclick="ceEdit(this)" title="Edit">\u270E</button>'
          + '<button class="ce-btn ce-del" onclick="ceDel(this)" title="Remove">\u2715</button></span>'
          + '</div>';
      });
      h += '<button class="compass-add-btn" onclick="ceAdd(' + i + ',\'option\')">+ Add option</button>';
      h += '</div>';
    }
    h += '<div class="compass-field-label">Transition Options</div>'
      + '<div class="compass-transitions" id="ceTrans_' + i + '">';
    (p.transitions || []).forEach(function(t, ti) {
      h += '<div class="compass-transition-chip compass-editable" data-field="transition" data-phase="' + i + '" data-idx="' + ti + '">'
        + '<span class="ce-text">\u201C' + t + '\u201D</span>'
        + '<span class="ce-actions"><button class="ce-btn" onclick="ceEdit(this)" title="Edit">\u270E</button>'
        + '<button class="ce-btn ce-del" onclick="ceDel(this)" title="Remove">\u2715</button></span>'
        + '</div>';
    });
    h += '<button class="compass-add-btn" onclick="ceAdd(' + i + ',\'transition\')">+ Add transition</button>';
    h += '</div>';
    h += '<div class="compass-save-bar"><button class="compass-save-btn" onclick="ceSave(' + i + ')">Save Changes</button><div class="compass-save-status" id="ceSaveStatus_' + i + '"></div></div>';
    h += '</div>';
  });
  h += '</div></div>';

  // Conversation Lifelines (below scroll track)
  h += '<div class="compass-lifelines">'
    + '<div class="compass-lifelines-title">Lifelines</div>'
    + '<div class="compass-lifeline">\u201CTell me more about that.\u201D</div>'
    + '<div class="compass-lifeline">\u201CHow long has that been going on?\u201D</div>'
    + '<div class="compass-lifeline">\u201CWhat made you book the call today?\u201D</div>'
    + '</div>';

  h += '</div>';

  // TAB 2 — Objections (3A Framework)
  h += '<div class="compass-tab-content' + (activeCompassTab === 'objections' ? ' active' : '') + '" id="compassTab_objections">';

  // 3A reference bar
  h += '<div class="compass-3a-bar">'
    + '<div class="compass-3a-step"><div class="compass-3a-label ack">Acknowledge</div><div class="compass-3a-example">\u201CI hear you. And honestly, that makes complete sense.\u201D</div></div>'
    + '<div class="compass-3a-step"><div class="compass-3a-label assoc">Associate</div><div class="compass-3a-example">\u201CThat\u2019s actually the question that the people who get the most from this always ask.\u201D</div></div>'
    + '<div class="compass-3a-step"><div class="compass-3a-label ask">Ask</div><div class="compass-3a-example">\u201CWhy that particular question?\u201D</div></div>'
    + '</div>';

  // Objection nav strip
  h += '<div class="compass-obj-nav" id="compassObjNav">';
  objections3A.forEach(function(o, oi) {
    if (oi > 0) h += '<span class="compass-obj-nav-sep">\u00B7</span>';
    h += '<span class="compass-obj-nav-label' + (oi === 0 ? ' active' : '') + '" data-objnav="' + oi + '" onclick="scrollToObjCard(' + oi + ')">' + o.label + '</span>';
  });
  h += '</div>';

  // Objection scroll track (2 visible at a time)
  h += '<div class="compass-obj-scroll-wrap">';
  h += '<div class="compass-obj-track" id="compassObjTrack">';
  objections3A.forEach(function(o, oi) {
    var icon = objIconMap[o.label] || defaultIcon;
    h += '<div class="compass-obj-card" id="objCard_' + oi + '">'
      + '<button class="compass-edit-toggle" onclick="toggleObjEdit(' + oi + ')" title="Edit this objection">\u270E</button>'
      + '<div class="compass-obj-header"><span class="compass-obj-icon">' + icon + '</span><span class="compass-obj-title">' + o.label + '</span></div>'
      + '<div class="compass-obj-quote">\u201C' + o.quote + '\u201D</div>'
      + '<div class="compass-obj-divider"></div>'
      + '<div class="compass-obj-section"><div class="compass-obj-label ack">Acknowledge</div>'
      + '<div class="compass-obj-ack compass-editable" data-field="ack" data-obj="' + oi + '">'
      + '<span class="ce-text">\u201C' + o.ack + '\u201D</span>'
      + '<span class="ce-actions"><button class="ce-btn" onclick="ceEdit(this)" title="Edit">\u270E</button></span>'
      + '</div></div>'
      + '<div class="compass-obj-section"><div class="compass-obj-label assoc">Associate</div>'
      + '<div class="compass-obj-assoc compass-editable" data-field="assoc" data-obj="' + oi + '">'
      + '<span class="ce-text">\u201C' + o.assoc + '\u201D</span>'
      + '<span class="ce-actions"><button class="ce-btn" onclick="ceEdit(this)" title="Edit">\u270E</button></span>'
      + '</div></div>'
      + '<div class="compass-obj-section"><div class="compass-obj-label ask">Ask</div>';
    o.asks.forEach(function(a, ai) {
      h += '<div class="compass-obj-ask compass-editable" data-field="ask" data-obj="' + oi + '" data-idx="' + ai + '">'
        + '<span class="ce-text">\u201C' + a + '\u201D</span>'
        + '<span class="ce-actions"><button class="ce-btn" onclick="ceEdit(this)" title="Edit">\u270E</button>'
        + '<button class="ce-btn ce-del" onclick="ceDel(this)" title="Remove">\u2715</button></span>'
        + '</div>';
    });
    h += '<button class="compass-add-btn" onclick="ceAddAsk(' + oi + ')">+ Add question</button>';
    h += '</div>'
      + '<div class="compass-save-bar"><button class="compass-save-btn" onclick="ceObjSave(' + oi + ')">Save Changes</button><div class="compass-save-status" id="ceObjStatus_' + oi + '"></div></div>'
      + '</div>';
  });
  h += '</div></div>';
  h += '</div>';

  // TAB 3 — Pricing
  h += '<div class="compass-tab-content' + (activeCompassTab === 'pricing' ? ' active' : '') + '" id="compassTab_pricing">';
  h += '<div class="compass-pricing-note">Say the deposit first.<br>Pause after explaining pricing.</div>';
  h += '<div class="compass-deposit"><div class="compass-deposit-amount">\u20AC350 deposit</div><div class="compass-deposit-note">secures your spot \u00B7 non-refundable</div></div>';
  h += '<div class="compass-pricing-grid" style="margin-top:20px;">';
  tiers.forEach(function(t) {
    h += '<div class="compass-tier"><div class="compass-tier-name">' + t.name + '</div><div class="compass-chips">';
    t.prices.forEach(function(p) {
      h += '<span class="compass-chip" onclick="copyChip(this,\'' + p.val + '\')" title="Click to copy">' + p.label + ' ' + p.val + '</span>';
    });
    h += '</div><div class="compass-perday">' + t.perday + '</div></div>';
  });
  h += '</div>';

  // Cost per day calculator
  var retreatDate = new Date(2026, 5, 10); // June 10, 2026
  var today = new Date(); today.setHours(0,0,0,0);
  var daysUntil = Math.ceil((retreatDate - today) / 86400000);
  var cpdPrices = [
    { room: 'Triple', price: 2220 },
    { room: 'Double', price: 2888 },
    { room: 'Glamping', price: 2999 }
  ];
  h += '<div class="compass-cpd">';
  h += '<div class="compass-cpd-label">Investment Per Day Until June 10</div>';
  cpdPrices.forEach(function(r) {
    var perDay = (r.price / daysUntil).toFixed(2);
    h += '<div class="compass-cpd-line">' + r.room + ' \u00B7 \u20AC' + r.price.toLocaleString() + ' \u00B7 ' + daysUntil + ' days \u00B7 \u20AC' + perDay + '/day</div>';
  });
  h += '</div>';

  h += '</div>';

  // TAB 4 — Reminders
  h += '<div class="compass-tab-content' + (activeCompassTab === 'reminders' ? ' active' : '') + '" id="compassTab_reminders">';
  h += '<div class="compass-quick-objections-title" style="text-align:center;margin-bottom:16px;">Mental Reminders During Calls</div>';
  h += '<div class="compass-close-list">';
  closes.forEach(function(c) {
    h += '<div class="compass-close-item">\u201C' + c + '\u201D</div>';
  });
  h += '</div></div>';

  panel.innerHTML = h;

  // Nav strip: scroll observer + click-to-scroll
  if (activeCompassTab === 'flow') {
    var track = document.getElementById('compassPhaseTrack');
    var strip = document.getElementById('compassNavStrip');
    if (track && strip) {
      var navLabels = strip.querySelectorAll('.compass-nav-label');

      function updateActiveNav() {
        var cards = track.querySelectorAll('.compass-phase');
        var trackRect = track.getBoundingClientRect();
        var center = trackRect.left + trackRect.width / 2;
        var closest = 0;
        var minDist = Infinity;
        cards.forEach(function(card, idx) {
          var r = card.getBoundingClientRect();
          var dist = Math.abs(r.left + r.width / 2 - center);
          if (dist < minDist) { minDist = dist; closest = idx; }
        });
        navLabels.forEach(function(lbl, idx) {
          lbl.classList.toggle('active', idx === closest);
        });
      }

      track.addEventListener('scroll', updateActiveNav);

      navLabels.forEach(function(lbl) {
        lbl.addEventListener('click', function() {
          var idx = parseInt(lbl.dataset.nav) - 1;
          var cards = track.querySelectorAll('.compass-phase');
          if (cards[idx]) track.scrollTo({ left: cards[idx].offsetLeft - (track.offsetWidth - cards[idx].offsetWidth) / 2, behavior: 'smooth' });
        });
      });

      // Arrow key navigation
      document.addEventListener('keydown', function compassKeyNav(e) {
        if (activeCompassTab !== 'flow' || currentView !== 'compass') {
          document.removeEventListener('keydown', compassKeyNav);
          return;
        }
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
        var cards = track.querySelectorAll('.compass-phase');
        var trackRect = track.getBoundingClientRect();
        var center = trackRect.left + trackRect.width / 2;
        var current = 0, minDist = Infinity;
        cards.forEach(function(card, idx) {
          var dist = Math.abs(card.getBoundingClientRect().left + card.getBoundingClientRect().width / 2 - center);
          if (dist < minDist) { minDist = dist; current = idx; }
        });
        var next = e.key === 'ArrowRight' ? Math.min(current + 1, cards.length - 1) : Math.max(current - 1, 0);
        if (next !== current) {
          e.preventDefault();
          track.scrollTo({ left: cards[next].offsetLeft - (track.offsetWidth - cards[next].offsetWidth) / 2, behavior: 'smooth' });
        }
      });
    }
  }

  // Objection track: scroll observer + arrow keys
  if (activeCompassTab === 'objections') {
    var objTrack = document.getElementById('compassObjTrack');
    if (objTrack) {
      // Update nav highlight on scroll
      objTrack.addEventListener('scroll', function() {
        var navLabels = document.querySelectorAll('.compass-obj-nav-label');
        var cards = objTrack.querySelectorAll('.compass-obj-card');
        var trackRect = objTrack.getBoundingClientRect();
        var current = 0, minDist = Infinity;
        cards.forEach(function(card, idx) {
          var dist = Math.abs(card.getBoundingClientRect().left - trackRect.left);
          if (dist < minDist) { minDist = dist; current = idx; }
        });
        navLabels.forEach(function(lbl, idx) {
          lbl.classList.toggle('active', idx === current);
        });
      });

      // Arrow key navigation for objections
      document.addEventListener('keydown', function objKeyNav(e) {
        if (activeCompassTab !== 'objections' || currentView !== 'compass') {
          document.removeEventListener('keydown', objKeyNav);
          return;
        }
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
        var cards = objTrack.querySelectorAll('.compass-obj-card');
        var trackRect = objTrack.getBoundingClientRect();
        var current = 0, minDist = Infinity;
        cards.forEach(function(card, idx) {
          var dist = Math.abs(card.getBoundingClientRect().left - trackRect.left);
          if (dist < minDist) { minDist = dist; current = idx; }
        });
        var next = e.key === 'ArrowRight' ? Math.min(current + 1, cards.length - 1) : Math.max(current - 1, 0);
        if (next !== current) {
          e.preventDefault();
          scrollToObjCard(next);
        }
      });
    }
  }
}

// ── COMPASS INLINE EDITING ──
function toggleCompassEdit(phaseIdx) {
  var card = document.getElementById('compassPhase_' + phaseIdx);
  var btn = card.querySelector('.compass-edit-toggle');
  card.classList.toggle('editing');
  btn.classList.toggle('active');
  // Cancel any open edits when leaving edit mode
  if (!card.classList.contains('editing')) {
    card.querySelectorAll('.ce-editing').forEach(function(el) {
      el.classList.remove('ce-editing');
      var textarea = el.querySelector('.compass-edit-input');
      if (textarea) textarea.remove();
      el.querySelector('.ce-text').style.display = '';
    });
  }
}

function ceEdit(btn) {
  var el = btn.closest('.compass-editable');
  if (el.classList.contains('ce-editing')) return;
  el.classList.add('ce-editing');
  var textSpan = el.querySelector('.ce-text');
  var field = el.dataset.field;
  // Get raw text (strip quotes)
  var raw = textSpan.textContent.replace(/^\u201C/, '').replace(/\u201D$/, '').trim();
  if (field === 'pricing') {
    // For pricing, get from innerHTML with <br> → \n
    raw = textSpan.innerHTML.replace(/^\u201C/, '').replace(/\u201D$/, '').replace(/<br\s*\/?>/gi, '\n').trim();
  }
  textSpan.style.display = 'none';
  var ta = document.createElement('textarea');
  ta.className = 'compass-edit-input';
  ta.value = raw;
  if (field === 'pricing') ta.style.minHeight = '120px';
  ta.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { ceCancelEdit(el); }
    if (e.key === 'Enter' && !e.shiftKey && field !== 'pricing') { e.preventDefault(); ceCommitEdit(el, ta.value); }
  });
  el.insertBefore(ta, el.querySelector('.ce-actions'));
  ta.focus();
}

function ceCancelEdit(el) {
  el.classList.remove('ce-editing');
  var ta = el.querySelector('.compass-edit-input');
  if (ta) ta.remove();
  el.querySelector('.ce-text').style.display = '';
}

function ceCommitEdit(el, val) {
  val = val.trim();
  if (!val) { ceCancelEdit(el); return; }
  var field = el.dataset.field;
  var textSpan = el.querySelector('.ce-text');
  if (field === 'goal') {
    textSpan.textContent = val;
  } else if (field === 'pricing') {
    textSpan.innerHTML = '\u201C' + val.replace(/\n/g, '<br>') + '\u201D';
  } else {
    textSpan.textContent = '\u201C' + val + '\u201D';
  }
  el.classList.remove('ce-editing');
  var ta = el.querySelector('.compass-edit-input');
  if (ta) ta.remove();
  textSpan.style.display = '';
}

function ceDel(btn) {
  var el = btn.closest('.compass-editable');
  el.remove();
}

function ceAdd(phaseIdx, type) {
  var container = type === 'option'
    ? document.getElementById('ceOpts_' + phaseIdx)
    : document.getElementById('ceTrans_' + phaseIdx);
  var addBtn = container.querySelector('.compass-add-btn');
  var chipClass = type === 'option' ? 'compass-option-chip' : 'compass-transition-chip';
  var chip = document.createElement('div');
  chip.className = chipClass + ' compass-editable ce-editing';
  chip.dataset.field = type;
  chip.dataset.phase = phaseIdx;
  chip.innerHTML = '<span class="ce-text" style="display:none"></span>'
    + '<span class="ce-actions"><button class="ce-btn" onclick="ceEdit(this)" title="Edit">\u270E</button>'
    + '<button class="ce-btn ce-del" onclick="ceDel(this)" title="Remove">\u2715</button></span>';
  container.insertBefore(chip, addBtn);
  var ta = document.createElement('textarea');
  ta.className = 'compass-edit-input';
  ta.placeholder = type === 'option' ? 'Type a new option\u2026' : 'Type a new transition\u2026';
  ta.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { chip.remove(); }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); var v = ta.value.trim(); if (v) { ceCommitEdit(chip, v); } else { chip.remove(); } }
  });
  chip.insertBefore(ta, chip.querySelector('.ce-actions'));
  ta.focus();
}

function ceSave(phaseIdx) {
  var statusEl = document.getElementById('ceSaveStatus_' + phaseIdx);
  statusEl.textContent = 'Saving\u2026';
  var saveBtn = statusEl.previousElementSibling;
  saveBtn.disabled = true;

  // Gather all phases from the DOM
  var allPhases = [];
  var allPricing = [];
  for (var i = 0; i < 6; i++) {
    var card = document.getElementById('compassPhase_' + i);
    if (!card) continue;
    var name = card.querySelector('.compass-phase-name').textContent;
    var goalEl = card.querySelector('[data-field="goal"] .ce-text');
    var anchorEl = card.querySelector('[data-field="anchor"] .ce-text');
    var goal = goalEl ? goalEl.textContent.trim() : '';
    var anchor = anchorEl ? anchorEl.textContent.replace(/^\u201C/, '').replace(/\u201D$/, '').trim() : '';

    var options = [];
    card.querySelectorAll('[data-field="option"] .ce-text').forEach(function(t) {
      var v = t.textContent.replace(/^\u201C/, '').replace(/\u201D$/, '').trim();
      if (v) options.push(v);
    });

    var transitions = [];
    card.querySelectorAll('[data-field="transition"] .ce-text').forEach(function(t) {
      var v = t.textContent.replace(/^\u201C/, '').replace(/\u201D$/, '').trim();
      if (v) transitions.push(v);
    });

    // Spoken pricing from Logistics card
    if (name === 'Logistics') {
      card.querySelectorAll('[data-field="pricing"]').forEach(function(pe) {
        var label = pe.querySelector('.compass-script-label').textContent;
        var raw = pe.querySelector('.ce-text').innerHTML.replace(/^\u201C/, '').replace(/\u201D$/, '').replace(/<br\s*\/?>/gi, '\n').trim();
        allPricing.push({ label: label, text: raw });
      });
    }

    allPhases.push({ name: name, goal: goal, anchor: anchor, options: options, transitions: transitions });
  }

  var payload = { phases: allPhases };
  if (allPricing.length) payload.spokenPricing = allPricing;

  // Send as single-phase update to avoid URL length limits
  var singlePhase = { phaseIndex: phaseIdx, phase: allPhases[phaseIdx] };
  if (allPricing.length && phaseIdx === 4) singlePhase.spokenPricing = allPricing; // Logistics has pricing
  var url = API_URL + '?action=updateCompassPhase&payload=' + encodeURIComponent(JSON.stringify(singlePhase));
  fetch(url).then(function(r) { return r.json(); }).then(function(data) {
    if (data.ok) {
      statusEl.textContent = 'Saved \u2713';
      compassCache = null; // bust cache so next render fetches fresh
      setTimeout(function() { statusEl.textContent = ''; saveBtn.disabled = false; }, 2000);
    } else {
      statusEl.textContent = 'Error: ' + (data.error || 'Unknown');
      saveBtn.disabled = false;
    }
  }).catch(function(err) {
    statusEl.textContent = 'Failed to save';
    saveBtn.disabled = false;
  });
}

// ── Objection navigation ──
function scrollToObjCard(idx) {
  var card = document.getElementById('objCard_' + idx);
  if (!card) { console.warn('objCard_' + idx + ' not found'); return; }
  card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  // Update nav labels
  var navLabels = document.querySelectorAll('.compass-obj-nav-label');
  navLabels.forEach(function(lbl, i) { lbl.classList.toggle('active', i === idx); });
}

// ── Objection editing ──
function toggleObjEdit(objIdx) {
  var card = document.getElementById('objCard_' + objIdx);
  if (!card) return;
  var btn = card.querySelector('.compass-edit-toggle');
  card.classList.toggle('editing');
  btn.classList.toggle('active');
  if (!card.classList.contains('editing')) {
    card.querySelectorAll('.ce-editing').forEach(function(el) {
      el.classList.remove('ce-editing');
      var textarea = el.querySelector('.compass-edit-input');
      if (textarea) textarea.remove();
      el.querySelector('.ce-text').style.display = '';
    });
  }
}

function ceAddAsk(objIdx) {
  var card = document.getElementById('objCard_' + objIdx);
  if (!card) return;
  var addBtn = card.querySelector('.compass-add-btn');
  if (!addBtn) return;
  var div = document.createElement('div');
  div.className = 'compass-obj-ask compass-editable';
  div.setAttribute('data-field', 'ask');
  div.setAttribute('data-obj', objIdx);
  div.setAttribute('data-idx', card.querySelectorAll('.compass-obj-ask').length);
  div.innerHTML = '<span class="ce-text">\u201CNew question\u201D</span>'
    + '<span class="ce-actions"><button class="ce-btn" onclick="ceEdit(this)" title="Edit">\u270E</button>'
    + '<button class="ce-btn ce-del" onclick="ceDel(this)" title="Remove">\u2715</button></span>';
  addBtn.parentNode.insertBefore(div, addBtn);
}

function ceObjSave(objIdx) {
  var statusEl = document.getElementById('ceObjStatus_' + objIdx);
  statusEl.textContent = 'Saving\u2026';
  var saveBtn = statusEl.previousElementSibling;
  saveBtn.disabled = true;

  var card = document.getElementById('objCard_' + objIdx);
  var label = card.querySelector('.compass-obj-title').textContent.trim();
  var quote = card.querySelector('.compass-obj-quote').textContent.replace(/[\u201C\u201D]/g, '').trim();

  var ackEl = card.querySelector('[data-field="ack"] .ce-text');
  var ack = ackEl ? ackEl.textContent.replace(/[\u201C\u201D]/g, '').trim() : '';

  var assocEl = card.querySelector('[data-field="assoc"] .ce-text');
  var assoc = assocEl ? assocEl.textContent.replace(/[\u201C\u201D]/g, '').trim() : '';

  var askEls = card.querySelectorAll('[data-field="ask"] .ce-text');
  var asks = [];
  askEls.forEach(function(el) {
    var t = el.textContent.replace(/[\u201C\u201D]/g, '').trim();
    if (t) asks.push(t);
  });

  var payload = { objIndex: objIdx, objection: { label: label, quote: quote, ack: ack, assoc: assoc, asks: asks } };
  var url = API_URL + '?action=updateCompassObjection&payload=' + encodeURIComponent(JSON.stringify(payload));
  fetch(url).then(function(r) { return r.json(); }).then(function(data) {
    if (data.ok) {
      statusEl.textContent = 'Saved \u2713';
      compassCache = null;
      setTimeout(function() { statusEl.textContent = ''; saveBtn.disabled = false; }, 2000);
    } else {
      statusEl.textContent = 'Error: ' + (data.error || 'Unknown');
      saveBtn.disabled = false;
    }
  }).catch(function(err) {
    statusEl.textContent = 'Failed to save';
    saveBtn.disabled = false;
  });
}

function copyChip(el, val) {
  navigator.clipboard.writeText(val).then(function() {
    el.classList.add('copied');
    var orig = el.textContent;
    el.textContent = 'Copied!';
    setTimeout(function() { el.classList.remove('copied'); el.textContent = orig; }, 1200);
  });
}

var activeSeqFilter = 'all';
function switchSeqFilter(filter) {
  activeSeqFilter = filter;
  renderSequencesPanel();
}

function renderSequencesPanel() {
  var panel = document.getElementById('sequencesPanel');
  if (!panel) return;
  if (!state.applicants || !state.applicants.length) {
    panel.innerHTML = '<div class="seq-empty">Loading applicant data\u2026</div>';
    return;
  }

  var ghostSteps = [
    { label: 'Entered', template: null, day: 0 },
    { label: 'Day 3', template: 'ghost-1', day: 3 },
    { label: 'Day 7', template: 'ghost-2', day: 7 },
    { label: 'Day 11', template: 'ghost-3', day: 11 },
    { label: 'Day 15', template: 'ghost-4', day: 15 }
  ];
  var depSteps = [
    { label: 'Offer sent', template: null, day: 0 },
    { label: 'Day 3', template: 'dep-1', day: 3 },
    { label: 'Day 5', template: 'dep-2', day: 5 }
  ];

  function daysAgo(isoStr) {
    if (!isoStr) return null;
    var d = new Date(isoStr);
    if (isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }

  function statusBadge(status) {
    var sc = STATUS_COLORS[status] || { bg: '#eee', fg: '#666' };
    return '<span class="seq-status-badge" style="background:' + sc.bg + ';color:' + sc.fg + '">' + status + '</span>';
  }

  function buildTimeline(steps, sheetStep, anchorDate) {
    // sheetStep: 0 = no emails sent, 1 = first email sent, etc.
    // steps[0] is always "Entered"/"Offer sent" (always done if in sequence)
    // steps[1+] map to sheet step values
    var elapsed = daysAgo(anchorDate);
    var anchorD = anchorDate ? new Date(anchorDate) : null;
    var h = '<div class="seq-timeline">';
    steps.forEach(function(s, i) {
      var cls = 'pending';
      var labelCls = '';
      if (i === 0) {
        cls = 'done'; labelCls = ' done';
      } else if (i <= sheetStep) {
        cls = 'done'; labelCls = ' done';
      } else if (i === sheetStep + 1) {
        cls = 'current'; labelCls = ' current';
      }
      // Calculate date for every step
      var dateStr = '';
      if (anchorD && !isNaN(anchorD.getTime())) {
        var stepDate = new Date(anchorD.getTime() + s.day * 86400000);
        dateStr = formatDate(stepDate);
      }
      var labelText = s.label;
      if (dateStr) labelText = s.label + ' &bull; ' + dateStr;
      h += '<div class="seq-step">'
        + '<span class="seq-dot ' + cls + '">' + i + '</span>'
        + '<span class="seq-step-label' + labelCls + '">' + labelText + '</span>'
        + '</div>';
    });
    h += '</div>';
    // Next email step (skip step 0 which has no email)
    var nextEmailIdx = sheetStep + 1;
    if (nextEmailIdx < steps.length && elapsed !== null) {
      var nextDay = steps[nextEmailIdx].day;
      var daysUntil = nextDay - elapsed;
      if (daysUntil > 0) {
        h += '<div class="seq-next-info">Next email in ~' + daysUntil + ' day' + (daysUntil !== 1 ? 's' : '') + ' (' + steps[nextEmailIdx].label + ')</div>';
      } else if (daysUntil === 0) {
        h += '<div class="seq-next-info">Next email sends today (' + steps[nextEmailIdx].label + ')</div>';
      } else {
        h += '<div class="seq-next-info">Next email is due (' + steps[nextEmailIdx].label + ')</div>';
      }
    } else if (sheetStep >= steps.length - 1) {
      h += '<div class="seq-next-info">Sequence complete</div>';
    }
    return h;
  }

  function lastInteraction(a) {
    var dates = [a.emailSent, a.statusChangedDate, a.lastSmsDate, a.callTime].filter(function(d) {
      return d && !isNaN(new Date(d).getTime());
    }).map(function(d) { return new Date(d); });
    if (!dates.length) return null;
    return new Date(Math.max.apply(null, dates));
  }

  function lastInteractionLabel(a) {
    var d = lastInteraction(a);
    if (!d) return '';
    var now = Date.now();
    var diff = Math.floor((now - d.getTime()) / 86400000);
    var label = '';
    if (diff === 0) label = 'today';
    else if (diff === 1) label = 'yesterday';
    else label = diff + 'd ago';
    // Figure out what the interaction was
    var latest = d.toISOString();
    var type = '';
    if (a.emailSent && latest.slice(0,10) === new Date(a.emailSent).toISOString().slice(0,10)) type = 'email';
    else if (a.lastSmsDate && latest.slice(0,10) === new Date(a.lastSmsDate).toISOString().slice(0,10)) type = 'sms';
    else if (a.callTime && latest.slice(0,10) === new Date(a.callTime).toISOString().slice(0,10)) type = 'call';
    else type = 'status change';
    return type + ' ' + label;
  }

  function seqStatusDropdown(row, currentStatus) {
    var opts = '';
    STATUSES.forEach(function(s) {
      opts += '<option value="' + s + '"' + (s === currentStatus ? ' selected' : '') + '>' + s + '</option>';
    });
    return '<select class="seq-status-select" data-row="' + row + '" onchange="seqChangeStatus(' + row + ',this.value)">' + opts + '</select>';
  }

  // Collect active sequences
  var ghosted = [];
  var depReminders = [];
  state.applicants.forEach(function(a) {
    var name = (a.firstName || '') + ' ' + (a.lastName || '');
    if (a.status === 'Ghosted') {
      var step = parseInt(a.ghostStep) || 0;
      ghosted.push({ name: name, row: a.row, step: step, anchor: a.statusChangedDate, email: a.email, status: a.status, applicant: a });
    }
    if (a.status === 'Hard Yes' && a.emailSent) {
      var dStep = parseInt(a.depReminderStep) || 0;
      if (dStep < 2) {
        depReminders.push({ name: name, row: a.row, step: dStep, anchor: a.emailSent, email: a.email, status: a.status, applicant: a });
      }
    }
  });

  var totalCount = ghosted.length + depReminders.length;

  var h = '<div class="seq-header"><h2>Active Sequences</h2>'
    + '<p>Automated email sequences currently running</p></div>';

  // Filter tabs
  h += '<div class="seq-filters">';
  h += '<button class="seq-filter-btn' + (activeSeqFilter === 'all' ? ' active' : '') + '" onclick="switchSeqFilter(\'all\')">All <span class="seq-filter-count">' + totalCount + '</span></button>';
  h += '<button class="seq-filter-btn' + (activeSeqFilter === 'ghost' ? ' active' : '') + '" onclick="switchSeqFilter(\'ghost\')"><span class="seq-filter-dot" style="background:#d9d9d9"></span>Ghost Protocol <span class="seq-filter-count">' + ghosted.length + '</span></button>';
  h += '<button class="seq-filter-btn' + (activeSeqFilter === 'deposit' ? ' active' : '') + '" onclick="switchSeqFilter(\'deposit\')"><span class="seq-filter-dot" style="background:#b6d7a8"></span>Deposit Reminders <span class="seq-filter-count">' + depReminders.length + '</span></button>';
  h += '<button class="seq-select-btn" id="seqSelectBtn" onclick="seqToggleSelect()"><i class="ph ph-check-square"></i> Select</button>';
  h += '</div>';

  if (!totalCount) {
    h += '<div class="seq-empty">No active sequences right now.<br>Sequences activate when applicants enter <strong>Ghosted</strong> or <strong>Hard Yes</strong> status.</div>';
    requestAnimationFrame(function() { panel.innerHTML = h; });
    return;
  }

  // Bulk action bar
  h += '<div class="seq-bulk-bar" id="seqBulkBar" style="display:none;">'
    + '<button class="seq-bulk-btn" onclick="seqSelectAll()" id="seqSelectAllBtn"><i class="ph ph-check-square"></i> Select All</button>'
    + '<span class="seq-bulk-count" id="seqBulkCount">0 selected</span>'
    + '<button class="seq-bulk-btn" onclick="seqBulkEmail()"><i class="ph ph-envelope-simple"></i> Send Email</button>'
    + '<button class="seq-bulk-btn seq-bulk-status-btn" onclick="seqBulkStatusApply()">Apply</button>'
    + '<select class="seq-bulk-status-select" id="seqBulkStatusSelect">'
    + '<option value="">Change status\u2026</option>';
  STATUSES.forEach(function(s) {
    h += '<option value="' + s + '">' + s + '</option>';
  });
  h += '</select>'
    + '<button class="seq-bulk-cancel" onclick="seqBulkClear()">Clear</button>'
    + '</div>';

  function buildCard(item, steps, seqType) {
    var a = item.applicant;
    var elapsed = daysAgo(item.anchor);
    var dayStr = elapsed !== null ? elapsed + 'd' : '';
    var liLabel = lastInteractionLabel(a);
    return '<div class="seq-card">'
      + '<div class="seq-card-header">'
      + '<div class="seq-card-left">'
      + '<input type="checkbox" class="seq-check" data-row="' + item.row + '" data-email="' + (item.email || '') + '" onchange="seqUpdateBulk()">'
      + '<span class="seq-card-name">' + item.name + '</span>' + statusBadge(item.status)
      + '</div>'
      + '<span class="seq-card-meta">' + dayStr + '</span></div>'
      + '<div class="seq-card-row">'
      + '<div class="seq-card-detail"><span class="seq-detail-label">Status</span>' + seqStatusDropdown(item.row, item.status) + '</div>'
      + '<div class="seq-card-detail"><span class="seq-detail-label">Last interaction</span><span class="seq-detail-value">' + (liLabel || 'none') + '</span></div>'
      + '</div>'
      + buildTimeline(steps, item.step, item.anchor)
      + '</div>';
  }

  // Ghost Protocol section
  if (ghosted.length && (activeSeqFilter === 'all' || activeSeqFilter === 'ghost')) {
    h += '<div class="seq-section">';
    h += '<div class="seq-section-title">Ghost Protocol (' + ghosted.length + ')</div>';
    ghosted.forEach(function(g) { h += buildCard(g, ghostSteps, 'ghost'); });
    h += '</div>';
  }

  // Deposit Reminders section
  if (depReminders.length && (activeSeqFilter === 'all' || activeSeqFilter === 'deposit')) {
    h += '<div class="seq-section">';
    h += '<div class="seq-section-title">Deposit Reminders (' + depReminders.length + ')</div>';
    depReminders.forEach(function(d) { h += buildCard(d, depSteps, 'deposit'); });
    h += '</div>';
  }

  requestAnimationFrame(function() { panel.innerHTML = h; });
}

// ── Sequences bulk actions ──
function seqUpdateBulk() {
  var checked = document.querySelectorAll('.seq-check:checked');
  var countEl = document.getElementById('seqBulkCount');
  if (countEl) countEl.textContent = checked.length + ' selected';
}

function seqToggleSelect() {
  var panel = document.getElementById('sequencesPanel');
  var btn = document.getElementById('seqSelectBtn');
  if (!panel || !btn) return;
  var active = panel.classList.toggle('seq-select-mode');
  btn.classList.toggle('active', active);
  if (!active) seqBulkClear();
  // Show bulk bar when entering select mode
  var bar = document.getElementById('seqBulkBar');
  if (bar) bar.style.display = active ? '' : 'none';
}

function seqSelectAll() {
  var boxes = document.querySelectorAll('.seq-check');
  var allChecked = Array.prototype.every.call(boxes, function(cb) { return cb.checked; });
  boxes.forEach(function(cb) { cb.checked = !allChecked; });
  seqUpdateBulk();
}

function seqBulkClear() {
  document.querySelectorAll('.seq-check:checked').forEach(function(cb) { cb.checked = false; });
  seqUpdateBulk();
  // Exit select mode
  var panel = document.getElementById('sequencesPanel');
  var btn = document.getElementById('seqSelectBtn');
  if (panel) panel.classList.remove('seq-select-mode');
  if (btn) btn.classList.remove('active');
  var bar = document.getElementById('seqBulkBar');
  if (bar) bar.style.display = 'none';
}

function seqBulkEmail() {
  var checked = document.querySelectorAll('.seq-check:checked');
  if (!checked.length) return;
  var rows = [];
  var emails = [];
  checked.forEach(function(cb) {
    rows.push(Number(cb.dataset.row));
    if (cb.dataset.email) emails.push(cb.dataset.email);
  });

  // Open bulk email modal directly without switching views
  emailModalRow = null;
  window._bulkRows = rows;

  var statusCounts = {};
  rows.forEach(function(r) {
    var a = state.applicants.find(function(x) { return x.row === r; });
    if (a) statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });
  var commonStatus = '', maxCount = 0;
  for (var s in statusCounts) {
    if (statusCounts[s] > maxCount) { maxCount = statusCounts[s]; commonStatus = s; }
  }
  var defaultKey = STATUS_DEFAULT_TEMPLATE[commonStatus] || '';

  var tplSelect = document.getElementById('emailModalTemplate');
  var opts = '<option value="">(blank \u2014 write from scratch)</option>';
  COMPOSE_TEMPLATES.forEach(function(ct) {
    opts += '<option value="' + ct.key + '"' + (ct.key === defaultKey ? ' selected' : '') + '>' + esc(ct.label) + '</option>';
  });
  tplSelect.innerHTML = opts;

  var subject = '', body = '';
  if (defaultKey && EMAIL_TEMPLATES_JS[defaultKey]) {
    subject = EMAIL_TEMPLATES_JS[defaultKey].subject || '';
    body = EMAIL_TEMPLATES_JS[defaultKey].body || '';
  }

  document.getElementById('emailModalTitle').textContent = 'Bulk Email (' + rows.length + ' recipients)';
  document.getElementById('emailModalTo').innerHTML = '<strong>To:</strong> ' + rows.length + ' applicants (' + emails.slice(0, 3).join(', ') + (emails.length > 3 ? ', ...' : '') + ')';
  document.getElementById('emailModalSubject').value = subject;
  document.getElementById('emailModalTextarea').value = body;
  document.getElementById('emailModalPreview').innerHTML = body ? markdownToHtmlPreview(body) : '<p style="color:#888;">Select a template or write your email.</p>';

  var toggleBtns = document.querySelectorAll('.email-modal-toggle button');
  toggleBtns[0].classList.add('active');
  toggleBtns[1].classList.remove('active');
  document.getElementById('emailModalPreview').style.display = '';
  document.getElementById('emailModalTextarea').style.display = 'none';
  document.getElementById('emailModal').classList.remove('hidden');
}

function seqBulkStatusApply() {
  var newStatus = document.getElementById('seqBulkStatusSelect').value;
  if (!newStatus) { alert('Select a status first'); return; }
  var checked = document.querySelectorAll('.seq-check:checked');
  if (!checked.length) return;
  var rows = [];
  checked.forEach(function(cb) { rows.push(parseInt(cb.dataset.row)); });
  // Update each applicant
  var promises = rows.map(function(row) {
    return apiUpdate('updateApplicant', { row: row, status: newStatus });
  });
  Promise.all(promises).then(function() {
    // Update local state
    rows.forEach(function(row) {
      var a = state.applicants.find(function(x) { return x.row === row; });
      if (a) a.status = newStatus;
    });
    renderSequencesPanel();
    showToast(rows.length + ' applicant' + (rows.length > 1 ? 's' : '') + ' updated to ' + newStatus);
  });
}

function seqChangeStatus(row, newStatus) {
  apiUpdate('updateApplicant', { row: row, status: newStatus }).then(function() {
    var a = state.applicants.find(function(x) { return x.row === row; });
    if (a) a.status = newStatus;
    showToast('Status updated to ' + newStatus);
    // Re-render after short delay so user sees the change
    setTimeout(function() { renderSequencesPanel(); }, 800);
  });
}

function renderPipelinePanel() {
  var panel = document.getElementById('pipelinePanel');
  panel.innerHTML = ''
    + '<h1>Applicant Status Flow</h1>'
    + '<p class="pipe-subtitle">The Course of Transformation &middot; Pipeline architecture</p>'

    // ── STATUS GRID ──
    + '<div class="pipe-grid">'

    // INCOMING
    + '<div class="pipe-stage incoming">'
    + '<div class="pipe-stage-header"><div class="pipe-stage-dot"></div>Incoming</div>'
    + '<div class="pipe-card">'
    + '<div class="pipe-card-name">Applied</div>'
    + '<div class="pipe-card-desc">Application received. Awaiting review by Ethan &amp; Gabi.</div>'
    + '</div>'
    + '</div>'

    // DECISION
    + '<div class="pipe-stage decision">'
    + '<div class="pipe-stage-header"><div class="pipe-stage-dot"></div>Decision</div>'
    + '<div class="pipe-card">'
    + '<div class="pipe-card-name">Hard Yes</div>'
    + '<div class="pipe-card-desc">Approved. Offer email not yet sent.</div>'
    + '<div class="pipe-card-note">&darr; Badge shows &ldquo;offer sent&rdquo; once email fires</div>'
    + '</div>'
    + '<div class="pipe-card">'
    + '<div class="pipe-card-name">Needs Call</div>'
    + '<div class="pipe-card-desc">Promising but needs a conversation first.</div>'
    + '</div>'
    + '<div class="pipe-card">'
    + '<div class="pipe-card-name">Call Scheduled</div>'
    + '<div class="pipe-card-desc">Call booked. Awaiting outcome.</div>'
    + '</div>'
    + '<div class="pipe-card">'
    + '<div class="pipe-card-name">Waitlist</div>'
    + '<div class="pipe-card-desc">Good fit but retreat is full. Auto-notified if spot opens.</div>'
    + '<div class="pipe-auto-tag success">&#9889; waitlist notification</div>'
    + '</div>'
    + '</div>'

    // WAITING
    + '<div class="pipe-stage waiting">'
    + '<div class="pipe-stage-header"><div class="pipe-stage-dot"></div>Waiting</div>'
    + '<div class="pipe-card">'
    + '<div class="pipe-card-name">Ghosted</div>'
    + '<div class="pipe-card-desc">Gone silent after outreach. 3-day buffer then auto-sequence begins.</div>'
    + '<div class="pipe-auto-tag warning">&#9889; ghost protocol Day 3, 7, 11, 15</div>'
    + '</div>'
    + '</div>'

    // CONFIRMED
    + '<div class="pipe-stage confirmed">'
    + '<div class="pipe-stage-header"><div class="pipe-stage-dot"></div>Confirmed</div>'
    + '<div class="pipe-card">'
    + '<div class="pipe-card-name">Deposit Paid</div>'
    + '<div class="pipe-card-desc">Spot secured. On payment plan &mdash; instalments pending.</div>'
    + '<div class="pipe-auto-tag success">&#9889; payment reminders</div>'
    + '</div>'
    + '<div class="pipe-card">'
    + '<div class="pipe-card-name">Payment Plan</div>'
    + '<div class="pipe-card-desc">Actively paying instalments. At least one payment made.</div>'
    + '<div class="pipe-auto-tag success">&#9889; instalment reminders</div>'
    + '</div>'
    + '<div class="pipe-card">'
    + '<div class="pipe-card-name">Paid in Full</div>'
    + '<div class="pipe-card-desc">Complete. No further payment actions needed.</div>'
    + '</div>'
    + '</div>'

    // OUT
    + '<div class="pipe-stage out">'
    + '<div class="pipe-stage-header"><div class="pipe-stage-dot"></div>Out</div>'
    + '<div class="pipe-card">'
    + '<div class="pipe-card-name">Not Aligned</div>'
    + '<div class="pipe-card-desc">Not a good fit. Closed gracefully.</div>'
    + '</div>'
    + '<div class="pipe-card">'
    + '<div class="pipe-card-name">Maybe Next Year</div>'
    + '<div class="pipe-card-desc">Interested but timing is wrong. Keep warm for 2027.</div>'
    + '</div>'
    + '<div class="pipe-card">'
    + '<div class="pipe-card-name">No Longer Interested</div>'
    + '<div class="pipe-card-desc">Opted out. No further contact.</div>'
    + '</div>'
    + '<div class="pipe-card">'
    + '<div class="pipe-card-name">Cancelled</div>'
    + '<div class="pipe-card-desc">Was confirmed but withdrew. Triggers waitlist notification.</div>'
    + '<div class="pipe-auto-tag success">&#9889; waitlist notification</div>'
    + '</div>'
    + '</div>'

    + '</div>' // /pipe-grid

    + '<hr class="pipe-divider">'

    // ── FLOW DIAGRAM ──
    + '<div class="pipe-flow-section">'
    + '<div class="pipe-flow-title">The Journey</div>'
    + '<p class="pipe-flow-subtitle">How an applicant moves through the pipeline</p>'

    + '<div style="overflow-x:auto;"><div style="min-width:900px;padding-bottom:16px;">'

    // Row 1
    + '<div class="pipe-flow-row">'
    + '<div class="pipe-flow-node pfn-incoming">Applied</div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div class="pipe-flow-label">Ethan &amp; Gabi review</div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div style="display:flex;gap:8px;">'
    + '<div class="pipe-flow-node pfn-decision">Hard Yes</div>'
    + '<div class="pipe-flow-node pfn-decision">Needs Call</div>'
    + '<div class="pipe-flow-node pfn-decision">Waitlist</div>'
    + '<div class="pipe-flow-node pfn-out" style="opacity:0.6">Not Aligned</div>'
    + '</div></div>'

    + '<div class="pipe-flow-connector"></div>'

    // Row 2: Hard Yes path
    + '<div class="pipe-flow-row">'
    + '<div class="pipe-flow-node pfn-decision">Hard Yes</div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div class="pipe-flow-label">send offer email<br><span style="color:#818cf8;font-size:10px">badge: offer sent &#10003;</span></div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div class="pipe-flow-label" style="color:#ec4899">waiting for deposit...</div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div style="display:flex;gap:8px;">'
    + '<div class="pipe-flow-node pfn-confirmed">Deposit Paid</div>'
    + '<div class="pipe-flow-node pfn-out" style="opacity:0.7">Ghosted</div>'
    + '</div></div>'

    + '<div class="pipe-flow-connector" style="margin-left:0;height:16px;"></div>'

    // Row 2b: auto sequences
    + '<div class="pipe-flow-row" style="padding-left:32px;gap:8px;">'
    + '<div class="pipe-flow-node pfn-auto">&#9889; deposit reminder Day 3 + Day 5</div>'
    + '<div style="color:#333;padding:0 4px;">|</div>'
    + '<div class="pipe-flow-node pfn-auto">&#9889; ghost protocol Day 3, 7, 11, 15</div>'
    + '</div>'

    + '<div class="pipe-flow-connector"></div>'

    // Row 3: Needs Call path
    + '<div class="pipe-flow-row">'
    + '<div class="pipe-flow-node pfn-decision">Needs Call</div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div class="pipe-flow-label">Gabi reaches out<br>bulk email sent</div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div class="pipe-flow-node pfn-decision">Call Scheduled</div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div style="display:flex;gap:8px;">'
    + '<div class="pipe-flow-node pfn-decision">Hard Yes</div>'
    + '<div class="pipe-flow-node pfn-out" style="opacity:0.7">Not Aligned</div>'
    + '</div></div>'

    + '<div class="pipe-flow-connector" style="margin-left:0;height:16px;"></div>'

    + '<div class="pipe-flow-row" style="padding-left:32px;">'
    + '<div class="pipe-flow-label" style="color:#f59e0b;">&darr; no response after 3&ndash;4 days &rarr;</div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div class="pipe-flow-node pfn-out">Ghosted</div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div class="pipe-flow-node pfn-auto">&#9889; 3-day buffer &rarr; ghost protocol</div>'
    + '</div>'

    + '<div class="pipe-flow-connector"></div>'

    // Row 4: Confirmed path
    + '<div class="pipe-flow-row">'
    + '<div class="pipe-flow-node pfn-confirmed">Deposit Paid</div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div style="display:flex;gap:8px;">'
    + '<div class="pipe-flow-node pfn-confirmed">Payment Plan</div>'
    + '<div class="pipe-flow-node pfn-confirmed">Paid in Full</div>'
    + '</div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div class="pipe-flow-label">&#127881; confirmed participant</div>'
    + '</div>'

    + '<div class="pipe-flow-connector" style="margin-left:0;height:16px;"></div>'

    + '<div class="pipe-flow-row" style="padding-left:32px;">'
    + '<div class="pipe-flow-label" style="color:#ef4444;">&darr; cancels &rarr;</div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div class="pipe-flow-node pfn-out">Cancelled</div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div class="pipe-flow-node pfn-auto">&#9889; waitlist notification fires</div>'
    + '</div>'

    + '<div class="pipe-flow-connector"></div>'

    // Row 5: Waitlist
    + '<div class="pipe-flow-row">'
    + '<div class="pipe-flow-node pfn-decision">Waitlist</div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div class="pipe-flow-label">spot opens anywhere above</div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div class="pipe-flow-node pfn-auto">&#9889; &ldquo;A spot just opened&rdquo; email</div>'
    + '<div class="pipe-flow-arrow">&rarr;</div>'
    + '<div class="pipe-flow-node pfn-confirmed">Deposit Paid</div>'
    + '</div>'

    + '</div></div>' // /scroll wrapper
    + '</div>' // /pipe-flow-section

    + '<hr class="pipe-divider">'

    // ── KEY NOTES ──
    + '<div class="pipe-key-note">'
    + '<h3>Key Architecture Notes</h3>'
    + '<p><strong>Ghosted lives in Waiting, not Out</strong> &mdash; ghost protocol is recovery, not goodbye. They can still come back.</p>'
    + '<p><strong>Deposit reminders (Day 3, Day 5) always run before Ghosted is set.</strong> The two sequences never run in parallel. Deposit reminders fire off the emailSent timestamp; Ghosted fires off manual status change.</p>'
    + '<p><strong>Cancelled triggers waitlist notification</strong> &mdash; when a confirmed participant withdraws, waitlisted applicants are automatically notified.</p>'
    + '</div>'

    + '<div class="pipe-footer">THE COURSE OF TRANSFORMATION &middot; PIPELINE ARCHITECTURE &middot; 2026</div>';
}
