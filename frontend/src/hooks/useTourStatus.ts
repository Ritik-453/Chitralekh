import { useState, useEffect } from 'react';

export function useTourStatus() {
  const [isCompleted, setIsCompleted] = useState<boolean>(() => {
    return localStorage.getItem('notes_tour_completed') === 'true';
  });

  useEffect(() => {
    const handleStatusChange = () => {
      setIsCompleted(localStorage.getItem('notes_tour_completed') === 'true');
    };

    window.addEventListener('storage', handleStatusChange);
    window.addEventListener('notes-tour-status-changed', handleStatusChange);

    return () => {
      window.removeEventListener('storage', handleStatusChange);
      window.removeEventListener('notes-tour-status-changed', handleStatusChange);
    };
  }, []);

  return { isCompleted };
}

export default useTourStatus;
