import React, { useState, useRef } from 'react';
import { Paperclip, Image as ImageIcon, Plus, X, Eye, Upload, FileText, Download } from 'lucide-react';
import { FileAttachment } from '../../types';

interface RowAttachmentsCellProps {
  id: string;
  attachments?: FileAttachment[];
  fallbackScreenshotName?: string;
  fallbackScreenshotUrl?: string;
  onAddAttachment: (attachment: { name: string; url: string; size?: string }) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  readOnly?: boolean;
}

export const RowAttachmentsCell: React.FC<RowAttachmentsCellProps> = ({
  id,
  attachments = [],
  fallbackScreenshotName,
  fallbackScreenshotUrl,
  onAddAttachment,
  onRemoveAttachment,
  readOnly = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [previewItem, setPreviewItem] = useState<FileAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize list with fallback if attachments is empty but legacy name exists
  const effectiveAttachments: FileAttachment[] =
    attachments.length > 0
      ? attachments
      : fallbackScreenshotName
      ? [
          {
            id: 'legacy-1',
            name: fallbackScreenshotName,
            url: fallbackScreenshotUrl || '',
          },
        ]
      : [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = (event.target?.result as string) || '';
        onAddAttachment({
          name: file.name,
          url,
          size: `${Math.round(file.size / 1024)} KB`,
        });
      };
      reader.readAsDataURL(file);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const url = (event.target?.result as string) || '';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            onAddAttachment({
              name: `pasted_ss_${timestamp}.png`,
              url,
              size: `${Math.round(blob.size / 1024)} KB`,
            });
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  return (
    <div id={id} className="relative p-1" onPaste={handlePaste} tabIndex={0}>
      {/* Hidden file input for multi-file attachments */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Row-wise compact attachments list */}
      <div className="flex flex-wrap items-center gap-1 min-h-[28px]">
        {effectiveAttachments.map((att) => (
          <div
            key={att.id}
            className="group/pill inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-900 rounded text-[10px] max-w-[150px] truncate"
            title={att.name}
          >
            {att.url && att.url.startsWith('data:image') ? (
              <img
                src={att.url}
                alt="thumb"
                className="w-3.5 h-3.5 rounded object-cover shrink-0 cursor-pointer"
                onClick={() => {
                  setPreviewItem(att);
                  setIsModalOpen(true);
                }}
              />
            ) : (
              <Paperclip className="w-3 h-3 text-blue-600 shrink-0" />
            )}
            <span
              onClick={() => {
                setPreviewItem(att);
                setIsModalOpen(true);
              }}
              className="truncate cursor-pointer hover:underline font-medium"
            >
              {att.name}
            </span>

            {!readOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveAttachment(att.id);
                }}
                className="text-slate-400 hover:text-red-600 opacity-60 hover:opacity-100 p-0.5 cursor-pointer ml-0.5"
                title="Remove attachment"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        ))}

        {/* Add / Attach Button */}
        {!readOnly && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file or screenshot (or paste with Ctrl+V)"
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-dashed border-slate-300 text-[10px] font-medium cursor-pointer transition-colors"
          >
            <Plus className="w-2.5 h-2.5" />
            <span>Attach</span>
          </button>
        )}
      </div>

      {/* Attachment Preview Modal */}
      {isModalOpen && previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Paperclip className="w-4 h-4 text-blue-400" />
                <span>{previewItem.name}</span>
                {previewItem.size && (
                  <span className="text-[10px] text-slate-400">({previewItem.size})</span>
                )}
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setPreviewItem(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-50 min-h-[250px]">
              {previewItem.url && previewItem.url.startsWith('data:image') ? (
                <img
                  src={previewItem.url}
                  alt={previewItem.name}
                  className="max-h-[60vh] max-w-full rounded border border-slate-200 object-contain shadow-xs"
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                  <div className="text-xs font-semibold text-slate-700">{previewItem.name}</div>
                  <div className="text-[11px] text-slate-500">
                    File attachment attached to this test record.
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500 text-[11px]">
                Tip: You can attach multiple images or documents per row.
              </span>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setPreviewItem(null);
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
