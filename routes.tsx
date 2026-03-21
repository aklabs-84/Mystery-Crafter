
import React, { Suspense, lazy } from 'react'; // lazy kept for React.lazy inside lazyWithRetry
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Spinner from './components/Spinner';

// Lazy import wrapper: auto-reload on chunk fetch failure (stale deployment)
const lazyWithRetry = (importFn: () => Promise<any>) =>
    lazy(() => importFn().catch(() => { window.location.reload(); return new Promise(() => {}); }));

// Lazy load page components
const GalleryPage = lazyWithRetry(() => import('./pages/GalleryPage'));
const GamesPage = lazyWithRetry(() => import('./pages/GamesPage'));
const GamePlayerPage = lazyWithRetry(() => import('./pages/GamePlayerPage'));
const AdminLayout = lazyWithRetry(() => import('./layouts/AdminLayout'));
const StudioPage = lazyWithRetry(() => import('./pages/admin/StudioPage'));
const EditorPage = lazyWithRetry(() => import('./pages/admin/EditorPage'));
const QuickEditorPage = lazyWithRetry(() => import('./pages/admin/QuickEditorPage'));
const WizardPage = lazyWithRetry(() => import('./pages/admin/WizardPage'));
const SettingsPage = lazyWithRetry(() => import('./pages/admin/SettingsPage'));
const AuthCallbackPage = lazyWithRetry(() => import('./pages/AuthCallbackPage'));

// Multiplayer
const MultiplayerLounge = lazyWithRetry(() => import('./components/Player/MultiplayerLounge'));
const MultiplayerPlayer = lazyWithRetry(() => import('./components/Player/MultiplayerPlayer'));

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Suspense fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-black">
            <Spinner className="w-12 h-12 border-t-2 border-b-2 border-red-600" />
        </div>
    }>
        {children}
    </Suspense>
);

export const router = createBrowserRouter([
    {
        path: '/',
        element: <PageWrapper><GalleryPage /></PageWrapper>,
    },
    {
        path: '/games',
        element: <PageWrapper><GamesPage /></PageWrapper>,
    },
    {
        path: '/play/:gameId',
        element: <PageWrapper><GamePlayerPage /></PageWrapper>,
    },
    {
        path: '/play/multiplayer/:sessionCode/game',
        element: <PageWrapper><MultiplayerPlayer /></PageWrapper>,
    },
    {
        path: '/play/multiplayer/host/:gameId',
        element: <PageWrapper><MultiplayerLounge /></PageWrapper>,
    },
    {
        path: '/play/multiplayer',
        element: <PageWrapper><MultiplayerLounge /></PageWrapper>,
    },
    {
        path: '/auth/callback',
        element: <PageWrapper><AuthCallbackPage /></PageWrapper>,
    },
    {
        path: '/admin/wizard',
        element: <PageWrapper><WizardPage /></PageWrapper>
    },
    {
        path: '/user',
        element: <PageWrapper><AdminLayout /></PageWrapper>,
        children: [
            {
                index: true,
                element: <Navigate to="/user/studio" replace />
            },
            {
                path: 'studio',
                element: <StudioPage isAdmin={false} />
            },
            {
                path: 'studio/:gameId',
                element: <EditorPage />
            },
            {
                path: 'studio/quick/:gameId',
                element: <QuickEditorPage />
            },
            {
                path: 'settings',
                element: <SettingsPage />
            }
        ]
    },
    {
        path: '/admin',
        element: <PageWrapper><AdminLayout /></PageWrapper>,
        children: [
            {
                index: true,
                element: <Navigate to="/admin/studio" replace />
            },
            {
                path: 'studio',
                element: <StudioPage isAdmin={true} />
            },
            {
                path: 'studio/:gameId',
                element: <EditorPage />
            },
            {
                path: 'studio/quick/:gameId',
                element: <QuickEditorPage />
            },
            {
                path: 'settings',
                element: <SettingsPage />
            }
        ]
    }
]);
