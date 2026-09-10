/**
 * LeaderLoginPublicFix v1.0
 * 
 * 목적: 로그인 화면의 학과대표 목록을 공개 요약 문서(config/departmentLeadersPublic)에서 읽어
 *       departmentLeaders 원본 컬렉션의 list 권한을 관리자 전용으로 원복할 수 있게 함.
 * 
 * 동작:
 *   1) 페이지 로드 직후 config/departmentLeadersPublic 조회
 *   2) DEPARTMENT_LEADERS 전역 객체에 {학과: {name}} 형태로 미리 채움
 *      (비밀번호는 로그인 시 db.collection('departmentLeaders').doc(dept).get()으로 개별 조회 — get 권한만 필요)
 *   3) 학과대표 CRUD(changeLeaderPassword, deleteLeader) 훅킹하여 요약 문서 자동 동기화
 * 
 * 설치: <script src="leader-login-public-fix.js"></script>  (index.html </body> 직전)
 */
(function() {
  'use strict';
  const VERSION = '1.0';
  const PUBLIC_DOC_PATH = { collection: 'config', doc: 'departmentLeadersPublic' };
  
  // 전역 네임스페이스
  window.LeaderLoginPublicFix = {
    version: VERSION,
    _installed: false,
    _loaded: false,
    _lastSync: null
  };
  
  // ============================================================
  // 1) 공개 요약 문서에서 DEPARTMENT_LEADERS 초기 로드
  // ============================================================
  async function loadFromPublic() {
    try {
      if (!window.firebase || !firebase.firestore) {
        console.warn(`[LeaderLoginPublicFix v${VERSION}] Firebase 미준비 — 100ms 후 재시도`);
        setTimeout(loadFromPublic, 100);
        return;
      }
      
      const snap = await firebase.firestore()
        .collection(PUBLIC_DOC_PATH.collection)
        .doc(PUBLIC_DOC_PATH.doc)
        .get();
      
      if (!snap.exists) {
        console.warn(`[LeaderLoginPublicFix v${VERSION}] 공개 요약 문서 없음 — 관리자가 최초 생성 필요`);
        return;
      }
      
      const data = snap.data();
      const leaders = data.leaders || [];
      
      // window.DEPARTMENT_LEADERS 채우기 (기존 값이 있으면 name만 덮어씀, 비번은 유지)
      if (typeof window.DEPARTMENT_LEADERS !== 'object' || window.DEPARTMENT_LEADERS === null) {
        window.DEPARTMENT_LEADERS = {};
      }
      leaders.forEach(({ dept, name }) => {
        if (!dept) return;
        if (!window.DEPARTMENT_LEADERS[dept]) {
          window.DEPARTMENT_LEADERS[dept] = { name: name, password: '' };
        } else {
          window.DEPARTMENT_LEADERS[dept].name = name;
        }
      });
      
      window.LeaderLoginPublicFix._loaded = true;
      window.LeaderLoginPublicFix._lastSync = new Date().toISOString();
      console.log(`[LeaderLoginPublicFix v${VERSION}] 공개 요약 로드 완료 — ${leaders.length}개 학과`);
    } catch(e) {
      console.error(`[LeaderLoginPublicFix v${VERSION}] 로드 실패:`, e.code, e.message);
    }
  }
  
  // ============================================================
  // 2) 요약 문서 재빌드 (CRUD 후 호출)
  // ============================================================
  async function rebuildPublicDoc() {
    try {
      const user = firebase.auth().currentUser;
      if (!user || !user.email) {
        console.warn(`[LeaderLoginPublicFix v${VERSION}] 인증 없음 — 요약 재빌드 스킵`);
        return;
      }
      
      // 원본 컬렉션에서 최신 데이터 조회 (관리자 권한 필요)
      const snap = await firebase.firestore().collection('departmentLeaders').get();
      const leaders = [];
      snap.forEach(doc => {
        const d = doc.data();
        leaders.push({ dept: doc.id, name: d.name || '' });
      });
      
      await firebase.firestore()
        .collection(PUBLIC_DOC_PATH.collection)
        .doc(PUBLIC_DOC_PATH.doc)
        .set({
          leaders,
          updatedAt: new Date().toISOString(),
          updatedBy: user.email,
          note: '로그인 화면 표시용 공개 요약. 비밀번호·개인정보 없음.'
        });
      
      console.log(`[LeaderLoginPublicFix v${VERSION}] 요약 문서 재빌드 완료 — ${leaders.length}개 학과`);
    } catch(e) {
      console.error(`[LeaderLoginPublicFix v${VERSION}] 재빌드 실패:`, e.code, e.message);
    }
  }
  
  // ============================================================
  // 3) CRUD 함수 훅킹 (자동 동기화)
  // ============================================================
  function installHooks() {
    const targets = ['changeLeaderPassword', 'deleteLeader'];
    const hooked = [];
    
    targets.forEach(fnName => {
      if (typeof window[fnName] !== 'function') return;
      const original = window[fnName];
      window[fnName] = async function(...args) {
        const result = await original.apply(this, args);
        // CRUD 후 요약 문서 재동기화 (비동기 — 실패해도 원본 결과에 영향 없음)
        rebuildPublicDoc().catch(e => console.error(`[${fnName} 후 재빌드 실패]`, e));
        return result;
      };
      hooked.push(fnName);
    });
    
    console.log(`[LeaderLoginPublicFix v${VERSION}] CRUD 훅킹 완료:`, hooked);
    return hooked;
  }
  
  // ============================================================
  // 4) 공개 API
  // ============================================================
  window.LeaderLoginPublicFix.reload = loadFromPublic;
  window.LeaderLoginPublicFix.rebuild = rebuildPublicDoc;
  window.LeaderLoginPublicFix.status = () => ({
    version: VERSION,
    installed: window.LeaderLoginPublicFix._installed,
    loaded: window.LeaderLoginPublicFix._loaded,
    lastSync: window.LeaderLoginPublicFix._lastSync,
    leaderCount: Object.keys(window.DEPARTMENT_LEADERS || {}).length
  });
  
  // ============================================================
  // 5) 초기화 (DOM 로드 후)
  // ============================================================
  function init() {
    if (window.LeaderLoginPublicFix._installed) return;
    loadFromPublic();
    // CRUD 훅킹은 함수들이 정의된 후에 실행되어야 하므로 약간 지연
    setTimeout(() => {
      installHooks();
      window.LeaderLoginPublicFix._installed = true;
      console.log(`[LeaderLoginPublicFix v${VERSION}] 설치 완료`);
    }, 500);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
