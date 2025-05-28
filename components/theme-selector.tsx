import { Moon, Sun, Monitor, Palette, Cat } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import clsx from "clsx"
import { useEffect, useState } from "react"

const ACCENT_COLORS = [
  { value: "red", label: "Vermelho", color: "#ef4444" },
  { value: "rose", label: "Rosa", color: "#fb7185" },
  { value: "orange", label: "Laranja", color: "#f59e42" },
  { value: "yellow", label: "Amarelo", color: "#eab308" },
  { value: "green", label: "Verde", color: "#22c55e" },
  { value: "blue", label: "Azul", color: "#3b82f6" },
  { value: "violet", label: "Violeta", color: "#8b5cf6" },
]

export function ThemeSelector() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("light")}> 
          <Sun className="mr-2 h-4 w-4" />
          <span>Claro</span>
          {resolvedTheme === "light" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}> 
          <Moon className="mr-2 h-4 w-4" />
          <span>Escuro</span>
          {resolvedTheme === "dark" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}> 
          <Monitor className="mr-2 h-4 w-4" />
          <span>Sistema</span>
          {theme === "system" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Novo hook para accent, separado do tema
function useAccent() {
  const [accent, setAccent] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("accent") || "blue"
    }
    return "blue"
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    // Remove todas as classes de accent
    const root = window.document.documentElement
    ACCENT_COLORS.forEach(color => {
      root.classList.remove(`theme-${color.value}`)
    })
    if (accent !== "blue") {
      root.classList.add(`theme-${accent}`)
    }
    localStorage.setItem("accent", accent)
  }, [accent])

  return { accent, setAccent }
}

export function AccentColorSelector() {
  const { accent, setAccent } = useAccent()
  const accentColor = ACCENT_COLORS.find(c => c.value === accent)?.color || "#3b82f6"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Selecionar cor de destaque</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Cor de destaque</DropdownMenuLabel>
        <div className="flex justify-center my-2">
          <Cat className="h-8 w-8" style={{ color: accentColor }} />
        </div>
        {ACCENT_COLORS.map((accentOpt) => (
          <DropdownMenuItem
            key={accentOpt.value}
            onClick={() => setAccent(accentOpt.value)}
            className={clsx("flex items-center gap-2", accent === accentOpt.value && "font-semibold")}
          >
            <span
              className="inline-block w-4 h-4 rounded-full border border-muted mr-2"
              style={{ background: accentOpt.color }}
            />
            {accentOpt.label}
            {accent === accentOpt.value && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 