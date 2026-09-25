import React, { useState, useRef } from 'react';
import { Paperclip, Image as ImageIcon, Plus, X, Eye, Upload, FileText, Download, ClipboardPaste } from 'lucide-react';
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
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [previewItem, setPreviewItem] = useState<FileAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteCaptureRef = useRef<HTMLTextAreaElement>(null);

  // Focus capture input when paste modal opens
  React.useEffect(() => {
    if (isPasteModalOpen) {
      setTimeout(() => {
        pasteCaptureRef.current?.focus();
      }, 80);
    }
  }, [isPasteModalOpen]);

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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // 1. Check for files in clipboardData (e.g. copied from Windows Explorer / Mac Finder)
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      for (let i = 0; i < e.clipboardData.files.length; i++) {
        const file = e.clipboardData.files[i];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (event) => {
            const url = (event.target?.result as string) || '';
            const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
            onAddAttachment({
              name: file.name || `screenshot_${timestamp}.png`,
              url,
              size: `${Math.round(file.size / 1024)} KB`,
            });
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }

    // 2. Check items for image blobs (Snipping Tool, PrtScn, Ctrl+C image)
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const url = (event.target?.result as string) || '';
              const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
              onAddAttachment({
                name: `screenshot_${timestamp}.png`,
                url,
                size: `${Math.round(blob.size / 1024)} KB`,
              });
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
    }

    // 3. Check for text that might be base64 data URL or image link
    const text = e.clipboardData?.getData('text');
    if (text && (text.startsWith('data:image/') || /^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(text))) {
      e.preventDefault();
      const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
      onAddAttachment({
        name: `pasted_image_${timestamp}.png`,
        url: text,
        size: 'Pasted Link/Data',
      });
    }
  };

  const handleClipboardPasteButton = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        let foundImage = false;
        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              foundImage = true;
              const blob = await item.getType(type);
              const reader = new FileReader();
              reader.onload = (event) => {
                const url = (event.target?.result as string) || '';
                const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
                const newAtt: FileAttachment = {
                  id: `att-${Date.now()}`,
                  name: `screenshot_${timestamp}.png`,
                  url,
                  size: `${Math.round(blob.size / 1024)} KB`,
                };
                onAddAttachment(newAtt);
                setPreviewItem(newAtt);
                setIsModalOpen(true);
              };
              reader.readAsDataURL(blob);
              break;
            }
          }
          if (foundImage) break;
        }
        if (foundImage) return;

        if (navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text && (text.startsWith('data:image/') || /^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)/i.test(text))) {
            const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
            const newAtt: FileAttachment = {
              id: `att-${Date.now()}`,
              name: `pasted_image_${timestamp}.png`,
              url: text,
              size: 'Pasted Link',
            };
            onAddAttachment(newAtt);
            setPreviewItem(newAtt);
            setIsModalOpen(true);
            return;
          }
        }
      }
    } catch {
      // Browser permission blocked clipboard.read() in iframe.
    }
    // If not handled by navigator.clipboard.read, open the dedicated paste capture modal
    setIsPasteModalOpen(true);
  };

  return (
    <div
      id={id}
      className="relative p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded min-w-[140px]"
      onPaste={handlePaste}
      tabIndex={0}
      title="Click and press Ctrl+V to paste screenshot directly here"
    >
      {/* Hidden file input for multi-file attachments */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.xlsx,.csv,.docx,.pdf"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Attachments List with Visible Thumbnails & Clear Count */}
      <div className="flex flex-wrap items-center gap-1.5 min-h-[36px]">
        {effectiveAttachments.length > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-md shadow-2xs">
            <ImageIcon className="w-3 h-3" />
            <span>{effectiveAttachments.length} {effectiveAttachments.length === 1 ? 'file' : 'files'}</span>
          </span>
        )}
        {effectiveAttachments.map((att) => {
          const isImg = Boolean(att.url && att.url.startsWith('data:image'));
          return (
            <div
              key={att.id}
              className="group relative inline-flex items-center gap-1 p-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-md shadow-2xs transition-all"
              title={`${att.name} (Click to preview)`}
            >
              {isImg ? (
                <div
                  onClick={() => {
                    setPreviewItem(att);
                    setIsModalOpen(true);
                  }}
                  className="relative w-10 h-10 rounded border border-slate-200 overflow-hidden cursor-pointer shrink-0 bg-slate-100 group-hover:shadow-xs transition-shadow"
                >
                  <img
                    src={att.url}
                    alt={att.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Eye className="w-3.5 h-3.5 text-white drop-shadow" />
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setPreviewItem(att);
                    setIsModalOpen(true);
                  }}
                  className="w-10 h-10 rounded border border-slate-200 flex flex-col items-center justify-center bg-blue-50/70 text-blue-700 cursor-pointer shrink-0"
                >
                  <Paperclip className="w-4 h-4" />
                  <span className="text-[8px] font-bold uppercase truncate max-w-[36px]">
                    {att.name.split('.').pop() || 'FILE'}
                  </span>
                </div>
              )}

              <div className="flex flex-col max-w-[75px]">
                <span
                  onClick={() => {
                    setPreviewItem(att);
                    setIsModalOpen(true);
                  }}
                  className="text-[10px] font-semibold text-slate-800 hover:text-blue-600 truncate cursor-pointer"
                >
                  {att.name}
                </span>
                {att.size && <span className="text-[9px] text-slate-400 font-mono">{att.size}</span>}
              </div>

              {!readOnly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveAttachment(att.id);
                  }}
                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded p-0.5 cursor-pointer ml-0.5 transition-colors"
                  title="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Action Buttons: Preview, Paste SS (Ctrl+V) & Browse */}
        <div className="flex items-center gap-1">
          {effectiveAttachments.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewItem(effectiveAttachments[effectiveAttachments.length - 1]);
                setIsModalOpen(true);
              }}
              title="Preview attached screenshot"
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
            >
              <Eye className="w-3 h-3 text-blue-600" />
              <span>Preview{effectiveAttachments.length > 1 ? ` (${effectiveAttachments.length})` : ''}</span>
            </button>
          )}

          {!readOnly && (
            <>
              <button
                type="button"
                onClick={handleClipboardPasteButton}
                title="Paste screenshot from clipboard (or press Ctrl+V)"
                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded border border-purple-200 text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
              >
                <ClipboardPaste className="w-3 h-3 text-purple-600" />
                <span>Paste SS</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Browse file or screenshot"
                className="inline-flex items-center gap-0.5 px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 text-[10px] font-medium cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Attach</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Direct Paste Capture Modal for iframe safety */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                  <ClipboardPaste className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">Paste Evidence Screenshot</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="p-6 border-2 border-dashed border-purple-300 bg-purple-50/50 hover:bg-purple-50/80 rounded-xl text-center cursor-pointer transition-colors"
              onClick={() => pasteCaptureRef.current?.focus()}
            >
              <ClipboardPaste className="w-10 h-10 text-purple-600 mx-auto mb-2" />
              <div className="text-xs font-bold text-purple-950 mb-1">
                Press Ctrl+V anywhere now
              </div>
              <div className="text-[11px] text-purple-700 mb-3">
                Or Right Click → Paste below (Win+Shift+S / PrtScn / Copied file)
              </div>
              <textarea
                ref={pasteCaptureRef}
                rows={2}
                onPaste={(e) => {
                  handlePaste(e);
                  setIsPasteModalOpen(false);
                  setTimeout(() => {
                    if (effectiveAttachments.length > 0) {
                      setPreviewItem(effectiveAttachments[effectiveAttachments.length - 1]);
                      setIsModalOpen(true);
                    }
                  }, 200);
                }}
                placeholder="Click here and press Ctrl+V to paste your screenshot..."
                className="w-full text-xs p-2.5 bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-center text-slate-700 resize-none shadow-2xs"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsPasteModalOpen(false);
                  fileInputRef.current?.click();
                }}
                className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                <span>Browse from disk instead</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Attachment Preview Lightbox Modal */}
      {isModalOpen && previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="p-3.5 bg-[#0F172A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-sm">{previewItem.name}</span>
                {previewItem.size && (
                  <span className="text-[11px] text-slate-400 font-mono">({previewItem.size})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {previewItem.url && (
                  <a
                    href={previewItem.url}
                    download={previewItem.name}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1.5 transition-colors"
                    title="Download image"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                )}
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setPreviewItem(null);
                  }}
                  className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-md hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-900/5 min-h-[300px]">
              {previewItem.url && previewItem.url.startsWith('data:image') ? (
                <img
                  src={previewItem.url}
                  alt={previewItem.name}
                  className="max-h-[70vh] max-w-full rounded-lg border border-slate-200 object-contain shadow-md"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <FileText className="w-14 h-14 text-slate-400 mx-auto" />
                  <div className="text-sm font-bold text-slate-700">{previewItem.name}</div>
                  <div className="text-xs text-slate-500">
                    Document attachment associated with this test case record.
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500 text-[11px]">
                Tip: You can paste multiple screenshots (Ctrl+V) directly into this row cell.
              </span>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setPreviewItem(null);
                }}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-bold cursor-pointer transition-colors"
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
