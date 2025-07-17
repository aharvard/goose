import { UIResourceRenderer, UIActionResult } from '@mcp-ui/client';
import { ResourceContent } from '../types/message';

interface ResourceRendererProps {
  resource: ResourceContent;
  className?: string;
}

export default function ResourceRenderer({ resource, className }: ResourceRendererProps) {
  const handleAction = async (result: UIActionResult): Promise<unknown> => {
    // Handle UI actions from MCP-UI components
    switch (result.type) {
      case 'notification':
        // Show a notification to the user
        console.log('Notification:', result.payload.message);
        // You could integrate with a toast library here
        return Promise.resolve();
      case 'link':
        // Handle link navigation
        console.log('Link:', result.payload.url);
        window.open(result.payload.url, '_blank');
        return Promise.resolve();
      case 'prompt':
        // Handle prompt actions
        console.log('Prompt:', result.payload.prompt);
        return Promise.resolve();
      case 'tool':
        // Handle tool calls
        console.log('Tool:', result.payload.toolName, result.payload.params);
        return Promise.resolve();
      case 'intent':
        // Handle intent actions
        console.log('Intent:', result.payload.intent, result.payload.params);
        return Promise.resolve();
      default:
        console.log('Unknown action:', result);
        return Promise.resolve();
    }
  };

  // Determine if this is an HTML resource based on MIME type
  const isHtmlResource = resource.resource.mime_type === 'text/html';
  
  // For HTML resources, pass style props correctly
  const htmlProps = isHtmlResource ? {
    style: {
      maxWidth: '100%',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '16px',
      backgroundColor: '#ffffff',
    }
  } : undefined;

  return (
    <div className={className}>
      <UIResourceRenderer
        resource={resource.resource}
        onUIAction={handleAction}
        htmlProps={htmlProps}
      />
    </div>
  );
}
