import { createMemoryRouter } from 'react-router'
import { RootLayout } from './layouts/RootLayout'
import { Home } from './screens/Home'
import { Chat } from './screens/Chat'
import { About } from './screens/About'
import { Settings } from './screens/Settings'
import { Llm } from './screens/Llm'
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
      { path: 'llm', element: <Llm /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
