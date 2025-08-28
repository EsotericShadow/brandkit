import React, { useEffect, useState } from 'react';
import type { BrandGuide, ConsistencyReport } from '../types';
import { rewriteText, checkConsistency, type RewriteOptions } from '../services/aiClient_vrf';
import Button from './common/Button_vrf';
import Spinner from './common/Spinner_vrf';
import Card from './common/Card_vrf';

interface VoiceRewriterProps {
    brandGuide: BrandGuide | null;
}

const ConsistencyReportCard: React.FC<{ report: ConsistencyReport }> = ({ report }) => {
    const scoreColor = report.score > 75 ? 'text-green-500' : report.score > 50 ? 'text-yellow-500' : 'text-red-500';
    return (
        <Card title="Consistency Analysis" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center justify-center text-center">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Alignment Score</p>
                    <p className={`text-6xl font-bold ${scoreColor}`}>{report.score}</p>
                </div>
                <div className="md:col-span-2 space-y-4">
                    <div>
                        <h4 className="font-semibold">Feedback</h4>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300">{report.feedback}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold">Suggestions</h4>
                        <ul className="list-disc list-inside text-sm text-neutral-600 dark:text-neutral-300 space-y-1">
                            {report.suggestions.map((suggestion, i) => <li key={i}>{suggestion}</li>)}
                        </ul>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const VoiceRewriter: React.FC<VoiceRewriterProps> = ({ brandGuide }) => {
    const [inputText, setInputText] = useState('');
    const [rewrittenText, setRewrittenText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [report, setReport] = useState<ConsistencyReport | null>(null);
    const [serverOk, setServerOk] = useState<boolean | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Editable voice controls
    const [showVoiceEditor, setShowVoiceEditor] = useState(false);
    const [traitsInput, setTraitsInput] = useState<string>(brandGuide?.tone?.traits?.join(', ') || '');
    const [descInput, setDescInput] = useState<string>(brandGuide?.tone?.description || '');
    const [dosInput, setDosInput] = useState<string>((brandGuide?.tone?.dosAndDonts?.dos || []).join('\n'));
    const [dontsInput, setDontsInput] = useState<string>((brandGuide?.tone?.dosAndDonts?.donts || []).join('\n'));
    const [aggressiveness, setAggressiveness] = useState<number>(2); // 1..5
    const [keepLength, setKeepLength] = useState<boolean>(true);
    const [preserveStructure, setPreserveStructure] = useState<boolean>(true);

    useEffect(() => {
        // Lightweight health check; skip during tests (jsdom) to avoid network noise
        const VITE: any = (import.meta as any).env || {};
        const base = (VITE.VITE_API_BASE || '').toString().replace(/\/$/, '');
        const url = `${base}/api/health`;
        let cancelled = false;
        if (typeof window !== 'undefined' && !(window as any).vi) {
            fetch(url).then(r => r.ok ? r.json() : Promise.reject(new Error('bad status')))
                .then(() => { if (!cancelled) setServerOk(true); })
                .catch(() => { if (!cancelled) setServerOk(false); });
        }
        return () => { cancelled = true; };
    }, []);

    const buildEffectiveGuide = (): BrandGuide => {
        if (!brandGuide) throw new Error('No brand guide');
        const baseTone: any = brandGuide.tone || {};
        const baseDos: string[] = baseTone.dosAndDonts?.dos || [];
        const baseDonts: string[] = baseTone.dosAndDonts?.donts || [];
        const baseTraits: string[] = baseTone.traits || [];
        const baseDesc: string = baseTone.description || '';

        const traits = traitsInput.trim() ? traitsInput.split(',').map(s => s.trim()).filter(Boolean) : baseTraits;
        const desc = descInput.trim() ? descInput.trim() : baseDesc;
        const dos = dosInput.trim() ? dosInput.split('\n').map(s => s.trim()).filter(Boolean) : baseDos;
        const donts = dontsInput.trim() ? dontsInput.split('\n').map(s => s.trim()).filter(Boolean) : baseDonts;
        return {
            ...brandGuide,
            tone: { ...(brandGuide.tone || {}), traits, description: desc, dosAndDonts: { dos, donts } },
        } as BrandGuide;
    };

    const buildOptions = (): RewriteOptions => ({ aggressiveness, keepLength, preserveStructure });

    const handleRewrite = async () => {
        if (!brandGuide || !inputText) return;
        setIsLoading(true);
        setRewrittenText('');
        setReport(null);
        setErrorMsg(null);
        try {
            const result = await rewriteText(inputText, buildEffectiveGuide(), buildOptions());
            setRewrittenText(result);
        } catch (error: any) {
            console.error(error);
            setErrorMsg(typeof error?.message === 'string' ? error.message : 'Failed to contact AI server');
            setRewrittenText("Sorry, an error occurred while rewriting your text.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!brandGuide || !inputText) return;
        setIsAnalyzing(true);
        setReport(null);
        setErrorMsg(null);
        try {
            const analysisResult = await checkConsistency(inputText, buildEffectiveGuide());
            setReport(analysisResult);
        } catch (error: any) {
            console.error(error);
            setErrorMsg(typeof error?.message === 'string' ? error.message : 'Failed to contact AI server');
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    if (!brandGuide) {
        return (
             <div className="text-center max-w-lg mx-auto">
                 <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="mt-4 text-2xl font-bold">Generate a Brand Guide First</h2>
                <p className="text-neutral-500 dark:text-neutral-400 mt-2">
                    You need to generate a brand guide before you can use the voice rewriter. Go to the "Guide Generator" to get started.
                </p>
            </div>
        )
    }

    const effectiveGuide = buildEffectiveGuide();

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-4xl font-extrabold text-neutral-900 dark:text-white mb-2">Voice Rewriter for <span className="text-neutral-700 dark:text-neutral-300">{brandGuide.brandName}</span></h1>
            <div className="flex items-center justify-between mb-2">
              <p className="text-lg text-neutral-500 dark:text-neutral-400">
                Paste your copy to analyze its consistency or have the AI rewrite it to perfectly match your brand's voice.
              </p>
              {serverOk !== null && (
                <span className={`inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full border ${serverOk ? 'border-green-300 text-green-700 dark:border-green-800 dark:text-green-300' : 'border-red-300 text-red-700 dark:border-red-800 dark:text-red-300'}`}>
                  <span className={`w-2 h-2 rounded-full ${serverOk ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  {serverOk ? 'AI server connected' : 'AI server offline'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="min-w-0">
                                <label htmlFor="inputText" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">Your Text</label>
                                <textarea
                                    id="inputText"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    rows={12}
                                    placeholder="Enter the text you want to rewrite..."
                                    className="w-full max-w-full p-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500 transition resize-y mb-8"
                                />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Rewritten Text</label>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => { if (rewrittenText) navigator.clipboard.writeText(rewrittenText); }}
                                      disabled={!rewrittenText}
                                    >Copy</Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => { if (rewrittenText) setInputText(rewrittenText); }}
                                      disabled={!rewrittenText}
                                    >Use as input</Button>
                                  </div>
                                </div>
                                <div className="w-full p-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md relative overflow-auto min-h-[280px] max-h-[60vh] mb-10">
                                    {isLoading ? (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-neutral-900/50 pointer-events-none">
                                            <Spinner />
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap break-words text-neutral-800 dark:text-neutral-200">{rewrittenText || <span className="text-neutral-500">Your rewritten text will appear here...</span>}</p>
                                    )}
                                </div>
                                {errorMsg && (
                                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2 flex-wrap">
                            <Button onClick={handleAnalyze} disabled={isAnalyzing || !inputText} variant="secondary">
                                {isAnalyzing ? 'Analyzing...' : 'Analyze Consistency'}
                            </Button>
                            <Button onClick={handleRewrite} disabled={isLoading || !inputText}>
                                {isLoading ? 'Rewriting...' : 'Rewrite Text'}
                            </Button>
                        </div>
                    </Card>
                    {isAnalyzing && <div className="flex justify-center"><Spinner /></div>}
                    {report && <ConsistencyReportCard report={report} />}
                </div>
                <div className="lg:col-span-1 space-y-6">
                    {!showVoiceEditor && (
                      <Card title="Active Brand Voice" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>}>
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm text-neutral-600 dark:text-neutral-300">The AI will use these traits to rewrite your text:</p>
                          <Button variant="ghost" size="sm" onClick={()=>setShowVoiceEditor(true)}>Edit</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(effectiveGuide.tone.traits || []).map(trait => (
                            <span key={trait} className="px-2.5 py-1 bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-full dark:bg-neutral-800 dark:text-neutral-200">
                              {trait}
                            </span>
                          ))}
                        </div>
                      </Card>
                    )}
                    {showVoiceEditor && (
                      <Card title="Edit Voice & Controls">
                        <div className="flex justify-end mb-2">
                          <Button variant="secondary" size="sm" onClick={()=>setShowVoiceEditor(false)}>Done</Button>
                        </div>
                        <div className="space-y-3">
                          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300">Tone traits (comma-separated)</label>
                          <input value={traitsInput} onChange={e=>setTraitsInput(e.target.value)} className="w-full p-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm" placeholder="e.g., Friendly, Professional, Bold" />
                          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300">Tone description</label>
                          <textarea value={descInput} onChange={e=>setDescInput(e.target.value)} rows={3} className="w-full p-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm" />
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300">Dos (one per line)</label>
                              <textarea value={dosInput} onChange={e=>setDosInput(e.target.value)} rows={4} className="w-full p-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300">Don'ts (one per line)</label>
                              <textarea value={dontsInput} onChange={e=>setDontsInput(e.target.value)} rows={4} className="w-full p-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300">Rewrite aggressiveness</label>
                            <span className="text-xs text-neutral-500">{aggressiveness}</span>
                          </div>
                          <input type="range" min={1} max={5} step={1} value={aggressiveness} onChange={e=>setAggressiveness(parseInt(e.target.value))} className="w-full" />
                          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={keepLength} onChange={e=>setKeepLength(e.target.checked)} />Keep similar length</label>
                          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={preserveStructure} onChange={e=>setPreserveStructure(e.target.checked)} />Preserve structure (lists, headings)</label>
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={()=>{ setTraitsInput(brandGuide.tone.traits.join(', ')); setDescInput(brandGuide.tone.description); setDosInput(brandGuide.tone.dosAndDonts.dos.join('\n')); setDontsInput(brandGuide.tone.dosAndDonts.donts.join('\n')); }}>Reset to guide</Button>
                            <Button variant="primary" size="sm" onClick={handleRewrite} disabled={!inputText || isLoading}>Apply and Rewrite</Button>
                          </div>
                        </div>
                      </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VoiceRewriter;

