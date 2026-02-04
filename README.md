# PCB Defect Detector (PCB 결함 탐지 시스템)

YOLOv5 인공지능 모델을 활용하여 PCB(인쇄회로기판)의 결함을 실시간으로 탐지하고 관리하는 통합 솔루션입니다.

---

## 기술 스택 (Tech Stack)

### Frontend
- **React Native (Expo)**: 모바일 앱 환경 기반 사용자 인터페이스

### Backend
- **Python / Django (or Flask)**: 데이터 처리 및 AI 모델 서빙 API
- **PostgreSQL**: 기업 및 사용자 정보 관리 (Companies, Users 테이블)

### AI Model
- **YOLOv5**: PCB 결함 탐지 및 분류 모델

---

## 프로젝트 구조 (Project Structure)

.
├── client/           # React Native 모바일 앱 소스 코드
├── server/           # 백엔드 서버 (Django/Python)
├── yolov5/           # YOLOv5 오픈소스 및 학습 관련 코드
├── pcb_db_backup.sql # PostgreSQL 데이터베이스 스키마 및 초기 데이터
└── requirements.txt  # 서버 실행을 위한 파이썬 라이브러리 목록

## 주요 기능

실시간 탐지: 모바일 카메라 또는 업로드된 PCB 이미지를 통해 결함 자동 탐지
이력 관리: 탐지된 결함 결과물 및 통계 데이터 저장
결과 리포트: 탐지 결과에 대한 엑셀(xlsx) 데이터 생성 및 관리
