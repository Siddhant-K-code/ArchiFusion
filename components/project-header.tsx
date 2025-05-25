"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb"
import { Bolt, ChevronDown, Download, FileDown, FileX, Share2, Save } from "lucide-react"
import { useState } from "react"

export function ProjectHeader({ projectId }: { projectId: string }) {
  const [projectName, setProjectName] = useState("Modern Office Building")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleProcessDesign = () => {
    setIsProcessing(true)
    // Simulate processing delay
    setTimeout(() => {
      setIsProcessing(false)
    }, 3000)
  }

  return (
    <div className="border-b bg-background px-4 py-3 flex items-center justify-between">
      <div>
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">ArchiFusion</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <span className="font-medium">{projectName}</span>
          </BreadcrumbItem>
        </Breadcrumb>
      </div>

      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" className="gap-1">
          <Save className="h-4 w-4" />
          Save
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Share2 className="h-4 w-4" />
              Share
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Share with Team</DropdownMenuItem>
            <DropdownMenuItem>Copy Link</DropdownMenuItem>
            <DropdownMenuItem>Export as PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="gap-2">
              <FileDown className="h-4 w-4" />
              CAD File (.dwg)
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <FileDown className="h-4 w-4" />
              3D Model (.glb)
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <FileX className="h-4 w-4" />
              Documentation (.pdf)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" className="gap-1" onClick={handleProcessDesign} disabled={isProcessing}>
          <Bolt className="h-4 w-4" />
          {isProcessing ? "Processing..." : "Process Design"}
        </Button>
      </div>
    </div>
  )
}

