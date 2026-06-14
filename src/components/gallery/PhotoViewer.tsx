'use client';

import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

interface PhotoViewerProps {
  photos: Array<{
    id: string;
    thumbnailUrl: string;
    caption: string | null;
  }>;
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function PhotoViewer({
  photos,
  currentIndex,
  isOpen,
  onClose,
}: PhotoViewerProps) {
  const slides = photos.map((photo) => ({
    src: photo.thumbnailUrl,
    alt: photo.caption || '照片',
    description: photo.caption,
  }));

  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      slides={slides}
      index={currentIndex}
    />
  );
}
