import { Navigate, useParams } from 'react-router-dom'
import { PageHeader } from '../components/ui'

const POLICIES = {
  terms: {
    title: '이용약관',
    sections: [
      ['제1조 (목적)', '본 약관은 parkpick(이하 “서비스”)이 제공하는 AI 주차관제 및 유도 서비스의 이용 조건과 절차를 규정합니다.'],
      ['제2조 (서비스 내용)', '서비스는 실시간 주차면 현황, 주차 유도, 내 차 찾기, 운영 리포트 및 기업 고객용 관제 기능을 제공합니다.'],
      ['제3조 (이용자의 의무)', '이용자는 타인의 차량 번호를 무단으로 조회하거나 서비스를 부정한 목적으로 이용해서는 안 됩니다.'],
      ['제4조 (면책)', '주차면 정보는 AI 영상 분석 결과로 실제 현장 상황과 차이가 있을 수 있습니다. 현장 안내를 함께 확인해 주세요.'],
    ],
  },
  privacy: {
    title: '개인정보처리방침',
    sections: [
      ['1. 수집 항목', '이메일, 이름, (선택) 차량 번호, 소셜 로그인 식별자, 접속 기록'],
      ['2. 이용 목적', '회원 식별 및 로그인, 내 차 찾기, 서비스 개선을 위한 통계 분석'],
      ['3. 보유 기간', '회원 탈퇴 시 지체 없이 파기하며, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.'],
      ['4. 안전성 확보 조치', '비밀번호 단방향 암호화(PBKDF2), 접근 권한 분리(관리자/테스트 관리자 읽기 전용), 관리자 작업 감사 로그 기록, 번호판 마스킹'],
    ],
  },
  cctv: {
    title: '영상정보처리기기 운영·관리 방침',
    sections: [
      ['1. 설치 목적', '주차면 점유 판별, 주차 유도, 시설 안전 및 이상 상황(역주행·불법 주차) 감지'],
      ['2. 설치 위치 및 대수', '각 층 A~D 구역 통로 천장 (층별 4대, 총 8대)'],
      ['3. 영상 처리 방식', 'AI 분석은 이동체 탐지·추적과 주차면 점유 판별에 한정하며, 화면 노출 시 번호판과 인물 얼굴을 블러 처리합니다.'],
      ['4. 보관 기간', '원본 영상은 30일 보관 후 자동 삭제하며, 학습 데이터에는 비식별화된 공개 데이터셋(AI Hub)을 사용합니다.'],
    ],
  },
}

export default function Policy() {
  const { kind } = useParams()
  const policy = POLICIES[kind]
  if (!policy) return <Navigate to="/" replace />
  return (
    <div className="container-pp max-w-3xl py-10">
      <PageHeader icon="fa-file-shield" title={policy.title} desc="시행일: 2026년 11월 18일" />
      <div className="card space-y-6">
        {policy.sections.map(([title, body]) => (
          <section key={title}>
            <h2 className="pp-h3 text-[18px]">{title}</h2>
            <p className="mt-2 leading-relaxed text-slate-600">{body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
