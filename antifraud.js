/* 부정클릭 방지 시스템 V35 — Vercel 배포용 (antifraud.js) */
/* V35 변경사항 (2026-04-08): SERVER_PRE_CHECK 고스트 차단 레코드 제거
 *  1. CHECK_UID blocked 응답 시 BLOCK 재전송 제거 (차단목록에 score=0 고스트 레코드 방지)
 *
 * V32 변경사항 (2026-04-02): Nonce 타임아웃 클라이언트 검증
 *  1. S.wlNonceTime 추가 — nonce 발급 시각 기록
 *  2. WHITELIST 전송 전 nonce 경과 시간 체크 (25분 초과 시 VISIT 재호출로 갱신)
 *  3. 서버 30분 TTL에 5분 여유를 두어 nonce 만료로 인한 WHITELIST 실패 방지
 *
 * V31 변경사항 (2026-04-01): 보안 감사 2차 — CRITICAL/HIGH/MEDIUM 일괄 패치
 *  1. 클라이언트 시크릿(SK) 제거 — Origin+Timestamp 인증으로 대체
 *  2. localStorage 차단 캐시 의존도 축소 — 서버 CHECK_UID를 최종 권한으로 사용
 *  3. DST 타임존 안정화 — getTimezoneOffset() → Intl timeZone 사용
 *
 * V30 변경사항 (2026-04-01): 보안 감사 기반 취약점 패치
 *  1. WHITELIST nonce 검증: VISIT 응답의 1회성 토큰 없이 WHITELIST 호출 불가
 *  2. sendToServer 응답에서 wl_nonce 추출/저장
 *  3. S 상태에 wlNonce 필드 추가
 *
 * V29 변경사항 (2026-03-31):
 *  1. PAGEVIEW 서버 응답에서 차단 감지 시 즉시 renderAccessDenied() (다수 PV 방지)
 *  2. fetchIPInfo + checkServerUID 병렬 실행 (초기화 타이밍 갭 1~5초 → 1~2초)
 *  3. sendToServer 응답에서 blocked 플래그 처리 추가
 *
 * V28 변경사항 (2026-03-31):
 *  1. checkServerUID 재시도 로직 수정: blocked일 때만 재확인 (오차단 방지)
 *  2. 화이트리스트 로컬 캐시 7일 만료 추가 (영구 면제 방지)
 *  3. postMessage origin 검증 강화: 빈 origin 차단 (data: URI 우회 방지)
 *  4. Audio 핑거프린트 타이밍 개선 (UID 충돌 감소)
 *
 * V27 변경사항 (2026-03-30):
 *  1. RAPID 규칙 완화: 3회/+100 → 5회/+50 (BRS 이중처벌 방지)
 *  2. tel: 링크 클릭 감지 → BQS +35 (모바일 전화 고객 보호)
 *  3. 화이트리스트 등록 시 로컬 차단 캐시 제거 (재방문 차단 화면 방지)
 *  4. 서버 CHECK_UID 응답의 isWhitelisted 플래그 처리
 *  5. 타임아웃/네트워크 오류 시 로컬 화이트리스트 체크 우선
 */
var G = 'https://script.google.com/macros/s/AKfycbwEENIblM0NCX7uQn-zVOY1IcwNj7aboQw98ZVWJ1dmrwDIs3S4QgF2Gv3smBhaIQxmqQ/exec';
// V31: 클라이언트 시크릿 제거 — 서버는 Origin+Timestamp로 인증 (소스 노출 무력화)
var CONFIG = { GAS_URL: G, FCS: 30, SWM: 30, SCL: 2, EDM: 10000 };  // V23: STH 삭제 (클라이언트 즉시 차단 삭제됨, 미사용 dead code)
var W = { BH: 50, VPN: 80, FC: 15, SV: 30, NI: 10 }; // V23: FC 40→15, SV 60→30 (refactor-instructions 준수 — 오탐 감소 우선)
var S = { uid: '', ip: '', isp: '', isVPN: false, deviceType: '', deviceModel: '', siteDomain: '', adRank: '', adProduct: '', isNaverAd: false, pageViews: 1, sessionStart: Date.now(), engagements: 0, isWhitelisted: false, isBlocked: false, score: 0, scoreReasons: [], keyword: '', iframeActive: false, nQuery: '', nKeyword: '', referrer: '', wlNonce: '', wlNonceTime: 0 };
var BM = { scrollDepth: 0, scrollSpeeds: [], touchCount: 0, firstInteractMs: 0, formFocusMs: 0, formFillStart: 0, formFillMs: 0, idleSegments: 0, mouseMoveDist: 0, lastActivityMs: 0, telClicked: false };

