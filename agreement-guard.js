/* AgreementGuard v1.2 — 신규 동의서 제출 함수 차단 + UI 라벨 조정 + 자동 팝업 차단
 * 목적: 서약서 시스템 비활성화(2026-09-08) 후 예방 차단 및 UI 명확화
 *       종이 자필서명 방식으로 전환됨
 *
 * v1.2 변경점 (2026-09-10):
 *   + _checkAgreementForStudent 자동 팝업 차단 추가
 *     (비밀번호 변경 후 학생 홈 진입 시 자동으로 뜨던 서약서 팝업 원천 차단)
 *
 * v1.1 변경점: 관리자 UI 라벨 변경
 *   "서약서 제출 관리" → "동의서 관리 (조회/파기 전용)"
 */
(function () {
  'use strict';

  const VERSION = '1.2';

  const BLOCKED_FUNCTIONS = [
    '_agreementSubmit',
    '_agreementSetPrivacy',
    '_agreementSetMedication',
    '_agreementSetFingerprint',
    '_agreementNext',
    '_agreementPrev',
    '_agreementClearSignature',
    '_agreementForceOpen'
  ];

  // v1.2 신규: 자동 팝업 함수 (반환값 false로 체크 통과)
  const BLOCKED_AUTO_POPUP = [
    '_checkAgreementForStudent'
  ];

  const LABEL_CHANGES = [
    { from: '서약서 제출 관리', to: '동의서 관리 (조회/파기 전용)' }
  ];

  // ============================================================
  // 1) 함수 차단 로직 (제출류)
  // ============================================================
  const originalFunctions = {};

  function installGuard() {
    BLOCKED_FUNCTIONS.forEach(fnName => {
      if (typeof window[fnName] === 'function' && !window[fnName]._agreementGuarded) {
        originalFunctions[fnName] = window[fnName];
        window[fnName] = function () {
          console.warn(`🛡️ [AgreementGuard] ${fnName} 호출 차단됨 (서약서는 종이 방식으로 전환)`);
          try {
            if (window.AccessLogger && typeof window.AccessLogger.log === 'function') {
              window.AccessLogger.log('AGREEMENT_SUBMIT_BLOCKED', {
                function: fnName,
                args: Array.from(arguments).map(a => typeof a === 'string' ? a : typeof a),
                reason: '서약서 종이 자필서명 방식으로 전환됨'
              });
            }
          } catch (e) { /* 로깅 실패 무시 */ }
          return Promise.resolve(false);
        };
        window[fnName]._agreementGuarded = true;
        window[fnName]._agreementOriginal = originalFunctions[fnName];
      }
    });
  }

  // ============================================================
  // 1-b) 자동 팝업 차단 (v1.2 신규)
  // ============================================================
  const originalPopupFunctions = {};

  function installPopupGuard() {
    BLOCKED_AUTO_POPUP.forEach(fnName => {
      if (typeof window[fnName] === 'function' && !window[fnName]._agreementPopupGuarded) {
        originalPopupFunctions[fnName] = window[fnName];
        window[fnName] = async function () {
          console.log(`[AgreementGuard v${VERSION}] 자동 팝업 차단됨: ${fnName}`);
          // false 반환: 서약서 미제출 상태를 나타내지만, 이후 팝업 표시 로직이 실행되지 않도록
          // 호출부에서 이 반환값을 그대로 사용하는 구조라 팝업이 안 뜸
          return false;
        };
        window[fnName]._agreementPopupGuarded = true;
        window[fnName]._agreementPopupOriginal = originalPopupFunctions[fnName];
      }
    });
  }

  // ============================================================
  // 2) 라벨 변경 로직
  // ============================================================
  const LABEL_MARKER = 'data-agreement-guard-relabeled';
  let relabeledCount = 0;

  function relabelHeadings(root) {
    const scope = root || document;
    const headings = scope.querySelectorAll('h1, h2, h3, h4');
    let newlyRelabeled = 0;

    headings.forEach(h => {
      if (h.hasAttribute(LABEL_MARKER)) return;
      for (const change of LABEL_CHANGES) {
        let hasMatch = false;
        h.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(change.from)) {
            node.textContent = node.textContent.replace(change.from, change.to);
            hasMatch = true;
          }
        });
        if (hasMatch) {
          h.setAttribute(LABEL_MARKER, change.from);
          h.setAttribute('data-agreement-guard-original', change.from);
          newlyRelabeled++;
          break;
        }
      }
    });

    if (newlyRelabeled > 0) {
      relabeledCount += newlyRelabeled;
      console.log(`[AgreementGuard v${VERSION}] 동적 UI 라벨 변경: ${newlyRelabeled}개`);
    }
    return newlyRelabeled;
  }

  // ============================================================
  // 3) MutationObserver
  // ============================================================
  function installObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length > 0) {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1) { shouldScan = true; break; }
          }
        }
        if (shouldScan) break;
      }
      if (shouldScan) {
        clearTimeout(observer._debounce);
        observer._debounce = setTimeout(() => relabelHeadings(), 50);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
  }

  // ============================================================
  // 4) 되돌리기
  // ============================================================
  function restoreFunctions() {
    Object.keys(originalFunctions).forEach(fnName => {
      window[fnName] = originalFunctions[fnName];
    });
    Object.keys(originalPopupFunctions).forEach(fnName => {
      window[fnName] = originalPopupFunctions[fnName];
    });
    console.log(`✅ 원본 함수 복원 완료`);
  }

  function restoreLabels() {
    const relabeled = document.querySelectorAll(`[${LABEL_MARKER}]`);
    relabeled.forEach(el => {
      const original = el.getAttribute('data-agreement-guard-original');
      LABEL_CHANGES.forEach(change => {
        if (change.from !== original) return;
        el.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(change.to)) {
            node.textContent = node.textContent.replace(change.to, change.from);
          }
        });
      });
      el.removeAttribute(LABEL_MARKER);
      el.removeAttribute('data-agreement-guard-original');
    });
    return relabeled.length;
  }

  function restoreAll() {
    restoreFunctions();
    return restoreLabels();
  }

  // ============================================================
  // 5) 초기화
  // ============================================================
  function init() {
    installGuard();
    installPopupGuard();
    const initialFnCount = Object.keys(originalFunctions).length;
    const initialPopupCount = Object.keys(originalPopupFunctions).length;
    const initialLabelCount = relabelHeadings();
    installObserver();

    // 지연 훅킹 재시도 (index.html의 후속 스크립트가 함수를 재정의할 수 있어 방어)
    let retryCount = 0;
    const retryInterval = setInterval(() => {
      retryCount++;
      const beforeFn = Object.keys(originalFunctions).length;
      const beforePopup = Object.keys(originalPopupFunctions).length;
      installGuard();
      installPopupGuard();
      const afterFn = Object.keys(originalFunctions).length;
      const afterPopup = Object.keys(originalPopupFunctions).length;
      
      if (afterFn > beforeFn || afterPopup > beforePopup) {
        console.log(`🔄 [AgreementGuard] 지연 훅킹: 제출 ${afterFn}/${BLOCKED_FUNCTIONS.length}, 팝업 ${afterPopup}/${BLOCKED_AUTO_POPUP.length}`);
      }
      if (retryCount >= 8 || 
          (afterFn === BLOCKED_FUNCTIONS.length && afterPopup === BLOCKED_AUTO_POPUP.length)) {
        clearInterval(retryInterval);
        console.log(`✅ [AgreementGuard] 최종: 제출 ${afterFn}/${BLOCKED_FUNCTIONS.length}, 팝업 ${afterPopup}/${BLOCKED_AUTO_POPUP.length}`);
      }
    }, 500);

    window.AgreementGuard = {
      version: VERSION,
      blockedFunctions: BLOCKED_FUNCTIONS,
      blockedAutoPopup: BLOCKED_AUTO_POPUP,
      labelChanges: LABEL_CHANGES,
      relabelHeadings,
      restoreAll,
      restoreFunctions,
      restoreLabels,
      _originalFunctions: originalFunctions,
      _originalPopupFunctions: originalPopupFunctions,
      getStats: () => ({
        version: VERSION,
        submitBlocked: BLOCKED_FUNCTIONS.filter(fn => window[fn] && window[fn]._agreementGuarded).length,
        submitTotal: BLOCKED_FUNCTIONS.length,
        popupBlocked: BLOCKED_AUTO_POPUP.filter(fn => window[fn] && window[fn]._agreementPopupGuarded).length,
        popupTotal: BLOCKED_AUTO_POPUP.length,
        relabeledCount: document.querySelectorAll(`[${LABEL_MARKER}]`).length
      })
    };

    console.log(`✅ [AgreementGuard] v${VERSION} 로드 완료`);
    console.log(`   - 신규 제출 차단: ${initialFnCount}/${BLOCKED_FUNCTIONS.length}개`);
    console.log(`   - 자동 팝업 차단: ${initialPopupCount}/${BLOCKED_AUTO_POPUP.length}개`);
    console.log(`   - 초기 라벨 변경: ${initialLabelCount}개`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
