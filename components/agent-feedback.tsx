"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, CheckCircle, ThumbsDown, ThumbsUp, XCircle } from "lucide-react"
import { useState } from "react"

export function AgentFeedback({ projectId }: { projectId: string }) {
  // Mock data - in real app this would come from API
  const [feedback, setFeedback] = useState({
    compliance: [
      {
        id: 1,
        type: "warning",
        message: "Ceiling height is below recommended minimum in meeting areas",
        accepted: null,
      },
      { id: 2, type: "error", message: "Emergency exit paths do not meet fire code requirements", accepted: false },
      { id: 3, type: "success", message: "ADA accessibility requirements met", accepted: true },
    ],
    sustainability: [
      { id: 4, type: "success", message: "Solar panel placement optimized for maximum efficiency", accepted: true },
      {
        id: 5,
        type: "warning",
        message: "Consider adding more natural lighting to reduce energy consumption",
        accepted: null,
      },
    ],
    budget: [
      { id: 6, type: "error", message: "Current design exceeds budget by 15%", accepted: null },
      { id: 7, type: "warning", message: "Premium materials account for 40% of total cost", accepted: null },
    ],
  })

  const acceptFeedback = (section: keyof typeof feedback, id: number) => {
    setFeedback((prev) => ({
      ...prev,
      [section]: prev[section].map((item) => (item.id === id ? { ...item, accepted: true } : item)),
    }))
  }

  const rejectFeedback = (section: keyof typeof feedback, id: number) => {
    setFeedback((prev) => ({
      ...prev,
      [section]: prev[section].map((item) => (item.id === id ? { ...item, accepted: false } : item)),
    }))
  }

  const getComplianceScore = () => {
    const total = feedback.compliance.length
    const errors = feedback.compliance.filter((item) => item.type === "error").length
    const warnings = feedback.compliance.filter((item) => item.type === "warning").length

    return Math.round(((total - (errors + warnings * 0.5)) / total) * 100)
  }

  const getSustainabilityScore = () => {
    const total = feedback.sustainability.length
    const success = feedback.sustainability.filter((item) => item.type === "success").length

    return Math.round((success / total) * 100)
  }

  const getBudgetStatus = () => {
    const overBudget = feedback.budget.some((item) => item.type === "error" && item.message.includes("exceeds budget"))

    return overBudget ? "Over Budget" : "Within Budget"
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Agent Feedback</CardTitle>
        <CardDescription>AI agent analysis of your design</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Code Compliance</h3>
            <Badge variant={getComplianceScore() > 80 ? "default" : "destructive"}>{getComplianceScore()}%</Badge>
          </div>
          <Progress value={getComplianceScore()} className="h-2" />

          <div className="mt-2 space-y-2">
            {feedback.compliance.map((item) => (
              <FeedbackItem
                key={item.id}
                item={item}
                onAccept={() => acceptFeedback("compliance", item.id)}
                onReject={() => rejectFeedback("compliance", item.id)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Sustainability</h3>
            <Badge variant={getSustainabilityScore() > 60 ? "default" : "destructive"}>
              {getSustainabilityScore()}%
            </Badge>
          </div>
          <Progress value={getSustainabilityScore()} className="h-2" />

          <div className="mt-2 space-y-2">
            {feedback.sustainability.map((item) => (
              <FeedbackItem
                key={item.id}
                item={item}
                onAccept={() => acceptFeedback("sustainability", item.id)}
                onReject={() => rejectFeedback("sustainability", item.id)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Budget Analysis</h3>
            <Badge variant={getBudgetStatus() === "Within Budget" ? "default" : "destructive"}>
              {getBudgetStatus()}
            </Badge>
          </div>

          <div className="mt-2 space-y-2">
            {feedback.budget.map((item) => (
              <FeedbackItem
                key={item.id}
                item={item}
                onAccept={() => acceptFeedback("budget", item.id)}
                onReject={() => rejectFeedback("budget", item.id)}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FeedbackItem({
  item,
  onAccept,
  onReject,
}: {
  item: { type: string; message: string; accepted: boolean | null }
  onAccept: () => void
  onReject: () => void
}) {
  return (
    <div
      className={`p-2 rounded-md flex items-start justify-between ${
        item.type === "error" ? "bg-destructive/10" : item.type === "warning" ? "bg-amber-500/10" : "bg-green-500/10"
      }`}
    >
      <div className="flex gap-2">
        {item.type === "error" ? (
          <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
        ) : item.type === "warning" ? (
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
        ) : (
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
        )}
        <span className="text-sm">{item.message}</span>
      </div>

      {item.accepted === null && (
        <div className="flex gap-1 ml-2">
          <button onClick={onAccept} className="p-1 rounded-md hover:bg-background/80" aria-label="Accept feedback">
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={onReject} className="p-1 rounded-md hover:bg-background/80" aria-label="Reject feedback">
            <ThumbsDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {item.accepted === true && (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          Accepted
        </Badge>
      )}

      {item.accepted === false && (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          Rejected
        </Badge>
      )}
    </div>
  )
}