// ── UID 생성 (결정론적 디바이스 핑거프린트) ──
// V25 정규 사양: Canvas(300x70 gradient) + WebGL(vendor+renderer+version+shading)
// + Audio(sawtooth 8-bin) + HW(cores+mem) + Screen(WxHxCD+availWxH)
// + TZ + platform + language + maxTouchPoints + languages
// ⚠ Wix 구버전(wix_customcode.html)은 다른 핑거프린트를 사용했으므로
//   마이그레이션 전후 같은 기기에서 다른 UID가 생성될 수 있음 (2026-03 이전 데이터)
async function generateUID() {
    var uid = recoverUIDSync();
    if (!uid) { try { uid = await idbGet('naf_uid') } catch (e) { } }
    if (uid) { persistUID(uid); return uid }
    var s = [];
    try { var c = document.createElement('canvas'); c.width = 300; c.height = 70; var x = c.getContext('2d'); var g = x.createLinearGradient(0, 0, 300, 70); g.addColorStop(0, '#f0f'); g.addColorStop(1, '#0ff'); x.fillStyle = g; x.fillRect(0, 0, 300, 70); x.fillStyle = 'rgba(0,32,128,.85)'; x.font = 'bold 20px Arial'; x.fillText('DeviceIntegrity', 4, 30); x.font = '12px Georgia'; x.fillText('AntiFraud20', 150, 55); s.push('cv:' + c.toDataURL()) } catch (e) { s.push('cv:e') }
    try { var gl = document.createElement('canvas').getContext('webgl'); if (gl) { var e2 = gl.getExtension('WEBGL_debug_renderer_info'); if (e2) { s.push(gl.getParameter(e2.UNMASKED_VENDOR_WEBGL)); s.push(gl.getParameter(e2.UNMASKED_RENDERER_WEBGL)) } s.push(gl.getParameter(gl.VERSION)); s.push(gl.getParameter(gl.SHADING_LANGUAGE_VERSION)); } } catch (e) { s.push('wgl:e') }
    var a2; try { var A = window.AudioContext || window.webkitAudioContext; a2 = new A(); var o = a2.createOscillator(), n = a2.createAnalyser(), g2 = a2.createGain(); g2.gain.value = 0; o.connect(n); n.connect(g2); g2.connect(a2.destination); o.type = 'sawtooth'; o.start(0); var b = new Float32Array(n.frequencyBinCount); n.getFloatFrequencyData(b); o.stop(); s.push('au:' + Array.from(b.slice(0, 8)).map(function (v) { return v.toFixed(1) }).join(',')) } catch (e) { s.push('au:e') } finally { if (a2) { try { a2.close(); } catch (e2) { } } }
    // V31: DST 안정화 — getTimezoneOffset()은 DST 전환 시 변경되므로 IANA 타임존명 사용
    var tzName = ''; try { tzName = Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch(e) { tzName = '' + (new Date().getTimezoneOffset()) }
    s.push(navigator.hardwareConcurrency || 0, navigator.deviceMemory || 0, screen.width + 'x' + screen.height + 'x' + (screen.colorDepth || 0), screen.availWidth + 'x' + screen.availHeight, tzName, navigator.platform || '', navigator.language || '', navigator.maxTouchPoints || 0, navigator.languages ? navigator.languages.join(',') : '');
    var h = await sha256hex(s.join('|'));
    uid = 'DEV_' + h.substring(0, 24).toUpperCase();
    persistUID(uid);
    return uid;
}

// ── 유틸리티 ──
async function sha256hex(s) { var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return Array.from(new Uint8Array(b)).map(function (b) { return b.toString(16).padStart(2, '0') }).join('') }
function setCk(n, v, d) { try { var e = new Date(); e.setTime(e.getTime() + d * 864e5); document.cookie = n + '=' + encodeURIComponent(v) + ';expires=' + e.toUTCString() + ';path=/;SameSite=Lax' } catch (x) { } }
function getCk(n) { try { var m = document.cookie.match('(^|;)\\s*' + n + '=([^;]*)'); return m ? decodeURIComponent(m[2]) : '' } catch (x) { return '' } }
function idbSet(k, v) { try { var r = indexedDB.open('naf', 1); r.onupgradeneeded = function (e) { e.target.result.createObjectStore('d') }; r.onsuccess = function (e) { try { e.target.result.transaction('d', 'readwrite').objectStore('d').put(v, k) } catch (x) { } } } catch (x) { } }
function idbGet(k) { return new Promise(function (res) { try { var r = indexedDB.open('naf', 1); r.onupgradeneeded = function (e) { e.target.result.createObjectStore('d') }; r.onsuccess = function (e) { try { var g = e.target.result.transaction('d', 'readonly').objectStore('d').get(k); g.onsuccess = function () { res(g.result || '') }; g.onerror = function () { res('') } } catch (x) { res('') } }; r.onerror = function () { res('') } } catch (x) { res('') } }) }
function persistUID(u) { try { localStorage.setItem('naf_uid', u) } catch (e) { } try { sessionStorage.setItem('naf_uid', u) } catch (e) { } setCk('naf_uid', u, 365); idbSet('naf_uid', u) }
function recoverUIDSync() { var u = ''; try { u = localStorage.getItem('naf_uid') } catch (e) { } if (u) return u; u = getCk('naf_uid'); if (u) return u; try { u = sessionStorage.getItem('naf_uid') } catch (e) { } return u || '' }

// ── V28: 화이트리스트 로컬 캐시 (7일 만료) ──
function persistWhitelist(u) {
    var x = '' + (Date.now() + 7 * 864e5);
    try { localStorage.setItem('naf_wl_' + u, x) } catch (e) { }
}
function isLocalWhitelisted(u) {
    var v = '';
    try { v = localStorage.getItem('naf_wl_' + u) } catch (e) { }
    if (!v) return false;
    if (v === '1') return true; // V27 이전 레거시 호환
    var x = +v;
    return x ? Date.now() < x : false;
}

// ── 차단 7일 만료 ──
function persistBlock(u) {
    var x = '' + (Date.now() + 7 * 864e5);
    try { localStorage.setItem('naf_blocked_' + u, x) } catch (e) { }
    setCk('naf_blocked_' + u, x, 7);
    idbSet('naf_blocked_' + u, x);
}
function isLocalBlocked(u) {
    var v = '';
    try { v = localStorage.getItem('naf_blocked_' + u) } catch (e) { }
    if (!v) v = getCk('naf_blocked_' + u);
    if (!v) return false;
    if (v === '1') return true; // 레거시 호환
    var x = +v;
    return x ? Date.now() < x : false;
}

// ── V25: 서버 사전 차단 체크 (UID + IP 전송 — IP/기기 변경 후 재접속도 차단) ──
// 타임아웃 시 로컬 차단 캐시 확인 (fail-safe)
function checkServerUID(uid, ip) {
    function attempt() {
        return new Promise(function (res) {
            var ctrl = new AbortController();
            var timer = setTimeout(function () {
                ctrl.abort();
                // V28: 타임아웃 시에도 로컬 화이트리스트 체크 우선
                try { if (isLocalWhitelisted(uid)) { res(false); return; } } catch(e) {}
                // V31: 타임아웃 시 로컬 차단 캐시는 UX 힌트로만 사용 (서버 확인이 최종 권한)
                // UID 기반만 확인 — IP 기반 로컬 차단은 스푸핑 가능하므로 제거
                var localBlocked = isLocalBlocked(uid);
                res(localBlocked);
            }, 5000);
            fetch(G, {
                method: 'POST',
                body: JSON.stringify({ action: 'CHECK_UID', uid: uid, ip: ip || '', isp: S.isp || '', timestamp: new Date().toISOString() }),
                signal: ctrl.signal
            }).then(function (r) { return r.json() }).then(function (d) {
                clearTimeout(timer);
                // V28: 서버에서 화이트리스트 확인 → 로컬 화이트리스트 플래그 설정 (7일 만료)
                if (d && d.isWhitelisted) {
                    S.isWhitelisted = true;
                    persistWhitelist(uid);
                    try { localStorage.removeItem('naf_blocked_' + uid) } catch(e) {}
                }
                var blocked = d && d.blocked === true;
                // V31: IP 기반 로컬 캐시 제거 (스푸핑 방지) — UID 기반 캐시만 유지
                res(blocked);
            }).catch(function () {
                clearTimeout(timer);
                // V28: 네트워크 오류 시에도 화이트리스트 체크 우선
                try { if (isLocalWhitelisted(uid)) { res(false); return; } } catch(e) {}
                // V31: IP 기반 로컬 차단 제거 — UID 기반만 유지
                var localBlocked = isLocalBlocked(uid);
                res(localBlocked);
            });
        });
    }
    // V28: 차단(true)일 때만 재확인 (오차단 방지). 미차단이면 즉시 통과.
    return attempt().then(function (r) { return r ? attempt() : r });
}

// ── 디바이스 감지 (상세) ──
function detectDevice() {
    var ua = navigator.userAgent;
    var isT = /(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua);
    var isM = !isT && /Android|iPhone|iPod|IEMobile|Opera Mini|Mobile/i.test(ua);
    var dt = isT ? '태블릿' : isM ? '모바일' : 'PC';
    var m = '';
    var sm = ua.match(/;\s*(SM-[A-Z0-9]+)/i);
    if (sm) m = 'Galaxy ' + sm[1].toUpperCase();
    else if (/iPhone/.test(ua)) { var v = ua.match(/CPU iPhone OS (\d+)/i); m = v ? 'iPhone(iOS' + v[1] + ')' : 'iPhone'; }
    else if (/iPad/.test(ua)) { var v = ua.match(/CPU OS (\d+)/i); m = v ? 'iPad(iPadOS' + v[1] + ')' : 'iPad'; }
    else if (/Android/.test(ua)) { var v = ua.match(/;\s*([^;)]+?)\s+Build\//i); m = v ? 'Android(' + v[1].trim().substring(0, 20) + ')' : 'Android'; }
    else if (/Windows NT/.test(ua)) { m = 'PC'; }
    else if (/Macintosh/.test(ua)) { m = 'Mac'; }
    if (!m) m = dt;
    return { deviceType: dt, deviceModel: m };
}

// ── IP 조회 ──
async function fetchIPInfo() {
    var ck = 'naf_ipc';
    try { var cc = JSON.parse(localStorage.getItem(ck)); if (cc && Date.now() - cc.t < 6e5) { S.ip = cc.i; S.isp = cc.s; S.isVPN = cc.v; return } } catch (e) { }  // V32: 30분→10분 캐시 (WiFi→4G 전환 시 IP 변경 반영)
    var v4 = /^(\d{1,3}\.){3}\d{1,3}$/;
    var ps = [
        async () => { var d = await fetch('https://api4.ipify.org?format=json', { cache: 'no-cache' }).then(r => r.json()); if (!v4.test(d.ip)) throw 0; return { ip: d.ip, isp: '' } },
        async () => { var d = await fetch('https://ipwho.is/', { cache: 'no-cache' }).then(r => r.json()); if (!v4.test(d.ip)) throw 0; return { ip: d.ip, isp: d.connection && (d.connection.isp || d.connection.org) || '' } },
    ];
    for (var p of ps) { try { var r = await p(); if (r.ip) { S.ip = r.ip; S.isp = r.isp; S.isVPN = /amazon|google|microsoft|digitalocean|linode|vultr|ovh|hetzner|cloudflare|vpn|proxy|tor|datacenter/i.test(r.isp); try { localStorage.setItem(ck, JSON.stringify({ i: S.ip, s: S.isp, v: S.isVPN, t: Date.now() })) } catch (e) { } return } } catch (e) { } }
}

// ── 방문 이력 & 점수 ──
function analyzeVisitHistory() {
    var n = Date.now(), k = 'naf_v_' + S.uid, w = CONFIG.SWM * 6e4, v = [];
    try { v = JSON.parse(localStorage.getItem(k) || '[]') } catch (e) { }
    v = v.filter(function (t) { return n - t < w });
    var r = { lastVisitAgo: v.length ? (n - v[v.length - 1]) / 1e3 : null, recentCount: v.length };
    v.push(n);
    try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { }
    return r;
}
function calculateScore(vd) {
    var sc = 0, rs = [];
    if (isLocalBlocked(S.uid)) { sc += W.BH; rs.push('HIST:+' + W.BH) }
    if (S.isVPN) { sc += W.VPN; rs.push('VPN:+' + W.VPN) }
    if (vd.lastVisitAgo != null && vd.lastVisitAgo < CONFIG.FCS) { sc += W.FC; rs.push('FLASH:+' + W.FC + '(' + Math.round(vd.lastVisitAgo) + 's)') }
    if (vd.recentCount >= CONFIG.SCL) { sc += W.SV; rs.push('SPAM:+' + W.SV + '(' + vd.recentCount + '회)') }
    // V27: 5회+ 빈도 반복 → 추가 50점 (V22: 3회/+100 → 오탐 감소 위해 완화, BRS와 이중처벌 방지)
    if (vd.recentCount >= 5) { sc += 50; rs.push('RAPID:+50(' + vd.recentCount + '회)') }
    // V25: navigator.webdriver 봇 감지 (Selenium/Puppeteer 즉시 차단)
    if (navigator.webdriver) { sc += 200; rs.push('BOT:webdriver') }
    return { score: sc, reasons: rs };
}

// ── 행동 메트릭 수집 ──
function collectBehaviorMetrics() {
    var lastScrollY = 0, lastScrollTime = Date.now();
    var lastMouseX = 0, lastMouseY = 0;
    BM.lastActivityMs = Date.now();

    window.addEventListener('scroll', function () {
        var now = Date.now(), sy = scrollY || 0;
        var dh = Math.max(document.body.scrollHeight || 0, document.documentElement.scrollHeight || 0) - innerHeight;
        var dp = dh > 0 ? Math.round(sy / dh * 100) : 0;
        if (dp > BM.scrollDepth) BM.scrollDepth = dp;
        var dt = now - lastScrollTime;
        if (dt > 50) { BM.scrollSpeeds.push(Math.abs(sy - lastScrollY) / dt); if (BM.scrollSpeeds.length > 50) BM.scrollSpeeds.shift() }
        lastScrollY = sy; lastScrollTime = now; BM.lastActivityMs = now;
    }, { passive: true });

    ['click', 'touchstart'].forEach(function (ev) {
        window.addEventListener(ev, function (e) {
            // V25: isTrusted 검증 — 합성 이벤트(봇)는 isTrusted=false
            if (e && e.isTrusted === false) { S.score += 100; S.scoreReasons.push('SYNTHETIC_EVENT:' + ev) }
            BM.touchCount++; if (!BM.firstInteractMs) BM.firstInteractMs = Date.now() - S.sessionStart; BM.lastActivityMs = Date.now()
        }, { passive: true });
    });

    window.addEventListener('mousemove', function (e) {
        if (lastMouseX || lastMouseY) BM.mouseMoveDist += Math.sqrt(Math.pow(e.clientX - lastMouseX, 2) + Math.pow(e.clientY - lastMouseY, 2));
        lastMouseX = e.clientX; lastMouseY = e.clientY; BM.lastActivityMs = Date.now();
    }, { passive: true });

    // V27: tel: 링크 클릭 감지 — 전화 고객 보호 (BQS에 반영)
    document.addEventListener('click', function (e) {
        var a = e.target && (e.target.closest ? e.target.closest('a[href^="tel:"]') : null);
        if (!a) { try { a = e.target.tagName === 'A' && e.target.href && e.target.href.indexOf('tel:') === 0 ? e.target : null; } catch(x){} }
        if (a) { BM.telClicked = true; S.engagements += 2; }
    }, true);

    document.addEventListener('focusin', function (e) {
        var t = e.target;
        if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) {
            if (!BM.formFillStart) BM.formFillStart = Date.now();
            var f = Date.now();
            t.addEventListener('blur', function () { BM.formFocusMs += Date.now() - f }, { once: true });
        }
    }, { passive: true });

    setInterval(function () {
        if (!document.hidden && Date.now() - BM.lastActivityMs > 5000) { BM.idleSegments++; BM.lastActivityMs = Date.now() }
    }, 5000);
}

// ── BQS 계산 ──
function calcBQS() {
    var b = 0, d = (Date.now() - S.sessionStart) / 1e3 | 0, ss = BM.scrollSpeeds.slice(); // V22: 동시성 safe - 스냅샷 생성
    b += BM.scrollDepth >= 50 ? 20 : BM.scrollDepth >= 20 ? 10 : 0;
    if (ss.length >= 5) { var m = ss.reduce(function (a, c) { return a + c }, 0) / ss.length, v = ss.reduce(function (a, c) { return a + (c - m) * (c - m) }, 0) / ss.length; b += v > .5 ? 15 : v > .1 ? 5 : 0 }
    if (BM.firstInteractMs > 0 && BM.firstInteractMs < 3e3) b += 10;
    b += d >= 60 ? 15 : d >= 30 ? 5 : 0;
    if (S.pageViews >= 2) b += 10;
    var ffMs = BM.formFocusMs || BM.formFillMs || 0;
    b += ffMs >= 3e4 ? 20 : ffMs >= 1e4 ? 10 : 0;
    if (BM.idleSegments >= 2) b += 10;
    // V27: tel: 링크 클릭 = 전화 의도 → +35점 (짧은 체류 감점 상쇄)
    if (BM.telClicked) b += 35;
    if (d < 5) b -= 30;
    if (S.pageViews <= 1 && d < 10) b -= 20;
    if (!BM.scrollDepth) b -= 15;
    if (ffMs > 0 && ffMs < 5e3) b -= 5;
    return Math.max(0, Math.min(100, b));
}

// ── 차단 화면 ──
function renderAccessDenied() {
    var style = document.createElement('style');
    style.textContent = '#N{position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0d0d0d;color:#d0d0d0;font-family:monospace;display:flex;align-items:center;justify-content:center;z-index:2147483647;padding:16px;box-sizing:border-box}#N .b{max-width:680px;width:100%;border:1px solid #2a2a2a;padding:28px;background:#111}#N h1{font-size:20px;color:#f0f0f0;margin:0 0 12px}#N .n{font-size:11px;color:#3a3a3a;line-height:1.8}';
    document.head.appendChild(style);
    var el = document.createElement('div'); el.id = 'N';
    el.innerHTML = '<div class="b"><h1>접근이 제한되었습니다</h1><div class="n">비정상 접속이 감지되었습니다.<br>고객센터로 문의하십시오.</div></div>';
    document.body.appendChild(el);
}

// ── iframe/폼 리스너 ──
function setupIframeListener() {
    window.addEventListener('message', function (e) {
        // V28: origin 검증 강화 — 빈 origin(data:/file: URI) 차단
        if (!e.origin || e.origin === 'null') return;
        var allowed = [location.origin, 'https://www.osan-xi.com', 'https://www.cantaviledition.com', 'https://www.trivn-seosan.com', 'https://www.xn--9m1b56qknena672c9xaj2f8zko8o45b.com', 'https://unjeong-ipark.com', 'https://www.unjeong-ipark.com'];
        if (allowed.indexOf(e.origin) === -1) return;
        var d = e.data; if (!d) return;
        if (d.type === 'DB_REGISTERED' || d.action === 'GTM_LEAD_COMPLETE' || d.action === 'formSubmitted') {
            // V32: nonce 없으면 WHITELIST 전송 보류 (서버에서도 거부하지만 불필요한 요청 방지)
            if (!S.wlNonce) return;
            S.isWhitelisted = true; S.engagements += 2;
            persistWhitelist(S.uid);
            // V27: 화이트리스트 등록 시 로컬 차단 캐시 제거 (재방문 시 차단 화면 방지)
            try { localStorage.removeItem('naf_blocked_' + S.uid) } catch (x) { }
            try { localStorage.removeItem('naf_ip_blocked') } catch (x) { }
            setCk('naf_blocked_' + S.uid, '', -1);
            BM.formFillMs = BM.formFocusMs > 0 ? BM.formFocusMs : Math.max(0, BM.formFillStart ? Date.now() - BM.formFillStart : 0);
            // V32: nonce 25분(1500000ms) 경과 시 VISIT 재호출로 갱신 후 WHITELIST 전송
            //      서버 TTL 30분에 5분 여유 확보 → nonce 만료로 인한 WHITELIST 실패 방지
            if (S.wlNonceTime && Date.now() - S.wlNonceTime > 1500000) {
                var _wlPayload = JSON.stringify(Object.assign(buildPayload(), { action: 'VISIT' }));
                fetch(G, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: _wlPayload })
                .then(function(r) { return r.json().catch(function() { return {} }) })
                .then(function(rd) {
                    if (rd && rd.wl_nonce) { S.wlNonce = rd.wl_nonce; S.wlNonceTime = Date.now(); }
                    sendToServer({ action: 'WHITELIST', formFillMs: BM.formFillMs, wl_nonce: S.wlNonce });
                })
                .catch(function() {
                    // 갱신 실패 시 기존 nonce로 시도 (서버에서 거부될 수 있음)
                    sendToServer({ action: 'WHITELIST', formFillMs: BM.formFillMs, wl_nonce: S.wlNonce });
                });
            } else {
                sendToServer({ action: 'WHITELIST', formFillMs: BM.formFillMs, wl_nonce: S.wlNonce });
            }
        }
        if (d.type === 'ENGAGEMENT') S.engagements++;
    });
}
function setupEngagementTracking() {
    window.addEventListener('blur', function () { if (!S.iframeActive) { S.iframeActive = true; S.engagements++ } });
    window.addEventListener('focus', function () { S.iframeActive = false });
    var t = 0;
    ['click', 'touchstart', 'scroll'].forEach(function (v) {
        window.addEventListener(v, function () { if (!t) { t = 1; S.engagements++ } }, { passive: true, once: true });
    });
}

