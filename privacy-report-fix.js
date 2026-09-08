/**
 * PrivacyReportFix v1.4
 * v1.3 버그 수정: 
 *   - 사진 원본 순번을 4로 정정 (v1.3까지 5로 오해)
 *   - 순번 재조정 매핑 재작성: {1:1, 2:2, 3:3, 5:4, 7:5, 8:6, 9:7, 10:8}
 * v1.4 신규:
 *   - "방번호" 항목명 → "호실번호" 치환 추가 (원본에 실제 존재 확인)
 */
(function() {
  'use strict';
  
  const VERSION = '1.4';
  
  if (window.PrivacyReportFix && window.PrivacyReportFix.version === VERSION) {
    console.log('[PrivacyReportFix] 이미 v' + VERSION + ' 로드됨');
    return;
  }
  
  const originalFn = window._buildDestructionMethodSection_original 
    || window._buildDestructionMethodSection;
  
  if (typeof originalFn !== 'function') {
    console.error('[PrivacyReportFix] _buildDestructionMethodSection 함수를 찾을 수 없음');
    return;
  }
  
  if (!window._buildDestructionMethodSection_original) {
    window._buildDestructionMethodSection_original = originalFn;
  }
  
  function removeRowByKeyword(html, keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      '<tr>(?:(?!<tr>|</tr>)[\\s\\S])*?' + escaped + '(?:(?!<tr>|</tr>)[\\s\\S])*?</tr>',
      'gi'
    );
    const matches = html.match(pattern);
    if (matches) {
      return { html: html.replace(pattern, ''), count: matches.length, removedSize: matches.join('').length };
    }
    return { html, count: 0, removedSize: 0 };
  }
  
  window._buildDestructionMethodSection = async function(...args) {
    let html = await window._buildDestructionMethodSection_original.apply(this, args);
    
    if (typeof html !== 'string') {
      console.warn('[PrivacyReportFix] 반환값이 문자열이 아님, 원본 반환');
      return html;
    }
    
    const originalLength = html.length;
    const originalTrCount = (html.match(/<tr>/g) || []).length;
    
    // ========== 1. 사진(photos) 행 제거 ==========
    const photoResult = removeRowByKeyword(html, 'photos');
    html = photoResult.html;
    if (photoResult.count > 0) {
      console.log('✂️ 사진 행 제거: ' + photoResult.count + '개 (' + photoResult.removedSize + '자)');
    }
    
    // ========== 2. 기숙사 서약서 행 제거 ==========
    const agreementResult = removeRowByKeyword(html, 'dormitoryAgreements');
    html = agreementResult.html;
    if (agreementResult.count > 0) {
      console.log('✂️ 서약서 행 제거: ' + agreementResult.count + '개 (' + agreementResult.removedSize + '자)');
    }
    
    // ========== 3. 행 개수 안전 검증 ==========
    const afterTrCount = (html.match(/<tr>/g) || []).length;
    const expectedRemoval = photoResult.count + agreementResult.count;
    const actualRemoval = originalTrCount - afterTrCount;
    if (actualRemoval !== expectedRemoval) {
      console.error('🚨 행 제거 이상 (예상:' + expectedRemoval + ' 실제:' + actualRemoval + ') → 원본 반환');
      return await window._buildDestructionMethodSection_original.apply(this, args);
    }
    console.log('✅ 행 개수 검증 통과 (' + originalTrCount + '→' + afterTrCount + ')');
    
    // ========== 4. 용어 치환: 방번호 & 방 배정 이력 → 호실 계열 ==========
    let 치환건수 = 0;
    
    // 4-1. "방번호" → "호실번호" (표 셀 내부 정확 매칭)
    // 원본: <td style="...">방번호</td>
    const 방번호패턴 = /(<td[^>]*>)방번호(<\/td>)/g;
    const before1 = html;
    html = html.replace(방번호패턴, '$1호실번호$2');
    if (before1 !== html) {
      치환건수++;
      console.log('  ✓ 방번호 → 호실번호');
    } else {
      // 폴백: 셀 태그 없이 단순 문자열 치환
      const before1b = html;
      html = html.replace(/방번호/g, '호실번호');
      if (before1b !== html) {
        치환건수++;
        console.log('  ✓ 방번호 → 호실번호 (폴백)');
      } else {
        console.warn('  ⚠️ 방번호 매칭 실패');
      }
    }
    
    // 4-2. "방 배정 이력" → "호실 배정 이력"
    const before2 = html;
    html = html.replace(/방 배정 이력/g, '호실 배정 이력');
    if (before2 !== html) {
      치환건수++;
      console.log('  ✓ 방 배정 이력 → 호실 배정 이력');
    }
    
    console.log('🔄 용어 치환 총 ' + 치환건수 + '건');
    
    // ========== 5. 항목 수 재조정 ==========
    html = html.replace(/\(총\s*10\s*개\)/g, '(총 8개)');
    html = html.replace(/10\s*개\s*컬렉션/g, '8개 컬렉션');
    
    // ========== 6. 순번 재조정 (v1.4 수정: 사진=4번, 서약서=6번 제거) ==========
    // 원본 순번 → 재조정 순번
    // 사진(4) 제거 → 5,7,8,9,10이 남고, 서약서(6) 추가 제거 → 5,7,8,9,10 중 6 제외
    // 실제 남은 원본 순번: [1, 2, 3, 5, 7, 8, 9, 10]
    const 매핑 = { 1:1, 2:2, 3:3, 5:4, 7:5, 8:6, 9:7, 10:8 };
    
    const 순번패턴 = /<td style="border:1px solid #000;padding:4px 8px;text-align:center;">(\d{1,2})<\/td>/g;
    html = html.replace(순번패턴, (match, num) => {
      const n = parseInt(num);
      const newNum = 매핑[n];
      if (newNum === undefined) {
        console.warn('  ⚠️ 매핑 미정의 순번:', n);
        return match;
      }
      return match.replace('>' + num + '<', '>' + newNum + '<');
    });
    console.log('🔢 순번 재조정 완료 (매핑: 1,2,3,5,7,8,9,10 → 1,2,3,4,5,6,7,8)');
    
    console.log('📊 최종 변경 크기: ' + (originalLength - html.length) + '자 감소');
    
    return html;
  };
  
  window.PrivacyReportFix = {
    version: VERSION,
    restore: function() {
      if (window._buildDestructionMethodSection_original) {
        window._buildDestructionMethodSection = window._buildDestructionMethodSection_original;
        console.log('[PrivacyReportFix] 원본 복원됨');
      }
    }
  };
  
  console.log('✅ [PrivacyReportFix] v' + VERSION + ' 로드 완료');
})();
