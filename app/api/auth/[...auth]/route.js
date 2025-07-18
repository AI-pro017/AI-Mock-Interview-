import { handlers } from "@/auth"

// Remove this line - it's breaking OAuth
// export const dynamic = 'force-dynamic';

// Export the handlers
export const { GET, POST } = handlers; 