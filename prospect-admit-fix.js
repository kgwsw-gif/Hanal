/**
 * ProspectAdmitFix v1.3.3
 * 
 * v1.3.2 대비 변경사항:
 * - _updateDepartments 훅 추가 (학생 데이터 변경 시 자동 render)
 * - 학생 파기/등록/취소 모두 새로고침 없이 즉시 반영
 * 
 * 훅킹 대상 (6개):
 *   1. submitPendingStudent      - 예비입사자 등록
 *   2. confirmMoveIn             - 입사 확정
 *   3. autoConfirmDueMoveIns     - 자동 입사 확정
 *   4. cancelPendingStudent      - 예비입사자 취소
 *   5. forceDeleteStudent        - 강제 삭제
 *   6. _updateDepartments        - 학생 데이터 동기화 (v1.3.3 신규, render 자동 호출)
 */
(function () {
  'use strict';
  
  const VERSION = '1.3.3';
  const NAMESPACE = 'ProspectAdmitFix';
  
  if (window[NAMESPACE]) {
    console.log(`[${NAMESPACE}] 이미 설치됨 (v${window[NAMESPACE].version})`);
    return;
  }
  
  // ─────────────────────────────────────
  // 1. rebuildAndRender: 렌더 재실행 유틸
  // ─────────────────────────────────────
  function rebuildAndRender() {
    try {
      if (typeof window.render === 'function') {
        window.render();
      }
    } catch (e) {
      console.error(`[${NAMESPACE}] rebuildAndRender 에러:`, e);
    }
  }
  
  // ─────────────────────────────────────
  // 2. 예비인원 계열 훅킹 (기존 5개, delayed render)
  // ─────────────────────────────────────
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
      console.warn(`[${NAMESPACE}] ${fnName} 함수 없음 (스킵)`);
      return;
    }
    if (orig._pafHooked) {
      return;
    }
    
    window[fnName] = async function (...args) {
      try {
        const result = await orig.apply(this, args);
        setTimeout(rebuildAndRender, 100);
        setTimeout(rebuildAndRender, 500);
        return result;
      } catch (e) {
        console.error(`[${NAMESPACE}] ${fnName} 실행 에러:`, e);
        throw e;
      }
    };
    window[fnName]._pafHooked = true;
    window[fnName]._pafOriginal = orig;
    hookedNames.push(fnName);
  });
  
  // ─────────────────────────────────────
  // 3. _updateDepartments 훅 (v1.3.3 신규 - 학생 파기 자동 갱신 핵심)
  // ─────────────────────────────────────
  const DEPT_SYNC_TARGET = '_updateDepartments';
  
  (function hookUpdateDepartments() {
    const orig = window[DEPT_SYNC_TARGET];
    if (typeof orig !== 'function') {
      console.warn(`[${NAMESPACE}] ${DEPT_SYNC_TARGET} 함수 없음 (스킵)`);
      return;
    }
    if (orig._pafHooked) {
      return;
    }
    
    window[DEPT_SYNC_TARGET] = function (...args) {
      const result = orig.apply(this, args);
      // 학생 데이터가 변경되어 _updateDepartments가 호출되면 즉시 render
      try {
        if (typeof window.render === 'function') {
          window.render();
        }
      } catch (e) {
        console.error(`[${NAMESPACE}] ${DEPT_SYNC_TARGET} render 에러:`, e);
      }
      return result;
    };
    window[DEPT_SYNC_TARGET]._pafHooked = true;
    window[DEPT_SYNC_TARGET]._pafOriginal = orig;
    hookedNames.push(DEPT_SYNC_TARGET);
  })();
  
  // ─────────────────────────────────────
  // 4. 공개 API
  // ─────────────────────────────────────
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
  console.log(`  - 렌더 훅: ${RENDER_HOOK_TARGETS.length}개`);
  console.log(`  - 데이터 동기화 훅: 1개 (${DEPT_SYNC_TARGET})`);
})();
