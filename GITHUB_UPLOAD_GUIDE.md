# GitHub 업로드 가이드

## 📦 준비된 파일들

1. **index.html** - 메인 시스템 파일
2. **README.md** - 프로젝트 설명서
3. **.gitignore** - Git 제외 파일 설정
4. **SECURITY.md** - 보안 가이드

## 🚀 GitHub에 업로드하는 방법

### 방법 1: GitHub 웹사이트 사용 (초보자 추천)

1. **GitHub 저장소 생성**
   - https://github.com/new 접속
   - Repository name: `happy-hall-management` (또는 원하는 이름)
   - ⚠️ **Private** 선택! (중요!)
   - "Create repository" 클릭

2. **파일 업로드**
   - "uploading an existing file" 클릭
   - 4개 파일 모두 드래그 & 드롭
   - Commit message: "Initial commit"
   - "Commit changes" 클릭

3. **완료!** ✅

### 방법 2: Git 명령어 사용 (개발자용)

#### Git 설치 확인
```bash
git --version
```

#### 저장소 초기화 및 업로드
```bash
# 1. 파일이 있는 폴더로 이동
cd /path/to/your/files

# 2. Git 저장소 초기화
git init

# 3. 파일 추가
git add .

# 4. 첫 커밋
git commit -m "Initial commit: 행복관 인원관리 시스템"

# 5. GitHub와 연결 (본인의 저장소 URL로 변경)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# 6. 브랜치 이름 변경 (옵션)
git branch -M main

# 7. GitHub에 푸시
git push -u origin main
```

## 🔐 보안 체크리스트

업로드 전 반드시 확인하세요:

- [x] GitHub에서 **Private Repository**로 설정했나요?
- [ ] Firebase 보안 규칙을 설정했나요?
- [ ] 관리자 비밀번호를 변경했나요?
- [ ] 학과대표 비밀번호를 변경했나요?

## 📱 GitHub Pages로 배포 (옵션)

Private Repository에서도 팀원들에게 웹 접근을 허용하려면:

1. GitHub 저장소 > Settings
2. Pages 메뉴 클릭
3. Source: Deploy from a branch
4. Branch: main / root 선택
5. Save 클릭
6. 몇 분 후 `https://YOUR_USERNAME.github.io/YOUR_REPO/` 에서 접속 가능

⚠️ **주의**: Pages는 기본적으로 공개됩니다. Private Pages는 GitHub Pro 이상 필요!

## 🔄 파일 업데이트 방법

### 웹에서 수정:
1. GitHub 저장소에서 파일 클릭
2. 연필 아이콘 (Edit) 클릭
3. 수정 후 "Commit changes" 클릭

### Git으로 수정:
```bash
# 1. 파일 수정 후
git add .
git commit -m "업데이트 내용 설명"
git push
```

## 👥 팀원 초대 방법

Private Repository에 팀원 초대:

1. GitHub 저장소 > Settings
2. Collaborators 메뉴
3. "Add people" 클릭
4. 팀원의 GitHub 아이디 또는 이메일 입력
5. 권한 선택:
   - **Write**: 코드 수정 가능
   - **Read**: 읽기만 가능
6. 초대 전송

## 📥 저장소 다운로드 (팀원용)

팀원이 코드를 받는 방법:

```bash
# 저장소 복제
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git

# 폴더로 이동
cd YOUR_REPO

# 브라우저에서 index.html 열기
```

## 🆘 문제 해결

### "Permission denied" 오류
- Personal Access Token 생성 필요
- GitHub > Settings > Developer settings > Personal access tokens
- "Generate new token" 클릭
- repo 권한 선택

### 파일이 너무 큰 경우
- Git은 100MB 이하 파일만 업로드 가능
- 현재 시스템은 단일 HTML 파일이므로 문제 없음

### Private Repository인데 다른 사람이 볼 수 있나요?
- 안 됩니다! Collaborator로 초대된 사람만 가능
- GitHub Pages를 활성화해도 Private Pages는 Pro 이상 필요

## ✅ 완료 확인

업로드 후 확인사항:

- [ ] GitHub에서 파일 4개 모두 보이나요?
- [ ] README.md가 저장소 첫 화면에 표시되나요?
- [ ] Repository가 Private으로 설정되어 있나요?
- [ ] (옵션) 팀원들을 Collaborator로 초대했나요?

## 🎉 축하합니다!

GitHub 업로드가 완료되었습니다!

**다음 단계:**
1. SECURITY.md를 읽고 보안 설정 완료
2. Firebase 보안 규칙 설정
3. README.md의 설치 가이드 따라하기
4. 팀원들과 공유

---

**도움이 필요하면 GitHub Issues를 통해 질문하세요!**
