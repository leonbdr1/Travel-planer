import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { productConfig } from '@reiseplaner/config';
import { MetaProvider } from './lib/meta';
import { router } from './router';
import './styles.css';

document.title = productConfig.name;
document.documentElement.lang = productConfig.markets.language;

const root = document.getElementById('root');
if (!root) throw new Error('root element missing');

createRoot(root).render(
  <StrictMode>
    <MetaProvider>
      <RouterProvider router={router} />
    </MetaProvider>
  </StrictMode>,
);
