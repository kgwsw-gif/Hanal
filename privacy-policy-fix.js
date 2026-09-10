/**
 * PrivacyPolicyFix v1.8
 * v1.0~v1.7 누적 변경 사항 유지
 * v1.8: 
 *   - 상단 헤더에서 시행일 문구 제거 (하단과 중복)
 *   - 하단 시행일 아래로 적용 범위 안내 이동 (옵션 2)
 */
(function() {
  'use strict';
  
  const VERSION = '1.8';
  
  if (window.PrivacyPolicyFix && window.PrivacyPolicyFix.version === VERSION) {
    console.log('[PrivacyPolicyFix] 이미 v' + VERSION + ' 로드됨');
    return;
  }
  
  if (typeof window.showPrivacyPolicyModal !== 'function') {
    console.error('[PrivacyPolicyFix] showPrivacyPolicyModal 함수를 찾을 수 없음');
    return;
  }
  
  if (!window.showPrivacyPolicyModal_original) {
    window.showPrivacyPolicyModal_original = window.showPrivacyPolicyModal;
  }
  
  window.showPrivacyPolicyModal = function() {
    var h = '<div class="p-6"><h3 class="text-xl font-bold text-gray-900 mb-4"><i class="fas fa-shield-alt text-primary-500 mr-2"></i>개인정보처리방침</h3>';
    h += '<div class="space-y-3 max-h-[70vh] overflow-y-auto">';
    
    // 헤더 (v1.8: 시행일 문구 제거, 기관명만 유지)
    h += '<div class="p-3 bg-primary-50 border border-primary-200 rounded-xl">';
    h += '<div class="text-sm font-bold text-primary-700"><i class="fas fa-info-circle mr-1"></i>한국폴리텍대학 화성캠퍼스 기숙사(행복관)</div>';
    h += '</div>';
    
    // 1. 수집하는 개인정보
    h += '<div class="bg-info-50 border border-info-200 rounded-2xl p-4"><div class="text-sm font-bold text-info-700 mb-2"><i class="fas fa-clipboard-list mr-1"></i>1. 수집하는 개인정보</div><div class="space-y-1.5 text-sm text-info-600">';
    [
      '이름, 학과, 호실, 출생년도 (필수)',
      '비밀번호 (필수, 해시 저장)',
      '교육생 사진 (필수, 입사 신청 시 제출한 사진을 활용)',
      '차량번호 (선택, 차량 소유자만)'
    ].forEach(function(t) {
      h += '<div class="flex items-start gap-2"><i class="fas fa-check-circle text-info-400 mt-1" style="font-size:10px"></i><span>' + t + '</span></div>';
    });
    h += '</div></div>';
    
    // 2. 이용 목적
    h += '<div class="bg-surface-50 border border-surface-200 rounded-2xl p-4"><div class="text-sm font-bold text-gray-700 mb-2"><i class="fas fa-bullseye mr-1"></i>2. 이용 목적</div><div class="space-y-1.5 text-sm text-gray-600">';
    [
      '기숙사 입사 관리 및 본인 확인',
      '인원보고 (잔류/외박/외출)',
      '시설 이용 및 출입 관리',
      '벌점 및 상벌 관리',
      '공지사항 전달'
    ].forEach(function(t) {
      h += '<div class="flex items-start gap-2"><i class="fas fa-angle-right text-gray-400 mt-1" style="font-size:10px"></i><span>' + t + '</span></div>';
    });
    h += '</div></div>';
    
    // 3. 보유 기간 및 파기 방법
    h += '<div class="bg-warning-50 border border-warning-200 rounded-2xl p-4"><div class="text-sm font-bold text-warning-700 mb-2"><i class="fas fa-clock mr-1"></i>3. 보유 기간 및 파기 방법</div>';
    h += '<div class="text-sm text-warning-600 space-y-1.5">';
    h += '<div>• <b>기본 개인식별정보</b> (이름·학과·호실·비밀번호·차량번호·출생년도): 수료 또는 퇴소 시 <b>즉시 파기</b> (Firestore 문서 삭제)</div>';
    h += '<div>• <b>출결 이력</b> (잔류·외박·외출): 수료 또는 퇴소 시 <b>즉시 파기</b> (Firestore 문서 삭제)</div>';
    h += '<div>• <b>로그인 기록·비밀번호 변경 이력</b>: <b>3개월 후 자동 삭제</b> (시스템 자동 처리)</div>';
    h += '</div></div>';
    
    // 4. 데이터 저장 서비스 이용
    h += '<div class="bg-surface-50 border border-surface-200 rounded-2xl p-4"><div class="text-sm font-bold text-gray-700 mb-2"><i class="fas fa-database mr-1"></i>4. 데이터 저장 서비스 이용</div>';
    h += '<div class="text-sm text-gray-600 space-y-1.5">';
    h += '<div>원활한 서비스 운영을 위해 아래와 같이 데이터를 안전하게 보관하고 있습니다.</div>';
    h += '<div class="mt-2 p-2 bg-white rounded-lg border border-surface-200">';
    h += '<div><span class="font-bold">저장 서비스:</span> Google (Firebase)</div>';
    h += '<div><span class="font-bold">이용 목적:</span> 데이터 저장 및 인증 서비스</div>';
    h += '<div><span class="font-bold">저장 항목:</span> 이름, 학과, 호실, 비밀번호(해시), 차량번호, 출생년도, 출결 이력 등</div>';
    h += '</div>';
    h += '<div class="mt-2">• 수집된 개인정보는 위 저장 목적 외에 <span class="font-bold">제3자에게 제공하지 않습니다</span>.</div>';
    h += '</div></div>';
    
    // 5. 안전성 확보조치
    h += '<div class="bg-success-50 border border-success-200 rounded-2xl p-4"><div class="text-sm font-bold text-success-700 mb-2"><i class="fas fa-lock mr-1"></i>5. 안전성 확보조치</div><div class="space-y-1.5 text-sm text-success-600">';
    [
      'HTTPS 암호화 통신',
      'Firebase 인증 시스템 및 Security Rules 적용',
      '비밀번호 해시 저장 (SHA-256)',
      '관리자 권한 기반 접근 제어'
    ].forEach(function(t) {
      h += '<div class="flex items-start gap-2"><i class="fas fa-shield-alt text-success-400 mt-1" style="font-size:10px"></i><span>' + t + '</span></div>';
    });
    h += '</div></div>';
    
    // 6. 정보주체의 권리
    h += '<div class="bg-info-50 border border-info-200 rounded-2xl p-4"><div class="text-sm font-bold text-info-700 mb-2"><i class="fas fa-user-check mr-1"></i>6. 정보주체의 권리</div><div class="space-y-1.5 text-sm text-info-600">';
    [
      '개인정보 열람 요구',
      '오류 정정 및 삭제 요구',
      '처리 정지 요구',
      '동의 철회'
    ].forEach(function(t) {
      h += '<div class="flex items-start gap-2"><i class="fas fa-angle-right text-info-400 mt-1" style="font-size:10px"></i><span>' + t + '</span></div>';
    });
    h += '<div class="mt-2 text-xs italic">※ 행사 방법: 개인정보 보호책임자 연락처로 요청</div>';
    h += '</div></div>';
    
    // 7. 개인정보 보호책임자
    h += '<div class="bg-primary-50 border border-primary-200 rounded-2xl p-4"><div class="text-sm font-bold text-primary-700 mb-2"><i class="fas fa-phone mr-1"></i>7. 개인정보 보호책임자</div><div class="space-y-1 text-sm text-primary-600">';
    h += '<div><span class="font-bold">소속:</span> 한국폴리텍대학 화성캠퍼스 기숙사(행복관) 사감실</div>';
    h += '<div><span class="font-bold">연락처:</span> <a href="tel:031-350-3133" class="underline">031-350-3133</a></div>';
    h += '</div></div>';
    
    // 하단 안내 (v1.8: 시행일 → 적용 범위 안내 순서, 옵션 2)
    h += '<div class="text-xs text-gray-500 text-center mt-2 space-y-1">';
    h += '<div>본 방침은 2026년 8월 17일부터 시행됩니다.</div>';
    h += '<div>※ 본 방침은 기숙사 앱 사용과 관련된 개인정보 처리에만 적용됩니다.</div>';
    h += '</div>';
    
    h += '</div>';
    h += '<button onclick="closeModal()" class="w-full mt-4 py-3 bg-surface-100 text-gray-500 rounded-2xl font-bold text-sm btn-press">닫기</button></div>';
    
    openModal(h);
    console.log('[PrivacyPolicyFix v' + VERSION + '] 개정본 처리방침 표시됨');
  };
  
  window.PrivacyPolicyFix = {
    version: VERSION,
    restore: function() {
      if (window.showPrivacyPolicyModal_original) {
        window.showPrivacyPolicyModal = window.showPrivacyPolicyModal_original;
        console.log('[PrivacyPolicyFix] 원본 복원됨');
      }
    }
  };
  
  console.log('✅ [PrivacyPolicyFix] v' + VERSION + ' 로드 완료');
})();
