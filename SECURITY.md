# 보안 가이드

## 🔒 중요 보안 설정

### 1. Firebase 보안 규칙 설정 (필수!)

현재 시스템은 기본적으로 모든 사용자에게 읽기/쓰기 권한이 열려있습니다. **반드시** 아래 단계를 따라 보안을 강화하세요.

#### 단계별 설정:

1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트 선택
3. **Firestore Database** 메뉴 클릭
4. **규칙(Rules)** 탭 클릭
5. 아래 규칙을 복사하여 붙여넣기

#### 기본 규칙 (개발/테스트용):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: true;
    }
  }
}
```

#### 권장 규칙 (프로덕션용):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 제출 데이터
    match /submissions/{submissionId} {
      allow read: true;
      allow create: true;
      allow update, delete: if request.auth != null; // 인증된 사용자만
    }
    
    // 외출 데이터
    match /outings/{outingId} {
      allow read: true;
      allow create: true;
      allow update, delete: if request.auth != null;
    }
    
    // 퇴사 신청
    match /resignRequests/{requestId} {
      allow read: true;
      allow create: true;
      allow update, delete: if request.auth != null;
    }
    
    // 공지사항 (관리자만 수정 가능하도록 설정 권장)
    match /announcement/{announcementId} {
      allow read: true;
      allow write: true; // 실제로는 관리자 인증 추가 권장
    }
  }
}
```

### 2. Private Repository 사용 (GitHub)

GitHub에 업로드 시 **반드시 Private Repository**로 설정하세요:

1. GitHub 저장소 생성 시 **Private** 선택
2. 또는 기존 저장소: Settings > General > Change visibility > Make private

### 3. 민감한 정보 관리

현재 코드에 하드코딩된 정보들:

#### ⚠️ 관리자 비밀번호 (216번 라인)
```javascript
const ADMIN_PASSWORD = '3503133'; // ← 변경 필요!
```

**권장 조치:**
- 강력한 비밀번호로 변경
- 주기적으로 변경
- 팀원들과 안전한 방법으로 공유 (1Password, LastPass 등)

#### ⚠️ 학과대표 비밀번호 (219-230번 라인)
```javascript
const DEPARTMENT_LEADERS = {
    '반도체표면처리과': { name: '김재형', password: '971014' },
    // ← 주민등록번호 앞자리 사용 중! 변경 권장
};
```

**권장 조치:**
- 주민등록번호 사용 중단
- 6-8자리 고유 PIN 번호로 변경
- 정기적으로 변경

#### ⚠️ 학생 생년월일 (234-247번 라인)
```javascript
const studentBirthDates = {
    '김재형': '971014', // ← 개인정보!
};
```

**권장 조치:**
- 반드시 Private Repository 사용
- 가능하면 암호화하여 저장
- 또는 별도 데이터베이스로 이전

### 4. Firebase API 키 보호

`index.html` 186-193번 라인의 Firebase 설정:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyCrXIaNF3B_HAJmFFW4CF-8O_jKBry7i1I", // ← 노출됨
    // ...
};
```

**참고:**
- Firebase API 키는 공개되어도 보안 규칙으로 보호 가능
- 하지만 **Firebase 보안 규칙 설정은 필수**
- 무단 사용 방지를 위해 Firebase Console에서 "승인된 도메인"만 허용 설정

#### 승인된 도메인 설정:
1. Firebase Console > Authentication > Settings
2. **승인된 도메인** 섹션에 실제 도메인만 추가
3. `localhost`는 개발용으로만 유지

### 5. HTTPS 사용

웹사이트 배포 시 **반드시 HTTPS** 사용:

- GitHub Pages: 자동 HTTPS 제공
- Netlify/Vercel: 자동 HTTPS 제공
- 커스텀 도메인: Let's Encrypt 인증서 사용

### 6. 정기 보안 점검

- [ ] 매월 비밀번호 변경 검토
- [ ] Firebase 사용량 모니터링 (비정상 접근 탐지)
- [ ] 보안 규칙 업데이트
- [ ] 로그 확인

## 🚨 보안 사고 발생 시

1. **즉시 비밀번호 변경**
2. Firebase 보안 규칙 강화
3. Firebase Console에서 이상 활동 로그 확인
4. 필요시 데이터베이스 백업 및 복원

## 📞 보안 문의

보안 취약점을 발견하셨다면 공개 이슈가 아닌 **비공개로** 연락 주세요.

## ✅ 배포 전 체크리스트

프로덕션 환경에 배포하기 전 확인하세요:

- [ ] Firebase 보안 규칙 설정 완료
- [ ] GitHub Private Repository 사용
- [ ] 관리자 비밀번호 변경
- [ ] 학과대표 비밀번호 변경
- [ ] Firebase 승인된 도메인 설정
- [ ] HTTPS 사용
- [ ] 백업 계획 수립

---

**⚠️ 이 시스템은 교육 및 내부 사용 목적으로 설계되었으며, 프로덕션 환경에서는 추가 보안 조치가 필요합니다.**
