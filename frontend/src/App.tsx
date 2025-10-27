import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">TradingApp</h1>
            <p className="text-xl text-gray-400 mb-8">Sistema de Análise de Ações B3 + EUA</p>
            <div className="space-y-2">
              <p className="text-gray-500">Conectando ao backend...</p>
              <div className="inline-block">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App
