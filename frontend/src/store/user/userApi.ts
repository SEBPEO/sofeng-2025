import apiClient from '../apiClient';
import { userSchema, type User } from './userSchema';

/**
 * Fetch the current user using the JWT stored by the client.
 * Backend endpoint: GET /user/me
 */
export async function getUserByJwt(): Promise<User> {
  const { data } = await apiClient.get('/user/me');
  return userSchema.parse(data);
}
