import { useEffect, useRef } from 'react';

export const useSessionHistory = (currentView, setCurrentView) => {
    const isNavigatingBackRef = useRef(false);

    // Initialize session history array if it doesn't exist
    useEffect(() => {
        if (!sessionStorage.getItem('viewHistory')) {
            sessionStorage.setItem('viewHistory', JSON.stringify([]));
        }
    }, []);

    // Track view changes
    useEffect(() => {
        if (typeof currentView !== 'string') return;
        
        // Skip recording if we navigated via the back button
        if (isNavigatingBackRef.current) {
            isNavigatingBackRef.current = false;
            return;
        }

        const historyStr = sessionStorage.getItem('viewHistory');
        if (historyStr) {
            try {
                const history = JSON.parse(historyStr);
                // Don't record the same view back-to-back
                if (history[history.length - 1] !== currentView) {
                    history.push(currentView);
                    sessionStorage.setItem('viewHistory', JSON.stringify(history));
                }
            } catch (err) {
                console.error('Error parsing session history', err);
                sessionStorage.setItem('viewHistory', JSON.stringify([currentView]));
            }
        }
    }, [currentView]);

    const handleBack = () => {
        const historyStr = sessionStorage.getItem('viewHistory');
        if (historyStr) {
            try {
                let history = JSON.parse(historyStr);
                
                // If there's 1 or 0 items in history, we can't go anywhere back.
                if (history.length <= 1) {
                    return;
                }

                // Pop the current view
                history.pop();
                
                // Get the previous view
                const previousView = history[history.length - 1];
                
                // Save the new trimmed history
                sessionStorage.setItem('viewHistory', JSON.stringify(history));

                // Navigate
                isNavigatingBackRef.current = true;
                setCurrentView(previousView);

            } catch (err) {
                console.error('Error popping session history', err);
            }
        }
    };

    return { handleBack };
};
