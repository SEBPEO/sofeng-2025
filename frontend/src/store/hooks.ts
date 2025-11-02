import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// Use throughout the app instead of plain `useDispatch` and `useSelector`
// Cast through unknown to avoid leaking complex reducer state types in the exported symbol
export const useAppDispatch = () => useDispatch() as unknown as AppDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
