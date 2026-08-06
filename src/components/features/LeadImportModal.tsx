'use client';

import * as React from 'react';
import { FileSpreadsheet, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api-client';

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LeadImportModal({ isOpen, onClose, onSuccess }: LeadImportModalProps) {
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportFile = async (file: File) => {
    setImporting(true);
    setResult(null);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      const HEADER_MAP: Record<string, string> = {
        'name': 'name', 'full name': 'name', 'client name': 'name', 
        'phone': 'phone', 'phone number': 'phone', 'contact': 'phone',
        'email': 'email', 'company': 'company', 'source': 'source',
      };

      let success = 0; const errors: string[] = [];
      for (const row of rows) {
        const leadData: any = { customFields: {} };
        const usedKeys = new Set<string>();

        Object.keys(row).forEach(key => {
          const lowerKey = key.toLowerCase().trim();
          const mappedField = HEADER_MAP[lowerKey];
          if (mappedField) {
            leadData[mappedField] = row[key]?.toString().trim();
            usedKeys.add(key);
          } else {
            leadData.customFields[key] = row[key];
          }
        });

        if (!leadData.name || !leadData.phone) {
          errors.push(`Row skipped: Missing Name or Phone`);
          continue;
        }

        try {
          await api.post('/leads', { ...leadData, status: 'new' });
          success++;
        } catch (e: any) {
          errors.push(`"${leadData.name}": ${e.message}`);
        }
      }
      setResult({ success, failed: errors.length, errors: errors.slice(0, 10) });
      if (success > 0) onSuccess();
    } catch (err) {
      setResult({ success: 0, failed: 1, errors: ['Invalid file format.'] });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Leads"
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          {result ? 'Close' : 'Cancel'}
        </Button>
      }
    >
      <div className="space-y-6">
        {!result ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleImportFile(f); }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-card p-12 text-center transition-all cursor-pointer",
              dragOver ? "border-brand-500 bg-brand-50" : "border-gray-100 bg-gray-50/50 hover:bg-gray-50"
            )}
          >
            {importing ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin" />
                <p className="text-sm font-bold text-gray-600 uppercase tracking-widest">Processing Leads...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-card text-gray-300">
                  <Upload size={32} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">Drop your file here</p>
                  <p className="text-sm text-gray-500 font-medium">Excel (.xlsx) or CSV format</p>
                </div>
              </div>
            )}
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-success-50 rounded-card border border-success-100 text-center">
                <CheckCircle className="mx-auto text-success-600 mb-2" size={24} />
                <span className="text-3xl font-black text-success-600">{result.success}</span>
                <p className="text-xs font-bold text-success-600 uppercase tracking-widest">Imported</p>
              </div>
              <div className="p-6 bg-danger-50 rounded-card border border-danger-100 text-center">
                <AlertCircle className="mx-auto text-danger-600 mb-2" size={24} />
                <span className="text-3xl font-black text-danger-600">{result.failed}</span>
                <p className="text-xs font-bold text-danger-600 uppercase tracking-widest">Failed</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg text-[11px] font-medium text-gray-500 max-h-40 overflow-y-auto">
                <p className="font-bold text-gray-700 mb-2 uppercase tracking-widest">Recent Errors:</p>
                {result.errors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}
            <Button variant="ghost" className="w-full" onClick={() => setResult(null)}>
              Upload another file
            </Button>
          </div>
        )}
        
        <div className="bg-gray-50/50 rounded-card p-6 border border-gray-100 space-y-3">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Required Columns:</p>
          <div className="flex gap-2 flex-wrap text-[10px] font-mono">
            <span className="px-2 py-1 bg-brand-50 border border-brand-100 text-brand-600 rounded font-bold">Name*</span>
            <span className="px-2 py-1 bg-brand-50 border border-brand-100 text-brand-600 rounded font-bold">Phone*</span>
            <span className="px-2 py-1 bg-white border border-gray-100 text-gray-400 rounded">Email</span>
            <span className="px-2 py-1 bg-white border border-gray-100 text-gray-400 rounded">Company</span>
          </div>
          <div className="pt-2 border-t border-gray-100 text-[11px] text-indigo-600 font-medium flex items-center gap-1.5">
            <span>⚡</span>
            <span><strong>Smart Lead Routing Active:</strong> Imported leads will automatically be distributed across active sales agents based on your organization settings.</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Helper to avoid import error in this block
import { cn } from '@/lib/cn';
