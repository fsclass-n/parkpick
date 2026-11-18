// 운영 리포트(Gemini/템플릿)용 경량 마크다운 렌더러: 제목, 목록, 인용, 굵게만 지원 (HTML 미해석 → XSS 안전)
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  )
}

export default function Markdown({ text }) {
  const blocks = []
  let list = null
  const flush = () => {
    if (list) blocks.push(<ul key={blocks.length} className="my-2 list-disc space-y-1 pl-5">{list}</ul>)
    list = null
  }
  for (const raw of (text || '').split('\n')) {
    const line = raw.trimEnd()
    const item = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)/)
    if (item) {
      list ||= []
      list.push(<li key={list.length}>{inline(item[1])}</li>)
      continue
    }
    flush()
    if (!line.trim()) continue
    const key = blocks.length
    if (line.startsWith('### ')) blocks.push(<h4 key={key} className="mt-5 font-heading text-[17px] font-semibold">{inline(line.slice(4))}</h4>)
    else if (line.startsWith('## ')) blocks.push(<h3 key={key} className="mt-2 font-heading text-[20px] font-bold">{inline(line.slice(3))}</h3>)
    else if (line.startsWith('# ')) blocks.push(<h2 key={key} className="font-heading text-[22px] font-bold">{inline(line.slice(2))}</h2>)
    else if (line.startsWith('> ')) blocks.push(<blockquote key={key} className="my-3 border-l-4 border-brand-200 bg-brand-50 px-4 py-2 text-[13px] text-slate-600">{inline(line.slice(2))}</blockquote>)
    else blocks.push(<p key={key} className="my-2">{inline(line)}</p>)
  }
  flush()
  return <div className="text-[15px] leading-relaxed text-slate-700">{blocks}</div>
}
