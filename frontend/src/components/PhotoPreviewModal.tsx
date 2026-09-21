'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, ExternalLink, X, ZoomIn } from 'lucide-react';
import { getCategoryFallbackPhoto } from '@/lib/utils';

export interface PhotoPreviewState {
  url: string;
  title: string;
  subtitle?: string;
  category?: string;
  equipmentName?: string;
}

interface PhotoPreviewModalProps {
  photo: PhotoPreviewState | null;
  onClose: () => void;
}

export default function PhotoPreviewModal({ photo, onClose }: PhotoPreviewModalProps) {
  const [currentSrc, setCurrentSrc] = useState<string>('');

  useEffect(() => {
    if (photo?.url) {
      setCurrentSrc(photo.url);
    } else if (photo) {
      setCurrentSrc(getCategoryFallbackPhoto(photo.category, photo.equipmentName));
    }
  }, [photo]);

  if (!photo) return null;

  const handleImageError = () => {
    const fallback = getCategoryFallbackPhoto(photo.category, photo.equipmentName);
    if (currentSrc !== fallback) {
      setCurrentSrc(fallback);
    }
  };

  return (
    <Dialog open={!!photo} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-1 text-left pr-8">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400">
              <Camera className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-white leading-tight">
              {photo.title || 'Equipment Photo'}
            </DialogTitle>
          </div>
          {photo.subtitle && (
            <DialogDescription className="text-xs text-slate-400">
              {photo.subtitle}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* High Resolution Image Container */}
        <div className="mt-3 relative w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center min-h-[240px] max-h-[62vh]">
          <img
            src={currentSrc || getCategoryFallbackPhoto(photo.category, photo.equipmentName)}
            alt={photo.title || 'Equipment Photo'}
            className="w-full max-h-[62vh] object-contain rounded-lg transition-transform duration-200"
            onError={handleImageError}
          />
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
            <span>High-resolution visual evidence</span>
          </div>

          <div className="flex items-center gap-2">
            {currentSrc && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open(currentSrc, '_blank')}
                className="border-slate-800 bg-slate-950/70 hover:bg-slate-800 text-slate-300 text-xs gap-1.5 h-8 px-3"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full Size</span>
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={onClose}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 px-4 font-semibold"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
