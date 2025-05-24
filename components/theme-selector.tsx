import { Moon, Sun, Monitor, Palette } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import clsx from "clsx"

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
  const { theme, changeTheme } = useTheme()

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
        <DropdownMenuItem onClick={() => changeTheme("light")}> 
          <Sun className="mr-2 h-4 w-4" />
          <span>Claro</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeTheme("dark")}> 
          <Moon className="mr-2 h-4 w-4" />
          <span>Escuro</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeTheme("system")}> 
          <Monitor className="mr-2 h-4 w-4" />
          <span>Sistema</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AccentColorSelector() {
  const { accent, changeAccent } = useTheme()

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
        {ACCENT_COLORS.map((accentOpt) => (
          <DropdownMenuItem
            key={accentOpt.value}
            onClick={() => changeAccent(accentOpt.value)}
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