// ── V24: 비콘 반복 발화 (누적 visible 시간 + 2초 dedup) ──
function setupBeacon() {
    var visibleStart = Date.now(), totalVisibleMs = 0;

    function snd() {
        var n = Date.now();
        try { var k = 'naf_b_' + S.uid, l = +localStorage.getItem(k) || 0; if (n - l < 2e3) return; localStorage.setItem(k, '' + n) } catch (e) { }
        try { var p = +localStorage.getItem('naf_pv_' + S.uid) || 1; if (p > S.pageViews) S.pageViews = p } catch (e) { }
        var d = buildPayload();
        var dur = Math.min(totalVisibleMs / 1e3 | 0, 1800);
        d.action = 'SESSION_END';
        d.durationSec = dur;
        d.bqs = calcBQS();
        d.scrollDepth = BM.scrollDepth;
        d.formFillMs = BM.formFillMs;
        var payload = JSON.stringify(d);
        if (navigator.sendBeacon) navigator.sendBeacon(G, new Blob([payload], { type: 'text/plain' }));
        else fetch(G, { method: 'POST', body: payload, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(function () { });
    }
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            totalVisibleMs += Date.now() - visibleStart;
            snd();
        } else {
            visibleStart = Date.now();
        }
    });
    window.addEventListener('pagehide', function () {
        if (document.visibilityState !== 'hidden') totalVisibleMs += Date.now() - visibleStart;
        snd();
    });
}

