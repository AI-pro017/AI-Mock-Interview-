import { auth } from '@/auth';
import { db } from '@/utils/db';
import { users } from '@/utils/schema';
import { eq } from 'drizzle-orm';

/**
 * Check if the current user session is valid (user is not disabled)
 * @returns {Promise<{isValid: boolean, user?: object, error?: string}>}
 */
export async function validateUserSession() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return { isValid: false, error: 'No session found' };
    }

    // Check current user status in database
    const userResult = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
    const user = userResult[0];

    if (!user) {
      return { isValid: false, error: 'User not found' };
    }

    if (user.disabled) {
      return { isValid: false, error: 'Account disabled' };
    }

    return { isValid: true, user };
  } catch (error) {
    console.error('Error validating user session:', error);
    return { isValid: false, error: 'Validation error' };
  }
}

/**
 * Middleware helper to check user status
 * Use this in API routes that need to verify user is not disabled
 */
export async function requireActiveUser() {
  const validation = await validateUserSession();
  
  if (!validation.isValid) {
    return {
      error: true,
      status: validation.error === 'No session found' ? 401 : 403,
      message: validation.error === 'Account disabled' 
        ? 'Your account has been disabled' 
        : 'Authentication required'
    };
  }

  return { error: false, user: validation.user };
} 