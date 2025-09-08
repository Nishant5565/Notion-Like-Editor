"use client"

import * as React from "react"

export type AppContextValue = {
  // For a single-user blog, we can keep this minimal
  // Add any app-wide state you might need in the future
  isDarkMode?: boolean
  setDarkMode?: (dark: boolean) => void
}

export const AppContext = React.createContext<AppContextValue>({
  isDarkMode: false,
  setDarkMode: () => {},
})

export const AppConsumer = AppContext.Consumer

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setDarkMode] = React.useState<boolean>(false)

  const providerValue = React.useMemo(
    () => ({
      isDarkMode,
      setDarkMode,
    }),
    [isDarkMode, setDarkMode]
  )

  return (
    <AppContext.Provider value={providerValue}>{children}</AppContext.Provider>
  )
}

/**
 * Hook to access the app state.
 * @returns {AppContextValue}
 */
export const useAppState = (): AppContextValue => {
  const context = React.useContext(AppContext)
  if (!context) {
    throw new Error("useAppState must be used within an AppProvider")
  }
  return context
}
