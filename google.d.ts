declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenResponse {
        access_token: string;
        expires_in: number;
        scope: string;
        token_type: string;
        error?: string;
        error_description?: string;
      }
      interface TokenClientConfig {
        client_id: string;
        scope: string;
        prompt?: '' | 'none' | 'consent' | 'select_account';
        callback: (response: TokenResponse) => void;
        error_callback?: (err: { type: string; message?: string }) => void;
      }
      interface TokenClient {
        requestAccessToken: (overrideConfig?: { prompt?: string; scope?: string }) => void;
      }
      function initTokenClient(config: TokenClientConfig): TokenClient;
      function revoke(token: string, done?: () => void): void;
    }
  }

  namespace picker {
    const Action: {
      PICKED: string;
      CANCEL: string;
    };
    const ViewId: {
      DOCS: string;
      FOLDERS: string;
    };
    const Feature: {
      SUPPORT_DRIVES: string;
      NAV_HIDDEN: string;
      MULTISELECT_ENABLED: string;
    };
    const Response: {
      ACTION: string;
      DOCUMENTS: string;
    };
    const Document: {
      ID: string;
      NAME: string;
      MIME_TYPE: string;
      URL: string;
      PARENT_ID: string;
    };

    interface PickerDocument {
      id: string;
      name: string;
      mimeType: string;
      url?: string;
      parentId?: string;
      [key: string]: unknown;
    }

    interface ResponseObject {
      action: string;
      docs?: PickerDocument[];
      [key: string]: unknown;
    }

    class DocsView {
      constructor(viewId?: string);
      setIncludeFolders(include: boolean): DocsView;
      setSelectFolderEnabled(enabled: boolean): DocsView;
      setMimeTypes(mimeTypes: string): DocsView;
      setParent(parentId: string): DocsView;
      setMode(mode: string): DocsView;
    }

    class PickerBuilder {
      addView(view: DocsView | string): PickerBuilder;
      enableFeature(feature: string): PickerBuilder;
      setOAuthToken(token: string): PickerBuilder;
      setDeveloperKey(apiKey: string): PickerBuilder;
      setAppId(appId: string): PickerBuilder;
      setOrigin(origin: string): PickerBuilder;
      setTitle(title: string): PickerBuilder;
      setCallback(callback: (data: ResponseObject) => void): PickerBuilder;
      build(): { setVisible(visible: boolean): void };
    }
  }
}

declare namespace gapi {
  function load(apiName: string, callback: () => void | { callback: () => void; onerror?: (err: unknown) => void }): void;
}
