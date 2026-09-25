import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { requestPersist } from './platform/persist';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 保存領域を「自動で消されにくく」するよう申請する（保証ではない。結果は設定画面に表示）
void requestPersist();

// PWA：アプリ本体のファイルをキャッシュする Service Worker（記録データには触れない）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      /* 登録できなくてもアプリは通常どおり使える */
    });
  });
}
