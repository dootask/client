export const historyTouch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
