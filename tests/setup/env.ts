// Environment every test runs with. These are fake values: nothing in the
// test suite talks to Gemini, Tavily, Resend, Google or MongoDB.
process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID = "test-google-client-id";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/sanatanai-test";
process.env.JWT_SECRET = "test-jwt-secret-test-jwt-secret-1234";
process.env.GENAI = "test-genai-key";
process.env.TAVILY_API = "test-tavily-key";
process.env.RESEND_API = "re_test_key";
delete process.env.MONGO_DEV;
delete process.env.MAX_TOOL_CALLS;
