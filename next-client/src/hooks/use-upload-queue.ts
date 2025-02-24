import { useRef } from 'react';

export function useUploadQueue(upload: (file: File) => Promise<void>) {
  const queue = useRef<File[]>([]);

  const after = (launchUpload = true) => {
    if (queue.current.length > 0) {
      const [, ...otherFiles] = queue.current;
      queue.current = otherFiles;
    }
    if (launchUpload && queue.current.length > 0) {
      upload(queue.current[0]);
    }
  };

  const manage = (files?: File[]) => {
    if (files && files?.length > 0) {
      queue.current = [...queue.current, ...files];
    }
    if (queue.current.length > 0) {
      upload(queue.current[0]);
    }
  };

  return {
    queue,
    after,
    manage,
  };
}
