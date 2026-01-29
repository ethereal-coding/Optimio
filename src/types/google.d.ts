/**
 * TypeScript declarations for Google Identity Services
 */

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenClient {
        requestAccessToken(options?: { prompt?: string }): void;
      }

      interface TokenResponse {
        access_token: string;
        expires_in: string;
        scope: string;
        token_type: string;
        error?: string;
        error_description?: string;
      }

      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: any) => void;
      }

      function initTokenClient(config: TokenClientConfig): TokenClient;
    }
  }
}
