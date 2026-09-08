/* LocalPhotoSync v1.0 — 로컬 폴더 사진을 studentPhotos에 동기화
   목적: 앱 시작 시 로컬 폴더를 스캔해 studentPhotos 전역 객체를 채움
   의존: local-photo-viewer.js (v2.0+)
*/
(function () {
  'use strict';

  const SYNC_INTERVAL_MS = 60000; // 폴더 재스캔 주기 (1분)
  let lastSyncCount = 0;
  let syncInProgress = false;
  let syncedUrls = []; // Blob URL 추적 (메모리 정리용)

  // Blob URL 정리
  function revokeOldUrls() {
    syncedUrls.forEach(url => {
      try { URL.revokeObjectURL(url); } catch (e) {}
    });
    syncedUrls = [];
  }

  // studentPhotos에 로컬 사진 병합
  async function syncOnce() {
    if (syncInProgress) return { skipped: true };
    if (!window.LocalPhotoViewer) {
      console.warn('[LocalPhotoSync] LocalPhotoViewer 미로드');
      return { error: 'no_viewer' };
    }
    syncInProgress = true;
    try {
      const info = await window.LocalPhotoViewer.getFolderInfo();
      if (!info) {
        console.log('[LocalPhotoSync] 폴더 미선택 상태 — 동기화 건너뜀');
        return { error: 'no_folder' };
      }

      const t1 = performance.now();
      const map = await window.LocalPhotoViewer.scanAll();
      const t2 = performance.now();

      // 기존 Blob URL 정리
      revokeOldUrls();

      // studentPhotos 초기화 (Firebase URL 완전 제거) + 로컬 사진 주입
      if (typeof window.studentPhotos !== 'object' || window.studentPhotos === null) {
        window.studentPhotos = {};
      }
      // 기존 키 모두 제거 (Firebase URL 제거)
      Object.keys(window.studentPhotos).forEach(k => {
        delete window.studentPhotos[k];
      });
      // 로컬 스캔 결과 주입
      Object.keys(map).forEach(name => {
        window.studentPhotos[name] = map[name];
        syncedUrls.push(map[name]);
      });

      lastSyncCount = Object.keys(map).length;
      const elapsed = Math.round(t2 - t1);
      console.log(`[LocalPhotoSync] ✅ 동기화 완료: ${lastSyncCount}명 (${elapsed}ms)`);
      return { count: lastSyncCount, elapsed };
    } catch (e) {
      console.error('[LocalPhotoSync] 동기화 실패:', e);
      return { error: String(e) };
    } finally {
      syncInProgress = false;
    }
  }

  // 수동 재스캔 (관리자용)
  async function rescan() {
    console.log('[LocalPhotoSync] 수동 재스캔 요청');
    return await syncOnce();
  }

  // 상태 조회
  function getStatus() {
    return {
      lastSyncCount,
      syncInProgress,
      studentPhotosCount: window.studentPhotos ? Object.keys(window.studentPhotos).length : 0
    };
  }

  // 초기 동기화 — 폴더가 이미 선택되어 있으면 즉시 실행
  async function initialSync() {
    // 앱이 어느 정도 로드되기를 기다림
    let tries = 0;
    while (tries < 20) {
      if (window.LocalPhotoViewer && typeof window.LocalPhotoViewer.getFolderInfo === 'function') {
        break;
      }
      await new Promise(r => setTimeout(r, 200));
      tries++;
    }
    await syncOnce();
  }

  // 외부 노출
  window.LocalPhotoSync = {
    version: '1.0',
    syncOnce,
    rescan,
    getStatus
  };

  // 자동 초기 동기화 (DOM 준비 후 2초 지연 — 앱 초기 로딩 방해 방지)
  function scheduleInitialSync() {
    setTimeout(initialSync, 2000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInitialSync);
  } else {
    scheduleInitialSync();
  }

  console.log('[LocalPhotoSync v1.0] 로드 완료 — 2초 후 자동 동기화 실행');
})();
