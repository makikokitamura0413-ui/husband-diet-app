import { useEffect, useState } from 'react';

export interface Route {
  path: string[];
  query: URLSearchParams;
}

function parse(): Route {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [p, q = ''] = hash.split('?');
  return { path: p.split('/').filter(Boolean), query: new URLSearchParams(q) };
}

// アプリ内で一度でも画面遷移したら、ブラウザの「戻る」で前の画面に戻れる
let navigatedInApp = false;

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      navigatedInApp = true;
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(to: string) {
  location.hash = to;
}

export function back(fallback = '/') {
  if (navigatedInApp) history.back();
  else location.replace('#' + fallback);
}
