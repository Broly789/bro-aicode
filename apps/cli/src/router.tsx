import { createMemoryRouter } from 'react-router'
import { RootLayout } from './layouts/RootLayout'
import { Home } from './screens/Home'
import { Chat } from './screens/Chat'
import { About } from './screens/About'
import { Settings } from './screens/Settings'
import { Llm } from './screens/Llm'
import { AiChat } from './screens/AiChat'
import { NotFound } from './screens/NotFound'
import { ScrollboxTest } from './components/ScrollboxTest'
import { ErrorFallback } from './components/ErrorFallback'

export const router = createMemoryRouter(
  [
    {
      path: '/',
      element: <RootLayout />,
      ErrorBoundary: ErrorFallback,
      children: [
        { index: true, element: <Home /> },
        { path: 'chat', element: <Chat /> },
        { path: 'about', element: <About /> },
        { path: 'settings', element: <Settings /> },
        { path: 'llm', element: <Llm /> },
        { path: 'scrollbox-test', element: <ScrollboxTest /> },
        { path: 'session/:id', element: <AiChat /> },
        { path: '*', element: <NotFound /> },
      ],
    },
  ],
  // {
  //   initialEntries: ['/session/57f2bd7a-5e93-4d0a-b521-6323cc99f7c7'], // 测试加载历史会话
  // },
)
