import React, { useState, useRef, useEffect } from "react";
import { X, UploadIcon, RefreshCw } from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (messageText: string, comments: string) => Promise<void>;
}

export function UploadModal({ isOpen, onClose, onUpload }: UploadModalProps) {
  const [messageText, setMessageText] = useState("");
  const [comments, setComments] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!isOpen) return null;

  const validateSwiftMessage = (text: string): boolean => {
    const requiredFields = [":20:", ":32A:", ":50K:", ":59:"];
    return requiredFields.every((field) => text.includes(field));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!validateSwiftMessage(messageText)) {
        throw new Error("Invalid SWIFT message format");
      }
      await onUpload(messageText, comments);
      setMessageText("");
      setComments("");
      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to process message",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const processFile = async (file: File): Promise<string> => {
    const text = await file.text();
    if (!validateSwiftMessage(text)) {
      throw new Error(`Invalid SWIFT message format in file: ${file.name}`);
    }
    return text;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsLoading(true);
    setTotalFiles(files.length);
    setCurrentFileIndex(0);
    setError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        setCurrentFileIndex(i + 1);
        const file = files[i];
        const text = await processFile(file);
        await onUpload(text, `Uploaded from file: ${file.name}`);
      }
      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to process files",
      );
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Upload SWIFT Message
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-8">
          {/* Left side - Batch Upload */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Batch Upload
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt"
                multiple
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <UploadIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Drop files here or
                </span>
                <span className="mt-1 px-3 py-1.5 bg-[#008766] text-white rounded-lg hover:bg-[#007055] text-sm font-medium">
                  Browse Files
                </span>
                <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Supported format: .txt
                </span>
              </label>
            </div>

            {isLoading && totalFiles > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <div className="flex items-center">
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    <span>Processing files...</span>
                  </div>
                  <span>
                    {currentFileIndex} of {totalFiles}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#008766] dark:bg-[#007055] transition-all duration-300"
                    style={{ width: `${(currentFileIndex / totalFiles) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Vertical Divider */}
          <div className="w-px bg-gray-200 dark:bg-gray-700" />

          {/* Right side - Manual Input */}
          <div className="flex-1">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Message Text
                </label>
                <textarea
                  id="message"
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                    focus:outline-none focus:ring-[#008766] focus:border-transparent 
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Paste SWIFT message here..."
                  required
                />
              </div>

              <div className="mb-6">
                <label
                  htmlFor="comments"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Comments
                </label>
                <textarea
                  id="comments"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                    focus:outline-none focus:ring-[#008766] focus:border-transparent 
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any comments about this message..."
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#008766] text-white rounded-lg hover:bg-[#007055] dark:bg-[#007055] dark:hover:bg-[#006045] disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "Processing..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
