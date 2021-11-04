import { BaseOAuth2Authorization, OAuth2Authorization } from '@advanced-rest-client/events/src/authorization/Authorization';
import { TokenInfo, TokenRemoveOptions } from '@advanced-rest-client/events/src/authorization/Authorization';
import { IdentityProvider } from './IdentityProvider';

/**
 * Class that manages OAuth2 identities.
 */
export declare class Oauth2Identity {
  /**
   * The user agent to be set on the browser window when requesting for a token
   * in a browser flow. This allows to fix the issue with Google auth servers that
   * stopped supporting default electron user agent.
   */
  static userAgent: string;
  /**
   * Listens for the renderer process events related to OAuth provider.
   */
  static listen(): void;

  /**
   * Removes listeners from the channels
   */
  static unlisten(): void;

  /**
   * Generates a provider ID as an identifier for an identity
   *
   * @param {string} authUri User authorization URI
   * @param {string} clientId Client ID
   * @return An ID to be used to identity a provider.
   */
  static generateProviderId(authUri: string, clientId: string): string;

  /**
   * Adds a provider to the list of existing (cached) providers.
   *
   * @param provider Provider to cache.
   */
  static addProvider(provider: IdentityProvider): void;

  /**
   * Looks for existing OAuth provider with (possibly) cached auth data.
   *
   * @param authUri Authorization URL
   * @param clientId Client ID used to authenticate.
   * @returns An identity provider or `undefined` if not exists.
   */
  static getProvider(authUri: string, clientId: string): IdentityProvider;

  /**
   * Runs the web authorization flow.
   * @param {} opts Authorization options
   * @returns A promise with auth result.
   */
  static launchWebAuthFlow(opts: OAuth2Authorization): Promise<TokenInfo>;

  /**
   * A method to call to authorize the user in Google authorization services.
   *
   * @param opts Authorization options
   * @returns A promise resulted to the auth token.
   */
  static getAuthToken(opts: BaseOAuth2Authorization): Promise<TokenInfo>;

  /**
   * Removes cached token info.
   *
   * @param opts When provided it is the same as for
   * `launchWebAuthFlow()` function. When not set it reads `package.json`
   * object for oauth2 configuration.
   */
  static removeToken(opts?: TokenRemoveOptions): Promise<void>;

  /**
   * Reads the default OAuth configuration for the app from package file.
   *
   * @returns A promise resolved to OAuth2 configuration object
   */
  static getOAuthConfig(): Promise<OAuth2Authorization>;

  /**
   * Returns cached provider or creates new provider based on the oauth
   * configuration.
   *
   * @param oauthConfig OAuth2 configuration object.
   * @returns Identity provider for given config.
   */
  static getOrCreateProvider(oauthConfig: OAuth2Authorization): IdentityProvider;
}
