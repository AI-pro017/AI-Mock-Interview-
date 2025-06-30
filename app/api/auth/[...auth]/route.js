import { handlers } from "@/auth"

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Export the handlers
export const { GET, POST } = handlers; 