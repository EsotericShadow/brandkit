import React from 'react';

// Simple mini-terminal that connects to the backend WebSocket and streams the multi-agent conversation
// Assumptions: backend at API_BASE (via Vite env VITE_API_BASE). WS URL derived by replacing http(s) with ws(s).
// Usage: <OrchestrationTerminal inputs={inputs} onFinal={(guide)=>{...}} />

interface Props {
  inputs?: any; // optional; if not provided, expects orchestration:start event to provide inputs
  onFinal?: (guide: any) => void;
}

type Line = { ts: number; text: string; kind?: string };

type Pos = { x: number; y: number };

type Size = { w: number; h: number };

function wsUrlFromApiBase(apiBase: string): string {
  const url = apiBase || window.location.origin;
  const u = new URL(url);
  const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${u.host}/api/orchestrate`;
}

const ROLE_LABEL: Record<string,string> = { ORCH: 'Orchestrator', BG: 'Branding Guru', ME: 'Marketing Expert', CC: 'Chief Copywriter', JSON: 'JSON Agent', USER: 'You' };
const ROLE_COLOR: Record<string,string> = { ORCH: 'text-cyan-300', BG: 'text-fuchsia-300', ME: 'text-amber-300', CC: 'text-blue-300', JSON: 'text-teal-300', USER: 'text-emerald-300' };
const ROLE_EMOJI: Record<string,string> = { ORCH: '🧭', BG: '🎨', ME: '📈', CC: '✍️', JSON: '🧩', USER: '🗣️' };

const OrchestrationTerminal: React.FC<Props> = ({ inputs, onFinal }) => {
  const [lines, setLines] = React.useState<Line[]>([]);
  const [viewMode, setViewMode] = React.useState<'chat' | 'raw'>('chat');
  const [running, setRunning] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [typing, setTyping] = React.useState<Record<string, boolean>>({});
  const [pos, setPos] = React.useState<Pos>({ x: 24, y: 24 });
  const [size, setSize] = React.useState<Size>({ w: 520, h: 320 });
  const draggingRef = React.useRef<{ start: Pos; nodeStart: Pos } | null>(null);
  const resizingRef = React.useRef<{ start: Pos; nodeStart: Size } | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const VITE = (import.meta as any).env || {};
  const API_BASE: string = (VITE.VITE_API_BASE || window.location.origin).toString().replace(/\/$/, '');
  const WS_URL = wsUrlFromApiBase(API_BASE);

  const [draft, setDraft] = React.useState('');

  function append(text: string, kind?: string) {
    setLines(prev => [...prev, { ts: Date.now(), text, kind }]);
  }

  const start = React.useCallback((payloadInputs?: any) => {
    if (running) return;
    const useInputs = payloadInputs ?? inputs;
    if (!useInputs) return;
    setRunning(true);
    setVisible(true);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      append(`connected → ${WS_URL}`, 'meta');
      ws.send(JSON.stringify({ inputs: useInputs }));
      append('submitted request payload', 'meta');
    };
    function formatJsonForChat(role: string, payload: any): string[] {
      try {
        // Try to turn structured JSON into conversational lines
        if (!payload || typeof payload !== 'object') return [String(payload ?? '')];
        const lines: string[] = [];
        const r = role.toUpperCase();
        const isBG = r === 'BG';
        const isME = r === 'ME';
        const isCC = r === 'CC';

        // Analysis shapes
        if (payload.notes || payload.questions || payload.answers || payload.risks || payload.consensus || payload.gaps) {
          if (payload.notes) lines.push(String(payload.notes));
          if (Array.isArray(payload.questions) && payload.questions.length) {
            payload.questions.forEach((q: string, i: number) => lines.push(`Q${i + 1}: ${q}`));
          }
          if (Array.isArray(payload.answers) && payload.answers.length) {
            payload.answers.forEach((a: string, i: number) => lines.push(`A${i + 1}: ${a}`));
          }
          if (Array.isArray(payload.risks) && payload.risks.length) {
            lines.push('Risks:');
            payload.risks.forEach((x: string) => lines.push(`- ${x}`));
          }
          if (Array.isArray(payload.consensus) && payload.consensus.length) {
            lines.push('Consensus:');
            payload.consensus.forEach((x: string) => lines.push(`- ${x}`));
          }
          if (Array.isArray(payload.gaps) && payload.gaps.length) {
            lines.push('Gaps:');
            payload.gaps.forEach((x: string) => lines.push(`- ${x}`));
          }
          return lines.length ? lines : [JSON.stringify(payload, null, 2)];
        }

        // Deliverable shapes
        if (isBG && payload.tone) {
          const t = payload.tone;
          if (Array.isArray(t.traits)) lines.push(`Tone traits: ${t.traits.join(', ')}`);
          if (t.description) lines.push(`Tone: ${t.description}`);
          if (t.dosAndDonts) {
            const d = t.dosAndDonts;
            if (Array.isArray(d.dos) && d.dos.length) {
              lines.push('Dos:'); d.dos.forEach((x: string) => lines.push(`- ${x}`));
            }
            if (Array.isArray(d.donts) && d.donts.length) {
              lines.push("Don'ts:"); d.donts.forEach((x: string) => lines.push(`- ${x}`));
            }
          }
          return lines.length ? lines : [JSON.stringify(payload, null, 2)];
        }
        if (isME && (payload.audience || payload.pitchNotes)) {
          if (payload.audience) lines.push(`Audience: ${payload.audience}`);
          if (payload.pitchNotes) lines.push(`Pitch notes: ${payload.pitchNotes}`);
          return lines.length ? lines : [JSON.stringify(payload, null, 2)];
        }
        if (isCC && (payload.mission || payload.elevatorPitch || payload.taglines)) {
          if (payload.mission) lines.push(`Mission: ${payload.mission}`);
          if (payload.elevatorPitch) lines.push(`Elevator: ${payload.elevatorPitch}`);
          if (Array.isArray(payload.taglines) && payload.taglines.length) {
            lines.push('Taglines:');
            payload.taglines.forEach((t: any) => {
              if (t && t.tagline) lines.push(`• ${t.tagline}${t.rationale ? ` — ${t.rationale}` : ''}`);
            });
          }
          return lines.length ? lines : [JSON.stringify(payload, null, 2)];
        }

        // Final guide
        if (payload.brandName && payload.tone && payload.taglines) {
          const out: string[] = [];
          out.push(`Guide ready for ${payload.brandName} (${payload.industry})`);
          if (payload.mission) out.push(`Mission: ${payload.mission}`);
          if (payload.elevatorPitch) out.push(`Elevator: ${payload.elevatorPitch}`);
          if (payload.audience) out.push(`Audience: ${payload.audience}`);
          if (payload.tone?.description) out.push(`Tone: ${payload.tone.description}`);
          if (Array.isArray(payload.taglines) && payload.taglines.length) {
            out.push('Taglines:');
            payload.taglines.forEach((t: any) => { if (t?.tagline) out.push(`• ${t.tagline}`); });
          }
          return out;
        }

        // Fallback
        return [JSON.stringify(payload, null, 2)];
      } catch {
        return [String(payload ?? '')];
      }
    }

    ws.onmessage = (ev) => {
      try {
        const obj = JSON.parse(ev.data);
        if (obj.type === 'typing') {
          const role = obj.role as string;
          const isOn = obj.state === 'start';
          setTyping(prev => ({ ...prev, [role]: isOn }));
        } else if (obj.type === 'final') {
          if (viewMode === 'chat') {
            const lines = formatJsonForChat('ORCH', obj.data);
            append(`[${ROLE_LABEL.ORCH}]`, 'header');
            lines.forEach(line => append(line, 'ORCH'));
          }
          append('FINAL GUIDE RECEIVED', 'final');
          window.dispatchEvent(new CustomEvent('orchestration:final', { detail: obj.data }));
          if (onFinal) onFinal(obj.data);
          setTyping({});
          // Keep the chatroom visible to allow post-run JSON summary to appear; user can close manually.
        } else if (obj.type === 'error') {
          append(`ERROR: ${obj.message}`, 'error');
        } else if (obj.type === 'deliverable' || obj.type === 'analysis' || obj.type === 'assemble') {
          const isPrompt = obj.kind === 'prompt';
          const role = obj.role || obj.phase || 'ORCH';
          if (viewMode === 'raw') {
            const label = obj.type.toUpperCase();
            const dataStr = typeof obj.data === 'string' ? obj.data : JSON.stringify(obj.data, null, 2);
            const name = ROLE_LABEL[role] || role;
            append(`[${label}] ${name}`, 'header');
            // In raw mode, include prompts and JSON
            append(dataStr, role);
          } else {
            // Chat mode: suppress prompts; render outputs as conversational lines
            if (!isPrompt) {
              const payload = obj.data;
              const lines = formatJsonForChat(role, payload);
              const name = ROLE_LABEL[role] || role;
              append(`[${name}]`, 'header');
              lines.forEach(line => append(line, role));
            }
          }
        } else if (obj.type === 'retry') {
          const attempt = obj.data?.attempt ?? '?';
          const model = obj.data?.model ?? '?';
          const name = ROLE_LABEL[obj.role] || obj.role || 'Agent';
          append(`[RETRY] ${name} attempt ${attempt} (model: ${model})`, 'header');
          if (obj.data?.error) append(obj.data.error, obj.role || 'ORCH');
        } else if (obj.type === 'user') {
          const msg = typeof obj.data === 'string' ? obj.data : (obj.data?.message ?? JSON.stringify(obj.data, null, 2));
          // Render user line (echo from server)
          append(String(msg), 'USER');
        } else {
          append(ev.data);
        }
      } catch {
        append(ev.data);
      }
    };
    ws.onclose = () => { append('connection closed', 'meta'); setRunning(false); setTyping({}); /* keep visible for review */ };
    ws.onerror = () => { append('connection error', 'error'); };
  }, [WS_URL, running, inputs, onFinal]);

  const stop = React.useCallback(() => {
    wsRef.current?.close();
  }, []);

  React.useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [lines.length]);

  // Auto-listen for orchestration:start events
  React.useEffect(() => {
    const handler = (e: any) => {
      const detail = e?.detail || {};
      start(detail.inputs);
      // Reset position on start for convenience
      setPos({ x: 24, y: 24 });
      setSize(s => ({ ...s }));
    };
    window.addEventListener('orchestration:start' as any, handler as any);
    return () => window.removeEventListener('orchestration:start' as any, handler as any);
  }, [start]);

  // Drag handlers (header)
  const onHeaderPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    draggingRef.current = { start: { x: e.clientX, y: e.clientY }, nodeStart: { ...pos } };
  };
  const onHeaderPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - draggingRef.current.start.x;
    const dy = e.clientY - draggingRef.current.start.y;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const nx = Math.min(Math.max(8, draggingRef.current.nodeStart.x + dx), Math.max(8, vw - size.w - 8));
    const ny = Math.min(Math.max(8, draggingRef.current.nodeStart.y + dy), Math.max(8, vh - size.h - 8));
    setPos({ x: nx, y: ny });
  };
  const onHeaderPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // Resize handlers (bottom-right handle)
  const onResizePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    resizingRef.current = { start: { x: e.clientX, y: e.clientY }, nodeStart: { ...size } };
  };
  const onResizePointerMove = (e: React.PointerEvent) => {
    if (!resizingRef.current) return;
    const dx = e.clientX - resizingRef.current.start.x;
    const dy = e.clientY - resizingRef.current.start.y;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxW = Math.max(360, vw - pos.x - 8);
    const maxH = Math.max(220, vh - pos.y - 8);
    const nw = Math.min(Math.max(360, resizingRef.current.nodeStart.w + dx), maxW);
    const nh = Math.min(Math.max(220, resizingRef.current.nodeStart.h + dy), maxH);
    setSize({ w: nw, h: nh });
  };
  const onResizePointerUp = (e: React.PointerEvent) => {
    resizingRef.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const sendDraft = () => {
    const msg = draft.trim();
    if (!msg) return;
    wsRef.current?.send(JSON.stringify({ type: 'user', message: msg }));
    // Also show locally for immediate feedback
    append(msg, 'USER');
    setDraft('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendDraft();
    }
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setVisible(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`${visible ? 'fixed z-50' : 'hidden'}`} style={{ left: pos.x, top: pos.y }}>
      <div className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-black text-green-200 text-sm font-mono shadow-xl"
           style={{ width: size.w, height: size.h }}>
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-neutral-700 text-neutral-300 select-none"
        >
          <div
            className="flex items-center gap-2 cursor-move"
            onPointerDown={onHeaderPointerDown}
            onPointerMove={onHeaderPointerMove}
            onPointerUp={onHeaderPointerUp}
            title="Drag"
          >
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-600/30">{ROLE_EMOJI.ORCH}</span>
            <div>Team Orchestration — Live</div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <label className="opacity-80">View:</label>
              <button
                className={`px-2 py-0.5 rounded ${viewMode==='chat'?'bg-neutral-700':'bg-neutral-800 hover:bg-neutral-700'}`}
                onClick={() => setViewMode('chat')}
                title="Render as conversation"
              >Chat</button>
              <button
                className={`px-2 py-0.5 rounded ${viewMode==='raw'?'bg-neutral-700':'bg-neutral-800 hover:bg-neutral-700'}`}
                onClick={() => setViewMode('raw')}
                title="Show raw prompts and JSON"
              >Raw</button>
            </div>
            <div className="h-4 w-px bg-neutral-700" />
            <div className="flex items-center gap-1">
              <button
                className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700"
                onClick={() => { wsRef.current && stop(); }}
                title="Stop streaming"
              >Stop</button>
              <button
                className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700"
                onClick={() => setLines([])}
                title="Clear log"
              >Clear</button>
              <button
                className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700"
                onClick={() => setVisible(false)}
                title="Close"
              >Close</button>
            </div>
            {Object.entries(typing).filter(([,v])=>v).map(([role]) => (
              <span key={role} className={`${ROLE_COLOR[role] || 'text-green-200'}`}>{(ROLE_LABEL[role] || role)} is typing…</span>
            ))}
          </div>
        </div>
        <div ref={scrollerRef} className="overflow-auto p-3 whitespace-pre-wrap leading-5" style={{ height: size.h - 92 }}>
          {lines.map((l, i) => {
            const roleColor = l.kind && ROLE_COLOR[l.kind] ? ROLE_COLOR[l.kind] : '';
            const isHeader = l.kind === 'header';
            const isFinal = l.kind === 'final';
            const isError = l.kind === 'error';
            const baseColor = isError ? 'text-red-400' : isFinal ? 'text-yellow-300' : isHeader ? 'text-cyan-300' : (roleColor || 'text-green-200');
            const showAvatar = !!(l.kind && (ROLE_LABEL[l.kind] || ['USER'].includes(l.kind)));
            const avatarEmoji = l.kind && ROLE_EMOJI[l.kind] ? ROLE_EMOJI[l.kind] : '💬';
            const name = l.kind && ROLE_LABEL[l.kind] ? ROLE_LABEL[l.kind] : undefined;
            return (
              <div key={l.ts + '-' + i} className={`flex items-start gap-2 ${baseColor} mb-1`}>
                {showAvatar ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-neutral-700/60 shrink-0" title={name}>{avatarEmoji}</span>
                ) : (
                  <span className="w-5 h-5 shrink-0" />
                )}
                <div className="flex-1">
                  {isHeader && name ? <div className="text-cyan-300">[{l.text}]</div> : l.text}
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-3 py-2 border-t border-neutral-700 flex items-center gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 resize-none bg-neutral-900 text-green-200 placeholder:text-neutral-500 rounded p-2 outline-none border border-neutral-700 focus:border-neutral-500"
            placeholder="Type your note or correction… (Enter to send, Shift+Enter for newline)"
            rows={2}
          />
          <button
            className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50"
            onClick={sendDraft}
            disabled={!draft.trim()}
          >Send</button>
        </div>
        {/* Resize handle */}
        <div
          className="absolute right-0 bottom-0 w-4 h-4 cursor-se-resize text-neutral-500"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          title="Resize"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" className="opacity-70">
            <path d="M2 14h12v-2H4v-2H2v4zm0-6h10V6H6V4H2v4z" fill="currentColor"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default OrchestrationTerminal;
