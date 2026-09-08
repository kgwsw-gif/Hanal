/* AgreementGuard v1.1 — 신규 동의서 제출 함수 차단 + UI 라벨 조정
 * 목적: 서약서 시스템 비활성화(2026-09-08) 후 예방 차단 및 UI 명확화
 *       종이 자필서명 방식으로 전환됨
 *
 * v1.1 변경점: 관리자 UI 라벨 변경
 *   "서약서 제출 관리" → "동의서 관리 (조회/파기 전용)"
 *   (아이콘은 유지)
 */
(function () {
  'use strict';

  const VERSION = '1.1';

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

  // 라벨 변경 매핑
  const LABEL_CHANGES = [
    { from: '서약서 제출 관리', to: '동의서 관리 (조회/파기 전용)' }
  ];

  // ============================================================
  // 1) 함수 차단 로직
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
  // 2) 라벨 변경 로직 (v1.1 신규)
  // ============================================================
  const LABEL_MARKER = 'data-agreement-guard-relabeled';
  let relabeledCount = 0;

  function relabelHeadings(root) {
    const scope = root || document;
    const headings = scope.querySelectorAll('h1, h2, h3, h4');
    let newlyRelabeled = 0;

    headings.forEach(h => {
      if (h.hasAttribute(LABEL_MARKER)) return;

      // 각 라벨 매핑 확인
      for (const change of LABEL_CHANGES) {
        // 자식 노드 순회하며 텍스트 노드만 처리 (아이콘 유지)
        let hasMatch = false;
        h.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(change.from)) {
            const originalText = node.textContent;
            node.textContent = originalText.replace(change.from, change.to);
            hasMatch = true;
          }
        });

        if (hasMatch) {
          h.setAttribute(LABEL_MARKER, change.from);
          h.setAttribute('data-agreement-guard-original', change.from);
          newlyRelabeled++;
          break; // 한 요소당 하나의 라벨만 변경
        }
      }
    });

    if (newlyRelabeled > 0) {
      relabeledCount += newlyRelabeled;
      console.log(`✏️ [AgreementGuard] 라벨 변경 ${newlyRelabeled}개 (누적: ${relabeledCount})`);
    }
    return newlyRelabeled;
  }

  // ============================================================
  // 3) MutationObserver (동적 렌더링 대응)
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
  // 4) 되돌리기 함수
  // ============================================================
  function restoreFunctions() {
    Object.keys(originalFunctions).forEach(fnName => {
      window[fnName] = originalFunctions[fnName];
      console.log(`✅ 원본 함수 복원: ${fnName}`);
    });
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
    console.log(`✅ 라벨 원본 복원: ${relabeled.length}개`);
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
    const initialFnCount = Object.keys(originalFunctions).length;
    const initialLabelCount = relabelHeadings();
    const observer = installObserver();

    // 지연 훅킹 재시도
    let retryCount = 0;
    const retryInterval = setInterval(() => {
      retryCount++;
      const before = Object.keys(originalFunctions).length;
      installGuard();
      const after = Object.keys(originalFunctions).length;
      if (after > before) {
        console.log(`🔄 지연 훅킹 성공: ${after - before}개 추가 차단 (총 ${after}개)`);
      }
      if (retryCount >= 5 || after === BLOCKED_FUNCTIONS.length) {
        clearInterval(retryInterval);
        console.log(`✅ AgreementGuard 최종 차단: ${after}/${BLOCKED_FUNCTIONS.length}개`);
      }
    }, 1000);

    window.AgreementGuard = {
      version: VERSION,
      blockedFunctions: BLOCKED_FUNCTIONS,
      labelChanges: LABEL_CHANGES,
      relabelHeadings,
      restoreAll,
      restoreFunctions,
      restoreLabels,
      _originalFunctions: originalFunctions,
      getStats: () => ({
        version: VERSION,
        totalBlocked: BLOCKED_FUNCTIONS.length,
        guardedFunctions: BLOCKED_FUNCTIONS.filter(fn => window[fn] && window[fn]._agreementGuarded),
        unguardedFunctions: BLOCKED_FUNCTIONS.filter(fn => !window[fn] || !window[fn]._agreementGuarded),
        relabeledCount: document.querySelectorAll(`[${LABEL_MARKER}]`).length,
        totalLabelChanges: LABEL_CHANGES.length
      })
    };

    console.log(`✅ AgreementGuard v${VERSION} 로드 완료`);
    console.log(`   - 차단 대상: ${BLOCKED_FUNCTIONS.length}개`);
    console.log(`   - 초기 훅킹: ${initialFnCount}개`);
    console.log(`   - 초기 라벨 변경: ${initialLabelCount}개`);
    console.log(`   - 무음 차단 모드 (팝업 없음)`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
