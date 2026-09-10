/**
 * ProspectAdmitFix v1.4
 * 예비입사자 등록/취소/입사처리 및 학생 삭제 시 UI 즉시 반영
 */
(function () {
  'use strict';
  const VERSION = '1.4';

  const HOOK_TARGETS = [
    'submitPendingStudent',
    'confirmMoveIn',
    'autoConfirmDueMoveIns',
    'cancelPendingStudent',
    'forceDeleteStudent',
    'executeStudentDelete',
    'deleteStudentAction',
    'completelyDeleteStudent',
    'handleStudentResign',
    'executeResignDelete',
    'approveResign'
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

  function installHooks() {
    const hooked = [];
    HOOK_TARGETS.forEach(name => {
      if (typeof window[name] !== 'function') return;
      if (window[name]._pafHooked) return;

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
      hooked.push(name);
    });
    return hooked;
  }

  function installConfirmModalHook() {
    if (typeof window.openConfirmModal !== 'function') return false;
    if (window.openConfirmModal._pafHooked) return false;

    const orig = window.openConfirmModal;
    originalFunctions.openConfirmModal = orig;

    window.openConfirmModal = function (opts) {
      if (opts && typeof opts.onConfirm === 'function') {
        const origCb = opts.onConfirm;
        opts.onConfirm = async function () {
          const result = await origCb.apply(this, arguments);
          setTimeout(() => {
            rebuildAndRender().catch(e =>
              console.error(`[ProspectAdmitFix] openConfirmModal 콜백 후 rebuild 실패:`, e)
            );
          }, 200);
          return result;
        };
      }
      return orig.call(this, opts);
    };
    window.openConfirmModal._pafHooked = true;
    window.openConfirmModal._pafOriginal = orig;
    return true;
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

    const initialHooked = installHooks();
    const confirmHooked = installConfirmModalHook();
    const allHooked = [...initialHooked];
    if (confirmHooked) allHooked.push('openConfirmModal');

    let retryCount = 0;
    const retryInterval = setInterval(() => {
      retryCount++;
      const beforeCount = allHooked.length;

      HOOK_TARGETS.forEach(name => {
        if (typeof window[name] !== 'function') return;
        if (window[name]._pafHooked) return;

        const orig = window[name];
        originalFunctions[name] = orig;
        window[name] = async function () {
          const result = await orig.apply(this, arguments);
          setTimeout(() => rebuildAndRender().catch(e => console.error(e)), 200);
          return result;
        };
        window[name]._pafHooked = true;
        window[name]._pafOriginal = orig;
        allHooked.push(name);
      });

      if (typeof window.openConfirmModal === 'function' && !window.openConfirmModal._pafHooked) {
        if (installConfirmModalHook()) allHooked.push('openConfirmModal');
      }

      if (allHooked.length > beforeCount) {
        console.log(`[ProspectAdmitFix v${VERSION}] 지연 훅킹: ${allHooked.length - beforeCount}개 추가`);
      }

      const targetCount = HOOK_TARGETS.length + 1;
      if (retryCount >= 8 || allHooked.length === targetCount) {
        clearInterval(retryInterval);
        console.log(`✅ [ProspectAdmitFix v${VERSION}] 최종 훅킹: ${allHooked.length}/${targetCount}`);
      }
    }, 1000);

    _installed = true;

    window.ProspectAdmitFix = {
      version: VERSION,
      _installed: true,
      _hookedFunctions: allHooked,
      rebuildAndRender,
      restore,
      getStats: () => ({
        version: VERSION,
        hookedCount: allHooked.length,
        totalCount: HOOK_TARGETS.length + 1,
        hooked: [...allHooked]
      })
    };

    console.log(`[ProspectAdmitFix v${VERSION}] 설치 완료 — 훅킹 ${allHooked.length}/${HOOK_TARGETS.length + 1}`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