// ── 페이로드 (V31: 시크릿 제거 — 서버에서 Origin+Timestamp 인증) ──
function buildPayload() {
    return {
        uid: S.uid, ip: S.ip, isp: S.isp, deviceType: S.deviceType, deviceModel: S.deviceModel,
        siteDomain: S.siteDomain, siteUrl: location.origin || 'https://' + S.siteDomain,
        adRank: S.adRank, adProduct: S.adProduct, isNaverAd: S.isNaverAd, pageViews: S.pageViews,
        keyword: S.keyword, engagements: S.engagements, score: S.score,
        scoreReasons: S.scoreReasons.join('|'), isWhitelisted: S.isWhitelisted, telClicked: BM.telClicked,
        sessionStart: S.sessionStart, timestamp: new Date().toISOString(),
        nQuery: S.nQuery, nKeyword: S.nKeyword, referrer: S.referrer || ''
    };
}
// V26: 재시도 메커니즘 — VISIT/BLOCK 등 중요 액션 유실 방지
function sendToServer(x, _retry) {
    var retries = _retry || 0;
    var payload = JSON.stringify(Object.assign(buildPayload(), x || {}));
    fetch(G, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: payload })
    .then(function(r) {
        if (!r.ok && retries < 2) { setTimeout(function() { sendToServer(x, retries + 1) }, 1000 * (retries + 1)); }
        return r.json().catch(function() { return {} });
    })
    .then(function(d) {
        if (d && d.error === 'rate_limit' && retries < 2) { setTimeout(function() { sendToServer(x, retries + 1) }, 2000 * (retries + 1)); }
        // V30: VISIT 응답에서 wl_nonce 추출 (WHITELIST 검증용)
        if (d && d.wl_nonce) { S.wlNonce = d.wl_nonce; S.wlNonceTime = Date.now(); }
        // V29: PAGEVIEW/VISIT 응답에서 차단 감지 시 즉시 차단 화면 표시
        if (d && d.blocked && !S.isWhitelisted && !S.isBlocked) {
            S.isBlocked = true; persistBlock(S.uid); renderAccessDenied();
        }
    })
    .catch(function (err) {
        if (retries < 2) { setTimeout(function() { sendToServer(x, retries + 1) }, 1000 * (retries + 1)); }
    });
}


