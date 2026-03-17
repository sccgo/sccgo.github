/* =========================================
 نُسُقِيبيديا — Wikipedia API Integration
 js/wikipedia.js
 =========================================
 يستخدم Wikipedia REST API و MediaWiki API
 بدون مفتاح — مفتوح للعموم مع CORS
 ========================================= */

const WikiAPI = (() => {

 const AR_API = 'https://ar.wikipedia.org/w/api.php';
 const AR_REST = 'https://ar.wikipedia.org/api/rest_v1';

 /* ---------- helpers ---------- */
 function qs(params) {
 return Object.entries({ ...params, origin: '*', format: 'json' })
 .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
 .join('&');
 }

 async function get(base, params) {
 try {
 const r = await fetch(`${base}?${qs(params)}`);
 if (!r.ok) throw new Error(r.status);
 return r.json();
 } catch (e) {
 console.warn('WikiAPI error:', e);
 return null;
 }
 }

 /* ---------- 1. أحداث هذا اليوم ---------- */
 async function fetchOnThisDay() {
 const d = new Date();
 const mm = String(d.getMonth() + 1).padStart(2, '0');
 const dd = String(d.getDate()).padStart(2, '0');
 try {
 const r = await fetch(
 `https://ar.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`,
 { headers: { Accept: 'application/json' } }
 );
 if (!r.ok) throw new Error(r.status);
 const data = await r.json();
 // events مرتبة تنازليًا، خذ أول 6
 return (data.events || []).slice(0, 6);
 } catch (e) {
 console.warn('onthisday error:', e);
 return null;
 }
 }

 /* ---------- 2. مقالة اليوم (المقالة المختارة) ---------- */
 async function fetchFeaturedArticle() {
 // الطريقة الأولى: REST feed/featured
 try {
 const d = new Date();
 const y = d.getFullYear();
 const mm = String(d.getMonth() + 1).padStart(2, '0');
 const dd = String(d.getDate()).padStart(2, '0');
 const r = await fetch(
 `https://ar.wikipedia.org/api/rest_v1/feed/featured/${y}/${mm}/${dd}`,
 { headers: { Accept: 'application/json' }, mode: 'cors' }
 );
 if (!r.ok) throw new Error(r.status);
 const data = await r.json();
 if (data.tfa) return data.tfa;
 } catch(e) {
 console.warn('feed/featured failed, trying MediaWiki API...', e);
 }

 // الطريقة الثانية: MediaWiki API — أفضل توافقاً مع CORS
 try {
 const r2 = await fetch(
 `https://ar.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*`
 );
 if (!r2.ok) throw new Error(r2.status);
 const d2 = await r2.json();
 const title = d2.query?.random?.[0]?.title;
 if (title) return fetchArticleSummary(title);
 } catch(e2) {
 console.warn('MediaWiki random failed:', e2);
 }

 // الطريقة الثالثة: مقالة ثابتة كـ fallback نهائي
 return fetchArticleSummary('الذكاء_الاصطناعي');
 }

 /* ---------- 3. مقالة عشوائية جيدة (fallback) ---------- */
 async function fetchRandomArticle() {
 const data = await get(AR_API, {
 action: 'query',
 list: 'random',
 rnnamespace: 0,
 rnlimit: 1
 });
 if (!data) return null;
 const page = data.query?.random?.[0];
 if (!page) return null;
 return fetchArticleSummary(page.title);
 }

 /* ---------- 4. ملخص مقالة بعنوانها ---------- */
 async function fetchArticleSummary(title) {
 try {
 const r = await fetch(
 `${AR_REST}/page/summary/${encodeURIComponent(title)}`,
 { headers: { Accept: 'application/json' } }
 );
 if (!r.ok) throw new Error(r.status);
 return r.json();
 } catch (e) {
 return null;
 }
 }

 /* ---------- 5. صورة مقالة من ويكيبيديا ---------- */
 async function fetchArticleImage(title) {
 const data = await get(AR_API, {
 action: 'query',
 titles: title,
 prop: 'pageimages',
 piprop: 'thumbnail|original',
 pithumbsize: 400
 });
 if (!data) return null;
 const pages = data.query?.pages || {};
 const page = Object.values(pages)[0];
 return page?.thumbnail?.source || page?.original?.source || null;
 }

 /* ---------- 6. محتوى مقالة كامل (sections) ---------- */
 async function fetchArticleContent(title) {
 const data = await get(AR_API, {
 action: 'parse',
 page: title,
 prop: 'text|categories|images',
 mobileformat: true,
 disableeditsection: true
 });
 return data?.parse || null;
 }

 /* ---------- 7. صور متعددة ---------- */
 async function fetchMultipleImages(titles) {
 // titles: array of article titles
 const results = {};
 await Promise.all(
 titles.map(async title => {
 results[title] = await fetchArticleImage(title);
 })
 );
 return results;
 }

 /* ---------- 8. جلب صور المقالات الثابتة ---------- */
 const ARTICLE_IMAGE_TITLES = {
 main: 'ويكيبيديا',
 ai: 'ذكاء_اصطناعي',
 quantum: 'ميكانيكا_الكم',
 cosmos: 'كون',
 arabic: 'اللغة_العربية',
 blackhole: 'ثقب_أسود',
 cleopatra: 'كليوباترا',
 ww2: 'الحرب_العالمية_الثانية'
 };

 async function preloadArticleImages() {
 const imgs = {};
 await Promise.all(
 Object.entries(ARTICLE_IMAGE_TITLES).map(async ([key, title]) => {
 imgs[key] = await fetchArticleImage(title);
 })
 );
 return imgs;
 }

 return {
 fetchOnThisDay,
 fetchFeaturedArticle,
 fetchArticleSummary,
 fetchArticleImage,
 fetchArticleContent,
 fetchMultipleImages,
 preloadArticleImages,
 ARTICLE_IMAGE_TITLES
 };
})();
