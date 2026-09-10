/**
 * ProspectAdmitFixExt v1.0 — ProspectAdmitFix v1.3 확장
 * 
 * 목적: 학생 삭제 계열 함수들의 UI 즉시 갱신 추가
 * 
 * v1.3이 훅킹하지 않는 학생 삭제 경로를 훅킹:
 *   - executeStudentDelete
 *   - deleteStudentAction
 *   - completelyDeleteStudent
 *   - handleStudentResign
 *   - executeResignDelete
 *   - approveResign
 * 
 * 설치: <script src="prospect-admit-fix-ext.js"></script>
 *       (prospect-admit-fix.js 뒤에 로드)
 */
(function () {
  'use strict';
  const VERSION = '1.0';
  const ADDITIONAL_TARGETS = [
    'executeStudentDelete',
    'deleteStudentAction',
    'completelyDeleteStudent',
    'handleStudentResign',
    'executeResignDelete',
    'approveResign'
  ];

  function installExt() {
    const PAF = window.ProspectAdmitFix;
    if (!PAF || typeof PAF.rebuildAndRender !== 'function') {
      console.warn(`[ProspectAdmitFixExt v${VERSION}] ProspectAdmitFix 미로드 — 500ms 후 재시도`);
      setTimeout(installExt, 500);
      return;
    }

    const hooked = [];
    const skipped = [];

    ADDITIONAL_TARGETS.forEach(name => {
      const orig = window[name];
      if (typeof orig !== 'function') {
        skipped.push(`${name}(없음)`);
        return;
      }
      if (orig._pafExtHooked) {
        skipped.push(`${name}(중복)`);
        return;
      }

      window[name] = async function () {
        const result = await orig.apply(this, arguments);
        setTimeout(() => {
          PAF.rebuildAndRender().catch(e => 
            console.error(`[ProspectAdmitFixExt] ${name} 후 rebuild 실패:`, e)
          );
        }, 200);
        return result;
      };
      window[name]._pafExtHooked = true;
      window[name]._pafExtOriginal = orig;
      hooked.push(name);
    });

    // 지연 훅킹 재시도 (아직 정의되지 않은 함수 대비)
    let retryCount = 0;
    const retryInterval = setInterval(() => {
      retryCount++;
      const beforeCount = hooked.length;
      ADDITIONAL_TARGETS.forEach(name => {
        if (typeof window[name] !== 'function') return;
        if (window[name]._pafExtHooked) return;
        const orig = window[name];
        window[name] = async function () {
          const result = await orig.apply(this, arguments);
          setTimeout(() => {
            PAF.rebuildAndRender().catch(e => 
              console.error(`[ProspectAdmitFixExt] ${name} 후 rebuild 실패:`, e)
            );
          }, 200);
          return result;
        };
        window[name]._pafExtHooked = true;
        window[name]._pafExtOriginal = orig;
        hooked.push(name);
      });
      if (hooked.length > beforeCount) {
        console.log(`[ProspectAdmitFixExt v${VERSION}] 지연 훅킹: ${hooked.length - beforeCount}개 추가 (총 ${hooked.length}개)`);
      }
      if (retryCount >= 6 || hooked.length === ADDITIONAL_TARGETS.length) {
        clearInterval(retryInterval);
        console.log(`✅ [ProspectAdmitFixExt v${VERSION}] 최종 훅킹: ${hooked.length}/${ADDITIONAL_TARGETS.length}개`);
      }
    }, 1000);

    window.ProspectAdmitFixExt = {
      version: VERSION,
      _hookedFunctions: hooked,
      _skipped: skipped,
      getStats: () => ({
        version: VERSION,
        hookedCount: hooked.length,
        totalCount: ADDITIONAL_TARGETS.length,
        hooked: [...hooked],
        skipped: [...skipped]
      })
    };

    console.log(`[ProspectAdmitFixExt v${VERSION}] 초기 훅킹 완료: ${hooked.length}/${ADDITIONAL_TARGETS.length}`);
    if (skipped.length > 0) console.log(`  건너뜀:`, skipped);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installExt);
  } else {
    installExt();
  }
})();
