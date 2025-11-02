import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { getUserByJwt } from './userApi';
import type { User } from './userSchema';

export interface UsersState {
  current: User | null;
  status: 'idle' | 'loading' | 'failed';
  error?: string | null;
}

const initialState: UsersState = {
  current: null,
  status: 'idle',
  error: null,
};

export const getUserByJwtThunk = createAsyncThunk('users/getUserByJwt', async () => {
  return await getUserByJwt();
});

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearCurrent(state) {
      state.current = null;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getUserByJwtThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getUserByJwtThunk.fulfilled, (state, action: PayloadAction<User>) => {
        state.status = 'idle';
        state.current = action.payload;
      })
      .addCase(getUserByJwtThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to get user';
      });
  },
});

export const { clearCurrent } = usersSlice.actions;
export default usersSlice.reducer;
