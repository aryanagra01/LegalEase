export default function Checklist({ statusMap={} }){
  const entries = Object.entries(statusMap);
  return (
    <div className="bg-white border rounded-xl p-3 h-[75vh] overflow-y-auto">
      <h2 className="font-medium mb-2">Checklist</h2>
      <ul className="space-y-1">
        {entries.map(([k, done]) => (
          <li key={k} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!done} readOnly className="h-4 w-4 accent-black"/>
            <span className={done ? '' : 'text-gray-500'}>{k}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
