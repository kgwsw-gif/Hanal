/* LocalPhotoUI v1.2 — 로컬 사진 폴더 선택 UI (슈퍼관리자 로그인 전용)
   조건: window.currentMode === 'admin' && saved_admin_email === 'super1@hwaseong.com'
*/
(function () {
  'use strict';

  const BTN_ID = 'localPhotoFolderBtn';
  const STATUS_ID = 'localPhotoFolderStatus';
  const WRAP_ID = 'localPhotoUIWrap';
  const ALLOWED_EMAIL = 'super1@hwaseong.com';
  const ADMIN_MODE = 'admin';

  function isSupported() {
    return typeof window.showDirectoryPicker === 'function';
  }

  function isSuperAdminLoggedIn() {
    try {
      if (window.currentMode !== ADMIN_MODE) return false;
      const email = localStorage.getItem('saved_admin_email');
      if (email !== ALLOWED_EMAIL) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  async function refreshStatus() {
    const el = document.getElementById(STATUS_ID);
    if (!el) return;
    try {
      const info = await window.LocalPhotoViewer?.getFolderInfo?.();
      if (info && info.name) {
        el.textContent = `📁 ${info.name}`;
        el.style.color = '#0a7d2c';
      } else {
        el.textContent = '📁 폴더 미선택';
        el.style.color = '#a00';
      }
    } catch (e) {
      el.textContent = '📁 상태 확인 실패';
      el.style.color = '#a00';
    }
  }

  async function onSelectFolder() {
    if (!isSupported()) {
      alert('이 브라우저는 로컬 폴더 접근을 지원하지 않습니다.\nChrome 또는 Edge 최신 버전을 사용해 주세요.');
      return;
    }
    if (!window.LocalPhotoViewer) {
      alert('LocalPhotoViewer 모듈이 로드되지 않았습니다.\n페이지를 새로고침(Ctrl+Shift+R) 후 다시 시도해 주세요.');
      return;
    }
    try {
      const result = await window.LocalPhotoViewer.selectFolder();
      if (result && result.name) {
        alert(`✅ 폴더가 선택되었습니다.\n\n선택된 폴더: ${result.name}\n\n※ 이 폴더는 이 브라우저에 기억되며, 다음 접속에도 유지됩니다.`);
        await refreshStatus();
        if (window.LocalPhotoSync?.rescan) {
          await window.LocalPhotoSync.rescan();
        }
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      console.error('[LocalPhotoUI] 폴더 선택 실패:', err);
      alert('폴더 선택 중 오류가 발생했습니다.\n\n' + (err?.message || err));
    }
  }

  function injectUI() {
    if (document.getElementById(WRAP_ID)) return;

    const wrap = document.createElement('div');
    wrap.id = WRAP_ID;
    wrap.style.cssText = [
      'position:fixed',
      'top:8px',
      'right:8px',
      'z-index:99999',
      'display:flex',
      'gap:6px',
      'align-items:center',
      'background:rgba(255,255,255,0.95)',
      'border:1px solid #ccc',
      'border-radius:6px',
      'padding:4px 8px',
      'font-size:12px',
      'font-family:sans-serif',
      'box-shadow:0 1px 3px rgba(0,0,0,0.1)'
    ].join(';');

    const status = document.createElement('span');
    status.id = STATUS_ID;
    status.textContent = '📁 확인 중…';
    status.style.cssText = 'color:#666;';

    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.textContent = '사진 폴더 선택';
    btn.style.cssText = [
      'padding:3px 8px',
      'font-size:12px',
      'border:1px solid #888',
      'background:#f5f5f5',
      'border-radius:4px',
      'cursor:pointer'
    ].join(';');
    btn.addEventListener('click', onSelectFolder);

    wrap.appendChild(status);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);

    refreshStatus();
  }

  function removeUI() {
    const wrap = document.getElementById(WRAP_ID);
    if (wrap) wrap.remove();
  }

  function updateUIVisibility() {
    if (isSuperAdminLoggedIn()) {
      injectUI();
    } else {
      removeUI();
    }
  }

  function init() {
    updateUIVisibility();
    setInterval(updateUIVisibility, 2000);
    window.addEventListener('storage', (e) => {
      if (e.key === 'saved_admin_email') updateUIVisibility();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.LocalPhotoUI = {
    version: '1.2',
    refreshStatus,
    onSelectFolder,
    updateVisibility: updateUIVisibility,
    isSuperAdminLoggedIn
  };

  console.log('[LocalPhotoUI v1.2] 로드 완료 (슈퍼관리자 로그인 전용)');
})();
