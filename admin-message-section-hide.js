/**
 * AdminMessageSectionHide v1.0
 * 
 * 목적: 관리자 화면의 "학과대표 전달사항" 섹션 자동 숨김
 * 이유: "학과대표 톡" 플로팅 버튼과 기능 중복
 * 
 * 동작:
 *   - MutationObserver로 DOM 변화 감지
 *   - "학과대표 전달사항" 헤더를 가진 카드 자동 숨김
 *   - "학과대표 톡" 플로팅 버튼은 영향 없음
 */
(function () {
  'use strict';
  
  const VERSION = '1.0';
  const NAMESPACE = 'AdminMessageSectionHide';
  const TARGET_TEXT = '학과대표 전달사항';
  
  if (window[NAMESPACE]) {
    console.log(`[${NAMESPACE}] 이미 설치됨 (v${window[NAMESPACE].version})`);
    return;
  }
  
  let hiddenCount = 0;
  
  function hideAdminMessageSection() {
    const h2s = document.querySelectorAll('h2');
    let hiddenThisRun = 0;
    
    h2s.forEach(h2 => {
      if (!h2.textContent.includes(TARGET_TEXT)) return;
      
      // 부모 카드 찾기 (bg-white rounded-2xl 클래스를 가진 요소)
      let parent = h2.parentElement;
      while (parent && parent !== document.body) {
        if (parent.classList && parent.classList.contains('bg-white')) {
          if (parent.style.display !== 'none') {
            parent.style.display = 'none';
            hiddenThisRun++;
            hiddenCount++;
          }
          break;
        }
        parent = parent.parentElement;
      }
    });
    
    if (hiddenThisRun > 0) {
      console.log(`[${NAMESPACE} v${VERSION}] "${TARGET_TEXT}" 섹션 숨김: ${hiddenThisRun}개 (누적: ${hiddenCount})`);
    }
    
    return hiddenThisRun;
  }
  
  // 초기 실행
  hideAdminMessageSection();
  
  // DOM 변화 감시 (관리자 화면 렌더링 시마다 재적용)
  const observer = new MutationObserver(function () {
    hideAdminMessageSection();
  });
  
  function startObserver() {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      console.log(`[${NAMESPACE} v${VERSION}] DOM 감시 시작`);
    } else {
      setTimeout(startObserver, 100);
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }
  
  // 공개 API
  window[NAMESPACE] = {
    version: VERSION,
    targetText: TARGET_TEXT,
    getStats: function () {
      return {
        version: VERSION,
        hiddenCount: hiddenCount,
        target: TARGET_TEXT
      };
    },
    hideNow: hideAdminMessageSection,
    stop: function () {
      observer.disconnect();
      console.log(`[${NAMESPACE}] 감시 중지`);
    }
  };
  
  console.log(`[${NAMESPACE} v${VERSION}] 로드 완료`);
})();
