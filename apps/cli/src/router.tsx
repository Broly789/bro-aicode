import { createMemoryRouter } from 'react-router'
import { RootLayout } from './layouts/RootLayout'
import { Home } from './screens/Home'
import { Chat } from './screens/Chat'
import { About } from './screens/About'
import { Settings } from './screens/Settings'
import { NotFound } from './screens/NotFound'

export const router = createMemoryRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'chat', element: <Chat /> },
      { path: 'about', element: <About /> },
      { path: 'settings', element: <Settings /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
