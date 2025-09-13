import { useEffect, useRef, useState } from 'react'
import Checklist from '../components/Checklist.jsx'

const EMPTY_BRIEF = {
  domain: "", goal: "", facts: "", obstacles: "", resources: "",
  constraints: "", examples: "", audience: "", desired_output: "",
  success_criteria: "", jurisdiction: "", pii_flags: []
}

function safeUUID() {
  try {
    const g = (typeof window !== 'undefined' ? window : self)
    if (g?.crypto?.randomUUID) return g.crypto.randomUUID()
  } catch {}
  return 'sid_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function Badge({children}) {
  return <span className="text-xs bg-gray-200 rounded px-2 py-0.5">{children}</span>
}

function MsHead(){
  return (
    <div className="flex items-center gap-3">
      <img src="/ms-legalease.png" alt="Ms LegalEase" className="h-10 w-10 rounded-full border object-cover"/>
      <div className="leading-tight">
        <div className="font-semibold">Ms LegalEase</div>
        <div className="text-xs text-gray-500">Prompt coach</div>
      </div>
    </div>
  )
}

export default function App(){
  const [brief, setBrief] = useState(EMPTY_BRIEF)
  const [input, setInput] = useState("")
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('gather') // 'gather' | 'confirm' | 'final'
  const [question, setQuestion] = useState("Tell me your problem in a few sentences.")
  const [why, setWhy] = useState("We’ll infer as much as we can, then ask one question at a time.")
  const [gold, setGold] = useState("")
  const [verify, setVerify] = useState([])
  const [log, setLog] = useState([])
  const [statusMap, setStatusMap] = useState({
    domain:false, goal:false, facts:false, obstacles:false, resources:false,
    constraints:false, examples:false, audience:false, desired_output:false,
    success_criteria:false, jurisdiction:false
  })
  const [sessionId, setSessionId] = useState(localStorage.getItem('pc_session') || safeUUID())

  const scrollRef = useRef(null)
  useEffect(()=>{ localStorage.setItem('pc_session', sessionId) },[sessionId])
  useEffect(()=>{ document.title = "Ms LegalEase" },[])
  useEffect(()=>{
    // auto-scroll chat area to bottom after new message
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [log, question])

  const legalBanner = (brief.domain?.toLowerCase().includes("legal") || brief.jurisdiction)

  async function nextTurn(userText){
    const body = { sessionId, brief, user_input: userText }
    setLog(l => [...l, { role:'user', content:userText }])

    const resp = await fetch('http://localhost:3001/api/coach/next', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    }).catch(err => ({ ok:false, error: err.message }))

    if (!resp || !resp.ok){
      setLog(l => [...l, { role:'coach', content: 'Connection issue. Is the server on port 3001 running?' }])
      return
    }
    const data = await resp.json()

    if (data.updated_brief) setBrief(data.updated_brief)
    if (typeof data.progress === 'number') setProgress(data.progress)
    if (data._field_status) setStatusMap(data._field_status)
    if (data.phase) setPhase(data.phase)

    if (data.phase === 'final') {
      setGold(data.gold_prompt || "")
      setVerify(data.verify_list || [])
      setQuestion("All set.")
      setWhy("You can copy the Gold Prompt on the right.")
      setLog(l => [...l, { role:'coach', content: 'We’re done. Your Gold Prompt and checklist are ready.' }])
    } else {
      setQuestion(data.question || "What detail would help most next?")
      setWhy(data.why_it_matters || "This will improve the prompt quality.")
      setLog(l => [...l, { role:'coach', content: `${data.question}

Why this matters: ${data.why_it_matters}` }])
    }
  }

  function copyGold(){
    navigator.clipboard.writeText(gold || "").then(()=>alert("Gold prompt copied"))
  }

  function resetAll(){
    setBrief(EMPTY_BRIEF); setProgress(0); setQuestion("Tell me your problem in a few sentences.")
    setWhy("We’ll infer as much as we can, then ask one question at a time."); setPhase('gather'); setGold(""); setVerify([])
    setLog([]); setInput("")
    setStatusMap({
      domain:false, goal:false, facts:false, obstacles:false, resources:false,
      constraints:false, examples:false, audience:false, desired_output:false,
      success_criteria:false, jurisdiction:false
    })
    setSessionId(safeUUID())
  }

  const progressStyle = { width: `${Math.min(100, Math.max(0, progress))}%` }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <header className="flex items-center justify-between">
        <MsHead />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Session: {sessionId.slice(0,8)}…</span>
          {legalBanner && <Badge>This is general information, not legal advice.</Badge>}
          <button onClick={resetAll} className="px-3 py-1.5 border rounded-md text-sm">Reset</button>
        </div>
      </header>

      <div className="h-2 bg-gray-200 rounded">
        <div className="h-2 bg-black rounded" style={progressStyle} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: Checklist (fixed height, scroll inside) */}
        <div className="md:col-span-1">
          <Checklist statusMap={statusMap} />
        </div>

        {/* Center: Chat (fixed height, scroll inside) */}
        <div className="md:col-span-1 space-y-3">
          <div className="bg-white border rounded-xl p-3 h-[75vh] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-medium">Chat with Ms LegalEase</h2>
            </div>

            {/* Scrollable message area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1 space-y-2 text-sm">
              {log.map((m,i)=>(
                <div key={i} className="flex items-start gap-2">
                  {m.role==='coach' ? (
                    <img src="/ms-legalease.png" alt="Ms LegalEase" className="h-6 w-6 rounded-full border object-cover mt-0.5"/>
                  ) : (
                    <div className="h-6 w-6 rounded-full border bg-gray-300 text-[10px] flex items-center justify-center mt-0.5">You</div>
                  )}
                  <div>
                    <div className="text-[11px] text-gray-500">{m.role==='coach' ? 'Ms LegalEase' : 'You'}</div>
                    <div className={m.role==='user' ? 'font-semibold whitespace-pre-wrap' : 'whitespace-pre-wrap'}>{m.content}</div>
                  </div>
                </div>
              ))}

              {/* Active question card */}
              <div className="p-2 bg-gray-50 rounded">
                <div className="font-medium">Ms LegalEase asks:</div>
                <div className="whitespace-pre-wrap">{question}</div>
                <div className="text-xs text-gray-600 mt-1">Why this matters: {why}</div>
              </div>

              {/* Confirm step quick buttons */}
              {phase === 'confirm' && (
                <div className="flex gap-2 mt-2">
                  <button onClick={()=>nextTurn('yes')} className="px-3 py-1.5 rounded-md bg-black text-white text-sm">Yes, looks good</button>
                  <button onClick={()=>nextTurn('no')} className="px-3 py-1.5 rounded-md border text-sm">No, change something</button>
                </div>
              )}
            </div>

            {/* Composer at the bottom */}
            <div className="mt-3 flex gap-2">
              <input
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=> e.key==='Enter' && input.trim() && nextTurn(input)}
                placeholder={phase==='gather' ? "Type your answer or initial problem…" : "Respond here (e.g., 'yes' to confirm)"}
                className="flex-1 border rounded-lg px-3 py-2"
              />
              <button onClick={()=> input.trim() && nextTurn(input)} className="px-4 py-2 rounded-lg bg-black text-white">Send</button>
            </div>
          </div>
        </div>

        {/* Right: Gold Prompt (fixed height, scroll inside) */}
        <div className="md:col-span-1">
          <div className="bg-white border rounded-xl p-3 h-[75vh] overflow-y-auto">
            <h2 className="font-medium mb-2">Gold Prompt</h2>
            {phase === 'final' ? (
              <>
                <pre className="text-sm whitespace-pre-wrap">{gold}</pre>
                {verify?.length>0 && (
                  <>
                    <h3 className="font-medium mt-3">Verify before using:</h3>
                    <ul className="list-disc list-inside text-sm">
                      {verify.map((v,i)=><li key={i}>{v}</li>)}
                    </ul>
                  </>
                )}
                <button onClick={copyGold} className="mt-3 px-3 py-1.5 border rounded-md text-sm">Copy prompt</button>
              </>
            ) : (
              <div className="text-sm text-gray-500">Answer Ms LegalEase’s questions. When complete, confirm and your Gold Prompt will appear here.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
