import { TooltipProvider } from "./_components/ui/tooltip";
import { QueryProvider } from "./_providers/QueryProvider";
import { ThemeProvider } from "./_providers/ThemeProvider";

function composeProviders(providers: React.ComponentType<{ children: React.ReactNode }>[]) {
  return ({ children }: { children: React.ReactNode }) => {
    return providers.reduceRight((acc, Provider) => {
      return <Provider>{acc}</Provider>;
    }, children);
  };
}

const AppProviders = composeProviders([QueryProvider, ThemeProvider, TooltipProvider]);

export function Providers({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
