
export interface ProcessingState {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress?: number;
  message?: string;
  error?: string;
}

export interface VideoData {
  url: string;
  blob?: Blob;
  name: string;
  aspectRatio: '16:9' | '9:16';
}
