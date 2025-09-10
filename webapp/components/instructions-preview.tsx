interface InstructionsPreviewProps {
  content: string;
  title?: string;
  description?: string;
}

export function InstructionsPreview({ 
  content, 
  title = "📋 Instructions Preview",
  description = "This preview shows the complete instructions that will be sent to the agent."
}: InstructionsPreviewProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{title}</label>
      <div className="p-4 bg-gray-50 rounded-md text-sm whitespace-pre-wrap border max-h-96 overflow-y-auto">
        <div className="prose prose-sm max-w-none">
          {content || "No instructions configured yet."}
        </div>
      </div>
      <p className="text-xs text-gray-500">
        {description}
      </p>
    </div>
  );
}
