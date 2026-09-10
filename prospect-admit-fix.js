/**
 * ProspectAdmitFix v1.3.4
 * 
 * v1.3.3 대비 변경사항:
 * - _updateDepartments 훅에서 render를 여러 시점 호출
 *   (Firestore 다중 컬렉션 동기화 지연 대응)
 */
(function () {
  'use strict';
  
  const VERSION = '1.3.4';
  const NAMESPACE = 'ProspectAdmitFix';
  
  if (window[NAMESPACE]) {
    console.log(`[${NAMESPACE}] 이미 설치됨 (v${window[NAMESPACE].version})`);
    return;
  }
  
  function rebuildAndRender() {
    try {
      if (typeof window.render === 'function') {
        window.render();
      }
    } catch (e) {
      console.error(`[${NAMESPACE}] render 에러:`, e);
    }
  }
  
  const RENDER_HOOK_TARGETS = [
    'submitPendingStudent',
    'confirmMoveIn',
    'autoConfirmDueMoveIns',
    'cancelPendingStudent',
    'forceDeleteStudent'
  ];
  
  const hookedNames = [];
  
  RENDER_HOOK_TARGETS.forEach(fnName => {
    const orig = window[fnName];
    if (typeof orig !== 'function') {
      console.warn(`[${NAMESPACE}] ${fnName} 함수 없음`);
      return;
    }
    if (orig._pafHooked) return;
    
    window[fnName] = async function (...args) {
      try {
        const result = await orig.apply(this, args);
        setTimeout(rebuildAndRender, 100);
        setTimeout(rebuildAndRender, 500);
        return result;
      } catch (e) {
        console.error(`[${NAMESPACE}] ${fnName} 에러:`, e);
        throw e;
      }
    };
    window[fnName]._pafHooked = true;
    window[fnName]._pafOriginal = orig;
    hookedNames.push(fnName);
  });
  
  // ─────────────────────────────────────
  // _updateDepartments 훅 - 다중 시점 render (v1.3.4 개선)
  // ─────────────────────────────────────
  const DEPT_SYNC_TARGET = '_updateDepartments';
  
  (function hookUpdateDepartments() {
    const orig = window[DEPT_SYNC_TARGET];
    if (typeof orig !== 'function') {
      console.warn(`[${NAMESPACE}] ${DEPT_SYNC_TARGET} 함수 없음`);
      return;
    }
    if (orig._pafHooked) return;
    
    window[DEPT_SYNC_TARGET] = function (...args) {
      const result = orig.apply(this, args);
      
      // 즉시 render (일반 케이스)
      try {
        if (typeof window.render === 'function') {
          window.render();
        }
      } catch (e) {
        console.error(`[${NAMESPACE}] 즉시 render 에러:`, e);
      }
      
      // 지연 render 3회 (다른 컬렉션 동기화 대기)
      // - 학생 파기 시 passwords, roomNumbers, students 등 여러 컬렉션이
      //   각기 다른 시점에 onSnapshot 트리거되므로 재시도 필요
      setTimeout(rebuildAndRender, 300);
      setTimeout(rebuildAndRender, 800);
      setTimeout(rebuildAndRender, 1500);
      
      return result;
    };
    window[DEPT_SYNC_TARGET]._pafHooked = true;
    window[DEPT_SYNC_TARGET]._pafOriginal = orig;
    hookedNames.push(DEPT_SYNC_TARGET);
  })();
  
  const ALL_TARGETS = [...RENDER_HOOK_TARGETS, DEPT_SYNC_TARGET];
  
  window[NAMESPACE] = {
    version: VERSION,
    
    get _hookedFunctions() {
      return ALL_TARGETS.filter(name => 
        typeof window[name] === 'function' && window[name]._pafHooked === true
      );
    },
    
    getStats() {
      const hooked = this._hookedFunctions;
      return {
        version: VERSION,
        hookedCount: hooked.length,
        totalCount: ALL_TARGETS.length,
        hooked: hooked,
        renderHooks: RENDER_HOOK_TARGETS.length,
        deptSyncHook: 1
      };
    },
    
    rebuildAndRender: rebuildAndRender
  };
  
  console.log(`[${NAMESPACE} v${VERSION}] 설치 완료: ${hookedNames.length}/${ALL_TARGETS.length} 훅킹`);
})();
