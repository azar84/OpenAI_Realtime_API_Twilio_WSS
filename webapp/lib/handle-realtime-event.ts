import { Item } from "@/components/types";

export default function handleRealtimeEvent(
  ev: any,
  setItems: React.Dispatch<React.SetStateAction<Item[]>>
) {
  // Helper function to create a new item with default fields
  function createNewItem(base: Partial<Item>): Item {
    return {
      object: "realtime.item",
      timestamp: new Date().toLocaleTimeString(),
      ...base,
    } as Item;
  }

  // Helper function to update an existing item if found by id, or add a new one if not.
  // We can also pass partial updates to reduce repetitive code.
  function updateOrAddItem(id: string, updates: Partial<Item>): void {
    setItems((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...updates };
        return updated;
      } else {
        return [...prev, createNewItem({ id, ...updates })];
      }
    });
  }

  const { type } = ev;

  switch (type) {
    case "session.created": {
      // Starting a new session, clear all items
      setItems([]);
      break;
    }

    case "input_audio_buffer.speech_started": {
      // Create a user message item with running status and placeholder content
      const { item_id } = ev;
      setItems((prev) => [
        ...prev,
        createNewItem({
          id: item_id,
          type: "message",
          role: "user",
          content: [{ type: "text", text: "..." }],
          status: "running",
        }),
      ]);
      break;
    }

    case "conversation.item.created": {
      const { item } = ev;
      if (item.type === "message") {
        // A completed message from user or assistant
        const updatedContent =
          item.content && item.content.length > 0 ? item.content : [];
        setItems((prev) => {
          const idx = prev.findIndex((m) => m.id === item.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              ...item,
              content: updatedContent,
              status: "completed",
              timestamp:
                updated[idx].timestamp || new Date().toLocaleTimeString(),
            };
            return updated;
          } else {
            return [
              ...prev,
              createNewItem({
                ...item,
                content: updatedContent,
                status: "completed",
              }),
            ];
          }
        });
      }
      // NOTE: We no longer handle function_call items here.
      // The handling of function_call items has been moved to the "response.output_item.done" event.
      else if (item.type === "function_call_output") {
        // Function call output item created
        // Add the output item and mark the corresponding function_call as completed
        // Also display in transcript as tool message with the response
        setItems((prev) => {
          const newItems = [
            ...prev,
            createNewItem({
              ...item,
              role: "tool",
              content: [
                {
                  type: "text",
                  text: `Function call response: ${item.output}`,
                },
              ],
              status: "completed",
            }),
          ];

          return newItems.map((m) =>
            m.call_id === item.call_id && m.type === "function_call"
              ? { ...m, status: "completed" }
              : m
          );
        });
      }
      break;
    }

    case "conversation.item.input_audio_transcription.completed": {
      // Update the user message with the final transcript
      const { item_id, transcript } = ev;
      setItems((prev) =>
        prev.map((m) =>
          m.id === item_id && m.type === "message" && m.role === "user"
            ? {
                ...m,
                content: [{ type: "text", text: transcript }],
                status: "completed",
              }
            : m
        )
      );
      break;
    }

    case "response.content_part.added": {
      const { item_id, part, output_index } = ev;
      // Append new content to the assistant message if output_index == 0
      if (part.type === "text" && output_index === 0) {
        setItems((prev) => {
          const idx = prev.findIndex((m) => m.id === item_id);
          if (idx >= 0) {
            const updated = [...prev];
            const existingContent = updated[idx].content || [];
            updated[idx] = {
              ...updated[idx],
              content: [
                ...existingContent,
                { type: part.type, text: part.text },
              ],
            };
            return updated;
          } else {
            // If the item doesn't exist yet, create it as a running assistant message
            return [
              ...prev,
              createNewItem({
                id: item_id,
                type: "message",
                role: "assistant",
                content: [{ type: part.type, text: part.text }],
                status: "running",
              }),
            ];
          }
        });
      }
      break;
    }

    case "response.audio_transcript.delta": {
      // Streaming transcript text (assistant)
      const { item_id, delta, output_index } = ev;
      if (output_index === 0 && delta) {
        setItems((prev) => {
          const idx = prev.findIndex((m) => m.id === item_id);
          if (idx >= 0) {
            const updated = [...prev];
            const existingContent = updated[idx].content || [];
            updated[idx] = {
              ...updated[idx],
              content: [...existingContent, { type: "text", text: delta }],
            };
            return updated;
          } else {
            return [
              ...prev,
              createNewItem({
                id: item_id,
                type: "message",
                role: "assistant",
                content: [{ type: "text", text: delta }],
                status: "running",
              }),
            ];
          }
        });
      }
      break;
    }

    case "response.output_item.done": {
      const { item } = ev;
      if (item.type === "function_call") {
        // A new function call item
        // Display it in the transcript as an assistant message indicating a function is being requested
        console.log("function_call", item);
        setItems((prev) => [
          ...prev,
          createNewItem({
            ...item,
            role: "assistant",
            content: [
              {
                type: "text",
                text: `${item.name}(${JSON.stringify(
                  JSON.parse(item.arguments)
                )})`,
              },
            ],
            status: "running",
          }),
        ]);
      }
      break;
    }

    case "history_updated": {
      // Handle Agent SDK history updates
      const { history } = ev;
      console.log("History updated from Agent SDK:", history.length, "items");
      
      // Convert Agent SDK history format to our frontend format
      const convertedItems = history.map((item: any, index: number) => {
        if (item.type === 'message') {
          // Extract text content properly
          let textContent = '';
          
          if (typeof item.content === 'string') {
            textContent = item.content;
          } else if (Array.isArray(item.content)) {
            // Handle Agent SDK format: array of objects with type and transcript
            textContent = item.content.map((c: any) => {
              if (typeof c === 'string') return c;
              if (c && typeof c === 'object') {
                // Extract transcript from input_audio or output_audio objects
                if (c.transcript !== undefined && c.transcript !== null) {
                  return c.transcript; // Return transcript even if empty
                }
                if (c.text) return c.text;
                if (c.content) return c.content;
                // Don't fall back to JSON.stringify for audio objects
                return '';
              }
              return String(c);
            }).join('');
          } else if (item.content && typeof item.content === 'object') {
            textContent = item.content.text || item.content.content || JSON.stringify(item.content);
          } else {
            textContent = item.text || item.content || '';
          }
          
          // Only include messages with actual content
          if (!textContent || textContent.trim() === '') {
            return null;
          }

          return createNewItem({
            id: item.itemId || `msg_${index}`,
            type: "message",
            role: item.role === 'user' ? 'user' : 'assistant',
            content: [
              {
                type: "text",
                text: textContent,
              },
            ],
            status: item.status === 'completed' ? 'completed' : 'running',
            timestamp: new Date().toLocaleTimeString(),
          });
        } else if (item.type === 'function_call') {
          return createNewItem({
            id: item.itemId || `call_${index}`,
            type: "function_call",
            call_id: item.itemId || `call_${index}`,
            name: item.name,
            arguments: JSON.stringify(item.arguments || {}),
            status: "completed",
            timestamp: new Date().toLocaleTimeString(),
          });
        }
        return null;
      }).filter(Boolean);
      
      // Smart update: merge with existing items instead of replacing
      setItems(prevItems => {
        const existingIds = new Set(prevItems.map(item => item.id));
        const newItems = convertedItems.filter(item => !existingIds.has(item.id));
        
        // Only add new items, preserve existing ones
        if (newItems.length > 0) {
          console.log(`Adding ${newItems.length} new items, preserving ${prevItems.length} existing items`);
          return [...prevItems, ...newItems];
        }
        
        return prevItems; // No new items, keep existing
      });
      break;
    }

    default:
      break;
  }
}
