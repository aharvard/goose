/// Example demonstrating how to create and use MCP UI resources
/// This shows how MCP server tools can respond with UI resource data structures
/// that will be rendered by the @mcp-ui/client package in the frontend.
use mcp_core::{Content, ResourceContents};

fn main() {
    println!("MCP UI Resources Example");
    println!("========================\n");

    // Example 1: HTML resource with text content
    let html_text_resource =
        ResourceContents::html_text("ui://my-component/instance-1", "<p>Hello World</p>");

    println!("1. HTML Text Resource:");
    println!("   URI: {}", html_text_resource.uri());
    println!("   MIME Type: {:?}", html_text_resource.mime_type());
    println!("   Is UI Resource: {}", html_text_resource.is_ui_resource());
    println!("   Is HTML: {}", html_text_resource.is_html());
    println!(
        "   JSON: {}\n",
        serde_json::to_string_pretty(&html_text_resource).unwrap()
    );

    // Example 2: HTML resource with blob content (base64 encoded)
    let blob_data = "PGRpdj48aDI+Q29tcGxleCBDb250ZW50PC9oMj48c2NyaXB0PmNvbnNvbGUubG9nKFwiTG9hZGVkIVwiKTwvc2NyaXB0PjwvZGl2Pg==";
    let html_blob_resource = ResourceContents::html_blob("ui://my-component/instance-2", blob_data);

    println!("2. HTML Blob Resource:");
    println!("   URI: {}", html_blob_resource.uri());
    println!("   MIME Type: {:?}", html_blob_resource.mime_type());
    println!("   Is UI Resource: {}", html_blob_resource.is_ui_resource());
    println!("   Is HTML: {}", html_blob_resource.is_html());
    println!(
        "   JSON: {}\n",
        serde_json::to_string_pretty(&html_blob_resource).unwrap()
    );

    // Example 3: URI list resource with text content
    let uri_list_text_resource = ResourceContents::uri_list_text(
        "ui://analytics-dashboard/main",
        "https://my.analytics.com/dashboard/123",
    );

    println!("3. URI List Text Resource:");
    println!("   URI: {}", uri_list_text_resource.uri());
    println!("   MIME Type: {:?}", uri_list_text_resource.mime_type());
    println!(
        "   Is UI Resource: {}",
        uri_list_text_resource.is_ui_resource()
    );
    println!("   Is URI List: {}", uri_list_text_resource.is_uri_list());
    println!(
        "   JSON: {}\n",
        serde_json::to_string_pretty(&uri_list_text_resource).unwrap()
    );

    // Example 4: URI list resource with blob content
    let uri_blob_data = "aHR0cHM6Ly9jaGFydHMuZXhhbXBsZS5jb20vYXBpP3R5cGU9cGllJmRhdGE9MSwyLDM=";
    let uri_list_blob_resource =
        ResourceContents::uri_list_blob("ui://live-chart/session-xyz", uri_blob_data);

    println!("4. URI List Blob Resource:");
    println!("   URI: {}", uri_list_blob_resource.uri());
    println!("   MIME Type: {:?}", uri_list_blob_resource.mime_type());
    println!(
        "   Is UI Resource: {}",
        uri_list_blob_resource.is_ui_resource()
    );
    println!("   Is URI List: {}", uri_list_blob_resource.is_uri_list());
    println!(
        "   JSON: {}\n",
        serde_json::to_string_pretty(&uri_list_blob_resource).unwrap()
    );

    // Example 5: Remote DOM resources
    let remote_dom_script = r#"
        const button = document.createElement('ui-button');
        button.setAttribute('label', 'Click me for a tool call!');
        button.addEventListener('press', () => {
            window.parent.postMessage({ 
                type: 'tool', 
                payload: { toolName: 'uiInteraction', params: { action: 'button-click', from: 'remote-dom' } } 
            }, '*');
        });
        root.appendChild(button);
    "#;

    let remote_dom_text_resource = ResourceContents::remote_dom_text(
        "ui://remote-component/action-button",
        remote_dom_script,
    );

    println!("5. Remote DOM Text Resource:");
    println!("   URI: {}", remote_dom_text_resource.uri());
    println!("   MIME Type: {:?}", remote_dom_text_resource.mime_type());
    println!("   Is UI Resource: {}", remote_dom_text_resource.is_ui_resource());
    println!("   Is Remote DOM: {}", remote_dom_text_resource.is_remote_dom());
    println!("   Remote DOM Flavor: {:?}", remote_dom_text_resource.remote_dom_flavor());
    println!(
        "   JSON: {}\n",
        serde_json::to_string_pretty(&remote_dom_text_resource).unwrap()
    );

    // Example 6: Remote DOM with flavor
    let remote_dom_react_resource = ResourceContents::remote_dom_text_with_flavor(
        "ui://remote-component/react-button",
        "const button = document.createElement('ui-button');",
        "react",
    );

    println!("6. Remote DOM with React Flavor:");
    println!("   URI: {}", remote_dom_react_resource.uri());
    println!("   MIME Type: {:?}", remote_dom_react_resource.mime_type());
    println!("   Is Remote DOM: {}", remote_dom_react_resource.is_remote_dom());
    println!("   Remote DOM Flavor: {:?}", remote_dom_react_resource.remote_dom_flavor());
    println!(
        "   JSON: {}\n",
        serde_json::to_string_pretty(&remote_dom_react_resource).unwrap()
    );

    // Example 7: Using Content enum for tool responses
    println!("7. Content Examples for Tool Responses:");

    let html_content = Content::embedded_html_text(
        "ui://dashboard/chart-1",
        "<div><h2>Sales Chart</h2><canvas id='chart'></canvas></div>",
    );

    let uri_content = Content::embedded_uri_list_text(
        "ui://external-link/report-1",
        "https://reports.example.com/quarterly/2024-q4",
    );

    let remote_dom_content = Content::embedded_remote_dom_text_with_flavor(
        "ui://remote-component/interactive-form",
        "const form = document.createElement('ui-form');",
        "react",
    );

    println!(
        "   HTML Content JSON: {}",
        serde_json::to_string_pretty(&html_content).unwrap()
    );
    println!(
        "   URI Content JSON: {}",
        serde_json::to_string_pretty(&uri_content).unwrap()
    );
    println!(
        "   Remote DOM Content JSON: {}",
        serde_json::to_string_pretty(&remote_dom_content).unwrap()
    );

    println!("\nThese resources can be returned by MCP server tools and will be");
    println!("automatically rendered by the @mcp-ui/client UIResourceRenderer component");
    println!("in the frontend when the URI starts with 'ui://'.");
    println!("The UIResourceRenderer automatically detects the resource type based on mimeType:");
    println!("- text/html → HTMLResourceRenderer (iframe with srcDoc)");
    println!("- text/uri-list → HTMLResourceRenderer (iframe with src)");
    println!("- application/vnd.mcp-ui.remote-dom → RemoteDOMResourceRenderer (Shopify Remote DOM)");
}
