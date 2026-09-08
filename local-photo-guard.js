/* LocalPhotoGuard v1.3 — Firebase 사진 함수 차단 + UI 버튼/섹션 숨김
 * 목적: 개인정보보호법 준수, 클라우드 재축적 완전 방지
 * v1.3 변경점: "교육생 사진 관리" 섹션 전체 숨김 추가
 */
(function () {
  'use strict';

  const VERSION = '1.3';
  const BLOCKED_FUNCTIONS = [
    'uploadStudentPhoto', 'deleteStudentPhoto', 'uploadPhotoBatch', 'deleteAllPhotos',
    'migratePhotosToStorage', 'migratePhotosToRandomId', 'cleanupFirestorePhotos', 'executePendingBulkUpload'
  ];

  // 섹션 숨김: <h3>에 포함된 텍스트로 식별
  const HIDDEN_SECTION_TITLES = ['교육생 사진 관리'];

  const BLOCK_MESSAGES = {
    migratePhotosToStorage: '🚫 이 기능은 사진을 Firebase Storage로 재업로드합니다.\n\n개인정보보호법 준수를 위해 사진은 로컬로만 관리되며, 클라우드 업로드는 차단되었습니다.',
    migratePhotosToRandomId: '🚫 이 기능은 사진을 Firebase Storage로 재업로드합니다.\n\n개인정보보호법 준수를 위해 클라우드 업로드는 차단되었습니다.',
    cleanupFirestorePhotos: '🚫 Firestore 사진 데이터 정리 기능은 관리자 검토가 필요합니다.\n\n필요 시 개발자에게 문의하세요.',
    executePendingBulkUpload: '🚫 일괄 업로드 기능은 비활성화되었습니다.\n\n사진 관리는 로컬 폴더에서 직접 수행하세요.'
  };

  const DEFAULT_MESSAGE =
    '📌 학생 사진은 로컬 관리 방식으로 전환되었습니다.\n\n' +
    '• 사진 등록/변경: 관리자에게 직접 제출 → 스캔 후 로컬 폴더에 저장\n' +
    '• 저장 경로: C:\\Users\\김형준\\Desktop\\26년도 업무\\교육생사진\n' +
    '• 파일명 규칙: 학생명.jpg (여학생은 학생명(여).jpg)\n\n' +
    '이 기능은 개인정보보호법에 따라 비활성화되었습니다.';

  // ============================================================
  // 1) 함수 차단 로직
  // ============================================================
  const originalFunctions = {};

  function installFunctionGuard() {
    BLOCKED_FUNCTIONS.forEach(fnName => {
      if (typeof window[fnName] === 'function' && !window[fnName]._guarded) {
        originalFunctions[fnName] = window[fnName];
        window[fnName] = function () {
          console.warn(`🛡️ [LocalPhotoGuard] ${fnName} 호출 차단됨`);
          try {
            if (window.AccessLogger && typeof window.AccessLogger.log === 'function') {
              const logType = /upload|migrate|bulk/i.test(fnName) ? 'UPLOAD_BLOCKED' :
                              /delete|cleanup/i.test(fnName) ? 'DELETE_BLOCKED' : 'PHOTO_BLOCKED';
              window.AccessLogger.log(`PHOTO_${logType}`, {
                function: fnName,
                args: Array.from(arguments).map(a => typeof a === 'string' ? a : typeof a)
              });
            }
          } catch (e) { /* 로깅 실패 무시 */ }
          alert(BLOCK_MESSAGES[fnName] || DEFAULT_MESSAGE);
          return Promise.resolve(false);
        };
        window[fnName]._guarded = true;
        window[fnName]._original = originalFunctions[fnName];
      }
    });
  }

  // ============================================================
  // 2) UI 버튼 숨김 로직 (onclick 기반)
  // ============================================================
  const HIDE_MARKER = 'data-photo-guard-hidden';
  let hiddenBtnCount = 0;

  function hidePhotoButtons(root) {
    const scope = root || document;
    const elements = scope.querySelectorAll('[onclick]');
    let newlyHidden = 0;

    elements.forEach(el => {
      if (el.hasAttribute(HIDE_MARKER)) return;
      const onclick = el.getAttribute('onclick') || '';
      const hit = BLOCKED_FUNCTIONS.find(fn => onclick.includes(fn));
      if (hit) {
        el.setAttribute(HIDE_MARKER, hit);
        el.setAttribute('data-photo-guard-original-display', el.style.display || '');
        el.style.display = 'none';
        newlyHidden++;
      }
    });

    if (newlyHidden > 0) {
      hiddenBtnCount += newlyHidden;
      console.log(`🙈 [LocalPhotoGuard] 사진 버튼 ${newlyHidden}개 숨김 (누적: ${hiddenBtnCount})`);
    }
    return newlyHidden;
  }

  // ============================================================
  // 3) 섹션 숨김 로직 (v1.3 신규)
  // ============================================================
  const SECTION_MARKER = 'data-photo-guard-section-hidden';
  let hiddenSectionCount = 0;

  function hidePhotoSections(root) {
    const scope = root || document;
    let newlyHidden = 0;

    HIDDEN_SECTION_TITLES.forEach(title => {
      // h3 태그 중 해당 텍스트를 포함한 것을 찾음
      const headers = scope.querySelectorAll('h1, h2, h3, h4');
      headers.forEach(h => {
        const text = (h.textContent || '').trim();
        if (!text.includes(title)) return;

        // 부모 컨테이너 찾기 (bg-surface-50 클래스 또는 카드 스타일)
        let container = h.parentElement;
        // 최대 3단계 상위까지 탐색하며 카드 컨테이너 찾기
        for (let i = 0; i < 3 && container; i++) {
          const cls = String(container.className || '');
          if (cls.includes('bg-surface-50') || cls.includes('rounded-2xl')) {
            break;
          }
          container = container.parentElement;
        }

        if (container && !container.hasAttribute(SECTION_MARKER)) {
          // 안전 검증: 이 컨테이너가 다른 필수 섹션까지 포함하면 안 됨
          const containerText = (container.textContent || '').trim();
          const OTHER_SECTION_KEYWORDS = ['차량번호 관리', '등록순 관리', '방 배정', '규칙 관리'];
          const contaminated = OTHER_SECTION_KEYWORDS.find(kw => containerText.includes(kw));

          if (contaminated) {
            console.warn(`⚠️ [LocalPhotoGuard] "${title}" 컨테이너에 "${contaminated}"도 포함됨 - 숨김 취소`);
            return;
          }

          container.setAttribute(SECTION_MARKER, title);
          container.setAttribute('data-photo-guard-section-original-display', container.style.display || '');
          container.style.display = 'none';
          newlyHidden++;
        }
      });
    });

    if (newlyHidden > 0) {
      hiddenSectionCount += newlyHidden;
      console.log(`🙈 [LocalPhotoGuard] 사진 관리 섹션 ${newlyHidden}개 숨김 (누적: ${hiddenSectionCount})`);
    }
    return newlyHidden;
  }

  // ============================================================
  // 4) MutationObserver
  // ============================================================
  function installMutationObserver() {
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
        observer._debounce = setTimeout(() => {
          hidePhotoButtons();
          hidePhotoSections();
        }, 50);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
  }

  // ============================================================
  // 5) 되돌리기 함수 (긴급 상황용)
  // ============================================================
  function unhideAllButtons() {
    const hidden = document.querySelectorAll(`[${HIDE_MARKER}]`);
    hidden.forEach(el => {
      const orig = el.getAttribute('data-photo-guard-original-display') || '';
      el.style.display = orig;
      el.removeAttribute(HIDE_MARKER);
      el.removeAttribute('data-photo-guard-original-display');
    });
    console.log(`✅ 버튼 숨김 해제: ${hidden.length}개`);
    return hidden.length;
  }

  function unhideAllSections() {
    const hidden = document.querySelectorAll(`[${SECTION_MARKER}]`);
    hidden.forEach(el => {
      const orig = el.getAttribute('data-photo-guard-section-original-display') || '';
      el.style.display = orig;
      el.removeAttribute(SECTION_MARKER);
      el.removeAttribute('data-photo-guard-section-original-display');
    });
    console.log(`✅ 섹션 숨김 해제: ${hidden.length}개`);
    return hidden.length;
  }

  function unhideAll() {
    return { buttons: unhideAllButtons(), sections: unhideAllSections() };
  }

  function restoreFunctions() {
    Object.keys(originalFunctions).forEach(fnName => {
      window[fnName] = originalFunctions[fnName];
      console.log(`✅ 원본 복원: ${fnName}`);
    });
  }

  // ============================================================
  // 6) 초기화
  // ============================================================
  function init() {
    installFunctionGuard();
    const initialBtn = hidePhotoButtons();
    const initialSection = hidePhotoSections();
    const observer = installMutationObserver();

    // 지연 훅킹 재시도
    let retryCount = 0;
    const retryInterval = setInterval(() => {
      retryCount++;
      const before = Object.keys(originalFunctions).length;
      installFunctionGuard();
      const after = Object.keys(originalFunctions).length;
      if (after > before) {
        console.log(`🔄 지연 훅킹 성공: ${after - before}개 추가 차단 (총 ${after}개)`);
      }
      if (retryCount >= 5 || after === BLOCKED_FUNCTIONS.length) {
        clearInterval(retryInterval);
        console.log(`✅ 최종 차단 함수: ${Object.keys(originalFunctions).length}/${BLOCKED_FUNCTIONS.length}개`);
      }
    }, 1000);

    window.LocalPhotoGuard = {
      version: VERSION,
      blockedFunctions: BLOCKED_FUNCTIONS,
      hiddenSectionTitles: HIDDEN_SECTION_TITLES,
      hidePhotoButtons,
      hidePhotoSections,
      unhideAll,
      unhideAllButtons,
      unhideAllSections,
      restoreFunctions,
      observer,
      _originalFunctions: originalFunctions,
      getStats: () => ({
        version: VERSION,
        totalBlocked: BLOCKED_FUNCTIONS.length,
        guardedFunctions: BLOCKED_FUNCTIONS.filter(fn => window[fn] && window[fn]._guarded),
        unguardedFunctions: BLOCKED_FUNCTIONS.filter(fn => !window[fn] || !window[fn]._guarded),
        hiddenButtonCount: document.querySelectorAll(`[${HIDE_MARKER}]`).length,
        hiddenSectionCount: document.querySelectorAll(`[${SECTION_MARKER}]`).length
      })
    };

    console.log(`✅ LocalPhotoGuard v${VERSION} 로드 완료`);
    console.log(`   - 차단 대상: ${BLOCKED_FUNCTIONS.length}개`);
    console.log(`   - 초기 훅킹: ${Object.keys(originalFunctions).length}개`);
    console.log(`   - 초기 숨김 버튼: ${initialBtn}개`);
    console.log(`   - 초기 숨김 섹션: ${initialSection}개`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
