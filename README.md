# 행복관 인원관리 시스템

기숙사(행복관) 교육생들의 잔류/외박/외출/퇴사를 관리하는 웹 기반 시스템입니다.

## 🌟 주요 기능

### 👥 3가지 사용자 모드
- **교육생 모드**: 잔류/외박/외출/퇴사 신청
- **학과대표 모드**: 해당 학과 교육생 관리 및 일괄 제출
- **관리자 모드**: 전체 현황 조회, 통계, 엑셀 다운로드, 공지사항 관리

### 📋 핵심 기능
- ✅ 실시간 제출 현황 조회
- ✅ 학과별/날짜별 통계
- ✅ 여자교육생 현황 별도 관리
- ✅ 외출 신청 (시간 지정 가능)
- ✅ 퇴사 신청 및 승인 시스템
- ✅ 엑셀 다운로드 (CSV 형식)
- ✅ 미제출자 알림 메시지 자동 생성
- ✅ 공지사항 시스템
- ✅ 모바일 반응형 디자인

## 🚀 시작하기

### 1. Firebase 프로젝트 설정

1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트 생성 또는 기존 프로젝트 사용
3. Firestore Database 활성화
4. Firebase 설정 정보 확인 (프로젝트 설정 > 일반)

### 2. index.html 설정

`index.html` 파일의 186-193번 라인에서 Firebase 설정을 업데이트하세요:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 3. Firebase 보안 규칙 설정

Firebase Console > Firestore Database > 규칙 탭에서 다음 규칙을 설정하세요:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 제출 데이터
    match /submissions/{document=**} {
      allow read, write: true;
    }
    
    // 외출 데이터
    match /outings/{document=**} {
      allow read, write: true;
    }
    
    // 퇴사 신청 데이터
    match /resignRequests/{document=**} {
      allow read, write: true;
    }
    
    // 공지사항
    match /announcement/{document=**} {
      allow read: true;
      allow write: true; // 필요시 인증 추가
    }
  }
}
```

### 4. 비밀번호 설정

#### 관리자 비밀번호 (216번 라인)
```javascript
const ADMIN_PASSWORD = '여기에_비밀번호_입력';
```

#### 학과대표 정보 (219-230번 라인 근처)
```javascript
const DEPARTMENT_LEADERS = {
    '학과명': { name: '대표이름', password: '비밀번호' },
    // 각 학과별로 추가...
};
```

### 5. 학생 정보 설정

249번 라인 근처에서 `originalStudents` 객체에 학과별 교육생 명단을 입력하세요:

```javascript
const originalStudents = {
    '학과명': ['학생1', '학생2', '학생3(여)'],
    // 여자 교육생은 이름 뒤에 (여) 표시
};
```

### 6. 웹 서버에 배포

- GitHub Pages, Netlify, Vercel 등에 배포
- 또는 로컬에서 실행: `python -m http.server 8000`

## 📱 사용 방법

### 교육생
1. 날짜 선택
2. 학과 선택
3. 이름 선택
4. 잔류/외박/외출/퇴사 중 선택

### 학과대표
1. 학과대표 로그인 (학과 선택 + 비밀번호 입력)
2. 일괄 신청 모드 활성화 (잔류/외박 선택)
3. 교육생들 체크 후 확인
4. 개별 제출 내역 관리

### 관리자
1. 관리자 로그인 (비밀번호 입력)
2. 전체 현황 조회
3. 날짜 변경 (-1day, +1day, -7day)
4. 엑셀 다운로드
5. 공지사항 작성/수정
6. 미제출자 명단 복사

## 🔧 기술 스택

- **Frontend**: HTML5, Tailwind CSS, JavaScript (ES6+)
- **Backend**: Firebase Firestore (실시간 데이터베이스)
- **Icons**: Font Awesome 6.4.0
- **Responsive**: 모바일/태블릿/데스크톱 지원

## 📊 데이터 구조

### Firestore Collections

#### submissions
```javascript
{
  id: "2025-10-22_학과명_이름",
  date: "2025-10-22",
  department: "학과명",
  name: "이름",
  status: "stay" | "out",
  timestamp: "2025-10-22 14:30:25"
}
```

#### outings
```javascript
{
  id: "2025-10-22_학과명_이름",
  date: "2025-10-22",
  department: "학과명",
  name: "이름",
  outingTime: "18:00",
  returnTime: "22:00",
  reason: "외출 사유",
  timestamp: "2025-10-22 14:30:25"
}
```

#### resignRequests
```javascript
{
  id: "unique_id",
  department: "학과명",
  name: "이름",
  resignDate: "2025-11-01",
  reason: "퇴사 사유",
  requestDate: "2025-10-22",
  status: "pending" | "approved"
}
```

#### announcement
```javascript
{
  id: "current",
  text: "공지사항 내용",
  updatedAt: "2025-10-22T14:30:25.000Z"
}
```

## 🔒 보안

⚠️ **중요**: 이 시스템은 교육 및 내부 사용 목적으로 설계되었습니다.

- Firebase 보안 규칙을 반드시 설정하세요
- 프로덕션 환경에서는 Firebase Authentication 사용 권장
- 비밀번호는 환경 변수로 관리하는 것을 권장
- 개인정보(생년월일 등)는 암호화 권장

## 📝 라이센스

이 프로젝트는 교육 목적으로 제작되었습니다.

## 🤝 기여

이슈 및 풀 리퀘스트를 환영합니다!

## 📧 문의

문제가 발생하면 이슈를 등록해주세요.
