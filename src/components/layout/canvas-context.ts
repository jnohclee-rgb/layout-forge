import { createContext, useContext } from "react"

export const CanvasContext = createContext({ overlay: true, content: false })

export const useCanvas = () => useContext(CanvasContext)
