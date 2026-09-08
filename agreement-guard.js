/* AgreementGuard v1.0 — 신규 동의서 제출 함수 차단
 * 목적: 서약서 시스템 비활성화(2026-09-08) 후 예방 차단
 *       종이 자필서명 방식으로 전환됨
 *
 * 차단 대상 (신규 제출):
 *   - _agreementSubmit, _agreementSetPrivacy, _agreementSetMedication,
 *     _agreementSetFingerprint, _agreementNext, _agreementPrev,
 *     _agreementClearSignature, _agreementForceOpen
 *
 * 유지 대상 (관리자 조회/파기):
 *   - showAgreementManagePanel, loadAgreementList, viewAgreementDetail,
 *     deleteAgreement, download*, _checkAgreementForStudent 등
 *
 * 특징: 무음 차단 (팝업 없음, 콘솔 로그만)
 */
(function () {
  'use strict';

  const VERSION = '1.0';

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

  // ============================================================
  // 함수 차단 로직
  // ============================================================
  const originalFunctions = {};

  function installGuard() {
    BLOCKED_FUNCTIONS.forEach(fnName => {
      if (typeof window[fnName] === 'function' && !window[fnName]._agreementGuarded) {
        originalFunctions[fnName] = window[fnName];
        window[fnName] = function () {
          // 무음 차단 - 콘솔 로그만
          console.warn(`🛡️ [AgreementGuard] ${fnName} 호출 차단됨 (서약서는 종이 방식으로 전환)`);

          // AccessLogger 기록 (감사 대응)
          try {
            if (window.AccessLogger && typeof window.AccessLogger.log === 'function') {
              window.AccessLogger.log('AGREEMENT_SUBMIT_BLOCKED', {
                function: fnName,
                args: Array.from(arguments).map(a => typeof a === 'string' ? a : typeof a),
                reason: '서약서 종이 자필서명 방식으로 전환됨'
              });
            }
          } catch (e) { /* 로깅 실패 무시 */ }

          // 팝업 없음 (사용자 안내 없이 조용히 차단)
          return Promise.resolve(false);
        };
        window[fnName]._agreementGuarded = true;
        window[fnName]._agreementOriginal = originalFunctions[fnName];
      }
    });
  }

  // ============================================================
  // 되돌리기 함수 (긴급 상황용)
  // ============================================================
  function restoreFunctions() {
    Object.keys(originalFunctions).forEach(fnName => {
      window[fnName] = originalFunctions[fnName];
      console.log(`✅ 원본 복원: ${fnName}`);
    });
  }

  // ============================================================
  // 초기화 (지연 훅킹 재시도로 후행 스크립트 대응)
  // ============================================================
  function init() {
    installGuard();
    const initialCount = Object.keys(originalFunctions).length;

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
      restoreFunctions,
      _originalFunctions: originalFunctions,
      getStats: () => ({
        version: VERSION,
        totalBlocked: BLOCKED_FUNCTIONS.length,
        guardedFunctions: BLOCKED_FUNCTIONS.filter(fn => window[fn] && window[fn]._agreementGuarded),
        unguardedFunctions: BLOCKED_FUNCTIONS.filter(fn => !window[fn] || !window[fn]._agreementGuarded)
      })
    };

    console.log(`✅ AgreementGuard v${VERSION} 로드 완료`);
    console.log(`   - 차단 대상: ${BLOCKED_FUNCTIONS.length}개`);
    console.log(`   - 초기 훅킹: ${initialCount}개`);
    console.log(`   - 무음 차단 모드 (팝업 없음)`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
