import { tv } from "tailwind-variants";

export const card = tv({
  base: [
    "bg-card/90 text-card-foreground group/card flex flex-col gap-(--card-spacing) rounded-xl py-(--card-spacing)",
    "backdrop-blur-xl shadow-md",
    "has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0",
    "*:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
  ],
  variants: {
    size: {
      sm: "[--card-spacing:--spacing(4)] text-sm",
      md: "[--card-spacing:--spacing(5)]",
    },
    interactive: {
      true: "transition-all duration-300 hover:-translate-y-2 hover:bg-card hover:shadow-xl cursor-pointer",
      false: "",
    },
  },
  defaultVariants: {
    size: "md",
    interactive: false,
  },
});

export const cardAction = tv({
  base: "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
});

export const cardContent = tv({
  base: "px-(--card-spacing)",
});

export const cardDescription = tv({
  base: "text-muted-foreground text-base group-data-[size=sm]/card:text-sm",
});

export const cardFooter = tv({
  base: "bg-muted/50 flex items-center rounded-b-xl border-t p-(--card-spacing)",
});

export const cardHeader = tv({
  base: [
    "@container/card-header grid auto-rows-min items-start gap-1 px-(--card-spacing)",
    "has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
  ],
});

export const cardTitle = tv({
  base: "font-heading text-xl leading-snug font-medium group-data-[size=sm]/card:text-base",
});