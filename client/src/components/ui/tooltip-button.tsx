import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ReactNode, MouseEventHandler } from "react";

interface TooltipButtonProps {
  children: ReactNode;
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
}

export const TooltipButton = ({ children, label, onClick, className }: TooltipButtonProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={`${className}`}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
