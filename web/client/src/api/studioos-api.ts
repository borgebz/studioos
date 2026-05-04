/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface ErrorResponse {
  errors: Record<string, string[]>;
}

export interface Profile {
  /** @maxLength 200 */
  display_name?: string;
  bio?: string;
  /** @format uri */
  photo?: string | null;
  photo_url: string;
  is_public?: boolean;
}

export interface TokenBlacklist {
  refresh: string;
}

export interface TokenObtainPair {
  email: string;
  password: string;
  access: string;
  refresh: string;
}

export interface TokenRefresh {
  access: string;
  refresh: string;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key],
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken,
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal:
          (cancelToken
            ? this.createAbortSignal(cancelToken)
            : requestParams.signal) || null,
        body:
          typeof body === "undefined" || body === null
            ? null
            : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const responseToParse = responseFormat ? response.clone() : response;
      const data = !responseFormat
        ? r
        : await responseToParse[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title StudioOS API
 * @version 1.0.0
 *
 * School dance management platform
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  api = {
    /**
     * @description Takes a set of user credentials and returns an access and refresh JSON web token pair to prove the authentication of those credentials.
     *
     * @tags accounts
     * @name AccountsLoginCreate
     * @request POST:/api/accounts/login/
     */
    accountsLoginCreate: (data: TokenObtainPair, params: RequestParams = {}) =>
      this.request<TokenObtainPair, any>({
        path: `/api/accounts/login/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Takes a token and blacklists it. Must be used with the `rest_framework_simplejwt.token_blacklist` app installed.
     *
     * @tags accounts
     * @name AccountsLogoutCreate
     * @request POST:/api/accounts/logout/
     */
    accountsLogoutCreate: (data: TokenBlacklist, params: RequestParams = {}) =>
      this.request<TokenBlacklist, any>({
        path: `/api/accounts/logout/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description GET /auth/me/ Returns authenticated user data, role, permissions and profile. Used by the frontend to bootstrap session state and drive RBAC.
     *
     * @tags accounts
     * @name AccountsMeRetrieve
     * @request GET:/api/accounts/me/
     * @secure
     */
    accountsMeRetrieve: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/accounts/me/`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * @description GET  /api/accounts/profile/me/ — retrieve own profile POST /api/accounts/profile/me/ - creates profile PATCH /api/accounts/profile/me/ — update own profile (including photo upload)
     *
     * @tags accounts
     * @name AccountsProfileMeRetrieve
     * @request GET:/api/accounts/profile/me/
     * @secure
     */
    accountsProfileMeRetrieve: (params: RequestParams = {}) =>
      this.request<Profile, ErrorResponse>({
        path: `/api/accounts/profile/me/`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description GET  /api/accounts/profile/me/ — retrieve own profile POST /api/accounts/profile/me/ - creates profile PATCH /api/accounts/profile/me/ — update own profile (including photo upload)
     *
     * @tags accounts
     * @name AccountsProfileMeCreate
     * @request POST:/api/accounts/profile/me/
     * @secure
     */
    accountsProfileMeCreate: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/accounts/profile/me/`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * @description GET  /api/accounts/profile/me/ — retrieve own profile POST /api/accounts/profile/me/ - creates profile PATCH /api/accounts/profile/me/ — update own profile (including photo upload)
     *
     * @tags accounts
     * @name AccountsProfileMePartialUpdate
     * @request PATCH:/api/accounts/profile/me/
     * @secure
     */
    accountsProfileMePartialUpdate: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/accounts/profile/me/`,
        method: "PATCH",
        secure: true,
        ...params,
      }),

    /**
     * @description Takes a refresh type JSON web token and returns an access type JSON web token if the refresh token is valid.
     *
     * @tags accounts
     * @name AccountsRefreshCreate
     * @request POST:/api/accounts/refresh/
     */
    accountsRefreshCreate: (data: TokenRefresh, params: RequestParams = {}) =>
      this.request<TokenRefresh, any>({
        path: `/api/accounts/refresh/`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags accounts
     * @name AccountsUsersCreate
     * @request POST:/api/accounts/users/
     * @secure
     */
    accountsUsersCreate: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/accounts/users/`,
        method: "POST",
        secure: true,
        ...params,
      }),

    /**
     * @description OpenApi3 schema for this API. Format can be selected via content negotiation. - YAML: application/vnd.oai.openapi - JSON: application/vnd.oai.openapi+json
     *
     * @tags schema
     * @name SchemaRetrieve
     * @request GET:/api/schema/
     * @secure
     */
    schemaRetrieve: (
      query?: {
        format?: "json" | "yaml";
        lang?:
          | "af"
          | "ar"
          | "ar-dz"
          | "ast"
          | "az"
          | "be"
          | "bg"
          | "bn"
          | "br"
          | "bs"
          | "ca"
          | "ckb"
          | "cs"
          | "cy"
          | "da"
          | "de"
          | "dsb"
          | "el"
          | "en"
          | "en-au"
          | "en-gb"
          | "eo"
          | "es"
          | "es-ar"
          | "es-co"
          | "es-mx"
          | "es-ni"
          | "es-ve"
          | "et"
          | "eu"
          | "fa"
          | "fi"
          | "fr"
          | "fy"
          | "ga"
          | "gd"
          | "gl"
          | "he"
          | "hi"
          | "hr"
          | "hsb"
          | "ht"
          | "hu"
          | "hy"
          | "ia"
          | "id"
          | "ig"
          | "io"
          | "is"
          | "it"
          | "ja"
          | "ka"
          | "kab"
          | "kk"
          | "km"
          | "kn"
          | "ko"
          | "ky"
          | "lb"
          | "lt"
          | "lv"
          | "mk"
          | "ml"
          | "mn"
          | "mr"
          | "ms"
          | "my"
          | "nb"
          | "ne"
          | "nl"
          | "nn"
          | "os"
          | "pa"
          | "pl"
          | "pt"
          | "pt-br"
          | "ro"
          | "ru"
          | "sk"
          | "sl"
          | "sq"
          | "sr"
          | "sr-latn"
          | "sv"
          | "sw"
          | "ta"
          | "te"
          | "tg"
          | "th"
          | "tk"
          | "tr"
          | "tt"
          | "udm"
          | "ug"
          | "uk"
          | "ur"
          | "uz"
          | "vi"
          | "zh-hans"
          | "zh-hant";
      },
      params: RequestParams = {},
    ) =>
      this.request<Record<string, any>, any>({
        path: `/api/schema/`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
}
