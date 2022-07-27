type HtmlModalElement = HTMLDivElement & { resolve: (value: boolean | PromiseLike<boolean>) => void };

type User = {
  id: string;
  ssoToken: string;
};

type Version = {
  branch: string;
  commit: string;
  commitUrl: string;
  date: string;
  name: string;
};
