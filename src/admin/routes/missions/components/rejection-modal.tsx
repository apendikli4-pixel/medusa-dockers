import { Button, Input, Label, Text } from "@medusajs/ui"
import { useState } from "react"

type RejectionModalProps = {
    isOpen: boolean
    onClose: () => void
    onSubmit: (feedback: string) => void
}

export const RejectionModal = ({ isOpen, onClose, onSubmit }: RejectionModalProps) => {
    const [feedback, setFeedback] = useState("")

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-ui-bg-base border-ui-border-base w-full max-w-md rounded-lg border p-6 shadow-elevation-card-rest">
                <div className="mb-6 flex items-center justify-between">
                    <Text size="large" weight="plus">
                        Reject AI Mission
                    </Text>
                </div>
                <Text className="text-ui-fg-subtle mb-6">
                    Provide short feedback for the underlying AI so it can learn from its mistake. This feedback will be attached to the mission and evaluated during its next reasoning steps.
                </Text>
                <div className="mb-6 flex flex-col gap-y-2">
                    <Label htmlFor="feedback">Reason for Rejection</Label>
                    <Input
                        id="feedback"
                        placeholder="e.g., The price is too high, or the tone is inappropriate."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="flex justify-end gap-x-2">
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={() => onSubmit(feedback)}>
                        Submit Rejection
                    </Button>
                </div>
            </div>
        </div>
    )
}
