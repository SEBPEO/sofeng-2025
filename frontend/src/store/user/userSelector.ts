import type { RootState } from '../index';
import type { User } from './userSchema';

export const selectUsersState = (state: RootState) => state.users;

export const selectCurrentUser = (state: RootState): User | null => state.users.current;

export const selectUsersStatus = (state: RootState) => state.users.status;