// ── URL 파라미터 추출 ──
function extractKeyword() { try { var p = new URL(location.href).searchParams; return p.get('n_keyword') || p.get('n_query') || p.get('nkw') || p.get('kw') || p.get('keyword') || p.get('query') || '' } catch (e) { return '' } }
function extractNaverAdParams() {
    var o = { adRank: '', adProduct: '', isNaverAd: false, nQuery: '', nKeyword: '' };
    try {
        var p = new URL(location.href).searchParams;
        var ar = p.get('n_rank') || '', nk = p.get('n_keyword') || '', nq = p.get('n_query') || '';
        var isN = !!(ar || nk || nq || p.get('n_media') || p.get('nkw'));
        o.adRank = ar;
        o.adProduct = isN ? '광고/통합검색-' + (S.deviceType === 'PC' ? 'PC' : '모바일') : '';
        o.isNaverAd = isN; o.nQuery = nq; o.nKeyword = nk;
    } catch (e) { }
    return o;
}
function getReferrer() { try { return top.document.referrer || document.referrer } catch (e) { return document.referrer || '' } }
function isRefreshOrBack() { try { var n = performance.getEntriesByType('navigation')[0]; return n && (n.type === 'reload' || n.type === 'back_forward') } catch (e) { } return false }
function isInternalNav() { try { var k = 'naf_s_' + location.hostname, p = +localStorage.getItem(k) || 0, n = Date.now(), r = p > 0 && n - p < CONFIG.SWM * 6e4; if (!r) localStorage.setItem(k, '' + n); return r } catch (e) { return false } }

