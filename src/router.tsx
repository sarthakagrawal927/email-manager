import { createBrowserRouter } from 'react-router-dom';

import { RootLayout } from '@/RootLayout';
import { AboutPage } from '@/pages/AboutPage';
import HomeClient from '@/pages/HomeClient';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PrivacyPage } from '@/pages/PrivacyPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { path: 'app', element: <HomeClient /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
