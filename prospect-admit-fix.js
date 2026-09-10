/**
 * ProspectAdmitFix v1.3.2
 * 예비입사자 등록/취소/입사처리 시 UI 즉시 반영
 * 
 * v1.3.2 (2026-09-10):
 *   - 통계/로그 표시 개선 (getStats, _hookedFunctions 실시간 반영)
 *   - "최종 훅킹 0/5"로 잘못 표시되던 문제 수정
 * v1.3.1:
 *   - openConfirmModal 훅킹 제거 (opts 형태 다양성으로 인한 onConfirm 버그 수정)
 * v1.3:
 *   - openConfirmModal 콜백 래핑 추가 (v1.3.1에서 제거됨)
 * v1.2: cancelPendingStudent, forceDeleteStudent 추가
 * v1.1: submitPendingStudent 추가
 * v1.0: 최초 배포
 */
(function () {
  'use strict';
  const VERSION = '1.3.2';

  const HOOK_TARGETS = [
    'submitPendingStudent',
    'confirmMoveIn',
    'autoConfirmDueMoveIns',
    'cancelPendingStudent',
    'forceDeleteStudent'
  ];

  const originalFunctions = {};
  let _installed = false;

  async function rebuildAndRender() {
    try {
      if (typeof window.render === 'function') {
        window.render();
      }
      console.log(`[ProspectAdmitFix v${VERSION}] rebuild 완료`);
    } catch (e) {
      console.error(`[ProspectAdmitFix v${VERSION}] rebuild 실패:`, e);
    }
  }

  function hookOne(name) {
    if (typeof window[name] !== 'function') return false;
    if (window[name]._pafHooked) return false;

    const orig = window[name];
    originalFunctions[name] = orig;

    window[name] = async function () {
      const result = await orig.apply(this, arguments);
      setTimeout(() => {
        rebuildAndRender().catch(e =>
          console.error(`[ProspectAdmitFix] ${name} 후 rebuild 실패:`, e)
        );
      }, 200);
      return result;
    };
    window[name]._pafHooked = true;
    window[name]._pafOriginal = orig;
    return true;
  }

  // v1.3.2 개선: 실시간으로 현재 훅킹된 함수 목록을 반환
  function getHookedList() {
    return HOOK_TARGETS.filter(name =>
      typeof window[name] === 'function' && window[name]._pafHooked
    );
  }

  function hookAll() {
    HOOK_TARGETS.forEach(hookOne);
  }

  function restore() {
    Object.keys(originalFunctions).forEach(name => {
      window[name] = originalFunctions[name];
      delete window[name]._pafHooked;
    });
    console.log(`[ProspectAdmitFix v${VERSION}] 원본 복원 완료`);
  }

  function init() {
    if (_installed) return;
    _installed = true;

    hookAll();
    const initialCount = getHookedList().length;
    console.log(`[ProspectAdmitFix v${VERSION}] 초기 훅킹: ${initialCount}/${HOOK_TARGETS.length}`);

    // 지연 훅킹 재시도
    let retryCount = 0;
    const retryInterval = setInterval(() => {
      retryCount++;
      const before = getHookedList().length;
      hookAll();
      const after = getHookedList().length;

      if (after > before) {
        console.log(`[ProspectAdmitFix v${VERSION}] 지연 훅킹: ${after - before}개 추가 (총 ${after}/${HOOK_TARGETS.length})`);
      }
      if (retryCount >= 8 || after === HOOK_TARGETS.length) {
        clearInterval(retryInterval);
        const finalCount = getHookedList().length;
        console.log(`✅ [ProspectAdmitFix v${VERSION}] 최종 훅킹: ${finalCount}/${HOOK_TARGETS.length}`);
      }
    }, 1000);

    // v1.3.2 개선: _hookedFunctions는 getter로 실시간 반영
    window.ProspectAdmitFix = {
      version: VERSION,
      _installed: true,
      get _hookedFunctions() { return getHookedList(); },
      rebuildAndRender,
      restore,
      getStats: () => {
        const hooked = getHookedList();
        return {
          version: VERSION,
          hookedCount: hooked.length,
          totalCount: HOOK_TARGETS.length,
          hooked: hooked
        };
      }
    };

    console.log(`[ProspectAdmitFix v${VERSION}] 설치 완료`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