// ── 메인 (이중실행 가드 + VISIT dedup) ──
async function initAntifraud() {
    if (window._nafInit) return; window._nafInit = 1;

    if (isRefreshOrBack()) {
        var _ru = recoverUIDSync();
        if (_ru) S.uid = _ru;
        if (isLocalBlocked(_ru)) renderAccessDenied();
        setupBeacon(); return;
    }

    S.uid = await generateUID();
    var dv = detectDevice(); S.deviceType = dv.deviceType; S.deviceModel = dv.deviceModel;
    S.siteDomain = location.hostname;
    S.keyword = extractKeyword();
    S.referrer = getReferrer();
    var isInternal = isInternalNav();
    var np = extractNaverAdParams();
    S.adRank = np.adRank; S.adProduct = np.adProduct; S.isNaverAd = np.isNaverAd;
    S.nQuery = np.nQuery; S.nKeyword = np.nKeyword;

    // 내부 네비게이션 (광고 아닌 페이지 이동)
    if (isInternal && !S.isNaverAd) {
        var ss = 0; try { ss = parseInt(localStorage.getItem('naf_start_' + S.uid) || '0', 10) } catch (e) { }
        if (!ss) { setupBeacon(); return }
        S.sessionStart = ss;
        try { var kwD = JSON.parse(localStorage.getItem('naf_kw_' + S.uid) || '{}'); if (kwD.keyword) S.keyword = kwD.keyword; if (kwD.nKeyword) S.nKeyword = kwD.nKeyword; if (kwD.nQuery) S.nQuery = kwD.nQuery } catch (e) { }
        try { if (isLocalWhitelisted(S.uid)) S.isWhitelisted = true } catch (e) { }
        await fetchIPInfo();
        setupIframeListener(); setupEngagementTracking(); collectBehaviorMetrics();
        S.pageViews = (parseInt(localStorage.getItem('naf_pv_' + S.uid) || '1', 10)) + 1;
        try { localStorage.setItem('naf_pv_' + S.uid, String(S.pageViews)) } catch (e) { }
        setupBeacon(); sendToServer({ action: 'PAGEVIEW' }); return;
    }

    // 광고 아닌 유입 → 비콘만 설정
    if (!S.isNaverAd) { setupBeacon(); return }

    // 화이트리스트 체크
    try { if (isLocalWhitelisted(S.uid)) S.isWhitelisted = true } catch (e) { }

    // V32: IP 먼저 조회 후 CHECK_UID (V29 병렬 실행 시 IP 빈 상태 전송 버그 수정)
    var srvBlocked = false;
    try {
      await fetchIPInfo();
    } catch (e) {}
    try {
      srvBlocked = await checkServerUID(S.uid, S.ip);
    } catch (e) {}
    if (!S.isWhitelisted && srvBlocked) { S.isBlocked = true; persistBlock(S.uid); renderAccessDenied(); return }

    setupIframeListener(); setupEngagementTracking(); collectBehaviorMetrics();
    S.sessionStart = Date.now();
    try { localStorage.setItem('naf_start_' + S.uid, String(S.sessionStart)) } catch (e) { }
    try { localStorage.setItem('naf_kw_' + S.uid, JSON.stringify({ keyword: S.keyword, nKeyword: S.nKeyword, nQuery: S.nQuery })) } catch (e) { }
    try { localStorage.setItem('naf_pv_' + S.uid, '1') } catch (e) { }
    setupBeacon();

    var vd = analyzeVisitHistory();
    var cr = calculateScore(vd); S.score = cr.score; S.scoreReasons = cr.reasons;
    // V21: 클라이언트 점수 기반 즉시 차단 삭제. 서버에서 판정

    // VISIT dedup (sessionStorage — 탭 닫으면 자동 삭제)
    var vk = 'naf_vt_' + S.uid + '_' + S.sessionStart;
    if (!sessionStorage.getItem(vk) && S.uid) { sessionStorage.setItem(vk, '1'); sendToServer({ action: 'VISIT' }) }
    setupSPAListener();

    // V21: NO_INTERACTION — 점수 누적만 유지, 차단 삭제
    setTimeout(function () {
        if (S.isBlocked || S.isWhitelisted) return;
        var pv = 0; try { pv = +localStorage.getItem('naf_pv_' + S.uid) || 0 } catch (e) { }
        if (pv >= 2) return;
        var elapsed = (Date.now() - S.sessionStart) / 1000;
        if (elapsed >= 30) return;
        if (S.engagements === 0) {
            S.score += W.NI; S.scoreReasons.push('NI:+' + W.NI);
        }
    }, 15000);
}

function setupSPAListener() {
    if (window._nafSPA) return; window._nafSPA = 1;
    var lu = location.href;
    function on() { if (location.href === lu) return; lu = location.href; S.pageViews++; try { localStorage.setItem('naf_pv_' + S.uid, String(S.pageViews)) } catch (e) { } sendToServer({ action: 'PAGEVIEW' }) }
    var _p = history.pushState, _r = history.replaceState;
    history.pushState = function () { _p.apply(this, arguments); on() };
    history.replaceState = function () { _r.apply(this, arguments); on() };
    window.addEventListener('popstate', on);
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initAntifraud) : initAntifraud();
