
import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import GalleryPage from './pages/GalleryPage';
import GamesPage from './pages/GamesPage';
import GamePlayerPage from './pages/GamePlayerPage';
import AdminLayout from './layouts/AdminLayout';
import StudioPage from './pages/admin/StudioPage';
import EditorPage from './pages/admin/EditorPage';
import WizardPage from './pages/admin/WizardPage';
import SettingsPage from './pages/admin/SettingsPage';
import AuthCallbackPage from './pages/AuthCallbackPage';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <GalleryPage />,
    },
    {
        path: '/games',
        element: <GamesPage />,
    },
    {
        path: '/play/:gameId',
        element: <GamePlayerPage />,
    },
    {
        path: '/auth/callback',
        element: <AuthCallbackPage />,
    },
    {
        path: '/admin/wizard',
        element: <WizardPage />
    },
    {
        path: '/user',
        element: <AdminLayout />,
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
                path: 'settings',
                element: <SettingsPage />
            }
        ]
    },
    {
        path: '/admin',
        element: <AdminLayout />,
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
                path: 'settings',
                element: <SettingsPage />
            }
        ]
    }
]);
