'use client';

import * as React from 'react';
import {
  FileSpreadsheet, FileText, Upload, X, CheckCircle, AlertCircle,
  Download, UserCheck, Shuffle, Inbox, AlertTriangle, ChevronRight, RefreshCw
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AgentSelector } from '@/components/features/AgentSelector';
import { api } from '@/lib/api-client';
import { parseLeadFile, downloadSampleTemplate, ParsedLeadRow, ParseResult } from '@/lib/lead-file-parser';
import { IUser } from '@/models/User';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LeadImportModal({ isOpen, onClose, onSuccess }: LeadImportModalProps) {
  const { user } = useAuth();
  const canAssign = user?.role === 'org_admin' || user?.role === 'manager';

  const [step, setStep] = React.useState<'upload' | 'preview' | 'result'>('upload');
  const [parsing, setParsing] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [parsedData, setParsedData] = React.useState<ParseResult | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  // Configuration settings
  const [assignmentStrategy, setAssignmentStrategy] = React.useState<'auto_route' | 'assigned_agent' | 'unassigned'>('auto_route');
  const [selectedAgentId, setSelectedAgentId] = React.useState<string>('');
  const [skipDuplicates, setSkipDuplicates] = React.useState<boolean>(true);
  const [defaultSource, setDefaultSource] = React.useState<string>('File Import');

  // Org Agents
  const [orgAgents, setOrgAgents] = React.useState<IUser[]>([]);

  // Results
  const [importResult, setImportResult] = React.useState<{
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    errors: string[];
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load sales agents for assignment selector if admin/manager
  React.useEffect(() => {
    if (isOpen && canAssign) {
      api.get<{ users: IUser[] }>('/users?role=sales_agent,onsite_visitor')
        .then(d => setOrgAgents(d.users))
        .catch(console.error);
    }
  }, [isOpen, canAssign]);

  const resetState = () => {
    setStep('upload');
    setParsing(false);
    setImporting(false);
    setParsedData(null);
    setSelectedFile(null);
    setImportResult(null);
    setAssignmentStrategy('auto_route');
    setSelectedAgentId('');
    setSkipDuplicates(true);
    setDefaultSource('File Import');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setParsing(true);
    try {
      const res = await parseLeadFile(file);
      if (res.leads.length === 0) {
        alert('No valid lead records could be found in this file. Please ensure it contains Name, Place, Number, or Domain columns.');
        setParsing(false);
        return;
      }
      setParsedData(res);
      setStep('preview');
    } catch (err: any) {
      alert(err.message || 'Failed to read file.');
    } finally {
      setParsing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedData || parsedData.leads.length === 0) return;
    setImporting(true);

    try {
      const res = await api.post<{
        importedCount: number;
        skippedCount: number;
        failedCount: number;
        errors: string[];
      }>('/leads/import', {
        leads: parsedData.leads,
        assignmentStrategy: canAssign ? assignmentStrategy : 'unassigned',
        assignedAgentId: (canAssign && assignmentStrategy === 'assigned_agent') ? selectedAgentId : undefined,
        skipDuplicates,
        defaultSource: defaultSource.trim() || 'File Import',
      });

      setImportResult(res);
      setStep('result');
      if (res.importedCount > 0) {
        onSuccess();
      }
    } catch (err: any) {
      alert(err.message || 'Bulk import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Import Leads"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {step === 'preview' && (
              <Button variant="secondary" size="sm" onClick={() => setStep('upload')} disabled={importing}>
                Back to Upload
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step === 'upload' && (
              <Button variant="secondary" size="sm" onClick={handleClose}>
                Cancel
              </Button>
            )}

            {step === 'preview' && (
              <Button
                size="sm"
                isLoading={importing}
                disabled={canAssign && assignmentStrategy === 'assigned_agent' && !selectedAgentId}
                onClick={handleExecuteImport}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
              >
                Import {parsedData?.leads.length} Leads
              </Button>
            )}

            {step === 'result' && (
              <Button size="sm" onClick={handleClose} className="bg-brand-600 text-white font-bold">
                Done
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
          <span className={cn("flex items-center gap-2", step === 'upload' && "text-brand-600 font-extrabold")}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">1</span>
            Select File
          </span>
          <ChevronRight size={14} />
          <span className={cn("flex items-center gap-2", step === 'preview' && "text-brand-600 font-extrabold")}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">2</span>
            Preview & Options
          </span>
          <ChevronRight size={14} />
          <span className={cn("flex items-center gap-2", step === 'result' && "text-brand-600 font-extrabold")}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px]">3</span>
            Results
          </span>
        </div>

        {/* STEP 1: UPLOAD FILE */}
        {step === 'upload' && (
          <div className="space-y-4 animate-fade-in">
            {/* Supported Columns Banner */}
            <div className="bg-brand-50/70 px-3.5 py-2.5 rounded-xl border border-brand-100 text-xs font-semibold text-brand-900 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-brand-600 text-white font-extrabold rounded text-[10px] uppercase tracking-wider shrink-0">Supports</span>
              <span className="truncate">Auto-detects <strong>Name</strong>, <strong>Place</strong>, <strong>Number (Phone)</strong>, <strong>Domain</strong>, <strong>Company</strong>, <strong>Email</strong>, and custom fields.</span>
            </div>

            {/* File Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFileSelect(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-5 sm:p-6 text-center transition-all cursor-pointer",
                dragOver ? "border-brand-500 bg-brand-50/70" : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-brand-300"
              )}
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-2 py-3">
                  <RefreshCw className="w-7 h-7 text-brand-600 animate-spin" />
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Parsing Document...</p>
                  <p className="text-[11px] text-gray-400">Extracting lead rows (Name, Place, Number, Domain)</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs text-brand-600">
                    <Upload size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-gray-900">Drag & drop your file here</p>
                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">or click to browse Excel, Word, CSV, TXT, JSON, PDF</p>
                  </div>

                  {/* Format Badges */}
                  <div className="flex flex-wrap justify-center gap-1.5 pt-0.5">
                    {['Excel (.xlsx, .xls)', 'CSV / TSV', 'Word (.docx)', 'Text (.txt)', 'JSON', 'PDF'].map((fmt, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-600">
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.docx,.doc,.txt,.json,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
            </div>

            {/* Template Download Section */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-brand-100 text-brand-700 rounded-lg shrink-0">
                  <FileSpreadsheet size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-900 uppercase tracking-wider">Need a sample template?</p>
                  <p className="text-[10px] text-gray-500 font-medium">Download pre-formatted template with Name, Place, Number, and Domain columns.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <Button variant="secondary" size="sm" onClick={() => downloadSampleTemplate('xlsx')} className="text-[10px] h-7 px-2.5 flex items-center gap-1">
                  <Download size={12} /> Excel Template
                </Button>
                <Button variant="secondary" size="sm" onClick={() => downloadSampleTemplate('csv')} className="text-[10px] h-7 px-2.5 flex items-center gap-1">
                  <Download size={12} /> CSV Template
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & CONFIGURATION */}
        {step === 'preview' && parsedData && (
          <div className="space-y-3.5 animate-fade-in">
            {/* File Info Bar */}
            <div className="bg-brand-50/60 p-2.5 rounded-xl border border-brand-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="text-brand-600" size={18} />
                <div>
                  <p className="text-xs font-extrabold text-gray-900">{selectedFile?.name}</p>
                  <p className="text-[10px] text-brand-700 font-semibold">Format: {parsedData.fileType} • {parsedData.leads.length} Leads Detected</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')} className="text-[10px] h-6 px-2">
                Change File
              </Button>
            </div>

            {/* Preview Table */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                Data Preview (First {Math.min(5, parsedData.leads.length)} Rows)
              </p>
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-44">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-1.5">#</th>
                      <th className="p-1.5">Name</th>
                      <th className="p-1.5">Number (Phone)</th>
                      <th className="p-1.5">Place</th>
                      <th className="p-1.5">Domain / Company</th>
                      <th className="p-1.5">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
                    {parsedData.leads.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-1.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-1.5 font-bold text-gray-900">{row.name || '—'}</td>
                        <td className="p-1.5 font-mono">{row.phone || '—'}</td>
                        <td className="p-1.5">{row.region || row.address || '—'}</td>
                        <td className="p-1.5">{row.companyDomain || row.company || '—'}</td>
                        <td className="p-1.5"><span className="px-1 py-0.5 bg-slate-100 rounded text-[9px] font-semibold">{row.source || defaultSource}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Settings & Configuration Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Duplicate Strategy */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Duplicate Handling</p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Skip Duplicates</span>
                    <span className="text-[10px] text-gray-500 font-medium leading-tight block">
                      Skip leads matching existing Phone or Email.
                    </span>
                  </div>
                </label>
              </div>

              {/* Default Lead Source */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Default Lead Source</p>
                <input
                  type="text"
                  value={defaultSource}
                  onChange={(e) => setDefaultSource(e.target.value)}
                  placeholder="e.g. Website, File Import"
                  className="w-full h-7 px-2 rounded-lg border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Sales Team Assignment Strategy - Visible ONLY to Org Admins and Managers */}
            {canAssign && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Sales Agent Assignment Strategy</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignmentStrategy('auto_route')}
                    className={cn(
                      "p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all",
                      assignmentStrategy === 'auto_route'
                        ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-slate-50/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Shuffle className={cn("size-3", assignmentStrategy === 'auto_route' ? "text-brand-600" : "text-gray-400")} />
                      {assignmentStrategy === 'auto_route' && <CheckCircle className="size-3 text-brand-600" />}
                    </div>
                    <span className="text-xs font-bold text-gray-900">Smart Auto-Route</span>
                    <span className="text-[9px] text-gray-500 font-medium">Round-Robin assignment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignmentStrategy('assigned_agent')}
                    className={cn(
                      "p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all",
                      assignmentStrategy === 'assigned_agent'
                        ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-slate-50/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <UserCheck className={cn("size-3", assignmentStrategy === 'assigned_agent' ? "text-brand-600" : "text-gray-400")} />
                      {assignmentStrategy === 'assigned_agent' && <CheckCircle className="size-3 text-brand-600" />}
                    </div>
                    <span className="text-xs font-bold text-gray-900">Specific Agent</span>
                    <span className="text-[9px] text-gray-500 font-medium">Assign to one agent</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignmentStrategy('unassigned')}
                    className={cn(
                      "p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all",
                      assignmentStrategy === 'unassigned'
                        ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-slate-50/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Inbox className={cn("size-3", assignmentStrategy === 'unassigned' ? "text-brand-600" : "text-gray-400")} />
                      {assignmentStrategy === 'unassigned' && <CheckCircle className="size-3 text-brand-600" />}
                    </div>
                    <span className="text-xs font-bold text-gray-900">Unassigned</span>
                    <span className="text-[9px] text-gray-500 font-medium">Unassigned lead pool</span>
                  </button>
                </div>

                {assignmentStrategy === 'assigned_agent' && (
                  <div className="pt-0.5">
                    <p className="text-[11px] font-bold text-gray-700 mb-1">Select Sales Agent</p>
                    <AgentSelector
                      agents={orgAgents}
                      selectedId={selectedAgentId}
                      onSelect={setSelectedAgentId}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: RESULT SUMMARY */}
        {step === 'result' && importResult && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                <CheckCircle className="mx-auto text-emerald-600 mb-0.5" size={20} />
                <span className="text-xl font-black text-emerald-600">{importResult.importedCount}</span>
                <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Leads Imported</p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
                <AlertTriangle className="mx-auto text-amber-600 mb-0.5" size={20} />
                <span className="text-xl font-black text-amber-600">{importResult.skippedCount}</span>
                <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">Duplicates Skipped</p>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-center">
                <AlertCircle className="mx-auto text-rose-600 mb-0.5" size={20} />
                <span className="text-xl font-black text-rose-600">{importResult.failedCount}</span>
                <p className="text-[9px] font-bold text-rose-700 uppercase tracking-wider">Errors</p>
              </div>
            </div>

            {/* Error List if any */}
            {importResult.errors.length > 0 && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Row Errors Log:</p>
                <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] font-mono text-slate-600">
                  {importResult.errors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-1 text-center">
              <Button variant="secondary" size="sm" onClick={() => setStep('upload')} className="text-xs flex items-center gap-1.5 mx-auto">
                <RefreshCw size={12} /> Upload Another File
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
