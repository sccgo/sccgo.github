/* =========================================
 نُسُقِيبيديا — Main Application Logic
 js/app.js
 ========================================= */

const App = (() => {

 // ===== STATE =====
 let currentUser = null;
 let searchQuery = '';

 // ===== INIT =====
 function init() {
 // Load saved session
 try {
 const saved = sessionStorage.getItem('nusugipedia_user');
 if (saved) { currentUser = JSON.parse(saved); updateAuthUI(); }
 } catch (e) {}

 // Bind search events
 const input = document.getElementById('main-search');
 if (input) {
 input.addEventListener('input', onSearchInput);
 input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); if (e.key === 'Escape') hideSuggestions(); });
 }

 // Close dropdown on outside click
 document.addEventListener('click', e => {
 if (!e.target.closest('.header-search')) hideSuggestions();
 if (!e.target.closest('.user-menu-wrap')) closeUserMenu();
 });

 // Scroll events
 window.addEventListener('scroll', onScroll);

 // Navigate to home
 navigate('home');

 // Load Wikipedia live data for home
 loadWikiHomeSections();

 // اقرأ الـ hash عند فتح الصفحة (للانتقال من صفحات خارجية)
 const rawHash = window.location.hash.replace('#', '');
 if (rawHash) {
 setTimeout(() => {
 if (rawHash.startsWith('search-')) {
 const q = decodeURIComponent(rawHash.replace('search-', ''));
 document.getElementById('main-search').value = q;
 doSearch();
 } else {
 navigate(rawHash);
 }
 history.replaceState(null, '', window.location.pathname);
 }, 80);
 }

 // اقرأ ?q= من الـ URL (من صفحات المقالات الخارجية)
 const urlParams = new URLSearchParams(window.location.search);
 const qParam = urlParams.get('q');
 if (qParam) {
 setTimeout(() => {
 const inp = document.getElementById('main-search');
 if (inp) { inp.value = qParam; doSearch(); }
 history.replaceState(null, '', window.location.pathname);
 }, 100);
 }
 }

 // ===== WIKIPEDIA LIVE DATA =====

 // cache to avoid re-fetching
 const _imageCache = {};

 async function loadWikiHomeSections() {
 Promise.all([ loadOnThisDay(), loadFeaturedArticle() ]);
 }

 /* --- بنشرة اليوم --- */
 async function loadOnThisDay() {
 const el = document.getElementById('card-onthisday');
 if (!el) return;

 el.innerHTML = `<div style="padding:12px;font-family:var(--font-mono);font-size:11px;color:var(--gray-400);text-align:center;display:flex;align-items:center;gap:8px;justify-content:center"><div class="wiki-spinner"></div> جارٍ تحميل أحداث اليوم من ويكيبيديا…</div>`;

 const events = await WikiAPI.fetchOnThisDay();
 if (!events || !events.length) {
 el.innerHTML = `<p style="font-size:13px;color:var(--gray-400);padding:8px">تعذّر تحميل البيانات. تحقق من اتصالك.</p>`;
 return;
 }

 const d = new Date();
 const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
 const dateStr = `${d.getDate()} ${months[d.getMonth()]}`;

 let html = `<p style="font-family:var(--font-mono);font-size:11px;color:var(--gray-400);margin-bottom:10px"> ${dateStr} — من ذاكرة ويكيبيديا</p>`;

 events.slice(0, 5).forEach(ev => {
 const year = ev.year || '';
 const text = (ev.text || '').slice(0, 130);
 const pages = ev.pages || [];
 const link = pages[0]?.content_urls?.desktop?.page || null;
 const linkA = link
 ? `<a href="${link}" target="_blank" rel="noopener" style="font-family:var(--font-mono);font-size:10px;color:var(--link)">[]</a>`
 : '';
 html += `<p style="margin-bottom:8px;font-size:14px;line-height:1.6">• <strong>${year}</strong> — ${text}… ${linkA}</p>`;
 });

 html += `<span class="home-more-link" onclick="window.open('https://ar.wikipedia.org/wiki/بوابة:في_مثل_هذا_اليوم','_blank')"> أحداث هذا اليوم كاملاً في ويكيبيديا </span>`;
 el.innerHTML = html;
 }

 /* --- مقالة اليوم المختارة --- */
 async function loadFeaturedArticle() {
 const bannerTitleEl = document.getElementById('featured-article-title');
 const bannerBtnEl = document.getElementById('featured-article-btn');
 const cardEl = document.getElementById('card-featured');
 if (!cardEl) return;

 cardEl.innerHTML = `<div style="padding:12px;display:flex;align-items:center;gap:8px;font-family:var(--font-mono);font-size:11px;color:var(--gray-400)"><div class="wiki-spinner"></div> جارٍ تحميل مقالة اليوم…</div>`;

 const tfa = await WikiAPI.fetchFeaturedArticle();
 if (!tfa) {
 cardEl.innerHTML = `<p style="font-size:13px;color:var(--gray-400);padding:8px">تعذّر تحميل مقالة اليوم.</p>`;
 return;
 }

 const title = (tfa.displaytitle || tfa.title || 'مقالة اليوم').replace(/<[^>]+>/g,'');
 const extract = tfa.extract || '';
 const imgUrl = tfa.thumbnail?.source || tfa.originalimage?.source || '';
 const wikiUrl = tfa.content_urls?.desktop?.page || '#';

 // Update featured banner
 if (bannerTitleEl) bannerTitleEl.textContent = title;
 if (bannerBtnEl) {
 bannerBtnEl.textContent = 'اقرأ في ويكيبيديا ';
 bannerBtnEl.onclick = () => window.open(wikiUrl, '_blank');
 }

 // Build card
 let imgHtml = '';
 if (imgUrl) {
 imgHtml = `<div style="width:100%;height:180px;overflow:hidden;margin-bottom:10px;position:relative;background:#111;flex-shrink:0"><img src="${imgUrl}" alt="${title}" style="width:100%;height:100%;object-fit:cover" loading="lazy"
 onerror="this.parentElement.innerHTML='<div style=\'display:flex;align-items:center;justify-content:center;height:100%;font-size:48px;opacity:0.1\'>${title.charAt(0)}</div>'" /><div style="position:absolute;bottom:0;right:0;left:0;background:linear-gradient(transparent,rgba(0,0,0,0.7));padding:8px;font-family:var(--font-mono);font-size:9px;color:var(--gray-300)"> ويكيبيديا · CC BY-SA 4.0</div></div>`;
 } else {
 imgHtml = `<div class="feat-img" style="margin-bottom:10px"><span style="font-family:var(--font-display);font-size:48px;color:rgba(255,255,255,0.1)">${title.charAt(0)}</span></div>`;
 }

 cardEl.innerHTML = imgHtml + `
 <p style="font-size:14px;line-height:1.75"><strong><a href="${wikiUrl}" target="_blank" rel="noopener" style="color:var(--link)">${title}</a></strong> — ${extract.slice(0,200)}${extract.length > 200 ? '…' : ''}</p><a href="${wikiUrl}" target="_blank" rel="noopener" class="home-more-link"> اقرأ المقالة كاملةً في ويكيبيديا </a>`;
 }

 /* --- تحميل صور المقالات عند فتحها --- */
 async function loadArticleImages() {
 setTimeout(async () => {
 const imgs = document.querySelectorAll('#article-body .wiki-img');
 for (const el of imgs) {
 const wikiTitle = el.dataset.wikiTitle;
 const artKey = el.dataset.artKey;
 if (!wikiTitle) continue;
 const imgEl = el.querySelector('img.wiki-photo');
 if (!imgEl) continue;

 // Use cache if available
 if (_imageCache[artKey]) {
 imgEl.src = _imageCache[artKey];
 continue;
 }
 const url = await WikiAPI.fetchArticleImage(wikiTitle);
 if (url) {
 imgEl.src = url;
 if (artKey) _imageCache[artKey] = url;
 }
 }
 }, 80);
 }

 // ===== NAVIGATION =====
 function navigate(target) {
 const parts = target.split('-');
 const base = parts[0];
 const sub = parts.slice(1).join('-');

 document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
 window.scrollTo(0, 0);

 const show = id => document.getElementById(id)?.classList.add('active');

 switch (base) {
 case 'home':
 show('page-home');
 setTabsVisible(true);
 document.title = 'نُسُقِيبيديا — الموسوعة الحرة';
 history.replaceState(null, '', '#home');
 break;

 case 'article':
 // إذا المقالة عندها مسار خارجي في ARTICLES، روح لها مباشرة
 if (ARTICLES[sub] && ARTICLES[sub].externalUrl) {
 window.location.href = ARTICLES[sub].externalUrl;
 return;
 }
 loadArticle(sub || 'main', false);
 show('page-article');
 setTabsVisible(true);
 // حدّث الـ hash في الـ URL بدون ما تعيد تحميل الصفحة
 history.replaceState(null, '', '#article-' + (sub || 'main'));
 break;

 case 'login':
 if (currentUser) { navigate('profile'); return; }
 show('page-login');
 setTabsVisible(false);
 document.title = 'تسجيل الدخول — نُسُقِيبيديا';
 break;

 case 'profile':
 if (!currentUser) { navigate('login'); return; }
 loadProfile();
 show('page-profile');
 setTabsVisible(false);
 document.title = 'الملف الشخصي — نُسُقِيبيديا';
 break;

 case 'search':
 show('page-search');
 setTabsVisible(false);
 document.title = 'نتائج البحث — نُسُقِيبيديا';
 break;

 case 'portals':
 show('page-portals');
 setTabsVisible(false);
 document.title = 'البوابات — نُسُقِيبيديا';
 break;

 case 'discuss':
 show('page-discuss');
 setTabsVisible(true);
 document.title = 'نقاش — نُسُقِيبيديا';
 break;

 case 'random':
 const r = RANDOM_ARTICLES[Math.floor(Math.random() * RANDOM_ARTICLES.length)];
 loadArticle(r, true);
 show('page-article');
 setTabsVisible(true);
 break;

 default:
 show('page-home');
 setTabsVisible(true);
 }
 }

 function setTabsVisible(show) {
 // Tabs are always visible but this can be used for future logic
 }

 // ===== ARTICLE LOADER =====
 function loadArticle(key, isRandom = false) {
 const art = ARTICLES[key] || ARTICLES['main'];
 document.getElementById('article-page-title').textContent = art.title;
 document.getElementById('article-page-subtitle').textContent = art.subtitle;
 document.getElementById('article-read-time').textContent = ' للقراءة: ' + art.readTime;
 document.getElementById('article-breadcrumb-current').textContent = art.title;
 document.getElementById('article-body').innerHTML = art.content;
 document.title = art.title + ' — نُسُقِيبيديا';

 // Categories
 const catsEl = document.getElementById('article-cats');
 if (catsEl) catsEl.innerHTML = art.cats.map(c => `<span class="cat-tag">${c}</span>`).join('');

 // Random banner
 const banner = document.getElementById('random-banner');
 if (banner) banner.style.display = isRandom ? 'flex' : 'none';

 // Wikipedia source badge
 const srcBadge = document.getElementById('article-wiki-src');
 if (srcBadge) {
 if (art.wikiUrl) {
 srcBadge.innerHTML = '<a href="' + art.wikiUrl + '" target="_blank" rel="noopener" style="font-family:var(--font-mono);font-size:10px;color:var(--link)"> المصدر: ويكيبيديا العربية </a>';
 srcBadge.style.display = '';
 } else {
 srcBadge.style.display = 'none';
 }
 }

 // Fetch Wikipedia images for infoboxes
 loadArticleImages();
 }

 // ===== SEARCH =====
 function onSearchInput() {
 const val = this.value.trim();
 if (val.length < 1) { hideSuggestions(); return; }
 const matches = SUGGESTIONS_DATA
 .filter(s => s.includes(val) || val.includes(s.slice(0, 2)))
 .slice(0, 7);
 if (!matches.length) { hideSuggestions(); return; }
 const box = document.getElementById('search-suggestions');
 box.innerHTML = matches.map(m => `
 <div class="suggestion-item" onclick="App.selectSuggestion('${m}')"><span class="sug-icon"></span><span>${m}</span><span class="sug-type">مقالة</span></div>
 `).join('') + `
 <div class="suggestion-item" style="background:var(--gray-50)" onclick="App.doSearch()"><span class="sug-icon"></span><span>بحث عن: <strong>${val}</strong></span></div>`;
 box.classList.add('show');
 }

 function hideSuggestions() {
 document.getElementById('search-suggestions')?.classList.remove('show');
 }

 function selectSuggestion(val) {
 document.getElementById('main-search').value = val;
 hideSuggestions();
 doSearch();
 }

 function doSearch() {
 const q = document.getElementById('main-search')?.value.trim();
 if (!q) return;
 hideSuggestions();
 searchQuery = q;
 document.getElementById('search-query-display').textContent = '"' + q + '"';
 performSearch(q, 'all');
 navigate('search');
 }

 function performSearch(q, category) {
 const results = SEARCH_DATA
 .filter(item => {
 const match = item.title.includes(q) || item.excerpt.includes(q) || q.length <= 2;
 const catMatch = category === 'all' || item.category === category;
 return match && catMatch;
 })
 .map(r => ({ ...r, score: (r.title.includes(q) ? 10 : 0) + (r.excerpt.includes(q) ? 5 : 1) }))
 .sort((a, b) => b.score - a.score);

 document.getElementById('search-count').textContent =
 `${results.length} نتيجة (${(Math.random() * 0.08 + 0.02).toFixed(2)} ثانية)`;

 if (!results.length) {
 document.getElementById('search-results-list').innerHTML = `
 <div class="no-results"><span class="no-results-icon"></span><h3>لا نتائج لـ "${q}"</h3><p>جرّب البحث بكلمات مختلفة أو تحقق من الإملاء</p><p style="margin-top:12px"><a onclick="App.navigate('login')" style="color:var(--link)">أضف هذه المقالة </a></p></div>`;
 return;
 }

 const hl = text => {
 if (!q) return text;
 return text.replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`);
 };

 document.getElementById('search-results-list').innerHTML = results.map(r => `
 <div class="result-item"><div class="result-icon">${r.icon}</div><div class="result-body"><a class="result-title" href="pages/articles/${r.id}.html">${hl(r.title)}</a><div class="result-path">nusugipedia.org › ${r.path}</div><div class="result-excerpt">${hl(r.excerpt)}…</div><div class="result-meta"><span> ${r.date}</span><span> ${r.views} مشاهدة</span><span> مُراجَعة</span></div></div></div>
 `).join('');
 }

 function filterResults(btn, cat) {
 document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
 btn.classList.add('active');
 performSearch(searchQuery, cat);
 }

 // الانتقال من نتائج البحث — يدعم المقالات الخارجية والداخلية
 function navigateResult(id) {
 const art = ARTICLES[id];
 if (art && art.externalUrl) {
 window.location.href = art.externalUrl;
 } else {
 navigate('article-' + id);
 }
 }

 // ===== AUTH =====
 function switchAuthTab(tab) {
 document.getElementById('login-form-container').style.display = tab === 'login' ? '' : 'none';
 document.getElementById('register-form-container').style.display = tab === 'register' ? '' : 'none';
 document.getElementById('login-tab').classList.toggle('active', tab === 'login');
 document.getElementById('register-tab').classList.toggle('active', tab === 'register');
 }

 function doLogin() {
 const user = document.getElementById('login-user')?.value.trim();
 const pass = document.getElementById('login-pass')?.value;
 let valid = true;
 if (!user) { showFieldError('login-user-err', 'login-user'); valid = false; }
 if (!pass) { showFieldError('login-pass-err', 'login-pass'); valid = false; }
 if (!valid) return;

 const btn = document.querySelector('#login-form-container .form-btn');
 btn.textContent = 'جارٍ تسجيل الدخول...';
 btn.disabled = true;
 clearAuthMsg('login-msg');

 setTimeout(() => {
 btn.textContent = 'تسجيل الدخول';
 btn.disabled = false;
 currentUser = {
 username: user,
 email: user.includes('@') ? user : user + '@nusugipedia.org',
 initials: user.charAt(0).toUpperCase()
 };
 saveSession();
 updateAuthUI();
 showToast('مرحباً بك في نُسُقِيبيديا! ');
 navigate('home');
 }, 1200);
 }

 function doRegister() {
 const u = document.getElementById('reg-user')?.value.trim();
 const e = document.getElementById('reg-email')?.value.trim();
 const p = document.getElementById('reg-pass')?.value;
 const p2 = document.getElementById('reg-pass2')?.value;
 const terms = document.getElementById('terms-accept')?.checked;
 let valid = true;

 if (!u || u.length < 3) { showFieldError('reg-user-err', 'reg-user'); valid = false; }
 if (!e || !e.includes('@')) { showFieldError('reg-email-err', 'reg-email'); valid = false; }
 if (!p || p.length < 8) { showFieldError('reg-pass-err', 'reg-pass'); valid = false; }
 if (p !== p2) { showFieldError('reg-pass2-err', 'reg-pass2'); valid = false; }
 if (!terms) { showToast(' يجب قبول الشروط والأحكام أولاً'); return; }
 if (!valid) return;

 const btn = document.querySelector('#register-form-container .form-btn');
 btn.textContent = 'جارٍ إنشاء الحساب...';
 btn.disabled = true;

 setTimeout(() => {
 btn.textContent = 'إنشاء الحساب مجاناً';
 btn.disabled = false;
 setAuthMsg('register-msg', 'success', ' تم إنشاء حسابك بنجاح! سيصلك بريد تأكيد على ' + e);
 currentUser = { username: u, email: e, initials: u.charAt(0).toUpperCase() };
 saveSession();
 setTimeout(() => { updateAuthUI(); showToast('أهلاً وسهلاً ' + u + '! '); navigate('home'); }, 1500);
 }, 1500);
 }

 function doSocialLogin(provider, btn) {
 btn.textContent = '⏳ جارٍ الاتصال...';
 setTimeout(() => {
 const icons = { Google: ' Google', GitHub: ' GitHub', Twitter: '𝕏 Twitter' };
 btn.textContent = icons[provider] || provider;
 const name = provider + 'User' + Math.floor(Math.random() * 9000 + 1000);
 currentUser = {
 username: name,
 email: name.toLowerCase() + '@' + provider.toLowerCase() + '.com',
 initials: provider.charAt(0)
 };
 saveSession();
 updateAuthUI();
 showToast('تم الدخول عبر ' + provider + ' بنجاح! ');
 navigate('home');
 }, 1000);
 }

 function doLogout() {
 currentUser = null;
 try { sessionStorage.removeItem('nusugipedia_user'); } catch (e) {}
 updateAuthUI();
 showToast('تم تسجيل الخروج. إلى اللقاء!');
 navigate('home');
 }

 function saveSession() {
 try { sessionStorage.setItem('nusugipedia_user', JSON.stringify(currentUser)); } catch (e) {}
 }

 function updateAuthUI() {
 const area = document.getElementById('auth-nav-area');
 if (!area) return;
 if (currentUser) {
 area.innerHTML = `
 <div class="user-menu-wrap"><div class="user-avatar" onclick="App.toggleUserMenu()">${currentUser.initials || '؟'}</div><div class="user-dropdown" id="user-dropdown"><div class="user-dropdown-header"><div class="user-dropdown-name">${currentUser.username}</div><div class="user-dropdown-email">${currentUser.email}</div></div><div class="user-dropdown-links"><a onclick="App.navigate('profile');App.closeUserMenu()"> ملفي الشخصي</a><a onclick="App.navigate('profile');App.closeUserMenu()"> قائمة المراقبة</a><a onclick="App.navigate('profile');App.closeUserMenu()"> مساهماتي</a><a onclick="App.navigate('profile');App.closeUserMenu()">️ الإعدادات</a><a class="logout" onclick="App.doLogout();App.closeUserMenu()"> تسجيل الخروج</a></div></div></div>`;
 } else {
 area.innerHTML = `<a onclick="App.navigate('login')" class="btn-login-nav">دخول</a>`;
 }
 }

 function toggleUserMenu() {
 document.getElementById('user-dropdown')?.classList.toggle('show');
 }

 function closeUserMenu() {
 document.getElementById('user-dropdown')?.classList.remove('show');
 }

 // ===== PROFILE =====
 function loadProfile() {
 if (!currentUser) return;
 document.getElementById('profile-avatar-big').textContent = currentUser.initials || '؟';
 document.getElementById('profile-display-name').textContent = currentUser.username;
 document.getElementById('profile-display-email').textContent = currentUser.email;
 const sn = document.getElementById('settings-name');
 const se = document.getElementById('settings-email');
 if (sn) sn.value = currentUser.username;
 if (se) se.value = currentUser.email;
 }

 function switchProfileTab(btn, tab) {
 document.querySelectorAll('.profile-tab').forEach(b => b.classList.remove('active'));
 if (btn?.classList) btn.classList.add('active');
 ['overview', 'contribs', 'watchlist', 'settings'].forEach(t => {
 const el = document.getElementById('profile-tab-' + t);
 if (el) el.style.display = t === tab ? '' : 'none';
 });
 }

 function saveSettings() {
 const name = document.getElementById('settings-name')?.value.trim();
 const email = document.getElementById('settings-email')?.value.trim();
 if (name && currentUser) {
 currentUser.username = name;
 currentUser.email = email || currentUser.email;
 currentUser.initials = name.charAt(0).toUpperCase();
 saveSession();
 updateAuthUI();
 loadProfile();
 showToast(' تم حفظ التغييرات بنجاح!');
 }
 }

 // ===== FORM HELPERS =====
 function showFieldError(errId, inputId) {
 document.getElementById(errId)?.classList.add('show');
 const inp = document.getElementById(inputId);
 if (inp) {
 inp.classList.add('error');
 inp.addEventListener('input', function () {
 document.getElementById(errId)?.classList.remove('show');
 this.classList.remove('error');
 }, { once: true });
 }
 }

 function setAuthMsg(id, type, text) {
 const el = document.getElementById(id);
 if (!el) return;
 el.className = 'auth-msg ' + type;
 el.textContent = text;
 }

 function clearAuthMsg(id) {
 const el = document.getElementById(id);
 if (el) { el.className = 'auth-msg'; el.textContent = ''; }
 }

 function checkUsername(input) {
 const hint = document.getElementById('reg-user-hint');
 if (!hint) return;
 const v = input.value;
 if (v.length >= 3 && /^[\w_\u0600-\u06FF]+$/.test(v)) {
 hint.textContent = ' اسم المستخدم متاح!';
 hint.style.color = 'var(--success)';
 } else if (v.length > 0) {
 hint.textContent = 'يجب أن يكون ٣ أحرف على الأقل بدون مسافات';
 hint.style.color = 'var(--error)';
 } else {
 hint.textContent = 'أحرف وأرقام وشرطة سفلية فقط (٣-٢٠ محرف)';
 hint.style.color = '';
 }
 }

 function checkPasswordStrength(input) {
 const p = input.value;
 const fill = document.getElementById('strength-fill');
 const label = document.getElementById('strength-label');
 if (!fill || !label) return;
 let score = 0;
 if (p.length >= 8) score++;
 if (p.length >= 12) score++;
 if (/[A-Z]/.test(p) || /[\u0600-\u06FF]/.test(p)) score++;
 if (/[0-9]/.test(p)) score++;
 if (/[^A-Za-z0-9]/.test(p)) score++;
 const levels = ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية جداً!'];
 const colors = ['#cc0000', '#ff6600', '#b8860b', '#1a7a1a', '#0645ad'];
 fill.style.width = (score * 20) + '%';
 fill.style.background = colors[score - 1] || '#cc0000';
 label.textContent = 'قوة كلمة المرور: ' + (levels[score - 1] || '—');
 }

 function showForgotPassword() {
 const u = document.getElementById('login-user')?.value.trim();
 const msg = document.getElementById('login-msg');
 if (!msg) return;
 if (!u) {
 setAuthMsg('login-msg', 'error', 'أدخل بريدك الإلكتروني أولاً ثم اضغط "نسيت كلمة المرور"');
 } else {
 setAuthMsg('login-msg', 'success', ' تم إرسال رابط استعادة كلمة المرور إلى ' + u);
 }
 }

 // ===== DISCUSSION =====
 function toggleReply(btn) {
 if (!currentUser) { navigate('login'); return; }
 btn.closest('.discussion-item')?.querySelector('.reply-form')?.classList.toggle('show');
 }

 function sendReply(btn) {
 const ta = btn.previousElementSibling;
 if (!ta?.value.trim()) return;
 showToast(' تم إرسال ردك بنجاح!');
 ta.value = '';
 btn.closest('.reply-form')?.classList.remove('show');
 }

 function startNewDiscussion() {
 if (!currentUser) { navigate('login'); return; }
 showToast(' ميزة النقاش الجديد قيد التطوير...');
 }

 // ===== TOC =====
 function toggleToc() {
 const list = document.getElementById('toc-list');
 if (!list) return;
 const hidden = list.style.display === 'none';
 list.style.display = hidden ? '' : 'none';
 if (event?.target) event.target.textContent = hidden ? '[إخفاء]' : '[إظهار]';
 }

 // ===== TAB SWITCHING =====
 function switchTab(tab) {
 document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
 document.getElementById('tab-' + tab)?.classList.add('active');
 if (tab === 'discuss') navigate('discuss');
 if (tab === 'article') navigate('article-main');
 if (tab === 'history') showToast('تاريخ التعديلات: ٤٩٢ تعديل منذ التأسيس');
 if (tab === 'edit') navigate('login');
 }

 // ===== TOAST =====
 function showToast(msg) {
 const t = document.getElementById('toast');
 if (!t) return;
 t.textContent = msg;
 t.classList.add('show');
 clearTimeout(t._timer);
 t._timer = setTimeout(() => t.classList.remove('show'), 3000);
 }

 // ===== SCROLL =====
 function onScroll() {
 const scrolled = window.scrollY;
 const total = document.body.scrollHeight - window.innerHeight;
 const bar = document.getElementById('scroll-bar');
 const btn = document.getElementById('back-top');
 if (bar) bar.style.height = total > 0 ? (scrolled / total * 100) + '%' : '0';
 if (btn) btn.classList.toggle('show', scrolled > 300);
 }

 // ===== PUBLIC API =====
 return {
 init,
 navigate,
 loadWikiHomeSections,
 doSearch,
 selectSuggestion,
 filterResults,
 navigateResult,
 switchAuthTab,
 doLogin,
 doRegister,
 doSocialLogin,
 doLogout,
 toggleUserMenu,
 closeUserMenu,
 switchProfileTab,
 saveSettings,
 checkUsername,
 checkPasswordStrength,
 showForgotPassword,
 toggleReply,
 sendReply,
 startNewDiscussion,
 toggleToc,
 switchTab,
 showToast
 };
})();

// Boot on DOM ready
document.addEventListener('DOMContentLoaded', App.init);

// Global helpers used in inline onclick attributes
function navigate(t) { App.navigate(t); }
function toggleToc() { App.toggleToc(); }
function doSearch() { App.doSearch(); }
function filterResults(b, c) { App.filterResults(b, c); }
function switchTab(t) { App.switchTab(t); }
