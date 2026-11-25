// Unsplash 이미지 (Unsplash License · 무료 상업적 이용 가능)
// photo ID 만 관리하고 크기·품질은 imgix 파라미터로 요청해 용량을 최적화합니다.
const PHOTOS = {
  garageTeal: '1545179605-1296651e9d43', // 청록 조명의 지하 주차장 (메인 히어로)
  garageCars: '1562426509-5044a121aa49', // 차량이 주차된 실내 주차장 (관제)
  garagePillar: '1590674899484-d5640e854abe', // 노란 기둥·화살표 노면 표시 (유도)
  garageChevron: '1604063165585-e17e9c3c3f0b', // 노란 셰브론 유도 표시 (상업시설)
  garageDark: '1573348722427-f1d6819fdf98', // 어두운 지하 주차장 (로그인)
  aerialLot: '1506521781263-d8422e82f27a', // 항공 촬영 노상 주차장 (공영주차장)
  aerialYellow: '1470224114660-3f6686c562eb', // 노란 주차선 항공 뷰 (내 차 찾기)
  cctvWall: '1557597774-9d273605dfa9', // CCTV 카메라 (AI 비전)
  evPlug: '1593941707882-a5bba14938c7', // 전기차 충전 플러그
  evGarage: '1617886322168-72b886573c35', // 주차장 내 전기차 충전
  analytics: '1551288049-bebda4e38f71', // 데이터 대시보드 (리포트)
  officeTowers: '1486406146926-c627a92ad1ab', // 오피스 빌딩 (오피스 유스케이스)
  cityStreet: '1519501025264-65ba15a82390', // 도심 교통 (마이페이지)
  entrance: '1502877338535-766e1452684a', // 주차장 입구 (404)
}

export const unsplash = (key, w = 1600, q = 75) =>
  `https://images.unsplash.com/photo-${PHOTOS[key]}?auto=format&fit=crop&w=${w}&q=${q}`
