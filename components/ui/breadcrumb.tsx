import type * as React from "react"
import { ChevronRight, MoreHorizontal } from "lucide-react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {
  separator?: React.ReactNode
}

export interface BreadcrumbListProps extends React.ComponentPropsWithoutRef<"ol"> {
  asChild?: boolean
}

export interface BreadcrumbItemProps extends React.ComponentPropsWithoutRef<"li"> {
  asChild?: boolean
}

export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<"a"> {
  asChild?: boolean
}

export interface BreadcrumbPageProps extends React.ComponentPropsWithoutRef<"span"> {
  asChild?: boolean
}

export interface BreadcrumbEllipsisProps extends React.ComponentPropsWithoutRef<"li"> {
  asChild?: boolean
}

export function Breadcrumb({ separator = <ChevronRight className="h-4 w-4" />, className, ...props }: BreadcrumbProps) {
  return <nav aria-label="breadcrumb" className={cn("flex items-center text-sm", className)} {...props} />
}

export function BreadcrumbList({ asChild, className, ...props }: BreadcrumbListProps) {
  const Comp = asChild ? Slot : "ol"

  return <Comp className={cn("flex flex-wrap items-center gap-1.5 sm:gap-2.5", className)} {...props} />
}

export function BreadcrumbItem({ asChild, className, ...props }: BreadcrumbItemProps) {
  const Comp = asChild ? Slot : "li"

  return <Comp className={cn("inline-flex items-center gap-1.5", className)} {...props} />
}

export function BreadcrumbLink({ asChild, className, ...props }: BreadcrumbLinkProps) {
  const Comp = asChild ? Slot : "a"

  return <Comp className={cn("hover:underline", className)} {...props} />
}

export function BreadcrumbPage({ asChild, className, ...props }: BreadcrumbPageProps) {
  const Comp = asChild ? Slot : "span"

  return <Comp className={cn("text-muted-foreground", className)} aria-current="page" {...props} />
}

export function BreadcrumbEllipsis({ asChild, className, ...props }: BreadcrumbEllipsisProps) {
  const Comp = asChild ? Slot : "li"

  return (
    <Comp className={cn("flex h-9 w-9 items-center justify-center", className)} {...props}>
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More</span>
    </Comp>
  )
}

