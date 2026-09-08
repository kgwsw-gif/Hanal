/* LocalPhotoGuard v1.0 — Firebase 사진 업로드/삭제 함수 차단
   목적: 사진은 관리자 PC 로컬 폴더에서 스캔 방식으로 관리하므로
         앱의 Firebase 업로드/삭제 기능을 완전 차단하여 클라우드 재축적을 방지
   대상: uploadStudentPhoto, deleteStudentPhoto, uploadPhotoBatch, deleteAllPhotos
*/
(function () {
  'use strict';

  function guardFunction(fnName) {
    const original = window[fnName];
    if (typeof original !== 'function') {
      console.warn(`[LocalPhotoGuard] ${fnName} 함수 없음, 건너뜀`);
      return;
    }
    if (original._guarded) return;

    window[fnName + '_original'] = original;

    const guarded = function (...args) {
      const target = typeof args[0] === 'string' ? args[0] : '(전체)';
      console.log(`[LocalPhotoGuard] ${fnName} 호출 차단 (대상: ${target})`);
      // 로그만 남기고 조용히 종료
      if (window.AccessLogger?.log) {
        window.AccessLogger.log('PHOTO_CLOUD_BLOCKED', {
          studentId: typeof args[0] === 'string' ? args[0] : null,
          extra: { function: fnName }
        });
      }
      return;
    };
    guarded._guarded = true;
    window[fnName] = guarded;
    console.log(`[LocalPhotoGuard] ✅ ${fnName} 차단 적용`);
  }

  function applyAll() {
    ['uploadStudentPhoto', 'deleteStudentPhoto', 'uploadPhotoBatch', 'deleteAllPhotos']
      .forEach(guardFunction);
  }

  function init() {
    applyAll();
    // 앱이 함수를 재정의할 가능성 대비 3초마다 재적용
    setInterval(applyAll, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1500));
  } else {
    setTimeout(init, 1500);
  }

  window.LocalPhotoGuard = {
    version: '1.0',
    applyAll,
    rollback() {
      ['uploadStudentPhoto', 'deleteStudentPhoto', 'uploadPhotoBatch', 'deleteAllPhotos']
        .forEach(n => {
          if (window[n + '_original']) {
            window[n] = window[n + '_original'];
            console.log(`[LocalPhotoGuard] ${n} 원복`);
          }
        });
    }
  };

  console.log('[LocalPhotoGuard v1.0] 로드 완료 (단순 차단 모드)');
})();
