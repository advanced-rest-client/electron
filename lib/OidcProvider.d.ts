import { Authorization } from '@advanced-rest-client/events';
import { IdentityProvider, handleTokenInfo } from './IdentityProvider.js';

/**
 * Identity provider that specializes in the OpenId Connect.
 */
export class OidcProvider extends IdentityProvider {
  /**
   * @return The parameters to build popup URL.
   */
  buildPopupUrlParams(): Promise<URL>;

  /**
   * @param params The instance of search params with the response from the auth dialog.
   * @return true when the params qualify as an authorization popup redirect response.
   */
  validateTokenResponse(params: URLSearchParams): boolean;

  /**
   * Processes the response returned by the popup or the iframe.
   */
  processTokenResponse(params: URLSearchParams): Promise<void>;

  /**
   * Creates a token info object for each requested response type. These are created from the params received from the
   * redirect URI. This means that it might not be complete (for code response type).
   * @param params
   * @param time Timestamp when the tokens were created
   */
  prepareTokens(params: URLSearchParams, time: number): Authorization.OidcTokenInfo[];

  /**
   * Finishes the authorization.
   */
  finish(tokens: (Authorization.OidcTokenInfo|Authorization.OidcTokenError)[]): void;

  /**
   * Processes token info object when it's ready.
   *
   * @param info Token info returned from the server.
   */
  [handleTokenInfo](info: Authorization.TokenInfo): void;

  /**
   * @param settings Authorization options
   */
  getAuthTokens(settings?: Authorization.OidcAuthorization): Promise<(Authorization.OidcTokenInfo|Authorization.OidcTokenError)[]>;

  /**
   * Runs the web authorization flow.
   * @param settings Authorization options
   */
  authorizeOidc(settings?: Authorization.OidcAuthorization): Promise<(Authorization.OidcTokenInfo|Authorization.OidcTokenError)[]>
}
