/* LocalPhotoViewer v2.0 — 로컬 폴더 사진 관리
   변경사항: getFolderInfo, listFiles, scanAll 함수 추가
*/
(function () {
  'use strict';

  const DB_NAME = 'LocalPhotoDB';
  const DB_STORE = 'handles';
  const DB_KEY = 'photoFolder';

  let folderHandle = null;

  // ============ IndexedDB 유틸 ============
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(DB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbGet(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbSet(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async function idbDel(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ============ 권한 확인 ============
  async function verifyPermission(handle, mode = 'read') {
    const opts = { mode };
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    if ((await handle.requestPermission(opts)) === 'granted') return true;
    return false;
  }

  // ============ 폴더 선택 ============
  async function selectFolder() {
    if (typeof window.showDirectoryPicker !== 'function') {
      throw new Error('이 브라우저는 로컬 폴더 접근을 지원하지 않습니다.');
    }
    const handle = await window.showDirectoryPicker({ mode: 'read' });
    folderHandle = handle;
    await idbSet(DB_KEY, handle);
    console.log('[LocalPhoto] 폴더 선택 및 저장 완료:', handle.name);
    return { name: handle.name };
  }

  // ============ 저장된 폴더 복원 ============
  async function restoreFolder() {
    try {
      const handle = await idbGet(DB_KEY);
      if (!handle) return null;
      const ok = await verifyPermission(handle, 'read');
      if (!ok) {
        console.warn('[LocalPhoto] 폴더 권한 없음 — 다시 선택 필요');
        return null;
      }
      folderHandle = handle;
      console.log('[LocalPhoto] 저장된 폴더 복원:', handle.name);
      return { name: handle.name };
    } catch (e) {
      console.warn('[LocalPhoto] 폴더 복원 실패:', e);
      return null;
    }
  }

  // ============ 폴더 정보 조회 ============
  async function getFolderInfo() {
    if (!folderHandle) {
      const restored = await restoreFolder();
      if (!restored) return null;
    }
    return { name: folderHandle.name };
  }

  // ============ 폴더 초기화 ============
  async function clearFolder() {
    folderHandle = null;
    await idbDel(DB_KEY);
    console.log('[LocalPhoto] 저장된 폴더 삭제됨');
  }

  // ============ 단일 사진 가져오기 (Blob URL 반환) ============
  async function getPhoto(name) {
    if (!folderHandle) {
      const restored = await restoreFolder();
      if (!restored) return null;
    }
    const exts = ['jpg', 'jpeg', 'png'];
    for (const ext of exts) {
      try {
        const fileHandle = await folderHandle.getFileHandle(`${name}.${ext}`);
        const file = await fileHandle.getFile();
        return URL.createObjectURL(file);
      } catch (e) {
        // 파일 없음 → 다음 확장자 시도
      }
    }
    return null;
  }

  // ============ 파일 목록 조회 ============
  async function listFiles() {
    if (!folderHandle) {
      const restored = await restoreFolder();
      if (!restored) return [];
    }
    const files = [];
    for await (const entry of folderHandle.values()) {
      if (entry.kind === 'file') {
        const lower = entry.name.toLowerCase();
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) {
          files.push(entry.name);
        }
      }
    }
    return files;
  }

  // ============ 전체 스캔 (이름 → Blob URL 맵) ============
  async function scanAll() {
    if (!folderHandle) {
      const restored = await restoreFolder();
      if (!restored) return {};
    }
    const map = {};
    let count = 0;
    for await (const entry of folderHandle.values()) {
      if (entry.kind !== 'file') continue;
      const name = entry.name;
      const lower = name.toLowerCase();
      const match = lower.match(/^(.+)\.(jpg|jpeg|png)$/);
      if (!match) continue;
      // 원본 이름에서 확장자 제거 (대소문자 보존)
      const nameWithoutExt = name.replace(/\.(jpg|jpeg|png)$/i, '');
      try {
        const file = await entry.getFile();
        map[nameWithoutExt] = URL.createObjectURL(file);
        count++;
      } catch (e) {
        console.warn('[LocalPhoto] 파일 읽기 실패:', name, e);
      }
    }
    console.log(`[LocalPhoto] 전체 스캔 완료: ${count}개 사진`);
    return map;
  }

  // ============ 외부 노출 ============
  window.LocalPhotoViewer = {
    version: '2.0',
    selectFolder,
    restoreFolder,
    getFolderInfo,
    clearFolder,
    getPhoto,
    listFiles,
    scanAll
  };

  // 페이지 로드 시 자동 복원
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => restoreFolder());
  } else {
    restoreFolder();
  }

  console.log('[LocalPhotoViewer v2.0] 로드 완료');
})();
