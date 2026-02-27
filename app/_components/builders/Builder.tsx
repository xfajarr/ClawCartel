import { AppWindowIcon, CodeIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

export default function Builder() {
  return (
    <div className="border-border/50 bg-muted/30 flex h-full flex-col border-l">
      <Tabs defaultValue="preview" className="mt-5 flex items-center justify-center">
        <TabsList className="bg-primary/10 p-1">
          <TabsTrigger
            value="preview"
            className="data-active:bg-primary data-active:text-primary-foreground data-active:border-primary/30"
          >
            <AppWindowIcon />
            Preview
          </TabsTrigger>
          <TabsTrigger
            value="code"
            className="data-active:bg-primary data-active:text-primary-foreground data-active:border-primary/30"
          >
            <CodeIcon />
            Code
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
